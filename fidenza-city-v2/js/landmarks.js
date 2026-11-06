import * as THREE from 'three';

const STONE = '#d9c7a8';
const STONE_LIGHT = '#e7d8bd';
const STONE_DARK = '#b99a78';
const ROOF = '#9c5f45';
const ROOF_DARK = '#7f4a37';
const WOOD = '#8a6547';
const METAL = '#3c443f';
const GLASS = '#2f4348';

function lam(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.03, ...opts }); }

function box(g, w, h, d, color, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function cyl(g, rt, rb, h, color, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), lam(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function cone(g, r, h, color, x = 0, y = 0, z = 0, seg = 4) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), lam(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

function sphere(g, r, color, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2)), lam(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

function circle(g, r, color, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

function ring(g, r, tube, color, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.y = ry;
  g.add(m);
  return m;
}

export function makeTextSprite(text, {
  bg = 'rgba(244,235,218,.94)',
  color = '#1b241e',
  border = 'rgba(27,36,30,.16)',
  fontSize = 52,
  pad = 26,
  scale = 1
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `600 ${fontSize}px Oswald, sans-serif`;
  ctx.font = font;
  const lines = String(text).split('\n');
  const widths = lines.map(l => ctx.measureText(l).width);
  const textW = Math.max(...widths);
  const lineH = fontSize * 1.08;
  const w = Math.ceil(textW + pad * 2);
  const h = Math.ceil(lines.length * lineH + pad * 1.2);
  canvas.width = w; canvas.height = h;
  ctx.font = font;
  ctx.fillStyle = bg;
  ctx.beginPath();
  const r = Math.min(18, h / 4);
  ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, w / 2, pad * 0.6 + lineH * (i + 0.5)));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const s = scale * 0.011;
  sprite.scale.set(w * s, h * s, 1);
  return sprite;
}

function addSign(group, text, x, y, z, scale = 1) {
  const sp = makeTextSprite(text, { scale });
  sp.position.set(x, y, z);
  group.add(sp);
  return sp;
}

function buildDuomo(g) {
  // navata
  box(g, 46, 14, 24, STONE, 0, 7, 0);
  box(g, 46, 2, 5.5, STONE_LIGHT, 0, 13.2, 11.8);
  box(g, 46, 2, 5.5, STONE_LIGHT, 0, 13.2, -11.8);
  // tetto a falde
  const r1 = box(g, 46, 0.5, 13.6, ROOF, 0, 15.3, 6.2);
  r1.rotation.x = 0.56;
  const r2 = box(g, 46, 0.5, 13.6, ROOF, 0, 15.3, -6.2);
  r2.rotation.x = -0.56;
  // facciata
  box(g, 2.4, 21, 29, STONE_LIGHT, 23, 10.5, 0);
  box(g, 3.0, 1.1, 31, STONE_DARK, 23, 21, 0);
  // lesene e portale
  for (const z of [-11, -5.5, 5.5, 11]) {
    box(g, 0.55, 17, 0.8, STONE_DARK, 24.15, 8.5, z);
  }
  box(g, 0.7, 7.4, 5.8, '#3a2e2a', 24.1, 3.9, 0);
  box(g, 1.0, 0.8, 6.4, STONE_DARK, 24.2, 7.8, 0);
  for (const z of [-2.6, 2.6]) {
    cyl(g, 0.22, 0.26, 7.0, STONE_DARK, 24.4, 3.8, z, 10);
  }
  // arco del portale
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.32, 8, 18, Math.PI), lam(STONE_DARK));
  arch.rotation.y = Math.PI / 2;
  arch.position.set(24.35, 7.8, 0);
  arch.castShadow = true;
  g.add(arch);
  // gradini
  box(g, 7.0, 0.25, 14, STONE_DARK, 26.2, 0.13, 0);
  // rosone con raggi
  circle(g, 2.45, '#2e4c5a', 24.25, 13.4, 0, Math.PI / 2);
  ring(g, 2.65, 0.18, STONE_DARK, 24.3, 13.4, 0, 0, Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.4, 0.12), lam(STONE_DARK));
    bar.position.set(24.32, 13.4, 0);
    bar.rotation.x = i * Math.PI / 4;
    g.add(bar);
  }
  // frontone centrale
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-8, 0); gableShape.lineTo(8, 0); gableShape.lineTo(0, 5.2); gableShape.closePath();
  const gable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), lam(STONE_LIGHT, { side: THREE.DoubleSide }));
  gable.rotation.y = Math.PI / 2;
  gable.position.set(24.22, 21.0, 0);
  g.add(gable);
  box(g, 0.18, 3.2, 0.18, '#5b4a37', 24.3, 27.0, 0);
  box(g, 1.6, 0.18, 0.18, '#5b4a37', 24.3, 27.2, 0);
  // torri
  for (const z of [-11.5, 11.5]) {
    box(g, 5.2, 23, 5.2, STONE, 21, 11.5, z);
    box(g, 3.2, 1.0, 3.2, STONE_DARK, 21, 22.4, z);
    box(g, 1.0, 1.8, 0.2, '#3a2e2a', 24.35, 19.0, z);
    cone(g, 3.9, 5.5, ROOF_DARK, 21, 25.7, z, 4);
  }
  // campanile
  box(g, 6.2, 30, 6.2, STONE, -17, 15, -13);
  box(g, 6.6, 1.0, 6.6, STONE_DARK, -17, 30.2, -13);
  cone(g, 4.5, 7, ROOF_DARK, -17, 34.2, -13, 4);
  for (const [dx, dz] of [[0, 3.2], [0, -3.2], [3.2, 0], [-3.2, 0]]) {
    box(g, 1.4, 4.2, 1.4, '#3a2e2a', -17 + dx, 27.2, -13 + dz);
  }
}

