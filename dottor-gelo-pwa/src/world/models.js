import * as THREE from 'three';
import { C, floorMat, glass, glow, mat, wallMat } from './materials.js';

const G = (geo, material, x = 0, y = 0, z = 0, opts = {}) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  return m;
};

export function box(w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
  return G(new THREE.BoxGeometry(w, h, d), material, x, y, z, opts);
}

export function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0, opts = {}) {
  return G(new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z, opts);
}

export function sphere(r, material, x = 0, y = 0, z = 0, w = 8, h = 6, opts = {}) {
  return G(new THREE.SphereGeometry(r, w, h), material, x, y, z, opts);
}

export function ico(r, material, x = 0, y = 0, z = 0, detail = 0, opts = {}) {
  return G(new THREE.IcosahedronGeometry(r, detail), material, x, y, z, opts);
}

export function octa(r, material, x = 0, y = 0, z = 0, opts = {}) {
  return G(new THREE.OctahedronGeometry(r, 0), material, x, y, z, opts);
}

export function cone(r, h, seg, material, x = 0, y = 0, z = 0, opts = {}) {
  return G(new THREE.ConeGeometry(r, h, seg), material, x, y, z, opts);
}

export function ring(radius, tube, material, x = 0, y = 0, z = 0, opts = {}) {
  const m = G(new THREE.TorusGeometry(radius, tube, 6, 18), material, x, y, z, opts);
  m.rotation.x = Math.PI / 2;
  return m;
}

function group(x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

function iconSprite(icon, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8, 12, 17, 0.82)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 108, 108, 28);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = '700 62px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ecf7f7';
  ctx.fillText(icon, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(0.38, 0.38, 1);
  sprite.position.set(0.68, 1.04, -0.58);
  sprite.renderOrder = 3;
  return sprite;
}

function initRoomData(g, area, stage) {
  g.userData.kind = 'room';
  g.userData.areaId = area.id;
  g.userData.stage = stage;
  g.userData.spinners = [];
  g.userData.pulsers = [];
  g.userData.steam = [];
  g.userData.bubbles = [];
  g.userData.petals = [];
  g.userData.arms = [];
  g.userData.area = area;
  return g;
}

function baseShell(g, area, stage) {
  const accent = area.accent;
  g.add(box(1.84, 0.16, 1.44, floorMat(C.concrete), 0, -0.08, 0));
  g.add(box(1.84, 0.78, 0.09, wallMat(C.steelDark), 0, 0.39, -0.7));
  g.add(box(0.08, 0.44, 1.44, wallMat(C.steel), -0.9, 0.22, 0));
  g.add(box(0.08, 0.44, 1.44, wallMat(C.steel), 0.9, 0.22, 0));
  g.add(box(1.84, 0.035, 0.06, glow(accent, 0.85), 0, 0.025, 0.71));
  g.add(box(1.6, 0.025, 0.025, mat(C.steelLight), 0, 0.012, -0.04));

  for (let i = -3; i <= 3; i++) {
    g.add(box(0.012, 0.008, 1.28, mat(C.steelDark), i * 0.24, 0.006, 0.02, { cast: false }));
  }
  for (let i = -2; i <= 2; i++) {
    g.add(box(1.66, 0.008, 0.012, mat(C.steelDark), 0, 0.006, i * 0.24, { cast: false }));
  }

  g.add(box(0.04, 0.7, 0.04, mat(C.steelLight), -0.78, 0.4, -0.65, { cast: false }));
  g.add(box(0.04, 0.7, 0.04, mat(C.steelLight), 0.78, 0.4, -0.65, { cast: false }));

  const pipeMat = mat(C.steelLight, { metalness: 0.55, roughness: 0.42 });
  g.add(cyl(0.026, 0.026, 1.5, 6, pipeMat, 0.02, 0.82, -0.64).rotateZ(Math.PI / 2));
  if (stage >= 2) g.add(cyl(0.02, 0.02, 1.2, 6, pipeMat, -0.5, 0.66, -0.64).rotateZ(Math.PI / 2));
  if (stage >= 3) {
    g.add(cyl(0.018, 0.018, 0.82, 6, pipeMat, 0.67, 0.42, -0.64));
    g.add(box(0.22, 0.015, 0.02, glow(accent, 0.7), 0.57, 0.72, -0.64));
  }
  if (stage >= 4) {
    g.add(box(0.16, 0.1, 0.05, glow(accent, 1.5), -0.64, 0.62, -0.62));
    g.add(box(0.16, 0.1, 0.05, glow(accent, 1.5), -0.64, 0.48, -0.62));
  }
  if (stage >= 5) {
    g.add(box(0.08, 0.52, 0.08, mat(C.gold, { metalness: 0.7 }), 0.8, 0.78, -0.6));
    g.add(octa(0.09, glow(accent, 2.2), 0.8, 1.08, -0.6));
  }
  g.add(iconSprite(area.icon, accent));
  return g;
}

function animPulse(g, mesh, base = 0.9, amp = 0.2, speed = 1.6) {
  g.userData.pulsers.push({ mesh, base, amp, speed });
}
function animSpin(g, mesh, speed = 0.5) {
  g.userData.spinners.push({ mesh, speed });
}
function animArm(g, pivot, speed = 0.6, range = 0.4) {
  g.userData.arms.push({ pivot, speed, range });
}
function steam(g, x, y, z) {
  g.userData.steam.push(new THREE.Vector3(x, y, z));
}

