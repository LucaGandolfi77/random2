import { compileMap } from '../../js/map-compiler.js';
import { applyOverrides } from '../../js/map-overrides.js';
import { validateMap } from '../../js/map-validate.js';
import { project, unproject, polygonCentroid } from './geo.js';
import {
  FEATURE_GROUP, FEATURE_LABEL, featureGroup, featureLabel, isLineKind,
  pointsFor, normalizePoints, lineLength, translatePoints,
  rotatePoints, midpoint, simplifyPoints, reversePoints, nearestSegment
} from './geometry.js';

export const DRAFT_KEY = 'fidenza-map-draft-v2';
const clone = value => JSON.parse(JSON.stringify(value));
const EMPTY_CUSTOM = { buildings: [], roads: [], areas: [], waterways: [], railways: [] };
const MAP_KINDS = new Set(Object.keys(FEATURE_GROUP));

function round(value) {
  return +Number(value || 0).toFixed(2);
}

function featureMeta(kind, points, extra = {}) {
  const clean = normalizePoints(points);
  if (isLineKind(kind)) {
    const mid = midpoint(clean);
    return {
      ...extra,
      pts: clean,
      length: lineLength(clean),
      x: round(mid.x),
      z: round(mid.z)
    };
  }
  const [x, z] = polygonCentroid(clean);
  return {
    ...extra,
    poly: clean,
    x: round(x),
    z: round(z),
    area: +Math.abs((() => {
      let area = 0;
      for (let i = 0, j = clean.length - 1; i < clean.length; j = i++) {
        area += clean[j][0] * clean[i][1] - clean[i][0] * clean[j][1];
      }
      return area / 2;
    })()).toFixed(1)
  };
}

export class EditorState {
  constructor({ map, city, mapPath = '../maps/fidenza/map.json' }) {
    this.map = clone(map);
    this.original = clone(map);
    this.city = city;
    this.mapPath = mapPath;
    this.origin = this.map.origin || this.map.center;
    this.undoStack = [];
    this.redoStack = [];
    this.selection = null;
    this.dirty = false;
    this.listeners = new Set();
    this.revision = 0;
    this.dataRevision = 0;
    this._refresh();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }

  // ── feature helpers ────────────────────────────────────────────────────

  isMapKind(kind) { return MAP_KINDS.has(kind); }

  customGroup(kind) { return featureGroup(kind); }

  customList(kind) {
    const group = featureGroup(kind);
    return group ? (this.map.custom?.[group] || []) : [];
  }

  sourceList(kind) {
    const group = featureGroup(kind);
    return group ? (this.city?.[group] || []) : [];
  }

  patchedList(kind) {
    const group = featureGroup(kind);
    return group ? (this.patchedCity?.[group] || []) : [];
  }

  customFeature(kind, id) {
    return this.customList(kind).find(item => String(item.id) === String(id)) || null;
  }

  sourceFeature(kind, id) {
    return this.sourceList(kind).find(item => String(item.id) === String(id)) || null;
  }

  patchedFeature(kind, id) {
    return this.patchedList(kind).find(item => String(item.id) === String(id)) || null;
  }

  feature(kind, id) {
    return this.patchedFeature(kind, id) || this.customFeature(kind, id) || this.sourceFeature(kind, id);
  }

  getFeatureGeometry(kind, id) {
    const item = this.patchedFeature(kind, id) || this.customFeature(kind, id) || this.sourceFeature(kind, id);
    if (!item) return null;
    return (pointsFor(kind, item) || []).map(point => [Number(point[0]), Number(point[1])]);
  }

  selectionGeometry() {
    const selection = this.selection;
    if (!selection || !this.isMapKind(selection.kind)) return null;
    return this.getFeatureGeometry(selection.kind, selection.id);
  }

  get selectedCustom() {
    return !!this.selection?.custom;
  }

  _updateCustomMeta(kind, item) {
    const points = pointsFor(kind, item);
    if (!points) return;
    item._meta = featureMeta(kind, points);
    if (isLineKind(kind)) {
      item.x = item._meta.x;
      item.z = item._meta.z;
      item.length = item._meta.length;
    } else {
      item.x = item._meta.x;
      item.z = item._meta.z;
      item.area = item._meta.area;
    }
    delete item._meta;
  }

  _writeGeometry(kind, id, points, custom) {
    const clean = normalizePoints(points);
    if (custom) {
      const item = this.customFeature(kind, id);
      if (!item) return false;
      if (isLineKind(kind)) item.pts = clean;
      else item.poly = clean;
      this._updateCustomMeta(kind, item);
      this.dirty = true;
      return true;
    }
    const group = featureGroup(kind);
    if (!group) return false;
    this.map.overrides ||= {};
    this.map.overrides[group] ||= {};
    const override = this.map.overrides[group][String(id)] ||= {};
    if (isLineKind(kind)) override.pts = clean;
    else override.poly = clean;
    // La geometria assoluta sostituisce le trasformazioni relative.
    delete override.moveX;
    delete override.moveZ;
    delete override.rotate;
    delete override.scale;
    this.dirty = true;
    return true;
  }

