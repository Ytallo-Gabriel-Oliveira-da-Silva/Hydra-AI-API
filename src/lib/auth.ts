import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";
import { prisma } from "./db";
import { detectCountryCode } from "./geo";

const SESSION_COOKIE = "hydra_session";
const SESSION_DAYS = 30;

type SessionWithUser = Awaited<ReturnType<typeof prisma.session.findFirst>> & {
  user: {
    id: string;
    email: string;
    name: string;
    planId: string;
    currentPeriodEndsAt: Date | null;
    countryCode: string | null;
    createdAt: Date;
    blacklisted: boolean;
    plan: {
      id: string;
      slug: string;
      name: string;
      monthlyPrice: number | null;
      yearlyPrice: number | null;
    };
  };
};

export type BillingNotice = {
  planExpired: boolean;
  expiredPlanName: string | null;
  expiredAt: string | null;
};

function shouldUseSecureSessionCookie() {
  if (process.env.SESSION_COOKIE_SECURE === "true") return true;
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function getClientInfo(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
  const ip = forwarded?.split(",")[0]?.trim() || (req as { ip?: string }).ip || realIp || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}

export async function startSession(userId: string, req: NextRequest) {
  const token = nanoid(32);
  const expiresAt = addDays(new Date(), SESSION_DAYS);
  const { ip, userAgent } = getClientInfo(req);

  await prisma.session.create({
    data: { token, userId, expiresAt, ip, userAgent },
  });

  return { token, expiresAt };
}

export async function endSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = (await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    include: { user: { include: { plan: true } } },
  })) as SessionWithUser | null;

  if (!session) return null;

  const billingNotice = await syncExpiredPlan(session);
  return Object.assign(session, { billingNotice });
}

async function syncExpiredPlan(session: SessionWithUser): Promise<BillingNotice> {
  const expiredAt = session.user.currentPeriodEndsAt;

  if (!expiredAt || expiredAt > new Date() || session.user.plan.slug === "free") {
    return {
      planExpired: false,
      expiredPlanName: null,
      expiredAt: null,
    };
  }

  const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
  if (!freePlan) {
    return {
      planExpired: true,
      expiredPlanName: session.user.plan.name,
      expiredAt: expiredAt.toISOString(),
    };
  }

  const expiredPlanName = session.user.plan.name;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { planId: freePlan.id },
  });

  session.user.planId = freePlan.id;
  session.user.plan = freePlan;

  return {
    planExpired: true,
    expiredPlanName,
    expiredAt: expiredAt.toISOString(),
  };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(),
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(),
    path: "/",
  });
}

export async function registerUser({
  email,
  name,
  password,
  planSlug = "free",
  countryCode,
}: {
  email: string;
  name: string;
  password: string;
  planSlug?: string;
  countryCode?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email já cadastrado");

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error("Plano inválido");

  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      planId: plan.id,
      countryCode: countryCode || undefined,
    },
    include: { plan: true },
  });
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { plan: true } });
  if (!user) throw new Error("Credenciais inválidas");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Credenciais inválidas");
  if (user.blacklisted) throw new Error("Usuário bloqueado");
  return user;
}

export async function detectAndStoreCountry(userId: string, req: NextRequest) {
  const country = await detectCountryCode(req);
  if (!country) return country;
  await prisma.user.update({ where: { id: userId }, data: { countryCode: country } });
  return country;
}
