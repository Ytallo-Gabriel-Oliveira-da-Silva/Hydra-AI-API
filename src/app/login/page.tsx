"use client";

import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao entrar");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-12 text-slate-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3 text-sm text-indigo-200">
            <Sparkles className="h-4 w-4" />
            <span>HYDRA AI · Acesso seguro</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-white">HYDRA AI</h1>
          <p className="text-sm text-indigo-200">Cockpit multimodal</p>
          <p className="mt-3 text-slate-200">
            Chat, pesquisa, imagens, áudio e investigações em uma operação unificada da plataforma.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Proteção</p>
              <p className="mt-1 text-sm text-slate-300">Sessões isoladas, cookies seguros e verificação de região.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Produtividade</p>
              <p className="mt-1 text-sm text-slate-300">Fluxos rápidos para chat, imagem, áudio e vídeo em um só lugar.</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-300">HYDRA AI</p>
                <p className="text-xl font-semibold text-white">Login</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
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
                    placeholder="voce@empresa.com"
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
                    autoComplete="current-password"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <p className="text-sm text-slate-300">
                Não tem conta?{' '}
                <button type="button" onClick={() => router.push("/register")} className="text-indigo-200 underline">
                  Criar conta
                </button>
              </p>

              <p className="text-sm text-slate-300">
                Esqueceu a senha?{' '}
                <button type="button" onClick={() => router.push("/reset-password")} className="text-indigo-200 underline">
                  Recuperar acesso
                </button>
              </p>
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
