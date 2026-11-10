import * as THREE from 'three';
import type { CityData } from '../types';
import { CharacterRig, type CharacterState } from './character';
import { CollisionWorld } from './collision';

export interface PlayerFrameInput {
  move: THREE.Vector2;
  look: THREE.Vector2;
  zoom: number;
  jump: boolean;
  jumpHeld: boolean;
  descend: boolean;
  run: boolean;
}

export interface PlayerSpawn {
  x: number;
  z: number;
  heading: number;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Converts a screen-space movement vector into world X/Z relative to the
 * camera direction. `cameraAngle` is the angle of the camera around the player
 * (the direction from player to camera).
 *
 * Screen right is `forward × up`, i.e. (-forward.z, forward.x). A camera behind
 * a character facing +Z therefore maps "right" to world -X, which is what the
 * user actually sees on screen.
 */
export function cameraRelativeDirection(
  strafe: number,
  forward: number,
  cameraAngle: number,
): THREE.Vector2 {
  const forwardX = -Math.sin(cameraAngle);
  const forwardZ = -Math.cos(cameraAngle);
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const x = forwardX * forward + rightX * strafe;
  const z = forwardZ * forward + rightZ * strafe;
  const length = Math.hypot(x, z);
  if (length > 1) {
    return new THREE.Vector2(x / length, z / length);
  }
  return new THREE.Vector2(x, z);
}

export class PlayerController {
  readonly character = new CharacterRig();
  readonly position = new THREE.Vector3();
  flying = false;
  grounded = true;
  heading: number;
  cameraYaw: number;
  cameraPitch = 0.34;
  cameraDistance = 5.4;

  private readonly velocity = new THREE.Vector3();
  private verticalVelocity = 0;
  private support = 0;
  private jumpBuffer = 0;
  private coyote = 0;
  private cameraReady = false;
  private timeSinceLook = 10;

  constructor(
    private readonly world: CollisionWorld,
    spawn: PlayerSpawn,
  ) {
    this.heading = spawn.heading;
    this.cameraYaw = spawn.heading + Math.PI;
    this.support = this.world.groundHeight(spawn.x, spawn.z);
    this.position.set(spawn.x, this.support, spawn.z);
    this.character.root.position.copy(this.position);
    this.character.root.rotation.y = this.heading;
    this.character.shadow.position.set(spawn.x, this.support + 0.035, spawn.z);
  }

  setFlying(flying: boolean): void {
    if (this.flying === flying) return;
    this.flying = flying;
    this.jumpBuffer = 0;
    this.coyote = 0;
    if (flying) {
      this.grounded = false;
      this.verticalVelocity = 3.4;
      if (this.position.y < this.support + 0.25) {
        this.position.y = this.support + 0.25;
      }
    } else {
      this.verticalVelocity = Math.min(0, this.verticalVelocity);
    }
  }

  /** Moves the player to a new local position, dropping any accumulated motion. */
  teleportTo(x: number, z: number, heading?: number): void {
    this.support = this.world.groundHeight(x, z);
    this.position.set(x, this.support, z);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.grounded = true;
    if (heading !== undefined) this.heading = heading;
    this.cameraYaw = this.heading + Math.PI;
    this.cameraReady = false;
    this.character.root.position.copy(this.position);
    this.character.root.rotation.y = this.heading;
    this.character.shadow.position.set(x, this.support + 0.035, z);
  }

  resetCamera(): void {
    this.cameraYaw = this.heading + Math.PI;
    this.cameraPitch = 0.34;
    this.cameraDistance = 5.4;
    this.cameraReady = false;
  }

  syncCamera(camera: THREE.PerspectiveCamera): void {
    this.cameraReady = false;
    this.updateCamera(1 / 60, camera);
  }

  getFocusPoint(target: THREE.Vector3): THREE.Vector3 {
    return target.set(
      this.position.x,
      this.position.y + 1.32,
      this.position.z,
    );
  }

