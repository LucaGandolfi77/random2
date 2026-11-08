export const InputBit = {
  Left: 1 << 0,
  Right: 1 << 1,
  Up: 1 << 2,
  Down: 1 << 3,
  LightPunch: 1 << 4,
  LightKick: 1 << 5,
  Special1: 1 << 6,
  Special2: 1 << 7,
  Super: 1 << 8,
  Hype: 1 << 9,
  Finisher: 1 << 10,
  Block: 1 << 11,
  Grab: 1 << 12,
  Tag: 1 << 13
} as const;

export type InputMask = number;

export interface InputState {
  held: number;
  pressed: number;
}

export function neutralInput(): InputState {
  return { held: 0, pressed: 0 };
}

export const NEUTRAL_INPUT: InputState = Object.freeze({ held: 0, pressed: 0 });

export interface FighterStats {
  power: number;
  speed: number;
  range: number;
  technique: number;
  defense: number;
}

export interface HitboxDef {
  x: number;
  y: number;
  w: number;
  h: number;
  from: number;
  to: number;
}

export type MoveKind =
  | 'light'
  | 'heavy'
  | 'special'
  | 'super'
  | 'finisher'
  | 'throw'
  | 'tag'
  | 'hype';

export type BehaviorType =
  | 'melee'
  | 'projectile'
  | 'dash'
  | 'uppercut'
  | 'shockwave'
  | 'teleport'
  | 'buff'
  | 'counter'
  | 'whip'
  | 'zone'
  | 'explosion'
  | 'commandGrab'
  | 'flash'
  | 'rain'
  | 'pull'
  | 'piano';

export interface ProjectileSpec {
  speed: number;
  vy?: number;
  gravity?: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  radius: number;
  life: number;
  count?: number;
  spread?: number;
  returning?: boolean;
  fromSky?: boolean;
  pierce?: boolean;
  pull?: number;
  vfx: string;
  color: string;
  unblockable?: boolean;
}

export interface BuffSpec {
  damage?: number;
  speed?: number;
  defense?: number;
  armor?: boolean;
  heal?: number;
  duration: number;
}

export interface ZoneSpec {
  duration: number;
  tickDamage: number;
  interval: number;
  radius: number;
  pull?: number;
  vfx: string;
  color: string;
}

export interface MoveBehavior {
  type: BehaviorType;
  spawnFrame?: number;
  projectile?: ProjectileSpec;
  distance?: number;
  behind?: boolean;
  buff?: BuffSpec;
  counterWindow?: number;
  counterDamage?: number;
  counterHitstun?: number;
  radius?: number;
  pull?: number;
  zone?: ZoneSpec;
  explosion?: {
    delay: number;
    damage: number;
    radius: number;
    atOpponent: boolean;
    behind: boolean;
    hitstun?: number;
  };
  stun?: number;
  rain?: { count: number; spread: number; delay: number };
}

export interface MoveDef {
  id: string;
  name: string;
  kind: MoveKind;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chip?: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  knockback: number;
  lift?: number;
  launcher?: boolean;
  hitboxes: HitboxDef[];
  meterGainHit?: number;
  meterGainBlock?: number;
  hypeGainHit?: number;
  superCost?: number;
  hypeCost?: number;
  cancelInto?: MoveKind[];
  cancelWindow?: [number, number];
  behavior?: MoveBehavior;
  movement?: { x?: number; y?: number; atFrame?: number; duration?: number };
  invuln?: [number, number];
  armor?: number;
  unblockable?: boolean;
  requiresAir?: boolean;
  requiresGround?: boolean;
  vfx?: string;
  sfx?: string;
  hits?: number;
  hitInterval?: number;
  isFinisher?: boolean;
  isSuper?: boolean;
  pull?: number;
  stun?: number;
  knockdown?: boolean;
}

export function moveTotalFrames(move: MoveDef): number {
  return move.startup + move.active + move.recovery;
}

export interface CombatFighterDefinition {
  id: string;
  name: string;
  subtitle: string;
  stats: FighterStats;
  moves: Record<string, MoveDef>;
  specials: { s1: string; s2: string };
  superMove: string;
  finisher: string;
  hypeBreaker: string;
  height: number;
  weight: number;
}

export type GameModeId =
  | 'quick'
  | 'training'
  | 'tournament'
  | 'team'
  | 'rumble'
  | 'spectator'
  | 'online'
  | 'ranked';

export interface MatchConfig {
  mode: GameModeId;
  stageId: string;
  roundsToWin: number;
  roundTime: number;
  fighters: CombatFighterDefinition[];
  teams: number[][];
  teamSize: number;
  rumble: boolean;
  infiniteHealth?: boolean;
  infiniteMeter?: boolean;
  dummyMode?: 'stand' | 'block' | 'counter' | 'cpu';
  eventsEnabled?: boolean;
  seed?: number;
}

export type FighterStateId =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'attack'
  | 'hitstun'
  | 'blockstun'
  | 'block'
  | 'knockdown'
  | 'wakeup'
  | 'ko'
  | 'victory'
  | 'defeat'
  | 'intro'
  | 'tagIn'
  | 'tagOut'
  | 'finisher'
  | 'finisherVictim'
  | 'stunned';

export interface ActiveBuff {
  id: string;
  damage: number;
  speed: number;
  defense: number;
  armor: boolean;
  frames: number;
}

