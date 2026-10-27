import { AREAS, AREA_BY_ID } from '../data.js';
import { clamp } from '../core/utils.js';

/*
 * The minimap is drawn from the same room table as the world, never from a
 * screenshot. It is the strategic view: locked fog, power warnings, the eco
 * pulse, the current camera window, and a tap target per room.
 */
export class Minimap {
  constructor(canvas, { onFocus } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onFocus = onFocus;
    this.hits = [];
    this.dpr = 1;
    this.w = 190;
    this.h = 190;
    this.resize();
    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this.w;
      const y = ((e.clientY - r.top) / r.height) * this.h;
      const hit = this.hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
      if (hit) this.onFocus?.(hit.id);
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(100, rect.width || 190);
    this.h = Math.max(100, rect.height || 190);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(state, camera) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#101a21');
    bg.addColorStop(1, '#080d12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const pad = 12;
    const minX = -3.2, maxX = 3.2, minZ = -3.3, maxZ = 5.4;
    const sx = (w - pad * 2) / (maxX - minX);
    const sz = (h - pad * 2) / (maxZ - minZ);
    const sc = Math.min(sx, sz);
    const ox = (w - (maxX - minX) * sc) / 2 - minX * sc;
    const oy = (h - (maxZ - minZ) * sc) / 2 - minZ * sc;
    const X = (x) => ox + x * sc;
    const Z = (z) => oy + z * sc;

    // base plate and corridors
    ctx.fillStyle = '#121a20';
    ctx.strokeStyle = 'rgba(111, 160, 168, .25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(X(-3.15), Z(-3.15), (maxX - minX - 0.1) * sc, (maxZ - minZ - 0.2) * sc, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(104, 190, 190, .22)';
    ctx.lineWidth = 2;
    for (const [x1, z1, x2, z2] of [
      [0, 0, 0, -2.1], [0, 0, 2.1, 0], [0, 0, -2.1, 0], [0, 2.1, 0, 3.3], [0, 2.1, 2.1, 2.1], [0, 2.1, -2.1, 2.1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(X(x1), Z(z1));
      ctx.lineTo(X(x2), Z(z2));
      ctx.stroke();
    }

    this.hits = [];
    for (const area of AREAS) {
      const a = state.areas[area.id];
      const rw = 1.7 * sc;
      const rh = 1.3 * sc;
      const x = X(area.pos.x) - rw / 2;
      const y = Z(area.pos.z) - rh / 2;
      this.hits.push({ id: area.id, x, y, w: rw, h: rh });
      const selected = state.uiSelected === area.id;
      const unlocked = a?.unlocked;
      if (unlocked) {
        ctx.fillStyle = area.color;
        ctx.globalAlpha = a.active ? 0.95 : 0.45;
        ctx.beginPath();
        ctx.roundRect(x, y, rw, rh, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = a.active ? area.accent : '#b3453f';
        ctx.lineWidth = selected ? 2.5 : 1;
        ctx.stroke();
        ctx.fillStyle = a.active ? area.accent : '#f0a0a0';
        ctx.font = `700 ${Math.max(10, sc * 0.78)}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(area.icon, x + rw / 2, y + rh * 0.52);
      } else {
        ctx.fillStyle = 'rgba(20, 28, 34, .92)';
        ctx.beginPath();
        ctx.roundRect(x, y, rw, rh, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 145, 150, .22)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(170, 195, 198, .38)';
        ctx.font = `700 ${Math.max(8, sc * 0.5)}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + rw / 2, y + rh / 2);
      }
    }

    if (state.eco?.activeUntil && Date.now() <= state.eco.activeUntil && state.eco.areaId) {
      const a = AREA_BY_ID[state.eco.areaId];
      if (a) {
        const pulse = 3 + Math.sin(Date.now() * 0.006) * 1.4;
        ctx.fillStyle = '#ffe1ec';
        ctx.shadowColor = '#f1a5c5';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(X(a.pos.x), Z(a.pos.z), pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    if (camera) {
      const vb = camera.viewBounds();
      ctx.strokeStyle = 'rgba(232, 249, 247, .6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        clamp(X(vb.minX), 0, w),
        clamp(Z(vb.minZ), 0, h),
        clamp((vb.maxX - vb.minX) * sc, 4, w),
        clamp((vb.maxZ - vb.minZ) * sc, 4, h)
      );
    }

    // frame corners, because a square map inside a square panel needs a
    // little architectural detail or it looks like a debug overlay.
    ctx.strokeStyle = 'rgba(111, 228, 216, .5)';
    ctx.lineWidth = 1.2;
    for (const [cx, cy, dx, dy] of [[8, 8, 1, 1], [w - 8, 8, -1, 1], [8, h - 8, 1, -1], [w - 8, h - 8, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * 12);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * 12, cy);
      ctx.stroke();
    }
  }
}
