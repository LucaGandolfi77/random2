import * as THREE from 'three';
import { SKY_SUN_DIRECTION } from './sky';

const FOG_GOLDEN = new THREE.Color(0xf0cfa2);
const FOG_DUSK = new THREE.Color(0x75545c);
const SUN_GOLDEN = new THREE.Color(0xffd4a0);
const SUN_DUSK = new THREE.Color(0xff9c66);
const HEMI_SKY_GOLDEN = new THREE.Color(0xffe2b8);
const HEMI_SKY_DUSK = new THREE.Color(0x8494c4);
const HEMI_GROUND_GOLDEN = new THREE.Color(0x6f5d46);
const HEMI_GROUND_DUSK = new THREE.Color(0x3c3444);

export interface LightingRig {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  lanterns: THREE.PointLight[];
  setDusk(t: number): void;
}

export function createLighting(scene: THREE.Scene, mobile: boolean): LightingRig {
  scene.fog = new THREE.Fog(FOG_GOLDEN.getHex(), 46, 178);

  const hemi = new THREE.HemisphereLight(HEMI_SKY_GOLDEN, HEMI_GROUND_GOLDEN, 1.35);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xfff1d8, 0.22);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(SUN_GOLDEN, 2.9);
  sun.position.copy(SKY_SUN_DIRECTION).multiplyScalar(90);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.camera.left = -64;
  sun.shadow.camera.right = 64;
  sun.shadow.camera.top = 64;
  sun.shadow.camera.bottom = -64;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 190;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const lanterns: THREE.PointLight[] = [];
  for (const [x, z] of [
    [0, 4],
    [-28, -13],
    [33, 27]
  ] as const) {
    const light = new THREE.PointLight(0xffb46e, 0, 24, 2);
    light.position.set(x, 3.2, z);
    scene.add(light);
    lanterns.push(light);
  }

  const setDusk = (t: number): void => {
    const amount = THREE.MathUtils.clamp(t, 0, 1);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(FOG_GOLDEN).lerp(FOG_DUSK, amount);
    }
    sun.color.copy(SUN_GOLDEN).lerp(SUN_DUSK, amount);
    sun.intensity = THREE.MathUtils.lerp(2.9, 0.9, amount);
    hemi.color.copy(HEMI_SKY_GOLDEN).lerp(HEMI_SKY_DUSK, amount);
    hemi.groundColor.copy(HEMI_GROUND_GOLDEN).lerp(HEMI_GROUND_DUSK, amount);
    hemi.intensity = THREE.MathUtils.lerp(1.35, 0.8, amount);
    ambient.intensity = THREE.MathUtils.lerp(0.22, 0.34, amount);
    for (const light of lanterns) light.intensity = 16 * amount;
  };

  return { sun, hemi, ambient, lanterns, setDusk };
}
