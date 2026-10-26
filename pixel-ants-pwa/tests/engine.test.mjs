import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../src/board.js";
import { createEngine } from "../src/engine.js";

const PALETTE = [
  { hex: "#111111" },
  { hex: "#eeeeee" },
  { hex: "#cc4422" },
  { hex: "#2277cc" }
];

function makeBoard(width = 8, height = 10, colors = 3) {
  const indices = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) indices[y * width + x] = (x * 3 + y * 5) % colors;
  }
  return createBoard({ width, height, palette: PALETTE.slice(0, colors), indices, seed: 4 });
}

function makeEngine(board, config, seed = 12) {
  return createEngine({
    board,
    seed,
    config: Object.assign({
      slots: 4,
      bucketCapacity: 50,
      maxAntsPerBucket: 8,
      antSpeed: 40,
      spawnInterval: 0.04,
      biteTime: 0.05,
      parRate: 10
    }, config || {})
  });
}

function autoPlay(engine, board, seconds = 180) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (engine.state.status !== "playing") break;
    for (const bucket of engine.state.buckets) {
      if (bucket && bucket.state === "active" && board.availableCount(bucket.color) === 0) {
        engine.recall(bucket.slot);
      }
    }
    for (let color = 0; color < board.palette.length; color++) {
      if (board.availableCount(color) <= 0) continue;
      if (engine.state.buckets.some((bucket) => bucket && bucket.color === color)) continue;
      if (engine.state.buckets.includes(null)) engine.deploy(color);
    }
    engine.update(1 / 60);
  }
  return engine.state;
}

test("a player who keeps exposed colours loaded clears the picture", () => {
  const board = makeBoard(8, 10, 3);
  const engine = makeEngine(board, { slots: 3, antSpeed: 60 });
  const events = [];
  const steps = 240 * 60;
  for (let i = 0; i < steps; i++) {
    if (engine.state.status !== "playing") break;
    for (const bucket of engine.state.buckets) {
      if (bucket && bucket.state === "active" && board.availableCount(bucket.color) === 0) {
        engine.recall(bucket.slot);
      }
    }
    for (let color = 0; color < board.palette.length; color++) {
      if (board.availableCount(color) <= 0) continue;
      if (engine.state.buckets.some((bucket) => bucket && bucket.color === color)) continue;
      if (engine.state.buckets.includes(null)) engine.deploy(color);
    }
    engine.update(1 / 60);
    events.push(...engine.drainEvents());
  }
  assert.equal(engine.state.status, "won");
  assert.equal(board.allCleared(), true);
  assert.equal(engine.state.stolen, board.total);
  assert.equal(engine.state.delivered, board.total);
  assert.equal(engine.state.ants.length, 0);
  assert.ok(engine.state.score > 0);
  assert.ok(engine.state.stars >= 1 && engine.state.stars <= 3);
  assert.ok(events.some((event) => event.type === "steal"));
  assert.ok(events.some((event) => event.type === "deliver"));
  assert.ok(events.some((event) => event.type === "win"));
});

test("a full bucket leaves after its last ant returns", () => {
  const board = makeBoard(3, 3, 1);
  const engine = makeEngine(board, {
    slots: 1,
    bucketCapacity: 2,
    maxAntsPerBucket: 1,
    antSpeed: 80,
    spawnInterval: 0.01
  });
  assert.equal(engine.deploy(0).ok, true);
  const seen = [];
  for (let i = 0; i < 1200 && engine.state.status === "playing"; i++) {
    engine.update(1 / 60);
    seen.push(...engine.drainEvents());
    if (seen.some((event) => event.type === "bucketLeave")) break;
  }
  assert.ok(seen.some((event) => event.type === "bucketFull"));
  assert.ok(seen.some((event) => event.type === "bucketLeave"));
  assert.equal(engine.state.buckets[0], null);
  assert.ok(engine.state.delivered >= 2);
});

