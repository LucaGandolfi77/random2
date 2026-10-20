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
let wildSpriteImg = null;   // artwork reale (PokeAPI) quando caricato
let wildSpriteReady = false;

const GROUND_Y_RATIO = 0.72;

/* ================== INIT ================== */
function init() {
  canvas = document.getElementById('stage-canvas');
  if (!canvas) return setTimeout(init, 50);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  // Touch / mouse for throwing
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  // Load settings
  CONFIG.language = settings.language || 'en';

  spawnWildPokemon();
  renderPokedex();
  renderInventory();
  renderTrainer();
  renderBiomeSelector();
  updateTopBar();
  updateStageUI();

  document.getElementById('start-menu').classList.remove('hidden');
  if (state.caught.length > 0) {
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('start-menu').style.display = 'none';
  }

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

/* ================== WILD SPAWN ================== */
function spawnWildPokemon() {
  const biome = CONFIG.biomes[currentBiome];
  // i riferimenti bioma possono avere peso dedicato: 'pikachu:0.7'
  const refs = biome ? biome.pokemon : CONFIG.pokedex.map(p => p.id);
  const pool = refs.map(ref => {
    const [id, w] = ref.split(':');
    const p = CONFIG.byId(id);
    if (!p) return null;
    return { p, w: w != null ? parseFloat(w) : (p.weight || 0) };
  }).filter(x => x && x.w > 0);
  // + specie delle generazioni successive assegnate al bioma per tipo
  for (const a of (CONFIG.autoSpecies?.[currentBiome] || [])) {
    const p = CONFIG.byId(a.id);
    if (p && p.weight > 0) pool.push({ p, w: a.w });
  }
  if (pool.length === 0) pool.push({ p: CONFIG.pokedex[0], w: 1 });
  const weights = pool.map(x => x.w);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let idx = 0;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { idx = i; break; }
  }
  wildPokemon = pool[idx].p;
  wildIsShiny = Math.random() < CONFIG.shinyChance;

  // carica lo sprite reale; se fallisce (offline alla prima visita) si
  // ricade sul disegno low-poly procedurale
  wildSpriteReady = false;
  const url = artworkUrl(wildPokemon, wildIsShiny);
  loadSprite(url).then(img => {
    if (wildPokemon && artworkUrl(wildPokemon, wildIsShiny) === url) {
      wildSpriteImg = img;
      wildSpriteReady = !!img;
    }
  });

  // CP based on difficulty + some randomness
  const base = 10 + (wildPokemon.difficulty * 25);
  wildCP = Math.floor(base + Math.random() * base * 0.5);

  // mark seen
  if (!state.seen.includes(wildPokemon.id)) {
    state.seen.push(wildPokemon.id);
    saveState(state);
  }
  gamePhase = 'idle';
  phaseTime = 0;
  catchResult = null;
  updateStageUI();
}

