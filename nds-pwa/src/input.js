/* ===== Input: on-screen buttons, keyboard and touchscreen ===== */
import { SCREEN_W, SCREEN_H, BUTTONS, BUTTON_NAMES, KEY_MAP } from './config.js';

export class InputManager {
    constructor(opts = {}) {
        this.bottomCanvas = opts.bottomCanvas;
        this.onPress = opts.onPress || (() => {});   // (buttonName) => void

        this.pointers = new Map();   // pointerId -> button name
        this.keys = new Set();       // button names held via keyboard
        this.touchPointers = new Set();
        this.touch = { x: SCREEN_W / 2, y: SCREEN_H / 2, down: false };
        this.buttonEls = new Map();  // button name -> [elements]

        document.querySelectorAll('[data-button]').forEach((el) => {
            const name = el.dataset.button;
            if (!BUTTON_NAMES.includes(name)) return;
            if (!this.buttonEls.has(name)) this.buttonEls.set(name, []);
            this.buttonEls.get(name).push(el);
            el.addEventListener('pointerdown', (e) => this._buttonDown(e, name, el));
            el.addEventListener('pointerup', (e) => this._buttonUp(e));
            el.addEventListener('pointercancel', (e) => this._buttonUp(e));
            el.addEventListener('lostpointercapture', (e) => this._buttonUp(e));
            el.addEventListener('contextmenu', (e) => e.preventDefault());
        });

        window.addEventListener('keydown', (e) => this._keyDown(e));
        window.addEventListener('keyup', (e) => this._keyUp(e));
        window.addEventListener('blur', () => this.releaseAll());

        if (this.bottomCanvas) {
            const c = this.bottomCanvas;
            c.addEventListener('pointerdown', (e) => this._touchDown(e, c));
            c.addEventListener('pointermove', (e) => this._touchMove(e, c));
            c.addEventListener('pointerup', (e) => this._touchUp(e));
            c.addEventListener('pointercancel', (e) => this._touchUp(e));
            c.addEventListener('lostpointercapture', (e) => this._touchUp(e));
            c.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    _buttonDown(e, name, el) {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        this.pointers.set(e.pointerId, name);
        this._paint(name, true);
        this.onPress(name);
    }

    _buttonUp(e) {
        const name = this.pointers.get(e.pointerId);
        if (!name) return;
        this.pointers.delete(e.pointerId);
        // keep it visually pressed if another pointer/key still holds it
        if (!this._isHeld(name)) this._paint(name, false);
    }

    _keyDown(e) {
        const name = KEY_MAP[e.key.toLowerCase()];
        if (!name) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        e.preventDefault();
        if (!this.keys.has(name)) {
            this.keys.add(name);
            this._paint(name, true);
            this.onPress(name);
        }
    }

    _keyUp(e) {
        const name = KEY_MAP[e.key.toLowerCase()];
        if (!name) return;
        this.keys.delete(name);
        if (!this._isHeld(name)) this._paint(name, false);
    }

    _touchDown(e, canvas) {
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        this.touchPointers.add(e.pointerId);
        this._updateTouch(e, canvas);
        this.touch.down = true;
    }

    _touchMove(e, canvas) {
        if (!this.touchPointers.has(e.pointerId)) return;
        e.preventDefault();
        this._updateTouch(e, canvas);
    }

    _touchUp(e) {
        if (!this.touchPointers.has(e.pointerId)) return;
        this.touchPointers.delete(e.pointerId);
        if (this.touchPointers.size === 0) this.touch.down = false;
    }

    _updateTouch(e, canvas) {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        this.touch.x = Math.max(0, Math.min(SCREEN_W, ((e.clientX - r.left) / r.width) * SCREEN_W));
        this.touch.y = Math.max(0, Math.min(SCREEN_H, ((e.clientY - r.top) / r.height) * SCREEN_H));
    }

    _isHeld(name) {
        if (this.keys.has(name)) return true;
        for (const n of this.pointers.values()) if (n === name) return true;
        return false;
    }

    _paint(name, active) {
        const els = this.buttonEls.get(name) || [];
        for (const el of els) el.classList.toggle('active', active);
    }

    releaseAll() {
        this.pointers.clear();
        this.keys.clear();
        this.touchPointers.clear();
        this.touch.down = false;
        for (const name of BUTTON_NAMES) this._paint(name, false);
    }

    getInput() {
        let buttons = 0;
        for (const [pointerId, name] of this.pointers) {
            if (name in BUTTONS) buttons |= BUTTONS[name];
        }
        for (const name of this.keys) {
            if (name in BUTTONS) buttons |= BUTTONS[name];
        }
        return { buttons, touch: { ...this.touch } };
    }
}
