import { Color, Group, Mesh, PointLight } from 'three';
import type { BuiltEnvironment } from './kit';
import {
  box,
  car,
  cylinder,
  facade,
  graffiti,
  lampPost,
  makeSign,
  metroEntrance,
  phoneBooth,
  plane,
  posterMaterial,
  puddle,
  rainCurtain,
  skyDome,
  std,
  streetBase,
  trashBin
} from './kit';

function nightAtmosphere(group: Group, top: string, bottom: string): void {
  group.add(skyDome(top, bottom, 220));
}

export function buildPhoneCorner(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number) => void> = [];
  nightAtmosphere(group, '#141c28', '#2c3542');

  group.add(streetBase(9, 40, { road: '#22262d', sidewalk: '#3e3d3a', wet: true }));

  group.add(facade({
    x: 9,
    z: 0,
    length: 40,
    height: 17,
    depth: 6,
    front: 'x-',
    color: '#4a4c50',
    rows: 5,
    cols: 7,
    litRatio: 0.2,
    seed: 501,
    baseColor: '#2c2c2b'
  }));
  group.add(facade({
    x: -9,
    z: -6,
    length: 28,
    height: 14,
    depth: 6,
    front: 'x+',
    color: '#3f4147',
    rows: 4,
    cols: 5,
    litRatio: 0.16,
    seed: 502,
    baseColor: '#292a2c'
  }));

  box(group, 7, 5.5, 0.8, std('#34363a', { roughness: 0.9 }), -2, 2.75, -2.4);
  box(group, 7, 1.2, 1.4, std('#26282b', { roughness: 0.85 }), -2, 0.6, -2.4);
  const signMat = makeSign('TABAC', '#3a2418', '#e8c27a', 1.8, 0.5);
  signMat.position.set(-3.6, 3.6, -1.95);
  group.add(signMat);
  const neon = makeSign('BAR', '#12100f', '#e86a4a', 1.4, 0.6, true);
  neon.position.set(5.2, 4.0, -6);
  neon.rotation.y = -Math.PI / 2;
  group.add(neon);
  const neonLight = new PointLight(new Color('#e8794a'), 15, 10, 2);
  neonLight.position.set(4.6, 3.6, -6);
  group.add(neonLight);

  group.add(phoneBooth(-1.4, -1.1, 0));
  const boothLight = new PointLight(new Color('#ffe0b0'), 12, 8, 2);
  boothLight.position.set(-1.1, 2.1, -0.4);
  group.add(boothLight);
  const lamp = new PointLight(new Color('#ffc178'), 40, 15, 2);
  lamp.position.set(2.6, 3.8, 1.2);
  group.add(lamp);
  group.add(lampPost(3.4, 6.5, { withLight: true }));
  group.add(lampPost(-4.6, -8, { warm: true }));

  group.add(car('saxo', 5.2, 8, 0, '#33404a'));
  group.add(car('clio2', -4.9, -14, Math.PI, '#5a3a33'));
  group.add(trashBin(-3.4, 2.2));
  group.add(graffiti(-8.95, 3.5, 3.2, 1.5, Math.PI / 2, 12));

  plane(group, 1.2, 1.7, posterMaterial({
    title: 'NOKIA',
    subtitle: '3310\nLE NOUVEAU',
    bg: '#23405c',
    fg: '#e9eef2',
    footer: '2000'
  }), 7.9, 2.5, -3, 0, -Math.PI / 2);

  for (let i = 0; i < 9; i += 1) {
    group.add(puddle(-3.6 + (i % 3) * 2.8, -6 + i * 3.2, 0.8 + (i % 3) * 0.35, i));
  }

  const rain = rainCurtain(16, 9, 0.14);
  rain.group.position.set(0, 0, 3.4);
  group.add(rain.group);
  const rain2 = rainCurtain(14, 8, 0.09);
  rain2.group.position.set(-4, 0, 2.0);
  group.add(rain2.group);
  updaters.push((t) => {
    rain.update(t);
    rain2.update(t + 3.7);
  });

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

