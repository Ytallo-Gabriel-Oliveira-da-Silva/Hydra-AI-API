import type { MetadataRoute } from "next";

const publicPlanSlugs = ["free", "plus", "pro", "annual"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mainUrl = process.env.APP_URL || "http://localhost:3000";
  const apiUrl = process.env.API_APP_URL || "https://api.hydra-ai.shop";
  const cliUrl = process.env.CLI_APP_URL || "https://cli.hydra-ai.shop";

  const mainRoutes = ["", "/plans", "/login", "/register", "/support", "/reset-password"];
  const apiRoutes = ["", "/login", "/register"];
  const cliRoutes = ["", "/login", "/register"];

  const staticRoutes: MetadataRoute.Sitemap = mainRoutes.map((route) => ({
    url: `${mainUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : route === "/plans" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/plans" ? 0.9 : 0.75,
  }));

  const apiStaticRoutes: MetadataRoute.Sitemap = apiRoutes.map((route) => ({
    url: `${apiUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 0.9 : 0.75,
  }));

  const cliStaticRoutes: MetadataRoute.Sitemap = cliRoutes.map((route) => ({
    url: `${cliUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 0.9 : 0.75,
  }));

  const planRoutes: MetadataRoute.Sitemap = publicPlanSlugs.map((slug) => ({
    url: `${mainUrl}/plans/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...apiStaticRoutes, ...cliStaticRoutes, ...planRoutes];
}