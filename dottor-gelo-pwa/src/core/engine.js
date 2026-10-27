import * as THREE from 'three';

export const QUALITY = {
  high: { label: 'Alta', dpr: 2, shadows: true, shadowSize: 2048, particles: 700, antialias: true },
  med: { label: 'Media', dpr: 1.5, shadows: true, shadowSize: 1024, particles: 460, antialias: true },
  low: { label: 'Bassa', dpr: 1, shadows: false, shadowSize: 512, particles: 260, antialias: false },
};

export class Engine {
  constructor(canvas, camera, quality = 'high') {
    this.canvas = canvas;
    this.camera = camera;
    this.quality = QUALITY[quality] ? quality : 'high';
    this.q = QUALITY[this.quality];
    this.onContextLost = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.dpr));
    this.renderer.shadowMap.enabled = this.q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#080b10');
    this.scene.fog = new THREE.FogExp2('#080b10', 0.012);

    this.last = performance.now();
    this.time = 0;
    this._running = false;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', () => setTimeout(this._onResize, 180));
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._running = false;
      this.onContextLost?.();
    });
    this.resize();
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.dpr));
    if (this.camera?.setViewport) this.camera.setViewport(w, h);
    else {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  setQuality(name) {
    if (!QUALITY[name] || name === this.quality) return;
    this.quality = name;
    this.q = QUALITY[name];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.dpr));
    this.renderer.shadowMap.enabled = this.q.shadows;
    this.scene.traverse((o) => {
      if (o.isMesh && o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
      }
    });
    this.resize();
  }

  start(step) {
    if (this._running) return;
    this._running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this._running) return;
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.time += dt;
      if (document.hidden) {
        this.renderer.render(this.scene, this.camera);
        return;
      }
      step(dt, this.time);
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
  }
}
