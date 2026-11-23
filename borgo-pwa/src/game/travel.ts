import type { CircleCollider, CollisionWorld } from '../data/colliders';
import type { VehicleKind, WorldBounds } from '../data/types';

export type TravelMode = 'walk' | 'car' | 'bike' | 'fly';

export interface VehicleMotion {
  x: number;
  z: number;
  heading: number;
  speed: number;
}

export interface VehicleInput {
  throttle: number;
  steer: number;
  brake: boolean;
}

export interface VehicleConfig {
  maxSpeed: number;
  reverseSpeed: number;
  acceleration: number;
  reverseAcceleration: number;
  braking: number;
  rolling: number;
  steerRate: number;
  radius: number;
}

export const VEHICLE_CONFIG: Record<VehicleKind, VehicleConfig> = {
  car: {
    maxSpeed: 15,
    reverseSpeed: 5,
    acceleration: 6.5,
    reverseAcceleration: 4.2,
    braking: 14,
    rolling: 2.2,
    steerRate: 1.55,
    radius: 1.1
  },
  bike: {
    maxSpeed: 8.2,
    reverseSpeed: 2.4,
    acceleration: 4.2,
    reverseAcceleration: 3,
    braking: 9,
    rolling: 2.8,
    steerRate: 2.05,
    radius: 0.5
  }
};

export const FLIGHT = {
  speed: 10.5,
  verticalSpeed: 6.5,
  acceleration: 5.5,
  verticalAcceleration: 6,
  minY: 1.2,
  maxY: 80,
  radius: 0.55
} as const;

export interface FlightMotion {
  x: number;
  z: number;
  y: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface FlightInput {
  x: number;
  z: number;
  vertical: number;
}

export function createVehicleMotion(
  x: number,
  z: number,
  heading: number
): VehicleMotion {
  return { x, z, heading, speed: 0 };
}

export function createFlightMotion(x: number, z: number): FlightMotion {
  return { x, z, y: FLIGHT.minY, vx: 0, vy: 0, vz: 0 };
}

/** Arcade car/bike physics. Returns true when the vehicle bumped into geometry. */
export function stepVehicle(
  motion: VehicleMotion,
  kind: VehicleKind,
  input: VehicleInput,
  dt: number,
  world: Pick<CollisionWorld, 'move'>
): boolean {
  if (dt <= 0) return false;
  const config = VEHICLE_CONFIG[kind];
  const throttle = clamp(input.throttle, -1, 1);
  const steer = clamp(input.steer, -1, 1);

  if (input.brake) {
    motion.speed = approach(motion.speed, 0, config.braking * dt);
  } else if (Math.abs(throttle) > 0.03) {
    if (throttle > 0) {
      motion.speed = approach(motion.speed, config.maxSpeed, config.acceleration * throttle * dt);
    } else {
      motion.speed = approach(
        motion.speed,
        -config.reverseSpeed,
        config.reverseAcceleration * -throttle * dt
      );
    }
  } else {
    motion.speed = approach(motion.speed, 0, config.rolling * dt);
  }
  motion.speed = clamp(motion.speed, -config.reverseSpeed, config.maxSpeed);

  if (Math.abs(motion.speed) > 0.05) {
    const ratio = clamp(Math.abs(motion.speed) / config.maxSpeed, 0, 1);
    motion.heading = wrapAngle(
      motion.heading + steer * config.steerRate * ratio * dt * Math.sign(motion.speed)
    );
  }

  const dx = Math.sin(motion.heading) * motion.speed * dt;
  const dz = Math.cos(motion.heading) * motion.speed * dt;
  const moved = world.move({ x: motion.x, z: motion.z }, { x: dx, z: dz }, config.radius);
  motion.x = moved.x;
  motion.z = moved.z;
  if (moved.collided) {
    motion.speed = Math.abs(motion.speed) < 1.6 ? 0 : -motion.speed * 0.16;
    return true;
  }
  return false;
}

/** Free flight: camera-relative steering, no building collision, hard map bounds. */
export function stepFlight(
  motion: FlightMotion,
  input: FlightInput,
  cameraYaw: number,
  dt: number,
  bounds: WorldBounds
): void {
  if (dt <= 0) return;
  let ax = clamp(input.x, -1, 1);
  let az = clamp(input.z, -1, 1);
  const magnitude = Math.hypot(ax, az);
  if (magnitude > 1) {
    ax /= magnitude;
    az /= magnitude;
  }

  const forwardX = -Math.sin(cameraYaw);
  const forwardZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);
  const targetX = (rightX * ax + forwardX * az) * FLIGHT.speed;
  const targetZ = (rightZ * ax + forwardZ * az) * FLIGHT.speed;
  const blend = Math.min(1, FLIGHT.acceleration * dt);
  motion.vx += (targetX - motion.vx) * blend;
  motion.vz += (targetZ - motion.vz) * blend;

  const vertical = clamp(input.vertical, -1, 1);
  const targetY = vertical * FLIGHT.verticalSpeed;
  motion.vy += (targetY - motion.vy) * Math.min(1, FLIGHT.verticalAcceleration * dt);

  motion.x += motion.vx * dt;
  motion.z += motion.vz * dt;
  motion.y = clamp(motion.y + motion.vy * dt, FLIGHT.minY, FLIGHT.maxY);

  const minX = bounds.minX + FLIGHT.radius;
  const maxX = bounds.maxX - FLIGHT.radius;
  const minZ = bounds.minZ + FLIGHT.radius;
  const maxZ = bounds.maxZ - FLIGHT.radius;
  if (motion.x < minX) {
    motion.x = minX;
    motion.vx = Math.max(0, motion.vx);
  }
  if (motion.x > maxX) {
    motion.x = maxX;
    motion.vx = Math.min(0, motion.vx);
  }
  if (motion.z < minZ) {
    motion.z = minZ;
    motion.vz = Math.max(0, motion.vz);
  }
  if (motion.z > maxZ) {
    motion.z = maxZ;
    motion.vz = Math.min(0, motion.vz);
  }
}

/** The parked vehicle body, reused as a dynamic obstacle for walking and driving. */
export function vehicleCollider(
  motion: Pick<VehicleMotion, 'x' | 'z'>,
  kind: VehicleKind
): CircleCollider {
  return {
    kind: 'circle',
    x: motion.x,
    z: motion.z,
    r: VEHICLE_CONFIG[kind].radius
  };
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  if (value > target) return Math.max(target, value - amount);
  return value;
}

function wrapAngle(value: number): number {
  const tau = Math.PI * 2;
  return ((value % tau) + tau) % tau;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
