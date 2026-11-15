import { FINAL_CHAPTER_ID, TOTAL_CHAPTERS } from './content.js';
import { RANKS, STORE_KEY } from './config.js';

function safeStore(store) {
  if (store) return store;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function defaultProfile() {
  return {
    version: 2,
    unlocked: 1,
    completed: [],
    best: {},
    totalKills: 0,
    totalDeaths: 0,
    endingSeen: false,
    createdAt: null,
    updatedAt: null
  };
}

function normalizeBest(raw) {
  const best = {};
  if (!raw || typeof raw !== 'object') return best;
  for (const [id, entry] of Object.entries(raw)) {
    const chapter = Number(id);
    if (chapter < 1 || chapter > TOTAL_CHAPTERS || !entry || typeof entry !== 'object') continue;
    best[chapter] = {
      rank: RANKS.includes(entry.rank) ? entry.rank : 'C',
      time: Math.max(0, Number(entry.time) || 0),
      accuracy: Math.max(0, Math.min(1, Number(entry.accuracy) || 0))
    };
  }
  return best;
}

function migrateV1(raw) {
  const profile = defaultProfile();
  const rawBest = normalizeBest(raw.best);
  profile.best = Object.fromEntries(Object.entries(rawBest).filter(([id]) => Number(id) <= 2));
  if (rawBest[3]) {
    profile.best[5] = { ...rawBest[3] };
    profile.best[6] = { ...rawBest[3] };
  }
  const completed = Array.isArray(raw.completed)
    ? raw.completed.map(Number).filter((id) => id >= 1 && id <= 3)
    : [];
  profile.completed = completed.filter((id) => id <= 2);
  if (completed.includes(3)) {
    profile.completed.push(5, 6);
    profile.unlocked = Math.max(3, Math.min(TOTAL_CHAPTERS, Number(raw.unlocked) || 3));
    profile.endingSeen = true;
  } else {
    profile.unlocked = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(raw.unlocked) || 1));
    profile.endingSeen = Boolean(raw.endingSeen);
  }
  profile.totalKills = Math.max(0, Number(raw.totalKills) || 0);
  profile.totalDeaths = Math.max(0, Number(raw.totalDeaths) || 0);
  profile.createdAt = raw.createdAt || null;
  profile.updatedAt = raw.updatedAt || null;
  return profile;
}

export function normalize(raw) {
  if (!raw || typeof raw !== 'object') return defaultProfile();
  if (Number(raw.version) < 2) return migrateV1(raw);
  const profile = defaultProfile();
  profile.unlocked = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(raw.unlocked) || 1));
  profile.completed = Array.isArray(raw.completed)
    ? [...new Set(raw.completed.map(Number).filter((id) => id >= 1 && id <= TOTAL_CHAPTERS))]
    : [];
  profile.best = normalizeBest(raw.best);
  profile.totalKills = Math.max(0, Number(raw.totalKills) || 0);
  profile.totalDeaths = Math.max(0, Number(raw.totalDeaths) || 0);
  profile.endingSeen = Boolean(raw.endingSeen);
  profile.createdAt = raw.createdAt || null;
  profile.updatedAt = raw.updatedAt || null;
  return profile;
}

export function loadProfile(store) {
  const target = safeStore(store);
  if (!target) return defaultProfile();
  try {
    return normalize(JSON.parse(target.getItem(STORE_KEY) || '{}'));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile, store) {
  const target = safeStore(store);
  const now = new Date().toISOString();
  profile.version = 2;
  profile.updatedAt = now;
  profile.createdAt ||= now;
  if (!target) return profile;
  try {
    target.setItem(STORE_KEY, JSON.stringify(profile));
  } catch {}
  return profile;
}

export function recordChapter(profile, summary) {
  const id = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(summary?.chapterId) || 1));
  const previousBest = profile.best[id] || null;
  const previousRank = previousBest?.rank || 'C';
  const rank = RANKS.includes(summary?.rank) ? summary.rank : 'C';
  const isBestRank = RANKS.indexOf(rank) > RANKS.indexOf(previousRank);
  const isBestTime = !previousBest || summary.time < previousBest.time;
  const best = {
    rank: isBestRank ? rank : previousRank,
    time: isBestTime ? summary.time : previousBest?.time || summary.time,
    accuracy: Math.max(previousBest?.accuracy || 0, summary?.accuracy || 0)
  };
  profile.best[id] = best;
  if (!profile.completed.includes(id)) profile.completed.push(id);
  profile.unlocked = Math.max(profile.unlocked, Math.min(TOTAL_CHAPTERS, id + 1));
  profile.totalKills += Math.max(0, Number(summary?.kills) || 0);
  profile.totalDeaths += Math.max(0, Number(summary?.deaths) || 0);
  if (id === FINAL_CHAPTER_ID) profile.endingSeen = true;
  return {
    rank,
    isBestRank,
    isBestTime,
    previousBest,
    unlocked: profile.unlocked,
    endingSeen: profile.endingSeen
  };
}

export function resetProfile(profile, store) {
  const fresh = defaultProfile();
  saveProfile(fresh, store);
  return fresh;
}

export function rankAtLeast(rank, target) {
  return RANKS.indexOf(rank) >= RANKS.indexOf(target);
}
