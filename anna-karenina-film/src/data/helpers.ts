import type {
  ActorKey,
  ActorTrack,
  CameraKey,
  CharacterId,
  EaseName,
  Expression,
  PoseName,
  SfxCue,
  Shot,
  SubtitleCue
} from './types';

export function cam(
  t: number,
  x = 960,
  y = 540,
  zoom = 1,
  ease: EaseName = 'cinematic'
): CameraKey {
  return { t, x, y, zoom, ease };
}

export function actor(
  t: number,
  x: number,
  y: number,
  scale: number,
  pose: PoseName = 'stand',
  expression: Expression = 'neutral',
  extras: Partial<Pick<ActorKey, 'gaze' | 'flip' | 'opacity' | 'blur'>> = {}
): ActorKey {
  return { t, x, y, scale, pose, expression, ...extras };
}

export function track(
  character: CharacterId,
  keys: ActorKey[],
  variant?: string,
  options: Partial<Pick<ActorTrack, 'back'>> = {}
): ActorTrack {
  return { character, keys, variant, ...options };
}

export function shot(
  id: string,
  start: number,
  duration: number,
  environment: Shot['environment'],
  camera: CameraKey[],
  actors: ActorTrack[] = [],
  extra: Partial<Pick<Shot, 'effects' | 'sfx' | 'light' | 'props'>> = {}
): Shot {
  return { id, start, duration, environment, camera, actors, ...extra };
}

export function line(
  id: string,
  start: number,
  end: number,
  speaker: string,
  text: string,
  kind: 'dialogue' | 'narration' = 'dialogue'
): SubtitleCue {
  return { id, start, end, speaker, text, kind };
}

export function sfx(t: number, id: SfxCue['id'], gain = 1): SfxCue {
  return { t, id, gain };
}

export function shotEnd(s: Shot): number {
  return s.start + s.duration;
}

export function sceneShotAt(shots: Shot[], localTime: number): { shot: Shot; index: number } {
  const t = Math.max(0, localTime);
  for (let i = shots.length - 1; i >= 0; i -= 1) {
    const s = shots[i];
    if (s && t >= s.start) return { shot: s, index: i };
  }
  const first = shots[0];
  if (!first) throw new Error('Scene without shots');
  return { shot: first, index: 0 };
}
