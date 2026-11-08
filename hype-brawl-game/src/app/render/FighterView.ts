import * as THREE from 'three';
import type { Fighter } from '../../fighters/Fighter';
import type { FighterDefinition } from '../../fighters/types';
import { lerp } from '../../utils/math';
import { buildFighterRig, disposeGroup, type FighterRig } from './fighterModels';

export class FighterView {
  readonly rig: FighterRig;
  readonly definition: FighterDefinition;

  constructor(definition: FighterDefinition, paletteIndex: number) {
    this.definition = definition;
    this.rig = buildFighterRig(definition, paletteIndex);
  }

  update(fighter: Fighter, alpha: number, time: number): void {
    const rig = this.rig;
    rig.root.position.set(
      lerp(fighter.prevPos.x, fighter.pos.x, alpha),
      lerp(fighter.prevPos.y, fighter.pos.y, alpha),
      0,
    );
    rig.root.scale.x = fighter.facing;
    rig.root.rotation.y = 0;

    if (fighter.eliminated || fighter.state === 'dead') {
      rig.root.visible = false;
      return;
    }
    rig.root.visible = !(fighter.invuln > 0 && Math.floor(time * 26) % 2 === 0);

    this.resetPose();
    rig.shadow.visible = fighter.grounded && fighter.state !== 'ledge' && fighter.state !== 'grabbed';
    this.applyState(fighter, time);
    this.applyShield(fighter, time);
    this.applyAura(fighter, time);
  }

  updatePreview(time: number): void {
    const rig = this.rig;
    rig.root.visible = true;
    rig.root.scale.x = 1;
    rig.root.rotation.y = Math.sin(time * 0.65) * 0.34;
    this.resetPose();
    rig.shadow.visible = true;
    rig.body.position.y = Math.sin(time * 2.2) * 0.02;
    rig.head.rotation.y = Math.sin(time * 1.1) * 0.12;
    rig.leftArm.rotation.z = -0.18 + Math.sin(time * 1.8) * 0.05;
    rig.rightArm.rotation.z = 0.18 + Math.sin(time * 1.8 + 1) * 0.05;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    rig.shield.visible = false;
    rig.aura.visible = false;
    if (rig.prop) {
      rig.prop.rotation.z = Math.sin(time * 1.5) * 0.08;
      rig.prop.rotation.x = 0;
    }
  }

  private resetPose(): void {
    const rig = this.rig;
    rig.body.position.set(0, 0, 0);
    rig.body.rotation.set(0, 0, 0);
    rig.body.scale.set(1, 1, 1);
    rig.head.rotation.set(0, 0, 0);
    rig.leftArm.rotation.set(0, 0, -0.18);
    rig.rightArm.rotation.set(0, 0, 0.18);
    rig.leftLeg.rotation.set(0, 0, 0);
    rig.rightLeg.rotation.set(0, 0, 0);
    rig.torso.rotation.set(0, 0, 0);
    rig.shield.visible = false;
    rig.aura.visible = false;
    rig.shadow.visible = false;
    if (rig.prop) rig.prop.rotation.set(0, 0, 0);
  }

