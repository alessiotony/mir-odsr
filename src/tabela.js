// /src/tabela.js - VERSÃO FINAL E CORRIGIDA

export class TableController {
    constructor() {
        this.gridInstance = null;
        this.selectors = {};
        this.choices = {};
        this.fullData = [];
    }

    async init() {
        this.selectors = {
            linha: document.getElementById('linha-selector'),
            coluna: document.getElementById('coluna-selector'),
            conteudo: document.getElementById('conteudo-selector'),
            agregacao: document.getElementById('agregacao-selector'),
            periodo: document.getElementById('periodo-selector'),
            localidade: document.getElementById('localidade-selector'),
            raca: document.getElementById('raca-selector'),
            generateBtn: document.getElementById('gerar-tabela-btn'),
            tableWrapper: document.getElementById('table-wrapper'),
            loader: document.getElementById('table-loader'),
            title: document.getElementById('table-title'),
            subtitle: document.getElementById('table-subtitle')
        };
        
        await this.loadAndPopulateFilters();
        this.addEventListeners();
    }

    async loadAndPopulateFilters() {
        try {
            const [linhasRes, colunasRes, conteudoRes, periodosRes, locaisRes, racasRes, dataRes] = await Promise.all([
                fetch('./data/seletor_linhas.json'),
                fetch('./data/seletor_colunas.json'),
                fetch('./data/filtro_indicadores.json'),
                fetch('./data/filtro_periodo.json'),
                fetch('./data/localidades_from_mongo.json'),
                fetch('./data/filtro_raca_cor.json'),
                fetch('./data/tabela_dados_full.json')
            ]);

            const linhas = await linhasRes.json();
            const colunas = await colunasRes.json();
            const conteudos = await conteudoRes.json();
            const periodos = await periodosRes.json();
            const localidades = await locaisRes.json();
            const racas = await racasRes.json();
            this.fullData = await dataRes.json();

            // --- ✅ LÓGICA DE POPULAÇÃO CORRIGIDA ---
            // PASSO 1: Popular todos os selects com HTML primeiro
            this.selectors.linha.innerHTML = linhas.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
            this.selectors.coluna.innerHTML = colunas.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
            this.selectors.conteudo.innerHTML = conteudos.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
            this.selectors.periodo.innerHTML = periodos.sort((a, b) => b - a).map(y => `<option value="${y}">${y}</option>`).join('');
            this.selectors.localidade.innerHTML = localidades.map(l => `<option value="${l.uf}">${l.nome}</option>`).join('');
            this.selectors.raca.innerHTML = racas.map(r => `<option value="${r.id}">${r.nome}</option>`).join('');

            // PASSO 2: Inicializar o Choices.js nos elementos já populados
            this.choices.conteudo = new Choices(this.selectors.conteudo, { searchPlaceholderValue: "Buscar...", removeItemButton: true, itemSelectText: '' });
            this.choices.periodo = new Choices(this.selectors.periodo, { searchPlaceholderValue: "Buscar...", removeItemButton: true, itemSelectText: '' });
            this.choices.localidade = new Choices(this.selectors.localidade, { searchPlaceholderValue: "Buscar...", removeItemButton: true, itemSelectText: '' });
            this.choices.raca = new Choices(this.selectors.raca, { searchPlaceholderValue: "Buscar...", removeItemButton: true, itemSelectText: '' });

            // Define valores padrão
            this.choices.periodo.setValue([periodos[0]]);
            this.choices.localidade.setValue(['Paraíba - UF']);
            this.choices.raca.setChoiceByValue(racas.map(r => r.id));

        } catch (error) {
            console.error("Erro ao carregar e popular filtros:", error);
            alert("Não foi possível carregar os dados de configuração.");
        }
    }

    addEventListeners() {
        this.selectors.generateBtn.addEventListener('click', () => this.generateTable());
    }

    async generateTable() {
        this.toggleLoader(true);
        
        const linhaKey = this.selectors.linha.value;
        const colunaKey = this.selectors.coluna.value;
        const agregacao = this.selectors.agregacao.value;
        const selectedIndicators = this.choices.conteudo.getValue(true);
        const selectedYears = this.choices.periodo.getValue(true);
        const selectedUFs = this.choices.localidade.getValue(true);
        const selectedRacas = this.choices.raca.getValue(true);

        if (!selectedIndicators.length || !selectedUFs.length || !selectedYears.length || !selectedRacas.length) {
            alert("Por favor, selecione ao menos um item em cada filtro: Conteúdo, Períodos, Localidades e Raça/Cor.");
            this.toggleLoader(false);
            return;
        }

        // ✅ LÓGICA DE FILTRAGEM CORRIGIDA
        const filteredData = this.fullData.filter(d => 
            selectedIndicators.includes(d.indicador) && 
            selectedYears.includes(d.ano.toString()) && 
            selectedUFs.includes(d.uf) &&
            selectedRacas.includes(d.raca_cor)
        );

        const indicadorInfo = this.choices.conteudo.getValue();
        this.selectors.title.textContent = indicadorInfo.length ? indicadorInfo[0].label : "Tabela de Dados";
        this.selectors.subtitle.textContent = `Dados para ${selectedUFs.length} localidade(s), ${selectedRacas.length} grupo(s) de raça/cor e ${selectedYears.length} período(s).`;
        
        this.renderDynamicTable(filteredData, linhaKey, colunaKey);
        
        this.toggleLoader(false);
    }
    
    renderDynamicTable(data, linhaKey, colunaKey) {
        if (this.gridInstance) this.gridInstance.destroy();
        this.selectors.tableWrapper.innerHTML = '';
        
        if (!data || data.length === 0) {
            this.selectors.tableWrapper.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><p>Nenhum dado encontrado para os filtros selecionados.</p></div>';
            return;
        }
        
        const getRowLabel = (item) => {
            if (linhaKey === 'localidade') return item.nome;
            return item[linhaKey] || 'N/A';
        };

        const linhaLabels = [...new Set(data.map(getRowLabel))].sort();
        const colunaLabels = colunaKey === 'nao_ativa' ? ['Valor'] : [...new Set(data.map(item => item[colunaKey]))].sort();
        
        const linhaHeader = this.selectors.linha.options[this.selectors.linha.selectedIndex].text;
        const columns = [linhaHeader, ...colunaLabels.map(String)];
        
        const tableData = linhaLabels.map(labelLinha => {
            const row = [labelLinha];
            colunaLabels.forEach(labelColuna => {
                const itemColunaKey = colunaKey === 'nao_ativa' ? 'valor' : colunaKey;
                const cellData = data.find(item => {
                    const itemLinha = getRowLabel(item);
                    if (colunaKey === 'nao_ativa') {
                        return itemLinha === labelLinha;
                    }
                    return itemLinha === labelLinha && item[itemColunaKey]?.toString() === labelColuna.toString();
                });
                row.push(cellData ? cellData.valor.toFixed(2) : '-');
            });
            return row;
        });

        this.gridInstance = new gridjs.Grid({
            columns: columns,
            data: tableData,
            search: true,
            sort: true,
            pagination: { limit: 15 }
        }).render(this.selectors.tableWrapper);
    }

    toggleLoader(show) {
        this.selectors.loader.style.display = show ? 'flex' : 'none';
    }

    downloadCSV() { /* ... implementação futura ... */ }
}