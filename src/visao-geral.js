// src/visao-geral.js - Adaptado para layout e tabelaIndicadores
import { renderizarSintese } from './renderizadores/renderSintese.js';

export class VisaoGeralController {
    constructor() {
        this.selectors = {};
        this.fullDataObject = null;
        this.defaultLocalidadeId = 'BR';
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
            tabelaIndicadores: document.getElementById('tabela-indicadores-container'),
            textoRacial: document.getElementById('texto-sintese-racial'),
            textoOds: document.getElementById('texto-sintese-ods'),
            textoTabela: document.getElementById('texto-sintese-tabela'),
            textoSerieTemporal: document.getElementById('texto-sintese-serie-temporal')
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
        // Carrega a lista grande (5k+)
        const response = await fetch('./data/localidades_from_mongo.json');
        if (!response.ok) throw new Error('Falha ao carregar localidades_from_mongo.json');
        const localidades = await response.json();

        // Gera texto com indentação por nível (mantém hierarquia visual)
        const toText = (loc) => `${'\u00A0'.repeat((loc.nivel || 0) * 4)}${loc.nome}`;

        // Destroi instância anterior se o usuário voltar pra página
        if (this.tomSelect) {
            this.tomSelect.destroy();
            this.tomSelect = null;
        }
          // Garante que o <select> esteja vazio e com uma opção vazia (placeholder)
  this.selectors.localidade.innerHTML = `<option value=""></option>`;

  // Inicializa Tom Select com opções e busca
  this.tomSelect = new TomSelect(this.selectors.localidade, {
    // Passa as opções já carregadas (mais rápido que addOptions em loop)
    options: localidades.map(loc => ({
      value: String(loc.id),
      text: toText(loc),
      nome: loc.nome,
      uf: loc.uf || '',
      nivel: loc.nivel || 0
    })),
    valueField: 'value',
    labelField: 'text',
    searchField: ['nome', 'uf', 'text'], // busca por nome, UF e texto com indentação
    placeholder: 'Brasil',
    allowEmptyOption: true,
    // Performance para listas grandes
    maxOptions: 200,      // quantos itens renderiza por vez
    maxItems: 1,          // seleção simples
    create: false,
    diacritics: true,
    // Mantém o visual mais “clean” na hero
    dropdownParent: 'body', // evita overflow dentro do card
    render: {
      option: (data) => {
        // Mantém indentação e um sufixo com UF quando existir
        const uf = data.uf ? ` · ${data.uf}` : '';
        return `<div class="text-sm">${data.text}${uf}</div>`;
      },
      item: (data) => {
        const uf = data.uf ? ` · ${data.uf}` : '';
        return `<div class="text-base">${data.nome}${uf}</div>`;
      }
    }
  });
}

    addEventListeners() {
        // Se existir Tom Select, ouve nele; senão, cai pro <select> nativo
        if (this.tomSelect) {
            this.tomSelect.on('change', () => this.updateView());
        } else if (this.selectors.localidade) {
            this.selectors.localidade.addEventListener('change', () => this.updateView());
        }
        }

