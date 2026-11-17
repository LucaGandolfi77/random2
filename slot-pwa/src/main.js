/* Lucky Seven Slot Arcade — bootstrap and game orchestration. */
import { THEMES, GLOBAL_JACKPOTS, todayKey, vipLevel } from './config.js';
import { MACHINES, getMachine, isUnlocked } from './machines/index.js';
import { makeRng, generateStarts, gridFromStarts, randomSymbol, dailySeed } from './rng.js';
import {
  cascade, evaluateGrid, growJackpots, totalBet,
} from './engine.js';
import {
  load, save, loadJackpots, saveJackpots, selectMachine, machineOf, vip,
  betPerLine, activeLines, wager, canSpin, chargeSpin, creditWin, topUp,
  cycleBet, cycleLines, awardJackpot,
} from './state.js';
import {
  claimDaily, checkAllMeta, finishChallenge, discover,
} from './meta.js';
import {
  prepareGrid, collectSticky, runHoldSequence, gambleRound, bonusBuyCost,
} from './features.js';
import { ReelSpinner } from './spin.js';
import { Cabinet } from './render.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { setupInput } from './input.js';
import { setupPWA, markPlayed } from './pwa.js';
import { getExtraMode } from './modes/index.js';
import * as quest from './modes/quest.js';

const R2 = window.R2;
const rand = makeRng();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ui = new UI();
const audio = new Audio(R2);
const cabinet = new Cabinet(document.getElementById('game-canvas'));
const spinner = new ReelSpinner();

let state = load(window.localStorage);
let jackpots = loadJackpots(window.localStorage);
let machine = selectMachine(state, state.machineId);

let busy = false;
let auto = false;
let turbo = false;
let practice = false;
let mode = 'normal'; // normal | practice | challenge | tournament | rush
let modeSession = null;
let modeFinishing = false;
let questRng = null;
let challengeRng = null;
let challengeScore = 0;
let challengeSpins = 0;
let sticky = [];
let shiftColumn = 0;
let status = 'TAP SPIN OR PRESS SPACE';
let wins = [];
let pendingGamble = 0;
let lastTime = 0;

const theme = () => THEMES[state.theme] || THEMES[machine.theme] || THEMES.neon;
const modeDef = () => getExtraMode(mode);
const rndFor = () => (mode === 'challenge' && challengeRng ? challengeRng : rand);
const symbolRandom = (r, random) => randomSymbol(r, random, machine);

function persist() {
  save(window.localStorage, state);
  saveJackpots(window.localStorage, jackpots);
}
function haptic(pattern) { try { R2?.buzz?.(pattern); } catch (e) {} }

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme().edge);
}

function refreshHUD() {
  const def = modeDef();
  const label = def ? def.name.toUpperCase() : mode === 'challenge' ? 'DAILY CHALLENGE'
    : mode === 'practice' ? 'PRACTICE' : '';
  ui.updateHUD(state, betPerLine(state, machine), activeLines(state, machine), machine, label);
}

function setStatus(text) { status = text; }

/* ---------- Effects ---------- */

function fx() { return cabinet.effects; }

function celebrate(amount) {
  const c = theme();
  if (amount >= 10000) {
    fx().banner('MEGA WIN!', c.edge, 3);
    fx().fireworks(c.edge, 4);
    fx().confetti(c.accent, 70);
    fx().flash('#ffffff', 0.5);
    fx().shakeScreen(15);
  } else if (amount >= 3000) {
    fx().banner('BIG WIN!', c.edge, 2);
    fx().coinShower(270, 360, c.edge);
    fx().flash(c.glow, 0.25);
    fx().shakeScreen(9);
    fx().signature(state.theme, c.accent);
  } else if (amount >= 800) {
    fx().banner('WIN!', c.accent, 1);
    fx().signature(state.theme, c.glow);
  }
}

function winBurst(wins) {
  const { cellW, cellH } = cabinet.geometry(machine);
  const c = theme();
  wins.forEach((w) => w.positions.forEach(([r, row]) => {
    fx().explode(52 + r * cellW + cellW / 2, 232 + row * cellH + cellH / 2,
      machine.symbols[w.symbol]?.color || c.glow, 18);
  }));
}

