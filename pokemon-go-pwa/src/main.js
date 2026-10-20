import CONFIG from './config.js';
import { loadState, saveState, loadInventory, saveInventory, loadSettings, saveSettings } from './storage.js';
import { drawLowPolyPokemon, drawPokeball, drawTerrain, drawParticles, drawCatchEffect, drawStarfield } from './renderer.js';
import { artworkUrl, loadSprite } from './sprites.js';

/* ================== STATE ================== */
let state = loadState();
let inventory = loadInventory();
let settings = loadSettings();
let currentPoke = CONFIG.pokedex[0];
let currentBiome = state.currentBiome || 'grass';
let selectedBall = 'poke';
let selectedBerry = null;
let gamePhase = 'idle'; // idle, throwing, shaking, result
let phaseTime = 0;
let particles = [];
let canvas, ctx;
let animId;
let time = 0;
let throwStart = { x: 0, y: 0 };
let throwBallPos = { x: 0, y: 0, vx: 0, vy: 0 };
let catchResult = null;
let lastCatchData = null;
let screenW = 0, screenH = 0;
let wildPokemon = null;
let wildIsShiny = false;
let wildCP = 0;
let wildSpriteImg = null;
let wildSpriteReady = false;

let burstTriggered = false;
let mouseX = 0.5, mouseY = 0.5;
let nearbyMons = [];
let timeOfDay = 'day';
let typeFilter = 'all';

const GROUND_Y_RATIO = 0.72;

