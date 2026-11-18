import { emptyInput, type InputFrame } from '../game/types';

const KEY_MAP: Record<string, keyof InputFrame> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', Space: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'light', KeyK: 'heavy', KeyL: 'special',
  ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyI: 'dodge',
  KeyU: 'assist1', KeyO: 'assist2', KeyB: 'block'
};

export class InputManager {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private touchHeld = new Set<string>();
  private touchPressed = new Set<string>();
  onPause?: () => void;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { this.onPause?.(); return; }
      const action = KEY_MAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.held.has(e.code)) this.pressed.add(action);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('blur', () => { this.held.clear(); this.touchHeld.clear(); });
  }

  touchDown(action: keyof InputFrame) {
    if (!this.touchHeld.has(action)) this.touchPressed.add(action);
    this.touchHeld.add(action);
  }

  touchUp(action: keyof InputFrame) { this.touchHeld.delete(action); }

  /** Consume this frame's edge-triggered actions. */
  frame(): InputFrame {
    const f = emptyInput();
    const isHeld = (a: keyof InputFrame) => [...this.held].some((c) => KEY_MAP[c] === a) || this.touchHeld.has(a);
    (Object.keys(f) as (keyof InputFrame)[]).forEach((key) => {
      f[key] = isHeld(key) || this.pressed.has(key) || this.touchPressed.has(key);
    });
    this.pressed.clear();
    this.touchPressed.clear();
    return f;
  }

  clear() { this.held.clear(); this.pressed.clear(); this.touchHeld.clear(); this.touchPressed.clear(); }
}
