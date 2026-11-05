import * as THREE from 'three';

/**
 * Post-processing leggero e offline.
 *
 * Scene -> bright pass -> blur ping-pong -> compositing con bloom, vignetta,
 * saturazione, contrasto e un DOF radiale opzionale per la modalità foto.
 * Non usa addon esterni: funziona con il solo three.module.js già in vendor.
 */

const FULLSCREEN_VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float threshold;
  uniform float knee;
  varying vec2 vUv;
  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    float luma = max(color.r, max(color.g, color.b));
    float soft = clamp((luma - threshold + knee) / max(knee * 2.0, 0.0001), 0.0, 1.0);
    soft = soft * soft;
    gl_FragColor = vec4(color * soft, 1.0);
  }
`;

const BLUR_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform vec2 direction;
  varying vec2 vUv;
  const float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb * weights[0];
    for (int i = 1; i < 5; i++) {
      vec2 offset = direction * float(i);
      color += texture2D(tDiffuse, vUv + offset).rgb * weights[i];
      color += texture2D(tDiffuse, vUv - offset).rgb * weights[i];
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

const COMPOSITE_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform sampler2D tDof;
  uniform vec2 resolution;
  uniform float bloomStrength;
  uniform float dofStrength;
  uniform float vignette;
  uniform float saturation;
  uniform float contrast;
  uniform float warmth;
  varying vec2 vUv;

  void main() {
    vec3 base = texture2D(tDiffuse, vUv).rgb;
    vec3 bloom = texture2D(tBloom, vUv).rgb;
    vec3 color = base + bloom * bloomStrength;

    if (dofStrength > 0.001) {
      vec3 blurred = texture2D(tDof, vUv).rgb + bloom * bloomStrength;
      vec2 centered = (vUv - 0.5) * vec2(max(resolution.x / max(resolution.y, 1.0), 1.0), 1.0);
      float edge = smoothstep(0.38, 0.92, length(centered));
      color = mix(color, blurred, edge * dofStrength);
    }

    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, saturation);
    color = (color - 0.5) * contrast + 0.5;
    color.r += warmth * 0.018;
    color.g += warmth * 0.006;
    color.b -= warmth * 0.014;

    vec2 centered = (vUv - 0.5) * 2.0;
    float vig = smoothstep(1.25, 0.24, length(centered * vec2(1.0, 0.82)));
    color *= mix(1.0, vig, vignette);

    gl_FragColor = vec4(max(color, 0.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class PostFX {
  constructor({ renderer, quality = 'high', isMobile = false }) {
    this.renderer = renderer;
    this.quality = quality;
    this.isMobile = isMobile;
    this.enabled = quality !== 'low' && (!isMobile || quality === 'high');
    this.sceneRT = null;
    this.brightRT = null;
    this.bloomA = null;
    this.bloomB = null;
    this.dofA = null;
    this.dofB = null;
    this.width = 1;
    this.height = 1;
    this.bloomWidth = 1;
    this.bloomHeight = 1;
    this.lastRenderMs = 0;
    const extensions = renderer.extensions;
    this.hdrType = extensions?.has?.('EXT_color_buffer_float') || extensions?.has?.('EXT_color_buffer_half_float')
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    const common = { depthTest: false, depthWrite: false, toneMapped: false };
    this.brightMaterial = new THREE.ShaderMaterial({
      ...common,
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: quality === 'high' ? 0.92 : 0.95 },
        knee: { value: 0.12 }
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: BRIGHT_FRAGMENT
    });
    this.blurMaterial = new THREE.ShaderMaterial({
      ...common,
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new THREE.Vector2() }
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: BLUR_FRAGMENT
    });
    this.compositeMaterial = new THREE.ShaderMaterial({
      ...common,
      toneMapped: true,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        tDof: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
        bloomStrength: { value: quality === 'high' ? 0.42 : 0.24 },
        dofStrength: { value: 0 },
        vignette: { value: quality === 'high' ? 0.16 : 0.1 },
        saturation: { value: 1.045 },
        contrast: { value: 1.035 },
        warmth: { value: quality === 'high' ? 0.22 : 0.12 }
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT
    });

    this.setSize();
  }

  _makeTarget(width, height, { depth = false, samples = 0 } = {}) {
    const target = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: this.hdrType || THREE.UnsignedByteType,
      depthBuffer: depth,
      stencilBuffer: false,
      generateMipmaps: false,
      samples
    });
    target.texture.generateMipmaps = false;
    return target;
  }

  setSize() {
    if (!this.enabled) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const width = Math.max(1, Math.floor(size.x));
    const height = Math.max(1, Math.floor(size.y));
    if (width === this.width && height === this.height && this.sceneRT) return;
    this.width = width;
    this.height = height;
    const samples = this.quality === 'high' && !this.isMobile ? 4 : 0;
    const bloomScale = this.quality === 'high' ? 4 : 6;
    this.bloomWidth = Math.max(1, Math.floor(width / bloomScale));
    this.bloomHeight = Math.max(1, Math.floor(height / bloomScale));

    for (const target of [this.sceneRT, this.brightRT, this.bloomA, this.bloomB, this.dofA, this.dofB]) target?.dispose();
    this.sceneRT = this._makeTarget(width, height, { depth: true, samples });
    this.brightRT = this._makeTarget(this.bloomWidth, this.bloomHeight);
    this.bloomA = this._makeTarget(this.bloomWidth, this.bloomHeight);
    this.bloomB = this._makeTarget(this.bloomWidth, this.bloomHeight);
    this.dofA = this._makeTarget(this.bloomWidth, this.bloomHeight);
    this.dofB = this._makeTarget(this.bloomWidth, this.bloomHeight);
    this.compositeMaterial.uniforms.resolution.value.set(width, height);
  }

  _draw(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  _blur(source, firstTarget, secondTarget, horizontal = true) {
    this.blurMaterial.uniforms.tDiffuse.value = source;
    this.blurMaterial.uniforms.direction.value.set(
      horizontal ? 1 / this.bloomWidth : 0,
      horizontal ? 0 : 1 / this.bloomHeight
    );
    this._draw(this.blurMaterial, firstTarget);
    this.blurMaterial.uniforms.tDiffuse.value = firstTarget.texture;
    this.blurMaterial.uniforms.direction.value.set(
      horizontal ? 0 : 1 / this.bloomWidth,
      horizontal ? 1 / this.bloomHeight : 0
    );
    this._draw(this.blurMaterial, secondTarget);
    return secondTarget.texture;
  }

  render(scene, camera, { dof = 0 } = {}) {
    if (!this.enabled || !this.sceneRT) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }
    const started = performance.now();
    this.renderer.setRenderTarget(this.sceneRT);
    this.renderer.clear();
    this.renderer.render(scene, camera);

    this.brightMaterial.uniforms.tDiffuse.value = this.sceneRT.texture;
    this._draw(this.brightMaterial, this.brightRT);

    const bloomTexture = this._blur(this.brightRT.texture, this.bloomA, this.bloomB, true);

    this.compositeMaterial.uniforms.tDiffuse.value = this.sceneRT.texture;
    this.compositeMaterial.uniforms.tBloom.value = bloomTexture;
    this.compositeMaterial.uniforms.tDof.value = this.sceneRT.texture;
    this.compositeMaterial.uniforms.dofStrength.value = dof > 0 ? dof : 0;

    if (dof > 0.001) {
      this.compositeMaterial.uniforms.tDof.value = this._blur(this.sceneRT.texture, this.dofA, this.dofB, true);
    }

    this.quad.material = this.compositeMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCamera);
    this.lastRenderMs = performance.now() - started;
  }
}
