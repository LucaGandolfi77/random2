import { DISTRICTS, LEVELS_PER_DISTRICT, STORAGE_KEY } from "./config.js";

const SETTINGS_KEY = "traffic-tessera-settings-v1";
const RESUME_KEY = "traffic-tessera-resume-v1";

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
  const stored = read(STORAGE_KEY, null);
  const progress = stored && typeof stored === "object" ? stored : {};
  return {
    unlocked: Math.max(1, Math.min(100, Number(progress.unlocked) || 1)),
    stars: progress.stars && typeof progress.stars === "object" ? progress.stars : {},
    bestMoves: progress.bestMoves && typeof progress.bestMoves === "object" ? progress.bestMoves : {},
    daily: progress.daily && typeof progress.daily === "object" ? progress.daily : {},
    dispatched: Math.max(0, Number(progress.dispatched) || 0)
  };
}

export function saveProgress(progress) {
  return write(STORAGE_KEY, progress);
}

export function recordWin(progress, level, state) {
  const previousStars = Number(progress.stars[level.id]) || 0;
  progress.stars[level.id] = Math.max(previousStars, state.stars || 0);
  progress.bestMoves[level.id] = Math.min(Number(progress.bestMoves[level.id]) || Infinity, state.moves);
  progress.dispatched += state.exits || level.vehicles.length;
  if (level.kind === "campaign") {
    const flat = level.districtIndex * LEVELS_PER_DISTRICT + level.stage + 1;
    progress.unlocked = Math.max(progress.unlocked, Math.min(DISTRICTS.length * LEVELS_PER_DISTRICT, flat + 1));
  }
  if (level.kind === "daily") {
    const old = progress.daily[level.id] || {};
    progress.daily[level.id] = {
      stars: Math.max(old.stars || 0, state.stars || 0),
      moves: Math.min(old.moves || Infinity, state.moves)
    };
  }
  saveProgress(progress);
}

export function loadSettings() {
  const stored = read(SETTINGS_KEY, null);
  const settings = stored && typeof stored === "object" ? stored : {};
  return { sound: settings.sound !== false, reducedMotion: settings.reducedMotion === true };
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, settings);
}

export function loadResume() {
  const stored = read(RESUME_KEY, null);
  return stored && typeof stored === "object" ? stored : null;
}

export function saveResume(level, snapshot) {
  return write(RESUME_KEY, { level, snapshot, savedAt: Date.now() });
}

export function clearResume() {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {}
}

export function resumeIsValid(level, snapshot) {
  if (!level || !snapshot || snapshot.specId !== level.id || snapshot.status !== "playing") return false;
  if (!Array.isArray(snapshot.vehicles) || snapshot.vehicles.length !== level.vehicles.length) return false;
  const ids = new Set();
  for (const vehicle of snapshot.vehicles) {
    if (ids.has(vehicle.id) || !["active", "exited"].includes(vehicle.status)) return false;
    ids.add(vehicle.id);
    if (vehicle.status === "active" && (!Number.isInteger(vehicle.x) || !Number.isInteger(vehicle.y)
      || vehicle.x < 0 || vehicle.y < 0 || vehicle.x >= level.size || vehicle.y >= level.size)) return false;
  }
  return ids.size === level.vehicles.length;
}
