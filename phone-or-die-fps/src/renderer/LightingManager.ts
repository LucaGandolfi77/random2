import * as THREE from 'three';
import type { SceneManager } from './SceneManager';
import type { GameState } from '../game/GameState';
import { Materials } from './ProceduralAssets';
import type { ZoneLight } from '../data/zones';

interface RoomLight {
  light: THREE.PointLight;
  bulb: THREE.Mesh;
  base: number;
  on: boolean;
  phase: number;
}

export class LightingManager {
  private ambient: THREE.AmbientLight;
  private hemi: THREE.HemisphereLight;
  private moon: THREE.DirectionalLight;
  private lights: RoomLight[] = [];
  private flashlight: THREE.SpotLight;
  private materials: Materials;
  blackout = false;

  constructor(private sm: SceneManager, materials: Materials) {
    this.materials = materials;
    this.ambient = new THREE.AmbientLight(0x5a6b83, 0.36);
    this.sm.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x7f95b0, 0x14100f, 0.32);
    this.sm.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9fb7d8, 0.35);
    this.moon.position.set(-8, 12, -5);
    this.sm.scene.add(this.moon);

    this.flashlight = new THREE.SpotLight(0xfff2d5, 0, 22, Math.PI / 7, 0.45, 1.2);
    this.flashlight.position.set(0.18, -0.12, 0);
    this.flashlight.target.position.set(0, -0.02, -1);
    this.sm.camera.add(this.flashlight);
    this.sm.camera.add(this.flashlight.target);
    this.sm.scene.add(this.sm.camera);

    this.rebuild();
  }

  /** Swap the point lights when the active zone changes. */
  rebuild(zoneLights?: ZoneLight[]) {
    for (const l of this.lights) {
      this.sm.scene.remove(l.light);
      this.sm.scene.remove(l.bulb);
      l.bulb.geometry.dispose();
      (l.bulb.material as THREE.Material).dispose();
    }
    this.lights = [];
    const list: ZoneLight[] = zoneLights?.length ? zoneLights : [
      { at: [-4.5, 2.5, -3], color: 0xffcf94, power: 2.4 },
      { at: [4.5, 2.5, -3], color: 0xffd7a4, power: 2.1 },
      { at: [-4.5, 2.5, 3], color: 0xffc98a, power: 2.0 },
      { at: [6.2, 2.5, 3], color: 0xffd2a0, power: 1.7 },
      { at: [3.2, 2.5, 3], color: 0xffe0b8, power: 1.5 },
      { at: [0, 2.6, 0], color: 0xffd9a8, power: 1.6 }
    ];
    for (const l of list) this.addLight(l.at[0], l.at[1], l.at[2], l.color, l.power);
  }

  private addLight(x: number, y: number, z: number, color: number, power: number) {
    if (this.lights.length >= this.sm.maxLights) return;
    const light = new THREE.PointLight(color, power, 9, 1.6);
    light.position.set(x, y, z);
    if (this.sm.renderer.shadowMap.enabled && this.lights.length < 2) {
      light.castShadow = true;
      light.shadow.mapSize.set(this.sm.shadowSize, this.sm.shadowSize);
      light.shadow.bias = -0.003;
    }
    this.sm.scene.add(light);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), this.materials.bulb.clone());
    bulb.position.set(x, y + 0.06, z);
    this.sm.scene.add(bulb);
    this.lights.push({ light, bulb, base: power, on: true, phase: Math.random() * 10 });
  }

  toggleRoom(near: THREE.Vector3): boolean {
    let best: RoomLight | null = null, dist = 4.5;
    for (const l of this.lights) {
      const d = l.light.position.distanceTo(near);
      if (d < dist) { dist = d; best = l; }
    }
    if (!best) return false;
    best.on = !best.on;
    return best.on;
  }

  setBlackout(on: boolean) { this.blackout = on; }

  hasLightNear(p: THREE.Vector3): boolean {
    return this.blackout ? false : this.lights.some((l) => l.on && l.light.position.distanceTo(p) < 4.5);
  }

  update(dt: number, time: number, state: GameState) {
    const threat = state.threat;
    const danger = threat / 100;
    this.ambient.intensity = (0.36 - danger * 0.2) * (this.blackout ? 0.35 : 1);
    this.hemi.intensity = (0.32 - danger * 0.16) * (this.blackout ? 0.3 : 1);
    this.moon.intensity = 0.35 - danger * 0.12;

    for (const l of this.lights) {
      const flicker = danger > 0.35 && Math.sin(time * 13 + l.phase) * Math.sin(time * 4.7 + l.phase) > 0.86 - danger * 0.2;
      const on = l.on && !this.blackout && !flicker;
      l.light.intensity += ((on ? l.base : 0) - l.light.intensity) * Math.min(1, dt * 12);
      l.bulb.visible = on;
    }
    const wantFlash = state.flashlightOn && state.battery > 0;
    this.flashlight.intensity += ((wantFlash ? 3.4 : 0) - this.flashlight.intensity) * Math.min(1, dt * 10);
  }
}
