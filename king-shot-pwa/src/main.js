import { OATHS, PALETTES, THEME_ORDER } from './config.js';
import { createAudio } from './audio.js';
import {
  aimAt,
  castVolley,
  chooseUpgrade,
  createRun,
  drainEvents,
  endRun,
  fire,
  getSummary,
  resizeRun,
  skipDraft,
  spawnEnemy,
  update
} from './sim.js';
import { createRenderer } from './render.js';
import { createUI } from './ui.js';
import {
  loadProfile,
  recordRun,
  resetProfile,
  saveProfile,
  unlockAchievement
} from './storage.js';
import { ACHIEVEMENT_BY_ID } from './content.js';

const SLUG = 'king-shot-pwa/';
const SHARE_URL = 'https://lucagandolfi77.github.io/random2/king-shot-pwa/';
const REDUCED_QUERY = window.matchMedia?.('(prefers-reduced-motion: reduce)');

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();
const ui = createUI();

let profile = loadProfile();
let settings = loadSettings();
let run = null;
let phase = 'menu';
let lastFrame = 0;
let raf = 0;
let dragging = false;
let pointerId = null;
let scoreRecorded = false;
let currentSummary = null;
let currentRecord = null;
let deferredInstallPrompt = null;

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
    reducedMotion: Boolean(shared.reducedMotion ?? REDUCED_QUERY?.matches)
  };
}

function applySettings(patch = settings, persist = false) {
  settings = { ...settings, ...patch };
  if (persist) {
    try {
      window.R2?.setSettings?.(settings);
    } catch {
    }
  }
  audio.setSettings(settings);
  renderer.setReducedMotion(settings.reducedMotion);
  renderer.setShake(settings.shake);
  ui.setReducedMotionClass(settings.reducedMotion);
  if (settings.music && phase === 'playing') audio.startMusic();
  if (!settings.music) audio.stopMusic();
}

function applyTheme(theme, persist = true) {
  const next = THEME_ORDER.includes(theme) ? theme : 'royal';
  profile.theme = next;
  ui.setTheme(next);
  renderer.setTheme(next);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', PALETTES[next].sky0);
  if (persist) saveProfile(profile);
}

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.resize(width, height);
  if (run) resizeRun(run, width, height);
}

function openScreen(id) {
  phase = 'menu';
  ui.setPhase('menu');
  ui.setScreen(id);
}

function showMenu() {
  run = null;
  phase = 'menu';
  ui.clearToasts();
  dragging = false;
  audio.stopMusic();
  ui.setLowHp(false);
  ui.setPhase('menu');
  ui.setScreen('screen-menu');
  ui.renderMenu(profile);
}

function startRun({ oath = 'knight', daily = false } = {}) {
  audio.unlock();
  run = createRun({
    width: window.innerWidth,
    height: window.innerHeight,
    oath,
    daily
  });
  phase = 'playing';
  scoreRecorded = false;
  currentSummary = null;
  currentRecord = null;
  profile.oath = run.oath;
  profile.tutorialDone = true;
  saveProfile(profile);
  ui.clearToasts();
  ui.hideScreens();
  ui.setPhase('playing');
  ui.setLowHp(false);
  ui.renderHUD(run, profile.best);
  audio.setIntensity(run.wave);
  audio.startMusic();
  canvas.focus?.({ preventScroll: true });
  lastFrame = performance.now();
}

function openPause() {
  if (!run || phase !== 'playing') return;
  phase = 'paused';
  dragging = false;
  run.aim.active = false;
  ui.renderPause(run);
  ui.setPhase('paused');
  ui.setScreen('screen-pause');
  window.setTimeout(() => {
    document.querySelector('#screen-pause [data-action="resume"]')?.focus();
  }, 20);
  audio.stopMusic();
}

function resumeRun() {
  if (!run || phase !== 'paused') return;
  phase = 'playing';
  ui.hideScreens();
  ui.setPhase('playing');
  audio.startMusic();
  canvas.focus?.({ preventScroll: true });
}

function restartRun() {
  if (!run) return;
  const next = { oath: run.oath, daily: run.daily };
  startRun(next);
}

function recordFinishedRun() {
  if (!run || scoreRecorded) return;
  scoreRecorded = true;
  const summary = run.summary || getSummary(run);
  const record = recordRun(profile, summary);
  saveProfile(profile);
  currentSummary = summary;
  currentRecord = record;
  try {
    window.R2?.stats?.run?.({
      slug: SLUG,
      score: summary.score,
      durMs: summary.durationMs,
      wave: summary.wave,
      outcome: summary.outcome,
      meta: {
        oath: summary.oath,
        daily: summary.daily,
        date: summary.dateKey,
        bossKills: summary.bossKills,
        bullseyes: summary.bullseyes
      }
    });
  } catch {
  }
  return { summary, record };
}

