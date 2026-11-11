import * as THREE from 'three';
import { createMoon, createSkyDome, createStars } from '../environments/props';

export interface SkyOptions {
  top: number;
  horizon: number;
  bottom: number;
  stars?: number;
  starSeed?: number;
  moon?: {
    position: [number, number, number];
    radius?: number;
  };
  starOpacity?: number;
}

export class Sky {
  readonly group = new THREE.Group();
  readonly dome: THREE.Mesh;
  readonly stars: THREE.Points | null;
  readonly moon: THREE.Group | null;

  constructor(options: SkyOptions) {
    this.group.name = 'sky';
    this.dome = createSkyDome(options.top, options.horizon, options.bottom);
    this.group.add(this.dome);

    this.stars =
      options.stars && options.stars > 0
        ? createStars(options.stars, options.starSeed ?? 7)
        : null;
    if (this.stars) {
      const material = this.stars.material as THREE.PointsMaterial;
      material.opacity = options.starOpacity ?? 0.8;
      this.group.add(this.stars);
    }

    this.moon = options.moon
      ? createMoon(new THREE.Vector3(...options.moon.position), options.moon.radius ?? 2.4)
      : null;
    if (this.moon) this.group.add(this.moon);
  }

  update(time: number): void {
    if (this.stars) {
      this.stars.rotation.y = time * 0.0018;
      this.stars.rotation.x = Math.sin(time * 0.02) * 0.005;
    }
    if (this.moon) {
      this.moon.position.y += Math.sin(time * 0.08) * 0.00001;
    }
  }
}
