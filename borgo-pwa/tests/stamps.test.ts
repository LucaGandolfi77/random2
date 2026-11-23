import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '../src/data/town';
import { STAMPS, stampEarned } from '../src/data/stamps';

const ids = new Set(DISCOVERIES.map((place) => place.id));

describe('pilgrim stamps', () => {
  it('has six stamps and references only real discoveries', () => {
    expect(STAMPS).toHaveLength(6);
    expect(new Set(STAMPS.map((stamp) => stamp.id)).size).toBe(STAMPS.length);
    for (const stamp of STAMPS) {
      expect(stamp.name.it.length).toBeGreaterThan(0);
      expect(stamp.name.en.length).toBeGreaterThan(0);
      expect(stamp.placeIds.length).toBeGreaterThan(0);
      for (const placeId of stamp.placeIds) expect(ids.has(placeId), `${stamp.id}: ${placeId}`).toBe(true);
    }
  });

  it('requires both southern parks for the parks stamp', () => {
    const parks = STAMPS.find((stamp) => stamp.id === 'stamp-parchi');
    expect(parks).toBeDefined();
    if (!parks) return;
    expect(stampEarned(parks, ['parco-vittorio'])).toBe(false);
    expect(stampEarned(parks, ['parco-pace'])).toBe(false);
    expect(stampEarned(parks, ['parco-vittorio', 'parco-pace'])).toBe(true);
  });

  it('earns single-place stamps only with their own place', () => {
    const monica = STAMPS.find((stamp) => stamp.id === 'stamp-monica');
    expect(monica).toBeDefined();
    if (!monica) return;
    expect(stampEarned(monica, [])).toBe(false);
    expect(stampEarned(monica, ['sanlazzaro'])).toBe(false);
    expect(stampEarned(monica, ['monica'])).toBe(true);
  });
});
