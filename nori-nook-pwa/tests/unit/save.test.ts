import { beforeEach, describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import {
  exportSaveObject,
  exportSaveString,
  importSaveString,
  parseImportedSave,
  readSave,
  resetDatabaseForTests,
  writeSave,
  noriDb,
  clearSave,
} from '@/storage/db';
import { migrateSave, validateSave } from '@/storage/schema';
import { SAVE_VERSION } from '@/storage/defaults';

describe('save system', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('round-trips a save through IndexedDB', async () => {
    const save = createTestSave({ coins: 123, level: 3 });
    await writeSave(save);
    const loaded = await readSave();
    expect(loaded).toBeTruthy();
    expect(loaded?.player.coins).toBe(123);
    expect(loaded?.player.level).toBe(3);
    expect(loaded?.version).toBe(SAVE_VERSION);
    await clearSave();
    expect(await readSave()).toBeNull();
  });

  it('migrates a v1 save and preserves progress', () => {
    const migrated = migrateSave({
      version: 1,
      player: { level: 3, xp: 130, coins: 99, pearls: 4 },
      discoveredRecipes: ['salmon_nigiri'],
    });
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.player.coins).toBe(99);
    expect(migrated.player.level).toBe(3);
    expect(migrated.discoveredRecipes).toEqual(['salmon_nigiri']);
    expect(migrated.story.completedNeighborhoods).toEqual([]);
    expect(migrated.missions.missions.length).toBe(3);
  });

  it('rejects corrupted or future saves cleanly', () => {
    expect(validateSave({ version: 99 }).ok).toBe(false);
    expect(validateSave('not a save').ok).toBe(false);
    const invalid = validateSave({ version: SAVE_VERSION, player: {} });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBeTruthy();
  });

  it('backs up a corrupted save instead of silently loading it', async () => {
    await noriDb.saves.put({
      id: 'main',
      updatedAt: Date.now(),
      data: { broken: true } as never,
    });
    expect(await readSave()).toBeNull();
    const backups = await noriDb.meta.toArray();
    expect(backups.some((entry) => entry.key.startsWith('corrupt-save-'))).toBe(true);
  });

  it('exports and imports a full save', async () => {
    const save = createTestSave({ coins: 777 });
    const exported = exportSaveString(save);
    const parsed = exportSaveObject(save);
    expect(parsed.app).toBe('nori-nook');
    expect(parseImportedSave(exported).player.coins).toBe(777);
    const imported = await importSaveString(exported);
    expect(imported.player.coins).toBe(777);
    const loaded = await readSave();
    expect(loaded?.player.coins).toBe(777);
  });

  it('rejects malformed import data', () => {
    expect(() => parseImportedSave('{no json')).toThrow(/JSON/i);
    expect(() => parseImportedSave(JSON.stringify({ version: 1 }))).not.toThrow();
  });

  it('keeps imported saves versioned and valid', () => {
    const save = createTestSave();
    const validated = validateSave(JSON.parse(JSON.stringify(save)));
    expect(validated.ok).toBe(true);
    expect(validated.save?.version).toBe(SAVE_VERSION);
  });
});
