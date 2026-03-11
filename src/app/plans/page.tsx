"use client";

import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { CheckCircle2, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type Plan = {
  id: string;
  slug: string;
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  badgeFrom: string;
  badgeTo: string;
  chatLimit: number | null;
  imageLimit: number | null;
  audioLimit: number | null;
  videoLimit: number | null;
  billingLabel: string;
  renewalDescription: string;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar planos");
        setPlans(data.plans || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar planos");
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#173056_0%,transparent_28%),linear-gradient(135deg,#040814_0%,#071223_50%,#02050d_100%)] px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm text-cyan-200"><Sparkles className="h-4 w-4" /> Assinaturas HYDRA AI</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">Escolha o plano que combina com sua operação</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300">
                Compare limites, cobrança e capacidades multimodais em uma experiência comercial desenhada para uso individual e empresarial.
              </p>
            </div>
            <Link href="/dashboard" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Voltar ao dashboard
            </Link>
          </div>

          {loading && <p className="mt-8 text-sm text-slate-300">Carregando planos...</p>}
          {error && <p className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{error}</p>}

          {!loading && !error && (
            <>
              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                <TrustCard title="Ativação automática" text="Ao concluir a contratação, o plano da conta é atualizado imediatamente com renovação alinhada ao ciclo escolhido." />
                <TrustCard title="Cobrança empresarial" text="Fluxo preparado para Pix real e cartão recorrente com confirmação da Asaas antes de qualquer ativação do plano." />
                <TrustCard title="Escalonamento simples" text="Comece no Free e avance para Plus, Pro ou Anual conforme o volume de uso e a maturidade da operação." />
              </div>

              <div className="mt-10 grid gap-5 lg:grid-cols-4">
                {plans.map((plan) => {
                  const priceLabel =
                    plan.slug === "free"
                      ? "Grátis"
                      : plan.slug === "annual"
                        ? `R$ ${plan.yearlyPrice}/ano`
                        : `R$ ${plan.monthlyPrice}/mês`;

                  return (
                    <article
                      key={plan.id}
                      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-xl transition hover:-translate-y-1 hover:border-white/20"
                    >
                      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${plan.badgeFrom}, ${plan.badgeTo})` }} />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{plan.name}</p>
                          <p className="text-xs text-slate-400">{plan.billingLabel}</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-cyan-200">
                          {plan.slug === "pro" ? <Crown className="h-4 w-4" /> : plan.slug === "annual" ? <ShieldCheck className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                        </div>
                      </div>
                      <p className="mt-6 text-3xl font-semibold text-white">{priceLabel}</p>
                      <p className="mt-2 text-xs text-slate-400">{plan.renewalDescription}</p>
                      <div className="mt-6 space-y-3 text-sm text-slate-200">
                        <Feature label={plan.chatLimit ? `${plan.chatLimit} chats/mês` : "Chats liberados"} />
                        <Feature label={plan.imageLimit ? `${plan.imageLimit} imagens/mês` : "Imagens liberadas"} />
                        <Feature label={plan.audioLimit ? `${plan.audioLimit} áudios/mês` : "Áudio liberado"} />
                        <Feature label={plan.videoLimit ? `${plan.videoLimit} vídeos/mês` : "Vídeo liberado"} />
                      </div>
                      <Link
                        href={`/plans/${plan.slug}`}
                        className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
                      >
                        {plan.slug === "free" ? "Ver detalhes" : "Assinar agora"}
                      </Link>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <SiteFooter tone="commerce" />
      </div>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      <span>{label}</span>
    </div>
  );
}

function TrustCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </div>
  );
}
