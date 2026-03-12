import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/api-panel", "/cli-panel"];

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
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    const surfacePath = resolveSurfacePath(req);
    if (surfacePath) {
      const url = req.nextUrl.clone();
      url.pathname = surfacePath;
      return NextResponse.rewrite(url);
    }
  }

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has("hydra_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
