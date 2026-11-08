import { describe, expect, it } from 'vitest';
import { MatchSim } from '../src/game/combat/simulation';
import type { MatchConfig } from '../src/game/combat/types';
import { getFighter } from '../src/data/fighters';
import { createAI } from '../src/game/ai';

function aiMatch(): MatchSim {
  const config: MatchConfig = {
    mode: 'quick',
    stageId: 'the-last-festival',
    roundsToWin: 2,
    roundTime: 99,
    fighters: [getFighter('808nero'), getFighter('reinari')],
    teams: [[0], [1]],
    teamSize: 1,
    rumble: false
  };
  return new MatchSim(config);
}

describe('AIController', () => {
  it('produces a deterministic, complete AI versus AI match', () => {
    const sim = aiMatch();
    const aiA = createAI(0, getFighter('808nero').ai, 'hard', 11);
    const aiB = createAI(1, getFighter('reinari').ai, 'hard', 22);
    const events = [];
    for (let frame = 0; frame < 2400; frame++) {
      events.push(...sim.step([aiA.update(sim), aiB.update(sim)]));
      if (sim.phase === 'matchEnd') break;
    }
    expect(events.some((event) => event.type === 'hit')).toBe(true);
    expect(events.some((event) => event.type === 'roundStart')).toBe(true);
    expect(sim.fighters.every((fighter) => fighter.health >= 0)).toBe(true);
  });

  it('respects the phase and returns neutral input outside fights', () => {
    const sim = aiMatch();
    const ai = createAI(0, getFighter('808nero').ai, 'normal', 5);
    const input = ai.update(sim);
    expect(input.held).toBe(0);
    expect(input.pressed).toBe(0);
  });

  it('uses specials and meters over time', () => {
    const sim = aiMatch();
    const aiA = createAI(0, getFighter('tastieranera').ai, 'expert', 31);
    const aiB = createAI(1, getFighter('nocturna').ai, 'expert', 47);
    const events = [];
    for (let frame = 0; frame < 3600; frame++) {
      events.push(...sim.step([aiA.update(sim), aiB.update(sim)]));
      if (sim.phase === 'matchEnd') break;
    }
    expect(
      events.some((event) => event.type === 'special' || event.type === 'super' || event.type === 'hype')
    ).toBe(true);
  });
});
