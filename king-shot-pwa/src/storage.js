import { OATHS, STORE_KEY, THEME_ORDER } from './config.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from './content.js';
import { dateKey, shiftDateKey } from './rng.js';

function storageOrNull(store) {
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
    best: 0,
    bestWave: 1,
    plays: 0,
    bestByOath: { squire: 0, knight: 0, warlord: 0 },
    totalKills: 0,
    totalBosses: 0,
    totalBullseyes: 0,
    daily: {
      lastDate: null,
      streak: 0,
      best: 0,
      bestByDate: {}
    },
    achievements: {},
    theme: 'royal',
    oath: 'knight',
    tutorialDone: false,
    createdAt: null,
    updatedAt: null
  };
}

function normalize(raw) {
  const profile = defaultProfile();
  if (!raw || typeof raw !== 'object') return profile;
  profile.best = Math.max(0, Number(raw.best ?? raw.highScore) || 0);
  profile.bestWave = Math.max(1, Number(raw.bestWave) || 1);
  profile.plays = Math.max(0, Number(raw.plays) || 0);
  profile.totalKills = Math.max(0, Number(raw.totalKills) || 0);
  profile.totalBosses = Math.max(0, Number(raw.totalBosses) || 0);
  profile.totalBullseyes = Math.max(0, Number(raw.totalBullseyes) || 0);
  profile.theme = THEME_ORDER.includes(raw.theme) ? raw.theme : 'royal';
  profile.oath = OATHS[raw.oath] ? raw.oath : 'knight';
  profile.tutorialDone = Boolean(raw.tutorialDone ?? profile.plays > 0);
  profile.createdAt = raw.createdAt || null;
  profile.updatedAt = raw.updatedAt || null;

  if (raw.bestByOath && typeof raw.bestByOath === 'object') {
    for (const id of Object.keys(profile.bestByOath)) {
      profile.bestByOath[id] = Math.max(0, Number(raw.bestByOath[id]) || 0);
    }
  } else if (profile.best > 0) {
    profile.bestByOath.knight = profile.best;
  }

  if (raw.daily && typeof raw.daily === 'object') {
    profile.daily.lastDate =
      typeof raw.daily.lastDate === 'string' ? raw.daily.lastDate : null;
    profile.daily.streak = Math.max(0, Number(raw.daily.streak) || 0);
    profile.daily.best = Math.max(0, Number(raw.daily.best) || 0);
    if (raw.daily.bestByDate && typeof raw.daily.bestByDate === 'object') {
      for (const [key, value] of Object.entries(raw.daily.bestByDate)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          profile.daily.bestByDate[key] = Math.max(0, Number(value) || 0);
        }
      }
    }
  }

  if (raw.achievements && typeof raw.achievements === 'object') {
    for (const id of Object.keys(ACHIEVEMENT_BY_ID)) {
      if (raw.achievements[id]) profile.achievements[id] = true;
    }
  }
  return profile;
}

export function loadProfile(store) {
  const s = storageOrNull(store);
  if (!s) return defaultProfile();
  try {
    const raw = JSON.parse(s.getItem(STORE_KEY) || '{}');
    return normalize(raw);
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile, store) {
  const s = storageOrNull(store);
  const now = new Date().toISOString();
  profile.updatedAt = now;
  profile.createdAt ||= now;
  if (!s) return profile;
  try {
    s.setItem(STORE_KEY, JSON.stringify(profile));
  } catch {
  }
  return profile;
}

export function unlockAchievement(profile, id) {
  if (!ACHIEVEMENT_BY_ID[id] || profile.achievements[id]) return false;
  profile.achievements[id] = true;
  return true;
}

export function achievementList(profile) {
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: Boolean(profile.achievements[achievement.id])
  }));
}

export function recordRun(profile, summary, today = dateKey(new Date())) {
  const score = Math.max(0, Math.round(Number(summary?.score) || 0));
  const previousBest = profile.best;
  const isBest = score > profile.best;
  if (isBest) profile.best = score;
  profile.bestWave = Math.max(profile.bestWave, Math.max(1, Number(summary?.wave) || 1));
  profile.plays++;
  profile.totalKills += Math.max(0, Number(summary?.kills) || 0);
  profile.totalBosses += Math.max(0, Number(summary?.bossKills) || 0);
  profile.totalBullseyes += Math.max(0, Number(summary?.bullseyes) || 0);

  const oath = OATHS[summary?.oath] ? summary.oath : 'knight';
  profile.bestByOath[oath] = Math.max(profile.bestByOath[oath] || 0, score);

  const newAchievements = [];
  if (unlockAchievement(profile, 'first_stand')) newAchievements.push('first_stand');
  if (profile.totalBullseyes >= 25 && unlockAchievement(profile, 'bullseye25')) {
    newAchievements.push('bullseye25');
  }
  if ((Number(summary?.wave) || 0) >= 5 && unlockAchievement(profile, 'wave5')) {
    newAchievements.push('wave5');
  }
  if ((Number(summary?.wave) || 0) >= 10 && unlockAchievement(profile, 'wave10')) {
    newAchievements.push('wave10');
  }
  if ((Number(summary?.bossKills) || 0) >= 1 && unlockAchievement(profile, 'boss1')) {
    newAchievements.push('boss1');
  }
  if ((Number(summary?.bestCombo) || 0) >= 8 && unlockAchievement(profile, 'combo8')) {
    newAchievements.push('combo8');
  }
  if ((Number(summary?.flawlessWaves) || 0) >= 1 && unlockAchievement(profile, 'flawless')) {
    newAchievements.push('flawless');
  }

  let dailyBest = 0;
  if (summary?.daily) {
    const day = summary.dateKey || today;
    profile.daily.bestByDate[day] = Math.max(profile.daily.bestByDate[day] || 0, score);
    profile.daily.best = Math.max(profile.daily.best, score);
    dailyBest = profile.daily.bestByDate[day];

    if (!profile.daily.lastDate || day > profile.daily.lastDate) {
      if (profile.daily.lastDate && shiftDateKey(day, -1) === profile.daily.lastDate) {
        profile.daily.streak++;
      } else {
        profile.daily.streak = 1;
      }
      profile.daily.lastDate = day;
    } else if (day === profile.daily.lastDate && profile.daily.streak === 0) {
      profile.daily.streak = 1;
    }
    if (profile.daily.streak >= 3 && unlockAchievement(profile, 'daily3')) {
      newAchievements.push('daily3');
    }
  }

  return {
    isBest,
    previousBest,
    best: profile.best,
    bestWave: profile.bestWave,
    dailyBest,
    streak: profile.daily.streak,
    newAchievements
  };
}

export function resetProfile(profile) {
  const fresh = defaultProfile();
  fresh.theme = profile?.theme || 'royal';
  fresh.oath = profile?.oath || 'knight';
  fresh.tutorialDone = true;
  return fresh;
}

export function dailyBestFor(profile, day = dateKey(new Date())) {
  return profile.daily?.bestByDate?.[day] || 0;
}
