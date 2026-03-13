import type { MetadataRoute } from "next";
import { headers } from "next/headers";

function normalizeHost(value: string) {
  return value.split(",")[0].trim().split(":")[0].toLowerCase();
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = normalizeHost(headersList.get("x-forwarded-host") || headersList.get("host") || "");

  const mainUrl = process.env.APP_URL || "http://localhost:3000";
  const apiUrl = process.env.API_APP_URL || "https://api.hydra-ai.shop";
  const cyberUrl = process.env.CYBER_APP_URL || "https://cyber.hydra-ai.shop";

  // Detect which domain is being accessed
  const isApiDomain = host.includes("api.");
  const isCyberDomain = host.includes("cyber.");

  // API subdomain robots
  if (isApiDomain) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      sitemap: `${apiUrl}/sitemap.xml`,
      host: apiUrl,
    };
  }

  // Cyber subdomain robots
  if (isCyberDomain) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      sitemap: `${cyberUrl}/sitemap.xml`,
      host: cyberUrl,
    };
  }

  // Main domain robots (default)
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard"],
    },
    sitemap: `${mainUrl}/sitemap.xml`,
    host: mainUrl,
  };
}