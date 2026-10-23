import CONFIG from './config.js';
import { loadState, saveState, loadInventory, saveInventory, loadSettings, saveSettings, newUid } from './storage.js';
import {
  drawLowPolyPokemon, drawPokeball, drawTerrain, drawParticles, drawCatchEffect,
  drawStarfield, drawTargetRing, drawTrajectory,
} from './renderer.js';
import {
  computePower, clampAimAngle, ringScaleAt, qualityFromImpact, catchRate,
  trajectory, segmentCircleHit, spinFromAccum, isCurve, xpForThrow, clamp01,
  closestApproachOnFlight,
} from './logic/throw.js';
import { pickEggSpecies, levelForXp, xpProgress } from './logic/progress.js';
import { artworkUrl, loadSprite } from './sprites.js';

/* ================== STATE ================== */
let state = loadState();
let inventory = loadInventory();
let settings = loadSettings();
let currentPoke = CONFIG.pokedex[0];
let currentBiome = state.currentBiome || 'grass';
let selectedBall = 'poke';
let selectedBerry = null;
let gamePhase = 'idle'; // idle, grabbing, charging, throwing, shaking, result
let phaseTime = 0;
let particles = [];
let canvas, ctx;
let animId = null;
let lastFrameTs = 0;
let time = 0;
let catchResult = null;
let lastCatchData = null;
let screenW = 0, screenH = 0;
let wildPokemon = null;
let wildIsShiny = false;
let wildCP = 0;
let wildSpriteImg = null;
let wildSpriteReady = false;

let burstTriggered = false;
let nearbyMons = [];
let timeOfDay = 'day';
let typeFilter = 'all';
let currentTab = 'catch';
let sessionStart = Date.now();
let deferredInstall = null;

/* Throw 2.0 */
const THROW_CFG = CONFIG.throw;
let ringPhase = 0;
let ringFrozen = false;
let lastTarget = { x: 0, y: 0 };
let ball = null;
let lastThrowQuality = 'normal';
let lastThrowCurve = false;
let lastHit = null;
let lastLaunch = null;
let shakeTick = -1;
let shakeNeeded = 3;
let audioCtx = null;
let tutorialStep = 0;
const throwInput = {
  active: false,
  keyboard: false,
  pointerId: null,
  holdStart: 0,
  x: 0,
  y: 0,
  angle: -Math.PI / 2,
  dragDist: 0,
  power: 0,
  spin: 0,
  spinAccum: 0,
  lastPointerAngle: null,
  lastMoveTime: 0,
};

const GROUND_Y_RATIO = 0.72;

/* ================== INIT ================== */
function init() {
  canvas = document.getElementById('stage-canvas');
  if (!canvas) return setTimeout(init, 50);
  ctx = canvas.getContext('2d');
  updateAppHeight();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('resize', updateAppHeight);
  window.addEventListener('orientationchange', () => setTimeout(updateAppHeight, 120));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateAppHeight);
    window.visualViewport.addEventListener('scroll', updateAppHeight);
  }
  if (window.ResizeObserver) {
    new ResizeObserver(() => requestAnimationFrame(resize)).observe(canvas.parentElement);
  }
  setupInstallPrompt();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  CONFIG.language = settings.language || 'en';
  document.documentElement.lang = CONFIG.language;
  applyI18n();
  const togSound = document.getElementById('tog-sound');
  const togHaptics = document.getElementById('tog-haptics');
  const togAssist = document.getElementById('tog-assist');
  if (togSound) togSound.classList.toggle('on', !!settings.sound);
  if (togHaptics) togHaptics.classList.toggle('on', !!settings.haptics);
  if (togAssist) togAssist.classList.toggle('on', !!settings.assist);
  if (window.R2 && window.R2.markPlayed) window.R2.markPlayed('pokemon-go-pwa-v2');
  if (window.R2 && window.R2.trackPlaytime) window.R2.trackPlaytime('pokemon-go-pwa-v2');

  checkQuestReset();
  spawnWildPokemon();
  renderPokedex();
  renderInventory();
  renderTrainer();
  renderBiomeSelector();
  renderNearbyRadar();
  updateTopBar();
  updateStageUI();
  updateThrowHUD();
  renderLoadout();
  updateNav('catch');
  updateTimeOfDay();

  document.getElementById('start-menu').classList.remove('hidden');
  if (state.caught.length > 0) {
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('start-menu').style.display = 'none';
  }

  setInterval(updateNearbyTimer, 1000);
  setInterval(renderNearbyRadar, 5000);
  setInterval(updateTimeOfDay, 60000);
  document.addEventListener('visibilitychange', onVisibilityChange);
  startLoop();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  const tabParam = new URLSearchParams(location.search).get('tab');
  if (tabParam && ['catch', 'pokedex', 'inventory', 'shop', 'collection', 'trainer', 'research'].includes(tabParam)) {
    switchTab(tabParam);
  }
}

function updateAppHeight() {
  const vv = window.visualViewport;
  const h = vv && vv.height ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', Math.max(320, Math.round(h)) + 'px');
}

function setupInstallPrompt() {
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) {
    const item = document.getElementById('more-install');
    if (item) item.classList.add('hidden');
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    const item = document.getElementById('more-install');
    if (item) item.classList.remove('hidden');
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    const item = document.getElementById('more-install');
    if (item) item.classList.add('hidden');
  });
}

window.installApp = async function installApp() {
  if (!deferredInstall) {
    showToast(t('Install: use your browser menu, or Share > Add to Home Screen on iOS.'), 4200);
    return;
  }
  try {
    await deferredInstall.prompt();
    await deferredInstall.userChoice;
  } catch (e) {}
  deferredInstall = null;
  const item = document.getElementById('more-install');
  if (item) item.classList.add('hidden');
};

function startLoop() {
  if (animId != null) return;
  lastFrameTs = 0;
  animId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (animId != null) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

function onVisibilityChange() {
  if (document.hidden) {
    if (gamePhase === 'grabbing' || gamePhase === 'charging') cancelThrow();
    stopLoop();
  } else if (currentTab === 'catch') {
    startLoop();
  }
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.parentElement.getBoundingClientRect();
  screenW = rect.width;
  screenH = rect.height;
  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;
  canvas.style.width = screenW + 'px';
  canvas.style.height = screenH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ================== BIOME POOL ================== */
function getBiomePool(biomeKey) {
  const biome = CONFIG.biomes[biomeKey];
  const refs = biome ? biome.pokemon : CONFIG.pokedex.map(p => p.id);
  const pool = refs.map(ref => {
    const [id, w] = ref.split(':');
    const p = CONFIG.byId(id);
    if (!p) return null;
    return { p, w: w != null ? parseFloat(w) : (p.weight || 0) };
  }).filter(x => x && x.w > 0);
  for (const a of (CONFIG.autoSpecies?.[biomeKey] || [])) {
    const p = CONFIG.byId(a.id);
    if (p && p.weight > 0) pool.push({ p, w: a.w });
  }
  if (pool.length === 0) pool.push({ p: CONFIG.pokedex[0], w: 1 });
  return pool;
}

/* ================== NEARBY RADAR ================== */
function generateNearby() {
  const pool = getBiomePool(currentBiome);
  nearbyMons = [];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(3, shuffled.length); i++) {
    nearbyMons.push({ id: shuffled[i].p.id, timer: 60 + Math.floor(Math.random() * 120), shiny: Math.random() < CONFIG.shinyChance });
  }
}

function renderNearbyRadar() {
  const el = document.getElementById('nearby-radar');
  if (!el) return;
  if (!nearbyMons.length) generateNearby();
  el.innerHTML = '';
  nearbyMons.forEach((n) => {
    const p = CONFIG.byId(n.id);
    if (!p) return;
    const chip = document.createElement('div');
    chip.className = 'nearby-chip';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', `${p.name[tLang()]} nearby`);
    const timeLabel = n.timer < 60 ? `${Math.max(0, n.timer)}s` : `${Math.ceil(n.timer / 60)}m`;
    chip.innerHTML = `
      <img src="${artworkUrl(p, n.shiny) || ''}" alt="" onerror="this.style.display='none'" loading="lazy">
      <div>
        <div class="nm">${p.name[tLang()]} ${n.shiny ? '✨' : ''}</div>
        <div class="nt">${timeLabel}</div>
      </div>
    `;
    chip.onclick = () => { spawnWildPokemon(p.id, n.shiny); };
    chip.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spawnWildPokemon(p.id, n.shiny); } };
    el.appendChild(chip);
  });
}

function updateNearbyTimer() {
  let changed = false;
  for (let i = nearbyMons.length - 1; i >= 0; i--) {
    nearbyMons[i].timer--;
    if (nearbyMons[i].timer <= 0) {
      const pool = getBiomePool(currentBiome);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) {
        nearbyMons[i] = { id: pick.p.id, timer: 60 + Math.floor(Math.random() * 120), shiny: Math.random() < CONFIG.shinyChance };
      } else {
        nearbyMons.splice(i, 1);
      }
      changed = true;
    }
  }
  if (changed) renderNearbyRadar();
}

/* ================== WILD SPAWN ================== */
function spawnWildPokemon(overrideId = null, shinyOverride = null) {
  const pool = getBiomePool(currentBiome);
  let choice = null;
  if (overrideId) {
    choice = pool.find(x => x.p.id === overrideId);
  }
  if (!choice) {
    const weights = pool.map(x => x.w);
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { idx = i; break; }
    }
    choice = pool[idx];
  }
  wildPokemon = choice.p;
  wildIsShiny = shinyOverride !== null ? !!shinyOverride : Math.random() < CONFIG.shinyChance;

  wildSpriteImg = null;
  wildSpriteReady = false;
  const url = artworkUrl(wildPokemon, wildIsShiny);
  loadSprite(url).then(img => {
    if (wildPokemon && artworkUrl(wildPokemon, wildIsShiny) === url) {
      wildSpriteImg = img;
      wildSpriteReady = !!img;
    }
  });

  const base = 10 + (wildPokemon.difficulty * 25);
  wildCP = Math.floor(base + Math.random() * base * 0.5);

  if (!state.seen.includes(wildPokemon.id)) {
    state.seen.push(wildPokemon.id);
    saveState(state);
  }
  gamePhase = 'idle';
  phaseTime = 0;
  catchResult = null;
  burstTriggered = false;
  ball = null;
  ringPhase = 0;
  resetThrowInput();
  updateStageUI();
  updateThrowHUD();
}

function getRingScale() {
  return ringScaleAt(ringPhase, THROW_CFG);
}

function resetThrowInput() {
  throwInput.active = false;
  throwInput.keyboard = false;
  throwInput.pointerId = null;
  throwInput.holdStart = 0;
  throwInput.x = 0;
  throwInput.y = 0;
  throwInput.angle = -Math.PI / 2;
  throwInput.dragDist = 0;
  throwInput.power = 0;
  throwInput.spin = 0;
  throwInput.spinAccum = 0;
  throwInput.lastPointerAngle = null;
  throwInput.lastMoveTime = 0;
}


function spawnBurst(x, y) {
  const colors = ['#ffd700', '#4fc3f7', '#81c784', '#fff176', '#ff6b9d', '#7c6cf0'];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 1,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

/* ================== COMBO OVERLAY ================== */
function triggerComboOverlay() {
  const el = document.getElementById('combo-overlay');
  const txt = document.getElementById('combo-text');
  if (!el || !txt || !state.streak || state.streak < 2) return;
  txt.textContent = `${t('Combo')} x${state.streak}!`;
  el.classList.remove('hidden', 'fade');
  el.classList.add('animated');
  setTimeout(() => {
    el.classList.remove('animated');
    el.classList.add('fade');
  }, 1200);
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('fade');
  }, 1900);
}

