import Dexie, { type Table } from 'dexie';
import type { GalleryEntry, SaveGame } from '@/types/game';
import { SAVE_VERSION } from './defaults';
import { migrateSave, validateSave } from './schema';

export interface SaveRow {
  id: string;
  updatedAt: number;
  data: SaveGame;
}

export interface MetaRow {
  key: string;
  value: string;
  createdAt: number;
}

export class NoriDatabase extends Dexie {
  saves!: Table<SaveRow, string>;
  gallery!: Table<GalleryEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('nori-nook');
    this.version(1).stores({
      saves: 'id, updatedAt',
      gallery: 'id, createdAt',
      meta: 'key, createdAt',
    });
  }
}

export const noriDb = new NoriDatabase();

const cloneSave = (save: SaveGame): SaveGame => JSON.parse(JSON.stringify(save)) as SaveGame;

export const writeSave = async (save: SaveGame): Promise<void> => {
  const stamped = cloneSave(save);
  stamped.version = SAVE_VERSION;
  stamped.updatedAt = Date.now();
  await noriDb.saves.put({ id: 'main', updatedAt: stamped.updatedAt, data: stamped });
};

export const readSave = async (): Promise<SaveGame | null> => {
  const row = await noriDb.saves.get('main');
  if (!row) return null;
  const check = validateSave(row.data);
  if (!check.ok || !check.save) {
    await noriDb.meta.put({
      key: `corrupt-save-${Date.now()}`,
      value: JSON.stringify(row.data),
      createdAt: Date.now(),
    });
    return null;
  }
  if (check.save.version < SAVE_VERSION) {
    await writeSave(check.save);
  }
  return check.save;
};

export const clearSave = async (): Promise<void> => {
  await noriDb.saves.clear();
};

export const exportSaveObject = (save: SaveGame) => ({
  app: 'nori-nook',
  saveVersion: save.version,
  exportedAt: new Date().toISOString(),
  data: save,
});

export const exportSaveString = (save: SaveGame): string => JSON.stringify(exportSaveObject(save), null, 2);

export const parseImportedSave = (text: string): SaveGame => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The backup file is not valid JSON.');
  }
  const candidate =
    typeof parsed === 'object' && parsed !== null && 'data' in parsed
      ? (parsed as { data: unknown }).data
      : parsed;
  return migrateSave(candidate);
};

export const importSaveString = async (text: string): Promise<SaveGame> => {
  const previous = await noriDb.saves.get('main');
  if (previous) {
    await noriDb.meta.put({
      key: `pre-import-backup-${Date.now()}`,
      value: JSON.stringify(previous.data),
      createdAt: Date.now(),
    });
  }
  const save = parseImportedSave(text);
  await writeSave(save);
  return save;
};

export const addGalleryEntry = async (entry: GalleryEntry): Promise<void> => {
  await noriDb.gallery.put(entry);
};

export const listGallery = async (): Promise<GalleryEntry[]> => {
  const entries = await noriDb.gallery.orderBy('createdAt').reverse().toArray();
  return entries;
};

export const deleteGalleryEntry = async (id: string): Promise<void> => {
  await noriDb.gallery.delete(id);
};

export const clearAllData = async (): Promise<void> => {
  await noriDb.delete();
  await noriDb.open();
};

export const resetDatabaseForTests = async (): Promise<void> => {
  if (noriDb.isOpen()) noriDb.close();
  await Dexie.delete('nori-nook');
  await noriDb.open();
};