  private applyState(fighter: Fighter, time: number): void {
    const rig = this.rig;
    const speed = Math.abs(fighter.vel.x);
    switch (fighter.state) {
      case 'idle': {
        rig.body.position.y = Math.sin(time * 2.6 + fighter.slot) * 0.018;
        rig.leftArm.rotation.z += Math.sin(time * 2.2) * 0.04;
        rig.rightArm.rotation.z += Math.sin(time * 2.2 + 0.8) * 0.04;
        rig.head.rotation.z = Math.sin(time * 1.4) * 0.03;
        break;
      }
      case 'walk':
      case 'run': {
        const rate = fighter.state === 'run' ? 12 : 7;
        const phase = time * rate + fighter.slot;
        const swing = fighter.state === 'run' ? 0.72 : 0.45;
        rig.leftLeg.rotation.z = Math.sin(phase) * swing;
        rig.rightLeg.rotation.z = -Math.sin(phase) * swing;
        rig.leftArm.rotation.z = -Math.sin(phase) * (swing * 0.6);
        rig.rightArm.rotation.z = Math.sin(phase) * (swing * 0.6);
        rig.body.position.y = Math.abs(Math.sin(phase)) * 0.045;
        rig.body.rotation.z = -0.07 - Math.min(0.08, speed * 0.12);
        rig.head.rotation.z = 0.03;
        break;
      }
      case 'crouch': {
        rig.body.position.y = -0.13;
        rig.body.scale.y = 0.88;
        rig.leftArm.rotation.z = -0.45;
        rig.rightArm.rotation.z = 0.45;
        rig.leftLeg.rotation.z = -0.25;
        rig.rightLeg.rotation.z = 0.25;
        break;
      }
      case 'air': {
        const rising = fighter.vel.y > 0.02;
        rig.leftArm.rotation.z = rising ? -2.5 : -1.15;
        rig.rightArm.rotation.z = rising ? 2.5 : 1.15;
        rig.leftLeg.rotation.z = rising ? -0.35 : 0.16;
        rig.rightLeg.rotation.z = rising ? 0.5 : -0.16;
        rig.body.rotation.z = rising ? -0.03 : 0.05;
        if (fighter.fastFall) {
          rig.body.scale.y = 1.06;
          rig.leftArm.rotation.z = -2.7;
          rig.rightArm.rotation.z = 2.7;
        }
        break;
      }
      case 'landing': {
        rig.body.position.y = -0.12;
        rig.body.scale.y = 0.9;
        rig.leftArm.rotation.z = -0.5;
        rig.rightArm.rotation.z = 0.5;
        break;
      }
      case 'hitstun': {
        rig.body.rotation.z = -0.16 + Math.sin(time * 24) * 0.08;
        rig.body.rotation.x = 0.1;
        rig.leftArm.rotation.z = -1.3 + Math.sin(time * 20) * 0.2;
        rig.rightArm.rotation.z = 1.3 + Math.cos(time * 20) * 0.2;
        rig.leftLeg.rotation.z = -0.25;
        rig.rightLeg.rotation.z = 0.3;
        rig.head.rotation.z = 0.12;
        break;
      }
      case 'shield': {
        rig.leftArm.rotation.z = 1.15;
        rig.rightArm.rotation.z = 1.15;
        rig.body.rotation.x = -0.06;
        rig.leftLeg.rotation.z = -0.12;
        rig.rightLeg.rotation.z = 0.12;
        break;
      }
      case 'shieldstun': {
        rig.body.rotation.x = 0.13;
        rig.leftArm.rotation.z = 1.25;
        rig.rightArm.rotation.z = 1.25;
        break;
      }
      case 'shieldbreak': {
        rig.body.rotation.z = Math.sin(time * 16) * 0.2;
        rig.leftArm.rotation.z = -2.2;
        rig.rightArm.rotation.z = 2.2;
        break;
      }
      case 'roll': {
        const progress = 1 - Math.min(1, Math.max(0, fighter.rollTimer / 26));
        rig.body.rotation.x = -progress * Math.PI * 1.8;
        rig.body.position.y = Math.sin(progress * Math.PI) * 0.2;
        rig.body.scale.y = 0.85;
        break;
      }
      case 'airdodge': {
        rig.body.rotation.x = Math.sin(time * 16) * 0.6;
        rig.body.rotation.z = Math.cos(time * 13) * 0.2;
        rig.leftArm.rotation.z = -1.9;
        rig.rightArm.rotation.z = 1.9;
        break;
      }
      case 'ledge': {
        rig.leftArm.rotation.z = -2.75;
        rig.rightArm.rotation.z = 2.75;
        rig.leftLeg.rotation.z = -0.18;
        rig.rightLeg.rotation.z = 0.18;
        rig.body.rotation.x = -0.12;
        break;
      }
      case 'charge': {
        const shake = Math.sin(time * 45) * 0.018;
        rig.body.position.y = -0.09 + shake;
        rig.body.rotation.z = -0.06;
        rig.leftArm.rotation.z = -0.95;
        rig.rightArm.rotation.z = -0.95;
        rig.leftLeg.rotation.z = -0.28;
        rig.rightLeg.rotation.z = 0.28;
        rig.head.rotation.z = 0.04;
        break;
      }
      case 'grabbing': {
        rig.leftArm.rotation.z = 1.35;
        rig.rightArm.rotation.z = 1.35;
        rig.leftLeg.rotation.z = -0.1;
        rig.rightLeg.rotation.z = 0.1;
        break;
      }
      case 'grabbed': {
        rig.body.rotation.z = 0.14;
        rig.leftArm.rotation.z = -1.4;
        rig.rightArm.rotation.z = 1.4;
        break;
      }
      case 'taunt':
      case 'victory': {
        const bounce = Math.abs(Math.sin(time * (fighter.state === 'victory' ? 4 : 2.6))) * 0.12;
        rig.body.position.y = bounce;
        rig.leftArm.rotation.z = -2.65;
        rig.rightArm.rotation.z = 2.65;
        rig.head.rotation.z = Math.sin(time * 2) * 0.08;
        break;
      }
      case 'attack': {
        this.applyAttackPose(fighter, time);
        break;
      }
      default:
        break;
    }
    if (fighter.state === 'attack' && rig.prop && fighter.currentMove) {
      rig.prop.rotation.x = -0.35;
    }
  }

