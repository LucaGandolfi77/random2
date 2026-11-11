import type { CompiledFilm, LineCue } from '../data/types';
import { SPEAKER_LABELS } from '../screenplay/filmData';
import { wrapSubtitle } from '../subtitles/subtitles';
import { clamp, formatTime } from '../utils/math';

export interface UICallbacks {
  onStart: () => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onSkipAct: (direction: number) => void;
  onActSelect: (actId: string) => void;
  onSpeed: (rate: number) => void;
  onFullscreen: () => void;
  onSubtitleToggle: (enabled: boolean) => void;
  onVoiceToggle: (enabled: boolean) => void;
  onVolume: (kind: 'music' | 'ambience' | 'dialogue', value: number) => void;
  onSubtitleSize: (size: 's' | 'm' | 'l') => void;
  onExportSrt: () => void;
  onReplay: () => void;
}

const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" stroke="none"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6.4" y="5" width="3.4" height="14" fill="currentColor" stroke="none"/><rect x="14.2" y="5" width="3.4" height="14" fill="currentColor" stroke="none"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.2 4.6V10h5.4"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M11 6 5 12l6 6"/><path d="M19 6l-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M13 6l6 6-6 6"/><path d="M5 6l6 6-6 6"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M4 7h9M18 7h2M4 17h2M10 17h10"/><circle cx="15.5" cy="7" r="2.2"/><circle cx="7.5" cy="17" r="2.2"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24"><path d="M8.5 3.5H3.5v5M15.5 3.5h5v5M20.5 15.5v5h-5M3.5 15.5v5h5"/></svg>'
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export class AppUI {
  private root: HTMLElement;
  private film: CompiledFilm;
  private cb: UICallbacks;
  private e: Record<string, HTMLElement> = {};
  private range!: HTMLInputElement;
  private fill!: HTMLElement;
  private chapterTimer = 0;
  private idleTimer = 0;
  private toastTimer = 0;
  private subtitleTimer = 0;
  private started = false;
  private playing = false;
  private subtitlesEnabled = true;
  private currentActId = '';
  private currentTime = 0;
  private dragging = false;

  constructor(root: HTMLElement, film: CompiledFilm, callbacks: UICallbacks) {
    this.root = root;
    this.film = film;
    this.cb = callbacks;
    this.mount();
    this.wire();
    this.setTime(0);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  private mount(): void {
    const film = this.film;
    const total = film.duration;
    this.root.innerHTML = `
      <div class="vignette"></div>
      <div class="fade"></div>
      <div class="letterbox top"></div>
      <div class="letterbox bottom"></div>

      <div class="title-screen">
        <div class="title-card">
          <div class="kicker">Paris · Hiver 2000</div>
          <h1>Il prezzo<br>della libertà<span class="thin">Un cortometraggio sull'umanità</span></h1>
          <p class="logline">Dopo nove anni di carcere, un uomo torna a Parigi nell'inverno del 2000.
          Una bambina, una musicassetta, una città che non dimentica.</p>
          <button class="primary" data-action="start">Guarda il film</button>
          <p class="credits">6 atti · ${Math.round(total / 60)} minuti · italiano · animazione 3D procedurale</p>
        </div>
      </div>

      <div class="loading-screen">
        <div class="loading-inner">
          <div class="load-title">Il prezzo della libertà</div>
          <div class="load-status">Preparazione del set…</div>
          <div class="load-bar"><i></i></div>
        </div>
      </div>

      <div class="chapter">
        <span class="chapter-num"></span>
        <span class="chapter-title"></span>
      </div>

      <div class="subtitle-layer" aria-live="polite">
        <div class="subtitle"><span class="speaker"></span><span class="text"></span></div>
      </div>

      <div class="endcard">
        <div class="end-quote">
          Non possiamo cambiare ciò che abbiamo fatto.<br>
          Possiamo ancora scegliere ciò che faremo.
          <small>Il prezzo della libertà · Paris, hiver 2000</small>
        </div>
        <button class="primary" data-action="replay">Rivedi</button>
      </div>

      <div class="hint">Spazio play · ← → cerca · C sottotitoli · F schermo intero</div>

      <div class="controls">
        <div class="controls-inner">
          <div class="progress-row">
            <span class="time current">0:00</span>
            <div class="track">
              <div class="fill"></div>
              <input type="range" min="0" max="${total.toFixed(3)}" step="0.05" value="0" aria-label="Avanzamento del film" />
              <div class="marks"></div>
            </div>
            <span class="time total">${formatTime(total)}</span>
          </div>
          <div class="buttons-row">
            <button class="icon-btn" data-action="play" aria-label="Play">${ICONS.play}</button>
            <button class="icon-btn" data-action="restart" aria-label="Ricomincia">${ICONS.restart}</button>
            <button class="icon-btn" data-action="prev-act" aria-label="Atto precedente">${ICONS.prev}</button>
            <button class="icon-btn" data-action="next-act" aria-label="Atto successivo">${ICONS.next}</button>
            <div class="spacer"></div>
            <select class="select act-select" aria-label="Seleziona atto">
              ${film.acts.map((act, index) => `<option value="${act.id}">${ROMAN[index]} · ${act.title}</option>`).join('')}
            </select>
            <select class="select speed-select" aria-label="Velocità di riproduzione">
              <option value="0.5">0.5×</option>
              <option value="0.75">0.75×</option>
              <option value="1" selected>1×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
            </select>
            <button class="icon-btn text active" data-action="cc" aria-label="Sottotitoli">CC</button>
            <button class="icon-btn" data-action="settings" aria-label="Regolazioni">${ICONS.settings}</button>
            <button class="icon-btn" data-action="fullscreen" aria-label="Schermo intero">${ICONS.fullscreen}</button>
          </div>
        </div>
      </div>

      <div class="settings-panel">
        <h3>Regolazioni</h3>
        <div class="setting">
          <label>Musica <span data-value="music">70%</span></label>
          <input type="range" min="0" max="100" value="70" data-volume="music" />
        </div>
        <div class="setting">
          <label>Ambiente <span data-value="ambience">75%</span></label>
          <input type="range" min="0" max="100" value="75" data-volume="ambience" />
        </div>
        <div class="setting">
          <label>Dialoghi <span data-value="dialogue">100%</span></label>
          <input type="range" min="0" max="100" value="100" data-volume="dialogue" />
        </div>
        <div class="setting">
          <label>Dimensione sottotitoli</label>
          <select data-size>
            <option value="s">Piccoli</option>
            <option value="m" selected>Medi</option>
            <option value="l">Grandi</option>
          </select>
        </div>
        <div class="setting check">
          <label for="voice-toggle">Voci sintetiche italiane</label>
          <input id="voice-toggle" type="checkbox" checked />
        </div>
        <p class="note" data-voice-note>Le voci sono generate dal sistema. La sincronizzazione è affidata ai sottotitoli.</p>
        <div class="panel-actions">
          <button class="primary" data-action="srt">Esporta SRT</button>
        </div>
      </div>

      <div class="toast"></div>
    `;

    this.e.fade = this.q('.fade');
    this.e.title = this.q('.title-screen');
    this.e.loading = this.q('.loading-screen');
    this.e.chapter = this.q('.chapter');
    this.e.chapterNum = this.q('.chapter-num');
    this.e.chapterTitle = this.q('.chapter-title');
    this.e.subtitleLayer = this.q('.subtitle-layer');
    this.e.subtitle = this.q('.subtitle');
    this.e.speaker = this.q('.subtitle .speaker');
    this.e.text = this.q('.subtitle .text');
    this.e.endcard = this.q('.endcard');
    this.e.controls = this.q('.controls');
    this.e.playBtn = this.q('[data-action="play"]');
    this.e.settingsPanel = this.q('.settings-panel');
    this.e.toast = this.q('.toast');
    this.e.currentTime = this.q('.time.current');
    this.e.actSelect = this.q('.act-select') as HTMLSelectElement;
    this.e.voiceNote = this.q('[data-voice-note]');
    this.range = this.q('input[type="range"][aria-label]') as HTMLInputElement;
    this.fill = this.q('.track .fill');
    this.e.marks = this.q('.track .marks');

    const marks = this.e.marks;
    film.acts.forEach((act, index) => {
      if (index === 0) return;
      const mark = document.createElement('div');
      mark.className = 'mark';
      mark.style.left = `${(act.start / film.duration) * 100}%`;
      mark.title = act.title;
      marks.appendChild(mark);
    });

    this.root.classList.add('title-visible');
  }

  private q(selector: string): HTMLElement {
    const el = this.root.querySelector(selector);
    if (!el) throw new Error(`Elemento UI mancante: ${selector}`);
    return el as HTMLElement;
  }

  private wire(): void {
    this.root.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('[data-action]');
      if (!target) return;
      const action = target.getAttribute('data-action');
      switch (action) {
        case 'start':
          this.cb.onStart();
          break;
        case 'play':
          this.cb.onTogglePlay();
          break;
        case 'restart':
          this.cb.onRestart();
          break;
        case 'prev-act':
          this.cb.onSkipAct(-1);
          break;
        case 'next-act':
          this.cb.onSkipAct(1);
          break;
        case 'cc': {
          this.subtitlesEnabled = !this.subtitlesEnabled;
          this.applySubtitleState();
          this.cb.onSubtitleToggle(this.subtitlesEnabled);
          break;
        }
        case 'settings':
          this.e.settingsPanel.classList.toggle('open');
          this.bumpActivity();
          break;
        case 'fullscreen':
          this.cb.onFullscreen();
          break;
        case 'replay':
          this.hideEnd();
          this.cb.onReplay();
          break;
        case 'srt':
          this.cb.onExportSrt();
          break;
        default:
          break;
      }
    });

    this.range.addEventListener('pointerdown', () => {
      this.dragging = true;
    });
    window.addEventListener('pointerup', () => {
      this.dragging = false;
    });
    this.range.addEventListener('input', () => {
      const value = Number(this.range.value);
      this.setTime(value);
      this.cb.onSeek(value);
    });

    this.e.actSelect.addEventListener('change', () => {
      this.cb.onActSelect((this.e.actSelect as HTMLSelectElement).value);
    });

    const speed = this.q('.speed-select') as HTMLSelectElement;
    speed.addEventListener('change', () => {
      this.cb.onSpeed(Number(speed.value));
    });

    this.root.querySelectorAll<HTMLInputElement>('[data-volume]').forEach((input) => {
      input.addEventListener('input', () => {
        const kind = input.getAttribute('data-volume') as 'music' | 'ambience' | 'dialogue';
        const value = Number(input.value);
        const label = this.root.querySelector(`[data-value="${kind}"]`);
        if (label) label.textContent = `${value}%`;
        this.cb.onVolume(kind, value / 100);
      });
    });

    const size = this.q('[data-size]') as HTMLSelectElement;
    size.addEventListener('change', () => {
      const value = size.value as 's' | 'm' | 'l';
      this.root.classList.remove('subtitles-size-s', 'subtitles-size-m', 'subtitles-size-l');
      this.root.classList.add(`subtitles-size-${value}`);
      this.cb.onSubtitleSize(value);
    });

    const voice = this.q('#voice-toggle') as HTMLInputElement;
    voice.addEventListener('change', () => {
      this.cb.onVoiceToggle(voice.checked);
      if (!voice.checked) this.showToast('Voci disattivate');
      else if (!this.hasVoice) this.showToast('Nessuna voce italiana disponibile');
    });

    const activity = (): void => this.bumpActivity();
    this.root.addEventListener('mousemove', activity);
    this.root.addEventListener('pointerdown', activity);
    this.root.addEventListener('touchstart', activity, { passive: true });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    if (target?.isContentEditable) return;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (this.started) this.cb.onTogglePlay();
        break;
      case 'ArrowLeft':
        if (!this.started) return;
        event.preventDefault();
        this.cb.onSeek(this.currentTime - (event.shiftKey ? 30 : 5));
        break;
      case 'ArrowRight':
        if (!this.started) return;
        event.preventDefault();
        this.cb.onSeek(this.currentTime + (event.shiftKey ? 30 : 5));
        break;
      case 'KeyC':
        this.subtitlesEnabled = !this.subtitlesEnabled;
        this.applySubtitleState();
        this.cb.onSubtitleToggle(this.subtitlesEnabled);
        break;
      case 'KeyF':
        this.cb.onFullscreen();
        break;
      case 'Escape':
        this.e.settingsPanel.classList.remove('open');
        break;
      default:
        break;
    }
  };

  private onFullscreenChange = (): void => {
    if (!document.fullscreenElement) this.bumpActivity();
  };

  private applySubtitleState(): void {
    this.root.classList.toggle('subtitles-off', !this.subtitlesEnabled);
    const cc = this.root.querySelector('[data-action="cc"]');
    if (cc) cc.classList.toggle('active', this.subtitlesEnabled);
  }

  setLoading(progress: number, status?: string): void {
    const bar = this.root.querySelector('.load-bar i') as HTMLElement | null;
    if (bar) bar.style.width = `${Math.round(clamp(progress, 0, 1) * 100)}%`;
    if (status) {
      const label = this.root.querySelector('.load-status');
      if (label) label.textContent = status;
    }
  }

  ready(): void {
    this.e.loading.classList.add('hidden');
  }

  startFilm(): void {
    this.started = true;
    this.root.classList.add('cinema');
    this.root.classList.remove('title-visible');
    this.e.title.classList.add('hidden');
    this.setPlaying(true);
    this.bumpActivity();
    window.setTimeout(() => {
      this.currentActId = '';
      const first = this.film.acts[0];
      if (first) this.setAct(first.id, 0);
    }, 1100);
  }

  setFade(amount: number): void {
    this.e.fade.style.opacity = String(clamp(amount, 0, 1));
  }

  setStarted(started: boolean): void {
    this.started = started;
    if (started) {
      this.root.classList.add('cinema');
      this.root.classList.remove('title-visible');
      this.e.title.classList.add('hidden');
    } else {
      this.root.classList.remove('cinema');
      this.root.classList.add('title-visible');
      this.e.title.classList.remove('hidden');
      this.removeIdle();
    }
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.e.playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    this.e.playBtn.setAttribute('aria-label', playing ? 'Pausa' : 'Play');
    if (!playing) this.removeIdle();
    else this.bumpActivity();
  }

  setTime(time: number): void {
    this.currentTime = clamp(time, 0, this.film.duration);
    if (!this.dragging) this.range.value = this.currentTime.toFixed(2);
    this.fill.style.width = `${(this.currentTime / this.film.duration) * 100}%`;
    this.e.currentTime.textContent = formatTime(this.currentTime);
  }

  setAct(actId: string, index: number): void {
    if (actId === this.currentActId) return;
    this.currentActId = actId;
    (this.e.actSelect as HTMLSelectElement).value = actId;
    const act = this.film.acts[index];
    if (!act) return;
    this.e.chapterNum.textContent = `Atto ${ROMAN[index] ?? index + 1}`;
    this.e.chapterTitle.textContent = act.title;
    this.e.chapter.classList.add('visible');
    window.clearTimeout(this.chapterTimer);
    this.chapterTimer = window.setTimeout(() => {
      this.e.chapter.classList.remove('visible');
    }, 5200);
  }

  setLine(line: LineCue | null): void {
    window.clearTimeout(this.subtitleTimer);
    if (!line) {
      this.e.subtitle.classList.remove('visible');
      this.subtitleTimer = window.setTimeout(() => {
        this.e.text.textContent = '';
        this.e.speaker.textContent = '';
      }, 260);
      return;
    }
    const lines = wrapSubtitle(line.text);
    const speaker = SPEAKER_LABELS[line.speaker] ?? line.speaker;
    this.e.speaker.textContent = speaker;
    this.e.text.textContent = lines.join('\n');
    this.e.subtitle.classList.add('visible');
  }

  showEnd(): void {
    this.e.endcard.classList.add('visible');
    this.e.subtitle.classList.remove('visible');
    this.removeIdle();
  }

  hideEnd(): void {
    this.e.endcard.classList.remove('visible');
  }

  showToast(message: string, duration = 3200): void {
    this.e.toast.textContent = message;
    this.e.toast.classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.e.toast.classList.remove('visible');
    }, duration);
  }

  setVoiceAvailable(available: boolean): void {
    this.hasVoice = available;
    const voice = this.root.querySelector('#voice-toggle') as HTMLInputElement | null;
    if (!available) {
      this.e.voiceNote.textContent =
        'Nessuna voce italiana trovata nel sistema: i dialoghi restano nei sottotitoli. La colonna sonora è procedurale.';
    } else if (voice) {
      this.e.voiceNote.textContent =
        'Le voci sono generate dal sistema. La sincronizzazione è affidata ai sottotitoli.';
    }
  }

  setSettingsOpen(open: boolean): void {
    this.e.settingsPanel.classList.toggle('open', open);
  }

  get time(): number {
    return this.currentTime;
  }

  get isStarted(): boolean {
    return this.started;
  }

  private hasVoice = true;

  private bumpActivity(): void {
    if (!this.started) return;
    this.removeIdle();
    if (!this.playing) return;
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      if (this.playing) this.root.classList.add('idle');
    }, 2600);
  }

  private removeIdle(): void {
    window.clearTimeout(this.idleTimer);
    this.root.classList.remove('idle');
  }

  fail(message: string): void {
    const fatal = document.createElement('div');
    fatal.className = 'fatal';
    fatal.textContent = message;
    this.root.appendChild(fatal);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('fullscreenchange', this.onFullscreenChange);
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.chapterTimer);
    window.clearTimeout(this.subtitleTimer);
    window.clearTimeout(this.toastTimer);
  }
}
