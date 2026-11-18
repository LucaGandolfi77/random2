import * as THREE from 'three';
import type { Materials } from '../renderer/ProceduralAssets';
import type { World } from '../world/Interactable';
import { NavigationSystem } from './NavigationSystem';
import { Shadow, type ShadowContext, type ShadowType } from './Shadow';

const ROSTER: ShadowType[] = ['watcher', 'crawler', 'tall', 'mimic'];

export class ShadowManager {
  readonly shadows: Shadow[] = [];
  nav: NavigationSystem;
  private captureTriggered = false;

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private materials: Materials,
    private onCapture: () => void,
    private onSound: (name: string, at?: THREE.Vector3) => void
  ) {
    this.nav = new NavigationSystem(world.navNodes, world.navEdges);
  }

  reset() {
    for (const s of this.shadows) this.scene.remove(s.group);
    this.shadows.length = 0;
    this.captureTriggered = false;
  }

  setWorld(world: World) {
    this.reset();
    this.world = world;
    this.nav = new NavigationSystem(world.navNodes, world.navEdges);
  }

  private spawn(type: ShadowType, player: THREE.Vector3) {
    if (!this.world.shadowsSpawn.length) return;
    const spots = this.world.shadowsSpawn.filter((p) => p.distanceTo(player) > 6);
    const pos = (spots.length ? spots[Math.floor(Math.random() * spots.length)] : this.world.shadowsSpawn[0]).clone();
    const s = new Shadow(type, pos, this.materials);
    this.scene.add(s.group);
    this.shadows.push(s);
    this.onSound('stinger');
  }

  update(dt: number, time: number, threat: number, playerPos: THREE.Vector3, playerYaw: number, flashlight: boolean, lightNear: boolean, speedFactor: number, safe = false): number {
    const wanted = safe ? 0 : threat >= 80 ? 4 : threat >= 60 ? 3 : threat >= 40 ? 2 : threat >= 20 ? 1 : 0;
    while (this.shadows.length < wanted) {
      const type = ROSTER[this.shadows.length % ROSTER.length];
      this.spawn(type, playerPos);
    }

    const ctx: ShadowContext = {
      time, threat, playerPos, playerYaw, flashlight, lightNear,
      world: this.world, nav: this.nav, difficultySpeed: speedFactor
    };
    let proximity = 0;
    for (const s of this.shadows) {
      const r = s.update(dt, ctx);
      proximity = Math.max(proximity, Math.max(0, 1 - r.distance / 11));
      if (r.captured && !this.captureTriggered) {
        this.captureTriggered = true;
        this.onSound('capture', s.group.position.clone());
        this.onCapture();
      }
    }
    return proximity;
  }
}
