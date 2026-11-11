import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { BaseEnvironment } from './BaseEnvironment';
import {
  COLORS,
  boxMesh,
  createBicycleProp,
  createBuilding,
  createDumpster,
  createGround,
  createLamp,
  createPaving,
  createSignBoard,
  createWallSign,
  flatMaterial,
} from './props';
import type { Lamp } from './props';

export class Alley extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly lamps: Lamp[] = [];

  constructor(id: string) {
    super(id, 'alley');
    this.fog = { color: 0x0b111a, near: 9, far: 48 };

    this.mark('alley_enter_arturo', 0.4, 0, 8.6);
    this.mark('alley_enter_gino', 1.8, 0, 9.4);
    this.mark('alley_walk_arturo', 0.5, 0, 2.2);
    this.mark('alley_walk_gino', 1.8, 0, 3.2);
    this.mark('alley_corner_arturo', 2.7, 0, 2.1);
    this.mark('alley_cyclist_talk_arturo', 1.2, 0, 0.8);
    this.mark('alley_cyclist_talk_gino', -1.8, 0, 1.8);
    this.mark('alley_dog_gino', 2.9, 0, -0.6);
    this.mark('alley_stop_arturo', 0.6, 0, -1.0);
    this.mark('alley_stop_gino', 1.9, 0, -0.2);
    this.mark('alley_exit_arturo', 0.4, 0, -8.5);
    this.mark('alley_exit_gino', 1.7, 0, -8.0);
    this.mark('alley_mid', 0.5, 1.2, 1.5);
    this.mark('alley_bride', 0.35, 0, 1.35);
    this.mark('alley_groom', -0.35, 0, 1.35);
    this.mark('alley_photographer', 0.75, 0, 3.8);
    this.mark('alley_cyclist', 0, 0, -1.8);
    this.mark('alley_cyclist_exit', 0, 0, -11.5);
    this.mark('alley_dogman', -0.6, 0, -5.2);
    this.mark('alley_dog', 1.0, 0, -4.6);
    this.mark('cam_alley_high', 0.6, 3.7, 13.5);
    this.mark('cam_alley_high_b', 0.4, 3.3, 12.0);
    this.mark('cam_kiss', 3.0, 1.7, 4.8);
    this.mark('cam_cyclist', 2.9, 1.55, 0.6);
    this.mark('cam_dog', 2.5, 1.4, -2.4);
    this.mark('cam_alley_exit', 0.8, 2.7, 9.0);

    this.group.add(
      createNightLighting({
        moonColor: 0x8199bb,
        skyColor: 0x2b3546,
        groundColor: 0x171610,
        keyIntensity: 1.35,
        hemiIntensity: 0.95,
        ambientIntensity: 1.05,
      }).group,
    );

    this.sky = new Sky({
      top: 0x050a13,
      horizon: 0x111c2c,
      bottom: 0x070b12,
      stars: 180,
      starSeed: 31,
      starOpacity: 0.5,
    });
    this.group.add(this.sky.group);

    const paving = createPaving(7.2, 30, 0.7, 34, [0x4c4a44, 0x3f3e39, 0x57534b]);
    this.group.add(paving);

    const sides = createGround(50, 50, 0x20211e);
    sides.position.y = -0.02;
    this.group.add(sides);

    this.buildFacades();

    const dumpster = createDumpster();
    dumpster.position.set(3.5, 0, -3.1);
    dumpster.rotation.y = 0.2;
    this.group.add(dumpster);

    const bicycleA = createBicycleProp();
    bicycleA.position.set(-3.0, 0, -0.2);
    bicycleA.rotation.y = 0.15;
    bicycleA.rotation.z = 0.1;
    this.group.add(bicycleA);

    const bicycleB = createBicycleProp();
    bicycleB.position.set(-3.1, 0, 6.8);
    bicycleB.rotation.y = Math.PI * 0.94;
    bicycleB.rotation.z = -0.04;
    this.group.add(bicycleB);

    const lampA = createLamp({ withLight: true, lightIntensity: 30, height: 3.0 });
    lampA.group.position.set(-3.2, 0, 2.4);
    lampA.group.scale.setScalar(0.82);
    this.group.add(lampA.group);
    this.lamps.push(lampA);

    const lampB = createLamp({ withLight: true, lightIntensity: 24, height: 3.1 });
    lampB.group.position.set(3.3, 0, -4.8);
    lampB.group.scale.setScalar(0.8);
    this.group.add(lampB.group);
    this.lamps.push(lampB);

    const practical = new THREE.PointLight(0xdba86e, 14, 14, 1.8);
    practical.position.set(1.2, 3.2, 2.2);
    this.group.add(practical);

    const poster = createSignBoard({
      text: 'BAGNO',
      subtext: 'solo clienti',
      width: 0.9,
      height: 0.46,
      postHeight: 0.55,
      background: '#b8ae99',
      foreground: '#322d26',
      border: 'rgba(50, 45, 38, 0.5)',
    });
    poster.position.set(-3.25, 0, 5.1);
    poster.rotation.y = 0.7;
    this.group.add(poster);

    const bathroom = createWallSign('BAGNO CHIUSO', 0.9, 0.4, {
      width: 512,
      height: 256,
      background: '#c8bea9',
      foreground: '#4d3a2e',
      border: 'rgba(77, 58, 46, 0.5)',
    });
    bathroom.position.set(-4.01, 1.25, 1.2);
    bathroom.rotation.y = Math.PI / 2;
    this.group.add(bathroom);

    const actors = {
      arturo: CharacterFactory.arturo(),
      gino: CharacterFactory.gino(),
      photographer: CharacterFactory.photographer(),
      bride: CharacterFactory.bride(),
      groom: CharacterFactory.groom(),
      cyclist: CharacterFactory.cyclist(),
      dogman: CharacterFactory.dogman(),
      dog: CharacterFactory.dog(),
    };

    this.addActor(actors.arturo, 'alley_enter_arturo', Math.PI, true);
    this.addActor(actors.gino, 'alley_enter_gino', Math.PI, true);
    this.addActor(actors.photographer, 'alley_photographer', Math.PI, false);
    this.addActor(actors.bride, 'alley_bride', -Math.PI / 2, false);
    this.addActor(actors.groom, 'alley_groom', Math.PI / 2, false);
    this.addActor(actors.cyclist, 'alley_cyclist', 0, false);
    this.addActor(actors.dogman, 'alley_dogman', 0.4, false);
    this.addActor(actors.dog, 'alley_dog', -0.6, false);

    this.menuCamera = {
      position: new THREE.Vector3(1.2, 3.0, 11.0),
      target: new THREE.Vector3(0.4, 1.2, 0.5),
      fov: 44,
    };
  }

  private buildFacades(): void {
    const colors = [0x57534b, 0x5f5a51, 0x4e5357, 0x655c50];
    const windowColors = [0xd99d60, 0xe4b276, 0x92a6b6];

    for (const side of [-1, 1]) {
      const x = side * 5.6;
      for (let index = 0; index < 5; index += 1) {
        const z = -10 + index * 5.2;
        const height = 7.5 + ((index * 7 + (side > 0 ? 3 : 0)) % 4);
        const building = createBuilding({
          width: 3.4,
          height,
          depth: 5.0,
          color: colors[(index + (side > 0 ? 1 : 0)) % colors.length],
          seed: 50 + index + (side > 0 ? 10 : 0),
          windows: false,
        });
        building.position.set(x, 0, z);
        building.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.group.add(building);

        // Windows on the inner facade.
        for (let row = 1; row < Math.floor(height / 1.8); row += 1) {
          for (let col = 0; col < 3; col += 1) {
            const lit = (index * 3 + row * 2 + col + (side > 0 ? 1 : 0)) % 4 === 0;
            const material = lit
              ? new THREE.MeshBasicMaterial({
                  color: windowColors[(index + row) % windowColors.length],
                  toneMapped: false,
                })
              : flatMaterial(0x171c22);
            const window = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), material);
            window.position.set(
              side * 3.83,
              1.1 + row * 1.55,
              z - 1.35 + col * 1.35,
            );
            window.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            this.group.add(window);

            if (lit && (row + col) % 3 === 0) {
              const sill = boxMesh(0.06, 0.06, 0.64, 0x2c2d2d);
              sill.position.set(
                side * 3.78,
                0.66 + row * 1.55,
                z - 1.35 + col * 1.35,
              );
              this.group.add(sill);
            }
          }
        }

        const door = boxMesh(0.1, 2.1, 1.1, 0x28251f, {
          roughness: 0.8,
        });
        door.position.set(side * 3.76, 1.05, z + 1.6);
        this.group.add(door);

        const balcony = boxMesh(0.15, 0.12, 1.8, 0x35322c);
        balcony.position.set(side * 3.68, 3.2, z + 0.7);
        this.group.add(balcony);
      }
    }

    // Cavi sospesi
    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0x1b1d1f,
      transparent: true,
      opacity: 0.8,
    });
    for (let index = 0; index < 4; index += 1) {
      const z = 6 - index * 4;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 10; step += 1) {
        const x = -4.8 + (step / 10) * 9.6;
        const sag = Math.sin((step / 10) * Math.PI) * 0.55;
        points.push(new THREE.Vector3(x, 5.8 - sag, z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.group.add(new THREE.Line(geometry, wireMaterial));
    }
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    for (let index = 0; index < this.lamps.length; index += 1) {
      const lamp = this.lamps[index];
      const pulse = 0.92 + Math.sin(time * 1.3 + index * 2.4) * 0.08;
      lamp.light.intensity = (index === 0 ? 30 : 24) * pulse;
      (lamp.glow.material as THREE.SpriteMaterial).opacity = 0.76 * pulse;
    }
    void COLORS;
  }
}
