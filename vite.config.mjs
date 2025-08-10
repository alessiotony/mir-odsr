// vite.config.mjs (VERSÃO PROFISSIONAL E DEFINITIVA)

import { resolve } from 'path';
import { defineConfig } from 'vite';
import { globSync } from 'glob';

// Encontra todos os arquivos HTML dentro de 'pages' para o build
const pageInputs = globSync('pages/**/*.html').reduce((acc, path) => {
    const name = path.replace('pages/', '').replace('.html', '');
    acc[name] = resolve(__dirname, path);
    return acc;
}, {});

export default defineConfig({
    // A base para o deploy em subdiretório
    base: '/odsr/',

    // Configuração para o build de produção
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                ...pageInputs
            },
        },
    },

    // A MÁGICA PARA O SERVIDOR DE DESENVOLVIMENTO
    plugins: [
        {
            name: 'mpa-dev-server-rewrite',
            configureServer(server) {
                // Adiciona um middleware que roda antes de todos os outros
                server.middlewares.use((req, res, next) => {
                    const baseUrl = '/odsr/';
                    // Verifica se a URL começa com a base e não é um arquivo (não tem '.')
                    if (req.url.startsWith(baseUrl) && !req.url.includes('.')) {
                        // Constrói o caminho para o arquivo HTML correspondente
                        const pageName = req.url.substring(baseUrl.length);
                        req.url = `${baseUrl}pages/${pageName}.html`;
                    }
                    next(); // Passa a requisição (modificada ou não) para o próximo middleware
                });
            },
        },
    ],
});