/* ================== GAME LOOP ================== */
function gameLoop(ts) {
  if (!lastFrameTs) lastFrameTs = ts;
  const dt = Math.min((ts - lastFrameTs) / 1000, 0.05);
  lastFrameTs = ts;
  time = ts / 1000;
  animId = requestAnimationFrame(gameLoop);

  if (!screenW || !screenH || !ctx) return;
  ctx.clearRect(0, 0, screenW, screenH);

  const biome = CONFIG.biomes[currentBiome];
  drawTerrain(ctx, screenW, screenH, time, biome ? biome.color : '#0f1a0f');
  drawStarfield(ctx, screenW, screenH * 0.65, time);

  const groundY = screenH * GROUND_Y_RATIO;
  const centerX = screenW / 2;
  const pokeSize = Math.min(screenW * 0.35, 160);
  const wildMoveBase = 30;
  const nanabFactor = selectedBerry === 'nanab' ? 0.25 : 1;
  const wildOffsetX = Math.sin(time * 1.1) * wildMoveBase * nanabFactor;
  const wildOffsetY = Math.cos(time * 1.6) * (wildMoveBase * 0.35) * nanabFactor;
  const wildTargetX = centerX + wildOffsetX;
  const wildTargetY = groundY - pokeSize * 0.25 + wildOffsetY;
  const assist = !!settings.assist;

  if (!ringFrozen && (gamePhase === 'idle' || gamePhase === 'grabbing' || gamePhase === 'charging')) {
    ringPhase += dt * (assist ? 0.82 : 1);
  }
  const ringScale = getRingScale();
  lastTarget = { x: wildTargetX, y: wildTargetY - pokeSize * 0.05 };

  // Ground shadow + rarity tint
  if (wildPokemon) {
    const ringColors = ['#ffffff44','#ffffff44','#7c6cf066','#7c6cf066','#7c6cf066','#ff6b9d66','#ff6b9d66','#ff6b9d66','#ffd16688','#ffd16688'];
    const rc = wildIsShiny ? `rgba(255,209,102,${0.3 + Math.sin(time * 4) * 0.15})` : (ringColors[wildPokemon.difficulty - 1] || '#ffffff44');
    ctx.save();
    ctx.strokeStyle = rc;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(wildTargetX, groundY - 8, pokeSize * 0.55, pokeSize * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawTargetRing(ctx, wildTargetX, wildTargetY - pokeSize * 0.05, pokeSize * 0.52, ringScale, wildIsShiny);
  }

  // Render wild Pokémon
  if (wildPokemon) {
    const isAiming = gamePhase === 'idle' || gamePhase === 'grabbing' || gamePhase === 'charging';
    const jitter = gamePhase === 'shaking' ? (Math.random() - 0.5) * 8 : 0;
    const fleeOffset = gamePhase === 'result' && catchResult === false ? Math.sin(time * 8) * 40 : 0;
    const fleeAlpha = gamePhase === 'result' && catchResult === false ? Math.max(0, 1 - phaseTime * 1.5) : 1;
    const breath = isAiming ? 1 + Math.sin(time * 3) * 0.04 : 1;
    ctx.save();
    ctx.globalAlpha = fleeAlpha;
    const drawX = wildTargetX + jitter + fleeOffset;
    const drawY = wildTargetY;
    ctx.translate(drawX, drawY);
    ctx.scale(breath, breath);
    ctx.translate(-drawX, -drawY);
    if (wildSpriteReady && wildSpriteImg) {
      const s = pokeSize * 1.9;
      if (wildIsShiny) {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.65)';
        ctx.shadowBlur = 26;
      }
      ctx.drawImage(wildSpriteImg, drawX - s / 2, drawY - s * 0.66, s, s);
      ctx.shadowBlur = 0;
      if (wildIsShiny) {
        const sp = Math.abs(Math.sin(time * 3));
        if (sp > 0.7) {
          ctx.globalAlpha = ((sp - 0.7) / 0.3) * fleeAlpha;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(drawX + s * 0.3, drawY - s * 0.9, s * 0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fleeAlpha;
        }
      }
    } else {
      drawLowPolyPokemon(ctx, wildPokemon, drawX, drawY, pokeSize, time, wildIsShiny);
    }
    ctx.restore();
  }

  // Aiming preview / thrown ball / shake
  if (gamePhase === 'grabbing' || gamePhase === 'charging') {
    updateThrowFromKeyboard();
    const anchor = getThrowAnchor();
    const preview = trajectory({
      x: anchor.x,
      y: anchor.y,
      angle: throwInput.angle,
      power: throwInput.power,
      spin: throwInput.spin,
      cfg: THROW_CFG,
      groundY: screenH + 40,
    });
    drawTrajectory(ctx, preview, isCurve(throwInput.spin, THROW_CFG) ? 'rgba(157,143,255,0.85)' : 'rgba(255,255,255,0.55)');
    const bx = anchor.x + (throwInput.x - anchor.x) * 0.18;
    const by = anchor.y + (throwInput.y - anchor.y) * 0.18;
    drawPokeball(ctx, bx, by, 18, selectedBall, time * 8);
  } else if (gamePhase === 'throwing' && ball) {
    updateBall(dt, wildTargetX, wildTargetY, pokeSize, screenH + 40);
    if (ball) {
      drawPokeball(ctx, ball.x, ball.y, 18, selectedBall, time * 12);
      if (Math.random() > 0.45) {
        particles.push({
          x: ball.x, y: ball.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 1.5,
          life: 0.8, size: 2.5,
          color: isCurve(ball.spin, THROW_CFG) ? '#9d8fff' : '#ffffff',
        });
      }
    }
  } else if (gamePhase === 'shaking') {
    const bx = centerX;
    const by = groundY - 40;
    const wobble = Math.sin(phaseTime * 15) * (catchResult ? 0.1 : 0.3) * (1 - phaseTime * 0.3);
    drawPokeball(ctx, bx, by, 28 + Math.sin(phaseTime * 8) * 4, selectedBall, wobble + phaseTime * 20);
    if (catchResult && phaseTime < 0.5) {
      drawCatchEffect(ctx, bx, by, phaseTime * 2, '#4fc3f7');
    }
  } else if (gamePhase === 'result' && catchResult) {
    const bx = centerX;
    const by = groundY - 40;
    drawPokeball(ctx, bx, by, 28, selectedBall, 0);
    drawCatchEffect(ctx, bx, by, 1.0 - phaseTime * 0.5, '#ffd700');
    if (!burstTriggered) {
      burstTriggered = true;
      spawnBurst(bx, by);
    }
  }

  updateParticles(dt);
  drawParticles(ctx, particles);

  if (gamePhase === 'shaking') {
    phaseTime += dt;
    const shakePhase = Math.floor(phaseTime * 2.5);
    if (shakePhase !== shakeTick && shakePhase < 3) {
      shakeTick = shakePhase;
      playShakeTick();
    }
    if (shakePhase >= shakeNeeded) {
      gamePhase = 'result';
      phaseTime = 0;
      showResult(catchResult);
    }
  }

  if (gamePhase === 'result') {
    phaseTime += dt;
    if (phaseTime > 2.5 && catchResult === false) {
      const modal = document.getElementById('result-modal');
      if (modal) modal.classList.add('hidden');
      spawnWildPokemon();
    }
  }
}

function updateParticles(dt) {
  const step = dt * 60;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.vy += 0.15 * step;
    p.life -= dt * 1.5;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ================== THROW 2.0 INPUT ================== */
function getThrowAnchor() {
  const dock = document.getElementById('throw-dock');
  const dockH = dock ? dock.getBoundingClientRect().height : 44;
  return {
    x: screenW / 2,
    y: Math.max(70, screenH - dockH - 30),
  };
}

function ensureBallAvailable() {
  if ((inventory[selectedBall + 'balls'] || 0) > 0) return true;
  const order = ['poke', 'great', 'ultra', 'master'];
  const found = order.find((k) => (inventory[k + 'balls'] || 0) > 0);
  if (!found) {
    showToast(t('No Poké Balls left!'));
    return false;
  }
  selectedBall = found;
  renderInventory();
  renderLoadout();
  updateStageUI();
  updateTopBar();
  return true;
}

function beginThrow(source) {
  if (!ensureBallAvailable()) return false;
  resumeAudio();
  const anchor = getThrowAnchor();
  throwInput.active = true;
  throwInput.keyboard = source === 'keyboard';
  throwInput.pointerId = null;
  throwInput.holdStart = performance.now();
  throwInput.lastPointerAngle = null;
  throwInput.spinAccum = 0;
  throwInput.spin = 0;
  throwInput.power = 0;
  throwInput.dragDist = source === 'keyboard' ? 90 : 0;
  throwInput.angle = -Math.PI / 2;
  throwInput.x = anchor.x;
  throwInput.y = anchor.y - (source === 'keyboard' ? 90 : 0);
  throwInput.lastMoveTime = performance.now();
  gamePhase = 'grabbing';
  updateThrowHUD();
  return true;
}

function onPointerDown(e) {
  if (gamePhase !== 'idle') return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!beginThrow('pointer')) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  throwInput.pointerId = e.pointerId;
  throwInput.x = e.clientX - rect.left;
  throwInput.y = e.clientY - rect.top;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
}

function onPointerMove(e) {
  if (!throwInput.active || throwInput.keyboard) return;
  if (e.pointerId !== throwInput.pointerId) return;
  if (gamePhase !== 'grabbing' && gamePhase !== 'charging') return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const anchor = getThrowAnchor();
  const dx = x - anchor.x;
  const dy = y - anchor.y;
  throwInput.x = x;
  throwInput.y = y;
  throwInput.dragDist = Math.min(Math.hypot(dx, dy), THROW_CFG.maxDrag);
  const holdMs = performance.now() - throwInput.holdStart;
  throwInput.power = computePower(holdMs, throwInput.dragDist, THROW_CFG);
  throwInput.angle = clampAimAngle(Math.atan2(dy, dx));

  const now = performance.now();
  if (now - throwInput.lastMoveTime > 260) throwInput.spinAccum *= 0.55;
  const pa = Math.atan2(dy, dx);
  if (throwInput.lastPointerAngle !== null && throwInput.dragDist > 28) {
    let d = pa - throwInput.lastPointerAngle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < Math.PI / 2) throwInput.spinAccum += d;
  }
  throwInput.lastPointerAngle = pa;
  throwInput.lastMoveTime = now;
  throwInput.spin = spinFromAccum(throwInput.spinAccum, THROW_CFG);

  if (holdMs > 120 && gamePhase === 'grabbing') gamePhase = 'charging';
  updateThrowHUD();
}

function onPointerUp(e) {
  if (!throwInput.active || throwInput.keyboard) return;
  if (e.pointerId !== throwInput.pointerId) return;
  e.preventDefault();
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  releaseThrow();
}

function onPointerCancel(e) {
  if (throwInput.pointerId !== e.pointerId) return;
  cancelThrow();
}

function releaseThrow() {
  if (gamePhase !== 'grabbing' && gamePhase !== 'charging') {
    cancelThrow();
    return false;
  }
  if (!ensureBallAvailable()) {
    cancelThrow();
    return false;
  }
  if (throwInput.power < 0.08 || (throwInput.dragDist < 8 && !throwInput.keyboard)) {
    cancelThrow();
    return false;
  }
  const anchor = getThrowAnchor();
  const speed = THROW_CFG.minSpeed + (THROW_CFG.maxSpeed - THROW_CFG.minSpeed) * clamp01(throwInput.power);
  const spin = throwInput.spin;
  ball = {
    x: anchor.x,
    y: anchor.y,
    vx: Math.cos(throwInput.angle) * speed,
    vy: Math.sin(throwInput.angle) * speed,
    spin,
    bounces: 0,
    age: 0,
  };
  lastLaunch = { ...ball, angle: throwInput.angle, power: throwInput.power, spin };
  inventory[selectedBall + 'balls'] = Math.max(0, (inventory[selectedBall + 'balls'] || 0) - 1);
  state.totalThrows = (state.totalThrows || 0) + 1;
  if (isCurve(spin, THROW_CFG)) state.curveThrows = (state.curveThrows || 0) + 1;
  lastThrowCurve = isCurve(spin, THROW_CFG);
  saveInventory(inventory);
  saveState(state);
  renderInventory();
  updateTopBar();
  gamePhase = 'throwing';
  playThrowSound();
  haptic([8, 24, 8]);
  recordEvent('throw');
  resetThrowInput();
  updateThrowHUD();
  return true;
}

function cancelThrow() {
  const was = gamePhase;
  resetThrowInput();
  if (was === 'grabbing' || was === 'charging') gamePhase = 'idle';
  updateThrowHUD();
}

function updateThrowFromKeyboard() {
  if (!throwInput.keyboard || !throwInput.active) return;
  const holdMs = performance.now() - throwInput.holdStart;
  throwInput.power = computePower(holdMs, throwInput.dragDist, THROW_CFG);
  if (holdMs > 120 && gamePhase === 'grabbing') gamePhase = 'charging';
  const anchor = getThrowAnchor();
  throwInput.x = anchor.x + Math.cos(throwInput.angle) * throwInput.dragDist;
  throwInput.y = anchor.y + Math.sin(throwInput.angle) * throwInput.dragDist;
  updateThrowHUD();
}

function onKeyDown(e) {
  const sheet = document.querySelector('.sheet:not(.hidden)');
  if (sheet) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSheet(sheet.id.replace('-sheet', ''));
    }
    return;
  }
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  const menu = document.getElementById('start-menu');
  const tutorial = document.getElementById('tutorial-modal');
  if ((menu && !menu.classList.contains('hidden')) || (tutorial && !tutorial.classList.contains('hidden'))) return;
  if (document.querySelector('.result-modal:not(.hidden), .detail-modal:not(.hidden)')) return;
  if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.code === 'Space') {
    if (gamePhase === 'idle') {
      e.preventDefault();
      beginThrow('keyboard');
    } else if (gamePhase === 'grabbing' || gamePhase === 'charging') {
      e.preventDefault();
    }
    return;
  }
  if ((gamePhase === 'grabbing' || gamePhase === 'charging') && throwInput.keyboard) {
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      throwInput.angle = clampAimAngle(throwInput.angle - 0.07);
      updateThrowHUD();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      throwInput.angle = clampAimAngle(throwInput.angle + 0.07);
      updateThrowHUD();
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      throwInput.dragDist = Math.min(THROW_CFG.maxDrag, throwInput.dragDist + 12);
      updateThrowHUD();
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      throwInput.dragDist = Math.max(20, throwInput.dragDist - 12);
      updateThrowHUD();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      cancelThrow();
    }
  }
}

function onKeyUp(e) {
  if (e.code === 'Space' && throwInput.active && throwInput.keyboard) {
    e.preventDefault();
    releaseThrow();
  }
}

