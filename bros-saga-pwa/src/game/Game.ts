import { AREA_BY_ID } from '../data/areas';
import { initialBro } from '../data/bros';
import { ENEMY_BY_ID } from '../data/enemies';
import { InputManager } from '../input/InputManager';
import { TouchControls } from '../input/TouchControls';
import { Renderer } from '../render/Renderer';
import { AudioSystem } from '../systems/AudioSystem';
import { BadgeSystem } from '../systems/BadgeSystem';
import { MinigameSystem, type MinigameReward } from '../systems/MinigameSystem';
import { BADGE_BY_ID } from '../data/badges';
import { MINIGAME_BY_ID } from '../data/minigames';
import { powersForLevel } from '../data/powers';
import type { MinigameId } from './types';
import { BattleSystem } from '../systems/BattleSystem';
import { Overworld } from '../systems/Overworld';
import { UI } from '../ui/UI';
import type { BroState } from './types';

const SAVE_KEY = 'bros-saga:save';

interface SaveData {
  version: number;
  bros: BroState[];
  items: Record<string, number>;
  areaId: string;
  defeated: string[];
  coins?: number;
  badges?: string[];
  equipped?: string[];
}

type Mode = 'menu' | 'world' | 'battle' | 'minigame' | 'paused';

export class Game {
  mode: Mode = 'menu';
  bros: BroState[] = [initialBro('pip'), initialBro('pop')];
  items: Record<string, number> = { mushroom: 2, pepper: 1, oneup: 1 };
  bp = 3;
  coins = 0;
  badges = new BadgeSystem();
  minigame: MinigameSystem;
  defeated: string[] = [];
  areaId = 'plains';
  readonly input = new InputManager();
  readonly renderer: Renderer;
  readonly audio = new AudioSystem();
  readonly ui: UI;
  readonly touch: TouchControls;
  world: Overworld;
  battle: BattleSystem | null = null;
  private last = performance.now();
  private time = 0;
  private prevA = false;
  private prevB = false;
  private miniResultTimer = 0;
  private battleWon = false;

  constructor(app: HTMLElement, canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.minigame = new MinigameSystem((r) => this.onMinigameReward(r));
    this.ui = new UI(app, {
      onNew: () => this.newGame(),
      onContinue: () => this.loadGame(),
      onIntroDone: () => { this.mode = 'world'; this.touch.show(); this.audio.music(true); },
      onCommand: (id) => this.battle?.select(id),
      onPress: () => this.battle?.press(),
      onLevelStat: (stat) => this.battle?.chooseLevelStat(stat),
      onMinigame: (id) => this.startMinigame(id as MinigameId),
      onMinigamePress: (useA) => this.minigame.press(useA),
      onBadges: () => this.ui.badges(this.badges, this.coins),
      onBadgeToggle: (id) => { this.badges.toggle(id); this.ui.badges(this.badges, this.coins); this.save(); },
      onBuyBadge: (id) => this.buyBadge(id),
      onBattleContinue: () => this.afterBattle(),
      onPause: () => this.togglePause(),
      onResume: () => this.resume(),
      onMenu: () => this.toMenu(),
      onVolume: (v) => this.audio.setVolume(v)
    });
    this.touch = new TouchControls(app, this.input, () => this.togglePause());
    this.world = new Overworld({
      onEncounter: (kind, preemptive) => this.startBattle(kind, preemptive),
      onExit: (to, dir) => this.changeArea(to, dir),
      onChest: (item) => { this.items[item] = (this.items[item] ?? 0) + 1; this.save(); },
      onSound: (n) => this.audio.play(n),
      onDialogue: (t) => this.ui.dialogue(t)
    });
    this.input.onMenu = () => this.togglePause();
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.ui.main(this.hasSave());
    requestAnimationFrame(() => this.loop());
  }

