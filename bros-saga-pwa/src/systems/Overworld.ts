import { AREA_BY_ID, generateArea, type AreaData } from '../data/areas';
import { ENEMY_BY_ID } from '../data/enemies';
import { TILE, VIEW_H, VIEW_W, WALK_SPEED } from '../game/constants';
import { QUESTS } from '../data/quests';

export interface WorldInput {
  left: boolean; right: boolean; up: boolean; down: boolean;
  a: boolean; b: boolean; swap: boolean; menu: boolean; power: boolean;
}

export interface RoamingEnemy { kind: string; x: number; y: number; homeX: number; homeY: number; phase: number }

export interface WorldCallbacks {
  onEncounter: (kind: string, preemptive: boolean) => void;
  onExit: (to: string, dir: 'left' | 'right') => void;
  onChest: (item: string) => void;
  onSound: (name: string) => void;
  onDialogue: (text: string) => void;
  onNpc: (questId: string) => void;
}

const CHEST_ITEMS = ['mushroom', 'pepper', 'oneup'];

export class Overworld {
  data!: AreaData;
  areaId = 'plains';
  leader: 'pip' | 'pop' = 'pip';
  x = 0;
  y = 0;
  trail: { x: number; y: number }[] = [];
  enemies: RoamingEnemy[] = [];
  npc: { x: number; y: number; questId: string } | null = null;
  time = 0;
  actionFlash = 0;
  powers: string[] = [];
  facing = 1;
  airTimer = 0;
  dashTimer = 0;
  shieldTimer = 0;
  private doubleUsed = false;
  private prevA = false;
  private prevB = false;
  private prevSwap = false;
  private prevPower = false;
  private actionWindow = 0;

  constructor(private cb: WorldCallbacks) {
    this.load('plains');
  }

  load(areaId: string, fromDir?: 'left' | 'right') {
    const def = AREA_BY_ID[areaId] ?? AREA_BY_ID.plains;
    this.areaId = def.id;
    this.data = generateArea(def);
    this.x = (fromDir === 'right' ? this.data.width - 3 : fromDir === 'left' ? 3 : this.data.spawn.x) * TILE + TILE / 2;
    this.y = this.data.spawn.y * TILE + TILE / 2;
    this.trail = [];
    this.enemies = this.data.enemySpawns.map((s, i) => ({
      kind: s.kind, x: s.x * TILE + 8, y: s.y * TILE + 8,
      homeX: s.x * TILE + 8, homeY: s.y * TILE + 8, phase: i * 1.7
    }));
    if (def.boss) {
      const bx = (this.data.width - 6) * TILE + 8;
      const by = this.data.spawn.y * TILE + 8;
      this.enemies.push({ kind: def.boss, x: bx, y: by, homeX: bx, homeY: by, phase: 0.5 });
    }
    const quest = QUESTS.find((q) => q.areaId === def.id);
    this.npc = quest ? { x: (this.data.spawn.x + 3) * TILE + 8, y: this.data.spawn.y * TILE + 8, questId: quest.id } : null;
    this.actionFlash = 0;
    this.airTimer = 0;
    this.dashTimer = 0;
    this.shieldTimer = 0;
    this.doubleUsed = false;
    this.facing = 1;
  }

  get camera() {
    return {
      x: Math.max(0, Math.min(this.data.width * TILE - VIEW_W, this.x - VIEW_W / 2)),
      y: Math.max(0, Math.min(this.data.height * TILE - VIEW_H, this.y - VIEW_H / 2))
    };
  }

  get follower() {
    return this.trail[Math.min(this.trail.length - 1, 18)] ?? { x: this.x - 18, y: this.y };
  }