function detectNearMiss(grid) {
  const targets = machine.jackpotSymbols || ['clover', 'pharaoh', 'seven'];
  for (const line of (machine.paylines || []).slice(0, 1)) {
    const syms = line.map(([r, c]) => grid[r]?.[c]);
    if (syms[0] && syms[0] === syms[1] && targets.includes(syms[0]) &&
        syms[2] !== syms[0] && syms[2] !== machine.wild) return true;
  }
  return false;
}

/* ---------- Core spin ---------- */

async function playSpin() {
  if (busy || ui.isOpen || modeFinishing || (modeSession && modeSession.done)) return;
  const def = modeDef();
  const cost = wager(state, machine);
  const paid = def ? def.wager : mode === 'normal';
  if (paid && !canSpin(state, machine)) {
    ui.showGameOver();
    return;
  }

  busy = true;
  const random = rndFor();
  const charge = paid
    ? chargeSpin(state, machine, jackpots)
    : { free: true, bet: cost, jackpots };
  jackpots = charge.jackpots;
  persist();

  const starts = generateStarts(machine.strips, random);
  let grid = gridFromStarts(starts, machine.rows);
  grid = prepareGrid(grid, machine, random, { sticky, shiftColumn });
  if (machine.mechanics.includes('stickyWild')) {
    sticky = state.freeSpins > 0 ? collectSticky(grid, machine) : [];
  }
  if (machine.mechanics.includes('shiftingWild')) shiftColumn = (shiftColumn + 1) % machine.reels;

  setStatus(charge.free ? 'FREE SPIN!' : mode === 'practice' ? 'PRACTICE SPIN' : def ? `${def.name.toUpperCase()} SPIN` : 'SPINNING...');
  audio.play('spin');
  haptic(8);
  wins = [];
  const nearMiss = detectNearMiss(grid);

  await spinner.start(starts, { turbo, random, teaseReel: nearMiss ? machine.paylines[0][2][0] : -1 });
  if (nearMiss) {
    fx().banner('SO CLOSE!', theme().accent, 0);
    haptic([10, 10]);
  }

  const bet = betPerLine(state, machine);
  const lines = activeLines(state, machine);
  const result = cascade(grid, machine, random, symbolRandom, { betPerLine: bet, lines });

  for (const step of result.steps) {
    if (step.win <= 0) break;
    spinner.setGrid(step.grid);
    wins = step.wins;
    winBurst(step.wins);
    if (step.multiplier > 1) fx().signature(state.theme, theme().accent);
    audio.play(step.multiplier >= 3 ? 'bigwin' : 'win');
    haptic([18, 26, 18]);
    if (step.multiplier > 1) {
      setStatus(`CASCADE ×${step.multiplier}`);
      cabinet.spawn(270, 300, theme().accent, 22, 320);
    }
    refreshHUD();
    await sleep(step.wins.length ? 560 : 340);
  }

  spinner.setGrid(result.finalGrid);
  wins = result.steps.length && result.steps[0].win > 0
    ? result.steps[result.steps.length - 1].wins : [];

  const gross = result.totalWin;
  const paidMode = def ? def.wager : mode === 'normal';
  const won = mode === 'practice' || (def && !def.wager) ? gross : creditWin(state, gross, machine);
  const info = {
    gross, won,
    result: { ...result.firstResult, bestCascade: result.bestCascade },
    machine, cost, bet, lines, spinIndex: modeSession?.spins || 0,
  };
  if (mode === 'challenge') {
    challengeScore += gross;
    challengeSpins++;
  }
  if (def && modeSession) {
    modeSession.spins = (modeSession.spins || 0) + 1;
    const hook = def.onSpin(state, modeSession, info);
    if (hook && hook.status) setStatus(hook.status);
  }
  const questDone = quest.updateProgress(state, info);
  if (questDone) {
    creditWin(state, questDone.reward);
    ui.toast(`Quest complete: ${questDone.quest.name}  +${questDone.reward}`, 'gold');
  }

  state.stats.spins++;
  state.stats.linesWon += result.linesWon;
  state.stats.wildLines += result.wildLines;
  state.stats.bestCascade = Math.max(state.stats.bestCascade, result.bestCascade);
  if (won > 0) {
    state.stats.wins++;
    state.stats.scatters += result.firstResult.scatterCount;
    celebrate(won);
    setStatus(won >= 1000 ? `BIG WIN  +${won.toLocaleString()}` : `WIN  +${won.toLocaleString()}`);
  } else {
    audio.play('lose');
    setStatus('TRY AGAIN');
  }
  if (result.freeSpins > 0) {
    state.freeSpins += result.freeSpins;
    state.stats.freeSpinsWon += result.freeSpins;
    audio.play('free');
    ui.toast(`+${result.freeSpins} FREE SPINS!`, 'gold');
    fx().banner(`+${result.freeSpins} FREE SPINS`, '#5ec8ff', 1);
    fx().signature(state.theme, '#5ec8ff');
  }

  const discovered = discover(state, result.finalGrid, machine);
  if (discovered.length) ui.toast(`Discovered: ${discovered.join(', ')}`);
  persist();
  refreshHUD();

  const triggers = result.firstResult.jackpotTriggers;
  if (triggers.includes('respin')) await runScatterRespin(grid, bet, lines, random);
  if (triggers.includes('hold')) await runHold(random);
  if (triggers.includes('bonus')) await runBonus();
  if (triggers.includes('wheel')) await runWheel();

  if (mode === 'normal' && machine.mechanics.includes('gamble') && won >= cost * 4 && won > 0) {
    pendingGamble = won;
    ui.show('Double or Nothing', `<p class="sub">Your win: <b>${fmt(won)}</b>. Double it — or lose it.</p>
      <button class="btn primary wide" data-action="gambleYes">Gamble (press G)</button>
      <button class="btn wide" data-action="close">Bank it</button>`);
  }

  if (mode === 'normal' && machine.mechanics.includes('bonusBuy') && !state.challenge.completed) {
    // Offered quietly once per session per machine via the paytable note.
  }

  const meta = checkAllMeta(state);
  meta.missions.forEach((m) => ui.toast(`Mission: ${m.name}  +${m.reward}`, 'gold'));
  meta.achievements.forEach((a) => ui.toast(`Achievement: ${a.name}`, 'gold'));
  meta.collections.forEach((c) => { ui.toast(`Collection complete: ${c.name}!`, 'gold'); audio.jackpot(); });
  persist();
  refreshHUD();

  if (mode === 'challenge' && challengeSpins >= 5) {
    const res = finishChallenge(state, challengeScore);
    mode = 'normal';
    challengeRng = null;
    busy = false;
    setStatus('TAP SPIN OR PRESS SPACE');
    persist();
    refreshHUD();
    ui.showChallenge(res, challengeScore);
    await ui.waitClose();
    return;
  }

  if (paidMode && state.credits < cost && state.freeSpins === 0) ui.showGameOver();

  busy = false;
  const shouldFinish = def && modeSession && modeSession.done;
  setStatus('TAP SPIN OR PRESS SPACE');
  if (shouldFinish) {
    await finishActiveMode();
    return;
  }
  if (def && def.chain && !ui.isOpen) {
    setTimeout(() => { if (mode === def.id && !busy && !modeFinishing && modeSession && !modeSession.done) playSpin(); }, 400);
  } else if (mode === 'challenge') {
    setTimeout(() => { if (mode === 'challenge' && !busy) playSpin(); }, 500);
  } else if (auto && !ui.isOpen) {
    setTimeout(() => { if (auto) playSpin(); }, 420);
  }
}

