import * as THREE from 'three';

export interface EnvironmentLighting {
  group: THREE.Group;
  key: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
}

export function createNightLighting(options: {
  moonColor?: number;
  skyColor?: number;
  groundColor?: number;
  keyIntensity?: number;
  hemiIntensity?: number;
  ambientIntensity?: number;
} = {}): EnvironmentLighting {
  const group = new THREE.Group();
  group.name = 'night-lighting';

  const ambient = new THREE.AmbientLight(0x3b4b63, options.ambientIntensity ?? 0.68);
  group.add(ambient);

  const hemisphere = new THREE.HemisphereLight(
    options.skyColor ?? 0x42556f,
    options.groundColor ?? 0x28231b,
    options.hemiIntensity ?? 0.92,
  );
  group.add(hemisphere);

  const key = new THREE.DirectionalLight(options.moonColor ?? 0xb7c7dd, options.keyIntensity ?? 1.85);
  key.position.set(14, 22, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 80;
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 24;
  key.shadow.camera.bottom = -24;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  group.add(key);

  const fill = new THREE.DirectionalLight(0x7f93b0, 0.62);
  fill.position.set(8, 9, 14);
  fill.castShadow = false;
  group.add(fill);

  const rim = new THREE.DirectionalLight(0x43536d, 0.28);
  rim.position.set(-12, 8, -16);
  rim.castShadow = false;
  group.add(rim);

  const backFill = new THREE.DirectionalLight(0x6f83a0, 0.42);
  backFill.position.set(-5, 7, -14);
  backFill.castShadow = false;
  group.add(backFill);

  return { group, key, hemisphere, fill };
}

export function createDawnLighting(options: {
  sunColor?: number;
  skyColor?: number;
  groundColor?: number;
  keyIntensity?: number;
  hemiIntensity?: number;
} = {}): EnvironmentLighting {
  const group = new THREE.Group();
  group.name = 'dawn-lighting';

  const hemisphere = new THREE.HemisphereLight(
    options.skyColor ?? 0xd4a69a,
    options.groundColor ?? 0x544c3e,
    options.hemiIntensity ?? 1.02,
  );
  group.add(hemisphere);

  const key = new THREE.DirectionalLight(options.sunColor ?? 0xf3c58f, options.keyIntensity ?? 1.7);
  key.position.set(-16, 7, -20);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.camera.left = -30;
  key.shadow.camera.right = 30;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -30;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  group.add(key);

  const fill = new THREE.DirectionalLight(0x91a8bd, 0.35);
  fill.position.set(12, 6, 10);
  fill.castShadow = false;
  group.add(fill);

  return { group, key, hemisphere, fill };
}
