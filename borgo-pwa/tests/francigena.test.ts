import { describe, expect, it } from 'vitest';
import { buildCityColliders, CollisionWorld } from '../src/data/colliders';
import {
  CREDENTIAL_PLACE_IDS,
  FRANCIGENA_ROUTE,
  FRANCIGENA_STAGES,
  FRANCIGENA_STONES
} from '../src/data/francigena';
import { STAMPS } from '../src/data/stamps';
import { DISCOVERIES } from '../src/data/town';

const world = new CollisionWorld(buildCityColliders());

describe('Via Francigena credential', () => {
  it('has four stones and five stages, ending at the taverna', () => {
    expect(FRANCIGENA_STONES).toHaveLength(4);
    expect(FRANCIGENA_STAGES).toHaveLength(5);
    expect(new Set(FRANCIGENA_STAGES.map((stage) => stage.placeId)).size).toBe(5);
    expect(FRANCIGENA_STAGES[4].placeId).toBe('taverna-interno');
    expect(FRANCIGENA_STAGES[4].x).toBe(74);
    expect(FRANCIGENA_STAGES[4].z).toBe(104);
  });

  it('references real discoveries and one final stamp', () => {
    const places = new Set(DISCOVERIES.map((place) => place.id));
    for (const stage of FRANCIGENA_STAGES) {
      expect(places.has(stage.placeId), stage.placeId).toBe(true);
    }
    const stamp = STAMPS.find((entry) => entry.id === 'stamp-credential');
    expect(stamp).toBeDefined();
    expect(stamp?.placeIds).toEqual(CREDENTIAL_PLACE_IDS);
    expect(stamp?.placeIds).toHaveLength(FRANCIGENA_STAGES.length);
  });

  it('puts every stone on free ground and every stage on the route', () => {
    for (const stone of FRANCIGENA_STONES) {
      expect(world.isFree(stone.x, stone.z, 0.34), stone.id).toBe(true);
    }
    expect(FRANCIGENA_ROUTE.length).toBeGreaterThan(5);
    for (const stage of FRANCIGENA_STAGES) {
      expect(
        FRANCIGENA_ROUTE.some((point) => point.x === stage.x && point.z === stage.z),
        stage.placeId
      ).toBe(true);
    }
  });
});
