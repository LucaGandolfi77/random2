import { EditorState } from './state.js';
import { MapView } from './map-view.js';
import { Inspector } from './inspector.js';
import {
  fetchJSON, loadDraft, saveDraft, clearDraft, importJSON,
  saveTextFile, saveBoth
} from './io.js';
import { featureLabel } from './geometry.js';

const $ = id => document.getElementById(id);
const TAB_IDS = ['places', 'buildings', 'roads', 'areas', 'waterways', 'railways', 'custom', 'landmarks', 'stars', 'missions', 'vehicles', 'props', 'overrides'];
const MAP_TABS = {
  buildings: 'building', roads: 'road', areas: 'area', waterways: 'waterway', railways: 'railway'
};
const DRAW_BY_TAB = {
  buildings: 'drawBuilding', roads: 'drawRoad', areas: 'drawArea', waterways: 'drawWater', railways: 'drawRail'
};
const DRAW_KIND = {
  drawRoad: 'road', drawArea: 'area', drawBuilding: 'building', drawWater: 'waterway', drawRail: 'railway'
};

const state = {
  map: null,
  city: null,
  editor: null,
  view: null,
  inspector: null,
  tab: 'places',
  search: '',
  lastSelection: '',
  draftTimer: null,
  dirty: false,
  paletteItems: [],
  paletteIndex: 0,
  lastSnap: 1
};

const els = {
  canvas: $('editor-canvas'),
  inspector: $('inspector'),
  list: $('entity-list'),
  tabTools: $('tab-tools'),
  search: $('search'),
  validation: $('validation-list'),
  badge: $('validation-badge'),
  status: $('status-text'),
  perf: $('perf'),
  coords: $('coords'),
  zoom: $('zoom'),
  saveState: $('save-state'),
  undo: $('btn-undo'),
  redo: $('btn-redo'),
  title: $('map-title'),
  modeSelect: $('btn-mode-select'),
  modePan: $('btn-mode-pan'),
  modePlace: $('btn-mode-place'),
  modeStar: $('btn-mode-star'),
  snap: $('snap'),
  fileInput: $('file-input'),
  toast: $('toast'),
  drawHint: $('draw-hint'),
  drawTools: $('draw-tools'),
  tabs: $('tabs'),
  paletteOverlay: $('palette-overlay'),
  paletteInput: $('palette-input'),
  paletteList: $('palette-list'),
  helpOverlay: $('help-overlay'),
  closeHelp: $('btn-close-help')
};

function toast(text, ms = 2200) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function selectionKey(selection) {
  return selection ? `${selection.kind}:${selection.id ?? ''}:${selection.index ?? ''}:${selection.custom ? 'c' : 'o'}` : '';
}

function selectionFromValidation(row) {
  if (row.kind === 'place' || row.kind === 'beacon') return { kind: row.kind, id: row.id };
  if (row.kind === 'landmark') return { kind: 'landmark', id: row.id };
  if (row.kind === 'star') return { kind: 'star', id: row.id };
  if (row.kind === 'vehicle') {
    const index = state.editor.compiled.vehicles?.findIndex(vehicle => `${vehicle.type}-${vehicle.label}` === row.id);
    return index >= 0 ? { kind: 'vehicle', index } : null;
  }
  if (row.kind === 'mission-step') {
    const [id, index] = String(row.id).split(':');
    return { kind: 'missionStep', id, index: Number(index) };
  }
  if (row.kind === 'prop') return { kind: 'prop', id: row.id };
  if (row.kind === 'spawn') return { kind: 'spawn' };
  if (row.kind === 'missionBoard') return { kind: 'missionBoard' };
  if (row.kind === 'geometry') {
    const [group, id] = String(row.id).split(':');
    const kind = MAP_TABS[group] || Object.entries({ building: 'buildings', road: 'roads', area: 'areas', waterway: 'waterways', railway: 'railways' }).find(([, value]) => value === group)?.[0];
    return kind ? { kind, id, custom: true } : null;
  }
  if (row.kind === 'override') {
    const [kind, id] = String(row.id).split(':');
    return kind && MAP_TABS[`${kind}s`] ? { kind, id } : null;
  }
  return null;
}

function featureSelection(kind, item) {
  return { kind, id: String(item.id), custom: !!item.custom };
}

function featureRow(kind, item) {
  const custom = !!item.custom;
  const name = item.name || `${featureLabel(kind)} ${item.id}`;
  const subtype = item.kind || kind;
  const measure = kind === 'building' || kind === 'area'
    ? `${Number(item.area || 0).toFixed(0)} m²`
    : `${Number(item.length || 0).toFixed(0)} m`;
  return {
    key: `${kind}:${item.id}:${custom ? 'c' : 'o'}`,
    title: name,
    sub: `${custom ? 'custom' : 'OSM'} · ${subtype} · ${measure}`,
    sel: featureSelection(kind, item)
  };
}

