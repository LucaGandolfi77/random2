import * as THREE from 'three';
import type { CollisionWorld } from '../data/colliders';
import type { WorldBounds } from '../data/types';
import { createFlightMotion, stepFlight, type FlightMotion } from '../game/travel';
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
  flying = false;
  facing: number;
  speed = 0;
  private walkPhase = 0;
  private idleTime = 0;
  private flightTime = 0;
  private flightMotion: FlightMotion;
  private readonly jetpack: THREE.Group;
  private readonly flames: THREE.Mesh[] = [];

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

    this.flightMotion = createFlightMotion(x, z);
    this.jetpack = createJetpack();
    this.jetpack.visible = false;
    this.rig.body.add(this.jetpack);
    this.jetpack.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === 'flame') this.flames.push(object);
    });
  }

  jump(): void {
    if (!this.grounded || this.flying) return;
    this.verticalVelocity = JUMP_SPEED;
    this.grounded = false;
  }

  setFlying(on: boolean): void {
    this.flying = on;
    this.jetpack.visible = on;
    this.grounded = !on;
    this.verticalVelocity = 0;
    this.velocity.set(0, 0, 0);
    if (on) {
      this.flightMotion.x = this.position.x;
      this.flightMotion.z = this.position.z;
      this.flightMotion.y = Math.max(1.35, this.position.y);
      this.flightMotion.vx = 0;
      this.flightMotion.vy = 0;
      this.flightMotion.vz = 0;
      this.position.y = this.flightMotion.y;
      this.rig.body.rotation.x = 0.16;
    } else {
      this.position.y = 0;
      this.rig.body.rotation.x = 0;
    }
  }

  /** Camera-relative jetpack movement. Buildings are ignored on purpose. */
  updateFlight(
    dt: number,
    axis: { x: number; z: number },
    vertical: number,
    cameraYaw: number,
    bounds: WorldBounds
  ): void {
    this.flightMotion.x = this.position.x;
    this.flightMotion.z = this.position.z;
    this.flightMotion.y = this.position.y;
    stepFlight(this.flightMotion, { x: axis.x, z: axis.z, vertical }, cameraYaw, dt, bounds);
    this.position.set(this.flightMotion.x, this.flightMotion.y, this.flightMotion.z);
    this.speed = Math.hypot(this.flightMotion.vx, this.flightMotion.vz);

    if (this.speed > 0.25) {
      const targetFacing = Math.atan2(this.flightMotion.vx, this.flightMotion.vz);
      let delta = targetFacing - this.facing;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.facing += delta * Math.min(1, dt * 5);
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.facing;
    this.shadow.position.set(this.position.x, 0.03, this.position.z);
    const air = THREE.MathUtils.clamp((this.position.y - 1.2) / 32, 0, 1);
    this.shadow.scale.setScalar(1.05 + air * 0.35);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - air * 0.82);

    this.flightTime += dt;
    const sway = Math.sin(this.flightTime * 7.5);
    this.rig.leftLeg.rotation.x = 0.38 + sway * 0.04;
    this.rig.rightLeg.rotation.x = 0.24 - sway * 0.04;
    this.rig.leftArm.rotation.x = -0.55 + sway * 0.05;
    this.rig.rightArm.rotation.x = -0.55 - sway * 0.05;
    this.rig.body.position.y = 0;
    const thrust = Math.abs(vertical) > 0.05 ? 1 : 0.45;
    for (const flame of this.flames) {
      flame.scale.set(1, thrust * (0.8 + Math.abs(sway) * 0.25), 1);
    }
  }

  teleport(x: number, z: number, facing: number): void {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.grounded = true;
    this.flying = false;
    this.jetpack.visible = false;
    this.rig.body.rotation.x = 0;
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
    world: CollisionWorld
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
        world
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

function createJetpack(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 1.35, -0.26);
  const shell = new THREE.MeshLambertMaterial({ color: 0x6b6a58, flatShading: true });
  const trim = new THREE.MeshLambertMaterial({ color: 0xd9a441, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3d3a31, flatShading: true });
  for (const x of [-0.2, 0.2]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.62, 6), shell);
    tank.position.set(x, 0.05, 0);
    group.add(tank);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 6), trim);
    band.position.set(x, 0.28, 0);
    group.add(band);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.18, 6), dark);
    nozzle.position.set(x, -0.34, 0);
    group.add(nozzle);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.5, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffc45d,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    flame.name = 'flame';
    flame.position.set(x, -0.68, 0);
    flame.rotation.x = Math.PI;
    group.add(flame);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.08), shell);
  plate.position.set(0, 0.06, 0.02);
  group.add(plate);
  return group;
}
