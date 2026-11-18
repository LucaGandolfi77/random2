import { attacksFor, ASSIST_COOLDOWN, DODGE_IFRAME, DODGE_TIME, FIGHTER_H, FIGHTER_W, GRAVITY, GROUND_Y, JUMP_V, MAX_HP, PLATFORMS, WALL_L, WALL_R } from '../game/constants';
import type { AttackDef, AttackKind, FighterState, InputFrame, Platform } from '../game/types';
import type { FighterDef } from '../data/fighters';

export interface Rect { x: number; y: number; w: number; h: number }

export class Fighter {
  readonly def: FighterDef;
  readonly id: string;
  readonly team: 'player' | 'enemy';
  readonly attacks: Record<AttackKind, AttackDef>;
  x = 0;
  y = GROUND_Y - FIGHTER_H;
  vx = 0;
  vy = 0;
  facing = 1;
  state: FighterState = 'idle';
  stateTime = 0;
  onGround = true;
  hp = MAX_HP;
  energy = 0;
  combo = 0;
  comboTimer = 0;
  comboWindow = 0;
  comboStep = 0;
  stun = 0;
  invuln = 0;
  attack: AttackDef | null = null;
  attackTime = 0;
  specialSpawned = false;
  hitTargets = new Set<string>();
  assistCooldowns = [0, 0];
  assists: [string, string];
  pendingAssist: number | null = null;
  pendingProjectile: AttackDef | null = null;
  prev: InputFrame;
  flash = 0;
  walkPhase = 0;
  readonly platforms: Platform[];
  damageScale = 1;
  defenseBonus = 0;
  knockbackResist = 0;
  speedScale = 1;
  isBoss = false;
  phase2 = false;

  constructor(def: FighterDef, id: string, team: 'player' | 'enemy', x: number, facing: number, assists: [string, string], platforms: Platform[] = PLATFORMS) {
    this.def = def;
    this.id = id;
    this.team = team;
    this.x = x;
    this.facing = facing;
    this.assists = assists;
    this.platforms = platforms;
    this.attacks = attacksFor(def);
    this.prev = {
      left: false, right: false, up: false, down: false, light: false,
      heavy: false, special: false, dodge: false, assist1: false, assist2: false, block: false
    };
  }

  reset(x: number, facing: number) {
    this.x = x;
    this.y = GROUND_Y - FIGHTER_H;
    this.vx = this.vy = 0;
    this.facing = facing;
    this.state = 'idle';
    this.stateTime = 0;
    this.onGround = true;
    this.hp = MAX_HP;
    this.energy = 0;
    this.combo = this.comboTimer = this.comboWindow = this.comboStep = 0;
    this.stun = this.invuln = this.flash = 0;
    this.attack = null;
    this.attackTime = 0;
    this.hitTargets.clear();
    this.assistCooldowns = [0, 0];
    this.pendingAssist = null;
    this.pendingProjectile = null;
  }

  get centerX() { return this.x + FIGHTER_W / 2; }
  get centerY() { return this.y + FIGHTER_H / 2; }

  get hurtbox(): Rect {
    return { x: this.x + 2, y: this.y + (this.state === 'block' ? 8 : 0), w: FIGHTER_W - 4, h: this.state === 'block' ? FIGHTER_H - 8 : FIGHTER_H };
  }

  get hitbox(): Rect | null {
    const a = this.attack;
    if (!a || this.attackTime < a.startup || this.attackTime > a.startup + a.active) return null;
    const w = a.range;
    return {
      x: this.facing > 0 ? this.x + FIGHTER_W - 2 : this.x - w + 2,
      y: this.y - (a.kind === 'heavy' || a.kind === 'special' ? 12 : 2),
      w, h: a.height
    };
  }

  private pressed(now: boolean, before: boolean) { return now && !before; }

  startAttack(kind: AttackKind) {
    if (this.state === 'ko' || this.stun > 0) return;
    const a = this.attacks[kind];
    if (kind === 'special') {
      if (this.energy < this.def.specialCost) return;
      this.energy -= this.def.specialCost;
    }
    if (kind === 'light1' || kind === 'light2' || kind === 'light3') {
      this.comboStep = kind === 'light1' ? 1 : kind === 'light2' ? 2 : 3;
      this.comboWindow = 0;
    } else this.comboStep = 0;
    this.attack = a;
    this.attackTime = 0;
    this.specialSpawned = false;
    this.hitTargets.clear();
    this.state = 'attack';
    this.stateTime = 0;
    this.vx *= 0.3;
  }

