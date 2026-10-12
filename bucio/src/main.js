import './styles.css';
import * as THREE from 'three';

import { Engine, QUALITY } from './core/engine.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { makeRng, isTouchDevice, store } from './core/utils.js';

import { THEMES, THEME_IDS, currentTheme, setTheme, randomTheme } from './world/themes.js';
import { applyLayout, MAP, groundY } from './world/layout.js';
import { applyPalette } from './world/palette.js';
import {
  buildTerrain,
  buildSea,
  buildFoam,
  buildSidewalks,
  buildPonds,
  buildOpenSea,
  animateSea,
} from './world/terrain.js';
import { buildSky, buildClouds, buildLights, animateSky } from './world/sky.js';
import { PropWorld } from './world/propworld.js';
import { SPAWNS } from './world/layout.js';

import { createHoles, R0, TIERS } from './game/hole.js';
import { createBrain } from './game/ai.js';
import { HoleCamera } from './game/camera.js';
import { Effects } from './game/effects.js';
import { Director, MATCH_TIME } from './game/director.js';
import { PowerUps, applyPower } from './game/powerups.js';

import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { TouchControls } from './ui/joystick.js';
import { initPwa, createWakeLock } from './pwa.js';

/* =============================================================== bootstrap */

const canvas = document.getElementById('scene');
// ?q=low|med|high per provare la grafica; ?t=nevegal per provare un tema
const params = new URLSearchParams(location.search);
const engine = new Engine(canvas, params.get('q') || store.get('bucio.quality', 'high'));
const scene = engine.scene;
const rng = makeRng(777);

/* ============================================================ il tema attivo */

let themeId = params.get('t') || store.get('bucio.theme', 'portomarina');
if (!THEMES[themeId]) themeId = 'portomarina';
setTheme(themeId);
applyLayout(themeId);
applyPalette(currentTheme().palette);

const visuals = new THREE.Group();
visuals.name = 'mondo';
const lightRig = new THREE.Group();
lightRig.name = 'luci';
scene.add(visuals, lightRig);

let sea = null;
let clouds = null;

function disposeChildren(group) {
  const dead = [];
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }
    dead.push(o);
  });
  group.clear();
}

/** Costruisce (o ricostruisce) tutto ciò che dipende dall'ambientazione. */
function buildVisuals() {
  disposeChildren(visuals);
  disposeChildren(lightRig);
  const t = currentTheme();
  const sky = t.sky;

  scene.fog = new THREE.Fog(sky.fog, sky.fogNear, sky.fogFar);
  engine.renderer.toneMappingExposure = t.exposure;
  // il cielo lo disegna la cupola, non il fondo scena
  scene.background = null;

  visuals.add(buildOpenSea());
  visuals.add(buildTerrain());
  if (MAP.water) {
    sea = buildSea();
    visuals.add(sea);
    visuals.add(buildFoam());
  } else {
    sea = null;
  }
  visuals.add(buildSidewalks());
  visuals.add(buildPonds());
  visuals.add(buildSky());
  clouds = buildClouds();
  visuals.add(clouds);
  buildLights(lightRig);
}

/* ================================================================== il gioco */

const holes = createHoles(SPAWNS);
for (const h of holes) scene.add(h.group);

const player = holes[0];
const cam = new HoleCamera(engine.camera);
const fx = new Effects(scene);
const audio = new Audio();
const input = new Input(canvas);
const hud = new Hud();
const wake = createWakeLock();
const touch = isTouchDevice();
const powers = new PowerUps(scene, { rng: makeRng(5150) });

let world = null;
let director = null;

const screens = new Screens({
  onPlay: () => startMatch(),
  onResume: () => resume(),
  onQuit: () => toMenu(),
  onTheme: (id) => chooseTheme(id),
  onQuality: (q) => {
    store.set('bucio.quality', q);
    engine.applyQuality(q);
    buildWorld(QUALITY[q].density);
    hud.toast(`Grafica: ${QUALITY[q].label} — mondo ricaricato`);
  },
  onSound: (on) => {
    store.set('bucio.sound', on ? 'on' : 'off');
    audio.setEnabled(on);
    if (on) audio.init();
  },
  onShake: (on) => {
    store.set('bucio.shake', on);
    cam.shakeEnabled = on;
  },
  onInstall: () => doInstall(),
  onToast: (t) => hud.toast(t),
});

const touchCtl = new TouchControls(input, { onPulse: () => tryPulse() });

/* ==================================================================== stato */

let state = 'loading';

function setState(s) {
  state = s;
  const playing = s === 'playing';
  hud.show(playing);
  touchCtl.show(playing && touch);
}

/* ================================================================ debug/API */

