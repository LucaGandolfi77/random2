export interface InputHandlers {
  interact(): void;
  jump(): void;
  map(): void;
  journal(): void;
  pause(): void;
  zoom(delta: number): void;
}

export class Input {
  readonly isTouch: boolean;
  enabled = true;
  run = false;
  private keys = new Set<string>();
  private joystickX = 0;
  private joystickZ = 0;
  private lookX = 0;
  private lookY = 0;
  private pointerId: number | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private handlers: InputHandlers;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, handlers: InputHandlers) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.isTouch =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  get moveX(): number {
    let value = this.joystickX;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) value += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) value -= 1;
    return Math.max(-1, Math.min(1, value));
  }

  get moveZ(): number {
    let value = this.joystickZ;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) value += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) value -= 1;
    return Math.max(-1, Math.min(1, value));
  }

  get isRunning(): boolean {
    return this.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  setJoystick(x: number, z: number): void {
    this.joystickX = x;
    this.joystickZ = z;
  }

  consumeLook(): { x: number; y: number } {
    const result = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return result;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.joystickX = 0;
      this.joystickZ = 0;
      this.lookX = 0;
      this.lookY = 0;
      this.pointerId = null;
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      return;
    }
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'KeyM', 'KeyJ', 'Escape'].includes(
        event.code
      )
    ) {
      event.preventDefault();
    }
    if (event.repeat) {
      this.keys.add(event.code);
      return;
    }
    this.keys.add(event.code);

    switch (event.code) {
      case 'KeyE':
      case 'Enter':
        this.handlers.interact();
        break;
      case 'Space':
        this.handlers.jump();
        break;
      case 'KeyM':
        this.handlers.map();
        break;
      case 'KeyJ':
        this.handlers.journal();
        break;
      case 'Escape':
        this.handlers.pause();
        break;
      default:
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.joystickX = 0;
    this.joystickZ = 0;
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.lookX += event.clientX - this.pointerX;
    this.lookY += event.clientY - this.pointerY;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.pointerId === event.pointerId) {
      this.pointerId = null;
    }
  };

  private onWheel = (event: WheelEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    this.handlers.zoom(event.deltaY);
  };
}
