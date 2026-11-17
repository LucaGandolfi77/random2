/* Touch / mouse / keyboard / gamepad input for Machine Hunt.
 * Drag anywhere to move relative to the touch-down point; a tap or hold that
 * barely moves charges and releases the special shot. A virtual joystick and
 * charge button support the Stick and One-hand schemes.
 */
const DEAD_ZONE = 9;
const DRAG_RANGE = 70;

/* Pure helper, exported for headless tests. */
export function joystickVector(cx, cy, x, y, range = DRAG_RANGE) {
  let dx = x - cx;
  let dy = y - cy;
  const len = Math.hypot(dx, dy);
  if (len <= DEAD_ZONE) return { dx: 0, dy: 0, length: 0 };
  if (len > range) { dx = (dx / len) * range; dy = (dy / len) * range; }
  return { dx: dx / range, dy: dy / range, length: Math.min(1, len / range) };
}

export function createInput(canvas, handlers = {}) {
  const keys = new Set();
  let pointerId = null;
  let ax = 0;
  let ay = 0;
  let x = 0;
  let y = 0;
  let downAt = 0;
  let moved = false;
  let charge = 0;
  let stickVector = { dx: 0, dy: 0 };
  let stickPointer = null;

  const scheme = () => handlers.scheme?.() || "drag";
  const sensitivity = () => handlers.sensitivity?.() || 1;
  const applySensitivity = (v) => Math.max(-1, Math.min(1, v * sensitivity()));

  const emitMove = () => {
    if (!handlers.onMove) return;
    let dx = x - ax;
    let dy = y - ay;
    const len = Math.hypot(dx, dy);
    if (len > DRAG_RANGE) { dx = (dx / len) * DRAG_RANGE; dy = (dy / len) * DRAG_RANGE; }
    handlers.onMove(applySensitivity(dx / DRAG_RANGE), applySensitivity(dy / DRAG_RANGE));
  };

  function down(event) {
    if (pointerId !== null || scheme() !== "drag") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerId = event.pointerId;
    ax = x = event.clientX;
    ay = y = event.clientY;
    downAt = performance.now();
    moved = false;
    charge = 0;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* already gone */ }
    event.preventDefault();
  }

  function move(event) {
    if (event.pointerId !== pointerId) return;
    x = event.clientX;
    y = event.clientY;
    if (Math.hypot(x - ax, y - ay) > DEAD_ZONE) moved = true;
    if (moved) emitMove();
    else charge = Math.min(1, (performance.now() - downAt) / 900);
    event.preventDefault();
  }

  function up(event) {
    if (event.pointerId !== pointerId) return;
    const id = pointerId;
    pointerId = null;
    const held = (performance.now() - downAt) / 1000;
    try { canvas.releasePointerCapture(id); } catch { /* already gone */ }
    charge = 0;
    if (handlers.onMove) handlers.onMove(0, 0);
    if (!moved && handlers.onChargedShot) {
      handlers.onChargedShot(Math.min(1, 0.25 + held * 0.75));
    }
    event.preventDefault();
  }

  function keyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "Escape" && handlers.onPause) handlers.onPause();
    if (event.code === "Space" && handlers.onChargedShot) handlers.onChargedShot(1);
  }
  function keyUp(event) { keys.delete(event.code); }
  const clear = () => { keys.clear(); };

  /* --------------------------------------------------------- virtual stick */

  const joystick = handlers.joystick;
  function stickDown(event) {
    if (!joystick || scheme() === "drag") return;
    stickPointer = event.pointerId;
    try { joystick.setPointerCapture(event.pointerId); } catch { /* noop */ }
    stickMove(event);
    event.preventDefault();
  }
  function stickMove(event) {
    if (!joystick || event.pointerId !== stickPointer) return;
    const rect = joystick.getBoundingClientRect();
    const v = joystickVector(
      rect.left + rect.width / 2, rect.top + rect.height / 2,
      event.clientX, event.clientY, rect.width / 2
    );
    stickVector = { dx: applySensitivity(v.dx), dy: applySensitivity(v.dy) };
    charge = v.length * 0.25;
    handlers.onMove?.(stickVector.dx, stickVector.dy);
    event.preventDefault();
  }
  function stickUp(event) {
    if (event.pointerId !== stickPointer) return;
    stickPointer = null;
    stickVector = { dx: 0, dy: 0 };
    charge = 0;
    handlers.onMove?.(0, 0);
    event.preventDefault();
  }
  joystick?.addEventListener("pointerdown", stickDown, { passive: false });
  joystick?.addEventListener("pointermove", stickMove, { passive: false });
  joystick?.addEventListener("pointerup", stickUp, { passive: false });
  joystick?.addEventListener("pointercancel", stickUp, { passive: false });
  joystick?.addEventListener("lostpointercapture", stickUp);

  function chargeDown(event) {
    if (scheme() === "drag") return;
    handlers.onChargedShot?.(1);
    event.preventDefault();
  }
  handlers.chargeButton?.addEventListener("pointerdown", chargeDown, { passive: false });

  canvas.addEventListener("pointerdown", down, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: false });
  canvas.addEventListener("pointerup", up, { passive: false });
  canvas.addEventListener("pointercancel", up, { passive: false });
  canvas.addEventListener("lostpointercapture", up);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", clear);

  return {
    charge() { return charge; },
    state() {
      let dx = 0;
      let dy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
      if (dx || dy) return { dx: applySensitivity(dx), dy: applySensitivity(dy) };
      return { dx: stickVector.dx * sensitivity(), dy: stickVector.dy * sensitivity() };
    },
    gamepad() {
      const pads = navigator.getGamepads?.() || [];
      const pad = [...pads].find(Boolean);
      if (!pad) return null;
      const dead = (v) => Math.abs(v) < 0.18 ? 0 : v;
      return {
        dx: applySensitivity(dead(pad.axes[0] || 0)),
        dy: applySensitivity(dead(pad.axes[1] || 0)),
        charge: !!pad.buttons[0]?.pressed,
        dodge: !!pad.buttons[1]?.pressed,
        nextWeapon: !!pad.buttons[5]?.pressed,
        prevWeapon: !!pad.buttons[4]?.pressed,
        pause: !!pad.buttons[9]?.pressed,
      };
    },
    destroy() {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      joystick?.removeEventListener("pointerdown", stickDown);
      joystick?.removeEventListener("pointermove", stickMove);
      joystick?.removeEventListener("pointerup", stickUp);
      joystick?.removeEventListener("pointercancel", stickUp);
      joystick?.removeEventListener("lostpointercapture", stickUp);
      handlers.chargeButton?.removeEventListener("pointerdown", chargeDown);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear);
    },
  };
}
