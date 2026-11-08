import { applyDirectionalInfluence, computeKnockback, knockbackVelocity } from '../combat/knockback';
import {
  NEUTRAL_INPUT,
  pressedButtons,
  type ButtonPress,
  type InputFrame,
} from '../core/input/InputTypes';
import type { FighterState, PlayerConfig, SimEvent } from '../core/game-state/types';
import type { PlatformState } from '../physics/platforms';
import { getPlatformById, isOverPlatform, nearestLedge } from '../physics/platforms';
import type { SpawnPoint } from '../stages/types';
import { approach, clamp, sign } from '../utils/math';
import type {
  FighterDefinition,
  FighterStats,
  HitboxData,
  MoveData,
  MoveSlot,
  ProjectileSpawnData,
  ThrowHit,
} from './types';

export interface FighterUpdateContext {
  frame: number;
  platforms: PlatformState[];
  fighters: Fighter[];
  canAct: boolean;
  teamMode: boolean;
  infiniteStocks: boolean;
  infiniteJumps: boolean;
  infiniteMeter: boolean;
  resolveHitboxes(attacker: Fighter): void;
  resolveGrabbox(attacker: Fighter): void;
  spawnProjectile(attacker: Fighter, spawn: ProjectileSpawnData, multiplier: number): void;
  emit(event: SimEvent): void;
}

export interface CurrentMove {
  move: MoveData;
  frame: number;
  chargeMultiplier: number;
  spawnedProjectiles: Set<number>;
  hitTargets: Set<string>;
  buffApplied: boolean;
}

export interface LedgeHold {
  x: number;
  y: number;
  platformId: string;
  side: 1 | -1;
}

type ActionKind = 'attack' | 'strong' | 'special' | 'grab';

export interface ActionBuffer {
  kind: ActionKind;
  timer: number;
}

const MAX_CHARGE_FRAMES = 45;

export class Fighter {
  readonly slot: number;
  readonly config: PlayerConfig;
  readonly definition: FighterDefinition;
  readonly stats: FighterStats;
  readonly startStocks: number;

  pos = { x: 0, y: 0 };
  prevPos = { x: 0, y: 0 };
  vel = { x: 0, y: 0 };
  facing: 1 | -1 = 1;
  input: InputFrame = { ...NEUTRAL_INPUT };
  prevInput: InputFrame = { ...NEUTRAL_INPUT };

  state: FighterState = 'air';
  grounded = false;
  groundPlatformId: string | null = null;
  airJumpsLeft = 1;
  fastFall = false;
  airDodgeUsed = false;
  dropThroughTimer = 0;
  ledgeCooldown = 0;
  ledge: LedgeHold | null = null;

  damage = 0;
  stocks: number;
  meter = 0;
  hypeFrames = 0;
  speedBuff = 0;
  jumpBuffTimer = 0;
  invuln = 0;
  hitstop = 0;
  hitstun = 0;
  landingTimer = 0;
  rollTimer = 0;
  airdodgeTimer = 0;
  shieldStun = 0;
  breakTimer = 0;
  shieldHP = 100;
  respawnTimer = 0;

  currentMove: CurrentMove | null = null;
  charging: { slot: MoveSlot; frames: number } | null = null;
  grabTarget: number | null = null;
  grabbedBy: number | null = null;
  grabTimer = 0;

  eliminated = false;
  comboCount = 0;
  comboTimer = 0;
  comboBest = 0;
  lastHitBy: number | null = null;
  lastHitFrame = -9999;

  kos = 0;
  falls = 0;
  damageDealt = 0;
  damageTaken = 0;

  private jumpBuffer = 0;
  private actionBuffer: ActionBuffer | null = null;
  private spawnPoint: SpawnPoint;
  private inputHistory: string[] = [];
  private chargeTickCounter = 0;

  constructor(
    config: PlayerConfig,
    definition: FighterDefinition,
    spawn: SpawnPoint,
    stocks: number,
  ) {
    this.slot = config.slot;
    this.config = config;
    this.definition = definition;
    this.stats = definition.stats;
    this.startStocks = stocks;
    this.stocks = stocks;
    this.spawnPoint = spawn;
    this.pos = { x: spawn.x, y: spawn.y };
    this.prevPos = { ...this.pos };
    this.facing = spawn.facing;
  }

  get isCPU(): boolean {
    return !this.config.human;
  }

  get isAlive(): boolean {
    return !this.eliminated;
  }

  get isShielding(): boolean {
    return this.state === 'shield' || this.state === 'shieldstun';
  }

  get isIntangible(): boolean {
    return this.invuln > 0;
  }

  get speedMultiplier(): number {
    let value = 1;
    if (this.speedBuff > 0) value *= 1.22;
    if (this.hypeFrames > 0) value *= 1.12;
    return value;
  }

  get jumpMultiplier(): number {
    return (this.jumpBuffTimer > 0 ? 1.22 : 1) * (this.hypeFrames > 0 ? 1.08 : 1);
  }

  get attackMultiplier(): number {
    return this.hypeFrames > 0 ? 1.22 : 1;
  }

  get hurtbox(): { x: number; y: number; halfWidth: number; halfHeight: number } {
    return {
      x: this.pos.x,
      y: this.pos.y + this.stats.height / 2,
      halfWidth: this.stats.width / 2,
      halfHeight: this.stats.height / 2,
    };
  }

  get attackPower(): number {
    return this.definition.stats.attackPower;
  }

  setSpawnPoint(spawn: SpawnPoint): void {
    this.spawnPoint = spawn;
    if (this.state === 'dead' || this.eliminated) return;
    this.pos = { x: spawn.x, y: spawn.y };
    this.prevPos = { ...this.pos };
    this.facing = spawn.facing;
  }

