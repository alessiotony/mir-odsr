/**
 * Cria o HTML para um card de painel.
 * @param {object} cardData - O objeto do painel vindo do dados.json.
 * @returns {string} O HTML do card.
 */
export function criarCard(cardData) {
    // Links externos abrem em nova aba, links internos não.
    const isExternal = cardData.url.startsWith('http');
    const target = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';

    return `
        <a href="${cardData.url}" class="card block bg-white rounded-lg shadow-md overflow-hidden group h-full" ${target}>
            <div class="p-5 flex flex-col items-center justify-center text-center h-full group-hover:bg-gray-100 transition-colors duration-300">
                <i class="${cardData.cardIcon} fa-3x text-primaria mb-4"></i>
                <h4 class="text-lg font-semibold text-texto-principal leading-tight">${cardData.title}</h4>
                <p class="text-sm text-texto-secundario mt-1">Fonte: ${cardData.source}</p>
            </div>
        </a>
    `;
}