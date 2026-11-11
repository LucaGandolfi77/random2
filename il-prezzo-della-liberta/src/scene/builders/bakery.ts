import { Group, Mesh, PointLight, Color, TorusGeometry, SphereGeometry } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import { box, cylinder, makeSign, plane, posterMaterial, std } from './kit';
import { smoothstep } from '../../utils/math';

export function buildBakery(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  const cream = std('#c9b08c', { roughness: 0.95 });
  const wood = std('#6b4f36', { roughness: 0.9 });
  const woodDark = std('#4a3524', { roughness: 0.92 });
  const tile = std('#8c857a', { roughness: 0.75 });

  box(group, 8.4, 0.12, 8.6, tile, 0, -0.06, 1.2, false);
  box(group, 8.4, 3.6, 0.2, cream, 0, 1.8, -3.1);
  box(group, 0.2, 3.6, 8.6, std('#bfa47f', { roughness: 0.95 }), -4.2, 1.8, 1.2);
  box(group, 0.2, 3.6, 8.6, std('#bfa47f', { roughness: 0.95 }), 4.2, 1.8, 1.2);
  box(group, 8.4, 0.16, 8.6, std('#a99a83', { roughness: 0.95 }), 0, 3.5, 1.2, false);
  box(group, 8.4, 1.1, 0.12, woodDark, 0, 0.55, -3.02);

  for (let i = 0; i < 9; i += 1) {
    box(group, 8.3, 0.012, 0.9, std(i % 2 === 0 ? '#8f887c' : '#969084', { roughness: 0.7 }), 0, 0.005, -2.2 + i * 0.9, false);
  }

  box(group, 4.2, 1.0, 0.9, wood, 0, 0.5, -0.15);
  box(group, 4.4, 0.08, 1.05, std('#8a6a48', { roughness: 0.65 }), 0, 1.04, -0.15);
  box(group, 4.2, 0.04, 0.8, std('#b39872', { roughness: 0.8 }), 0, 1.1, -0.15);

  const croissantMat = std('#c78a3e', { roughness: 0.8 });
  for (let i = 0; i < 7; i += 1) {
    const croissant = new Mesh(new TorusGeometry(0.1, 0.045, 4, 6), croissantMat);
    croissant.rotation.x = -Math.PI / 2;
    croissant.position.set(-1.5 + i * 0.5, 1.12, -0.15);
    croissant.castShadow = true;
    group.add(croissant);
  }

  const baguetteMat = std('#b8863f', { roughness: 0.85 });
  for (let i = 0; i < 9; i += 1) {
    const bag = cylinder(group, 0.055, 0.055, 0.72, 5, baguetteMat, 3.65, 1.75 + (i % 3) * 0.12, -2 + i * 0.28);
    bag.rotation.z = 0.35;
    bag.rotation.x = 0.1;
  }
  for (let i = 0; i < 4; i += 1) {
    box(group, 1.5, 0.06, 0.5, woodDark, 3.55, 1.3 + i * 0.5, -2.7);
    const jar = new Mesh(new SphereGeometry(0.12, 5, 4), std(i % 2 === 0 ? '#7a3c2c' : '#8a7a3a', { roughness: 0.6 }));
    jar.position.set(3.55, 1.45 + i * 0.5, -1.7);
    group.add(jar);
  }

  for (const z of [-1.4, 1.4]) {
    const shade = new Mesh(new SphereGeometry(0.22, 6, 4), std('#f2e0b8', { roughness: 0.7, emissive: '#ffd79a', emissiveIntensity: 0.8 }));
    shade.position.set(0.1, 2.75, z);
    group.add(shade);
    box(group, 0.03, 0.6, 0.03, std('#3a3a3a', { roughness: 0.6 }), 0.1, 3.12, z);
    const light = new PointLight(new Color('#ffd19a'), 12, 9, 2);
    light.position.set(0.1, 2.6, z);
    group.add(light);
  }

  box(group, 0.06, 2.2, 2.6, std('#cfdde6', { roughness: 0.15, emissive: '#aec7d6', emissiveIntensity: 1.1 }), 4.08, 2.0, 1.6, false);

  plane(group, 1.5, 1.0, posterMaterial({
    title: 'PAIN',
    subtitle: 'BAGUETTE 4,50 F  ·  CROISSANT 3,80 F  ·  CAFÉ 5,00 F',
    bg: '#2c2a26',
    fg: '#e8ddc5',
    accent: '#b89b6a',
    serif: true
  }), 3.0, 1.85, -2.95);

  plane(group, 0.9, 1.3, posterMaterial({
    title: 'CONCERT',
    subtitle: 'SAMEDI 21H',
    bg: '#6d3b35',
    fg: '#efe4cc',
    footer: 'BELLEVILLE'
  }), -4.05, 2.1, -0.6, 0, Math.PI / 2);

  for (const x of [-1.6, 0, 1.6]) {
    box(group, 0.55, 0.05, 0.4, std('#d8cdb8', { roughness: 0.9 }), x, 1.14, -0.15, false);
  }
  box(group, 0.38, 0.26, 0.32, std('#c8bfa8', { roughness: 0.6 }), 1.78, 1.2, -0.3);
  box(group, 0.3, 0.05, 0.24, std('#8a8478', { roughness: 0.5, metalness: 0.2 }), 1.78, 1.36, -0.3);
  for (let i = 0; i < 5; i += 1) {
    box(group, 0.035, 0.02, 0.035, std('#5a5650', { roughness: 0.6 }), 1.68 + (i % 3) * 0.1, 1.38, -0.37 + Math.floor(i / 3) * 0.12, false);
  }
  for (let i = 0; i < 3; i += 1) {
    box(group, 0.16, 0.22, 0.1, std('#cbbfa6', { roughness: 0.9 }), -1.85, 1.19, -0.25 + i * 0.16);
  }

  const doorPivot = new Group();
  doorPivot.position.set(2.55, 0, 5.32);
  group.add(doorPivot);
  box(doorPivot, 1.3, 2.5, 0.08, std('#5d4630', { roughness: 0.85 }), 0.65, 1.25, 0);
  box(doorPivot, 0.04, 1.6, 0.09, std('#c9d6db', { roughness: 0.1, metalness: 0.4 }), 0.65, 1.5, 0.05, false);
  box(group, 1.5, 2.7, 0.16, std('#8b7358', { roughness: 0.9 }), 2.55, 1.35, 5.36);

  const sign = makeSign('BOULANGERIE', '#4c3423', '#e9dcc0', 2.0, 0.55);
  sign.position.set(0.1, 3.05, -2.98);
  group.add(sign);

  updaters.push((t, events) => {
    const openAt = events.timeOf('a2_door_open');
    const closeAt = events.timeOf('a2_door_close');
    let open = 0;
    if (openAt !== null) open = smoothstep((t - openAt) / 1.2);
    if (closeAt !== null) open *= 1 - smoothstep((t - closeAt) / 1.2);
    doorPivot.rotation.y = open * 1.25;
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
