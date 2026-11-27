import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";
import { exitClear, legalMoves } from "../src/rules.js";

test("stored solution repositions vehicles, dispatches them and earns three stars", () => {
  const level = makeLevel(3, 0);
  const game = createGame(level);
  assert.ok(level.solution.some(move => move.type === "move"));
  for (const move of level.solution) {
    const result = move.type === "exit" ? game.exitVehicle(move.id) : game.moveVehicle(move.id, move.x, move.y);
    assert.equal(result.ok, true);
  }
  assert.equal(game.state.status, "won");
  assert.equal(game.state.exits, level.vehicles.length);
  assert.equal(game.state.stars, 3);
});

test("legal movement updates the grid and undo restores it", () => {
  const level = {
    id: "movement", kind: "campaign", size: 4, par: 1,
    terminals: [{ id: "t0", color: 0, side: "left", x: 0, y: 1 }], walls: [],
    vehicles: [{ id: "v0", color: 0, terminalId: "t0", orientation: "h", length: 2, x: 1, y: 1, status: "active" }],
    solution: [{ id: "v0", type: "exit" }],
    shuffleVehicles: [{ id: "v0", color: 0, terminalId: "t0", orientation: "h", length: 2, x: 1, y: 1, status: "active" }],
    shuffleSolution: [{ id: "v0", type: "exit" }]
  };
  const game = createGame(level);
  assert.equal(game.moveVehicle("v0", 2, 1).ok, true);
  assert.equal(game.state.vehicles[0].x, 2);
  assert.equal(game.undo(), true);
  assert.equal(game.state.vehicles[0].x, 1);
  assert.equal(game.state.moves, 0);
});

test("tow removes a blocked vehicle and consumes one charge", () => {
  const level = makeLevel(5, 0);
  const game = createGame(level);
  const blocked = game.state.vehicles.find(vehicle => !exitClear(vehicle, game.state.vehicles, level.walls, level));
  assert.ok(blocked);
  game.select(blocked.id);
  assert.equal(game.tow(), true);
  assert.equal(game.state.vehicles.find(vehicle => vehicle.id === blocked.id).status, "exited");
  assert.equal(game.state.towsLeft, 1);
  assert.equal(game.state.usedBooster, true);
});

test("shuffle uses the validated alternate state", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  assert.equal(game.shuffle(), true);
  assert.deepEqual(game.state.vehicles, level.shuffleVehicles);
  assert.equal(game.state.shufflesLeft, 0);
});

test("hint returns a legal next move", () => {
  const level = makeLevel(8, 0);
  const game = createGame(level);
  const hint = game.hint();
  assert.ok(hint);
  assert.ok(legalMoves(game.state.vehicles, level).some(move => move.id === hint.id && move.type === hint.type
    && (move.type === "exit" || (move.x === hint.x && move.y === hint.y))));
});

test("snapshot can be restored into a fresh game", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  game.exitVehicle(level.solution[0].id);
  const snapshot = game.snapshot();
  const restored = createGame(level, snapshot);
  assert.deepEqual(restored.state.vehicles, game.state.vehicles);
  assert.equal(restored.state.moves, game.state.moves);
});
