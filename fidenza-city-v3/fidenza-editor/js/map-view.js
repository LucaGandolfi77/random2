import {
  pointInPoly, distanceToPolyline, polygonCentroid, polygonBounds, clamp
} from './geo.js';
import { SpatialIndex } from './spatial.js';
import { featureGroup, isLineKind, pointsBounds } from './geometry.js';
import { buildBusRoute } from '../../js/transit.js';
import { WORLD } from '../../js/config.js';
import {
  AREA_BLOCK_FALLBACK,
  blockColor, blockKey, roadSurfaceBlock, wallFallbackBlock, roofFallbackBlock
} from '../../js/block-palette.js';
import { createBlockPattern } from '../../js/block-textures.js';

const DRAW_MODES = {
  drawRoad: { kind: 'road', min: 2, label: 'strada' },
  drawArea: { kind: 'area', min: 3, label: 'area' },
  drawBuilding: { kind: 'building', min: 3, label: 'edificio' },
  drawWater: { kind: 'waterway', min: 2, label: 'corso d’acqua' },
  drawRail: { kind: 'railway', min: 2, label: 'ferrovia' }
};

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
  constructor({ canvas, state, arnis = null, tileLayer = null, tileImage = null, onChange, onStatus, onDrawing, onPaintMaterial }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.arnis = arnis;
    this.tileLayer = tileLayer;
    this.tileImage = tileImage;
    this.onChange = onChange;
    this.onStatus = onStatus;
    this.onDrawing = onDrawing;
    this.onPaintMaterial = onPaintMaterial;
    this.scale = 1;
    this.center = { x: 0, z: 0 };
    this.mode = 'select';
    this.snap = 1;
    this.layers = {
      tiles: true, blockGrid: false, buildings: true, roads: true, areas: true, water: true, rail: true,
      pois: true, landmarks: true, stars: true, missions: true, vehicles: true, props: true, transit: true, spawn: true
    };
    this.pendingPropType = 'sign';
    this.pendingMissionId = null;
    this.transitRoute = null;
    this.transitSignature = '';
    this.hover = null;
    this.dragging = false;
    this.panning = false;
    this.dragMoved = false;
    this.last = null;
    this.drawing = null;
    this._lastDrawClick = null;
    this.activeVertex = null;
    this.vertexDrag = null;
    this.spacePan = false;
    this._raf = 0;
    this._index = null;
    this._indexedCity = null;
    this.lastRenderMs = 0;
    this.visibleCount = 0;
    this._baseCanvas = null;
    this._baseCtx = null;
    this._baseKey = '';
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
    this._makeBaseCanvas();
    this.render();
  }

  _makeBaseCanvas() {
    this._baseCanvas = document.createElement('canvas');
    this._baseCanvas.width = this.canvas.width;
    this._baseCanvas.height = this.canvas.height;
    this._baseCtx = this._baseCanvas.getContext('2d');
    this._baseKey = '';
  }

  scheduleRender() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.render();
    });
  }

  fit() {
    const city = this.state.patchedCity || this.state.city;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const consider = points => {
      if (!points?.length) return;
      const bounds = pointsBounds(points);
      if (bounds.minX < minX) minX = bounds.minX;
      if (bounds.maxX > maxX) maxX = bounds.maxX;
      if (bounds.minZ < minZ) minZ = bounds.minZ;
      if (bounds.maxZ > maxZ) maxZ = bounds.maxZ;
    };
    for (const b of city.buildings || []) consider(b.poly);
    for (const a of city.areas || []) consider(a.poly);
    for (const r of city.roads || []) consider(r.pts);
    for (const w of city.waterways || []) consider(w.pts);
    for (const r of city.railways || []) consider(r.pts);
    if (!Number.isFinite(minX)) { minX = -1600; maxX = 1800; minZ = -1600; maxZ = 1800; }
    const pad = 80;
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxZ - minZ);
    this.center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width || 900;
    this.h = rect.height || 600;
    this.scale = clamp(Math.min((this.w - pad * 2) / w, (this.h - pad * 2) / h), 0.15, 12);
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

  viewBounds(pad = 0) {
    const a = this.screenToWorld(-pad, -pad);
    const b = this.screenToWorld(this.w + pad, this.h + pad);
    return { minX: a.x, minZ: a.z, maxX: b.x, maxZ: b.z };
  }

  zoomBy(factor, sx = this.w / 2, sy = this.h / 2) {
    const before = this.screenToWorld(sx, sy);
    this.scale = clamp(this.scale * factor, 0.15, 12);
    const after = this.screenToWorld(sx, sy);
    this.center.x += before.x - after.x;
    this.center.z += before.z - after.z;
    this.scheduleRender();
    this.onStatus?.(this.screenToWorld(sx, sy), this.scale);
  }

  _bind() {
    const el = this.canvas;
    el.addEventListener('pointerdown', e => this._down(e));
    el.addEventListener('pointermove', e => this._move(e));
    el.addEventListener('pointerup', e => this._up(e));
    el.addEventListener('pointercancel', e => this._up(e));
    el.addEventListener('pointerleave', () => {
      if (this.dragging || this.panning || this.vertexDrag) return;
      this.hover = null;
      this.scheduleRender();
    });
    el.addEventListener('wheel', e => this._wheel(e), { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  isDrawingMode() {
    return !!DRAW_MODES[this.mode];
  }

  _snapWorld(world) {
    const snap = Number(this.snap) || 0;
    return {
      x: snap ? Math.round(world.x / snap) * snap : world.x,
      z: snap ? Math.round(world.z / snap) * snap : world.z
    };
  }

  _startDrawing(mode, world) {
    const spec = DRAW_MODES[mode];
    this.drawing = { mode, kind: spec.kind, points: [[+world.x.toFixed(2), +world.z.toFixed(2)]], cursor: [world.x, world.z] };
    this.activeVertex = null;
    this._notifyDrawing();
    this.scheduleRender();
  }

  _notifyDrawing() {
    if (!this.onDrawing) return;
    if (!this.drawing) { this.onDrawing(null); return; }
    const spec = DRAW_MODES[this.drawing.mode];
    this.onDrawing({
      mode: this.drawing.mode,
      kind: this.drawing.kind,
      label: spec?.label || '',
      count: this.drawing.points.length,
      min: spec?.min || 2
    });
  }

  _drawClick(p, e) {
    const now = performance.now();
    const last = this._lastDrawClick;
    if (last && now - last.t < 340 && Math.hypot(p.x - last.x, p.y - last.y) < 7) {
      this.finishDrawing();
      return;
    }
    const world = this._snapWorld(this.screenToWorld(p.x, p.y));
    if (!this.drawing) {
      this._startDrawing(this.mode, world);
      this._lastDrawClick = { t: now, x: p.x, y: p.y };
      return;
    }
    const spec = DRAW_MODES[this.drawing.mode];
    const first = this.drawing.points[0];
    if (spec.min === 3 && this.drawing.points.length >= 3) {
      const firstScreen = this.worldToScreen(first[0], first[1]);
      if (Math.hypot(p.x - firstScreen.x, p.y - firstScreen.y) < 11) {
        this.finishDrawing();
        return;
      }
    }
    this.drawing.points.push([+world.x.toFixed(2), +world.z.toFixed(2)]);
    this.drawing.cursor = [world.x, world.z];
    this._lastDrawClick = { t: now, x: p.x, y: p.y };
    this._notifyDrawing();
    this.scheduleRender();
  }

  finishDrawing() {
    if (!this.drawing) return false;
    const spec = DRAW_MODES[this.drawing.mode];
    if (this.drawing.points.length < spec.min) {
      this.onDrawing?.({
        ...this.drawing,
        label: spec.label,
        count: this.drawing.points.length,
        min: spec.min,
        error: `Servono almeno ${spec.min} punti`
      });
      return false;
    }
    const feature = this.state.addCustomFeature(this.drawing.kind, this.drawing.points);
    if (!feature) {
      this.onDrawing?.({
        ...this.drawing,
        label: spec.label,
        count: this.drawing.points.length,
        min: spec.min,
        error: 'Geometria non valida: sposta i punti e riprova'
      });
      return false;
    }
    this.drawing = null;
    this._lastDrawClick = null;
    this.mode = 'select';
    this._notifyDrawing();
    this.onChange?.({ final: true });
    this.scheduleRender();
    return true;
  }

  cancelDrawing() {
    if (!this.drawing) return false;
    this.drawing = null;
    this._lastDrawClick = null;
    this.mode = 'select';
    this._notifyDrawing();
    this.onChange?.({ final: true });
    this.scheduleRender();
    return true;
  }

  undoDrawingPoint() {
    if (!this.drawing?.points?.length) return false;
    this.drawing.points.pop();
    if (!this.drawing.points.length) {
      this.drawing = null;
      this.mode = 'select';
    } else {
      const last = this.drawing.points[this.drawing.points.length - 1];
      this.drawing.cursor = [last[0], last[1]];
    }
    this._notifyDrawing();
    this.scheduleRender();
    return true;
  }

  _eventPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _hitVertex(sx, sy) {
    const selection = this.state.selection;
    if (!selection || !this.state.isMapKind(selection.kind)) return null;
    const points = this.state.getFeatureGeometry(selection.kind, selection.id);
    if (!points) return null;
    for (let i = 0; i < points.length; i++) {
      const screen = this.worldToScreen(points[i][0], points[i][1]);
      if (Math.hypot(sx - screen.x, sy - screen.y) <= 9) return { index: i, x: points[i][0], z: points[i][1] };
    }
    return null;
  }

  _down(e) {
    const p = this._eventPoint(e);
    this.last = p;
    if (this.isDrawingMode()) {
      this._drawClick(p, e);
      return;
    }
    if (this.mode === 'addPlace') {
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      const ll = this._unproject(world.x, world.z);
      this.state.addPlace(ll.lat, ll.lon);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'addStar') {
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      this.state.addStar(world.x, world.z);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'addProp') {
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      this.state.addProp(this.pendingPropType || 'sign', world.x, world.z);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'addMissionStep') {
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      this.state.addMissionStep(this.pendingMissionId, world.x, world.z);
      this.mode = 'select';
      this.onChange?.({ final: true });
      return;
    }
    if (this.mode === 'paintMaterial') {
      const hit = this.hitTest(p.x, p.y);
      if (hit && ['building', 'road', 'area', 'waterway'].includes(hit.kind)) {
        this.onPaintMaterial?.(hit);
      }
      return;
    }
    if (this.mode === 'pan' || e.button === 1 || e.button === 2 || e.shiftKey || this.spacePan) {
      this.panning = true;
      this.canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    const vertex = this._hitVertex(p.x, p.y);
    if (vertex) {
      this.activeVertex = vertex.index;
      this.vertexDrag = { index: vertex.index, moved: false };
      this.canvas.setPointerCapture?.(e.pointerId);
      this.scheduleRender();
      return;
    }

    const selection = this.state.selection;
    if (e.altKey && selection && this.state.isMapKind(selection.kind)) {
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      const inserted = this.state.insertNearestVertex(selection.kind, selection.id, world.x, world.z);
      if (inserted !== false) {
        this.activeVertex = inserted;
        this.state.refresh();
        this.onChange?.({ final: true });
        this.scheduleRender();
      }
      return;
    }

    const hit = this.hitTest(p.x, p.y);
    if (hit) {
      this.state.select(hit);
      this.activeVertex = null;
      this.dragging = true;
      this.dragMoved = false;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.onChange?.({ final: true });
      return;
    }
    this.activeVertex = null;
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
      this.scheduleRender();
      return;
    }
    if (this.vertexDrag) {
      if (!this.vertexDrag.moved) {
        this.state.pushUndo('modifica vertice');
        this.vertexDrag.moved = true;
      }
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      this.state.setFeatureVertex(this.state.selection.kind, this.state.selection.id, this.vertexDrag.index, world.x, world.z);
      this.state.previewRefresh();
      this.dragMoved = true;
      this.onStatus?.(this.screenToWorld(p.x, p.y), this.scale);
      this.scheduleRender();
      return;
    }
    if (this.dragging) {
      if (!this.dragMoved) this.state.pushUndo('sposta elemento');
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      this.state.setSelectionPosition(world.x, world.z);
      this.state.previewRefresh();
      this.dragMoved = true;
      this.onStatus?.(world, this.scale);
      this.scheduleRender();
      return;
    }
    if (this.drawing) {
      const world = this._snapWorld(this.screenToWorld(p.x, p.y));
      this.drawing.cursor = [world.x, world.z];
      this.onStatus?.(world, this.scale);
      this.scheduleRender();
      return;
    }
    const hit = this.hitTest(p.x, p.y);
    const changed = JSON.stringify(hit) !== JSON.stringify(this.hover);
    this.hover = hit;
    this.onStatus?.(this.screenToWorld(p.x, p.y), this.scale);
    if (changed) this.scheduleRender();
    const placing = this.isDrawingMode() || ['addPlace', 'addStar', 'addProp', 'addMissionStep'].includes(this.mode);
    const vertex = this._hitVertex(p.x, p.y);
    this.canvas.style.cursor = placing || this.mode === 'pan'
      ? (this.mode === 'pan' && !this.panning ? 'grab' : 'crosshair')
      : vertex ? 'pointer'
        : hit ? (this.dragging ? 'grabbing' : 'grab')
          : (this.panning ? 'grabbing' : 'default');
  }

  _up(e) {
    if (this.vertexDrag) {
      const moved = this.vertexDrag.moved;
      this.vertexDrag = null;
      if (moved) this.state.refresh();
      this.onChange?.({ final: true });
    } else if (this.dragging) {
      const moved = this.dragMoved;
      this.dragging = false;
      if (moved) this.state.refresh();
    }
    this.dragging = false;
    this.panning = false;
    this.last = null;
    this.onChange?.({ final: true });
    this.scheduleRender();
  }

  _wheel(e) {
    e.preventDefault();
    const p = this._eventPoint(e);
    const factor = Math.exp(-e.deltaY * 0.0012);
    this.zoomBy(factor, p.x, p.y);
  }

  _visible(item) {
    if (!item) return false;
    const layers = this.layers;
    if (item.kind === 'building') return layers.buildings;
    if (item.kind === 'road') return layers.roads;
    if (item.kind === 'area') return layers.areas || (item.areaKind === 'water' && layers.water);
    if (item.kind === 'waterway') return layers.water;
    if (item.kind === 'railway') return layers.rail;
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

    const index = this._ensureIndex();
    if (this.layers.buildings) {
      let best = null;
      for (const { data: building } of index.buildings.queryPoint(world.x, world.z)) {
        if (!pointInPoly(world.x, world.z, building.poly)) continue;
        if (!best || building.area < best.area) best = building;
      }
      if (best) return { kind: 'building', id: String(best.id), custom: !!best._custom };
    }
    if (this.layers.roads) {
      let best = null;
      for (const { data: road } of index.roads.queryPoint(world.x, world.z)) {
        const distance = distanceToPolyline(world.x, world.z, road.pts);
        const threshold = Math.max(5 / this.scale, (Number(road.w) || 5) / 2);
        if (distance < threshold && (!best || distance < best.distance)) best = { item: road, distance };
      }
      if (best) return { kind: 'road', id: String(best.item.id), custom: !!best.item._custom };
    }
    if (this.layers.areas || this.layers.water) {
      let best = null;
      for (const { data: area } of index.areas.queryPoint(world.x, world.z)) {
        if (area.kind === 'water' && !this.layers.water) continue;
        if (area.kind !== 'water' && !this.layers.areas) continue;
        if (!pointInPoly(world.x, world.z, area.poly)) continue;
        if (!best || area.area < best.area) best = area;
      }
      if (best) return { kind: 'area', id: String(best.id), custom: !!best._custom, areaKind: best.kind };
    }
    if (this.layers.water) {
      let best = null;
      for (const { data: water } of index.waterways.queryPoint(world.x, world.z)) {
        const distance = distanceToPolyline(world.x, world.z, water.pts);
        const threshold = Math.max(5 / this.scale, (Number(water.w) || 3) / 2);
        if (distance < threshold && (!best || distance < best.distance)) best = { item: water, distance };
      }
      if (best) return { kind: 'waterway', id: String(best.item.id), custom: !!best.item._custom };
    }
    if (this.layers.rail) {
      let best = null;
      for (const { data: rail } of index.railways.queryPoint(world.x, world.z)) {
        const distance = distanceToPolyline(world.x, world.z, rail.pts);
        const threshold = Math.max(5 / this.scale, (Number(rail.w) || 3) / 2);
        if (distance < threshold && (!best || distance < best.distance)) best = { item: rail, distance };
      }
      if (best) return { kind: 'railway', id: String(best.item.id), custom: !!best.item._custom };
    }
    return null;
  }

  _ensureIndex() {
    const city = this.state.patchedCity;
    if (this._index && this._indexedCity === city) return this._index;
    const build = (group, polygon) => {
      const index = new SpatialIndex(120);
      for (const item of city[group] || []) {
        const points = polygon ? item.poly : item.pts;
        if (!points?.length) continue;
        const bbox = pointsBounds(points);
        if (!Number.isFinite(bbox.minX)) continue;
        index.add(item, bbox);
      }
      return index;
    };
    this._index = {
      buildings: build('buildings', true),
      roads: build('roads', false),
      areas: build('areas', true),
      waterways: build('waterways', false),
      railways: build('railways', false)
    };
    this._indexedCity = city;
    return this._index;
  }

  _queryVisible(index) {
    const bounds = this.viewBounds(8);
    return index.queryRect(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ);
  }

  _renderBase(ctx) {
    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#e7dfcf';
    ctx.fillRect(0, 0, this.w, this.h);
    this._drawTiles(ctx);
    this._drawGrid(ctx);
    this._drawAreas(ctx);
    this._drawWater(ctx);
    this._drawRail(ctx);
    this._drawRoads(ctx);
    this._drawBuildings(ctx);
  }

  _baseCacheKey() {
    const layers = Object.entries(this.layers)
      .map(([key, value]) => `${key}:${value ? 1 : 0}`)
      .join(',');
    return [
      this.center.x.toFixed(2),
      this.center.z.toFixed(2),
      this.scale.toFixed(4),
      this.state.revision,
      this.tileLayer?.revision || 0,
      this.w,
      this.h,
      this.dpr || 1,
      layers
    ].join('|');
  }

  render() {
    if (!this.ctx) return;
    const started = performance.now();
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    if (!this._baseCanvas || this._baseCanvas.width !== this.canvas.width || this._baseCanvas.height !== this.canvas.height) {
      this._makeBaseCanvas();
    }
    const key = this._baseCacheKey();
    if (key !== this._baseKey) {
      this._renderBase(this._baseCtx);
      this._baseKey = key;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this._baseCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._drawTransit(ctx);
    this._drawSelectedOriginal(ctx);
    this._drawMissionPath(ctx);
    this._drawMarkers(ctx);
    this._drawDrawing(ctx);
    this._drawFeatureHandles(ctx);
    this._drawScale(ctx);
    this.lastRenderMs = +(performance.now() - started).toFixed(1);
  }

  _updateTransit() {
    const ids = ['stazione', 'piazza-duomo', 'teatro', 'granmadre'];
    const stops = ids.map(id => this.state.compiled.places.find(p => p.id === id)).filter(Boolean)
      .map(p => ({ id: p.id, name: p.short || p.name, x: p.beaconX ?? p.x, z: p.beaconZ ?? p.z }));
    const signature = `${stops.map(p => `${p.id}:${p.x.toFixed(1)}:${p.z.toFixed(1)}`).join('|')}|roads:${this.state.patchedCity.roads?.length || 0}|data:${this.state.dataRevision}`;
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

  _drawTiles(ctx) {
    if (!this.layers.tiles) return;
    if (this.tileLayer) {
      this.tileLayer.draw(ctx, {
        scale: this.scale,
        width: this.w,
        height: this.h,
        worldToScreen: (x, z) => this.worldToScreen(x, z)
      });
      return;
    }
    if (!this.tileImage) return;
    const bounds = WORLD.bounds;
    const tl = this.worldToScreen(bounds.minX, bounds.minZ);
    const br = this.worldToScreen(bounds.maxX, bounds.maxZ);
    const dw = br.x - tl.x;
    const dh = br.y - tl.y;
    if (dw <= 0 || dh <= 0) return;
    const x0 = Math.max(0, tl.x);
    const y0 = Math.max(0, tl.y);
    const x1 = Math.min(this.w, br.x);
    const y1 = Math.min(this.h, br.y);
    if (x1 <= x0 || y1 <= y0) return;
    const image = this.tileImage;
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih) return;
    const u0 = (x0 - tl.x) / dw;
    const v0 = (y0 - tl.y) / dh;
    const u1 = (x1 - tl.x) / dw;
    const v1 = (y1 - tl.y) / dh;
    const sx = Math.max(0, Math.floor(u0 * iw));
    const sy = Math.max(0, Math.floor(v0 * ih));
    const sw = Math.min(iw - sx, Math.ceil((u1 - u0) * iw));
    const sh = Math.min(ih - sy, Math.ceil((v1 - v0) * ih));
    if (sw <= 0 || sh <= 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = this.scale < 2;
    ctx.drawImage(image, sx, sy, sw, sh, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }

  _blockForArea(area) {
    const info = this.arnis?.areas?.[String(area.id)];
    return area.blocks?.surface || info?.surface || AREA_BLOCK_FALLBACK[area.kind] || 'grass_block';
  }

  _blockForRoad(road) {
    const info = this.arnis?.roads?.[String(road.id)];
    return roadSurfaceBlock({
      kind: road.kind,
      source: info?.surface,
      override: road.blocks?.surface
    });
  }

  _blockForBuilding(building, slot = 'roof') {
    const info = this.arnis?.buildings?.[String(building.id)];
    if (slot === 'wall') return building.blocks?.wall || building.blocks?.wallLower || info?.wallLower || info?.wall || wallFallbackBlock(building);
    if (slot === 'glass') return building.blocks?.glass || info?.glass || 'glass';
    return building.blocks?.roof || info?.roof || roofFallbackBlock(building);
  }

  _fillBlock(ctx, block, alpha = 1) {
    const key = blockKey(block);
    if (this.scale >= 3.5) {
      const pattern = createBlockPattern(ctx, key, { blockPixels: Math.max(8, 2 * this.scale) });
      if (pattern) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pattern;
        return;
      }
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = blockColor(key);
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
    if ((this.layers.blockGrid || this.snap === 2) && this.scale > 0.7) {
      const blockStep = 2;
      ctx.strokeStyle = 'rgba(47,74,60,.16)';
      ctx.lineWidth = 1;
      for (let x = Math.floor(topLeft.x / blockStep) * blockStep; x < bottomRight.x; x += blockStep) {
        const p = this.worldToScreen(x, 0);
        ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, this.h); ctx.stroke();
      }
      for (let z = Math.floor(topLeft.z / blockStep) * blockStep; z < bottomRight.z; z += blockStep) {
        const p = this.worldToScreen(0, z);
        ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(this.w, p.y); ctx.stroke();
      }
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
    const index = this._ensureIndex();
    ctx.save();
    let visible = 0;
    for (const { data: area } of this._queryVisible(index.areas)) {
      if (area.kind === 'water') continue;
      this._polyPath(ctx, area.poly);
      const alpha = this.layers.tiles ? (area._custom ? 0.48 : 0.26) : (area._custom ? 0.62 : 0.55);
      this._fillBlock(ctx, this._blockForArea(area), alpha);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (area._custom) {
        ctx.strokeStyle = 'rgba(201,154,58,.75)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (this._isSelected('area', area.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      visible++;
    }
    this.visibleCount = visible;
    ctx.restore();
  }

  _drawWater(ctx) {
    if (!this.layers.water) return;
    const index = this._ensureIndex();
    ctx.save();
    for (const { data: area } of this._queryVisible(index.areas)) {
      if (area.kind !== 'water') continue;
      this._polyPath(ctx, area.poly);
      const waterBlock = area.blocks?.surface || 'water';
      this._fillBlock(ctx, waterBlock, this.layers.tiles ? 0.5 : 0.85);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (area._custom) {
        ctx.strokeStyle = 'rgba(201,154,58,.75)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (this._isSelected('area', area.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    for (const { data: water } of this._queryVisible(index.waterways)) {
      this._linePath(ctx, water.pts);
      const width = Number(water.w) || (water.kind === 'river' ? 9 : water.kind === 'stream' ? 5 : water.kind === 'canal' ? 4 : 3);
      ctx.strokeStyle = blockColor(water.blocks?.surface || 'water');
      ctx.globalAlpha = this.layers.tiles ? 0.6 : 0.9;
      ctx.lineWidth = Math.max(1.5, width * this.scale);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (water._custom) {
        ctx.strokeStyle = 'rgba(201,154,58,.55)';
        ctx.lineWidth = Math.max(1, (width + 2) * this.scale);
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (this._isSelected('waterway', water.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = Math.max(2, (width + 3) * this.scale);
        ctx.globalAlpha = 0.55;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  _drawRail(ctx) {
    if (!this.layers.rail) return;
    const index = this._ensureIndex();
    ctx.save();
    ctx.strokeStyle = '#766f62';
    ctx.lineWidth = Math.max(1, 2.5 * this.scale);
    ctx.setLineDash([6, 4]);
    for (const { data: rail } of this._queryVisible(index.railways)) {
      this._linePath(ctx, rail.pts);
      ctx.stroke();
      if (this._isSelected('railway', rail.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = Math.max(2, ((Number(rail.w) || 3) + 3) * this.scale);
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#766f62';
        ctx.lineWidth = Math.max(1, 2.5 * this.scale);
      }
    }
    ctx.restore();
  }

  _drawRoads(ctx) {
    if (!this.layers.roads) return;
    const index = this._ensureIndex();
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const { data: road } of this._queryVisible(index.roads)) {
      this._linePath(ctx, road.pts);
      ctx.strokeStyle = '#a09483';
      ctx.lineWidth = Math.max(1.2, ((Number(road.w) || 5) + 2.2) * this.scale);
      ctx.stroke();
      ctx.strokeStyle = blockColor(this._blockForRoad(road));
      ctx.globalAlpha = this.layers.tiles ? 0.9 : 1;
      ctx.lineWidth = Math.max(1, (Number(road.w) || 5) * this.scale);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (road._custom) {
        ctx.strokeStyle = 'rgba(201,154,58,.5)';
        ctx.lineWidth = Math.max(1, ((Number(road.w) || 5) + 2) * this.scale);
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (this._isSelected('road', road.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = Math.max(2, ((Number(road.w) || 5) + 3) * this.scale);
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  _drawBuildings(ctx) {
    if (!this.layers.buildings) return;
    const index = this._ensureIndex();
    ctx.save();
    for (const { data: building } of this._queryVisible(index.buildings)) {
      this._polyPath(ctx, building.poly);
      this._fillBlock(ctx, this._blockForBuilding(building, 'roof'), this.layers.tiles ? 0.68 : 0.92);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = building._custom ? 'rgba(201,154,58,.8)' : 'rgba(90,72,52,.45)';
      ctx.lineWidth = building._custom ? 1.2 : 0.6;
      if (building._custom) ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (this._isSelected('building', building.id)) {
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawSelectedOriginal(ctx) {
    const selection = this.state.selection;
    if (!selection || !this.state.isMapKind(selection.kind) || selection.custom) return;
    const group = featureGroup(selection.kind);
    const original = this.state.city[group]?.find(item => String(item.id) === String(selection.id));
    if (!original) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(194,104,75,.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    if (isLineKind(selection.kind)) this._linePath(ctx, original.pts);
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

  _drawDrawing(ctx) {
    if (!this.drawing) return;
    const spec = DRAW_MODES[this.drawing.mode];
    if (!spec) return;
    const points = this.drawing.points;
    const cursor = this.drawing.cursor || points[points.length - 1];
    const color = this.drawing.kind === 'building' ? '#8a5f3d'
      : this.drawing.kind === 'area' ? '#4f7748'
        : this.drawing.kind === 'waterway' ? '#4f8fa8'
          : this.drawing.kind === 'railway' ? '#766f62' : '#9a4a34';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = this.worldToScreen(point[0], point[1]);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    const end = this.worldToScreen(cursor[0], cursor[1]);
    ctx.lineTo(end.x, end.y);
    if (spec.min === 3) {
      const first = this.worldToScreen(points[0][0], points[0][1]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (points.length >= 3 && Math.hypot(end.x - first.x, end.y - first.y) < 11) {
        ctx.beginPath();
        ctx.arc(first.x, first.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#c2684b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, (this.drawing.kind === 'road' ? 7 : 3) * this.scale);
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    points.forEach((point, index) => {
      const screen = this.worldToScreen(point[0], point[1]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, index === 0 ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? '#c2684b' : '#fff8e8';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  _drawFeatureHandles(ctx) {
    const selection = this.state.selection;
    if (!selection || !this.state.isMapKind(selection.kind)) return;
    const points = this.state.getFeatureGeometry(selection.kind, selection.id);
    if (!points?.length) return;
    if (this.activeVertex != null && this.activeVertex >= points.length) this.activeVertex = null;
    ctx.save();
    const closed = !isLineKind(selection.kind);
    if (closed) {
      this._polyPath(ctx, points);
      ctx.strokeStyle = 'rgba(194,104,75,.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const count = closed ? points.length : points.length - 1;
    if (this.scale > 0.22) {
      for (let i = 0; i < count; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const m = this.worldToScreen((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(194,104,75,.45)';
        ctx.fill();
      }
    }
    for (let i = 0; i < points.length; i++) {
      const screen = this.worldToScreen(points[i][0], points[i][1]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, i === this.activeVertex ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = i === this.activeVertex ? '#c2684b' : '#fff8e8';
      ctx.fill();
      ctx.strokeStyle = i === this.activeVertex ? '#7a2f20' : '#2f4a3c';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
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
