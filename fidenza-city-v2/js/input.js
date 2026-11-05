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
    this.touchFlyUp = false;
    this.touchFlyDown = false;
    this.touchAct = false;
    this.enabled = true;
    this.allowPointerLock = true;
    this.padKeys = new Set();
    this.padButtons = new Set();
    this.padActive = false;
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  _bindKeyboard() {
    const gameKeys = new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyF','KeyN','KeyM','KeyH','KeyP','KeyC','KeyV','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','Escape','BracketLeft','BracketRight']);
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
      this.touchFlyUp = this.touchFlyDown = false;
    });
  }

  _bindMouse() {
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
    this.canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (this.enabled && this.allowPointerLock && !this.pointerLocked && !this.isTouch()) {
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
      if (this.enabled && this.allowPointerLock && !this.pointerLocked && !this.isTouch()) {
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
      try { this.canvas.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
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
    const lookEnd = e => {
      if (e.pointerId !== lookId) return;
      lookId = null;
      try { this.canvas.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    };
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
    bindHold('btn-fly-up', 'touchFlyUp');
    bindHold('btn-fly-down', 'touchFlyDown');

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
    return this.keys.has(code) || this.padKeys.has(code);
  }

  pollGamepad() {
    if (!navigator.getGamepads) return;
    let pad = null;
    for (const candidate of navigator.getGamepads()) {
      if (candidate && candidate.connected) { pad = candidate; break; }
    }
    this.padKeys.clear();
    if (!pad) {
      this.padActive = false;
      this.padButtons.clear();
      return;
    }
    this.padActive = true;
    const dead = 0.22;
    const axis = i => Math.abs(pad.axes[i] || 0) > dead ? pad.axes[i] : 0;
    const ax = axis(0);
    const ay = axis(1);
    if (ay < -dead) this.padKeys.add('KeyW');
    if (ay > dead) this.padKeys.add('KeyS');
    if (ax < -dead) this.padKeys.add('KeyA');
    if (ax > dead) this.padKeys.add('KeyD');
    if (pad.buttons[12]?.pressed) this.padKeys.add('KeyW');
    if (pad.buttons[13]?.pressed) this.padKeys.add('KeyS');
    if (pad.buttons[14]?.pressed) this.padKeys.add('KeyA');
    if (pad.buttons[15]?.pressed) this.padKeys.add('KeyD');
    if (pad.buttons[1]?.pressed) this.padKeys.add('Space');
    if (pad.buttons[2]?.pressed) this.padKeys.add('ShiftLeft');
    if (pad.buttons[5]?.pressed) this.padKeys.add('KeyH');

    const pressed = new Set();
    const tapMap = {
      0: 'KeyE',
      3: 'KeyF',
      8: 'KeyN',
      9: 'Escape'
    };
    for (const [index, code] of Object.entries(tapMap)) {
      const down = !!pad.buttons[index]?.pressed;
      if (down) pressed.add(code);
      if (down && !this.padButtons.has(code)) this.justPressed.add(code);
    }
    this.padButtons = pressed;

    const lookX = axis(2);
    const lookY = axis(3);
    if (lookX) this.mouseDX += lookX * 13;
    if (lookY) this.mouseDY += lookY * 13;
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
    this.touchFlyUp = this.touchFlyDown = false;
  }
}
