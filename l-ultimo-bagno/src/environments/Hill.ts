import * as THREE from 'three';
import { CharacterFactory } from '../characters/CharacterFactory';
import { createDawnLighting, createNightLighting } from '../scene/Lighting';
import { Sky } from '../scene/Sky';
import { BaseEnvironment } from './BaseEnvironment';
import type { CompiledFilm } from '../data/types';
import {
  boxMesh,
  createGrass,
  createGround,
  createSignBoard,
  createTree,
  flatMaterial,
  glowSprite,
} from './props';
import { makeSignTexture } from '../utils/textures';

interface HillTerrain {
  tree: THREE.Group;
  sign: THREE.Group;
}

function buildHillTerrain(env: BaseEnvironment, dawn: boolean): HillTerrain {
  const ground = createGround(90, 90, dawn ? 0x4c5542 : 0x35402d);
  env.group.add(ground);

  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(17, 20),
    flatMaterial(dawn ? 0x555b46 : 0x3b4833, { roughness: 1 }),
  );
  patch.rotation.x = -Math.PI / 2;
  patch.position.y = 0.006;
  patch.receiveShadow = true;
  env.group.add(patch);

  const grass = createGrass(42, 42, 280, dawn ? 171 : 167);
  env.group.add(grass);

  const tree = createTree(dawn ? 401 : 397, 2.0);
  tree.position.set(0, 0, -2.5);
  env.group.add(tree);

  const sign = createSignBoard({
    text: 'FINALMENTE SOLO',
    width: 1.35,
    height: 0.5,
    postHeight: 0,
    posts: false,
    background: '#c4b79e',
    foreground: '#3c342b',
    border: 'rgba(60, 52, 43, 0.5)',
    illuminated: !dawn,
    doubleSided: true,
  });
  sign.position.set(0.0, 1.28, -1.9);
  sign.rotation.y = 0.02;
  const signGlow = sign.children.find((child) => child instanceof THREE.Sprite);
  if (signGlow) signGlow.visible = false;
  env.group.add(sign);
  const nail = boxMesh(0.1, 0.06, 0.08, 0x2e2a24, { roughness: 0.9 });
  nail.position.set(0, 1.74, -1.88);
  env.group.add(nail);

  const rocks: Array<[number, number, number, number]> = [
    [-5.5, -4.4, 0.7, 0.13],
    [4.2, 3.8, 0.55, -0.2],
    [1.8, -0.8, 0.3, 0.4],
    [-8.6, 0.8, 0.4, 0.2],
  ];
  for (const [x, z, size, rotation] of rocks) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      flatMaterial(dawn ? 0x777264 : 0x625e54, { roughness: 1 }),
    );
    rock.scale.set(1.25, 0.55, 1);
    rock.position.set(x, size * 0.25, z);
    rock.rotation.y = rotation;
    rock.castShadow = true;
    rock.receiveShadow = true;
    env.group.add(rock);
  }

  const hills: Array<[number, number, number, number]> = [
    [-36, -38, 28, 0.14],
    [0, -48, 38, 0.12],
    [38, -34, 24, 0.16],
    [-30, -8, 16, 0.12],
    [30, 8, 18, 0.12],
  ];
  for (const [x, z, radius, squash] of hills) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 10, 5),
      flatMaterial(dawn ? 0x37412f : 0x222c1c, { roughness: 1 }),
    );
    hill.scale.set(1.5, squash, 1);
    hill.position.set(x, -0.4, z);
    hill.receiveShadow = true;
    env.group.add(hill);
  }

  return { tree, sign };
}

function buildFilmCamera(): THREE.Group {
  const group = new THREE.Group();
  const dark = flatMaterial(0x242628, { metalness: 0.3, roughness: 0.6 });
  const hub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), dark);
  hub.position.y = 1.1;
  group.add(hub);
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(angle) * 0.32, 0.02, Math.sin(angle) * 0.32);
    const end = new THREE.Vector3(0, 1.08, 0);
    const direction = new THREE.Vector3().subVectors(end, start);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, direction.length(), 4),
      dark,
    );
    leg.position.copy(start).add(end).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(leg);
  }
  const body = boxMesh(0.42, 0.32, 0.5, 0x1b1c1e, {
    metalness: 0.35,
    roughness: 0.55,
  });
  body.position.y = 1.32;
  group.add(body);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.1, 0.18, 7),
    flatMaterial(0x0d0e10, { metalness: 0.5, roughness: 0.35 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.32, 0.33);
  group.add(lens);
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.05, 7),
    flatMaterial(0x2a2c2f, { roughness: 0.6 }),
  );
  reel.rotation.z = Math.PI / 2;
  reel.position.set(0.23, 1.48, 0);
  group.add(reel);
  return group;
}

