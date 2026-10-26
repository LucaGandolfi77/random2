import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../src/board.js";

function makeBoard(width = 6, height = 4, colors = 3) {
  const palette = Array.from({ length: colors }, (_, i) => ({ hex: "#" + String(i).repeat(6) }));
  const indices = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      indices[y * width + x] = (x + y) % colors;
    }
  }
  return createBoard({ width, height, palette, indices, seed: 7 });
}

test("only the outline starts exposed, on all four sides", () => {
  const b = makeBoard(6, 4, 3);
  assert.equal(b.total, 24);
  let count = 0;
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const index = y * b.width + x;
      const border = x === 0 || y === 0 || x === b.width - 1 || y === b.height - 1;
      assert.equal(!!b.exposed[index], border);
      if (border) {
        assert.equal(b.isAvailable(index), true);
        count++;
      } else {
        assert.equal(b.isAvailable(index), false);
      }
    }
  }
  assert.equal(count, 2 * (b.width + b.height) - 4);
  assert.equal(b.exposedByColorCounts().reduce((a, n) => a + n, 0), count);
  assert.equal(b.availableByColorCounts().reduce((a, n) => a + n, 0), count);
});

test("stealing an edge pixel exposes the cell behind it and leaves no gravity", () => {
  const b = makeBoard(3, 3, 2);
  const edge = 1 * b.width;
  const centre = 1 * b.width + 1;
  assert.equal(b.isAvailable(centre), false);
  const cell = b.steal(edge);
  assert.deepEqual({ x: cell.x, y: cell.y, color: cell.color }, { x: 0, y: 1, color: 1 });
  assert.equal(b.occupied[edge], 0);
  assert.equal(b.exposed[centre], 1);
  assert.equal(b.isOpen(0, 1), true);
  assert.equal(b.occupied[centre], 1);
  assert.equal(b.xOf(centre), 1);
  assert.equal(b.yOf(centre), 1);
  const inner = b.steal(centre);
  assert.equal(inner.x, 1);
  assert.equal(inner.y, 1);
  assert.equal(b.occupied[centre], 0);
});

test("an interior pixel cannot be stolen until a route opens", () => {
  const b = makeBoard(5, 5, 4);
  const centre = 2 * b.width + 2;
  assert.equal(b.isAvailable(centre), false);
  assert.equal(b.steal(centre), null);
  assert.equal(b.occupied[centre], 1);

  for (let y = 0; y < 5; y++) b.steal(y * b.width + 0);
  b.steal(2 * b.width + 1);
  assert.equal(b.isAvailable(centre), true);
  assert.ok(b.steal(centre));
});

test("reservations are exclusive and released back to the same colour", () => {
  const b = makeBoard(5, 5, 3);
  const candidates = b.availableIndices(0);
  assert.ok(candidates.length > 0);
  const index = candidates[0];
  const before = b.availableCount(0);
  assert.equal(b.reserve(index), true);
  assert.equal(b.reserve(index), false);
  assert.equal(b.availableCount(0), before - 1);
  assert.equal(b.isAvailable(index), false);
  assert.equal(b.release(index), true);
  assert.equal(b.availableCount(0), before);
  assert.equal(b.isAvailable(index), true);
  b.reserve(index);
  assert.ok(b.steal(index));
  assert.equal(b.availableCount(0), before - 1);
});

test("a board can be cleared only through exposed cells", () => {
  const b = makeBoard(7, 5, 5);
  const seen = new Set();
  while (!b.allCleared()) {
    const color = Array.from({ length: 5 }, (_, i) => i)
      .find((c) => b.availableCount(c) > 0);
    assert.notEqual(color, undefined);
    const cell = b.steal(b.availableIndices(color)[0]);
    assert.ok(cell);
    assert.equal(b.exposed[cell.index], 0);
    assert.equal(seen.has(cell.index), false);
    seen.add(cell.index);
  }
  assert.equal(seen.size, b.total);
  assert.equal(b.captured, b.total);
  assert.equal(b.progress, 1);
  assert.deepEqual(b.remainingByColor(), [0, 0, 0, 0, 0]);
});
