import * as THREE from 'three';
import { P, c } from '../world/palette.js';
import { clamp } from '../core/utils.js';

/**
 * Effetti: schiuma di particelle, onde d'urto, numeri che salgono.
 * Tutto in pool, niente allocazioni nel loop.
 */
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'effetti';
    scene.add(this.group);

    /* ---------------------------------------------------- particelle */
    const MAX = 220;
    this.pMax = MAX;
    this.pGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    this.pMesh = new THREE.InstancedMesh(
      this.pGeo,
      new THREE.MeshBasicMaterial({ vertexColors: false }),
      MAX
    );
    this.pMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX * 3),
      3
    );
    this.pMesh.frustumCulled = false;
    this.pMesh.count = MAX;
    this.group.add(this.pMesh);
    this.parts = [];
    for (let i = 0; i < MAX; i++) {
      this.parts.push({
        life: 0,
        max: 1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        s: 1,
        g: 1,
        col: new THREE.Color(),
      });
    }
    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._sv = new THREE.Vector3();

    /* ---------------------------------------------------------- onde */
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.9, 1.0, 40);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      m.visible = false;
      m.renderOrder = 7;
      this.group.add(m);
      this.rings.push({ mesh: m, t: 0, dur: 1, r0: 1, r1: 10, color: new THREE.Color() });
    }

    /* -------------------------------------------------------- numeri */
    this.texts = [];
    for (let i = 0; i < 18; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
      );
      sprite.visible = false;
      sprite.renderOrder = 20;
      sprite.scale.set(2.4, 1.2, 1);
      this.group.add(sprite);
      this.texts.push({ sprite, canvas, ctx: canvas.getContext('2d'), tex, t: 0, dur: 1 });
    }
  }

  /* ------------------------------------------------------------ spawner */

  pop(x, y, z, color = P.sand, count = 8, power = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.parts.find((q) => q.life <= 0);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = (2 + Math.random() * 6) * power;
      p.life = p.max = 0.35 + Math.random() * 0.45;
      p.x = x + (Math.random() - 0.5) * 0.6;
      p.y = y + Math.random() * 0.4;
      p.z = z + (Math.random() - 0.5) * 0.6;
      p.vx = Math.cos(a) * sp;
      p.vz = Math.sin(a) * sp;
      p.vy = 3 + Math.random() * 6 * power;
      p.s = 0.5 + Math.random() * 1.1;
      p.g = 16;
      p.col.copy(typeof color === 'number' ? c(color) : color);
    }
  }

  /** Soffio di polvere quando il buco si muove veloce. */
  trail(x, z, r) {
    const p = this.parts.find((q) => q.life <= 0);
    if (!p) return;
    const a = Math.random() * Math.PI * 2;
    p.life = p.max = 0.4;
    p.x = x + Math.cos(a) * r;
    p.y = 0.12;
    p.z = z + Math.sin(a) * r;
    p.vx = Math.cos(a) * 1.4;
    p.vz = Math.sin(a) * 1.4;
    p.vy = 0.7;
    p.s = 0.35;
    p.g = 3;
    p.col.copy(c(P.sandDark));
  }

  ring(x, z, r0, r1, dur = 0.6, color = 0xffffff) {
    const r = this.rings.find((q) => q.t <= 0) || this.rings[0];
    r.t = dur;
    r.dur = dur;
    r.r0 = r0;
    r.r1 = r1;
    r.color.set(color);
    r.mesh.visible = true;
    r.mesh.position.set(x, 0.12, z);
    r.mesh.material.color.set(color);
    return r;
  }

  text(x, y, z, str, color = '#fff', size = 1) {
    const t = this.texts.find((q) => q.t <= 0) || this.texts[0];
    const ctx = t.ctx;
    ctx.clearRect(0, 0, 256, 128);
    let fit = 74;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    do {
      ctx.font = `bold ${fit}px Verdana, sans-serif`;
      fit -= 4;
    } while (ctx.measureText(str).width > 236 && fit > 22);
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(8,12,20,0.9)';
    ctx.strokeText(str, 128, 68);
    ctx.fillStyle = color;
    ctx.fillText(str, 128, 68);
    t.tex.needsUpdate = true;
    t.sprite.material.opacity = 1;
    t.sprite.position.set(x, y, z);
    t.sprite.scale.set(2.6 * size, 1.3 * size, 1);
    t.sprite.visible = true;
    t.t = t.dur = 1.05;
    t.size = size;
    return t;
  }

  /* ------------------------------------------------------------ update */

  update(dt) {
    // particelle
    let write = 0;
    for (const p of this.parts) {
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.05) {
          p.y = 0.05;
          p.vy *= -0.35;
          p.vx *= 0.7;
          p.vz *= 0.7;
        }
        const k = clamp(p.life / p.max, 0, 1);
        this._v.set(p.x, p.y, p.z);
        this._q.setFromAxisAngle(AX, p.life * 9);
        this._sv.setScalar(p.s * k);
        this._m4.compose(this._v, this._q, this._sv);
        this.pMesh.setMatrixAt(write, this._m4);
        this.pMesh.setColorAt(write, p.col);
        write++;
        if (p.life <= 0) {
          // nascondi subito
          this._sv.setScalar(0);
          this._m4.compose(AXIS_POS, IDENT, this._sv);
        }
      }
    }
    // copri le slot libere con una matrice zero
    for (let i = write; i < this.pMax; i++) {
      this._m4.compose(AXIS_POS, IDENT, ZERO);
      this.pMesh.setMatrixAt(i, this._m4);
    }
    this.pMesh.count = this.pMax;
    this.pMesh.instanceMatrix.needsUpdate = true;
    if (this.pMesh.instanceColor) this.pMesh.instanceColor.needsUpdate = true;

    // onde
    for (const r of this.rings) {
      if (r.t <= 0) continue;
      r.t -= dt;
      const k = 1 - clamp(r.t / r.dur, 0, 1);
      const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2.2));
      r.mesh.scale.setScalar(rad);
      r.mesh.material.opacity = 0.75 * (1 - k) * (1 - k);
      if (r.t <= 0) r.mesh.visible = false;
    }

    // numeri
    for (const t of this.texts) {
      if (t.t <= 0) continue;
      t.t -= dt;
      const k = clamp(t.t / t.dur, 0, 1);
      t.sprite.position.y += dt * 2.6;
      t.sprite.material.opacity = k > 0.75 ? (1 - k) * 4 : k / 0.75;
      const pop = k > 0.82 ? 1 + (k - 0.82) * 1.6 : 1;
      t.sprite.scale.set(2.6 * t.size * pop, 1.3 * t.size * pop, 1);
      if (t.t <= 0) t.sprite.visible = false;
    }
  }

  clear() {
    for (const p of this.parts) p.life = 0;
    for (const r of this.rings) {
      r.t = 0;
      r.mesh.visible = false;
    }
    for (const t of this.texts) {
      t.t = 0;
      t.sprite.visible = false;
    }
  }
}

const AX = new THREE.Vector3(0.3, 0.8, 0.5).normalize();
const AXIS_POS = new THREE.Vector3(0, -50, 0);
const IDENT = new THREE.Quaternion();
const ZERO = new THREE.Vector3(0, 0, 0);
