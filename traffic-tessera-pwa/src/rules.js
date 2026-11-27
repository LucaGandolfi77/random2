export function cellKey(x, y, size) {
  return y * size + x;
}

export function vehicleCells(vehicle) {
  const cells = [];
  for (let i = 0; i < vehicle.length; i++) {
    cells.push(vehicle.orientation === "h"
      ? { x: vehicle.x + i, y: vehicle.y }
      : { x: vehicle.x, y: vehicle.y + i });
  }
  return cells;
}

export function wallSet(walls) {
  return walls instanceof Set ? walls : new Set(walls.map(wall => wall.key));
}

export function occupancy(vehicles, size, ignoreId = null) {
  const occupied = new Set();
  for (const vehicle of vehicles) {
    if (vehicle.status === "exited" || vehicle.id === ignoreId) continue;
    for (const cell of vehicleCells(vehicle)) occupied.add(cellKey(cell.x, cell.y, size));
  }
  return occupied;
}

export function fits(vehicle, x, y, vehicles, walls, level, allowTerminal = false) {
  const size = level.size;
  if (x < 0 || y < 0 || x >= size || y >= size) return false;
  if (vehicle.orientation === "h" ? x + vehicle.length > size : y + vehicle.length > size) return false;
  const occupied = occupancy(vehicles, size, vehicle.id);
  const blocked = wallSet(walls);
  const terminals = new Set((level.terminals || []).map(t => cellKey(t.x, t.y, size)));
  for (const cell of vehicleCells({ ...vehicle, x, y })) {
    const key = cellKey(cell.x, cell.y, size);
    if (blocked.has(key) || occupied.has(key)) return false;
    if (!allowTerminal && terminals.has(key)) return false;
  }
  return true;
}

function terminalInDirection(vehicle, level, direction) {
  const candidates = (level.terminals || []).filter(t => t.color === vehicle.color && (
    vehicle.orientation === "h"
      ? (t.side === "left" || t.side === "right") && t.y === vehicle.y && (t.side === "right" ? 1 : -1) === direction
      : (t.side === "top" || t.side === "bottom") && t.x === vehicle.x && (t.side === "bottom" ? 1 : -1) === direction
  ));
  return candidates.find(t => t.id === vehicle.terminalId) || candidates[0] || null;
}

function destinationTerminal(vehicle, level) {
  return (level.terminals || []).find(t => t.id === vehicle.terminalId)
    || (level.terminals || []).find(t => t.color === vehicle.color && (
      vehicle.orientation === "h"
        ? (t.side === "left" || t.side === "right") && t.y === vehicle.y
        : (t.side === "top" || t.side === "bottom") && t.x === vehicle.x
    ));
}

export function isOneWay(vehicle, level) {
  return destinationTerminal(vehicle, level)?.oneWay === true;
}

export function isDocked(vehicle, level) {
  const terminal = destinationTerminal(vehicle, level);
  if (!terminal) return false;
  if (vehicle.orientation === "h") {
    return terminal.side === "right" ? vehicle.x + vehicle.length === terminal.x : vehicle.x - 1 === terminal.x;
  }
  return terminal.side === "bottom" ? vehicle.y + vehicle.length === terminal.y : vehicle.y - 1 === terminal.y;
}

export function exitDirection(vehicle, level) {
  const terminal = destinationTerminal(vehicle, level);
  if (!terminal) return 0;
  if (vehicle.orientation === "h") return terminal.side === "right" ? 1 : -1;
  return terminal.side === "bottom" ? 1 : -1;
}

export function exitBlockers(vehicle, vehicles, walls, level) {
  const direction = exitDirection(vehicle, level);
  const terminal = terminalInDirection(vehicle, level, direction);
  if (!direction || !terminal) return Infinity;
  if (terminal.requiresDock && !isDocked(vehicle, level)) return Infinity;
  const size = level.size;
  const cells = [];
  if (vehicle.orientation === "h") {
    if (direction > 0) for (let x = vehicle.x + vehicle.length; x < size; x++) cells.push({ x, y: vehicle.y });
    else for (let x = vehicle.x - 1; x >= 0; x--) cells.push({ x, y: vehicle.y });
  } else {
    if (direction > 0) for (let y = vehicle.y + vehicle.length; y < size; y++) cells.push({ x: vehicle.x, y });
    else for (let y = vehicle.y - 1; y >= 0; y--) cells.push({ x: vehicle.x, y });
  }
  const occupied = occupancy(vehicles, size, vehicle.id);
  const blocked = wallSet(walls);
  const blockers = [];
  for (const cell of cells) {
    const key = cellKey(cell.x, cell.y, size);
    if (blocked.has(key)) return Infinity;
    if (occupied.has(key)) blockers.push(key);
  }
  return blockers.length;
}

export function exitClear(vehicle, vehicles, walls, level) {
  return exitBlockers(vehicle, vehicles, walls, level) === 0;
}

export function legalMoves(vehicles, level) {
  const moves = [];
  const walls = wallSet(level.walls);
  for (const vehicle of vehicles) {
    if (vehicle.status === "exited") continue;
    const directions = isOneWay(vehicle, level) ? [exitDirection(vehicle, level)].filter(Boolean) : [-1, 1];
    for (const direction of directions) {
      for (let step = 1; step < level.size; step++) {
        const x = vehicle.x + (vehicle.orientation === "h" ? direction * step : 0);
        const y = vehicle.y + (vehicle.orientation === "v" ? direction * step : 0);
        if (!fits(vehicle, x, y, vehicles, walls, level)) break;
        moves.push({ id: vehicle.id, type: "move", x, y });
      }
      if (exitDirection(vehicle, level) === direction && exitClear(vehicle, vehicles, walls, level)) {
        moves.push({ id: vehicle.id, type: "exit", direction });
      }
    }
  }
  return moves;
}

export function applyMove(vehicles, level, move) {
  return vehicles.map(vehicle => vehicle.id === move.id
    ? move.type === "exit"
      ? { ...vehicle, status: "exited" }
      : { ...vehicle, x: move.x, y: move.y }
    : { ...vehicle });
}

export function isSolved(vehicles) {
  return vehicles.every(vehicle => vehicle.status === "exited");
}

export function stateKey(vehicles) {
  return vehicles.filter(vehicle => vehicle.status !== "exited")
    .map(vehicle => `${vehicle.id}:${vehicle.x},${vehicle.y}`).join("|");
}

export function heuristic(vehicles, level) {
  const walls = wallSet(level.walls);
  let value = 0;
  for (const vehicle of vehicles) {
    if (vehicle.status === "exited") continue;
    const blockers = exitBlockers(vehicle, vehicles, walls, level);
    value += 1 + (Number.isFinite(blockers) ? Math.min(2, blockers) * 0.65 : 2);
  }
  return value;
}
