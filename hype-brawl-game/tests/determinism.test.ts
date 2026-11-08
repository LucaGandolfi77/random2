import { describe, expect, it } from 'vitest';
import { createSim, input, placeOnGround, step } from './helpers';

function scriptedInputs(frame: number): Record<number, ReturnType<typeof input>> {
  const p1 = input({
    moveX: frame % 40 < 20 ? 1 : -1,
    jump: frame % 35 === 0,
    attack: frame % 23 === 0,
    special: frame % 67 === 0,
    shield: frame % 51 < 6,
  });
  const p2 = input({
    moveX: frame % 31 < 15 ? -1 : 1,
    strong: frame % 55 === 0,
    special: frame % 71 === 0,
  });
  return { 0: p1, 1: p2 };
}

describe('determinism and snapshots', () => {
  it('produces identical state for identical inputs and seeds', () => {
    const simA = createSim({ seed: 4242 });
    const simB = createSim({ seed: 4242 });
    placeOnGround(simA, 0, -1, 1);
    placeOnGround(simA, 1, 1, -1);
    placeOnGround(simB, 0, -1, 1);
    placeOnGround(simB, 1, 1, -1);
    for (let frame = 0; frame < 180; frame++) {
      const inputs = scriptedInputs(frame);
      simA.step(inputs);
      simB.step(inputs);
    }
    expect(simA.stateHash()).toBe(simB.stateHash());
  });

  it('restores a snapshot and continues identically', () => {
    const sim = createSim({ seed: 777 });
    placeOnGround(sim, 0, -2, 1);
    placeOnGround(sim, 1, 2, -1);
    for (let frame = 0; frame < 90; frame++) sim.step(scriptedInputs(frame));
    const snapshot = sim.snapshot();
    const restored = createSim({ seed: 777 });
    restored.restore(snapshot);
    for (let frame = 90; frame < 180; frame++) {
      const inputs = scriptedInputs(frame);
      sim.step(inputs);
      restored.step(inputs);
    }
    expect(restored.stateHash()).toBe(sim.stateHash());
  });

  it('replays an input history into a coherent state', () => {
    const sim = createSim({ seed: 99 });
    placeOnGround(sim, 0, -2, 1);
    placeOnGround(sim, 1, 2, -1);
    const history: Array<Record<number, ReturnType<typeof input>>> = [];
    for (let frame = 0; frame < 120; frame++) {
      const inputs = scriptedInputs(frame);
      history.push(inputs);
      sim.step(inputs);
    }
    const replay = createSim({ seed: 99 });
    placeOnGround(replay, 0, -2, 1);
    placeOnGround(replay, 1, 2, -1);
    for (const inputs of history) replay.step(inputs);
    expect(replay.stateHash()).toBe(sim.stateHash());
  });

  it('uses a seeded RNG independent of Math.random', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.999999;
    const simA = createSim({ seed: 12, items: 'chaos' });
    const simB = createSim({ seed: 12, items: 'chaos' });
    step(simA, 300, {});
    step(simB, 300, {});
    Math.random = originalRandom;
    expect(simA.stateHash()).toBe(simB.stateHash());
  });
});
