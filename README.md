# Hydra AI API

Aplicacao Next.js com autenticacao, dashboard, planos, historico e rotas para chat, imagem, audio, busca e video.

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie seu arquivo de ambiente a partir de `.env.example`.

3. Rode as migrations e o seed local se necessario:

```bash
npx prisma migrate dev
npm run db:seed
```

4. Inicie o servidor:

```bash
npm run dev
```

## Variaveis de ambiente

Use `.env.example` como referencia. Em producao, configure essas variaveis no provedor de deploy:

- `DATABASE_URL`
- `GROQ_API_KEY`
- `GROQ_CHAT_MODEL`
- `GROQ_STT_MODEL`
- `STABILITY_API_KEY`
- `TAVILY_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `RUNWAY_API_KEY`
- `JWT_SECRET`
- `RESET_TOKEN_SECRET`

## Deploy na Vercel

Este projeto funciona bem na Vercel, mas nao com SQLite local em producao. O valor `file:./data.db` serve apenas para desenvolvimento local.

Antes de publicar:

1. Escolha um banco gerenciado compativel com Prisma.
2. Troque `DATABASE_URL` por uma conexao remota.
3. Rode as migrations nesse banco.
4. Configure as variaveis de ambiente na Vercel.

Guia recomendado: veja `docs/vercel-deploy.md`.

## Banco recomendado para Vercel

As opcoes mais simples para esse projeto sao:

- Vercel Postgres
- Neon
- Supabase Postgres
- Railway Postgres

Se voce quiser persistencia simples com latencia baixa e custo pequeno, eu recomendaria começar com Neon ou Vercel Postgres.
