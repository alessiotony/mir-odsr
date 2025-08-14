// /src/linha.js - Versão Final com Choices.js em todos os seletores

export class LineChartController {
    constructor() {
        this.chart = null;
        this.selectors = {};
        this.choices = {}; // Objeto para armazenar todas as instâncias do Choices.js
        this.allIndicatorData = [];
        this.allLocalidadeData = [];
        console.log("LineChartController construído.");
    }

    async init() {
        this.selectors = {
            indicator: document.getElementById('indicador-selector'),
            ufPrincipal: document.getElementById('uf-principal-selector'),
            comparacao: document.getElementById('comparacao-selector'),
            generateBtn: document.getElementById('gerar-grafico-btn'),
            chartContainer: document.getElementById('chart-container')
        };
        
        this.renderInitialChart("Carregando visualização padrão...");
        this.addEventListeners();
        await this.populateSelectors();
        await this.generateChart();
    }

    renderInitialChart(message = 'Selecione os filtros e clique em "Gerar Gráfico"') {
        const options = {
            series: [],
            chart: { height: 450, type: 'line', zoom: { enabled: false }, toolbar: { show: true } },
            stroke: { curve: 'smooth', width: 3 },
            title: { text: message, align: 'center' },
            xaxis: { categories: [] },
            noData: { text: 'Nenhum dado para exibir.' }
        };

        if (this.chart) {
            this.chart.updateOptions(options);
        } else {
            this.chart = new ApexCharts(this.selectors.chartContainer, options);
            this.chart.render();
        }
    }
    
    async populateSelectors() {
        try {
            const [indicadoresRes, localidadesRes] = await Promise.all([
                fetch('./data/filtro_indicadores.json'),
                fetch('./data/localidades_from_mongo.json')
            ]);
            this.allIndicatorData = await indicadoresRes.json();
            this.allLocalidadeData = await localidadesRes.json();

            // --- LÓGICA DE INICIALIZAÇÃO CORRIGIDA ---
            // 1. Popula os <select> com as <option>s primeiro
            this.selectors.indicator.innerHTML = this.allIndicatorData.map(ind => `<option value="${ind.id}">${ind.nome}</option>`).join('');
            this.selectors.ufPrincipal.innerHTML = this.allLocalidadeData.map(loc => `<option value="${loc.uf}">${loc.nome}</option>`).join('');

            // 2. Destrói instâncias antigas para evitar duplicatas
            Object.values(this.choices).forEach(choice => choice?.destroy());

            // 3. Inicializa o Choices.js para CADA seletor com sua configuração específica
            this.choices.indicator = new Choices(this.selectors.indicator, {
                searchPlaceholderValue: "Buscar Indicador...",
                itemSelectText: '',
                allowHTML: false, // Importante para seletores de opção única
            });

            this.choices.ufPrincipal = new Choices(this.selectors.ufPrincipal, {
                searchPlaceholderValue: "Buscar Localidade...",
                itemSelectText: '',
                allowHTML: false,
            });

            this.choices.comparacao = new Choices(this.selectors.comparacao, {
                searchPlaceholderValue: "Buscar Comparações...",
                removeItemButton: true,
                itemSelectText: '',
            });
            
            // 4. Define os valores padrão DEPOIS de inicializar
            // this.choices.indicator.setValue(['IDS']); // 'IDS' como padrão
            // this.choices.ufPrincipal.setValue(['br']);  // 'Brasil' como padrão
            
            this.updateComparisonSelectorOptions();

        } catch (error) {
            console.error("Erro ao popular seletores:", error);
            this.selectors.chartContainer.innerHTML = '<p class="text-red-500">Erro ao carregar dados dos filtros.</p>';
        }
    }
    
    updateComparisonSelectorOptions() {
        const principalUF = this.choices.ufPrincipal.getValue(true);
        const filteredLocalidades = this.allLocalidadeData.filter(loc => loc.uf !== principalUF);
        
        // Usa o método setChoices do Choices.js para atualizar as opções dinamicamente
        this.choices.comparacao.setChoices(
            filteredLocalidades.map(loc => ({ value: loc.uf, label: loc.nome })),
            'value',
            'label',
            true
        );
    }

    addEventListeners() {
        this.selectors.generateBtn.addEventListener('click', () => this.generateChart());
        // Usa o evento 'change' do Choices.js para o seletor principal
        this.selectors.ufPrincipal.addEventListener('change', () => this.updateComparisonSelectorOptions());
    }

    async generateChart() {
        this.renderInitialChart("Buscando dados...");

        const indicatorId = this.choices.indicator.getValue(true);
        const principalUF = this.choices.ufPrincipal.getValue(true);
        const comparacaoUFs = this.choices.comparacao.getValue(true);

        // Validação
        if (!indicatorId || !principalUF) {
            this.renderInitialChart('Por favor, selecione um Indicador e uma Localidade Principal.');
            return;
        }

        const ufsToFetch = [principalUF, ...comparacaoUFs];
        
        const promises = ufsToFetch.map(uf => this.fetchTimeSeriesData(indicatorId, uf));
        const results = await Promise.all(promises);

        const validResults = results.filter(r => r !== null);
        
        if (validResults.length === 0) {
            this.renderInitialChart('Nenhum dado encontrado para a seleção.');
            return;
        }

        const chartData = this.transformDataForChart(validResults);
        this.renderChart(chartData, this.choices.indicator.getValue().label);
    }
    
    async fetchTimeSeriesData(indicatorId, uf) {
        try {
            // Para testes, usamos o arquivo fixo.
            // Quando a API estiver pronta, a linha abaixo será reativada.
            // const response = await fetch(`/data/serie_temporal_${indicatorId}_${uf}.json`);
            const response = await fetch('./data/linha_dados.json');
            
            if (!response.ok) throw new Error(`Dados não encontrados para ${uf}`);
            const data = await response.json();
            
            const localidadeInfo = this.allLocalidadeData.find(loc => loc.uf === uf);
            
            return {
                nome: localidadeInfo.nome,
                data: data
            };
        } catch (error) {
            console.warn(error.message);
            return null;
        }
    }

    transformDataForChart(results) {
        const series = [];
        const allYears = new Set();
        
        results.forEach(result => {
            result.data.forEach(point => allYears.add(point.ano));
        });
        
        const categories = [...allYears].sort((a, b) => a - b);
        
        results.forEach(result => {
            const dataPoints = categories.map(year => {
                const point = result.data.find(p => p.ano === year);
                return point ? point.valor : null;
            });
            
            series.push({
                name: result.nome,
                data: dataPoints
            });
        });
        
        return { series, categories };
    }

    renderChart(chartData, indicatorName) {
        this.chart.updateOptions({
            series: chartData.series,
            xaxis: {
                categories: chartData.categories,
                title: { text: 'Ano' }
            },
            yaxis: {
                title: { text: 'Valor do Indicador' },
                labels: {
                    formatter: (val) => val ? val.toFixed(2) : ''
                }
            },
            title: {
                text: indicatorName,
                align: 'center'
            },
            tooltip: {
                y: {
                    formatter: (val) => val != null ? val.toFixed(2) : 'N/D'
                }
            },
            stroke: {
                width: 3
            },
            markers: {
                size: 5
            }
        });
    }
}