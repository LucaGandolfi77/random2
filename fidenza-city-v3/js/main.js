import * as THREE from 'three';
import { WORLD, SCORE, PLAYER, VERSION, SAVE_KEY } from './config.js';
import { clamp, formatDistance, normalizeAngle, angleDiff, formatNumber, formatTime, escapeHtml } from './utils.js';
import { loadSave, getSave, setName, addScore, addStar, addPlace, resetSave, isAudioEnabled, getStats, getCareer, addStat, addUniqueStat, flush, markSeason, markDay, setStatFlag } from './save.js';
import { evaluateAchievements, achievementState } from './achievements.js';
import { getDailySnapshot, recordDaily } from './daily.js';
import { CareerManager, CAREER_TYPES, UPGRADES, careerLevel } from './career.js';
import { getEventSnapshot } from './events.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { World } from './world.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { MissionManager } from './missions.js';
import { GameMap } from './map.js';
import { PhotoMode, PHOTO_FILTERS } from './photo-mode.js';
import { PostFX } from './postfx.js';
import { buildDiary } from './diary.js';
import { listPhotos, deletePhoto, downloadPhoto, clearPhotos } from './photo-store.js';
import { prefetchTiles, storageEstimate, ensurePersistentStorage, shouldSkipPrefetch, hasTileCache } from './ground-cache.js';

const canvas = document.getElementById('game');
const clock = new THREE.Clock();
const hud = new HUD();
const audio = new AudioEngine();
const input = new Input(canvas);
const saveState = loadSave();
audio.muted = !isAudioEnabled();
hud.setAudioMuted(audio.muted);

const isMobile = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
const qualityParam = new URLSearchParams(location.search).get('quality');
const quality = ['low', 'medium', 'high'].includes(qualityParam)
  ? qualityParam
  : (isMobile
    ? ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 'low' : 'medium')
    : 'high');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: quality !== 'low',
  powerPreference: 'high-performance',
  alpha: false
});
const pixelRatioCap = isMobile
  ? (quality === 'high' ? 1.35 : quality === 'medium' ? 1.2 : 1)
  : (quality === 'high' ? 1.5 : 1.15);
let currentPixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
let minimapTimer = 0;
let bigMapTimer = 0;
let adaptiveFrames = 0;
let adaptiveLast = performance.now();
renderer.setPixelRatio(currentPixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// L'ortofoto e i materiali PBR del suolo guadagnano da un tone mapping
// filmico; i colori dei blocchi restano leggibili perché l'esposizione è
// tarata sul palette Arnis.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = quality !== 'low' && (!isMobile || quality === 'high');

function applyRendererScale(ratio) {
  currentPixelRatio = clamp(ratio, 0.72, pixelRatioCap);
  renderer.setPixelRatio(currentPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  postfx?.setSize();
}
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isMobile ? 70 : 74, window.innerWidth / window.innerHeight, 0.1, 5000);

let postfx = null;
postfx = new PostFX({ renderer, quality, isMobile });
postfx.setSize();

let world = null;
let mapData = null;
let seasonStyles = {};
let currentSeason = 'autumn';
let seasonSetting = 'auto';
let player = null;
let vehicles = null;
let missions = null;
let career = null;
let map = null;
let careerTab = 'taxi';
let photoMode = null;
let photoSavedHour = null;
let photoSavedSeason = null;
let photoSeason = 'autumn';
let photoPlaceTimer = 0;
let photoStatusTimer = 0;
let photoCache = [];
let statsCarry = { walk: 0, drive: 0, playTime: 0, maxSpeed: 0 };
let lastPlayerTrack = null;
let statsFlushTimer = 0;
let achievementTimer = 0;
let lastDailySignature = '';
let eventSnapshot = null;
let eventInitialized = false;
let lastEventId = '';
let eventSeen = '';
let eventVisitAccum = 0;
const forcedEvent = new URLSearchParams(location.search).get('event');
let state = 'intro';
let started = false;
let currentInteraction = null;
let activeNpc = null;
let activeNpcLine = 0;
let npcFirstMeet = false;
let selectedPlace = null;
let weather = { temp: null, label: 'cielo', icon: '☀', rain: 0, clouds: 0.2 };
let baseHour = 15;
let lastHudUpdate = 0;
let lastZone = '';
let lastZoneKind = '';
let lastDistrictId = '';
let diaryTab = 'gazzetta';
let lastPromptKey = '';
let pausedByDialog = false;
let gameTime = 0;
let pendingStart = false;
let clockFrozen = false;

const deepParams = new URLSearchParams(location.search);
const deepX = Number(deepParams.get('x'));
const deepZ = Number(deepParams.get('z'));
const deepYaw = Number(deepParams.get('yaw'));
const deepHour = Number(deepParams.get('hour'));
const deepSpawn = Number.isFinite(deepX) && Number.isFinite(deepZ)
  ? { x: deepX, z: deepZ, yaw: Number.isFinite(deepYaw) ? deepYaw : WORLD.spawn.yaw }
  : null;
const deepHourValue = Number.isFinite(deepHour) ? deepHour : null;

const ui = {
  play: document.getElementById('play'),
  nameDialog: document.getElementById('name-dialog'),
  nameForm: document.getElementById('name-form'),
  nameInput: document.getElementById('name-input'),
  missionDialog: document.getElementById('mission-dialog'),
  infoDialog: document.getElementById('info-dialog'),
  infoClose: document.getElementById('info-close'),
  npcDialog: document.getElementById('npc-dialog'),
  diaryDialog: document.getElementById('diary-dialog'),
  diaryTabs: document.getElementById('diary-tabs'),
  diaryContent: document.getElementById('diary-content'),
  npcNext: document.getElementById('npc-next'),
  npcClose: document.getElementById('npc-close'),
  pauseDialog: document.getElementById('pause-dialog'),
  boardDialog: document.getElementById('board-dialog'),
  confirmDialog: document.getElementById('confirm-dialog'),
  resume: document.getElementById('resume'),
  pauseMap: document.getElementById('pause-map'),
  pauseHome: document.getElementById('pause-home'),
  pauseFly: document.getElementById('pause-fly'),
  pauseMissions: document.getElementById('pause-missions'),
  pauseCareer: document.getElementById('pause-career'),
  pauseBoard: document.getElementById('pause-board'),
  pauseDiary: document.getElementById('pause-diary'),
  pauseAudio: document.getElementById('pause-audio'),
  pausePhoto: document.getElementById('pause-photo'),
  pauseAchievements: document.getElementById('pause-achievements'),
  pauseExport: document.getElementById('pause-export'),
  pauseImport: document.getElementById('pause-import'),
  saveImport: document.getElementById('save-import'),
  pauseDaily: document.getElementById('pause-daily'),
  pauseReset: document.getElementById('pause-reset'),
  dailyCard: document.getElementById('daily-card'),
  dailyTitle: document.getElementById('daily-title'),
  dailyDesc: document.getElementById('daily-desc'),
  dailyReward: document.getElementById('daily-reward'),
  dailyBar: document.getElementById('daily-bar'),
  dailyProgress: document.getElementById('daily-progress'),
  eventCard: document.getElementById('event-card'),
  eventTitle: document.getElementById('event-title'),
  eventDesc: document.getElementById('event-desc'),
  eventTime: document.getElementById('event-time'),
  pauseEvent: document.getElementById('pause-event'),
  achievementsDialog: document.getElementById('achievements-dialog'),
  statsGrid: document.getElementById('stats-grid'),
  achievementList: document.getElementById('achievement-list'),
  achievementSummary: document.getElementById('achievement-summary'),
  careerDialog: document.getElementById('career-dialog'),
  careerSummary: document.getElementById('career-summary'),
  careerLicense: document.getElementById('career-license'),
  careerTabs: document.getElementById('career-tabs'),
  careerJobs: document.getElementById('career-jobs'),
  careerGarage: document.getElementById('career-garage'),
  careerHistory: document.getElementById('career-history'),
  photoMode: document.getElementById('photo-mode'),
  photoPlace: document.getElementById('photo-place'),
  photoStatus: document.getElementById('photo-status'),
  photoFilter: document.getElementById('photo-filter'),
  photoFrame: document.getElementById('photo-frame'),
  photoStick: document.getElementById('photo-stick'),
  photoKnob: document.getElementById('photo-knob'),
  photoHour: document.getElementById('photo-hour'),
  graphicsQuality: document.getElementById('graphics-quality'),
  photoSeason: document.getElementById('photo-season'),
  photoGrid: document.getElementById('photo-grid'),
  photoGridToggle: document.getElementById('photo-grid-toggle'),
  photoPlayerToggle: document.getElementById('photo-player-toggle'),
  photoVehiclesToggle: document.getElementById('photo-vehicles-toggle'),
  photoCapture: document.getElementById('photo-capture'),
  photoExit: document.getElementById('photo-exit'),
  photoGalleryOpen: document.getElementById('photo-gallery-open'),
  photoGallery: document.getElementById('photo-gallery'),
  photoGalleryGrid: document.getElementById('photo-gallery-grid'),
  photoGalleryEmpty: document.getElementById('photo-gallery-empty'),
  pwaUpdate: document.getElementById('pwa-update'),
  boardOpen: document.getElementById('board-open'),
  reset: document.getElementById('reset'),
  whoChange: document.getElementById('who-change'),
  confirmYes: document.getElementById('confirm-yes'),
  confirmNo: document.getElementById('confirm-no'),
  mapbox: document.getElementById('mapbox'),
  rotateHint: document.getElementById('rotate-hint'),
  touchQuick: document.getElementById('touch-quick'),
  touchDrive: document.getElementById('touch-drive'),
  touchFly: document.getElementById('touch-fly'),
  btnRun: document.getElementById('btn-run'),
  btnBrake: document.getElementById('btn-brake'),
  btnHorn: document.getElementById('btn-horn'),
  btnAct: document.getElementById('btn-act')
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

function loadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function haptic(pattern = 18) {
  if (isMobile && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

function nowLabel() {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
  return fmt.format(d);
}

function weatherInfo(code) {
  const map = {
    0: ['☀', 'sereno'],
    1: ['🌤', 'poco nuvoloso'],
    2: ['⛅', 'nuvoloso'],
    3: ['☁', 'coperto'],
    45: ['🌫', 'nebbia'],
    48: ['🌫', 'nebbia'],
    51: ['🌦', 'pioviggine'],
    53: ['🌦', 'pioviggine'],
    55: ['🌧', 'pioggia'],
    61: ['🌧', 'pioggia'],
    63: ['🌧', 'pioggia'],
    65: ['🌧', 'pioggia forte'],
    71: ['🌨', 'neve'],
    73: ['🌨', 'neve'],
    75: ['🌨', 'neve'],
    80: ['🌦', 'rovesci'],
    81: ['🌧', 'rovesci'],
    82: ['⛈', 'temporale'],
    95: ['⛈', 'temporale'],
    96: ['⛈', 'temporale'],
    99: ['⛈', 'temporale']
  };
  return map[code] || ['☀', 'cielo'];
}

function seasonFromMonth(month = new Date().getMonth()) {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function resolveSeasonSetting() {
  const params = new URLSearchParams(location.search);
  const url = params.get('season');
  if (url && ['spring', 'summer', 'autumn', 'winter'].includes(url)) return url;
  const saved = getSave().settings?.season;
  if (saved && ['auto', 'spring', 'summer', 'autumn', 'winter'].includes(saved)) return saved;
  return 'auto';
}

function resolveSeason(setting) {
  return setting === 'auto' ? seasonFromMonth() : setting;
}

function seasonLabel(id) {
  const labels = { auto: 'Automatica', spring: 'Primavera', summer: 'Estate', autumn: 'Autunno', winter: 'Inverno' };
  return labels[id] || labels.auto;
}

function syncSeasonSelects() {
  for (const id of ['season-select', 'season-select-intro']) {
    const el = document.getElementById(id);
    if (el) el.value = seasonSetting;
  }
  const label = document.getElementById('season-current');
  if (label) label.textContent = `Ora: ${seasonLabel(currentSeason)}`;
}

function applySeason(setting, { silent = false } = {}) {
  seasonSetting = ['auto', 'spring', 'summer', 'autumn', 'winter'].includes(setting) ? setting : 'auto';
  currentSeason = resolveSeason(seasonSetting);
  const style = seasonStyles[currentSeason];
  if (world) world.setSeason(style || null, currentSeason);
  markSeason(currentSeason);
  const save = getSave();
  save.settings.season = seasonSetting;
  try { localStorage.setItem('fidenza-da-giocare-v1', JSON.stringify(save)); } catch { /* ignore */ }
  syncSeasonSelects();
  if (!silent) hud.setToast(`Stagione: ${seasonLabel(currentSeason)}${seasonSetting === 'auto' ? ' (automatica)' : ''}`, 2200);
  audio.click();
  refreshDailyUI();
  checkAchievements(!silent);
}

async function loadWeather() {
  if (!navigator.onLine) return weather;
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=44.8665&longitude=10.0612&current=temperature_2m,weather_code,precipitation,cloud_cover&timezone=Europe%2FRome';
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error('meteo');
    const j = await res.json();
    const cur = j.current || {};
    const [icon, label] = weatherInfo(cur.weather_code);
    weather = {
      temp: cur.temperature_2m ?? null,
      label,
      icon,
      rain: (cur.precipitation || 0) > 0.1 ? 0.7 : 0,
      clouds: (cur.cloud_cover ?? 20) / 100
    };
  } catch {
    weather = { temp: null, label: 'cielo', icon: '☀', rain: 0, clouds: 0.2 };
  }
  return weather;
}

function updateClock() {
  if (photoMode?.active) return;
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const h = Number(parts.find(p => p.type === 'hour')?.value || 15);
  const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
  baseHour = h + m / 60;
  if (world) world.setHour(baseHour + gameTime / 3600 * 0.6);
}

async function init() {
  const versionEl = document.getElementById('game-version');
  if (versionEl) versionEl.textContent = `v${VERSION}`;
  hud.setLoading(0.02, 'Carico la mappa di Fidenza…');
  await document.fonts?.ready;
  updateClock();
  const [city, terrain, mapJson, arnisJson] = await Promise.all([
    fetchJSON('./data/city.json'),
    fetchJSON('./data/terrain.json'),
    fetchJSON('./data/map.json'),
    fetchJSON('./data/arnis/arnis.json').catch(err => {
      console.warn('Dati Arnis non disponibili', err);
      return null;
    })
  ]);
  let ground = null;
  try {
    hud.setLoading(0.06, 'Leggo l’ortofoto di Fidenza…');
    const groundMeta = await fetchJSON('./data/ground/ground.json');
    const baseLevels = groundMeta.base?.levels || [];
    const wantedBase = quality === 'high' ? 'z0' : quality === 'medium' ? 'z1' : 'z2';
    const baseLevel = baseLevels.find(level => level.id === wantedBase) || baseLevels[baseLevels.length - 1];
    const groundImage = await loadImage(`./data/ground/${baseLevel?.src || 'ortho-z0.jpg'}`);
    let groundCenterImage = null;
    if (quality !== 'low' && groundMeta.center?.levels?.length) {
      const wantedCenter = quality === 'high' ? 'z0' : 'z1';
      const centerLevel = groundMeta.center.levels.find(level => level.id === wantedCenter)
        || groundMeta.center.levels[groundMeta.center.levels.length - 1];
      groundCenterImage = await loadImage(`./data/ground/${centerLevel.src}`);
    }
    ground = { meta: groundMeta, image: groundImage, centerImage: groundCenterImage };
  } catch (err) {
    console.warn('Ortofoto non disponibile, uso la mappa dei blocchi Arnis', err);
    if (arnisJson?.meta?.surface) {
      const lods = arnisJson.meta.surface.lods || [];
      const lod = lods.find(level => level.id === (quality === 'high' ? 'z0' : quality === 'medium' ? 'z1' : 'z2')) || lods[0];
      const fallbackImage = await loadImage(`./data/arnis/${lod?.src || 'surface.png'}`);
      ground = {
        meta: {
          base: { bounds: WORLD.bounds, levels: [] },
          license: 'Mappa dei blocchi ArnisWorld3 (fallback)'
        },
        image: fallbackImage
      };
    }
  }
  mapData = mapJson;
  hud.setLoading(0.08, 'Preparo la città…');
  world = new World({
    scene,
    renderer,
    city,
    terrain,
    map: mapJson,
    quality,
    isMobile,
    arnis: arnisJson,
    ground
  });
  await world.build((p, label) => {
    hud.setLoading(0.08 + p * 0.84, label);
  });
  const initialSpawn = mapJson.spawn || WORLD.spawn;
  world.groundTiles?.preload(initialSpawn.x, initialSpawn.z);
  world.onFirework = () => audio.firework();

  // Stili stagionali: li carichiamo tutti, sono piccoli e servono al selettore.
  const stylePairs = await Promise.all(
    Object.entries(mapJson.seasons?.styles || {}).map(async ([id, rel]) => {
      try { return [id, await fetchJSON('./' + rel)]; }
      catch (err) { console.warn('Stagione non caricata', id, err); return [id, null]; }
    })
  );
  seasonStyles = Object.fromEntries(stylePairs.filter(([, s]) => s));
  seasonSetting = resolveSeasonSetting();
  currentSeason = resolveSeason(seasonSetting);
  world.setSeason(seasonStyles[currentSeason] || null, currentSeason);
  markSeason(currentSeason);
  markDay();

  player = new Player({ scene, camera, world, input });
  const sp = deepSpawn || mapData?.spawn || WORLD.spawn;
  player.spawn(sp.x, sp.z, sp.yaw);
  if (deepHourValue != null) {
    world.setHour(deepHourValue);
    clockFrozen = true;
  }
  vehicles = new VehicleManager({ scene, world, audio, player, input });
  vehicles.spawnAll();

  missions = new MissionManager({
    scene, world, audio, player,
    onComplete: (def, points, elapsed) => {
      const careerResult = career?.completeJob(def, elapsed);
      if (careerResult) {
        if (careerResult.kind === 'license') {
          hud.setBig('PATENTE CONSEGUITA', 1900);
          hud.setToast(`Esame superato · +${formatNumber(careerResult.payout)} € · +${careerResult.xp} XP`, 3600);
        } else {
          hud.setBig('LAVORO COMPLETATO', 1800);
          hud.setToast(`${def.title} · +${formatNumber(careerResult.payout)} € · +${careerResult.xp} XP`, 3800);
        }
        if (careerResult.levelUp) {
          hud.setToast(`Livello ${careerResult.level} raggiunto!`, 3200);
          audio.tone(523, 0.3, 'triangle', 0.06, 784);
        }
        if (photoMode?.active) setPhotoStatus(`Lavoro completato · +${formatNumber(careerResult.payout)} €`, 3600);
        recordDailyProgress('career', 1);
        if (careerResult.event) recordDailyProgress('event', 1);
        refreshCareerUI();
      } else {
        hud.setBig('MISSIONE COMPLETA', 1800);
        hud.setToast(`${def.title} · +${formatNumber(points)} punti`, 3200);
        addStat('missions', 1);
        recordDailyProgress('mission', 1);
        checkEventBadges();
      }
      haptic(35);
      refreshSaveUI();
      recordDailyProgress('score', points);
      checkAchievements(true);
    },
    onFail: (def) => {
      if (photoMode?.active) setPhotoStatus(`Tempo scaduto · ${def.title}`, 3600);
      const careerResult = career?.failJob(def);
      if (careerResult) {
        hud.setBig(careerResult.kind === 'license' ? 'ESAME NON SUPERATO' : 'LAVORO FALLITO', 1700);
        hud.setToast(careerResult.kind === 'license' ? 'Riprova l’esame di guida.' : `Lavoro fallito: ${def.title}`, 3000);
        refreshCareerUI();
        refreshSaveUI();
      } else {
        hud.setBig('TEMPO SCADUTO', 1600);
        hud.setToast(`Missione fallita: ${def.title}`, 2800);
      }
    },
    onToast: (text) => hud.setToast(text)
  });

  career = new CareerManager({
    missions, world, vehicles, audio,
    onToast: text => hud.setToast(text),
    onChange: () => refreshCareerUI(),
    onJobStart: offer => {
      hud.setBig('LAVORO ACCETTATO', 1200);
      hud.setToast(`${offer.title} · ${formatNumber(offer.payout)} €`, 3200);
    }
  });

  map = new GameMap({ world, player, missions, vehicles });

  photoMode = new PhotoMode({
    canvas, renderer, scene, camera, player, vehicles, input, world,
    getSeason: () => photoSeason || currentSeason,
    onEnter: () => {
      photoPlaceTimer = 0;
      updatePhotoPlace();
    },
    onExit: () => clearPhotoStatus(),
    onCapture: (photo) => {
      flashPhoto();
      setPhotoStatus(`Cartolina salvata · ${photo.place}`);
      addStat('photos', 1);
      if (/duomo/i.test(photo.place || '')) setStatFlag('photoDuomo', true);
      recordDailyProgress('photo', 1, { place: photo.place });
      const photoStepDone = career?.registerPhoto(photo);
      if (photoStepDone) setPhotoStatus('Foto consegnata · tappa completata', 3200);
      const newly = checkAchievements(true);
      if (newly.length) setPhotoStatus(`Obiettivo sbloccato · ${newly[0].title}`, 3400);
    }
  });
  photoMode.renderFrame = () => postfx.render(scene, camera, { dof: quality === 'high' && !isMobile ? 0.34 : 0.2 });

  world.setWeather(weather);
  updateClock();
  world.setHour(baseHour);
  if (deepHourValue != null) {
    world.setHour(deepHourValue);
    clockFrozen = true;
  }
  refreshIntro();
  checkAchievements(false);
  checkEventBadges();
  loadWeather().then(w => {
    world.setWeather(w);
    refreshIntro();
  });  bindUI();
  hud.setLoading(1, 'Fidenza è pronta');
  hud.setPlayReady(true, 'Gioca');
  hud.hideLoading();
  window.__fidenza = { world, player, vehicles, missions, career, map, photoMode, hud, renderer, scene, camera, input, postfx, arnis: world.arnis, groundTiles: world.groundTiles, startGame, getState: () => state, setHour: h => world.setHour(h), applySeason, enterPhoto, exitPhoto, freezeClock: (f = true) => { clockFrozen = !!f; } };
  camera.position.set(-40, 20, 100);
  camera.lookAt(-120, 8, 20);
  requestAnimationFrame(loop);
  registerServiceWorker();
  setInterval(() => {
    if (clockFrozen) return;
    updateClock();
    refreshClockOnly();
    if (seasonSetting === 'auto' && resolveSeason('auto') !== currentSeason) applySeason('auto', { silent: true });
    refreshDailyUI();
    refreshEventUI();
  }, 30000);
}

function refreshIntro() {
  const save = getSave();
  hud.fillIntro({
    save,
    weather,
    nowLabel: nowLabel(),
    totalStars: world.starObjects.length,
    totalPlaces: world.placeObjects.length
  });
  hud.setProgress(save.stars.length, world.starObjects.length, save.places.length, world.placeObjects.length);
  hud.setScore(save.score, false);
  hud.setAudioMuted(audio.muted);
  syncSeasonSelects();
  refreshDailyUI();
  refreshEventUI();
  updateCareerChip();
}

function updateCareerChip() {
  if (!hud) return;
  const c = getCareer();
  hud.setCareer(careerLevel(c.xp || 0).level, c.money || 0);
}

function refreshClockOnly() {
  const el = document.getElementById('now');
  if (el) el.textContent = nowLabel();
}

function refreshSaveUI() {
  const save = getSave();
  refreshIntro();
  hud.setScore(save.score);
  hud.setProgress(save.stars.length, world.starObjects.length, save.places.length, world.placeObjects.length);
  if (ui.infoDialog?.open) { /* lascia aperto */ }
}

function achievementContext() {
  return {
    totalStars: world?.starObjects?.length || 0,
    totalPlaces: world?.placeObjects?.length || 0,
    totalMissions: (world?.map?.missions || missions?.list() || []).filter(m => !m.event).length
  };
}

function checkAchievements(announce = true) {
  if (!world || !missions) return [];
  const newly = evaluateAchievements(achievementContext());
  if (announce && started && newly.length) {
    const titles = newly.map(d => d.title).join(' · ');
    hud.setToast(`Obiettivo sbloccato · ${titles}`, 3800);
    hud.setBig('OBIETTIVO', 1500);
    audio.tone(880, 0.12, 'triangle', 0.07, 1320);
    audio.tone(1320, 0.18, 'triangle', 0.06, 1760, 0.1);
  }
  return newly;
}

function checkEventBadges() {
  const save = getSave();
  const festival = ['san-donnino-procession', 'san-donnino-torta-fritta', 'san-donnino-photo'];
  if (!festival.every(id => save.missions?.[id])) return false;
  if (!addUniqueStat('badges', 'san-donnino')) return false;
  hud.setBig('BADGE · SAN DONNINO', 2200);
  hud.setToast('Badge Festa di San Donnino ottenuto!', 3600);
  audio.tone(523, 0.2, 'triangle', 0.06, 784);
  audio.tone(784, 0.28, 'triangle', 0.06, 1046, 0.12);
  return true;
}

function formatPlayTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function refreshDailyUI() {
  if (!world) return;
  const snap = getDailySnapshot();
  const challenge = snap.challenge;
  const unit = challenge.id === 'distance' || challenge.id === 'walk'
    ? ' m'
    : challenge.id === 'speed' ? ' km/h' : '';
  const progressText = snap.done
    ? `Completata · +${formatNumber(challenge.reward)} punti`
    : `${formatNumber(snap.progress)} / ${formatNumber(challenge.target)}${unit}`;
  lastDailySignature = `${snap.challenge.date}:${snap.progress}:${snap.done}`;

  if (ui.dailyTitle) ui.dailyTitle.textContent = challenge.title;
  if (ui.dailyDesc) ui.dailyDesc.textContent = challenge.desc;
  if (ui.dailyReward) ui.dailyReward.textContent = `+${formatNumber(challenge.reward)} pt`;
  if (ui.dailyBar) ui.dailyBar.style.width = `${snap.percent}%`;
  if (ui.dailyProgress) ui.dailyProgress.textContent = progressText;
  ui.dailyCard?.classList.toggle('done', snap.done);
  if (ui.pauseDaily) {
    ui.pauseDaily.innerHTML = `<b>⚑ ${escapeHtml(challenge.title)}</b>${snap.done ? ' · <span class="pd-done">completata</span>' : ''}<br>${escapeHtml(challenge.desc)}<div class="daily-bar"><i style="width:${snap.percent}%"></i></div>`;
  }
}

function eventClockDate() {
  const date = new Date();
  const hour = Number.isFinite(world?.hour) ? world.hour : date.getHours() + date.getMinutes() / 60;
  date.setHours(Math.floor(hour) % 24, Math.floor((hour % 1) * 60), 0, 0);
  return date;
}

function refreshEventUI() {
  if (!world) return;
  eventSnapshot = getEventSnapshot(eventClockDate(), forcedEvent);
  const active = eventSnapshot.active;
  world.setEvent(active);
  career?.setEvent(active);
  missions?.setEvent(active?.id || null);
  const event = active || eventSnapshot.next || null;
  const isActive = !!active;
  const label = event?.schedule?.label || '';
  ui.eventCard?.classList.toggle('active', isActive);
  const badge = event?.id === 'san-donnino' && (getStats().badges || []).includes('san-donnino');
  const desc = event ? `${event.short}${badge ? ' · Badge ottenuto ✓' : ''}` : 'Fidenza scorre tranquilla.';
  if (ui.eventTitle) ui.eventTitle.textContent = event ? event.title : 'Nessun evento';
  if (ui.eventDesc) ui.eventDesc.textContent = desc;
  if (ui.eventTime) ui.eventTime.textContent = event ? `${isActive ? 'in corso' : 'oggi'} · ${label}` : '—';
  if (ui.pauseEvent) {
    ui.pauseEvent.className = `pause-event${isActive ? ' active' : ''}`;
    ui.pauseEvent.innerHTML = event
      ? `<b>⚑ ${escapeHtml(event.title)}</b><br>${escapeHtml(desc)}<br>${isActive ? 'In corso' : 'Oggi'} · ${escapeHtml(label)}`
      : 'Nessun evento oggi.';
  }
  if (active && active.id !== lastEventId) {
    if (eventInitialized && started) {
      hud.setToast(`${active.title} · ${active.schedule.label}`, 3600);
      hud.setBig(active.title.toUpperCase(), 1500);
    }
    lastEventId = active.id;
    eventSeen = '';
    eventVisitAccum = 0;
  } else if (!active) {
    lastEventId = '';
    eventSeen = '';
    eventVisitAccum = 0;
  }
  eventInitialized = true;
}

function recordDailyProgress(event, amount = 1, meta = {}) {
  if (!world) return null;
  const result = recordDaily(event, amount, meta);
  if (result.completedNow) {
    const challenge = result.snapshot.challenge;
    hud.setToast(`Sfida del giorno completata · +${formatNumber(challenge.reward)} punti`, 3600);
    hud.setBig('SFIDA COMPLETATA', 1600);
    audio.tone(660, 0.14, 'triangle', 0.06, 880);
    audio.tone(880, 0.2, 'triangle', 0.06, 1320, 0.1);
    refreshSaveUI();
    checkAchievements(true);
  }
  refreshDailyUI();
  return result.snapshot;
}

function trackStats(dt) {
  if (!player || !world) return;
  const pos = player.position;
  if (lastPlayerTrack) {
    const moved = Math.hypot(pos.x - lastPlayerTrack.x, pos.z - lastPlayerTrack.z);
    if (moved > 0.005 && moved < 25) {
      if (vehicles?.current) statsCarry.drive += moved;
      else statsCarry.walk += moved;
    }
  }
  lastPlayerTrack = { x: pos.x, z: pos.z };
  statsCarry.playTime += dt;
  if (vehicles?.current) {
    const kmh = Math.abs(vehicles.current.speed) * 3.6;
    if (kmh > statsCarry.maxSpeed) statsCarry.maxSpeed = kmh;
  }
}

function flushStats() {
  if (!world) return;
  const stats = getStats();
  let changed = false;
  const walk = statsCarry.walk;
  const drive = statsCarry.drive;
  const maxSpeed = statsCarry.maxSpeed;
  const playTime = statsCarry.playTime;
  statsCarry = { walk: 0, drive: 0, playTime: 0, maxSpeed: 0 };

  if (walk > 0) {
    stats.walkMeters = (stats.walkMeters || 0) + walk;
    changed = true;
    recordDailyProgress('walk', walk);
  }
  if (drive > 0) {
    stats.driveMeters = (stats.driveMeters || 0) + drive;
    changed = true;
  }
  if (walk + drive > 0) recordDailyProgress('distance', walk + drive);
  if (maxSpeed > (stats.maxSpeed || 0)) {
    stats.maxSpeed = maxSpeed;
    changed = true;
    recordDailyProgress('speed', maxSpeed);
  }
  if (playTime > 0) {
    stats.playTime = (stats.playTime || 0) + playTime;
    changed = true;
  }
  if (changed) flush();
  checkAchievements(true);
}

function openAchievements() {
  input.exitPointerLock();
  renderAchievementsDialog();
  if (!ui.achievementsDialog?.open) ui.achievementsDialog?.showModal();
}

function renderAchievementsDialog() {
  if (!ui.statsGrid || !ui.achievementList) return;
  const save = getSave();
  const stats = getStats();
  const ctx = achievementContext();
  const missionsDone = Object.keys(save.missions || {}).length;
  const boxes = [
    [formatNumber(save.stars.length) + ' / ' + formatNumber(ctx.totalStars), 'stelle'],
    [formatNumber(save.places.length) + ' / ' + formatNumber(ctx.totalPlaces), 'luoghi'],
    [`${missionsDone} / ${ctx.totalMissions}`, 'missioni'],
    [(stats.walkMeters / 1000).toFixed(1) + ' km', 'a piedi'],
    [(stats.driveMeters / 1000).toFixed(1) + ' km', 'in auto'],
    [formatNumber(stats.maxSpeed) + ' km/h', 'velocità max'],
    [formatNumber(stats.photos), 'foto scattate'],
    [formatNumber(stats.jobs), 'lavori'],
    [`${formatNumber(stats.moneyEarned)} €`, 'guadagni'],
    [formatNumber((stats.eventsSeen || []).length), 'eventi vissuti'],
    [formatNumber((stats.badges || []).length), 'badge evento'],
    [`${(stats.seasons || []).length} / 4`, 'stagioni'],
    [formatNumber((stats.days || []).length), 'giorni di gioco'],
    [formatPlayTime(stats.playTime), 'tempo in città'],
    [formatNumber(save.score), 'punti totali']
  ];
  ui.statsGrid.innerHTML = boxes.map(([value, label]) => `<div class="stat-box"><b>${value}</b><span>${label}</span></div>`).join('');

  const list = achievementState(ctx);
  const unlocked = list.filter(a => a.unlocked).length;
  if (ui.achievementSummary) ui.achievementSummary.textContent = `${unlocked} / ${list.length} obiettivi sbloccati`;
  ui.achievementList.innerHTML = list.map(a => {
    const displayValue = a.target <= 20 ? (Math.round(a.value * 10) / 10) : formatNumber(a.value);
    return `
      <article class="achievement-item${a.unlocked ? ' unlocked' : ''}">
        <div class="ach-icon">${a.icon}</div>
        <div><h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.desc)}</p></div>
        <div class="ach-progress">${a.unlocked ? 'fatto' : `${displayValue}/${a.target <= 20 ? a.target : formatNumber(a.target)}`}
          <i><b style="width:${a.percent}%"></b></i>
        </div>
      </article>`;
  }).join('');
}

function openCareer() {
  input.exitPointerLock();
  renderCareerDialog();
  if (!ui.careerDialog?.open) ui.careerDialog?.showModal();
}

function refreshCareerUI() {
  updateCareerChip();
  if (ui.careerDialog?.open) renderCareerDialog();
}

function renderCareerDialog() {
  if (!ui.careerSummary || !career) return;
  const c = getCareer();
  const lv = careerLevel(c.xp || 0);
  const money = formatNumber(c.money || 0);
  ui.careerSummary.innerHTML = `
    <div class="career-stat">
      <span>Livello</span><b>${lv.level}</b>
      <small>${lv.next == null ? 'Livello massimo' : `${formatNumber(c.xp || 0)} / ${formatNumber(lv.next)} XP`}</small>
      <div class="career-xp-bar"><i style="width:${lv.progress}%"></i></div>
    </div>
    <div class="career-stat">
      <span>Contanti</span><b>${money} €</b>
      <small>${formatNumber(c.jobsDone || 0)} lavori completati</small>
    </div>
    <div class="career-stat">
      <span>Reputazione</span><b>${formatNumber(c.reputation || 0)}</b>
      <small>Bonus paghe +${Math.min(50, c.reputation || 0)}%</small>
    </div>`;

  if (!c.license) {
    ui.careerLicense.className = 'career-license locked';
    ui.careerLicense.innerHTML = `<div><b>Patente da conseguire</b><br>Supera l’esame di guida per sbloccare taxi e consegne. Il servizio fotografico è già disponibile.</div><button type="button" data-career-action="license" class="primary">Sostieni l’esame</button>`;
  } else {
    ui.careerLicense.className = 'career-license';
    ui.careerLicense.innerHTML = `<div><b>Patente conseguita ✓</b><br>Taxi e corriere sono sbloccati. Livello ${lv.level}.</div>`;
  }

  ui.careerTabs.innerHTML = Object.entries(CAREER_TYPES).map(([id, def]) => {
    const locked = !c.license && id !== 'photo';
    return `<button type="button" data-career-tab="${id}" class="${careerTab === id ? 'active' : ''} ${locked ? 'locked' : ''}">${def.icon} ${def.label}${locked ? ' 🔒' : ''}</button>`;
  }).join('');

  const activeDef = missions?.active?.def;
  if (activeDef?.career) {
    const payout = activeDef.career.payout ? ` · +${formatNumber(activeDef.career.payout)} €` : '';
    ui.careerJobs.innerHTML = `
      <article class="career-job active">
        <h4>${escapeHtml(activeDef.title)}</h4>
        <p>${escapeHtml(activeDef.short || 'Lavoro in corso.')}</p>
        <div class="job-meta"><span>In corso</span>${payout ? `<span>${payout}</span>` : ''}</div>
        <div class="job-actions"><button type="button" data-career-action="cancel">Annulla lavoro</button></div>
      </article>`;
  } else if (!c.license && careerTab !== 'photo') {
    ui.careerJobs.innerHTML = `<p class="career-empty">Devi prima conseguire la patente per accettare lavori da ${CAREER_TYPES[careerTab]?.label || 'autista'}.</p>`;
  } else {
    const offers = career.getOffers(careerTab);
    ui.careerJobs.innerHTML = offers.length ? offers.map((offer, index) => `
      <article class="career-job">
        <h4>${escapeHtml(offer.title)}</h4>
        <p>${escapeHtml(offer.short)}</p>
        <div class="job-meta">
          <span>+${formatNumber(offer.payout)} €</span>
          <span>+${formatNumber(offer.xp)} XP</span>
          <span>⏱ ${formatTime(offer.time)}</span>
          ${offer.night ? '<span>☾ notte</span>' : ''}
          ${offer.event ? `<span>⚑ ${escapeHtml(offer.eventTitle || 'Evento')}</span>` : ''}
          ${offer.distance ? `<span>${formatNumber(offer.distance)} m</span>` : ''}
        </div>
        <div class="job-actions"><button type="button" class="primary" data-career-action="accept" data-index="${index}">Accetta lavoro</button></div>
      </article>`).join('') : '<p class="career-empty">Nessun lavoro disponibile. Riprova più tardi.</p>';
  }

  const upgrades = c.upgrades || {};
  ui.careerGarage.innerHTML = Object.entries(UPGRADES).map(([key, def]) => {
    const level = upgrades[key] || 0;
    const cost = def.costs[level];
    const disabled = level >= 3 || (c.money || 0) < cost;
    return `
      <div class="upgrade-card">
        <h4>${def.label}</h4>
        <p>${def.desc}</p>
        <div class="upgrade-pips">${[0, 1, 2].map(i => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</div>
        <button type="button" data-upgrade="${key}" ${disabled ? 'disabled' : ''}>${level >= 3 ? 'Massimo' : `Migliora · ${formatNumber(cost)} €`}</button>
      </div>`;
  }).join('');

  const history = (c.history || []).slice(0, 5);
  ui.careerHistory.innerHTML = history.length
    ? `<b>Ultimi lavori</b><ul>${history.map(h => `<li>${escapeHtml(h.title)}${h.payout ? ` · +${formatNumber(h.payout)} €` : ''}${h.xp ? ` · +${formatNumber(h.xp)} XP` : ''}</li>`).join('')}</ul>`
    : `<b>Nessun lavoro ancora</b><br>Accetta un lavoro per iniziare la tua carriera.`;
}

function startCareerOffer(index) {
  if (!career) return;
  const offers = career.getOffers(careerTab);
  const offer = offers[index];
  if (!offer) return;
  if (!career.startOffer(offer)) {
    hud.setToast('Non riesco ad avviare il lavoro', 2600);
    return;
  }
  ui.careerDialog?.close();
  refreshSaveUI();
  requestPointerLock();
}

function startLicenseExam() {
  if (!career) return;
  if (!career.startLicense()) {
    hud.setToast('Non riesco ad avviare l’esame', 2600);
    return;
  }
  ui.careerDialog?.close();
  hud.setBig('ESAME DI GUIDA', 1600);
  hud.setToast('Raggiungi i tre checkpoint nel tempo limite', 3000);
  requestPointerLock();
}

function cancelCareerJob() {
  if (!missions?.activeId) return;
  missions.abort();
  if (career) career.activeOffer = null;
  refreshCareerUI();
  hud.setToast('Lavoro annullato', 2200);
}

function buyUpgrade(key) {
  if (!career) return;
  const result = career.buyUpgrade(key);
  if (!result.ok) {
    const msg = result.reason === 'money' ? 'Soldi insufficienti' : result.reason === 'max' ? 'Potenziamento già al massimo' : 'Potenziamento non disponibile';
    hud.setToast(msg, 2400);
    return;
  }
  audio.click();
  hud.setToast(`${UPGRADES[key].label} migliorato al livello ${result.level}`, 2600);
  refreshSaveUI();
  refreshCareerUI();
}

function bindUI() {
  if (ui.graphicsQuality) {
    ui.graphicsQuality.value = qualityParam || 'auto';
    ui.graphicsQuality.addEventListener('change', event => {
      if (!window.confirm('Cambiare qualità grafica ricaricherà il gioco. Continuare?')) {
        event.target.value = qualityParam || 'auto';
        return;
      }
      flushStats();
      const url = new URL(location.href);
      if (event.target.value === 'auto') url.searchParams.delete('quality');
      else url.searchParams.set('quality', event.target.value);
      location.href = url.toString();
    });
  }
  ui.play?.addEventListener('click', () => {
    audio.init();
    audio.setMuted(audio.muted);
    if (audio.ctx?.state === 'suspended') audio.resume();
    const save = getSave();
    if (!save.name) {
      pendingStart = true;
      ui.nameInput.value = '';
      ui.nameDialog.showModal();
      setTimeout(() => ui.nameInput.focus(), 60);
    } else {
      startGame();
    }
  });

  ui.nameForm?.addEventListener('submit', e => {
    e.preventDefault();
    const value = ui.nameInput.value.trim();
    if (!value) {
      ui.nameInput.focus();
      return;
    }
    setName(value);
    ui.nameDialog.close();
    document.activeElement?.blur?.();
    if (state === 'intro' && pendingStart) {
      pendingStart = false;
      startGame();
    } else {
      refreshSaveUI();
      hud.setToast(`Ora giochi come ${value}`);
      requestPointerLock();
    }
  });

  ui.whoChange?.addEventListener('click', () => {
    pendingStart = false;
    const save = getSave();
    ui.nameInput.value = save.name || '';
    ui.nameDialog.showModal();
    setTimeout(() => ui.nameInput.focus(), 60);
  });

  document.getElementById('btn-audio')?.addEventListener('click', toggleAudio);
  document.getElementById('mapbox')?.addEventListener('click', () => openMap());

  ui.resume?.addEventListener('click', () => {
    ui.pauseDialog.close();
    requestPointerLock();
  });
  ui.pauseHome?.addEventListener('click', returnToIntro);
  ui.pauseFly?.addEventListener('click', () => {
    ui.pauseDialog.close();
    toggleFly();
    requestPointerLock();
  });
  ui.pauseMap?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openMap();
  });
  ui.pauseMissions?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openMissions();
  });
  ui.pauseCareer?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openCareer();
  });
  ui.careerTabs?.addEventListener('click', event => {
    const btn = event.target.closest('[data-career-tab]');
    if (!btn) return;
    careerTab = btn.dataset.careerTab;
    renderCareerDialog();
  });
  ui.careerJobs?.addEventListener('click', event => {
    const btn = event.target.closest('[data-career-action]');
    if (!btn) return;
    const action = btn.dataset.careerAction;
    if (action === 'accept') startCareerOffer(Number(btn.dataset.index));
    else if (action === 'cancel') cancelCareerJob();
  });
  ui.careerLicense?.addEventListener('click', event => {
    if (event.target.closest('[data-career-action="license"]')) startLicenseExam();
  });
  ui.careerGarage?.addEventListener('click', event => {
    const btn = event.target.closest('[data-upgrade]');
    if (!btn) return;
    buyUpgrade(btn.dataset.upgrade);
  });
  ui.pauseBoard?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openBoard();
  });
  ui.pauseDiary?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openDiary();
  });
  ui.diaryTabs?.addEventListener('click', event => {
    const btn = event.target.closest('[data-diary-tab]');
    if (!btn) return;
    diaryTab = btn.dataset.diaryTab;
    renderDiary();
  });
  ui.diaryContent?.addEventListener('click', event => {
    if (!event.target.closest('[data-diary-action="radio-jingle"]')) return;
    audio.init();
    audio.resume();
    audio.stationChime();
    hud.setToast('Radio Francigena · jingle di Fidenza', 2200);
  });
  ui.pauseAchievements?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openAchievements();
  });
  ui.pauseExport?.addEventListener('click', exportSave);
  ui.pauseImport?.addEventListener('click', () => ui.saveImport?.click());
  ui.saveImport?.addEventListener('change', importSave);
  ui.pwaUpdate?.addEventListener('click', () => {
    navigator.serviceWorker?.getRegistration().then(reg => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => location.reload(), 250);
      } else {
        location.reload();
      }
    }).catch(() => location.reload());
  });
  ui.pauseAudio?.addEventListener('click', () => {
    toggleAudio();
    ui.pauseAudio.textContent = audio.muted ? 'Audio off' : 'Audio on';
  });
  ui.pausePhoto?.addEventListener('click', () => {
    ui.pauseDialog.close();
    enterPhoto();
  });
  ui.touchQuick?.addEventListener('click', event => {
    const btn = event.target.closest('[data-touch-action]');
    if (!btn) return;
    handleTouchAction(btn.dataset.touchAction);
  });
  ui.photoExit?.addEventListener('click', exitPhoto);
  ui.photoCapture?.addEventListener('click', capturePhoto);
  ui.photoGalleryOpen?.addEventListener('click', openPhotoGallery);
  ui.photoFilter?.addEventListener('change', e => photoMode?.setFilter(e.target.value));
  ui.photoFrame?.addEventListener('change', e => photoMode?.setFrame(e.target.value));
  ui.photoHour?.addEventListener('input', e => {
    const hour = Number(e.target.value);
    if (Number.isFinite(hour)) world?.setHour(hour);
    updatePhotoPlace();
  });
  ui.photoSeason?.addEventListener('change', e => {
    photoSeason = e.target.value;
    const style = seasonStyles[photoSeason] || null;
    world?.setSeason(style, photoSeason);
    updatePhotoPlace();
  });
  ui.photoGridToggle?.addEventListener('change', e => {
    photoMode?.setGrid(e.target.checked);
    if (ui.photoGrid) ui.photoGrid.hidden = !e.target.checked;
  });
  ui.photoPlayerToggle?.addEventListener('change', e => photoMode?.setPlayerVisible(e.target.checked));
  ui.photoVehiclesToggle?.addEventListener('change', e => photoMode?.setVehiclesVisible(e.target.checked));
  ui.photoGalleryGrid?.addEventListener('click', onPhotoGalleryClick);
  for (const id of ['season-select', 'season-select-intro']) {
    document.getElementById(id)?.addEventListener('change', e => applySeason(e.target.value));
  }
  ui.pauseReset?.addEventListener('click', () => {
    ui.pauseDialog.close();
    ui.confirmDialog.showModal();
  });
  ui.boardOpen?.addEventListener('click', openBoard);
  ui.reset?.addEventListener('click', () => ui.confirmDialog.showModal());
  ui.confirmNo?.addEventListener('click', () => ui.confirmDialog.close());
  ui.confirmYes?.addEventListener('click', async () => {
    resetSave();
    try { await clearPhotos(); } catch { /* galleria non disponibile */ }
    location.reload();
  });
  ui.infoClose?.addEventListener('click', () => {
    ui.infoDialog.close();
    requestPointerLock();
  });
  ui.infoDialog?.addEventListener('close', () => {
    selectedPlace = null;
    document.activeElement?.blur?.();
    requestPointerLock();
  });
  ui.npcClose?.addEventListener('click', () => ui.npcDialog?.close());
  ui.npcNext?.addEventListener('click', () => {
    if (!activeNpc?.lines?.length) return;
    activeNpcLine = (activeNpcLine + 1) % activeNpc.lines.length;
    hud.showNpc(activeNpc, activeNpcLine, npcFirstMeet);
  });
  ui.npcDialog?.addEventListener('close', () => {
    if (activeNpc && npcFirstMeet) {
      hud.setToast(`Hai conosciuto ${activeNpc.name} · +${SCORE.npc} punti`, 3200);
      checkAchievements(true);
      refreshSaveUI();
    }
    activeNpc = null;
    activeNpcLine = 0;
    npcFirstMeet = false;
    document.activeElement?.blur?.();
    requestPointerLock();
  });
  ui.diaryDialog?.addEventListener('close', () => {
    document.activeElement?.blur?.();
    requestPointerLock();
  });
  ui.missionDialog?.addEventListener('close', () => { document.activeElement?.blur?.(); requestPointerLock(); });
  ui.pauseDialog?.addEventListener('close', () => { document.activeElement?.blur?.(); requestPointerLock(); });
  ui.boardDialog?.addEventListener('close', () => { document.activeElement?.blur?.(); requestPointerLock(); });
  ui.photoGallery?.addEventListener('close', () => {
    document.activeElement?.blur?.();
    if (!photoMode?.active) requestPointerLock();
  });
  ui.achievementsDialog?.addEventListener('close', () => {
    document.activeElement?.blur?.();
    requestPointerLock();
  });
  ui.careerDialog?.addEventListener('close', () => {
    document.activeElement?.blur?.();
    requestPointerLock();
  });
  document.getElementById('bigmap-close')?.addEventListener('click', () => requestPointerLock());

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (map?.isOpen) { e.preventDefault(); map.close(); requestPointerLock(); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.exitPointerLock();
    else clock.getDelta();
  });
  bindPhotoStick();
  updateRotateHint();
  window.addEventListener('orientationchange', () => setTimeout(updateRotateHint, 200));
  window.addEventListener('resize', updateRotateHint);
}

