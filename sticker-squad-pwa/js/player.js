// ============================================================
// PLAYER — Sticker Character Mesh & Movement Controller
// ============================================================
const PLAYER = { group: null, shadow: null, legL: null, legR: null, eyeL: null, eyeR: null };

function playerInit() {
  const g = new THREE.Group();

  // Sticker body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 10), matf(0xffd700));
  body.castShadow = true;
  g.add(body);

  // Edge ring
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 10, 1, true), matf(0xcc9900));
  edge.scale.set(1.02, 1, 1.02);
  g.add(edge);

  // Eyes
  const eyeGeo = new THREE.CircleGeometry(0.065, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  PLAYER.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  PLAYER.eyeL.position.set(-0.13, 0.036, 0.26);
  PLAYER.eyeL.rotation.x = -Math.PI / 2;
  g.add(PLAYER.eyeL);
  PLAYER.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  PLAYER.eyeR.position.set(0.13, 0.036, 0.26);
  PLAYER.eyeR.rotation.x = -Math.PI / 2;
  g.add(PLAYER.eyeR);

  // Mouth
  const mouth = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.075, 8, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x882222 }));
  mouth.position.set(0, 0.036, 0.29);
  mouth.rotation.x = -Math.PI / 2;
  g.add(mouth);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 4);
  const legMat = matf(0xcc9900);
  PLAYER.legL = new THREE.Mesh(legGeo, legMat);
  PLAYER.legL.position.set(-0.16, -0.1, 0.1);
  PLAYER.legL.visible = false;
  g.add(PLAYER.legL);
  PLAYER.legR = new THREE.Mesh(legGeo, legMat);
  PLAYER.legR.position.set(0.16, -0.1, 0.1);
  PLAYER.legR.visible = false;
  g.add(PLAYER.legR);

  PLAYER.group = g;
  STICKER.scene.add(PLAYER.group);

  // Shadow
  PLAYER.shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
  );
  PLAYER.shadow.rotation.x = -Math.PI / 2;
  STICKER.scene.add(PLAYER.shadow);
}

// ── State ──
const STATE = {
  pos: new THREE.Vector3(0, 0.5, 0),
  vel: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  mode: 'grounded',
  stickPlane: null,
  onGround: true,
  speed: 4.2,
  sprintMult: 1.8,
  peelTimer: 0,
  sticks: 0,
  score: 0,
  animTime: 0,
  selectedSticker: 0,
  height: 0.5,
  health: 3,
  maxHealth: 3,
  invincible: 0,
  levelIndex: 0,
  inPortal: false,
  moveMag: 1,
};

// ── Input ──
const KEYS = {};
function inputInit() {
  window.addEventListener('keydown', (e) => {
    KEYS[e.key.toLowerCase()] = true;
    handleKey(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    KEYS[e.key.toLowerCase()] = false;
  });
}

function getInputDir() {
  const dir = new THREE.Vector3(0, 0, 0);
  if (KEYS['w'] || KEYS['arrowup']) dir.z -= 1;
  if (KEYS['s'] || KEYS['arrowdown']) dir.z += 1;
  if (KEYS['a'] || KEYS['arrowleft']) dir.x -= 1;
  if (KEYS['d'] || KEYS['arrowright']) dir.x += 1;
  // Virtual joystick (analog, from touch.js) overrides keyboard on mobile
  if (typeof TOUCH !== 'undefined' && TOUCH.joyId !== null &&
      Math.hypot(TOUCH.joyVec.x, TOUCH.joyVec.y) > 0.12) {
    dir.set(TOUCH.joyVec.x, 0, TOUCH.joyVec.y);
  }
  STATE.moveMag = Math.min(1, dir.length()); // analog speed for joystick
  return dir.normalize();
}

function handleKey(key) {
  if (key === ' ') {
    if (STATE.mode === 'grounded') playerJump();
    else if (STATE.mode === 'sticking') playerPeel();
  }
  if (key === 'e') toggleStickMode();
  if (key === 'q') {
    squadCommandFollow();
  }
  if (key >= '1' && key <= '3') STATE.selectedSticker = parseInt(key) - 1;
}

// ── Actions ──
function playerJump() {
  if (!STATE.onGround) return;
  STATE.vel.y = 8.5;
  STATE.onGround = false;
  STATE.mode = 'air';
  uiUpdateModeBadge();
  beep(290, 0.12, 'square');
  haptic('tick');
  STATE.peelTimer = 0.35;
  PLAYER.legL.visible = true;
  PLAYER.legR.visible = true;
}

function playerPeel() {
  if (STATE.mode !== 'sticking') return;
  STATE.mode = 'peeling';
  STATE.peelTimer = 0.45;
  STATE.vel.set(0, 2, 1.5);
  beep(180, 0.35, 'sawtooth', 0.04);
  haptic('peel'); // the hero moment deserves a triple buzz
  uiShowCommand('PEELING OFF!');
  STICKER.worldGroup.rotation.set(0, 0, 0);
  uiUpdateModeBadge();
}

function toggleStickMode() {
  if (STATE.mode === 'grounded' || STATE.mode === 'air') {
    if (tryStickToWall()) beep(520, 0.1);
  } else if (STATE.mode === 'sticking') {
    playerPeel();
  }
}

// Returns the wall normal if a stickable wall is ahead, else null.
// Used by both tryStickToWall() and the contextual STICK button.
function findStickableWall() {
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), STATE.yaw);
  const origin = STATE.pos.clone().add(new THREE.Vector3(0, 0.3, 0));
  const ray = new THREE.Raycaster(origin, forward);
  const hits = ray.intersectObjects(STICKER.worldGroup.children, true);
  if (hits.length && hits[0].distance < 2.5) {
    const wallNormal = hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld).normalize();
    if (Math.abs(wallNormal.y) < 0.75) return wallNormal;
  }
  return null;
}

function tryStickToWall() {
  const wallNormal = findStickableWall();
  if (!wallNormal) return false;
  STATE.mode = 'sticking';
  STATE.stickPlane = wallNormal;
  STICKER.worldGroup.rotation.set(0, 0, 0);
  if (Math.abs(wallNormal.x) > Math.abs(wallNormal.z)) {
    STICKER.worldGroup.rotation.z = wallNormal.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    STICKER.worldGroup.rotation.x = wallNormal.z > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  haptic('stick');
  uiShowCommand('STUCK TO WALL!');
  uiUpdateModeBadge();
  return true;
}
