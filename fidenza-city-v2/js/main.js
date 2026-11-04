import * as THREE from 'three';
import { WORLD, SCORE, PLAYER, VERSION } from './config.js';
import { clamp, formatDistance, normalizeAngle, angleDiff, formatNumber } from './utils.js';
import { loadSave, getSave, setName, addScore, addStar, addPlace, resetSave, isAudioEnabled } from './save.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { World } from './world.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { MissionManager } from './missions.js';
import { GameMap } from './map.js';

const canvas = document.getElementById('game');
const clock = new THREE.Clock();
const hud = new HUD();
const audio = new AudioEngine();
const input = new Input(canvas);
const saveState = loadSave();
audio.muted = !isAudioEnabled();
hud.setAudioMuted(audio.muted);

const isMobile = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
const quality = isMobile
  ? ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 'low' : 'medium')
  : 'high';

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: quality !== 'low',
  powerPreference: 'high-performance',
  alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.5 : 1.15));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = quality === 'high';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isMobile ? 70 : 74, window.innerWidth / window.innerHeight, 0.1, 5000);

let world = null;
let mapData = null;
let seasonStyles = {};
let currentSeason = 'autumn';
let seasonSetting = 'auto';
let player = null;
let vehicles = null;
let missions = null;
let map = null;
let state = 'intro';
let started = false;
let currentInteraction = null;
let selectedPlace = null;
let weather = { temp: null, label: 'cielo', icon: '☀', rain: 0, clouds: 0.2 };
let baseHour = 15;
let lastHudUpdate = 0;
let lastZone = '';
let lastPromptKey = '';
let pausedByDialog = false;
let gameTime = 0;
let pendingStart = false;
let clockFrozen = false;

const ui = {
  play: document.getElementById('play'),
  nameDialog: document.getElementById('name-dialog'),
  nameForm: document.getElementById('name-form'),
  nameInput: document.getElementById('name-input'),
  missionDialog: document.getElementById('mission-dialog'),
  infoDialog: document.getElementById('info-dialog'),
  infoClose: document.getElementById('info-close'),
  pauseDialog: document.getElementById('pause-dialog'),
  boardDialog: document.getElementById('board-dialog'),
  confirmDialog: document.getElementById('confirm-dialog'),
  resume: document.getElementById('resume'),
  pauseMap: document.getElementById('pause-map'),
  pauseMissions: document.getElementById('pause-missions'),
  pauseBoard: document.getElementById('pause-board'),
  pauseAudio: document.getElementById('pause-audio'),
  pauseReset: document.getElementById('pause-reset'),
  boardOpen: document.getElementById('board-open'),
  reset: document.getElementById('reset'),
  whoChange: document.getElementById('who-change'),
  confirmYes: document.getElementById('confirm-yes'),
  confirmNo: document.getElementById('confirm-no'),
  mapbox: document.getElementById('mapbox'),
  rotateHint: document.getElementById('rotate-hint')
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
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
  const save = getSave();
  save.settings.season = seasonSetting;
  try { localStorage.setItem('fidenza-da-giocare-v1', JSON.stringify(save)); } catch { /* ignore */ }
  syncSeasonSelects();
  if (!silent) hud.setToast(`Stagione: ${seasonLabel(currentSeason)}${seasonSetting === 'auto' ? ' (automatica)' : ''}`, 2200);
  audio.click();
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
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const h = Number(parts.find(p => p.type === 'hour')?.value || 15);
  const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
  baseHour = h + m / 60;
  if (world) world.setHour(baseHour + gameTime / 3600 * 0.6);
}

