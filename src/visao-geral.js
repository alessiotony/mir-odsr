// src/visao-geral.js - Adaptado para layout e tabelaIndicadores
import { renderizarSintese } from './renderizadores/renderSintese.js';

export class VisaoGeralController {
    constructor() {
        this.selectors = {};
        this.fullDataObject = null;
        console.log("VisaoGeralController adaptado com layout e tabela.");
    }

    async init() {
        try {
            this.setupSelectors();
            await this.loadAndProcessData();
            await this.populateFilters();
            this.addEventListeners();
            await this.updateView();
        } catch (error) {
            console.error("Erro na inicialização da Visão Geral:", error);
        }
    }

    setupSelectors() {
        this.selectors = {
            localidade: document.getElementById('seletor-localidade'),
            kpiIndicadores: document.querySelector('#sintese-kpis div:nth-child(1) p.text-2xl'),
            kpiObjetivos: document.querySelector('#sintese-kpis div:nth-child(2) p.text-2xl'),
            kpiMetas: document.querySelector('#sintese-kpis div:nth-child(3) p.text-2xl'),
            kpiPopulacao: document.querySelector('#sintese-kpis div:nth-child(4) p.text-2xl'),
            graficoOds: document.getElementById('grafico-progresso-ods'),
            tabelaIndicadores: document.getElementById('tabela-indicadores-container')
        };
    }

    async loadAndProcessData() {
        const response = await fetch('./data/visao_geral_dados.json');
        if (!response.ok) throw new Error('Falha ao carregar visao_geral_dados.json');
        this.fullDataObject = await response.json();

        // KPIs
        if (this.fullDataObject.kpis) {
            this.selectors.kpiIndicadores.textContent = this.fullDataObject.kpis.indicadores;
            this.selectors.kpiObjetivos.textContent = this.fullDataObject.kpis.objetivos;
            this.selectors.kpiMetas.textContent = this.fullDataObject.kpis.metas;
            this.selectors.kpiPopulacao.textContent = this.fullDataObject.kpis.populacao;
        }
    }

    async populateFilters() {
        const response = await fetch('./data/filtro_localidades.json');
        if (!response.ok) throw new Error('Falha ao carregar filtro_localidades.json');
        const localidades = await response.json();
        const optionsHtml = localidades.map(loc => {
            const indentacao = '&nbsp;'.repeat(loc.nivel * 4);
            return `<option value="${loc.codigo_mun}">${indentacao}${loc.nome}</option>`;
        }).join('');
        this.selectors.localidade.innerHTML = optionsHtml;
    }

    addEventListeners() {
        if (this.selectors.localidade) {
            this.selectors.localidade.addEventListener('change', () => this.updateView());
        }
    }

    async updateView() {
        // Render radiais + linha temporal usando renderizarSintese
        renderizarSintese({
            titulo: this.fullDataObject.indicadorRadial.titulo,
            indicadorRadial: this.fullDataObject.indicadorRadial.data,
            serieTemporal: this.fullDataObject.serieTemporal
        }, {
            ids: {
                radial: 'grafico-progresso-racial',
                serie: 'grafico-evolucao-progresso'
            }
        });

        // Render gráfico ODS
        if (this.fullDataObject.graficoOds) {
            this.renderOdsBarChart(this.fullDataObject.graficoOds);
        }

        // Render tabelaIndicadores
        if (this.fullDataObject.tabelaIndicadores) {
            this.renderTabelaIndicadores(this.fullDataObject.tabelaIndicadores);
        }
    }

    renderOdsBarChart(odsData) {
        this.selectors.graficoOds.innerHTML = '';
        
        
        // Paleta vinda do indicadorRadial
        const corPorGrupo = {};
        this.fullDataObject.indicadorRadial.data.forEach(item => {
            corPorGrupo[item.label] = item.cor;
        });
        
        // Garante ordem de cores conforme as séries
        const coresSeries = odsData.series.map(s => corPorGrupo[s.name] || '#999999');

        const options = {
            chart: { type: 'bar', height: 400 },
            series: odsData.series,
            xaxis: { categories: odsData.categories },
            legend: { position: 'top' },
            plotOptions: { bar: { horizontal: false, columnWidth: '60%' } },
            dataLabels: { enabled: true },
            colors: coresSeries
        };
        const odsChart = new ApexCharts(this.selectors.graficoOds, options);
        odsChart.render();
    }

    renderTabelaIndicadores(tabelaData) {
        const container = this.selectors.tabelaIndicadores;
        if (!container) return;
        let html = `<h3 class="font-bold text-lg mb-4 text-texto-principal">${tabelaData.titulo}</h3>`;
        html += `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead class="bg-gray-100">
                <tr>${tabelaData.colunas.map(col => `<th class="px-4 py-2 font-medium">${col}</th>`).join('')}</tr>
            </thead>
            <tbody class="divide-y divide-gray-200">`;
        tabelaData.linhas.forEach(linha => {
            html += `<tr>
                <td class="px-4 py-2">${linha.indicador}</td>
                <td class="px-4 py-2">${linha.brancos}%</td>
                <td class="px-4 py-2">${linha.negros}%</td>
                <td class="px-4 py-2">${linha.indigenas}%</td>
                <td class="px-4 py-2">${linha.amarelos}%</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }
}
