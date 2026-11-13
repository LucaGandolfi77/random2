export type CharacterId =
  | 'anna'
  | 'vronsky'
  | 'karenin'
  | 'kitty'
  | 'levin'
  | 'seryozha'
  | 'stationmaster'
  | 'society';

export type PoseName =
  | 'stand'
  | 'turn'
  | 'reach'
  | 'embrace'
  | 'bow'
  | 'clasp'
  | 'recoil'
  | 'walk'
  | 'ride'
  | 'cover';

export type Expression =
  | 'neutral'
  | 'soft'
  | 'joy'
  | 'desire'
  | 'fear'
  | 'shame'
  | 'grief'
  | 'anger'
  | 'tender'
  | 'cold'
  | 'wonder';

export type EnvironmentId =
  | 'rail'
  | 'train'
  | 'ballroom'
  | 'palace'
  | 'apartment'
  | 'racecourse'
  | 'bedroom'
  | 'villa'
  | 'opera'
  | 'country'
  | 'izba'
  | 'station'
  | 'tracks'
  | 'church';

export type EffectId = 'snow' | 'steam' | 'dust' | 'rain' | 'embers' | 'motes' | 'smoke';

export type PaletteId =
  | 'ice'
  | 'brass'
  | 'bordeaux'
  | 'candle'
  | 'sun'
  | 'honey'
  | 'iron'
  | 'black'
  | 'green';

export type EaseName = 'linear' | 'in' | 'out' | 'inOut' | 'cinematic';

export type SfxId =
  | 'whistle'
  | 'steam'
  | 'bell'
  | 'clock'
  | 'steps'
  | 'door'
  | 'crowd'
  | 'horses'
  | 'rain'
  | 'glass'
  | 'paper'
  | 'fire'
  | 'wind'
  | 'applause'
  | 'heartbeat'
  | 'train'
  | 'carriage'
  | 'birds'
  | 'insects'
  | 'samovar'
  | 'baby'
  | 'gasp'
  | 'thud';

export type PropId = 'horse' | 'toyTrain' | 'redGlove' | 'closedDoor' | 'babyBundle' | 'suitcase';

export interface PropCue {
  id: PropId;
  x: number;
  y: number;
  scale: number;
  opacity?: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface CameraKey {
  t: number;
  x: number;
  y: number;
  zoom: number;
  ease?: EaseName;
}

export interface ActorKey {
  t: number;
  x: number;
  y: number;
  scale: number;
  pose: PoseName;
  expression: Expression;
  gaze?: Vec2;
  flip?: boolean;
  opacity?: number;
  blur?: number;
}

export interface ActorTrack {
  character: CharacterId;
  variant?: string;
  back?: boolean;
  keys: ActorKey[];
}

export interface EffectCue {
  type: EffectId;
  intensity?: number;
  speed?: number;
}

export interface LightKey {
  t: number;
  intensity: number;
  color?: string;
}

export interface SfxCue {
  t: number;
  id: SfxId;
  gain?: number;
}

export interface Shot {
  id: string;
  start: number;
  duration: number;
  environment: EnvironmentId;
  camera: CameraKey[];
  actors: ActorTrack[];
  effects?: EffectCue[];
  sfx?: SfxCue[];
  light?: LightKey[];
  props?: PropCue[];
}

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
  kind?: 'dialogue' | 'narration' | 'thought';
}

export interface MusicMood {
  id: string;
  root: number;
  mode: 'minor' | 'major' | 'dorian' | 'lydian';
  tempo: number;
  intensity: number;
  darkness: number;
  meter?: 3 | 4;
}

export interface SceneDef {
  id: string;
  index: number;
  title: string;
  duration: number;
  palette: PaletteId;
  environment: EnvironmentId;
  shots: Shot[];
  subtitles: SubtitleCue[];
  music: MusicMood;
  ambience: SfxId[];
  transition?: 'fade' | 'white' | 'smoke' | 'black';
  musicStopAt?: number;
}

export interface FilmDef {
  title: string;
  subtitle: string;
  duration: number;
  scenes: SceneDef[];
}

export interface RuntimeState {
  time: number;
  sceneIndex: number;
  sceneTime: number;
  playing: boolean;
  ended: boolean;
}

export interface SavedProgress {
  time: number;
  sceneId: string;
  updatedAt: number;
  completed: boolean;
  version: 1;
}
