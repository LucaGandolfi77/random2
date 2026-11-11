import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { BaseEnvironment } from './BaseEnvironment';
import {
  COLORS,
  boxMesh,
  createFence,
  createGrass,
  createGround,
  createSignBoard,
  createTelescope,
  createTent,
  createTree,
  flatMaterial,
  glowSprite,
} from './props';

export class Countryside extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly fireLight: THREE.PointLight;
  private readonly fireGlow: THREE.Sprite;
  private readonly fireCore: THREE.Mesh;

  constructor(id: string) {
    super(id, 'countryside');
    this.fog = { color: 0x0d1620, near: 18, far: 92 };

    this.mark('country_enter_arturo', 9.0, 0, 6.0);
    this.mark('country_enter_gino', 10.4, 0, 6.8);
    this.mark('country_arturo', 2.0, 0, 2.4);
    this.mark('country_gino', 3.4, 0, 3.1);
    this.mark('country_exit_arturo', 9.0, 0, 6.0);
    this.mark('country_exit_gino', 10.4, 0, 6.8);
    this.mark('country_shepherd', -2.0, 0, -2.2);
    this.mark('country_sheep1', 0.5, 0, -0.5);
    this.mark('country_sheep2', 2.8, 0, -1.8);
    this.mark('country_sheep_near', 1.2, 0, 0.8);
    this.mark('country_tree', 0, 0, -5.0);
    this.mark('country_sign', 5.4, 1.5, 1.5);
    this.mark('cam_country_wide', 13.0, 5.0, 15.0);
    this.mark('cam_country_two', 6.0, 2.0, 6.0);
    this.mark('cam_shepherd', 4.6, 1.75, 0.4);
    this.mark('cam_sheep', 3.2, 1.0, 2.6);
    this.mark('cam_country_sign', 5.4, 1.65, 5.0);

    this.group.add(
      createNightLighting({
        moonColor: 0x98aecb,
        skyColor: 0x273a4c,
        groundColor: 0x151a12,
        keyIntensity: 1.75,
        hemiIntensity: 0.95,
        ambientIntensity: 0.85,
      }).group,
    );

    this.sky = new Sky({
      top: 0x060e18,
      horizon: 0x17283a,
      bottom: 0x0a1118,
      stars: 800,
      starSeed: 97,
      starOpacity: 0.85,
      moon: { position: [18, 20, -58], radius: 2.4 },
    });
    this.group.add(this.sky.group);

    const ground = createGround(50, 46, 0x47543d);
    this.group.add(ground);

    const grass = createGrass(44, 40, 700, 103);
    this.group.add(grass);

    const tree = createTree(311, 1.7);
    tree.position.set(0, 0, -5.0);
    this.group.add(tree);

    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.05, 0),
      flatMaterial(0x67645b, { roughness: 1 }),
    );
    boulder.scale.set(1.25, 0.7, 0.95);
    boulder.position.set(1.9, 0.4, -3.2);
    boulder.rotation.set(0.2, 0.8, 0.15);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    this.group.add(boulder);

    const sign = createSignBoard({
      text: 'BAGNO',
      subtext: 'NON C’È SEGNALE',
      width: 1.5,
      height: 0.62,
      postHeight: 0.88,
      background: '#b7aa91',
      foreground: '#3e352a',
      border: 'rgba(62, 53, 42, 0.55)',
      illuminated: true,
      doubleSided: true,
    });
    const countrySignGlow = sign.children.find(
      (child) => child instanceof THREE.Sprite,
    );
    if (countrySignGlow) countrySignGlow.visible = false;
    sign.position.set(5.4, 0, 1.5);
    sign.rotation.y = -0.35;
    this.group.add(sign);

    const tent = createTent();
    tent.position.set(7.5, 0, -7.2);
    tent.rotation.y = -0.4;
    this.group.add(tent);

    const telescope = createTelescope();
    telescope.position.set(-8.5, 0.02, -10.0);
    telescope.rotation.y = 0.5;
    this.group.add(telescope);

    const fence = createFence(20, 2.6, 131);
    fence.position.set(-9.0, 0, -6.0);
    fence.rotation.y = Math.PI / 2;
    this.group.add(fence);

    // Fuoco da campo
    const fireBase = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.28, 5),
      flatMaterial(0x3c2e22, { roughness: 1 }),
    );
    fireBase.position.set(7.1, 0.14, -5.9);
    this.group.add(fireBase);

    this.fireCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 0),
      new THREE.MeshBasicMaterial({ color: 0xf0a45d, toneMapped: false }),
    );
    this.fireCore.scale.y = 1.6;
    this.fireCore.position.set(7.1, 0.4, -5.9);
    this.group.add(this.fireCore);

    this.fireGlow = glowSprite('#ff9c4f', 2.6);
    this.fireGlow.position.set(7.1, 0.6, -5.9);
    this.group.add(this.fireGlow);

    this.fireLight = new THREE.PointLight(0xf48b45, 12, 9, 2);
    this.fireLight.position.set(7.1, 0.8, -5.9);
    this.group.add(this.fireLight);

    const lanternPost = boxMesh(0.06, 0.5, 0.06, 0x3a2f25, { roughness: 0.95 });
    lanternPost.position.set(-3.15, 0.25, -1.35);
    this.group.add(lanternPost);
    const lanternCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.22, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xf0b46c, toneMapped: false }),
    );
    lanternCore.position.set(-3.15, 0.62, -1.35);
    this.group.add(lanternCore);
    const lanternCap = boxMesh(0.22, 0.04, 0.22, 0x2c241c, { roughness: 0.9 });
    lanternCap.position.set(-3.15, 0.75, -1.35);
    this.group.add(lanternCap);
    const shepherdLantern = new THREE.PointLight(0xe8b477, 5.5, 8, 2);
    shepherdLantern.position.set(-3.15, 0.98, -1.35);
    this.group.add(shepherdLantern);
    const shepherdGlow = glowSprite('#e8b477', 0.75);
    shepherdGlow.position.set(-3.15, 0.64, -1.35);
    this.group.add(shepherdGlow);

    // Colline lontane
    const hillMaterial = flatMaterial(0x26311f, { roughness: 1 });
    const hills: Array<[number, number, number, number]> = [
      [-24, -26, 18, 0.18],
      [2, -34, 24, 0.15],
      [26, -24, 15, 0.2],
    ];
    for (const [x, z, radius, squash] of hills) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(radius, 9, 4), hillMaterial);
      hill.scale.set(1.5, squash, 1);
      hill.position.set(x, -0.6, z);
      this.group.add(hill);
    }

    const actors = {
      arturo: CharacterFactory.arturo(),
      gino: CharacterFactory.gino(),
      shepherd: CharacterFactory.shepherd(),
    };

    this.addActor(actors.arturo, 'country_enter_arturo', -Math.PI / 2, true);
    this.addActor(actors.gino, 'country_enter_gino', -Math.PI / 2, true);
    this.addActor(actors.shepherd, 'country_shepherd', Math.PI / 2, true);

    const sheepPositions: Array<[number, number]> = [
      [0.5, -0.5],
      [2.8, -1.8],
      [-0.4, -3.6],
      [-3.9, -1.1],
      [-4.6, 0.6],
      [-1.2, 1.2],
      [1.8, -3.4],
      [3.8, -4.6],
      [6.4, -2.6],
      [-5.6, -3.2],
      [-6.4, 1.2],
      [-0.2, 4.2],
      [5.2, 3.2],
      [-3.2, 4.6],
      [7.0, 1.4],
      [6.0, -3.6],
      [-7.2, -0.4],
    ];
    sheepPositions.forEach(([x, z], index) => {
      const markName = `country_sheep${index + 1}`;
      if (!this.getMark(markName)) this.mark(markName, x, 0, z);
      const sheep = CharacterFactory.sheep(index);
      this.addActor(sheep, markName, index * 0.77, true);
    });

    this.menuCamera = {
      position: new THREE.Vector3(10.0, 4.0, 12.0),
      target: new THREE.Vector3(0, 1.2, -1.5),
      fov: 43,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    const flicker = 0.82 + Math.sin(time * 7.1) * 0.08 + Math.sin(time * 13.7) * 0.06;
    this.fireLight.intensity = 12 * flicker;
    (this.fireGlow.material as THREE.SpriteMaterial).opacity = 0.8 * flicker;
    this.fireCore.scale.set(
      0.9 + Math.sin(time * 8.3) * 0.08,
      1.4 + Math.sin(time * 10.1) * 0.18,
      0.9 + Math.cos(time * 9.5) * 0.08,
    );
    this.fireCore.position.y = 0.4 + Math.sin(time * 7.4) * 0.03;
  }
}