function buildPorta(g) {
  for (const z of [-3.6, 3.6]) {
    box(g, 3.4, 12, 3.4, STONE, 0, 6, z);
    for (let i = -1; i <= 1; i++) box(g, 0.8, 1.2, 3.6, STONE_DARK, 0, 11.6 + 1.0, z + i * 1.1);
  }
  box(g, 2.4, 2.2, 10.6, STONE_DARK, 0, 10.6, 0);
  box(g, 1.2, 7.4, 6.8, '#3a2e2a', 0, 3.7, 0);
  box(g, 1.4, 0.7, 7.4, STONE_LIGHT, 0, 7.7, 0);
  addSign(g, 'PORTA SAN DONNINO', 0, 14.2, 0, 0.62);
}

function buildPonte(g) {
  box(g, 22, 1.1, 6.2, STONE, 0, 1.5, 0);
  box(g, 22, 1.2, 0.45, STONE_LIGHT, 0, 2.55, 3.0);
  box(g, 22, 1.2, 0.45, STONE_LIGHT, 0, 2.55, -3.0);
  for (const x of [-7.2, 0, 7.2]) {
    box(g, 2.2, 3.2, 6.4, STONE_DARK, x, 0.3, 0);
  }
  // acqua sotto il ponte
  const water = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), new THREE.MeshLambertMaterial({ color: '#4f8fa8' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.035;
  g.add(water);
  addSign(g, 'PONTE ROMANO', 0, 4.6, 0, 0.58);
}

function buildTeatro(g) {
  box(g, 34, 13, 22, '#ddc9a9', 0, 6.5, 0);
  box(g, 36, 1.2, 24, STONE_DARK, 0, 13.3, 0);
  // portico
  for (let i = -2; i <= 2; i++) {
    cyl(g, 0.38, 0.46, 8.6, STONE_LIGHT, i * 3.1, 4.3, 11.6, 10);
  }
  box(g, 17.5, 1.0, 3.8, STONE_LIGHT, 0, 9.1, 11.6);
  box(g, 19.5, 0.9, 4.4, STONE_DARK, 0, 9.8, 11.6);
  // frontone
  const shape = new THREE.Shape();
  shape.moveTo(-10.5, 0); shape.lineTo(10.5, 0); shape.lineTo(0, 4.6); shape.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: false }), lam(STONE_LIGHT));
  ped.position.set(0, 10.2, 11.0);
  ped.castShadow = true;
  g.add(ped);
  box(g, 3.0, 5.0, 0.8, '#3c2e29', 0, 5.2, 12.8);
  addSign(g, 'TEATRO G. MAGNANI', 0, 12.4, 13.2, 0.68);
}