  // ── refresh / history ─────────────────────────────────────────────────

  selectionExists() {
    const selection = this.selection;
    if (!selection) return true;
    if (selection.kind === 'place' || selection.kind === 'beacon') return !!this.place(selection.id);
    if (selection.kind === 'landmark') return !!this.landmark(selection.id);
    if (selection.kind === 'star') return !!this.star(selection.id);
    if (selection.kind === 'mission') return !!this.mission(selection.id);
    if (selection.kind === 'missionStep') return !!this.mission(selection.id)?.steps?.[selection.index];
    if (selection.kind === 'vehicle') return !!this.vehicle(selection.index);
    if (selection.kind === 'prop') return !!this.prop(selection.id);
    if (selection.kind === 'spawn') return !!this.map.spawn;
    if (selection.kind === 'missionBoard') return !!this.map.missionBoard;
    if (this.isMapKind(selection.kind)) {
      return selection.custom
        ? !!this.customFeature(selection.kind, selection.id)
        : !!this.sourceFeature(selection.kind, selection.id);
    }
    return true;
  }

  _refresh({ validate = true, emit = true } = {}) {
    if (!this.selectionExists()) this.selection = null;
    if (validate) {
      const validation = validateMap(this.map, this.city);
      this.validation = validation;
      this.patchedCity = validation.patchedCity;
      this.compiled = validation.compiled;
    } else {
      this.patchedCity = applyOverrides(this.city, this.map.overrides || {}, this.map.custom || {});
      const geometrySelection = this.isMapKind(this.selection?.kind);
      if (!geometrySelection) this.compiled = compileMap(this.map, this.patchedCity);
    }
    this.revision++;
    if (validate) this.dataRevision++;
    if (emit) this.emit();
  }

  refresh() { this._refresh(); }

  /**
   * Aggiornamento leggero usato durante il drag: niente validazione completa.
   * Per le geometrie non ricompila nemmeno i marker, che non cambiano.
   */
  previewRefresh() {
    this.patchedCity = applyOverrides(this.city, this.map.overrides || {}, this.map.custom || {});
    if (!this.isMapKind(this.selection?.kind)) {
      this.compiled = compileMap(this.map, this.patchedCity);
    }
    this.revision++;
  }

  snapshot() { return JSON.stringify(this.map); }

  pushUndo(label = 'modifica') {
    this.undoStack.push({ label, data: this.snapshot() });
    if (this.undoStack.length > 120) this.undoStack.shift();
    this.redoStack = [];
    this.dirty = true;
  }

  commit(label, fn) {
    this.pushUndo(label);
    fn(this.map);
    this._refresh();
  }

  undo() {
    const item = this.undoStack.pop();
    if (!item) return false;
    this.redoStack.push({ label: item.label, data: this.snapshot() });
    this.map = JSON.parse(item.data);
    this.dirty = true;
    this._refresh();
    return true;
  }

  redo() {
    const item = this.redoStack.pop();
    if (!item) return false;
    this.undoStack.push({ label: item.label, data: this.snapshot() });
    this.map = JSON.parse(item.data);
    this.dirty = true;
    this._refresh();
    return true;
  }

  reset(map = this.original) {
    this.map = clone(map);
    this.original = clone(map);
    this.undoStack = [];
    this.redoStack = [];
    this.selection = null;
    this.dirty = false;
    this._refresh();
  }

  get originDef() { return this.map.origin || this.map.center; }

  // ── entity lookup ──────────────────────────────────────────────────────

  place(id) { return (this.map.places || []).find(place => place.id === id); }
  landmark(id) { return (this.map.landmarks || []).find(landmark => landmark.id === id); }
  star(id) { return (this.map.stars || []).find(star => star.id === id); }
  mission(id) { return (this.map.missions || []).find(mission => mission.id === id); }
  vehicle(index) { return (this.map.vehicles || [])[index]; }
  prop(id) { return (this.map.props || []).find(prop => prop.id === id); }

