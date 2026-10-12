import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/utils.js';

/**
 * Camera: insegue il buco dall'alto e si allontana man mano che cresce —
 * il mondo si scopre, che è metà del divertimento.
 */
export class HoleCamera {
  constructor(camera) {
    this.cam = camera;
    this.dist = 26;
    this.height = 22;
    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3(0, 30, 30);
    this.trauma = 0;
    this.shakeEnabled = true;
    this._t = 0;
    this._lead = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this.intro = 0; // 0..1, dal menu alla partita
  }

  distFor(r) {
    // in verticale serve più distanza, altrimenti non vedi nulla ai lati
    const portrait = this.cam.aspect < 1 ? 1.32 : 1;
    return (17 + Math.pow(r, 0.86) * 7.4) * portrait;
  }

  snapTo(hole) {
    this.dist = this.distFor(hole.r);
    this._compute(hole, 1);
    this.pos.copy(this._posTarget);
    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
  }

  _compute(hole, k) {
    const d = this.distFor(hole.r);
    const leadX = clamp(hole.vx * 0.42, -d * 0.3, d * 0.3);
    const leadZ = clamp(hole.vz * 0.42, -d * 0.3, d * 0.3);
    this._lead.set(leadX, 0, leadZ);
    this._lookTarget.set(hole.x + leadX * 0.5, 0, hole.z + leadZ * 0.5);
    this._posTarget = this._posTarget || new THREE.Vector3();
    this._posTarget.set(
      this._lookTarget.x,
      d * 0.92 + 4,
      this._lookTarget.z + d * 0.62
    );
  }

  update(dt, hole) {
    this._t += dt;
    this._compute(hole);
    this.dist = damp(this.dist, this.distFor(hole.r), 2.6, dt);

    this._posTarget.y = this.dist * 0.92 + 4;
    this._posTarget.z = this._lookTarget.z + this.dist * 0.62;

    // inseguimento morbido + leggero anticipo sul movimento
    const k = 1 - Math.exp(-7 * dt);
    this.pos.lerp(this._posTarget, k);
    this.look.lerp(this._lookTarget, 1 - Math.exp(-9 * dt));

    // scossa
    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    let sx = 0;
    let sy = 0;
    if (this.shakeEnabled && this.trauma > 0) {
      const t = this.trauma * this.trauma;
      sx = (Math.sin(this._t * 63.1) + Math.sin(this._t * 41.7)) * 0.5 * t * 1.5;
      sy = (Math.cos(this._t * 57.3) + Math.cos(this._t * 39.1)) * 0.5 * t * 1.2;
    }

    this.cam.position.set(this.pos.x + sx, this.pos.y + sy, this.pos.z);
    this.cam.lookAt(this.look.x, this.look.y + sy * 0.4, this.look.z);
    if (this.intro > 0) {
      // apertura: parte alta e lontana, poi si avvicina
      const e = 1 - this.intro;
      this.cam.position.y += e * 34;
      this.cam.position.z += e * 26;
      this.cam.fov = lerp(38, 52, this.intro);
      this.cam.updateProjectionMatrix();
    }
  }

  shake(amount) {
    if (!this.shakeEnabled) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Modalità menu: orbita lenta sopra Portomarina. */
  orbit(dt, center, radius) {
    this._t += dt * 0.12;
    const r = radius ?? 92;
    this.cam.position.set(
      center.x + Math.cos(this._t) * r,
      64 + Math.sin(this._t * 0.7) * 8,
      center.z + Math.sin(this._t) * r * 0.85
    );
    this.cam.lookAt(center.x, 0, center.z);
    this.cam.fov = 46;
    this.cam.updateProjectionMatrix();
  }
}
