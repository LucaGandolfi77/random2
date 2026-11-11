import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createInteriorLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { BaseEnvironment } from './BaseEnvironment';
import { boxMesh, createPaving, flatMaterial } from './props';
import {
  ROMAN,
  createArch,
  createBrazier,
  createColumn,
  createCrownCushion,
  createThrone,
} from './propsRoman';

export class Court extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly braziers: THREE.Group[] = [];

  constructor(id: string) {
    super(id, 'court');
    this.fog = { color: 0x1a100d, near: 18, far: 64 };

    this.mark('court_enter', -12, 0, 6);
    this.mark('court_donnino', -3, 0, 0.5);
    this.mark('court_throne', 5.5, 0, -2.5);
    this.mark('court_cristiano', 1.5, 0, 2.5);
    this.mark('court_cortigiano', 8, 0, 2.8);
    this.mark('court_guard1', 4.2, 0, 1.8);
    this.mark('court_guard2', 6.8, 0, 3.2);
    this.mark('court_exit', -14, 0, 7);
    this.mark('court_center', 0, 1.2, 0);
    this.mark('court_crown', -1.4, 1.15, 0.3);
    this.mark('cam_court_est', 13, 7, 16);
    this.mark('cam_court_two', 2, 1.8, 7);
    this.mark('cam_court_crown', 0.6, 1.7, 4.6);
    this.mark('cam_court_prisoners', -2, 2.4, 9);
    this.mark('cam_court_throne', 8, 3, 8);
    this.mark('cam_court_exit', 10, 4.5, 13);

    this.group.add(
      createInteriorLighting({
        keyColor: 0xf0c58b,
        keyIntensity: 1.25,
        fireColor: 0xff954a,
        fireIntensity: 9,
      }).group,
    );

    this.sky = new Sky({
      top: 0x1b0f0b,
      horizon: 0x3a2116,
      bottom: 0x150c09,
      stars: 0,
    });
    this.group.add(this.sky.group);

    const floor = createPaving(32, 26, 1.6, 21, [0x7f705b, 0x9b8b72, 0x655847]);
    this.group.add(floor);

    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      flatMaterial(0x231a14, { roughness: 1 }),
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.02;
    outerGround.receiveShadow = true;
    this.group.add(outerGround);

    const backWall = boxMesh(32, 12, 1.2, 0x3f2f26, { roughness: 1 });
    backWall.position.set(0, 6, -10);
    this.group.add(backWall);

    for (let index = 0; index < 6; index += 1) {
      const column = createColumn(9, 0.5);
      column.position.set(-11 + index * 4.4, 0, -7.6);
      this.group.add(column);
    }

    for (const x of [-8.8, 8.8]) {
      const arch = createArch(5.2, 4.4);
      arch.position.set(x, 0, -6.2);
      this.group.add(arch);
    }

    const bannerMaterial = flatMaterial(ROMAN.purple, { roughness: 0.95 });
    for (const x of [-5.8, 5.8]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 5.4), bannerMaterial);
      banner.position.set(x, 6.2, -8.7);
      this.group.add(banner);
      const trim = boxMesh(1.9, 0.1, 0.08, ROMAN.gold, { metalness: 0.5, roughness: 0.4 });
      trim.position.set(x, 3.5, -8.65);
      this.group.add(trim);
    }

    const throne = createThrone();
    throne.position.set(5.5, 0, -2.5);
    this.group.add(throne);

    for (const [x, z] of [
      [-6.5, 3.8],
      [2.5, -4.6],
      [9.2, 0.4],
    ] as const) {
      const brazier = createBrazier();
      brazier.position.set(x, 0, z);
      this.group.add(brazier);
      this.braziers.push(brazier);
    }

    const dais = boxMesh(6, 0.18, 5, ROMAN.marbleDark);
    dais.position.set(5.5, 0.09, -2.5);
    this.group.add(dais);

    const crownCushion = createCrownCushion();
    crownCushion.position.set(-6.8, 0, 3.8);
    this.group.add(crownCushion);

    const table = boxMesh(2.2, 0.12, 1.2, ROMAN.wood);
    table.position.set(-7.4, 0.9, 4.2);
    this.group.add(table);
    for (const x of [-8.3, -6.5]) {
      for (const z of [3.7, 4.7]) {
        const leg = boxMesh(0.12, 0.9, 0.12, ROMAN.wood);
        leg.position.set(x, 0.45, z);
        this.group.add(leg);
      }
    }

    this.addActor(CharacterFactory.donnino(), 'court_enter', -Math.PI / 2, true);
    this.addActor(CharacterFactory.massimiano(), 'court_throne', Math.PI / 2, true);
    this.addActor(CharacterFactory.cristiano(), 'court_cristiano', Math.PI / 2, true);
    this.addActor(CharacterFactory.cortigiano(), 'court_cortigiano', Math.PI, true);
    this.addActor(CharacterFactory.guardia(1), 'court_guard1', Math.PI / 2, true);
    this.addActor(CharacterFactory.guardia(2), 'court_guard2', Math.PI / 2, true);

    this.menuCamera = {
      position: new THREE.Vector3(10.5, 4.4, 12.5),
      target: new THREE.Vector3(0, 2.0, -1.5),
      fov: 40,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    for (let index = 0; index < this.braziers.length; index += 1) {
      const brazier = this.braziers[index];
      const flame = brazier.userData.flame as THREE.Mesh | undefined;
      const glow = brazier.userData.glow as THREE.Sprite | undefined;
      if (flame) {
        flame.scale.y = 0.86 + Math.sin(time * 7 + index * 2.1) * 0.16;
        flame.rotation.y = time * 1.4 + index;
      }
      if (glow) {
        (glow.material as THREE.SpriteMaterial).opacity =
          0.55 + Math.sin(time * 3.2 + index) * 0.16;
      }
    }
  }
}
