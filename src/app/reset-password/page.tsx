"use client";

import { SiteFooter } from "@/components/site-footer";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell loading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao solicitar redefinição");
      setSuccess(data.message || "Se existir conta, um link foi enviado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (password !== confirmPassword) throw new Error("As senhas não conferem");
      const res = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao redefinir senha");
      setSuccess("Senha redefinida com sucesso. Você já pode fazer login.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  const isConfirmStep = Boolean(token);

  return (
    <ResetPasswordShell isConfirmStep={isConfirmStep}>
      <form onSubmit={isConfirmStep ? handleConfirm : handleRequest} className="mt-8 space-y-4">
        {!isConfirmStep && (
          <Field label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
          </Field>
        )}

        {isConfirmStep && (
          <>
            <Field label="Nova senha">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
            </Field>
            <Field label="Confirmar senha">
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
            </Field>
          </>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}

        <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isConfirmStep ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />)}
          {loading ? "Processando..." : (isConfirmStep ? "Salvar nova senha" : "Enviar link")}
        </button>
      </form>
    </ResetPasswordShell>
  );
}

function ResetPasswordShell({
  children,
  loading = false,
  isConfirmStep = false,
}: {
  children?: React.ReactNode;
  loading?: boolean;
  isConfirmStep?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="flex items-center gap-3 text-emerald-200">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isConfirmStep ? <KeyRound className="h-5 w-5" /> : <Mail className="h-5 w-5" />)}
            <span className="text-sm">HYDRA AI</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">{isConfirmStep ? "Criar nova senha" : "Recuperar senha"}</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            {isConfirmStep
              ? "Defina uma nova senha para concluir o acesso à sua conta."
              : "Informe seu e-mail e enviaremos um link de redefinição usando o suporte do domínio."}
          </p>
          {children ?? <div className="mt-8 text-sm text-slate-300">Carregando…</div>}
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-200">{label}</span>
      {children}
    </label>
  );
}