const debug = {
  engine,
  holes,
  player,
  fx,
  cam,
  audio,
  powers,
  world: null,
  director: null,
  autopilot: null,
  start: () => startMatch(),
  theme: (id) => chooseTheme(id, { silent: true }),
  themeId: () => currentTheme().id,
  themes: THEME_IDS,
  power: (id) => applyPower(player, id, { rivals: holes }),
  /** Avanza la simulazione senza renderizzare: utilissimo per i test. */
  ff(seconds, dtStep = 1 / 60) {
    const n = Math.round(seconds / dtStep);
    for (let i = 0; i < n; i++) {
      engine.time += dtStep;
      step(dtStep, engine.time);
    }
    engine.render();
    return engine.time;
  },
};
window.__bucio = debug;

/* ========================================================== mondo e match */

function buildWorld(density) {
  world = new PropWorld(scene, { density });
  const brains = [];
  for (const s of [0.95, 0.82, 0.9, 0.72]) brains.push(createBrain(rng, s));

  director = new Director({
    world,
    holes,
    brains,
    effects: fx,
    audio,
    cam,
    powers,
    hooks: {
      onFeed: (text, kind) => hud.pushFeed(text, kind),
      onPickup: (h, def, pos) => director.onPickup(h, def, pos),
      onTick: (sec) => audio.tick(sec <= 3),
      onTier: (h, tier) => {
        if (!h.isPlayer) return;
        audio.tier();
        cam.shake(0.35);
        hud.toast(`Livello ${tier}: ${TIERS[tier].name} — ${TIERS[tier].perk}`);
        buzz([20, 60, 30]);
      },
      onGoldSpawn: (g) => {
        cam.shake(0.25);
        fx.text(g.x, g.def.r + 2.6, g.z, 'ORO!', '#ffd15c', 2.4);
      },
      onPowerSpawn: (p) => {
        fx.ring(p.x, p.z, 0.4, 6, 0.7, p.def.color);
        fx.text(p.x, p.y + 3.4, p.z, p.def.label, `#${p.def.color.toString(16).padStart(6, '0')}`, 1.8);
      },
      onPower: (h, info) => {
        hud.toast(`${info.label}: ${info.desc}${info.amount ? ` (+${info.amount})` : ''}`);
        buzz([18, 40, 18]);
        cam.shake(0.45);
      },
      onBite: (h) => {
        if (h.isPlayer) {
          cam.shake(0.9);
          buzz([60, 40, 90]);
          flashHurt();
        }
      },
      onEnd: (res) => {
        setState('results');
        touchCtl.show(false);
        wake.release();
        screens.showResults(res);
      },
    },
  });
  debug.world = world;
  debug.director = director;
}

function rebuildAll(density) {
  scene.remove(world.group);
  world.group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
  });
  buildWorld(density ?? QUALITY[engine.quality].density);
  resetHoles();
}

/** Cambia ambientazione e ricostruisce il mondo. */
function chooseTheme(id, { silent = false } = {}) {
  const next = id === 'random' ? randomTheme(themeId) : id;
  if (!THEMES[next]) return;
  themeId = setTheme(next);
  store.set('bucio.theme', id === 'random' ? 'random' : id);
  applyLayout(themeId);
  applyPalette(currentTheme().palette);
  buildVisuals();
  rebuildAll();
  if (!silent) {
    const t = currentTheme();
    hud.toast(`${t.emoji} ${t.name} — ${t.subtitle}`);
    screens.setTheme(themeId);
    screens.refreshBest();
  }
}

/* ================================================================= partita */

function resetHoles() {
  holes.forEach((h, i) => {
    const s = SPAWNS[i % SPAWNS.length];
    h.x = s.x;
    h.z = s.z;
    h.vx = 0;
    h.vz = 0;
    h.mass = 1;
    h.r = R0;
    h.score = 0;
    h.combo = 0;
    h.tier = 0;
    h.pulse = null;
    h.invuln = 1;
    h.stun = 0;
    h.eaten = 0;
    h.kills = 0;
    h.bestR = R0;
    h.newTier = 0;
    h.satiety = 0;
    h.lastVictim = null;
    h.idleT = 0;
    h.resetPowers();
    h.input.mag = 0;
    h.group.position.set(h.x, groundY(h.x, h.z), h.z);
    h.group.scale.setScalar(R0);
  });
  fx.clear();
  powers.clear();
}

function startMatch() {
  audio.init();
  audio.setEnabled(store.get('bucio.sound', 'on') === 'on');
  // "casuale" cambia scena a ogni partita
  if (store.get('bucio.theme', 'portomarina') === 'random' || params.get('t') === 'random') {
    chooseTheme(randomTheme(themeId), { silent: true });
  }
  director.reset();
  resetHoles();
  world.resetAll();
  hud.clearFeed();
  screens.hideAll();
  setState('playing');
  cam.intro = 1;
  cam.snapTo(player);
  audio.whoosh();
  wake.request();
  hud.toast(`Divora ${currentTheme().name}! 🍦`, 1500);
}

