export type MoveSlot =
  | 'jab'
  | 'sideTilt'
  | 'upTilt'
  | 'downTilt'
  | 'sideStrong'
  | 'upStrong'
  | 'downStrong'
  | 'neutralAir'
  | 'forwardAir'
  | 'backAir'
  | 'upAir'
  | 'downAir'
  | 'neutralSpecial'
  | 'sideSpecial'
  | 'upSpecial'
  | 'downSpecial'
  | 'grab'
  | 'throwForward'
  | 'throwBack'
  | 'throwUp'
  | 'throwDown'
  | 'taunt';

export type MoveKind = 'ground' | 'aerial' | 'special' | 'grab' | 'throw' | 'taunt';
export type VisualEffect =
  | 'punch'
  | 'kick'
  | 'sound'
  | 'flash'
  | 'fire'
  | 'speed'
  | 'pan'
  | 'explosion'
  | 'spark'
  | 'hype';

export interface HitboxData {
  start: number;
  end: number;
  offsetX: number;
  offsetY: number;
  radius: number;
  damage: number;
  angle: number;
  baseKnockback: number;
  knockbackGrowth: number;
  hitstop: number;
  shieldDamage?: number;
  priority?: number;
  meteor?: boolean;
  effect?: VisualEffect;
}

export interface GrabboxData {
  start: number;
  end: number;
  offsetX: number;
  offsetY: number;
  radius: number;
}

export interface ThrowHit {
  damage: number;
  angle: number;
  baseKnockback: number;
  knockbackGrowth: number;
  hitstop: number;
  effect?: VisualEffect;
}

export interface MoveImpulse {
  frame: number;
  vx?: number;
  vy?: number;
  relativeToFacing?: boolean;
  preserveMomentum?: boolean;
}

export interface ProjectileSpawnData {
  atFrame: number;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  damage: number;
  angle: number;
  baseKnockback: number;
  knockbackGrowth: number;
  life: number;
  visual: VisualEffect;
  hitstop?: number;
}

export interface MoveData {
  slot: MoveSlot;
  name: string;
  kind: MoveKind;
  totalFrames: number;
  hits: HitboxData[];
  grabbox?: GrabboxData;
  throwHit?: ThrowHit;
  impulses?: MoveImpulse[];
  projectiles?: ProjectileSpawnData[];
  intangibility?: [number, number];
  landingLag?: number;
  chargeable?: boolean;
  effect?: VisualEffect;
  selfBuff?: {
    atFrame: number;
    speedFrames?: number;
    jumpFrames?: number;
    meter?: number;
  };
}

export interface FighterStats {
  weight: number;
  walkSpeed: number;
  runSpeed: number;
  airSpeed: number;
  airAcceleration: number;
  gravity: number;
  jumpVelocity: number;
  doubleJumpVelocity: number;
  maxFallSpeed: number;
  fastFallSpeed: number;
  groundAcceleration: number;
  groundFriction: number;
  airFriction: number;
  airJumps: number;
  knockbackResistance: number;
  attackPower: number;
  recoveryPower: number;
  width: number;
  height: number;
}

export interface FighterPalette {
  name: string;
  skin: number;
  primary: number;
  secondary: number;
  accent: number;
  hair: number;
  dark: number;
}

export interface MoveSummary {
  name: string;
  description: string;
}

export interface FighterDefinition {
  id: string;
  name: string;
  title: string;
  archetype: string;
  description: string;
  playable: boolean;
  stats: FighterStats;
  palettes: FighterPalette[];
  moves: Record<MoveSlot, MoveData>;
  moveHighlights: string[];
  statsBars: { power: number; speed: number; weight: number; recovery: number };
  modelStyle: 'nero' | 'velvet' | 'zia' | 'ace';
}

export type MoveSlotMap = Record<MoveSlot, MoveData>;
