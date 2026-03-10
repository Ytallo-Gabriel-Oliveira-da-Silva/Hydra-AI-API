import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Criar conta",
  description:
    "Crie sua conta na HYDRA AI para usar chat inteligente, imagem, audio, video e fluxos multimodais em uma plataforma unica.",
  path: "/register",
  keywords: ["cadastro HYDRA AI", "criar conta", "registro"],
});

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}