import { CHAPTERS, CHAPTER_BY_ID, FINAL_CHAPTER_ID, TOTAL_CHAPTERS } from './content.js';
import { FIXED_DT, MAX_STEPS, WEAPONS } from './config.js';
import { createState, drainEvents, setViewport, step } from './sim.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { loadProfile, recordChapter, resetProfile, saveProfile } from './storage.js';

const SLUG = 'milano-nera-pwa/';
const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();
const ui = createUI();
const input = createInput(canvas, () => state);

let profile = loadProfile();
let settings = loadSettings();
let state = null;
let gamePhase = 'title';
let pendingChapter = 1;
let lastSummary = null;
let lastRecord = null;
let accumulator = 0;
let lastFrame = 0;
let raf = 0;
let installPrompt = null;
let resizeTimer = 0;

function isPortrait() {
  return (window.visualViewport?.height || window.innerHeight) > (window.visualViewport?.width || window.innerWidth);
}

function viewForChapter(chapter) {
  if (chapter?.chase) return { w: 384, h: 216 };
  return isPortrait() ? { w: 216, h: 300 } : { w: 384, h: 216 };
}

function currentView() {
  if (!state) return { w: 384, h: 216 };
  if (state.mode === 'chase') return { w: 384, h: 216 };
  return isPortrait() ? { w: 216, h: 300 } : { w: 384, h: 216 };
}

function applyViewport() {
  const view = currentView();
  renderer.resizeView(view.w, view.h);
  if (state) setViewport(state, view.w, view.h);
  document.documentElement.style.setProperty('--view-w', String(view.w));
  document.documentElement.style.setProperty('--view-h', String(view.h));
  document.documentElement.style.setProperty('--frame-ratio', String(view.w / view.h));
  document.body.dataset.view = view.w < view.h ? 'portrait' : 'landscape';
}

function scheduleViewport() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    resizeTimer = 0;
    applyViewport();
  }, 60);
}

