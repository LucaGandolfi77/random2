import { STORAGE_KEY } from "./config.js";

const SETTINGS_KEY = "umbra-sort-settings-v1";
const RESUME_KEY = "umbra-sort-resume-v1";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadProgress() {
  const raw = read(STORAGE_KEY, null);
  const progress = raw && typeof raw === "object" ? raw : {};
  return {
    unlocked: Math.max(1, Math.min(100, Number(progress.unlocked) || 1)),
    stars: progress.stars && typeof progress.stars === "object" ? progress.stars : {},
    best: progress.best && typeof progress.best === "object" ? progress.best : {},
    daily: progress.daily && typeof progress.daily === "object" ? progress.daily : {}
  };
}

export function saveProgress(progress) {
  return write(STORAGE_KEY, progress);
}

export function recordWin(progress, levelId, stars, score) {
  progress.stars[levelId] = Math.max(progress.stars[levelId] || 0, stars);
  progress.best[levelId] = Math.max(progress.best[levelId] || 0, score);
  const match = String(levelId).match(/^([a-z-]+)-(\d+)$/);
  if (match) {
    const areaOrder = ["conveyor", "liftworks", "night-shift", "foundry", "prism-core"];
    const area = areaOrder.indexOf(match[1]);
    const level = Number(match[2]);
    const flat = area * 20 + level + 1;
    progress.unlocked = Math.max(progress.unlocked, Math.min(100, flat + 1));
  }
  saveProgress(progress);
}

export function loadSettings() {
  const raw = read(SETTINGS_KEY, null);
  const settings = raw && typeof raw === "object" ? raw : {};
  return {
    sound: settings.sound !== false,
    reducedMotion: settings.reducedMotion === true,
    showDark: settings.showDark === true,
    language: settings.language === "it" ? "it" : "en"
  };
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, settings);
}

export function loadResume() {
  const raw = read(RESUME_KEY, null);
  return raw && typeof raw === "object" ? raw : null;
}

export function saveResume(level, snapshot) {
  return write(RESUME_KEY, { level, snapshot, savedAt: Date.now() });
}

export function clearResume() {
  try { localStorage.removeItem(RESUME_KEY); } catch { /* storage unavailable */ }
}
