export function createBoard(spec) {
  const width = spec.width | 0;
  const height = spec.height | 0;
  const palette = spec.palette;
  const indices = spec.indices;

  if (width <= 0 || height <= 0) throw new Error("board: invalid size");
  if (!Array.isArray(palette) || !palette.length) throw new Error("board: empty palette");
  if (!indices || indices.length !== width * height) {
    throw new Error("board: indices length does not match width * height");
  }

  const total = width * height;
  const occupied = new Uint8Array(total);
  const exposed = new Uint8Array(total);
  const reserved = new Uint8Array(total);
  const remaining = new Array(palette.length).fill(0);
  const exposedByColor = new Array(palette.length).fill(0);
  const availableByColor = new Array(palette.length).fill(0);

  for (let i = 0; i < total; i++) {
    const color = indices[i];
    if (color < 0 || color >= palette.length) throw new Error("board: colour index out of range");
    occupied[i] = 1;
    remaining[color]++;
  }

  function xOf(index) { return index % width; }
  function yOf(index) { return (index / width) | 0; }

  function inBounds(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function isOpen(x, y) {
    if (!inBounds(x, y)) return true;
    return occupied[y * width + x] === 0;
  }

  function edgeExposed(index) {
    const x = xOf(index);
    const y = yOf(index);
    return !inBounds(x, y - 1) || !inBounds(x + 1, y) ||
      !inBounds(x, y + 1) || !inBounds(x - 1, y) ||
      occupied[index - width] === 0 || occupied[index + 1] === 0 ||
      occupied[index + width] === 0 || occupied[index - 1] === 0;
  }

  for (let i = 0; i < total; i++) {
    if (edgeExposed(i)) {
      exposed[i] = 1;
      exposedByColor[indices[i]]++;
      availableByColor[indices[i]]++;
    }
  }

  let captured = 0;

  function reserve(index) {
    if (index < 0 || index >= total) return false;
    if (!occupied[index] || !exposed[index] || reserved[index]) return false;
    reserved[index] = 1;
    availableByColor[indices[index]]--;
    return true;
  }

  function release(index) {
    if (index < 0 || index >= total || !reserved[index]) return false;
    reserved[index] = 0;
    if (occupied[index]) availableByColor[indices[index]]++;
    return true;
  }

  function exposeNeighbour(nx, ny) {
    if (!inBounds(nx, ny)) return;
    const index = ny * width + nx;
    if (!occupied[index] || exposed[index]) return;
    exposed[index] = 1;
    const color = indices[index];
    exposedByColor[color]++;
    availableByColor[color]++;
  }

  function steal(index) {
    if (index < 0 || index >= total) return null;
    if (!occupied[index] || !exposed[index]) return null;

    const x = xOf(index);
    const y = yOf(index);
    const color = indices[index];
    const wasReserved = reserved[index] === 1;

    occupied[index] = 0;
    exposed[index] = 0;
    reserved[index] = 0;
    remaining[color]--;
    exposedByColor[color]--;
    if (!wasReserved) availableByColor[color]--;
    captured++;

    exposeNeighbour(x, y - 1);
    exposeNeighbour(x + 1, y);
    exposeNeighbour(x, y + 1);
    exposeNeighbour(x - 1, y);

    return { index, x, y, color, wasReserved };
  }

  function availableIndices(color) {
    const out = [];
    for (let i = 0; i < total; i++) {
      if (occupied[i] && exposed[i] && !reserved[i] && indices[i] === color) out.push(i);
    }
    return out;
  }

  function exposedIndices(color) {
    const out = [];
    for (let i = 0; i < total; i++) {
      if (occupied[i] && exposed[i] && indices[i] === color) out.push(i);
    }
    return out;
  }

  function isAvailable(index) {
    return index >= 0 && index < total &&
      occupied[index] === 1 && exposed[index] === 1 && reserved[index] === 0;
  }

  return {
    width,
    height,
    palette,
    indices,
    total,
    occupied,
    exposed,
    reserved,
    remaining,
    exposedByColor,
    availableByColor,
    inBounds,
    isOpen,
    isAvailable,
    reserve,
    release,
    steal,
    availableIndices,
    exposedIndices,
    remainingColor(color) { return remaining[color] || 0; },
    exposedCount(color) { return exposedByColor[color] || 0; },
    availableCount(color) { return availableByColor[color] || 0; },
    remainingByColor() { return remaining.slice(); },
    exposedByColorCounts() { return exposedByColor.slice(); },
    availableByColorCounts() { return availableByColor.slice(); },
    xOf,
    yOf,
    allCleared() { return captured >= total; },
    get captured() { return captured; },
    get progress() { return total ? captured / total : 1; }
  };
}
