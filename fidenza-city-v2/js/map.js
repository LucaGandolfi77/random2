import { WORLD, ROAD_STYLE, AREA_STYLE, COLORS } from './config.js';
import { clamp, formatDistance } from './utils.js';

const MAP_SIZE = 2048;

function pathPolygon(ctx, poly, project) {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const p = project(poly[i][0], poly[i][1]);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function bikePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x - r * 0.58, y + r * 0.18, r * 0.42, 0, Math.PI * 2);
  ctx.moveTo(x + r * 1.0, y + r * 0.18);
  ctx.arc(x + r * 0.58, y + r * 0.18, r * 0.42, 0, Math.PI * 2);
  ctx.moveTo(x - r * 0.58, y + r * 0.18);
  ctx.lineTo(x - r * 0.1, y - r * 0.55);
  ctx.lineTo(x + r * 0.35, y - r * 0.55);
  ctx.lineTo(x + r * 0.58, y + r * 0.18);
  ctx.moveTo(x - r * 0.1, y - r * 0.55);
  ctx.lineTo(x + r * 0.18, y + r * 0.18);
  ctx.lineTo(x + r * 0.58, y + r * 0.18);
  ctx.stroke();
}

function drawBarMarker(ctx, x, y, r, color = '#2f6fa8') {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#eafaff';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (r >= 6) {
    ctx.fillStyle = '#eafaff';
    ctx.font = '700 9px Oswald, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', x, y + 0.5);
  }
}

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function diamondPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function arrowPath(ctx, x, y, angle, size) {
  const dx = Math.sin(angle), dy = Math.cos(angle);
  const px = -dy, py = dx;
  ctx.beginPath();
  ctx.moveTo(x + dx * size, y + dy * size);
  ctx.lineTo(x - dx * size * 0.7 + px * size * 0.62, y - dy * size * 0.7 + py * size * 0.62);
  ctx.lineTo(x - dx * size * 0.35, y - dy * size * 0.35);
  ctx.lineTo(x - dx * size * 0.7 - px * size * 0.62, y - dy * size * 0.7 - py * size * 0.62);
  ctx.closePath();
}

const POI_STYLE = {
  church: { letter: '†', color: '#6b5a43' },
  museum: { letter: 'M', color: '#3f748a' },
  theatre: { letter: 'T', color: '#9a4a34' },
  square: { letter: 'P', color: '#a8865b' },
  monument: { letter: '◆', color: '#3e5a4b' },
  station: { letter: 'S', color: '#4f6a7a' },
  park: { letter: '♣', color: '#4f7748' },
  civic: { letter: 'C', color: '#5d7a52' },
  nature: { letter: '≈', color: '#3f748a' },
  default: { letter: '•', color: '#3e5a4b' }
};

export class GameMap {
  constructor({ world, player, missions, vehicles }) {
    this.world = world;
    this.player = player;
    this.missions = missions;
    this.vehicles = vehicles;
    this.districts = world.districts || [];
    this.barBlue = world.barBlue || null;
    this.city = world.city;
    this.landmarks = world.landmarks;
    this.places = world.places;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = MAP_SIZE;
    this.ctx = this.canvas.getContext('2d');

    const pad = 50;
    this.minX = WORLD.bounds.minX - pad;
    this.maxX = WORLD.bounds.maxX + pad;
    this.minZ = WORLD.bounds.minZ - pad;
    this.maxZ = WORLD.bounds.maxZ + pad;
    this.worldW = this.maxX - this.minX;
    this.worldH = this.maxZ - this.minZ;
    this.mapScale = (MAP_SIZE - 20) / Math.max(this.worldW, this.worldH);
    this.offsetX = (MAP_SIZE - this.worldW * this.mapScale) / 2;
    this.offsetY = (MAP_SIZE - this.worldH * this.mapScale) / 2;

    this.minimap = document.getElementById('minimap');
    this.miniCtx = this.minimap?.getContext('2d');
    this.bigCanvas = document.getElementById('bigmap-canvas');
    this.bigCtx = this.bigCanvas?.getContext('2d');
    this.bigmapEl = document.getElementById('bigmap');
    this.isOpen = false;
    this.zoom = 1;
    this.centerX = WORLD.spawn.x;
    this.centerZ = WORLD.spawn.z;
    this.dragging = false;
    this.dragLast = null;
    this.pointers = new Map();
    this.pinchDist = 0;
    this._bindBigMap();
    this.renderStatic();
  }

  project(x, z) {
    return {
      x: this.offsetX + (x - this.minX) * this.mapScale,
      y: this.offsetY + (z - this.minZ) * this.mapScale
    };
  }

