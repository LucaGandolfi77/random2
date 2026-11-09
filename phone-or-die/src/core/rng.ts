export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const random = (): number => Math.random();

export const chance = (probability: number): boolean => Math.random() < probability;

export const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const weightedPick = <T extends { weight: number }>(items: T[]): T | null => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
};

export const seededRandom = (seed: number): (() => number) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const simpleHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};
