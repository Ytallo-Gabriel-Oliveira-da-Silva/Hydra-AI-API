import { SiteFooter } from "@/components/site-footer";
import { createBreadcrumbStructuredData, createMetadata } from "@/lib/seo";
import { Bot, ChevronRight, Globe2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = createMetadata({
  title: "Plataforma multimodal",
  description:
    "Conheca a HYDRA AI: plataforma principal multimodal com chat, busca, imagem, audio e video, alem das superficies dedicadas Hydra API e Hydra Cyber.",
  path: "/",
  keywords: [
    "HYDRA AI oficial",
    "Hydra API",
    "Hydra Cyber",
    "api.hydra-ai.shop",
    "cli.hydra-ai.shop",
    "chat multimodal",
    "IA com audio e video",
    "login hydra ai",
    "cadastro hydra ai",
  ],
});

export default function Home() {
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Inicio", path: "/" },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-12 text-slate-50">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-200">HYDRA AI</p>
              <p className="text-sm text-slate-200">Chat, busca, imagem, áudio e vídeo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <Link className="rounded-xl border border-white/20 px-3 py-2 transition hover:border-white/40 hover:bg-white/10" href="/login">
              Entrar
            </Link>
            <Link className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 font-semibold text-white shadow-lg transition hover:opacity-90" href="/register">
              Criar conta
            </Link>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
            <div className="flex items-center gap-2 text-sm text-indigo-200">
              <Sparkles className="h-4 w-4" />
              <span>Experiência conversacional avançada, agora em páginas dedicadas</span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold text-white">HYDRA AI</h1>
            <p className="mt-3 text-lg text-slate-200">
              Painel multimodal com chat, pesquisa, criação visual, voz, vídeo e organização operacional em uma única experiência profissional.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <HighlightCard
                icon={<Lock className="h-5 w-5" />}
                title="Autenticação dedicada"
                text="Páginas de login e registro isoladas, cookies seguros em produção."
              />
              <HighlightCard
                icon={<Globe2 className="h-5 w-5" />}
                title="Dashboard protegido"
                text="/dashboard só abre com sessão ativa; middleware redireciona para login."
              />
              <HighlightCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Multimodal real"
                text="Chat, busca, imagem, áudio, vídeo e histórico integrados à plataforma HYDRA."
              />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <QuickLink href="/api-panel" label="Hydra API Panel" description="Estrutura inicial para chaves, créditos, billing e analytics empresariais" />
              <QuickLink href="/cli-panel" label="Hydra Cyber" description="Software desktop com licença, downloads, ativações, compliance e consumo operacional" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
              <Badge>Interface conversacional premium</Badge>
              <Badge>Planos Free/Plus/Pro</Badge>
              <Badge>Investigação + Projetos</Badge>
              <Badge>Controles parentais e dados</Badge>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold text-white">
              <Link
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-3 shadow-lg transition hover:opacity-90"
                href="/login"
              >
                Ir para dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 transition hover:border-white/40 hover:bg-white/10"
                href="/register"
              >
                Criar conta
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 transition hover:border-white/40 hover:bg-white/10"
                href="/login"
              >
                Já tenho login
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <nav aria-label="Atalhos publicos" className="mt-8 grid grid-cols-2 gap-3 text-sm text-slate-200 md:grid-cols-3">
              <QuickLink href="/plans" label="Planos" description="Compare Free, Plus, Pro e Anual" />
              <QuickLink href="/support" label="Suporte" description="Central de ajuda e contato" />
              <QuickLink href="/reset-password" label="Resetar senha" description="Recupere o acesso da conta" />
              <QuickLink href="/login" label="Login" description="Acesso seguro ao painel" />
              <QuickLink href="/register" label="Cadastro" description="Crie sua conta na plataforma" />
              <QuickLink href="/plans/free" label="Plano Free" description="Explore a versao de entrada" />
            </nav>
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 p-8">
            <p className="text-sm text-indigo-100">O que mudou</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Fluxo profissional em páginas</h2>
            <ul className="mt-4 space-y-3 text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300" />
                Dashboard foi movido para /dashboard com o layout completo e multimodal.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-300" />
                Landing simples aqui em / para direcionar login e registro.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                Middleware protege /dashboard: sem cookie de sessão, redirecionamos para /login.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                Hydra API e Hydra Cyber agora têm estrutura própria dentro do projeto para evoluir sem duplicar a base principal.
              </li>
            </ul>
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Pronto para operação</p>
              <p className="mt-2">Conta, planos, pagamento, histórico, voz e áreas de trabalho integrados na própria plataforma.</p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

function HighlightCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2 text-indigo-200">
        {icon}
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 text-sm text-slate-200">{text}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100">{children}</span>;
}

function QuickLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-white/20 hover:bg-white/10">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-300">{description}</p>
    </Link>
  );
}