export function buildNightAvenue(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number) => void> = [];
  nightAtmosphere(group, '#101724', '#28313d');

  group.add(streetBase(12, 54, { road: '#21252b', sidewalk: '#41403c', wet: true }));

  const blocks = [-16, 0, 16];
  blocks.forEach((z, i) => {
    group.add(facade({
      x: 11,
      z,
      length: 14,
      height: 16 + (i % 2) * 4,
      depth: 6,
      front: 'x-',
      color: i % 2 === 0 ? '#41454b' : '#35393f',
      rows: 5,
      cols: 4,
      litRatio: 0.24,
      seed: 601 + i,
      baseColor: '#26272a'
    }));
    group.add(facade({
      x: -11,
      z: z + 4,
      length: 13,
      height: 15,
      depth: 6,
      front: 'x+',
      color: i % 2 === 0 ? '#3a3f45' : '#44464a',
      rows: 5,
      cols: 4,
      litRatio: 0.2,
      seed: 701 + i,
      baseColor: '#232426'
    }));
  });

  const shop = (x: number, z: number, w: number, color: string, text: string, neon: boolean): void => {
    box(group, 0.2, 2.6, w, std(color, { roughness: 0.75 }), x + (x > 0 ? -0.02 : 0.02), 1.3, z);
    const glass = box(group, 0.06, 1.5, w * 0.72, std('#c8d8dc', { roughness: 0.15, emissive: '#7f99a4', emissiveIntensity: 0.5 }), x + (x > 0 ? -0.12 : 0.12), 1.4, z, false);
    glass.castShadow = false;
    const label = makeSign(text, '#22282c', '#e8ddb0', w * 0.7, 0.4, neon);
    label.position.set(x + (x > 0 ? -0.16 : 0.16), 2.6, z);
    label.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(label);
  };

  shop(8, 6, 5, '#4a3a32', 'CAFÉ', true);
  shop(8, -8, 4, '#3a4a3e', 'ÉPICERIE', false);
  shop(-8, -14, 4.4, '#3d3a4a', 'HÔTEL', true);
  shop(-8, 10, 4.6, '#4a4034', 'TABAC', false);

  group.add(car('206', 6.2, 12, 0, '#8a8a80'));
  group.add(car('clio1', 6.1, -6, 0, '#7d3a32'));
  group.add(car('saxo', -6.2, 2, Math.PI, '#3a4a55'));
  group.add(car('taxi', 6.2, -18, 0));
  group.add(car('clio2', -6.1, -20, Math.PI, '#2e3a48'));

  group.add(lampPost(5.8, 9, { withLight: true }));
  group.add(lampPost(-5.8, -2, { withLight: true }));
  group.add(lampPost(5.8, -13, { withLight: true }));
  const streetLight = new PointLight(new Color('#ffb168'), 90, 20, 2);
  streetLight.position.set(5.2, 4.2, -2);
  group.add(streetLight);
  const fill = new PointLight(new Color('#9fb4cc'), 32, 18, 2);
  fill.position.set(1.2, 3.4, 3.6);
  group.add(fill);
  const crossLight = new PointLight(new Color('#ffc98e'), 40, 14, 2);
  crossLight.position.set(2.4, 3.4, -1.2);
  group.add(crossLight);

  plane(group, 1.5, 2.1, posterMaterial({
    title: 'MANIF',
    subtitle: 'TOUS DANS LA RUE\n25 NOVEMBRE',
    bg: '#7a2e28',
    fg: '#f0e6cf',
    accent: '#dfb257'
  }), 7.9, 2.4, 1.2, 0, -Math.PI / 2);
  plane(group, 1.1, 1.6, posterMaterial({
    title: 'VHS',
    subtitle: 'LOCATION\n10 F',
    bg: '#243a24',
    fg: '#dfe8c8',
    footer: 'VIDÉO CLUB'
  }), -7.9, 2.2, 4.5, 0, Math.PI / 2);

  group.add(graffiti(7.95, -2.8, 3.6, 1.6, -Math.PI / 2, 22));
  group.add(graffiti(-7.95, 15, 3.0, 1.4, Math.PI / 2, 27));

  const kiosk = new Group();
  box(kiosk, 1.6, 2.3, 1.2, std('#3f4a3e', { roughness: 0.8 }), 0, 1.15, 0);
  box(kiosk, 1.9, 0.14, 1.5, std('#2b332b', { roughness: 0.8 }), 0, 2.35, 0);
  kiosk.position.set(-4.6, 0, 16);
  group.add(kiosk);

  for (let i = 0; i < 12; i += 1) {
    group.add(puddle(-5 + (i % 4) * 3.2, -16 + i * 2.7, 0.8 + (i % 3) * 0.5, i));
  }

  const rain = rainCurtain(22, 11, 0.22);
  rain.group.position.set(0, 0, 7.5);
  group.add(rain.group);
  const rain2 = rainCurtain(18, 9, 0.15);
  rain2.group.position.set(0, 0, 18);
  group.add(rain2.group);
  updaters.push((t) => {
    rain.update(t);
    rain2.update(t + 2.3);
  });

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

