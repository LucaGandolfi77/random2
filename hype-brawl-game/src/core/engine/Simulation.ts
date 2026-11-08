import { computeAIInput } from '../../ai/AIController';
import { ITEM_KINDS } from '../../items/itemData';
import { Fighter, type FighterSnapshot, type FighterUpdateContext } from '../../fighters/Fighter';
import { stockWinnerSlots, teamWinnerSlots, timeWinnerSlots } from '../../modes/matchRules';
import { getFighterDefinition } from '../../fighters/roster';
import type { FighterDefinition, HitboxData, MoveData, ProjectileSpawnData } from '../../fighters/types';
import { createPlatformStates, updatePlatformStates, type PlatformState } from '../../physics/platforms';
import { getStageDefinition, LAST_FESTIVAL } from '../../stages/stageData';
import type { StageDefinition } from '../../stages/types';
import { circleOverlapsBox, clamp, distanceSq } from '../../utils/math';
import { Rng } from '../../utils/rng';
import {
  NEUTRAL_INPUT,
  cloneInput,
  type InputFrame,
} from '../input/InputTypes';
import type {
  FighterState,
  ItemFrequency,
  ItemKind,
  MatchConfig,
  SimEvent,
} from '../game-state/types';

export interface ProjectileState {
  id: number;
  owner: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  life: number;
  maxLife: number;
  damage: number;
  angle: number;
  baseKnockback: number;
  knockbackGrowth: number;
  hitstop: number;
  visual: string;
}

export interface ItemState {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  landed: boolean;
  life: number;
}

export type HazardPhase = 'idle' | 'warning' | 'active';

export interface MatchSnapshot {
  frame: number;
  introRemaining: number;
  timeRemainingFrames: number;
  elapsedFrames: number;
  finished: boolean;
  winners: number[];
  rngState: number;
  hazardPhase: HazardPhase;
  hazardWasActive: boolean;
  itemSpawnTimer: number;
  nextItemId: number;
  nextProjectileId: number;
  fighters: FighterSnapshot[];
  projectiles: ProjectileState[];
  items: ItemState[];
}

const ITEM_INTERVALS: Record<ItemFrequency, number> = {
  off: 0,
  low: 900,
  normal: 480,
  chaos: 170,
};

const ITEM_CAPS: Record<ItemFrequency, number> = {
  off: 0,
  low: 1,
  normal: 2,
  chaos: 5,
};

function toHitbox(source: ProjectileState): HitboxData {
  return {
    start: 0,
    end: 0,
    offsetX: 0,
    offsetY: 0,
    radius: source.radius,
    damage: source.damage,
    angle: source.angle,
    baseKnockback: source.baseKnockback,
    knockbackGrowth: source.knockbackGrowth,
    hitstop: source.hitstop,
    effect: source.visual as HitboxData['effect'],
  };
}

export class Simulation {
  readonly config: MatchConfig;
  readonly stage: StageDefinition;
  readonly platforms: PlatformState[];
  readonly fighters: Fighter[] = [];
  readonly rng: Rng;

  frame = 0;
  introRemaining: number;
  timeRemainingFrames: number;
  elapsedFrames = 0;
  finished = false;
  winners: number[] = [];
  hazardPhase: HazardPhase = 'idle';
  hazardWasActive = false;
  itemSpawnTimer = 0;

  private readonly events: SimEvent[] = [];
  private readonly projectileList: ProjectileState[] = [];
  private readonly itemList: ItemState[] = [];
  private readonly infiniteStocks: boolean;
  private nextProjectileId = 1;
  private nextItemId = 1;
  private readonly aiLevel: number;

