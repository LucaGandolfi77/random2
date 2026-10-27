import CONFIG from './config.js';

let canvas, ctx;
let currentScene = 'memory';
let tClock = 0;
let motes = [];
let animId = 0;

export function initRender() {
  canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  motes = [];
  for (let i = 0; i < 42; i++) {
    motes.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2.4 + 0.8,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * 0.025 + 0.008
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
      drawProustCanvas();
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
  drawProustCanvas();
}

export function clearScreen(scene = 'memory') {
  currentScene = scene || 'memory';
  drawProustCanvas();
}

function drawProustCanvas() {
  if (!canvas || !ctx) return;
  const w = window.innerWidth || CONFIG.canvas.width;
  const h = window.innerHeight || CONFIG.canvas.height;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (currentScene === 'sea') {
    g.addColorStop(0, '#0f1c30');
    g.addColorStop(0.5, '#1e3852');
    g.addColorStop(1, '#120e1c');
  } else if (currentScene === 'redemption') {
    g.addColorStop(0, '#1c1228');
    g.addColorStop(0.5, '#2d1c38');
    g.addColorStop(1, '#0e0914');
  } else {
    g.addColorStop(0, '#16112a');
    g.addColorStop(0.5, '#251838');
    g.addColorStop(1, '#0d0912');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Stained-glass / teacup golden concentric ripples
  const cx = w * 0.5, cy = h * 0.34;
  for (let r = 1; r <= 5; r++) {
    const rad = r * 42 + (tClock * 14) % 42;
    const alpha = Math.max(0, 0.22 - (rad / 260) * 0.22);
    ctx.strokeStyle = currentScene === 'sea'
      ? `rgba(155, 215, 245, ${alpha.toFixed(3)})`
      : `rgba(235, 195, 130, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad * 1.35, rad * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Low-poly Combray steeple & Martinville twin towers silhouette
  const baseY = h * 0.52;
  const cols = 14;
  const step = w / cols;
  for (let i = 0; i < cols; i++) {
    const x0 = i * step, x1 = (i + 1) * step, xm = (x0 + x1) * 0.5;
    let peak = baseY - Math.abs(Math.sin(i * 1.4)) * 26;
    if (i === 4 || i === 9) peak = baseY - 95; // Twin steeples
    ctx.fillStyle = i % 2 === 0 ? 'rgba(26, 17, 38, 0.65)' : 'rgba(18, 11, 28, 0.78)';
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0, baseY);
    ctx.lineTo(xm, peak);
    ctx.lineTo(x1, baseY);
    ctx.lineTo(x1, h);
    ctx.closePath();
    ctx.fill();
  }

  // Golden Proustian dust motes
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i];
    m.y -= m.s * 0.016;
    m.x += Math.sin(tClock * 0.8 + m.p) * 0.0007;
    if (m.y < -0.02) m.y = 1.02;
    const alpha = 0.2 + 0.22 * Math.sin(tClock * 1.8 + m.p);
    ctx.fillStyle = `rgba(238, 205, 150, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function updateUI() {}
