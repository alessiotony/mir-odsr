// js/map.js (VERSÃO FINAL CORRIGIDA)

export class MapController {
    constructor(containerId) {
        // O CONSTRUCTOR AGORA NÃO TOCA NO DOM.
        // Ele apenas configura o estado inicial e prepara as variáveis.
        this.containerId = containerId;
        this.map = null;
        this.geoJsonLayer = null;
        this.allIndicatorData = null;
        this.geoJsonCache = {};
        this.selectors = {}; // Será preenchido no init()
        this.state = {};     // Será preenchido no init()
        this.gridInstance = null; // Para guardar a instância da tabela
        console.log("MapController construído em memória.");
    }

    // INIT É AGORA O RESPONSÁVEL POR INTERAGIR COM O DOM E INICIAR O MAPA.
    init() {
        console.log("MapController.init() chamado. Procurando elementos do DOM...");

        // PASSO 1: Encontrar todos os elementos do DOM.
        this.selectors = {
            uf: document.getElementById('uf-selector'),
            year: document.getElementById('ano-selector'),
            loader: document.getElementById('map-loader'),
            title: document.getElementById('map-title'),
            subtitle: document.getElementById('map-subtitle'),
            legend: document.getElementById('map-legend'),
            // NOVO: Seletores para o modal e botão
            openTableBtn: document.getElementById('open-table-modal-btn'),
            tableModal: document.getElementById('table-modal'),
            closeTableBtn: document.getElementById('close-table-modal-btn'),
            tableWrapper: document.getElementById('table-wrapper'),
            modalSubtitle: document.getElementById('modal-table-subtitle')
        };

        // PASSO 2: Verificação de segurança (Guard Clause).
        // Se os elementos essenciais não existirem, paramos com um erro claro.
        if (!this.selectors.uf || !this.selectors.year) {
            console.error("ERRO CRÍTICO: Elementos de filtro (#uf-selector ou #ano-selector) não foram encontrados no DOM. O mapa não pode ser inicializado.");
            alert("Erro: não foi possível encontrar os filtros na página para iniciar o mapa.");
            return; // Interrompe a inicialização.
        }
        
        console.log("Elementos do DOM encontrados com sucesso.");

        // PASSO 3: Configurar o estado inicial usando os valores dos seletores.
        this.state = {
            uf: this.selectors.uf.value,
            year: this.selectors.year.value
        };

        // PASSO 4: Criar o mapa e o restante da lógica.
        this.map = L.map(this.containerId, {
            fullscreenControl: true,
            fullscreenControlOptions: { position: 'topleft' }
        }).setView([-14.235, -51.925], 4);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd', maxZoom: 19
        }).addTo(this.map);

        // L.easyPrint({
        //     title: 'Imprimir ou exportar mapa',
        //     position: 'topright',
        //     sizeModes: ['A4Portrait', 'A4Landscape', 'CurrentSize']
        // }).addTo(this.map);

        this.addEventListeners();
        this.renderLegend();
        this.updateMap(); // Carga inicial
    }

    addEventListeners() {
        this.selectors.uf.addEventListener('change', (e) => {
            this.state.uf = e.target.value;
            this.updateMap();
        });

        this.selectors.year.addEventListener('change', (e) => {
            this.state.year = e.target.value;
            this.updateMap();
        });

        // NOVO: Listeners para abrir e fechar o modal
        this.selectors.openTableBtn.addEventListener('click', () => {
            this.selectors.tableModal.classList.remove('hidden');
            this.selectors.tableModal.classList.add('flex');
        });

        this.selectors.closeTableBtn.addEventListener('click', () => {
            this.selectors.tableModal.classList.add('hidden');
            this.selectors.tableModal.classList.remove('flex');
        });
    }

    async updateMap() {
        this.toggleLoader(true);
        try {
            const indicatorData = await this.getIndicatorData();
            const geoJsonData = await this.getGeoJson();            

            if (this.geoJsonLayer) {
                this.map.removeLayer(this.geoJsonLayer);
            }

            this.geoJsonLayer = L.geoJson(geoJsonData, {
                style: (feature) => this.styleFeature(feature, indicatorData),
                onEachFeature: (feature, layer) => this.onEachFeature(feature, layer, indicatorData)
            }).addTo(this.map);

            if (this.geoJsonLayer.getBounds().isValid()) {
                this.map.fitBounds(this.geoJsonLayer.getBounds());
            }
            this.updateSubtitle();
            this.renderTable(indicatorData);
        } catch (error) {
            console.error("Falha ao atualizar o mapa:", error);
            alert("Não foi possível carregar os dados para a seleção atual. Verifique o console para mais detalhes.");
        } finally {
            this.toggleLoader(false);
        }
    }

    renderTable(data) {
        // Limpa a tabela anterior se ela já existir
        if (this.gridInstance) {
            this.gridInstance.destroy();
        }
        this.selectors.tableWrapper.innerHTML = '';

        // Prepara os dados, garantindo que o nome da localidade exista
        const tableData = data.map(item => ({
            ano: this.state.year,
            localidade: item.nome || `Código ${item.codigo_mun || item.codigo_uf}`,
            alerta: this.getAlerta(item.valor),
            valor: item.valor
        }));

        this.gridInstance = new gridjs.Grid({
            columns: [
                { id: 'ano', name: 'Ano' },
                { id: 'localidade', name: 'Localidade' },
                { id: 'alerta', name: 'Alerta' },
                { 
                    id: 'valor', 
                    name: 'Valor',
                    formatter: (cell) => cell.toFixed(2) // Formata o valor para 2 casas decimais
                }
            ],
            data: tableData,
            search: {
                enabled: true,
                placeholder: 'Pesquisar...'
            },
            sort: true,
            pagination: {
                enabled: true,
                limit: 10
            },
            language: {
                'search': {
                    'placeholder': '🔍 Pesquisar...'
                },
                'pagination': {
                    'previous': 'Anterior',
                    'next': 'Próxima',
                    'showing': 'Mostrando',
                    'results': () => 'resultados',
                    'to': 'a',
                    'of': 'de'
                }
            },
            // Ativa o plugin de download CSV
            // Note que o nome do arquivo será 'data.csv' por padrão
            // Para customizar o nome do arquivo, veja a documentação do Grid.js
            csv: true,
            style: {
                table: { 'font-size': '14px' },
                th: { 'background-color': '#f8f9fa' }
            }
        }).render(this.selectors.tableWrapper);

        // Atualiza o subtítulo do modal
        const ufText = this.selectors.uf.options[this.selectors.uf.selectedIndex].text;
        this.selectors.modalSubtitle.textContent = `${ufText} - Ano de ${this.state.year}`;
    }

    // NOVO: Função auxiliar para obter a classificação do alerta
    getAlerta(value) {
        if (value === null || value === undefined) return 'N/D';
        if (value > 4) return 'Muito alto'; // Ajuste conforme sua necessidade
        if (value > 3) return 'Alto';
        if (value > 2.5) return 'Intermediário';
        if (value > 2) return 'Baixo';
        return 'Muito baixo';
    }
    
    // ... (O restante das funções: getIndicatorData, getGeoJson, getColor, etc. permanecem iguais) ...
    async getIndicatorData() {
        if (!this.allIndicatorData) {
            const response = await fetch('assets/mapa_dados.json');
            if (!response.ok) throw new Error('Falha ao carregar mapa_dados.json');
            this.allIndicatorData = await response.json();
        }
        const dataForYear = this.allIndicatorData[this.state.year];
        if (!dataForYear) return [];

        return this.state.uf === 'br' ? dataForYear.estados : (dataForYear.municipios?.[this.state.uf] || []);
    }

    async getGeoJson() {
        const path = this.state.uf === 'br' ? 'maps/brazil-states.json' : `maps/${this.state.uf}-municipalities.json`;
        if (!this.geoJsonCache[path]) {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Falha ao carregar geometria de ${path}`);
            this.geoJsonCache[path] = await response.json();
        }
        return this.geoJsonCache[path];
    }

    getColor(value) {
        if (value === null || value === undefined) return '#CCCCCC'; // Cor para dados ausentes
        if (value > 4) return '#2ca02c'; // Verde escuro
        if (value > 3) return '#98df8a'; // Verde claro
        if (value > 2) return '#ff9896'; // Vermelho claro
        return '#d62728'; // Vermelho escuro
    }

    styleFeature(feature, data) {
        const code = feature.properties.CD_MUN || feature.properties.CD_UF;
        const entry = data.find(d => (d.codigo_uf == code || d.codigo_mun == code));
        const value = entry ? entry.valor : null;
        return {
            fillColor: this.getColor(value),
            weight: 1, opacity: 1, color: 'white', fillOpacity: 0.8
        };
    }

    onEachFeature(feature, layer, data) {
        layer.on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 3, color: '#666' });
                l.bringToFront();
            },
            mouseout: (e) => { this.geoJsonLayer.resetStyle(e.target); },
            click: (e) => {
                const props = e.target.feature.properties;
                const code = props.CD_MUN || props.CD_UF;
                const entry = data.find(d => (d.codigo_uf == code || d.codigo_mun == code));
                const value = entry ? entry.valor.toFixed(2) : 'N/D';
                const popupContent = `<b>${props.NM_MUN || props.NM_UF}</b><br>Índice: ${value}`;
                L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(this.map);
            }
        });
    }
    
    toggleLoader(show) {
        if(this.selectors.loader) {
            this.selectors.loader.style.display = show ? 'flex' : 'none';
        }
    }

    updateSubtitle() {
        if(this.selectors.subtitle && this.selectors.uf) {
            const ufText = this.selectors.uf.options[this.selectors.uf.selectedIndex].text;
            this.selectors.subtitle.textContent = `${ufText} - Ano de ${this.state.year}`;
        }
    }

    renderLegend() {
        if(this.selectors.legend) {
            const legendContainer = this.selectors.legend;
            const grades = {
                '#d62728': '0 - 2 (Muito Baixo)', '#ff9896': '2 - 3 (Baixo)',
                '#98df8a': '3 - 4 (Médio)', '#2ca02c': '> 4 (Alto)',
                '#CCCCCC': 'N/D (Sem dados)'
            };
            let legendHtml = '<h4 class="font-semibold mb-1">Legenda do Índice</h4><div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">';
            for (const color in grades) {
                legendHtml += `<div class="flex items-center"><i class="w-4 h-4 mr-1.5" style="background:${color}; border: 1px solid #CCC;"></i><span>${grades[color]}</span></div>`;
            }
            legendHtml += '</div>';
            legendContainer.innerHTML = legendHtml;
        }
    }
}