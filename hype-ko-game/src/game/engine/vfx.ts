import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Mesh,
  type Scene
} from '@babylonjs/core';
import type { ProjectileState, ZoneState } from '../combat/types';

function color(hex: string): Color3 {
  try {
    return Color3.FromHexString(hex);
  } catch {
    return Color3.White();
  }
}

interface Spark {
  mesh: Mesh;
  material: StandardMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  velocity: Vector3;
  gravity: number;
  spin: Vector3;
}

interface Ring {
  mesh: Mesh;
  material: StandardMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  ground: boolean;
}

interface ProjectileVisual {
  mesh: Mesh;
  material: StandardMaterial;
}

interface ZoneVisual {
  mesh: Mesh;
  material: StandardMaterial;
  baseRadius: number;
}

export class VFXManager {
  private readonly scene: Scene;
  private readonly root: TransformNode;
  private readonly sparks: Spark[] = [];
  private readonly rings: Ring[] = [];
  private readonly projectiles = new Map<number, ProjectileVisual>();
  private readonly zones = new Map<number, ZoneVisual>();
  private elapsed = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    this.root = new TransformNode('vfxRoot', scene);
  }

  private getSpark(): Spark {
    const available = this.sparks.find((spark) => !spark.active);
    if (available) return available;
    const material = new StandardMaterial(`sparkMat_${this.sparks.length}`, this.scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.White();
    const mesh = MeshBuilder.CreateBox(`spark_${this.sparks.length}`, { size: 0.07 }, this.scene);
    mesh.material = material;
    mesh.parent = this.root;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    const spark: Spark = {
      mesh,
      material,
      active: false,
      life: 0,
      maxLife: 1,
      velocity: Vector3.Zero(),
      gravity: 0,
      spin: Vector3.Zero()
    };
    this.sparks.push(spark);
    return spark;
  }

  private getRing(): Ring {
    const available = this.rings.find((ring) => !ring.active);
    if (available) return available;
    const material = new StandardMaterial(`ringMat_${this.rings.length}`, this.scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.White();
    material.alpha = 0.8;
    material.backFaceCulling = false;
    const mesh = MeshBuilder.CreateTorus(`ring_${this.rings.length}`, { diameter: 1, thickness: 0.035, tessellation: 32 }, this.scene);
    mesh.material = material;
    mesh.parent = this.root;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    const ring: Ring = {
      mesh,
      material,
      active: false,
      life: 0,
      maxLife: 1,
      startScale: 0.5,
      endScale: 2,
      ground: false
    };
    this.rings.push(ring);
    return ring;
  }

  burst(x: number, y: number, hex: string, power = 1, heavy = false): void {
    const count = Math.round((heavy ? 12 : 7) * power);
    for (let i = 0; i < count; i++) {
      const spark = this.getSpark();
      spark.active = true;
      spark.life = 0.25 + Math.random() * 0.3;
      spark.maxLife = spark.life;
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.04 + Math.random() * 0.09) * (heavy ? 1.5 : 1);
      spark.velocity = new Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed + 0.03, (Math.random() - 0.5) * 0.02);
      spark.gravity = 0.0022;
      spark.spin = new Vector3(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
      spark.mesh.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, 0.1);
      spark.mesh.rotation.set(Math.random(), Math.random(), Math.random());
      spark.mesh.scaling.setAll(0.6 + Math.random() * 0.8);
      spark.mesh.setEnabled(true);
      spark.material.emissiveColor = color(hex);
      spark.material.diffuseColor = color(hex);
      spark.material.alpha = 1;
    }
    this.ring(x, y, hex, 0.35, 1.1 + power * 0.3, false);
    if (heavy) this.ring(x, y, hex, 0.5, 1.8, false);
  }

  ring(x: number, y: number, hex: string, startScale: number, endScale: number, ground: boolean): void {
    const ring = this.getRing();
    ring.active = true;
    ring.life = 0.32;
    ring.maxLife = 0.32;
    ring.startScale = startScale;
    ring.endScale = endScale;
    ring.ground = ground;
    ring.mesh.position.set(x, ground ? 0.04 : y, ground ? 0 : 0.1);
    ring.mesh.rotation.set(ground ? Math.PI / 2 : 0, 0, 0);
    ring.mesh.scaling.setAll(startScale);
    ring.mesh.setEnabled(true);
    ring.material.emissiveColor = color(hex);
    ring.material.diffuseColor = color(hex);
    ring.material.alpha = 0.9;
  }

  superBurst(x: number, y: number, hex: string): void {
    this.burst(x, y, hex, 2.2, true);
    this.ring(x, 0.05, hex, 1, 4.5, true);
    for (let i = 0; i < 5; i++) {
      this.ring(x, y, hex, 0.4 + i * 0.2, 2 + i * 0.4, false);
    }
  }

  spawnExplosion(x: number, y: number, hex: string): void {
    this.burst(x, y, hex, 2.5, true);
    this.ring(x, 0.05, hex, 0.8, 4.2, true);
  }

  private createProjectileMesh(projectile: ProjectileState): Mesh {
    let mesh: Mesh;
    const size = Math.max(0.16, projectile.radius * 2);
    switch (projectile.vfx) {
      case 'piano':
        mesh = MeshBuilder.CreateBox('vfxPiano', { width: size * 2.4, height: size * 1.1, depth: size * 1.2 }, this.scene);
        break;
      case 'note':
      case 'shadowNote':
      case 'emote':
        mesh = MeshBuilder.CreateSphere('vfxNote', { diameter: size, segments: 10 }, this.scene);
        break;
      case 'giantBox':
        mesh = MeshBuilder.CreateBox('vfxBox', { width: size * 2.2, height: size * 2.2, depth: size * 2.2 }, this.scene);
        break;
      case 'server':
        mesh = MeshBuilder.CreateBox('vfxServer', { width: size * 1.5, height: size * 2, depth: size * 1.2 }, this.scene);
        break;
      case 'product':
        mesh = MeshBuilder.CreateBox('vfxProduct', { width: size * 1.3, height: size * 1.3, depth: size * 1.3 }, this.scene);
        break;
      case 'clave':
        mesh = MeshBuilder.CreateCylinder('vfxClave', { diameter: size, height: size * 2.4, tessellation: 8 }, this.scene);
        mesh.rotation.z = Math.PI / 2;
        break;
      default:
        mesh = MeshBuilder.CreateBox('vfxProjectile', { width: size, height: size, depth: size }, this.scene);
        break;
    }
    const material = new StandardMaterial(`projectileMat_${projectile.id}`, this.scene);
    material.disableLighting = true;
    material.emissiveColor = color(projectile.color);
    material.diffuseColor = color(projectile.color);
    material.alpha = 0.95;
    mesh.material = material;
    mesh.parent = this.root;
    mesh.isPickable = false;
    return mesh;
  }

  syncProjectiles(projectiles: ProjectileState[]): void {
    const live = new Set<number>();
    for (const projectile of projectiles) {
      live.add(projectile.id);
      let visual = this.projectiles.get(projectile.id);
      if (!visual) {
        const mesh = this.createProjectileMesh(projectile);
        visual = { mesh, material: mesh.material as StandardMaterial };
        this.projectiles.set(projectile.id, visual);
      }
      visual.mesh.position.set(projectile.x, projectile.y, 0.05);
      visual.mesh.rotation.y += 0.12;
      if (projectile.vfx === 'note' || projectile.vfx === 'shadowNote' || projectile.vfx === 'emote') {
        visual.mesh.position.y += Math.sin(this.elapsed * 6 + projectile.id) * 0.05;
      }
    }
    for (const [id, visual] of this.projectiles) {
      if (!live.has(id)) {
        visual.mesh.dispose();
        visual.material.dispose();
        this.projectiles.delete(id);
      }
    }
  }

  syncZones(zones: ZoneState[]): void {
    const live = new Set<number>();
    for (const zone of zones) {
      live.add(zone.id);
      let visual = this.zones.get(zone.id);
      if (!visual) {
        const material = new StandardMaterial(`zoneMat_${zone.id}`, this.scene);
        material.disableLighting = true;
        material.emissiveColor = color(zone.color);
        material.diffuseColor = color(zone.color);
        material.alpha = 0.2;
        material.backFaceCulling = false;
        const mesh = MeshBuilder.CreateDisc('vfxZone', { radius: zone.radius, tessellation: 40 }, this.scene);
        mesh.material = material;
        mesh.parent = this.root;
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = 0.03;
        mesh.isPickable = false;
        visual = { mesh, material, baseRadius: zone.radius };
        this.zones.set(zone.id, visual);
      }
      const pulse = 1 + Math.sin(this.elapsed * 4 + zone.id) * 0.06;
      visual.mesh.scaling.setAll(pulse);
      visual.mesh.position.x = zone.x;
      visual.material.alpha = 0.14 + Math.sin(this.elapsed * 3 + zone.id) * 0.05;
    }
    for (const [id, visual] of this.zones) {
      if (!live.has(id)) {
        visual.mesh.dispose();
        visual.material.dispose();
        this.zones.delete(id);
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    for (const spark of this.sparks) {
      if (!spark.active) continue;
      spark.life -= dt;
      if (spark.life <= 0) {
        spark.active = false;
        spark.mesh.setEnabled(false);
        continue;
      }
      spark.velocity.y -= spark.gravity;
      spark.mesh.position.addInPlace(spark.velocity);
      spark.mesh.rotation.x += spark.spin.x;
      spark.mesh.rotation.y += spark.spin.y;
      spark.mesh.rotation.z += spark.spin.z;
      const t = spark.life / spark.maxLife;
      spark.material.alpha = Math.max(0, t);
      spark.mesh.scaling.setAll(Math.max(0.1, t * 1.1));
    }
    for (const ring of this.rings) {
      if (!ring.active) continue;
      ring.life -= dt;
      if (ring.life <= 0) {
        ring.active = false;
        ring.mesh.setEnabled(false);
        continue;
      }
      const t = 1 - ring.life / ring.maxLife;
      const scale = ring.startScale + (ring.endScale - ring.startScale) * t;
      ring.mesh.scaling.setAll(scale);
      ring.material.alpha = Math.max(0, (1 - t) * 0.9);
    }
  }

  dispose(): void {
    for (const spark of this.sparks) {
      spark.mesh.dispose();
      spark.material.dispose();
    }
    for (const ring of this.rings) {
      ring.mesh.dispose();
      ring.material.dispose();
    }
    for (const visual of this.projectiles.values()) {
      visual.mesh.dispose();
      visual.material.dispose();
    }
    for (const visual of this.zones.values()) {
      visual.mesh.dispose();
      visual.material.dispose();
    }
    this.projectiles.clear();
    this.zones.clear();
    this.root.dispose();
    void this.scene;
  }
}
