import {
  AREAS,
  AREA_BY_ID,
  AREA_STAGE_NAMES,
  CAMPAIGN,
  CHASSIS,
  CORES,
  CYBORG_BLUEPRINTS,
  ENDINGS,
  MEMORY_NODES,
  STORY,
  TRAINING_PROGRAMS,
  TUTORIAL,
} from './data.js';
import {
  areaOutputPerSecond,
  areaStage,
  availableBlueprints,
  blueprintCost,
  bonuses,
  buildCost,
  campaignNodeUnlocked,
  canPay,
  canPrestige,
  canRankUp,
  cyborgPower,
  cyborgStats,
  endingFor,
  isAreaUnlocked,
  powerStats,
  prestigeGain,
  proceduralCost,
  rankUpCost,
  reactorOutput,
  squadPower,
  storyOptionAvailable,
  trainingSlots,
  unlockRequirement,
  upgradeCost,
} from './sim.js';
import { clamp, fmt, fmtRate, formatCountdown, pct } from './core/utils.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};

export class UI {
  constructor({ state, actions, minimap }) {
    this.state = state;
    this.actions = actions;
    this.minimap = minimap;
    this.currentTab = 'lab';
    this.selectedArea = null;
    this.selectedCyborg = null;
    this.story = null;
    this.storyMode = 'chapter';
    this.toastTimer = null;
    this._lastResources = {};
    this._bind();
    this.renderCreateOptions();
  }

  setState(state) {
    this.state = state;
  }

