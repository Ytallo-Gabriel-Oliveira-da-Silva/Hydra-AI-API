import { Suspense } from "react";
import { createMetadata } from "@/lib/seo";
import { CliPanelClient } from "@/components/platform/cli-panel-client";
import { SurfaceDashboardShell } from "@/components/platform/surface-dashboard-shell";

export const metadata = createMetadata({
  title: "Dashboard Hydra CLI",
  description: "Dashboard privado do Hydra CLI com menu, licenças, releases, dispositivos, conta e segurança.",
  path: "/cli-panel/dashboard",
  keywords: ["dashboard hydra cli", "licença hydra cli", "releases hydra cli"],
});

export default function CliPanelDashboardPage() {
  return (
    <SurfaceDashboardShell
      surfaceLabel="Hydra CLI"
      title="Console de licenças e operação"
      description="Ambiente privado para operar licenças, máquinas ativas, releases, downloads, conta, segurança e consumo do Hydra CLI."
      accentClass="from-emerald-500 via-lime-400 to-amber-300"
      chipClass="text-emerald-200"
      menuItems={[
        { label: "Licenças", hint: "Status, código e janelas de update", icon: "license" },
        { label: "Dispositivos", hint: "Fleet ativa e revogação remota", icon: "devices" },
        { label: "Releases", hint: "Downloads e canais por plataforma", icon: "downloads" },
        { label: "Conta", hint: "Plano, e-mail e identidade do operador", icon: "user" },
        { label: "Segurança", hint: "Sessão e proteção operacional", icon: "security" },
        { label: "Configurações", hint: "Preferências e governança local", icon: "settings" },
      ]}
      quickNotes={[
        "Menu com licença, releases, conta e segurança como eixo central.",
        "Visual de console profissional, diferente da API e da HYDRA principal.",
        "Downloads e dispositivos tratados como recursos de produto, não apêndices.",
      ]}
    >
      <Suspense fallback={<div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Carregando módulos do Hydra CLI...</div>}>
        <CliPanelClient />
      </Suspense>
    </SurfaceDashboardShell>
  );
}