async function init() {
  hud.setLoading(0.02, 'Carico la mappa di Fidenza…');
  await document.fonts?.ready;
  updateClock();
  const [city, terrain, mapJson] = await Promise.all([
    fetchJSON('./data/city.json'),
    fetchJSON('./data/terrain.json'),
    fetchJSON('./data/map.json')
  ]);
  mapData = mapJson;
  hud.setLoading(0.08, 'Preparo la città…');
  world = new World({ scene, renderer, city, terrain, map: mapJson, quality });
  await world.build((p, label) => {
    hud.setLoading(0.08 + p * 0.84, label);
  });

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

  player = new Player({ scene, camera, world, input });
  player.spawn(WORLD.spawn.x, WORLD.spawn.z, WORLD.spawn.yaw);
  vehicles = new VehicleManager({ scene, world, audio, player, input });
  vehicles.spawnAll();

  missions = new MissionManager({
    scene, world, audio, player,
    onComplete: (def, points, elapsed) => {
      hud.setBig('MISSIONE COMPLETA', 1800);
      hud.setToast(`${def.title} · +${formatNumber(points)} punti`, 3200);
      refreshSaveUI();
    },
    onFail: (def) => {
      hud.setBig('TEMPO SCADUTO', 1600);
      hud.setToast(`Missione fallita: ${def.title}`, 2800);
    },
    onToast: (text) => hud.setToast(text)
  });

  map = new GameMap({ world, player, missions });

  world.setWeather(weather);
  updateClock();
  world.setHour(baseHour);
  refreshIntro();
  loadWeather().then(w => {
    world.setWeather(w);
    refreshIntro();
  });  bindUI();
  hud.setLoading(1, 'Fidenza è pronta');
  hud.setPlayReady(true, 'Gioca');
  hud.hideLoading();
  window.__fidenza = { world, player, vehicles, missions, map, hud, renderer, scene, camera, input, setHour: h => world.setHour(h), applySeason, freezeClock: (f = true) => { clockFrozen = !!f; } };
  camera.position.set(-40, 20, 100);
  camera.lookAt(-120, 8, 20);
  requestAnimationFrame(loop);
  registerServiceWorker();
  setInterval(() => {
    if (clockFrozen) return;
    updateClock();
    refreshClockOnly();
    if (seasonSetting === 'auto' && resolveSeason('auto') !== currentSeason) applySeason('auto', { silent: true });
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

function bindUI() {
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
  ui.pauseMap?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openMap();
  });
  ui.pauseMissions?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openMissions();
  });
  ui.pauseBoard?.addEventListener('click', () => {
    ui.pauseDialog.close();
    openBoard();
  });
  ui.pauseAudio?.addEventListener('click', () => {
    toggleAudio();
    ui.pauseAudio.textContent = audio.muted ? 'Audio off' : 'Audio on';
  });
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
  ui.confirmYes?.addEventListener('click', () => {
    resetSave();
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
  ui.missionDialog?.addEventListener('close', () => { document.activeElement?.blur?.(); requestPointerLock(); });
  ui.pauseDialog?.addEventListener('close', () => { document.activeElement?.blur?.(); requestPointerLock(); });
  ui.boardDialog?.addEventListener('close', () => { document.activeElement?.blur?.(); requestPointerLock(); });
  document.getElementById('bigmap-close')?.addEventListener('click', () => requestPointerLock());

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (map?.isOpen) { e.preventDefault(); map.close(); requestPointerLock(); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.exitPointerLock();
  });
  updateRotateHint();
  window.addEventListener('orientationchange', () => setTimeout(updateRotateHint, 200));
  window.addEventListener('resize', updateRotateHint);
}

function updateRotateHint() {
  if (!ui.rotateHint) return;
  ui.rotateHint.hidden = true;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.5 : 1.15));
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
  const save = getSave();
  hud.setToast(`Benvenuto a Fidenza${save.name ? `, ${save.name}` : ''}`, 2600);
  hud.setBig('FIDENZA', 1500);
  audio.init();
  audio.setMuted(audio.muted);
  audio.resume();
  audio.click();
  player.spawn(WORLD.spawn.x, WORLD.spawn.z, WORLD.spawn.yaw);
  player.updateCamera(0, true);
  requestPointerLock();
  refreshSaveUI();
}

function requestPointerLock() {
  if (state === 'playing' && !isMobile && !document.querySelector('dialog[open]') && !map?.isOpen) {
    try {
      const p = canvas.requestPointerLock?.();
      if (p?.catch) p.catch(() => {});
    } catch { /* ignore */ }
  }
}

