import { ApiError } from "@/lib/api-guard";

export type AppSurface = "main" | "api" | "cli";

function readEnvUrl(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getSurfaceAppUrl(surface: AppSurface) {
  if (surface === "api") {
    return readEnvUrl("API_APP_URL") || readEnvUrl("APP_URL");
  }

  if (surface === "cli") {
    return readEnvUrl("CLI_APP_URL") || readEnvUrl("APP_URL");
  }

  return readEnvUrl("APP_URL");
}

export function requireSurfaceAppUrl(surface: AppSurface) {
  const url = getSurfaceAppUrl(surface);
  if (!url) {
    const envName = surface === "main" ? "APP_URL" : `${surface.toUpperCase()}_APP_URL`;
    throw new ApiError(`${envName} não configurada para redirecionamento.`, 500);
  }

  return url;
}