  update(dt: number, camera: THREE.PerspectiveCamera, input: PlayerFrameInput): void {
    const step = Math.min(dt, 0.05);
    this.timeSinceLook += step;
    if (this.flying) {
      this.jumpBuffer = 0;
      this.coyote = 0;
    } else {
      if (input.jump) this.jumpBuffer = 0.15;
      else this.jumpBuffer = Math.max(0, this.jumpBuffer - step);
      if (this.grounded) this.coyote = 0.12;
      else this.coyote = Math.max(0, this.coyote - step);
    }

    if (input.look.lengthSq() > 0.000001) {
      this.cameraYaw += input.look.x * 0.0045;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + input.look.y * 0.003,
        0.055,
        1.2,
      );
      this.timeSinceLook = 0;
    }
    if (Math.abs(input.zoom) > 0.0001) {
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance * Math.exp(input.zoom * 0.0012),
        2.3,
        16,
      );
    }

    const cameraAngle = this.cameraYaw;
    const direction = cameraRelativeDirection(input.move.x, input.move.y, cameraAngle);
    const moveLength = Math.min(1, input.move.length());
    const hasInput = moveLength > 0.01;
    const baseSpeed = this.flying ? 10.5 : input.run ? 7.5 : 4;
    const targetSpeed = moveLength * baseSpeed;
    const acceleration = this.flying ? 9 : this.grounded ? (hasInput ? 20 : 26) : 6;
    this.velocity.x = damp(this.velocity.x, direction.x * targetSpeed, acceleration, step);
    this.velocity.z = damp(this.velocity.z, direction.y * targetSpeed, acceleration, step);
    if (!hasInput && Math.hypot(this.velocity.x, this.velocity.z) < 0.06) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    const bodyHeight = 1.75;
    const radius = 0.38;
    const stepX = this.velocity.x * step;
    const stepZ = this.velocity.z * step;
    let nextX = this.position.x;
    let nextZ = this.position.z;
    const fullFree = !this.world.isBodyBlocked(
      nextX + stepX,
      this.position.y,
      nextZ + stepZ,
      radius,
      bodyHeight,
    );
    if (fullFree) {
      nextX += stepX;
      nextZ += stepZ;
    } else {
      const freeX =
        stepX !== 0 &&
        !this.world.isBodyBlocked(
          nextX + stepX,
          this.position.y,
          nextZ,
          radius,
          bodyHeight,
        );
      const freeZ =
        stepZ !== 0 &&
        !this.world.isBodyBlocked(
          nextX,
          this.position.y,
          nextZ + stepZ,
          radius,
          bodyHeight,
        );
      if (freeX && freeZ) {
        if (Math.abs(stepX) >= Math.abs(stepZ)) {
          nextX += stepX;
          this.velocity.z = 0;
        } else {
          nextZ += stepZ;
          this.velocity.x = 0;
        }
      } else if (freeX) {
        nextX += stepX;
        this.velocity.z = 0;
      } else if (freeZ) {
        nextZ += stepZ;
        this.velocity.x = 0;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }
    [nextX, nextZ] = this.world.clampToBounds(nextX, nextZ);
    this.position.x = nextX;
    this.position.z = nextZ;

    this.support = this.world.supportHeight(
      this.position.x,
      this.position.z,
      this.position.y + 0.35,
    );

    if (this.flying) {
      const targetVertical =
        (input.jumpHeld ? 1 : 0) - (input.descend ? 1 : 0);
      const verticalResponse = targetVertical === 0 ? 5 : 12;
      this.verticalVelocity = damp(
        this.verticalVelocity,
        targetVertical * 6.4,
        verticalResponse,
        step,
      );
      this.position.y += this.verticalVelocity * step;
      if (this.position.y < this.support) {
        this.position.y = this.support;
        if (this.verticalVelocity < 0) this.verticalVelocity = 0;
      }
      this.grounded = this.position.y <= this.support + 0.02;
    } else {
      if (this.grounded && this.support < this.position.y - 0.75) {
        this.grounded = false;
      }
      const canJump = this.grounded || this.coyote > 0.001;
      if (canJump && this.jumpBuffer > 0) {
        this.verticalVelocity = 5.6;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.position.y += 0.02;
      } else if (this.grounded) {
        this.position.y = this.support;
        this.verticalVelocity = 0;
      } else {
        this.verticalVelocity -= 17.5 * step;
        this.position.y += this.verticalVelocity * step;
        if (this.position.y <= this.support) {
          this.position.y = this.support;
          this.verticalVelocity = 0;
          this.grounded = true;
        }
      }
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (moveLength > 0.05) {
      const targetHeading = Math.atan2(direction.x, direction.y);
      this.heading += shortestAngle(this.heading, targetHeading) * (1 - Math.exp(-18 * step));
    }

    let state: CharacterState = 'idle';
    if (this.flying) state = 'fly';
    else if (!this.grounded) state = this.verticalVelocity > 0 ? 'jump' : 'fall';
    else if (horizontalSpeed > 5.4) state = 'run';
    else if (horizontalSpeed > 0.18) state = 'walk';

    this.character.root.position.copy(this.position);
    this.character.root.rotation.y = this.heading;
    this.character.update({ state, speed: horizontalSpeed, dt: step });

    const altitude = Math.max(0, this.position.y - this.support);
    const shadowScale = 1 - THREE.MathUtils.clamp(altitude / 22, 0, 0.62);
    const shadowMaterial = this.character.shadow.material as THREE.MeshBasicMaterial;
    shadowMaterial.opacity = 0.34 * (1 - THREE.MathUtils.clamp(altitude / 36, 0, 1));
    this.character.shadow.position.set(
      this.position.x,
      this.support + 0.035,
      this.position.z,
    );
    this.character.shadow.scale.setScalar(shadowScale);

    if (
      this.timeSinceLook > 0.9 &&
      input.move.y > 0.6 &&
      Math.abs(input.move.x) < 0.45 &&
      horizontalSpeed > 0.35
    ) {
      this.cameraYaw +=
        shortestAngle(this.cameraYaw, this.heading + Math.PI) *
        (1 - Math.exp(-2.4 * step));
    }

    this.updateCamera(step, camera);
  }

  private updateCamera(dt: number, camera: THREE.PerspectiveCamera): void {
    const target = new THREE.Vector3(
      this.position.x + Math.sin(this.heading) * 0.22,
      this.position.y + 1.32,
      this.position.z + Math.cos(this.heading) * 0.22,
    );
    const angle = this.cameraYaw;
    const horizontal = Math.cos(this.cameraPitch) * this.cameraDistance;
    const vertical = Math.sin(this.cameraPitch) * this.cameraDistance;
    const desired = new THREE.Vector3(
      target.x + Math.sin(angle) * horizontal,
      target.y + vertical,
      target.z + Math.cos(angle) * horizontal,
    );
    const direction = desired.clone().sub(target).normalize();
    const allowed = this.world.clearCameraDistance(
      target,
      direction,
      this.cameraDistance,
      0.3,
    );
    desired.copy(target).addScaledVector(direction, allowed);
    const ground = this.world.groundHeight(desired.x, desired.z) + 0.45;
    if (desired.y < ground) desired.y = ground;

    if (!this.cameraReady) {
      camera.position.copy(desired);
      this.cameraReady = true;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-16 * dt));
      const smoothedGround = this.world.groundHeight(camera.position.x, camera.position.z) + 0.35;
      if (camera.position.y < smoothedGround) camera.position.y = smoothedGround;
    }
    camera.lookAt(target);
  }

  static spawnFor(city: CityData, world: CollisionWorld): PlayerSpawn {
    const [minX, minZ, maxX, maxZ] = city.meta.bbox_local;
    const inside = (x: number, z: number): boolean =>
      x > minX + 5 && x < maxX - 5 && z > minZ + 5 && z < maxZ - 5;
    const duomo =
      city.buildings.find((building) => /duomo|cattedrale/i.test(building.name ?? '')) ??
      city.buildings.find((building) => building.landmark) ??
      city.buildings[0];

    if (duomo) {
      const sides = [...duomo.sides].sort((a, b) => {
        if (a.main_facade !== b.main_facade) return a.main_facade ? -1 : 1;
        if (a.street_facing !== b.street_facing) return a.street_facing ? -1 : 1;
        return b.length_m - a.length_m;
      });
      const preferred = sides.filter((side) => side.main_facade);
      const facades = preferred.length
        ? preferred
        : sides.filter((side) => side.street_facing).slice(0, 4);
      const candidates = facades.length ? facades : sides;
      let best: PlayerSpawn | null = null;
      let bestScore = Infinity;
      for (const distance of [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]) {
        for (const side of candidates) {
          const normalX = side.normal[0];
          const normalZ = side.normal[1];
          const midX = (side.p1[0] + side.p2[0]) / 2;
          const midZ = (side.p1[1] + side.p2[1]) / 2;
          const tangents = [
            side.length_m * 0.45,
            -side.length_m * 0.45,
            side.length_m * 0.2,
            -side.length_m * 0.2,
            0,
          ];
          for (const tangent of tangents) {
            const x = midX + normalX * distance - normalZ * tangent;
            const z = midZ + normalZ * distance + normalX * tangent;
            if (!inside(x, z)) continue;
            const ground = world.groundHeight(x, z);
            if (world.isBodyBlocked(x, ground + 0.1, z, 0.5, 1.75)) continue;
            const heading = Math.atan2(
              duomo.centroid_local[0] - x,
              duomo.centroid_local[1] - z,
            );
            const target = new THREE.Vector3(x, ground + 1.32, z);
            const angle = heading + Math.PI;
            const horizontal = Math.cos(0.34) * 5.4;
            const vertical = Math.sin(0.34) * 5.4;
            const desired = new THREE.Vector3(
              target.x + Math.sin(angle) * horizontal,
              target.y + vertical,
              target.z + Math.cos(angle) * horizontal,
            );
            const direction = desired.clone().sub(target).normalize();
            const clearance = world.clearCameraDistance(
              target,
              direction,
              5.4,
              0.3,
            );
            if (clearance < 3.4) continue;
            const score =
              Math.abs(distance - 22) +
              Math.abs(tangent) * 0.22 -
              Math.min(clearance, 5.4) * 0.8;
            if (score < bestScore) {
              bestScore = score;
              best = { x, z, heading };
            }
          }
        }
      }
      if (best) return best;
    }

    const centreX = duomo?.centroid_local[0] ?? (minX + maxX) / 2;
    const centreZ = duomo?.centroid_local[1] ?? (minZ + maxZ) / 2;
    const [pilotMinX, pilotMinZ, pilotMaxX, pilotMaxZ] = city.meta.pilot_bbox_local;
    const inPilot = (x: number, z: number): boolean =>
      x >= pilotMinX && x <= pilotMaxX && z >= pilotMinZ && z <= pilotMaxZ;
    const roadCandidates: { x: number; z: number; heading: number; score: number }[] = [];
    for (const road of city.roads) {
      if (road.points.length < 2 || road.width_m < 4) continue;
      for (let index = 0; index < road.points.length - 1; index += 1) {
        const a = road.points[index];
        const b = road.points[index + 1];
        if (!inPilot(a[0], a[2]) || !inPilot(b[0], b[2])) continue;
        const dx = b[0] - a[0];
        const dz = b[2] - a[2];
        const length = Math.hypot(dx, dz);
        if (length < 5) continue;
        const x = (a[0] + b[0]) / 2;
        const z = (a[2] + b[2]) / 2;
        const ground = world.groundHeight(x, z);
        if (world.isBodyBlocked(x, ground + 0.1, z, 0.45, 1.75)) continue;
        roadCandidates.push({
          x,
          z,
          heading: Math.atan2(dx, dz),
          score: Math.hypot(x - centreX, z - centreZ) + (road.name ? 0 : 12),
        });
      }
    }
    roadCandidates.sort((a, b) => a.score - b.score);
    if (roadCandidates.length) {
      const candidate = roadCandidates[0];
      return { x: candidate.x, z: candidate.z, heading: candidate.heading };
    }

    const fallbackX = THREE.MathUtils.clamp(
      duomo?.centroid_local[0] ?? (minX + maxX) / 2,
      minX + 8,
      maxX - 8,
    );
    const fallbackZ = THREE.MathUtils.clamp(
      duomo?.centroid_local[1] ?? (minZ + maxZ) / 2,
      minZ + 8,
      maxZ - 8,
    );
    return {
      x: fallbackX,
      z: fallbackZ,
      heading: duomo ? Math.atan2(
        duomo.centroid_local[0] - fallbackX,
        duomo.centroid_local[1] - fallbackZ,
      ) : 0,
    };
  }
}
