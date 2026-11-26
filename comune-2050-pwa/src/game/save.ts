import type { Lang, RunState } from "../data/types";

const RUN_KEY = "comune2050.run.v1";
const LANG_KEY = "comune2050.lang.v1";

export interface SavedRun {
  comuneId: string;
  run: RunState;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function validateRun(value: unknown): value is RunState {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<RunState>;
  return (
    run.version === 1 &&
    typeof run.comuneId === "string" &&
    typeof run.seed === "number" &&
    typeof run.turn === "number" &&
    run.turn >= 1 &&
    run.turn <= 5 &&
    typeof run.year === "number" &&
    (run.status === "policy" || run.status === "event" || run.status === "finished") &&
    typeof run.credits === "number" &&
    typeof run.creditsSpent === "number" &&
    typeof run.population === "number" &&
    typeof run.baselinePopulation === "number" &&
    !!run.metrics &&
    typeof run.metrics === "object" &&
    Array.isArray(run.hand) &&
    Array.isArray(run.playedPolicies) &&
    Array.isArray(run.eventDeck) &&
    Array.isArray(run.choices) &&
    Array.isArray(run.history)
  );
}

export function loadRun(): SavedRun | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedRun>;
    if (typeof parsed.comuneId !== "string" || !validateRun(parsed.run)) return null;
    return { comuneId: parsed.comuneId, run: parsed.run };
  } catch {
    return null;
  }
}

export function saveRun(comuneId: string, run: RunState): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(RUN_KEY, JSON.stringify({ comuneId, run }));
  } catch {
    /* storage can be full or denied: the game still works in memory */
  }
}

export function clearRun(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(RUN_KEY);
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
