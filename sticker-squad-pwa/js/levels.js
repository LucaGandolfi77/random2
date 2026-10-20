// ============================================================
// LEVELS — All 5 World Generators
// ============================================================
const LEVELS = {
  names: ['The Desk', 'The Bookshelf', 'The Floor', 'The Window', 'The Backpack'],
  subs: [
    'Collect stickers. Find the portal.',
    'Climb the books. Avoid bookmark tassels.',
    'Navigate carpet & lego. Avoid dust bunnies.',
    'Stay in light beams. Dodge sliding raindrops.',
    'Navigate the dark maze. Defeat the Dryer Ghost!',
  ],
};

// Global per-level arrays (shared with engine.js which pushes here)
let collectibles = [];
let targets = [];
let portals = [];
let water = null;
let levelObjects = [];
let worldLights = [];
let hazards = [];
let collectPool = []; // pooled collectible meshes — recycled across levels

function clearLevel() {
  collectibles.forEach((c) => STICKER.worldGroup.remove(c));
  targets.forEach((t) => {
    STICKER.worldGroup.remove(t.body);
    STICKER.worldGroup.remove(t.head);
  });
  hazards.forEach((h) => {
    if (h.obj.parent) h.obj.parent.remove(h.obj);
  });
  portals.forEach((p) => STICKER.worldGroup.remove(p));
  levelObjects.forEach((o) => STICKER.worldGroup.remove(o));
  worldLights.forEach((l) => STICKER.worldGroup.remove(l));
  if (water) { STICKER.scene.remove(water); water = null; }

  collectibles = [];
  targets = [];
  hazards = [];
  portals = [];
  levelObjects = [];
  worldLights = [];
  decalsReset();
  ENEMIES.list = hazards; // keep the alias in sync — hazards was rebound
  ENEMIES.boss = null;
  STICKER.worldGroup.rotation.set(0, 0, 0);
}

// ── Helpers ──
// Pooled collectible: hide + recycle instead of destroy (roadmap: object pooling)
function addCollectible(x, y, z) {
  let mesh = collectPool.pop();
  if (!mesh) {
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matf(0xff66cc, { emissive: 0x662244 }));
    mesh.castShadow = true;
  }
  mesh.visible = true;
  mesh.position.set(x, y, z);
  STICKER.worldGroup.add(mesh);
  collectibles.push(mesh);
  return mesh;
}

function returnCollectible(mesh) {
  mesh.visible = false;
  if (mesh.parent) mesh.parent.remove(mesh);
  collectPool.push(mesh);
}

function addTarget(x, y, z, color = 0x33ccff) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 6), matf(color));
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32), matf(0xffcc66));
  body.position.set(x, y + 0.45, z);
  head.position.set(x, y + 1.0, z);
  body.castShadow = true;
  head.castShadow = true;
  STICKER.worldGroup.add(body);
  STICKER.worldGroup.add(head);
  const obj = {
    body, head, baseY: y, phase: Math.random() * 6.28,
    speed: 0.5 + Math.random(), following: false, followTimer: 0,
  };
  targets.push(obj);
  return obj;
}

function addPortal(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 6, 16), matf(0x66ffcc, { emissive: 0x22aa88 }));
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  group.add(disc);
  STICKER.worldGroup.add(group);
  portals.push(group);
  return group;
}