function bindPhotoStick() {
  const stick = ui.photoStick;
  const knob = ui.photoKnob;
  if (!stick || !knob) return;
  let active = null;
  let cx = 0, cy = 0, maxR = 44;
  const reset = () => {
    active = null;
    knob.style.transform = 'translate(0px, 0px)';
    if (photoMode) photoMode.touchMove = { x: 0, y: 0 };
  };
  const update = e => {
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    const k = len > maxR ? maxR / len : 1;
    const kx = dx * k, ky = dy * k;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
    if (photoMode) photoMode.touchMove = { x: kx / maxR, y: ky / maxR };
  };
  stick.addEventListener('pointerdown', e => {
    active = e.pointerId;
    stick.setPointerCapture?.(e.pointerId);
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    maxR = r.width * 0.38;
    update(e);
    e.preventDefault();
  }, { passive: false });
  stick.addEventListener('pointermove', e => {
    if (e.pointerId !== active) return;
    update(e);
    e.preventDefault();
  }, { passive: false });
  stick.addEventListener('pointerup', e => { if (e.pointerId === active) reset(); });
  stick.addEventListener('pointercancel', e => { if (e.pointerId === active) reset(); });
  stick.addEventListener('pointerleave', e => { if (e.pointerId === active) reset(); });
}

