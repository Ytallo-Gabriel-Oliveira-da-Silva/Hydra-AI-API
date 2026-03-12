import { createMetadata } from "@/lib/seo";
import { SurfaceAuthForm } from "@/components/platform/surface-auth-form";

export const metadata = createMetadata({
  title: "Cadastro Hydra CLI",
  description: "Cadastro dedicado para o Hydra CLI com foco em licença, downloads e operação profissional.",
  path: "/cli-panel/register",
  keywords: ["cadastro hydra cli", "register hydra cli"],
});

export default function CliPanelRegisterPage() {
  return <SurfaceAuthForm surface="cli" mode="register" />;
}