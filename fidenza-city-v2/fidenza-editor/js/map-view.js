import {
  pointInPoly, distanceToPolyline, polygonCentroid, polygonBounds, clamp
} from './geo.js';
import { buildBusRoute } from '../../js/transit.js';

const CATEGORY = {
  church: { letter: '†', color: '#6b5a43' },
  museum: { letter: 'M', color: '#3f748a' },
  theatre: { letter: 'T', color: '#9a4a34' },
  square: { letter: 'P', color: '#a8865b' },
  monument: { letter: '◆', color: '#3e5a4b' },
  station: { letter: 'S', color: '#4f6a7a' },
  park: { letter: '♣', color: '#4f7748' },
  civic: { letter: 'C', color: '#5d7a52' },
  nature: { letter: '≈', color: '#3f748a' },
  service: { letter: '•', color: '#756f61' },
  food: { letter: '•', color: '#9a4a34' },
  default: { letter: '•', color: '#3e5a4b' }
};

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

function diamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

export class MapView {
  constructor({ canvas, state, onChange, onStatus }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.onChange = onChange;
    this.onStatus = onStatus;
    this.scale = 1;
    this.center = { x: 0, z: 0 };
    this.mode = 'select';
    this.snap = 1;
    this.layers = {
      buildings: true, roads: true, areas: true, water: true, rail: true,
      pois: true, landmarks: true, stars: true, missions: true, vehicles: true, props: true, transit: true, spawn: true
    };
    this.pendingPropType = 'sign';
    this.transitRoute = null;
    this.transitSignature = '';
    this.hover = null;
    this.dragging = false;
    this.panning = false;
    this.dragMoved = false;
    this.last = null;
    this._bind();
    this.fit();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.dpr = dpr;
    this.w = rect.width;
    this.h = rect.height;
    this.render();
  }

