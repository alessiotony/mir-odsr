// src/renderizadores/renderOds18.js
// Controlador da página ODS18 – visual “primeira versão” + robustez a null

export class Ods18Controller {
  constructor(opts = {}) {
    this.paths = {
      dados: opts.dadosUrl || './data/ods18_dados.json',
      metas: opts.metasUrl || './data/ods18_metas.json'
    };
    this.colors = {
      Amarela: '#f2b705',
      Branca:  '#5c88c4',
      'Indígena': '#c14040',
      Negra:   '#352012',
      cinza:   '#9aa3af',
      primaria:'#16a34a'
    };
    this.bands = [
      { name: 'Alerta',    from: 0,  to: 0.25, color: 'rgba(255,0,0,0.06)' },
      { name: 'Regular',   from: 0.25, to: 0.50, color: 'rgba(255,165,0,0.08)' },
      { name: 'Bom',       from: 0.50, to: 0.75, color: 'rgba(255,215,0,0.08)' },
      { name: 'Excelente', from: 0.75, to: 1.00, color: 'rgba(0,128,0,0.08)' }
    ];
  }

  async init() {
    // containers esperados (os mesmos da sua página)
    this.$ = {
      radial:       document.querySelector('#ods18-radial'),
      kProgresso:   document.querySelector('#kpi-progresso'),
      kAmplitude:   document.querySelector('#kpi-paridade'),
      kIndicadores: document.querySelector('#kpi-indicadores'),
      textoResumo:  document.querySelector('#ods18-texto-resumo'),
      tabela:       document.querySelector('#ods18-tabela-metas'),
      dist:         document.querySelector('#ods18-distribuicao')
    };

    const [dados, metas] = await Promise.all([
      fetch(this.paths.dados, { cache:'no-store' }).then(r=>r.json()),
      fetch(this.paths.metas, { cache:'no-store' }).then(r=>r.json())
    ]);

    this.dados = dados;
    this.metas = metas;

    this.renderKpis();
    this.renderRadial();
    this.renderTabela();
    this.renderScatterMetas();
  }

  // ---------- helpers ----------
  pct(v){ return (v==null || isNaN(v)) ? '—' : `${Math.round(v*100)}%`; }
  pctNum(v){ return (v==null || isNaN(v)) ? null : Math.round(v*100); }
  clamp01(x){ return Math.max(0, Math.min(1, Number(x||0))); }
  indice(amp, prog){ if(amp==null||prog==null) return null; return this.clamp01((1 - this.clamp01(amp)) * this.clamp01(prog)); }
  status(ind){
    if (ind==null) return ['Sem dados','pill pill-nd'];
    if (ind>=0.75) return ['Excelente','pill pill-ok'];
    if (ind>=0.50) return ['Bom/Regular','pill pill-mid'];
    return ['Alerta','pill pill-bad'];
  }
  keyMeta(m){ return m.idTarget18 ?? m.idTarget ?? m.id ?? m.codigo ?? '18.?'; }
  nameMeta(m){ return m.nameTarget18 ?? m.nameTarget ?? m.name ?? m.titulo ?? ''; }

  // ---------- render ----------
  renderKpis(){
  const g = this.dados?.global || this.dados?.sintese || {};
  const progresso = g.progresso ?? g.progresso_medio ?? 0;
  const paridade = g.paridade ?? 0;
  const indice = g.indice ?? 0;
  const nIndicadores = g.nIndicadores ?? g.indicadores ?? '—';

  if (this.$.kProgresso)   this.$.kProgresso.textContent   = this.pct(progresso);
  if (this.$.kAmplitude)   this.$.kAmplitude.textContent   = this.pct(paridade);
  if (this.$.kIndicadores) this.$.kIndicadores.textContent = String(nIndicadores);

  if (this.$.textoResumo) {
    const valorPct = this.pct(indice);
    let msgNivel;

    if (indice >= 0.9) msgNivel = 'há uma convergência muito alta entre os grupos.';
    else if (indice >= 0.7) msgNivel = 'há uma boa aproximação, mas ainda existem diferenças a serem reduzidas.';
    else if (indice >= 0.5) msgNivel = 'as diferenças são significativas e requerem ações consistentes.';
    else msgNivel = 'há grandes desigualdades que precisam ser enfrentadas com urgência.';

    // Identificar maior desafio
    let desafio;
    const limiarProgresso = 0.8;
    const limiarParidade = 0.8;
    if (progresso < limiarProgresso && paridade < limiarParidade) {
      desafio = `em ambos: progresso (${this.pct(progresso)}) e paridade (${this.pct(1 - paridade)})`;
    } else if (progresso < limiarProgresso) {
      desafio = `no progresso (${this.pct(progresso)})`;
    } else if (paridade < limiarParidade) {
      desafio = `na paridade (${this.pct(1 - paridade)})`;
    } else {
      desafio = 'nos dois indicadores, embora em níveis menos críticos';
    }

    this.$.textoResumo.textContent =
      `A localidade selecionada apresentou um Índice Sintético de Igualdade Racial (ISIR) de ${valorPct}. ` +
      `Com base nesse valor, podemos destacar que ${msgNivel} ` +
      `O ISIR é calculado por meio da multiplicação do progresso e da paridade (complemento da paridade). ` +
      `No caso em questão, observa-se que o maior desafio está ${desafio}.`;
  }
}


