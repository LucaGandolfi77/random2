// ============================================================
// ENGINE — Three.js Setup, Quality Presets, Shared Resources
// ============================================================
const STICKER = { scene: null, camera: null, renderer: null, worldGroup: null, dirLight: null };

// ── Quality System: GPU-ish detection + battery saver ──
const QUALITY = {
  level: 'high',          // low | med | high
  fpsCap: 60,
  shadowSize: 2048,
  maxPixelRatio: 2,
  shadows: true,
  batterySaver: false,
  isMobile: false,
};

function detectDevice() {
  QUALITY.isMobile =
    /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && Math.min(innerWidth, innerHeight) < 820);
  applyQuality();
}

function applyQuality() {
  if (QUALITY.isMobile) {
    QUALITY.level = 'med';
    QUALITY.shadowSize = 1024;                    // roadmap: 1024 on mobile GPUs
    QUALITY.maxPixelRatio = 1.5;
  } else {
    QUALITY.level = 'high';
    QUALITY.shadowSize = 2048;
    QUALITY.maxPixelRatio = 2;
  }
  if (QUALITY.batterySaver) {
    QUALITY.fpsCap = 30;                          // roadmap: 30fps on low battery
    QUALITY.shadows = false;
    QUALITY.maxPixelRatio = 1;
  } else {
    QUALITY.fpsCap = 60;
    QUALITY.shadows = true;
  }

  if (STICKER.renderer) {
    STICKER.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY.maxPixelRatio));
    STICKER.renderer.shadowMap.enabled = QUALITY.shadows;
    if (STICKER.dirLight) {
      STICKER.dirLight.castShadow = QUALITY.shadows;
      if (STICKER.dirLight.shadow.map) {
        STICKER.dirLight.shadow.map.dispose();
        STICKER.dirLight.shadow.map = null;
      }
      STICKER.dirLight.shadow.mapSize.set(QUALITY.shadowSize, QUALITY.shadowSize);
      STICKER.dirLight.shadow.camera.updateProjectionMatrix();
    }
    // toggling shadows requires material recompiles
    STICKER.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  document.body.classList.toggle('saver', QUALITY.batterySaver);
}

// ── Battery Watch: auto saver below 20% while unplugged ──
async function batteryWatch() {
  if (!navigator.getBattery) return;
  try {
    const b = await navigator.getBattery();
    const update = () => {
      const saver = b.level < 0.2 && !b.charging;
      if (saver !== QUALITY.batterySaver) {
        QUALITY.batterySaver = saver;
        applyQuality();
        if (typeof uiShowCommand === 'function') {
          uiShowCommand(saver ? '🔋 BATTERY SAVER ON' : '⚡ FULL POWER RESTORED');
        }
      }
    };
    b.addEventListener('levelchange', update);
    b.addEventListener('chargingchange', update);
    update();
  } catch (e) { /* Battery API unsupported — silently skip */ }
}

function engineInit() {
  STICKER.scene = new THREE.Scene();
  STICKER.scene.background = new THREE.Color(0x87CEEB);
  STICKER.scene.fog = new THREE.Fog(0x87CEEB, 25, 100);

  STICKER.camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 200);
  STICKER.camera.position.set(0, 5, -7.5); // spawn behind the player (player faces +z)
  STICKER.scene.add(STICKER.camera); // so camera-attached sprites render

  STICKER.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  STICKER.renderer.setSize(innerWidth, innerHeight);
  STICKER.renderer.shadowMap.enabled = true;
  STICKER.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(STICKER.renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  STICKER.scene.add(hemiLight);

  STICKER.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  STICKER.dirLight.position.set(25, 45, 20);
  STICKER.dirLight.castShadow = true;
  STICKER.dirLight.shadow.mapSize.set(2048, 2048);
  const sc = 50;
  STICKER.dirLight.shadow.camera.near = 0.5;
  STICKER.dirLight.shadow.camera.far = 120;
  STICKER.dirLight.shadow.camera.left = -sc;
  STICKER.dirLight.shadow.camera.right = sc;
  STICKER.dirLight.shadow.camera.top = sc;
  STICKER.dirLight.shadow.camera.bottom = -sc;
  STICKER.scene.add(STICKER.dirLight);

  STICKER.worldGroup = new THREE.Group();
  STICKER.scene.add(STICKER.worldGroup);

  // In-scene reticle (roadmap: kill the DOM tooltip & reticle)
  const reticle = makeCanvasTexture(64, 64, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(32, 10); ctx.lineTo(32, 22);
    ctx.moveTo(32, 42); ctx.lineTo(32, 54);
    ctx.moveTo(10, 32); ctx.lineTo(22, 32);
    ctx.moveTo(42, 32); ctx.lineTo(54, 32);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(32, 32, 2.5, 0, 7); ctx.fill();
  });
  const reticleSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: reticle.tex, transparent: true, depthTest: false, opacity: 0.6 }));
  reticleSprite.position.set(0, 0, -3);
  reticleSprite.scale.set(0.1, 0.1, 1);
  STICKER.camera.add(reticleSprite);

  detectDevice();

  window.addEventListener('resize', () => {
    STICKER.camera.aspect = innerWidth / innerHeight;
    STICKER.camera.updateProjectionMatrix();
    STICKER.renderer.setSize(innerWidth, innerHeight);
  });
}

// ── Canvas texture helper (used by reticle + hover labels) ──
function makeCanvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  return { tex, canvas: c };
}

// ── Shared Geometry Cache ──
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 5),
  sphere: new THREE.DodecahedronGeometry(1),
  circle: new THREE.CircleGeometry(1, 8),
};

// ── Material Factory ──
function matf(color, opts = {}) {
  if (opts.emissive) return new THREE.MeshPhongMaterial({ color, emissive: opts.emissive });
  if (opts.transparent) return new THREE.MeshPhongMaterial({ color, transparent: true, opacity: opts.opacity || 0.7, shininess: 80 });
  if (opts.double) return new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  return new THREE.MeshLambertMaterial({ color });
}

// ── Mesh Builder Helper ──
function m(kind, sx, sy, sz, color, x, y, z, opts = {}) {
  let geo = GEO[kind] || GEO.box;
  const m2 = matf(color, opts);
  const mesh = new THREE.Mesh(geo, m2);
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  if (opts.name) mesh.name = opts.name;
  STICKER.worldGroup.add(mesh);
  if (Array.isArray(window.levelObjects)) window.levelObjects.push(mesh);
  return mesh;
}

// ── Instanced Mesh Builder (roadmap: one draw call for repeated props) ──
// transforms: [{ p:[x,y,z], s:[sx,sy,sz], r:[rx,ry,rz] }, ...]
function mInst(kind, color, transforms, opts = {}) {
  const geo = GEO[kind] || GEO.box;
  const mesh = new THREE.InstancedMesh(geo, matf(color, opts), transforms.length);
  const d = new THREE.Object3D();
  transforms.forEach((t, i) => {
    d.position.set(t.p[0], t.p[1], t.p[2]);
    d.scale.set(t.s[0], t.s[1], t.s[2]);
    d.rotation.set(t.r ? t.r[0] : 0, t.r ? t.r[1] : 0, t.r ? t.r[2] : 0);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  mesh.frustumCulled = false; // instances span the level; skip per-instance culling cost
  STICKER.worldGroup.add(mesh);
  if (Array.isArray(window.levelObjects)) window.levelObjects.push(mesh);
  return mesh;
}
