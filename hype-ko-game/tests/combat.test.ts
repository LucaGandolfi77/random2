import { describe, expect, it } from 'vitest';
import { InputBit, neutralInput, type InputState, type MatchConfig } from '../src/game/combat/types';
import { MatchSim } from '../src/game/combat/simulation';
import { getFighter } from '../src/data/fighters';

function baseConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    mode: 'quick',
    stageId: 'festival',
    roundsToWin: 2,
    roundTime: 99,
    fighters: [getFighter('808nero'), getFighter('reinari')],
    teams: [[0], [1]],
    teamSize: 1,
    rumble: false,
    ...overrides
  };
}

function makeSim(overrides: Partial<MatchConfig> = {}): MatchSim {
  return new MatchSim(baseConfig(overrides));
}

function input(held = 0, pressed = 0): InputState {
  return { held, pressed };
}

function run(
  sim: MatchSim,
  frames: number,
  fn?: (frame: number) => InputState[]
): ReturnType<MatchSim['step']> {
  const events: ReturnType<MatchSim['step']> = [];
  for (let frame = 0; frame < frames; frame++) {
    const inputs = fn ? fn(frame) : sim.fighters.map(() => neutralInput());
    events.push(...sim.step(inputs));
  }
  return events;
}

function skipIntro(sim: MatchSim): void {
  run(sim, 92);
}

function close(sim: MatchSim): void {
  sim.fighters[0].x = -0.41;
  sim.fighters[1].x = 0.41;
  sim.fighters[0].facing = 1;
  sim.fighters[1].facing = -1;
}

