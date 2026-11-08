import type { TransformNode } from '@babylonjs/core';
import type { FighterState } from '../combat/types';
import { clamp } from '../combat/types';
import { BASE_HIP_Y, type CharacterRig, type RigNodes } from '../engine/character';

interface PoseTargets {
  pelvisY: number;
  pelvisRot: [number, number, number];
  spine: [number, number, number];
  chest: [number, number, number];
  neck: [number, number, number];
  head: [number, number, number];
  shoulderL: [number, number, number];
  shoulderR: [number, number, number];
  elbowL: [number, number, number];
  elbowR: [number, number, number];
  handL: [number, number, number];
  handR: [number, number, number];
  hipL: [number, number, number];
  hipR: [number, number, number];
  kneeL: [number, number, number];
  kneeR: [number, number, number];
  footL: [number, number, number];
  footR: [number, number, number];
}

function basePose(time: number): PoseTargets {
  const breath = Math.sin(time * 2.1) * 0.012;
  return {
    pelvisY: BASE_HIP_Y + breath,
    pelvisRot: [0, 0, 0],
    spine: [0.05 + Math.sin(time * 2.1) * 0.012, 0, 0],
    chest: [0, Math.sin(time * 1.4) * 0.03, 0],
    neck: [0, 0, 0],
    head: [0, Math.sin(time * 0.9) * 0.05, 0],
    shoulderL: [0.12, 0, -0.08],
    shoulderR: [0.12, 0, 0.08],
    elbowL: [-0.22, 0, 0],
    elbowR: [-0.22, 0, 0],
    handL: [0, 0, 0],
    handR: [0, 0, 0],
    hipL: [0, 0, 0],
    hipR: [0, 0, 0],
    kneeL: [0, 0, 0],
    kneeR: [0, 0, 0],
    footL: [0, 0, 0],
    footR: [0, 0, 0]
  };
}

function applyWalk(pose: PoseTargets, stateFrame: number): void {
  const phase = stateFrame * 0.22;
  const swing = Math.sin(phase);
  pose.hipL[0] = swing * 0.55;
  pose.hipR[0] = -swing * 0.55;
  pose.kneeL[0] = Math.max(0, -swing) * 0.75;
  pose.kneeR[0] = Math.max(0, swing) * 0.75;
  pose.footL[0] = -Math.max(0, swing) * 0.35;
  pose.footR[0] = Math.max(0, swing) * 0.35;
  pose.shoulderL[0] = -swing * 0.35 + 0.1;
  pose.shoulderR[0] = swing * 0.35 + 0.1;
  pose.elbowL[0] = -0.35;
  pose.elbowR[0] = -0.35;
  pose.pelvisY += Math.abs(Math.sin(phase * 2)) * 0.018;
  pose.spine[0] = 0.08;
  pose.pelvisRot[1] = swing * 0.04;
}

function applyCrouch(pose: PoseTargets): void {
  pose.pelvisY -= 0.24;
  pose.hipL[0] = -0.75;
  pose.hipR[0] = -0.75;
  pose.kneeL[0] = 1.35;
  pose.kneeR[0] = 1.35;
  pose.footL[0] = -0.55;
  pose.footR[0] = -0.55;
  pose.spine[0] = 0.32;
  pose.shoulderL[0] = -0.25;
  pose.shoulderR[0] = -0.25;
  pose.elbowL[0] = -1.1;
  pose.elbowR[0] = -1.1;
  pose.head[0] = -0.12;
}

function applyJump(pose: PoseTargets, stateFrame: number): void {
  const tuck = clamp(1 - stateFrame / 22, 0, 1);
  pose.pelvisY += 0.02;
  pose.hipL[0] = -0.55 - tuck * 0.35;
  pose.hipR[0] = -0.35 - tuck * 0.25;
  pose.kneeL[0] = 0.9 + tuck * 0.4;
  pose.kneeR[0] = 0.7 + tuck * 0.3;
  pose.shoulderL[0] = -1.1;
  pose.shoulderR[0] = -1.1;
  pose.shoulderL[2] = -0.45;
  pose.shoulderR[2] = 0.45;
  pose.elbowL[0] = -0.5;
  pose.elbowR[0] = -0.5;
  pose.spine[0] = -0.08;
}

