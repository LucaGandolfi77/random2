import type { GameState, SaveMeta } from '@/core/types';
import { simpleHash } from '@/core/rng';

const DB_NAME = 'ashen-crown-db';
const STORE = 'saves';
const DB_VERSION = 1;
const SAVE_VERSION = 1;
const FALLBACK_PREFIX = 'ashen-crown-save:';

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
  localStorage.setItem(`${FALLBACK_PREFIX}${envelope.slot}`, JSON.stringify(envelope));
};

export const buildMeta = (game: GameState, auto: boolean): SaveMeta => {
  const player = game.characters[game.playerId];
  const locationName =
    game.world.locationId === 'fallen_bastion'
      ? 'The Fallen Bastion'
      : game.world.locationId === 'greymoor'
        ? 'Greymoor Village'
        : game.world.locationId === 'whispering_woods'
          ? 'The Whispering Woods'
          : game.world.locationId === 'sunken_temple'
            ? 'The Sunken Temple'
            : game.world.locationId === 'ashen_citadel'
              ? 'The Ashen Citadel'
              : game.world.locationId.replace(/_/g, ' ');
  return {
    slot: '',
    name: player?.name ?? 'The Unwritten',
    timestamp: Date.now(),
    location: locationName,
    level: player?.level ?? 1,
    playTime: game.playTime,
    auto
  };
};

export const saveGame = async (slot: string, game: GameState): Promise<SaveMeta> => {
  const meta = buildMeta(game, slot === 'auto');
  meta.slot = slot;
  const data: GameState = {
    ...structuredClone(game),
    version: SAVE_VERSION,
    updatedAt: Date.now()
  };
  const envelope: SaveEnvelope = {
    slot,
    meta,
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
  return meta;
};

export const loadGame = async (slot: string): Promise<{ game: GameState; meta: SaveMeta } | { error: string }> => {
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
  if (!envelope) return { error: 'Save not found.' };
  if (envelope.saveVersion !== SAVE_VERSION || envelope.data?.version !== SAVE_VERSION) {
    return { error: 'This save was made by an incompatible version of Ashen Crown.' };
  }
  const checksum = simpleHash(JSON.stringify(envelope.data));
  if (checksum !== envelope.checksum) {
    return { error: 'This save is corrupted and cannot be loaded safely.' };
  }
  if (!envelope.data.characters || !envelope.data.playerId) {
    return { error: 'This save is missing essential game data.' };
  }
  return { game: envelope.data, meta: envelope.meta };
};

export const listSaves = async (): Promise<SaveMeta[]> => {
  const saves: SaveEnvelope[] = [];
  try {
    const db = await openDb();
    const records = await new Promise<SaveEnvelope[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as SaveEnvelope[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error('Could not list saves'));
    });
    db.close();
    saves.push(...records);
  } catch {
    for (const slot of ['auto', 'slot1', 'slot2', 'slot3']) {
      const record = fallbackGet(slot);
      if (record) saves.push(record);
    }
  }
  return saves
    .filter((s) => s?.meta)
    .map((s) => s.meta)
    .sort((a, b) => b.timestamp - a.timestamp);
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
    localStorage.removeItem(`${FALLBACK_PREFIX}${slot}`);
  }
};

export const hasAnySave = async (): Promise<boolean> => (await listSaves()).length > 0;

export const latestSave = async (): Promise<SaveMeta | null> => (await listSaves())[0] ?? null;

export const clearAllSaves = async (): Promise<void> => {
  for (const slot of ['auto', 'slot1', 'slot2', 'slot3']) await deleteSave(slot);
};

export const formatPlayTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatSaveDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
