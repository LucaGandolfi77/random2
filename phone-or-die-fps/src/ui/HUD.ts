import type { GameState } from '../game/GameState';
import { THREAT_TEXT, threatLevel } from '../systems/ThreatSystem';
import type { Interactable } from '../world/Interactable';
import { ZONE_BY_ID } from '../data/zones';

export class HUD {
  readonly root: HTMLElement;
  private clock: HTMLElement;
  private objective: HTMLElement;
  private battery: HTMLElement;
  private threatWrap: HTMLElement;
  private threatFill: HTMLElement;
  private threatLabel: HTMLElement;
  private crosshair: HTMLElement;
  private prompt: HTMLElement;
  private toastEl: HTMLElement;
  private captionEl: HTMLElement;
  private vignette: HTMLElement;
  private flashEl: HTMLElement;
  private toastTimer = 0;
  private captionTimer = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="vignette"></div>
      <div class="flash"></div>
      <div class="clock"><span id="hud-chapter">CHAPTER 1</span><b id="hud-time">22:00</b></div>
      <div class="objective"><b>Current objective</b><span id="hud-obj"></span></div>
      <div class="battery-hud" id="hud-bat">PHONE <b>100%</b></div>
      <div class="threat-wrap" id="hud-threat">
        <div class="threat-label" id="hud-threat-label">SAFE</div>
        <div class="threat-bar"><div class="threat-fill" id="hud-threat-fill"></div></div>
      </div>
      <div class="crosshair" id="hud-cross"></div>
      <div class="prompt hidden" id="hud-prompt"></div>
      <div class="toast hidden" id="hud-toast"></div>
      <div class="caption hidden" id="hud-caption"></div>`;
    container.appendChild(this.root);
    const q = (s: string) => this.root.querySelector(s) as HTMLElement;
    this.clock = q('#hud-chapter');
    this.objective = q('#hud-obj');
    this.battery = q('#hud-bat');
    this.threatWrap = q('#hud-threat');
    this.threatFill = q('#hud-threat-fill');
    this.threatLabel = q('#hud-threat-label');
    this.crosshair = q('#hud-cross');
    this.prompt = q('#hud-prompt');
    this.toastEl = q('#hud-toast');
    this.captionEl = q('#hud-caption');
    this.vignette = this.root.querySelector('.vignette') as HTMLElement;
    this.flashEl = this.root.querySelector('.flash') as HTMLElement;
  }

  setVisible(on: boolean) { this.root.classList.toggle('hidden', !on); }

  update(dt: number, state: GameState, hovered: Interactable | null, mobile: boolean, room: string) {
    const zone = ZONE_BY_ID[state.zone]?.name ?? state.zone.toUpperCase();
    const roomLabel = room.toUpperCase() === zone.toUpperCase() ? '' : ` · ${room.toUpperCase()}`;
    this.clock.textContent = `CH ${state.chapter} · ${zone}${roomLabel}`;
    (this.root.querySelector('#hud-time') as HTMLElement).textContent = state.timeString;
    this.objective.textContent = state.zone === 'home'
      ? state.chapterData.objective
      : `${ZONE_BY_ID[state.zone]?.name ?? state.zone}: find the exit and keep the line open.`;
    const bat = Math.ceil(state.battery);
    this.battery.innerHTML = `PHONE <b>${bat}%</b>`;
    this.battery.classList.toggle('low', bat <= 15);

    const lvl = threatLevel(state.threat);
    this.threatFill.style.width = `${state.threat}%`;
    this.threatLabel.textContent = `${lvl} — ${THREAT_TEXT[lvl]}`;
    this.threatWrap.classList.toggle('critical', state.threat >= 80);
    this.vignette.classList.toggle('danger', state.threat >= 60);

    const active = !!hovered && !state.phoneOpen;
    this.crosshair.classList.toggle('active', active);
    this.prompt.classList.toggle('hidden', !active || state.phoneOpen);
    if (active && hovered) this.prompt.textContent = mobile ? hovered.label.replace(/^Press E to /, 'Tap to ') : hovered.label;

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.add('hidden');
    }
    if (this.captionTimer > 0) {
      this.captionTimer -= dt;
      if (this.captionTimer <= 0) this.captionEl.classList.add('hidden');
    }
  }

  toast(text: string, seconds = 4.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = seconds;
  }

  caption(text: string, seconds = 5) {
    if (!text) return;
    this.captionEl.textContent = text;
    this.captionEl.classList.remove('hidden');
    this.captionTimer = seconds;
  }

  flash() {
    this.flashEl.classList.add('on');
    setTimeout(() => this.flashEl.classList.remove('on'), 90);
  }
}
