import * as THREE from 'three';
import type {
  ActionName,
  CompiledAction,
  CompiledDialogue,
  CompiledFilm,
} from '../data/types';
import type { BaseEnvironment } from '../environments/BaseEnvironment';
import { clamp, clamp01, lerpAngle, smoothstep, wrapAngle, yawTowards } from '../utils/math';
import { LowPolyCharacter } from './LowPolyCharacter';
import type { ActorAnimationState, Emotion, StageActor } from './StageActor';

const MOVEMENT_ACTIONS = new Set<ActionName>(['walk', 'run']);
const PERSISTENT_BASE = new Set<ActionName>([
  'sit',
  'yoga',
  'kiss',
  'telescope',
  'cycle_stop',
]);
const FINITE_POSE_BASE = new Set<ActionName>(['photo', 'bark']);
const TRANSIENT_ACTIONS = new Set<ActionName>([
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
]);
const SPEAKER_TO_ACTOR: Record<string, string> = {
  ARTURO: 'arturo',
  GINO: 'gino',
  ISTRUTTRICE: 'instructor',
  PASTORE: 'shepherd',
  FOTOGRAFO: 'photographer',
  CICLISTA: 'cyclist',
  REGISTA: 'director',
};

interface ActorTrack {
  actor: StageActor;
  actions: CompiledAction[];
  initialPosition: THREE.Vector3;
  initialYaw: number;
  initialVisible: boolean;
}

function isCycleMovement(action: CompiledAction): boolean {
  return action.action === 'cycle' && Boolean(action.from && action.to);
}

function isMovement(action: CompiledAction): boolean {
  return MOVEMENT_ACTIONS.has(action.action) || isCycleMovement(action);
}

export class CharacterAnimator {
  private readonly film: CompiledFilm;
  private stage: BaseEnvironment | null = null;
  private tracks: ActorTrack[] = [];
  private readonly scratchTarget = new THREE.Vector3();

  constructor(film: CompiledFilm) {
    this.film = film;
  }

  setStage(stage: BaseEnvironment | null): void {
    if (this.stage === stage) return;
    this.stage = stage;
    this.tracks = [];

    if (!stage) return;

    for (const actor of stage.actors.values()) {
      const initial = stage.initialState.get(actor.id);
      this.tracks.push({
        actor,
        actions: this.film.actions
          .filter((action) => action.stageId === stage.id && action.character === actor.id)
          .sort((a, b) => a.start - b.start),
        initialPosition: initial?.position.clone() ?? new THREE.Vector3(),
        initialYaw: initial?.yaw ?? 0,
        initialVisible: initial?.visible ?? actor.defaultVisible,
      });
    }
  }

  update(
    time: number,
    cameraPosition: THREE.Vector3,
    activeDialogue: CompiledDialogue | null,
  ): void {
    if (!this.stage) return;

    for (const track of this.tracks) {
      const { actor } = track;
      let position = track.initialPosition.clone();
      let yaw = track.initialYaw;
      let visible = track.initialVisible;
      let base: ActionName = 'idle';
      let baseStart = 0;
      let movementStart = 0;
      let movementSpeed = 1;
      let moving = false;

      for (const action of track.actions) {
        if (action.start > time) break;

        if (action.action === 'show') {
          visible = true;
          continue;
        }
        if (action.action === 'hide') {
          visible = false;
          continue;
        }

        if (isMovement(action) && action.from && action.to) {
          const from = this.stage.getMark(action.from) ?? position;
          const to = this.stage.getMark(action.to) ?? position;
          const duration = Math.max(0.001, action.end - action.start);
          const u = clamp01((time - action.start) / duration);
          position = from.clone().lerp(to, u);
          const targetYaw = yawTowards(from, to);
          yaw = lerpAngle(yaw, targetYaw, smoothstep(0, 0.45, time - action.start));
          base = action.action;
          baseStart = action.start;
          movementStart = action.start;
          movementSpeed = action.action === 'run' ? 2.1 : 1.45;
          moving = time < action.end;
          if (time >= action.end) {
            base = 'idle';
            moving = false;
          }
          continue;
        }

        if (action.mark) {
          const mark = this.stage.getMark(action.mark);
          if (mark) position.copy(mark);
        }

        if (action.action === 'turn_camera') {
          const targetYaw = yawTowards(position, cameraPosition);
          yaw = lerpAngle(yaw, targetYaw, smoothstep(0, 2.5, time - action.start));
          continue;
        }

        if (action.face && !TRANSIENT_ACTIONS.has(action.action)) {
          const targetYaw = this.faceYaw(action.face, position);
          if (targetYaw !== null) {
            yaw = lerpAngle(yaw, targetYaw, smoothstep(0, 0.45, time - action.start));
          }
        }

        if (PERSISTENT_BASE.has(action.action)) {
          base = action.action;
          baseStart = action.start;
          moving = false;
          continue;
        }

        if (action.action === 'stand') {
          base = 'idle';
          baseStart = action.start;
          moving = false;
          continue;
        }

        if (action.action === 'idle') {
          base = 'idle';
          baseStart = action.start;
          moving = false;
          continue;
        }

        if (action.action === 'cycle') {
          base = 'cycle';
          baseStart = action.start;
          moving = false;
          continue;
        }

        if (FINITE_POSE_BASE.has(action.action)) {
          if (time < action.end) {
            base = action.action;
          } else {
            base = 'idle';
          }
          baseStart = action.start;
          moving = false;
        }
      }

      actor.root.position.copy(position);
      actor.root.rotation.y = yaw;
      actor.root.visible = visible;

      if (!visible) continue;

      const transient = this.findTransient(track, time);
      const look = this.computeLook(track, time, transient.action, position, yaw, cameraPosition);
      const emotion = this.resolveEmotion(actor, base, transient.action);
      const talk = this.resolveTalk(actor, activeDialogue, time);
      const turnCamera = transient.action === 'turn_camera' ? transient.weight : 0;

      const state: ActorAnimationState = {
        time,
        base,
        transient: transient.action,
        transientProgress: transient.progress,
        transientWeight: transient.weight,
        talk,
        moving,
        moveSpeed: movementSpeed,
        walkPhase: (time - (moving ? movementStart : baseStart)) * Math.PI * 2 * movementSpeed,
        emotion,
        lookYaw: look.yaw,
        lookPitch: look.pitch,
        turnCamera,
        variant:
          actor instanceof LowPolyCharacter ? actor.options.variant : actor.kind,
      };

      actor.animate(state);
    }
  }

