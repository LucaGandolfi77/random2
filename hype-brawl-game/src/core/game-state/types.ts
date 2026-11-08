export type GameMode = 'stock' | 'time' | 'team' | 'training' | 'spectator';
export type ItemFrequency = 'off' | 'low' | 'normal' | 'chaos';
export type ItemKind =
  | 'hypeBattery'
  | 'goldenMic'
  | 'speakerDrone'
  | 'glitchCapsule'
  | 'megaBurger'
  | 'rocketSneakers'
  | 'commentBomb'
  | 'turboCan';

export interface PlayerConfig {
  slot: number;
  fighterId: string;
  human: boolean;
  team: 0 | 1;
  colorIndex: number;
}

export interface TrainingOptions {
  infiniteJumps?: boolean;
  infiniteMeter?: boolean;
}

export interface MatchConfig {
  mode: GameMode;
  players: PlayerConfig[];
  stocks: number;
  timeLimitSeconds: number;
  items: ItemFrequency;
  hazards: boolean;
  stageId: string;
  seed: number;
  skipIntro?: boolean;
  trainingOptions?: TrainingOptions;
}

export type FighterState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'crouch'
  | 'air'
  | 'landing'
  | 'hitstun'
  | 'shield'
  | 'shieldstun'
  | 'shieldbreak'
  | 'roll'
  | 'airdodge'
  | 'attack'
  | 'charge'
  | 'grabbing'
  | 'grabbed'
  | 'ledge'
  | 'dead'
  | 'victory'
  | 'taunt';

export type SimEvent =
  | { type: 'hit'; x: number; y: number; damage: number; power: number; shielded: boolean; attacker: number; target: number; effect: string }
  | { type: 'ko'; x: number; y: number; player: number; by: number | null }
  | { type: 'respawn'; player: number; x: number; y: number }
  | { type: 'jump'; player: number; x: number; y: number; double: boolean }
  | { type: 'land'; player: number; x: number; y: number }
  | { type: 'shield'; player: number; x: number; y: number; broken: boolean }
  | { type: 'grab'; attacker: number; target: number }
  | { type: 'throw'; attacker: number; target: number }
  | { type: 'clash'; x: number; y: number; priority: number }
  | { type: 'hype'; player: number; x: number; y: number }
  | { type: 'ledge'; player: number }
  | { type: 'charge'; player: number; x: number; y: number }
  | { type: 'itemSpawn'; kind: ItemKind; x: number; y: number; id: number }
  | { type: 'itemPickup'; kind: ItemKind; player: number; x: number; y: number }
  | { type: 'projectile'; kind: string; x: number; y: number }
  | { type: 'announce'; text: string }
  | { type: 'matchOver'; winners: number[] };
