import { ITEM_BY_ID } from '../data/items';
import { MOVE_BY_ID, powerMovesForLevel, unlockedBros } from '../data/moves';
import { POWER_BY_ID } from '../data/powers';
import type { EnemyDef, BattlePhase, BroId, BroState, MoveKind, Element, BadgeEffects, StatusKind } from '../game/types';
import { BP_MAX, DEFEND_WINDOW, MAX_LEVEL, PERFECT_WINDOW, TIMING_CYCLE, TIMING_WINDOW, XP_PER_LEVEL } from '../game/constants';

export interface BattleCallbacks {
  onSound: (name: string) => void;
  onEnd: (result: { won: boolean; xp: number; levelUps: number }) => void;
}

export interface BattleView {
  phase: BattlePhase;
  message: string;
  enemyName: string;
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyColors: EnemyDef['colors'];
  bros: BroState[];
  activeBro: BroId;
  cursor: number;
  windowStart: number;
  windowEnd: number;
  hits: number;
  neededHits: number;
  menu: { id: string; label: string; detail: string }[];
  bp: number;
  items: Record<string, number>;
  pendingLevel: boolean;
  telegraph: string;
  status: string;
  shield: number;
}

type MoveSource = { id: string; label: string; detail: string; kind: MoveKind | 'item'; power: number; element?: Element };

export class BattleSystem {
  phase: BattlePhase = 'intro';
  message = '';
  enemyHp: number;
  enemyMaxHp: number;
  bros: BroState[];
  active: BroId = 'pip';
  bp = 3;
  items: Record<string, number>;
  timer = 0;
  cursor = 0;
  cursorDir = 1;
  hitCount = 0;
  neededHits = 1;
  windowStart = 0.5 - TIMING_WINDOW / 2;
  windowEnd = 0.5 + TIMING_WINDOW / 2;
  telegraph = '';
  pendingLevel = false;
  status: { kind: StatusKind; turns: number } | null = null;
  shield = 0;
  enemyDefense: number;
  private bonus: BadgeEffects;
  private move: MoveSource | null = null;
  private levelUps = 0;
  private boost = 0;
  private enemyTurnDone = false;

  constructor(readonly enemy: EnemyDef, bros: BroState[], items: Record<string, number>, private cb: BattleCallbacks, options: { badgeBonus?: BadgeEffects; powers?: string[] } = {}) {
    this.enemyHp = enemy.hp;
    this.enemyMaxHp = enemy.hp;
    this.enemyDefense = enemy.defense;
    this.bonus = options.badgeBonus ?? {};
    this.powers = options.powers ?? [];
    this.bros = bros.map((b) => ({
      ...b,
      maxHp: b.maxHp + (this.bonus.maxHp ?? 0),
      hp: Math.min(b.maxHp + (this.bonus.maxHp ?? 0), b.hp + (this.bonus.maxHp ?? 0)),
      power: b.power + (this.bonus.power ?? 0),
      defense: b.defense + (this.bonus.defense ?? 0),
      speed: b.speed + (this.bonus.speed ?? 0)
    }));
    this.items = { ...items };
    this.message = `${enemy.name} blocks the way!`;
    this.active = this.bros.find((b) => !b.fainted)?.id ?? 'pip';
  }

  private powers: string[];

  get view(): BattleView {
    return {
      phase: this.phase,
      message: this.message,
      enemyName: this.enemy.name,
      enemyId: this.enemy.id,
      enemyHp: Math.max(0, this.enemyHp),
      enemyMaxHp: this.enemyMaxHp,
      enemyColors: this.enemy.colors,
      bros: this.bros,
      activeBro: this.active,
      cursor: this.cursor,
      windowStart: this.windowStart,
      windowEnd: this.windowEnd,
      hits: this.hitCount,
      neededHits: this.neededHits,
      menu: this.menu(),
      bp: this.bp,
      items: { ...this.items },
      pendingLevel: this.pendingLevel,
      telegraph: this.telegraph,
      status: this.status ? `${this.status.kind.toUpperCase()} (${this.status.turns})` : '',
      shield: this.shield
    };
  }

  private menu(): { id: string; label: string; detail: string }[] {
    const bro = this.bros.find((b) => b.id === this.active)!;
    const list: { id: string; label: string; detail: string }[] = [
      { id: 'jump', label: 'JUMP', detail: 'Timed hop · extra hit on perfect' },
      { id: 'hammer', label: 'HAMMER', detail: 'Timed swing · heavy damage' }
    ];
    const hand = bro.id === 'pip' ? 'hand_fire' : 'hand_thunder';
    list.push({ id: hand, label: MOVE_BY_ID[hand].name, detail: 'Elemental hand attack' });
    const level = Math.max(
      this.bros[0].level, this.bros[1].level,
      ...this.powers.map((p) => POWER_BY_ID[p]?.unlockLevel ?? 0)
    );
    const powerMoves = powerMovesForLevel(level).filter((m) =>
      this.powers.length === 0 || this.powers.some((p) => POWER_BY_ID[p]?.moveId === m.id));
    for (const m of [...unlockedBros(level), ...powerMoves]) {
      if (this.bp >= (m.bp ?? 0)) list.push({ id: m.id, label: m.name, detail: `${m.bp} BP · ${m.description}` });
    }
    for (const [id, count] of Object.entries(this.items)) {
      if (count > 0) list.push({ id: `item_${id}`, label: ITEM_BY_ID[id].name.toUpperCase(), detail: `${count} left · ${ITEM_BY_ID[id].description}` });
    }
    return list;
  }

