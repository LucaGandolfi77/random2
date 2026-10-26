import test from "node:test";
import assert from "node:assert/strict";
import { createBoard, ACCESSIBLE_ROWS } from "../src/board.js";

function makeBoard(seed, width = 6, height = 4, colors = 2) {
  const palette = Array.from({ length: colors }, (_, i) => ({ hex: i ? "#fff" : "#000" }));
  const indices = new Uint16Array(width * height);
  for (let i = 0; i < indices.length; i++) indices[i] = i % colors;
  return createBoard({ width, height, palette, indices, seed });
}

function makeOneColumn() {
  const palette = Array.from({ length: 5 }, (_, i) => ({ hex: `#00000${i}` }));
  const indices = new Uint16Array([0, 1, 2, 3, 4]);
  return createBoard({ width: 1, height: 5, palette, indices, seed: 1 });
}

test("the board knows its totals and accessible colours", () => {
  const b = makeBoard(7);
  assert.equal(b.total, 24);
  assert.equal(b.accessibleRows, ACCESSIBLE_ROWS);
  assert.deepEqual(b.remainingByColor(), [12, 12]);
  assert.deepEqual(b.accessibleByColor(), [9, 9]);
  assert.equal(b.progress, 0);
  assert.equal(b.captured, 0);
});

test("only cells in the three bottom rows are captured", () => {
  const b = makeBoard(7);
  const seen = new Set();
  while (!b.allCleared()) {
    const accessible = b.accessibleByColor();
    const color = accessible.findIndex((n) => n > 0);
    assert.ok(color >= 0);
    const cell = b.captureCell(color);
    assert.ok(cell);
    assert.ok(cell.row >= b.height - ACCESSIBLE_ROWS);
    assert.ok(!seen.has(cell.index));
    seen.add(cell.index);
  }
  assert.equal(b.captured, b.total);
  assert.equal(b.progress, 1);
  assert.deepEqual(b.remainingByColor(), [0, 0]);
});

test("removing a cell drops the cells above it and leaves the rest", () => {
  const b = makeOneColumn();
  const bottomBefore = b.columnColors(0).slice(0, 2);

  const cell = b.captureCell(2);
  assert.equal(cell.row, 2);
  assert.equal(cell.x, 0);
  assert.equal(cell.color, 2);
  assert.deepEqual(b.columnColors(0), [4, 3, 1, 0]);
  assert.deepEqual(b.columnColors(0).slice(0, 2), bottomBefore);
  assert.equal(b.captureCell(0), -1);

  const bottom = b.captureCell(4);
  assert.equal(bottom.row, 4);
  assert.deepEqual(b.columnColors(0), [3, 1, 0]);
});

test("a colour outside the bottom rows cannot be captured yet", () => {
  const palette = [{ hex: "#000" }, { hex: "#fff" }];
  const indices = new Uint16Array([1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  const b = createBoard({ width: 2, height: 5, palette, indices, seed: 3 });

  assert.equal(b.accessibleCount(1), 0);
  assert.equal(b.captureCell(1), -1);

  for (let i = 0; i < 8 && b.accessibleCount(1) === 0; i++) {
    assert.ok(b.captureCell(0));
  }
  assert.ok(b.accessibleCount(1) > 0);
  assert.ok(b.captureCell(1));
});

test("capture order is deterministic for a seed and changes across seeds", () => {
  const a = makeBoard(11);
  const b = makeBoard(11);
  const c = makeBoard(12);
  const orderA = Array.from({ length: 5 }, () => a.captureCell(1));
  const orderB = Array.from({ length: 5 }, () => b.captureCell(1));
  const orderC = Array.from({ length: 5 }, () => c.captureCell(1));
  assert.deepEqual(orderA, orderB);
  assert.notDeepEqual(orderA, orderC);
});