  fit() {
    const city = this.state.patchedCity || this.state.city;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const b of city.buildings || []) {
      if (b.x < minX) minX = b.x;
      if (b.x > maxX) maxX = b.x;
      if (b.z < minZ) minZ = b.z;
      if (b.z > maxZ) maxZ = b.z;
    }
    if (!Number.isFinite(minX)) { minX = -1600; maxX = 1800; minZ = -1600; maxZ = 1800; }
    const pad = 80;
    const w = maxX - minX, h = maxZ - minZ;
    this.center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width || 900;
    this.h = rect.height || 600;
    this.scale = Math.min((this.w - pad * 2) / w, (this.h - pad * 2) / h);
    this.render();
  }

  focusOn(x, z, minScale = 1.4) {
    this.center = { x, z };
    this.scale = Math.max(this.scale, minScale);
    this.render();
  }

  worldToScreen(x, z) {
    return {
      x: (x - this.center.x) * this.scale + this.w / 2,
      y: (z - this.center.z) * this.scale + this.h / 2
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.w / 2) / this.scale + this.center.x,
      z: (sy - this.h / 2) / this.scale + this.center.z
    };
  }

  _bind() {
    const el = this.canvas;
    el.addEventListener('pointerdown', e => this._down(e));
    el.addEventListener('pointermove', e => this._move(e));
    el.addEventListener('pointerup', e => this._up(e));
    el.addEventListener('pointercancel', e => this._up(e));
    el.addEventListener('pointerleave', () => { this.hover = null; this.render(); });
    el.addEventListener('wheel', e => this._wheel(e), { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  _eventPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _down(e) {
    const p = this._eventPoint(e);
    this.last = p;
    if (this.mode === 'addPlace') {
      const world = this.screenToWorld(p.x, p.y);
      const ll = this._unproject(world.x, world.z);
      this.state.addPlace(ll.lat, ll.lon);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'addStar') {
      const world = this.screenToWorld(p.x, p.y);
      this.state.addStar(world.x, world.z);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'addProp') {
      const world = this.screenToWorld(p.x, p.y);
      this.state.addProp(this.pendingPropType || 'sign', world.x, world.z);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'addMissionStep') {
      const world = this.screenToWorld(p.x, p.y);
      this.state.addMissionStep(this.pendingMissionId, world.x, world.z);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    const panButton = e.button === 1 || e.button === 2 || e.shiftKey;
    if (panButton) {
      this.panning = true;
      this.canvas.setPointerCapture?.(e.pointerId);
      return;
    }
    const hit = this.hitTest(p.x, p.y);
    if (hit) {
      this.state.select(hit);
      this.dragging = true;
      this.dragMoved = false;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.onChange?.({ final: true });
      return;
    }
    this.state.select(null);
    this.panning = true;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.onChange?.({ final: true });
  }

  _unproject(x, z) {
    const o = this.state.originDef;
    const mPerDegLat = 111132.0;
    const mPerDegLon = 111320.0 * Math.cos(o.lat * Math.PI / 180);
    return { lat: o.lat - z / mPerDegLat, lon: o.lon + x / mPerDegLon };
  }

  _move(e) {
    const p = this._eventPoint(e);
    if (this.panning) {
      const dx = p.x - this.last.x;
      const dy = p.y - this.last.y;
      this.center.x -= dx / this.scale;
      this.center.z -= dy / this.scale;
      this.last = p;
      this.render();
      return;
    }
    if (this.dragging) {
      if (!this.dragMoved) this.state.pushUndo('sposta elemento');
      const world = this.screenToWorld(p.x, p.y);
      const snap = this.snap;
      const x = snap ? Math.round(world.x / snap) * snap : world.x;
      const z = snap ? Math.round(world.z / snap) * snap : world.z;
      this.state.setSelectionPosition(x, z);
      this.state.refresh();
      this.dragMoved = true;
      this.onChange?.();
      this.render();
      return;
    }
    const hit = this.hitTest(p.x, p.y);
    const changed = JSON.stringify(hit) !== JSON.stringify(this.hover);
    this.hover = hit;
    this.onStatus?.(this.screenToWorld(p.x, p.y), this.scale);
    if (changed) this.render();
    const placing = ['addPlace', 'addStar', 'addProp', 'addMissionStep'].includes(this.mode);
    this.canvas.style.cursor = placing ? 'crosshair' : hit ? (this.dragging ? 'grabbing' : 'grab') : (this.panning ? 'grabbing' : 'default');
  }

  _up(e) {
    this.dragging = false;
    this.panning = false;
    this.last = null;
    this.render();
    this.onChange?.({ final: true });
  }

  _wheel(e) {
    e.preventDefault();
    const p = this._eventPoint(e);
    const before = this.screenToWorld(p.x, p.y);
    const factor = Math.exp(-e.deltaY * 0.0012);
    this.scale = clamp(this.scale * factor, 0.15, 12);
    const after = this.screenToWorld(p.x, p.y);
    this.center.x += before.x - after.x;
    this.center.z += before.z - after.z;
    this.render();
  }

  _visible(item) {
    if (!item) return false;
    const layers = this.layers;
    if (item.kind === 'building') return layers.buildings;
    if (item.kind === 'road') return layers.roads;
    if (item.kind === 'area') return layers.areas;
    if (item.kind === 'place' || item.kind === 'beacon') return layers.pois;
    if (item.kind === 'landmark') return layers.landmarks;
    if (item.kind === 'star') return layers.stars;
    if (item.kind === 'missionStep') return layers.missions;
    if (item.kind === 'vehicle') return layers.vehicles;
    if (item.kind === 'prop') return layers.props !== false;
    if (item.kind === 'spawn' || item.kind === 'missionBoard') return layers.spawn;
    return true;
  }

  hitTest(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    const radius = 11 / this.scale;
    const candidates = [];

    if (this.layers.pois) {
      for (const p of this.state.compiled.places) {
        if (Math.hypot(world.x - p.x, world.z - p.z) < radius) candidates.push({ kind: 'place', id: p.id, d: Math.hypot(world.x - p.x, world.z - p.z) });
        if (p.collectible && Math.hypot(world.x - (p.beaconX ?? p.x), world.z - (p.beaconZ ?? p.z)) < radius) {
          candidates.push({ kind: 'beacon', id: p.id, d: Math.hypot(world.x - (p.beaconX ?? p.x), world.z - (p.beaconZ ?? p.z)) });
        }
      }
    }
    if (this.layers.landmarks) {
      for (const l of this.state.compiled.landmarks) {
        const x = l.x + (l.offsetX || 0), z = l.z + (l.offsetZ || 0);
        if (Math.hypot(world.x - x, world.z - z) < radius) candidates.push({ kind: 'landmark', id: l.id, d: Math.hypot(world.x - x, world.z - z) });
      }
    }
    if (this.layers.stars) {
      for (const s of this.state.compiled.stars) {
        if (Math.hypot(world.x - s.x, world.z - s.z) < radius) candidates.push({ kind: 'star', id: s.id, d: Math.hypot(world.x - s.x, world.z - s.z) });
      }
    }
    if (this.layers.missions) {
      for (const m of this.state.compiled.missions) {
        for (let i = 0; i < m.steps.length; i++) {
          const s = m.steps[i];
          if (Math.hypot(world.x - s.x, world.z - s.z) < radius) candidates.push({ kind: 'missionStep', id: m.id, index: i, d: Math.hypot(world.x - s.x, world.z - s.z) });
        }
      }
    }
    if (this.layers.vehicles) {
      (this.state.compiled.vehicles || []).forEach((v, i) => {
        if (Math.hypot(world.x - v.x, world.z - v.z) < radius + 2) candidates.push({ kind: 'vehicle', index: i, d: Math.hypot(world.x - v.x, world.z - v.z) });
      });
    }
    if (this.layers.props) {
      for (const p of this.state.compiled.props || []) {
        const d = Math.hypot(world.x - p.x, world.z - p.z);
        if (d < radius + 3) candidates.push({ kind: 'prop', id: p.id, d });
      }
    }
    if (this.layers.spawn) {
      if (this.state.map.spawn && Math.hypot(world.x - this.state.map.spawn.x, world.z - this.state.map.spawn.z) < radius) candidates.push({ kind: 'spawn', d: 0 });
      if (this.state.map.missionBoard && Math.hypot(world.x - this.state.map.missionBoard.x, world.z - this.state.map.missionBoard.z) < radius) candidates.push({ kind: 'missionBoard', d: 0 });
    }

    if (candidates.length) {
      candidates.sort((a, b) => a.d - b.d);
      const c = candidates[0];
      return this._visible(c) ? c : null;
    }

    if (this.layers.buildings) {
      let best = null;
      for (const b of this.state.patchedCity.buildings) {
        if (pointInPoly(world.x, world.z, b.poly)) {
          if (!best || b.area < best.area) best = b;
        }
      }
      if (best) return { kind: 'building', id: String(best.id) };
    }
    if (this.layers.roads) {
      let best = null;
      for (const r of this.state.patchedCity.roads) {
        const d = distanceToPolyline(world.x, world.z, r.pts);
        if (d < 5 / this.scale && (!best || d < best.d)) best = { road: r, d };
      }
      if (best) return { kind: 'road', id: String(best.road.id) };
    }
    if (this.layers.areas) {
      let best = null;
      for (const a of this.state.patchedCity.areas) {
        if (pointInPoly(world.x, world.z, a.poly)) {
          if (!best || a.area < best.area) best = a;
        }
      }
      if (best) return { kind: 'area', id: String(best.id) };
    }
    return null;
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#efe4d0';
    ctx.fillRect(0, 0, this.w, this.h);

    this._drawGrid(ctx);
    this._drawAreas(ctx);
    this._drawWater(ctx);
    this._drawRail(ctx);
    this._drawRoads(ctx);
    this._drawBuildings(ctx);
    this._drawTransit(ctx);
    this._drawSelectedOriginal(ctx);
    this._drawMissionPath(ctx);
    this._drawMarkers(ctx);
    this._drawScale(ctx);
  }

  _updateTransit() {
    const ids = ['stazione', 'piazza-duomo', 'teatro', 'granmadre'];
    const stops = ids.map(id => this.state.compiled.places.find(p => p.id === id)).filter(Boolean)
      .map(p => ({ id: p.id, name: p.short || p.name, x: p.beaconX ?? p.x, z: p.beaconZ ?? p.z }));
    const signature = stops.map(p => `${p.id}:${p.x.toFixed(1)}:${p.z.toFixed(1)}`).join('|');
    if (signature === this.transitSignature) return;
    this.transitSignature = signature;
    this.transitRoute = stops.length >= 2 ? buildBusRoute(this.state.patchedCity, stops) : null;
  }

  _drawTransit(ctx) {
    if (!this.layers.transit) return;
    this._updateTransit();
    if (!this.transitRoute?.points?.length) return;
    ctx.save();
    ctx.beginPath();
    this.transitRoute.points.forEach((p, i) => {
      const q = this.worldToScreen(p.x, p.z);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    });
    ctx.strokeStyle = 'rgba(47,107,79,.62)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const stop of this.transitRoute.stops) {
      const q = this.worldToScreen(stop.x, stop.z);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#2f6b4f';
      ctx.fill();
      ctx.strokeStyle = '#f4ebda';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#fff8e8';
      ctx.font = '700 8px Oswald, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('B', q.x, q.y + 0.5);
    }
    ctx.restore();
  }

  _drawGrid(ctx) {
    const step = this.scale > 2 ? 10 : this.scale > 0.6 ? 50 : 200;
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.w, this.h);
    ctx.save();
    ctx.strokeStyle = 'rgba(90,75,55,.08)';
    ctx.lineWidth = 1;
    for (let x = Math.floor(topLeft.x / step) * step; x < bottomRight.x; x += step) {
      const p = this.worldToScreen(x, 0);
      ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, this.h); ctx.stroke();
    }
    for (let z = Math.floor(topLeft.z / step) * step; z < bottomRight.z; z += step) {
      const p = this.worldToScreen(0, z);
      ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(this.w, p.y); ctx.stroke();
    }
    ctx.restore();
  }

  _polyPath(ctx, poly) {
    ctx.beginPath();
    for (let i = 0; i < poly.length; i++) {
      const p = this.worldToScreen(poly[i][0], poly[i][1]);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  _linePath(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = this.worldToScreen(pts[i][0], pts[i][1]);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }

  _drawAreas(ctx) {
    if (!this.layers.areas) return;
    ctx.save();
    for (const a of this.state.patchedCity.areas) {
      this._polyPath(ctx, a.poly);
      const style = {
        park: '#7c9a5c', grass: '#86a86c', forest: '#5a7d51', farmland: '#b3a46f',
        cemetery: '#8b9b7b', industrial: '#a4a39a', urban: '#d8cdb9', square: '#d9c9ad',
        parking: '#8a8c86', school: '#c2b9a3', hospital: '#d7d2c7', platform: '#b9b3a8', sport: '#7fa05c'
      }[a.kind] || '#d8cdb9';
      ctx.fillStyle = style;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (this._isSelected('area', a.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawWater(ctx) {
    if (!this.layers.areas) return;
    ctx.save();
    for (const a of this.state.patchedCity.areas.filter(a => a.kind === 'water')) {
      this._polyPath(ctx, a.poly);
      ctx.fillStyle = '#86b4c4';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.layers.water) {
      for (const w of this.state.patchedCity.waterways || []) {
        this._linePath(ctx, w.pts);
        ctx.strokeStyle = '#6aa2b6';
        ctx.lineWidth = Math.max(1.5, (w.kind === 'river' ? 9 : w.kind === 'stream' ? 5 : 3) * this.scale);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawRail(ctx) {
    if (!this.layers.rail) return;
    ctx.save();
    ctx.strokeStyle = '#766f62';
    ctx.lineWidth = Math.max(1, 2.5 * this.scale);
    ctx.setLineDash([6, 4]);
    for (const r of this.state.patchedCity.railways || []) {
      this._linePath(ctx, r.pts);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawRoads(ctx) {
    if (!this.layers.roads) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of this.state.patchedCity.roads) {
      this._linePath(ctx, r.pts);
      ctx.strokeStyle = '#a09483';
      ctx.lineWidth = Math.max(1.2, (r.w + 2.2) * this.scale);
      ctx.stroke();
      ctx.strokeStyle = r.kind === 'pedestrian' || r.kind === 'footway' ? '#c4b69d' : '#5e6261';
      ctx.lineWidth = Math.max(1, r.w * this.scale);
      ctx.stroke();
      if (this._isSelected('road', r.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = Math.max(2, (r.w + 3) * this.scale);
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  _drawBuildings(ctx) {
    if (!this.layers.buildings) return;
    ctx.save();
    for (const b of this.state.patchedCity.buildings) {
      this._polyPath(ctx, b.poly);
      ctx.fillStyle = b.color || '#d8c6ae';
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,72,52,.45)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      if (this._isSelected('building', b.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawSelectedOriginal(ctx) {
    const s = this.state.selection;
    if (!s || !['building', 'road', 'area'].includes(s.kind)) return;
    const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
    const original = this.state.city[group]?.find(x => String(x.id) === String(s.id));
    if (!original) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(194,104,75,.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    if (s.kind === 'road') this._linePath(ctx, original.pts);
    else this._polyPath(ctx, original.poly);
    ctx.stroke();
    ctx.restore();
  }

  _drawMissionPath(ctx) {
    if (!this.layers.missions) return;
    ctx.save();
    for (const m of this.state.compiled.missions) {
      if (!m.steps?.length) continue;
      ctx.beginPath();
      m.steps.forEach((s, i) => {
        const p = this.worldToScreen(s.x, s.z);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = 'rgba(194,104,75,.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  _isSelected(kind, id) {
    const s = this.state.selection;
    return s && s.kind === kind && String(s.id) === String(id);
  }

  _drawMarkers(ctx) {
    const sel = this.state.selection;
    const labelQueue = [];
    const drawLabel = (text, x, y, force = false, color = '#1b241e', bg = 'rgba(244,235,218,.92)') => {
      labelQueue.push({ text, x, y, force, color, bg });
    };

    // POI
    if (this.layers.pois) {
      for (const p of this.state.compiled.places) {
        const c = CATEGORY[p.category] || CATEGORY.default;
        const s = this.worldToScreen(p.x, p.z);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.strokeStyle = p.collectible ? '#e7b95a' : '#f4ebda';
        ctx.lineWidth = p.collectible ? 2.5 : 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f4ebda';
        ctx.font = '600 9px Oswald, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.letter, s.x, s.y + 0.5);
        if ((this.scale > 0.28 && p.collectible) || this._isSelected('place', p.id) || this.hover?.id === p.id) {
          drawLabel(p.short || p.name, s.x, s.y - 10, this._isSelected('place', p.id) || this.hover?.id === p.id);
        }
        if (p.collectible) {
          const b = this.worldToScreen(p.beaconX ?? p.x, p.beaconZ ?? p.z);
          diamond(ctx, b.x, b.y, 5);
          ctx.fillStyle = 'rgba(124,196,221,.75)';
          ctx.fill();
          ctx.strokeStyle = '#f4ebda';
          ctx.lineWidth = 1;
          ctx.stroke();
          if (this._isSelected('beacon', p.id)) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
            ctx.strokeStyle = '#c2684b';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }

    // Landmark
    if (this.layers.landmarks) {
      for (const l of this.state.compiled.landmarks) {
        const s = this.worldToScreen(l.x + (l.offsetX || 0), l.z + (l.offsetZ || 0));
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate((l.rotation || 0) * Math.PI / 180);
        ctx.beginPath();
        ctx.rect(-7, -7, 14, 14);
        ctx.fillStyle = l.hidden ? '#8f8a80' : '#2f4a3c';
        ctx.fill();
        ctx.strokeStyle = '#f4ebda';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
        ctx.restore();
        if (this._isSelected('landmark', l.id) || this.hover?.kind === 'landmark' && this.hover?.id === l.id) {
          drawLabel(`${l.short || l.name} · ${l.model}`, s.x, s.y - 18, true);
        }
      }
    }

    // Stelle
    if (this.layers.stars) {
      for (const st of this.state.compiled.stars) {
        const s = this.worldToScreen(st.x, st.z);
        starPath(ctx, s.x, s.y, 7);
        ctx.fillStyle = '#e7b95a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,55,20,.65)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (this._isSelected('star', st.id)) {
          ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = '#c2684b'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }

    // Missioni
    if (this.layers.missions) {
      for (const m of this.state.compiled.missions) {
        for (let i = 0; i < m.steps.length; i++) {
          const st = m.steps[i];
          const s = this.worldToScreen(st.x, st.z);
          ctx.beginPath();
          ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#c2684b';
          ctx.fill();
          ctx.strokeStyle = '#f4ebda';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#fff8e8';
          ctx.font = '600 9px Oswald, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), s.x, s.y + 0.5);
          if (this._isSelected('missionStep', m.id) && sel?.index === i) {
            ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
            ctx.strokeStyle = '#c2684b'; ctx.lineWidth = 2; ctx.stroke();
          }
        }
      }
    }

    // Veicoli
    if (this.layers.vehicles) {
      (this.state.compiled.vehicles || []).forEach((v, i) => {
        const s = this.worldToScreen(v.x, v.z);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(-v.yaw);
        ctx.fillStyle = v.color || '#c2684b';
        ctx.fillRect(-4, -8, 8, 16);
        ctx.strokeStyle = '#f4ebda';
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, -8, 8, 16);
        ctx.restore();
        if (this._isSelected('vehicle', i)) {
          ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
          ctx.strokeStyle = '#c2684b'; ctx.lineWidth = 2; ctx.stroke();
        }
      });
    }

    // Prop e insegne
    if (this.layers.props) {
      const PROP_STYLE = {
        sign: { color: '#8a6a3a', letter: 'I' },
        'street-sign': { color: '#24506b', letter: 'V' },
        tree: { color: '#4f7748', letter: '♣' },
        bench: { color: '#8a5f3d', letter: 'B' },
        lamp: { color: '#6b6b5a', letter: 'L' },
        bollard: { color: '#3a423c', letter: '•' },
        planter: { color: '#5d8850', letter: 'P' },
        stall: { color: '#b07a4e', letter: 'M' },
        'parked-car': { color: '#7b8b88', letter: 'A' }
      };
      for (const p of this.state.compiled.props || []) {
        const s = this.worldToScreen(p.x, p.z);
        const st = PROP_STYLE[p.type] || PROP_STYLE.sign;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate((p.rotation || 0));
        ctx.fillStyle = st.color;
        ctx.fillRect(-5, -5, 10, 10);
        ctx.strokeStyle = '#f4ebda';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.restore();
        ctx.fillStyle = '#fff8e8';
        ctx.font = '600 8px Oswald, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.letter, s.x, s.y + 0.5);
        const selected = this._isSelected('prop', p.id);
        if (selected) {
          ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = '#c2684b'; ctx.lineWidth = 2; ctx.stroke();
        }
        if (selected || this.hover?.kind === 'prop' && this.hover?.id === p.id) {
          drawLabel(p.text || p.type, s.x, s.y - 12, true);
        }
      }
    }

    // Spawn e tabellone
    if (this.layers.spawn) {
      if (this.state.map.spawn) {
        const s = this.worldToScreen(this.state.map.spawn.x, this.state.map.spawn.z);
        ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#2f4a3c'; ctx.fill();
        ctx.strokeStyle = '#f4ebda'; ctx.lineWidth = 2; ctx.stroke();
        drawLabel('SPAWN', s.x, s.y - 16, true);
      }
      if (this.state.map.missionBoard) {
        const s = this.worldToScreen(this.state.map.missionBoard.x, this.state.map.missionBoard.z);
        ctx.fillStyle = '#8b6848';
        ctx.fillRect(s.x - 7, s.y - 7, 14, 14);
        ctx.strokeStyle = '#f4ebda'; ctx.lineWidth = 1.5; ctx.strokeRect(s.x - 7, s.y - 7, 14, 14);
        drawLabel('MISSIONI', s.x, s.y + 28, true);
      }
    }

    // Etichette sopra tutti i marker, con collision avoidance.
    const labelRects = [];
    for (const l of labelQueue) {
      ctx.font = '600 11px Oswald, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const w = ctx.measureText(l.text).width;
      const rect = { x: l.x - w / 2 - 4, y: l.y - 16, w: w + 8, h: 15 };
      if (!l.force && labelRects.some(r => rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y)) continue;
      labelRects.push(rect);
      ctx.fillStyle = l.bg;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, l.x, l.y - 4);
    }
  }

  _drawScale(ctx) {
    const meters = this.scale > 2 ? 50 : this.scale > 0.6 ? 200 : 500;
    const px = meters * this.scale;
    ctx.save();
    ctx.fillStyle = 'rgba(27,36,30,.7)';
    ctx.fillRect(18, this.h - 28, px, 4);
    ctx.fillStyle = 'rgba(27,36,30,.8)';
    ctx.font = '600 11px Oswald, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${meters} m`, 18, this.h - 34);
    ctx.restore();
  }
}
