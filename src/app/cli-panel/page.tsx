import { createBreadcrumbStructuredData, createMetadata, surfaceConfig } from "@/lib/seo";
import { cliPanelMetrics, cliPanelModules, platformSurfaces } from "@/lib/platform";
import { SurfaceLanding } from "@/components/platform/surface-landing";
import { Download, KeyRound, Laptop2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function normalizeHost(value: string) {
  return value.split(",")[0].trim().split(":")[0].toLowerCase();
}

async function resolveSurfaceContext() {
  const headersList = await headers();
  const host = normalizeHost(headersList.get("x-forwarded-host") || headersList.get("host") || "");
  const isCliHost = host.startsWith("cli.");

  return {
    isCliHost,
    host,
    label: isCliHost ? "Hydra CLI" : "Hydra Cyber",
    domain: isCliHost ? "cli.hydra-ai.shop" : "cyber.hydra-ai.shop",
    baseUrl: isCliHost
      ? (process.env.CLI_APP_URL || "https://cli.hydra-ai.shop")
      : (process.env.CYBER_APP_URL || surfaceConfig.cyberUrl),
  };
}

function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

export async function generateMetadata() {
  const surface = await resolveSurfaceContext();
  const isCli = surface.isCliHost;

  return createMetadata({
    title: isCli ? "Hydra CLI" : "Hydra Cyber",
    description: isCli
      ? "Landing oficial do Hydra CLI com identidade própria para licença, desktop instalado, downloads, dispositivos e operação ética."
      : "Landing oficial do Hydra Cyber com identidade própria para licença, desktop instalado, downloads, dispositivos e operação ética.",
    path: "/",
    canonicalBaseUrl: surface.baseUrl,
    keywords: isCli
      ? ["Hydra CLI", "cli.hydra-ai.shop", "software desktop profissional", "licença hydra cli", "downloads e releases", "login hydra cli", "cadastro hydra cli"]
      : ["Hydra Cyber", "cyber.hydra-ai.shop", "software desktop profissional", "licença hydra cyber", "downloads e releases", "login hydra cyber", "cadastro hydra cyber"],
  });
}

export default async function CliPanelPage() {
  const surfaceContext = await resolveSurfaceContext();
  const productLabel = surfaceContext.label;

  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Inicio", path: "/" },
    { name: productLabel, path: "/" },
  ], surfaceContext.baseUrl);
  const releases = await prisma.cliRelease.findMany({
    orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
    take: 6,
  });

  const surface = platformSurfaces.find((item) => item.id === "cli");
  if (!surface) return null;

  const resolvedSurface = {
    ...surface,
    name: productLabel,
    domain: surfaceContext.domain,
    summary: surfaceContext.isCliHost
      ? "A licença libera o Hydra CLI e os créditos financiam o consumo real da IA, labs e recursos cloud dentro do app."
      : surface.summary,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#030712_48%,_#02040a_100%)] px-6 py-10 text-white">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <SurfaceLanding
        eyebrow={productLabel}
        title="Desktop profissional com identidade própria para licença, downloads, dispositivos e operação real"
        description={`O ${productLabel} entra como produto premium de verdade: app desktop obrigatório, identidade própria, licença vinculada à conta e uma jornada completa de login, dashboard e gestão operacional.`}
        surface={resolvedSurface}
        metrics={cliPanelMetrics}
        modules={cliPanelModules}
        accentClass="from-emerald-500 via-lime-400 to-amber-300"
        chipClass="text-emerald-200"
        heroNote={`Aqui o usuário precisa entender de primeira que entrou em um produto desktop premium (${productLabel}): licença, dispositivo, release, terminal, operação ética e confiança comercial no mesmo ecossistema Hydra.`}
        featureItems={[
          { title: "Licença como produto", description: "A primeira impressão comunica valor comercial: assentos, updates, dispositivos, contrato e política operacional bem claros.", icon: KeyRound },
          { title: "Distribuição limpa", description: "Downloads, builds por plataforma e releases entram como parte central da proposta e não como apêndice.", icon: Download },
          { title: "Operação por máquina", description: "A linguagem visual lembra IDE/console profissional com gestão de dispositivos e acesso controlado por conta.", icon: Laptop2 },
        ]}
        requiredItems={[
          "Landing pública própria com identidade de software desktop profissional.",
          "Auth pensada para licença, dispositivos, contrato e operação ética.",
          "Dashboard com foco em licenças, releases, downloads, conta, billing e segurança.",
          "Assinatura visual diferente da Hydra API e da HYDRA principal.",
        ]}
        primaryHref="/login"
        secondaryHref="/register"
        dashboardHref="/dashboard"
      />
      <section className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-amber-300/30 bg-amber-400/10 p-6 text-amber-50 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-200">Aviso importante</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Software {productLabel} em desenvolvimento</h2>
        <p className="mt-2 text-sm text-amber-50/90">
          As compras de licença e as recargas já estão disponíveis para contratação, porém a validação e o uso operacional dessas licenças no app desktop
          só serão liberados após o lançamento oficial do software {productLabel}.
        </p>
      </section>
      <section className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Downloads públicos</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Baixe o {productLabel} sem pagar pelo instalador</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">O download do app é livre. O uso real do desktop continua exigindo login com a mesma conta Hydra e uma licença válida vinculada ao usuário.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300">
            Linux, Windows e futuras plataformas aparecem aqui conforme as releases forem publicadas.
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {releases.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
              Nenhuma release pública foi publicada ainda. A estrutura já está pronta para listar versões, checksums e downloads gratuitos.
            </div>
          ) : (
            releases.map((release) => (
              <div key={release.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{release.version}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{release.channel}</span>
                </div>
                <p className="mt-3 text-xs text-slate-300">{release.platform} / {release.arch}</p>
                <p className="mt-1 text-xs text-slate-400">Publicado em {new Date(release.publishedAt).toLocaleString("pt-BR")}</p>
                {release.notes && <p className="mt-3 text-sm text-slate-300">{release.notes}</p>}
                {release.checksum && <p className="mt-3 break-all text-xs text-slate-400">Checksum: {release.checksum}</p>}
                {safeUrl(release.downloadUrl) ? (
                  <a href={safeUrl(release.downloadUrl)!} rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100">
                    Baixar release
                    <Download className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="mt-4 inline-flex text-xs text-slate-500">URL de download indisponível</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
