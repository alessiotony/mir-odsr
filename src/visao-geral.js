// visao-geral.js
import { renderizarSintese } from './renderizadores/renderSintese.js';
import { loadJSON } from './data/loaders.js';

/* ========= helpers ========= */
const toComma = s => String(s).replace(/\./g, ',');
const fmtInt = x => (typeof x === 'number' ? new Intl.NumberFormat('pt-BR').format(x) : '—');
const fmtPct01 = (x, dec = 1) => (typeof x === 'number' ? toComma((x * 100).toFixed(dec)) + '%' : '—');

// 2.000 -> 2,0 mil | 200.000.000 -> 200,0 mi | 1,5 bi | 2,1 tri
function fmtCompactBR(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const oneDec = v => toComma(v.toFixed(1));
  if (abs >= 1_000_000_000_000) return `${sign}${oneDec(abs / 1_000_000_000_000)} tri`;
  if (abs >= 1_000_000_000)     return `${sign}${oneDec(abs / 1_000_000_000)} bi`;
  if (abs >= 1_000_000)         return `${sign}${oneDec(abs / 1_000_000)} mi`;
  if (abs >= 1_000)             return `${sign}${oneDec(abs / 1_000)} mil`;
  return fmtInt(n);
}

// Classe de cor para célula de % (0..100)
function pctClass(v){
  if (v == null || isNaN(v)) return '';
  if (v < 50) return 'pct-critico';
  if (v < 75) return 'pct-atencao';
  if (v < 90) return 'pct-regular';
  return 'pct-alto';
}

// mistura cor com branco para “clarear” de acordo com o valor (0–100)
function mixWithWhite(hex, weight/*0..1*/){
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16), g = parseInt(c.substring(2,4),16), b = parseInt(c.substring(4,6),16);
  const w = 255;
  const rr = Math.round(r*(1-weight) + w*weight);
  const gg = Math.round(g*(1-weight) + w*weight);
  const bb = Math.round(b*(1-weight) + w*weight);
  const h = n => n.toString(16).padStart(2,'0');
  return `#${h(rr)}${h(gg)}${h(bb)}`;
}

/* ========= controller ========= */
export class VisaoGeralController {
  constructor() {
    this.selectors = {};
    this.data = null;
    this.localidades = [];
    this.defaultLocalidadeId = 'BR';

    this.odsModo = 'heatmap'; // padrão = mapa de calor (transposto)
    this._tblState = null;
  }
  ensureHeaderLocalidadeSlot(){
  // monta o slot no header (dentro do placeholder, se existir),
  // e cai para body como fallback (segue fixo via CSS).
  const placeholder = document.getElementById('header-placeholder') || document.body;
  let slot = document.getElementById('header-localidade-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'header-localidade-slot';
    slot.className = 'header-localidade-slot';
    placeholder.appendChild(slot);
  }
  return slot;
}

mountHeaderLocalidadeSelect(){
  if (typeof TomSelect === 'undefined') return; // tolerância
  const slot = this.ensureHeaderLocalidadeSlot();

  // evita recriar
  if (this.tomSelectHeader) return;

  // cria um <select> exclusivo para o header
  const sel = document.createElement('select');
  sel.id = 'seletor-localidade-header';
  sel.setAttribute('aria-label','Selecionar localidade');
  slot.appendChild(sel);

  // mesmas opções do seletor da hero
  const options = (this.localidades || []).map(loc => ({
    value: String(loc.id),
    text: `${'\u00A0'.repeat((loc.nivel || 0) * 4)}${loc.nome}`,
    nome: loc.nome, uf: loc.uf || '', nivel: loc.nivel || 0
  }));

  this.tomSelectHeader = new TomSelect(sel, {
    options,
    valueField: 'value', labelField: 'text',
    searchField: ['nome','uf','text'],
    placeholder: 'Brasil', allowEmptyOption: true,
    maxOptions: 200, maxItems: 1, create: false, diacritics: true,
    dropdownParent: 'body',
    render: {
      option: (d) => `<div class="text-sm">${d.text}${d.uf ? ` · ${d.uf}` : ''}</div>`,
      item:   (d) => `<div class="text-base">${d.nome}${d.uf ? ` · ${d.uf}` : ''}</div>`,
    }
  });

  // sincronização bidirecional (sem loop)
  let syncing = false;
  const syncTo = (from, to) => {
    from.on('change', (val) => {
      if (syncing) return;
      syncing = true;
      try { to.setValue(val || '', true); } finally { syncing = false; }
      this.updateView();
    });
  };
  if (this.tomSelect)  syncTo(this.tomSelect,  this.tomSelectHeader);
  syncTo(this.tomSelectHeader, this.tomSelect);

  // valor inicial (BR, se existir)
  const def = (this.tomSelect?.getValue && this.tomSelect.getValue()) || this.defaultLocalidadeId || '';
  if (def) this.tomSelectHeader.setValue(def, true);
}


