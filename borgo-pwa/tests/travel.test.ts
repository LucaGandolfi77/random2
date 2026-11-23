import { describe, expect, it } from 'vitest';
import { CollisionWorld, type BoxCollider } from '../src/data/colliders';
import {
  FLIGHT,
  createFlightMotion,
  createVehicleMotion,
  stepFlight,
  stepVehicle,
  VEHICLE_CONFIG
} from '../src/game/travel';
import {
  TRAIN_STOP_DISTANCE,
  pathLength,
  pointAlongTrack,
  trainStatus
} from '../src/game/train';
import { TRAIN_PLATFORM } from '../src/data/town';

const openWorld = new CollisionWorld([], { minX: -100, maxX: 100, minZ: -100, maxZ: 100 });

function simulate(
  motion: ReturnType<typeof createVehicleMotion>,
  kind: 'car' | 'bike',
  input: { throttle: number; steer: number; brake: boolean },
  seconds: number,
  world = openWorld
): boolean {
  const step = 1 / 60;
  let collided = false;
  for (let time = 0; time < seconds; time += step) {
    collided = stepVehicle(motion, kind, input, step, world) || collided;
  }
  return collided;
}

describe('vehicle physics', () => {
  it('accelerates a car and a bike forward', () => {
    const car = createVehicleMotion(0, 0, 0);
    simulate(car, 'car', { throttle: 1, steer: 0, brake: false }, 3);
    expect(car.speed).toBeGreaterThan(5);
    expect(car.speed).toBeLessThanOrEqual(VEHICLE_CONFIG.car.maxSpeed + 1e-6);
    expect(car.z).toBeGreaterThan(3);

    const bike = createVehicleMotion(0, 0, 0);
    simulate(bike, 'bike', { throttle: 1, steer: 0, brake: false }, 3);
    expect(bike.speed).toBeGreaterThan(4);
    expect(bike.speed).toBeLessThan(car.speed);
  });

  it('brakes to a stop', () => {
    const car = createVehicleMotion(0, 0, 0);
    simulate(car, 'car', { throttle: 1, steer: 0, brake: false }, 4);
    expect(car.speed).toBeGreaterThan(6);
    simulate(car, 'car', { throttle: 0, steer: 0, brake: true }, 1.5);
    expect(Math.abs(car.speed)).toBeLessThan(0.01);
  });

  it('steers while moving and not while parked', () => {
    const parked = createVehicleMotion(0, 0, 0);
    simulate(parked, 'car', { throttle: 0, steer: 1, brake: false }, 1);
    expect(parked.heading).toBeCloseTo(0);

    const moving = createVehicleMotion(0, 0, 0);
    simulate(moving, 'car', { throttle: 1, steer: 1, brake: false }, 4);
    expect(moving.heading).toBeGreaterThan(0.1);
  });

  it('stops at a wall instead of passing through it', () => {
    const wall: BoxCollider = { kind: 'box', x: 5, z: 0, hw: 0.5, hd: 3 };
    const world = new CollisionWorld([wall], { minX: -20, maxX: 20, minZ: -20, maxZ: 20 });
    const car = createVehicleMotion(0, 0, Math.PI / 2);
    const collided = simulate(car, 'car', { throttle: 1, steer: 0, brake: false }, 4, world);
    expect(collided).toBe(true);
    expect(car.x).toBeLessThan(5 - 1.1 + 0.01);
  });

  it('keeps the vehicle inside the playable bounds', () => {
    const car = createVehicleMotion(95, 0, Math.PI / 2);
    simulate(car, 'car', { throttle: 1, steer: 0, brake: false }, 5);
    expect(car.x).toBeLessThanOrEqual(100 - 1.1 + 1e-6);
  });
});

describe('jetpack flight', () => {
  it('climbs to the ceiling and comes back down', () => {
    const motion = createFlightMotion(0, 0);
    for (let i = 0; i < 1200; i++) {
      stepFlight(motion, { x: 0, z: 0, vertical: 1 }, 0, 1 / 60, openWorld.bounds);
    }
    expect(motion.y).toBeCloseTo(FLIGHT.maxY, 0);
    for (let i = 0; i < 2400; i++) {
      stepFlight(motion, { x: 0, z: 0, vertical: -1 }, 0, 1 / 60, openWorld.bounds);
    }
    expect(motion.y).toBeLessThan(3);
  });

  it('flies camera-relative and never leaves the map', () => {
    const motion = createFlightMotion(0, 0);
    for (let i = 0; i < 900; i++) {
      stepFlight(motion, { x: 1, z: 0, vertical: 0 }, 0, 1 / 60, openWorld.bounds);
    }
    expect(motion.x).toBeCloseTo(100 - FLIGHT.radius, 0);
    expect(motion.y).toBe(FLIGHT.minY);
  });
});

describe('station timetable', () => {
  it('dwells, leaves and comes back on a deterministic cycle', () => {
    expect(trainStatus(0).phase).toBe('dwell');
    expect(trainStatus(10).distance).toBe(TRAIN_STOP_DISTANCE);
    expect(trainStatus(30).phase).toBe('departing');
    expect(trainStatus(30).distance).toBeGreaterThan(TRAIN_STOP_DISTANCE);
    expect(trainStatus(48).phase).toBe('away');
    expect(trainStatus(60).phase).toBe('arriving');
    expect(trainStatus(75).phase).toBe('arriving');
    expect(trainStatus(76).phase).toBe('dwell');
    expect(trainStatus(76).distance).toBe(TRAIN_STOP_DISTANCE);
  });

  it('puts the platform exactly beside the stopped convoy', () => {
    const stop = pointAlongTrack(TRAIN_STOP_DISTANCE);
    expect(Math.hypot(stop.x - TRAIN_PLATFORM.x, stop.z - TRAIN_PLATFORM.z)).toBeLessThan(4);
    expect(pathLength()).toBeGreaterThan(100);
  });
});