  get selectedData() {
    const selection = this.selection;
    if (!selection) return null;
    if (selection.kind === 'place') return this.place(selection.id);
    if (selection.kind === 'beacon') return this.place(selection.id);
    if (selection.kind === 'landmark') return this.landmark(selection.id);
    if (selection.kind === 'star') return this.star(selection.id);
    if (selection.kind === 'mission') return this.mission(selection.id);
    if (selection.kind === 'missionStep') return this.mission(selection.id)?.steps?.[selection.index];
    if (selection.kind === 'vehicle') return this.vehicle(selection.index);
    if (selection.kind === 'prop') return this.prop(selection.id);
    if (selection.kind === 'spawn') return this.map.spawn;
    if (selection.kind === 'missionBoard') return this.map.missionBoard;
    if (this.isMapKind(selection.kind)) {
      return selection.custom
        ? this.customFeature(selection.kind, selection.id)
        : this.patchedFeature(selection.kind, selection.id);
    }
    return null;
  }

  select(selection) {
    this.selection = selection;
    this.emit();
  }

  selectionAnchor() {
    const selection = this.selection;
    if (!selection) return null;
    if (selection.kind === 'place') {
      const place = this.compiled.places.find(item => item.id === selection.id);
      return place ? { x: place.x, z: place.z } : null;
    }
    if (selection.kind === 'beacon') {
      const place = this.compiled.places.find(item => item.id === selection.id);
      return place ? { x: place.beaconX ?? place.x, z: place.beaconZ ?? place.z } : null;
    }
    if (selection.kind === 'landmark') {
      const landmark = this.compiled.landmarks.find(item => item.id === selection.id);
      return landmark ? { x: landmark.x + (landmark.offsetX || 0), z: landmark.z + (landmark.offsetZ || 0) } : null;
    }
    if (selection.kind === 'star') {
      const star = this.compiled.stars.find(item => item.id === selection.id);
      return star ? { x: star.x, z: star.z } : null;
    }
    if (selection.kind === 'missionStep') {
      const mission = this.compiled.missions.find(item => item.id === selection.id);
      const step = mission?.steps?.[selection.index];
      return step ? { x: step.x, z: step.z } : null;
    }
    if (selection.kind === 'vehicle') {
      const vehicle = this.compiled.vehicles?.[selection.index];
      return vehicle ? { x: vehicle.x, z: vehicle.z } : null;
    }
    if (selection.kind === 'prop') {
      const prop = this.compiled.props?.find(item => item.id === selection.id);
      return prop ? { x: prop.x, z: prop.z } : null;
    }
    if (selection.kind === 'spawn') return this.map.spawn ? { x: this.map.spawn.x, z: this.map.spawn.z } : null;
    if (selection.kind === 'missionBoard') return this.map.missionBoard ? { x: this.map.missionBoard.x, z: this.map.missionBoard.z } : null;
    if (this.isMapKind(selection.kind)) {
      const points = this.getFeatureGeometry(selection.kind, selection.id);
      if (!points?.length) return null;
      if (isLineKind(selection.kind)) return midpoint(points);
      const [x, z] = polygonCentroid(points);
      return { x, z };
    }
    return null;
  }

  // ── transforms ────────────────────────────────────────────────────────

  setSelectionPosition(x, z) {
    const selection = this.selection;
    if (!selection) return;
    if (selection.kind === 'place') {
      const place = this.place(selection.id);
      if (!place) return;
      const old = project(place.lat, place.lon, this.originDef);
      const xy = unproject(x, z, this.originDef);
      place.lat = +xy.lat.toFixed(7);
      place.lon = +xy.lon.toFixed(7);
      const dx = x - old.x, dz = z - old.z;
      if (place.beacon) {
        place.beacon.x = round(place.beacon.x + dx);
        place.beacon.z = round(place.beacon.z + dz);
      }
      for (const landmark of this.map.landmarks || []) {
        if (landmark.place === place.id) {
          landmark.offsetX = round((landmark.offsetX || 0) - dx);
          landmark.offsetZ = round((landmark.offsetZ || 0) - dz);
        }
      }
    } else if (selection.kind === 'beacon') {
      const place = this.place(selection.id);
      if (place) place.beacon = { x: round(x), z: round(z) };
    } else if (selection.kind === 'landmark') {
      const landmark = this.landmark(selection.id);
      const place = landmark ? this.place(landmark.place) : null;
      if (landmark && place) {
        const xy = project(place.lat, place.lon, this.originDef);
        landmark.offsetX = round(x - xy.x);
        landmark.offsetZ = round(z - xy.z);
      }
    } else if (selection.kind === 'star') {
      const star = this.star(selection.id);
      if (star) { star.x = round(x); star.z = round(z); }
    } else if (selection.kind === 'missionStep') {
      const mission = this.mission(selection.id);
      const step = mission?.steps?.[selection.index];
      if (step) {
        step.x = round(x);
        step.z = round(z);
        delete step.place;
        delete step.offsetX;
        delete step.offsetZ;
      }
    } else if (selection.kind === 'vehicle') {
      const vehicle = this.vehicle(selection.index);
      if (vehicle) { vehicle.x = round(x); vehicle.z = round(z); }
    } else if (selection.kind === 'prop') {
      const prop = this.prop(selection.id);
      if (prop) { prop.x = round(x); prop.z = round(z); }
    } else if (selection.kind === 'spawn') {
      if (this.map.spawn) { this.map.spawn.x = round(x); this.map.spawn.z = round(z); }
    } else if (selection.kind === 'missionBoard') {
      if (this.map.missionBoard) { this.map.missionBoard.x = round(x); this.map.missionBoard.z = round(z); }
    } else if (this.isMapKind(selection.kind)) {
      const anchor = this.selectionAnchor();
      if (!anchor) return;
      const dx = x - anchor.x, dz = z - anchor.z;
      if (!dx && !dz) return;
      if (selection.custom) {
        const item = this.customFeature(selection.kind, selection.id);
        const points = pointsFor(selection.kind, item);
        if (!item || !points) return;
        const moved = translatePoints(points, dx, dz);
        if (isLineKind(selection.kind)) item.pts = moved;
        else item.poly = moved;
        this._updateCustomMeta(selection.kind, item);
      } else {
        const group = featureGroup(selection.kind);
        this.map.overrides ||= {};
        this.map.overrides[group] ||= {};
        const override = this.map.overrides[group][String(selection.id)] ||= {};
        const absKey = isLineKind(selection.kind) ? 'pts' : 'poly';
        if (Array.isArray(override[absKey])) {
          override[absKey] = translatePoints(override[absKey], dx, dz);
        } else {
          override.moveX = round((override.moveX || 0) + dx);
          override.moveZ = round((override.moveZ || 0) + dz);
        }
      }
    }
    this.dirty = true;
  }

