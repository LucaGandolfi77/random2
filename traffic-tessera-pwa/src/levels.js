import { DISTRICTS, LEVELS_PER_DISTRICT } from "./config.js";
import { LEVEL_DATA } from "./level-data.js";
import { applyMove, cellKey, exitClear, fits, isSolved, legalMoves, vehicleCells, wallSet } from "./rules.js";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
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

function terminalsFor(size, colors, copies, oneWayCount, rng) {
  const terminals = [];
  const used = new Set();
  const sides = ["top", "right", "bottom", "left"];
  const offset = Math.floor(rng() * 4);
  for (let color = 0; color < colors; color++) {
    for (let copy = 0; copy < copies; copy++) {
      const side = sides[(color + offset + copy * 2) % 4];
      let position = 1 + Math.floor(rng() * (size - 2));
      for (let attempt = 0; attempt < size; attempt++) {
        const candidate = side === "top" ? { x: position, y: 0 }
          : side === "bottom" ? { x: position, y: size - 1 }
            : side === "left" ? { x: 0, y: position }
              : { x: size - 1, y: position };
        const key = cellKey(candidate.x, candidate.y, size);
        if (!used.has(key)) {
          used.add(key);
          terminals.push({ id: `t${color}-${copy}`, color, side, oneWay: false, requiresDock: false, ...candidate });
          break;
        }
        position = 1 + ((position - 1 + 1) % (size - 2));
      }
    }
  }
  for (const terminal of shuffled(terminals.slice(), rng).slice(0, oneWayCount)) terminal.oneWay = true;
  return terminals;
}

function isBus(level, index) {
  return level.busIndices.includes(index);
}

function placementOptions(level, index, vehicles, rng, dockFirst = false) {
  const length = isBus(level, index) ? 3 : 2;
  const color = (index + level.colorOffset) % level.colors;
  const options = [];
  const walls = wallSet(level.walls);
  const terminals = level.terminals.filter(t => t.color === color && (!dockFirst || t.requiresDock));
  for (const terminal of terminals) {
    const horizontal = terminal.side === "left" || terminal.side === "right";
    for (let position = 0; position <= level.size - length; position++) {
      const vehicle = {
        id: `v${index}`,
        color,
        terminalId: terminal.id,
        orientation: horizontal ? "h" : "v",
        length,
        x: horizontal ? position : terminal.x,
        y: horizontal ? terminal.y : position,
        status: "active"
      };
      if (fits(vehicle, vehicle.x, vehicle.y, vehicles, walls, level)
        && exitClear(vehicle, vehicles, walls, level)) options.push(vehicle);
    }
  }
  return shuffled(options, rng);
}

function buildVehicles(level, rng) {
  let visited = 0;
  const budget = 6000;
  const dockColors = new Set(level.terminals.filter(terminal => terminal.requiresDock).map(terminal => terminal.color));
  const firstDock = [];
  const scheduled = new Set();
  for (let index = 0; index < level.vehicleCount; index++) {
    const color = (index + level.colorOffset) % level.colors;
    if (dockColors.has(color) && !scheduled.has(color)) {
      firstDock.push(index);
      scheduled.add(color);
    }
  }
  const order = [...firstDock, ...Array.from({ length: level.vehicleCount }, (_, index) => index).filter(index => !firstDock.includes(index))];
  const dockFirst = new Set(firstDock);
  function remainingSpace(vehicles, nextDepth) {
    const occupied = new Set();
    for (const vehicle of vehicles) for (const cell of vehicleCells(vehicle)) occupied.add(cellKey(cell.x, cell.y, level.size));
    let free = level.size * level.size - level.terminals.length - level.walls.length - occupied.size;
    for (let depth = nextDepth; depth < order.length; depth++) free -= isBus(level, order[depth]) ? 3 : 2;
    return free;
  }
  function search(depth, vehicles) {
    if (depth === order.length) return vehicles;
    if (++visited > budget || remainingSpace(vehicles, depth) < 0) return null;
    const index = order[depth];
    const nextIndex = order[depth + 1];
    const options = placementOptions(level, index, vehicles, rng, dockFirst.has(index)).map(vehicle => {
      const next = [...vehicles, vehicle];
      const future = depth + 1 < order.length ? placementOptions(level, nextIndex, next, rng, dockFirst.has(nextIndex)).length : 1;
      return { vehicle, next, future, tie: rng() };
    }).sort((a, b) => (b.future + b.tie) - (a.future + a.tie));
    for (const option of options) {
      if (!option.future) continue;
      const result = search(depth + 1, option.next);
      if (result) return result;
    }
    return null;
  }
  const result = search(0, []);
  return { vehicles: result, visited };
}