function finishRun() {
  if (!run) return;
  const result = recordFinishedRun();
  if (!result) return;
  const { summary, record } = result;
  phase = 'over';
  audio.stopMusic();
  audio.play('gameover');
  ui.clearToasts();
  ui.setLowHp(false);
  ui.setPhase('over');
  ui.renderGameOver(summary, record, {
    daily: summary.daily,
    dailyBest: record.dailyBest,
    streak: record.streak,
    earned: [...run.earned, ...record.newAchievements]
  });
  ui.setScreen('screen-over');
  ui.renderMenu(profile);
}

function abandonRun() {
  if (!run) {
    showMenu();
    return;
  }
  if (phase === 'playing' || phase === 'paused' || phase === 'draft') {
    endRun(run, 'quit');
    handleEvents();
    recordFinishedRun();
  }
  ui.toast('Run banked', 'The wall keeps your score.', 'i-home');
  showMenu();
}

function handleAchievement(event) {
  if (unlockAchievement(profile, event.id)) {
    saveProfile(profile);
    if (run?.phase === 'over') return;
    const achievement = ACHIEVEMENT_BY_ID[event.id];
    ui.toast('Achievement unlocked', achievement?.name || event.id, 'i-trophy', 'achievement');
    audio.play('achievement');
  }
}

