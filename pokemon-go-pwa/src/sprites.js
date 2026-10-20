/**
 * ===== Sprite Pokémon =====
 *
 * Gli sprite arrivano dal repo community PokeAPI/sprites su GitHub — la
 * fonte di riferimento usata da tutte le wiki fan (Bulbapedia le usa come
 * mirror ufficiale dei giochi). URL stabili, CORS abilitato: si possono
 * disegnare su canvas e cachare nel service worker per l'offline.
 *
 * Filosofia del repo: NESSUN asset binario nel repository. Se lo sprite non
 * arriva (prima visita offline, rete lenta), l'app ricade sul disegno
 * low-poly procedurale di renderer.js — il gioco funziona comunque.
 *
 * Copyright: Pokémon e gli sprite sono © Nintendo / Creatures Inc. / GAME
 * FREAK inc. — uso fan-made, non commerciale.
 */

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Artwork ufficiale (alta risoluzione) — encounter, Pokédex, modali. */
export function artworkUrl(p, shiny = false) {
  if (!p || !p.dex) return null;
  return `${BASE}/other/official-artwork/${shiny ? 'shiny/' : ''}${p.dex}.png`;
}

/** Sprite da gioco (fronte, bassa risoluzione) — per iconcine. */
export function frontUrl(p, shiny = false) {
  if (!p || !p.dex) return null;
  return `${BASE}/${shiny ? 'shiny/' : ''}${p.dex}.png`;
}

/* cache di promesse: un solo caricamento per URL */
const cache = new Map();

/**
 * Carica uno sprite e restituisce una Promise<HTMLImageElement|null>.
 * `null` = caricamento fallito (offline): il chiamante userà il fallback.
 */
export function loadSprite(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  const prom = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS ok su raw.githubusercontent → canvas pulito
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  cache.set(url, prom);
  return prom;
}
