import { ENEMIES, PALETTES } from './content.js';
import { VIEW_H, VIEW_W } from './config.js';
import { hasLineOfSight } from './collision.js';

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = VIEW_W;
  let viewH = VIEW_H;
  canvas.width = viewW;
  canvas.height = viewH;
  ctx.imageSmoothingEnabled = false;

  let time = 0;
  let reducedMotion = false;
  let shakeEnabled = true;
  let shake = 0;
  let cache = null;
  let cacheKey = '';
  let menuRng = 17;
  const particles = [];
  const floats = [];
  const decals = [];
  const flashes = [];
  const rain = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 67) % viewW,
    y: (i * 31) % viewH,
    speed: 24 + (i % 7) * 6,
    length: 2 + (i % 3)
  }));

  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
  }

  function setShake(value) {
    shakeEnabled = Boolean(value);
  }

  function resizeView(nextWidth, nextHeight) {
    viewW = Math.max(160, Math.round(nextWidth));
    viewH = Math.max(160, Math.round(nextHeight));
    canvas.width = viewW;
    canvas.height = viewH;
    ctx.imageSmoothingEnabled = false;
  }

  function addParticles(x, y, color, count, speed, life = 0.5, gravity = 0) {
    const actual = reducedMotion ? Math.ceil(count * 0.35) : count;
    for (let i = 0; i < actual; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.9);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        color,
        gravity,
        size: 1 + Math.random() * 1.5
      });
    }
    if (particles.length > 300) particles.splice(0, particles.length - 300);
  }

  function addFloat(x, y, text, color) {
    floats.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
    if (floats.length > 25) floats.shift();
  }

  function addFlash(x, y, angle, color) {
    flashes.push({ x, y, angle, color, life: 0.07, maxLife: 0.07 });
  }

  function handleEvent(event) {
    if (!event) return;
    switch (event.type) {
      case 'shoot':
      case 'chaseShoot':
        addFlash(event.x, event.y, event.angle || -Math.PI / 2, '#ffe0a0');
        addParticles(event.x, event.y, '#ffd27a', 3, 32, 0.16);
        break;
      case 'enemyShoot':
      case 'chaseEnemyShoot':
        addFlash(event.x, event.y, event.angle || Math.PI / 2, '#ff9d72');
        break;
      case 'hit':
        addParticles(event.x, event.y, event.crit ? '#ffd27a' : '#a8322a', event.crit ? 12 : 6, event.crit ? 75 : 45, 0.35, 40);
        if (event.crit) addFloat(event.x, event.y - 5, 'BOOM', '#ffe0a0');
        break;
      case 'kill':
      case 'takedown':
        addParticles(event.x, event.y, '#7d1d1c', event.boss ? 28 : 13, 55, 0.6, 35);
        decals.push({ x: event.x, y: event.y, r: 4 + Math.random() * 5, color: '#4a1112', life: 999 });
        if (decals.length > 40) decals.shift();
        break;
      case 'hurt':
      case 'chaseHurt':
        addParticles(event.x, event.y, '#b53a30', 12, 60, 0.45, 25);
        shake = Math.max(shake, shakeEnabled ? 3 : 0);
        break;
      case 'ricochet':
        addParticles(event.x, event.y, '#ffe29a', 8, 65, 0.3);
        addFloat(event.x, event.y - 4, 'RIMBALZO', '#ffe29a');
        break;
      case 'impact':
        addParticles(event.x, event.y, '#b8a98f', 4, 30, 0.22);
        break;
      case 'explosion':
        addParticles(event.x, event.y, '#e06032', 30, 100, 0.7, 30);
        addParticles(event.x, event.y, '#ffd27a', 14, 65, 0.5);
        shake = Math.max(shake, shakeEnabled ? 5 : 0);
        break;
      case 'crash':
        addParticles(event.x, event.y, '#ffb27a', 18, 80, 0.4);
        shake = Math.max(shake, shakeEnabled ? 5 : 0);
        break;
      case 'bossDown':
        addFloat(event.x, event.y - 12, 'FINE', '#ffdc8c');
        shake = Math.max(shake, shakeEnabled ? 6 : 0);
        break;
      case 'death':
        shake = Math.max(shake, shakeEnabled ? 5 : 0);
        break;
      case 'objective':
        addFloat(viewW / 2, viewH / 2 - 20, 'OBIETTIVO', '#f0d27a');
        break;
      default:
        break;
    }
  }

  function reset() {
    particles.length = 0;
    floats.length = 0;
    decals.length = 0;
    flashes.length = 0;
    shake = 0;
  }

  function ensureCache(level) {
    const key = `${level.id}:${level.theme}`;
    if (cacheKey === key && cache) return cache;
    cacheKey = key;
    cache = document.createElement('canvas');
    cache.width = level.width;
    cache.height = level.height;
    const c = cache.getContext('2d');
    c.imageSmoothingEnabled = false;
    const palette = PALETTES[level.theme] || PALETTES.casa;
    drawFloor(c, level, palette);
    drawWalls(c, level, palette);
    drawProps(c, level, palette);
    drawLighting(c, level);
    return cache;
  }

  function seeded(seed) {
    let value = seed;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function drawFloor(c, level, palette) {
    c.fillStyle = palette.floorA;
    c.fillRect(0, 0, level.width, level.height);
    const tile = 16;
    for (let y = 0; y < level.height; y += tile) {
      for (let x = 0; x < level.width; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) {
          c.fillStyle = palette.floorB;
          c.fillRect(x, y, tile, tile);
        }
        c.globalAlpha = 0.08;
        c.strokeStyle = palette.paper;
        c.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
        c.globalAlpha = 1;
      }
    }
    const rng = seeded(level.id.length * 997 + level.width);
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(rng() * level.width);
      const y = Math.floor(rng() * level.height);
      const color = rng() < 0.5 ? palette.shadow : palette.trim;
      c.globalAlpha = 0.12 + rng() * 0.12;
      c.fillStyle = color;
      c.fillRect(x, y, 1 + Math.floor(rng() * 3), 1);
    }
    c.globalAlpha = 1;
  }

  function drawWalls(c, level, palette) {
    for (const wall of level.walls) {
      c.fillStyle = palette.shadow;
      c.fillRect(wall.x + 2, wall.y + 3, wall.w, wall.h);
      c.fillStyle = palette.wall;
      c.fillRect(wall.x, wall.y, wall.w, wall.h);
      c.fillStyle = palette.wallTop;
      c.fillRect(wall.x, wall.y, wall.w, 3);
      c.fillStyle = 'rgba(0,0,0,.2)';
      for (let x = wall.x + 8; x < wall.x + wall.w; x += 16) {
        c.fillRect(x, wall.y + 5, 1, wall.h - 5);
      }
      for (let y = wall.y + 10; y < wall.y + wall.h; y += 12) {
        c.fillRect(wall.x, y, wall.w, 1);
      }
      c.strokeStyle = 'rgba(0,0,0,.25)';
      c.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
    }
  }

  function drawProps(c, level, palette) {
    for (const prop of level.props) {
      if (prop.decor) {
        if (prop.type === 'rug') {
          c.fillStyle = prop.color || palette.accent;
          c.globalAlpha = 0.52;
          c.fillRect(prop.x, prop.y, prop.w, prop.h);
          c.globalAlpha = 0.45;
          c.strokeStyle = palette.trim;
          c.strokeRect(prop.x + 2.5, prop.y + 2.5, prop.w - 5, prop.h - 5);
          c.strokeRect(prop.x + 6.5, prop.y + 6.5, prop.w - 13, prop.h - 13);
          c.globalAlpha = 1;
        } else if (prop.type === 'puddle') {
          c.globalAlpha = 0.32;
          c.fillStyle = prop.color || '#1a3138';
          c.beginPath();
          c.ellipse(prop.x + prop.w / 2, prop.y + prop.h / 2, prop.w / 2, prop.h / 2, 0, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 0.18;
          c.strokeStyle = palette.paper;
          c.stroke();
          c.globalAlpha = 1;
        } else if (prop.type === 'tiles') {
          c.globalAlpha = 0.45;
          c.fillStyle = prop.color || '#1b2a33';
          c.fillRect(prop.x, prop.y, prop.w, prop.h);
          c.globalAlpha = 0.2;
          c.strokeStyle = palette.paper;
          for (let x = prop.x + 16; x < prop.x + prop.w; x += 16) c.strokeRect(x, prop.y, 16, prop.h);
          c.globalAlpha = 1;
        } else if (prop.type === 'water') {
          c.fillStyle = prop.color || '#10242c';
          c.fillRect(prop.x, prop.y, prop.w, prop.h);
          c.globalAlpha = 0.18;
          for (let y = prop.y + 4; y < prop.y + prop.h; y += 7) {
            c.fillStyle = palette.paper;
            c.fillRect(prop.x + 6, y, prop.w - 12, 1);
          }
          c.globalAlpha = 1;
        }
        continue;
      }
      if (prop.sign) {
        drawSign(c, prop, palette);
        continue;
      }
      if (!prop.cover && !prop.solid) continue;
      const shadow = palette.shadow;
      c.fillStyle = shadow;
      c.fillRect(prop.x + 2, prop.y + 3, prop.w, prop.h);
      if (prop.type === 'sofa') {
        rect(c, prop.x, prop.y, prop.w, prop.h, prop.color === 'red' ? palette.accent : palette.wall);
        rect(c, prop.x + 2, prop.y + 2, prop.w - 4, 5, palette.trim);
        line(c, prop.x + prop.w / 2, prop.y + 2, prop.x + prop.w / 2, prop.y + prop.h - 2, palette.shadow);
      } else if (prop.type === 'bar' || prop.type === 'table') {
        rect(c, prop.x, prop.y, prop.w, prop.h, '#3a2418');
        rect(c, prop.x, prop.y, prop.w, 3, '#805032');
        rect(c, prop.x + 3, prop.y + 4, 3, 3, palette.gold);
        rect(c, prop.x + 9, prop.y + 4, 2, 2, palette.teal);
      } else if (prop.type === 'desk') {
        rect(c, prop.x, prop.y, prop.w, prop.h, '#2c4144');
        rect(c, prop.x, prop.y, prop.w, 3, palette.wallTop);
        rect(c, prop.x + 7, prop.y + 5, 6, 4, palette.paper);
      } else if (prop.type === 'crate' || prop.type === 'container') {
        rect(c, prop.x, prop.y, prop.w, prop.h, prop.color === 'teal' ? '#2e5a56' : prop.color === 'red' ? '#6d2c28' : '#5a3d24');
        c.strokeStyle = palette.shadow;
        c.strokeRect(prop.x + 1.5, prop.y + 1.5, prop.w - 3, prop.h - 3);
        line(c, prop.x + 3, prop.y + 3, prop.x + prop.w - 3, prop.y + prop.h - 3, palette.trim);
      } else if (prop.type === 'piano') {
        rect(c, prop.x, prop.y, prop.w, prop.h, '#171415');
        for (let x = prop.x + 3; x < prop.x + prop.w - 3; x += 4) rect(c, x, prop.y + prop.h - 5, 2, 3, palette.paper);
      } else if (prop.type === 'plant') {
        rect(c, prop.x + 4, prop.y + 8, prop.w - 8, prop.h - 8, '#4b2a1c');
        rect(c, prop.x + 2, prop.y + 1, prop.w - 4, 9, '#2d6b48');
      } else if (prop.type === 'pillar') {
        rect(c, prop.x, prop.y, prop.w, prop.h, palette.wallTop);
        rect(c, prop.x + 3, prop.y + 2, prop.w - 6, prop.h - 4, palette.wall);
      } else if (prop.type === 'car') {
        rect(c, prop.x, prop.y + 3, prop.w, prop.h - 6, '#1c2024');
        rect(c, prop.x + 8, prop.y, prop.w - 16, prop.h, '#303a42');
        rect(c, prop.x + 4, prop.y + 5, prop.w - 8, 4, palette.teal);
      } else if (prop.type === 'bench') {
        rect(c, prop.x, prop.y + 4, prop.w, prop.h - 8, '#4b3520');
        rect(c, prop.x, prop.y + 4, prop.w, 2, '#8a6a3d');
        rect(c, prop.x + 2, prop.y + prop.h - 5, 2, 4, '#21180f');
        rect(c, prop.x + prop.w - 4, prop.y + prop.h - 5, 2, 4, '#21180f');
      } else if (prop.type === 'ticket') {
        rect(c, prop.x, prop.y, prop.w, prop.h, '#2b4650');
        rect(c, prop.x + 4, prop.y + 3, prop.w - 8, 7, '#0d171c');
        rect(c, prop.x + 6, prop.y + 6, 6, 2, palette.neon);
      } else if (prop.type === 'kiosk') {
        rect(c, prop.x, prop.y, prop.w, prop.h, '#5e2a25');
        rect(c, prop.x - 2, prop.y - 3, prop.w + 4, 5, '#d7b25f');
        rect(c, prop.x + 8, prop.y + 8, prop.w - 16, 10, '#162027');
        rect(c, prop.x + prop.w - 10, prop.y + 4, 4, 4, palette.neon);
      } else if (prop.type === 'fountain') {
        rect(c, prop.x, prop.y, prop.w, prop.h, '#3b5054');
        rect(c, prop.x + 4, prop.y + 4, prop.w - 8, prop.h - 8, '#17333a');
        rect(c, prop.x + prop.w / 2 - 3, prop.y + 8, 6, prop.h - 16, '#54757a');
        rect(c, prop.x + 8, prop.y + prop.h / 2 - 2, prop.w - 16, 4, '#54757a');
      } else {
        rect(c, prop.x, prop.y, prop.w, prop.h, palette.wall);
        rect(c, prop.x, prop.y, prop.w, 2, palette.wallTop);
      }
    }
  }

  function drawLighting(c, level) {
    const lights = level.id === 'casa'
      ? [[118, 86, 105], [318, 214, 115], [518, 78, 95], [260, 300, 90]]
      : level.id === 'torre'
        ? [[114, 300, 95], [310, 120, 110], [500, 80, 100], [540, 280, 90]]
        : [[92, 170, 90], [260, 110, 100], [440, 120, 110]];
    for (const [x, y, radius] of lights) {
      const glow = c.createRadialGradient(x, y, 4, x, y, radius);
      glow.addColorStop(0, 'rgba(240, 190, 110, .075)');
      glow.addColorStop(1, 'rgba(240, 190, 110, 0)');
      c.fillStyle = glow;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  function drawSign(c, prop, palette) {
    const color = prop.neon || palette.neon;
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = color;
    if (prop.axis === 'v') c.fillRect(prop.x - 3, prop.y - 2, prop.w + 6, prop.h + 4);
    else c.fillRect(prop.x - 2, prop.y - 3, prop.w + 4, prop.h + 6);
    c.globalAlpha = 1;
    rect(c, prop.x, prop.y, prop.w, prop.h, '#171418');
    c.strokeStyle = color;
    c.lineWidth = 1;
    c.strokeRect(prop.x + 0.5, prop.y + 0.5, prop.w - 1, prop.h - 1);
    c.fillStyle = color;
    if (prop.axis === 'v') {
      for (let y = prop.y + 4; y < prop.y + prop.h - 3; y += 5) c.fillRect(prop.x + 2, y, prop.w - 4, 2);
    } else {
      for (let x = prop.x + 4; x < prop.x + prop.w - 3; x += 6) c.fillRect(x, prop.y + 2, 3, prop.h - 4);
    }
    c.restore();
  }

  function drawMenuBackdrop(dt) {
    const palette = PALETTES.menu;
    const gradient = ctx.createLinearGradient(0, 0, 0, viewH);
    gradient.addColorStop(0, palette.sky0);
    gradient.addColorStop(0.65, palette.sky1);
    gradient.addColorStop(1, palette.sky2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);
    const glow = ctx.createRadialGradient(300, 50, 0, 300, 50, 120);
    glow.addColorStop(0, 'rgba(224,179,92,.16)');
    glow.addColorStop(1, 'rgba(224,179,92,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.fillStyle = '#100c10';
    ctx.beginPath();
    ctx.moveTo(0, 156);
    ctx.lineTo(20, 140);
    ctx.lineTo(44, 148);
    ctx.lineTo(58, 126);
    ctx.lineTo(74, 136);
    ctx.lineTo(92, 112);
    ctx.lineTo(112, 130);
    ctx.lineTo(136, 118);
    ctx.lineTo(156, 138);
    ctx.lineTo(178, 102);
    ctx.lineTo(196, 128);
    ctx.lineTo(214, 96);
    ctx.lineTo(238, 120);
    ctx.lineTo(256, 90);
    ctx.lineTo(274, 122);
    ctx.lineTo(296, 108);
    ctx.lineTo(318, 136);
    ctx.lineTo(342, 118);
    ctx.lineTo(360, 142);
    ctx.lineTo(384, 132);
    ctx.lineTo(384, 216);
    ctx.lineTo(0, 216);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#08070a';
    ctx.beginPath();
    ctx.moveTo(136, 152);
    ctx.lineTo(136, 120);
    ctx.lineTo(144, 108);
    ctx.lineTo(152, 120);
    ctx.lineTo(152, 98);
    ctx.lineTo(160, 82);
    ctx.lineTo(168, 98);
    ctx.lineTo(168, 120);
    ctx.lineTo(176, 108);
    ctx.lineTo(184, 120);
    ctx.lineTo(184, 152);
    ctx.closePath();
    ctx.fill();
    rect(ctx, 158, 94, 4, 12, palette.gold);
    for (let i = 0; i < 5; i++) {
      rect(ctx, 132 + i * 11, 146, 5, 20, '#08070a');
      rect(ctx, 132 + i * 11, 146, 2, 20, palette.red);
    }

    const rng = seeded(77);
    for (const drop of rain) {
      const y = (drop.y + time * drop.speed) % (viewH + 20);
      line(ctx, drop.x + (time * 8) % 20, y, drop.x + (time * 8) % 20 - 2, y + drop.length, 'rgba(220,210,190,.18)', 1);
    }
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 61;
      const y = 184 + (i % 3) * 5;
      rect(ctx, x, y, 36, 2, 'rgba(200,68,54,.2)');
      rect(ctx, x + 5, y + 4, 24, 1, 'rgba(224,179,92,.16)');
    }
    const carX = 70 + Math.sin(time * 0.25) * 5;
    rect(ctx, carX, 176, 44, 12, '#0a090b');
    rect(ctx, carX + 8, 171, 28, 7, '#171317');
    rect(ctx, carX + 4, 181, 4, 3, '#d8b467');
    rect(ctx, carX + 35, 181, 4, 3, '#d8b467');

    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 14; i++) {
      const x = (rng() * viewW + time * 4) % viewW;
      const y = (rng() * 140 + time * 8) % 170;
      rect(ctx, x, y, 1, 1, palette.gold);
    }
    ctx.globalAlpha = 1;
    drawFilmGrain(0.8);
  }

  function drawLevel(state) {
    const palette = PALETTES[state.level.theme] || PALETTES.casa;
    const staticLevel = ensureCache(state.level);
    const camX = Math.floor(state.camera.x);
    const camY = Math.floor(state.camera.y);
    ctx.save();
    const globalShake = shakeEnabled && !reducedMotion ? shake : 0;
    ctx.translate(
      -camX + (globalShake ? (Math.random() - 0.5) * globalShake : 0),
      -camY + (globalShake ? (Math.random() - 0.5) * globalShake : 0)
    );
    ctx.drawImage(staticLevel, 0, 0);
    drawHazards(state);
    for (const decal of decals) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = decal.color;
      ctx.beginPath();
      ctx.arc(decal.x, decal.y, decal.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    drawVisionCones(state);
    drawObjective(state, palette);
    drawPickups(state, palette);
    drawFires(state);
    drawMolotovs(state);
    drawEnemies(state, palette);
    drawPlayer(state, palette);
    drawBullets(state);
    drawFlashes();
    drawParticles();
    drawReticle(state, palette);
    ctx.restore();
    drawRain(state);
    drawCompass(state);
    drawFilmGrain(1);
    drawVignette(palette);
    drawLowHealth(state);
  }

  function drawHazards(state) {
    if (!state.hazards) return;
    for (const hazard of state.hazards) {
      const top = hazard.y;
      const height = hazard.height;
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(0, top, state.width, height);
      ctx.fillStyle = 'rgba(223,190,110,.42)';
      ctx.fillRect(0, top + 5, state.width, 1);
      ctx.fillRect(0, top + height - 6, state.width, 1);
      ctx.fillStyle = 'rgba(240,228,200,.12)';
      for (let x = 4; x < state.width; x += 24) {
        ctx.fillRect(x, top + 12, 12, 2);
        ctx.fillRect(x + 8, top + height - 14, 12, 2);
      }
      if (hazard.warning) {
        const pulse = 0.3 + Math.sin(time * 12) * 0.2;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff5a4e';
        ctx.fillRect(0, top - 3, state.width, 3);
        ctx.fillRect(0, top + height, state.width, 3);
        ctx.globalAlpha = 1;
      }
      if (hazard.active) {
        const progress = Math.min(1, (hazard.time - hazard.warnTime) / hazard.activeTime);
        const trainWidth = 150;
        const trainX = hazard.direction > 0
          ? -trainWidth + progress * (state.width + trainWidth * 2)
          : state.width + trainWidth - progress * (state.width + trainWidth * 2);
        rect(ctx, trainX, top - 4, trainWidth, height + 8, '#14191d');
        rect(ctx, trainX + 7, top + 2, trainWidth - 14, height - 4, '#263136');
        for (let x = trainX + 16; x < trainX + trainWidth - 16; x += 22) {
          rect(ctx, x, top + 8, 12, 5, hazard.direction > 0 ? '#e0b35c' : '#ff7a57');
        }
        rect(ctx, hazard.direction > 0 ? trainX + trainWidth - 8 : trainX + 2, top + 8, 6, height - 16, '#fff0b5');
      }
    }
  }

  function drawRain(state) {
    if (state.level?.weather !== 'rain' || reducedMotion) return;
    for (const drop of rain) {
      const y = (drop.y + time * drop.speed * 1.8) % 216;
      const x = (drop.x + time * 14) % 384;
      line(ctx, x, y, x - 2, y + drop.length + 2, 'rgba(220,230,220,.2)', 1);
    }
    ctx.globalAlpha = 0.08;
    rect(ctx, 0, 0, 384, 216, '#8eb6b4');
    ctx.globalAlpha = 1;
  }

  function drawCompass(state) {
    const objective = state.objective;
    if (!objective || state.mode === 'chase' || state.phase !== 'playing') return;
    let target = null;
    if (objective.type === 'collect' && !objective.done) target = { x: objective.x, y: objective.y };
    else if (state.exitOpen && state.level.exit) target = { x: state.level.exit.x + state.level.exit.w / 2, y: state.level.exit.y + state.level.exit.h / 2 };
    else if (state.boss && !state.boss.dead) target = { x: state.boss.x, y: state.boss.y };
    if (!target) return;
    const sx = target.x - state.camera.x;
    const sy = target.y - state.camera.y;
    if (sx > 18 && sx < 366 && sy > 18 && sy < 198) return;
    const cx = 192;
    const cy = 108;
    const angle = Math.atan2(sy - cy, sx - cx);
    const x = Math.max(16, Math.min(368, sx));
    const y = Math.max(16, Math.min(200, sy));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = paletteFor(state).gold;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function paletteFor(state) {
    return PALETTES[state.level?.theme] || PALETTES.casa;
  }

  function drawVisionCones(state) {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const def = ENEMIES[enemy.type] || ENEMIES.thug;
      if (enemy.state !== 'combat') {
        const range = 32;
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#f0d27a';
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.arc(enemy.x, enemy.y, range, enemy.angle - (def.fov || 1) / 2, enemy.angle + (def.fov || 1) / 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (enemy.type === 'sniper' && enemy.aimTimer > 0 && state.player && !state.player.dead) {
        if (hasLineOfSight(state.level, enemy.x, enemy.y, state.player.x, state.player.y)) {
          ctx.globalAlpha = 0.22 + Math.sin(time * 25) * 0.1;
          line(ctx, enemy.x, enemy.y, state.player.x, state.player.y, '#ff5a4e', 1);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawObjective(state, palette) {
    if (state.objective.type === 'collect' && !state.objective.done) {
      const x = state.objective.x;
      const y = state.objective.y;
      const pulse = 1 + Math.sin(time * 5) * 0.18;
      ctx.globalAlpha = 0.18;
      rect(ctx, x - 9, y - 5, 18, 10, palette.gold);
      ctx.globalAlpha = 1;
      rect(ctx, x - 5, y - 4, 10, 8, '#171418');
      rect(ctx, x - 3, y - 2, 6, 4, '#d7c79b');
      rect(ctx, x - 2, y - 1, 2, 1, '#3b2b1d');
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 9 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.level.exit) {
      const exit = state.level.exit;
      rect(ctx, exit.x, exit.y, exit.w, exit.h, state.exitOpen ? '#382219' : '#181516');
      ctx.strokeStyle = state.exitOpen ? palette.gold : 'rgba(120,110,100,.25)';
      ctx.strokeRect(exit.x + 0.5, exit.y + 0.5, exit.w - 1, exit.h - 1);
      if (state.exitOpen) {
        ctx.globalAlpha = 0.14 + Math.sin(time * 4) * 0.05;
        rect(ctx, exit.x - 3, exit.y - 3, exit.w + 6, exit.h + 6, palette.gold);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawPickups(state, palette) {
    for (const pickup of state.pickups) {
      const bob = Math.sin(time * 3 + pickup.x) * 2;
      const color = pickup.type === 'health' ? '#d56358' : pickup.type === 'molotov' ? '#e09a4d' : palette.gold;
      ctx.globalAlpha = 0.2;
      rect(ctx, pickup.x - 5, pickup.y + bob - 5, 10, 10, color);
      ctx.globalAlpha = 1;
      rect(ctx, pickup.x - 3, pickup.y + bob - 3, 6, 6, color);
      rect(ctx, pickup.x - 1, pickup.y + bob - 1, 2, 2, '#241713');
      if (pickup.type === 'health') {
        rect(ctx, pickup.x - 1, pickup.y + bob - 3, 2, 6, '#f0d7b4');
        rect(ctx, pickup.x - 3, pickup.y + bob - 1, 6, 2, '#f0d7b4');
      }
    }
  }

  function drawFires(state) {
    for (const fire of state.fires) {
      const pulse = Math.sin(time * 12 + fire.x) * 2;
      ctx.globalAlpha = 0.15;
      rect(ctx, fire.x - fire.radius, fire.y - fire.radius, fire.radius * 2, fire.radius * 2, '#e06032');
      ctx.globalAlpha = 0.7;
      rect(ctx, fire.x - 4, fire.y - 4 + pulse, 8, 8, '#e06032');
      rect(ctx, fire.x - 2, fire.y - 7 + pulse, 4, 8, '#ffd27a');
      ctx.globalAlpha = 1;
    }
  }

  function drawMolotovs(state) {
    for (const molotov of state.molotovs) {
      rect(ctx, molotov.x - 2, molotov.y - 2, 4, 4, '#d6a052');
      rect(ctx, molotov.x - 1, molotov.y - 4, 2, 2, '#ffd27a');
    }
  }

  function drawEnemies(state, palette) {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const def = ENEMIES[enemy.type] || ENEMIES.thug;
      const color = def.color;
      const dark = def.dark;
      const scale = enemy.boss ? 1.55 : 1;
      ctx.save();
      ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
      ctx.scale(scale, scale);
      const flash = enemy.flash > 0;
      rect(ctx, -4, 3, 8, 2, 'rgba(0,0,0,.3)');
      const bob = Math.sin(time * 7 + enemy.index) * 0.5;
      rect(ctx, -4, -7 + bob, 8, 8, flash ? '#fff3d8' : dark);
      rect(ctx, -3, -10 + bob, 6, 5, flash ? '#fff3d8' : color);
      rect(ctx, -2, -11 + bob, 4, 3, '#d3a277');
      rect(ctx, -3, -13 + bob, 6, 2, '#201713');
      line(ctx, 0, -7 + bob, Math.cos(enemy.angle) * 7, -7 + Math.sin(enemy.angle) * 7, '#d8cbb0', 1);
      if (enemy.state === 'combat') {
        rect(ctx, -9, -18, 2, 2, '#d34c3d');
      }
      if (enemy.boss) {
        rect(ctx, -5, -16, 10, 2, '#e0b35c');
        rect(ctx, -2, -19, 4, 3, '#e0b35c');
        rect(ctx, -7, 7, 14, 1, 'rgba(0,0,0,.35)');
      }
      ctx.restore();
    }
  }

  function drawPlayer(state, palette) {
    const player = state.player;
    if (player.dead) {
      ctx.save();
      ctx.translate(Math.round(player.x), Math.round(player.y));
      rect(ctx, -5, 1, 10, 2, '#3a1514');
      rect(ctx, -4, -1, 8, 3, '#251b1a');
      ctx.restore();
      return;
    }
    const crouch = player.crouched ? 2 : 0;
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));
    if (player.invuln > 0 && Math.floor(time * 24) % 2 === 0) ctx.globalAlpha = 0.5;
    rect(ctx, -4, 3, 8, 2, 'rgba(0,0,0,.32)');
    const bob = player.moving ? Math.sin(player.walk) * 0.7 : 0;
    rect(ctx, -4, -6 + crouch + bob, 8, 8 - crouch, '#25252b');
    rect(ctx, -3, -10 + crouch + bob, 6, 5, '#cfc1a4');
    rect(ctx, -2, -11 + crouch + bob, 4, 3, '#d5a77e');
    rect(ctx, -3, -13 + crouch + bob, 6, 2, '#16110f');
    rect(ctx, -5, -7 + crouch, 2, 3, '#a93b32');
    const armX = Math.cos(player.angle) * 7;
    const armY = Math.sin(player.angle) * 7 - 7 + crouch;
    line(ctx, 0, -7 + crouch, armX, armY, '#cfc1a4', 2);
    line(ctx, armX, armY, armX + Math.cos(player.angle) * 4, armY + Math.sin(player.angle) * 4, '#c7c7b8', 1);
    if (player.cover) {
      ctx.globalAlpha = 0.18;
      rect(ctx, -7, -8, 14, 13, '#f0d27a');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBullets(state) {
    for (const bullet of state.bullets) {
      const color = bullet.team === 'player' ? '#ffd27a' : '#ff7a57';
      line(ctx, bullet.x - bullet.vx * 0.012, bullet.y - bullet.vy * 0.012, bullet.x, bullet.y, color, bullet.team === 'player' ? 1 : 1.4);
      rect(ctx, bullet.x - 0.5, bullet.y - 0.5, 1.5, 1.5, '#fff1c7');
    }
  }

  function drawFlashes() {
    for (const flash of flashes) {
      ctx.globalAlpha = Math.max(0, flash.life / flash.maxLife);
      const x = flash.x + Math.cos(flash.angle) * 6;
      const y = flash.y + Math.sin(flash.angle) * 6;
      rect(ctx, x - 2, y - 2, 4, 4, flash.color);
      rect(ctx, x - 1, y - 4, 2, 8, flash.color);
      ctx.globalAlpha = 1;
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      rect(ctx, particle.x, particle.y, particle.size, particle.size, particle.color);
    }
    for (const float of floats) {
      ctx.globalAlpha = Math.max(0, float.life / float.maxLife);
      ctx.fillStyle = float.color;
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(float.text, Math.round(float.x), Math.round(float.y));
    }
    ctx.globalAlpha = 1;
  }

  function drawReticle(state, palette) {
    const player = state.player;
    if (!player || state.phase !== 'playing') return;
    const distance = 36;
    const x = state.reticle?.x ?? player.x + Math.cos(player.angle) * distance;
    const y = state.reticle?.y ?? player.y + Math.sin(player.angle) * distance;
    ctx.strokeStyle = palette.gold;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.stroke();
    line(ctx, x - 7, y, x - 2, y, palette.gold);
    line(ctx, x + 2, y, x + 7, y, palette.gold);
    line(ctx, x, y - 7, x, y - 2, palette.gold);
    line(ctx, x, y + 2, x, y + 7, palette.gold);
    ctx.globalAlpha = 1;
  }

  function drawChase(state) {
    const palette = PALETTES.chase;
    const chase = state.chase;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, viewW, viewH);
    const sky = ctx.createLinearGradient(0, 0, 0, 100);
    sky.addColorStop(0, '#080b12');
    sky.addColorStop(1, '#24171b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, 100);
    ctx.fillStyle = '#111217';
    ctx.fillRect(0, 74, viewW, 52);
    for (let i = 0; i < 10; i++) {
      const x = i * 43;
      const top = 58 + (i % 4) * 7;
      rect(ctx, x, top, 24, 90 - top, '#15151c');
      rect(ctx, x + 3, top + 6, 2, 3, i % 2 ? palette.gold : palette.teal);
      rect(ctx, x + 10, top + 8, 2, 2, palette.red);
    }
    for (const drop of rain) {
      const y = (drop.y + time * drop.speed) % 216;
      line(ctx, drop.x + (time * 9) % 20, y, drop.x + (time * 9) % 20 - 2, y + drop.length, 'rgba(220,210,190,.2)', 1);
    }
    rect(ctx, 0, 92, viewW, 124, palette.road);
    rect(ctx, 60, 92, 8, 124, palette.curb);
    rect(ctx, 316, 92, 8, 124, palette.curb);
    for (let y = -24 + chase.scroll; y < 216; y += 24) {
      rect(ctx, 126, y, 2, 10, palette.roadLine);
      rect(ctx, 190, y + 8, 2, 10, palette.roadLine);
      rect(ctx, 254, y, 2, 10, palette.roadLine);
    }
    for (let i = 0; i < 5; i++) {
      const y = 100 + ((i * 33 + time * 55) % 120);
      rect(ctx, 70, y, 1, 12, 'rgba(255,255,255,.05)');
    }
    for (const traffic of chase.traffic) {
      drawCar(ctx, traffic.x, traffic.y, traffic.type === 'truck' ? '#8c6b37' : '#3a444a', false);
    }
    drawCar(ctx, chase.enemy.x, chase.enemy.y, '#111116', true);
    drawCar(ctx, chase.car.x, chase.car.y, palette.car, false);
    if (chase.car.hitFlash > 0) {
      ctx.globalAlpha = 0.4;
      rect(ctx, chase.car.x - 12, chase.car.y - 14, 24, 28, '#ffb27a');
      ctx.globalAlpha = 1;
    }
    for (const bullet of chase.bullets) {
      line(ctx, bullet.x - bullet.vx * 0.012, bullet.y - bullet.vy * 0.012, bullet.x, bullet.y, bullet.team === 'player' ? '#ffd27a' : '#ff7a57', 1);
    }
    drawFlashes();
    drawParticles();
    drawReticle(state, palette);
    drawFilmGrain(1);
    drawVignette(palette);
    drawLowHealth(state);
  }

  function drawCar(c, x, y, color, enemy) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    rect(ctx, -9, -13, 18, 26, 'rgba(0,0,0,.3)');
    rect(ctx, -8, -12, 16, 24, color);
    rect(ctx, -6, -10, 12, 7, '#1f2529');
    rect(ctx, -6, 4, 12, 7, '#121519');
    rect(ctx, -7, -13, 3, 2, '#ffd27a');
    rect(ctx, 4, -13, 3, 2, '#ffd27a');
    rect(ctx, -7, 11, 3, 2, '#b9322d');
    rect(ctx, 4, 11, 3, 2, '#b9322d');
    if (enemy) {
      rect(ctx, -3, -9, 6, 2, '#e0b35c');
      rect(ctx, -2, 7, 4, 2, '#d34c3d');
    }
    ctx.restore();
  }

  function drawFilmGrain(strength = 1) {
    const count = reducedMotion ? 40 : 180;
    ctx.globalAlpha = 0.12 * strength;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * viewW) | 0;
      const y = (Math.random() * viewH) | 0;
      ctx.fillStyle = Math.random() < 0.5 ? '#f1e4c8' : '#000000';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    if (!reducedMotion && Math.random() < 0.06) {
      ctx.globalAlpha = 0.12;
      rect(ctx, 0, 20 + Math.random() * 160, viewW, 1, '#f1e4c8');
      ctx.globalAlpha = 1;
    }
  }

  function drawVignette(palette) {
    const gradient = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      viewH * 0.18,
      viewW / 2,
      viewH / 2,
      viewW * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,.12)');
    gradient.addColorStop(1, 'rgba(0,0,0,.52)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.globalAlpha = 0.05;
    for (let y = 0; y < viewH; y += 4) rect(ctx, 0, y, viewW, 1, '#000');
    ctx.globalAlpha = 1;
  }

  function drawLowHealth(state) {
    const hp = state.mode === 'chase' ? state.chase.car.hp : state.player.hp;
    if (hp > 1) return;
    const pulse = 0.12 + Math.sin(time * 5) * 0.05;
    const gradient = ctx.createRadialGradient(viewW / 2, viewH, 0, viewW / 2, viewH, viewH);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.72, `rgba(150,16,18,${pulse * 0.55})`);
    gradient.addColorStop(1, `rgba(190,30,20,${pulse + 0.12})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function draw(state, dt = 1 / 60) {
    time += dt;
    shake *= Math.exp(-dt * 12);
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
      particle.vx *= 0.97;
      particle.life -= dt;
      if (particle.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      floats[i].y -= 12 * dt;
      floats[i].life -= dt;
      if (floats[i].life <= 0) floats.splice(i, 1);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].life -= dt;
      if (flashes[i].life <= 0) flashes.splice(i, 1);
    }
    if (!state) drawMenuBackdrop(dt);
    else if (state.mode === 'chase') drawChase(state);
    else drawLevel(state);
  }

  function setLevel() {
    cache = null;
    cacheKey = '';
  }

  return {
    draw,
    handleEvent,
    reset,
    setLevel,
    setReducedMotion,
    setShake,
    resizeView,
    get size() {
      return { width: viewW, height: viewH };
    }
  };
}