  async init() {
    this.setupSelectors();
    await this.loadData();
    await this.populateFilters();
    this.addEventListeners();
    await this.updateView();
  }

  setupSelectors() {
    // KPIs na HERO (inclusive composição por grupo)
    this.$ = {
      kIndicadores:  document.querySelector('[data-kpi="indicadores"]'),
      kObjetivos:    document.querySelector('[data-kpi="objetivos"]'),
      kMetas:        document.querySelector('[data-kpi="metas"]'),
      kPopulacao:    document.querySelector('[data-kpi="populacao"]'),
      kPopNegra:     document.querySelector('[data-kpi="pop_negra"]'),
      kPopBranca:    document.querySelector('[data-kpi="pop_branca"]'),
      kPopIndigena:  document.querySelector('[data-kpi="pop_indigena"]'),
      kPopAmarela:   document.querySelector('[data-kpi="pop_amarela"]'),

      localidade:    document.getElementById('seletor-localidade'),

      graficoRadial: document.getElementById('grafico-progresso-racial'),
      graficoSerie:  document.getElementById('grafico-evolucao-progresso'),
      graficoOds:    document.getElementById('grafico-progresso-ods'),

      textoIntro:    document.getElementById('texto-introducao-visao-geral'),
      textoOds:      document.getElementById('texto-sintese-ods'),
      textoTab:      document.getElementById('texto-sintese-tabela'),
      textoSerie:    document.getElementById('texto-sintese-serie-temporal'),

      tabelaWrap:    document.getElementById('tabela-indicadores-container'),
    };
  }

  async loadData() {
    // cacheados (memória + localStorage)
    [this.data, this.localidades] = await Promise.all([
      loadJSON('visaoGeral'),
      loadJSON('localidades')
    ]);

    // KPIs básicos
    const k = this.data?.kpis || {};
    if (this.$.kIndicadores) this.$.kIndicadores.textContent = k.indicadores ?? '—';
    if (this.$.kObjetivos)   this.$.kObjetivos.textContent   = k.objetivos   ?? '—';
    if (this.$.kMetas)       this.$.kMetas.textContent       = k.metas       ?? '—';
    if (this.$.kPopulacao)   this.$.kPopulacao.textContent   = fmtCompactBR(k.populacao);

    // composição por grupo — **na HERO**
    if (this.$.kPopNegra)    this.$.kPopNegra.textContent    = fmtPct01(k.pop_negra);
    if (this.$.kPopBranca)   this.$.kPopBranca.textContent   = fmtPct01(k.pop_branca);
    if (this.$.kPopIndigena) this.$.kPopIndigena.textContent = fmtPct01(k.pop_indigena);
    if (this.$.kPopAmarela)  this.$.kPopAmarela.textContent  = fmtPct01(k.pop_amarela);
  }

