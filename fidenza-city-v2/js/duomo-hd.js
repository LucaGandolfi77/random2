import * as THREE from 'three';

/**
 * Duomo HD — renderer per il PLY Gaussian Splatting convertito in `duomo-hd.bin`.
 *
 * Il modello è un point-splat: ogni punto ha posizione, colore, opacità e
 * dimensione. I record sono ordinati back-to-front dal build script (dal fondo
 * della chiesa alla facciata) e il renderer usa alpha blending con depth-test
 * contro la scena, senza ordinamento per-frame di 260.000 splat.
 */

const META_URL = './assets/3d/duomo-hd.json';
const BIN_URL = './assets/3d/duomo-hd.bin';
const TARGET_HEIGHT = 35.2;
const MODEL_ROTATION_Y = 0;
const MODEL_OFFSET_X = 10.6;
const MODEL_OFFSET_Y = -0.92;
const MODEL_OFFSET_Z = 0;
const SPLAT_SCALE = 1.5;

const vertexShader = /* glsl */`
  attribute vec3 aColor;
  attribute float aOpacity;
  attribute float aSize;
  uniform float uModelScale;
  uniform float uSplatScale;
  uniform float uPixelScale;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vDepth;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float worldSize = aSize * uModelScale * uSplatScale;
    gl_PointSize = clamp(worldSize * uPixelScale / max(1.0, -mvPosition.z), 1.0, 28.0);
    vColor = aColor;
    vOpacity = aOpacity;
    vDepth = -mvPosition.z;
  }
`;

const fragmentShader = /* glsl */`
  uniform vec3 uTint;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uBrightness;
  uniform float uGamma;
  uniform float uAlphaMode;
  uniform float uCompensate;
  uniform float uExposure;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vDepth;

  vec3 srgbToLinear(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(lo, hi, step(vec3(0.04045), c));
  }

  // Inverso di ACESFilmicToneMapping di Three.js (matrici + RRT/ODT).
  // Serve perché il post-processing applica ACES e la codifica sRGB ai nostri
  // colori, che arrivano già in sRGB dal PLY.
  vec3 inverseAces(vec3 y) {
    const mat3 AINV = mat3(
      1.76474097, -0.14702785, -0.03633683,
      -0.67577768, 1.16025151, -0.16243644,
      -0.08896329, -0.01322366, 1.19877327
    );
    const mat3 BINV = mat3(
      0.64303825, 0.05926869, 0.00596190,
      0.31118675, 0.93143649, 0.06392902,
      0.04577546, 0.00929492, 0.93011838
    );
    vec3 v = BINV * min(y, vec3(0.7747));
    vec3 a = 0.983729 * v - 1.0;
    vec3 b = 0.432951 * v - 0.0245786;
    vec3 c = 0.238081 * v + 0.000090537;
    vec3 disc = max(b * b - 4.0 * a * c, vec3(0.0));
    vec3 r1 = (-b + sqrt(disc)) / (2.0 * a);
    vec3 r2 = (-b - sqrt(disc)) / (2.0 * a);
    vec3 x = mix(r2, r1, step(vec3(0.0), r1));
    x = AINV * x;
    return clamp(x * (0.6 / max(uExposure, 0.001)), 0.0, 1.0);
  }

  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float radiusSq = dot(point, point);
    float edge = smoothstep(0.25, 0.08, radiusSq);
    float alpha = edge * vOpacity;
    vec3 display = clamp(vColor * uTint * uBrightness, 0.0, 1.0);
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    vec3 color;
    if (uCompensate > 0.5) {
      vec3 linear = srgbToLinear(display);
      linear = mix(linear, uFogColor, fog * 0.82);
      color = inverseAces(linear);
    } else {
      color = pow(display, vec3(uGamma));
      color = mix(color, uFogColor, fog * 0.82);
    }
    if (uAlphaMode < 0.5) {
      if (alpha < 0.5) discard;
      gl_FragColor = vec4(color, 1.0);
    } else {
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(color, alpha);
    }
  }
`;

function parseSplatBuffer(buffer, meta) {
  const count = Number(meta.count) || Math.floor(buffer.byteLength / 20);
  const expected = count * 20;
  if (buffer.byteLength < expected) throw new Error('duomo-hd.bin incompleto');
  const positions = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 3);
  const opacities = new Uint8Array(count);
  const sizes = new Float32Array(count);
  const data = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < count; i++) {
    positions[i * 3] = data.getFloat32(offset, true); offset += 4;
    positions[i * 3 + 1] = data.getFloat32(offset, true); offset += 4;
    positions[i * 3 + 2] = data.getFloat32(offset, true); offset += 4;
    colors[i * 3] = data.getUint8(offset++);
    colors[i * 3 + 1] = data.getUint8(offset++);
    colors[i * 3 + 2] = data.getUint8(offset++);
    opacities[i] = data.getUint8(offset++);
    sizes[i] = data.getFloat32(offset, true); offset += 4;
  }
  return { count, positions, colors, opacities, sizes };
}

