import { clamp, smoothstep } from '../core/utils.js';

/**
 * Pianta di Portomarina: una cittadina italiana schiacciata tra la collina
 * (a nord) e il mare (a sud). Tutti i moduli leggono da qui, così terreno,
 * strade e oggetti restano coerenti.
 */
export const MAP = {
  half: 108, // semi-estensione della mappa giocabile
  seaLevel: -0.14,
  shoreBase: 34, // z medio della linea di riva
  shoreWave: 10,
  beachDepth: 20, // distanza riva -> fondo mare
};

const SEA_LEVEL = MAP.seaLevel;
const SHORE_BASE = MAP.shoreBase;
const SHORE_WAVE = MAP.shoreWave;
const BEACH_DEPTH = MAP.beachDepth;
const HALF = MAP.half;

/** Linea di riva: una curva morbida, non una dritta. */
export function shoreZ(x) {
  return (
    SHORE_BASE +
    Math.sin(x * 0.042) * SHORE_WAVE * 0.6 +
    Math.sin(x * 0.015 + 1.7) * SHORE_WAVE * 0.8 +
    Math.sin(x * 0.09 + 0.4) * 1.6
  );
}

/** Quota del terreno: 0 in città, scende a -1.1 nel fondo del mare. */
export function groundY(x, z) {
  const s = shoreZ(x);
  if (z < s - BEACH_DEPTH * 0.42) return 0;
  const t = clamp((z - (s - BEACH_DEPTH * 0.42)) / (BEACH_DEPTH * 0.85), 0, 1);
  return smoothstep(t) * -1.35 + (t > 0 ? 0 : 0);
}

/** Le strade: due viali paralleli al mare più due vie di servizio. */
export const ROADS = [
  { axis: 'x', at: -34, w: 9 }, // Corso Umberto
  { axis: 'x', at: -6, w: 7 }, // Lungomare
  { axis: 'z', at: -14, w: 7 }, // Via del Porto
  { axis: 'z', at: 34, w: 6 }, // Via Bassa
];

export function isRoad(x, z) {
  for (const r of ROADS) {
    const d = r.axis === 'x' ? Math.abs(z - r.at) : Math.abs(x - r.at);
    if (d < r.w * 0.5) return true;
  }
  return false;
}

/** Piazza Grande: il cuore sociale, niente prop al centro. */
export const PIAZZA = { x: 16, z: -34, r: 15 };
export const isPiazza = (x, z) => Math.hypot(x - PIAZZA.x, z - PIAZZA.z) < PIAZZA.r;

export const isTown = (x, z) => z < shoreZ(x) - BEACH_DEPTH * 0.42 - 2;
export const isBeach = (x, z) => !isTown(x, z) && z < shoreZ(x) + 1.5;
export const isSea = (x, z) => z > shoreZ(x) - BEACH_DEPTH * 0.42;
export const isSeaDeep = (x, z) => z > shoreZ(x) + 3;

export const BOUNDS = {
  minX: -HALF + 4,
  maxX: HALF - 4,
  minZ: -HALF + 4,
  maxZ: HALF - 12,
};

/** Porta una posizione dentro i limiti giocabili. */
export function clampToBounds(v) {
  v.x = clamp(v.x, BOUNDS.minX, BOUNDS.maxX);
  v.z = clamp(v.z, BOUNDS.minZ, BOUNDS.maxZ);
  return v;
}

/** Punti di partenza dei buchi: sparagli per la town e il mare. */
/** Punti di partenza: tutti in terraferma, lontani dal mare aperto. */
export const SPAWNS = [
  { x: -38, z: -20 },
  { x: 30, z: -30 },
  { x: -58, z: -42 },
  { x: 64, z: -8 },
  { x: -10, z: 8 },
];
