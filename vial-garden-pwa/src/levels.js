import { GARDENS, LEVELS_PER_GARDEN } from "./config.js";
import { LEVEL_DATA } from "./level-data.js";
import { applyPour, isSolved, stateMetrics } from "./rules.js";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function makeCandidate(gardenIndex, stage, seed) {
  const garden = GARDENS[gardenIndex] || GARDENS[0];
  const rng = mulberry32(seed >>> 0);
  const units = [];
  for (let color = 0; color < garden.colors; color++) {
    for (let i = 0; i < 4; i++) units.push(color);
  }
  shuffled(units, rng);
  const tubes = [];
  for (let i = 0; i < garden.colors; i++) tubes.push(units.slice(i * 4, i * 4 + 4));
  for (let i = garden.colors; i < garden.tubes; i++) tubes.push([]);
  return {
    id: `${garden.id}-${stage + 1}`,
    kind: "campaign",
    gardenIndex,
    gardenName: garden.name,
    stage,
    number: gardenIndex * LEVELS_PER_GARDEN + stage + 1,
    name: `${garden.name} · ${stage + 1}`,
    seed: seed >>> 0,
    colors: garden.colors,
    tubes
  };
}

function cloneLevel(level) {
  return {
    ...level,
    tubes: level.tubes.map((tube) => tube.slice()),
    solution: level.solution.map((move) => ({ ...move })),
    shuffleTubes: level.shuffleTubes.map((tube) => tube.slice()),
    shuffleSolution: level.shuffleSolution.map((move) => ({ ...move }))
  };
}

export function makeLevel(gardenIndex, stage) {
  const garden = Math.max(0, Math.min(GARDENS.length - 1, gardenIndex | 0));
  const levelIndex = Math.max(0, Math.min(LEVELS_PER_GARDEN - 1, stage | 0));
  const level = LEVEL_DATA[garden * LEVELS_PER_GARDEN + levelIndex];
  if (!level) throw new Error(`Missing validated level ${garden + 1}.${levelIndex + 1}`);
  return cloneLevel(level);
}

export function dailyLevel(dateKey) {
  let hash = 2166136261;
  for (const ch of dateKey) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const index = (hash >>> 0) % LEVEL_DATA.length;
  const level = makeLevel(Math.floor(index / LEVELS_PER_GARDEN), index % LEVELS_PER_GARDEN);
  return { ...level, id: `daily-${dateKey}`, kind: "daily", name: "Giardino del giorno" };
}

function replay(tubes, solution) {
  let state = tubes.map((tube) => tube.slice());
  for (const move of solution) {
    state = applyPour(state, move.from, move.to);
    if (!state) return null;
  }
  return state;
}

export function validateLevel(level) {
  const errors = [];
  if (!level || !level.tubes || !level.solution) return ["missing level data"];
  const total = level.tubes.reduce((sum, tube) => sum + tube.length, 0);
  if (total !== level.colors * 4) errors.push("wrong unit count");
  if (level.tubes.some((tube) => tube.length > 4)) errors.push("tube overflow");
  const solved = replay(level.tubes, level.solution);
  if (!solved || !isSolved(solved, level.colors)) errors.push("stored solution does not solve level");
  const shuffleSolved = replay(level.shuffleTubes, level.shuffleSolution);
  if (!shuffleSolved || !isSolved(shuffleSolved, level.colors)) errors.push("shuffle state is not solvable");
  if (stateMetrics(level.tubes).mixed < 2) errors.push("level is too trivial");
  return errors;
}

export function totalLevels() {
  return GARDENS.length * LEVELS_PER_GARDEN;
}
