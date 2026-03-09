"use client";

import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Copy, CreditCard, Landmark, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  amount: number;
  previewRenewalAt: string | null;
};

type Transaction = {
  id: string;
  status: string;
  paymentMethod: "pix" | "credit" | "debit";
  amount: number;
  installments?: number | null;
  paymentLink?: string | null;
  pixCode?: string | null;
  expiresAt?: string | null;
};

export default function PlanDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "debit">("pix");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    installments: "1",
  });

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch(`/api/plans/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar plano");
        setPlan(data.plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar plano");
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadPlan();
  }, [slug]);

  const pixSecondsRemaining = useMemo(() => {
    if (!transaction?.expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(transaction.expiresAt).getTime() - Date.now()) / 1000));
  }, [transaction?.expiresAt]);

  useEffect(() => {
    if (!transaction?.expiresAt) return;
    const interval = setInterval(() => {
      setTransaction((current) => (current ? { ...current } : current));
    }, 1000);
    return () => clearInterval(interval);
  }, [transaction?.expiresAt]);

  async function createCheckout() {
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        planSlug: plan.slug,
        paymentMethod,
        installments: paymentMethod === "credit" ? Number(form.installments) : undefined,
        cardholderName: paymentMethod === "pix" ? undefined : form.cardholderName,
        cardNumber: paymentMethod === "pix" ? undefined : form.cardNumber,
        expiry: paymentMethod === "pix" ? undefined : form.expiry,
        cvv: paymentMethod === "pix" ? undefined : form.cvv,
      };
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar pagamento");
      setTransaction(data.transaction);
      if (paymentMethod !== "pix") {
        await confirmPayment(data.transaction.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPayment(transactionId?: string) {
    const id = transactionId || transaction?.id;
    if (!id) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao confirmar pagamento");
      setSuccess(`Plano ${data.planName} ativado com sucesso.`);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar pagamento");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">Carregando plano...</div>;
  }

  if (!plan || error) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
        <div className="mx-auto max-w-4xl rounded-3xl border border-amber-400/40 bg-amber-400/10 p-6 text-amber-100">{error || "Plano não encontrado"}</div>
      </div>
    );
  }

  const renewalPreview = plan.previewRenewalAt ? new Date(plan.previewRenewalAt).toLocaleDateString("pt-BR") : "Sem renovação";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#13386f_0%,transparent_26%),radial-gradient(circle_at_bottom_right,#0d5d48_0%,transparent_22%),linear-gradient(135deg,#030712_0%,#081223_45%,#04070d_100%)] px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm text-cyan-200"><Sparkles className="h-4 w-4" /> Checkout do plano</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">{plan.name}</h1>
            <p className="mt-2 text-sm text-slate-300">{plan.billingLabel} • próxima renovação prevista: {renewalPreview}</p>
          </div>
          <Link href="/plans" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Voltar aos planos
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
            <div className="rounded-[24px] p-6" style={{ background: `linear-gradient(135deg, ${plan.badgeFrom}22, ${plan.badgeTo}33)` }}>
              <p className="text-sm uppercase tracking-wide text-slate-200">Resumo</p>
              <p className="mt-3 text-4xl font-semibold text-white">{plan.slug === "annual" ? `R$ ${plan.yearlyPrice}/ano` : plan.slug === "free" ? "R$ 0" : `R$ ${plan.monthlyPrice}/mês`}</p>
              <p className="mt-2 text-sm text-slate-200">Ativação imediata após confirmação da contratação.</p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-200">
              <Feature label={plan.chatLimit ? `${plan.chatLimit} chats por mês` : "Uso de chat liberado"} />
              <Feature label={plan.imageLimit ? `${plan.imageLimit} imagens por mês` : "Geração de imagens liberada"} />
              <Feature label={plan.audioLimit ? `${plan.audioLimit} áudios por mês` : "Recursos de áudio liberados"} />
              <Feature label={plan.videoLimit ? `${plan.videoLimit} vídeos por mês` : "Recursos de vídeo liberados"} />
              <Feature label={plan.slug === "annual" ? "Faturamento anual" : plan.slug === "free" ? "Sem cobrança" : "Faturamento mensal"} />
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Ambiente de contratação</p>
              <p className="mt-2">Jornada desenhada para onboarding rápido, confirmação clara de pagamento e atualização automática do plano da conta.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Pix imediato",
                  "Crédito parcelado",
                  "Débito à vista",
                  "Ativação automática",
                ].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">{item}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { id: "pix", label: "Pix", icon: QrCode },
                { id: "credit", label: "Crédito", icon: CreditCard },
                { id: "debit", label: "Débito", icon: Landmark },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPaymentMethod(item.id as "pix" | "credit" | "debit")}
                  className={`rounded-2xl border px-4 py-3 text-left ${paymentMethod === item.id ? "border-cyan-300 bg-cyan-400/10 text-white" : "border-white/10 bg-black/20 text-slate-300"}`}
                >
                  <item.icon className="h-4 w-4" />
                  <p className="mt-2 text-sm font-semibold">{item.label}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {paymentMethod === "pix" && (
                <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5">
                  <p className="text-sm font-semibold text-white">Pagamento instantâneo via Pix</p>
                  <p className="mt-1 text-xs text-slate-400">Gere o QR Code e confirme o pagamento para ativar o plano.</p>
                  <button onClick={createCheckout} disabled={submitting} className="mt-4 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">
                    {submitting ? "Gerando Pix..." : "Gerar QR Code Pix"}
                  </button>

                  {transaction?.paymentMethod === "pix" && (
                    <div className="mt-5 rounded-[24px] border border-white/10 bg-black/30 p-5">
                      <div className="mx-auto grid h-52 w-52 grid-cols-8 gap-1 rounded-2xl bg-white p-3">
                        {Array.from({ length: 64 }).map((_, index) => (
                          <div key={index} className={index % 3 === 0 || index % 5 === 0 ? "bg-black" : "bg-white"} />
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                        {[
                          "Expiração em 15 minutos",
                          "Confirmação instantânea",
                          "Ativação automática do plano",
                        ].map((item) => (
                          <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{item}</span>
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="font-semibold text-white">Link de pagamento</p>
                        <p className="mt-1 break-all">{transaction.paymentLink}</p>
                        <p className="mt-3 font-semibold text-white">Código Pix</p>
                        <p className="mt-1 break-all">{transaction.pixCode}</p>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Expira em</span>
                          <span>{formatCountdown(pixSecondsRemaining)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, (pixSecondsRemaining / 900) * 100))}%` }} />
                        </div>
                      </div>
                      <div className="mt-5 flex gap-2">
                        <button onClick={() => transaction.pixCode && navigator.clipboard?.writeText(transaction.pixCode)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-white hover:bg-white/10">
                          <Copy className="mr-2 inline h-4 w-4" /> Copiar código
                        </button>
                        <button onClick={() => confirmPayment()} disabled={confirming || pixSecondsRemaining === 0} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60">
                          {confirming ? "Confirmando..." : "Confirmar pagamento"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "credit" && (
                <CardForm
                  title="Cartão de crédito"
                  subtitle="Escolha parcelas, valide os dados e conclua a contratação com segurança."
                  form={form}
                  setForm={setForm}
                  showInstallments
                  submitting={submitting}
                  onSubmit={createCheckout}
                />
              )}

              {paymentMethod === "debit" && (
                <CardForm
                  title="Cartão de débito"
                  subtitle="Pagamento à vista com confirmação imediata e liberação rápida do plano."
                  form={form}
                  setForm={setForm}
                  showInstallments={false}
                  submitting={submitting}
                  onSubmit={createCheckout}
                />
              )}
            </div>

            {success && (
              <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {success}
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {error}
              </div>
            )}
            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">Formas aceitas</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-100">
                {["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Pix"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold">{item}</span>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">Ambiente de contratação com atualização automática do plano e sincronização imediata na conta.</p>
            </div>
          </section>
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

function CardForm({
  title,
  subtitle,
  form,
  setForm,
  showInstallments,
  submitting,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  form: { cardholderName: string; cardNumber: string; expiry: string; cvv: string; installments: string };
  setForm: React.Dispatch<React.SetStateAction<{ cardholderName: string; cardNumber: string; expiry: string; cvv: string; installments: string }>>;
  showInstallments: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5">
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-5 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">HYDRA PAY</p>
        <p className="mt-8 text-xl font-semibold">{form.cardNumber || "0000 0000 0000 0000"}</p>
        <div className="mt-6 flex items-end justify-between text-sm">
          <div>
            <p className="text-[11px] text-slate-400">Portador</p>
            <p>{form.cardholderName || "NOME DO CLIENTE"}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Validade</p>
            <p>{form.expiry || "MM/AA"}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input value={form.cardholderName} onChange={(e) => setForm((prev) => ({ ...prev, cardholderName: e.target.value }))} placeholder="Nome impresso no cartão" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
        <input value={form.cardNumber} onChange={(e) => setForm((prev) => ({ ...prev, cardNumber: e.target.value }))} placeholder="Número do cartão" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
        <input value={form.expiry} onChange={(e) => setForm((prev) => ({ ...prev, expiry: e.target.value }))} placeholder="MM/AA" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
        <input value={form.cvv} onChange={(e) => setForm((prev) => ({ ...prev, cvv: e.target.value }))} placeholder="CVV" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
        {showInstallments && (
          <select value={form.installments} onChange={(e) => setForm((prev) => ({ ...prev, installments: e.target.value }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white focus:outline-none">
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index + 1} value={String(index + 1)} className="bg-slate-900">
                {index + 1}x
              </option>
            ))}
          </select>
        )}
      </div>

      <button onClick={onSubmit} disabled={submitting} className="mt-5 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60">
        {submitting ? "Processando..." : "Pagar e ativar plano"}
      </button>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" /> Transação simulada pronta para futura integração com gateway.</p>
    </div>
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
