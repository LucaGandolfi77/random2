import { AREAS, CAMPAIGN_LEVELS, LEVELS_PER_AREA, PIECES, STORAGE_KEY } from "./config.js";

const SETTINGS_KEY = "umbra-sort-settings-v1";
const RESUME_KEY = "umbra-sort-resume-v1";
const LEGACY_STORAGE_KEY = "umbra-sort-progress-v1";

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
  let raw = read(STORAGE_KEY, null);
  if (!raw) raw = read(LEGACY_STORAGE_KEY, null);
  const progress = raw && typeof raw === "object" ? raw : {};
  const pieces = Array.isArray(progress.pieces)
    ? progress.pieces.filter((id) => PIECES.some((piece) => piece.id === id))
    : ["luma"];
  if (!pieces.includes("luma")) pieces.unshift("luma");
  return {
    unlocked: Math.max(1, Math.min(CAMPAIGN_LEVELS, Number(progress.unlocked) || 1)),
    gears: Math.max(0, Number(progress.gears) || 0),
    pieces,
    equippedPiece: pieces.includes(progress.equippedPiece) ? progress.equippedPiece : "luma",
    abilities: {
      pulse: Math.max(1, Math.min(3, Number(progress.abilities?.pulse) || 1)),
      push: Math.max(1, Math.min(3, Number(progress.abilities?.push) || 1)),
      scan: Math.max(1, Math.min(3, Number(progress.abilities?.scan) || 1))
    },
    stars: progress.stars && typeof progress.stars === "object" ? progress.stars : {},
    best: progress.best && typeof progress.best === "object" ? progress.best : {},
    daily: progress.daily && typeof progress.daily === "object" ? progress.daily : {}
  };
}

export function saveProgress(progress) {
  return write(STORAGE_KEY, progress);
}

export function recordWin(progress, levelId, stars, score, level = null) {
  const previousStars = Number(progress.stars[levelId]) || 0;
  const firstClear = previousStars === 0;
  progress.stars[levelId] = Math.max(previousStars, stars);
  progress.best[levelId] = Math.max(progress.best[levelId] || 0, score);
  const match = String(levelId).match(/^([a-z-]+)-(\d+)$/);
  if (match) {
    const area = AREAS.findIndex((candidate) => candidate.id === match[1]);
    const stage = Number(match[2]);
    if (area >= 0) {
      const flat = area * LEVELS_PER_AREA + stage;
      progress.unlocked = Math.max(progress.unlocked, Math.min(CAMPAIGN_LEVELS, flat + 1));
    }
  }
  const baseReward = firstClear
    ? (level?.kind === "boss" ? (level.rewardGears || 20) : level?.kind === "special" ? (level.rewardGears || 15) : 1 + stars)
    : 1;
  const gears = Math.max(1, Math.round(baseReward * (progress.equippedPiece === "tessera" ? 1.1 : 1)));
  progress.gears = (Number(progress.gears) || 0) + gears;
  const result = { gears, firstClear, newStars: progress.stars[levelId] > previousStars };
  saveProgress(progress);
  return result;
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

export function resumeIsValid(level, snapshot) {
  if (!level || !snapshot || snapshot.specId !== level.id || snapshot.status !== "playing") return false;
  if (!Array.isArray(snapshot.cells) || !Array.isArray(snapshot.doors) || !Array.isArray(snapshot.generators)) return false;
  const blocks = snapshot.cells.filter((cell) => cell && cell.kind === "block");
  const captured = snapshot.doors.reduce((sum, door) => sum + (Number(door.filled) || 0), 0);
  const planned = level.doors.reduce((sum, door) => sum + door.capacity, 0);
  const unspawned = snapshot.generators.reduce((sum, generator) => {
    const source = level.generators.find((candidate) => candidate.id === generator.id);
    if (!source || generator.spawned < 0 || generator.spawned > source.total) return NaN;
    return sum + source.total - generator.spawned;
  }, 0);
  if (!Number.isFinite(unspawned)) return false;
  if (blocks.length + unspawned !== planned - captured) return false;

  let gray = 0;
  let deficits = 0;
  for (const door of level.doors) {
    const savedDoor = snapshot.doors.find((candidate) => candidate.x === door.x && candidate.y === door.y && candidate.color === door.color);
    if (!savedDoor || savedDoor.filled < 0 || savedDoor.filled > door.capacity) return false;
    const available = blocks.filter((block) => !block.gray && block.color === door.color).length;
    const pending = snapshot.generators.reduce((sum, generator) => {
      const source = level.generators.find((candidate) => candidate.id === generator.id);
      return source && source.color === door.color ? sum + source.total - generator.spawned : sum;
    }, 0);
    const deficit = door.capacity - savedDoor.filled - available - pending;
    if (deficit < 0) return false;
    deficits += deficit;
  }
  blocks.forEach((block) => { if (block.gray) gray++; });
  return deficits === gray;
}
