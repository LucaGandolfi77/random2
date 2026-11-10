export interface TouchControlsHandlers {
  onMove(x: number, y: number, magnitude: number): void;
  onJumpDown(): void;
  onJumpUp(): void;
  onDescendDown(): void;
  onDescendUp(): void;
  onFly(): void;
  onPhoto(): void;
}

export function joystickVector(
  dx: number,
  dy: number,
  radius: number,
  deadzone = 0.12,
): { x: number; y: number; magnitude: number } {
  const rawX = dx / radius;
  const rawY = -dy / radius;
  const length = Math.hypot(rawX, rawY);
  if (length <= deadzone) return { x: 0, y: 0, magnitude: 0 };
  const clamped = Math.min(1, length);
  const magnitude = (clamped - deadzone) / (1 - deadzone);
  // Finer control near the centre without reducing the full-throttle range.
  const shaped = Math.pow(magnitude, 1.3);
  return {
    x: (rawX / length) * shaped,
    y: (rawY / length) * shaped,
    magnitude,
  };
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export class TouchControls {
  private readonly joystick = byId<HTMLDivElement>('joystick');
  private readonly thumb = byId<HTMLDivElement>('joystick-thumb');
  private pointerId: number | null = null;
  private readonly centre = { x: 0, y: 0 };
  private radius = 50;

  constructor(private readonly handlers: TouchControlsHandlers) {
    this.joystick.addEventListener('pointerdown', (event) => this.onDown(event));
    this.joystick.addEventListener('pointermove', (event) => this.onMove(event));
    this.joystick.addEventListener('pointerup', (event) => this.onUp(event));
    this.joystick.addEventListener('pointercancel', (event) => this.onUp(event));
    this.joystick.addEventListener('lostpointercapture', () => this.reset());

    this.bindHold(
      byId<HTMLButtonElement>('touch-jump'),
      () => this.handlers.onJumpDown(),
      () => this.handlers.onJumpUp(),
    );
    this.bindHold(
      byId<HTMLButtonElement>('touch-descend'),
      () => this.handlers.onDescendDown(),
      () => this.handlers.onDescendUp(),
    );
    byId<HTMLButtonElement>('touch-fly').addEventListener('click', () => {
      this.handlers.onFly();
    });
    byId<HTMLButtonElement>('touch-photo').addEventListener('click', () => {
      this.handlers.onPhoto();
    });
    this.joystick.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private onDown(event: PointerEvent): void {
    event.preventDefault();
    if (this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    const rect = this.joystick.getBoundingClientRect();
    this.centre.x = rect.left + rect.width / 2;
    this.centre.y = rect.top + rect.height / 2;
    this.radius = Math.max(20, rect.width / 2 - 10);
    this.joystick.classList.add('active');
    this.joystick.setPointerCapture(event.pointerId);
    this.apply(event.clientX, event.clientY, true);
  }

  private onMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.apply(event.clientX, event.clientY, false);
  }

  private onUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (this.joystick.hasPointerCapture(event.pointerId)) {
      this.joystick.releasePointerCapture(event.pointerId);
    }
    this.reset();
  }

  private apply(clientX: number, clientY: number, immediate: boolean): void {
    const dx = clientX - this.centre.x;
    const dy = clientY - this.centre.y;
    const distance = Math.hypot(dx, dy);
    const scale = distance > this.radius ? this.radius / distance : 1;
    const clampedX = dx * scale;
    const clampedY = dy * scale;
    this.thumb.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
    if (immediate) this.thumb.style.transition = 'none';
    const vector = joystickVector(clampedX, clampedY, this.radius);
    this.handlers.onMove(vector.x, vector.y, vector.magnitude);
  }

  private reset(): void {
    this.pointerId = null;
    this.joystick.classList.remove('active');
    this.thumb.style.transition = '';
    this.thumb.style.transform = 'translate(-50%, -50%)';
    this.handlers.onMove(0, 0, 0);
  }

  private bindHold(
    button: HTMLButtonElement,
    down: () => void,
    up: () => void,
  ): void {
    let active = false;
    const release = (): void => {
      if (!active) return;
      active = false;
      button.classList.remove('pressed');
      up();
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (active) return;
      active = true;
      button.classList.add('pressed');
      button.setPointerCapture(event.pointerId);
      down();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }
}
