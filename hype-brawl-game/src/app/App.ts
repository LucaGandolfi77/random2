import { AudioEngine } from '../audio/AudioEngine';
import { Simulation } from '../core/engine/Simulation';
import { InputManager, type BindAction } from '../core/input/InputManager';
import type { InputFrame } from '../core/input/InputTypes';
import type { MatchConfig, ItemFrequency, SimEvent } from '../core/game-state/types';
import { DebugOverlay } from '../debug/DebugOverlay';
import { PLAYABLE_FIGHTERS, ROSTER, getFighterDefinition, getRosterEntry, hexToCss, isPlayable } from '../fighters/roster';
import { ITEMS } from '../items/itemData';
import { PLAYABLE_STAGES, STAGES, getStageDefinition } from '../stages/stageData';
import type { StageEntry } from '../stages/types';
import { HUD } from '../ui/HUD';
import { TrainingPanel } from '../ui/TrainingPanel';
import { TouchControls } from '../ui/TouchControls';
import { GameRenderer } from './render/GameRenderer';
import { loadSetting, saveSetting } from '../utils/storage';

type Screen = 'title' | 'menu' | 'setup' | 'stages' | 'roster' | 'settings' | 'locked' | 'match';
type MatchSource = 'brawl' | 'training' | 'spectator';
type LockedKind = 'tournament' | 'online';

interface AppSettings {
  master: number;
  music: number;
  sfx: number;
  items: ItemFrequency;
  hazards: boolean;
  hitboxDebug: boolean;
  debugOverlay: boolean;
}

interface PlayerSetup {
  fighterId: string;
  human: boolean;
  colorIndex: number;
  team: 0 | 1;
}

interface SetupState {
  mode: 'stock' | 'time' | 'team' | 'training';
  playerCount: number;
  players: PlayerSetup[];
  stocks: number;
  timeLimit: number;
  items: ItemFrequency;
  hazards: boolean;
  stageId: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  master: 0.8,
  music: 0.55,
  sfx: 0.85,
  items: 'normal',
  hazards: true,
  hitboxDebug: false,
  debugOverlay: false,
};

const BIND_ACTIONS: Array<{ key: BindAction; label: string }> = [
  { key: 'left', label: 'MOVE LEFT' },
  { key: 'right', label: 'MOVE RIGHT' },
  { key: 'up', label: 'AIM UP' },
  { key: 'down', label: 'AIM DOWN' },
  { key: 'jump', label: 'JUMP' },
  { key: 'attack', label: 'ATTACK' },
  { key: 'strong', label: 'STRONG' },
  { key: 'special', label: 'SPECIAL' },
  { key: 'shield', label: 'SHIELD / DODGE' },
  { key: 'grab', label: 'GRAB' },
  { key: 'taunt', label: 'TAUNT / HYPE' },
];

const ITEM_LABELS: Record<ItemFrequency, string> = {
  off: 'OFF',
  low: 'LOW',
  normal: 'NORMAL',
  chaos: 'CHAOS',
};

const NEXT_ITEMS: Record<ItemFrequency, ItemFrequency> = {
  off: 'low',
  low: 'normal',
  normal: 'chaos',
  chaos: 'off',
};

function defaultPlayers(): PlayerSetup[] {
  return [
    { fighterId: 'nero', human: true, colorIndex: 0, team: 0 },
    { fighterId: 'velvet', human: false, colorIndex: 0, team: 1 },
    { fighterId: 'zia', human: false, colorIndex: 0, team: 1 },
    { fighterId: 'ace', human: false, colorIndex: 0, team: 0 },
  ];
}

function defaultSetup(settings: AppSettings, training: boolean): SetupState {
  return {
    mode: training ? 'training' : 'stock',
    playerCount: 2,
    players: defaultPlayers(),
    stocks: 3,
    timeLimit: 3,
    items: training ? 'off' : settings.items,
    hazards: training ? false : settings.hazards,
    stageId: 'last-festival',
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character] ?? character;
  });
}

function statBar(value: number): string {
  return `<span class="stat-bar">${Array.from({ length: 5 }, (_, index) => `<i class="${index < value ? 'filled' : ''}"></i>`).join('')}</span>`;
}

export class App {
  private readonly container: HTMLElement;
  private readonly uiRoot: HTMLElement;
  private readonly renderer: GameRenderer;
  private readonly input = new InputManager();
  private readonly audio = new AudioEngine();
  private readonly debugOverlay: DebugOverlay;
  private readonly touch: TouchControls;

  private screen: Screen = 'title';
  private settings: AppSettings;
  private setup: SetupState;
  private rosterSelection = 'nero';
  private rosterColor = 0;
  private rosterPurpose: 'select' | 'collection' = 'select';
  private stageSelection = 'last-festival';
  private lockedKind: LockedKind = 'tournament';

  private sim: Simulation | null = null;
  private hud: HUD | null = null;
  private trainingPanel: TrainingPanel | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  private matchSource: MatchSource = 'brawl';
  private lastConfig: MatchConfig | null = null;
  private paused = false;
  private resultsShown = false;
  private resultsScheduled = false;
  private resultsTimer: number | null = null;
  private accumulator = 0;
  private lastFrame = 0;
  private fps = 60;
  private frameTime = 16.67;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private lastDebugUpdate = 0;
  private readonly touchDevice =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  constructor(container: HTMLElement) {
    this.container = container;
    this.uiRoot = document.getElementById('ui-root') as HTMLElement;
    this.debugOverlay = new DebugOverlay(document.getElementById('debug-root') as HTMLElement);
    this.settings = loadSetting<AppSettings>('settings', DEFAULT_SETTINGS);
    this.setup = defaultSetup(this.settings, false);
    this.stageSelection = this.setup.stageId;
    this.renderer = new GameRenderer(document.getElementById('stage-canvas') as HTMLElement);
    this.renderer.setHitboxDebug(this.settings.hitboxDebug);
    this.debugOverlay.toggle(this.settings.debugOverlay);
    this.audio.setVolumes(this.settings.master, this.settings.music, this.settings.sfx);
    this.touch = new TouchControls(document.getElementById('app') as HTMLElement, this.input, () => {
      if (this.screen === 'match' && !this.resultsShown) this.togglePause();
    });
    this.touch.setVisible(false);

    this.uiRoot.addEventListener('click', this.onClick);
    this.uiRoot.addEventListener('change', this.onChange);
    this.uiRoot.addEventListener('input', this.onInput);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('pointerdown', this.unlockAudio, { once: true });
    window.addEventListener('keydown', this.unlockAudio, { once: true });
    this.input.onChange(() => {
      if (this.screen === 'settings') this.renderSettingsScreen();
    });
    this.input.refreshGamepads();
  }

  start(): void {
    this.showTitle();
    requestAnimationFrame(this.loop);
  }

  getActiveSimulation(): Simulation | null {
    return this.sim;
  }

