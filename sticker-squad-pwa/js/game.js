// ============================================================
// GAME — Update Loop, Camera, Interaction, Damage, Progression
// (Phase 1: screen shake, fps cap, hover labels, smart camera)
// ============================================================
const GAME = {
  raycaster: new THREE.Raycaster(),
  mouseNDC: new THREE.Vector2(),
  hovered: null,
  label: null,
  labelText: '',
  contextTimer: 0,
};
const SHAKE = { trauma: 0 };
const TMP_VEC = new THREE.Vector3();

function addShake(amount) {
  SHAKE.trauma = Math.min(1, SHAKE.trauma + amount);
}

function gameInit() {
  // Desktop mouse hover (drives in-scene labels)
  window.addEventListener('mousemove', (e) => {
    GAME.mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
    GAME.mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
  });

  // Desktop click interact — ignore compat mouse events fired after touch
  window.addEventListener('mousedown', (e) => {
    if (typeof TOUCH !== 'undefined' && performance.now() - TOUCH.lastTouch < 500) return;
    GAME.mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
    GAME.mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
    onInteract(null, true);
  });

  // Hover label sprite (roadmap: kill the DOM tooltip)
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const tex = new THREE.CanvasTexture(c);
  GAME.label = {
    spr: new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })),
    canvas: c, tex,
  };
  GAME.label.spr.scale.set(2.2, 0.62, 1);
  GAME.label.spr.visible = false;
  STICKER.scene.add(GAME.label.spr);
}

function setLabelText(text, color) {
  if (GAME.labelText === text) return;
  GAME.labelText = text;
  const ctx = GAME.label.canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 72);
  ctx.font = 'bold 28px Segoe UI, sans-serif';
  const w = Math.min(244, ctx.measureText(text).width + 36);
  // rounded pill background
  const x = (256 - w) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.moveTo(x + 14, 8);
  ctx.lineTo(x + w - 14, 8);
  ctx.quadraticCurveTo(x + w, 8, x + w, 22);
  ctx.lineTo(x + w, 50);
  ctx.quadraticCurveTo(x + w, 64, x + w - 14, 64);
  ctx.lineTo(x + 14, 64);
  ctx.quadraticCurveTo(x, 64, x, 50);
  ctx.lineTo(x, 22);
  ctx.quadraticCurveTo(x, 8, x + 14, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 37);
  GAME.label.tex.needsUpdate = true;
}

// ── Hover detection — shared by label, act button, and interact ──
function getHoverTarget() {
  GAME.raycaster.setFromCamera(GAME.mouseNDC, STICKER.camera);

  const cHits = GAME.raycaster.intersectObjects(collectibles);
  if (cHits.length && cHits[0].distance < 14) return { type: 'collect', obj: cHits[0].object };

  const tHits = GAME.raycaster.intersectObjects(targets.map((t) => t.body));
  if (tHits.length && tHits[0].distance < 14) return { type: 'recruit', obj: tHits[0].object };

  if (STATE.levelIndex === 4) {
    const boss = ENEMIES.boss;
    if (boss && !boss.dead) {
      const bHits = GAME.raycaster.intersectObjects(boss.obj.children, true);
      if (bHits.length && bHits[0].distance < 16) return { type: 'boss', obj: boss.obj };
    }
  }
  return null;
}

function updateHover() {
  const t = getHoverTarget();
  GAME.hovered = t;
  if (t) {
    t.obj.getWorldPosition(TMP_VEC);
    TMP_VEC.y += 1.7;
    GAME.label.spr.position.copy(TMP_VEC);
    if (t.type === 'collect') setLabelText('⭐ Glitter Sticker', '#ffd700');
    else if (t.type === 'recruit') setLabelText('🤝 Tap to Recruit', '#66ffcc');
    else {
      const boss = ENEMIES.boss;
      setLabelText(`👻 Attack! HP: ${Math.max(1, Math.ceil(boss.hp))}`, '#ff6666');
    }
    GAME.label.spr.visible = true;
  } else {
    GAME.label.spr.visible = false;
  }
}

// ── Damage ──
function takeDamage() {
  if (STATE.invincible > 0) return;
  STATE.health--;
  STATE.invincible = 1.5;
  updateHealthUI();
  beep(120, 0.25, 'sawtooth');
  haptic('damage');
  addShake(0.45);
  uiShowCommand('OUCH!');
  particlesBurst(STATE.pos.x, STATE.pos.y, STATE.pos.z, 0xff2222, 10);
  if (STATE.health <= 0) {
    STATE.health = STATE.maxHealth;
    STATE.pos.set(0, 0.5, 0);
    STATE.vel.set(0, 0, 0);
    updateHealthUI();
    uiShowCommand('RESPAWNED!');
  }
}