export function makeCandidate(districtIndex, stage, seed) {
  const district = DISTRICTS[districtIndex] || DISTRICTS[0];
  const rng = mulberry32(seed >>> 0);
  const size = district.size;
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) cells.push({ x, y, key: cellKey(x, y, size) });
  }
  let generatorNodes = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    const terminals = terminalsFor(size, district.colors, district.terminalCopies, district.oneWays, rng);
    const terminalKeys = new Set(terminals.map(t => cellKey(t.x, t.y, size)));
    const colorOffset = Math.floor(rng() * district.colors);
    const colorCounts = Array.from({ length: district.colors }, (_, color) =>
      Array.from({ length: district.vehicles }, (_, index) => (index + colorOffset) % district.colors)
        .filter(value => value === color).length);
    const dockCount = districtIndex === 0 ? 0 : districtIndex < 7 ? 1 : 2;
    const dockColors = new Set();
    const dockCandidates = shuffled(terminals.filter(terminal => !terminal.oneWay
      && (district.terminalCopies > 1 || colorCounts[terminal.color] === 1)
      && !dockColors.has(terminal.color)), rng);
    for (const terminal of dockCandidates) {
      if (dockColors.size >= dockCount || dockColors.has(terminal.color)) continue;
      terminal.requiresDock = true;
      dockColors.add(terminal.color);
    }
    const eligibleColors = colorCounts.map((count, color) => ({ count, color }))
      .filter(entry => size >= 8 || entry.count <= 2)
      .map(entry => entry.color);
    if (eligibleColors.length < district.buses) continue;
    const busIndices = [];
    for (let bus = 0; bus < district.buses; bus++) {
      const color = eligibleColors[bus % eligibleColors.length];
      const candidates = Array.from({ length: district.vehicles }, (_, index) => index)
        .filter(index => (index + colorOffset) % district.colors === color && !busIndices.includes(index));
      if (!candidates.length) break;
      busIndices.push(candidates[Math.floor(rng() * candidates.length)]);
    }
    if (busIndices.length !== district.buses) continue;
    const level = {
      id: `${district.id}-${stage + 1}`,
      kind: "campaign",
      districtIndex,
      districtName: district.name,
      stage,
      number: districtIndex * LEVELS_PER_DISTRICT + stage + 1,
      name: `${district.name} · ${stage + 1}`,
      seed: seed >>> 0,
      size,
      colors: district.colors,
      terminals,
      walls: [],
      vehicles: [],
      vehicleCount: district.vehicles,
      buses: district.buses,
      busIndices,
      colorOffset,
      removalOrder: []
    };
    const built = buildVehicles(level, rng);
    generatorNodes += built.visited;
    if (built.vehicles) {
      level.vehicles = built.vehicles;
      level.removalOrder = built.vehicles.map(vehicle => vehicle.id).reverse();
      level.knownSolution = level.removalOrder.map(id => ({ id, type: "exit" }));
      const occupied = new Set();
      for (const vehicle of level.vehicles) {
        for (const cell of vehicleCells(vehicle)) occupied.add(cellKey(cell.x, cell.y, level.size));
      }
      const wallCandidates = shuffled(cells.filter(cell => !terminalKeys.has(cell.key) && !occupied.has(cell.key)), rng);
      for (const cell of wallCandidates) {
        if (level.walls.length >= district.walls) break;
        const trial = [...level.walls, { ...cell }];
        level.walls = trial;
        if (!replay(level, level.vehicles, level.knownSolution)) level.walls.pop();
      }
      if (level.walls.length < district.walls) continue;
      level.generatorNodes = generatorNodes;
      return level;
    }
  }
  return null;
}

function cloneLevel(level) {
  return {
    ...level,
    terminals: level.terminals.map(t => ({ ...t })),
    walls: level.walls.map(w => ({ ...w })),
    vehicles: level.vehicles.map(v => ({ ...v })),
    solution: level.solution.map(move => ({ ...move })),
    shuffleVehicles: level.shuffleVehicles.map(v => ({ ...v })),
    shuffleSolution: level.shuffleSolution.map(move => ({ ...move })),
    removalOrder: (level.removalOrder || []).slice(),
    busIndices: level.busIndices.slice(),
    knownSolution: (level.knownSolution || []).map(move => ({ ...move }))
  };
}

export function makeLevel(districtIndex, stage) {
  const district = Math.max(0, Math.min(DISTRICTS.length - 1, districtIndex | 0));
  const levelStage = Math.max(0, Math.min(LEVELS_PER_DISTRICT - 1, stage | 0));
  const level = LEVEL_DATA[district * LEVELS_PER_DISTRICT + levelStage];
  if (!level) throw new Error(`Missing validated level ${district + 1}.${levelStage + 1}`);
  return cloneLevel(level);
}

