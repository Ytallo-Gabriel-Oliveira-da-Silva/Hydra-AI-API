import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { detectCountryCode } from "@/lib/geo";
import { registerUser, setSessionCookie, startSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  planSlug: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const countryCode = await detectCountryCode(req);
    const user = await registerUser({
      email: parsed.email.toLowerCase(),
      name: parsed.name,
      password: parsed.password,
      planSlug: parsed.planSlug || "free",
      countryCode,
    });

    const sessionInfo = await startSession(user.id, req);
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan.slug } });
    setSessionCookie(res, sessionInfo.token, sessionInfo.expiresAt);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao registrar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
