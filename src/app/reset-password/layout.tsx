import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Recuperar senha",
  description:
    "Solicite a redefinicao de senha da sua conta HYDRA AI e recupere o acesso com seguranca.",
  path: "/reset-password",
  keywords: ["redefinir senha", "resetar senha", "recuperar acesso"],
});

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}