/* ================== INIT ================== */
function init() {
  canvas = document.getElementById('stage-canvas');
  if (!canvas) return setTimeout(init, 50);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);


  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  CONFIG.language = settings.language || 'en';

  checkQuestReset();
  spawnWildPokemon();
  renderPokedex();
  renderInventory();
  renderTrainer();
  renderBiomeSelector();
  renderNearbyRadar();
  updateTopBar();
  updateStageUI();
  updateTimeOfDay();

  document.getElementById('start-menu').classList.remove('hidden');
  if (state.caught.length > 0) {
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('start-menu').style.display = 'none';
  }

  setInterval(updateNearbyTimer, 1000);
  requestAnimationFrame(gameLoop);
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
    const mins = Math.ceil(n.timer / 60);
    chip.innerHTML = `
      <img src="${artworkUrl(p, n.shiny) || ''}" alt="" onerror="this.style.display='none'" loading="lazy">
      <div>
        <div class="nm">${p.name[tLang()]} ${n.shiny ? '✨' : ''}</div>
        <div class="nt">${mins}m</div>
      </div>
    `;
    chip.onclick = () => { spawnWildPokemon(p.id); };
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
function spawnWildPokemon(overrideId = null) {
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
  wildIsShiny = Math.random() < CONFIG.shinyChance;

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
  updateStageUI();
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
  time = ts / 1000;
  animId = requestAnimationFrame(gameLoop);

  ctx.clearRect(0, 0, screenW, screenH);

  const biome = CONFIG.biomes[currentBiome];

  drawTerrain(ctx, screenW, screenH, time, biome ? biome.color : '#0f1a0f');
  drawStarfield(ctx, screenW, screenH * 0.65, time);

  const groundY = screenH * GROUND_Y_RATIO;
  const centerX = screenW / 2;

  // Wild target position (movement)
  const pokeSize = Math.min(screenW * 0.35, 160);
  const wildMoveBase = 30;
  const nanabFactor = selectedBerry === 'nanab' ? 0.25 : 1;
  const wildOffsetX = Math.sin(time * 1.1) * wildMoveBase * nanabFactor;
  const wildOffsetY = Math.cos(time * 1.6) * (wildMoveBase * 0.35) * nanabFactor;
  const targetBaseX = centerX;
  const targetBaseY = groundY - pokeSize * 0.25;
  const wildTargetX = targetBaseX + wildOffsetX;
  const wildTargetY = targetBaseY + wildOffsetY;

  // Rarity ring
  if (wildPokemon) {
    const ringColors = ['#ffffff44','#ffffff44','#7c6cf066','#7c6cf066','#7c6cf066','#ff6b9d66','#ff6b9d66','#ff6b9d66','#ffd16688','#ffd16688'];
    const rc = wildIsShiny ? `rgba(255,209,102,${0.3 + Math.sin(time*4)*0.15})` : (ringColors[wildPokemon.difficulty-1] || '#ffffff44');
    ctx.save();
    ctx.strokeStyle = rc;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(wildTargetX, groundY - 8, pokeSize * 0.55, pokeSize * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Render wild Pokémon
  if (wildPokemon) {
    const jitter = gamePhase === 'shaking' ? (Math.random() - 0.5) * 8 : 0;
    const fleeOffset = gamePhase === 'result' && catchResult === false ? Math.sin(time * 8) * 40 : 0;
    const fleeAlpha = gamePhase === 'result' && catchResult === false ? Math.max(0, 1 - phaseTime * 1.5) : 1;
    const breath = gamePhase === 'idle' ? 1 + Math.sin(time * 3) * 0.04 : 1;
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

  // Thrown ball
  if (gamePhase === 'throwing') {
    drawPokeball(ctx, throwBallPos.x, throwBallPos.y, 18, selectedBall, time * 10);
    if (Math.random() > 0.5) {
      particles.push({ x: throwBallPos.x, y: throwBallPos.y, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2, life: 1, size: 3, color: '#fff' });
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

  // Particles
  updateParticles(1 / 60);
  drawParticles(ctx, particles);

  // Physics
  if (gamePhase === 'throwing') {
    throwBallPos.x += throwBallPos.vx;
    throwBallPos.y += throwBallPos.vy;
    throwBallPos.vy += 0.6;
    const dist = Math.hypot(throwBallPos.x - wildTargetX, throwBallPos.y - wildTargetY);
    if (throwBallPos.y >= groundY - 20 || dist < 45) {
      gamePhase = 'shaking';
      phaseTime = 0;
      resolveCatch(dist < 60 ? 'great' : dist < 100 ? 'nice' : 'normal');
    }
    if (throwBallPos.y > screenH + 50) {
      gamePhase = 'result';
      phaseTime = 0;
      catchResult = false;
      state.streak = 0;
      showResult(false);
    }
  }

  if (gamePhase === 'shaking') {
    phaseTime += 1 / 60;
    const shakePhase = Math.floor(phaseTime * 2.5);
    if (shakePhase >= 3) {
      gamePhase = 'result';
      phaseTime = 0;
      showResult(catchResult);
    }
  }

  if (gamePhase === 'result') {
    phaseTime += 1 / 60;
    if (phaseTime > 2.5 && catchResult === false) {
      const modal = document.getElementById('result-modal');
      if (modal) modal.classList.add('hidden');
      spawnWildPokemon();
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= dt * 1.5;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ================== THROW MECHANICS ================== */
let dragStart = null;
function onPointerDown(e) {
  if (gamePhase !== 'idle') return;
  const rect = canvas.getBoundingClientRect();
  dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function onPointerUp(e) {
  if (gamePhase !== 'idle' || !dragStart) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const dx = dragStart.x - x;
  const dy = dragStart.y - y;
  const speed = Math.hypot(dx, dy);
  if (speed < 20) { dragStart = null; return; }
  if (inventory[selectedBall + 'balls'] <= 0 && selectedBall !== 'poke') selectedBall = 'poke';
  if (inventory.pokeballs <= 0) {
    alert(t('No Poké Balls left!'));
    dragStart = null;
    return;
  }
  inventory[selectedBall + 'balls']--;
  saveInventory(inventory);
  renderInventory();
  updateTopBar();

  const angle = Math.atan2(dy, dx);
  const power = Math.min(speed * 0.12, 18);
  throwBallPos = { x: dragStart.x, y: dragStart.y, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power - 4 };
  gamePhase = 'throwing';
  state.totalThrows++;
  saveState(state);
  dragStart = null;
}

/* ================== CATCH RESOLUTION ================== */
function resolveCatch(throwQuality) {
  const p = wildPokemon;
  const ballMult = CONFIG.pokeballs[selectedBall].multiplier;
  let berryMult = 1;
  if (selectedBerry === 'razz') berryMult = 1.5;
  if (selectedBerry === 'golden') berryMult = 2.5;
  if (selectedBerry === 'nanab') berryMult = 1.1;

  const baseRate = Math.max(0.03, 0.55 - (p.difficulty * 0.05));
  const throwMult = throwQuality === 'excellent' ? 2.0 : throwQuality === 'great' ? 1.5 : throwQuality === 'nice' ? 1.15 : 1.0;
  const catchRate = Math.min(0.95, baseRate * ballMult * berryMult * throwMult);

  catchResult = Math.random() < catchRate;

  const iv = catchResult ? [randInt(16), randInt(16), randInt(16)] : null;
  if (iv) {
    const ivAvg = iv.reduce((a,b)=>a+b,0)/3;
    wildCP = Math.floor(wildCP * (1 + ivAvg/90));
  }

  let xpGain = 100;
  if (throwQuality === 'nice') xpGain = 120;
  if (throwQuality === 'great') xpGain = 150;
  if (throwQuality === 'excellent') xpGain = 200;
  if (wildIsShiny) xpGain *= 2;
  if (catchResult) xpGain += 50;

  lastCatchData = {
    pokemon: p, shiny: wildIsShiny, cp: wildCP, caught: catchResult, iv,
    throwQuality, xpGain, berry: selectedBerry,
  };

  if (catchResult) {
    state.streak = (state.streak || 0) + 1;
    const streakBonus = Math.min(state.streak, 10);
    xpGain = Math.floor(xpGain * (1 + streakBonus * 0.1));
    lastCatchData.xpGain = xpGain;

    state.caught.push({
      id: p.id, cp: wildCP, iv, shiny: wildIsShiny,
      date: Date.now(), ball: selectedBall,
    });
    state.xp += xpGain;
    state.level = CONFIG.getLevel(state.xp);
    const candyKey = p.id;
    inventory.candy[candyKey] = (inventory.candy[candyKey] || 0) + (selectedBerry === 'pinap' ? 6 : 3);
    inventory.stardust += 100 + p.difficulty * 20;
    if (throwQuality === 'great') state.greatThrows = (state.greatThrows || 0) + 1;
    if (throwQuality === 'excellent') state.excellentThrows = (state.excellentThrows || 0) + 1;
    saveInventory(inventory);
    saveState(state);
    // Buddy affinity
    if (state.buddy && state.buddy.id === p.id) {
      const prev = state.buddy.affinity || 0;
      state.buddy.affinity = Math.min(100, prev + 1);
      const milestones = [25,50,75,100].filter(m => prev < m && state.buddy.affinity >= m);
      if (milestones.length) {
        inventory.candy[p.id] = (inventory.candy[p.id] || 0) + milestones.length;
        saveInventory(inventory);
      }
      saveState(state);
    }
    tryAddEgg();
    playCatchSound(true);
  } else {
    state.streak = 0;
    state.flown = (state.flown || 0) + 1;
    saveState(state);
    playCatchSound(false);
  }

  walkEggs(0.05);

  if (selectedBerry) {
    inventory[selectedBerry] = (inventory[selectedBerry] || 0) - 1;
    if (inventory[selectedBerry] < 0) inventory[selectedBerry] = 0;
    selectedBerry = null;
    saveInventory(inventory);
    renderInventory();
  }

  updateQuestProgress('throw', { quality: throwQuality });
  if (catchResult) {
    updateQuestProgress('catch', { types: p.types, shiny: wildIsShiny, streak: state.streak });
  }
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
      <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem;">${t(data.throwQuality + ' throw')} · +${data.xpGain} XP</div>
      ${data.shiny ? '<div style="color:#ffd700;margin-top:0.3rem;font-size:0.9rem;">✨ SHINY ✨</div>' : ''}
    `;
    btn.textContent = t('Continue');
    triggerComboOverlay();
  } else {
    title.textContent = t('Oh no! The Pokémon broke free!');
    title.style.color = '#e57373';
    body.innerHTML = `
      <img src="${artworkUrl(data.pokemon) || ''}" alt=""
           onerror="this.style.display='none'"
           style="width:100px;height:100px;object-fit:contain;display:block;margin:0.3rem auto 0;opacity:0.85;">
      <div style="font-size:2rem;margin:0.3rem 0;">${data.pokemon.name[tLang()]}</div>
      <div style="color:var(--text-secondary);font-size:0.9rem;">${t('It was too strong... Try a better ball or berry!')}</div>
    `;
    btn.textContent = t('Try Again');
  }

  modal.classList.remove('hidden');
  updateTopBar();
  renderTrainer();
  renderPokedex();
}

window.closeResult = function () {
  document.getElementById('result-modal').classList.add('hidden');
  spawnWildPokemon();
};
window.spawnWildPokemon = spawnWildPokemon;

/* ================== AUDIO ================== */
function playCatchSound(success) {
  if (!settings.sound) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx2 = new AC();
    if (success) {
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = ctx2.createOscillator();
        const g = ctx2.createGain();
        o.connect(g); g.connect(ctx2.destination);
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.12, ctx2.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + i * 0.12 + 0.3);
        o.start(ctx2.currentTime + i * 0.12);
        o.stop(ctx2.currentTime + i * 0.12 + 0.3);
      });
    } else {
      const o = ctx2.createOscillator();
      const g = ctx2.createGain();
      o.connect(g); g.connect(ctx2.destination);
      o.type = 'sine';
      o.frequency.value = 220;
      g.gain.setValueAtTime(0.1, ctx2.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.6);
      o.start(); o.stop(ctx2.currentTime + 0.6);
    }
  } catch (e) {}
}

/* ================== QUEST SYSTEM ================== */
const QUEST_TEMPLATES = [
  { id:'catch_any', type:'catch', target:3, label:{en:'Catch 3 Pokémon', it:'Cattura 3 Pokémon'}, reward:{stardust:500, xp:200}, icon:'🎯' },
  { id:'catch_type_water', type:'catch_type', targetType:'water', target:2, label:{en:'Catch 2 Water Pokémon', it:'Cattura 2 Pokémon Acqua'}, reward:{stardust:400, razz:5}, icon:'💧' },
  { id:'catch_type_fire', type:'catch_type', targetType:'fire', target:2, label:{en:'Catch 2 Fire Pokémon', it:'Cattura 2 Pokémon Fuoco'}, reward:{stardust:400, pinap:3}, icon:'🔥' },
  { id:'throw_great', type:'throw_great', target:3, label:{en:'3 Great Throws', it:'3 Lanci Ottimi'}, reward:{stardust:300, xp:300}, icon:'🎾' },
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
  state.level = CONFIG.getLevel(state.xp);
  saveState(state);
  saveInventory(inventory);
  renderResearch();
  updateTopBar();
  renderTrainer();
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
  state.buddy = { id, affinity: state.buddy?.id === id ? (state.buddy.affinity || 0) : 0 };
  saveState(state);
  renderTrainer();
  renderPokedex();
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
  if (hatched) renderTrainer();
}

function hatchEgg(idx) {
  const egg = state.eggs[idx];
  if (!egg || !egg.hatched || egg.claimed) return;
  egg.claimed = true;
  // pool basato su km
  const pool = CONFIG.pokedex.filter(p => p.weight > 0).sort(() => Math.random()-0.5);
  const rarity = egg.km >= 10 ? pool.slice(0, Math.floor(pool.length*0.15)) :
                 egg.km >= 5  ? pool.slice(0, Math.floor(pool.length*0.35)) :
                                 pool.slice(0, Math.floor(pool.length*0.60));
  const pick = rarity[randInt(rarity.length)] || pool[0];
  const shiny = Math.random() < CONFIG.shinyChance;
  const iv = [randInt(16), randInt(16), randInt(16)];
  const ivAvg = iv.reduce((a,b)=>a+b,0)/3;
  const cp = Math.floor((10 + pick.difficulty*25) * (1 + ivAvg/90) * (1 + Math.random()*0.5));
  state.caught.push({ id: pick.id, cp, iv, shiny, date: Date.now(), ball: 'poke' });
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
  updateTopBar(); renderTrainer(); renderPokedex();
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
  updateTopBar(); renderInventory(); renderTrainer();
  playCatchSound(true);
  showToast('🌀 ' + loot.join(' · '), 3500);
};

/* ================== UI RENDERING ================== */
const dexGenOf = (p) => p.gen || 1;
let dexGenFilter = localStorage.getItem('pokemon-dexgen') || '1';

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
    allBtn.onclick = () => { typeFilter = 'all'; renderPokedex(); };
    filterWrap.appendChild(allBtn);
    for (const tk of typeKeys) {
      const btn = document.createElement('button');
      btn.className = 'type-chip' + (typeFilter === tk ? ' active' : '');
      btn.textContent = CONFIG.types[tk][tLang()];
      btn.style.color = typeFilter === tk ? '#fff' : CONFIG.types[tk].color;
      btn.onclick = () => { typeFilter = tk; renderPokedex(); };
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

  const caughtIds = state.caught.map(c => c.id);
  const seenIds = state.seen || [];

  lista.forEach(p => {
    const isCaught = caughtIds.includes(p.id);
    const isSeen = seenIds.includes(p.id);
    const caughtCount = caughtIds.filter(id => id === p.id).length;
    const candyCount = inventory.candy[p.id] || 0;

    const card = document.createElement('div');
    card.className = 'pd-card' + (isCaught ? ' caught' : isSeen ? ' seen' : '');
    card.style.cursor = isCaught || isSeen ? 'pointer' : 'default';
    if (isCaught || isSeen) card.onclick = () => window.openDetail(p.id);

    const typeHtml = p.types.map(t =>
      `<span class="type-tag" style="background:${CONFIG.types[t].color}22;color:${CONFIG.types[t].color};border:1px solid ${CONFIG.types[t].color}44;">${CONFIG.types[t][tLang()]}</span>`
    ).join('');

    const lastCatch = state.caught.filter(c => c.id === p.id).pop();
    const buddySet = state.buddy && state.buddy.id === p.id;

    card.innerHTML = `
      <div class="pd-sprite" id="sprite-${p.id}"></div>
      <div class="pd-name">${isCaught || isSeen ? p.name[tLang()] : '???'}</div>
      <div class="pd-types">${typeHtml}</div>
      <div class="pd-meta">
        <span>${t('Caught')}: ${caughtCount}</span>
        <span>🍬 ${candyCount}</span>
        ${caughtIds.some(id => id === p.id) && state.caught.find(c => c.id === p.id)?.shiny ? '<span style="color:#ffd700;">✨</span>' : ''}
      </div>
      ${lastCatch && lastCatch.iv ? ivBars(lastCatch.iv) : ''}
      ${p.candyToEvolve && isCaught ? `<div class="pd-evolve${candyCount >= p.candyToEvolve ? ' ready' : ''}"${candyCount >= p.candyToEvolve ? ` onclick="window.evolvePokemon('${p.id}');event.stopPropagation();" style="cursor:pointer;"` : ''}>⚡ ${t('Evolves')} (${Math.min(candyCount, p.candyToEvolve)}/${p.candyToEvolve})</div>` : ''}
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

  const count = document.getElementById('pokedex-count');
  if (count) {
    const unici = new Set(caughtIds).size;
    count.textContent = t('Caught') + ': ' + unici + ' / ' + CONFIG.pokedex.length +
      ' · ' + t('Seen') + ': ' + seenIds.length;
  }
}

let collectionShinyOnly = false;

function renderCollection() {
  const container = document.getElementById('collection-grid');
  if (!container) return;
  container.innerHTML = '';

  const filterWrap = document.getElementById('collection-filters');
  if (filterWrap) {
    filterWrap.innerHTML = '';
    const opts = [
      ['all', t('All')],
      ['shiny', '✨ Shiny'],
      ['recent', t('Recent')],
    ];
    const activeKey = collectionShinyOnly ? 'shiny' : 'all';
    for (const [key, label] of opts) {
      const btn = document.createElement('button');
      btn.className = 'cl-filter-btn' + (activeKey === key ? ' active' : '');
      btn.textContent = label;
      btn.onclick = () => { collectionShinyOnly = key === 'shiny'; renderCollection(); };
      filterWrap.appendChild(btn);
    }
  }

  let list = [...state.caught].reverse();
  if (collectionShinyOnly) list = list.filter(c => c.shiny);

  list.forEach(c => {
    const p = CONFIG.byId(c.id);
    if (!p) return;
    const card = document.createElement('div');
    card.className = 'cl-card' + (c.shiny ? ' shiny-card' : '');
    card.onclick = () => window.openDetail(c.id);

    const ivPct = c.iv ? Math.round((c.iv[0]+c.iv[1]+c.iv[2])/45*100) : 0;
    const ballIcons = { poke:'🔴', great:'🔵', ultra:'🟡', master:'🟣' };
    const d = new Date(c.date);
    const dateStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;

    card.innerHTML = `
      ${c.shiny ? '<div class="cl-badge">✨ SHINY</div>' : ''}
      <div class="cl-sprite"><img src="${artworkUrl(p, c.shiny)||''}" onerror="this.style.display='none'" alt=""></div>
      <div class="cl-name">${p.name[tLang()]} ${c.shiny?'✨':''}</div>
      <div class="cl-cp">CP ${c.cp}</div>
      <div class="cl-meta">IV ${ivPct}% · ${ballIcons[c.ball]||'🔴'}</div>
      <div class="cl-date">${dateStr}</div>
    `;
    container.appendChild(card);
  });

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
    el.onclick = () => { selectedBall = b.key; renderInventory(); updateStageUI(); };
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
    el.onclick = () => { selectedBerry = selectedBerry === b.key ? null : b.key; renderInventory(); updateStageUI(); };
    beRow.appendChild(el);
  });
  container.appendChild(beSec);

  const sum = document.createElement('div');
  sum.className = 'inv-summary';
  sum.innerHTML = `<span>✨ ${t('Stardust')}: ${inventory.stardust.toLocaleString()}</span>`;
  container.appendChild(sum);
}

function renderTrainer() {
  const lvl = CONFIG.getLevel(state.xp);
  const xpNext = CONFIG.levels[lvl] || 1000000;
  const xpPrev = CONFIG.levels[lvl - 1] || 0;
  const xpProg = Math.min(1, (state.xp - xpPrev) / (xpNext - xpPrev));

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
}

function updateStageUI() {
  const info = document.getElementById('stage-info');
  if (!info || !wildPokemon) return;
  const b = CONFIG.pokeballs[selectedBall];
  const berry = selectedBerry ? CONFIG.berries[selectedBerry] : null;
  info.innerHTML = `
    <div style="font-family:var(--font-display);color:var(--accent-light);font-size:1.1rem;">${wildPokemon.name[tLang()]} ${wildIsShiny ? '✨' : ''}</div>
    <div style="font-size:0.8rem;color:var(--text-secondary);">CP ${wildCP} · ${t('Difficulty')} ${wildPokemon.difficulty}/10</div>
    <div style="font-size:0.75rem;color:#666;margin-top:0.2rem;">${b[tLang()]} ${berry ? '+ ' + berry[tLang()] : ''}</div>
  `;
}

function updateTopBar() {
  const bar = document.getElementById('top-bar');
  if (!bar) return;
  bar.innerHTML = `
    <span class="tb-stat">🍬 ${Object.values(inventory.candy).reduce((a,b)=>a+b,0)}</span>
    <span class="tb-stat">✨ ${inventory.stardust.toLocaleString()}</span>
    <span class="tb-stat">🔴 ${inventory.pokeballs + inventory.greatballs + inventory.ultraballs + inventory.masterballs}</span>
    <span class="tb-stat">⭐ Lv.${CONFIG.getLevel(state.xp)}</span>
    <button class="tb-btn" onclick="window.switchTab('settings')">⚙</button>
  `;
}

/* ================== TAB SYSTEM ================== */
window.switchTab = function (tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.remove('hidden');
  const btn = document.getElementById('btn-' + tab);
  if (btn) btn.classList.add('active');

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
window.switchLang = function () {
  CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en';
  settings.language = CONFIG.language;
  saveSettings(settings);
  renderPokedex();
  renderInventory();
  renderTrainer();
  renderBiomeSelector();
  updateStageUI();
  updateTopBar();
  renderResearch();
  const sub = document.querySelector('.menu-panel .sub');
  if (sub) sub.textContent = t('menu-desc');
};

/* ================== START / RESET ================== */
window.startGame = function () {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('start-menu').style.display = 'none';
  renderPokedex();
  switchTab('catch');
};

window.resetGame = function () {
  if (!confirm(t('Reset all progress? This cannot be undone.'))) return;
  localStorage.removeItem('pokemon-state-v2');
  localStorage.removeItem('pokemon-inventory-v2');
  state = loadState();
  inventory = loadInventory();
  document.getElementById('detail-modal').classList.add('hidden');
  document.getElementById('result-modal').classList.add('hidden');
  spawnWildPokemon();
  renderPokedex();
  renderInventory();
  renderTrainer();
  updateTopBar();
  updateStageUI();
};

/* ================== EVOLUZIONE ================== */
window.evolvePokemon = function (id) {
  const sp = CONFIG.byId(id);
  if (!sp || !sp.evolvesTo) return;
  const have = inventory.candy[id] || 0;
  if (have < sp.candyToEvolve) { alert(t('Not enough candy!')); return; }
  const choices = Array.isArray(sp.evolvesTo) ? sp.evolvesTo : [sp.evolvesTo];
  const evoId = choices[Math.floor(Math.random() * choices.length)];
  const evo = CONFIG.byId(evoId);
  if (!evo) return;

  inventory.candy[id] -= sp.candyToEvolve;
  const inst = state.caught.find(c => c.id === id);
  if (inst) inst.id = evoId;
  if (!state.seen.includes(evoId)) state.seen.push(evoId);
  inventory.candy[evoId] = (inventory.candy[evoId] || 0) + 1;
  saveInventory(inventory);
  saveState(state);
  renderPokedex();
  renderInventory();
  renderTrainer();
  updateTopBar();
  playCatchSound(true);
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
window.openDetail = function(id) {
  const p = CONFIG.byId(id);
  const last = state.caught.filter(c => c.id === id).pop();
  if (!p) return;
  const modal = document.getElementById('detail-modal');
  const sprite = document.getElementById('dm-sprite');
  const name = document.getElementById('dm-name');
  const types = document.getElementById('dm-types');
  const stats = document.getElementById('dm-stats');
  const desc = document.getElementById('dm-desc');
  const actions = document.getElementById('dm-actions');

  sprite.innerHTML = `<img src="${artworkUrl(p, last?.shiny)||''}" onerror="this.style.display='none'" alt="">`;
  name.textContent = p.name[tLang()] + (last?.shiny ? ' ✨' : '');
  types.innerHTML = p.types.map(t => `<span class="type-tag" style="background:${CONFIG.types[t].color}22;color:${CONFIG.types[t].color};border:1px solid ${CONFIG.types[t].color}44;">${CONFIG.types[t][tLang()]}</span>`).join('');

  const ivPct = last?.iv ? Math.round((last.iv[0]+last.iv[1]+last.iv[2])/45*100) : 0;
  stats.innerHTML = `
    <div class="dm-stat-box"><div class="dm-stat-val">${last?.cp||'?'}</div><div class="dm-stat-label">${t('CP')}</div></div>
    <div class="dm-stat-box"><div class="dm-stat-val">${ivPct}%</div><div class="dm-stat-label">IV</div></div>
    <div class="dm-stat-box"><div class="dm-stat-val">${p.difficulty}/10</div><div class="dm-stat-label">${t('Difficulty')}</div></div>
  `;
  desc.textContent = p.desc ? p.desc[tLang()] : '';

  const hasCandy = (inventory.candy[id]||0) >= (p.candyToEvolve||999);
  actions.innerHTML = `
    ${p.candyToEvolve && last ? `<button class="dm-btn${hasCandy?'':' disabled'}" ${hasCandy?`onclick="window.evolvePokemon('${id}');window.closeDetail();"`:''}>⚡ ${t('Evolves')}</button>` : ''}
    <button class="dm-btn" onclick="window.setBuddy('${id}');window.closeDetail();">❤️ ${state.buddy?.id===id ? t('Buddy') : t('Set Buddy')}</button>
    <button class="dm-btn danger" onclick="window.doTransfer('${id}');window.closeDetail();">🗑️ Transfer</button>
  `;
  modal.classList.remove('hidden');
};
window.closeDetail = function() { document.getElementById('detail-modal').classList.add('hidden'); };

/* ================== TRANSFER ================== */
window.doTransfer = function(id) {
  const idx = state.caught.findIndex(c => c.id === id);
  if (idx < 0) return;
  if (!confirm(t('Transfer this Pokémon? You will gain stardust.'))) return;
  state.caught.splice(idx, 1);
  state.transferred = (state.transferred || 0) + 1;
  const gain = 100;
  inventory.stardust += gain;
  // if buddy was this id, clear buddy
  if (state.buddy && state.buddy.id === id) state.buddy = null;
  saveState(state);
  saveInventory(inventory);
  showToast(`+${gain} ✨`, 1800);
  renderPokedex(); renderTrainer(); updateTopBar();
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
      if (!affordable) { showToast(t('Not enough stardust!')); return; }
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
      'menu-desc': 'A low-poly Pokémon GO experience. Swipe to throw Poké Balls. Use berries. Collect them all. Bilingual.',
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
      'menu-desc': 'Un\'esperienza Pokémon GO low-poly. Scorri per lanciare Poké Ball. Usa bacche. Collezionali tutti. Bilingue.',
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