  select(id: string): boolean {
    if (this.phase !== 'command') return false;
    const entry = this.menu().find((m) => m.id === id);
    if (!entry) return false;
    this.cb.onSound('select');

    if (id.startsWith('item_')) {
      const itemId = id.slice(5);
      if (!this.items[itemId]) return false;
      this.items[itemId]--;
      const item = ITEM_BY_ID[itemId];
      const target = this.bros.find((b) => b.id === this.active)!;
      if (item.kind === 'heal') target.hp = Math.min(target.maxHp, target.hp + item.value);
      else if (item.kind === 'boost') this.boost += item.value;
      else {
        const down = this.bros.find((b) => b.fainted);
        if (down) { down.fainted = false; down.hp = Math.min(down.maxHp, item.value); this.active = down.id; }
      }
      this.message = `${item.name} used!`;
      this.phase = 'resolve';
      this.timer = 0.7;
      return true;
    }

    const def = MOVE_BY_ID[id];
    if (!def) return false;
    const costsBp = def.kind === 'bros' || def.kind === 'power';
    if (costsBp && this.bp < (def.bp ?? 0)) return false;
    if (costsBp) this.bp -= def.bp ?? 0;
    this.move = { id: def.id, label: def.name, detail: def.description, kind: def.kind, power: def.power, element: def.owner === 'pip' ? 'fire' : def.owner === 'pop' ? 'thunder' : undefined };
    if (def.id === 'bro_shield') this.shield = 1;
    this.hitCount = 0;
    this.neededHits = def.kind === 'bros' ? (def.id === 'star_combo' ? 3 : def.id === 'twin_cyclone' ? 3 : 2) : 1;
    this.cursor = 0;
    this.cursorDir = 1;
    const half = (TIMING_WINDOW + (this.bonus.timing ?? 0)) / 2;
    this.windowStart = 0.5 - half;
    this.windowEnd = 0.5 + half;
    this.message = `${def.name}! Press at the right moment!`;
    this.phase = 'timing';
    this.cb.onSound('select');
    return true;
  }

  /** Action-command press. Returns true if the press landed in the window. */
  press(): boolean {
    if (this.phase === 'timing') {
      const perfectHalf = (PERFECT_WINDOW + (this.bonus.perfect ?? 0)) / 2;
      const perfect = this.cursor >= 0.5 - perfectHalf && this.cursor <= 0.5 + perfectHalf;
      const good = this.cursor >= this.windowStart && this.cursor <= this.windowEnd;
      this.hitCount += good ? 1 : 0;
      this.cb.onSound(good ? 'timing' : 'miss');
      this.message = perfect ? 'PERFECT!' : good ? 'GOOD!' : 'Missed the timing...';
      if (good) {
        this.cursor = 0;
        this.cursorDir = 1;
        this.windowStart = Math.min(0.82, this.windowStart + 0.06);
        this.windowEnd = Math.min(0.98, this.windowEnd + 0.06);
        if (this.hitCount >= this.neededHits) this.resolveAttack(perfect);
      } else {
        this.resolveAttack(false);
      }
      return good;
    }
    if (this.phase === 'defend') {
      const good = this.cursor >= this.windowStart && this.cursor <= this.windowEnd;
      const attacker = this.bros.find((b) => b.id === this.active)!;
      if (good) {
        const counter = Math.round((6 + attacker.power + this.boost) * 0.7);
        this.enemyHp -= counter;
        this.message = `DODGE! Counter ${counter} damage!`;
        this.cb.onSound('counter');
      } else {
        const stunFactor = this.status?.kind === 'stun' ? 0.6 : 1;
        const dmg = Math.max(1, Math.round((this.enemy.attack - attacker.defense * 0.45) * stunFactor));
        attacker.hp = Math.max(0, attacker.hp - dmg);
        if (attacker.hp <= 0) { attacker.fainted = true; attacker.hp = 0; }
        this.message = `Hit! -${dmg} HP`;
        this.cb.onSound('hurt');
      }
      this.phase = 'resolve';
      this.timer = 0.8;
      this.enemyTurnDone = true;
      if (this.status && --this.status.turns <= 0) this.status = null;
      return good;
    }
    return false;
  }