  constructor(config: MatchConfig) {
    this.config = {
      ...config,
      players: config.players.map((player) => ({ ...player })),
    };
    this.stage = getStageDefinition(config.stageId) ?? LAST_FESTIVAL;
    this.platforms = createPlatformStates(this.stage.platforms);
    this.rng = new Rng(config.seed || 1);
    this.aiLevel = config.mode === 'spectator' ? 3 : 2;
    this.infiniteStocks = config.mode === 'training' || config.mode === 'time';

    const introFrames = config.skipIntro ? 0 : 165;
    this.introRemaining = introFrames;
    this.timeRemainingFrames = Math.max(10, config.timeLimitSeconds) * 60;
    this.itemSpawnTimer = this.initialItemDelay();

    for (const player of config.players) {
      const definition = getFighterDefinition(player.fighterId) ?? getFighterDefinition('nero');
      if (!definition) continue;
      const spawnIndex = player.slot % this.stage.spawns.length;
      const spawn = this.stage.spawns[spawnIndex];
      const stocks =
        this.config.mode === 'training' || this.config.mode === 'time'
          ? 99
          : Math.max(1, this.config.stocks);
      this.fighters.push(new Fighter(player, definition, spawn, stocks));
    }

    this.emit({ type: 'announce', text: 'READY' });
  }

  get projectiles(): readonly ProjectileState[] {
    return this.projectileList;
  }

  get items(): readonly ItemState[] {
    return this.itemList;
  }

  get canActNow(): boolean {
    return this.introRemaining <= 60;
  }

  get introLabel(): 'READY' | 'FIGHT' | null {
    if (this.introRemaining > 60) return 'READY';
    if (this.introRemaining > 0) return 'FIGHT';
    return null;
  }

  get timeSeconds(): number {
    return Math.max(0, Math.ceil(this.timeRemainingFrames / 60));
  }

  get isTraining(): boolean {
    return this.config.mode === 'training';
  }

  drainEvents(): SimEvent[] {
    return this.events.splice(0, this.events.length);
  }

  getFighter(slot: number): Fighter | undefined {
    return this.fighters.find((fighter) => fighter.slot === slot);
  }

  private emit(event: SimEvent): void {
    this.events.push(event);
  }

  private initialItemDelay(): number {
    const interval = ITEM_INTERVALS[this.config.items];
    if (interval === 0) return Number.POSITIVE_INFINITY;
    return Math.floor(interval * 0.55);
  }

  step(humanInputs: Partial<Record<number, InputFrame>>): void {
    if (this.finished) return;
    this.frame++;

    if (this.introRemaining > 0) {
      this.introRemaining--;
      if (this.introRemaining === 60) this.emit({ type: 'announce', text: 'FIGHT' });
    } else {
      this.elapsedFrames++;
    }

    updatePlatformStates(this.platforms, this.frame);
    for (const fighter of this.fighters) {
      if (!fighter.grounded || !fighter.groundPlatformId) continue;
      const platform = this.platforms.find((entry) => entry.id === fighter.groundPlatformId);
      if (!platform) continue;
      fighter.pos.x += platform.curX - platform.prevX;
      fighter.pos.y = platform.curY;
    }

    const teamMode = this.config.mode === 'team';
    const ctx = this.createContext(teamMode);

    for (const fighter of this.fighters) {
      fighter.prevPos = { ...fighter.pos };
      let input: InputFrame;
      if (fighter.isCPU) {
        input = computeAIInput(fighter, this.fighters, {
          frame: this.frame,
          level: this.config.mode === 'spectator' ? 3 : this.aiLevel,
          stage: this.stage,
          rng: this.rng,
          teamMode,
          passive: this.config.mode === 'training' && fighter.slot > 0,
        });
      } else {
        const provided = humanInputs[fighter.slot];
        input = provided ? cloneInput(provided) : NEUTRAL_INPUT;
      }
      fighter.update(input, ctx);
    }

    this.updateProjectiles(ctx);
    this.updateItems(ctx);
    this.updateHazard(ctx);
    this.checkBlastZones(ctx);

    if (this.config.mode === 'time' && this.introRemaining === 0 && !this.finished) {
      this.timeRemainingFrames = Math.max(0, this.timeRemainingFrames - 1);
    }
    this.evaluateFinish();
  }