function applyBlock(pose: PoseTargets): void {
  pose.pelvisY -= 0.06;
  pose.spine[0] = 0.14;
  pose.chest[0] = 0.05;
  pose.shoulderL[0] = -0.75;
  pose.shoulderR[0] = -0.75;
  pose.elbowL[0] = -2.0;
  pose.elbowR[0] = -2.0;
  pose.shoulderL[2] = 0.12;
  pose.shoulderR[2] = -0.12;
  pose.hipL[0] = -0.15;
  pose.hipR[0] = -0.15;
  pose.kneeL[0] = 0.3;
  pose.kneeR[0] = 0.3;
  pose.head[0] = 0.1;
}

function applyHitstun(pose: PoseTargets, stateFrame: number, stun: number): void {
  const shake = Math.sin(stateFrame * 1.7) * 0.06;
  pose.spine[0] = -0.38 + shake;
  pose.chest[0] = -0.16;
  pose.neck[0] = -0.12;
  pose.head[0] = -0.32;
  pose.shoulderL[0] = 0.4;
  pose.shoulderR[0] = 0.3;
  pose.shoulderL[2] = -0.35;
  pose.shoulderR[2] = 0.35;
  pose.elbowL[0] = -0.5;
  pose.elbowR[0] = -0.4;
  pose.pelvisY -= 0.04;
  pose.hipL[0] = -0.2;
  pose.hipR[0] = 0.15;
  pose.kneeL[0] = 0.35;
  pose.kneeR[0] = 0.25;
  pose.pelvisRot[2] = shake * 0.5;
  void stun;
}

