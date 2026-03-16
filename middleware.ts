import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/api-panel", "/cli-panel"];
const surfaceBareRoutes: Record<string, string> = {
  "/": "",
  "/login": "/login",
  "/register": "/register",
  "/dashboard": "/dashboard",
};

function normalizeHostname(hostname: string) {
  return hostname.split(",")[0].trim().split(":")[0].toLowerCase();
}

function getRequestHostname(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) return normalizeHostname(forwardedHost);

  const host = req.headers.get("host");
  if (host) return normalizeHostname(host);

  return normalizeHostname(req.nextUrl.hostname);
}

function resolveSurfacePath(req: NextRequest) {
  const hostname = getRequestHostname(req);
  if (hostname.startsWith("api.")) return "/api-panel";
  if (hostname.startsWith("cli.")) return "/cli-panel";
  if (hostname.startsWith("cyber.")) return "/cli-panel";
  return null;
}

function applySecurityHeaders(res: NextResponse, req: NextRequest) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), interest-cohort=()");

  if (req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const surfaceBase = resolveSurfacePath(req);
  const hasSession = req.cookies.has("hydra_session");

  if (surfaceBase && pathname in surfaceBareRoutes) {
    if (pathname === "/dashboard" && !hasSession) {
      const loginUrl = new URL("/login", req.url);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), req);
    }

    const targetPath = `${surfaceBase}${surfaceBareRoutes[pathname]}`;
    if (pathname !== targetPath) {
      const url = req.nextUrl.clone();
      url.pathname = targetPath;
      return applySecurityHeaders(NextResponse.rewrite(url), req);
    }
  }

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return applySecurityHeaders(NextResponse.next(), req);

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), req);
  }

  return applySecurityHeaders(NextResponse.next(), req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
