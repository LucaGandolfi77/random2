import '../styles.css';
import { FilmRenderer } from '../film/renderer';
import { Score } from '../film/score';
import {
  CHAPTERS,
  DURATION,
  chapterAt,
  clinicalAt,
  cueAt,
  formatTime,
} from '../film/timeline';
import type { Cue, Lang } from '../film/types';
import { STRINGS, t, type StringKey } from './strings';

const STORAGE = {
  position: 'self-non-self.position',
  lang: 'self-non-self.lang',
  captions: 'self-non-self.captions',
  muted: 'self-non-self.muted',
};

function $<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function $$<T extends Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector));
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing can deny storage; the film still plays.
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function parseHashTime(): number | null {
  const match = /(?:^|[#&])t=(\d+(?:\.\d+)?)/.exec(window.location.hash);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.min(DURATION, Math.max(0, value)) : null;
}

const canvas = $<HTMLCanvasElement>('#film');
const frame = $('#film-frame');
const ui = $<HTMLElement>('#ui');
const poster = $<HTMLElement>('#poster');
const end = $<HTMLElement>('#end');
const loader = $<HTMLElement>('#loader');
const toast = $<HTMLElement>('#toast');
const captions = $<HTMLElement>('#captions');
const caption = $<HTMLElement>('#caption');
const speaker = $<HTMLElement>('#speaker');
const clinical = $<HTMLElement>('#clinical');
const clinicalLabel = $<HTMLElement>('#clinical-label');
const clinicalValue = $<HTMLElement>('#clinical-value');
const chapterCard = $<HTMLElement>('#chapter-card');
const cardRoman = $<HTMLElement>('#card-roman');
const cardTitle = $<HTMLElement>('#card-title');
const filmTitle = $<HTMLElement>('#film-title');
const chapterRoman = $<HTMLElement>('#chapter-roman');
const chapterName = $<HTMLElement>('#chapter-name');
const seek = $<HTMLInputElement>('#seek');
const seekFill = $<HTMLElement>('#seek-fill');
const seekTicks = $<HTMLElement>('#seek-ticks');
const timecode = $<HTMLElement>('#timecode');
const playButton = $<HTMLButtonElement>('#btn-play');
const backButton = $<HTMLButtonElement>('#btn-back');
const forwardButton = $<HTMLButtonElement>('#btn-forward');
const muteButton = $<HTMLButtonElement>('#btn-mute');
const captionsButton = $<HTMLButtonElement>('#btn-captions');
const fullscreenButton = $<HTMLButtonElement>('#btn-fullscreen');
const playerLang = $<HTMLButtonElement>('#player-lang');
const posterLang = $<HTMLButtonElement>('#poster-lang');
const infoButton = $<HTMLButtonElement>('#btn-info');
const resumeButton = $<HTMLButtonElement>('#resume');
const rotate = $<HTMLElement>('#rotate');
const chapterList = $<HTMLElement>('#chapter-list');
const modalInfo = $<HTMLElement>('#modal-info');
const modalChapters = $<HTMLElement>('#modal-chapters');

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const landscapeQuery = window.matchMedia('(orientation: landscape) and (max-height: 520px)');

let lang: Lang = readStorage(STORAGE.lang) === 'it' ? 'it' : 'en';
let captionsOn = readStorage(STORAGE.captions) !== '0';
let muted = readStorage(STORAGE.muted) === '1';
let silent = false;
let started = false;
let playing = false;
let endShown = false;
let time = 0;
let resumeAt = 0;
let lastFrame = performance.now();
let lastRender = 0;
let lastUi = 0;
let posterTime = 0;
let lastCueId = '';
let lastClinicalId = '';
let lastChapterId = '';
let saveClock = 0;
let idleTimer = 0;
let toastTimer = 0;
let modalWasPlaying = false;
let rotateDismissed = false;
let seekWasPlaying = false;

let wakeLock: { release: () => Promise<void> } | null = null;

const renderer = new FilmRenderer(canvas, { reducedMotion: reducedQuery.matches });
const score = new Score();

seek.max = String(DURATION);

/* ------------------------------------------------------------------ render */

function animate(now: number): void {
  requestAnimationFrame(animate);
  if (now - lastRender < 1000 / 30) return;
  const elapsed = Math.min(0.12, (now - lastFrame) / 1000);
  lastFrame = now;
  lastRender = now;

  if (!started) {
    posterTime += elapsed;
    renderer.drawPoster(posterTime);
    return;
  }

  if (playing && !endShown) {
    time = Math.min(DURATION, time + elapsed);
    if (time >= DURATION) {
      time = DURATION;
      showEnd();
    }
  }

  renderer.draw(time);
  if (playing && !endShown) score.sync(time, true);
  updateUi(now);
}

/* --------------------------------------------------------------------- ui */

function updateUi(now: number, force = false): void {
  if (!force && now - lastUi < 90) return;
  lastUi = now;

  const chapter = chapterAt(time);
  const cue = cueAt(time);
  const clinicalNow = clinicalAt(time);

  if (cue?.id !== lastCueId) {
    lastCueId = cue?.id ?? '';
    renderCue(cue);
  }

  if (clinicalNow?.id !== lastClinicalId) {
    lastClinicalId = clinicalNow?.id ?? '';
    if (clinicalNow) {
      clinicalLabel.textContent = clinicalNow.label;
      clinicalValue.textContent = clinicalNow.value;
      clinical.classList.remove('is-hidden');
      clinical.setAttribute('aria-hidden', 'false');
    } else {
      clinical.classList.add('is-hidden');
      clinical.setAttribute('aria-hidden', 'true');
    }
  }

  if (chapter.id !== lastChapterId) {
    lastChapterId = chapter.id;
    chapterRoman.textContent = chapter.roman;
    chapterName.textContent = chapter.title[lang];
    updateActiveChapter(chapter.id);
  }

  const chapterLocal = time - chapter.start;
  const showCard = started && !endShown && chapterLocal >= 0 && chapterLocal < 4.4;
  chapterCard.classList.toggle('is-hidden', !showCard);
  if (showCard) {
    cardRoman.textContent = chapter.roman;
    cardTitle.textContent = chapter.title[lang];
  }

  const showFilmTitle = started && !endShown && chapter.id === 'prologue' && time >= 48 && time <= 58;
  filmTitle.classList.toggle('is-hidden', !showFilmTitle);

  const progress = DURATION > 0 ? time / DURATION : 0;
  seek.value = String(time);
  seekFill.style.width = `${(progress * 100).toFixed(3)}%`;
  timecode.innerHTML = `${formatTime(time)} <span>/ ${formatTime(DURATION)}</span>`;

  if (started && !endShown) {
    saveClock += 0.09;
    if (saveClock >= 4) {
      saveClock = 0;
      savePosition();
    }
  }
}

function renderCue(cue: Cue | null): void {
  captions.classList.toggle('is-off', !captionsOn);
  if (!cue) {
    caption.textContent = '';
    speaker.textContent = '';
    captions.classList.add('is-empty');
    captions.classList.remove('is-narration', 'is-dialogue', 'is-dedication', 'is-resident');
    return;
  }
  captions.classList.remove('is-empty');
  captions.classList.toggle('is-narration', cue.kind === 'narration');
  captions.classList.toggle('is-dialogue', cue.kind === 'dialogue');
  captions.classList.toggle('is-dedication', cue.kind === 'dedication');
  captions.classList.toggle('is-resident', cue.speaker === 'resident');
  speaker.textContent =
    cue.kind === 'dialogue'
      ? cue.speaker === 'resident'
        ? t('speakerResident', lang)
        : cue.speaker === 'messenger'
          ? t('speakerMessenger', lang)
          : ''
      : '';
  caption.textContent = cue.text[lang];
}

function updatePlayState(): void {
  ui.classList.toggle('is-playing', playing);
  ui.classList.toggle('is-muted', muted || silent);
  playButton.setAttribute('aria-label', playing ? t('pause', lang) : t('play', lang));
  captionsButton.setAttribute('aria-pressed', String(captionsOn));
  captions.classList.toggle('is-off', !captionsOn);
}

function updateActiveChapter(id: string): void {
  for (const item of $$<HTMLElement>('.chapter-item')) {
    item.classList.toggle('is-current', item.dataset.chapter === id);
  }
}

/* ------------------------------------------------------------------- film */

async function startFilm(from: number, withSound: boolean): Promise<void> {
  if (started) return;
  started = true;
  endShown = false;
  time = Math.min(DURATION - 0.05, Math.max(0, from));
  playing = true;
  silent = !withSound;
  lastFrame = performance.now();
  lastRender = 0;
  lastCueId = '';
  lastClinicalId = '';
  lastChapterId = '';

  poster.classList.add('is-hidden');
  poster.setAttribute('aria-hidden', 'true');
  ui.classList.remove('is-hidden');
  ui.removeAttribute('inert');
  end.classList.add('is-hidden');
  end.setAttribute('aria-hidden', 'true');
  loader.classList.add('is-hidden');

  if (withSound) {
    void score.start(time).then(() => {
      score.setMuted(muted);
      if (!playing) score.suspend();
    });
  } else {
    score.setMuted(true);
  }

  updatePlayState();
  bumpControls();
  checkOrientation();
  void requestWakeLock();
  updateUi(performance.now(), true);
  renderer.draw(time);
}

function pauseFilm(): void {
  if (!started || !playing || endShown) return;
  playing = false;
  score.suspend();
  void releaseWakeLock();
  ui.classList.remove('is-idle');
  updatePlayState();
}

function resumeFilm(): void {
  if (!started || playing || endShown) return;
  playing = true;
  lastFrame = performance.now();
  if (!silent) {
    void score.resume();
    score.sync(time, true);
  }
  void requestWakeLock();
  updatePlayState();
  bumpControls();
}

function togglePlay(): void {
  if (!started) return;
  if (endShown) {
    replay();
    return;
  }
  if (playing) pauseFilm();
  else resumeFilm();
}

function seekTo(value: number): void {
  if (!started) return;
  time = Math.min(DURATION - 0.02, Math.max(0, value));
  if (endShown && time < DURATION - 0.2) hideEnd();
  if (!silent) {
    score.seek(time);
    if (playing) score.sync(time, true);
  }
  renderer.draw(time);
  updateUi(performance.now(), true);
  bumpControls();
}

function showEnd(): void {
  if (endShown) return;
  endShown = true;
  playing = false;
  score.suspend();
  void releaseWakeLock();
  removeStorage(STORAGE.position);
  ui.classList.add('is-hidden');
  ui.setAttribute('inert', '');
  captions.classList.add('is-empty');
  end.classList.remove('is-hidden');
  end.setAttribute('aria-hidden', 'false');
  rotate.classList.add('is-hidden');
  updatePlayState();
}

function hideEnd(): void {
  endShown = false;
  end.classList.add('is-hidden');
  end.setAttribute('aria-hidden', 'true');
  ui.classList.remove('is-hidden');
  ui.removeAttribute('inert');
}

function replay(): void {
  hideEnd();
  time = 0;
  playing = true;
  silent = silent || muted;
  lastFrame = performance.now();
  lastCueId = '';
  lastClinicalId = '';
  lastChapterId = '';
  if (!silent) {
    void score.resume();
    score.sync(0, true);
  }
  void requestWakeLock();
  updatePlayState();
  bumpControls();
  updateUi(performance.now(), true);
  renderer.draw(0);
}

function backToPoster(): void {
  started = false;
  playing = false;
  endShown = false;
  time = 0;
  posterTime = 0;
  rotate.classList.add('is-hidden');
  score.suspend();
  void releaseWakeLock();
  end.classList.add('is-hidden');
  end.setAttribute('aria-hidden', 'true');
  ui.classList.add('is-hidden');
  ui.setAttribute('inert', '');
  poster.classList.remove('is-hidden');
  poster.removeAttribute('aria-hidden');
  captions.classList.add('is-empty');
  lastCueId = '';
  lastClinicalId = '';
  lastChapterId = '';
  refreshResume();
  renderer.drawPoster(0);
}

/* ------------------------------------------------------------------- time */

function savePosition(): void {
  if (!started || endShown || time < 4) return;
  writeStorage(STORAGE.position, String(Math.round(time * 10) / 10));
}

function refreshResume(): void {
  const hash = parseHashTime();
  const saved = Number(readStorage(STORAGE.position));
  resumeAt = hash ?? (Number.isFinite(saved) && saved > 0 ? saved : 0);
  const show = resumeAt > 8 && resumeAt < DURATION - 8;
  resumeButton.classList.toggle('is-hidden', !show);
  if (show) {
    resumeButton.textContent = t('resumeAt', lang).replace('{time}', formatTime(resumeAt));
  }
}

/* --------------------------------------------------------------- controls */

function bumpControls(): void {
  ui.classList.remove('is-idle');
  if (idleTimer) window.clearTimeout(idleTimer);
  if (playing && !endShown) {
    idleTimer = window.setTimeout(() => {
      ui.classList.add('is-idle');
    }, 3800);
  }
}

function toggleCaptions(): void {
  captionsOn = !captionsOn;
  writeStorage(STORAGE.captions, captionsOn ? '1' : '0');
  lastCueId = '';
  updatePlayState();
  updateUi(performance.now(), true);
}

async function toggleMute(): Promise<void> {
  if (silent) {
    silent = false;
    muted = false;
    writeStorage(STORAGE.muted, '0');
    if (score.isStarted) {
      await score.resume();
    } else {
      await score.start(time);
    }
    score.setMuted(false);
    if (!playing) score.suspend();
  } else {
    muted = !muted;
    writeStorage(STORAGE.muted, muted ? '1' : '0');
    score.setMuted(muted);
  }
  updatePlayState();
  bumpControls();
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  if (frame.requestFullscreen) {
    void frame.requestFullscreen().catch(() => {
      showToast(t('fullscreen', lang));
    });
  } else {
    showToast(t('fullscreen', lang));
  }
}

async function requestWakeLock(): Promise<void> {
  if (wakeLock) return;
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (nav.wakeLock) {
      wakeLock = await nav.wakeLock.request('screen');
    }
  } catch {
    wakeLock = null;
  }
}

async function releaseWakeLock(): Promise<void> {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {
    // Ignore.
  }
  wakeLock = null;
}

/* ------------------------------------------------------------------ modal */

function openModal(kind: 'info' | 'chapters'): void {
  closeModals(false);
  modalWasPlaying = playing;
  if (playing) pauseFilm();
  const modal = kind === 'info' ? modalInfo : modalChapters;
  modal.classList.remove('is-hidden');
  modal.setAttribute('aria-hidden', 'false');
  updateActiveChapter(chapterAt(time).id);
  const focusable = modal.querySelector<HTMLButtonElement>('.modal-close');
  focusable?.focus({ preventScroll: true });
}

function closeModal(kind: 'info' | 'chapters'): void {
  const modal = kind === 'info' ? modalInfo : modalChapters;
  modal.classList.add('is-hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (modalWasPlaying) {
    modalWasPlaying = false;
    resumeFilm();
  }
}

function closeModals(resume = true): void {
  for (const modal of [modalInfo, modalChapters]) {
    modal.classList.add('is-hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (resume && modalWasPlaying) {
    modalWasPlaying = false;
    resumeFilm();
  }
}

/* ---------------------------------------------------------------- chapters */

function buildChapters(): void {
  chapterList.innerHTML = '';
  for (const chapter of CHAPTERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter-item';
    button.dataset.chapter = chapter.id;
    const roman = document.createElement('span');
    roman.className = 'item-roman';
    roman.textContent = chapter.roman;
    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = chapter.title[lang];
    const at = document.createElement('span');
    at.className = 'item-time';
    at.textContent = formatTime(chapter.start);
    button.append(roman, title, at);
    button.addEventListener('click', () => {
      closeModals(false);
      if (!started) {
        void startFilm(chapter.start + 0.05, true);
      } else {
        if (endShown) hideEnd();
        seekTo(chapter.start + 0.05);
        if (!playing) resumeFilm();
      }
    });
    chapterList.append(button);
  }
  updateActiveChapter(chapterAt(time).id);
}

function buildSeekTicks(): void {
  seekTicks.innerHTML = '';
  for (const chapter of CHAPTERS) {
    if (chapter.start <= 0) continue;
    const tick = document.createElement('span');
    tick.style.left = `${(chapter.start / DURATION) * 100}%`;
    seekTicks.append(tick);
  }
}

/* ------------------------------------------------------------------ share */

async function shareMoment(): Promise<void> {
  const stamp = Math.min(DURATION - 1, Math.round(time));
  const url = new URL(window.location.href);
  url.hash = `t=${stamp}`;
  const text = t('shareText', lang);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'SELF / NON-SELF', text, url: url.toString() });
      return;
    } catch {
      // User cancelled or the API is unavailable; fall through to clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url.toString()}`);
    showToast(t('copied', lang));
  } catch {
    showToast(url.toString());
  }
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('is-visible');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

