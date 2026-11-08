import * as THREE from 'three';
import type { Simulation } from '../core/engine/Simulation';
import type { Fighter } from '../fighters/Fighter';

class Pool {
  readonly group = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  private cursor = 0;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  begin(): void {
    this.cursor = 0;
    for (const mesh of this.meshes) mesh.visible = false;
  }

  add(x: number, y: number, scaleX: number, scaleY: number, scaleZ = 1): void {
    if (this.cursor >= this.meshes.length) return;
    const mesh = this.meshes[this.cursor++];
    mesh.visible = true;
    mesh.position.set(x, y, 0.35);
    mesh.scale.set(scaleX, scaleY, scaleZ);
  }
}

export class HitboxDebugView {
  readonly group = new THREE.Group();
  private readonly hurtboxes: Pool;
  private readonly hitboxes: Pool;
  private readonly grabboxes: Pool;
  private readonly shields: Pool;
  private readonly platforms: Pool;

  constructor() {
    const hurt = new THREE.MeshBasicMaterial({ color: 0x27ff7c, wireframe: true, transparent: true, opacity: 0.8 });
    const hit = new THREE.MeshBasicMaterial({ color: 0xff2d3d, wireframe: true, transparent: true, opacity: 0.9 });
    const grab = new THREE.MeshBasicMaterial({ color: 0xff8c42, wireframe: true, transparent: true, opacity: 0.9 });
    const shield = new THREE.MeshBasicMaterial({ color: 0x45b7ff, wireframe: true, transparent: true, opacity: 0.75 });
    const platform = new THREE.MeshBasicMaterial({ color: 0xffd319, wireframe: true, transparent: true, opacity: 0.35 });
    this.hurtboxes = new Pool(new THREE.BoxGeometry(1, 1, 1), hurt, 4);
    this.hitboxes = new Pool(new THREE.SphereGeometry(1, 8, 6), hit, 48);
    this.grabboxes = new Pool(new THREE.SphereGeometry(1, 8, 6), grab, 8);
    this.shields = new Pool(new THREE.SphereGeometry(1, 10, 8), shield, 4);
    this.platforms = new Pool(new THREE.BoxGeometry(1, 1, 1), platform, 12);
    this.group.add(this.hurtboxes.group, this.hitboxes.group, this.grabboxes.group, this.shields.group, this.platforms.group);
  }

  update(sim: Simulation, enabled: boolean): void {
    this.group.visible = enabled;
    if (!enabled) return;
    this.hurtboxes.begin();
    this.hitboxes.begin();
    this.grabboxes.begin();
    this.shields.begin();
    this.platforms.begin();

    for (const platform of sim.platforms) {
      this.platforms.add(platform.curX, platform.curY - platform.height / 2, platform.width, Math.max(0.15, platform.height), 1.4);
    }

    for (const fighter of sim.fighters) {
      if (fighter.eliminated || fighter.state === 'dead') continue;
      this.hurtboxes.add(fighter.pos.x, fighter.pos.y + fighter.stats.height / 2, fighter.stats.width, fighter.stats.height);
      if (fighter.isShielding) {
        const radius = fighter.stats.height * 0.62 * (0.7 + (fighter.shieldHP / 100) * 0.45);
        this.shields.add(fighter.pos.x, fighter.pos.y + fighter.stats.height * 0.5, radius, radius * 1.05, radius);
      }
      this.addAttackBoxes(fighter);
    }
  }

  private addAttackBoxes(fighter: Fighter): void {
    const current = fighter.currentMove;
    if (!current) return;
    const frame = current.frame;
    for (const hitbox of current.move.hits) {
      if (frame < hitbox.start || frame > hitbox.end) continue;
      this.hitboxes.add(
        fighter.pos.x + hitbox.offsetX * fighter.facing,
        fighter.pos.y + hitbox.offsetY,
        hitbox.radius,
        hitbox.radius,
        hitbox.radius,
      );
    }
    const grabbox = current.move.grabbox;
    if (grabbox && frame >= grabbox.start && frame <= grabbox.end) {
      this.grabboxes.add(
        fighter.pos.x + grabbox.offsetX * fighter.facing,
        fighter.pos.y + grabbox.offsetY,
        grabbox.radius,
        grabbox.radius,
        grabbox.radius,
      );
    }
  }

  dispose(): void {
    for (const pool of [this.hurtboxes, this.hitboxes, this.grabboxes, this.shields, this.platforms]) {
      for (const mesh of pool.meshes) {
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material;
        material.dispose();
      }
    }
  }
}
