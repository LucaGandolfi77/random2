/*
 * CORE 9 — persistence.
 *
 * localStorage through shared/arcade.js when it is there, with a plain
 * fallback for the boot smoke test and for browsers that lock storage down.
 * The save is versioned and every load runs through sanitizeState.
 */

import { SAVE_KEY, HIGH_KEY, sanitizeState, serializeState } from "./state.js";

function store() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch (e) { /* private mode */ }
  return null;
}

function readJSON(key) {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeJSON(key, value) {
  const s = store();
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(now = Date.now()) {
  const raw = readJSON(SAVE_KEY);
  const fresh = !raw;
  const state = sanitizeState(raw, now);
  const away = raw ? Math.max(0, (now - state.lastSeen) / 1000) : 0;
  state.lastSeen = now;
  return { state, fresh, away };
}

export function saveGame(state, now = Date.now()) {
  state.lastSeen = now;
  const ok = writeJSON(SAVE_KEY, serializeState(state));
  writeJSON(HIGH_KEY, {
    highScore: Math.round((state.stats.bestMW || 0) * 10) / 10,
    currentMW: Math.round((state.stats.maxMW || 0) * 10) / 10,
    generation: state.generation,
    isotopes: state.isotopes,
    updated: now,
  });
  return ok;
}

export function exportSave(state) {
  return JSON.stringify({ game: "core9", ...serializeState(state) }, null, 2);
}

export function importSave(text, now = Date.now()) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || data.game !== "core9" || !data.sites) return null;
  const state = sanitizeState(data, now);
  state.lastSeen = now;
  return state;
}

export function clearSave() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(SAVE_KEY);
    s.removeItem(HIGH_KEY);
  } catch (e) { /* ignore */ }
}
