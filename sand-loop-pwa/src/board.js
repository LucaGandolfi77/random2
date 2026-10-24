/*
 * Sand Loop — the sand board
 * --------------------------
 * The board is the quantized picture: one colour index per cell, plus a
 * shuffled queue of cells for every colour. When the engine captures a grain
 * we clear the next cell of that colour, which reveals the sharp photo
 * underneath. A spilled grain changes nothing: its sand is still in the
 * picture and the engine puts it back in the hopper later.
 *
 * Pure and deterministic: the browser and the tests use the same queues.
 */

import { mulberry32 } from "./quantize.js";

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

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
  const queues = palette.map(() => []);
  for (let i = 0; i < indices.length; i++) {
    const color = indices[i];
    if (color < 0 || color >= palette.length) throw new Error("board: colour index out of range");
    queues[color].push(i);
    remaining[color]++;
  }

  /* Different colours get different streams, so clearing a photo does not
   * walk the picture in one obvious raster line. */
  queues.forEach((queue, color) => shuffle(queue, mulberry32((seed ^ (color * 0x9e3779b1)) >>> 0)));

  let captured = 0;

  function captureCell(color) {
    if (color < 0 || color >= queues.length) return -1;
    const queue = queues[color];
    while (queue.length) {
      const index = queue.pop();
      if (!cleared[index]) {
        cleared[index] = 1;
        clearedByColor[color]++;
        remaining[color]--;
        captured++;
        return index;
      }
    }
    return -1;
  }

  function remainingColor(color) {
    return remaining[color] || 0;
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
    captureCell,
    remainingColor,
    allCleared,
    get captured() { return captured; },
    get progress() { return total ? captured / total : 1; },
    remainingByColor() { return remaining.slice(); }
  };
}
