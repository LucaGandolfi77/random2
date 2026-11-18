import type { InputManager } from '../input/InputManager';
import type { InputFrame } from '../game/types';

export class TouchControls {
  readonly root: HTMLElement;
  private joyId: number | null = null;
  onPause?: () => void;

  constructor(container: HTMLElement, private input: InputManager) {
    this.root = document.createElement('div');
    this.root.className = 'touch-ui hidden';
    this.root.innerHTML = `
      <div class="joy-zone"><div class="joy-base"><div class="joy-knob"></div></div></div>
      <div class="touch-buttons">
        <button class="tbtn light" data-a="light">Light</button>
        <button class="tbtn heavy" data-a="heavy">Heavy</button>
        <button class="tbtn special" data-a="special">Special</button>
        <button class="tbtn" data-a="dodge">Dodge</button>
        <button class="tbtn" data-a="block">Block</button>
        <button class="tbtn assist" data-a="assist1">Sup 1</button>
        <button class="tbtn assist" data-a="assist2">Sup 2</button>
      </div>
      <button class="tbtn pause-tbtn" data-a="pause">II</button>
      <div class="rotate-hint">Landscape recommended</div>`;
    container.appendChild(this.root);
    this.bind();
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  private bind() {
    const zone = this.root.querySelector('.joy-zone') as HTMLElement;
    const base = this.root.querySelector('.joy-base') as HTMLElement;
    const knob = this.root.querySelector('.joy-knob') as HTMLElement;

    const update = (e: PointerEvent) => {
      const r = base.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 4;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const actions: (keyof InputFrame)[] = ['left', 'right', 'up', 'down'];
      const values = [dx < -max * 0.35, dx > max * 0.35, dy < -max * 0.35, dy > max * 0.35];
      actions.forEach((a, i) => values[i] ? this.input.touchDown(a) : this.input.touchUp(a));
    };

    zone.addEventListener('pointerdown', (e) => { this.joyId = e.pointerId; zone.setPointerCapture(e.pointerId); update(e); });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) update(e); });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      knob.style.transform = 'translate(0,0)';
      (['left', 'right', 'up', 'down'] as (keyof InputFrame)[]).forEach((a) => this.input.touchUp(a));
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);

    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((btn) => {
      const a = btn.dataset.a as keyof InputFrame | 'pause';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (a === 'pause') { this.onPause?.(); return; }
        this.input.touchDown(a as keyof InputFrame);
        btn.classList.add('on');
      });
      const up = (e: PointerEvent) => {
        e.preventDefault();
        if (a !== 'pause') this.input.touchUp(a as keyof InputFrame);
        btn.classList.remove('on');
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  }
}
