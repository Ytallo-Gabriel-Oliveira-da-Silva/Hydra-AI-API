import { Suspense } from "react";
import { createMetadata } from "@/lib/seo";
import { CliPanelClient } from "@/components/platform/cli-panel-client";
import { SurfaceDashboardShell } from "@/components/platform/surface-dashboard-shell";

export const metadata = createMetadata({
  title: "Dashboard Hydra Cyber",
  description: "Dashboard privado do Hydra Cyber com licenças, compliance, pagamentos, releases, dispositivos, conta e segurança.",
  path: "/dashboard",
  canonicalBaseUrl: process.env.CLI_APP_URL,
  keywords: ["dashboard hydra cyber", "licença hydra cyber", "releases hydra cyber"],
  robots: { index: false, follow: false },
});

export default function CliPanelDashboardPage() {
  return (
    <SurfaceDashboardShell
      surfaceLabel="Hydra Cyber"
      title="Cockpit de licenças e operação desktop"
      description="Ambiente privado para operar licenças, compliance, máquinas ativas, releases, downloads, conta, segurança e consumo do Hydra Cyber."
      accentClass="from-emerald-500 via-lime-400 to-amber-300"
      chipClass="text-emerald-200"
      menuItems={[
        { label: "Licenças", hint: "Status, código e janelas de update", icon: "license" },
        { label: "Dispositivos", hint: "Fleet ativa e revogação remota", icon: "devices" },
        { label: "Compliance", hint: "Contrato, fiscal e prontidão legal", icon: "security" },
        { label: "Releases", hint: "Downloads e canais por plataforma", icon: "downloads" },
        { label: "Conta", hint: "Plano, e-mail e identidade do operador", icon: "user" },
        { label: "Segurança", hint: "Sessão, uso ético e proteção operacional", icon: "security" },
        { label: "Configurações", hint: "Preferências e governança local", icon: "settings" },
      ]}
      quickNotes={[
        "Menu com licença, compliance, releases, conta e segurança como eixo central.",
        "Visual de software desktop profissional, diferente da API e da HYDRA principal.",
        "Downloads, cobrança e dispositivos tratados como recursos de produto, não apêndices.",
      ]}
    >
      <Suspense fallback={<div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Carregando módulos do Hydra Cyber...</div>}>
        <CliPanelClient />
      </Suspense>
    </SurfaceDashboardShell>
  );
}