function pause() {
  if (state !== 'playing') return;
  setState('paused');
  screens.show('pause');
  wake.release();
}

function resume() {
  if (state !== 'paused') return;
  screens.hideAll();
  setState('playing');
  audio.init();
  wake.request();
}

function toMenu() {
  screens.show('menu');
  setState('menu');
  resetHoles();
  director.reset();
  fx.clear();
  wake.release();
}

function tryPulse() {
  if (state !== 'playing') return;
  if (player.firePulse()) buzz([14, 24, 40]);
}

/* ================================================================== input */

input
  .on('pulse', tryPulse)
  .on('pause', () => {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
  })
  .on('mute', () => {
    const on = store.get('bucio.sound', 'on') !== 'on';
    store.set('bucio.sound', on ? 'on' : 'off');
    audio.setEnabled(on);
    if (on) audio.init();
    hud.toast(on ? 'Audio on 🔊' : 'Audio muto 🔇');
  })
  .on('confirm', () => {
    if (state === 'menu' || state === 'results') startMatch();
  });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state === 'playing') pause();
});

/* =============================================================== feedback */

function buzz(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function flashHurt() {
  const v = document.getElementById('vignette');
  v.style.transition = 'none';
  v.style.boxShadow = 'inset 0 0 130px 30px rgba(220,40,40,0.75)';
  requestAnimationFrame(() => {
    v.style.transition = 'box-shadow 0.5s ease-out';
    v.style.boxShadow = 'inset 0 0 130px 30px rgba(220,40,40,0)';
  });
}

/* =================================================================== loop */

let hudAcc = 0;

function step(dt, t) {
  if (sea) animateSea(sea, t);
  if (clouds) animateSky(clouds, dt);

  if (state === 'playing' && director) {
    steer();
    director.update(dt, t);
    cam.intro = Math.max(0, cam.intro - dt * 0.7);
    cam.update(dt, player);

    const sp = Math.hypot(player.vx, player.vz);
    if (sp > player.speed * 0.72 && rng() < dt * 26) fx.trail(player.x, player.z, player.r * 0.85);

    hudAcc += dt;
    if (hudAcc > 0.08) {
      hudAcc = 0;
      hud.setScore(player.score);
      hud.setTimer(director.time, MATCH_TIME);
      hud.setTier(player.tier);
      hud.setSize(player.r);
      hud.setBoard(director.board());
      hud.setCombo(player.combo);
      hud.setPowers(player.powers);
      hud.setPulseReady(player.pulseReady);
      touchCtl.setPulseReady(player.pulseReady);
    }
  } else if (state === 'menu' || state === 'results' || state === 'loading') {
    for (const h of holes) {
      h.update(dt, t);
      if (h.isPlayer) h.input.mag = 0;
    }
    cam.orbit(dt, { x: 0, y: 0, z: 0 }, state === 'results' ? 86 : 98);
  }

  if (director && state === 'playing') powers.update(dt, t, holes, director);
  // in pausa il mondo è davvero fermo: niente respawn, niente mare mosso
  if (world && state !== 'paused') world.update(dt, t, holes);
  fx.update(dt);
  hud.update(dt);
}

/** Tiene il buco sotto il puntatore del mouse, o segue tasti/dita. */
function steer() {
  if (debug.autopilot) {
    player.input.x = debug.autopilot.x;
    player.input.y = debug.autopilot.y;
    player.input.mag = debug.autopilot.mag;
    return;
  }
  const v = input.sample();
  if (input.mode === 'mouse' && input.hasPointer) {
    const g = input.screenToGround(input.pointerNdc, engine.camera);
    if (g) player.steerTo(g.x, g.z);
    else player.input.mag = 0;
  } else {
    player.input.x = v.x;
    player.input.y = v.y;
    player.input.mag = v.mag;
  }
}

/* ==================================================================== PWA */

const pwa = initPwa({
  onInstallAvailable: (on) => screens.setInstallAvailable(on),
  onInstalled: () => {
    screens.setInstallAvailable(false);
    hud.toast('BUCIO installato. Buon divertimento! 🕳️');
  },
  onOffline: (off) => screens.setOffline(off),
  onToast: (t) => hud.toast(t),
});
screens.setIosHint(pwa.needsIosHint);

async function doInstall() {
  const ok = await pwa.promptInstall();
  if (!ok) hud.toast('Nessun problema: si gioca lo stesso dal browser 🕳️');
}

/* ================================================================= avvio */

buildVisuals();
buildWorld(QUALITY[engine.quality].density);
resetHoles();
cam.orbit(0, { x: 0, y: 0, z: 0 }, 98);
engine.start(step);

function boot() {
  screens.show('menu');
  screens.refreshBest();
  screens.hideLoader();
  setState('menu');
}
requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(boot, 40)));
