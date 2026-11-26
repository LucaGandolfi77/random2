import { AREAS, COLORS, LEVELS_PER_AREA } from "./config.js";
import { LEVEL_SEEDS } from "./level-seeds.js";

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

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function doorPositions(width, count) {
  if (count >= width) return Array.from({ length: width }, (_, i) => i);
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(Math.round((i * (width - 1)) / Math.max(1, count - 1)));
  }
  return [...new Set(positions)];
}

function staticConnected(spec) {
  const { width, height } = spec;
  const blocked = new Set(spec.walls.map((p) => p.y * width + p.x));
  spec.generators.forEach((g) => blocked.add(g.y * width + g.x));
  const start = spec.blocks[0] || spec.doors[0];
  if (!start) return false;
  const queue = [[start.x, start.y]];
  const seen = new Set([start.y * width + start.x]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const key = ny * width + nx;
      if (seen.has(key) || blocked.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  for (const door of spec.doors) {
    if (!seen.has(door.y * width + door.x)) return false;
  }
  return seen.size >= Math.floor(width * height * 0.55);
}

export function makeCandidate(areaIndex, levelIndex, seedOverride, simplify = 0) {
  const area = AREAS[areaIndex] || AREAS[0];
  const stage = Math.max(0, Math.min(LEVELS_PER_AREA - 1, levelIndex | 0));
  const width = 7;
  const height = 7;
  const seed = seedOverride == null ? (8173 + areaIndex * 1009 + stage * 7919) >>> 0 : seedOverride >>> 0;
  const rng = mulberry32(seed);
  const colorCount = Math.min(COLORS.length, area.colors);
  const positions = doorPositions(width, colorCount);
  const doors = positions.map((x, color) => ({
    x,
    y: 0,
    color,
    capacity: 0,
    filled: 0
  }));
  const occupied = new Set(doors.map((d) => d.y * width + d.x));
  const interior = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < width; x++) interior.push({ x, y });
  }

  const generatorCount = areaIndex >= 3 ? (simplify >= 2 ? 1 : (stage >= 10 || areaIndex === 6 || areaIndex === 9 ? 2 : 1)) : 0;
  const generators = [];
  for (let i = 0; i < generatorCount; i++) {
    const x = 1 + Math.floor(rng() * (width - 2));
    const y = height - 1;
    const key = y * width + x;
    if (occupied.has(key)) continue;
    occupied.add(key);
    generators.push({
      id: `g${i}`,
      x,
      y,
      color: i % colorCount,
      total: Math.max(1, 2 + Math.floor(rng() * 3) - (simplify > 0 ? 1 : 0)),
      interval: (areaIndex === 6 ? 4.5 : areaIndex === 9 ? 5.5 : areaIndex === 8 ? 6 : 7.5) + rng() * 2,
      spawned: 0,
      timer: 3 + rng() * 3,
      overload: 0
    });
  }

  const wallCount = Math.max(0, Math.min(10, 2 + areaIndex * 2 + Math.floor(stage / 5)) - simplify);
  const walls = [];
  const candidates = shuffle(interior.filter((p) => !occupied.has(p.y * width + p.x)), rng);
  for (const p of candidates) {
    if (walls.length >= wallCount) break;
    const key = p.y * width + p.x;
    const nearDoor = p.y === 1 && doors.some((d) => Math.abs(d.x - p.x) <= 1);
    if (nearDoor && rng() < 0.75) continue;
    walls.push(p);
    occupied.add(key);
  }

  const blockCount = Math.max(colorCount + 2, Math.min(18, 7 + areaIndex * 2 + Math.floor(stage / 4)) - simplify);
  const blockCells = shuffle(interior.filter((p) => !occupied.has(p.y * width + p.x)), rng).slice(0, blockCount);
  const grayCount = areaIndex === 4 || areaIndex === 7 || areaIndex === 9
    ? Math.max(1, Math.min(5, 1 + Math.floor(stage / 5) + (areaIndex >= 7 ? 1 : 0)) - Math.floor(simplify / 2))
    : 0;
  const blocks = blockCells.map((p, i) => ({
    id: `b${i}`,
    x: p.x,
    y: p.y,
    color: i % colorCount,
    gray: i >= blockCount - grayCount
  }));
  blocks.forEach((b) => occupied.add(b.y * width + b.x));

  const counts = new Array(colorCount).fill(0);
  blocks.forEach((b) => { if (!b.gray) counts[b.color]++; });
  generators.forEach((g) => { counts[g.color] += g.total; });
  const grayQuota = new Array(colorCount).fill(0);
  for (let i = 0; i < grayCount; i++) grayQuota[i % colorCount]++;
  doors.forEach((door) => {
    door.capacity = counts[door.color] + grayQuota[door.color];
  });

  const elevators = [];
  const elevatorCount = areaIndex === 1 || areaIndex === 4 || areaIndex === 5 || areaIndex === 8 || areaIndex === 9
    ? (stage >= 12 || areaIndex === 8 || areaIndex === 9 ? 2 : 1)
    : 0;
  for (let i = 0; i < elevatorCount; i++) {
    const row = 2 + i * 2;
    if (row + 1 >= height - 1) continue;
    elevators.push({
      id: `e${i}`,
      axis: "row",
      a: row,
      b: row + 1,
      period: (areaIndex === 5 ? 5 : areaIndex === 8 || areaIndex === 9 ? 5.5 : 6.5) + rng() * 1.5,
      timer: 3 + rng() * 3,
      swaps: 0
    });
  }

  const blackouts = [];
  const blackoutCount = areaIndex === 2 || areaIndex === 4 || areaIndex === 7 || areaIndex === 8 || areaIndex === 9
    ? (stage >= 10 || areaIndex === 8 || areaIndex === 9 ? 2 : 1)
    : 0;
  for (let i = 0; i < blackoutCount; i++) {
    const x0 = 1 + Math.floor(rng() * (width - 3));
    const y0 = 2 + Math.floor(rng() * (height - 4));
    const cells = [];
    for (let y = y0; y < y0 + 2; y++) {
      for (let x = x0; x < x0 + 2; x++) cells.push({ x, y });
    }
    blackouts.push({
      id: `z${i}`,
      cells,
      period: (areaIndex === 8 || areaIndex === 9 ? 5.5 : 7) + rng() * 1.5,
      offDuration: (areaIndex === 8 || areaIndex === 9 ? 2.8 : 2.2) + rng(),
      phase: rng() * 5,
      active: false
    });
  }

  const spec = {
    id: `${area.id}-${stage + 1}`,
    kind: "campaign",
    areaIndex,
    areaName: area.name,
    levelIndex: stage,
    number: areaIndex * LEVELS_PER_AREA + stage + 1,
    seed,
    width,
    height,
    colors: colorCount,
    blocks,
    walls,
    doors,
    generators,
    elevators,
    blackouts,
    grayQuota,
    moveLimit: areaIndex >= 2 && stage % 5 === 4 ? blockCount * 5 + generatorCount * 8 : 0,
    par: blockCount * 3 + generators.reduce((n, g) => n + g.total * 2, 0) + elevators.length * 3 + blackouts.length * 2
  };

  if (!staticConnected(spec)) return null;
  return spec;
}

