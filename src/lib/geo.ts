import { NextRequest } from "next/server";

let geoip: typeof import("geoip-lite") | null = null;

export async function detectCountryCode(req: NextRequest): Promise<string | null> {
  const headerCountry = req.headers.get("x-country") || req.headers.get("x-vercel-ip-country");
  if (headerCountry) return headerCountry.toUpperCase();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || (req as NextRequest & { ip?: string }).ip;
  if (!ip) return null;

  try {
    if (!geoip) {
      const mod = await import("geoip-lite");
      geoip = mod.default ?? mod;
    }
    const lookup = geoip.lookup(ip);
    return lookup?.country?.toUpperCase() || null;
  } catch {
    return null;
  }
}