  private showTitle(): void {
    this.screen = 'title';
    this.renderer.showMenuCast(PLAYABLE_FIGHTERS.map((fighter) => fighter.id));
    this.audio.playMusic('festival');
    this.uiRoot.innerHTML = `
      <div class="screen title-screen" data-action="title-start">
        <div class="title-badge">ORIGINAL BROWSER PLATFORM FIGHTER</div>
        <h1 class="game-logo"><span>HYPE</span><span>BRAWL</span></h1>
        <div class="game-subtitle">THE LAST VIRALITY</div>
        <div class="game-claim">EVERYONE WANTS THE SPOTLIGHT.</div>
        <button class="start-prompt" data-action="title-start">
          <span class="start-main">PRESS ENTER</span>
          <span class="start-sub">or click anywhere to enter</span>
        </button>
        <div class="title-footer">
          <span>60 HZ DETERMINISTIC COMBAT</span>
          <span>4 PLAYERS · GAMEPADS · TOUCH</span>
          <span>ORIGINAL CHARACTERS & ASSETS</span>
        </div>
      </div>
    `;
  }

  private showMenu(): void {
    this.screen = 'menu';
    this.renderer.showMenuCast(PLAYABLE_FIGHTERS.map((fighter) => fighter.id));
    this.audio.playMusic('festival');
    this.uiRoot.innerHTML = `
      <div class="screen menu-screen">
        <header class="menu-header">
          <div class="menu-logo">HYPE <span>BRAWL</span></div>
          <div class="menu-subtitle">THE LAST VIRALITY</div>
        </header>
        <nav class="main-menu" aria-label="Main menu">
          ${this.menuButton('play', '01', 'PLAY', 'QUICK BRAWL · LOCAL MULTIPLAYER · CPU')}
          ${this.menuButton('roster', '02', 'CHARACTER SELECT', 'THE ROSTER · STATS · PALETTES')}
          ${this.menuButton('training', '03', 'TRAINING', 'FRAME DATA · SANDBOX · DUMMY')}
          ${this.menuButton('spectator', '04', 'SPECTATOR', 'CPU VS CPU · FOUR FIGHTERS')}
          ${this.menuButton('tournament', '05', 'TOURNAMENT', 'NEXT MILESTONE', true)}
          ${this.menuButton('online', '06', 'ONLINE', 'NEXT MILESTONE', true)}
          ${this.menuButton('collection', '07', 'COLLECTION', '16 FIGHTERS · 4 PLAYABLE')}
          ${this.menuButton('settings', '08', 'SETTINGS', 'AUDIO · CONTROLS · DEBUG')}
        </nav>
        <aside class="menu-note">
          <div class="menu-note-title">NOW PLAYING</div>
          <div class="menu-note-stage">${escapeHtml(this.setup.stageId === 'last-festival' ? 'THE LAST FESTIVAL' : this.setup.stageId.toUpperCase())}</div>
          <p>4 complete fighters. 3 complete stages. Fixed 60 Hz combat. Original procedural art and audio.</p>
          <div class="menu-hint">F2 HITBOXES · F3 DEBUG</div>
        </aside>
      </div>
    `;
  }

  private menuButton(action: string, index: string, label: string, sub: string, disabled = false): string {
    return `
      <button class="menu-button" data-action="${action}" ${disabled ? 'data-locked="true"' : ''}>
        <span class="menu-index">${index}</span>
        <span class="menu-label">${label}</span>
        <span class="menu-sub">${sub}</span>
        <span class="menu-arrow">></span>
      </button>
    `;
  }

  private showSetup(reset: boolean): void {
    if (reset) {
      const training = this.screen === 'menu' && this.setup.mode === 'training';
      this.setup = defaultSetup(this.settings, training);
    }
    this.sanitizeSetup();
    this.screen = 'setup';
    this.renderer.showStagePreview(this.setup.stageId);
    this.renderSetupScreen();
  }

  private sanitizeSetup(): void {
    if (this.setup.mode === 'training') {
      this.setup.playerCount = 2;
      this.setup.players[0].human = true;
      this.setup.players[1].human = false;
    }
    for (let slot = 0; slot < 4; slot++) {
      const player = this.setup.players[slot];
      if (!player.human) continue;
      if (this.setup.mode === 'training' && slot > 0) player.human = false;
      if (slot > 1 && !this.humanSlotAvailable(slot)) player.human = false;
    }
    this.setup.playerCount = Math.max(2, Math.min(4, this.setup.playerCount));
  }

  private humanSlotAvailable(slot: number): boolean {
    if (slot < 2) return true;
    return this.input.connectedGamepads > slot;
  }