export function buildMetroEntrance(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number) => void> = [];
  nightAtmosphere(group, '#1a212c', '#33404c');

  group.add(streetBase(13, 44, { road: '#262a30', sidewalk: '#464641', wet: true }));

  group.add(facade({
    x: 10,
    z: -4,
    length: 24,
    height: 15,
    depth: 6,
    front: 'x-',
    color: '#40444a',
    rows: 4,
    cols: 4,
    litRatio: 0.18,
    seed: 801
  }));
  group.add(facade({
    x: -10,
    z: 8,
    length: 22,
    height: 13,
    depth: 6,
    front: 'x+',
    color: '#45464a',
    rows: 4,
    cols: 4,
    litRatio: 0.2,
    seed: 802
  }));

  group.add(metroEntrance(-2.4, -4.6, 0.35));
  const metroLight = new PointLight(new Color('#d6e0a8'), 30, 12, 2);
  metroLight.position.set(-1.6, 2.6, -3.2);
  group.add(metroLight);

  const hospital = new Group();
  box(hospital, 16, 9, 1.2, std('#7e8488', { roughness: 0.9 }), 0, 4.5, 0);
  box(hospital, 4.4, 3.2, 0.5, std('#2f4a52', { roughness: 0.3, emissive: '#9fc4cc', emissiveIntensity: 0.35 }), 0, 1.6, 0.7, false);
  box(hospital, 5.2, 0.3, 1.8, std('#5b6266', { roughness: 0.8 }), 0, 3.4, 1.2);
  const hospSign = makeSign('HÔPITAL SAINT-LOUIS', '#2c3a40', '#e8efe8', 5.2, 0.75);
  hospSign.position.set(0, 4.4, 0.66);
  hospital.add(hospSign);
  for (let i = 0; i < 6; i += 1) {
    box(hospital, 1.1, 1.4, 0.1, std('#c8d8d4', { roughness: 0.2, emissive: '#9db8b8', emissiveIntensity: 0.5 }), -5.5 + i * 2.2, 6.2, 0.67, false);
  }
  const hospLight = new PointLight(new Color('#cfe4e0'), 45, 18, 2);
  hospLight.position.set(0, 3.1, 2.2);
  hospital.add(hospLight);
  hospital.position.set(0, 0, 9.6);
  hospital.rotation.y = Math.PI;
  group.add(hospital);

  group.add(lampPost(4.6, 2, { withLight: true }));
  group.add(lampPost(-5.2, 5.4, { withLight: true }));
  group.add(car('taxi', 6.4, -6, 0));
  group.add(car('clio2', -6.4, 0, Math.PI, '#3a4450'));
  group.add(trashBin(4.8, -8));

  plane(group, 1.3, 1.9, posterMaterial({
    title: 'MÉTRO',
    subtitle: 'LIGNE 2\nNATION',
    bg: '#2e4a3c',
    fg: '#eae4cc',
    accent: '#c9b06a'
  }), 7.9, 2.3, -1.5, 0, -Math.PI / 2);

  for (let i = 0; i < 10; i += 1) {
    group.add(puddle(-4.6 + (i % 3) * 3.4, -8 + i * 2.9, 0.8 + (i % 2) * 0.5, i));
  }

  const rain = rainCurtain(20, 10, 0.24);
  rain.group.position.set(0, 0, 6.2);
  group.add(rain.group);
  updaters.push((t) => rain.update(t));

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
