export const SHAPES = [
  { id: "dot", weight: 2, cells: [[0, 0]] },
  { id: "duo", weight: 3, cells: [[0, 0], [1, 0]] },
  { id: "trio", weight: 3, cells: [[0, 0], [1, 0], [2, 0]] },
  { id: "quad", weight: 2, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "square", weight: 3, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: "corner", weight: 3, cells: [[0, 0], [1, 0], [0, 1]] },
  { id: "ell", weight: 3, cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: "tee", weight: 2, cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { id: "zig", weight: 2, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "big-square", weight: 1, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]] }
];

const TOTAL_WEIGHT = SHAPES.reduce((sum, shape) => sum + shape.weight, 0);

export function normalizeCells(cells) {
  const minX = Math.min(...cells.map((cell) => cell[0]));
  const minY = Math.min(...cells.map((cell) => cell[1]));
  return cells.map((cell) => [cell[0] - minX, cell[1] - minY]);
}

export function rotateCells(cells) {
  const normalized = normalizeCells(cells);
  const maxY = Math.max(...normalized.map((cell) => cell[1]));
  return normalizeCells(normalized.map(([x, y]) => [maxY - y, x]));
}

export function cellsFor(piece) {
  return piece.rotation % 2 === 0 ? piece.shape.cells : rotateCells(piece.shape.cells);
}

export function pieceSize(piece) {
  const cells = cellsFor(piece);
  return {
    width: Math.max(...cells.map((cell) => cell[0])) + 1,
    height: Math.max(...cells.map((cell) => cell[1])) + 1
  };
}

export function createPiece(id, color, rng) {
  let pick = rng() * TOTAL_WEIGHT;
  let shape = SHAPES[SHAPES.length - 1];
  for (const candidate of SHAPES) {
    pick -= candidate.weight;
    if (pick <= 0) { shape = candidate; break; }
  }
  return { id, shape, color, rotation: 0 };
}
