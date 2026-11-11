import './styles.css';
import type { CompiledFilm } from './data/types';
import { PlaybackClock } from './core/clock';
import { Stage } from './scene/stage';
import { Director, type FrameInfo } from './scene/director';
import { film, cameraFile, lightsFile } from './screenplay/filmData';
import { validateFilm } from './screenplay/compile';
import { actAt, sceneAt } from './screenplay/queries';
import { buildSrt } from './subtitles/subtitles';
import { AudioEngine } from './audio/audioEngine';
import { AppUI } from './ui/appUi';
import { clamp, smoothstep } from './utils/math';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root') as HTMLElement | null;

if (!canvas || !uiRoot) {
  throw new Error('Elementi base mancanti.');
}

const issues = validateFilm(film as CompiledFilm, cameraFile);
if (issues.length > 0) {
  uiRoot.innerHTML = `<div class="fatal">Errore nei dati del film:<br>${issues
    .slice(0, 4)
    .map((issue) => issue.message.replace(/</g, '&lt;'))
    .join('<br>')}</div>`;
  throw new Error(`Dati non validi: ${issues[0].message}`);
}

let stage: Stage;
try {
  stage = new Stage(canvas);
} catch (error) {
  uiRoot.innerHTML = `<div class="fatal">WebGL non è disponibile in questo browser.<br>Il cortometraggio richiede l'accelerazione grafica.</div>`;
  throw error;
}

const director = new Director(stage, film, cameraFile, lightsFile);
const clock = new PlaybackClock(film.duration);
const audio = new AudioEngine(film);
const volumes = { music: 0.7, ambience: 0.75, dialogue: 1 };
let voiceEnabled = true;
let endShown = false;
let started = false;
let lastRenderedTime = 0;

function actIndexOf(actId: string): number {
  return film.acts.findIndex((act) => act.id === actId);
}

function fadeAt(t: number): number {
  const start = film.duration - 6;
  return smoothstep((t - start) / 5);
}

function refresh(t: number): FrameInfo {
  const info = director.apply(t);
  ui.setTime(t);
  ui.setLine(info.line);
  ui.setAct(info.actId, actIndexOf(info.actId));
  ui.setFade(fadeAt(t));
  lastRenderedTime = t;
  return info;
}

function seek(t: number): void {
  const target = clamp(t, 0, film.duration);
  clock.seek(target);
  const info = director.apply(target);
  ui.setTime(target);
  ui.setLine(info.line);
  ui.setAct(info.actId, actIndexOf(info.actId));
  ui.setFade(fadeAt(target));
  if (audio.ready) audio.seek(target, info.env);
  if (target < film.duration - 1) {
    endShown = false;
    ui.hideEnd();
  }
  lastRenderedTime = target;
}

function ensureAudio(): void {
  const ok = audio.init();
  if (!ok) {
    ui.showToast('Audio non disponibile: il film continua in silenzio');
    return;
  }
  audio.setVolumes(volumes);
  audio.setVoiceEnabled(voiceEnabled);
}

function startFilm(): void {
  if (started) return;
  started = true;
  ensureAudio();
  clock.restart();
  ui.startFilm();
  const info = director.apply(0);
  ui.setTime(0);
  ui.setLine(info.line);
  ui.setAct(info.actId, 0);
  ui.setFade(0);
  ui.hideEnd();
  endShown = false;
  if (audio.ready) audio.seek(0, sceneAt(film, 0).env);
  ui.setPlaying(true);
  ui.setVoiceAvailable(audio.hasItalianVoice());
}

function togglePlay(): void {
  if (!started) {
    startFilm();
    return;
  }
  if (clock.ended) {
    hideEndAndRestart();
    return;
  }
  clock.toggle();
  ui.setPlaying(clock.playing);
  if (clock.playing) ensureAudio();
}

function hideEndAndRestart(): void {
  ui.hideEnd();
  endShown = false;
  clock.restart();
  seek(0);
  clock.play();
  ui.setPlaying(true);
  ensureAudio();
}

