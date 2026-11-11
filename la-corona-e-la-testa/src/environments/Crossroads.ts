import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { vnoise } from '../utils/math';
import { BaseEnvironment } from './BaseEnvironment';
import {
  createGround,
  createLamp,
  createPaving,
  createSignBoard,
  createTree,
  flatMaterial,
} from './props';
import type { Lamp } from './props';
import {
  createMilestone,
  createPoplar,
  createRomanRoad,
  createStoneBlocks,
} from './propsRoman';

export class Crossroads extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly lamp: Lamp;
  private readonly rain: THREE.Points;
  private readonly shrineGlow: THREE.Sprite;

  constructor(id: string) {
    super(id, 'crossroads');
    this.fog = { color: 0x0a1320, near: 18, far: 80 };

    this.mark('cross_enter', 12, 0, 7);
    this.mark('cross_center', 2, 0, 2);
    this.mark('cross_oste', -2, 0, 1);
    this.mark('cross_soldier_enter', -14, 0, -7);
    this.mark('cross_soldier_enter2', -15, 0, -5);
    this.mark('cross_soldier', -4, 0, -2);
    this.mark('cross_soldier2', -5.5, 0, -1.5);
    this.mark('cross_via', 6, 0, -4);
    this.mark('cross_exit', 13, 0, -9);
    this.mark('cross_exit2', 14, 0, -8);
    this.mark('cross_shrine', 0, 0, -4);
    this.mark('cam_cross_est', 13, 5, 14);
    this.mark('cam_cross_two', 3, 1.8, 7);
    this.mark('cam_cross_road', -6, 2.2, 7);
    this.mark('cam_cross_choose', 8, 2, 4);
    this.mark('cam_cross_exit', 15, 3.5, -13);

    this.group.add(
      createNightLighting({
        moonColor: 0x9fb5cf,
        skyColor: 0x263a51,
        groundColor: 0x1a1712,
        keyIntensity: 1.45,
        hemiIntensity: 0.9,
      }).group,
    );

    this.sky = new Sky({
      top: 0x06101d,
      horizon: 0x17283c,
      bottom: 0x0a121c,
      stars: 260,
      starSeed: 29,
      starOpacity: 0.55,
      moon: { position: [18, 26, -52], radius: 1.9 },
    });
    this.group.add(this.sky.group);

    const ground = createGround(60, 60, 0x20241f, 0.0);
    this.group.add(ground);

    const road = createRomanRoad(9, 70);
    road.rotation.y = Math.PI / 4;
    road.position.set(-1, 0, -2);
    this.group.add(road);

    const via = createRomanRoad(7, 48);
    via.rotation.y = -Math.PI / 3;
    via.position.set(7, 0, -5);
    this.group.add(via);

    const paving = createPaving(10, 8, 1.1, 33, [0x5e5a4e, 0x4d4a40, 0x6c6658]);
    paving.position.set(0, 0, 0);
    this.group.add(paving);

    const milestone = createMilestone('VIA CLAUDIA');
    milestone.position.set(5.4, 0, 0.4);
    milestone.rotation.y = -0.35;
    this.group.add(milestone);

    const shrine = new THREE.Group();
    shrine.position.set(0, 0, -4);
    const shrineWall = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 1.6),
      flatMaterial(0x5a5143, { roughness: 1 }),
    );
    shrineWall.position.y = 0.9;
    shrineWall.castShadow = true;
    const shrineRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 0.9, 4),
      flatMaterial(0x42372c, { roughness: 1 }),
    );
    shrineRoof.position.y = 2.2;
    shrineRoof.rotation.y = Math.PI / 4;
    const niche = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.1),
      flatMaterial(0x201a15),
    );
    niche.position.set(0, 0.95, 0.82);
    const cross = new THREE.Group();
    const vertical = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.55, 0.1),
      flatMaterial(0x8b7659),
    );
    const horizontal = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.1, 0.1),
      flatMaterial(0x8b7659),
    );
    horizontal.position.y = 0.1;
    cross.add(vertical, horizontal);
    cross.position.set(0, 0.95, 0.9);
    shrine.add(shrineWall, shrineRoof, niche, cross);
    this.group.add(shrine);

    this.shrineGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xffcf8a,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.shrineGlow.scale.setScalar(2.2);
    this.shrineGlow.position.set(0, 1.1, -3.2);
    this.group.add(this.shrineGlow);

    const lamp = createLamp({ withLight: true, lightIntensity: 12, height: 3.2 });
    lamp.group.position.set(-7.5, 0, 4.5);
    this.group.add(lamp.group);
    this.lamp = lamp;

    const treeA = createTree(61, 0.95);
    treeA.position.set(-8, 0, 6);
    this.group.add(treeA);
    const treeB = createTree(73, 0.8);
    treeB.position.set(10, 0, 3);
    this.group.add(treeB);

    for (const [x, z, scale, seed] of [
      [-9, -5, 0.9, 3],
      [10, -7, 1.1, 5],
      [-2, 8, 0.8, 7],
      [13, 6, 1.0, 11],
    ] as const) {
      const poplar = createPoplar(seed, scale);
      poplar.position.set(x, 0, z);
      this.group.add(poplar);
    }

    const stones = createStoneBlocks(8, 19);
    stones.position.set(-2, 0, 4);
    this.group.add(stones);

    const sign = createSignBoard({
      text: 'ROMA',
      subtext: 'Via Claudia',
      width: 1.5,
      height: 0.65,
      postHeight: 1.2,
      background: '#c2b494',
      foreground: '#3a3026',
      border: 'rgba(58, 48, 38, 0.5)',
    });
    sign.position.set(7.6, 0, 1.8);
    sign.rotation.y = -0.6;
    this.group.add(sign);

    this.rain = this.createRain();
    this.group.add(this.rain);

    this.addActor(CharacterFactory.donnino(), 'cross_enter', -Math.PI / 2, true);
    this.addActor(CharacterFactory.oste(), 'cross_oste', Math.PI / 2, true);
    this.addActor(CharacterFactory.centurione(), 'cross_soldier_enter', Math.PI / 2, false);
    this.addActor(CharacterFactory.soldato(), 'cross_soldier_enter2', Math.PI / 2, false);

    this.menuCamera = {
      position: new THREE.Vector3(12, 4.2, 12),
      target: new THREE.Vector3(0, 1.6, 0),
      fov: 42,
    };
  }

  private createRain(): THREE.Points {
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 44;
      positions[index * 3 + 1] = Math.random() * 18;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x9fb4c4,
      size: 0.09,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    const flicker = 0.82 + vnoise(time * 2.4, 9) * 0.18;
    this.lamp.light.intensity = 12 * flicker;
    (this.lamp.glow.material as THREE.SpriteMaterial).opacity = 0.75 * flicker;
    (this.shrineGlow.material as THREE.SpriteMaterial).opacity =
      0.28 + Math.sin(time * 1.7) * 0.07;

    const positions = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < positions.count; index += 1) {
      let y = positions.getY(index) - 0.26;
      if (y < 0) y += 18;
      positions.setY(index, y);
    }
    positions.needsUpdate = true;
    this.rain.rotation.y = time * 0.01;
  }
}
