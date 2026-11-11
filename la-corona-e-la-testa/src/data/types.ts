export const ENVIRONMENTS = [
  'court',
  'crossroads',
  'viaEmilia',
  'stirone',
  'stironeDawn',
  'fidenza',
] as const;

export type EnvironmentKind = (typeof ENVIRONMENTS)[number];

export const ACTIONS = [
  'idle',
  'walk',
  'run',
  'sit',
  'stand',
  'show',
  'hide',
  'look',
  'bend',
  'cry',
  'nervous',
  'relief',
  'shiver',
  'point',
  'raise_arms',
  'turn_camera',
  'kneel',
  'sigh',
  'face',
  'carry_head',
  'lie',
  'lie_headless',
  'pray',
  'bless',
  'crown',
  'refuse',
  'bind',
  'arrest',
  'witness',
  'preach',
  'raise_hand',
  'strike',
  'cover_face',
  'yoga',
  'photo',
  'kiss',
  'cycle',
  'bark',
  'telescope',
  'cycle_stop',
] as const;

export type ActionName = (typeof ACTIONS)[number];

export const SPEAKERS = [
  'DONNINO',
  'MASSIMIANO',
  'CRISTIANO',
  'OSTE',
  'CENTURIONE',
  'SOLDATO',
  'CARNEFICE',
  'CONTADINO',
  'BAMBINO',
  'VEDOVA',
  'MAESTRO',
  'APPRENDISTA',
  'PELLEGRINO',
  'CORTIGIANO',
  'GUARDIA',
] as const;

export type SpeakerId = (typeof SPEAKERS)[number];

export const SFX_NAMES = [
  'footstep',
  'chain',
  'gate',
  'fire',
  'rain',
  'thunder',
  'horn',
  'horse',
  'axe',
  'body_fall',
  'water_cross',
  'bell_church',
  'hammer_stone',
  'chisel',
  'crowd_prayer',
  'dog_growl',
  'dog_calm',
  'raven',
  'wind_gust',
  'breath',
  'sigh',
  'whoosh',
  'crown_set',
  'cloth',
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

export const AMBIENCES = [
  'court',
  'crossroadsNight',
  'viaDay',
  'riverDusk',
  'riverDawn',
  'borgo',
  'silence',
] as const;

export type AmbienceId = (typeof AMBIENCES)[number];

export interface DialogueLineData {
  speaker: SpeakerId;
  text: string;
  duration?: number;
  pauseAfter?: number;
}

export interface ActionData {
  at?: number;
  character: string;
  action: ActionName;
  from?: string;
  to?: string;
  mark?: string;
  duration?: number;
  face?: string;
}

export interface SfxData {
  at: number;
  name: SfxName;
  gain?: number;
}

export interface BeatData {
  id: string;
  scene?: EnvironmentKind;
  camera: string;
  duration?: number;
  tail?: number;
  dialogueDelay?: number;
  dialogue?: DialogueLineData[];
  actions?: ActionData[];
  sfx?: SfxData[];
  ambience?: AmbienceId;
}

export interface ActData {
  id: string;
  number: string;
  title: string;
  scene: EnvironmentKind;
  beats: BeatData[];
}

export interface ScreenplayData {
  title: string;
  subtitle: string;
  acts: ActData[];
}

export type Vec3Tuple = [number, number, number];
export type EaseName = 'linear' | 'smooth' | 'in' | 'out' | 'inOut';

export type VecSpec =
  | Vec3Tuple
  | string
  | { character: string; offset?: Vec3Tuple };

export interface CameraShotData {
  environment: EnvironmentKind;
  position: VecSpec;
  target: VecSpec;
  positionTo?: VecSpec;
  targetTo?: VecSpec;
  fov?: number;
  ease?: EaseName;
  shake?: number;
}

export interface CameraCuesData {
  shots: Record<string, CameraShotData>;
}

export interface CompiledDialogue {
  id: string;
  start: number;
  end: number;
  speaker: SpeakerId;
  text: string;
  actId: string;
  beatId: string;
  stageId: string;
  scene: EnvironmentKind;
  duration: number;
  pauseAfter: number;
}

export interface CompiledAction {
  character: string;
  action: ActionName;
  start: number;
  duration: number;
  end: number;
  stageId: string;
  actId: string;
  beatId: string;
  from?: string;
  to?: string;
  mark?: string;
  face?: string;
}

export interface CompiledSfx {
  time: number;
  name: SfxName;
  gain: number;
  stageId: string;
  actId: string;
}

export interface CompiledBeat {
  id: string;
  actId: string;
  stageId: string;
  scene: EnvironmentKind;
  camera: string;
  start: number;
  duration: number;
  end: number;
}

export interface CompiledAct {
  id: string;
  number: string;
  title: string;
  scene: EnvironmentKind;
  start: number;
  duration: number;
  end: number;
}

export interface CompiledStage {
  id: string;
  kind: EnvironmentKind;
  actId: string;
  start: number;
  end: number;
  beats: CompiledBeat[];
}

export interface AmbienceEvent {
  time: number;
  ambience: AmbienceId;
  stageId: string;
  actId: string;
}

export interface TitleCardEvent {
  actId: string;
  number: string;
  title: string;
  start: number;
  end: number;
}

export interface Caption {
  start: number;
  end: number;
  speaker: SpeakerId;
  text: string;
  scene: EnvironmentKind;
  actId: string;
  beatId: string;
}

export interface CompiledFilm {
  title: string;
  subtitle: string;
  duration: number;
  acts: CompiledAct[];
  stages: CompiledStage[];
  beats: CompiledBeat[];
  dialogue: CompiledDialogue[];
  actions: CompiledAction[];
  sfx: CompiledSfx[];
  ambiences: AmbienceEvent[];
  captions: Caption[];
  titleCards: TitleCardEvent[];
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}
