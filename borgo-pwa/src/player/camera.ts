import * as THREE from 'three';
import type { CollisionWorld } from '../data/colliders';
import { TITLE_VIEW } from '../data/town';
import { clearDistance } from './collision';

const MIN_PITCH = 0.12;
const MAX_PITCH = 0.95;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 10;

export class ThirdPersonCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0.3;
  distance = 7.2;
  instant = false;
  flight = false;
  private currentDistance = 7.2;
  private currentPivot = new THREE.Vector3();
  private currentPosition = new THREE.Vector3();
  private targetPivot = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private colliders: CollisionWorld;

  constructor(camera: THREE.PerspectiveCamera, colliders: CollisionWorld) {
    this.camera = camera;
    this.colliders = colliders;
  }

  look(dx: number, dy: number): void {
    this.yaw -= dx * 0.0042;
    const minPitch = this.flight ? -0.42 : MIN_PITCH;
    const maxPitch = this.flight ? 1.3 : MAX_PITCH;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0028, minPitch, maxPitch);
  }

  setFlight(on: boolean): void {
    this.flight = on;
    this.distance = on ? 9.5 : 7.2;
    if (on) this.pitch = THREE.MathUtils.clamp(this.pitch, -0.42, 1.3);
    else this.pitch = THREE.MathUtils.clamp(this.pitch, MIN_PITCH, MAX_PITCH);
  }

  zoom(delta: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance + delta * 0.005, MIN_DISTANCE, MAX_DISTANCE);
  }

  reset(yaw: number, pitch: number): void {
    this.yaw = yaw;
    const minPitch = this.flight ? -0.42 : MIN_PITCH;
    const maxPitch = this.flight ? 1.3 : MAX_PITCH;
    this.pitch = THREE.MathUtils.clamp(pitch, minPitch, maxPitch);
    this.currentDistance = this.distance;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    const pivotY = playerPosition.y + 1.5;
    this.targetPivot.set(playerPosition.x, pivotY, playerPosition.z);

    const horizontal = this.distance * Math.cos(this.pitch);
    let directionX = Math.sin(this.yaw);
    let directionZ = Math.cos(this.yaw);
    let clear = this.flight
      ? horizontal
      : clearDistance(
          { x: playerPosition.x, z: playerPosition.z },
          { x: directionX, z: directionZ },
          horizontal,
          this.colliders,
          0.42
        );

    /* In a narrow alley the boom can be swallowed by a wall. Swing it to the
       side before collapsing into the player's back. */
    const comfortable = Math.min(horizontal * 0.72, 3.4);
    if (!this.flight && clear < comfortable) {
      let bestClear = clear;
      let bestX = directionX;
      let bestZ = directionZ;
      for (const offset of [0.85, -0.85, 1.55, -1.55, 2.35, -2.35, Math.PI]) {
        const angle = this.yaw + offset;
        const candidateX = Math.sin(angle);
        const candidateZ = Math.cos(angle);
        const candidate = clearDistance(
          { x: playerPosition.x, z: playerPosition.z },
          { x: candidateX, z: candidateZ },
          horizontal,
          this.colliders,
          0.42
        );
        if (candidate > bestClear) {
          bestClear = candidate;
          bestX = candidateX;
          bestZ = candidateZ;
        }
        if (candidate >= comfortable) break;
      }
      if (bestClear > clear + 0.55) {
        clear = bestClear;
        directionX = bestX;
        directionZ = bestZ;
      }
    }

    const smoothing = this.instant ? 1 : 1 - Math.exp(-9 * dt);
    this.currentDistance += (clear - this.currentDistance) * smoothing;

    const scale = horizontal > 0.001 ? this.currentDistance / horizontal : 1;
    const height =
      this.distance * Math.sin(this.pitch) * (0.7 + 0.3 * Math.min(1, scale)) + 0.55;

    this.targetPosition.set(
      playerPosition.x + directionX * this.currentDistance,
      pivotY + height,
      playerPosition.z + directionZ * this.currentDistance
    );

    if (this.currentPivot.lengthSq() === 0 && this.currentPosition.lengthSq() === 0) {
      this.currentPivot.copy(this.targetPivot);
      this.currentPosition.copy(this.targetPosition);
    } else {
      this.currentPivot.lerp(this.targetPivot, smoothing);
      this.currentPosition.lerp(this.targetPosition, smoothing);
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentPivot.x, this.currentPivot.y + 0.95, this.currentPivot.z);
  }

  titleView(time: number): void {
    const angle = time * 0.045 + 0.4;
    this.camera.position.set(
      TITLE_VIEW.x + Math.sin(angle) * TITLE_VIEW.radius,
      TITLE_VIEW.height,
      TITLE_VIEW.z + Math.cos(angle) * TITLE_VIEW.radius
    );
    this.camera.lookAt(TITLE_VIEW.x, 2.2, TITLE_VIEW.z);
  }

  snapTo(playerPosition: THREE.Vector3): void {
    this.currentPivot.set(playerPosition.x, playerPosition.y + 1.5, playerPosition.z);
    const horizontal = this.distance * Math.cos(this.pitch);
    this.currentPosition.set(
      playerPosition.x + Math.sin(this.yaw) * horizontal,
      playerPosition.y + 1.5 + this.distance * Math.sin(this.pitch) + 0.55,
      playerPosition.z + Math.cos(this.yaw) * horizontal
    );
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentPivot.x, this.currentPivot.y + 0.95, this.currentPivot.z);
  }

  get heading(): number {
    return -this.yaw;
  }
}