    async updateView() {
        // 1) Radial + Série (renderSintese)
        const introEl = document.getElementById('texto-introducao-visao-geral');
        if (introEl) {
            introEl.innerHTML = this.narrarIntroducao(
                this.fullDataObject.indicadorRadial.data,
                this.fullDataObject.serieTemporal
            );
        }
        renderizarSintese({
            titulo: this.fullDataObject.indicadorRadial.titulo,
            indicadorRadial: this.fullDataObject.indicadorRadial.data,
            serieTemporal: this.fullDataObject.serieTemporal
        }, {
            ids: { radial: 'grafico-progresso-racial', serie: 'grafico-evolucao-progresso' }
        });

        if (this.selectors.textoSerieTemporal) {
            this.selectors.textoSerieTemporal.innerHTML = this.narrarSerieTemporal(
                this.fullDataObject.serieTemporal
            );
        }

        // 2) Texto síntese racial
        if (this.selectors.textoRacial) {
            this.selectors.textoRacial.innerHTML = this.narrarRacial(
            this.fullDataObject.indicadorRadial.data,
            this.fullDataObject.serieTemporal
            );
        }

        // 3) ODS
        if (this.fullDataObject.graficoOds) {
            this.renderOdsBarChart(this.fullDataObject.graficoOds);
            if (this.selectors.textoOds) {
            this.selectors.textoOds.innerHTML = this.narrarOds(this.fullDataObject.graficoOds);
            }
        }

        // 4) Tabela + texto
        if (this.fullDataObject.tabelaIndicadores) {
            this.renderTabelaIndicadores(this.fullDataObject.tabelaIndicadores);
            if (this.selectors.textoTabela) {
            this.selectors.textoTabela.innerHTML = this.narrarTabela(this.fullDataObject.tabelaIndicadores);
            }
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

    // -----------------------------
    // 📌 MÉTODOS DE GERAÇÃO DE TEXTO
    // -----------------------------

    formatPct(x, dec=1) { return `${(x*100).toFixed(dec)}%`; }

    narrarRacial(radiais, serieTemporal) {
    if (!Array.isArray(radiais) || !serieTemporal?.series?.length) return '';

    // maior/menor no radial
    const sorted = [...radiais].sort((a,b) => b.valor - a.valor);
    const top = sorted[0], bottom = sorted[sorted.length-1];
    const diff = ((top.valor - bottom.valor) * 100);

    // tendências (variação 1º->último)
    const deltas = serieTemporal.series.map(s => {
        const first = s.data[0], last = s.data[s.data.length-1];
        return { name: s.name, delta: (last - first) };
    }).sort((a,b) => b.delta - a.delta);
    const up = deltas[0], down = deltas[deltas.length-1];

    const anos = `${serieTemporal.categorias?.[0]}–${serieTemporal.categorias?.[serieTemporal.categorias.length-1]}`;

    return `
        <p>
        No consolidado do período mais recente, <strong>${top.label}</strong> apresenta o maior nível médio de progresso 
        (${this.formatPct(top.valor)}), enquanto <strong>${bottom.label}</strong> tem o menor (${this.formatPct(bottom.valor)}), 
        uma diferença de <strong>${diff.toFixed(1)} p.p.</strong>.
        </p>
        <p class="mt-2">
        Na série temporal (${anos}), o maior avanço foi de <strong>${up.name}</strong> (${(up.delta*100).toFixed(1)} p.p.),
        enquanto <strong>${down.name}</strong> teve a menor variação (${(down.delta*100).toFixed(1)} p.p.).
        </p>
    `;
    }

    narrarIntroducao(radiais, serieTemporal) {
        if (!Array.isArray(radiais) || !serieTemporal?.series?.length) return '';

        const sorted = [...radiais].sort((a, b) => b.valor - a.valor);
        const top = sorted[0];
        const bottom = sorted[sorted.length - 1];
        const diff = ((top.valor - bottom.valor) * 100).toFixed(1);

        const ultimoAno = serieTemporal.categorias[serieTemporal.categorias.length - 1];
        const local = this.selectors.localidade?.selectedOptions?.[0]?.textContent?.trim() || 'Brasil';

        return `
        <p>
            O objetivo desta plataforma é monitorar o desenvolvimento sustentável, com foco na igualdade étnico-racial, 
            garantindo que nenhum grupo fique para trás em termos de bem-estar, oportunidades e qualidade de vida.
            Na localidade <strong>${local}</strong>, em <strong>${ultimoAno}</strong>, o grupo 
            <strong>${top.label}</strong> apresentou o maior nível médio de progresso (<strong>${this.formatPct(top.valor)}</strong>), 
            em termos do cumprimento de metas relacionadas aos ODS para o conjunto de indicadores monitorados até o momento.
            Enquanto <strong>${bottom.label}</strong> apresentou o menor (<strong>${this.formatPct(bottom.valor)}</strong>).
            A diferença entre eles é de <strong>${diff} pontos percentuais</strong>.
        </p>
        `;
    }

narrarSerieTemporal(serieTemporal) {
  if (!serieTemporal?.series?.length) return '';

  const anos = serieTemporal.categorias || serieTemporal.categories || [];
  const primeiroAno = anos[0];
  const ultimoAno = anos[anos.length - 1];
  const anosRestantes = Math.max(0, 2030 - ultimoAno);

  // Classificação por variação acumulada (pontos percentuais do primeiro ao último)
  const analises = serieTemporal.series.map(s => {
    const first = s.data[0];
    const last = s.data[s.data.length - 1];
    const deltaPP = (last - first) * 100; // p.p. no período
    const trend = Math.abs(deltaPP) < 1 ? 'estável' : (deltaPP > 0 ? 'em evolução' : 'em queda');

    // slope médio ao ano em unidade (0..1)
    const slope = (s.data.length > 1) ? (last - first) / (s.data.length - 1) : 0;
    const proj2030 = last + slope * anosRestantes; // ainda em 0..1
    const atingira100 = proj2030 >= 1.0;

    return { grupo: s.name, first, last, deltaPP, trend, slope, proj2030, atingira100 };
  });

  const evoluindo = analises.filter(a => a.trend === 'em evolução');
  const caindo    = analises.filter(a => a.trend === 'em queda');
  const estaveis  = analises.filter(a => a.trend === 'estável');

  // Strings amigáveis (sempre mostram algo)
  const fmtEvol   = evoluindo.length ? evoluindo.map(a => `${a.grupo} (+${a.deltaPP.toFixed(1)} p.p.)`).join(', ') : 'Nenhum.';
  const fmtQueda  = caindo.length    ? caindo.map(a => `${a.grupo} (${a.deltaPP.toFixed(1)} p.p.)`).join(', ')     : 'Nenhum.';
  const fmtEstaveis = estaveis.length ? estaveis.map(a => a.grupo).join(', ') : 'Nenhum.';

  // Projeções para 2030
  const queAlcancam = analises.filter(a => a.atingira100);
  const queNaoAlcancam = analises.filter(a => !a.atingira100);
  const projHit = queAlcancam.length
    ? `Tendem a alcançar 100% até 2030: ${queAlcancam.map(a => a.grupo).join(', ')}.`
    : 'Nenhum grupo tende a alcançar 100% até 2030 no ritmo atual.';
  const projNoHit = queNaoAlcancam.length
    ? `Com o ritmo atual, podem ficar abaixo de 100% em 2030: ${queNaoAlcancam.map(a => `${a.grupo} (~${Math.min(100, Math.max(0, a.proj2030*100)).toFixed(0)}%)`).join(', ')}.`
    : '';

  // Riscos: projeção <70% ou desigualdade aumentando (range cresce)
  const projabaixo70 = analises.filter(a => a.proj2030 < 0.70);
  const riscoAbaixo = projabaixo70.length
    ? `Atenção: risco de ficar para trás (projeção < 70% em 2030) para ${projabaixo70.map(a => a.grupo).join(', ')}.`
    : '';

  // desigualdade: range no primeiro ano vs último ano
  const valoresNoAno = (idx) => serieTemporal.series.map(s => s.data[idx]).filter(v => typeof v === 'number');
  const range = arr => (arr.length ? Math.max(...arr) - Math.min(...arr) : 0);
  const rangeInicial = range(valoresNoAno(0)) * 100;                       // p.p.
  const rangeFinal   = range(valoresNoAno(anos.length - 1)) * 100;         // p.p.
  const desigualdadeSubiu = rangeFinal > rangeInicial + 0.5; // tolerância 0.5 p.p.
  const desigualdadeTxt = desigualdadeSubiu
    ? `A desigualdade entre grupos aumentou (de ${rangeInicial.toFixed(1)} p.p. para ${rangeFinal.toFixed(1)} p.p.).`
    : `A desigualdade entre grupos não aumentou (de ${rangeInicial.toFixed(1)} p.p. para ${rangeFinal.toFixed(1)} p.p.).`;

  // Resumo curto (não repetitivo em relação à introdução)
  let resumoCurto = 'Ao observar a trajetória ao longo do tempo, vemos padrões distintos entre os grupos.';
  if (evoluindo.length && !caindo.length && !estaveis.length) resumoCurto = 'Todos os grupos apresentam evolução ao longo do período.';
  if (!evoluindo.length && !caindo.length && estaveis.length) resumoCurto = 'Os grupos permanecem estáveis ao longo do período.';
  if (!evoluindo.length && caindo.length && !estaveis.length) resumoCurto = 'Predomina movimento de queda ao longo do período.';

  // Montagem do texto final
  return `
    <p><strong>${resumoCurto}</strong> Período analisado: <strong>${primeiroAno}–${ultimoAno}</strong>.</p>
    <ul class="list-disc ml-5 mt-2 space-y-1">
      <li><strong>Em evolução</strong>: ${fmtEvol}</li>
      <li><strong>Em queda</strong>: ${fmtQueda}</li>
      <li><strong>Estáveis</strong>: ${fmtEstaveis} (variação &lt; 1 p.p.).</li>
    </ul>
    <p class="mt-3">${projHit} ${projNoHit}</p>
    <p class="mt-1">${riscoAbaixo}</p>
    <p class="mt-1">${desigualdadeTxt}</p>
  `;
}

    narrarOds(ods) {
    if (!ods?.series?.length) return '';
    const grupos = ods.series.map(s => s.name);

    // média por ODS (média dos grupos)
    const mediasPorOds = ods.categories.map((cat, idx) => {
        const valores = ods.series.map(s => s.data[idx]);
        const media = valores.reduce((a,b)=>a+b,0) / valores.length;
        return { cat, media };
    });
    const max = mediasPorOds.reduce((a,b)=> a.media>b.media ? a : b);
    const min = mediasPorOds.reduce((a,b)=> a.media<b.media ? a : b);

    // ODS com maior disparidade (range entre grupos)
    const disparidades = ods.categories.map((cat, idx) => {
        const valores = ods.series.map(s => s.data[idx]);
        const d = Math.max(...valores) - Math.min(...valores);
        return { cat, d };
    });
    const worstGap = disparidades.reduce((a,b)=> a.d>b.d ? a : b);

    return `
        <p>
        Em média, o <strong>${max.cat}</strong> apresenta o maior progresso (${max.media.toFixed(0)}%),
        enquanto o <strong>${min.cat}</strong> tem o menor (${min.media.toFixed(0)}%). A maior disparidade 
        entre grupos de raça e cor ocorre em <strong>${worstGap.cat}</strong>
        (diferença de <strong>${worstGap.d.toFixed(0)} p.p.</strong> entre o maior e o menor valor).
        </p>
    `;
    }

    narrarTabela(tabela) {
    if (!tabela?.linhas?.length) return '';

    // maior e menor desigualdade (range entre grupos)
    const linhasCalc = tabela.linhas.map(l => {
        const vals = [l.brancos, l.negros, l.indigenas, l.amarelos].filter(v=>typeof v==='number');
        const range = Math.max(...vals) - Math.min(...vals);
        return { indicador: l.indicador, range, vals };
    });
    const maior = linhasCalc.reduce((a,b)=> a.range>b.range ? a : b);
    const menor = linhasCalc.reduce((a,b)=> a.range<b.range ? a : b);

    return `
        <p class="mt-2">
        A maior desigualdade nos indicadores, em termo de progresso das metas, aparece em <strong>${maior.indicador}</strong>
        (diferença de <strong>${maior.range.toFixed(0)} p.p.</strong> entre grupos).
        Já a menor diferença está em <strong>${menor.indicador}</strong>
        (cerca de <strong>${menor.range.toFixed(0)} p.p.</strong>).
        </p>
    `;
    }
}