/* ================== BALL PHYSICS ================== */
function updateBall(dt, targetX, targetY, pokeSize, groundY) {
  if (!ball) return;
  const prevX = ball.x;
  const prevY = ball.y;
  ball.age += dt;
  ball.vy += THROW_CFG.gravity * dt;
  ball.vx += ball.spin * THROW_CFG.curveAccel * dt;
  ball.vx *= 0.999;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const hitCenterY = targetY - pokeSize * 0.05;
  const hitRadius = pokeSize * (settings.assist ? 0.40 : 0.34);
  const hit = segmentCircleHit(prevX, prevY, ball.x, ball.y, targetX, hitCenterY, hitRadius);
  if (hit.hit) {
    onBallHit(hit.x, hit.y, targetX, hitCenterY, pokeSize);
    return;
  }

  if (ball.y >= groundY - 12) {
    ball.y = groundY - 12;
    ball.vy *= -0.32;
    ball.vx *= 0.65;
    ball.bounces += 1;
    const near = Math.hypot(ball.x - targetX, ball.y - hitCenterY) < hitRadius * 1.25;
    if (near) {
      onBallHit(ball.x, ball.y, targetX, hitCenterY, pokeSize);
      return;
    }
    if (ball.bounces >= 2) {
      onBallMiss();
      return;
    }
  }

  if (ball.x < -100 || ball.x > screenW + 100 || ball.y > screenH + 120) {
    onBallMiss();
  }
}

function onBallHit(x, y, targetX, targetY, pokeSize, accuracyDist = null) {
  if (gamePhase !== 'throwing') return;
  const closest = lastLaunch && ball
    ? closestApproachOnFlight(lastLaunch, targetX, targetY, 1.5, THROW_CFG)
    : null;
  const rawDist = closest
    ? closest.dist
    : (accuracyDist != null ? accuracyDist : Math.hypot(x - targetX, y - targetY));
  const centerDist = clamp01(rawDist / (pokeSize * 0.5));
  const ringScale = getRingScale();
  const qualityInfo = qualityFromImpact({ centerDist, ringScale, cfg: THROW_CFG });
  const quality = qualityInfo.quality;
  const curve = isCurve(ball ? ball.spin : 0, THROW_CFG);
  lastHit = { x, y, targetX, targetY, closest, accuracyDist: rawDist, centerDist, ringScale, quality, score: qualityInfo.score };
  lastThrowQuality = quality;
  lastThrowCurve = curve;
  ball = null;
  spawnHitSpark(x, y, curve);
  resolveCatch(quality, curve);
  gamePhase = 'shaking';
  phaseTime = 0;
  shakeTick = -1;
  showThrowFeedback(quality, curve);
}

function onBallMiss() {
  if (gamePhase !== 'throwing') return;
  ball = null;
  catchResult = false;
  lastThrowQuality = 'normal';
  lastThrowCurve = false;
  state.streak = 0;
  state.flown = (state.flown || 0) + 1;
  saveState(state);
  lastCatchData = {
    pokemon: wildPokemon,
    shiny: wildIsShiny,
    cp: wildCP,
    caught: false,
    miss: true,
    quality: 'normal',
    curve: false,
    xpGain: 0,
    berry: selectedBerry,
  };
  gamePhase = 'result';
  phaseTime = 0;
  showResult(false);
  showThrowFeedback('miss', false);
  playCatchSound(false);
  haptic([40, 50, 40]);
  recordRun('miss');
}

function spawnHitSpark(x, y, curve) {
  const colors = curve ? ['#9d8fff', '#ffd166', '#ffffff'] : ['#ffffff', '#ffd166', '#7c6cf0'];
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1,
      life: 1,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function showThrowFeedback(kind, curve) {
  const el = document.getElementById('throw-feedback');
  if (!el) return;
  const labels = {
    excellent: t('Excellent'),
    great: t('Great'),
    nice: t('Nice'),
    normal: t('Normal'),
    miss: t('Miss'),
  };
  el.textContent = (labels[kind] || t('Normal')) + (curve ? ' · ' + t('Curveball') : '');
  el.className = 'throw-feedback'
    + (kind === 'excellent' ? ' excellent' : kind === 'great' ? ' great' : kind === 'miss' ? ' miss' : '')
    + (curve ? ' curve' : '');
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(showThrowFeedback._timer);
  showThrowFeedback._timer = setTimeout(() => el.classList.add('hidden'), 1100);
}

function updateThrowHUD() {
  const fill = document.getElementById('power-fill');
  const hint = document.getElementById('throw-hint');
  const badge = document.getElementById('curve-badge');
  const aiming = gamePhase === 'grabbing' || gamePhase === 'charging';
  if (fill) fill.style.width = (aiming ? Math.round(throwInput.power * 100) : 0) + '%';
  if (hint) hint.textContent = aiming ? t('Release to throw') : t('Hold & drag up · circle to curve');
  if (badge) badge.classList.toggle('on', isCurve(throwInput.spin, THROW_CFG));
}

/* ================== CATCH RESOLUTION ================== */
function resolveCatch(throwQuality = 'normal', curve = false) {
  const p = wildPokemon;
  const ballMult = CONFIG.pokeballs[selectedBall].multiplier;
  let berryMult = 1;
  if (selectedBerry === 'razz') berryMult = 1.5;
  if (selectedBerry === 'golden') berryMult = 2.5;
  if (selectedBerry === 'nanab') berryMult = 1.1;

  const rate = catchRate({
    difficulty: p.difficulty,
    ballMult,
    berryMult,
    quality: throwQuality,
    curve,
    masterGuaranteed: THROW_CFG.masterGuaranteed,
    cfg: THROW_CFG,
  });
  catchResult = Math.random() < rate;
  shakeNeeded = 3;

  const iv = catchResult ? [randInt(16), randInt(16), randInt(16)] : null;
  if (iv) {
    const ivAvg = iv.reduce((a, b) => a + b, 0) / 3;
    wildCP = Math.floor(wildCP * (1 + ivAvg / 90));
  }

  let xpGain = xpForThrow(throwQuality, curve, THROW_CFG);
  if (wildIsShiny) xpGain *= 2;
  if (catchResult) xpGain += 50;

  lastCatchData = {
    pokemon: p, shiny: wildIsShiny, cp: wildCP, caught: catchResult, iv,
    quality: throwQuality, curve, rate, xpGain, berry: selectedBerry,
  };

  if (catchResult) {
    const critical = Math.random() < 0.01;
    lastCatchData.critical = critical;
    shakeNeeded = critical ? 1 : 3;
    if (critical) state.criticalCaptures = (state.criticalCaptures || 0) + 1;
    state.streak = (state.streak || 0) + 1;
    const streakBonus = Math.min(state.streak, 10);
    xpGain = Math.floor(xpGain * (1 + streakBonus * 0.1));
    lastCatchData.xpGain = xpGain;

    state.caught.push({
      uid: newUid(),
      id: p.id,
      cp: wildCP,
      iv,
      shiny: wildIsShiny,
      date: Date.now(),
      ball: selectedBall,
      quality: throwQuality,
      curve,
    });
    state.xp += xpGain;
    state.level = levelForXp(state.xp, CONFIG.levels);
    const candyKey = p.id;
    inventory.candy[candyKey] = (inventory.candy[candyKey] || 0) + (selectedBerry === 'pinap' ? 6 : 3);
    inventory.stardust += 100 + p.difficulty * 20;
    if (curve) state.curveballs = (state.curveballs || 0) + 1;
    saveInventory(inventory);
    saveState(state);
    // Buddy affinity
    if (state.buddy && state.buddy.id === p.id) {
      const prev = state.buddy.affinity || 0;
      state.buddy.affinity = Math.min(100, prev + 1);
      const milestones = [25, 50, 75, 100].filter((m) => prev < m && state.buddy.affinity >= m);
      if (milestones.length) {
        inventory.candy[p.id] = (inventory.candy[p.id] || 0) + milestones.length;
        saveInventory(inventory);
      }
      saveState(state);
    }
    tryAddEgg();
    playCatchSound(true);
    recordRun('catch', {
      quality: throwQuality,
      curve,
      shiny: wildIsShiny,
      cp: wildCP,
      species: p.id,
    });
  } else {
    state.streak = 0;
    state.flown = (state.flown || 0) + 1;
    playCatchSound(false);
    recordRun('flee', { quality: throwQuality, curve, species: p.id });
  }

  if (throwQuality === 'great') state.greatThrows = (state.greatThrows || 0) + 1;
  if (throwQuality === 'excellent') state.excellentThrows = (state.excellentThrows || 0) + 1;
  saveState(state);

  walkEggs(0.05);

  if (selectedBerry) {
    inventory[selectedBerry] = (inventory[selectedBerry] || 0) - 1;
    if (inventory[selectedBerry] < 0) inventory[selectedBerry] = 0;
    selectedBerry = null;
    saveInventory(inventory);
    renderInventory();
  }

  updateQuestProgress('throw', { quality: throwQuality, curve });
  if (catchResult) {
    updateQuestProgress('catch', { types: p.types, shiny: wildIsShiny, streak: state.streak });
  }
  updateTopBar();
}

function showResult(caught) {
  const modal = document.getElementById('result-modal');
  const data = lastCatchData;
  if (!data || !modal) return;

  const title = modal.querySelector('.rm-title');
  const body = modal.querySelector('.rm-body');
  const btn = modal.querySelector('.rm-btn');

  if (caught) {
    title.textContent = t('Gotcha!') + (data.shiny ? ' ✨' : '');
    title.style.color = '#81c784';
    body.innerHTML = `
      <img src="${artworkUrl(data.pokemon, data.shiny) || ''}" alt=""
           onerror="this.style.display='none'"
           style="width:130px;height:130px;object-fit:contain;display:block;margin:0.3rem auto 0;">
      <div style="font-size:2rem;margin:0.3rem 0;">${data.shiny ? '✨ ' : ''}${data.pokemon.name[tLang()]}</div>
      <div style="color:var(--accent-light);font-size:1.1rem;">${t('CP')} ${data.cp}</div>
      <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem;">${t(data.quality + ' throw')}${data.curve ? ' · ' + t('Curveball') : ''} · +${data.xpGain} XP</div>
      ${data.shiny ? '<div style="color:#ffd700;margin-top:0.3rem;font-size:0.9rem;">✨ SHINY ✨</div>' : ''}
      ${data.critical ? '<div style="color:#06d6a0;margin-top:0.3rem;font-size:0.9rem;">' + t('Critical capture!') + '</div>' : ''}
    `;
    btn.textContent = t('Continue');
    triggerComboOverlay();
  } else {
    const missed = !!data.miss;
    title.textContent = t(missed ? 'Missed!' : 'Oh no! The Pokémon broke free!');
    title.style.color = '#e57373';
    body.innerHTML = `
      <img src="${artworkUrl(data.pokemon) || ''}" alt=""
           onerror="this.style.display='none'"
           style="width:100px;height:100px;object-fit:contain;display:block;margin:0.3rem auto 0;opacity:0.85;">
      <div style="font-size:2rem;margin:0.3rem 0;">${data.pokemon.name[tLang()]}</div>
      <div style="color:var(--text-secondary);font-size:0.9rem;">${t(missed ? 'The ball missed. Aim with the dotted arc!' : 'It was too strong... Try a better ball or berry!')}</div>
    `;
    btn.textContent = t('Try Again');
  }

  modal.classList.remove('hidden');
  updateTopBar();
}

window.closeResult = function () {
  document.getElementById('result-modal').classList.add('hidden');
  spawnWildPokemon();
};
window.spawnWildPokemon = spawnWildPokemon;

/* ================== AUDIO + HAPTICS + STATS ================== */
function getAudio() {
  if (!settings.sound) return null;
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function resumeAudio() {
  getAudio();
}

function tone(freq, duration, type = 'sine', delay = 0, gain = 0.12) {
  const ac = getAudio();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime + delay);
    g.gain.setValueAtTime(gain, ac.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    o.start(ac.currentTime + delay);
    o.stop(ac.currentTime + delay + duration);
  } catch (e) {}
}

function playThrowSound() {
  const ac = getAudio();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(520, ac.currentTime + 0.18);
    g.gain.setValueAtTime(0.09, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    o.start();
    o.stop(ac.currentTime + 0.22);
  } catch (e) {}
}

function playShakeTick() {
  tone(880, 0.06, 'square', 0, 0.07);
}

function playCatchSound(success) {
  if (!settings.sound) return;
  if (success) {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', i * 0.12, 0.12));
  } else {
    tone(240, 0.6, 'sine', 0, 0.1);
    tone(160, 0.5, 'sine', 0.08, 0.06);
  }
}

function haptic(pattern) {
  if (!settings.haptics) return;
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); return; } catch (e) {}
  }
  if (window.R2 && typeof window.R2.buzz === 'function') window.R2.buzz(pattern);
}

function recordEvent(name, value = 1) {
  try {
    if (window.R2 && window.R2.stats && window.R2.stats.event) {
      window.R2.stats.event('pokemon-go-pwa-v2', name, value);
    }
  } catch (e) {}
}

function recordRun(outcome, meta = {}) {
  try {
    if (!window.R2 || !window.R2.stats || !window.R2.stats.run) return;
    window.R2.stats.run({
      slug: 'pokemon-go-pwa-v2',
      score: state.caught.length,
      durMs: Date.now() - sessionStart,
      outcome,
      meta,
    });
  } catch (e) {}
}

