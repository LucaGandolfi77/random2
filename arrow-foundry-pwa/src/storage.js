import { FACTORIES, LEVELS_PER_FACTORY, STORAGE_KEY } from "./config.js";

const SETTINGS_KEY = "arrow-foundry-settings-v1";
const RESUME_KEY = "arrow-foundry-resume-v1";

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
    bestMoves: progress.bestMoves && typeof progress.bestMoves === "object" ? progress.bestMoves : {},
    daily: progress.daily && typeof progress.daily === "object" ? progress.daily : {}
  };
}

export function saveProgress(progress) {
  return write(STORAGE_KEY, progress);
}

export function recordWin(progress, level, state) {
  const previousStars = Number(progress.stars[level.id]) || 0;
  progress.stars[level.id] = Math.max(previousStars, state.stars || 0);
  const previousMoves = Number(progress.bestMoves[level.id]) || Infinity;
  progress.bestMoves[level.id] = Math.min(previousMoves, state.moves);
  if (level.kind === "campaign") {
    const flat = level.factoryIndex * LEVELS_PER_FACTORY + level.stage + 1;
    progress.unlocked = Math.max(progress.unlocked, Math.min(FACTORIES.length * LEVELS_PER_FACTORY, flat + 1));
  }
  if (level.kind === "daily") {
    const previous = progress.daily[level.id] || {};
    progress.daily[level.id] = {
      stars: Math.max(previous.stars || 0, state.stars || 0),
      moves: Math.min(previous.moves || Infinity, state.moves)
    };
  }
  saveProgress(progress);
}

export function loadSettings() {
  const raw = read(SETTINGS_KEY, null);
  const settings = raw && typeof raw === "object" ? raw : {};
  return { sound: settings.sound !== false, reducedMotion: settings.reducedMotion === true };
}

export function saveSettings(settings) { return write(SETTINGS_KEY, settings); }
export function loadResume() { const raw = read(RESUME_KEY, null); return raw && typeof raw === "object" ? raw : null; }
export function saveResume(level, snapshot) { return write(RESUME_KEY, { level, snapshot, savedAt: Date.now() }); }
export function clearResume() { try { localStorage.removeItem(RESUME_KEY); } catch { /* unavailable */ } }

export function resumeIsValid(level, snapshot) {
  if (!level || !snapshot || snapshot.specId !== level.id || snapshot.status !== "playing") return false;
  if (!Array.isArray(snapshot.arrows) || snapshot.arrows.length !== level.arrows.length) return false;
  return snapshot.arrows.every((arrow, index) => arrow.id === level.arrows[index].id && ["active", "weakened", "removed"].includes(arrow.status));
}