function updateRotateHint() {
  if (!ui.rotateHint) return;
  ui.rotateHint.hidden = true;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applyRendererScale(currentPixelRatio);
}

function returnToIntro() {
  if (state !== 'playing') return;
  if (missions?.activeId && !window.confirm('Tornare alla schermata iniziale? La missione o il lavoro attivo verrà annullato.')) return;
  flushStats();
  statsFlushTimer = 0;
  state = 'intro';
  started = false;
  pendingStart = false;
  input.exitPointerLock();
  input.reset();
  input.allowPointerLock = true;
  map?.close?.();
  if (vehicles?.current) vehicles.exit();
  if (missions?.activeId) missions.abort(true);
  if (career) career.activeOffer = null;
  if (photoMode?.active) exitPhoto();
  if (player) {
    player.setFlyMode(false);
    player.controlEnabled = true;
    player.mesh.visible = true;
  }
  if (ui.pauseDialog?.open) ui.pauseDialog.close();
  if (ui.careerDialog?.open) ui.careerDialog.close();
  if (ui.achievementsDialog?.open) ui.achievementsDialog.close();
  if (ui.missionDialog?.open) ui.missionDialog.close();
  if (ui.boardDialog?.open) ui.boardDialog.close();
  if (ui.infoDialog?.open) ui.infoDialog.close();
  activeNpc = null;
  activeNpcLine = 0;
  npcFirstMeet = false;
  if (ui.npcDialog?.open) ui.npcDialog.close();
  if (ui.diaryDialog?.open) ui.diaryDialog.close();
  if (ui.photoGallery?.open) ui.photoGallery.close();
  hud.hideHUD();
  hud.showIntro();
  hud.setPlayReady(true, 'Gioca');
  audio.stopEngine?.();
  audio.setZone('city');
  lastPlayerTrack = null;
  lastZone = '';
  lastZoneKind = '';
  lastDistrictId = '';
  currentInteraction = null;
  lastPromptKey = '';
  selectedPlace = null;
  canvas.style.cursor = '';
  clearPhotoStatus();
  refreshSaveUI();
}