function renderList() {
  if (!state.editor) return;
  const editor = state.editor;
  const query = state.search.trim().toLowerCase();
  let items = [];

  if (state.tab === 'places') {
    items = editor.map.places
      .filter(place => !query || place.name?.toLowerCase().includes(query) || place.short?.toLowerCase().includes(query) || place.id.includes(query) || (place.osm || '').includes(query))
      .map(place => ({
        key: `place:${place.id}`,
        title: place.short || place.name,
        sub: `${place.category}${place.collectible ? ' · collezionabile' : ''}`,
        sel: { kind: 'place', id: place.id }
      }));
  } else if (state.tab === 'landmarks') {
    items = editor.map.landmarks
      .filter(landmark => !query || landmark.id.includes(query) || landmark.place.includes(query))
      .map(landmark => ({
        key: `landmark:${landmark.id}`,
        title: landmark.id,
        sub: `${landmark.model}${landmark.hidden ? ' · nascosto' : ''}`,
        sel: { kind: 'landmark', id: landmark.id }
      }));
  } else if (state.tab === 'stars') {
    items = (editor.map.stars || [])
      .filter(star => !query || star.id.includes(query))
      .map(star => ({
        key: `star:${star.id}`,
        title: star.id,
        sub: `${star.x}, ${star.z}`,
        sel: { kind: 'star', id: star.id }
      }));
  } else if (state.tab === 'missions') {
    items = (editor.map.missions || [])
      .filter(mission => !query || mission.title?.toLowerCase().includes(query) || mission.id.includes(query))
      .map(mission => ({
        key: `mission:${mission.id}`,
        title: mission.title || mission.id,
        sub: `${mission.steps?.length || 0} tappe · ${mission.time}s${mission.event ? ' · evento ' + mission.event : ''}`,
        sel: { kind: 'mission', id: mission.id }
      }));
  } else if (state.tab === 'vehicles') {
    items = (editor.map.vehicles || [])
      .filter(vehicle => !query || vehicle.label?.toLowerCase().includes(query) || vehicle.type.includes(query))
      .map((vehicle, index) => ({
        key: `vehicle:${index}`,
        title: vehicle.label || vehicle.type,
        sub: `${vehicle.type} · ${vehicle.x}, ${vehicle.z}`,
        sel: { kind: 'vehicle', index }
      }));
  } else if (state.tab === 'props') {
    items = (editor.map.props || [])
      .filter(prop => !query || prop.id.includes(query) || prop.type.includes(query) || (prop.text || '').toLowerCase().includes(query))
      .map(prop => ({
        key: `prop:${prop.id}`,
        title: prop.text || prop.id,
        sub: `${prop.type} · ${prop.x}, ${prop.z}`,
        sel: { kind: 'prop', id: prop.id }
      }));
  } else if (state.tab === 'overrides') {
    for (const [group, entries] of Object.entries(editor.map.overrides || {})) {
      for (const [id, override] of Object.entries(entries || {})) {
        const kind = Object.entries({ building: 'buildings', road: 'roads', area: 'areas', waterway: 'waterways', railway: 'railways' }).find(([, value]) => value === group)?.[0];
        if (!kind) continue;
        items.push({
          key: `override:${kind}:${id}`,
          title: `${featureLabel(kind)} ${id}`,
          sub: Object.entries(override).map(([key, value]) => `${key}:${Array.isArray(value) ? `${value.length} punti` : value}`).join(' · ') || 'override',
          sel: { kind, id }
        });
      }
    }
  } else if (state.tab === 'custom') {
    for (const kind of ['road', 'area', 'building', 'waterway', 'railway']) {
      for (const item of editor.customList(kind)) {
        const row = featureRow(kind, { ...item, custom: true });
        if (!query || row.title.toLowerCase().includes(query) || row.sub.toLowerCase().includes(query)) items.push(row);
      }
    }
  } else if (MAP_TABS[state.tab]) {
    const kind = MAP_TABS[state.tab];
    for (const item of editor.customList(kind)) {
      const row = featureRow(kind, { ...item, custom: true });
      if (query && !row.title.toLowerCase().includes(query) && !row.sub.toLowerCase().includes(query)) continue;
      items.push(row);
    }
    for (const item of editor.sourceList(kind)) {
      if (items.length >= 500) break;
      const row = featureRow(kind, item);
      if (query && !row.title.toLowerCase().includes(query) && !row.sub.toLowerCase().includes(query)) continue;
      items.push(row);
    }
  }

  items = items.filter(item => !query || item.title.toLowerCase().includes(query) || item.sub.toLowerCase().includes(query)).slice(0, 500);
  els.list.innerHTML = items.length
    ? items.map(item => `<button type="button" class="entity-row" data-key="${encodeURIComponent(JSON.stringify(item.sel))}"><b>${esc(item.title)}</b><small>${esc(item.sub)}</small></button>`).join('')
    : `<p class="empty-list">Nessun elemento</p>`;
  els.list.querySelectorAll('.entity-row').forEach(button => {
    button.addEventListener('click', () => {
      const selection = JSON.parse(decodeURIComponent(button.dataset.key));
      state.editor.select(selection);
      const anchor = state.editor.selectionAnchor();
      if (anchor) state.view.focusOn(anchor.x, anchor.z);
    });
  });
}

function bindDrawButtons(root) {
  root.querySelectorAll('[data-draw]').forEach(button => {
    button.addEventListener('click', () => {
      setMode(button.dataset.draw);
      const label = { drawRoad: 'strada', drawArea: 'area', drawBuilding: 'edificio', drawWater: 'corso d’acqua', drawRail: 'ferrovia' }[button.dataset.draw] || 'geometria';
      toast(`Disegno ${label}: clicca sulla mappa, Invio o doppio clic per chiudere.`, 3200);
    });
  });
}

