import { describe, expect, it } from 'vitest';
import { player } from './helpers';
import { attackOnce, createSim, input, placeAir, placeOnGround, step } from './helpers';

describe('combat engine', () => {
  it('connects a hitbox and increases the damage percentage', () => {
    const { target } = attackOnce(null as never, 0);
    expect(target.damage).toBeGreaterThan(0);
    expect(target.hitstun).toBeGreaterThan(0);
  });

  it('does not damage a shielded opponent', () => {
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, -1, 1);
    const p2 = placeOnGround(sim, 1, 0.6, -1);
    step(sim, 3, { 1: input({ shield: true }) });
    expect(p2.state).toBe('shield');
    const shieldBefore = p2.shieldHP;
    sim.step({ 0: input({ attack: true }), 1: input({ shield: true }) });
    step(sim, 15, { 1: input({ shield: true }) });
    expect(p2.damage).toBe(0);
    expect(p2.shieldHP).toBeLessThan(shieldBefore);
    expect(p1.currentMove).not.toBeNull();
  });

  it('scales knockback with accumulated damage', () => {
    const low = attackOnce(null as never, 0);
    const high = attackOnce(null as never, 120);
    const lowSpeed = Math.hypot(low.target.vel.x, low.target.vel.y);
    const highSpeed = Math.hypot(high.target.vel.x, high.target.vel.y);
    expect(highSpeed).toBeGreaterThan(lowSpeed);
  });

  it('applies directional influence to the launch angle', () => {
    const neutral = attackOnce(null as never, 90);
    const sim = createSim();
    placeOnGround(sim, 0, -1, 1);
    const p2 = placeOnGround(sim, 1, 0.6, -1);
    p2.damage = 90;
    sim.step({ 0: input({ attack: true }), 1: input({ moveX: 1 }) });
    step(sim, 12, { 1: input({ moveX: 1 }) });
    const diSpeed = Math.hypot(p2.vel.x, p2.vel.y);
    const neutralSpeed = Math.hypot(neutral.target.vel.x, neutral.target.vel.y);
    expect(diSpeed).not.toBeCloseTo(neutralSpeed, 6);
  });

  it('increments the combo counter on consecutive hits', () => {
    const sim = createSim({
      players: [player(0), player(1), player(2, { fighterId: 'zia' })],
    });
    placeOnGround(sim, 0, -1.2, 1);
    placeOnGround(sim, 1, 2.4, -1);
    const target = placeOnGround(sim, 2, 0.7, -1);
    sim.step({ 0: input({ attack: true }), 1: input({ attack: true }) });
    step(sim, 12, {});
    expect(target.damage).toBeGreaterThan(0);
    expect(target.comboCount).toBeGreaterThanOrEqual(2);
  });

  it('charges hype from damage dealt and activates hype mode with taunt', () => {
    const { attacker } = attackOnce(null as never, 0);
    expect(attacker.meter).toBeGreaterThan(0);
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, 0, 1);
    p1.meter = 100;
    sim.step({ 0: input({ taunt: true }) });
    expect(p1.meter).toBe(0);
    expect(p1.hypeFrames).toBeGreaterThan(400);
  });

  it('performs a grab and a throw', () => {
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, -0.6, 1);
    const p2 = placeOnGround(sim, 1, 0.55, -1);
    sim.step({ 0: input({ grab: true }) });
    step(sim, 8, {});
    expect(p2.grabbedBy).toBe(0);
    expect(p1.state).toBe('grabbing');
    sim.step({ 0: input({ attack: true }) });
    expect(p2.damage).toBeGreaterThan(0);
    expect(p2.state).toBe('hitstun');
  });

  it('grants invulnerability during an air dodge', () => {
    const sim = createSim();
    const p1 = placeAir(sim, 0, 0, 4);
    sim.step({ 0: input({ shield: true }) });
    expect(p1.state).toBe('airdodge');
    expect(p1.invuln).toBeGreaterThan(10);
    expect(p1.airDodgeUsed).toBe(true);
  });

  it('spawns projectiles for projectile specials', () => {
    const sim = createSim({ players: [player(0, { fighterId: 'zia' }), player(1)] });
    placeOnGround(sim, 0, 0, 1);
    placeOnGround(sim, 1, 5, -1);
    sim.step({ 0: input({ special: true }) });
    step(sim, 16, {});
    expect(sim.projectiles.length).toBeGreaterThan(0);
  });

  it('clashes equal-priority attacks without applying damage', () => {
    const sim = createSim();
    placeOnGround(sim, 0, -0.6, 1);
    placeOnGround(sim, 1, 0.6, -1);
    sim.step({ 0: input({ attack: true }), 1: input({ attack: true }) });
    step(sim, 8, {});
    expect(sim.drainEvents().some((event) => event.type === 'clash')).toBe(true);
    expect(sim.fighters[0].damage).toBe(0);
    expect(sim.fighters[1].damage).toBe(0);
  });

  it('breaks a shield after enough blocked damage', () => {
    const sim = createSim();
    placeOnGround(sim, 0, -1, 1);
    const p2 = placeOnGround(sim, 1, 0.6, -1);
    p2.shieldHP = 3;
    step(sim, 2, { 1: input({ shield: true }) });
    sim.step({ 0: input({ attack: true }), 1: input({ shield: true }) });
    step(sim, 10, { 1: input({ shield: true }) });
    expect(p2.state).toBe('shieldbreak');
  });
});
