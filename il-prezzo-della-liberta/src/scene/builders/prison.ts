import { Group, Mesh, PointLight, Color } from 'three';
import type { BuiltEnvironment, EnvEventLookup } from './kit';
import {
  box,
  bus,
  cylinder,
  facade,
  lampPost,
  makeSign,
  puddle,
  skyDome,
  std,
  streetBase
} from './kit';
import { smoothstep } from '../../utils/math';

export function buildPrison(): BuiltEnvironment {
  const group = new Group();
  const updaters: Array<(t: number, events: EnvEventLookup) => void> = [];

  group.add(skyDome('#6d7684', '#c3c8cc', 300));

  const ground = box(group, 120, 0.1, 120, std('#2c3035', { roughness: 0.34, metalness: 0.12 }), 0, -0.05, 20, false);
  ground.receiveShadow = true;

  const street = streetBase(9, 70, { road: '#2a2d32', sidewalk: '#4a4a48', wet: true });
  street.position.z = 12;
  group.add(street);

  const concrete = std('#6a6d6e', { roughness: 0.95 });
  const concreteDark = std('#565a5c', { roughness: 0.95 });
  box(group, 34, 6.4, 1.4, concrete, -20, 3.2, -2);
  box(group, 34, 6.4, 1.4, concrete, 20, 3.2, -2);
  box(group, 7, 0.5, 1.6, concreteDark, 0, 6.15, -2);
  for (let x = -36; x <= 36; x += 4) {
    box(group, 0.06, 0.5, 0.06, std('#3a3c3e', { roughness: 0.6, metalness: 0.4 }), x, 6.6, -2, false);
  }
  box(group, 80, 0.35, 0.2, std('#3f4245', { roughness: 0.8 }), 0, 6.85, -2, false);

  const gatePivot = new Group();
  gatePivot.position.set(-3, 0, -2);
  group.add(gatePivot);
  const barMat = std('#3a3e42', { roughness: 0.45, metalness: 0.55 });
  for (let i = 0; i < 13; i += 1) {
    cylinder(gatePivot, 0.035, 0.035, 5.6, 5, barMat, 0.18 + i * 0.465, 2.8, 0);
  }
  box(gatePivot, 6, 0.08, 0.08, barMat, 3, 1.2, 0);
  box(gatePivot, 6, 0.08, 0.08, barMat, 3, 4.4, 0);
  box(gatePivot, 0.14, 5.7, 0.14, barMat, 0, 2.85, 0);
  box(gatePivot, 0.14, 5.7, 0.14, barMat, 6, 2.85, 0);

  const booth = new Group();
  box(booth, 2.6, 3.1, 2.2, std('#5f6468', { roughness: 0.9 }), 0, 1.55, 0);
  box(booth, 2.7, 0.18, 2.3, std('#43474b', { roughness: 0.85 }), 0, 3.18, 0);
  const windowMesh = box(booth, 1.7, 1.1, 0.08, std('#d9e4ea', { roughness: 0.15, emissive: '#b7c9d6', emissiveIntensity: 0.55 }), 0, 2.2, 1.12, false);
  windowMesh.castShadow = false;
  const boothLight = new PointLight(new Color('#dfe8f0'), 24, 12, 2);
  boothLight.position.set(0, 2.4, 1.6);
  booth.add(boothLight);
  booth.position.set(-7.6, 0, -0.4);
  group.add(booth);

  const shelter = new Group();
  box(shelter, 3.4, 0.12, 1.4, std('#3f4a52', { roughness: 0.6, metalness: 0.3 }), 0, 2.5, 0);
  box(shelter, 3.4, 1.9, 0.06, std('#8fa3ad', { roughness: 0.2, transparent: true, opacity: 0.25 }), 0, 1.45, -0.66);
  cylinder(shelter, 0.05, 0.05, 2.5, 6, std('#2e3438', { roughness: 0.5, metalness: 0.4 }), -1.6, 1.25, 0.6);
  cylinder(shelter, 0.05, 0.05, 2.5, 6, std('#2e3438', { roughness: 0.5, metalness: 0.4 }), 1.6, 1.25, 0.6);
  const stopSign = makeSign('ARRÊT', '#e7e2d3', '#2d3a44', 0.8, 0.3);
  stopSign.position.set(1.7, 2.2, 0.64);
  shelter.add(stopSign);
  shelter.position.set(8, 0, 13.5);
  group.add(shelter);

  const busGroup = bus(26, 11.4, -Math.PI / 2);
  group.add(busGroup);

  const skyline = new Group();
  for (let i = 0; i < 18; i += 1) {
    const h = 8 + ((i * 7) % 14);
    box(skyline, 8 + (i % 3) * 5, h, 6, std('#5c646e', { roughness: 1 }), -70 + i * 8.5, h / 2 - 2, -62, false);
  }
  group.add(skyline);

  group.add(lampPost(-9, 13, { warm: false }));
  group.add(lampPost(12, 5, { warm: false }));

  for (let i = 0; i < 8; i += 1) {
    group.add(puddle(-8 + i * 3.7, 5 + (i % 4) * 2.6, 0.9 + (i % 3) * 0.4, i));
  }

  for (let i = 0; i < 6; i += 1) {
    group.add(facade({
      x: -24 + i * 9,
      z: -46,
      length: 8,
      height: 14 + (i % 3) * 4,
      depth: 5,
      front: 'z+',
      color: i % 2 === 0 ? '#5a5f66' : '#4d5259',
      rows: 4,
      cols: 3,
      litRatio: 0.15,
      seed: 40 + i,
      baseColor: '#3a3c3e'
    }));
  }

  updaters.push((t, events) => {
    const openAt = events.timeOf('a1_gate_open');
    const closeAt = events.timeOf('a1_gate_close');
    let open = 0;
    if (openAt !== null) open = smoothstep((t - openAt) / 1.5);
    if (closeAt !== null) open *= 1 - smoothstep((t - closeAt) / 1.6);
    gatePivot.rotation.y = -1.28 * open;

    const arriveAt = events.timeOf('a1_bus_arrive');
    const leaveAt = events.timeOf('a1_bus_leave');
    if (arriveAt === null) {
      busGroup.position.x = 26;
    } else if (t < arriveAt + 4.6) {
      const u = smoothstep((t - arriveAt) / 4.6);
      busGroup.position.x = 28 - 22 * u;
    } else if (leaveAt === null || t < leaveAt) {
      busGroup.position.x = 6;
    } else {
      const u = smoothstep((t - leaveAt) / 5.5);
      busGroup.position.x = 6 - 40 * u;
    }
  });

  return {
    group,
    update: (t, events) => {
      for (const update of updaters) update(t, events);
    },
    dispose: () => {
      group.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
        }
      });
    }
  };
}
