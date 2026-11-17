/* Cristallo 3D — Three.js cabinet renderer with adaptive resolution. */
import * as THREE from 'three';
import { THEMES, CANVAS } from './config.js';
import { Cabinet, HIT_REGIONS, REEL_TOP, REEL_H, REEL_X, REEL_W } from './render.js';
import { Effects } from './effects.js';
import { drawSymbol } from './art/symbols.js';

const SLOTS = 10;
const REEL_RADIUS = 1.15;
const STEP = (Math.PI * 2) / SLOTS;

const textureCache = new Map();
function symbolTexture(key, color) {
  const id = `${key}:${color}`;
  if (textureCache.has(id)) return textureCache.get(id);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  drawSymbol(ctx, key, 64, 64, 112, color);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(id, tex);
  return tex;
}

export class Slot3D {
  constructor(baseCanvas, machine) {
    this.canvas = baseCanvas;
    this.machine = machine;
    this.base = new Cabinet(baseCanvas);
    this.pressed = null;
    this.effects = new Effects();
    this.time = 0;
    this.lever = 0;
    this.supported = false;

    // The 2D cabinet stays underneath and provides all chrome, HUD and buttons.
    // WebGL renders only inside the reel window, on its own canvas.
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.className = 'webgl-layer';
    baseCanvas.parentElement.appendChild(this.glCanvas);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.glCanvas, antialias: true, alpha: true });
    } catch (e) {
      console.warn('3D renderer unavailable', e);
      this.glCanvas.remove();
      return;
    }
    this.supported = true;
    this.renderer.setClearColor(0x05030d, 1);
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, CANVAS.width / CANVAS.height, 0.1, 100);
    this.camera.position.set(0, 0.2, 6.8);
    this.camera.lookAt(0, 0.2, 0);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.buildLights();
    this.buildCabinet();
    this.buildReels();
    this.buildLever();

    // 2D overlay for banners, flashes and floating scores.
    this.fxCanvas = document.createElement('canvas');
    this.fxCanvas.className = 'fx-overlay';
    baseCanvas.parentElement.appendChild(this.fxCanvas);
    this.fxCtx = this.fxCanvas.getContext('2d');

    this.quality = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  static isSupported() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  buildLights() {
    const t = THEMES[this.machine.theme] || THEMES.cosmic;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.PointLight(t.glow, 70, 40);
    key.position.set(0, 3.2, 5);
    this.scene.add(key);
    const fill = new THREE.PointLight(t.accent, 45, 40);
    fill.position.set(-4, -2.5, 4);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0x67e8f9, 35, 40);
    rim.position.set(4, 1.5, -2);
    this.scene.add(rim);
  }

  buildCabinet() {
    const t = THEMES[this.machine.theme] || THEMES.cosmic;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(6.1, 9.6, 0.9),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(t.metal), metalness: 0.65, roughness: 0.22,
        clearcoat: 0.9, clearcoatRoughness: 0.15,
      })
    );
    body.position.z = -0.8;
    this.root.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: new THREE.Color(t.edge), transparent: true, opacity: 0.9 })
    );
    edges.position.copy(body.position);
    this.root.add(edges);

    // Marquee plaque.
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 1.05),
      new THREE.MeshBasicMaterial({ map: this.textPlane('CRISTALLO 3D', t.edge), transparent: true })
    );
    plaque.position.set(0, 4.15, 0.72);
    this.root.add(plaque);

    // Reel window frame.
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 4.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x05030a, metalness: 0.4, roughness: 0.4 })
    );
    frame.position.set(0, 0.2, -0.05);
    this.root.add(frame);
    const frameEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(frame.geometry),
      new THREE.LineBasicMaterial({ color: new THREE.Color(t.glow) })
    );
    frameEdges.position.copy(frame.position);
    this.root.add(frameEdges);
  }

  textPlane(text, color) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 200;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = '900 108px "Trebuchet MS", Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 28;
    ctx.fillStyle = color;
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildReels() {
    const t = THEMES[this.machine.theme] || THEMES.cosmic;
    this.reels = [];
    const count = this.machine.reels;
    const spacing = 4.0 / count;
    for (let r = 0; r < count; r++) {
      const group = new THREE.Group();
      group.position.x = (r - (count - 1) / 2) * spacing;
      group.position.y = 0.2;
      group.position.z = 0.55;

      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(REEL_RADIUS * 0.92, REEL_RADIUS * 0.92, spacing * 0.9, 24, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0x0a0714, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide,
        })
      );
      drum.rotation.z = Math.PI / 2;
      group.add(drum);

      const planes = [];
      for (let i = 0; i < SLOTS; i++) {
        const angle = i * STEP;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(spacing * 0.86, spacing * 0.86),
          new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false })
        );
        plane.position.set(0, Math.sin(angle) * REEL_RADIUS, Math.cos(angle) * REEL_RADIUS);
        plane.rotation.x = -angle;
        group.add(plane);
        planes.push(plane);
      }
      this.reels.push({ group, planes });
      this.root.add(group);
    }
    this.updateReels({ spinner: null });
  }

  buildLever() {
    const t = THEMES[this.machine.theme] || THEMES.cosmic;
    this.leverGroup = new THREE.Group();
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 })
    );
    rod.position.y = -0.6;
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 20, 16),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(t.edge), metalness: 0.4, roughness: 0.1,
        clearcoat: 1, emissive: new THREE.Color(t.glow), emissiveIntensity: 0.25,
      })
    );
    knob.position.y = 0.7;
    this.leverGroup.add(rod, knob);
    this.leverGroup.position.set(3.45, 1.1, 0.6);
    this.root.add(this.leverGroup);
  }

  geometry(machine = this.machine) { return this.base.geometry(machine); }
  hitTest(x, y) { return this.base.hitTest(x, y); }
  get pressed() { return this.base.pressed; }
  set pressed(v) { this.base.pressed = v; }
  spawn(...args) { return this.base.spawn(...args); }
  burstWin(...args) { return this.base.burstWin(...args); }

  updateReels(frame) {
    const spinner = frame.spinner;
    const renderState = spinner ? spinner.getRenderState() : [];
    this.reels.forEach((reel, r) => {
      const rs = renderState[r];
      const strip = this.machine.strips[r];
      let base = 0, frac = 0;
      if (rs && !rs.fixed) {
        base = Math.floor(spinner.reels[r].offset);
        frac = spinner.reels[r].offset - base;
      } else if (rs && rs.fixed) {
        base = 0;
      }
      reel.planes.forEach((plane, i) => {
        const key = strip[((base + i) % strip.length + strip.length) % strip.length];
        const def = this.machine.symbols[key];
        const mat = plane.material;
        if (mat.userData.key !== key) {
          mat.map = symbolTexture(key, def?.color || THEMES[this.machine.theme].edge);
          mat.needsUpdate = true;
          mat.userData.key = key;
        }
      });
      reel.group.rotation.x = -frac * STEP;
      // Only show the front arc; side/back planes would spill past the window.
      reel.planes.forEach((plane, i) => {
        plane.visible = Math.cos(i * STEP + reel.group.rotation.x) > 0.6;
      });
    });
  }

  resize() {
    if (!this.supported) return;
    const rect = this.canvas.getBoundingClientRect();
    const parent = this.canvas.parentElement.getBoundingClientRect();
    const sx = rect.width / CANVAS.width;
    const sy = rect.height / CANVAS.height;
    const left = rect.left - parent.left;
    const top = rect.top - parent.top;

    const rw = REEL_W * sx, rh = REEL_H * sy;
    this.glCanvas.style.position = 'absolute';
    this.glCanvas.style.left = (left + REEL_X * sx) + 'px';
    this.glCanvas.style.top = (top + REEL_TOP * sy) + 'px';
    this.glCanvas.style.width = rw + 'px';
    this.glCanvas.style.height = rh + 'px';
    this.glCanvas.style.pointerEvents = 'none';
    this.glCanvas.style.borderRadius = '10px';

    this.quality = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.quality);
    this.renderer.setSize(rw, rh, false);
    this.camera.aspect = rw / rh;
    this.camera.updateProjectionMatrix();

    this.fxCanvas.width = Math.round(rect.width * this.quality);
    this.fxCanvas.height = Math.round(rect.height * this.quality);
    this.fxCanvas.style.left = left + 'px';
    this.fxCanvas.style.top = top + 'px';
    this.fxCanvas.style.width = rect.width + 'px';
    this.fxCanvas.style.height = rect.height + 'px';
    this.fxCtx.setTransform(this.quality, 0, 0, this.quality, 0, 0);
  }

  draw(frame) {
    this.base.draw(frame, { chromeOnly: true });
    if (!this.supported) return;
    this.time = frame.time || 0;
    const dt = Math.min(0.05, frame.dt || 0);
    this.effects.update(dt);
    this.updateReels(frame);

    this.lever += (((frame.spinner && frame.spinner.isSpinning) ? 1 : 0) - this.lever) * Math.min(1, dt * 9);
    this.leverGroup.position.y = 1.1 - this.lever * 0.55;
    this.leverGroup.rotation.z = -this.lever * 0.35;
    this.root.rotation.y = Math.sin(this.time / 2600) * 0.035;
    this.root.rotation.x = Math.sin(this.time / 3400) * 0.014;

    this.renderer.render(this.scene, this.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.fxCtx.clearRect(0, 0, w, h);
    this.effects.draw(this.fxCtx, w, h);
  }

  dispose() {
    if (!this.supported) return;
    this.fxCanvas?.remove();
    this.glCanvas?.remove();
    this.renderer.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
}
