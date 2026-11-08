import { describe, expect, it } from 'vitest';
import { createSim, fighter, input, placeAir, placeOnGround, step } from './helpers';

describe('movement physics', () => {
  it('applies gravity and lands on the main platform', () => {
    const sim = createSim();
    placeAir(sim, 0, 9.6, 5.6);
    step(sim, 60, {});
    const p1 = fighter(sim, 0);
    expect(p1.grounded).toBe(true);
    expect(p1.pos.y).toBeCloseTo(0, 5);
    expect(p1.groundPlatformId).toBe('ground');
  });

  it('moves a grounded fighter horizontally', () => {
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, 0, 1);
    const startX = p1.pos.x;
    step(sim, 30, { 0: input({ moveX: 1 }) });
    expect(p1.pos.x).toBeGreaterThan(startX + 1);
    expect(p1.facing).toBe(1);
  });

  it('jumps, leaves the ground and lands again', () => {
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, 0, 1);
    sim.step({ 0: input({ jump: true }) });
    expect(p1.grounded).toBe(false);
    expect(p1.vel.y).toBeGreaterThan(0);
    step(sim, 70, {});
    expect(p1.grounded).toBe(true);
    expect(p1.pos.y).toBeCloseTo(0, 5);
  });

  it('performs a double jump after the first jump', () => {
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, 0, 1);
    sim.step({ 0: input({ jump: true }) });
    step(sim, 5, {});
    const airJumpsBefore = p1.airJumpsLeft;
    sim.step({ 0: input({ jump: true }) });
    expect(p1.airJumpsLeft).toBe(airJumpsBefore - 1);
    expect(p1.vel.y).toBeGreaterThan(0.2);
  });

  it('fast falls when down is held in the air', () => {
    const sim = createSim();
    const p1 = placeAir(sim, 0, 0, 7);
    sim.step({ 0: input({ moveY: -1 }) });
    expect(p1.fastFall).toBe(true);
    expect(p1.vel.y).toBeLessThan(-0.5);
  });

  it('passes through a one-way platform from below and lands on top', () => {
    const sim = createSim();
    const p1 = placeAir(sim, 0, -6.2, 2.2);
    p1.vel.y = 0.35;
    step(sim, 6, {});
    expect(p1.grounded).toBe(false);
    const p2 = placeAir(sim, 0, -6.2, 3.8);
    p2.vel.y = -0.05;
    step(sim, 20, {});
    expect(p2.grounded).toBe(true);
    expect(p2.groundPlatformId).toBe('left-float');
    expect(p2.pos.y).toBeGreaterThan(2.8);
  });

  it('drops through floating platforms when down is pressed', () => {
    const sim = createSim();
    const p1 = placeAir(sim, 0, -6.2, 2.9);
    p1.grounded = true;
    p1.groundPlatformId = 'left-float';
    p1.state = 'idle';
    sim.step({ 0: input({ moveY: -1 }) });
    expect(p1.grounded).toBe(false);
  });

  it('grabs a ledge when falling next to the stage edge', () => {
    const sim = createSim();
    const p1 = placeAir(sim, 0, -10.6, -0.7);
    p1.vel.y = -0.01;
    step(sim, 2, {});
    expect(p1.state).toBe('ledge');
    expect(p1.invuln).toBeGreaterThan(0);
  });

  it('can jump out of a ledge grab', () => {
    const sim = createSim();
    const p1 = placeAir(sim, 0, -10.6, -0.7);
    p1.vel.y = -0.01;
    step(sim, 2, {});
    expect(p1.state).toBe('ledge');
    sim.step({ 0: input({ jump: true }) });
    expect(p1.state).toBe('air');
    expect(fighter(sim, 0).vel.y).toBeGreaterThan(0);
  });
});
