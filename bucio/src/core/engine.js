import * as THREE from 'three';

/**
 * Motore: renderer, scena, loop a tempo variabile con dt stabilizzato,
 * preset di qualità (che il menu può cambiare al volo).
 */
export const QUALITY = {
  high: { label: 'Alta', dpr: 2, shadows: true, shadowSize: 2048, density: 1, antialias: true },
  med: { label: 'Media', dpr: 1.5, shadows: true, shadowSize: 1024, density: 0.78, antialias: true },
  low: { label: 'Bassa', dpr: 1, shadows: false, shadowSize: 512, density: 0.5, antialias: false },
};

export class Engine {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.quality = QUALITY[quality] ? quality : 'high';
    this.q = QUALITY[this.quality];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.q.antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.q.dpr));
    this.renderer.shadowMap.enabled = this.q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc08a6a, 115, 400);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 900);

    this.timer = new THREE.Timer();
    this.time = 0;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', () => setTimeout(this._onResize, 200));
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  applyQuality(name) {
    if (!QUALITY[name] || name === this.quality) return;
    this.quality = name;
    this.q = QUALITY[name];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.q.dpr));
    this.renderer.shadowMap.enabled = this.q.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse((o) => {
      if (o.isMesh && o.material) o.material.needsUpdate = true;
    });
    this.resize();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Loop principale con dt limitato (niente esplosioni dopo un tab nascosto). */
  start(step) {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 0.05);
      this.time += dt;
      step(dt, this.time);
      this.render();
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this._raf);
  }
}