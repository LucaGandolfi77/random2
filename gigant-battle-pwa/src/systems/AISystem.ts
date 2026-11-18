import type { AIProfile } from '../data/enemies';
import type { Fighter } from '../entities/Fighter';
import { emptyInput, type InputFrame } from '../game/types';

export interface AIOptions { difficulty: number; rng?: () => number; profile?: AIProfile }

/** Behaviour tree with reaction delay, spacing, blocking and special usage. */
export class AISystem {
  private timer = 0;
  private out: InputFrame = emptyInput();
  private rng: () => number;
  private difficulty = 1;
  private profile: AIProfile | null;
  private attackLatch = false;

  constructor(options: AIOptions) {
    this.rng = options.rng ?? Math.random;
    this.difficulty = options.difficulty;
    this.profile = options.profile ?? null;
  }

  configure(value: number | AIProfile | null) {
    if (typeof value === 'number') this.difficulty = value;
    else this.profile = value;
  }

  reset() { this.timer = 0; this.out = emptyInput(); this.attackLatch = false; }

  private finish(out: InputFrame): InputFrame {
    if (this.attackLatch) {
      out.light = out.heavy = out.special = false;
      this.attackLatch = false;
    } else if (out.light || out.heavy || out.special) {
      this.attackLatch = true;
    }
    this.out = out;
    return out;
  }

  decide(dt: number, self: Fighter, foe: Fighter): InputFrame {
    this.timer -= dt;
    if (this.timer > 0) return this.out;
    const p = this.profile;
    this.timer = p
      ? p.reaction * (0.8 + this.rng() * 0.4)
      : Math.max(0.08, 0.32 - this.difficulty * 0.045) + this.rng() * 0.12;

    const out = emptyInput();
    if (!self.alive || !foe.alive || self.stun > 0 || self.state === 'ko' || self.state === 'hurt') return this.finish(out);

    const dx = foe.centerX - self.centerX;
    const dist = Math.abs(dx);
    const dir = dx > 0 ? 1 : -1;
    const agg = p ? p.aggression : 0.35 + this.difficulty * 0.12;
    const blockChance = p ? p.blockChance : 0.18 + this.difficulty * 0.07;
    const specialChance = p ? p.specialChance : agg * 0.7;
    const preferred = p ? p.preferredRange : 50;

    const threat = foe.attack && foe.attackTime < foe.attack.startup + foe.attack.active + 0.05 && dist < 58;
    if (threat && this.rng() < blockChance && self.onGround) {
      out.block = true;
      return this.finish(out);
    }

    if (dist > preferred + 16) {
      if (dir > 0) out.right = true; else out.left = true;
      if (this.rng() < 0.07 + this.difficulty * 0.03 && self.onGround) out.up = true;
      if (dist < 170 && self.energy >= self.def.specialCost && this.rng() < specialChance) out.special = true;
    } else if (dist > 34) {
      if (this.rng() < agg) {
        if (dir > 0) out.right = true; else out.left = true;
      }
      if (self.energy >= self.def.specialCost && this.rng() < specialChance) out.special = true;
      else if (this.rng() < agg * 0.55) out.heavy = true;
    } else {
      if (this.rng() < 0.7 + this.difficulty * 0.05) out.light = true;
      else if (this.rng() < 0.3) out.heavy = true;
      if (this.rng() < (p ? p.dodgeChance : 0.08 + this.difficulty * 0.03)) out.dodge = true;
      if (foe.centerX < self.centerX) out.left = true; else out.right = true;
    }

    if (self.assistCooldowns.some((c) => c <= 0) && dist < 130 && dist > 22 && this.rng() < (p ? p.assistChance : 0.12)) {
      if (self.assistCooldowns[0] <= 0) out.assist1 = true;
      else out.assist2 = true;
    }

    if (dist < 18 && this.rng() < 0.25) {
      out.left = dir > 0;
      out.right = dir < 0;
      out.light = out.heavy = out.special = false;
    }

    return this.finish(out);
  }
}