function buildComunale(g) {
  box(g, 27, 12, 21, '#dfcba9', 0, 6, 0);
  box(g, 29, 1.0, 23, STONE_DARK, 0, 12.2, 0);
  // torre
  box(g, 6.2, 22, 6.2, STONE_LIGHT, 0, 11, 0);
  box(g, 4.4, 4.4, 4.4, '#3b302b', 0, 19.2, 0);
  circle(g, 1.5, '#f4ead3', 0, 17.2, 3.2);
  box(g, 0.15, 1.6, 0.08, '#1b241e', 0, 17.2, 3.3);
  box(g, 0.9, 0.1, 0.08, '#1b241e', 0.25, 17.2, 3.32);
  cone(g, 4.0, 4.0, ROOF_DARK, 0, 23.5, 0, 4);
  // portico e finestre
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    box(g, 1.5, 2.4, 0.3, GLASS, i * 3.2, 8.2, 10.6);
  }
  for (let i = -3; i <= 3; i++) {
    cyl(g, 0.26, 0.32, 4.2, STONE_LIGHT, i * 3.2, 2.1, 10.3, 8);
  }
  box(g, 24, 0.8, 2.2, STONE_DARK, 0, 4.3, 10.4);
  addSign(g, 'COMUNE DI FIDENZA', 0, 13.7, 11.4, 0.62);
}

function buildSantuario(g) {
  box(g, 22, 14, 44, STONE, 0, 7, 0);
  box(g, 24, 18, 2.2, STONE_LIGHT, 0, 9, 22);
  const r1 = box(g, 22, 0.5, 12, ROOF, 0, 15.2, 5.5);
  r1.rotation.x = 0.56;
  const r2 = box(g, 22, 0.5, 12, ROOF, 0, 15.2, -5.5);
  r2.rotation.x = -0.56;
  // cupola
  cyl(g, 8, 8, 4, STONE_LIGHT, 0, 15, 0, 16);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam('#b7a382'));
  dome.position.set(0, 17, 0);
  dome.castShadow = true;
  g.add(dome);
  cyl(g, 0.35, 0.5, 3, STONE_DARK, 0, 21.5, 0, 8);
  // campanile
  box(g, 5.8, 28, 5.8, STONE_LIGHT, -14, 14, -15);
  cone(g, 4.2, 6, ROOF_DARK, -14, 31, -15, 4);
  circle(g, 2.0, '#2e4c5a', 0, 11.5, 23.2);
  ring(g, 2.2, 0.14, STONE_DARK, 0, 11.5, 23.3);
  addSign(g, 'SANTUARIO GRAN MADRE', 0, 8.2, 23.4, 0.62);
}

function buildSanPietro(g) {
  box(g, 17, 12, 26, STONE, 0, 6, 0);
  box(g, 19, 16, 2, STONE_LIGHT, 0, 8, 13);
  const r1 = box(g, 17, 0.45, 9, ROOF, 0, 13.2, 4);
  r1.rotation.x = 0.55;
  const r2 = box(g, 17, 0.45, 9, ROOF, 0, 13.2, -4);
  r2.rotation.x = -0.55;
  box(g, 5, 20, 5, STONE_LIGHT, -10, 10, -9);
  cone(g, 3.6, 5, ROOF_DARK, -10, 22.5, -9, 4);
  circle(g, 1.6, '#2e4c5a', 0, 10, 14.1);
  ring(g, 1.8, 0.12, STONE_DARK, 0, 10, 14.2);
  addSign(g, 'CHIESA DI SAN PIETRO', 0, 7.2, 14.3, 0.58);
}

