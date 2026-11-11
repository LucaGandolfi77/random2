import * as THREE from 'three';
import type { ActionName } from '../data/types';

export type ActorKind = 'human' | 'dog' | 'sheep' | 'cyclist';
export type Emotion = 'neutral' | 'worried' | 'hopeful' | 'despair' | 'angry' | 'calm' | 'serene';

export interface ActorAnimationState {
  time: number;
  base: ActionName;
  transient: ActionName | null;
  transientProgress: number;
  transientWeight: number;
  talk: number;
  moving: boolean;
  moveSpeed: number;
  walkPhase: number;
  emotion: Emotion;
  lookYaw: number;
  lookPitch: number;
  turnCamera: number;
  variant: string;
}

export abstract class StageActor {
  readonly root = new THREE.Group();
  readonly id: string;
  readonly kind: ActorKind;
  headHeight: number;
  defaultVisible = true;

  protected constructor(id: string, kind: ActorKind, headHeight = 1.6) {
    this.id = id;
    this.kind = kind;
    this.headHeight = headHeight;
    this.root.name = id;
  }

  abstract animate(state: ActorAnimationState): void;

  getHeadWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    this.root.updateWorldMatrix(true, false);
    return target.set(0, this.headHeight, 0).applyMatrix4(this.root.matrixWorld);
  }

  getWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    return this.root.getWorldPosition(target);
  }
}
