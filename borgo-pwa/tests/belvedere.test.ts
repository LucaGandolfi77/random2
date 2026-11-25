import { describe, expect, it } from 'vitest';
import { BELVEDERE_SPOTS } from '../src/data/belvedere';
import { buildCityColliders, CollisionWorld } from '../src/data/colliders';
import { STAMPS } from '../src/data/stamps';
import { DISCOVERIES } from '../src/data/town';

const world = new CollisionWorld(buildCityColliders());

describe('Fidenza belvederes', () => {
  it('has five unique, bilingual viewpoints on free ground', () => {
    expect(BELVEDERE_SPOTS).toHaveLength(5);
    expect(new Set(BELVEDERE_SPOTS.map((spot) => spot.id)).size).toBe(BELVEDERE_SPOTS.length);
    for (const spot of BELVEDERE_SPOTS) {
      expect(spot.name.it.length).toBeGreaterThan(0);
      expect(spot.name.en.length).toBeGreaterThan(0);
      expect(spot.view.pitch).toBeGreaterThan(0);
      expect(world.isFree(spot.x, spot.z, 0.34), spot.id).toBe(true);
    }
  });

  it('references real discoveries and one final stamp', () => {
    const places = new Set(DISCOVERIES.map((place) => place.id));
    for (const spot of BELVEDERE_SPOTS) expect(places.has(spot.id), spot.id).toBe(true);
    const stamp = STAMPS.find((entry) => entry.id === 'stamp-belvedere');
    expect(stamp).toBeDefined();
    expect(stamp?.placeIds).toEqual(BELVEDERE_SPOTS.map((spot) => spot.id));
  });
});
