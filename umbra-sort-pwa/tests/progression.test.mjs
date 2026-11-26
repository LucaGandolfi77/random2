import test from "node:test";
import assert from "node:assert/strict";
import { AREAS } from "../src/config.js";
import { bossUnlockState, specialUnlockState, unlockPiece, equipPiece, upgradeAbility } from "../src/progression.js";
import { recordWin } from "../src/storage.js";

function progress() {
  return {
    unlocked: 1,
    gears: 100,
    pieces: ["luma"],
    equippedPiece: "luma",
    abilities: { pulse: 1, push: 1, scan: 1 },
    stars: {},
    best: {},
    daily: {}
  };
}

test("special levels unlock from stars, gears and daily wins", () => {
  const save = progress();
  assert.equal(specialUnlockState(save, 0).unlocked, false);
  save.stars = { "conveyor-1": 3, "conveyor-2": 3, "conveyor-3": 3, "conveyor-4": 3, "conveyor-5": 3, "conveyor-6": 3, "conveyor-7": 3, "conveyor-8": 3, "conveyor-9": 3, "conveyor-10": 3 };
  assert.equal(specialUnlockState(save, 0).unlocked, true);
  assert.equal(specialUnlockState(save, 1).unlocked, true);
});

test("boss levels unlock only after their area is complete", () => {
  const save = progress();
  assert.equal(bossUnlockState(save, 0).unlocked, false);
  for (let stage = 1; stage <= 20; stage++) save.stars[`${AREAS[0].id}-${stage}`] = 1;
  assert.equal(bossUnlockState(save, 0).unlocked, true);
  assert.equal(bossUnlockState(save, 1).unlocked, false);
});

test("pieces cost gears and can be equipped", () => {
  const save = progress();
  const result = unlockPiece(save, "flux");
  assert.equal(result.ok, true);
  assert.equal(save.gears, 80);
  assert.equal(save.pieces.includes("flux"), true);
  assert.equal(equipPiece(save, "flux"), true);
  assert.equal(save.equippedPiece, "flux");
});

test("abilities upgrade up to level three", () => {
  const save = progress();
  assert.equal(upgradeAbility(save, "pulse").ok, true);
  assert.equal(upgradeAbility(save, "pulse").ok, true);
  assert.equal(save.abilities.pulse, 3);
  assert.equal(upgradeAbility(save, "pulse").ok, false);
});

test("first campaign clear awards gears and unlocks the next level", () => {
  const save = progress();
  const level = { kind: "campaign" };
  const reward = recordWin(save, "conveyor-1", 3, 1000, level);
  assert.equal(reward.firstClear, true);
  assert.equal(reward.gears, 4);
  assert.equal(save.unlocked, 2);
});
