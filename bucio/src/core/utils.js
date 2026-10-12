/** Utility condivise: RNG deterministico, matematica, colori, layout. */

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** RNG mulberry32: veloce e deterministico, così la città è sempre uguale. */
export function makeRng(seed = 1337) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 1664525 + 1013904223) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (a, b) => a + next() * (b - a);
  next.int = (a, b) => Math.floor(a + next() * (b - a + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];
  next.chance = (p) => next() < p;
  next.sign = () => (next() < 0.5 ? -1 : 1);
  /** deviazione gaussiana approssimata (media di 3 uniformi). */
  next.gauss = () => (next() + next() + next()) / 1.5 - 1;
  return next;
}

export function formatInt(n) {
  return Math.round(n).toLocaleString('it-IT');
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (('ontouchstart' in window && navigator.maxTouchPoints > 0) ||
    navigator.maxTouchPoints > 1);

/** Salva il record personale. */
export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* modalità privata: pazienza */
    }
  },
};

