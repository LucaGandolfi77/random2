import { EditorState } from './state.js';
import { MapView } from './map-view.js';
import { Inspector } from './inspector.js';
import {
  fetchJSON, loadDraft, saveDraft, clearDraft, importJSON,
  saveTextFile, saveBoth, downloadText, DRAFT_KEY
} from './io.js';

const $ = id => document.getElementById(id);
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
  dirty: false
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
  coords: $('coords'),
  zoom: $('zoom'),
  saveState: $('save-state'),
  undo: $('btn-undo'),
  redo: $('btn-redo'),
  title: $('map-title'),
  modeSelect: $('btn-mode-select'),
  modeMove: $('btn-mode-move'),
  modePlace: $('btn-mode-place'),
  modeStar: $('btn-mode-star'),
  snap: $('snap'),
  fileInput: $('file-input'),
  toast: $('toast')
};

function toast(text, ms = 2200) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove('show'), ms);
}

function selectionKey(sel) {
  return sel ? `${sel.kind}:${sel.id ?? ''}:${sel.index ?? ''}` : '';
}

function selectionFromValidation(row) {
  if (row.kind === 'place' || row.kind === 'beacon') return { kind: row.kind, id: row.id };
  if (row.kind === 'landmark') return { kind: 'landmark', id: row.id };
  if (row.kind === 'star') return { kind: 'star', id: row.id };
  if (row.kind === 'vehicle') {
    const idx = state.editor.compiled.vehicles?.findIndex(v => `${v.type}-${v.label}` === row.id);
    return idx >= 0 ? { kind: 'vehicle', index: idx } : null;
  }
  if (row.kind === 'mission-step') {
    const [id, index] = String(row.id).split(':');
    return { kind: 'missionStep', id, index: Number(index) };
  }
  if (row.kind === 'prop') return { kind: 'prop', id: row.id };
  if (row.kind === 'spawn') return { kind: 'spawn' };
  if (row.kind === 'missionBoard') return { kind: 'missionBoard' };
  if (row.kind === 'override') {
    const [group, id] = String(row.id).split(':');
    const kind = group === 'building' ? 'building' : group === 'road' ? 'road' : 'area';
    return { kind, id };
  }
  return null;
}

function renderList() {
  if (!state.editor) return;
  const ed = state.editor;
  const q = state.search.trim().toLowerCase();
  let items = [];
  if (state.tab === 'places') {
    items = ed.map.places.filter(p => !q || p.name?.toLowerCase().includes(q) || p.id.includes(q) || (p.osm || '').includes(q));
    items = items.map(p => ({
      key: `place:${p.id}`,
      title: p.short || p.name,
      sub: `${p.category}${p.collectible ? ' · collezionabile' : ''}`,
      sel: { kind: 'place', id: p.id }
    }));
  } else if (state.tab === 'landmarks') {
    items = ed.map.landmarks.filter(l => !q || l.id.includes(q) || l.place.includes(q)).map(l => ({
      key: `landmark:${l.id}`,
      title: l.id,
      sub: `${l.model}${l.hidden ? ' · nascosto' : ''}`,
      sel: { kind: 'landmark', id: l.id }
    }));
  } else if (state.tab === 'stars') {
    items = (ed.map.stars || []).filter(s => !q || s.id.includes(q)).map(s => ({
      key: `star:${s.id}`,
      title: s.id,
      sub: `${s.x}, ${s.z}`,
      sel: { kind: 'star', id: s.id }
    }));
  } else if (state.tab === 'missions') {
    items = (ed.map.missions || []).filter(m => !q || m.title?.toLowerCase().includes(q) || m.id.includes(q)).map(m => ({
      key: `mission:${m.id}`,
      title: m.title || m.id,
      sub: `${m.steps?.length || 0} tappe · ${m.time}s`,
      sel: { kind: 'mission', id: m.id }
    }));
  } else if (state.tab === 'vehicles') {
    items = (ed.map.vehicles || []).filter(v => !q || v.label?.toLowerCase().includes(q) || v.type.includes(q)).map((v, i) => ({
      key: `vehicle:${i}`,
      title: v.label || v.type,
      sub: `${v.type} · ${v.x}, ${v.z}`,
      sel: { kind: 'vehicle', index: i }
    }));
  } else if (state.tab === 'props') {
    items = (ed.map.props || []).filter(p => !q || p.id.includes(q) || p.type.includes(q) || (p.text || '').toLowerCase().includes(q)).map(p => ({
      key: `prop:${p.id}`,
      title: p.text || p.id,
      sub: `${p.type} · ${p.x}, ${p.z}`,
      sel: { kind: 'prop', id: p.id }
    }));
  } else if (state.tab === 'overrides') {
    for (const [group, entries] of Object.entries(ed.map.overrides || {})) {
      for (const [id, o] of Object.entries(entries || {})) {
        const kind = group === 'buildings' ? 'building' : group === 'roads' ? 'road' : group === 'areas' ? 'area' : null;
        if (!kind) continue;
        items.push({
          key: `override:${kind}:${id}`,
          title: `${kind} ${id}`,
          sub: Object.entries(o).map(([k, v]) => `${k}:${v}`).join(' · ') || 'override',
          sel: { kind, id }
        });
      }
    }
  }
  items = items.filter(i => !q || i.title.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)).slice(0, 400);
  els.list.innerHTML = items.length
    ? items.map(i => `<button type="button" class="entity-row" data-key="${encodeURIComponent(JSON.stringify(i.sel))}"><b>${esc(i.title)}</b><small>${esc(i.sub)}</small></button>`).join('')
    : `<p class="empty-list">Nessun elemento</p>`;
  els.list.querySelectorAll('.entity-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = JSON.parse(decodeURIComponent(btn.dataset.key));
      state.editor.select(sel);
      const a = state.editor.selectionAnchor();
      if (a) state.view.focusOn(a.x, a.z);
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
    els.tabTools.querySelectorAll('[data-prop-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.view.pendingPropType = btn.dataset.propType;
        setMode('addProp');
        renderTabTools();
        toast(`Prop: ${btn.textContent}. Clicca sulla mappa per posizionarlo.`);
      });
    });
  } else {
    els.tabTools.innerHTML = '';
  }
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderValidation() {
  if (!state.editor) return;
  const v = state.editor.validation;
  const errors = v.errors || [];
  els.badge.textContent = errors.length ? `${errors.length} ${errors.length === 1 ? 'errore' : 'errori'}` : 'valida';
  els.badge.className = `badge ${errors.length ? 'bad' : 'ok'}`;
  const rows = errors.length ? errors : [];
  els.validation.innerHTML = rows.length
    ? rows.map(r => `<button type="button" class="validation-row bad" data-row="${encodeURIComponent(JSON.stringify(r))}"><b>✗ ${esc(r.kind)}</b><span>${esc(r.id)}</span><small>${esc(r.msg)}</small></button>`).join('')
    : `<p class="empty-list">✓ Nessun problema rilevato. ${v.totals.checks} controlli superati.</p>`;
  els.validation.querySelectorAll('.validation-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = JSON.parse(decodeURIComponent(btn.dataset.row));
      const sel = selectionFromValidation(row);
      if (!sel) return;
      state.editor.select(sel);
      const a = state.editor.selectionAnchor();
      if (a) state.view.focusOn(a.x, a.z);
    });
  });
}