function startGame() {
  if (started) return;
  started = true;
  state = 'playing';
  document.activeElement?.blur?.();
  hud.hideIntro();
  hud.showHUD();
  hud.setPlayReady(true, 'Gioca');
  updateRotateHint();
  updateTouchUI();
  const save = getSave();
  hud.setToast(`Benvenuto a Fidenza${save.name ? `, ${save.name}` : ''}`, 2600);
  hud.setBig('FIDENZA', 1500);
  audio.init();
  audio.setMuted(audio.muted);
  audio.resume();
  audio.click();
  const sp = deepSpawn || mapData?.spawn || WORLD.spawn;
  player.spawn(sp.x, sp.z, sp.yaw);
  player.updateCamera(0, true);
  lastPlayerTrack = { x: player.position.x, z: player.position.z };
  markDay();
  checkAchievements(false);
  requestPointerLock();
  refreshSaveUI();
  if (!groundPrefetchStarted) {
    groundPrefetchStarted = true;
    setTimeout(prefetchGroundTiles, 3000);
  }
}

let groundPrefetchStarted = false;
const OFFLINE_TILES_KEY = 'fidenza-offline-tiles-v1';

async function prefetchGroundTiles() {
  const tilesMeta = world?.groundMeta?.tiles;
  if (!tilesMeta?.manifest || quality === 'low') return;
  if (shouldSkipPrefetch()) {
    hud.setToast('Mappa offline non scaricata: risparmio dati attivo', 4200);
    return;
  }
  if (!(await hasTileCache())) return;
  const estimate = await storageEstimate();
  const required = Math.max(96 * 1024 * 1024, (Number(tilesMeta.totalBytes) || 0) + 48 * 1024 * 1024);
  if (estimate && estimate.available > 0 && estimate.available < required) {
    hud.setToast('Spazio insufficiente per la mappa offline', 4200);
    return;
  }
  await ensurePersistentStorage();
  let manifest;
  try {
    manifest = await fetchJSON(`./data/ground/${tilesMeta.manifest}`);
  } catch (err) {
    console.warn('Manifest tessere non disponibile', err);
    return;
  }
  const doneBefore = localStorage.getItem(OFFLINE_TILES_KEY) === 'done';
  if (!doneBefore) hud.setToast('Preparo la mappa offline…', 3000);
  try {
    const result = await prefetchTiles(manifest, {
      baseUrl: './data/ground/tiles/',
      concurrency: isMobile ? 2 : 3,
      onProgress: progress => {
        if (world?.groundTiles) world.groundTiles.prefetchProgress = progress;
      }
    });
    if (result.skipped) return;
    if (!doneBefore || result.downloaded > 0) {
      localStorage.setItem(OFFLINE_TILES_KEY, 'done');
      hud.setToast('Mappa offline pronta', 3200);
    }
  } catch (err) {
    console.warn('Prefetch mappa offline interrotto', err);
  }
}

