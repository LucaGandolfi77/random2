import { Color, Group, Mesh, PointLight } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import { addFluorescent, box, cylinder, makeSign, plane, posterMaterial, std } from './kit';
import { smoothstep } from '../../utils/math';

export function buildHospitalCorridor(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  const floor = std('#9a9d9a', { roughness: 0.5, metalness: 0.05 });
  const wall = std('#d3d8d8', { roughness: 0.9 });
  const wallLow = std('#9aa9ac', { roughness: 0.85 });
  const ceiling = std('#c9cecd', { roughness: 0.95 });

  box(group, 5.2, 0.1, 30, floor, 0, -0.05, 0, false);
  box(group, 0.2, 3.0, 30, wall, -2.6, 1.5, 0);
  box(group, 0.2, 3.0, 30, wall, 2.6, 1.5, 0);
  box(group, 5.2, 0.14, 30, ceiling, 0, 3.0, 0, false);
  box(group, 0.05, 0.95, 30, wallLow, -2.48, 0.5, 0, false);
  box(group, 0.05, 0.95, 30, wallLow, 2.48, 0.5, 0, false);

  for (let z = -13; z <= 13; z += 3) {
    box(group, 0.02, 0.02, 30, std('#b8bdbc', { roughness: 0.9 }), -2.48, 1.0, 0, false);
    box(group, 0.02, 0.02, 30, std('#b8bcbc', { roughness: 0.9 }), 2.48, 1.0, 0, false);
    addFluorescent(group, 0, 2.92, z, 2.2, '#eaf4f6', 0.95);
  }
  const corridorLight = new PointLight(new Color('#dceef2'), 24, 20, 2);
  corridorLight.position.set(0, 2.7, -2);
  group.add(corridorLight);
  const corridorLight2 = new PointLight(new Color('#e2f0f2'), 16, 16, 2);
  corridorLight2.position.set(0, 2.7, 8);
  group.add(corridorLight2);

  const door = (x: number, z: number, rotY: number, label: string): void => {
    box(group, 1.15, 2.2, 0.09, std('#b8c2c2', { roughness: 0.6 }), x, 1.1, z);
    box(group, 0.1, 0.1, 0.05, std('#6e7476', { roughness: 0.5, metalness: 0.4 }), x + 0.42, 1.05, z, false);
    const sign = makeSign(label, '#d8dedc', '#3e565c', 0.5, 0.2);
    sign.position.set(x, 2.15, z);
    sign.rotation.y = rotY;
    group.add(sign);
  };

  for (let z = -11; z <= 11; z += 4) {
    door(-2.52, z, Math.PI / 2, '101');
    door(2.52, z + 2, -Math.PI / 2, '102');
  }

  const reception = new Group();
  box(reception, 2.6, 1.05, 0.9, std('#b8c2c0', { roughness: 0.65 }), 0, 0.52, 0);
  box(reception, 2.8, 0.08, 1.05, std('#dfe6e2', { roughness: 0.4 }), 0, 1.08, 0);
  box(reception, 0.5, 0.4, 0.42, std('#cdd6d2', { roughness: 0.6 }), 0.6, 1.35, 0.1);
  box(reception, 0.38, 0.26, 0.02, std('#37545c', { roughness: 0.3, emissive: '#6d9aa8', emissiveIntensity: 0.35 }), 0.6, 1.35, 0.32, false);
  const sign = makeSign('ACCUEIL', '#c9d6d6', '#3c555c', 1.4, 0.35);
  sign.position.set(0, 2.5, 0.5);
  reception.add(sign);
  reception.position.set(-1.2, 0, -6);
  group.add(reception);

  for (let i = 0; i < 3; i += 1) {
    box(group, 0.55, 0.08, 0.5, std('#6c7880', { roughness: 0.7 }), 1.7, 0.45, -3.4 + i * 0.7);
    box(group, 0.06, 0.45, 0.06, std('#4a545a', { roughness: 0.6 }), 1.5, 0.22, -3.4 + i * 0.7);
    box(group, 0.06, 0.45, 0.06, std('#4a545a', { roughness: 0.6 }), 1.9, 0.22, -3.4 + i * 0.7);
    box(group, 0.55, 0.5, 0.06, std('#6c7880', { roughness: 0.7 }), 1.7, 0.7, -3.1 + i * 0.7);
  }

  plane(group, 1.5, 1.1, posterMaterial({
    title: 'HYGIÈNE',
    subtitle: 'LAVEZ VOS MAINS',
    bg: '#dbe4e2',
    fg: '#3c5a60',
    accent: '#7fa6ac'
  }), -2.48, 1.9, -9, 0, Math.PI / 2);

  plane(group, 1.7, 1.2, posterMaterial({
    title: 'VISITES',
    subtitle: '14H — 20H\nTROISIÈME ÉTAGE',
    bg: '#e3e7e2',
    fg: '#3d4f56',
    footer: 'SAINT-LOUIS'
  }), 2.48, 1.9, -8.5, 0, -Math.PI / 2);

  const endWindow = box(group, 4.2, 1.6, 0.08, std('#d8e8ec', { roughness: 0.15, emissive: '#b8d4dc', emissiveIntensity: 0.5 }), 0, 2.0, -14.9, false);
  endWindow.castShadow = false;
  box(group, 5.2, 2.6, 0.3, std('#bcc6c4', { roughness: 0.9 }), 0, 1.3, -15.1);

  const pole = cylinder(group, 0.02, 0.02, 1.2, 4, std('#87918e', { roughness: 0.5 }), 1.9, 0.6, -1.2);

  const roomDoorPivot = new Group();
  roomDoorPivot.position.set(2.52, 0, 3.2);
  group.add(roomDoorPivot);
  box(roomDoorPivot, 0.09, 2.2, 1.15, std('#aeb9b9', { roughness: 0.6 }), 0, 1.1, 0.575);
  box(group, 0.1, 2.4, 1.35, std('#8e9998', { roughness: 0.8 }), 2.56, 1.2, 3.2);
  const doorSign = makeSign('107', '#d8dedc', '#3e565c', 0.5, 0.2);
  doorSign.position.set(2.5, 2.15, 2.5);
  doorSign.rotation.y = -Math.PI / 2;
  group.add(doorSign);

  updaters.push((t, events) => {
    const openAt = events.timeOf('a5_door_open');
    const open = openAt === null ? 0.55 : smoothstep((t - openAt) / 1.2);
    roomDoorPivot.rotation.y = -open * 1.1;
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

export function buildHospitalRoom(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  const wall = std('#d2d8d7', { roughness: 0.9 });
  const floor = std('#9aa4a2', { roughness: 0.6 });
  box(group, 6.4, 0.12, 8.4, floor, 0, -0.06, 1.4, false);
  box(group, 6.4, 3.2, 0.2, wall, 0, 1.6, -2.6);
  box(group, 0.2, 3.2, 8.4, wall, -3.2, 1.6, 1.4);
  box(group, 0.2, 3.2, 8.4, wall, 3.2, 1.6, 1.4);
  box(group, 6.4, 0.16, 8.4, std('#c2c9c7', { roughness: 0.95 }), 0, 3.2, 1.4, false);
  box(group, 6.4, 1.0, 0.12, std('#aebfbe', { roughness: 0.85 }), 0, 0.5, -2.5);

  const bed = new Group();
  box(bed, 1.3, 0.12, 2.3, std('#5a6468', { roughness: 0.6, metalness: 0.3 }), 0, 0.45, 0);
  box(bed, 1.3, 0.16, 2.3, std('#e3e8e4', { roughness: 0.9 }), 0, 0.56, 0);
  box(bed, 1.3, 0.06, 1.5, std('#a9c0c0', { roughness: 0.95 }), 0, 0.64, 0.35);
  box(bed, 1.35, 0.75, 0.09, std('#7f8a8c', { roughness: 0.7 }), 0, 0.4, -1.18);
  box(bed, 1.35, 0.5, 0.09, std('#7f8a8c', { roughness: 0.7 }), 0, 0.28, 1.18);
  for (const [x, z] of [[-0.55, -0.9], [0.55, -0.9], [-0.55, 0.9], [0.55, 0.9]]) {
    box(bed, 0.07, 0.3, 0.07, std('#4e5a5e', { roughness: 0.5, metalness: 0.4 }), x, 0.15, z);
  }
  const pillow = box(bed, 0.8, 0.13, 0.36, std('#f0f2ed', { roughness: 0.95 }), 0, 0.57, -0.95);
  pillow.rotation.x = -0.08;
  bed.position.set(-0.85, 0, -0.1);
  group.add(bed);

  const iv = new Group();
  cylinder(iv, 0.02, 0.03, 1.9, 5, std('#8a9598', { roughness: 0.4, metalness: 0.4 }), 0, 0.95, 0);
  box(iv, 0.05, 0.05, 0.35, std('#8a9598', { roughness: 0.4, metalness: 0.4 }), 0, 1.88, 0.14);
  const bag = box(iv, 0.16, 0.28, 0.06, std('#cfe0dd', { roughness: 0.4, transparent: true, opacity: 0.65 }), 0, 1.66, 0.3, false);
  bag.castShadow = false;
  iv.position.set(-2.0, 0, -0.2);
  group.add(iv);

  const table = new Group();
  box(table, 0.6, 0.06, 0.5, std('#8f9a98', { roughness: 0.5 }), 0, 0.62, 0);
  cylinder(table, 0.03, 0.03, 0.6, 5, std('#6e7a78', { roughness: 0.5 }), 0, 0.3, 0);
  cylinder(table, 0.06, 0.05, 0.16, 6, std('#b8c8c4', { roughness: 0.4 }), 0.1, 0.73, 0);
  for (let i = 0; i < 3; i += 1) {
    const stem = cylinder(table, 0.008, 0.008, 0.22, 4, std('#5a7050', { roughness: 0.9 }), 0.1 + (i - 1) * 0.03, 0.9, 0, false);
    stem.rotation.z = (i - 1) * 0.2;
  }
  box(table, 0.18, 0.12, 0.05, std('#cfd8d2', { roughness: 0.8 }), -0.15, 0.7, 0.1);
  table.position.set(0.2, 0, -1.2);
  group.add(table);

  const windowFrame = new Group();
  box(windowFrame, 0.1, 2.2, 3.0, std('#c2ccca', { roughness: 0.9 }), 0, 1.6, 0);
  const lightPlane = box(windowFrame, 0.06, 1.8, 2.6, std('#e8e2d0', { roughness: 0.15, emissive: '#f0dcc0', emissiveIntensity: 0.9 }), -0.09, 1.6, 0, false);
  lightPlane.castShadow = false;
  box(windowFrame, 0.05, 1.8, 0.06, std('#b8c2c0', { roughness: 0.8 }), -0.07, 1.6, 0, false);
  box(windowFrame, 0.05, 0.06, 2.6, std('#b8c2c0', { roughness: 0.8 }), -0.07, 1.6, 0, false);
  windowFrame.position.set(3.05, 0, 0.4);
  group.add(windowFrame);

  const chair = new Group();
  box(chair, 0.55, 0.08, 0.55, std('#7f8a8a', { roughness: 0.7 }), 0, 0.45, 0);
  box(chair, 0.55, 0.55, 0.06, std('#7f8a8a', { roughness: 0.7 }), 0, 0.72, -0.28);
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
    box(chair, 0.05, 0.45, 0.05, std('#5a6462', { roughness: 0.6 }), x, 0.22, z);
  }
  chair.position.set(2.5, 0, 3.9);
  chair.rotation.y = -1.1;
  group.add(chair);

  const doorPivot = new Group();
  doorPivot.position.set(2.3, 0, 5.15);
  group.add(doorPivot);
  box(doorPivot, 1.2, 2.3, 0.08, std('#b8c2c0', { roughness: 0.65 }), 0.6, 1.15, 0);
  box(group, 1.5, 2.5, 0.16, std('#9aa4a2', { roughness: 0.8 }), 2.3, 1.25, 5.22);
  box(group, 2.2, 0.1, 1.2, std('#c8cecb', { roughness: 0.9 }), 2.2, 2.7, 4.8);

  const bedMonitor = new Group();
  box(bedMonitor, 0.34, 0.28, 0.24, std('#c9d2ce', { roughness: 0.6 }), 0, 0, 0);
  box(bedMonitor, 0.26, 0.18, 0.02, std('#3e5c58', { roughness: 0.3, emissive: '#6f9a90', emissiveIntensity: 0.4 }), 0, 0.02, 0.13, false);
  bedMonitor.position.set(-1.75, 1.05, -1.2);
  group.add(bedMonitor);
  plane(group, 0.9, 0.7, posterMaterial({
    title: 'SAINT-LOUIS',
    subtitle: 'PARIS · 2000',
    bg: '#d8dedb',
    fg: '#66787c',
    accent: '#9aacae',
    serif: true
  }), -1.9, 2.2, -2.52);
  const windowLight = new PointLight(new Color('#f0e0c8'), 30, 14, 2);
  windowLight.position.set(2.4, 2.2, 0.4);
  group.add(windowLight);
  const roomLight = new PointLight(new Color('#e8f0ee'), 16, 12, 2);
  roomLight.position.set(-0.4, 2.7, 0.6);
  group.add(roomLight);
  addFluorescent(group, 0, 3.1, 0.2, 2.0, '#eef4f0', 0.8);

  const coat = new Group();
  cylinder(coat, 0.03, 0.03, 1.7, 5, std('#5f6a68', { roughness: 0.6 }), 0, 0.85, 0);
  box(coat, 0.06, 0.5, 0.06, std('#5f6a68', { roughness: 0.6 }), 0.1, 1.6, 0);
  coat.position.set(2.7, 0, 4.2);
  group.add(coat);

  updaters.push((t, events) => {
    const openAt = events.timeOf('a5_door_open');
    const open = openAt === null ? 0 : smoothstep((t - openAt) / 1.2);
    doorPivot.rotation.y = -open * 0.9;
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
