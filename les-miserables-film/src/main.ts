import './styles.css';
import { CHAPTERS, DURATION, activeCue, chapterAt, formatTime, type Lang } from './film/timeline';
import { FilmRenderer } from './film/renderer';
import { paperImageUrl } from './film/art';
import { score } from './film/audio';
import { clamp } from './film/util';

type StringKey =
  | 'tagline'
  | 'acts'
  | 'originalScore'
  | 'begin'
  | 'beginSilent'
  | 'resume'
  | 'posterNote'
  | 'contentNote'
  | 'chapters'
  | 'chaptersTitle'
  | 'chaptersFoot'
  | 'about'
  | 'aboutP1'
  | 'aboutP2'
  | 'contentWarning'
  | 'creditsLine'
  | 'saveFrame'
  | 'shareMoment'
  | 'endLine'
  | 'replay'
  | 'chooseChapter'
  | 'shareFilm'
  | 'endCredit'
  | 'rotate'
  | 'watchAnyway'
  | 'volume'
  | 'play'
  | 'pause'
  | 'back'
  | 'captionsToggle'
  | 'mute'
  | 'unmute'
  | 'fullscreen'
  | 'changeLanguage'
  | 'aboutFilm'
  | 'close'
  | 'position'
  | 'shareText'
  | 'copied'
  | 'saved'
  | 'fullscreenUnavailable'
  | 'savedPosition'
  | 'chapterPrefix';

const STRINGS: Record<StringKey, { en: string; it: string }> = {
  tagline: {
    en: 'A film drawn in ink and candlelight. One golden thread from the first night to the last dawn.',
    it: 'Un film disegnato a inchiostro e luce di candela. Un filo d’oro dalla prima notte all’ultima alba.',
  },
  acts: { en: '10 ACTS', it: '10 ATTI' },
  originalScore: { en: 'ORIGINAL SCORE', it: 'MUSICA ORIGINALE' },
  begin: { en: 'Begin with sound', it: 'Inizia con l’audio' },
  beginSilent: { en: 'Watch in silence', it: 'Guarda in silenzio' },
  resume: { en: 'Resume', it: 'Riprendi' },
  posterNote: {
    en: '20 minutes · drawn live in TypeScript · no video files',
    it: '20 minuti · disegnato dal vivo in TypeScript · nessun file video',
  },
  contentNote: { en: 'Content note', it: 'Avviso sui contenuti' },
  chapters: { en: 'CHAPTERS', it: 'CAPITOLI' },
  chaptersTitle: { en: 'The film, chapter by chapter', it: 'Il film, capitolo per capitolo' },
  chaptersFoot: {
    en: 'Scrub the golden thread to move through the film.',
    it: 'Trascina il filo d’oro per muoverti nel film.',
  },
  about: { en: 'ABOUT', it: 'IL FILM' },
  aboutP1: {
    en: 'A twenty-minute animated adaptation of Victor Hugo’s Les Misérables, composed entirely of code: ink, paper, candlelight and one continuous golden thread.',
    it: 'Un adattamento animato di venti minuti de I Miserabili di Victor Hugo, composto interamente di codice: inchiostro, carta, luce di candela e un unico filo d’oro.',
  },
  aboutP2: {
    en: 'Every frame is drawn live at 30 frames per second. Scrub, pause, switch language, or save a frame — the clock always returns the same image.',
    it: 'Ogni fotogramma è disegnato dal vivo a 30 al secondo. Trascina, metti in pausa, cambia lingua o salva un fotogramma: il tempo restituisce sempre la stessa immagine.',
  },
  contentWarning: {
    en: '<strong>Content note.</strong> The film depicts poverty, child labour, war, death and suicide. There is no graphic violence, and no rapid flashing.',
    it: '<strong>Avviso.</strong> Il film racconta povertà, lavoro minorile, guerra, morte e suicidio. Non ci sono violenze grafiche né lampi rapidi.',
  },
  creditsLine: {
    en: 'Written, drawn and scored in TypeScript. No images, footage or recorded music.',
    it: 'Scritto, disegnato e musicato in TypeScript. Nessuna immagine, footage o musica registrata.',
  },
  saveFrame: { en: 'Save this frame', it: 'Salva questo fotogramma' },
  shareMoment: { en: 'Share this moment', it: 'Condividi questo momento' },
  endLine: {
    en: 'The thread does not end. It only changes hands.',
    it: 'Il filo non finisce. Cambia soltanto mani.',
  },
  replay: { en: 'Watch again', it: 'Guarda di nuovo' },
  chooseChapter: { en: 'Choose a chapter', it: 'Scegli un capitolo' },
  shareFilm: { en: 'Share the film', it: 'Condividi il film' },
  endCredit: {
    en: 'Drawn live in TypeScript · after Victor Hugo',
    it: 'Disegnato dal vivo in TypeScript · da Victor Hugo',
  },
  rotate: {
    en: 'Turn your phone upright to watch the film.',
    it: 'Metti il telefono in verticale per guardare il film.',
  },
  watchAnyway: { en: 'Watch anyway', it: 'Guarda comunque' },
  volume: { en: 'Volume', it: 'Volume' },
  play: { en: 'Play', it: 'Riproduci' },
  pause: { en: 'Pause', it: 'Pausa' },
  back: { en: 'Back 10 seconds', it: 'Indietro di 10 secondi' },
  captionsToggle: { en: 'Toggle captions', it: 'Attiva o disattiva i sottotitoli' },
  mute: { en: 'Mute', it: 'Disattiva audio' },
  unmute: { en: 'Turn sound on', it: 'Attiva audio' },
  fullscreen: { en: 'Fullscreen', it: 'Schermo intero' },
  changeLanguage: { en: 'Change language', it: 'Cambia lingua' },
  aboutFilm: { en: 'About the film', it: 'Informazioni sul film' },
  close: { en: 'Close', it: 'Chiudi' },
  position: { en: 'Film position', it: 'Posizione nel film' },
  shareText: {
    en: 'Les Misérables — Le Fil d’Or. A 20-minute film drawn live in code.',
    it: 'Les Misérables — Le Fil d’Or. Un film di 20 minuti disegnato dal vivo con il codice.',
  },
  copied: { en: 'Link copied.', it: 'Link copiato.' },
  saved: { en: 'Frame saved.', it: 'Fotogramma salvato.' },
  fullscreenUnavailable: {
    en: 'Fullscreen is not available in this browser.',
    it: 'Lo schermo intero non è disponibile in questo browser.',
  },
  savedPosition: { en: 'Continue from', it: 'Continua da' },
  chapterPrefix: { en: 'Play chapter', it: 'Riproduci capitolo' },
};

