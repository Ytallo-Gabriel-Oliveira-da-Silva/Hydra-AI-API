"use client";

import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao registrar");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-12 text-slate-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3 text-sm text-emerald-200">
            <Sparkles className="h-4 w-4" />
            <span>Bem-vindo à HYDRA</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-white">Crie sua conta</h1>
          <p className="mt-3 text-slate-200">
            Cadastre-se para desbloquear chat multimodal, busca avançada, criação visual, voz e recursos operacionais em uma experiência única.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Planos</p>
              <p className="mt-1 text-sm text-slate-300">Free, Plus, Pro e anual — configure depois.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Segurança</p>
              <p className="mt-1 text-sm text-slate-300">Cookies seguros, MFA opcional e controles de dados.</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-300">HYDRA AI</p>
                <p className="text-xl font-semibold text-white">Registrar</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm text-slate-200">Nome</span>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm text-slate-200">E-mail</span>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
                    placeholder="email@hydra.ai"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm text-slate-200">Senha</span>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
                    placeholder="Senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-slate-300 transition hover:text-white"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && <p className="text-sm text-rose-300">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Criando..." : "Criar conta"}
              </button>

              <p className="text-sm text-slate-300">
                Já tem login?{' '}
                <button type="button" onClick={() => router.push("/login")} className="text-emerald-200 underline">
                  Entrar
                </button>
              </p>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Vamos validar sua região e blacklist durante o cadastro.
              </div>
            </div>
          </div>
        </form>

        <div className="lg:col-span-2">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
