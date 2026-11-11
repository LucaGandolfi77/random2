import { Color, Group, Mesh, PointLight, TorusGeometry } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import {
  bench,
  box,
  car,
  cylinder,
  lampPost,
  makeSign,
  plane,
  posterMaterial,
  puddle,
  skyDome,
  std,
  streetBase,
  trashBin
} from './kit';

export function buildLaundrette(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  group.add(skyDome('#e7c3b2', '#f0dccb', 220));

  group.add(streetBase(10, 38, { road: '#3a3b3d', sidewalk: '#5d5a53', wet: true }));

  const wall = std('#b8a58c', { roughness: 0.95 });
  box(group, 2.0, 4.0, 0.3, wall, -5.0, 2.0, -3.05);
  box(group, 2.4, 4.0, 0.3, wall, 4.8, 2.0, -3.05);
  box(group, 7.8, 1.25, 0.3, wall, -0.6, 3.37, -3.05);
  box(group, 7.8, 0.28, 0.32, std('#8a7a66', { roughness: 0.95 }), -0.6, 0.14, -3.05);
  box(group, 12, 8.0, 6, std('#a89a86', { roughness: 0.95 }), 0, 6.0, -6.0);
  box(group, 0.3, 12, 6, std('#9c8f7d', { roughness: 0.95 }), -6.0, 6.0, -6.0);
  box(group, 0.3, 12, 6, std('#9c8f7d', { roughness: 0.95 }), 6.0, 6.0, -6.0);
  box(group, 7.6, 0.1, 1.9, std('#6d675d', { roughness: 0.55 }), -0.6, 0.03, -3.95, false);
  box(group, 7.6, 2.3, 0.2, std('#776f63', { roughness: 0.95 }), -0.6, 1.15, -4.95);
  box(group, 0.2, 2.4, 2.0, std('#736b5f', { roughness: 0.95 }), -4.4, 1.2, -3.95);
  box(group, 0.2, 2.4, 2.0, std('#736b5f', { roughness: 0.95 }), 3.2, 1.2, -3.95);
  box(group, 7.6, 0.1, 2.0, std('#8a847a', { roughness: 0.8 }), -0.6, 2.55, -3.95, false);

  box(group, 11.6, 0.14, 4.4, std('#6d675d', { roughness: 0.55 }), 0, 0.07, -5.1);
  box(group, 11.6, 2.8, 0.2, std('#6f6a60', { roughness: 0.9 }), 0, 1.4, -7.3);
  for (let i = 0; i < 6; i += 1) {
    box(group, 11.4, 0.02, 0.7, std(i % 2 === 0 ? '#716b60' : '#797267', { roughness: 0.7 }), 0, 0.16, -4.9 - i * 0.7, false);
  }

  const glass = box(group, 7.6, 2.3, 0.06, std('#bcd4d4', { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.26 }), -0.6, 1.5, -2.9, false);
  glass.castShadow = false;
  box(group, 0.12, 2.4, 0.16, std('#4a4a46', { roughness: 0.6 }), -4.45, 1.5, -2.9, false);
  box(group, 0.12, 2.4, 0.16, std('#4a4a46', { roughness: 0.6 }), 3.25, 1.5, -2.9, false);
  box(group, 8.0, 0.12, 0.16, std('#4a4a46', { roughness: 0.6 }), -0.6, 2.68, -2.9, false);

  const machineMat = std('#dcdcd4', { roughness: 0.45, metalness: 0.2 });
  const drumMat = std('#8f9694', { roughness: 0.4, metalness: 0.5 });
  const drums: Mesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const mx = -3.6 + i * 1.35;
    box(group, 1.1, 1.3, 0.9, machineMat, mx, 0.85, -3.55);
    const ring = new Mesh(new TorusGeometry(0.3, 0.045, 4, 12), std('#3a3f3f', { roughness: 0.4, metalness: 0.5 }));
    ring.position.set(mx, 0.95, -3.09);
    group.add(ring);
    const disc = new Mesh(new TorusGeometry(0.24, 0.02, 4, 10), drumMat);
    disc.position.set(mx, 0.95, -3.08);
    group.add(disc);
    const inner = new Mesh(new TorusGeometry(0.17, 0.05, 4, 8), std('#4a5452', { roughness: 0.35, metalness: 0.4 }));
    inner.position.set(mx, 0.95, -3.07);
    group.add(inner);
    drums.push(inner);
    const panel = box(group, 1.0, 0.18, 0.02, std('#c8ccc4', { roughness: 0.5 }), mx, 1.42, -3.09, false);
    panel.castShadow = false;
    box(group, 0.1, 0.1, 0.02, std('#4a8a6a', { roughness: 0.5, emissive: '#4a8a6a', emissiveIntensity: 0.5 }), mx + 0.36, 1.42, -3.08, false);
  }

  const interiorLight = new PointLight(new Color('#e8f2da'), 34, 14, 2);
  interiorLight.position.set(-0.6, 2.2, -4.0);
  group.add(interiorLight);
  box(group, 7.4, 0.08, 0.4, std('#f0f4e4', { roughness: 0.4, emissive: '#e8f2d0', emissiveIntensity: 1.2 }), -0.6, 2.72, -3.6, false);

  const neon = makeSign('LAVERIE', '#141a16', '#d9f0a8', 3.2, 0.8, true);
  neon.position.set(-0.6, 3.25, -2.86);
  group.add(neon);
  const neonLight = new PointLight(new Color('#cfe89a'), 22, 11, 2);
  neonLight.position.set(-0.6, 3.1, -2.2);
  group.add(neonLight);

  group.add(bench(0, 0.2, 0, 2.8));
  for (let i = 0; i < 2; i += 1) {
    const chair = new Group();
    box(chair, 0.48, 0.06, 0.48, std('#7f8a86', { roughness: 0.7 }), 0, 0.45, 0);
    box(chair, 0.48, 0.5, 0.05, std('#7f8a86', { roughness: 0.7 }), 0, 0.7, -0.24);
    box(chair, 0.05, 0.45, 0.05, std('#5a6460', { roughness: 0.6 }), -0.2, 0.22, 0.2);
    box(chair, 0.05, 0.45, 0.05, std('#5a6460', { roughness: 0.6 }), 0.2, 0.22, 0.2);
    chair.position.set(-3.4 + i * 1.1, 0, 1.5);
    group.add(chair);
  }
  for (let i = 0; i < 3; i += 1) {
    box(group, 0.3, 0.34, 0.22, std(['#4a6a8a', '#8a5a48', '#5a7a4a'][i], { roughness: 0.8 }), -3.9 + i * 0.45, 0.17, -2.6);
  }
  plane(group, 1.0, 1.4, posterMaterial({
    title: 'LAVER',
    subtitle: 'MODE D\'EMPLOI\nPROGRAMME 40°',
    bg: '#d9ddcc',
    fg: '#3f4a3e',
    accent: '#8a9a78'
  }), 3.15, 1.9, -2.95, 0, 0);

  const cup = (x: number, z: number): void => {
    cylinder(group, 0.045, 0.035, 0.09, 6, std('#e8e3d6', { roughness: 0.7 }), x, 0.52, z, false);
    cylinder(group, 0.04, 0.04, 0.005, 6, std('#46301f', { roughness: 0.9 }), x, 0.565, z, false);
  };
  cup(-0.2, 0.22);
  cup(0.55, 0.22);

  const doorPivot = new Group();
  doorPivot.position.set(2.55, 0, -2.88);
  group.add(doorPivot);
  box(doorPivot, 1.1, 2.35, 0.07, std('#5a4634', { roughness: 0.85 }), 0.55, 1.18, 0);
  box(doorPivot, 0.04, 1.5, 0.08, std('#b8ccce', { roughness: 0.12, metalness: 0.4 }), 0.55, 1.45, 0.05, false);
  box(group, 1.3, 2.5, 0.16, std('#7a6650', { roughness: 0.9 }), 2.55, 1.25, -2.82);

  const sign = makeSign('LAVERIE AUTOMATIQUE', '#2a3428', '#e4ecd0', 3.6, 0.42);
  sign.position.set(4.0, 3.3, -2.86);
  group.add(sign);

  group.add(car('clio2', 5.6, 6, 0, '#3f4a52'));
  group.add(trashBin(-5.2, 1.6));
  group.add(lampPost(4.8, 8.5, { warm: false }));

  plane(group, 1.1, 1.6, posterMaterial({
    title: 'CYBER',
    subtitle: 'CAFÉ\n3 F / 10 MIN',
    bg: '#26384a',
    fg: '#d8e4e0',
    footer: 'OUVERT 24H'
  }), -4.2, 2.3, -2.85);

  for (let i = 0; i < 9; i += 1) {
    group.add(puddle(-4 + (i % 3) * 3.1, 1 + i * 2.2, 0.6 + (i % 3) * 0.4, i));
  }

  updaters.push((t) => {
    drums.forEach((drum, i) => {
      drum.rotation.z = t * (0.5 + i * 0.08) + i;
    });
    const flicker = 0.92 + Math.sin(t * 9.7) * 0.04 + Math.sin(t * 23.1) * 0.03;
    interiorLight.intensity = 22 * flicker;
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
