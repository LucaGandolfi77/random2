import * as THREE from 'three';
import type { Materials } from '../renderer/ProceduralAssets';
import type { World } from '../world/Interactable';
import { NavigationSystem } from './NavigationSystem';

export type ShadowType = 'watcher' | 'crawler' | 'tall' | 'mimic';
export type ShadowState = 'stalk' | 'approach' | 'investigate' | 'hunt' | 'ambush' | 'attack';

export interface ShadowContext {
  time: number;
  threat: number;
  playerPos: THREE.Vector3;
  playerYaw: number;
  flashlight: boolean;
  lightNear: boolean;
  world: World;
  nav: NavigationSystem;
  difficultySpeed: number;
}

const SPECS: Record<ShadowType, { height: number; speed: number; eyes: boolean; color: number }> = {
  watcher: { height: 2.1, speed: 0.85, eyes: true, color: 0x030406 },
  crawler: { height: 0.95, speed: 1.9, eyes: true, color: 0x050507 },
  tall: { height: 2.85, speed: 0.7, eyes: false, color: 0x020203 },
  mimic: { height: 1.75, speed: 1.25, eyes: true, color: 0x060508 }
};

export class Shadow {
  readonly group = new THREE.Group();
  readonly type: ShadowType;
  state: ShadowState = 'stalk';
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;
  private legL: THREE.Mesh;
  private legR: THREE.Mesh;
  private eyes: THREE.Group;
  private target = new THREE.Vector3();
  private path: number[] = [];
  private repath = 0;
  private losTimer = 0;
  private hasLOS = false;
  private phase = Math.random() * 10;
  private frozen = 0;
  private baseSpeed: number;
  private height: number;