  private hasSave(): boolean {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  private newGame() {
    this.audio.ensure();
    this.bros = [initialBro('pip'), initialBro('pop')];
    this.items = { mushroom: 2, pepper: 1, oneup: 1 };
    this.bp = 3;
    this.coins = 0;
    this.badges = new BadgeSystem();
    this.defeated = [];
    this.areaId = 'plains';
    this.battle = null;
    this.syncPowers();
    this.world.load('plains');
    this.input.clear();
    this.ui.intro();
    this.touch.show();
    this.audio.music(true);
    this.save();
  }

  private loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1 && data.version !== 2) return;
      this.bros = data.bros;
      this.items = data.items;
      this.defeated = data.defeated ?? [];
      this.areaId = data.areaId;
      this.coins = data.coins ?? 0;
      this.badges = new BadgeSystem(data.badges ?? [], data.equipped ?? []);
      this.battle = null;
      this.world.load(this.areaId);
      this.syncPowers();
      this.mode = 'world';
      this.ui.hideScreen();
      this.ui.showWorld();
      this.touch.show();
      this.audio.ensure();
      this.audio.music(true);
    } catch { /* corrupted save ignored */ }
  }

  private syncPowers() {
    const level = Math.max(this.bros[0].level, this.bros[1].level);
    this.world.powers = powersForLevel(level);
  }

  private startMinigame(id: MinigameId) {
    const def = MINIGAME_BY_ID[id];
    if (!def) return;
    this.audio.ensure();
    this.mode = 'minigame';
    this.input.clear();
    this.touch.show();
    this.minigame.start(id);
    this.miniResultTimer = 0;
    this.ui.showMinigame(def.name);
  }

  private onMinigameReward(r: MinigameReward) {
    this.coins += r.coins;
    this.bp = Math.min(10, this.bp + r.bp);
    if (r.badge) this.badges.add(r.badge);
    if (r.item) this.items[r.item] = (this.items[r.item] ?? 0) + 1;
    this.ui.dialogue(r.won ? `Minigame cleared! +${r.coins} coins, +${r.bp} BP` : `Practice round: +${r.coins} coins`, 4);
    this.save();
  }

  private buyBadge(id: string) {
    const def = BADGE_BY_ID[id];
    if (!def || this.coins < def.cost) return;
    this.coins -= def.cost;
    this.badges.add(id);
    this.badges.toggle(id);
    this.ui.badges(this.badges, this.coins);
    this.audio.play('coin');
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 2, bros: this.bros, items: this.items, areaId: this.areaId,
        defeated: this.defeated, coins: this.coins, badges: this.badges.owned, equipped: this.badges.equipped
      } satisfies SaveData));
    } catch { /* storage unavailable */ }
  }

  private onKey(e: KeyboardEvent) {
    if (this.mode !== 'battle' || !this.battle) return;
    if (/^Digit[1-9]$/.test(e.code)) {
      const idx = Number(e.code.slice(-1)) - 1;
      const entry = this.battle.view.menu[idx];
      if (entry) this.battle.select(entry.id);
    }
  }

  private changeArea(to: string, dir: 'left' | 'right') {
    if (!AREA_BY_ID[to]) return;
    this.areaId = to;
    this.world.load(to, dir);
    this.ui.dialogue(`${AREA_BY_ID[to].name} — ${AREA_BY_ID[to].subtitle}`, 4);
    this.audio.play('select');
    this.save();
  }

  private startBattle(kind: string, preemptive: boolean) {
    if (this.mode !== 'world') return;
    const base = ENEMY_BY_ID[kind];
    if (!base) return;
    const enemy = preemptive ? { ...base, hp: Math.max(1, Math.round(base.hp * 0.7)) } : base;
    this.mode = 'battle';
    this.input.clear();
    this.touch.hide();
    this.audio.play('warn');
    this.battle = new BattleSystem(enemy, this.bros, this.items, {
      onSound: (n) => this.audio.play(n),
      onEnd: (res) => {
        this.battleWon = res.won;
        this.bros = this.battle!.bros.map((b) => ({ ...b }));
        this.items = { ...this.battle!.items };
        this.bp = this.battle!.bp;
        if (res.won) {
          if (!this.defeated.includes(enemy.id)) this.defeated.push(enemy.id);
          this.coins += Math.max(1, Math.round(enemy.xp / 12)) + (this.badges.bonus().loot ?? 0);
          this.syncPowers();
        }
        this.save();
      }
    }, { badgeBonus: this.badges.bonus(), powers: this.world.powers });
    if (preemptive) this.battle.enemyHp = Math.round(enemy.hp);
    this.ui.showBattle();
    this.ui.updateBattle(this.battle.view);
  }

  private afterBattle() {
    if (!this.battle) return;
    if (this.battleWon && (this.battle.view.enemyId === 'skytyrant' || this.battle.view.enemyId === 'starling')) {
      this.battle = null;
      this.mode = 'menu';
      this.ui.showEnding();
      this.touch.hide();
      return;
    }
    if (!this.battleWon) {
      this.bros.forEach((b) => { b.hp = b.fainted ? Math.max(1, Math.floor(b.maxHp / 2)) : b.maxHp; b.fainted = false; });
      this.world.load(this.areaId);
    }
    this.battle = null;
    this.mode = 'world';
    this.ui.hideBattle();
    this.ui.showWorld();
    this.touch.show();
    this.audio.music(true);
    this.save();
  }

  private togglePause() {
    if (this.mode === 'world' || this.mode === 'battle' || this.mode === 'minigame') {
      this.pausedFrom = this.mode;
      this.mode = 'paused';
      this.touch.hide();
      this.ui.pause();
      this.audio.music(false);
    } else if (this.mode === 'paused') this.resume();
  }

  private pausedFrom: Mode = 'world';
  private resume() {
    this.mode = this.pausedFrom;
    this.ui.hideScreen();
    if (this.mode === 'world') { this.ui.showWorld(); this.touch.show(); }
    else if (this.mode === 'battle' && this.battle) { this.ui.showBattle(); }
    else if (this.mode === 'minigame') { this.ui.showMinigame(MINIGAME_BY_ID[this.minigame.def?.id ?? 'coinrush'].name); }
    this.audio.music(true);
  }

  private toMenu() {
    this.save();
    this.mode = 'menu';
    this.battle = null;
    this.touch.hide();
    this.audio.music(false);
    this.ui.hideBattle();
    this.ui.hideMinigame();
    this.ui.hideWorld();
    this.ui.main(this.hasSave());
  }

  private loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const input = this.input.frame();

    if (this.mode === 'world') {
      this.world.update(dt, input);
      this.ui.updateWorld(this.world, this.bros, this.items);
    } else if (this.mode === 'battle' && this.battle) {
      const press = input.a && !this.prevA;
      if (press) this.battle.press();
      this.battle.update(dt);
      this.ui.updateBattle(this.battle.view);
    } else if (this.mode === 'minigame') {
      if (input.a && !this.prevA) this.minigame.press(true);
      else if (input.b && !this.prevB) this.minigame.press(false);
      this.minigame.update(dt);
      this.ui.updateMinigame(this.minigame.view);
      if (this.minigame.phase === 'result') {
        this.miniResultTimer += dt;
        if (this.miniResultTimer > 2.4) {
          this.miniResultTimer = 0;
          this.minigame.cancel();
          this.mode = 'world';
          this.ui.hideMinigame();
          this.ui.showWorld();
        }
      }
    }
    this.prevA = input.a;
    this.prevB = input.b;

    this.ui.update(dt);
    this.audio.update(dt);
    if (this.mode === 'world') this.renderer.renderWorld(this.world, this.time);
    else if (this.mode === 'battle' && this.battle) this.renderer.renderBattle(this.battle.view, this.time);
    else if (this.mode === 'minigame') this.renderer.renderMinigame(this.minigame.view, this.time);
    else this.renderer.renderWorld(this.world, this.time);
  }

  /** Debug helpers for the automated smoke test. */
  debugStartBattle(kind = 'grubbo') { this.startBattle(kind, false); }
  debugWinBattle() { if (this.battle) this.battle.enemyHp = 0; }
}
