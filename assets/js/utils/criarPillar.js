/**
 * Cria o HTML para um "pilar" de navegação na homepage.
 * @param {object} pillar - O objeto do pilar vindo do dados.json.
 * @returns {string} O HTML do pilar.
 */
export function criarPillar(pillar) {
    let href = pillar.href;

    // Só converte se for um caminho absoluto do site
    if (href.startsWith('/') && !href.startsWith('//')) {
        href = '.' + href; // força respeitar <base>
    }

    return `
        <a href="${href}" class="block p-4 rounded-lg hover:bg-fundo-medio transition-colors duration-300">
            <i class="${pillar.icon} fa-3x text-primaria mb-3"></i>
            <h3 class="text-lg font-semibold text-texto-principal">${pillar.label}</h3>
            <p class="text-texto-secundario mt-1 text-sm">${pillar.text}</p>
        </a>
    `;
}