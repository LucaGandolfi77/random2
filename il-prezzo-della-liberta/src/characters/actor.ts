import type { Emotion, StageActor } from '../data/types';
import { blendPose, poseAngles, actorSeed, type PoseAngles } from '../animation/poses';
import type { ResolvedActorState } from '../animation/actorState';
import { buildRig, type Rig } from './rig';
import { CHARACTERS } from './cast';

interface EmotionShape {
  browL: number;
  browR: number;
  browY: number;
  mouthRot: number;
  mouthSX: number;
  mouthSY: number;
  mouthY: number;
  eye: number;
  headX: number;
  headZ: number;
}

function emotionShape(emotion: Emotion): EmotionShape {
  switch (emotion) {
    case 'sad':
      return { browL: 0.28, browR: 0.28, browY: 0.004, mouthRot: 0.09, mouthSX: 0.92, mouthSY: 0.65, mouthY: -0.003, eye: 0.94, headX: 0.05, headZ: 0 };
    case 'tired':
      return { browL: 0.06, browR: 0.06, browY: 0.002, mouthRot: 0.03, mouthSX: 0.96, mouthSY: 0.75, mouthY: -0.002, eye: 0.72, headX: 0.06, headZ: 0 };
    case 'angry':
      return { browL: -0.34, browR: -0.34, browY: -0.004, mouthRot: 0, mouthSX: 1.12, mouthSY: 0.5, mouthY: -0.002, eye: 0.9, headX: 0.02, headZ: 0 };
    case 'surprised':
      return { browL: 0.1, browR: 0.1, browY: 0.012, mouthRot: 0, mouthSX: 0.95, mouthSY: 1.9, mouthY: -0.002, eye: 1.18, headX: -0.04, headZ: 0 };
    case 'confused':
      return { browL: 0.3, browR: 0.02, browY: 0.005, mouthRot: -0.05, mouthSX: 0.9, mouthSY: 0.85, mouthY: 0, eye: 1.02, headX: 0.02, headZ: 0.12 };
    case 'tender':
      return { browL: 0.14, browR: 0.14, browY: 0.004, mouthRot: -0.05, mouthSX: 1.06, mouthSY: 0.8, mouthY: 0.002, eye: 0.85, headX: 0.02, headZ: 0.05 };
    case 'wry':
      return { browL: 0.02, browR: -0.24, browY: 0.002, mouthRot: 0.14, mouthSX: 1.05, mouthSY: 0.8, mouthY: 0.001, eye: 0.95, headX: 0.01, headZ: 0.05 };
    case 'afraid':
      return { browL: 0.32, browR: 0.32, browY: 0.01, mouthRot: 0, mouthSX: 0.86, mouthSY: 0.8, mouthY: -0.003, eye: 1.2, headX: -0.03, headZ: -0.04 };
    case 'hopeful':
      return { browL: 0.12, browR: 0.12, browY: 0.006, mouthRot: -0.06, mouthSX: 1.05, mouthSY: 0.85, mouthY: 0.002, eye: 1.03, headX: -0.02, headZ: 0 };
    default:
      return { browL: 0, browR: 0, browY: 0, mouthRot: 0, mouthSX: 1, mouthSY: 0.9, mouthY: 0, eye: 1, headX: 0, headZ: 0 };
  }
}

export class Actor {
  readonly id: StageActor['id'];
  readonly rig: Rig;
  stage: StageActor;
  private seed: number;
  private browBaseY: number;
  private mouthBaseY: number;
  private mouthBaseScaleX: number;
  private mouthBaseScaleY: number;

  constructor(stage: StageActor) {
    this.stage = stage;
    this.id = stage.id;
    this.seed = actorSeed(stage.id);
    this.rig = buildRig(CHARACTERS[stage.id]);
    this.browBaseY = this.rig.brows[0].position.y;
    this.mouthBaseY = this.rig.mouth.position.y;
    this.mouthBaseScaleX = this.rig.mouth.scale.x;
    this.mouthBaseScaleY = this.rig.mouth.scale.y;
    this.applyPose(poseAngles(stage.pose, 0, this.seed, 0, 0, stage.pose === 'sit'), 0, 'neutral');
  }

  get object() {
    return this.rig.root;
  }

  setVisible(visible: boolean): void {
    this.rig.root.visible = visible;
  }

  setProp(name: 'photo' | 'tape' | 'paper', visible: boolean): void {
    this.rig.props[name].visible = visible;
  }

  setBackpackVisible(visible: boolean): void {
    if (this.rig.backpack) this.rig.backpack.visible = visible;
  }

  apply(state: ResolvedActorState, t: number, emotion: Emotion): void {
    const to = poseAngles(state.pose, t, this.seed, state.walk, state.phase, state.seated);
    const from = poseAngles(state.poseFrom, t, this.seed, state.walk, state.phase, state.seated);
    const angles = blendPose(from, to, state.poseWeight);
    this.rig.root.position.set(state.pos[0], 0, state.pos[1]);
    this.rig.root.rotation.y = state.facing;
    this.applyPose(angles, t, emotion);
  }

  private applyPose(angles: PoseAngles, t: number, emotion: Emotion): void {
    const rig = this.rig;
    rig.hips.position.y = rig.hipsBaseY - angles.hipsDrop * rig.sitDrop;
    rig.hips.rotation.z = angles.hipsRoll;
    rig.torso.rotation.set(angles.torsoX, angles.torsoY, angles.torsoZ);
    rig.head.rotation.set(angles.headX, angles.headY, angles.headZ);

    rig.shoulderL.rotation.set(angles.armLX, angles.armLY, angles.armLZ);
    rig.shoulderR.rotation.set(angles.armRX, angles.armRY, angles.armRZ);
    rig.elbowL.rotation.x = angles.elbowL;
    rig.elbowR.rotation.x = angles.elbowR;

    rig.hipL.rotation.set(angles.legLX, 0, angles.legLZ);
    rig.hipR.rotation.set(angles.legRX, 0, angles.legRZ);
    rig.kneeL.rotation.x = angles.kneeL;
    rig.kneeR.rotation.x = angles.kneeR;
    rig.ankleL.rotation.x = angles.footL;
    rig.ankleR.rotation.x = angles.footR;

    if (rig.coatFlap) {
      rig.coatFlap.rotation.x = 0.08 + Math.sin(t * 2.1 + this.seed) * 0.012 + Math.max(0, angles.legLX + angles.legRX) * 0.06;
    }

    const shape = emotionShape(emotion);
    rig.head.rotation.x += shape.headX;
    rig.head.rotation.z += shape.headZ;
    rig.brows[0].rotation.z = shape.browL;
    rig.brows[1].rotation.z = shape.browR;
    rig.brows[0].position.y = this.browBaseY + shape.browY;
    rig.brows[1].position.y = this.browBaseY + shape.browY;
    rig.mouth.rotation.z = shape.mouthRot;
    rig.mouth.position.y = this.mouthBaseY + shape.mouthY;
    rig.mouth.scale.x = this.mouthBaseScaleX * shape.mouthSX;
    rig.mouth.scale.y = this.mouthBaseScaleY * shape.mouthSY;

    const cycle = 4.6;
    const local = (t + (this.seed % 37) * 0.13) % cycle;
    const blink = local < 0.18 ? 1 - Math.abs(local - 0.09) / 0.09 : 0;
    const eyeScale = shape.eye * (1 - blink * 0.9);
    rig.eyeGroups[0].scale.y = eyeScale;
    rig.eyeGroups[1].scale.y = eyeScale;
  }
}
