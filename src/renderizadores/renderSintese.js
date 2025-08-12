// src/renderizadores/renderSintese.js
// Versão robusta de renderizarSintese: aceita vários formatos, destrói gráficos antigos e faz fallback em IDs.

let _charts = [];

/** Destroi todos os gráficos que criamos anteriormente */
function _destroyAllCharts() {
    _charts.forEach(c => {
        try { c.destroy(); } catch (e) { /* ignore */ }
    });
    _charts = [];
}

/**
 * Renderiza a seção de síntese.
 * @param {object} sinteseData - objeto com propriedades (pode ser { indicadorRadial:{data:[]}, serieTemporal:{...} } ou já na forma esperada)
 * @param {object} opts - { ids: { title, radial, serie } } - ids dos containers (opcional)
 */
export function renderizarSintese(sinteseData, opts = {}) {
    if (!sinteseData) {
        console.warn('renderizarSintese: sinteseData ausente');
        return;
    }

    // ids padrão (compatíveis com páginas específicas)
    const defaultIds = {
        title: 'titulo-sintese',
        radial: 'grafico-radial-container',
        serie: 'grafico-serie-container'
    };
    const ids = Object.assign({}, defaultIds, opts.ids || {});

    // fallback: tenta também os ids usados na visão geral
    const titleEl =
        document.getElementById(ids.title) ||
        document.getElementById('sintese-grafica') ||
        null;
    const radialContainer =
        document.getElementById(ids.radial) ||
        document.getElementById('grafico-progresso-racial') ||
        document.getElementById('grafico-radial-container') ||
        null;
    const serieContainer =
        document.getElementById(ids.serie) ||
        document.getElementById('grafico-evolucao-progresso') ||
        document.getElementById('grafico-serie-container') ||
        null;

    if (!radialContainer || !serieContainer) {
        console.warn('renderizarSintese: containers não encontrados. radial:', radialContainer, 'serie:', serieContainer);
        return;
    }

    // normaliza a forma do objeto (suporta indicadorRadial.data ou indicadorRadial[])
    let indicadorRadial = sinteseData.indicadorRadial || sinteseData.indicadorRadialData || sinteseData.indicadores;
    if (indicadorRadial && Array.isArray(indicadorRadial.data)) indicadorRadial = indicadorRadial.data;
    if (!Array.isArray(indicadorRadial)) indicadorRadial = [];

    const serieTemporal = sinteseData.serieTemporal || sinteseData.serie || null;

    // limpa e destrói gráficos antigos
    _destroyAllCharts();
    radialContainer.innerHTML = '';
    serieContainer.innerHTML = '';

    // Renderiza título (se existir)
    if (titleEl && sinteseData.titulo) {
        titleEl.innerHTML = `<h2 class="text-2xl font-semibold">${sinteseData.titulo}</h2>`;
    } else if (titleEl && serieTemporal && serieTemporal.titulo) {
        titleEl.innerHTML = `<h2 class="text-2xl font-semibold">${serieTemporal.titulo}</h2>`;
    }

    // ----- Radiais -----
    // layout simples: cria um bloco por indicador
    indicadorRadial.forEach(item => {
        const chartDiv = document.createElement('div');
        chartDiv.style.display = 'inline-block';
        chartDiv.style.width = '320px';
        chartDiv.style.margin = '2px';
        chartDiv.style.verticalAlign = 'center';
        radialContainer.appendChild(chartDiv);

        const valor = Number(item.valor) || 0;
        const color = item.cor || '#999999';
        const label = item.label || '';

        const radialOptions = {
            chart: { type: 'radialBar', height: 260 },
            series: [ Math.round(valor * 100) ],
            labels: [ label ],
            colors: [ color ],
            plotOptions: {
                radialBar: {
                    hollow: { size: '65%' },
                    track: { background: '#f3f4f6' },
                    dataLabels: {
                        name: { offsetY: 20, fontSize: '12px', color: '#6b7280' },
                        value: {
                            offsetY: -10,
                            fontSize: '16px',
                            color: '#111827',
                            formatter: function (val) { return `${Math.round(val)}%`; }
                        }
                    }
                }
            },
            stroke: { lineCap: 'round' }
        };

        try {
            const radialChart = new ApexCharts(chartDiv, radialOptions);
            radialChart.render();
            _charts.push(radialChart);
        } catch (err) {
            console.error('Erro ao criar radial chart', err);
        }
    });

    // ----- Série temporal -----
    if (serieTemporal && Array.isArray(serieTemporal.series)) {
        // mapa de cores por label (a partir dos radiais)
        const colorByName = {};
        indicadorRadial.forEach(it => { if (it.label) colorByName[it.label] = it.cor; });

        const colors = serieTemporal.series.map(s => colorByName[s.name] || '#999999');

        const xCategories = serieTemporal.categorias || serieTemporal.categorias || serieTemporal.categories || [];

        const serieOptions = {
            chart: { type: 'line', height: 360, toolbar: { show: true, tools: { download: true } } },
            series: serieTemporal.series,
            xaxis: { categories: xCategories, title: { text: 'Ano' } },
            yaxis: {
                title: { text: 'Nível de Progresso (%)' },
                labels: {
                    formatter: function (value) {
                        // valor esperado em 0..1 -> converte para %
                        if (typeof value === 'number') return (value * 100).toFixed(1) + '%';
                        // fallback, caso seja já um percentual 0..100
                        return String(value);
                    }
                }
            },
            colors,
            stroke: { curve: 'smooth', width: 2 },
            markers: { size: 4 },
            legend: { position: 'top' },
            grid: { borderColor: '#e5e7eb' },
            title: { text: serieTemporal.titulo || '', align: 'center', style: { fontSize: '16px' } }
        };

        try {
            const serieChart = new ApexCharts(serieContainer, serieOptions);
            serieChart.render();
            _charts.push(serieChart);
        } catch (err) {
            console.error('Erro ao criar serie temporal', err);
        }
    } else {
        console.warn('renderizarSintese: serieTemporal ausente ou mal formatada', serieTemporal);
    }

    return _charts;
}
