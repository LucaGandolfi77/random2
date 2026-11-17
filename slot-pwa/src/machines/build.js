/* Helpers for declaring machines compactly. */
import { BET_STEPS, LINE_OPTIONS } from '../config.js';

export const S = (key, emoji, name, color, weight) => ({ key, emoji, name, color, weight });

/* A weighted, deterministically shuffled strip; uniform index => weighted symbol. */
export function strip(weights, seed = 0x9e3779b9) {
  const out = [];
  for (const [key, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) out.push(key);
  }
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const L = (rows) => rows.map((row, reel) => [reel, row]);

export const LINES_5X3 = [
  L([1, 1, 1, 1, 1]), L([0, 0, 0, 0, 0]), L([2, 2, 2, 2, 2]),
  L([0, 1, 1, 1, 2]), L([2, 1, 1, 1, 0]), L([1, 0, 0, 0, 1]),
  L([1, 2, 2, 2, 1]), L([0, 0, 1, 0, 0]), L([2, 2, 1, 2, 2]),
  L([0, 1, 0, 1, 0]), L([2, 1, 2, 1, 2]), L([0, 0, 1, 2, 2]),
  L([2, 2, 1, 0, 0]), L([1, 0, 1, 0, 1]), L([1, 2, 1, 2, 1]),
  L([0, 1, 2, 1, 0]), L([2, 1, 0, 1, 2]), L([0, 2, 0, 2, 0]),
  L([2, 0, 2, 0, 2]), L([0, 1, 1, 0, 1]),
];

export const LINES_5X3_25 = [
  ...LINES_5X3,
  L([1, 0, 0, 1, 2]), L([1, 2, 2, 1, 0]), L([0, 1, 0, 2, 1]),
  L([2, 1, 2, 0, 1]), L([0, 2, 1, 2, 0]),
];

export const LINES_3X3 = [
  L([0, 0, 0]), L([1, 1, 1]), L([2, 2, 2]),
  L([0, 1, 2]), L([2, 1, 0]),
];

export const LINES_5X4 = [
  L([1, 1, 1, 1, 1]), L([0, 0, 0, 0, 0]), L([3, 3, 3, 3, 3]), L([2, 2, 2, 2, 2]),
  L([0, 1, 2, 1, 0]), L([3, 2, 1, 2, 3]), L([1, 0, 0, 0, 1]), L([2, 3, 3, 3, 2]),
];

export function makeMachine(def) {
  const symbols = {};
  for (const s of def.symbols) symbols[s.key] = s;
  const weights = {};
  for (const s of def.symbols) if (s.weight) weights[s.key] = s.weight;
  const strips = def.strips || Array.from({ length: def.reels || 5 }, (_, i) => strip(weights, 0x9e3779b9 + i * 7919));
  return {
    reels: 5,
    rows: 3,
    payMode: 'lines',
    wild: 'wild',
    scatter: 'scatter',
    mystery: null,
    coin: null,
    mechanics: [],
    betSteps: BET_STEPS,
    lineOptions: LINE_OPTIONS,
    freeSpinsTable: { 3: 10, 4: 15, 5: 20 },
    unlockLevel: 1,
    volatility: 'Medium',
    rtp: '~89%',
    bonus: { picks: 3, pool: [250, 500, 1000, 'FREE', 'MINI', 'MINOR'] },
    jackpotWeights: { mini: 50, minor: 30, major: 15, grand: 5 },
    ...def,
    symbols,
    symbolList: def.symbols,
    weights,
    strips,
  };
}