/* ================== QUEST SYSTEM ================== */
const QUEST_TEMPLATES = [
  { id:'catch_any', type:'catch', target:3, label:{en:'Catch 3 Pokémon', it:'Cattura 3 Pokémon'}, reward:{stardust:500, xp:200}, icon:'🎯' },
  { id:'catch_type_water', type:'catch_type', targetType:'water', target:2, label:{en:'Catch 2 Water Pokémon', it:'Cattura 2 Pokémon Acqua'}, reward:{stardust:400, razz:5}, icon:'💧' },
  { id:'catch_type_fire', type:'catch_type', targetType:'fire', target:2, label:{en:'Catch 2 Fire Pokémon', it:'Cattura 2 Pokémon Fuoco'}, reward:{stardust:400, pinap:3}, icon:'🔥' },
  { id:'throw_great', type:'throw_great', target:3, label:{en:'3 Great Throws', it:'3 Lanci Ottimi'}, reward:{stardust:300, xp:300}, icon:'🎾' },
  { id:'throw_curve', type:'throw_curve', target:2, label:{en:'2 Curveballs', it:'2 Curveball'}, reward:{stardust:500, xp:200}, icon:'🌀' },
  { id:'streak', type:'streak', target:3, label:{en:'Catch streak of 3', it:'Serie di 3 catture'}, reward:{stardust:600, golden:1}, icon:'🔥' },
  { id:'catch_shiny', type:'catch_shiny', target:1, label:{en:'Catch a Shiny', it:'Cattura uno Shiny'}, reward:{stardust:1000, xp:500}, icon:'✨' },
];

function checkQuestReset() {
  const today = new Date().toDateString();
  if (state.lastQuestDate !== today) {
    state.lastQuestDate = today;
    const shuffled = QUEST_TEMPLATES.sort(() => Math.random() - 0.5);
    state.quests = shuffled.slice(0, 3).map(t => ({
      id: t.id,
      progress: 0,
      completed: false,
      claimed: false,
      target: t.target,
      targetType: t.targetType || null,
      label: t.label,
      reward: t.reward,
      icon: t.icon,
    }));
    saveState(state);
  }
}

function updateQuestProgress(type, detail) {
  let changed = false;
  for (const q of state.quests || []) {
    if (q.completed) continue;
    if (type === 'catch' && q.type === 'catch') {
      q.progress = Math.min(q.target, q.progress + 1);
      if (q.progress >= q.target) q.completed = true;
      changed = true;
    }
    if (type === 'catch' && q.type === 'catch_type') {
      if (detail.types && detail.types.includes(q.targetType)) {
        q.progress = Math.min(q.target, q.progress + 1);
        if (q.progress >= q.target) q.completed = true;
        changed = true;
      }
    }
    if (type === 'throw' && q.type === 'throw_great') {
      if (detail.quality === 'great' || detail.quality === 'excellent') {
        q.progress = Math.min(q.target, q.progress + 1);
        if (q.progress >= q.target) q.completed = true;
        changed = true;
      }
    }
    if (type === 'throw' && q.type === 'throw_curve') {
      if (detail.curve) {
        q.progress = Math.min(q.target, q.progress + 1);
        if (q.progress >= q.target) q.completed = true;
        changed = true;
      }
    }
    if (type === 'catch' && q.type === 'streak') {
      if (detail.streak >= q.target) {
        q.progress = q.target;
        q.completed = true;
        changed = true;
      }
    }
    if (type === 'catch' && q.type === 'catch_shiny') {
      if (detail.shiny) {
        q.progress = Math.min(q.target, q.progress + 1);
        if (q.progress >= q.target) q.completed = true;
        changed = true;
      }
    }
  }
  if (changed) {
    saveState(state);
    renderResearch();
  }
}

function renderResearch() {
  const el = document.getElementById('research-grid');
  if (!el) return;
  if (!state.quests || state.quests.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-secondary);padding:2rem 1rem;">${t('No active research.')}</div>`;
    return;
  }
  el.innerHTML = '';
  state.quests.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'research-card' + (q.completed ? ' completed' : '');
    const pct = Math.min(1, q.progress / q.target) * 100;
    const rew = [];
    if (q.reward.xp) rew.push(`${q.reward.xp} XP`);
    if (q.reward.stardust) rew.push(`✨ ${q.reward.stardust}`);
    if (q.reward.razz) rew.push(`🍓 x${q.reward.razz}`);
    if (q.reward.pinap) rew.push(`🍍 x${q.reward.pinap}`);
    if (q.reward.golden) rew.push(`🌟 x${q.reward.golden}`);
    card.innerHTML = `
      <div class="re-search-icon">${q.icon || '📋'}</div>
      <div class="re-search-body">
        <div class="re-search-title">${q.label[tLang()]}</div>
        <div class="re-search-progress">${q.progress} / ${q.target} · ${t('Reward')}: ${rew.join(', ')}</div>
        <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:6px;overflow:hidden;"><div style="height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));width:${pct}%;transition:width 0.4s;"></div></div>
      </div>
      ${q.completed ? `<button class="re-search-btn" ${q.claimed ? 'disabled' : ''} onclick="window.claimQuest(${i})">${q.claimed ? t('Claimed') : t('Claim')}</button>` : ''}
    `;
    el.appendChild(card);
  });
}

window.claimQuest = function(idx) {
  const q = state.quests[idx];
  if (!q || !q.completed || q.claimed) return;
  q.claimed = true;
  if (q.reward.xp) state.xp += q.reward.xp;
  if (q.reward.stardust) inventory.stardust += q.reward.stardust;
  if (q.reward.razz) inventory.razz += q.reward.razz;
  if (q.reward.pinap) inventory.pinap += q.reward.pinap;
  if (q.reward.golden) inventory.golden += q.reward.golden;
  state.level = levelForXp(state.xp, CONFIG.levels);
  saveState(state);
  saveInventory(inventory);
  renderResearch();
  renderLoadout();
  updateTopBar();
  if (currentTab === 'trainer') renderTrainer();
};

/* ================== IV / BUDDY / EGG HELPERS ================== */
function randInt(n) { return Math.floor(Math.random() * n); }
function ivPercent(iv) { return iv ? Math.round((iv[0]+iv[1]+iv[2])/45*100) : 0; }
function ivBars(iv) {
  if (!iv) return '';
  const pct = ivPercent(iv);
  const cls = pct >= 80 ? 'iv-high' : pct >= 50 ? 'iv-mid' : 'iv-low';
  return `<div class="iv-wrap">${iv.map((v,i) => `<div class="iv-bar ${cls}" style="--h:${Math.max(4, v*1.2)+4}px" title="IV ${i+1}"></div>`).join('')}<div class="iv-label">${pct}%</div></div>`;
}

function setBuddy(id) {
  if (!state.caught.some((c) => c.id === id)) return;
  state.buddy = { id, affinity: state.buddy?.id === id ? (state.buddy.affinity || 0) : 0 };
  saveState(state);
  refreshVisible();
}
window.setBuddy = setBuddy;

function tryAddEgg() {
  if ((state.eggs || []).length >= 9) return;
  const roll = Math.random();
  let km = 2;
  if (roll < 0.25) km = 10;
  else if (roll < 0.55) km = 5;
  state.eggs = state.eggs || [];
  state.eggs.push({ km, progress: 0, acquired: Date.now() });
  saveState(state);
}

function walkEggs(km) {
  if (!state.eggs || !state.eggs.length) return;
  let hatched = false;
  state.eggs.forEach(e => {
    e.progress = (e.progress || 0) + km;
    if (e.progress >= e.km && !e.hatched) {
      e.hatched = true;
      hatched = true;
    }
  });
  saveState(state);
  if (hatched && currentTab === 'trainer') renderTrainer();
}

function hatchEgg(idx) {
  const egg = state.eggs[idx];
  if (!egg || !egg.hatched || egg.claimed) return;
  egg.claimed = true;
  const pick = pickEggSpecies(CONFIG.pokedex, egg.km, { isLegendaryFn: (p) => CONFIG.isLegendary(p) }) || CONFIG.pokedex[0];
  const shiny = Math.random() < CONFIG.shinyChance;
  const iv = [randInt(16), randInt(16), randInt(16)];
  const ivAvg = iv.reduce((a, b) => a + b, 0) / 3;
  const cp = Math.floor((10 + pick.difficulty * 25) * (1 + ivAvg / 90) * (1 + Math.random() * 0.5));
  state.caught.push({ uid: newUid(), id: pick.id, cp, iv, shiny, date: Date.now(), ball: 'poke', quality: 'egg', curve: false });
  recordRun('hatch', { species: pick.id, shiny, km: egg.km });
  if (!state.seen.includes(pick.id)) state.seen.push(pick.id);
  state.eggs.splice(idx, 1);
  saveState(state);
  // modal hatch
  const modal = document.getElementById('result-modal');
  const title = modal.querySelector('.rm-title');
  const body = modal.querySelector('.rm-body');
  const btn = modal.querySelector('.rm-btn');
  title.textContent = t('Oh?') + ' 🥚';
  title.style.color = '#ffd700';
  body.innerHTML = `
    <img src="${artworkUrl(pick, shiny) || ''}" alt="" onerror="this.style.display='none'"
         style="width:130px;height:130px;object-fit:contain;display:block;margin:0.3rem auto 0;">
    <div style="font-size:2rem;margin:0.3rem 0;">${shiny ? '✨ ' : ''}${pick.name[tLang()]}</div>
    <div style="color:var(--accent-light);font-size:1.1rem;">${t('CP')} ${cp}</div>
    ${shiny ? '<div style="color:#ffd700;margin-top:0.3rem;font-size:0.9rem;">✨ SHINY ✨</div>' : ''}
  `;
  btn.textContent = t('Continue');
  modal.classList.remove('hidden');
  refreshVisible();
}
window.hatchEgg = hatchEgg;

/* ================== SPIN ================== */
const SPIN_COOLDOWN = 5 * 60 * 1000;
window.doSpin = function() {
  const now = Date.now();
  if (now - (state.spinLast || 0) < SPIN_COOLDOWN) {
    const left = Math.ceil((SPIN_COOLDOWN - (now - state.spinLast))/1000);
    showToast(t('Spin cooldown') + ': ' + left + 's', 2000);
    return;
  }
  const btn = document.querySelector('.spin-btn');
  if (btn) btn.classList.add('spinning');
  setTimeout(() => btn && btn.classList.remove('spinning'), 600);
  state.spinLast = now;
  saveState(state);
  // loot
  const loot = [];
  const add = (n) => { const r = Math.floor(Math.random()*n)+1; return r; };
  const pb = add(3); inventory.pokeballs += pb; loot.push(`${pb} Poké Ball`);
  if (Math.random() < 0.35) { const gb = add(2); inventory.greatballs += gb; loot.push(`${gb} Great Ball`); }
  if (Math.random() < 0.15) { const ub = 1; inventory.ultraballs += ub; loot.push(`${ub} Ultra Ball`); }
  if (Math.random() < 0.5) { const rz = add(2); inventory.razz += rz; loot.push(`${rz} Razz Berry`); }
  if (Math.random() < 0.3) { const nb = 1; inventory.nanab += nb; loot.push(`${nb} Nanab Berry`); }
  const st = 100 + randInt(201); inventory.stardust += st; loot.push(`✨ ${st}`);
  if ((state.eggs||[]).length < 9 && Math.random() < 0.6) {
    let km = 2; const r = Math.random();
    if (r < 0.2) km = 10; else if (r < 0.5) km = 5;
    state.eggs = state.eggs || [];
    state.eggs.push({ km, progress: 0, acquired: Date.now() });
    loot.push(`${km}km ${t('Egg')}`);
  }
  saveInventory(inventory);
  saveState(state);
  updateTopBar(); renderInventory(); renderLoadout();
  if (currentTab === 'trainer') renderTrainer();
  playCatchSound(true);
  showToast('🌀 ' + loot.join(' · '), 3500);
};

/* ================== UI RENDERING ================== */
const dexGenOf = (p) => p.gen || 1;
let dexGenFilter = localStorage.getItem('pokemon-dexgen') || '1';
let dexPage = 1;
const DEX_PAGE_SIZE = 48;