export interface BufferedInput {
  mask: number;
  frame: number;
}

export interface FighterState {
  index: number;
  charId: string;
  def: CombatFighterDefinition;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  maxHealth: number;
  super: number;
  hype: number;
  state: FighterStateId;
  stateFrame: number;
  moveId: string | null;
  move: MoveDef | null;
  moveFrame: number;
  moveHitMask: number;
  moveContact: boolean;
  lastHitFrames: number[];
  hitsLanded: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  stun: number;
  blocking: boolean;
  crouching: boolean;
  airborne: boolean;
  invuln: number;
  armor: number;
  parryBuffer: number;
  tagCooldown: number;
  buffs: ActiveBuff[];
  cooldowns: Record<string, number>;
  inputBuffer: BufferedInput[];
  ko: boolean;
  active: boolean;
  roundsWon: number;
  totalDamageDealt: number;
  totalHits: number;
  flash: number;
  aura: number;
  lastHitBy: number;
  lastMoveName: string;
  walkDirection: number;
  dummyMode: 'stand' | 'block' | 'counter' | 'cpu';
}

export interface ProjectileState {
  id: number;
  owner: number;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  life: number;
  returning: boolean;
  fromSky: boolean;
  pierce: boolean;
  pull: number;
  unblockable: boolean;
  vfx: string;
  color: string;
  hitMask: number;
}

export interface ZoneState {
  id: number;
  owner: number;
  team: number;
  x: number;
  radius: number;
  life: number;
  tickDamage: number;
  interval: number;
  tickTimer: number;
  pull: number;
  vfx: string;
  color: string;
}

export interface ExplosionState {
  id: number;
  owner: number;
  team: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  hitstun: number;
  delay: number;
  vfx: string;
  color: string;
}

export interface FinisherRuntime {
  attacker: number;
  defender: number;
  moveId: string;
  timer: number;
  impactDone: boolean;
}

export type SimEvent =
  | {
      type: 'hit';
      attacker: number;
      defender: number;
      move: string;
      damage: number;
      blocked: boolean;
      counter: boolean;
      heavy: boolean;
      x: number;
      y: number;
    }
  | { type: 'block'; attacker: number; defender: number; move: string; x: number; y: number }
  | { type: 'parry'; attacker: number; defender: number; x: number; y: number }
  | { type: 'counter'; attacker: number; defender: number; x: number; y: number }
  | { type: 'ko'; loser: number; winner: number }
  | { type: 'roundStart'; round: number }
  | { type: 'roundEnd'; winner: number | null; reason: 'ko' | 'timeout' | 'draw' }
  | { type: 'matchEnd'; winner: number }
  | { type: 'combo'; fighter: number; count: number }
  | { type: 'special'; fighter: number; move: string }
  | { type: 'super'; fighter: number; move: string }
  | {
      type: 'finisher';
      attacker: number;
      defender: number;
      move: string;
      phase: 'start' | 'impact' | 'end';
    }
  | { type: 'hype'; fighter: number }
  | { type: 'tag'; team: number; from: number; to: number }
  | { type: 'projectile'; owner: number; x: number; y: number; vfx: string; color: string }
  | { type: 'zone'; owner: number; x: number; vfx: string; color: string }
  | { type: 'explosion'; owner: number; x: number; y: number; vfx: string; color: string }
  | { type: 'announce'; text: string }
  | { type: 'stun'; fighter: number }
  | { type: 'timeout' }
  | { type: 'buff'; fighter: number; buff: string }
  | { type: 'wall'; fighter: number; x: number }
  | { type: 'trainingReset' };

export type MatchPhase = 'intro' | 'fight' | 'roundEnd' | 'matchEnd' | 'finisher';

export interface SerializedFighter {
  index: number;
  charId: string;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  maxHealth: number;
  super: number;
  hype: number;
  state: FighterStateId;
  stateFrame: number;
  moveId: string | null;
  moveFrame: number;
  moveHitMask: number;
  moveContact: boolean;
  lastHitFrames: number[];
  hitsLanded: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  stun: number;
  blocking: boolean;
  crouching: boolean;
  airborne: boolean;
  invuln: number;
  armor: number;
  parryBuffer: number;
  tagCooldown: number;
  buffs: ActiveBuff[];
  ko: boolean;
  active: boolean;
  roundsWon: number;
  totalDamageDealt: number;
  totalHits: number;
  flash: number;
  aura: number;
  lastHitBy: number;
  lastMoveName: string;
  walkDirection: number;
}

export interface SimSnapshot {
  frame: number;
  round: number;
  timerFrames: number;
  phase: MatchPhase;
  introTimer: number;
  roundEndTimer: number;
  hitstop: number;
  matchWinner: number | null;
  roundWinner: number | null;
  fighters: SerializedFighter[];
  projectiles: ProjectileState[];
  zones: ZoneState[];
  explosions: ExplosionState[];
  finisher: FinisherRuntime | null;
  pendingSwitches: { team: number; timer: number; x: number; from: number }[];
  nextProjectileId: number;
  nextZoneId: number;
  nextExplosionId: number;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function isMeleeBehavior(type: BehaviorType | undefined): boolean {
  if (!type) return true;
  return (
    type === 'melee' ||
    type === 'dash' ||
    type === 'uppercut' ||
    type === 'whip' ||
    type === 'pull' ||
    type === 'commandGrab' ||
    type === 'teleport'
  );
}
