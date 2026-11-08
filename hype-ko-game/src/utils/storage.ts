import { DEFAULT_P1_BINDINGS, DEFAULT_P2_BINDINGS, type Bindings } from '../game/input/bindings';
import { MISSIONS } from '../data/missions';

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  announcer: boolean;
  quality: 'low' | 'medium' | 'high';
  reduceMotion: boolean;
  showHints: boolean;
  touchControls: 'auto' | 'on' | 'off';
  bindingsP1: Bindings;
  bindingsP2: Bindings;
}

export interface MissionProgress {
  [missionId: string]: number;
}

export interface TournamentState {
  playerFighter: string;
  difficulty: string;
  round: number;
  bracket: { a: string; b: string; winner?: string }[][];
  eliminated: boolean;
  champion: boolean;
}

export interface Profile {
  name: string;
  xp: number;
  credits: number;
  matches: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  maxCombo: number;
  totalDamage: number;
  totalHits: number;
  superUses: number;
  finishers: number;
  perfectRounds: number;
  missions: MissionProgress;
  tournament: TournamentState | null;
  lastPlayed: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  wins: number;
  date: number;
}

const PROFILE_KEY = 'hypeko.profile.v1';
const SETTINGS_KEY = 'hypeko.settings.v1';
const LEADERBOARD_KEY = 'hypeko.leaderboard.v1';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  announcer: true,
  quality: 'medium',
  reduceMotion: false,
  showHints: true,
  touchControls: 'auto',
  bindingsP1: DEFAULT_P1_BINDINGS,
  bindingsP2: DEFAULT_P2_BINDINGS
};

export const DEFAULT_PROFILE: Profile = {
  name: 'NUOVO IDOLO',
  xp: 0,
  credits: 0,
  matches: 0,
  wins: 0,
  losses: 0,
  streak: 0,
  bestStreak: 0,
  maxCombo: 0,
  totalDamage: 0,
  totalHits: 0,
  superUses: 0,
  finishers: 0,
  perfectRounds: 0,
  missions: {},
  tournament: null,
  lastPlayed: 0
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadProfile(): Profile {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PROFILE };
  const stored = safeParse<Partial<Profile>>(localStorage.getItem(PROFILE_KEY), {});
  return {
    ...DEFAULT_PROFILE,
    ...stored,
    missions: { ...DEFAULT_PROFILE.missions, ...(stored.missions ?? {}) },
    tournament: stored.tournament ?? null
  };
}

export function saveProfile(profile: Profile): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadSettings(): GameSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  const stored = safeParse<Partial<GameSettings>>(localStorage.getItem(SETTINGS_KEY), {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    bindingsP1: stored.bindingsP1 ?? DEFAULT_SETTINGS.bindingsP1,
    bindingsP2: stored.bindingsP2 ?? DEFAULT_SETTINGS.bindingsP2
  };
}

export function saveSettings(settings: GameSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<LeaderboardEntry[]>(localStorage.getItem(LEADERBOARD_KEY), []);
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const entries = loadLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score || b.wins - a.wins);
  const trimmed = entries.slice(0, 50);
  saveLeaderboard(trimmed);
  return trimmed;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 120;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const current = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return { level, current, needed, ratio: needed > 0 ? current / needed : 1 };
}

export interface MatchSummary {
  won: boolean;
  mode: string;
  playerFighter: string;
  opponentFighter: string;
  damageDealt: number;
  maxCombo: number;
  hits: number;
  superUses: number;
  finishers: number;
  perfectRounds: number;
  roundsWon: number;
  roundsLost: number;
  matchTime: number;
}

export function applyMatchToProfile(
  profile: Profile,
  summary: MatchSummary
): { profile: Profile; xp: number; credits: number; completedMissions: string[] } {
  const xpBase = summary.won ? 140 : 55;
  const xpBonus = Math.min(180, summary.maxCombo * 8 + summary.damageDealt / 40);
  const xp = Math.round(xpBase + xpBonus + (summary.finishers > 0 ? 80 : 0));
  const credits = summary.won ? 120 + summary.maxCombo * 5 : 40;
  const next: Profile = {
    ...profile,
    xp: profile.xp + xp,
    credits: profile.credits + credits,
    matches: profile.matches + 1,
    wins: profile.wins + (summary.won ? 1 : 0),
    losses: profile.losses + (summary.won ? 0 : 1),
    streak: summary.won ? profile.streak + 1 : 0,
    bestStreak: Math.max(profile.bestStreak, summary.won ? profile.streak + 1 : 0),
    maxCombo: Math.max(profile.maxCombo, summary.maxCombo),
    totalDamage: profile.totalDamage + summary.damageDealt,
    totalHits: profile.totalHits + summary.hits,
    superUses: profile.superUses + summary.superUses,
    finishers: profile.finishers + summary.finishers,
    perfectRounds: profile.perfectRounds + summary.perfectRounds,
    lastPlayed: Date.now(),
    missions: { ...profile.missions }
  };

  const completed: string[] = [];
  const progress = { ...next.missions };
  for (const mission of MISSIONS) {
    if (progress[mission.id] !== undefined && progress[mission.id] >= mission.target) continue;
    let value = progress[mission.id] ?? 0;
    switch (mission.type) {
      case 'matches':
        value = next.matches;
        break;
      case 'wins':
        value = next.wins;
        break;
      case 'combo':
        value = Math.max(value, summary.maxCombo);
        break;
      case 'supers':
        value = next.superUses;
        break;
      case 'finishers':
        value = next.finishers;
        break;
      case 'damage':
        value = next.totalDamage;
        break;
      case 'streak':
        value = next.bestStreak;
        break;
      case 'perfect':
        value = next.perfectRounds;
        break;
      case 'teamWin':
        value = next.missions[mission.id] ?? 0;
        if (summary.won && summary.mode === 'team') value += 1;
        break;
      case 'rumbleWin':
        value = next.missions[mission.id] ?? 0;
        if (summary.won && summary.mode === 'rumble') value += 1;
        break;
      default:
        break;
    }
    progress[mission.id] = Math.max(value, progress[mission.id] ?? 0);
    if (progress[mission.id] >= mission.target && (next.missions[mission.id] ?? 0) < mission.target) {
      completed.push(mission.id);
      next.xp += mission.xp;
      next.credits += mission.credits;
    }
  }
  next.missions = progress;
  return { profile: next, xp, credits, completedMissions: completed };
}

export function resetProfile(): Profile {
  const profile = { ...DEFAULT_PROFILE, missions: {} };
  saveProfile(profile);
  return profile;
}
