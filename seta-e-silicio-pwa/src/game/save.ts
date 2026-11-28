import type { Lang, StoryState } from "../data/types";

const SAVE_KEY = "seta.save.v1";
const LANG_KEY = "seta.lang.v1";
const SOUND_KEY = "seta.sound.v1";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function validateState(value: unknown): value is StoryState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<StoryState>;
  return (
    state.version === 1 &&
    typeof state.chapter === "number" &&
    state.chapter >= 1 &&
    state.chapter <= 5 &&
    Array.isArray(state.facts) &&
    Array.isArray(state.flags) &&
    Array.isArray(state.completed) &&
    typeof state.rewinds === "number" &&
    (state.dialogue === null || (typeof state.dialogue === "object" && state.dialogue !== null)) &&
    (state.lastDialogue === null || (typeof state.lastDialogue === "object" && state.lastDialogue !== null)) &&
    (state.finalChoice === null ||
      state.finalChoice === "archive" ||
      state.finalChoice === "release" ||
      state.finalChoice === "community")
  );
}

export function loadState(): StoryState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return validateState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state: StoryState): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage can be full or denied */
  }
}

export function clearState(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadLang(): Lang {
  const store = storage();
  if (!store) return "it";
  try {
    return store.getItem(LANG_KEY) === "en" ? "en" : "it";
  } catch {
    return "it";
  }
}

export function saveLang(lang: Lang): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function loadSound(): boolean {
  const store = storage();
  if (!store) return true;
  try {
    return store.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveSound(on: boolean): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}