const $ = <T extends Element>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
};

const canvas = $<HTMLCanvasElement>('#film');
const frame = $<HTMLDivElement>('#film-frame');
const ui = $<HTMLDivElement>('#ui');
const poster = $<HTMLElement>('#poster');
const endScreen = $<HTMLElement>('#end-screen');
const chapterSheet = $<HTMLElement>('#chapter-sheet');
const infoSheet = $<HTMLElement>('#info-sheet');
const chapterList = $<HTMLOListElement>('#chapter-list');
const btnPlay = $<HTMLButtonElement>('#btn-play');
const btnBack = $<HTMLButtonElement>('#btn-back');
const btnSound = $<HTMLButtonElement>('#btn-sound');
const btnCaptions = $<HTMLButtonElement>('#btn-captions');
const btnFullscreen = $<HTMLButtonElement>('#btn-fullscreen');
const btnLang = $<HTMLButtonElement>('#btn-lang');
const btnInfo = $<HTMLButtonElement>('#btn-info');
const btnChapter = $<HTMLButtonElement>('#btn-chapter');
const btnResume = $<HTMLButtonElement>('#btn-resume');
const resumeTime = $<HTMLElement>('#resume-time');
const seek = $<HTMLInputElement>('#seek');
const seekTicks = $<HTMLElement>('#seek-ticks');
const timecode = $<HTMLElement>('#timecode');
const chapterRoman = $<HTMLElement>('#chapter-roman');
const chapterName = $<HTMLElement>('#chapter-name');
const volume = $<HTMLInputElement>('#volume');
const toastEl = $<HTMLElement>('#toast');
const rotateHint = $<HTMLElement>('#rotate-hint');
const btnWatchAnyway = $<HTMLButtonElement>('#btn-watch-anyway');
const paperOverlay = $<HTMLElement>('#paper-overlay');
const captionLive = $<HTMLElement>('#caption-live');

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private mode */
    }
  },
};