  _bind() {
    $('#btn-start')?.addEventListener('click', () => {
      if (this._hasSave) this.actions.onNewGame?.();
      else this.actions.onStart?.();
    });
    $('#btn-continue')?.addEventListener('click', () => this.actions.onStart?.());
    $('#btn-title-settings')?.addEventListener('click', () => this.openSettings(true));
    $('#btn-settings')?.addEventListener('click', () => this.openSettings(false));
    $('#btn-map-full')?.addEventListener('click', () => this.openFullMap());
    $('#map-close')?.addEventListener('click', () => this.closeFullMap());
    $('#sheet-close')?.addEventListener('click', () => this.closeArea());
    $('#sheet-upgrade')?.addEventListener('click', () => {
      if (this.selectedArea) this.actions.onUpgrade?.(this.selectedArea);
    });
    $('#cy-close')?.addEventListener('click', () => this.closeCyborg());
    $('#tutorial-skip')?.addEventListener('click', () => this.closeTutorial(true));
    $('#tutorial-next')?.addEventListener('click', () => this.nextTutorial());
    $('#eco-prompt')?.addEventListener('click', () => this.actions.onCollectEco?.());
    $('#btn-create')?.addEventListener('click', () => this.openCreate());
    $('#create-cancel')?.addEventListener('click', () => this.closeCreate());
    $('#create-confirm')?.addEventListener('click', () => {
      const chassis = $('#create-chassis')?.value;
      const core = $('#create-core')?.value;
      const name = $('#create-name')?.value?.trim();
      this.actions.onCreateProcedural?.(chassis, core, name);
    });
    $('#battle-skip')?.addEventListener('click', () => this.actions.onSkipBattle?.());
    $('#btn-prestige')?.addEventListener('click', () => this.actions.onPrestige?.());
    $$('#nav button').forEach((btn) => {
      btn.addEventListener('click', () => this.actions.onTab?.(btn.dataset.tab));
    });
    $$('.panel-close').forEach((btn) => {
      btn.addEventListener('click', () => this.actions.onTab?.('lab'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#modal').classList.contains('hidden')) this.closeModal();
        else if (!$('#create-modal').classList.contains('hidden')) this.closeCreate();
        else if (!$('#sheet').classList.contains('hidden')) this.closeArea();
        else if (!$('#panel-cyborgs').classList.contains('hidden')) this.actions.onTab?.('lab');
      }
    });
  }

  showTitle(hasSave) {
    this._hasSave = hasSave;
    $('#screen-title').classList.remove('hidden');
    $('#hud').classList.add('hidden');
    $('#nav').classList.add('hidden');
    $('#btn-start').textContent = hasSave ? 'NUOVA PARTITA' : 'ENTRA NEL LABORATORIO';
    $('#btn-continue').classList.toggle('hidden', !hasSave);
  }

  hideTitle() {
    $('#screen-title').classList.add('hidden');
    $('#hud').classList.remove('hidden');
    $('#nav').classList.remove('hidden');
  }

  syncHUD() {
    const r = this.state.resources;
    for (const key of ['scrap', 'circuits', 'cells']) {
      const node = $(`#res-${key}`);
      if (!node) continue;
      const value = Math.floor(r[key]);
      if (this._lastResources[key] !== value) {
        node.textContent = fmt(value);
        node.parentElement?.classList.remove('pop');
        void node.parentElement?.offsetWidth;
        node.parentElement?.classList.add('pop');
        this._lastResources[key] = value;
      }
    }
    const frag = $('#res-fragments');
    if (frag) {
      frag.textContent = fmt(r.fragments);
      $('.res-pill.fragments')?.classList.toggle('hidden', r.fragments <= 0);
    }
    const power = powerStats(this.state);
    $('#power-val').textContent = `${fmt(power.demand)} / ${fmt(power.output)} MW`;
    $('#power-fill').style.width = `${clamp(power.ratio * 100, 0, 100)}%`;
    $('#power-state').textContent = power.overload ? 'SOVRACCARICO' : 'STABILE';
    $('#power-state').className = power.overload ? 'warn' : 'ok';
    $('.power-wrap')?.classList.toggle('overloaded', power.overload);
    $('#eco-prompt')?.classList.toggle('hidden', !(this.state.eco?.activeUntil && Date.now() <= this.state.eco.activeUntil));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.currentTab));
  }

  tick() {
    this.syncHUD();
    this.minimap?.draw(this.state, this.actions.getCamera?.());
    if (this.selectedArea && !$('#sheet').classList.contains('hidden')) this.renderArea();
    if (this.currentTab === 'arena' && !$('#panel-arena').classList.contains('hidden')) {
      this.renderExpedition();
      const boostBtn = $('#boost-toggle');
      if (boostBtn) {
        const cooldown = Math.max(0, (this.state.boostCooldownUntil || 0) - Date.now());
        const armed = Boolean(this.state.boostArmed) && cooldown <= 0;
        boostBtn.disabled = cooldown > 0;
        boostBtn.textContent = cooldown > 0
          ? `SOVRACCARICO · ${Math.ceil(cooldown / 1000)}s`
          : armed ? 'SOVRACCARICO ARMATO' : 'SOVRACCARICO +20%';
        boostBtn.classList.toggle('on', armed);
      }
      $$('[data-campaign-node]').forEach((node) => {
        const id = node.dataset.campaignNode;
        const info = CAMPAIGN.find((c) => c.id === id);
        if (!info) return;
        const power = squadPower(this.state);
        const p = node.querySelector('.cn-power');
        if (p) {
          p.textContent = `${fmt(info.power)} PWR`;
          p.classList.toggle('bad', power < info.power);
        }
        const unlocked = Boolean(this.state.areas.arena?.unlocked && this.state.areas.arena.active) && campaignNodeUnlocked(this.state, id);
        node.disabled = !unlocked;
        node.classList.toggle('locked', !unlocked);
      });
    }
    if (this.currentTab === 'memory' && !$('#panel-memory').classList.contains('hidden')) this.renderMemory();
  }

  showTab(tab) {
    if (!['lab', 'cyborgs', 'arena', 'diary', 'memory'].includes(tab)) return;
    this.currentTab = tab;
    for (const id of ['cyborgs', 'arena', 'diary', 'memory']) {
      $(`#panel-${id}`)?.classList.toggle('hidden', id !== tab);
    }
    $('#sheet').classList.add('hidden');
    $('#cyborg-sheet').classList.add('hidden');
    $('#map-overlay').classList.add('hidden');
    if (tab === 'lab') {
      this.selectedArea = null;
      this.actions.onClearSelection?.();
      this.actions.onResetView?.();
    }
    if (tab === 'cyborgs') this.renderCyborgs();
    if (tab === 'arena') this.renderArena();
    if (tab === 'diary') this.renderDiary();
    if (tab === 'memory') this.renderMemory();
    this.syncHUD();
  }

  focusArea(areaId) {
    this.selectedArea = areaId;
    this.actions.onFocusArea?.(areaId);
    this.renderArea();
  }

  renderArea() {
    const id = this.selectedArea;
    if (!id) return;
    const area = AREA_BY_ID[id];
    const a = this.state.areas[id];
    if (!area || !a) return;
    const unlocked = a.unlocked;
    const req = unlockRequirement(this.state, id);
    const cost = unlocked ? upgradeCost(this.state, id) : buildCost(this.state, id);
    const power = powerStats(this.state);
    const stage = areaStage(a.level);
    const out = areaOutputPerSecond(this.state, id);
    const sup = a.supervisor ? this.state.cyborgs.find((c) => c.id === a.supervisor) : null;
    const canBuild = !req && canPay(this.state, cost);
    $('#sheet').classList.remove('hidden');
    $('#sheet-icon').textContent = area.icon;
    $('#sheet-name').textContent = area.name;
    $('#sheet-role').textContent = area.role;
    $('#sheet-level').textContent = unlocked ? `LV ${a.level}` : 'SIGILLATA';
    $('#sheet-desc').textContent = area.desc;
    $('#sheet-dots').innerHTML = [1, 2, 3, 4, 5].map((i) => `<i class="${unlocked && i <= stage ? 'on' : ''}"></i>`).join('');
    const stats = [];
    stats.push(['Stato', unlocked ? (a.active ? 'ATTIVA' : 'STANDBY') : 'SIGILLATA']);
    stats.push(['Energia', unlocked ? `${fmtRate(this._powerUse(id))} MW` : '—']);
    if (area.resource && area.resource !== 'power') stats.push(['Produzione', `${fmtRate(out)} /s`]);
    if (id === 'reactor') stats.push(['Uscita', `${fmt(reactorOutput(this.state))} MW`]);
    if (id === 'hq') stats.push(['Offline', `${fmtRate(bonuses(this.state).offlineHours)} h`]);
    if (id === 'training') stats.push(['Postazioni', `${trainingSlots(this.state)}`]);
    if (id === 'infirmary') stats.push(['Bonus', `+${Math.round(bonuses(this.state).infirmaryLevel * 2)}% PWR`]);
    if (id === 'garden') stats.push(['Bonus', `+${Math.round((bonuses(this.state).gardenLevel * 3) * (1 + bonuses(this.state).garden))}% PROD`]);
    if (id === 'arena') stats.push(['Bonus', `+${Math.round((bonuses(this.state).arenaLevel - 1) * 8)}% reward`]);
    stats.push(['Stage', unlocked ? `${stage}/5 · ${AREA_STAGE_NAMES[stage - 1]}` : `——`]);
    $('#sheet-stats').innerHTML = stats.map(([k, v]) => `<div class="stat-line"><span>${k}</span><b>${v}</b></div>`).join('');
    if (unlocked) {
      $('#sheet-sup').innerHTML = `<div class="sheet-sup"><b>Supervisore:</b> ${sup ? esc(sup.name) : 'nessuno'} <button class="btn small ghost" id="sheet-assign">${sup ? 'CAMBIA' : 'ASSEGNA'}</button>${id !== 'reactor' ? `<button class="btn small ghost" id="sheet-toggle">${a.active ? 'STANDBY' : 'ATTIVA'}</button>` : ''}</div>`;
      $('#sheet-assign')?.addEventListener('click', () => this.openSupervisorPicker(id));
      $('#sheet-toggle')?.addEventListener('click', () => this.actions.onToggleArea?.(id));
    } else {
      $('#sheet-sup').innerHTML = '';
    }
    const mods = [
      { level: 5, name: 'Modulo di produzione', desc: '+25% produzione' },
      { level: 10, name: 'Isolamento energetico', desc: '−1 MW assorbito' },
      { level: 15, name: 'Nucleo di apice', desc: '+50% produzione' },
    ];
    $('#sheet-modules').innerHTML = mods.map((m) => `<div class="module-line ${a.level >= m.level ? 'on' : ''}"><i></i>${m.name} · LV ${m.level} — ${m.desc}</div>`).join('');
    $('#sheet-cost').textContent = unlocked
      ? (a.level >= 15 ? 'Livello massimo' : `Costo: ${fmt(cost.scrap)} ⚙${cost.circuits ? ` · ${fmt(cost.circuits)} ⌁` : ''}`)
      : req
        ? `Richiede ${AREA_BY_ID[req.area].short} LV ${req.level}`
        : `Apri: ${fmt(cost.scrap)} ⚙${cost.circuits ? ` · ${fmt(cost.circuits)} ⌁` : ''}`;
    $('#sheet-cost').classList.toggle('bad', !canBuild && !req);
    const btn = $('#sheet-upgrade');
    btn.textContent = !unlocked ? 'APRI STANZA' : a.level >= 15 ? 'LIVELLO MASSIMO' : 'POTENZIA';
    btn.disabled = (!unlocked && (Boolean(req) || !canBuild)) || (unlocked && (a.level >= 15 || !canBuild));
  }

  _powerUse(id) {
    const def = AREA_BY_ID[id];
    const a = this.state.areas[id];
    if (!def || !a || !a.unlocked) return 0;
    if (def.special === 'power') return 0;
    return Math.max(0.5, def.powerUse + def.powerGrowth * (a.level - 1) - (a.level >= 10 ? 1 : 0));
  }

  openSupervisorPicker(areaId) {
    const candidates = this.state.cyborgs.filter((c) => c.story || c.level >= 1);
    const current = this.state.areas[areaId]?.supervisor;
    const rows = candidates.map((c) => `<button class="create-blueprint" data-sup="${c.id}"><b>${esc(c.name)}</b><small>${esc(c.serial)} · LV ${c.level} · ${esc(c.role)}</small><p>Affinità: ${esc(AREA_BY_ID[c.affinity]?.name || c.affinity)}${current === c.id ? ' · attuale' : ''}</p></button>`).join('');
    this.showModal({
      kicker: 'SUPERVISORE',
      title: 'Chi guarda questa stanza?',
      body: `<p>Un cyborg assegnato aumenta la produzione. Se la stanza è la sua preferita, il bonus cresce.</p><div class="create-grid">${rows}</div>`,
      actions: [
        { label: 'NESSUNO', cls: 'ghost', onClick: () => { this.actions.onAssign?.(areaId, null); this.closeModal(); } },
        { label: 'CHIUDI', cls: 'ghost', onClick: () => this.closeModal() },
      ],
    });
    $$('[data-sup]').forEach((b) => b.addEventListener('click', () => {
      this.actions.onAssign?.(areaId, b.dataset.sup);
      this.closeModal();
    }));
  }

  closeArea() {
    $('#sheet').classList.add('hidden');
    this.selectedArea = null;
    this.actions.onClearSelection?.();
  }

  hidePanels() {
    for (const id of ['cyborgs', 'arena', 'diary', 'memory']) {
      $(`#panel-${id}`)?.classList.add('hidden');
    }
    $('#sheet').classList.add('hidden');
    $('#cyborg-sheet').classList.add('hidden');
    $('#map-overlay').classList.add('hidden');
  }

  renderCyborgs() {
    const list = $('#cyborg-list');
    if (!list) return;
    const createBtn = $('#btn-create');
    if (createBtn) createBtn.disabled = !this.state.areas.incubator?.unlocked;
    const total = squadPower(this.state);
    const slots = trainingSlots(this.state);
    $('#cyborg-summary').innerHTML = `<span class="summary-chip">UNITÀ <b>${this.state.cyborgs.length}</b></span><span class="summary-chip">SQUADRA <b>${fmt(total)} PWR</b></span><span class="summary-chip">ADDESTRAMENTO <b>${this.state.training.length}/${slots}</b></span><span class="summary-chip">AFFETTO MEDIO <b>${Math.round(this.state.cyborgs.reduce((s, c) => s + c.affection, 0) / Math.max(1, this.state.cyborgs.length))}%</b></span>`;
    list.innerHTML = this.state.cyborgs.map((c) => {
      const s = cyborgStats(this.state, c);
      const inSquad = this.state.squad.includes(c.id);
      const training = this.state.training.find((t) => t.cyborgId === c.id);
      return `<button class="cyborg-card" data-cy="${c.id}" style="--accent:${c.accent}">
        <div class="cc-top"><div><div class="cc-name">${esc(c.name)}</div><div class="cc-role">${esc(c.serial)} · ${esc(c.role)}</div></div><span class="cc-level">LV ${c.level}</span></div>
        <div class="cc-stats"><span>FOR <b>${s.str}</b></span><span>PRE <b>${s.prec}</b></span><span>SIN <b>${s.synth}</b></span><span>LEA <b>${s.loyal}</b></span></div>
        <div class="cc-bar"><i style="width:${c.affection}%"></i></div>
        <div class="cc-tags">${inSquad ? '<span class="cc-tag">SQUADRA</span>' : ''}${c.area ? `<span class="cc-tag">${esc(AREA_BY_ID[c.area]?.short || 'AREA')}</span>` : ''}${training ? '<span class="cc-tag">IN ADDESTRAMENTO</span>' : ''}${c.memoryWiped ? '<span class="cc-tag memory">MEMORIA CANCELLATA</span>' : ''}${c.affection <= 0 ? '<span class="cc-tag warn">SILENZIO</span>' : ''}</div>
      </button>`;
    }).join('');
    $$('[data-cy]').forEach((b) => b.addEventListener('click', () => this.openCyborg(b.dataset.cy)));
  }

  openCyborg(id) {
    this.selectedCyborg = id;
    this.renderCyborgSheet();
    $('#cyborg-sheet').classList.remove('hidden');
  }

  closeCyborg() {
    $('#cyborg-sheet').classList.add('hidden');
    this.selectedCyborg = null;
  }

  renderCyborgSheet() {
    const c = this.state.cyborgs.find((x) => x.id === this.selectedCyborg);
    if (!c) return;
    const s = cyborgStats(this.state, c);
    const training = this.state.training.find((t) => t.cyborgId === c.id);
    const inSquad = this.state.squad.includes(c.id);
    $('#cy-icon').textContent = c.blueprintId === 'sedici' ? '❀' : c.blueprintId === 'vento' ? '➤' : c.blueprintId === 'neve' ? '❄' : '◉';
    $('#cy-name').textContent = c.name;
    $('#cy-serial').textContent = `${c.serial} · ${c.role} · ${c.tier}`;
    $('#cy-level').textContent = `LV ${c.level} / 30`;
    $('#cy-portrait').textContent = c.blueprintId === 'sedici' ? '❀' : c.blueprintId === 'vento' ? '➤' : c.blueprintId === 'neve' ? '❄' : '◉';
    $('#cy-stats').innerHTML = [
      ['Forza', s.str], ['Precisione', s.prec], ['Sintesi', s.synth], ['Lealtà', s.loyal],
      ['Potenza', cyborgPower(this.state, c)], ['Rango', c.rank],
    ].map(([k, v]) => `<div class="stat-line"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#cy-affection').innerHTML = `<div class="affection">AFFETTO <b>${Math.round(c.affection)}%</b>${c.memoryWiped ? ' · MEMORIA CANCELLATA' : ''}${c.affection >= 100 ? ' · LEGAME' : ''}<div class="bar"><i style="width:${c.affection}%"></i></div></div>`;
    $('#cy-desc').textContent = `${c.desc || 'Prototipo senza storia. Per ora.'} ${this.state.cyborgs.some((x) => x.blueprintId === c.blueprintId) && c.blueprintId === 'cenere' ? 'Ti guarda come se aspettasse una parola.' : ''}`;
    const programs = TRAINING_PROGRAMS.map((p) => `<option value="${p.id}">${p.name} · ${p.desc}</option>`).join('');
    if (training) {
      $('#cy-training').innerHTML = `<b>IN ADDESTRAMENTO · ${esc(TRAINING_PROGRAMS.find((p) => p.id === training.program)?.name || training.program)}</b><div class="bar"><i style="width:${clamp(100 - ((training.endsAt - Date.now()) / (training.duration * 1000)) * 100, 0, 100)}%"></i></div><small>${formatCountdown(training.endsAt - Date.now())} rimasti</small>`;
    } else {
      $('#cy-training').innerHTML = `<label style="display:flex;gap:6px;align-items:center"><select id="cy-program" style="flex:1;border:1px solid var(--border);border-radius:7px;background:#0a1217;color:var(--text);padding:7px;font-size:10px">${programs}</select><button id="cy-train" class="btn small primary" type="button">ADDESTRA</button></label>`;
      $('#cy-train')?.addEventListener('click', () => {
        const p = $('#cy-program')?.value;
        this.actions.onTrain?.(c.id, p);
      });
    }
    const areaOptions = AREAS.filter((a) => this.state.areas[a.id]?.unlocked).map((a) => `<option value="${a.id}" ${c.area === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
    const canRank = canRankUp(this.state, c);
    const rankCost = rankUpCost(c);
    const wipeAvailable = this.state.story.seen.includes('ch5') && !c.memoryWiped;
    $('#cy-actions').innerHTML = `
      <button class="btn small ${inSquad ? 'primary' : 'ghost'}" id="cy-squad" type="button">${inSquad ? 'IN SQUADRA' : 'AGGIUNGI ALLA SQUADRA'}</button>
      <select id="cy-area" style="flex:1;border:1px solid var(--border);border-radius:7px;background:#0a1217;color:var(--text);padding:7px;font-size:10px"><option value="">Nessuna stanza</option>${areaOptions}</select>
      <button class="btn small ghost" id="cy-assign" type="button">ASSEGNA</button>
      <button class="btn small ${canRank ? 'primary' : 'ghost'}" id="cy-rank" type="button" ${canRank ? '' : 'disabled'}>RANGO ${c.rank + 1} · ${rankCost.cells}◉ ${rankCost.circuits}⌁</button>
      ${wipeAvailable ? '<button class="btn small danger" id="cy-wipe" type="button">PROTOCOLLO SILENZIO</button>' : ''}
    `;
    $('#cy-squad')?.addEventListener('click', () => this.actions.onSquad?.(c.id));
    $('#cy-assign')?.addEventListener('click', () => this.actions.onAssignCyborg?.(c.id, $('#cy-area')?.value || null));
    $('#cy-rank')?.addEventListener('click', () => this.actions.onRankUp?.(c.id));
    $('#cy-wipe')?.addEventListener('click', () => this.actions.onWipe?.(c.id));
  }

  renderArena() {
    const squad = this.state.squad.map((id) => this.state.cyborgs.find((c) => c.id === id)).filter(Boolean);
    const cooldown = Math.max(0, (this.state.boostCooldownUntil || 0) - Date.now());
    const armed = Boolean(this.state.boostArmed) && cooldown <= 0;
    const arenaBuilt = Boolean(this.state.areas.arena?.unlocked);
    const arenaReady = arenaBuilt && Boolean(this.state.areas.arena.active);
    const arenaNote = !arenaBuilt ? ' · ARENA NON COSTRUITA' : !arenaReady ? ' · ARENA IN STANDBY' : '';
    $('#arena-squad').innerHTML = `<div class="squad-label">SQUADRA DI COLLAUDO · ${squad.length}/3${arenaNote}</div>${this.state.cyborgs.map((c) => `<button class="squad-chip ${this.state.squad.includes(c.id) ? 'on' : ''}" data-squad="${c.id}">${esc(c.name)} · ${fmt(cyborgPower(this.state, c))}</button>`).join('')}<button class="squad-chip boost ${armed ? 'on' : ''}" id="boost-toggle" type="button" ${cooldown > 0 || !arenaReady ? 'disabled' : ''}>${cooldown > 0 ? `SOVRACCARICO · ${Math.ceil(cooldown / 1000)}s` : armed ? 'SOVRACCARICO ARMATO' : 'SOVRACCARICO +20%'}</button><span class="squad-power">${fmt(squadPower(this.state))} PWR</span>`;
    $$('[data-squad]').forEach((b) => b.addEventListener('click', () => this.actions.onSquad?.(b.dataset.squad)));
    $('#boost-toggle')?.addEventListener('click', () => this.actions.onArmBoost?.());
    this.renderExpedition();
    $('#campaign-list').innerHTML = CAMPAIGN.map((n, i) => {
      const unlocked = arenaReady && campaignNodeUnlocked(this.state, n.id);
      const cleared = this.state.campaign.cleared.includes(n.id);
      const power = squadPower(this.state);
      return `<button class="campaign-node ${unlocked ? '' : 'locked'} ${cleared ? 'cleared' : ''}" data-campaign-node="${n.id}" type="button" ${unlocked ? '' : 'disabled'}>
        <span class="cn-index">${String(i + 1).padStart(2, '0')}</span>
        <span class="cn-main"><span class="cn-name">${esc(n.name)}</span><span class="cn-sub">${esc(n.enemy)} · ${cleared ? 'COMPLETATO' : 'DISPONIBILE'}</span></span>
        <span class="cn-power ${power < n.power ? 'bad' : ''}">${fmt(n.power)} PWR</span>
      </button>`;
    }).join('');
    $$('[data-campaign-node]').forEach((b) => b.addEventListener('click', () => this.actions.onBattle?.(b.dataset.campaignNode)));
  }

  renderExpedition() {
    const box = $('#expedition-box');
    if (!box) return;
    if (!this.state.areas.arena?.unlocked) {
      box.innerHTML = '<h3>SPEDIZIONI</h3><p>Costruisci l’Arena di Collaudo per mandare la squadra fuori dal laboratorio.</p>';
      return;
    }
    if (!this.state.areas.arena.active) {
      box.innerHTML = '<h3>SPEDIZIONI</h3><p>L’Arena è in standby. Riattivala dalla mappa per mandare la squadra fuori.</p>';
      return;
    }
    const exp = this.state.expedition;
    if (exp) {
      const left = Math.max(0, exp.endsAt - Date.now());
      const def = exp.def || { name: 'Spedizione' };
      box.innerHTML = `<h3>SPEDIZIONE IN CORSO · ${esc(def.name || '')}</h3><p>Potenza inviata: <b>${fmt(exp.power)}</b> · soglia ${fmt(exp.threshold)}. Torna tra ${formatCountdown(left)}.</p><div class="bar"><i style="width:${clamp(100 - (left / (exp.duration * 1000)) * 100, 0, 100)}%"></i></div>`;
      return;
    }
    box.innerHTML = `<h3>SPEDIZIONI</h3><p>Manda la squadra fuori dal laboratorio. Il tempo passa anche a app chiusa.</p><div class="expedition-row">${[
      ['short', '15 min', 120],
      ['medium', '1 ora', 420],
      ['long', '4 ore', 1200],
    ].map(([id, label, thr]) => `<button class="btn small ghost" data-exp="${id}" type="button">${label} · ${fmt(thr)} PWR</button>`).join('')}</div>`;
    $$('[data-exp]').forEach((b) => b.addEventListener('click', () => this.actions.onExpedition?.(b.dataset.exp)));
  }

  renderDiary() {
    const seen = new Set(this.state.story.seen);
    $('#diary-list').innerHTML = STORY.map((s) => {
      const unlocked = seen.has(s.id);
      return `<button class="diary-item ${unlocked ? '' : 'locked'}" data-diary="${s.id}" type="button"><small>${s.kicker} · ${String(s.number).padStart(2, '0')}</small><b>${unlocked ? esc(s.title) : '— sigillato —'}</b></button>`;
    }).join('');
    $$('[data-diary]').forEach((b) => b.addEventListener('click', () => this.openDiary(b.dataset.diary)));
    const last = [...STORY].reverse().find((s) => seen.has(s.id));
    this.openDiary(last?.id || 'ch1');
  }

  openDiary(id) {
    const s = STORY.find((x) => x.id === id);
    if (!s || !this.state.story.seen.includes(id)) {
      $('#diary-reader').innerHTML = '<p class="empty">Questa pagina non è ancora stata scritta.</p>';
      return;
    }
    $$('.diary-item').forEach((b) => b.classList.toggle('active', b.dataset.diary === id));
    const ending = endingFor(this.state);
    const lines = id === 'ch12' && ending ? ending.lines : s.lines;
    $('#diary-reader').innerHTML = `<div class="kicker">${s.kicker}</div><h2>${esc(s.title)}</h2>${lines.map((p) => `<p>${esc(p)}</p>`).join('')}${id === 'ch12' && ending ? `<p class="kicker" style="margin-top:18px">FINALE · ${esc(ending.title)}</p>` : ''}`;
  }

  renderMemory() {
    const b = bonuses(this.state);
    const gain = prestigeGain(this.state);
    $('#memory-head').innerHTML = `<div class="memory-stat"><span>FRAMMENTI</span><b>${fmt(this.state.resources.fragments)}</b></div><div class="memory-stat"><span>CICLI</span><b>${this.state.prestige.count || 0}</b></div><div class="memory-stat"><span>PROSSIMO RIAVVIO</span><b>+${fmt(gain)}</b></div><div class="memory-stat"><span>PRODUZIONE</span><b>+${Math.round((b.production - 1) * 100)}%</b></div>`;
    $('#memory-grid').innerHTML = MEMORY_NODES.map((n) => {
      const bought = Boolean(this.state.prestige.nodes[n.id]);
      const poor = !bought && this.state.resources.fragments < n.cost;
      return `<button class="memory-node ${bought ? 'bought' : ''} ${poor ? 'poor' : ''}" data-memory="${n.id}" type="button" ${bought || poor ? 'disabled' : ''}><div class="mn-name">${esc(n.name)}</div><div class="mn-desc">${esc(n.desc)}</div><div class="mn-cost">${bought ? 'RICORDATO' : `${n.cost} ❄`}</div></button>`;
    }).join('');
    $$('[data-memory]').forEach((btn) => btn.addEventListener('click', () => this.actions.onBuyMemory?.(btn.dataset.memory)));
    const can = canPrestige(this.state);
    $('#btn-prestige').disabled = !can;
    $('#prestige-note').textContent = can
      ? `Riavviare azzera laboratorio, risorse e livelli dei cyborg. Mantiene storia, finali, frammenti e albero dei Ricordi. Guadagni +${fmt(gain)} frammenti.`
      : 'La Sala Memoria si sblocca dopo il capitolo 10 o con 30.000 rottami accumulati.';
  }

  openFullMap() {
    const grid = $('#full-map');
    grid.innerHTML = AREAS.map((a) => {
      const s = this.state.areas[a.id];
      const unlocked = s?.unlocked;
      return `<button class="map-room ${unlocked ? '' : 'locked'} ${this.selectedArea === a.id ? 'selected' : ''}" data-map-area="${a.id}" type="button"><div class="mr-top"><span>${a.icon}</span><span>${unlocked ? `LV ${s.level}` : 'SIGILLATA'}</span></div><div class="mr-name">${esc(a.name)}</div><div class="mr-status">${unlocked ? (s.active ? 'ATTIVA' : 'STANDBY') : unlockRequirement(this.state, a.id) ? `Richiede ${AREA_BY_ID[unlockRequirement(this.state, a.id).area].short} LV ${unlockRequirement(this.state, a.id).level}` : 'PRONTA DA APRIRE'}</div></button>`;
    }).join('');
    $$('[data-map-area]').forEach((b) => b.addEventListener('click', () => {
      this.closeFullMap();
      this.focusArea(b.dataset.mapArea);
    }));
    $('#map-overlay').classList.remove('hidden');
  }

  closeFullMap() {
    $('#map-overlay').classList.add('hidden');
  }

  openCreate() {
    if (!this.state.areas.incubator?.unlocked) {
      this.toast('Costruisci prima l’Incubatrice.', 'bad');
      return;
    }
    this.renderCreateOptions();
    $('#create-procedural')?.classList.remove('hidden');
    $('#create-modal').classList.remove('hidden');
  }

  closeCreate() {
    $('#create-modal').classList.add('hidden');
  }

  renderCreateOptions() {
    const bps = availableBlueprints(this.state);
    const grid = $('#create-blueprints');
    if (!grid) return;
    if (!bps.length) {
      grid.innerHTML = '<p class="modal-sub">Nessun nuovo progetto disponibile. Potenzia le stanze o continua la storia.</p>';
    } else {
      grid.innerHTML = bps.map((bp) => {
        const cost = blueprintCost(this.state, bp);
        return `<button class="create-blueprint" data-bp="${bp.id}" type="button"><b>${esc(bp.name)}</b><small>${esc(bp.serial)} · ${esc(bp.role)}</small><p>${esc(bp.desc)}</p><small>${fmt(cost.scrap)} ⚙ · ${fmt(cost.circuits)} ⌁ · ${fmt(cost.cells)} ◉</small></button>`;
      }).join('');
      $$('[data-bp]').forEach((b) => b.addEventListener('click', () => this.actions.onCreateBlueprint?.(b.dataset.bp)));
    }
    const ch = $('#create-chassis');
    if (ch) ch.innerHTML = CHASSIS.map((c) => `<option value="${c.id}">${c.name} · ${c.desc}</option>`).join('');
    const co = $('#create-core');
    if (co) co.innerHTML = CORES.map((c) => `<option value="${c.id}">${c.name} · ${c.desc}</option>`).join('');
  }

  showStory(chapter) {
    this.story = chapter;
    this.storyMode = 'chapter';
    $('#story-overlay').classList.remove('hidden');
    $('#story-kicker').textContent = chapter.kicker;
    $('#story-title').textContent = chapter.title;
    const lines = chapter.id === 'ch12' && endingFor(this.state) ? endingFor(this.state).lines : (chapter.lines || []);
    $('#story-lines').innerHTML = lines.map((p) => `<p>${esc(p)}</p>`).join('');
    const choice = $('#story-choice');
    const next = $('#story-next');
    choice.innerHTML = '';
    choice.classList.add('hidden');
    next.classList.remove('hidden');
    next.disabled = false;
    next.textContent = 'CONTINUA';
    this._storyChoice = null;
    if (chapter.choice) {
      choice.classList.remove('hidden');
      next.textContent = 'SCEGLI';
      next.disabled = true;
      choice.innerHTML = chapter.choice.options.map((o) => {
        const available = storyOptionAvailable(this.state, o);
        const req = o.requires === 'sedici' ? ' · richiede Sedici' : o.requires === 'prestige1' ? ' · richiede un ciclo di memoria' : '';
        return `<button data-story-opt="${o.id}" type="button" ${available ? '' : 'disabled'}>${esc(o.label)}${req ? `<small>${req}</small>` : ''}</button>`;
      }).join('');
      $$('[data-story-opt]').forEach((b) => b.addEventListener('click', () => {
        this._storyChoice = b.dataset.storyOpt;
        next.disabled = false;
        next.textContent = 'CONFERMA';
        $$('[data-story-opt]').forEach((x) => x.style.borderColor = x === b ? 'var(--cyan)' : '');
      }));
    }
    next.onclick = () => {
      if (chapter.choice && !this._storyChoice) return;
      const choiceId = this._storyChoice;
      this.closeStory();
      this.actions.onStoryComplete?.(chapter.id, choiceId);
    };
  }

  showEnding(ending) {
    this.story = null;
    this.storyMode = 'ending';
    const flags = this.state.story.flags || {};
    const notes = [];
    if (flags.keptSong) notes.push('Il canto è rimasto nei condotti. Non l’ho mai più spento.');
    if (flags.wipedSong) notes.push('Il canto non è tornato. A volte, nel silenzio, sento comunque la prima nota.');
    if (flags.savedPrototype) notes.push('Il prototipo è sopravvissuto. Non so ancora se è una benedizione.');
    if (flags.savedLab) notes.push('La Sala Memoria è ancora lì, piena di cose che non ho detto.');
    if (flags.memoryWipes > 0) notes.push(`Ho cancellato la memoria di ${flags.memoryWipes} figli. Il conto è più lungo dei loro nomi.`);
    $('#story-overlay').classList.remove('hidden');
    $('#story-kicker').textContent = 'EPILOGO';
    $('#story-title').textContent = ending.title;
    $('#story-lines').innerHTML = `${[...ending.lines, ...notes].map((p) => `<p>${esc(p)}</p>`).join('')}<p class="kicker" style="margin-top:16px">${esc(ending.subtitle)}</p>`;
    $('#story-choice').innerHTML = '';
    $('#story-choice').classList.add('hidden');
    const next = $('#story-next');
    next.classList.remove('hidden');
    next.disabled = false;
    next.textContent = 'TORNA AL LABORATORIO';
    next.onclick = () => {
      this.closeStory();
      this.actions.onEndingClose?.();
    };
  }

  closeStory() {
    $('#story-overlay').classList.add('hidden');
    this.story = null;
  }

  showBattle(node, result) {
    $('#battle-overlay').classList.remove('hidden');
    $('#battle-title').textContent = node.name;
    $('#battle-sub').textContent = `${node.enemy} · potenza consigliata ${fmt(node.power)} · la tua ${fmt(result.power)}`;
    $('#battle-fill').style.width = '0%';
  }

  setBattleProgress(p) {
    const fill = $('#battle-fill');
    if (fill) fill.style.width = `${clamp(p * 100, 0, 100)}%`;
  }

  hideBattle() {
    $('#battle-overlay').classList.add('hidden');
  }

  showModal({ kicker = '', title, body = '', actions = [] }) {
    $('#modal').classList.remove('hidden');
    $('#modal-kicker').textContent = kicker;
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    const wrap = $('#modal-actions');
    wrap.innerHTML = '';
    for (const a of actions) {
      const b = el('button', `btn ${a.cls || 'ghost'}`, a.label);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (a.close !== false) this.closeModal();
        a.onClick?.();
      });
      wrap.appendChild(b);
    }
  }

  closeModal() {
    $('#modal').classList.add('hidden');
    $('#modal-actions').innerHTML = '';
  }

  showOffline(report, onContinue) {
    const rewards = report.rewards || {};
    const rows = [
      ['Rottami', Math.floor(rewards.scrap || 0)],
      ['Circuiti', Math.floor(rewards.circuits || 0)],
      ['Cellule', Math.floor(rewards.cells || 0)],
    ].filter(([, v]) => v > 0).map(([k, v]) => `<span class="reward">${fmt(v)} ${k}</span>`).join('');
    this.showModal({
      kicker: 'RAPPORTO DI TURNO',
      title: 'Il laboratorio ha continuato a respirare.',
      body: `<p>Sei stato via ${formatCountdown(report.elapsed * 1000)}. ${report.capped ? 'Il turno è stato tagliato dal limite offline.' : 'Ogni stanza ha lavorato al buio.'}</p><p>Efficienza offline: ${Math.round(report.efficiency * 100)}%${report.used < report.elapsed ? ` · ${formatCountdown(report.used * 1000)} accreditati` : ''}.</p><div class="reward-row">${rows || '<span class="reward">Nessuna produzione</span>'}</div>${report.training?.length ? `<p>${report.training.length} addestramento/i completati. ${report.training.map((t) => esc(t.name)).join(', ')}.</p>` : ''}${report.expedition ? `<p>Spedizione conclusa: ${report.expedition.win ? 'successo' : 'rientro parziale'}.</p>` : ''}`,
      actions: [{ label: 'RACCOGLI', cls: 'primary', onClick: onContinue }],
    });
  }

  showEndingList() {
    const seen = this.state.story.seen;
    const ending = endingFor(this.state);
    if (ending) this.showModal({
      kicker: 'FINALE',
      title: ending.title,
      body: `<p>${esc(ending.subtitle)}</p><p>Puoi continuare a lavorare nel laboratorio, oppure riavvolgere il nastro dalla Sala Memoria.</p>`,
      actions: [{ label: 'CHIUDI', cls: 'primary' }],
    });
  }

  openSettings(fromTitle = false) {
    const s = this.state.settings;
    const quality = s.quality || 'auto';
    this.showModal({
      kicker: 'IMPOSTAZIONI',
      title: 'Il pannello del Dottore',
      body: `<div class="create-procedural" style="grid-template-columns:1fr">
        <label>QUALITÀ GRAFICA<select id="set-quality"><option value="auto" ${quality === 'auto' ? 'selected' : ''}>Automatica</option><option value="high" ${quality === 'high' ? 'selected' : ''}>Alta</option><option value="med" ${quality === 'med' ? 'selected' : ''}>Media</option><option value="low" ${quality === 'low' ? 'selected' : ''}>Bassa</option></select></label>
        <label>SUONO<select id="set-sound"><option value="1" ${s.sound ? 'selected' : ''}>Attivo</option><option value="0" ${!s.sound ? 'selected' : ''}>Spento</option></select></label>
        <label>MUSICA<select id="set-music"><option value="1" ${s.music ? 'selected' : ''}>Attiva</option><option value="0" ${!s.music ? 'selected' : ''}>Spenta</option></select></label>
        <label>VIBRAZIONE<select id="set-haptics"><option value="1" ${s.haptics ? 'selected' : ''}>Attiva</option><option value="0" ${!s.haptics ? 'selected' : ''}>Spenta</option></select></label>
      </div><p style="margin-top:10px">Salvataggio locale: ${this.state.stats.playSeconds ? formatCountdown(this.state.stats.playSeconds * 1000) : '0s'} di gioco · ${this.state.cyborgs.length} cyborg · ${this.state.campaign.wins} collaudi vinti.</p>`,
      actions: [
        { label: 'ESPORTA SALVATAGGIO', cls: 'ghost', onClick: () => this.actions.onExport?.() },
        { label: 'IMPORTA', cls: 'ghost', onClick: () => this.actions.onImport?.() },
        { label: 'AZZERA TUTTO', cls: 'danger', onClick: () => this.actions.onReset?.() },
        { label: 'CHIUDI', cls: 'primary' },
      ],
    });
    $('#set-quality')?.addEventListener('change', (e) => this.actions.onSetting?.('quality', e.target.value));
    $('#set-sound')?.addEventListener('change', (e) => this.actions.onSetting?.('sound', e.target.value === '1'));
    $('#set-music')?.addEventListener('change', (e) => this.actions.onSetting?.('music', e.target.value === '1'));
    $('#set-haptics')?.addEventListener('change', (e) => this.actions.onSetting?.('haptics', e.target.value === '1'));
  }

  showTutorial() {
    const step = this.state.tutorial?.step || 0;
    if (step >= TUTORIAL.length) return;
    const t = TUTORIAL[step];
    $('#tutorial').classList.remove('hidden');
    $('#tutorial-step').textContent = `PASSO ${step + 1} / ${TUTORIAL.length}`;
    $('#tutorial-title').textContent = t.title;
    $('#tutorial-body').textContent = t.body;
  }

  nextTutorial() {
    const step = this.state.tutorial?.step || 0;
    this.actions.onTutorialStep?.(step + 1);
    if (step + 1 >= TUTORIAL.length) this.closeTutorial(false);
    else this.showTutorial();
  }

  closeTutorial(skip) {
    $('#tutorial').classList.add('hidden');
    if (skip) this.actions.onTutorialSkip?.();
  }

  toast(msg, type = '') {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
  }

  showWebGLError() {
    $('#webgl-error').classList.remove('hidden');
    $('#screen-title').classList.add('hidden');
    $('#hud').classList.add('hidden');
    $('#nav').classList.add('hidden');
  }
}
