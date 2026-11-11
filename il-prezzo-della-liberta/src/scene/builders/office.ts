import { Color, CylinderGeometry, Group, Mesh, PointLight } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import { addFluorescent, box, cylinder, makeSign, plane, posterMaterial, std } from './kit';

export function buildOffice(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  const wall = std('#b9b8b0', { roughness: 0.95 });
  const wall2 = std('#a8a9a2', { roughness: 0.95 });
  const floor = std('#77766f', { roughness: 0.8 });

  box(group, 9.5, 0.12, 9, floor, 0, -0.06, 0.8, false);
  box(group, 9.5, 3.4, 0.2, wall, 0, 1.7, -3.2);
  box(group, 0.2, 3.4, 9, wall2, -4.7, 1.7, 0.8);
  box(group, 0.2, 3.4, 9, wall2, 4.7, 1.7, 0.8);
  box(group, 9.5, 0.16, 9, std('#9a9a92', { roughness: 0.95 }), 0, 3.3, 0.8, false);
  box(group, 9.5, 0.5, 0.1, std('#5d6670', { roughness: 0.8 }), 0, 0.25, -3.08);

  box(group, 6, 1.05, 0.85, std('#6d6a61', { roughness: 0.7 }), 0, 0.52, -0.4);
  box(group, 6.2, 0.08, 1.0, std('#85827a', { roughness: 0.55 }), 0, 1.08, -0.4);
  box(group, 6.2, 1.2, 0.06, std('#b8c8cc', { roughness: 0.15, transparent: true, opacity: 0.25 }), 0, 1.75, -0.75, false);

  addFluorescent(group, -1.8, 3.22, -1.4, 2.4);
  addFluorescent(group, 1.8, 3.22, -1.4, 2.4);
  addFluorescent(group, 0, 3.22, 2.6, 2.4);
  const cold = new PointLight(new Color('#e8f2f6'), 10, 10, 2);
  cold.position.set(0, 2.9, 0.6);
  group.add(cold);

  box(group, 0.55, 0.48, 0.42, std('#d3cbae', { roughness: 0.8 }), 1.2, 1.36, -0.4);
  box(group, 0.4, 0.3, 0.02, std('#2c3a2c', { roughness: 0.3, emissive: '#4d7a54', emissiveIntensity: 0.5 }), 1.2, 1.36, -0.18, false);
  box(group, 0.6, 0.05, 0.28, std('#c2baa0', { roughness: 0.85 }), 1.2, 1.12, -0.4);

  for (const x of [-3.2, -1.2, 0.9]) {
    box(group, 0.65, 0.08, 0.6, std('#5b5f63', { roughness: 0.8 }), x, 0.6, 0.55);
    box(group, 0.07, 0.6, 0.07, std('#3c3f42', { roughness: 0.7 }), x - 0.22, 0.3, 0.55);
    box(group, 0.07, 0.6, 0.07, std('#3c3f42', { roughness: 0.7 }), x + 0.22, 0.3, 0.55);
    box(group, 0.65, 0.55, 0.07, std('#5b5f63', { roughness: 0.8 }), x, 0.85, 0.83);
  }

  plane(group, 2.4, 1.2, posterMaterial({
    title: 'FORMATION',
    subtitle: 'RETOUR À L\'EMPLOI\nPOINT D\'ACCUEIL',
    bg: '#3c5566',
    fg: '#e8eef1',
    footer: 'MISSION LOCALE · 2000'
  }), 3.55, 2.2, -3.08);

  plane(group, 1.0, 1.4, posterMaterial({
    title: 'RATP',
    subtitle: 'TICKET\n10,00 F',
    bg: '#e2ddce',
    fg: '#2f4b66',
    accent: '#7a9db8'
  }), -4.4, 2.0, -1.6, 0, Math.PI / 2);

  const notice = plane(group, 1.9, 1.1, posterMaterial({
    title: 'OFFRES',
    subtitle: 'EMPLOI · FORMATION\nINTÉRIM · STAGES',
    bg: '#c9c4b4',
    fg: '#3c444c',
    accent: '#7d8a92'
  }), 0.1, 2.25, -3.06);
  const clock = new Mesh(new CylinderGeometry(0.28, 0.28, 0.08, 14), std('#e6e2d4', { roughness: 0.5 }));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(-2.4, 2.45, -3.04);
  group.add(clock);
  box(group, 0.02, 0.16, 0.02, std('#2a2e30', { roughness: 0.6 }), -2.4, 2.5, -2.98, false);
  box(group, 0.12, 0.02, 0.02, std('#2a2e30', { roughness: 0.6 }), -2.36, 2.45, -2.98, false);
  const windowFrame = box(group, 2.4, 1.5, 0.08, std('#b8ccd2', { roughness: 0.15, emissive: '#a8c2cc', emissiveIntensity: 0.5 }), 2.9, 2.15, -3.06, false);
  windowFrame.castShadow = false;
  for (let i = 0; i < 3; i += 1) {
    box(group, 0.06, 1.6, 0.1, std('#5a6268', { roughness: 0.7 }), 2.1 + i * 0.8, 2.15, -3.05, false);
  }
  const plant = new Group();
  cylinder(plant, 0.14, 0.11, 0.22, 6, std('#8a5a3c', { roughness: 0.8 }), 0, 0.11, 0);
  for (let i = 0; i < 5; i += 1) {
    box(plant, 0.03, 0.35, 0.03, std('#4f6a44', { roughness: 0.9 }), (i - 2) * 0.05, 0.36, 0, false);
  }
  plant.position.set(4.1, 0, 0.2);
  group.add(plant);

  const doorPivot = new Group();
  doorPivot.position.set(-1.4, 0, 4.75);
  group.add(doorPivot);
  box(doorPivot, 1.0, 2.3, 0.08, std('#7c8288', { roughness: 0.7, metalness: 0.2 }), 0.5, 1.15, 0);
  box(group, 1.3, 2.5, 0.16, std('#5d6368', { roughness: 0.8 }), -1.4, 1.25, 4.82);

  box(group, 0.4, 0.3, 0.5, std('#c9c2a9', { roughness: 0.8 }), 0.1, 1.13, -0.31);
  for (let i = 0; i < 4; i += 1) {
    box(group, 0.35, 0.006, 0.28, std('#e7e2d4', { roughness: 0.9 }), 0.1, 1.29 + i * 0.004, -0.31, false);
  }

  updaters.push((t, events) => {
    const doorAt = events.timeOf('a2_office_door');
    if (doorAt !== null) {
      const u = Math.max(0, Math.min(1, (t - doorAt) / 1.2));
      doorPivot.rotation.y = (1 - u) * 1.1;
    } else {
      doorPivot.rotation.y = 0;
    }
    const paperAt = events.timeOf('a2_paper_returned');
    const paperVisible = paperAt === null || t < paperAt;
    group.traverse((obj) => {
      if (obj.userData.paper) obj.visible = paperVisible;
    });
  });

  const paper = box(group, 0.4, 0.008, 0.3, std('#efe9d8', { roughness: 0.9 }), 0.1, 1.13, -0.3, false);
  paper.userData.paper = true;

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