// ── Interaction (tap / click / act button) ──
function onInteract(preTarget, allowSurface = true) {
  const target = preTarget || getHoverTarget();

  if (target) {
    if (target.type === 'collect') {
      const c = target.obj;
      returnCollectible(c);
      collectibles.splice(collectibles.indexOf(c), 1);
      STATE.score += 100; STATE.sticks += 1;
      updateHUD();
      beep(920, 0.07, 'sine');
      haptic('collect');
      addShake(0.08);
      uiShowCommand('+ GLITTER STICKER!');
      particlesBurst(STATE.pos.x, STATE.pos.y + 0.5, STATE.pos.z, 0xff66cc, 14);
      return;
    }
    if (target.type === 'recruit') {
      const t = targets.find((tt) => tt.body === target.obj);
      if (t) { squadRecruit(t); haptic('collect'); }
      return;
    }
    if (target.type === 'boss') { attackBoss(); return; }
  }

  if (!allowSurface) return;

  // Surface decal placement
  GAME.raycaster.setFromCamera(GAME.mouseNDC, STICKER.camera);
  const wHits = GAME.raycaster.intersectObjects(STICKER.worldGroup.children, true);
  if (wHits.length) {
    const pt = wHits[0].point;
    const normal = wHits[0].face.normal.clone().transformDirection(wHits[0].object.matrixWorld).normalize();
    decalPlace(pt, normal, DECAL_COLORS[STATE.selectedSticker % DECAL_COLORS.length]);
    beep(460, 0.05, 'triangle');
    haptic('stick');
    uiShowCommand('PLACED DECAL STICKER');
    STATE.sticks += 1;
    updateHUD();
  }
}

function attackBoss() {
  const boss = ENEMIES.boss;
  if (!boss || boss.dead) return;
  boss.hp--;
  particlesBurst(boss.obj.position.x, boss.obj.position.y, boss.obj.position.z, 0xffffff, 12);
  beep(200 + Math.max(0, boss.hp) * 150, 0.15, 'square');
  haptic('stick');
  addShake(0.25);
  if (boss.hp <= 0) {
    boss.dead = true;
    uiShowCommand('BOSS DEFEATED!');
    sfxWin();
    haptic('win');
  } else {
    uiShowCommand(`BOSS HP: ${Math.ceil(boss.hp)}`);
  }
}

// ── Progression ──
function levelAdvance() {
  if (STATE.levelIndex >= 4) {
    uiShowProgress('STICKER SQUAD COMPLETE!', 'You conquered all 5 worlds!', () => {
      STATE.levelIndex = -1;
      loadNextLevel();
    });
    return;
  }
  loadNextLevel();
}

function loadNextLevel() {
  let i = STATE.levelIndex + 1;
  if (i > 4) i = 0; // defensive wrap (normal flow goes through the completion overlay)
  if (i === 0) loadLevel0();
  else if (i === 1) loadLevel1();
  else if (i === 2) loadLevel2();
  else if (i === 3) loadLevel3();
  else if (i === 4) loadLevel4();
  STATE.levelIndex = i;
  SQUAD.members = [];
  squadUpdateUI();
}

function showLevelComplete() {
  uiShowProgress(`${LEVELS.names[STATE.levelIndex]} Complete!`, LEVELS.subs[STATE.levelIndex], () => {
    STATE.inPortal = false;
    levelAdvance();
  });
}

// ── Camera-relative movement basis ──
// Movement is relative to the camera's ACTUAL view direction (which lerps
// smoothly), NOT the player yaw — otherwise W induces a 180° yaw flip each
// frame and the player oscillates in place (the classic follow-cam bug).
function cameraViewYaw() {
  const dx = STATE.pos.x - STICKER.camera.position.x;
  const dz = STATE.pos.z - STICKER.camera.position.z;
  if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return STATE.yaw; // degenerate: camera directly overhead
  return Math.atan2(dx, dz); // direction camera → player = screen "up"
}

