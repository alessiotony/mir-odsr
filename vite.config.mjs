// vite.config.mjs (VERSÃO COM O PLUGIN CORRIGIDO)

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

    // Plugin com a correção para ignorar os caminhos internos do Vite
    plugins: [
        {
            name: 'mpa-dev-server-rewrite',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const baseUrl = '/odsr/';

                    // ---> INÍCIO DA CORREÇÃO <---
                    // Ignora os pedidos internos do Vite para evitar o erro 404.
                    if (req.url.includes('/@vite/') || req.url.includes('/@fs/')) {
                        return next();
                    }
                    // ---> FIM DA CORREÇÃO <---

                    // A lógica de reescrita para as nossas páginas continua a mesma.
                    if (req.url.startsWith(baseUrl) && !req.url.includes('.')) {
                        const pageName = req.url.substring(baseUrl.length);
                        req.url = `${baseUrl}pages/${pageName}.html`;
                    }
                    next();
                });
            },
        },
    ],
});
