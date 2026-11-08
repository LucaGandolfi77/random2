import { NEUTRAL_INPUT, type InputFrame } from '../src/core/input/InputTypes';
import type { MatchConfig, PlayerConfig } from '../src/core/game-state/types';
import { Simulation } from '../src/core/engine/Simulation';
import type { Fighter } from '../src/fighters/Fighter';

export function input(partial: Partial<InputFrame> = {}): InputFrame {
  return { ...NEUTRAL_INPUT, ...partial };
}

export function player(slot: number, overrides: Partial<PlayerConfig> = {}): PlayerConfig {
  return {
    slot,
    fighterId: slot === 1 ? 'velvet' : 'nero',
    human: true,
    team: slot % 2 === 0 ? 0 : 1,
    colorIndex: 0,
    ...overrides,
  };
}

export function makeConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    mode: 'stock',
    players: [player(0), player(1)],
    stocks: 3,
    timeLimitSeconds: 120,
    items: 'off',
    hazards: false,
    stageId: 'last-festival',
    seed: 1337,
    skipIntro: true,
    ...overrides,
  };
}

export function createSim(overrides: Partial<MatchConfig> = {}): Simulation {
  return new Simulation(makeConfig(overrides));
}

export function step(
  sim: Simulation,
  frames: number,
  inputs: Partial<Record<number, InputFrame>> | ((frame: number) => Partial<Record<number, InputFrame>>) = {},
): void {
  for (let i = 0; i < frames; i++) {
    const frameInputs = typeof inputs === 'function' ? inputs(i) : inputs;
    sim.step(frameInputs);
  }
}

export function placeOnGround(sim: Simulation, slot: number, x: number, facing: 1 | -1 = 1): Fighter {
  const fighter = sim.fighters.find((entry) => entry.slot === slot);
  if (!fighter) throw new Error(`Missing fighter ${slot}`);
  fighter.pos = { x, y: 0 };
  fighter.prevPos = { x, y: 0 };
  fighter.vel = { x: 0, y: 0 };
  fighter.grounded = true;
  fighter.groundPlatformId = 'ground';
  fighter.state = 'idle';
  fighter.facing = facing;
  fighter.invuln = 0;
  fighter.hitstun = 0;
  fighter.hitstop = 0;
  fighter.currentMove = null;
  fighter.charging = null;
  return fighter;
}

export function placeAir(sim: Simulation, slot: number, x: number, y: number): Fighter {
  const fighter = sim.fighters.find((entry) => entry.slot === slot);
  if (!fighter) throw new Error(`Missing fighter ${slot}`);
  fighter.pos = { x, y };
  fighter.prevPos = { x, y };
  fighter.vel = { x: 0, y: 0 };
  fighter.grounded = false;
  fighter.groundPlatformId = null;
  fighter.state = 'air';
  fighter.invuln = 0;
  fighter.hitstun = 0;
  fighter.hitstop = 0;
  fighter.currentMove = null;
  fighter.charging = null;
  fighter.airDodgeUsed = false;
  return fighter;
}

export function fighter(sim: Simulation, slot: number): Fighter {
  const found = sim.fighters.find((entry) => entry.slot === slot);
  if (!found) throw new Error(`Missing fighter ${slot}`);
  return found;
}

export function attackOnce(attacker: Fighter, targetDamage: number): { sim: Simulation; target: Fighter; attacker: Fighter } {
  void attacker;
  const sim = createSim();
  const p1 = placeOnGround(sim, 0, -1, 1);
  const p2 = placeOnGround(sim, 1, 0.6, -1);
  p2.damage = targetDamage;
  sim.step({ 0: input({ attack: true }) });
  for (let i = 0; i < 12; i++) sim.step({});
  return { sim, target: p2, attacker: p1 };
}
