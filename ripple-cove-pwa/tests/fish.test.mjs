import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FISH, LEGENDS, NORMAL, BY_ID, LOCATIONS_LIST,
  matchesCondition, legendChance, chooseFish, conditionText,
} from '../fish-rules.js';

const ctx = (over = {}) => ({
  loc: 'river', weather: 'sunny', season: 1, night: false,
  bait: 'worm', level: 1, luck: 0, ...over,
});

test('roster: 84 fish, 12 legends, four locations', () => {
  assert.equal(FISH.length, 84);
  assert.equal(LEGENDS.length, 12);
  assert.equal(NORMAL.length, 72);
  assert.equal(new Set(FISH.map((f) => f.id)).size, FISH.length);
  LOCATIONS_LIST.forEach((loc) => {
    assert.ok(NORMAL.filter((f) => f.loc === loc).length >= 8, loc);
    assert.equal(LEGENDS.filter((f) => f.loc === loc).length, 3, loc);
  });
});

test('every fish has complete localized data', () => {
  for (const f of FISH) {
    for (const key of ['it', 'en', 'it_f', 'en_f', 'em', 'id', 'loc']) {
      assert.ok(f[key], `${f.id}: missing ${key}`);
    }
    assert.ok(f.r >= 0 && f.r <= 4, f.id);
    assert.ok(f.w[0] < f.w[1], f.id);
    assert.ok(f.v > 0 && f.xp > 0, f.id);
  }
});

test('legends have conditions, lore and hints', () => {
  for (const f of LEGENDS) {
    assert.equal(f.r, 4, f.id);
    assert.ok(f.condition && Object.keys(f.condition).length, f.id);
    assert.ok(f.lore_it && f.lore_en, f.id);
    assert.ok(f.hint_it && f.hint_en, f.id);
    assert.ok(f.glow, f.id);
    assert.ok(conditionText(f, 'en'));
    assert.ok(conditionText(f, 'it'));
  }
});

test('matchesCondition checks weather, season, bait, night, luck, level', () => {
  const f = BY_ID.currentking;
  assert.equal(matchesCondition(f, ctx({ weather: 'storm', bait: 'roe' })), true);
  assert.equal(matchesCondition(f, ctx({ weather: 'sunny', bait: 'roe' })), false);
  assert.equal(matchesCondition(f, ctx({ weather: 'storm', bait: 'worm' })), false);
  assert.equal(matchesCondition(BY_ID.crystaltrout, ctx({ season: 3, weather: 'snow' })), true);
  assert.equal(matchesCondition(BY_ID.crystaltrout, ctx({ season: 1, weather: 'snow' })), false);
  assert.equal(matchesCondition(BY_ID.silvermirror, ctx({ night: true })), true);
  assert.equal(matchesCondition(BY_ID.silvermirror, ctx({ night: false })), false);
  assert.equal(matchesCondition(BY_ID.lakeguardian, ctx({ night: true, bait: 'glow', level: 6 })), true);
  assert.equal(matchesCondition(BY_ID.lakeguardian, ctx({ night: true, bait: 'glow', level: 5 })), false);
});

test('legend chance scales with luck and is capped', () => {
  assert.ok(legendChance(0) > 0);
  assert.ok(legendChance(2) > legendChance(0));
  assert.ok(legendChance(100) <= 0.09);
});

test('chooseFish returns a legend only when conditions match and the roll hits', () => {
  const good = ctx({ weather: 'storm', bait: 'roe' });
  const legend = chooseFish(good, () => 0.001);
  assert.equal(legend.legend, true);
  assert.equal(legend.id, 'currentking');

  // High roll skips the legend branch, falling back to normal rarity rules.
  const normal = chooseFish(good, () => 0.99);
  assert.equal(normal.legend, undefined);
  assert.equal(normal.loc, 'river');
});

test('chooseFish never returns a legend when conditions fail', () => {
  const bad = ctx({ weather: 'sunny', bait: 'worm', night: false, season: 1, level: 1 });
  for (let i = 0; i < 50; i++) {
    const f = chooseFish(bad, () => (i % 97) / 100);
    assert.equal(f.legend, undefined);
  }
});

test('chooseFish rarity distribution keeps all tiers reachable', () => {
  const seen = new Set();
  let seed = 1;
  const seeded = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2000; i++) seen.add(chooseFish(ctx(), seeded).r);
  [0, 1, 2, 3, 4].forEach((r) => assert.ok(seen.has(r), `rarity ${r} never appeared`));
});

test('chooseFish always returns a fish for every location', () => {
  LOCATIONS_LIST.forEach((loc) => {
    const f = chooseFish(ctx({ loc }), Math.random);
    assert.equal(f.loc, loc);
    assert.ok(BY_ID[f.id]);
  });
});
