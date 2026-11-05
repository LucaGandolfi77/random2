const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

const MODELS = ['duomo', 'piazza-duomo', 'porta', 'ponte', 'teatro', 'comunale', 'granmadre', 'sanpietro', 'musini', 'stazione', 'stirone', 'obelisco', 'piazza-garibaldi'];
const CATEGORIES = ['church', 'museum', 'theatre', 'square', 'monument', 'station', 'park', 'civic', 'nature', 'service', 'food'];
const MISSION_TYPES = ['ambulance', 'chase', 'pizza', 'taxi', 'photo', 'pilgrim', 'delivery', 'tour', 'train', 'night', 'bus', 'custom'];
const PROP_TYPES = ['sign', 'street-sign', 'tree', 'bench', 'lamp', 'bollard', 'planter', 'stall', 'parked-car'];

function field(label, inner, hint = '') {
  return `<label class="field"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
}
function input(name, value, type = 'text', extra = '') {
  return `<input data-field="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
}
function number(name, value, step = 1, extra = '') {
  return input(name, value, 'number', `step="${step}" ${extra}`);
}
function textarea(name, value) {
  return `<textarea data-field="${name}" rows="3">${esc(value)}</textarea>`;
}
function checkbox(name, checked) {
  return `<input data-field="${name}" type="checkbox" ${checked ? 'checked' : ''}>`;
}
function select(name, value, options) {
  return `<select data-field="${name}">${options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
}
function button(label, action, cls = '') {
  return `<button type="button" class="btn ${cls}" data-action="${action}">${label}</button>`;
}

export class Inspector {
  constructor({ root, state, onFocus, onChange, confirmDelete, onAddStep }) {
    this.root = root;
    this.state = state;
    this.onFocus = onFocus;
    this.onChange = onChange;
    this.confirmDelete = confirmDelete;
    this.onAddStep = onAddStep;
  }

  render() {
    const s = this.state.selection;
    if (!s) {
      this.root.innerHTML = `<div class="inspector-empty"><b>Nessuna selezione</b><p>Clicca un POI, una stella, un edificio o una strada sulla mappa. Trascina per spostare. Shift+trascina per pan.</p></div>`;
      return;
    }
    if (s.kind === 'place' || s.kind === 'beacon') this._renderPlace(s);
    else if (s.kind === 'landmark') this._renderLandmark(s);
    else if (s.kind === 'star') this._renderStar(s);
    else if (s.kind === 'mission' || s.kind === 'missionStep') this._renderMission(s);
    else if (s.kind === 'vehicle') this._renderVehicle(s);
    else if (s.kind === 'prop') this._renderProp(s);
    else if (s.kind === 'spawn') this._renderSpawn(s);
    else if (s.kind === 'missionBoard') this._renderBoard(s);
    else if (s.kind === 'building' || s.kind === 'road' || s.kind === 'area') this._renderMapFeature(s);
    this._bind();
  }

  _head(title, sub, focus) {
    return `<div class="inspector-head"><div><span class="kicker">${esc(sub)}</span><h2>${esc(title)}</h2></div>${focus ? button('◎ Vai', 'focus') : ''}</div>`;
  }

  _renderPlace(s) {
    const p = this.state.place(s.id);
    if (!p) return;
    const xy = this.state.compiled.places.find(x => x.id === p.id);
    const beacon = p.beacon || { x: xy?.beaconX ?? xy?.x ?? 0, z: xy?.beaconZ ?? xy?.z ?? 0 };
    const hasLandmark = (this.state.map.landmarks || []).some(l => l.place === p.id);
    this.root.innerHTML = `
      ${this._head(p.name, p.collectible ? 'POI collezionabile' : 'POI', true)}
      <div class="inspector-body">
        ${field('ID', input('id', p.id, 'text', 'disabled'))}
        ${field('Nome', input('name', p.name))}
        ${field('Nome breve', input('short', p.short || ''))}
        ${field('Categoria', select('category', p.category || 'monument', CATEGORIES))}
        ${field('Collezionabile', checkbox('collectible', p.collectible))}
        ${field('Raggio interazione', number('radius', p.radius || 8, 1, 'min="2" max="30"'))}
        ${field('ID OSM', input('osm', p.osm || '', 'text', 'placeholder="way/123456"'))}
        ${field('Latitudine', number('lat', p.lat, 0.000001))}
        ${field('Longitudine', number('lon', p.lon, 0.000001))}
        <div class="section-title">Beacon</div>
        ${field('X locale', number('beaconX', beacon.x, 0.1))}
        ${field('Z locale', number('beaconZ', beacon.z, 0.1))}
        <div class="hint-row">${p.beacon ? 'Beacon esplicito' : 'Beacon calcolato automaticamente'} · ${button('Ricalcola', 'resetBeacon')}</div>
        <div class="section-title">Descrizione</div>
        ${field('Testo', textarea('description', p.description || ''))}
        ${field('Curiosità', textarea('fact', p.fact || ''))}
        <div class="actions-row">
          ${button('Aggiungi landmark', 'addLandmark')}
          ${button('Elimina POI', 'delete', 'danger')}
        </div>
        <p class="coords">x ${xy?.x ?? '—'} · z ${xy?.z ?? '—'} · beacon ${xy?.beaconX ?? '—'}/${xy?.beaconZ ?? '—'}${hasLandmark ? '<br>Il landmark 3D non segue il POI: usa il tab Landmark per spostarlo.' : ''}</p>
      </div>`;
  }

  _renderLandmark(s) {
    const l = this.state.landmark(s.id);
    if (!l) return;
    this.root.innerHTML = `
      ${this._head(l.id, 'Landmark 3D', true)}
      <div class="inspector-body">
        ${field('Modello', select('model', l.model || l.type, MODELS))}
        ${field('Rotazione (°)', number('rotation', l.rotation || 0, 1))}
        ${field('Offset X', number('offsetX', l.offsetX || 0, 0.1))}
        ${field('Offset Z', number('offsetZ', l.offsetZ || 0, 0.1))}
        ${field('Scala', number('scale', l.scale ?? 1, 0.05, 'min="0.1" max="5"'))}
        ${field('Nascosto', checkbox('hidden', l.hidden))}
        <div class="actions-row">${button('Ripristina offset', 'resetLandmark')}${button('Elimina landmark', 'delete', 'danger')}</div>
        <p class="coords">place: ${esc(l.place)}</p>
      </div>`;
  }

  _renderStar(s) {
    const st = this.state.star(s.id);
    if (!st) return;
    this.root.innerHTML = `
      ${this._head(st.id, 'Stella collezionabile', true)}
      <div class="inspector-body">
        ${field('ID', input('id', st.id, 'text', 'disabled'))}
        ${field('X', number('x', st.x, 0.1))}
        ${field('Z', number('z', st.z, 0.1))}
        <div class="actions-row">${button('Elimina stella', 'delete', 'danger')}</div>
        <p class="coords">Trascina la stella sulla mappa per spostarla.</p>
      </div>`;
  }

  _renderMission(s) {
    const m = this.state.mission(s.id);
    if (!m) return;
    const step = s.kind === 'missionStep' ? m.steps?.[s.index] : null;
    const places = this.state.map.places || [];
    this.root.innerHTML = `
      ${this._head(m.title || m.id, 'Missione', false)}
      <div class="inspector-body">
        ${field('Tipo', select('missionType', m.type || 'custom', MISSION_TYPES))}
        ${field('Evento', input('event', m.event || '', 'text', 'placeholder="es. san-donnino"'))}
        ${field('Titolo', input('title', m.title || ''))}
        ${field('Testo breve', textarea('short', m.short || ''))}
        ${field('Tempo (s)', number('time', m.time || 150, 1))}
        ${field('Punti', number('reward', m.reward || 500, 10))}
        <div class="section-title">Tappe (${m.steps?.length || 0})</div>
        <div class="step-list">
          ${(m.steps || []).map((st, i) => `
            <div class="step-item">
              <button type="button" class="step-row ${s.kind === 'missionStep' && s.index === i ? 'active' : ''}" data-action="selectStep" data-index="${i}"><b>${i + 1}</b><span>${esc(st.name || st.prompt)}</span><small>${st.place ? esc(st.place) : `${st.x}, ${st.z}`}${st.comment ? ' · ' + esc(st.comment) : ''}</small></button>
              <div class="step-tools">
                <button type="button" data-action="moveStepUp" data-index="${i}" title="Sposta su">↑</button>
                <button type="button" data-action="moveStepDown" data-index="${i}" title="Sposta giù">↓</button>
              </div>
            </div>`).join('')}
        </div>
        <div class="actions-row">${button('+ Tappa sulla mappa', 'addStep')}${button('Elimina missione', 'delete', 'danger')}</div>
        ${step ? `
          <div class="section-title">Tappa selezionata</div>
          ${field('Nome', input('stepName', step.name || ''))}
          ${field('Prompt', input('stepPrompt', step.prompt || ''))}
          ${field('Commento', input('stepComment', step.comment || ''))}
          ${field('Raggio', number('stepRadius', step.radius || 12, 1))}
          ${field('Foto', checkbox('stepPhoto', step.photo))}
          ${field('Foto obbligatoria', checkbox('stepPhotoRequired', step.photoRequired))}
          ${field('Collegata al POI', select('stepPlace', step.place || '', [''].concat(places.map(p => p.id))))}
          ${field('Offset X', number('stepOffsetX', step.offsetX || 0, 0.1))}
          ${field('Offset Z', number('stepOffsetZ', step.offsetZ || 0, 0.1))}
          ${field('X assoluta', number('stepX', step.x, 0.1))}
          ${field('Z assoluta', number('stepZ', step.z, 0.1))}
          <div class="actions-row">${button('Sgancia da POI', 'detachStep')}${button('Elimina tappa', 'deleteStep', 'danger')}</div>
        ` : `<p class="coords">Seleziona una tappa, trascinala sulla mappa o aggiungine una nuova.</p>`}
        ${s.kind === 'missionStep' ? `<div class="actions-row">${button('Seleziona missione', 'selectMission')}</div>` : ''}
      </div>`;
  }

  _renderProp(s) {
    const p = this.state.prop(s.id);
    if (!p) return;
    const isSign = p.type === 'sign' || p.type === 'street-sign';
    this.root.innerHTML = `
      ${this._head(p.text || p.id, 'Prop / insegna', true)}
      <div class="inspector-body">
        ${field('Tipo', select('type', p.type || 'sign', PROP_TYPES))}
        ${isSign ? field('Testo', input('text', p.text || '')) : ''}
        ${isSign ? field('Sottotitolo', input('sub', p.sub || '')) : ''}
        ${field('X', number('x', p.x, 0.1))}
        ${field('Z', number('z', p.z, 0.1))}
        ${field('Rotazione', number('rotation', p.rotation || 0, 0.01))}
        ${field('Scala', number('scale', p.scale ?? 1, 0.05, 'min="0.2" max="4"'))}
        ${field('Colore', input('color', p.color || '#8a6a3a', 'color'))}
        ${isSign ? field('Larghezza', number('width', p.width || 0, 0.1, 'placeholder="auto"')) : ''}
        ${isSign ? field('Altezza', number('height', p.height || 0, 0.1, 'placeholder="auto"')) : ''}
        <div class="actions-row">${button('Elimina prop', 'delete', 'danger')}</div>
        <p class="coords">Trascina il prop sulla mappa. Le insegne diventano leggibili in 3D.</p>
      </div>`;
  }

  _renderVehicle(s) {
    const v = this.state.vehicle(s.index);
    if (!v) return;
    this.root.innerHTML = `
      ${this._head(v.label || `Veicolo ${s.index + 1}`, 'Veicolo', true)}
      <div class="inspector-body">
        ${field('Tipo', select('type', v.type || 'car', ['car', 'vespa', 'bike']))}
        ${field('Etichetta', input('label', v.label || ''))}
        ${field('X', number('x', v.x, 0.1))}
        ${field('Z', number('z', v.z, 0.1))}
        ${field('Rotazione', number('yaw', v.yaw || 0, 0.01))}
        ${field('Colore', input('color', v.color || '#c2684b', 'color'))}
        ${field('Taxi', checkbox('taxi', v.taxi))}
        <div class="actions-row">${button('Elimina veicolo', 'delete', 'danger')}</div>
      </div>`;
  }

  _renderSpawn() {
    const sp = this.state.map.spawn || { x: 0, z: 0, yaw: 0 };
    this.root.innerHTML = `
      ${this._head('Spawn giocatore', 'Punto di partenza', true)}
      <div class="inspector-body">
        ${field('X', number('x', sp.x, 0.1))}
        ${field('Z', number('z', sp.z, 0.1))}
        ${field('Rotazione', number('yaw', sp.yaw || 0, 0.01))}
        <p class="coords">Trascina il punto SPAWN sulla mappa.</p>
      </div>`;
  }

  _renderBoard() {
    const b = this.state.map.missionBoard || { x: 0, z: 0 };
    this.root.innerHTML = `
      ${this._head('Tabellone missioni', 'Punto interazione', true)}
      <div class="inspector-body">
        ${field('X', number('x', b.x, 0.1))}
        ${field('Z', number('z', b.z, 0.1))}
        <p class="coords">Trascina il tabellone sulla mappa.</p>
      </div>`;
  }

  _renderMapFeature(s) {
    const group = s.kind === 'building' ? 'buildings' : s.kind === 'road' ? 'roads' : 'areas';
    const source = this.state.city[group]?.find(x => String(x.id) === String(s.id));
    const o = this.state.getOverride(s.kind, s.id);
    if (!source) return;
    const isBuilding = s.kind === 'building';
    const isRoad = s.kind === 'road';
    this.root.innerHTML = `
      ${this._head(source.name || `${isBuilding ? 'Edificio' : isRoad ? 'Strada' : 'Area'} ${source.id}`, isBuilding ? 'Edificio' : isRoad ? 'Strada' : 'Area', true)}
      <div class="inspector-body">
        ${field('ID', input('id', source.id, 'text', 'disabled'))}
        ${field('Tipo', input('kind', source.kind || '', 'text', 'disabled'))}
        ${field('Nascosto', checkbox('hidden', o.hidden))}
        ${field('Sposta X', number('moveX', o.moveX || 0, 0.1))}
        ${field('Sposta Z', number('moveZ', o.moveZ || 0, 0.1))}
        ${field('Rotazione (°)', number('rotate', o.rotate || 0, 1))}
        ${isBuilding ? field('Scala', number('scale', o.scale ?? 1, 0.05)) : ''}
        ${isBuilding ? field('Altezza (m)', number('height', o.height ?? source.h ?? '', 0.5, 'placeholder="auto"')) : ''}
        ${isRoad ? field('Larghezza (m)', number('width', o.width ?? source.w ?? '', 0.5, 'placeholder="auto"')) : ''}
        ${isBuilding ? field('Colore', input('color', o.color || source.color || '#d8c6ae', 'color')) : ''}
        ${!isBuilding && !isRoad ? field('Scala', number('scale', o.scale ?? 1, 0.05)) : ''}
        <div class="actions-row">${button('Ripristina elemento', 'resetOverride', 'danger')}</div>
        <p class="coords">Usa Shift+trascina per pan. Il tratteggio rosso mostra la posizione originale.</p>
      </div>`;
  }

  _bind() {
    const s = this.state.selection;
    if (!s) return;
    this.root.querySelectorAll('[data-action="focus"]').forEach(el => el.addEventListener('click', () => {
      const a = this.state.selectionAnchor();
      if (a) this.onFocus?.(a.x, a.z);
    }));
    this.root.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      if (this.confirmDelete?.() === false) return;
      this.state.deleteSelection();
      this.onChange?.();
    });
    this.root.querySelector('[data-action="addLandmark"]')?.addEventListener('click', () => {
      this.state.addLandmark(s.id);
      this.onChange?.();
    });
    this.root.querySelector('[data-action="resetBeacon"]')?.addEventListener('click', () => {
      this.state.updateSelection('ripristina beacon', p => { delete p.beacon; });
      this.onChange?.();
    });
    this.root.querySelector('[data-action="resetLandmark"]')?.addEventListener('click', () => {
      this.state.updateSelection('ripristina landmark', l => { l.offsetX = 0; l.offsetZ = 0; });
      this.onChange?.();
    });
    this.root.querySelector('[data-action="resetOverride"]')?.addEventListener('click', () => {
      this.state.resetOverride();
      this.onChange?.();
    });
    this.root.querySelectorAll('[data-action="selectStep"]').forEach(el => el.addEventListener('click', () => {
      this.state.select({ kind: 'missionStep', id: s.id, index: Number(el.dataset.index) });
      this.onChange?.();
    }));
    this.root.querySelector('[data-action="selectMission"]')?.addEventListener('click', () => {
      this.state.select({ kind: 'mission', id: s.id });
      this.onChange?.();
    });
    this.root.querySelector('[data-action="addStep"]')?.addEventListener('click', () => {
      this.onAddStep?.(s.id);
    });
    this.root.querySelectorAll('[data-action="moveStepUp"]').forEach(el => el.addEventListener('click', () => {
      this.state.moveMissionStep(s.id, Number(el.dataset.index), -1);
      this.onChange?.();
    }));
    this.root.querySelectorAll('[data-action="moveStepDown"]').forEach(el => el.addEventListener('click', () => {
      this.state.moveMissionStep(s.id, Number(el.dataset.index), 1);
      this.onChange?.();
    }));
    this.root.querySelector('[data-action="detachStep"]')?.addEventListener('click', () => {
      this.state.updateMission(s.id, 'sgancia tappa', m => { const st = m.steps?.[s.index]; if (st) { delete st.place; delete st.offsetX; delete st.offsetZ; } });
      this.onChange?.();
    });
    this.root.querySelector('[data-action="deleteStep"]')?.addEventListener('click', () => {
      this.state.updateMission(s.id, 'elimina tappa', m => { if (m?.steps?.[s.index] && m.steps.length > 1) m.steps.splice(s.index, 1); });
      this.state.selection = { kind: 'mission', id: s.id };
      this.state.refresh();
      this.onChange?.();
    });

    this.root.querySelectorAll('[data-field]').forEach(el => {
      const field = el.dataset.field;
      el.addEventListener('change', () => {
        const value = el.type === 'checkbox' ? el.checked : el.value;
        this._applyField(field, value);
      });
    });
  }

  _applyField(field, value) {
    const s = this.state.selection;
    if (!s) return;
    const numeric = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    if (s.kind === 'place' || s.kind === 'beacon') {
      this.state.updateSelection('modifica POI', p => {
        if (field === 'name') p.name = value;
        else if (field === 'short') p.short = value;
        else if (field === 'category') p.category = value;
        else if (field === 'collectible') p.collectible = value;
        else if (field === 'radius') p.radius = numeric(value);
        else if (field === 'osm') p.osm = value;
        else if (field === 'lat') p.lat = numeric(value);
        else if (field === 'lon') p.lon = numeric(value);
        else if (field === 'beaconX') p.beacon = { x: numeric(value), z: p.beacon?.z ?? beacon.z ?? 0 };
        else if (field === 'beaconZ') p.beacon = { x: p.beacon?.x ?? beacon.x ?? 0, z: numeric(value) };
        else if (field === 'description') p.description = value;
        else if (field === 'fact') p.fact = value;
      });
    } else if (s.kind === 'landmark') {
      this.state.updateSelection('modifica landmark', l => {
        if (field === 'model') l.model = value;
        else if (field === 'rotation') l.rotation = numeric(value);
        else if (field === 'offsetX') l.offsetX = numeric(value);
        else if (field === 'offsetZ') l.offsetZ = numeric(value);
        else if (field === 'scale') l.scale = numeric(value);
        else if (field === 'hidden') l.hidden = value;
      });
    } else if (s.kind === 'star') {
      this.state.updateSelection('modifica stella', st => {
        if (field === 'x') st.x = numeric(value);
        else if (field === 'z') st.z = numeric(value);
      });
    } else if (s.kind === 'mission' || s.kind === 'missionStep') {
      this.state.updateMission(s.id, 'modifica missione', m => {
        if (field === 'missionType') m.type = value;
        else if (field === 'event') m.event = value || null;
        else if (field === 'title') m.title = value;
        else if (field === 'short') m.short = value;
        else if (field === 'time') m.time = numeric(value);
        else if (field === 'reward') m.reward = numeric(value);
        else if (s.kind === 'missionStep') {
          const st = m.steps?.[s.index];
          if (!st) return;
          if (field === 'stepName') st.name = value;
          else if (field === 'stepPrompt') st.prompt = value;
          else if (field === 'stepComment') st.comment = value;
          else if (field === 'stepRadius') st.radius = numeric(value);
          else if (field === 'stepPhoto') st.photo = value;
          else if (field === 'stepPhotoRequired') st.photoRequired = value;
          else if (field === 'stepPlace') {
            if (value) st.place = value;
            else { delete st.place; delete st.offsetX; delete st.offsetZ; }
          }
          else if (field === 'stepOffsetX') st.offsetX = numeric(value);
          else if (field === 'stepOffsetZ') st.offsetZ = numeric(value);
          else if (field === 'stepX') st.x = numeric(value);
          else if (field === 'stepZ') st.z = numeric(value);
        }
      });
    } else if (s.kind === 'vehicle') {
      this.state.updateSelection('modifica veicolo', v => {
        if (field === 'type') v.type = value;
        else if (field === 'label') v.label = value;
        else if (field === 'x') v.x = numeric(value);
        else if (field === 'z') v.z = numeric(value);
        else if (field === 'yaw') v.yaw = numeric(value);
        else if (field === 'color') v.color = value;
        else if (field === 'taxi') v.taxi = value;
      });
    } else if (s.kind === 'prop') {
      this.state.updateSelection('modifica prop', p => {
        if (field === 'type') p.type = value;
        else if (field === 'text') p.text = value;
        else if (field === 'sub') p.sub = value;
        else if (field === 'x') p.x = numeric(value);
        else if (field === 'z') p.z = numeric(value);
        else if (field === 'rotation') p.rotation = numeric(value);
        else if (field === 'scale') p.scale = numeric(value);
        else if (field === 'color') p.color = value;
        else if (field === 'width') p.width = numeric(value);
        else if (field === 'height') p.height = numeric(value);
      });
    } else if (s.kind === 'spawn') {
      this.state.updateSelection('modifica spawn', (data, map) => {
        map.spawn ||= { x: 0, z: 0, yaw: 0 };
        if (field === 'x') map.spawn.x = numeric(value);
        else if (field === 'z') map.spawn.z = numeric(value);
        else if (field === 'yaw') map.spawn.yaw = numeric(value);
      });
    } else if (s.kind === 'missionBoard') {
      this.state.updateSelection('modifica tabellone', (data, map) => {
        map.missionBoard ||= { x: 0, z: 0 };
        if (field === 'x') map.missionBoard.x = numeric(value);
        else if (field === 'z') map.missionBoard.z = numeric(value);
      });
    } else if (['building', 'road', 'area'].includes(s.kind)) {
      const patch = {};
      if (field === 'hidden') patch.hidden = value;
      else if (field === 'moveX') patch.moveX = numeric(value);
      else if (field === 'moveZ') patch.moveZ = numeric(value);
      else if (field === 'rotate') patch.rotate = numeric(value);
      else if (field === 'scale') patch.scale = numeric(value);
      else if (field === 'height') patch.height = value === '' ? null : numeric(value);
      else if (field === 'width') patch.width = value === '' ? null : numeric(value);
      else if (field === 'color') patch.color = value;
      this.state.setOverride(s.kind, s.id, patch, 'modifica elemento');
    }
    this.onChange?.();
  }
}
