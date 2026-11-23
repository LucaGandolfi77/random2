import type { Input } from '../player/input';
import { t } from '../data/strings';
import type { Language } from '../data/types';

export type TouchTravel = 'walk' | 'car' | 'bike' | 'fly';

export interface TouchHandlers {
  interact(): void;
  fly(): void;
  reset(): void;
}

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
  private mode = byId<HTMLButtonElement>('btn-mode');
  private modeLabel = byId<HTMLSpanElement>('mode-label');
  private flyButton = byId<HTMLButtonElement>('btn-fly');
  private flyLabel = byId<HTMLSpanElement>('fly-label');
  private flightPad = byId<HTMLDivElement>('flight-pad');
  private up = byId<HTMLButtonElement>('btn-up');
  private down = byId<HTMLButtonElement>('btn-down');
  private activePointer: number | null = null;
  private verticalPointer: number | null = null;
  private brakePointer: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 44;
  private travel: TouchTravel = 'walk';
  private enabled = false;
  private lang: Language = 'it';
  private actionLabel = 'OK';

  constructor(private input: Input, handlers: TouchHandlers) {
    if (!input.isTouch) return;
    this.enabled = true;
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
      handlers.interact();
    });

    this.mode.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.travel === 'walk') {
        this.input.setRun(!this.input.run);
        this.syncModeButton();
      } else if (this.travel === 'car' || this.travel === 'bike') {
        this.brakePointer = event.pointerId;
        this.mode.setPointerCapture(event.pointerId);
        this.input.setBrake(true);
        this.mode.classList.add('is-active');
      }
    });
    const releaseBrake = (event: PointerEvent): void => {
      if (this.brakePointer !== event.pointerId) return;
      this.brakePointer = null;
      this.input.setBrake(false);
      this.syncModeButton();
    };
    this.mode.addEventListener('pointerup', releaseBrake);
    this.mode.addEventListener('pointercancel', releaseBrake);

    this.flyButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.travel === 'walk') handlers.fly();
      else if (this.travel === 'car' || this.travel === 'bike') handlers.reset();
    });

    const hold = (button: HTMLButtonElement, direction: number): void => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.verticalPointer = event.pointerId;
        button.setPointerCapture(event.pointerId);
        this.input.setVertical(direction);
        button.classList.add('is-active');
      });
      const release = (event: PointerEvent): void => {
        if (this.verticalPointer !== event.pointerId) return;
        this.verticalPointer = null;
        this.input.setVertical(0);
        this.up.classList.remove('is-active');
        this.down.classList.remove('is-active');
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
    };
    hold(this.up, 1);
    hold(this.down, -1);

    this.setLanguage(this.lang);
    this.setTravel('walk');
  }

  setLanguage(lang: Language): void {
    this.lang = lang;
    this.flyLabel.textContent = t('touchFly', lang);
    this.syncModeButton();
    this.setActionLabel(this.actionLabel);
  }

  setActionLabel(label: string): void {
    this.actionLabel = label;
    if (!this.enabled) return;
    this.label.textContent = label;
  }

  setTravel(travel: TouchTravel): void {
    this.travel = travel;
    this.input.setRun(false);
    this.input.setBrake(false);
    this.input.setVertical(0);
    this.brakePointer = null;
    this.verticalPointer = null;
    this.up.classList.remove('is-active');
    this.down.classList.remove('is-active');
    this.syncModeButton();
  }

  private syncModeButton(): void {
    if (!this.enabled) return;
    this.mode.hidden = this.travel === 'fly';
    this.flightPad.hidden = this.travel !== 'fly';
    this.flyButton.hidden = this.travel === 'fly';
    if (this.travel === 'walk') {
      this.flyLabel.textContent = t('touchFly', this.lang);
      this.flyButton.setAttribute('aria-label', t('touchFly', this.lang));
      this.modeLabel.textContent = t('touchRun', this.lang);
      this.mode.classList.toggle('is-active', this.input.run);
    } else if (this.travel === 'car' || this.travel === 'bike') {
      this.flyLabel.textContent = t('touchReset', this.lang);
      this.flyButton.setAttribute('aria-label', t('touchReset', this.lang));
      this.modeLabel.textContent = t('touchBrake', this.lang);
      this.mode.classList.toggle('is-active', this.brakePointer !== null);
    }
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