  update(dt: number, input: InputFrame) {
    this.stateTime += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.invuln = Math.max(0, this.invuln - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    for (let i = 0; i < 2; i++) this.assistCooldowns[i] = Math.max(0, this.assistCooldowns[i] - dt);
    this.energy = Math.min(100, this.energy + dt * 2.2);

    if (this.state === 'ko') { this.applyPhysics(dt, false); this.prev = { ...input }; return; }

    this.stun = Math.max(0, this.stun - dt);

    if (this.pressed(input.assist1, this.prev.assist1) && this.assistCooldowns[0] <= 0) {
      this.assistCooldowns[0] = ASSIST_COOLDOWN;
      this.pendingAssist = 0;
    }
    if (this.pressed(input.assist2, this.prev.assist2) && this.assistCooldowns[1] <= 0) {
      this.assistCooldowns[1] = ASSIST_COOLDOWN;
      this.pendingAssist = 1;
    }

    if (this.attack) {
      this.attackTime += dt;
      const a = this.attack;
      if (a.kind === 'special' && !this.specialSpawned && this.attackTime >= a.startup) {
        this.specialSpawned = true;
        this.pendingProjectile = a;
      }
      if (this.attackTime >= a.startup + a.active + a.recovery) {
        this.attack = null;
        this.comboWindow = a.kind.startsWith('light') ? 0.30 : 0;
        this.state = this.onGround ? 'idle' : 'fall';
      }
    } else if (this.stun > 0) {
      this.state = 'hurt';
    } else if (this.state === 'dodge') {
      if (this.stateTime >= DODGE_TIME) this.state = this.onGround ? 'idle' : 'fall';
    } else {
      // ground actions
      const canAct = this.onGround;
      if (canAct && this.pressed(input.dodge, this.prev.dodge)) {
        const dir = input.left ? -1 : input.right ? 1 : -this.facing;
        this.vx = dir * 260;
        this.invuln = DODGE_IFRAME;
        this.state = 'dodge';
        this.stateTime = 0;
      } else if (canAct && this.pressed(input.special, this.prev.special) && this.energy >= this.def.specialCost) {
        this.startAttack('special');
      } else if (canAct && this.pressed(input.heavy, this.prev.heavy)) {
        this.startAttack('heavy');
      } else if (canAct && this.pressed(input.light, this.prev.light)) {
        const next = this.comboStep === 1 ? 'light2' : this.comboStep === 2 ? 'light3' : 'light1';
        this.startAttack(this.comboWindow > 0 ? next : 'light1');
      } else {
        if (canAct && this.pressed(input.up, this.prev.up)) {
          this.vy = JUMP_V;
          this.onGround = false;
          this.state = 'jump';
        }
        const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (canAct && input.block && !move) {
          this.state = 'block';
          this.vx *= 0.7;
        } else if (move !== 0) {
          this.facing = move;
          const speed = (118 + this.def.stats.speed * 7) * this.speedScale;
          this.vx += (move * speed - this.vx) * Math.min(1, dt * (this.onGround ? 16 : 7));
          if (this.onGround) this.state = 'run';
        } else {
          this.vx *= Math.max(0, 1 - dt * (this.onGround ? 14 : 3));
          if (this.onGround) this.state = 'idle';
        }
      }
    }

    this.applyPhysics(dt, true);
    if (this.walkPhase > 1000) this.walkPhase = 0;
    if (this.state === 'run') this.walkPhase += dt * 10;
    this.prev = { ...input };
  }

  private applyPhysics(dt: number, collide: boolean) {
    const prevBottom = this.y + FIGHTER_H;
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < WALL_L) { this.x = WALL_L; this.vx = 0; }
    if (this.x > WALL_R - FIGHTER_W) { this.x = WALL_R - FIGHTER_W; this.vx = 0; }

    if (collide && this.vy >= 0) {
      let landed = false;
      if (prevBottom <= GROUND_Y + 1 && this.y + FIGHTER_H >= GROUND_Y) {
        this.y = GROUND_Y - FIGHTER_H;
        landed = true;
      }
      if (!landed) {
        for (const p of this.platforms) {
          if (this.x + FIGHTER_W < p.x || this.x > p.x + p.w) continue;
          if (prevBottom <= p.y + 1 && this.y + FIGHTER_H >= p.y) {
            this.y = p.y - FIGHTER_H;
            landed = true;
            break;
          }
        }
      }
      if (landed) {
        if (this.vy > 260) this.vy = 0;
        else this.vy = 0;
        if (!this.onGround && this.state === 'fall') this.state = 'idle';
        this.onGround = true;
      } else if (this.y + FIGHTER_H < GROUND_Y - 1) this.onGround = false;
    }
    if (this.y > GROUND_Y + 40) { this.y = GROUND_Y - FIGHTER_H; this.vy = 0; }
  }

  takeHit(damage: number, kb: number, fromX: number, launch = 0): number {
    if (this.invuln > 0 || this.state === 'ko') return 0;
    const defFactor = 1 - (this.def.stats.defense + this.defenseBonus - 5) * 0.024;
    const dealt = Math.max(1, Math.round(damage * Math.max(0.55, defFactor)));
    this.hp = Math.max(0, this.hp - dealt);
    this.flash = 1;
    this.invuln = 0.09;
    this.stun = 0.18;
    this.attack = null;
    this.comboStep = 0;
    this.comboWindow = 0;
    this.state = 'hurt';
    this.stateTime = 0;
    const dir = fromX <= this.x ? 1 : -1;
    this.vx = dir * kb * (1 - this.knockbackResist);
    if (launch < 0 && this.onGround) { this.vy = launch; this.onGround = false; }
    if (this.hp <= 0) {
      this.state = 'ko';
      this.vy = -180;
      this.onGround = false;
    }
    return dealt;
  }

  addEnergy(amount: number) { this.energy = Math.min(100, this.energy + amount); }

  get alive() { return this.hp > 0; }
}