function reactor(g, area, stage) {
  const coreMat = glow(C.cyanHot, 2.4);
  const ringMat = mat(C.steelLight, { metalness: 0.7, roughness: 0.3 });
  const body = cyl(0.32, 0.38, 0.92, 8, mat(C.steel, { metalness: 0.5 }), 0, 0.54, 0);
  g.add(body);
  g.add(ring(0.36, 0.028, ringMat, 0, 0.28, 0));
  g.add(ring(0.31, 0.022, ringMat, 0, 0.7, 0));
  const core = ico(0.19, coreMat, 0, 0.54, 0);
  g.add(core);
  animPulse(g, core, 0.85, 0.3, 2.2);
  animSpin(g, core, 0.6);
  g.add(cyl(0.12, 0.16, 0.26, 8, mat(C.steelDark), 0, 1.16, 0));
  g.add(sphere(0.07, glow(C.cyan, 1.8), 0, 1.3, 0));
  if (stage >= 2) {
    for (const x of [-0.68, 0.68]) {
      g.add(cyl(0.15, 0.24, 0.55, 8, mat(C.steelDark), x, 0.31, -0.35));
      g.add(cyl(0.16, 0.17, 0.06, 8, ringMat, x, 0.59, -0.35));
      steam(g, x, 0.64, -0.35);
    }
  }
  if (stage >= 3) {
    g.add(box(0.38, 0.18, 0.25, mat(C.steel), 0.52, 0.15, 0.43));
    g.add(box(0.26, 0.1, 0.02, glow(C.cyan, 1.4), 0.52, 0.19, 0.56));
    for (let i = 0; i < 3; i++) g.add(box(0.04, 0.03, 0.02, glow(C.cyan, 1.2), 0.42 + i * 0.08, 0.11, 0.56));
  }
  if (stage >= 4) {
    g.add(cyl(0.03, 0.03, 0.8, 5, ringMat, -0.72, 0.9, -0.1));
    g.add(cyl(0.03, 0.03, 0.8, 5, ringMat, 0.72, 0.9, -0.1));
    g.add(box(1.44, 0.025, 0.025, glow(C.cyan, 0.8), 0, 1.28, -0.1));
  }
  if (stage >= 5) {
    g.add(ring(0.62, 0.018, glow(C.cyan, 1.4), 0, 0.1, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(box(0.05, 0.2, 0.05, glow(C.cyanHot, 1.6), Math.cos(a) * 0.62, 0.2, Math.sin(a) * 0.62));
    }
  }
  steam(g, 0, 0.8, 0);
}

function foundry(g, area, stage) {
  const hot = glow(C.amberHot, 1.7);
  g.add(box(0.58, 0.55, 0.5, mat(C.rust, { metalness: 0.4 }), -0.38, 0.3, -0.26));
  g.add(box(0.34, 0.22, 0.03, hot, -0.38, 0.3, 0.01));
  animPulse(g, g.children[g.children.length - 1], 0.8, 0.45, 2.8);
  g.add(box(1.18, 0.05, 0.24, mat(C.steelDark), 0.1, 0.16, 0.3));
  for (let i = 0; i < 7; i++) {
    const r = cyl(0.035, 0.035, 0.23, 6, mat(C.steelLight), -0.45 + i * 0.15, 0.2, 0.3);
    r.rotation.x = Math.PI / 2;
    g.add(r);
    animSpin(g, r, 1.8);
  }
  const base = cyl(0.09, 0.12, 0.18, 8, mat(C.steel), 0.45, 0.2, -0.2);
  g.add(base);
  const shoulder = box(0.08, 0.52, 0.08, mat(C.rustLight, { metalness: 0.6 }), 0.45, 0.52, -0.2);
  g.add(shoulder);
  const forearm = box(0.06, 0.42, 0.06, mat(C.steelLight), 0.45, 0.78, 0.0);
  forearm.rotation.x = 0.7;
  g.add(forearm);
  const armPivot = group(0.45, 0.76, -0.2);
  armPivot.add(forearm);
  g.add(armPivot);
  animArm(g, armPivot, 0.8, 0.35);
  g.add(box(0.5, 0.07, 0.35, mat(C.steelDark), -0.35, 0.16, 0.42));
  if (stage >= 2) {
    for (let i = 0; i < 2; i++) {
      const vat = cyl(0.13, 0.16, 0.3, 8, mat(C.rust, { metalness: 0.45 }), 0.6 + i * 0.2, 0.2, 0.4);
      g.add(vat);
      g.add(cyl(0.13, 0.13, 0.04, 8, glow(C.amberHot, 1.1), 0.6 + i * 0.2, 0.37, 0.4));
      steam(g, 0.6 + i * 0.2, 0.42, 0.4);
    }
  }
  if (stage >= 3) {
    g.add(box(0.06, 0.65, 0.06, mat(C.steelLight), -0.78, 0.52, -0.2));
    g.add(box(0.5, 0.06, 0.06, mat(C.steelLight), -0.56, 0.82, -0.2));
    g.add(cyl(0.01, 0.01, 0.38, 4, mat(C.steelLight), -0.32, 0.62, -0.2));
    g.add(box(0.1, 0.08, 0.1, mat(C.amber, { metalness: 0.6 }), -0.32, 0.42, -0.2));
  }
  if (stage >= 4) {
    g.add(box(1.2, 0.03, 0.03, glow(C.amber, 1.1), 0, 0.86, -0.63));
    for (let i = 0; i < 3; i++) g.add(box(0.04, 0.12, 0.03, glow(C.amber, 1.2), -0.4 + i * 0.4, 0.8, -0.63));
  }
  if (stage >= 5) {
    g.add(ring(0.42, 0.02, glow(C.amber, 1.4), 0.1, 0.1, 0.28));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(box(0.03, 0.13, 0.03, glow(C.amberHot, 1.6), 0.1 + Math.cos(a) * 0.42, 0.13, 0.28 + Math.sin(a) * 0.42));
    }
  }
  steam(g, -0.38, 0.62, -0.26);
}

