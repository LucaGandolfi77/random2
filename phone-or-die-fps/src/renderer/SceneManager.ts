import * as THREE from 'three';
import { CONFIG } from '../game/GameConfig';
import type { Quality } from '../data/types';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private quality: Quality = 'high';

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const q = CONFIG.quality[this.quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x05070c);
    this.scene.fog = new THREE.FogExp2(0x080b12, 0.022);

    this.camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.06, 120);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, CONFIG.eyeHeight, 0);

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
  }

  setAtmosphere(sky: number, fog: number) {
    (this.scene.background as THREE.Color).setHex(sky);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(fog);
      this.scene.fog.density = 0.018;
    }
  }

  setQuality(q: Quality) {
    this.quality = q;
    const c = CONFIG.quality[q];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, c.pixelRatio));
    this.renderer.shadowMap.enabled = c.shadows;
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.density = 0.032 - (c.fogFar / 2500);
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() { this.renderer.render(this.scene, this.camera); }

  get shadowSize() { return CONFIG.quality[this.quality].shadowSize; }
  get maxLights() { return CONFIG.quality[this.quality].lights; }
}
