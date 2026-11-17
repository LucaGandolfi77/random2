/* Animated, theme-driven backdrops drawn behind the cabinet. */
import { CANVAS } from '../config.js';

const { width: W, height: H } = CANVAS;
const FAMILY = {
  neon: 'spark', retro: 'grid', forest: 'leaves', ocean: 'bubbles',
  egypt: 'sand', cosmic: 'stars', candy: 'sprinkles', norse: 'snow',
  samurai: 'embers', safari: 'dust',
  barblue: 'bubbles', girobar: 'spark', armata: 'confetti',
  sinibbio: 'snow', agente: 'leaves', principina: 'bubbles',
};

function seeded(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function stars(ctx, t, color, time) {
  for (let i = 0; i < 60; i++) {
    const x = seeded(i) * W;
    const y = seeded(i + 99) * H;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(time / 700 + i));
    ctx.globalAlpha = 0.15 + tw * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 0.8 + seeded(i + 33) * 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bubbles(ctx, t, color, time) {
  for (let i = 0; i < 28; i++) {
    const x = seeded(i) * W;
    const speed = 18 + seeded(i + 7) * 36;
    const y = (H + 30 - (time / 1000 * speed + seeded(i + 18) * H)) % (H + 60);
    ctx.globalAlpha = 0.12 + seeded(i + 4) * 0.18;
    ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 4 + seeded(i + 11) * 12, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function sparks(ctx, t, color, time) {
  for (let i = 0; i < 36; i++) {
    const x = (seeded(i) * W + Math.sin(time / 900 + i) * 18) % W;
    const y = (seeded(i + 40) * H - time / 1000 * (10 + seeded(i) * 30)) % H;
    ctx.globalAlpha = 0.12 + 0.25 * Math.abs(Math.sin(time / 400 + i));
    ctx.fillStyle = color;
    ctx.fillRect(x, y < 0 ? y + H : y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function falling(ctx, t, color, time, kind) {
  const count = 30;
  for (let i = 0; i < count; i++) {
    const x = seeded(i) * W + Math.sin(time / 1300 + i) * 26;
    const speed = kind === 'embers' ? -(12 + seeded(i + 5) * 24) : 14 + seeded(i + 5) * 26;
    const y = ((time / 1000 * speed + seeded(i + 22) * H) % H + H) % H;
    ctx.globalAlpha = 0.1 + seeded(i + 9) * 0.25;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (kind === 'leaves') ctx.ellipse(x, y, 5, 2.5, time / 1000 + i, 0, Math.PI * 2);
    else if (kind === 'embers') ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    else ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sand(ctx, t, color, time) {
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, H - 70 - i * 42 + Math.sin(x / 60 + time / 2200 + i) * 14);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function grid(ctx, t, color, time) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  const off = (time / 60) % 40;
  for (let x = -40 + off; x <= W + 40; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = -40 + off; y <= H + 40; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

export function drawBackground(ctx, themeKey, theme, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, theme.bg);
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft halo behind the machine.
  const halo = ctx.createRadialGradient(W / 2, 300, 20, W / 2, 400, 460);
  halo.addColorStop(0, theme.glow + '18');
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  const fam = FAMILY[themeKey] || 'spark';
  const color = theme.glow;
  if (fam === 'stars' || fam === 'spark') stars(ctx, theme, color, time);
  else if (fam === 'bubbles') bubbles(ctx, theme, color, time);
  else if (fam === 'sand' || fam === 'dust') sand(ctx, theme, color, time);
  else if (fam === 'grid') grid(ctx, theme, color, time);
  else if (fam === 'embers' || fam === 'snow' || fam === 'leaves') falling(ctx, theme, color, time, fam);
  else sparks(ctx, theme, color, time);

  if (fam === 'sprinkles') {
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 ? theme.accent : color;
      ctx.save();
      ctx.translate(seeded(i) * W, (seeded(i + 7) * H + time / 30) % H);
      ctx.rotate(i);
      ctx.fillRect(-4, -1.5, 8, 3);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
