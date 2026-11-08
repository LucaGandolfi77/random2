export interface InputFrame {
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

export interface ButtonPress {
  jump: boolean;
  attack: boolean;
  strong: boolean;
  strongRelease: boolean;
  special: boolean;
  shield: boolean;
  shieldRelease: boolean;
  grab: boolean;
  taunt: boolean;
}

export const NEUTRAL_INPUT: InputFrame = {
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

export function cloneInput(input: InputFrame): InputFrame {
  return { ...input };
}

export function mergeInputs(a: InputFrame, b: InputFrame): InputFrame {
  return {
    moveX: Math.abs(a.moveX) >= Math.abs(b.moveX) ? a.moveX : b.moveX,
    moveY: Math.abs(a.moveY) >= Math.abs(b.moveY) ? a.moveY : b.moveY,
    jump: a.jump || b.jump,
    attack: a.attack || b.attack,
    strong: a.strong || b.strong,
    special: a.special || b.special,
    shield: a.shield || b.shield,
    grab: a.grab || b.grab,
    taunt: a.taunt || b.taunt,
  };
}

export function pressedButtons(input: InputFrame, previous: InputFrame): ButtonPress {
  return {
    jump: input.jump && !previous.jump,
    attack: input.attack && !previous.attack,
    strong: input.strong && !previous.strong,
    strongRelease: !input.strong && previous.strong,
    special: input.special && !previous.special,
    shield: input.shield && !previous.shield,
    shieldRelease: !input.shield && previous.shield,
    grab: input.grab && !previous.grab,
    taunt: input.taunt && !previous.taunt,
  };
}

export interface KeyboardBinding {
  left: string[];
  right: string[];
  up: string[];
  down: string[];
  jump: string[];
  attack: string[];
  strong: string[];
  special: string[];
  shield: string[];
  grab: string[];
  taunt: string[];
}

export const DEFAULT_BINDINGS: [KeyboardBinding, KeyboardBinding] = [
  {
    left: ['KeyA'],
    right: ['KeyD'],
    up: ['KeyW'],
    down: ['KeyS'],
    jump: ['KeyW', 'Space'],
    attack: ['KeyF'],
    strong: ['KeyG'],
    special: ['KeyH'],
    shield: ['KeyJ'],
    grab: ['KeyK'],
    taunt: ['KeyT'],
  },
  {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    jump: ['ArrowUp', 'Enter'],
    attack: ['Comma'],
    strong: ['Period'],
    special: ['Slash'],
    shield: ['Semicolon'],
    grab: ['Quote'],
    taunt: ['Backslash'],
  },
];
