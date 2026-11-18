import { FIGHTERS } from '../data/fighters';
import type { Fighter } from '../entities/Fighter';
import type { Progression } from '../systems/Progression';
import type { RoundSystem } from '../systems/RoundSystem';
import { spriteFactory } from '../render/SpriteFactory';

export interface UICallbacks {
  onArcade: () => void;
  onQuick: () => void;
  onStory: () => void;
  onTeam: (main: string, assists: [string, string]) => void;
  onFight: () => void;
  onNext: () => void;
  onResume: () => void;
  onMenu: () => void;
  onSetting: (key: string, value: string | number | boolean) => void;
}

type Screen = 'none' | 'main' | 'select' | 'support' | 'arcade' | 'result' | 'pause' | 'settings' | 'credits' | 'howto' | 'clear';

export class UI {
  readonly root: HTMLElement;
  readonly hudRoot: HTMLElement;
  current: Screen = 'none';
  private selected = '';
  private supports: string[] = [];
  private supportSlot = 0;
  private bannerTimer = 0;
  private comboTimer = 0;
  private pName!: HTMLElement;
  private eName!: HTMLElement;
  private pFill!: HTMLElement;
  private eFill!: HTMLElement;
  private pLag!: HTMLElement;
  private eLag!: HTMLElement;
  private pEnergy!: HTMLElement;
  private eEnergy!: HTMLElement;
  private timerEl!: HTMLElement;
  private dots!: HTMLElement;
  private comboEl!: HTMLElement;
  private assistEl!: HTMLElement;
  private bannerEl!: HTMLElement;

  constructor(container: HTMLElement, private cb: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'screen hidden';
    container.appendChild(this.root);
    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'hud hidden';
    this.hudRoot.innerHTML = `
      <div class="hud-top">
        <div class="hp-side"><div class="hp-label" id="hud-pname">PLAYER</div>
          <div class="hp-track"><div class="hp-lag" id="hud-plag"></div><div class="hp-fill" id="hud-pfill"></div></div>
          <div class="energy-track"><div class="energy-fill" id="hud-penergy"></div></div></div>
        <div><div class="timer" id="hud-timer">60</div><div class="round-dots" id="hud-dots"></div></div>
        <div class="hp-side enemy"><div class="hp-label" id="hud-ename" style="text-align:right">RIVAL</div>
          <div class="hp-track"><div class="hp-lag" id="hud-elag"></div><div class="hp-fill" id="hud-efill"></div></div>
          <div class="energy-track"><div class="energy-fill" id="hud-eenergy"></div></div></div>
      </div>
      <div class="combo" id="hud-combo"></div>
      <div class="assist-hud" id="hud-assists"></div>
      <div class="banner" id="hud-banner"></div>`;
    container.appendChild(this.hudRoot);
    const q = (s: string) => this.hudRoot.querySelector(s) as HTMLElement;
    this.pName = q('#hud-pname'); this.eName = q('#hud-ename');
    this.pFill = q('#hud-pfill'); this.eFill = q('#hud-efill');
    this.pLag = q('#hud-plag'); this.eLag = q('#hud-elag');
    this.pEnergy = q('#hud-penergy'); this.eEnergy = q('#hud-eenergy');
    this.timerEl = q('#hud-timer'); this.dots = q('#hud-dots');
    this.comboEl = q('#hud-combo'); this.assistEl = q('#hud-assists'); this.bannerEl = q('#hud-banner');
  }

  hide() { this.current = 'none'; this.root.classList.add('hidden'); }
  hideHud() { this.hudRoot.classList.add('hidden'); }
  showHud() { this.hudRoot.classList.remove('hidden'); }

  private show(name: Screen, html: string) {
    this.current = name;
    this.root.innerHTML = `<div class="panel">${html}</div>`;
    this.root.classList.remove('hidden');
  }

  private wire(map: Record<string, () => void>) {
    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((el) => el.addEventListener('click', () => map[el.dataset.a!]?.()));
  }

