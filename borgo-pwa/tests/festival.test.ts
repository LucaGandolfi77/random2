import { describe, expect, it } from 'vitest';
import { buildCityColliders, CollisionWorld } from '../src/data/colliders';
import {
  FESTIVAL_BRANCHES,
  FESTIVAL_GUEST,
  FESTIVAL_LANTERNS,
  FESTIVAL_MUSICIANS,
  FESTIVAL_PROCESSION_PATH,
  FESTIVAL_STAGE,
  FESTIVAL_STARTER
} from '../src/data/festival';
import { SPAWN } from '../src/data/town';
import {
  canStartProcession,
  collectBranch,
  createFestivalState,
  festivalObstacles,
  festivalPathLength,
  festivalPathPoint,
  festivalTaskCount,
  finishGarland,
  finishProcession,
  inviteMusician,
  lightLantern,
  startFestival,
  startProcession,
  unlockFestival,
  welcomeGuest
} from '../src/game/festival';

const world = new CollisionWorld([...buildCityColliders(), ...festivalObstacles()]);

describe('festival state', () => {
  it('stays locked until the bell unlocks it', () => {
    const festival = createFestivalState();
    expect(festival.phase).toBe('locked');
    expect(startFestival(festival)).toBe(false);
    expect(lightLantern(festival, FESTIVAL_LANTERNS[0].id)).toBe(false);
    expect(unlockFestival(festival)).toBe(true);
    expect(festival.phase).toBe('ready');
    expect(startFestival(festival)).toBe(true);
    expect(festival.phase).toBe('active');
  });

  it('collects each activity once and opens the procession at three', () => {
    const festival = createFestivalState(true);
    startFestival(festival);
    for (const lantern of FESTIVAL_LANTERNS) {
      expect(lightLantern(festival, lantern.id)).toBe(true);
    }
    expect(lightLantern(festival, FESTIVAL_LANTERNS[0].id)).toBe(false);
    expect(festivalTaskCount(festival)).toBe(1);

    for (const musician of FESTIVAL_MUSICIANS) {
      expect(inviteMusician(festival, musician.id)).toBe(true);
    }
    expect(festivalTaskCount(festival)).toBe(2);
    expect(canStartProcession(festival)).toBe(false);

    for (const branch of FESTIVAL_BRANCHES) {
      expect(collectBranch(festival, branch.id)).toBe(true);
    }
    expect(festival.garland).toBe(false);
    expect(finishGarland(festival)).toBe(true);
    expect(festivalTaskCount(festival)).toBe(3);
    expect(canStartProcession(festival)).toBe(true);

    expect(welcomeGuest(festival)).toBe(true);
    expect(festivalTaskCount(festival)).toBe(4);
    expect(startProcession(festival)).toBe(true);
    expect(festival.phase).toBe('procession');
    expect(finishProcession(festival)).toBe(true);
    expect(festival.phase).toBe('done');
    expect(finishProcession(festival)).toBe(false);
  });

  it('rejects unknown activity ids', () => {
    const festival = createFestivalState(true);
    startFestival(festival);
    expect(lightLantern(festival, 'lantern-ghost')).toBe(false);
    expect(inviteMusician(festival, 'musician-ghost')).toBe(false);
    expect(collectBranch(festival, 'branch-ghost')).toBe(false);
    expect(festivalTaskCount(festival)).toBe(0);
  });
});

describe('procession path', () => {
  it('is a closed loop with usable points', () => {
    const length = festivalPathLength();
    expect(length).toBeGreaterThan(40);
    for (const distance of [0, length * 0.25, length * 0.5, length]) {
      const point = festivalPathPoint(distance);
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.z)).toBe(true);
      expect(Number.isFinite(point.heading)).toBe(true);
    }
    expect(festivalPathPoint(length)).toEqual(festivalPathPoint(0));
    expect(FESTIVAL_PROCESSION_PATH.length).toBeGreaterThanOrEqual(4);
  });
});

describe('festival layout', () => {
  it('keeps the starter and every activity point on free ground', () => {
    expect(world.isFree(SPAWN.x, SPAWN.z, 0.34)).toBe(true);
    expect(world.isFree(FESTIVAL_STARTER.x, FESTIVAL_STARTER.z, 0.34)).toBe(true);
    for (const spot of [...FESTIVAL_LANTERNS, ...FESTIVAL_MUSICIANS, ...FESTIVAL_BRANCHES]) {
      expect(world.isFree(spot.x, spot.z, 0.34), spot.id).toBe(true);
    }
    expect(world.isFree(FESTIVAL_GUEST.x, FESTIVAL_GUEST.z, 0.34)).toBe(true);
  });

  it('leaves a free approach to the stage trigger', () => {
    expect(world.isFree(FESTIVAL_STAGE.x, FESTIVAL_STAGE.z - 2.8, 0.34)).toBe(true);
  });

  it('keeps the procession loop clear of the feast props', () => {
    const length = festivalPathLength();
    for (let i = 0; i < 80; i++) {
      const point = festivalPathPoint((i / 80) * length);
      expect(world.isFree(point.x, point.z, 0.4), `path ${i}`).toBe(true);
    }
  });
});