/* --------------------------------------------------------------- language */

function applyLanguage(next: Lang): void {
  lang = next;
  writeStorage(STORAGE.lang, lang);
  document.documentElement.lang = lang;

  for (const element of $$<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n as StringKey | undefined;
    if (key && key in STRINGS) element.textContent = t(key, lang);
  }

  posterLang.textContent = lang.toUpperCase();
  playerLang.textContent = lang.toUpperCase();
  playerLang.setAttribute('aria-label', t('language', lang));
  posterLang.setAttribute('aria-label', t('language', lang));
  infoButton.setAttribute('aria-label', t('about', lang));
  seek.setAttribute('aria-label', t('position', lang));
  backButton.setAttribute('aria-label', t('back', lang));
  forwardButton.setAttribute('aria-label', t('forward', lang));
  captionsButton.setAttribute('aria-label', t('captions', lang));
  muteButton.setAttribute('aria-label', muted ? t('unmute', lang) : t('mute', lang));
  fullscreenButton.setAttribute('aria-label', t('fullscreen', lang));
  for (const close of $$<HTMLButtonElement>('.modal-close')) {
    close.setAttribute('aria-label', t('close', lang));
  }

  buildChapters();
  refreshResume();
  lastCueId = '';
  lastClinicalId = '';
  lastChapterId = '';
  updatePlayState();
  updateUi(performance.now(), true);
}

