#!/usr/bin/env bash
set -euo pipefail

echo "== PM2 =="
pm2 status || true

echo
echo "== PM2 logs (tail 80) =="
pm2 logs hydra-ai --lines 80 --nostream || true

echo
echo "== Nginx config test =="
sudo nginx -t || true

echo
echo "== Nginx status =="
sudo systemctl status nginx --no-pager || true

echo
echo "== Porta 3000 =="
ss -ltnp | grep ':3000' || true

echo
echo "== App health =="
curl -I -s http://127.0.0.1:3000 || true
