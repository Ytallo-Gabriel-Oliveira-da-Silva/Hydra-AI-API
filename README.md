# Hydra AI API

Aplicacao Next.js com autenticacao, dashboard, billing, painel de API e painel de CLI no mesmo projeto.

## Superficies do produto

- `hydra-ai.shop`: landing, auth, dashboard e planos principais
- `api.hydra-ai.shop`: Hydra API Panel com chaves, recargas e metricas de uso
- `cyber.hydra-ai.shop`: Hydra Cyber Panel com compras de licenca, releases e ativacoes

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
- `API_APP_URL`
- `CYBER_APP_URL`
- `CLI_APP_URL` (compatibilidade legada)
- `NEXT_PUBLIC_CYBER_APP_URL`
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
- `API_APP_URL="https://api.hydra-ai.shop"`
- `CYBER_APP_URL="https://cyber.hydra-ai.shop"`
- `CLI_APP_URL="https://cyber.hydra-ai.shop"` (opcional para compatibilidade)
- `NEXT_PUBLIC_CYBER_APP_URL="https://cyber.hydra-ai.shop"`
- `SESSION_COOKIE_SECURE="true"`
- `SESSION_COOKIE_DOMAIN=".hydra-ai.shop"`

`APP_URL` continua sendo a URL canonica do site principal. Os callbacks de compra do API Panel e do Hydra Cyber podem usar `API_APP_URL` e `CYBER_APP_URL`. `CLI_APP_URL` pode permanecer apenas como fallback de compatibilidade.

`SESSION_COOKIE_SECURE` e `SESSION_COOKIE_DOMAIN` continuam globais, porque a sessao precisa ser compartilhada entre os subdominios.

Video usa PIAPI com `sora2-pro-video`, resolucao fixa em `720p` e duracao limitada a `10` segundos.

## Subdominios

O middleware reescreve automaticamente a raiz de cada host:

- `api.hydra-ai.shop/` -> `/api-panel`
- `cyber.hydra-ai.shop/` -> `/cli-panel`
- `cli.hydra-ai.shop/` -> `/cli-panel`

Isso permite publicar uma unica aplicacao Next.js atras de um proxy reverso e expor experiencias separadas por subdominio.

## Comandos admin de teste

Os comandos abaixo foram feitos para testes internos com recarga/licenca ficticia, mas gravando em wallet, ledger, transacoes e licenca como no fluxo real.

Cada execucao pode ser repetida quantas vezes quiser (uso infinito para QA), sempre com novo evento de recarga e atualizacao do saldo.

### 1) Emitir licenca CLI (comando ja existente)

```bash
npm run admin:issue-cli-license -- --email "conta@dominio.com" --tier cli-pro
```

O que faz:

- procura a conta por email
- emite (ou reaproveita) uma licenca Hydra CLI/Cyber
- retorna o codigo da licenca no terminal

Opcoes principais:

- `--email` (obrigatorio)
- `--tier` (`cli-starter`, `cli-pro`, `cli-team`, `cli-enterprise`)
- `--status` (padrao: `active`)

### 2) Recarga ficticia para API (padrao 50.000 creditos)

```bash
npm run admin:test-api-credits -- --email "conta@dominio.com"
```

O que faz:

- credita `50000` na wallet da conta
- cria `paymentTransaction` de teste (status `paid`)
- cria `creditLedgerEntry` vinculado
- atualiza saldo em `creditWallet`

Opcoes principais:

- `--email` (obrigatorio)
- `--credits` (padrao: `50000`)
- `--amount-cents` (padrao: `0`, para manter como recarga ficticia)

### 3) Teste completo Cyber (licenca + recarga)

```bash
npm run admin:test-cyber -- --email "conta@dominio.com"
```

O que faz:

- garante licenca ativa para a conta (reaproveita se ja existir valida)
- adiciona recarga ficticia (padrao `50000` creditos)
- grava transacao/ledger/wallet para validar todo o fluxo do dashboard

Opcoes principais:

- `--email` (obrigatorio)
- `--tier` (padrao: `cli-pro`)
- `--credits` (padrao: `50000`)
- `--amount-cents` (padrao: `0`)
- `--force-new-license` (quando presente, cria nova licenca mesmo havendo uma ativa)

### 4) Teste completo CLI (licenca + recarga)

```bash
npm run admin:test-cli -- --email "conta@dominio.com"
```

O que faz:

- mesma ideia do comando Cyber, mas marcado como superficie CLI
- garante licenca + recarga ficticia para testes fim a fim

Opcoes principais:

- `--email` (obrigatorio)
- `--tier` (padrao: `cli-pro`)
- `--credits` (padrao: `50000`)
- `--amount-cents` (padrao: `0`)
- `--force-new-license`

### Exemplos rapidos

```bash
# API: colocar 50k creditos ficticios
npm run admin:test-api-credits -- --email "qa-api@hydra-ai.shop"

# Cyber: licenca + recarga, criando nova licenca sempre
npm run admin:test-cyber -- --email "qa-cyber@hydra-ai.shop" --force-new-license

# CLI: licenca enterprise + 120k creditos ficticios
npm run admin:test-cli -- --email "qa-cli@hydra-ai.shop" --tier cli-enterprise --credits 120000
```

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
