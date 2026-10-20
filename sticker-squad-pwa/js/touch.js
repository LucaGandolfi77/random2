// ============================================================
// TOUCH — Mobile Controls: joystick, contextual buttons,
// swipe-to-peel, tap-to-interact, pinch-zoom, drag-orbit
// ============================================================
const TOUCH = {
  enabled: false,
  // joystick (left thumb, floating)
  joyId: null, joyBaseX: 0, joyBaseY: 0, joyVec: { x: 0, y: 0 },
  // action pointer (right thumb: tap / drag / swipe)
  actionId: null, startX: 0, startY: 0, lastX: 0, lastY: 0,
  startTime: 0, moved: false, consumed: false, dragging: false,
  // camera gestures
  camPointers: new Map(), pinchStartDist: 0, pinchStartZoom: 1,
  orbitYaw: 0, zoom: 1,
  lastTapTime: 0, lastTouch: 0, firstGesture: false,
  contextTimer: 0,
  el: {},
};

const JOY_MAX_R = 42;   // px stick travel
const TAP_MS = 300;     // max tap duration
const TAP_SLOP = 12;    // px movement tolerated in a tap
const SWIPE_MS = 400;   // peel swipe window

function touchInit() {
  TOUCH.enabled = (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
  if (!TOUCH.enabled) return;
  document.body.classList.add('touch');

  TOUCH.el = {
    base: document.getElementById('joystick-base'),
    stick: document.getElementById('joystick-stick'),
    jump: document.getElementById('btn-jump'),
    stick: document.getElementById('btn-stick'),
    act: document.getElementById('btn-act'),
  };

  // Action buttons — stopPropagation so they never spawn joystick/camera gestures
  TOUCH.el.jump.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); playerJump(); });
  TOUCH.el.stick.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); toggleStickMode(); });
  TOUCH.el.act.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault();
    onInteract(GAME.hovered, false);
  });

  // Decal swatches
  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); e.preventDefault();
      STATE.selectedSticker = parseInt(sw.dataset.i);
      document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      beep(600, 0.05, 'sine', 0.03);
      haptic('tick');
    });
  });

  document.addEventListener('pointerdown', onTouchDown, { passive: false });
  document.addEventListener('pointermove', onTouchMove, { passive: false });
  document.addEventListener('pointerup', onTouchUp);
  document.addEventListener('pointercancel', onTouchUp);
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Fullscreen + landscape lock on first gesture (best-effort, iOS ignores gracefully)
function tryImmersive() {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* no-op */ }
}

function onTouchDown(e) {
  TOUCH.lastTouch = performance.now();
  if (e.pointerType !== 'touch') return;
  e.preventDefault();

  if (!TOUCH.firstGesture) {
    TOUCH.firstGesture = true;
    tryImmersive();
    resumeAudio();
    uiShowCommand('⬅️ Left: move • Right: jump & stick ➡️');
  }

  // Left 45% of screen = joystick zone
  if (e.clientX < innerWidth * 0.45 && TOUCH.joyId === null) {
    TOUCH.joyId = e.pointerId;
    TOUCH.joyBaseX = e.clientX;
    TOUCH.joyBaseY = e.clientY;
    TOUCH.joyVec.x = 0; TOUCH.joyVec.y = 0;
    TOUCH.el.base.style.left = (e.clientX - 56) + 'px';
    TOUCH.el.base.style.top = (e.clientY - 56) + 'px';
    TOUCH.el.base.style.transform = 'translate(0px, 0px)';
    TOUCH.el.stick.style.transform = 'translate(0px, 0px)';
    TOUCH.el.base.classList.add('active');
    return;
  }

  // Right side = action pointer (tap / orbit / swipe / pinch)
  if (!TOUCH.camPointers.has(e.pointerId)) {
    TOUCH.camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (TOUCH.actionId === null) {
      TOUCH.actionId = e.pointerId;
      TOUCH.startX = TOUCH.lastX = e.clientX;
      TOUCH.startY = TOUCH.lastY = e.clientY;
      TOUCH.startTime = performance.now();
      TOUCH.moved = false; TOUCH.consumed = false; TOUCH.dragging = false;
    }
    // second finger → begin pinch
    if (TOUCH.camPointers.size === 2) {
      const pts = [...TOUCH.camPointers.values()];
      TOUCH.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      TOUCH.pinchStartZoom = TOUCH.zoom;
      TOUCH.dragging = true; // pinch cancels tap
    }
  }
}