  private renderSetupScreen(): void {
    if (this.screen !== 'setup') return;
    const setup = this.setup;
    const training = setup.mode === 'training';
    const playerRows = Array.from({ length: setup.playerCount }, (_, slot) => {
      const player = setup.players[slot];
      const definition = getFighterDefinition(player.fighterId) ?? PLAYABLE_FIGHTERS[0];
      const palette = definition.palettes[player.colorIndex % definition.palettes.length];
      const humanAllowed =
        (slot < 2 || this.humanSlotAvailable(slot)) && (!training || slot === 0);
      const showTeam = setup.mode === 'team';
      const options = PLAYABLE_FIGHTERS.map(
        (entry) => `<option value="${entry.id}" ${entry.id === player.fighterId ? 'selected' : ''}>${escapeHtml(entry.name)}</option>`,
      ).join('');
      return `
        <div class="setup-player-row">
          <div class="setup-slot">
            <span class="slot-badge">P${slot + 1}</span>
            <span class="slot-source">${player.human ? (slot < 2 ? 'KEYBOARD / PAD' : 'GAMEPAD') : 'CPU'}</span>
          </div>
          <div class="type-toggle">
            <button class="${player.human ? 'active' : ''}" data-action="human" data-slot="${slot}" data-human="1" ${humanAllowed ? '' : 'disabled'}>HUMAN</button>
            <button class="${!player.human ? 'active' : ''}" data-action="human" data-slot="${slot}" data-human="0">CPU</button>
          </div>
          <select class="char-select" data-setup-char="${slot}" aria-label="Player ${slot + 1} fighter">${options}</select>
          <div class="palette-control">
            <button class="mini-arrow" data-action="color" data-slot="${slot}" data-dir="-1">‹</button>
            <span class="palette-swatch" style="--swatch:${hexToCss(palette.accent)};--swatch2:${hexToCss(palette.primary)}"></span>
            <button class="mini-arrow" data-action="color" data-slot="${slot}" data-dir="1">›</button>
            <span class="palette-name">${escapeHtml(palette.name)}</span>
          </div>
          ${showTeam ? `<button class="team-chip team-${player.team}" data-action="team" data-slot="${slot}">TEAM ${player.team === 0 ? 'PINK' : 'CYAN'}</button>` : ''}
        </div>
      `;
    }).join('');

    const timeControl = setup.mode === 'time';
    this.uiRoot.innerHTML = `
      <div class="screen setup-screen">
        <header class="screen-header">
          <button class="back-button" data-action="back">‹ BACK</button>
          <div>
            <div class="screen-kicker">LOCAL MATCH</div>
            <h2 class="screen-title">BRAWL SETUP</h2>
          </div>
          <div class="header-stats">${PLAYABLE_FIGHTERS.length} FIGHTERS · ${PLAYABLE_STAGES.length} STAGES</div>
        </header>
        <div class="setup-layout">
          <section class="setup-panel">
            <div class="panel-label">MODE</div>
            <div class="mode-tabs">
              ${this.modeTab('stock', 'STOCK', setup)}
              ${this.modeTab('time', 'TIME', setup)}
              ${this.modeTab('team', 'TEAM 2V2', setup)}
              ${this.modeTab('training', 'TRAINING', setup)}
            </div>
            <div class="panel-label">PLAYERS</div>
            <div class="player-count">
              ${[2, 3, 4].map((count) => `<button class="${setup.playerCount === count ? 'active' : ''}" data-action="player-count" data-count="${count}" ${training ? 'disabled' : ''}>${count} FIGHTERS</button>`).join('')}
            </div>
            <div class="setup-players">${playerRows}</div>
            <div class="setup-hint">${training ? 'Training mode: infinite stocks, dummy CPU, frame data panel.' : 'Human slots 1–2 use keyboard or gamepad. Slots 3–4 require three or four connected gamepads.'}</div>
            <div class="setup-tip">
              <b>QUICK CONTROLS</b>
              <span>P1 · A/D MOVE · W/SPACE JUMP · F ATTACK · G STRONG (HOLD) · H SPECIAL · J SHIELD · K GRAB · T TAUNT</span>
              <span>P2 · ARROWS MOVE · ENTER JUMP · , ATTACK · . STRONG · / SPECIAL · ; SHIELD · ' GRAB · \\ TAUNT</span>
              <span>GAMEPAD · A JUMP · B ATTACK · X STRONG · Y SPECIAL · LB SHIELD · RB GRAB · START PAUSE</span>
            </div>
          </section>
          <aside class="setup-side">
            <div class="panel-label">RULES</div>
            ${timeControl
              ? `<div class="stepper-row"><span>TIME</span><button data-action="time" data-dir="-1">−</button><b>${setup.timeLimit} MIN</b><button data-action="time" data-dir="1">+</button></div>`
              : `<div class="stepper-row"><span>STOCKS</span><button data-action="stocks" data-dir="-1" ${training ? 'disabled' : ''}>−</button><b>${setup.stocks}</b><button data-action="stocks" data-dir="1" ${training ? 'disabled' : ''}>+</button></div>`}
            <button class="wide-option" data-action="setup-items">ITEMS <b>${ITEM_LABELS[setup.items]}</b></button>
            <button class="wide-option ${setup.hazards ? 'on' : ''}" data-action="setup-hazards">STAGE HAZARDS <b>${setup.hazards ? 'ON' : 'OFF'}</b></button>
            <div class="panel-label">STAGE</div>
            <div class="stage-teaser">
              <span>${escapeHtml((getStageDefinition(setup.stageId)?.name ?? 'THE LAST FESTIVAL'))}</span>
              <small>${escapeHtml(getStageDefinition(setup.stageId)?.subtitle ?? '')}</small>
            </div>
            <button class="primary-button wide" data-action="choose-stage">CHOOSE STAGE</button>
            <div class="setup-side-note">${training ? 'ITEMS ARE DISABLED IN TRAINING' : 'ITEMS: OFF / LOW / NORMAL / CHAOS'}</div>
          </aside>
        </div>
      </div>
    `;
  }

  private modeTab(mode: SetupState['mode'], label: string, setup: SetupState): string {
    return `<button class="${setup.mode === mode ? 'active' : ''}" data-action="mode" data-mode="${mode}">${label}</button>`;
  }

  private showStages(): void {
    this.screen = 'stages';
    this.stageSelection = this.setup.stageId;
    this.renderer.showStagePreview(this.stageSelection);
    this.renderStageScreen();
  }

  private renderStageScreen(): void {
    if (this.screen !== 'stages') return;
    const stage = getStageDefinition(this.stageSelection) ?? PLAYABLE_STAGES[0];
    const cards = STAGES.map((entry) => this.stageCard(entry, this.stageSelection === entry.id)).join('');
    this.uiRoot.innerHTML = `
      <div class="screen stage-screen">
        <header class="screen-header">
          <button class="back-button" data-action="back">‹ BACK</button>
          <div>
            <div class="screen-kicker">SELECT YOUR BATTLEFIELD</div>
            <h2 class="screen-title">STAGE SELECT</h2>
          </div>
          <div class="header-stats">${PLAYABLE_STAGES.length} PLAYABLE · ${STAGES.length} TOTAL</div>
        </header>
        <div class="stage-preview"></div>
        <div class="stage-browser">
          <div class="stage-grid">${cards}</div>
          <aside class="stage-details">
            <div class="screen-kicker">${escapeHtml(stage.name)}</div>
            <p>${escapeHtml(stage.description)}</p>
            <div class="stage-meta">
              <span>${escapeHtml(stage.subtitle)}</span>
              <span>${stage.hazard ? 'HAZARD: ' + stage.hazard.type.toUpperCase() : 'NO HAZARD'}</span>
              <span>${stage.music.toUpperCase()} SOUNDTRACK</span>
            </div>
            <button class="primary-button" data-action="start-brawl">START BRAWL</button>
          </aside>
        </div>
      </div>
    `;
  }

  private stageCard(entry: StageEntry, selected: boolean): string {
    if (!entry.playable) {
      return `
        <div class="stage-card locked" aria-disabled="true">
          <div class="stage-card-art" style="--stage-accent:${hexToCss(entry.accent)}">
            <span class="lock-tag">COMING SOON</span>
          </div>
          <div class="stage-card-copy">
            <b>${escapeHtml(entry.name)}</b>
            <small>${escapeHtml(entry.subtitle)}</small>
          </div>
        </div>
      `;
    }
    return `
      <button class="stage-card ${selected ? 'selected' : ''}" data-action="stage-select" data-stage="${entry.id}">
        <div class="stage-card-art stage-art-${entry.id}" style="--stage-accent:${hexToCss(entry.theme.accent)};--stage-accent2:${hexToCss(entry.theme.accent2)}">
          <span class="stage-card-index">0${PLAYABLE_STAGES.findIndex((stage) => stage.id === entry.id) + 1}</span>
          <span class="stage-card-silhouette"></span>
        </div>
        <div class="stage-card-copy">
          <b>${escapeHtml(entry.name)}</b>
          <small>${escapeHtml(entry.subtitle)}</small>
        </div>
      </button>
    `;
  }

  private showRoster(purpose: 'select' | 'collection' = 'select'): void {
    this.screen = 'roster';
    this.rosterPurpose = purpose;
    if (!getRosterEntry(this.rosterSelection)) this.rosterSelection = 'nero';
    const def = getFighterDefinition(this.rosterSelection);
    if (def) this.renderer.showFighterPreview(def.id, this.rosterColor);
    else this.renderer.showMenuCast(PLAYABLE_FIGHTERS.map((fighter) => fighter.id));
    this.renderRosterScreen();
  }

