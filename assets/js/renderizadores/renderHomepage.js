// assets/js/renderizadores/renderHomepage.js

import { renderizarEstatisticas, renderizarPaineis, renderizarPilares } from './renderComponentes.js';

export function renderizarHomepage(data) {
    renderizarPilares(data.pilares, document.getElementById('pillars-container'));
    renderizarEstatisticas(data.estatisticas, document.getElementById('stats-container'));
    renderizarPaineis(data.pilares, document.getElementById('paineis-container'));
}