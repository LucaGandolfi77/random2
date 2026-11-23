import * as THREE from 'three';
import type { CircleCollider } from '../data/colliders';
import type { VehicleKind, VehicleSpec } from '../data/types';
import { createVehicleMotion, vehicleCollider, type VehicleMotion } from '../game/travel';
import { createBlobShadow, createPerson, type PersonRig } from './person';
import { GeoBatch, glowMaterial, staticMaterial } from './batch';

export interface VehicleSnapshotLike {
  id: string;
  x: number;
  z: number;
  heading: number;
}

export interface VehicleActor {
  spec: VehicleSpec;
  kind: VehicleKind;
  motion: VehicleMotion;
  group: THREE.Group;
  occupied: boolean;
  setPose(x: number, z: number, heading: number): void;
  syncVisual(dt: number): void;
  setRiderVisible(visible: boolean): void;
}

interface VehicleModel {
  group: THREE.Group;
  wheels: THREE.Group[];
  rider?: PersonRig;
}

export class VehicleFleet {
  readonly actors: VehicleActor[];
  private readonly obstacles: CircleCollider[] = [];

  constructor(scene: THREE.Scene, snapshots: VehicleSnapshotLike[], specs: VehicleSpec[]) {
    this.actors = specs.map((spec) => {
      const model = spec.kind === 'car' ? createCar(spec.color) : createBike(spec.color);
      const actor: VehicleActor = {
        spec,
        kind: spec.kind,
        motion: createVehicleMotion(spec.x, spec.z, spec.heading),
        group: model.group,
        occupied: false,
        setPose: (x, z, heading) => {
          actor.motion.x = x;
          actor.motion.z = z;
          actor.motion.heading = heading;
          actor.motion.speed = 0;
          actor.group.position.set(x, 0.02, z);
          actor.group.rotation.y = heading;
          actor.setRiderVisible(actor.occupied && actor.kind === 'bike');
        },
        syncVisual: (dt) => {
          actor.group.position.set(actor.motion.x, 0.02, actor.motion.z);
          actor.group.rotation.y = actor.motion.heading;
          for (const wheel of model.wheels) {
            wheel.rotation.x += (actor.motion.speed / 0.34) * dt;
          }
        },
        setRiderVisible: (visible) => {
          if (model.rider) model.rider.group.visible = visible;
        }
      };
      actor.group.position.set(spec.x, 0.02, spec.z);
      actor.group.rotation.y = spec.heading;
      scene.add(actor.group);
      return actor;
    });

    this.apply(snapshots);
    for (const actor of this.actors) this.obstacles.push(vehicleCollider(actor.motion, actor.kind));
  }

  apply(snapshots: VehicleSnapshotLike[]): void {
    const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    for (const actor of this.actors) {
      const snapshot = byId.get(actor.spec.id);
      actor.setPose(
        snapshot?.x ?? actor.spec.x,
        snapshot?.z ?? actor.spec.z,
        snapshot?.heading ?? actor.spec.heading
      );
    }
  }

  setOccupied(id: string | null): void {
    for (const actor of this.actors) {
      actor.occupied = actor.spec.id === id;
      actor.setRiderVisible(actor.occupied && actor.kind === 'bike');
    }
  }

  /** Obstacles for the walker: every parked vehicle. */
  parkedObstacles(): CircleCollider[] {
    const out: CircleCollider[] = [];
    this.actors.forEach((actor, index) => {
      if (actor.occupied) return;
      const collider = this.obstacles[index];
      collider.x = actor.motion.x;
      collider.z = actor.motion.z;
      collider.r = actor.kind === 'car' ? 1.32 : 0.62;
      out.push(collider);
    });
    return out;
  }
}

