import { SAVE_KEY } from './config.js';

const DEFAULT = () => ({
  version: 1,
  name: '',
  score: 0,
  stars: [],
  places: [],
  missions: {},
  best: { score: 0, stars: 0, places: 0 },
  settings: { audio: true },
  createdAt: Date.now(),
  updatedAt: Date.now()
});

let state = null;

export function loadSave() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { state = DEFAULT(); return state; }
    const parsed = JSON.parse(raw);
    state = { ...DEFAULT(), ...parsed, best: { ...DEFAULT().best, ...(parsed.best || {}) }, settings: { ...DEFAULT().settings, ...(parsed.settings || {}) } };
    if (!Array.isArray(state.stars)) state.stars = [];
    if (!Array.isArray(state.places)) state.places = [];
    if (!state.missions || typeof state.missions !== 'object') state.missions = {};
    return state;
  } catch {
    state = DEFAULT();
    return state;
  }
}

export function persist() {
  if (!state) return;
  state.updatedAt = Date.now();
  state.best.score = Math.max(state.best.score || 0, state.score || 0);
  state.best.stars = Math.max(state.best.stars || 0, state.stars.length);
  state.best.places = Math.max(state.best.places || 0, state.places.length);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Salvataggio locale non disponibile', err);
  }
}

export function resetSave() {
  state = DEFAULT();
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  persist();
  return state;
}

export function getSave() {
  return loadSave();
}

export function setName(name) {
  const s = loadSave();
  s.name = String(name || '').trim().slice(0, 20);
  persist();
  return s.name;
}

export function addScore(points) {
  const s = loadSave();
  s.score = Math.max(0, (s.score || 0) + points);
  persist();
  return s.score;
}

export function hasStar(id) {
  return loadSave().stars.includes(id);
}

export function addStar(id) {
  const s = loadSave();
  if (!s.stars.includes(id)) {
    s.stars.push(id);
    persist();
    return true;
  }
  return false;
}

export function hasPlace(id) {
  return loadSave().places.includes(id);
}

export function addPlace(id) {
  const s = loadSave();
  if (!s.places.includes(id)) {
    s.places.push(id);
    persist();
    return true;
  }
  return false;
}

export function getMissionRecord(id) {
  return loadSave().missions[id] || null;
}

export function completeMission(id, time, score) {
  const s = loadSave();
  const prev = s.missions[id];
  const record = { completedAt: Date.now(), time: Math.round(time), score };
  if (!prev || record.time < prev.time) s.missions[id] = record;
  persist();
}

export function setAudioEnabled(enabled) {
  const s = loadSave();
  s.settings.audio = !!enabled;
  persist();
}

export function isAudioEnabled() {
  return loadSave().settings.audio !== false;
}
