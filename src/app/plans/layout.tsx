import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Planos e precos",
  description:
    "Compare os planos Free, Plus, Pro e Anual da HYDRA AI com limites, cobranca e capacidades multimodais para cada perfil de uso.",
  path: "/plans",
  keywords: ["planos HYDRA AI", "precos", "assinatura IA"],
});

export default function PlansLayout({ children }: { children: ReactNode }) {
  return children;
}