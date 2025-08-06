// /assets/js/renderizadores/renderHeader.js (VERSÃO CORRIGIDA)

export function renderizarHeader(headerData, isHomepage = false) {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    const { logos, pilares, navActions } = headerData;

    // 1. Gera HTML para os logos (sem alterações)
    const logosHtml = logos.map(logo => `
        <a href="${logo.href}" target="_blank" rel="noopener noreferrer">
            <img src="${logo.src}" alt="${logo.alt}" class="h-8 md:h-10 transition-opacity hover:opacity-80" onerror="this.onerror=null;this.src='https://placehold.co/110x40/cccccc/ffffff?text=${logo.alt}';">
        </a>
    `).join('');

    // 2. Gera HTML para os links de navegação (pilares)
    const sectionLinksHtml = pilares.map(link => `
        <a href="${link.href}" class="nav-link ${link.extraClass || ''}" aria-label="${link.label}">
            <i class="${link.icon} fa-xl pl-2 text-texto-contraste hover:text-primaria transition-colors"></i>
        </a>
    `).join('');
    
    // 3. Gera HTML para os links de ação (Home/Contato)
    const actionLinksHtml = navActions.map(link => `
        <a href="${link.href}" class="nav-link ${link.extraClass || ''}" aria-label="${link.label}">
            <i class="${link.icon} fa-xl text-texto-contraste hover:text-primaria transition-colors"></i>
        </a>
    `).join('');

    // **CORREÇÃO AQUI**: Combina corretamente os links para Desktop
    const desktopNavLinks = sectionLinksHtml + '<div class="w-px h-6 bg-gray-500 opacity-50 mx-2"></div>' + actionLinksHtml;

    // 4. Gera HTML para o menu mobile
    const mobileSectionLinks = pilares.map(link => `
        <a href="#${link.id}" class="nav-link text-texto-contraste hover:bg-gray-700 rounded-md px-3 py-2 font-medium flex items-center">
            <i class="${link.icon} fa-fw w-6 mr-2"></i> ${link.label}
        </a>
    `).join('');
    const mobileActionLinks = navActions.map(link => `
        <a href="${link.href}" class="nav-link text-texto-contraste hover:bg-gray-700 rounded-md px-3 py-2 font-medium flex items-center">
            <i class="${link.icon} fa-fw w-6 mr-2"></i> ${link.label}
        </a>
    `).join('');
    const mobileNavLinks = mobileActionLinks + '<hr class="my-2 border-gray-600">' + mobileSectionLinks;
    
    // Definição das classes do header
    let headerClass = "fixed top-0 left-0 right-0 shadow-md z-50";

    // Se for a homepage, adiciona bg-transparent. Caso contrário, bg-fundo-escuro.
    // A classe 'header-scrolled' será adicionada pelo JavaScript em `app.js`
    if (isHomepage) {
        headerClass += " bg-transparent";
    } else {
        headerClass += " bg-fundo-escuro";
    }
    
    // 5. Monta o HTML final do Header
    const headerHtml = `
        <header class="${headerClass}">
            <div class="container mx-auto px-4 sm:px-6">
                <div class="flex justify-between items-center py-2">
                    <div class="flex items-center space-x-4 flex-shrink-0">${logosHtml}</div>
                    <div class="md:hidden">
                        <button id="menu-button" type="button" class="inline-flex items-center justify-center p-2 rounded-md bg-gray-800 bg-opacity-50 text-white hover:bg-opacity-75 focus:outline-none" aria-controls="mobile-menu" aria-expanded="false" aria-label="Abrir menu principal">
                            <svg id="icon-open" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            <svg id="icon-close" class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <nav class="hidden md:flex md:items-center" id="desktop-nav">${desktopNavLinks}</nav>
                </div>
            </div>
            <div class="md:hidden hidden border-t border-gray-700 bg-fundo-escuro" id="mobile-menu">
                <nav class="px-2 pt-2 pb-3 flex flex-col space-y-1">${mobileNavLinks}</nav>
            </div>
        </header>`;

    placeholder.outerHTML = headerHtml;
}