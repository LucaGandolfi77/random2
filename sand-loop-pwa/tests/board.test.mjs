import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../src/board.js";

function makeBoard(seed) {
  const w = 6, h = 4;
  const palette = [{ hex: "#000" }, { hex: "#fff" }];
  const indices = new Uint16Array(w * h);
  for (let i = 0; i < indices.length; i++) indices[i] = i % 2;
  return createBoard({ width: w, height: h, palette, indices, seed });
}

test("the board knows its totals and remaining colours", () => {
  const b = makeBoard(7);
  assert.equal(b.total, 24);
  assert.deepEqual(b.remainingByColor(), [12, 12]);
  assert.equal(b.progress, 0);
  assert.equal(b.captured, 0);
});

test("capturing walks a colour exactly once and reports progress", () => {
  const b = makeBoard(7);
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    const cell = b.captureCell(0);
    assert.ok(cell >= 0);
    assert.ok(!seen.has(cell));
    seen.add(cell);
    assert.equal(b.indices[cell], 0);
  }
  assert.equal(b.captureCell(0), -1);
  assert.equal(b.captured, 12);
  assert.equal(b.remainingColor(0), 0);
  assert.equal(b.remainingColor(1), 12);
  assert.equal(b.progress, 0.5);
});

test("capture order is deterministic for a seed and different across seeds", () => {
  const a = makeBoard(11);
  const b = makeBoard(11);
  const c = makeBoard(12);
  const orderA = Array.from({ length: 12 }, () => a.captureCell(1));
  const orderB = Array.from({ length: 12 }, () => b.captureCell(1));
  const orderC = Array.from({ length: 12 }, () => c.captureCell(1));
  assert.deepEqual(orderA, orderB);
  assert.notDeepEqual(orderA, orderC);
});

test("all cells can be cleared and nothing is captured twice", () => {
  const b = makeBoard(3);
  for (let color = 0; color < 2; color++) {
    for (let i = 0; i < 12; i++) assert.ok(b.captureCell(color) >= 0);
  }
  assert.equal(b.captured, 24);
  assert.equal(b.allCleared(), true);
  assert.equal(b.progress, 1);
  assert.deepEqual(b.clearedByColor, [12, 12]);
  assert.deepEqual(b.remainingByColor(), [0, 0]);
});
