import { BADGE_BY_ID } from '../data/badges';
import type { BadgeEffects } from '../game/types';

export class BadgeSystem {
  owned: string[] = [];
  equipped: string[] = [];

  constructor(owned: string[] = [], equipped: string[] = []) {
    this.owned = [...owned];
    this.equipped = equipped.filter((id) => this.owned.includes(id)).slice(0, 2);
  }

  add(id: string): boolean {
    if (!BADGE_BY_ID[id] || this.owned.includes(id)) return false;
    this.owned.push(id);
    return true;
  }

  toggle(id: string): boolean {
    if (!this.owned.includes(id)) return false;
    const i = this.equipped.indexOf(id);
    if (i >= 0) { this.equipped.splice(i, 1); return false; }
    if (this.equipped.length >= 2) this.equipped.shift();
    this.equipped.push(id);
    return true;
  }

  bonus(): BadgeEffects {
    const out: BadgeEffects = {};
    for (const id of this.equipped) {
      const e = BADGE_BY_ID[id]?.effects;
      if (!e) continue;
      out.power = (out.power ?? 0) + (e.power ?? 0);
      out.defense = (out.defense ?? 0) + (e.defense ?? 0);
      out.speed = (out.speed ?? 0) + (e.speed ?? 0);
      out.maxHp = (out.maxHp ?? 0) + (e.maxHp ?? 0);
      out.timing = (out.timing ?? 0) + (e.timing ?? 0);
      out.loot = (out.loot ?? 0) + (e.loot ?? 0);
      out.perfect = (out.perfect ?? 0) + (e.perfect ?? 0);
    }
    return out;
  }
}
