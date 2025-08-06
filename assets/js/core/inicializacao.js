// /assets/js/core/inicializacao.js

// REMOVIDO: import { initMap } from '../map.js';
import { loadComponent } from '../utils/loadComponent.js';
import { renderizarHeader } from '../renderizadores/renderHeader.js';
import { renderizarHomepage } from '../renderizadores/renderHomepage.js';
import { renderizarPaginaDinamica } from '../renderizadores/renderPaginaDinamica.js';
import { renderizarPaginaIframe } from '../renderizadores/renderPaginaIframe.js';
import { renderizarSintese } from '../renderizadores/renderSintese.js';

/**
 * Função dedicada a carregar e renderizar a seção de síntese.
 */
async function carregarSintese() {
    if (!document.getElementById('sintese-grafica')) {
        return;
    }
    try {
        const response = await fetch('/assets/dados_sintese.json');
        if (!response.ok) throw new Error('Falha ao carregar dados_sintese.json');
        const data = await response.json();
        
        if (data.sintese) {
            renderizarSintese(data.sintese);
        }
    } catch (error) {
        console.error("Erro ao carregar dados de síntese:", error);
    }
}

/**
 * Função principal que orquestra todo o carregamento da aplicação.
 */
export async function iniciarAplicacao() {
    try {
        const response = await fetch('/assets/dados.json');
        if (!response.ok) throw new Error('Falha ao carregar dados.json');
        const data = await response.json();

        carregarSintese();

        const path = window.location.pathname;
        const isHomepage = (path === '/' || path.endsWith('/index.html'));

        renderizarHeader({ logos: data.header.logos, pilares: data.pilares, 
            navActions: data.header.navActions }, isHomepage);
        await loadComponent('/components/footer.html', 'footer-placeholder');

        const slug = path.substring(1).replace('.html', '');
        const iframePage = data.iframes.find(p => p.slug === slug);
        const dynamicPageData = data.pages.find(p => p[Object.keys(p)[0]][0].slug === slug);

        if (isHomepage) {
            renderizarHomepage(data); 
        } else if (iframePage) {
            renderizarPaginaIframe(slug, data.iframes);
        } else if (dynamicPageData) {
            renderizarPaginaDinamica(slug, data.pages);
        } else if (path.includes('/mapa')) {
            // CORRETO: Nenhuma ação é tomada aqui.
            // A inicialização do mapa é 100% delegada para o app.js,
            // que já está ouvindo o evento DOMContentLoaded.
            console.log("Página de mapa detectada. app.js cuidará da inicialização.");
        } else {
            const main = document.querySelector('main');
            if (main) main.innerHTML = `<div class="text-center py-20"><h1 class="text-3xl font-bold">Erro 404</h1><p>Página não encontrada.</p></div>`;
        }
        
        return true; 
    } catch (error) {
        console.error("Erro crítico na inicialização:", error);
        return false; 
    }
}