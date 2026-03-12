import type { Metadata } from "next";

const fallbackUrl = "http://localhost:3000";
const fallbackApiUrl = "https://api.hydra-ai.shop";
const fallbackCliUrl = "https://cli.hydra-ai.shop";

export const siteConfig = {
  name: "HYDRA AI",
  shortName: "HYDRA AI",
  description:
    "HYDRA AI e uma plataforma multimodal com chat inteligente, geracao de imagens, audio, investigacoes, projetos e automacao operacional em uma unica interface.",
  url: process.env.APP_URL || fallbackUrl,
  logoPath: "/logo-hydra-ai.jpeg",
  supportEmail: "support@hydra-ai.shop",
};

export const surfaceConfig = {
  mainUrl: process.env.APP_URL || fallbackUrl,
  apiUrl: process.env.API_APP_URL || fallbackApiUrl,
  cliUrl: process.env.CLI_APP_URL || fallbackCliUrl,
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}

export function createMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  robots,
  canonicalBaseUrl,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  robots?: Metadata["robots"];
  canonicalBaseUrl?: string;
}): Metadata {
  const canonicalUrl = new URL(path.startsWith("/") ? path : `/${path}`, canonicalBaseUrl || siteConfig.url).toString();

  return {
    title,
    description,
    keywords: [
      "HYDRA AI",
      "inteligencia artificial",
      "assistente de IA",
      "plataforma multimodal",
      ...keywords,
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: canonicalUrl,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: siteConfig.logoPath,
          width: 1200,
          height: 1200,
          alt: "Logo da HYDRA AI",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.logoPath],
    },
    robots,
  };
}

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  url: surfaceConfig.mainUrl,
  description: siteConfig.description,
  inLanguage: "pt-BR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${surfaceConfig.mainUrl}/search?query={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
  hasPart: [
    {
      "@type": "WebSite",
      name: "Hydra API",
      url: surfaceConfig.apiUrl,
      description: "Superfície dedicada para API keys, recargas, observabilidade e billing.",
    },
    {
      "@type": "WebSite",
      name: "Hydra CLI",
      url: surfaceConfig.cliUrl,
      description: "Superfície dedicada para licenças, dispositivos, releases e operação CLI.",
    },
  ],
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: surfaceConfig.mainUrl,
  },
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: surfaceConfig.mainUrl,
  logo: absoluteUrl(siteConfig.logoPath),
  email: siteConfig.supportEmail,
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: siteConfig.supportEmail,
      availableLanguage: ["Portuguese", "English"],
      url: absoluteUrl("/support"),
    },
  ],
  sameAs: [surfaceConfig.mainUrl, surfaceConfig.apiUrl, surfaceConfig.cliUrl],
};

export function createSiteNavigationStructuredData(
  siteName: string,
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteName} - links principais`,
    itemListElement: items.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function createBreadcrumbStructuredData(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
