import { BOARD_SIZE, COLORS } from "./config.js";
import { cellsFor, pieceSize } from "./pieces.js";

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
  constructor(boardCanvas, trayCanvas, settings) {
    this.boardCanvas = boardCanvas;
    this.trayCanvas = trayCanvas;
    this.boardCtx = boardCanvas.getContext("2d");
    this.trayCtx = trayCanvas.getContext("2d");
    this.settings = settings;
    this.boardLayout = null;
    this.trayLayout = null;
    this.particles = [];
  }

  setSettings(settings) { this.settings = settings; }

  resizeCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  resize() {
    const board = this.resizeCanvas(this.boardCanvas, this.boardCtx);
    const tray = this.resizeCanvas(this.trayCanvas, this.trayCtx);
    if (board.width < 2 || board.height < 2 || tray.width < 2 || tray.height < 2) {
      this.boardLayout = null;
      this.trayLayout = null;
      return;
    }
    const pad = Math.max(8, Math.min(16, board.width * 0.03));
    const cell = Math.floor(Math.min((board.width - pad * 2) / BOARD_SIZE, (board.height - pad * 2) / BOARD_SIZE));
    this.boardLayout = {
      width: board.width,
      height: board.height,
      cell,
      ox: Math.round((board.width - cell * BOARD_SIZE) / 2),
      oy: Math.round((board.height - cell * BOARD_SIZE) / 2)
    };
    this.trayLayout = {
      width: tray.width,
      height: tray.height,
      slot: tray.width / 3,
      cell: Math.max(8, Math.min(24, tray.height / 5.2, tray.width / 15))
    };
  }

  boardPointer(clientX, clientY) {
    if (!this.boardLayout) return null;
    const rect = this.boardCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor((x - this.boardLayout.ox) / this.boardLayout.cell);
    const row = Math.floor((y - this.boardLayout.oy) / this.boardLayout.cell);
    if (col < 0 || row < 0 || col >= BOARD_SIZE || row >= BOARD_SIZE) return null;
    return { x: col, y: row };
  }

  trayPointer(clientX, clientY) {
    if (!this.trayLayout) return null;
    const rect = this.trayCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return Math.min(2, Math.floor(x / this.trayLayout.slot));
  }

  burst(cells, color) {
    if (this.settings.reducedMotion || !this.boardLayout) return;
    for (const index of cells) {
      const x = index % BOARD_SIZE;
      const y = Math.floor(index / BOARD_SIZE);
      const rect = this.cellRect(x, y);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        this.particles.push({
          x: rect.x + rect.w / 2,
          y: rect.y + rect.h / 2,
          vx: Math.cos(angle) * (30 + Math.random() * 45),
          vy: Math.sin(angle) * (30 + Math.random() * 45),
          life: 0.5,
          color
        });
      }
    }
  }

  cellRect(x, y) {
    const l = this.boardLayout;
    return { x: l.ox + x * l.cell, y: l.oy + y * l.cell, w: l.cell, h: l.cell };
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(state, ghost, time, dt) {
    this.resize();
    if (!this.boardLayout || !this.trayLayout) return;
    this.updateParticles(dt || 0);
    this.drawBoard(state, ghost, time);
    this.drawTray(state, ghost, time);
    this.drawParticles();
  }

  drawBoard(state, ghost, time) {
    const ctx = this.boardCtx;
    const l = this.boardLayout;
    ctx.clearRect(0, 0, l.width, l.height);
    const gradient = ctx.createLinearGradient(0, 0, l.width, l.height);
    gradient.addColorStop(0, "#182238");
    gradient.addColorStop(0.55, "#111a2b");
    gradient.addColorStop(1, "#0d1322");
    ctx.fillStyle = gradient;
    rounded(ctx, l.ox - 7, l.oy - 7, l.cell * BOARD_SIZE + 14, l.cell * BOARD_SIZE + 14, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const index = y * BOARD_SIZE + x;
        const rect = this.cellRect(x, y);
        ctx.fillStyle = (x + y) % 2 ? "rgba(255,255,255,.022)" : "rgba(255,255,255,.01)";
        ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
        if (state.blocked[index]) {
          ctx.fillStyle = "rgba(244,167,181,.1)";
          ctx.fillRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
          ctx.strokeStyle = "rgba(244,167,181,.4)";
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
          ctx.setLineDash([]);
        }
        const cell = state.board[index];
        if (cell) this.drawBlock(ctx, rect, cell.color, false, time);
      }
    }

    if (ghost && ghost.valid) {
      const piece = state.tray[ghost.index];
      if (piece) {
        const rotated = Object.assign({}, piece, { rotation: ghost.rotation });
        for (const [dx, dy] of cellsFor(rotated)) {
          const rect = this.cellRect(ghost.x + dx, ghost.y + dy);
          if (rect.x < l.ox || rect.y < l.oy || rect.x + rect.w > l.ox + l.cell * BOARD_SIZE || rect.y + rect.h > l.oy + l.cell * BOARD_SIZE) continue;
          ctx.globalAlpha = 0.55;
          this.drawBlock(ctx, rect, piece.color, true, time);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  drawBlock(ctx, rect, colorIndex, ghost, time) {
    const color = COLORS[colorIndex];
    const inset = Math.max(2, rect.w * 0.07);
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    gradient.addColorStop(0, color.hex);
    gradient.addColorStop(1, shade(color.hex, -24));
    ctx.fillStyle = gradient;
    rounded(ctx, rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2, rect.w * 0.2);
    ctx.fill();
    ctx.strokeStyle = ghost ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.36)";
    ctx.lineWidth = ghost ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(8,12,22,.72)";
    ctx.font = `800 ${Math.max(9, rect.w * 0.26)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(color.symbol, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }

  drawTray(state, ghost, time) {
    const ctx = this.trayCtx;
    const l = this.trayLayout;
    ctx.clearRect(0, 0, l.width, l.height);
    for (let index = 0; index < 3; index++) {
      const x = index * l.slot;
      ctx.fillStyle = state.selected === index ? "rgba(168,230,207,.08)" : "rgba(255,255,255,.02)";
      rounded(ctx, x + 5, 4, l.slot - 10, l.height - 8, 15);
      ctx.fill();
      ctx.strokeStyle = state.selected === index ? "rgba(168,230,207,.7)" : "rgba(148,163,184,.15)";
      ctx.lineWidth = state.selected === index ? 2 : 1;
      ctx.stroke();
      const piece = state.tray[index];
      if (!piece) continue;
      ctx.globalAlpha = ghost && ghost.index === index ? 0.35 : 1;
      this.drawTrayPiece(ctx, piece, x + l.slot / 2, l.height / 2, l.cell, time);
      ctx.globalAlpha = 1;
    }
  }

  drawTrayPiece(ctx, piece, cx, cy, cell, time) {
    const cells = cellsFor(piece);
    const size = pieceSize(piece);
    const startX = cx - size.width * cell / 2;
    const startY = cy - size.height * cell / 2;
    for (const [x, y] of cells) {
      this.drawBlock(ctx, { x: startX + x * cell, y: startY + y * cell, w: cell, h: cell }, piece.color, false, time);
    }
  }

  drawParticles() {
    const ctx = this.boardCtx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
