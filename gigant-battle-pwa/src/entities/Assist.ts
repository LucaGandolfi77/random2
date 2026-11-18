import type { FighterDef } from '../data/fighters';
import type { Rect } from './Fighter';

/** A short support appearance that strikes once, then leaves the arena. */
export class Assist {
  def: FighterDef;
  team: 'player' | 'enemy';
  x: number;
  y: number;
  facing: number;
  timer = 0;
  struck = false;
  dead = false;
  damage: number;

  constructor(def: FighterDef, team: 'player' | 'enemy', x: number, y: number, facing: number, damage: number) {
    this.def = def;
    this.team = team;
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.damage = damage;
  }

  update(dt: number) {
    this.timer += dt;
    if (this.timer > 1.5) this.dead = true;
    if (this.timer < 0.22) this.x += this.facing * 150 * dt;
  }

  get strikeRect(): Rect | null {
    if (this.struck || this.timer < 0.24 || this.timer > 0.42) return null;
    return { x: this.facing > 0 ? this.x : this.x - 96, y: this.y - 12, w: 96, h: 46 };
  }

  get hurtbox(): Rect { return { x: this.x - 9, y: this.y - 30, w: 18, h: 30 }; }
}