  update(input: InputFrame, ctx: FighterUpdateContext): void {
    this.input = input;
    const previousInput = this.prevInput;
    const pressed = pressedButtons(input, previousInput);
    this.prevInput = { ...input };
    this.trackInput(input);

    if (this.eliminated) return;

    if (this.invuln > 0) this.invuln--;
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) this.comboCount = 0;
    }
    if (this.speedBuff > 0) this.speedBuff--;
    if (this.jumpBuffTimer > 0) this.jumpBuffTimer--;
    if (this.hypeFrames > 0) this.hypeFrames--;
    if (this.dropThroughTimer > 0) this.dropThroughTimer--;
    if (this.ledgeCooldown > 0) this.ledgeCooldown--;
    if (this.jumpBuffer > 0) this.jumpBuffer--;
    if (this.actionBuffer) {
      this.actionBuffer.timer--;
      if (this.actionBuffer.timer <= 0) this.actionBuffer = null;
    }
    if (!this.isShielding && this.shieldStun <= 0) {
      this.shieldHP = Math.min(100, this.shieldHP + 0.045);
    }
    if (ctx.infiniteMeter) this.meter = 100;
    if (ctx.infiniteJumps && !this.grounded && this.airJumpsLeft < this.stats.airJumps) {
      this.airJumpsLeft = this.stats.airJumps;
    }

    if (pressed.jump) this.jumpBuffer = 7;
    if (pressed.attack) this.actionBuffer = { kind: 'attack', timer: 7 };
    if (pressed.strong) this.actionBuffer = { kind: 'strong', timer: 7 };
    if (pressed.special) this.actionBuffer = { kind: 'special', timer: 7 };
    if (pressed.grab) this.actionBuffer = { kind: 'grab', timer: 7 };

    if (this.state === 'dead') {
      if (!this.eliminated) {
        this.respawnTimer--;
        if (this.respawnTimer <= 0) this.doRespawn(ctx);
      }
      return;
    }

    if (this.grabbedBy !== null) {
      this.syncGrabbed(ctx);
      return;
    }

    if (this.state === 'grabbing') {
      this.updateGrabbing(pressed, ctx);
      return;
    }

    if (this.state === 'shieldbreak') {
      this.breakTimer--;
      if (this.breakTimer <= 0) {
        this.state = this.grounded ? 'idle' : 'air';
        this.shieldHP = 40;
      }
      return;
    }

    if (this.state === 'ledge') {
      this.updateLedge(pressed, ctx);
      return;
    }

    if (this.hitstun > 0) {
      this.hitstun--;
      this.applyPhysics(ctx);
      this.postMovement(ctx);
      if (this.hitstun === 0) this.state = this.grounded ? 'idle' : 'air';
      return;
    }

    if (this.state === 'roll') {
      this.rollTimer--;
      this.vel.x *= 0.84;
      this.applyPhysics(ctx);
      this.postMovement(ctx);
      if (this.rollTimer <= 0) this.state = this.grounded ? 'idle' : 'air';
      return;
    }

    if (this.state === 'airdodge') {
      this.airdodgeTimer--;
      this.applyPhysics(ctx);
      this.postMovement(ctx);
      if (this.airdodgeTimer <= 0) this.state = this.grounded ? 'idle' : 'air';
      return;
    }

    if (this.state === 'landing') {
      this.landingTimer--;
      this.applyPhysics(ctx);
      this.postMovement(ctx);
      if (this.landingTimer <= 0) this.state = this.grounded ? 'idle' : 'air';
      return;
    }

    if (this.state === 'charge') {
      this.updateCharge(pressed, ctx);
      return;
    }

    if (this.state === 'shieldstun') {
      this.shieldStun--;
      this.applyPhysics(ctx);
      if (this.shieldStun <= 0) {
        this.state = this.input.shield ? 'shield' : this.grounded ? 'idle' : 'air';
      }
      if (this.isShielding) this.drainShield(ctx);
      return;
    }

    if (this.state === 'shield') {
      this.updateShield(pressed, ctx);
      return;
    }

    if (this.currentMove) {
      this.updateMove(input, ctx);
      return;
    }

    if (!ctx.canAct) {
      this.autoFace(ctx);
      this.updateMovement(input);
      this.applyPhysics(ctx);
      this.postMovement(ctx);
      return;
    }

    this.autoFace(ctx);

    if (pressed.shield) {
      if (!this.grounded && !this.airDodgeUsed) {
        this.startAirDodge(input);
        this.applyPhysics(ctx);
        this.postMovement(ctx);
        return;
      }
      if (this.grounded) {
        if (Math.abs(input.moveX) > 0.35) {
          this.startRoll(input.moveX > 0 ? 1 : -1);
          this.applyPhysics(ctx);
          this.postMovement(ctx);
          return;
        }
        if (input.moveY < -0.35) {
          this.startSpotDodge();
          return;
        }
        this.state = 'shield';
        this.vel.x = 0;
        this.drainShield(ctx);
        return;
      }
    }

    if (pressed.taunt) {
      if (this.meter >= 100) {
        this.activateHype(ctx);
        return;
      }
      if (this.grounded) {
        if (this.tryStartMove('taunt', 1, ctx)) {
          this.applyPhysics(ctx);
          this.postMovement(ctx);
          if (this.currentMove) this.resolveAndAdvance(ctx);
          return;
        }
      }
    }

    if (this.jumpBuffer > 0 && this.tryJump(ctx)) {
      this.jumpBuffer = 0;
    }

    if (this.actionBuffer && this.actionBuffer.timer > 0) {
      const kind = this.actionBuffer.kind;
      let started = false;
      if (kind === 'attack') started = this.tryAttack(input, ctx);
      else if (kind === 'strong') started = this.tryStrong(input, ctx);
      else if (kind === 'special') started = this.trySpecial(input, ctx);
      else if (kind === 'grab') started = this.tryGrab(ctx);
      if (started) this.actionBuffer = null;
    }

    if (this.grounded && input.moveY < -0.5 && previousInput.moveY >= -0.5) {
      const platform = getPlatformById(ctx.platforms, this.groundPlatformId);
      if (platform && platform.style !== 'main') {
        this.grounded = false;
        this.groundPlatformId = null;
        this.pos.y -= 0.06;
        this.vel.y = -0.08;
        this.dropThroughTimer = 12;
        this.state = 'air';
      }
    }

    if (!this.grounded && input.moveY < -0.5 && this.vel.y < 0.06 && !this.fastFall) {
      this.fastFall = true;
      this.vel.y = -this.stats.fastFallSpeed;
    }

    this.updateMovement(input);
    this.applyPhysics(ctx);
    this.postMovement(ctx);

    if (this.currentMove) this.resolveAndAdvance(ctx);
  }

  private trackInput(input: InputFrame): void {
    const horizontal = input.moveX > 0.3 ? 'R' : input.moveX < -0.3 ? 'L' : '-';
    const vertical = input.moveY > 0.3 ? 'U' : input.moveY < -0.3 ? 'D' : '-';
    const buttons =
      (input.jump ? 'J' : '') +
      (input.attack ? 'A' : '') +
      (input.strong ? 'S' : '') +
      (input.special ? 'P' : '') +
      (input.shield ? 'G' : '') +
      (input.grab ? 'B' : '');
    this.inputHistory.push(`${horizontal}${vertical}${buttons || '.'}`);
    if (this.inputHistory.length > 90) this.inputHistory.shift();
  }

  getInputHistory(): readonly string[] {
    return this.inputHistory;
  }

  private autoFace(ctx: FighterUpdateContext): void {
    if (!this.grounded || this.currentMove) return;
    if (Math.abs(this.input.moveX) > 0.35) return;
    let nearest: Fighter | null = null;
    let distance = Infinity;
    for (const other of ctx.fighters) {
      if (other === this || other.eliminated) continue;
      if (ctx.teamMode && other.config.team === this.config.team) continue;
      const dx = Math.abs(other.pos.x - this.pos.x);
      if (dx < distance) {
        distance = dx;
        nearest = other;
      }
    }
    if (nearest) this.facing = sign(nearest.pos.x - this.pos.x);
  }

  private updateShield(pressed: ButtonPress, ctx: FighterUpdateContext): void {
    if (!this.grounded) {
      this.state = 'air';
      return;
    }
    if (pressed.jump) {
      this.state = 'idle';
      this.tryJump(ctx);
      return;
    }
    if (pressed.grab || pressed.attack) {
      this.state = 'idle';
      this.tryGrab(ctx);
      return;
    }
    if (!this.input.shield) {
      this.state = 'idle';
      return;
    }
    this.vel.x = 0;
    this.drainShield(ctx);
    if (this.isShielding) this.postMovement(ctx);
  }

  private drainShield(ctx: FighterUpdateContext): void {
    if (!this.isShielding) return;
    this.shieldHP -= 0.075;
    if (this.shieldHP <= 0) this.breakShield(ctx);
  }

  private breakShield(ctx: FighterUpdateContext): void {
    this.shieldHP = 0;
    this.state = 'shieldbreak';
    this.breakTimer = 100;
    this.vel = { x: 0, y: 0 };
    this.currentMove = null;
    ctx.emit({ type: 'shield', player: this.slot, x: this.pos.x, y: this.pos.y + 1, broken: true });
  }

  private startRoll(direction: 1 | -1): void {
    this.state = 'roll';
    this.rollTimer = 26;
    this.invuln = Math.max(this.invuln, 15);
    this.vel.x = direction * 0.2;
    this.facing = direction;
  }

  private startSpotDodge(): void {
    this.state = 'roll';
    this.rollTimer = 24;
    this.invuln = Math.max(this.invuln, 17);
    this.vel.x = 0;
  }

  private startAirDodge(input: InputFrame): void {
    this.state = 'airdodge';
    this.airdodgeTimer = 30;
    this.airDodgeUsed = true;
    this.invuln = Math.max(this.invuln, 17);
    const magnitude = Math.hypot(input.moveX, input.moveY);
    if (magnitude > 0.25) {
      this.vel.x = input.moveX * 0.3;
      this.vel.y = input.moveY * 0.26;
    } else {
      this.vel.x = 0;
      this.vel.y = 0.03;
    }
    this.facing = input.moveX !== 0 ? sign(input.moveX) : this.facing;
  }

  private updateLedge(pressed: ButtonPress, ctx: FighterUpdateContext): void {
    if (!this.ledge) {
      this.state = 'air';
      return;
    }
    const towardPlatform = this.ledge.side === -1 ? 1 : -1;
    if (pressed.jump || this.input.moveY > 0.5 || pressed.special) {
      this.releaseLedge(towardPlatform);
      this.vel.y = this.stats.jumpVelocity * 1.02;
      this.vel.x = towardPlatform * 0.06;
      this.state = 'air';
      this.ledgeCooldown = 25;
      ctx.emit({ type: 'jump', player: this.slot, x: this.pos.x, y: this.pos.y, double: false });
      return;
    }
    if (this.input.moveY < -0.5 || pressed.shield) {
      this.releaseLedge(-towardPlatform);
      this.vel.x = -towardPlatform * 0.07;
      this.vel.y = -0.02;
      this.state = 'air';
      this.ledgeCooldown = 35;
    }
  }

  private releaseLedge(facing: number): void {
    this.ledge = null;
    this.facing = sign(facing);
  }

  private updateGrabbing(pressed: ButtonPress, ctx: FighterUpdateContext): void {
    const target = this.getGrabbedTarget(ctx);
    if (!target || target.eliminated || target.grabbedBy !== this.slot) {
      this.releaseGrab();
      this.state = this.grounded ? 'idle' : 'air';
      return;
    }
    this.grabTimer--;
    this.vel.x = 0;
    target.pos.x = this.pos.x + this.facing * 0.62;
    target.pos.y = this.pos.y;
    target.prevPos = { ...target.prevPos };
    target.facing = sign(this.pos.x - target.pos.x);
    if (pressed.attack || pressed.grab || this.grabTimer <= 0 || pressed.strong) {
      this.performThrow(ctx);
    }
  }

  private getGrabbedTarget(ctx: FighterUpdateContext): Fighter | null {
    if (this.grabTarget === null) return null;
    return ctx.fighters.find((fighter) => fighter.slot === this.grabTarget) ?? null;
  }

  private performThrow(ctx: FighterUpdateContext): void {
    const target = this.getGrabbedTarget(ctx);
    if (!target) {
      this.releaseGrab();
      this.state = this.grounded ? 'idle' : 'air';
      return;
    }
    let throwSlot: MoveSlot = 'throwForward';
    if (this.input.moveY > 0.5) throwSlot = 'throwUp';
    else if (this.input.moveY < -0.5) throwSlot = 'throwDown';
    else if (Math.abs(this.input.moveX) > 0.35) {
      throwSlot = sign(this.input.moveX) === this.facing ? 'throwForward' : 'throwBack';
    }
    const move = this.definition.moves[throwSlot];
    const throwHit = move.throwHit;
    target.grabbedBy = null;
    target.grabTimer = 0;
    this.grabTarget = null;
    this.state = 'attack';
    this.currentMove = {
      move,
      frame: Math.floor(move.totalFrames * 0.35),
      chargeMultiplier: 1,
      spawnedProjectiles: new Set(),
      hitTargets: new Set(),
      buffApplied: true,
    };
    target.receiveThrow(this, throwHit, ctx);
    ctx.emit({ type: 'throw', attacker: this.slot, target: target.slot });
  }

  private tryGrab(ctx: FighterUpdateContext): boolean {
    if (!this.grounded) return false;
    return this.tryStartMove('grab', 1, ctx);
  }

  beginGrab(target: Fighter): void {
    this.grabTarget = target.slot;
    this.grabTimer = 55;
    this.currentMove = null;
    this.state = 'grabbing';
    this.vel = { x: 0, y: 0 };
    target.grabbedBy = this.slot;
    target.state = 'grabbed';
    target.vel = { x: 0, y: 0 };
    target.currentMove = null;
    target.charging = null;
    target.grabTarget = null;
    target.facing = sign(this.pos.x - target.pos.x);
  }

  releaseGrab(ctx?: FighterUpdateContext): void {
    this.releaseOwnGrab(ctx);
  }

  cancelMoveWithClash(hitstop = 6): void {
    this.currentMove = null;
    this.charging = null;
    this.state = this.grounded ? 'idle' : 'air';
    this.hitstop = Math.max(this.hitstop, hitstop);
    if (this.grounded) this.vel.x = 0;
  }

  private syncGrabbed(ctx: FighterUpdateContext): void {
    if (this.grabbedBy === null) return;
    const grabber = ctx.fighters.find((fighter) => fighter.slot === this.grabbedBy);
    if (!grabber || grabber.grabTarget !== this.slot || grabber.state !== 'grabbing' || grabber.eliminated) {
      this.grabbedBy = null;
      this.state = this.grounded ? 'idle' : 'air';
      return;
    }
    this.pos.x = grabber.pos.x + grabber.facing * 0.62;
    this.pos.y = grabber.pos.y;
    this.prevPos = { ...this.prevPos };
    this.facing = sign(grabber.pos.x - this.pos.x);
    this.vel = { x: 0, y: 0 };
  }

  private updateCharge(pressed: ButtonPress, ctx: FighterUpdateContext): void {
    if (!this.charging) {
      this.state = this.grounded ? 'idle' : 'air';
      return;
    }
    this.charging.frames = Math.min(MAX_CHARGE_FRAMES, this.charging.frames + 1);
    this.chargeTickCounter++;
    if (this.chargeTickCounter >= 12) {
      this.chargeTickCounter = 0;
      ctx.emit({ type: 'charge', player: this.slot, x: this.pos.x, y: this.pos.y + 1 });
    }
    this.vel.x = approach(this.vel.x, 0, this.stats.groundFriction);
    if (pressed.strongRelease || this.charging.frames >= MAX_CHARGE_FRAMES) {
      const ratio = this.charging.frames / MAX_CHARGE_FRAMES;
      const multiplier = 1 + ratio * 0.5;
      const slot = this.charging.slot;
      this.charging = null;
      this.chargeTickCounter = 0;
      this.tryStartMove(slot, multiplier, ctx);
      if (this.currentMove) this.resolveAndAdvance(ctx);
    }
  }

  private startCharge(input: InputFrame): boolean {
    if (!this.grounded) return false;
    const direction = this.getDirection(input);
    let slot: MoveSlot = 'sideStrong';
    if (direction === 'up') slot = 'upStrong';
    else if (direction === 'down') slot = 'downStrong';
    this.state = 'charge';
    this.charging = { slot, frames: 0 };
    this.chargeTickCounter = 0;
    this.vel.x = 0;
    return true;
  }

  private tryStrong(input: InputFrame, ctx: FighterUpdateContext): boolean {
    if (this.grounded) return this.startCharge(input);
    return this.tryAttack(input, ctx);
  }

  private tryAttack(input: InputFrame, ctx: FighterUpdateContext): boolean {
    const direction = this.getDirection(input);
    let slot: MoveSlot;
    if (this.grounded) {
      if (direction === 'up') slot = 'upTilt';
      else if (direction === 'down') slot = 'downTilt';
      else if (direction === 'side') slot = 'sideTilt';
      else slot = 'jab';
    } else {
      if (direction === 'up') slot = 'upAir';
      else if (direction === 'down') slot = 'downAir';
      else if (direction === 'side') {
        const directionSign = sign(input.moveX);
        slot = directionSign === this.facing ? 'forwardAir' : 'backAir';
      } else slot = 'neutralAir';
    }
    return this.tryStartMove(slot, 1, ctx);
  }

  private trySpecial(input: InputFrame, ctx: FighterUpdateContext): boolean {
    const direction = this.getDirection(input);
    let slot: MoveSlot = 'neutralSpecial';
    if (direction === 'up') slot = 'upSpecial';
    else if (direction === 'down') slot = 'downSpecial';
    else if (direction === 'side') slot = 'sideSpecial';
    return this.tryStartMove(slot, 1, ctx);
  }

  private getDirection(input: InputFrame): 'up' | 'down' | 'side' | 'neutral' {
    if (input.moveY > 0.55) return 'up';
    if (input.moveY < -0.55) return 'down';
    if (Math.abs(input.moveX) > 0.35) return 'side';
    return 'neutral';
  }

  private tryStartMove(slot: MoveSlot, multiplier: number, ctx: FighterUpdateContext): boolean {
    const move = this.definition.moves[slot];
    if (!move) return false;
    if (move.kind === 'aerial' && this.grounded) return false;
    if ((move.kind === 'ground' || move.kind === 'grab' || move.kind === 'taunt') && !this.grounded) return false;
    if (slot === 'grab' && this.grabbedBy !== null) return false;
    this.currentMove = {
      move,
      frame: 0,
      chargeMultiplier: multiplier,
      spawnedProjectiles: new Set(),
      hitTargets: new Set(),
      buffApplied: false,
    };
    this.state = 'attack';
    this.charging = null;
    this.fastFall = false;
    if (this.grounded) this.vel.x = 0;
    if (slot === 'grab') ctx.emit({ type: 'grab', attacker: this.slot, target: -1 });
    return true;
  }

  private updateMove(input: InputFrame, ctx: FighterUpdateContext): void {
    if (!this.currentMove) {
      this.state = this.grounded ? 'idle' : 'air';
      return;
    }
    const current = this.currentMove;
    const frame = current.frame;
    const move = current.move;

    if (move.intangibility) {
      const [start, end] = move.intangibility;
      if (frame >= start && frame <= end) this.invuln = Math.max(this.invuln, 2);
    }

    if (move.impulses) {
      for (const impulse of move.impulses) {
        if (impulse.frame !== frame) continue;
        if (impulse.vx !== undefined) {
          this.vel.x = impulse.vx * (impulse.relativeToFacing === false ? 1 : this.facing);
        }
        if (impulse.vy !== undefined) {
          this.vel.y = impulse.vy * (impulse.preserveMomentum ? 0.5 : 1);
          if (impulse.vy > 0) {
            this.grounded = false;
            this.groundPlatformId = null;
            this.state = 'attack';
          }
        }
      }
    }

    if (move.projectiles) {
      move.projectiles.forEach((spawn, index) => {
        if (spawn.atFrame === frame && !current.spawnedProjectiles.has(index)) {
          current.spawnedProjectiles.add(index);
          ctx.spawnProjectile(this, spawn, current.chargeMultiplier);
        }
      });
    }

    if (move.selfBuff && move.selfBuff.atFrame === frame && !current.buffApplied) {
      current.buffApplied = true;
      if (move.selfBuff.speedFrames) this.speedBuff = Math.max(this.speedBuff, move.selfBuff.speedFrames);
      if (move.selfBuff.jumpFrames) this.jumpBuffTimer = Math.max(this.jumpBuffTimer, move.selfBuff.jumpFrames);
      if (move.selfBuff.meter) this.meter = clamp(this.meter + move.selfBuff.meter, 0, 100);
    }

    if (!this.grounded) {
      const airTarget = input.moveX * this.stats.airSpeed * this.speedMultiplier;
      this.vel.x = approach(this.vel.x, airTarget, this.stats.airAcceleration * 0.35);
    } else {
      this.vel.x = approach(this.vel.x, 0, this.stats.groundFriction * 0.55);
    }

    this.applyPhysics(ctx);
    this.postMovement(ctx);

    if (this.currentMove) this.resolveAndAdvance(ctx);
  }

  private resolveAndAdvance(ctx: FighterUpdateContext): void {
    if (!this.currentMove) return;
    ctx.resolveHitboxes(this);
    if (!this.currentMove) return;
    ctx.resolveGrabbox(this);
    if (!this.currentMove) return;
    this.currentMove.frame++;
    if (this.currentMove.frame >= this.currentMove.move.totalFrames) {
      this.endCurrentMove();
    }
  }

  private endCurrentMove(): void {
    this.currentMove = null;
    if (this.state === 'attack') {
      this.state = this.grounded ? 'idle' : 'air';
    }
  }

  private tryJump(ctx: FighterUpdateContext): boolean {
    if (this.currentMove || this.state === 'dead' || this.state === 'hitstun') return false;
    if (this.grounded) {
      this.grounded = false;
      this.groundPlatformId = null;
      this.airJumpsLeft = this.stats.airJumps;
      this.vel.y = this.stats.jumpVelocity * this.jumpMultiplier;
      this.state = 'air';
      this.fastFall = false;
      ctx.emit({ type: 'jump', player: this.slot, x: this.pos.x, y: this.pos.y, double: false });
      return true;
    }
    if (this.airJumpsLeft > 0) {
      this.airJumpsLeft--;
      this.vel.y = this.stats.doubleJumpVelocity * this.jumpMultiplier;
      this.state = 'air';
      this.fastFall = false;
      ctx.emit({ type: 'jump', player: this.slot, x: this.pos.x, y: this.pos.y, double: true });
      return true;
    }
    return false;
  }

  private updateMovement(input: InputFrame): void {
    if (this.currentMove || this.state === 'charge') {
      return;
    }
    if (this.state === 'grabbing' || this.state === 'grabbed') return;
    if (this.state === 'shield' || this.state === 'shieldstun') {
      this.vel.x = approach(this.vel.x, 0, this.stats.groundFriction);
      return;
    }
    if (this.grounded) {
      if (this.state === 'crouch' || input.moveY < -0.5) {
        this.state = 'crouch';
        this.vel.x = approach(this.vel.x, 0, this.stats.groundFriction * 1.2);
        return;
      }
      const magnitude = Math.abs(input.moveX);
      if (magnitude > 0.2) {
        const base = magnitude > 0.75 ? this.stats.runSpeed : this.stats.walkSpeed;
        const target = input.moveX * base * this.speedMultiplier;
        const turnaround = sign(this.vel.x) !== sign(target) && Math.abs(this.vel.x) > 0.02 ? 1.7 : 1;
        this.vel.x = approach(this.vel.x, target, this.stats.groundAcceleration * turnaround);
        this.facing = sign(target);
        this.state = Math.abs(this.vel.x) > this.stats.walkSpeed * 1.05 ? 'run' : 'walk';
      } else {
        this.vel.x = approach(this.vel.x, 0, this.stats.groundFriction);
        this.state = Math.abs(this.vel.x) > 0.01 ? 'walk' : 'idle';
      }
    } else {
      if (this.state !== 'hitstun') {
        const target = input.moveX * this.stats.airSpeed * this.speedMultiplier;
        if (Math.abs(input.moveX) > 0.15) {
          this.vel.x = approach(this.vel.x, target, this.stats.airAcceleration);
          this.facing = sign(input.moveX);
        } else {
          this.vel.x = approach(this.vel.x, 0, this.stats.airFriction);
        }
        if (this.state !== 'attack') this.state = 'air';
      }
    }
  }

  private applyPhysics(ctx: FighterUpdateContext): void {
    if (this.state === 'grabbing' || this.state === 'grabbed') return;
    if (this.state === 'airdodge') {
      const prevFeet = this.pos.y;
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      this.vel.x *= 0.94;
      this.vel.y *= 0.94;
      if (this.vel.y <= 0 && this.dropThroughTimer <= 0) this.tryLand(ctx, prevFeet);
      return;
    }

    if (!this.grounded) {
      const cap = this.fastFall ? this.stats.fastFallSpeed : this.stats.maxFallSpeed;
      this.vel.y -= this.stats.gravity;
      if (this.vel.y < -cap) this.vel.y = -cap;
      const prevFeet = this.pos.y;
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      if (this.vel.y <= 0 && this.dropThroughTimer <= 0) {
        this.tryLand(ctx, prevFeet);
      }
    } else {
      const platform = getPlatformById(ctx.platforms, this.groundPlatformId);
      if (platform) this.pos.y = platform.curY;
      this.pos.x += this.vel.x;
    }
  }

  private tryLand(ctx: FighterUpdateContext, prevFeet: number): void {
    let landing: PlatformState | null = null;
    for (const platform of ctx.platforms) {
      const top = platform.curY;
      if (prevFeet >= top - 0.02 && this.pos.y <= top && isOverPlatform(platform, this.pos.x, this.stats.width * 0.35)) {
        if (!landing || top > landing.curY) landing = platform;
      }
    }
    if (!landing) return;
    this.pos.y = landing.curY;
    this.vel.y = 0;
    this.grounded = true;
    this.groundPlatformId = landing.id;
    this.airJumpsLeft = this.stats.airJumps;
    this.fastFall = false;
    this.airDodgeUsed = false;
    ctx.emit({ type: 'land', player: this.slot, x: this.pos.x, y: this.pos.y });

    if (this.currentMove) {
      const move = this.currentMove.move;
      if (move.kind === 'aerial') {
        const lag = move.landingLag ?? 5;
        this.currentMove = null;
        this.state = 'landing';
        this.landingTimer = lag;
        this.vel.x *= 0.5;
        return;
      }
    }
    if (this.state === 'airdodge') {
      this.state = 'idle';
      this.airdodgeTimer = 0;
      return;
    }
    if (this.state === 'hitstun') return;
    if (this.state === 'attack') return;
    if (this.state === 'roll') return;
    if (this.state !== 'shield' && this.state !== 'shieldstun') {
      this.state = 'idle';
    }
  }

  private postMovement(ctx: FighterUpdateContext): void {
    if (this.grounded) {
      const platform = getPlatformById(ctx.platforms, this.groundPlatformId);
      if (!platform || !isOverPlatform(platform, this.pos.x, this.stats.width * 0.35)) {
        this.grounded = false;
        this.groundPlatformId = null;
        if (!this.currentMove && this.state !== 'hitstun' && this.state !== 'shield') {
          this.state = 'air';
        }
      } else {
        this.pos.y = platform.curY;
      }
      return;
    }

    if (
      this.state === 'air' &&
      !this.currentMove &&
      this.ledgeCooldown <= 0 &&
      this.vel.y <= 0.15 &&
      this.hitstun <= 0
    ) {
      const ledge = nearestLedge(ctx.platforms, this.pos.x, this.pos.y, 0.85);
      if (ledge) {
        const platformLeft = ledge.platform.curX - ledge.platform.width / 2;
        const platformRight = ledge.platform.curX + ledge.platform.width / 2;
        const isOutsideEdge =
          (ledge.side === -1 && this.pos.x <= platformLeft + 0.2) ||
          (ledge.side === 1 && this.pos.x >= platformRight - 0.2);
        const isBelowTop = this.pos.y <= ledge.y + 0.45;
        if (isBelowTop && isOutsideEdge) {
          this.state = 'ledge';
          this.ledge = {
            x: ledge.x,
            y: ledge.y,
            platformId: ledge.platform.id,
            side: ledge.side,
          };
          this.pos.x = ledge.x + (ledge.side === -1 ? -0.55 : 0.55);
          this.pos.y = ledge.y - this.stats.height * 0.55;
          this.prevPos = { ...this.prevPos };
          this.vel = { x: 0, y: 0 };
          this.facing = ledge.side === -1 ? 1 : -1;
          this.resetAirOptions();
          this.invuln = Math.max(this.invuln, 30);
          this.ledgeCooldown = 20;
          ctx.emit({ type: 'ledge', player: this.slot });
        }
      }
    }
  }

  private resetAirOptions(): void {
    this.airDodgeUsed = false;
    this.airJumpsLeft = this.stats.airJumps;
    this.fastFall = false;
  }

  private activateHype(ctx: FighterUpdateContext): void {
    if (this.meter < 100) return;
    this.meter = 0;
    this.hypeFrames = 480;
    this.invuln = Math.max(this.invuln, 12);
    ctx.emit({ type: 'hype', player: this.slot, x: this.pos.x, y: this.pos.y + 1 });
  }

  receiveHit(attacker: Fighter, hit: HitboxData, multiplier: number, ctx: FighterUpdateContext): void {
    if (this.isIntangible || this.eliminated || this.state === 'dead') return;
    if (this.isShielding) {
      this.receiveShieldHit(attacker, hit, multiplier, ctx);
      return;
    }
    this.applyLaunch(attacker, hit, hit.damage, hit.baseKnockback, hit.knockbackGrowth, hit.hitstop, hit.effect, multiplier, ctx);
  }

  receiveThrow(attacker: Fighter, throwHit: ThrowHit | undefined, ctx: FighterUpdateContext): void {
    if (!throwHit) return;
    this.applyLaunch(
      attacker,
      { angle: throwHit.angle, effect: throwHit.effect },
      throwHit.damage,
      throwHit.baseKnockback,
      throwHit.knockbackGrowth,
      throwHit.hitstop,
      throwHit.effect,
      1,
      ctx,
      true,
    );
  }

  private applyLaunch(
    attacker: Fighter,
    visual: { angle: number; effect?: string; meteor?: boolean },
    damage: number,
    baseKnockback: number,
    knockbackGrowth: number,
    hitstop: number,
    effect: string | undefined,
    chargeMultiplier: number,
    ctx: FighterUpdateContext,
    isThrow = false,
  ): void {
    const hypeMultiplier = attacker.attackMultiplier;
    const dealt = Math.max(0, damage * chargeMultiplier * hypeMultiplier * (isThrow ? 1 : 1));
    this.damage += dealt;
    this.damageTaken += dealt;
    attacker.damageDealt += dealt;
    this.currentMove = null;
    this.charging = null;
    this.state = 'hitstun';
    this.grabbedBy = null;
    this.releaseOwnGrab(ctx);
    this.vel.x = 0;
    this.vel.y = 0;

    const direction = sign(this.pos.x - attacker.pos.x) || attacker.facing;
    const diAngle = applyDirectionalInfluence(visual.angle, direction, this.input);
    const kb = computeKnockback({
      damage: damage * chargeMultiplier,
      targetPercent: this.damage,
      weight: this.stats.weight,
      baseKnockback,
      knockbackGrowth: knockbackGrowth * (1 + (chargeMultiplier - 1) * 0.5),
      knockbackResistance: this.stats.knockbackResistance,
      attackMultiplier: hypeMultiplier,
    });
    const velocity = knockbackVelocity(kb.magnitude, diAngle, direction);
    this.vel = velocity;
    this.grounded = false;
    this.groundPlatformId = null;
    this.fastFall = false;
    this.hitstun = Math.max(8, kb.hitstun);
    this.hitstop = hitstop;
    this.invuln = 0;
    this.ledge = null;
    this.airDodgeUsed = true;
    this.lastHitBy = attacker.slot;
    this.lastHitFrame = ctx.frame;

    if (this.comboTimer > 0) this.comboCount++;
    else this.comboCount = 1;
    this.comboTimer = 65;
    this.comboBest = Math.max(this.comboBest, this.comboCount);

    attacker.meter = clamp(attacker.meter + dealt * 1.15, 0, 100);
    this.meter = clamp(this.meter + dealt * 0.65, 0, 100);
    attacker.hitstop = Math.max(attacker.hitstop, hitstop);

    ctx.emit({
      type: 'hit',
      x: this.pos.x,
      y: this.pos.y + this.stats.height * 0.6,
      damage: dealt,
      power: kb.magnitude,
      shielded: false,
      attacker: attacker.slot,
      target: this.slot,
      effect: effect ?? 'punch',
    });
  }

  private receiveShieldHit(
    attacker: Fighter,
    hit: HitboxData,
    multiplier: number,
    ctx: FighterUpdateContext,
  ): void {
    const shieldDamage = hit.damage * multiplier * attacker.attackMultiplier * (hit.shieldDamage ?? 1);
    this.shieldHP -= shieldDamage;
    this.shieldStun = Math.max(this.shieldStun, hit.hitstop + 4);
    this.state = 'shieldstun';
    this.vel.x = 0;
    attacker.hitstop = Math.max(attacker.hitstop, hit.hitstop);
    ctx.emit({
      type: 'hit',
      x: this.pos.x,
      y: this.pos.y + this.stats.height * 0.55,
      damage: shieldDamage,
      power: 0,
      shielded: true,
      attacker: attacker.slot,
      target: this.slot,
      effect: hit.effect ?? 'punch',
    });
    if (this.shieldHP <= 0) this.breakShield(ctx);
  }

  receiveHazard(damage: number, angle: number, baseKnockback: number, knockbackGrowth: number, originX: number, ctx: FighterUpdateContext): void {
    if (this.eliminated || this.state === 'dead' || this.invuln > 0) return;
    this.damage += damage;
    this.damageTaken += damage;
    const direction = sign(this.pos.x - originX) || 1;
    const kb = computeKnockback({
      damage,
      targetPercent: this.damage,
      weight: this.stats.weight,
      baseKnockback,
      knockbackGrowth,
      knockbackResistance: this.stats.knockbackResistance,
    });
    const velocity = knockbackVelocity(kb.magnitude, angle, direction);
    this.vel = velocity;
    this.state = 'hitstun';
    this.hitstun = Math.max(10, kb.hitstun);
    this.hitstop = 4;
    this.grounded = false;
    this.groundPlatformId = null;
    this.currentMove = null;
    this.charging = null;
    this.invuln = 0;
    this.lastHitBy = null;
    ctx.emit({
      type: 'hit',
      x: this.pos.x,
      y: this.pos.y + this.stats.height * 0.6,
      damage,
      power: kb.magnitude,
      shielded: false,
      attacker: -1,
      target: this.slot,
      effect: 'explosion',
    });
  }

  private releaseOwnGrab(ctx?: FighterUpdateContext): void {
    if (this.grabTarget !== null && ctx) {
      const target = ctx.fighters.find((fighter) => fighter.slot === this.grabTarget);
      if (target && target.grabbedBy === this.slot) {
        target.grabbedBy = null;
        if (target.state === 'grabbed') target.state = target.grounded ? 'idle' : 'air';
      }
    }
    if (this.grabTarget !== null) {
      this.grabTarget = null;
    }
    this.grabTimer = 0;
  }

  knockOut(ctx: FighterUpdateContext, by: Fighter | null): void {
    if (this.eliminated) return;
    if (!ctx.infiniteStocks) {
      this.stocks = Math.max(0, this.stocks - 1);
    }
    this.falls++;
    if (by && by !== this) by.kos++;
    this.currentMove = null;
    this.charging = null;
    this.hitstun = 0;
    this.hitstop = 0;
    this.grabbedBy = null;
    this.releaseOwnGrab(ctx);
    this.vel = { x: 0, y: 0 };
    this.state = 'dead';
    this.damage = 0;
    ctx.emit({
      type: 'ko',
      x: clamp(this.pos.x, -12, 12),
      y: clamp(this.pos.y, -5, 10),
      player: this.slot,
      by: by?.slot ?? null,
    });
    if (!ctx.infiniteStocks && this.stocks <= 0) {
      this.eliminated = true;
      this.respawnTimer = 0;
    } else {
      this.respawnTimer = ctx.infiniteStocks ? 45 : 95;
    }
  }

  private doRespawn(ctx: FighterUpdateContext): void {
    this.pos = { x: this.spawnPoint.x, y: this.spawnPoint.y };
    this.prevPos = { ...this.pos };
    this.vel = { x: 0, y: 0 };
    this.facing = this.spawnPoint.facing;
    this.damage = 0;
    this.state = 'air';
    this.grounded = false;
    this.groundPlatformId = null;
    this.airJumpsLeft = this.stats.airJumps;
    this.fastFall = false;
    this.airDodgeUsed = false;
    this.invuln = 120;
    this.hitstun = 0;
    this.hitstop = 0;
    this.shieldHP = 100;
    this.shieldStun = 0;
    this.currentMove = null;
    this.charging = null;
    this.ledge = null;
    this.jumpBuffTimer = 0;
    this.respawnTimer = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    ctx.emit({ type: 'respawn', player: this.slot, x: this.pos.x, y: this.pos.y });
  }

  forceEliminate(): void {
    this.eliminated = true;
    this.state = 'dead';
    this.stocks = 0;
  }

  restore(state: FighterSnapshot): void {
    Object.assign(this, state);
    this.jumpBuffTimer = state.jumpBuff;
    this.prevInput = { ...state.prevInput };
    this.input = { ...state.input };
    this.currentMove = state.currentMove
      ? {
          ...state.currentMove,
          move: this.definition.moves[state.currentMove.move.slot],
          spawnedProjectiles: new Set(state.currentMove.spawnedProjectiles),
          hitTargets: new Set(state.currentMove.hitTargets),
        }
      : null;
    this.charging = state.charging ? { ...state.charging } : null;
    this.ledge = state.ledge ? { ...state.ledge } : null;
  }

  snapshot(): FighterSnapshot {
    return {
      pos: { ...this.pos },
      prevPos: { ...this.prevPos },
      vel: { ...this.vel },
      facing: this.facing,
      input: { ...this.input },
      prevInput: { ...this.prevInput },
      state: this.state,
      grounded: this.grounded,
      groundPlatformId: this.groundPlatformId,
      airJumpsLeft: this.airJumpsLeft,
      fastFall: this.fastFall,
      airDodgeUsed: this.airDodgeUsed,
      dropThroughTimer: this.dropThroughTimer,
      ledgeCooldown: this.ledgeCooldown,
      ledge: this.ledge ? { ...this.ledge } : null,
      damage: this.damage,
      stocks: this.stocks,
      meter: this.meter,
      hypeFrames: this.hypeFrames,
      speedBuff: this.speedBuff,
      jumpBuff: this.jumpBuffTimer,
      invuln: this.invuln,
      hitstop: this.hitstop,
      hitstun: this.hitstun,
      landingTimer: this.landingTimer,
      rollTimer: this.rollTimer,
      airdodgeTimer: this.airdodgeTimer,
      shieldStun: this.shieldStun,
      breakTimer: this.breakTimer,
      shieldHP: this.shieldHP,
      respawnTimer: this.respawnTimer,
      currentMove: this.currentMove
        ? {
            move: { slot: this.currentMove.move.slot } as MoveData,
            frame: this.currentMove.frame,
            chargeMultiplier: this.currentMove.chargeMultiplier,
            spawnedProjectiles: [...this.currentMove.spawnedProjectiles],
            hitTargets: [...this.currentMove.hitTargets],
            buffApplied: this.currentMove.buffApplied,
          }
        : null,
      charging: this.charging ? { ...this.charging } : null,
      grabTarget: this.grabTarget,
      grabbedBy: this.grabbedBy,
      grabTimer: this.grabTimer,
      eliminated: this.eliminated,
      comboCount: this.comboCount,
      comboTimer: this.comboTimer,
      comboBest: this.comboBest,
      lastHitBy: this.lastHitBy,
      lastHitFrame: this.lastHitFrame,
      kos: this.kos,
      falls: this.falls,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      jumpBuffer: this.jumpBuffer,
      actionBuffer: this.actionBuffer ? { ...this.actionBuffer } : null,
    };
  }
}