function circuits(g, area, stage) {
  const cyan = glow(C.violetHot, 1.5);
  const screen = glow(C.violet, 1.1);
  const racks = stage >= 4 ? 5 : stage >= 2 ? 4 : 3;
  for (let i = 0; i < racks; i++) {
    const x = -0.62 + (i / Math.max(1, racks - 1)) * 1.24;
    g.add(box(0.18, 0.62, 0.3, mat(C.steelDark), x, 0.34, -0.4));
    g.add(box(0.2, 0.03, 0.33, mat(C.steelLight), x, 0.66, -0.4));
    for (let k = 0; k < 3; k++) g.add(box(0.11, 0.02, 0.02, screen, x, 0.22 + k * 0.12, -0.24));
  }
  const holo = group(0.08, 0.48, 0.3);
  const orb = octa(0.13, cyan, 0, 0, 0);
  holo.add(orb);
  const r1 = ring(0.28, 0.01, cyan, 0, 0, 0);
  r1.rotation.x = Math.PI / 2;
  const r2 = ring(0.36, 0.008, screen, 0, 0.02, 0);
  r2.rotation.z = Math.PI / 2.5;
  holo.add(r1, r2);
  g.add(holo);
  animSpin(g, holo, 0.55);
  animPulse(g, orb, 0.8, 0.25, 3.1);
  g.add(box(0.55, 0.03, 0.28, glow(C.violet, 0.55), 0.08, 0.17, 0.3));
  if (stage >= 2) {
    g.add(box(0.08, 0.5, 0.08, mat(C.steelLight), -0.78, 0.5, 0.4));
    g.add(box(0.3, 0.18, 0.02, screen, -0.6, 0.55, 0.42));
  }
  if (stage >= 3) {
    g.add(box(0.02, 0.9, 0.02, glow(C.cyan, 0.8), -0.72, 0.58, -0.55));
    g.add(box(0.02, 0.7, 0.02, glow(C.violet, 0.8), 0.72, 0.48, -0.55));
  }
  if (stage >= 4) {
    g.add(ring(0.5, 0.012, glow(C.violetHot, 0.8), 0.08, 0.08, 0.3));
  }
  if (stage >= 5) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const shard = octa(0.06, cyan, 0.08 + Math.cos(a) * 0.45, 0.5 + (i % 2) * 0.12, 0.3 + Math.sin(a) * 0.45);
      g.add(shard);
      animSpin(g, shard, 0.9 + i * 0.1);
    }
  }
}

function incubator(g, area, stage) {
  const pods = Math.min(5, 2 + Math.floor(stage / 2));
  const podMat = glass(C.glass, 0.24);
  const liquid = glass(C.green, 0.2);
  for (let i = 0; i < pods; i++) {
    const x = -0.62 + (i / Math.max(1, pods - 1)) * 1.22;
    g.add(cyl(0.15, 0.18, 0.16, 8, mat(C.steelDark), x, 0.1, 0));
    g.add(cyl(0.13, 0.13, 0.62, 10, podMat, x, 0.48, 0, { cast: false }));
    g.add(cyl(0.105, 0.105, 0.44, 10, liquid, x, 0.44, 0, { cast: false }));
    g.add(cyl(0.14, 0.15, 0.05, 8, mat(C.steelLight), x, 0.8, 0));
    const baby = createAndroid({ body: '#8fc8b8', accent: C.greenHot, glow: C.greenHot, scale: 0.28 });
    baby.position.set(x, 0.23, 0);
    baby.rotation.y = Math.PI;
    g.add(baby);
    g.userData.bubbles.push({ mesh: baby, x, base: 0.23, phase: i * 1.7 });
    for (let k = 0; k < 3; k++) {
      const b = sphere(0.015, glow(C.greenHot, 1.1), x + (Math.random() - 0.5) * 0.12, 0.35 + k * 0.12, (Math.random() - 0.5) * 0.12, 6, 4);
      g.add(b);
      g.userData.bubbles.push({ mesh: b, x, base: b.position.y, phase: Math.random() * 6 });
    }
    for (let k = 0; k < 2; k++) {
      g.add(box(0.03, 0.03, 0.14, mat(C.steelLight), x - 0.1 + k * 0.2, 0.45, 0.17));
    }
    steam(g, x, 0.82, 0);
  }
  g.add(box(1.25, 0.03, 0.18, mat(C.steelLight), 0, 0.02, 0.52));
  if (stage >= 3) {
    g.add(cyl(0.06, 0.06, 0.7, 6, mat(C.steel), -0.78, 0.42, -0.45));
    g.add(cyl(0.06, 0.06, 0.7, 6, mat(C.steel), 0.78, 0.42, -0.45));
    g.add(box(1.4, 0.025, 0.025, glow(C.green, 0.8), 0, 0.8, -0.45));
  }
  if (stage >= 4) {
    g.add(box(0.36, 0.18, 0.02, glow(C.greenHot, 1.1), 0.55, 0.55, -0.62));
    g.add(box(0.28, 0.12, 0.03, mat(C.steelDark), 0.55, 0.55, -0.64));
  }
  if (stage >= 5) {
    g.add(ring(0.55, 0.015, glow(C.green, 1.1), 0, 0.08, 0.04));
  }
}