/* Finish a tournament or rush run and present its results. */
async function finishActiveMode() {
  const def = modeDef();
  if (!def || modeFinishing) return;
  modeFinishing = true;
  busy = true;
  const panel = def.finish(state, modeSession, {});
  mode = 'normal';
  modeSession = null;
  modeFinishing = false;
  busy = false;
  persist();
  refreshHUD();
  setStatus('TAP SPIN OR PRESS SPACE');
  if (panel) {
    ui.show(panel.title, panel.html);
    await ui.waitClose();
  }
}

const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');

/* ---------- Feature sequences ---------- */

async function runWheel() {
  const roll = rand();
  const weights = machine.jackpotWeights || { mini: 50, minor: 30, major: 15, grand: 5 };
  let acc = 0, tier = 'mini';
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const [key, weight] of Object.entries(weights)) {
    acc += weight / total;
    if (roll <= acc) { tier = key; break; }
  }
  const amount = awardJackpot(state, jackpots, tier, machine);
  audio.jackpot();
  fx().banner('JACKPOT!', GLOBAL_JACKPOTS[tier].color, 3);
  fx().coinShower(270, 360, GLOBAL_JACKPOTS[tier].color, 70);
  fx().fireworks(GLOBAL_JACKPOTS[tier].color, 4);
  fx().flash('#ffffff', 0.55);
  fx().shakeScreen(16);
  fx().signature(state.theme, GLOBAL_JACKPOTS[tier].color);
  haptic([30, 40, 30, 40, 60]);
  persist();
  ui.showWheel(tier, amount);
  await ui.waitClose();
}

