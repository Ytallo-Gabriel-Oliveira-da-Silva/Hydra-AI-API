import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { detectAndStoreCountry, loginUser, setSessionCookie, startSession } from "@/lib/auth";
import { evaluateRateLimit, getRequestIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const ip = getRequestIp(req);
    const loginLimit = evaluateRateLimit({
      key: `login:${ip}:${parsed.email.toLowerCase()}`,
      max: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (!loginLimit.allowed) {
      return NextResponse.json(
        {
          error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(loginLimit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const user = await loginUser(parsed.email.toLowerCase(), parsed.password);
    const sessionInfo = await startSession(user.id, req);
    await detectAndStoreCountry(user.id, req);
    const isDesktopClient = req.headers.get("x-hydra-desktop") === "1";
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: {
          slug: user.plan.slug,
          name: user.plan.name,
        },
      },
      sessionToken: isDesktopClient ? sessionInfo.token : undefined,
      sessionExpiresAt: isDesktopClient ? sessionInfo.expiresAt.toISOString() : undefined,
    });
    setSessionCookie(res, sessionInfo.token, sessionInfo.expiresAt);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao logar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
