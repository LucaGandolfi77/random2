import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createDawnLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { vnoise } from '../utils/math';
import { BaseEnvironment } from './BaseEnvironment';
import { createGround, createPaving, flatMaterial, glowSprite } from './props';
import {
  createBridge,
  createCross,
  createMilestone,
  createPoplar,
  createReeds,
  createRiver,
  createStoneBlocks,
} from './propsRoman';

export class Stirone extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly water: THREE.Group;
  private readonly sunGlow: THREE.Sprite;

  constructor(id: string) {
    super(id, 'stirone');
    this.fog = { color: 0x2a2320, near: 24, far: 95 };

    this.mark('stirone_enter', 12, 0, 8);
    this.mark('stirone_bank', 2, 0, 2);
    this.mark('stirone_centurione', -2, 0, 1);
    this.mark('stirone_soldier', -4, 0, 3);
    this.mark('stirone_carnefice', -3.5, 0, 4.5);
    this.mark('stirone_body', 0, 0, 1.2);
    this.mark('stirone_river', 0, 0.9, -7);
    this.mark('cam_stirone_est', 14, 5, 14);
    this.mark('cam_stirone_two', 4, 1.8, 7);
    this.mark('cam_stirone_close', -0.5, 1.6, 6);
    this.mark('cam_stirone_river', 5, 2.2, -1);
    this.mark('cam_stirone_body', 3, 2.0, 3.6);

    this.group.add(
      createDawnLighting({
        sunColor: 0xe59a5c,
        keyIntensity: 1.45,
        hemiIntensity: 0.82,
        skyColor: 0xc08a6a,
        groundColor: 0x40342d,
      }).group,
    );

    this.sky = new Sky({
      top: 0x1b2739,
      horizon: 0xb5714f,
      bottom: 0x15181d,
      stars: 80,
      starSeed: 17,
      starOpacity: 0.35,
    });
    this.group.add(this.sky.group);

    this.sunGlow = glowSprite('#ffb06a', 14);
    this.sunGlow.position.set(-30, 8, -55);
    this.group.add(this.sunGlow);

    const ground = createGround(80, 80, 0x5e5644, 0);
    this.group.add(ground);

    this.water = createRiver(10, 60);
    this.water.rotation.y = Math.PI / 2;
    this.water.position.set(0, 0, -9);
    this.group.add(this.water);

    const bank = createPaving(26, 8, 1.2, 71, [0x6e6552, 0x5b5344, 0x7e735f]);
    bank.position.set(0, 0, 2.6);
    this.group.add(bank);

    const bridge = createBridge();
    bridge.position.set(-14, 0, -9);
    bridge.rotation.y = Math.PI / 2;
    this.group.add(bridge);

    for (const [x, z, count, seed] of [
      [-9, -2, 90, 3],
      [8, -3, 80, 5],
      [-4, -9, 70, 7],
      [11, 1, 50, 11],
    ] as const) {
      const reeds = createReeds(count, seed, 6, 4);
      reeds.position.set(x, 0, z);
      this.group.add(reeds);
    }

    for (const [x, z, seed, scale] of [
      [-12, 2, 13, 1.0],
      [13, 4, 17, 0.9],
      [-15, -7, 19, 1.1],
      [16, -8, 23, 0.95],
    ] as const) {
      const poplar = createPoplar(seed, scale);
      poplar.position.set(x, 0, z);
      this.group.add(poplar);
    }

    const cross = createCross();
    cross.position.set(4.8, 0, 4.6);
    cross.rotation.y = -0.4;
    this.group.add(cross);

    const milestone = createMilestone('XV');
    milestone.position.set(-4.8, 0, 4.2);
    milestone.rotation.y = 0.4;
    this.group.add(milestone);

    const stones = createStoneBlocks(7, 37);
    stones.position.set(-6, 0, 1.5);
    this.group.add(stones);

    this.addActor(CharacterFactory.donnino(), 'stirone_enter', -Math.PI / 2, true);
    this.addActor(CharacterFactory.centurione(), 'stirone_centurione', Math.PI / 2, true);
    this.addActor(CharacterFactory.soldato(), 'stirone_soldier', Math.PI / 2, true);
    this.addActor(CharacterFactory.carnefice(), 'stirone_carnefice', Math.PI, true);

    this.menuCamera = {
      position: new THREE.Vector3(12, 4, 13),
      target: new THREE.Vector3(0, 1.4, 0),
      fov: 40,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    this.water.position.x = Math.sin(time * 0.12) * 0.18;
    (this.sunGlow.material as THREE.SpriteMaterial).opacity =
      0.55 + vnoise(time * 0.8, 4) * 0.12;
  }
}

