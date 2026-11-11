import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { BaseEnvironment } from './BaseEnvironment';
import {
  COLORS,
  boxMesh,
  createBench,
  createBuilding,
  createBusStop,
  createFence,
  createGrass,
  createGround,
  createLamp,
  createRoad,
  createSignBoard,
  createTelescope,
  createTree,
  flatMaterial,
  glowSprite,
} from './props';
import type { Lamp } from './props';

export class Road extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly telescopes: THREE.Group[] = [];
  private readonly cityGlow: THREE.Sprite;
  private readonly lamps: Lamp[] = [];

  constructor(id: string) {
    super(id, 'road');
    this.fog = { color: 0x0c1420, near: 22, far: 112 };

    this.mark('road_enter_arturo', 2.4, 0, 9.0);
    this.mark('road_enter_gino', 3.8, 0, 9.8);
    this.mark('road_stop_arturo', 2.2, 0, -2.0);
    this.mark('road_stop_gino', 3.6, 0, -1.2);
    this.mark('road_exit_arturo', 2.0, 0, -7.4);
    this.mark('road_exit_gino', 3.4, 0, -6.6);
    this.mark('astro1', -8.0, 0.35, -11.0);
    this.mark('astro2', -9.6, 0.35, -12.2);
    this.mark('astro_target', -8.8, 1.5, -11.6);
    this.mark('cam_road_wide', 8.0, 4.5, -10.0);
    this.mark('cam_road_two', 6.0, 2.0, 3.0);
    this.mark('cam_astro_wide', 5.0, 2.3, 3.5);
    this.mark('cam_astro_medium', -2.5, 1.9, -5.5);

    this.group.add(
      createNightLighting({
        moonColor: 0x9eb7d6,
        skyColor: 0x26394e,
        groundColor: 0x171a14,
        keyIntensity: 1.8,
        hemiIntensity: 0.95,
        ambientIntensity: 0.9,
      }).group,
    );

    this.sky = new Sky({
      top: 0x060d18,
      horizon: 0x1a2b41,
      bottom: 0x0a1119,
      stars: 750,
      starSeed: 61,
      starOpacity: 0.85,
      moon: { position: [-26, 18, -70], radius: 2.5 },
    });
    this.group.add(this.sky.group);

    const ground = createGround(120, 120, 0x2f382a);
    this.group.add(ground);

    const grass = createGrass(52, 68, 420, 67);
    grass.position.set(-16, 0, -12);
    this.group.add(grass);

    const grassRight = createGrass(30, 68, 220, 71);
    grassRight.position.set(28, 0, -8);
    this.group.add(grassRight);

    const road = createRoad(7.2, 100);
    this.group.add(road);

    const busStop = createBusStop();
    busStop.position.set(6.2, 0, 5.8);
    busStop.rotation.y = Math.PI / 2;
    this.group.add(busStop);

    const busBench = createBench();
    busBench.position.set(6.1, 0, 7.0);
    busBench.rotation.y = Math.PI / 2;
    this.group.add(busBench);

    const roadSign = createSignBoard({
      text: 'BAGNO',
      subtext: 'a 42 km',
      width: 0.95,
      height: 0.5,
      postHeight: 1.45,
      background: '#d0c6b1',
      foreground: '#39352c',
      border: 'rgba(57, 53, 44, 0.5)',
    });
    roadSign.position.set(5.1, 0, 2.1);
    roadSign.rotation.y = -0.4;
    this.group.add(roadSign);


    // Piccola collina per gli astronomi
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 10, 5),
      flatMaterial(0x35422f, { roughness: 1 }),
    );
    mound.scale.set(1.25, 0.11, 1);
    mound.position.set(-10.5, -0.45, -13.5);
    mound.receiveShadow = true;
    this.group.add(mound);

    for (const markName of ['astro1', 'astro2']) {
      const position = this.getMark(markName);
      if (!position) continue;
      const telescope = createTelescope();
      telescope.position.set(position.x, 0.02, position.z);
      telescope.rotation.y = markName === 'astro1' ? -0.55 : -0.2;
      this.group.add(telescope);
      this.telescopes.push(telescope);
    }

    const astroGlow = glowSprite('#f0b46c', 2.4);
    astroGlow.position.set(-8.8, 0.7, -11.6);
    this.group.add(astroGlow);
    const astroLantern = new THREE.PointLight(0xf0b46c, 7, 8, 2);
    astroLantern.position.set(-8.8, 0.9, -11.6);
    this.group.add(astroLantern);

    const lampA = createLamp({ withLight: true, lightIntensity: 15, height: 4.6 });
    lampA.group.position.set(-5.2, 0, 4.2);
    this.group.add(lampA.group);
    this.lamps.push(lampA);

    const lampB = createLamp({ withLight: true, lightIntensity: 14, height: 4.6 });
    lampB.group.position.set(5.4, 0, -7.2);
    this.group.add(lampB.group);
    this.lamps.push(lampB);

    // Pali e fili
    const poleMaterial = flatMaterial(0x2d2c27, { roughness: 0.9 });
    for (let index = 0; index < 7; index += 1) {
      const z = 14 - index * 9;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 6.8, 5),
        poleMaterial,
      );
      pole.position.set(4.7, 3.4, z);
      pole.castShadow = true;
      this.group.add(pole);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.07), poleMaterial);
      cross.position.set(4.7, 6.2, z);
      this.group.add(cross);
    }

    const fence = createFence(26, 2.4, 79);
    fence.position.set(-10.5, 0, 1.2);
    fence.rotation.y = Math.PI / 2;
    this.group.add(fence);

    const fenceB = createFence(20, 2.2, 83);
    fenceB.position.set(16.5, 0, -8.0);
    fenceB.rotation.y = Math.PI / 2;
    this.group.add(fenceB);

    const treeA = createTree(223, 1.5);
    treeA.position.set(-18, 0, -3.0);
    this.group.add(treeA);

    const treeB = createTree(229, 1.0);
    treeB.position.set(19, 0, 4.5);
    this.group.add(treeB);

    // Città lontana alle spalle
    const city = new THREE.Group();
    const cityColors = [0x2b2e33, 0x34363b, 0x24292f, 0x30333a];
    for (let index = 0; index < 16; index += 1) {
      const width = 2.4 + (index % 4) * 1.3;
      const height = 4 + ((index * 7) % 11);
      const building = createBuilding({
        width,
        height,
        depth: 3,
        color: cityColors[index % cityColors.length],
        seed: 300 + index,
        windows: true,
        roof: false,
      });
      building.position.set(-25 + index * 3.4, 0, 25 + (index % 3) * 2.2);
      building.rotation.y = Math.PI;
      city.add(building);
    }
    this.cityGlow = glowSprite('#e2a467', 32);
    this.cityGlow.position.set(0, 4.5, 23.2);
    city.add(this.cityGlow);
    this.group.add(city);

    const cityHaze = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 18),
      new THREE.MeshBasicMaterial({
        color: 0x6a4b36,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    cityHaze.position.set(0, 8.5, 23.0);
    this.group.add(cityHaze);

    const actors = {
      arturo: CharacterFactory.arturo(),
      gino: CharacterFactory.gino(),
      astronomer1: CharacterFactory.astronomer(0),
      astronomer2: CharacterFactory.astronomer(1),
    };

    this.addActor(actors.arturo, 'road_enter_arturo', Math.PI, true);
    this.addActor(actors.gino, 'road_enter_gino', Math.PI, true);
    this.addActor(actors.astronomer1, 'astro1', -0.5, true);
    this.addActor(actors.astronomer2, 'astro2', -0.2, true);

    this.menuCamera = {
      position: new THREE.Vector3(5.0, 3.8, 7.0),
      target: new THREE.Vector3(1.5, 1.4, -3.0),
      fov: 43,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    (this.cityGlow.material as THREE.SpriteMaterial).opacity =
      0.58 + Math.sin(time * 0.6) * 0.04;
    for (let index = 0; index < this.telescopes.length; index += 1) {
      const telescope = this.telescopes[index];
      const tube = telescope.userData.tube as THREE.Group | undefined;
      if (tube) {
        tube.rotation.y = 0.4 + Math.sin(time * 0.12 + index * 2) * 0.05;
        tube.rotation.z = -0.5 + Math.sin(time * 0.09 + index) * 0.02;
      }
    }
    for (let index = 0; index < this.lamps.length; index += 1) {
      const lamp = this.lamps[index];
      const pulse = 0.92 + Math.sin(time * 1.2 + index) * 0.08;
      lamp.light.intensity = 14 * pulse;
      (lamp.glow.material as THREE.SpriteMaterial).opacity = 0.72 * pulse;
    }
    void COLORS;
    void boxMesh;
    void THREE;
  }
}
