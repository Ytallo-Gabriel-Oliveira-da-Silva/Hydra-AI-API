import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { detectAndStoreCountry, loginUser, setSessionCookie, startSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const user = await loginUser(parsed.email.toLowerCase(), parsed.password);
    const sessionInfo = await startSession(user.id, req);
    await detectAndStoreCountry(user.id, req);
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan.slug } });
    setSessionCookie(res, sessionInfo.token, sessionInfo.expiresAt);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao logar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
