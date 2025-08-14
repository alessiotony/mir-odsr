/**
 * Cria o HTML para um "pilar" de navegação na homepage.
 * @param {object} pillar - O objeto do pilar vindo do dados.json.
 * @returns {string} O HTML do pilar.
 */
// Em /utils/criarPillar.js

/**
 * Cria o HTML para um "pilar" de navegação na homepage.
 * @param {object} pillar - O objeto do pilar vindo do dados.json.
 * @returns {string} O HTML do pilar.
 */
export function criarPillar(pillar) {
    const href = pillar.href;

    let iconeHTML = '';
    if (pillar.icon_type === 'svg') {
        const style = `--mask-image: url(${pillar.icon})`;
        iconeHTML = `<div class="icone-svg mb-0" style="${style}" role="img" aria-label="${pillar.label}"></div>`;
    } else {
        iconeHTML = `<i class="${pillar.icon} fa-3x text-primaria mb-3" aria-hidden="true"></i>`;
    }

    // ALTERE A LINHA ABAIXO, ADICIONANDO AS CLASSES DE FLEXBOX E CENTRALIZAÇÃO
    return `
        <a href="${href}" class="block p-4 rounded-lg hover:bg-fundo-medio transition-colors duration-300 flex flex-col items-center text-center">
            ${iconeHTML}
            <h3 class="text-lg font-semibold text-texto-principal">${pillar.label}</h3>
            <p class="text-texto-secundario mt-1 text-sm">${pillar.text}</p>
        </a>
    `;
}