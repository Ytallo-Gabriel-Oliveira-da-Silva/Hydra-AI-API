"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2, Plus, ShieldCheck, Wallet } from "lucide-react";

type ApiPanelOverview = {
  wallet: {
    currency: string;
    balanceCents: number;
    creditBalance: number;
  };
  summary: {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    successRate: number;
    totalCreditsConsumed: number;
  };
  usageSeries: Array<{
    month: string;
    text: number;
    image: number;
    audio: number;
    total: number;
  }>;
  keys: Array<{
    id: string;
    name: string;
    prefix: string;
    status: string;
    scopes: string[];
    createdAt: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
  }>;
  recentLogs: Array<{
    id: string;
    resourceType: string;
    endpoint: string;
    statusCode: number;
    latencyMs: number | null;
    creditCost: number;
    createdAt: string;
    apiKeyName: string | null;
    apiKeyPrefix: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    planName: string;
  }>;
};

const scopeOptions = [
  { id: "text", label: "Texto" },
  { id: "image", label: "Imagem" },
  { id: "audio", label: "Áudio" },
];

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("pt-BR");
}

export function ApiPanelClient() {
  const [overview, setOverview] = useState<ApiPanelOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["text"]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdPrefix, setCreatedPrefix] = useState<string | null>(null);

  async function loadOverview() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/api-panel/overview", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar Hydra API Panel");
      setOverview(data as ApiPanelOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Hydra API Panel");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  async function createKey() {
    if (!formName.trim() || selectedScopes.length === 0) return;
    try {
      setCreating(true);
      setError(null);
      const res = await fetch("/api/api-panel/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formName.trim(),
          scopes: selectedScopes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar chave");
      setCreatedSecret(data.secret as string);
      setCreatedPrefix(data.key.prefix as string);
      setFormName("");
      setSelectedScopes(["text"]);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar chave");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string) {
    try {
      setError(null);
      const res = await fetch(`/api/api-panel/keys/${keyId}`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao revogar chave");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revogar chave");
    }
  }

  function toggleScope(scope: string) {
    setSelectedScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {createdSecret && (
        <div className="rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Chave criada com sucesso</p>
              <p className="mt-1 text-xs text-emerald-100">Guarde este segredo agora. Ele não será exibido novamente.</p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-cyan-100">
                {createdSecret}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(createdSecret)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar segredo
                </button>
                <span className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200">Prefixo: {createdPrefix}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Wallet className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Carteira da API</p>
              <p className="text-xs text-slate-300">Saldo e créditos para requests reais</p>
            </div>
          </div>

          {loading || !overview ? (
            <LoadingBlock />
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Saldo" value={formatCurrency(overview.wallet.balanceCents, overview.wallet.currency)} detail="Recargas aprovadas" />
              <MetricCard label="Créditos" value={String(overview.wallet.creditBalance)} detail="Disponíveis para consumir" />
              <MetricCard label="Requests" value={String(overview.summary.totalRequests)} detail="Texto + imagem + áudio" />
              <MetricCard label="Sucesso" value={`${overview.summary.successRate.toFixed(1)}%`} detail="Baseado no tráfego registrado" />
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            Pagamentos previstos para a API: Pix e cartão. A criação da chave pode ser gratuita, mas a execução depende de saldo e créditos disponíveis.
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10">
              <KeyRound className="h-5 w-5 text-fuchsia-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Criar nova chave</p>
              <p className="text-xs text-slate-300">Defina nome e escopos para liberar uso na Hydra API</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Nome da chave</span>
              <input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="Backend principal"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
              />
            </label>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Escopos permitidos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {scopeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleScope(option.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${selectedScopes.includes(option.id) ? "border border-cyan-300/30 bg-cyan-400/15 text-cyan-100" : "border border-white/10 bg-white/5 text-slate-200"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createKey}
              disabled={creating || !formName.trim() || selectedScopes.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar chave
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-cyan-200" />
            <p className="text-sm font-semibold text-white">Chaves emitidas</p>
          </div>

          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.keys.length === 0 ? (
            <EmptyBlock text="Nenhuma chave criada ainda. Emita a primeira para começar a integrar a Hydra API." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.keys.map((key) => (
                <div key={key.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{key.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{key.prefix} • {key.scopes.join(", ")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-semibold ${key.status === "active" ? "bg-emerald-400/15 text-emerald-100" : "bg-white/10 text-slate-300"}`}>
                        {key.status}
                      </span>
                      {key.status === "active" && (
                        <button onClick={() => revokeKey(key.id)} className="rounded-full border border-white/15 px-3 py-1 text-slate-200 hover:bg-white/10">
                          Revogar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
                    <span>Criada em {formatDate(key.createdAt)}</span>
                    <span>Último uso: {formatDate(key.lastUsedAt)}</span>
                    <span>Expira em: {formatDate(key.expiresAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-white">Uso por mês</p>
          {loading || !overview ? (
            <LoadingBlock />
          ) : (
            <div className="mt-4 space-y-4">
              {overview.usageSeries.map((item) => {
                const maxValue = Math.max(...overview.usageSeries.map((series) => series.total), 1);
                const width = `${Math.max((item.total / maxValue) * 100, item.total > 0 ? 8 : 2)}%`;
                return (
                  <div key={item.month}>
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                      <span>{item.month}</span>
                      <span>{item.total} req</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" style={{ width }} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                      <span>Texto {item.text}</span>
                      <span>Imagem {item.image}</span>
                      <span>Áudio {item.audio}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-white">Logs recentes</p>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.recentLogs.length === 0 ? (
            <EmptyBlock text="Os logs de requests da Hydra API aparecerão aqui assim que a integração começar a trafegar chamadas reais." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.recentLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{log.endpoint}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${log.statusCode < 400 ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"}`}>
                      {log.statusCode}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                    <span>Tipo: {log.resourceType}</span>
                    <span>Créditos: {log.creditCost}</span>
                    <span>Latência: {log.latencyMs ? `${log.latencyMs} ms` : "n/d"}</span>
                    <span>Quando: {formatDate(log.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-white">Pagamentos recentes</p>
          {loading || !overview ? (
            <LoadingBlock />
          ) : overview.recentPayments.length === 0 ? (
            <EmptyBlock text="Ainda não há pagamentos registrados. As futuras recargas de API devem entrar por Pix ou cartão." />
          ) : (
            <div className="mt-4 space-y-3">
              {overview.recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{payment.planName}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-slate-300">{payment.status}</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                    <span>Método: {payment.paymentMethod}</span>
                    <span>Valor: {formatCurrency(payment.amount * 100, "BRL")}</span>
                    <span>Registrado em: {formatDate(payment.createdAt)}</span>
                  </div>
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

function LoadingBlock() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando dados do painel...
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