function training(g, area, stage) {
  g.add(box(1.05, 0.03, 0.62, mat(C.rust, { roughness: 0.95 }), 0, 0.015, 0.22));
  g.add(box(0.95, 0.012, 0.52, mat(C.blood, { roughness: 1 }), 0, 0.035, 0.22));
  const dummy = createAndroid({ body: '#8d6e63', accent: C.amber, glow: C.amberHot, scale: 0.62 });
  dummy.position.set(-0.28, 0.03, 0.22);
  dummy.rotation.y = Math.PI * 0.2;
  g.add(dummy);
  g.userData.dummy = dummy;
  g.add(box(0.8, 0.5, 0.04, glow(C.amber, 0.45), 0, 0.55, -0.64));
  g.add(box(0.7, 0.07, 0.03, glow(C.amberHot, 1.2), 0, 0.55, -0.61));
  const target = ring(0.22, 0.015, glow(C.amber, 1.1), 0.58, 0.62, -0.62);
  g.add(target);
  animSpin(g, target, 0.4);
  if (stage >= 2) {
    g.add(box(0.18, 0.18, 0.18, mat(C.steelDark), 0.6, 0.1, 0.35));
    g.add(box(0.2, 0.03, 0.2, mat(C.steelLight), 0.6, 0.2, 0.35));
    steam(g, 0.6, 0.24, 0.35);
  }
  if (stage >= 3) {
    const cone1 = cone(0.24, 0.5, 6, glass(C.amber, 0.12), 0.58, 0.28, 0.2);
    g.add(cone1);
    g.add(box(0.02, 0.5, 0.02, glow(C.amber, 0.9), 0.45, 0.3, 0.2));
  }
  if (stage >= 4) {
    for (let i = 0; i < 3; i++) {
      const h = 0.22 + i * 0.08;
      g.add(cyl(0.1, 0.1, h, 6, mat(C.steel), -0.68, 0.1 + h / 2, -0.25));
    }
    g.add(box(0.02, 0.8, 0.02, glow(C.amber, 1.2), -0.35, 0.44, 0.55));
  }
  if (stage >= 5) {
    const ring2 = ring(0.45, 0.012, glow(C.amberHot, 1.3), 0.56, 0.58, -0.6);
    g.add(ring2);
    animSpin(g, ring2, -0.55);
  }
}

function infirmary(g, area, stage) {
  for (let i = 0; i < 2; i++) {
    const z = -0.28 + i * 0.55;
    g.add(box(0.62, 0.12, 0.26, mat(C.steelLight, { roughness: 0.5 }), -0.2, 0.18, z));
    g.add(box(0.58, 0.04, 0.23, glass(C.cyan, 0.22), -0.2, 0.25, z));
    g.add(cyl(0.025, 0.025, 0.7, 5, mat(C.steel), -0.5, 0.35, z));
    g.add(box(0.02, 0.02, 0.42, glow(C.cyan, 1.2), -0.5, 0.7, z));
    g.add(sphere(0.055, glow(C.green, 1.4), -0.5, 0.7, z));
  }
  g.add(cyl(0.19, 0.22, 0.48, 8, glass(C.green, 0.2), 0.55, 0.33, -0.35, { cast: false }));
  g.add(cyl(0.16, 0.16, 0.35, 8, glass(C.greenHot, 0.22), 0.55, 0.3, -0.35, { cast: false }));
  g.add(box(0.26, 0.3, 0.03, glow(C.green, 1.3), 0.55, 0.35, -0.16));
  if (stage >= 2) {
    g.add(box(0.5, 0.4, 0.04, glow(C.cyan, 0.5), 0.45, 0.55, -0.64));
    g.add(box(0.4, 0.06, 0.02, glow(C.cyanHot, 1.2), 0.45, 0.55, -0.6));
  }
  if (stage >= 3) {
    g.add(cyl(0.1, 0.12, 0.22, 8, mat(C.steelDark), -0.75, 0.16, 0.45));
    steam(g, -0.75, 0.3, 0.45);
  }
  if (stage >= 4) {
    g.add(ring(0.3, 0.012, glow(C.green, 0.9), 0.55, 0.1, -0.35));
  }
  if (stage >= 5) {
    g.add(box(1.3, 0.03, 0.03, glow(C.cyan, 0.7), 0, 0.82, -0.25));
  }
}

function garden(g, area, stage) {
  const trunkMat = mat('#5b4a3f', { roughness: 0.8, metalness: 0.3 });
  const tree = group(-0.25, 0.08, -0.22);
  tree.add(cyl(0.07, 0.12, 0.58, 6, trunkMat, 0, 0.29, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const b = box(0.05, 0.32, 0.05, trunkMat, Math.cos(a) * 0.13, 0.58, Math.sin(a) * 0.13);
    b.rotation.z = Math.cos(a) * 0.6;
    b.rotation.x = Math.sin(a) * 0.6;
    tree.add(b);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = 0.2 + Math.random() * 0.22;
    const petal = octa(0.035, glow(C.pink, 1.2), Math.cos(a) * r, 0.62 + Math.random() * 0.28, Math.sin(a) * r);
    tree.add(petal);
    g.userData.petals.push({ mesh: petal, base: petal.position.y, phase: Math.random() * 6, x: petal.position.x, z: petal.position.z });
  }
  g.add(tree);
  g.add(box(0.4, 0.04, 0.14, mat(C.steelDark), 0.5, 0.12, 0.38));
  g.add(box(0.05, 0.12, 0.14, mat(C.steelLight), 0.68, 0.1, 0.38));
  g.add(box(0.05, 0.12, 0.14, mat(C.steelLight), 0.32, 0.1, 0.38));
  const stone = box(0.2, 0.12, 0.08, mat(C.steelLight), 0.52, 0.16, -0.45);
  g.add(stone);
  g.add(box(0.13, 0.02, 0.01, glow(C.pink, 1.1), 0.52, 0.18, -0.405));
  if (stage >= 2) {
    g.add(cyl(0.015, 0.015, 0.72, 4, mat(C.steelLight), -0.75, 0.4, 0.5));
    g.add(sphere(0.05, glow(C.pinkHot, 1.6), -0.75, 0.8, 0.5));
  }
  if (stage >= 3) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const flower = sphere(0.045, glow(C.pink, 1.2), Math.cos(a) * 0.5, 0.08, 0.2 + Math.sin(a) * 0.32);
      g.add(flower);
    }
  }
  if (stage >= 4) {
    g.add(box(0.03, 0.55, 0.03, glow(C.pink, 0.9), 0.76, 0.4, -0.6));
    g.add(box(0.14, 0.03, 0.03, glow(C.pinkHot, 1.3), 0.7, 0.65, -0.6));
  }
  if (stage >= 5) {
    g.add(ring(0.58, 0.012, glow(C.pink, 0.8), -0.25, 0.06, -0.22));
  }
}