function loadSettings() {
  let shared = {};
  try {
    shared = window.R2?.getSettings?.() || {};
  } catch {
    shared = {};
  }
  return {
    sound: shared.sound !== false,
    music: shared.music !== false,
    haptics: shared.haptics !== false,
    shake: shared.shake !== false,
    reducedMotion: Boolean(shared.reducedMotion ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    masterVolume: Number.isFinite(Number(shared.masterVolume)) ? Math.max(0, Math.min(1, Number(shared.masterVolume))) : 0.82,
    musicVolume: Number.isFinite(Number(shared.musicVolume)) ? Math.max(0, Math.min(1, Number(shared.musicVolume))) : 0.78,
    sfxVolume: Number.isFinite(Number(shared.sfxVolume)) ? Math.max(0, Math.min(1, Number(shared.sfxVolume))) : 0.86
  };
}

function applySettings(persist = false) {
  audio.setSettings(settings);
  renderer.setReducedMotion(settings.reducedMotion);
  renderer.setShake(settings.shake);
  ui.setReducedMotion(settings.reducedMotion);
  if (persist) {
    try {
      window.R2?.setSettings?.(settings);
    } catch {}
  }
  if (!settings.music) audio.stopMusic();
}

function musicFor(current) {
  if (!current) return 'casa';
  if (current.mode === 'chase') return 'darsena';
  return current.level?.theme || 'casa';
}

function setPhase(phase) {
  gamePhase = phase;
  ui.setPhase(phase);
}

function showTitle() {
  state = null;
  accumulator = 0;
  audio.stopMusic();
  ui.clearToasts();
  ui.renderTitle(profile);
  ui.setScreen('screen-title');
  setPhase('title');
  applyViewport();
  renderer.reset();
}

function showChapters() {
  state = null;
  audio.stopMusic();
  ui.renderChapters(profile);
  ui.setScreen('screen-chapters');
  setPhase('chapters');
  applyViewport();
  renderer.reset();
}

function openIntro(chapterId) {
  const chapter = CHAPTER_BY_ID[chapterId] || CHAPTERS[0];
  pendingChapter = chapter.id;
  state = null;
  accumulator = 0;
  audio.stopMusic();
  ui.renderIntro(chapter);
  ui.setScreen('screen-intro');
  setPhase('intro');
  applyViewport();
  renderer.reset();
}

function beginChapter(chapterId, options = {}) {
  const chapter = CHAPTER_BY_ID[chapterId] || CHAPTERS[0];
  const view = viewForChapter(chapter);
  state = createState(chapter.id, {
    deaths: options.deaths || 0,
    viewW: view.w,
    viewH: view.h
  });
  applyViewport();
  accumulator = 0;
  lastFrame = performance.now();
  lastSummary = null;
  lastRecord = null;
  renderer.reset();
  renderer.setLevel();
  ui.clearToasts();
  ui.hideScreens();
  setPhase('playing');
  ui.renderHUD(state);
  audio.startMusic(musicFor(state));
  canvas.focus?.({ preventScroll: true });
  window.R2?.markPlayed?.(SLUG);
}

function openPause() {
  if (gamePhase !== 'playing' || !state) return;
  setPhase('paused');
  ui.renderPause(state);
  ui.setScreen('screen-pause');
  audio.stopMusic();
  input.reset();
  window.setTimeout(() => document.querySelector('#screen-pause [data-action="resume"]')?.focus(), 20);
}

function resumeGame() {
  if (gamePhase !== 'paused' || !state) return;
  ui.hideScreens();
  setPhase('playing');
  audio.startMusic(musicFor(state));
  canvas.focus?.({ preventScroll: true });
  lastFrame = performance.now();
  accumulator = 0;
}

function retryChapter() {
  if (!state) return;
  beginChapter(state.chapterId, { deaths: state.stats.deaths });
}

function deathSummary(current) {
  return {
    chapterId: current.chapterId,
    title: current.chapter.title,
    time: current.time,
    kills: current.stats.kills,
    stealthKills: current.stats.stealthKills,
    bossKills: current.stats.bossKills,
    accuracy: current.stats.shots > 0 ? current.stats.hits / current.stats.shots : 0,
    damage: current.stats.damage,
    deaths: current.stats.deaths,
    rank: '—'
  };
}

function showResult(won) {
  if (!state || gamePhase === 'result' || gamePhase === 'ending') return;
  const summary = won ? state.summary : deathSummary(state);
  let record = null;
  if (won) {
    record = recordChapter(profile, summary);
    saveProfile(profile);
    try {
      const score = summary.kills * 100 + summary.stealthKills * 250 + summary.bossKills * 1000;
      window.R2?.stats?.run?.({
        slug: SLUG,
        score,
        durMs: Math.round(summary.time * 1000),
        wave: summary.chapterId,
        outcome: 'win',
        meta: {
          rank: summary.rank,
          stealthKills: summary.stealthKills,
          deaths: summary.deaths
        }
      });
    } catch {}
    audio.play('chapter');
  } else {
    audio.play('death');
    try {
      window.R2?.stats?.run?.({
        slug: SLUG,
        score: summary.kills * 100,
        durMs: Math.round(summary.time * 1000),
        wave: summary.chapterId,
        outcome: 'loss',
        meta: { deaths: summary.deaths }
      });
    } catch {}
  }
  lastSummary = summary;
  lastRecord = record;
  const final = won && summary.chapterId === FINAL_CHAPTER_ID;
  audio.stopMusic();
  ui.clearToasts();
  ui.renderResult(summary, record, { won, final });
  ui.setScreen('screen-result');
  setPhase('result');
}

function showEnding() {
  audio.stopMusic();
  audio.play('chapter');
  ui.renderEnding(profile);
  ui.setScreen('screen-ending');
  setPhase('ending');
}

function nextChapter() {
  if (!lastSummary) return;
  if (lastSummary.chapterId >= FINAL_CHAPTER_ID) showEnding();
  else openIntro(lastSummary.chapterId + 1);
}

function abandon() {
  showTitle();
}

function toggleSetting(key) {
  settings = { ...settings, [key]: !settings[key] };
  applySettings(true);
  ui.renderSettings(settings, profile);
}

function resetProgress() {
  profile = resetProfile(profile);
  saveProfile(profile);
  ui.closeResetDialog();
  ui.renderTitle(profile);
  ui.toast('Notte cancellata', 'La città dimentica in fretta.');
}

function handleAchievementEvents(events) {
  for (const event of events) {
    switch (event.type) {
      case 'stage':
        renderer.reset();
        renderer.setLevel();
        ui.banner(
          event.stage === 'chase' ? 'Inseguimento' : `Capitolo ${event.chapterId}`,
          event.title || 'La notte continua',
          event.stage === 'chase' ? 'La Darsena aspetta.' : 'Milano non dorme.',
          2000
        );
        break;
      case 'shoot':
        audio.play(WEAPONS[event.weapon]?.sound || 'pistol');
        break;
      case 'chaseShoot':
        audio.play('smg');
        break;
      case 'enemyShoot':
      case 'chaseEnemyShoot':
        audio.play('enemyShoot');
        break;
      case 'chaseHit':
        audio.play('hit');
        break;
      case 'chaseTraffic':
        audio.play('impact');
        break;
      case 'roll':
        audio.play('roll');
        break;
      case 'vault':
        audio.play('vault');
        break;
      case 'heal':
        audio.play('pickup');
        break;
      case 'hit':
        audio.play('hit');
        break;
      case 'kill':
        audio.play('kill');
        break;
      case 'takedown':
        audio.play('takedown');
        ui.toast('Silenzio', 'Takedown riuscito.');
        window.R2?.buzz?.(20);
        break;
      case 'hurt':
      case 'chaseHurt':
        audio.play('hurt');
        window.R2?.buzz?.([35, 25, 55]);
        break;
      case 'reload':
        audio.play('reload');
        break;
      case 'reloaded':
        break;
      case 'empty':
        audio.play('empty');
        break;
      case 'ricochet':
        audio.play('ricochet');
        ui.toast('Rimbalzo', 'La città fa il resto.');
        break;
      case 'impact':
        audio.play('impact');
        break;
      case 'explosion':
        audio.play('explosion');
        window.R2?.buzz?.(60);
        break;
      case 'crash':
        audio.play('crash');
        window.R2?.buzz?.([40, 30, 60]);
        break;
      case 'pickup':
        audio.play('pickup');
        if (event.text) ui.toast(event.text, 'Raccolto.');
        break;
      case 'weapon':
        audio.play('ui');
        ui.toast(event.name || 'Arma', 'La notte cambia musica.');
        break;
      case 'objective':
        audio.play('objective');
        if (event.text) ui.toast('Obiettivo', event.text);
        break;
      case 'alert':
        audio.play('alert');
        break;
      case 'bossIntro':
        audio.play('boss');
        ui.banner('Boss', event.name, 'La notte ha una faccia sola.', 2000);
        window.R2?.buzz?.([35, 25, 60]);
        break;
      case 'bossDown':
        audio.play('bossDown');
        window.R2?.buzz?.([50, 40, 80]);
        break;
      case 'chaseClear':
        audio.play('bossDown');
        ui.toast('Inseguimento finito', 'La Darsena è vicina.');
        break;
      case 'trainWarning':
        audio.play('alert');
        break;
      case 'trainHit':
        audio.play('crash');
        window.R2?.buzz?.([70, 30, 90]);
        break;
      case 'death':
        break;
      case 'chapterClear':
        break;
      default:
        break;
    }
  }
}

function loop(timestamp) {
  const raw = lastFrame ? (timestamp - lastFrame) / 1000 : 0.016;
  lastFrame = timestamp;
  const dt = Math.min(0.05, Math.max(0, raw));

  if (gamePhase === 'playing' && state) {
    accumulator += dt;
    const intent = input.getIntent();
    let steps = 0;
    let first = true;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS && state.phase === 'playing') {
      const frameIntent = first ? intent : { ...intent, roll: false, reload: false, action: false, molotov: false };
      step(state, frameIntent, FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
      first = false;
    }
    const aimLength = Math.hypot(intent.aimX, intent.aimY) || 1;
    if (state.mode === 'chase') {
      state.reticle = {
        x: state.chase.car.x + (intent.aimX / aimLength) * 65,
        y: state.chase.car.y + (intent.aimY / aimLength) * 65
      };
    } else {
      state.reticle = {
        x: state.player.x + (intent.aimX / aimLength) * 70,
        y: state.player.y + (intent.aimY / aimLength) * 70
      };
    }
    const events = drainEvents(state);
    for (const event of events) renderer.handleEvent(event);
    handleAchievementEvents(events);
    ui.renderHUD(state);
    if (state.phase === 'clear') showResult(true);
    else if (state.phase === 'dead') showResult(false);
  }

  renderer.draw(gamePhase === 'chapters' || gamePhase === 'intro' || gamePhase === 'help' || gamePhase === 'settings' || gamePhase === 'title' ? null : state, dt);
  raf = requestAnimationFrame(loop);
}

function bindEvents() {
  document.addEventListener('input', (event) => {
    const volume = event.target.closest('[data-volume]');
    if (!volume) return;
    const key = `${volume.dataset.volume}Volume`;
    settings = { ...settings, [key]: Number(volume.value) / 100 };
    applySettings(true);
  });

  document.addEventListener('click', (event) => {
    const chapterEl = event.target.closest('[data-chapter]');
    if (chapterEl) {
      const id = Number(chapterEl.dataset.chapter);
      if (id <= profile.unlocked) openIntro(id);
      return;
    }
    const settingEl = event.target.closest('[data-setting]');
    if (settingEl) {
      toggleSetting(settingEl.dataset.setting);
      return;
    }
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    audio.unlock();
    audio.play('ui');
    switch (action) {
      case 'new-game': openIntro(1); break;
      case 'continue': openIntro(Math.min(TOTAL_CHAPTERS, Math.max(1, profile.unlocked))); break;
      case 'open-chapters': showChapters(); break;
      case 'open-help': state = null; applyViewport(); ui.setScreen('screen-help'); setPhase('help'); break;
      case 'open-settings': ui.renderSettings(settings, profile); state = null; applyViewport(); ui.setScreen('screen-settings'); setPhase('settings'); break;
      case 'back-title': showTitle(); break;
      case 'back-chapters': showChapters(); break;
      case 'enter-chapter': beginChapter(pendingChapter); break;
      case 'resume': resumeGame(); break;
      case 'restart': retryChapter(); break;
      case 'abandon': abandon(); break;
      case 'next-chapter': nextChapter(); break;
      case 'retry': retryChapter(); break;
      case 'open-reset': ui.showResetDialog(); break;
      case 'install': installGame(); break;
      default: break;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
      if (gamePhase === 'playing') {
        event.preventDefault();
        openPause();
      } else if (gamePhase === 'paused') {
        event.preventDefault();
        resumeGame();
      } else if (gamePhase === 'intro') {
        showChapters();
      } else if (gamePhase === 'chapters' || gamePhase === 'help' || gamePhase === 'settings') {
        showTitle();
      }
    }
  });

  document.getElementById('pause-btn')?.addEventListener('click', openPause);
  document.getElementById('reset-confirm')?.addEventListener('click', (event) => {
    event.preventDefault();
    resetProgress();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && gamePhase === 'playing') openPause();
    if (document.visibilityState === 'visible') scheduleViewport();
  });

  window.addEventListener('resize', scheduleViewport);
  window.addEventListener('orientationchange', scheduleViewport);
  window.visualViewport?.addEventListener('resize', scheduleViewport);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    ui.setInstallAvailable(true);
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    ui.setInstallAvailable(false);
    ui.toast('Installato', 'MILANO NERA ’77 è sulla tua home screen.');
  });
}

