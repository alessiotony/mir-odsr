# Dockerfile (VERSÃO FINAL PARA PRODUÇÃO)

# --- ESTÁGIO 1: O "Builder" ---
# Usamos uma imagem do Node.js para instalar as dependências e rodar o build.
FROM node:20-alpine AS builder

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de definição de pacotes
COPY package.json package-lock.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o resto do código-fonte do projeto
COPY . .

# Roda o script de build para gerar a pasta /dist
RUN npm run build


# --- ESTÁGIO 2: O "Servidor" ---
# Começamos do zero com uma imagem leve do Nginx.
FROM nginx:alpine

# Copia a sua configuração do Nginx para o lugar certo dentro do container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia APENAS os arquivos otimizados da pasta /dist do estágio "builder"
# para a pasta raiz do Nginx.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta 80 para o Nginx
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]