  nudgeSelection(dx, dz) {
    const anchor = this.selectionAnchor();
    if (!anchor) return false;
    this.pushUndo('sposta con tastiera');
    this.setSelectionPosition(anchor.x + dx, anchor.z + dz);
    this._refresh();
    return true;
  }

  rotateSelection(deg) {
    const selection = this.selection;
    if (!selection) return false;
    const anchor = this.selectionAnchor();
    if (this.isMapKind(selection.kind)) {
      if (!anchor) return false;
      this.pushUndo('ruota geometria');
      if (selection.custom) {
        const item = this.customFeature(selection.kind, selection.id);
        const points = pointsFor(selection.kind, item);
        if (!item || !points) return false;
        const rotated = rotatePoints(points, anchor.x, anchor.z, deg);
        if (isLineKind(selection.kind)) item.pts = rotated;
        else item.poly = rotated;
        this._updateCustomMeta(selection.kind, item);
      } else {
        const group = featureGroup(selection.kind);
        this.map.overrides ||= {};
        this.map.overrides[group] ||= {};
        const override = this.map.overrides[group][String(selection.id)] ||= {};
        if (Array.isArray(override.pts) || Array.isArray(override.poly)) {
          const key = isLineKind(selection.kind) ? 'pts' : 'poly';
          override[key] = rotatePoints(override[key], anchor.x, anchor.z, deg);
        } else {
          override.rotate = round((override.rotate || 0) + deg);
        }
      }
    } else if (selection.kind === 'landmark') {
      const landmark = this.landmark(selection.id);
      if (!landmark) return false;
      this.pushUndo('ruota landmark');
      landmark.rotation = round((landmark.rotation || 0) + deg);
    } else if (selection.kind === 'vehicle') {
      const vehicle = this.vehicle(selection.index);
      if (!vehicle) return false;
      this.pushUndo('ruota veicolo');
      vehicle.yaw = round((vehicle.yaw || 0) + deg);
    } else if (selection.kind === 'prop') {
      const prop = this.prop(selection.id);
      if (!prop) return false;
      this.pushUndo('ruota prop');
      prop.rotation = round((prop.rotation || 0) + deg);
    } else {
      return false;
    }
    this.dirty = true;
    this._refresh();
    return true;
  }

  // ── vertices / geometry ───────────────────────────────────────────────

  setFeatureVertex(kind, id, index, x, z) {
    const points = this.getFeatureGeometry(kind, id);
    if (!points || index < 0 || index >= points.length) return false;
    const next = points.map(point => [...point]);
    next[index] = [round(x), round(z)];
    return this._writeGeometry(kind, id, next, !!this.selection?.custom);
  }

  insertFeatureVertex(kind, id, segmentIndex, x, z) {
    const points = this.getFeatureGeometry(kind, id);
    if (!points?.length) return false;
    this.pushUndo('inserisci vertice');
    const next = points.map(point => [...point]);
    const at = Math.max(0, Math.min(next.length, segmentIndex + 1));
    next.splice(at, 0, [round(x), round(z)]);
    return this._writeGeometry(kind, id, next, !!this.selection?.custom) ? at : false;
  }

