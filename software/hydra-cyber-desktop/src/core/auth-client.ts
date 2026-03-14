import type { AuthenticatedUser, LoginEnvelope } from "./contracts.js";
import { runtimeConfig } from "./runtime-config.js";
import { requestJson } from "./http-client.js";

function parseHydraSessionCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/(?:^|,\s*)hydra_session=([^;]+)/i);
  if (!match) return null;
  return `hydra_session=${match[1]}`;
}

async function parseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return (body as { error?: string }).error || fallback;
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const response = await fetch(`${runtimeConfig.webBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Falha no login Hydra Cyber"));
  }

  const data = (await response.json()) as LoginEnvelope;
  const cookie = parseHydraSessionCookie(response.headers.get("set-cookie"));
  if (!cookie) {
    throw new Error("Sessão Hydra não retornada no login");
  }

  return {
    sessionCookie: cookie,
    user: data.user,
  };
}

export async function fetchCurrentUser(sessionCookie: string) {
  return requestJson<AuthenticatedUser>(`${runtimeConfig.webBaseUrl}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
    timeoutMs: 10000,
    retries: 1,
  });
}

export async function logoutSession(sessionCookie: string) {
  await fetch(`${runtimeConfig.webBaseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ all: false }),
  }).catch(() => null);
}