function buildMuseo(g) {
  addSign(g, 'MUSEO MUSINI', 0, 6.2, 8, 0.6);
  box(g, 2.6, 3.8, 0.3, '#3a2e2a', 0, 2.0, 7.8);
  box(g, 3.4, 0.5, 0.6, STONE_DARK, 0, 4.1, 7.9);
}

function buildPiazzaDuomo(g) {
  // platea della piazza
  box(g, 34, 0.08, 28, '#d9c9ad', 0, 0.04, 0);
  // aiuole, panchine e lampioni
  for (const [x, z] of [[-11, 8], [11, -7], [-12, -8], [12, 9]]) {
    box(g, 3.2, 0.3, 1.6, '#6f9a5a', x, 0.16, z);
    box(g, 3.2, 0.2, 1.6, '#8b6848', x, 0.48, z + 1.0);
  }
  for (const [x, z] of [[-13, 0], [13, 0]]) {
    cyl(g, 0.08, 0.11, 4.2, '#2f3632', x, 2.1, z, 8);
    sphere(g, 0.16, '#ffe6a6', x, 4.15, z, 8);
  }
}

function buildObelisco(g) {
  box(g, 3.0, 1.0, 3.0, STONE_DARK, 0, 0.5, 0);
  box(g, 2.3, 0.7, 2.3, STONE, 0, 1.3, 0);
  box(g, 1.15, 9.2, 1.15, STONE_LIGHT, 0, 6.6, 0);
  cone(g, 1.3, 2.0, STONE, 0, 12.2, 0, 4);
  sphere(g, 0.38, '#c9a64f', 0, 13.4, 0, 10);
  for (const [x, z] of [[-5, 4], [5, -3]]) {
    box(g, 2.8, 0.28, 1.4, '#6f9a5a', x, 0.15, z);
    box(g, 2.8, 0.18, 1.4, '#8b6848', x, 0.46, z + 0.9);
  }
  addSign(g, 'OBELISCO', 0, 3.6, 4.2, 0.58);
}

function buildPiazzaGaribaldi(g) {
  box(g, 22, 0.08, 18, '#d9c9ad', 0, 0.04, 0);
  for (const [x, z] of [[-7, 5], [7, -4]]) {
    box(g, 2.8, 0.28, 1.4, '#6f9a5a', x, 0.15, z);
    box(g, 2.8, 0.18, 1.4, '#8b6848', x, 0.46, z + 0.9);
  }
  addSign(g, 'PIAZZA GARIBALDI', 0, 3.8, 7, 0.62);
}

function buildStazione(g, world) {
  box(g, 60, 9, 14, '#d8c9b2', 0, 4.5, 0);
  box(g, 62, 0.8, 16, '#a58f74', 0, 9.3, 0);
  // pensilina
  box(g, 58, 0.35, 9, '#8d948d', 0, 6.0, -10);
  for (let i = -4; i <= 4; i++) {
    cyl(g, 0.16, 0.2, 5.8, '#59615b', i * 7, 3.0, -14, 8);
  }
  box(g, 58, 0.25, 11, '#aaa59a', 0, 0.25, -11);
  // finestre
  for (let i = -5; i <= 5; i++) {
    box(g, 2.4, 2.0, 0.25, GLASS, i * 5.2, 5.2, 7.1);
    box(g, 1.6, 2.4, 0.2, '#5d4a3e', i * 5.2, 2.0, 7.1);
  }
  circle(g, 1.25, '#f4ead3', 0, 7.4, 7.2);
  box(g, 0.1, 1.2, 0.06, '#1b241e', 0, 7.4, 7.3);
  addSign(g, 'FIDENZA', 0, 10.6, 7.4, 1.15);
  // treno fermo sul binario
  const train = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    box(car, 17, 2.8, 3.1, i === 0 ? '#b64a3c' : '#d7d2c7', 0, 1.7, 0);
    box(car, 16.2, 1.0, 3.16, '#2e4c5a', 0, 2.2, 0);
    for (const x of [-5, 5]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 10), lam('#242424'));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.45, 1.6);
      car.add(w);
      const w2 = w.clone(); w2.position.z = -1.6; car.add(w2);
    }
    car.position.set(i * 18 - 18, 0, -23);
    train.add(car);
  }
  g.add(train);
  world.userData.train = train;
}