function arena(g, area, stage) {
  const platform = cyl(0.72, 0.78, 0.1, 8, mat(C.concreteDark), 0, 0.05, 0.05);
  g.add(platform);
  g.add(ring(0.74, 0.025, glow(C.amber, 1.1), 0, 0.11, 0.05));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(box(0.05, 0.18, 0.05, glow(C.amber, 1.2), Math.cos(a) * 0.78, 0.18, 0.05 + Math.sin(a) * 0.78));
  }
  for (let i = 0; i < 2; i++) {
    g.add(cyl(0.02, 0.02, 1.1, 5, mat(C.steelLight), -0.7 + i * 1.4, 0.55, -0.58));
    g.add(box(0.22, 0.1, 0.1, glow(C.amber, 1.4), -0.7 + i * 1.4, 1.1, -0.58));
  }
  g.add(box(0.8, 0.35, 0.03, glow(C.amber, 0.45), 0, 0.55, -0.7));
  if (stage >= 2) {
    g.add(box(0.4, 0.04, 0.7, mat(C.steelDark), 0, 0.12, 0.05));
    g.add(box(0.03, 0.3, 0.7, glow(C.amberHot, 0.9), 0.2, 0.2, 0.05));
  }
  if (stage >= 3) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      g.add(cone(0.05, 0.2, 4, glow(C.amber, 1.2), Math.cos(a) * 0.52, 0.13, 0.05 + Math.sin(a) * 0.52));
    }
  }
  if (stage >= 4) {
    g.add(ring(0.55, 0.012, glow(C.amberHot, 1.2), 0, 0.12, 0.05));
  }
  if (stage >= 5) {
    g.add(cyl(0.04, 0.04, 0.9, 5, mat(C.gold, { metalness: 0.8 }), 0.82, 0.45, 0.6));
    g.add(octa(0.1, glow(C.amberHot, 2), 0.82, 0.95, 0.6));
  }
}

function memory(g, area, stage) {
  g.add(box(0.36, 0.1, 0.32, mat(C.steelDark), 0, 0.13, 0.1));
  g.add(box(0.36, 0.5, 0.08, mat(C.steel), 0, 0.38, -0.04));
  g.add(box(0.3, 0.04, 0.26, glow(C.blue, 0.55), 0, 0.19, 0.1));
  g.add(cyl(0.02, 0.02, 0.7, 5, mat(C.steelLight), -0.28, 0.35, 0.2));
  g.add(cyl(0.02, 0.02, 0.7, 5, mat(C.steelLight), 0.28, 0.35, 0.2));
  const orb = ico(0.1, glow(C.blueHot, 1.8), 0, 0.78, 0.1);
  g.add(orb);
  animPulse(g, orb, 0.85, 0.2, 1.4);
  animSpin(g, orb, 0.3);
  for (let i = 0; i < 3 + stage; i++) {
    const a = (i / (3 + stage)) * Math.PI * 2;
    const shard = octa(0.04, glow(C.blueHot, 1.5), Math.cos(a) * 0.45, 0.35 + (i % 3) * 0.16, 0.1 + Math.sin(a) * 0.45);
    g.add(shard);
    g.userData.spinners.push({ mesh: shard, speed: 0.25 + i * 0.04, orbit: { cx: 0, cz: 0.1, r: 0.45, phase: a } });
  }
  g.add(box(0.7, 0.4, 0.03, glow(C.blue, 0.35), 0, 0.55, -0.65));
  g.add(box(0.6, 0.05, 0.02, glow(C.blueHot, 1.2), 0, 0.55, -0.62));
  if (stage >= 2) {
    g.add(ring(0.36, 0.008, glow(C.blue, 0.9), 0, 0.56, 0.1));
  }
  if (stage >= 3) {
    g.add(cyl(0.06, 0.08, 0.24, 8, mat(C.steelDark), 0.62, 0.12, -0.4));
    g.add(cyl(0.04, 0.04, 0.4, 6, glow(C.blue, 0.9), 0.62, 0.45, -0.4));
  }
  if (stage >= 4) {
    g.add(ring(0.62, 0.01, glow(C.blueHot, 1.1), 0, 0.06, 0.1));
  }
  if (stage >= 5) {
    g.add(box(0.02, 0.8, 0.02, glow(C.blueHot, 1.3), -0.6, 0.45, 0.5));
    g.add(box(0.02, 0.8, 0.02, glow(C.blueHot, 1.3), 0.6, 0.45, 0.5));
  }
}

