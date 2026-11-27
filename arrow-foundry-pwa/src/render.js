import { DIRECTIONS } from "./config.js";

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
    this.exits = [];
  }
  setSettings(settings) { this.settings = settings; }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = { width: rect.width, height: rect.height };
  }
  computeGrid(size) {
    const l = this.layout;
    const pad = Math.max(10, Math.min(18, l.width * 0.035));
    const cell = Math.floor(Math.min((l.width - pad * 2) / size, (l.height - pad * 2) / size));
    return { cell, ox: Math.round((l.width - cell * size) / 2), oy: Math.round((l.height - cell * size) / 2) };
  }
  cellRect(x, y, size) {
    const g = this.computeGrid(size);
    return { x: g.ox + x * g.cell, y: g.oy + y * g.cell, w: g.cell, h: g.cell };
  }
  pointerToCell(clientX, clientY, size) {
    if (!this.layout) return null;
    const rect = this.canvas.getBoundingClientRect();
    const g = this.computeGrid(size);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor((x - g.ox) / g.cell);
    const row = Math.floor((y - g.oy) / g.cell);
    if (col < 0 || row < 0 || col >= size || row >= size) return null;
    return { x: col, y: row };
  }
  animateExit(index, dir) {
    if (this.settings.reducedMotion) return;
    this.exits.push({ index, dir, start: performance.now(), duration: 360 });
  }
  burst(index, size, color) {
    if (this.settings.reducedMotion || !this.layout) return;
    const arrow = this.lastState?.arrows[index];
    if (!arrow) return;
    const r = this.cellRect(arrow.x, arrow.y, size);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.particles.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, vx: Math.cos(angle) * (35 + Math.random() * 50), vy: Math.sin(angle) * (35 + Math.random() * 50), life: 0.55, color });
    }
  }
  update(dt, now) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.exits = this.exits.filter((exit) => now - exit.start < exit.duration);
  }
  draw(state, removable, now, dt) {
    this.resize();
    if (this.layout.width < 2 || this.layout.height < 2) return;
    this.lastState = state;
    this.update(dt || 0, now);
    const ctx = this.ctx;
    const l = this.layout;
    const g = this.computeGrid(state.size);
    ctx.clearRect(0, 0, l.width, l.height);
    const gradient = ctx.createLinearGradient(0, 0, l.width, l.height);
    gradient.addColorStop(0, "#182238"); gradient.addColorStop(0.55, "#10192a"); gradient.addColorStop(1, "#0a1120");
    ctx.fillStyle = gradient; rounded(ctx, g.ox - 8, g.oy - 8, g.cell * state.size + 16, g.cell * state.size + 16, 22); ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.22)"; ctx.lineWidth = 1; ctx.stroke();
    for (let y = 0; y < state.size; y++) for (let x = 0; x < state.size; x++) {
      const r = this.cellRect(x, y, state.size);
      ctx.fillStyle = (x + y) % 2 ? "rgba(255,255,255,.022)" : "rgba(255,255,255,.01)";
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.strokeStyle = "rgba(148,163,184,.08)"; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    }
    for (const wall of state.walls) this.drawWall(wall.x, wall.y, state.size);
    for (const door of state.doors) this.drawDoor(door, state, now);
    for (const arrow of state.arrows) if (arrow.status !== "removed") this.drawArrow(arrow, state.size, removable.includes(arrow.index), state.highlight.includes(arrow.index), now);
    this.drawExits(state, now);
    this.drawParticles(ctx);
  }
  drawWall(x, y, size) {
    const ctx = this.ctx; const r = this.cellRect(x, y, size); const inset = Math.max(2, r.w * 0.05);
    const gradient = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    gradient.addColorStop(0, "#34405a"); gradient.addColorStop(1, "#1d273b");
    ctx.fillStyle = gradient; rounded(ctx, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, r.w * 0.14); ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.28)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgba(148,163,184,.28)";
    for (const [dx, dy] of [[.22,.22],[.78,.22],[.22,.78],[.78,.78]]) { ctx.beginPath(); ctx.arc(r.x + r.w * dx, r.y + r.h * dy, Math.max(1.5, r.w * .035), 0, Math.PI * 2); ctx.fill(); }
  }
  drawDoor(door, state, now) {
    const ctx = this.ctx; const r = this.cellRect(door.x, door.y, state.size);
    const open = door.requires.every((id) => state.arrows.find((arrow) => arrow.id === id)?.status === "removed");
    ctx.fillStyle = open ? "rgba(168,230,207,.08)" : "rgba(213,185,236,.1)"; ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.strokeStyle = open ? "#a8e6cf" : "#d5b9ec"; ctx.lineWidth = 2; ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    if (!open) {
      const offset = this.settings.reducedMotion ? 0 : Math.sin(now * .004) * 1.5;
      ctx.fillStyle = "#34405a"; ctx.fillRect(r.x + r.w * .42 + offset, r.y + 5, r.w * .16, r.h - 10);
    } else {
      ctx.fillStyle = "#a8e6cf"; ctx.font = `700 ${Math.max(10, r.w * .28)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✓", r.x + r.w / 2, r.y + r.h / 2);
    }
  }
  drawArrow(arrow, size, removable, highlighted, now) {
    const ctx = this.ctx; const r = this.cellRect(arrow.x, arrow.y, size); const direction = DIRECTIONS[arrow.dir]; const inset = Math.max(3, r.w * .08);
    ctx.save();
    if (arrow.status === "weakened") ctx.globalAlpha = .62;
    const gradient = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    gradient.addColorStop(0, direction.color); gradient.addColorStop(1, shade(direction.color, -26));
    ctx.fillStyle = gradient; rounded(ctx, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, r.w * .2); ctx.fill();
    ctx.strokeStyle = highlighted ? "#ffffff" : removable ? "#f7e3a1" : "rgba(255,255,255,.4)"; ctx.lineWidth = highlighted ? 3 : removable ? 2 : 1; ctx.stroke();
    if (arrow.heavy) { ctx.strokeStyle = "rgba(8,12,22,.55)"; ctx.lineWidth = 2; rounded(ctx, r.x + inset + 4, r.y + inset + 4, r.w - inset * 2 - 8, r.h - inset * 2 - 8, r.w * .14); ctx.stroke(); }
    ctx.fillStyle = "rgba(8,12,22,.78)"; ctx.font = `800 ${Math.max(13, r.w * .42)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(direction.symbol, r.x + r.w / 2, r.y + r.h / 2 + 1);
    if (removable && !this.settings.reducedMotion) { ctx.strokeStyle = `rgba(247,227,161,${.35 + Math.sin(now * .006) * .15})`; ctx.lineWidth = 2; rounded(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, r.w * .22); ctx.stroke(); }
    ctx.restore();
  }
  drawExits(state, now) {
    const ctx = this.ctx;
    for (const exit of this.exits) {
      const arrow = state.arrows[exit.index]; if (!arrow) continue;
      const t = Math.min(1, (now - exit.start) / exit.duration); const direction = DIRECTIONS[exit.dir]; const r = this.cellRect(arrow.x, arrow.y, state.size);
      ctx.save(); ctx.globalAlpha = 1 - t; ctx.translate(direction.dx * r.w * t * 1.8, direction.dy * r.h * t * 1.8); ctx.fillStyle = direction.color; rounded(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, r.w * .2); ctx.fill(); ctx.fillStyle = "#09101c"; ctx.font = `800 ${Math.max(12, r.w * .38)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(direction.symbol, r.x + r.w / 2, r.y + r.h / 2); ctx.restore();
    }
  }
  drawParticles(ctx) {
    for (const p of this.particles) { ctx.globalAlpha = Math.max(0, p.life / .55); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