async function runBonus() {
  const pool = (machine.bonus?.pool || [250, 500, 1000, 'FREE', 'MINI', 'MINOR']).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, machine.bonus?.picks || 3).map((p) => ({
    label: p === 'FREE' ? '+5 FREE' : p === 'MINI' ? 'MINI JP' : p === 'MINOR' ? 'MINOR JP' : `+${fmt(p)}`,
    apply: () => {
      if (p === 'FREE') { state.freeSpins += 5; state.stats.freeSpinsWon += 5; }
      else if (p === 'MINI' || p === 'MINOR') awardJackpot(state, jackpots, p.toLowerCase(), machine);
      else creditWin(state, p, machine);
    },
  }));
  let chosen = [];
  fx().confetti(theme().accent, 40);
  audio.play('bonus');
  ui.showBonus(picks, (index) => {
    if (chosen.includes(index)) return;
    chosen.push(index);
    picks[index].apply();
    audio.play('win');
    persist();
    refreshHUD();
    ui.updateBonus(picks, chosen);
    if (chosen.length === picks.length) setTimeout(() => ui.hide(), 1000);
  });
  await ui.waitClose();
}

async function runHold(random) {
  const start = spinner.getRenderState().map((rs) => rs.symbols.slice(1, 1 + machine.rows));
  const seq = runHoldSequence(machine, random, symbolRandom, start);
  audio.play('hold');
  for (const frame of seq.frames) {
    spinner.setGrid(frame);
    fx().coinShower(270, 320, theme().edge, 12);
    audio.play('coin');
    haptic(12);
    await sleep(420);
  }
  if (seq.value > 0) creditWin(state, seq.value, machine);
  if (seq.full) {
    fx().banner('FULL VAULT!', theme().edge, 3);
    fx().fireworks(theme().edge, 3);
    fx().shakeScreen(12);
    awardJackpot(state, jackpots, 'grand', machine);
  }
  state.stats.holdWins++;
  persist();
  refreshHUD();
  ui.showHold(seq.value, seq.full, seq.coins);
  await ui.waitClose();
}

async function runScatterRespin(grid, bet, lines, random) {
  const held = [];
  grid.forEach((reel, r) => reel.forEach((s, c) => { if (s === machine.scatter) held.push([r, c]); }));
  const respun = grid.map((reel, r) => reel.map((s, c) =>
    held.some(([hr, hc]) => hr === r && hc === c) ? s : symbolRandom(c, random)));
  spinner.setGrid(respun);
  setStatus('SCATTER RESPIN!');
  audio.play('free');
  await sleep(700);
  const extra = evaluateGrid(respun, machine, { betPerLine: bet, lines });
  if (extra.totalWin > 0) {
    creditWin(state, extra.totalWin, machine);
    extra.wins.forEach((w) => cabinet.burstWin(w, machine, theme()));
    persist();
    refreshHUD();
  }
}

function runGamble() {
  if (!pendingGamble || mode !== 'normal') return;
  const amount = pendingGamble;
  state.credits -= amount;
  const g = gambleRound(rand);
  if (g.win) {
    creditWin(state, amount * 2, machine);
    state.gambleStreak++;
    state.stats.gamblesWon++;
  } else {
    state.gambleStreak = 0;
  }
  persist();
  refreshHUD();
  ui.showGamble(amount, g.player, g.dealer, g.win);
  ui.setHandlers({
    gambleAgain: () => { ui.hide(); pendingGamble = amount * 2; runGamble(); },
  });
}

/* ---------- Actions ---------- */

function selectMachineById(id) {
  const target = getMachine(id);
  if (!isUnlocked(target, vip(state))) {
    ui.toast(`Reach VIP ${target.unlockLevel} to unlock ${target.name}`);
    return;
  }
  machine = selectMachine(state, target.id);
  spinner.reset(machine.strips, machine.rows);
  applyTheme();
  sticky = []; shiftColumn = 0; wins = [];
  persist(); refreshHUD();
  ui.hideLobby();
  audio.play('lobby');
  ui.showWelcome(machine);
}