  private renderRosterScreen(): void {
    if (this.screen !== 'roster') return;
    const entry = getRosterEntry(this.rosterSelection) ?? ROSTER[0];
    const playable = isPlayable(entry);
    const definition = playable ? entry : null;
    if (definition) {
      this.rosterColor = this.rosterColor % definition.palettes.length;
      this.renderer.showFighterPreview(definition.id, this.rosterColor);
    }
    const entryAccent = isPlayable(entry) ? entry.palettes[0].accent : entry.accent;
    const accent = definition ? definition.palettes[this.rosterColor].accent : entryAccent;
    const cards = ROSTER.map((fighter, index) => {
      const unlocked = isPlayable(fighter);
      const fighterAccent = unlocked ? fighter.palettes[0].accent : fighter.accent;
      return `
        <button class="roster-card ${this.rosterSelection === fighter.id ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-action="roster-select" data-fighter="${fighter.id}" style="--card-accent:${hexToCss(fighterAccent)}">
          <span class="roster-number">${String(index + 1).padStart(2, '0')}</span>
          <span class="roster-portrait"><span class="portrait-glyph">${escapeHtml(fighter.name.split(' ')[0].slice(0, 2))}</span></span>
          <span class="roster-card-name">${escapeHtml(fighter.name)}</span>
          <span class="roster-card-title">${escapeHtml(fighter.title)}</span>
          ${unlocked ? '' : '<span class="roster-lock">LOCKED</span>'}
        </button>
      `;
    }).join('');
    const details = definition
      ? `
        <div class="fighter-copy">
          <div class="screen-kicker" style="color:${hexToCss(accent)}">${escapeHtml(definition.title)}</div>
          <h2>${escapeHtml(definition.name)}</h2>
          <div class="fighter-archetype">${escapeHtml(definition.archetype)}</div>
          <p>${escapeHtml(definition.description)}</p>
          <div class="stat-grid">
            <div><span>POWER</span>${statBar(definition.statsBars.power)}</div>
            <div><span>SPEED</span>${statBar(definition.statsBars.speed)}</div>
            <div><span>WEIGHT</span>${statBar(definition.statsBars.weight)}</div>
            <div><span>RECOVERY</span>${statBar(definition.statsBars.recovery)}</div>
          </div>
          <div class="move-highlights">
            ${definition.moveHighlights.map((highlight) => `<span>${escapeHtml(highlight)}</span>`).join('')}
          </div>
          <div class="palette-row">
            ${definition.palettes.map((palette, index) => `
              <button class="palette-dot ${this.rosterColor === index ? 'active' : ''}" data-action="roster-color" data-index="${index}" style="--dot:${hexToCss(palette.primary)};--dot2:${hexToCss(palette.accent)}" title="${escapeHtml(palette.name)}"></button>
            `).join('')}
            <span class="palette-label">${escapeHtml(definition.palettes[this.rosterColor].name)}</span>
          </div>
        </div>
        ${this.rosterPurpose === 'select' ? '<button class="primary-button wide" data-action="roster-use">SELECT FOR PLAYER 1</button>' : ''}
      `
      : `
        <div class="fighter-copy">
          <div class="screen-kicker" style="color:${hexToCss(entryAccent)}">${escapeHtml(entry.title)}</div>
          <h2>${escapeHtml(entry.name)}</h2>
          <div class="fighter-archetype">${escapeHtml(entry.archetype)}</div>
          <p>${escapeHtml(entry.description)}</p>
          <div class="locked-note">This fighter does not have a complete moveset and animation set yet. The architecture is data-driven and ready for the next milestone.</div>
        </div>
      `;
    this.uiRoot.innerHTML = `
      <div class="screen roster-screen">
        <header class="screen-header">
          <button class="back-button" data-action="back">‹ BACK</button>
          <div>
            <div class="screen-kicker">HYPE K.O. UNIVERSE</div>
            <h2 class="screen-title">${this.rosterPurpose === 'collection' ? 'COLLECTION' : 'CHARACTER SELECT'}</h2>
          </div>
          <div class="header-stats">${PLAYABLE_FIGHTERS.length} PLAYABLE · ${ROSTER.length} IN DEVELOPMENT</div>
        </header>
        <div class="roster-layout">
          <div class="roster-grid">${cards}</div>
          <aside class="fighter-details" style="--fighter-accent:${hexToCss(accent)}">${details}</aside>
        </div>
      </div>
    `;
  }

  private showSettings(): void {
    this.screen = 'settings';
    this.renderer.showMenuCast(PLAYABLE_FIGHTERS.map((fighter) => fighter.id));
    this.audio.playMusic('festival');
    this.renderSettingsScreen();
  }

  private renderSettingsScreen(): void {
    if (this.screen !== 'settings') return;
    const bindings = this.input.bindingLabels;
    const bindingColumn = (slot: 0 | 1): string => `
      <div class="binding-column">
        <div class="panel-label">PLAYER ${slot + 1}</div>
        ${BIND_ACTIONS.map(({ key, label }) => `
          <div class="binding-row">
            <span>${label}</span>
            <button data-action="rebind" data-slot="${slot}" data-bind="${key}">${escapeHtml(bindings[slot][key])}</button>
          </div>
        `).join('')}
      </div>
    `;
    this.uiRoot.innerHTML = `
      <div class="screen settings-screen">
        <header class="screen-header">
          <button class="back-button" data-action="back">‹ BACK</button>
          <div>
            <div class="screen-kicker">SYSTEM</div>
            <h2 class="screen-title">SETTINGS</h2>
          </div>
          <div class="header-stats">LOCAL PREFERENCES</div>
        </header>
        <div class="settings-layout">
          <section class="settings-panel">
            <div class="panel-label">AUDIO</div>
            <label class="slider-row">MASTER <input type="range" min="0" max="100" value="${Math.round(this.settings.master * 100)}" data-volume="master"><b data-volume-label="master">${Math.round(this.settings.master * 100)}</b></label>
            <label class="slider-row">MUSIC <input type="range" min="0" max="100" value="${Math.round(this.settings.music * 100)}" data-volume="music"><b data-volume-label="music">${Math.round(this.settings.music * 100)}</b></label>
            <label class="slider-row">SFX <input type="range" min="0" max="100" value="${Math.round(this.settings.sfx * 100)}" data-volume="sfx"><b data-volume-label="sfx">${Math.round(this.settings.sfx * 100)}</b></label>
            <div class="panel-label">DEFAULTS</div>
            <button class="wide-option" data-action="settings-items">ITEMS <b>${ITEM_LABELS[this.settings.items]}</b></button>
            <button class="wide-option ${this.settings.hazards ? 'on' : ''}" data-action="toggle-hazards">STAGE HAZARDS <b>${this.settings.hazards ? 'ON' : 'OFF'}</b></button>
            <button class="wide-option ${this.settings.hitboxDebug ? 'on' : ''}" data-action="toggle-hitbox">HITBOX DEBUG <b>${this.settings.hitboxDebug ? 'ON' : 'OFF'}</b></button>
            <button class="wide-option ${this.settings.debugOverlay ? 'on' : ''}" data-action="toggle-debug">DEBUG OVERLAY <b>${this.settings.debugOverlay ? 'ON' : 'OFF'}</b></button>
            <div class="settings-note">Debug keys: F2 hitboxes, F3 overlay. Gamepads are auto-detected.</div>
          </section>
          <section class="bindings-panel">
            <div class="bindings-header">
              <div class="panel-label">CONTROLS</div>
              <button class="mini-button" data-action="reset-bindings">RESET DEFAULTS</button>
            </div>
            <div class="bindings-columns">
              ${bindingColumn(0)}
              ${bindingColumn(1)}
            </div>
            <div class="settings-note">Click a binding, then press a key. Escape cancels. Player 1 also merges gamepad 1; Player 2 merges gamepad 2.</div>
          </section>
        </div>
      </div>
    `;
  }

