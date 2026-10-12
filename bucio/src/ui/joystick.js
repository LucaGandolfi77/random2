/**
 * Comandi touch: joystick a sinistra, pulsante onda a destra.
 * Scrive direttamente in input.touch, così il resto del gioco non cambia.
 */
export class TouchControls {
  constructor(input, { onPulse }) {
    this.input = input;
    this.onPulse = onPulse;
    this.root = document.getElementById('touch');
    this.stick = document.getElementById('stick');
    this.knob = document.getElementById('stick-knob');
    this.pulseBtn = document.getElementById('pulse-btn');
    this.active = null;
    this._bind();
  }

  _bind() {
    const move = (e) => {
      if (!this.active) return;
      e.preventDefault();
      const r = this.stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = r.width * 0.42;
      const d = Math.hypot(dx, dy);
      if (d > max) {
        dx = (dx / d) * max;
        dy = (dy / d) * max;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.touch.x = dx / max;
      this.input.touch.y = dy / max;
      this.input.touch.mag = Math.min(1, d / max);
    };

    const end = () => {
      this.active = null;
      this.knob.style.transform = '';
      this.input.touch.mag = 0;
      this.input.touch.x = 0;
      this.input.touch.y = 0;
    };

    this.stick.addEventListener(
      'pointerdown',
      (e) => {
        this.active = e.pointerId;
        this.stick.setPointerCapture(e.pointerId);
        move(e);
      },
      { passive: false }
    );
    this.stick.addEventListener('pointermove', move, { passive: false });
    this.stick.addEventListener('pointerup', end);
    this.stick.addEventListener('pointercancel', end);
    this.stick.addEventListener('lostpointercapture', end);

    this.pulseBtn.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        this.onPulse?.();
      },
      { passive: false }
    );
  }

  show(on) {
    this.root.hidden = !on;
    if (!on) {
      this.input.touch.mag = 0;
      this.knob.style.transform = '';
    }
  }

  setPulseReady(on) {
    this.pulseBtn.classList.toggle('ready', on);
  }
}