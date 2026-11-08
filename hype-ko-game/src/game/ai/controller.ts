import {
  InputBit,
  neutralInput,
  type InputState
} from '../combat/types';
import type { MatchSim } from '../combat/simulation';

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface AIPersonality {
  aggression: number;
  defense: number;
  combo: number;
  special: number;
}

interface DifficultyPreset {
  reactionMin: number;
  reactionMax: number;
  blockChance: number;
  punishChance: number;
  comboChance: number;
  specialChance: number;
  superChance: number;
  jumpChance: number;
  antiAirChance: number;
  mistakeChance: number;
}

const DIFFICULTY: Record<AIDifficulty, DifficultyPreset> = {
  easy: {
    reactionMin: 22,
    reactionMax: 34,
    blockChance: 0.25,
    punishChance: 0.2,
    comboChance: 0.15,
    specialChance: 0.18,
    superChance: 0.18,
    jumpChance: 0.07,
    antiAirChance: 0.2,
    mistakeChance: 0.25
  },
  normal: {
    reactionMin: 14,
    reactionMax: 23,
    blockChance: 0.45,
    punishChance: 0.4,
    comboChance: 0.42,
    specialChance: 0.32,
    superChance: 0.4,
    jumpChance: 0.11,
    antiAirChance: 0.45,
    mistakeChance: 0.1
  },
  hard: {
    reactionMin: 9,
    reactionMax: 16,
    blockChance: 0.66,
    punishChance: 0.66,
    comboChance: 0.66,
    specialChance: 0.48,
    superChance: 0.62,
    jumpChance: 0.14,
    antiAirChance: 0.7,
    mistakeChance: 0.04
  },
  expert: {
    reactionMin: 6,
    reactionMax: 11,
    blockChance: 0.84,
    punishChance: 0.86,
    comboChance: 0.86,
    specialChance: 0.6,
    superChance: 0.8,
    jumpChance: 0.16,
    antiAirChance: 0.9,
    mistakeChance: 0.01
  }
};

