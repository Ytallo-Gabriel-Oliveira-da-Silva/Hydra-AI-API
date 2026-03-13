import { createMetadata } from "@/lib/seo";
import { SurfaceAuthForm } from "@/components/platform/surface-auth-form";

export const metadata = createMetadata({
  title: "Cadastro Hydra Cyber",
  description: "Cadastro dedicado para o Hydra Cyber com foco em licença, downloads, desktop instalado e operação profissional.",
  path: "/register",
  canonicalBaseUrl: process.env.CYBER_APP_URL,
  keywords: ["cadastro hydra cyber", "register hydra cyber"],
});

export default function CliPanelRegisterPage() {
  return <SurfaceAuthForm surface="cli" mode="register" />;
}