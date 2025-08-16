// src/renderizadores/renderSintese.js
// Renderização da síntese (radiais + série temporal) com layouts e variantes.
// Opções:
//   renderizarSintese(data, {
//     ids: { title, radial, serie },
//     layout: 'grid4' | 'default',
//     variant: 'ods18_compacto' | 'default',
//     seriesColor: '#8B5E3C',   // cor única para a(s) linhas da série temporal (ex.: marrom)
//   })

// -------- Controle de charts por container (evita um apagar o outro) --------
const _chartsByContainer = new WeakMap();
function _registerChart(containerEl, chart) {
  if (!containerEl || !chart) return;
  const arr = _chartsByContainer.get(containerEl) || [];
  arr.push(chart);
  _chartsByContainer.set(containerEl, arr);
}
function _destroyChartsIn(containerEl) {
  if (!containerEl) return;
  const arr = _chartsByContainer.get(containerEl) || [];
  for (const c of arr) { try { c.destroy(); } catch (e) {} }
  _chartsByContainer.delete(containerEl);
}

// --------------------------- Utilitários ---------------------------
function pct(v) { return typeof v === 'number' ? `${Math.round(v * 100)}%` : '—'; }

function computeRadialSizePx() {
  // pensado para caber 4 em linha (desktop) e 2x2 (mobile)
  if (window.matchMedia('(min-width: 1280px)').matches) return 130; // xl+
  if (window.matchMedia('(min-width: 1024px)').matches) return 120; // lg
  if (window.matchMedia('(min-width: 768px)').matches)  return 110; // md
  return 96; // sm / xs
}

// fontes/offsets proporcionais ao tamanho do radial
function computeRadialFonts(size) {
  if (size >= 130) return { name: 13, value: 26, nameOffset: 24, valueOffset: -10 };
  if (size >= 120) return { name: 12, value: 24, nameOffset: 22, valueOffset: -10 };
  if (size >= 110) return { name: 12, value: 22, nameOffset: 20, valueOffset: -8  };
  return              { name: 11, value: 20, nameOffset: 18, valueOffset: -6  };
}

function makeStatCard(label, valor) {
  const el = document.createElement('div');
  // min-w menor no mobile para caber 3 colunas sem quebrar
  el.className = 'px-3 py-2 rounded-lg border border-gray-200 shadow-sm text-center min-w-[72px] sm:min-w-[96px] bg-white';
  el.innerHTML = `
    <div class="text-[10px] tracking-wide uppercase text-gray-500">${label}</div>
    <div class="text-base sm:text-lg font-semibold">${pct(valor)}</div>
  `;
  return el;
}


function findIndiceItem(arr) {
  if (!Array.isArray(arr)) return null;
  return (
    arr.find(i => /índice|indice/i.test(i?.label || '')) ||
    arr.find(i => /index/i.test(i?.label || '')) ||
    arr[0] || null
  );
}
function pickIsirColor01(x) {
  const v = Number(x || 0);
  if (v >= 0.90) return '#16a34a'; // verde
  if (v >= 0.70) return '#eab308'; // amarelo
  if (v >= 0.50) return '#f59e0b'; // laranja
  return '#ef4444';                // vermelho
}

