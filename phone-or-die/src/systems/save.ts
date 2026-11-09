import type { GameState, SaveMeta } from '@/core/types';
import { simpleHash } from '@/core/rng';
import { formatNightTime } from '@/systems/clock';

const DB_NAME = 'phone-or-die-db';
const STORE = 'saves';
const DB_VERSION = 1;
const SAVE_VERSION = 3;
const FALLBACK_PREFIX = 'phone-or-die-save:';
export const SAVE_SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];

export interface SaveEnvelope {
  slot: string;
  meta: SaveMeta;
  data: GameState;
  checksum: string;
  saveVersion: number;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open save database'));
  });

const fallbackGet = (slot: string): SaveEnvelope | null => {
  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}${slot}`);
    return raw ? (JSON.parse(raw) as SaveEnvelope) : null;
  } catch {
    return null;
  }
};

const fallbackSet = (envelope: SaveEnvelope) => {
  try {
    localStorage.setItem(`${FALLBACK_PREFIX}${envelope.slot}`, JSON.stringify(envelope));
  } catch {
    // The caller handles unavailable storage.
  }
};

const fallbackDelete = (slot: string) => {
  try {
    localStorage.removeItem(`${FALLBACK_PREFIX}${slot}`);
  } catch {
    // Ignore unavailable storage.
  }
};

export const buildMeta = (game: GameState, slot: string): SaveMeta => ({
  slot,
  savedAt: Date.now(),
  chapter: game.chapter,
  timeLabel: formatNightTime(game.nightMinute),
  difficulty: game.difficulty,
  threat: Math.round(game.threat),
  battery: Math.round(game.battery),
  playTime: game.playTime,
  auto: slot === 'auto'
});

export const saveGame = async (slot: string, game: GameState): Promise<SaveMeta> => {
  const data: GameState = {
    ...structuredClone(game),
    version: SAVE_VERSION,
    updatedAt: Date.now()
  };
  const envelope: SaveEnvelope = {
    slot,
    meta: buildMeta(data, slot),
    data,
    checksum: simpleHash(JSON.stringify(data)),
    saveVersion: SAVE_VERSION
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(envelope);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Save failed'));
    });
    db.close();
  } catch {
    fallbackSet(envelope);
  }
  return envelope.meta;
};

export const loadGame = async (
  slot: string
): Promise<{ game: GameState; meta: SaveMeta } | { error: string }> => {
  let envelope: SaveEnvelope | null = null;
  try {
    const db = await openDb();
    envelope = await new Promise<SaveEnvelope | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(slot);
      request.onsuccess = () => resolve((request.result as SaveEnvelope | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Load failed'));
    });
    db.close();
  } catch {
    envelope = fallbackGet(slot);
  }
  if (!envelope) envelope = fallbackGet(slot);
  if (!envelope) return { error: 'Save not found.' };
  if (envelope.saveVersion !== SAVE_VERSION || envelope.data?.version !== SAVE_VERSION) {
    return { error: 'This save was made by an incompatible version of Phone or Die.' };
  }
  if (!envelope.data.contacts || !envelope.data.player || !envelope.meta) {
    return { error: 'This save is missing essential data.' };
  }
  try {
    const checksum = simpleHash(JSON.stringify(envelope.data));
    if (checksum !== envelope.checksum) {
      return { error: 'This save is corrupted and cannot be loaded safely.' };
    }
  } catch {
    return { error: 'This save is corrupted and cannot be loaded safely.' };
  }
  return { game: envelope.data, meta: envelope.meta };
};

export const listSaves = async (): Promise<SaveMeta[]> => {
  const saves = new Map<string, SaveEnvelope>();
  try {
    const db = await openDb();
    const records = await new Promise<SaveEnvelope[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as SaveEnvelope[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error('Could not list saves'));
    });
    db.close();
    for (const record of records) if (record?.slot) saves.set(record.slot, record);
  } catch {
    // The fallback below still surfaces localStorage saves.
  }
  for (const slot of SAVE_SLOTS) {
    const record = fallbackGet(slot);
    if (record && !saves.has(slot)) saves.set(slot, record);
  }
  return [...saves.values()]
    .filter((save) => save?.meta)
    .map((save) => save.meta)
    .sort((a, b) => b.savedAt - a.savedAt);
};

export const deleteSave = async (slot: string): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Delete failed'));
    });
    db.close();
  } catch {
    // Ignore a failed database delete; the fallback is removed below.
  }
  fallbackDelete(slot);
};

export const latestSave = async (): Promise<SaveMeta | null> => (await listSaves())[0] ?? null;

export const hasSaves = async (): Promise<boolean> => (await listSaves()).length > 0;
