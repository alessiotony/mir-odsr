// visao-geral.js
import { renderizarSintese } from './renderizadores/renderSintese.js';
import { loadJSON } from './data/loaders.js';

/* ========= helpers ========= */
const toComma = s => String(s).replace(/\./g, ',');
const fmtInt = x => (typeof x === 'number' ? new Intl.NumberFormat('pt-BR').format(x) : '—');
const fmtPct01 = (x, dec = 1) => (typeof x === 'number' ? toComma((x * 100).toFixed(dec)) + '%' : '—');
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

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

/* === Faixas de desempenho (única fonte de verdade) === */
const PCT_BANDS = [
  { key:'critico', label:'< 50% crítico',                 min: 0,   max: 50,       bg:'#fee2e2', text:'#7f1d1d' },
  { key:'atencao', label:'≥ 50% e < 75% atenção',         min: 50,  max: 75,       bg:'#fef9c3', text:'#7c2d12' },
  { key:'regular', label:'≥ 75% e < 90% regular',         min: 75,  max: 90,       bg:'#e0f2fe', text:'#0c4a6e' },
  { key:'alto',    label:'≥ 90% bom',                     min: 90,  max: 100.0001, bg:'#bfdbfe', text:'#1e3a8a' },
];

function bandFor(v){
  if (v == null || isNaN(v)) return null;
  return PCT_BANDS.find(b => v >= b.min && v < b.max) || PCT_BANDS[PCT_BANDS.length-1];
}
function pctClass(v){ const b = bandFor(v); return b ? `pct-${b.key}` : ''; }
function heatmapLabelColor(v){ const b = bandFor(v); return b ? b.text : '#64748b'; }
function apexRangesFromBands(){
  return PCT_BANDS.map(b => ({ from: b.min, to: b.max - 0.0001, color: b.bg, name: b.label }));
}

/* ========= controller ========= */
export class VisaoGeralController {
  constructor() {
    this.$ = {};
    this.data = null;
    this.localidades = [];
    this.defaultLocalidadeId = 'BR';

    this.odsModo = 'heatmap'; // padrão = mapa de calor (transposto)
    this._tblState = null;
  }

