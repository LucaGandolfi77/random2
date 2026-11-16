/*
 * Progress, settings and the Book of Declarations.
 * One versioned localStorage key; no account, no server, no telemetry.
 */

import {
  NODES,
  ORDER,
  CHAPTERS,
  NODE_BY_ID,
  ENDING_BY_ID,
  SPECIAL_ENDING
} from "./content.js";

export const STORAGE_KEY = "strictlyTyped.v1";
export const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    started: false,
    completed: {},
    fragments: [],
    endings: [],
    settings: {
      sound: true,
      haptics: true,
      reduceMotion: false
    },
    installDismissed: false
  };
}

function readRaw(storage) {
  try {
    return storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function sanitize(raw) {
  const state = defaultState();
  if (!raw || typeof raw !== "object") return state;

  state.started = Boolean(raw.started);

  if (raw.completed && typeof raw.completed === "object") {
    for (const [id, entry] of Object.entries(raw.completed)) {
      if (!NODE_BY_ID.has(id)) continue;
      if (!entry || typeof entry !== "object") continue;
      const stars = safeInt(entry.stars, 1, 3, 1);
      state.completed[id] = {
        stars,
        mistakes: safeInt(entry.mistakes, 0, 99, 0),
        hints: safeInt(entry.hints, 0, 9, 0)
      };
    }
  }

  if (Array.isArray(raw.fragments)) {
    for (const id of raw.fragments) {
      if (typeof id === "string" && NODE_BY_ID.has(id) && !state.fragments.includes(id)) {
        state.fragments.push(id);
      }
    }
  }

  /* Every completed node owns a fragment. Repair old or interrupted saves. */
  for (const id of Object.keys(state.completed)) {
    if (!state.fragments.includes(id)) state.fragments.push(id);
  }

  if (Array.isArray(raw.endings)) {
    for (const id of raw.endings) {
      if (ENDING_BY_ID.has(id) && !state.endings.includes(id)) state.endings.push(id);
    }
  }

  if (raw.settings && typeof raw.settings === "object") {
    if ("sound" in raw.settings) state.settings.sound = Boolean(raw.settings.sound);
    if ("haptics" in raw.settings) state.settings.haptics = Boolean(raw.settings.haptics);
    if ("reduceMotion" in raw.settings) state.settings.reduceMotion = Boolean(raw.settings.reduceMotion);
  }

  state.installDismissed = Boolean(raw.installDismissed);
  return state;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createStore(storage) {
  const backend = storage || {
    getItem: () => null,
    setItem: () => {}
  };

  let raw = readRaw(backend);
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  let state = sanitize(parsed);
  const listeners = new Set();

  function persist() {
    try {
      backend.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* A full or forbidden localStorage must not stop the game. */
    }
    for (const fn of listeners) {
      try {
        fn(state);
      } catch {
        /* A subscriber's bad mood is not the store's problem. */
      }
    }
  }

  function setStarted() {
    if (!state.started) {
      state.started = true;
      persist();
    }
  }

  function completeNode(id, { stars = 1, mistakes = 0, hints = 0 } = {}) {
    const node = NODE_BY_ID.get(id);
    if (!node) return { updated: false };

    state.started = true;
    const cleanStars = safeInt(stars, 1, 3, 1);
    const previous = state.completed[id];
    const first = !previous;
    const newBest = !previous || cleanStars > previous.stars;

    if (newBest) {
      state.completed[id] = {
        stars: cleanStars,
        mistakes: safeInt(mistakes, 0, 99, 0),
        hints: safeInt(hints, 0, 9, 0)
      };
    } else {
      /* Keep the better score, but keep the record that it was played. */
      state.completed[id] = {
        ...previous,
        mistakes: Math.min(previous.mistakes || 0, safeInt(mistakes, 0, 99, 0)),
        hints: Math.min(previous.hints || 0, safeInt(hints, 0, 9, 0))
      };
    }

    if (!state.fragments.includes(id)) state.fragments.push(id);
    persist();
    return { updated: true, first, newBest, node };
  }

  function recordEnding(id) {
    if (!ENDING_BY_ID.has(id)) return false;
    if (id === SPECIAL_ENDING && state.fragments.length < ORDER.length) return false;
    if (!state.completed["boss-5"]) return false;
    if (!state.endings.includes(id)) {
      state.endings.push(id);
      persist();
    }
    return true;
  }

  function setSetting(key, value) {
    if (!["sound", "haptics", "reduceMotion"].includes(key)) return;
    state.settings[key] = Boolean(value);
    persist();
  }

  function markInstallDismissed() {
    if (!state.installDismissed) {
      state.installDismissed = true;
      persist();
    }
  }

  function resetProgress() {
    const settings = { ...state.settings };
    state = defaultState();
    state.settings = settings;
    state.installDismissed = false;
    persist();
  }

  function totalStars() {
    return Object.values(state.completed).reduce((sum, entry) => sum + (entry.stars || 0), 0);
  }

  function isUnlocked(id) {
    const index = ORDER.indexOf(id);
    if (index === -1) return false;
    if (index === 0) return true;
    return Boolean(state.completed[ORDER[index - 1]]);
  }

  function firstIncomplete() {
    for (const id of ORDER) {
      if (isUnlocked(id) && !state.completed[id]) return id;
    }
    return null;
  }

  function lastUnlocked() {
    let found = ORDER[0];
    for (const id of ORDER) {
      if (isUnlocked(id)) found = id;
    }
    return found;
  }

  function nextAfter(id) {
    const index = ORDER.indexOf(id);
    if (index === -1) return null;
    return ORDER[index + 1] || null;
  }

  function chapterComplete(chapterId) {
    const chapter = CHAPTERS.find((item) => item.id === chapterId);
    if (!chapter) return false;
    return chapter.lessons.every((lesson) => state.completed[lesson.id]) && Boolean(state.completed[chapter.boss.id]);
  }

  function completedChapters() {
    return CHAPTERS.filter((chapter) => chapterComplete(chapter.id)).length;
  }

  function rankLevel() {
    if (state.endings.length > 0) return 6;
    return completedChapters();
  }

  function progress() {
    return {
      completed: Object.keys(state.completed).length,
      total: NODES.length,
      stars: totalStars(),
      maxStars: NODES.length * 3,
      fragments: state.fragments.length,
      totalFragments: NODES.length,
      endings: state.endings.length,
      chapters: completedChapters(),
      totalChapters: CHAPTERS.length,
      rankLevel: rankLevel()
    };
  }

  function allFragments() {
    return state.fragments.length >= ORDER.length;
  }

  function finalBossBeaten() {
    return Boolean(state.completed["boss-5"]);
  }

  function canChooseEnding(id) {
    if (!finalBossBeaten() || !ENDING_BY_ID.has(id)) return false;
    if (id === SPECIAL_ENDING) return allFragments();
    return true;
  }

  function snapshot() {
    return clone(state);
  }

  return {
    get state() {
      return state;
    },
    snapshot,
    setStarted,
    completeNode,
    recordEnding,
    setSetting,
    markInstallDismissed,
    resetProgress,
    totalStars,
    isUnlocked,
    firstIncomplete,
    lastUnlocked,
    nextAfter,
    chapterComplete,
    completedChapters,
    rankLevel,
    progress,
    allFragments,
    finalBossBeaten,
    canChooseEnding,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
