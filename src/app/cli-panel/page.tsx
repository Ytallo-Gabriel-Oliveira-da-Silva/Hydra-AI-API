import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";
import { cliPanelMetrics, cliPanelModules, cliPanelRoadmap, platformSurfaces, sharedPlatformPrinciples } from "@/lib/platform";
import { PanelShell } from "@/components/platform/panel-shell";
import { CliPanelClient } from "@/components/platform/cli-panel-client";

const cliCommands = [
  "hydra login",
  "hydra whoami",
  "hydra balance",
  "hydra usage",
  "hydra models",
  "hydra text",
  "hydra image",
  "hydra audio",
  "hydra config",
  "hydra update",
];

export const metadata = createMetadata({
  title: "Hydra CLI Panel",
  description: "Estrutura inicial do Hydra CLI Panel com licenca, ativacao de dispositivos, downloads, releases e consumo vinculado a creditos.",
  path: "/cli-panel",
  keywords: ["Hydra CLI Panel", "licenca CLI", "painel de downloads", "ativacao de dispositivos"],
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
      <PanelShell
        eyebrow="Hydra CLI Panel"
        title="Painel de licenca, distribuicao e operacao do CLI profissional"
        description="O CLI da Hydra fica separado do Hydra Cyber e nasce como um produto proprio: licenca para habilitar o cliente, creditos para sustentar o uso real da IA e um painel dedicado para ativacoes, downloads e releases."
        accentClass="bg-gradient-to-r from-indigo-500 to-fuchsia-500"
        surface={surface}
        metrics={cliPanelMetrics}
        modules={cliPanelModules}
        roadmap={cliPanelRoadmap}
        companionHref="/api-panel"
        companionLabel="Ver API Panel"
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Comandos do V1</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {cliCommands.map((command) => (
                <div key={command} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
                  {command}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Regras de negocio compartilhadas</p>
            <div className="mt-4 space-y-3">
              {sharedPlatformPrinciples.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-fuchsia-200" />
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CliPanelClient />
      </PanelShell>
    </>
  );
}
