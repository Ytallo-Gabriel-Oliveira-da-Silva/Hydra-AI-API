import { createMetadata } from "@/lib/seo";
import { SurfaceAuthForm } from "@/components/platform/surface-auth-form";

export const metadata = createMetadata({
  title: "Login Hydra CLI",
  description: "Acesso dedicado ao cockpit do Hydra CLI para licenças, dispositivos e releases.",
  path: "/cli-panel/login",
  keywords: ["login hydra cli", "auth cli hydra"],
});

export default function CliPanelLoginPage() {
  return <SurfaceAuthForm surface="cli" mode="login" />;
}