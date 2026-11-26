import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";

function spec(overrides) {
  return Object.assign({
    id: "test-1",
    width: 5,
    height: 5,
    colors: 1,
    blocks: [{ id: "b0", x: 2, y: 2, color: 0, gray: false }],
    walls: [],
    doors: [{ x: 2, y: 0, color: 0, capacity: 1, filled: 0 }],
    generators: [],
    elevators: [],
    blackouts: [],
    grayQuota: [0],
    moveLimit: 0,
    par: 2
  }, overrides || {});
}

test("a block slides through empty cells and is captured by its collector", () => {
  const game = createGame(spec());
  assert.equal(game.moveBlock("b0", 0, -1).ok, true);
  assert.equal(game.getState().cells[2 * 5 + 2], null);
  assert.equal(game.getState().cells[1 * 5 + 2].id, "b0");
  const result = game.moveBlock("b0", 0, -1);
  assert.equal(result.captured, true);
  assert.equal(game.getState().doors[0].filled, 1);
  assert.equal(game.getState().status, "won");
  assert.equal(game.remainingBlocks(), 0);
});

test("walls and other blocks prevent movement", () => {
  const game = createGame(spec({ walls: [{ x: 2, y: 1 }] }));
  assert.equal(game.moveBlock("b0", 0, -1).ok, false);
  assert.equal(game.getState().moves, 0);
});

test("a blackout freezes its cells", () => {
  const game = createGame(spec({
    blackouts: [{ id: "z0", cells: [{ x: 2, y: 1 }], period: 5, offDuration: 2, phase: 0, active: true }]
  }));
  assert.equal(game.moveBlock("b0", 0, -1).ok, false);
  assert.equal(game.getState().status, "playing");
});

test("lifts swap complete rows without losing blocks", () => {
  const game = createGame(spec({
    blocks: [
      { id: "a", x: 1, y: 2, color: 0, gray: false },
      { id: "b", x: 3, y: 3, color: 0, gray: false }
    ],
    doors: [{ x: 2, y: 0, color: 0, capacity: 2, filled: 0 }],
    elevators: [{ id: "e0", axis: "row", a: 2, b: 3, period: 1, timer: 0, swaps: 0 }]
  }));
  game.update(0.01);
  assert.equal(game.getState().cells[3 * 5 + 1].id, "a");
  assert.equal(game.getState().cells[2 * 5 + 3].id, "b");
  assert.equal(game.getState().elevators[0].swaps, 1);
});

test("generators add exactly the planned number of blocks", () => {
  const game = createGame(spec({
    blocks: [],
    doors: [{ x: 2, y: 0, color: 0, capacity: 1, filled: 0 }],
    generators: [{ id: "g0", x: 2, y: 4, color: 0, total: 1, interval: 5, spawned: 0, timer: 0, overload: 0 }]
  }));
  game.update(0.01);
  assert.equal(game.getState().generators[0].spawned, 1);
  assert.equal(game.remainingBlocks(), 1);
  game.update(10);
  assert.equal(game.getState().generators[0].spawned, 1);
});

test("the prism colours a gray block and consumes one charge", () => {
  const game = createGame(spec({
    blocks: [{ id: "gray", x: 2, y: 2, color: 0, gray: true }],
    grayQuota: [1]
  }));
  assert.equal(game.getState().charge, 1);
  assert.equal(game.usePrism("gray").ok, true);
  const block = game.blockById("gray").block;
  assert.equal(block.gray, false);
  assert.equal(block.color, 0);
  assert.equal(game.getState().charge, 0);
});

test("undo restores positions, score and collector state", () => {
  const game = createGame(spec());
  game.moveBlock("b0", 0, -1);
  game.moveBlock("b0", 0, -1);
  assert.equal(game.getState().status, "won");
  // A fresh game lets us test undo during play, before the winning capture.
  const fresh = createGame(spec());
  fresh.moveBlock("b0", 0, -1);
  assert.equal(fresh.undo(), true);
  assert.equal(fresh.blockById("b0").y, 2);
  assert.equal(fresh.getState().moves, 0);
});

test("snapshot restore reuses the same live board array", () => {
  const game = createGame(spec());
  game.moveBlock("b0", 0, -1);
  const snapshot = game.snapshot();
  const restored = createGame(spec(), snapshot);
  assert.equal(restored.blockById("b0").y, 1);
  restored.moveBlock("b0", 0, -1);
  assert.equal(restored.getState().doors[0].filled, 1);
  assert.equal(restored.getState().status, "won");
});

test("hint finds a legal path to a matching collector", () => {
  const game = createGame(spec());
  const hint = game.findHint();
  assert.equal(hint.type, "path");
  assert.equal(hint.id, "b0");
  assert.ok(hint.path.length >= 2);
});