  async populateFilters() {
    const toText = (loc) => `${'\u00A0'.repeat((loc.nivel || 0) * 4)}${loc.nome}`;
    if (this.tomSelect) { this.tomSelect.destroy(); this.tomSelect = null; }
    if (this.$.localidade) this.$.localidade.innerHTML = `<option value=""></option>`;

    if (typeof TomSelect !== 'undefined' && this.$.localidade) {
      this.tomSelect = new TomSelect(this.$.localidade, {
        options: this.localidades.map(loc => ({
          value: String(loc.id), text: toText(loc),
          nome: loc.nome, uf: loc.uf || '', nivel: loc.nivel || 0
        })),
        valueField: 'value', labelField: 'text',
        searchField: ['nome','uf','text'],
        placeholder: 'Brasil', allowEmptyOption: true,
        maxOptions: 200, maxItems: 1, create: false, diacritics: true,
        dropdownParent: 'body',
        render: {
          option: (d) => `<div class="text-sm">${d.text}${d.uf ? ` · ${d.uf}` : ''}</div>`,
          item:   (d) => `<div class="text-base">${d.nome}${d.uf ? ` · ${d.uf}` : ''}</div>`,
        }
      });
      const hasBR = this.localidades.find(l => String(l.id) === this.defaultLocalidadeId);
      if (hasBR) this.tomSelect.setValue(this.defaultLocalidadeId, true);
      this.mountHeaderLocalidadeSelect();
      this.$.localidade?.closest('.max-w-xl')?.classList?.add('hide-hero-localidade');
    }
  }

  addEventListeners() {
    if (this.tomSelect) this.tomSelect.on('change', () => this.updateView());
    else if (this.$.localidade) this.$.localidade.addEventListener('change', () => this.updateView());
  }

  async updateView() {
    const d = this.data;
    if (!d) return;

    // === Radial + Série temporal (mantém paleta) ===
    try {
      renderizarSintese({
        titulo: d.indicadorRadial?.titulo,
        indicadorRadial: d.indicadorRadial?.data || [],
        serieTemporal: d.serieTemporal || {}
      }, {
        ids: { radial: 'grafico-progresso-racial', serie: 'grafico-evolucao-progresso' }
      });
    } catch (e) {
      console.warn('Falha em renderizarSintese', e);
    }

    // === TEXTOS DINÂMICOS (agora realmente atribuídos) ===
    const radiais = d.indicadorRadial?.data || [];
    const serie   = d.serieTemporal || {};
    if (this.$.textoIntro) this.$.textoIntro.innerHTML = this.narrarIntroducao(radiais, serie);
    if (this.$.textoSerie) this.$.textoSerie.innerHTML = this.narrarSerieTemporal(serie);

    // === ODS (padrão = mapa de calor transposto; toggle para barras) ===
    this.renderOdsToolbar();
    this.renderOdsChart();
    if (this.$.textoOds) this.$.textoOds.innerHTML = this.narrarOds(this.data.graficoOds);

    // === Tabela com busca / filtro por ODS / ordenação ===
    if (d.tabelaIndicadores && this.$.tabelaWrap) {
      this.renderTabelaIndicadores(d.tabelaIndicadores);
      this.attachTabelaInteracao();
      if (this.$.textoTab) this.$.textoTab.innerHTML = this.narrarTabela(d.tabelaIndicadores);
    }
  }

  /* ---------- ODS ---------- */

  updateOdsToolbarActive(){
    const bar = this.$.graficoOds?.previousElementSibling;
    if (!bar || !bar.classList.contains('ods-toolbar')) return;
    bar.querySelectorAll('button[data-ods-modo]').forEach(btn=>{
      const modo = btn.getAttribute('data-ods-modo');
      const active = (modo === this.odsModo);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  renderOdsToolbar() {
    const host = this.$.graficoOds;
    if (!host) return;
    if (host.previousElementSibling && host.previousElementSibling.classList?.contains('ods-toolbar')) return;

    const bar = document.createElement('div');
    bar.className = 'ods-toolbar flex items-center gap-2 mb-2';
    bar.innerHTML = `
      <span class="text-sm text-primaria">Visualização:</span>
      <div class="botoes-modo">
        <button type="button" data-ods-modo="heatmap" class="px-2 py-1 text-sm rounded border bg-white">Mapa de calor</button>
        <button type="button" data-ods-modo="barras"   class="px-2 py-1 text-sm rounded border bg-white">Barras</button>
      </div>
    `;
    host.parentNode.insertBefore(bar, host);
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-ods-modo]');
      if (!btn) return;
      const modo = btn.getAttribute('data-ods-modo');
      if (modo && modo !== this.odsModo) {
        this.odsModo = modo;
        this.renderOdsChart();
      }
    });
    this.updateOdsToolbarActive();
  }

