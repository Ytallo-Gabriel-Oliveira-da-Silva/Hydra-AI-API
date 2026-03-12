import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";
import { cliPanelMetrics, cliPanelModules, platformSurfaces } from "@/lib/platform";
import { SurfaceLanding } from "@/components/platform/surface-landing";
import { Download, KeyRound, Laptop2 } from "lucide-react";

export const metadata = createMetadata({
  title: "Hydra CLI",
  description: "Landing oficial do Hydra CLI com identidade própria para licença, downloads, dispositivos e operação de campo.",
  path: "/cli-panel",
  keywords: ["Hydra CLI", "console profissional", "licença CLI", "downloads e releases"],
});

export default function CliPanelPage() {
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Inicio", path: "/" },
    { name: "Hydra CLI Panel", path: "/cli-panel" },
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
        eyebrow="Hydra CLI"
        title="Console profissional com identidade própria para licença, downloads e operação real"
        description="A Hydra CLI agora entra com cara de produto premium: posicionamento claro, valor comercial da licença, releases visíveis e uma jornada própria de login, cadastro e dashboard."
        surface={surface}
        metrics={cliPanelMetrics}
        modules={cliPanelModules}
        accentClass="from-emerald-500 via-lime-400 to-amber-300"
        chipClass="text-emerald-200"
        heroNote="Aqui o usuário precisa entender de primeira que não entrou em uma cópia do painel de API. O eixo é outro: licença, dispositivo, release, distribuição, operação em terminal e confiança de produto."
        featureItems={[
          { title: "Licença como produto", description: "A primeira impressão comunica valor comercial: seats, updates, devices e política operacional bem claros.", icon: KeyRound },
          { title: "Distribuição limpa", description: "Downloads, builds por plataforma e releases entram como parte central da proposta e não como apêndice.", icon: Download },
          { title: "Operação por máquina", description: "A linguagem visual lembra console, device fleet e administração de campo para diferenciar da API e da home principal.", icon: Laptop2 },
        ]}
        requiredItems={[
          "Landing pública própria com identidade de console profissional.",
          "Auth pensada para licença, dispositivos e operação de campo.",
          "Dashboard com foco em licenças, releases, downloads, conta e segurança.",
          "Assinatura visual diferente da Hydra API e da HYDRA principal.",
        ]}
        primaryHref="/cli-panel/login"
        secondaryHref="/cli-panel/register"
        dashboardHref="/cli-panel/dashboard"
      />
    </>
  );
}
