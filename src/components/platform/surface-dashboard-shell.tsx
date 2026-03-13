"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowRight, Bell, CreditCard, Download, FileKey2, KeyRound, Laptop2, LogOut, Settings2, ShieldCheck, User2, Wallet } from "lucide-react";

type MenuItem = {
  label: string;
  hint: string;
  icon: "activity" | "keys" | "wallet" | "user" | "security" | "settings" | "license" | "devices" | "downloads";
};

type SurfaceDashboardShellProps = {
  surfaceLabel: string;
  title: string;
  description: string;
  accentClass: string;
  chipClass: string;
  menuItems: MenuItem[];
  quickNotes: string[];
  children: React.ReactNode;
};

type AuthMe = {
  name: string;
  email: string;
  countryCode: string | null;
  plan: {
    slug: string;
    name: string;
  };
  renewalAt: string | null;
};

const iconMap = {
  activity: Activity,
  keys: FileKey2,
  wallet: Wallet,
  user: User2,
  security: ShieldCheck,
  settings: Settings2,
  license: KeyRound,
  devices: Laptop2,
  downloads: Download,
} as const;

export function SurfaceDashboardShell({ surfaceLabel, title, description, accentClass, chipClass, menuItems, quickNotes, children }: SurfaceDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const surfacePrefix = pathname?.startsWith("/cli-panel") ? "/cli-panel" : pathname?.startsWith("/api-panel") ? "/api-panel" : "";
  const loginPath = `${surfacePrefix}/login`;

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.status === 401) {
          router.replace(loginPath);
          return;
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao carregar conta");
        setAccount(data as AuthMe);
      } catch {
        router.replace(loginPath);
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [loginPath, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    router.push(loginPath);
    router.refresh();
  }

  const renewalLabel = useMemo(() => {
    if (!account?.renewalAt) return "Sem renovação definida";
    return new Date(account.renewalAt).toLocaleDateString("pt-BR");
  }, [account?.renewalAt]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">Carregando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#02040a_100%)] px-6 py-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
          <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-950 ${accentClass}`}>
            {surfaceLabel}
          </div>
          <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Conta</p>
            <p className="mt-3 text-base font-semibold text-white">{account?.name || "Usuário Hydra"}</p>
            <p className="text-sm text-slate-400">{account?.email || "Conta conectada"}</p>
            <div className="mt-4 grid gap-2 text-xs text-slate-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Plano</span>
                <span className={chipClass}>{account?.plan.name || "Free"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Renovação</span>
                <span>{renewalLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Região</span>
                <span>{account?.countryCode || "Global"}</span>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {menuItems.map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = iconMap[item.icon];
                    return <Icon className={`h-4 w-4 ${chipClass}`} />;
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.hint}</p>
                  </div>
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-6 grid gap-3">
            <Link href="/support" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
              <Bell className="h-4 w-4" />
              Suporte
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.24em] ${chipClass}`}>Workspace privado</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{account?.name ? `Bem-vindo, ${account.name.split(" ")[0]}` : "Bem-vindo"}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Este dashboard foi desenhado para parecer produto de verdade: navegação lateral, métricas na abertura e módulos de conta, billing, segurança e operação no mesmo cockpit.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/plans" className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-slate-950 ${accentClass}`}>
                  Billing e plano
                  <CreditCard className="h-4 w-4" />
                </Link>
                <Link href="/support" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white">
                  Conta e suporte
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              {[
                { icon: User2, label: "Conta", value: account?.email || "Conta Hydra" },
                { icon: ShieldCheck, label: "Segurança", value: "Sessão compartilhada + cookie seguro" },
                { icon: Settings2, label: "Configurações", value: "Conta, preferências e operação" },
                { icon: CreditCard, label: "Plano", value: account?.plan.name || "Free" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <item.icon className={`h-5 w-5 ${chipClass}`} />
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0">{children}</div>
            <aside className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Menu obrigatório</p>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  {quickNotes.map((note) => (
                    <div key={note} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      {note}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Marca registrada</p>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">Apresentação profissional logo na entrada.</div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">Login, cadastro e dashboard coerentes com a superfície.</div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">Conta, segurança, billing e operação no mesmo cockpit.</div>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}