  private showLocked(kind: LockedKind): void {
    this.lockedKind = kind;
    this.screen = 'locked';
    this.renderer.showMenuCast(PLAYABLE_FIGHTERS.map((fighter) => fighter.id));
    this.audio.playMusic('festival');
    const tournament = kind === 'tournament';
    this.uiRoot.innerHTML = `
      <div class="screen locked-screen">
        <header class="screen-header">
          <button class="back-button" data-action="back">‹ BACK</button>
          <div>
            <div class="screen-kicker">NEXT MILESTONE</div>
            <h2 class="screen-title">${tournament ? 'TOURNAMENT' : 'ONLINE MULTIPLAYER'}</h2>
          </div>
          <div class="header-stats">NOT INCLUDED IN THIS BUILD</div>
        </header>
        <div class="locked-panel">
          <div class="locked-badge">ROADMAP</div>
          <h3>${tournament ? 'THE BRACKET IS BEING BUILT' : 'ROLLBACK NETCODE MILESTONE'}</h3>
          <p>${tournament
            ? 'Direct-elimination brackets for four to sixteen entrants, mixed human and CPU. The match engine already supports deterministic snapshots, so the bracket can drive real matches rather than simulated ones.'
            : 'The combat engine is deterministic and frame-based, with seeded RNG, input history, snapshots and render-independent simulation. Online play will synchronize frame-indexed inputs with rollback, not continuous positions. No fake online opponents are shipped.'}</p>
          <div class="roadmap-list">
            <span>2.5D PLATFORM FIGHTER CORE</span>
            <span>LOCAL MULTIPLAYER / CPU / SPECTATOR</span>
            <span>TOURNAMENT + ONLINE NETPLAY</span>
            <span>FULL 16-FIGHTER ROSTER</span>
          </div>
          <button class="primary-button" data-action="back">RETURN TO MENU</button>
        </div>
      </div>
    `;
  }

  private showSpectator(): void {
    const ids = ['nero', 'velvet', 'zia', 'ace'];
    const config: MatchConfig = {
      mode: 'spectator',
      players: ids.map((fighterId, index) => ({
        slot: index,
        fighterId,
        human: false,
        team: (index % 2) as 0 | 1,
        colorIndex: 0,
      })),
      stocks: 3,
      timeLimitSeconds: 180,
      items: 'normal',
      hazards: true,
      stageId: 'club-verticale',
      seed: this.randomSeed(),
      skipIntro: false,
    };
    this.startMatch(config, 'spectator');
  }

  private startBrawl(): void {
    const setup = this.setup;
    const players: MatchConfig['players'] = [];
    for (let slot = 0; slot < setup.playerCount; slot++) {
      const player = setup.players[slot];
      const human = player.human && (slot < 2 || this.humanSlotAvailable(slot));
      players.push({
        slot,
        fighterId: player.fighterId,
        human,
        team: setup.mode === 'team' ? player.team : 0,
        colorIndex: player.colorIndex,
      });
    }
    if (setup.mode === 'training') {
      players.length = Math.min(2, players.length);
      if (players[0]) players[0].human = true;
      if (players[1]) players[1].human = false;
    }
    const config: MatchConfig = {
      mode: setup.mode,
      players,
      stocks: setup.mode === 'training' ? 99 : setup.stocks,
      timeLimitSeconds: setup.mode === 'time' ? setup.timeLimit * 60 : 180,
      items: setup.mode === 'training' ? 'off' : setup.items,
      hazards: setup.mode === 'training' ? false : setup.hazards,
      stageId: setup.stageId,
      seed: this.randomSeed(),
      skipIntro: false,
      trainingOptions: setup.mode === 'training' ? { infiniteJumps: false, infiniteMeter: false } : undefined,
    };
    this.startMatch(config, setup.mode === 'training' ? 'training' : 'brawl');
  }

  private randomSeed(): number {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  }

  private startMatch(config: MatchConfig, source: MatchSource): void {
    this.cleanupMatch();
    this.screen = 'match';
    this.matchSource = source;
    this.lastConfig = { ...config, players: config.players.map((player) => ({ ...player })) };
    this.paused = false;
    this.resultsShown = false;
    this.resultsScheduled = false;
    this.accumulator = 0;
    this.uiRoot.innerHTML = '';
    const sim = new Simulation(config);
    this.sim = sim;
    this.renderer.startMatch(sim);
    this.hud = new HUD(this.uiRoot, sim, (slot) => {
      const fighter = sim.getFighter(slot);
      if (!fighter || fighter.isCPU) return 'CPU';
      if (slot > 1) return 'PAD';
      return this.input.playerUsesPad(slot) ? 'PAD' : 'KB';
    });
    if (config.mode === 'training') {
      this.trainingPanel = new TrainingPanel(this.uiRoot, sim, {
        reset: () => sim.trainingResetPositions(),
        setDummyDamage: (value) => sim.setTrainingDamage(1, value),
        toggleHitbox: () => this.toggleHitbox(),
        getHitbox: () => this.settings.hitboxDebug,
      });
    }
    this.pauseButton = document.createElement('button');
    this.pauseButton.className = 'match-pause';
    this.pauseButton.dataset.action = 'pause';
    this.pauseButton.textContent = 'II';
    this.pauseButton.setAttribute('aria-label', 'Pause');
    this.uiRoot.appendChild(this.pauseButton);
    const hasHumanP1 = sim.fighters.some((fighter) => fighter.slot === 0 && !fighter.isCPU);
    this.touch.setVisible(this.touchDevice && hasHumanP1);
    this.touch.reset();
    this.audio.playMusic(sim.stage.music);
    const humans = sim.fighters.filter((fighter) => !fighter.isCPU).length;
    this.hud.setHint(
      humans > 0
        ? 'P1  A/D MOVE · W/SPACE JUMP · F ATTACK · G STRONG (HOLD) · H SPECIAL · J SHIELD · K GRAB · T TAUNT'
        : 'SPECTATOR MODE · CPU VS CPU · ESC TO PAUSE',
      14000,
    );
    this.handleEvents(sim.drainEvents());
  }