  async init() {
    this.setupSelectors();
    this.wireModalMetodologia();
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

      // filtros
      localidade:    document.getElementById('seletor-localidade'),

      // síntese à esquerda (resumo)
      resumoCard:    document.getElementById('card-resumo-geral'),
      rankings:      document.getElementById('cards-ranking'),
      metodologia:   document.getElementById('texto-metodologia-ods'),
      metodologiaCard: document.getElementById('metodologia-card'),
      modalMetodo:   document.getElementById('modal-metodo'),
      modalMetodoContent: document.getElementById('modal-metodo-content'),

      // gráficos
      graficoRadial: document.getElementById('grafico-progresso-racial'),
      graficoSerie:  document.getElementById('grafico-evolucao-progresso'),
      graficoOds:    document.getElementById('grafico-progresso-ods'),

      // textos
      textoIntro:    document.getElementById('texto-introducao-visao-geral'),
      textoOds:      document.getElementById('texto-sintese-ods'),
      textoTab:      document.getElementById('texto-sintese-tabela'),
      textoSerie:    document.getElementById('texto-sintese-serie-temporal'),
      tituloTabela:  document.getElementById('titulo-tabela-indicadores'),

      // tabela
      tabelaWrap:    document.getElementById('tabela-indicadores-container'),
    };
  }

  async loadData() {
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

      // seletor espelhado no header
      // this.mountHeaderLocalidadeSelect();
    }
  }

  addEventListeners() {
    if (this.tomSelect) this.tomSelect.on('change', () => this.updateView());
    else if (this.$.localidade) this.$.localidade.addEventListener('change', () => this.updateView());
  }

  async updateView() {
    const d = this.data;
    if (!d) return;

    // === Resumo Geral (esquerda) ===
    this.renderResumoGeral(d.indicadorRadial);

    // === Radial + Série temporal ===
    try {
      renderizarSintese({
        titulo: d.indicadorRadial?.titulo,
        indicadorRadial: d.indicadorRadial?.data || [],
        serieTemporal: d.serieTemporal || {}
      }, {
        ids: { radial: 'grafico-progresso-racial', serie: 'grafico-evolucao-progresso' }
      });
    } catch (e) { console.warn('Falha em renderizarSintese', e); }

    // textos dinâmicos adicionais
    const radiais = d.indicadorRadial?.data || [];
    const serie   = d.serieTemporal || {};
    if (this.$.textoIntro) this.$.textoIntro.innerHTML = this.narrarIntroducao(radiais, serie);
    if (this.$.textoSerie) this.$.textoSerie.innerHTML = this.narrarSerieTemporal(serie);
    if (this.$.metodologia) this.$.metodologia.innerHTML = this.textoMetodologiaOds();
    this.renderMetodologiaCard();

    // === ODS ===
    this.renderOdsToolbar();
    this.renderOdsChart();
    if (this.$.textoOds) this.$.textoOds.innerHTML = this.narrarOds(this.data.graficoOds);

    // === Tabela ===
    if (d.tabelaIndicadores && this.$.tabelaWrap) {
      if (this.$.tituloTabela) this.$.tituloTabela.textContent = d.tabelaIndicadores.titulo || 'Indicadores';
      this.renderTabelaIndicadores(d.tabelaIndicadores);
      this.attachTabelaInteracao();
      if (this.$.textoTab) this.$.textoTab.innerHTML = this.narrarTabela(d.tabelaIndicadores);
    }
  }

  /* ---------- Resumo Geral + Rankings ---------- */

  trendInfo(evolucao) {
    // evolucao em fração (0..1); limiar = ±0.005 (±0,5 p.p.)
    const pp = (evolucao || 0) * 100;
    if (pp > 0.5)  return { key:'up',   cls:'trend-badge trend-up',   icon:'<svg viewBox="0 0 20 20"><path d="M4 12l4-4 3 3 5-5v6" fill="none" stroke="currentColor" stroke-width="2"/></svg>', txt:`Evolução (+${toComma(pp.toFixed(1))} p.p.)` };
    if (pp < -0.5) return { key:'down', cls:'trend-badge trend-down', icon:'<svg viewBox="0 0 20 20"><path d="M4 8l4 4 3-3 5 5V8" fill="none" stroke="currentColor" stroke-width="2"/></svg>', txt:`Retrocesso (${toComma(pp.toFixed(1))} p.p.)` };
    return { key:'flat', cls:'trend-badge trend-flat', icon:'<svg viewBox="0 0 20 20"><path d="M3 10h14" fill="none" stroke="currentColor" stroke-width="2"/></svg>', txt:'Estagnação' };
  }

  parseRank(str){
    // "1000/5570" -> {pos:1000, total:5570, topPct:82.0}
    const m = (String(str||'').match(/(\d+)\s*\/\s*(\d+)/) || []);
    const pos = Number(m[1]); const total = Number(m[2]);
    if (!Number.isFinite(pos) || !Number.isFinite(total) || total <= 0) return null;
    const topPct = clamp(100 * (1 - (pos - 1)/total), 0, 100);
    return { pos, total, topPct: +topPct.toFixed(1) };
  }

  renderResumoGeral(indRadial = {}) {
    const host = this.$.resumoCard;
    const ranksHost = this.$.rankings;
    if (!host) return;

    const arr = indRadial?.data || [];
    const mediaFr = Number.isFinite(indRadial?.progressoMedio)
      ? indRadial.progressoMedio
      : (arr.length ? arr.reduce((s,x)=>s+(x?.valor||0),0)/arr.length : 0);
    const evol = Number(indRadial?.evolucao || 0); // fração
    const t = this.trendInfo(evol);

    const local = this.getLocalidadeLabel();
    const mediaPct = (mediaFr*100);

    host.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500">Progresso médio dos ODS (${local})</div>
          <div class="text-3xl font-bold text-gray-900">${toComma(mediaPct.toFixed(0))}%</div>
        </div>
        <span class="${t.cls}">${t.icon}<span>${t.txt}</span></span>
      </div>
      <p class="mt-2 text-gray-600">
        Média simples entre os grupos raciais no ano mais recente. Quanto mais próximo de 100%, maior o avanço rumo às metas.
      </p>
    `;

    if (ranksHost){
      const cards = [];
      const rkNac = this.parseRank(indRadial?.rankNacional);
      const rkEst = this.parseRank(indRadial?.rankEstadual);
      const rkReg = this.parseRank(indRadial?.rankRegional || indRadial?.rankMunicipal);

      const mk = (label, rk) => rk ? `
        <div class="rank-card">
          <div class="rk-label">${label}</div>
          <div class="rk-main">${rk.pos.toLocaleString('pt-BR')}º</div>
          <div class="rk-sub">de ${rk.total.toLocaleString('pt-BR')} — Top ${toComma(rk.topPct.toFixed(1))}%</div>
        </div>` : `
        <div class="rank-card">
          <div class="rk-label">${label}</div>
          <div class="rk-main">—</div>
          <div class="rk-sub">sem dado</div>
        </div>`;

      cards.push(mk('Ranking nacional', rkNac));
      cards.push(mk('Ranking estadual', rkEst));
      cards.push(mk('Ranking municipal/Regional', rkReg));

      ranksHost.innerHTML = cards.join('');
    }
  }

  /* ---------- Header: seletor espelhado ---------- */

  ensureHeaderLocalidadeSlot(){
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
    if (typeof TomSelect === 'undefined') return;
    const slot = this.ensureHeaderLocalidadeSlot();
    if (this.tomSelectHeader) return;

    const sel = document.createElement('select');
    sel.id = 'seletor-localidade-header';
    sel.setAttribute('aria-label','Selecionar localidade');
    slot.appendChild(sel);

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

    // sync bidirecional
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

    const def = (this.tomSelect?.getValue && this.tomSelect.getValue()) || this.defaultLocalidadeId || '';
    if (def) this.tomSelectHeader.setValue(def, true);
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

  makeOdsLegend(host){
    const old = host.parentNode.querySelector('.ods-legend');
    if (old) old.remove();

    const legend = document.createElement('div');
    legend.className = 'tbl-legend ods-legend';
    legend.innerHTML = PCT_BANDS.map(b => `
      <span class="sw ${b.key}" style="background:${b.bg};border-color:rgba(0,0,0,.06)"></span>
      <span>${b.label}</span>
    `).join('\n');
    const toolbar = host.previousElementSibling;
    (toolbar && toolbar.classList.contains('ods-toolbar'))
      ? toolbar.insertAdjacentElement('afterend', legend)
      : host.parentNode.insertBefore(legend, host);
  }

  // pinta os <text> dos data labels conforme a faixa
  recolorHeatmapLabels(ctx){
    try{
      const root = ctx?.el;
      const cfgSeries = ctx?.w?.config?.series || [];
      if (!root || !cfgSeries.length) return;

      const seriesEls = root.querySelectorAll('.apexcharts-series');
      seriesEls.forEach((sEl, sIdx) => {
        const texts = sEl.querySelectorAll('.apexcharts-datalabel');
        texts.forEach((tEl, dIdx) => {
          const v = cfgSeries[sIdx]?.data?.[dIdx]?.y;
          tEl.setAttribute('fill', heatmapLabelColor(v));
        });
      });
    }catch(_e){}
  }

  renderOdsChart() {
    const host = this.$.graficoOds;
    if (!host) return;
    host.innerHTML = '';

    this.updateOdsToolbarActive();

    const ods = this.data?.graficoOds || {};
    const grupos = (ods.series || []).map(s => s.name); // nomes
    const cats   = ods.categories || [];                // ODS1, ODS2...
    const labels = ods.labels || [];                    // rótulos longos

    // Paleta por grupo (para BARRAS)
    const corPorGrupo = {};
    (this.data?.indicadorRadial?.data || []).forEach(it => { corPorGrupo[it.label] = it.cor; });

    if (this.odsModo === 'barras') {
      const cores = (ods.series || []).map(s => corPorGrupo[s.name] || '#999');
      const catFull = cats.map((c,i) => labels[i] ? `${c} — ${labels[i]}` : c);

      const options = {
        chart: { type: 'bar', height: 460 },
        plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
        dataLabels: { enabled: false },
        xaxis: { categories: catFull, max: 100 },
        series: ods.series || [],
        colors: cores,
        legend: { position: 'top' },
        tooltip: { y: { formatter: v => `${v}%` } }
      };
      new ApexCharts(host, options).render();
      return;
    }

    // HEATMAP TRANSPOSTO — Linhas = ODS; Colunas = grupos
    const series = cats.map((cat, i) => {
      const name = labels[i] ? `${cat} — ${labels[i]}` : cat;
      const data = grupos.map(g => {
        const s = (ods.series || []).find(ss => ss.name === g);
        const v = s?.data?.[i];
        return { x: g, y: (typeof v === 'number' ? v : null) };
      });
      return { name, data };
    });

    // legenda unificada
    this.makeOdsLegend(host);

    const options = {
      chart: { 
        type: 'heatmap', 
        height: 460,
        events: {
          mounted: (ctx) => this.recolorHeatmapLabels(ctx),
          updated: (ctx) => this.recolorHeatmapLabels(ctx),
        }
      },
      dataLabels: { 
        enabled: true, 
        formatter: v => (v==null ? '—' : `${String(v).replace('.', ',')}%`)
      },
      xaxis: { type: 'category', categories: grupos },
      tooltip: { y: { formatter: v => (v==null ? '—' : `${String(v).replace('.', ',')}%`) } },
      plotOptions: { 
        heatmap: { 
          shadeIntensity: 0.5,
          colorScale: { ranges: apexRangesFromBands() }
        } 
      },
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

  /* ---------- TABELA ---------- */

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

    /* Legenda de cores */
    const legend = document.createElement('div');
    legend.className = 'tbl-legend';
    legend.innerHTML = PCT_BANDS.map(b => `
      <span class="sw ${b.key}" style="background:${b.bg};border-color:rgba(0,0,0,.06)"></span>
      <span>${b.label}</span>
    `).join('\n');
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

    const renderRows = (linhas) => {
      tbody.innerHTML = linhas.map(l => {
        const tds = schema.map((s) => {
          const v = l[s.key];

          // primeira coluna: sticky + alinhada à direita
          if (!s.numeric) {
            return `<td class="px-3 py-2 text-gray-800 sticky-col text-right">${v ?? '—'}</td>`;
          }

          // demais colunas: valores percentuais (dataset pode vir 0..1 ou 0..100)
          if (typeof v === 'number') {
            const pct = v > 1 ? v : v*100;
            const b = bandFor(pct);
            const cls = b ? `pct pct-${b.key}` : 'pct';
            const style = b ? `style="background:${b.bg};color:${b.text}"` : '';
            return `<td class="px-3 py-2 text-gray-800 ${cls}" ${style} data-sort="${pct}">${toComma(pct.toFixed(0))}%</td>`;
          }
          return `<td class="px-3 py-2 text-gray-800">—</td>`;
        }).join('');
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

    if (st.sort.idx === idx) st.sort.dir *= -1;
    else { st.sort.idx = idx; st.sort.dir = 1; }

    const { key, numeric } = st.schema[idx];

    st.filtered.sort((a,b) => {
      const va = a[key], vb = b[key];
      if (numeric) {
        const A = (typeof va === 'number' ? (va>1?va:va*100) : -Infinity);
        const B = (typeof vb === 'number' ? (vb>1?vb:vb*100) : -Infinity);
        return (A - B) * st.sort.dir;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR') * st.sort.dir;
    });

    st.renderRows(st.filtered);

    // indicador visual ↕ / ↑ / ↓
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
      if (this._tblState.sort.idx != null) this.sortTableByColumn(this._tblState.sort.idx);
      else this._tblState.renderRows(this._tblState.filtered);
    };
    busca?.addEventListener('input', apply);
    sel?.addEventListener('change', apply);
  }

  /* ---------- Textos dinâmicos ---------- */
  getLocalidadeLabel(){
    const byTom = this.tomSelect?.getValue?.() ? this.tomSelect?.getItem?.(this.tomSelect.getValue())?.textContent : null;
    const bySelect = this.$.localidade?.selectedOptions?.[0]?.textContent?.trim();
    return (byTom || bySelect || 'Brasil').trim();
  }

  textoMetodologiaOds(){
    return `
      <em>Como é medido?</em> O progresso dos ODS é expresso em <strong>percentual de alcance</strong>
      (0–100%), onde 100% significa meta atingida. Aqui usamos a <strong>média simples</strong> entre
      os grupos raciais para o “progresso médio” e mostramos a <strong>tendência</strong> recente em pontos percentuais.
      Isso ajuda a identificar <strong>nível atual</strong> e <strong>ritmo</strong> de avanço.
    `;
  }

  textoMetodologiaOdsDetalhada(){
    return `
      <p>
        Medimos o “progresso dos ODS” como <strong>percentual de alcance</strong> (0–100%),
        onde 100% representa a meta atingida. Cada indicador é normalizado para esta escala.
      </p>
      <p>
        Para o <strong>progresso médio</strong>, calculamos a <strong>média simples</strong> entre os grupos raciais no ano mais recente.
        Isso mostra o nível geral de avanço, enquanto a análise por grupo revela desigualdades.
      </p>
      <p>
        A <strong>tendência</strong> mostra a variação recente em pontos percentuais: evolução (↑), estagnação (–) ou retrocesso (↓).
        O heatmap e a tabela usam a mesma legenda de cores para facilitar a leitura: 
        <em>crítico</em> (&lt;50%), <em>atenção</em> (50–74%), <em>regular</em> (75–89%) e <em>bom</em> (≥90%).
      </p>
      <p class="mt-3">
        Por que importa? Monitorar o progresso e a <strong>equidade racial</strong> em cada ODS ajuda a orientar políticas públicas
        e priorizar ações onde o <strong>gap entre grupos</strong> é maior, acelerando resultados com justiça.
      </p>
    `;
  }

  renderMetodologiaCard(){
    if (!this.$.metodologiaCard) return;

    this.$.metodologiaCard.className = 'metodo-card resumo-card';
    this.$.metodologiaCard.innerHTML = `
      <div class="lead">
        <strong>Como ler os resultados?</strong><br/>
        Usamos 0–100% para medir o alcance das metas; a média entre grupos dá o <em>progresso médio</em>.
      </div>
      <button id="btn-saiba-metodo" type="button" class="saiba-mais">Saiba mais</button>
    `;

    const btn = document.getElementById('btn-saiba-metodo');
    btn?.addEventListener('click', () => this.openModalMetodologia());
  }

  wireModalMetodologia(){
    const modal = this.$.modalMetodo;
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target?.matches?.('[data-close-modal], .metodo-modal__backdrop')) {
        this.closeModalMetodologia();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) this.closeModalMetodologia();
    });
  }

  openModalMetodologia(){
    if (!this.$.modalMetodo || !this.$.modalMetodoContent) return;
    this.$.modalMetodoContent.innerHTML = this.textoMetodologiaOdsDetalhada();
    this.$.modalMetodo.classList.add('is-open');
    this.$.modalMetodo.setAttribute('aria-hidden','false');
    const panel = this.$.modalMetodo.querySelector('.metodo-modal__panel');
    panel?.focus();
  }

  closeModalMetodologia(){
    if (!this.$.modalMetodo) return;
    this.$.modalMetodo.classList.remove('is-open');
    this.$.modalMetodo.setAttribute('aria-hidden','true');
  }

  narrarIntroducao(radiais = [], serieTemporal = {}){
    if (!radiais.length) return '';
    const local = this.getLocalidadeLabel();
    const media = radiais.reduce((a,b)=>a+(b?.valor||0),0)/radiais.length;
    const ordenados = [...radiais].sort((a,b)=>b.valor-a.valor);
    const top = ordenados[0], bottom = ordenados[ordenados.length-1];
    const gapPP = ((top.valor - bottom.valor) * 100).toFixed(1).replace('.0','');

    const ir = this.data?.indicadorRadial || {};
    const rkN = this.parseRank(ir.rankNacional);
    const rkE = this.parseRank(ir.rankEstadual);
    const rkM = this.parseRank(ir.rankRegional || ir.rankMunicipal);

    const rkTxt = [
      rkN ? `nacional: <strong>${rkN.pos.toLocaleString('pt-BR')}º</strong> de ${rkN.total.toLocaleString('pt-BR')} (Top ${toComma(rkN.topPct.toFixed(1))}%)` : null,
      rkE ? `estadual: <strong>${rkE.pos.toLocaleString('pt-BR')}º</strong> de ${rkE.total.toLocaleString('pt-BR')} (Top ${toComma(rkE.topPct.toFixed(1))}%)` : null,
      rkM ? `municipal/reg.: <strong>${rkM.pos.toLocaleString('pt-BR')}º</strong> de ${rkM.total.toLocaleString('pt-BR')} (Top ${toComma(rkM.topPct.toFixed(1))}%)` : null
    ].filter(Boolean).join(' · ');

    return `
      <p>
        Em <strong>${local}</strong>, a média entre os grupos é <strong>${(media*100).toFixed(0)}%</strong>.
        <strong>${top.label}</strong> tem o maior nível (<strong>${(top.valor*100).toFixed(0)}%</strong>)
        e <strong>${bottom.label}</strong> o menor (<strong>${(bottom.valor*100).toFixed(0)}%</strong>), um gap de <strong>${gapPP} p.p.</strong>.
      </p>
      <p class="mt-2">${rkTxt || ''}</p>
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
      <p><strong>${a0}–${aN}</strong>: maior avanço em <strong>${maiorAlta.nome}</strong> (+${toComma(maiorAlta.deltaPP.toFixed(1))} p.p.); 
      pior desempenho em <strong>${menorAlta.nome}</strong> (${toComma(menorAlta.deltaPP.toFixed(1))} p.p.).</p>
      <p class="mt-2">
        Mantido o ritmo, ${chegam.length ? `alcançam 100% até 2030: <strong>${chegam.join(', ')}</strong>` : 'nenhum grupo deve bater 100% até 2030'}.
        ${naoChegam.length ? `Outros podem ficar abaixo: ${naoChegam.join(', ')}.` : ''}
      </p>
    `;
  }

  narrarTabela(tab = {}){
    const L = [...(tab.linhas||[])];
    const withIdx = L.filter(x => Number.isFinite(x.indice));
    if (!withIdx.length) return '';

    // menor índice = maior desafio (ajuste se sua semântica for outra)
    const byIdxAsc = [...withIdx].sort((a,b)=> (a.indice)-(b.indice));
    const worst = byIdxAsc.slice(0, 3);
    const best  = byIdxAsc.slice(-3).reverse();

    const row = x => {
      const pct = x.indice > 1 ? x.indice : x.indice * 100; // aceita 0..1 ou 0..100
      return `
        <li class="flex items-start justify-between gap-2 py-1">
          <span class="text-sm text-gray-800">${x.indicador}</span>
          <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
            índice ${toComma(pct.toFixed(1))}
          </span>
        </li>
      `;
    };

    const card = (title, iconSvg, items) => `
      <div class="resumo-card border border-gray-200 rounded-lg p-3 bg-white">
        <div class="flex items-center gap-2 mb-2">
          ${iconSvg}
          <h4 class="font-semibold text-gray-900">${title}</h4>
        </div>
        <ul class="divide-y divide-gray-100">
          ${items.length ? items.map(row).join('') : `<li class="py-1 text-sm text-gray-500">Sem dados</li>`}
        </ul>
      </div>
    `;

    const icoDesafio = `
      <svg class="w-5 h-5 text-red-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 2l8 14H2L10 2z"></path>
        <path d="M10 7v5" stroke="#fff" stroke-width="2" stroke-linecap="round"></path>
        <circle cx="10" cy="14" r="1" fill="#fff"></circle>
      </svg>`;

    const icoDestaque = `
      <svg class="w-5 h-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77 4.22 16.7l.91-5.32L1.27 7.62l5.34-.78L10 2z"></path>
      </svg>`;

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${card('Maiores desafios', icoDesafio, worst)}
        ${card('Destaques', icoDestaque, best)}
      </div>
    `;
  }

}
