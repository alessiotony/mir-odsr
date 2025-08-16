/* src/ods18.js — compatível com idTarget / idTarget18 e metadados em vários esquemas */

const COLORS = {
  Branca:  '#1d4ed8',
  Negra:   '#000000',
  'Indígena': '#15803d',
  Amarela: '#F1C40F',
  null:    '#cccccc'
};

const BANDS = [
  { name: 'Alerta',    from: 0.0,  to: 0.25, color: 'rgba(255,0,0,0.08)' },
  { name: 'Regular',   from: 0.25, to: 0.50, color: 'rgba(255,165,0,0.08)' },
  { name: 'Bom',       from: 0.50, to: 0.75, color: 'rgba(255,215,0,0.08)' },
  { name: 'Excelente', from: 0.75, to: 1.00, color: 'rgba(0,128,0,0.08)' }
];

const fmtPct = (x) => (x == null ? '—' : (x * 100).toFixed(0) + '%');
const clamp01 = (x) => Math.max(0, Math.min(1, x ?? 0));
const indicePrincipal = (amp, prog) => clamp01((1 - clamp01(amp)) * clamp01(prog));

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar ${path}`);
  return res.json();
}

/* --------- Normalização de esquemas --------- */
// Constrói uma chave canônica para a meta (ex.: "18.1"). Aceita vários formatos.
function keyFromMeta(meta) {
  // formatos possíveis: idTarget (1..10), idTarget18 (18.1..18.10), id_target18 (18.1)
  if (meta.idTarget18 != null) return String(meta.idTarget18);
  if (meta.id_target18 != null) return String(meta.id_target18);
  if (meta.idTarget != null)    return `18.${meta.idTarget}`;
  if (meta.id != null)          return `18.${meta.id}`; // fallback raro
  return '18.?';
}

// Nome da meta em qualquer esquema
function nameFromMeta(meta) {
  return meta.nameTarget18 ?? meta.name_target18 ?? meta.nameTarget ?? meta.name ?? '';
}

// Para exibição curta (ex.: "Meta 18.1 · Educação de Qualidade")
function labelFromMeta(meta) {
  const k = keyFromMeta(meta);
  const nm = nameFromMeta(meta);
  return `Meta ${k}${nm ? ` · ${nm}` : ''}`;
}

// Constrói dicionário a partir dos metadados (qualquer esquema)
function buildMetaDict(metasMetaJson) {
  const dict = new Map();
  metasMetaJson.forEach(m => {
    const k = keyFromMeta(m);
    dict.set(k, {
      nome: nameFromMeta(m),
      desc: m.description_goal18 ?? m.description
    });
  });
  return dict;
}

// Ordenação numérica por chave "18.x"
function sortByKey18(metas) {
  return [...metas].sort((a, b) => {
    const ka = parseFloat(keyFromMeta(a).split('18.')[1] ?? keyFromMeta(a));
    const kb = parseFloat(keyFromMeta(b).split('18.')[1] ?? keyFromMeta(b));
    return (ka ?? 0) - (kb ?? 0);
  });
}

/* --------- UI --------- */

function paintParticles() {
  const container = document.getElementById('particles-hero');
  if (!container) return;
  tsParticles.load('particles-hero', {
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    particles: { number: { value: 40 }, opacity: { value: 0.4 }, size: { value: { min: 1, max: 3 } }, move: { enable: true, speed: 0.4 } },
    links: { enable: true, distance: 130, opacity: 0.4, width: 1 }
  });
}

function kpisGlobais(global) {
  // campos existem no JSON novo
  document.getElementById('kpi-progresso').textContent = fmtPct(global.progresso);
  document.getElementById('kpi-paridade').textContent = fmtPct(global.paridade);
  document.getElementById('kpi-indicadores').textContent = String(global.nIndicadores ?? '—');

  const idx = global.indice ?? indicePrincipal(global.paridade, global.progresso);

  new ApexCharts(document.querySelector('#radial-indice'), {
    chart: { type: 'radialBar', height: 275, sparkline: { enabled: true } },
    series: [clamp01(idx) * 100],
    labels: ['Índice'],
    plotOptions: {
      radialBar: {
        hollow: { size: '58%' },
        dataLabels: {
          name: { offsetY: 18 },
          value: { fontSize: '28px', formatter: (v) => `${Math.round(v)}%` }
        }
      }
    },
    colors: ['#16a34a']
  }).render();

  const risco = global.paridade > 0.25 ? 'atenção: desigualdades relevantes entre grupos.' :
                global.paridade > 0.15 ? 'há diferença entre grupos que merece cuidado.' :
                'boa convergência entre grupos.';
  document.getElementById('texto-global').innerHTML =
    `Leitura rápida: ${risco} Manter o foco nos grupos mais atrás eleva o índice sem perder progresso.`;
}

function tabelaMetas(metas, metasMetaJson) {
  const tbody = document.getElementById('tabela-metas');
  tbody.innerHTML = '';

  const metaDict = buildMetaDict(metasMetaJson);
  const ordenadas = sortByKey18(metas);

  ordenadas.forEach(meta => {
    const idx = meta.indice ?? (meta.paridade != null && meta.progressoMedio != null
      ? indicePrincipal(meta.paridade, meta.progressoMedio) : null);

    const k = keyFromMeta(meta);
    const extra = metaDict.get(k);
    const semDados = (meta.progressoMedio == null) || (meta.paridade == null);

    const tr = document.createElement('tr');
    tr.className = semDados ? 'opacity-60' : '';
    tr.innerHTML = `
      <td class="px-4 py-3">
        <div class="font-semibold">${labelFromMeta(meta)}</div>
        ${extra?.desc ? `<div class="text-xs text-texto-sutil max-w-prose mt-1">${extra.desc}</div>` : ''}
      </td>
      <td class="px-4 py-3">${fmtPct(meta.progressoMedio)}</td>
      <td class="px-4 py-3">${fmtPct(meta.paridade)}</td>
      <td class="px-4 py-3">${fmtPct(idx)}</td>
      <td class="px-4 py-3">
        ${semDados
          ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600"><i class="fa fa-minus-circle"></i> Sem dados</span>'
          : (idx >= 0.75
              ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700"><i class="fa fa-check-circle"></i> Excelente</span>'
              : (idx >= 0.5
                  ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700"><i class="fa fa-circle"></i> Bom/Regular</span>'
                  : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700"><i class="fa fa-warning"></i> Alerta</span>'))}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function graficoMetas(metas) {
  const racas = ['Amarela', 'Branca', 'Indígena', 'Negra'];
  const cats = sortByKey18(metas).map(labelFromMeta);

  const series = racas.map(raca => ({
    name: raca,
    data: metas.map(m => {
      const dr = (m.dadosRaciais || []).find(d => d.raca === raca);
      return dr && dr.valor != null
        ? { x: dr.valor, y: labelFromMeta(m), metaId: keyFromMeta(m) }
        : { x: null, y: labelFromMeta(m), metaId: keyFromMeta(m) };
    })
  }));

  new ApexCharts(document.querySelector('#grafico-metas'), {
    chart: { type: 'scatter', height: 520, toolbar: { show: true } },
    series,
    xaxis: {
      min: 0, max: 1, tickAmount: 10,
      labels: { formatter: (v) => (v * 100).toFixed(0) + '%' }
    },
    yaxis: {
      categories: cats.reverse(),
      labels: { style: { fontSize: '12px' } }
    },
    markers: { size: 6 },
    colors: racas.map(r => COLORS[r]),
    legend: { position: 'top' },
    grid: { xaxis: { lines: { show: true } } },
    annotations: {
      xaxis: BANDS.map(b => ({
        x: b.from, x2: b.to, fillColor: b.color, opacity: 1,
        label: { text: b.name, style: { fontSize: '10px' } }
      }))
    },
    tooltip: {
      y: { formatter: (_, opts) => opts.w.globals.seriesNames[opts.seriesIndex] },
      x: { formatter: (v) => v == null ? '—' : fmtPct(v) }
    }
  }).render();
}

/* --------- Inicialização --------- */
(function init() {
  paintParticles();

  Promise.all([
    loadJSON('./data/ods18_dados.json'),  // novo esquema com idTarget/nameTarget (e globais) 
    loadJSON('./data/ods18_metas.json')   // novo esquema com idTarget/name/description
  ])
  .then(([dados, metasMeta]) => {
    // Globais
    kpisGlobais(dados.global);

    // Metas (compatível com idTarget ou idTarget18)
    const metas = (dados.metas || []).map(m => ({
      ...m,
      // garante leitura de nome em qualquer esquema
      nameTarget18: m.nameTarget18 ?? m.nameTarget ?? m.name,
      idTarget18:   m.idTarget18   ?? m.idTarget   ?? m.id
    }));
    const ordenadas = sortByKey18(metas);

    tabelaMetas(ordenadas, metasMeta);
    graficoMetas(ordenadas);
  })
  .catch(err => {
    console.error(err);
    const el = document.getElementById('texto-global');
    if (el) el.textContent = 'Não foi possível carregar os dados do ODS 18.';
  });
})();