function handleEvents() {
  if (!run) return;
  const events = drainEvents(run);
  for (const event of events) {
    renderer.handleEvent(event);
    switch (event.type) {
      case 'wave':
        ui.banner(
          `Wave ${event.wave}`,
          event.boss ? 'A warlord answers.' : 'Hold the wall.',
          event.subtitle || (event.wind ? `Wind ${Math.abs(Math.round(event.wind))}` : ''),
          event.boss ? 'boss' : '',
          1600
        );
        audio.setIntensity(event.wave);
        audio.play('wave');
        break;
      case 'boss':
        ui.banner('Warlord', event.name, 'Break the siege. Shoot the boulders.', 'boss', 2200);
        audio.play('boss');
        window.R2?.buzz?.([30, 40, 60]);
        break;
      case 'bossKill':
        audio.play('kill');
        window.R2?.buzz?.(80);
        break;
      case 'shoot':
        audio.play('shoot', { power: event.power });
        break;
      case 'hit':
        if (event.crit) {
          audio.play('crit');
          window.R2?.buzz?.(14);
        } else {
          audio.play('hit');
        }
        break;
      case 'kill':
        audio.play('kill');
        break;
      case 'wallHit':
        audio.play('wallHit');
        window.R2?.buzz?.([45, 30, 70]);
        break;
      case 'blocked':
        audio.play('blocked');
        window.R2?.buzz?.(20);
        break;
      case 'pickup':
        audio.play('pickup');
        window.R2?.buzz?.(18);
        break;
      case 'heal':
        audio.play('heal');
        break;
      case 'shatter':
        audio.play('shatter');
        break;
      case 'summon':
        audio.play('summon');
        break;
      case 'volley':
        audio.play('volley');
        window.R2?.buzz?.(28);
        break;
      case 'achievement':
        handleAchievement(event);
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

  if (run && phase === 'playing') {
    update(run, dt);
    handleEvents();
    if (run.phase === 'draft') {
      phase = 'draft';
      audio.stopMusic();
      audio.play('draft');
      ui.setPhase('draft');
      ui.renderDraft(run);
      ui.setScreen('screen-draft');
      window.setTimeout(() => {
        document.querySelector('.draft-card')?.focus();
      }, 20);
    } else if (run.phase === 'over') {
      finishRun();
    } else {
      ui.renderHUD(run, profile.best);
    }
  }

  renderer.draw(run, dt);
  raf = requestAnimationFrame(loop);
}

function handleAction(action, element) {
  audio.unlock();
  audio.play('ui');
  switch (action) {
    case 'open-oath':
      openScreen('screen-oath');
      break;
    case 'open-daily':
      ui.renderDaily(profile);
      openScreen('screen-daily');
      break;
    case 'open-how':
      openScreen('screen-how');
      break;
    case 'open-achievements':
      ui.renderAchievements(profile);
      openScreen('screen-achievements');
      break;
    case 'open-settings':
      ui.renderSettings(settings, profile);
      openScreen('screen-settings');
      break;
    case 'back-menu':
      showMenu();
      break;
    case 'start-daily':
      startRun({ daily: true });
      break;
    case 'resume':
      resumeRun();
      break;
    case 'restart':
      restartRun();
      break;
    case 'abandon':
      abandonRun();
      break;
    case 'again':
      if (currentSummary?.daily) startRun({ daily: true });
      else startRun({ oath: currentSummary?.oath || 'knight' });
      break;
    case 'skip-draft':
      if (run && skipDraft(run)) {
        phase = 'playing';
        ui.hideScreens();
        ui.setPhase('playing');
        audio.startMusic();
        audio.play('ui');
        canvas.focus?.({ preventScroll: true });
      }
      break;
    case 'pick-upgrade': {
      const id = element.dataset.upgradeId;
      if (run && chooseUpgrade(run, id)) {
        phase = 'playing';
        ui.hideScreens();
        ui.setPhase('playing');
        audio.startMusic();
        canvas.focus?.({ preventScroll: true });
      }
      break;
    }
    case 'share':
      shareResult();
      break;
    case 'install':
      installApp();
      break;
    case 'open-reset':
      ui.showResetDialog();
      break;
    default:
      break;
  }
}

async function shareResult() {
  if (!currentSummary) {
    ui.toast('Nothing to share yet', 'Survive a wave first.', 'i-share');
    return;
  }
  const summary = currentSummary;
  const oath = OATHS[summary.oath]?.name || 'Knight';
  const text = `KING SHOT — ${summary.score.toLocaleString('en-US')} pts, wave ${summary.wave}, ${oath}${summary.daily ? ' Daily Siege' : ''}. The horde is at the gate.`;
  const data = { title: 'KING SHOT — The Last Wall', text, url: SHARE_URL };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`);
    ui.toast('Copied', 'The bards have your number.', 'i-share');
  } catch {
    const area = document.createElement('textarea');
    area.value = `${text}\n${SHARE_URL}`;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      ui.toast('Copied', 'The bards have your number.', 'i-share');
    } catch {
      ui.toast('Share unavailable', SHARE_URL, 'i-share');
    }
    area.remove();
  }
}

async function installApp() {
  if (!deferredInstallPrompt) {
    ui.toast('Install KING SHOT', 'Use your browser menu → Add to Home Screen.', 'i-download');
    return;
  }
  deferredInstallPrompt.prompt();
  try {
    await deferredInstallPrompt.userChoice;
  } catch {
  }
  deferredInstallPrompt = null;
  ui.setInstallAvailable(false);
}

function resetProgress() {
  profile = resetProfile(profile);
  saveProfile(profile);
  applyTheme(profile.theme, false);
  ui.renderMenu(profile);
  ui.renderSettings(settings, profile);
  ui.closeResetDialog();
  ui.toast('Chronicle erased', 'A clean wall. A fresh legend.', 'i-restart');
}

function toggleSetting(key) {
  const next = { ...settings, [key]: !settings[key] };
  applySettings(next, true);
  ui.renderSettings(settings, profile);
}

function setTheme(theme) {
  if (!THEME_ORDER.includes(theme)) return;
  applyTheme(theme);
  ui.renderSettings(settings, profile);
  audio.play('ui');
}

function handleOath(oath) {
  if (!OATHS[oath]) return;
  profile.oath = oath;
  saveProfile(profile);
  startRun({ oath });
}

function onPointerDown(event) {
  if (!run || phase !== 'playing') return;
  audio.unlock();
  event.preventDefault();
  dragging = true;
  pointerId = event.pointerId;
  try {
    canvas.setPointerCapture(pointerId);
  } catch {
  }
  aim(run, event.clientX, event.clientY);
}

function onPointerMove(event) {
  if (!dragging || !run || phase !== 'playing') return;
  aim(run, event.clientX, event.clientY);
}

function aim(currentRun, x, y) {
  aimAt(currentRun, x, y);
}

function endPointer(event, shouldFire) {
  if (!dragging || !run || phase !== 'playing') {
    dragging = false;
    return;
  }
  dragging = false;
  if (typeof event.clientX === 'number') aim(run, event.clientX, event.clientY);
  if (shouldFire) {
    const fired = fire(run, run.lastAim.angle, run.lastAim.power);
    if (fired) {
      audio.play('shoot', { power: run.lastAim.power });
      window.R2?.buzz?.(8);
    }
  }
  run.aim.active = false;
  pointerId = null;
  lastFrame = performance.now();
}

function onKeyDown(event) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
  if (event.key === 'Escape') {
    if (document.querySelector('dialog[open]')) return;
    if (phase === 'paused') resumeRun();
    else if (phase === 'playing') openPause();
    else if (phase === 'over') showMenu();
    else if (document.querySelector('.screen.is-active:not(#screen-menu)')) showMenu();
    return;
  }
  if (typing) return;
  if ((event.key === 'p' || event.key === 'P') && (phase === 'playing' || phase === 'paused')) {
    event.preventDefault();
    if (phase === 'paused') resumeRun();
    else openPause();
    return;
  }
  if (phase === 'draft' && ['1', '2', '3'].includes(event.key) && run?.draft) {
    const id = run.draft.choices[Number(event.key) - 1];
    if (id) {
      audio.play('ui');
      if (chooseUpgrade(run, id)) {
        phase = 'playing';
        ui.hideScreens();
        ui.setPhase('playing');
        audio.startMusic();
        canvas.focus?.({ preventScroll: true });
      }
    }
    return;
  }
  if (phase !== 'playing' || !run) return;
  if (event.key === 'q' || event.key === 'Q') {
    event.preventDefault();
    if (castVolley(run)) {
      audio.play('volley');
      window.R2?.buzz?.(28);
    }
    return;
  }
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    if (fire(run)) {
      audio.play('shoot', { power: run.lastAim.power });
      run.aim.active = false;
    }
  }
}

function onKeyAim(event) {
  if (phase !== 'playing' || !run) return;
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  let angle = run.lastAim.angle;
  let power = run.lastAim.power;
  if (event.key === 'ArrowLeft') angle -= 0.055;
  if (event.key === 'ArrowRight') angle += 0.055;
  if (event.key === 'ArrowUp') power = Math.min(1, power + 0.04);
  if (event.key === 'ArrowDown') power = Math.max(0.2, power - 0.04);
  angle = Math.max(-Math.PI + 0.1, Math.min(-0.1, angle));
  const kingX = run.width / 2;
  const kingY = run.wallTop - 26;
  run.lastAim = { angle, power };
  run.aim = {
    active: true,
    x: kingX + Math.cos(angle) * run.height * 0.4,
    y: kingY + Math.sin(angle) * run.height * 0.4,
    angle,
    power
  };
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      handleAction(actionEl.dataset.action, actionEl);
      return;
    }
    const oathEl = event.target.closest('[data-oath]');
    if (oathEl) {
      handleOath(oathEl.dataset.oath);
      return;
    }
    const settingEl = event.target.closest('[data-setting]');
    if (settingEl) {
      audio.play('ui');
      toggleSetting(settingEl.dataset.setting);
      return;
    }
    const themeEl = event.target.closest('button[data-theme]');
    if (themeEl) setTheme(themeEl.dataset.theme);
  });

  document.getElementById('reset-confirm')?.addEventListener('click', (event) => {
    event.preventDefault();
    resetProgress();
  });

  document.getElementById('pause-btn')?.addEventListener('click', openPause);
  document.getElementById('volley-btn')?.addEventListener('click', () => {
    if (!run || phase !== 'playing') return;
    audio.unlock();
    if (castVolley(run)) {
      audio.play('volley');
      window.R2?.buzz?.(28);
    }
  });

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', (event) => endPointer(event, true));
  canvas.addEventListener('pointercancel', (event) => endPointer(event, false));
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keydown', onKeyAim);

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && phase === 'playing') openPause();
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    ui.setInstallAvailable(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    ui.setInstallAvailable(false);
    ui.toast('Installed', 'KING SHOT is on your home screen.', 'i-download');
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
    });
  }
}

function boot() {
  applyTheme(profile.theme, false);
  applySettings(settings, false);
  ui.setPhase('menu');
  ui.setScreen('screen-menu');
  ui.renderMenu(profile);
  ui.renderSettings(settings, profile);
  resizeCanvas();
  bindEvents();
  registerServiceWorker();
  if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone) {
    ui.setInstallAvailable(false);
  }
  try {
    window.R2?.markPlayed?.(SLUG);
    window.R2?.trackPlaytime?.(SLUG);
  } catch {
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get('daily') === '1') {
    ui.renderDaily(profile);
    ui.setScreen('screen-daily');
  } else if (params.get('play') === '1') {
    ui.setScreen('screen-oath');
  }
  lastFrame = performance.now();
  raf = requestAnimationFrame(loop);
}

globalThis.KS = {
  get run() {
    return run;
  },
  get phase() {
    return phase;
  },
  get profile() {
    return profile;
  },
  startRun,
  showMenu,
  openPause,
  resumeRun,
  chooseUpgrade,
  skipDraft,
  castVolley,
  clearWave() {
    if (!run) return;
    run.spawnQueue = [];
    run.enemies = [];
    run.arrows = [];
    run.boulders = [];
  },
  spawn(type, x, y) {
    if (!run) return null;
    return spawnEnemy(run, type, { x, y });
  },
  endRun() {
    if (!run) return;
    endRun(run, 'quit');
    handleEvents();
    finishRun();
  }
};

boot();