  insertNearestVertex(kind, id, x, z) {
    const points = this.getFeatureGeometry(kind, id);
    if (!points) return false;
    const segment = nearestSegment(points, x, z, !isLineKind(kind));
    if (!segment) return false;
    return this.insertFeatureVertex(kind, id, segment.index, segment.x, segment.z);
  }

  removeFeatureVertex(kind, id, index) {
    const points = this.getFeatureGeometry(kind, id);
    if (!points) return false;
    const minimum = isLineKind(kind) ? 2 : 3;
    if (points.length <= minimum || index < 0 || index >= points.length) return false;
    this.pushUndo('rimuovi vertice');
    const next = points.filter((_, i) => i !== index);
    return this._writeGeometry(kind, id, next, !!this.selection?.custom);
  }

  reverseFeature(kind, id, custom = !!this.selection?.custom) {
    const points = this.getFeatureGeometry(kind, id);
    if (!points) return false;
    this.pushUndo('inverti geometria');
    return this._writeGeometry(kind, id, reversePoints(points), custom);
  }

  simplifyFeature(kind, id, tolerance = 1.2, custom = !!this.selection?.custom) {
    const points = this.getFeatureGeometry(kind, id);
    if (!points) return false;
    const simplified = simplifyPoints(points, tolerance);
    const minimum = isLineKind(kind) ? 2 : 3;
    if (simplified.length < minimum) return false;
    this.pushUndo('semplifica geometria');
    return this._writeGeometry(kind, id, simplified, custom);
  }

  transformCustomGeometry(kind, id, points, label = 'modifica geometria') {
    this.pushUndo(label);
    this._writeGeometry(kind, id, points, true);
    this._refresh();
  }

  // ── custom features ───────────────────────────────────────────────────

  _defaultsFor(kind) {
    if (kind === 'road') {
      return { name: 'Nuova strada', kind: 'residential', w: 7, surface: 'asphalt', oneway: false, bridge: false, tunnel: false, sidewalk: true };
    }
    if (kind === 'area') return { name: 'Nuova area', kind: 'park', color: '#7c9a5c' };
    if (kind === 'building') return { name: 'Nuovo edificio', kind: 'building', h: 8, levels: 2, roof: 'gabled', color: '#d8c6ae' };
    if (kind === 'waterway') return { name: 'Nuovo corso d’acqua', kind: 'stream', w: 4 };
    if (kind === 'railway') return { name: 'Nuova ferrovia', kind: 'rail', w: 3.5, bridge: false };
    return {};
  }

  addCustomFeature(kind, points, extra = {}, label = `aggiungi ${featureLabel(kind)}`) {
    const group = featureGroup(kind);
    if (!group) return null;
    const clean = normalizePoints(points);
    if (clean.length < (isLineKind(kind) ? 2 : 3)) return null;
    this.pushUndo(label);
    this.map.custom ||= clone(EMPTY_CUSTOM);
    this.map.custom[group] ||= [];
    let id = extra.id || `custom-${kind}-${Date.now().toString(36)}`;
    const ids = new Set(this.map.custom[group].map(item => String(item.id)));
    let suffix = 2;
    while (ids.has(id)) id = `${id.replace(/-\d+$/, '')}-${suffix++}`;
    const defaults = this._defaultsFor(kind);
    const base = { id, ...defaults, ...extra };
    const item = isLineKind(kind)
      ? featureMeta(kind, clean, { ...base, pts: clean })
      : featureMeta(kind, clean, { ...base, poly: clean });
    if (isLineKind(kind)) delete item.poly;
    else delete item.pts;
    this.map.custom[group].push(item);
    this.selection = { kind, id, custom: true };
    this.dirty = true;
    this._refresh();
    return item;
  }

  setCustomFeature(kind, id, patch, label = 'modifica geometria') {
    const item = this.customFeature(kind, id);
    if (!item) return false;
    this.pushUndo(label);
    Object.assign(item, patch);
    if (patch.poly || patch.pts) this._updateCustomMeta(kind, item);
    this.dirty = true;
    this._refresh();
    return true;
  }

