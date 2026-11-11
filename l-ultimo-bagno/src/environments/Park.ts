import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { BaseEnvironment } from './BaseEnvironment';
import {
  COLORS,
  boxMesh,
  createBench,
  createGrass,
  createGround,
  createLamp,
  createPond,
  createSignBoard,
  createTree,
  createYogaMat,
  flatMaterial,
} from './props';
import type { Lamp } from './props';

export class Park extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly lamps: Lamp[] = [];

  constructor(id: string) {
    super(id, 'park');
    this.fog = { color: 0x101820, near: 16, far: 74 };

    this.mark('park_enter_arturo', -9.0, 0, 5.0);
    this.mark('park_enter_gino', -7.8, 0, 5.8);
    this.mark('park_arturo', -2.4, 0, 2.4);
    this.mark('park_gino', -3.6, 0, 3.2);
    this.mark('park_gino_mat', -2.8, 0, 2.6);
    this.mark('park_exit_arturo', -9.0, 0, 5.0);
    this.mark('park_exit_gino', -7.8, 0, 5.8);
    this.mark('park_instructor', 4.2, 0, 0);
    this.mark('park_yogi1', 5.8, 0, 1.6);
    this.mark('park_yogi2', 2.8, 0, 2.2);
    this.mark('park_yogi3', 6.0, 0, -1.4);
    this.mark('cam_park_wide', -9.0, 4.5, 13.0);
    this.mark('cam_yoga_wide', -7.0, 2.6, 8.0);
    this.mark('cam_instructor', -2.8, 2.6, 8.8);
    this.mark('cam_park_arturo_close', -4.8, 1.5, 5.0);
    this.mark('cam_park_gino', -7.5, 2.4, 4.0);
    this.mark('cam_park_wide2', -6.0, 2.8, 9.0);
    this.mark('cam_park_exit', -11.0, 3.3, 10.0);

    this.group.add(
      createNightLighting({
        moonColor: 0x9db4ce,
        skyColor: 0x263849,
        groundColor: 0x1b2118,
        keyIntensity: 1.8,
        hemiIntensity: 1.0,
        ambientIntensity: 0.85,
      }).group,
    );

    this.sky = new Sky({
      top: 0x07101a,
      horizon: 0x172737,
      bottom: 0x0a1218,
      stars: 620,
      starSeed: 43,
      starOpacity: 0.8,
      moon: { position: [-18, 25, -52], radius: 2.8 },
    });
    this.group.add(this.sky.group);

    const ground = createGround(44, 40, COLORS.grass);
    this.group.add(ground);

    const grass = createGrass(38, 34, 550, 53);
    this.group.add(grass);

    const path = createPavingPath();
    this.group.add(path);

    const pond = createPond(3.1);
    pond.position.set(-8.2, 0, -6.3);
    this.group.add(pond);

    const sign = createSignBoard({
      text: 'BAGNO INTERIORE',
      subtext: 'seguire il respiro',
      width: 1.6,
      height: 0.62,
      postHeight: 0.85,
      background: '#c9bda5',
      foreground: '#3b352d',
      border: 'rgba(59, 53, 45, 0.5)',
      illuminated: true,
      doubleSided: true,
    });
    sign.position.set(7.2, 0, 1.0);
    sign.rotation.y = -1.1;
    sign.scale.setScalar(0.9);
    const signGlow = sign.children.find((child) => child instanceof THREE.Sprite);
    if (signGlow) signGlow.visible = false;
    this.group.add(sign);

    const treePositions: Array<[number, number, number]> = [
      [-6.8, -4.2, 1.2],
      [1.0, -8.0, 1.0],
      [9.5, -4.5, 1.4],
      [-12.5, 1.0, 0.9],
      [11.5, 4.5, 1.1],
      [-5.0, 9.0, 0.8],
    ];
    treePositions.forEach(([x, z, scale], index) => {
      const tree = createTree(101 + index * 13, scale);
      tree.position.set(x, 0, z);
      this.group.add(tree);
    });

    const benchA = createBench();
    benchA.position.set(-6.2, 0, 2.8);
    benchA.rotation.y = Math.PI * 0.5;
    this.group.add(benchA);

    const benchB = createBench();
    benchB.position.set(3.2, 0, -4.6);
    benchB.rotation.y = -0.4;
    this.group.add(benchB);

    const lamp = createLamp({ withLight: true, lightIntensity: 18, height: 3.3 });
    lamp.group.position.set(-4.8, 0, 5.2);
    lamp.group.scale.setScalar(0.86);
    this.group.add(lamp.group);
    this.lamps.push(lamp);

    const lantern = createLamp({ withLight: true, lightIntensity: 12, height: 2.2 });
    lantern.group.position.set(1.0, 0, -2.4);
    lantern.group.scale.setScalar(0.5);
    this.group.add(lantern.group);
    this.lamps.push(lantern);

    const mats = [
      { mark: 'park_instructor', color: 0x5e6e57 },
      { mark: 'park_yogi1', color: 0x665f4e },
      { mark: 'park_yogi2', color: 0x4f5c61 },
      { mark: 'park_yogi3', color: 0x5e5666 },
    ];
    for (const item of mats) {
      const position = this.getMark(item.mark);
      if (!position) continue;
      const mat = createYogaMat(item.color);
      mat.position.set(position.x, 0.012, position.z);
      mat.rotation.y = position.x > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.group.add(mat);
    }

    const ginoMat = createYogaMat(0x6e6652);
    ginoMat.position.set(-2.8, 0.012, 2.6);
    ginoMat.rotation.y = Math.PI / 2;
    this.group.add(ginoMat);

    const actors = {
      arturo: CharacterFactory.arturo(),
      gino: CharacterFactory.gino(),
      instructor: CharacterFactory.instructor(),
      yogi1: CharacterFactory.yogi(0),
      yogi2: CharacterFactory.yogi(1),
      yogi3: CharacterFactory.yogi(2),
    };

    this.addActor(actors.arturo, 'park_enter_arturo', Math.PI / 2, true);
    this.addActor(actors.gino, 'park_enter_gino', Math.PI / 2, true);
    this.addActor(actors.instructor, 'park_instructor', -Math.PI / 2, true);
    this.addActor(actors.yogi1, 'park_yogi1', -Math.PI / 2, true);
    this.addActor(actors.yogi2, 'park_yogi2', -Math.PI / 2, true);
    this.addActor(actors.yogi3, 'park_yogi3', -Math.PI / 2, true);

    this.menuCamera = {
      position: new THREE.Vector3(-8.0, 3.0, 10.0),
      target: new THREE.Vector3(1.5, 1.2, 1.0),
      fov: 42,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    for (let index = 0; index < this.lamps.length; index += 1) {
      const lamp = this.lamps[index];
      const pulse = 0.91 + Math.sin(time * 1.15 + index * 2.1) * 0.09;
      lamp.light.intensity = (index === 0 ? 18 : 12) * pulse;
      (lamp.glow.material as THREE.SpriteMaterial).opacity = 0.76 * pulse;
    }
  }
}

function createPavingPath(): THREE.Group {
  const group = new THREE.Group();
  const material = flatMaterial(0x6f6a5d, { roughness: 1 });

  const mainPath = new THREE.Mesh(new THREE.BoxGeometry(20, 0.02, 2.2), material);
  mainPath.position.set(-2.0, 0.01, 4.2);
  mainPath.rotation.y = 0.18;
  mainPath.receiveShadow = true;
  group.add(mainPath);

  const yogaPath = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.02, 1.4), material);
  yogaPath.position.set(2.2, 0.01, 1.5);
  yogaPath.rotation.y = -0.28;
  yogaPath.receiveShadow = true;
  group.add(yogaPath);

  for (let index = 0; index < 12; index += 1) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.5), material);
    stone.position.set(-1.0 + index * 1.1, 0.025, 4.1 + Math.sin(index * 0.7) * 0.3);
    stone.rotation.y = index * 0.33;
    stone.receiveShadow = true;
    group.add(stone);
  }

  return group;
}