// ============================================================
// LEVEL 0 — THE DESK (Tutorial)
// ============================================================
function loadLevel0() {
  clearLevel(); setupState();
  sceneSet(0xaaccff, 0.85, 0.6);
  document.getElementById('dark-overlay').classList.remove('on');

  // Desk surface
  m('box', 40, 1, 40, 0x8b5a2b, 0, -0.5, 0);
  addWater(55, 0x55aadd, 0.5, -3);

  // Rocks (paperclips / bits) — instanced: 1 draw call for 12 rocks
  const rockT = [];
  for (let i = 0; i < 12; i++) {
    const s = 0.4 + Math.random() * 1.2;
    rockT.push({
      p: [(Math.random() - 0.5) * 34, s * 0.15, (Math.random() - 0.5) * 34],
      s: [s, s * 0.3, s * 0.5],
      r: [0, Math.random() * 0.5, Math.random() * 0.2],
    });
  }
  mInst('box', 0x8899aa, rockT);

  // Pencil bridge
  m('cyl', 0.25, 6, 0.25, 0xffcc44, 6, 3, 0, { rot: [0, 0, Math.PI / 2] });
  m('cone', 0.25, 1.2, 0.25, 0xffee88, 9.3, 3, 0, { rot: [0, 0, -Math.PI / 2] });
  m('cone', 0.1, 0.4, 0.1, 0x333333, 10.1, 3, 0, { rot: [0, 0, -Math.PI / 2] });
  m('cyl', 0.22, 5, 0.22, 0x66ccff, -4, 3.2, 4, { rot: [0.2, 0, Math.PI / 2.2] });

  // Eraser
  m('box', 2, 1.2, 3, 0xffaabb, -10, 0.6, -8);
  // Tape dispenser
  m('cyl', 1.5, 2.2, 1.5, 0xdddddd, 10, 1.1, -8);
  m('box', 3.5, 0.8, 2, 0xcc3333, 10, 0.4, -8);

  // Small trees (succulents / pen stubs) — 3 instanced meshes for 18 objects
  const treePos = [[-6, -8], [8, -10], [-12, 6], [12, 10], [-3, 13], [5, -14]];
  mInst('cyl', 0x4a3020, treePos.map(([x, z]) => ({ p: [x, 1, z], s: [0.15, 2, 0.15] })));
  mInst('cone', 0x2d8a3e, treePos.map(([x, z]) => ({ p: [x, 2.2, z], s: [0.8, 1.5, 0.8] })));
  mInst('cone', 0x3db84f, treePos.map(([x, z]) => ({ p: [x, 3.0, z], s: [0.5, 1.2, 0.5] })));

  // Houses (stacked books)
  m('box', 3, 1.8, 4, 0xcc8866, -6, 0.9, -6);
  m('box', 2.8, 0.4, 3.8, 0xdd9977, -6, 2.0, -6);
  m('cone', 2.5, 1.5, 2.5, 0x8b5a2b, -6, 2.9, -6, { rot: [0, 0.1, 0] });

  m('box', 3.5, 2.2, 3, 0x2255aa, 8, 1.1, 5);
  m('box', 3.3, 0.4, 2.8, 0x3366cc, 8, 2.4, 5);

  // Collectibles
  addCollectible(0, 1.0, 0);
  addCollectible(6, 3.8, 0);
  addCollectible(-10, 2.0, -8);
  addCollectible(10, 2, -8);
  addCollectible(-6, 2.6, -6);
  addCollectible(8, 2.8, 5);
  addCollectible(12, 1, 10);
  addCollectible(-12, 1, 4);
  addCollectible(0, 1, 12);
  addCollectible(-4, 4, 4);

  addTarget(-4, 0, 4, 0xff66cc);
  addTarget(8, 0, -6, 0x33ff66);
  addTarget(0, 0, -10, 0x6633ff);

  addPortal(0, 0.2, 16);

  uiSpawnTitle('WORLD 1: THE DESK', LEVELS.subs[0]);
  uiSetZone(LEVELS.names[0]);
}

// ============================================================
// LEVEL 1 — THE BOOKSHELF (Vertical Climbing)
// ============================================================
function loadLevel1() {
  clearLevel(); setupState();
  sceneSet(0xcca87a, 0.7, 0.5);
  document.getElementById('dark-overlay').classList.remove('on');

  m('box', 50, 1, 50, 0x8b5a2b, 0, -0.5, 0);
  addWater(55, 0x998866, 0.4, -4);

  // Book columns
  const colors = [0xcc3333, 0x2255aa, 0x228833, 0x6622aa, 0xaa6622, 0xcc4488];
  colors.forEach((c, i) => {
    const h = 4 + Math.random() * 4;
    m('box', 1.8, h, 5, c, i % 2 === 0 ? -18 + i * 6.5 : -17 + i * 6.5, h / 2, i % 2 === 0 ? -12 : -16);
  });

  // Floating books
  [
    [-8, 3, -8, 0xdd4444], [0, 5, -10, 0x33aa55], [8, 4, -9, 0x4466cc],
    [-6, 7, -14, 0xaa33aa], [5, 8, -14, 0xcc8833], [-2, 10, -12, 0x44ccaa],
    [10, 7, -5, 0xcc3355], [-12, 6, -4, 0x55cc44], [3, 12, -15, 0xffd700],
  ].forEach(([x, y, z, c]) => m('box', 2.2, 0.5, 3.5, c, x, y, z));

  // Tassels (hazards)
  for (let i = 0; i < 5; i++) {
    const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.02), matf(0xff3366));
    const pivot = new THREE.Group();
    pivot.position.set(-14 + i * 7, 5 + Math.random() * 3, -8);
    tassel.position.set(0, -1.25, 0);
    pivot.add(tassel);
    STICKER.worldGroup.add(pivot);
    hazards.push({ type: 'swing', obj: pivot, offset: Math.random() * 10, speed: 1.5 + Math.random() });
    levelObjects.push(pivot);
  }
  // Strings
  for (let i = 0; i < 5; i++) {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3, 0.04), matf(0xffffff));
    const pivot = new THREE.Group();
    pivot.position.set(-14 + i * 7, 7 + Math.random() * 2, -8.2);
    str.position.set(0, -1.5, 0);
    pivot.add(str);
    STICKER.worldGroup.add(pivot);
    hazards.push({ type: 'swing', obj: pivot, offset: Math.random() * 10, speed: 1.2 + Math.random() * 0.5 });
    levelObjects.push(pivot);
  }

  addCollectible(-8, 3.8, -8);
  addCollectible(0, 5.8, -10);
  addCollectible(8, 4.8, -9);
  addCollectible(-6, 7.8, -14);
  addCollectible(5, 8.8, -14);
  addCollectible(-2, 10.8, -12);
  addCollectible(10, 7.8, -5);
  addCollectible(-12, 6.8, -4);
  addCollectible(3, 12.8, -15);
  addCollectible(0, 1, 12);

  addTarget(-5, 0, 5);
  addTarget(8, 0, 6, 0xffaa33);

  addPortal(3, 13.4, -15);

  uiSpawnTitle('WORLD 2: THE BOOKSHELF', LEVELS.subs[1]);
  uiSetZone(LEVELS.names[1]);
}

