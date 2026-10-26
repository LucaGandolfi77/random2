/*
 * Pixel Ants — one canvas, one colony
 * -----------------------------------
 * The scene canvas holds the photo mosaic, the dark margins the ants use as
 * roads, and the bucket shelf. The renderer never decides a rule; it reads the
 * engine snapshot and the board, paints them, and turns events into small
 * visual flourishes.
 */

import { mulberry32 } from "./quantize.js";

export const SCENE_W = 660;
export const SCENE_H = 960;
export const PHOTO_X = 30;
export const PHOTO_Y = 54;
export const PHOTO_W = 600;
export const PHOTO_H = 810;
export const SHELF_Y = 884;
export const TAU = Math.PI * 2;

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
  ctx.strokeStyle = "rgba(8,12,9,0.34)";
  ctx.fillStyle = "rgba(255,252,226,0.58)";
  ctx.lineWidth = 1.5;
  if (mode === "stripe") {
    for (let i = -h; i < w + h; i += 7) {
      ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke();
    }
  } else if (mode === "dots") {
    for (let yy = 3; yy < h; yy += 7) {
      for (let xx = 3; xx < w; xx += 7) {
        ctx.beginPath(); ctx.arc(x + xx, y + yy, 1.4, 0, TAU); ctx.fill();
      }
    }
  } else if (mode === "cross") {
    for (let i = -h; i < w + h; i += 9) {
      ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + i + h, y); ctx.lineTo(x + i, y + h); ctx.stroke();
    }
  } else if (mode === "chevron") {
    for (let yy = -7; yy < h + 7; yy += 8) {
      ctx.beginPath(); ctx.moveTo(x, y + yy);
      for (let xx = 0; xx <= w + 8; xx += 8) {
        ctx.lineTo(x + xx, y + yy + (xx % 16 === 0 ? -2.5 : 2.5));
      }
      ctx.stroke();
    }
  } else if (mode === "ring") {
    for (let yy = 5; yy < h; yy += 9) {
      for (let xx = 5; xx < w; xx += 9) {
        ctx.beginPath(); ctx.arc(x + xx, y + yy, 2.6, 0, TAU); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.photoCanvas = document.createElement("canvas");
    this.photoCanvas.width = PHOTO_W;
    this.photoCanvas.height = PHOTO_H;
    this.photoCtx = this.photoCanvas.getContext("2d");
    this.photoCtx.imageSmoothingEnabled = false;
    this.grid = null;
    this.board = null;
    this.cellW = PHOTO_W / 40;
    this.cellH = PHOTO_H / 54;
    this.effects = [];
    this.flashes = [];
    this.time = 0;
    this.shake = 0;
    this.lastCss = { w: 0, h: 0, dpr: 0 };
    this.view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
    this.lastState = null;
  }

  setBoard(grid, board) {
    this.grid = grid;
    this.board = board;
    this.cellW = PHOTO_W / grid.width;
    this.cellH = PHOTO_H / grid.height;
    this.buildMosaic();
    this.effects.length = 0;
    this.flashes.length = 0;
    this.time = 0;
    this.shake = 0;
  }

  buildMosaic() {
    const g = this.grid;
    const ctx = this.photoCtx;
    const cw = this.cellW;
    const ch = this.cellH;
    ctx.clearRect(0, 0, PHOTO_W, PHOTO_H);
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const index = y * g.width + x;
        const color = g.palette[g.indices[index]];
        const px = x * cw;
        const py = y * ch;
        ctx.fillStyle = color.hex;
        ctx.fillRect(px, py, cw + 0.35, ch + 0.35);

        const rng = mulberry32((g.hash ^ (index * 2654435761)) >>> 0);
        for (let n = 0; n < 3; n++) {
          const dx = rng() * cw;
          const dy = rng() * ch;
          ctx.fillStyle = rng() > 0.5 ? shade(color.hex, 0.28) : shade(color.hex, -0.3);
          ctx.globalAlpha = 0.22 + rng() * 0.2;
          ctx.fillRect(px + dx, py + dy, 1.2, 1.2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(8,12,9,0.08)";
        ctx.fillRect(px + cw - 0.7, py, 0.7, ch);
        ctx.fillRect(px, py + ch - 0.7, cw, 0.7);
      }
    }
  }

  stealCell(cell) {
    if (!cell) return;
    const cw = this.cellW;
    const ch = this.cellH;
    const px = cell.x * cw;
    const py = cell.y * ch;
    this.photoCtx.clearRect(px, py, cw, ch);
    if (this.flashes.length > 160) this.flashes.splice(0, this.flashes.length - 160);
    this.flashes.push({
      x: px + cw / 2,
      y: py + ch / 2,
      life: 1,
      color: this.grid.palette[cell.color].hex
    });
    for (let i = 0; i < 3; i++) {
      this.effects.push({
        kind: "crumb",
        x: px + Math.random() * cw,
        y: py + Math.random() * ch,
        vx: (Math.random() - 0.5) * 26,
        vy: -8 - Math.random() * 24,
        life: 1,
        color: this.grid.palette[cell.color].hex,
        size: 1.5 + Math.random() * 2
      });
    }
  }

  clearAll() {
    this.photoCtx.clearRect(0, 0, PHOTO_W, PHOTO_H);
  }

  addEvent(evt) {
    if (!this.grid) return;
    if (this.effects.length > 420) this.effects.splice(0, this.effects.length - 420);
    const color = this.grid.palette[evt.color] ? this.grid.palette[evt.color].hex : "#c9f27c";
    const slot = this.slotCenter(evt.slot, evt.slots || this.lastState?.slots || 4);
    if (evt.type === "deploy" || evt.type === "recall") {
      this.effects.push({ kind: "ring", x: slot.x, y: slot.y, life: 1, color, size: 10 });
    } else if (evt.type === "deliver") {
      this.effects.push({ kind: "ring", x: slot.x, y: slot.y - 8, life: 1, color, size: 6 });
      for (let i = 0; i < 4; i++) {
        this.effects.push({
          kind: "spark",
          x: slot.x + (Math.random() - 0.5) * 24,
          y: slot.y - 18,
          vx: (Math.random() - 0.5) * 70,
          vy: -45 - Math.random() * 80,
          life: 1, color, size: 1.5 + Math.random() * 2
        });
      }
    } else if (evt.type === "bucketFull") {
      this.shake = Math.min(7, this.shake + 1.1);
      for (let i = 0; i < 22; i++) {
        this.effects.push({
          kind: "spark",
          x: slot.x + (Math.random() - 0.5) * 42,
          y: slot.y - 20,
          vx: (Math.random() - 0.5) * 190,
          vy: -90 - Math.random() * 160,
          life: 1, color, size: 2 + Math.random() * 3
        });
      }
    } else if (evt.type === "win") {
      for (let i = 0; i < 110; i++) {
        this.effects.push({
          kind: "spark",
          x: PHOTO_X + Math.random() * PHOTO_W,
          y: -20 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 80,
          vy: 55 + Math.random() * 130,
          life: 1,
          color: this.grid.palette[i % this.grid.palette.length].hex,
          size: 2 + Math.random() * 4
        });
      }
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.round(rect.width));
    const ch = Math.max(1, Math.round(rect.height));
    if (this.lastCss.w === cw && this.lastCss.h === ch && this.lastCss.dpr === dpr) return;
    this.lastCss = { w: cw, h: ch, dpr };
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    const scale = Math.min(cw / SCENE_W, ch / SCENE_H);
    this.view = {
      dpr,
      scale,
      ox: (cw - SCENE_W * scale) / 2,
      oy: (ch - SCENE_H * scale) / 2,
      cssW: cw,
      cssH: ch
    };
  }

  slotCenter(slot, slots) {
    return {
      x: PHOTO_X + ((slot + 0.5) / slots) * PHOTO_W,
      y: SHELF_Y + 48
    };
  }

  mapPoint(x, y) {
    return {
      x: PHOTO_X + (x + 0.5) * this.cellW,
      y: PHOTO_Y + (y + 0.5) * this.cellH
    };
  }

  hitSlot(clientX, clientY) {
    if (!this.lastState) return -1;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const v = this.view;
    const lx = (x - v.ox) / v.scale;
    const ly = (y - v.oy) / v.scale;
    let best = -1;
    let bestD = 62;
    for (let i = 0; i < this.lastState.slots; i++) {
      const p = this.slotCenter(i, this.lastState.slots);
      const d = Math.hypot(p.x - lx, p.y - ly);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  drawBackdrop(ctx, now) {
    const bg = ctx.createLinearGradient(0, 0, 0, SCENE_H);
    bg.addColorStop(0, "#11160f");
    bg.addColorStop(0.55, "#151c14");
    bg.addColorStop(1, "#0a0d09");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "rgba(201,242,124,0.09)";
    ctx.lineWidth = 1;
    for (let x = 0; x < SCENE_W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SCENE_H); ctx.stroke();
    }
    for (let y = 0; y < SCENE_H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SCENE_W, y); ctx.stroke();
    }
    ctx.restore();

    const glow = ctx.createRadialGradient(SCENE_W * 0.5, 80, 20, SCENE_W * 0.5, 80, 430);
    glow.addColorStop(0, "rgba(201,242,124,0.1)");
    glow.addColorStop(1, "rgba(201,242,124,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SCENE_W, 520);

    ctx.fillStyle = "rgba(242,240,220,0.18)";
    ctx.font = "800 9px ui-monospace,SFMono-Regular,Menlo,monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("COLONY EXIT", PHOTO_X + 2, 28);
    ctx.textAlign = "right";
    ctx.fillText(String(this.board ? this.board.captured : 0).padStart(4, "0") + " / " +
      String(this.board ? this.board.total : 0).padStart(4, "0"), PHOTO_X + PHOTO_W - 2, 28);
    ctx.fillStyle = "rgba(201,242,124,0.5)";
    ctx.fillRect(PHOTO_X, 39, PHOTO_W, 1);
    void now;
  }

  drawSubstrate(ctx) {
    ctx.save();
    roundRect(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 5);
    ctx.clip();
    ctx.fillStyle = "#0d130e";
    ctx.fillRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
    ctx.strokeStyle = "rgba(201,242,124,0.075)";
    ctx.lineWidth = 1;
    const cols = this.grid ? this.grid.width : 40;
    const rows = this.grid ? this.grid.height : 54;
    const cw = PHOTO_W / cols;
    const ch = PHOTO_H / rows;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(PHOTO_X + x * cw, PHOTO_Y);
      ctx.lineTo(PHOTO_X + x * cw, PHOTO_Y + PHOTO_H);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(PHOTO_X, PHOTO_Y + y * ch);
      ctx.lineTo(PHOTO_X + PHOTO_W, PHOTO_Y + y * ch);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(242,240,220,0.04)";
    for (let y = PHOTO_Y; y < PHOTO_Y + PHOTO_H; y += 30) {
      for (let x = PHOTO_X; x < PHOTO_X + PHOTO_W; x += 30) {
        if (((x / 30) + (y / 30)) % 2 === 0) ctx.fillRect(x, y, 30, 30);
      }
    }
    ctx.restore();
  }

  drawPhotoFrame(ctx) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#1b241b";
    roundRect(ctx, PHOTO_X - 8, PHOTO_Y - 8, PHOTO_W + 16, PHOTO_H + 16, 10);
    ctx.fill();
    ctx.restore();

    this.drawSubstrate(ctx);
    ctx.drawImage(this.photoCanvas, PHOTO_X, PHOTO_Y);

    ctx.save();
    roundRect(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 5);
    ctx.clip();
    const vign = ctx.createLinearGradient(0, PHOTO_Y, 0, PHOTO_Y + PHOTO_H);
    vign.addColorStop(0, "rgba(6,10,6,0.22)");
    vign.addColorStop(0.16, "rgba(6,10,6,0)");
    vign.addColorStop(0.82, "rgba(6,10,6,0)");
    vign.addColorStop(1, "rgba(6,10,6,0.3)");
    ctx.fillStyle = vign;
    ctx.fillRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
    ctx.restore();

    ctx.strokeStyle = "rgba(201,242,124,0.24)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, PHOTO_X - 0.5, PHOTO_Y - 0.5, PHOTO_W + 1, PHOTO_H + 1, 5);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const cx = PHOTO_X + (i % 2 ? PHOTO_W - 1 : 0);
      const cy = PHOTO_Y + (i > 1 ? PHOTO_H - 1 : 0);
      ctx.fillStyle = "rgba(201,242,124,0.55)";
      ctx.fillRect(cx - 1, cy - 1, 3, 3);
    }
  }

  drawAnt(ctx, ant) {
    const p = this.mapPoint(ant.x, ant.y);
    const color = this.grid.palette[ant.color] ? this.grid.palette[ant.color].hex : "#c9f27c";
    const w = (ant.carry ? 5 : 4) * Math.max(0.7, Math.min(1.3, this.cellW / 15));
    ctx.save();
    ctx.translate(p.x, p.y);
    if (ant.carry) {
      ctx.fillStyle = "rgba(8,12,9,0.55)";
      ctx.fillRect(-w / 2 + 1, -w / 2 + 1, w, w);
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -w / 2, w, w);
      ctx.strokeStyle = "rgba(255,252,226,0.8)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-w / 2 + 0.4, -w / 2 + 0.4, w - 0.8, w - 0.8);
    } else {
      ctx.fillStyle = "rgba(6,9,6,0.55)";
      ctx.fillRect(-w / 2 + 1, -w / 2 + 1, w, w);
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -w / 2, 2, 2);
      ctx.fillStyle = "#11160f";
      ctx.fillRect(-1, -1, 3, 3);
      ctx.strokeStyle = "rgba(242,240,220,0.5)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-2, -2); ctx.lineTo(-3.5, -3.5);
      ctx.moveTo(2, -2); ctx.lineTo(3.5, -3.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBucket(ctx, bucket, slots, now) {
    const p = this.slotCenter(bucket.slot, slots);
    const color = this.grid.palette[bucket.color] ? this.grid.palette[bucket.color].hex : "#c9f27c";
    const bw = Math.min(92, PHOTO_W / slots - 12);
    const bh = 54;
    const closing = bucket.state === "closing";
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = closing ? 0.72 : 1;

    if (!closing) {
      const glow = ctx.createRadialGradient(0, -6, 3, 0, -6, bw * 0.72);
      glow.addColorStop(0, alpha(color, 0.22));
      glow.addColorStop(1, alpha(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, -6, bw * 0.72, 0, TAU); ctx.fill();
    }

    ctx.fillStyle = "rgba(7,10,7,0.55)";
    ctx.beginPath(); ctx.ellipse(0, bh * 0.42, bw * 0.46, 8, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = "#2b352b";
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -bh / 2);
    ctx.lineTo(bw / 2, -bh / 2);
    ctx.lineTo(bw * 0.4, bh * 0.38);
    ctx.lineTo(-bw * 0.4, bh * 0.38);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(242,240,220,0.24)";
    ctx.lineWidth = 1.2; ctx.stroke();

    const fill = clamp(bucket.fill / Math.max(1, bucket.capacity), 0, 1);
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-bw / 2 + 3, -bh / 2 + 2);
      ctx.lineTo(bw / 2 - 3, -bh / 2 + 2);
      ctx.lineTo(bw * 0.38, bh * 0.35);
      ctx.lineTo(-bw * 0.38, bh * 0.35);
      ctx.closePath(); ctx.clip();
      const level = bh * 0.35 - fill * (bh * 0.82);
      ctx.fillStyle = color;
      ctx.fillRect(-bw / 2, level, bw, bh);
      ctx.fillStyle = "rgba(255,252,226,0.25)";
      ctx.fillRect(-bw / 2, level, bw, 2);
      ctx.restore();
    }

    ctx.fillStyle = color;
    roundRect(ctx, -bw / 2 + 2, -bh / 2 + 2, bw - 4, 13, 3); ctx.fill();
    drawPattern(ctx, bucket.color, -bw / 2 + 2, -bh / 2 + 2, bw - 4, 13);

    ctx.fillStyle = "rgba(6,9,6,0.84)";
    ctx.beginPath(); ctx.arc(0, -bh / 2 + 8.5, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f4f3de";
    ctx.font = "800 8px ui-monospace,SFMono-Regular,Menlo,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(bucket.color + 1), 0, -bh / 2 + 8.5);

    ctx.fillStyle = "rgba(242,240,220,0.72)";
    ctx.font = "700 7px ui-monospace,SFMono-Regular,Menlo,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(bucket.fill) + "/" + String(bucket.capacity), 0, bh * 0.24);

    if (bucket.antsOut > 0) {
      ctx.fillStyle = color;
      for (let i = 0; i < Math.min(5, bucket.antsOut); i++) {
        ctx.beginPath();
        ctx.arc(-10 + i * 5, -bh / 2 - 8, 1.8, 0, TAU);
        ctx.fill();
      }
    }

    if (!closing) {
      ctx.strokeStyle = alpha(color, 0.5 + Math.sin(now * 0.004) * 0.15);
      ctx.lineWidth = 1.6;
      roundRect(ctx, -bw / 2 - 3, -bh / 2 - 3, bw + 6, bh * 0.82 + 6, 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawShelf(ctx, state, now) {
    ctx.save();
    ctx.fillStyle = "rgba(7,10,7,0.82)";
    roundRect(ctx, PHOTO_X - 8, SHELF_Y, PHOTO_W + 16, 64, 12); ctx.fill();
    ctx.strokeStyle = "rgba(242,240,220,0.13)";
    ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgba(201,242,124,0.7)";
    ctx.font = "800 8px ui-monospace,SFMono-Regular,Menlo,monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("BUCKET RAIL", PHOTO_X + 4, SHELF_Y + 11);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(242,240,220,0.4)";
    ctx.fillText("TAP A BUCKET TO RECALL", PHOTO_X + PHOTO_W - 4, SHELF_Y + 11);
    ctx.restore();

    for (let i = 0; i < state.slots; i++) {
      const bucket = state.buckets[i];
      if (!bucket) {
        const p = this.slotCenter(i, state.slots);
        ctx.save();
        ctx.strokeStyle = "rgba(242,240,220,0.16)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 5]);
        roundRect(ctx, p.x - 38, p.y - 25, 76, 48, 8);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      this.drawBucket(ctx, bucket, state.slots, now);
    }
  }

  paint(state, dt, now) {
    this.lastState = state;
    this.resize();
    const ctx = this.ctx;
    const v = this.view;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, this.lastCss.w, this.lastCss.h);

    ctx.save();
    this.shake = Math.max(0, this.shake - dt * 24);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.translate(v.ox + sx, v.oy + sy);
    ctx.scale(v.scale, v.scale);

    this.drawBackdrop(ctx, now);
    this.drawPhotoFrame(ctx);

    if (!state || !this.grid) {
      ctx.restore();
      return;
    }

    for (const evt of state.ants) this.drawAnt(ctx, evt);
    this.drawShelf(ctx, state, now);

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt * 2.6;
      if (f.life <= 0) { this.flashes.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = f.life * 0.75;
      ctx.strokeStyle = "#f4f3de";
      ctx.lineWidth = 1;
      ctx.strokeRect(PHOTO_X + f.x - this.cellW / 2 + 0.5, PHOTO_Y + f.y - this.cellH / 2 + 0.5, this.cellW - 1, this.cellH - 1);
      ctx.restore();
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt * (e.kind === "ring" ? 2.2 : 1.7);
      if (e.life <= 0) { this.effects.splice(i, 1); continue; }
      if (e.kind === "ring") {
        ctx.strokeStyle = alpha(e.color, e.life * 0.7);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size + (1 - e.life) * 42, 0, TAU); ctx.stroke();
        continue;
      }
      e.vy += 150 * dt;
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

  paintStill(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0d130e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width / PHOTO_W, canvas.height / PHOTO_H);
    ctx.fillStyle = "#0d130e";
    ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
    ctx.strokeStyle = "rgba(201,242,124,0.09)";
    ctx.lineWidth = 1;
    const cols = this.grid ? this.grid.width : 40;
    const rows = this.grid ? this.grid.height : 54;
    const cw = PHOTO_W / cols;
    const ch = PHOTO_H / rows;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, PHOTO_H); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(PHOTO_W, y * ch); ctx.stroke();
    }
    ctx.drawImage(this.photoCanvas, 0, 0);
    ctx.restore();
  }
}

export { patternMode, alpha, shade };
