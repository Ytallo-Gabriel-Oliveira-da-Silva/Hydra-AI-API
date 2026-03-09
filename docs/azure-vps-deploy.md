# Deploy na VPS Ubuntu da Azure

## Quando esta estrategia faz sentido

Esta e a melhor opcao se voce quer publicar o projeto agora sem migrar o banco para Postgres. Com uma VPS Ubuntu, o arquivo SQLite fica salvo no disco da maquina e o app pode rodar de forma estavel em uma unica instancia.

Este caminho e bom para:

- publicar rapido
- manter `DATABASE_URL` com SQLite
- ter uma URL publica para integrar o Asaas depois

Este caminho nao e bom para:

- escalar em varias instancias
- trafego alto com muita concorrencia
- arquitetura serverless

## Arquitetura recomendada

- Ubuntu Server na Azure
- Node.js 22 LTS
- Nginx como proxy reverso
- PM2 para manter o processo no ar
- Certbot para HTTPS
- SQLite salvo no disco da VPS

## Portas que precisam estar liberadas

No Azure e no servidor, garanta acesso para:

- `22` para SSH
- `80` para HTTP
- `443` para HTTPS

Se estiver usando NSG na Azure, abra essas regras nele tambem.

## 1. Acesse a VPS

```bash
ssh usuario@IP_DA_VPS
```

## 2. Atualize o sistema e instale dependencias basicas

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential unzip
```

## 3. Instale Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 4. Instale PM2 globalmente

```bash
sudo npm install -g pm2
pm2 -v
```

## 5. Baixe o projeto na VPS

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/Ytallo-Gabriel-Oliveira-da-Silva/Hydra-AI-API.git
cd Hydra-AI-API
```

Se o repositorio for privado, use a URL autenticada por SSH ou token.

## 6. Crie o arquivo de ambiente

```bash
cp .env.example .env
```

Edite o arquivo:

```bash
nano .env
```

Configuracao recomendada para usar SQLite na VPS:

```env
DATABASE_URL="file:./data.db"
NODE_ENV="production"
SESSION_COOKIE_SECURE="false"
GROQ_API_KEY=""
GROQ_CHAT_MODEL="llama-3.3-70b-versatile"
GROQ_STT_MODEL="whisper-large-v3-turbo"
STABILITY_API_KEY=""
TAVILY_API_KEY=""
ELEVENLABS_API_KEY=""
ELEVENLABS_VOICE_ID=""
RUNWAY_API_KEY=""
JWT_SECRET="troque-por-um-segredo-longo"
RESET_TOKEN_SECRET="troque-por-outro-segredo-longo"
```

Enquanto voce estiver acessando apenas por IP e HTTP, `SESSION_COOKIE_SECURE="false"` e necessario para login e cadastro funcionarem no navegador. Assim que configurar dominio com HTTPS, troque para `SESSION_COOKIE_SECURE="true"` e reinicie a aplicacao.

Observacao importante: com o schema atual, `file:./data.db` vai criar o banco em `prisma/data.db`, porque o caminho e resolvido a partir de [prisma/schema.prisma](prisma/schema.prisma).

## 7. Instale dependencias, gere o Prisma Client e build

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Se voce quiser popular dados iniciais:

```bash
npm run db:seed
```

## 8. Suba a aplicacao com PM2

```bash
pm2 start npm --name hydra-ai -- start
pm2 save
pm2 startup
```

O comando `pm2 startup` vai te devolver um comando adicional com `sudo`. Execute exatamente o que ele mostrar.

## 9. Configure o Nginx

Crie a configuracao:

```bash
sudo nano /etc/nginx/sites-available/hydra-ai
```

Conteudo sugerido:

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative a configuracao:

```bash
sudo ln -s /etc/nginx/sites-available/hydra-ai /etc/nginx/sites-enabled/hydra-ai
sudo nginx -t
sudo systemctl restart nginx
```

Se a pagina padrao do Nginx continuar aparecendo, remova o default:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 10. Ative HTTPS com Certbot

Instale o Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Gere o certificado:

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Teste a renovacao automatica:

```bash
sudo certbot renew --dry-run
```

## 11. Comandos uteis de operacao

Ver status da aplicacao:

```bash
pm2 status
pm2 logs hydra-ai
```

Reiniciar apos alteracao:

```bash
pm2 restart hydra-ai --update-env
```

Ver status do Nginx:

```bash
sudo systemctl status nginx
```

## 12. Como atualizar o projeto depois

Sempre que fizer push para o GitHub:

```bash
cd /var/www/Hydra-AI-API
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
pm2 restart hydra-ai
```

## 13. Backup do SQLite

Com a configuracao atual, o arquivo principal do banco tende a ficar em:

- `/var/www/Hydra-AI-API/prisma/data.db`

Faca backup regular desse arquivo.

Exemplo manual:

```bash
mkdir -p /var/backups/hydra-ai
cp /var/www/Hydra-AI-API/prisma/data.db /var/backups/hydra-ai/data-$(date +%F-%H%M%S).db
```

Se quiser automatizar, use `cron`.

## 14. Observacoes importantes

- rode apenas uma instancia do app com SQLite
- nao use load balancer com varias instancias escrevendo no mesmo banco SQLite
- mantenha os segredos apenas no `.env` da VPS
- se for integrar Asaas, faca isso depois que o dominio e o HTTPS estiverem funcionando

## Checklist final

Antes de considerar o deploy pronto, confirme:

- dominio apontando para a VPS
- Nginx ativo
- HTTPS funcionando
- `pm2 status` com app online
- `.env` configurado
- `npm run build` sem erro
- login funcionando
- banco SQLite persistido em disco

## Proximo passo recomendado

Depois que a VPS estiver no ar, o proximo passo natural e configurar o dominio publico e então integrar o Asaas usando a URL HTTPS final.