function updateStatus(coords = null, scale = null) {
  if (!state.editor) return;
  const ed = state.editor;
  const v = ed.validation;
  els.status.textContent = `${v.totals.checks} controlli · ${v.totals.errors} ${v.totals.errors === 1 ? 'errore' : 'errori'} · ${ed.overrideCount()} override · ${ed.dirty ? 'modificato' : 'salvato'}`;
  if (coords) {
    const ll = ed.originDef;
    const lat = ll.lat - coords.z / 111132;
    const lon = ll.lon + coords.x / (111320 * Math.cos(ll.lat * Math.PI / 180));
    els.coords.textContent = `x ${coords.x.toFixed(1)} · z ${coords.z.toFixed(1)} · ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
  if (scale) els.zoom.textContent = `${(scale * 100).toFixed(0)}%`;
  els.undo.disabled = ed.undoStack.length === 0;
  els.redo.disabled = ed.redoStack.length === 0;
  els.saveState.textContent = ed.dirty ? 'Modifiche non salvate' : 'Nessuna modifica';
  els.saveState.className = ed.dirty ? 'save-state dirty' : 'save-state';
}

function scheduleDraft() {
  clearTimeout(state.draftTimer);
  state.draftTimer = setTimeout(() => {
    if (!state.editor) return;
    saveDraft(state.editor.map);
    els.saveState.textContent = 'Bozza locale salvata';
    els.saveState.className = 'save-state saved';
  }, 500);
}

function onStateChanged() {
  if (!state.editor) return;
  state.view.render();
  renderList();
  renderTabTools();
  renderValidation();
  updateStatus();
  const key = selectionKey(state.editor.selection);
  if (key !== state.lastSelection) {
    state.lastSelection = key;
    state.inspector.render();
  }
  scheduleDraft();
}

function onChange(opts = {}) {
  syncModeButtons();
  if (opts.final) state.inspector.render();
  updateStatus();
}

function syncModeButtons() {
  const mode = state.view?.mode || 'select';
  for (const [id, m] of [['btn-mode-select', 'select'], ['btn-mode-move', 'move'], ['btn-mode-place', 'addPlace'], ['btn-mode-star', 'addStar']]) {
    $(id).classList.toggle('active', m === mode);
  }
  els.canvas.style.cursor = mode === 'select' ? 'default' : 'crosshair';
}

function setMode(mode) {
  state.view.mode = mode;
  syncModeButtons();
}

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
      onStatus: (coords, scale) => updateStatus(coords, scale)
    });
    state.inspector = new Inspector({
      root: els.inspector,
      state: state.editor,
      onFocus: (x, z) => state.view.focusOn(x, z),
      onChange: () => onChange({ final: true }),
      confirmDelete: () => window.confirm('Eliminare questo elemento?'),
      onAddStep: (missionId) => {
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
    window.__editor = { state, view: state.view, inspector: state.inspector };
    const ro = new ResizeObserver(() => state.view.resize());
    ro.observe(els.canvas.parentElement);
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<div class="fatal"><h1>Errore editor</h1><p>${esc(err.message)}</p><p>Avvia il progetto con un server statico: <code>python3 -m http.server 8081</code></p></div>`;
  }
}