test("a recalled bucket stops spawning and finishes its carriers", () => {
  const board = makeBoard(6, 8, 2);
  const engine = makeEngine(board, {
    slots: 1,
    bucketCapacity: 100,
    maxAntsPerBucket: 3,
    antSpeed: 18,
    spawnInterval: 0.03
  });
  assert.equal(engine.deploy(0).ok, true);
  for (let i = 0; i < 120; i++) engine.update(1 / 60);
  const before = engine.state.ants.length;
  assert.ok(before > 0);
  engine.drainEvents();
  const result = engine.recall(0);
  assert.equal(result.ok, true);
  let spawnedAfterRecall = 0;
  for (let i = 0; i < 600; i++) {
    engine.update(1 / 60);
    for (const event of engine.drainEvents()) {
      if (event.type === "spawn") spawnedAfterRecall++;
    }
    if (!engine.state.buckets[0]) break;
  }
  assert.equal(engine.state.buckets[0], null);
  assert.equal(spawnedAfterRecall, 0);
});

test("deploy refuses buried colours, depleted colours and a full rail", () => {
  const width = 3;
  const height = 3;
  const indices = new Uint16Array(width * height);
  indices[4] = 1;
  const board = createBoard({
    width,
    height,
    palette: PALETTE.slice(0, 2),
    indices,
    seed: 3
  });
  const engine = makeEngine(board, { slots: 1 });
  assert.equal(engine.deploy(1).reason, "buried");
  assert.equal(engine.deploy(0).ok, true);

  const fullBoard = makeBoard(4, 4, 2);
  const fullEngine = makeEngine(fullBoard, { slots: 1 });
  assert.equal(fullEngine.deploy(0).ok, true);
  assert.equal(fullEngine.deploy(1).reason, "full");

  const indices2 = new Uint16Array(9);
  indices2[1] = 1;
  const board2 = createBoard({
    width: 3,
    height: 3,
    palette: PALETTE.slice(0, 2),
    indices: indices2,
    seed: 5
  });
  const engine2 = makeEngine(board2, {
    slots: 1,
    bucketCapacity: 1,
    maxAntsPerBucket: 1,
    antSpeed: 80,
    spawnInterval: 0.01
  });
  assert.equal(engine2.deploy(1).ok, true);
  for (let i = 0; i < 600 && engine2.state.buckets[0]; i++) engine2.update(1 / 60);
  assert.equal(engine2.state.buckets[0], null);
  assert.equal(engine2.deploy(1).reason, "empty");
});

test("no interaction leaves the game running but idle", () => {
  const board = makeBoard(5, 5, 2);
  const engine = makeEngine(board);
  for (let i = 0; i < 600; i++) engine.update(1 / 60);
  assert.equal(engine.state.status, "playing");
  assert.equal(engine.state.ants.length, 0);
  assert.equal(engine.state.score, 0);
  assert.equal(board.captured, 0);
});

test("the win waits for the last carrier to come home", () => {
  const width = 3;
  const height = 3;
  const indices = new Uint16Array(width * height);
  const board = createBoard({
    width,
    height,
    palette: PALETTE.slice(0, 1),
    indices,
    seed: 1
  });
  const engine = makeEngine(board, {
    slots: 1,
    bucketCapacity: 100,
    maxAntsPerBucket: 1,
    antSpeed: 8,
    spawnInterval: 0.02
  });
  engine.deploy(0);
  let sawLastSteal = false;
  let allClearedWhileAntOut = false;
  for (let i = 0; i < 6000 && engine.state.status === "playing"; i++) {
    engine.update(1 / 60);
    for (const event of engine.drainEvents()) {
      if (event.type === "steal" && board.allCleared()) {
        sawLastSteal = true;
        allClearedWhileAntOut = engine.state.ants.length > 0 && engine.state.status === "playing";
      }
    }
  }
  assert.equal(sawLastSteal, true);
  assert.equal(allClearedWhileAntOut, true);
  assert.equal(engine.state.status, "won");
  assert.equal(engine.state.delivered, board.total);
});

test("the same seed and player produce the same run", () => {
  const boardA = makeBoard(7, 9, 3);
  const boardB = makeBoard(7, 9, 3);
  const a = makeEngine(boardA, { slots: 3 }, 77);
  const b = makeEngine(boardB, { slots: 3 }, 77);
  autoPlay(a, boardA, 120);
  autoPlay(b, boardB, 120);
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.deepEqual(a.snapshot().buckets, b.snapshot().buckets);
});