export function makeLevel(areaIndex, levelIndex) {
  const safeArea = Math.max(0, Math.min(AREAS.length - 1, areaIndex | 0));
  const stage = Math.max(0, Math.min(LEVELS_PER_AREA - 1, levelIndex | 0));
  const approved = LEVEL_SEEDS[safeArea]?.[stage] || [8173 + safeArea * 1009 + stage * 7919, 8];
  for (const simplify of [approved[1], Math.max(8, approved[1]), 14, 22]) {
    const candidate = makeCandidate(safeArea, stage, approved[0], simplify);
    if (candidate) return candidate;
  }
  return makeCandidate(0, stage, 8173 + stage * 7919, 22);
}

export function dailyLevel(dateKey) {
  let hash = 2166136261;
  for (const ch of dateKey) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const areaIndex = 2 + ((hash >>> 0) % 3);
  const stage = (hash >>> 8) % LEVELS_PER_AREA;
  const level = makeLevel(areaIndex, stage);
  return { ...level, id: `daily-${dateKey}`, kind: "daily", daily: true, seed: hash >>> 0 };
}

export function validateLevel(spec) {
  const errors = [];
  if (!staticConnected(spec)) errors.push("static board is disconnected");
  const capacity = spec.doors.reduce((n, d) => n + d.capacity, 0);
  const planned = spec.blocks.length + spec.generators.reduce((n, g) => n + g.total, 0);
  if (capacity !== planned) errors.push(`capacity ${capacity} != planned ${planned}`);
  const colored = spec.blocks.filter((b) => !b.gray).length + spec.generators.reduce((n, g) => n + g.total, 0);
  const gray = spec.blocks.filter((b) => b.gray).length;
  if (colored + gray !== planned) errors.push("block accounting mismatch");
  const expected = new Array(spec.colors).fill(0);
  spec.blocks.forEach((block) => { if (!block.gray) expected[block.color]++; });
  spec.generators.forEach((generator) => { expected[generator.color] += generator.total; });
  for (let color = 0; color < expected.length; color++) expected[color] += spec.grayQuota?.[color] || 0;
  for (const door of spec.doors) {
    if (door.capacity !== expected[door.color]) errors.push(`colour ${door.color} capacity ${door.capacity} != ${expected[door.color]}`);
  }
  const occupiedCells = spec.doors.length + spec.walls.length + spec.generators.length + planned;
  const emptyCells = spec.width * spec.height - occupiedCells;
  if (emptyCells < 3) errors.push(`only ${emptyCells} empty cells after all spawns`);
  for (const block of spec.blocks) {
    if (block.x < 0 || block.y < 1 || block.x >= spec.width || block.y >= spec.height) errors.push(`block ${block.id} out of bounds`);
  }
  return errors;
}