function applyAttack(pose: PoseTargets, f: FighterState): void {
  const move = f.move;
  if (!move) return;
  const t = f.moveFrame;
  const startup = Math.max(1, move.startup);
  const activeEnd = move.startup + Math.max(1, move.active);
  const windup = t < startup;
  const strike = t >= move.startup && t < activeEnd;
  const recovery = t >= activeEnd;
  const phase = windup ? clamp(t / startup, 0, 1) : strike ? 1 : clamp(1 - (t - activeEnd) / Math.max(1, move.recovery), 0, 1);
  const id = move.id;
  const behavior = move.behavior?.type;

  const guardArms = () => {
    pose.shoulderL[0] = -0.55;
    pose.shoulderR[0] = -0.55;
    pose.elbowL[0] = -1.8;
    pose.elbowR[0] = -1.8;
  };

  if (id.includes('Punch') || id === 'lightPunch' || id === 'heavyPunch' || id === 'crouchPunch') {
    if (id === 'crouchPunch') applyCrouch(pose);
    guardArms();
    const wind = windup ? 0.5 * phase : 0;
    pose.shoulderR[0] = 0.35 * wind - (strike ? 1.55 : recovery ? 0.4 * phase : 0);
    pose.elbowR[0] = windup ? -1.4 : strike ? -0.05 : -0.6;
    pose.chest[1] = windup ? 0.25 * phase : strike ? -0.35 : -0.1;
    pose.spine[0] = id === 'crouchPunch' ? 0.35 : 0.12;
    pose.head[0] = 0.05;
    if (id === 'heavyPunch') {
      pose.shoulderR[0] *= 1.15;
      pose.pelvisRot[1] = strike ? -0.2 : 0;
    }
    return;
  }

  if (id === 'lightKick' || id === 'heavyKick' || id === 'crouchKick') {
    if (id === 'crouchKick') applyCrouch(pose);
    guardArms();
    pose.hipR[0] = windup ? 0.4 * phase : strike ? -1.45 : -0.25 * phase;
    pose.kneeR[0] = windup ? 0.9 : strike ? -0.1 : 0.5;
    pose.footR[0] = strike ? -0.2 : 0.1;
    pose.spine[0] = strike ? -0.18 : 0.12;
    pose.head[0] = -0.05;
    pose.pelvisY += strike ? 0.03 : 0;
    if (id === 'heavyKick') {
      pose.hipR[0] *= 1.18;
      pose.pelvisRot[1] = strike ? 0.3 : 0;
    }
    return;
  }

  if (id === 'airPunch' || id === 'airKick') {
    applyJump(pose, f.stateFrame);
    if (id === 'airPunch') {
      pose.shoulderR[0] = -1.5;
      pose.elbowR[0] = -0.1;
    } else {
      pose.hipR[0] = -1.3;
      pose.kneeR[0] = 0.1;
    }
    return;
  }

  if (id === 'throw' || behavior === 'commandGrab') {
    pose.shoulderL[0] = -1.3;
    pose.shoulderR[0] = -1.3;
    pose.elbowL[0] = -0.2;
    pose.elbowR[0] = -0.2;
    pose.spine[0] = 0.25;
    pose.hipL[0] = -0.15;
    pose.hipR[0] = 0.15;
    return;
  }

  if (id === 'tag') {
    pose.shoulderL[0] = -2.2;
    pose.shoulderL[2] = -0.3;
    pose.elbowL[0] = -0.2;
    pose.spine[0] = -0.1;
    return;
  }

  if (behavior === 'uppercut') {
    pose.shoulderR[0] = windup ? 0.5 : -2.7;
    pose.elbowR[0] = windup ? -1.2 : -0.05;
    pose.shoulderR[2] = -0.2;
    pose.spine[0] = windup ? 0.3 : -0.3;
    pose.pelvisY += strike ? 0.08 : 0;
    pose.hipL[0] = -0.2;
    pose.hipR[0] = 0.1;
    pose.head[0] = strike ? -0.2 : 0.1;
    return;
  }

  if (behavior === 'dash') {
    pose.spine[0] = 0.45;
    pose.hipL[0] = -0.8;
    pose.hipR[0] = 0.6;
    pose.kneeL[0] = 0.4;
    pose.kneeR[0] = 0.6;
    pose.shoulderL[0] = -0.9;
    pose.shoulderR[0] = 0.6;
    pose.elbowL[0] = -0.4;
    pose.elbowR[0] = -0.5;
    return;
  }

  if (behavior === 'teleport') {
    pose.pelvisY -= 0.1;
    pose.spine[0] = 0.35;
    pose.shoulderL[0] = -0.4;
    pose.shoulderR[0] = -0.4;
    pose.shoulderL[2] = -0.9;
    pose.shoulderR[2] = 0.9;
    pose.elbowL[0] = -1.6;
    pose.elbowR[0] = -1.6;
    pose.head[0] = 0.2;
    return;
  }

  if (behavior === 'buff') {
    pose.shoulderL[0] = -0.2;
    pose.shoulderR[0] = -0.2;
    pose.shoulderL[2] = -2.3;
    pose.shoulderR[2] = 2.3;
    pose.elbowL[0] = -0.1;
    pose.elbowR[0] = -0.1;
    pose.spine[0] = -0.15;
    pose.head[0] = -0.2;
    pose.pelvisY += 0.04;
    return;
  }

  if (behavior === 'counter' || behavior === 'flash') {
    guardArms();
    pose.shoulderL[0] = -1.1;
    pose.shoulderR[0] = -1.1;
    pose.elbowL[0] = -2.2;
    pose.elbowR[0] = -2.2;
    pose.head[0] = 0.15;
    return;
  }

  if (behavior === 'shockwave') {
    if (windup) {
      pose.hipR[0] = -1.2 * phase;
      pose.kneeR[0] = 1.5 * phase;
      pose.pelvisY += 0.05 * phase;
      pose.shoulderL[0] = -0.8;
      pose.shoulderR[0] = -0.8;
      pose.elbowL[0] = -1.4;
      pose.elbowR[0] = -1.4;
    } else {
      pose.hipR[0] = -0.15;
      pose.kneeR[0] = 0.1;
      pose.pelvisY -= 0.14;
      pose.spine[0] = 0.4;
      pose.shoulderL[0] = -0.3;
      pose.shoulderR[0] = -0.3;
      pose.elbowL[0] = -1.2;
      pose.elbowR[0] = -1.2;
    }
    return;
  }

  if (behavior === 'explosion' || behavior === 'projectile' || behavior === 'piano' || behavior === 'rain' || behavior === 'zone' || behavior === 'whip' || behavior === 'pull') {
    pose.shoulderR[0] = windup ? 0.5 * phase : -1.35;
    pose.elbowR[0] = windup ? -1.5 : -0.15;
    pose.shoulderL[0] = -0.7;
    pose.elbowL[0] = -1.4;
    pose.chest[1] = windup ? 0.25 : -0.3;
    pose.spine[0] = 0.1;
    pose.head[0] = 0;
    return;
  }

  if (move.kind === 'super' || move.kind === 'finisher') {
    const pulse = strike ? 1 : 0.5;
    pose.shoulderL[0] = -0.4;
    pose.shoulderR[0] = -0.4;
    pose.shoulderL[2] = -2.0 * pulse;
    pose.shoulderR[2] = 2.0 * pulse;
    pose.elbowL[0] = -0.2;
    pose.elbowR[0] = -0.2;
    pose.spine[0] = -0.2;
    pose.head[0] = -0.2;
    pose.pelvisY += 0.03;
    return;
  }

  guardArms();
}

