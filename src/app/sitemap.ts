import type { MetadataRoute } from "next";

const publicPlanSlugs = ["free", "plus", "pro", "annual"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const routes = ["", "/plans", "/login", "/register", "/support", "/reset-password"];
  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : route === "/plans" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/plans" ? 0.9 : 0.75,
  }));

  const planRoutes: MetadataRoute.Sitemap = publicPlanSlugs.map((slug) => ({
    url: `${baseUrl}/plans/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...planRoutes];
}