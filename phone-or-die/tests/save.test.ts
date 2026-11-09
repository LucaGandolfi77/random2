import { describe, expect, it } from 'vitest';
import { loadGame, saveGame, listSaves, deleteSave, buildMeta } from '@/systems/save';
import { makeGame } from './support';

describe('save system (localStorage fallback)', () => {
  it('writes, lists, loads and deletes a save', async () => {
    const game = makeGame({ nightMinute: 123, chapter: 2, threat: 44 });
    const meta = await saveGame('slot2', game);
    expect(meta.slot).toBe('slot2');
    expect(meta.timeLabel).toBe('12:03 AM');
    expect(meta.threat).toBe(44);

    const saves = await listSaves();
    expect(saves.some((entry) => entry.slot === 'slot2')).toBe(true);

    const loaded = await loadGame('slot2');
    expect('game' in loaded).toBe(true);
    if ('game' in loaded) {
      expect(loaded.game.nightMinute).toBe(123);
      expect(loaded.game.contacts.sophie.trust).toBe(game.contacts.sophie.trust);
    }

    await deleteSave('slot2');
    const after = await loadGame('slot2');
    expect('error' in after).toBe(true);
  });

  it('rejects tampered saves', async () => {
    await saveGame('slot1', makeGame({ threat: 12 }));
    const key = 'phone-or-die-save:slot1';
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.data.threat = 90;
    localStorage.setItem(key, JSON.stringify(envelope));
    const loaded = await loadGame('slot1');
    expect('error' in loaded).toBe(true);
    if ('error' in loaded) expect(loaded.error).toMatch(/corrupt/i);
  });

  it('rejects saves from an incompatible version', async () => {
    await saveGame('slot3', makeGame());
    const key = 'phone-or-die-save:slot3';
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.saveVersion = 99;
    localStorage.setItem(key, JSON.stringify(envelope));
    const loaded = await loadGame('slot3');
    expect('error' in loaded).toBe(true);
    if ('error' in loaded) expect(loaded.error).toMatch(/incompatible/i);
  });

  it('builds metadata from live game state', () => {
    const meta = buildMeta(makeGame({ nightMinute: 450, chapter: 5, playTime: 1200 }), 'auto');
    expect(meta.timeLabel).toBe('5:30 AM');
    expect(meta.auto).toBe(true);
    expect(meta.playTime).toBe(1200);
  });
});
