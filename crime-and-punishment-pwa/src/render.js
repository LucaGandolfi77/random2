import CONFIG from './config.js';

let canvas, ctx;
let currentMood = 'dark';
let tClock = 0;
let motes = [];
let animId = 0;

export function initRender() {
  canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  motes = [];
  for (let i = 0; i < 48; i++) {
    motes.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2 + 0.6,
      s: Math.random() * 0.12 + 0.04,
      p: Math.random() * Math.PI * 2
    });
  }
  resize();
  window.addEventListener('resize', resize);
  if (!animId && typeof requestAnimationFrame === 'function') {
    let last = 0;
    const loop = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      tClock += dt;
      paintScene();
      if (!document.hidden) animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
  }
}

function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth || CONFIG.canvas.width;
  const h = window.innerHeight || CONFIG.canvas.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintScene();
}

export function clearScreen(scene = 'dark') {
  currentMood = scene || 'dark';
  paintScene();
}

function paintScene() {
  if (!canvas || !ctx) return;
  const w = window.innerWidth || CONFIG.canvas.width;
  const h = window.innerHeight || CONFIG.canvas.height;
  const g = ctx.createLinearGradient(0, 0, 0, h);

  if (currentMood === 'murder') {
    g.addColorStop(0, '#140509');
    g.addColorStop(0.45, '#2b0b12');
    g.addColorStop(1, '#0c0509');
  } else if (currentMood === 'redemption' || currentMood === 'siberia') {
    g.addColorStop(0, '#0e1628');
    g.addColorStop(0.48, '#222b44');
    g.addColorStop(1, '#120d1c');
  } else if (currentMood === 'interrogation') {
    g.addColorStop(0, '#0c1018');
    g.addColorStop(0.5, '#1b222e');
    g.addColorStop(1, '#0d0a14');
  } else {
    g.addColorStop(0, '#120d1a');
    g.addColorStop(0.5, '#231829');
    g.addColorStop(1, '#0b0811');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // St. Petersburg yellow-amber fog / candle halo
  const lx = currentMood === 'murder' ? w * 0.35 : w * 0.65;
  const ly = h * 0.28 + Math.sin(tClock * 1.4) * 8;
  const rad = Math.min(w, h) * 0.42;
  const halo = ctx.createRadialGradient(lx, ly, 4, lx, ly, rad);
  if (currentMood === 'murder') {
    halo.addColorStop(0, 'rgba(235, 85, 65, 0.28)');
    halo.addColorStop(0.5, 'rgba(160, 40, 35, 0.09)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (currentMood === 'siberia') {
    halo.addColorStop(0, 'rgba(210, 230, 255, 0.32)');
    halo.addColorStop(0.5, 'rgba(140, 175, 220, 0.1)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    halo.addColorStop(0, 'rgba(240, 195, 120, 0.28)');
    halo.addColorStop(0.5, 'rgba(195, 140, 80, 0.08)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(lx, ly, rad, 0, Math.PI * 2);
  ctx.fill();

  // Low-poly St. Petersburg rooftops / garret beams / Siberian river banks
  const cols = 14;
  const step = w / cols;
  const baseY = h * 0.46;
  for (let i = 0; i < cols; i++) {
    const x0 = i * step, x1 = (i + 1) * step, xm = (x0 + x1) * 0.5;
    const h0 = Math.sin(i * 1.7 + 2) * 32;
    const hm = Math.cos(i * 2.3 + 1) * 48 - 18;
    const h1 = Math.sin((i + 1) * 1.7 + 2) * 32;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(20, 14, 28, 0.65)' : 'rgba(14, 9, 20, 0.78)';
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0, baseY + h0);
    ctx.lineTo(xm, baseY + hm);
    ctx.lineTo(x1, baseY + h1);
    ctx.lineTo(x1, h);
    ctx.closePath();
    ctx.fill();

    // Lit tenement window on alternate facets
    if (i % 3 === 1 && currentMood !== 'siberia') {
      ctx.fillStyle = `rgba(235, 185, 110, ${0.18 + 0.08 * Math.sin(tClock * 2 + i)})`;
      ctx.fillRect(xm - 5, baseY + hm + 26, 10, 14);
    }
  }

  // Slanted Petersburg rain / Siberian snow
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i];
    m.y += m.s * 0.016;
    m.x += Math.sin(tClock * 0.6 + m.p) * 0.0008;
    if (m.y > 1) m.y = -0.02;
    if (m.x > 1) m.x = 0;
    if (m.x < 0) m.x = 1;
    const px = m.x * w, py = m.y * h;
    ctx.fillStyle = currentMood === 'siberia'
      ? `rgba(225, 235, 250, ${0.35 + 0.2 * Math.sin(tClock + m.p)})`
      : `rgba(205, 185, 150, ${0.22 + 0.15 * Math.sin(tClock * 2 + m.p)})`;
    if (currentMood === 'murder' || currentMood === 'interrogation') {
      ctx.fillRect(px, py, 1.2, m.r * 5);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawDialogueText(text) {
  const el = document.getElementById('dialogue-text');
  if (el) el.textContent = text;
}

export function drawSpeaker(name) {
  const el = document.getElementById('speaker');
  if (el) el.textContent = name;
}

export function showChoices(choices, onSelect) {
  const container = document.getElementById('choices');
  if (!container) return;
  container.innerHTML = '';
  choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.textContent = c.text;
    btn.onclick = () => onSelect(c);
    container.appendChild(btn);
  });
}