function renderPokedex() {
  const container = document.getElementById('pokedex-grid');
  if (!container) return;
  container.innerHTML = '';

  // Type filter
  const filterWrap = document.getElementById('pokedex-filters');
  if (filterWrap) {
    filterWrap.innerHTML = '';
    const typeKeys = Object.keys(CONFIG.types);
    const allBtn = document.createElement('button');
    allBtn.className = 'type-chip' + (typeFilter === 'all' ? ' active' : '');
    allBtn.textContent = t('All');
    allBtn.onclick = () => { typeFilter = 'all'; dexPage = 1; renderPokedex(); };
    filterWrap.appendChild(allBtn);
    for (const tk of typeKeys) {
      const btn = document.createElement('button');
      btn.className = 'type-chip' + (typeFilter === tk ? ' active' : '');
      btn.textContent = CONFIG.types[tk][tLang()];
      btn.style.color = typeFilter === tk ? '#fff' : CONFIG.types[tk].color;
      btn.onclick = () => { typeFilter = tk; dexPage = 1; renderPokedex(); };
      filterWrap.appendChild(btn);
    }
  }

  const genWrap = document.getElementById('pokedex-gen');
  if (genWrap) {
    genWrap.innerHTML = '';
    const options = [['1','Gen 1'],['2','Gen 2'],['3','Gen 3'],['4','Gen 4'],['5','Gen 5'],['6','Gen 6'],['7','Gen 7'],['8','Gen 8'],['9','Gen 9'],['all', t('All')]];
    for (const [val, label] of options) {
      const btn = document.createElement('button');
      btn.className = 'gen-btn' + (dexGenFilter === val ? ' active' : '');
      btn.textContent = label;
      btn.onclick = () => {
        dexGenFilter = val;
        dexPage = 1;
        localStorage.setItem('pokemon-dexgen', val);
        renderPokedex();
      };
      genWrap.appendChild(btn);
    }
  }

  let lista = dexGenFilter === 'all'
    ? CONFIG.pokedex
    : CONFIG.pokedex.filter(p => dexGenOf(p) === +dexGenFilter);
  if (typeFilter !== 'all') lista = lista.filter(p => p.types.includes(typeFilter));

  const caughtBySpecies = new Map();
  for (const c of state.caught) {
    if (!c || !c.id) continue;
    if (!caughtBySpecies.has(c.id)) caughtBySpecies.set(c.id, []);
    caughtBySpecies.get(c.id).push(c);
  }
  const seenSet = new Set(state.seen || []);
  const visible = lista.slice(0, dexPage * DEX_PAGE_SIZE);

  visible.forEach(p => {
    const instances = caughtBySpecies.get(p.id) || [];
    const isCaught = instances.length > 0;
    const isSeen = seenSet.has(p.id);
    const caughtCount = instances.length;
    const candyCount = inventory.candy[p.id] || 0;

    const card = document.createElement('div');
    card.className = 'pd-card' + (isCaught ? ' caught' : isSeen ? ' seen' : '');
    card.style.cursor = isCaught || isSeen ? 'pointer' : 'default';

    const typeHtml = p.types.map(t =>
      `<span class="type-tag" style="background:${CONFIG.types[t].color}22;color:${CONFIG.types[t].color};border:1px solid ${CONFIG.types[t].color}44;">${CONFIG.types[t][tLang()]}</span>`
    ).join('');

    const lastCatch = instances.length ? instances[instances.length - 1] : null;
    const anyShiny = instances.some(c => c.shiny);
    const buddySet = state.buddy && state.buddy.id === p.id;
    if (isCaught || isSeen) card.onclick = () => window.openDetail(lastCatch ? lastCatch.uid : p.id);

    card.innerHTML = `
      <div class="pd-sprite" id="sprite-${p.id}"></div>
      <div class="pd-name">${isCaught || isSeen ? p.name[tLang()] : '???'}</div>
      <div class="pd-types">${typeHtml}</div>
      <div class="pd-meta">
        <span>${t('Caught')}: ${caughtCount}</span>
        <span>🍬 ${candyCount}</span>
        ${anyShiny ? '<span style="color:#ffd700;">✨</span>' : ''}
      </div>
      ${lastCatch && lastCatch.iv ? ivBars(lastCatch.iv) : ''}
      ${p.candyToEvolve && isCaught ? `<div class="pd-evolve${candyCount >= p.candyToEvolve ? ' ready' : ''}"${candyCount >= p.candyToEvolve ? ` onclick="window.evolvePokemon('${lastCatch ? lastCatch.uid : p.id}');event.stopPropagation();" style="cursor:pointer;"` : ''}>⚡ ${t('Evolves')} (${Math.min(candyCount, p.candyToEvolve)}/${p.candyToEvolve})</div>` : ''}
      ${isCaught && !buddySet ? `<div style="font-size:0.65rem;color:var(--accent-light);margin-top:0.2rem;cursor:pointer;" onclick="window.setBuddy('${p.id}');event.stopPropagation();">❤️ ${t('Set Buddy')}</div>` : ''}
      ${buddySet ? `<div style="font-size:0.65rem;color:var(--gold);margin-top:0.2rem;">❤️ ${t('Buddy')}</div>` : ''}
    `;
    container.appendChild(card);

    const wrap = document.getElementById(`sprite-${p.id}`);
    if (wrap) {
      if (isCaught || isSeen) {
        const img = document.createElement('img');
        img.alt = p.name[tLang()];
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.width = '76px';
        img.style.height = '76px';
        img.style.objectFit = 'contain';
        img.style.filter = isCaught ? 'none' : 'brightness(0) opacity(0.5)';
        img.onerror = () => {
          img.remove();
          const cvs = document.createElement('canvas');
          cvs.width = 80; cvs.height = 80;
          wrap.appendChild(cvs);
          drawLowPolyPokemon(cvs.getContext('2d'), p, 40, 45, 50, 0, false);
        };
        img.src = artworkUrl(p) || '';
        wrap.appendChild(img);
      } else {
        const cvs = document.createElement('canvas');
        cvs.width = 80; cvs.height = 80;
        wrap.appendChild(cvs);
        const c = cvs.getContext('2d');
        c.fillStyle = '#333';
        c.beginPath(); c.arc(40, 40, 20, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#555';
        c.font = '10px sans-serif';
        c.textAlign = 'center';
        c.fillText('???', 40, 44);
      }
    }
  });

  if (lista.length > visible.length) {
    const more = document.createElement('button');
    more.className = 'show-more-btn';
    more.textContent = t('Show more') + ' (' + (lista.length - visible.length) + ')';
    more.onclick = () => { dexPage += 1; renderPokedex(); };
    container.appendChild(more);
  }

  const count = document.getElementById('pokedex-count');
  if (count) {
    count.textContent = t('Caught') + ': ' + caughtBySpecies.size + ' / ' + CONFIG.pokedex.length +
      ' · ' + t('Seen') + ': ' + seenSet.size;
  }
}

let collectionFilter = 'recent';
let collectionPage = 1;
const COLLECTION_PAGE_SIZE = 36;

function renderCollection() {
  const container = document.getElementById('collection-grid');
  if (!container) return;
  container.innerHTML = '';

  const filterWrap = document.getElementById('collection-filters');
  if (filterWrap) {
    filterWrap.innerHTML = '';
    const opts = [
      ['recent', t('Recent')],
      ['all', t('All')],
      ['shiny', '✨ Shiny'],
      ['cp', 'CP'],
      ['iv', 'IV'],
    ];
    for (const [key, label] of opts) {
      const btn = document.createElement('button');
      btn.className = 'cl-filter-btn' + (collectionFilter === key ? ' active' : '');
      btn.textContent = label;
      btn.onclick = () => { collectionFilter = key; collectionPage = 1; renderCollection(); };
      filterWrap.appendChild(btn);
    }
  }

  let list = [...state.caught];
  if (collectionFilter === 'shiny') list = list.filter(c => c.shiny);
  const ivOf = (c) => c.iv ? (c.iv[0] + c.iv[1] + c.iv[2]) / 45 : 0;
  if (collectionFilter === 'cp') list.sort((a, b) => (b.cp || 0) - (a.cp || 0));
  else if (collectionFilter === 'iv') list.sort((a, b) => ivOf(b) - ivOf(a));
  else list.sort((a, b) => (b.date || 0) - (a.date || 0));
  const visible = list.slice(0, collectionPage * COLLECTION_PAGE_SIZE);

  visible.forEach(c => {
    const p = CONFIG.byId(c.id);
    if (!p) return;
    const card = document.createElement('div');
    card.className = 'cl-card' + (c.shiny ? ' shiny-card' : '');
    card.onclick = () => window.openDetail(c.uid || c.id);

    const ivPct = c.iv ? Math.round((c.iv[0] + c.iv[1] + c.iv[2]) / 45 * 100) : 0;
    const ballIcons = { poke: '🔴', great: '🔵', ultra: '🟡', master: '🟣' };
    const d = new Date(c.date);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    card.innerHTML = `
      ${c.shiny ? '<div class="cl-badge">✨ SHINY</div>' : ''}
      <div class="cl-sprite"><img src="${artworkUrl(p, c.shiny) || ''}" onerror="this.style.display='none'" alt=""></div>
      <div class="cl-name">${p.name[tLang()]} ${c.shiny ? '✨' : ''}</div>
      <div class="cl-cp">CP ${c.cp}</div>
      <div class="cl-meta">IV ${ivPct}% · ${ballIcons[c.ball] || '🔴'}${c.curve ? ' · 🌀' : ''}</div>
      <div class="cl-date">${dateStr}</div>
    `;
    container.appendChild(card);
  });

  if (list.length > visible.length) {
    const more = document.createElement('button');
    more.className = 'show-more-btn';
    more.textContent = t('Show more') + ' (' + (list.length - visible.length) + ')';
    more.onclick = () => { collectionPage += 1; renderCollection(); };
    container.appendChild(more);
  }

  const count = document.getElementById('collection-count');
  if (count) {
    const unici = new Set(state.caught.map(c => c.id)).size;
    const shinyCount = state.caught.filter(c => c.shiny).length;
    count.textContent = `${t('Owned')}: ${state.caught.length} · ${t('Unique')}: ${unici} · ✨ ${shinyCount}`;
  }
}

function renderInventory() {
  const container = document.getElementById('inventory-grid');
  if (!container) return;
  container.innerHTML = '';

  const balls = [
    { key: 'poke', icon: '🔴', count: inventory.pokeballs },
    { key: 'great', icon: '🔵', count: inventory.greatballs },
    { key: 'ultra', icon: '🟡', count: inventory.ultraballs },
    { key: 'master', icon: '🟣', count: inventory.masterballs },
  ];
  const berries = [
    { key: 'razz', icon: '🍓', count: inventory.razz },
    { key: 'nanab', icon: '🍌', count: inventory.nanab },
    { key: 'pinap', icon: '🍍', count: inventory.pinap },
    { key: 'golden', icon: '🌟', count: inventory.golden },
  ];

  const bSec = document.createElement('div');
  bSec.className = 'inv-section';
  bSec.innerHTML = `<h4>${t('Poké Balls')}</h4><div class="inv-row"></div>`;
  const bRow = bSec.querySelector('.inv-row');
  balls.forEach(b => {
    const el = document.createElement('div');
    el.className = 'inv-item' + (selectedBall === b.key ? ' active' : '');
    el.innerHTML = `<div class="inv-icon">${b.icon}</div><div class="inv-count">x${b.count}</div><div class="inv-label">${CONFIG.pokeballs[b.key][tLang()]}</div>`;
    el.onclick = () => selectBall(b.key);
    bRow.appendChild(el);
  });
  container.appendChild(bSec);

  const beSec = document.createElement('div');
  beSec.className = 'inv-section';
  beSec.innerHTML = `<h4>${t('Berries')}</h4><div class="inv-row"></div>`;
  const beRow = beSec.querySelector('.inv-row');
  berries.forEach(b => {
    const el = document.createElement('div');
    el.className = 'inv-item' + (selectedBerry === b.key ? ' active' : '');
    el.innerHTML = `<div class="inv-icon">${b.icon}</div><div class="inv-count">x${b.count}</div><div class="inv-label">${CONFIG.berries[b.key][tLang()]}</div>`;
    el.onclick = () => selectBerry(b.key);
    beRow.appendChild(el);
  });
  container.appendChild(beSec);

  const sum = document.createElement('div');
  sum.className = 'inv-summary';
  sum.innerHTML = `<span>✨ ${t('Stardust')}: ${inventory.stardust.toLocaleString()}</span>`;
  container.appendChild(sum);
  renderLoadout();
}

function renderTrainer() {
  const progress = xpProgress(state.xp, CONFIG.levels);
  const lvl = progress.level;
  const xpNext = progress.next;
  const xpProg = progress.pct;

  const el = document.getElementById('trainer-panel');
  if (!el) return;
  el.innerHTML = `
    <div class="trainer-card">
      <div class="trainer-avatar">
        <canvas id="avatar-canvas" width="80" height="80"></canvas>
      </div>
      <div class="trainer-info">
        <div class="trainer-level">${t('Level')} ${lvl}</div>
        <div class="trainer-xp-bar"><div class="trainer-xp-fill" style="width:${xpProg * 100}%"></div></div>
        <div class="trainer-xp-text">${state.xp.toLocaleString()} / ${xpNext.toLocaleString()} XP</div>
      </div>
    </div>
    <div class="trainer-stats">
      <div class="stat-box"><div class="stat-num">${state.caught.length}</div><div class="stat-label">${t('Caught')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.seen.length}</div><div class="stat-label">${t('Seen')}</div></div>
      <div class="stat-box"><div class="stat-num">${(state.greatThrows || 0) + (state.excellentThrows || 0)}</div><div class="stat-label">${t('Great+')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.totalThrows || 0}</div><div class="stat-label">${t('Throws')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.flown || 0}</div><div class="stat-label">${t('Fled')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.caught.filter(c => c.shiny).length}</div><div class="stat-label">✨ ${t('Shiny')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.curveThrows || 0}</div><div class="stat-label">🌀 ${t('Curveball')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.streak || 0}</div><div class="stat-label">${t('Streak')}</div></div>
      <div class="stat-box"><div class="stat-num">${state.transferred || 0}</div><div class="stat-label">${t('Transferred')}</div></div>
    </div>
    <div class="badge-row">
      ${lvl>=5?'<span class="badge gold">Lv.5</span>':''}
      ${lvl>=10?'<span class="badge gold">Lv.10</span>':''}
      ${lvl>=20?'<span class="badge purple">Lv.20</span>':''}
      ${state.caught.filter(c=>c.shiny).length>=5?'<span class="badge gold">5✨</span>':''}
      ${state.caught.length>=50?'<span class="badge purple">50★</span>':''}
    </div>
    ${state.buddy ? (() => { const bp = CONFIG.byId(state.buddy.id); return `<div class="buddy-card">
      <div class="buddy-sprite"><img src="${artworkUrl(bp) || ''}" onerror="this.style.display='none'"></div>
      <div class="buddy-info">
        <div class="buddy-name">${bp ? bp.name[tLang()] : '?'}</div>
        <div class="buddy-aff">${t('Affinity')}: ${state.buddy.affinity || 0}/100</div>
        <div class="buddy-aff-bar"><div class="buddy-aff-fill" style="width:${(state.buddy.affinity || 0)}%"></div></div>
      </div>
    </div>`; })() : ''}
    <div class="egg-section">
      <h4>🥚 ${t('Eggs')} ${(state.eggs||[]).length}/9</h4>
      <div class="egg-row">
        ${(state.eggs||[]).map((e,i) => {
          const pct = Math.min(100, ((e.progress||0)/e.km)*100);
          return `<div class="egg-slot" ${e.hatched ? `onclick="window.hatchEgg(${i})"` : ''}>
            <div class="egg-icon">${e.hatched ? '🐣' : '🥚'}</div>
            <div class="egg-km">${e.hatched ? t('Tap!') : Math.floor((e.progress||0)*10)/10+' / '+e.km+'km'}</div>
            ${!e.hatched ? `<div class="egg-bar"><div class="egg-fill" style="width:${pct}%"></div></div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="trainer-achievements">
      <h4>${t('Achievements')}</h4>
      ${renderAchievement('first-catch', state.caught.length > 0, t('First Catch'), t('Catch your first Pokémon'))}
      ${renderAchievement('ten-caught', state.caught.length >= 10, t('Novice Collector'), t('Catch 10 Pokémon'))}
      ${renderAchievement('shiny', state.caught.filter(c => c.shiny).length > 0, t('Shiny Hunter'), t('Catch a Shiny Pokémon'))}
      ${renderAchievement('excellent', state.excellentThrows > 0, t('Expert Thrower'), t('Land an Excellent throw'))}
      ${renderAchievement('curve', (state.curveThrows || 0) > 0, t('Curveball Rookie'), t('Land a Curveball'))}
      ${renderAchievement('curve-10', (state.curveThrows || 0) >= 10, t('Curveball Master'), t('Land 10 Curveballs'))}
      ${renderAchievement('level-10', lvl >= 10, t('Veteran'), t('Reach level 10'))}
      ${renderAchievement('master-catch', state.caught.some(c => c.ball === 'master'), t('Master Catcher'), t('Catch with a Master Ball'))}
    </div>
  `;
  requestAnimationFrame(() => {
    const ac = document.getElementById('avatar-canvas');
    if (!ac) return;
    const c = ac.getContext('2d');
    drawPolyEllipse(c, 40, 50, 18, 18, 6, '#5c6bc0', 0, 0);
    drawPolyEllipse(c, 40, 30, 14, 14, 5, '#ffcc80', 0, 0);
    drawPolyTri(c, 26, 18, 40, 8, 54, 18, '#3f51b5');
  });
}

function renderAchievement(id, unlocked, title, desc) {
  return `<div class="ach-row${unlocked ? ' unlocked' : ''}">
    <div class="ach-icon">${unlocked ? '★' : '☆'}</div>
    <div class="ach-text"><div class="ach-title">${title}</div><div class="ach-desc">${desc}</div></div>
  </div>`;
}

function renderBiomeSelector() {
  const el = document.getElementById('biome-selector');
  if (!el) return;
  el.innerHTML = '';
  Object.entries(CONFIG.biomes).forEach(([key, b]) => {
    const btn = document.createElement('button');
    btn.className = 'biome-btn' + (currentBiome === key ? ' active' : '');
    btn.textContent = b[tLang()];
    btn.style.background = b.color + '33';
    btn.style.borderColor = b.color + '66';
    btn.onclick = () => {
      currentBiome = key;
      state.currentBiome = key;
      saveState(state);
      spawnWildPokemon();
      renderBiomeSelector();
      generateNearby();
      renderNearbyRadar();
      updateStageUI();
    };
    el.appendChild(btn);
  });
  requestAnimationFrame(() => {
    const active = el.querySelector('.biome-btn.active');
    if (!active) return;
    const left = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: 'smooth' });
    else el.scrollLeft = left;
  });
}