  private applyAttackPose(fighter: Fighter, time: number): void {
    const rig = this.rig;
    const current = fighter.currentMove;
    if (!current) return;
    const slot = current.move.slot;
    const progress = Math.min(1, current.frame / Math.max(1, current.move.totalFrames));
    const activeStart = current.move.hits.length > 0 ? current.move.hits[0].start / current.move.totalFrames : 0.35;
    const activeEnd = current.move.hits.length > 0 ? current.move.hits[current.move.hits.length - 1].end / current.move.totalFrames : 0.6;
    const active = progress >= activeStart && progress <= activeEnd;
    const windup = progress < activeStart;
    const swing = active ? 1 : windup ? -0.55 * (progress / Math.max(0.01, activeStart)) : 0.65 * (1 - (progress - activeEnd) / Math.max(0.01, 1 - activeEnd));

    switch (slot) {
      case 'jab':
      case 'sideTilt':
      case 'sideStrong':
      case 'forwardAir':
      case 'throwForward':
      case 'throwBack': {
        const reach = active ? (slot === 'jab' ? 1.35 : 1.75) : windup ? -0.35 : 0.8;
        rig.rightArm.rotation.z = reach * (swing > 0 ? 1 : -1);
        rig.leftArm.rotation.z = 0.55;
        rig.body.rotation.z = active ? -0.14 : 0.02;
        rig.body.rotation.y = active ? -0.18 : 0.05;
        rig.rightLeg.rotation.z = active ? 0.18 : 0;
        break;
      }
      case 'upTilt':
      case 'upStrong':
      case 'upAir':
      case 'throwUp': {
        rig.leftArm.rotation.z = -2.65 * Math.max(0.2, swing);
        rig.rightArm.rotation.z = 2.65 * Math.max(0.2, swing);
        rig.body.rotation.z = -0.08;
        rig.body.position.y = active ? 0.06 : 0;
        break;
      }
      case 'downTilt':
      case 'downStrong':
      case 'downAir':
      case 'throwDown': {
        rig.body.position.y = -0.1;
        rig.body.scale.y = 0.92;
        rig.rightLeg.rotation.z = active ? 1.35 : -0.2;
        rig.leftArm.rotation.z = active ? 1.0 : -0.3;
        rig.rightArm.rotation.z = active ? 1.0 : 0.3;
        if (slot !== 'downAir') rig.body.rotation.z = active ? -0.12 : 0;
        break;
      }
      case 'neutralAir': {
        rig.body.rotation.y = progress * Math.PI * 2;
        rig.leftArm.rotation.z = -1.35;
        rig.rightArm.rotation.z = 1.35;
        rig.leftLeg.rotation.z = -0.2;
        rig.rightLeg.rotation.z = 0.2;
        break;
      }
      case 'backAir': {
        rig.leftLeg.rotation.z = active ? -1.55 : 0.15;
        rig.rightLeg.rotation.z = active ? -1.2 : -0.1;
        rig.leftArm.rotation.z = active ? -1.1 : -0.25;
        rig.rightArm.rotation.z = active ? 0.6 : 0.25;
        rig.body.rotation.z = active ? 0.14 : 0;
        break;
      }
      case 'upSpecial': {
        rig.body.position.y = active ? 0.1 : -0.04;
        rig.body.rotation.z = -0.1;
        rig.leftArm.rotation.z = -2.7;
        rig.rightArm.rotation.z = 2.7;
        rig.leftLeg.rotation.z = 0.2;
        rig.rightLeg.rotation.z = -0.2;
        break;
      }
      case 'sideSpecial': {
        rig.body.rotation.x = active ? 0.22 : -0.03;
        rig.body.position.z = active ? 0.14 : -0.02;
        rig.leftArm.rotation.z = active ? -1.1 : -0.35;
        rig.rightArm.rotation.z = active ? -1.1 : 0.35;
        rig.rightLeg.rotation.z = active ? 0.5 : 0;
        break;
      }
      case 'neutralSpecial': {
        const pulse = active ? 1.25 : 0.5;
        rig.leftArm.rotation.z = -pulse;
        rig.rightArm.rotation.z = pulse;
        rig.body.rotation.x = active ? -0.05 : 0.08;
        rig.body.rotation.z = Math.sin(time * 10) * 0.02;
        break;
      }
      case 'downSpecial': {
        rig.body.rotation.y = progress * Math.PI * 4;
        rig.body.position.y = -0.06;
        rig.leftArm.rotation.z = -1.3;
        rig.rightArm.rotation.z = 1.3;
        break;
      }
      case 'grab': {
        rig.leftArm.rotation.z = active ? 1.35 : 0.55;
        rig.rightArm.rotation.z = active ? 1.35 : 0.55;
        rig.body.rotation.x = active ? 0.1 : 0;
        break;
      }
      case 'taunt': {
        rig.leftArm.rotation.z = -2.6;
        rig.rightArm.rotation.z = 2.6;
        rig.body.rotation.y = Math.sin(progress * Math.PI * 4) * 0.2;
        break;
      }
      default: {
        rig.leftArm.rotation.z = -0.7;
        rig.rightArm.rotation.z = 0.7;
        break;
      }
    }
  }