export interface FighterSnapshot {
  pos: { x: number; y: number };
  prevPos: { x: number; y: number };
  vel: { x: number; y: number };
  facing: 1 | -1;
  input: InputFrame;
  prevInput: InputFrame;
  state: FighterState;
  grounded: boolean;
  groundPlatformId: string | null;
  airJumpsLeft: number;
  fastFall: boolean;
  airDodgeUsed: boolean;
  dropThroughTimer: number;
  ledgeCooldown: number;
  ledge: LedgeHold | null;
  damage: number;
  stocks: number;
  meter: number;
  hypeFrames: number;
  speedBuff: number;
  jumpBuff: number;
  invuln: number;
  hitstop: number;
  hitstun: number;
  landingTimer: number;
  rollTimer: number;
  airdodgeTimer: number;
  shieldStun: number;
  breakTimer: number;
  shieldHP: number;
  respawnTimer: number;
  currentMove: (Omit<CurrentMove, 'move' | 'spawnedProjectiles' | 'hitTargets'> & { move: MoveData; spawnedProjectiles: number[]; hitTargets: string[] }) | null;
  charging: { slot: MoveSlot; frames: number } | null;
  grabTarget: number | null;
  grabbedBy: number | null;
  grabTimer: number;
  eliminated: boolean;
  comboCount: number;
  comboTimer: number;
  comboBest: number;
  lastHitBy: number | null;
  lastHitFrame: number;
  kos: number;
  falls: number;
  damageDealt: number;
  damageTaken: number;
  jumpBuffer: number;
  actionBuffer: ActionBuffer | null;
}