const params = new URLSearchParams(location.search);
const queryTime = Number(params.get('t'));
const queryLang = params.get('lang');
const savedLang = storage.get('lm-lang');
const detected: Lang =
  queryLang === 'it' || queryLang === 'en'
    ? queryLang
    : savedLang === 'it' || savedLang === 'en'
      ? savedLang
      : (navigator.language || 'en').toLowerCase().startsWith('it')
        ? 'it'
        : 'en';

let lang: Lang = detected;
let started = false;
let playing = false;
let ended = false;
let time = 0;
let soundOn = storage.get('lm-sound') !== '0';
let muted = storage.get('lm-muted') === '1';
let captions = storage.get('lm-captions') !== '0';
let volumeValue = Number(storage.get('lm-volume') ?? '0.62');
if (!Number.isFinite(volumeValue)) volumeValue = 0.62;
volume.value = String(volumeValue);

let resumeAt = 0;
const storedTime = Number(storage.get('lm-time') ?? '0');
if (Number.isFinite(queryTime) && queryTime > 0) resumeAt = queryTime;
else if (Number.isFinite(storedTime) && storedTime > 3) resumeAt = storedTime;
resumeAt = clamp(resumeAt, 0, DURATION - 5);
if (resumeAt < 3) resumeAt = 0;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new FilmRenderer(canvas);
let quality = 1;
let lastDraw = 0;
let lastTick = performance.now();
let rafId = 0;
let lastSecond = -1;
let lastChapterId = '';
let lastCueId = '';
let audioChapter = -1;
let dirty = true;
let dragging = false;
let lastSave = 0;
let toastTimer = 0;
let hideTimer = 0;
let sheetWasPlaying = false;
let watchAnyway = false;
let rotateWasPlaying = false;
let wakeLock: { release?: () => Promise<void> } | null = null;

function t(key: StringKey): string {
  return STRINGS[key][lang];
}

function applyLanguage(update = true): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as StringKey | undefined;
    if (key && STRINGS[key]) el.innerHTML = STRINGS[key][lang];
  });
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach((el) => {
    const active = el.dataset.setLang === lang;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-pressed', String(active));
  });
  btnLang.textContent = lang.toUpperCase();
  btnLang.setAttribute('aria-label', t('changeLanguage'));
  btnInfo.setAttribute('aria-label', t('aboutFilm'));
  btnBack.setAttribute('aria-label', t('back'));
  btnCaptions.setAttribute('aria-label', t('captionsToggle'));
  btnFullscreen.setAttribute('aria-label', t('fullscreen'));
  btnSound.setAttribute('aria-label', muted || !soundOn ? t('unmute') : t('mute'));
  btnChapter.setAttribute('aria-label', t('chapters'));
  seek.setAttribute('aria-label', t('position'));
  volume.setAttribute('aria-label', t('volume'));
  document.querySelectorAll<HTMLButtonElement>('.close-btn').forEach((el) => el.setAttribute('aria-label', t('close')));
  if (update) {
    lastCueId = '';
    buildChapterList();
    renderCurrent(true);
  }
}

function setLanguage(next: Lang): void {
  if (next === lang) return;
  lang = next;
  storage.set('lm-lang', lang);
  applyLanguage(true);
}

function showToast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
}

function showHud(autoHide = true): void {
  if (ended) return;
  ui.classList.remove('is-hidden');
  ui.removeAttribute('inert');
  ui.setAttribute('aria-hidden', 'false');
  window.clearTimeout(hideTimer);
  if (autoHide && playing) {
    hideTimer = window.setTimeout(() => {
      if (playing) hideHud();
    }, 3200);
  }
}

function hideHud(): void {
  if (!started || ended) return;
  ui.classList.add('is-hidden');
  ui.setAttribute('inert', '');
  ui.setAttribute('aria-hidden', 'true');
}

function updateSoundUi(): void {
  const silent = !soundOn || muted;
  btnSound.dataset.muted = String(silent);
  btnSound.setAttribute('aria-label', silent ? t('unmute') : t('mute'));
}

async function ensureSound(): Promise<void> {
  if (!soundOn) return;
  await score.start();
  score.setMuted(muted);
  score.setVolume(volumeValue);
  const idx = chapterIndex(time);
  score.setChapter(idx, true);
  audioChapter = idx;
  if (playing) await score.resume();
}

function chapterIndex(at: number): number {
  const chapter = chapterAt(at);
  const idx = CHAPTERS.findIndex((c) => c.id === chapter.id);
  return idx < 0 ? CHAPTERS.length - 1 : idx;
}

