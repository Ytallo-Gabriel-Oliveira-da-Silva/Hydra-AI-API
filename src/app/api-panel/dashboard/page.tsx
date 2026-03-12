import { Suspense } from "react";
import { createMetadata } from "@/lib/seo";
import { ApiPanelClient } from "@/components/platform/api-panel-client";
import { SurfaceDashboardShell } from "@/components/platform/surface-dashboard-shell";

export const metadata = createMetadata({
  title: "Dashboard Hydra API",
  description: "Dashboard privado da Hydra API com menu, billing, métricas, chaves e observabilidade.",
  path: "/api-panel/dashboard",
  keywords: ["dashboard hydra api", "billing api", "api keys hydra"],
});

export default function ApiPanelDashboardPage() {
  return (
    <SurfaceDashboardShell
      surfaceLabel="Hydra API"
      title="Cockpit de API e receita"
      description="Ambiente privado para operar recargas, chaves, métricas, segurança, conta e governança de consumo da Hydra API."
      accentClass="from-cyan-500 via-sky-400 to-blue-500"
      chipClass="text-cyan-200"
      menuItems={[
        { label: "Overview", hint: "Métricas e sinais executivos", icon: "activity" },
        { label: "API Keys", hint: "Criação, escopos e revogação", icon: "keys" },
        { label: "Wallet", hint: "Créditos, Pix e cartão", icon: "wallet" },
        { label: "Conta", hint: "Plano, e-mail e contexto da operação", icon: "user" },
        { label: "Segurança", hint: "Sessão, auditoria e governança", icon: "security" },
        { label: "Configurações", hint: "Preferências e política operacional", icon: "settings" },
      ]}
      quickNotes={[
        "Menu com conta, configurações, segurança e billing logo de cara.",
        "Métricas e recarga visíveis antes de qualquer detalhe técnico.",
        "Assinatura visual enterprise, diferente da home e do CLI.",
      ]}
    >
      <Suspense fallback={<div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Carregando módulos da Hydra API...</div>}>
        <ApiPanelClient />
      </Suspense>
    </SurfaceDashboardShell>
  );
}