export interface RandomState {
  rng: number;
}

/** mulberry32: tiny, fast, deterministic, and good enough for weather and combat. */
export function nextRandom(holder: RandomState): number {
  let a = holder.rng | 0;
  a = (a + 0x6d2b79f5) | 0;
  holder.rng = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomBetween(holder: RandomState, min: number, max: number): number {
  return min + nextRandom(holder) * (max - min);
}

export function randomInt(holder: RandomState, min: number, max: number): number {
  return Math.floor(randomBetween(holder, min, max + 1));
}

export function randomPick<T>(holder: RandomState, list: readonly T[]): T {
  return list[Math.floor(nextRandom(holder) * list.length) % list.length];
}

export function seedFromDate(date: number, salt = 0): number {
  const mixed = (date ^ (date >>> 16) ^ salt) >>> 0;
  return mixed || 0x9e3779b9;
}