function syncAudio(seek = false): void {
  if (!started || !soundOn) return;
  const idx = chapterIndex(time);
  if (idx !== audioChapter) {
    score.setChapter(idx, seek);
    audioChapter = idx;
  }
}

function startLoop(): void {
  if (rafId) return;
  lastTick = performance.now();
  rafId = window.requestAnimationFrame(frameLoop);
}

function setPlaying(value: boolean, fromUser = false): void {
  if (!started) return;
  if (value && time >= DURATION - 0.001) {
    time = 0;
    ended = false;
    endScreen.hidden = true;
  }
  playing = value;
  btnPlay.dataset.playing = String(value);
  btnPlay.setAttribute('aria-label', value ? t('pause') : t('play'));
  if (value) {
    ended = false;
    lastTick = performance.now();
    startLoop();
    if (soundOn) {
      void score.resume();
      syncAudio(false);
    }
    void requestWakeLock();
    showHud(true);
  } else {
    score.pause();
    void releaseWakeLock();
    window.clearTimeout(hideTimer);
    showHud(false);
    persistTime();
  }
  if (!fromUser && value) showHud(true);
  dirty = true;
  updateChrome(true);
}

function persistTime(): void {
  if (!started) return;
  if (time > 3 && time < DURATION - 1) {
    storage.set('lm-time', String(Math.floor(time)));
    resumeAt = Math.floor(time);
  } else if (time >= DURATION - 1) {
    storage.remove('lm-time');
  }
  lastSave = performance.now();
}

async function requestWakeLock(): Promise<void> {
  if (!playing) return;
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock || wakeLock) return;
    wakeLock = await nav.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}

async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release?.();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

async function startFilm(at: number, withSound: boolean): Promise<void> {
  poster.classList.add('is-gone');
  poster.setAttribute('aria-hidden', 'true');
  poster.setAttribute('inert', '');
  endScreen.hidden = true;
  ended = false;
  started = true;
  time = clamp(at, 0, DURATION - 0.001);
  ui.classList.remove('is-hidden');
  ui.removeAttribute('inert');
  ui.setAttribute('aria-hidden', 'false');
  updateChrome(true);
  if (withSound) {
    soundOn = true;
    muted = false;
    storage.set('lm-sound', '1');
    storage.set('lm-muted', '0');
    updateSoundUi();
    await ensureSound();
  } else {
    soundOn = false;
    muted = true;
    storage.set('lm-sound', '0');
    storage.set('lm-muted', '1');
    updateSoundUi();
  }
  setPlaying(true);
  renderCurrent(true);
  hideHudSoon();
}

function hideHudSoon(): void {
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (playing) hideHud();
  }, 3600);
}

function renderCurrent(force = false): void {
  if (!started) {
    renderer.renderPoster();
    lastDraw = performance.now();
    return;
  }
  if (force) dirty = true;
  const now = performance.now();
  if (dirty && now - lastDraw > 12) {
    renderer.render(time, {
      lang,
      captions,
      reducedMotion,
      quality,
    });
    lastDraw = now;
    dirty = false;
  }
  updateChrome(force);
}

function updateChrome(force = false): void {
  const chapter = chapterAt(time);
  const idx = CHAPTERS.findIndex((c) => c.id === chapter.id);
  if (force || chapter.id !== lastChapterId) {
    chapterRoman.textContent = chapter.roman;
    chapterName.textContent = chapter.title[lang];
    lastChapterId = chapter.id;
  }
  btnPlay.dataset.playing = String(playing);
  btnPlay.setAttribute('aria-label', playing ? t('pause') : t('play'));

  const sec = Math.floor(time);
  if (force || sec !== lastSecond) {
    timecode.innerHTML = `${formatTime(time)} <span>/ ${formatTime(DURATION)}</span>`;
    lastSecond = sec;
  }
  if (!dragging) {
    seek.value = String(time);
    const pct = (time / DURATION) * 100;
    seek.style.setProperty('--seek-progress', `${pct}%`);
  }
  // A screen-reader twin for the canvas narration.
  const cue = activeCue(time);
  if (!captions) {
    if (lastCueId) {
      captionLive.textContent = '';
      lastCueId = '';
    }
  } else if (cue && cue.id !== lastCueId) {
    captionLive.textContent = cue.french ? `${cue.french}. ${cue.text[lang]}` : cue.text[lang];
    lastCueId = cue.id;
  } else if (!cue && lastCueId) {
    captionLive.textContent = '';
    lastCueId = '';
  }
  if (started && playing && idx !== audioChapter && soundOn) {
    score.setChapter(idx);
    audioChapter = idx;
  }
}

