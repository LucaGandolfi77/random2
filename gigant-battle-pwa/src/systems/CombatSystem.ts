import type { Assist } from '../entities/Assist';
import type { Fighter, Rect } from '../entities/Fighter';
import { Projectile } from '../entities/Projectile';
import type { HitEvent } from '../game/types';

export interface CombatCallbacks {
  onSound: (name: string) => void;
  onShake: (amount: number) => void;
  onHit: (ev: HitEvent) => void;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class CombatSystem {
  hitstop = 0;

  get frozen() { return this.hitstop > 0; }

  reset() { this.hitstop = 0; }

  spawnProjectiles(fighters: Fighter[], list: Projectile[]) {
    for (const f of fighters) {
      if (!f.pendingProjectile) continue;
      const a = f.pendingProjectile;
      list.push(new Projectile(f.def, f.centerX + f.facing * 16, f.centerY - 4, f.facing, a.damage, a.knockback, f.id, f.team, f.def.special));
      f.pendingProjectile = null;
    }
  }

  update(dt: number, fighters: Fighter[], projectiles: Projectile[], assists: Assist[], cb: CombatCallbacks): HitEvent[] {
    if (this.hitstop > 0) { this.hitstop = Math.max(0, this.hitstop - dt); return []; }
    const events: HitEvent[] = [];

    const record = (attacker: Fighter, target: Fighter, dealt: number, heavy: boolean) => {
      attacker.combo += 1;
      attacker.comboTimer = 1.4;
      attacker.addEnergy(heavy ? 6 : 3);
      const ev: HitEvent = { attacker: attacker.id, target: target.id, damage: dealt, x: target.centerX, y: target.centerY, combo: attacker.combo, heavy };
      events.push(ev);
      cb.onHit(ev);
      cb.onShake(heavy ? 5 : 2.5);
      cb.onSound(heavy ? 'heavy' : 'hit');
      this.hitstop = heavy ? 0.075 : 0.045;
    };

    // melee
    for (const f of fighters) {
      const hb = f.hitbox;
      const a = f.attack;
      if (!hb || !a) continue;
      for (const t of fighters) {
        if (t === f || t.team === f.team || !t.alive || f.hitTargets.has(t.id)) continue;
        if (!overlaps(hb, t.hurtbox)) continue;
        const scaling = Math.max(0.55, 1 - f.combo * 0.07);
        const dealt = t.takeHit(Math.round(a.damage * scaling * f.damageScale), a.knockback, f.centerX, a.launch ?? 0);
        if (dealt > 0) {
          f.hitTargets.add(t.id);
          record(f, t, dealt, a.kind === 'heavy' || a.kind === 'special');
        }
      }
    }

    // projectiles
    for (const p of projectiles) {
      p.update(dt);
      if (p.dead) continue;
      for (const t of fighters) {
        if (t.team === p.team || t.id === p.ownerId || !t.alive) continue;
        if (!overlaps(p.rect, t.hurtbox)) continue;
        const dealt = t.takeHit(p.damage, p.knockback, p.x, -80);
        if (dealt > 0) {
          p.dead = true;
          const attacker = fighters.find((f) => f.id === p.ownerId);
          if (attacker) record(attacker, t, dealt, true);
          else cb.onShake(3);
          cb.onSound('special');
        }
        break;
      }
    }

    // assists
    for (const a of assists) {
      a.update(dt);
      const rect = a.strikeRect;
      if (!rect) continue;
      for (const t of fighters) {
        if (t.team === a.team || !t.alive || overlaps(rect, t.hurtbox) === false) continue;
        const dealt = t.takeHit(a.damage, 240, a.x, -120);
        if (dealt > 0) {
          a.struck = true;
          cb.onShake(6);
          cb.onSound('assist');
          const ev: HitEvent = { attacker: a.team, target: t.id, damage: dealt, x: t.centerX, y: t.centerY, combo: 1, heavy: true };
          events.push(ev);
          cb.onHit(ev);
        }
      }
    }
    return events;
  }
}
