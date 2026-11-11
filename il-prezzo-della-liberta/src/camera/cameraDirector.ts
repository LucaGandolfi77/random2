import { PerspectiveCamera } from 'three';
import type { CompiledFilm, ShotCue, ShotDef, Vec3 } from '../data/types';
import { clamp01, lerp, lerpVec3, noise1, noise2, applyEase } from '../utils/math';
import { seedFromString } from '../utils/rng';

export interface ShotState {
  position: Vec3;
  look: Vec3;
  fov: number;
  shot: string;
  progress: number;
}

export function findShotCue(film: CompiledFilm, t: number): ShotCue | null {
  const shots = film.shots;
  let lo = 0;
  let hi = shots.length - 1;
  let candidate: ShotCue | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (shots[mid].start <= t) {
      candidate = shots[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (candidate && t >= candidate.end) {
    const index = shots.indexOf(candidate);
    if (index === shots.length - 1) return candidate;
  }
  return candidate;
}

export function evaluateShot(def: ShotDef, cue: ShotCue, t: number): ShotState {
  const span = Math.max(0.001, cue.end - cue.start);
  const raw = clamp01((t - cue.start) / span);
  const eased = applyEase(def.ease, raw);
  const seed = seedFromString(def.id);

  const position = lerpVec3(def.from, def.to, eased);
  const look = lerpVec3(def.lookFrom, def.lookTo, eased);
  const fov = lerp(def.fovFrom, def.fovTo, eased);

  const amp = def.handheld;
  if (amp > 0) {
    const driftT = t * 0.55;
    position[0] += noise1(driftT, seed) * amp;
    position[1] += noise1(driftT + 17.3, seed + 1) * amp * 0.75;
    position[2] += noise2(driftT * 0.7, 3.1, seed + 2) * amp * 0.6;
    look[0] += noise1(driftT + 41.7, seed + 3) * amp * 0.8;
    look[1] += noise2(driftT + 23.4, 8.2, seed + 4) * amp * 0.5;
    const breath = Math.sin(t * 0.4 + seed * 0.0001) * 0.004;
    position[1] += breath;
  }

  return { position, look, fov, shot: def.id, progress: raw };
}

export class CameraDirector {
  camera: PerspectiveCamera;
  private defs: Map<string, ShotDef>;
  private lastFov = -1;

  constructor(camera: PerspectiveCamera, shots: ShotDef[]) {
    this.camera = camera;
    this.defs = new Map(shots.map((shot) => [shot.id, shot]));
  }

  apply(film: CompiledFilm, t: number): ShotState | null {
    const cue = findShotCue(film, t);
    if (!cue) return null;
    const def = this.defs.get(cue.shot);
    if (!def) return null;
    const state = evaluateShot(def, cue, t);
    const p = this.camera.position;
    p.set(state.position[0], state.position[1], state.position[2]);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(state.look[0], state.look[1], state.look[2]);
    if (Math.abs(state.fov - this.lastFov) > 0.01) {
      this.camera.fov = state.fov;
      this.camera.updateProjectionMatrix();
      this.lastFov = state.fov;
    }
    return state;
  }

  getDef(id: string): ShotDef | undefined {
    return this.defs.get(id);
  }
}