function seekTo(next: number, fromUser = true): void {
  const target = clamp(next, 0, DURATION);
  if (target >= DURATION - 0.01) {
    finishFilm();
    return;
  }
  if (ended) {
    ended = false;
    endScreen.hidden = true;
  }
  time = target;
  resumeAt = Math.floor(target);
  if (started && soundOn) {
    const idx = chapterIndex(time);
    score.setChapter(idx, true);
    audioChapter = idx;
  }
  dirty = true;
  if (fromUser) renderCurrent(true);
  else updateChrome(true);
  persistTime();
}

function finishFilm(): void {
  if (ended) return;
  ended = true;
  playing = false;
  time = DURATION;
  score.pause();
  void releaseWakeLock();
  ui.classList.add('is-hidden');
  ui.setAttribute('inert', '');
  ui.setAttribute('aria-hidden', 'true');
  endScreen.hidden = false;
  storage.remove('lm-time');
  renderCurrent(true);
  updateChrome(true);
}

function togglePlay(): void {
  if (!started) {
    void startFilm(0, soundOn);
    return;
  }
  if (ended) {
    time = 0;
    ended = false;
    endScreen.hidden = true;
    setPlaying(true);
    return;
  }
  setPlaying(!playing, true);
  if (!playing) showHud(false);
}

function buildChapterList(): void {
  chapterList.replaceChildren();
  const current = chapterAt(time);
  CHAPTERS.forEach((chapter) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chapter-item';
    if (chapter.id === current.id) btn.classList.add('is-current');
    btn.setAttribute('aria-label', `${t('chapterPrefix')} ${chapter.title[lang]}`);
    const num = document.createElement('span');
    num.className = `num${chapter.roman.length > 4 ? ' is-word' : ''}`;
    num.textContent = chapter.roman;
    const names = document.createElement('span');
    names.className = 'names';
    const fr = document.createElement('span');
    fr.className = 'fr';
    fr.textContent = chapter.titleFr;
    const local = document.createElement('span');
    local.className = 'local';
    local.textContent = chapter.title[lang];
    names.append(fr);
    if (chapter.title[lang].toLowerCase() !== chapter.titleFr.toLowerCase()) names.append(local);
    const len = document.createElement('span');
    len.className = 'len';
    len.textContent = formatTime(chapter.end - chapter.start);
    btn.append(num, names, len);
    btn.addEventListener('click', () => {
      closeSheets(false);
      endScreen.hidden = true;
      ended = false;
      if (!started) void startFilm(Math.max(0, chapter.start + 0.25), soundOn);
      else {
        seekTo(Math.max(0.2, chapter.start + 0.25));
        setPlaying(true);
      }
    });
    li.append(btn);
    chapterList.append(li);
  });
  window.requestAnimationFrame(() => {
    chapterList.querySelector<HTMLElement>('.chapter-item.is-current')?.scrollIntoView({ block: 'center' });
  });
}

function openSheet(sheet: HTMLElement): void {
  closeSheets(false);
  sheetWasPlaying = playing;
  if (playing) setPlaying(false, true);
  if (sheet === chapterSheet) buildChapterList();
  sheet.hidden = false;
  ui.classList.add('is-hidden');
  ui.setAttribute('inert', '');
  ui.setAttribute('aria-hidden', 'true');
}

function closeSheets(resume = true): void {
  if (chapterSheet.hidden && infoSheet.hidden) return;
  chapterSheet.hidden = true;
  infoSheet.hidden = true;
  if (resume && sheetWasPlaying && started && !ended) setPlaying(true, true);
  sheetWasPlaying = false;
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await frame.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast(t('fullscreenUnavailable'));
  }
}

async function shareMoment(current: boolean): Promise<void> {
  const base = `${location.origin}${location.pathname}`;
  const url = new URL(base);
  if (current && time > 1 && time < DURATION - 2) {
    url.searchParams.set('t', String(Math.floor(time)));
  }
  url.searchParams.set('lang', lang);
  const data = {
    title: 'Les Misérables — Le Fil d’Or',
    text: t('shareText'),
    url: url.toString(),
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url.toString());
      showToast(t('copied'));
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') showToast(t('copied'));
  }
}

