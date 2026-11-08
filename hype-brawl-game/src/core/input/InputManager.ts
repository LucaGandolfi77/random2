import {
  DEFAULT_BINDINGS,
  mergeInputs,
  NEUTRAL_INPUT,
  type InputFrame,
  type KeyboardBinding,
} from './InputTypes';
import { loadSetting, saveSetting } from '../../utils/storage';

export type BindAction = keyof KeyboardBinding;

export interface TouchInputState {
  active: boolean;
  moveX: number;
  moveY: number;
  jump: boolean;
  attack: boolean;
  strong: boolean;
  special: boolean;
  shield: boolean;
  grab: boolean;
  taunt: boolean;
}

const EMPTY_TOUCH: TouchInputState = {
  active: false,
  moveX: 0,
  moveY: 0,
  jump: false,
  attack: false,
  strong: false,
  special: false,
  shield: false,
  grab: false,
  taunt: false,
};

const GAME_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
  'Enter',
  'Comma',
  'Period',
  'Slash',
  'Semicolon',
  'Quote',
  'Backslash',
]);

export class InputManager {
  readonly bindings: [KeyboardBinding, KeyboardBinding];
  private keys = new Set<string>();
  private touch: TouchInputState = { ...EMPTY_TOUCH };
  private gamepadCount = 0;
  private padActive = [false, false, false, false];
  private pausePressed = false;
  private previousPauseHeld = false;
  private rebind: { slot: 0 | 1; action: BindAction } | null = null;
  private rebindListener: ((event: KeyboardEvent) => void) | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    const stored = loadSetting<[KeyboardBinding, KeyboardBinding]>('bindings', DEFAULT_BINDINGS);
    this.bindings = [
      { ...stored[0] },
      { ...stored[1] },
    ];
    window.addEventListener('keydown', this.onKeyDown, { capture: true });
    window.addEventListener('keyup', this.onKeyUp, { capture: true });
    window.addEventListener('blur', this.clearKeys);
    window.addEventListener('gamepadconnected', this.refreshGamepads);
    window.addEventListener('gamepaddisconnected', this.refreshGamepads);
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.rebind) {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        this.cancelRebind();
        return;
      }
      const { slot, action } = this.rebind;
      this.assignBinding(slot, action, event.code);
      this.finishRebind();
      return;
    }
    const binding = [...this.bindings[0] ? Object.values(this.bindings[0]).flat() : [], ...Object.values(this.bindings[1]).flat()];
    if (GAME_KEYS.has(event.code) || binding.includes(event.code) || event.code === 'Escape' || event.code === 'F2' || event.code === 'F3') {
      event.preventDefault();
    }
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (this.rebind) {
      event.preventDefault();
      return;
    }
    this.keys.delete(event.code);
  };

  private clearKeys = (): void => {
    this.keys.clear();
  };

  refreshGamepads = (): void => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.gamepadCount = pads.filter((pad) => pad && pad.connected).length;
    this.emitChange();
  };

  get connectedGamepads(): number {
    this.refreshGamepadsCount();
    return this.gamepadCount;
  }

  private refreshGamepadsCount(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.gamepadCount = pads.filter((pad) => pad && pad.connected).length;
  }

  hasAnyGamepad(): boolean {
    return this.connectedGamepads > 0;
  }

  playerUsesPad(slot: number): boolean {
    return this.padActive[slot] ?? false;
  }

  private padInput(index: number): InputFrame | null {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[index];
    if (!pad || !pad.connected) return null;
    const axisX = Math.abs(pad.axes[0] ?? 0) > 0.25 ? pad.axes[0] : 0;
    const axisY = Math.abs(pad.axes[1] ?? 0) > 0.3 ? -(pad.axes[1] ?? 0) : 0;
    const button = (i: number) => Boolean(pad.buttons[i]?.pressed);
    const dpadX = (button(15) ? 1 : 0) - (button(14) ? 1 : 0);
    const dpadY = (button(12) ? 1 : 0) - (button(13) ? 1 : 0);
    const active =
      Math.abs(axisX) > 0 || Math.abs(axisY) > 0 || pad.buttons.some((entry) => entry.pressed);
    if (active) this.padActive[index === 0 ? 0 : index] = true;
    const moveX = Math.abs(axisX) > 0 ? axisX : dpadX;
    const moveY = Math.abs(axisY) > 0 ? axisY : dpadY;
    return {
      moveX,
      moveY,
      jump: button(0),
      attack: button(1),
      strong: button(2),
      special: button(3),
      shield: button(4) || button(6),
      grab: button(5),
      taunt: button(7) || button(8),
    };
  }

  getInput(slot: number): InputFrame {
    let input: InputFrame = { ...NEUTRAL_INPUT };
    if (slot < 2) {
      const binding = this.bindings[slot];
      const held = (codes: string[]) => codes.some((code) => this.keys.has(code));
      const moveX = (held(binding.right) ? 1 : 0) - (held(binding.left) ? 1 : 0);
      const moveY = (held(binding.up) ? 1 : 0) - (held(binding.down) ? 1 : 0);
      input = {
        moveX,
        moveY,
        jump: held(binding.jump),
        attack: held(binding.attack),
        strong: held(binding.strong),
        special: held(binding.special),
        shield: held(binding.shield),
        grab: held(binding.grab),
        taunt: held(binding.taunt),
      };
      const pad = this.padInput(slot);
      if (pad) input = mergeInputs(input, pad);
    } else {
      const pad = this.padInput(slot);
      if (pad) input = pad;
    }
    if (slot === 0 && this.touch.active) {
      const touchInput: InputFrame = {
        moveX: this.touch.moveX,
        moveY: this.touch.moveY,
        jump: this.touch.jump,
        attack: this.touch.attack,
        strong: this.touch.strong,
        special: this.touch.special,
        shield: this.touch.shield,
        grab: this.touch.grab,
        taunt: this.touch.taunt,
      };
      input = mergeInputs(input, touchInput);
    }
    return input;
  }

  setTouchInput(state: TouchInputState): void {
    this.touch = state;
  }

  clearTouch(): void {
    this.touch = { ...EMPTY_TOUCH };
  }

  get pauseRequested(): boolean {
    return this.pausePressed;
  }

  queuePause(): void {
    this.pausePressed = true;
  }

  pollPause(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const startHeld = pads.some((pad) => pad?.connected && Boolean(pad.buttons[9]?.pressed));
    const pauseHeld = startHeld;
    if (pauseHeld && !this.previousPauseHeld) this.pausePressed = true;
    this.previousPauseHeld = pauseHeld;
  }

  consumePause(): boolean {
    const value = this.pausePressed;
    this.pausePressed = false;
    return value;
  }

  beginRebind(slot: 0 | 1, action: BindAction): void {
    this.cancelRebind();
    this.rebind = { slot, action };
    this.rebindListener = (event: KeyboardEvent) => {
      if (!this.rebind) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        this.finishRebind();
        return;
      }
      this.assignBinding(this.rebind.slot, this.rebind.action, event.code);
      this.finishRebind();
    };
    window.addEventListener('keydown', this.rebindListener, { capture: true, once: true });
  }

  cancelRebind(): void {
    if (this.rebindListener) {
      window.removeEventListener('keydown', this.rebindListener, { capture: true });
    }
    this.rebind = null;
    this.rebindListener = null;
  }

  finishRebind(): void {
    this.rebind = null;
    if (this.rebindListener) {
      window.removeEventListener('keydown', this.rebindListener, { capture: true });
      this.rebindListener = null;
    }
    saveSetting('bindings', this.bindings);
    this.emitChange();
  }

  private assignBinding(slot: 0 | 1, action: BindAction, code: string): void {
    const binding = this.bindings[slot];
    for (const key of Object.keys(binding) as BindAction[]) {
      binding[key] = binding[key].filter((entry) => entry !== code);
    }
    binding[action] = [code];
  }

  resetBindings(): void {
    this.bindings[0] = { ...DEFAULT_BINDINGS[0] };
    this.bindings[1] = { ...DEFAULT_BINDINGS[1] };
    saveSetting('bindings', this.bindings);
    this.emitChange();
  }

  isPressed(code: string): boolean {
    return this.keys.has(code);
  }

  get bindingLabels(): [Record<BindAction, string>, Record<BindAction, string>] {
    const format = (binding: KeyboardBinding): Record<BindAction, string> => {
      const entries = Object.entries(binding) as Array<[BindAction, string[]]>;
      return Object.fromEntries(entries.map(([action, codes]) => [action, codes.map(prettyKey).join(' / ')])) as Record<BindAction, string>;
    };
    return [format(this.bindings[0]), format(this.bindings[1])];
  }
}

export function prettyKey(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  const named: Record<string, string> = {
    Space: 'SPACE',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    Enter: 'ENTER',
    Escape: 'ESC',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Semicolon: ';',
    Quote: "'",
    Backslash: '\\',
    ShiftLeft: 'L SHIFT',
    ShiftRight: 'R SHIFT',
    ControlLeft: 'L CTRL',
    ControlRight: 'R CTRL',
    AltLeft: 'L ALT',
    AltRight: 'R ALT',
    Tab: 'TAB',
  };
  return named[code] ?? code;
}
