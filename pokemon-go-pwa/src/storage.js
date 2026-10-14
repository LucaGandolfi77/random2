const SK = 'pokemon-state-v2';
const INV = 'pokemon-inventory-v2';

function loadJSON(k, f) {
  try { const r = localStorage.getItem(k); return r === null ? f : JSON.parse(r); } catch (e) { return f; }
}
function saveJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

export function getDefaultState() {
  return {
    language: 'en',
    caught: [], // array of {id, cp, iv, shiny, date, candy}
    seen: [],   // array of ids
    flown: 0,
    totalThrows: 0,
    greatThrows: 0,
    excellentThrows: 0,
    xp: 0,
    level: 1,
    lastPlayed: Date.now(),
    currentBiome: 'grass',
    achievements: {},
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
    candy: {}, // {pokemonId: count}
    stardust: 1000,
  };
}

export function loadState() {
  const s = loadJSON(SK, null);
  if (!s) return getDefaultState();
  const def = getDefaultState();
  // merge
  const out = {};
  for (const k in def) out[k] = s[k] !== undefined ? s[k] : def[k];
  return out;
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
  return out;
}

export function saveInventory(i) {
  saveJSON(INV, i);
}

export function loadSettings() {
  return loadJSON('pokemon-settings', { language: 'en', sound: true, haptics: true, autoSave: true });
}

export function saveSettings(s) {
  saveJSON('pokemon-settings', s);
}

export function clearAll() {
  localStorage.removeItem(SK);
  localStorage.removeItem(INV);
}