// ── Main Update ──
function gameUpdate(dt) {
  STATE.animTime += dt;
  const input = getInputDir();
  const speed = STATE.speed * (KEYS['shift'] ? STATE.sprintMult : 1) * (STATE.moveMag || 1);

  if (STATE.invincible > 0) STATE.invincible -= dt;

  // ── Movement (grounded / air / peeling) ──
  if (STATE.mode === 'grounded' || STATE.mode === 'air' || STATE.mode === 'peeling') {
    // Build movement basis from the camera's real view direction (+ user orbit)
    const viewYaw = cameraViewYaw() + (typeof TOUCH !== 'undefined' ? TOUCH.orbitYaw : 0);
    const fwd = new THREE.Vector3(Math.sin(viewYaw), 0, Math.cos(viewYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const moveDir = new THREE.Vector3()
      .addScaledVector(fwd, -input.z)
      .addScaledVector(right, input.x);
    if (input.length() > 0.1) {
      STATE.vel.x = moveDir.x * speed;
      STATE.vel.z = moveDir.z * speed;
      STATE.yaw = Math.atan2(moveDir.x, moveDir.z);
    } else {
      STATE.vel.x *= 0.82; STATE.vel.z *= 0.82;
    }
    STATE.vel.y -= 20 * dt;
    STATE.pos.addScaledVector(STATE.vel, dt);

    if (STATE.pos.y < STATE.height) {
      STATE.pos.y = STATE.height;
      STATE.vel.y = 0;
      if (!STATE.onGround) {
        beep(160, 0.08, 'square');
        haptic('tick');
        addShake(0.15); // landing thump
      }
      STATE.onGround = true;
      if (STATE.mode === 'air' || STATE.mode === 'peeling') {
        STATE.mode = 'grounded';
        uiUpdateModeBadge();
      }
    } else {
      STATE.onGround = false;
      STATE.mode = 'air';
      uiUpdateModeBadge();
    }
    const limit = 24;
    STATE.pos.x = Math.max(-limit, Math.min(limit, STATE.pos.x));
    STATE.pos.z = Math.max(-limit, Math.min(limit, STATE.pos.z));
  }

  // ── Movement (sticking) — also camera-relative ──
  if (STATE.mode === 'sticking') {
    const viewYaw = cameraViewYaw() + (typeof TOUCH !== 'undefined' ? TOUCH.orbitYaw : 0);
    const fwd = new THREE.Vector3(Math.sin(viewYaw), 0, Math.cos(viewYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const mv = new THREE.Vector3()
      .addScaledVector(fwd, -input.z)
      .addScaledVector(right, input.x);
    if (mv.lengthSq() > 0.0001) {
      mv.normalize().multiplyScalar(speed * dt);
      STATE.pos.add(mv);
    }
    if (STATE.pos.y < 0.03) STATE.pos.y = 0.03;
    if (STATE.pos.y > 15) STATE.pos.y = 15;
    const lim = 26;
    STATE.pos.x = Math.max(-lim, Math.min(lim, STATE.pos.x));
    STATE.pos.z = Math.max(-lim, Math.min(lim, STATE.pos.z));
  }

  // ── Portals ──
  let nearPortal = false;
  portals.forEach((p) => {
    const d = new THREE.Vector2(STATE.pos.x - p.position.x, STATE.pos.z - p.position.z).length();
    if (d < 1.8) nearPortal = true;
    p.children.forEach((c, i) => {
      if (i === 0) c.rotation.z += dt * (STATE.levelIndex === 4 ? 1 : 2);
    });
  });
  uiShowPortalHint(nearPortal && !STATE.inPortal);

  if (nearPortal && !STATE.inPortal) {
    STATE.inPortal = true;
    sfxPortal();
    haptic('stick');
    setTimeout(() => {
      if (STATE.levelIndex === 4) {
        const boss = ENEMIES.boss;
        if (boss && !boss.dead) {
          uiShowCommand('DEFEAT THE GHOST FIRST!');
          STATE.inPortal = false;
          return;
        }
      }
      showLevelComplete();
    }, 400);
  }
  if (!nearPortal) STATE.inPortal = false;

  // ── Enemies ──
  enemiesUpdate(dt);

  // ── Player Animation ──
  PLAYER.group.position.copy(STATE.pos);
  if (STATE.invincible > 0 && Math.floor(STATE.animTime * 10) % 2 === 0) {
    PLAYER.group.visible = false;
  } else {
    PLAYER.group.visible = true;
  }

  if (STATE.mode === 'grounded') {
    PLAYER.group.rotation.y = THREE.MathUtils.lerp(PLAYER.group.rotation.y, STATE.yaw + Math.PI, 0.25);
    if (input.length() > 0.1) {
      PLAYER.group.rotation.z = Math.sin(STATE.animTime * 10) * 0.1;
      PLAYER.group.position.y += Math.abs(Math.sin(STATE.animTime * 20)) * 0.03;
      PLAYER.legL.visible = true; PLAYER.legR.visible = true;
      PLAYER.legL.position.y = -0.1 + Math.sin(STATE.animTime * 14) * 0.04;
      PLAYER.legR.position.y = -0.1 + Math.sin(STATE.animTime * 14 + Math.PI) * 0.04;
    } else {
      PLAYER.group.rotation.z = THREE.MathUtils.lerp(PLAYER.group.rotation.z, 0, 0.2);
      PLAYER.legL.visible = false; PLAYER.legR.visible = false;
    }
    if (STATE.peelTimer > 0) {
      STATE.peelTimer -= dt;
      PLAYER.group.rotation.x = -STATE.peelTimer * 2.2;
    } else {
      PLAYER.group.rotation.x = THREE.MathUtils.lerp(PLAYER.group.rotation.x, 0, 0.2);
    }
  } else if (STATE.mode === 'air' || STATE.mode === 'peeling') {
    PLAYER.group.rotation.x = -STATE.vel.z * 0.035;
    PLAYER.group.rotation.z = STATE.vel.x * 0.035;
    PLAYER.legL.visible = true; PLAYER.legR.visible = true;
    PLAYER.legL.position.y = -0.08; PLAYER.legR.position.y = -0.12;
  } else if (STATE.mode === 'sticking') {
    PLAYER.group.rotation.set(0, 0, 0);
    const sp = STATE.stickPlane || new THREE.Vector3(0, 0, 1);
    PLAYER.group.lookAt(STATE.pos.clone().add(sp));
  }

  // Blink
  const blink = Math.sin(STATE.animTime * 1.3) > 0.97;
  PLAYER.eyeL.scale.y = blink ? 0.1 : 1;
  PLAYER.eyeR.scale.y = blink ? 0.1 : 1;

  // Shadow
  PLAYER.shadow.position.set(STATE.pos.x, 0.02, STATE.pos.z);
  const dist = STATE.pos.y - 0.5;
  PLAYER.shadow.scale.setScalar(Math.max(0.08, 0.4 - dist * 0.018));
  PLAYER.shadow.material.opacity = Math.max(0, 0.28 - dist * 0.009);

  // ── Collectibles ──
  collectibles.forEach((c, i) => {
    c.rotation.y += dt * 2.2;
    c.position.y += Math.sin(STATE.animTime * 2.5 + i) * 0.015;
  });

  // ── Targets ──
  targets.forEach((tgt) => {
    tgt.head.position.y = tgt.baseY + 1.1 + Math.sin(STATE.animTime * 2 + tgt.phase) * 0.08;
    tgt.head.rotation.y += dt;
    if (tgt.following) {
      tgt.followTimer -= dt;
      if (tgt.followTimer <= 0) tgt.following = false;
      const toP = STATE.pos.clone().sub(tgt.body.position);
      toP.y = 0;
      const d = toP.length();
      if (d > 2) {
        toP.normalize().multiplyScalar(2.2 * dt);
        tgt.body.position.add(toP); tgt.head.position.add(toP);
        tgt.baseY = tgt.body.position.y;
      }
    }
  });

  // ── Squad ──
  squadUpdate(dt);

  // ── Camera: follow BEHIND the player + user orbit/zoom + trauma shake ──
  // yaw + π puts the camera behind the player's facing (standard chase cam).
  // Without the π, screen-up inverts every camera swing and W oscillates.
  const orbit = typeof TOUCH !== 'undefined' ? TOUCH.orbitYaw : 0;
  const zoom = typeof TOUCH !== 'undefined' ? TOUCH.zoom : 1;
  const camAngle = STATE.yaw + Math.PI + orbit;
  const targetPos = STATE.pos.clone().add(new THREE.Vector3(0, 2.8, 0));
  const offset = new THREE.Vector3(0, 4.5, 7.5)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle)
    .multiplyScalar(zoom);
  const desired = targetPos.clone().add(offset);
  STICKER.camera.position.lerp(desired, 2.5 * dt);

  const sh = SHAKE.trauma * SHAKE.trauma * 0.35; // quadratic falloff = subtle when mild
  if (sh > 0.0005) {
    STICKER.camera.position.x += (Math.random() * 2 - 1) * sh;
    STICKER.camera.position.y += (Math.random() * 2 - 1) * sh;
    STICKER.camera.position.z += (Math.random() * 2 - 1) * sh;
  }
  SHAKE.trauma = Math.max(0, SHAKE.trauma - dt * 1.6);
  STICKER.camera.lookAt(targetPos);

  // ── Particles / Decals ──
  particlesUpdate(dt);
  decalsUpdate(dt);

  // ── Water ──
  if (water) water.position.y = -2.5 + Math.sin(STATE.animTime * 0.6) * 0.15;

  // ── Hover labels + contextual buttons ──
  updateHover();
  GAME.contextTimer -= dt;
  if (GAME.contextTimer <= 0) {
    GAME.contextTimer = 0.15;
    if (typeof refreshContextButtons === 'function') refreshContextButtons();
  }
}

// ── Render loop with fps cap (battery saver = 30fps) ──
let lastFrameTime = performance.now();
let frameAcc = 0;

function gameResetClock() {
  lastFrameTime = performance.now();
  frameAcc = 0;
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  let raw = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  if (raw > 0.25) raw = 0.016; // tab-switch / background protection
  frameAcc += raw;

  const interval = 1 / QUALITY.fpsCap - 0.002;
  if (frameAcc < interval) return; // frame skipped — that's the cap

  const dt = Math.min(frameAcc, 0.05);
  frameAcc = 0;
  gameUpdate(dt);
  STICKER.renderer.render(STICKER.scene, STICKER.camera);
}
