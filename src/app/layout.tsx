import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createSiteNavigationStructuredData, organizationStructuredData, siteConfig, surfaceConfig, websiteStructuredData } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const mainNavigationStructuredData = createSiteNavigationStructuredData("HYDRA AI", [
  { name: "Home", url: surfaceConfig.mainUrl },
  { name: "Login", url: `${surfaceConfig.mainUrl}/login` },
  { name: "Cadastro", url: `${surfaceConfig.mainUrl}/register` },
  { name: "Planos", url: `${surfaceConfig.mainUrl}/plans` },
  { name: "Suporte", url: `${surfaceConfig.mainUrl}/support` },
  { name: "Hydra API", url: surfaceConfig.apiUrl },
  { name: "Hydra Cyber", url: surfaceConfig.cliUrl },
]);

const apiNavigationStructuredData = createSiteNavigationStructuredData("Hydra API", [
  { name: "Hydra API Home", url: surfaceConfig.apiUrl },
  { name: "Login API", url: `${surfaceConfig.apiUrl}/login` },
  { name: "Cadastro API", url: `${surfaceConfig.apiUrl}/register` },
  { name: "Dashboard API", url: `${surfaceConfig.apiUrl}/dashboard` },
  { name: "Suporte", url: `${surfaceConfig.mainUrl}/support` },
]);

const cliNavigationStructuredData = createSiteNavigationStructuredData("Hydra Cyber", [
  { name: "Hydra Cyber Home", url: surfaceConfig.cliUrl },
  { name: "Login Hydra Cyber", url: `${surfaceConfig.cliUrl}/login` },
  { name: "Cadastro Hydra Cyber", url: `${surfaceConfig.cliUrl}/register` },
  { name: "Dashboard Hydra Cyber", url: `${surfaceConfig.cliUrl}/dashboard` },
  { name: "Suporte", url: `${surfaceConfig.mainUrl}/support` },
]);

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "HYDRA AI | Assistente multimodal com chat, imagem, áudio e automação",
    template: "%s | HYDRA AI",
  },
  description:
    "HYDRA AI é uma plataforma multimodal com chat inteligente, geração de imagens, áudio, investigações, projetos, controles parentais e automação operacional em uma única interface.",
  applicationName: "HYDRA AI",
  referrer: "origin-when-cross-origin",
  keywords: [
    "HYDRA AI",
    "inteligência artificial",
    "assistente de IA",
    "geração de imagens",
    "chat com IA",
    "áudio com IA",
    "automação",
    "plataforma multimodal",
  ],
  authors: [{ name: "HYDRA AI" }],
  creator: "HYDRA AI",
  publisher: "HYDRA AI",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo-hydra-ai.jpeg",
    shortcut: "/logo-hydra-ai.jpeg",
    apple: "/logo-hydra-ai.jpeg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "HYDRA AI",
    title: "HYDRA AI | Assistente multimodal com chat, imagem, áudio e automação",
    description:
      "Plataforma de IA com chat, criação visual, voz, projetos, investigações e operação profissional em uma experiência unificada.",
    images: [
      {
        url: "/logo-hydra-ai.jpeg",
        width: 1200,
        height: 1200,
        alt: "Logo da HYDRA AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HYDRA AI | Assistente multimodal com chat, imagem, áudio e automação",
    description:
      "Use chat, imagem, voz, investigações e projetos em uma plataforma de IA pronta para operação.",
    images: ["/logo-hydra-ai.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(mainNavigationStructuredData) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(apiNavigationStructuredData) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cliNavigationStructuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