function skipAct(direction: number): void {
  if (!started) return;
  const current = actIndexOf(actAt(film, clock.time).id);
  const next = clamp(current + direction, 0, film.acts.length - 1);
  const act = film.acts[next];
  seek(act.start);
  if (!clock.playing) ui.setPlaying(false);
  ui.showToast(`Atto ${ROMAN[next] ?? next + 1} · ${act.title}`, 2200);
}

function exportSrt(): void {
  const srt = buildSrt(film);
  const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'il-prezzo-della-liberta.srt';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  ui.showToast('Sottotitoli esportati in SRT');
}

const ui = new AppUI(uiRoot, film, {
  onStart: startFilm,
  onTogglePlay: togglePlay,
  onRestart: () => {
    if (!started) {
      startFilm();
      return;
    }
    hideEndAndRestart();
  },
  onSeek: (time) => {
    if (!started) return;
    seek(time);
  },
  onSkipAct: skipAct,
  onActSelect: (actId) => {
    const act = film.acts.find((item) => item.id === actId);
    if (!act) return;
    seek(act.start);
    if (!clock.playing && started) ui.setPlaying(false);
  },
  onSpeed: (rate) => {
    clock.setRate(rate);
  },
  onFullscreen: () => {
    const container = document.getElementById('app');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => ui.showToast('Schermo intero non disponibile'));
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  },
  onSubtitleToggle: () => undefined,
  onVoiceToggle: (enabled) => {
    voiceEnabled = enabled;
    audio.setVoiceEnabled(enabled);
  },
  onVolume: (kind, value) => {
    volumes[kind] = value;
    if (audio.ready) audio.setVolumes({ [kind]: value });
  },
  onSubtitleSize: () => undefined,
  onExportSrt: exportSrt,
  onReplay: () => {
    started = true;
    hideEndAndRestart();
    ui.startFilm();
  }
});

window.addEventListener('resize', () => stage.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && clock.playing) {
    clock.pause();
    ui.setPlaying(false);
  }
});

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = (): void => ui.setVoiceAvailable(audio.hasItalianVoice());
  window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
  window.setTimeout(updateVoices, 700);
}

let last = 0;
function loop(now: number): void {
  requestAnimationFrame(loop);
  const t = clock.tick(now);
  if (!director.builtFlag) {
    if (last > 0) stage.render(now / 1000);
    last = now;
    return;
  }
  const info = refresh(t);
  if (!endShown && t >= film.duration - 0.35) {
    endShown = true;
    clock.pause();
    ui.setPlaying(false);
    ui.showEnd();
  }
  audio.tick(t, info, clock.playing, clock.rate);
  stage.render(t);
  last = now;
}

declare global {
  interface Window {
    __filmApp?: {
      seek: (time: number) => void;
      play: () => void;
      pause: () => void;
      time: () => number;
      duration: number;
      act: () => string;
      scene: () => string;
    };
  }
}

window.__filmApp = {
  seek: (time: number) => {
    if (!started) startFilm();
    clock.pause();
    ui.setPlaying(false);
    seek(time);
    stage.render(clock.time);
  },
  play: () => {
    if (!started) startFilm();
    clock.play();
    ui.setPlaying(true);
  },
  pause: () => {
    clock.pause();
    ui.setPlaying(false);
  },
  time: () => clock.time,
  duration: film.duration,
  act: () => actAt(film, clock.time).id,
  scene: () => sceneAt(film, clock.time).id
};

ui.setLoading(0.01, 'Costruzione degli ambienti…');
director
  .build((progress) => {
    ui.setLoading(progress * 0.99, `Costruzione delle scene · ${Math.min(12, Math.ceil(progress * 12))} / 12`);
  })
  .then(() => {
    refresh(0);
    stage.render(0);
    ui.setLoading(1);
    ui.setVoiceAvailable(audio.hasItalianVoice());
    ui.ready();
    requestAnimationFrame(loop);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    ui.fail(`Il film non ha potuto essere costruito: ${message}`);
  });

void lastRenderedTime;
