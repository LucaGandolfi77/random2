const SK = 'pokemon-go-v2-state';
const INV = 'pokemon-go-v2-inventory';
const SET = 'pokemon-go-v2-settings';

function loadJSON(k, f) {
  try { const r = localStorage.getItem(k); return r === null ? f : JSON.parse(r); } catch (e) { return f; }
}
function saveJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

let uidCounter = 0;
export function newUid() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) {}
  uidCounter += 1;
  return `u-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDefaultState() {
  return {
    language: 'en',
    caught: [],
    seen: [],
    flown: 0,
    totalThrows: 0,
    greatThrows: 0,
    excellentThrows: 0,
    curveThrows: 0,
    curveballs: 0,
    criticalCaptures: 0,
    xp: 0,
    level: 1,
    lastPlayed: Date.now(),
    currentBiome: 'grass',
    achievements: {},
    quests: [],
    lastQuestDate: null,
    streak: 0,
    eggs: [],
    eggsToday: 0,
    eggDate: null,
    buddy: null,
    spinLast: 0,
    transferred: 0,
  };
}

export function getDefaultInventory() {
  return {
    pokeballs: 30,
    greatballs: 10,
    ultraballs: 5,
    masterballs: 0,
    razz: 10,
    nanab: 5,
    pinap: 5,
    golden: 0,
    candy: {},
    stardust: 1000,
  };
}

function migrateState(s) {
  if (!Array.isArray(s.caught)) s.caught = [];
  if (!Array.isArray(s.seen)) s.seen = [];
  if (!Array.isArray(s.eggs)) s.eggs = [];
  if (!Array.isArray(s.quests)) s.quests = [];
  if (!s.achievements || typeof s.achievements !== 'object') s.achievements = {};
  /* v1 saves have no per-instance id: give each catch a stable uid. */
  s.caught.forEach((c, i) => {
    if (!c || typeof c !== 'object') return;
    if (!c.uid) c.uid = `legacy-${i}-${c.date || 0}-${c.id || 'unknown'}`;
    if (typeof c.cp !== 'number') c.cp = 0;
    if (typeof c.shiny !== 'boolean') c.shiny = false;
  });
  if (typeof s.curveThrows !== 'number') s.curveThrows = 0;
  if (typeof s.curveballs !== 'number') s.curveballs = 0;
  if (typeof s.criticalCaptures !== 'number') s.criticalCaptures = 0;
  return s;
}

export function loadState() {
  const s = loadJSON(SK, null);
  if (!s) return getDefaultState();
  const def = getDefaultState();
  const out = {};
  for (const k in def) out[k] = s[k] !== undefined ? s[k] : def[k];
  return migrateState(out);
}

export function saveState(s) {
  saveJSON(SK, s);
}

export function loadInventory() {
  const i = loadJSON(INV, null);
  if (!i) return getDefaultInventory();
  const def = getDefaultInventory();
  const out = {};
  for (const k in def) out[k] = i[k] !== undefined ? i[k] : def[k];
  if (!out.candy || typeof out.candy !== 'object') out.candy = {};
  return out;
}

export function saveInventory(i) {
  saveJSON(INV, i);
}

export function getDefaultSettings() {
  return { language: 'en', sound: true, haptics: true, autoSave: true, assist: true, tutorialSeen: false };
}

export function loadSettings() {
  return { ...getDefaultSettings(), ...loadJSON(SET, {}) };
}

export function saveSettings(s) {
  saveJSON(SET, s);
}

export function clearAll() {
  localStorage.removeItem(SK);
  localStorage.removeItem(INV);
  localStorage.removeItem(SET);
}