// ----------------------------- Render -----------------------------
export function renderizarSintese(sinteseData, opts = {}) {
  if (!sinteseData) {
    console.warn('renderizarSintese: sinteseData ausente');
    return;
  }

  // IDs padrão (compat com páginas antigas)
  const defaultIds = {
    title: 'titulo-sintese',
    radial: 'grafico-radial-container',
    serie:  'grafico-serie-container'
  };
  const ids     = Object.assign({}, defaultIds, opts.ids || {});
  const layout  = opts.layout  || 'default';
  const variant = opts.variant || 'default';

  // Containers
  const titleEl = document.getElementById(ids.title) || null;
  const radialContainer =
    document.getElementById(ids.radial) ||
    document.getElementById('grafico-progresso-racial') ||
    document.getElementById('grafico-radial-container') || null;
  const serieContainer =
    document.getElementById(ids.serie)  ||
    document.getElementById('grafico-evolucao-progresso') ||
    document.getElementById('grafico-serie-container') || null;

  if (!radialContainer || !serieContainer) {
    console.warn('renderizarSintese: containers não encontrados. radial:', radialContainer, 'serie:', serieContainer);
    return;
  }

  // Normalização dos dados
  let indicadorRadial = sinteseData.indicadorRadial || sinteseData.indicadorRadialData || sinteseData.indicadores;
  if (indicadorRadial && Array.isArray(indicadorRadial.data)) indicadorRadial = indicadorRadial.data;
  if (!Array.isArray(indicadorRadial)) indicadorRadial = [];
  const serieTemporal = sinteseData.serieTemporal || sinteseData.serie || null;

  // Limpa APENAS os gráficos destes containers
  _destroyChartsIn(radialContainer);
  _destroyChartsIn(serieContainer);
  radialContainer.innerHTML = '';
  serieContainer.innerHTML  = '';

  // Título (opcional)
  if (titleEl) {
    const t = sinteseData.titulo || (serieTemporal && serieTemporal.titulo) || '';
    if (t) titleEl.innerHTML = `<h2 class="text-2xl font-semibold">${t}</h2>`;
  }

  // ------------------------- RADIAIS -------------------------
  radialContainer.classList.add('w-full');

  if (variant === 'ods18_compacto') {
  // Mobile-first: empilha (radial em cima, cards embaixo). Em ≥sm, 2 colunas.
  radialContainer.classList.add('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-x-4', 'gap-y-3', 'items-start');

  const left  = document.createElement('div');
  left.className  = 'flex justify-start sm:justify-center';
  const right = document.createElement('div');
  right.className = 'w-full flex flex-col gap-2';
  radialContainer.append(left, right);

  // Título dos cards
  const legend = document.createElement('div');
  legend.className = 'text-xs text-gray-600 mb-1';
  legend.textContent = 'Combinação de progresso e paridade';
  right.appendChild(legend);

  // Índice (radial)
  const indiceItem = findIndiceItem(indicadorRadial);
  const idx01 = Number(indiceItem?.valor || 0);
  const size = computeRadialSizePx();
  const { name, value, nameOffset, valueOffset } = computeRadialFonts(size);

  const chartDiv = document.createElement('div');
  chartDiv.style.width  = `${size}px`;
  chartDiv.style.height = `${size}px`;
  left.appendChild(chartDiv);

  const radialOptions = {
    chart:  { type: 'radialBar', height: size, width: size, sparkline: { enabled: true } },
    series: [ Math.round(idx01 * 100) ],
    labels: [ 'Igualdade' ], // consistência com a página ODS-18
    colors: [ pickIsirColor01(idx01) ],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track:  { background: '#f3f4f6' },
        dataLabels: {
          name:  { offsetY: nameOffset,  fontSize: `${name}px`,  color: '#374151' },
          value: { offsetY: valueOffset, fontSize: `${value}px`, color: '#111827',
                   formatter: v => `${Math.round(v)}%` }
        }
      }
    },
    stroke: { lineCap: 'round' }
  };
  const radialChart = new ApexCharts(chartDiv, radialOptions);
  radialChart.render();
  _registerChart(radialContainer, radialChart);

  // Cards (Progresso / Amplitude / Indicadores) – ocupam 100% (3 colunas fluidas)
  const row = document.createElement('div');
  row.className = 'grid grid-cols-3 gap-2 w-full';
  right.appendChild(row);

  const itProg = indicadorRadial.find(i => /progresso/i.test(i?.label || ''));
  const itPari = indicadorRadial.find(i => /paridade/i.test(i?.label || ''));
  const paridade = (itPari && typeof itPari.valor === 'number') ? (1 - itPari.valor)
                   : (typeof sinteseData.paridade === 'number' ? sinteseData.paridade : null);
  const nIndic   = (sinteseData.nIndicadores != null) ? sinteseData.nIndicadores
                   : (sinteseData.indicadores ?? null);

  row.appendChild(makeStatCard('PROGRESSO', Number(itProg?.valor ?? null)));
  row.appendChild(makeStatCard('PARIDADE', Number(paridade ?? null)));

  // “Indicadores” como número absoluto (sem %). Se preferir em %, volte para pct().
