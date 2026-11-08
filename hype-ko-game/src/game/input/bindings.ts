import { InputBit } from '../combat/types';

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'lightPunch'
  | 'lightKick'
  | 'special1'
  | 'special2'
  | 'super'
  | 'hype'
  | 'finisher'
  | 'block'
  | 'grab'
  | 'tag';

export const ACTIONS: Action[] = [
  'left',
  'right',
  'up',
  'down',
  'lightPunch',
  'lightKick',
  'special1',
  'special2',
  'super',
  'hype',
  'finisher',
  'block',
  'grab',
  'tag'
];

export const ACTION_LABELS: Record<Action, string> = {
  left: 'Sinistra',
  right: 'Destra',
  up: 'Salto',
  down: 'Accovacciati',
  lightPunch: 'Pugno',
  lightKick: 'Calcio',
  special1: 'Speciale 1',
  special2: 'Speciale 2',
  super: 'Super',
  hype: 'Hype Breaker',
  finisher: 'Hype Finish',
  block: 'Parata',
  grab: 'Presa',
  tag: 'Cambio'
};

export const ACTION_BITS: Record<Action, number> = {
  left: InputBit.Left,
  right: InputBit.Right,
  up: InputBit.Up,
  down: InputBit.Down,
  lightPunch: InputBit.LightPunch,
  lightKick: InputBit.LightKick,
  special1: InputBit.Special1,
  special2: InputBit.Special2,
  super: InputBit.Super,
  hype: InputBit.Hype,
  finisher: InputBit.Finisher,
  block: InputBit.Block,
  grab: InputBit.Grab,
  tag: InputBit.Tag
};

export type Bindings = Record<Action, string[]>;

export const DEFAULT_P1_BINDINGS: Bindings = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  lightPunch: ['KeyJ'],
  lightKick: ['KeyK'],
  special1: ['KeyL'],
  special2: ['KeyP'],
  super: ['KeyI'],
  hype: ['KeyY'],
  finisher: ['KeyF'],
  block: ['ShiftLeft', 'ShiftRight'],
  grab: ['KeyU'],
  tag: ['KeyO']
};

export const DEFAULT_P2_BINDINGS: Bindings = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  lightPunch: ['Numpad1'],
  lightKick: ['Numpad2'],
  special1: ['Numpad3'],
  special2: ['Numpad5'],
  super: ['Numpad4'],
  hype: ['Numpad6'],
  finisher: ['Numpad7'],
  block: ['Numpad8'],
  grab: ['Numpad9'],
  tag: ['Numpad0']
};

export const KEY_LABELS: Record<string, string> = {
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyI: 'I',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  KeyM: 'M',
  KeyN: 'N',
  KeyO: 'O',
  KeyP: 'P',
  KeyQ: 'Q',
  KeyR: 'R',
  KeyS: 'S',
  KeyT: 'T',
  KeyU: 'U',
  KeyV: 'V',
  KeyW: 'W',
  KeyX: 'X',
  KeyY: 'Y',
  KeyZ: 'Z',
  ShiftLeft: 'Shift Sx',
  ShiftRight: 'Shift Dx',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: 'Spazio',
  Enter: 'Invio',
  Numpad0: 'Num0',
  Numpad1: 'Num1',
  Numpad2: 'Num2',
  Numpad3: 'Num3',
  Numpad4: 'Num4',
  Numpad5: 'Num5',
  Numpad6: 'Num6',
  Numpad7: 'Num7',
  Numpad8: 'Num8',
  Numpad9: 'Num9'
};

export function keyLabel(code: string): string {
  return KEY_LABELS[code] ?? code.replace('Key', '').replace('Digit', '');
}

export function cloneBindings(bindings: Bindings): Bindings {
  return Object.fromEntries(ACTIONS.map((action) => [action, [...bindings[action]]])) as Bindings;
}