  renderOdsChart() {
    const host = this.$.graficoOds;
    if (!host) return;
    host.innerHTML = '';

    this.updateOdsToolbarActive();

    const ods = this.data?.graficoOds || {};
    const grupos = (ods.series || []).map(s => s.name); // nomes dos grupos
    const cats   = ods.categories || [];                // ODS1, ODS2, ...
    const labels = ods.labels || [];                    // Erradicação da Pobreza, ...

    // Paleta por grupo (a mesma do radial)
    const corPorGrupo = {};
    (this.data?.indicadorRadial?.data || []).forEach(it => { corPorGrupo[it.label] = it.cor; });

    if (this.odsModo === 'barras') {
      // BARRAS HORIZONTAIS (ODS no eixo Y; cores por grupo)
      const cores = (ods.series || []).map(s => corPorGrupo[s.name] || '#999');
      const catFull = cats.map((c,i) => labels[i] ? `${c} — ${labels[i]}` : c);

      const options = {
        chart: { type: 'bar', height: 460 },
        plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
        dataLabels: { enabled: false, formatter: v => `${v}%` },
        xaxis: { categories: catFull, max: 100 },
        series: ods.series || [],
        colors: cores,
        legend: { position: 'top' },
        tooltip: { y: { formatter: v => `${v}%` } }
      };
      new ApexCharts(host, options).render();
      return;
    }

    // HEATMAP TRANSPOSTO — Linhas = ODS; Colunas = grupos raciais
    const series = cats.map((cat, i) => {
      const name = labels[i] ? `${cat} — ${labels[i]}` : cat;
      const data = grupos.map(g => {
        const s = (ods.series || []).find(ss => ss.name === g);
        const v = s?.data?.[i] ?? null; // 0..100
        const base = corPorGrupo[g] || '#999999';
        // valor 0 -> claro; 100 -> cor base
        const weight = v == null ? 0.85 : Math.max(0, Math.min(0.85, 0.85 - 0.85*(v/100)));
        const fillColor = mixWithWhite(base, weight);
        return { x: g, y: v, fillColor };
      });
      return { name, data };
    });

    const options = {
      chart: { type: 'heatmap', height: 460 },
      dataLabels: { enabled: true, formatter: v => (v==null ? '—' : `${v}%`) },
      xaxis: { type: 'category', categories: grupos },
      tooltip: { y: { formatter: v => (v==null ? '—' : `${v}%`) } },
      plotOptions: { heatmap: { shadeIntensity: 0.5, colorScale: { ranges: [] } } }, // ranges vazias p/ usarmos fillColor por ponto
      series
    };
    new ApexCharts(host, options).render();
  }

  narrarOds(ods) {
    if (!ods?.series?.length) return '';
    const cats = ods.categories || [];
    const labels = ods.labels || [];
    const medias = cats.map((c, i) => {
      const vals = (ods.series || []).map(s => s.data?.[i] ?? 0);
      const media = vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
      return { i, media };
    });
    const max = medias.reduce((a,b)=> a.media>b.media ? a : b, {media:-Infinity});
    const min = medias.reduce((a,b)=> a.media<b.media ? a : b, {media: Infinity});

    const gaps = cats.map((c, i) => {
      const vals = (ods.series || []).map(s => s.data?.[i] ?? 0);
      return { i, d: Math.max(...vals) - Math.min(...vals) };
    });
    const worst = gaps.reduce((a,b)=> a.d>b.d ? a : b, {d:-Infinity});
    const nm = i => labels[i] ? `${cats[i]} — ${labels[i]}` : cats[i];

    return `
      <p>
        Maior média em <strong>${nm(max.i)}</strong> (~${toComma(max.media.toFixed(1))}%),
        menor em <strong>${nm(min.i)}</strong> (~${toComma(min.media.toFixed(1))}%).
        Maior disparidade entre grupos em <strong>${nm(worst.i)}</strong> (${toComma(worst.d.toFixed(1))} p.p.).
      </p>
    `;
  }

  /* ---------- Tabela ---------- */

