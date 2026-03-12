# Hydra AI API

Aplicacao Next.js com autenticacao, dashboard, billing, painel de API e painel de CLI no mesmo projeto.

## Superficies do produto

- `hydra-ai.shop`: landing, auth, dashboard e planos principais
- `api.hydra-ai.shop`: Hydra API Panel com chaves, recargas e metricas de uso
- `cli.hydra-ai.shop`: Hydra CLI Panel com compras de licenca, releases e ativacoes

Os tres pontos compartilham usuarios, sessao, banco e infraestrutura de pagamento.

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie seu arquivo de ambiente a partir de `.env.example`.

3. Aplique o schema e popule dados iniciais:

```bash
npx prisma migrate dev
npm run db:seed
```

4. Inicie o servidor:

```bash
npm run dev
```

## Billing e catalogo comercial

O projeto agora suporta tres tipos de transacao no mesmo fluxo do Asaas:

- assinaturas de plano
- recargas de creditos para a API
- compra avulsa de licencas do CLI

Fluxos suportados:

- Pix com QR Code e copia e cola
- checkout hospedado do Asaas para cartao

Depois da confirmacao do pagamento, o backend liquida automaticamente:

- renovacao de acesso do plano
- credito de wallet e ledger da API
- emissao de licenca Hydra CLI

## Variaveis de ambiente

Use `.env.example` como referencia. Em producao, configure pelo menos:

- `DATABASE_URL`
- `JWT_SECRET`
- `RESET_TOKEN_SECRET`
- `APP_URL`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_DOMAIN`
- `ASAAS_API_KEY`
- `ASAAS_ENVIRONMENT`
- `ASAAS_WEBHOOK_TOKEN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SUPPORT_EMAIL`

Variaveis de providers de IA continuam obrigatorias conforme os recursos habilitados no ambiente.

Para producao com subdominios, use:

- `DATABASE_URL="file:./data.db"` se a VPS continuar em SQLite
- `APP_URL="https://hydra-ai.shop"`
- `SESSION_COOKIE_SECURE="true"`
- `SESSION_COOKIE_DOMAIN=".hydra-ai.shop"`

Video usa PIAPI com `sora2-pro-video`, resolucao fixa em `720p` e duracao limitada a `10` segundos.

## Subdominios

O middleware reescreve automaticamente a raiz de cada host:

- `api.hydra-ai.shop/` -> `/api-panel`
- `cli.hydra-ai.shop/` -> `/cli-panel`

Isso permite publicar uma unica aplicacao Next.js atras de um proxy reverso e expor experiencias separadas por subdominio.

## Deploy na Vercel

Este projeto funciona bem na Vercel, mas nao com SQLite local em producao. O valor `file:./data.db` serve apenas para desenvolvimento local ou VPS com disco persistente.

Antes de publicar na Vercel:

1. Escolha um banco gerenciado compativel com Prisma.
2. Troque `DATABASE_URL` por uma conexao remota.
3. Rode as migrations nesse banco.
4. Configure as variaveis de ambiente na Vercel.

Guia recomendado: `docs/vercel-deploy.md`.

## Deploy em VPS Ubuntu

Se voce quiser manter SQLite por enquanto, a melhor opcao e publicar em uma VPS Linux com disco persistente.

Guias recomendados:

- `docs/azure-vps-deploy.md`
- `docs/hydra-vps-subdomains.md`
