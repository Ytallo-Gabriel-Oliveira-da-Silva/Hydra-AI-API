"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Copy, CreditCard, ExternalLink, KeyRound, Laptop2, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { cliLicenseTiers } from "@/lib/billing-products";

type CliOverview = {
  wallet: {
    currency: string;
    balanceCents: number;
    creditBalance: number;
  };
  summary: {
    totalLicenses: number;
    activeLicenses: number;
    activeDevices: number;
    releaseCount: number;
  };
  licenses: Array<{
    id: string;
    code: string;
    status: string;
    tier: string;
    seatLimit: number;
    deviceLimit: number;
    updatesUntil: string | null;
    issuedAt: string;
    activatedAt: string | null;
    activations: Array<{
      id: string;
      deviceName: string;
      platform: string;
      cliVersion: string;
      lastSeenAt: string | null;
      createdAt: string;
    }>;
  }>;
  devices: Array<{
    id: string;
    deviceName: string;
    platform: string;
    cliVersion: string;
    lastSeenAt: string | null;
    revokedAt: string | null;
    createdAt: string;
  }>;
  releases: Array<{
    id: string;
    version: string;
    channel: string;
    platform: string;
    arch: string;
    downloadUrl: string;
    checksum: string | null;
    notes: string | null;
    publishedAt: string;
  }>;
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleString("pt-BR");
}

