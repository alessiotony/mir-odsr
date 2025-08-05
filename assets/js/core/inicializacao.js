// /assets/js/core/inicializacao.js (VERSÃO CORRIGIDA)

import { loadComponent } from '../utils/loadComponent.js';
import { renderizarHeader } from '../renderizadores/renderHeader.js';
import { renderizarHomepage } from '../renderizadores/renderHomepage.js';
import { renderizarPaginaDinamica } from '../renderizadores/renderPaginaDinamica.js';
import { renderizarPaginaIframe } from '../renderizadores/renderPaginaIframe.js';
// A importação defeituosa de 'renderizarComponentes' foi REMOVIDA daqui.

/**
 * Função principal que orquestra todo o carregamento da aplicação.
 */
export async function iniciarAplicacao() {
    try {
        const response = await fetch('/assets/dados.json');
        if (!response.ok) throw new Error('Falha ao carregar dados.json');
        const data = await response.json();

        // 1. Renderiza componentes comuns
        // A estrutura de dados do header foi ajustada para passar tudo que é necessário
        renderizarHeader({ logos: data.header.logos, pilares: data.pilares, navActions: data.header.navActions });
        await loadComponent('/components/footer.html', 'footer-placeholder');

        // 2. Lógica de Roteamento
        const path = window.location.pathname;
        const slug = path.substring(1);

        const iframePage = data.iframes.find(p => p.slug === slug);
        const dynamicPageData = data.pages.find(p => p[Object.keys(p)[0]][0].slug === slug);

        if (path === '/' || path.endsWith('/index.html')) {
            // A função renderizarHomepage já chama tudo que é necessário para a página inicial
            renderizarHomepage(data); 
        } else if (iframePage) {
            renderizarPaginaIframe(slug, data.iframes);
        } else if (dynamicPageData) {
            renderizarPaginaDinamica(slug, data.pages);
        } else {
            // Rota para página não encontrada
            const main = document.querySelector('main');
            if (main) main.innerHTML = `<div class="text-center py-20"><h1 class="text-3xl font-bold">Erro 404</h1><p>Página não encontrada.</p></div>`;
        }
        
        return true; // Sucesso na inicialização
    } catch (error) {
        console.error("Erro crítico na inicialização:", error);
        return false; // Falha na inicialização
    }
}