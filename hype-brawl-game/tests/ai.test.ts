import { describe, expect, it } from 'vitest';
import { createSim, placeOnGround, player, step } from './helpers';

describe('CPU and spectator simulation', () => {
  it('CPU fighters engage, deal damage and score knockouts', () => {
    const sim = createSim({
      mode: 'spectator',
      stageId: 'last-festival',
      items: 'off',
      hazards: false,
      players: [
        player(0, { fighterId: 'nero', human: false, team: 0 }),
        player(1, { fighterId: 'velvet', human: false, team: 1 }),
        player(2, { fighterId: 'zia', human: false, team: 0 }),
        player(3, { fighterId: 'ace', human: false, team: 1 }),
      ],
      stocks: 3,
    });
    placeOnGround(sim, 0, -3, 1);
    placeOnGround(sim, 1, 3, -1);
    placeOnGround(sim, 2, -1, 1);
    placeOnGround(sim, 3, 1, -1);
    for (let i = 0; i < 3600 && !sim.finished; i++) {
      sim.step({});
    }
    const totalDamage = sim.fighters.reduce((sum, fighter) => sum + fighter.damageTaken, 0);
    const totalKos = sim.fighters.reduce((sum, fighter) => sum + fighter.kos, 0);
    expect(totalDamage).toBeGreaterThan(80);
    expect(totalKos).toBeGreaterThan(0);
  });

  it('a CPU controlled fighter recovers toward the stage when launched off', () => {
    const sim = createSim({
      players: [
        player(0, { fighterId: 'nero', human: true }),
        player(1, { fighterId: 'velvet', human: false }),
      ],
      hazards: false,
    });
    placeOnGround(sim, 0, -6, 1);
    const cpu = placeOnGround(sim, 1, 6, -1);
    cpu.pos = { x: 13.5, y: -2.2 };
    cpu.grounded = false;
    cpu.groundPlatformId = null;
    cpu.state = 'air';
    cpu.vel = { x: 0, y: -0.1 };
    step(sim, 120, {});
    expect(cpu.pos.x).toBeLessThan(13.5);
    expect(cpu.eliminated || cpu.pos.y > -4).toBe(true);
  });
});
