/* Seedable RNG and weighted reel helpers. Machine strips are injected. */
import luckySeven from './machines/lucky-seven.js';

const DEFAULT_STRIPS = luckySeven.strips;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  return mulberry32(seed === undefined ? (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0 : seed);
}

export function pick(strip, rand) {
  return strip[Math.floor(rand() * strip.length) % strip.length];
}

export function generateStarts(strips, rand) {
  const list = strips || DEFAULT_STRIPS;
  return list.map((strip, reel) => ({
    reel,
    start: Math.floor(rand() * strip.length) % strip.length,
    strip,
  }));
}

export function startsToGrid(starts) {
  return gridFromStarts(starts, 3);
}

export function gridFromStarts(starts, rows = 3) {
  return starts.map(({ start, strip }) =>
    Array.from({ length: rows }, (_, row) => strip[(start + row) % strip.length]));
}

export function randomGrid(rand, machine) {
  const strips = machine?.strips || DEFAULT_STRIPS;
  const rows = machine?.rows || 3;
  return gridFromStarts(generateStarts(strips, rand), rows);
}

export function randomSymbol(reelIndex, rand, machine) {
  const strips = machine?.strips || DEFAULT_STRIPS;
  return pick(strips[reelIndex % strips.length], rand);
}

/* Daily challenge: a deterministic seed for a given day and machine. */
export function dailySeed(dayKey, machineId) {
  let h = 2166136261;
  const text = `${dayKey}:${machineId}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
