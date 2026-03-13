import {
  Activity,
  AudioLines,
  BarChart3,
  Blocks,
  Bot,
  Cable,
  CreditCard,
  FileKey2,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  Mic,
  Package,
  Receipt,
  ShieldCheck,
  TerminalSquare,
  Wallet,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export type PlatformSurface = {
  id: "core" | "api" | "cli";
  name: string;
  domain: string;
  headline: string;
  summary: string;
};

export type PlatformModule = {
  title: string;
  summary: string;
  icon: LucideIcon;
};

export type PlatformMetric = {
  label: string;
  value: string;
  detail: string;
};

export const platformSurfaces: PlatformSurface[] = [
  {
    id: "core",
    name: "HYDRA AI",
    domain: "hydra-ai.shop",
    headline: "Workspace principal com chat, imagem, audio, investigacoes e operacao.",
    summary: "Base compartilhada de autenticacao, conta, billing, planos e contexto do usuario.",
  },
  {
    id: "api",
    name: "Hydra API Panel",
    domain: "api.hydra-ai.shop",
    headline: "Painel empresarial para chaves, creditos, analytics, observabilidade e billing de API.",
    summary: "Usa o mesmo banco e o mesmo login do produto principal, com carteira de creditos e uso por recurso.",
  },
  {
    id: "cli",
    name: "Hydra Cyber",
    domain: "cli.hydra-ai.shop",
    headline: "Painel de licenca, compliance, downloads, ativacoes, releases e consumo do desktop profissional.",
    summary: "A licenca libera o Hydra Cyber e os creditos financiam o consumo real da IA, labs e recursos cloud dentro do app.",
  },
];

export const apiPanelModules: PlatformModule[] = [
  {
    title: "Overview executivo",
    summary: "Saldo, creditos consumidos, requests, latencia, erros, produtos mais usados e tendencias por periodo.",
    icon: LayoutDashboard,
  },
  {
    title: "Chaves e seguranca",
    summary: "Criacao, revogacao, escopos, restricoes por IP, rotacao e auditoria completa de acesso.",
    icon: FileKey2,
  },
  {
    title: "Billing e carteira",
    summary: "Pix, cartao, extrato de recargas, saldo atual, reservas de credito e comprovantes.",
    icon: Wallet,
  },
  {
    title: "Observabilidade",
    summary: "Requests por endpoint, taxa de erro, status code, origem, latencia e webhook de alerta.",
    icon: Activity,
  },
  {
    title: "Catalogo de recursos",
    summary: "Texto com custo baixo, imagem e audio com custo mais alto, limites por plano e tabelas de preco.",
    icon: Wand2,
  },
  {
    title: "Documentacao e playground",
    summary: "Docs integradas, exemplos de payload, testador de endpoint e onboarding para equipes.",
    icon: Blocks,
  },
];

export const apiPanelMetrics: PlatformMetric[] = [
  { label: "Requests totais", value: "128.4k", detail: "30 dias / consolidado" },
  { label: "Taxa de erro", value: "0.82%", detail: "APIs texto, imagem e audio" },
  { label: "Latencia media", value: "640 ms", detail: "media global dos endpoints" },
  { label: "Saldo e creditos", value: "R$ 3.480", detail: "carteira ativa e recargas" },
];

export const apiPanelRoadmap = [
  "Mesma base de usuarios, sessoes e billing do app principal.",
  "Carteira de creditos separada por transacao e por consumo.",
  "API keys com escopo, rate limit e auditoria por origem.",
  "Dashboard empresarial com graficos de uso, erro, custo e saldo.",
  "Playground e documentacao embutida no proprio painel.",
];

export const cliPanelModules: PlatformModule[] = [
  {
    title: "Licenca e ativacao",
    summary: "Licenca anual por usuario, vinculacao por conta, limite de dispositivos por plano e trilha de ativacao.",
    icon: KeyRound,
  },
  {
    title: "Downloads e releases",
    summary: "Distribuicao para Linux, Windows e macOS com changelog, hash e canal estavel.",
    icon: Package,
  },
  {
    title: "Conta e saldo",
    summary: "Mesmo login do ecossistema Hydra com dashboard completo de pagamentos, creditos, contratos e consumo.",
    icon: CreditCard,
  },
  {
    title: "Comandos Hydra",
    summary: "Texto, imagem, audio, consulta de modelos, configuracao local, terminal e status do ambiente.",
    icon: TerminalSquare,
  },
  {
    title: "Governanca do cliente",
    summary: "Sessoes, dispositivos, tokens, politicas de uso etico, revogacao remota e trilha de auditoria.",
    icon: LockKeyhole,
  },
  {
    title: "Telemetria de uso",
    summary: "Uso por maquina, versao, comando, erros e consumo vinculado ao usuario e a licenca.",
    icon: Gauge,
  },
];

export const cliPanelMetrics: PlatformMetric[] = [
  { label: "Planos comerciais", value: "4", detail: "Starter, Pro, Team e Enterprise" },
  { label: "Dispositivos por conta", value: "1-80", detail: "conforme o plano contratado" },
  { label: "Comandos suportados", value: "10+", detail: "V1 com foco em produtividade e seguranca" },
  { label: "Updates incluidos", value: "12 meses", detail: "janela recomendada por licenca" },
];

export const cliPanelRoadmap = [
  "Painel gratuito para baixar, ativar e acompanhar o CLI.",
  "Licenca libera o produto; creditos pagam o consumo da IA.",
  "V1 com login, saldo, usage, models, text, image, audio e update.",
  "Planos Starter, Pro, Team e Enterprise com limites por usuario/dispositivo.",
  "Ativacao por dispositivo e revogacao remota pelo painel.",
  "Enterprise com deploy na nuvem do cliente usando PM2 e Nginx.",
  "Integracao direta com a Hydra API sem duplicar autenticacao.",
];

export const sharedPlatformPrinciples: PlatformModule[] = [
  {
    title: "Banco compartilhado",
    summary: "API Panel e CLI Panel devem reutilizar users, sessions, plans, payments e configuracoes do app atual.",
    icon: Cable,
  },
  {
    title: "Modelo de creditos",
    summary: "Texto consome menos; imagem e audio consomem mais; licenca do CLI nao substitui saldo.",
    icon: Receipt,
  },
  {
    title: "Subdominios dedicados",
    summary: "O mesmo ecossistema sera dividido entre hydra-ai.shop, api.hydra-ai.shop e cli.hydra-ai.shop.",
    icon: LineChart,
  },
  {
    title: "Governanca e seguranca",
    summary: "Toda superficie precisa nascer com rastreabilidade, limites e protecao empresarial.",
    icon: ShieldCheck,
  },
];

export const apiCapabilities = [
  { name: "Texto", weight: "baixo", icon: Bot },
  { name: "Imagem", weight: "alto", icon: Wand2 },
  { name: "Audio", weight: "alto", icon: AudioLines },
  { name: "CLI usage", weight: "variavel", icon: Mic },
];