function toggleLanguage(): void {
  applyLanguage(lang === 'en' ? 'it' : 'en');
}

/* ----------------------------------------------------------------- set up */

function setupEvents(): void {
  $('#start-sound').addEventListener('click', () => void startFilm(0, true));
  $('#start-silent').addEventListener('click', () => void startFilm(0, false));
  resumeButton.addEventListener('click', () => void startFilm(resumeAt, true));

  $('#poster-about').addEventListener('click', () => openModal('info'));
  $('#poster-chapters').addEventListener('click', () => openModal('chapters'));
  $('#btn-end-about').addEventListener('click', () => openModal('info'));
  $('#btn-end-chapters').addEventListener('click', () => openModal('chapters'));
  $('#btn-replay').addEventListener('click', replay);
  $('#btn-poster').addEventListener('click', backToPoster);

  posterLang.addEventListener('click', toggleLanguage);
  playerLang.addEventListener('click', toggleLanguage);
  infoButton.addEventListener('click', () => openModal('info'));
  $('#chapter-pill').addEventListener('click', () => openModal('chapters'));
  $('#btn-chapters').addEventListener('click', () => openModal('chapters'));
  $('#btn-share').addEventListener('click', () => void shareMoment());

  playButton.addEventListener('click', togglePlay);
  backButton.addEventListener('click', () => seekTo(time - 10));
  forwardButton.addEventListener('click', () => seekTo(time + 10));
  captionsButton.addEventListener('click', toggleCaptions);
  muteButton.addEventListener('click', () => void toggleMute());
  fullscreenButton.addEventListener('click', toggleFullscreen);

  seek.addEventListener('input', () => seekTo(Number(seek.value)));
  seek.addEventListener('pointerdown', () => {
    seekWasPlaying = playing;
    if (playing) pauseFilm();
  });
  seek.addEventListener('change', () => {
    if (seekWasPlaying && !playing && !endShown) resumeFilm();
    seekWasPlaying = false;
  });

  for (const close of $$<HTMLElement>('[data-close]')) {
    close.addEventListener('click', () => {
      const kind = close.dataset.close;
      if (kind === 'info') closeModal('info');
      if (kind === 'chapters') closeModal('chapters');
    });
  }

  frame.addEventListener('pointermove', () => {
    if (started) bumpControls();
  });
  frame.addEventListener('pointerdown', () => {
    if (started) bumpControls();
  });
  frame.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!started) return;
    if (target.closest('button, input, .modal, .end, .poster')) return;
    bumpControls();
  });

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

    if (event.key === 'Escape') {
      if (!modalInfo.classList.contains('is-hidden')) closeModal('info');
      else if (!modalChapters.classList.contains('is-hidden')) closeModal('chapters');
      return;
    }
    if (event.key === ' ' || event.key === 'k') {
      event.preventDefault();
      togglePlay();
      bumpControls();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekTo(time - 10);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekTo(time + 10);
    } else if (event.key.toLowerCase() === 'c') {
      toggleCaptions();
    } else if (event.key.toLowerCase() === 'm') {
      void toggleMute();
    } else if (event.key.toLowerCase() === 'f') {
      toggleFullscreen();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) pauseFilm();
  });
  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('resize', () => {
    renderer.resize();
    renderer.draw(started ? time : 0);
    if (!started) renderer.drawPoster(posterTime);
  });

  reducedQuery.addEventListener('change', (event) => {
    renderer.setReducedMotion(event.matches);
  });

  landscapeQuery.addEventListener('change', checkOrientation);
  $('#rotate-dismiss').addEventListener('click', () => {
    rotateDismissed = true;
    rotate.classList.add('is-hidden');
  });
}

function checkOrientation(): void {
  const show = started && !endShown && landscapeQuery.matches && !rotateDismissed;
  rotate.classList.toggle('is-hidden', !show);
}

/* ------------------------------------------------------------------- init */

function hideLoader(): void {
  loader.classList.add('is-hidden');
  window.setTimeout(() => loader.setAttribute('aria-hidden', 'true'), 900);
}

function init(): void {
  applyLanguage(lang);
  buildSeekTicks();
  refreshResume();
  updatePlayState();
  renderer.drawPoster(0);
  setupEvents();
  lastFrame = performance.now();
  requestAnimationFrame(animate);
  window.setTimeout(hideLoader, 900);
  void document.fonts.ready.then(() => {
    if (!started) renderer.drawPoster(posterTime);
    hideLoader();
  });
  updateUi(performance.now(), true);
}

if (import.meta.env.DEV) {
  (window as unknown as { __sns: unknown }).__sns = {
    get time() {
      return time;
    },
    get playing() {
      return playing;
    },
    get endShown() {
      return endShown;
    },
    score,
    seek: seekTo,
    pause: pauseFilm,
    resume: resumeFilm,
  };
}

init();