  duplicateSelection() {
    const selection = this.selection;
    if (!selection) return false;
    if (this.isMapKind(selection.kind)) {
      const points = this.getFeatureGeometry(selection.kind, selection.id);
      const item = this.feature(selection.kind, selection.id);
      if (!points || !item) return false;
      const offset = 4;
      const moved = translatePoints(points, offset, offset);
      const extra = {};
      for (const key of ['kind', 'w', 'width', 'surface', 'oneway', 'bridge', 'tunnel', 'sidewalk', 'h', 'height', 'levels', 'roof', 'color']) {
        if (item[key] != null) extra[key] = item[key];
      }
      extra.name = `${item.name || featureLabel(selection.kind)} copia`;
      const duplicate = this.addCustomFeature(selection.kind, moved, extra, 'duplica geometria');
      return !!duplicate;
    }
    if (selection.kind === 'place') {
      const place = this.place(selection.id);
      if (!place) return false;
      this.pushUndo('duplica POI');
      const xy = project(place.lat, place.lon, this.originDef);
      const ll = unproject(xy.x + 5, xy.z + 5, this.originDef);
      const id = `poi-${Date.now().toString(36)}`;
      this.map.places.push({
        ...clone(place),
        id,
        name: `${place.name} copia`,
        short: `${place.short || place.name} copia`,
        lat: +ll.lat.toFixed(7),
        lon: +ll.lon.toFixed(7),
        osm: undefined,
        collectible: false,
        beacon: undefined
      });
      this.selection = { kind: 'place', id };
      this.dirty = true;
      this._refresh();
      return true;
    }
    if (selection.kind === 'landmark') {
      const landmark = this.landmark(selection.id);
      if (!landmark) return false;
      this.pushUndo('duplica landmark');
      const id = `lm-${Date.now().toString(36)}`;
      this.map.landmarks.push({ ...clone(landmark), id, offsetX: (landmark.offsetX || 0) + 5, offsetZ: (landmark.offsetZ || 0) + 5 });
      this.selection = { kind: 'landmark', id };
      this.dirty = true;
      this._refresh();
      return true;
    }
    if (selection.kind === 'star') {
      const star = this.star(selection.id);
      if (!star) return false;
      this.pushUndo('duplica stella');
      const id = `star-${Date.now().toString(36)}`;
      this.map.stars.push({ id, x: round(star.x + 4), z: round(star.z + 4) });
      this.selection = { kind: 'star', id };
      this.dirty = true;
      this._refresh();
      return true;
    }
    if (selection.kind === 'mission') {
      const mission = this.mission(selection.id);
      if (!mission) return false;
      this.pushUndo('duplica missione');
      const id = `mission-${Date.now().toString(36)}`;
      this.map.missions.push({
        ...clone(mission),
        id,
        title: `${mission.title || mission.id} copia`,
        steps: (mission.steps || []).map(step => ({ ...clone(step), x: round((step.x || 0) + 4), z: round((step.z || 0) + 4) }))
      });
      this.selection = { kind: 'mission', id };
      this.dirty = true;
      this._refresh();
      return true;
    }
    if (selection.kind === 'missionStep') {
      const mission = this.mission(selection.id);
      const step = mission?.steps?.[selection.index];
      if (!step) return false;
      return !!this.addMissionStep(mission.id, (step.x || 0) + 4, (step.z || 0) + 4);
    }
    if (selection.kind === 'vehicle') {
      const vehicle = this.vehicle(selection.index);
      if (!vehicle) return false;
      this.pushUndo('duplica veicolo');
      this.map.vehicles.push({ ...clone(vehicle), x: round((vehicle.x || 0) + 4), z: round((vehicle.z || 0) + 4), label: `${vehicle.label || vehicle.type} copia` });
      this.selection = { kind: 'vehicle', index: this.map.vehicles.length - 1 };
      this.dirty = true;
      this._refresh();
      return true;
    }
    if (selection.kind === 'prop') {
      const prop = this.prop(selection.id);
      if (!prop) return false;
      this.pushUndo('duplica prop');
      const id = `prop-${Date.now().toString(36)}`;
      this.map.props.push({ ...clone(prop), id, x: round((prop.x || 0) + 3), z: round((prop.z || 0) + 3) });
      this.selection = { kind: 'prop', id };
      this.dirty = true;
      this._refresh();
      return true;
    }
    return false;
  }

  // ── overrides ─────────────────────────────────────────────────────────

  getOverride(kind, id) {
    const group = featureGroup(kind);
    return this.map.overrides?.[group]?.[String(id)] || {};
  }

  setOverride(kind, id, patch, label = 'modifica elemento') {
    const group = featureGroup(kind);
    if (!group) return;
    this.pushUndo(label);
    this.map.overrides ||= {};
    this.map.overrides[group] ||= {};
    const override = this.map.overrides[group][String(id)] ||= {};
    Object.assign(override, patch);
    this._refresh();
  }

  toggleHidden() {
    const selection = this.selection;
    if (!selection || !this.isMapKind(selection.kind)) return;
    this.pushUndo('visibilità');
    if (selection.custom) {
      const item = this.customFeature(selection.kind, selection.id);
      if (item) item.hidden = !item.hidden;
    } else {
      const group = featureGroup(selection.kind);
      this.map.overrides ||= {};
      this.map.overrides[group] ||= {};
      const override = this.map.overrides[group][String(selection.id)] ||= {};
      override.hidden = !override.hidden;
    }
    this.dirty = true;
    this._refresh();
  }

