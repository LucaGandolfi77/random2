import * as THREE from 'three';
import { ITEMS } from '../../items/itemData';
import type { ItemKind } from '../../core/game-state/types';

function basic(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

function standard(color: number, emissive = 0, metalness = 0.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 0.7 : 0,
    roughness: 0.5,
    metalness,
    flatShading: true,
  });
}

export function createItemMesh(kind: ItemKind): THREE.Group {
  const group = new THREE.Group();
  const definition = ITEMS[kind];
  const accent = basic(definition.color);
  const dark = standard(0x1a1420);
  const light = standard(0xf5f7fa, 0xffffff, 0.1);
  switch (kind) {
    case 'hypeBattery': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.22), standard(0x2a1a08, definition.color));
      group.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), accent);
      cap.position.y = 0.3;
      group.add(cap);
      const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 5), accent);
      bolt.position.set(0.02, 0.03, 0.13);
      group.add(bolt);
      break;
    }
    case 'goldenMic': {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.48, 10), standard(0x33240a, 0xffc300));
      group.add(handle);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), accent);
      ball.position.y = 0.3;
      group.add(ball);
      break;
    }
    case 'speakerDrone': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), standard(0x0c1b22, 0x39f6ff));
      group.add(body);
      for (const side of [-1, 1]) {
        const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.06), accent);
        rotor.position.x = side * 0.24;
        group.add(rotor);
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), accent);
      eye.position.z = 0.17;
      group.add(eye);
      break;
    }
    case 'glitchCapsule': {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.24, 4, 10), standard(0x2a0d3a, 0x9d4edd));
      group.add(body);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16), accent);
      band.rotation.x = Math.PI / 2;
      group.add(band);
      break;
    }
    case 'megaBurger': {
      const bunTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), standard(0xffb703));
      bunTop.position.y = 0.06;
      group.add(bunTop);
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), standard(0x5a2d18));
      group.add(patty);
      const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.08, 12), standard(0xffb703));
      bunBottom.position.y = -0.08;
      group.add(bunBottom);
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.4), basic(0xffd319));
      cheese.position.y = 0.02;
      group.add(cheese);
      break;
    }
    case 'rocketSneakers': {
      for (const side of [-1, 1]) {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.4), standard(0xff2d95, 0xff2d95));
        shoe.position.set(side * 0.12, -0.02, 0);
        group.add(shoe);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), basic(0xffd319));
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(side * 0.12, -0.12, -0.28);
        group.add(flame);
      }
      break;
    }
    case 'commentBomb': {
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), standard(0x191019, 0xff4d3d));
      group.add(body);
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), dark);
      fuse.position.set(0.1, 0.28, 0);
      fuse.rotation.z = -0.4;
      group.add(fuse);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), basic(0xffd319));
      spark.position.set(0.2, 0.38, 0);
      group.add(spark);
      break;
    }
    case 'turboCan': {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), standard(0x0b2230, 0x39f6ff));
      group.add(can);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 12), light);
      top.position.y = 0.26;
      group.add(top);
      const label = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.01), accent);
      label.position.z = 0.18;
      group.add(label);
      break;
    }
  }
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return group;
}

const PROJECTILE_COLORS: Record<string, number> = {
  sound: 0x39f6ff,
  pan: 0xffc857,
  fire: 0xff5d2e,
  spark: 0xffd319,
  speed: 0x5bb8ff,
  sparkle: 0xffd319,
  explosion: 0xff2d3d,
};

export function createProjectileMesh(visual: string): THREE.Group {
  const group = new THREE.Group();
  const color = PROJECTILE_COLORS[visual] ?? 0x39f6ff;
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  if (visual === 'sound') {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 18), material);
    group.add(torus);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), material);
    group.add(inner);
  } else if (visual === 'pan') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.08, 14), material);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), material);
    group.add(glow);
  } else if (visual === 'fire') {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), material);
    group.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), material);
    glow.position.y = -0.3;
    group.add(glow);
  } else {
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), material);
    group.add(sphere);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 18), material);
    group.add(ring);
  }
  return group;
}
