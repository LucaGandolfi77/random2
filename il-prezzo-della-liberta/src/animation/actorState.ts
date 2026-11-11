import type { ActorCue, ActorId, PoseName, StageActor, Vec2 } from '../data/types';
import { clamp01, smoothstep } from '../utils/math';
import { seedFromString } from '../utils/rng';

export interface ResolvedActorState {
  pos: Vec2;
  facing: number;
  pose: PoseName;
  poseFrom: PoseName;
  poseWeight: number;
  walk: number;
  phase: number;
  moving: boolean;
  seated: boolean;
}

export function resolveActorState(
  cues: ActorCue[],
  sceneId: string,
  actor: ActorId,
  base: StageActor,
  t: number
): ResolvedActorState {
  let pos: Vec2 = [base.mark[0], base.mark[1]];
  let facing = base.facing;
  let pose: PoseName = base.pose;
  let poseFrom: PoseName = base.pose;
  let poseStart = -10;
  let distance = 0;
  let walk = 0;
  let moving = false;
  let seated = base.pose === 'sit';

  for (const cue of cues) {
    if (cue.sceneId !== sceneId || cue.actor !== actor) continue;
    if (cue.at > t + 0.0001) break;
    if (cue.pose) {
      poseFrom = pose;
      pose = cue.pose;
      poseStart = cue.at;
      if (cue.pose === 'sit') seated = true;
      else if (cue.pose === 'stand') seated = false;
    }
    if (cue.move) {
      const move = cue.move;
      const start = cue.at;
      if (t >= start) seated = false;
      const end = start + move.dur;
      const dx = move.to[0] - pos[0];
      const dz = move.to[1] - pos[1];
      const length = Math.hypot(dx, dz);
      const direction = Math.atan2(dx, dz);
      const targetFacing = move.face ?? direction;
      if (t >= end) {
        pos = [move.to[0], move.to[1]];
        facing = targetFacing;
        distance += length;
        walk = 0;
        moving = false;
      } else {
        const progress = clamp01((t - start) / move.dur);
        pos = [pos[0] + dx * progress, pos[1] + dz * progress];
        facing = targetFacing;
        distance += length * progress;
        walk = smoothstep(progress / 0.1) * smoothstep((1 - progress) / 0.12);
        moving = true;
      }
    }
  }

  const phase = distance * 4.3 + (seedFromString(actor) % 100) * 0.03;
  const poseWeight = smoothstep((t - poseStart) / 0.45);

  return { pos, facing, pose, poseFrom, poseWeight, walk, phase, moving, seated };
}