export class Hill extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly sign: THREE.Group;
  private readonly workLight: THREE.PointLight;

  constructor(id: string) {
    super(id, 'hill');
    this.fog = { color: 0x0b1420, near: 22, far: 120 };

    this.mark('hill_enter_arturo', 6.0, 0, 7.0);
    this.mark('hill_enter_gino', 7.4, 0, 7.8);
    this.mark('hill_arturo', 0.0, 0, 1.5);
    this.mark('hill_gino', 1.6, 0, 2.2);
    this.mark('hill_alone', -0.8, 0, 0.3);
    this.mark('hill_gino_side', -2.7, 0, 2.8);
    this.mark('hill_sign', 0.4, 1.6, -2.1);
    this.mark('hill_director', 8.5, 0, -4.5);
    this.mark('hill_cameraman', 6.8, 0, -3.2);
    this.mark('hill_boom', 9.8, 0, -2.6);
    this.mark('hill_pa', 10.6, 0, -4.8);
    this.mark('cam_hill_wide', 14.0, 5.8, 16.0);
    this.mark('cam_hill_empty', 6.0, 2.6, 10.0);
    this.mark('cam_hill_arturo', 3.4, 1.6, 0.5);
    this.mark('cam_hill_sign', 2.8, 1.9, 3.0);
    this.mark('cam_hill_crew', -7.0, 2.4, 6.5);
    this.mark('cam_hill_shout', 2.6, 1.7, 3.6);
    this.mark('cam_hill_cry', 1.8, 1.5, 3.4);

    this.group.add(
      createNightLighting({
        moonColor: 0x9bb3d2,
        skyColor: 0x26374d,
        groundColor: 0x161a12,
        keyIntensity: 1.85,
        hemiIntensity: 0.95,
        ambientIntensity: 0.8,
      }).group,
    );

    this.sky = new Sky({
      top: 0x04090f,
      horizon: 0x132137,
      bottom: 0x070d15,
      stars: 1200,
      starSeed: 137,
      starOpacity: 0.95,
      moon: { position: [-24, 26, -62], radius: 2.3 },
    });
    this.group.add(this.sky.group);

    const terrain = buildHillTerrain(this, false);
    this.sign = terrain.sign;
    void terrain.tree;

    const cityGlow = glowSprite('#dba266', 22);
    cityGlow.position.set(0, 2.2, -62);
    this.group.add(cityGlow);

    const citySilhouette = boxMesh(16, 1.4, 0.4, 0x1a2027, { roughness: 1 });
    citySilhouette.position.set(0, 0.7, -63);
    this.group.add(citySilhouette);

    // Attrezzatura della troupe
    const camera = buildFilmCamera();
    camera.position.set(6.8, 0, -3.2);
    camera.rotation.y = 0.4;
    this.group.add(camera);

    const lightStand = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 2.6, 5),
      flatMaterial(0x2a2b2c, { metalness: 0.35, roughness: 0.65 }),
    );
    pole.position.y = 1.3;
    lightStand.add(pole);
    const panel = boxMesh(0.5, 0.35, 0.15, 0x26272a, {
      metalness: 0.3,
      roughness: 0.6,
    });
    panel.position.set(0, 2.35, 0.12);
    panel.rotation.x = -0.4;
    lightStand.add(panel);
    const lampFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.26),
      new THREE.MeshBasicMaterial({ color: 0xf1c48d, toneMapped: false }),
    );
    lampFace.position.set(0, 2.35, 0.2);
    lampFace.rotation.x = -0.4;
    lightStand.add(lampFace);
    lightStand.position.set(8.8, 0, -6.2);
    lightStand.rotation.y = -0.5;
    this.group.add(lightStand);

    this.workLight = new THREE.PointLight(0xf0c48c, 9, 11, 2);
    this.workLight.position.set(8.8, 2.2, -6.0);
    this.group.add(this.workLight);

    const clapperBoard = createSignBoard({
      text: 'L’ULTIMO BAGNO',
      subtext: 'scena 21 · ciak',
      width: 0.8,
      height: 0.48,
      postHeight: 0.02,
      posts: false,
      background: '#1f2021',
      foreground: '#e7dfcf',
      border: 'rgba(231, 223, 207, 0.45)',
    });
    clapperBoard.position.set(9.6, 0.62, -3.7);
    clapperBoard.rotation.x = -0.85;
    clapperBoard.rotation.y = -0.3;
    this.group.add(clapperBoard);

    const actors = {
      arturo: CharacterFactory.arturo(),
      gino: CharacterFactory.gino(),
      director: CharacterFactory.director(),
      cameraman: CharacterFactory.cameraman(),
      boom: CharacterFactory.boomOperator(),
      pa: CharacterFactory.productionAssistant(),
    };

    this.addActor(actors.arturo, 'hill_enter_arturo', Math.PI, true);
    this.addActor(actors.gino, 'hill_enter_gino', Math.PI, true);
    this.addActor(actors.director, 'hill_director', -Math.PI / 2, false);
    this.addActor(actors.cameraman, 'hill_cameraman', -Math.PI / 2, false);
    this.addActor(actors.boom, 'hill_boom', -Math.PI / 2, false);
    this.addActor(actors.pa, 'hill_pa', -Math.PI / 2, false);

    this.menuCamera = {
      position: new THREE.Vector3(9.0, 4.2, 12.0),
      target: new THREE.Vector3(0, 1.3, 0),
      fov: 42,
    };
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    this.workLight.intensity = 9 + Math.sin(time * 3.2) * 0.5;
    if (this.sign) {
      this.sign.rotation.z = Math.sin(time * 0.3) * 0.01;
    }
  }
}

