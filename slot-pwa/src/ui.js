/* DOM overlays: lobby, HUD, paytables, settings, stats, bonuses and meta panels. */
import {
  THEMES, GLOBAL_JACKPOTS, VIP_NAMES, COLLECTIONS, MISSIONS, ACHIEVEMENTS,
  CALENDAR_REWARDS, MODE_TABS, QUESTS, TROPHIES, vipLevel, weekKey,
} from './config.js';
import { MACHINES, isUnlocked } from './machines/index.js';
import { questSummary } from './modes/quest.js';

const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor() {
    this.overlay = document.getElementById('panel-overlay');
    this.title = document.getElementById('panel-title');
    this.body = document.getElementById('panel-body');
    this.closeBtn = document.getElementById('panel-close');
    this.lobby = document.getElementById('lobby-overlay');
    this.lobbyGrid = document.getElementById('lobby-grid');
    this.lobbySub = document.getElementById('lobby-sub');
    this.lobbyTabs = document.getElementById('lobby-tabs');
    this.toasts = document.getElementById('toasts');
    this.hud = {
      machine: document.getElementById('hud-machine'),
      credits: document.getElementById('hud-credits'),
      win: document.getElementById('hud-win'),
      bet: document.getElementById('hud-bet'),
      lines: document.getElementById('hud-lines'),
      vip: document.getElementById('hud-vip'),
      vipLabel: document.getElementById('hud-vip-label'),
      free: document.getElementById('hud-free'),
    };
    this.handlers = {};
    this.onClose = null;

    this.closeBtn.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
      const el = e.target.closest('[data-action]');
      if (el && this.handlers[el.dataset.action]) this.handlers[el.dataset.action](el.dataset);
    });
    this.overlay.addEventListener('change', (e) => {
      if (e.target.dataset.setting && this.handlers.setting) {
        this.handlers.setting(e.target.dataset.setting, e.target.checked);
      }
    });
    this.lobby.addEventListener('click', (e) => {
      if (e.target.id === 'lobby-close' || e.target === this.lobby) { this.hideLobby(); return; }
      const el = e.target.closest('[data-action]');
      if (el && this.handlers[el.dataset.action]) this.handlers[el.dataset.action](el.dataset);
    });
    document.getElementById('lobby-close').addEventListener('click', () => this.hideLobby());
  }

  setHandlers(handlers) { this.handlers = { ...this.handlers, ...handlers }; }

  show(title, html, { dismissible = true } = {}) {
    this.title.textContent = title;
    this.body.innerHTML = html;
    this.closeBtn.classList.toggle('hidden', !dismissible);
    this.overlay.classList.remove('hidden');
  }
  hide() {
    this.overlay.classList.add('hidden');
    const cb = this.onClose;
    this.onClose = null;
    if (cb) cb();
  }
  waitClose() { return new Promise((resolve) => { this.onClose = resolve; }); }
  get isOpen() { return !this.overlay.classList.contains('hidden') || !this.lobby.classList.contains('hidden'); }

  showLobby(state, practice, activeTab = 'play') {
    const vip = vipLevel(state.xp);
    this.lobbySub.textContent = `VIP ${vip} · ${VIP_NAMES[vip - 1]} · ${state.xp} XP · ${practice ? 'PRACTICE MODE (no wagers)' : 'Real credits'}`;
    if (this.lobbyTabs) {
      this.lobbyTabs.innerHTML = MODE_TABS.map((t) =>
        `<button class="mode-tab ${t.id === activeTab ? 'active' : ''}" data-action="modeTab" data-tab="${t.id}">${t.icon} ${t.name}</button>`).join('');
    }
    if (activeTab !== 'play') {
      this.lobbyGrid.innerHTML = this.modeTabContent(state, activeTab);
      this.lobby.classList.remove('hidden');
      return;
    }
    this.lobbyGrid.innerHTML = MACHINES.map((m) => {
      const open = isUnlocked(m, vip);
      const played = state.machineStats[m.id]?.spins || 0;
      const chips = m.mechanics.map((x) => `<span class="chip">${esc(x.replace(/([A-Z])/g, ' $1'))}</span>`).join('');
      return `<button class="machine-card ${open ? '' : 'locked'} ${m.id === state.machineId ? 'current' : ''}"
          data-action="selectMachine" data-id="${m.id}" ${open ? '' : 'disabled'}>
        <div class="machine-art" style="--c:${THEMES[m.theme].edge}"><span>${m.motif}</span></div>
        <div class="machine-info">
          <h3>${esc(m.name)}</h3>
          <p>${esc(m.tagline)}</p>
          <div class="machine-meta"><span>${m.reels}×${m.rows}</span><span>${esc(m.payMode)}</span><span>${m.volatility}</span><span>${m.rtp}</span></div>
          <div class="chips">${chips}</div>
          <small>${open ? (played ? `${played} spins played` : 'Not played yet') : `🔒 Unlocks at VIP ${m.unlockLevel}`}</small>
        </div>
      </button>`;
    }).join('') + `
      <div class="lobby-actions">
        <button class="btn ${practice ? 'primary' : ''}" data-action="togglePractice">${practice ? '✔ Practice mode ON' : 'Practice mode OFF'}</button>
        <button class="btn" data-action="collections">🏆 Collections (${state.collections.length}/${COLLECTIONS.length})</button>
      </div>`;
    this.lobby.classList.remove('hidden');
  }

  modeTabContent(state, tab) {
    const vip = vipLevel(state.xp);
    if (tab === 'tournament') {
      const wk = weekKey();
      const results = Object.entries(state.modes.tournament.results)
        .filter(([k]) => k.startsWith(wk + ':'))
        .map(([k, v]) => `<div class="stat"><span>${k.split(':')[1]}</span><b>#${v.rank} · ${v.score.toLocaleString()}</b></div>`).join('');
      return `<div class="mode-panel">
        <div class="mode-hero">🏆 <b>Weekly Tournament</b></div>
        <p class="sub">${wk} · Ten spins, deterministic rivals, prize ladder. Pick a machine below to enter.</p>
        <div class="mode-actions">${MACHINES.filter((m) => isUnlocked(m, vip)).map((m) =>
          `<button class="btn" data-action="startMode" data-mode="tournament" data-machine="${m.id}">${m.motif} ${esc(m.name)}</button>`).join('')}</div>
        <h3>This week's results</h3>${results || '<p class="sub">No runs yet this week.</p>'}
      </div>`;
    }
    if (tab === 'rush') {
      return `<div class="mode-hero">⚡ <b>Spin Rush</b></div>
        <p class="sub">60 seconds of turbo spins with a climbing multiplier. No wager — pure score chase.</p>
        <div class="stat-grid">
          <div class="stat"><span>Best</span><b>${(state.modes.rush.best || 0).toLocaleString()}</b></div>
          <div class="stat"><span>Runs</span><b>${state.modes.rush.runs || 0}</b></div>
          <div class="stat"><span>Last score</span><b>${(state.modes.rush.last || 0).toLocaleString()}</b></div>
          <div class="stat"><span>Trophy</span><b>${state.trophies.includes('rush') ? '⚡ Speed Demon' : 'Locked'}</b></div>
        </div>
        <button class="btn primary wide" data-action="startMode" data-mode="rush">⚡ Start Spin Rush</button>`;
    }
    if (tab === 'quest') {
      const quests = questSummary(state);
      const cards = quests.map((q) => `<div class="quest-card ${q.done ? 'done' : ''} ${q.active ? 'active' : ''}">
        <div class="quest-head"><b>${q.trophy.icon} ${esc(q.name)}</b><small>Ch ${q.chapter}</small></div>
        <p>${esc(q.desc)}</p>
        <div class="quest-progress"><div class="bar"><i style="width:${Math.min(100, q.progress / q.target * 100)}%"></i></div>
          <span>${q.done ? 'COMPLETE' : `${q.progress}/${q.target}`} · ${q.reward} cr</span></div>
        ${q.done ? '' : `<button class="btn" data-action="activateQuest" data-id="${q.id}" ${q.active ? 'disabled' : ''}>${q.active ? '★ Active' : 'Activate'}</button>`}
      </div>`).join('');
      return `<div class="mode-hero">🗺️ <b>Quest Campaign</b></div>
        <p class="sub">Activate a stage, then play normally — progress tracks on every spin.</p>${cards}`;
    }
    if (tab === 'profile') {
      return `<div class="mode-hero">👤 <b>Player Profile</b></div>
        <div class="stat-grid">
          <div class="stat"><span>VIP</span><b>${vip} · ${VIP_NAMES[vip - 1]}</b></div>
          <div class="stat"><span>XP</span><b>${state.xp}</b></div>
          <div class="stat"><span>Credits</span><b>${state.credits.toLocaleString()}</b></div>
          <div class="stat"><span>Spins</span><b>${state.stats.spins}</b></div>
          <div class="stat"><span>Biggest win</span><b>${state.stats.biggestWin.toLocaleString()}</b></div>
          <div class="stat"><span>Machines</span><b>${state.stats.machinesPlayed}/8</b></div>
          <div class="stat"><span>Tournaments</span><b>${state.stats.tournaments}</b></div>
          <div class="stat"><span>Quests</span><b>${state.stats.quests}</b></div>
        </div>
        <h3>Trophies (${state.trophies.length}/${TROPHIES.length})</h3>
        <div class="trophies">${TROPHIES.map((t) => `<div class="trophy ${state.trophies.includes(t.id) ? 'got' : ''}" title="${esc(t.desc)}">
          <b>${t.icon}</b><span>${esc(t.name)}</span></div>`).join('')}</div>`;
    }
    return '';
  }

  hideLobby() { this.lobby.classList.add('hidden'); }
  get lobbyOpen() { return !this.lobby.classList.contains('hidden'); }
  get activeModeTab() {
    const el = this.lobbyTabs?.querySelector('.mode-tab.active');
    return el ? el.dataset.tab : 'play';
  }

  toast(message, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    this.toasts.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3200);
  }

  updateHUD(state, bet, lines, machine, modeLabel = '') {
    this.hud.machine.textContent = (modeLabel ? modeLabel + ' · ' : '') + machine.name.toUpperCase();
    this.hud.credits.textContent = fmt(state.credits);
    this.hud.win.textContent = fmt(state.lastWin || 0);
    this.hud.bet.textContent = fmt(bet);
    this.hud.lines.textContent = machine.payMode === 'ways' ? 'WAYS' : machine.payMode === 'cluster' ? 'CLUSTER' : lines;
    const v = vipLevel(state.xp);
    this.hud.vip.textContent = VIP_NAMES[v - 1].toUpperCase();
    this.hud.vipLabel.textContent = `VIP ${v}`;
    this.hud.free.classList.toggle('hidden', state.freeSpins <= 0);
    this.hud.free.textContent = `FREE ×${state.freeSpins}`;
  }

  showPaytable(machine) {
    let rows = '';
    if (machine.payMode === 'cluster') {
      rows = Object.entries(machine.clusterTable).filter(([, t]) => Object.keys(t).length).map(([key, t]) => {
        const s = machine.symbols[key];
        return `<tr><td class="sym">${s.emoji}</td><td>${esc(s.name)}</td>` +
          Object.keys(t).map((n) => `<td>${t[n]}</td>`).join('') + '</tr>';
      }).join('');
    } else {
      rows = Object.entries(machine.paytable).map(([key, pays]) => {
        const s = machine.symbols[key];
        return `<tr><td class="sym">${s?.emoji || '·'}</td><td>${esc(s?.name || key)}</td>` +
          [3, 4, 5].map((n) => `<td>${pays[n] || '—'}</td>`).join('') + '</tr>';
      }).join('');
    }
    const heads = machine.payMode === 'cluster' ? '<th></th><th>Symbol</th><th>×5</th><th>×6</th><th>×7+</th>'
      : '<th></th><th>Symbol</th><th>×3</th><th>×4</th><th>×5</th>';
    const jackpots = Object.values(GLOBAL_JACKPOTS).map((j) =>
      `<span class="chip" style="--c:${j.color}">${j.name} ${fmt(j.base)}+</span>`).join('');
    this.show(`${machine.name} — Paytable`, `
      <p class="sub">${esc(machine.tagline)} · ${machine.volatility} volatility · RTP ${machine.rtp}</p>
      <p class="sub">${machine.payMode === 'cluster' ? 'Connect 5+ matching symbols (wilds bridge any symbol).'
        : machine.payMode === 'ways' ? 'Match symbols on adjacent reels starting from the left — any row counts.'
        : 'Wins pay left-to-right on each active payline.'}</p>
      <table class="paytable"><thead>${heads}</thead><tbody>${rows}</tbody></table>
      <p class="sub">Scatters (${machine.symbols[machine.scatter]?.emoji}) pay anywhere and award free spins.</p>
      <div class="chips">${jackpots}</div>
      <h3>Mechanics</h3><div class="chips">${machine.mechanics.map((x) => `<span class="chip">${esc(x.replace(/([A-Z])/g, ' $1'))}</span>`).join('')}</div>
    `);
  }

  showSettings(R2, state, theme, practice) {
    const s = R2 && R2.getSettings ? R2.getSettings() : { sound: true, music: true, haptics: true };
    const toggle = (key, label) => `<label class="toggle"><span>${label}</span>
      <input type="checkbox" data-setting="${key}" ${s[key] ? 'checked' : ''}></label>`;
    const swatches = Object.entries(THEMES).map(([key, t]) =>
      `<button class="theme-swatch ${key === theme ? 'selected' : ''}" data-action="theme" data-theme="${key}"
        style="--c:${t.edge}">${t.label}</button>`).join('');
    this.show('Settings', `
      <div class="settings">${toggle('sound', 'Sound effects')}${toggle('music', 'Music')}${toggle('haptics', 'Haptics')}</div>
      <h3>Palette (any machine)</h3><div class="swatches">${swatches}</div>
      <h3>Play mode</h3>
      <button class="btn wide ${practice ? 'primary' : ''}" data-action="togglePractice">${practice ? '✔ Practice mode ON (no wagers)' : 'Practice mode OFF'}</button>
      <button class="btn wide" data-action="lobby">🏠 Choose a machine</button>
      <h3>Danger zone</h3>
      <button class="btn wide" data-action="reset">Reset session (keeps jackpots + VIP)</button>
    `);
  }

  showStats(state) {
    const st = state.stats;
    const rows = [
      ['Credits', fmt(state.credits)], ['VIP', `${vipLevel(state.xp)} · ${VIP_NAMES[vipLevel(state.xp) - 1]}`],
      ['XP', state.xp], ['Spins', st.spins], ['Wins', st.wins], ['Paylines won', st.linesWon],
      ['Biggest win', fmt(st.biggestWin)], ['Total wagered', fmt(st.totalWagered)],
      ['Total won', fmt(st.totalWon)], ['Free spins won', st.freeSpinsWon],
      ['Jackpots won', st.jackpotsWon], ['Bonus wins', fmt(st.bonusWins)],
      ['Hold & Wins', st.holdWins], ['Machines played', st.machinesPlayed],
      ['Challenges', st.challenges], ['High score', fmt(state.highScore)],
    ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    const perMachine = MACHINES.filter((m) => state.machineStats[m.id]).map((m) => {
      const ms = state.machineStats[m.id];
      return `<div class="stat"><span>${m.motif} ${esc(m.name)}</span><b>${ms.spins} spins · ${fmt(ms.won)} won</b></div>`;
    }).join('');
    const missionRows = MISSIONS.map((m) => {
      const done = state.missions[m.id];
      const progress = Math.min(m.goal, state.stats[m.stat] || 0);
      return `<div class="mission ${done ? 'done' : ''}"><span>${done ? '✓' : '○'} ${esc(m.name)}</span>
        <span>${done ? 'CLAIMED' : `${progress}/${m.goal}`}</span></div>`;
    }).join('');
    const ach = ACHIEVEMENTS.map((a) =>
      `<span class="ach ${state.achievements.includes(a.id) ? 'got' : ''}" title="${esc(a.desc)}">${state.achievements.includes(a.id) ? '★' : '☆'} ${esc(a.name)}</span>`).join('');
    this.show('Your Stats', `<div class="stats-grid">${rows}</div><h3>Per machine</h3><div class="stats-grid">${perMachine}</div>
      <h3>Missions</h3><div class="missions">${missionRows}</div><h3>Achievements</h3><div class="achievements">${ach}</div>`);
  }

  showCollections(state) {
    const html = COLLECTIONS.map((c) => {
      const done = state.collections.includes(c.id);
      const symbols = c.symbols.map((s) => `<span class="sym ${state.discovered.includes(s) ? '' : 'undiscovered'}">${state.discovered.includes(s) ? s : '❔'}</span>`).join('');
      return `<div class="collection"><b>${done ? '★' : '☆'} ${esc(c.name)}</b><div>${symbols}</div>
        <small>${done ? 'COMPLETE — bonus claimed' : `Reward ${fmt(c.reward)}`}</small></div>`;
    }).join('');
    this.show('Symbol Collections', `<p class="sub">Land symbols on any machine to discover them. Complete a set for a credit bonus.</p>${html}`);
  }

  showDaily(result, state) {
    if (!result.claimed) { this.toast('Daily bonus already claimed — come back tomorrow!'); return; }
    this.show('Daily Bonus', `<div class="big-prize">+${fmt(result.reward)}</div>
      <p>Day <b>${result.streak}</b> streak${result.free ? ` · <b>${result.free} free spins</b>` : ''}.</p>
      <h3>7-day calendar</h3><div class="calendar">${CALENDAR_REWARDS.map((r, i) =>
        `<div class="cal ${i + 1 <= result.streak ? 'got' : ''}"><b>D${i + 1}</b><span>${fmt(r.credits)}</span>${r.free ? `<small>+${r.free} FS</small>` : ''}</div>`).join('')}</div>
      <button class="btn primary wide" data-action="close">Collect</button>`);
  }

  showChallenge(result, score) {
    if (result.already) { this.toast('Daily challenge already completed!'); return; }
    this.show('Daily Challenge', `<div class="big-prize">#${result.rank}</div>
      <p>You scored <b>${fmt(score)}</b> on today's seeded grid. Reward: <b>+${fmt(result.reward)}</b> credits.</p>
      <p class="sub">Everyone gets the same reel seed each day. Beat your best of ${fmt(result.best)}.</p>
      <button class="btn primary wide" data-action="close">Nice</button>`);
  }

  showGameOver() {
    this.show('Out of Credits', `<div class="big-prize">🎁</div>
      <p>The reels aren't done with you. Claim a top-up and keep spinning.</p>
      <button class="btn primary wide" data-action="collect">Collect 500 credits</button>`, { dismissible: false });
  }

  showBonus(picks, onPick) {
    this.handlers.bonusPick = (data) => {
      const idx = Number(data.index);
      if (!Number.isNaN(idx)) onPick(idx);
    };
    const cards = picks.map((p, i) => `<button class="chest" data-action="bonusPick" data-index="${i}">🎁<span>?</span></button>`).join('');
    this.show('Bonus Round', `<p class="sub">Pick three boxes: credits, free spins or a jackpot.</p><div class="chests">${cards}</div>`);
  }
  updateBonus(picks, chosen) {
    this.body.innerHTML = `<p class="sub">Pick three boxes: credits, free spins or a jackpot.</p><div class="chests">${picks.map((p, i) =>
      chosen.includes(i) ? `<div class="chest revealed">🎁<span>${esc(p.label)}</span></div>`
        : `<button class="chest" data-action="bonusPick" data-index="${i}">🎁<span>?</span></button>`).join('')}</div>`;
  }

  showWheel(tier, amount) {
    this.show('Jackpot Wheel', `<div class="wheel" style="--c:${GLOBAL_JACKPOTS[tier]?.color || '#ffcc00'}"><div class="wheel-inner">spin</div></div>
      <div class="big-prize">${tier.toUpperCase()}!</div>
      <p>You won <b>${fmt(amount)}</b> credits.</p>
      <button class="btn primary wide" data-action="close">Collect</button>`, { dismissible: false });
  }

  showHold(value, full, coins) {
    this.show('Hold & Win', `<div class="big-prize">${full ? 'JACKPOT!' : `+${fmt(value)}`}</div>
      <p>${coins} coins locked.${full ? ' Full board — you cracked the vault!' : ''}</p>
      <button class="btn primary wide" data-action="close">Collect</button>`, { dismissible: false });
  }

  showGamble(amount, player, dealer, win) {
    this.show(win ? 'Double or Nothing — Won!' : 'Double or Nothing — Lost', `
      <div class="cards"><div class="card">${player}</div><div class="card">${dealer}</div></div>
      <div class="big-prize">${win ? `+${fmt(amount)}` : `−${fmt(amount)}`}</div>
      <p>${win ? 'Your card was higher. Gamble again?' : 'Dealer wins. Your original win was already banked.'}</p>
      ${win ? `<button class="btn primary wide" data-action="gambleAgain">Gamble again</button>` : ''}
      <button class="btn wide" data-action="close">Bank it</button>`, { dismissible: false });
  }

  showBuyBonus(cost) {
    this.show('Buy the Bonus', `<p class="sub">Jump straight into the feature for a fixed price. Free spins come with extra wilds and a 2× multiplier.</p>
      <div class="big-prize">${fmt(cost)}</div>
      <button class="btn primary wide" data-action="buyBonus">Buy now</button>
      <button class="btn wide" data-action="close">Not now</button>`);
  }

  showWelcome(machine) {
    this.show(machine.name, `<div class="logo">${machine.motif}</div>
      <p class="sub">${esc(machine.tagline)}</p>
      <div class="how">
        <div>🃏 <b>Wild</b> substitutes for any symbol</div>
        <div>🎁 <b>Scatter</b> pays anywhere + free spins</div>
        <div>💎 <b>Jackpots</b> grow on every spin across the arcade</div>
      </div>
      <button class="btn primary wide" data-action="close">Let's spin</button>
      <button class="btn wide" data-action="lobby">🏠 Choose another machine</button>`, { dismissible: false });
  }
}
