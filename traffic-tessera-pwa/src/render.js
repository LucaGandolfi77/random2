import { VEHICLE_COLORS } from "./config.js";
import { legalMoves, vehicleCells } from "./rules.js";

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function shade(hex, amount) {
  const value = parseInt(hex.replace("#", ""), 16);
  const red = Math.max(0, Math.min(255, (value >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const blue = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${red},${green},${blue})`;
}

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.settings = settings;
    this.layout = null;
    this.visual = new Map();
    this.particles = [];
    this.hintId = null;
    this.hintMove = null;
    this.hintUntil = 0;
    this.moveCache = null;
  }

  setSettings(settings) {
    this.settings = settings;
  }

  setHint(move) {
    this.hintMove = move ? { ...move } : null;
    this.hintId = move?.id || null;
    this.hintUntil = performance.now() + 2200;
  }

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
    const padding = Math.min(22, rect.width * 0.05);
    const board = Math.max(1, Math.min(rect.width, rect.height) - padding * 2);
    this.layout = {
      width: rect.width,
      height: rect.height,
      x: (rect.width - board) / 2,
      y: (rect.height - board) / 2,
      board
    };
  }

  pointToCell(clientX, clientY, size) {
    if (!this.layout) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cell = this.layout.board / size;
    const gridX = Math.floor((x - this.layout.x) / cell);
    const gridY = Math.floor((y - this.layout.y) / cell);
    if (gridX < 0 || gridY < 0 || gridX >= size || gridY >= size) return null;
    return { x: gridX, y: gridY };
  }

  vehicleAt(clientX, clientY, state) {
    const cell = this.pointToCell(clientX, clientY, state.size);
    if (!cell) return null;
    return state.vehicles.find(vehicle => vehicle.status !== "exited"
      && vehicleCells(vehicle).some(part => part.x === cell.x && part.y === cell.y)) || null;
  }

  burst(vehicle, state) {
    if (this.settings.reducedMotion || !this.layout) return;
    const cell = this.layout.board / state.size;
    const x = this.layout.x + (vehicle.x + (vehicle.orientation === "h" ? vehicle.length : 1) / 2) * cell;
    const y = this.layout.y + (vehicle.y + (vehicle.orientation === "v" ? vehicle.length : 1) / 2) * cell;
    const color = VEHICLE_COLORS[vehicle.color % VEHICLE_COLORS.length].hex;
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 35 + Math.random() * 70;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        color
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(state, level, now, dt) {
    this.resize();
    if (this.layout.width < 2 || this.layout.height < 2) return;
    this.update(dt || 0);
    const ctx = this.ctx;
    const layout = this.layout;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const background = ctx.createRadialGradient(layout.width * 0.5, layout.height * 0.42, 20, layout.width * 0.5, layout.height * 0.5, layout.board);
    background.addColorStop(0, "#17243a");
    background.addColorStop(0.65, "#0d1626");
    background.addColorStop(1, "#070c16");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, layout.width, layout.height);

    this.drawCity(ctx, layout, now);
    this.drawBoard(ctx, state, level);
    this.drawTerminals(ctx, state, level, now);
    this.drawWalls(ctx, state, level);
    this.drawMoves(ctx, state, level, now);
    this.drawVehicles(ctx, state, now, dt || 0);
    this.drawParticles(ctx);
  }

  drawCity(ctx, layout, now) {
    ctx.save();
    ctx.fillStyle = "rgba(169,201,245,.14)";
    for (let i = 0; i < 26; i++) {
      const x = (i * 97 % 101) / 101 * layout.width;
      const y = (i * 53 % 89) / 89 * layout.height;
      const pulse = 0.6 + Math.sin(now * 0.001 + i) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }

  drawBoard(ctx, state, level) {
    const { x, y, board } = this.layout;
    const cell = board / state.size;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 14;
    roundedRect(ctx, x - 7, y - 7, board + 14, board + 14, 24);
    ctx.fillStyle = "#111c2d";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    roundedRect(ctx, x, y, board, board, 18);
    ctx.fillStyle = "#162238";
    ctx.fill();
    ctx.strokeStyle = "rgba(169,201,245,.16)";
    ctx.lineWidth = 1;
    for (let i = 1; i < state.size; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * cell, y);
      ctx.lineTo(x + i * cell, y + board);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + i * cell);
      ctx.lineTo(x + board, y + i * cell);
      ctx.stroke();
    }
    ctx.setLineDash([5, 8]);
    ctx.strokeStyle = "rgba(247,227,161,.09)";
    for (let i = 1; i < state.size; i += 2) {
      ctx.beginPath();
      ctx.moveTo(x + i * cell, y + 8);
      ctx.lineTo(x + i * cell, y + board - 8);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawTerminals(ctx, state, level, now) {
    const { x, y, board } = this.layout;
    const cell = board / state.size;
    for (const terminal of level.terminals) {
      const colorInfo = VEHICLE_COLORS[terminal.color % VEHICLE_COLORS.length];
      const color = colorInfo.hex;
      const left = x + terminal.x * cell;
      const top = y + terminal.y * cell;
      const centerX = left + cell / 2;
      const centerY = top + cell / 2;
      const direction = terminal.side === "top" ? { x: 0, y: -1 }
        : terminal.side === "right" ? { x: 1, y: 0 }
          : terminal.side === "bottom" ? { x: 0, y: 1 } : { x: -1, y: 0 };
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 + Math.sin(now * 0.003 + terminal.x) * 4;
      roundedRect(ctx, left + 3, top + 3, cell - 6, cell - 6, 8);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = terminal.requiresDock ? 3 : 2;
      ctx.stroke();
      if (terminal.requiresDock) {
        ctx.lineWidth = 1;
        roundedRect(ctx, left + 7, top + 7, cell - 14, cell - 14, 5);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `850 ${Math.max(10, cell * 0.28)}px system-ui`;
      ctx.fillText(colorInfo.symbol, centerX - direction.x * cell * 0.16, centerY - direction.y * cell * 0.16);
      ctx.font = `800 ${Math.max(9, cell * 0.22)}px system-ui`;
      ctx.fillText(terminal.side === "top" ? "↑" : terminal.side === "right" ? "→" : terminal.side === "bottom" ? "↓" : "←",
        centerX + direction.x * cell * 0.24, centerY + direction.y * cell * 0.24);
      if (terminal.oneWay) {
        ctx.fillStyle = "#eef3fb";
        ctx.beginPath();
        ctx.arc(centerX - direction.x * cell * 0.28, centerY - direction.y * cell * 0.28, Math.max(1.5, cell * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawWalls(ctx, state, level) {
    const { x, y, board } = this.layout;
    const cell = board / state.size;
    for (const wall of level.walls) {
      const left = x + wall.x * cell + 3;
      const top = y + wall.y * cell + 3;
      ctx.save();
      roundedRect(ctx, left, top, cell - 6, cell - 6, 6);
      ctx.fillStyle = "#33425a";
      ctx.fill();
      ctx.strokeStyle = "#53637d";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = "rgba(247,227,161,.25)";
      for (let offset = -cell; offset < cell * 2; offset += 9) {
        ctx.beginPath();
        ctx.moveTo(left + offset, top);
        ctx.lineTo(left + offset + cell, top + cell);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawMoves(ctx, state, level, now) {
    if (!state.selected || state.status !== "playing") return;
    const signature = state.vehicles.map(vehicle => `${vehicle.id}:${vehicle.x},${vehicle.y},${vehicle.status}`).join("|");
    if (!this.moveCache || this.moveCache.signature !== signature) {
      this.moveCache = { signature, moves: legalMoves(state.vehicles, level).filter(move => move.id === state.selected) };
    }
    const { x, y, board } = this.layout;
    const cell = board / state.size;
    ctx.save();
    for (const move of this.moveCache.moves) {
      if (move.type !== "move") continue;
      ctx.globalAlpha = 0.2 + Math.sin(now * 0.004) * 0.05;
      ctx.fillStyle = "#dce8f7";
      ctx.beginPath();
      ctx.arc(x + (move.x + 0.5) * cell, y + (move.y + 0.5) * cell, Math.max(2, cell * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.hintMove?.type === "move" && this.hintMove.id === state.selected && now < this.hintUntil) {
      const pulse = 0.55 + Math.sin(now * 0.01) * 0.2;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + (this.hintMove.x + 0.5) * cell, y + (this.hintMove.y + 0.5) * cell, cell * (0.3 + pulse * 0.08), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawVehicles(ctx, state, now, dt) {
    const { x, y, board } = this.layout;
    const cell = board / state.size;
    const activeIds = new Set(state.vehicles.filter(vehicle => vehicle.status !== "exited").map(vehicle => vehicle.id));
    for (const vehicle of state.vehicles) {
      let visual = this.visual.get(vehicle.id);
      if (!visual) {
        visual = { x: vehicle.x, y: vehicle.y, alpha: vehicle.status === "exited" ? 0 : 1 };
        this.visual.set(vehicle.id, visual);
      }
      const targetAlpha = vehicle.status === "exited" ? 0 : 1;
      if (this.settings.reducedMotion) {
        visual.x = vehicle.x;
        visual.y = vehicle.y;
        visual.alpha = targetAlpha;
      } else {
        const blend = Math.min(1, dt * 16);
        visual.x += (vehicle.x - visual.x) * blend;
        visual.y += (vehicle.y - visual.y) * blend;
        visual.alpha += (targetAlpha - visual.alpha) * Math.min(1, dt * 10);
      }
      if (visual.alpha <= 0.01 && !activeIds.has(vehicle.id)) {
        this.visual.delete(vehicle.id);
        continue;
      }
      this.drawVehicle(ctx, vehicle, visual, state, cell, x, y, now);
    }
  }

  drawVehicle(ctx, vehicle, visual, state, cell, boardX, boardY, now) {
    const horizontal = vehicle.orientation === "h";
    const width = (horizontal ? vehicle.length : 1) * cell;
    const height = (horizontal ? 1 : vehicle.length) * cell;
    const left = boardX + visual.x * cell;
    const top = boardY + visual.y * cell;
    const colorInfo = VEHICLE_COLORS[vehicle.color % VEHICLE_COLORS.length];
    const color = colorInfo.hex;
    const selected = state.selected === vehicle.id && vehicle.status !== "exited";
    const hinted = this.hintId === vehicle.id && now < this.hintUntil;
    const padding = Math.max(3, cell * 0.09);
    ctx.save();
    ctx.globalAlpha = visual.alpha;
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = selected || hinted ? 18 : 9;
    ctx.shadowOffsetY = 5;
    roundedRect(ctx, left + padding, top + padding, width - padding * 2, height - padding * 2, cell * 0.2);
    const gradient = ctx.createLinearGradient(left, top, left + width, top + height);
    gradient.addColorStop(0, shade(color, 24));
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, shade(color, -28));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = selected || hinted ? "#ffffff" : "rgba(255,255,255,.35)";
    ctx.lineWidth = selected || hinted ? 3 : 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(9,16,28,.62)";
    if (horizontal) {
      roundedRect(ctx, left + width * 0.28, top + padding + 2, width * 0.44, height - padding * 2 - 4, 4);
      ctx.fillStyle = "rgba(220,235,250,.55)";
      roundedRect(ctx, left + width * 0.34, top + padding + 4, width * 0.32, Math.max(2, height * 0.12), 2);
      ctx.fill();
    } else {
      roundedRect(ctx, left + padding + 2, top + height * 0.28, width - padding * 2 - 4, height * 0.44, 4);
      ctx.fillStyle = "rgba(220,235,250,.55)";
      roundedRect(ctx, left + padding + 4, top + height * 0.34, Math.max(2, width * 0.12), height * 0.32, 2);
      ctx.fill();
    }

    ctx.fillStyle = "#09101c";
    ctx.font = `850 ${Math.max(10, cell * 0.3)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(colorInfo.symbol, left + width / 2, top + height / 2 + 1);
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / 0.7);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