// ---------------------------------------------------------------------------
// L'alba
// ---------------------------------------------------------------------------

export class HillDawn extends BaseEnvironment {
  private readonly sky: Sky;
  private readonly barSign: THREE.Mesh;
  private readonly barGlow: THREE.Sprite;
  private readonly barLight: THREE.PointLight;
  private readonly barWindowMaterials: THREE.MeshStandardMaterial[] = [];
  private signOffTime = Number.POSITIVE_INFINITY;
  private readonly bathroomSign: THREE.Mesh;

  constructor(id: string) {
    super(id, 'hillDawn');
    this.fog = { color: 0x6b5a52, near: 24, far: 118 };

    this.mark('dawn_sit_arturo', -0.7, 0, 0.4);
    this.mark('dawn_sit_gino', 0.8, 0, 0.9);
    this.mark('dawn_stand_arturo', -0.2, 0, -0.2);
    this.mark('dawn_stand_gino', 1.2, 0, 0.2);
    this.mark('bar_patio_arturo', -12.0, 0, -14.8);
    this.mark('bar_patio_gino', -10.8, 0, -14.2);
    this.mark('dawn_bar_far', -9.0, 1.2, -14.0);
    this.mark('dawn_bar_door', -14.0, 1.35, -16.4);
    this.mark('cam_dawn_wide', 10.0, 4.6, 15.0);
    this.mark('cam_dawn_two', 3.4, 1.55, 5.6);
    this.mark('cam_dawn_bar_far', 2.5, 2.6, 4.0);
    this.mark('cam_dawn_bar_door', -7.0, 2.2, -9.0);
    this.mark('cam_dawn_sign', -14.0, 1.75, -11.0);
    this.mark('cam_dawn_final', -5.5, 4.6, 9.0);

    this.group.add(
      createDawnLighting({
        sunColor: 0xf1c390,
        skyColor: 0xd8b4a6,
        groundColor: 0x4d4b3c,
        keyIntensity: 1.45,
        hemiIntensity: 0.92,
      }).group,
    );

    this.sky = new Sky({
      top: 0x425d7c,
      horizon: 0xe4b7a3,
      bottom: 0x3b3d43,
      stars: 90,
      starSeed: 151,
      starOpacity: 0.22,
      moon: { position: [26, 9, -70], radius: 1.7 },
    });
    this.group.add(this.sky.group);

    buildHillTerrain(this, true);

    // Il bar all'orizzonte
    const barBuilding = boxMesh(5.2, 3.2, 3.6, 0x55483a, { roughness: 0.96 });
    barBuilding.position.set(-14.0, 1.6, -18.4);
    this.group.add(barBuilding);

    const barRoof = boxMesh(5.6, 0.18, 4.0, 0x332c25, { roughness: 1 });
    barRoof.position.set(-14.0, 3.28, -18.4);
    this.group.add(barRoof);

    const barFront = boxMesh(5.3, 3.0, 0.12, 0x625040, { roughness: 0.95 });
    barFront.position.set(-14.0, 1.5, -16.56);
    this.group.add(barFront);

    const door = boxMesh(1.1, 2.15, 0.08, 0x2a231d, { roughness: 0.85 });
    door.position.set(-14.0, 1.08, -16.47);
    this.group.add(door);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xc4854b,
      emissive: 0xc4854b,
      emissiveIntensity: 0.42,
      roughness: 0.4,
    });
    for (const side of [-1.55, 1.55]) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.0), windowMaterial);
      window.position.set(-14.0 + side, 1.55, -16.46);
      this.group.add(window);
      this.barWindowMaterials.push(windowMaterial);
    }

    const barSignTexture = makeSignTexture({
      text: 'BAR APERTO 24H',
      width: 512,
      height: 192,
      background: '#2b1411',
      foreground: '#f4c887',
      border: 'rgba(244, 200, 135, 0.65)',
    });
    this.barSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 0.72),
      new THREE.MeshBasicMaterial({ map: barSignTexture, toneMapped: false }),
    );
    this.barSign.position.set(-14.0, 2.75, -16.1);
    this.group.add(this.barSign);

    this.barGlow = glowSprite('#ffb56b', 3.0);
    this.barGlow.position.set(-14.0, 2.75, -16.22);
    (this.barGlow.material as THREE.SpriteMaterial).opacity = 0.0;
    this.group.add(this.barGlow);

    this.barLight = new THREE.PointLight(0xf0a45f, 8, 10, 2);
    this.barLight.position.set(-14.0, 2.0, -15.7);
    this.group.add(this.barLight);

    const porchLight = new THREE.PointLight(0xe5b179, 4.5, 8, 2);
    porchLight.position.set(-11.8, 1.9, -15.0);
    this.group.add(porchLight);

    const bathroomTexture = makeSignTexture({
      text: 'BAGNO FUORI SERVIZIO',
      width: 512,
      height: 192,
      background: '#d4c7ae',
      foreground: '#4b332c',
      border: 'rgba(75, 51, 44, 0.55)',
    });
    this.bathroomSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.6),
      new THREE.MeshBasicMaterial({
        map: bathroomTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.bathroomSign.position.set(-14.0, 2.02, -16.2);
    this.group.add(this.bathroomSign);

    const threshold = boxMesh(1.8, 0.06, 1.1, 0x70675a, { roughness: 0.95 });
    threshold.position.set(-14.0, 0.03, -15.9);
    this.group.add(threshold);

    const actors = {
      arturo: CharacterFactory.arturo(),
      gino: CharacterFactory.gino(),
    };

    this.addActor(actors.arturo, 'dawn_sit_arturo', 0.25, true);
    this.addActor(actors.gino, 'dawn_sit_gino', -0.15, true);

    this.menuCamera = {
      position: new THREE.Vector3(7.0, 3.6, 10.0),
      target: new THREE.Vector3(-0.5, 1.3, 0.5),
      fov: 41,
    };
  }

  override applyTimeline(film: CompiledFilm): void {
    const signOff = film.sfx
      .filter((event) => event.stageId === this.id && event.name === 'sign_off')
      .sort((a, b) => a.time - b.time)[0];
    this.signOffTime = signOff ? signOff.time : Number.POSITIVE_INFINITY;
    this.group.userData.signOffTime = this.signOffTime;
  }

  override update(time: number, _playing: boolean): void {
    this.sky.update(time);
    const signOn = time < this.signOffTime;
    this.barSign.visible = signOn;
    this.barGlow.visible = false;
    this.barLight.intensity = signOn ? 8 + Math.sin(time * 1.4) * 0.4 : 0;
    for (const material of this.barWindowMaterials) {
      material.emissiveIntensity = signOn ? 1.8 : 0.25;
    }

    const nearFinal = time > this.signOffTime;
    if (nearFinal) {
      this.bathroomSign.position.y = 2.02 + Math.sin(time * 0.8) * 0.0015;
    }
  }
}
