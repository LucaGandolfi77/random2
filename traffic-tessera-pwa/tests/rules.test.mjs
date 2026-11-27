import test from "node:test";
import assert from "node:assert/strict";
import { applyMove, exitClear, fits, isSolved, legalMoves, stateKey, vehicleCells } from "../src/rules.js";

const level = {
  size: 4,
  terminals: [{ id: "t0", color: 0, side: "left", x: 0, y: 1 }],
  walls: []
};

test("vehicle cells include every bus segment", () => {
  assert.deepEqual(vehicleCells({ x: 1, y: 2, length: 3, orientation: "h" }), [
    { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }
  ]);
  assert.deepEqual(vehicleCells({ x: 2, y: 1, length: 3, orientation: "v" }), [
    { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }
  ]);
});

test("fits rejects walls, overlaps and terminal cells", () => {
  const vehicle = { id: "a", x: 1, y: 1, length: 2, orientation: "h", status: "active" };
  assert.equal(fits(vehicle, 1, 1, [], [], level), true);
  assert.equal(fits(vehicle, 3, 1, [], [], level), false);
  assert.equal(fits(vehicle, 0, 1, [], [], level), false);
  assert.equal(fits(vehicle, 1, 1, [{ id: "b", x: 2, y: 1, length: 1, orientation: "h" }], [], level), false);
  assert.equal(fits(vehicle, 1, 1, [], [{ key: 5 }], level), false);
});

test("a vehicle exits only through its matching terminal direction", () => {
  const vehicle = { id: "a", color: 0, terminalId: "t0", x: 1, y: 1, length: 2, orientation: "h", status: "active" };
  const moves = legalMoves([vehicle], level);
  assert.equal(exitClear(vehicle, [vehicle], [], level), true);
  assert.equal(moves.some(move => move.id === "a" && move.type === "exit"), true);
  assert.equal(moves.filter(move => move.type === "exit").length, 1);
  const wrongTerminal = { ...level, terminals: [{ id: "t0", color: 0, side: "right", x: 3, y: 1 }] };
  assert.equal(legalMoves([vehicle], wrongTerminal).some(move => move.type === "exit" && move.direction === -1), false);
});

test("one-way terminals only allow movement toward the exit", () => {
  const oneWayLevel = {
    size: 4,
    terminals: [{ id: "t0", color: 0, side: "right", x: 3, y: 1, oneWay: true, requiresDock: false }],
    walls: []
  };
  const vehicle = { id: "a", color: 0, terminalId: "t0", x: 0, y: 1, length: 2, orientation: "h", status: "active" };
  const moves = legalMoves([vehicle], oneWayLevel);
  assert.ok(moves.length > 0);
  assert.equal(moves.some(move => move.type === "move" && move.x < vehicle.x), false);
  assert.equal(moves.some(move => move.type === "exit" && move.direction === 1), true);
});

test("docking terminals require the vehicle to reach the edge", () => {
  const dockLevel = {
    size: 4,
    terminals: [{ id: "t0", color: 0, side: "left", x: 0, y: 1, oneWay: false, requiresDock: true }],
    walls: []
  };
  const vehicle = { id: "a", color: 0, terminalId: "t0", x: 2, y: 1, length: 2, orientation: "h", status: "active" };
  assert.equal(exitClear(vehicle, [vehicle], [], dockLevel), false);
  const docked = applyMove([vehicle], dockLevel, { id: "a", type: "move", x: 1, y: 1 });
  assert.equal(exitClear(docked[0], docked, [], dockLevel), true);
  assert.equal(legalMoves(docked, dockLevel).some(move => move.type === "exit"), true);
});

test("blocked exits disappear and exited vehicles leave the state key", () => {
  const vehicle = { id: "a", color: 0, terminalId: "t0", x: 1, y: 1, length: 2, orientation: "h", status: "active" };
  const blocker = { id: "b", color: 1, terminalId: "t1", x: 0, y: 0, length: 2, orientation: "v", status: "active" };
  const blockedLevel = { ...level, terminals: [...level.terminals, { id: "t1", color: 1, side: "top", x: 0, y: 0 }] };
  assert.equal(exitClear(vehicle, [vehicle, blocker], [], blockedLevel), false);
  assert.equal(legalMoves([vehicle, blocker], blockedLevel).some(move => move.id === "a" && move.type === "exit"), false);
  const exited = applyMove([vehicle], level, { id: "a", type: "exit" });
  assert.equal(isSolved(exited), true);
  assert.equal(stateKey(exited), "");
});
