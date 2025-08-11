// js/map.js - Versão Final Corrigida

export class MapController {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.geoJsonLayer = null;
        // ATENÇÃO: Renomeado para refletir que armazena os dados do mapa, não todos os dados
        this.indicatorMapData = null; 
        this.searchControl = null;
        this.geoJsonCache = {};
        this.selectors = {};
        this.state = {};
        this.indicatorMetadata = {}; 
        this.gridInstance = null;
        this.indicatorChoice = null;
        console.log("MapController construído.");
    }

    async init() {
        console.log("Iniciando MapController...");

        this.selectors = {
            uf: document.getElementById('uf-selector'),
            year: document.getElementById('ano-selector'),
            indicator: document.getElementById('indicador-selector'),
            loader: document.getElementById('map-loader'),
            title: document.getElementById('map-title'),
            subtitle: document.getElementById('map-subtitle'),
            legend: document.getElementById('map-legend'),
            openTableBtn: document.getElementById('open-table-modal-btn'),
            tableModal: document.getElementById('table-modal'),
            closeTableBtn: document.getElementById('close-table-modal-btn'),
            tableWrapper: document.getElementById('table-wrapper'),
            modalSubtitle: document.getElementById('modal-table-subtitle'),
            valorMaximo: document.getElementById('valor-maximo'),
            valorMedio: document.getElementById('valor-medio'),
            valorMinimo: document.getElementById('valor-minimo'),
            downloadBtn: document.getElementById('download-csv-btn'),
            limparFiltrosBtn: document.getElementById('limpar-filtros-btn'),
            // Adicione os novos seletores do modal de metadados
            infoBtn: document.getElementById('info-indicador-btn'),
            metadataModal: document.getElementById('metadata-modal'),
            closeMetadataBtn: document.getElementById('close-metadata-modal-btn'),
            metadataNome: document.getElementById('metadata-nome'),
            metadataDescricao: document.getElementById('metadata-descricao'),
            metadataFonte: document.getElementById('metadata-fonte')
        };

        if (!this.selectors.uf || !this.selectors.year || !this.selectors.indicator) {
            console.error("ERRO CRÍTICO: Elementos de filtro essenciais não foram encontrados.");
            return;
        }

        this.map = L.map(this.containerId).setView([-14.235, -51.925], 4);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.addEventListeners();
        this.renderLegend();
        
        await this.populateInitialFilters();
    }
    
    // Este método agora é específico para carregar os dados do mapa
    async loadIndicatorMapData() {
        try {
            // Em produção, a URL aqui seria dinâmica, ex: `/api/dados?indicador=...&ano=...`
            const response = await fetch('./data/mapa_dados.json');
            if (!response.ok) throw new Error('Falha ao carregar mapa_dados.json');
            this.indicatorMapData = await response.json();
            console.log("Dados do mapa carregados.");
        } catch (error) {
            console.error("Erro ao carregar dados do mapa:", error);
            alert("Não foi possível carregar os dados do mapa.");
            this.indicatorMapData = []; // Garante que não quebre
        }
    }
    
    async populateInitialFilters() {
        try {
            // Popula Indicadores
            const indicadoresRes = await fetch('./data/filtro_indicadores.json');
            const indicadores = await indicadoresRes.json();

            // Limpa o seletor e o objeto de metadados
            this.selectors.indicator.innerHTML = '';
            this.indicatorMetadata = {}; 

            indicadores.forEach(ind => {
                // Adiciona ao seletor
                const option = document.createElement('option');
                option.value = ind.id;
                option.textContent = ind.nome;
                this.selectors.indicator.appendChild(option);

                // Armazena os metadados em um objeto para acesso rápido
                this.indicatorMetadata[ind.id] = {
                    nome: ind.nome,
                    descricao: ind.descricao,
                    fonte: ind.fonte
                };
                if (this.indicatorChoice) {
                    this.indicatorChoice.destroy();
                }

                // INICIA O CHOICES.JS no seletor de indicadores
                this.indicatorChoice = new Choices(this.selectors.indicator, {
                    searchPlaceholderValue: "Buscar indicador...", // Texto de ajuda na busca
                    itemSelectText: 'Pressione para selecionar', // Texto ao passar o mouse
                    shouldSort: true, // Mantém a ordem original do JSON
                });
            });
            
            // Popula Localidades
            const locaisRes = await fetch('./data/filtro_localidades_mapa.json');
            const locais = await locaisRes.json();
            this.selectors.uf.innerHTML = locais.map(loc => `<option value="${loc.uf}">${loc.nome}</option>`).join('');
            
            // Define o estado inicial com base no valor padrão dos seletores
            this.state.indicator = this.selectors.indicator.value;
            this.state.uf = this.selectors.uf.value;

            await this.updateYearSelector();
        } catch (error) {
            console.error("Erro ao popular filtros iniciais:", error);
            alert("Não foi possível carregar as opções de filtro.");
        }
    }

    addEventListeners() {
        this.selectors.indicator.addEventListener('change', () => this.handleFilterChange());
        this.selectors.uf.addEventListener('change', () => this.handleFilterChange());
        this.selectors.year.addEventListener('change', async () => {
            this.state.year = this.selectors.year.value;
            await this.updateMap();
        });
        
        this.selectors.openTableBtn.addEventListener('click', () => {
            this.selectors.tableModal.classList.remove('hidden');
            this.selectors.tableModal.classList.add('flex');
        });

        this.selectors.closeTableBtn.addEventListener('click', () => {
            this.selectors.tableModal.classList.add('hidden');
            this.selectors.tableModal.classList.remove('flex');
        });

        this.selectors.downloadBtn.addEventListener('click', () => this.downloadCSV());
        this.selectors.limparFiltrosBtn.addEventListener('click', () => this.resetMap());

        // NOVO: Listeners para o modal de metadados
        this.selectors.infoBtn.addEventListener('click', () => this.openMetadataModal());
        this.selectors.closeMetadataBtn.addEventListener('click', () => this.closeMetadataModal());
    }

    // NOVO: Método para abrir e popular o modal de metadados
    openMetadataModal() {
        const currentIndicatorId = this.state.indicator;
        const metadata = this.indicatorMetadata[currentIndicatorId];

        if (metadata) {
            this.selectors.metadataNome.textContent = metadata.nome;
            this.selectors.metadataDescricao.textContent = metadata.descricao;
            this.selectors.metadataFonte.textContent = metadata.fonte;
            
            this.selectors.metadataModal.classList.remove('hidden');
            this.selectors.metadataModal.classList.add('flex');
        } else {
            console.error("Metadados não encontrados para o indicador:", currentIndicatorId);
        }
    }

    // NOVO: Método para fechar o modal de metadados
    closeMetadataModal() {
        this.selectors.metadataModal.classList.add('hidden');
        this.selectors.metadataModal.classList.remove('flex');
    }

    async handleFilterChange() {
        this.state.indicator = this.selectors.indicator.value;
        this.state.uf = this.selectors.uf.value;
        await this.updateYearSelector();
    }

    async updateYearSelector() {
        this.selectors.year.disabled = true;
        this.selectors.year.innerHTML = '<option>Carregando...</option>';

        try {
            // Em produção, a URL seria `/api/periodos?indicador=...`
            const response = await fetch('./data/filtro_periodo.json');
            const years = await response.json();
            
            if (years && years.length > 0) {
                // Ordena do mais recente para o mais antigo
                years.sort((a, b) => b - a);
                this.selectors.year.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
                this.selectors.year.disabled = false;
                this.state.year = this.selectors.year.value;
                await this.updateMap();
            } else {
                this.selectors.year.innerHTML = '<option>Sem dados</option>';
                if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);
            }
        } catch (error) {
            console.error("Erro ao buscar períodos:", error);
            this.selectors.year.innerHTML = '<option>Erro ao carregar</option>';
        }
    }
    
    async resetMap() {
        console.log("Resetando filtros...");
        this.selectors.indicator.value = "IDG";
        this.selectors.uf.value = 'br';
        await this.handleFilterChange();
    }

    async updateMap() {
        if (!this.state.indicator || !this.state.year || !this.state.uf) {
            return;
        }
        this.toggleLoader(true);
        try {
            // A busca de dados agora é centralizada aqui
            await this.loadIndicatorMapData(); 
            const indicatorData = this.getIndicatorData();
            const geoJsonData = await this.getGeoJson();
            const currentIndicatorName = this.indicatorMetadata[this.state.indicator]?.nome || "Indicador";
            this.selectors.title.textContent = currentIndicatorName;

            if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);
            if (this.searchControl) this.map.removeControl(this.searchControl);

            this.geoJsonLayer = L.geoJson(geoJsonData, {
                style: (feature) => this.styleFeature(feature, indicatorData),
                onEachFeature: (feature, layer) => this.onEachFeature(feature, layer, indicatorData)
            }).addTo(this.map);

            this.setupSearchControl(this.geoJsonLayer);

            if (this.geoJsonLayer.getBounds().isValid()) {
                this.map.fitBounds(this.geoJsonLayer.getBounds());
            }

            this.updateSummaryCards(indicatorData);
            this.updateSubtitle();
            this.renderTable(indicatorData);

        } catch (error) {
            console.error("Falha ao atualizar o mapa:", error);
            alert("Não foi possível carregar os dados para a seleção atual.");
        } finally {
            this.toggleLoader(false);
        }
    }
    
    // MÉTODO CORRIGIDO: Retorna os dados que já foram carregados
    getIndicatorData() {
        if (!this.indicatorMapData) return [];
        // Esta lógica simplificada assume que o `mapa_dados.json` sempre corresponde à seleção.
        // Quando a API estiver pronta, a chamada fetch em loadIndicatorMapData será dinâmica
        // e este método não precisará de alterações.
        return this.indicatorMapData;
    }

    async getGeoJson() {
        const path = this.state.uf === 'br' ? './maps/brazil-states.json' : `./maps/pb-municipalities.json`;
        if (!this.geoJsonCache[path]) {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Falha ao carregar geometria de ${path}`);
            this.geoJsonCache[path] = await response.json();
        }
        return this.geoJsonCache[path];
    }
    
    // --- MÉTODOS AUXILIARES E DE RENDERIZAÇÃO ---

    setupSearchControl(layer) {
        const searchProp = this.state.uf === 'br' ? 'NM_UF' : 'NM_MUN';
        this.searchControl = new L.Control.Search({
            layer: layer,
            propertyName: searchProp,
            marker: false,
            moveToLocation: (latlng, title, map) => {
                const zoom = map.getBoundsZoom(latlng.layer.getBounds());
                map.setView(latlng, zoom);
                latlng.layer.setStyle({ weight: 3, color: '#00A8E1' });
                if (latlng.layer.getPopup()) {
                    latlng.layer.openPopup();
                }
            },
            initial: false,
            textPlaceholder: 'Buscar localidade...',
            textErr: 'Localidade não encontrada',
        });
        this.searchControl.on('search:collapsed', () => {
            if (this.geoJsonLayer) {
                layer.eachLayer((l) => {
                    this.geoJsonLayer.resetStyle(l);
                });
            }
        });
        this.map.addControl(this.searchControl);
    }
    
    updateSummaryCards(data) {
        if (!data || data.length === 0) {
            this.selectors.valorMaximo.textContent = 'N/D';
            this.selectors.valorMedio.textContent = 'N/D';
            this.selectors.valorMinimo.textContent = 'N/D';
            return;
        }
        const values = data.map(item => item.valor).filter(v => v != null);
        if (values.length === 0) {
            this.selectors.valorMaximo.textContent = 'N/D';
            this.selectors.valorMedio.textContent = 'N/D';
            this.selectors.valorMinimo.textContent = 'N/D';
            return;
        }
        const max = Math.max(...values);
        const min = Math.min(...values);
        const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
        this.selectors.valorMaximo.textContent = max.toFixed(2);
        this.selectors.valorMedio.textContent = avg.toFixed(2);
        this.selectors.valorMinimo.textContent = min.toFixed(2);
    }

    renderTable(data) {
        if (this.gridInstance) {
            this.gridInstance.destroy();
        }
        this.selectors.tableWrapper.innerHTML = '';
        const tableData = data.map(item => ({
            ano: this.state.year,
            localidade: item.nome || `Código ${item.codigo_mun || item.codigo_uf}`,
            alerta: this.getAlerta(item.valor),
            valor: item.valor
        }));
        this.gridInstance = new gridjs.Grid({
            columns: [
                'Ano', 'Localidade', 'Alerta',
                { name: 'Valor', formatter: (cell) => cell != null ? cell.toFixed(2) : 'N/D' }
            ],
            data: tableData,
            search: true,
            sort: true,
            pagination: { limit: 10 },
            csv: true,
            language: {
                search: { placeholder: '🔍 Pesquisar...' },
                pagination: { previous: '◀︎', next: '▶︎', showing: 'Mostrando', to: 'a', of: 'de', results: 'resultados' }
            }
        }).render(this.selectors.tableWrapper);
        const ufText = this.selectors.uf.options[this.selectors.uf.selectedIndex].text;
        this.selectors.modalSubtitle.textContent = `${ufText} - Ano de ${this.state.year}`;
    }

    downloadCSV() {
        // Implementação manual para ter controle sobre o nome do arquivo
        if (!this.gridInstance || !this.gridInstance.config.data || this.gridInstance.config.data.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }
        
        const data = this.gridInstance.config.data;
        const headers = this.gridInstance.config.columns.map(c => typeof c === 'object' ? c.name : c);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        data.forEach(rowArray => {
            let row = rowArray.join(",");
            csvContent += row + "\r\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        
        const ufText = this.selectors.uf.options[this.selectors.uf.selectedIndex].text.replace(" ", "_");
        const indicatorText = this.selectors.indicator.options[this.selectors.indicator.selectedIndex].text.split(':')[0].replace(" ", "_");
        
        link.setAttribute("download", `dados_${indicatorText}_${ufText}_${this.state.year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    getAlerta(value) {
        if (value == null) return 'N/D';
        if (value > 4) return 'Muito alto';
        if (value > 3) return 'Alto';
        if (value > 2.5) return 'Intermediário';
        if (value > 2) return 'Baixo';
        return 'Muito baixo';
    }

    getColor(value) {
        if (value == null) return '#CCCCCC'; // Cinza para N/D
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
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.8
        };
    }

    onEachFeature(feature, layer, data) {
        layer.on({
            mouseover: (e) => {
                e.target.setStyle({ weight: 3, color: '#666' });
                e.target.bringToFront();
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
        this.selectors.loader.style.display = show ? 'flex' : 'none';
    }

    updateSubtitle() {
        const ufText = this.selectors.uf.options[this.selectors.uf.selectedIndex].text;
        this.selectors.subtitle.textContent = `${ufText} - Ano de ${this.state.year}`;
    }

    renderLegend() {
        const legendContainer = this.selectors.legend;
        const grades = {
            '#d62728': '0 - 2 (Muito Baixo)',
            '#ff9896': '2 - 3 (Baixo)',
            '#98df8a': '3 - 4 (Médio)',
            '#2ca02c': '> 4 (Alto)',
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