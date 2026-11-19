export type BroId = 'pip' | 'pop';
export type Element = 'fire' | 'thunder' | 'none';
export type MoveKind = 'jump' | 'hammer' | 'hand' | 'bros' | 'power';
export type StatusKind = 'stun' | 'burn' | 'shock' | 'defdown';

export interface BroDef {
  id: BroId;
  name: string;
  role: string;
  colors: { cap: string; shirt: string; overalls: string; skin: string; boots: string };
  element: Element;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xp: number;
  weak: MoveKind | Element | null;
  resist: MoveKind | Element | null;
  boss: boolean;
  colors: { body: string; accent: string; eye: string };
  telegraph: 'jump' | 'hammer' | 'blast';
  dialogue: string;
}

export interface AreaDef {
  id: string;
  name: string;
  subtitle: string;
  seed: number;
  size: [number, number];
  enemies: string[];
  boss?: string;
  ground: string;
  wall: string;
  accent: string;
  sky: string;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: 'heal' | 'boost' | 'revive';
  value: number;
}

export interface BroState {
  id: BroId;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  power: number;
  defense: number;
  speed: number;
  fainted: boolean;
}

export interface BattleMove {
  id: string;
  name: string;
  kind: MoveKind;
  power: number;
  bp?: number;
  owner?: BroId;
  description: string;
  status?: StatusKind;
  unlockLevel?: number;
}

export interface BadgeEffects {
  power?: number;
  defense?: number;
  speed?: number;
  maxHp?: number;
  timing?: number;
  loot?: number;
  perfect?: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  effects: BadgeEffects;
}

export interface PowerDef {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  bp: number;
  moveId?: string;
}

export type MinigameId = 'coinrush' | 'hammertoss' | 'jumprope' | 'recipedash' | 'cardmatch';

export interface MinigameDef {
  id: MinigameId;
  name: string;
  description: string;
  instruction: string;
  seconds: number;
  reward: { coins: number; bp: number; badge?: string; item?: string };
}

export interface MinigameView {
  id: MinigameId;
  phase: 'ready' | 'play' | 'result';
  time: number;
  score: number;
  target: number;
  cursor: number;
  hits: number;
  missed: number;
  message: string;
  rewardCoins: number;
  rewardBp: number;
}

export type BattlePhase = 'intro' | 'command' | 'timing' | 'resolve' | 'enemy' | 'defend' | 'victory' | 'defeat';