  renderTabelaIndicadores(tabela) {
  const wrap = this.$.tabelaWrap;
  if (!wrap) return;
  wrap.innerHTML = '';

  /* Controles */
  const controls = document.createElement('div');
  controls.className = 'flex flex-wrap gap-2 items-center mb-3';
  controls.innerHTML = `
    <input id="tbl-busca" type="search" placeholder="Buscar indicador ou ODS..."
           class="px-3 py-2 border rounded w-full md:w-80" />
    <select id="tbl-ods" class="px-3 py-2 border rounded">
      <option value="">Todos os ODS</option>
      ${(tabela.linhas || [])
        .map(l => l.ods).filter(Boolean)
        .filter((v,i,a)=>a.indexOf(v)===i)
        .sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'))
        .map(v => `<option value="${String(v)}">ODS ${String(v)}</option>`).join('')}
    </select>
  `;
  wrap.appendChild(controls);

  /* Legenda de cores (se já não tiver incluído) */
  const legend = document.createElement('div');
  legend.className = 'tbl-legend';
  legend.innerHTML = `
    <span class="sw critico"></span> <span>&lt; 50% crítico</span>
    <span class="sw atencao"></span> <span>&lt; 75%</span>
    <span class="sw regular"></span> <span>&lt; 90%</span>
    <span class="sw alto"></span> <span>&ge; 90%</span>
  `;
  wrap.appendChild(legend);

  /* Wrapper com rolagem horizontal */
  const scroller = document.createElement('div');
  scroller.className = 'tbl-scroll';
  wrap.appendChild(scroller);

  /* Tabela */
  const cols = (tabela.colunas || ['Indicador','Brancos','Negros','Indígenas','Amarelos']);
  const table = document.createElement('table');
  table.className = 'min-w-full divide-y divide-gray-200 text-sm text-left border border-gray-200 rounded-lg overflow-hidden';
  table.innerHTML = `
    <thead class="bg-gray-100">
      <tr>
        ${cols.map((c,i)=>`
          <th class="px-3 py-2 font-semibold text-gray-700 select-none cursor-pointer ${i===0?'sticky-col text-right':''}" data-col-idx="${i}">
            <span>${c}</span>
            <span class="ml-1 text-gray-400 sort-indicator">↕</span>
          </th>`).join('')}
      </tr>
    </thead>
    <tbody></tbody>
  `;
  scroller.appendChild(table);

  /* Mapeia colunas -> chaves */
  const schema = cols.map(lbl => {
    const L = lbl.toLowerCase();
    if (L.includes('branco'))   return { key:'brancos',   numeric:true };
    if (L.includes('negro'))    return { key:'negros',    numeric:true };
    if (L.includes('indígena') || L.includes('indigena')) return { key:'indigenas', numeric:true };
    if (L.includes('amarelo'))  return { key:'amarelos',  numeric:true };
    return { key:'indicador', numeric:false }; // primeira coluna
  });

  const tbody = table.querySelector('tbody');

  /* helper de cor de célula (% 0..100) */
  const pctClass = (v) => {
    if (v == null || isNaN(v)) return '';
    if (v < 50) return 'pct-critico';
    if (v < 75) return 'pct-atencao';
    if (v < 90) return 'pct-regular';
    return 'pct-alto';
  };

  const renderRows = (linhas) => {
    tbody.innerHTML = linhas.map(l => {
      const tds = schema.map((s, idx) => {
        const v = l[s.key];

        // primeira coluna: sticky + alinhada à direita
        if (!s.numeric) {
          return `<td class="px-3 py-2 text-gray-800 sticky-col text-right">${v ?? '—'}</td>`;
        }

        // demais colunas: % coloridas
        if (typeof v === 'number') {
          const cls = pctClass(v);
          return `<td class="px-3 py-2 text-gray-800 pct ${cls}" data-sort="${v}">${toComma(v.toFixed(0))}%</td>`;
        }
        return `<td class="px-3 py-2 text-gray-800">—</td>`;
      }).join('');
      // mantém zebra para o bg do sticky herdar
      return `<tr class="odd:bg-white even:bg-gray-50" data-ods="${l.ods || ''}">${tds}</tr>`;
    }).join('');
  };

  // estado da tabela
  this._tblState = {
    allRows: [...(tabela.linhas || [])],
    filtered: [...(tabela.linhas || [])],
    schema,
    cols,
    sort: { idx: null, dir: 1 }, // 1 asc, -1 desc
    renderRows,
    tbody
  };

  // render inicial
  renderRows(this._tblState.filtered);

  // ordenação por coluna
  table.querySelectorAll('thead th').forEach(th => {
    th.addEventListener('click', () => {
      const idx = Number(th.getAttribute('data-col-idx'));
      this.sortTableByColumn(idx);
    });
  });
}