// ============================================================
// LEVEL 2 — THE FLOOR (Carpet Stealth)
// ============================================================
function loadLevel2() {
  clearLevel(); setupState();
  sceneSet(0xddbba0, 0.65, 0.55);
  document.getElementById('dark-overlay').classList.remove('on');

  m('box', 50, 0.8, 50, 0xbb8866, 0, -0.4, 0);
  addWater(55, 0xaa8866, 0.35, -3);

  // Tufts — instanced, split by color (2 draw calls for 60 cones)
  const tufts1 = [], tufts2 = [];
  for (let i = 0; i < 60; i++) {
    const h = 0.3 + Math.random() * 0.6;
    const t = { p: [(Math.random() - 0.5) * 48, h / 2, (Math.random() - 0.5) * 48], s: [0.15, h, 0.15] };
    (Math.random() > 0.5 ? tufts1 : tufts2).push(t);
  }
  if (tufts1.length) mInst('cone', 0xcc9977, tufts1, { cast: false });
  if (tufts2.length) mInst('cone', 0xbb8866, tufts2, { cast: false });

  // Legos — grouped by color into instanced meshes
  const lc = [0xff3333, 0x33aa33, 0x3366ff, 0xffcc00, 0xffffff];
  const lp = [
    [5, 0, 5], [6, 0, 5], [5, 0, 6], [6, 0, 6],
    [-8, 0, -6], [-8, 1, -6],
    [10, 0, -10], [11, 0, -10], [10, 0, -9],
    [-5, 0, 10], [-4, 0, 10], [-5, 0, 11], [-4, 0, 11], [-4.5, 1, 10.5],
    [0, 0, -14], [1, 0, -14], [0, 1, -14],
  ];
  const legoGroups = {};
  lp.forEach(([x, y, z]) => {
    const c = lc[Math.floor(Math.random() * lc.length)];
    (legoGroups[c] = legoGroups[c] || []).push({ p: [x, y * 0.5 + 0.25, z], s: [0.95, 0.45 + Math.random() * 0.3, 0.95] });
  });
  Object.entries(legoGroups).forEach(([c, arr]) => mInst('box', parseInt(c), arr));

  // Dust bunnies
  for (let i = 0; i < 4; i++) {
    const bunny = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), matf(0x887766));
    bunny.position.set((Math.random() - 0.5) * 30, 0.6, (Math.random() - 0.5) * 30);
    bunny.castShadow = true;
    STICKER.worldGroup.add(bunny);
    hazards.push({ type: 'patrol', obj: bunny, center: bunny.position.clone(), radius: 4 + Math.random() * 4, speed: 1 + Math.random(), angle: Math.random() * 6.28 });
    levelObjects.push(bunny);
  }

  addCollectible(5.5, 1.5, 5.5);
  addCollectible(-8, 2, -6);
  addCollectible(10.5, 1, -9.5);
  addCollectible(-4.5, 2, 10.5);
  addCollectible(0, 1.5, -14);
  addCollectible(-12, 1, 12);
  addCollectible(14, 1, 2);
  addCollectible(0, 1, 0);
  addCollectible(-6, 1, -14);
  addCollectible(8, 1, 8);

  addTarget(4, 0, -4, 0xff66cc);
  addTarget(-10, 0, 8, 0x66ff33);

  addPortal(15, 0.2, 0);

  uiSpawnTitle('WORLD 3: THE FLOOR', LEVELS.subs[2]);
  uiSetZone(LEVELS.names[2]);
}

