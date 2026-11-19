import { BRO_BY_ID } from '../data/bros';
import { AREA_BY_ID } from '../data/areas';
import type { BattleView } from '../systems/BattleSystem';
import type { Overworld } from '../systems/Overworld';
import type { BroState } from '../game/types';
import { MINIGAMES } from '../data/minigames';
import { BADGES, BADGE_BY_ID } from '../data/badges';
import type { BadgeSystem } from '../systems/BadgeSystem';
import type { MinigameView } from '../game/types';
import { CHALLENGE_MODES } from '../data/challenges';
import { QUESTS } from '../data/quests';
import { ACHIEVEMENTS } from '../data/achievements';
import type { MetaSystem } from '../systems/MetaSystem';
import { COLLECTIONS } from '../data/collections';

const COLLECTION_LABELS = COLLECTIONS.map((c) => ({ id: c.id, name: c.name, total: c.entries.length }));

export interface UICallbacks {
  onNew: () => void;
  onContinue: () => void;
  onChallenge: (id: string) => void;
  onNgPlus: () => void;
  onEndless: () => void;
  onBossRush: () => void;
  onDaily: () => void;
  onCollections: () => void;
  onAchievements: () => void;
  onQuestLog: () => void;
  onIntroDone: () => void;
  onCommand: (id: string) => void;
  onPress: () => void;
  onLevelStat: (stat: 'power' | 'defense' | 'speed') => void;
  onMinigame: (id: string) => void;
  onMinigamePress: (useA: boolean) => void;
  onBadges: () => void;
  onBadgeToggle: (id: string) => void;
  onBuyBadge: (id: string) => void;
  onBattleContinue: () => void;
  onPause: () => void;
  onResume: () => void;
  onMenu: () => void;
  onVolume: (v: number) => void;
}

export class UI {
  readonly root: HTMLElement;
  readonly hud: HTMLElement;
  readonly dialogueBox: HTMLElement;
  readonly battle: HTMLElement;
  current = 'none';
  private cmdSignature = '';
  private enemyFill!: HTMLElement;
  private enemyName!: HTMLElement;
  private broPanels!: HTMLElement;
  private battleMsg!: HTMLElement;
  private cmdGrid!: HTMLElement;
  private pressHint!: HTMLElement;
  private bpLine!: HTMLElement;
  private areaName!: HTMLElement;
  private leaderName!: HTMLElement;
  private hpPip!: HTMLElement;
  private hpPop!: HTMLElement;
  private itemsLine!: HTMLElement;
  private dialogueTimer = 0;
  readonly miniHud: HTMLElement;
  private miniScore!: HTMLElement;
  private miniTime!: HTMLElement;
  private miniMsg!: HTMLElement;

