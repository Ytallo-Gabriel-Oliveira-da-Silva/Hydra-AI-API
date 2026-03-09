# Deploy na Vercel

## Resumo direto

Voce pode publicar o frontend e as rotas API desse projeto na Vercel, mas nao deve usar SQLite em producao. Na Vercel, o filesystem nao e persistente, entao `DATABASE_URL="file:./data.db"` vai quebrar a persistencia.

Para publicar com seguranca, use um banco Postgres gerenciado e configure as variaveis de ambiente no painel da Vercel.

## O que ja esta pronto

- Projeto em Next.js
- Build de producao funcionando
- `.env` fora do repositorio
- `.env.example` pronto como modelo
- Prisma configurado

## O que voce precisa antes do deploy

1. Uma conta na Vercel.
2. Um banco remoto compativel com Prisma.
3. As chaves dos providers que pretende usar em producao.

## Banco recomendado

Para este projeto, use Postgres. As melhores opcoes para comecar sao:

1. Vercel Postgres
2. Neon
3. Supabase
4. Railway

Se voce quer o caminho mais simples com Vercel, Vercel Postgres ou Neon sao as escolhas mais diretas.

## Ajuste necessario no banco

Hoje o schema Prisma usa SQLite no datasource. Para producao na Vercel, o ideal e migrar para Postgres.

Trecho atual em `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Para producao com Postgres, esse provider precisa virar `postgresql`.

## Variaveis de ambiente na Vercel

Configure no projeto da Vercel:

```env
DATABASE_URL=
GROQ_API_KEY=
GROQ_CHAT_MODEL=llama-3.3-70b-versatile
GROQ_STT_MODEL=whisper-large-v3-turbo
STABILITY_API_KEY=
TAVILY_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
RUNWAY_API_KEY=
JWT_SECRET=
RESET_TOKEN_SECRET=
NODE_ENV=production
```

## Passo a passo de deploy

1. Entre em https://vercel.com/new.
2. Importe o repositorio `Hydra-AI-API`.
3. No primeiro deploy, nao use SQLite local.
4. Configure `DATABASE_URL` apontando para um banco remoto.
5. Configure as demais variaveis do `.env.example`.
6. Deixe o comando de build padrao da aplicacao.
7. Conclua o deploy.

## Migrations

Com banco remoto, voce deve aplicar as migrations no banco de producao.

Fluxo recomendado:

```bash
npx prisma migrate deploy
```

Voce pode rodar isso localmente apontando para o banco remoto, ou configurar um pipeline/deploy step depois.

## O que vai falhar se publicar do jeito atual

Se subir exatamente como esta hoje, sem trocar o banco:

- login e cadastro podem ate funcionar temporariamente
- dados nao vao persistir com confianca
- sessoes, historico, planos e configuracoes podem sumir
- qualquer reinicio de funcao pode invalidar o estado

Em outras palavras: para teste visual, a Vercel serve; para operacao real, voce precisa do banco remoto primeiro.

## Melhor estrategia para voce agora

1. Criar o projeto na Vercel.
2. Escolher o banco.
3. Eu ajusto o Prisma de SQLite para Postgres.
4. Configuramos as variaveis de ambiente.
5. Rodamos as migrations.
6. Fazemos o primeiro deploy valido.

## Sobre o Asaas

Sua ideia faz sentido: primeiro publique, depois use a URL publica para configurar webhook e credenciais do Asaas.

Mas para isso valer em producao, o projeto precisa estar com banco remoto antes.