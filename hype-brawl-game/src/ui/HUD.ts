import type { Simulation } from '../core/engine/Simulation';
import type { Fighter } from '../fighters/Fighter';
import { hexToCss } from '../fighters/roster';

interface PlayerCard {
  root: HTMLElement;
  name: HTMLElement;
  damage: HTMLElement;
  stocks: HTMLElement;
  meterFill: HTMLElement;
  meterLabel: HTMLElement;
  ko: HTMLElement;
  combo: HTMLElement;
  control: HTMLElement;
  lastControl: string;
  lastDamage: number;
  lastStocks: number;
  lastKo: number;
  lastCombo: number;
  lastMeter: number;
}

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export class HUD {
  readonly root: HTMLDivElement;
  private cards = new Map<number, PlayerCard>();
  private timer: HTMLElement;
  private modeLabel: HTMLElement;
  private announcement: HTMLElement;
  private feed: HTMLElement;
  private hint: HTMLElement;
  private flashEl: HTMLElement;
  private announceTimeout: number | null = null;
  private hintTimeout: number | null = null;
  private readonly controls: (slot: number) => string;

  constructor(parent: HTMLElement, sim: Simulation, controls: (slot: number) => string) {
    this.controls = controls;
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-top-center">
        <div class="hud-mode"></div>
        <div class="hud-timer">0:00</div>
      </div>
      <div class="hud-announcement" aria-live="assertive"></div>
      <div class="hud-feed"></div>
      <div class="hud-hint"></div>
      <div class="screen-flash"></div>
    `;
    parent.appendChild(this.root);
    this.timer = this.root.querySelector('.hud-timer') as HTMLElement;
    this.modeLabel = this.root.querySelector('.hud-mode') as HTMLElement;
    this.announcement = this.root.querySelector('.hud-announcement') as HTMLElement;
    this.feed = this.root.querySelector('.hud-feed') as HTMLElement;
    this.hint = this.root.querySelector('.hud-hint') as HTMLElement;
    this.flashEl = this.root.querySelector('.screen-flash') as HTMLElement;

    const count = sim.fighters.length;
    const mode = sim.config.mode;
    this.modeLabel.textContent =
      mode === 'time'
        ? 'TIME BATTLE'
        : mode === 'team'
          ? 'TEAM BATTLE'
          : mode === 'training'
            ? 'TRAINING LAB'
            : mode === 'spectator'
              ? 'SPECTATOR'
              : 'STOCK BATTLE';

    sim.fighters.forEach((fighter, index) => {
      const color = fighter.config.team === 0 ? 0xff2d95 : 0x39f6ff;
      const palette = fighter.definition.palettes[fighter.config.colorIndex % fighter.definition.palettes.length];
      const card = document.createElement('div');
      card.className = `hud-card ${count <= 2 ? (index === 0 ? 'top-left' : 'top-right') : CORNERS[index] ?? 'top-left'}`;
      card.style.setProperty('--player-accent', hexToCss(mode === 'team' ? color : palette.accent));
      card.innerHTML = `
        <div class="hud-card-header">
          <span class="hud-slot">P${fighter.slot + 1}</span>
          <span class="hud-control"></span>
          <span class="hud-stocks"></span>
        </div>
        <div class="hud-name"></div>
        <div class="hud-damage-row">
          <span class="hud-damage">0%</span>
          <span class="hud-ko">KO 0</span>
        </div>
        <div class="hud-meter"><div class="hud-meter-fill"></div><span class="hud-meter-label">HYPE</span></div>
        <div class="hud-combo"></div>
      `;
      this.root.appendChild(card);
      const entry: PlayerCard = {
        root: card,
        name: card.querySelector('.hud-name') as HTMLElement,
        damage: card.querySelector('.hud-damage') as HTMLElement,
        stocks: card.querySelector('.hud-stocks') as HTMLElement,
        meterFill: card.querySelector('.hud-meter-fill') as HTMLElement,
        meterLabel: card.querySelector('.hud-meter-label') as HTMLElement,
        ko: card.querySelector('.hud-ko') as HTMLElement,
        combo: card.querySelector('.hud-combo') as HTMLElement,
        control: card.querySelector('.hud-control') as HTMLElement,
        lastControl: controls(fighter.slot),
        lastDamage: -1,
        lastStocks: -1,
        lastKo: -1,
        lastCombo: -1,
        lastMeter: -1,
      };
      entry.name.textContent = `${fighter.definition.name}${fighter.isCPU ? ' · CPU' : ''}`;
      entry.control.textContent = controls(fighter.slot);
      entry.root.classList.toggle('cpu', fighter.isCPU);
      this.cards.set(fighter.slot, entry);
    });
  }

  update(sim: Simulation): void {
    const timeMode = sim.config.mode === 'time';
    const seconds = timeMode ? sim.timeSeconds : Math.floor(sim.elapsedFrames / 60);
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    this.timer.textContent = `${minutes}:${remainder.toString().padStart(2, '0')}`;
    this.timer.classList.toggle('urgent', timeMode && sim.timeSeconds <= 10);

    for (const fighter of sim.fighters) {
      const card = this.cards.get(fighter.slot);
      if (!card) continue;
      this.updateCard(card, fighter, sim);
    }

    const intro = sim.introLabel;
    if (intro) {
      this.announcement.textContent = intro;
      this.announcement.classList.add('visible', intro === 'FIGHT' ? 'fight' : 'ready');
    } else if (this.announceTimeout === null) {
      this.announcement.classList.remove('visible', 'fight', 'ready');
    }
  }

  private updateCard(card: PlayerCard, fighter: Fighter, sim: Simulation): void {
    const damage = Math.round(fighter.damage);
    if (damage !== card.lastDamage) {
      card.lastDamage = damage;
      card.damage.textContent = `${damage}%`;
      card.damage.dataset.tier = damage < 50 ? 'low' : damage < 100 ? 'mid' : damage < 150 ? 'high' : 'danger';
    }
    const infiniteStocks = sim.config.mode === 'time' || sim.config.mode === 'training';
    if (infiniteStocks) {
      if (card.lastStocks !== -2) {
        card.lastStocks = -2;
        card.stocks.textContent = '∞';
        card.stocks.classList.add('infinite');
        card.stocks.classList.remove('eliminated');
      }
    } else {
      card.stocks.classList.remove('infinite');
      const stocks = fighter.eliminated ? 0 : fighter.stocks;
      if (stocks !== card.lastStocks) {
        card.lastStocks = stocks;
        card.stocks.textContent = '';
        for (let i = 0; i < stocks; i++) {
          const dot = document.createElement('span');
          dot.className = 'stock-dot';
          card.stocks.appendChild(dot);
        }
        card.stocks.classList.toggle('eliminated', fighter.eliminated);
      }
    }
    if (fighter.kos !== card.lastKo) {
      card.lastKo = fighter.kos;
      card.ko.textContent = `KO ${fighter.kos}`;
    }
    const meter = Math.round(fighter.meter);
    if (meter !== card.lastMeter) {
      card.lastMeter = meter;
      card.meterFill.style.width = `${meter}%`;
      card.meterLabel.textContent = meter >= 100 ? 'HYPE READY · TAUNT' : 'HYPE';
      card.root.classList.toggle('hype-ready', meter >= 100);
    }
    const combo = fighter.comboCount > 1 ? fighter.comboCount : 0;
    if (combo !== card.lastCombo) {
      card.lastCombo = combo;
      card.combo.textContent = combo > 0 ? `${combo} HIT COMBO` : '';
      card.combo.classList.toggle('visible', combo > 0);
    }
    const control = this.controls(fighter.slot);
    if (control !== card.lastControl) {
      card.lastControl = control;
      card.control.textContent = control;
    }
    card.root.classList.toggle('eliminated', fighter.eliminated);
    card.root.classList.toggle('hype-active', fighter.hypeFrames > 0);
    card.root.classList.toggle('invulnerable', fighter.invuln > 0 && !fighter.eliminated);
  }

  showAnnouncement(text: string, duration = 1200, style: 'ready' | 'fight' | 'ko' | 'game' = 'ready'): void {
    if (this.announceTimeout !== null) window.clearTimeout(this.announceTimeout);
    this.announcement.textContent = text;
    this.announcement.className = `hud-announcement visible ${style}`;
    this.announceTimeout = window.setTimeout(() => {
      this.announcement.classList.remove('visible', 'ready', 'fight', 'ko', 'game');
      this.announceTimeout = null;
    }, duration);
  }

  addFeed(text: string, accent = '#ff2d95'): void {
    const line = document.createElement('div');
    line.className = 'hud-feed-line';
    line.style.borderColor = accent;
    line.textContent = text;
    this.feed.appendChild(line);
    window.setTimeout(() => {
      line.classList.add('leaving');
      window.setTimeout(() => line.remove(), 400);
    }, 2600);
  }

  setHint(text: string, duration = 12000): void {
    this.hint.textContent = text;
    this.hint.classList.add('visible');
    if (this.hintTimeout !== null) window.clearTimeout(this.hintTimeout);
    this.hintTimeout = window.setTimeout(() => this.hint.classList.remove('visible'), duration);
  }

  flash(color: 'ko' | 'hype' | 'white' = 'white'): void {
    this.flashEl.className = `screen-flash flash-${color}`;
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('active');
    window.setTimeout(() => this.flashEl.classList.remove('active'), 350);
  }

  destroy(): void {
    if (this.announceTimeout !== null) window.clearTimeout(this.announceTimeout);
    if (this.hintTimeout !== null) window.clearTimeout(this.hintTimeout);
    this.root.remove();
  }
}
