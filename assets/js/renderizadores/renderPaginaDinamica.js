// js/renderizadores/renderPaginaDinamica.js

import { criarCard } from '../utils/criarCard.js';

export function renderizarPaginaDinamica(slug, pagesData) {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    let pageInfo = null;
    let pageKey = null;

    // Encontra os dados da página correta baseada no slug
    for (const page of pagesData) {
        const key = Object.keys(page)[0];
        if (page[key][0].slug === slug) {
            pageInfo = page[key];
            pageKey = key;
            break;
        }
    }

    if (!pageInfo) {
        mainContent.innerHTML = '<p class="text-center text-red-500">Página não encontrada.</p>';
        return;
    }

    const headerInfo = pageInfo[0];
    const cards = pageInfo.slice(1);

    const cardsHtml = cards.map(card => criarCard(card)).join('');

    mainContent.innerHTML = `
        <section class="container mx-auto px-6 py-16">
            <div class="text-center mb-12">
                <i class="${headerInfo.icon} fa-3x text-primaria mb-4"></i>
                <h1 class="text-4xl font-bold text-texto-principal">${pageKey}</h1>
                <p class="mt-2 text-lg text-texto-secundario max-w-3xl mx-auto">${headerInfo.text}</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${headerInfo.cols || 3} gap-6">
                ${cardsHtml}
            </div>
        </section>
    `;
}