function openPause() {
  if (state !== 'playing') return;
  if (ui.pauseDialog.open) return;
  input.exitPointerLock();
  ui.pauseAudio.textContent = audio.muted ? 'Audio off' : 'Audio on';
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

function toggleAudio() {
  const muted = audio.toggleMute();
  hud.setAudioMuted(muted);
  ui.pauseAudio.textContent = muted ? 'Audio off' : 'Audio on';
  if (!muted) { audio.init(); audio.resume(); audio.click(); }
  const save = getSave();
  save.settings.audio = !muted;
  try { localStorage.setItem('fidenza-da-giocare-v1', JSON.stringify(save)); } catch { /* ignore */ }
}

function collectStar(starObj) {
  if (!starObj || starObj.collected) return;
  const id = starObj.id;
  if (addStar(id)) {
    addScore(SCORE.star);
    world.setStarCollected(id);
    audio.star();
    hud.setToast(`Stella trovata · +${SCORE.star}`, 2000);
    hud.setBig('★', 600);
    refreshSaveUI();
  }
}

function collectPlace(placeObj) {
  if (!placeObj || placeObj.visited) return;
  const l = placeObj.data;
  if (addPlace(l.id)) {
    addScore(SCORE.place);
    world.setPlaceVisited(l.id);
    audio.place();
    hud.setBig('LUOGO SCOPERTO', 1400);
    const save = getSave();
    hud.showInfo(l, save.places.length, world.placeObjects.length);
    refreshSaveUI();
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
  const nearPlace = world.getNearbyPlace(player.position.x, player.position.z, 30);
  if (nearPlace) {
    currentInteraction = { type: 'place', place: nearPlace.place };
    setPromptSafe({ text: `<kbd>E</kbd> scopri ${nearPlace.place.data.short || nearPlace.place.data.name}`, action: 'place' });
    return;
  }
  const nearVehicle = vehicles.nearest(player.position.x, player.position.z, 4.2);
  if (nearVehicle) {
    currentInteraction = { type: 'vehicle', vehicle: nearVehicle.vehicle };
    setPromptSafe({ text: `<kbd>E</kbd> guida ${nearVehicle.vehicle.label}`, action: 'vehicle' });
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
  if (currentInteraction.type === 'exit') {
    vehicles.exit();
    hud.setToast('Sei sceso dal veicolo');
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
  if (currentInteraction.type === 'place') {
    collectPlace(currentInteraction.place);
    return;
  }
  if (currentInteraction.type === 'vehicle') {
    vehicles.enter(currentInteraction.vehicle);
    hud.setToast(`Sei su: ${currentInteraction.vehicle.label}`);
    return;
  }
}

function updateHUD(dt) {
  if (!player || !world || !missions) return;
  const save = getSave();
  hud.setScore(save.score);
  hud.setProgress(save.stars.length, world.starObjects.length, save.places.length, world.placeObjects.length);

  const inVehicle = !!vehicles.current;
  const mode = inVehicle ? (vehicles.current.type === 'vespa' ? 'Vespa' : 'Auto') : 'A piedi';
  const nearest = getNearestLandmark(player.position.x, player.position.z, 160, player.cameraYaw);
  const zoneName = nearest ? (nearest.l.short || nearest.l.name) : (inVehicle ? 'Fidenza' : 'Fidenza');
  if (zoneName !== lastZone || hud.el.mode?.textContent !== mode) {
    lastZone = zoneName;
    hud.setMode(mode, zoneName);
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

  // stelle automatiche
  const nearStar = world.getNearbyStar(player.position.x, player.position.z, 2.0);
  if (nearStar) collectStar(nearStar.star);

  // meteo/notte
  if (world) world.setWeather(weather);
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, clock.getDelta());
  const dialogOpen = !!document.querySelector('dialog[open]');
  const paused = state === 'intro' || dialogOpen || map?.isOpen;
  gameTime += dt;

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
  } else {
    world.update(dt, player.position, camera);
  }

  if (player && world && missions) {
    // aggiorna HUD anche in pausa (senza input)
    if (!paused) updateHUD(dt);
    map?.drawBigMap(player, player.cameraYaw, missions.currentTarget);
    if (state !== 'intro') {
      map?.drawMinimap(player, player.cameraYaw, missions.currentTarget);
    }
  }

  if (state === 'playing') handleKeys(paused);
  renderer.render(scene, camera);
}

function handleKeys(paused) {
  if (input.consume('KeyM')) toggleAudio();
  if (input.consume('KeyN')) {
    if (map.isOpen) { map.close(); requestPointerLock(); }
    else if (!paused) openMap();
  }
  if (input.consume('KeyF')) {
    if (!paused) openMissions();
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
    if (!paused) openPause();
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init().catch(err => {
  console.error(err);
  const p = document.getElementById('loading-text');
  if (p) p.textContent = 'Errore nel caricamento. Apri la console per i dettagli.';
  hud.setLoading(0.2, 'Qualcosa non ha funzionato…');
});
