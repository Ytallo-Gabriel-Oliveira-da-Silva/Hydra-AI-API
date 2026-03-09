import Link from "next/link";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";

type SiteFooterProps = {
  tone?: "default" | "commerce";
};

const paymentBrands = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Pix"];

export function SiteFooter({ tone = "default" }: SiteFooterProps) {
  const commerce = tone === "commerce";

  return (
    <footer className="mt-12 rounded-[32px] border border-white/10 bg-white/5 px-6 py-8 shadow-2xl backdrop-blur">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr_0.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">HYDRA AI</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Plataforma de inteligência, automação e operação multimodal.</h3>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Uma experiência unificada para conversar, criar, pesquisar, organizar e operar com mais velocidade, segurança e controle.
          </p>
          {commerce && (
            <div className="mt-5 flex flex-wrap gap-2">
              {paymentBrands.map((brand) => (
                <span key={brand} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-100">
                  {brand}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Navegação</p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <Link href="/" className="block transition hover:text-white">Início</Link>
            <Link href="/plans" className="block transition hover:text-white">Planos</Link>
            <Link href="/login" className="block transition hover:text-white">Entrar</Link>
            <Link href="/register" className="block transition hover:text-white">Criar conta</Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Confiança</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Ambiente protegido com sessões seguras e controles de conta.</span>
            </div>
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-cyan-300" />
              <span>Fluxo de assinatura com confirmação e ativação automática do plano.</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-300" />
              <span>Pix, crédito e débito em uma jornada empresarial unificada.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-400">
        <span>© 2026 HYDRA AI. Todos os direitos reservados.</span>
        <span>Infraestrutura, cobrança e experiência visual integradas à plataforma.</span>
      </div>
    </footer>
  );
}