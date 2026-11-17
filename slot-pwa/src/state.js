/* Session state, shared wallet, VIP progression and persistence. Storage is injected. */
import {
  STORAGE_KEY, JACKPOT_KEY, GLOBAL_JACKPOTS, VIP_LEVELS,
  DEFAULT_LINES, XP_PER_WAGER, vipLevel, todayKey,
} from './config.js';
import { MACHINES, getMachine } from './machines/index.js';
import { growJackpots, xpFor } from './engine.js';

export function defaults() {
  return {
    credits: 1000,
    betIndex: 1,
    linesIndex: 3,
    freeSpins: 0,
    theme: 'neon',
    machineId: 'lucky-seven',
    highScore: 0,
    lastWin: 0,
    xp: 0,
    gambleStreak: 0,
    daily: { last: '', streak: 0, calendar: [] },
    challenge: { last: '', score: 0, completed: false, best: 0 },
    modes: {
      tournament: { results: {} },
      rush: { best: 0, runs: 0, last: 0 },
      bonusHunt: { best: 0, runs: 0, last: 0 },
      boss: { best: 0, runs: 0, last: 0 },
      chase: { best: 0, runs: 0, last: 0 },
      cascade: { best: 0, runs: 0, last: 0 },
      roulette: { best: 0, runs: 0, last: 0 },
      highRoller: { best: 0, runs: 0, last: 0 },
      quest: { active: null, completed: [], progress: {} },
    },
    trophies: [],
    discovered: [],
    collections: [],
    machineStats: {},
    stats: {
      spins: 0, wins: 0, linesWon: 0, scatters: 0, bestCascade: 0,
      wildLines: 0, totalWagered: 0, totalWon: 0, biggestWin: 0,
      freeSpinsWon: 0, jackpotsWon: 0, bonusWins: 0, holdWins: 0,
      machinesPlayed: 0, gamblesWon: 0, challenges: 0,
      tournaments: 0, rushes: 0, quests: 0,
    },
    missions: {},
    achievements: [],
  };
}

export function jackpotDefaults() {
  const out = {};
  for (const key of Object.keys(GLOBAL_JACKPOTS)) out[key] = GLOBAL_JACKPOTS[key].base;
  return out;
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (saved[key] === undefined) continue;
    if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = merge(base[key], saved[key]);
    } else {
      out[key] = saved[key];
    }
  }
  return out;
}

export function load(storage) {
  try {
    const raw = storage && storage.getItem(STORAGE_KEY);
    return merge(defaults(), raw ? JSON.parse(raw) : null);
  } catch (e) { return defaults(); }
}
export function save(storage, state) {
  try { storage && storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
export function loadJackpots(storage) {
  try {
    const raw = storage && storage.getItem(JACKPOT_KEY);
    return merge(jackpotDefaults(), raw ? JSON.parse(raw) : null);
  } catch (e) { return jackpotDefaults(); }
}
export function saveJackpots(storage, jackpots) {
  try { storage && storage.setItem(JACKPOT_KEY, JSON.stringify(jackpots)); } catch (e) {}
}

export const machineOf = (state) => getMachine(state.machineId);
export const vip = (state) => vipLevel(state.xp);
export const vipName = (state) => ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'][vip(state) - 1];
export const betPerLine = (state, machine = machineOf(state)) => machine.betSteps[state.betIndex % machine.betSteps.length];
export const activeLines = (state, machine = machineOf(state)) => {
  const opts = machine.lineOptions || [DEFAULT_LINES];
  // Ways/cluster games have no selectable lines: keep a 20-unit stake so the
  // effective wager stays comparable to a 20-line machine.
  if (machine.payMode === 'cluster' || machine.payMode === 'ways') return machine.effectiveLines || DEFAULT_LINES;
  return opts[state.linesIndex % opts.length];
};
export const wager = (state, machine = machineOf(state)) => betPerLine(state, machine) * activeLines(state, machine);
export const canSpin = (state, machine = machineOf(state)) => state.freeSpins > 0 || state.credits >= wager(state, machine);

export function machineStats(state, id = state.machineId) {
  if (!state.machineStats[id]) {
    state.machineStats[id] = { spins: 0, wins: 0, won: 0, wagered: 0, biggestWin: 0, bonus: 0 };
  }
  return state.machineStats[id];
}

export function selectMachine(state, id) {
  const m = getMachine(id);
  state.machineId = m.id;
  if (m.theme) state.theme = m.theme;
  const opts = m.lineOptions || [1];
  state.betIndex = Math.min(state.betIndex, m.betSteps.length - 1);
  state.linesIndex = opts.length - 1; // start every machine at max lines
  if (!state.machineStats[m.id]) machineStats(state, m.id);
  if (!state.discovered.length) {
    // Seed the collection with the symbols of the first machine played.
    m.symbolList.forEach((s) => {
      if (!state.discovered.includes(s.key) && s.key !== m.wild && s.key !== m.scatter) {
        state.discovered.push(s.key);
      }
    });
  }
  if (!state.stats.machinesPlayed || state.lastMachine !== m.id) {
    state.stats.machinesPlayed = Object.keys(state.machineStats).length;
    state.lastMachine = m.id;
  }
  return m;
}

export function chargeSpin(state, machine, jackpots) {
  const bet = wager(state, machine);
  if (state.freeSpins > 0) {
    state.freeSpins--;
    return { free: true, bet, jackpots };
  }
  state.credits -= bet;
  state.stats.totalWagered += bet;
  state.xp = Math.round((state.xp + xpFor(bet)) * 100) / 100;
  const ms = machineStats(state, machine.id);
  ms.wagered += bet;
  ms.spins++;
  return { free: false, bet, jackpots: growJackpots(jackpots, bet) };
}

export function creditWin(state, amount, machine = null) {
  const value = Math.max(0, Math.floor(amount));
  state.credits += value;
  state.lastWin = value;
  state.stats.totalWon += value;
  if (value > state.stats.biggestWin) state.stats.biggestWin = value;
  if (state.credits > state.highScore) state.highScore = state.credits;
  if (machine) {
    const ms = machineStats(state, machine.id);
    ms.won += value;
    if (value > ms.biggestWin) ms.biggestWin = value;
  }
  return value;
}

export function topUp(state, amount = 500) {
  state.credits = Math.max(state.credits, amount);
  return state.credits;
}

export function cycleBet(state, machine = machineOf(state), dir = 1) {
  const n = machine.betSteps.length;
  state.betIndex = ((state.betIndex + dir) % n + n) % n;
}
export function cycleLines(state, machine = machineOf(state), dir = 1) {
  const opts = machine.lineOptions || [1];
  const n = opts.length;
  state.linesIndex = ((state.linesIndex + dir) % n + n) % n;
}

export function awardJackpot(state, jackpots, tier, machine = null) {
  const def = GLOBAL_JACKPOTS[tier];
  if (!def) return 0;
  const amount = Math.floor(jackpots[tier] || def.base);
  creditWin(state, amount, machine);
  jackpots[tier] = def.base;
  state.stats.jackpotsWon++;
  return amount;
}

export { todayKey, vipLevel, VIP_LEVELS };
