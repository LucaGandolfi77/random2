import { AmbientLight, Group, Mesh, PointLight, Color, SphereGeometry } from 'three';
import type { BuiltEnvironment } from './kit';
import {
  box,
  car,
  createCrowd,
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

export function buildBelleville(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number) => void> = [];

  group.add(skyDome('#8b8f96', '#c2c1bc', 260));

  const ambient = new AmbientLight(new Color('#b9b4aa'), 0.5);
  group.add(ambient);
  for (const [x, z] of [[-1.5, 9], [1.2, -2], [-1.2, -13]] as const) {
    const fill = new PointLight(new Color('#cbc4b6'), 16, 22, 2);
    fill.position.set(x, 3.6, z);
    group.add(fill);
  }

  const street = streetBase(10, 64, { road: '#3b3d42', sidewalk: '#656159', wet: true });
  group.add(street);

  const blocks = [-21, -7, 7, 21];
  blocks.forEach((z, i) => {
    group.add(facade({
      x: 11,
      z,
      length: 13,
      height: 15 + (i % 3) * 3,
      depth: 6,
      front: 'x-',
      color: i % 2 === 0 ? '#6b665d' : '#5e5b54',
      rows: 4,
      cols: 4,
      litRatio: 0.22,
      seed: 100 + i,
      baseColor: '#3f3b35'
    }));
    group.add(facade({
      x: -11,
      z: z + (i % 2 === 0 ? 3 : -3),
      length: 12,
      height: 13 + ((i + 1) % 3) * 4,
      depth: 6,
      front: 'x+',
      color: i % 2 === 0 ? '#5c5f5e' : '#6a6259',
      rows: 4,
      cols: 4,
      litRatio: 0.18,
      seed: 200 + i,
      baseColor: '#37352f'
    }));
  });

  const shopFront = (x: number, z: number, width: number, color: string, sign: string, signBg: string, signFg: string, neon = false): void => {
    const rot = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    box(group, 0.2, 2.7, width, std(color, { roughness: 0.7 }), x + (x > 0 ? -0.02 : 0.02), 1.35, z);
    const glass = box(group, 0.06, 1.7, width * 0.7, std('#cfd9d8', { roughness: 0.15, emissive: '#8fa3a2', emissiveIntensity: 0.5 }), x + (x > 0 ? -0.13 : 0.13), 1.45, z, false);
    glass.castShadow = false;
    const label = makeSign(sign, signBg, signFg, width * 0.7, 0.45, neon);
    label.position.set(x + (x > 0 ? -0.15 : 0.15), 2.6, z);
    label.rotation.y = rot;
    group.add(label);
  };

  shopFront(8, 6, 4.2, '#7c5a3a', 'BOULANGERIE', '#4a3322', '#e9dcc0');
  const awning = box(group, 0.06, 0.1, 4.0, std('#8f3f35', { roughness: 0.9 }), 7.7, 2.15, 6);
  awning.rotation.z = 0.32;

  shopFront(-8, 8.5, 5.0, '#54463a', 'CAFÉ DES AMIS', '#33291f', '#e6d7b8');
  for (let i = 0; i < 3; i += 1) {
    const tx = -6.4;
    const tz = 7 + i * 1.6;
    const top = new Mesh(new SphereGeometry(0.42, 6, 4), std('#d8d4c8', { roughness: 0.8 }));
    top.scale.y = 0.12;
    top.position.set(tx, 0.82, tz);
    group.add(top);
    box(group, 0.06, 0.8, 0.06, std('#3c3c3c', { roughness: 0.6 }), tx, 0.4, tz);
    box(group, 0.5, 0.06, 0.5, std('#3b3a36', { roughness: 0.9 }), tx, 0.42, tz);
    box(group, 0.4, 0.06, 0.4, std('#6b5a45', { roughness: 0.9 }), tx - 0.75, 0.45, tz + 0.4);
    for (const [ox, oz] of [[-0.95, 0.1], [-0.55, 0.7]]) {
      box(group, 0.32, 0.06, 0.32, std('#6b5a45', { roughness: 0.9 }), tx + ox, 0.45, tz + oz);
      box(group, 0.32, 0.5, 0.05, std('#6b5a45', { roughness: 0.9 }), tx + ox, 0.7, tz + oz + 0.15);
    }
  }

  shopFront(8, -13, 4.6, '#5c6b5a', 'LAVERIE', '#27352b', '#d6e8b8', true);
  const laundryLight = new PointLight(new Color('#cfe6a8'), 9, 8, 2);
  laundryLight.position.set(7.2, 2.2, -13);
  group.add(laundryLight);

  const kiosk = new Group();
  box(kiosk, 2.2, 2.4, 1.6, std('#4e5c4a', { roughness: 0.8 }), 0, 1.2, 0);
  box(kiosk, 2.5, 0.15, 2.0, std('#38423a', { roughness: 0.8 }), 0, 2.48, 0);
  const magazineMat = posterMaterial({ title: 'PRESSE', subtitle: 'LE JOURNAL DU SOIR', bg: '#d9d3c1', fg: '#3a3a36', accent: '#a54a3c' });
  plane(kiosk, 1.5, 1.4, magazineMat, 1.11, 1.4, 0.1, 0, Math.PI / 2);
  kiosk.position.set(-6.5, 0, -2);
  group.add(kiosk);

  for (let i = 0; i < 2; i += 1) {
    const stall = new Group();
    const z = -5 - i * 4.5;
    box(stall, 2.4, 0.08, 1.2, std('#6a5a44', { roughness: 0.9 }), 0, 0.85, 0);
    box(stall, 2.4, 0.85, 1.2, std('#4d4234', { roughness: 0.9 }), 0, 0.42, 0);
    for (let s = 0; s < 5; s += 1) {
      box(stall, 0.48, 0.06, 1.5, std(s % 2 === 0 ? '#a8433f' : '#e0d5c1', { roughness: 0.95 }), -0.96 + s * 0.48, 2.2, 0);
    }
    box(stall, 2.4, 0.08, 0.08, std('#3b3328', { roughness: 0.8 }), 0, 1.1, -0.7);
    for (let c = 0; c < 3; c += 1) {
      box(stall, 0.6, 0.22, 0.4, std('#7a6242', { roughness: 0.9 }), -0.6 + c * 0.65, 0.97, 0);
      for (let f = 0; f < 4; f += 1) {
        const fruit = new Mesh(new SphereGeometry(0.075, 5, 4), std(f % 2 === 0 ? '#b8542c' : '#7d8a33', { roughness: 0.7 }));
        fruit.position.set(-0.75 + c * 0.65 + (f % 2) * 0.11, 1.13, -0.08 + Math.floor(f / 2) * 0.16);
        stall.add(fruit);
      }
    }
    stall.position.set(-2.9, 0, z);
    group.add(stall);
  }

  group.add(car('clio1', 5.6, 10.5, 0, '#8f3a33'));
  group.add(car('206', 5.7, -4, 0, '#b8b2a4'));
  group.add(car('saxo', -5.6, 1.5, Math.PI, '#4d5a44'));
  group.add(car('clio2', -5.7, -16, Math.PI, '#2f4a63'));

  group.add(lampPost(-6, 12, { warm: false }));
  group.add(lampPost(6, 3, { warm: false }));
  group.add(lampPost(-6, -8, { warm: false }));
  group.add(lampPost(6, -18, { warm: false }));

  group.add(graffiti(7.96, -2.5, 3.4, 1.6, -Math.PI / 2, 4));
  group.add(graffiti(-7.96, 16, 3.0, 1.5, Math.PI / 2, 9));

  plane(group, 1.6, 2.2, posterMaterial({
    title: 'MANIFESTE',
    subtitle: 'NON À LA PRÉCARITÉ\nSAMEDI · 14H',
    bg: '#7d2f2a',
    fg: '#f0e6cf',
    accent: '#e0b45c'
  }), -7.95, 2.2, 3.4, 0, Math.PI / 2);

  plane(group, 1.4, 2.0, posterMaterial({
    title: 'RACHID T.',
    subtitle: 'EN CONCERT\nLE 25 NOVEMBRE',
    bg: '#2e3f5c',
    fg: '#e9e2cc',
    footer: 'ZÉNITH'
  }), 7.95, 2.3, 10.6, 0, -Math.PI / 2);

  for (let i = 0; i < 12; i += 1) {
    group.add(puddle(-4 + (i % 4) * 2.7, -14 + i * 2.4, 0.7 + (i % 3) * 0.45, i));
  }

  const crowd = createCrowd(5, [
    { from: [-3.5, 16], to: [-3.5, -18], speed: 0.85, offset: 0.1 },
    { from: [3.2, -14], to: [3.2, 17], speed: 0.75, offset: 0.6 },
    { from: [-5.4, -6], to: [5.4, 5], speed: 0.55, offset: 1.1 },
    { from: [4.5, 12], to: [-4.5, 2], speed: 0.5, offset: 1.6 }
  ], ['#3c4048', '#5a4a3e', '#2e3a44', '#6b5a4a', '#44414a'], 31);
  group.add(crowd.group);
  updaters.push((t) => crowd.update(t));

  return {
    group,
    update: (t) => {
      for (const update of updaters) update(t);
    },
    dispose: () => {
      group.traverse((obj) => {
        if (obj instanceof Mesh) obj.geometry.dispose();
      });
    }
  };
}
