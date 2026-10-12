import { clamp, smoothstep } from '../core/utils.js';
import { currentTheme, THEMES } from './themes.js';

/**
 * La mappa attiva. Tutti i moduli leggono da qui: quando cambia
 * l'ambientazione, `applyLayout` aggiorna questo oggetto e il resto del
 * gioco si adatta senza sapere nulla dei temi.
 */
export const MAP = {
  half: 108,
  water: true,
  seaLevel: -0.14,
  shoreBase: 34,
  shoreWave: 10,
  beachDepth: 20,
};

export const ROADS = [];
export const PIAZZA = { x: 0, z: 0, r: 0 };
export const SPAWNS = [];
export const PONDS = [];

export const BOUNDS = {
  minX: -100,
  maxX: 100,
  minZ: -100,
  maxZ: 100,
};

let theme = THEMES.portomarina;

/** Installa un tema: da qui in poi il mondo è quello. */
export function applyLayout(id) {
  theme = currentTheme();
  Object.assign(MAP, theme.map);
  ROADS.length = 0;
  ROADS.push(...theme.roads);
  Object.assign(PIAZZA, theme.plaza);
  SPAWNS.length = 0;
  SPAWNS.push(...theme.spawns);
  PONDS.length = 0;
  PONDS.push(...(theme.ponds ?? []));
  const h = MAP.half;
  BOUNDS.minX = -h + 4;
  BOUNDS.maxX = h - 4;
  BOUNDS.minZ = -h + 4;
  BOUNDS.maxZ = MAP.water ? h - 12 : h - 6;
  return theme;
}

export function layoutTheme() {
  return theme;
}

/** Linea di riva (le spiagge dei temi con acqua). */
export function shoreZ(x) {
  return theme.shore ? theme.shore(x) : MAP.shoreBase;
}

/** Quota del terreno: base + rilievi del tema. */
export function groundY(x, z) {
  let y = 0;
  if (MAP.water) {
    const s = shoreZ(x);
    const edge = -MAP.beachDepth * 0.42;
    if (z >= s + edge) {
      const t = clamp((z - (s + edge)) / (MAP.beachDepth * 0.85), 0, 1);
      y = smoothstep(t) * -1.35;
    }
  }
  if (theme.relief) y += theme.relief(x, z);
  return y;
}

/** C'è terreno solido qui? false = nel vuoto (isole sospese). */
export function isSolid(x, z) {
  if (theme.solid && !theme.solid(x, z)) return false;
  return true;
}

export function isPond(x, z) {
  for (const p of PONDS) if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return true;
  return false;
}

export function isRoad(x, z) {
  for (const r of ROADS) {
    const d = r.axis === 'x' ? Math.abs(z - r.at) : Math.abs(x - r.at);
    if (d < r.w * 0.5) return true;
  }
  return false;
}

export function isPiazza(x, z) {
  return (x - PIAZZA.x) ** 2 + (z - PIAZZA.z) ** 2 < PIAZZA.r * PIAZZA.r;
}

export function isTown(x, z) {
  return theme.zones.town(x, z);
}

export function isBeach(x, z) {
  return theme.zones.field(x, z);
}

export function isSea(x, z) {
  return MAP.water ? theme.zones.water(x, z) : false;
}

export function isSeaDeep(x, z) {
  return MAP.water && groundY(x, z) < MAP.seaLevel - 0.12;
}

export function clampToBounds(v) {
  v.x = clamp(v.x, BOUNDS.minX, BOUNDS.maxX);
  v.z = clamp(v.z, BOUNDS.minZ, BOUNDS.maxZ);
  return v;
}