  resetOverride() {
    const selection = this.selection;
    if (!selection || !this.isMapKind(selection.kind)) return;
    if (selection.custom) {
      const item = this.customFeature(selection.kind, selection.id);
      if (!item) return;
      this.pushUndo('ripristina geometria');
      if (isLineKind(selection.kind)) delete item.hidden;
      else delete item.hidden;
      this.dirty = true;
      this._refresh();
      return;
    }
    const group = featureGroup(selection.kind);
    if (!this.map.overrides?.[group]?.[String(selection.id)]) return;
    this.pushUndo('ripristina elemento');
    delete this.map.overrides[group][String(selection.id)];
    this.dirty = true;
    this._refresh();
  }

  // ── missions / generic updates ────────────────────────────────────────

  updateMission(id, label, fn) {
    const mission = this.mission(id);
    if (!mission) return;
    this.pushUndo(label);
    fn(mission, this.map);
    this._refresh();
  }

  updateSelection(label, fn) {
    this.pushUndo(label);
    fn(this.selectedData, this.map);
    this._refresh();
  }

  deleteSelection() {
    const selection = this.selection;
    if (!selection) return;
    this.pushUndo('elimina');
    if (selection.kind === 'place') {
      this.map.places = this.map.places.filter(place => place.id !== selection.id);
      this.map.landmarks = (this.map.landmarks || []).filter(landmark => landmark.place !== selection.id);
      for (const mission of this.map.missions || []) {
        const compiledMission = this.compiled.missions.find(item => item.id === mission.id);
        for (let i = 0; i < (mission.steps || []).length; i++) {
          const step = mission.steps[i];
          if (step.place !== selection.id) continue;
          const compiledStep = compiledMission?.steps?.[i];
          if (compiledStep) { step.x = compiledStep.x; step.z = compiledStep.z; }
          delete step.place;
          delete step.offsetX;
          delete step.offsetZ;
        }
      }
    } else if (selection.kind === 'landmark') {
      this.map.landmarks = this.map.landmarks.filter(landmark => landmark.id !== selection.id);
    } else if (selection.kind === 'star') {
      this.map.stars = this.map.stars.filter(star => star.id !== selection.id);
    } else if (selection.kind === 'missionStep') {
      const mission = this.mission(selection.id);
      if (mission?.steps?.length > 1) mission.steps.splice(selection.index, 1);
    } else if (selection.kind === 'mission') {
      this.map.missions = (this.map.missions || []).filter(mission => mission.id !== selection.id);
    } else if (selection.kind === 'vehicle') {
      this.map.vehicles.splice(selection.index, 1);
    } else if (selection.kind === 'prop') {
      this.map.props = (this.map.props || []).filter(prop => prop.id !== selection.id);
    } else if (this.isMapKind(selection.kind)) {
      if (selection.custom) {
        const group = featureGroup(selection.kind);
        this.map.custom[group] = (this.map.custom?.[group] || []).filter(item => String(item.id) !== String(selection.id));
      } else {
        const group = featureGroup(selection.kind);
        this.map.overrides ||= {};
        this.map.overrides[group] ||= {};
        const override = this.map.overrides[group][String(selection.id)] ||= {};
        override.hidden = true;
      }
    }
    this.selection = null;
    this.dirty = true;
    this._refresh();
  }

  // ── add entities ──────────────────────────────────────────────────────

  addPlace(lat, lon) {
    const id = `poi-${Date.now().toString(36)}`;
    this.pushUndo('aggiungi POI');
    this.map.places.push({
      id,
      name: 'Nuovo POI',
      short: 'Nuovo POI',
      category: 'monument',
      lat: +lat.toFixed(7),
      lon: +lon.toFixed(7),
      collectible: false,
      radius: 8,
      description: '',
      fact: ''
    });
    this.selection = { kind: 'place', id };
    this.dirty = true;
    this._refresh();
    return id;
  }

  addStar(x, z) {
    if (!this.map.stars) this.map.stars = [];
    const id = `star-${Date.now().toString(36)}`;
    this.pushUndo('aggiungi stella');
    this.map.stars.push({ id, x: round(x), z: round(z) });
    this.selection = { kind: 'star', id };
    this.dirty = true;
    this._refresh();
    return id;
  }

