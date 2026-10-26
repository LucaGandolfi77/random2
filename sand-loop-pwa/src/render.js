/*
 * Sand Loop — canvas rendering
 * ----------------------------
 * Two surfaces:
 *   artCanvas   the photo, the sand layer and the reveal
 *   playCanvas  hopper, falling grains, the loop and the spill tray
 *
 * The renderer owns no rules. It reads an engine snapshot, paints it, and
 * turns engine events into short visual flourishes.
 */

import { LOOP, TAU } from "./engine.js";
import { mulberry32 } from "./quantize.js";

const ART_W = 600;
const ART_H = 800;
const PLAY_W = 360;
const PLAY_H = 300;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const PATTERNS = ["solid", "stripe", "dots", "cross", "chevron", "ring"];

function alpha(hex, a) {
  const h = (hex || "#888888").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function shade(hex, amount) {
  const h = (hex || "#888888").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const mix = (v) => Math.round(v + (f - v) * t);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function patternMode(color) {
  return PATTERNS[color % PATTERNS.length];
}

function drawPattern(ctx, color, x, y, w, h) {
  const mode = patternMode(color);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = "rgba(20,14,10,0.38)";
  ctx.fillStyle = "rgba(255,250,240,0.52)";
  ctx.lineWidth = 2;
  if (mode === "stripe") {
    for (let i = -h; i < w + h; i += 8) {
      ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke();
    }
  } else if (mode === "dots") {
    for (let yy = 4; yy < h; yy += 8) {
      for (let xx = 4; xx < w; xx += 8) {
        ctx.beginPath(); ctx.arc(x + xx, y + yy, 1.7, 0, TAU); ctx.fill();
      }
    }
  } else if (mode === "cross") {
    for (let i = -h; i < w + h; i += 11) {
      ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + i + h, y); ctx.lineTo(x + i, y + h); ctx.stroke();
    }
  } else if (mode === "chevron") {
    for (let yy = -8; yy < h + 8; yy += 9) {
      ctx.beginPath();
      ctx.moveTo(x, y + yy);
      for (let xx = 0; xx <= w + 9; xx += 9) {
        ctx.lineTo(x + xx, y + yy + (xx % 18 === 0 ? -3 : 3));
      }
      ctx.stroke();
    }
  } else if (mode === "ring") {
    for (let yy = 6; yy < h; yy += 10) {
      for (let xx = 6; xx < w; xx += 10) {
        ctx.beginPath(); ctx.arc(x + xx, y + yy, 3, 0, TAU); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export class Renderer {
  constructor(artCanvas, playCanvas) {
    this.artCanvas = artCanvas;
    this.playCanvas = playCanvas;
    this.artCtx = artCanvas.getContext("2d");
    this.playCtx = playCanvas.getContext("2d");
    this.sandCanvas = document.createElement("canvas");
    this.sandCanvas.width = ART_W;
    this.sandCanvas.height = ART_H;
    this.sandCtx = this.sandCanvas.getContext("2d");
    this.sandCtx.imageSmoothingEnabled = false;
    this.shiftCanvas = document.createElement("canvas");
    this.shiftCtx = this.shiftCanvas.getContext("2d");
    this.photo = null;
    this.grid = null;
    this.effects = [];
    this.artFlashes = [];
    this.time = 0;
    this.shake = 0;
    this.lastCss = { w: 0, h: 0, dpr: 0 };
    this.view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
  }

  setBoard(photo, grid) {
    this.photo = photo;
    this.grid = grid;
    this.shiftCanvas.width = Math.max(1, Math.ceil(ART_W / grid.width));
    this.shiftCanvas.height = ART_H;
    this.buildSand();
    this.effects.length = 0;
    this.artFlashes.length = 0;
    this.time = 0;
    this.shake = 0;
  }

  buildSand() {
    const g = this.grid;
    const ctx = this.sandCtx;
    const cw = ART_W / g.width;
    const chh = ART_H / g.height;
    ctx.clearRect(0, 0, ART_W, ART_H);
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const index = y * g.width + x;
        const color = g.palette[g.indices[index]];
        const px = x * cw;
        const py = y * chh;
        ctx.fillStyle = color.hex;
        ctx.fillRect(px, py, cw + 0.4, chh + 0.4);

        const rng = mulberry32((g.hash ^ (index * 2654435761)) >>> 0);
        for (let n = 0; n < 3; n++) {
          const dx = rng() * cw;
          const dy = rng() * chh;
          const r = 0.5 + rng() * 1.4;
          ctx.fillStyle = rng() > 0.5 ? shade(color.hex, 0.32) : shade(color.hex, -0.35);
          ctx.globalAlpha = 0.24 + rng() * 0.2;
          ctx.beginPath(); ctx.arc(px + dx, py + dy, r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (x % 3 === 0 || y % 3 === 0) {
          ctx.fillStyle = "rgba(30,20,14,0.05)";
          ctx.fillRect(px, py + chh - 0.7, cw, 0.7);
        }
      }
    }

    /* A dusting of larger grains, so it reads as sand rather than a poster. */
    const rng = mulberry32((g.hash ^ 0xabcdef) >>> 0);
    for (let i = 0; i < 900; i++) {
      const x = rng() * ART_W;
      const y = rng() * ART_H;
      ctx.fillStyle = rng() > 0.5 ? "rgba(255,248,226,0.20)" : "rgba(24,15,10,0.16)";
      ctx.beginPath(); ctx.arc(x, y, 0.4 + rng() * 1.1, 0, TAU); ctx.fill();
    }
  }

  /* Take one cell out near the bottom and let the column above it fall by
   * one cell. The top cell becomes empty, which reveals the sharp photo. */
  collapseCell(cell) {
    if (!this.grid || !cell) return;
    const g = this.grid;
    const cw = ART_W / g.width;
    const chh = ART_H / g.height;
    if (cell.x < 0 || cell.x >= g.width || cell.row < 0 || cell.row >= g.height) return;

    const sx = cell.x * cw;
    const sy = cell.row * chh;
    const above = cell.row * chh;
    const ctx = this.sandCtx;

    if (above > 0) {
      this.shiftCtx.clearRect(0, 0, this.shiftCanvas.width, Math.ceil(above));
      this.shiftCtx.drawImage(this.sandCanvas, sx, 0, cw, above, 0, 0, cw, above);
      ctx.clearRect(sx, 0, cw, chh);
      ctx.drawImage(this.shiftCanvas, 0, 0, cw, above, sx, chh, cw, above);
    } else {
      ctx.clearRect(sx, sy, cw, chh);
    }

    if (this.artFlashes.length > 220) this.artFlashes.splice(0, this.artFlashes.length - 220);
    this.artFlashes.push({
      x: sx + cw / 2,
      y: sy + chh / 2,
      life: 1,
      color: g.palette[cell.color].hex
    });
  }

  clearAll() {
    this.sandCtx.clearRect(0, 0, ART_W, ART_H);
  }

  addEvent(evt) {
    if (!this.grid) return;
    if (this.effects.length > 520) this.effects.splice(0, this.effects.length - 520);
    const color = this.grid.palette[evt.color] ? this.grid.palette[evt.color].hex : "#e8c98a";
    if (evt.type === "capture") {
      this.effects.push({
        kind: "spark", x: LOOP.hopperX + (evt.x - LOOP.hopperX) * 0.2,
        y: LOOP.topY - 6, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 80,
        life: 1, color, size: 2 + Math.random() * 3
      });
    } else if (evt.type === "spill") {
      this.shake = Math.min(12, this.shake + 1.4);
      for (let i = 0; i < 5; i++) {
        this.effects.push({
          kind: "sand", x: evt.x || LOOP.hopperX, y: LOOP.topY + 2,
          vx: (Math.random() - 0.5) * 150, vy: 30 + Math.random() * 110,
          life: 1, color, size: 2 + Math.random() * 3
        });
      }
    } else if (evt.type === "bucketFull") {
      for (let i = 0; i < 18; i++) {
        this.effects.push({
          kind: "spark",
          x: LOOP.cx + (Math.random() - 0.5) * 46,
          y: LOOP.topY - 18,
          vx: (Math.random() - 0.5) * 220,
          vy: -80 - Math.random() * 170,
          life: 1, color, size: 2 + Math.random() * 3
        });
      }
    } else if (evt.type === "deploy") {
      this.effects.push({
        kind: "ring", x: LOOP.cx, y: LOOP.topY, life: 1,
        color, size: 10
      });
    } else if (evt.type === "win") {
      for (let i = 0; i < 90; i++) {
        this.effects.push({
          kind: "spark",
          x: Math.random() * PLAY_W,
          y: -10 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 80,
          vy: 40 + Math.random() * 130,
          life: 1,
          color: this.grid.palette[i % this.grid.palette.length].hex,
          size: 2 + Math.random() * 4
        });
      }
    }
  }

  resizePlay() {
    const rect = this.playCanvas.getBoundingClientRect();
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.round(rect.width));
    const ch = Math.max(1, Math.round(rect.height));
    if (this.lastCss.w === cw && this.lastCss.h === ch && this.lastCss.dpr === dpr) return;
    this.lastCss = { w: cw, h: ch, dpr };
    this.playCanvas.width = Math.round(cw * dpr);
    this.playCanvas.height = Math.round(ch * dpr);
    const scale = Math.min(cw / PLAY_W, ch / PLAY_H);
    this.view = {
      dpr,
      scale,
      ox: (cw - PLAY_W * scale) / 2,
      oy: (ch - PLAY_H * scale) / 2,
      cssW: cw,
      cssH: ch
    };
  }

  slotPosition(index, loopAngle, gap) {
    const angle = loopAngle + index * gap;
    return {
      x: LOOP.cx + Math.sin(angle) * LOOP.rx,
      y: LOOP.cy - Math.cos(angle) * LOOP.ry,
      angle
    };
  }

  hitSlot(clientX, clientY) {
    const rect = this.playCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const v = this.view;
    const lx = (x - v.ox) / v.scale;
    const ly = (y - v.oy) / v.scale;
    let best = -1, bestD = 34;
    const slots = this.lastState ? this.lastState.slots : 5;
    for (let i = 0; i < slots; i++) {
      const p = this.slotPosition(i, this.lastState ? this.lastState.loopAngle : 0, this.lastState ? this.lastState.gap : TAU / 5);
      const d = Math.hypot(p.x - lx, p.y - ly);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  paintArt(dt, now) {
    const ctx = this.artCtx;
    ctx.clearRect(0, 0, ART_W, ART_H);
    if (!this.photo) return;
    ctx.drawImage(this.photo, 0, 0, ART_W, ART_H);
    ctx.drawImage(this.sandCanvas, 0, 0);

    for (let i = this.artFlashes.length - 1; i >= 0; i--) {
      const f = this.artFlashes[i];
      f.life -= dt * 2.2;
      if (f.life <= 0) { this.artFlashes.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = f.life * 0.85;
      ctx.fillStyle = "#fff4d7";
      ctx.beginPath(); ctx.arc(f.x, f.y, 1 + f.life * 5, 0, TAU); ctx.fill();
      ctx.restore();
    }

    /* A soft inner shadow, drawn in canvas so the frame reads as glass. */
    const vign = ctx.createLinearGradient(0, 0, 0, ART_H);
    vign.addColorStop(0, "rgba(30,18,12,0.16)");
    vign.addColorStop(0.18, "rgba(30,18,12,0)");
    vign.addColorStop(0.84, "rgba(30,18,12,0)");
    vign.addColorStop(1, "rgba(30,18,12,0.24)");
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, ART_W, ART_H);
    ctx.strokeStyle = "rgba(255,240,208,0.18)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, ART_W - 3, ART_H - 3);

    this.artFlashes.forEach((f) => {
      if (f.life < 0.7) return;
      ctx.fillStyle = alpha(f.color, (f.life - 0.7) * 0.5);
      ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, TAU); ctx.fill();
    });
  }

  paintPlay(state, dt, now) {
    this.lastState = state;
    this.resizePlay();
    const ctx = this.playCtx;
    const v = this.view;
    const w = this.lastCss.w;
    const h = this.lastCss.h;

    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#1a130d");
    bg.addColorStop(1, "#0e0a07");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.translate(v.ox + sx, v.oy + sy);
    ctx.scale(v.scale, v.scale);
    this.shake = Math.max(0, this.shake - dt * 32);

    if (!state || !this.grid) {
      ctx.restore();
      return;
    }

    const palette = this.grid.palette;
    const current = state.currentColor >= 0 ? palette[state.currentColor] : null;
    const matching = state.buckets.some((b) => b && b.color === state.currentColor);

    /* ---- hopper ---- */
    const hx = LOOP.hopperX;
    const hy = LOOP.hopperY;
    ctx.fillStyle = "#2a2018";
    roundRect(ctx, hx - 32, 4, 64, 26, 7); ctx.fill();
    ctx.strokeStyle = "rgba(236,206,150,0.35)";
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#17110c";
    roundRect(ctx, hx - 22, 28, 44, 11, 5); ctx.fill();
    const glow = ctx.createRadialGradient(hx, hy - 2, 2, hx, hy - 2, 46);
    glow.addColorStop(0, current ? alpha(current.hex, 0.55) : "rgba(255,210,140,0.25)");
    glow.addColorStop(1, "rgba(255,200,130,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(hx, hy - 2, 46, 0, TAU); ctx.fill();
    if (current) {
      ctx.fillStyle = current.hex;
      ctx.beginPath(); ctx.arc(hx, hy - 2, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,248,228,0.55)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(hx, hy - 2, 10, 0, TAU); ctx.stroke();
      drawPattern(ctx, state.currentColor, hx - 8, hy - 10, 16, 16);
      ctx.fillStyle = "#fff6de";
      ctx.font = "700 8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(24,16,10,0.8)";
      ctx.fillText(String(state.currentColor + 1), hx, hy - 1);
    }

    /* next colours */
    for (let i = 0; i < state.upcoming.length && i < 2; i++) {
      const c = palette[state.upcoming[i]];
      if (!c) continue;
      const x = hx + 48 + i * 18;
      ctx.fillStyle = c.hex;
      ctx.beginPath(); ctx.arc(x, 18, 5.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,247,225,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, 18, 5.5, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = "rgba(248,232,202,0.38)";
    ctx.font = "600 7px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", hx + 40, 33);

    /* ---- loop ---- */
    ctx.save();
    ctx.strokeStyle = "#3a2b20";
    ctx.lineWidth = 17;
    ctx.beginPath(); ctx.ellipse(LOOP.cx, LOOP.cy, LOOP.rx, LOOP.ry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#5d4633";
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.ellipse(LOOP.cx, LOOP.cy, LOOP.rx, LOOP.ry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(233,198,137,0.32)";
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 13]);
    ctx.lineDashOffset = -now * 0.045;
    ctx.beginPath(); ctx.ellipse(LOOP.cx, LOOP.cy, LOOP.rx, LOOP.ry, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    /* ---- buckets ---- */
    const order = [];
    for (let i = 0; i < state.slots; i++) order.push(i);
    order.sort((a, b) => {
      if (a === state.selected) return 1;
      if (b === state.selected) return -1;
      return 0;
    });

    for (const i of order) {
      const p = this.slotPosition(i, state.loopAngle, state.gap);
      const bucket = state.buckets[i];
      const isSel = state.selected === i;
      if (!bucket) {
        ctx.save();
        ctx.strokeStyle = "rgba(230,206,170,0.22)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 22, 10, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        continue;
      }
      const color = palette[bucket.color];
      const scale = isSel ? 1.16 : 1;
      const bw = 58 * scale;
      const bh = 46 * scale;
      ctx.save();
      ctx.translate(p.x, p.y - 4);
      if (isSel) {
        ctx.shadowColor = alpha(color.hex, 0.8);
        ctx.shadowBlur = 18;
      }
      /* cup */
      const grd = ctx.createLinearGradient(0, -bh, 0, bh * 0.4);
      grd.addColorStop(0, "#d9c7a8");
      grd.addColorStop(1, "#8a7154");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh * 0.62);
      ctx.lineTo(bw / 2, -bh * 0.62);
      ctx.lineTo(bw * 0.34, bh * 0.45);
      ctx.lineTo(-bw * 0.34, bh * 0.45);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;

      /* sand inside */
      const fill = clamp(bucket.fill / bucket.capacity, 0, 1);
      if (fill > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 3, -bh * 0.55);
        ctx.lineTo(bw / 2 - 3, -bh * 0.55);
        ctx.lineTo(bw * 0.31, bh * 0.36);
        ctx.lineTo(-bw * 0.31, bh * 0.36);
        ctx.closePath(); ctx.clip();
        const level = bh * 0.36 - fill * bh * 0.86;
        ctx.fillStyle = color.hex;
        ctx.fillRect(-bw / 2, level, bw, bh);
        ctx.fillStyle = "rgba(255,248,225,0.28)";
        ctx.beginPath();
        ctx.ellipse(0, level, bw * 0.32, 2.5, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }

      /* rim + colour band */
      ctx.strokeStyle = "#efe0c3";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh * 0.62);
      ctx.lineTo(bw / 2, -bh * 0.62);
      ctx.stroke();
      ctx.fillStyle = color.hex;
      roundRect(ctx, -bw / 2 + 1, -bh * 0.55, bw - 2, bh * 0.26, 3); ctx.fill();
      drawPattern(ctx, bucket.color, -bw / 2 + 1, -bh * 0.55, bw - 2, bh * 0.26);

      /* number badge */
      ctx.fillStyle = "rgba(22,15,10,0.78)";
      ctx.beginPath(); ctx.arc(0, -bh * 0.42, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff4d8";
      ctx.font = "800 9px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(bucket.color + 1), 0, -bh * 0.42);

      /* lid */
      ctx.strokeStyle = isSel ? "#ffe4a3" : "rgba(232,214,184,0.55)";
      ctx.lineWidth = isSel ? 3 : 2;
      if (isSel) {
        ctx.beginPath();
        ctx.arc(0, -bh * 0.6, bw * 0.42, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-bw * 0.38, -bh * 0.6);
        ctx.lineTo(bw * 0.38, -bh * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- grains ---- */
    for (const grain of state.grains) {
      const color = palette[grain.color];
      if (!color) continue;
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(grain.x, grain.y, grain.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,250,235,0.45)";
      ctx.beginPath();
      ctx.arc(grain.x - grain.r * 0.25, grain.y - grain.r * 0.3, grain.r * 0.35, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = alpha(color.hex, 0.18);
      ctx.lineWidth = grain.r * 0.8;
      ctx.beginPath();
      ctx.moveTo(grain.x, grain.y - grain.r);
      ctx.lineTo(grain.x - grain.vx * 0.012, grain.y - grain.vy * 0.012);
      ctx.stroke();
    }

    /* ---- spill tray ---- */
    const trayX = 78, trayY = 259, trayW = 204, trayH = 30;
    ctx.save();
    ctx.fillStyle = "rgba(26,18,13,0.8)";
    roundRect(ctx, trayX, trayY, trayW, trayH, 10); ctx.fill();
    ctx.strokeStyle = "rgba(238,213,175,0.22)";
    ctx.lineWidth = 1.4; ctx.stroke();
    const spillRatio = clamp(state.spilled / Math.max(1, state.spillLimit), 0, 1);
    if (spillRatio > 0) {
      const pile = 4 + spillRatio * (trayH - 8);
      const spillColors = this.grid.palette;
      ctx.save();
      roundRect(ctx, trayX + 2, trayY + 2, trayW - 4, trayH - 4, 8); ctx.clip();
      ctx.fillStyle = spillColors[0] ? spillColors[0].hex : "#b58a5b";
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.moveTo(trayX + 4, trayY + trayH - 3);
      for (let x = 0; x <= trayW - 8; x += 8) {
        ctx.lineTo(trayX + 4 + x, trayY + trayH - pile + Math.sin(x * 0.2 + now * 0.002) * 2);
      }
      ctx.lineTo(trayX + trayW - 4, trayY + trayH - 3);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = spillRatio > 0.75 ? "#ffb08f" : "rgba(244,231,209,0.55)";
    ctx.font = "700 8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("SPILL TRAY", trayX + 8, trayY + 10);
    ctx.textAlign = "right";
    ctx.fillText(state.spilled + " / " + state.spillLimit, trayX + trayW - 8, trayY + 10);
    if (spillRatio > 0.75) {
      ctx.strokeStyle = `rgba(255,120,90,${0.35 + Math.sin(now * 0.008) * 0.25})`;
      ctx.lineWidth = 2;
      roundRect(ctx, trayX - 1, trayY - 1, trayW + 2, trayH + 2, 11); ctx.stroke();
    }
    ctx.restore();

    /* ---- warning / hold label ---- */
    if (!matching && state.status === "playing" && state.graceLeft <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(now * 0.01) * 0.25;
      ctx.strokeStyle = "#ff9b78";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, hy - 2, 20, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#ffb896";
      ctx.font = "700 8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOAD THIS COLOUR", hx, 68);
      ctx.restore();
    } else if (state.holding) {
      ctx.fillStyle = "rgba(255,236,193,0.8)";
      ctx.font = "600 8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ALIGNING…", hx, 68);
    }

    /* ---- effects ---- */
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt * (e.kind === "ring" ? 2.4 : 1.35);
      if (e.life <= 0) { this.effects.splice(i, 1); continue; }
      if (e.kind === "ring") {
        ctx.strokeStyle = alpha(e.color, e.life * 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 + (1 - e.life) * 50, 0, TAU); ctx.stroke();
        continue;
      }
      e.vy += 220 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      ctx.fillStyle = alpha(e.color, e.life);
      if (e.kind === "spark") {
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, TAU); ctx.fill();
      } else {
        ctx.fillRect(e.x, e.y, e.size * e.life, e.size * e.life);
      }
    }

    ctx.restore();
  }

  paint(state, dt, now) {
    this.paintArt(dt, now);
    this.paintPlay(state, dt, now);
  }
}

export { ART_W, ART_H, PLAY_W, PLAY_H, patternMode, alpha };
