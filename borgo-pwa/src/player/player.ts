import * as THREE from 'three';
import type { Collider } from '../data/colliders';
import type { WorldBounds } from '../data/types';
import { moveAndCollide } from './collision';
import { animateIdle, animateWalk, createBlobShadow, createPerson, type PersonRig } from '../world/person';

const WALK_SPEED = 3.15;
const RUN_SPEED = 5.45;
const ACCELERATION = 13;
const JUMP_SPEED = 5.1;
const GRAVITY = 16.5;
const PLAYER_RADIUS = 0.34;

export class Player {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly rig: PersonRig;
  readonly group: THREE.Group;
  readonly shadow: THREE.Mesh;
  radius = PLAYER_RADIUS;
  verticalVelocity = 0;
  grounded = true;
  facing: number;
  speed = 0;
  private walkPhase = 0;
  private idleTime = 0;

  constructor(scene: THREE.Scene, x: number, z: number, facing: number) {
    this.rig = createPerson('player');
    this.group = this.rig.group;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = facing;
    this.facing = facing;
    this.position.set(x, 0, z);
    scene.add(this.group);

    this.shadow = createBlobShadow(1.05);
    this.shadow.position.set(x, 0.03, z);
    scene.add(this.shadow);
  }

  jump(): void {
    if (!this.grounded) return;
    this.verticalVelocity = JUMP_SPEED;
    this.grounded = false;
  }

  teleport(x: number, z: number, facing: number): void {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.grounded = true;
    this.facing = facing;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = facing;
    this.shadow.position.set(x, 0.03, z);
  }

  update(
    dt: number,
    axis: { x: number; z: number },
    run: boolean,
    cameraYaw: number,
    colliders: Collider[],
    bounds: WorldBounds
  ): void {
    let ax = axis.x;
    let az = axis.z;
    const magnitude = Math.hypot(ax, az);
    if (magnitude > 1) {
      ax /= magnitude;
      az /= magnitude;
    }

    const forwardX = -Math.sin(cameraYaw);
    const forwardZ = -Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw);
    const rightZ = -Math.sin(cameraYaw);
    const maxSpeed = run ? RUN_SPEED : WALK_SPEED;

    const targetX = (rightX * ax + forwardX * az) * maxSpeed;
    const targetZ = (rightZ * ax + forwardZ * az) * maxSpeed;
    const blend = Math.min(1, ACCELERATION * dt);
    this.velocity.x += (targetX - this.velocity.x) * blend;
    this.velocity.z += (targetZ - this.velocity.z) * blend;

    const speedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
    this.speed = Math.sqrt(speedSq);

    const dx = this.velocity.x * dt;
    const dz = this.velocity.z * dt;
    const stepLength = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(stepLength / 0.16));

    for (let i = 0; i < steps; i++) {
      const moved = moveAndCollide(
        this.position,
        { x: dx / steps, z: dz / steps },
        this.radius,
        colliders,
        bounds
      );
      this.position.x = moved.x;
      this.position.z = moved.z;
      if (moved.collided) {
        this.velocity.multiplyScalar(0.72);
      }
    }

    if (!this.grounded) {
      this.verticalVelocity -= GRAVITY * dt;
      this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    if (this.speed > 0.16) {
      const targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
      let delta = targetFacing - this.facing;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.facing += delta * Math.min(1, dt * 11);
    }

    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.facing;

    this.shadow.position.set(this.position.x, 0.03, this.position.z);
    const air = Math.min(1, Math.max(0, this.position.y / 1.4));
    this.shadow.scale.setScalar(1 - air * 0.35);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - air * 0.5);

    if (this.grounded && this.speed > 0.2) {
      this.walkPhase += dt * (5.2 + this.speed * 1.25);
      const ratio = Math.min(1, this.speed / RUN_SPEED);
      animateWalk(this.rig, this.walkPhase, 0.45 + ratio * 0.75);
    } else if (!this.grounded) {
      this.rig.leftLeg.rotation.x = 0.35;
      this.rig.rightLeg.rotation.x = -0.2;
      this.rig.leftArm.rotation.x = -0.5;
      this.rig.rightArm.rotation.x = -0.5;
      this.rig.body.position.y = 0;
    } else {
      this.idleTime += dt;
      animateIdle(this.rig, this.idleTime);
    }
  }
}
