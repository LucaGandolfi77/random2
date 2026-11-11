import { Group, Mesh, PointLight, Color, CylinderGeometry } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import {
  addFluorescent,
  bench,
  bench as benchProp,
  box,
  createCrowd,
  cylinder,
  lampPost,
  makeSign,
  phoneBooth,
  plane,
  posterMaterial,
  rainCurtain,
  std
} from './kit';
import { smoothstep } from '../../utils/math';

export function buildGare(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  box(group, 26, 0.14, 46, std('#8f8b80', { roughness: 0.55, metalness: 0.06 }), 0, -0.07, 0, false);
  for (let z = -22; z <= 22; z += 4) {
    box(group, 26, 0.01, 0.05, std('#6e6a60', { roughness: 0.6 }), 0, 0.012, z, false);
  }
  for (let x = -12; x <= 12; x += 4) {
    box(group, 0.05, 0.01, 46, std('#6e6a60', { roughness: 0.6 }), x, 0.012, 0, false);
  }

  const wallMat = std('#7e7a70', { roughness: 0.9 });
  box(group, 26, 11, 0.6, wallMat, 0, 5.5, -22);
  box(group, 0.6, 11, 46, wallMat, -13, 5.5, 0);
  box(group, 0.6, 11, 46, std('#5f6b6e', { roughness: 0.4, metalness: 0.2 }), 13, 5.5, 0);
  for (let i = 0; i < 5; i += 1) {
    box(group, 3.6, 4.2, 0.06, std('#b8d0da', { roughness: 0.18, emissive: '#8faebc', emissiveIntensity: 0.5 }), -10 + i * 5, 6.6, -21.68, false);
    box(group, 0.18, 4.6, 0.2, std('#3e4a4e', { roughness: 0.6 }), -11.9 + i * 5, 6.6, -21.6, false);
  }
  box(group, 26, 1.2, 0.3, std('#5f5c54', { roughness: 0.9 }), 0, 9.8, -21.7, false);
  for (let i = 0; i < 4; i += 1) {
    plane(group, 1.3, 1.9, posterMaterial({
      title: ['PARIS', 'MÉTRO', 'CONCERT', 'EXPO'][i],
      subtitle: ['VENEZ NOMBREUX', 'LIGNE 2', 'SAMEDI 21H', 'AUJOURD’HUI'][i],
      bg: ['#6d3b35', '#2e4a62', '#5b5a33', '#4a3d52'][i],
      fg: '#efe4cc',
      footer: '2000'
    }), -10.5 + i * 7, 3.4, -21.62);
  }

  const glassMat = std('#8fa5ad', { roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.28 });
  for (let z = -18; z <= 18; z += 6) {
    const pane = box(group, 0.05, 6.4, 5.4, glassMat, 12.65, 5.4, z, false);
    pane.castShadow = false;
    box(group, 0.14, 0.2, 6, std('#3e4a4e', { roughness: 0.6, metalness: 0.4 }), 12.55, 2.2, z, false);
    box(group, 0.14, 0.2, 6, std('#3e4a4e', { roughness: 0.6, metalness: 0.4 }), 12.55, 8.6, z, false);
  }

  const roofGlass = std('#9fb3bb', { roughness: 0.2, transparent: true, opacity: 0.18 });
  for (let x = -10; x <= 10; x += 4) {
    box(group, 4, 0.06, 44, roofGlass, x, 10.2, 0, false);
  }
  for (let z = -20; z <= 20; z += 4) {
    box(group, 26, 0.18, 0.18, std('#4a5257', { roughness: 0.6, metalness: 0.4 }), 0, 10.1, z, false);
  }

  for (const x of [-6.5, 6.5]) {
    for (const z of [-12, -4, 4, 12]) {
      cylinder(group, 0.32, 0.4, 10, 8, std('#6d6c64', { roughness: 0.85 }), x, 5, z);
      box(group, 0.9, 0.18, 0.9, std('#4d4c46', { roughness: 0.8 }), x, 0.09, z, false);
    }
  }

  addFluorescent(group, -4.5, 9.6, -8, 3.2, '#dfeaf0', 1.1);
  addFluorescent(group, 4.5, 9.6, -8, 3.2, '#dfeaf0', 1.1);
  addFluorescent(group, -4.5, 9.6, 6, 3.2, '#dfeaf0', 1.1);
  addFluorescent(group, 4.5, 9.6, 6, 3.2, '#dfeaf0', 1.1);
  const cold = new PointLight(new Color('#c8dcea'), 70, 34, 2);
  cold.position.set(8, 7, -4);
  group.add(cold);
  const warm = new PointLight(new Color('#ffd9a8'), 30, 18, 2);
  warm.position.set(0, 4.6, 2);
  group.add(warm);
  const backLight = new PointLight(new Color('#bcd4e2'), 40, 26, 2);
  backLight.position.set(0, 6, -15);
  group.add(backLight);

  group.add(benchProp(0, 0, 0, 2.6));
  group.add(benchProp(-4.4, -2.4, 0, 2.2));
  group.add(benchProp(4.4, -2.4, 0, 2.2));
  group.add(benchProp(-4.4, 7.5, 0, 2.2));
  group.add(benchProp(4.4, 9.5, 0, 2.2));

  const board = new Group();
  box(board, 4.6, 2.2, 0.18, std('#1a2026', { roughness: 0.6 }), 0, 0, 0);
  const boardFace = posterMaterial({
    title: 'DÉPARTS',
    subtitle: '16:42  LONDRES\n16:50  BRUXELLES\n17:05  LILLE\n17:18  AMSTERDAM',
    bg: '#141a20',
    fg: '#f1d68a',
    accent: '#c9a44c'
  });
  plane(board, 4.2, 1.9, boardFace, 0, 0, 0.1);
  board.position.set(0, 5.6, -7.2);
  group.add(board);
  cylinder(group, 0.02, 0.02, 2.4, 4, std('#2a2e30', { roughness: 0.6 }), -1.8, 7.5, -7.2);
  cylinder(group, 0.02, 0.02, 2.4, 4, std('#2a2e30', { roughness: 0.6 }), 1.8, 7.5, -7.2);

  const clock = new Group();
  const face = new Mesh(new CylinderGeometry(0.7, 0.7, 0.12, 16), std('#e9e5d6', { roughness: 0.5 }));
  face.rotation.x = Math.PI / 2;
  clock.add(face);
  box(clock, 0.04, 0.5, 0.04, std('#22262a', { roughness: 0.5 }), 0, 0.18, 0.1, false);
  box(clock, 0.36, 0.04, 0.04, std('#22262a', { roughness: 0.5 }), 0.14, 0.02, 0.1, false);
  clock.position.set(0, 7.6, -9);
  group.add(clock);

  const booths = new Group();
  for (let i = 0; i < 3; i += 1) {
    box(booths, 1.6, 2.4, 1.3, std('#4a5a66', { roughness: 0.6 }), -2.1 + i * 2.1, 1.2, 0);
    box(booths, 1.4, 0.9, 0.06, std('#a8c2cc', { roughness: 0.15, transparent: true, opacity: 0.35 }), -2.1 + i * 2.1, 1.65, 0.67, false);
    const sign = makeSign('BILLETS', '#30404a', '#e8eee8', 1.1, 0.3);
    sign.position.set(-2.1 + i * 2.1, 2.15, 0.69);
    booths.add(sign);
  }
  booths.position.set(-9.2, 0, 8.5);
  booths.rotation.y = Math.PI / 2;
  group.add(booths);

  const kiosk = new Group();
  box(kiosk, 2.6, 2.5, 1.8, std('#445242', { roughness: 0.75 }), 0, 1.25, 0);
  box(kiosk, 2.9, 0.16, 2.1, std('#2f3a2f', { roughness: 0.8 }), 0, 2.58, 0);
  const news = posterMaterial({ title: 'JOURNAUX', subtitle: 'LE SOIR · L\'ÉQUIPE', bg: '#d9d3c1', fg: '#3a3a36' });
  plane(kiosk, 1.8, 1.5, news, 0, 1.5, 0.93);
  kiosk.position.set(8.6, 0, 7.5);
  kiosk.rotation.y = -0.4;
  group.add(kiosk);

  group.add(phoneBooth(10.8, 1.2, -Math.PI / 2));
  group.add(phoneBooth(10.8, -1.4, -Math.PI / 2));

  for (let z = -18; z <= 16; z += 8) {
    box(group, 0.16, 0.5, 1.6, std('#3a4448', { roughness: 0.6 }), 12.4, 0.35, z, false);
  }

  const trackEdge = box(group, 26, 0.3, 1.2, std('#57544c', { roughness: 0.9 }), 0, 0.15, -15.6);
  trackEdge.receiveShadow = true;
  box(group, 26, 0.06, 0.08, std('#d8c56a', { roughness: 0.7 }), 0, 0.32, -15.1, false);

  const train = new Group();
  const trainBody = std('#3c4d5c', { roughness: 0.45, metalness: 0.25 });
  box(train, 30, 2.8, 3.0, trainBody, 0, 1.8, 0);
  for (let i = 0; i < 12; i += 1) {
    box(train, 1.6, 0.7, 0.05, std('#c8d9d8', { roughness: 0.15, emissive: '#b8d8de', emissiveIntensity: 0.95 }), -13 + i * 2.4, 2.2, 1.52, false);
  }
  box(train, 30, 0.3, 3.1, std('#d8d2c0', { roughness: 0.6 }), 0, 3.3, 0);
  for (let i = 0; i < 10; i += 1) {
    const wheel = new Mesh(new CylinderGeometry(0.4, 0.4, 0.2, 8), std('#17191c', { roughness: 0.9 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(-12 + i * 2.6, 0.45, 1.35);
    train.add(wheel);
  }
  train.position.set(0, 0, -17.4);
  group.add(train);

  const rain = rainCurtain(18, 10, 0.2);
  rain.group.rotation.y = -Math.PI / 2;
  rain.group.position.set(13.35, 0, -3);
  group.add(rain.group);
  updaters.push((t) => rain.update(t));

  group.add(makeSignMesh('SORTIE', '#2f4a3c', '#e8eee6', 1.8, 0.5, -4.2, 3.4, 13.2, -Math.PI / 2));
  group.add(makeSignMesh('GRANDES LIGNES', '#2f3f52', '#e8e4d4', 3.0, 0.6, 0, 4.2, -21.6, 0));

  for (let i = 0; i < 5; i += 1) {
    plane(group, 1.3, 1.9, posterMaterial({
      title: 'PARIS',
      subtitle: 'VENEZ NOMBREUX',
      bg: ['#6d3b35', '#2e4a62', '#5b5a33'][i % 3],
      fg: '#efe4cc',
      footer: '2000'
    }), -12.65, 2.4, -14 + i * 3.4, 0, Math.PI / 2);
  }

  const crowd = createCrowd(10, [
    { from: [-9, 16], to: [-2, -12], speed: 0.7, offset: 0.2 },
    { from: [8, -12], to: [2, 16], speed: 0.8, offset: 0.8 },
    { from: [-4, -16], to: [9, 12], speed: 0.6, offset: 0.4 },
    { from: [5, 14], to: [-7, -6], speed: 0.5, offset: 1.3 }
  ], ['#3c4048', '#5a4a3e', '#2e3a44', '#6b5a4a', '#44414a', '#55504a'], 77);
  group.add(crowd.group);
  updaters.push((t) => crowd.update(t));

  updaters.push((t, events) => {
    const passAt = events.timeOf('a3_train_pass');
    if (passAt === null) {
      train.position.x = 0;
    } else {
      const u = Math.max(0, Math.min(1, (t - passAt) / 6));
      train.position.x = 32 - 64 * smoothstep(u);
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

function makeSignMesh(text: string, bg: string, fg: string, w: number, h: number, x: number, y: number, z: number, rotY: number): Mesh {
  const sign = makeSign(text, bg, fg, w, h);
  sign.position.set(x, y, z);
  sign.rotation.y = rotY;
  return sign;
}
