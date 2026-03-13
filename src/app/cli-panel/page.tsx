import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";
import { cliPanelMetrics, cliPanelModules, platformSurfaces } from "@/lib/platform";
import { SurfaceLanding } from "@/components/platform/surface-landing";
import { Download, KeyRound, Laptop2 } from "lucide-react";

export const metadata = createMetadata({
  title: "Hydra Cyber",
  description: "Landing oficial do Hydra Cyber com identidade própria para licença, desktop instalado, downloads, dispositivos e operação ética.",
  path: "/",
  canonicalBaseUrl: process.env.CLI_APP_URL,
  keywords: ["Hydra Cyber", "cli.hydra-ai.shop", "software desktop profissional", "licença hydra cyber", "downloads e releases", "login hydra cyber", "cadastro hydra cyber"],
});

export default function CliPanelPage() {
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Inicio", path: "/" },
    { name: "Hydra Cyber", path: "/cli-panel" },
  ]);

  const surface = platformSurfaces.find((item) => item.id === "cli");
  if (!surface) return null;

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <SurfaceLanding
        eyebrow="Hydra Cyber"
        title="Desktop profissional com identidade própria para licença, downloads, dispositivos e operação real"
        description="O Hydra Cyber entra como produto premium de verdade: app desktop obrigatório, identidade própria, licença vinculada à conta e uma jornada completa de login, dashboard e gestão operacional."
        surface={surface}
        metrics={cliPanelMetrics}
        modules={cliPanelModules}
        accentClass="from-emerald-500 via-lime-400 to-amber-300"
        chipClass="text-emerald-200"
        heroNote="Aqui o usuário precisa entender de primeira que entrou em um produto desktop premium: licença, dispositivo, release, terminal, operação ética e confiança comercial no mesmo ecossistema Hydra."
        featureItems={[
          { title: "Licença como produto", description: "A primeira impressão comunica valor comercial: assentos, updates, dispositivos, contrato e política operacional bem claros.", icon: KeyRound },
          { title: "Distribuição limpa", description: "Downloads, builds por plataforma e releases entram como parte central da proposta e não como apêndice.", icon: Download },
          { title: "Operação por máquina", description: "A linguagem visual lembra IDE/console profissional com gestão de dispositivos e acesso controlado por conta.", icon: Laptop2 },
        ]}
        requiredItems={[
          "Landing pública própria com identidade de software desktop profissional.",
          "Auth pensada para licença, dispositivos, contrato e operação ética.",
          "Dashboard com foco em licenças, releases, downloads, conta, billing e segurança.",
          "Assinatura visual diferente da Hydra API e da HYDRA principal.",
        ]}
        primaryHref="/cli-panel/login"
        secondaryHref="/cli-panel/register"
        dashboardHref="/cli-panel/dashboard"
      />
    </>
  );
}
