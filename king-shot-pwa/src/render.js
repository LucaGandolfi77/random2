import { PALETTES, PHYSICS, clamp, launchSpeedFor, wallTopFor, windMaxFor } from './config.js';
import { PICKUPS } from './content.js';

const TAU = Math.PI * 2;
const DISPLAY = '"Arial Narrow", "Avenir Next Condensed", "Franklin Gothic Medium", sans-serif';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(c, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

function enemyColors(enemy, p) {
  if (enemy.isBoss) return [p.boss, p.bossDark];
  if (enemy.type === 'runner') return [p.runner, p.runnerDark];
  if (enemy.type === 'brute') return [p.boulder, p.boulderDark];
  if (enemy.type === 'bat') return [p.stoneLight, p.mountainNear];
  return [p.enemy, p.enemyDark];
}

export function createRenderer(canvas) {
  const c = canvas.getContext('2d', { alpha: false });
  let width = 1;
  let height = 1;
  let dpr = 1;
  let theme = 'royal';
  let palette = PALETTES.royal;
  let background = null;
  let backgroundKey = '';
  let stars = [];
  let ambient = [];
  let particles = [];
  let floats = [];
  let shake = 0;
  let time = 0;
  let reducedMotion = false;
  let shakeEnabled = true;

  function resize(nextWidth, nextHeight) {
    width = Math.max(280, Math.round(nextWidth));
    height = Math.max(420, Math.round(nextHeight));
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    buildStars();
    buildAmbient();
    buildBackground(true);
  }

  function setTheme(nextTheme) {
    if (!PALETTES[nextTheme] || nextTheme === theme) return;
    theme = nextTheme;
    palette = PALETTES[theme];
    buildStars();
    buildBackground(true);
  }

  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
  }

  function setShake(value) {
    shakeEnabled = Boolean(value);
  }

  function buildStars() {
    const rng = seeded(9107 + Math.round(width) * 3 + Math.round(height));
    const count = Math.round(clamp((width * height) / 9000, 38, 100));
    stars = Array.from({ length: count }, () => ({
      x: rng() * width,
      y: rng() * height * 0.67,
      r: 0.4 + rng() * 1.4,
      a: 0.2 + rng() * 0.7,
      tw: rng() * TAU,
      speed: 0.3 + rng() * 0.9
    }));
  }

  function buildAmbient() {
    ambient = Array.from({ length: 18 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 2.2,
      speed: 7 + Math.random() * 18,
      drift: (Math.random() - 0.5) * 8,
      phase: Math.random() * TAU,
      hue: Math.random()
    }));
  }

  function buildBackground(force = false) {
    const key = `${width}x${height}@${dpr}:${theme}`;
    if (!force && backgroundKey === key && background) return;
    backgroundKey = key;
    background = document.createElement('canvas');
    background.width = Math.round(width * dpr);
    background.height = Math.round(height * dpr);
    const bg = background.getContext('2d');
    bg.scale(dpr, dpr);
    bg.imageSmoothingEnabled = true;
    drawSky(bg);
    drawMoon(bg);
    drawMountains(bg);
    drawDistantCastle(bg);
    drawFog(bg);
    drawWall(bg);
  }

  function drawSky(g) {
    const p = palette;
    const sky = g.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, p.sky0);
    sky.addColorStop(0.5, p.sky1);
    sky.addColorStop(1, p.sky2);
    g.fillStyle = sky;
    g.fillRect(0, 0, width, height);

    const haze = g.createRadialGradient(
      width * 0.72,
      height * 0.18,
      0,
      width * 0.72,
      height * 0.18,
      height * 0.62
    );
    haze.addColorStop(0, p.moonGlow);
    haze.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.fillStyle = haze;
    g.fillRect(0, 0, width, height);

    for (const star of stars) {
      const twinkle = 0.65 + Math.sin(time * star.speed + star.tw) * 0.35;
      g.globalAlpha = star.a * twinkle;
      g.fillStyle = p.stars;
      g.beginPath();
      g.arc(star.x, star.y, star.r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function drawMoon(g) {
    const p = palette;
    const mx = width * 0.76;
    const my = height * 0.18;
    const r = Math.min(width, height) * 0.078;
    const glow = g.createRadialGradient(mx, my, r * 0.2, mx, my, r * 4.8);
    glow.addColorStop(0, p.moonGlow);
    glow.addColorStop(0.35, p.moonGlow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(mx, my, r * 4.8, 0, TAU);
    g.fill();

    g.fillStyle = p.moon;
    g.beginPath();
    g.arc(mx, my, r, 0, TAU);
    g.fill();

    g.globalAlpha = 0.14;
    g.fillStyle = p.sky1;
    for (const [cx, cy, cr] of [
      [-0.35, -0.2, 0.18],
      [0.3, 0.35, 0.12],
      [0.1, -0.52, 0.08],
      [0.43, -0.08, 0.055]
    ]) {
      g.beginPath();
      g.arc(mx + r * cx, my + r * cy, r * cr, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function drawMountains(g) {
    const p = palette;
    const horizon = height * 0.72;
    const rng = seeded(3107);
    const ridges = [
      { y: horizon - height * 0.115, amp: height * 0.075, color: p.mountainFar, step: 58 },
      { y: horizon - height * 0.045, amp: height * 0.1, color: p.mountainNear, step: 44 }
    ];

    for (const ridge of ridges) {
      let points = [];
      for (let x = -60; x <= width + 60; x += ridge.step) {
        points.push({ x, y: ridge.y - rng() * ridge.amp });
      }
      g.beginPath();
      g.moveTo(-60, height);
      for (const point of points) g.lineTo(point.x, point.y);
      g.lineTo(width + 60, height);
      g.closePath();
      g.fillStyle = ridge.color;
      g.fill();
    }

    const haze = g.createLinearGradient(0, horizon - height * 0.16, 0, horizon + 20);
    haze.addColorStop(0, 'rgba(0,0,0,0)');
    haze.addColorStop(1, p.moonGlow);
    g.fillStyle = haze;
    g.fillRect(0, horizon - height * 0.16, width, height * 0.2);
  }

  function tower(g, x, base, towerWidth, towerHeight, keep, color) {
    g.fillStyle = color;
    g.fillRect(x - towerWidth / 2, base - towerHeight, towerWidth, towerHeight);
    const merlons = Math.max(2, Math.round(towerWidth / 11));
    for (let i = 0; i < merlons; i++) {
      g.fillRect(
        x - towerWidth / 2 + (i / merlons) * towerWidth,
        base - towerHeight - 7,
        towerWidth / (merlons * 2),
        8
      );
    }
    g.globalAlpha *= 0.55;
    for (let y = base - towerHeight + 18; y < base - 12; y += 24) {
      g.fillRect(x - 2, y, 4, 8);
    }
    g.globalAlpha /= 0.55;
    if (keep) {
      g.fillStyle = color;
      g.fillRect(x - 0.7, base - towerHeight - 25, 1.4, 20);
      g.beginPath();
      g.moveTo(x + 0.7, base - towerHeight - 25);
      g.lineTo(x + 12, base - towerHeight - 20);
      g.lineTo(x + 0.7, base - towerHeight - 14);
      g.closePath();
      g.fill();
    }
  }

  function drawDistantCastle(g) {
    const p = palette;
    const base = height * 0.79;
    g.globalAlpha = 0.52;
    tower(g, width * 0.11, base, 25, height * 0.12, true, p.tower);
    tower(g, width * 0.18, base, 18, height * 0.075, false, p.tower);
    tower(g, width * 0.89, base, 25, height * 0.13, true, p.tower);
    tower(g, width * 0.82, base, 18, height * 0.08, false, p.tower);
    g.globalAlpha = 0.3;
    g.fillStyle = p.tower;
    g.fillRect(width * 0.18, base - height * 0.045, width * 0.64, height * 0.045);
    g.globalAlpha = 1;
  }

  function drawFog(g) {
    const p = palette;
    const top = height * 0.62;
    const fog = g.createLinearGradient(0, top, 0, height);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(0.55, p.moonGlow.replace(/[\d.]+\)$/, '0.06)'));
    fog.addColorStop(1, 'rgba(0,0,0,.18)');
    g.fillStyle = fog;
    g.fillRect(0, top, width, height - top);
  }

  function drawWall(g) {
    const p = palette;
    const top = wallTopFor(height);
    const wallGradient = g.createLinearGradient(0, top, 0, height);
    wallGradient.addColorStop(0, p.stoneLight);
    wallGradient.addColorStop(0.18, p.stone);
    wallGradient.addColorStop(1, p.stoneDark);
    g.fillStyle = wallGradient;
    g.fillRect(0, top, width, height - top);

    g.fillStyle = p.stoneLight;
    g.fillRect(0, top - 2, width, 3);

    const rowHeight = 24;
    for (let row = 0, y = top + 9; y < height; row++, y += rowHeight) {
      const offset = row % 2 ? 22 : 0;
      g.strokeStyle = 'rgba(0,0,0,.18)';
      g.lineWidth = 1;
      for (let x = -offset; x < width; x += 44) {
        g.strokeRect(x + 1, y, 42, rowHeight - 2);
        g.fillStyle = 'rgba(255,255,255,.025)';
        g.fillRect(x + 2, y + 1, 40, 1);
      }
    }

    const merlonWidth = 34;
    const merlonGap = 21;
    const merlonHeight = 15;
    for (let x = 0; x < width; x += merlonWidth + merlonGap) {
      g.fillStyle = p.stone;
      g.fillRect(x, top - merlonHeight, merlonWidth, merlonHeight);
      g.fillStyle = p.stoneLight;
      g.fillRect(x, top - merlonHeight, merlonWidth, 2);
    }

    drawBanner(g, width * 0.14, top, p);
    drawBanner(g, width * 0.86, top, p);

    const torch = g.createRadialGradient(width * 0.07, top + 30, 0, width * 0.07, top + 30, 100);
    torch.addColorStop(0, 'rgba(255,180,92,.24)');
    torch.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = torch;
    g.fillRect(0, top - 20, width * 0.24, 180);

    const bottom = g.createLinearGradient(0, height - 120, 0, height);
    bottom.addColorStop(0, 'rgba(0,0,0,0)');
    bottom.addColorStop(1, 'rgba(0,0,0,.34)');
    g.fillStyle = bottom;
    g.fillRect(0, height - 120, width, 120);
  }

  function drawBanner(g, x, top, p) {
    g.fillStyle = p.accent;
    g.fillRect(x - 1, top - 48, 2, 48);
    g.fillStyle = p.danger;
    g.beginPath();
    g.moveTo(x - 13, top - 43);
    g.lineTo(x + 13, top - 43);
    g.lineTo(x + 13, top + 13);
    g.lineTo(x, top + 5);
    g.lineTo(x - 13, top + 13);
    g.closePath();
    g.fill();
    g.fillStyle = p.accent;
    g.globalAlpha = 0.8;
    g.beginPath();
    g.moveTo(x, top - 27);
    g.lineTo(x + 4, top - 19);
    g.lineTo(x + 12, top - 19);
    g.lineTo(x + 6, top - 13);
    g.lineTo(x + 8, top - 5);
    g.lineTo(x, top - 10);
    g.lineTo(x - 8, top - 5);
    g.lineTo(x - 6, top - 13);
    g.lineTo(x - 12, top - 19);
    g.lineTo(x - 4, top - 19);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  }

  function addBurst(x, y, color, count = 12, speed = 120, size = 2.5, gravity = 220) {
    if (reducedMotion) count = Math.ceil(count * 0.35);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.25 + Math.random() * 0.9);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - speed * 0.12,
        life: 1,
        decay: 1.4 + Math.random() * 2,
        size: size * (0.45 + Math.random()),
        color,
        gravity
      });
    }
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function addFloat(x, y, text, color, size = 12) {
    floats.push({ x, y, text, color, size, life: 1 });
    if (floats.length > 30) floats.splice(0, floats.length - 30);
  }

  function setShake(amount) {
    if (!shakeEnabled || reducedMotion) return;
    shake = Math.max(shake, amount);
  }

  function handleEvent(event) {
    if (!event) return;
    const p = palette;
    switch (event.type) {
      case 'shoot':
        addBurst(event.x, event.y, p.shot, 3, 50, 1.3, 0);
        break;
      case 'hit': {
        const color = event.crit ? p.shot : p.enemy;
        addBurst(event.x, event.y, color, event.crit ? 14 : 5, event.crit ? 180 : 80, event.crit ? 2.2 : 1.4, 100);
        if (event.crit) addFloat(event.x, event.y - 10, 'BULLSEYE', p.accent, 11);
        break;
      }
      case 'kill': {
        const color = event.enemy === 'boss' ? p.boss : event.enemy === 'runner' ? p.runner : p.enemy;
        addBurst(event.x, event.y, color, event.enemy === 'boss' ? 40 : 18, event.enemy === 'boss' ? 260 : 160, 3, 220);
        addFloat(event.x, event.y - 8, `+${event.points}`, event.crit ? p.accent : p.text, event.crit ? 15 : 12);
        setShake(event.crit ? 4 : 2);
        break;
      }
      case 'wallHit':
        addBurst(event.x, event.y, p.danger, 22, 180, 2.8, 160);
        addFloat(event.x, event.y - 14, `-${event.damage ?? 1}`, p.danger, 18);
        setShake(12);
        break;
      case 'blocked':
        addBurst(event.x, event.y, p.accent, 12, 120, 2, 60);
        addFloat(event.x, event.y - 16, 'BLOCKED', p.accent, 11);
        setShake(4);
        break;
      case 'pickup':
        addBurst(event.x, event.y, PICKUP_COLOR(event.id, p), 16, 150, 2, 80);
        addFloat(event.x, event.y - 16, event.name, p.accent, 10);
        break;
      case 'heal':
        addBurst(width / 2, wallTopFor(height) - 55, p.hp, 15, 100, 2, -40);
        addFloat(width / 2, wallTopFor(height) - 80, `+${event.amount}`, p.hp, 15);
        break;
      case 'shatter':
        addBurst(event.x, event.y, p.boulder, 12, 140, 2, 260);
        break;
      case 'summon':
        addBurst(event.x, event.y, p.enemyDark, 10, 90, 2, -30);
        break;
      case 'boss':
        setShake(9);
        addFloat(width / 2, height * 0.34, 'WARLORD', p.danger, 22);
        break;
      case 'volley':
        addBurst(width / 2, wallTopFor(height) - 45, p.accent, 26, 220, 2.4, 0);
        setShake(5);
        break;
      case 'gameover':
        addBurst(width / 2, wallTopFor(height), p.danger, 40, 260, 3, 240);
        setShake(16);
        break;
      default:
        break;
    }
  }

  function PICKUP_COLOR(id, p) {
    return PICKUPS[id]?.color || p.pickup;
  }

  function updateVisuals(dt) {
    time += dt;
    shake = Math.max(0, shake - dt * 34);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.98;
      p.life -= p.decay * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 24 * dt;
      f.life -= 1.15 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }
    for (const ember of ambient) {
      ember.y -= ember.speed * dt;
      ember.x += Math.sin(time * 0.6 + ember.phase) * ember.drift * dt;
      if (ember.y < -10) {
        ember.y = height + 10;
        ember.x = Math.random() * width;
      }
    }
  }

  function draw(run, dt = 0.016) {
    updateVisuals(Math.min(0.05, Math.max(0, dt)));
    if (!background) buildBackground(true);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(background, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    c.save();
    if (shake > 0.2 && !reducedMotion && shakeEnabled) {
      c.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    if (run) {
      drawWind(run);
      drawPickups(run);
      drawBoulders(run);
      drawEnemies(run);
      drawArrows(run);
      drawAim(run);
      drawKing(run, false);
      drawParticles();
      drawLowHp(run);
    } else {
      drawMenuScene();
      drawParticles();
    }
    c.restore();
  }

  function drawWind(run) {
    const strength = Math.abs(run.wind);
    if (strength < 3) return;
    const p = palette;
    const max = Math.max(1, windMaxFor(run.wave));
    const normalized = clamp(strength / max, 0, 1);
    const direction = Math.sign(run.wind);
    const rng = seeded(90210 + run.wave);
    c.save();
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const baseY = 70 + rng() * (height * 0.45);
      const length = 24 + rng() * 70;
      const speed = 16 + normalized * 45;
      const span = width + 100;
      const offset = ((rng() * width + time * speed * direction + width) % span + span) % span;
      const x = direction > 0 ? offset - 50 : width + 50 - offset;
      c.globalAlpha = 0.1 + normalized * 0.18;
      c.strokeStyle = p.accent;
      c.lineWidth = 0.8 + normalized;
      c.beginPath();
      c.moveTo(x, baseY);
      c.quadraticCurveTo(x + length * direction * 0.5, baseY - 4, x + length * direction, baseY);
      c.stroke();
    }
    c.restore();
  }

  function drawPickups(run) {
    const p = palette;
    for (const pickup of run.pickups) {
      if (pickup.dead) continue;
      const def = PICKUPS[pickup.id];
      const color = def?.color || p.pickup;
      const pulse = 1 + Math.sin(time * 4 + pickup.x) * 0.08;
      const bob = Math.sin(time * 3 + pickup.y) * 3;
      c.save();
      c.translate(pickup.x, pickup.y + bob);
      c.rotate(time * 1.2);
      c.scale(pulse, pulse);
      c.globalAlpha = 0.2;
      c.fillStyle = color;
      c.beginPath();
      c.arc(0, 0, 26, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, -15);
      c.lineTo(15, 0);
      c.lineTo(0, 15);
      c.lineTo(-15, 0);
      c.closePath();
      c.fill();
      c.strokeStyle = p.text;
      c.globalAlpha = 0.6;
      c.lineWidth = 1;
      c.stroke();
      c.rotate(-time * 1.2);
      c.globalAlpha = 1;
      c.fillStyle = p.bg;
      c.font = `900 9px ${DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(def?.glyph || '+', 0, 1);
      c.restore();
    }
  }

  function drawBoulders(run) {
    const p = palette;
    for (const boulder of run.boulders) {
      if (boulder.dead) continue;
      c.save();
      c.translate(boulder.x, boulder.y);
      c.globalAlpha = 0.22;
      c.strokeStyle = p.boulder;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(-boulder.vx * 0.07, -boulder.vy * 0.035);
      c.lineTo(0, 0);
      c.stroke();
      c.globalAlpha = 1;
      const g = c.createRadialGradient(-3, -4, 1, 0, 0, boulder.r * 1.4);
      g.addColorStop(0, p.boulder);
      g.addColorStop(1, p.boulderDark);
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, boulder.r, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,.3)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-3, -5);
      c.lineTo(2, 1);
      c.lineTo(-1, 7);
      c.stroke();
      c.restore();
    }
  }

  function drawEnemies(run) {
    for (const enemy of run.enemies) {
      if (enemy.dead) continue;
      if (enemy.isBoss) drawBoss(enemy);
      else if (enemy.type === 'bat') drawBat(enemy);
      else if (enemy.type === 'runner') drawRunner(enemy);
      else if (enemy.type === 'brute') drawBrute(enemy);
      else drawSlime(enemy);
    }
  }

  function drawSlime(enemy) {
    const p = palette;
    const [color, dark] = enemyColors(enemy, p);
    const wobble = Math.sin(enemy.t * 4 + enemy.phase) * 0.1;
    const r = enemy.radius;
    c.save();
    c.translate(enemy.x, enemy.y);
    c.fillStyle = 'rgba(0,0,0,.2)';
    c.beginPath();
    c.ellipse(0, r * 0.86, r * 0.9, r * 0.24, 0, 0, TAU);
    c.fill();
    const body = c.createRadialGradient(-r * 0.25, -r * 0.4, 1, 0, 0, r * 1.45);
    body.addColorStop(0, enemy.flash > 0 ? '#fff' : color);
    body.addColorStop(1, enemy.flash > 0 ? '#ffe9c8' : dark);
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(0, 0, r * (1 + wobble), r * (0.92 - wobble * 0.45), 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)';
    c.beginPath();
    c.ellipse(-r * 0.28, -r * 0.35, r * 0.22, r * 0.13, -0.5, 0, TAU);
    c.fill();
    drawEyes(0, r * 0.1, r * 0.34, r * 0.09, p);
    c.strokeStyle = dark;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, r * 0.26, r * 0.2, 0.2, Math.PI - 0.2);
    c.stroke();
    c.restore();
  }

  function drawBat(enemy) {
    const p = palette;
    const [color, dark] = enemyColors(enemy, p);
    const r = enemy.radius;
    const flap = Math.sin(enemy.t * 11 + enemy.phase);
    c.save();
    c.translate(enemy.x, enemy.y);
    c.fillStyle = enemy.flash > 0 ? '#fff' : dark;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-r * 1.8, -r * 0.9 - flap * r * 0.65, -r * 2.25, r * 0.2);
    c.quadraticCurveTo(-r * 1.3, r * 0.55, 0, r * 0.4);
    c.quadraticCurveTo(r * 1.3, r * 0.55, r * 2.25, r * 0.2);
    c.quadraticCurveTo(r * 1.8, -r * 0.9 - flap * r * 0.65, 0, 0);
    c.fill();
    c.fillStyle = enemy.flash > 0 ? '#fff' : color;
    c.beginPath();
    c.ellipse(0, 0, r * 0.62, r * 0.78, 0, 0, TAU);
    c.fill();
    c.fillStyle = p.bg;
    c.beginPath();
    c.arc(-r * 0.22, -r * 0.12, r * 0.1, 0, TAU);
    c.arc(r * 0.22, -r * 0.12, r * 0.1, 0, TAU);
    c.fill();
    c.fillStyle = p.accent;
    c.beginPath();
    c.arc(-r * 0.22, -r * 0.12, r * 0.035, 0, TAU);
    c.arc(r * 0.22, -r * 0.12, r * 0.035, 0, TAU);
    c.fill();
    c.restore();
  }

  function drawRunner(enemy) {
    const p = palette;
    const [color, dark] = enemyColors(enemy, p);
    const r = enemy.radius;
    c.save();
    c.translate(enemy.x, enemy.y);
    c.globalAlpha = 0.25;
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-r * 0.8, -r * 1.6);
    c.lineTo(-r * 0.4, -r * 2.5);
    c.moveTo(r * 0.8, -r * 1.6);
    c.lineTo(r * 0.4, -r * 2.5);
    c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = enemy.flash > 0 ? '#fff' : dark;
    c.beginPath();
    c.moveTo(0, -r * 1.15);
    c.lineTo(r * 0.9, r * 0.1);
    c.lineTo(r * 0.45, r * 1.15);
    c.lineTo(-r * 0.45, r * 1.15);
    c.lineTo(-r * 0.9, r * 0.1);
    c.closePath();
    c.fill();
    c.fillStyle = enemy.flash > 0 ? '#fff' : color;
    c.beginPath();
    c.ellipse(0, 0, r * 0.66, r * 0.76, 0, 0, TAU);
    c.fill();
    c.fillStyle = p.bg;
    c.beginPath();
    c.moveTo(-r * 0.24, -r * 0.28);
    c.lineTo(-r * 0.05, -r * 0.12);
    c.lineTo(-r * 0.27, -r * 0.06);
    c.moveTo(r * 0.24, -r * 0.28);
    c.lineTo(r * 0.05, -r * 0.12);
    c.lineTo(r * 0.27, -r * 0.06);
    c.fill();
    c.fillStyle = p.accent;
    c.beginPath();
    c.arc(-r * 0.17, -r * 0.15, r * 0.05, 0, TAU);
    c.arc(r * 0.17, -r * 0.15, r * 0.05, 0, TAU);
    c.fill();
    c.strokeStyle = dark;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(0, r * 0.25);
    c.lineTo(0, r * 0.5);
    c.stroke();
    c.restore();
  }

  function drawBrute(enemy) {
    const p = palette;
    const [color, dark] = enemyColors(enemy, p);
    const r = enemy.radius;
    const flash = enemy.flash > 0;
    const body = [
      [-0.78, -0.72], [-0.22, -0.96], [0.3, -0.86], [0.78, -0.5],
      [0.96, 0.08], [0.68, 0.72], [0.18, 0.98], [-0.42, 0.82], [-0.9, 0.42]
    ];
    c.save();
    c.translate(enemy.x, enemy.y);

    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath();
    c.ellipse(0, r * 0.9, r * 1.1, r * 0.24, 0, 0, TAU);
    c.fill();

    c.fillStyle = flash ? '#fff' : dark;
    c.beginPath();
    c.arc(-r * 1.0, r * 0.12, r * 0.42, 0, TAU);
    c.arc(r * 1.0, r * 0.12, r * 0.42, 0, TAU);
    c.fill();

    const rock = c.createRadialGradient(-r * 0.25, -r * 0.4, 1, 0, 0, r * 1.3);
    rock.addColorStop(0, flash ? '#fff' : color);
    rock.addColorStop(1, flash ? '#ffe9c8' : dark);
    c.fillStyle = rock;
    c.beginPath();
    body.forEach(([x, y], index) => {
      if (index === 0) c.moveTo(x * r, y * r);
      else c.lineTo(x * r, y * r);
    });
    c.closePath();
    c.fill();

    c.fillStyle = flash ? '#fff' : p.stoneDark;
    c.globalAlpha = 0.45;
    c.beginPath();
    c.moveTo(-r * 0.1, -r * 0.8);
    c.lineTo(r * 0.38, -r * 0.25);
    c.lineTo(r * 0.05, r * 0.35);
    c.lineTo(-r * 0.42, -r * 0.1);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;

    c.strokeStyle = flash ? '#fff' : 'rgba(0,0,0,.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-r * 0.42, -r * 0.45);
    c.lineTo(-r * 0.12, -r * 0.08);
    c.lineTo(-r * 0.3, r * 0.35);
    c.moveTo(r * 0.34, -r * 0.48);
    c.lineTo(r * 0.2, -r * 0.02);
    c.lineTo(r * 0.48, r * 0.3);
    c.stroke();

    c.strokeStyle = p.accent;
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-r * 0.48, -r * 0.35);
    c.lineTo(-r * 0.16, -r * 0.2);
    c.moveTo(r * 0.48, -r * 0.35);
    c.lineTo(r * 0.16, -r * 0.2);
    c.stroke();

    c.fillStyle = p.accent;
    c.beginPath();
    c.arc(-r * 0.28, -r * 0.16, r * 0.11, 0, TAU);
    c.arc(r * 0.28, -r * 0.16, r * 0.11, 0, TAU);
    c.fill();
    c.fillStyle = p.bg;
    c.beginPath();
    c.arc(-r * 0.28, -r * 0.16, r * 0.05, 0, TAU);
    c.arc(r * 0.28, -r * 0.16, r * 0.05, 0, TAU);
    c.fill();

    c.fillStyle = p.bg;
    c.beginPath();
    c.rect(-r * 0.25, r * 0.38, r * 0.5, r * 0.12);
    c.fill();
    c.fillStyle = p.text;
    for (let i = -1; i <= 1; i++) {
      c.fillRect(-r * 0.2 + i * r * 0.16, r * 0.38, r * 0.08, r * 0.12);
    }

    if (enemy.hp < enemy.maxHp) {
      c.fillStyle = 'rgba(0,0,0,.45)';
      c.fillRect(-r, -r * 1.45, r * 2, 4);
      c.fillStyle = p.accent;
      c.fillRect(-r, -r * 1.45, r * 2 * (enemy.hp / enemy.maxHp), 4);
    }
    c.restore();
  }

  function drawBoss(enemy) {
    const p = palette;
    const r = enemy.r;
    const pulse = 0.5 + Math.sin(time * 3) * 0.12;
    c.save();
    c.translate(enemy.x, enemy.y);
    const aura = c.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.1);
    aura.addColorStop(0, `rgba(255,120,70,${pulse * 0.22})`);
    aura.addColorStop(1, 'rgba(255,80,40,0)');
    c.fillStyle = aura;
    c.beginPath();
    c.arc(0, 0, r * 2.1, 0, TAU);
    c.fill();

    c.fillStyle = enemy.flash > 0 ? '#fff' : p.bossDark;
    c.beginPath();
    c.ellipse(-r * 0.72, r * 0.22, r * 0.42, r * 0.65, 0.2, 0, TAU);
    c.ellipse(r * 0.72, r * 0.22, r * 0.42, r * 0.65, -0.2, 0, TAU);
    c.fill();

    const body = c.createRadialGradient(-r * 0.25, -r * 0.3, 1, 0, 0, r * 1.4);
    body.addColorStop(0, enemy.flash > 0 ? '#fff' : p.boss);
    body.addColorStop(1, enemy.flash > 0 ? '#ffe6c8' : p.bossDark);
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(0, r * 0.08, r * 0.86, r * 0.9, 0, 0, TAU);
    c.fill();

    c.fillStyle = p.stoneDark;
    c.beginPath();
    c.moveTo(-r * 0.82, -r * 0.35);
    c.lineTo(-r * 0.5, -r * 0.8);
    c.lineTo(-r * 0.1, -r * 0.55);
    c.lineTo(0, -r * 0.9);
    c.lineTo(r * 0.45, -r * 0.64);
    c.lineTo(r * 0.8, -r * 0.24);
    c.lineTo(r * 0.45, -r * 0.04);
    c.lineTo(-r * 0.45, -r * 0.1);
    c.closePath();
    c.fill();

    c.strokeStyle = p.accent;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-r * 0.22, -r * 0.42);
    c.lineTo(-r * 0.06, -r * 0.22);
    c.lineTo(-r * 0.18, -r * 0.05);
    c.moveTo(r * 0.22, -r * 0.42);
    c.lineTo(r * 0.06, -r * 0.22);
    c.lineTo(r * 0.18, -r * 0.05);
    c.stroke();

    c.fillStyle = p.bg;
    c.beginPath();
    c.ellipse(0, r * 0.42, r * 0.37, r * 0.17, 0, 0, TAU);
    c.fill();
    c.fillStyle = p.accent;
    c.beginPath();
    c.moveTo(-r * 0.26, r * 0.48);
    c.lineTo(-r * 0.16, r * 0.28);
    c.lineTo(-r * 0.06, r * 0.48);
    c.moveTo(r * 0.26, r * 0.48);
    c.lineTo(r * 0.16, r * 0.28);
    c.lineTo(r * 0.06, r * 0.48);
    c.fill();

    const crownY = -r * 0.95;
    c.fillStyle = p.accent;
    c.beginPath();
    c.moveTo(-r * 0.34, crownY);
    c.lineTo(-r * 0.2, crownY - r * 0.25);
    c.lineTo(0, crownY - r * 0.08);
    c.lineTo(r * 0.2, crownY - r * 0.25);
    c.lineTo(r * 0.34, crownY);
    c.closePath();
    c.fill();

    c.restore();
  }

  function drawEyes(x, y, spread, radius, p) {
    c.fillStyle = p.bg;
    c.beginPath();
    c.arc(x - spread, y, radius, 0, TAU);
    c.arc(x + spread, y, radius, 0, TAU);
    c.fill();
    c.fillStyle = p.accent;
    c.beginPath();
    c.arc(x - spread, y, radius * 0.45, 0, TAU);
    c.arc(x + spread, y, radius * 0.45, 0, TAU);
    c.fill();
  }

  function drawArrows(run) {
    const p = palette;
    for (const arrow of run.arrows) {
      if (arrow.dead) continue;
      const length = arrow.stuck ? 20 : 18;
      const angle = arrow.stuck ? -Math.PI / 2 : arrow.angle;
      const tailX = arrow.x - Math.cos(angle) * length;
      const tailY = arrow.y - Math.sin(angle) * length;
      c.save();
      if (arrow.volley) {
        c.globalAlpha = 0.25;
        c.strokeStyle = p.accent;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(tailX, tailY);
        c.lineTo(arrow.x, arrow.y);
        c.stroke();
        c.globalAlpha = 1;
      }
      c.strokeStyle = p.shot;
      c.lineWidth = arrow.pierce ? 2.4 : 1.8;
      c.beginPath();
      c.moveTo(tailX, tailY);
      c.lineTo(arrow.x, arrow.y);
      c.stroke();
      c.fillStyle = p.text;
      c.beginPath();
      c.moveTo(arrow.x, arrow.y);
      c.lineTo(arrow.x - Math.cos(angle - 0.35) * 6, arrow.y - Math.sin(angle - 0.35) * 6);
      c.lineTo(arrow.x - Math.cos(angle + 0.35) * 6, arrow.y - Math.sin(angle + 0.35) * 6);
      c.closePath();
      c.fill();
      c.strokeStyle = p.accent;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(tailX, tailY);
      c.lineTo(tailX + Math.cos(angle + 0.5) * 5, tailY + Math.sin(angle + 0.5) * 5);
      c.moveTo(tailX, tailY);
      c.lineTo(tailX + Math.cos(angle - 0.5) * 5, tailY + Math.sin(angle - 0.5) * 5);
      c.stroke();
      c.restore();
    }
  }

  function drawAim(run) {
    if (!run.aim.active) return;
    const p = palette;
    const kingX = width / 2;
    const kingY = run.wallTop - 26;
    const speed = launchSpeedFor(height, run.aim.power);
    const windFactor = Math.pow(0.5, run.upgrades.windreader || 0);
    let x = kingX;
    let y = kingY;
    let vx = Math.cos(run.lastAim.angle) * speed;
    let vy = Math.sin(run.lastAim.angle) * speed;
    const dt = 0.032;
    c.save();
    c.fillStyle = p.accent;
    for (let i = 0; i < 68; i++) {
      vx += run.wind * windFactor * dt;
      vy += PHYSICS.gravity * 1000 * dt;
      x += vx * dt;
      y += vy * dt;
      if (y >= run.wallTop + 10 || y < -20 || x < 0 || x > width) break;
      if (i % 3 === 0) {
        c.globalAlpha = Math.max(0.12, 0.72 - i * 0.01);
        c.beginPath();
        c.arc(x, y, Math.max(1, 3.2 - i * 0.025), 0, TAU);
        c.fill();
      }
    }
    c.globalAlpha = 1;
    c.strokeStyle = p.accent;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(run.aim.x, run.aim.y, 10 + run.aim.power * 6, 0, TAU);
    c.stroke();
    c.globalAlpha = 0.35;
    c.beginPath();
    c.arc(run.aim.x, run.aim.y, 3, 0, TAU);
    c.fillStyle = p.accent;
    c.fill();
    c.restore();
  }

  function drawKing(run, menu) {
    const p = palette;
    const top = run ? run.wallTop : wallTopFor(height);
    const x = width / 2;
    const base = top + 2;
    const aimAngle = run?.aim.active ? run.aim.angle : -Math.PI / 2;
    const power = run?.aim.power ?? 0.45;
    const bob = Math.sin(time * 2.1) * 1.2;

    c.save();
    c.translate(x, base + bob);

    c.fillStyle = 'rgba(0,0,0,.32)';
    c.beginPath();
    c.ellipse(0, 1, 34, 7, 0, 0, TAU);
    c.fill();

    c.fillStyle = p.danger;
    c.globalAlpha = 0.72;
    c.beginPath();
    c.moveTo(-18, -48);
    c.lineTo(-30, 1);
    c.lineTo(-8, -4);
    c.lineTo(0, 2);
    c.lineTo(8, -4);
    c.lineTo(30, 1);
    c.lineTo(18, -48);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;

    c.fillStyle = p.tower;
    c.beginPath();
    c.moveTo(-19, 0);
    c.lineTo(-14, -50);
    c.lineTo(-7, -57);
    c.lineTo(7, -57);
    c.lineTo(14, -50);
    c.lineTo(19, 0);
    c.closePath();
    c.fill();

    c.fillStyle = p.accent;
    c.beginPath();
    c.moveTo(-10, -48);
    c.lineTo(-12, -2);
    c.lineTo(-3, 0);
    c.lineTo(-1, -27);
    c.lineTo(2, 0);
    c.lineTo(11, -2);
    c.lineTo(10, -48);
    c.closePath();
    c.fill();

    c.strokeStyle = p.bg;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-14, -26);
    c.lineTo(14, -26);
    c.stroke();

    c.fillStyle = p.text;
    c.beginPath();
    c.arc(0, -67, 12, 0, TAU);
    c.fill();

    c.fillStyle = p.bg;
    c.beginPath();
    c.arc(-4, -68, 1.3, 0, TAU);
    c.arc(4, -68, 1.3, 0, TAU);
    c.fill();

    c.strokeStyle = p.accent;
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, -63, 4, 0.25, Math.PI - 0.25);
    c.stroke();

    c.fillStyle = p.accent;
    c.beginPath();
    c.moveTo(-13, -77);
    c.lineTo(-8, -88);
    c.lineTo(-2, -80);
    c.lineTo(3, -92);
    c.lineTo(8, -80);
    c.lineTo(14, -88);
    c.lineTo(13, -75);
    c.closePath();
    c.fill();

    c.fillStyle = p.accent;
    c.beginPath();
    c.arc(-14, -49, 5, 0, TAU);
    c.arc(14, -49, 5, 0, TAU);
    c.fill();

    const handDist = 18;
    const handX = Math.cos(aimAngle) * handDist;
    const handY = -42 + Math.sin(aimAngle) * 14;

    c.strokeStyle = p.text;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-9, -53);
    c.lineTo(handX, handY);
    c.moveTo(9, -53);
    c.lineTo(handX * 0.72, handY + 2);
    c.stroke();

    c.save();
    c.translate(handX, handY);
    c.rotate(aimAngle + Math.PI / 2);
    c.strokeStyle = p.accent;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-22, 5);
    c.quadraticCurveTo(0, -22, 22, 5);
    c.stroke();
    c.strokeStyle = p.text;
    c.lineWidth = 1;
    c.globalAlpha = 0.75;
    c.beginPath();
    c.moveTo(-22, 5);
    c.lineTo(22, 5);
    c.stroke();
    c.globalAlpha = 1;
    if (run && run.cooldown <= 0.03) {
      c.strokeStyle = p.shot;
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(0, 9);
      c.lineTo(0, -22);
      c.stroke();
      c.fillStyle = p.text;
      c.beginPath();
      c.moveTo(0, -26);
      c.lineTo(-4, -18);
      c.lineTo(4, -18);
      c.closePath();
      c.fill();
    }
    c.restore();

    if (menu) {
      c.globalAlpha = 0.7;
      c.fillStyle = p.accent;
      c.beginPath();
      c.arc(0, -66, 22 + power * 2, 0, TAU);
      c.globalAlpha = 0.08;
      c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
  }

  function drawParticles() {
    for (const particle of particles) {
      c.globalAlpha = clamp(particle.life, 0, 1);
      c.fillStyle = particle.color;
      c.beginPath();
      c.arc(particle.x, particle.y, particle.size * (0.5 + particle.life * 0.5), 0, TAU);
      c.fill();
    }
    for (const float of floats) {
      c.globalAlpha = clamp(float.life, 0, 1);
      c.fillStyle = float.color;
      c.font = `900 ${float.size}px ${DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(float.text, float.x, float.y);
    }
    c.globalAlpha = 1;
  }

  function drawLowHp(run) {
    if (!run || run.hp > 1) return;
    const pulse = 0.12 + Math.sin(time * 5) * 0.06;
    const p = palette;
    const gradient = c.createRadialGradient(
      width / 2,
      height * 0.84,
      0,
      width / 2,
      height * 0.84,
      height * 0.72
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.65, `rgba(255,40,40,${pulse * 0.5})`);
    gradient.addColorStop(1, `rgba(160,10,18,${pulse})`);
    c.fillStyle = gradient;
    c.fillRect(0, 0, width, height);
  }

  function drawMenuScene() {
    const p = palette;
    const top = wallTopFor(height);
    for (const ember of ambient) {
      const a = 0.12 + Math.sin(time * 1.4 + ember.phase) * 0.1;
      c.globalAlpha = Math.max(0.03, a);
      c.fillStyle = p.accent;
      c.beginPath();
      c.arc(ember.x, ember.y, ember.r, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;

    c.save();
    c.translate(width * 0.2, height * 0.25);
    c.fillStyle = p.mountainNear;
    c.globalAlpha = 0.75;
    const flap = Math.sin(time * 2) * 0.6;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-28, -9 - flap * 8, -45, 5);
    c.quadraticCurveTo(-24, 8, 0, 6);
    c.quadraticCurveTo(24, 8, 45, 5);
    c.quadraticCurveTo(28, -9 - flap * 8, 0, 0);
    c.fill();
    c.restore();

    c.globalAlpha = 0.18;
    c.strokeStyle = p.accent;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(width * 0.5 - 42, top + 12);
    c.lineTo(width * 0.5 + 42, top + 12);
    c.stroke();
    c.globalAlpha = 1;
  }

  return {
    resize,
    setTheme,
    setReducedMotion,
    setShake,
    handleEvent,
    draw,
    get palette() {
      return palette;
    },
    get size() {
      return { width, height, dpr };
    }
  };
}