  private createContext(teamMode: boolean): FighterUpdateContext {
    return {
      frame: this.frame,
      platforms: this.platforms,
      fighters: this.fighters,
      canAct: this.canActNow && !this.finished,
      teamMode,
      infiniteStocks: this.infiniteStocks,
      infiniteJumps: Boolean(this.config.trainingOptions?.infiniteJumps),
      infiniteMeter: Boolean(this.config.trainingOptions?.infiniteMeter),
      resolveHitboxes: (attacker) => this.resolveHitboxes(attacker, teamMode),
      resolveGrabbox: (attacker) => this.resolveGrabbox(attacker, teamMode),
      spawnProjectile: (owner, spawn, multiplier) => this.spawnProjectile(owner, spawn, multiplier),
      emit: (event) => this.emit(event),
    };
  }

  private isOpponent(attacker: Fighter, target: Fighter, teamMode: boolean): boolean {
    if (attacker === target) return false;
    if (target.eliminated || target.state === 'dead') return false;
    if (target.state === 'grabbed') return false;
    if (teamMode && attacker.config.team === target.config.team) return false;
    return true;
  }

  private resolveHitboxes(attacker: Fighter, teamMode: boolean): void {
    const current = attacker.currentMove;
    if (!current) return;
    if (this.resolveClashes(attacker, teamMode)) return;
    const frame = current.frame;
    current.move.hits.forEach((hitbox, index) => {
      if (frame < hitbox.start || frame > hitbox.end) return;
      const cx = attacker.pos.x + hitbox.offsetX * attacker.facing;
      const cy = attacker.pos.y + hitbox.offsetY;
      for (const target of this.fighters) {
        if (!this.isOpponent(attacker, target, teamMode)) continue;
        const key = `${index}:${target.slot}`;
        if (current.hitTargets.has(key)) continue;
        const box = target.hurtbox;
        if (!circleOverlapsBox(cx, cy, hitbox.radius, box.x, box.y, box.halfWidth, box.halfHeight)) continue;
        current.hitTargets.add(key);
        target.receiveHit(attacker, hitbox, current.chargeMultiplier, this.fighterContext());
        break;
      }
    });
  }

  private priorityOf(move: MoveData, hitbox: HitboxData): number {
    if (hitbox.priority) return hitbox.priority;
    if (move.kind === 'special') return 3;
    if (move.slot.endsWith('Strong')) return 2;
    return 1;
  }

  private activeHitboxes(fighter: Fighter): Array<{ x: number; y: number; radius: number; priority: number }> {
    const current = fighter.currentMove;
    if (!current) return [];
    const result: Array<{ x: number; y: number; radius: number; priority: number }> = [];
    for (const hitbox of current.move.hits) {
      if (current.frame < hitbox.start || current.frame > hitbox.end) continue;
      result.push({
        x: fighter.pos.x + hitbox.offsetX * fighter.facing,
        y: fighter.pos.y + hitbox.offsetY,
        radius: hitbox.radius,
        priority: this.priorityOf(current.move, hitbox),
      });
    }
    return result;
  }

  private resolveClashes(attacker: Fighter, teamMode: boolean): boolean {
    const attackerBoxes = this.activeHitboxes(attacker);
    if (attackerBoxes.length === 0) return false;
    const attackerPriority = Math.max(...attackerBoxes.map((box) => box.priority));
    for (const other of this.fighters) {
      if (other === attacker || other.eliminated || other.state === 'dead') continue;
      if (teamMode && other.config.team === attacker.config.team) continue;
      const otherBoxes = this.activeHitboxes(other);
      if (otherBoxes.length === 0) continue;
      const otherPriority = Math.max(...otherBoxes.map((box) => box.priority));
      let overlap: { x: number; y: number } | null = null;
      for (const a of attackerBoxes) {
        for (const b of otherBoxes) {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const reach = a.radius + b.radius;
          if (dx * dx + dy * dy <= reach * reach) {
            overlap = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            break;
          }
        }
        if (overlap) break;
      }
      if (!overlap) continue;

      const event = { type: 'clash' as const, x: overlap.x, y: overlap.y, priority: Math.max(attackerPriority, otherPriority) };
      if (attackerPriority < otherPriority) {
        attacker.cancelMoveWithClash();
        other.hitstop = Math.max(other.hitstop, 4);
        this.emit(event);
        return true;
      }
      if (attackerPriority > otherPriority) {
        other.cancelMoveWithClash();
        attacker.hitstop = Math.max(attacker.hitstop, 3);
        this.emit(event);
        continue;
      }
      attacker.cancelMoveWithClash();
      other.cancelMoveWithClash();
      this.emit(event);
      return true;
    }
    return false;
  }

