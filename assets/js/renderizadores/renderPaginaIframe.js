// /assets/js/renderizadores/renderPaginaIframe.js

export function renderizarPaginaIframe(slug, iframesData) {
    const mainContent = document.querySelector('body'); // Renderiza no corpo todo
    if (!mainContent) return;

    const iframeInfo = iframesData.find(iframe => iframe.slug === slug);

    if (!iframeInfo) {
        mainContent.innerHTML = '<p class="text-center text-red-500">Painel não encontrado.</p>';
        return;
    }

    // Esconde a hero-section e outras seções se existirem
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) heroSection.style.display = 'none';
    
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.style.display = 'none';

    // Cria o iframe e o anexa ao body
    const iframeHtml = `
        <div class="w-full h-screen pt-16"> <iframe src="${iframeInfo.url}" class="w-full h-full border-0" title="Painel Interativo"></iframe>
        </div>
    `;
    
    mainContent.innerHTML += iframeHtml;
}