  main(p: Progression) {
    this.hideHud();
    this.show('main', `
      <div class="subtitle">A MOBILE-FIRST ARENA FIGHTER</div>
      <h1 class="title">GIGANT<br>BATTLE</h1>
      <p class="lead">Pick a captain, bring two supports, and fight through eight battles.
      Light and heavy attacks, specials, dodges, assists and tag-team combos.</p>
      <div class="menu-actions">
        <button class="btn primary" data-a="story">Story Mode <span>10 CHAPTERS · ${Math.min(p.data.storyChapter + 1, 10)}/10</span></button>
        <button class="btn" data-a="arcade">Arcade Mode <span>8 BATTLES · ${p.data.arcadeBest} BEST</span></button>
        <button class="btn" data-a="quick">Quick Match <span>SINGLE FIGHT</span></button>
        <button class="btn" data-a="howto">How to Play <span>CONTROLS &amp; RULES</span></button>
        <button class="btn" data-a="settings">Settings <span>AUDIO · GRAPHICS</span></button>
        <button class="btn" data-a="credits">Credits <span>ABOUT</span></button>
      </div>
      <div class="footer-note">${p.unlockedCount()} / 8 fighters unlocked · ${p.data.wins} wins<br>
      Touch: left joystick to move and jump, buttons to attack, dodge, block and call supports. Keyboard: A/D, W, J, K, L, Shift, B, U, O.</div>`);
    this.wire({
      story: () => this.cb.onStory(),
      arcade: () => this.cb.onArcade(),
      quick: () => this.cb.onQuick(),
      howto: () => this.howto(),
      settings: () => this.settings('main'),
      credits: () => this.credits()
    });
  }

  private card(f: (typeof FIGHTERS)[number], unlocked: boolean): string {
    const sel = this.selected === f.id;
    return `<button class="fighter-card ${unlocked ? '' : 'locked'} ${sel ? 'selected' : ''}" data-f="${f.id}" ${unlocked ? '' : 'disabled'}>
      <canvas width="24" height="32" data-sprite="${f.id}"></canvas>
      <b>${unlocked ? f.name.split(' ')[0] : 'LOCKED'}</b><small>${f.role}</small>
      <span class="stat-bars"><span>PWR ${f.stats.power}</span><span>SPD ${f.stats.speed}</span></span>
    </button>`;
  }

  private paintSprites() {
    this.root.querySelectorAll<HTMLCanvasElement>('[data-sprite]').forEach((c) => {
      const f = FIGHTERS.find((x) => x.id === c.dataset.sprite);
      if (!f) return;
      const src = spriteFactory.get(f, 'idle', 0, 1);
      c.getContext('2d')!.drawImage(src, 0, 0);
    });
  }

