"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User2 } from "lucide-react";

type SurfaceAuthFormProps = {
  surface: "api" | "cli";
  mode: "login" | "register";
};

const surfaceConfig = {
  api: {
    label: "Hydra API",
    badge: "Enterprise Surface",
    title: "Acesso operacional para billing, chaves e observabilidade",
    description: "Entre para liberar recargas, gestão de escopos, monitoramento e governança da Hydra API com a mesma conta do ecossistema principal.",
    gradient: "from-cyan-500 via-sky-500 to-blue-500",
    panelClass: "border-cyan-400/20 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(180deg,rgba(7,18,31,0.96),rgba(4,12,23,0.94))]",
    accentText: "text-cyan-200",
    accentBorder: "border-cyan-300/20",
    mutedPanel: "bg-cyan-400/10",
    bullets: [
      "API keys com escopo e rotação segura.",
      "Wallet de créditos com Pix e cartão.",
      "Métricas operacionais, latência e erros por recurso.",
    ],
    switchHref: {
      login: "/api-panel/login",
      register: "/api-panel/register",
    },
  },
  cli: {
    label: "Hydra CLI",
    badge: "Operator Console",
    title: "Acesso profissional para licenças, dispositivos e releases",
    description: "Entre para administrar licenças, baixar binários, controlar máquinas ativas e acompanhar o consumo real do Hydra CLI.",
    gradient: "from-emerald-500 via-lime-400 to-amber-300",
    panelClass: "border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(180deg,rgba(13,18,12,0.97),rgba(12,15,9,0.94))]",
    accentText: "text-emerald-200",
    accentBorder: "border-emerald-300/20",
    mutedPanel: "bg-emerald-400/10",
    bullets: [
      "Licenças e assentos por conta.",
      "Dispositivos ativos com revogação remota.",
      "Releases estáveis para Linux, Windows e macOS.",
    ],
    switchHref: {
      login: "/cli-panel/login",
      register: "/cli-panel/register",
    },
  },
} as const;

export function SurfaceAuthForm({ surface, mode }: SurfaceAuthFormProps) {
  const router = useRouter();
  const config = surfaceConfig[surface];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { email, password, name };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao autenticar");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#02040a_100%)] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className={`rounded-[2rem] border p-8 shadow-2xl backdrop-blur ${config.panelClass}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.26em] ${config.accentBorder} ${config.accentText}`}>
              {config.badge}
            </div>
            <Link href={surface === "api" ? "/cli-panel" : "/api-panel"} className="text-sm text-slate-300 underline-offset-4 hover:underline">
              Ver outra superfície
            </Link>
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">{config.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">{config.description}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {config.bullets.map((item) => (
              <div key={item} className={`rounded-3xl border p-4 text-sm leading-relaxed text-slate-200 ${config.accentBorder} ${config.mutedPanel}`}>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">O que essa página precisa ter</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Branding próprio para a superfície atual.",
                "Entrada rápida com a mesma conta Hydra.",
                "Indicação clara de billing, segurança e governança.",
                "Navegação direta para cadastro, acesso e dashboard.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-medium ${config.accentText}`}>{config.label}</p>
              <h2 className="mt-1 text-2xl font-semibold">{isLogin ? "Login" : "Cadastro"}</h2>
            </div>
            <div className={`rounded-full bg-gradient-to-r px-4 py-2 text-sm font-semibold text-slate-950 ${config.gradient}`}>
              {isLogin ? "Entrar" : "Criar conta"}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {!isLogin && (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Nome completo</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <User2 className="h-4 w-4 text-slate-400" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    placeholder="Seu nome operacional"
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">E-mail</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  placeholder="voce@empresa.com"
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Senha</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Senha com no mínimo 8 caracteres"
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-400 transition hover:text-white">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60 ${config.gradient}`}
            >
              {loading ? "Processando..." : isLogin ? "Acessar dashboard" : "Criar conta e entrar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <p>
              {isLogin ? "Ainda não tem conta? " : "Já tem uma conta? "}
              <Link href={isLogin ? config.switchHref.register : config.switchHref.login} className={config.accentText + " underline underline-offset-4"}>
                {isLogin ? "Criar cadastro" : "Entrar"}
              </Link>
            </p>
            <p>
              <Link href="/reset-password" className="underline underline-offset-4 hover:text-white">Recuperar senha</Link>
            </p>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300">
              <ShieldCheck className={`h-4 w-4 ${config.accentText}`} />
              A autenticação é compartilhada com o ecossistema Hydra, mas a experiência visual e operacional desta superfície é dedicada.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}