  private resolveGrabbox(attacker: Fighter, teamMode: boolean): void {
    const current = attacker.currentMove;
    if (!current || !current.move.grabbox) return;
    const grabbox = current.move.grabbox;
    if (current.frame < grabbox.start || current.frame > grabbox.end) return;
    const cx = attacker.pos.x + grabbox.offsetX * attacker.facing;
    const cy = attacker.pos.y + grabbox.offsetY;
    for (const target of this.fighters) {
      if (!this.isOpponent(attacker, target, teamMode)) continue;
      if (target.grabbedBy !== null || target.state === 'grabbed' || target.isIntangible) continue;
      if (!target.grounded) continue;
      const box = target.hurtbox;
      if (!circleOverlapsBox(cx, cy, grabbox.radius, box.x, box.y, box.halfWidth, box.halfHeight)) continue;
      attacker.beginGrab(target);
      this.emit({ type: 'grab', attacker: attacker.slot, target: target.slot });
      return;
    }
  }

  private fighterContext(): FighterUpdateContext {
    return this.createContext(this.config.mode === 'team');
  }

  private spawnProjectile(owner: Fighter, spawn: ProjectileSpawnData, multiplier: number): void {
    if (owner.eliminated) return;
    const projectile: ProjectileState = {
      id: this.nextProjectileId++,
      owner: owner.slot,
      x: owner.pos.x + spawn.offsetX * owner.facing,
      y: owner.pos.y + spawn.offsetY,
      prevX: owner.pos.x + spawn.offsetX * owner.facing,
      prevY: owner.pos.y + spawn.offsetY,
      vx: spawn.vx * owner.facing * multiplier,
      vy: spawn.vy,
      gravity: spawn.gravity,
      radius: spawn.radius,
      life: spawn.life,
      maxLife: spawn.life,
      damage: spawn.damage * multiplier,
      angle: spawn.angle,
      baseKnockback: spawn.baseKnockback,
      knockbackGrowth: spawn.knockbackGrowth,
      hitstop: spawn.hitstop ?? 4,
      visual: spawn.visual,
    };
    this.projectileList.push(projectile);
    this.emit({ type: 'projectile', kind: spawn.visual, x: projectile.x, y: projectile.y });
  }

  private updateProjectiles(ctx: FighterUpdateContext): void {
    for (let i = this.projectileList.length - 1; i >= 0; i--) {
      const projectile = this.projectileList[i];
      projectile.prevX = projectile.x;
      projectile.prevY = projectile.y;
      projectile.vy -= projectile.gravity;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      projectile.life--;

      let remove = projectile.life <= 0;
      const zones = this.stage.blastZones;
      if (projectile.x < zones.left - 1 || projectile.x > zones.right + 1 || projectile.y < zones.bottom - 1 || projectile.y > zones.top + 1) {
        remove = true;
      }

      if (!remove) {
        for (const platform of this.platforms) {
          if (
            projectile.vy <= 0 &&
            projectile.prevY >= platform.curY &&
            projectile.y <= platform.curY &&
            Math.abs(projectile.x - platform.curX) <= platform.width / 2
          ) {
            remove = true;
            break;
          }
        }
      }

      if (!remove) {
        const owner = this.getFighter(projectile.owner);
        if (!owner) {
          remove = true;
        } else {
          for (const target of this.fighters) {
            if (!this.isOpponent(owner, target, this.config.mode === 'team')) continue;
            if (target.isIntangible) continue;
            const box = target.hurtbox;
            if (
              circleOverlapsBox(projectile.x, projectile.y, projectile.radius, box.x, box.y, box.halfWidth, box.halfHeight)
            ) {
              target.receiveHit(owner, toHitbox(projectile), 1, ctx);
              remove = true;
              break;
            }
          }
        }
      }

      if (remove) this.projectileList.splice(i, 1);
    }
  }