function onTouchMove(e) {
  if (e.pointerType !== 'touch') return;
  e.preventDefault();

  // Joystick
  if (e.pointerId === TOUCH.joyId) {
    let dx = e.clientX - TOUCH.joyBaseX;
    let dy = e.clientY - TOUCH.joyBaseY;
    const len = Math.hypot(dx, dy);
    if (len > JOY_MAX_R) { dx = (dx / len) * JOY_MAX_R; dy = (dy / len) * JOY_MAX_R; }
    TOUCH.joyVec.x = dx / JOY_MAX_R;
    TOUCH.joyVec.y = dy / JOY_MAX_R;
    TOUCH.el.stick.style.transform = `translate(${dx}px, ${dy}px)`;
    return;
  }

  // Camera / action pointer
  const rec = TOUCH.camPointers.get(e.pointerId);
  if (!rec) return;
  rec.x = e.clientX; rec.y = e.clientY;

  if (TOUCH.camPointers.size >= 2) {
    // Pinch zoom: fingers apart = zoom in, together = out
    const pts = [...TOUCH.camPointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (TOUCH.pinchStartDist > 0) {
      TOUCH.zoom = Math.max(0.55, Math.min(1.9, (TOUCH.pinchStartZoom * TOUCH.pinchStartDist) / Math.max(20, d)));
    }
    return;
  }

  if (e.pointerId === TOUCH.actionId) {
    const dx = e.clientX - TOUCH.startX;
    const dy = e.clientY - TOUCH.startY;
    if (!TOUCH.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) TOUCH.moved = true;

    // Swipe-up while stuck = buttery peel
    if (STATE.mode === 'sticking' && !TOUCH.consumed &&
        dy < -45 && Math.abs(dx) < 40 && performance.now() - TOUCH.startTime < SWIPE_MS) {
      TOUCH.consumed = true; TOUCH.dragging = true;
      playerPeel();
      return;
    }

    // Drag horizontally = orbit camera
    if (TOUCH.moved && !TOUCH.consumed) {
      TOUCH.orbitYaw -= (e.clientX - TOUCH.lastX) * 0.006;
      TOUCH.dragging = true;
    }
    TOUCH.lastX = e.clientX;
    TOUCH.lastY = e.clientY;
  }
}

function onTouchUp(e) {
  if (e.pointerType !== 'touch') return;
  TOUCH.lastTouch = performance.now();

  // Release joystick
  if (e.pointerId === TOUCH.joyId) {
    TOUCH.joyId = null;
    TOUCH.joyVec.x = 0; TOUCH.joyVec.y = 0;
    TOUCH.el.base.classList.remove('active'); // fades out (0.2s hide delay)
    return;
  }

  if (!TOUCH.camPointers.has(e.pointerId)) return;
  TOUCH.camPointers.delete(e.pointerId);

  if (e.pointerId === TOUCH.actionId) {
    const dt = performance.now() - TOUCH.startTime;
    const wasPinch = TOUCH.camPointers.size >= 1 && TOUCH.dragging;

    // Clean tap = interact at tap position
    if (!TOUCH.moved && !TOUCH.consumed && !TOUCH.dragging && dt < TAP_MS) {
      GAME.mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
      GAME.mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;

      // Double-tap resets camera view
      if (performance.now() - TOUCH.lastTapTime < 300) {
        TOUCH.orbitYaw = 0;
        TOUCH.zoom = 1;
        uiShowCommand('📷 CAMERA RESET');
        haptic('tick');
      } else {
        onInteract(null, true);
      }
      TOUCH.lastTapTime = performance.now();
    }

    TOUCH.actionId = null;
    TOUCH.dragging = false;
  }
}

// ── Contextual buttons: morph into whatever's relevant (refreshed ~7x/s) ──
function refreshContextButtons() {
  if (!TOUCH.enabled) return;
  const { jump, stick, act } = TOUCH.el;

  jump.classList.toggle('disabled', !STATE.onGround);

  if (STATE.mode === 'sticking') {
    stick.textContent = '🌀';           // becomes PEEL
    stick.classList.remove('disabled');
  } else {
    stick.textContent = '🧲';           // STICK (only enabled near a wall)
    stick.classList.toggle('disabled', !findStickableWall());
  }

  const h = GAME.hovered;
  act.textContent = h ? ({ collect: '⭐', recruit: '🤝', boss: '👻' })[h.type] : '✋';
  act.classList.toggle('disabled', !h);
}
