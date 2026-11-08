import type { InputManager, TouchInputState } from '../core/input/InputManager';

const BUTTONS: Array<{ key: keyof TouchInputState; label: string; className: string }> = [
  { key: 'jump', label: 'JUMP', className: 'touch-jump' },
  { key: 'attack', label: 'ATK', className: 'touch-attack' },
  { key: 'special', label: 'SPEC', className: 'touch-special' },
  { key: 'strong', label: 'STRONG', className: 'touch-strong' },
  { key: 'shield', label: 'SHIELD', className: 'touch-shield' },
  { key: 'grab', label: 'GRAB', className: 'touch-grab' },
  { key: 'taunt', label: 'HYPE', className: 'touch-hype' },
];

export class TouchControls {
  readonly root: HTMLDivElement;
  private stick: HTMLElement;
  private knob: HTMLElement;
  private state: TouchInputState = {
    active: true,
    moveX: 0,
    moveY: 0,
    jump: false,
    attack: false,
    strong: false,
    special: false,
    shield: false,
    grab: false,
    taunt: false,
  };
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private maxRadius = 56;
  private visible = false;

  constructor(parent: HTMLElement, private readonly input: InputManager, private readonly onPause: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'touch-controls';
    this.root.innerHTML = `
      <button class="touch-pause" aria-label="Pause">II</button>
      <div class="touch-stick"><div class="touch-knob"></div></div>
      <div class="touch-buttons"></div>
    `;
    parent.appendChild(this.root);
    this.stick = this.root.querySelector('.touch-stick') as HTMLElement;
    this.knob = this.root.querySelector('.touch-knob') as HTMLElement;
    const buttonLayer = this.root.querySelector('.touch-buttons') as HTMLElement;
    for (const entry of BUTTONS) {
      const button = document.createElement('button');
      button.className = `touch-button ${entry.className}`;
      button.textContent = entry.label;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        (this.state[entry.key] as boolean) = true;
        button.classList.add('pressed');
        this.sync();
      });
      const release = (event: PointerEvent) => {
        event.preventDefault();
        (this.state[entry.key] as boolean) = false;
        button.classList.remove('pressed');
        this.sync();
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
      buttonLayer.appendChild(button);
    }
    this.root.querySelector('.touch-pause')?.addEventListener('click', () => this.onPause());

    this.stick.addEventListener('pointerdown', this.onStickDown);
    this.stick.addEventListener('pointermove', this.onStickMove);
    this.stick.addEventListener('pointerup', this.onStickUp);
    this.stick.addEventListener('pointercancel', this.onStickUp);

    this.root.classList.remove('visible');
    this.input.setTouchInput(this.state);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.classList.toggle('visible', visible);
    if (!visible) this.reset();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  private onStickDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.stick.setPointerCapture(event.pointerId);
    const rect = this.stick.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.maxRadius = rect.width * 0.36;
    this.updateStick(event.clientX, event.clientY);
  };

  private onStickMove = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.updateStick(event.clientX, event.clientY);
  };

  private onStickUp = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.sync();
  };

  private updateStick(clientX: number, clientY: number): void {
    let dx = clientX - this.centerX;
    let dy = clientY - this.centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > this.maxRadius) {
      dx = (dx / distance) * this.maxRadius;
      dy = (dy / distance) * this.maxRadius;
    }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const deadzone = 0.18;
    const x = dx / this.maxRadius;
    const y = -dy / this.maxRadius;
    this.state.moveX = Math.abs(x) > deadzone ? x : 0;
    this.state.moveY = Math.abs(y) > deadzone ? y : 0;
    this.sync();
  }

  private sync(): void {
    if (!this.visible) return;
    this.input.setTouchInput({ ...this.state });
  }

  reset(): void {
    this.state = {
      active: true,
      moveX: 0,
      moveY: 0,
      jump: false,
      attack: false,
      strong: false,
      special: false,
      shield: false,
      grab: false,
      taunt: false,
    };
    this.input.clearTouch();
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.root.querySelectorAll('.touch-button.pressed').forEach((button) => button.classList.remove('pressed'));
  }

  destroy(): void {
    this.input.clearTouch();
    this.root.remove();
  }
}