function hq(g, area, stage) {
  g.add(box(0.5, 0.06, 0.5, mat(C.steelDark), 0.5, 0.03, -0.15));
  g.add(box(0.38, 0.55, 0.38, glass(C.cyan, 0.22), 0.5, 0.34, -0.15, { cast: false }));
  g.add(box(0.4, 0.03, 0.4, mat(C.steelLight), 0.5, 0.62, -0.15));
  g.add(cyl(0.014, 0.014, 0.82, 4, glow(C.cyan, 0.9), 0.5, 0.84, -0.15));
  g.add(box(0.6, 0.12, 0.4, mat(C.steel), -0.2, 0.15, 0.28));
  g.add(box(0.5, 0.025, 0.3, glow(C.cyan, 0.55), -0.2, 0.23, 0.28));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.07, 0.02, 0.02, glow(C.cyanHot, 1.2), -0.38 + i * 0.18, 0.24, 0.16));
  }
  g.add(box(0.5, 0.35, 0.04, glow(C.cyan, 0.35), -0.45, 0.5, -0.65));
  g.add(box(0.4, 0.05, 0.02, glow(C.cyanHot, 1.1), -0.45, 0.5, -0.62));
  if (stage >= 2) {
    g.add(box(0.4, 0.04, 0.5, mat(C.steelLight), -0.45, 0.12, 0.2));
    g.add(box(0.02, 0.3, 0.02, mat(C.steelLight), -0.6, 0.28, 0.2));
  }
  if (stage >= 3) {
    g.add(box(0.8, 0.03, 0.03, glow(C.cyan, 0.8), 0, 0.8, -0.45));
  }
  if (stage >= 4) {
    g.add(ring(0.3, 0.01, glow(C.cyan, 0.8), 0.5, 0.06, -0.15));
  }
  if (stage >= 5) {
    g.add(cyl(0.04, 0.04, 0.6, 5, mat(C.gold, { metalness: 0.7 }), -0.82, 0.3, 0.5));
    g.add(octa(0.07, glow(C.cyanHot, 1.8), -0.82, 0.64, 0.5));
  }
}

const BUILDERS = {
  reactor,
  foundry,
  circuits,
  incubator,
  training,
  infirmary,
  garden,
  arena,
  memory,
  hq,
};

export function createRoom(area, stage) {
  const g = initRoomData(new THREE.Group(), area, stage);
  g.position.set(area.pos.x, 0, area.pos.z);
  baseShell(g, area, stage);
  (BUILDERS[area.id] || hq)(g, area, stage);
  // A soft accent light makes a room legible, but ten point lights on a
  // mobile shader is a tax with no visual return. Six coloured rooms carry
  // the lighting; the others rely on emissive strips and the key light.
  if (['reactor', 'foundry', 'circuits', 'incubator', 'garden', 'memory'].includes(area.id)) {
    const light = new THREE.PointLight(area.accent, 1.7, 2.8, 2);
    light.position.set(0, 0.9, 0.15);
    g.add(light);
  }
  return g;
}

export function updateRoom(g, dt, t) {
  for (const s of g.userData.spinners || []) {
    if (!s.mesh) continue;
    if (s.orbit) {
      const o = s.orbit;
      s.orbit.phase += dt * s.speed;
      s.mesh.position.x = o.cx + Math.cos(o.phase) * o.r;
      s.mesh.position.z = o.cz + Math.sin(o.phase) * o.r;
    } else {
      s.mesh.rotation.y += dt * s.speed;
      s.mesh.rotation.x += dt * s.speed * 0.35;
    }
  }
  for (const p of g.userData.pulsers || []) {
    if (!p.mesh) continue;
    const v = p.base + Math.sin(t * p.speed + p.mesh.id) * p.amp;
    p.mesh.scale.setScalar(Math.max(0.2, v));
  }
  for (const arm of g.userData.arms || []) {
    if (!arm.pivot) continue;
    arm.pivot.rotation.z = Math.sin(t * arm.speed) * arm.range;
    arm.pivot.rotation.x = Math.cos(t * arm.speed * 0.7) * arm.range * 0.5;
  }
  for (const b of g.userData.bubbles || []) {
    if (!b.mesh) continue;
    b.mesh.position.y = b.base + Math.sin(t * 1.4 + b.phase) * 0.02;
  }
  for (const p of g.userData.petals || []) {
    if (!p.mesh) continue;
    p.mesh.position.y = p.base - ((t * 0.03 + p.phase) % 0.55);
    p.mesh.position.x = p.x + Math.sin(t * 0.5 + p.phase) * 0.02;
  }
  if (g.userData.dummy?.userData?.parts) {
    const { armL, armR, head } = g.userData.dummy.userData.parts;
    armL.rotation.x = Math.sin(t * 2.1) * 0.5;
    armR.rotation.x = Math.sin(t * 2.1 + 1.7) * 0.5;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
  }
}

const SKIN = ['#d7a57e', '#b98157', '#8a5b3b', '#6a462f'];

