import type { Input } from '../player/input';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export class TouchControls {
  private root = byId<HTMLDivElement>('touch');
  private stick = byId<HTMLDivElement>('stick');
  private knob = byId<HTMLDivElement>('stick-knob');
  private action = byId<HTMLButtonElement>('btn-action');
  private label = byId<HTMLSpanElement>('action-label');
  private activePointer: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 44;

  constructor(private input: Input, onInteract: () => void) {
    if (!input.isTouch) return;
    this.root.hidden = false;
    document.body.classList.add('is-touch');
    this.label.textContent = 'OK';

    this.stick.addEventListener('pointerdown', this.onDown);
    this.stick.addEventListener('pointermove', this.onMove);
    this.stick.addEventListener('pointerup', this.onUp);
    this.stick.addEventListener('pointercancel', this.onUp);

    this.action.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onInteract();
    });
  }

  setActionLabel(label: string): void {
    this.label.textContent = label;
  }

  private onDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.activePointer = event.pointerId;
    const rect = this.stick.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.radius = rect.width * 0.34;
    this.stick.setPointerCapture(event.pointerId);
    this.update(event.clientX, event.clientY);
  };

  private onMove = (event: PointerEvent): void => {
    if (this.activePointer !== event.pointerId) return;
    event.preventDefault();
    this.update(event.clientX, event.clientY);
  };

  private onUp = (event: PointerEvent): void => {
    if (this.activePointer !== event.pointerId) return;
    this.activePointer = null;
    this.input.setJoystick(0, 0);
    this.knob.style.transform = 'translate(-50%, -50%)';
  };

  private update(clientX: number, clientY: number): void {
    let dx = clientX - this.centerX;
    let dy = clientY - this.centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > this.radius) {
      dx = (dx / distance) * this.radius;
      dy = (dy / distance) * this.radius;
    }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.input.setJoystick(dx / this.radius, -dy / this.radius);
  }
}
