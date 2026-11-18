import { EditorState } from './state.js';
import { MapView } from './map-view.js';
import { Inspector } from './inspector.js';
import {
  fetchJSON, loadDraft, saveDraft, clearDraft, importJSON,
  saveTextFile, saveBoth, loadImage
} from './io.js';
import { featureLabel } from './geometry.js';
import {
  AREA_BLOCK_FALLBACK, ROAD_BLOCK_FALLBACK, SIDEWALK_FALLBACK,
  BLOCK_CATEGORY_ORDER, blockLabel, roofFallbackBlock, wallFallbackBlock
} from '../../js/block-palette.js';
import { createBlockCanvas } from '../../js/block-textures.js';
import { TileLayer } from './tile-layer.js';
import { WORLD } from '../../js/config.js';

const $ = id => document.getElementById(id);
const TAB_IDS = ['places', 'buildings', 'roads', 'areas', 'waterways', 'railways', 'custom', 'materials', 'landmarks', 'stars', 'missions', 'vehicles', 'props', 'overrides'];
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
  lastSnap: 1,
  materialSlot: null,
  materialCategory: 'all',
  materialBrush: null,
  swatchCache: new Map()
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
  publish: $('btn-publish'),
  publishDialog: $('publish-dialog'),
  publishRepo: $('publish-repo'),
  publishBase: $('publish-base'),
  publishToken: $('publish-token'),
  publishSummary: $('publish-summary'),
  publishStatus: $('publish-status'),
  publishGo: $('publish-go'),
  publishExport: $('publish-export'),
  publishCancel: $('publish-cancel'),
  publishClose: $('publish-close'),
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
  if (state.tab === 'materials') {
    renderMaterialsList();
    return;
  }
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

function materialSlots(selection) {
  if (!selection) return [];
  if (selection.kind === 'building') {
    return [
      { key: 'wall', label: 'Muro' },
      { key: 'roof', label: 'Tetto' },
      { key: 'glass', label: 'Vetro' }
    ];
  }
  if (selection.kind === 'road') {
    return [
      { key: 'surface', label: 'Manto' },
      { key: 'side', label: 'Marciapiede' }
    ];
  }
  if (selection.kind === 'area') return [{ key: 'surface', label: 'Superficie' }];
  if (selection.kind === 'waterway') return [{ key: 'bank', label: 'Sponda' }];
  return [];
}

function activeMaterialSlot() {
  if (!state.editor?.selection) return null;
  const slots = materialSlots(state.editor.selection);
  if (!slots.length) return null;
  if (!slots.some(slot => slot.key === state.materialSlot)) state.materialSlot = slots[0].key;
  return state.materialSlot;
}

function selectedFeatureSource() {
  const selection = state.editor?.selection;
  if (!selection || !['building', 'road', 'area', 'waterway'].includes(selection.kind)) return null;
  return selection.custom
    ? state.editor.customFeature(selection.kind, selection.id)
    : (state.editor.patchedFeature(selection.kind, selection.id) || state.editor.sourceFeature(selection.kind, selection.id));
}

function swatchFor(block) {
  if (state.swatchCache.has(block)) return state.swatchCache.get(block);
  const url = createBlockCanvas(block, { size: 16 }).toDataURL();
  state.swatchCache.set(block, url);
  return url;
}

function slotForKind(kind, preferred = state.materialSlot) {
  const slots = materialSlots({ kind });
  if (!slots.length) return null;
  return slots.some(slot => slot.key === preferred) ? preferred : slots[0].key;
}

function activateMaterialBrush(block, slot = null) {
  state.materialBrush = { block, slot };
  state.materialSlot = slot || state.materialSlot;
  if (state.view) state.view.mode = 'paintMaterial';
  syncModeButtons();
  renderTabTools();
  toast(`Pennello ${blockLabel(block)}: clicca una feature per applicarlo.`, 2600);
}

function applyBlockToSelection(block) {
  const selection = state.editor?.selection;
  if (!selection || !['building', 'road', 'area', 'waterway'].includes(selection.kind)) {
    activateMaterialBrush(block, state.materialSlot);
    return;
  }
  const slot = slotForKind(selection.kind);
  if (!slot) return;
  const ok = state.editor.setFeatureBlock(selection.kind, selection.id, slot, block);
  if (ok) {
    toast(`Blocco applicato: ${blockLabel(block)}`, 1800);
    activateMaterialBrush(block, slot);
  }
}

