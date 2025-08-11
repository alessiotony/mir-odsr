// js/renderizadores/renderSintese.js

/**
 * Renderiza a seção de síntese com múltiplos gráficos.
 * @param {object} sinteseData - O objeto "sintese" do dados_sintese.json.
 */
export function renderizarSintese(sinteseData) {
    const tituloContainer = document.getElementById('titulo-sintese');
    const radialContainer = document.getElementById('grafico-radial-container');
    const serieContainer = document.getElementById('grafico-serie-container');

    if (!sinteseData || !radialContainer || !serieContainer) return;

    // Renderiza o título principal da seção
    if (tituloContainer && sinteseData.titulo) {
        tituloContainer.innerHTML = `<h2 class="text-3xl font-bold text-texto-principal">${sinteseData.titulo}</h2>`;
    }

    // 1. Renderiza um GRÁFICO RADIAL para CADA item no array
    sinteseData.indicadorRadial.forEach(item => {
        // Cria um div para cada gráfico
        const chartDiv = document.createElement('div');
        radialContainer.appendChild(chartDiv);

        const radialOptions = {
            chart: { type: 'radialBar', height: 200 },
            series: [item.valor*100],
            colors: [item.cor],
            plotOptions: {
                radialBar: {
                    hollow: { size: '70%' },
                    track: { background: '#e0e0e0' },
                    dataLabels: {
                        name: { offsetY: 20, fontSize: '18px', color: '#4b5563' },
                        value: { offsetY: -20, fontSize: '30px', color: '#1f2937', fontWeight: 'bold' }
                    }
                }
            },
            stroke: { lineCap: 'round' },
            labels: [item.label],
        };

        const radialChart = new ApexCharts(chartDiv, radialOptions);
        radialChart.render();
    });

    // 2. Renderiza o GRÁFICO DE LINHA com múltiplas séries
    // Mapa de cores a partir do indicadorRadial
    const corPorGrupo = {};
    sinteseData.indicadorRadial.forEach(item => {
        corPorGrupo[item.label] = item.cor;
    });

    // Extrai as cores na ordem das séries
    const coresSeries = sinteseData.serieTemporal.series.map(
        serie => corPorGrupo[serie.name] || '#999999'
    );

    const serieOptions = {
        chart: { type: 'line', height: 400, toolbar: { show: true, tools: { download: true } } },
        series: sinteseData.serieTemporal.series,
        xaxis: {
            categories: sinteseData.serieTemporal.categorias,
            title: { text: 'Ano' }
        },
        yaxis: {
            title: { text: 'Nível de Progresso (%)' },
            labels: { formatter: (value) => value.toFixed(3)*100 + '%' }
        },
        colors: coresSeries,
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 5 },
        legend: { position: 'top', horizontalAlign: 'center' },
        grid: { borderColor: '#e5e7eb' },
        title: {
            text: sinteseData.serieTemporal.titulo,
            align: 'center',
            style: { fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }
        }
    };

    const serieChart = new ApexCharts(serieContainer, serieOptions);
    serieChart.render();
}