function updateStageUI() {
  const info = document.getElementById('stage-info');
  if (!info || !wildPokemon) return;
  const b = CONFIG.pokeballs[selectedBall];
  const berry = selectedBerry ? CONFIG.berries[selectedBerry] : null;
  let berryMult = 1;
  if (selectedBerry === 'razz') berryMult = 1.5;
  if (selectedBerry === 'golden') berryMult = 2.5;
  if (selectedBerry === 'nanab') berryMult = 1.1;
  const chance = Math.round(catchRate({
    difficulty: wildPokemon.difficulty,
    ballMult: b.multiplier,
    berryMult,
    quality: 'normal',
    curve: false,
    masterGuaranteed: THROW_CFG.masterGuaranteed,
    cfg: THROW_CFG,
  }) * 100);
  info.innerHTML = `
    <div style="font-family:var(--font-display);color:var(--accent-light);font-size:1.1rem;">${wildPokemon.name[tLang()]} ${wildIsShiny ? '✨' : ''}</div>
    <div style="font-size:0.8rem;color:var(--text-secondary);">CP ${wildCP} · ${t('Difficulty')} ${wildPokemon.difficulty}/10 · ${t('Catch chance')} ~${chance}%</div>
    <div style="font-size:0.75rem;color:#666;margin-top:0.2rem;">${b[tLang()]} ${berry ? '+ ' + berry[tLang()] : ''}</div>
  `;
}

function updateTopBar() {
  const bar = document.getElementById('top-bar');
  if (!bar) return;
  bar.innerHTML = `
    <span class="tb-brand">Pokéball GO <span class="v2-badge">v2</span></span>
    <span class="tb-stat">🍬 ${Object.values(inventory.candy).reduce((a,b)=>a+b,0)}</span>
    <span class="tb-stat">✨ ${inventory.stardust.toLocaleString()}</span>
    <span class="tb-stat">🔴 ${inventory.pokeballs + inventory.greatballs + inventory.ultraballs + inventory.masterballs}</span>
    <span class="tb-stat">⭐ Lv.${levelForXp(state.xp, CONFIG.levels)}</span>
  `;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t(key);
    if (value && value !== key) el.textContent = value;
  });
}

function refreshVisible() {
  updateTopBar();
  if (currentTab === 'pokedex') renderPokedex();
  else if (currentTab === 'collection') renderCollection();
  else if (currentTab === 'trainer') renderTrainer();
  else if (currentTab === 'inventory') renderInventory();
  else if (currentTab === 'shop') renderShop();
  else if (currentTab === 'research') renderResearch();
  else if (currentTab === 'catch') { updateStageUI(); updateThrowHUD(); renderLoadout(); }
}

const NAV_MAP = {
  catch: 'catch',
  pokedex: 'pokedex',
  inventory: 'inventory',
  trainer: 'trainer',
  shop: 'more',
  collection: 'more',
  research: 'more',
  settings: 'more',
};

function updateNav(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  const btn = document.getElementById('btn-' + (NAV_MAP[tab] || 'catch'));
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-current', 'page');
  }
}

/* ================== BOTTOM SHEETS + LOADOUT ================== */
const BALL_ITEMS = [
  { key: 'poke', icon: '🔴' },
  { key: 'great', icon: '🔵' },
  { key: 'ultra', icon: '🟡' },
  { key: 'master', icon: '🟣' },
];
const BERRY_ITEMS = [
  { key: 'razz', icon: '🍓' },
  { key: 'nanab', icon: '🍌' },
  { key: 'pinap', icon: '🍍' },
  { key: 'golden', icon: '🌟' },
];

function ballCount(key) { return inventory[key + 'balls'] || 0; }
function berryCount(key) { return inventory[key] || 0; }

function renderLoadout() {
  const ballEl = document.getElementById('loadout-ball');
  const berryEl = document.getElementById('loadout-berry');
  if (!ballEl || !berryEl) return;
  const ball = CONFIG.pokeballs[selectedBall];
  const ballIcon = (BALL_ITEMS.find((b) => b.key === selectedBall) || BALL_ITEMS[0]).icon;
  const bc = ballCount(selectedBall);
  ballEl.innerHTML = `<span>${ballIcon}</span><span>${ball[tLang()]}</span><span class="lc-count">x${bc}</span>`;
  ballEl.classList.toggle('empty', bc <= 0);
  ballEl.setAttribute('aria-label', `${t('Ball')}: ${ball[tLang()]}, ${bc}`);
  if (selectedBerry) {
    const berry = CONFIG.berries[selectedBerry];
    const berryIcon = (BERRY_ITEMS.find((b) => b.key === selectedBerry) || BERRY_ITEMS[0]).icon;
    const rc = berryCount(selectedBerry);
    berryEl.innerHTML = `<span>${berryIcon}</span><span>${berry[tLang()]}</span><span class="lc-count">x${rc}</span>`;
    berryEl.classList.toggle('empty', rc <= 0);
    berryEl.setAttribute('aria-label', `${t('Berry')}: ${berry[tLang()]}, ${rc}`);
  } else {
    berryEl.innerHTML = `<span>🍇</span><span>${t('No berry')}</span>`;
    berryEl.classList.add('empty');
    berryEl.setAttribute('aria-label', t('No berry'));
  }
}

function renderLoadoutSheet() {
  const grid = document.getElementById('loadout-grid');
  if (!grid) return;
  const item = (kind, key, icon, name, count, active) => `
    <button type="button" class="loadout-item${active ? ' active' : ''}" data-kind="${kind}" data-key="${key}" ${count <= 0 ? 'disabled' : ''}>
      <span class="li-icon">${icon}</span>
      <span class="li-name">${name}</span>
      <span class="li-count">x${count}</span>
    </button>`;
  const balls = BALL_ITEMS.map((b) =>
    item('ball', b.key, b.icon, CONFIG.pokeballs[b.key][tLang()], ballCount(b.key), selectedBall === b.key)
  ).join('');
  const berries = BERRY_ITEMS.map((b) =>
    item('berry', b.key, b.icon, CONFIG.berries[b.key][tLang()], berryCount(b.key), selectedBerry === b.key)
  ).join('');
  const noBerry = `
    <button type="button" class="loadout-item${selectedBerry === null ? ' active' : ''}" data-kind="berry" data-key="">
      <span class="li-icon">🚫</span>
      <span class="li-name">${t('No berry')}</span>
      <span class="li-count">—</span>
    </button>`;
  grid.innerHTML = `
    <div class="loadout-section">
      <h4>${t('Poké Balls')}</h4>
      <div class="loadout-row">${balls}</div>
    </div>
    <div class="loadout-section">
      <h4>${t('Berries')}</h4>
      <div class="loadout-row">${berries}${noBerry}</div>
    </div>`;
  grid.querySelectorAll('.loadout-item').forEach((btn) => {
    btn.onclick = () => {
      const kind = btn.dataset.kind;
      const key = btn.dataset.key;
      if (kind === 'ball') selectBall(key);
      else selectBerry(key);
    };
  });
}

function selectBall(key) {
  if (ballCount(key) <= 0) { showToast(t('None left!')); return; }
  if (key === 'master' && !confirm(t('Use a Master Ball? It is guaranteed.'))) return;
  selectedBall = key;
  renderLoadout();
  renderLoadoutSheet();
  updateStageUI();
  updateThrowHUD();
  if (currentTab === 'inventory') renderInventory();
}

function selectBerry(key) {
  if (!key) {
    selectedBerry = null;
  } else {
    if (berryCount(key) <= 0 && selectedBerry !== key) { showToast(t('None left!')); return; }
    selectedBerry = selectedBerry === key ? null : key;
  }
  renderLoadout();
  renderLoadoutSheet();
  updateStageUI();
  updateThrowHUD();
  if (currentTab === 'inventory') renderInventory();
}

function openSheet(name) {
  closeAllSheets();
  if (name === 'loadout') renderLoadoutSheet();
  const sheet = document.getElementById(name + '-sheet');
  if (!sheet) return;
  sheet.classList.remove('hidden');
  if (currentTab === 'catch') stopLoop();
  setTimeout(() => {
    const first = sheet.querySelector('.sheet-close, .more-item, .loadout-item');
    if (first) first.focus({ preventScroll: true });
  }, 40);
}

function closeSheet(name) {
  const sheet = document.getElementById(name + '-sheet');
  if (sheet) sheet.classList.add('hidden');
  if (currentTab === 'catch') startLoop();
}

function closeAllSheets() {
  document.querySelectorAll('.sheet').forEach((s) => s.classList.add('hidden'));
}

window.openMore = () => openSheet('more');
window.openStageMenu = () => openSheet('stage');
window.openLoadout = () => openSheet('loadout');
window.closeSheet = closeSheet;
window.closeAllSheets = closeAllSheets;