// ============================================================
// LEVEL 3 — THE WINDOW
// ============================================================
function loadLevel3() {
  clearLevel(); setupState();
  sceneSet(0xbbddff, 1.0, 0.7);
  STICKER.dirLight.color.setHex(0xffffee);
  document.getElementById('dark-overlay').classList.remove('on');

  m('box', 50, 0.4, 50, 0xcceeff, 0, -0.2, 0);
  addWater(60, 0x88bbdd, 0.45, -3);

  // Light beams (safe zones)
  [
    [-8, 0, -8], [0, 0, -12], [8, 0, -6], [-4, 0, 4], [6, 0, 8], [-10, 0, 10], [12, 0, -10],
  ].forEach(([x, y, z]) => {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.05, 10), matf(0xffeeaa, { emissive: 0xaa8844, transparent: true, opacity: 0.6 }));
    beam.position.set(x, 0.05, z);
    STICKER.worldGroup.add(beam);
    levelObjects.push(beam);
    const pl = new THREE.PointLight(0xffeeaa, 0.4, 8);
    pl.position.set(x, 1, z);
    STICKER.worldGroup.add(pl);
    worldLights.push(pl);
  });

  // Frames
  m('box', 0.6, 3, 50, 0xeeeeee, -15, 1.5, 0);
  m('box', 0.6, 3, 50, 0xeeeeee, 15, 1.5, 0);
  m('box', 50, 3, 0.6, 0xeeeeee, 0, 1.5, -18);
  m('box', 50, 3, 0.6, 0xeeeeee, 0, 1.5, 18);

  // Raindrops
  for (let i = 0; i < 8; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), matf(0xaaddff, { transparent: true, opacity: 0.65 }));
    drop.position.set((Math.random() - 0.5) * 28, 0.25, (Math.random() - 0.5) * 34);
    STICKER.worldGroup.add(drop);
    hazards.push({ type: 'raindrop', obj: drop, zDir: Math.random() > 0.5 ? 1 : -1, speed: 2 + Math.random() * 3 });
    levelObjects.push(drop);
  }

  // Clouds
  for (let i = 0; i < 5; i++) {
    const cx = (Math.random() - 0.5) * 40;
    const cz = -20 - Math.random() * 15;
    m('sphere', 2 + Math.random(), 1 + Math.random() * 0.5, 2 + Math.random(), 0xffffff, cx, 8 + Math.random() * 3, cz);
    m('sphere', 1.5 + Math.random(), 1, 1.5 + Math.random(), 0xffffff, cx + 2, 8, cz + 1);
  }

  addCollectible(-8, 0.8, -8);
  addCollectible(0, 0.8, -12);
  addCollectible(8, 0.8, -6);
  addCollectible(-4, 0.8, 4);
  addCollectible(6, 0.8, 8);
  addCollectible(-10, 0.8, 10);
  addCollectible(12, 0.8, -10);
  addCollectible(0, 0.8, 0);
  addCollectible(-6, 0.8, -14);
  addCollectible(10, 0.8, 4);

  addTarget(-3, 0, 8, 0xffcc33);
  addTarget(10, 0, -4, 0x33ccff);

  addPortal(0, 0.2, -16);

  uiSpawnTitle('WORLD 4: THE WINDOW', LEVELS.subs[3]);
  uiSetZone(LEVELS.names[3]);
}

