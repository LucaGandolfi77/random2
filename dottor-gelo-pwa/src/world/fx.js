import * as THREE from 'three';

/*
 * Two pooled point clouds: additive for sparks and impacts, normal for
 * steam, snow and dust. No textures, no per-particle objects, no garbage.
 */
class Pool {
  constructor(scene, max, { size = 0.06, additive = false, opacity = 0.85 } = {}) {
    this.max = max;
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.velocity = new Float32Array(max * 3);
    this.gravity = new Float32Array(max);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;
    scene.add(this.points);
  }

  spawn(x, y, z, color, count = 8, opts = {}) {
    const c = new THREE.Color(color);
    const spread = opts.spread ?? 0.7;
    const up = opts.up ?? 1.4;
    const life = opts.life ?? 0.8;
    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.positions[idx * 3] = x + (Math.random() - 0.5) * spread;
      this.positions[idx * 3 + 1] = y + (Math.random() - 0.5) * spread * 0.5;
      this.positions[idx * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.velocity[idx * 3] = (Math.random() - 0.5) * (opts.speed ?? 0.7);
      this.velocity[idx * 3 + 1] = Math.random() * up;
      this.velocity[idx * 3 + 2] = (Math.random() - 0.5) * (opts.speed ?? 0.7);
      this.gravity[idx] = opts.gravity ?? -1.2;
      this.life[idx] = life;
      this.maxLife[idx] = life;
      this.colors[idx * 3] = c.r;
      this.colors[idx * 3 + 1] = c.g;
      this.colors[idx * 3 + 2] = c.b;
    }
    this.geo.setDrawRange(0, this.max);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  update(dt) {
    const pos = this.positions;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.colors[i * 3] = 0;
        this.colors[i * 3 + 1] = 0;
        this.colors[i * 3 + 2] = 0;
        continue;
      }
      alive++;
      this.velocity[i * 3 + 1] += this.gravity[i] * dt;
      pos[i * 3] += this.velocity[i * 3] * dt;
      pos[i * 3 + 1] += this.velocity[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.velocity[i * 3 + 2] * dt;
      const f = Math.max(0.1, this.life[i] / this.maxLife[i]);
      this.colors[i * 3] *= f;
      this.colors[i * 3 + 1] *= f;
      this.colors[i * 3 + 2] *= f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.points.visible = alive > 0;
  }
}

export class FX {
  constructor(scene, quality = 700) {
    this.sparks = new Pool(scene, Math.floor(quality * 0.55), { size: 0.055, additive: true, opacity: 0.9 });
    this.soft = new Pool(scene, Math.floor(quality * 0.45), { size: 0.085, additive: false, opacity: 0.55 });
    this.snow = new Pool(scene, Math.floor(quality * 0.3), { size: 0.06, additive: false, opacity: 0.7 });
  }

  steam(pos, count = 4) {
    this.soft.spawn(pos.x, pos.y, pos.z, '#b8e8e8', count, { up: 0.55, life: 1.8, speed: 0.18, gravity: -0.08, spread: 0.25 });
  }

  weld(pos, count = 8) {
    this.sparks.spawn(pos.x, pos.y, pos.z, '#ffc06a', count, { up: 1.2, life: 0.55, speed: 1.1, gravity: -2.2, spread: 0.2 });
  }

  spark(pos, color = '#ffce7a', count = 12) {
    this.sparks.spawn(pos.x, pos.y, pos.z, color, count, { up: 1.6, life: 0.7, speed: 1.3, gravity: -2.4, spread: 0.3 });
  }

  impact(pos, color = '#ffd08a') {
    this.sparks.spawn(pos.x, pos.y, pos.z, color, 22, { up: 1.8, life: 0.8, speed: 2.2, gravity: -2.8, spread: 0.35 });
    this.soft.spawn(pos.x, pos.y, pos.z, '#c1d4de', 12, { up: 0.8, life: 1.1, speed: 1.1, gravity: -0.5, spread: 0.6 });
  }

  snowAt(pos, count = 3) {
    this.snow.spawn(pos.x, pos.y + 0.8, pos.z, '#e7f5ff', count, { up: -0.08, life: 3.2, speed: 0.18, gravity: -0.06, spread: 0.9 });
  }

  dust(pos, count = 2) {
    this.soft.spawn(pos.x, pos.y, pos.z, '#9ab0b8', count, { up: 0.3, life: 1.4, speed: 0.3, gravity: -0.08, spread: 0.5 });
  }

  update(dt, time) {
    this.sparks.update(dt);
    this.soft.update(dt);
    this.snow.update(dt);
  }

  dispose() {
    for (const p of [this.sparks, this.soft, this.snow]) {
      p.points.parent?.remove(p.points);
      p.geo.dispose();
      p.points.material.dispose();
    }
  }
}
