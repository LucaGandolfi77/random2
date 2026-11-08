import type { RenderStats } from '../app/render/GameRenderer';

export interface DebugData {
  fps: number;
  frameTime: number;
  physicsFrame: number;
  players: number;
  gamepads: number;
  gamepadDetail: string[];
  touch: boolean;
  renderer: string;
  stats: RenderStats;
}

export class DebugOverlay {
  readonly root: HTMLDivElement;
  private visible = false;
  private body: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'debug-overlay';
    this.root.innerHTML = `<div class="debug-title">HYPE BRAWL // DEBUG</div><div class="debug-body"></div>`;
    this.body = this.root.querySelector('.debug-body') as HTMLElement;
    parent.appendChild(this.root);
    this.root.style.display = 'none';
  }

  get enabled(): boolean {
    return this.visible;
  }

  toggle(force?: boolean): boolean {
    this.visible = force ?? !this.visible;
    this.root.style.display = this.visible ? 'block' : 'none';
    return this.visible;
  }

  update(data: DebugData): void {
    if (!this.visible) return;
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const memoryText = memory
      ? `${(memory.usedJSHeapSize / 1048576).toFixed(1)} / ${(memory.jsHeapSizeLimit / 1048576).toFixed(0)} MB`
      : 'n/a';
    this.body.innerHTML = `
      <div><span>FPS</span><b>${data.fps.toFixed(0)}</b></div>
      <div><span>FRAME</span><b>${data.frameTime.toFixed(2)} ms</b></div>
      <div><span>PHYSICS</span><b>${data.physicsFrame} @ 60 Hz</b></div>
      <div><span>PLAYERS</span><b>${data.players}</b></div>
      <div><span>GAMEPADS</span><b>${data.gamepads}</b></div>
      ${data.gamepadDetail.map((line) => `<div class="debug-pad"><span>PAD</span><b>${line}</b></div>`).join('')}
      <div><span>TOUCH</span><b>${data.touch ? 'ON' : 'OFF'}</b></div>
      <div><span>RENDERER</span><b>${data.stats.renderer}${data.stats.webgpuSupported ? ' / WEBGPU DETECTED' : ''}</b></div>
      <div><span>DRAW CALLS</span><b>${data.stats.drawCalls}</b></div>
      <div><span>MESHES</span><b>${data.stats.meshes}</b></div>
      <div><span>TRIANGLES</span><b>${data.stats.triangles.toLocaleString()}</b></div>
      <div><span>GEOMETRIES</span><b>${data.stats.geometries}</b></div>
      <div><span>TEXTURES</span><b>${data.stats.textures}</b></div>
      <div><span>PIXEL RATIO</span><b>${data.stats.pixelRatio.toFixed(2)}</b></div>
      <div><span>CAMERA Z</span><b>${data.stats.cameraDistance.toFixed(1)}</b></div>
      <div><span>HEAP</span><b>${memoryText}</b></div>
    `;
  }
}
