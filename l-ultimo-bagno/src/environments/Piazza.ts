import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createBaristaPresence } from '../characters/Barista';
import { createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { vnoise } from '../utils/math';
import { BaseEnvironment } from './BaseEnvironment';
import {
  COLORS,
  boxMesh,
  createBench,
  createBuilding,
  createBicycleProp,
  createHangingSign,
  createLamp,
  createPaving,
  createSignBoard,
  createStars,
  createTree,
  createWallSign,
  flatMaterial,
  glowSprite,
} from './props';
import type { Lamp } from './props';

export class Piazza extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly lamps: Lamp[] = [];
  private readonly flickerLamp: Lamp;
  private readonly barSignGlow: THREE.Sprite;
  private readonly barInteriorLight: THREE.PointLight;

  constructor(id: string) {
    super(id, 'piazza');
    this.fog = { color: 0x0b1322, near: 20, far: 105 };

    this.mark('piazza_enter_arturo', 8.4, 0, 3.8);
    this.mark('piazza_enter_gino', 9.8, 0, 4.8);
    this.mark('piazza_mid_arturo', -1.8, 0, 2.0);
    this.mark('piazza_mid_gino', -3.0, 0, 3.0);
    this.mark('piazza_bar_arturo', -7.0, 0, 1.6);
    this.mark('piazza_bar_gino', -8.2, 0, 2.8);
    this.mark('piazza_exit_arturo', 9.0, 0, 7.0);
    this.mark('piazza_exit_gino', 10.2, 0, 8.0);
    this.mark('bar_door', -11.35, 1.35, 0.4);
    this.mark('sign_bagno', -11.35, 1.16, 0.7);
    this.mark('piazza_center', 0, 1.1, 0);
    this.mark('cam_wide_a', 13.5, 6.2, 15.0);
    this.mark('cam_wide_b', 11.5, 5.5, 13.0);
    this.mark('cam_two', 2.4, 1.75, 7.2);
    this.mark('cam_close_arturo', 0.6, 1.55, 4.6);
    this.mark('cam_sign_close', -7.8, 1.55, 2.6);
    this.mark('cam_bar', -2.5, 2.1, 5.4);
    this.mark('cam_bar_two', -4.4, 1.7, 5.0);
    this.mark('cam_exit', 3.2, 2.6, 9.8);

    this.group.add(
      createNightLighting({
        moonColor: 0x9db3d6,
        skyColor: 0x2a3854,
        groundColor: 0x1a1713,
        keyIntensity: 1.8,
        hemiIntensity: 0.95,
      }).group,
    );

    this.sky = new Sky({
      top: 0x070d1a,
      horizon: 0x16243d,
      bottom: 0x0a111d,
      stars: 480,
      starSeed: 13,
      starOpacity: 0.7,
      moon: { position: [12, 27, -58], radius: 2.2 },
    });
    this.group.add(this.sky.group);

    const paving = createPaving(34, 28, 1.2, 17);
    this.group.add(paving);

    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      flatMaterial(0x252520, { roughness: 1 }),
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.01;
    outerGround.receiveShadow = true;
    this.group.add(outerGround);

    // Bar
    const barBuilding = boxMesh(4.4, 4.6, 8.2, 0x4c4439, { roughness: 0.98 });
    barBuilding.position.set(-13.8, 2.3, 0);
    this.group.add(barBuilding);

    const roofTrim = boxMesh(4.8, 0.2, 8.6, COLORS.roof, { roughness: 1 });
    roofTrim.position.set(-13.8, 4.7, 0);
    this.group.add(roofTrim);

    const facadeFrame = boxMesh(0.16, 4.2, 8.0, 0x554b3f, { roughness: 0.95 });
    facadeFrame.position.set(-11.55, 2.1, 0);
    this.group.add(facadeFrame);

    const shutterGroup = new THREE.Group();
    shutterGroup.position.set(-11.45, 0, 0);
    const shutterMaterial = flatMaterial(0x5d5a52, {
      metalness: 0.25,
      roughness: 0.75,
    });
    for (let index = 0; index < 12; index += 1) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.155, 4.0),
        shutterMaterial,
      );
      slat.position.set(0, 0.32 + index * 0.175, 0);
      slat.castShadow = true;
      shutterGroup.add(slat);
    }
    for (const side of [-1, 1]) {
      const track = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.3, 0.12),
        flatMaterial(0x3b3933, { metalness: 0.3, roughness: 0.7 }),
      );
      track.position.set(0.02, 1.15, side * 2.03);
      shutterGroup.add(track);
    }
    this.group.add(shutterGroup);

    const doorFrame = new THREE.Group();
    const frameMaterial = flatMaterial(0x3a3229, { roughness: 0.9 });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 2.65, 0.16),
        frameMaterial,
      );
      post.position.set(-11.42, 1.33, side * 2.1);
      post.castShadow = true;
      doorFrame.add(post);
    }
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 4.4),
      frameMaterial,
    );
    lintel.position.set(-11.42, 2.7, 0);
    doorFrame.add(lintel);
    this.group.add(doorFrame);

    const barSign = createHangingSign('BAR', {
      width: 2.5,
      height: 0.72,
      background: '#291210',
      foreground: '#f1c07c',
      border: 'rgba(241, 192, 124, 0.7)',
    });
    barSign.rotation.y = Math.PI / 2;
    barSign.position.set(-11.30, 3.55, 0);
    this.group.add(barSign);

    this.barSignGlow = glowSprite('#ffb365', 4.2);
    this.barSignGlow.position.set(-11.18, 3.55, 0);
    this.group.add(this.barSignGlow);

    const closedSign = createWallSign('CHIUSO PER APERTURA', 2.2, 0.62, {
      width: 512,
      height: 192,
      background: '#d8c9ab',
      foreground: '#2f2820',
      border: 'rgba(47, 40, 32, 0.48)',
    });
    closedSign.rotation.y = Math.PI / 2;
    closedSign.position.set(-11.40, 1.72, 0.35);
    this.group.add(closedSign);

    const bagnoClosed = createWallSign('BAGNO CHIUSO', 1.08, 0.48, {
      width: 512,
      height: 256,
      background: '#d9cdb4',
      foreground: '#4a352c',
      border: 'rgba(74, 53, 44, 0.55)',
    });
    bagnoClosed.rotation.y = Math.PI / 2;
    bagnoClosed.position.set(-11.39, 1.02, 0.72);
    this.group.add(bagnoClosed);

    const barista = createBaristaPresence();
    barista.rotation.y = Math.PI / 2;
    barista.position.set(-11.85, 0, 0);
    barista.scale.setScalar(0.9);
    this.group.add(barista);

    this.barInteriorLight = new THREE.PointLight(0xf0a45c, 5.5, 4.5, 2);
    this.barInteriorLight.position.set(-11.8, 1.3, 0);
    this.group.add(this.barInteriorLight);

    const awning = boxMesh(0.2, 0.08, 5.2, 0x67352f, { roughness: 0.95 });
    awning.position.set(-11.05, 3.12, 0);
    awning.rotation.z = -0.1;
    this.group.add(awning);

    // Lampioni
    const lampPositions: Array<[number, number]> = [
      [5.8, 4.0],
      [-2.5, 7.5],
      [2.0, -6.0],
    ];
    lampPositions.forEach(([x, z], index) => {
      const lamp = createLamp({
        withLight: true,
        lightIntensity: index === 1 ? 17 : 22,
        height: index === 1 ? 3.7 : 4.4,
      });
      lamp.group.position.set(x, 0, z);
      this.group.add(lamp.group);
      this.lamps.push(lamp);
    });

    this.flickerLamp = this.lamps[1];

    // Panchina, alberi, dettagli
    const bench = createBench();
    bench.position.set(3.4, 0, 1.6);
    bench.rotation.y = -0.55;
    this.group.add(bench);

    const treeA = createTree(31, 1.25);
    treeA.position.set(14, 0, -7);
    this.group.add(treeA);

    const treeB = createTree(47, 0.9);
    treeB.position.set(-7, 0, 12);
    this.group.add(treeB);

    const bike = createBicycleProp();
    bike.position.set(4.8, 0, 3.0);
    bike.rotation.y = 0.8;
    bike.rotation.z = 0.06;
    this.group.add(bike);

    const bin = createSignBoard({
      text: 'BAGNO PUBBLICO',
      subtext: 'chiuso per restauro',
      width: 1.1,
      height: 0.55,
      postHeight: 0.7,
      background: '#b7ad97',
      foreground: '#3c352c',
      border: 'rgba(60, 53, 44, 0.5)',
    });
    bin.position.set(7.0, 0, -2.2);
    bin.rotation.y = -0.45;
    this.group.add(bin);

    // Quinte di edifici
    const buildings: Array<{
      x: number;
      z: number;
      w: number;
      h: number;
      d: number;
      color: number;
      seed: number;
    }> = [
      { x: -17, z: -13, w: 8, h: 9, d: 6, color: 0x444039, seed: 1 },
      { x: -7, z: -14.5, w: 9, h: 11, d: 6, color: 0x4b463f, seed: 2 },
      { x: 4, z: -15, w: 8.5, h: 8, d: 6, color: 0x3f4146, seed: 3 },
      { x: 15, z: -13.5, w: 9, h: 10, d: 7, color: 0x47423a, seed: 4 },
      { x: 20, z: -3, w: 8, h: 7.5, d: 9, color: 0x3d4045, seed: 5 },
    ];
    for (const item of buildings) {
      const building = createBuilding({
        width: item.w,
        height: item.h,
        depth: item.d,
        color: item.color,
        seed: item.seed,
      });
      building.position.set(item.x, 0, item.z);
      this.group.add(building);
    }

    const starField = createStars(120, 23, 70);
    starField.position.y = 12;
    this.group.add(starField);

    const actors = [
      CharacterFactory.arturo(),
      CharacterFactory.gino(),
    ];
    this.addActor(actors[0], 'piazza_enter_arturo', -Math.PI / 2, true);
    this.addActor(actors[1], 'piazza_enter_gino', -Math.PI / 2, true);

    this.menuCamera = {
      position: new THREE.Vector3(8.5, 3.6, 13.0),
      target: new THREE.Vector3(-3.0, 1.5, 1.5),
      fov: 38,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);

    const flickerBase = vnoise(time * 2.2, 4);
    const dropout = Math.sin(time * 1.37) > 0.93 ? 0.25 : 1;
    const flicker = (0.72 + flickerBase * 0.28) * dropout;
    this.flickerLamp.light.intensity = 17 * flicker;
    this.flickerLamp.bulbMaterial.emissiveIntensity = 2.2 * flicker;
    (this.flickerLamp.glow.material as THREE.SpriteMaterial).opacity = 0.8 * flicker;

    for (let index = 0; index < this.lamps.length; index += 1) {
      if (index === 1) continue;
      const lamp = this.lamps[index];
      const subtle = 0.94 + Math.sin(time * 1.1 + index * 2) * 0.06;
      lamp.light.intensity = 22 * subtle;
      (lamp.glow.material as THREE.SpriteMaterial).opacity = 0.8 * subtle;
    }

    (this.barSignGlow.material as THREE.SpriteMaterial).opacity =
      0.72 + Math.sin(time * 1.6) * 0.06;
    this.barInteriorLight.intensity = 5.5 + Math.sin(time * 2.4) * 0.6;
  }
}