function bindUI() {
  $('btn-undo').addEventListener('click', () => { state.editor.undo(); onChange({ final: true }); });
  $('btn-redo').addEventListener('click', () => { state.editor.redo(); onChange({ final: true }); });
  $('btn-fit').addEventListener('click', () => state.view.fit());
  $('btn-focus').addEventListener('click', () => {
    const a = state.editor.selectionAnchor();
    if (a) state.view.focusOn(a.x, a.z);
  });
  $('btn-save-manifest').addEventListener('click', async () => {
    const res = await saveTextFile('map.json', state.editor.serializeSource(), 'Manifest mappa');
    if (res.ok) {
      toast(res.method === 'fs' ? 'Manifest salvato.' : 'Manifest scaricato.');
      state.editor.dirty = false;
      updateStatus();
    }
  });
  $('btn-save-bundle').addEventListener('click', async () => {
    const res = await saveTextFile('data-map.json', state.editor.serializeCompiled(), 'Bundle dati mappa');
    if (res.ok) {
      toast(res.method === 'fs' ? 'Bundle salvato.' : 'Bundle scaricato.');
      state.editor.dirty = false;
      clearDraft();
      updateStatus();
    }
  });
  $('btn-save-both').addEventListener('click', async () => {
    const res = await saveBoth(state.editor);
    if (res.ok) {
      toast(res.method === 'fs' ? 'Manifest e bundle salvati.' : 'Download avviati.');
      state.editor.dirty = false;
      clearDraft();
      updateStatus();
    }
  });
  $('btn-import').addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    try {
      const map = await importJSON(file);
      state.editor = new EditorState({ map, city: state.city });
      state.view.state = state.editor;
      state.inspector.state = state.editor;
      state.editor.on(onStateChanged);
      state.view.state = state.editor;
      state.view.resize();
      state.view.fit();
      state.view.focusOn(-140, 30, 0.45);
      window.__editor = { state, view: state.view, inspector: state.inspector };
      els.title.textContent = `${state.editor.map.name || 'Mappa'} · editor mappa`;
      state.lastSelection = '';
      state.inspector.render();
      onChange({ final: true });
      toast('Manifest importato.');
    } catch (err) {
      toast(`Import non riuscito: ${err.message}`, 4000);
    } finally {
      els.fileInput.value = '';
    }
  });
  $('btn-reset').addEventListener('click', async () => {
    if (!window.confirm('Ripristinare il manifest originale? Le modifiche non salvate andranno perse.')) return;
    const map = await fetchJSON('../maps/fidenza/map.json');
    clearDraft();
    state.editor.reset(map);
    state.view.state = state.editor;
    state.inspector.state = state.editor;
    els.title.textContent = `${map.name || 'Fidenza'} · editor mappa`;
    state.lastSelection = '';
    state.inspector.render();
    onChange({ final: true });
    toast('Manifest originale ripristinato.');
  });
  $('btn-clear-draft').addEventListener('click', () => {
    clearDraft();
    toast('Bozza locale eliminata.');
  });
  $('btn-game').addEventListener('click', () => window.open('../index.html', '_blank'));
  els.modeSelect.addEventListener('click', () => setMode('select'));
  els.modeMove.addEventListener('click', () => setMode('move'));
  els.modePlace.addEventListener('click', () => setMode('addPlace'));
  els.modeStar.addEventListener('click', () => setMode('addStar'));
  els.snap.addEventListener('change', () => { state.view.snap = Number(els.snap.value) || 0; });
  els.search.addEventListener('input', () => { state.search = els.search.value; renderList(); });
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
      if (state.tab === 'overrides') { /* lista override */ }
      renderList();
      renderTabTools();
    });
  });
  document.querySelectorAll('[data-layer]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.view.layers[cb.dataset.layer] = cb.checked;
      state.view.render();
    });
  });
  window.addEventListener('keydown', e => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) state.editor.redo(); else state.editor.undo(); onChange({ final: true }); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); state.editor.redo(); onChange({ final: true }); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (state.editor.selection && window.confirm('Eliminare questo elemento?')) { state.editor.deleteSelection(); onChange({ final: true }); }
    } else if (e.key === 'Escape') {
      state.editor.select(null);
      setMode('select');
      onChange({ final: true });
    } else if (e.key === 'f') {
      state.view.fit();
    }
  });
  window.addEventListener('beforeunload', e => {
    if (state.editor?.dirty) { e.preventDefault(); e.returnValue = ''; }
  });
}

bindUI();
load();
