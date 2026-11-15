/* Reading progress, kept on the device. Pure functions take an optional
 * storage object so the tests can use a Map instead of localStorage. */

const KEY = "fumetti-progress-v1";
const SOUND_KEY = "fumetti-sound";

function store(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function clampPage(page, total) {
  const count = Math.max(1, Number(total) || 1);
  const value = Math.round(Number(page) || 1);
  return Math.min(count, Math.max(1, value));
}

export function readProgress(storage) {
  const s = store(storage);
  if (!s) return {};
  try {
    const raw = s.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function getIssueProgress(issueId, total, storage) {
  const all = readProgress(storage);
  const saved = all[issueId] || {};
  return {
    page: clampPage(saved.page || 1, total),
    completed: Boolean(saved.completed),
    updatedAt: Number(saved.updatedAt) || 0
  };
}

export function saveIssueProgress(issueId, { page, completed }, total, storage) {
  const s = store(storage);
  if (!s) return;
  const all = readProgress(s);
  all[issueId] = {
    page: clampPage(page, total),
    completed: Boolean(completed),
    updatedAt: Date.now()
  };
  try {
    s.setItem(KEY, JSON.stringify(all));
  } catch {
    /* A full or blocked localStorage must not stop a page turn. */
  }
}

export function resetIssueProgress(issueId, storage) {
  const s = store(storage);
  if (!s) return;
  const all = readProgress(s);
  delete all[issueId];
  try {
    s.setItem(KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export function getSound(storage) {
  const s = store(storage);
  try {
    return s ? s.getItem(SOUND_KEY) !== "0" : true;
  } catch {
    return true;
  }
}

export function setSound(on, storage) {
  const s = store(storage);
  try {
    s?.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* noop */
  }
}
