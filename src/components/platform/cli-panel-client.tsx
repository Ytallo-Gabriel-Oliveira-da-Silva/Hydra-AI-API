"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Building2, CheckCircle2, Copy, CreditCard, ExternalLink, FileText, KeyRound, Laptop2, Loader2, QrCode, Receipt, ShieldAlert, ShieldCheck } from "lucide-react";
import { cliLicenseTiers } from "@/lib/billing-products";

type HydraCyberComplianceProfile = {
  fullName: string;
  email: string;
  phone: string;
  documentType: "cpf" | "cnpj";
  documentNumber: string;
  companyName?: string;
  stateRegistration?: string;
  financeEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  responsibleName?: string;
  responsibleCpf?: string;
  responsibleRole?: string;
  responsibilityAccepted: boolean;
  acceptableUseAccepted: boolean;
  billingAgreementAccepted: boolean;
};

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
  compliance: {
    profile: HydraCyberComplianceProfile;
    readiness: {
      ready: boolean;
      missing: string[];
      canPurchase: boolean;
      canActivateDesktop: boolean;
    };
    contractVersion: string;
    acceptedAt: {
      responsibilityContractAt: string | null;
      acceptableUseAt: string | null;
      billingAgreementAt: string | null;
    };
  };
  desktopAccess: {
    requiresLicense: boolean;
    hasValidLicense: boolean;
    latestLicenseCode: string | null;
    latestLicenseTier: string | null;
    deviceLimit: number;
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
  recentPayments: Array<{
    id: string;
    displayName: string;
    productType: string;
    paymentMethod: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleString("pt-BR");
}

function safeUrl(url: string): string | null {
  try {
    const { protocol } = new URL(url);
    return ["https:", "http:"].includes(protocol) ? url : null;
  } catch {
    return null;
  }
}

const emptyComplianceProfile: HydraCyberComplianceProfile = {
  fullName: "",
  email: "",
  phone: "",
  documentType: "cpf",
  documentNumber: "",
  companyName: "",
  stateRegistration: "",
  financeEmail: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Brasil",
  responsibleName: "",
  responsibleCpf: "",
  responsibleRole: "",
  responsibilityAccepted: false,
  acceptableUseAccepted: false,
  billingAgreementAccepted: false,
};

export function CliPanelClient() {
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<CliOverview | null>(null);
  const [complianceForm, setComplianceForm] = useState<HydraCyberComplianceProfile>(emptyComplianceProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [licenseCode, setLicenseCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [purchaseMethod, setPurchaseMethod] = useState<"pix" | "credit">("pix");
  const [selectedTierId, setSelectedTierId] = useState(cliLicenseTiers.find((tier) => tier.highlight)?.id || cliLicenseTiers[0]?.id || "");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<Record<string, any> | null>(null);

  async function persistCompliance(showSuccessMessage: boolean) {
    const res = await fetch("/api/cli-panel/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(complianceForm),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao salvar perfil Hydra Cyber");
    await loadOverview();
    if (showSuccessMessage) {
      setPurchaseSuccess("Perfil Hydra Cyber salvo com sucesso.");
    }
    return data;
  }

  async function loadOverview() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/cli-panel/overview", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar Hydra Cyber Panel");
      const nextOverview = data as CliOverview;
      setOverview(nextOverview);
      setComplianceForm(nextOverview.compliance.profile);
      setCpfCnpj(nextOverview.compliance.profile.documentNumber || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Hydra Cyber Panel");
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

  function updateComplianceField<Key extends keyof HydraCyberComplianceProfile>(field: Key, value: HydraCyberComplianceProfile[Key]) {
    setComplianceForm((current) => ({ ...current, [field]: value }));
    if (field === "documentNumber") setCpfCnpj(String(value));
    if (field === "documentType" && value === "cpf") {
      setComplianceForm((current) => ({ ...current, documentType: "cpf", companyName: "", stateRegistration: "", responsibleName: "", responsibleCpf: "", responsibleRole: "" }));
    }
  }

  async function saveCompliance() {
    try {
      setSavingCompliance(true);
      setError(null);
      await persistCompliance(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil Hydra Cyber");
    } finally {
      setSavingCompliance(false);
    }
  }

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
      const compliance = await persistCompliance(false);
      if (!compliance.readiness?.canPurchase) {
        throw new Error(compliance.readiness?.missing?.length
          ? `Complete o perfil Hydra Cyber antes de comprar: ${compliance.readiness.missing.join(", ")}`
          : "Complete o perfil Hydra Cyber antes de comprar.");
      }
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
      setSavingCompliance(false);
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

  const readiness = overview?.compliance.readiness;

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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10">
              <CreditCard className="h-5 w-5 text-fuchsia-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Licença e créditos</p>
              <p className="text-xs text-slate-300">A licença libera o desktop; os créditos sustentam IA, labs, build e recursos Hydra.</p>
            </div>
          </div>

          {loading || !overview ? (
            <LoadingBlock />
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Licenças" value={String(overview.summary.activeLicenses)} detail="Ativas nesta conta" />
              <MetricCard label="Dispositivos" value={String(overview.summary.activeDevices)} detail="Clientes Hydra Cyber vinculados" />
              <MetricCard label="Saldo" value={formatCurrency(overview.wallet.balanceCents, overview.wallet.currency)} detail="Base financeira compartilhada" />
              <MetricCard label="Créditos" value={String(overview.wallet.creditBalance)} detail="Disponíveis para IA e cloud" />
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            O app desktop exige licença válida vinculada ao mesmo login Hydra. Sem créditos, o modo local continua, mas recursos Hydra pagos ficam bloqueados.
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Laptop2 className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Gate do desktop</p>
              <p className="text-xs text-slate-300">Estado atual para liberar login + ativação no app instalado na máquina.</p>
            </div>
          </div>

          {loading || !overview ? (
            <LoadingBlock />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{overview.desktopAccess.hasValidLicense ? "Liberado para desktop" : "Bloqueado até licenciar"}</p>
                <p className="mt-2 text-xs text-slate-300">
                  {overview.desktopAccess.hasValidLicense
                    ? `Licença ${overview.desktopAccess.latestLicenseTier || "ativa"} pronta para até ${overview.desktopAccess.deviceLimit} dispositivo(s).`
                    : "O app desktop continuará pedindo licença até existir uma licença válida vinculada a esta conta."}
                </p>
              </div>
              {!readiness?.ready && (
                <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-200" />
                    <div>
                      <p className="font-semibold">Perfil legal/fiscal incompleto</p>
                      <p className="mt-1 text-xs text-amber-100">Preencha os dados abaixo para liberar compra e ativação.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-emerald-200" />
          <div>
            <p className="text-sm font-semibold text-white">Perfil legal, contrato e faturamento</p>
            <p className="text-xs text-slate-300">Essa ficha sustenta a compra da licença, o vínculo de responsabilidade e a auditoria da conta Hydra Cyber.</p>
          </div>
        </div>

        {loading || !overview ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="Nome completo">
                <input value={complianceForm.fullName} onChange={(event) => updateComplianceField("fullName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Nome do responsável" />
              </Field>
              <Field label="E-mail principal">
                <input value={complianceForm.email} onChange={(event) => updateComplianceField("email", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="voce@empresa.com" />
              </Field>
              <Field label="Telefone">
                <input value={complianceForm.phone} onChange={(event) => updateComplianceField("phone", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Telefone com DDD" />
              </Field>
              <Field label="E-mail financeiro">
                <input value={complianceForm.financeEmail || ""} onChange={(event) => updateComplianceField("financeEmail", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="financeiro@empresa.com" />
              </Field>
              <Field label="Tipo de documento">
                <select value={complianceForm.documentType} onChange={(event) => updateComplianceField("documentType", event.target.value as "cpf" | "cnpj")} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none">
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </Field>
              <Field label={complianceForm.documentType === "cnpj" ? "CNPJ" : "CPF"}>
                <input value={complianceForm.documentNumber} onChange={(event) => updateComplianceField("documentNumber", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder={complianceForm.documentType === "cnpj" ? "CNPJ da empresa" : "CPF do titular"} />
              </Field>
              {complianceForm.documentType === "cnpj" && (
                <>
                  <Field label="Razão social / empresa">
                    <input value={complianceForm.companyName || ""} onChange={(event) => updateComplianceField("companyName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Nome da empresa" />
                  </Field>
                  <Field label="Inscrição estadual">
                    <input value={complianceForm.stateRegistration || ""} onChange={(event) => updateComplianceField("stateRegistration", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Opcional" />
                  </Field>
                  <Field label="Responsável pessoal pelo CNPJ">
                    <input value={complianceForm.responsibleName || ""} onChange={(event) => updateComplianceField("responsibleName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Nome do responsável" />
                  </Field>
                  <Field label="CPF do responsável">
                    <input value={complianceForm.responsibleCpf || ""} onChange={(event) => updateComplianceField("responsibleCpf", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="CPF do responsável" />
                  </Field>
                  <Field label="Cargo do responsável">
                    <input value={complianceForm.responsibleRole || ""} onChange={(event) => updateComplianceField("responsibleRole", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Sócio, diretor, administrador..." />
                  </Field>
                </>
              )}
              <Field label="Endereço">
                <input value={complianceForm.addressLine1} onChange={(event) => updateComplianceField("addressLine1", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Rua, número, bairro" />
              </Field>
              <Field label="Complemento">
                <input value={complianceForm.addressLine2 || ""} onChange={(event) => updateComplianceField("addressLine2", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Opcional" />
              </Field>
              <Field label="Cidade">
                <input value={complianceForm.city} onChange={(event) => updateComplianceField("city", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Cidade" />
              </Field>
              <Field label="Estado">
                <input value={complianceForm.state} onChange={(event) => updateComplianceField("state", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="UF" />
              </Field>
              <Field label="CEP">
                <input value={complianceForm.postalCode} onChange={(event) => updateComplianceField("postalCode", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="CEP" />
              </Field>
              <Field label="País">
                <input value={complianceForm.country} onChange={(event) => updateComplianceField("country", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" placeholder="País" />
              </Field>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <CheckTile
                checked={complianceForm.responsibilityAccepted}
                onChange={(checked) => updateComplianceField("responsibilityAccepted", checked)}
                title="Contrato de responsabilidade"
                subtitle={`Versão ${overview.compliance.contractVersion}`}
              />
              <CheckTile
                checked={complianceForm.acceptableUseAccepted}
                onChange={(checked) => updateComplianceField("acceptableUseAccepted", checked)}
                title="Política de uso ético"
                subtitle="Apenas segurança defensiva e autorizada"
              />
              <CheckTile
                checked={complianceForm.billingAgreementAccepted}
                onChange={(checked) => updateComplianceField("billingAgreementAccepted", checked)}
                title="Acordo de faturamento"
                subtitle="Cobrança, créditos e trilha financeira"
              />
            </div>

            {!overview.compliance.readiness.ready && (
              <div className="mt-4 rounded-3xl border border-dashed border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
                <p className="font-semibold">Pendências para liberar compra/ativação</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overview.compliance.readiness.missing.map((item) => (
                    <span key={item} className="rounded-full border border-amber-200/20 bg-black/20 px-3 py-1 text-xs">{item}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={saveCompliance} disabled={savingCompliance} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {savingCompliance ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Salvar perfil Hydra Cyber
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                CNPJ exige também os dados pessoais do responsável para comprovação e vínculo contratual.
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-fuchsia-200" />
          <div>
            <p className="text-sm font-semibold text-white">Comprar licença Hydra Cyber</p>
            <p className="text-xs text-slate-300">Starter, Pro, Team e Enterprise com vínculo por conta, dispositivo e compliance pronto.</p>
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
                {tier.highlight && <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-fuchsia-200">Mais escolhido</p>}
                <p className="mt-2 text-2xl font-semibold text-white">R$ {tier.price}</p>
                <p className="mt-1 text-xs text-fuchsia-200">{tier.seatLimit} assentos • {tier.deviceLimit} dispositivos • {tier.updatesMonths} meses</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-300">{tier.description}</p>
                <p className="mt-2 text-xs text-slate-400">{tier.supportLabel}</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                  {tier.highlights.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 rounded-3xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-50">
              <p className="font-semibold">Software Hydra Cyber em desenvolvimento</p>
              <p className="mt-1 text-xs text-amber-100">
                A compra de licença e as recargas já podem ser feitas, mas a validação e o uso no desktop só serão liberados após o lançamento oficial do software.
              </p>
            </div>

            {!readiness?.ready && (
              <div className="mb-4 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
                Finalize o perfil legal/fiscal acima antes de comprar. O checkout só abre quando a conta estiver pronta para contrato e auditoria.
              </div>
            )}

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
              disabled={purchaseLoading || savingCompliance || (purchaseMethod === "pix" && !cpfCnpj.trim())}
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-emerald-200" />
            <p className="text-sm font-semibold text-white">Licenças da conta</p>
          </div>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.licenses.length === 0 ? (
            <EmptyBlock text="Nenhuma licença vinculada ainda. Quando um código for comprado, ele poderá ser ativado aqui e no app desktop." />
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
                    <span>Assentos: {license.seatLimit}</span>
                    <span>Dispositivos: {license.activations.length}/{license.deviceLimit}</span>
                    <span>Emitida em: {formatDate(license.issuedAt)}</span>
                    <span>Updates até: {formatDate(license.updatesUntil)}</span>
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
            <EmptyBlock text="Nenhum dispositivo do Hydra Cyber foi ativado ainda nesta conta." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.devices.filter((device) => !device.revokedAt).map((device) => (
                <div key={device.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{device.deviceName}</p>
                      <p className="mt-1 text-xs text-slate-400">{device.platform} • app {device.cliVersion}</p>
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-fuchsia-200" />
            <p className="text-sm font-semibold text-white">Histórico de pagamentos</p>
          </div>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.recentPayments.length === 0 ? (
            <EmptyBlock text="Nenhum pagamento Hydra Cyber registrado ainda nesta conta." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{payment.displayName}</p>
                      <p className="mt-1 text-xs text-slate-400">{payment.productType} • {payment.paymentMethod}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{payment.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                    <span>{formatDate(payment.createdAt)}</span>
                    <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payment.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-white">Releases publicadas</p>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.releases.length === 0 ? (
            <EmptyBlock text="Nenhuma release do Hydra Cyber foi publicada ainda. Esta área está pronta para Linux, Windows e futuras builds." />
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
                  {safeUrl(release.downloadUrl) ? (
                    <a href={safeUrl(release.downloadUrl)!} rel="noopener noreferrer" className="mt-4 inline-flex text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                      Baixar release
                    </a>
                  ) : (
                    <span className="mt-4 inline-flex text-xs text-slate-500">URL indisponível</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function CheckTile({ checked, onChange, title, subtitle }: { checked: boolean; onChange: (checked: boolean) => void; title: string; subtitle: string }) {
  return (
    <label className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
      <div className="flex items-start gap-3">
        <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-black/20" />
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
    </label>
  );
}

function LoadingBlock() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando dados do Hydra Cyber...
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
