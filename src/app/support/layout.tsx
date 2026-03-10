import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Suporte",
  description:
    "Fale com o suporte da HYDRA AI para resolver problemas de acesso, pagamento, integracoes e operacao da plataforma.",
  path: "/support",
  keywords: ["suporte HYDRA AI", "ajuda", "atendimento"],
});

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}