export class StironeDawn extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly water: THREE.Group;
  private readonly dawnGlow: THREE.Sprite;

  constructor(id: string) {
    super(id, 'stironeDawn');
    this.fog = { color: 0x6d6960, near: 26, far: 110 };

    this.mark('dawn_enter', 11, 0, 7);
    this.mark('dawn_vedova', 4, 0, 3);
    this.mark('dawn_body', 0, 0, 1);
    this.mark('dawn_spot', 0, 0, -9);
    this.mark('dawn_far', -8, 0, -16);
    this.mark('dawn_grave', -8, 0, -16);
    this.mark('dawn_vedova_grave', -6, 0, -14);
    this.mark('cam_dawn_est', 12, 5, 13);
    this.mark('cam_dawn_witness', 5.5, 1.8, 6);
    this.mark('cam_dawn_body', 3, 1.6, 5);
    this.mark('cam_dawn_cross', 5, 2.0, -4);
    this.mark('cam_dawn_lie', 0.5, 1.6, -11);

    this.group.add(
      createDawnLighting({
        sunColor: 0xf3c493,
        keyIntensity: 1.9,
        hemiIntensity: 1.1,
        skyColor: 0xd9b6a0,
        groundColor: 0x5d5848,
      }).group,
    );

    this.sky = new Sky({
      top: 0x677a9d,
      horizon: 0xf0c39a,
      bottom: 0x4f514c,
      stars: 0,
    });
    this.group.add(this.sky.group);

    this.dawnGlow = glowSprite('#ffe0b0', 18);
    this.dawnGlow.position.set(-34, 7, -60);
    this.group.add(this.dawnGlow);

    const ground = createGround(90, 90, 0x6f6b54, 0);
    this.group.add(ground);

    this.water = createRiver(10, 60);
    this.water.rotation.y = Math.PI / 2;
    this.water.position.set(0, 0, -9);
    this.group.add(this.water);

    const bank = createPaving(30, 10, 1.3, 73, [0x827a64, 0x6f6854, 0x92886f]);
    bank.position.set(0, 0, 2.8);
    this.group.add(bank);

    const bridge = createBridge();
    bridge.position.set(-14, 0, -9);
    bridge.rotation.y = Math.PI / 2;
    this.group.add(bridge);

    for (const [x, z, count, seed] of [
      [-8, -2, 100, 13],
      [9, -3, 90, 15],
      [-2, -10, 70, 17],
      [12, 2, 55, 19],
    ] as const) {
      const reeds = createReeds(count, seed, 7, 4);
      reeds.position.set(x, 0, z);
      this.group.add(reeds);
    }

    for (const [x, z, seed, scale] of [
      [-13, 3, 31, 1.0],
      [14, 5, 33, 0.9],
      [-16, -8, 37, 1.1],
      [17, -7, 41, 0.95],
    ] as const) {
      const poplar = createPoplar(seed, scale);
      poplar.position.set(x, 0, z);
      this.group.add(poplar);
    }

    const cross = createCross();
    cross.position.set(-9.5, 0, -16);
    cross.rotation.y = 0.3;
    this.group.add(cross);

    const stones = createStoneBlocks(5, 43);
    stones.position.set(-5, 0, 2);
    this.group.add(stones);

    this.addActor(CharacterFactory.donnino(), 'dawn_body', Math.PI / 2, true);
    this.addActor(CharacterFactory.vedova(), 'dawn_enter', -Math.PI / 2, true);

    this.menuCamera = {
      position: new THREE.Vector3(11, 3.6, 12),
      target: new THREE.Vector3(-2, 1.2, -2),
      fov: 40,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    this.water.position.x = Math.sin(time * 0.1) * 0.12;
    (this.dawnGlow.material as THREE.SpriteMaterial).opacity =
      0.62 + vnoise(time * 0.7, 5) * 0.1;
  }
}