function renderTabTools() {
  if (!state.editor || !els.tabTools) return;
  if (state.tab === 'missions') {
    els.tabTools.innerHTML = `
      <button type="button" class="new-mission" id="tool-add-mission">+ Nuova missione</button>
      <span class="tool-label">Seleziona una missione e usa “+ Tappa” per costruirla sulla mappa.</span>`;
    $('tool-add-mission')?.addEventListener('click', () => {
      state.editor.addMission();
      onChange({ final: true });
    });
  } else if (state.tab === 'props') {
    const types = [
      ['sign', 'Insegna'], ['street-sign', 'Targa'], ['tree', 'Albero'], ['bench', 'Panchina'],
      ['lamp', 'Lampione'], ['bollard', 'Bollard'], ['planter', 'Fioriera'], ['stall', 'Bancarella'], ['parked-car', 'Auto']
    ];
    const active = state.view?.pendingPropType || 'sign';
    els.tabTools.innerHTML = `<span class="tool-label">Palette props · clicca un tipo, poi la mappa</span>` +
      types.map(([id, label]) => `<button type="button" data-prop-type="${id}" class="${id === active ? 'active' : ''}">${label}</button>`).join('');
    els.tabTools.querySelectorAll('[data-prop-type]').forEach(button => {
      button.addEventListener('click', () => {
        state.view.pendingPropType = button.dataset.propType;
        setMode('addProp');
        renderTabTools();
        toast(`Prop: ${button.textContent}. Clicca sulla mappa per posizionarlo.`);
      });
    });
  } else if (state.tab === 'custom') {
    els.tabTools.innerHTML = `
      <span class="tool-label">Feature geometriche create dall’editor</span>
      <button type="button" data-draw="drawRoad">+ Strada</button>
      <button type="button" data-draw="drawArea">+ Area</button>
      <button type="button" data-draw="drawBuilding">+ Edificio</button>
      <button type="button" data-draw="drawWater">+ Acqua</button>
      <button type="button" data-draw="drawRail">+ Ferrovia</button>`;
    bindDrawButtons(els.tabTools);
  } else if (DRAW_BY_TAB[state.tab]) {
    const kind = MAP_TABS[state.tab];
    const count = state.editor.sourceList(kind).length + state.editor.customList(kind).length;
    const label = featureLabel(kind);
    els.tabTools.innerHTML = `
      <span class="tool-label">${count} ${label}${count === 1 ? '' : 'e'} · ${state.editor.customList(kind).length} custom</span>
      <button type="button" data-draw="${DRAW_BY_TAB[state.tab]}">+ Nuovo ${label}</button>
      <span class="tool-label">Clicca una feature per selezionarla o trascinarne i vertici.</span>`;
    bindDrawButtons(els.tabTools);
  } else if (state.tab === 'overrides') {
    els.tabTools.innerHTML = `<span class="tool-label">Override attivi: trasformazioni, geometrie assolute e visibilità.</span>`;
  } else {
    els.tabTools.innerHTML = '';
  }
}

function renderValidation() {
  if (!state.editor) return;
  const validation = state.editor.validation;
  const errors = validation.errors || [];
  els.badge.textContent = errors.length ? `${errors.length} ${errors.length === 1 ? 'errore' : 'errori'}` : 'valida';
  els.badge.className = `badge ${errors.length ? 'bad' : 'ok'}`;
  if (errors.length) {
    els.validation.innerHTML = errors.map(row =>
      `<button type="button" class="validation-row bad" data-row="${encodeURIComponent(JSON.stringify(row))}"><b>✗ ${esc(row.kind)}</b><span>${esc(row.id)}</span><small>${esc(row.msg)}</small></button>`
    ).join('');
  } else {
    const warnings = validation.warnings?.length || 0;
    els.validation.innerHTML = `<p class="empty-list">✓ Nessun problema rilevato. ${validation.totals.checks} controlli superati.${warnings ? `<br>${warnings} avvisi non bloccanti.` : ''}</p>`;
  }
  els.validation.querySelectorAll('.validation-row').forEach(button => {
    button.addEventListener('click', () => {
      const row = JSON.parse(decodeURIComponent(button.dataset.row));
      const selection = selectionFromValidation(row);
      if (!selection) return;
      state.editor.select(selection);
      const anchor = state.editor.selectionAnchor();
      if (anchor) state.view.focusOn(anchor.x, anchor.z);
    });
  });
}

