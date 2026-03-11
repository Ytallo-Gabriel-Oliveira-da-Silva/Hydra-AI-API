"use client";

import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, Copy, CreditCard, ExternalLink, QrCode, ShieldCheck, Sparkles } from "lucide-react";
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
  paymentMethod: "pix" | "credit";
  amount: number;
  installments?: number | null;
  paymentLink?: string | null;
  pixCode?: string | null;
  expiresAt?: string | null;
  pixQrCodeImage?: string | null;
  checkoutUrl?: string | null;
  asaasStatus?: string | null;
};

export default function PlanDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit">("pix");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState("");

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

  useEffect(() => {
    const result = searchParams.get("result");
    const transactionId = searchParams.get("transaction");

    if (result === "canceled") {
      setError("O checkout foi cancelado. Gere uma nova cobrança para continuar.");
      return;
    }

    if (result === "expired") {
      setError("O checkout expirou. Gere uma nova cobrança para continuar.");
      return;
    }

    if (transactionId) {
      void syncTransactionStatus(transactionId, result === "success");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!transaction?.id || transaction.status === "paid") return;
    const interval = setInterval(() => {
      void syncTransactionStatus(transaction.id, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [transaction?.id, transaction?.status]);

  async function createCheckout() {
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        planSlug: plan.slug,
        paymentMethod,
        cpfCnpj: paymentMethod === "pix" ? cpfCnpj : undefined,
      };
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar pagamento");
      setTransaction(data.transaction);
      if (paymentMethod === "credit" && data.transaction.checkoutUrl) {
        window.location.assign(data.transaction.checkoutUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  async function syncTransactionStatus(transactionId?: string, showPendingMessage?: boolean) {
    const id = transactionId || transaction?.id;
    if (!id) return;
    setCheckingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/checkout/status?transactionId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao consultar pagamento");
      setTransaction(data.transaction);

      if (data.transaction.status === "paid") {
        setSuccess(`Plano ${plan?.name || "selecionado"} ativado com sucesso.`);
        setTimeout(() => router.push("/dashboard"), 1200);
        return;
      }

      if (data.transaction.status === "expired") {
        setError("A cobrança expirou. Gere um novo pagamento para continuar.");
        return;
      }

      if (["overdue", "refunded", "deleted", "failed", "canceled"].includes(data.transaction.status)) {
        setError("A cobrança não foi confirmada pela Asaas. Gere um novo pagamento para continuar.");
        return;
      }

      if (showPendingMessage) {
        setSuccess("Pagamento recebido. Aguardando a confirmação final da Asaas.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar pagamento");
    } finally {
      setCheckingStatus(false);
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
                          "Pix real via Asaas",
                          "Cartão recorrente",
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
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPaymentMethod(item.id as "pix" | "credit")}
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
                  <p className="mt-1 text-xs text-slate-400">Gere uma cobrança real da Asaas para receber QR Code dinâmico e Pix Copia e Cola válidos.</p>
                  <input
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="CPF ou CNPJ do pagador"
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <button onClick={createCheckout} disabled={submitting} className="mt-4 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">
                    {submitting ? "Gerando Pix..." : "Gerar QR Code Pix"}
                  </button>

                  {transaction?.paymentMethod === "pix" && (
                    <div className="mt-5 rounded-[24px] border border-white/10 bg-black/30 p-5">
                      {transaction.pixQrCodeImage ? (
                        <img src={transaction.pixQrCodeImage} alt="QR Code Pix" className="mx-auto h-52 w-52 rounded-2xl bg-white p-3" />
                      ) : (
                        <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-xs text-slate-400">
                          QR Code indisponível no momento
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                        {[
                          "Cobrança real na Asaas",
                          "Confirmação por webhook",
                          "Plano só ativa após pagamento",
                        ].map((item) => (
                          <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{item}</span>
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="font-semibold text-white">Código Pix</p>
                        <p className="mt-1 break-all">{transaction.pixCode}</p>
                        {transaction.paymentLink && (
                          <>
                            <p className="mt-3 font-semibold text-white">Cobrança na Asaas</p>
                            <a href={transaction.paymentLink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-2 break-all text-cyan-200 hover:text-cyan-100">
                              Abrir cobrança <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        )}
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
                        <button onClick={() => syncTransactionStatus()} disabled={checkingStatus || pixSecondsRemaining === 0} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60">
                          {checkingStatus ? "Verificando..." : "Verificar status"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "credit" && (
                <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5">
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-5 text-white shadow-xl">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-300">HYDRA PAY</p>
                    <p className="mt-8 text-xl font-semibold">Checkout seguro da Asaas</p>
                    <div className="mt-6 text-sm text-slate-300">
                      O cartão é informado no ambiente seguro da Asaas. O plano só é ativado depois que a Asaas confirmar a cobrança real.
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-white">Cartão com renovação automática</p>
                  <p className="mt-1 text-xs text-slate-400">Esse fluxo cria uma assinatura recorrente real. Não existe mais ativação local por clique.</p>

                  <button onClick={createCheckout} disabled={submitting} className="mt-5 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60">
                    {submitting ? "Preparando checkout..." : "Ir para checkout seguro"}
                  </button>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" /> Cobrança e confirmação feitas pela Asaas, com retorno ao HYDRA AI após o pagamento.</p>

                  {transaction?.paymentMethod === "credit" && transaction.checkoutUrl && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                      <p className="font-semibold text-white">Checkout gerado</p>
                      <a href={transaction.checkoutUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-cyan-200 hover:text-cyan-100">
                        Abrir checkout da Asaas <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
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
              <p className="mt-4 text-xs text-slate-400">Ambiente de contratação sincronizado com a Asaas. O plano só muda depois da confirmação real do pagamento.</p>
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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
