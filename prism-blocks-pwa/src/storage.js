import { BOARD_SIZE, STORAGE_KEY } from "./config.js";

const SETTINGS_KEY = "prism-blocks-settings-v1";
const RESUME_KEY = "prism-blocks-resume-v1";

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
    best: Math.max(0, Number(progress.best) || 0),
    games: Math.max(0, Number(progress.games) || 0),
    wins: Math.max(0, Number(progress.wins) || 0),
    daily: progress.daily && typeof progress.daily === "object" ? progress.daily : {},
    challenges: progress.challenges && typeof progress.challenges === "object" ? progress.challenges : {}
  };
}

export function saveProgress(progress) {
  return write(STORAGE_KEY, progress);
}

export function recordResult(progress, level, state) {
  const won = state.status === "won";
  progress.best = Math.max(progress.best, state.score);
  progress.games++;
  if (won) progress.wins++;
  if (level.kind === "daily") {
    const previous = progress.daily[level.id] || {};
    progress.daily[level.id] = {
      score: Math.max(previous.score || 0, state.score),
      stars: Math.max(previous.stars || 0, won ? 3 : state.lines >= 3 ? 1 : 0)
    };
  }
  if (level.kind === "challenge") {
    const previous = progress.challenges[level.id] || {};
    const stars = won ? (state.undosLeft >= (level.undoLimit || 0) ? 3 : state.undosLeft > 0 ? 2 : 1) : 0;
    progress.challenges[level.id] = {
      score: Math.max(previous.score || 0, state.score),
      stars: Math.max(previous.stars || 0, stars)
    };
  }
  saveProgress(progress);
}

export function loadSettings() {
  const raw = read(SETTINGS_KEY, null);
  const settings = raw && typeof raw === "object" ? raw : {};
  return {
    sound: settings.sound !== false,
    reducedMotion: settings.reducedMotion === true
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

export function resumeIsValid(level, snapshot) {
  if (!level || !snapshot || snapshot.specId !== level.id || snapshot.status !== "playing") return false;
  if (!Array.isArray(snapshot.board) || snapshot.board.length !== BOARD_SIZE * BOARD_SIZE) return false;
  if (!Array.isArray(snapshot.tray) || snapshot.tray.length !== 3) return false;
  return snapshot.tray.some(Boolean);
}