  private resolveAttack(perfect: boolean) {
    const m = this.move!;
    const bro = this.bros.find((b) => b.id === this.active)!;
    let base = m.power + bro.power * 1.2 + this.boost - this.enemyDefense * 0.6;
    if (perfect) base *= 1.5 + (this.bonus.perfect ?? 0);
    else if (this.hitCount === 0) base *= 0.6;
    if (this.enemy.weak && (m.kind === this.enemy.weak || m.element === this.enemy.weak)) base *= 1.6;
    if (this.enemy.resist && (m.kind === this.enemy.resist || m.element === this.enemy.resist)) base *= 0.5;
    const dmg = Math.max(1, Math.round(base));
    this.enemyHp -= dmg;
    this.message = `${m.label} dealt ${dmg} damage!`;
    const status = MOVE_BY_ID[m.id]?.status;
    if (status) {
      this.status = { kind: status, turns: 2 };
      if (status === 'burn' || status === 'shock') {
        this.enemyHp -= 4;
        this.message += ` ${status.toUpperCase()} burns for 4!`;
      }
      if (status === 'defdown') this.enemyDefense = Math.max(0, this.enemyDefense - 4);
      if (status === 'stun') this.message += ' The enemy is stunned!';
    }
    this.cb.onSound(m.kind === 'hammer' || m.kind === 'bros' ? 'heavy' : 'hit');
    this.bp = Math.min(BP_MAX, this.bp + 1);
    this.phase = 'resolve';
    this.timer = 0.8;
  }

  update(dt: number) {
    if (this.phase === 'intro') {
      this.timer += dt;
      if (this.timer > 1.3) { this.phase = 'command'; this.timer = 0; }
      return;
    }
    if (this.phase === 'timing') {
      this.cursor += this.cursorDir * dt / TIMING_CYCLE;
      if (this.cursor >= 1) { this.cursor = 1; this.cursorDir = -1; }
      if (this.cursor <= 0) { this.cursor = 0; this.cursorDir = 1; }
      this.timer += dt;
      if (this.timer > 3 && this.hitCount === 0) this.resolveAttack(false);
      return;
    }
    if (this.phase === 'resolve') {
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.enemyHp <= 0) { this.victory(); return; }
      if (this.bros.every((b) => b.fainted)) { this.phase = 'defeat'; this.cb.onEnd({ won: false, xp: 0, levelUps: this.levelUps }); return; }
      this.phase = 'enemy';
      this.timer = 0;
      this.telegraph = this.enemy.telegraph.toUpperCase();
      this.message = `${this.enemy.name} attacks! ${this.telegraph} — press to defend!`;
      this.cb.onSound('warn');
      return;
    }
    if (this.phase === 'enemy') {
      this.timer += dt;
      if (this.shield > 0 && this.timer > 0.8 && !this.enemyTurnDone) {
        this.shield--;
        const counter = Math.round(10 + this.bros.find((b) => b.id === this.active)!.power * 0.6);
        this.enemyHp -= counter;
        this.message = `BROS. SHIELD! Counter ${counter} damage!`;
        this.cb.onSound('counter');
        this.enemyTurnDone = true;
        if (this.status && --this.status.turns <= 0) this.status = null;
        this.phase = 'resolve';
        this.timer = 0.7;
        return;
      }
      if (this.timer > 1.15 && !this.enemyTurnDone) {
        this.phase = 'defend';
        this.cursor = 0;
        this.cursorDir = 1;
        this.windowStart = 0.5 - DEFEND_WINDOW / 2;
        this.windowEnd = 0.5 + DEFEND_WINDOW / 2;
      }
      if (this.timer > 3.2) { this.enemyTurnDone = true; this.press(); }
      return;
    }
    if (this.phase === 'defend') {
      this.cursor += this.cursorDir * dt / TIMING_CYCLE;
      if (this.cursor >= 1) { this.cursor = 1; this.cursorDir = -1; }
      if (this.cursor <= 0) { this.cursor = 0; this.cursorDir = 1; }
      return;
    }
  }

  private victory() {
    this.phase = 'victory';
    this.enemyHp = 0;
    this.message = `${this.enemy.name} defeated! +${this.enemy.xp} XP`;
    this.cb.onSound('victory');
    for (const b of this.bros) {
      if (b.fainted) continue;
      b.xp += this.enemy.xp;
      while (b.level < MAX_LEVEL && b.xp >= b.level * XP_PER_LEVEL) {
        b.xp -= b.level * XP_PER_LEVEL;
        b.level++;
        b.maxHp += 6;
        b.hp = b.maxHp;
        this.levelUps++;
        this.pendingLevel = true;
      }
    }
    this.cb.onEnd({ won: true, xp: this.enemy.xp, levelUps: this.levelUps });
  }

  chooseLevelStat(stat: 'power' | 'defense' | 'speed') {
    if (!this.pendingLevel) return;
    const b = this.bros.find((x) => x.id === this.active) ?? this.bros[0];
    if (stat === 'power') b.power += 2;
    if (stat === 'defense') b.defense += 2;
    if (stat === 'speed') b.speed += 2;
    this.pendingLevel = false;
    this.message = `LEVEL UP! ${stat.toUpperCase()} increased.`;
  }
}
