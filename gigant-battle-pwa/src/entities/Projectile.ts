import { VIEW_W, VIEW_H } from '../game/constants';
import type { FighterDef } from '../data/fighters';
import type { Rect } from './Fighter';

export class Projectile {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  life = 1.4;
  damage: number;
  knockback: number;
  ownerId: string;
  team: 'player' | 'enemy';
  def: FighterDef;
  kind: string;
  dead = false;

  constructor(def: FighterDef, x: number, y: number, facing: number, damage: number, knockback: number, ownerId: string, team: 'player' | 'enemy', kind: string) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.facingSpeed(facing, kind);
    this.damage = damage;
    this.knockback = knockback;
    this.ownerId = ownerId;
    this.team = team;
    this.kind = kind;
  }

  private facingSpeed(facing: number, kind: string) {
    const speeds: Record<string, number> = {
      fire: 190, bolt: 300, laser: 360, wave: 150, void: 210,
      quake: 140, star: 340, meteor: 170, venom: 260
    };
    this.vx = facing * (speeds[kind] ?? 250);
    this.vy = kind === 'bolt' ? -40 : kind === 'quake' ? -60 : 0;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.kind === 'wave') this.vy += 120 * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < -20 || this.x > VIEW_W + 20 || this.y < -20 || this.y > VIEW_H + 20) this.dead = true;
  }

  get rect(): Rect { return { x: this.x - 6, y: this.y - 5, w: 12, h: 10 }; }
}
