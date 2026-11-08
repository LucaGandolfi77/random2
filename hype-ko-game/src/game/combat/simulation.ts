import {
  clamp,
  InputBit,
  isMeleeBehavior,
  moveTotalFrames,
  NEUTRAL_INPUT,
  type ActiveBuff,
  type CombatFighterDefinition,
  type ExplosionState,
  type FighterState,
  type FinisherRuntime,
  type HitboxDef,
  type InputState,
  type MatchConfig,
  type MatchPhase,
  type MoveDef,
  type ProjectileState,
  type SimEvent,
  type SimSnapshot,
  type ZoneState
} from './types';

export const FPS = 60;
export const STAGE_HALF_WIDTH = 11.5;
export const GRAVITY = 0.006;
export const JUMP_VELOCITY = 0.145;
const WALL_MARGIN = 0.55;
const PUSH_DISTANCE = 0.82;
const MAX_PROJECTILES = 32;

const STATE_PHASE_INDEX: Record<MatchPhase, number> = {
  intro: 0,
  fight: 1,
  roundEnd: 2,
  matchEnd: 3,
  finisher: 4
};

function makeFighter(
  def: CombatFighterDefinition,
  index: number,
  team: number,
  active: boolean
): FighterState {
  const maxHealth = Math.round(1000 * (0.9 + def.stats.defense * 0.04));
  return {
    index,
    charId: def.id,
    def,
    team,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: team === 0 ? 1 : -1,
    health: maxHealth,
    maxHealth,
    super: 0,
    hype: 0,
    state: 'intro',
    stateFrame: 0,
    moveId: null,
    move: null,
    moveFrame: 0,
    moveHitMask: 0,
    moveContact: false,
    lastHitFrames: [],
    hitsLanded: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    stun: 0,
    blocking: false,
    crouching: false,
    airborne: false,
    invuln: 0,
    armor: 0,
    parryBuffer: 0,
    tagCooldown: 0,
    buffs: [],
    cooldowns: {},
    inputBuffer: [],
    ko: false,
    active,
    roundsWon: 0,
    totalDamageDealt: 0,
    totalHits: 0,
    flash: 0,
    aura: 0,
    lastHitBy: -1,
    lastMoveName: '',
    walkDirection: 0,
    dummyMode: 'stand'
  };
}

function aabbOverlap(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

function hurtbox(f: FighterState): { x1: number; y1: number; x2: number; y2: number } {
  const h = f.def.height;
  if (f.state === 'knockdown' || f.state === 'ko') {
    return { x1: f.x - 0.62, y1: f.y, x2: f.x + 0.62, y2: f.y + 0.55 * h };
  }
  if (f.crouching || f.state === 'crouch') {
    return { x1: f.x - 0.44, y1: f.y, x2: f.x + 0.44, y2: f.y + 1.08 * h };
  }
  return { x1: f.x - 0.44, y1: f.y, x2: f.x + 0.44, y2: f.y + 1.86 * h };
}

function hitboxWorld(
  f: FighterState,
  box: HitboxDef
): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = f.facing === 1 ? f.x + box.x : f.x - box.x - box.w;
  return { x1, y1: f.y + box.y, x2: x1 + box.w, y2: f.y + box.y + box.h };
}

function syntheticProjectileMove(p: ProjectileState): MoveDef {
  return {
    id: `projectile_${p.id}`,
    name: 'Projectile',
    kind: 'special',
    startup: 0,
    active: 1,
    recovery: 0,
    damage: p.damage,
    chip: p.damage * 0.15,
    hitstun: p.hitstun,
    blockstun: p.blockstun,
    hitstop: p.hitstop,
    knockback: p.pull > 0 ? 2 : 3.2,
    hitboxes: [],
    unblockable: p.unblockable,
    pull: p.pull
  };
}

function syntheticZoneMove(zone: ZoneState): MoveDef {
  return {
    id: `zone_${zone.id}`,
    name: 'Zone',
    kind: 'special',
    startup: 0,
    active: 1,
    recovery: 0,
    damage: zone.tickDamage,
    chip: zone.tickDamage,
    hitstun: 10,
    blockstun: 6,
    hitstop: 2,
    knockback: 0.5,
    hitboxes: []
  };
}

function syntheticExplosionMove(explosion: ExplosionState): MoveDef {
  return {
    id: `explosion_${explosion.id}`,
    name: 'Explosion',
    kind: 'special',
    startup: 0,
    active: 1,
    recovery: 0,
    damage: explosion.damage,
    chip: explosion.damage * 0.2,
    hitstun: explosion.hitstun,
    blockstun: 10,
    hitstop: 8,
    knockback: 4,
    lift: 2,
    hitboxes: []
  };
}

export class MatchSim {
  readonly config: MatchConfig;
  fighters: FighterState[];
  projectiles: ProjectileState[] = [];
  zones: ZoneState[] = [];
  explosions: ExplosionState[] = [];
  events: SimEvent[] = [];
  frame = 0;
  round = 1;
  timerFrames: number;
  phase: MatchPhase = 'intro';
  introTimer = 90;
  roundEndTimer = 0;
  hitstop = 0;
  matchWinner: number | null = null;
  roundWinner: number | null = null;
  finisher: FinisherRuntime | null = null;
  pendingSwitches: { team: number; timer: number; x: number; from: number }[] = [];
  nextProjectileId = 1;
  nextZoneId = 1;
  nextExplosionId = 1;
  private roundEndReason: 'ko' | 'timeout' | 'draw' = 'ko';
  private announcedTen = false;

  constructor(config: MatchConfig) {
    this.config = config;
    this.timerFrames = config.roundTime * FPS;
    this.fighters = config.fighters.map((def, index) => {
      const team = config.teams.findIndex((t) => t.includes(index));
      const isActive = config.teams[team]?.[0] === index;
      return makeFighter(def, index, team < 0 ? index : team, isActive);
    });
    for (const f of this.fighters) {
      f.health = f.maxHealth;
      f.dummyMode = config.dummyMode ?? 'stand';
    }
    this.layoutFighters();
    this.phase = 'intro';
    this.introTimer = 90;
  }

  private layoutFighters(): void {
    const teams = this.config.teams;
    if (this.config.rumble) {
      const xs = [-6.6, -2.2, 2.2, 6.6];
      for (const f of this.fighters) {
        f.x = xs[f.index % xs.length];
        f.y = 0;
        f.vx = 0;
        f.vy = 0;
        f.airborne = false;
        f.active = true;
      }
      for (const f of this.fighters) {
        const target = this.nearestOpponent(f);
        if (target) f.facing = target.x >= f.x ? 1 : -1;
      }
      return;
    }
    const activeLeft = this.fighters.find((f) => f.team === 0 && f.active);
    const activeRight = this.fighters.find((f) => f.team === 1 && f.active);
    if (activeLeft) {
      activeLeft.x = -3.2;
      activeLeft.y = 0;
      activeLeft.facing = 1;
    }
    if (activeRight) {
      activeRight.x = 3.2;
      activeRight.y = 0;
      activeRight.facing = -1;
    }
    for (const f of this.fighters) {
      if (!f.active) {
        f.x = f.team === 0 ? -7.5 : 7.5;
        f.y = 0;
        f.facing = f.team === 0 ? 1 : -1;
      }
    }
    if (teams.length > 2) {
      let left = -5.5;
      let right = 5.5;
      for (const f of this.fighters) {
        if (!f.active) continue;
        if (f.team === 0) {
          f.x = left;
          left += 1.2;
        } else {
          f.x = right;
          right -= 1.2;
        }
      }
    }
  }

  getActiveFighters(): FighterState[] {
    return this.fighters.filter((f) => f.active && !f.ko);
  }

  getTeamHealth(team: number): number {
    return this.config.teams[team].reduce((sum, index) => sum + Math.max(0, this.fighters[index].health), 0);
  }

  getTeamMaxHealth(team: number): number {
    return this.config.teams[team].reduce((sum, index) => sum + this.fighters[index].maxHealth, 0);
  }

