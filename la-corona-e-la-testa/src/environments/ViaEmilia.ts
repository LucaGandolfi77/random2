import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createDayLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { vnoise } from '../utils/math';
import { BaseEnvironment } from './BaseEnvironment';
import {
  createBuilding,
  createGround,
  createGrass,
  createSignBoard,
  createTree,
} from './props';
import {
  createCart,
  createFarmhouse,
  createMilestone,
  createPoplar,
  createRomanRoad,
} from './propsRoman';

export class ViaEmilia extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly grass: THREE.InstancedMesh;
  private readonly poplars: THREE.Group[] = [];

  constructor(id: string) {
    super(id, 'viaEmilia');
    this.fog = { color: 0xb9c0ab, near: 32, far: 130 };

    this.mark('via_enter', -18, 0, 7);
    this.mark('via_milestone', 2, 0, 2);
    this.mark('via_farm', 8, 0, -2);
    this.mark('via_child', 6, 0, 0);
    this.mark('via_dog', 8.5, 0, -1.5);
    this.mark('via_far', 15, 0, -7);
    this.mark('via_soldier_enter', 18, 0, -6);
    this.mark('via_soldier', 10, 0, -1);
    this.mark('via_exit', -20, 0, -2);
    this.mark('cam_via_est', -12, 5, 16);
    this.mark('cam_via_farm', 10, 2.2, 8);
    this.mark('cam_via_dog', 10.5, 1.6, 3);
    this.mark('cam_via_road', 14, 2.4, 6);
    this.mark('cam_via_milestone', 4, 1.5, 6);
    this.mark('cam_via_farewell', 9, 1.8, 7);
    this.mark('cam_via_exit', -12, 4, 10);

    this.group.add(
      createDayLighting({
        sunColor: 0xf0cf98,
        keyIntensity: 2.0,
        hemiIntensity: 1.05,
        skyColor: 0xc7d7dc,
        groundColor: 0x6b664a,
      }).group,
    );

    this.sky = new Sky({
      top: 0x7fa4bd,
      horizon: 0xd9d2ae,
      bottom: 0x6e6c4f,
      stars: 0,
    });
    this.group.add(this.sky.group);

    const ground = createGround(120, 120, 0x7b7a52, 0);
    this.group.add(ground);

    const road = createRomanRoad(11, 130);
    road.position.set(0, 0, -2);
    this.group.add(road);

    this.grass = createGrass(80, 80, 1300, 51);
    this.grass.position.y = 0.01;
    this.group.add(this.grass);

    const milestone = createMilestone('XV');
    milestone.position.set(5.4, 0, 2.2);
    milestone.rotation.y = -0.3;
    this.group.add(milestone);

    const farm = createFarmhouse();
    farm.position.set(9.5, 0, -4.2);
    farm.rotation.y = -0.25;
    this.group.add(farm);

    const cart = createCart();
    cart.position.set(14.5, 0, -2.5);
    cart.rotation.y = 1.2;
    this.group.add(cart);

    const barn = createBuilding({
      width: 5,
      height: 3.4,
      depth: 4,
      color: 0x8f7a5d,
      seed: 4,
      windows: false,
    });
    barn.position.set(14.5, 0, -7);
    barn.rotation.y = 0.2;
    this.group.add(barn);

    const tree = createTree(91, 1.2);
    tree.position.set(-8, 0, -5);
    this.group.add(tree);

    for (const [x, z, seed, scale] of [
      [-14, -7, 3, 1.0],
      [-8, -9, 5, 0.9],
      [-2, -10, 7, 1.1],
      [4, -11, 11, 1.0],
      [10, -12, 13, 0.95],
      [16, -13, 17, 1.05],
      [-18, 9, 19, 0.85],
      [-12, 11, 23, 0.95],
      [-6, 13, 29, 1.0],
      [0, 15, 31, 0.9],
    ] as const) {
      const poplar = createPoplar(seed, scale);
      poplar.position.set(x, 0, z);
      this.group.add(poplar);
      this.poplars.push(poplar);
    }

    const sign = createSignBoard({
      text: 'PARMA',
      subtext: 'XV miglia',
      width: 1.3,
      height: 0.6,
      postHeight: 1.1,
      background: '#cdc0a2',
      foreground: '#3c3328',
      border: 'rgba(60, 51, 40, 0.5)',
    });
    sign.position.set(4.2, 0, 4.2);
    sign.rotation.y = 0.25;
    this.group.add(sign);

    this.addActor(CharacterFactory.donnino(), 'via_enter', -Math.PI / 2, true);
    this.addActor(CharacterFactory.contadino(), 'via_farm', Math.PI / 2, true);
    this.addActor(CharacterFactory.bambino(), 'via_child', Math.PI / 2, true);
    this.addActor(CharacterFactory.cane(), 'via_dog', Math.PI / 2, true);
    this.addActor(CharacterFactory.soldato(), 'via_soldier_enter', Math.PI / 2, false);

    this.menuCamera = {
      position: new THREE.Vector3(-11, 3.8, 12),
      target: new THREE.Vector3(2, 1.3, 0),
      fov: 40,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    const sway = vnoise(time * 0.35, 3);
    for (let index = 0; index < this.poplars.length; index += 1) {
      this.poplars[index].rotation.z = Math.sin(time * 0.55 + index) * 0.012 + sway * 0.006;
    }
  }
}
