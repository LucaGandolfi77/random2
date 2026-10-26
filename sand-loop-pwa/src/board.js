/*
 * Sand Loop — the sand board
 * --------------------------
 * The board is the quantized picture, stored as one bottom-up stack per
 * column. A captured grain may only take a cell from the three rows nearest
 * the bottom; everything above that cell falls one row, so the top of the
 * column empties and the sharp photo shows through.
 *
 * Pure and deterministic: the browser and the tests use the same columns and
 * the same seeded choice between eligible cells.
 */

import { mulberry32 } from "./quantize.js";

export const ACCESSIBLE_ROWS = 3;

export function createBoard(spec) {
  const width = spec.width;
  const height = spec.height;
  const palette = spec.palette;
  const indices = spec.indices;
  const seed = spec.seed == null ? 1 : spec.seed;

  if (indices.length !== width * height) {
    throw new Error("board: indices length does not match width * height");
  }

  const total = width * height;
  const cleared = new Uint8Array(total);
  const clearedByColor = new Array(palette.length).fill(0);
  const remaining = new Array(palette.length).fill(0);
  const columns = Array.from({ length: width }, () => []);

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const color = indices[index];
      if (color < 0 || color >= palette.length) throw new Error("board: colour index out of range");
      columns[x].push({ color, index });
      remaining[color]++;
    }
  }

  const accessibleRows = Math.min(ACCESSIBLE_ROWS, height);
  const pickRng = mulberry32((seed ^ 0x9e3779b1) >>> 0);
  let captured = 0;

  function captureCell(color) {
    if (color < 0 || color >= palette.length) return -1;

    const candidates = [];
    for (let x = 0; x < width; x++) {
      const column = columns[x];
      const depth = Math.min(accessibleRows, column.length);
      for (let k = 0; k < depth; k++) {
        if (column[k].color === color) candidates.push({ x, k, cell: column[k] });
      }
    }
    if (!candidates.length) return -1;

    const pick = candidates[Math.floor(pickRng() * candidates.length)];
    const column = columns[pick.x];
    const row = height - 1 - pick.k;
    column.splice(pick.k, 1);

    cleared[pick.cell.index] = 1;
    clearedByColor[color]++;
    remaining[color]--;
    captured++;

    return { index: pick.cell.index, x: pick.x, row, color };
  }

  function remainingColor(color) {
    return remaining[color] || 0;
  }

  function accessibleCount(color) {
    if (color < 0 || color >= palette.length) return 0;
    let count = 0;
    for (let x = 0; x < width; x++) {
      const column = columns[x];
      const depth = Math.min(accessibleRows, column.length);
      for (let k = 0; k < depth; k++) {
        if (column[k].color === color) count++;
      }
    }
    return count;
  }

  function accessibleByColor() {
    return palette.map((_, color) => accessibleCount(color));
  }

  function allCleared() {
    return captured >= total;
  }

  return {
    width,
    height,
    palette,
    indices,
    total,
    cleared,
    clearedByColor,
    accessibleRows,
    captureCell,
    remainingColor,
    accessibleCount,
    accessibleByColor,
    columnColors(x) {
      const column = columns[x];
      return column ? column.map((cell) => cell.color) : [];
    },
    allCleared,
    get captured() { return captured; },
    get progress() { return total ? captured / total : 1; },
    remainingByColor() { return remaining.slice(); }
  };
}