  private updateItems(ctx: FighterUpdateContext): void {
    if (this.config.items === 'off' || this.introRemaining > 0 || this.finished) return;

    const cap = ITEM_CAPS[this.config.items];
    if (this.itemList.length < cap) {
      this.itemSpawnTimer--;
      if (this.itemSpawnTimer <= 0) {
        this.spawnItem();
        this.itemSpawnTimer = ITEM_INTERVALS[this.config.items];
      }
    }

    for (let i = this.itemList.length - 1; i >= 0; i--) {
      const item = this.itemList[i];
      item.life--;
      if (item.life <= 0 || item.y < this.stage.blastZones.bottom) {
        this.itemList.splice(i, 1);
        continue;
      }
      if (!item.landed) {
        item.prevX = item.x;
        item.prevY = item.y;
        item.x += item.vx;
        item.y += item.vy;
        item.vy -= 0.018;
        for (const platform of this.platforms) {
          const top = platform.curY;
          if (
            item.vy <= 0 &&
            item.prevY >= top &&
            item.y <= top &&
            Math.abs(item.x - platform.curX) <= platform.width / 2
          ) {
            item.y = top + 0.5;
            item.vy = 0;
            item.vx = 0;
            item.landed = true;
            break;
          }
        }
      }

      for (const fighter of this.fighters) {
        if (fighter.eliminated || fighter.state === 'dead') continue;
        if (distanceSq(fighter.pos.x, fighter.pos.y + 0.9, item.x, item.y) < 1.2 * 1.2) {
          this.pickUpItem(item, fighter, ctx);
          this.itemList.splice(i, 1);
          break;
        }
      }
    }
  }

  private spawnItem(): void {
    const main = this.platforms.find((platform) => platform.style === 'main');
    const half = (main?.width ?? 18) / 2 - 1.5;
    const x = this.rng.range(-half, half);
    const kind = this.rng.pick(ITEM_KINDS);
    const item: ItemState = {
      id: this.nextItemId++,
      kind,
      x,
      y: Math.min(8.5, (main?.curY ?? 0) + 7),
      prevX: x,
      prevY: Math.min(8.5, (main?.curY ?? 0) + 7),
      vx: this.rng.range(-0.02, 0.02),
      vy: 0,
      landed: false,
      life: 900,
    };
    this.itemList.push(item);
    this.emit({ type: 'itemSpawn', kind, x, y: item.y, id: item.id });
  }

