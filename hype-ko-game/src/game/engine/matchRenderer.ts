import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Scene, type AbstractEngine } from '@babylonjs/core';
import type { MatchSim } from '../combat/simulation';
import type { SimEvent } from '../combat/types';
import type { FighterDefinition } from '../../data/fighters/types';
import type { StageDefinition } from '../../data/stages';
import { PoseAnimator } from '../animations/poseAnimator';
import { MatchCamera } from '../camera/matchCamera';
import { CharacterRig } from './character';
import { StageRig } from './stage';
import { VFXManager } from './vfx';
import type { RenderQuality } from './backend';

export interface MatchRendererOptions {
  quality: RenderQuality;
  outline?: boolean;
}

export class MatchRenderer {
  readonly scene: Scene;
  readonly stage: StageRig;
  readonly camera: MatchCamera;
  readonly vfx: VFXManager;
  readonly rigs: CharacterRig[];
  private readonly pose = new PoseAnimator();
  private readonly glow: GlowLayer | null;
  private lastPhase = '';

  constructor(
    scene: Scene,
    engine: AbstractEngine,
    stageDef: StageDefinition,
    fighterDefs: FighterDefinition[],
    options: MatchRendererOptions
  ) {
    this.scene = scene;
    this.stage = new StageRig(scene, stageDef, options.quality);
    this.camera = new MatchCamera(scene, stageDef);
    this.vfx = new VFXManager(scene);
    this.glow = options.quality.glow
      ? new GlowLayer('matchGlow', scene, { mainTextureFixedSize: 512, blurKernelSize: 24 })
      : null;
    if (this.glow) {
      this.glow.intensity = 0.5;
    }

    this.rigs = fighterDefs.map((def) => {
      const rig = new CharacterRig(scene, def, {
        glow: options.quality.glow,
        outline: options.outline ?? options.quality.glow
      });
      for (const mesh of rig.meshes) {
        if (mesh.name !== 'shadowBlob' && mesh.name !== 'auraDisc') {
          this.stage.addShadowCaster(mesh);
        }
      }
      return rig;
    });

    engine.resize();
  }

  sync(sim: MatchSim, dt: number, events: SimEvent[]): void {
    const clamped = Math.min(dt, 0.05);
    this.stage.update(clamped);
    this.vfx.syncProjectiles(sim.projectiles);
    this.vfx.syncZones(sim.zones);

    if (sim.phase === 'intro' && this.lastPhase !== 'intro') {
      this.camera.resetIntro();
    }
    this.lastPhase = sim.phase;

    for (const fighter of sim.fighters) {
      const rig = this.rigs[fighter.index];
      if (!rig) continue;
      if (!fighter.active) {
        rig.setVisible(false);
        continue;
      }
      rig.setVisible(true);
      rig.setPosition(fighter.x, fighter.y);
      rig.setFacing(fighter.facing);
      rig.setShadow(fighter.x, 0, fighter.y);
      rig.setFlash(fighter.flash > 0 ? fighter.flash / 6 : 0);
      const aura =
        fighter.aura > 0
          ? Math.min(1, fighter.aura / 60)
          : Math.min(0.5, fighter.super / 250 + fighter.hype / 300);
      rig.setAura(aura);
      this.pose.update(rig, fighter, sim.frame / 60, clamped);
    }

    for (const event of events) {
      this.handleEvent(sim, event);
    }

    this.camera.update(sim, clamped);
    this.vfx.update(clamped);
  }

  private handleEvent(sim: MatchSim, event: SimEvent): void {
    switch (event.type) {
      case 'hit': {
        const attacker = sim.fighters[event.attacker];
        const color = attacker?.def.id ? this.rigs[event.attacker]?.def.appearance.accent ?? '#ffffff' : '#ffffff';
        this.vfx.burst(event.x, event.y, color, event.heavy ? 1.6 : 1, event.heavy);
        this.camera.addShake(event.heavy ? 0.14 : 0.06);
        break;
      }
      case 'block': {
        this.vfx.ring(event.x, event.y, '#9ad1ff', 0.25, 0.7, false);
        this.camera.addShake(0.025);
        break;
      }
      case 'parry': {
        this.vfx.ring(event.x, event.y, '#ffffff', 0.3, 1.2, false);
        this.vfx.burst(event.x, event.y, '#ffffff', 0.8, false);
        this.camera.addShake(0.08);
        break;
      }
      case 'counter': {
        this.vfx.burst(event.x, event.y, '#ffd166', 1.4, true);
        this.camera.addShake(0.1);
        break;
      }
      case 'ko': {
        const loser = sim.fighters[event.loser];
        if (loser) {
          this.vfx.burst(loser.x, 1.0, '#ff2e63', 2.5, true);
          this.vfx.ring(loser.x, 0.05, '#ff2e63', 0.6, 4, true);
        }
        this.camera.addShake(0.35);
        break;
      }
      case 'super': {
        const fighter = sim.fighters[event.fighter];
        if (fighter) {
          this.vfx.superBurst(fighter.x, 1.0, fighter.def.id ? this.rigs[event.fighter]?.def.appearance.aura ?? '#ffffff' : '#ffffff');
        }
        this.camera.addShake(0.22);
        break;
      }
      case 'hype': {
        const fighter = sim.fighters[event.fighter];
        if (fighter) {
          this.vfx.superBurst(fighter.x, 0.9, '#ffd166');
        }
        this.camera.addShake(0.18);
        break;
      }
      case 'finisher': {
        if (event.phase === 'impact') {
          const defender = sim.fighters[event.defender];
          if (defender) this.vfx.burst(defender.x, 1.1, '#ffffff', 3, true);
          this.camera.addShake(0.3);
        }
        break;
      }
      case 'explosion': {
        this.vfx.spawnExplosion(event.x, event.y, event.color);
        this.camera.addShake(0.16);
        break;
      }
      case 'projectile': {
        this.vfx.ring(event.x, event.y, event.color, 0.2, 0.7, false);
        break;
      }
      case 'zone': {
        this.vfx.ring(event.x, 0.05, event.color, 0.5, 2.5, true);
        break;
      }
      case 'wall': {
        this.vfx.ring(event.x, 0.05, '#ffffff', 0.2, 0.6, true);
        break;
      }
      default:
        break;
    }
  }

  render(): void {
    this.scene.render();
  }

  dispose(): void {
    for (const rig of this.rigs) rig.dispose();
    this.stage.dispose();
    this.vfx.dispose();
    this.camera.dispose();
    this.glow?.dispose();
  }
}
