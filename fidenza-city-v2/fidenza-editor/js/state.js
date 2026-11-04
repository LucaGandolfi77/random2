import { compileMap } from '../../js/map-compiler.js';
import { applyOverrides } from '../../js/map-overrides.js';
import { validateMap } from '../../js/map-validate.js';
import { project, unproject, polygonCentroid } from './geo.js';

export const DRAFT_KEY = 'fidenza-map-draft-v2';
const clone = v => JSON.parse(JSON.stringify(v));

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
    this._refresh();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }

  selectionExists() {
    const s = this.selection;
    if (!s) return true;
    if (s.kind === 'place' || s.kind === 'beacon') return !!this.place(s.id);
    if (s.kind === 'landmark') return !!this.landmark(s.id);
    if (s.kind === 'star') return !!this.star(s.id);
    if (s.kind === 'mission') return !!this.mission(s.id);
    if (s.kind === 'missionStep') return !!this.mission(s.id)?.steps?.[s.index];
    if (s.kind === 'vehicle') return !!this.vehicle(s.index);
    if (s.kind === 'prop') return !!this.prop(s.id);
    if (s.kind === 'spawn') return !!this.map.spawn;
    if (s.kind === 'missionBoard') return !!this.map.missionBoard;
    if (s.kind === 'building' || s.kind === 'road' || s.kind === 'area') {
      const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
      return !!(this.city[group] || []).find(x => String(x.id) === String(s.id));
    }
    return true;
  }

  _refresh() {
    if (!this.selectionExists()) this.selection = null;
    const validation = validateMap(this.map, this.city);
    this.validation = validation;
    this.patchedCity = validation.patchedCity;
    this.compiled = validation.compiled;
    this.emit();
  }

  refresh() { this._refresh(); }

  snapshot() { return JSON.stringify(this.map); }

  pushUndo(label = 'modifica') {
    this.undoStack.push({ label, data: this.snapshot() });
    if (this.undoStack.length > 80) this.undoStack.shift();
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

  place(id) { return (this.map.places || []).find(p => p.id === id); }
  landmark(id) { return (this.map.landmarks || []).find(l => l.id === id); }
  star(id) { return (this.map.stars || []).find(s => s.id === id); }
  mission(id) { return (this.map.missions || []).find(m => m.id === id); }
  vehicle(index) { return (this.map.vehicles || [])[index]; }
  prop(id) { return (this.map.props || []).find(p => p.id === id); }

  get selectedData() {
    const s = this.selection;
    if (!s) return null;
    if (s.kind === 'place') return this.place(s.id);
    if (s.kind === 'beacon') return this.place(s.id);
    if (s.kind === 'landmark') return this.landmark(s.id);
    if (s.kind === 'star') return this.star(s.id);
    if (s.kind === 'mission') return this.mission(s.id);
    if (s.kind === 'missionStep') return this.mission(s.id)?.steps?.[s.index];
    if (s.kind === 'vehicle') return this.vehicle(s.index);
    if (s.kind === 'prop') return this.prop(s.id);
    if (s.kind === 'spawn') return this.map.spawn;
    if (s.kind === 'missionBoard') return this.map.missionBoard;
    if (s.kind === 'building' || s.kind === 'road' || s.kind === 'area') {
      return this.patchedCity?.[s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas']?.find(x => String(x.id) === String(s.id));
    }
    return null;
  }

  select(selection) {
    this.selection = selection;
    this.emit();
  }

  selectionAnchor() {
    const s = this.selection;
    if (!s) return null;
    if (s.kind === 'place') {
      const p = this.compiled.places.find(p => p.id === s.id);
      return p ? { x: p.x, z: p.z } : null;
    }
    if (s.kind === 'beacon') {
      const p = this.compiled.places.find(p => p.id === s.id);
      return p ? { x: p.beaconX ?? p.x, z: p.beaconZ ?? p.z } : null;
    }
    if (s.kind === 'landmark') {
      const l = this.compiled.landmarks.find(l => l.id === s.id);
      return l ? { x: l.x + (l.offsetX || 0), z: l.z + (l.offsetZ || 0) } : null;
    }
    if (s.kind === 'star') {
      const st = this.compiled.stars.find(st => st.id === s.id);
      return st ? { x: st.x, z: st.z } : null;
    }
    if (s.kind === 'missionStep') {
      const m = this.compiled.missions.find(m => m.id === s.id);
      const st = m?.steps?.[s.index];
      return st ? { x: st.x, z: st.z } : null;
    }
    if (s.kind === 'vehicle') {
      const v = this.compiled.vehicles?.[s.index];
      return v ? { x: v.x, z: v.z } : null;
    }
    if (s.kind === 'prop') {
      const p = this.compiled.props?.find(p => p.id === s.id);
      return p ? { x: p.x, z: p.z } : null;
    }
    if (s.kind === 'spawn') return this.map.spawn ? { x: this.map.spawn.x, z: this.map.spawn.z } : null;
    if (s.kind === 'missionBoard') return this.map.missionBoard ? { x: this.map.missionBoard.x, z: this.map.missionBoard.z } : null;
    if (s.kind === 'building' || s.kind === 'road' || s.kind === 'area') {
      const arr = this.patchedCity?.[s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas'];
      const item = arr?.find(x => String(x.id) === String(s.id));
      if (!item) {
        const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
        const src = this.city[group]?.find(x => String(x.id) === String(s.id));
        if (!src) return null;
        if (s.kind === 'road') {
          const mid = src.pts?.[Math.floor((src.pts.length - 1) / 2)] || [0, 0];
          return { x: mid[0], z: mid[1] };
        }
        return { x: src.x, z: src.z };
      }
      if (s.kind === 'road') {
        const mid = item.pts?.[Math.floor((item.pts.length - 1) / 2)] || [0, 0];
        return { x: mid[0], z: mid[1] };
      }
      return { x: item.x, z: item.z };
    }
    return null;
  }

  setSelectionPosition(x, z) {
    const s = this.selection;
    if (!s) return;
    if (s.kind === 'place') {
      const p = this.place(s.id);
      if (!p) return;
      const old = project(p.lat, p.lon, this.originDef);
      const xy = unproject(x, z, this.originDef);
      p.lat = +xy.lat.toFixed(7);
      p.lon = +xy.lon.toFixed(7);
      const dx = x - old.x, dz = z - old.z;
      if (p.beacon) {
        p.beacon.x = +(p.beacon.x + dx).toFixed(2);
        p.beacon.z = +(p.beacon.z + dz).toFixed(2);
      }
      // Il POI si muove, il modello 3D resta dov'è: si sposta con il suo handle.
      for (const l of this.map.landmarks || []) {
        if (l.place === p.id) {
          l.offsetX = +((l.offsetX || 0) - dx).toFixed(2);
          l.offsetZ = +((l.offsetZ || 0) - dz).toFixed(2);
        }
      }
    } else if (s.kind === 'beacon') {
      const p = this.place(s.id);
      if (p) p.beacon = { x: +x.toFixed(2), z: +z.toFixed(2) };
    } else if (s.kind === 'landmark') {
      const l = this.landmark(s.id);
      const place = this.place(l.place);
      if (l && place) {
        const xy = project(place.lat, place.lon, this.originDef);
        l.offsetX = +(x - xy.x).toFixed(2);
        l.offsetZ = +(z - xy.z).toFixed(2);
      }
    } else if (s.kind === 'star') {
      const st = this.star(s.id);
      if (st) { st.x = +x.toFixed(2); st.z = +z.toFixed(2); }
    } else if (s.kind === 'missionStep') {
      const m = this.mission(s.id);
      const st = m?.steps?.[s.index];
      if (st) {
        st.x = +x.toFixed(2);
        st.z = +z.toFixed(2);
        delete st.place;
        delete st.offsetX;
        delete st.offsetZ;
      }
    } else if (s.kind === 'vehicle') {
      const v = this.vehicle(s.index);
      if (v) { v.x = +x.toFixed(2); v.z = +z.toFixed(2); }
    } else if (s.kind === 'prop') {
      const p = this.prop(s.id);
      if (p) { p.x = +x.toFixed(2); p.z = +z.toFixed(2); }
    } else if (s.kind === 'spawn') {
      if (this.map.spawn) { this.map.spawn.x = +x.toFixed(2); this.map.spawn.z = +z.toFixed(2); }
    } else if (s.kind === 'missionBoard') {
      if (this.map.missionBoard) { this.map.missionBoard.x = +x.toFixed(2); this.map.missionBoard.z = +z.toFixed(2); }
    } else if (s.kind === 'building' || s.kind === 'road' || s.kind === 'area') {
      const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
      const source = this.city[group]?.find(x => String(x.id) === String(s.id));
      if (!source) return;
      let ox, oz;
      if (s.kind === 'road') {
        const mid = source.pts?.[Math.floor((source.pts.length - 1) / 2)] || [0, 0];
        ox = mid[0]; oz = mid[1];
      } else {
        [ox, oz] = polygonCentroid(source.poly);
      }
      this.map.overrides ||= {};
      this.map.overrides[group] ||= {};
      const o = this.map.overrides[group][String(s.id)] ||= {};
      o.moveX = +(x - ox).toFixed(2);
      o.moveZ = +(z - oz).toFixed(2);
    }
    this.dirty = true;
  }


  getOverride(kind, id) {
    const group = kind === 'building' ? 'buildings' : kind === 'road' ? 'roads' : 'areas';
    return this.map.overrides?.[group]?.[String(id)] || {};
  }

  setOverride(kind, id, patch, label = 'modifica elemento') {
    const group = kind === 'building' ? 'buildings' : kind === 'road' ? 'roads' : 'areas';
    this.pushUndo(label);
    this.map.overrides ||= {};
    this.map.overrides[group] ||= {};
    const o = this.map.overrides[group][String(id)] ||= {};
    Object.assign(o, patch);
    this._refresh();
  }


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

  toggleHidden() {
    const s = this.selection;
    if (!s || !['building', 'road', 'area'].includes(s.kind)) return;
    const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
    this.pushUndo('visibilità');
    this.map.overrides ||= {};
    this.map.overrides[group] ||= {};
    const o = this.map.overrides[group][String(s.id)] ||= {};
    o.hidden = !o.hidden;
    this._refresh();
  }

  resetOverride() {
    const s = this.selection;
    if (!s || !['building', 'road', 'area'].includes(s.kind)) return;
    const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
    if (!this.map.overrides?.[group]?.[String(s.id)]) return;
    this.pushUndo('ripristina elemento');
    delete this.map.overrides[group][String(s.id)];
    this._refresh();
  }

  deleteSelection() {
    const s = this.selection;
    if (!s) return;
    this.pushUndo('elimina');
    if (s.kind === 'place') {
      this.map.places = this.map.places.filter(p => p.id !== s.id);
      this.map.landmarks = (this.map.landmarks || []).filter(l => l.place !== s.id);
      for (const m of this.map.missions || []) {
        const cm = this.compiled.missions.find(x => x.id === m.id);
        for (let i = 0; i < (m.steps || []).length; i++) {
          const st = m.steps[i];
          if (st.place !== s.id) continue;
          const c = cm?.steps?.[i];
          if (c) { st.x = c.x; st.z = c.z; }
          delete st.place;
          delete st.offsetX;
          delete st.offsetZ;
        }
      }
    } else if (s.kind === 'landmark') {
      this.map.landmarks = this.map.landmarks.filter(l => l.id !== s.id);
    } else if (s.kind === 'star') {
      this.map.stars = this.map.stars.filter(st => st.id !== s.id);
    } else if (s.kind === 'missionStep') {
      const m = this.mission(s.id);
      if (m?.steps?.length > 1) m.steps.splice(s.index, 1);
    } else if (s.kind === 'mission') {
      this.map.missions = (this.map.missions || []).filter(m => m.id !== s.id);
    } else if (s.kind === 'vehicle') {
      this.map.vehicles.splice(s.index, 1);
    } else if (s.kind === 'prop') {
      this.map.props = (this.map.props || []).filter(p => p.id !== s.id);
    } else if (['building', 'road', 'area'].includes(s.kind)) {
      const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
      this.map.overrides ||= {};
      this.map.overrides[group] ||= {};
      const o = this.map.overrides[group][String(s.id)] ||= {};
      o.hidden = true;
    }
    this.selection = null;
    this._refresh();
  }

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
    this._refresh();
    return id;
  }

  addStar(x, z) {
    if (!this.map.stars) this.map.stars = [];
    const index = this.map.stars.length;
    const id = `star-${Date.now().toString(36)}`;
    this.pushUndo('aggiungi stella');
    this.map.stars.push({ id, x: +x.toFixed(2), z: +z.toFixed(2) });
    this.selection = { kind: 'star', id };
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
    this._refresh();
  }

  addProp(type, x, z) {
    if (!this.map.props) this.map.props = [];
    const id = `prop-${Date.now().toString(36)}`;
    const defaults = {
      sign: { text: 'NUOVA INSEGNA', sub: 'Fidenza' },
      'street-sign': { text: 'VIA EMILIA', sub: 'Fidenza' },
      tree: {},
      bench: {},
      lamp: {},
      bollard: {},
      planter: {},
      stall: {},
      'parked-car': {}
    };
    this.pushUndo('aggiungi prop');
    this.map.props.push({
      id, type,
      x: +x.toFixed(2), z: +z.toFixed(2),
      rotation: 0, scale: 1, ...(defaults[type] || {})
    });
    this.selection = { kind: 'prop', id };
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
        x: +Number(spawn.x).toFixed(2),
        z: +Number(spawn.z).toFixed(2),
        name: 'Prima tappa',
        prompt: 'interagisci',
        comment: '',
        radius: 12,
        photo: false
      }]
    });
    this.selection = { kind: 'mission', id };
    this._refresh();
    return id;
  }

  addMissionStep(missionId, x, z) {
    const m = this.mission(missionId);
    if (!m) return null;
    this.pushUndo('aggiungi tappa');
    m.steps ||= [];
    m.steps.push({
      x: +Number(x).toFixed(2),
      z: +Number(z).toFixed(2),
      name: `Tappa ${m.steps.length + 1}`,
      prompt: 'interagisci',
      comment: '',
      radius: 12,
      photo: false
    });
    this.selection = { kind: 'missionStep', id: missionId, index: m.steps.length - 1 };
    this._refresh();
    return this.selection;
  }

  moveMissionStep(missionId, index, direction) {
    const m = this.mission(missionId);
    if (!m?.steps) return;
    const to = index + direction;
    if (to < 0 || to >= m.steps.length) return;
    this.pushUndo('riordina tappe');
    const [step] = m.steps.splice(index, 1);
    m.steps.splice(to, 0, step);
    this.selection = { kind: 'missionStep', id: missionId, index: to };
    this._refresh();
  }

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
    return Object.values(this.map.overrides || {}).reduce((n, g) => n + Object.keys(g || {}).length, 0);
  }
}