  private pickUpItem(item: ItemState, fighter: Fighter, ctx: FighterUpdateContext): void {
    this.emit({ type: 'itemPickup', kind: item.kind, player: fighter.slot, x: fighter.pos.x, y: fighter.pos.y + 1 });
    switch (item.kind) {
      case 'hypeBattery':
        fighter.meter = clamp(fighter.meter + 50, 0, 100);
        break;
      case 'megaBurger':
        fighter.damage = Math.max(0, fighter.damage - 20);
        fighter.meter = clamp(fighter.meter + 30, 0, 100);
        break;
      case 'rocketSneakers':
        fighter.jumpBuffTimer = Math.max(fighter.jumpBuffTimer, 600);
        break;
      case 'turboCan':
        fighter.speedBuff = Math.max(fighter.speedBuff, 480);
        break;
      case 'goldenMic':
        this.spawnProjectile(fighter, {
          atFrame: 0,
          offsetX: 0.7,
          offsetY: 0.9,
          vx: 0.4,
          vy: 0,
          gravity: 0,
          radius: 0.42,
          damage: 14,
          angle: 35,
          baseKnockback: 28,
          knockbackGrowth: 65,
          life: 70,
          visual: 'sound',
        }, 1);
        break;
      case 'speakerDrone':
        for (const vy of [0.12, 0, -0.12]) {
          this.spawnProjectile(fighter, {
            atFrame: 0,
            offsetX: 0.6,
            offsetY: 1.0,
            vx: 0.34,
            vy,
            gravity: 0,
            radius: 0.36,
            damage: 6,
            angle: 45,
            baseKnockback: 12,
            knockbackGrowth: 35,
            life: 55,
            visual: 'sound',
          }, 1);
        }
        break;
      case 'commentBomb': {
        for (const target of this.fighters) {
          if (target === fighter || target.eliminated) continue;
          if (this.config.mode === 'team' && target.config.team === fighter.config.team) continue;
          if (Math.abs(target.pos.x - fighter.pos.x) > 3.4) continue;
          if (Math.abs(target.pos.y - fighter.pos.y) > 3.4) continue;
          target.receiveHazard(12, 75, 25, 55, item.x, ctx);
        }
        break;
      }
      case 'glitchCapsule': {
        const roll = this.rng.int(0, 3);
        if (roll === 0) fighter.damage = Math.max(0, fighter.damage - 15);
        else if (roll === 1) fighter.meter = clamp(fighter.meter + 40, 0, 100);
        else if (roll === 2) fighter.speedBuff = Math.max(fighter.speedBuff, 360);
        else fighter.jumpBuffTimer = Math.max(fighter.jumpBuffTimer, 420);
        break;
      }
    }
  }

  private updateHazard(ctx: FighterUpdateContext): void {
    const hazard = this.stage.hazard;
    if (!hazard || !this.config.hazards || this.config.mode === 'training' || this.introRemaining > 0) {
      this.hazardPhase = 'idle';
      this.hazardWasActive = false;
      return;
    }
    const local = this.frame % hazard.interval;
    if (local < hazard.warning) {
      this.hazardPhase = 'warning';
      this.hazardWasActive = false;
      return;
    }
    if (local < hazard.warning + hazard.duration) {
      this.hazardPhase = 'active';
      if (!this.hazardWasActive) {
        this.hazardWasActive = true;
        for (const fighter of this.fighters) {
          if (fighter.eliminated || fighter.invuln > 0 || fighter.state === 'dead') continue;
          if (distanceSq(fighter.pos.x, fighter.pos.y + 0.9, hazard.x, hazard.y) > hazard.radius * hazard.radius) continue;
          fighter.receiveHazard(
            hazard.damage,
            hazard.angle,
            hazard.baseKnockback,
            hazard.knockbackGrowth,
            hazard.x,
            ctx,
          );
        }
      }
      return;
    }
    this.hazardPhase = 'idle';
    this.hazardWasActive = false;
  }

  private checkBlastZones(ctx: FighterUpdateContext): void {
    if (this.introRemaining > 0) return;
    const zones = this.stage.blastZones;
    for (const fighter of this.fighters) {
      if (fighter.eliminated || fighter.state === 'dead') continue;
      const outside =
        fighter.pos.x < zones.left ||
        fighter.pos.x > zones.right ||
        fighter.pos.y < zones.bottom ||
        fighter.pos.y > zones.top;
      if (!outside) continue;
      let by: Fighter | null = null;
      if (fighter.lastHitBy !== null && this.frame - fighter.lastHitFrame < 600) {
        by = this.getFighter(fighter.lastHitBy) ?? null;
      }
      fighter.knockOut(ctx, by);
    }
  }

  private evaluateFinish(): void {
    if (this.finished || this.config.mode === 'training') return;
    if (this.introRemaining > 0) return;

    if (this.config.mode === 'time') {
      if (this.timeRemainingFrames <= 0) this.finish(timeWinnerSlots(this.fighters));
      return;
    }

    if (this.config.mode === 'team') {
      const winners = teamWinnerSlots(this.fighters);
      if (winners) this.finish(winners);
      return;
    }

    const winners = stockWinnerSlots(this.fighters);
    if (winners) this.finish(winners);
  }