  private applyShield(fighter: Fighter, time: number): void {
    const rig = this.rig;
    const visible = fighter.state === 'shield' || fighter.state === 'shieldstun';
    rig.shield.visible = visible;
    if (!visible) return;
    const ratio = Math.max(0.15, Math.min(1, fighter.shieldHP / 100));
    const scale = 0.7 + ratio * 0.45;
    rig.shield.scale.set(scale, scale * 1.05, scale);
    rig.shieldMaterial.color.setHSL(0.55 * ratio, 0.9, 0.55);
    rig.shieldMaterial.opacity = 0.12 + ratio * 0.16 + Math.sin(time * 8) * 0.02;
  }

  private applyAura(fighter: Fighter, time: number): void {
    const rig = this.rig;
    const active = fighter.hypeFrames > 0;
    rig.aura.visible = active;
    if (!active) return;
    rig.aura.rotation.y = time * 2.6;
    const pulse = 1 + Math.sin(time * 9) * 0.06;
    rig.aura.scale.set(pulse, pulse, pulse);
    rig.aura.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.32 + Math.sin(time * 7) * 0.08;
    });
  }

  setPreviewPosition(x: number, y: number): void {
    this.rig.root.position.set(x, y, 0);
  }

  dispose(): void {
    disposeGroup(this.rig.root);
  }
}