export function createAndroid({ body = '#7c8b90', accent = C.cyan, glow: glowColor = C.cyanHot, scale = 1, variant = 'standard' } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(body, { roughness: 0.55, metalness: 0.38 });
  const accentMat = glow(accent, 1.1);
  const coreMat = glow(glowColor, 2.2);
  const dark = mat(C.steelDark, { metalness: 0.55 });

  const torsoW = variant === 'tank' ? 0.34 : variant === 'slim' ? 0.22 : 0.28;
  const torsoH = variant === 'tall' ? 0.42 : 0.36;
  const torso = box(torsoW, torsoH, 0.18, bodyMat, 0, 0.62, 0);
  g.add(torso);
  const chest = box(torsoW * 0.62, 0.08, 0.02, accentMat, 0, 0.64, 0.1);
  g.add(chest);
  const core = ico(0.045, coreMat, 0, 0.62, 0.115);
  g.add(core);
  const head = new THREE.Group();
  head.position.set(0, 0.94, 0);
  head.add(box(variant === 'tank' ? 0.2 : 0.18, 0.18, 0.18, bodyMat, 0, 0, 0));
  head.add(box(0.13, 0.035, 0.02, accentMat, 0, 0.01, 0.095));
  head.add(box(0.18, 0.025, 0.02, dark, 0, 0.09, 0.085));
  g.add(head);

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-torsoW / 2 - 0.04, 0.78, 0);
  armR.position.set(torsoW / 2 + 0.04, 0.78, 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]]) {
    arm.add(box(0.09, 0.34, 0.09, bodyMat, 0, -0.15, 0));
    arm.add(box(0.07, 0.1, 0.07, dark, 0, -0.34, 0));
    arm.add(box(0.06, 0.02, 0.06, accentMat, 0, -0.24, 0));
    arm.rotation.z = side * 0.08;
    g.add(arm);
  }
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.08, 0.42, 0);
  legR.position.set(0.08, 0.42, 0);
  for (const leg of [legL, legR]) {
    leg.add(box(0.11, 0.36, 0.12, bodyMat, 0, -0.18, 0));
    leg.add(box(0.12, 0.08, 0.16, dark, 0, -0.38, 0.02));
    leg.add(box(0.06, 0.02, 0.06, accentMat, 0, -0.06, 0.07));
    g.add(leg);
  }
  g.scale.setScalar(scale);
  g.userData.parts = { torso, head, armL, armR, legL, legR, core };
  g.userData.phase = Math.random() * Math.PI * 2;
  g.userData.kind = 'android';
  g.userData.variant = variant;
  return g;
}

export function animateAndroid(g, dt, t, mode = 'idle') {
  const p = g.userData.parts;
  if (!p) return;
  const phase = g.userData.phase || 0;
  if (mode === 'walk') {
    const s = Math.sin(t * 4 + phase);
    p.legL.rotation.x = s * 0.5;
    p.legR.rotation.x = -s * 0.5;
    p.armL.rotation.x = -s * 0.4;
    p.armR.rotation.x = s * 0.4;
  } else if (mode === 'fight') {
    p.armL.rotation.x = -0.9 + Math.sin(t * 5 + phase) * 0.5;
    p.armR.rotation.x = -0.7 + Math.cos(t * 5.4 + phase) * 0.55;
    p.torso.rotation.y = Math.sin(t * 2 + phase) * 0.15;
    p.head.rotation.y = Math.sin(t * 1.7 + phase) * 0.2;
  } else if (mode === 'sit') {
    p.legL.rotation.x = -1.1;
    p.legR.rotation.x = -1.1;
    p.armL.rotation.x = -0.3;
    p.armR.rotation.x = -0.3;
    p.head.rotation.x = 0.12;
  } else {
    p.torso.position.y = 0.62 + Math.sin(t * 1.4 + phase) * 0.006;
    p.head.rotation.y = Math.sin(t * 0.55 + phase) * 0.16;
    p.armL.rotation.x = Math.sin(t * 0.9 + phase) * 0.08;
    p.armR.rotation.x = Math.sin(t * 0.9 + phase + 1) * 0.08;
  }
}

export function createGero({ seated = false } = {}) {
  const g = new THREE.Group();
  const coat = mat(C.white, { roughness: 0.9, metalness: 0.02 });
  const skin = mat('#c99777', { roughness: 0.95 });
  const dark = mat(C.steelDark);
  const glassMat = mat('#a9c7d2', { transparent: true, opacity: 0.5, metalness: 0.6 });
  const body = box(0.3, 0.42, 0.2, coat, 0, 0.65, 0);
  g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.99, 0);
  head.add(box(0.2, 0.2, 0.19, skin, 0, 0, 0));
  head.add(box(0.21, 0.06, 0.2, mat('#dfe7e7'), 0, 0.11, 0));
  head.add(box(0.12, 0.025, 0.02, skin, 0, -0.06, 0.1));
  head.add(box(0.05, 0.02, 0.02, mat('#f2f2f2'), 0, -0.06, 0.115));
  head.add(box(0.07, 0.045, 0.02, glassMat, -0.045, 0.03, 0.095));
  head.add(box(0.07, 0.045, 0.02, glassMat, 0.045, 0.03, 0.095));
  g.add(head);
  const armL = box(0.09, 0.38, 0.09, coat, -0.2, 0.66, 0);
  const armR = box(0.09, 0.38, 0.09, coat, 0.2, 0.66, 0);
  g.add(armL, armR);
  if (seated) {
    g.add(box(0.34, 0.12, 0.26, dark, 0, 0.3, 0.05));
    g.add(box(0.36, 0.36, 0.08, dark, 0, 0.48, -0.12));
  } else {
    g.add(box(0.1, 0.42, 0.1, dark, -0.08, 0.21, 0));
    g.add(box(0.1, 0.42, 0.1, dark, 0.08, 0.21, 0));
    const cane = cyl(0.012, 0.012, 0.82, 5, mat(C.steelLight), 0.3, 0.4, 0.12);
    g.add(cane);
    g.add(ring(0.06, 0.012, mat(C.steelLight), 0.3, 0.8, 0.12));
  }
  g.userData.parts = { head, armL, armR };
  return g;
}

