import { DIRECTIONS, FACTORIES, LEVELS_PER_FACTORY } from "./config.js";
import { LEVEL_DATA } from "./level-data.js";
import { applyMove, buildSolverModel, cellKey, isSolved, legalMoves } from "./rules.js";

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

function rayCells(x, y, dir, size) {
  const direction = DIRECTIONS[dir];
  const cells = [];
  x += direction.dx;
  y += direction.dy;
  while (x >= 0 && y >= 0 && x < size && y < size) {
    cells.push({ x, y, key: cellKey(x, y, size) });
    x += direction.dx;
    y += direction.dy;
  }
  return cells;
}

function constructionClear(x, y, dir, arrows, walls, size) {
  const ray = rayCells(x, y, dir, size);
  for (const cell of ray) {
    if (walls.has(cell.key)) return false;
    if (arrows.some((arrow) => arrow.x === cell.x && arrow.y === cell.y)) return false;
  }
  return true;
}

function addDoors(level, rng, removalOrder) {
  if (!level.doorCount) return;
  const size = level.size;
  const occupied = new Set(level.arrows.map((a) => cellKey(a.x, a.y, size)));
  const rank = new Map(removalOrder.map((index, order) => [index, order]));
  const rays = level.arrows.map((arrow) => rayCells(arrow.x, arrow.y, arrow.dir, size));
  const candidates = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = cellKey(x, y, size);
      if (occupied.has(key)) continue;
      for (let requiredIndex = 0; requiredIndex < level.arrows.length; requiredIndex++) {
        const requiredRank = rank.get(requiredIndex);
        const crosses = [];
        let valid = true;
        for (let i = 0; i < rays.length; i++) {
          if (!rays[i].some((cell) => cell.key === key)) continue;
          if (rank.get(i) <= requiredRank) { valid = false; break; }
          crosses.push(i);
        }
        if (valid && crosses.length) candidates.push({ x, y, key, requiredIndex, weight: crosses.length });
      }
    }
  }
  if (!candidates.length) return;
  candidates.sort((a, b) => b.weight - a.weight);
  const pool = candidates.slice(0, Math.min(30, candidates.length));
  for (let i = 0; i < level.doorCount; i++) {
    const choice = pool[Math.floor(rng() * pool.length)];
    if (!choice || occupied.has(choice.key)) continue;
    occupied.add(choice.key);
    level.walls = level.walls.filter((wall) => wall.key !== choice.key);
    level.doors.push({ id: `d${i}`, x: choice.x, y: choice.y, key: choice.key, requires: [level.arrows[choice.requiredIndex].id] });
  }
}

export function makeCandidate(factoryIndex, stage, seed) {
  const factory = FACTORIES[factoryIndex] || FACTORIES[0];
  const rng = mulberry32(seed >>> 0);
  const size = factory.size;
  const arrowCount = Math.min(size * size - factory.walls - factory.doors - 2, factory.arrows + Math.floor(stage / 4));
  const wallCount = Math.min(factory.walls + Math.floor(stage / 3), Math.floor(size * size * 0.18));
  const cells = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) cells.push({ x, y, key: cellKey(x, y, size) });
  const wallCells = shuffled(cells.slice(), rng).slice(0, wallCount);
  const walls = new Set(wallCells.map((cell) => cell.key));
  const arrows = [];
  const removalOrder = [];

  for (let i = 0; i < arrowCount; i++) {
    const options = [];
    for (const cell of cells) {
      if (walls.has(cell.key) || arrows.some((arrow) => arrow.x === cell.x && arrow.y === cell.y)) continue;
      for (let dir = 0; dir < DIRECTIONS.length; dir++) {
        if (!constructionClear(cell.x, cell.y, dir, arrows, walls, size)) continue;
        const length = rayCells(cell.x, cell.y, dir, size).length;
        const edge = cell.x === 0 || cell.y === 0 || cell.x === size - 1 || cell.y === size - 1;
        options.push({ ...cell, dir, score: length * 2 - (edge ? 3 : 0) + rng() * 4 });
      }
    }
    if (!options.length) return null;
    options.sort((a, b) => b.score - a.score);
    const pool = options.slice(0, Math.min(8, options.length));
    const choice = pool[Math.floor(rng() * pool.length)];
    const index = arrows.length;
    arrows.push({ id: `a${index}`, x: choice.x, y: choice.y, dir: choice.dir, heavy: false });
    removalOrder.unshift(index);
  }

  const heavyIndices = shuffled(arrows.map((_, index) => index), rng).slice(0, Math.min(factory.heavy + Math.floor(stage / 4), arrowCount));
  heavyIndices.forEach((index) => { arrows[index].heavy = true; });

  const level = {
    id: `${factory.id}-${stage + 1}`,
    kind: "campaign",
    factoryIndex,
    factoryName: factory.name,
    stage,
    number: factoryIndex * LEVELS_PER_FACTORY + stage + 1,
    name: `${factory.name} · ${stage + 1}`,
    seed: seed >>> 0,
    size,
    arrows,
    walls: wallCells,
    doorCount: factory.doors + (factory.doors > 0 ? Math.floor(stage / 5) : 0),
    doors: [],
    removalOrder
  };
  addDoors(level, rng, removalOrder);
  return level;
}