function requestPointerLock() {
  if (state === 'playing' && !isMobile && !photoMode?.active && !document.querySelector('dialog[open]') && !map?.isOpen) {
    try {
      const p = canvas.requestPointerLock?.();
      if (p?.catch) p.catch(() => {});
    } catch { /* ignore */ }
  }
}

function nearestPhotoPlace() {
  if (!photoMode?.position || !world) return 'Fidenza';
  let best = Infinity;
  let name = 'Fidenza';
  for (const p of world.places || []) {
    const d = Math.hypot(p.x - photoMode.position.x, p.z - photoMode.position.z);
    if (d < best) { best = d; name = p.short || p.name || 'Fidenza'; }
  }
  return best <= 180 ? name : 'Fidenza';
}

function updatePhotoPlace() {
  if (!ui.photoPlace || !photoMode?.active) return;
  ui.photoPlace.textContent = nearestPhotoPlace();
}

function setPhotoStatus(text, duration = 2400) {
  if (!ui.photoStatus) return;
  ui.photoStatus.textContent = text;
  ui.photoStatus.classList.add('show');
  clearTimeout(photoStatusTimer);
  photoStatusTimer = setTimeout(() => ui.photoStatus?.classList.remove('show'), duration);
}

function clearPhotoStatus() {
  clearTimeout(photoStatusTimer);
  ui.photoStatus?.classList.remove('show');
  if (ui.photoStatus) ui.photoStatus.textContent = '';
}

function flashPhoto() {
  let el = document.getElementById('photo-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'photo-flash';
    document.body.appendChild(el);
  }
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 110);
}

function enterPhoto() {
  if (!photoMode || photoMode.active || state !== 'playing') return;
  if (document.querySelector('dialog[open]')) return;
  audio.click();
  flushStats();
  photoSavedHour = world?.hour ?? null;
  photoSavedSeason = { id: currentSeason, style: world?.seasonStyle || null };
  photoSeason = currentSeason;
  input.exitPointerLock();
  input.allowPointerLock = false;
  canvas.style.cursor = 'grab';
  hud.hideHUD();
  photoMode.enter();
  photoMode.touchMove = { x: 0, y: 0 };
  photoMode.setFilter(ui.photoFilter?.value || 'natural');
  photoMode.setFrame(ui.photoFrame?.value || 'none');
  photoMode.setGrid(!!ui.photoGridToggle?.checked);
  photoMode.setPlayerVisible(ui.photoPlayerToggle ? ui.photoPlayerToggle.checked : true);
  photoMode.setVehiclesVisible(ui.photoVehiclesToggle ? ui.photoVehiclesToggle.checked : true);
  if (ui.photoMode) ui.photoMode.hidden = false;
  if (ui.photoGrid) ui.photoGrid.hidden = !photoMode.showGrid;
  if (ui.photoHour) ui.photoHour.value = String(world?.hour ?? 12);
  if (ui.photoSeason) ui.photoSeason.value = photoSeason;
  updatePhotoPlace();
  setPhotoStatus(input.isTouch()
    ? 'Trascina per guardare · Scatta per salvare la cartolina'
    : 'WASD per muoverti · trascina per guardare · P per uscire', 3600);
}

function exitPhoto() {
  if (!photoMode?.active) return;
  if (ui.photoGallery?.open) ui.photoGallery.close();
  photoMode.exit();
  if (ui.photoMode) ui.photoMode.hidden = true;
  if (ui.photoGrid) ui.photoGrid.hidden = true;
  if (Number.isFinite(photoSavedHour) && world) world.setHour(photoSavedHour);
  if (photoSavedSeason && world) world.setSeason(photoSavedSeason.style, photoSavedSeason.id);
  photoSavedHour = null;
  photoSavedSeason = null;
  if (photoMode) photoMode.touchMove = { x: 0, y: 0 };
  if (ui.photoKnob) ui.photoKnob.style.transform = 'translate(0px, 0px)';
  clearPhotoStatus();
  input.allowPointerLock = true;
  canvas.style.cursor = '';
  if (player) lastPlayerTrack = { x: player.position.x, z: player.position.z };
  if (started) hud.showHUD();
  updateTouchUI();
  hud.setToast('Modalità foto chiusa', 1400);
  requestPointerLock();
}

async function capturePhoto() {
  if (!photoMode?.active) return;
  if (ui.photoCapture) ui.photoCapture.disabled = true;
  try {
    const photo = await photoMode.capture();
    if (photo) haptic(12);
    if (!photo) setPhotoStatus('Impossibile salvare la foto');
  } catch (err) {
    console.error('Scatto non riuscito', err);
    setPhotoStatus('Scatto non riuscito');
  } finally {
    if (ui.photoCapture) ui.photoCapture.disabled = false;
  }
}

async function openPhotoGallery() {
  if (!ui.photoGallery) return;
  input.exitPointerLock();
  if (!ui.photoGallery.open) ui.photoGallery.showModal();
  await renderPhotoGallery();
}

function formatPhotoDate(timestamp) {
  try {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp || Date.now()));
  } catch {
    return '';
  }
}

async function renderPhotoGallery() {
  if (!ui.photoGalleryGrid) return;
  ui.photoGalleryGrid.innerHTML = '<p class="dialog-note">Carico la galleria…</p>';
  if (ui.photoGalleryEmpty) ui.photoGalleryEmpty.hidden = true;
  try {
    photoCache = await listPhotos();
  } catch (err) {
    console.warn('Galleria non disponibile', err);
    photoCache = [];
    ui.photoGalleryGrid.innerHTML = '<p class="dialog-note">La galleria locale non è disponibile in questo browser.</p>';
    return;
  }
  if (!photoCache.length) {
    ui.photoGalleryGrid.innerHTML = '';
    if (ui.photoGalleryEmpty) ui.photoGalleryEmpty.hidden = false;
    return;
  }
  if (ui.photoGalleryEmpty) ui.photoGalleryEmpty.hidden = true;
  const groups = new Map();
  for (const photo of photoCache) {
    const place = photo.place || 'Fidenza';
    if (!groups.has(place)) groups.set(place, []);
    groups.get(place).push(photo);
  }
  ui.photoGalleryGrid.innerHTML = [...groups.entries()].map(([place, photos]) => {
    const cards = photos.map(photo => {
      const filter = PHOTO_FILTERS[photo.filter]?.label || 'Naturale';
      const frame = photo.frame === 'cartolina' ? 'Cartolina' : photo.frame === 'fidenza' ? 'Cornice Fidenza' : '';
      const meta = [formatPhotoDate(photo.createdAt), seasonLabel(photo.season), filter, frame].filter(Boolean).join(' · ');
      return `
        <article class="photo-card">
          <img src="${photo.thumb || photo.dataUrl}" alt="Cartolina di ${escapeHtml(photo.place || 'Fidenza')}" loading="lazy">
          <div class="photo-meta">
            <b>${escapeHtml(photo.place || 'Fidenza')}</b>
            <span>${escapeHtml(meta)}</span>
          </div>
          <div class="photo-card-actions">
            <button type="button" data-photo-action="download" data-id="${escapeHtml(photo.id)}">Scarica</button>
            <button type="button" class="danger" data-photo-action="delete" data-id="${escapeHtml(photo.id)}">Elimina</button>
          </div>
        </article>`;
    }).join('');
    return `<h3 class="photo-group-title">${escapeHtml(place)} <span>${photos.length}</span></h3>${cards}`;
  }).join('');
}

async function onPhotoGalleryClick(event) {
  const button = event.target.closest('button[data-photo-action]');
  if (!button) return;
  const id = button.dataset.id;
  const photo = photoCache.find(p => p.id === id);
  if (!photo) return;
  const action = button.dataset.photoAction;
  if (action === 'download') {
    downloadPhoto(photo);
    return;
  }
  if (action === 'delete') {
    button.disabled = true;
    try {
      await deletePhoto(id);
      photoCache = photoCache.filter(p => p.id !== id);
      await renderPhotoGallery();
    } catch (err) {
      console.warn('Foto non eliminata', err);
      button.disabled = false;
    }
  }
}

function handleTouchAction(action) {
  if (!action) return;
  if (action === 'pause') openPause();
  else if (action === 'map') openMap();
  else if (action === 'missions') openMissions();
  else if (action === 'career') openCareer();
  else if (action === 'photo') enterPhoto();
  else if (action === 'fly') toggleFly();
  else if (action === 'bike') toggleBike();
  else if (action === 'audio') toggleAudio();
  updateTouchUI();
}

function updateTouchUI() {
  if (!isMobile) return;
  const inVehicle = !!vehicles?.current;
  const flying = !!player?.flyMode;
  if (ui.touchDrive) {
    ui.touchDrive.classList.toggle('vehicle', inVehicle);
    ui.touchDrive.hidden = flying;
  }
  if (ui.touchFly) ui.touchFly.hidden = !flying;
  if (ui.btnBrake) ui.btnBrake.hidden = !inVehicle;
  if (ui.btnHorn) ui.btnHorn.hidden = !inVehicle;
  if (ui.btnRun) ui.btnRun.hidden = inVehicle;
  const flyBtn = ui.touchQuick?.querySelector('[data-touch-action="fly"]');
  flyBtn?.classList.toggle('active', flying);
  const bikeBtn = ui.touchQuick?.querySelector('[data-touch-action="bike"]');
  bikeBtn?.classList.toggle('active', vehicles?.current?.type === 'bike');
  const audioBtn = ui.touchQuick?.querySelector('[data-touch-action="audio"]');
  audioBtn?.classList.toggle('active', audio.muted);
}

function toggleBike() {
  if (!player || !vehicles || photoMode?.active) return;
  if (player.flyMode) {
    hud.setToast('Atterra prima di prendere la bici', 2600);
    return;
  }
  if (vehicles.current) {
    if (vehicles.current.type === 'bike') {
      vehicles.exit();
      haptic(15);
      hud.setToast('Sei sceso dalla bici');
      updateTouchUI();
      return;
    }
    hud.setToast('Scendi prima dal veicolo per prendere la bici', 2600);
    return;
  }
  const near = vehicles.nearestBike(player.position.x, player.position.z, 8);
  if (near) {
    vehicles.enter(near.vehicle);
    haptic(18);
    hud.setBig('BICI', 900);
    hud.setToast('Sei in sella · joystick per pedalare · 📯 campanello · 🚲 scendi', 3400);
    updateTouchUI();
    return;
  }
  const anyBike = vehicles.nearestBike(player.position.x, player.position.z, Infinity);
  if (anyBike) {
    hud.setToast(`Nessuna bici entro 8 m · la più vicina è a ${formatDistance(anyBike.dist)}`, 3000);
  } else {
    hud.setToast('Nessuna bici disponibile in città', 2600);
  }
}

function toggleFly() {
  if (!player || photoMode?.active) return;
  if (vehicles?.current) {
    hud.setToast('Scendi dal veicolo per attivare il volo', 2600);
    return;
  }
  player.setFlyMode(!player.flyMode);
  haptic(18);
  if (player.flyMode) {
    hud.setBig('VOLO', 1000);
    hud.setToast(
      isMobile
        ? 'Volo attivo · joystick per muoverti · ▲/▼ quota · ✈ atterra'
        : 'Volo attivo · WASD muoviti · Space/Q quota · Shift boost · V atterra',
      4200
    );
  } else {
    hud.setBig('A TERRA', 800);
    hud.setToast('Atterraggio completato', 2000);
  }
  updateTouchUI();
}