function togglePractice() {
  practice = !practice;
  mode = practice ? 'practice' : 'normal';
  ui.toast(practice ? 'Practice mode — no credits wagered' : 'Practice mode off');
  if (ui.lobbyOpen) ui.showLobby(state, practice, ui.activeModeTab);
  if (ui.isOpen && !ui.lobbyOpen) ui.showSettings(R2, state, state.theme, practice);
}

function startChallenge() {
  if (mode === 'challenge') return;
  if (state.challenge.last === todayKey() && state.challenge.completed) {
    ui.toast('Daily challenge already completed — come back tomorrow!');
    return;
  }
  mode = 'challenge';
  challengeRng = makeRng(dailySeed(todayKey(), machine.id));
  challengeScore = 0;
  challengeSpins = 0;
  practice = false;
  setStatus('DAILY CHALLENGE · 5 SEEDED SPINS');
  ui.toast('Daily challenge started — 5 seeded spins!', 'gold');
  setTimeout(() => { if (mode === 'challenge') playSpin(); }, 250);
}

function startMode(modeId, machineId) {
  const def = getExtraMode(modeId);
  if (!def || def.panelOnly) return;
  if (busy || modeFinishing) {
    ui.toast('Wait for the current spin to finish first');
    return;
  }
  if (machineId) {
    const target = getMachine(machineId);
    if (!isUnlocked(target, vip(state))) {
      ui.toast(`Reach VIP ${target.unlockLevel} to unlock ${target.name}`);
      return;
    }
    machine = selectMachine(state, target.id);
    spinner.reset(machine.strips, machine.rows);
    applyTheme();
  }
  const check = def.canEnter(state, machine, {});
  if (!check.ok) { ui.toast(check.reason || 'Cannot enter this mode'); return; }
  modeSession = def.start(state, machine);
  if (modeId === 'rush') modeSession.startedAt = performance.now();
  mode = modeId;
  auto = false;
  practice = false;
  sticky = []; shiftColumn = 0; wins = [];
  ui.hideLobby(); ui.hide();
  persist(); refreshHUD();
  ui.toast(`${def.icon} ${def.name} started!`, 'gold');
  setStatus(`${def.name.toUpperCase()} · GET READY`);
  setTimeout(() => { if (mode === modeId && !busy) playSpin(); }, 500);
}

function action(id, data = {}) {
  switch (id) {
    case 'spin': playSpin(); break;
    case 'auto':
      auto = !auto;
      ui.toast(auto ? 'Auto-spin ON' : 'Auto-spin OFF');
      if (auto && !busy && !ui.isOpen) playSpin();
      break;
    case 'turbo': turbo = !turbo; ui.toast(turbo ? 'Turbo ON' : 'Turbo OFF'); break;
    case 'bet': cycleBet(state, machine, 1); persist(); refreshHUD(); audio.play('click'); break;
    case 'lines': cycleLines(state, machine, 1); persist(); refreshHUD(); audio.play('click'); break;
    case 'paytable': ui.showPaytable(machine); break;
    case 'settings': ui.showSettings(R2, state, state.theme, practice); break;
    case 'stats': ui.showStats(state); break;
    case 'collections': ui.showCollections(state); break;
    case 'lobby': ui.hide(); ui.showLobby(state, practice, modeDef() ? modeDef().id : 'play'); audio.play('lobby'); break;
    case 'modeTab': ui.showLobby(state, practice, data.tab); audio.play('click'); break;
    case 'startMode': startMode(data.mode, data.machine); break;
    case 'activateQuest': {
      const res = quest.activate(state, data.id);
      if (res.ok) {
        persist();
        ui.toast(`Quest activated: ${res.quest.name}`, 'gold');
        ui.showLobby(state, practice, 'quest');
      } else ui.toast(res.reason);
      break;
    }
    case 'selectMachine': selectMachineById(data.id); break;
    case 'togglePractice': togglePractice(); break;
    case 'theme':
      state.theme = data.theme || state.theme;
      applyTheme(); persist();
      ui.hide();
      if (ui.lobbyOpen) ui.showLobby(state, practice, ui.activeModeTab);
      break;
    case 'setting':
      try { R2?.setSettings?.({ [data.setting]: data.value }); } catch (e) {}
      break;
    case 'daily': {
      const result = claimDaily(state);
      persist(); refreshHUD();
      ui.showDaily(result, state);
      if (result.claimed) { audio.play('bonus'); cabinet.spawn(270, 880, theme().accent, 30, 260); }
      break;
    }
    case 'challenge': startChallenge(); break;
    case 'collect': topUp(state); persist(); refreshHUD(); ui.hide(); break;
    case 'gambleYes': {
      const amount = pendingGamble;
      ui.hide();
      setTimeout(() => { pendingGamble = amount; runGamble(); }, 60);
      break;
    }
    case 'buyBonus':
      if (machine.mechanics.includes('bonusBuy')) {
        const cost = bonusBuyCost(wager(state, machine));
        if (state.credits < cost) { ui.toast('Not enough credits for the bonus'); break; }
        state.credits -= cost;
        state.freeSpins += machine.freeSpinsTable?.[3] || 8;
        persist(); refreshHUD(); ui.hide();
        ui.toast('Bonus bought — free spins loaded!', 'gold');
      }
      break;
    case 'reset':
      state.credits = 1000; state.freeSpins = 0; state.lastWin = 0;
      state.stats.spins = 0; state.stats.wins = 0; state.stats.linesWon = 0;
      persist(); refreshHUD(); ui.hide(); ui.toast('Session reset — VIP and jackpots kept');
      break;
    case 'close': ui.hide(); break;
    default: break;
  }
}

