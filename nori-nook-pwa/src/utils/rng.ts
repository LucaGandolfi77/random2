export type Rng = () => number;

export const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const createRng = (seed: string | number): Rng => {
  const numeric = typeof seed === 'number' ? seed : hashString(seed);
  return mulberry32(numeric);
};

export const pick = <T>(items: readonly T[], rng: Rng): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.floor(rng() * items.length);
  return items[index];
};

export const pickWeighted = <T extends { weight: number }>(items: readonly T[], rng: Rng): T | undefined => {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return pick(items, rng);
  let ticket = rng() * total;
  for (const item of items) {
    ticket -= Math.max(0, item.weight);
    if (ticket <= 0) return item;
  }
  return items[items.length - 1];
};

export const shuffle = <T>(items: readonly T[], rng: Rng): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = result[index];
    const target = result[swapIndex];
    if (current !== undefined && target !== undefined) {
      result[index] = target;
      result[swapIndex] = current;
    }
  }
  return result;
};

export const pickMany = <T>(items: readonly T[], count: number, rng: Rng): T[] => shuffle(items, rng).slice(0, count);
