import * as THREE from 'three';
import { clamp } from './utils.js';

/**
 * Input unificato: tastiera, mouse, touch, gamepad.
 * Espone sempre lo stesso stato: {x, y, mag} + azioni (pulse, pausa, mute).
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mode = 'keys'; // keys | mouse | touch | pad
    this.vec = { x: 0, y: 0, mag: 0 };
    this.touch = { x: 0, y: 0, mag: 0 };
    this.actions = {};
    this._ray = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();
    this._ndc = new THREE.Vector2();
    this._pointer = new THREE.Vector2();
    this._hasPointer = false;
    this._bind();
  }

  on(name, fn) {
    (this.actions[name] ||= []).push(fn);
    return this;
  }

  emit(name, arg) {
    for (const fn of this.actions[name] || []) fn(arg);
  }

  _bind() {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k)
      ) {
        e.preventDefault();
      }
      if (!this.keys.has(k)) {
        if (k === ' ') this.emit('pulse');
        if (k === 'p' || k === 'escape') this.emit('pause');
        if (k === 'm') this.emit('mute');
        if (k === 'enter') this.emit('confirm');
        if (k === ' ') this.emit('confirm');
      }
      this.keys.add(k);
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.mode = 'keys';
      }
    };
    const up = (e) => this.keys.delete(e.key.toLowerCase());

    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => this.keys.clear());

    const move = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this._pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
      this._hasPointer = true;
      if (e.pointerType !== 'touch') this.mode = 'mouse';
    };
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerdown', (e) => {
      move(e);
      this.emit('tap');
    });
  }

  /** Rende il puntatore del mouse "mira" sul piano di terra. */
  screenToGround(ndc, camera) {
    this._ndc.copy(ndc);
    this._ray.setFromCamera(this._ndc, camera);
    const hit = this._ray.ray.intersectPlane(this._plane, this._hit);
    return hit ? this._hit : null;
  }

  get hasPointer() {
    return this._hasPointer;
  }

  get pointerNdc() {
    return this._pointer;
  }

  /** Calcola il vettore di movimento di questo frame. */
  sample(camera, dt) {
    const out = this.vec;
    let x = 0;
    let z = 0;

    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) z -= 1;
    if (k.has('s') || k.has('arrowdown')) z += 1;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (x || z) {
      this.mode = 'keys';
      const len = Math.hypot(x, z);
      out.x = x / len;
      out.y = z / len;
      out.mag = 1;
      return out;
    }

    if (this.touch.mag > 0.02) {
      this.mode = 'touch';
      out.x = this.touch.x;
      out.y = this.touch.y;
      out.mag = clamp(this.touch.mag, 0, 1);
      return out;
    }

    const pad = this._gamepad();
    if (pad) {
      this.mode = 'pad';
      out.x = pad[0];
      out.y = pad[1];
      out.mag = clamp(Math.hypot(out.x, out.y), 0, 1);
      if (out.mag > 0.15) return out;
    }

    out.mag = 0;
    out.x = 0;
    out.y = 0;
    return out;
  }

  _gamepad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const p of pads) {
      if (!p) continue;
      const x = p.axes[0] ?? 0;
      const y = p.axes[1] ?? 0;
      if (Math.abs(x) > 0.18 || Math.abs(y) > 0.18) return [x, y];
      const b = p.buttons[0]?.pressed;
      if (b) return [0, 0.001];
    }
    return null;
  }
}
