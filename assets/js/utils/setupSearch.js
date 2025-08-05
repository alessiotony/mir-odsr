// /assets/js/utils/setupSearch.js

export function setupSearch(data) {
    const searchInput = document.getElementById('search-input');
    const noResultsMessage = document.getElementById('no-results-message');
    if (!searchInput || !noResultsMessage) return;

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const handleSearch = debounce((event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        const allSections = document.querySelectorAll('.content-section');
        let totalVisibleCards = 0;
        
        allSections.forEach(section => {
            const sectionTitle = section.querySelector('h3 span').textContent.toLowerCase();
            const cards = section.querySelectorAll('.card');
            let sectionHasVisibleCards = false;

            cards.forEach(card => {
                const cardTitle = card.querySelector('h4').textContent.toLowerCase();
                const cardSource = card.querySelector('h5').textContent.toLowerCase();
                const isVisible = cardTitle.includes(searchTerm) || sectionTitle.includes(searchTerm) || cardSource.includes(searchTerm);
                card.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    sectionHasVisibleCards = true;
                    totalVisibleCards++;
                }
            });
            section.style.display = sectionHasVisibleCards ? '' : 'none';
        });
        noResultsMessage.style.display = totalVisibleCards === 0 ? 'block' : 'none';
    }, 300);

    searchInput.addEventListener('keyup', handleSearch);
}