import type { AuthenticatedUser, LoginEnvelope } from "./contracts.js";
import { runtimeConfig } from "./runtime-config.js";
import { requestJson } from "./http-client.js";

function normalizeUser(input: LoginEnvelope["user"]): AuthenticatedUser {
  const plan = typeof input.plan === "string"
    ? { slug: input.plan, name: input.plan }
    : input.plan;

  return {
    ...input,
    plan,
  };
}

function parseHydraSessionCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/(?:^|,\s*)hydra_session=([^;]+)/i);
  if (!match) return null;
  return `hydra_session=${match[1]}`;
}

function parseHydraSessionCookieFromResponse(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  for (const line of setCookies) {
    const parsed = parseHydraSessionCookie(line);
    if (parsed) return parsed;
  }
  return parseHydraSessionCookie(response.headers.get("set-cookie"));
}

async function parseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return (body as { error?: string }).error || fallback;
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const baseUrlCandidates = [runtimeConfig.webBaseUrl, "https://hydra-ai.shop"]
    .filter((url, index, list) => list.indexOf(url) === index);

  let lastError: Error | null = null;

  for (const baseUrl of baseUrlCandidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hydra-desktop": "1",
        },
        body: JSON.stringify({ email: input.email, password: input.password }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await parseError(response, "Falha no login Hydra Cyber"));
      }

      const data = (await response.json()) as LoginEnvelope;
      const desktopCookie = data.sessionToken ? `hydra_session=${data.sessionToken}` : null;
      const headerCookie = parseHydraSessionCookieFromResponse(response);
      const sessionCookie = desktopCookie || headerCookie;

      if (!sessionCookie) {
        throw new Error("Sessão Hydra não retornada no login");
      }

      return {
        sessionCookie,
        user: normalizeUser(data.user),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("Falha inesperada no login Hydra Cyber");
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