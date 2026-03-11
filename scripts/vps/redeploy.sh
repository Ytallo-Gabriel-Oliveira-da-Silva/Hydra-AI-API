#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-$HOME/Hydra-AI-API}"
PM2_NAME="${PM2_NAME:-hydra-ai}"

cd "$APP_DIR"
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart "$PM2_NAME"
pm2 save

echo
echo "Deploy concluído."
pm2 status