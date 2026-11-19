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
  // planks with alternating tone and dark seams
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = (y / 32) % 2 ? 'rgba(190,150,110,.07)' : 'rgba(20,12,8,.08)';
    ctx.fillRect(0, y, 256, 32);
    ctx.fillStyle = '#2b1d16';
    ctx.fillRect(0, y, 256, 2);
    // grain lines with a slow wave
    for (let g = 4; g < 32; g += 4) {
      ctx.strokeStyle = `rgba(${30 + Math.random() * 22},${18 + Math.random() * 14},${10 + Math.random() * 9},${0.18 + Math.random() * 0.22})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const yy = y + g + Math.sin(x * 0.035 + g * 0.7 + y) * 1.6;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // occasional knot
    if (Math.random() < 0.35) {
      const kx = 40 + Math.random() * 180, ky = y + 12 + Math.random() * 10;
      ctx.strokeStyle = 'rgba(28,16,10,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(kx, ky, 7, 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  grain(ctx, 256, 2200, 0.035);
  return texture(c, repeat, repeat);
}

export function wallTexture(repeat = 2): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#b9b1a2'; ctx.fillRect(0, 0, 256, 256);
  // soft plaster blotches
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = 8 + Math.random() * 28;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,250,235,.07)' : 'rgba(90,78,66,.06)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  grain(ctx, 256, 6000, 0.045);
  // faint vertical seams
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = 'rgba(110,96,84,.06)';
    ctx.fillRect(i * 52 + 8, 0, 1, 256);
  }
  return texture(c, repeat, repeat);
}

export function carpetTexture(repeat = 4): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#5a4a45'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26000; i++) {
    const g = 70 + Math.random() * 60;
    ctx.fillStyle = `rgba(${g},${g * 0.82},${g * 0.78},0.16)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  // woven diamond pattern
  ctx.strokeStyle = 'rgba(210,180,140,.08)';
  ctx.lineWidth = 1;
  for (let i = -256; i < 256; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 256); ctx.stroke();
  }
  return texture(c, repeat, repeat);
}

export function tileTexture(repeat = 4): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#8d9a9c'; ctx.fillRect(0, 0, 256, 256);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const shade = 135 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade - 12},${shade},${shade + 2})`;
      ctx.fillRect(tx * 64 + 2, ty * 64 + 2, 60, 60);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(tx * 64 + 2, ty * 64 + 2, 60, 3);
    }
  }
  ctx.strokeStyle = '#5c6867'; ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  grain(ctx, 256, 1600, 0.03);
  return texture(c, repeat, repeat);
}

export function fabricTexture(color: string, repeat = 2): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
  // woven threads
  for (let i = 0; i < 256; i += 3) {
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.fillRect(i, 0, 1, 256);
    ctx.fillStyle = 'rgba(0,0,0,.025)';
    ctx.fillRect(0, i, 256, 1);
  }
  grain(ctx, 256, 4000, 0.035);
  return texture(c, repeat, repeat);
}

export function photoTexture(seed: number): THREE.CanvasTexture {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#c9bda6'; ctx.fillRect(0, 0, 128, 128);
  const hue = 20 + seed * 37 % 60;
  const sky = ctx.createLinearGradient(0, 8, 0, 96);
  sky.addColorStop(0, `hsl(${hue},35%,68%)`);
  sky.addColorStop(1, `hsl(${hue + 20},25%,42%)`);
  ctx.fillStyle = sky; ctx.fillRect(8, 8, 112, 88);
  // distant hills and a warm sun
  ctx.fillStyle = 'rgba(255,240,200,.35)';
  ctx.beginPath(); ctx.arc(100, 26, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(50,60,45,.35)';
  ctx.beginPath(); ctx.moveTo(8, 80); ctx.lineTo(40, 50); ctx.lineTo(72, 80); ctx.fill();
  ctx.beginPath(); ctx.moveTo(56, 84); ctx.lineTo(92, 54); ctx.lineTo(120, 84); ctx.fill();
  // family silhouettes with heads, shoulders and a scratched face on one
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 32;
    ctx.fillStyle = `rgba(30,25,25,${0.48 + i * 0.12})`;
    ctx.beginPath(); ctx.arc(x, 52 + (i % 2) * 6, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 11, 62 + (i % 2) * 6, 22, 34);
    ctx.fillStyle = 'rgba(255,230,200,.18)';
    ctx.fillRect(x - 6, 54 + (i % 2) * 6, 5, 2);
  }
  ctx.strokeStyle = 'rgba(240,230,200,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(58, 45); ctx.lineTo(66, 58); ctx.stroke();
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
  // bezel, camera, speaker and three tiny controls
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.164, 0.004), new THREE.MeshStandardMaterial({ color: 0x070b12, roughness: 0.35 }));
  bezel.position.z = 0.007;
  g.add(bezel);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 10), materials.metal);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0.026, 0.069, 0.0095);
  g.add(cam);
  const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.003, 0.002), materials.metal);
  speaker.position.set(0, 0.069, 0.0095);
  g.add(speaker);
  const home = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.002, 12), materials.metal);
  home.rotation.x = Math.PI / 2;
  home.position.set(0, -0.069, 0.0095);
  g.add(home);
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