  constructor(type: ShadowType, position: THREE.Vector3, materials: Materials) {
    this.type = type;
    const spec = SPECS[type];
    this.baseSpeed = spec.speed;
    this.height = spec.height;
    const mat = materials.shadow.clone();
    mat.color.setHex(spec.color);

    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.3, spec.height * 0.55, 7), mat);
    this.torso.position.y = spec.height * 0.52;
    this.torso.scale.x = type === 'tall' ? 0.65 : 1;
    this.group.add(this.torso);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(type === 'tall' ? 0.11 : 0.16, 9, 7), mat);
    this.head.position.y = spec.height * 0.86;
    this.head.scale.set(0.78, 1.25, 0.7);
    this.group.add(this.head);

    const limb = (r: number, len: number) => new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 6), mat);
    this.armL = limb(0.055, spec.height * 0.5);
    this.armR = limb(0.055, spec.height * 0.5);
    this.armL.position.set(-0.24, spec.height * 0.55, 0);
    this.armR.position.set(0.24, spec.height * 0.55, 0);
    if (type === 'tall') { this.armL.scale.y = 1.6; this.armR.scale.y = 1.6; }
    this.group.add(this.armL, this.armR);

    this.legL = limb(0.07, spec.height * 0.45);
    this.legR = limb(0.07, spec.height * 0.45);
    this.legL.position.set(-0.11, spec.height * 0.24, 0);
    this.legR.position.set(0.11, spec.height * 0.24, 0);
    this.group.add(this.legL, this.legR);

    this.eyes = new THREE.Group();
    for (const x of [-0.055, 0.055]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), materials.eye);
      eye.position.set(x, spec.height * 0.88, 0.13);
      this.eyes.add(eye);
    }
    this.eyes.visible = false;
    this.group.add(this.eyes);

    this.group.position.copy(position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  update(dt: number, ctx: ShadowContext): { distance: number; captured: boolean } {
    const threat = ctx.threat;
    const dist = this.group.position.distanceTo(ctx.playerPos);

    // stalking shapes disappear when stared at directly
    if (this.state === 'stalk' && threat < 45) {
      const toPlayer = new THREE.Vector3().subVectors(ctx.playerPos, this.group.position).setY(0).normalize();
      const facing = new THREE.Vector3(-Math.sin(ctx.playerYaw), 0, -Math.cos(ctx.playerYaw));
      const looking = facing.dot(toPlayer) > 0.9 && ctx.flashlight;
      this.group.visible = !(looking && Math.sin(ctx.time * 7 + this.phase) > -0.3);
    } else {
      this.group.visible = true;
    }

    // eyes only glow when it is close or hunting
    this.eyes.visible = SPECS[this.type].eyes && (threat > 55 || dist < 5) && this.group.visible;
    if (this.eyes.visible) {
      const s = 1 + Math.sin(ctx.time * 9 + this.phase) * 0.18;
      this.eyes.scale.setScalar(s);
    }

    // state selection
    if (threat >= 80) this.state = 'hunt';
    else if (threat >= 60) this.state = 'hunt';
    else if (threat >= 40) this.state = ctx.lightNear && Math.random() < 0.02 ? 'investigate' : 'approach';
    else this.state = 'stalk';
    if (this.type === 'mimic' && threat > 45 && dist < 7) this.state = 'ambush';
    if (dist < 1.8) this.state = 'attack';

    // flashlight freezes most archetypes briefly
    if (ctx.flashlight && this.type !== 'tall' && this.hasLOS && dist < 9) this.frozen = 0.6;
    this.frozen = Math.max(0, this.frozen - dt);

    // line of sight, throttled
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = 0.28 + Math.random() * 0.15;
      this.hasLOS = this.checkLOS(ctx.playerPos, ctx.world.colliders);
    }

    if (this.frozen <= 0 && this.state !== 'stalk') {
      const speed = this.baseSpeed * ctx.difficultySpeed * (this.state === 'hunt' ? 1.35 : this.state === 'ambush' ? 1.5 : 0.72);
      const goal = this.chooseGoal(ctx, dt);
      const dir = new THREE.Vector3().subVectors(goal, this.group.position).setY(0);
      if (dir.lengthSq() > 0.05) {
        dir.normalize();
        this.group.position.addScaledVector(dir, speed * dt);
        const wanted = Math.atan2(-dir.x, -dir.z);
        this.group.rotation.y = this.lerpAngle(this.group.rotation.y, wanted, Math.min(1, dt * 3));
      }
      // respect static colliders (simple push-out)
      for (const b of ctx.world.colliders) {
        if (!b.containsPoint(this.group.position)) continue;
        const c = b.getCenter(new THREE.Vector3());
        const out = new THREE.Vector3().subVectors(this.group.position, c).setY(0);
        if (out.lengthSq() < 0.001) out.set(1, 0, 0);
        this.group.position.addScaledVector(out.normalize(), dt * 2.4);
      }
      this.group.position.y = 0;
    }

    // animation: unnatural sway and breathing distortion
    const t = ctx.time * (this.state === 'hunt' ? 6 : 2.4) + this.phase;
    this.torso.scale.y = 1 + Math.sin(t) * 0.045;
    this.torso.rotation.z = Math.sin(t * 0.6) * 0.06;
    this.armL.rotation.x = Math.sin(t * 0.9) * 0.3;
    this.armR.rotation.x = -Math.sin(t * 0.9 + 0.5) * 0.3;
    this.legL.rotation.x = Math.sin(t * 1.2) * 0.22;
    this.legR.rotation.x = -Math.sin(t * 1.2) * 0.22;
    this.head.rotation.y = Math.sin(t * 0.4) * 0.3;

    return { distance: dist, captured: dist < 1.25 && threat >= 60 && this.group.visible };
  }

  private chooseGoal(ctx: ShadowContext, dt: number): THREE.Vector3 {
    const dist = this.group.position.distanceTo(ctx.playerPos);
    if (this.hasLOS && dist < 12) { this.target.copy(ctx.playerPos); return this.target; }
    this.repath -= dt;
    const from = ctx.nav.nearest(this.group.position);
    const to = ctx.nav.nearest(ctx.playerPos);
    if (this.repath <= 0 || this.path.length === 0) {
      this.repath = 1.2 + Math.random();
      this.path = ctx.nav.route(from, to);
    }
    while (this.path.length > 1 && this.group.position.distanceTo(ctx.nav.node(this.path[0])) < 1.1) this.path.shift();
    return ctx.nav.node(this.path[0] ?? to);
  }

  private checkLOS(target: THREE.Vector3, colliders: THREE.Box3[]): boolean {
    const origin = this.group.position.clone().setY(1.5);
    const dir = new THREE.Vector3().subVectors(target, origin);
    const len = dir.length();
    dir.normalize();
    const ray = new THREE.Ray(origin, dir);
    for (const b of colliders) {
      const hit = ray.intersectBox(b, new THREE.Vector3());
      if (hit && origin.distanceTo(hit) < len - 0.3) return false;
    }
    return true;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  get scaleHeight() { return this.height; }
}
