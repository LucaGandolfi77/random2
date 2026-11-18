export interface MobileActions {
  interact: () => void;
  light: () => void;
  phone: () => void;
  crouch: () => void;
  sprint: () => void;
  pause: () => void;
}

/** Touch joystick + look area + large thumb buttons. Desktop ignores this. */
export class MobileInput {
  move = { x: 0, y: 0 };
  lookDelta = { x: 0, y: 0 };
  crouching = false;
  sprinting = false;
  private joyId: number | null = null;
  private lookId: number | null = null;
  private root: HTMLElement;

  constructor(container: HTMLElement, private actions: MobileActions) {
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls hidden';
    this.root.innerHTML = `
      <div class="joystick-zone"><div class="joystick-base"><div class="joystick-knob"></div></div></div>
      <div class="look-zone"></div>
      <div class="action-buttons">
        <button class="action-btn" data-a="sprint">Run</button>
        <button class="action-btn" data-a="interact">Use</button>
        <button class="action-btn" data-a="crouch">Duck</button>
        <button class="action-btn phone-btn" data-a="phone">Phone</button>
        <button class="action-btn" data-a="light">Light</button>
        <button class="action-btn" data-a="pause">Menu</button>
      </div>
      <div class="orientation-hint">Landscape recommended</div>`;
    container.appendChild(this.root);
    this.bind();
  }

  get visible() { return !this.root.classList.contains('hidden'); }
  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  private bind() {
    const zone = this.root.querySelector('.joystick-zone') as HTMLElement;
    const base = this.root.querySelector('.joystick-base') as HTMLElement;
    const knob = this.root.querySelector('.joystick-knob') as HTMLElement;
    const look = this.root.querySelector('.look-zone') as HTMLElement;

    const updateJoy = (e: PointerEvent) => {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width / 2 - 6;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / max;
      this.move.y = -dy / max;
    };
    zone.addEventListener('pointerdown', (e) => { this.joyId = e.pointerId; zone.setPointerCapture(e.pointerId); updateJoy(e); });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) updateJoy(e); });
    const endJoy = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.move.x = this.move.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    zone.addEventListener('pointerup', endJoy);
    zone.addEventListener('pointercancel', endJoy);

    let lx = 0, ly = 0;
    look.addEventListener('pointerdown', (e) => { this.lookId = e.pointerId; lx = e.clientX; ly = e.clientY; look.setPointerCapture(e.pointerId); });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookDelta.x += (e.clientX - lx) * 0.0042;
      this.lookDelta.y += (e.clientY - ly) * 0.0042;
      lx = e.clientX; ly = e.clientY;
    });
    const endLook = (e: PointerEvent) => { if (e.pointerId === this.lookId) this.lookId = null; };
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);

    this.root.querySelectorAll<HTMLButtonElement>('.action-btn').forEach((btn) => {
      const action = btn.dataset.a as keyof MobileActions;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (action === 'crouch') { this.crouching = !this.crouching; btn.classList.toggle('on', this.crouching); }
        if (action === 'sprint') { this.sprinting = true; btn.classList.add('on'); }
        (this.actions[action] as () => void)();
      });
      btn.addEventListener('pointerup', () => {
        if (action === 'sprint') { this.sprinting = false; btn.classList.remove('on'); }
      });
    });
  }
}