type Plan =
  | 'approach'
  | 'retreat'
  | 'block'
  | 'wait'
  | 'attack'
  | 'special'
  | 'super'
  | 'hype'
  | 'finisher'
  | 'jump'
  | 'antiAir'
  | 'grab'
  | 'tag';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class AIController {
  readonly index: number;
  private readonly rng: () => number;
  private readonly preset: DifficultyPreset;
  private readonly personality: AIPersonality;
  private plan: Plan = 'wait';
  private planTimer = 0;
  private held = 0;
  private pendingPressed = 0;
  private s1Cooldown = 0;
  private s2Cooldown = 0;
  private superCooldown = 0;
  private hypeCooldown = 0;
  private reaction = 12;

  constructor(
    index: number,
    personality: AIPersonality,
    difficulty: AIDifficulty = 'normal',
    seed = 0x9e3779b9
  ) {
    this.index = index;
    this.personality = personality;
    this.preset = DIFFICULTY[difficulty] ?? DIFFICULTY.normal;
    this.rng = mulberry32(seed + index * 7919);
    this.reaction = this.rollReaction();
  }

  private rollReaction(): number {
    const { reactionMin, reactionMax } = this.preset;
    return reactionMin + Math.floor(this.rng() * (reactionMax - reactionMin + 1));
  }

  private chance(value: number): boolean {
    return this.rng() < value;
  }

  private decide(sim: MatchSim): InputState {
    const self = sim.fighters[this.index];
    const opponent = sim.nearestOpponent(self);
    if (!opponent) return neutralInput();

    const dist = Math.abs(opponent.x - self.x);
    const toward = opponent.x >= self.x ? InputBit.Right : InputBit.Left;
    const away = toward === InputBit.Right ? InputBit.Left : InputBit.Right;
    const forward = self.facing === 1 ? InputBit.Right : InputBit.Left;
    const opponentAttacking = opponent.state === 'attack' && opponent.move !== null;
    const attackStartup = opponentAttacking ? opponent.move!.startup : 0;
    const opponentThreat =
      opponentAttacking &&
      opponent.moveFrame <= attackStartup + opponent.move!.active &&
      opponent.move!.behavior?.type !== 'buff' &&
      opponent.move!.behavior?.type !== 'zone';

    const incomingProjectile = sim.projectiles.some((projectile) => {
      if (projectile.owner === self.index || projectile.team === self.team) return false;
      const dx = projectile.x - self.x;
      if (Math.abs(dx) > 3.2) return false;
      if (projectile.fromSky) return Math.abs(dx) < 1.4;
      return Math.sign(projectile.vx) === Math.sign(dx) || Math.abs(projectile.vx) < 0.01;
    });

    const lowHealth = self.health < self.maxHealth * 0.28;
    const canFinish =
      self.hype >= 100 &&
      sim.round >= sim.config.roundsToWin &&
      opponent.health < opponent.maxHealth * 0.35 &&
      dist < 1.7;

    if (canFinish) {
      this.plan = 'finisher';
      this.planTimer = 4;
      this.held = 0;
      this.pendingPressed = InputBit.Finisher;
      return this.emit();
    }

    if (lowHealth && self.hype >= 100 && this.hypeCooldown <= 0) {
      this.plan = 'hype';
      this.planTimer = 12;
      this.held = 0;
      this.pendingPressed = InputBit.Hype;
      this.hypeCooldown = 180;
      return this.emit();
    }

    if (
      self.super >= 100 &&
      dist < 3.4 &&
      this.superCooldown <= 0 &&
      this.chance(this.preset.superChance)
    ) {
      this.plan = 'super';
      this.planTimer = 8;
      this.held = 0;
      this.pendingPressed = InputBit.Super;
      this.superCooldown = 240;
      return this.emit();
    }

    if (incomingProjectile) {
      if (this.chance(this.preset.blockChance)) {
        this.plan = 'block';
        this.planTimer = 16;
        this.held = InputBit.Block;
        this.pendingPressed = InputBit.Block;
        return this.emit();
      }
      if (this.chance(this.preset.jumpChance * 2)) {
        this.plan = 'jump';
        this.planTimer = 10;
        this.held = toward;
        this.pendingPressed = InputBit.Up;
        return this.emit();
      }
    }

    if (opponentThreat && dist < 2.5) {
      if (opponent.moveFrame >= this.preset.reactionMin && this.chance(this.preset.blockChance)) {
        this.plan = 'block';
        this.planTimer = 12 + Math.floor(this.rng() * 8);
        this.held = InputBit.Block;
        this.pendingPressed = InputBit.Block;
        return this.emit();
      }
      if (this.chance(this.preset.punishChance * 0.5)) {
        this.plan = 'retreat';
        this.planTimer = 10;
        this.held = away;
        this.pendingPressed = 0;
        return this.emit();
      }
    }

    if (opponent.airborne && dist < 2.2 && this.chance(this.preset.antiAirChance)) {
      this.plan = 'antiAir';
      this.planTimer = 6;
      this.held = toward;
      this.pendingPressed = InputBit.LightKick;
      return this.emit();
    }

    if (dist < 1.35) {
      if (opponent.state === 'hitstun' && this.chance(this.preset.comboChance)) {
        this.plan = 'attack';
        this.planTimer = 6;
        this.held = forward;
        this.pendingPressed = this.chance(0.5) ? InputBit.LightPunch : InputBit.LightKick;
        return this.emit();
      }
      if (opponent.blocking && this.chance(this.preset.punishChance)) {
        this.plan = 'grab';
        this.planTimer = 6;
        this.held = 0;
        this.pendingPressed = InputBit.Grab;
        return this.emit();
      }
      if (this.chance(this.personality.aggression)) {
        this.plan = 'attack';
        this.planTimer = 6 + Math.floor(this.rng() * 6);
        this.held = this.chance(0.35) ? forward : 0;
        const roll = this.rng();
        if (roll < 0.4) this.pendingPressed = InputBit.LightPunch;
        else if (roll < 0.72) this.pendingPressed = InputBit.LightKick;
        else if (roll < 0.86 && this.s2Cooldown <= 0) {
          this.pendingPressed = InputBit.Special2;
          this.s2Cooldown = 90;
        } else this.pendingPressed = InputBit.Grab;
        return this.emit();
      }
      if (this.chance(this.personality.defense)) {
        this.plan = 'block';
        this.planTimer = 10 + Math.floor(this.rng() * 8);
        this.held = InputBit.Block;
        this.pendingPressed = InputBit.Block;
        return this.emit();
      }
      this.plan = 'retreat';
      this.planTimer = 8;
      this.held = away;
      this.pendingPressed = 0;
      return this.emit();
    }

    if (dist < 3.6) {
      if (
        this.s2Cooldown <= 0 &&
        this.chance(this.preset.specialChance * this.personality.special)
      ) {
        this.plan = 'special';
        this.planTimer = 8;
        this.held = 0;
        this.pendingPressed = InputBit.Special2;
        this.s2Cooldown = 80 + Math.floor(this.rng() * 60);
        return this.emit();
      }
      if (
        this.s1Cooldown <= 0 &&
        this.chance(this.preset.specialChance * this.personality.special * 0.8)
      ) {
        this.plan = 'special';
        this.planTimer = 8;
        this.held = 0;
        this.pendingPressed = InputBit.Special1;
        this.s1Cooldown = 70 + Math.floor(this.rng() * 50);
        return this.emit();
      }
      if (this.chance(this.preset.jumpChance)) {
        this.plan = 'jump';
        this.planTimer = 10;
        this.held = toward;
        this.pendingPressed = InputBit.Up;
        return this.emit();
      }
      this.plan = 'approach';
      this.planTimer = 8 + Math.floor(this.rng() * 6);
      this.held = toward;
      this.pendingPressed = 0;
      return this.emit();
    }

    if (
      this.s1Cooldown <= 0 &&
      this.chance(this.preset.specialChance * this.personality.special)
    ) {
      this.plan = 'special';
      this.planTimer = 8;
      this.held = 0;
      this.pendingPressed = InputBit.Special1;
      this.s1Cooldown = 60 + Math.floor(this.rng() * 50);
      return this.emit();
    }

    if (this.chance(this.preset.jumpChance)) {
      this.plan = 'jump';
      this.planTimer = 12;
      this.held = toward;
      this.pendingPressed = InputBit.Up;
      return this.emit();
    }

    this.plan = 'approach';
    this.planTimer = 10 + Math.floor(this.rng() * 8);
    this.held = toward;
    this.pendingPressed = 0;
    return this.emit();
  }

  private emit(): InputState {
    return { held: this.held, pressed: this.pendingPressed };
  }

  private tryTag(sim: MatchSim, self: MatchSim['fighters'][number]): boolean {
    if (sim.config.rumble || sim.config.teamSize <= 1) return false;
    if (self.health > self.maxHealth * 0.3 || self.tagCooldown > 0) return false;
    const reserve = sim.fighters.find(
      (fighter) => fighter.team === self.team && !fighter.active && !fighter.ko
    );
    return Boolean(reserve) && this.chance(0.7);
  }

  private tryComboCancel(self: MatchSim['fighters'][number]): number {
    if (self.state !== 'attack' || !self.move || !self.moveContact) return 0;
    const move = self.move;
    if (!move.cancelInto || !move.cancelWindow) return 0;
    if (self.moveFrame < move.cancelWindow[0] || self.moveFrame > move.cancelWindow[1]) return 0;
    if (!this.chance(this.preset.comboChance)) return 0;
    if (move.cancelInto.includes('super') && self.super >= 100 && this.chance(0.3)) {
      return InputBit.Super;
    }
    if (move.cancelInto.includes('special') && this.s2Cooldown <= 0 && this.chance(0.2)) {
      this.s2Cooldown = 80;
      return InputBit.Special2;
    }
    if (move.cancelInto.includes('light')) {
      return this.chance(0.5) ? InputBit.LightPunch : InputBit.LightKick;
    }
    if (move.cancelInto.includes('heavy')) {
      return InputBit.LightPunch;
    }
    return 0;
  }

  update(sim: MatchSim): InputState {
    const self = sim.fighters[this.index];
    if (!self || !self.active || self.ko) return neutralInput();
    if (sim.phase !== 'fight') {
      this.held = 0;
      this.pendingPressed = 0;
      return neutralInput();
    }

    if (this.s1Cooldown > 0) this.s1Cooldown--;
    if (this.s2Cooldown > 0) this.s2Cooldown--;
    if (this.superCooldown > 0) this.superCooldown--;
    if (this.hypeCooldown > 0) this.hypeCooldown--;

    if (self.state === 'attack') {
      const pressed = this.tryComboCancel(self);
      return { held: this.held, pressed };
    }

    if (
      self.state === 'hitstun' ||
      self.state === 'blockstun' ||
      self.state === 'knockdown' ||
      self.state === 'wakeup' ||
      self.state === 'stunned' ||
      self.state === 'tagIn' ||
      self.state === 'tagOut'
    ) {
      this.held = 0;
      this.pendingPressed = 0;
      return neutralInput();
    }

    if (this.planTimer > 0) {
      this.planTimer--;
      const opponent = sim.nearestOpponent(self);
      const dist = opponent ? Math.abs(opponent.x - self.x) : 99;
      const breakPlan =
        (this.plan === 'approach' && dist < 1.15) ||
        (this.plan === 'retreat' && dist > 4.2) ||
        (this.plan === 'block' && this.planTimer < 2);
      if (!breakPlan) {
        const out = { held: this.held, pressed: this.pendingPressed };
        this.pendingPressed = 0;
        return out;
      }
    }

    if (this.reaction > 0) this.reaction--;
    if (this.reaction > 0 && this.plan === 'wait') {
      return neutralInput();
    }

    if (this.tryTag(sim, self)) {
      this.plan = 'tag';
      this.planTimer = 10;
      this.held = 0;
      this.pendingPressed = InputBit.Tag;
      this.reaction = this.rollReaction();
      return this.emit();
    }

    if (this.chance(this.preset.mistakeChance)) {
      this.plan = 'wait';
      this.planTimer = 6 + Math.floor(this.rng() * 10);
      this.held = 0;
      this.pendingPressed = 0;
      this.reaction = this.rollReaction();
      return this.emit();
    }

    this.reaction = this.rollReaction();
    return this.decide(sim);
  }

  reset(): void {
    this.plan = 'wait';
    this.planTimer = 0;
    this.held = 0;
    this.pendingPressed = 0;
    this.s1Cooldown = 0;
    this.s2Cooldown = 0;
    this.superCooldown = 0;
    this.hypeCooldown = 0;
    this.reaction = this.rollReaction();
  }
}

export function createAI(
  index: number,
  personality: AIPersonality,
  difficulty: AIDifficulty = 'normal',
  seed = 0x9e3779b9
): AIController {
  return new AIController(index, personality, difficulty, seed);
}
