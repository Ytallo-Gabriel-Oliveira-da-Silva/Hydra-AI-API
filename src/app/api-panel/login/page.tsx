import { createMetadata } from "@/lib/seo";
import { SurfaceAuthForm } from "@/components/platform/surface-auth-form";

export const metadata = createMetadata({
  title: "Login Hydra API",
  description: "Acesso dedicado ao cockpit da Hydra API para billing, chaves, métricas e observabilidade.",
  path: "/api-panel/login",
  keywords: ["login hydra api", "auth api hydra"],
});

export default function ApiPanelLoginPage() {
  return <SurfaceAuthForm surface="api" mode="login" />;
}