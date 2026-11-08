import * as THREE from 'three';

interface RingEffect {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  scaleSpeed: number;
}

const COLORS: Record<string, number> = {
  punch: 0xffd319,
  kick: 0xff8c42,
  sound: 0x39f6ff,
  flash: 0xfff6d9,
  fire: 0xff5d2e,
  speed: 0x5bb8ff,
  pan: 0xffc857,
  explosion: 0xff2d3d,
  spark: 0x39f6ff,
};

export class EffectsSystem {
  readonly group = new THREE.Group();
  private readonly count = 260;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly velocities: Float32Array = new Float32Array(260 * 3);
  private readonly lives: Float32Array = new Float32Array(260);
  private readonly maxLives: Float32Array = new Float32Array(260);
  private cursor = 0;
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private readonly rings: RingEffect[] = [];

  constructor() {
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3 + 1] = -999;
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    for (let i = 0; i < 12; i++) {
      const materialRing = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 40), materialRing);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({ mesh, life: 0, maxLife: 1, scaleSpeed: 1 });
    }
  }

  spawnHit(x: number, y: number, power: number, effect: string, shielded = false): void {
    const color = shielded ? 0x45b7ff : COLORS[effect] ?? 0xffd319;
    const count = Math.min(26, 8 + Math.floor(power * 0.22));
    this.burst(x, y, color, count, 2.8 + power * 0.012, 0.5);
    this.ring(x, y, color, 0.5, 5);
  }

  spawnKO(x: number, y: number, color = 0xff2d95): void {
    this.burst(x, y, color, 42, 6.5, 0.9);
    this.burst(x, y, 0xffffff, 18, 4.5, 0.7);
    this.ring(x, y, 0xffd319, 1.4, 9);
  }

  spawnHype(x: number, y: number, color = 0xffd319): void {
    this.burst(x, y, color, 22, 3.2, 0.8);
    this.ring(x, y, color, 1.0, 7);
  }

  spawnItem(x: number, y: number, color = 0x39f6ff): void {
    this.burst(x, y, color, 12, 1.8, 0.45);
  }

  private colorToRgb(color: number, target: THREE.Color): void {
    target.setHex(color);
    target.convertSRGBToLinear();
  }

  private burst(x: number, y: number, color: number, count: number, speed: number, life: number): void {
    const rgb = new THREE.Color();
    this.colorToRgb(color, rgb);
    for (let i = 0; i < count; i++) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.9);
      this.positions[index * 3] = x;
      this.positions[index * 3 + 1] = y;
      this.positions[index * 3 + 2] = 0.55 + Math.random() * 0.25;
      this.velocities[index * 3] = Math.cos(angle) * velocity;
      this.velocities[index * 3 + 1] = Math.sin(angle) * velocity + 0.8;
      this.velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.7;
      this.lives[index] = life * (0.6 + Math.random() * 0.7);
      this.maxLives[index] = this.lives[index];
      this.colors[index * 3] = rgb.r;
      this.colors[index * 3 + 1] = rgb.g;
      this.colors[index * 3 + 2] = rgb.b;
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
  }

  private ring(x: number, y: number, color: number, life: number, speed: number): void {
    const available = this.rings.find((ring) => ring.life <= 0) ?? this.rings[0];
    available.life = life;
    available.maxLife = life;
    available.scaleSpeed = speed;
    available.mesh.visible = true;
    available.mesh.position.set(x, y, 0.8);
    available.mesh.scale.set(0.5, 0.5, 0.5);
    available.mesh.rotation.z = Math.random() * Math.PI;
    const material = available.mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(color);
    material.opacity = 0.9;
  }

  update(dt: number): void {
    const positionAttribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.count; i++) {
      if (this.lives[i] <= 0) continue;
      this.lives[i] -= dt;
      if (this.lives[i] <= 0) {
        positionAttribute.setY(i, -999);
        continue;
      }
      this.velocities[i * 3 + 1] -= dt * 4.2;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      this.velocities[i * 3] *= 1 - dt * 1.2;
      this.velocities[i * 3 + 1] *= 1 - dt * 0.6;
      const fade = Math.max(0, this.lives[i] / this.maxLives[i]);
      this.colors[i * 3] *= 1;
      this.colors[i * 3 + 1] *= 1;
      this.colors[i * 3 + 2] *= 1;
      if (fade < 0.25) {
        this.colors[i * 3] *= 0.92;
        this.colors[i * 3 + 1] *= 0.92;
        this.colors[i * 3 + 2] *= 0.92;
      }
    }
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;

    for (const ring of this.rings) {
      if (ring.life <= 0) {
        ring.mesh.visible = false;
        continue;
      }
      ring.life -= dt;
      const progress = 1 - Math.max(0, ring.life / ring.maxLife);
      const scale = 0.4 + progress * ring.scaleSpeed;
      ring.mesh.scale.set(scale, scale, scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.9;
      if (ring.life <= 0) ring.mesh.visible = false;
    }
  }

  clear(): void {
    this.lives.fill(0);
    for (let i = 0; i < this.count; i++) this.positions[i * 3 + 1] = -999;
    this.geometry.getAttribute('position').needsUpdate = true;
    for (const ring of this.rings) {
      ring.life = 0;
      ring.mesh.visible = false;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    for (const ring of this.rings) {
      ring.mesh.geometry.dispose();
      (ring.mesh.material as THREE.Material).dispose();
    }
  }
}
