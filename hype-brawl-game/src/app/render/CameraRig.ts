import * as THREE from 'three';
import type { Fighter } from '../../fighters/Fighter';
import type { StageDefinition } from '../../stages/types';
import { clamp, damp, degToRad, lerp } from '../../utils/math';

export type CameraMode = 'menu' | 'fight' | 'preview' | 'stage';

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'menu';
  private center = new THREE.Vector3(0, 3.4, 0);
  private distance = 17;
  private targetCenter = new THREE.Vector3(0, 3.4, 0);
  private targetDistance = 17;
  private shake = 0;
  private shakeSeed = 0;
  private previewX = 3.4;
  private time = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 140);
    this.camera.position.set(0, 4.2, 17);
    this.camera.lookAt(0, 3.2, 0);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode: CameraMode, snap = true): void {
    this.mode = mode;
    if (mode === 'menu') {
      this.targetCenter.set(0, 3.4, 0);
      this.targetDistance = 17;
    } else if (mode === 'preview') {
      this.targetCenter.set(this.previewX, 0.45, 0);
      this.targetDistance = 6.4;
    } else if (mode === 'stage') {
      this.targetCenter.set(0, 3.2, 0);
      this.targetDistance = 18.5;
    }
    if (snap) {
      this.center.copy(this.targetCenter);
      this.distance = this.targetDistance;
    }
  }

  setPreviewFocus(x: number): void {
    this.previewX = x;
    if (this.mode === 'preview') this.targetCenter.x = x;
  }

  addShake(amount: number): void {
    this.shake = Math.min(0.55, this.shake + amount);
    this.shakeSeed = Math.random() * 100;
  }

  update(fighters: readonly Fighter[] | null, stage: StageDefinition | null, alpha: number, dt: number): void {
    this.time += dt;
    if (this.mode === 'fight' && fighters && stage) {
      this.updateFightTarget(fighters, stage, alpha);
    } else if (this.mode === 'menu') {
      const sway = Math.sin(this.time * 0.22) * 0.8;
      this.targetCenter.set(sway, 3.5 + Math.sin(this.time * 0.35) * 0.12, 0);
      this.targetDistance = 16.5;
    } else if (this.mode === 'preview') {
      this.targetCenter.set(this.previewX + Math.sin(this.time * 0.4) * 0.15, 0.45, 0);
      this.targetDistance = 6.4;
    }

    this.center.x = damp(this.center.x, this.targetCenter.x, 4.2, dt);
    this.center.y = damp(this.center.y, this.targetCenter.y, 4.2, dt);
    this.distance = damp(this.distance, this.targetDistance, 4.0, dt);

    this.shake = Math.max(0, this.shake - dt * 1.9);
    const shakeX = this.shake > 0 ? Math.sin(this.time * 90 + this.shakeSeed) * this.shake : 0;
    const shakeY = this.shake > 0 ? Math.cos(this.time * 74 + this.shakeSeed) * this.shake * 0.7 : 0;

    const targetY = this.mode === 'preview' ? this.center.y + 0.2 : this.center.y + 0.35;
    this.camera.position.set(this.center.x + shakeX, targetY + shakeY, this.distance);
    this.camera.lookAt(this.center.x, this.center.y - (this.mode === 'preview' ? 0.1 : 0.45), 0);
  }

  private updateFightTarget(fighters: readonly Fighter[], stage: StageDefinition, alpha: number): void {
    const alive = fighters.filter((fighter) => !fighter.eliminated && fighter.state !== 'dead');
    if (alive.length === 0) {
      this.targetCenter.set(0, 3.2, 0);
      this.targetDistance = 17;
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const fighter of alive) {
      const x = lerp(fighter.prevPos.x, fighter.pos.x, alpha);
      const y = lerp(fighter.prevPos.y, fighter.pos.y, alpha);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const groundY = stage.platforms.find((platform) => platform.style === 'main')?.y ?? 0;
    minY = Math.min(minY, groundY);
    maxY = Math.max(maxY, groundY + 1.0);

    const centerX = clamp((minX + maxX) / 2, stage.cameraBounds.minX, stage.cameraBounds.maxX);
    const centerY = clamp((minY + maxY) / 2 + 1.0, stage.cameraBounds.minY, stage.cameraBounds.maxY);
    const spreadX = maxX - minX;
    const spreadY = maxY - minY;

    const fovRad = degToRad(this.camera.fov);
    const halfHeight = Math.tan(fovRad / 2);
    const needWidth = Math.max(7.6, spreadX + 6.6);
    const needHeight = Math.max(4.7, spreadY + 4.7);
    const distanceForWidth = needWidth / (2 * halfHeight * this.camera.aspect);
    const distanceForHeight = needHeight / (2 * halfHeight);
    const targetDistance = clamp(Math.max(distanceForWidth, distanceForHeight), 8.8, 21.5);

    this.targetCenter.set(centerX, centerY, 0);
    this.targetDistance = targetDistance;
  }
}