function hairSpikes(head, color, count = 6, length = 0.16) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const c = cone(0.035, length, 4, mat(color), Math.cos(a) * 0.075, 0.13, Math.sin(a) * 0.06);
    c.rotation.z = Math.cos(a) * 0.7;
    c.rotation.x = Math.sin(a) * 0.7;
    head.add(c);
  }
}

export function createHero(kind = 'Goku') {
  const k = String(kind || '').toLowerCase();
  if (k.includes('omega') || k.includes('cell')) return createCell(k.includes('omega') ? 'omega' : 'cell');
  let body = '#e07b3c';
  let accent = C.amber;
  let skin = '#d7a57e';
  let hair = '#15181c';
  let variant = 'standard';
  if (k.includes('vegeta')) {
    body = '#2f4f9a';
    accent = '#e7eef0';
    hair = '#15181c';
  } else if (k.includes('piccolo')) {
    body = '#5a3a7a';
    accent = C.green;
    skin = '#7eb05f';
    hair = '#1b2b1b';
  } else if (k.includes('gohan')) {
    body = '#6d4d9a';
    accent = C.amber;
  } else if (k.includes('crilin') || k.includes('krillin')) {
    body = '#e07b3c';
    accent = C.amber;
    variant = 'tank';
  } else if (k.includes('trunks')) {
    body = '#6e7d8f';
    accent = C.violet;
    hair = '#b58bc8';
  } else if (k.includes('goku')) {
    body = '#f28a3d';
    accent = C.blue;
  }
  const g = createAndroid({ body, accent, glow: accent, scale: 1, variant });
  const head = g.userData.parts.head;
  const hairMat = mat(hair);
  if (k.includes('crilin') || k.includes('krillin')) {
    head.add(box(0.02, 0.02, 0.02, mat('#c78e6d'), -0.05, 0.05, 0.1));
    head.add(box(0.02, 0.02, 0.02, mat('#c78e6d'), 0.05, 0.05, 0.1));
  } else if (k.includes('piccolo')) {
    head.add(cyl(0.05, 0.09, 0.12, 6, mat(C.white), 0, 0.15, 0));
    head.add(box(0.22, 0.26, 0.04, mat(C.white), 0, 0.0, -0.13));
    head.add(cone(0.025, 0.12, 4, mat(C.green), -0.08, 0.08, 0));
    head.add(cone(0.025, 0.12, 4, mat(C.green), 0.08, 0.08, 0));
  } else {
    head.add(box(0.19, 0.06, 0.19, hairMat, 0, 0.11, -0.01));
    hairSpikes(head, hair, k.includes('goku') || k.includes('vegeta') ? 8 : 5, k.includes('goku') ? 0.2 : 0.14);
  }
  if (k.includes('vegeta')) {
    g.add(box(0.3, 0.12, 0.08, mat(C.steelLight, { metalness: 0.6 }), 0, 0.76, 0.09));
  }
  return g;
}

export function createCell(kind = 'cell') {
  const g = new THREE.Group();
  const green = kind === 'omega' ? '#7d2f38' : '#6b9b52';
  const dark = mat(kind === 'omega' ? '#2a1318' : '#24301f');
  const bodyMat = mat(green, { roughness: 0.55, metalness: 0.25 });
  const accent = glow(kind === 'omega' ? C.amberHot : C.greenHot, 1.2);
  const torso = box(0.38, 0.46, 0.26, bodyMat, 0, 0.66, 0);
  g.add(torso);
  g.add(ico(0.08, accent, 0, 0.7, 0.14));
  const head = new THREE.Group();
  head.position.set(0, 1.02, 0);
  head.add(box(0.24, 0.2, 0.22, bodyMat, 0, 0, 0));
  head.add(box(0.14, 0.035, 0.02, accent, 0, 0.02, 0.115));
  head.add(cone(0.04, 0.16, 4, dark, -0.08, 0.15, 0));
  head.add(cone(0.04, 0.16, 4, dark, 0.08, 0.15, 0));
  g.add(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.24, 0.8, 0);
    arm.add(box(0.1, 0.34, 0.1, bodyMat, 0, -0.16, 0));
    arm.add(cone(0.04, 0.13, 4, accent, 0, -0.38, 0));
    arm.rotation.z = side * 0.18;
    g.add(arm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.1, 0.44, 0);
    leg.add(box(0.12, 0.4, 0.12, bodyMat, 0, -0.2, 0));
    leg.add(box(0.14, 0.08, 0.18, dark, 0, -0.41, 0.02));
    g.add(leg);
    const wing = box(0.04, 0.36, 0.18, dark, side * 0.22, 0.65, -0.16);
    wing.rotation.z = side * 0.35;
    g.add(wing);
  }
  const tail = box(0.08, 0.08, 0.5, bodyMat, 0, 0.36, 0.32);
  tail.rotation.x = 0.8;
  g.add(tail);
  if (kind === 'omega') {
    g.add(ring(0.32, 0.018, glow(C.amberHot, 1.5), 0, 0.06, 0));
    g.add(octa(0.08, glow(C.amberHot, 2), 0, 1.24, 0));
  }
  g.userData.kind = 'cell';
  g.userData.parts = { head, torso };
  return g;
}

export function createEcoOrb() {
  const g = new THREE.Group();
  const core = ico(0.1, glow(C.pinkHot, 2.5), 0, 0, 0);
  g.add(core);
  const r = ring(0.18, 0.012, glow(C.pink, 1.4), 0, 0, 0);
  g.add(r);
  const light = new THREE.PointLight(C.pink, 1.4, 1.8, 2);
  g.add(light);
  g.userData.core = core;
  g.userData.ring = r;
  g.userData.kind = 'eco';
  return g;
}