  private finish(winners: number[]): void {
    if (this.finished) return;
    this.finished = true;
    this.winners = winners;
    for (const fighter of this.fighters) {
      if (!winners.includes(fighter.slot) || fighter.eliminated) continue;
      fighter.state = 'victory';
      fighter.currentMove = null;
      fighter.charging = null;
      fighter.vel = { x: 0, y: 0 };
      fighter.hitstun = 0;
      fighter.hitstop = 0;
    }
    this.emit({ type: 'matchOver', winners: [...winners] });
  }

  trainingResetPositions(): void {
    for (let i = 0; i < this.fighters.length; i++) {
      const fighter = this.fighters[i];
      const spawn = this.stage.spawns[i % this.stage.spawns.length];
      fighter.pos = { x: spawn.x, y: spawn.y };
      fighter.prevPos = { ...fighter.pos };
      fighter.vel = { x: 0, y: 0 };
      fighter.damage = 0;
      fighter.state = 'air';
      fighter.grounded = false;
      fighter.groundPlatformId = null;
      fighter.currentMove = null;
      fighter.charging = null;
      fighter.hitstun = 0;
      fighter.hitstop = 0;
      fighter.invuln = 60;
      fighter.comboCount = 0;
      fighter.comboTimer = 0;
    }
  }

  setTrainingDamage(slot: number, percent: number): void {
    const fighter = this.getFighter(slot);
    if (!fighter) return;
    fighter.damage = clamp(percent, 0, 999);
  }

  snapshot(): MatchSnapshot {
    return {
      frame: this.frame,
      introRemaining: this.introRemaining,
      timeRemainingFrames: this.timeRemainingFrames,
      elapsedFrames: this.elapsedFrames,
      finished: this.finished,
      winners: [...this.winners],
      rngState: this.rng.getState(),
      hazardPhase: this.hazardPhase,
      hazardWasActive: this.hazardWasActive,
      itemSpawnTimer: this.itemSpawnTimer,
      nextItemId: this.nextItemId,
      nextProjectileId: this.nextProjectileId,
      fighters: this.fighters.map((fighter) => fighter.snapshot()),
      projectiles: this.projectileList.map((projectile) => ({ ...projectile })),
      items: this.itemList.map((item) => ({ ...item })),
    };
  }

  restore(snapshot: MatchSnapshot): void {
    this.frame = snapshot.frame;
    this.introRemaining = snapshot.introRemaining;
    this.timeRemainingFrames = snapshot.timeRemainingFrames;
    this.elapsedFrames = snapshot.elapsedFrames;
    this.finished = snapshot.finished;
    this.winners = [...snapshot.winners];
    this.rng.setState(snapshot.rngState);
    this.hazardPhase = snapshot.hazardPhase;
    this.hazardWasActive = snapshot.hazardWasActive;
    this.itemSpawnTimer = snapshot.itemSpawnTimer;
    this.nextItemId = snapshot.nextItemId;
    this.nextProjectileId = snapshot.nextProjectileId;
    this.fighters.forEach((fighter, index) => {
      const saved = snapshot.fighters[index];
      if (saved) fighter.restore(saved);
    });
    this.projectileList.length = 0;
    this.projectileList.push(...snapshot.projectiles.map((projectile) => ({ ...projectile })));
    this.itemList.length = 0;
    this.itemList.push(...snapshot.items.map((item) => ({ ...item })));
  }

  stateHash(): string {
    return JSON.stringify(this.snapshot());
  }

  getProjectileOwnerName(projectile: ProjectileState): string {
    const owner = this.getFighter(projectile.owner);
    return owner?.definition.name ?? 'HAZARD';
  }
}

export type { MatchConfig, FighterState, FighterDefinition, ItemKind };
