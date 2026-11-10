import * as THREE from 'three';
import type { CollisionWorld } from '../player/collision';
import type { PlayerFrameInput } from '../player/controller';

/**
 * Free-flying photo camera. Starts exactly at the current view, then ignores
 * the player and lets the user compose city shots.
 */
export class PhotoCamera {
  private readonly position = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private fov = 52;

  enter(camera: THREE.PerspectiveCamera): void {
    this.position.copy(camera.position);
    const direction = camera.getWorldDirection(new THREE.Vector3());
    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    world: CollisionWorld,
    input: PlayerFrameInput,
  ): void {
    const step = Math.min(dt, 0.05);
    if (input.look.lengthSq() > 0.000001) {
      this.yaw -= input.look.x * 0.0035;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - input.look.y * 0.0035,
        -1.35,
        1.35,
      );
    }
    if (Math.abs(input.zoom) > 0.0001) {
      this.fov = THREE.MathUtils.clamp(this.fov + input.zoom * 0.025, 18, 80);
    }

    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    let moveX = forwardX * input.move.y + rightX * input.move.x;
    let moveZ = forwardZ * input.move.y + rightZ * input.move.x;
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }
    const speed = input.run ? 18 : 7;
    this.position.x += moveX * speed * step;
    this.position.z += moveZ * speed * step;
    const vertical = (input.jumpHeld ? 1 : 0) - (input.descend ? 1 : 0);
    this.position.y += vertical * 6.5 * step;
    const ground = world.groundHeight(this.position.x, this.position.z) + 0.45;
    if (this.position.y < ground) this.position.y = ground;
    if (this.position.y > 1200) this.position.y = 1200;

    if (camera.fov !== this.fov) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(this.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(this.pitch, this.yaw, 0);
  }

  setFov(fov: number): void {
    this.fov = THREE.MathUtils.clamp(fov, 18, 80);
  }

  getFov(): number {
    return this.fov;
  }
}