  renderStatic() {
    const ctx = this.ctx;
    ctx.fillStyle = '#efe4d0';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Aree
    for (const a of this.city.areas) {
      const style = AREA_STYLE[a.kind] || AREA_STYLE.urban;
      pathPolygon(ctx, a.poly, (x, z) => this.project(x, z));
      ctx.fillStyle = style.color;
      ctx.globalAlpha = a.kind === 'water' ? 0.92 : 0.78;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = style.edge;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Corsi d'acqua
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const w of this.city.waterways) {
      const width = (w.kind === 'river' ? 9.5 : w.kind === 'stream' ? 5.6 : w.kind === 'canal' ? 4 : 2.2) * this.mapScale;
      ctx.beginPath();
      w.pts.forEach((p, i) => {
        const q = this.project(p[0], p[1]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      });
      ctx.strokeStyle = '#7fb0bf';
      ctx.lineWidth = Math.max(2, width + 2 * this.mapScale);
      ctx.stroke();
      ctx.strokeStyle = '#4f8fa8';
      ctx.lineWidth = Math.max(1.4, width);
      ctx.stroke();
    }

    // Ferrovie
    for (const r of this.city.railways) {
      ctx.beginPath();
      r.pts.forEach((p, i) => {
        const q = this.project(p[0], p[1]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      });
      ctx.strokeStyle = '#6f6a5f';
      ctx.lineWidth = Math.max(1.5, 3.4 * this.mapScale);
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Strade: prima il bordo, poi il riempimento
    const order = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'pedestrian', 'cycleway', 'footway', 'path', 'track', 'steps'];
    const sorted = [...this.city.roads].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
    for (const r of sorted) {
      const style = ROAD_STYLE[r.kind] || ROAD_STYLE.residential;
      ctx.beginPath();
      r.pts.forEach((p, i) => {
        const q = this.project(p[0], p[1]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      });
      const lw = Math.max(1.1, r.w * this.mapScale);
      ctx.strokeStyle = '#9f9484';
      ctx.lineWidth = lw + Math.max(1.4, 1.6 * this.mapScale);
      ctx.stroke();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // Edifici
    for (const b of this.city.buildings) {
      pathPolygon(ctx, b.poly, (x, z) => this.project(x, z));
      ctx.fillStyle = b.kind === 'church' ? '#d8c5a2' : '#cdbba4';
      ctx.fill();
      ctx.strokeStyle = 'rgba(95,78,58,.38)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // Icone luoghi
    for (const l of this.places) {
      const p = this.project(l.x, l.z);
      const st = POI_STYLE[l.category] || POI_STYLE.default;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = st.color;
      ctx.strokeStyle = '#f4ebda';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f4ebda';
      ctx.font = '600 14px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.letter, 0, 1);
      ctx.restore();
    }

    // Nome città
    ctx.save();
    ctx.fillStyle = 'rgba(47,74,60,.18)';
    ctx.font = '400 92px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '8px';
    ctx.fillText('FIDENZA', MAP_SIZE / 2, MAP_SIZE - 80);
    ctx.restore();
  }

  drawMinimap(player, cameraYaw, activeMission) {
    const ctx = this.miniCtx;
    if (!ctx) return;
    const W = this.minimap.width, H = this.minimap.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(W, 0, W, H, r); ctx.arcTo(W, H, 0, H, r); ctx.arcTo(0, H, 0, 0, r); ctx.arcTo(0, 0, W, 0, r); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#e8ddc9';
    ctx.fillRect(0, 0, W, H);

    const viewW = 270; // px offscreen
    const viewH = viewW * H / W;
    const cx = this.project(player.position.x, player.position.z);
    const sx = cx.x - viewW / 2;
    const sy = cx.y - viewH / 2;
    ctx.drawImage(this.canvas, sx, sy, viewW, viewH, 0, 0, W, H);

    const toScreen = (x, z) => {
      const p = this.project(x, z);
      return { x: (p.x - sx) / viewW * W, y: (p.y - sy) / viewH * H };
    };

    // stelle
    for (const s of this.world.starObjects) {
      if (s.collected) continue;
      const p = toScreen(s.data.x, s.data.z);
      if (p.x < -6 || p.y < -6 || p.x > W + 6 || p.y > H + 6) continue;
      starPath(ctx, p.x, p.y, 3.6);
      ctx.fillStyle = '#e7b95a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,55,20,.55)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // luoghi
    for (const l of this.world.placeObjects) {
      if (l.visited) continue;
      const p = toScreen(l.placeX ?? l.data.x, l.placeZ ?? l.data.z);
      if (p.x < -8 || p.y < -8 || p.x > W + 8 || p.y > H + 8) continue;
      diamondPath(ctx, p.x, p.y, 4.2);
      ctx.fillStyle = '#4f8fa8';
      ctx.fill();
      ctx.strokeStyle = '#f4ebda';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // missione
    if (activeMission) {
      const t = activeMission;
      const p = toScreen(t.x, t.z);
      if (p.x > -10 && p.y > -10 && p.x < W + 10 && p.y < H + 10) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 + Math.sin(performance.now() * 0.006) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }
    // bus e treno
    if (this.world.bus) {
      const p = toScreen(this.world.bus.mesh.position.x, this.world.bus.mesh.position.z);
      ctx.fillStyle = '#2f6b4f';
      ctx.fillRect(p.x - 4, p.y - 3, 8, 6);
      ctx.strokeStyle = '#f4ebda';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - 4, p.y - 3, 8, 6);
    }
    if (this.world.event) {
      const place = this.world.placesById?.get(this.world.event.placeId);
      if (place) {
        const p = toScreen(place.beaconX ?? place.x, place.beaconZ ?? place.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = this.world.event.color || '#e7b95a';
        ctx.fill();
        ctx.strokeStyle = '#fff8e8';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // bici parcheggiate
    for (const vehicle of this.vehicles?.vehicles || []) {
      if (vehicle.type !== 'bike' || vehicle === this.vehicles.current) continue;
      const p = toScreen(vehicle.position.x, vehicle.position.z);
      if (p.x < -8 || p.y < -8 || p.x > W + 8 || p.y > H + 8) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#e7b95a';
      ctx.fill();
      ctx.strokeStyle = '#1b241e';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = '#1b241e';
      ctx.lineWidth = 1.1;
      bikePath(ctx, p.x, p.y, 3.1);
    }

    if (this.barBlue) {
      const p = toScreen(this.barBlue.x, this.barBlue.z);
      if (p.x > -10 && p.y > -10 && p.x < W + 10 && p.y < H + 10) {
        drawBarMarker(ctx, p.x, p.y, 6, this.barBlue.color);
      }
    }

    // giocatore al centro
    ctx.save();
    ctx.translate(W / 2, H / 2);
    // cono visuale
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 38, Math.PI / 2 - cameraYaw - 0.48, Math.PI / 2 - cameraYaw + 0.48);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,244,220,.18)';
    ctx.fill();
    arrowPath(ctx, 0, 0, cameraYaw, 9);
    ctx.fillStyle = '#fff8e8';
    ctx.fill();
    ctx.strokeStyle = '#2f4a3c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // bussola
    ctx.save();
    ctx.translate(W - 18, 18);
    ctx.fillStyle = 'rgba(20,28,23,.62)';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4ebda';
    ctx.font = '600 11px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, 1);
    ctx.restore();

    // vignetta
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20,28,23,.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  _bindBigMap() {
    if (!this.bigCanvas) return;
    const el = this.bigCanvas;
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      el.width = Math.max(1, Math.floor(rect.width * dpr));
      el.height = Math.max(1, Math.floor(rect.height * dpr));
      this._dpr = dpr;
    };
    window.addEventListener('resize', updateSize);
    this._updateSize = updateSize;

    el.addEventListener('pointerdown', e => {
      el.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.dragLast = { x: e.clientX, y: e.clientY };
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        this.dragging = false;
      }
    });
    el.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0) {
          this.zoom = clamp(this.zoom * (dist / this.pinchDist), 0.7, 4.5);
        }
        this.pinchDist = dist;
        return;
      }
      if (!this.dragging || !this.dragLast) return;
      const dx = e.clientX - this.dragLast.x;
      const dy = e.clientY - this.dragLast.y;
      this.dragLast = { x: e.clientX, y: e.clientY };
      const scale = this._baseScale * this.zoom;
      this.centerX -= dx / scale;
      this.centerZ -= dy / scale;
      this._clampCenter();
    });
    const end = e => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDist = 0;
      if (this.pointers.size === 1) {
        const p = [...this.pointers.values()][0];
        this.dragging = true;
        this.dragLast = { x: p.x, y: p.y };
      } else if (this.pointers.size === 0) {
        this.dragging = false;
        this.dragLast = null;
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom = clamp(this.zoom * (e.deltaY > 0 ? 0.86 : 1.16), 0.7, 4.5);
    }, { passive: false });

    document.getElementById('bigmap-in')?.addEventListener('click', () => { this.zoom = clamp(this.zoom * 1.25, 0.7, 4.5); });
    document.getElementById('bigmap-out')?.addEventListener('click', () => { this.zoom = clamp(this.zoom * 0.8, 0.7, 4.5); });
    document.getElementById('bigmap-me')?.addEventListener('click', () => {
      this.centerX = this.player.position.x;
      this.centerZ = this.player.position.z;
      this.zoom = 1.35;
      this._clampCenter();
    });
    document.getElementById('bigmap-close')?.addEventListener('click', () => this.close());
  }

  open() {
    this.isOpen = true;
    if (this.bigmapEl) this.bigmapEl.hidden = false;
    this.centerX = this.player.position.x;
    this.centerZ = this.player.position.z;
    this.zoom = 1.5;
    this._updateSize?.();
    this._computeScale();
  }

  close() {
    this.isOpen = false;
    if (this.bigmapEl) this.bigmapEl.hidden = true;
  }

  toggle() {
    if (this.isOpen) this.close(); else this.open();
  }

  _computeScale() {
    if (!this.bigCanvas) return;
    const rect = this.bigCanvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    this._baseScale = Math.min(w / this.worldW, h / this.worldH) * 0.92;
  }

  _clampCenter() {
    const margin = 200;
    this.centerX = clamp(this.centerX, this.minX + margin, this.maxX - margin);
    this.centerZ = clamp(this.centerZ, this.minZ + margin, this.maxZ - margin);
  }

  drawBigMap(player, cameraYaw, activeMission) {
    if (!this.isOpen) return;
    const canvas = this.bigCanvas;
    const ctx = this.bigCtx;
    if (!ctx || !canvas) return;
    if (!this._baseScale) this._computeScale();
    const dpr = this._dpr || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1d2821';
    ctx.fillRect(0, 0, W, H);

    const scale = this._baseScale * this.zoom; // px CSS per metro
    const drawScale = scale / this.mapScale;
    const mx = this.project(this.centerX, this.centerZ);
    const destX = W / 2 - mx.x * drawScale;
    const destY = H / 2 - mx.y * drawScale;
    ctx.drawImage(this.canvas, destX, destY, MAP_SIZE * drawScale, MAP_SIZE * drawScale);

    const toScreen = (x, z) => {
      const p = this.project(x, z);
      return { x: destX + p.x * drawScale, y: destY + p.y * drawScale };
    };

    // quartieri
    for (const district of this.districts) {
      if (!district.poly?.length) continue;
      pathPolygon(ctx, district.poly, (x, z) => toScreen(x, z));
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = district.color || '#8a7f6a';
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = district.color || '#8a7f6a';
      ctx.lineWidth = 1.4 / Math.max(0.5, drawScale);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.zoom >= 0.8) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const district of this.districts) {
        const p = toScreen(district.x, district.z);
        if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) continue;
        ctx.font = '700 13px Oswald, "Trebuchet MS", sans-serif';
        const label = district.name.toUpperCase();
        const w = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(20,28,23,.65)';
        ctx.fillRect(p.x - w / 2 - 8, p.y - 11, w + 16, 22);
        ctx.fillStyle = district.color || '#f4ebda';
        ctx.fillText(label, p.x, p.y);
      }
    }

    // stelle
    for (const s of this.world.starObjects) {
      if (s.collected) continue;
      const p = toScreen(s.data.x, s.data.z);
      if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
      starPath(ctx, p.x, p.y, 7);
      ctx.fillStyle = '#e7b95a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,50,20,.65)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // luoghi
    for (const l of this.world.placeObjects) {
      if (l.visited) continue;
      const p = toScreen(l.placeX ?? l.data.x, l.placeZ ?? l.data.z);
      if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
      diamondPath(ctx, p.x, p.y, 8);
      ctx.fillStyle = '#8fc7dd';
      ctx.fill();
      ctx.strokeStyle = '#1b241e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // missione attiva
    if (activeMission) {
      const p = toScreen(activeMission.x, activeMission.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11 + Math.sin(performance.now() * 0.005) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#c2684b';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(194,104,75,.25)';
      ctx.fill();
    }

    // bus e treno
    if (this.world.bus) {
      const p = toScreen(this.world.bus.mesh.position.x, this.world.bus.mesh.position.z);
      if (p.x > -20 && p.y > -20 && p.x < W + 20 && p.y < H + 20) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#2f6b4f';
        ctx.fill();
        ctx.strokeStyle = '#f4ebda';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f4ebda';
        ctx.font = '700 10px Oswald, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('B', p.x, p.y + 0.5);
      }
    }
    if (this.world.train) {
      const p = toScreen(this.world.train.mesh.position.x, this.world.train.mesh.position.z);
      if (p.x > -20 && p.y > -20 && p.x < W + 20 && p.y < H + 20) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#8f3e34';
        ctx.fill();
        ctx.strokeStyle = '#f4ebda';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f4ebda';
        ctx.font = '700 10px Oswald, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T', p.x, p.y + 0.5);
      }
    }
    if (this.world.event) {
      const place = this.world.placesById?.get(this.world.event.placeId);
      if (place) {
        const p = toScreen(place.beaconX ?? place.x, place.beaconZ ?? place.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = this.world.event.color || '#e7b95a';
        ctx.fill();
        ctx.strokeStyle = '#fff8e8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff8e8';
        ctx.font = '700 11px Oswald, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚑', p.x, p.y + 0.5);
      }
    }

    // icone POI
    for (const l of this.places) {
      const p = toScreen(l.x, l.z);
      if (p.x < -14 || p.y < -14 || p.x > W + 14 || p.y > H + 14) continue;
      const st = POI_STYLE[l.category] || POI_STYLE.default;
      const r = this.zoom >= 1.15 ? 8 : 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = st.color;
      ctx.fill();
      ctx.strokeStyle = '#f4ebda';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (this.zoom >= 1.15) {
        ctx.fillStyle = '#f4ebda';
        ctx.font = '600 10px Oswald, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.letter, p.x, p.y + 0.5);
      }
    }

    // etichette luoghi
    if (this.zoom >= 1.25) {
      ctx.font = '600 11px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const showAllLabels = this.zoom >= 2.2;
      const priority = { monument: 9, church: 8, square: 7, theatre: 6, museum: 6, station: 5, civic: 4, park: 3, nature: 2 };
      const labelPlaces = [...this.places]
        .filter(l => l.collectible || showAllLabels)
        .sort((a, b) => (Number(b.collectible) - Number(a.collectible)) || ((priority[b.category] || 0) - (priority[a.category] || 0)));
      const usedRects = [];
      for (const l of labelPlaces) {
        const p = toScreen(l.x, l.z);
        if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) continue;
        const text = l.short || l.name;
        const w = ctx.measureText(text).width;
        const rect = { x: p.x - w / 2 - 5, y: p.y + 10, w: w + 10, h: 17 };
        if (usedRects.some(r => rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y)) continue;
        usedRects.push(rect);
        ctx.fillStyle = 'rgba(27,36,30,.72)';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = '#f4ebda';
        ctx.fillText(text, p.x, p.y + 12);
      }
    }

    // bici parcheggiate
    for (const vehicle of this.vehicles?.vehicles || []) {
      if (vehicle.type !== 'bike' || vehicle === this.vehicles.current) continue;
      const p = toScreen(vehicle.position.x, vehicle.position.z);
      if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#e7b95a';
      ctx.fill();
      ctx.strokeStyle = '#1b241e';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = '#1b241e';
      ctx.lineWidth = 1.6;
      bikePath(ctx, p.x, p.y, 5.1);
    }

    if (this.barBlue) {
      const p = toScreen(this.barBlue.x, this.barBlue.z);
      if (p.x > -24 && p.y > -24 && p.x < W + 24 && p.y < H + 24) {
        drawBarMarker(ctx, p.x, p.y, 10, this.barBlue.color);
        if (this.zoom >= 1.25) {
          ctx.fillStyle = 'rgba(20,28,23,.72)';
          ctx.font = '600 11px Oswald, "Trebuchet MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = 'BAR BLU PIRAMIDE';
          const w = ctx.measureText(label).width;
          ctx.fillRect(p.x - w / 2 - 5, p.y + 12, w + 10, 17);
          ctx.fillStyle = '#eafaff';
          ctx.fillText(label, p.x, p.y + 14);
        }
      }
    }

    // giocatore
    const pp = toScreen(player.position.x, player.position.z);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,248,232,.2)';
    ctx.fill();
    arrowPath(ctx, 0, 0, cameraYaw, 12);
    ctx.fillStyle = '#fff8e8';
    ctx.fill();
    ctx.strokeStyle = '#2f4a3c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // scala
    const scaleBarMeters = scale > 0.7 ? 100 : 250;
    const barPx = scaleBarMeters * scale;
    ctx.fillStyle = 'rgba(20,28,23,.62)';
    ctx.fillRect(20, H - 48, barPx, 4);
    ctx.fillStyle = 'rgba(244,235,218,.82)';
    ctx.font = '600 10px Oswald, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${scaleBarMeters} m`, 20, H - 54);
  }
}
