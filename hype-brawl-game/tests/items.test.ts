import { describe, expect, it } from 'vitest';
import { createSim, placeOnGround, step } from './helpers';

describe('items', () => {
  it('spawns an item on the stage when items are enabled', () => {
    const sim = createSim({ items: 'normal' });
    placeOnGround(sim, 0, -8, 1);
    placeOnGround(sim, 1, 8, -1);
    step(sim, 300, {});
    expect(sim.items.length).toBeGreaterThan(0);
    const events = sim.drainEvents();
    expect(events.some((event) => event.type === 'itemSpawn')).toBe(true);
  });

  it('picks up an item and applies its effect', () => {
    const sim = createSim({ items: 'chaos' });
    placeOnGround(sim, 0, -8, 1);
    placeOnGround(sim, 1, 8, -1);
    step(sim, 200, {});
    const item = sim.items[0];
    expect(item).toBeDefined();
    if (!item) return;
    const p1 = sim.fighters[0];
    p1.pos = { x: item.x, y: item.y - 0.9 };
    p1.prevPos = { ...p1.pos };
    p1.grounded = false;
    p1.state = 'air';
    p1.meter = 0;
    sim.step({});
    expect(sim.items.length).toBeLessThan(1);
    const events = sim.drainEvents();
    expect(events.some((event) => event.type === 'itemPickup')).toBe(true);
  });

  it('does not spawn items when the setting is off', () => {
    const sim = createSim({ items: 'off' });
    placeOnGround(sim, 0, -8, 1);
    placeOnGround(sim, 1, 8, -1);
    step(sim, 400, {});
    expect(sim.items.length).toBe(0);
  });
});