function applyKO(pose: PoseTargets, f: FighterState): void {
  const dir = f.facing === 1 ? -1 : 1;
  pose.pelvisY = 0.26;
  pose.pelvisRot[2] = dir * 1.35;
  pose.pelvisRot[1] = dir * 0.2;
  pose.spine[0] = 0.1;
  pose.head[0] = -0.25;
  pose.shoulderL[0] = 0.5;
  pose.shoulderR[0] = 0.4;
  pose.shoulderL[2] = -0.7;
  pose.shoulderR[2] = 0.7;
  pose.elbowL[0] = -0.3;
  pose.elbowR[0] = -0.2;
  pose.hipL[0] = -0.3;
  pose.hipR[0] = 0.2;
  pose.kneeL[0] = 0.7;
  pose.kneeR[0] = 0.4;
}

function applyVictory(pose: PoseTargets, time: number): void {
  const bounce = Math.abs(Math.sin(time * 4)) * 0.05;
  pose.pelvisY += bounce;
  pose.shoulderL[0] = -0.2;
  pose.shoulderR[0] = -0.2;
  pose.shoulderL[2] = -2.5;
  pose.shoulderR[2] = 2.5;
  pose.elbowL[0] = -0.2;
  pose.elbowR[0] = -0.2;
  pose.spine[0] = -0.1;
  pose.head[0] = -0.2;
  pose.hipL[0] = -0.1;
  pose.hipR[0] = 0.1;
  pose.kneeL[0] = 0.15;
  pose.kneeR[0] = 0.15;
}

function applyDefeat(pose: PoseTargets): void {
  pose.pelvisY = 0.38;
  pose.hipL[0] = -1.1;
  pose.hipR[0] = -1.1;
  pose.kneeL[0] = 1.7;
  pose.kneeR[0] = 1.7;
  pose.footL[0] = -0.8;
  pose.footR[0] = -0.8;
  pose.spine[0] = 0.5;
  pose.head[0] = 0.4;
  pose.shoulderL[0] = 0.3;
  pose.shoulderR[0] = 0.3;
  pose.elbowL[0] = -0.6;
  pose.elbowR[0] = -0.6;
}

function applyIntro(pose: PoseTargets, time: number): void {
  const wave = Math.sin(time * 4) * 0.25;
  pose.shoulderR[0] = -2.3;
  pose.shoulderR[2] = 0.35 + wave;
  pose.elbowR[0] = -0.4;
  pose.head[1] = Math.sin(time * 2) * 0.08;
}

function applyStunned(pose: PoseTargets, time: number): void {
  const wobble = Math.sin(time * 6) * 0.12;
  pose.spine[0] = 0.15;
  pose.spine[2] = wobble;
  pose.head[0] = -0.1;
  pose.head[2] = wobble * 1.4;
  pose.shoulderL[0] = 0.2;
  pose.shoulderR[0] = 0.2;
  pose.elbowL[0] = -0.5;
  pose.elbowR[0] = -0.5;
}

