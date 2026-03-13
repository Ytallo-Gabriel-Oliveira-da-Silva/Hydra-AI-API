import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const publicPlanSlugs = ["free", "plus", "pro", "annual"];

function normalizeHost(value: string) {
  return value.split(",")[0].trim().split(":")[0].toLowerCase();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = normalizeHost(headersList.get("x-forwarded-host") || headersList.get("host") || "");

  const mainUrl = process.env.APP_URL || "http://localhost:3000";
  const apiUrl = process.env.API_APP_URL || "https://api.hydra-ai.shop";
  const cyberUrl = process.env.CYBER_APP_URL || "https://cyber.hydra-ai.shop";

  // Detect which domain is being accessed
  const isApiDomain = host.includes("api.");
  const isCyberDomain = host.includes("cyber.");

  // API subdomain sitemap
  if (isApiDomain) {
    const apiRoutes = ["", "/login", "/register"];
    return apiRoutes.map((route) => ({
      url: `${apiUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 0.9 : 0.75,
    }));
  }

  // Cyber subdomain sitemap
  if (isCyberDomain) {
    const cyberRoutes = ["", "/login", "/register"];
    return cyberRoutes.map((route) => ({
      url: `${cyberUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 0.9 : 0.75,
    }));
  }

  // Main domain sitemap (default)
  const mainRoutes = ["", "/plans", "/login", "/register", "/support", "/reset-password"];

  const staticRoutes: MetadataRoute.Sitemap = mainRoutes.map((route) => ({
    url: `${mainUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : route === "/plans" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/plans" ? 0.9 : 0.75,
  }));

  const planRoutes: MetadataRoute.Sitemap = publicPlanSlugs.map((slug) => ({
    url: `${mainUrl}/plans/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...planRoutes];
}