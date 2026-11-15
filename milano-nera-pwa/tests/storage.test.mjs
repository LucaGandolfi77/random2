import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, loadProfile, recordChapter, resetProfile, saveProfile } from '../src/storage.js';

function memoryStore(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key)
  };
}

const summary = (overrides = {}) => ({
  chapterId: 1,
  rank: 'A',
  time: 82,
  accuracy: 0.6,
  kills: 8,
  deaths: 0,
  ...overrides
});

test('a missing save starts at chapter one', () => {
  const profile = loadProfile(memoryStore());
  assert.equal(profile.unlocked, 1);
  assert.deepEqual(profile.completed, []);
});

test('clearing a chapter unlocks the next one and stores the best', () => {
  const profile = defaultProfile();
  const result = recordChapter(profile, summary());
  assert.equal(profile.unlocked, 2);
  assert.deepEqual(profile.completed, [1]);
  assert.equal(profile.best[1].rank, 'A');
  assert.equal(result.isBestRank, true);
});

test('rank and time records improve independently', () => {
  const profile = defaultProfile();
  recordChapter(profile, summary({ rank: 'B', time: 100 }));
  recordChapter(profile, summary({ rank: 'S', time: 120 }));
  assert.equal(profile.best[1].rank, 'S');
  assert.equal(profile.best[1].time, 100);
  recordChapter(profile, summary({ rank: 'A', time: 70 }));
  assert.equal(profile.best[1].rank, 'S');
  assert.equal(profile.best[1].time, 70);
});

test('the sixth chapter records the ending', () => {
  const profile = defaultProfile();
  recordChapter(profile, summary({ chapterId: 6, rank: 'A' }));
  assert.equal(profile.endingSeen, true);
  assert.equal(profile.unlocked, 6);
});

test('a legacy three-chapter save maps onto the extended campaign', () => {
  const store = memoryStore({
    'milano-nera-77': JSON.stringify({
      version: 1,
      unlocked: 3,
      completed: [1, 2, 3],
      best: {
        1: { rank: 'A', time: 80, accuracy: 0.6 },
        2: { rank: 'B', time: 120, accuracy: 0.5 },
        3: { rank: 'S', time: 140, accuracy: 0.7 }
      },
      totalKills: 20,
      totalDeaths: 2,
      endingSeen: true
    })
  });
  const profile = loadProfile(store);
  assert.equal(profile.version, 2);
  assert.equal(profile.unlocked, 3);
  assert.deepEqual(profile.completed.sort((a, b) => a - b), [1, 2, 5, 6]);
  assert.equal(profile.best[5].rank, 'S');
  assert.equal(profile.best[6].rank, 'S');
  assert.equal(profile.endingSeen, true);
  assert.equal(profile.totalKills, 20);
});

test('saving and resetting a profile is deterministic', () => {
  const store = memoryStore();
  const profile = defaultProfile();
  recordChapter(profile, summary());
  saveProfile(profile, store);
  const loaded = loadProfile(store);
  assert.equal(loaded.unlocked, 2);
  const fresh = resetProfile(profile, store);
  assert.equal(fresh.unlocked, 1);
  assert.deepEqual(fresh.completed, []);
});
