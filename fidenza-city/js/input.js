import { clamp } from './utils.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.dragging = false;
    this.pointerLocked = false;
    this.touchMove = { x: 0, y: 0 };
    this.touchRun = false;
    this.touchBrake = false;
    this.touchHorn = false;
    this.touchAct = false;
    this.enabled = true;
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  _bindKeyboard() {
    const gameKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','KeyE','KeyF','KeyN','KeyM','KeyH','Escape','KeyP']);
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.closest('dialog[open]')) return;
      if (gameKeys.has(e.code)) e.preventDefault();
      if (!this.enabled) return;
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
    }, { passive: false });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchMove.x = this.touchMove.y = 0;
      this.touchRun = this.touchBrake = this.touchHorn = false;
    });
  }

  _bindMouse() {
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
    this.canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (this.enabled && !this.pointerLocked && !this.isTouch()) {
        try { const p = this.canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* ignore */ }
      }
      this.dragging = true;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (this.pointerLocked || this.dragging) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
    this.canvas.addEventListener('click', () => {
      if (this.enabled && !this.pointerLocked && !this.isTouch()) {
        try { const p = this.canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* ignore */ }
      }
    });
  }

  _bindTouch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    if (!stick || !knob) return;
    let activeId = null;
    let cx = 0, cy = 0, maxR = 46;

    const updateStick = (e) => {
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      const k = len > maxR ? maxR / len : 1;
      const kx = dx * k, ky = dy * k;
      knob.style.transform = `translate(${kx}px, ${ky}px)`;
      this.touchMove.x = clamp(kx / maxR, -1, 1);
      this.touchMove.y = clamp(ky / maxR, -1, 1);
    };

    stick.addEventListener('pointerdown', e => {
      activeId = e.pointerId;
      stick.setPointerCapture?.(e.pointerId);
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      maxR = r.width * 0.38;
      updateStick(e);
      e.preventDefault();
    });
    stick.addEventListener('pointermove', e => {
      if (e.pointerId !== activeId) return;
      updateStick(e);
      e.preventDefault();
    });
    const release = e => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      knob.style.transform = 'translate(0px, 0px)';
      this.touchMove.x = this.touchMove.y = 0;
    };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);

    // Trascinamento camera sul canvas (mobile)
    let lookId = null;
    let lastX = 0, lastY = 0;
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      if (lookId !== null) return;
      lookId = e.pointerId;
      lastX = e.clientX; lastY = e.clientY;
      e.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== lookId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      this.mouseDX += dx * 1.45;
      this.mouseDY += dy * 1.45;
      e.preventDefault();
    }, { passive: false });
    const lookEnd = e => { if (e.pointerId === lookId) lookId = null; };
    this.canvas.addEventListener('pointerup', lookEnd);
    this.canvas.addEventListener('pointercancel', lookEnd);

    const bindHold = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', e => { e.preventDefault(); this[prop] = true; el.setPointerCapture?.(e.pointerId); }, { passive: false });
      const off = e => { e.preventDefault(); this[prop] = false; };
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    bindHold('btn-run', 'touchRun');
    bindHold('btn-brake', 'touchBrake');
    bindHold('btn-horn', 'touchHorn');

    const carBtn = document.getElementById('btn-car');
    carBtn?.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.justPressed.add('KeyE');
    }, { passive: false });
    const actBtn = document.getElementById('btn-act');
    actBtn?.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.justPressed.add('KeyE');
    }, { passive: false });
  }

  isTouch() {
    return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consume(code) {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  consumeLook() {
    const out = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }

  clearFrame() {
    this.justPressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  reset() {
    this.keys.clear();
    this.justPressed.clear();
    this.touchMove.x = this.touchMove.y = 0;
    this.touchRun = this.touchBrake = this.touchHorn = false;
  }
}