  addLandmark(placeId) {
    const place = this.place(placeId);
    if (!place) return;
    const id = `lm-${Date.now().toString(36)}`;
    this.pushUndo('aggiungi landmark');
    this.map.landmarks.push({ id, place: placeId, model: 'piazza-duomo', rotation: 0, offsetX: 0, offsetZ: 0, scale: 1, hidden: false });
    this.selection = { kind: 'landmark', id };
    this.dirty = true;
    this._refresh();
  }

  addProp(type, x, z) {
    if (!this.map.props) this.map.props = [];
    const id = `prop-${Date.now().toString(36)}`;
    const defaults = {
      sign: { text: 'NUOVA INSEGNA', sub: 'Fidenza' },
      'street-sign': { text: 'VIA EMILIA', sub: 'Fidenza' },
      tree: {}, bench: {}, lamp: {}, bollard: {}, planter: {}, stall: {}, 'parked-car': {}
    };
    this.pushUndo('aggiungi prop');
    this.map.props.push({
      id, type,
      x: round(x), z: round(z),
      rotation: 0, scale: 1, ...(defaults[type] || {})
    });
    this.selection = { kind: 'prop', id };
    this.dirty = true;
    this._refresh();
    return id;
  }

  addMission(type = 'custom') {
    if (!this.map.missions) this.map.missions = [];
    const id = `mission-${Date.now().toString(36)}`;
    const spawn = this.map.spawn || { x: 0, z: 0 };
    this.pushUndo('aggiungi missione');
    this.map.missions.push({
      id, type,
      title: 'Nuova missione',
      short: 'Descrizione della missione.',
      time: 180,
      reward: 700,
      steps: [{
        x: round(spawn.x),
        z: round(spawn.z),
        name: 'Prima tappa',
        prompt: 'interagisci',
        comment: '',
        radius: 12,
        photo: false
      }]
    });
    this.selection = { kind: 'mission', id };
    this.dirty = true;
    this._refresh();
    return id;
  }

  addMissionStep(missionId, x, z) {
    const mission = this.mission(missionId);
    if (!mission) return null;
    this.pushUndo('aggiungi tappa');
    mission.steps ||= [];
    mission.steps.push({
      x: round(x),
      z: round(z),
      name: `Tappa ${mission.steps.length + 1}`,
      prompt: 'interagisci',
      comment: '',
      radius: 12,
      photo: false
    });
    this.selection = { kind: 'missionStep', id: missionId, index: mission.steps.length - 1 };
    this.dirty = true;
    this._refresh();
    return this.selection;
  }

  moveMissionStep(missionId, index, direction) {
    const mission = this.mission(missionId);
    if (!mission?.steps) return;
    const to = index + direction;
    if (to < 0 || to >= mission.steps.length) return;
    this.pushUndo('riordina tappe');
    const [step] = mission.steps.splice(index, 1);
    mission.steps.splice(to, 0, step);
    this.selection = { kind: 'missionStep', id: missionId, index: to };
    this.dirty = true;
    this._refresh();
  }

  // ── export / stats ────────────────────────────────────────────────────

  compiledForExport() {
    const compiled = compileMap(this.map, this.patchedCity);
    compiled.seasons = {
      default: this.map.seasons?.default || 'auto',
      styles: Object.fromEntries(Object.keys(this.map.seasons?.styles || {}).map(id => [id, `data/styles/${id}.json`]))
    };
    return compiled;
  }

  serializeSource() {
    return JSON.stringify(this.map, null, 2);
  }

  serializeCompiled() {
    return JSON.stringify(this.compiledForExport(), null, 2);
  }

  overrideCount() {
    return Object.values(this.map.overrides || {}).reduce((count, group) => count + Object.keys(group || {}).length, 0);
  }

  customCount() {
    return Object.values(this.map.custom || {}).reduce((count, group) => count + (Array.isArray(group) ? group.length : 0), 0);
  }

  customVertices() {
    let vertices = 0;
    for (const [group, list] of Object.entries(this.map.custom || {})) {
      if (!Array.isArray(list)) continue;
      const kind = Object.entries(FEATURE_GROUP).find(([, value]) => value === group)?.[0];
      for (const item of list) vertices += (pointsFor(kind, item) || []).length;
    }
    return vertices;
  }

  featureStats() {
    return {
      buildings: this.patchedCity?.buildings?.length || 0,
      roads: this.patchedCity?.roads?.length || 0,
      areas: this.patchedCity?.areas?.length || 0,
      waterways: this.patchedCity?.waterways?.length || 0,
      railways: this.patchedCity?.railways?.length || 0,
      custom: this.customCount(),
      customVertices: this.customVertices()
    };
  }

  allFeatures(kind) {
    const custom = this.customList(kind).map(item => ({ ...item, custom: true }));
    const existing = this.sourceList(kind).map(item => ({ ...item, custom: false }));
    return [...existing, ...custom];
  }
}

export { FEATURE_LABEL };
