export const rollDie = (sides: number, rng: () => number = Math.random): number =>
  Math.floor(rng() * sides) + 1;

export const rollDice = (expression: string, rng: () => number = Math.random): number => {
  const cleaned = expression.replace(/\s/g, '').toLowerCase();
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    const flat = Number(cleaned);
    return Number.isFinite(flat) ? flat : 0;
  }
  const count = Math.min(20, Math.max(1, Number(match[1])));
  const sides = Math.max(2, Number(match[2]));
  const bonus = Number(match[3] ?? 0);
  let total = bonus;
  for (let i = 0; i < count; i++) total += rollDie(sides, rng);
  return total;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const modifier = (score: number) => Math.floor((score - 10) / 2);

export const formatMod = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const simpleHash = (str: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0').slice(0, 16);
};