function openDiary(tab = diaryTab) {
  if (!world) return;
  input.exitPointerLock();
  diaryTab = tab;
  renderDiary();
  hud.openDialog('diary-dialog');
}

function renderDiary() {
  if (!world || !ui.diaryContent) return;
  const save = getSave();
  const stats = getStats();
  const district = world.getDistrictAt(player.position.x, player.position.z);
  const diary = buildDiary({
    save,
    stats,
    districts: world.districts,
    seenDistricts: stats.districtsSeen || [],
    totalStars: world.starObjects.length,
    totalPlaces: world.placeObjects.length,
    date: new Date(),
    event: eventSnapshot?.active || eventSnapshot?.next || null,
    daily: getDailySnapshot(),
    weather,
    district,
    venues: world.getVenueStatuses()
  });
  for (const btn of ui.diaryTabs?.querySelectorAll('[data-diary-tab]') || []) {
    btn.classList.toggle('active', btn.dataset.diaryTab === diaryTab);
  }
  if (diaryTab === 'passaporto') {
    const p = diary.passport;
    ui.diaryContent.innerHTML = `
      <p class="passport-summary">${p.visited}/${p.total} timbri · ${p.complete ? 'Passaporto completo: sei un pellegrino di Fidenza.' : 'Ogni quartiere visitato lascia un timbro.'}</p>
      <div class="passport-grid">
        ${p.stamps.map(s => `
          <div class="passport-stamp ${s.visited ? 'visited' : ''}" style="border-color:${s.color}">
            <div class="stamp-top"><span>Timbro ${String(s.number).padStart(2, '0')}</span><span>${s.visited ? 'visitato' : 'da scoprire'}</span></div>
            <b>${escapeHtml(s.name)}</b>
            <p>${escapeHtml(s.description)}</p>
            <div class="stamp-mark">${s.visited ? '✓ timbrato' : '○ in attesa'}</div>
          </div>`).join('')}
      </div>`;
    return;
  }
  if (diaryTab === 'radio') {
    const r = diary.radio;
    ui.diaryContent.innerHTML = `
      <div class="radio-panel">
        <div class="radio-now">${escapeHtml(r.station)} · ${escapeHtml(r.frequency)} · ${escapeHtml(r.now)}</div>
        <h3>In onda</h3>
        <p>${escapeHtml(r.story)}</p>
        <ul>${r.bulletin.map(h => `<li><b>${escapeHtml(h.title)}</b> — ${escapeHtml(h.body)}</li>`).join('')}</ul>
        <p style="margin-top:14px"><button type="button" class="primary" data-diary-action="radio-jingle">Accendi la radio</button></p>
        <p style="margin:10px 0 0;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6b6253">${escapeHtml(r.signOff)}</p>
      </div>`;
    return;
  }
  if (diaryTab === 'taccuino') {
    const n = diary.notebook;
    ui.diaryContent.innerHTML = `
      <div class="notebook-grid">
        ${n.metrics.map(m => `<div class="notebook-stat"><span>${escapeHtml(m.label)}</span><b>${escapeHtml(m.value)}</b></div>`).join('')}
      </div>
      <div class="notebook-people">
        ${n.people.length ? n.people.map(p => `<div class="notebook-person"><b>${escapeHtml(p.name)}</b><span>${escapeHtml(p.role)} · ${escapeHtml(p.area)}</span></div>`).join('') : '<p class="dialog-note">Non hai ancora incontrato nessun abitante. Cerca l’icona 💬 in città.</p>'}
      </div>
      <p class="notebook-sign">${escapeHtml(n.signature)}</p>`;
    return;
  }
  const g = diary.gazette;
  const lead = g.headlines[0];
  const others = g.headlines.slice(1);
  ui.diaryContent.innerHTML = `
    <div class="gazette">
      <div class="gazette-head">
        <h3>La Gazzetta di Fidenza</h3>
        <span>Edizione n. ${g.issue}<br>${escapeHtml(g.dateLabel)}</span>
      </div>
      <div class="gazette-grid">
        <div>
          <article>
            <div class="kicker">Prima pagina</div>
            <h4>${escapeHtml(lead.title)}</h4>
            <p>${escapeHtml(lead.body)}</p>
          </article>
          ${others.map(h => `<article><div class="kicker">Cronaca di città</div><h4>${escapeHtml(h.title)}</h4><p>${escapeHtml(h.body)}</p></article>`).join('')}
        </div>
        <div class="gazette-classifieds">
          <h4>Annunci economici</h4>
          <ul>${g.classifieds.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
          <p class="dialog-note" style="margin-top:14px">${escapeHtml(g.photoLine)} · ${escapeHtml(g.careerLine)}</p>
        </div>
      </div>
      <div class="gazette-foot"><span>Fidenza, Emilia-Romagna</span><span>Edizione locale · solo nel tuo browser</span></div>
    </div>`;
}

function openPause() {
  if (state !== 'playing') return;
  if (ui.pauseDialog.open) return;
  input.exitPointerLock();
  ui.pauseAudio.textContent = audio.muted ? 'Audio off' : 'Audio on';
  if (ui.pauseFly) ui.pauseFly.textContent = player?.flyMode ? 'Atterra' : 'Volo';
  refreshDailyUI();
  ui.pauseDialog.showModal();
}

function openMissions() {
  input.exitPointerLock();
  hud.renderMissionList(missions.list(), missions.activeId, id => {
    const ok = missions.start(id);
    if (ok) {
      hud.closeDialog('mission-dialog');
      refreshSaveUI();
      requestPointerLock();
    }
  });
  hud.openDialog('mission-dialog');
}

function openBoard() {
  input.exitPointerLock();
  hud.renderBoard(getSave(), missions.list());
  hud.openDialog('board-dialog');
}

function openMap() {
  if (!map) return;
  input.exitPointerLock();
  map.open();
}

