const META_KEY = 'debt-of-years-meta-v1';

let memoryMeta = null;

const EMPTY_META = {
  endings: [],
  choices: [],
  ngPlusRuns: 0
};

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_META };
  return {
    endings: Array.isArray(raw.endings) ? [...new Set(raw.endings)] : [],
    choices: Array.isArray(raw.choices) ? [...new Set(raw.choices)] : [],
    ngPlusRuns: Number.isFinite(raw.ngPlusRuns) ? raw.ngPlusRuns : 0
  };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return normalize(memoryMeta);
    memoryMeta = normalize(JSON.parse(raw));
    return memoryMeta;
  } catch (err) {
    return normalize(memoryMeta);
  }
}

export function saveMeta(meta) {
  memoryMeta = normalize(meta);
  try {
    localStorage.setItem(META_KEY, JSON.stringify(memoryMeta));
  } catch (err) {
    // Keep the in-memory copy when storage is unavailable.
  }
  return memoryMeta;
}

export function recordEnding(endingId, state) {
  const meta = loadMeta();
  if (!meta.endings.includes(endingId)) meta.endings.push(endingId);
  const choice = state.flags.finalChoice;
  if (choice && !meta.choices.includes(choice)) meta.choices.push(choice);
  return saveMeta(meta);
}

export function incrementNgPlusRun() {
  const meta = loadMeta();
  meta.ngPlusRuns += 1;
  return saveMeta(meta);
}

export function hasMetaProgress() {
  const meta = loadMeta();
  return meta.endings.length > 0 || meta.choices.length > 0;
}
