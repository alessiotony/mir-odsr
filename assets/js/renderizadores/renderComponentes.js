// assets/js/renderizadores/renderComponentes.js (VERSÃO CORRIGIDA)

import { criarCard } from '../utils/criarCard.js';
import { criarPillar } from '../utils/criarPillar.js';

export function renderizarPilares(pilares, container) {
    if (!container || !pilares) return;
    container.innerHTML = pilares.filter(p => p.id !== 'sobre').map(criarPillar).join('');
}

export function renderizarEstatisticas(stats, container) {
    if (!container || !stats) return;
    // CORREÇÃO: Removido o botão que causava o glitch e garantida a renderização correta.
    const statsHtml = stats.map(stat => `
        <div class="text-center">
            <i class="${stat.icon} fa-3x text-texto-sutil mb-3"></i>
            <p class="text-3xl font-bold text-texto-principal">${stat.value}</p>
            <p class="text-texto-secundario">${stat.label}</p>
        </div>
    `).join('');
    container.innerHTML = statsHtml;
}

export function renderizarPaineis(pilares, container) {
    if (!container || !pilares) return;
    container.innerHTML = '';
    
    pilares.forEach(pilar => {
        if (pilar.cards && pilar.cards.length > 0) {
            const secaoHtml = `
            <section id="${pilar.id}" class="content-section mb-16 scroll-mt-24">
                <h2 class="text-3xl font-bold text-texto-principal mb-6 border-l-4 border-primaria pl-2 flex items-center">
                    <i class="${pilar.icon} text-primaria"></i>
                    <span class="pl-2">${pilar.label}</span>
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-center">
                    ${pilar.cards.map(card => criarCard(card)).join('')}
                </div>
            </section>`;
            container.innerHTML += secaoHtml;
        }
    });
}