  constructor(container: HTMLElement, private cb: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'screen hidden';
    container.appendChild(this.root);

    this.hud = document.createElement('div');
    this.hud.className = 'hud hidden';
    this.hud.innerHTML = `
      <div class="hud-top">
        <div><b id="ui-area">SUNFIELD PLAINS</b><span id="ui-leader">Leader: PIP</span><br><span id="ui-items">Items: 0</span></div>
        <div class="side"><span id="ui-hp-pip">PIP 42/42</span><div class="hp-mini"><i id="ui-fill-pip"></i></div>
        <span id="ui-hp-pop">POP 38/38</span><div class="hp-mini pop"><i id="ui-fill-pop"></i></div></div>
      </div>`;
    container.appendChild(this.hud);
    this.areaName = this.hud.querySelector('#ui-area')!;
    this.leaderName = this.hud.querySelector('#ui-leader')!;
    this.itemsLine = this.hud.querySelector('#ui-items')!;
    this.hpPip = this.hud.querySelector('#ui-hp-pip')!;
    this.hpPop = this.hud.querySelector('#ui-hp-pop')!;

    this.dialogueBox = document.createElement('div');
    this.dialogueBox.className = 'dialogue-box hidden';
    this.dialogueBox.innerHTML = '<b>BROS.</b><span id="ui-dialogue-text"></span>';
    container.appendChild(this.dialogueBox);

    this.battle = document.createElement('div');
    this.battle.className = 'battle-hud hidden';
    this.battle.innerHTML = `
      <div class="enemy-panel"><b id="ui-enemy-name">ENEMY</b>
        <div class="enemy-track"><i id="ui-enemy-fill"></i></div></div>
      <div class="bro-panels" id="ui-bro-panels"></div>
      <div class="battle-msg" id="ui-battle-msg"></div>
      <div class="battle-panel">
        <div class="msg" id="ui-battle-line"></div>
        <div class="cmd-grid" id="ui-cmds"></div>
        <div class="press-hint hidden" id="ui-press">TAP THE BUTTON OR PRESS A!</div>
        <div class="bp-line"><span id="ui-bp">BP 3</span><span id="ui-timing"></span></div>
      </div>`;
    container.appendChild(this.battle);
    this.enemyName = this.battle.querySelector('#ui-enemy-name')!;
    this.enemyFill = this.battle.querySelector('#ui-enemy-fill')!;
    this.broPanels = this.battle.querySelector('#ui-bro-panels')!;
    this.battleMsg = this.battle.querySelector('#ui-battle-msg')!;
    this.cmdGrid = this.battle.querySelector('#ui-cmds')!;
    this.pressHint = this.battle.querySelector('#ui-press')!;
    this.bpLine = this.battle.querySelector('#ui-bp')!;

    this.miniHud = document.createElement('div');
    this.miniHud.className = 'battle-hud hidden';
    this.miniHud.innerHTML = `
      <div class="enemy-panel"><b id="mini-title">MINI-GAME</b>
        <div class="enemy-track"><i id="mini-progress"></i></div></div>
      <div class="battle-msg" id="mini-msg"></div>
      <div class="battle-panel"><div class="msg">SCORE <span id="mini-score">0</span> · TIME <span id="mini-time">0</span></div>
        <div class="cmd-grid"><button class="cmd" data-mini="a">PRESS A</button><button class="cmd" data-mini="b">PRESS B</button></div></div>`;
    container.appendChild(this.miniHud);
    this.miniScore = this.miniHud.querySelector('#mini-score')!;
    this.miniTime = this.miniHud.querySelector('#mini-time')!;
    this.miniMsg = this.miniHud.querySelector('#mini-msg')!;
    this.miniHud.querySelectorAll<HTMLElement>('[data-mini]').forEach((el) => {
      el.addEventListener('click', () => this.cb.onMinigamePress(el.dataset.mini === 'a'));
    });
  }

  hideScreen() { this.current = 'none'; this.root.classList.add('hidden'); }
  private show(name: string, html: string) {
    this.current = name;
    this.root.innerHTML = `<div class="panel">${html}</div>`;
    this.root.classList.remove('hidden');
  }
  private wire(map: Record<string, () => void>) {
    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((el) => el.addEventListener('click', () => map[el.dataset.a!]?.()));
  }

