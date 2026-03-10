import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Login seguro",
  description:
    "Entre na HYDRA AI para acessar chat multimodal, geracao de imagem, audio, video e ferramentas operacionais em um painel seguro.",
  path: "/login",
  keywords: ["login HYDRA AI", "entrar", "acesso seguro"],
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}