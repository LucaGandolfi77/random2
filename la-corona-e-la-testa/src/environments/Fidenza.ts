import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createDayLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { vnoise } from '../utils/math';
import { BaseEnvironment } from './BaseEnvironment';
import { createGround, createPaving, createTree, flatMaterial } from './props';
import {
  createCephalophoreStatue,
  createFacade,
  createScaffold,
  createStoneBlocks,
} from './propsRoman';

export class Fidenza extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly scaffold: THREE.Group;
  private readonly statue: THREE.Group;

  constructor(id: string) {
    super(id, 'fidenza');
    this.fog = { color: 0xbaae94, near: 30, far: 110 };

    this.mark('fidenza_master', 2.8, 0, 2.4);
    this.mark('fidenza_apprentice', 4.4, 0, 3.2);
    this.mark('fidenza_pellegrino', 5.2, 0, 4.2);
    this.mark('fidenza_child', 3.8, 0, 4.8);
    this.mark('fidenza_facade', 0, 6, -6);
    this.mark('fidenza_statue', 0, 2.8, -3.9);
    this.mark('cam_fidenza_est', 12, 6, 14);
    this.mark('cam_fidenza_wide', 9, 4, 12);
    this.mark('cam_fidenza_two', 5.5, 1.8, 7);
    this.mark('cam_fidenza_pilgrim', 7.5, 1.8, 8);
    this.mark('cam_fidenza_child', 5.5, 1.6, 8);
    this.mark('cam_fidenza_facade', 0, 2.6, 8);
    this.mark('cam_fidenza_statue', 0, 2.0, 0.5);

    this.group.add(
      createDayLighting({
        sunColor: 0xf1d3a1,
        keyIntensity: 2.2,
        hemiIntensity: 1.0,
        skyColor: 0xbfd2dc,
        groundColor: 0x73664e,
      }).group,
    );

    this.sky = new Sky({
      top: 0x7d9fb9,
      horizon: 0xe0d3b4,
      bottom: 0x6b624d,
      stars: 0,
    });
    this.group.add(this.sky.group);

    const ground = createGround(90, 90, 0x8b7d63, 0);
    this.group.add(ground);

    const plaza = createPaving(34, 26, 1.5, 91, [0x9f9077, 0x8a7c65, 0xafa087]);
    plaza.position.set(0, 0, 4);
    this.group.add(plaza);

    const facade = createFacade();
    facade.position.set(0, 0, -6.4);
    this.group.add(facade);

    this.scaffold = createScaffold();
    this.scaffold.position.set(-11, 0, -4.4);
    this.scaffold.scale.setScalar(0.85);
    this.group.add(this.scaffold);

    const statueLight = new THREE.PointLight(0xffe0b0, 22, 20, 2);
    statueLight.position.set(0, 3.6, 4.5);
    const statueFill = new THREE.PointLight(0xffe8c8, 18, 12, 2);
    statueFill.position.set(0, 2.2, 2.2);
    this.group.add(statueFill);
    this.group.add(statueLight);

    this.statue = createCephalophoreStatue();
    this.statue.position.set(0, 0, -3.9);
    this.statue.scale.setScalar(1.55);
    this.group.add(this.statue);

    const blocks = createStoneBlocks(22, 97);
    blocks.position.set(0, 0, 1.2);
    this.group.add(blocks);

    const tower = new THREE.Group();
    const towerBody = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 18, 4.4),
      flatMaterial(0xa08d72, { roughness: 1 }),
    );
    towerBody.position.y = 9;
    const towerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 3.4, 4),
      flatMaterial(0x6b543d, { roughness: 1 }),
    );
    towerRoof.position.y = 19.7;
    towerRoof.rotation.y = Math.PI / 4;
    tower.add(towerBody, towerRoof);
    tower.position.set(-11, 0, -10);
    this.group.add(tower);

    const treeA = createTree(101, 1.0);
    treeA.position.set(12, 0, 0);
    this.group.add(treeA);
    const treeB = createTree(103, 0.85);
    treeB.position.set(-13, 0, 6);
    this.group.add(treeB);

    const market = new THREE.Group();
    for (const x of [-8, 8]) {
      const table = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.12, 1.0),
        flatMaterial(0x6b5135, { roughness: 1 }),
      );
      table.position.set(x, 0.85, 8);
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.12, 1.8),
        flatMaterial(x < 0 ? 0x8c5a3c : 0x6f7047, { roughness: 1 }),
      );
      canopy.position.set(x, 2.2, 8);
      market.add(table, canopy);
    }
    this.group.add(market);

    this.addActor(CharacterFactory.maestro(), 'fidenza_master', Math.PI, true);
    this.addActor(CharacterFactory.apprendista(), 'fidenza_apprentice', Math.PI, true);
    this.addActor(CharacterFactory.pellegrino(), 'fidenza_pellegrino', Math.PI, true);
    this.addActor(CharacterFactory.bambino(), 'fidenza_child', Math.PI, true);

    this.menuCamera = {
      position: new THREE.Vector3(10, 4.2, 13),
      target: new THREE.Vector3(0, 3.2, -3),
      fov: 42,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    this.scaffold.rotation.z = Math.sin(time * 0.2) * 0.002;
    this.statue.rotation.y = Math.sin(time * 0.12) * 0.01;
    const glow = vnoise(time * 0.4, 7);
    const material = this.statue.children.find(
      (child) => child instanceof THREE.Mesh && (child as THREE.Mesh).geometry instanceof THREE.TorusGeometry,
    ) as THREE.Mesh | undefined;
    if (material) {
      const standard = material.material as THREE.MeshStandardMaterial;
      standard.emissiveIntensity = 0.08 + glow * 0.04;
    }
  }
}
