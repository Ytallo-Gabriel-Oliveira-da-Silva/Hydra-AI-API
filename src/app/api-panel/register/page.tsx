import { createMetadata } from "@/lib/seo";
import { SurfaceAuthForm } from "@/components/platform/surface-auth-form";

export const metadata = createMetadata({
  title: "Cadastro Hydra API",
  description: "Cadastro dedicado para entrar no cockpit da Hydra API com a mesma conta do ecossistema Hydra.",
  path: "/api-panel/register",
  keywords: ["cadastro hydra api", "register hydra api"],
});

export default function ApiPanelRegisterPage() {
  return <SurfaceAuthForm surface="api" mode="register" />;
}