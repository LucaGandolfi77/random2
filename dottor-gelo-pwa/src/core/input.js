/*
 * Pointer handling for the diorama: one finger pans, two fingers pinch,
 * a short tap is a room selection. DOM buttons never reach this class.
 */
export class Input {
  constructor(canvas, { onTap, onPan, onZoom } = {}) {
    this.canvas = canvas;
    this.onTap = onTap;
    this.onPan = onPan;
    this.onZoom = onZoom;
    this.pointers = new Map();
    this.down = null;
    this.pinch = null;

    this._down = (e) => this.pointerDown(e);
    this._move = (e) => this.pointerMove(e);
    this._up = (e) => this.pointerUp(e);
    this._wheel = (e) => this.wheel(e);
    canvas.addEventListener('pointerdown', this._down, { passive: false });
    canvas.addEventListener('pointermove', this._move, { passive: false });
    canvas.addEventListener('pointerup', this._up);
    canvas.addEventListener('pointercancel', this._up);
    canvas.addEventListener('wheel', this._wheel, { passive: false });
    canvas.style.touchAction = 'none';
  }

  pointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    } else if (this.pointers.size === 2) {
      this.pinch = this.pinchState();
    }
    e.preventDefault();
  }

  pointerMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 1) {
      if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 7) this.down.moved = true;
      this.onPan?.(dx, dy);
    } else if (this.pointers.size === 2) {
      const next = this.pinchState();
      if (this.pinch) this.onZoom?.(next.dist / this.pinch.dist, {
        x: (next.cx + this.pinch.cx) / 2,
        y: (next.cy + this.pinch.cy) / 2,
      });
      this.pinch = next;
      this.down.moved = true;
    }
    e.preventDefault();
  }

  pinchState() {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  }

  pointerUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size === 0 && this.down) {
      const dx = e.clientX - this.down.x;
      const dy = e.clientY - this.down.y;
      const moved = this.down.moved || Math.hypot(dx, dy) > 7;
      const quick = performance.now() - this.down.t < 520;
      if (!moved && quick) this.onTap?.(e.clientX, e.clientY);
      this.down = null;
    }
  }

  wheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    this.onZoom?.(delta, { x: e.clientX, y: e.clientY });
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._down);
    this.canvas.removeEventListener('pointermove', this._move);
    this.canvas.removeEventListener('pointerup', this._up);
    this.canvas.removeEventListener('pointercancel', this._up);
    this.canvas.removeEventListener('wheel', this._wheel);
  }
}