  private findTransient(
    track: ActorTrack,
    time: number,
  ): { action: ActionName | null; progress: number; weight: number } {
    let found: CompiledAction | null = null;

    for (const action of track.actions) {
      if (!TRANSIENT_ACTIONS.has(action.action)) continue;
      if (action.start > time) break;
      if (Number.isFinite(action.end) && time < action.end) {
        found = action;
      }
    }

    if (!found) return { action: null, progress: 0, weight: 0 };

    const progress = clamp01((time - found.start) / Math.max(0.001, found.end - found.start));
    const fadeIn = smoothstep(0, 0.12, progress);
    const fadeOut = 1 - smoothstep(0.88, 1, progress);
    return {
      action: found.action,
      progress,
      weight: found.action === 'turn_camera' ? fadeIn * fadeOut : fadeIn * fadeOut,
    };
  }

  private computeLook(
    track: ActorTrack,
    time: number,
    transient: ActionName | null,
    position: THREE.Vector3,
    bodyYaw: number,
    cameraPosition: THREE.Vector3,
  ): { yaw: number; pitch: number } {
    const action =
      transient === 'look'
        ? track.actions.find(
            (item) =>
              item.action === 'look' &&
              item.start <= time &&
              (time < item.end || !Number.isFinite(item.end)),
          )
        : null;

    if (!action?.face) return { yaw: 0, pitch: 0 };

    if (action.face === 'sky') {
      return { yaw: 0, pitch: -0.48 };
    }

    if (action.face === 'camera') {
      const targetYaw = yawTowards(position, cameraPosition);
      return { yaw: clamp(wrapAngle(targetYaw - bodyYaw), -0.9, 0.9), pitch: 0 };
    }

    const target = this.facePoint(action.face, position);
    if (!target) return { yaw: 0, pitch: 0 };

    const targetYaw = yawTowards(position, target);
    return {
      yaw: clamp(wrapAngle(targetYaw - bodyYaw), -0.9, 0.9),
      pitch: 0,
    };
  }

  private faceYaw(face: string, position: THREE.Vector3): number | null {
    if (face === 'sky' || face === 'camera') return null;
    const target = this.facePoint(face, position);
    if (!target) return null;
    return yawTowards(position, target);
  }

  private facePoint(face: string, from: THREE.Vector3): THREE.Vector3 | null {
    if (!this.stage) return null;
    if (face === 'camera') return null;

    const actor = this.stage.actors.get(face);
    if (actor) {
      return this.scratchTarget.copy(actor.root.position);
    }

    const mark = this.stage.getMark(face);
    if (mark) return this.scratchTarget.copy(mark);

    return null;
  }

  private resolveEmotion(
    actor: StageActor,
    base: ActionName,
    transient: ActionName | null,
  ): Emotion {
    if (transient === 'cry' || transient === 'bend') return 'despair';
    if (transient === 'relief') return 'hopeful';
    if (transient === 'raise_arms') return 'angry';
    if (transient === 'nervous') return 'worried';
    if (actor.id === 'arturo') {
      if (base === 'cry') return 'despair';
      return 'worried';
    }
    if (actor.id === 'gino') return 'calm';
    if (actor.id === 'instructor' || actor.id.startsWith('yogi')) return 'serene';
    if (actor.id === 'shepherd') return 'calm';
    return 'neutral';
  }

  private resolveTalk(
    actor: StageActor,
    activeDialogue: CompiledDialogue | null,
    time: number,
  ): number {
    if (!activeDialogue) return 0;
    if (SPEAKER_TO_ACTOR[activeDialogue.speaker] !== actor.id) return 0;
    const progress = clamp01(
      (time - activeDialogue.start) / Math.max(0.001, activeDialogue.end - activeDialogue.start),
    );
    return smoothstep(0, 0.08, progress) * (1 - smoothstep(0.92, 1, progress));
  }
}