function paintMaterialAt(hit, block = state.materialBrush?.block) {
  if (!block || !hit) return;
  const slot = slotForKind(hit.kind, state.materialBrush?.slot);
  if (!slot) return;
  const ok = state.editor.setFeatureBlock(hit.kind, hit.id, slot, block);
  if (ok) {
    state.editor.select({ kind: hit.kind, id: String(hit.id), custom: !!hit.custom });
    toast(`${blockLabel(block)} → ${featureLabel(hit.kind)}`, 1400);
  }
}

function renderMaterialsTools() {
  const selection = state.editor?.selection;
  const slots = materialSlots(selection);
  const active = slots.length ? activeMaterialSlot() : null;
  const source = selectedFeatureSource();
  const kind = selection?.kind;
  const arnisValue = selection && active ? state.editor.effectiveArnisBlock(kind, selection.id, active) : null;
  const fallbackValue = kind === 'road'
    ? (active === 'side' ? SIDEWALK_FALLBACK : (ROAD_BLOCK_FALLBACK[source?.kind] || 'gray_concrete_powder'))
    : kind === 'area'
      ? (AREA_BLOCK_FALLBACK[source?.kind] || 'grass_block')
      : kind === 'building'
        ? (active === 'wall' ? wallFallbackBlock(source) : active === 'glass' ? 'glass' : roofFallbackBlock(source))
        : 'clay';
  const autoValue = arnisValue || fallbackValue;
  const current = source?.blocks?.[active] || '';
  els.tabTools.innerHTML = `
    <div class="material-slots">
      ${slots.map(slot => `<button type="button" class="material-slot ${slot.key === active ? 'active' : ''}" data-material-slot="${slot.key}">${slot.label}</button>`).join('')}
    </div>
    ${selection ? `<div class="material-current">
      <span>${current ? `Blocco: ${blockLabel(current)}` : `Auto · ${arnisValue ? 'Arnis' : 'default'}: ${autoValue ? blockLabel(autoValue) : '—'}`}</span>
      ${current ? '<button type="button" class="linkish" data-clear-block>Rimuovi</button>' : ''}
    </div>` : '<div class="material-current"><span>Nessuna feature selezionata: scegli un blocco per attivare il pennello.</span></div>'}
    <div class="material-categories">
      ${['all', ...BLOCK_CATEGORY_ORDER].map(category => `<button type="button" data-material-category="${category}" class="${(state.materialCategory || 'all') === category ? 'active' : ''}">${category === 'all' ? 'Tutti' : category[0].toUpperCase() + category.slice(1)}</button>`).join('')}
    </div>
    <span class="tool-label">${selection ? `Clicca un blocco per applicarlo a “${slots.find(slot => slot.key === active)?.label || ''}”.` : 'Clicca un blocco, poi una feature sulla mappa.'}</span>
    ${state.materialBrush?.block ? `<div class="material-brush"><span>Pennello: <b>${esc(blockLabel(state.materialBrush.block))}</b></span><button type="button" data-brush-off>Termina</button></div>` : ''}`;
  els.tabTools.querySelectorAll('[data-material-slot]').forEach(button => {
    button.addEventListener('click', () => {
      state.materialSlot = button.dataset.materialSlot;
      renderTabTools();
      renderMaterialsList();
    });
  });
  els.tabTools.querySelectorAll('[data-material-category]').forEach(button => {
    button.addEventListener('click', () => {
      state.materialCategory = button.dataset.materialCategory;
      renderTabTools();
      renderMaterialsList();
    });
  });
  els.tabTools.querySelector('[data-brush-off]')?.addEventListener('click', () => {
    state.materialBrush = null;
    if (state.view) state.view.mode = 'select';
    syncModeButtons();
    renderTabTools();
    toast('Pennello disattivato.', 1600);
  });
  els.tabTools.querySelector('[data-clear-block]')?.addEventListener('click', () => {
    const slot = activeMaterialSlot();
    if (!slot) return;
    state.editor.setFeatureBlock(selection.kind, selection.id, slot, null, { clear: true });
    toast('Materiale rimosso: torna il default Arnis.', 2000);
  });
}