function exportSave() {
  const data = JSON.stringify(getSave(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fidenza-salvataggio-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  hud.setToast('Salvataggio esportato', 2200);
  audio.click();
}

async function importSave(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('formato non valido');
    if (!window.confirm('Importare questo salvataggio? I progressi attuali verranno sostituiti.')) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    location.reload();
  } catch (err) {
    hud.setToast(`Import non riuscito: ${err.message}`, 3600);
  } finally {
    if (event.target) event.target.value = '';
  }
}

function toggleAudio() {
  const muted = audio.toggleMute();
  hud.setAudioMuted(muted);
  ui.pauseAudio.textContent = muted ? 'Audio off' : 'Audio on';
  if (!muted) { audio.init(); audio.resume(); audio.click(); }
  const save = getSave();
  save.settings.audio = !muted;
  try { localStorage.setItem('fidenza-da-giocare-v1', JSON.stringify(save)); } catch { /* ignore */ }
  updateTouchUI();
}

function collectStar(starObj) {
  if (!starObj || starObj.collected) return;
  const id = starObj.id;
  if (addStar(id)) {
    addScore(SCORE.star);
    world.setStarCollected(id);
    audio.star();
    haptic(22);
    hud.setToast(`Stella trovata · +${SCORE.star}`, 2000);
    hud.setBig('★', 600);
    refreshSaveUI();
    recordDailyProgress('star', 1);
    recordDailyProgress('score', SCORE.star);
    checkAchievements(true);
  }
}

function collectPlace(placeObj) {
  if (!placeObj || placeObj.visited) return;
  const l = placeObj.data;
  if (addPlace(l.id)) {
    addScore(SCORE.place);
    world.setPlaceVisited(l.id);
    audio.place();
    haptic(30);
    hud.setBig('LUOGO SCOPERTO', 1400);
    const save = getSave();
    hud.showInfo(l, save.places.length, world.placeObjects.length);
    refreshSaveUI();
    recordDailyProgress('place', 1);
    recordDailyProgress('score', SCORE.place);
    checkAchievements(true);
    selectedPlace = null;
  }
}

function getNearestLandmark(x, z, radius = 80, cameraYaw = null) {
  let best = null;
  for (const l of world.places) {
    const d = Math.hypot(l.x - x, l.z - z);
    if (d >= radius) continue;
    let score = d;
    if (cameraYaw != null) {
      const angle = Math.abs(normalizeAngle(Math.atan2(l.x - x, l.z - z) - cameraYaw));
      score = d + angle * 70;
    }
    if (!best || score < best.score) best = { l, dist: d, score };
  }
  return best;
}

function updateInteraction() {
  if (!player || !missions || !vehicles) return;
  if (player.flyMode) {
    currentInteraction = { type: 'land' };
    setPromptSafe({ text: input.isTouch() ? 'Tocca ▼ per atterrare' : '<kbd>V</kbd> atterra', action: 'land' });
    return;
  }
  if (vehicles.current) {
    currentInteraction = { type: 'exit' };
    setPromptSafe({ text: '<kbd>E</kbd> scendi dal veicolo', action: 'exit' });
    return;
  }
  const missionPrompt = missions.getPrompt(player);
  if (missionPrompt) {
    currentInteraction = { type: missionPrompt.action, step: missionPrompt.step };
    setPromptSafe(missionPrompt);
    return;
  }
  const nearNpc = world.getNearbyNpc(player.position.x, player.position.z, 4.0);
  if (nearNpc) {
    currentInteraction = { type: 'npc', npc: nearNpc.npc };
    setPromptSafe({
      text: `<kbd>E</kbd> parla con ${escapeHtml(nearNpc.npc.name)}`,
      action: 'npc',
      icon: '💬'
    });
    return;
  }
  const nearPlace = world.getNearbyPlace(player.position.x, player.position.z, 30);
  if (nearPlace) {
    currentInteraction = { type: 'place', place: nearPlace.place };
    setPromptSafe({ text: `<kbd>E</kbd> scopri ${nearPlace.place.data.short || nearPlace.place.data.name}`, action: 'place' });
    return;
  }
  const nearVehicle = vehicles.nearest(player.position.x, player.position.z, 4.2);
  if (nearVehicle) {
    currentInteraction = { type: 'vehicle', vehicle: nearVehicle.vehicle };
    setPromptSafe({
      text: `<kbd>E</kbd> guida ${nearVehicle.vehicle.label}`,
      action: 'vehicle',
      icon: nearVehicle.vehicle.type === 'bike' ? '🚲' : '🚗'
    });
    return;
  }
  currentInteraction = null;
  setPromptSafe(null);
}

function setPromptSafe(prompt) {
  const key = prompt ? (prompt.text + ':' + prompt.action) : '';
  if (key === lastPromptKey) return;
  lastPromptKey = key;
  hud.setPrompt(prompt);
}

function handleInteract() {
  if (!currentInteraction) return;
  if (currentInteraction.type === 'land') {
    toggleFly();
    return;
  }
  if (currentInteraction.type === 'exit') {
    vehicles.exit();
    haptic(15);
    hud.setToast('Sei sceso dal veicolo');
    updateTouchUI();
    return;
  }
  if (currentInteraction.type === 'missions') {
    openMissions();
    return;
  }
  if (currentInteraction.type === 'mission-step') {
    missions.interact(player);
    return;
  }
  if (currentInteraction.type === 'npc') {
    openNpcDialog(currentInteraction.npc);
    return;
  }
  if (currentInteraction.type === 'place') {
    collectPlace(currentInteraction.place);
    return;
  }
  if (currentInteraction.type === 'vehicle') {
    vehicles.enter(currentInteraction.vehicle);
    haptic(15);
    hud.setToast(`Sei su: ${currentInteraction.vehicle.label}`);
    updateTouchUI();
    return;
  }
}

function openNpcDialog(npc) {
  if (!npc) return;
  activeNpc = npc;
  activeNpcLine = 0;
  input.exitPointerLock();
  npcFirstMeet = addUniqueStat('npcsMet', npc.id);
  npc.met = true;
  if (npc.bubble) npc.bubble.visible = false;
  if (npcFirstMeet) addScore(SCORE.npc);
  hud.showNpc(npc, 0, npcFirstMeet);
  audio.click?.();
}

function updateHUD(dt) {
  if (!player || !world || !missions) return;
  const save = getSave();
  hud.setScore(save.score);
  hud.setProgress(save.stars.length, world.starObjects.length, save.places.length, world.placeObjects.length);

  const inVehicle = !!vehicles.current;
  const mode = inVehicle
    ? (vehicles.current.type === 'vespa' ? 'Vespa' : vehicles.current.type === 'bike' ? 'Bici' : 'Auto')
    : (player.flyMode ? 'Volo' : 'A piedi');
  const nearest = getNearestLandmark(player.position.x, player.position.z, 160, player.cameraYaw);
  const district = world.getDistrictAt(player.position.x, player.position.z);
  const zoneName = district?.name || (nearest ? (nearest.l.short || nearest.l.name) : 'Fidenza');
  if (zoneName !== lastZone || hud.el.mode?.textContent !== mode) {
    lastZone = zoneName;
    hud.setMode(mode, zoneName);
  }
  if (district && district.id !== lastDistrictId) {
    lastDistrictId = district.id;
    const first = addUniqueStat('districtsSeen', district.id);
    if (first && started) {
      addScore(50);
      hud.setBig(district.name.toUpperCase(), 1400);
      hud.setToast(`Benvenuto a ${district.name} · ${district.description}`, 4200);
      checkAchievements(true);
    }
    audio.setZone(district.ambience || 'city');
  }
  if (nearest) {
    const id = nearest.l.id;
    let zoneKind = 'city';
    if (id === 'stazione') zoneKind = 'station';
    else if (id === 'stirone') zoneKind = 'stirone';
    else if (['park', 'nature'].includes(nearest.l.category)) zoneKind = 'park';
    else if (['duomo', 'piazza-duomo', 'teatro', 'comunale', 'porta', 'ponte', 'granmadre', 'musini', 'sanpietro', 'farmacia-cavour'].includes(id)) zoneKind = 'center';
    const eventPlace = eventSnapshot?.active ? world.placesById.get(eventSnapshot.active.placeId) : null;
    if (eventPlace) {
      const ex = eventPlace.beaconX ?? eventPlace.x;
      const ez = eventPlace.beaconZ ?? eventPlace.z;
      if (Math.hypot(player.position.x - ex, player.position.z - ez) < 90) zoneKind = 'festival';
    }
    if (zoneKind !== lastZoneKind) {
      const wasStarted = !!lastZoneKind;
      lastZoneKind = zoneKind;
      audio.setZone(zoneKind);
      if (wasStarted && zoneKind === 'station') audio.stationChime();
      if (wasStarted && zoneKind === 'festival') audio.festivalChime();
    }
  }
  hud.setSpeed(inVehicle ? Math.abs(vehicles.current.speed) * 3.6 : 0, inVehicle);

  const progress = missions.getProgress();
  hud.setMission(progress);

  let target = null;
  const activeTarget = missions.currentTarget;
  if (activeTarget) {
    const dx = activeTarget.x - player.position.x;
    const dz = activeTarget.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, dz);
    target = {
      name: activeTarget.name || 'Obiettivo',
      distanceLabel: formatDistance(dist),
      relativeAngle: normalizeAngle(bearing - player.cameraYaw)
    };
  } else {
    let best = null;
    for (const p of world.placeObjects) {
      if (p.visited) continue;
      const px = p.placeX ?? p.data.x;
      const pz = p.placeZ ?? p.data.z;
      const d = Math.hypot(px - player.position.x, pz - player.position.z);
      if (d > 600) continue;
      const dx = px - player.position.x;
      const dz = pz - player.position.z;
      const angle = Math.abs(normalizeAngle(Math.atan2(dx, dz) - player.cameraYaw));
      const score = d + angle * 70;
      if (!best || score < best.score) best = { d, p, score, px, pz };
    }
    if (best) {
      const dx = best.px - player.position.x;
      const dz = best.pz - player.position.z;
      target = {
        name: best.p.data.short || best.p.data.name,
        distanceLabel: formatDistance(best.d),
        relativeAngle: normalizeAngle(Math.atan2(dx, dz) - player.cameraYaw)
      };
    }
  }
  hud.setTarget(target);

  updateInteraction();

  // stelle automatiche (solo a terra)
  if (!player.flyMode) {
    const nearStar = world.getNearbyStar(player.position.x, player.position.z, 2.0);
    if (nearStar) collectStar(nearStar.star);
  }

  // evento in corso: visita e sfida del giorno
  if (eventSnapshot?.active) {
    const activeEvent = eventSnapshot.active;
    const place = world.placesById?.get(activeEvent.placeId);
    if (place) {
      const px = place.beaconX ?? place.x;
      const pz = place.beaconZ ?? place.z;
      const d = Math.hypot(player.position.x - px, player.position.z - pz);
      if (d < 90) {
        eventVisitAccum += dt;
        if (eventVisitAccum > 2 && eventSeen !== activeEvent.id) {
          eventSeen = activeEvent.id;
          addUniqueStat('eventsSeen', activeEvent.id);
          recordDailyProgress('event', 1);
          checkAchievements(true);
          hud.setToast(`Evento visitato · ${activeEvent.title}`, 3000);
        }
      } else {
        eventVisitAccum = 0;
      }
    }
  }

  updateTouchUI();

  // meteo/notte
  if (world) world.setWeather(weather);
}

function loop() {
  requestAnimationFrame(loop);
  input.pollGamepad();
  const dt = Math.min(0.1, clock.getDelta());
  if (isMobile) {
    adaptiveFrames++;
    const now = performance.now();
    const elapsed = now - adaptiveLast;
    if (elapsed >= 2000) {
      const fps = adaptiveFrames / (elapsed / 1000);
      if (fps < 42 && currentPixelRatio > 0.75) applyRendererScale(currentPixelRatio - 0.1);
      else if (fps > 56 && currentPixelRatio < pixelRatioCap) applyRendererScale(currentPixelRatio + 0.05);
      adaptiveFrames = 0;
      adaptiveLast = now;
    }
  }
  const dialogOpen = !!document.querySelector('dialog[open]');
  const photoActive = !!photoMode?.active;
  const paused = state === 'intro' || dialogOpen || map?.isOpen || photoActive;
  if (!photoActive) gameTime += dt;

  if (state === 'intro') {
    const t = performance.now() * 0.00006;
    camera.position.set(-60 + Math.cos(t) * 120, 34 + Math.sin(t * 0.7) * 5, 70 + Math.sin(t) * 120);
    camera.lookAt(-160, 8, 20);
  } else if (!paused) {
    if (vehicles.current) {
      vehicles.update(dt);
      player.update(dt);
    } else {
      player.update(dt);
    }
    missions.update(dt, player);
    if (missions.activeId) {
      // missione attiva: aggiorna il target del marker
    }
    world.update(dt, player.position, camera);
  } else if (photoActive) {
    if (missions?.currentTarget?.photoRequired) missions.update(dt, player, true);
    photoMode.update(dt);
    photoPlaceTimer -= dt;
    if (photoPlaceTimer <= 0) {
      photoPlaceTimer = 0.25;
      updatePhotoPlace();
    }
    // dt 0: cielo e luci seguono la camera libera, traffico e particelle restano fermi.
    world.update(0, camera.position, camera);
  } else {
    world.update(dt, player.position, camera);
  }

  if (state === 'playing' && !paused) {
    trackStats(dt);
    statsFlushTimer += dt;
    if (statsFlushTimer >= 1) {
      statsFlushTimer = 0;
      flushStats();
    }
  }

  if (player && world && missions) {
    if (!paused) {
      lastHudUpdate += dt;
      const hudInterval = isMobile ? 0.08 : 0.033;
      if (lastHudUpdate >= hudInterval) {
        const hudDt = lastHudUpdate;
        lastHudUpdate = 0;
        updateHUD(hudDt);
      }
    }
    if (map?.isOpen) {
      bigMapTimer += dt;
      if (bigMapTimer >= (isMobile ? 0.08 : 0.033)) {
        bigMapTimer = 0;
        map.drawBigMap(player, player.cameraYaw, missions.currentTarget);
      }
    }
    minimapTimer += dt;
    if (state !== 'intro' && !photoActive && minimapTimer >= (isMobile ? 0.1 : 0.033)) {
      minimapTimer = 0;
      map?.drawMinimap(player, player.cameraYaw, missions.currentTarget);
    }
  }

  if (state === 'playing') handleKeys(paused);
  // Post-processing solo dove c'è margine (alta qualità desktop); la modalità
  // foto usa comunque la pipeline completa tramite photoMode.renderFrame.
  if (quality === 'high' && !isMobile) {
    postfx.render(scene, camera, { dof: photoActive ? 0.34 : 0 });
  } else {
    renderer.render(scene, camera);
  }
}

function handleKeys(paused) {
  if (photoMode?.active) {
    if (input.consume('KeyP')) {
      exitPhoto();
    } else if (input.consume('Escape')) {
      const openDialog = document.querySelector('dialog[open]');
      if (openDialog) openDialog.close();
      else exitPhoto();
    }
    return;
  }
  if (input.consume('KeyM')) toggleAudio();
  if (input.consume('KeyN')) {
    if (map.isOpen) { map.close(); requestPointerLock(); }
    else if (!paused) openMap();
  }
  if (input.consume('KeyF')) {
    if (!paused) openMissions();
  }
  if (input.consume('KeyC')) {
    if (!paused) openCareer();
  }
  if (input.consume('KeyV')) {
    if (!paused) toggleFly();
  }
  if (input.consume('KeyE')) {
    if (!paused) handleInteract();
  }
  if (input.consume('Escape')) {
    if (map.isOpen) {
      map.close();
      requestPointerLock();
    } else {
      const openDialog = document.querySelector('dialog[open]');
      if (openDialog) openDialog.close();
      else if (!ui.pauseDialog.open) openPause();
    }
  }
  if (input.consume('KeyP')) {
    if (!paused) enterPhoto();
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  const showUpdate = () => {
    if (ui.pwaUpdate) ui.pwaUpdate.hidden = false;
  };
  navigator.serviceWorker.register('./sw.js').then(registration => {
    if (registration.waiting && hadController) showUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && hadController) showUpdate();
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) showUpdate();
    });
  }).catch(() => {});
}

init().catch(err => {
  console.error(err);
  const p = document.getElementById('loading-text');
  if (p) p.textContent = 'Errore nel caricamento. Apri la console per i dettagli.';
  hud.setLoading(0.2, 'Qualcosa non ha funzionato…');
});
