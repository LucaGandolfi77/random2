import { COLORS } from "./config.js";

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

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.settings = settings;
    this.layout = null;
    this.particles = [];
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
    this.layout = {
      width: rect.width,
      height: rect.height,
      pad: Math.max(10, Math.min(18, rect.width * 0.035)),
      cell: 0,
      ox: 0,
      oy: 0
    };
    const state = this.currentState;
    if (state) this.computeGrid(state);
  }

  computeGrid(state) {
    const l = this.layout;
    const usableW = l.width - l.pad * 2;
    const usableH = l.height - l.pad * 2;
    l.cell = Math.floor(Math.min(usableW / state.width, usableH / state.height));
    l.ox = Math.round((l.width - l.cell * state.width) / 2);
    l.oy = Math.round((l.height - l.cell * state.height) / 2);
  }

  cellRect(x, y) {
    const l = this.layout;
    return { x: l.ox + x * l.cell, y: l.oy + y * l.cell, w: l.cell, h: l.cell };
  }

  pointerToCell(clientX, clientY) {
    if (!this.layout) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor((x - this.layout.ox) / this.layout.cell);
    const row = Math.floor((y - this.layout.oy) / this.layout.cell);
    const state = this.currentState;
    if (!state || col < 0 || row < 0 || col >= state.width || row >= state.height) return null;
    return { x: col, y: row };
  }

  burst(x, y, color) {
    if (this.settings.reducedMotion) return;
    const rect = this.cellRect(x, y);
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      this.particles.push({
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2,
        vx: Math.cos(angle) * (35 + Math.random() * 45),
        vy: Math.sin(angle) * (35 + Math.random() * 45),
        life: 0.45,
        color
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(state, time, dt) {
    this.currentState = state;
    this.resize();
    this.computeGrid(state);
    this.updateParticles(dt || 0);
    const ctx = this.ctx;
    const l = this.layout;
    ctx.clearRect(0, 0, l.width, l.height);
    ctx.save();
    if (state.shake > 0 && !this.settings.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * state.shake * 20, (Math.random() - 0.5) * state.shake * 20);
    }

    this.drawFloor(state, time);
    this.drawBlackouts(state, time);
    this.drawLifts(state, time);
    this.drawHint(state, time);
    this.drawCells(state, time);
    this.drawParticles();
    ctx.restore();
  }

  drawFloor(state, time) {
    const ctx = this.ctx;
    const l = this.layout;
    const gradient = ctx.createLinearGradient(0, 0, l.width, l.height);
    gradient.addColorStop(0, "#111827");
    gradient.addColorStop(0.55, "#0b1020");
    gradient.addColorStop(1, "#080b14");
    ctx.fillStyle = gradient;
    rounded(ctx, l.ox - 6, l.oy - 6, l.cell * state.width + 12, l.cell * state.height + 12, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const r = this.cellRect(x, y);
        ctx.fillStyle = (x + y) % 2 ? "rgba(255,255,255,.018)" : "rgba(255,255,255,.008)";
        ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      }
    }

    if (!this.settings.reducedMotion) {
      const pulse = 0.04 + Math.sin(time * 0.0015) * 0.015;
      ctx.fillStyle = `rgba(83,214,181,${pulse})`;
      ctx.fillRect(l.ox, l.oy + l.cell * state.height - 2, l.cell * state.width, 2);
    }
  }

  drawBlackouts(state, time) {
    const ctx = this.ctx;
    for (const zone of state.blackouts) {
      for (const p of zone.cells) {
        const r = this.cellRect(p.x, p.y);
        if (zone.active && !this.settings.showDark) {
          ctx.fillStyle = "rgba(0,0,0,.72)";
          ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
          ctx.strokeStyle = "rgba(181,140,255,.28)";
          ctx.setLineDash([4, 5]);
          ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
          ctx.setLineDash([]);
        } else if (zone.active) {
          ctx.fillStyle = "rgba(181,140,255,.09)";
          ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }
      }
      if (zone.active && !this.settings.reducedMotion) {
        const first = zone.cells[0];
        const r = this.cellRect(first.x, first.y);
        ctx.fillStyle = "rgba(181,140,255,.65)";
        ctx.font = `600 ${Math.max(9, lFont(r.w * 0.2))}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BLACKOUT", r.x + r.w / 2, r.y + r.h / 2);
      }
    }
  }

  drawLifts(state, time) {
    const ctx = this.ctx;
    for (const lift of state.elevators) {
      const a = this.cellRect(lift.axis === "row" ? 0 : lift.a, lift.axis === "row" ? lift.a : 1);
      const w = lift.axis === "row" ? this.layout.cell * state.width : this.layout.cell;
      const h = lift.axis === "row" ? this.layout.cell * 2 : this.layout.cell * (state.height - 1);
      ctx.strokeStyle = "rgba(88,166,255,.45)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = this.settings.reducedMotion ? 0 : -time * 0.02;
      rounded(ctx, a.x + 3, a.y + 3, w - 6, h - 6, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawHint(state, time) {
    if (!state.hintPath || !state.hintPath.length) return;
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(255,209,102,.75)";
    ctx.lineWidth = Math.max(2, this.layout.cell * 0.07);
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = this.settings.reducedMotion ? 0 : -time * 0.03;
    ctx.beginPath();
    state.hintPath.forEach((p, i) => {
      const r = this.cellRect(p.x, p.y);
      if (i === 0) ctx.moveTo(r.x + r.w / 2, r.y + r.h / 2);
      else ctx.lineTo(r.x + r.w / 2, r.y + r.h / 2);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawCells(state, time) {
    const ctx = this.ctx;
    for (const door of state.doors) this.drawDoor(door, time);
    for (let y = 1; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.cells[y * state.width + x];
        if (!cell) continue;
        if (cell.kind === "wall") this.drawWall(x, y);
        else if (cell.kind === "generator") this.drawGenerator(cell, state, x, y, time);
        else if (cell.kind === "block") this.drawBlock(cell, x, y, state, time);
      }
    }
  }

  drawDoor(door, time) {
    const ctx = this.ctx;
    const r = this.cellRect(door.x, door.y);
    const color = COLORS[door.color];
    const full = door.filled >= door.capacity;
    const inset = Math.max(3, r.w * 0.08);
    ctx.fillStyle = full ? "rgba(83,214,181,.18)" : "rgba(255,255,255,.055)";
    rounded(ctx, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, r.w * 0.18);
    ctx.fill();
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = full ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = color.hex;
    ctx.globalAlpha = full ? 0.28 : 0.14;
    ctx.fillRect(r.x + inset + 2, r.y + r.h * 0.58, r.w - inset * 2 - 4, r.h * 0.28);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e5edf9";
    ctx.font = `700 ${Math.max(11, r.w * 0.25)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(full ? "✓" : color.symbol, r.x + r.w / 2, r.y + r.h * 0.43);
    ctx.font = `600 ${Math.max(8, r.w * 0.16)}px system-ui`;
    ctx.fillStyle = "rgba(229,237,249,.72)";
    ctx.fillText(`${door.filled}/${door.capacity}`, r.x + r.w / 2, r.y + r.h * 0.78);
  }

  drawWall(x, y) {
    const ctx = this.ctx;
    const r = this.cellRect(x, y);
    const inset = Math.max(2, r.w * 0.06);
    const gradient = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    gradient.addColorStop(0, "#263248");
    gradient.addColorStop(1, "#151d2c");
    ctx.fillStyle = gradient;
    rounded(ctx, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, r.w * 0.14);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(148,163,184,.14)";
    ctx.beginPath();
    ctx.moveTo(r.x + r.w * 0.25, r.y + r.h * 0.2);
    ctx.lineTo(r.x + r.w * 0.75, r.y + r.h * 0.8);
    ctx.moveTo(r.x + r.w * 0.75, r.y + r.h * 0.2);
    ctx.lineTo(r.x + r.w * 0.25, r.y + r.h * 0.8);
    ctx.stroke();
  }

  drawGenerator(cell, state, x, y, time) {
    const ctx = this.ctx;
    const gen = state.generators.find((g) => g.id === cell.id);
    if (!gen) return;
    const r = this.cellRect(x, y);
    const color = COLORS[gen.color];
    const inset = Math.max(2, r.w * 0.07);
    ctx.fillStyle = "#0a0f1b";
    rounded(ctx, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, r.w * 0.16);
    ctx.fill();
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    if (!this.settings.reducedMotion) ctx.rotate(time * 0.0004);
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = Math.max(2, r.w * 0.06);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r.w * 0.08);
      ctx.lineTo(0, -r.w * 0.28);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(229,237,249,.8)";
    ctx.font = `700 ${Math.max(8, r.w * 0.15)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(`${gen.spawned}/${gen.total}`, r.x + r.w / 2, r.y + r.h * 0.82);
  }

  drawBlock(block, x, y, state, time) {
    const ctx = this.ctx;
    const r = this.cellRect(x, y);
    const color = block.gray ? null : COLORS[block.color];
    const selected = state.selected === block.id;
    const hidden = state.blackouts.some((zone) => zone.active && zone.cells.some((p) => p.x === x && p.y === y)) && !this.settings.showDark;
    const inset = Math.max(3, r.w * (selected ? 0.055 : 0.085));
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.18;
    const gradient = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    if (block.gray) {
      gradient.addColorStop(0, "#e2e8f0");
      gradient.addColorStop(1, "#94a3b8");
    } else {
      gradient.addColorStop(0, color.hex);
      gradient.addColorStop(1, shade(color.hex, -28));
    }
    ctx.fillStyle = gradient;
    rounded(ctx, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, r.w * 0.2);
    ctx.fill();
    ctx.strokeStyle = selected ? "#ffffff" : "rgba(255,255,255,.42)";
    ctx.lineWidth = selected ? 3 : 1.2;
    ctx.stroke();
    if (selected && !this.settings.reducedMotion) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + Math.sin(time * 0.008) * 0.15})`;
      ctx.lineWidth = 2;
      rounded(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, r.w * 0.22);
      ctx.stroke();
    }
    ctx.fillStyle = block.gray ? "#334155" : "rgba(8,12,22,.78)";
    ctx.font = `800 ${Math.max(12, r.w * 0.3)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(block.gray ? "?" : color.symbol, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.45);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function lFont(size) { return Math.max(8, size); }

function shade(hex, amount) {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `rgb(${r},${g},${b})`;
}
