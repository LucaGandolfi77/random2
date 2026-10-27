import CONFIG from './config.js';

let canvas, ctx;
let currentBookTheme = 'genesis';
let tClock = 0;
let stars = [];
let animId = 0;

export function initRender() {
  canvas = document.getElementById('bg-canvas') || document.getElementById('game-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  stars = [];
  for (let i = 0; i < 55; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2 + 0.5,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * 0.02 + 0.005
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
      drawSacredScene();
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
  drawSacredScene();
}

export function clearScreen(scene = 'genesis') {
  currentBookTheme = scene || 'genesis';
  drawSacredScene();
}

function drawSacredScene() {
  if (!canvas || !ctx) return;
  const w = window.innerWidth || CONFIG.canvas.width;
  const h = window.innerHeight || CONFIG.canvas.height;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (currentBookTheme === 'exodus') {
    g.addColorStop(0, '#0a1426');
    g.addColorStop(0.5, '#1b2c44');
    g.addColorStop(1, '#120a14');
  } else if (currentBookTheme === 'revelation') {
    g.addColorStop(0, '#180c24');
    g.addColorStop(0.5, '#2e183a');
    g.addColorStop(1, '#0e0814');
  } else if (currentBookTheme === 'gospels') {
    g.addColorStop(0, '#121024');
    g.addColorStop(0.5, '#292038');
    g.addColorStop(1, '#0e0a12');
  } else {
    g.addColorStop(0, '#0d0918');
    g.addColorStop(0.5, '#1e152c');
    g.addColorStop(1, '#0c0810');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sacred low-poly mandala / Star of Bethlehem / Creation light
  const cx = w * 0.5, cy = h * 0.32;
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + tClock * 0.08;
    const len = 90 + (i % 2) * 55 + Math.sin(tClock * 1.5 + i) * 10;
    ctx.strokeStyle = `rgba(235, 200, 140, ${i % 2 ? 0.18 : 0.09})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.75);
    ctx.stroke();
  }

  const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 140);
  halo.addColorStop(0, 'rgba(250, 225, 175, 0.38)');
  halo.addColorStop(0.5, 'rgba(212, 168, 114, 0.12)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.fill();

  // Low-poly Sinai / Olive Mount ridges
  const cols = 14;
  const step = w / cols;
  const baseY = h * 0.54;
  for (let i = 0; i < cols; i++) {
    const x0 = i * step, x1 = (i + 1) * step, xm = (x0 + x1) * 0.5;
    let peak = baseY - Math.abs(Math.sin(i * 1.3 + 1)) * 45;
    if (currentBookTheme === 'exodus' && (i === 5 || i === 8)) {
      peak = baseY - 85; // Walls of parted water / Mount Sinai
    }
    ctx.fillStyle = i % 2 === 0 ? 'rgba(22, 15, 32, 0.7)' : 'rgba(15, 10, 22, 0.82)';
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0, baseY);
    ctx.lineTo(xm, peak);
    ctx.lineTo(x1, baseY);
    ctx.lineTo(x1, h);
    ctx.closePath();
    ctx.fill();
  }

  // Stars of Abraham's covenant
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const alpha = 0.25 + 0.25 * Math.sin(tClock * 1.9 + s.p);
    ctx.fillStyle = `rgba(240, 215, 170, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h * 0.65, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderText(text, x, y) {
  if (!ctx) return;
  ctx.font = "italic 1rem 'Cormorant Garamond',Georgia,serif";
  ctx.fillStyle = '#c8b6a0';
  ctx.fillText(String(text || '').substring(0, 80), x || 30, y || 50);
}

export function updateUI() {}
