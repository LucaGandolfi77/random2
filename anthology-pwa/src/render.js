import CONFIG from './config.js';

let canvas, ctx;
let readerCanvas, rCtx;
let currentVisual = 'candles';
let tClock = 0;
let bgStars = [];
let animId = 0;

export function initRender() {
  canvas = document.getElementById('bg-canvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;
    ctx.imageSmoothingEnabled = true;
  }
  readerCanvas = document.getElementById('reader-canvas');
  if (readerCanvas) {
    rCtx = readerCanvas.getContext('2d');
  }
  bgStars = [];
  for (let i = 0; i < 45; i++) {
    bgStars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.5,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * 0.03 + 0.01
    });
  }
  clearScreen();
  if (!animId && typeof requestAnimationFrame === 'function') {
    let last = 0;
    const loop = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      tClock += dt;
      clearScreen();
      drawReaderVisual();
      if (!document.hidden) animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
  }
}

export function setReaderVisual(vis) {
  currentVisual = vis || 'candles';
  drawReaderVisual();
}

export function clearScreen() {
  if (!canvas || !ctx) return;
  const w = canvas.width, h = canvas.height;  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a050c');
  g.addColorStop(0.45, '#130918');
  g.addColorStop(1, '#06040a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Low-poly nocturnal library arches
  for (let i = 0; i < 10; i++) {
    const x0 = (i / 10) * w, x1 = ((i + 1) / 10) * w, xm = (x0 + x1) * 0.5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(24, 12, 30, 0.45)' : 'rgba(16, 8, 22, 0.55)';
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0, h * 0.62);
    ctx.lineTo(xm, h * 0.54 - Math.sin(i * 1.3) * 18);
    ctx.lineTo(x1, h * 0.62);
    ctx.lineTo(x1, h);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < bgStars.length; i++) {
    const s = bgStars[i];
    const alpha = 0.15 + 0.15 * Math.sin(tClock * 1.5 + s.p);
    ctx.fillStyle = `rgba(218, 185, 145, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawReaderVisual() {
  if (!readerCanvas || !rCtx) return;
  const readerEl = document.getElementById('reader');
  if (!readerEl || readerEl.classList.contains('hidden')) return;

  const rect = readerCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(300, Math.round(rect.width || 760));
  const h = Math.max(140, Math.round(rect.height || 200));
  if (readerCanvas.width !== w * dpr || readerCanvas.height !== h * dpr) {
    readerCanvas.width = w * dpr;
    readerCanvas.height = h * dpr;
  }
  rCtx.save();
  rCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const g = rCtx.createLinearGradient(0, 0, 0, h);
  if (currentVisual === 'inferno') {
    g.addColorStop(0, '#16060a'); g.addColorStop(0.6, '#360d12'); g.addColorStop(1, '#12050a');
  } else if (currentVisual === 'cyber') {
    g.addColorStop(0, '#06121e'); g.addColorStop(0.6, '#10283a'); g.addColorStop(1, '#080712');
  } else if (currentVisual === 'galaxy') {
    g.addColorStop(0, '#070a1c'); g.addColorStop(0.6, '#1a2248'); g.addColorStop(1, '#0b0816');
  } else if (currentVisual === 'snow' || currentVisual === 'train') {
    g.addColorStop(0, '#0b1222'); g.addColorStop(0.6, '#1b273d'); g.addColorStop(1, '#110d18');
  } else {
    g.addColorStop(0, '#120a1c'); g.addColorStop(0.6, '#241430'); g.addColorStop(1, '#0d0712');
  }
  rCtx.fillStyle = g;
  rCtx.fillRect(0, 0, w, h);

  // Central focal light / geometric emblem
  const cx = w * 0.5, cy = h * 0.46;
  const halo = rCtx.createRadialGradient(cx, cy, 2, cx, cy, 115);
  if (currentVisual === 'cyber') {
    halo.addColorStop(0, 'rgba(95, 225, 240, 0.35)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (currentVisual === 'inferno') {
    halo.addColorStop(0, 'rgba(245, 105, 65, 0.38)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    halo.addColorStop(0, 'rgba(240, 200, 135, 0.36)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
  }
  rCtx.fillStyle = halo;
  rCtx.beginPath();
  rCtx.arc(cx, cy, 115, 0, Math.PI * 2);
  rCtx.fill();

  // Concentric low-poly rings
  for (let r = 1; r <= 4; r++) {
    const rad = r * 24 + Math.sin(tClock * 1.4 + r) * 3;
    rCtx.strokeStyle = currentVisual === 'cyber'
      ? `rgba(110, 225, 245, ${0.26 - r * 0.04})`
      : `rgba(225, 190, 140, ${0.26 - r * 0.04})`;
    rCtx.lineWidth = 1.2;
    rCtx.beginPath();
    const sides = currentVisual === 'cyber' ? 6 : 12;
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2 + tClock * 0.1 * (r % 2 ? 1 : -1);
      const px = cx + Math.cos(a) * rad * 1.4;
      const py = cy + Math.sin(a) * rad * 0.7;
      if (s === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
    }
    rCtx.stroke();
  }

  // Faceted low-poly horizon
  const cols = 14;
  const step = w / cols;
  const baseY = h * 0.68;
  for (let i = 0; i < cols; i++) {
    const x0 = i * step, x1 = (i + 1) * step, xm = (x0 + x1) * 0.5;
    const peak = baseY - Math.abs(Math.sin(i * 1.6 + currentVisual.length)) * 34;
    rCtx.fillStyle = i % 2 === 0 ? 'rgba(22, 12, 30, 0.78)' : 'rgba(14, 8, 20, 0.88)';
    rCtx.beginPath();
    rCtx.moveTo(x0, h);
    rCtx.lineTo(x0, baseY);
    rCtx.lineTo(xm, peak);
    rCtx.lineTo(x1, baseY);
    rCtx.lineTo(x1, h);
    rCtx.closePath();
    rCtx.fill();
  }

  // Floating motes
  for (let i = 0; i < 28; i++) {
    const s = bgStars[i];
    const px = ((s.x + tClock * 0.015 * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * w;
    const py = ((s.y + tClock * 0.025) % 1) * h;
    rCtx.fillStyle = currentVisual === 'cyber'
      ? 'rgba(130, 235, 250, 0.45)'
      : 'rgba(235, 205, 160, 0.45)';
    rCtx.beginPath();
    rCtx.arc(px, py, s.r, 0, Math.PI * 2);
    rCtx.fill();
  }

  rCtx.restore();
}

export function renderLibraryCards() {
  clearScreen();
}
