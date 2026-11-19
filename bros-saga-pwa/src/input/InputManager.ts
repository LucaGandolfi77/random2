import type { WorldInput } from '../systems/Overworld';

const KEY_MAP: Record<string, keyof WorldInput> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'a', Space: 'a', Enter: 'a', KeyK: 'b', KeyX: 'b',
  Tab: 'swap', ShiftLeft: 'swap', ShiftRight: 'swap', KeyL: 'power'
};

export class InputManager {
  private held = new Set<string>();
  private touch = new Set<string>();
  onMenu?: () => void;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { this.onMenu?.(); return; }
      const a = KEY_MAP[e.code];
      if (!a) return;
      e.preventDefault();
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => { this.held.clear(); this.touch.clear(); });
  }

  setTouch(action: keyof WorldInput, on: boolean) {
    if (on) this.touch.add(action); else this.touch.delete(action);
  }

  frame(): WorldInput {
    const out: WorldInput = {
      left: false, right: false, up: false, down: false,
      a: false, b: false, swap: false, menu: false, power: false
    };
    for (const key of Object.keys(out) as (keyof WorldInput)[]) {
      out[key] = this.touch.has(key) || [...this.held].some((code) => KEY_MAP[code] === key);
    }
    return out;
  }

  clear() { this.held.clear(); this.touch.clear(); }
}