  renderRadial(){
    if (!this.$.radial) return;
    const g = this.dados?.global || this.dados?.sintese || {};
    const idx = (g.indice != null) ? g.indice : this.indice(g.paridade, g.progresso ?? g.progresso_medio);
    const valor = this.pctNum(idx) ?? 0;

    // destruir instância anterior
    if (this.$.radial._chart) { try{ this.$.radial._chart.destroy(); }catch{} }

    // 1) escolhe a cor pelo índice (0..1)
    const radialColor = (() => {
      const x = (idx == null ? 0 : Number(idx));
      if (x >= 0.90) return '#16a34a'; // verde
      if (x >= 0.70) return '#eab308'; // amarelo
      if (x >= 0.50) return '#f59e0b'; // laranja
      return '#ef4444';                // vermelho
    })();

    // const faixa   = dados.bandeira_indice
    // ? faixas.find(f => f.id === dados.bandeira) || pickFaixa(valor, faixas)
    // : pickFaixa(valor, faixas);

    const opts = {
      chart: { type: 'radialBar', height: 320, sparkline:{enabled:true} },
      series: [valor],
      labels: ['Igualdade'],
      colors: [radialColor],  
      plotOptions: {
        radialBar: {
          hollow: { size: '62%' },
          track: { background: '#f3f4f6' },
          dataLabels: {
            name:  { offsetY: 18, color: '#374151' },
            value: {
              offsetY: -20, fontSize: '22px', fontWeight: 700,
              formatter: () => (idx==null ? '—' : `${valor}%`)
            }
          }
        }
      }
    };
    this.$.radial._chart = new ApexCharts(this.$.radial, opts);
    this.$.radial._chart.render();

    // ícone da balança no centro (overlay simples)
    if (!this.$.radial.querySelector('.radial-center-icon')) {
      const icon = document.createElement('div');
      icon.className = 'radial-center-icon';
      icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:1.8rem;color:#374151;';
      this.$.radial.parentElement.style.position = 'relative';
      this.$.radial.parentElement.appendChild(icon);
    }
  }

  renderTabela(){
    const tbody = this.$.tabela;
    if (!tbody) return;
    tbody.innerHTML = '';

    const metas = (this.dados?.metas || []).sort((a,b) => Number(this.keyMeta(a)) - Number(this.keyMeta(b)));

    metas.forEach(m => {
      const prog = m.progressoMedio ?? m.progresso ?? null;
      const amp  = m.paridade ?? null;
      const idx  = (m.indice != null) ? m.indice : this.indice(amp, prog);
      const [rotulo, klass] = this.status(idx);
      const semDados = (prog==null || amp==null);

      const tr = document.createElement('tr');
      if (semDados) tr.setAttribute('data-nd','true');

      tr.innerHTML = `
        <td>
          <div class="font-semibold">${this.keyMeta(m)} · ${this.nameMeta(m)}</div>
          ${m.descricao ? `<div class="text-sm opacity-70 mt-1">${m.descricao}</div>` : ''}
        </td>
        <td class="text-right">${this.pct(prog)}</td>
        <td class="text-right">${this.pct(amp)}</td>
        <td class="text-right">${this.pct(idx)}</td>
        <td><span class="${klass}">${rotulo}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderScatterMetas(){
    const container = this.$.dist;
    if (!container) return;
    if (container._chart) { try{ container._chart.destroy(); } catch{} }
    container.innerHTML = '';

    const metas = (this.dados?.metas || []).sort((a,b) => Number(this.keyMeta(a)) - Number(this.keyMeta(b)));
    const racas = ['Amarela','Branca','Indígena','Negra'];

    // Séries: um ponto por meta/raça; metas com null são ignoradas (não mandamos null ao Apex)
    const series = racas.map(r => ({
      name: r,
      data: metas.map(m => {
        const dr = (m.dadosRaciais || []).find(d => d.raca === r);
        if (!dr || dr.valor==null) return null;
        return { x: this.clamp01(dr.valor), y: `${this.keyMeta(m)} · ${this.nameMeta(m)}` };
      }).filter(Boolean),
      color: this.colors[r]
    }));

    const opts = {
      chart: { type: 'scatter', height: Math.max(420, metas.length*32), toolbar:{ show:true } },
      series,
      xaxis: {
        min: 0, max: 1, tickAmount: 10,
        labels: { formatter: (v) => `${Math.round(v*100)}%` }
      },
      yaxis: { labels: { style: { fontSize: '12px' } } },
      markers: { size: 6 },
      legend: { position: 'top' },
      grid: { xaxis: { lines: { show: true } } },
      annotations: {
        xaxis: this.bands.map(b => ({
          x: b.from, x2: b.to, fillColor: b.color, label: { text: b.name, style:{ fontSize:'10px' } }
        }))
      },
      tooltip: {
        y: { formatter: (_, opts) => opts.w.globals.seriesNames[opts.seriesIndex] },
        x: { formatter: (v) => `${Math.round(v*100)}%` }
      }
    };

    container._chart = new ApexCharts(container, opts);
    container._chart.render();
  }
  
}

// compat: alguns bootstraps podem esperar window.Ods18Controller
if (typeof window !== 'undefined') window.Ods18Controller = window.Ods18Controller || Ods18Controller;

function getFaixasFromData(data) {
  return data?.config?.faixas_indice ?? [
    { id: 'vermelho', label: 'Crítico',        min: 0.00, max: 0.50, cor: '#ef4444' },
    { id: 'laranja',  label: 'Alerta',         min: 0.50, max: 0.70, cor: '#f59e0b' },
    { id: 'amarelo',  label: 'Regular',        min: 0.70, max: 0.90, cor: '#eab308' },
    { id: 'verde',    label: 'Bom/Excelente',  min: 0.90, max: 1.01, cor: '#22c55e' },
  ];
}

function pickFaixa(valor01, faixas) {
  return faixas.find(f => valor01 >= f.min && valor01 < f.max) ?? faixas[faixas.length - 1];
}
