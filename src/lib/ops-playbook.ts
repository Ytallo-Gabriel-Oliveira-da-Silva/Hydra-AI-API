const OPS_PATTERNS = [
  /\bvps\b/i,
  /\bdeploy\b/i,
  /\bpm2\b/i,
  /\bnginx\b/i,
  /\bbuild\b/i,
  /\b502\b/i,
  /\b503\b/i,
  /\b500\b/i,
  /\berro\b/i,
  /\blog\b/i,
  /\bssl\b/i,
  /\bdns\b/i,
  /\bprisma\b/i,
  /\benv\b/i,
  /\brestart\b/i,
  /\bproxy\b/i,
] as const;

const WEB_RESEARCH_PATTERNS = [
  /\bvers[aã]o\b/i,
  /\batualiz/i,
  /\bdocs?\b/i,
  /\bunknown\b/i,
  /\bforbidden\b/i,
  /\btimeout\b/i,
  /\bfalha\b/i,
  /\bquebrou\b/i,
] as const;

const PLAYBOOK_ITEMS = [
  {
    title: "Build do Next.js falhou",
    triggers: ["next build", "build", "typescript", "prisma generate", "module not found"],
    guidance: "Validar variáveis de ambiente, rodar npm install, prisma generate, npm run build e corrigir o primeiro erro real antes de relançar o PM2.",
  },
  {
    title: "Aplicação PM2 caiu ou reinicia em loop",
    triggers: ["pm2", "restart", "loop", "crash", "offline"],
    guidance: "Inspecionar pm2 status, pm2 logs, validar cwd, arquivo .env, porta, e só então reiniciar com pm2 restart e pm2 save.",
  },
  {
    title: "Nginx devolvendo 502/503",
    triggers: ["nginx", "502", "503", "bad gateway", "upstream"],
    guidance: "Checar se o processo Node responde na porta esperada, revisar proxy_pass, nginx -t e systemctl reload nginx depois da correção.",
  },
  {
    title: "Problemas de banco Prisma/SQLite",
    triggers: ["prisma", "database", "sqlite", "migration", "schema"],
    guidance: "Verificar DATABASE_URL, permissão de escrita do arquivo SQLite, compatibilidade do schema e execução de prisma generate/migrate antes do boot.",
  },
  {
    title: "Falhas por variável de ambiente",
    triggers: ["env", "api key", "ausente", "missing", "undefined"],
    guidance: "Comparar .env da VPS com .env.example, corrigir chave ausente, rebuildar e reiniciar serviços dependentes.",
  },
  {
    title: "DNS ou SSL incorretos",
    triggers: ["dns", "ssl", "certbot", "domínio", "domain", "https"],
    guidance: "Conferir A/CNAME, checar certificado ativo, validar APP_URL e garantir que Nginx encaminha HTTP para HTTPS quando necessário.",
  },
] as const;

export function isOpsQuery(message: string) {
  return OPS_PATTERNS.some((pattern) => pattern.test(message));
}

export function shouldUseWebResearch(message: string) {
  return isOpsQuery(message) || WEB_RESEARCH_PATTERNS.some((pattern) => pattern.test(message));
}

export function getOpsPlaybookContext(message: string) {
  const lower = message.toLowerCase();
  const matched = PLAYBOOK_ITEMS.filter((item) => item.triggers.some((trigger) => lower.includes(trigger.toLowerCase())));
  const selected = matched.length > 0 ? matched : PLAYBOOK_ITEMS.slice(0, 3);

  return selected
    .map((item) => `- ${item.title}: ${item.guidance}`)
    .join("\n");
}