async function saveFrame(): Promise<void> {
  renderCurrent(true);
  const blob = await renderer.toBlob();
  if (!blob) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `les-miserables-${formatTime(time).replace(':', '')}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  showToast(t('saved'));
}

function setupSeekTicks(): void {
  seekTicks.replaceChildren();
  CHAPTERS.forEach((chapter) => {
    if (chapter.start === 0) return;
    const tick = document.createElement('span');
    tick.className = `seek-tick${chapter.ordinal > 0 ? ' is-major' : ''}`;
    tick.style.left = `${(chapter.start / DURATION) * 100}%`;
    seekTicks.append(tick);
  });
}

function updateRotateHint(): void {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const landscape = window.innerWidth > window.innerHeight;
  const shouldShow = coarse && landscape && !watchAnyway;
  if (shouldShow && rotateHint.hidden) {
    rotateWasPlaying = playing;
    if (playing) setPlaying(false, true);
  }
  rotateHint.hidden = !shouldShow;
  if (!shouldShow) {
    document.body.classList.toggle('watch-landscape', watchAnyway && landscape);
    if (rotateWasPlaying && started && !ended) {
      rotateWasPlaying = false;
      setPlaying(true, true);
    }
  }
}

function setupListeners(): void {
  btnPlay.addEventListener('click', () => togglePlay());
  btnBack.addEventListener('click', () => {
    seekTo(time - 10);
    showHud();
  });
  btnSound.addEventListener('click', async () => {
    if (!soundOn) {
      soundOn = true;
      muted = false;
      storage.set('lm-sound', '1');
      updateSoundUi();
      await ensureSound();
      if (playing) await score.resume();
      else score.pause();
    } else {
      muted = !muted;
      storage.set('lm-muted', muted ? '1' : '0');
      score.setMuted(muted);
      updateSoundUi();
    }
  });
  btnCaptions.addEventListener('click', () => {
    captions = !captions;
    storage.set('lm-captions', captions ? '1' : '0');
    btnCaptions.setAttribute('aria-pressed', String(captions));
    lastCueId = '';
    dirty = true;
    renderCurrent(true);
    showHud();
  });
  btnFullscreen.addEventListener('click', () => void toggleFullscreen());
  btnLang.addEventListener('click', () => setLanguage(lang === 'en' ? 'it' : 'en'));
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.setLang;
      if (next === 'en' || next === 'it') setLanguage(next);
    });
  });
  btnInfo.addEventListener('click', () => openSheet(infoSheet));
  btnChapter.addEventListener('click', () => openSheet(chapterSheet));
  document.querySelectorAll<HTMLElement>('[data-close-sheet]').forEach((el) => {
    el.addEventListener('click', () => closeSheets(true));
  });
  $<HTMLButtonElement>('#btn-content-note').addEventListener('click', () => openSheet(infoSheet));
  $<HTMLButtonElement>('#btn-begin').addEventListener('click', () => void startFilm(0, true));
  $<HTMLButtonElement>('#btn-begin-silent').addEventListener('click', () => void startFilm(0, false));
  btnResume.addEventListener('click', () => void startFilm(resumeAt, true));
  $<HTMLButtonElement>('#btn-replay').addEventListener('click', () => {
    endScreen.hidden = true;
    ended = false;
    time = 0;
    setPlaying(true, true);
  });
  $<HTMLButtonElement>('#btn-end-chapters').addEventListener('click', () => openSheet(chapterSheet));
  $<HTMLButtonElement>('#btn-end-share').addEventListener('click', () => void shareMoment(false));
  $<HTMLButtonElement>('#btn-share').addEventListener('click', () => void shareMoment(true));
  $<HTMLButtonElement>('#btn-save-frame').addEventListener('click', () => void saveFrame());
  btnWatchAnyway.addEventListener('click', () => {
    watchAnyway = true;
    updateRotateHint();
  });

  seek.addEventListener('pointerdown', () => {
    dragging = true;
  });
  seek.addEventListener('input', () => {
    dragging = true;
    seekTo(Number(seek.value), true);
    showHud();
  });
  seek.addEventListener('change', () => {
    dragging = false;
    seekTo(Number(seek.value), true);
  });
  window.addEventListener('pointerup', () => {
    if (dragging) {
      dragging = false;
      seekTo(Number(seek.value), true);
    }
  });

  canvas.addEventListener('click', () => {
    if (!started) return;
    if (ui.classList.contains('is-hidden')) showHud();
    else hideHud();
  });

  document.addEventListener('pointermove', (event) => {
    if (!started || ended) return;
    if (ui.classList.contains('is-hidden')) {
      if (event.pointerType === 'mouse') showHud();
      return;
    }
    showHud();
  });

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const editing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (event.key === 'Escape') {
      if (!infoSheet.hidden || !chapterSheet.hidden) closeSheets(true);
      return;
    }
    if (editing) return;
    if (event.code === 'Space' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      togglePlay();
      showHud();
    } else if (event.key === 'ArrowLeft') {
      seekTo(time - 10);
      showHud();
    } else if (event.key === 'ArrowRight') {
      seekTo(time + 10);
      showHud();
    } else if (event.key.toLowerCase() === 'm') {
      btnSound.click();
      showHud();
    } else if (event.key.toLowerCase() === 'c') {
      btnCaptions.click();
      showHud();
    } else if (event.key.toLowerCase() === 'f') {
      void toggleFullscreen();
    }
  });

  window.addEventListener('resize', () => {
    window.requestAnimationFrame(() => {
      renderer.resize();
      updateRotateHint();
      dirty = true;
      renderCurrent(true);
    });
  });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      renderer.resize();
      updateRotateHint();
      dirty = true;
      renderCurrent(true);
    }, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (playing) setPlaying(false, true);
      void releaseWakeLock();
    }
  });

  const wakeLockMedia = window.matchMedia('(pointer: coarse)');
  wakeLockMedia.addEventListener?.('change', () => updateRotateHint());

  volume.addEventListener('input', () => {
    volumeValue = Number(volume.value);
    storage.set('lm-volume', String(volumeValue));
    score.setVolume(volumeValue);
    if (volumeValue > 0 && muted) {
      muted = false;
      storage.set('lm-muted', '0');
      score.setMuted(false);
      updateSoundUi();
    }
  });
}

function setupResumeButton(): void {
  if (resumeAt > 3) {
    btnResume.hidden = false;
    resumeTime.textContent = formatTime(resumeAt);
  }
}

function frameLoop(now: number): void {
  rafId = 0;
  if (!started) {
    if (now - lastDraw > 85) {
      const loop = 96 + ((now / 1000) * 0.45) % 12;
      renderer.render(loop, { lang, captions: false, reducedMotion, quality });
      lastDraw = now;
    }
    rafId = window.requestAnimationFrame(frameLoop);
    return;
  }

  const delta = Math.min(0.5, (now - lastTick) / 1000);
  lastTick = now;

  if (playing) {
    time += delta;
    if (time >= DURATION) {
      finishFilm();
    }
  }

  if (now - lastDraw >= 32 || (!playing && dirty)) {
    renderer.render(time, { lang, captions, reducedMotion, quality });
    lastDraw = now;
    dirty = false;
    updateChrome();
    if (playing) {
      const chapter = chapterAt(time);
      const idx = CHAPTERS.findIndex((c) => c.id === chapter.id);
      if (soundOn && idx !== audioChapter) {
        score.setChapter(idx);
        audioChapter = idx;
      }
    }
    if (playing && now - lastSave > 5000) persistTime();
  }

  if (playing) rafId = window.requestAnimationFrame(frameLoop);
}

async function boot(): Promise<void> {
  const paperUrl = paperImageUrl();
  if (paperUrl) paperOverlay.style.backgroundImage = `url("${paperUrl}")`;
  applyLanguage(false);
  setupSeekTicks();
  setupListeners();
  setupResumeButton();
  btnCaptions.setAttribute('aria-pressed', String(captions));
  updateSoundUi();
  score.setVolume(volumeValue);
  score.setMuted(muted);
  updateRotateHint();

  const fontTasks = [
    document.fonts?.load('500 42px "Cormorant Garamond Variable"'),
    document.fonts?.load('600 14px "Inter Variable"'),
  ].filter(Boolean) as Promise<unknown>[];
  await Promise.race([
    Promise.all(fontTasks).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 2200)),
  ]);

  renderer.resize();
  renderer.renderPoster();
  lastDraw = performance.now();
  applyLanguage(true);
  startLoop();

  if (resumeAt > 3) {
    // A direct link to a moment: keep the poster, but show the moment behind it.
    lastDraw = 0;
  }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const register = (): void => {
      navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => undefined);
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
}

void boot();
