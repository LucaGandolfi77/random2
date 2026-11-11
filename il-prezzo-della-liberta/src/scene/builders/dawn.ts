import { AmbientLight, Color, Group, Mesh, PointLight, PlaneGeometry, SphereGeometry } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import {
  box,
  bus,
  car,
  facade,
  graffiti,
  lampPost,
  makeSign,
  plane,
  posterMaterial,
  puddle,
  skyDome,
  std,
  streetBase
} from './kit';
import { smoothstep } from '../../utils/math';

export function buildDawnStreet(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  group.add(skyDome('#d9ad9a', '#f5e2cd', 240));
  group.add(new AmbientLight(new Color('#f2cdb4'), 0.55));

  group.add(streetBase(11, 60, { road: '#545054', sidewalk: '#776f64', wet: true }));

  const blocks = [-20, -6, 8, 22];
  blocks.forEach((z, i) => {
    group.add(facade({
      x: 11,
      z,
      length: 13,
      height: 14 + (i % 2) * 3,
      depth: 6,
      front: 'x-',
      color: i % 2 === 0 ? '#a08c76' : '#8f8172',
      rows: 4,
      cols: 4,
      litRatio: 0.12,
      seed: 901 + i,
      baseColor: '#5a4f44'
    }));
    group.add(facade({
      x: -11,
      z: z - 3,
      length: 12,
      height: 13 + (i % 2) * 4,
      depth: 6,
      front: 'x+',
      color: i % 2 === 0 ? '#8a7a68' : '#998876',
      rows: 4,
      cols: 4,
      litRatio: 0.1,
      seed: 951 + i,
      baseColor: '#51463c'
    }));
  });

  const bakery = new Group();
  box(bakery, 5.5, 2.8, 0.3, std('#7d5a3c', { roughness: 0.85 }), 0, 1.4, 0);
  const warmWindow = box(bakery, 3.2, 1.7, 0.1, std('#f2d79c', { roughness: 0.2, emissive: '#f0c880', emissiveIntensity: 1.0 }), -0.6, 1.45, 0.2, false);
  warmWindow.castShadow = false;
  const sign = makeSign('BOULANGERIE', '#4a3423', '#efd9a8', 2.6, 0.5);
  sign.position.set(-0.6, 2.55, 0.22);
  bakery.add(sign);
  box(bakery, 5.9, 0.12, 1.2, std('#8f3f35', { roughness: 0.9 }), 0, 2.05, 0.65);
  bakery.position.set(8.0, 0, -2);
  bakery.rotation.y = -Math.PI / 2;
  group.add(bakery);
  const bakeryLight = new PointLight(new Color('#ffd79a'), 28, 12, 2);
  bakeryLight.position.set(6.5, 1.8, -2);
  group.add(bakeryLight);
  for (const [x, z, power] of [[1.0, 5.5, 42], [0.2, -7, 34], [-0.6, -17, 40]] as const) {
    const fill = new PointLight(new Color('#ffd0b0'), power, 26, 2);
    fill.position.set(x, 3.2, z);
    group.add(fill);
  }

  const windowPivot = new Group();
  windowPivot.position.set(8.02, 4.2, -7.2);
  group.add(windowPivot);
  box(windowPivot, 0.08, 1.3, 1.1, std('#7a5c40', { roughness: 0.9 }), 0, 0, 0.55);
  box(windowPivot, 0.05, 1.0, 0.9, std('#c8dcdc', { roughness: 0.2, emissive: '#efd8bc', emissiveIntensity: 0.4 }), -0.06, 0, 0.55, false);
  box(group, 0.12, 1.5, 1.4, std('#6a5440', { roughness: 0.9 }), 8.02, 4.2, -7.2);

  const laundry = new Group();
  const clothMat = std('#dfd0b8', { roughness: 0.95, side: 2 });
  const cloths: Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const cloth = new Mesh(new PlaneGeometry(0.7, 1.0), clothMat);
    cloth.position.set(7.55, 3.5 - i * 0.05, -7.5 - i * 0.6);
    cloth.rotation.y = -Math.PI / 2;
    laundry.add(cloth);
    cloths.push(cloth);
  }
  const figure = new Group();
  box(figure, 0.34, 0.6, 0.22, std('#4a4a52', { roughness: 0.9 }), 0, 0, 0);
  const head = new Mesh(new SphereGeometry(0.13, 5, 4), std('#9a7a5e', { roughness: 0.9 }));
  head.position.set(0, 0.42, 0);
  figure.add(head);
  laundry.add(figure);
  laundry.visible = false;
  group.add(laundry);

  group.add(graffiti(7.96, -11.5, 3.4, 1.5, -Math.PI / 2, 33));
  group.add(car('clio1', 5.8, -12, 0, '#8a4a3c'));
  group.add(car('206', -5.8, -7, Math.PI, '#a8a496'));
  group.add(lampPost(-5.8, 1, { warm: false }));
  group.add(lampPost(5.8, -12, { warm: false }));

  plane(group, 1.3, 1.9, posterMaterial({
    title: '2000',
    subtitle: 'NOUVEAU MILLÉNAIRE\nPARIS',
    bg: '#5c4a3a',
    fg: '#f0e2c8',
    accent: '#d9b168'
  }), -7.9, 2.2, -4, 0, Math.PI / 2);

  for (let i = 0; i < 5; i += 1) {
    box(group, 9 + (i % 2) * 4, 13 + (i % 3) * 4, 6, std('#7a6b5d', { roughness: 0.95 }), -20 + i * 10, 6.5, 36, false);
  }
  const busGroup = bus(-38, 0, Math.PI / 2);
  busGroup.position.set(-38, 0, -17);
  group.add(busGroup);

  const walker = new Group();
  box(walker, 0.42, 0.85, 0.24, std('#5a4a3e', { roughness: 0.95 }), 0, 1.0, 0);
  box(walker, 0.36, 0.55, 0.22, std('#3a3a40', { roughness: 0.95 }), 0, 0.3, 0);
  const wHead = new Mesh(new SphereGeometry(0.15, 5, 4), std('#b08e70', { roughness: 0.9 }));
  wHead.position.set(0, 1.58, 0);
  walker.add(wHead);
  const dog = new Group();
  box(dog, 0.28, 0.24, 0.5, std('#6a5a44', { roughness: 0.95 }), 0, 0.28, 0);
  box(dog, 0.18, 0.18, 0.18, std('#6a5a44', { roughness: 0.95 }), 0, 0.38, 0.32);
  box(dog, 0.05, 0.16, 0.05, std('#4a3f33', { roughness: 0.9 }), 0.08, 0.13, 0.16);
  dog.position.set(-1.2, 0, 0.4);
  walker.add(dog);
  group.add(walker);

  for (let i = 0; i < 14; i += 1) {
    group.add(puddle(-4.4 + (i % 4) * 2.9, -16 + i * 2.4, 0.7 + (i % 3) * 0.5, i));
  }

  for (const z of [-6, -14]) {
    const line = box(group, 12, 0.01, 0.02, std('#3a3630', { roughness: 0.8 }), 0, 4.6, z, false);
    line.castShadow = false;
    for (let i = 0; i < 5; i += 1) {
      const cloth = new Mesh(new PlaneGeometry(0.5, 0.7), std(['#d8c8b0', '#b8c4c0', '#c8b0a0'][i % 3], { roughness: 0.95, side: 2 }));
      cloth.position.set(-4 + i * 2, 4.1, z + 0.1);
      group.add(cloth);
      cloths.push(cloth);
    }
  }

  updaters.push((t, events) => {
    const openAt = events.timeOf('a6_window_open');
    const open = openAt === null ? 0 : smoothstep((t - openAt) / 2.0);
    windowPivot.rotation.y = -open * 0.9;
    laundry.visible = open > 0.02;
    cloths.forEach((cloth, i) => {
      cloth.rotation.z = Math.sin(t * 0.6 + i * 1.7) * 0.06;
      cloth.rotation.x = Math.sin(t * 0.45 + i) * 0.03;
    });
    const walkPhase = (t * 0.55) % 2;
    const u = walkPhase < 1 ? walkPhase : 2 - walkPhase;
    walker.position.set(-5.5 + u * 11, Math.abs(Math.sin(t * 3.4)) * 0.02, -2.2);
    walker.rotation.y = walkPhase < 1 ? Math.PI / 2 : -Math.PI / 2;

    if (openAt === null) {
      busGroup.position.x = -38;
    } else {
      const bu = Math.max(0, Math.min(1, (t - openAt - 2) / 9));
      busGroup.position.x = -38 + bu * 80;
    }
  });

  return {
    group,
    update: (t, events) => {
      for (const update of updaters) update(t, events);
    },
    dispose: () => {
      group.traverse((obj) => {
        if (obj instanceof Mesh) obj.geometry.dispose();
      });
    }
  };
}
