import { NextRequest } from "next/server";
import { getSession } from "./auth";
import { detectCountryCode } from "./geo";
import { evaluateContent, registerViolation } from "./rules";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: NextRequest) {
  const session = await getSession(req);
  if (!session) throw new ApiError("Não autenticado", 401);
  if (session.user.blacklisted) throw new ApiError("Usuário na blacklist", 403);
  return session.user;
}

export async function requireCountry(req: NextRequest) {
  return (await detectCountryCode(req)) || "GLOBAL";
}

export async function enforceRulesOrBlock({
  text,
  userId,
  country,
}: {
  text: string;
  userId: string;
  country?: string | null;
}) {
  const check = evaluateContent(text, country || undefined);
  if (check.allowed) return;
  await registerViolation(userId, check.reasons);
  throw new ApiError(`Conteúdo bloqueado: ${check.reasons.join("; ")}`, 403);
}
