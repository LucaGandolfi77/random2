import test from "node:test";
import assert from "node:assert/strict";
import { BOARD_SIZE } from "../src/config.js";
import { createGame } from "../src/engine.js";
import { SHAPES } from "../src/pieces.js";

function piece(id, color, shapeId = "dot") {
  return { id, color, shape: SHAPES.find((shape) => shape.id === shapeId), rotation: 0 };
}

function spec(overrides) {
  return Object.assign({
    id: "test",
    kind: "endless",
    seed: 7,
    objective: null,
    obstacles: [],
    undoLimit: 3
  }, overrides || {});
}

function fillRow(game, row, except = []) {
  const skip = new Set(except);
  for (let x = 0; x < BOARD_SIZE; x++) {
    if (!skip.has(x)) game.getState().board[row * BOARD_SIZE + x] = { color: 0 };
  }
}

test("a piece can be placed only on free cells", () => {
  const game = createGame(spec());
  game.state.tray = [piece("a", 0), null, null];
  assert.equal(game.canPlaceAt(game.state.tray[0], 0, 0), true);
  game.state.board[0] = { color: 1 };
  assert.equal(game.canPlaceAt(game.state.tray[0], 0, 0), false);
  assert.equal(game.place(0, 0, 0).ok, false);
});

test("completing a row clears it and awards points", () => {
  const game = createGame(spec());
  fillRow(game, 0, [7]);
  game.state.tray = [piece("a", 0), null, null];
  const result = game.place(0, 7, 0);
  assert.equal(result.ok, true);
  assert.equal(result.lines, 1);
  assert.equal(game.state.lines, 1);
  assert.equal(game.state.board.slice(0, 8).every((cell) => cell === null), true);
  assert.ok(game.state.score > 0);
});

test("a row and column clear simultaneously with an intersection bonus", () => {
  const game = createGame(spec());
  fillRow(game, 0, [0]);
  for (let y = 1; y < BOARD_SIZE; y++) game.state.board[y * BOARD_SIZE] = { color: 0 };
  game.state.tray = [piece("a", 0), null, null];
  const result = game.place(0, 0, 0);
  assert.equal(result.lines, 2);
  assert.equal(result.cleared, 15);
  assert.equal(game.state.board.slice(0, 8).every((cell) => cell === null), true);
  assert.equal(game.state.board.filter((_, index) => index % BOARD_SIZE === 0).every((cell) => cell === null), true);
});

test("consecutive clears build a combo", () => {
  const game = createGame(spec());
  fillRow(game, 0, [7]);
  game.state.tray = [piece("a", 0), piece("b", 1), null];
  game.place(0, 7, 0);
  assert.equal(game.state.combo, 1);
  fillRow(game, 1, [7]);
  game.state.tray[1] = piece("b", 1);
  game.place(1, 7, 1);
  assert.equal(game.state.combo, 2);
  assert.equal(game.state.bestCombo, 2);
});

test("undo restores the board, tray and score", () => {
  const game = createGame(spec());
  game.state.tray = [piece("a", 0), null, null];
  game.place(0, 0, 0);
  assert.equal(game.state.pieces, 1);
  assert.equal(game.undo(), true);
  assert.equal(game.state.pieces, 0);
  assert.equal(game.state.board[0], null);
  assert.equal(game.state.undosLeft, 2);
});

test("rotation changes the occupied footprint", () => {
  const game = createGame(spec());
  game.state.tray = [piece("a", 0, "ell"), null, null];
  assert.equal(game.state.tray[0].rotation, 0);
  game.rotate(0);
  assert.equal(game.state.tray[0].rotation, 1);
  assert.equal(game.canPlaceAt(game.state.tray[0], 0, 0), true);
});

test("objective levels end in a win when the target is reached", () => {
  const game = createGame(spec({ objective: { type: "lines", target: 1, label: "Una linea" } }));
  fillRow(game, 0, [7]);
  game.state.tray = [piece("a", 0), null, null];
  game.place(0, 7, 0);
  assert.equal(game.state.status, "won");
  assert.equal(game.state.objectiveProgress, 1);
});

test("a full grid with no legal piece ends the game", () => {
  const diagonal = Array.from({ length: BOARD_SIZE }, (_, i) => ({ x: i, y: i }));
  const game = createGame(spec({ obstacles: diagonal }));
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    if (i !== 1 && i % (BOARD_SIZE + 1) !== 0) game.state.board[i] = { color: 0 };
  }
  game.state.tray = [piece("a", 0), piece("b", 1, "big-square"), piece("c", 2, "big-square")];
  game.place(0, 1, 0);
  assert.equal(game.state.status, "lost");
});

test("the same seed produces the same piece sequence", () => {
  const a = createGame(spec({ seed: 1234 }));
  const b = createGame(spec({ seed: 1234 }));
  assert.deepEqual(a.state.tray, b.state.tray);
});

test("snapshot restore keeps the live board array in sync", () => {
  const game = createGame(spec());
  game.state.tray = [piece("a", 0), null, null];
  game.place(0, 0, 0);
  const snapshot = game.snapshot();
  const restored = createGame(spec(), snapshot);
  assert.equal(restored.state.pieces, 1);
  assert.ok(restored.state.board[0]);
});