/* ================== TAB SYSTEM ================== */
window.switchTab = function (tab) {
  closeAllSheets();
  currentTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  updateNav(tab);
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.remove('hidden');

  if (tab === 'catch') {
    startLoop();
    requestAnimationFrame(resize);
    updateStageUI();
    renderLoadout();
  } else {
    if (gamePhase === 'grabbing' || gamePhase === 'charging') cancelThrow();
    stopLoop();
  }

  if (tab === 'pokedex') renderPokedex();
  if (tab === 'inventory') renderInventory();
  if (tab === 'shop') renderShop();
  if (tab === 'collection') renderCollection();
  if (tab === 'trainer') renderTrainer();
  if (tab === 'research') { checkQuestReset(); renderResearch(); }
};

/* ================== SETTINGS ================== */
window.toggleSound = function () {
  settings.sound = !settings.sound;
  saveSettings(settings);
};
window.toggleHaptics = function () {
  settings.haptics = !settings.haptics;
  saveSettings(settings);
};
window.toggleAssist = function () {
  settings.assist = !settings.assist;
  saveSettings(settings);
  showToast(settings.assist ? t('Aim assist on') : t('Aim assist off'), 1600);
};
window.switchLang = function () {
  CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en';
  settings.language = CONFIG.language;
  saveSettings(settings);
  document.documentElement.lang = CONFIG.language;
  applyI18n();
  renderPokedex();
  renderInventory();
  renderTrainer();
  renderBiomeSelector();
  updateStageUI();
  updateTopBar();
  updateThrowHUD();
  renderLoadout();
  renderLoadoutSheet();
  updateNav(currentTab);
  renderResearch();
  renderTutorial();
  const sub = document.querySelector('.menu-panel .sub');
  if (sub) sub.textContent = t('menu-desc');
};

/* ================== TUTORIAL ================== */
const TUTORIAL_STEPS = [
  {
    icon: '🎯',
    en: '<b>Drag up to aim.</b> The dotted arc shows where the ball will fly.',
    it: '<b>Trascina verso l\'alto per mirare.</b> L\'arco puntinato mostra dove volerà la ball.',
  },
  {
    icon: '⚡',
    en: '<b>Hold to charge.</b> The longer you hold, the more power you get.',
    it: '<b>Tieni premuto per caricare.</b> Più tieni, più potenza ottieni.',
  },
  {
    icon: '🌀',
    en: '<b>Circle while holding</b> to add spin. A curveball is harder to aim, but catches better.',
    it: '<b>Fai un cerchio mentre tieni premuto</b> per dare effetto. Il curveball è più difficile da mirare, ma cattura meglio.',
  },
  {
    icon: '⭕',
    en: '<b>Release when the ring is small.</b> Centre + small ring = Excellent.',
    it: '<b>Rilascia quando l\'anello è piccolo.</b> Centro + anello piccolo = Excellent.',
  },
];

function renderTutorial() {
  const title = document.getElementById('tut-title');
  const body = document.getElementById('tut-body');
  const dots = document.getElementById('tut-dots');
  const next = document.getElementById('tut-next');
  if (!title || !body || !dots || !next) return;
  title.textContent = t('How to throw');
  const step = TUTORIAL_STEPS[tutorialStep] || TUTORIAL_STEPS[0];
  body.innerHTML = `<div class="tut-step"><div class="tut-icon">${step.icon}</div><div>${tLang() === 'it' ? step.it : step.en}</div></div>`;
  dots.innerHTML = TUTORIAL_STEPS.map((_, i) => `<span class="${i === tutorialStep ? 'on' : ''}"></span>`).join('');
  next.textContent = tutorialStep >= TUTORIAL_STEPS.length - 1 ? t('Got it') : t('Next');
}

window.showTutorial = function () {
  tutorialStep = 0;
  renderTutorial();
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.remove('hidden');
};

window.nextTutorial = function () {
  if (tutorialStep < TUTORIAL_STEPS.length - 1) {
    tutorialStep += 1;
    renderTutorial();
  } else {
    window.closeTutorial();
  }
};

window.closeTutorial = function () {
  settings.tutorialSeen = true;
  saveSettings(settings);
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.add('hidden');
};

/* ================== START / RESET ================== */
window.startGame = function () {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('start-menu').style.display = 'none';
  switchTab('catch');
  if (!settings.tutorialSeen) window.showTutorial();
};

window.resetGame = function () {
  if (!confirm(t('Reset all progress? This cannot be undone.'))) return;
  localStorage.removeItem('pokemon-go-v2-state');
  localStorage.removeItem('pokemon-go-v2-inventory');
  state = loadState();
  inventory = loadInventory();
  selectedBall = 'poke';
  selectedBerry = null;
  nearbyMons = [];
  ringPhase = 0;
  ringFrozen = false;
  ball = null;
  gamePhase = 'idle';
  document.getElementById('detail-modal').classList.add('hidden');
  document.getElementById('result-modal').classList.add('hidden');
  document.getElementById('tutorial-modal').classList.add('hidden');
  document.querySelectorAll('.sheet').forEach((s) => s.classList.add('hidden'));
  updateNav('catch');
  spawnWildPokemon();
  renderPokedex();
  renderInventory();
  renderCollection();
  renderTrainer();
  renderNearbyRadar();
  updateTopBar();
  updateStageUI();
  updateThrowHUD();
  renderLoadout();
};

/* ================== EVOLUZIONE ================== */
window.evolvePokemon = function (uidOrId) {
  const inst = state.caught.find(c => c.uid === uidOrId) || state.caught.find(c => c.id === uidOrId);
  const speciesId = inst ? inst.id : uidOrId;
  const sp = CONFIG.byId(speciesId);
  if (!sp || !sp.evolvesTo) return;
  if (!inst) { showToast(t('Catch it first!')); return; }
  const have = inventory.candy[speciesId] || 0;
  if (have < sp.candyToEvolve) { showToast(t('Not enough candy!')); return; }
  const choices = Array.isArray(sp.evolvesTo) ? sp.evolvesTo : [sp.evolvesTo];
  const evoId = choices[Math.floor(Math.random() * choices.length)];
  const evo = CONFIG.byId(evoId);
  if (!evo) return;

  inventory.candy[speciesId] -= sp.candyToEvolve;
  inst.id = evoId;
  if (state.buddy && state.buddy.id === speciesId) state.buddy.id = evoId;
  if (!state.seen.includes(evoId)) state.seen.push(evoId);
  inventory.candy[evoId] = (inventory.candy[evoId] || 0) + 1;
  saveInventory(inventory);
  saveState(state);
  refreshVisible();
  playCatchSound(true);
  haptic([15, 30, 15]);
  recordEvent('evolve');
  showToast(`⚡ ${t('Evolved!')} ${evo.name[tLang()]}`, 2500);
};

/* ================== TIME OF DAY ================== */
function updateTimeOfDay() {
  const h = new Date().getHours();
  let label = 'day', cls = '';
  if (h >= 5 && h < 8) { label = 'dawn'; cls = 'dawn'; }
  else if (h >= 8 && h < 17) { label = 'day'; cls = ''; }
  else if (h >= 17 && h < 20) { label = 'dusk'; cls = 'dusk'; }
  else { label = 'night'; cls = 'night'; }
  timeOfDay = label;
  const wrap = document.querySelector('.stage-wrap');
  if (wrap) { wrap.classList.remove('dawn','dusk','night'); if(cls) wrap.classList.add(cls); }
  const badge = document.getElementById('time-badge');
  if (badge) {
    const icons = {dawn:'🌅',day:'☀️',dusk:'🌇',night:'🌙'};
    badge.textContent = `${icons[label]} ${label.toUpperCase()}`;
    badge.style.borderColor = label==='night'?'rgba(120,120,255,0.25)':label==='dawn'?'rgba(255,180,80,0.25)':label==='dusk'?'rgba(255,100,140,0.25)':'rgba(255,255,255,0.08)';
  }
}

/* ================== TOAST ================== */
function showToast(msg, duration = 2200) {
  const box = document.getElementById('toast-box');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('fade'), duration);
  setTimeout(() => el.remove(), duration + 400);
}

/* ================== DETAIL MODAL ================== */
window.openDetail = function(uidOrId) {
  const inst = state.caught.find(c => c.uid === uidOrId)
    || state.caught.find(c => c.id === uidOrId);
  const speciesId = inst ? inst.id : uidOrId;
  const p = CONFIG.byId(speciesId);
  if (!p) return;
  const modal = document.getElementById('detail-modal');
  const sprite = document.getElementById('dm-sprite');
  const name = document.getElementById('dm-name');
  const types = document.getElementById('dm-types');
  const stats = document.getElementById('dm-stats');
  const desc = document.getElementById('dm-desc');
  const actions = document.getElementById('dm-actions');

  sprite.innerHTML = `<img src="${artworkUrl(p, inst?.shiny) || ''}" onerror="this.style.display='none'" alt="">`;
  name.textContent = p.name[tLang()] + (inst?.shiny ? ' ✨' : '');
  types.innerHTML = p.types.map(t => `<span class="type-tag" style="background:${CONFIG.types[t].color}22;color:${CONFIG.types[t].color};border:1px solid ${CONFIG.types[t].color}44;">${CONFIG.types[t][tLang()]}</span>`).join('');

  const ivPct = inst?.iv ? Math.round((inst.iv[0] + inst.iv[1] + inst.iv[2]) / 45 * 100) : 0;
  stats.innerHTML = `
    <div class="dm-stat-box"><div class="dm-stat-val">${inst?.cp || '?'}</div><div class="dm-stat-label">${t('CP')}</div></div>
    <div class="dm-stat-box"><div class="dm-stat-val">${ivPct}%</div><div class="dm-stat-label">IV</div></div>
    <div class="dm-stat-box"><div class="dm-stat-val">${p.difficulty}/10</div><div class="dm-stat-label">${t('Difficulty')}</div></div>
  `;
  desc.textContent = p.desc ? p.desc[tLang()] : '';

  const hasCandy = (inventory.candy[p.id] || 0) >= (p.candyToEvolve || 999);
  const instId = inst ? inst.uid : p.id;
  actions.innerHTML = `
    ${p.candyToEvolve && inst ? `<button class="dm-btn${hasCandy ? '' : ' disabled'}" ${hasCandy ? `onclick="window.evolvePokemon('${instId}');window.closeDetail();"` : ''}>⚡ ${t('Evolves')}</button>` : ''}
    ${inst ? `<button class="dm-btn" onclick="window.setBuddy('${p.id}');window.closeDetail();">❤️ ${state.buddy?.id === p.id ? t('Buddy') : t('Set Buddy')}</button>` : ''}
    ${inst ? `<button class="dm-btn danger" onclick="window.doTransfer('${instId}');window.closeDetail();">🗑️ Transfer</button>` : ''}
  `;
  modal.classList.remove('hidden');
};
window.closeDetail = function() { document.getElementById('detail-modal').classList.add('hidden'); };

/* ================== TRANSFER ================== */
window.doTransfer = function(uidOrId) {
  const idx = state.caught.findIndex(c => c.uid === uidOrId);
  const fallback = idx >= 0 ? idx : state.caught.findIndex(c => c.id === uidOrId);
  if (fallback < 0) return;
  const inst = state.caught[fallback];
  if (!inst) return;
  if (!confirm(t('Transfer this Pokémon? You will gain stardust and candy.'))) return;
  state.caught.splice(fallback, 1);
  state.transferred = (state.transferred || 0) + 1;
  const gain = 100;
  inventory.stardust += gain;
  inventory.candy[inst.id] = (inventory.candy[inst.id] || 0) + 1;
  if (state.buddy && state.buddy.id === inst.id && !state.caught.some((c) => c.id === inst.id)) {
    state.buddy = null;
  }
  saveState(state);
  saveInventory(inventory);
  recordEvent('transfer');
  showToast(`+${gain} ✨ · +1 🍬`, 1800);
  refreshVisible();
};

/* ================== SHOP ================== */
const SHOP_ITEMS = [
  { id:'poke', icon:'🔴', name:{en:'Poké Ball',it:'Poké Ball'}, qty:5, price:100, type:'ball' },
  { id:'great', icon:'🔵', name:{en:'Great Ball',it:'Mega Ball'}, qty:3, price:250, type:'ball' },
  { id:'ultra', icon:'🟡', name:{en:'Ultra Ball',it:'Ultra Ball'}, qty:2, price:500, type:'ball' },
  { id:'razz', icon:'🍓', name:{en:'Razz Berry',it:'Bacca Melon'}, qty:5, price:150, type:'berry' },
  { id:'nanab', icon:'🍌', name:{en:'Nanab Berry',it:'Bacca Banana'}, qty:3, price:120, type:'berry' },
  { id:'pinap', icon:'🍍', name:{en:'Pinap Berry',it:'Bacca Ananas'}, qty:3, price:180, type:'berry' },
  { id:'golden', icon:'🌟', name:{en:'Golden Razz',it:'Bacca Gmela'}, qty:1, price:800, type:'berry' },
];