  applyTableFilters() {
    const q = (document.getElementById('tbl-busca')?.value || '').toLowerCase().trim();
    const fOds = (document.getElementById('tbl-ods')?.value || '').trim();

    const rows = this._tblState.allRows.filter(l => {
      const txt = (l.indicador || '').toLowerCase();
      const okQ = !q || txt.includes(q) || String(l.ods || '').includes(q);
      const okO = !fOds || String(l.ods || '') === fOds;
      return okQ && okO;
    });

    this._tblState.filtered = rows;
  }

  sortTableByColumn(idx) {
    const st = this._tblState;
    if (!st) return;

    // alterna direção se clicar de novo na mesma coluna
    if (st.sort.idx === idx) st.sort.dir *= -1;
    else { st.sort.idx = idx; st.sort.dir = 1; }

    const { key, numeric } = st.schema[idx];

    st.filtered.sort((a,b) => {
      const va = a[key], vb = b[key];
      if (numeric) return ((va ?? -Infinity) - (vb ?? -Infinity)) * st.sort.dir;
      // texto
      return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR') * st.sort.dir;
    });

    st.renderRows(st.filtered);

    // atualiza indicador ↕ / ↑ / ↓
    const ths = st.tbody.parentElement.querySelectorAll('thead th');
    ths.forEach((th, i) => {
      const span = th.querySelector('.sort-indicator');
      if (!span) return;
      if (i !== st.sort.idx) span.textContent = '↕';
      else span.textContent = st.sort.dir === 1 ? '↑' : '↓';
    });
  }

  attachTabelaInteracao() {
    const busca = document.getElementById('tbl-busca');
    const sel   = document.getElementById('tbl-ods');
    const apply = () => {
      this.applyTableFilters();
      // mantém a ordenação atual (se houver)
      if (this._tblState.sort.idx != null) this.sortTableByColumn(this._tblState.sort.idx);
      else this._tblState.renderRows(this._tblState.filtered);
    };
    busca?.addEventListener('input', apply);
    sel?.addEventListener('change', apply);
  }

  /* ---------- narrativa rápida da tabela ---------- */
  narrarTabela(tabela) {
    const L = tabela?.linhas || [];
    if (!L.length) return '';
    const diffs = L.map(l => {
      const nums = ['brancos','negros','indigenas','amarelos'].map(k => l[k]).filter(v => typeof v === 'number');
      const range = nums.length ? (Math.max(...nums) - Math.min(...nums)) : 0;
      return { indicador: l.indicador || '—', range };
    });
    const max = diffs.reduce((a,b)=> a.range>b.range ? a : b, {range:-1});
    const min = diffs.reduce((a,b)=> a.range<b.range ? a : b, {range:Infinity});
    return `
      <p class="mt-2">
        Maior desigualdade em <strong>${max.indicador}</strong> (~${toComma(max.range.toFixed(1))} p.p.). 
        Menor diferença em <strong>${min.indicador}</strong> (~${toComma(min.range.toFixed(1))} p.p.).
      </p>
    `;
  }

  /* ---------- textos dinâmicos (intro + série) ---------- */
  getLocalidadeLabel(){
    const byTom = this.tomSelect?.getValue?.() ? this.tomSelect?.getItem?.(this.tomSelect.getValue())?.textContent : null;
    const bySelect = this.$.localidade?.selectedOptions?.[0]?.textContent?.trim();
    return (byTom || bySelect || 'Brasil').trim();
  }