  main(hasSave: boolean) {
    this.hud.classList.add('hidden');
    this.hideBattle();
    this.show('main', `
      <div class="subtitle">A TIMED ACTION RPG FOR TWO BROTHERS</div>
      <h1 class="title">BROS.<br>SAGA</h1>
      <p class="lead">Pip and Pop travel together, jump in and out of trouble, and win fights with perfectly timed attacks. One brother leads, the other follows — but both get a turn in battle.</p>
      <div class="menu-actions">
        <button class="btn primary" data-a="new">New Adventure <span>CHOOSE MODE</span></button>
        ${hasSave ? '<button class="btn" data-a="continue">Continue <span>LAST SAVE</span></button>' : ''}
        ${hasSave ? '<button class="btn" data-a="ngplus">New Game+ <span>REPLAY, STRONGER</span></button>' : ''}
        <button class="btn" data-a="endless">Endless Dungeon <span>SURVIVE</span></button>
        <button class="btn" data-a="bossrush">Boss Rush <span>10 FIGHTS</span></button>
        <button class="btn" data-a="daily">Daily Challenge <span>SEEDED RUN</span></button>
        <button class="btn" data-a="minigames">Minigames <span>5 CHALLENGES</span></button>
        <button class="btn" data-a="badges">Badges <span>EQUIP 2</span></button>
        <button class="btn" data-a="collections">Collections <span>COMPLETION</span></button>
        <button class="btn" data-a="achievements">Achievements <span>TROPHIES</span></button>
        <button class="btn" data-a="quests">Quest Log <span>SIDE STORIES</span></button>
        <button class="btn" data-a="howto">How to Play <span>CONTROLS</span></button>
        <button class="btn" data-a="settings">Settings <span>VOLUME</span></button>
      </div>
      <div class="footer-note">Mobile: D-pad to move, A for leader, B for follower, SWAP to change leader.<br>
      In battle: choose a move, then tap A inside the yellow timing window. Defend the same way.</div>`);
    this.wire({
      new: () => this.cb.onNew(),
      continue: () => this.cb.onContinue(),
      ngplus: () => this.cb.onNgPlus(),
      endless: () => this.cb.onEndless(),
      bossrush: () => this.cb.onBossRush(),
      daily: () => this.cb.onDaily(),
      collections: () => this.cb.onCollections(),
      achievements: () => this.cb.onAchievements(),
      quests: () => this.cb.onQuestLog(),
      minigames: () => this.minigames(),
      badges: () => this.cb.onBadges(),
      howto: () => this.howto(),
      settings: () => this.settings()
    });
  }

  private howto() {
    this.show('howto', `
      <div class="subtitle">FIELD GUIDE</div><h2>How to Play</h2>
      <div class="lead"><b>Overworld</b> — move with the D-pad. The other brother follows. SWAP changes the leader.
      Press A to jump, open chests and strike enemies first; B makes the rear brother hammer.<br><br>
      <b>Battle</b> — each brother gets a turn. Pick JUMP, HAMMER, an elemental HAND or a Bros. Attack that costs BP.
      A moving cursor crosses a bar: tap A when it is inside the yellow window. Perfect timing deals 1.5× damage and can grant extra hits.<br><br>
      When an enemy attacks, watch the telegraph and tap A inside the window to dodge and counter. Mushrooms heal, Pepper boosts, 1-UP revives.</div>
      <div class="btn-row"><button class="btn primary" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main(true) });
  }

  settings() {
    this.show('settings', `
      <div class="subtitle">SETTINGS</div><h2>Volume</h2>
      <div class="settings-row"><label>Music &amp; effects</label><input type="range" min="0" max="1" step="0.05" value="0.8" data-v></div>
      <div class="btn-row"><button class="btn primary" data-a="back">Back</button></div>`);
    const range = this.root.querySelector<HTMLInputElement>('[data-v]')!;
    range.addEventListener('input', () => this.cb.onVolume(Number(range.value)));
    this.wire({ back: () => this.main(true) });
  }

  intro() {
    this.show('intro', `
      <div class="subtitle">A STRANGE KINGDOM</div><h2>The call that started it</h2>
      <p class="lead">Pip and Pop were preparing dinner when a letter arrived. It was addressed to both of them, in handwriting neither recognised.<br><br>
      <em>"The star at the centre of the kingdom has gone dark. Bring two brothers, one brave and one careful. Bring perfect timing."</em><br><br>
      So they packed a mushroom, said goodbye to the kitchen, and set off.</p>
      <div class="btn-row"><button class="btn primary" data-a="go">Let's go!</button></div>`);
    this.wire({ go: () => { this.hideScreen(); this.showWorld(); this.cb.onIntroDone(); } });
  }

  showWorld() { this.hud.classList.remove('hidden'); this.dialogueBox.classList.add('hidden'); this.hideBattle(); }
  hideWorld() { this.hud.classList.add('hidden'); this.dialogueBox.classList.add('hidden'); }

  updateWorld(world: Overworld, bros: BroState[], items: Record<string, number>, timer = 0) {
    this.areaName.textContent = AREA_BY_ID[world.areaId]?.name ?? world.areaId;
    this.leaderName.textContent = `Leader: ${BRO_BY_ID[world.leader].name}`;
    const count = Object.values(items).reduce((a, b) => a + b, 0);
    this.itemsLine.textContent = timer > 0
      ? `Items: ${count} · Time ${Math.floor(timer / 60)}:${String(Math.floor(timer % 60)).padStart(2, '0')}`
      : `Items: ${count} · Coins: ${this.coinCount ?? 0}`;
    const pip = bros.find((b) => b.id === 'pip')!;
    const pop = bros.find((b) => b.id === 'pop')!;
    this.hpPip.textContent = `PIP ${pip.hp}/${pip.maxHp}`;
    this.hpPop.textContent = `POP ${pop.hp}/${pop.maxHp}`;
    (this.hud.querySelector('#ui-fill-pip') as HTMLElement).style.width = `${(pip.hp / pip.maxHp) * 100}%`;
    (this.hud.querySelector('#ui-fill-pop') as HTMLElement).style.width = `${(pop.hp / pop.maxHp) * 100}%`;
  }

  private coinCount: number | null = null;
  setCoins(n: number) { this.coinCount = n; }

  dialogue(text: string, seconds = 4) {
    this.dialogueBox.querySelector('#ui-dialogue-text')!.textContent = text;
    this.dialogueBox.classList.remove('hidden');
    this.dialogueTimer = seconds;
  }

  update(dt: number) {
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueBox.classList.add('hidden');
    }
  }

