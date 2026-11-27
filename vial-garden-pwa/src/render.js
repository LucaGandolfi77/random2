import { CAPACITY, COLORS } from "./config.js";

function rounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function shade(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.settings = settings;
    this.layout = null;
    this.particles = [];
    this.pourAnimation = null;
  }

  setSettings(settings) { this.settings = settings; }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = { width: rect.width, height: rect.height };
  }

  computeLayout(count) {
    const l = this.layout;
    const cols = count <= 6 ? 3 : count <= 9 ? 4 : 5;
    const rows = Math.ceil(count / cols);
    const pad = Math.max(12, l.width * 0.035);
    const gap = Math.max(8, l.width * 0.018);
    const tubeW = Math.min(66, (l.width - pad * 2 - gap * (cols - 1)) / cols * 0.72);
    const tubeH = Math.min(tubeW * 2.45, (l.height - pad * 2 - gap * (rows - 1)) / rows);
    const gridW = cols * tubeW + (cols - 1) * gap;
    const gridH = rows * tubeH + (rows - 1) * gap;
    const ox = (l.width - gridW) / 2;
    const oy = (l.height - gridH) / 2;
    const positions = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.push({ x: ox + col * (tubeW + gap), y: oy + row * (tubeH + gap), w: tubeW, h: tubeH });
    }
    return positions;
  }

  pointerToTube(clientX, clientY, count) {
    if (!this.layout) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const positions = this.computeLayout(count);
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (x >= p.x - 4 && x <= p.x + p.w + 4 && y >= p.y - 4 && y <= p.y + p.h + 4) return i;
    }
    return null;
  }

  animatePour(from, to, color) {
    if (this.settings.reducedMotion) return;
    this.pourAnimation = { from, to, color, start: performance.now(), duration: 320 };
  }

  burst(tubeIndex, color) {
    if (this.settings.reducedMotion || !this.layout) return;
    const positions = this.computeLayout(this.currentCount || 1);
    const p = positions[tubeIndex];
    if (!p) return;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.push({
        x: p.x + p.w / 2,
        y: p.y + p.h * 0.65,
        vx: Math.cos(angle) * (35 + Math.random() * 55),
        vy: Math.sin(angle) * (35 + Math.random() * 55),
        life: 0.7,
        color
      });
    }
  }

  update(dt, now) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 70 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.pourAnimation && now - this.pourAnimation.start > this.pourAnimation.duration) this.pourAnimation = null;
  }

  draw(state, validTargets, hint, now, dt) {
    this.resize();
    if (this.layout.width < 2 || this.layout.height < 2) return;
    this.currentCount = state.tubes.length;
    this.update(dt || 0, now);
    const ctx = this.ctx;
    const l = this.layout;
    ctx.clearRect(0, 0, l.width, l.height);
    const gradient = ctx.createLinearGradient(0, 0, l.width, l.height);
    gradient.addColorStop(0, "#142033");
    gradient.addColorStop(0.55, "#0e1728");
    gradient.addColorStop(1, "#0a1120");
    ctx.fillStyle = gradient;
    rounded(ctx, 4, 4, l.width - 8, l.height - 8, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const positions = this.computeLayout(state.tubes.length);
    for (let i = 0; i < state.tubes.length; i++) {
      this.drawTube(ctx, positions[i], state.tubes[i], i, state.selected, validTargets.includes(i), hint, now);
    }
    this.drawPourAnimation(ctx, positions, now);
    this.drawParticles(ctx);
  }

  drawTube(ctx, p, tube, index, selected, valid, hint, now) {
    const color = selected === index ? "#a8e6cf" : valid ? "#f7e3a1" : "rgba(200,216,236,.42)";
    ctx.fillStyle = selected === index ? "rgba(168,230,207,.07)" : valid ? "rgba(247,227,161,.05)" : "rgba(255,255,255,.018)";
    rounded(ctx, p.x - 5, p.y - 5, p.w + 10, p.h + 10, 18);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = selected === index || valid ? 2.5 : 1.4;
    rounded(ctx, p.x, p.y, p.w, p.h, p.w * 0.28);
    ctx.stroke();

    ctx.save();
    rounded(ctx, p.x + 3, p.y + 3, p.w - 6, p.h - 6, p.w * 0.24);
    ctx.clip();
    const innerH = p.h - 12;
    const unitH = innerH / CAPACITY;
    for (let i = 0; i < tube.length; i++) {
      const unit = tube[i];
      const y = p.y + p.h - 6 - (i + 1) * unitH;
      const liquid = ctx.createLinearGradient(p.x, y, p.x + p.w, y + unitH);
      liquid.addColorStop(0, COLORS[unit].hex);
      liquid.addColorStop(1, shade(COLORS[unit].hex, -18));
      ctx.fillStyle = liquid;
      ctx.fillRect(p.x + 4, y, p.w - 8, unitH + 0.5);
      ctx.fillStyle = "rgba(8,12,22,.55)";
      ctx.font = `700 ${Math.max(8, unitH * 0.34)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(COLORS[unit].symbol, p.x + p.w / 2, y + unitH / 2);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,.16)";
    rounded(ctx, p.x + p.w * 0.16, p.y + 8, p.w * 0.1, p.h * 0.68, p.w * 0.05);
    ctx.fill();

    if (hint && (hint.from === index || hint.to === index)) {
      ctx.strokeStyle = hint.from === index ? "#a8e6cf" : "#f7e3a1";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = this.settings.reducedMotion ? 0 : -now * 0.02;
      rounded(ctx, p.x - 8, p.y - 8, p.w + 16, p.h + 16, 20);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawPourAnimation(ctx, positions, now) {
    const animation = this.pourAnimation;
    if (!animation) return;
    const t = Math.min(1, (now - animation.start) / animation.duration);
    const from = positions[animation.from];
    const to = positions[animation.to];
    if (!from || !to) return;
    const x1 = from.x + from.w / 2;
    const y1 = from.y + 12;
    const x2 = to.x + to.w / 2;
    const y2 = to.y + 12;
    ctx.strokeStyle = COLORS[animation.color].hex;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 - 45 * t, x2, y2 - 45 * t, x2, y2);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.7);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
