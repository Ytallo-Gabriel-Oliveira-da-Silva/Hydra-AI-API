import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  const mainUrl = process.env.APP_URL || "http://localhost:3000";
  const apiUrl = process.env.API_APP_URL || "https://api.hydra-ai.shop";
  const cliUrl = process.env.CLI_APP_URL || "https://cli.hydra-ai.shop";

  // Detect which domain is being accessed
  const isApiDomain = host.includes("api.");
  const isCliDomain = host.includes("cli.");

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

  // CLI subdomain robots
  if (isCliDomain) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      sitemap: `${cliUrl}/sitemap.xml`,
      host: cliUrl,
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