// ============================================================
// LEVEL 4 — THE BACKPACK (Dark Maze + Boss)
// ============================================================
function loadLevel4() {
  clearLevel(); setupState();
  sceneSet(0x222233, 0.3, 0.25);
  STICKER.dirLight.color.setHex(0xaaaaff);
  document.getElementById('dark-overlay').classList.add('on');

  m('box', 60, 0.6, 60, 0x332244, 0, -0.3, 0);

  // Crumpled maze walls — one instanced mesh for all 31 walls
  const walls = [
    [-20, 2, -20], [-20, 2, -10], [-20, 2, 0], [-20, 2, 10], [-20, 2, 20],
    [20, 2, -20], [20, 2, -10], [20, 2, 0], [20, 2, 10], [20, 2, 20],
    [-10, 2, -20], [0, 2, -20], [10, 2, -20],
    [-10, 2, 20], [0, 2, 20], [10, 2, 20],
    [-8, 2, -8], [0, 2, -8], [8, 2, -8],
    [-8, 2, 8], [0, 2, 8], [8, 2, 8],
    [-12, 2, -4], [-4, 2, -4], [4, 2, -4], [12, 2, -4],
    [-12, 2, 4], [-4, 2, 4], [4, 2, 4], [12, 2, 4],
    [-8, 2, 0], [8, 2, 0],
  ];
  mInst('box', 0xeeeeee, walls.map(([x, y, z]) => ({
    p: [x, y, z],
    s: [0.8 + Math.random() * 0.6, 2.5 + Math.random() * 1.5, 0.8 + Math.random() * 0.6],
    r: [Math.random() * 0.2, Math.random() * 0.5, Math.random() * 0.2],
  })));

  // Flashlight stations
  [[-10, 0, -10], [10, 0, 10], [0, 0, 0], [-12, 0, 8], [12, 0, -8]].forEach(([x, y, z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 5), matf(0xaaaaaa));
    post.position.set(x, 1, z);
    STICKER.worldGroup.add(post);
    levelObjects.push(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), matf(0xffffaa, { emissive: 0xaaaa44 }));
    bulb.position.set(x, 2, z);
    STICKER.worldGroup.add(bulb);
    levelObjects.push(bulb);
    const pl = new THREE.PointLight(0xffffaa, 0.6, 10);
    pl.position.set(x, 2, z);
    STICKER.worldGroup.add(pl);
    worldLights.push(pl);
  });

  // Dryer Sheet Ghost Boss
  const bossGroup = new THREE.Group();
  bossGroup.position.set(15, 3, -15);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), matf(0xffffff, { double: true, transparent: true, opacity: 0.85 }));
  const bEyeL = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bEyeL.position.set(-0.3, 0.3, 0.02);
  sheet.add(bEyeL);
  const bEyeR = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bEyeR.position.set(0.3, 0.3, 0.02);
  sheet.add(bEyeR);
  const bMouth = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.18, 8, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bMouth.position.set(0, -0.2, 0.02);
  sheet.add(bMouth);
  bossGroup.add(sheet);
  STICKER.worldGroup.add(bossGroup);
  const boss = { type: 'boss', obj: bossGroup, sheet, phase: 0, hp: 3, dead: false };
  hazards.push(boss);
  ENEMIES.boss = boss;

  // Collectibles
  addCollectible(-10, 0.8, -10);
  addCollectible(10, 0.8, 10);
  addCollectible(0, 0.8, 0);
  addCollectible(-12, 0.8, 8);
  addCollectible(12, 0.8, -8);
  addCollectible(-6, 0.8, -14);
  addCollectible(6, 0.8, 14);
  addCollectible(-16, 0.8, 0);
  addCollectible(16, 0.8, 4);
  addCollectible(0, 0.8, -16);

  addTarget(-5, 0, 5, 0xffaa66);
  addTarget(8, 0, -5, 0x66aaff);

  addPortal(0, 0.2, -18);

  uiSpawnTitle('WORLD 5: THE BACKPACK', LEVELS.subs[4]);
  uiSetZone(LEVELS.names[4]);
}

// ── Shared helper ──
function setupState() {
  STATE.pos.set(0, 0.5, 0);
  STATE.vel.set(0, 0, 0);
  STATE.yaw = 0;
  STATE.mode = 'grounded';
  STATE.stickPlane = null;
  STATE.onGround = true;
  STATE.inPortal = false;
  uiUpdateModeBadge();
}

function sceneSet(bgHex, dirIntensity, hemiIntensity) {
  STICKER.scene.background = new THREE.Color(bgHex);
  STICKER.scene.fog.color.set(bgHex);
  STICKER.dirLight.intensity = dirIntensity;
  STICKER.dirLight.color.setHex(0xffffff);
  // update the ambient hemi
  STICKER.scene.children.forEach((c) => { if (c.isHemisphereLight) c.intensity = hemiIntensity; });
}

function addWater(radius, color, opacity, y) {
  water = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 1, 16),
    matf(color, { transparent: true, opacity })
  );
  water.position.y = y;
  STICKER.scene.add(water);
}