/* Bonus buy is surfaced from the paytable for machines that support it. */
const originalShowPaytable = ui.showPaytable.bind(ui);
ui.showPaytable = (m) => {
  originalShowPaytable(m);
  if (m.mechanics.includes('bonusBuy')) {
    ui.body.insertAdjacentHTML('beforeend', `<button class="btn wide" data-action="buyBonus">⚡ Buy bonus (${fmt(bonusBuyCost(wager(state, m)))})</button>`);
  }
};

/* ---------- Loop + init ---------- */

function loop(now) {
  const dt = lastTime ? (now - lastTime) / 1000 : 0;
  lastTime = now;
  if (mode === 'rush' && modeSession && modeSession.startedAt && !modeSession.done) {
    const tick = getExtraMode('rush').onTick(state, modeSession, (now - modeSession.startedAt) / 1000);
    if (tick && tick.status) setStatus(tick.status);
    if (tick && tick.done && !busy) finishActiveMode();
  }
  spinner.update(now);
  cabinet.draw({
    spinner, state, jackpots, machine, theme: theme(), themeKey: state.theme, wins, status, dt, time: now,
    auto, turbo, mode: mode === 'normal' ? null : mode,
    bet: betPerLine(state, machine), lines: activeLines(state, machine), payMode: machine.payMode,
    dailyReady: state.daily.last !== todayKey(),
    challengeReady: !(state.challenge.last === todayKey() && state.challenge.completed),
  });
  refreshHUD();
  requestAnimationFrame(loop);
}

function init() {
  applyTheme();
  spinner.reset(machine.strips, machine.rows);
  setupInput(document.getElementById('game-canvas'), cabinet, { action });
  const delegated = [
    'buyBonus', 'selectMachine', 'togglePractice', 'collections', 'lobby',
    'challenge', 'gambleYes', 'gambleAgain', 'paytable', 'stats', 'settings',
    'modeTab', 'startMode', 'activateQuest',
  ];
  ui.setHandlers(Object.fromEntries(delegated.map((name) => [name, (data) => action(name, data)])));
  ui.setHandlers({ setting: (key, value) => action('setting', { setting: key, value }) });
  setupPWA(ui);
  markPlayed(R2);
  audio.startMusic();
  requestAnimationFrame(loop);

  const panel = new URLSearchParams(location.search).get('panel');
  if (panel === 'lobby') ui.showLobby(state, practice, 'play');
  else if (panel === 'quests') { ui.showLobby(state, practice, 'quest'); }
  else if (panel === 'paytable') ui.showPaytable(machine);
  else if (panel === 'daily') action('daily');
  else if (!localStorage.getItem('slot-welcomed')) {
    ui.showWelcome(machine);
    try { localStorage.setItem('slot-welcomed', 'true'); } catch (e) {}
  } else if (state.daily.last !== todayKey()) {
    ui.toast('Daily bonus available — tap DAILY!', 'gold');
  }

  window.__slot = {
    state: () => state,
    machine: () => machine,
    mode: () => mode,
    modeSession: () => modeSession,
    practice: () => practice,
    action,
    spin: playSpin,
    spinner,
    cabinet,
    machines: MACHINES,
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
