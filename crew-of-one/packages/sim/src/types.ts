export const SIM_DT = 1 / 60;
export const RECORD_HZ = 30;

export type Vec2 = { x: number; y: number };

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PlateDef = {
  id: string;
  x: number;
  y: number;
  radius: number;
  mode: 'hold' | 'latch';
  targets: string[];
};

export type DoorDef = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  mode: 'plate' | 'lever' | 'oneway';
  passDirection?: Direction;
};

export type GuardDef = {
  id: string;
  path: Vec2[];
  waitMs: number;
  speed: number;
  visionRange: number;
  visionAngleDeg: number;
  hearingRadius: number;
  facing?: Direction;
};

export type CameraDef = {
  id: string;
  x: number;
  y: number;
  facing: Direction;
  fovDeg: number;
  range: number;
  sweepDeg: number;
  sweepMs: number;
  phaseMs: number;
};

export type LeverDef = {
  id: string;
  x: number;
  y: number;
  radius: number;
  mode: 'hold' | 'toggle';
  targetIds: string[];
  disableMs?: number;
};

export type LaserDef = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onMs: number;
  offMs: number;
  phaseMs: number;
};

export type NoiseEvent = {
  x: number;
  y: number;
  radius: number;
  createdAt: number;
  ttlMs: number;
};

export type GemDef = {
  x: number;
  y: number;
  radius: number;
};

export type GemState = {
  x: number;
  y: number;
  radius: number;
  holder: 'world' | 'player' | string;
};

export type VaultDef = {
  id: string;
  name: string;
  chapter: number;
  loopSeconds: number;
  maxEchoes: number;
  parEchoes: number;
  tilesX: number;
  tilesY: number;
  tileSize: number;
  playerStart: Vec2;
  exit: { x: number; y: number; radius: number };
  walls: Rect[];
  plates: PlateDef[];
  doors: DoorDef[];
  guards: GuardDef[];
  cameras: CameraDef[];
  levers: LeverDef[];
  lasers: LaserDef[];
  gem?: GemDef;
  requiresGem: boolean;
  dashEnabled?: boolean;
  fog?: boolean;
  hints: string[];
};

export type GhostEvent = {
  type: 'interact' | 'noise' | 'grab' | 'drop';
  targetId?: string;
  radius?: number;
};

export type GhostFrame = {
  t: number;
  x: number;
  y: number;
  dir: 0 | 1 | 2 | 3;
  anim: 'idle' | 'walk' | 'dash' | 'interact';
  events?: GhostEvent[];
};

export type EchoSymbol =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'star'
  | 'cross';

export type EchoColor = 0x5bc0eb | 0xf6c85f | 0xe63946 | 0x8ac926 | 0xc77dff | 0xff8c42;

export type GhostTrack = {
  id: string;
  symbol: EchoSymbol;
  color: EchoColor;
  frames: GhostFrame[];
  durationMs: number;
};

export type Direction = 0 | 1 | 2 | 3;

export type PlayerState = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  facing: Direction;
  carryingGem: boolean;
};

export type GhostState = {
  id: string;
  symbol: EchoSymbol;
  color: EchoColor;
  x: number;
  y: number;
  facing: Direction;
  active: boolean;
  frameIndex: number;
  track: GhostTrack;
};

export type PlateState = {
  id: string;
  x: number;
  y: number;
  radius: number;
  mode: 'hold' | 'latch';
  targets: string[];
  pressed: boolean;
  latched: boolean;
};

export type DoorState = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  mode: 'plate' | 'lever' | 'oneway';
  passDirection?: Direction;
  open: boolean;
};

export type GuardMode = 'patrol' | 'investigate' | 'follow' | 'confused';

export type GuardState = {
  id: string;
  x: number;
  y: number;
  facing: Direction;
  mode: GuardMode;
  path: Vec2[];
  waypointIndex: number;
  waitRemainingMs: number;
  waitMs: number;
  speed: number;
  visionRange: number;
  visionAngleDeg: number;
  hearingRadius: number;
  suspicion: number;
  targetGhostId: string | null;
  investigateX: number;
  investigateY: number;
  confusedMs: number;
};

export type CameraState = {
  id: string;
  x: number;
  y: number;
  baseAngle: number;
  angle: number;
  fovDeg: number;
  range: number;
  sweepDeg: number;
  sweepMs: number;
  phaseMs: number;
  suspicion: number;
  disabled: boolean;
};

export type LeverState = {
  id: string;
  x: number;
  y: number;
  radius: number;
  mode: 'hold' | 'toggle';
  targetIds: string[];
  disableMs: number;
  activeUntilMs: number;
  pressed: boolean;
};

export type LaserState = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onMs: number;
  offMs: number;
  phaseMs: number;
  active: boolean;
};

export type SimStatus = 'playing' | 'won' | 'alarm' | 'timeout';

export type SimInput = {
  moveX: number;
  moveY: number;
  interact: boolean;
  dash: boolean;
};

export type SimState = {
  status: SimStatus;
  tick: number;
  timeMs: number;
  loopMs: number;
  echoesUsed: number;
  maxEchoes: number;
  player: PlayerState;
  ghosts: GhostState[];
  plates: PlateState[];
  doors: DoorState[];
  guards: GuardState[];
  cameras: CameraState[];
  levers: LeverState[];
  lasers: LaserState[];
  gem: GemState | null;
  noises: NoiseEvent[];
  tracks: GhostTrack[];
  currentTrack: GhostFrame[];
};

export type RewindResult =
  | { ok: true; echoesUsed: number }
  | { ok: false; reason: 'won' | 'max-echoes' };

export type ValidationIssue = {
  code: string;
  message: string;
  trackId?: string;
  frameIndex?: number;
};

export type RunSubmission = {
  vaultId: string;
  echoes: number;
  timeMs: number;
  tracks: GhostTrack[];
};