export function CliPanelClient() {
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<CliOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [licenseCode, setLicenseCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [purchaseMethod, setPurchaseMethod] = useState<"pix" | "credit">("pix");
  const [selectedTierId, setSelectedTierId] = useState(cliLicenseTiers[1]?.id || cliLicenseTiers[0]?.id || "");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any | null>(null);

  async function loadOverview() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/cli-panel/overview", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar Hydra CLI Panel");
      setOverview(data as CliOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Hydra CLI Panel");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    const transactionId = searchParams.get("transaction");
    if (!transactionId) return;
    void syncTransactionStatus(transactionId, searchParams.get("result") === "success");
  }, [searchParams]);

  useEffect(() => {
    if (!transaction?.id || transaction.status === "paid") return;
    const interval = setInterval(() => {
      void syncTransactionStatus(transaction.id, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [transaction?.id, transaction?.status]);

  async function redeemCode() {
    if (!licenseCode.trim()) return;
    try {
      setRedeeming(true);
      setError(null);
      const res = await fetch("/api/cli-panel/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: licenseCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao ativar licença");
      setLicenseCode("");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar licença");
    } finally {
      setRedeeming(false);
    }
  }

  async function revokeDevice(activationId: string) {
    try {
      setError(null);
      const res = await fetch(`/api/cli-panel/devices/${activationId}`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao revogar dispositivo");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revogar dispositivo");
    }
  }

  async function createPurchase() {
    if (!selectedTierId) return;
    try {
      setPurchaseLoading(true);
      setError(null);
      setPurchaseSuccess(null);
      const res = await fetch("/api/billing/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "cli_license",
          productId: selectedTierId,
          paymentMethod: purchaseMethod,
          cpfCnpj: purchaseMethod === "pix" ? cpfCnpj : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar compra da licença");
      setTransaction(data.transaction);
      if (purchaseMethod === "credit" && data.transaction.checkoutUrl) {
        window.location.assign(data.transaction.checkoutUrl as string);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar compra da licença");
    } finally {
      setPurchaseLoading(false);
    }
  }

  async function syncTransactionStatus(transactionId?: string, showPendingMessage?: boolean) {
    const id = transactionId || transaction?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/billing/checkout/status?transactionId=${encodeURIComponent(id)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao consultar compra da licença");
      setTransaction(data.transaction);
      if (data.transaction.status === "paid") {
        setPurchaseSuccess(data.transaction.issuedLicenseCode
          ? `Licença emitida com sucesso. Código: ${data.transaction.issuedLicenseCode}`
          : "Licença confirmada com sucesso.");
        await loadOverview();
        return;
      }
      if (["expired", "overdue", "refunded", "deleted", "failed", "canceled"].includes(data.transaction.status)) {
        setError("A cobrança da licença não foi confirmada. Gere uma nova compra para continuar.");
        return;
      }
      if (showPendingMessage) {
        setPurchaseSuccess("Pagamento recebido. Aguardando a confirmação final da Asaas.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar compra da licença");
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {purchaseSuccess && (
        <div className="rounded-3xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {purchaseSuccess}
        </div>
      )}

      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-fuchsia-200" />
          <div>
            <p className="text-sm font-semibold text-white">Comprar licença do CLI</p>
            <p className="text-xs text-slate-300">A licença libera o produto; o consumo de IA continua usando créditos da conta.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-3 md:grid-cols-2">
            {cliLicenseTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`rounded-3xl border p-4 text-left transition ${selectedTierId === tier.id ? "border-fuchsia-300/40 bg-fuchsia-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                <p className="text-sm font-semibold text-white">{tier.name}</p>
                <p className="mt-2 text-2xl font-semibold text-white">R$ {tier.price}</p>
                <p className="mt-1 text-xs text-fuchsia-200">{tier.deviceLimit} dispositivos • {tier.updatesMonths} meses de updates</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-300">{tier.description}</p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { id: "pix", label: "Pix", icon: QrCode },
                { id: "credit", label: "Cartão", icon: CreditCard },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPurchaseMethod(item.id as "pix" | "credit")}
                  className={`rounded-2xl border px-4 py-3 text-left ${purchaseMethod === item.id ? "border-fuchsia-300 bg-fuchsia-400/10 text-white" : "border-white/10 bg-black/20 text-slate-300"}`}
                >
                  <item.icon className="h-4 w-4" />
                  <p className="mt-2 text-sm font-semibold">{item.label}</p>
                </button>
              ))}
            </div>

            {purchaseMethod === "pix" && (
              <input
                value={cpfCnpj}
                onChange={(event) => setCpfCnpj(event.target.value)}
                placeholder="CPF ou CNPJ do pagador"
                className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            )}

            <button
              onClick={createPurchase}
              disabled={purchaseLoading || (purchaseMethod === "pix" && !cpfCnpj.trim())}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Comprar licença
            </button>

            {transaction?.productType === "cli_license" && (
              <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">Cobrança gerada</p>
                <p className="mt-1 text-xs text-slate-400">{transaction.displayName}</p>
                {transaction.paymentMethod === "pix" ? (
                  <>
                    {transaction.pixQrCodeImage && <img src={transaction.pixQrCodeImage} alt="QR Code Pix" className="mt-4 h-44 w-44 rounded-2xl bg-white p-3" />}
                    <p className="mt-4 break-all text-xs text-slate-300">{transaction.pixCode}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => transaction.pixCode && navigator.clipboard.writeText(transaction.pixCode)} className="rounded-2xl border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/10">
                        <Copy className="mr-2 inline h-3.5 w-3.5" /> Copiar Pix
                      </button>
                      <button onClick={() => syncTransactionStatus()} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                        Verificar status
                      </button>
                    </div>
                  </>
                ) : transaction.checkoutUrl ? (
                  <a href={transaction.checkoutUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-cyan-200 hover:text-cyan-100">
                    Abrir checkout seguro <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}

                {transaction.issuedLicenseCode && (
                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
                    <p className="text-xs text-emerald-100">Código emitido</p>
                    <p className="mt-1 font-mono text-sm text-white">{transaction.issuedLicenseCode}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10">
              <CreditCard className="h-5 w-5 text-fuchsia-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Licença e créditos</p>
              <p className="text-xs text-slate-300">A licença libera o CLI; os créditos sustentam o uso real da IA.</p>
            </div>
          </div>

          {loading || !overview ? (
            <LoadingBlock />
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Licenças" value={String(overview.summary.activeLicenses)} detail="Ativas nesta conta" />
              <MetricCard label="Dispositivos" value={String(overview.summary.activeDevices)} detail="Clientes CLI vinculados" />
              <MetricCard label="Saldo" value={formatCurrency(overview.wallet.balanceCents, overview.wallet.currency)} detail="Base financeira compartilhada" />
              <MetricCard label="Créditos" value={String(overview.wallet.creditBalance)} detail="Disponíveis para os comandos" />
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            O painel do CLI é gratuito. Para usar o produto CLI em si, a conta precisa de licença válida e saldo para consumo de IA.
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <KeyRound className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Ativar licença</p>
              <p className="text-xs text-slate-300">Vincule um código comprado à sua conta Hydra.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <input
              value={licenseCode}
              onChange={(event) => setLicenseCode(event.target.value.toUpperCase())}
              placeholder="HYDRA-CLI-XXXX-XXXX"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={redeemCode}
                disabled={redeeming || !licenseCode.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Ativar código
              </button>
              <Link href="/plans" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Ver planos e compra
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
            <p className="text-sm font-semibold text-white">Licenças da conta</p>
          </div>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.licenses.length === 0 ? (
            <EmptyBlock text="Nenhuma licença vinculada ainda. Quando um código for comprado, ele poderá ser ativado aqui." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.licenses.map((license) => (
                <div key={license.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{license.tier}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{license.code}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${license.status === "active" ? "bg-emerald-400/15 text-emerald-100" : "bg-white/10 text-slate-300"}`}>
                      {license.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                    <span>Dispositivos: {license.activations.length}/{license.deviceLimit}</span>
                    <span>Updates até: {formatDate(license.updatesUntil)}</span>
                    <span>Emitida em: {formatDate(license.issuedAt)}</span>
                    <span>Ativada em: {formatDate(license.activatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <Laptop2 className="h-5 w-5 text-cyan-200" />
            <p className="text-sm font-semibold text-white">Dispositivos ativos</p>
          </div>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.devices.length === 0 ? (
            <EmptyBlock text="Nenhum dispositivo do CLI foi ativado ainda nesta conta." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.devices.filter((device) => !device.revokedAt).map((device) => (
                <div key={device.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{device.deviceName}</p>
                      <p className="mt-1 text-xs text-slate-400">{device.platform} • CLI {device.cliVersion}</p>
                    </div>
                    <button onClick={() => revokeDevice(device.id)} className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:bg-white/10">
                      Revogar
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                    <span>Último contato: {formatDate(device.lastSeenAt)}</span>
                    <span>Ativado em: {formatDate(device.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
        <p className="text-sm font-semibold text-white">Releases publicadas</p>
        {loading || !overview ? (
          <LoadingBlock />
        ) : overview.releases.length === 0 ? (
          <EmptyBlock text="Nenhuma release do Hydra CLI foi publicada ainda. Esta área já está pronta para receber Linux, Windows e macOS." />
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {overview.releases.map((release) => (
              <div key={release.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{release.version}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{release.channel}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <span>{release.platform} / {release.arch}</span>
                  <span>Publicado em {formatDate(release.publishedAt)}</span>
                </div>
                {release.notes && <p className="mt-3 text-sm text-slate-300">{release.notes}</p>}
                <a href={release.downloadUrl} className="mt-4 inline-flex text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                  Baixar release
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-300">{detail}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando dados do CLI Panel...
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
      <AlertCircle className="mt-0.5 h-4 w-4 text-cyan-200" />
      <p>{text}</p>
    </div>
  );
}