export function dailyLevel(dateKey) {
  let hash = 2166136261;
  for (const character of dateKey) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const index = (hash >>> 0) % LEVEL_DATA.length;
  const level = makeLevel(Math.floor(index / LEVELS_PER_DISTRICT), index % LEVELS_PER_DISTRICT);
  return { ...level, id: `daily-${dateKey}`, kind: "daily", name: "Distretto del giorno" };
}

function replay(level, vehicles, solution) {
  let state = vehicles.map(vehicle => ({ ...vehicle }));
  for (const move of solution) {
    const legal = legalMoves(state, level).some(candidate => candidate.id === move.id
      && candidate.type === move.type
      && (move.type === "exit" || (candidate.x === move.x && candidate.y === move.y)));
    if (!legal) return null;
    state = applyMove(state, level, move);
  }
  return isSolved(state) ? state : null;
}

export function validateLevel(level) {
  const errors = [];
  if (!level || !level.vehicles || !level.solution) return ["missing level data"];
  if (!Number.isInteger(level.size) || level.size < 6 || level.size > 8) errors.push("invalid grid size");
  const terminalKeys = new Set();
  for (const terminal of level.terminals) {
    const key = cellKey(terminal.x, terminal.y, level.size);
    if (terminalKeys.has(key)) errors.push("duplicate terminal");
    terminalKeys.add(key);
    if (terminal.x < 0 || terminal.y < 0 || terminal.x >= level.size || terminal.y >= level.size) errors.push("terminal out of bounds");
    if (typeof terminal.oneWay !== "boolean") errors.push("invalid one-way terminal flag");
    if (typeof terminal.requiresDock !== "boolean") errors.push("invalid docking terminal flag");
    if (terminal.oneWay && terminal.requiresDock) errors.push("one-way docking terminal is ambiguous");
    if (terminal.side === "top" && terminal.y !== 0) errors.push("top terminal misplaced");
    if (terminal.side === "bottom" && terminal.y !== level.size - 1) errors.push("bottom terminal misplaced");
    if (terminal.side === "left" && terminal.x !== 0) errors.push("left terminal misplaced");
    if (terminal.side === "right" && terminal.x !== level.size - 1) errors.push("right terminal misplaced");
  }
  const wallKeys = new Set();
  for (const wall of level.walls) {
    const key = cellKey(wall.x, wall.y, level.size);
    if (wallKeys.has(key)) errors.push("duplicate wall");
    if (terminalKeys.has(key)) errors.push("wall on terminal");
    wallKeys.add(key);
  }
  const occupied = new Set();
  const ids = new Set();
  for (const vehicle of level.vehicles) {
    if (vehicle.status !== "active") errors.push("initial vehicle not active");
    if (ids.has(vehicle.id)) errors.push("duplicate vehicle id");
    ids.add(vehicle.id);
    if (vehicle.color < 0 || vehicle.color >= level.colors) errors.push("invalid vehicle color");
    const destination = level.terminals.find(t => t.id === vehicle.terminalId);
    if (!destination || destination.color !== vehicle.color) errors.push("invalid vehicle terminal");
    if (destination && ((vehicle.orientation === "h" && destination.y !== vehicle.y)
      || (vehicle.orientation === "v" && destination.x !== vehicle.x))) errors.push("vehicle not aligned with terminal");
    if (![2, 3].includes(vehicle.length) || !["h", "v"].includes(vehicle.orientation)) errors.push("invalid vehicle shape");
    for (const cell of vehicleCells(vehicle)) {
      const key = cellKey(cell.x, cell.y, level.size);
      if (cell.x < 0 || cell.y < 0 || cell.x >= level.size || cell.y >= level.size) errors.push("vehicle out of bounds");
      if (wallKeys.has(key) || terminalKeys.has(key) || occupied.has(key)) errors.push("vehicle overlaps blocked cell");
      occupied.add(key);
    }
  }
  if (!replay(level, level.vehicles, level.solution)) errors.push("stored solution does not solve level");
  if (level.solution.filter(move => move.type === "move").length < (level.requiredMoves || 0)) errors.push("not enough repositioning moves");
  if (level.districtIndex >= 3 && !level.vehicles.some(vehicle => level.terminals.find(terminal => terminal.id === vehicle.terminalId)?.oneWay)) errors.push("one-way lane is not used");
  if (level.districtIndex >= 1 && !level.vehicles.some(vehicle => level.terminals.find(terminal => terminal.id === vehicle.terminalId)?.requiresDock)) errors.push("docking terminal is not used");
  if (!replay(level, level.shuffleVehicles, level.shuffleSolution)) errors.push("shuffle state is not solvable");
  if (isSolved(level.vehicles)) errors.push("level already solved");
  return errors;
}

export function totalLevels() {
  return DISTRICTS.length * LEVELS_PER_DISTRICT;
}
