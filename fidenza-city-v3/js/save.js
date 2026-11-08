import { SAVE_KEY } from './config.js';

const DEFAULT_STATS = () => ({
  walkMeters: 0,
  driveMeters: 0,
  maxSpeed: 0,
  photos: 0,
  playTime: 0,
  seasons: [],
  days: [],
  photoDuomo: false,
  jobs: 0,
  moneyEarned: 0,
  eventJobs: 0,
  eventsSeen: [],
  npcsMet: [],
  districtsSeen: [],
  badges: []
});

const DEFAULT_DAILY = () => ({ date: '', progress: 0, done: false, claimed: false });

const DEFAULT_CAREER = () => ({
  license: false,
  xp: 0,
  money: 0,
  reputation: 0,
  jobsDone: 0,
  jobs: { taxi: 0, courier: 0, photo: 0, license: 0 },
  upgrades: { engine: 0, handling: 0, brakes: 0 },
  history: []
});

const DEFAULT = () => ({
  version: 2,
  name: '',
  score: 0,
  stars: [],
  places: [],
  missions: {},
  best: { score: 0, stars: 0, places: 0 },
  settings: { audio: true, season: 'auto' },
  stats: DEFAULT_STATS(),
  achievements: {},
  daily: DEFAULT_DAILY(),
  career: DEFAULT_CAREER(),
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
    state = {
      ...DEFAULT(),
      ...parsed,
      best: { ...DEFAULT().best, ...(parsed.best || {}) },
      settings: { ...DEFAULT().settings, ...(parsed.settings || {}) },
      stats: { ...DEFAULT_STATS(), ...(parsed.stats || {}) },
      achievements: { ...(parsed.achievements || {}) },
      daily: { ...DEFAULT_DAILY(), ...(parsed.daily || {}) },
      career: {
        ...DEFAULT_CAREER(),
        ...(parsed.career || {}),
        jobs: { ...DEFAULT_CAREER().jobs, ...(parsed.career?.jobs || {}) },
        upgrades: { ...DEFAULT_CAREER().upgrades, ...(parsed.career?.upgrades || {}) }
      }
    };
    if (!Array.isArray(state.stars)) state.stars = [];
    if (!Array.isArray(state.places)) state.places = [];
    if (!state.missions || typeof state.missions !== 'object') state.missions = {};
    if (!Array.isArray(state.stats.seasons)) state.stats.seasons = [];
    if (!Array.isArray(state.stats.days)) state.stats.days = [];
    if (!Array.isArray(state.stats.eventsSeen)) state.stats.eventsSeen = [];
    if (!Array.isArray(state.stats.npcsMet)) state.stats.npcsMet = [];
    if (!Array.isArray(state.stats.districtsSeen)) state.stats.districtsSeen = [];
    if (!Array.isArray(state.stats.badges)) state.stats.badges = [];
    if (state.stats.photoDuomo == null) state.stats.photoDuomo = false;
    if (!Array.isArray(state.career.history)) state.career.history = [];
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

export function getStats() {
  const s = loadSave();
  if (!s.stats) s.stats = DEFAULT_STATS();
  return s.stats;
}

export function addStat(key, amount = 1) {
  const s = loadSave();
  if (!s.stats) s.stats = DEFAULT_STATS();
  s.stats[key] = (Number(s.stats[key]) || 0) + amount;
  persist();
  return s.stats[key];
}

export function setStatMax(key, value) {
  const s = loadSave();
  if (!s.stats) s.stats = DEFAULT_STATS();
  const current = Number(s.stats[key]) || 0;
  if (value <= current) return false;
  s.stats[key] = value;
  persist();
  return true;
}

export function addUniqueStat(key, value) {
  const s = loadSave();
  if (!s.stats) s.stats = DEFAULT_STATS();
  if (!Array.isArray(s.stats[key])) s.stats[key] = [];
  if (s.stats[key].includes(value)) return false;
  s.stats[key].push(value);
  if (s.stats[key].length > 400) s.stats[key].shift();
  persist();
  return true;
}

export function setStatFlag(key, value = true) {
  const s = loadSave();
  if (!s.stats) s.stats = DEFAULT_STATS();
  if (s.stats[key] === value) return false;
  s.stats[key] = value;
  persist();
  return true;
}

export function markSeason(id) {
  return id ? addUniqueStat('seasons', id) : false;
}

export function markDay(date = new Date()) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return addUniqueStat('days', key);
}

export function addPlayTime(seconds) {
  if (!(seconds > 0)) return;
  const s = loadSave();
  if (!s.stats) s.stats = DEFAULT_STATS();
  s.stats.playTime += seconds;
}

export function flush() {
  persist();
}

export function getAchievements() {
  const s = loadSave();
  if (!s.achievements) s.achievements = {};
  return s.achievements;
}

export function unlockAchievement(id) {
  const s = loadSave();
  if (!s.achievements) s.achievements = {};
  if (s.achievements[id]) return false;
  s.achievements[id] = { unlockedAt: Date.now() };
  persist();
  return true;
}

export function getDaily() {
  const s = loadSave();
  if (!s.daily) s.daily = DEFAULT_DAILY();
  return s.daily;
}

export function setDaily(daily) {
  const s = loadSave();
  s.daily = { ...DEFAULT_DAILY(), ...(s.daily || {}), ...daily };
  persist();
  return s.daily;
}

export function getCareer() {
  const s = loadSave();
  if (!s.career) s.career = DEFAULT_CAREER();
  if (!s.career.jobs) s.career.jobs = DEFAULT_CAREER().jobs;
  if (!s.career.upgrades) s.career.upgrades = DEFAULT_CAREER().upgrades;
  if (!Array.isArray(s.career.history)) s.career.history = [];
  return s.career;
}

export function updateCareer(patch) {
  const s = loadSave();
  if (!s.career) s.career = DEFAULT_CAREER();
  Object.assign(s.career, patch);
  persist();
  return s.career;
}

export function addCareerMoney(amount) {
  const career = getCareer();
  career.money = Math.max(0, Math.round((career.money || 0) + amount));
  persist();
  return career.money;
}

export function addCareerXp(amount) {
  const career = getCareer();
  career.xp = Math.max(0, Math.round((career.xp || 0) + amount));
  persist();
  return career.xp;
}

export function addCareerReputation(amount) {
  const career = getCareer();
  career.reputation = Math.max(0, Math.round((career.reputation || 0) + amount));
  persist();
  return career.reputation;
}

export function addCareerJob(careerId) {
  const career = getCareer();
  if (careerId !== 'license') career.jobsDone = (career.jobsDone || 0) + 1;
  if (careerId && career.jobs) career.jobs[careerId] = (career.jobs[careerId] || 0) + 1;
  persist();
  return career;
}

export function setCareerLicense(value = true) {
  return updateCareer({ license: !!value });
}

export function recordCareerJob(entry) {
  const career = getCareer();
  career.history.unshift(entry);
  career.history = career.history.slice(0, 30);
  persist();
  return career.history;
}