  select(p: Progression) {
    const unlocked = (id: string) => p.isUnlocked(id);
    this.show('select', `
      <div class="subtitle">STEP 1 · CHOOSE YOUR FIGHTER</div>
      <h2>Captain selection</h2>
      <div class="roster">${FIGHTERS.map((f) => this.card(f, unlocked(f.id))).join('')}</div>
      <div class="info-box" id="sel-info">${this.selected ? this.info(this.selected) : 'Select a fighter to see their stats and special move.'}</div>
      <div class="btn-row"><button class="btn primary" data-a="next">Continue <span>SUPPORT TEAM</span></button>
      <button class="btn" data-a="back">Back</button></div>`);
    this.paintSprites();
    this.root.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => el.addEventListener('click', () => {
      this.selected = el.dataset.f!;
      this.select(p);
    }));
    this.wire({ next: () => { if (this.selected) this.support(p); }, back: () => this.main(p) });
  }

  private info(id: string): string {
    const f = FIGHTERS.find((x) => x.id === id)!;
    return `<b class="gold">${f.name}</b> — ${f.tagline}<br>
      Power ${f.stats.power}/10 · Speed ${f.stats.speed}/10 · Defense ${f.stats.defense}/10 · Reach ${f.stats.reach}/10<br>
      <span class="red">SPECIAL:</span> ${f.special.toUpperCase()} (${f.specialCost} energy)`;
  }

  support(p: Progression) {
    this.supportSlot = 0;
    this.supports = [];
    this.renderSupport(p);
  }

  private renderSupport(p: Progression) {
    this.show('support', `
      <div class="subtitle">STEP 2 · PICK TWO SUPPORTS</div>
      <h2>Support team</h2>
      <p class="lead">Support 1: <span class="gold">${this.supports[0] ? FIGHTERS.find((f) => f.id === this.supports[0])!.name : 'choose'}</span>
      &nbsp;·&nbsp; Support 2: <span class="gold">${this.supports[1] ? FIGHTERS.find((f) => f.id === this.supports[1])!.name : 'choose'}</span></p>
      <div class="roster">${FIGHTERS.filter((f) => f.id !== this.selected).map((f) => this.card(f, p.isUnlocked(f.id))).join('')}</div>
      <div class="btn-row"><button class="btn primary" data-a="fight">Start Battle <span>ENTER THE ARENA</span></button>
      <button class="btn" data-a="back">Back</button></div>`);
    this.paintSprites();
    this.root.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => el.addEventListener('click', () => {
      const id = el.dataset.f!;
      if (this.supports.includes(id)) return;
      this.supports[this.supportSlot] = id;
      this.supportSlot = this.supportSlot === 0 ? 1 : 0;
      this.renderSupport(p);
    }));
    this.wire({
      fight: () => {
        if (this.supports.length >= 2) this.cb.onTeam(this.selected, [this.supports[0], this.supports[1]]);
      },
      back: () => this.select(p)
    });
  }

  arcade(seed: number, p: Progression, foe: string, stage: string) {
    this.hideHud();
    const steps = Array.from({ length: 8 }, (_, i) => {
      const cls = i < seed ? 'done' : i === seed ? 'current' : '';
      return `<div class="arcade-step ${cls}"><b>${i + 1}</b><span>${i === seed ? `${foe} · ${stage}` : i < seed ? 'Cleared' : 'Unknown rival'}</span></div>`;
    }).join('');
    this.show('arcade', `
      <div class="subtitle">ARCADE ROUTE</div>
      <h2>Battle ${Math.min(seed + 1, 8)} of 8</h2>
      <div class="arcade-track">${steps}</div>
      <div class="info-box">Next rival: <b class="gold">${foe}</b> · Arena: <b class="gold">${stage}</b><br>
      Wins recorded: ${p.data.wins} · Best run: ${p.data.arcadeBest}</div>
      <div class="btn-row"><button class="btn primary" data-a="fight">Fight <span>ROUND 1 · BEST OF 3</span></button>
      <button class="btn" data-a="menu">Main menu</button></div>`);
    this.wire({ fight: () => this.cb.onFight(), menu: () => this.cb.onMenu() });
  }

  result(won: boolean, _seed: number, cleared: boolean) {
    this.show('result', `
      <div class="subtitle">${won ? 'VICTORY' : 'DEFEAT'}</div>
      <h2 class="${won ? 'gold' : 'red'}">${won ? 'MATCH WON' : 'MATCH LOST'}</h2>
      <p class="lead">${won ? 'The crowd is on its feet. One more rival waits.' : 'The crew needs you. Try again.'}</p>
      <div class="btn-row">
        <button class="btn primary" data-a="next">${cleared ? 'Arcade clear' : 'Next battle'} <span>CONTINUE</span></button>
        <button class="btn" data-a="menu">Main menu</button>
      </div>`);
    this.wire({ next: () => this.cb.onNext(), menu: () => this.cb.onMenu() });
  }

  clear(p: Progression) {
    this.show('clear', `
      <div class="subtitle">ALL EIGHT BATTLES CLEARED</div>
      <h1 class="title">CHAMPION</h1>
      <p class="lead">Every rival defeated. The harbour belongs to your crew.<br>
      Total wins: <b class="gold">${p.data.wins}</b> · Fighters unlocked: <b class="gold">${p.unlockedCount()}/8</b></p>
      <div class="btn-row"><button class="btn primary" data-a="menu">Main menu</button></div>`);
    this.wire({ menu: () => this.cb.onMenu() });
  }

  pause(from: Screen) {
    this.show('pause', `
      <div class="subtitle">PAUSED</div>
      <h2>Take a breath</h2>
      <div class="menu-actions">
        <button class="btn primary" data-a="resume">Resume</button>
        <button class="btn" data-a="settings">Settings</button>
        <button class="btn danger" data-a="menu">Main menu</button>
      </div>`);
    this.wire({ resume: () => this.cb.onResume(), settings: () => this.settings('pause'), menu: () => this.cb.onMenu() });
    this.pauseFrom = from;
  }

  private pauseFrom: Screen = 'none';

  settings(from: Screen) {
    this.show('settings', `
      <div class="subtitle">SETTINGS</div>
      <h2>Options</h2>
      <div class="settings-row"><label>Music</label><input type="range" min="0" max="1" step="0.05" data-k="music" value="${this.stateMusic}"></div>
      <div class="settings-row"><label>Sound effects</label><input type="range" min="0" max="1" step="0.05" data-k="sfx" value="${this.stateSfx}"></div>
      <div class="settings-row"><label>Graphics</label><select data-k="quality">
        <option value="low" ${this.stateQuality === 'low' ? 'selected' : ''}>Low · maximum speed</option>
        <option value="medium" ${this.stateQuality === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="high" ${this.stateQuality === 'high' ? 'selected' : ''}>High</option>
      </select></div>
      <div class="btn-row"><button class="btn primary" data-a="back">Back</button></div>`);
    this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach((el) => {
      const handler = () => {
        const key = (el as HTMLElement).dataset.k!;
        this.cb.onSetting(key, el instanceof HTMLInputElement ? Number(el.value) : el.value);
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
    this.wire({ back: () => from === 'pause' ? this.pause(this.pauseFrom) : this.main(this.progression!) });
  }

  private stateMusic = 0.45;
  private stateSfx = 0.8;
  private stateQuality: 'low' | 'medium' | 'high' = 'high';
  private progression: Progression | null = null;

  bindSettings(p: Progression) {
    this.progression = p;
    this.stateMusic = p.data.musicVolume;
    this.stateSfx = p.data.sfxVolume;
    this.stateQuality = p.data.quality;
  }

  howto() {
    this.show('howto', `
      <div class="subtitle">HOW TO PLAY</div>
      <h2>Keep the pressure on</h2>
      <div class="info-box">
        <b>Mobile</b> · Left joystick: move, up to jump. Buttons: LIGHT chains into a three-hit combo,
        HEAVY launches, SPECIAL spends energy, DODGE gives brief invulnerability, BLOCK reduces damage,
        SUP 1 and SUP 2 call your support team.<br><br>
        <b>Desktop</b> · A/D move, W jump, J light, K heavy, L special, Shift dodge, B block, U/O supports, Esc pause.<br><br>
        <b>Rules</b> · Best of three rounds, 60 seconds each. Land hits to build energy and combos.
        Supports have an eight-second cooldown. Win eight arcade battles to unlock the final fighter.
      </div>
      <div class="btn-row"><button class="btn primary" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main(this.progression!) });
  }

  credits() {
    this.show('credits', `
      <div class="subtitle">CREDITS</div>
      <h2>GIGANT BATTLE PWA</h2>
      <div class="info-box">
        An original fan-made arena fighter inspired by DS-era team battles.<br><br>
        All fighters, arenas, sprites, sounds and music are generated procedurally at runtime.
        No official One Piece characters, names, artwork or audio are used.<br><br>
        Built with TypeScript, Canvas 2D, Web Audio and PWA offline caching.
      </div>
      <div class="btn-row"><button class="btn primary" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main(this.progression!) });
  }

  showHudNames(player: Fighter, enemy: Fighter, enemyLabel?: string) {
    this.pName.textContent = player.def.name;
    this.eName.textContent = enemyLabel ?? enemy.def.name;
    this.showHud();
  }

  updateHud(player: Fighter, enemy: Fighter, round: RoundSystem, dt: number) {
    this.pFill.style.width = `${player.hp}%`;
    this.eFill.style.width = `${enemy.hp}%`;
    this.pLag.style.width = `${player.hp}%`;
    this.eLag.style.width = `${enemy.hp}%`;
    this.pEnergy.style.width = `${player.energy}%`;
    this.eEnergy.style.width = `${enemy.energy}%`;
    this.timerEl.textContent = String(Math.ceil(round.timer)).padStart(2, '0');
    this.dots.innerHTML = `<i class="${round.wins[0] > 0 ? 'win' : ''}"></i><i class="${round.wins[1] > 0 ? 'win' : ''}"></i>`;
    this.assistEl.innerHTML = player.assistCooldowns.map((c, i) =>
      `<span class="assist-chip ${c > 0 ? 'cooling' : ''}">SUP ${i + 1}${c > 0 ? ` ${Math.ceil(c)}s` : ' READY'}</span>`).join('');

    if (player.combo > 1) {
      this.comboEl.textContent = `${player.combo} HIT COMBO`;
      this.comboTimer = 0.9;
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.comboEl.classList.toggle('on', this.comboTimer > 0);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerEl.classList.remove('show');
    }
  }

  banner(text: string) {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.add('show');
    this.bannerTimer = 1.1;
  }
}
