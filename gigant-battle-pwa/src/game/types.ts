export type FighterState = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'hurt' | 'block' | 'dodge' | 'ko' | 'victory' | 'assist';
export type AttackKind = 'light1' | 'light2' | 'light3' | 'heavy' | 'special';

export interface AttackDef {
  kind: AttackKind;
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  range: number;
  height: number;
  knockback: number;
  hitstun: number;
  energyGain: number;
  launch?: number;
}

export interface InputFrame {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
  dodge: boolean;
  assist1: boolean;
  assist2: boolean;
  block: boolean;
}

export interface Platform { x: number; y: number; w: number; h: number }

export interface HitEvent {
  attacker: string;
  target: string;
  damage: number;
  x: number;
  y: number;
  combo: number;
  heavy: boolean;
}

export const emptyInput = (): InputFrame => ({
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, dodge: false,
  assist1: false, assist2: false, block: false
});
