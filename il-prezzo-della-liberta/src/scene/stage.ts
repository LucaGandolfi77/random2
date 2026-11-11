import {
  ACESFilmicToneMapping,
  Color,
  Fog,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Vector2 } from 'three';

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.035 },
    vignette: { value: 0.62 }
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grain;
    uniform float vignette;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 0.0007) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - 0.5;
      float vig = smoothstep(0.82, 0.24, length(centered) * 1.35) * vignette;
      float n = hash(vUv * vec2(1920.0, 1080.0)) - 0.5;
      color.rgb += n * grain;
      color.rgb *= mix(1.0, 0.72, vig);
      color.rgb = mix(color.rgb, color.rgb * vec3(1.02, 0.99, 0.95), 0.25);
      gl_FragColor = color;
    }
  `
};

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  private composer: EffectComposer;
  private grainPass: ShaderPass;
  private canvas: HTMLCanvasElement;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;

    this.scene = new Scene();
    this.scene.background = new Color('#0c1016');
    this.scene.fog = new Fog('#0c1016', 10, 90);

    this.camera = new PerspectiveCamera(40, 1, 0.05, 420);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new Vector2(1024, 1024), 0.18, 0.4, 0.92);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
    this.grainPass = new ShaderPass(GrainShader);
    this.grainPass.renderToScreen = true;
    this.composer.addPass(this.grainPass);

    this.resize();
  }

  resize(): void {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setExposure(value: number): void {
    if (Math.abs(this.renderer.toneMappingExposure - value) > 0.002) {
      this.renderer.toneMappingExposure = value;
    }
  }

  render(time: number): void {
    this.grainPass.uniforms.time.value = time * 1000;
    this.composer.render();
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
