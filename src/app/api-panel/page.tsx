import { Suspense } from "react";
import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";
import { apiCapabilities, apiPanelMetrics, apiPanelModules, apiPanelRoadmap, platformSurfaces, sharedPlatformPrinciples } from "@/lib/platform";
import { PanelShell } from "@/components/platform/panel-shell";
import { ApiPanelClient } from "@/components/platform/api-panel-client";

export const metadata = createMetadata({
  title: "Hydra API Panel",
  description: "Estrutura inicial do Hydra API Panel com billing por creditos, observabilidade, chaves e analytics empresariais.",
  path: "/api-panel",
  keywords: ["Hydra API Panel", "painel de API", "creditos de IA", "analytics de requests"],
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
      <PanelShell
        eyebrow="Hydra API Panel"
        title="Estrutura empresarial para API, creditos e observabilidade"
        description="Esta area organiza o futuro painel de API da Hydra no mesmo ecossistema do produto principal. A base sera unica: mesmo usuario, mesmo login, mesmo billing e uma carteira de creditos preparada para texto, imagem e audio."
        accentClass="bg-gradient-to-r from-cyan-500 to-blue-500"
        surface={surface}
        metrics={apiPanelMetrics}
        modules={apiPanelModules}
        roadmap={apiPanelRoadmap}
        companionHref="/cli-panel"
        companionLabel="Ver CLI Panel"
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Capacidades cobradas por consumo</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {apiCapabilities.map((capability) => (
                <div key={capability.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <capability.icon className="h-4 w-4 text-cyan-200" />
                    <p className="text-sm font-semibold text-white">{capability.name}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">Peso de consumo: {capability.weight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Principios compartilhados</p>
            <div className="mt-4 space-y-3">
              {sharedPlatformPrinciples.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-cyan-200" />
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="mt-6 rounded-[2rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">Carregando painel...</div>}>
          <ApiPanelClient />
        </Suspense>
      </PanelShell>
    </>
  );
}