  nearestOpponent(f: FighterState): FighterState | undefined {
    let best: FighterState | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const other of this.fighters) {
      if (other.index === f.index || other.ko || !other.active) continue;
      if (other.team === f.team) continue;
      const dist = Math.abs(other.x - f.x);
      if (dist < bestDist) {
        bestDist = dist;
        best = other;
      }
    }
    return best;
  }

  private opponentsOf(f: FighterState): FighterState[] {
    return this.fighters.filter(
      (other) => other.index !== f.index && other.team !== f.team && other.active && !other.ko
    );
  }

  private addBuff(f: FighterState, buff: ActiveBuff): void {
    const existing = f.buffs.find((b) => b.id === buff.id);
    if (existing) {
      existing.frames = Math.max(existing.frames, buff.frames);
    } else {
      f.buffs.push(buff);
    }
    if (buff.armor) f.armor = Math.max(f.armor, 1);
    if (buff.damage > 1 || buff.speed > 1) f.aura = Math.max(f.aura, buff.frames);
  }

  private damageBuff(f: FighterState): number {
    let mult = 1;
    for (const b of f.buffs) mult *= b.damage;
    return mult;
  }

  private speedBuff(f: FighterState): number {
    let mult = 1;
    for (const b of f.buffs) mult *= b.speed;
    return mult;
  }

  private defenseBuff(f: FighterState): number {
    let mult = 1;
    for (const b of f.buffs) mult *= b.defense;
    return mult;
  }

  step(inputs: InputState[]): SimEvent[] {
    this.events = [];
    this.frame++;

    if (this.phase === 'intro') {
      this.introTimer--;
      if (this.introTimer <= 0) {
        this.phase = 'fight';
        for (const f of this.fighters) {
          if (f.active && !f.ko) {
            f.state = 'idle';
            f.stateFrame = 0;
          }
        }
        this.events.push({ type: 'roundStart', round: this.round });
      }
      return this.events;
    }

    if (this.phase === 'finisher') {
      this.updateFinisher();
      return this.events;
    }

    if (this.phase === 'roundEnd') {
      this.roundEndTimer--;
      if (this.roundEndTimer <= 0) this.advanceAfterRound();
      return this.events;
    }

    if (this.phase === 'matchEnd') {
      return this.events;
    }

    if (this.hitstop > 0) {
      this.hitstop--;
      return this.events;
    }

    this.timerFrames--;
    if (this.timerFrames === 600 && !this.announcedTen) {
      this.announcedTen = true;
      this.events.push({ type: 'announce', text: '10 SECONDS' });
    }
    if (this.timerFrames <= 0) {
      this.events.push({ type: 'timeout' });
      this.onTimeout();
      return this.events;
    }

    for (const pending of this.pendingSwitches) {
      pending.timer--;
      if (pending.timer <= 0) {
        this.activateReserve(pending.team, pending.x, pending.from);
        pending.timer = 1;
      }
    }
    this.pendingSwitches = this.pendingSwitches.filter((p) => p.timer > 0);

    for (const f of this.fighters) {
      if (f.active && !f.ko) {
        this.updateFighter(f, inputs[f.index] ?? NEUTRAL_INPUT);
      }
    }

    this.updateProjectiles();
    this.updateZones();
    this.updateExplosions();
    this.resolveMeleeHits();
    this.separateFighters();
    this.updateComboTimers();
    this.checkEliminations();

    return this.events;
  }

  private updateFighter(f: FighterState, input: InputState): void {
    f.stateFrame++;
    if (f.invuln > 0) f.invuln--;
    if (f.parryBuffer > 0) f.parryBuffer--;
    if (f.tagCooldown > 0) f.tagCooldown--;
    if (f.aura > 0) f.aura--;
    if (f.flash > 0) f.flash--;
    f.buffs = f.buffs.filter((b) => {
      b.frames--;
      return b.frames > 0;
    });
    if (f.armor > 0 && !f.buffs.some((b) => b.armor)) f.armor = 0;

    if (input.pressed) {
      f.inputBuffer.push({ mask: input.pressed, frame: this.frame });
    }
    f.inputBuffer = f.inputBuffer.filter((b) => this.frame - b.frame <= 8);

    if (this.config.infiniteMeter) {
      f.super = 100;
      f.hype = 100;
    }

    if (f.airborne) {
      f.y += f.vy;
      f.vy -= GRAVITY;
      f.x += f.vx;
      f.vx *= 0.985;
      f.x = clamp(f.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
      if (f.y <= 0) {
        f.y = 0;
        f.vy = 0;
        f.airborne = false;
        this.onLand(f);
      }
    } else if (Math.abs(f.vx) > 0.0001) {
      f.x += f.vx;
      f.vx *= 0.86;
      if (Math.abs(f.vx) < 0.002) f.vx = 0;
      const before = f.x;
      f.x = clamp(f.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
      if (before !== f.x && Math.abs(f.vx) > 0.03) {
        this.events.push({ type: 'wall', fighter: f.index, x: f.x });
      }
    }

    if (f.state === 'hitstun') {
      f.stun--;
      if (f.stun <= 0 && !f.airborne) {
        f.state = 'idle';
        f.stateFrame = 0;
      }
      return;
    }
    if (f.state === 'blockstun') {
      f.stun--;
      if (f.stun <= 0) {
        f.state = input.held & InputBit.Block ? 'block' : 'idle';
        f.blocking = Boolean(input.held & InputBit.Block);
        f.stateFrame = 0;
      }
      return;
    }
    if (f.state === 'knockdown') {
      if (f.stateFrame >= 38) {
        f.state = 'wakeup';
        f.stateFrame = 0;
        f.invuln = Math.max(f.invuln, 24);
      }
      return;
    }
    if (f.state === 'wakeup') {
      if (f.stateFrame >= 20) {
        f.state = 'idle';
        f.stateFrame = 0;
      }
      return;
    }
    if (f.state === 'stunned') {
      f.stun--;
      if (f.stun <= 0) {
        f.state = 'idle';
        f.stateFrame = 0;
      }
      return;
    }
    if (f.state === 'tagIn') {
      if (f.stateFrame >= 18) {
        f.state = 'idle';
        f.stateFrame = 0;
      }
      return;
    }
    if (f.state === 'tagOut') {
      return;
    }
    if (f.state === 'ko' || f.state === 'victory' || f.state === 'defeat' || f.state === 'intro') {
      return;
    }

    if (f.state === 'attack') {
      if (this.tryCancel(f, input)) return;
      this.advanceAttack(f);
      return;
    }

    if (f.state === 'block') {
      if (!(input.held & InputBit.Block)) {
        f.state = 'idle';
        f.blocking = false;
        f.stateFrame = 0;
      }
      return;
    }

    if (f.state === 'jump') {
      this.airControl(f, input);
      if (this.consume(f, InputBit.LightPunch)) {
        this.startMove(f, 'airPunch');
      } else if (this.consume(f, InputBit.LightKick)) {
        this.startMove(f, 'airKick');
      }
      return;
    }

    this.handleFree(f, input);
  }

  private onLand(f: FighterState): void {
    if (f.state === 'hitstun') {
      f.state = 'knockdown';
      f.stateFrame = 0;
      f.stun = 0;
      return;
    }
    if (f.state === 'attack' && f.move?.requiresAir) {
      f.state = 'idle';
      f.move = null;
      f.moveId = null;
      f.moveFrame = 0;
      f.stateFrame = 0;
      return;
    }
    if (f.state === 'jump') {
      f.state = 'idle';
      f.stateFrame = 0;
      return;
    }
    if (f.state === 'ko') return;
  }

  private airControl(f: FighterState, input: InputState): void {
    const speed = (2.7 + f.def.stats.speed * 0.32) / FPS;
    let dir = 0;
    if (input.held & InputBit.Left) dir--;
    if (input.held & InputBit.Right) dir++;
    if (dir !== 0) f.x += dir * speed * 0.45;
    f.x = clamp(f.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
  }

  private handleFree(f: FighterState, input: InputState): void {
    const target = this.nearestOpponent(f);
    if (target) f.facing = target.x >= f.x ? 1 : -1;
    f.walkDirection = 0;

    if (input.held & InputBit.Block) {
      f.state = 'block';
      f.stateFrame = 0;
      f.blocking = true;
      f.crouching = false;
      if (input.pressed & InputBit.Block) f.parryBuffer = 6;
      return;
    }
    f.blocking = false;

    if (input.pressed & InputBit.Up) {
      f.vy = JUMP_VELOCITY;
      f.airborne = true;
      f.state = 'jump';
      f.stateFrame = 0;
      return;
    }

    if (this.consume(f, InputBit.Finisher) && this.canFinish(f, target)) {
      this.startFinisher(f, target!);
      return;
    }

    if (f.hype >= 100 && this.consume(f, InputBit.Hype)) {
      const moveId = f.def.hypeBreaker;
      if (this.startMove(f, moveId)) {
        f.hype = Math.max(0, f.hype - 100);
        this.events.push({ type: 'hype', fighter: f.index });
        return;
      }
    }

    if (f.super >= 100 && this.consume(f, InputBit.Super)) {
      const moveId = f.def.superMove;
      if (this.startMove(f, moveId)) {
        f.super = Math.max(0, f.super - 100);
        this.events.push({ type: 'super', fighter: f.index, move: moveId });
        return;
      }
    }

    if (this.consume(f, InputBit.Special1)) {
      if (this.startMove(f, f.def.specials.s1)) return;
    }
    if (this.consume(f, InputBit.Special2)) {
      if (this.startMove(f, f.def.specials.s2)) return;
    }
    if (this.consume(f, InputBit.Grab)) {
      if (this.startMove(f, 'throw')) return;
    }
    if (this.consume(f, InputBit.Tag)) {
      if (this.tryTag(f)) return;
    }

    if (this.consume(f, InputBit.LightPunch)) {
      const forward = f.facing === 1 ? InputBit.Right : InputBit.Left;
      const moveId = input.held & InputBit.Down
        ? 'crouchPunch'
        : input.held & forward
          ? 'heavyPunch'
          : 'lightPunch';
      if (this.startMove(f, moveId)) return;
    }
    if (this.consume(f, InputBit.LightKick)) {
      const forward = f.facing === 1 ? InputBit.Right : InputBit.Left;
      const moveId = input.held & InputBit.Down
        ? 'crouchKick'
        : input.held & forward
          ? 'heavyKick'
          : 'lightKick';
      if (this.startMove(f, moveId)) return;
    }

    if (input.held & InputBit.Down) {
      f.state = 'crouch';
      f.stateFrame = 0;
      f.crouching = true;
      f.vx = 0;
      return;
    }

    f.crouching = false;
    let dir = 0;
    if (input.held & InputBit.Left) dir--;
    if (input.held & InputBit.Right) dir++;
    if (dir !== 0) {
      const speed = ((2.7 + f.def.stats.speed * 0.32) / FPS) * this.speedBuff(f);
      f.x += dir * speed;
      f.x = clamp(f.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
      f.state = 'walk';
      f.stateFrame = 0;
      f.walkDirection = dir;
    } else {
      f.state = 'idle';
      f.stateFrame = 0;
    }
  }

  private consume(f: FighterState, bit: number): boolean {
    let found = false;
    for (const entry of f.inputBuffer) {
      if (entry.mask & bit) {
        found = true;
        entry.mask &= ~bit;
      }
    }
    return found;
  }

  private peek(f: FighterState, bit: number): boolean {
    return f.inputBuffer.some((entry) => entry.mask & bit);
  }

  private startMove(f: FighterState, moveId: string): boolean {
    const move = f.def.moves[moveId];
    if (!move) return false;
    if (move.isFinisher) return false;
    if (f.airborne && !move.requiresAir) return false;
    if (!f.airborne && move.requiresAir) return false;
    if (move.requiresGround && f.airborne) return false;
    if (move.superCost && f.super < move.superCost) return false;
    if (move.hypeCost && f.hype < move.hypeCost) return false;
    if (f.state === 'attack' && f.move) {
      // cancel path
    }
    f.state = 'attack';
    f.stateFrame = 0;
    f.moveId = moveId;
    f.move = move;
    f.moveFrame = 0;
    f.moveHitMask = 0;
    f.moveContact = false;
    f.lastHitFrames = [];
    f.hitsLanded = 0;
    f.blocking = false;
    f.crouching = false;
    f.stun = 0;
    if (move.invuln) f.invuln = Math.max(f.invuln, move.invuln[1]);
    if (move.kind === 'special') {
      this.events.push({ type: 'special', fighter: f.index, move: moveId });
    }
    return true;
  }

  private tryCancel(f: FighterState, input: InputState): boolean {
    const current = f.move;
    if (!current || !current.cancelInto || !current.cancelWindow) return false;
    if (!f.moveContact) return false;
    if (f.moveFrame < current.cancelWindow[0] || f.moveFrame > current.cancelWindow[1]) return false;

    if (this.peek(f, InputBit.Super) && f.super >= 100) {
      if (current.cancelInto.includes('super')) {
        this.consume(f, InputBit.Super);
        if (this.startMove(f, f.def.superMove)) {
          f.super = Math.max(0, f.super - 100);
          this.events.push({ type: 'super', fighter: f.index, move: f.def.superMove });
          return true;
        }
      }
    }
    if (this.peek(f, InputBit.Special1)) {
      if (current.cancelInto.includes('special')) {
        this.consume(f, InputBit.Special1);
        if (this.startMove(f, f.def.specials.s1)) return true;
      }
    }
    if (this.peek(f, InputBit.Special2)) {
      if (current.cancelInto.includes('special')) {
        this.consume(f, InputBit.Special2);
        if (this.startMove(f, f.def.specials.s2)) return true;
      }
    }
    if (this.peek(f, InputBit.LightPunch)) {
      const forward = f.facing === 1 ? InputBit.Right : InputBit.Left;
      const heavy = Boolean(input.held & forward);
      const kind = heavy ? 'heavy' : 'light';
      if (current.cancelInto.includes(kind)) {
        this.consume(f, InputBit.LightPunch);
        if (this.startMove(f, heavy ? 'heavyPunch' : 'lightPunch')) return true;
      }
    }
    if (this.peek(f, InputBit.LightKick)) {
      const forward = f.facing === 1 ? InputBit.Right : InputBit.Left;
      const heavy = Boolean(input.held & forward);
      const kind = heavy ? 'heavy' : 'light';
      if (current.cancelInto.includes(kind)) {
        this.consume(f, InputBit.LightKick);
        if (this.startMove(f, heavy ? 'heavyKick' : 'lightKick')) return true;
      }
    }
    return false;
  }

  private advanceAttack(f: FighterState): void {
    const move = f.move;
    if (!move) {
      f.state = 'idle';
      return;
    }
    f.moveFrame++;

    if (move.movement) {
      const at = move.movement.atFrame ?? 0;
      const duration = move.movement.duration ?? 1;
      if (f.moveFrame >= at && f.moveFrame < at + duration) {
        const amount = (move.movement.x ?? 0) / duration;
        f.x += f.facing * amount;
        f.x = clamp(f.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
      }
      if (move.movement.y) {
        f.y += move.movement.y / duration;
      }
    }

    if (move.behavior && move.behavior.spawnFrame === f.moveFrame) {
      this.triggerBehavior(f, move);
    }

    if (f.moveFrame > moveTotalFrames(move)) {
      f.move = null;
      f.moveId = null;
      f.moveFrame = 0;
      f.state = f.airborne ? 'jump' : 'idle';
      f.stateFrame = 0;
    }
  }

  private triggerBehavior(f: FighterState, move: MoveDef): void {
    const behavior = move.behavior;
    if (!behavior) return;
    const target = this.nearestOpponent(f);

    switch (behavior.type) {
      case 'projectile': {
        if (behavior.projectile) this.spawnProjectile(f, behavior.projectile, target);
        break;
      }
      case 'piano': {
        if (behavior.projectile) this.spawnPiano(f, behavior.projectile, target);
        break;
      }
      case 'rain': {
        if (behavior.projectile && behavior.rain) {
          const count = behavior.rain.count;
          for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * behavior.rain.spread;
            this.spawnRain(f, behavior.projectile, offset, i * behavior.rain.delay);
          }
        }
        break;
      }
      case 'shockwave': {
        const radius = behavior.radius ?? 2.5;
        for (const opponent of this.opponentsOf(f)) {
          if (Math.abs(opponent.x - f.x) <= radius) {
            this.applyHit(f, opponent, move, { x: opponent.x, y: opponent.y + 0.7 });
          }
        }
        this.events.push({
          type: 'explosion',
          owner: f.index,
          x: f.x,
          y: 0.1,
          vfx: 'shockwave',
          color: f.def.moves[move.id]?.vfx ?? 'shockwave'
        });
        break;
      }
      case 'flash': {
        const radius = behavior.radius ?? 4;
        for (const opponent of this.opponentsOf(f)) {
          if (Math.abs(opponent.x - f.x) <= radius) {
            this.applyStun(opponent, behavior.stun ?? 30, f);
          }
        }
        this.events.push({
          type: 'explosion',
          owner: f.index,
          x: f.x,
          y: 1.2,
          vfx: 'flash',
          color: '#ffffff'
        });
        break;
      }
      case 'teleport': {
        if (target) {
          const behind = behavior.behind ?? false;
          f.x = behind ? target.x + target.facing * 1.0 : target.x - target.facing * 1.0;
          f.x = clamp(f.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
          f.facing = target.x >= f.x ? 1 : -1;
          this.events.push({
            type: 'special',
            fighter: f.index,
            move: move.id
          });
        }
        break;
      }
      case 'buff': {
        if (behavior.buff) {
          this.addBuff(f, {
            id: move.id,
            damage: behavior.buff.damage ?? 1,
            speed: behavior.buff.speed ?? 1,
            defense: behavior.buff.defense ?? 1,
            armor: behavior.buff.armor ?? false,
            frames: behavior.buff.duration
          });
          if (behavior.buff.heal) {
            f.health = Math.min(f.maxHealth, f.health + behavior.buff.heal);
          }
          this.events.push({ type: 'buff', fighter: f.index, buff: move.id });
        }
        break;
      }
      case 'zone': {
        if (behavior.zone) {
          const zone: ZoneState = {
            id: this.nextZoneId++,
            owner: f.index,
            team: f.team,
            x: clamp(f.x + f.facing * 2.6, -STAGE_HALF_WIDTH + 1, STAGE_HALF_WIDTH - 1),
            radius: behavior.zone.radius,
            life: behavior.zone.duration,
            tickDamage: behavior.zone.tickDamage,
            interval: behavior.zone.interval,
            tickTimer: 0,
            pull: behavior.zone.pull ?? 0,
            vfx: behavior.zone.vfx,
            color: behavior.zone.color
          };
          this.zones.push(zone);
          this.events.push({
            type: 'zone',
            owner: f.index,
            x: zone.x,
            vfx: zone.vfx,
            color: zone.color
          });
        }
        break;
      }
      case 'explosion': {
        if (behavior.explosion) {
          const ex = behavior.explosion;
          const x = ex.atOpponent && target
            ? target.x
            : clamp(f.x + f.facing * 1.6, -STAGE_HALF_WIDTH + 1, STAGE_HALF_WIDTH - 1);
          this.explosions.push({
            id: this.nextExplosionId++,
            owner: f.index,
            team: f.team,
            x,
            y: 0,
            radius: ex.radius,
            damage: ex.damage,
            hitstun: ex.hitstun ?? 22,
            delay: ex.delay,
            vfx: move.vfx ?? 'explosion',
            color: '#ff4d6d'
          });
          this.events.push({
            type: 'explosion',
            owner: f.index,
            x,
            y: 0,
            vfx: 'warning',
            color: '#ff4d6d'
          });
        }
        break;
      }
      default:
        break;
    }
  }

  private spawnProjectile(
    f: FighterState,
    spec: NonNullable<MoveDef['behavior']>['projectile'],
    target?: FighterState
  ): void {
    if (!spec) return;
    if (this.projectiles.length >= MAX_PROJECTILES) return;
    const count = spec.count ?? 1;
    for (let i = 0; i < count; i++) {
      const spread = spec.spread ?? 0;
      const offset = (i - (count - 1) / 2) * spread;
      const y = f.y + 1.05 + offset * 0.1;
      const p: ProjectileState = {
        id: this.nextProjectileId++,
        owner: f.index,
        team: f.team,
        x: f.x + f.facing * 0.85,
        y,
        vx: f.facing * spec.speed,
        vy: spec.vy ?? 0,
        gravity: spec.gravity ?? 0,
        radius: spec.radius,
        damage: spec.damage,
        hitstun: spec.hitstun,
        blockstun: spec.blockstun,
        hitstop: spec.hitstop,
        life: spec.life,
        returning: spec.returning ?? false,
        fromSky: spec.fromSky ?? false,
        pierce: spec.pierce ?? false,
        pull: spec.pull ?? 0,
        unblockable: spec.unblockable ?? false,
        vfx: spec.vfx,
        color: spec.color,
        hitMask: 0
      };
      if (spec.fromSky && target) {
        p.x = target.x + offset;
        p.y = 4.6 + i * 0.15;
        p.vx = 0;
        p.vy = -0.03;
        p.gravity = 0.007;
      }
      this.projectiles.push(p);
      this.events.push({
        type: 'projectile',
        owner: f.index,
        x: p.x,
        y: p.y,
        vfx: p.vfx,
        color: p.color
      });
    }
  }

  private spawnPiano(
    f: FighterState,
    spec: NonNullable<MoveDef['behavior']>['projectile'],
    target?: FighterState
  ): void {
    if (!spec) return;
    if (this.projectiles.length >= MAX_PROJECTILES) return;
    const x = target ? target.x : f.x + f.facing * 3;
    const p: ProjectileState = {
      id: this.nextProjectileId++,
      owner: f.index,
      team: f.team,
      x,
      y: 4.8,
      vx: 0,
      vy: -0.02,
      gravity: 0.008,
      radius: spec.radius,
      damage: spec.damage,
      hitstun: spec.hitstun,
      blockstun: spec.blockstun,
      hitstop: spec.hitstop,
      life: 180,
      returning: false,
      fromSky: true,
      pierce: false,
      pull: 0,
      unblockable: false,
      vfx: 'piano',
      color: spec.color,
      hitMask: 0
    };
    this.projectiles.push(p);
    this.events.push({
      type: 'projectile',
      owner: f.index,
      x: p.x,
      y: p.y,
      vfx: 'piano',
      color: p.color
    });
  }

  private spawnRain(
    f: FighterState,
    spec: NonNullable<MoveDef['behavior']>['projectile'],
    offset: number,
    delay: number
  ): void {
    if (!spec) return;
    if (this.projectiles.length >= MAX_PROJECTILES) return;
    const p: ProjectileState = {
      id: this.nextProjectileId++,
      owner: f.index,
      team: f.team,
      x: f.x + f.facing * 3.2 + offset,
      y: 4.8 + delay * 0.02,
      vx: 0,
      vy: -0.025,
      gravity: 0.008,
      radius: spec.radius,
      damage: spec.damage,
      hitstun: spec.hitstun,
      blockstun: spec.blockstun,
      hitstop: spec.hitstop,
      life: 240,
      returning: false,
      fromSky: true,
      pierce: false,
      pull: 0,
      unblockable: false,
      vfx: spec.vfx,
      color: spec.color,
      hitMask: 0
    };
    this.projectiles.push(p);
    this.events.push({
      type: 'projectile',
      owner: f.index,
      x: p.x,
      y: p.y,
      vfx: p.vfx,
      color: p.color
    });
  }

  private updateProjectiles(): void {
    for (const p of this.projectiles) {
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= p.gravity;
      if (p.returning) {
        if (p.life < 60) {
          const owner = this.fighters[p.owner];
          p.vx = owner ? Math.sign(owner.x - p.x) * Math.abs(p.vx) : -p.vx;
        }
      }
      if (p.y < 0.1 && p.gravity > 0) {
        p.y = 0.1;
        p.vy = 0;
        p.vx *= 0.9;
      }
      for (const target of this.fighters) {
        if (!target.active || target.ko || target.team === p.team) continue;
        if (p.hitMask & (1 << target.index)) continue;
        const box = { x1: p.x - p.radius, y1: p.y - p.radius, x2: p.x + p.radius, y2: p.y + p.radius };
        if (aabbOverlap(box, hurtbox(target))) {
          const owner = this.fighters[p.owner];
          if (!owner) continue;
          const hit = this.applyHit(owner, target, syntheticProjectileMove(p), {
            x: p.x,
            y: p.y
          });
          if (hit) {
            p.hitMask |= 1 << target.index;
            if (!p.pierce) {
              p.life = 0;
              break;
            }
          }
        }
      }
      if (p.x < -STAGE_HALF_WIDTH - 4 || p.x > STAGE_HALF_WIDTH + 4) p.life = 0;
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
  }

  private updateZones(): void {
    for (const zone of this.zones) {
      zone.life--;
      zone.tickTimer--;
      if (zone.tickTimer <= 0) {
        zone.tickTimer = zone.interval;
        for (const target of this.fighters) {
          if (!target.active || target.ko || target.team === zone.team) continue;
          if (Math.abs(target.x - zone.x) <= zone.radius) {
            const owner = this.fighters[zone.owner];
            if (owner) {
              this.applyHit(owner, target, syntheticZoneMove(zone), {
                x: target.x,
                y: target.y + 0.8
              });
              if (zone.pull > 0) {
                target.x += Math.sign(zone.x - target.x) * 0.04;
              }
            }
          }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  private updateExplosions(): void {
    for (const explosion of this.explosions) {
      explosion.delay--;
      if (explosion.delay <= 0) {
        this.events.push({
          type: 'explosion',
          owner: explosion.owner,
          x: explosion.x,
          y: explosion.y,
          vfx: explosion.vfx,
          color: explosion.color
        });
        for (const target of this.fighters) {
          if (!target.active || target.ko || target.team === explosion.team) continue;
          if (Math.abs(target.x - explosion.x) <= explosion.radius) {
            const owner = this.fighters[explosion.owner];
            if (owner) {
              this.applyHit(owner, target, syntheticExplosionMove(explosion), {
                x: target.x,
                y: target.y + 0.8
              });
            }
          }
        }
        explosion.delay = 999999;
      }
    }
    this.explosions = this.explosions.filter((e) => e.delay < 999999);
  }

  private resolveMeleeHits(): void {
    for (const attacker of this.fighters) {
      if (!attacker.active || attacker.ko || attacker.state !== 'attack') continue;
      const move = attacker.move;
      if (!move || !isMeleeBehavior(move.behavior?.type)) continue;
      for (const box of move.hitboxes) {
        if (attacker.moveFrame < box.from || attacker.moveFrame > box.to) continue;
        const world = hitboxWorld(attacker, box);
        for (const target of this.fighters) {
          if (!target.active || target.ko || target.team === attacker.team) continue;
          if (!this.canHit(attacker, target, move)) continue;
          if (aabbOverlap(world, hurtbox(target))) {
            const hit = this.applyHit(attacker, target, move, {
              x: (world.x1 + world.x2) / 2,
              y: (world.y1 + world.y2) / 2
            });
            if (hit) {
              this.markHit(attacker, target, move);
              if (move.pull && move.pull > 0) {
                target.x += Math.sign(attacker.x - target.x) * move.pull * 0.12;
                target.x = clamp(
                  target.x,
                  -STAGE_HALF_WIDTH + WALL_MARGIN,
                  STAGE_HALF_WIDTH - WALL_MARGIN
                );
              }
              if (move.stun) this.applyStun(target, move.stun, attacker);
              if (move.behavior?.type === 'commandGrab') {
                target.state = 'knockdown';
                target.stateFrame = 0;
                target.airborne = false;
                target.y = 0;
              }
            }
          }
        }
      }
    }
  }

  private canHit(attacker: FighterState, target: FighterState, move: MoveDef): boolean {
    if (move.hits && move.hits > 1 && move.hitInterval) {
      const last = attacker.lastHitFrames[target.index] ?? -999;
      return attacker.moveFrame - last >= move.hitInterval;
    }
    return (attacker.moveHitMask & (1 << target.index)) === 0;
  }

  private markHit(attacker: FighterState, target: FighterState, move: MoveDef): void {
    if (move.hits && move.hits > 1 && move.hitInterval) {
      attacker.lastHitFrames[target.index] = attacker.moveFrame;
    } else {
      attacker.moveHitMask |= 1 << target.index;
    }
  }

  private applyStun(target: FighterState, frames: number, attacker: FighterState): void {
    if (target.ko || target.invuln > 0) return;
    target.state = 'stunned';
    target.stateFrame = 0;
    target.stun = frames;
    target.vx = Math.sign(target.x - attacker.x || 1) * 0.03;
    this.events.push({ type: 'stun', fighter: target.index });
  }

  private applyHit(
    attacker: FighterState,
    defender: FighterState,
    move: MoveDef,
    pos: { x: number; y: number }
  ): boolean {
    if (defender.ko || !defender.active || defender.invuln > 0) return false;

    // Counter stance
    if (
      defender.state === 'attack' &&
      defender.move?.behavior?.type === 'counter' &&
      defender.moveFrame >= 1 &&
      defender.moveFrame <= (defender.move.behavior.counterWindow ?? 0)
    ) {
      const counterDamage = defender.move.behavior.counterDamage ?? 50;
      attacker.health -= counterDamage;
      attacker.state = 'stunned';
      attacker.stateFrame = 0;
      attacker.stun = defender.move.behavior.counterHitstun ?? 24;
      attacker.move = null;
      attacker.moveId = null;
      defender.move = null;
      defender.moveId = null;
      defender.state = 'idle';
      defender.hype = Math.min(100, defender.hype + 18);
      defender.super = Math.min(100, defender.super + 8);
      defender.moveContact = true;
      this.hitstop = Math.max(this.hitstop, 10);
      this.events.push({
        type: 'counter',
        attacker: attacker.index,
        defender: defender.index,
        x: defender.x,
        y: defender.y + 1
      });
      if (attacker.health <= 0) this.handleKO(attacker, defender);
      return true;
    }

    const canBlock =
      defender.blocking && !defender.airborne && !move.unblockable && defender.state !== 'attack';

    if (canBlock) {
      if (defender.parryBuffer > 0 && !move.unblockable) {
        defender.parryBuffer = 0;
        defender.hype = Math.min(100, defender.hype + 12);
        defender.super = Math.min(100, defender.super + 5);
        attacker.state = 'stunned';
        attacker.stateFrame = 0;
        attacker.stun = 20;
        attacker.move = null;
        attacker.moveId = null;
        this.hitstop = Math.max(this.hitstop, 9);
        this.events.push({
          type: 'parry',
          attacker: attacker.index,
          defender: defender.index,
          x: defender.x,
          y: defender.y + 1
        });
        return true;
      }
      const chip = move.kind === 'light' || move.kind === 'heavy'
        ? 0
        : Math.max(1, Math.round((move.chip ?? move.damage * 0.12) * this.defenseBuff(defender)));
      if (!this.config.infiniteHealth) {
        defender.health -= chip;
      }
      defender.state = 'blockstun';
      defender.stateFrame = 0;
      defender.stun = move.blockstun;
      defender.blocking = true;
      defender.vx = Math.sign(defender.x - attacker.x || 1) * move.knockback * 0.012;
      attacker.super = Math.min(100, attacker.super + (move.meterGainBlock ?? 1) + 0.5);
      defender.super = Math.min(100, defender.super + 1.5);
      defender.hype = Math.min(100, defender.hype + 2);
      attacker.moveContact = true;
      this.hitstop = Math.max(this.hitstop, 3);
      this.events.push({
        type: 'block',
        attacker: attacker.index,
        defender: defender.index,
        move: move.name,
        x: defender.x,
        y: defender.y + 1
      });
      if (defender.health <= 0 && !this.config.infiniteHealth) this.handleKO(defender, attacker);
      return true;
    }

    if (defender.armor > 0 && move.kind !== 'throw' && move.kind !== 'super' && move.kind !== 'finisher') {
      defender.armor--;
      const armorDamage = Math.round(
        move.damage * 0.5 * this.defenseBuff(defender) * this.damageBuff(attacker)
      );
      if (!this.config.infiniteHealth) defender.health -= armorDamage;
      defender.health = Math.max(0, defender.health);
      this.hitstop = Math.max(this.hitstop, 4);
      this.events.push({
        type: 'hit',
        attacker: attacker.index,
        defender: defender.index,
        move: move.name,
        damage: armorDamage,
        blocked: false,
        counter: false,
        heavy: false,
        x: pos.x,
        y: pos.y
      });
      attacker.moveContact = true;
      if (defender.health <= 0) this.handleKO(defender, attacker);
      return true;
    }

    const wasStunned =
      defender.state === 'hitstun' ||
      defender.state === 'knockdown' ||
      (defender.airborne && defender.stun > 0);
    attacker.combo = wasStunned ? attacker.combo + 1 : 1;
    attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo);
    attacker.comboTimer = 70;

    const power = 0.85 + attacker.def.stats.power * 0.05;
    const defense = (1.1 - defender.def.stats.defense * 0.04) * this.defenseBuff(defender);
    const scale = Math.max(0.35, 1 - (attacker.combo - 1) * 0.07);
    let damage = move.damage * power * defense * scale * this.damageBuff(attacker);
    if (this.config.mode === 'training' && defender.dummyMode === 'counter') {
      damage *= 1.2;
    }
    damage = Math.max(1, Math.round(damage));

    if (!this.config.infiniteHealth) {
      defender.health -= damage;
    }
    defender.lastHitBy = attacker.index;
    defender.lastMoveName = move.name;
    defender.blocking = false;
    defender.crouching = false;
    defender.stun = move.hitstun;
    defender.flash = 6;
    attacker.moveContact = true;

    if (move.knockdown) {
      defender.state = 'knockdown';
      defender.stateFrame = 0;
    } else {
      defender.state = 'hitstun';
      defender.stateFrame = 0;
    }

    if (move.lift && move.lift > 0) {
      defender.airborne = true;
      defender.vy = move.lift * 0.022;
    }
    defender.vx =
      Math.sign(defender.x - attacker.x || attacker.facing) *
      (move.knockback * 0.045) /
      Math.max(0.7, defender.def.weight);

    const tech = 0.9 + attacker.def.stats.technique * 0.04;
    attacker.super = Math.min(
      100,
      attacker.super + (move.meterGainHit ?? 4) + damage * 0.02 * tech
    );
    attacker.hype = Math.min(
      100,
      attacker.hype + (move.hypeGainHit ?? 3) + damage * 0.04 * tech
    );
    defender.super = Math.min(100, defender.super + damage * 0.015 + 1);
    defender.hype = Math.min(100, defender.hype + damage * 0.025 + 1);
    attacker.totalDamageDealt += damage;
    attacker.totalHits++;
    attacker.hitsLanded++;

    this.hitstop = Math.max(this.hitstop, move.hitstop + (move.kind === 'heavy' ? 1 : 0));

    this.events.push({
      type: 'hit',
      attacker: attacker.index,
      defender: defender.index,
      move: move.name,
      damage,
      blocked: false,
      counter: false,
      heavy: move.kind === 'heavy' || move.kind === 'special' || move.kind === 'super',
      x: pos.x,
      y: pos.y
    });

    if (attacker.combo === 3 || attacker.combo === 5 || attacker.combo === 10 || attacker.combo === 15) {
      this.events.push({ type: 'combo', fighter: attacker.index, count: attacker.combo });
    }

    if (defender.health <= 0 && !this.config.infiniteHealth) {
      this.handleKO(defender, attacker);
    }

    return true;
  }

  private handleKO(defender: FighterState, attacker: FighterState): void {
    defender.health = 0;
    defender.ko = true;
    defender.state = 'ko';
    defender.stateFrame = 0;
    defender.stun = 0;
    defender.vx = Math.sign(defender.x - attacker.x || attacker.facing) * 0.06;
    defender.vy = 0.02;
    defender.airborne = true;
    defender.blocking = false;

    this.events.push({ type: 'ko', loser: defender.index, winner: attacker.index });
    this.events.push({ type: 'announce', text: 'K.O.' });

    if (this.config.rumble) {
      this.checkEliminations();
      return;
    }

    if (this.config.teamSize > 1) {
      defender.active = false;
      const teamMembers = this.config.teams[defender.team];
      const hasReserve = teamMembers.some((index) => !this.fighters[index].ko);
      if (hasReserve) {
        this.pendingSwitches.push({
          team: defender.team,
          timer: 55,
          x: defender.x,
          from: defender.index
        });
      }
      this.checkEliminations();
      return;
    }

    defender.active = false;
    this.roundWinner = attacker.index;
    attacker.roundsWon++;
    attacker.state = 'victory';
    attacker.stateFrame = 0;
    attacker.move = null;
    attacker.moveId = null;
    this.phase = 'roundEnd';
    this.roundEndTimer = 165;
    this.roundEndReason = 'ko';
  }

  private checkEliminations(): void {
    if (this.phase !== 'fight') return;
    if (this.config.rumble) {
      const alive = this.fighters.filter((f) => !f.ko);
      if (alive.length <= 1) {
        this.endMatch(alive.length === 1 ? alive[0].team : -1);
      }
      return;
    }
    if (this.config.teamSize > 1) {
      const aliveTeams = new Set<number>();
      for (const f of this.fighters) {
        if (!f.ko) aliveTeams.add(f.team);
      }
      if (aliveTeams.size <= 1) {
        this.endMatch(aliveTeams.size === 1 ? [...aliveTeams][0] : -1);
      }
    }
  }

  private activateReserve(team: number, x: number, from: number): void {
    const members = this.config.teams[team];
    const next = members.find((index) => !this.fighters[index].ko && !this.fighters[index].active);
    if (!next) return;
    const f = this.fighters[next];
    f.active = true;
    f.x = clamp(x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
    f.y = 0;
    f.vx = 0;
    f.vy = 0;
    f.airborne = false;
    f.state = 'tagIn';
    f.stateFrame = 0;
    f.invuln = 60;
    f.tagCooldown = 120;
    f.blocking = false;
    f.crouching = false;
    const target = this.nearestOpponent(f);
    if (target) f.facing = target.x >= f.x ? 1 : -1;
    this.events.push({ type: 'tag', team, from, to: next });
  }

  private tryTag(f: FighterState): boolean {
    if (this.config.teamSize <= 1 || this.config.rumble) return false;
    if (f.tagCooldown > 0 || f.airborne) return false;
    const members = this.config.teams[f.team];
    const next = members.find(
      (index) => index !== f.index && !this.fighters[index].ko && !this.fighters[index].active
    );
    if (next === undefined) return false;
    const reserve = this.fighters[next];
    const oldX = f.x;
    const oldFacing = f.facing;
    f.active = false;
    f.state = 'tagOut';
    f.stateFrame = 0;
    f.vx = 0;
    f.vy = 0;
    f.airborne = false;
    f.y = 0;
    f.blocking = false;
    f.tagCooldown = 180;
    reserve.active = true;
    reserve.x = oldX;
    reserve.y = 0;
    reserve.vx = 0;
    reserve.vy = 0;
    reserve.airborne = false;
    reserve.facing = oldFacing;
    reserve.state = 'tagIn';
    reserve.stateFrame = 0;
    reserve.invuln = 55;
    reserve.tagCooldown = 180;
    reserve.blocking = false;
    reserve.crouching = false;
    this.startMove(reserve, 'tag');
    reserve.invuln = Math.max(reserve.invuln, 40);
    this.events.push({ type: 'tag', team: f.team, from: f.index, to: next });
    return true;
  }

  private separateFighters(): void {
    const active = this.fighters.filter((f) => f.active && !f.ko);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        if (a.team === b.team) continue;
        const dist = b.x - a.x;
        const minDist = PUSH_DISTANCE * ((a.def.weight + b.def.weight) / 2);
        if (Math.abs(dist) < minDist) {
          const overlap = minDist - Math.abs(dist);
          const dir = dist === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dist);
          a.x -= (dir * overlap) / 2;
          b.x += (dir * overlap) / 2;
          a.x = clamp(a.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
          b.x = clamp(b.x, -STAGE_HALF_WIDTH + WALL_MARGIN, STAGE_HALF_WIDTH - WALL_MARGIN);
        }
      }
    }
  }

  private updateComboTimers(): void {
    for (const f of this.fighters) {
      if (f.combo > 0) {
        f.comboTimer--;
        if (f.comboTimer <= 0) {
          f.combo = 0;
        }
      }
    }
  }

  private onTimeout(): void {
    if (this.config.rumble) {
      const alive = this.fighters.filter((f) => !f.ko);
      alive.sort((a, b) => b.health - a.health);
      this.endMatch(alive.length ? alive[0].team : -1);
      return;
    }
    if (this.config.teamSize > 1) {
      const h0 = this.getTeamHealth(0);
      const h1 = this.getTeamHealth(1);
      if (h0 === h1) this.endMatch(-1);
      else this.endMatch(h0 > h1 ? 0 : 1);
      return;
    }
    const a = this.fighters.find((f) => f.team === 0);
    const b = this.fighters.find((f) => f.team === 1);
    if (!a || !b) return;
    this.roundEndReason = 'timeout';
    this.phase = 'roundEnd';
    this.roundEndTimer = 150;
    if (a.health === b.health) {
      this.roundWinner = null;
      this.roundEndReason = 'draw';
      return;
    }
    const winner = a.health > b.health ? a : b;
    const loser = winner === a ? b : a;
    this.roundWinner = winner.index;
    winner.roundsWon++;
    winner.state = 'victory';
    winner.stateFrame = 0;
    loser.state = 'defeat';
    loser.stateFrame = 0;
  }

  private advanceAfterRound(): void {
    this.events.push({
      type: 'roundEnd',
      winner: this.roundWinner,
      reason: this.roundEndReason
    });
    if (this.roundWinner !== null) {
      const winner = this.fighters[this.roundWinner];
      if (winner && winner.roundsWon >= this.config.roundsToWin) {
        this.endMatch(winner.team);
        return;
      }
    }
    this.round++;
    this.startRound();
  }

  private startRound(): void {
    this.projectiles = [];
    this.zones = [];
    this.explosions = [];
    this.pendingSwitches = [];
    this.hitstop = 0;
    this.finisher = null;
    this.matchWinner = null;
    this.roundWinner = null;
    this.timerFrames = this.config.roundTime * FPS;
    this.announcedTen = false;
    this.phase = 'intro';
    this.introTimer = 90;
    this.roundEndReason = 'ko';
    for (const f of this.fighters) {
      f.health = f.maxHealth;
      f.ko = false;
      f.state = 'intro';
      f.stateFrame = 0;
      f.move = null;
      f.moveId = null;
      f.moveFrame = 0;
      f.moveHitMask = 0;
      f.moveContact = false;
      f.lastHitFrames = [];
      f.hitsLanded = 0;
      f.combo = 0;
      f.comboTimer = 0;
      f.stun = 0;
      f.blocking = false;
      f.crouching = false;
      f.airborne = false;
      f.y = 0;
      f.vy = 0;
      f.vx = 0;
      f.invuln = 0;
      f.armor = 0;
      f.parryBuffer = 0;
      f.tagCooldown = 0;
      f.buffs = [];
      f.inputBuffer = [];
      f.flash = 0;
      f.aura = 0;
      f.walkDirection = 0;
      f.super = Math.min(100, Math.floor(f.super * 0.5));
      f.hype = Math.min(100, Math.floor(f.hype * 0.5));
      const teamMembers = this.config.teams[f.team] ?? [f.index];
      f.active = teamMembers[0] === f.index;
    }
    this.layoutFighters();
  }

  private endMatch(winnerTeam: number): void {
    this.phase = 'matchEnd';
    this.matchWinner = winnerTeam;
    this.events.push({ type: 'matchEnd', winner: winnerTeam });
    for (const f of this.fighters) {
      if (!f.active) continue;
      if (winnerTeam >= 0 && f.team === winnerTeam) {
        f.state = 'victory';
      } else if (winnerTeam >= 0) {
        f.state = 'defeat';
      } else {
        f.state = 'defeat';
      }
      f.stateFrame = 0;
    }
  }

  private canFinish(attacker: FighterState, defender?: FighterState): boolean {
    if (!defender || defender.ko) return false;
    if (attacker.hype < 100) return false;
    if (defender.health > defender.maxHealth * 0.25) return false;
    if (defender.airborne || defender.y > 0.02) return false;
    if (Math.abs(defender.x - attacker.x) > 8) return false;
    if (this.phase !== 'fight') return false;
    if (this.config.mode === 'training') return true;
    if (this.config.teamSize > 1 || this.config.rumble) return true;
    return this.round >= this.config.roundsToWin;
  }

  private startFinisher(attacker: FighterState, defender: FighterState): void {
    const moveId = attacker.def.finisher;
    this.phase = 'finisher';
    this.finisher = {
      attacker: attacker.index,
      defender: defender.index,
      moveId,
      timer: 0,
      impactDone: false
    };
    attacker.state = 'finisher';
    attacker.stateFrame = 0;
    attacker.move = null;
    attacker.moveId = moveId;
    attacker.moveFrame = 0;
    attacker.hype = 0;
    attacker.blocking = false;
    defender.state = 'finisherVictim';
    defender.stateFrame = 0;
    defender.stun = 0;
    defender.blocking = false;
    this.projectiles = [];
    this.zones = [];
    this.explosions = [];
    this.hitstop = 0;
    this.events.push({
      type: 'finisher',
      attacker: attacker.index,
      defender: defender.index,
      move: moveId,
      phase: 'start'
    });
    this.events.push({ type: 'announce', text: 'HYPE FINISH' });
  }

  private updateFinisher(): void {
    const fin = this.finisher;
    if (!fin) {
      this.phase = 'fight';
      return;
    }
    fin.timer++;
    const attacker = this.fighters[fin.attacker];
    const defender = this.fighters[fin.defender];
    if (fin.timer === 110 && !fin.impactDone) {
      fin.impactDone = true;
      defender.health = 0;
      defender.ko = true;
      defender.state = 'ko';
      defender.stateFrame = 0;
      defender.airborne = false;
      defender.y = 0;
      this.events.push({
        type: 'finisher',
        attacker: fin.attacker,
        defender: fin.defender,
        move: fin.moveId,
        phase: 'impact'
      });
      this.events.push({ type: 'ko', loser: defender.index, winner: attacker.index });
      this.events.push({ type: 'announce', text: 'K.O.' });
    }
    if (fin.timer >= 190) {
      this.events.push({
        type: 'finisher',
        attacker: fin.attacker,
        defender: fin.defender,
        move: fin.moveId,
        phase: 'end'
      });
      this.finisher = null;
      if (this.config.rumble) {
        defender.active = false;
        this.phase = 'fight';
        this.checkEliminations();
        return;
      }
      if (this.config.teamSize > 1) {
        defender.active = false;
        const members = this.config.teams[defender.team];
        const hasReserve = members.some((index) => !this.fighters[index].ko);
        if (hasReserve) {
          this.pendingSwitches.push({
            team: defender.team,
            timer: 55,
            x: defender.x,
            from: defender.index
          });
        }
        this.phase = 'fight';
        this.checkEliminations();
        return;
      }
      defender.active = false;
      this.roundWinner = attacker.index;
      attacker.roundsWon++;
      attacker.state = 'victory';
      this.phase = 'roundEnd';
      this.roundEndTimer = 165;
      this.roundEndReason = 'ko';
    }
  }

  resetTraining(): void {
    this.projectiles = [];
    this.zones = [];
    this.explosions = [];
    this.pendingSwitches = [];
    this.hitstop = 0;
    this.finisher = null;
    this.phase = 'fight';
    this.timerFrames = this.config.roundTime * FPS;
    this.roundWinner = null;
    this.matchWinner = null;
    this.announcedTen = false;
    for (const f of this.fighters) {
      f.health = f.maxHealth;
      f.ko = false;
      f.state = 'idle';
      f.stateFrame = 0;
      f.move = null;
      f.moveId = null;
      f.moveFrame = 0;
      f.moveHitMask = 0;
      f.moveContact = false;
      f.lastHitFrames = [];
      f.hitsLanded = 0;
      f.combo = 0;
      f.comboTimer = 0;
      f.stun = 0;
      f.blocking = false;
      f.crouching = false;
      f.airborne = false;
      f.y = 0;
      f.vy = 0;
      f.vx = 0;
      f.invuln = 0;
      f.armor = 0;
      f.parryBuffer = 0;
      f.buffs = [];
      f.inputBuffer = [];
      f.flash = 0;
      f.aura = 0;
    }
    this.layoutFighters();
    this.events.push({ type: 'trainingReset' });
  }

  resetHealth(): void {
    for (const f of this.fighters) {
      f.health = f.maxHealth;
      f.ko = false;
    }
    this.events.push({ type: 'trainingReset' });
  }

  resetMeters(): void {
    for (const f of this.fighters) {
      f.super = 100;
      f.hype = 100;
    }
    this.events.push({ type: 'trainingReset' });
  }

  resetPositions(): void {
    this.layoutFighters();
    for (const f of this.fighters) {
      f.vx = 0;
      f.vy = 0;
      f.airborne = false;
      f.y = 0;
      f.state = 'idle';
      f.stateFrame = 0;
      f.move = null;
      f.moveId = null;
      f.moveFrame = 0;
    }
    this.events.push({ type: 'trainingReset' });
  }

  hash(): number {
    let h = 2166136261;
    const mix = (n: number) => {
      h ^= Math.round(n * 1000) | 0;
      h = Math.imul(h, 16777619);
    };
    mix(this.frame);
    mix(this.timerFrames);
    mix(STATE_PHASE_INDEX[this.phase]);
    mix(this.round);
    mix(this.hitstop);
    mix(this.matchWinner ?? -1);
    mix(this.roundWinner ?? -1);
    for (const f of this.fighters) {
      mix(f.index);
      mix(f.x);
      mix(f.y);
      mix(f.vx);
      mix(f.vy);
      mix(f.health);
      mix(f.super);
      mix(f.hype);
      mix(f.stun);
      mix(f.moveFrame);
      mix(f.state.length);
      mix(f.state.charCodeAt(0));
      mix(f.ko ? 1 : 0);
      mix(f.active ? 1 : 0);
      mix(f.facing);
      mix(f.combo);
    }
    for (const p of this.projectiles) {
      mix(p.id);
      mix(p.x);
      mix(p.y);
      mix(p.life);
    }
    for (const z of this.zones) {
      mix(z.id);
      mix(z.x);
      mix(z.life);
    }
    for (const e of this.explosions) {
      mix(e.id);
      mix(e.delay);
    }
    if (this.finisher) {
      mix(this.finisher.timer);
      mix(this.finisher.attacker);
      mix(this.finisher.defender);
    }
    return h >>> 0;
  }

  serialize(): SimSnapshot {
    return {
      frame: this.frame,
      round: this.round,
      timerFrames: this.timerFrames,
      phase: this.phase,
      introTimer: this.introTimer,
      roundEndTimer: this.roundEndTimer,
      hitstop: this.hitstop,
      matchWinner: this.matchWinner,
      roundWinner: this.roundWinner,
      fighters: this.fighters.map((f) => ({
        index: f.index,
        charId: f.charId,
        team: f.team,
        x: f.x,
        y: f.y,
        vx: f.vx,
        vy: f.vy,
        facing: f.facing,
        health: f.health,
        maxHealth: f.maxHealth,
        super: f.super,
        hype: f.hype,
        state: f.state,
        stateFrame: f.stateFrame,
        moveId: f.moveId,
        moveFrame: f.moveFrame,
        moveHitMask: f.moveHitMask,
        moveContact: f.moveContact,
        lastHitFrames: [...f.lastHitFrames],
        hitsLanded: f.hitsLanded,
        combo: f.combo,
        maxCombo: f.maxCombo,
        comboTimer: f.comboTimer,
        stun: f.stun,
        blocking: f.blocking,
        crouching: f.crouching,
        airborne: f.airborne,
        invuln: f.invuln,
        armor: f.armor,
        parryBuffer: f.parryBuffer,
        tagCooldown: f.tagCooldown,
        buffs: f.buffs.map((b) => ({ ...b })),
        ko: f.ko,
        active: f.active,
        roundsWon: f.roundsWon,
        totalDamageDealt: f.totalDamageDealt,
        totalHits: f.totalHits,
        flash: f.flash,
        aura: f.aura,
        lastHitBy: f.lastHitBy,
        lastMoveName: f.lastMoveName,
        walkDirection: f.walkDirection
      })),
      projectiles: this.projectiles.map((p) => ({ ...p })),
      zones: this.zones.map((z) => ({ ...z })),
      explosions: this.explosions.map((e) => ({ ...e })),
      finisher: this.finisher ? { ...this.finisher } : null,
      pendingSwitches: this.pendingSwitches.map((p) => ({ ...p })),
      nextProjectileId: this.nextProjectileId,
      nextZoneId: this.nextZoneId,
      nextExplosionId: this.nextExplosionId
    };
  }

  load(snapshot: SimSnapshot): void {
    this.frame = snapshot.frame;
    this.round = snapshot.round;
    this.timerFrames = snapshot.timerFrames;
    this.phase = snapshot.phase;
    this.introTimer = snapshot.introTimer;
    this.roundEndTimer = snapshot.roundEndTimer;
    this.hitstop = snapshot.hitstop;
    this.matchWinner = snapshot.matchWinner;
    this.roundWinner = snapshot.roundWinner;
    this.finisher = snapshot.finisher ? { ...snapshot.finisher } : null;
    this.pendingSwitches = snapshot.pendingSwitches.map((p) => ({ ...p }));
    this.nextProjectileId = snapshot.nextProjectileId;
    this.nextZoneId = snapshot.nextZoneId;
    this.nextExplosionId = snapshot.nextExplosionId;
    this.projectiles = snapshot.projectiles.map((p) => ({ ...p }));
    this.zones = snapshot.zones.map((z) => ({ ...z }));
    this.explosions = snapshot.explosions.map((e) => ({ ...e }));
    for (const data of snapshot.fighters) {
      const f = this.fighters[data.index];
      if (!f) continue;
      const def = this.config.fighters[data.index];
      f.def = def;
      f.charId = data.charId;
      f.team = data.team;
      f.x = data.x;
      f.y = data.y;
      f.vx = data.vx;
      f.vy = data.vy;
      f.facing = data.facing;
      f.health = data.health;
      f.maxHealth = data.maxHealth;
      f.super = data.super;
      f.hype = data.hype;
      f.state = data.state;
      f.stateFrame = data.stateFrame;
      f.moveId = data.moveId;
      f.move = data.moveId ? def.moves[data.moveId] ?? null : null;
      f.moveFrame = data.moveFrame;
      f.moveHitMask = data.moveHitMask;
      f.moveContact = data.moveContact;
      f.lastHitFrames = [...data.lastHitFrames];
      f.hitsLanded = data.hitsLanded;
      f.combo = data.combo;
      f.maxCombo = data.maxCombo;
      f.comboTimer = data.comboTimer;
      f.stun = data.stun;
      f.blocking = data.blocking;
      f.crouching = data.crouching;
      f.airborne = data.airborne;
      f.invuln = data.invuln;
      f.armor = data.armor;
      f.parryBuffer = data.parryBuffer;
      f.tagCooldown = data.tagCooldown;
      f.buffs = data.buffs.map((b) => ({ ...b }));
      f.ko = data.ko;
      f.active = data.active;
      f.roundsWon = data.roundsWon;
      f.totalDamageDealt = data.totalDamageDealt;
      f.totalHits = data.totalHits;
      f.flash = data.flash;
      f.aura = data.aura;
      f.lastHitBy = data.lastHitBy;
      f.lastMoveName = data.lastMoveName;
      f.walkDirection = data.walkDirection;
    }
  }

  static create(config: MatchConfig): MatchSim {
    return new MatchSim(config);
  }
}
