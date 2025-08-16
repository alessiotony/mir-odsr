// src/renderizadores/renderHomepage.js
import { renderizarEstatisticas, renderizarPaineis, renderizarPilares } from './renderComponentes.js';
import { renderizarSintese } from './renderSintese.js';

function pct(x) {
  if (typeof x !== 'number') return '—';
  return (x * 100).toFixed(0) + '%';
}

function textoSinteseGeral(d) {
  const serie = d?.serieTemporal;
  const cats = serie?.categorias || serie?.categories || [];
  const ultAno = cats[cats.length - 1];

  const grupos = (d?.indicadorRadial?.data || d?.indicadorRadial || [])
    .map(g => ({ label: g.label, v: g.valor }))
    .sort((a, b) => b.v - a.v);


  const topo = grupos[0] ? `${grupos[0].label} (${pct(grupos[0].v)})` : '—';

  // Se houver mais de um grupo, encontre o menor. Senão, não precisa.
  const base = grupos.length > 1 
    ? `${grupos[grupos.length - 1].label} (${pct(grupos[grupos.length - 1].v)})`
    : null; // ou '—' se preferir

  // Montagem do texto final com condicional
  let textoFinal = `<p>No Brasil, considerando o conjunto dos ODS, o nível de progresso médio por grupos raciais 
  apresenta diferenças relevantes. Em <strong>${ultAno ?? '—'}</strong>, o grupo com maior progresso foi <strong>${topo}</strong>`;

  if (base) {
    textoFinal += `, enquanto o menor foi <strong>${base}</strong>.</p>`;
  } else {
    // Se não houver 'base', é porque só há um grupo, então podemos fechar a frase de outra forma.
    textoFinal += `.</p>`;
  }

  return textoFinal;
}

function textoSinteseOds18(ds) {
  const m = ds?.ods18 || {};
  const progresso = m.progresso ?? null;
  const paridade = m.paridade ?? null;
  const indice = m.indice ?? null;

  let foco = '';
  if (typeof progresso === 'number' && typeof paridade === 'number') {
    // Cenário 1: Progresso é o principal gargalo
    if (progresso < 0.8 && progresso < paridade) {
      foco = 'o principal desafio está no aumento do progresso médio dos indicadores';
    } 
    // Cenário 2: Paridade é o principal gargalo
    else if (paridade < 0.85 && paridade < progresso) {
      foco = 'o principal desafio está na redução das desigualdades (elevar a paridade)';
    }
    // Cenário 3: Ambos estão bons, mas ainda podem melhorar
    else if (progresso >= 0.8 && paridade >= 0.85) {
      foco = 'o desafio agora é manter o bom desempenho e buscar avanços contínuos em ambos os eixos';
    }
    // Cenário 4: Ambos precisam de atenção
    else {
      foco = 'é preciso avançar tanto no progresso dos indicadores quanto na paridade racial';
    }
  }
  
  return `
    <p>Para o <strong>ODS 18</strong>, o Brasil registra atualmente um nível de <strong>Igualdade Racial de ${pct(indice)}</strong> 
    (= Progresso × Paridade). O nível de <strong>Progresso Médio dos ODS é de ${pct(progresso)}</strong> e o de
    <strong>Paridade Racial de ${pct(paridade)}</strong> .
    Em termos práticos, ${foco}.</p>
  `;
}

export async function renderizarHomepage(data) {
  // blocos já existentes
  renderizarPilares(data.pilares, document.getElementById('pillars-container'));
  renderizarEstatisticas(data.estatisticas, document.getElementById('stats-container'));
  const pc = document.getElementById('paineis-container');
  if (pc) renderizarPaineis(data.pilares, pc);

  // ==== SÍNTESE DUPLA ====
  try {
    // tenta no /data/ e cai para a raiz se necessário
    let resp = await fetch('./data/dados_sintese.json');
    if (!resp.ok) resp = await fetch('./dados_sintese.json');
    const ds = await resp.json();

    // ---- Coluna 1: Visão Geral dos ODS ----
    const vgData = {
      titulo: ds?.serieTemporal?.titulo || 'Síntese dos ODS (geral)',
      indicadorRadial: ds?.indicadorRadial, // {data:[...]} ou array
      serieTemporal: ds?.serieTemporal
    };
    const t1 = document.getElementById('texto-sintese-geral');
    if (t1) t1.innerHTML = textoSinteseGeral(ds);

    renderizarSintese(vgData, {
      ids: { title: 'titulo-sintese-geral', radial: 'radial-geral', serie: 'serie-geral' },
      layout: 'grid4' // 4 radiais em 1 linha (lg+) e 2×2 no mobile
    });

    // ---- Coluna 2: ODS 18 ----
    const m = ds?.ods18 || {};
    const paridade = (typeof m.paridade === 'number') ? (1 - m.paridade) : null;

    // tenta pegar número de indicadores, com fallback
    const nIndicadores = m.nIndicadores ?? m.indicadores ?? ds?.nIndicadores ?? null;

    const ods18Data = {
      titulo: ds?.serieTemporalOds18?.titulo || 'Evolução do Nível de Igualdade Racial no Brasil',
      indicadorRadial: {
        data: [
          { label: 'Índice',    valor: m.indice ?? 0,     cor: '#7c3aed' }, // “Índice/Igualdade” será a radial
          { label: 'Progresso', valor: m.progresso ?? 0,  cor: '#1d4ed8' }, // vai para card
          { label: 'Paridade',  valor: paridade ?? 0,     cor: '#10b981' }  // vai para card
        ]
      },
      nIndicadores,
      paridade: m.paridade,                // para exibir card “Amplitude” quando paridade vier do JSON
      serieTemporal: ds?.serieTemporalOds18  // série única do índice
    };

    const t2 = document.getElementById('texto-sintese-ods18');
    if (t2) t2.innerHTML = textoSinteseOds18(ds);

    renderizarSintese(ods18Data, {
      ids: { title: 'titulo-sintese-ods18', radial: 'radial-ods18', serie: 'serie-ods18' },
      variant: 'ods18_compacto',   // <<< só Índice como radial + cards (Progresso/Amplitude/Indicadores)
      seriesColor: '#8B5E3C'       // <<< marrom padrão da aplicação na linha
    });

  } catch (e) {
    console.error('Falha ao carregar dados_sintese.json para síntese dupla:', e);
  }
}
