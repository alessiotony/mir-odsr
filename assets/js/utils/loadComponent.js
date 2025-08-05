// /assets/js/utils/loadComponent.js

/**
 * Carrega um componente HTML estático (como o footer) e o injeta na página.
 * @param {string} componentPath - Caminho para o arquivo HTML.
 * @param {string} targetId - ID do elemento placeholder.
 */
export async function loadComponent(componentPath, targetId) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Erro ao carregar: ${response.statusText}`);
        const text = await response.text();
        const targetElement = document.getElementById(targetId);
        
        // Usa outerHTML para substituir o placeholder, resultando em um DOM mais limpo.
        if (targetElement) {
            targetElement.outerHTML = text;
        }
    } catch (error) {
        console.error(`Falha ao carregar componente '${componentPath}':`, error);
    }
}