describe('MatchSim', () => {
  it('runs the intro and starts the fight', () => {
    const sim = makeSim();
    expect(sim.phase).toBe('intro');
    const events = run(sim, 91);
    expect(sim.phase).toBe('fight');
    expect(events.some((event) => event.type === 'roundStart')).toBe(true);
  });

  it('moves a fighter with held direction', () => {
    const sim = makeSim();
    skipIntro(sim);
    const start = sim.fighters[0].x;
    run(sim, 30, () => [input(InputBit.Right), neutralInput()]);
    expect(sim.fighters[0].x).toBeGreaterThan(start);
  });

  it('lands a light punch and applies damage', () => {
    const sim = makeSim();
    skipIntro(sim);
    close(sim);
    const before = sim.fighters[1].health;
    const events = run(sim, 14, (frame) => [
      input(0, frame === 0 ? InputBit.LightPunch : 0),
      neutralInput()
    ]);
    expect(sim.fighters[1].health).toBeLessThan(before);
    expect(events.some((event) => event.type === 'hit')).toBe(true);
  });

  it('blocks a normal attack without chip damage', () => {
    const sim = makeSim();
    skipIntro(sim);
    close(sim);
    const before = sim.fighters[1].health;
    const events = run(sim, 16, (frame) => [
      input(0, frame === 0 ? InputBit.LightPunch : 0),
      input(frame >= 2 ? InputBit.Block : 0)
    ]);
    expect(events.some((event) => event.type === 'block')).toBe(true);
    expect(sim.fighters[1].health).toBe(before);
  });

  it('parries with a fresh block press', () => {
    const sim = makeSim();
    skipIntro(sim);
    close(sim);
    const events = run(sim, 16, (frame) => [
      input(0, frame === 0 ? InputBit.LightPunch : 0),
      input(frame >= 4 ? InputBit.Block : 0, frame === 4 ? InputBit.Block : 0)
    ]);
    expect(events.some((event) => event.type === 'parry')).toBe(true);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
  });

  it('builds super and hype meters on hit', () => {
    const sim = makeSim();
    skipIntro(sim);
    close(sim);
    run(sim, 14, (frame) => [
      input(0, frame === 0 ? InputBit.LightPunch : 0),
      neutralInput()
    ]);
    expect(sim.fighters[0].super).toBeGreaterThan(0);
    expect(sim.fighters[0].hype).toBeGreaterThan(0);
  });

  it('uses the super move and consumes the meter', () => {
    const sim = makeSim();
    skipIntro(sim);
    close(sim);
    sim.fighters[0].super = 100;
    const events = run(sim, 4, (frame) => [
      input(0, frame === 0 ? InputBit.Super : 0),
      neutralInput()
    ]);
    expect(sim.fighters[0].super).toBe(0);
    expect(events.some((event) => event.type === 'super')).toBe(true);
    expect(sim.fighters[0].state).toBe('attack');
  });

  it('activates the Hype Breaker and applies the buff', () => {
    const sim = makeSim();
    skipIntro(sim);
    sim.fighters[0].hype = 100;
    const events = run(sim, 14, (frame) => [
      input(0, frame === 0 ? InputBit.Hype : 0),
      neutralInput()
    ]);
    expect(events.some((event) => event.type === 'hype')).toBe(true);
    expect(sim.fighters[0].hype).toBe(0);
    expect(sim.fighters[0].buffs.length).toBeGreaterThan(0);
    expect(sim.fighters[0].armor).toBeGreaterThan(0);
  });

  it('ends the round on KO and starts the next round', () => {
    const sim = makeSim({ roundsToWin: 2 });
    skipIntro(sim);
    close(sim);
    sim.fighters[1].health = 5;
    run(sim, 14, (frame) => [
      input(0, frame === 0 ? InputBit.LightPunch : 0),
      neutralInput()
    ]);
    expect(sim.phase).toBe('roundEnd');
    expect(sim.fighters[0].roundsWon).toBe(1);
    run(sim, 170);
    expect(sim.phase).toBe('intro');
    expect(sim.round).toBe(2);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
  });

  it('ends the match when a fighter reaches the required rounds', () => {
    const sim = makeSim({ roundsToWin: 1 });
    skipIntro(sim);
    close(sim);
    sim.fighters[1].health = 5;
    run(sim, 14, (frame) => [
      input(0, frame === 0 ? InputBit.LightPunch : 0),
      neutralInput()
    ]);
    expect(sim.phase).toBe('roundEnd');
    run(sim, 170);
    expect(sim.phase).toBe('matchEnd');
    expect(sim.matchWinner).toBe(0);
  });

  it('ends the round on timeout with the higher health', () => {
    const sim = makeSim({ roundTime: 1 });
    skipIntro(sim);
    sim.fighters[1].health = 100;
    const events = run(sim, 62);
    expect(events.some((event) => event.type === 'timeout')).toBe(true);
    expect(sim.phase).toBe('roundEnd');
    expect(sim.roundWinner).toBe(0);
  });

  it('spawns and lands a piano projectile', () => {
    const sim = makeSim({
      fighters: [getFighter('tastieranera'), getFighter('808nero')],
      teams: [[0], [1]]
    });
    skipIntro(sim);
    close(sim);
    sim.fighters[0].x = -3;
    sim.fighters[1].x = 2;
    const before = sim.fighters[1].health;
    const events = run(sim, 100, (frame) => [
      input(0, frame === 0 ? InputBit.Special1 : 0),
      neutralInput()
    ]);
    expect(events.some((event) => event.type === 'projectile')).toBe(true);
    expect(sim.fighters[1].health).toBeLessThan(before);
  });

  it('performs a Hype Finish in the final round', () => {
    const sim = makeSim({ roundsToWin: 2 });
    skipIntro(sim);
    close(sim);
    sim.round = 2;
    sim.fighters[0].roundsWon = 1;
    sim.fighters[0].hype = 100;
    sim.fighters[1].health = sim.fighters[1].maxHealth * 0.2;
    const events = run(sim, 3, (frame) => [
      input(0, frame === 0 ? InputBit.Finisher : 0),
      neutralInput()
    ]);
    expect(sim.phase).toBe('finisher');
    expect(events.some((event) => event.type === 'finisher')).toBe(true);
    run(sim, 380);
    expect(sim.phase).toBe('matchEnd');
    expect(sim.matchWinner).toBe(0);
  });

  it('tags to a reserve fighter in team battle', () => {
    const sim = makeSim({
      mode: 'team',
      fighters: [
        getFighter('808nero'),
        getFighter('velvetvera'),
        getFighter('reinari'),
        getFighter('nocturna')
      ],
      teams: [
        [0, 1],
        [2, 3]
      ],
      teamSize: 2
    });
    skipIntro(sim);
    expect(sim.fighters[0].active).toBe(true);
    const events = run(sim, 3, (frame) => [
      input(0, frame === 0 ? InputBit.Tag : 0),
      neutralInput(),
      neutralInput(),
      neutralInput()
    ]);
    expect(events.some((event) => event.type === 'tag')).toBe(true);
    expect(sim.fighters[0].active).toBe(false);
    expect(sim.fighters[1].active).toBe(true);
  });

  it('supports four active fighters in Royal Rumble', () => {
    const sim = makeSim({
      mode: 'rumble',
      fighters: [
        getFighter('808nero'),
        getFighter('velvetvera'),
        getFighter('reinari'),
        getFighter('nocturna')
      ],
      teams: [[0], [1], [2], [3]],
      teamSize: 1,
      rumble: true
    });
    expect(sim.fighters.filter((f) => f.active).length).toBe(4);
    run(sim, 92);
    expect(sim.phase).toBe('fight');
    expect(sim.fighters.filter((f) => f.active).length).toBe(4);
  });

  it('serializes and restores a deterministic snapshot', () => {
    const sim = makeSim();
    skipIntro(sim);
    close(sim);
    run(sim, 30, (frame) => [
      input(frame % 2 === 0 ? InputBit.Right : 0, frame === 5 ? InputBit.LightPunch : 0),
      neutralInput()
    ]);
    const hash = sim.hash();
    const snapshot = sim.serialize();
    const clone = makeSim();
    clone.load(snapshot);
    expect(clone.hash()).toBe(hash);
    run(sim, 20);
    run(clone, 20);
    expect(clone.hash()).toBe(sim.hash());
  });
});