  private solid(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= this.data.height || tx < 0 || tx >= this.data.width) return true;
    return this.data.tiles[ty][tx] === '#';
  }

  private blocked(x: number, y: number): boolean {
    if (this.airTimer > 0) return false;
    const r = 5;
    return this.solid(Math.floor((x - r) / TILE), Math.floor((y - r) / TILE))
      || this.solid(Math.floor((x + r) / TILE), Math.floor((y - r) / TILE))
      || this.solid(Math.floor((x - r) / TILE), Math.floor((y + r) / TILE))
      || this.solid(Math.floor((x + r) / TILE), Math.floor((y + r) / TILE));
  }

  update(dt: number, input: WorldInput) {
    this.time += dt;
    this.actionFlash = Math.max(0, this.actionFlash - dt * 3);
    this.actionWindow = Math.max(0, this.actionWindow - dt);

    if (input.swap && !this.prevSwap) {
      this.leader = this.leader === 'pip' ? 'pop' : 'pip';
      this.cb.onSound('select');
      this.cb.onDialogue(`${this.leader === 'pip' ? 'Pip' : 'Pop'} takes the lead!`);
    }
    this.prevSwap = input.swap;

    this.airTimer = Math.max(0, this.airTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);

    const powerPress = input.power && !this.prevPower;
    this.prevPower = input.power;
    if (powerPress) this.usePower(input);

    const aPress = input.a && !this.prevA;
    const bPress = input.b && !this.prevB;
    this.prevA = input.a;
    this.prevB = input.b;

    if (aPress || bPress) {
      this.actionFlash = 1;
      this.actionWindow = 0.25;
      if (aPress) { this.airTimer = 0.42; this.doubleUsed = false; }
      this.cb.onSound(aPress ? 'jump' : 'hammer');
      const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
      const chest = this.data.chests.find((c) => !c.opened && Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1);
      if (chest && aPress) {
        chest.opened = true;
        const item = CHEST_ITEMS[(tx + ty) % CHEST_ITEMS.length];
        this.cb.onChest(item);
        this.cb.onDialogue(`Found a ${item.replace('oneup', '1-UP Cap').toUpperCase()}!`);
        this.cb.onSound('coin');
      }
      if (this.npc && aPress && Math.hypot(this.npc.x - this.x, this.npc.y - this.y) < 22) {
        this.cb.onNpc(this.npc.questId);
        return;
      }
    }

    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    const nx = this.x + dx * WALK_SPEED * dt + (this.dashTimer > 0 ? this.facing * 150 * dt : 0);
    const ny = this.y + dy * WALK_SPEED * dt;
    if (!this.blocked(nx, this.y)) this.x = nx;
    if (!this.blocked(this.x, ny)) this.y = ny;

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 24) this.trail.pop();

    for (const e of this.enemies) {
      e.x = e.homeX + Math.sin(this.time * 0.8 + e.phase) * 22;
      e.y = e.homeY + Math.cos(this.time * 0.6 + e.phase) * 14;
      if (Math.hypot(e.x - this.x, e.y - this.y) < 13) {
        const preemptive = this.actionWindow > 0 || this.shieldTimer > 0;
        this.cb.onEncounter(e.kind, preemptive);
        return;
      }
    }

    const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    const door = this.data.exits.find((ex) => ex.x === tx && ex.y === ty);
    if (door) this.cb.onExit(door.to, door.dir);
  }

  private usePower(input: WorldInput) {
    const has = (id: string) => this.powers.includes(id);
    if (this.airTimer > 0 && !this.doubleUsed && has('double_jump')) {
      this.airTimer += 0.5;
      this.doubleUsed = true;
      this.cb.onDialogue('Double jump!');
    } else if (this.airTimer > 0 && input.down && has('ground_pound')) {
      this.airTimer = 0;
      this.actionWindow = 0.35;
      this.cb.onDialogue('Ground pound!');
    } else if (this.airTimer > 0 && has('hover_spin')) {
      this.airTimer = 1.2;
      this.cb.onDialogue('Hover spin!');
    } else if (this.airTimer <= 0 && (has('fire_dash') || has('thunder_dash'))) {
      this.dashTimer = 0.22;
      this.cb.onDialogue(has('fire_dash') && this.leader === 'pip' ? 'Fire dash!' : 'Thunder dash!');
    } else if (has('bro_shield')) {
      this.shieldTimer = 3;
      this.cb.onDialogue('Bros. Shield ready!');
    }
    this.cb.onSound('jump');
  }

  isOpen(tile: string): boolean { return tile !== '#'; }
  enemyName(kind: string) { return ENEMY_BY_ID[kind]?.name ?? kind; }
}
