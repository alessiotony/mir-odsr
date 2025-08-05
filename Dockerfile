# 1. Use uma imagem oficial e leve do Nginx como base
FROM nginx:alpine

# 2. Copie a sua configuração personalizada do Nginx para dentro do container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 3. Copie todos os arquivos do seu site para a pasta pública do Nginx
COPY . /usr/share/nginx/html