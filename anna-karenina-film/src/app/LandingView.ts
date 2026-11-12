import type { SavedProgress } from '../data/types';
import { FILM, sceneAtTime } from '../data/film';
import { PALETTES } from '../data/palettes';
import { renderEnvironment } from '../scenes/environments';
import { getCharacterSpec } from '../characters/specs';
import { CharacterRenderer } from '../characters/CharacterRenderer';
import { ParticleLayer } from '../engine/ParticleLayer';
import { formatTime, isResumable } from '../engine/Persistence';
import { icon } from './icons';

export interface LandingProps {
  progress: SavedProgress | null;
  onWatch: () => void;
  onResume: (time: number) => void;
  onInstall: () => void;
}

export class LandingView {
  readonly element: HTMLDivElement;
  private readonly props: LandingProps;
  private readonly frame: HTMLDivElement;
  private readonly actor: CharacterRenderer;
  private readonly particles: ParticleLayer;
  private raf = 0;
  private readonly onResizeBound: () => void;
  private readonly reduced: boolean;

  constructor(props: LandingProps) {
    this.props = props;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.element = document.createElement('div');
    this.element.className = 'screen landing-screen';
    this.element.innerHTML = `
      <div class="landing-visual" aria-hidden="true">
        <div class="landing-frame"></div>
        <div class="landing-scrim"></div>
      </div>
      <div class="landing-content">
        <div class="landing-kicker">
          <span class="kicker-line"></span>
          <span>Un film d'animazione originale</span>
        </div>
        <h1 class="landing-title">NEVE<br/><em>E</em> FERRO</h1>
        <p class="landing-subtitle">Liberamente ispirato ad <cite>Anna Karenina</cite> di Lev Tolstoj</p>
        <p class="landing-tagline">L'amore non sempre salva.<br/>A volte rivela la gabbia.</p>
        <div class="landing-meta">
          <span>25 min</span>
          <span class="dot"></span>
          <span>Italiano</span>
          <span class="dot"></span>
          <span>Sottotitoli italiani</span>
        </div>
        <div class="landing-actions">
          <button class="btn btn-primary" data-action="watch">GUARDA IL FILM ${icon('arrow')}</button>
          ${props.progress && isResumable(props.progress) ? `<button class="btn btn-ghost" data-action="resume">RIPRENDI <span class="btn-meta">${formatTime(props.progress.time)} · ${sceneAtTime(props.progress.time).scene.title}</span></button>` : ''}
        </div>
        <p class="landing-advisory">Il film contiene temi adulti e riferimenti al suicidio, senza immagini esplicite.</p>
        <footer class="landing-footer">
          <button class="text-link" data-action="install">${icon('install')} Installa l'app</button>
          <span class="footer-sep"></span>
          <span class="footer-note">Disponibile offline dopo il primo caricamento completo</span>
        </footer>
      </div>
      <div class="landing-credit">Un progetto originale · 2026</div>
    `;
    this.frame = this.element.querySelector('.landing-frame') as HTMLDivElement;
    const visual = this.element.querySelector('.landing-visual') as HTMLDivElement;
    const env = renderEnvironment('station', PALETTES.iron);
    const back = document.createElement('div');
    back.className = 'landing-env-back';
    back.innerHTML = env.back;
    const front = document.createElement('div');
    front.className = 'landing-env-front';
    front.innerHTML = env.front;
    this.frame.append(back);
    const actorStage = document.createElement('div');
    actorStage.className = 'landing-actor-stage';
    this.actor = new CharacterRenderer(getCharacterSpec('anna', 'landing'));
    actorStage.append(this.actor.element);
    this.frame.append(actorStage, front);
    this.particles = new ParticleLayer();
    this.particles.setEffects([{ type: 'snow', intensity: 0.95 }]);
    this.frame.append(this.particles.canvas);
    this.frame.append(this.createAtmosphere());

    this.onResizeBound = () => this.layout();
    window.addEventListener('resize', this.onResizeBound);
    this.layout();
    this.actor.element.style.transform = `translate(${this.annaX() - 200 * this.annaScale()}px, ${this.annaY() - 800 * this.annaScale()}px) scale(${this.annaScale()})`;
    this.bind();
    this.tick();
  }

  private createAtmosphere(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'landing-atmosphere';
    overlay.innerHTML = `<div class="landing-light"></div><div class="landing-softness"></div>`;
    return overlay;
  }

  private annaX(): number {
    return window.innerWidth < 760 ? 1010 : 1360;
  }

  private annaY(): number {
    return window.innerWidth < 760 ? 1180 : 1290;
  }

  private annaScale(): number {
    return window.innerWidth < 760 ? 1.25 : 1.62;
  }

  private layout(): void {
    const scale = Math.max(window.innerWidth / 1920, window.innerHeight / 1080);
    this.frame.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.actor.element.style.transform = `translate(${this.annaX() - 200 * this.annaScale()}px, ${this.annaY() - 800 * this.annaScale()}px) scale(${this.annaScale()})`;
  }

  private bind(): void {
    this.element.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'watch') this.props.onWatch();
        if (action === 'resume' && this.props.progress) this.props.onResume(this.props.progress.time);
        if (action === 'install') this.props.onInstall();
      });
    });
  }

  private tick = (): void => {
    const t = performance.now() / 1000;
    this.actor.render({
      time: t,
      pose: {
        lean: 0,
        head: 2,
        armL: 3,
        armR: -3,
        elbowL: 3,
        elbowR: -3,
        bodyY: 0,
        step: 0
      },
      expression: {
        eyeOpen: 0.86,
        brow: 2,
        browRaise: 1,
        mouthCurve: 2,
        mouthOpen: 0.4,
        mouthWidth: 0,
        headTilt: 1
      },
      gaze: { x: -1.5, y: 0 },
      seed: 2.7
    });
    this.particles.render(t);
    if (!this.reduced) this.raf = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResizeBound);
    this.element.remove();
  }
}