/* ================== GAME LOOP ================== */
function gameLoop(ts) {
  time = ts / 1000;
  animId = requestAnimationFrame(gameLoop);

  ctx.clearRect(0, 0, screenW, screenH);

  // Background
  const biome = CONFIG.biomes[currentBiome];
  drawTerrain(ctx, screenW, screenH, time, biome ? biome.color : '#0f1a0f');

  // Stars / atmosphere overlay
  drawStarfield(ctx, screenW, screenH * 0.65, time);

  const groundY = screenH * GROUND_Y_RATIO;
  const centerX = screenW / 2;

  // Render wild Pokémon — sprite reale con fallback low-poly
  if (wildPokemon) {
    const pokeSize = Math.min(screenW * 0.35, 160);
    const jitter = gamePhase === 'shaking' ? (Math.random() - 0.5) * 8 : 0;
    const fleeOffset = gamePhase === 'result' && catchResult === false ? Math.sin(time * 8) * 40 : 0;
    const fleeAlpha = gamePhase === 'result' && catchResult === false ? Math.max(0, 1 - phaseTime * 1.5) : 1;
    ctx.save();
    ctx.globalAlpha = fleeAlpha;
    const drawX = centerX + jitter + fleeOffset;
    if (wildSpriteReady && wildSpriteImg) {
      const s = pokeSize * 1.9;
      if (wildIsShiny) {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.65)';
        ctx.shadowBlur = 26;
      }
      ctx.drawImage(wildSpriteImg, drawX - s / 2, groundY - s * 0.66, s, s);
      ctx.shadowBlur = 0;
      if (wildIsShiny) {
        // scintilla shiny anche sugli sprite
        const sp = Math.abs(Math.sin(time * 3));
        if (sp > 0.7) {
          ctx.globalAlpha = ((sp - 0.7) / 0.3) * fleeAlpha;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(drawX + s * 0.3, groundY - s * 0.9, s * 0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fleeAlpha;
        }
      }
    } else {
      drawLowPolyPokemon(ctx, wildPokemon, drawX, groundY - pokeSize * 0.25, pokeSize, time, wildIsShiny);
    }
    ctx.restore();
  }

  // Render thrown ball
  if (gamePhase === 'throwing') {
    drawPokeball(ctx, throwBallPos.x, throwBallPos.y, 18, selectedBall, time * 10);
    // trail particles
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
  }

  // Particles
  updateParticles(1 / 60);
  drawParticles(ctx, particles);

  // Update physics
  if (gamePhase === 'throwing') {
    throwBallPos.x += throwBallPos.vx;
    throwBallPos.y += throwBallPos.vy;
    throwBallPos.vy += 0.6; // gravity
    // Hit ground or target
    const targetX = centerX;
    const targetY = groundY - Math.min(screenW * 0.35, 160) * 0.25;
    const dist = Math.hypot(throwBallPos.x - targetX, throwBallPos.y - targetY);
    if (throwBallPos.y >= groundY - 20 || dist < 45) {
      gamePhase = 'shaking';
      phaseTime = 0;
      resolveCatch(dist < 60 ? 'great' : dist < 100 ? 'nice' : 'normal');
    }
    if (throwBallPos.y > screenH + 50) {
      gamePhase = 'result';
      phaseTime = 0;
      catchResult = false;
      showResult(false);
    }
  }

  if (gamePhase === 'shaking') {
    phaseTime += 1 / 60;
    // 3 shakes over ~2.5s
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
  // throw!
  if (inventory[selectedBall + 'balls'] <= 0 && selectedBall !== 'poke') {
    selectedBall = 'poke';
  }
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

  // base catch rate: difficulty 1 = 50% base, difficulty 10 = 5% base
  const baseRate = Math.max(0.03, 0.55 - (p.difficulty * 0.05));
  const throwMult = throwQuality === 'excellent' ? 2.0 : throwQuality === 'great' ? 1.5 : throwQuality === 'nice' ? 1.15 : 1.0;
  const catchRate = Math.min(0.95, baseRate * ballMult * berryMult * throwMult);

  catchResult = Math.random() < catchRate;

  // XP calculation
  let xpGain = 100;
  if (throwQuality === 'nice') xpGain = 120;
  if (throwQuality === 'great') xpGain = 150;
  if (throwQuality === 'excellent') xpGain = 200;
  if (wildIsShiny) xpGain *= 2;
  if (catchResult) xpGain += 50; // catch bonus

  lastCatchData = {
    pokemon: p, shiny: wildIsShiny, cp: wildCP, caught: catchResult,
    throwQuality, xpGain, berry: selectedBerry,
  };

  if (catchResult) {
    state.caught.push({
      id: p.id, cp: wildCP, shiny: wildIsShiny,
      date: Date.now(), ball: selectedBall,
    });
    state.xp += xpGain;
    state.level = CONFIG.getLevel(state.xp);
    // candy
    const candyKey = p.id;
    inventory.candy[candyKey] = (inventory.candy[candyKey] || 0) + (selectedBerry === 'pinap' ? 6 : 3);
    // stardust
    inventory.stardust += 100 + p.difficulty * 20;
    if (throwQuality === 'great') state.greatThrows = (state.greatThrows || 0) + 1;
    if (throwQuality === 'excellent') state.excellentThrows = (state.excellentThrows || 0) + 1;
    saveInventory(inventory);
    saveState(state);
    // particles
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: screenW / 2, y: screenH * GROUND_Y_RATIO - 50,
        vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 10 - 2,
        life: 1, size: 4 + Math.random() * 4,
        color: ['#ffd700', '#4fc3f7', '#81c784', '#fff176'][Math.floor(Math.random() * 4)],
      });
    }
    playCatchSound(true);
  } else {
    state.flown = (state.flown || 0) + 1;
    saveState(state);
    playCatchSound(false);
  }

  if (selectedBerry) {
    inventory[selectedBerry] = (inventory[selectedBerry] || 0) - 1;
    if (inventory[selectedBerry] < 0) inventory[selectedBerry] = 0;
    selectedBerry = null;
    saveInventory(inventory);
    renderInventory();
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
      <div style="color:#bfa07a;font-size:1.1rem;">${t('CP')} ${data.cp}</div>
      <div style="color:#8a7b65;font-size:0.85rem;margin-top:0.3rem;">${t(data.throwQuality + ' throw')} · +${data.xpGain} XP</div>
      ${data.shiny ? '<div style="color:#ffd700;margin-top:0.3rem;font-size:0.9rem;">✨ SHINY ✨</div>' : ''}
    `;
    btn.textContent = t('Continue');
  } else {
    title.textContent = t('Oh no! The Pokémon broke free!');
    title.style.color = '#e57373';
    body.innerHTML = `
      <img src="${artworkUrl(data.pokemon) || ''}" alt=""
           onerror="this.style.display='none'"
           style="width:100px;height:100px;object-fit:contain;display:block;margin:0.3rem auto 0;opacity:0.85;">
      <div style="font-size:2rem;margin:0.3rem 0;">${data.pokemon.name[tLang()]}</div>
      <div style="color:#8a7b65;font-size:0.9rem;">${t('It was too strong... Try a better ball or berry!')}</div>
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
// other window.* functions already defined above

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

/* ================== UI RENDERING ================== */
const dexGenOf = (p) => p.gen || 1;
let dexGenFilter = localStorage.getItem('pokemon-dexgen') || '1';

function renderPokedex() {
  const container = document.getElementById('pokedex-grid');
  if (!container) return;
  container.innerHTML = '';

  // filtro per generazione (Gen 1…9 + tutte)
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

  const lista = dexGenFilter === 'all'
    ? CONFIG.pokedex
    : CONFIG.pokedex.filter(p => dexGenOf(p) === +dexGenFilter);

  const caughtIds = state.caught.map(c => c.id);
  const seenIds = state.seen || [];

  lista.forEach(p => {
    const isCaught = caughtIds.includes(p.id);
    const isSeen = seenIds.includes(p.id);
    const caughtCount = caughtIds.filter(id => id === p.id).length;
    const candyCount = inventory.candy[p.id] || 0;

    const card = document.createElement('div');
    card.className = 'pd-card' + (isCaught ? ' caught' : isSeen ? ' seen' : '');

    const typeHtml = p.types.map(t =>
      `<span class="type-tag" style="background:${CONFIG.types[t].color}22;color:${CONFIG.types[t].color};border:1px solid ${CONFIG.types[t].color}44;">${CONFIG.types[t][tLang()]}</span>`
    ).join('');

    card.innerHTML = `
      <div class="pd-sprite" id="sprite-${p.id}"></div>
      <div class="pd-name">${isCaught || isSeen ? p.name[tLang()] : '???'}</div>
      <div class="pd-types">${typeHtml}</div>
      <div class="pd-meta">
        <span>${t('Caught')}: ${caughtCount}</span>
        <span>🍬 ${candyCount}</span>
        ${caughtIds.some(id => id === p.id) && state.caught.find(c => c.id === p.id)?.shiny ? '<span style="color:#ffd700;">✨</span>' : ''}
      </div>
      ${p.candyToEvolve && isCaught ? `<div class="pd-evolve${candyCount >= p.candyToEvolve ? ' ready' : ''}"${candyCount >= p.candyToEvolve ? ` onclick="window.evolvePokemon('${p.id}');event.stopPropagation();" style="cursor:pointer;"` : ''}>⚡ ${t('Evolves')} (${Math.min(candyCount, p.candyToEvolve)}/${p.candyToEvolve})</div>` : ''}
    `;
    container.appendChild(card);

    // sprite: artwork reale da PokeAPI; silhouette per i visti non catturati;
    // fallback low-poly procedurale se lo sprite non è raggiungibile
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

  // contatore Pokédex
  const count = document.getElementById('pokedex-count');
  if (count) {
    const unici = new Set(caughtIds).size;
    count.textContent = t('Caught') + ': ' + unici + ' / ' + CONFIG.pokedex.length +
      ' · ' + t('Seen') + ': ' + seenIds.length;
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

  // Balls section
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

  // Berries section
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

  // Stardust & summary
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
  // draw avatar
  requestAnimationFrame(() => {
    const ac = document.getElementById('avatar-canvas');
    if (!ac) return;
    const c = ac.getContext('2d');
    // simple low poly trainer avatar
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
    <div style="font-family:'Cinzel Decorative',serif;color:#bfa07a;font-size:1.1rem;">${wildPokemon.name[tLang()]} ${wildIsShiny ? '✨' : ''}</div>
    <div style="font-size:0.8rem;color:#8a7b65;">CP ${wildCP} · ${t('Difficulty')} ${wildPokemon.difficulty}/10</div>
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
  if (tab === 'trainer') renderTrainer();
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
  // update menu text
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
  if (inst) inst.id = evoId; // evolve l'istanza più recente
  if (!state.seen.includes(evoId)) state.seen.push(evoId);
  inventory.candy[evoId] = (inventory.candy[evoId] || 0) + 1;
  saveInventory(inventory);
  saveState(state);
  renderPokedex();
  renderInventory();
  renderTrainer();
  updateTopBar();
  playCatchSound(true);
  alert(`⚡ ${t('Evolved!')} ${evo.name[tLang()]}`);
};

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
