import type { Metadata } from "next";

const fallbackUrl = "http://localhost:3000";

export const siteConfig = {
  name: "HYDRA AI",
  shortName: "HYDRA AI",
  description:
    "HYDRA AI e uma plataforma multimodal com chat inteligente, geracao de imagens, audio, investigacoes, projetos e automacao operacional em uma unica interface.",
  url: process.env.APP_URL || fallbackUrl,
  logoPath: "/logo-hydra-ai.jpeg",
  supportEmail: "support@hydra-ai.shop",
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
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  robots?: Metadata["robots"];
}): Metadata {
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
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: path,
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
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "pt-BR",
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
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
  sameAs: [siteConfig.url],
};

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
