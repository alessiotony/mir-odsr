#!/bin/bash
# chmod +x /var/www/html/odsr/auto_deploy.sh
# crontab -e
# */5 * * * * /var/www/html/odsr/auto_deploy.sh >> /var/log/auto_deploy.log 2>&1

set -e

echo ">>> Acessando o diretório do projeto..."
cd /var/www/html/odsr || exit

echo ">>> Buscando atualizações do Git (com reset)..."
git fetch origin main
git reset --hard origin/main

echo ">>> Construindo nova imagem Docker..."
docker build -t odsr-app .

echo ">>> Parando e removendo container antigo (se existir)..."
docker stop odsr || true
docker rm odsr || true

echo ">>> Iniciando novo container..."
docker run -d -p 8081:80 --name odsr --restart always odsr-app

echo ">>> Deploy concluído com sucesso!"