function createCar(color: number): VehicleModel {
  const group = new THREE.Group();
  const body = new GeoBatch();
  const paint = color;
  const paintDark = new THREE.Color(color).multiplyScalar(0.72).getHex();
  const glass = 0x2f3a3e;
  const trim = 0x3c3830;
  const chrome = 0xc8c0aa;

  body.box(1.78, 0.52, 3.5, 0, 0.58, 0, paint);
  body.box(1.66, 0.18, 3.38, 0, 0.31, 0, paintDark);
  body.box(1.58, 0.5, 1.78, 0, 1.02, -0.18, paint);
  body.box(1.5, 0.42, 1.2, 0, 1.06, -0.18, glass);
  body.box(1.62, 0.08, 1.6, 0, 1.3, -0.18, paintDark);
  body.box(0.62, 0.12, 0.08, -0.54, 0.7, 1.79, chrome);
  body.box(0.62, 0.12, 0.08, 0.54, 0.7, 1.79, chrome);
  body.box(1.5, 0.12, 0.16, 0, 0.36, -1.78, trim);
  body.box(1.5, 0.12, 0.16, 0, 0.36, 1.78, trim);
  const shell = body.build(staticMaterial());
  if (shell) group.add(shell);

  const headlights = new GeoBatch();
  headlights.box(0.3, 0.14, 0.05, -0.58, 0.54, 1.8, 0xfff0b8);
  headlights.box(0.3, 0.14, 0.05, 0.58, 0.54, 1.8, 0xfff0b8);
  const lamps = headlights.build(glowMaterial());
  if (lamps) group.add(lamps);
  const taillights = new GeoBatch();
  taillights.box(0.28, 0.12, 0.05, -0.6, 0.55, -1.76, 0xb84230);
  taillights.box(0.28, 0.12, 0.05, 0.6, 0.55, -1.76, 0xb84230);
  const rear = taillights.build(glowMaterial());
  if (rear) group.add(rear);

  const wheels: THREE.Group[] = [];
  for (const x of [-0.82, 0.82]) {
    for (const z of [-1.12, 1.12]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.34, z);
      const wheelBatch = new GeoBatch();
      wheelBatch.cylinder(0.34, 0.34, 0.22, 10, 0, 0, 0, trim, 0, 0, Math.PI / 2);
      wheelBatch.cylinder(0.14, 0.14, 0.24, 6, 0, 0, 0, chrome, 0, 0, Math.PI / 2);
      const wheelMesh = wheelBatch.build(staticMaterial());
      if (wheelMesh) pivot.add(wheelMesh);
      group.add(pivot);
      wheels.push(pivot);
    }
  }

  const shadow = createBlobShadow(2.4);
  shadow.position.set(0, 0.012, 0);
  group.add(shadow);
  return { group, wheels };
}

function createBike(color: number): VehicleModel {
  const group = new THREE.Group();
  const frameBatch = new GeoBatch();
  frameBatch.box(0.07, 0.07, 0.98, 0, 0.72, 0.05, color);
  frameBatch.box(0.07, 0.62, 0.07, 0, 0.49, -0.25, color);
  frameBatch.box(0.07, 0.55, 0.07, 0, 0.52, 0.37, color);
  frameBatch.box(0.07, 0.07, 0.7, 0, 0.36, -0.26, color);
  frameBatch.box(0.07, 0.07, 0.58, 0, 0.54, 0.14, color);
  frameBatch.box(0.46, 0.06, 0.07, 0, 1.01, 0.45, 0x8e8878);
  frameBatch.box(0.22, 0.07, 0.32, 0, 0.93, -0.34, 0x4a3626);
  frameBatch.box(0.06, 0.26, 0.06, 0, 0.86, -0.34, 0x8e8878);
  frameBatch.sphere(0.07, -0.22, 1.03, 0.45, 0x8e8878);
  const frame = frameBatch.build(staticMaterial());
  if (frame) group.add(frame);

  const wheels: THREE.Group[] = [];
  for (const z of [-0.62, 0.62]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.35, z);
    const wheelBatch = new GeoBatch();
    wheelBatch.cylinder(0.32, 0.32, 0.045, 14, 0, 0, 0, 0x35322b, 0, 0, Math.PI / 2);
    wheelBatch.cylinder(0.07, 0.07, 0.055, 8, 0, 0, 0, 0x8e8878, 0, 0, Math.PI / 2);
    for (let spoke = 0; spoke < 4; spoke++) {
      const spin = (spoke / 4) * Math.PI;
      wheelBatch.box(0.012, 0.56, 0.012, 0, 0, 0.03, 0x8e8878, spin);
      wheelBatch.box(0.012, 0.56, 0.012, 0, 0, -0.03, 0x8e8878, spin);
    }
    const wheelMesh = wheelBatch.build(staticMaterial());
    if (wheelMesh) pivot.add(wheelMesh);
    group.add(pivot);
    wheels.push(pivot);
  }

  const rider = createPerson('player');
  rider.group.position.set(0, -0.03, -0.02);
  rider.group.scale.setScalar(0.94);
  rider.leftLeg.rotation.x = -1.18;
  rider.rightLeg.rotation.x = -0.9;
  rider.leftArm.rotation.x = -0.78;
  rider.rightArm.rotation.x = -0.78;
  rider.body.position.y = 0.08;
  rider.group.visible = false;
  group.add(rider.group);

  const shadow = createBlobShadow(1.3);
  shadow.position.set(0, 0.012, 0);
  group.add(shadow);
  return { group, wheels, rider };
}