//   const cardIndic = document.createElement('div');
//   cardIndic.className = 'px-3 py-2 rounded-lg border border-gray-200 shadow-sm text-center min-w-[72px] sm:min-w-[96px] bg-white';
//   cardIndic.innerHTML = `
//     <div class="text-[10px] tracking-wide uppercase text-gray-500">INDICADORES</div>
//     <div class="text-base sm:text-lg font-semibold">${(nIndic ?? '—')}</div>
//   `;
//   row.appendChild(cardIndic);

  // Garante respiro antes da série temporal (evita “aproximação” com a toolbar)
  try { document.getElementById(ids.serie)?.classList.add('mt-4'); } catch (_) {}
  } else {
    // Layout padrão — ou grid4 responsivo
    if (layout === 'grid4') {
      radialContainer.classList.add('grid', 'grid-cols-2', 'gap-3', 'md:grid-cols-2', 'lg:grid-cols-4');
    } else {
      radialContainer.classList.add('flex', 'flex-wrap', 'justify-center', 'gap-4');
    }
    const size  = computeRadialSizePx();
    const fonts = computeRadialFonts(size);
    const createdRadials = [];

    indicadorRadial.forEach(item => {
      const chartDiv = document.createElement('div');
      chartDiv.style.width  = `${size}px`;
      chartDiv.style.height = `${size}px`;
      radialContainer.appendChild(chartDiv);

      const valor = Number(item.valor) || 0;
      const color = item.cor || '#999999';
      const label = item.label || '';

      const radialOptions = {
        chart:  { type: 'radialBar', height: size, width: size },
        series: [ Math.round(valor * 100) ],
        labels: [ label ],
        colors: [ color ],
        plotOptions: {
          radialBar: {
            hollow: { size: '52%' },
            track:  { background: '#f3f4f6' },
            dataLabels: {
              name:  { offsetY: fonts.nameOffset,  fontSize: `${fonts.name}px`,  color: '#6b7280' },
              value: { offsetY: fonts.valueOffset, fontSize: `${fonts.value}px`, color: '#111827',
                       formatter: (v) => `${Math.round(v)}%` }
            }
          }
        },
        stroke: { lineCap: 'round' }
      };

      try {
        const radialChart = new ApexCharts(chartDiv, radialOptions);
        radialChart.render();
        createdRadials.push(radialChart);
      } catch (err) { console.error('Erro ao criar radial', err); }
    });

    _chartsByContainer.set(radialContainer, createdRadials);
  }

  // ---------------------- SÉRIE TEMPORAL ----------------------
  if (serieTemporal && Array.isArray(serieTemporal.series)) {
    // mapeia cores por nome (quando aplicável)
    const colorByName = {};
    indicadorRadial.forEach(it => { if (it?.label && it?.cor) colorByName[it.label] = it.cor; });

    // Paleta: fixa (seriesColor) OU por grupo (fallback cinza)
    const seriesColor = opts.seriesColor;
    const colors = seriesColor
      ? serieTemporal.series.map(() => seriesColor)
      : serieTemporal.series.map(s => colorByName[s.name] || '#999999');

    const xCategories = serieTemporal.categorias || serieTemporal.categories || [];

    const serieOptions = {
      chart: { type: 'line', height: 360, toolbar: { show: true, tools: { download: true } } },
      series: serieTemporal.series,
      xaxis: { categories: xCategories, title: { text: 'Ano' } },
      yaxis: {
        title: { text: 'Nível de Progresso (%)' },
        labels: {
          formatter(value) {
            if (typeof value === 'number') return (value * 100).toFixed(1) + '%';
            return String(value);
          }
        }
      },
      colors,
      stroke:  { curve: 'smooth', width: 2 },
      markers: { size: 4 },
      legend:  { position: 'top' },
      grid:    { borderColor: '#e5e7eb' },
      title:   { text: '', align: 'center', style: { fontSize: '16px' } }
    };

    try {
      const serieChart = new ApexCharts(serieContainer, serieOptions);
      serieChart.render();
      _registerChart(serieContainer, serieChart);
    } catch (err) { console.error('Erro ao criar série temporal', err); }
  } else {
    console.warn('renderizarSintese: serieTemporal ausente ou mal formatada', serieTemporal);
  }

  // nada a retornar
}
