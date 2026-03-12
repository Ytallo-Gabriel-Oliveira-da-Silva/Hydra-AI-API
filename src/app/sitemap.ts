import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const publicPlanSlugs = ["free", "plus", "pro", "annual"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  const mainUrl = process.env.APP_URL || "http://localhost:3000";
  const apiUrl = process.env.API_APP_URL || "https://api.hydra-ai.shop";
  const cliUrl = process.env.CLI_APP_URL || "https://cli.hydra-ai.shop";

  // Detect which domain is being accessed
  const isApiDomain = host.includes("api.");
  const isCliDomain = host.includes("cli.");

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

  // CLI subdomain sitemap
  if (isCliDomain) {
    const cliRoutes = ["", "/login", "/register"];
    return cliRoutes.map((route) => ({
      url: `${cliUrl}${route}`,
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