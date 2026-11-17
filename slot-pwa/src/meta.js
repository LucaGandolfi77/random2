/* Meta progression: dailies, calendar, missions, achievements and collections. */
import {
  MISSIONS, ACHIEVEMENTS, COLLECTIONS, CALENDAR_REWARDS, todayKey, vipLevel,
} from './config.js';
import { creditWin } from './state.js';

const DAY = 86400000;
const isYesterday = (last, today) =>
  !!last && new Date(`${today}T00:00:00`).getTime() - new Date(`${last}T00:00:00`).getTime() === DAY;

export function claimDaily(state, date = new Date()) {
  const key = todayKey(date);
  if (state.daily.last === key) return { claimed: false, reward: 0, streak: state.daily.streak, free: 0 };
  state.daily.streak = isYesterday(state.daily.last, key) ? state.daily.streak + 1 : 1;
  state.daily.last = key;
  const index = Math.min(state.daily.streak, 7) - 1;
  const reward = Math.min(2000, 200 + (state.daily.streak - 1) * 100);
  const cal = CALENDAR_REWARDS[index];
  creditWin(state, reward + cal.credits);
  state.freeSpins += cal.free;
  if (!state.daily.calendar.includes(index)) state.daily.calendar.push(index);
  state.stats.bonusWins += reward + cal.credits;
  return { claimed: true, reward: reward + cal.credits, streak: state.daily.streak, free: cal.free };
}

export function missionProgress(state, mission) {
  return Math.min(mission.goal, state.stats[mission.stat] || 0);
}

export function checkMissions(state) {
  const unlocked = [];
  for (const m of MISSIONS) {
    if (state.missions[m.id] || missionProgress(state, m) < m.goal) continue;
    state.missions[m.id] = true;
    creditWin(state, m.reward);
    state.stats.bonusWins += m.reward;
    unlocked.push({ ...m });
  }
  return unlocked;
}

const ACHIEVEMENT_TESTS = {
  firstWin: (s) => s.stats.wins > 0,
  bigWin: (s) => s.stats.biggestWin >= 1000,
  megaWin: (s) => s.stats.biggestWin >= 10000,
  freeSpins: (s) => s.stats.freeSpinsWon > 0,
  jackpot: (s) => s.stats.jackpotsWon > 0,
  allLines: (s) => s.linesIndex === 3,
  daily7: (s) => s.daily.streak >= 7,
  collector: (s) => s.collections.length > 0,
  vip3: (s) => vipLevel(s.xp) >= 3,
  gamble5: (s) => s.gambleStreak >= 5,
  challenge: (s) => s.stats.challenges > 0,
};

export function checkAchievements(state) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    const test = ACHIEVEMENT_TESTS[a.id];
    if (test && test(state)) {
      state.achievements.push(a.id);
      unlocked.push(a);
    }
  }
  return unlocked;
}

/* Discover symbols from a grid; award completed collections. */
export function discover(state, grid, machine) {
  const newOnes = [];
  for (const reel of grid) for (const s of reel) {
    if (s === machine.wild || s === machine.scatter || s === '·') continue;
    if (!state.discovered.includes(s)) { state.discovered.push(s); newOnes.push(s); }
  }
  return newOnes;
}

export function checkCollections(state) {
  const completed = [];
  for (const c of COLLECTIONS) {
    if (state.collections.includes(c.id)) continue;
    if (c.symbols.every((s) => state.discovered.includes(s))) {
      state.collections.push(c.id);
      creditWin(state, c.reward);
      state.stats.bonusWins += c.reward;
      completed.push(c);
    }
  }
  return completed;
}

/* Daily challenge: seeded play plus simulated rivals. */
export function finishChallenge(state, score, date = new Date()) {
  const key = todayKey(date);
  if (state.challenge.last === key && state.challenge.completed) {
    return { already: true, rank: 0, reward: 0 };
  }
  const rivals = [420, 780, 1150, 1600, 2400, 3300, 4800];
  const rank = rivals.filter((r) => r > score).length + 1;
  const reward = Math.max(100, Math.round(1200 / rank));
  creditWin(state, reward);
  state.challenge = {
    last: key, score, completed: true,
    best: Math.max(state.challenge.best || 0, score),
    reward, rank,
  };
  state.stats.challenges++;
  return { already: false, rank, reward };
}

export function checkAllMeta(state) {
  return {
    missions: checkMissions(state),
    achievements: checkAchievements(state),
    collections: checkCollections(state),
  };
}
