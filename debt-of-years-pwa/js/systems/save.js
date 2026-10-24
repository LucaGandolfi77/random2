const SAVE_KEY = 'debt-of-years-save-v2';
const MUTE_KEY = 'debt-of-years-muted';

let memoryState = null;

export function saveState(state) {
  memoryState = state;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 2) return null;
    memoryState = parsed;
    return parsed;
  } catch (err) {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (err) {
    return !!memoryState;
  }
}

export function clearSave() {
  memoryState = null;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // Ignore storage failures.
  }
}

export function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch (err) {
    return false;
  }
}

export function writeMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch (err) {
    // Ignore storage failures.
  }
}