  showBattle() { this.hud.classList.add('hidden'); this.dialogueBox.classList.add('hidden'); this.battle.classList.remove('hidden'); this.cmdSignature = ''; }
  hideBattle() { this.battle.classList.add('hidden'); }

  updateBattle(view: BattleView) {
    this.enemyName.textContent = `${view.enemyName} ${view.enemyHp}/${view.enemyMaxHp}`;
    this.enemyFill.style.width = `${(view.enemyHp / view.enemyMaxHp) * 100}%`;
    this.broPanels.innerHTML = view.bros.map((b) => `
      <div class="bro-panel ${b.fainted ? 'faint' : ''}"><b>${BRO_BY_ID[b.id].name}</b> Lv${b.level} ${b.hp}/${b.maxHp} HP</div>`).join('');
    this.battleMsg.textContent = view.message || view.telegraph;
    this.bpLine.textContent = `BP ${view.bp}/10`;

    const canCommand = view.phase === 'command';
    const sig = `${view.activeBro}:${view.phase}:${view.menu.map((m) => m.id).join(',')}`;
    if (sig !== this.cmdSignature) {
      this.cmdSignature = sig;
      this.cmdGrid.innerHTML = canCommand
        ? view.menu.map((m) => `<button class="cmd" data-cmd="${m.id}">${m.label}<small>${m.detail}</small></button>`).join('')
        : '';
      this.cmdGrid.querySelectorAll<HTMLElement>('[data-cmd]').forEach((el) => el.addEventListener('click', () => this.cb.onCommand(el.dataset.cmd!)));
    }
    this.pressHint.classList.toggle('hidden', view.phase !== 'timing' && view.phase !== 'defend');
    if (view.phase === 'timing') this.pressHint.textContent = `TIMING! Press A · hits ${view.hits}/${view.neededHits}`;
    if (view.phase === 'defend') this.pressHint.textContent = 'DEFEND! Press A in the window!';

    if (view.pendingLevel) {
      this.battleMsg.textContent = 'LEVEL UP! Choose a stat:';
      this.cmdGrid.innerHTML = `
        <button class="cmd" data-stat="power">POWER<small>+2 attack</small></button>
        <button class="cmd" data-stat="defense">DEFENSE<small>+2 armour</small></button>
        <button class="cmd" data-stat="speed">SPEED<small>+2 agility</small></button>`;
      this.cmdGrid.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => el.addEventListener('click', () => this.cb.onLevelStat(el.dataset.stat as 'power' | 'defense' | 'speed')));
      this.cmdSignature = 'levelup';
    }
    if (view.phase === 'victory' || view.phase === 'defeat') {
      this.battleMsg.textContent = view.message;
      this.cmdGrid.innerHTML = `<button class="cmd primary" data-continue>${view.phase === 'victory' ? 'CONTINUE' : 'RETRY'}</button>`;
      this.cmdGrid.querySelector('[data-continue]')!.addEventListener('click', () => this.cb.onBattleContinue());
      this.cmdSignature = view.phase;
    }
  }

  challenges() {
    this.show('challenges', `
      <div class="subtitle">CHOOSE YOUR RUN</div><h2>Game mode</h2>
      <p class="lead">Modifiers change enemy strength and the score multiplier. Iron Man removes items entirely.</p>
      <div class="menu-actions">${CHALLENGE_MODES.map((m) => `<button class="btn" data-ch="${m.id}">${m.name}<span>${m.description} · ×${m.scoreMultiplier}</span></button>`).join('')}</div>
      <div class="btn-row"><button class="btn" data-a="back">Back</button></div>`);
    this.root.querySelectorAll<HTMLElement>('[data-ch]').forEach((el) => el.addEventListener('click', () => this.cb.onChallenge(el.dataset.ch!)));
    this.wire({ back: () => this.main(true) });
  }

  collections(meta: MetaSystem) {
    const groups = COLLECTION_LABELS.map((label) => {
      const found = meta.data.collected[label.id]?.length ?? 0;
      return `<div class="settings-row"><span>${label.name}</span><b class="gold">${found}/${label.total}</b></div>`;
    }).join('');
    this.show('collections', `
      <div class="subtitle">COMPLETION ${meta.completion()}%</div><h2>Collections</h2>
      ${groups}
      <div class="lead" style="margin-top:14px">Bosses defeated: ${meta.data.stats.bosses ?? 0} · Wins: ${meta.data.stats.wins ?? 0}</div>
      <div class="btn-row"><button class="btn" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main(true) });
  }

  achievements(meta: MetaSystem) {
    const rows = ACHIEVEMENTS.map((a) => {
      const done = meta.data.achievements.includes(a.id);
      return `<div class="settings-row"><span>${done ? '✓' : '○'} ${a.name}<small style="display:block;color:var(--muted)">${a.description}</small></span><b>${meta.data.stats[a.key] ?? 0}/${a.goal}</b></div>`;
    }).join('');
    this.show('achievements', `
      <div class="subtitle">TROPHY ROOM</div><h2>Achievements</h2>${rows}
      <div class="btn-row"><button class="btn" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main(true) });
  }

  questLog(meta: MetaSystem) {
    const rows = QUESTS.map((q) => {
      const done = meta.data.questsDone.includes(q.id);
      const progress = meta.data.quests[q.id] ?? 0;
      return `<div class="settings-row"><span>${done ? '✓' : '○'} ${q.title}<small style="display:block;color:var(--muted)">${q.objective}</small></span><b>${done ? 'DONE' : `${progress}/${q.needed}`}</b></div>`;
    }).join('');
    this.show('questlog', `
      <div class="subtitle">SIDE STORIES</div><h2>Quest Log</h2>${rows}
      <div class="btn-row"><button class="btn" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main(true) });
  }

  minigames() {
    this.show('minigames', `
      <div class="subtitle">FIVE CHALLENGES</div><h2>Minigames</h2>
      <p class="lead">Win a challenge to earn coins, BP, items or a badge. The timing bar works just like in battle.</p>
      <div class="menu-actions">${MINIGAMES.map((m) => `<button class="btn" data-mg="${m.id}">${m.name}<span>${m.description}</span></button>`).join('')}</div>
      <div class="btn-row"><button class="btn" data-a="back">Back</button></div>`);
    this.root.querySelectorAll<HTMLElement>('[data-mg]').forEach((el) => el.addEventListener('click', () => this.cb.onMinigame(el.dataset.mg!)));
    this.wire({ back: () => this.main(true) });
  }

  badges(badges: BadgeSystem, coins: number) {
    this.show('badges', `
      <div class="subtitle">EQUIP UP TO TWO</div><h2>Badges</h2>
      <p class="lead">Coins: <b class="gold">${coins}</b> · equipped: ${badges.equipped.length}/2</p>
      <div class="menu-actions">${BADGES.map((b) => {
        const owned = badges.owned.includes(b.id);
        const on = badges.equipped.includes(b.id);
        const affordable = coins >= b.cost;
        return `<button class="btn" data-badge="${b.id}" ${owned || affordable ? '' : 'disabled'}>
          <span>${b.name}${on ? ' ✓' : ''}<small style="display:block;color:var(--muted)">${b.description}</small></span>
          <span class="k">${owned ? (on ? 'EQUIPPED' : 'EQUIP') : `${b.cost} COINS`}</span></button>`;
      }).join('')}</div>
      <div class="btn-row"><button class="btn" data-a="back">Back</button></div>`);
    this.root.querySelectorAll<HTMLElement>('[data-badge]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.badge!;
        if (badges.owned.includes(id)) this.cb.onBadgeToggle(id);
        else if (coins >= BADGE_BY_ID[id].cost) this.cb.onBuyBadge(id);
      });
    });
    this.wire({ back: () => this.main(true) });
  }

  showMinigame(title: string) {
    this.hud.classList.add('hidden');
    this.battle.classList.add('hidden');
    this.hideScreen();
    this.miniHud.classList.remove('hidden');
    this.miniHud.querySelector('#mini-title')!.textContent = title;
  }

  hideMinigame() { this.miniHud.classList.add('hidden'); }

  updateMinigame(view: MinigameView) {
    this.miniScore.textContent = `${view.score}/${view.target}`;
    this.miniTime.textContent = Math.ceil(view.time).toString();
    this.miniMsg.textContent = view.message;
    (this.miniHud.querySelector('#mini-progress') as HTMLElement).style.width = `${Math.max(0, Math.min(100, (view.score / view.target) * 100))}%`;
  }

  showEnding() {
    this.hud.classList.add('hidden');
    this.hideBattle();
    this.show('ending', `
      <div class="subtitle">THE END</div>
      <h1 class="title">STARLIGHT<br>RESTORED</h1>
      <p class="lead">Pip and Pop stood together on the last step, timing their final jump as one. The star above the keep lit up, and every window in the kingdom glowed.<br><br>
      Pop looked at Pip. "So... dinner?"<br>
      Pip grinned. "Only if you get the timing right."</p>
      <div class="btn-row"><button class="btn primary" data-a="menu">Main menu</button></div>`);
    this.wire({ menu: () => this.cb.onMenu() });
  }

  pause() {
    this.show('pause', `
      <div class="subtitle">PAUSED</div><h2>Take a breath</h2>
      <div class="menu-actions">
        <button class="btn primary" data-a="resume">Resume</button>
        <button class="btn" data-a="settings">Settings</button>
        <button class="btn danger" data-a="menu">Main menu</button>
      </div>`);
    this.wire({ resume: () => this.cb.onResume(), settings: () => this.settings(), menu: () => this.cb.onMenu() });
  }
}