  narrarIntroducao(radiais = [], serieTemporal = {}){
    if (!radiais.length) return '';
    const local = this.getLocalidadeLabel();
    const media = radiais.reduce((a,b)=>a+(b?.valor||0),0)/radiais.length;
    const ordenados = [...radiais].sort((a,b)=>b.valor-a.valor);
    const top = ordenados[0], bottom = ordenados[ordenados.length-1];
    const gapPP = ((top.valor - bottom.valor) * 100).toFixed(1).replace('.0','');
    const anos = serieTemporal.categorias || serieTemporal.categories || [];
    const ultimoAno = anos[anos.length-1] ?? '';

    // tendências simples (primeiro vs último ponto)
    const deltas = (serieTemporal.series||[]).map(s=>{
      const a = s.data?.[0] ?? 0, b = s.data?.[s.data.length-1] ?? 0;
      const d = (b-a)*100;
      const trend = Math.abs(d) < 0.5 ? 'estável' : (d>0 ? 'em evolução' : 'em queda');
      return {nome:s.name, d, trend};
    });
    const evol = deltas.filter(x=>x.trend==='em evolução').map(x=>x.nome);
    const queda = deltas.filter(x=>x.trend==='em queda').map(x=>x.nome);
    const est = deltas.filter(x=>x.trend==='estável').map(x=>x.nome);

    return `
      <p>
        Em <strong>${local}</strong> (${ultimoAno}), a média dos grupos é <strong>${(media*100).toFixed(0)}%</strong>.
        <strong>${top.label}</strong> lidera com <strong>${(top.valor*100).toFixed(0)}%</strong>, e
        <strong>${bottom.label}</strong> apresenta o menor nível (<strong>${(bottom.valor*100).toFixed(0)}%</strong>).
        A diferença entre extremos é de <strong>${gapPP} p.p.</strong>
      </p>
      <p class="mt-2">
        Tendência recente: 
        ${evol.length ? `<strong>em evolução</strong>: ${evol.join(', ')}` : 'sem grupos em evolução'}; 
        ${queda.length ? `<strong>em queda</strong>: ${queda.join(', ')}` : 'sem grupos em queda'}; 
        ${est.length ? `<strong>estáveis</strong>: ${est.join(', ')}` : 'sem grupos estáveis'}.
      </p>
    `;
  }

  narrarSerieTemporal(serieTemporal = {}){
    const series = serieTemporal.series || [];
    const anos = serieTemporal.categorias || serieTemporal.categories || [];
    if (!series.length || !anos.length) return '';

    const a0 = anos[0], aN = anos[anos.length-1];
    const analise = series.map(s=>{
      const first = s.data?.[0] ?? 0, last = s.data?.[s.data.length-1] ?? 0;
      const deltaPP = (last-first)*100;
      const slope = s.data && s.data.length>1 ? (last-first)/(s.data.length-1) : 0;
      const anosRest = Math.max(0, 2030 - (+aN || 2030));
      const proj2030 = Math.min(1, Math.max(0, last + slope*anosRest));
      return {nome:s.name, deltaPP, proj2030};
    });

    const maiorAlta = analise.reduce((a,b)=> (a.deltaPP>b.deltaPP)?a:b);
    const menorAlta = analise.reduce((a,b)=> (a.deltaPP<b.deltaPP)?a:b);
    const chegam = analise.filter(x=>x.proj2030>=1).map(x=>x.nome);
    const naoChegam = analise.filter(x=>x.proj2030<1).map(x=>`${x.nome} (~${(x.proj2030*100).toFixed(0)}%)`);

    return `
      <p><strong>${a0}–${aN}</strong>: maior avanço em <strong>${maiorAlta.nome}</strong> (+${maiorAlta.deltaPP.toFixed(1)} p.p.); 
      pior desempenho em <strong>${menorAlta.nome}</strong> (${menorAlta.deltaPP.toFixed(1)} p.p.).</p>
      <p class="mt-2">
        Mantido o ritmo, ${chegam.length ? `alcançam 100% até 2030: <strong>${chegam.join(', ')}</strong>` : 'nenhum grupo deve bater 100% até 2030'}.
        ${naoChegam.length ? `Outros podem ficar abaixo: ${naoChegam.join(', ')}.` : ''}
      </p>
    `;
  }
}