function renderMaterialsList() {
  if (!state.editor) return;
  const category = state.materialCategory || 'all';
  const query = state.search.trim().toLowerCase();
  const blocks = state.editor.blockOptions().filter(block =>
    (category === 'all' || block.category === category) &&
    (!query || block.key.includes(query) || block.label.toLowerCase().includes(query))
  );
  if (!blocks.length) {
    els.list.innerHTML = '<p class="empty-list">Nessun blocco trovato.</p>';
    return;
  }
  els.list.innerHTML = blocks.map(block => `
    <button type="button" class="material-row" data-block="${block.key}">
      <span class="material-swatch" style="background-image:url('${swatchFor(block.key)}')"></span>
      <span class="material-meta"><b>${esc(block.label)}</b><small>${esc(block.category)}${block.count ? ` · ${block.count}` : ''}</small></span>
    </button>`).join('');
  els.list.querySelectorAll('[data-block]').forEach(button => {
    button.addEventListener('click', () => applyBlockToSelection(button.dataset.block));
  });
}

function renderTabTools() {
  if (!state.editor || !els.tabTools) return;
  if (state.tab === 'materials') {
    renderMaterialsTools();
  } else if (state.tab === 'missions') {
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
    els.canvas.style.cursor = mode === 'pan' ? 'grab' : ['addPlace', 'addStar', 'addProp', 'addMissionStep', 'paintMaterial'].includes(mode) || mode.startsWith('draw') ? 'crosshair' : 'default';
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
  if (els.search) els.search.placeholder = tab === 'materials' ? 'Cerca un blocco…' : 'Cerca nome, ID, OSM…';
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

// ── pubblicazione GitHub (PAT, solo GitHub Pages) ────────────────────────

const GITHUB_TOKEN_KEY = 'fidenza-github-token';
const GITHUB_REPO_KEY = 'fidenza-github-repo';
const GITHUB_BASE_KEY = 'fidenza-github-base';

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

async function githubRequest(path, { token, method = 'GET', body = null } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await response.json(); } catch { /* risposta vuota */ }
  if (!response.ok) {
    const detail = Array.isArray(data?.errors)
      ? ` (${data.errors.map(error => error.message || error.code).join(', ')})`
      : '';
    throw new Error(`${response.status}: ${data?.message || response.statusText}${detail}`);
  }
  return data;
}

function publishSummaryData() {
  const map = state.editor?.map || {};
  const overrides = Object.values(map.overrides || {}).reduce((sum, group) => sum + Object.keys(group || {}).length, 0);
  const custom = Object.values(map.custom || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  const materialOverrides = [
    ...Object.values(map.overrides || {}).flatMap(group => Object.values(group || {})),
    ...Object.values(map.custom || {}).flatMap(list => Array.isArray(list) ? list : [])
  ].filter(item => item?.blocks && Object.keys(item.blocks).length).length;
  const errors = state.editor?.validation?.errors?.length || 0;
  const warnings = state.editor?.validation?.warnings?.length || 0;
  return { overrides, custom, materialOverrides, errors, warnings, dirty: !!state.editor?.dirty };
}

function renderPublishSummary() {
  if (!els.publishSummary) return;
  const summary = publishSummaryData();
  els.publishSummary.innerHTML = `
    <b>${summary.overrides}</b> override · <b>${summary.custom}</b> feature custom · <b>${summary.materialOverrides}</b> con materiali<br>
    Validazione: ${summary.errors ? `<span class="bad">${summary.errors} errori bloccanti</span>` : '✓ nessun errore'}${summary.warnings ? ` · ${summary.warnings} avvisi` : ''}<br>
    ${summary.dirty ? 'Bozza modificata non ancora pubblicata.' : 'Nessuna modifica locale pendente.'}`;
  if (els.publishGo) els.publishGo.disabled = summary.errors > 0;
  return summary;
}

function openPublishDialog() {
  if (!state.editor || state.readonly) {
    toast(state.readonly ? 'Modalità revisione: pubblicazione disabilitata.' : 'Editor non pronto.', 2600);
    return;
  }
  if (!els.publishDialog) return;
  els.publishRepo.value = localStorage.getItem(GITHUB_REPO_KEY) || 'LucaGandolfi77/random2';
  els.publishBase.value = localStorage.getItem(GITHUB_BASE_KEY) || 'main';
  els.publishToken.value = sessionStorage.getItem(GITHUB_TOKEN_KEY) || '';
  els.publishStatus.textContent = '';
  els.publishStatus.classList.remove('bad');
  renderPublishSummary();
  els.publishDialog.showModal();
  if (!els.publishToken.value) setTimeout(() => els.publishToken.focus(), 30);
}

function closePublishDialog() {
  els.publishDialog?.close();
}

async function publishToGitHub() {
  if (!state.editor) return;
  const repo = els.publishRepo.value.trim();
  const base = els.publishBase.value.trim() || 'main';
  const token = els.publishToken.value.trim();
  const summary = publishSummaryData();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    els.publishStatus.textContent = 'Repository non valido: usa owner/repo.';
    els.publishStatus.classList.add('bad');
    return;
  }
  if (!token) {
    els.publishStatus.textContent = 'Incolla un fine-grained PAT con Contents e Pull requests in scrittura.';
    els.publishStatus.classList.add('bad');
    els.publishToken.focus();
    return;
  }
  if (summary.errors) {
    els.publishStatus.textContent = 'Correggi gli errori di validazione prima di pubblicare.';
    els.publishStatus.classList.add('bad');
    return;
  }
  localStorage.setItem(GITHUB_REPO_KEY, repo);
  localStorage.setItem(GITHUB_BASE_KEY, base);
  sessionStorage.setItem(GITHUB_TOKEN_KEY, token);
  els.publishGo.disabled = true;
  els.publishExport.disabled = true;
  els.publishStatus.classList.remove('bad');
  els.publishStatus.textContent = 'Creo il branch e il commit…';
  try {
    const branch = `editor/${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19)}`;
    const [owner, name] = repo.split('/');
    const ref = await githubRequest(`/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(base)}`, { token });
    const baseCommitSha = ref.object.sha;
    const baseCommit = await githubRequest(`/repos/${owner}/${name}/git/commits/${baseCommitSha}`, { token });
    const files = [
      ['maps/fidenza/map.json', state.editor.serializeSource()],
      ['data/map.json', state.editor.serializeCompiled()]
    ];
    const blobs = [];
    for (const [path, content] of files) {
      const blob = await githubRequest(`/repos/${owner}/${name}/git/blobs`, {
        token,
        method: 'POST',
        body: { content: textToBase64(content), encoding: 'base64' }
      });
      blobs.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    els.publishStatus.textContent = 'Preparo l’albero e il commit…';
    const tree = await githubRequest(`/repos/${owner}/${name}/git/trees`, {
      token,
      method: 'POST',
      body: { base_tree: baseCommit.tree.sha, tree: blobs }
    });
    const commit = await githubRequest(`/repos/${owner}/${name}/git/commits`, {
      token,
      method: 'POST',
      body: {
        message: `editor: aggiorna mappa Fidenza (${summary.overrides} override, ${summary.custom} custom)`,
        tree: tree.sha,
        parents: [baseCommitSha]
      }
    });
    await githubRequest(`/repos/${owner}/${name}/git/refs`, {
      token,
      method: 'POST',
      body: { ref: `refs/heads/${branch}`, sha: commit.sha }
    });
    els.publishStatus.textContent = 'Apro la pull request…';
    const pr = await githubRequest(`/repos/${owner}/${name}/pulls`, {
      token,
      method: 'POST',
      body: {
        title: `editor: aggiorna Fidenza (${summary.overrides} override, ${summary.custom} custom)`,
        head: branch,
        base,
        body: [
          'Pubblicazione dall’editor di Fidenza.',
          '',
          `- Override: **${summary.overrides}**`,
          `- Feature custom: **${summary.custom}**`,
          `- Elementi con materiali: **${summary.materialOverrides}**`,
          `- Errori validazione: **${summary.errors}**`,
          `- Avvisi: **${summary.warnings}**`,
          '',
          'File aggiornati: `maps/fidenza/map.json`, `data/map.json`.',
          'Generato da Fidenza Editor.'
        ].join('\n')
      }
    });
    els.publishStatus.innerHTML = `PR creata: <a href="${esc(pr.html_url)}" target="_blank" rel="noopener">${esc(pr.html_url)}</a>`;
    state.editor.dirty = false;
    updateStatus();
    toast('Pull request creata. Verrà pubblicata dopo il merge e il deploy Pages.', 4200);
  } catch (error) {
    els.publishStatus.textContent = `Pubblicazione non riuscita: ${error.message}`;
    els.publishStatus.classList.add('bad');
  } finally {
    els.publishGo.disabled = false;
    els.publishExport.disabled = false;
    renderPublishSummary();
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
    { group: 'Pubblica', label: 'Pubblica su GitHub (PR)', hint: 'token', run: openPublishDialog },
    { group: 'Pubblica', label: 'Esporta manifest e bundle', hint: 'download', run: () => { saveManifest(); saveBundle(); } },
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
    if (state.materialBrush) {
      state.materialBrush = null;
      state.view.mode = 'select';
      syncModeButtons();
      renderTabTools();
      toast('Pennello disattivato.', 1600);
      return;
    }
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
    const [map, city, arnis, surfaceManifest] = await Promise.all([
      fetchJSON('../maps/fidenza/map.json'),
      fetchJSON('../data/city.json'),
      fetchJSON('../data/arnis/arnis.json').catch(error => {
        console.warn('Tile Arnis non disponibili nell’editor', error);
        return null;
      }),
      fetchJSON('../data/arnis/surface.json').catch(() => null)
    ]);
    let tileLayer = null;
    if (arnis) {
      let manifest = surfaceManifest;
      let fallbackImage = null;
      if (!manifest) {
        fallbackImage = await loadImage('../data/arnis/surface.png');
        if (fallbackImage) {
          manifest = {
            bounds: arnis.meta?.gameBounds || WORLD.bounds,
            levels: [{
              id: 'z0',
              src: 'surface.png',
              width: fallbackImage.naturalWidth,
              height: fallbackImage.naturalHeight,
              blocksPerPixel: 1
            }]
          };
        }
      }
      if (manifest) {
        tileLayer = new TileLayer({
          baseUrl: '../data/arnis/',
          manifest,
          fallbackImage,
          onReady: () => state.view?.scheduleRender()
        });
        await tileLayer.loadInitial();
        tileLayer.loadRest();
      }
    }
    state.map = map;
    state.city = city;
    state.arnis = arnis;
    state.tileLayer = tileLayer;
    const draft = loadDraft();
    const initial = draft || map;
    state.editor = new EditorState({ map: initial, city, arnis, mapPath: '../maps/fidenza/map.json' });
    if (draft) {
      state.editor.dirty = true;
      toast('Bozza locale ripristinata. Usa “Ripristina originale” per ricaricare il file.', 4200);
    }
    state.view = new MapView({
      canvas: els.canvas,
      state: state.editor,
      arnis,
      tileLayer,
      onChange,
      onStatus: (coords, scale) => updateStatus(coords, scale),
      onDrawing: info => {
        updateDrawHint(info);
        syncModeButtons();
      },
      onPaintMaterial: hit => paintMaterialAt(hit)
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
    const params = new URLSearchParams(location.search);
    const featureParam = params.get('feature');
    if (featureParam) {
      const [kind, ...rest] = featureParam.split(':');
      const id = rest.join(':');
      const custom = !!state.editor.customFeature(kind, id);
      if (state.editor.feature(kind, id)) {
        state.editor.select({ kind, id, custom });
        const tabName = { building: 'buildings', road: 'roads', area: 'areas', waterway: 'waterways', railway: 'railways' }[kind];
        if (tabName) selectTab(tabName);
        const anchor = state.editor.selectionAnchor();
        if (anchor) state.view.focusOn(anchor.x, anchor.z, 1.2);
      }
    }
    state.readonly = params.get('readonly') === '1';
    if (state.readonly) {
      document.body.classList.add('readonly');
      toast('Modalità revisione: le modifiche non verranno pubblicate.', 4200);
    }
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
      arnis,
      tileLayer,
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
  els.publish?.addEventListener('click', openPublishDialog);
  els.publishClose?.addEventListener('click', closePublishDialog);
  els.publishCancel?.addEventListener('click', closePublishDialog);
  els.publishExport?.addEventListener('click', async () => {
    await saveManifest();
    await saveBundle();
  });
  els.publishGo?.addEventListener('click', publishToGitHub);
  els.publishDialog?.addEventListener('click', event => {
    if (event.target === els.publishDialog) closePublishDialog();
  });
  els.fileInput.addEventListener('change', async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    try {
      const map = await importJSON(file);
      state.editor = new EditorState({ map, city: state.city, arnis: state.arnis });
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
