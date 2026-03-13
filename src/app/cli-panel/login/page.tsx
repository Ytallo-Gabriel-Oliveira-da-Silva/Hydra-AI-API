import { createMetadata } from "@/lib/seo";
import { SurfaceAuthForm } from "@/components/platform/surface-auth-form";

export const metadata = createMetadata({
  title: "Login Hydra Cyber",
  description: "Acesso dedicado ao cockpit do Hydra Cyber para licença, compliance, dispositivos e releases.",
  path: "/login",
  canonicalBaseUrl: process.env.CYBER_APP_URL,
  keywords: ["login hydra cyber", "auth hydra cyber"],
});

export default function CliPanelLoginPage() {
  return <SurfaceAuthForm surface="cli" mode="login" />;
}