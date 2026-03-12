# Hydra VPS Subdomains

Este guia assume uma unica aplicacao Next.js publicada em VPS, atendendo:

- `hydra-ai.shop`
- `api.hydra-ai.shop`
- `cli.hydra-ai.shop`

## Variaveis de ambiente

Use pelo menos esta base em producao:

```env
DATABASE_URL="file:./data.db"
NODE_ENV="production"
APP_URL="https://hydra-ai.shop"
SESSION_COOKIE_SECURE="true"
SESSION_COOKIE_DOMAIN=".hydra-ai.shop"
ASAAS_API_KEY="..."
ASAAS_ENVIRONMENT="production"
ASAAS_WEBHOOK_TOKEN="..."
```

`SESSION_COOKIE_DOMAIN=".hydra-ai.shop"` e o ponto critico para compartilhar login entre a landing, o API Panel e o CLI Panel.

## DNS

Crie registros `A` ou `CNAME` para os tres hosts apontando para a mesma VPS:

- `hydra-ai.shop`
- `api.hydra-ai.shop`
- `cli.hydra-ai.shop`

## Nginx

Exemplo de server block unico:

```nginx
server {
    server_name hydra-ai.shop api.hydra-ai.shop cli.hydra-ai.shop;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Com isso, a aplicacao consegue distinguir o host atual e redirecionar a raiz do subdominio para o painel correto.

## SSL

Depois de validar o proxy, emita certificado para os tres dominos com Certbot:

```bash
sudo certbot --nginx -d hydra-ai.shop -d api.hydra-ai.shop -d cli.hydra-ai.shop
```

## Banco e seed

Na VPS com SQLite, o caminho `file:./data.db` resolve para `prisma/data.db`.

Fluxo recomendado a cada deploy:

```bash
git pull origin main
npm ci
npx prisma migrate deploy
npm run db:seed
npm run build
pm2 restart hydra-ai --update-env
```

## Asaas

Configure no Asaas:

- webhook apontando para `https://hydra-ai.shop/api/billing/asaas/webhook`
- checkout/cartao para retorno nas rotas do proprio site principal
- ambiente `production` quando sair do sandbox

As compras dos paineis de API e CLI usam o mesmo backend, mas com produtos diferentes. O webhook e o endpoint de status fazem a liquidacao automatica do item correto.