function dampValue(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function dampRotation(node: TransformNode, target: [number, number, number], lambda: number, dt: number): void {
  node.rotation.x = dampValue(node.rotation.x, target[0], lambda, dt);
  node.rotation.y = dampValue(node.rotation.y, target[1], lambda, dt);
  node.rotation.z = dampValue(node.rotation.z, target[2], lambda, dt);
}

export class PoseAnimator {
  update(rig: CharacterRig, f: FighterState, time: number, dt: number): void {
    const pose = basePose(time);
    const nodes: RigNodes = rig.nodes;

    if (f.ko || f.state === 'ko') {
      applyKO(pose, f);
    } else if (f.state === 'victory') {
      applyVictory(pose, time);
    } else if (f.state === 'defeat') {
      applyDefeat(pose);
    } else if (f.state === 'intro') {
      applyIntro(pose, time);
    } else if (f.state === 'stunned') {
      applyStunned(pose, time);
    } else if (f.state === 'hitstun') {
      applyHitstun(pose, f.stateFrame, f.stun);
      if (f.airborne) {
        pose.hipL[0] = -0.5;
        pose.hipR[0] = -0.2;
        pose.kneeL[0] = 0.8;
        pose.kneeR[0] = 0.5;
      }
    } else if (f.state === 'block' || f.state === 'blockstun') {
      applyBlock(pose);
    } else if (f.state === 'crouch') {
      applyCrouch(pose);
    } else if (f.state === 'jump') {
      applyJump(pose, f.stateFrame);
    } else if (f.state === 'attack' || f.state === 'finisher') {
      applyAttack(pose, f);
      if (f.move?.isFinisher) {
        pose.shoulderL[2] = -1.5;
        pose.shoulderR[2] = 1.5;
        pose.spine[0] = -0.15;
        pose.head[0] = -0.15;
      }
    } else if (f.state === 'finisherVictim') {
      pose.spine[0] = -0.5;
      pose.head[0] = -0.45;
      pose.pelvisRot[2] = 0.15;
      pose.shoulderL[0] = 0.6;
      pose.shoulderR[0] = 0.5;
      pose.shoulderL[2] = -0.5;
      pose.shoulderR[2] = 0.5;
    } else if (f.state === 'tagIn' || f.state === 'tagOut') {
      pose.spine[0] = 0.2;
      pose.shoulderL[0] = -1.4;
      pose.shoulderR[0] = -0.5;
      pose.elbowL[0] = -0.3;
      pose.elbowR[0] = -0.8;
    } else if (f.state === 'knockdown' || f.state === 'wakeup') {
      const t = clamp(f.stateFrame / (f.state === 'knockdown' ? 38 : 20), 0, 1);
      if (f.state === 'knockdown') {
        pose.pelvisY = BASE_HIP_Y - t * 0.45;
        pose.pelvisRot[2] = (f.facing === 1 ? -1 : 1) * t * 1.2;
        pose.hipL[0] = -0.4 * t;
        pose.kneeL[0] = 0.9 * t;
      } else {
        pose.pelvisY = BASE_HIP_Y - (1 - t) * 0.35;
        pose.hipL[0] = -0.8 * (1 - t);
        pose.kneeL[0] = 1.2 * (1 - t);
        pose.spine[0] = 0.3 * (1 - t);
      }
    } else if (f.state === 'walk') {
      applyWalk(pose, f.stateFrame);
    } else if (f.airborne) {
      applyJump(pose, f.stateFrame);
    }

    if (f.state === 'attack' && f.move && f.move.behavior?.type === 'dash') {
      pose.spine[0] = 0.4;
    }

    const lambda = f.ko ? 5 : f.state === 'hitstun' ? 18 : 14;
    nodes.pelvis.position.y = dampValue(nodes.pelvis.position.y, pose.pelvisY, lambda, dt);
    dampRotation(nodes.pelvis, pose.pelvisRot, lambda, dt);
    dampRotation(nodes.spine, pose.spine, lambda, dt);
    dampRotation(nodes.chest, pose.chest, lambda, dt);
    dampRotation(nodes.neck, pose.neck, lambda, dt);
    dampRotation(nodes.head, pose.head, lambda, dt);
    dampRotation(nodes.shoulderL, pose.shoulderL, lambda, dt);
    dampRotation(nodes.shoulderR, pose.shoulderR, lambda, dt);
    dampRotation(nodes.elbowL, pose.elbowL, lambda, dt);
    dampRotation(nodes.elbowR, pose.elbowR, lambda, dt);
    dampRotation(nodes.handL, pose.handL, lambda, dt);
    dampRotation(nodes.handR, pose.handR, lambda, dt);
    dampRotation(nodes.hipL, pose.hipL, lambda, dt);
    dampRotation(nodes.hipR, pose.hipR, lambda, dt);
    dampRotation(nodes.kneeL, pose.kneeL, lambda, dt);
    dampRotation(nodes.kneeR, pose.kneeR, lambda, dt);
    dampRotation(nodes.footL, pose.footL, lambda, dt);
    dampRotation(nodes.footR, pose.footR, lambda, dt);
  }
}
