import type { InputManager } from './InputManager';
import type { WorldInput } from '../systems/Overworld';

export class TouchControls {
  readonly root: HTMLElement;
  constructor(container: HTMLElement, private input: InputManager, onMenu: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'touch-ui hidden';
    this.root.innerHTML = `
      <div class="dpad">
        <button class="dbtn up" data-a="up">▲</button>
        <button class="dbtn left" data-a="left">◀</button>
        <button class="dbtn right" data-a="right">▶</button>
        <button class="dbtn down" data-a="down">▼</button>
      </div>
      <div class="touch-actions">
        <button class="tbtn a" data-a="a">A</button>
        <button class="tbtn b" data-a="b">B</button>
        <button class="tbtn small-btn" data-a="swap">SWAP</button>
        <button class="tbtn small-btn" data-a="power">POWER</button>
      </div>
      <div class="top-buttons"><button class="tbtn small-btn" data-a="menu">MENU</button></div>
      <div class="rotate-hint">LANDSCAPE RECOMMENDED</div>`;
    container.appendChild(this.root);
    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((btn) => {
      const action = btn.dataset.a as keyof WorldInput | 'menu';
      const down = (e: PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (action === 'menu') { onMenu(); return; }
        this.input.setTouch(action, true);
        btn.classList.add('on');
      };
      const up = (e: PointerEvent) => {
        e.preventDefault();
        if (action !== 'menu') this.input.setTouch(action, false);
        btn.classList.remove('on');
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }
}
