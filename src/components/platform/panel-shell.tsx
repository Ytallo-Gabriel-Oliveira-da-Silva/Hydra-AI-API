import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import type { PlatformMetric, PlatformModule, PlatformSurface } from "@/lib/platform";

type PanelShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  accentClass: string;
  surface: PlatformSurface;
  metrics: PlatformMetric[];
  modules: PlatformModule[];
  roadmap: string[];
  companionHref: string;
  companionLabel: string;
  children?: ReactNode;
};

export function PanelShell({
  eyebrow,
  title,
  description,
  accentClass,
  surface,
  metrics,
  modules,
  roadmap,
  companionHref,
  companionLabel,
  children,
}: PanelShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#030712_50%,_#02040a_100%)] px-6 py-10 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">{eyebrow}</p>
              <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">{title}</h1>
              <p className="mt-4 text-base leading-relaxed text-slate-200 sm:text-lg">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                Voltar ao ecossistema
              </Link>
              <Link href={companionHref} className={`rounded-2xl px-4 py-3 font-semibold text-white transition hover:opacity-90 ${accentClass}`}>
                {companionLabel}
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Superficie planejada</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SurfaceCard label="Produto" value={surface.name} />
              <SurfaceCard label="Dominio" value={surface.domain} />
              <SurfaceCard label="Base" value="Mesmo banco e mesma conta" />
            </div>
            <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-lg font-semibold text-white">{surface.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{surface.summary}</p>
            </div>
            {children}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                <p className="mt-2 text-sm text-slate-300">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Modulos base</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <ModuleCard key={module.title} title={module.title} summary={module.summary} icon={module.icon} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Roadmap estrutural</p>
            <div className="mt-5 space-y-3">
              {roadmap.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <p className="text-sm leading-relaxed text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SiteFooter tone="commerce" />
      </div>
    </div>
  );
}

function SurfaceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ModuleCard({ title, summary, icon: Icon }: { title: string; summary: string; icon: LucideIcon }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20 hover:bg-white/10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
          <Icon className="h-5 w-5 text-cyan-200" />
        </div>
        <p className="text-base font-semibold text-white">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{summary}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200">
        Estrutura prevista
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