  private cleanupMatch(): void {
    if (this.resultsTimer !== null) {
      window.clearTimeout(this.resultsTimer);
      this.resultsTimer = null;
    }
    this.resultsScheduled = false;
    this.resultsShown = false;
    this.hud?.destroy();
    this.hud = null;
    this.trainingPanel?.destroy();
    this.trainingPanel = null;
    this.pauseButton?.remove();
    this.pauseButton = null;
    this.touch.setVisible(false);
    this.touch.reset();
    this.renderer.leaveMatch();
    this.audio.stopMusic();
    this.sim = null;
    this.paused = false;
    this.uiRoot.innerHTML = '';
  }

  private showResults(): void {
    if (!this.sim || this.resultsShown) return;
    this.resultsShown = true;
    this.paused = true;
    this.touch.setVisible(false);
    if (this.pauseButton) this.pauseButton.style.display = 'none';
    const sim = this.sim;
    const winners = sim.fighters.filter((fighter) => sim.winners.includes(fighter.slot));
    const standings = [...sim.fighters].sort((a, b) => {
      const aw = sim.winners.includes(a.slot) ? 1 : 0;
      const bw = sim.winners.includes(b.slot) ? 1 : 0;
      if (aw !== bw) return bw - aw;
      return b.kos - a.kos || b.damageDealt - a.damageDealt || a.falls - b.falls;
    });
    const winnerName =
      winners.length === 0
        ? 'DRAW'
        : winners.length === 1
          ? winners[0].definition.name
          : winners.map((fighter) => fighter.definition.name).join(' + ');
    const winnerAccent = winners[0]
      ? hexToCss(winners[0].definition.palettes[winners[0].config.colorIndex % winners[0].definition.palettes.length].accent)
      : '#ff2d95';
    const rows = standings
      .map(
        (fighter, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="result-name" style="--row-accent:${hexToCss(fighter.definition.palettes[0].accent)}">${escapeHtml(fighter.definition.name)}${fighter.isCPU ? ' <small>CPU</small>' : ''}</td>
            <td>${fighter.kos}</td>
            <td>${fighter.falls}</td>
            <td>${Math.round(fighter.damageDealt)}%</td>
            <td>${Math.round(fighter.damageTaken)}%</td>
          </tr>
        `,
      )
      .join('');
    const stageButton =
      this.matchSource === 'spectator'
        ? ''
        : '<button class="ghost-button" data-action="results-stage">CHANGE STAGE</button>';
    const existing = this.uiRoot.querySelector('.results-overlay');
    existing?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'results-overlay';
    overlay.innerHTML = `
      <div class="results-panel" style="--winner-accent:${winnerAccent}">
        <div class="results-kicker">MATCH COMPLETE</div>
        <h2 class="results-winner">${escapeHtml(winnerName)}</h2>
        <div class="results-claim">TAKES THE SPOTLIGHT</div>
        <table class="results-table">
          <thead><tr><th>#</th><th>FIGHTER</th><th>KO</th><th>FALLS</th><th>DEALT</th><th>TAKEN</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="results-actions">
          <button class="primary-button" data-action="results-rematch">REMATCH</button>
          ${stageButton}
          <button class="ghost-button" data-action="results-menu">MAIN MENU</button>
        </div>
      </div>
    `;
    this.uiRoot.appendChild(overlay);
    this.uiRoot.querySelectorAll('.hud-announcement').forEach((element) => element.classList.remove('visible'));
    window.setTimeout(() => {
      if (this.screen === 'match' && this.resultsShown) this.audio.announce('VICTORY');
    }, 500);
  }

  private renderPauseOverlay(): void {
    if (this.screen !== 'match') return;
    this.uiRoot.querySelector('.pause-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'pause-overlay';
    overlay.innerHTML = `
      <div class="pause-panel">
        <div class="results-kicker">MATCH PAUSED</div>
        <h2>PAUSED</h2>
        <div class="pause-actions">
          <button class="primary-button" data-action="resume">RESUME</button>
          <button class="ghost-button ${this.settings.hitboxDebug ? 'on' : ''}" data-action="toggle-hitbox">HITBOXES: ${this.settings.hitboxDebug ? 'ON' : 'OFF'}</button>
          <button class="ghost-button ${this.settings.debugOverlay ? 'on' : ''}" data-action="toggle-debug">DEBUG: ${this.settings.debugOverlay ? 'ON' : 'OFF'}</button>
          <button class="ghost-button" data-action="restart">RESTART MATCH</button>
          <button class="ghost-button danger" data-action="quit">QUIT TO MENU</button>
        </div>
        <div class="pause-help">
          <div>P1: A/D MOVE · W/SPACE JUMP · F ATTACK · G STRONG · H SPECIAL · J SHIELD · K GRAB · T TAUNT</div>
          <div>P2: ARROWS MOVE · ENTER JUMP · , ATTACK · . STRONG · / SPECIAL · ; SHIELD · ' GRAB · \\ TAUNT</div>
          <div>GAMEPAD: A JUMP · B ATTACK · X STRONG · Y SPECIAL · LB SHIELD · RB GRAB · START PAUSE</div>
        </div>
      </div>
    `;
    this.uiRoot.appendChild(overlay);
  }

  private togglePause(force?: boolean): void {
    if (this.screen !== 'match' || this.resultsShown) return;
    this.paused = force ?? !this.paused;
    if (this.paused) {
      this.renderPauseOverlay();
      this.touch.setVisible(false);
      if (this.pauseButton) this.pauseButton.style.display = 'none';
    } else {
      this.uiRoot.querySelector('.pause-overlay')?.remove();
      this.touch.setVisible(this.touchDevice && Boolean(this.sim?.fighters.some((fighter) => fighter.slot === 0 && !fighter.isCPU)));
      if (this.pauseButton) this.pauseButton.style.display = '';
      this.accumulator = 0;
    }
  }

  private handleEvents(events: SimEvent[]): void {
    const sim = this.sim;
    if (!sim) return;
    for (const event of events) {
      this.renderer.handleEvent(event);
      switch (event.type) {
        case 'announce': {
          this.audio.announce(event.text);
          this.hud?.showAnnouncement(event.text, event.text === 'FIGHT' ? 900 : 1200, event.text === 'FIGHT' ? 'fight' : 'ready');
          break;
        }
        case 'hit': {
          this.audio.playHit(event.power, event.shielded, event.effect);
          break;
        }
        case 'ko': {
          const loser = sim.getFighter(event.player);
          const attacker = event.by !== null ? sim.getFighter(event.by) : null;
          this.audio.playKO();
          this.audio.announce('KNOCKOUT');
          this.hud?.flash('ko');
          this.hud?.showAnnouncement('KNOCKOUT', 900, 'ko');
          this.hud?.addFeed(
            attacker
              ? `${loser?.definition.name ?? 'FIGHTER'} LOST THE SPOTLIGHT · ${attacker.definition.name} +1 KO`
              : `${loser?.definition.name ?? 'FIGHTER'} FELL OUT OF FRAME`,
            loser ? hexToCss(loser.definition.palettes[0].accent) : '#ff2d95',
          );
          break;
        }
        case 'jump':
          this.audio.playJump(event.double);
          break;
        case 'land':
          this.audio.playLand();
          break;
        case 'shield':
          if (event.broken) {
            this.audio.playShieldBreak();
            this.hud?.showAnnouncement('SHIELD BREAK', 900, 'ko');
          }
          break;
        case 'hype': {
          const fighter = sim.getFighter(event.player);
          this.audio.playHype();
          this.hud?.flash('hype');
          this.hud?.addFeed(`${fighter?.definition.name ?? 'FIGHTER'} ACTIVATED HYPE MODE`, '#ffd319');
          break;
        }
        case 'charge':
          this.audio.playCharge();
          break;
        case 'clash':
          this.audio.playHit(35, false, 'flash');
          this.hud?.flash('white');
          break;
        case 'itemSpawn':
          this.audio.playItemSpawn();
          break;
        case 'itemPickup': {
          const fighter = sim.getFighter(event.player);
          this.audio.playItemPickup();
          this.hud?.addFeed(`${fighter?.definition.name ?? 'FIGHTER'} GRABBED ${ITEMS[event.kind].name}`, '#39f6ff');
          break;
        }
        case 'matchOver': {
          this.audio.stopMusic();
          this.audio.playVictory();
          this.audio.announce('GAME');
          this.hud?.showAnnouncement('GAME', 1600, 'game');
          if (!this.resultsScheduled) {
            this.resultsScheduled = true;
            this.resultsTimer = window.setTimeout(() => {
              if (this.sim && this.sim.finished) this.showResults();
            }, 1700);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private loop = (now: number): void => {
    const dtMs = this.lastFrame === 0 ? 16.67 : Math.min(50, now - this.lastFrame);
    this.lastFrame = now;
    this.fpsAccum += dtMs;
    this.fpsFrames++;
    if (this.fpsAccum >= 300) {
      this.fps = (this.fpsFrames * 1000) / this.fpsAccum;
      this.frameTime = this.fpsAccum / this.fpsFrames;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }
    const dt = dtMs / 1000;

    if (this.screen === 'match' && this.sim) {
      this.input.pollPause();
      if (this.input.consumePause() && !this.resultsShown) this.togglePause();
      if (!this.paused && !this.sim.finished) {
        this.accumulator += dtMs;
        const stepMs = 1000 / 60;
        let steps = 0;
        while (this.accumulator >= stepMs && steps < 5) {
          const inputs: Partial<Record<number, InputFrame>> = {};
          for (const fighter of this.sim.fighters) {
            if (fighter.config.human) inputs[fighter.slot] = this.input.getInput(fighter.slot);
          }
          this.sim.step(inputs);
          this.accumulator -= stepMs;
          steps++;
          this.handleEvents(this.sim.drainEvents());
        }
      } else {
        this.accumulator = 0;
      }
      const alpha = Math.min(1, this.accumulator / (1000 / 60));
      this.renderer.syncMatch(this.sim, alpha, dt);
      this.hud?.update(this.sim);
      this.trainingPanel?.update();
    } else {
      this.accumulator = 0;
      this.renderer.renderMenu(dt);
    }

    if (now - this.lastDebugUpdate > 250) {
      this.lastDebugUpdate = now;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gamepadDetail: string[] = [];
      const buttonLabels = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SEL', 'START', 'LS', 'RS', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
      for (const pad of pads) {
        if (!pad || !pad.connected) continue;
        const pressed = pad.buttons
          .map((button, index) => (button.pressed ? buttonLabels[index] ?? String(index) : null))
          .filter(Boolean)
          .join(' ');
        const axes = `${pad.axes[0]?.toFixed(2) ?? '0.00'},${pad.axes[1]?.toFixed(2) ?? '0.00'}`;
        gamepadDetail.push(`${pad.index}: ${pad.id.slice(0, 22)} · ${axes} · ${pressed || 'IDLE'}`);
      }
      this.debugOverlay.update({
        fps: this.fps,
        frameTime: this.frameTime,
        physicsFrame: this.sim?.frame ?? 0,
        players: this.sim?.fighters.length ?? 0,
        gamepads: this.input.connectedGamepads,
        gamepadDetail,
        touch: this.touch.isVisible,
        renderer: this.screen === 'match' ? 'MATCH' : 'MENU',
        stats: this.renderer.getStats(),
      });
    }

    requestAnimationFrame(this.loop);
  };

  private unlockAudio = (): void => {
    void this.audio.unlock();
  };

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || target.hasAttribute('disabled')) return;
    const action = target.dataset.action ?? '';
    this.ensureAudio();
    this.audio.playUI('click');
    switch (action) {
      case 'title-start':
        this.showMenu();
        break;
      case 'play':
        this.setup = defaultSetup(this.settings, false);
        this.showSetup(false);
        break;
      case 'roster':
        this.rosterPurpose = 'select';
        this.showRoster('select');
        break;
      case 'collection':
        this.rosterPurpose = 'collection';
        this.showRoster('collection');
        break;
      case 'training':
        this.setup = defaultSetup(this.settings, true);
        this.showSetup(false);
        break;
      case 'spectator':
        this.showSpectator();
        break;
      case 'tournament':
        this.showLocked('tournament');
        break;
      case 'online':
        this.showLocked('online');
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'back':
        this.goBack();
        break;
      case 'mode': {
        const mode = target.dataset.mode as SetupState['mode'];
        this.setup.mode = mode;
        if (mode === 'team') {
          this.setup.playerCount = Math.max(this.setup.playerCount, 4);
          this.setup.players[0].team = 0;
          this.setup.players[1].team = 0;
          this.setup.players[2].team = 1;
          this.setup.players[3].team = 1;
        }
        if (mode === 'training') {
          this.setup.playerCount = 2;
          this.setup.players[0].human = true;
          this.setup.players[1].human = false;
        }
        this.sanitizeSetup();
        this.renderSetupScreen();
        break;
      }
      case 'player-count': {
        this.setup.playerCount = Number(target.dataset.count ?? 2);
        this.sanitizeSetup();
        this.renderSetupScreen();
        break;
      }
      case 'human': {
        const slot = Number(target.dataset.slot ?? 0);
        const human = target.dataset.human === '1';
        if (human && slot > 1 && !this.humanSlotAvailable(slot)) return;
        if (human && this.setup.mode === 'training' && slot > 0) return;
        this.setup.players[slot].human = human;
        this.renderSetupScreen();
        break;
      }
      case 'color': {
        const slot = Number(target.dataset.slot ?? 0);
        const dir = Number(target.dataset.dir ?? 1);
        const player = this.setup.players[slot];
        const definition = getFighterDefinition(player.fighterId) ?? PLAYABLE_FIGHTERS[0];
        player.colorIndex = (player.colorIndex + dir + definition.palettes.length) % definition.palettes.length;
        this.renderSetupScreen();
        break;
      }
      case 'team': {
        const slot = Number(target.dataset.slot ?? 0);
        this.setup.players[slot].team = this.setup.players[slot].team === 0 ? 1 : 0;
        this.renderSetupScreen();
        break;
      }
      case 'stocks':
        this.setup.stocks = Math.max(1, Math.min(9, this.setup.stocks + Number(target.dataset.dir ?? 1)));
        this.renderSetupScreen();
        break;
      case 'time':
        this.setup.timeLimit = Math.max(1, Math.min(10, this.setup.timeLimit + Number(target.dataset.dir ?? 1)));
        this.renderSetupScreen();
        break;
      case 'setup-items':
        this.setup.items = NEXT_ITEMS[this.setup.items];
        this.renderSetupScreen();
        break;
      case 'setup-hazards':
        this.setup.hazards = !this.setup.hazards;
        this.renderSetupScreen();
        break;
      case 'choose-stage':
        this.showStages();
        break;
      case 'stage-select':
        this.stageSelection = target.dataset.stage ?? 'last-festival';
        this.setup.stageId = this.stageSelection;
        this.renderer.showStagePreview(this.stageSelection);
        this.renderStageScreen();
        break;
      case 'start-brawl':
        this.startBrawl();
        break;
      case 'roster-select': {
        const fighterId = target.dataset.fighter;
        if (!fighterId) return;
        this.rosterSelection = fighterId;
        this.rosterColor = 0;
        const definition = getFighterDefinition(fighterId);
        if (definition) this.renderer.showFighterPreview(fighterId, 0);
        else this.renderer.showMenuCast(PLAYABLE_FIGHTERS.map((fighter) => fighter.id));
        this.renderRosterScreen();
        break;
      }
      case 'roster-color': {
        const index = Number(target.dataset.index ?? 0);
        this.rosterColor = index;
        const definition = getFighterDefinition(this.rosterSelection);
        if (definition) this.renderer.showFighterPreview(definition.id, index);
        this.renderRosterScreen();
        break;
      }
      case 'roster-use': {
        this.setup = defaultSetup(this.settings, false);
        this.setup.players[0].fighterId = this.rosterSelection;
        this.setup.players[0].colorIndex = this.rosterColor;
        this.showSetup(false);
        break;
      }
      case 'rebind': {
        const slot = Number(target.dataset.slot ?? 0) as 0 | 1;
        const bind = target.dataset.bind as BindAction;
        target.textContent = 'PRESS KEY…';
        this.input.beginRebind(slot, bind);
        break;
      }
      case 'reset-bindings':
        this.input.resetBindings();
        break;
      case 'settings-items':
        this.settings.items = NEXT_ITEMS[this.settings.items];
        this.saveSettings();
        this.renderSettingsScreen();
        break;
      case 'toggle-hazards':
        this.settings.hazards = !this.settings.hazards;
        this.saveSettings();
        if (this.screen === 'settings') this.renderSettingsScreen();
        if (this.paused) this.renderPauseOverlay();
        break;
      case 'toggle-hitbox':
        this.toggleHitbox();
        if (this.screen === 'settings') this.renderSettingsScreen();
        if (this.paused) this.renderPauseOverlay();
        this.trainingPanel?.updateToggles();
        break;
      case 'toggle-debug':
        this.toggleDebug();
        if (this.screen === 'settings') this.renderSettingsScreen();
        if (this.paused) this.renderPauseOverlay();
        break;
      case 'pause':
        this.togglePause();
        break;
      case 'resume':
        this.togglePause(false);
        break;
      case 'restart':
        this.restartMatch();
        break;
      case 'quit':
        this.quitToMenu();
        break;
      case 'results-rematch':
        this.restartMatch();
        break;
      case 'results-stage':
        this.quitForStageSelect();
        break;
      case 'results-menu':
        this.quitToMenu();
        break;
      default:
        break;
    }
  };

  private onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    const slot = target.dataset.setupChar;
    if (slot !== undefined && this.screen === 'setup') {
      this.setup.players[Number(slot)].fighterId = target.value;
      this.setup.players[Number(slot)].colorIndex = 0;
      this.renderSetupScreen();
    }
  };

  private onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const volume = target.dataset.volume as 'master' | 'music' | 'sfx' | undefined;
    if (!volume) return;
    const value = Number(target.value) / 100;
    this.settings[volume] = value;
    this.audio.setVolumes(this.settings.master, this.settings.music, this.settings.sfx);
    const label = this.uiRoot.querySelector(`[data-volume-label="${volume}"]`);
    if (label) label.textContent = String(Math.round(value * 100));
    this.saveSettings();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'F2') {
      event.preventDefault();
      this.toggleHitbox();
      this.trainingPanel?.updateToggles();
      if (this.screen === 'settings') this.renderSettingsScreen();
      if (this.paused) this.renderPauseOverlay();
      return;
    }
    if (event.code === 'F3') {
      event.preventDefault();
      this.toggleDebug();
      if (this.screen === 'settings') this.renderSettingsScreen();
      if (this.paused) this.renderPauseOverlay();
      return;
    }
    if (event.code === 'Escape') {
      if (this.screen === 'match') {
        if (!this.resultsShown) this.togglePause();
      } else if (this.screen !== 'title') {
        this.goBack();
      }
      return;
    }
    if (this.screen === 'title' && (event.code === 'Enter' || event.code === 'Space')) {
      event.preventDefault();
      this.ensureAudio();
      this.showMenu();
    }
  };

  private goBack(): void {
    this.audio.playUI('back');
    switch (this.screen) {
      case 'menu':
        this.showTitle();
        break;
      case 'setup':
        this.showMenu();
        break;
      case 'stages':
        this.showSetup(false);
        break;
      case 'roster':
      case 'settings':
      case 'locked':
        this.showMenu();
        break;
      default:
        break;
    }
  }

  private toggleHitbox(): boolean {
    this.settings.hitboxDebug = !this.settings.hitboxDebug;
    this.renderer.setHitboxDebug(this.settings.hitboxDebug);
    this.saveSettings();
    return this.settings.hitboxDebug;
  }

  private toggleDebug(): void {
    this.settings.debugOverlay = !this.settings.debugOverlay;
    this.debugOverlay.toggle(this.settings.debugOverlay);
    this.saveSettings();
  }

  private saveSettings(): void {
    saveSetting('settings', this.settings);
  }

  private ensureAudio(): void {
    void this.audio.unlock();
  }

  private restartMatch(): void {
    if (!this.lastConfig) {
      this.showMenu();
      return;
    }
    const config: MatchConfig = {
      ...this.lastConfig,
      players: this.lastConfig.players.map((player) => ({ ...player })),
      seed: this.randomSeed(),
    };
    this.startMatch(config, this.matchSource);
  }

  private quitToMenu(): void {
    this.cleanupMatch();
    this.showMenu();
  }

  private quitForStageSelect(): void {
    if (this.matchSource === 'spectator') {
      this.quitToMenu();
      return;
    }
    this.cleanupMatch();
    this.showStages();
  }
}
