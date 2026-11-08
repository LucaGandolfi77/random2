import { neutralInput, type InputState } from '../combat/types';
import {
  ACTION_BITS,
  ACTIONS,
  cloneBindings,
  DEFAULT_P1_BINDINGS,
  DEFAULT_P2_BINDINGS,
  type Action,
  type Bindings
} from './bindings';

const GAMEPAD_BUTTONS: Record<number, Action> = {
  0: 'lightPunch',
  1: 'lightKick',
  2: 'special1',
  3: 'special2',
  4: 'super',
  5: 'hype',
  6: 'block',
  7: 'grab',
  8: 'finisher',
  9: 'tag'
};

const GAMEPAD_DPAD: Record<number, Action> = {
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right'
};

export class InputManager {
  private bindings: [Bindings, Bindings];
  private held: [number, number] = [0, 0];
  private pressed: [number, number] = [0, 0];
  private padHeld: [number, number] = [0, 0];
  private padPrev: [number, number] = [0, 0];
  private virtualHeld: [number, number] = [0, 0];
  private readonly keyToPlayer = new Map<string, { player: number; action: Action }[]>();
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private readonly onKeyUp: (event: KeyboardEvent) => void;
  private readonly onBlur: () => void;
  private target: Window | HTMLElement;

  constructor(
    p1: Bindings = DEFAULT_P1_BINDINGS,
    p2: Bindings = DEFAULT_P2_BINDINGS,
    target: Window | HTMLElement = window
  ) {
    this.bindings = [cloneBindings(p1), cloneBindings(p2)];
    this.target = target;
    this.rebuildKeyMap();
    this.onKeyDown = (event) => this.handleKeyDown(event);
    this.onKeyUp = (event) => this.handleKeyUp(event);
    this.onBlur = () => this.clear();
    target.addEventListener('keydown', this.onKeyDown as EventListener);
    target.addEventListener('keyup', this.onKeyUp as EventListener);
    window.addEventListener('blur', this.onBlur);
  }

  private rebuildKeyMap(): void {
    this.keyToPlayer.clear();
    for (let player = 0; player < 2; player++) {
      for (const action of ACTIONS) {
        for (const code of this.bindings[player][action]) {
          const entries = this.keyToPlayer.get(code) ?? [];
          entries.push({ player, action });
          this.keyToPlayer.set(code, entries);
        }
      }
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isTypingTarget(event.target)) return;
    const entries = this.keyToPlayer.get(event.code);
    if (!entries || entries.length === 0) return;
    event.preventDefault();
    if (event.repeat) return;
    for (const { player, action } of entries) {
      const bit = ACTION_BITS[action];
      this.held[player] |= bit;
      this.pressed[player] |= bit;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const entries = this.keyToPlayer.get(event.code);
    if (!entries) return;
    for (const { player, action } of entries) {
      const bit = ACTION_BITS[action];
      this.held[player] &= ~bit;
    }
  }

  setBindings(player: 0 | 1, bindings: Bindings): void {
    this.bindings[player] = cloneBindings(bindings);
    this.rebuildKeyMap();
  }

  getBindings(player: 0 | 1): Bindings {
    return cloneBindings(this.bindings[player]);
  }

  setVirtual(player: 0 | 1, action: Action, down: boolean): void {
    const bit = ACTION_BITS[action];
    if (down) {
      if (!(this.virtualHeld[player] & bit)) {
        this.pressed[player] |= bit;
      }
      this.virtualHeld[player] |= bit;
    } else {
      this.virtualHeld[player] &= ~bit;
    }
  }

  private pollGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    for (let player = 0; player < 2; player++) {
      const pad = pads[player];
      let mask = 0;
      if (pad) {
        const [axisX = 0, axisY = 0] = pad.axes;
        if (axisX < -0.35 || pad.buttons[14]?.pressed) mask |= ACTION_BITS.left;
        if (axisX > 0.35 || pad.buttons[15]?.pressed) mask |= ACTION_BITS.right;
        if (axisY < -0.45 || pad.buttons[12]?.pressed) mask |= ACTION_BITS.up;
        if (axisY > 0.45 || pad.buttons[13]?.pressed) mask |= ACTION_BITS.down;
        for (const [index, action] of Object.entries(GAMEPAD_BUTTONS)) {
          if (pad.buttons[Number(index)]?.pressed) mask |= ACTION_BITS[action];
        }
        for (const [index, action] of Object.entries(GAMEPAD_DPAD)) {
          if (pad.buttons[Number(index)]?.pressed) mask |= ACTION_BITS[action];
        }
      }
      this.padHeld[player] = mask;
      this.pressed[player] |= mask & ~this.padPrev[player];
      this.padPrev[player] = mask;
    }
  }

  poll(): [InputState, InputState] {
    this.pollGamepads();
    const result: [InputState, InputState] = [neutralInput(), neutralInput()];
    for (let player = 0; player < 2; player++) {
      result[player] = {
        held: this.held[player] | this.padHeld[player] | this.virtualHeld[player],
        pressed: this.pressed[player]
      };
      this.pressed[player] = 0;
    }
    return result;
  }

  clear(): void {
    this.held = [0, 0];
    this.pressed = [0, 0];
    this.padHeld = [0, 0];
    this.padPrev = [0, 0];
    this.virtualHeld = [0, 0];
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.target.removeEventListener('keyup', this.onKeyUp as EventListener);
    window.removeEventListener('blur', this.onBlur);
  }
}
