import * as THREE from 'three';

function canvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function texture(c: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number, alpha = 0.05) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() * 255 | 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

export function woodTexture(repeat = 3): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#5b4031'; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 9) {
    ctx.strokeStyle = `rgba(${20 + Math.random() * 25},${12 + Math.random() * 15},${8 + Math.random() * 10},${0.25 + Math.random() * 0.25})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 2);
    ctx.stroke();
  }
  grain(ctx, 256, 1600, 0.04);
  return texture(c, repeat, repeat);
}

export function wallTexture(repeat = 2): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#b9b1a2'; ctx.fillRect(0, 0, 256, 256);
  grain(ctx, 256, 5000, 0.05);
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = 'rgba(120,110,100,0.05)';
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y); ctx.lineTo(256, y + (Math.random() - 0.5) * 12); ctx.stroke();
  }
  return texture(c, repeat, repeat);
}

export function carpetTexture(repeat = 4): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#5a4a45'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 20000; i++) {
    const g = 70 + Math.random() * 60;
    ctx.fillStyle = `rgba(${g},${g * 0.82},${g * 0.78},0.18)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  return texture(c, repeat, repeat);
}

export function tileTexture(repeat = 4): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#8d9a9c'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#64706f'; ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  grain(ctx, 256, 1200, 0.03);
  return texture(c, repeat, repeat);
}

export function fabricTexture(color: string, repeat = 2): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
  }
  grain(ctx, 256, 3000, 0.04);
  return texture(c, repeat, repeat);
}

export function photoTexture(seed: number): THREE.CanvasTexture {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#c9bda6'; ctx.fillRect(0, 0, 128, 128);
  const hue = 20 + seed * 37 % 60;
  ctx.fillStyle = `hsl(${hue},20%,55%)`; ctx.fillRect(8, 8, 112, 88);
  // abstract family silhouettes
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 32;
    ctx.fillStyle = `rgba(30,25,25,${0.45 + i * 0.12})`;
    ctx.beginPath(); ctx.arc(x, 52 + (i % 2) * 6, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 10, 62 + (i % 2) * 6, 20, 34);
  }
  ctx.fillStyle = '#efe6d3'; ctx.fillRect(0, 100, 128, 28);
  ctx.fillStyle = '#6b6154'; ctx.font = '11px sans-serif';
  ctx.fillText(['SUMMER 1998', 'MOM & DAD', 'EMMA, AGE 9', 'THE OLD HOUSE'][seed % 4], 9, 118);
  grain(ctx, 128, 900, 0.06);
  return texture(c);
}

export interface Materials {
  wall: THREE.MeshStandardMaterial;
  floorWood: THREE.MeshStandardMaterial;
  carpet: THREE.MeshStandardMaterial;
  tile: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  fabricBlue: THREE.MeshStandardMaterial;
  fabricRed: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  bulb: THREE.MeshStandardMaterial;
  shadow: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
}

export function createMaterials(): Materials {
  const std = (opts: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(opts);
  return {
    wall: std({ map: wallTexture(), roughness: 0.96 }),
    floorWood: std({ map: woodTexture(5), roughness: 0.82 }),
    carpet: std({ map: carpetTexture(), roughness: 1 }),
    tile: std({ map: tileTexture(), roughness: 0.55 }),
    darkWood: std({ map: woodTexture(2), color: 0x8a6a52, roughness: 0.7 }),
    fabricBlue: std({ map: fabricTexture('#3d5568'), roughness: 1 }),
    fabricRed: std({ map: fabricTexture('#6b3540'), roughness: 1 }),
    metal: std({ color: 0x9aa5ad, metalness: 0.8, roughness: 0.35 }),
    glass: std({ color: 0x9fc7d8, transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide }),
    plastic: std({ color: 0x22272e, roughness: 0.6, metalness: 0.1 }),
    paper: std({ color: 0xd8d2c2, roughness: 0.95 }),
    screen: std({ color: 0x0a1b26, emissive: 0x1d5f73, emissiveIntensity: 0.7, roughness: 0.25 }),
    bulb: std({ color: 0xffe9c0, emissive: 0xffd9a0, emissiveIntensity: 1.4 }),
    shadow: std({ color: 0x05070c, roughness: 1, metalness: 0, emissive: 0x0a1018, emissiveIntensity: 0.55 }),
    eye: std({ color: 0x330008, emissive: 0xff3048, emissiveIntensity: 3.6 }),
    grass: std({ color: 0x243328, roughness: 1 }),
    concrete: std({ color: 0x4c5258, roughness: 0.95 })
  };
}

/** A phone held in the player's hand, attached to the camera in first person. */
export function createPhoneModel(materials: Materials): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.16, 0.011), materials.plastic);
  g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.074, 0.145), materials.screen.clone());
  screen.position.z = 0.0061;
  g.add(screen);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 10), materials.metal);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0.02, 0.06, 0.007);
  g.add(cam);
  g.userData.screen = screen;
  return g;
}

export function createFlashlightModel(materials: Materials): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.13, 12), materials.metal);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.02, 0.03, 12), materials.plastic);
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.075;
  g.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 16), materials.bulb);
  lens.position.z = -0.091;
  lens.rotation.y = Math.PI;
  g.add(lens);
  return g;
}