function buildStirone(g) {
  box(g, 4.2, 2.4, 0.4, WOOD, 0, 2.2, 0);
  addSign(g, 'PARCO DELLO STIRONE', 0, 3.9, 0.30, 0.7);
  // ponticello di legno
  const bridge = new THREE.Group();
  box(bridge, 14, 0.4, 4.0, WOOD, 0, 1.1, 0);
  for (const z of [-1.8, 1.8]) {
    box(bridge, 14, 0.9, 0.18, '#6d4e35', 0, 1.65, z);
    for (const x of [-6, 0, 6]) box(bridge, 0.18, 1.0, 1.8, '#6d4e35', x, 0.5, 0);
  }
  bridge.position.set(0, 0, 0);
  g.add(bridge);
  for (const z of [-6, 6]) {
    box(g, 2.2, 0.4, 0.5, WOOD, -6, 0.45, z);
    box(g, 2.2, 0.4, 0.5, WOOD, 6, 0.45, z);
  }
  addSign(g, 'PONTE DEL PARCO', 0, 2.6, 2.4, 0.5);
}

function buildMissionBoard(g) {
  box(g, 2.6, 0.18, 0.28, WOOD, 0, 2.1, 0);
  box(g, 0.18, 2.4, 0.18, WOOD, -1.0, 1.2, 0);
  box(g, 0.18, 2.4, 0.18, WOOD, 1.0, 1.2, 0);
  box(g, 2.4, 1.4, 0.12, '#e8dcc5', 0, 2.0, 0.1);
  box(g, 2.4, 0.12, 0.14, '#3f4a42', 0, 2.45, 0.1);
  addSign(g, 'MISSIONI', 0, 3.2, 0.15, 0.5);
  for (let i = 0; i < 3; i++) {
    box(g, 0.58, 0.34, 0.03, ['#c2684b', '#4f8fa8', '#6f9a5a'][i], -0.7 + i * 0.7, 2.0, 0.18);
  }
}

export function buildLandmarks({ world, scene, landmarks, city }) {
  const groups = new Map();
  const builders = {
    duomo: buildDuomo,
    'piazza-duomo': buildPiazzaDuomo,
    porta: buildPorta,
    ponte: buildPonte,
    teatro: buildTeatro,
    comunale: buildComunale,
    granmadre: buildSantuario,
    sanpietro: buildSanPietro,
    musini: buildMuseo,
    stazione: buildStazione,
    stirone: buildStirone,
    obelisco: buildObelisco,
    'piazza-garibaldi': buildPiazzaGaribaldi
  };
  for (const l of landmarks) {
    if (l.hidden) continue;
    const model = l.model || l.type;
    const fn = builders[model] || builders[l.type] || buildMuseo;
    const g = new THREE.Group();
    g.position.set(l.x + (l.offsetX || 0), 0, l.z + (l.offsetZ || 0));
    g.rotation.y = (l.rotation || 0) * Math.PI / 180;
    g.scale.setScalar(Number.isFinite(l.scale) ? l.scale : 1);
    g.name = `landmark-${l.id}`;
    const isDuomo = model === 'duomo';
    const content = isDuomo ? new THREE.Group() : g;
    fn(content, world);
    if (isDuomo) {
      g.add(content);
      world.duomoLandmarkGroup = g;
      world.duomoLowGroup = content;
    }
    scene.add(g);
    groups.set(l.id, g);
  }
  // Tabellone missioni in Piazza Duomo
  const board = new THREE.Group();
  const boardSpot = world.missionBoardDef || world.findFreeSpot(-316, 20, 1.2) || { x: -316, z: 20 };
  board.position.set(boardSpot.x, 0, boardSpot.z);
  buildMissionBoard(board);
  scene.add(board);
  world.missionBoard = { x: boardSpot.x, z: boardSpot.z, group: board };
  return groups;
}
