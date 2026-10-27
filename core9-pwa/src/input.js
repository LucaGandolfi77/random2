/*
 * CORE 9 — one-finger map controls.
 *
 * Tap selects a plot, drag pans, pinch zooms, mouse wheel zooms. The canvas
 * owns the gesture; the UI lives above it and gets first refusal on every
 * pointer that lands on a button.
 */

export function bindInput(canvas, handlers) {
  const pointers = new Map();
  let tap = null;
  let pinch = null;
  let lastPan = { x: 0, y: 0 };

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener("pointerdown", (e) => {
    const p = local(e);
    pointers.set(e.pointerId, p);
    canvas.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) {
      tap = { x: p.x, y: p.y, t: performance.now(), moved: 0 };
      lastPan = p;
    } else if (pointers.size === 2) {
      const arr = [...pointers.values()];
      pinch = {
        distance: Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y),
        zoom: handlers.getZoom(),
      };
      tap = null;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.set(e.pointerId, p);

    if (pointers.size >= 2 && pinch) {
      const arr = [...pointers.values()];
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      if (pinch.distance > 1) {
        const target = pinch.distance / Math.max(1, d);
        handlers.setZoom(pinch.zoom * target);
      }
      return;
    }

    if (pointers.size === 1 && tap) {
      const dx = p.x - lastPan.x;
      const dy = p.y - lastPan.y;
      tap.moved += Math.abs(dx) + Math.abs(dy);
      if (tap.moved > 4) {
        handlers.pan(dx, dy);
        lastPan = p;
      }
    }
  });

  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (tap && pointers.size === 0) {
      const dt = performance.now() - tap.t;
      const dist = Math.hypot(p.x - tap.x, p.y - tap.y);
      if (dt < 650 && dist < 9 && tap.moved < 12) handlers.tap(p.x, p.y);
      tap = null;
    }
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", (e) => {
    pointers.delete(e.pointerId);
    tap = null;
    pinch = null;
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const f = Math.exp(-e.deltaY * 0.001);
    handlers.zoom(f);
  }, { passive: false });

  /* Keyboard is a courtesy for desktop, not a requirement. */
  window.addEventListener("keydown", (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === "r" || e.key === "R") handlers.rotate();
    if (e.key === "+" || e.key === "=") handlers.zoom(1.12);
    if (e.key === "-" || e.key === "_") handlers.zoom(0.89);
    if (e.key === "c" || e.key === "C") handlers.collect();
    if (e.key === "Escape") handlers.escape();
  });
}
