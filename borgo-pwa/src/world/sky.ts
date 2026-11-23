import * as THREE from 'three';

const VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  varying vec3 vDirection;

  void main() {
    vec3 dir = normalize(vDirection);
    float height = clamp(dir.y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uTop, pow(height, 0.62));

    float sun = max(dot(dir, normalize(uSunDir)), 0.0);
    color += uSunColor * pow(sun, 240.0) * 1.15;
    color += uSunColor * pow(sun, 10.0) * 0.18;

    float below = smoothstep(0.0, -0.12, dir.y);
    color = mix(color, uHorizon * 0.74, below);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const GOLDEN = {
  top: new THREE.Color(0x7ba6c7),
  horizon: new THREE.Color(0xffd6a0),
  sun: new THREE.Color(0xfff0c8)
};

const DUSK = {
  top: new THREE.Color(0x2f4066),
  horizon: new THREE.Color(0xd97a63),
  sun: new THREE.Color(0xffb26e)
};

export interface SkyRig {
  mesh: THREE.Mesh;
  setDusk(t: number): void;
}

export function createSky(scene: THREE.Scene): SkyRig {
  const uniforms = {
    uTop: { value: GOLDEN.top.clone() },
    uHorizon: { value: GOLDEN.horizon.clone() },
    uSunColor: { value: GOLDEN.sun.clone() },
    uSunDir: { value: new THREE.Vector3(-0.55, 0.55, 0.35).normalize() }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });

  const geometry = new THREE.SphereGeometry(320, 32, 18);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);

  const setDusk = (t: number): void => {
    const amount = THREE.MathUtils.clamp(t, 0, 1);
    uniforms.uTop.value.copy(GOLDEN.top).lerp(DUSK.top, amount);
    uniforms.uHorizon.value.copy(GOLDEN.horizon).lerp(DUSK.horizon, amount);
    uniforms.uSunColor.value.copy(GOLDEN.sun).lerp(DUSK.sun, amount);
  };

  return { mesh, setDusk };
}

export const SKY_SUN_DIRECTION = new THREE.Vector3(-0.55, 0.55, 0.35).normalize();
