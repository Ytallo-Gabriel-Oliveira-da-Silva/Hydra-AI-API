import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, ShieldCheck, Star } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import type { PlatformMetric, PlatformModule, PlatformSurface } from "@/lib/platform";

type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type SurfaceLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  surface: PlatformSurface;
  accentClass: string;
  chipClass: string;
  heroNote: string;
  metrics: PlatformMetric[];
  modules: PlatformModule[];
  featureItems: FeatureItem[];
  requiredItems: string[];
  primaryHref: string;
  secondaryHref: string;
  dashboardHref: string;
};

export function SurfaceLanding({ eyebrow, title, description, surface, accentClass, chipClass, heroNote, metrics, modules, featureItems, requiredItems, primaryHref, secondaryHref, dashboardHref }: SurfaceLandingProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#030712_48%,_#02040a_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs uppercase tracking-[0.28em] ${chipClass}`}>{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={primaryHref} className={`rounded-2xl bg-gradient-to-r px-5 py-3 text-sm font-semibold text-slate-950 shadow-xl ${accentClass}`}>
                Entrar agora
              </Link>
              <Link href={secondaryHref} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Criar conta
              </Link>
              <Link href={dashboardHref} className="rounded-2xl border border-white/15 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30">
                Ver dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.26em] ${chipClass} border-white/15`}>
                {surface.domain}
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                Mesmo banco, mesma conta, superfície própria
              </div>
            </div>
            <p className="mt-6 text-3xl font-semibold leading-tight text-white">{surface.headline}</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">{heroNote}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {metrics.slice(0, 3).map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-slate-300">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Marca registrada da superfície</p>
            <div className="mt-5 space-y-3">
              {requiredItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 ${chipClass}`} />
                  <p className="text-sm leading-relaxed text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {featureItems.map((item) => (
            <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                <item.icon className={`h-5 w-5 ${chipClass}`} />
              </div>
              <p className="mt-4 text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Star className={`h-4 w-4 ${chipClass}`} />
              O que impressiona na primeira tela
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {modules.slice(0, 4).map((module) => (
                <div key={module.title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <module.icon className={`h-5 w-5 ${chipClass}`} />
                    <p className="text-base font-semibold text-white">{module.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{module.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <ShieldCheck className={`h-4 w-4 ${chipClass}`} />
              Fluxo obrigatório
            </div>
            <div className="mt-5 space-y-4">
              {[
                "1. Apresentação de marca logo na entrada.",
                "2. Login e cadastro coerentes com a superfície.",
                "3. Dashboard com menu, métricas e contexto operacional.",
                "4. Conta, segurança e billing sem parecer improvisado.",
              ].map((step) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-200">
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={primaryHref} className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-slate-950 ${accentClass}`}>
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/support" className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm font-semibold text-white">
                Suporte
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter tone="commerce" />
      </div>
    </div>
  );
}