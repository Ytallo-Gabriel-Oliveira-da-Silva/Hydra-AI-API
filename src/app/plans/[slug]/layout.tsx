import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";

const publicPlanCatalog: Record<
  string,
  { name: string; priceLabel: string; billingMode: string }
> = {
  free: { name: "Free", priceLabel: "Gratis", billingMode: "gratuita" },
  plus: { name: "Plus", priceLabel: "R$ 35/mes", billingMode: "mensal" },
  pro: { name: "Pro", priceLabel: "R$ 89/mes", billingMode: "mensal" },
  annual: { name: "Anual", priceLabel: "R$ 950/ano", billingMode: "anual" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const plan = publicPlanCatalog[slug];

  if (!plan) {
    return createMetadata({
      title: "Plano nao encontrado",
      description: "O plano solicitado nao foi encontrado na HYDRA AI.",
      path: `/plans/${slug}`,
      robots: { index: false, follow: true },
    });
  }

  return createMetadata({
    title: `${plan.name} ${plan.priceLabel}`,
    description: `Assine o plano ${plan.name} da HYDRA AI e acesse recursos de chat, imagem, audio e video com cobranca ${plan.billingMode}.`,
    path: `/plans/${slug}`,
    keywords: [`plano ${plan.name}`, `${plan.name} HYDRA AI`, `assinar ${plan.name}`],
  });
}

export default async function PlanSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Inicio", path: "/" },
    { name: "Planos", path: "/plans" },
    { name: slug, path: `/plans/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      {children}
    </>
  );
}