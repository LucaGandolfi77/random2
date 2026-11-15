import test from 'node:test';
import assert from 'node:assert/strict';
import { canSeePlayer, seeTarget } from '../src/ai.js';
import { hasLineOfSight } from '../src/collision.js';

const openLevel = { solids: [] };
const blockedLevel = {
  solids: [{ x: 40, y: -10, w: 10, h: 30, solid: true, sight: true }]
};

function enemy(overrides = {}) {
  return {
    x: 20,
    y: 0,
    angle: 0,
    dead: false,
    awareness: 0,
    state: 'idle',
    lastSeen: null,
    fov: 1.1,
    ...overrides
  };
}

test('an enemy sees a player in front inside its cone and range', () => {
  const actor = enemy();
  assert.equal(canSeePlayer(openLevel, actor, { x: 80, y: 0, dead: false }, 100), true);
  assert.equal(canSeePlayer(openLevel, actor, { x: 80, y: 80, dead: false }, 100), false);
  assert.equal(canSeePlayer(openLevel, actor, { x: 220, y: 0, dead: false }, 100), false);
});

test('line of sight is blocked by solid walls', () => {
  assert.equal(hasLineOfSight(blockedLevel, 0, 0, 100, 0), false);
  assert.equal(hasLineOfSight(openLevel, 0, 0, 100, 0), true);
  assert.equal(canSeePlayer(blockedLevel, enemy(), { x: 100, y: 0, dead: false }, 150), false);
});

test('awareness rises in view and falls out of view', () => {
  const actor = enemy();
  const state = { level: openLevel, lastDt: 0.1, events: [] };
  seeTarget(state, actor, { x: 80, y: 0, dead: false });
  assert.ok(actor.awareness > 0);
  const before = actor.awareness;
  seeTarget(state, actor, { x: -80, y: 0, dead: false });
  assert.ok(actor.awareness < before);
});
