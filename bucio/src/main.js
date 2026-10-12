import './styles.css';

import { Engine, QUALITY } from './core/engine.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { makeRng, isTouchDevice, store } from './core/utils.js';

import {
  buildTerrain,
  buildSea,
  buildFoam,
  buildSidewalks,
  buildOpenSea,
  animateSea,
} from './world/terrain.js';
import { buildSky, buildClouds, buildLights, animateSky } from './world/sky.js';
import { PropWorld } from './world/propworld.js';
import { SPAWNS, groundY } from './world/layout.js';

import { createHoles, R0, TIERS } from './game/hole.js';
import { createBrain } from './game/ai.js';
import { HoleCamera } from './game/camera.js';
import { Effects } from './game/effects.js';
import { Director, MATCH_TIME } from './game/director.js';

import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { TouchControls } from './ui/joystick.js';
import { initPwa, createWakeLock } from './pwa.js';

const canvas = document.getElementById('scene');
// ?q=low|med|high per provare la grafica senza toccare le impostazioni
const params = new URLSearchParams(location.search);
const quality = params.get('q') || store.get('bucio.quality', 'high');

const engine = new Engine(canvas, quality);
const scene = engine.scene;
const rng = makeRng(777);

/* ------------------------------------------------------------------ mondo */

scene.add(buildOpenSea());
scene.add(buildTerrain());
const sea = buildSea();
scene.add(sea);
scene.add(buildFoam());
scene.add(buildSidewalks());
scene.add(buildSky());
const clouds = buildClouds();
scene.add(clouds);
const lights = buildLights(scene);

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

/* ------------------------------------------------------------------- UI */

let world = null;
let director = null;

const screens = new Screens({
  onPlay: () => startMatch(),
  onResume: () => resume(),
  onQuit: () => toMenu(),
  onQuality: (q) => {
    store.set('bucio.quality', q);
    engine.applyQuality(q);
    rebuildWorld(q);
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

const touchCtl = new TouchControls(input, {
  onPulse: () => tryPulse(),
});

/* ---------------------------------------------------------------- stato */

let state = 'loading';

function setState(s) {
  state = s;
  const playing = s === 'playing';
  hud.show(playing);
  touchCtl.show(playing && touch);
}

/* ------------------------------------------------------------ costruzione */

function buildWorld(density) {
  world = new PropWorld(scene, { density });
  const brains = [];
  const skills = [0.95, 0.82, 0.9, 0.72];
  for (const s of skills) brains.push(createBrain(rng, s));

  director = new Director({
    world,
    holes,
    brains,
    effects: fx,
    audio,
    cam,
    hooks: {
      onFeed: (text, kind) => hud.pushFeed(text, kind),
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
        fx.text(g.x, 3.2, g.z, 'ORO!', '#ffd15c', 2.4);
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
}

function rebuildWorld(qName) {
  if (!world) return;
  scene.remove(world.group);
  world.group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
  });
  buildWorld(QUALITY[qName].density);
  debug.world = world;
  debug.director = director;
  director.reset();
  resetHoles();
}

cam.orbit(0, { x: 0, y: 0, z: 4 }, 96);
engine.start(step);

/** Il mondo costa qualche decina di ms: lo costruiamo dopo il primo frame. */
function boot() {
  buildWorld(QUALITY[quality].density);
  resetHoles();
  debug.world = world;
  debug.director = director;
  screens.show('menu');
  screens.refreshBest();
  screens.hideLoader();
  setState('menu');
}
requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(boot, 40)));

/* ------------------------------------------------------------- partita */

function resetHoles() {
  holes.forEach((h, i) => {
    const s = SPAWNS[i];
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
    h.input.mag = 0;
    h.group.position.set(h.x, groundY(h.x, h.z), h.z);
    h.group.scale.setScalar(R0);
  });
  fx.clear();
}

function startMatch() {
  audio.init();
  audio.setEnabled(store.get('bucio.sound', 'on') === 'on');
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
  hud.toast('Divora tutto! 🍦', 1500);
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

/* --------------------------------------------------------------- input */

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
    if (state === 'menu') startMatch();
    else if (state === 'results') startMatch();
  });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state === 'playing') pause();
});

/* ------------------------------------------------------------- feedback */

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

/* ------------------------------------------------------------ il loop */

let hudAcc = 0;

function step(dt, t) {
  animateSea(sea, t);
  animateSky(clouds, dt);

  if (state === 'playing' && director) {
    steer(dt);
    director.update(dt, t);
    cam.intro = Math.max(0, cam.intro - dt * 0.7);
    cam.update(dt, player);

    // polvere sollevata quando corri
    const sp = Math.hypot(player.vx, player.vz);
    if (sp > player.speed * 0.72 && rng() < dt * 26) {
      fx.trail(player.x, player.z, player.r * 0.85);
    }

    hudAcc += dt;
    if (hudAcc > 0.08) {
      hudAcc = 0;
      hud.setScore(player.score);
      hud.setTimer(director.time, MATCH_TIME);
      hud.setTier(player.tier);
      hud.setSize(player.r);
      hud.setBoard(director.board());
      hud.setCombo(player.combo);
      hud.setPulseReady(player.pulseReady);
      touchCtl.setPulseReady(player.pulseReady);
    }
  } else if (state === 'menu' || state === 'results' || state === 'loading') {
    // il mondo continua a vivere anche fuori partita
    for (const h of holes) {
      h.update(dt, t);
      if (h.isPlayer) h.input.mag = 0;
    }
    cam.orbit(dt, { x: 0, y: 0, z: 4 }, state === 'results' ? 84 : 96);
    if (state === 'loading') {
      cam.orbit(dt, { x: 0, y: 0, z: 4 }, 70);
    }
  }

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

/* ------------------------------------------------------------------ PWA */

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

/* -------------------------------------------------------------- debug */

const debug = {
  engine,
  holes,
  player,
  fx,
  cam,
  audio,
  world: null,
  director: null,
  autopilot: null,
  start: () => startMatch(),
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