function cloneLevel(level) {
  return {
    ...level,
    arrows: level.arrows.map((arrow) => ({ ...arrow })),
    walls: level.walls.map((wall) => ({ ...wall })),
    doors: level.doors.map((door) => ({ ...door, requires: door.requires.slice() })),
    solution: level.solution.map((move) => ({ ...move })),
    removalOrder: level.removalOrder.slice()
  };
}

export function makeLevel(factoryIndex, stage) {
  const factory = Math.max(0, Math.min(FACTORIES.length - 1, factoryIndex | 0));
  const levelIndex = Math.max(0, Math.min(LEVELS_PER_FACTORY - 1, stage | 0));
  const level = LEVEL_DATA[factory * LEVELS_PER_FACTORY + levelIndex];
  if (!level) throw new Error(`Missing validated level ${factory + 1}.${levelIndex + 1}`);
  return cloneLevel(level);
}

export function dailyLevel(dateKey) {
  let hash = 2166136261;
  for (const ch of dateKey) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const index = (hash >>> 0) % LEVEL_DATA.length;
  const level = makeLevel(Math.floor(index / LEVELS_PER_FACTORY), index % LEVELS_PER_FACTORY);
  return { ...level, id: `daily-${dateKey}`, kind: "daily", name: "Fabbrica del giorno" };
}

function replay(level, solution) {
  const model = buildSolverModel(level);
  let remaining = (1n << BigInt(level.arrows.length)) - 1n;
  let weakened = 0n;
  for (const move of solution) {
    if (!legalMoves(remaining, weakened, model).some((candidate) => candidate.index === move.index && candidate.type === move.type)) return null;
    const next = applyMove(remaining, weakened, move, model);
    remaining = next.remaining;
    weakened = next.weakened;
  }
  return isSolved(remaining) ? { remaining, weakened } : null;
}

export function validateLevel(level) {
  const errors = [];
  if (!level || !level.arrows || !level.solution) return ["missing level data"];
  const occupied = new Set();
  for (const arrow of level.arrows) {
    if (arrow.x < 0 || arrow.y < 0 || arrow.x >= level.size || arrow.y >= level.size) errors.push("arrow out of bounds");
    const key = cellKey(arrow.x, arrow.y, level.size);
    if (occupied.has(key)) errors.push("duplicate arrow cell");
    occupied.add(key);
  }
  for (const wall of level.walls) if (occupied.has(wall.key)) errors.push("wall on arrow");
  const ids = new Set(level.arrows.map((arrow) => arrow.id));
  for (const door of level.doors) {
    if (occupied.has(door.key)) errors.push("door on arrow");
    if (door.requires.some((id) => !ids.has(id))) errors.push("door requires missing arrow");
  }
  if (!replay(level, level.solution)) errors.push("stored solution does not solve level");
  if (level.arrows.length < 8) errors.push("level too small");
  return errors;
}

export function totalLevels() {
  return FACTORIES.length * LEVELS_PER_FACTORY;
}
