export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export type EnvId =
  | 'prison'
  | 'bakery'
  | 'jobOffice'
  | 'belleville'
  | 'gare'
  | 'phoneCorner'
  | 'nightAvenue'
  | 'metroEntrance'
  | 'hospitalCorridor'
  | 'hospitalRoom'
  | 'laundrette'
  | 'dawnStreet';

export type ActorId =
  | 'etienne'
  | 'renaud'
  | 'mina'
  | 'aicha'
  | 'rose'
  | 'guard'
  | 'baker'
  | 'clerk'
  | 'nurse'
  | 'passerby';

export type PoseName =
  | 'idle'
  | 'talk'
  | 'sit'
  | 'stand'
  | 'embrace'
  | 'hug'
  | 'holdPhoto'
  | 'holdTape'
  | 'holdPaper'
  | 'lookDown'
  | 'lookUp'
  | 'handInHand';

export type Emotion =
  | 'neutral'
  | 'sad'
  | 'tired'
  | 'angry'
  | 'surprised'
  | 'confused'
  | 'tender'
  | 'wry'
  | 'afraid'
  | 'hopeful';

export interface MoveSpec {
  actor: ActorId;
  to: Vec2;
  dur: number;
  face?: number;
}

export interface RawLineBeat {
  kind: 'line';
  dur: number;
  shot: string;
  speaker: string;
  text: string;
  emotion?: Emotion;
  poses?: Partial<Record<ActorId, PoseName>>;
  moves?: MoveSpec[];
}

export interface RawHoldBeat {
  kind: 'hold';
  dur: number;
  shot: string;
  note?: string;
  poses?: Partial<Record<ActorId, PoseName>>;
  moves?: MoveSpec[];
}

export interface RawActionBeat {
  kind: 'action';
  dur: number;
  shot: string;
  note?: string;
  event?: string;
  params?: Record<string, number | string | boolean>;
  poses?: Partial<Record<ActorId, PoseName>>;
  moves?: MoveSpec[];
}

export type RawBeat = RawLineBeat | RawHoldBeat | RawActionBeat;

export interface RawScene {
  id: string;
  env: EnvId;
  beats: RawBeat[];
}

export interface RawAct {
  id: string;
  title: string;
  scenes: RawScene[];
}

export interface RawScript {
  meta: {
    title: string;
    subtitle: string;
    language: string;
    year: number;
  };
  acts: RawAct[];
}

export interface CompiledBeat {
  id: string;
  kind: RawBeat['kind'];
  sceneId: string;
  actId: string;
  env: EnvId;
  start: number;
  end: number;
  dur: number;
  shot: string;
  speaker?: string;
  text?: string;
  emotion?: Emotion;
  event?: string;
  params?: Record<string, number | string | boolean>;
  poses?: Partial<Record<ActorId, PoseName>>;
  moves?: MoveSpec[];
  note?: string;
}

export interface LineCue {
  id: string;
  beatId: string;
  actId: string;
  sceneId: string;
  shot: string;
  speaker: string;
  text: string;
  emotion: Emotion;
  start: number;
  end: number;
}

export interface ShotCue {
  shot: string;
  sceneId: string;
  start: number;
  end: number;
}

export interface EventCue {
  id: string;
  at: number;
  type: string;
  sceneId: string;
  params?: Record<string, number | string | boolean>;
}

export interface ActorCue {
  at: number;
  actor: ActorId;
  sceneId: string;
  pose?: PoseName;
  move?: MoveSpec;
}

export interface CompiledScene {
  id: string;
  actId: string;
  env: EnvId;
  start: number;
  end: number;
  beats: CompiledBeat[];
}

export interface CompiledAct {
  id: string;
  title: string;
  start: number;
  end: number;
  scenes: CompiledScene[];
}

export interface CompiledFilm {
  meta: RawScript['meta'];
  acts: CompiledAct[];
  scenes: CompiledScene[];
  lines: LineCue[];
  shots: ShotCue[];
  events: EventCue[];
  actorCues: ActorCue[];
  duration: number;
}

export type EaseName = 'linear' | 'inOut' | 'out' | 'in';

export interface ShotDef {
  id: string;
  env: EnvId;
  from: Vec3;
  to: Vec3;
  lookFrom: Vec3;
  lookTo: Vec3;
  fovFrom: number;
  fovTo: number;
  ease: EaseName;
  handheld: number;
}

export interface CameraFile {
  shots: ShotDef[];
}

export interface ActPalette {
  sky: string;
  ground: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  hemi: number;
  hemiColor: string;
  keyColor: string;
  keyIntensity: number;
  keyPos: Vec3;
  exposure: number;
}

export interface ScenePaletteOverride {
  fogNear?: number;
  fogFar?: number;
  hemi?: number;
  exposure?: number;
}

export interface LightsFile {
  acts: Record<string, ActPalette>;
  scenes: Partial<Record<EnvId, ScenePaletteOverride>>;
}

export interface CharacterSpec {
  id: ActorId;
  height: number;
  headScale: number;
  skin: string;
  hair: string;
  coat: string;
  coat2: string;
  pants: string;
  shoes: string;
  accent: string;
  hat: 'none' | 'knit' | 'fedora' | 'cap';
  scarf: boolean;
  scarfColor: string;
  glasses: boolean;
  backpack: boolean;
  apron: boolean;
  satchel: boolean;
  stubble: boolean;
  build: 'slim' | 'normal' | 'stocky' | 'child';
}

export interface StageActor {
  id: ActorId;
  mark: Vec2;
  facing: number;
  pose: PoseName;
  hideUntilEvent?: string;
}

export interface StageSpec {
  actors: StageActor[];
}
