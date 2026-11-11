import * as THREE from 'three';
import type { CameraShotData, EaseName, VecSpec } from '../data/types';
import type { BaseEnvironment } from '../environments/BaseEnvironment';
import type { MenuCamera } from '../environments/BaseEnvironment';
import { clamp01, easeInOutCubic, easeInOutSine, easeOutCubic, smoothstep } from '../utils/math';

function easeValue(mode: EaseName | undefined, value: number): number {
  const t = clamp01(value);
  switch (mode) {
    case 'linear':
      return t;
    case 'in':
      return t * t;
    case 'out':
      return easeOutCubic(t);
    case 'inOut':
      return easeInOutCubic(t);
    case 'smooth':
    default:
      return easeInOutSine(t);
  }
}

export class CameraDirector {
  readonly camera: THREE.PerspectiveCamera;
  private readonly scratchA = new THREE.Vector3();
  private readonly scratchB = new THREE.Vector3();
  private currentFov = 40;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  applyShot(
    shot: CameraShotData,
    progress: number,
    stage: BaseEnvironment,
    time: number,
  ): void {
    const eased = easeValue(shot.ease, progress);
    const positionA = this.resolveVector(shot.position, stage, this.scratchA);
    const positionB = shot.positionTo
      ? this.resolveVector(shot.positionTo, stage, this.scratchB)
      : this.scratchB.copy(positionA);
    const targetA = this.resolveVector(shot.target, stage, new THREE.Vector3());
    const targetB = shot.targetTo
      ? this.resolveVector(shot.targetTo, stage, new THREE.Vector3())
      : targetA.clone();

    this.camera.position.copy(positionA).lerp(positionB, eased);
    const target = targetA.clone().lerp(targetB, eased);

    if (shot.shake && shot.shake > 0) {
      const shake = shot.shake;
      this.camera.position.x += Math.sin(time * 13.7) * shake;
      this.camera.position.y += Math.sin(time * 17.3 + 1.2) * shake * 0.6;
    }

    this.camera.lookAt(target);
    const fov = shot.fov ?? 40;
    if (Math.abs(fov - this.currentFov) > 0.001) {
      this.currentFov = fov;
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  applyMenu(camera: MenuCamera, time: number): void {
    const drift = Math.sin(time * 0.045) * 0.9;
    const rise = Math.sin(time * 0.03 + 1) * 0.22;
    this.camera.position.set(
      camera.position.x + drift,
      camera.position.y + rise,
      camera.position.z,
    );
    this.camera.lookAt(
      camera.target.x + Math.sin(time * 0.028) * 0.5,
      camera.target.y + Math.sin(time * 0.021) * 0.1,
      camera.target.z,
    );
    if (Math.abs(camera.fov - this.currentFov) > 0.001) {
      this.currentFov = camera.fov;
      this.camera.fov = camera.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private resolveVector(
    spec: VecSpec,
    stage: BaseEnvironment,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    if (Array.isArray(spec)) {
      return out.set(spec[0], spec[1], spec[2]);
    }

    if (typeof spec === 'string') {
      const mark = stage.getMark(spec);
      if (mark) return out.copy(mark);
      return out.set(0, 1, 0);
    }

    const actor = stage.getActor(spec.character);
    const offset = spec.offset ?? [0, 0, 0];
    if (actor) {
      return out
        .copy(actor.root.position)
        .add(new THREE.Vector3(offset[0], offset[1], offset[2]));
    }
    return out.set(offset[0], offset[1], offset[2]);
  }
}