function updateStatus(coords = null, scale = null) {
  if (!state.editor) return;
  const editor = state.editor;
  const validation = editor.validation;
  const stats = editor.featureStats();
  els.status.textContent = `${validation.totals.checks} controlli · ${validation.totals.errors} ${validation.totals.errors === 1 ? 'errore' : 'errori'} · ${editor.overrideCount()} override · ${stats.custom} custom · ${editor.dirty ? 'modificato' : 'salvato'}`;
  if (els.perf) {
    const renderMs = state.view?.lastRenderMs || 0;
    els.perf.textContent = `${renderMs.toFixed(1)} ms · ${state.view?.visibleCount || 0} aree visibili`;
  }
  if (coords) {
    const origin = editor.originDef;
    const lat = origin.lat - coords.z / 111132;
    const lon = origin.lon + coords.x / (111320 * Math.cos(origin.lat * Math.PI / 180));
    els.coords.textContent = `x ${coords.x.toFixed(1)} · z ${coords.z.toFixed(1)} · ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
  if (scale) els.zoom.textContent = `${(scale * 100).toFixed(0)}%`;
  els.undo.disabled = editor.undoStack.length === 0;
  els.redo.disabled = editor.redoStack.length === 0;
  els.saveState.textContent = editor.dirty ? 'Modifiche non salvate' : 'Nessuna modifica';
  els.saveState.className = editor.dirty ? 'save-state dirty' : 'save-state';
}

function scheduleDraft() {
  clearTimeout(state.draftTimer);
  state.draftTimer = setTimeout(() => {
    if (!state.editor) return;
    saveDraft(state.editor.map);
    els.saveState.textContent = 'Bozza locale salvata';
    els.saveState.className = 'save-state saved';
  }, 700);
}

function onStateChanged() {
  if (!state.editor) return;
  state.view.scheduleRender();
  renderList();
  renderTabTools();
  renderValidation();
  updateStatus();
  const key = selectionKey(state.editor.selection);
  if (key !== state.lastSelection) {
    state.lastSelection = key;
    state.inspector.render();
  }
  syncModeButtons();
  scheduleDraft();
}

function onChange(opts = {}) {
  syncModeButtons();
  if (opts.final) state.inspector.render();
  updateStatus();
}

function syncModeButtons() {
  const mode = state.view?.mode || 'select';
  for (const [element, value] of [
    [els.modeSelect, 'select'],
    [els.modePan, 'pan'],
    [els.modePlace, 'addPlace'],
    [els.modeStar, 'addStar']
  ]) {
    element?.classList.toggle('active', value === mode);
  }
  els.drawTools?.querySelectorAll('[data-draw]').forEach(button => {
    button.classList.toggle('active', button.dataset.draw === mode);
  });
  if (els.canvas) {
    els.canvas.style.cursor = mode === 'pan' ? 'grab' : ['addPlace', 'addStar', 'addProp', 'addMissionStep'].includes(mode) || mode.startsWith('draw') ? 'crosshair' : 'default';
  }
}

function updateDrawHint(info) {
  if (!info) {
    els.drawHint.hidden = true;
    els.drawHint.textContent = '';
    return;
  }
  els.drawHint.hidden = false;
  const prefix = info.error ? info.error : `Disegna ${info.label}`;
  const body = info.count != null ? ` · ${info.count} punti (min ${info.min})` : '';
  els.drawHint.innerHTML = `<b>${esc(prefix)}</b>${esc(body)} · <b>Invio</b> o doppio clic per chiudere · <b>Esc</b> annulla`;
  els.drawHint.classList.toggle('error', !!info.error);
}

function setMode(mode) {
  if (!state.view) return;
  if (state.view.drawing && mode !== state.view.drawing.mode) {
    state.view.cancelDrawing();
  }
  state.view.mode = mode;
  if (mode !== 'select') state.view.activeVertex = null;
  if (DRAW_KIND[mode] && !state.view.drawing) {
    updateDrawHint({ label: featureLabel(DRAW_KIND[mode]), count: 0, min: ['area', 'building'].includes(DRAW_KIND[mode]) ? 3 : 2 });
  } else if (!state.view.drawing) {
    updateDrawHint(null);
  }
  syncModeButtons();
  if (mode === 'pan') toast('Mano attiva: trascina per spostarti.', 1400);
}

function selectTab(tab) {
  if (!TAB_IDS.includes(tab)) return;
  state.tab = tab;
  document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  renderList();
  renderTabTools();
}

function toggleSnap() {
  if (!state.view) return;
  if (state.view.snap > 0) {
    state.lastSnap = state.view.snap;
    state.view.snap = 0;
    els.snap.value = '0';
    toast('Snap disattivato.');
  } else {
    state.view.snap = state.lastSnap || 1;
    els.snap.value = String(state.view.snap);
    toast(`Snap ${state.view.snap} m.`);
  }
}

// ── salvataggi ──────────────────────────────────────────────────────────

async function saveManifest() {
  const result = await saveTextFile('map.json', state.editor.serializeSource(), 'Manifest mappa');
  if (result.ok) {
    toast(result.method === 'fs' ? 'Manifest salvato.' : 'Manifest scaricato.');
    state.editor.dirty = false;
    updateStatus();
  }
}

async function saveBundle() {
  const result = await saveTextFile('data-map.json', state.editor.serializeCompiled(), 'Bundle dati mappa');
  if (result.ok) {
    toast(result.method === 'fs' ? 'Bundle salvato.' : 'Bundle scaricato.');
    state.editor.dirty = false;
    clearDraft();
    updateStatus();
  }
}

async function saveEverything() {
  const result = await saveBoth(state.editor);
  if (result.ok) {
    toast(result.method === 'fs' ? 'Manifest e bundle salvati.' : 'Download avviati.');
    state.editor.dirty = false;
    clearDraft();
    updateStatus();
  }
}

function importFile() {
  els.fileInput.click();
}

async function resetOriginal() {
  if (!window.confirm('Ripristinare il manifest originale? Le modifiche non salvate andranno perse.')) return;
  const map = await fetchJSON('../maps/fidenza/map.json');
  clearDraft();
  state.editor.reset(map);
  state.view.state = state.editor;
  state.view.drawing = null;
  state.view.activeVertex = null;
  state.view.mode = 'select';
  state.inspector.state = state.editor;
  els.title.textContent = `${map.name || 'Fidenza'} · editor mappa`;
  state.lastSelection = '';
  state.inspector.render();
  onChange({ final: true });
  toast('Manifest originale ripristinato.');
}

// ── command palette ─────────────────────────────────────────────────────

function commandItems() {
  const editor = state.editor;
  const selection = editor.selection;
  const commands = [
    { group: 'Salva', label: 'Salva manifest', hint: 'Ctrl+S', run: saveManifest },
    { group: 'Salva', label: 'Salva manifest e bundle', hint: 'Ctrl+Shift+S', run: saveEverything },
    { group: 'Salva', label: 'Salva bundle dati', hint: 'data/map.json', run: saveBundle },
    { group: 'File', label: 'Importa manifest JSON', hint: 'Ctrl+O', run: importFile },
    { group: 'File', label: 'Ripristina manifest originale', hint: 'reset', run: resetOriginal },
    { group: 'Storia', label: 'Annulla', hint: 'Ctrl+Z', run: () => { editor.undo(); onChange({ final: true }); } },
    { group: 'Storia', label: 'Ripeti', hint: 'Ctrl+Y', run: () => { editor.redo(); onChange({ final: true }); } },
    { group: 'Modalità', label: 'Seleziona', hint: 'V', run: () => setMode('select') },
    { group: 'Modalità', label: 'Mano / pan', hint: 'H', run: () => setMode('pan') },
    { group: 'Disegna', label: 'Nuova strada', hint: 'R', run: () => { setMode('drawRoad'); toast('Disegna strada: clicca sulla mappa.', 2600); } },
    { group: 'Disegna', label: 'Nuova area', hint: 'A', run: () => { setMode('drawArea'); toast('Disegna area: clicca i vertici.', 2600); } },
    { group: 'Disegna', label: 'Nuovo edificio', hint: 'B', run: () => { setMode('drawBuilding'); toast('Disegna edificio: clicca i vertici.', 2600); } },
    { group: 'Disegna', label: 'Nuovo corso d’acqua', hint: 'W', run: () => { setMode('drawWater'); toast('Disegna acqua: clicca i punti.', 2600); } },
    { group: 'Disegna', label: 'Nuova ferrovia', hint: 'T', run: () => { setMode('drawRail'); toast('Disegna ferrovia: clicca i punti.', 2600); } },
    { group: 'Aggiungi', label: 'Aggiungi POI', hint: 'P', run: () => setMode('addPlace') },
    { group: 'Aggiungi', label: 'Aggiungi stella', hint: 'S', run: () => setMode('addStar') },
    { group: 'Vista', label: 'Inquadra tutta la città', hint: 'F', run: () => state.view.fit() },
    { group: 'Vista', label: 'Centra sulla selezione', hint: 'Shift+F', run: () => { const anchor = editor.selectionAnchor(); if (anchor) state.view.focusOn(anchor.x, anchor.z); } },
    { group: 'Vista', label: 'Zoom avanti', hint: '+', run: () => state.view.zoomBy(1.22) },
    { group: 'Vista', label: 'Zoom indietro', hint: '−', run: () => state.view.zoomBy(1 / 1.22) },
    { group: 'Snap', label: state.view?.snap ? 'Disattiva snap' : 'Attiva snap', hint: 'G', run: toggleSnap },
    { group: 'Aiuto', label: 'Mostra scorciatoie', hint: '?', run: () => openHelp() }
  ];
  if (selection) {
    commands.push({ group: 'Selezione', label: 'Duplica selezione', hint: 'Ctrl+D', run: () => { editor.duplicateSelection(); onChange({ final: true }); } });
    commands.push({ group: 'Selezione', label: 'Elimina selezione', hint: 'Canc', run: () => deleteSelection() });
    if (editor.isMapKind(selection.kind)) {
      commands.push({ group: 'Geometria', label: 'Inverti direzione', hint: '', run: () => { editor.reverseFeature(selection.kind, selection.id); onChange({ final: true }); } });
      commands.push({ group: 'Geometria', label: 'Semplifica geometria', hint: '1,2 m', run: () => { editor.simplifyFeature(selection.kind, selection.id, 1.2); onChange({ final: true }); } });
      commands.push({ group: 'Geometria', label: 'Ripristina override', hint: '', run: () => { editor.resetOverride(); onChange({ final: true }); } });
      commands.push({ group: 'Geometria', label: 'Nascondi / mostra', hint: '', run: () => { editor.toggleHidden(); onChange({ final: true }); } });
    }
  }
  for (const tab of TAB_IDS) {
    const labels = { places: 'POI', buildings: 'Edifici', roads: 'Strade', areas: 'Aree', waterways: 'Acqua', railways: 'Ferrovia', custom: 'Custom', landmarks: 'Landmark', stars: 'Stelle', missions: 'Missioni', vehicles: 'Veicoli', props: 'Prop', overrides: 'Override' };
    commands.push({ group: 'Tab', label: `Apri tab ${labels[tab]}`, hint: String(TAB_IDS.indexOf(tab) + 1), run: () => selectTab(tab) });
  }
  return commands;
}

function paletteEntities(query) {
  const editor = state.editor;
  const out = [];
  const q = query.trim().toLowerCase();
  const push = (group, label, hint, run) => out.push({ group, label, hint, run });
  const matches = text => !q || String(text).toLowerCase().includes(q);
  for (const place of editor.map.places || []) {
    if (!matches(`${place.name} ${place.short || ''} ${place.id}`)) continue;
    push('POI', place.short || place.name, place.id, () => {
      editor.select({ kind: 'place', id: place.id });
      const anchor = editor.selectionAnchor();
      if (anchor) state.view.focusOn(anchor.x, anchor.z);
    });
    if (out.length >= 14) return out;
  }
  for (const mission of editor.map.missions || []) {
    if (!matches(`${mission.title} ${mission.id}`)) continue;
    push('Missione', mission.title || mission.id, `${mission.steps?.length || 0} tappe`, () => {
      editor.select({ kind: 'mission', id: mission.id });
      onChange({ final: true });
    });
    if (out.length >= 20) return out;
  }
  for (const kind of ['road', 'area', 'building', 'waterway', 'railway']) {
    const custom = editor.customList(kind).map(item => ({ ...item, custom: true }));
    const existing = editor.sourceList(kind).map(item => ({ ...item, custom: false }));
    for (const item of [...custom, ...existing]) {
      if (!matches(`${item.name || ''} ${item.id}`)) continue;
      push(featureLabel(kind), item.name || `${featureLabel(kind)} ${item.id}`, `${item.custom ? 'custom' : 'OSM'} · ${item.id}`, () => {
        editor.select({ kind, id: String(item.id), custom: !!item.custom });
        const anchor = editor.selectionAnchor();
        if (anchor) state.view.focusOn(anchor.x, anchor.z);
      });
      if (out.length >= 32) return out;
    }
  }
  return out;
}

function paletteItems(query) {
  const q = query.trim().toLowerCase();
  const commands = commandItems().filter(item => !q || `${item.group} ${item.label} ${item.hint}`.toLowerCase().includes(q));
  const entities = paletteEntities(query);
  return [...commands.slice(0, 24), ...entities].slice(0, 42);
}

function renderPalette() {
  const items = state.paletteItems;
  if (!items.length) {
    els.paletteList.innerHTML = `<p class="palette-empty">Nessun comando o elemento trovato.</p>`;
    return;
  }
  if (state.paletteIndex >= items.length) state.paletteIndex = 0;
  if (state.paletteIndex < 0) state.paletteIndex = items.length - 1;
  els.paletteList.innerHTML = items.map((item, index) =>
    `<button type="button" class="palette-item ${index === state.paletteIndex ? 'active' : ''}" data-index="${index}">
      <span class="palette-kind">${esc(item.group)}</span>
      <span class="palette-label">${esc(item.label)}</span>
      <span class="palette-hint">${esc(item.hint || '')}</span>
    </button>`
  ).join('');
  els.paletteList.querySelectorAll('.palette-item').forEach(button => {
    button.addEventListener('mouseenter', () => {
      state.paletteIndex = Number(button.dataset.index);
      els.paletteList.querySelectorAll('.palette-item').forEach((item, index) => item.classList.toggle('active', index === state.paletteIndex));
    });
    button.addEventListener('click', () => runPalette(Number(button.dataset.index)));
  });
}

function openPalette() {
  if (!state.editor) return;
  closeHelp();
  els.paletteOverlay.hidden = false;
  els.paletteInput.value = '';
  state.paletteIndex = 0;
  state.paletteItems = paletteItems('');
  renderPalette();
  requestAnimationFrame(() => els.paletteInput.focus());
}

function closePalette() {
  els.paletteOverlay.hidden = true;
  els.paletteInput.blur();
}

function runPalette(index) {
  const item = state.paletteItems[index];
  if (!item) return;
  closePalette();
  item.run();
}

function openHelp() {
  closePalette();
  els.helpOverlay.hidden = false;
  els.closeHelp.focus();
}

function closeHelp() {
  els.helpOverlay.hidden = true;
}

// ── cancella / geometria ────────────────────────────────────────────────

function deleteSelection() {
  if (!state.editor.selection) return;
  if (!window.confirm('Eliminare questo elemento?')) return;
  state.editor.deleteSelection();
  onChange({ final: true });
}

function deleteActiveVertex() {
  const selection = state.editor.selection;
  if (!selection || !state.editor.isMapKind(selection.kind) || state.view.activeVertex == null) return false;
  const index = state.view.activeVertex;
  if (!state.editor.removeFeatureVertex(selection.kind, selection.id, index)) {
    toast('Servono almeno 2 vertici per una linea o 3 per un poligono.');
    return true;
  }
  state.view.activeVertex = Math.max(0, Math.min(index, (state.editor.selectionGeometry()?.length || 1) - 1));
  state.editor.refresh();
  onChange({ final: true });
  return true;
}

function nudgeActiveVertex(dx, dz) {
  const selection = state.editor.selection;
  if (!selection || !state.editor.isMapKind(selection.kind) || state.view.activeVertex == null) return false;
  const points = state.editor.selectionGeometry();
  const point = points?.[state.view.activeVertex];
  if (!point) return false;
  state.editor.pushUndo('sposta vertice');
  state.editor.setFeatureVertex(selection.kind, selection.id, state.view.activeVertex, point[0] + dx, point[1] + dz);
  state.editor.refresh();
  onChange({ final: true });
  return true;
}

// ── tastiera ────────────────────────────────────────────────────────────

function isTyping(event) {
  const target = event.target;
  if (!target) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

function handleShortcut(event) {
  if (!state.editor || !state.view) return;
  const key = String(event.key || '').toLowerCase();
  const mod = event.metaKey || event.ctrlKey;
  const typing = isTyping(event);

  if (mod && key === 'k') {
    event.preventDefault();
    if (els.paletteOverlay.hidden) openPalette(); else closePalette();
    return;
  }
  if (!els.paletteOverlay.hidden) {
    if (event.key === 'Escape') closePalette();
    return;
  }
  if (!els.helpOverlay.hidden) {
    if (event.key === 'Escape') closeHelp();
    return;
  }
  if (mod) {
    if (key === 's') {
      event.preventDefault();
      if (event.shiftKey) saveEverything(); else saveManifest();
      return;
    }
    if (key === 'o') { event.preventDefault(); importFile(); return; }
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) state.editor.redo(); else state.editor.undo();
      onChange({ final: true });
      return;
    }
    if (key === 'y') { event.preventDefault(); state.editor.redo(); onChange({ final: true }); return; }
    if (key === 'd') { event.preventDefault(); state.editor.duplicateSelection(); onChange({ final: true }); return; }
    return;
  }
  if (typing) return;

  if (state.view.drawing) {
    if (event.key === 'Enter') { event.preventDefault(); state.view.finishDrawing(); return; }
    if (event.key === 'Escape') { event.preventDefault(); state.view.cancelDrawing(); return; }
    if (event.key === 'Backspace') { event.preventDefault(); state.view.undoDrawingPoint(); return; }
  }

  const arrow = event.key.startsWith('Arrow');
  if (arrow) {
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      state.editor.rotateSelection(event.key === 'ArrowLeft' ? -5 : 5);
      onChange({ final: true });
      return;
    }
    if (event.altKey) return;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dz = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    if (!nudgeActiveVertex(dx, dz)) {
      if (state.editor.nudgeSelection(dx, dz)) onChange({ final: true });
    }
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    if (deleteActiveVertex()) return;
    deleteSelection();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    if (state.view.cancelDrawing()) return;
    if (state.view.activeVertex != null) {
      state.view.activeVertex = null;
      state.view.scheduleRender();
      return;
    }
    state.editor.select(null);
    setMode('select');
    onChange({ final: true });
    return;
  }
  if (event.key === 'Enter') {
    if (state.view.finishDrawing()) event.preventDefault();
    return;
  }
  if (event.key === ' ') {
    if (!event.repeat) {
      state.view.spacePan = true;
      els.canvas.style.cursor = 'grabbing';
    }
    event.preventDefault();
    return;
  }
  if (event.key === '?' || event.key === 'F1') { event.preventDefault(); openHelp(); return; }
  if (event.key === '+' || event.key === '=') { event.preventDefault(); state.view.zoomBy(1.22); return; }
  if (event.key === '-' || event.key === '_') { event.preventDefault(); state.view.zoomBy(1 / 1.22); return; }
  if (event.key === '0') { event.preventDefault(); state.view.fit(); return; }
  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    selectTab(TAB_IDS[Number(event.key) - 1]);
    return;
  }

  if (key === 'v') { setMode('select'); return; }
  if (key === 'h') { setMode('pan'); return; }
  if (key === 'm') { setMode('select'); toast('Modalità sposta: trascina l’elemento selezionato.', 1500); return; }
  if (key === 'r') { setMode('drawRoad'); return; }
  if (key === 'a') { setMode('drawArea'); return; }
  if (key === 'b') { setMode('drawBuilding'); return; }
  if (key === 'w') { setMode('drawWater'); return; }
  if (key === 't') { setMode('drawRail'); return; }
  if (key === 'p') { setMode('addPlace'); return; }
  if (key === 's') { setMode('addStar'); return; }
  if (key === 'g') { toggleSnap(); return; }
  if (key === 'f') {
    event.preventDefault();
    if (event.shiftKey) {
      const anchor = state.editor.selectionAnchor();
      if (anchor) state.view.focusOn(anchor.x, anchor.z);
    } else {
      state.view.fit();
    }
    return;
  }
  if (key === ',') { state.editor.rotateSelection(-5); onChange({ final: true }); return; }
  if (key === '.') { state.editor.rotateSelection(5); onChange({ final: true }); return; }
}

// ── load / UI ───────────────────────────────────────────────────────────

async function load() {
  try {
    const [map, city] = await Promise.all([
      fetchJSON('../maps/fidenza/map.json'),
      fetchJSON('../data/city.json')
    ]);
    state.map = map;
    state.city = city;
    const draft = loadDraft();
    const initial = draft || map;
    state.editor = new EditorState({ map: initial, city, mapPath: '../maps/fidenza/map.json' });
    if (draft) {
      state.editor.dirty = true;
      toast('Bozza locale ripristinata. Usa “Ripristina originale” per ricaricare il file.', 4200);
    }
    state.view = new MapView({
      canvas: els.canvas,
      state: state.editor,
      onChange,
      onStatus: (coords, scale) => updateStatus(coords, scale),
      onDrawing: info => {
        updateDrawHint(info);
        syncModeButtons();
      }
    });
    state.inspector = new Inspector({
      root: els.inspector,
      state: state.editor,
      onFocus: (x, z) => state.view.focusOn(x, z),
      onChange: () => onChange({ final: true }),
      confirmDelete: () => window.confirm('Eliminare questo elemento?'),
      onAddStep: missionId => {
        state.view.pendingMissionId = missionId;
        setMode('addMissionStep');
        toast('Clicca sulla mappa per aggiungere la tappa.');
      }
    });
    state.editor.on(onStateChanged);
    state.view.resize();
    state.view.fit();
    state.view.focusOn(-140, 30, 0.45);
    state.lastSelection = '';
    state.inspector.render();
    renderList();
    renderTabTools();
    renderValidation();
    updateStatus();
    setMode('select');
    els.title.textContent = `${map.name} · editor mappa`;
    window.__editor = {
      state,
      view: state.view,
      inspector: state.inspector,
      palette: { open: openPalette, close: closePalette },
      help: { open: openHelp, close: closeHelp }
    };
    const observer = new ResizeObserver(() => state.view.resize());
    observer.observe(els.canvas.parentElement);
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `<div class="fatal"><h1>Errore editor</h1><p>${esc(error.message)}</p><p>Avvia il progetto con un server statico: <code>python3 -m http.server 8081</code></p></div>`;
  }
}

function bindUI() {
  $('btn-undo').addEventListener('click', () => { state.editor.undo(); onChange({ final: true }); });
  $('btn-redo').addEventListener('click', () => { state.editor.redo(); onChange({ final: true }); });
  $('btn-fit').addEventListener('click', () => state.view.fit());
  $('btn-focus').addEventListener('click', () => {
    const anchor = state.editor.selectionAnchor();
    if (anchor) state.view.focusOn(anchor.x, anchor.z);
  });
  $('btn-command').addEventListener('click', openPalette);
  $('btn-help').addEventListener('click', openHelp);
  $('btn-save-manifest').addEventListener('click', saveManifest);
  $('btn-save-bundle').addEventListener('click', saveBundle);
  $('btn-save-both').addEventListener('click', saveEverything);
  $('btn-import').addEventListener('click', importFile);
  $('btn-reset').addEventListener('click', resetOriginal);
  $('btn-clear-draft').addEventListener('click', () => {
    clearDraft();
    toast('Bozza locale eliminata.');
  });
  $('btn-game').addEventListener('click', event => {
    event.preventDefault();
    window.open('../index.html', '_blank');
  });
  els.modeSelect.addEventListener('click', () => setMode('select'));
  els.modePan.addEventListener('click', () => setMode('pan'));
  els.modePlace.addEventListener('click', () => setMode('addPlace'));
  els.modeStar.addEventListener('click', () => setMode('addStar'));
  bindDrawButtons(els.drawTools);
  els.snap.addEventListener('change', () => {
    state.view.snap = Number(els.snap.value) || 0;
    if (state.view.snap) state.lastSnap = state.view.snap;
  });
  els.search.addEventListener('input', () => { state.search = els.search.value; renderList(); });
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
  });
  document.querySelectorAll('[data-layer]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      state.view.layers[checkbox.dataset.layer] = checkbox.checked;
      state.view._index = null;
      state.view.scheduleRender();
    });
  });
  els.fileInput.addEventListener('change', async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    try {
      const map = await importJSON(file);
      state.editor = new EditorState({ map, city: state.city });
      state.view.state = state.editor;
      state.view._index = null;
      state.view.drawing = null;
      state.view.activeVertex = null;
      state.view.mode = 'select';
      state.inspector.state = state.editor;
      state.editor.on(onStateChanged);
      state.view.resize();
      state.view.fit();
      state.view.focusOn(-140, 30, 0.45);
      state.lastSelection = '';
      state.inspector.render();
      els.title.textContent = `${map.name || 'Mappa'} · editor mappa`;
      onChange({ final: true });
      window.__editor.state = state;
      toast('Manifest importato.');
    } catch (error) {
      toast(`Import non riuscito: ${error.message}`, 4000);
    } finally {
      els.fileInput.value = '';
    }
  });
  els.paletteInput.addEventListener('input', () => {
    state.paletteIndex = 0;
    state.paletteItems = paletteItems(els.paletteInput.value);
    renderPalette();
  });
  els.paletteInput.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.paletteIndex++;
      renderPalette();
      els.paletteList.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.paletteIndex--;
      renderPalette();
      els.paletteList.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runPalette(state.paletteIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });
  els.paletteOverlay.addEventListener('pointerdown', event => {
    if (event.target === els.paletteOverlay) closePalette();
  });
  els.closeHelp.addEventListener('click', closeHelp);
  els.helpOverlay.addEventListener('pointerdown', event => {
    if (event.target === els.helpOverlay) closeHelp();
  });
  window.addEventListener('keydown', handleShortcut);
  window.addEventListener('keyup', event => {
    if (event.key === ' ' && state.view) {
      state.view.spacePan = false;
      syncModeButtons();
    }
  });
  window.addEventListener('beforeunload', event => {
    if (state.editor?.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

bindUI();
load();
