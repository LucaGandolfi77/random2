import { describe, expect, it } from 'vitest';
import { createSim, fighter, placeOnGround, step } from './helpers';

describe('match rules and stocks', () => {
  it('removes a stock and respawns after a ring out', () => {
    const sim = createSim({ stocks: 2 });
    placeOnGround(sim, 0, 0, 1);
    const p2 = placeOnGround(sim, 1, 0, -1);
    p2.pos = { x: 30, y: 0 };
    sim.step({});
    expect(p2.stocks).toBe(1);
    expect(p2.state).toBe('dead');
    expect(sim.finished).toBe(false);
    step(sim, 110, {});
    expect(p2.state).not.toBe('dead');
    expect(p2.damage).toBe(0);
    expect(p2.invuln).toBeGreaterThan(0);
    expect(p2.pos.x).toBeGreaterThan(0);
  });

  it('ends a stock match when only one fighter remains', () => {
    const sim = createSim({ stocks: 1 });
    placeOnGround(sim, 0, 0, 1);
    const p2 = placeOnGround(sim, 1, 0, -1);
    p2.pos = { x: -30, y: 0 };
    sim.step({});
    expect(p2.eliminated).toBe(true);
    expect(sim.finished).toBe(true);
    expect(sim.winners).toEqual([0]);
    const events = sim.drainEvents();
    expect(events.some((event) => event.type === 'matchOver')).toBe(true);
  });

  it('ends a time match on the timer with the most KOs', () => {
    const sim = createSim({ mode: 'time', timeLimitSeconds: 10 });
    placeOnGround(sim, 0, -3, 1);
    placeOnGround(sim, 1, 3, -1);
    fighter(sim, 0).kos = 2;
    sim.timeRemainingFrames = 5;
    step(sim, 10, {});
    expect(sim.finished).toBe(true);
    expect(sim.winners).toEqual([0]);
    expect(sim.timeSeconds).toBe(0);
  });

  it('does not damage teammates in team battle', () => {
    const sim = createSim({
      mode: 'team',
      players: [
        { slot: 0, fighterId: 'nero', human: true, team: 0, colorIndex: 0 },
        { slot: 1, fighterId: 'velvet', human: true, team: 0, colorIndex: 0 },
        { slot: 2, fighterId: 'zia', human: true, team: 1, colorIndex: 0 },
        { slot: 3, fighterId: 'ace', human: true, team: 1, colorIndex: 0 },
      ],
    });
    placeOnGround(sim, 0, -1, 1);
    const teammate = placeOnGround(sim, 1, 0.6, -1);
    placeOnGround(sim, 2, 6, -1);
    placeOnGround(sim, 3, 8, -1);
    sim.step({ 0: { moveX: 0, moveY: 0, jump: false, attack: true, strong: false, special: false, shield: false, grab: false, taunt: false } });
    step(sim, 12, {});
    expect(teammate.damage).toBe(0);
  });

  it('awards the team victory when the other team is eliminated', () => {
    const sim = createSim({
      mode: 'team',
      stocks: 1,
      players: [
        { slot: 0, fighterId: 'nero', human: true, team: 0, colorIndex: 0 },
        { slot: 1, fighterId: 'velvet', human: true, team: 0, colorIndex: 0 },
        { slot: 2, fighterId: 'zia', human: true, team: 1, colorIndex: 0 },
        { slot: 3, fighterId: 'ace', human: true, team: 1, colorIndex: 0 },
      ],
    });
    placeOnGround(sim, 0, -3, 1);
    placeOnGround(sim, 1, -1, 1);
    const enemyA = placeOnGround(sim, 2, 3, -1);
    const enemyB = placeOnGround(sim, 3, 4, -1);
    enemyA.pos = { x: 30, y: 0 };
    enemyB.pos = { x: 32, y: 0 };
    sim.step({});
    expect(sim.finished).toBe(true);
    expect(sim.winners.sort()).toEqual([0, 1]);
  });

  it('keeps training mode infinite and resets on command', () => {
    const sim = createSim({ mode: 'training', players: [
      { slot: 0, fighterId: 'nero', human: true, team: 0, colorIndex: 0 },
      { slot: 1, fighterId: 'velvet', human: false, team: 1, colorIndex: 0 },
    ] });
    const dummy = placeOnGround(sim, 1, 3, -1);
    dummy.damage = 0;
    dummy.pos = { x: 30, y: 0 };
    sim.step({});
    expect(sim.finished).toBe(false);
    expect(dummy.stocks).toBeGreaterThan(0);
    step(sim, 60, {});
    sim.setTrainingDamage(1, 88);
    expect(dummy.damage).toBe(88);
    sim.trainingResetPositions();
    expect(dummy.damage).toBe(0);
  });
});

describe('stage hazards', () => {
  it('damages fighters in the hazard zone when enabled', () => {
    const sim = createSim({ stageId: 'club-verticale', hazards: true });
    const p1 = placeOnGround(sim, 0, 0, 1);
    placeOnGround(sim, 1, 8, -1);
    step(sim, 100, {});
    expect(p1.damageTaken).toBeGreaterThan(0);
  });

  it('can disable stage hazards for competitive play', () => {
    const sim = createSim({ stageId: 'club-verticale', hazards: false });
    const p1 = placeOnGround(sim, 0, 0, 1);
    placeOnGround(sim, 1, 8, -1);
    step(sim, 100, {});
    expect(p1.damageTaken).toBe(0);
  });
});