export class DuomoHD {
  constructor({ group, lowGroup, meta, splats, renderer }) {
    this.group = group;
    this.lowGroup = lowGroup;
    this.meta = meta;
    this.renderer = renderer;
    this.count = splats.count;
    this._pixelSize = new THREE.Vector2();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(splats.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(splats.colors, 3, true));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(splats.opacities, 1, true));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(splats.sizes, 1));

    const modelScale = TARGET_HEIGHT / Math.max(0.001, Number(meta.bounds?.size?.[1]) || 0.98);
    geometry.computeBoundingSphere();

    // uAlphaMode: 1 = alpha blending (usa l'ordine back-to-front del .bin),
    // 0 = cutout opaco di debug. uCompensate compensa ACES/sRGB del post-fx.
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uModelScale: { value: modelScale },
        uSplatScale: { value: SPLAT_SCALE },
        uPixelScale: { value: 800 },
        uTint: { value: new THREE.Color('#fff8ed') },
        uBrightness: { value: 1.0 },
        uGamma: { value: 2.2 },
        uAlphaMode: { value: 1.0 },
        uCompensate: { value: 1.0 },
        uExposure: { value: 1.05 },
        uFogColor: { value: new THREE.Color('#bcd3d2') },
        uFogNear: { value: 170 },
        uFogFar: { value: 820 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false
    });

    this.material = material;
    this.mesh = new THREE.Points(geometry, material);
    this.mesh.name = 'duomo-hd-splat';
    this.mesh.position.set(MODEL_OFFSET_X, MODEL_OFFSET_Y, MODEL_OFFSET_Z);
    this.mesh.rotation.y = MODEL_ROTATION_Y;
    this.mesh.scale.setScalar(modelScale);
    this.mesh.frustumCulled = true;
    group.add(this.mesh);
    if (lowGroup) lowGroup.visible = false;

    this.modelScale = modelScale;
  }

  update(camera) {
    if (!camera || !this.renderer) return;
    this.renderer.getDrawingBufferSize(this._pixelSize);
    const h = Math.max(1, this._pixelSize.y);
    const uniforms = this.material.uniforms;
    uniforms.uPixelScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    uniforms.uExposure.value = Number.isFinite(this.renderer.toneMappingExposure)
      ? this.renderer.toneMappingExposure
      : 1.05;
    // Il modello è statico; la luce ambientale viene smorzata di notte.
    if (this._fogColor) uniforms.uFogColor.value.copy(this._fogColor);
  }

  setAtmosphere({ night = 0, day = 1, fogColor = null, fogNear = 170, fogFar = 820 } = {}) {
    const u = this.material.uniforms;
    const warmth = Math.max(0, Math.min(1, 1 - night));
    // Tinta in spazio display: il shader moltiplica i colori sRGB del PLY.
    u.uTint.value.setRGB(
      0.60 + warmth * 0.40,
      0.68 + warmth * 0.31,
      0.88 + warmth * 0.10,
      THREE.LinearSRGBColorSpace
    );
    u.uBrightness.value = 0.72 + warmth * 0.28;
    if (fogColor) u.uFogColor.value.copy(fogColor);
    u.uFogNear.value = fogNear;
    u.uFogFar.value = fogFar;
    this._fogColor = u.uFogColor.value;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}

export async function createDuomoHD({ group, lowGroup, renderer }) {
  if (!group) return null;
  const [metaResponse, binResponse] = await Promise.all([
    fetch(META_URL, { cache: 'no-store' }),
    fetch(BIN_URL, { cache: 'no-store' })
  ]);
  if (!metaResponse.ok) throw new Error(`duomo-hd.json: HTTP ${metaResponse.status}`);
  if (!binResponse.ok) throw new Error(`duomo-hd.bin: HTTP ${binResponse.status}`);
  const meta = await metaResponse.json();
  const buffer = await binResponse.arrayBuffer();
  const splats = parseSplatBuffer(buffer, meta);
  return new DuomoHD({ group, lowGroup, meta, splats, renderer });
}
