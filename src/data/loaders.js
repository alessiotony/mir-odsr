// data/loaders.js
// Cache leve: memória + localStorage com TTL
const memoryCache = new Map();

export const DATA_PATHS = {
  visaoGeral: './data/visao_geral_dados.json',       // usa absoluto p/ funcionar em /pages/*
  localidades: './data/localidades_from_mongo.json',
};

// Util: pega agora (ms)
const now = () => Date.now();

// Carrega JSON com cache e TTL (ms). Se quiser alterar TTL por chamada, passe { ttlMs: ... }.
export async function loadJSON(keyOrUrl, opts = {}) {
  const { ttlMs = 10 * 60 * 1000, path } = opts;
  const url = path || DATA_PATHS[keyOrUrl] || keyOrUrl; // aceita chave (do DATA_PATHS) ou URL direta
  const LS_KEY = `odsr.cache:${url}`;
  const t = now();

  // 1) Memória
  const mem = memoryCache.get(url);
  if (mem && (t - mem.t) <= ttlMs) return mem.v;

  // 2) localStorage
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (t - parsed.t) <= ttlMs) {
        memoryCache.set(url, { v: parsed.v, t: parsed.t });
        return parsed.v;
      }
    }
  } catch { /* ignore */ }

  // 3) Rede (revalidate)
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Falha ao carregar ${url} (${res.status})`);
  const data = await res.json();

  // Atualiza caches
  const entry = { v: data, t };
  memoryCache.set(url, entry);
  try { localStorage.setItem(LS_KEY, JSON.stringify(entry)); } catch { /* ignore */ }

  return data;
}