function renderShop() {
  const el = document.getElementById('shop-grid');
  if (!el) return;
  el.innerHTML = '';
  const stock = {
    poke: inventory.pokeballs, great: inventory.greatballs, ultra: inventory.ultraballs,
    razz: inventory.razz, nanab: inventory.nanab, pinap: inventory.pinap, golden: inventory.golden,
  };
  SHOP_ITEMS.forEach(item => {
    const affordable = inventory.stardust >= item.price;
    const card = document.createElement('div');
    card.className = 'shop-card' + (affordable ? ' affordable' : '');
    card.innerHTML = `
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-name">${item.name[tLang()]}</div>
      <div class="shop-desc">x${item.qty}</div>
      <div class="shop-price">✨ ${item.price}</div>
      <div class="shop-stock">${t('Owned')}: ${stock[item.id]||0}</div>
    `;
    card.onclick = () => {
      if (inventory.stardust < item.price) { showToast(t('Not enough stardust!')); return; }
      inventory.stardust -= item.price;
      if (item.type === 'ball') inventory[item.id+'balls'] = (inventory[item.id+'balls']||0) + item.qty;
      else inventory[item.id] = (inventory[item.id]||0) + item.qty;
      saveInventory(inventory);
      updateTopBar(); renderInventory(); renderShop();
      showToast(`+${item.qty} ${item.name[tLang()]}`, 2000);
    };
    el.appendChild(card);
  });
}

/* ================== UTILITIES ================== */
function t(key) {
  const dict = {
    en: {
      'No Poké Balls left!': 'No Poké Balls left!',
      'Gotcha!': 'Gotcha!',
      'CP': 'CP',
      'Caught': 'Caught',
      'nice throw': 'Nice throw',
      'great throw': 'Great throw',
      'excellent throw': 'Excellent throw',
      'normal throw': 'Normal throw',
      'Excellent': 'Excellent',
      'Great': 'Great',
      'Nice': 'Nice',
      'Normal': 'Normal',
      'Miss': 'Miss',
      'Missed!': 'Missed!',
      'Critical capture!': 'Critical capture!',
      'The ball missed. Aim with the dotted arc!': 'The ball missed. Aim with the dotted arc!',
      'Curveball': 'Curveball',
      'Hold & drag up · circle to curve': 'Hold & drag up · circle to curve',
      'Release to throw': 'Release to throw',
      'Catch chance': 'Catch chance',
      'How to throw': 'How to throw',
      'Next': 'Next',
      'Got it': 'Got it',
      'Aim assist on': 'Aim assist on',
      'Aim assist off': 'Aim assist off',
      'Catch it first!': 'Catch it first!',
      'None left!': 'None left!',
      'No berry': 'No berry',
      'Show more': 'Show more',
      'Catch':'Catch', 'Dex':'Dex', 'Bag':'Bag', 'Trainer':'Trainer', 'More':'More', 'Shop':'Shop', 'Collection':'Collection', 'Research':'Research', 'Settings':'Settings', 'Install app':'Install app', 'Close':'Close', 'Done':'Done', 'Loadout':'Loadout', 'Encounter':'Encounter', 'Spin':'Spin', 'New encounter':'New encounter',
      'Install: use your browser menu, or Share > Add to Home Screen on iOS.': 'Install: use your browser menu, or Share > Add to Home Screen on iOS.',
      'Ball': 'Ball',
      'Berry': 'Berry',
      'Use a Master Ball? It is guaranteed.': 'Use a Master Ball? It is guaranteed.',
      'Curveball Rookie': 'Curveball Rookie',
      'Land a Curveball': 'Land a Curveball',
      'Curveball Master': 'Curveball Master',
      'Land 10 Curveballs': 'Land 10 Curveballs',
      'Continue': 'Continue',
      'Oh no! The Pokémon broke free!': 'Oh no! The Pokémon broke free!',
      'It was too strong... Try a better ball or berry!': 'It was too strong... Try a better ball or berry!',
      'Try Again': 'Try Again',
      'Poké Balls': 'Poké Balls',
      'Berries': 'Berries',
      'Stardust': 'Stardust',
      'Level': 'Level',
      'Seen': 'Seen',
      'Great+': 'Great+',
      'Throws': 'Throws',
      'Fled': 'Fled',
      'Transferred': 'Transferred',
      'Shiny': 'Shiny',
      'Achievements': 'Achievements',
      'First Catch': 'First Catch',
      'Catch your first Pokémon': 'Catch your first Pokémon',
      'Novice Collector': 'Novice Collector',
      'Catch 10 Pokémon': 'Catch 10 Pokémon',
      'Shiny Hunter': 'Shiny Hunter',
      'Catch a Shiny Pokémon': 'Catch a Shiny Pokémon',
      'Expert Thrower': 'Expert Thrower',
      'Land an Excellent throw': 'Land an Excellent throw',
      'Veteran': 'Veteran',
      'Reach level 10': 'Reach level 10',
      'Master Catcher': 'Master Catcher',
      'Catch with a Master Ball': 'Catch with a Master Ball',
      'Evolves': 'Evolves',
      'Not enough candy!': 'Not enough candy!',
      'Evolved!': 'Evolved into',
      'All': 'All',
      'Difficulty': 'Difficulty',
      'Reset all progress? This cannot be undone.': 'Reset all progress? This cannot be undone.',
      'menu-desc': 'A low-poly creature collector with power, timing and curveball throws. Hold, charge, release. Bilingual.',
      'Combo': 'Combo',
      'Reward': 'Reward',
      'Claim': 'Claim',
      'Claimed': 'Claimed',
      'No active research.': 'No active research.',
      'Streak': 'Streak',
      'Research': 'Research',
      'Set Buddy': 'Set Buddy',
      'Buddy': 'Buddy',
      'Oh?': 'Oh?',
      'Egg': 'Egg',
      'Eggs': 'Eggs',
      'Affinity': 'Affinity',
      'Tap!': 'Tap!',
      'Transfer this Pokémon? You will gain stardust.': 'Transfer this Pokémon? You will gain stardust.',
      'Transfer this Pokémon? You will gain stardust and candy.': 'Transfer this Pokémon? You will gain stardust and candy.',
      'Not enough stardust!': 'Not enough stardust!',
      'Owned': 'Owned',
      'Unique': 'Unique',
      'Recent': 'Recent',
      'dawn': 'Dawn',
      'day': 'Day',
      'dusk': 'Dusk',
      'night': 'Night',
    },
    it: {
      'No Poké Balls left!': 'Poké Ball esaurite!',
      'Gotcha!': 'Preso!',
      'CP': 'PL',
      'Caught': 'Catturati',
      'nice throw': 'Lancio bello',
      'great throw': 'Lancio ottimo',
      'excellent throw': 'Lancio eccellente',
      'normal throw': 'Lancio normale',
      'Excellent': 'Eccellente',
      'Great': 'Ottimo',
      'Nice': 'Bello',
      'Normal': 'Normale',
      'Miss': 'Mancato',
      'Missed!': 'Mancato!',
      'Critical capture!': 'Cattura critica!',
      'The ball missed. Aim with the dotted arc!': 'La ball è andata a vuoto. Mira con l\'arco puntinato!',
      'Curveball': 'Curveball',
      'Hold & drag up · circle to curve': 'Tieni e trascina su · cerchio per l\'effetto',
      'Release to throw': 'Rilascia per lanciare',
      'Catch chance': 'Probabilità',
      'How to throw': 'Come lanciare',
      'Next': 'Avanti',
      'Got it': 'Fatto',
      'Aim assist on': 'Mira assistita attiva',
      'Aim assist off': 'Mira assistita disattivata',
      'Catch it first!': 'Catturalo prima!',
      'None left!': 'Non ne hai più!',
      'No berry': 'Nessuna bacca',
      'Show more': 'Mostra altri',
      'Catch':'Cattura', 'Dex':'Dex', 'Bag':'Zaino', 'Trainer':'Allenatore', 'More':'Altro', 'Shop':'Negozio', 'Collection':'Collezione', 'Research':'Ricerca', 'Settings':'Impostazioni', 'Install app':'Installa app', 'Close':'Chiudi', 'Done':'Fatto', 'Loadout':'Dotazione', 'Encounter':'Incontro', 'Spin':'Gira', 'New encounter':'Nuovo incontro',
      'Install: use your browser menu, or Share > Add to Home Screen on iOS.': 'Installa: usa il menu del browser, oppure Condividi > Aggiungi a Home su iOS.',
      'Ball': 'Ball',
      'Berry': 'Bacca',
      'Use a Master Ball? It is guaranteed.': 'Usare una Master Ball? È garantita.',
      'Curveball Rookie': 'Curveball principiante',
      'Land a Curveball': 'Fai un curveball',
      'Curveball Master': 'Maestro del curveball',
      'Land 10 Curveballs': 'Fai 10 curveball',
      'Continue': 'Continua',
      'Oh no! The Pokémon broke free!': 'Oh no! Il Pokémon si è liberato!',
      'It was too strong... Try a better ball or berry!': 'Era troppo forte... Prova una ball o bacca migliore!',
      'Try Again': 'Riprova',
      'Poké Balls': 'Poké Ball',
      'Berries': 'Bacche',
      'Stardust': 'Polvestelle',
      'Level': 'Livello',
      'Seen': 'Visti',
      'Great+': 'Grandi+',
      'Throws': 'Lanci',
      'Fled': 'Fuggiti',
      'Transferred': 'Trasferiti',
      'Shiny': 'Shiny',
      'Achievements': 'Obiettivi',
      'First Catch': 'Prima Cattura',
      'Catch your first Pokémon': 'Cattura il tuo primo Pokémon',
      'Novice Collector': 'Collezionista Novizio',
      'Catch 10 Pokémon': 'Cattura 10 Pokémon',
      'Shiny Hunter': 'Cacciatore Shiny',
      'Catch a Shiny Pokémon': 'Cattura uno Shiny',
      'Expert Thrower': 'Lanciatore Esperto',
      'Land an Excellent throw': 'Fai un lancio eccellente',
      'Veteran': 'Veterano',
      'Reach level 10': 'Raggiungi livello 10',
      'Master Catcher': 'Cattura Master',
      'Catch with a Master Ball': 'Cattura con Master Ball',
      'Evolves': 'Si evolve',
      'Not enough candy!': 'Caramelle insufficienti!',
      'Evolved!': 'Si è evoluto in',
      'All': 'Tutte',
      'Difficulty': 'Difficoltà',
      'Reset all progress? This cannot be undone.': 'Resettare tutti i progressi? Non si può annullare.',
      'menu-desc': 'Un collezionista low-poly con potenza, timing e curveball. Tieni, carica, rilascia. Bilingue.',
      'Combo': 'Combo',
      'Reward': 'Ricompensa',
      'Claim': 'Riscatta',
      'Claimed': 'Riscosso',
      'No active research.': 'Nessuna ricerca attiva.',
      'Streak': 'Serie',
      'Research': 'Ricerca',
      'Set Buddy': 'Scegli compagno',
      'Buddy': 'Compagno',
      'Oh?': 'Oh?',
      'Egg': 'Uovo',
      'Eggs': 'Uova',
      'Affinity': 'Affinità',
      'Tap!': 'Tocca!',
      'Transfer this Pokémon? You will gain stardust.': 'Trasferire questo Pokémon? Guadagnerai polvestelle.',
      'Transfer this Pokémon? You will gain stardust and candy.': 'Trasferire questo Pokémon? Guadagnerai polvestelle e caramelle.',
      'Not enough stardust!': 'Polvestelle insufficienti!',
      'Owned': 'Posseduti',
      'Unique': 'Unici',
      'Recent': 'Recenti',
      'dawn': 'Alba',
      'day': 'Giorno',
      'dusk': 'Tramonto',
      'night': 'Notte',
    }
  };
  const d = dict[CONFIG.language] || dict.en;
  return d[key] || key;
}

function tLang() { return CONFIG.language === 'it' ? 'it' : 'en'; }

/* ================== CANVAS HELPERS for avatar ================== */
function drawPolyEllipse(c, cx, cy, rx, ry, segs, color) {
  c.fillStyle = color;
  for (let i = 0; i < segs; i++) {
    const a1 = (Math.PI * 2 * i) / segs;
    const a2 = (Math.PI * 2 * (i + 1)) / segs;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry);
    c.lineTo(cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry);
    c.closePath();
    c.fill();
  }
}
function drawPolyTri(c, x1, y1, x2, y2, x3, y3, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3);
  c.closePath();
  c.fill();
}

/* ================== DEBUG (?debug=1) ================== */
if (new URLSearchParams(location.search).has('debug')) {
  window.__pgv2 = {
    state: () => state,
    inventory: () => inventory,
    settings: () => settings,
    phase: () => gamePhase,
    ring: () => getRingScale(),
    setRing: (scale) => {
      const t = (THROW_CFG.ringMax - scale) / (THROW_CFG.ringMax - THROW_CFG.ringMin);
      ringPhase = t * THROW_CFG.ringPeriod;
      ringFrozen = true;
      return getRingScale();
    },
    unfreezeRing: () => { ringFrozen = false; },
    target: () => ({ ...lastTarget }),
    anchor: () => getThrowAnchor(),
    throwState: () => ({ ...throwInput }),
    lastHit: () => lastHit && { ...lastHit },
    lastLaunch: () => lastLaunch && { ...lastLaunch },
    caught: () => state.caught.map((c) => ({ ...c })),
  };
}

/* ================== BOOT ================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { t, tLang };

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('result-modal');
  if (modal && e.target === modal) closeResult();
});
