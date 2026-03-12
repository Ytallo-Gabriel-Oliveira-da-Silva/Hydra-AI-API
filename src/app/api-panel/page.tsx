import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";
import { apiPanelMetrics, apiPanelModules, platformSurfaces } from "@/lib/platform";
import { SurfaceLanding } from "@/components/platform/surface-landing";
import { Activity, FileKey2, Wallet } from "lucide-react";

export const metadata = createMetadata({
  title: "Hydra API",
  description: "Landing oficial da Hydra API com onboarding, billing, documentação operacional e acesso ao dashboard dedicado.",
  path: "/",
  canonicalBaseUrl: process.env.API_APP_URL,
  keywords: ["Hydra API", "api.hydra-ai.shop", "API enterprise", "dashboard de API", "créditos e billing", "login hydra api", "cadastro hydra api"],
});

export default function ApiPanelPage() {
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Inicio", path: "/" },
    { name: "Hydra API Panel", path: "/api-panel" },
  ]);

  const surface = platformSurfaces.find((item) => item.id === "api");
  if (!surface) return null;

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <SurfaceLanding
        eyebrow="Hydra API"
        title="API enterprise com presença própria, onboarding limpo e cockpit operacional"
        description="A primeira tela da Hydra API agora é uma vitrine comercial e técnica de verdade: apresentação clara, posicionamento premium e acesso imediato a login, cadastro e dashboard privado."
        surface={surface}
        metrics={apiPanelMetrics}
        modules={apiPanelModules}
        accentClass="from-cyan-500 via-sky-400 to-blue-500"
        chipClass="text-cyan-200"
        heroNote="Aqui o usuário precisa sentir imediatamente que entrou em um produto diferente da home principal: foco em integração, consumo, segurança, métricas e receita recorrente para operação séria."
        featureItems={[
          { title: "Billing visível", description: "Pix, cartão, wallet e packs de crédito apresentados como produto, não como detalhe escondido.", icon: Wallet },
          { title: "Governança de chaves", description: "Escopos, rotação, revogação e leitura executiva do uso em um ambiente próprio para dev teams e operações.", icon: FileKey2 },
          { title: "Pulse operacional", description: "Taxa de erro, latência, requests e sinais de saúde entram cedo na interface para sustentar percepção enterprise.", icon: Activity },
        ]}
        requiredItems={[
          "Landing pública própria com posicionamento de API premium.",
          "Login e cadastro coerentes com billing, segurança e integração.",
          "Dashboard focado em métricas, chave, recarga, observabilidade e conta.",
          "Marca registrada da Hydra API logo na primeira dobra da página.",
        ]}
        primaryHref="/api-panel/login"
        secondaryHref="/api-panel/register"
        dashboardHref="/api-panel/dashboard"
      />
    </>
  );
}
