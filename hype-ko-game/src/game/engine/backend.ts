import { Engine, Scene, WebGPUEngine, type AbstractEngine } from '@babylonjs/core';

export type RenderBackend = 'webgpu' | 'webgl2';

export interface RenderQuality {
  shadows: boolean;
  glow: boolean;
  hardwareScaling: number;
  crowdDensity: number;
}

export const QUALITY_PRESETS: Record<'low' | 'medium' | 'high', RenderQuality> = {
  low: { shadows: false, glow: false, hardwareScaling: 1.5, crowdDensity: 0.4 },
  medium: { shadows: true, glow: true, hardwareScaling: 1, crowdDensity: 0.75 },
  high: { shadows: true, glow: true, hardwareScaling: 1, crowdDensity: 1 }
};

export interface CreatedEngine {
  engine: AbstractEngine;
  backend: RenderBackend;
}

export async function createEngine(
  canvas: HTMLCanvasElement,
  quality: RenderQuality = QUALITY_PRESETS.medium
): Promise<CreatedEngine> {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter().catch(() => null) : null;
    if (adapter) {
      try {
        const webgpu = new WebGPUEngine(canvas, {
          antialias: true,
          adaptToDeviceRatio: true,
          stencil: true
        });
        await webgpu.initAsync();
        webgpu.setHardwareScalingLevel(quality.hardwareScaling);
        return { engine: webgpu, backend: 'webgpu' };
      } catch {
        // Fall through to WebGL2 when WebGPU initialization fails.
      }
    }
  }

  const engine = new Engine(
    canvas,
    true,
    {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
      alpha: false
    },
    true
  );
  engine.setHardwareScalingLevel(quality.hardwareScaling);
  return { engine, backend: 'webgl2' };
}

export function createScene(engine: AbstractEngine): Scene {
  const scene = new Scene(engine);
  scene.clearColor.set(0.02, 0.02, 0.04, 1);
  scene.ambientColor.set(0.2, 0.2, 0.25);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.1;
  scene.imageProcessingConfiguration.contrast = 1.12;
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  return scene;
}

export function resizeEngine(engine: AbstractEngine): void {
  engine.resize();
}
