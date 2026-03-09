import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, endSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  let clearAll = false;
  try {
    const body = await req.json();
    clearAll = body?.all === true;
  } catch {
    clearAll = false;
  }

  const token = req.cookies.get("hydra_session")?.value;

  if (clearAll) {
    const user = await requireUser(req);
    await prisma.session.deleteMany({ where: { userId: user.id } });
  } else if (token) {
    await endSession(token);
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