async function installGame() {
  if (!installPrompt) {
    ui.toast('Installa', 'Usa il menu del browser → Aggiungi alla schermata Home.');
    return;
  }
  installPrompt.prompt();
  try {
    await installPrompt.userChoice;
  } catch {}
  installPrompt = null;
  ui.setInstallAvailable(false);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function boot() {
  applySettings(false);
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone;
  if (isIOS && !standalone) {
    const browser = /CriOS/i.test(ua) ? 'chrome' : 'safari';
    ui.setIOSInstallVisible(
      true,
      browser === 'chrome'
        ? 'Su Chrome iOS usa il menu o Condividi → “Aggiungi alla schermata Home”. Per la modalità standalone completa, Safari è la scelta migliore.'
        : 'Tocca Condividi → “Aggiungi alla schermata Home”. MILANO NERA ’77 si aprirà a schermo intero, con audio e progressi salvati sul dispositivo.'
    );
  }
  const unlockAudio = () => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  if (input.isCoarse() || navigator.maxTouchPoints > 0) {
    document.body.classList.add('has-touch');
  }
  ui.renderSettings(settings, profile);
  ui.renderTitle(profile);
  ui.setScreen('screen-title');
  setPhase('title');
  applyViewport();
  const params = new URLSearchParams(window.location.search);
  if (params.get('play') === '1') openIntro(1);
  else if (params.get('chapters') === '1') showChapters();
  bindEvents();
  registerServiceWorker();
  lastFrame = performance.now();
  raf = requestAnimationFrame(loop);
  try {
    window.R2?.markPlayed?.(SLUG);
    window.R2?.trackPlaytime?.(SLUG);
  } catch {}
  window.MN = {
    get state() { return state; },
    get phase() { return gamePhase; },
    get profile() { return profile; },
    openIntro,
    beginChapter,
    showTitle,
    showChapters,
    showResult,
    showEnding,
    openPause,
    resumeGame,
    retryChapter,
    toggleSetting
  };
}

boot();
