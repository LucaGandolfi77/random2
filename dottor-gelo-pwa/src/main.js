import './styles.css';
import { Engine, QUALITY } from './core/engine.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { formatCountdown, fmt, formatDuration, vibrate } from './core/utils.js';
import { initPwa, createWakeLock } from './pwa.js';
import { Lab } from './world/lab.js';
import { LabCamera } from './world/camera.js';
import { Minimap } from './world/minimap.js';
import { UI } from './ui.js';
import {
  AREA_BY_ID,
  CAMPAIGN_BY_ID,
  SAVE_KEY,
  STORY,
  TUTORIAL,
} from './data.js';
import {
  battleResult,
  buyMemoryNode,
  canPrestige,
  checkStory,
  collectEco,
  completeStory,
  createInitialState,
  endingFor,
  offlineAdvance,
  prestige,
  prestigeGain,
  sanitizeState,
  setSquad,
  setSupervisor,
  squadMembers,
  startExpedition,
  startIncubation,
  startTraining,
  tick,
  toggleArea,
  unlockArea,
  upgradeArea,
  rankUp,
  wipeMemory,
} from './sim.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { /* private mode */ }
  if (!raw) return { state: createInitialState(), hasSave: false };
  try {
    const parsed = JSON.parse(raw);
    return { state: sanitizeState(parsed), hasSave: true };
  } catch {
    return { state: createInitialState(), hasSave: false };
  }
}

function resolveQuality(requested) {
  if (requested && requested !== 'auto') return QUALITY[requested] ? requested : 'med';
  const dpr = window.devicePixelRatio || 1;
  const mem = navigator.deviceMemory || 4;
  if (dpr >= 2.5 && mem >= 6) return 'high';
  if (dpr >= 1.5 || mem >= 4) return 'med';
  return 'low';
}

function saveState(state) {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or private mode: the session still works */
  }
}

function boot() {
  const loaded = loadState();
  let state = loaded.state;
  const hasSave = loaded.hasSave;
  let pendingOffline = null;
  if (hasSave) {
    const report = offlineAdvance(state, Date.now());
    if (report) saveState(state);
    if (report && report.used > 30) pendingOffline = report;
  }

  const canvas = $('#scene');
  const cameraRig = new LabCamera();
  let engine;
  try {
    engine = new Engine(canvas, cameraRig.camera, resolveQuality(state.settings.quality));
  } catch (err) {
    console.error(err);
    $('#webgl-error')?.classList.remove('hidden');
    $('#screen-title')?.classList.add('hidden');
    $('#hud')?.classList.add('hidden');
    $('#nav')?.classList.add('hidden');
    return;
  }

  // The title is a finished diorama, not the empty first save: show every
  // room at a readable stage behind the menu, then swap to the real state
  // when the player enters. The save itself is never touched.
  const titleState = JSON.parse(JSON.stringify(state));
  for (const id of Object.keys(titleState.areas)) {
    titleState.areas[id] = { unlocked: true, level: 4, active: true, supervisor: null };
  }
  const lab = new Lab(engine, state, cameraRig);
  const minimap = new Minimap($('#minimap'), {
    onFocus: (id) => focusArea(id),
  });
  const audio = new Audio(state.settings);
  audio.setEnabled(state.settings.sound);
  audio.setMusic(state.settings.music);
  const wake = createWakeLock();

  let started = false;
  let storyOpen = false;
  let tutorialOpen = false;
  let battleActive = null;
  let hiddenAt = 0;
  let ui = null;

  const isModalOpen = () => !$('#modal')?.classList.contains('hidden');
  const isCreateOpen = () => !$('#create-modal')?.classList.contains('hidden');
  const isMapOpen = () => !$('#map-overlay')?.classList.contains('hidden');

  function setStoryMode(on) {
    $('#hud')?.classList.toggle('hidden', on || !started);
    $('#nav')?.classList.toggle('hidden', on || !started);
    $('#eco-prompt')?.classList.toggle('hidden', on || !started || !ecoVisible());
  }

  function ecoVisible() {
    return Boolean(state.eco?.activeUntil && Date.now() <= state.eco.activeUntil);
  }

  function toast(msg, type = '') {
    ui?.toast(msg, type);
  }

  // Keep the hub's "recently played" shelf and record tile awake without
  // adding a second persistence format to the simulation.
  function trackHub() {
    try {
      localStorage.setItem('dottor-gelo-pwa', JSON.stringify({
        highScore: state.stats.maxPower || 0,
        wins: state.campaign.wins || 0,
        ending: state.story.ending || null,
      }));
      const last = JSON.parse(localStorage.getItem('random2-last-played') || '{}');
      last['dottor-gelo-pwa/'] = Date.now();
      localStorage.setItem('random2-last-played', JSON.stringify(last));
    } catch {
      /* private mode */
    }
  }

  function applyQuality(requested) {
    const q = resolveQuality(requested);
    engine.setQuality(q);
    lab.setQuality(q);
  }

  function maybeStory() {
    if (!started || storyOpen || tutorialOpen || battleActive) return;
    if (isModalOpen() || isCreateOpen() || isMapOpen()) return;
    const chapter = checkStory(state);
    if (!chapter) return;
    storyOpen = true;
    setStoryMode(true);
    const area = AREA_BY_ID[chapter.focus] || AREA_BY_ID.hq;
    lab.camera.focus({ x: area.pos.x, z: area.pos.z }, 1.85);
    audio.setSadness(Math.min(1, (chapter.number || 1) / 11));
    audio.motif([392, 466, 587, 523], 0.3);
    audio.play('story');
    ui.showStory(chapter);
    saveState(state);
  }

  function beginSession() {
    if (!state.tutorial.done) {
      tutorialOpen = true;
      ui.showTutorial();
      return;
    }
    maybeStory();
  }

  function focusArea(areaId) {
    const area = AREA_BY_ID[areaId];
    if (!area) return;
    state.uiSelected = areaId;
    lab.select(areaId, state);
    lab.focus(areaId, 1.6);
    ui.focusArea(areaId);
    audio.play('tap');
  }

  function onNewGame() {
    ui.showModal({
      kicker: 'NUOVA PARTITA',
      title: 'Vuoi davvero ricominciare?',
      body: '<p>Il salvataggio locale verrà eliminato. Il laboratorio, i cyborg e la storia ripartiranno da zero.</p>',
      actions: [
        { label: 'ANNULLA', cls: 'ghost' },
        {
          label: 'ELIMINA E RICOMINCIA',
          cls: 'danger',
          onClick: () => {
            try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
            window.location.reload();
          },
        },
      ],
    });
  }

  const actions = {
    onStart: () => {
      if (started) return;
      started = true;
      ui.hideTitle();
      setStoryMode(false);
      audio.init();
      audio.setEnabled(state.settings.sound);
      audio.setMusic(state.settings.music);
      applyQuality(state.settings.quality);
      lab.sync(state);
      lab.camera.reset(true);
      minimap.resize();
      minimap.draw(state, lab.camera);
      wake.request();
      saveState(state);
      trackHub();
      const after = () => beginSession();
      if (pwaReadyMsg) {
        const msg = pwaReadyMsg;
        pwaReadyMsg = null;
        setTimeout(() => { if (!storyOpen && !tutorialOpen) toast(msg); }, 1600);
      }
      if (pendingOffline) {
        const report = pendingOffline;
        pendingOffline = null;
        ui.showOffline(report, after);
      } else {
        after();
      }
    },
    onNewGame,
    onTab: (tab) => {
      ui.showTab(tab);
      if (tab === 'lab') lab.camera.reset();
      else if (tab === 'cyborgs') lab.camera.focus({ x: AREA_BY_ID.incubator.pos.x, z: AREA_BY_ID.incubator.pos.z }, 1.35);
      else if (tab === 'arena') lab.camera.focus({ x: AREA_BY_ID.arena.pos.x, z: AREA_BY_ID.arena.pos.z }, 1.55);
      else if (tab === 'diary') lab.camera.focus({ x: AREA_BY_ID.memory.pos.x, z: AREA_BY_ID.memory.pos.z }, 1.4);
      else if (tab === 'memory') lab.camera.focus({ x: AREA_BY_ID.memory.pos.x, z: AREA_BY_ID.memory.pos.z }, 1.6);
      audio.play('tap');
    },
    onUpgrade: (areaId) => {
      const a = state.areas[areaId];
      if (!a) return;
      const wasUnlocked = Boolean(a.unlocked);
      const res = wasUnlocked ? upgradeArea(state, areaId) : unlockArea(state, areaId);
      if (!res.ok) {
        toast(res.reason || 'Non è possibile.', 'bad');
        audio.play('error');
        return;
      }
      const area = AREA_BY_ID[areaId];
      if (area) lab.fx.spark({ x: area.pos.x, y: 0.55, z: area.pos.z }, '#b9fff5', 22);
      audio.play(wasUnlocked ? 'upgrade' : 'build');
      vibrate(12);
      toast(wasUnlocked ? `${area.name} · livello ${res.level}` : `${area.name} aperta`, 'good');
      lab.sync(state);
      ui.focusArea(areaId);
      saveState(state);
      setTimeout(() => maybeStory(), 550);
    },
    onToggleArea: (areaId) => {
      const res = toggleArea(state, areaId);
      if (res.ok) {
        audio.play('tap');
        toast(res.active ? 'Stanza riattivata.' : 'Stanza in standby. L’energia è tornata disponibile.');
        lab.sync(state);
        ui.renderArea();
        saveState(state);
      }
    },
    onAssign: (areaId, cyborgId) => {
      const res = setSupervisor(state, cyborgId, areaId);
      if (!res.ok) return toast(res.reason || 'Assegnazione non valida.', 'bad');
      audio.play('click');
      toast(cyborgId ? 'Supervisore assegnato.' : 'Supervisore rimosso.');
      lab.sync(state);
      ui.renderArea();
      saveState(state);
    },
    onAssignCyborg: (cyborgId, areaId) => {
      const res = setSupervisor(state, cyborgId, areaId);
      if (!res.ok) return toast(res.reason || 'Assegnazione non valida.', 'bad');
      audio.play('click');
      toast(areaId ? `Assegnato a ${AREA_BY_ID[areaId]?.name}.` : 'Rimosso dalla stanza.');
      lab.sync(state);
      ui.openCyborg(cyborgId);
      saveState(state);
    },
    onArmBoost: () => {
      if ((state.boostCooldownUntil || 0) > Date.now()) return toast('Sovraccarico in ricarica.', 'bad');
      state.boostArmed = !state.boostArmed;
      audio.play('click');
      toast(state.boostArmed ? 'Sovraccarico armato: +20% potenza nel prossimo collaudo.' : 'Sovraccarico disinserito.');
      ui.renderArena();
      saveState(state);
    },
    onSquad: (id) => {
      if (state.squad.includes(id)) {
        if (state.squad.length <= 1) return toast('La squadra deve avere almeno un cyborg.', 'bad');
        state.squad = state.squad.filter((x) => x !== id);
      } else {
        if (state.squad.length >= 3) return toast('La squadra può contenere al massimo tre cyborg.', 'bad');
        state.squad.push(id);
      }
      setSquad(state, state.squad);
      audio.play('click');
      toast(`Squadra: ${state.squad.map((x) => state.cyborgs.find((c) => c.id === x)?.name).filter(Boolean).join(', ')}`);
      lab.sync(state);
      ui.renderArena?.();
      ui.renderCyborgs?.();
      if (ui.selectedCyborg) ui.openCyborg(ui.selectedCyborg);
      saveState(state);
    },
    onTrain: (cyborgId, programId) => {
      const res = startTraining(state, cyborgId, programId);
      if (!res.ok) return toast(res.reason || 'Addestramento non disponibile.', 'bad');
      audio.play('train');
      toast(`Addestramento avviato · ${Math.round(res.duration)}s`);
      ui.openCyborg(cyborgId);
      saveState(state);
    },
    onRankUp: (cyborgId) => {
      const res = rankUp(state, cyborgId);
      if (!res.ok) return toast(res.reason || 'Rango non disponibile.', 'bad');
      audio.play('upgrade');
      vibrate(15);
      toast(`Rango ${res.rank} raggiunto.`);
      ui.openCyborg(cyborgId);
      saveState(state);
    },
    onWipe: (cyborgId) => {
      const c = state.cyborgs.find((x) => x.id === cyborgId);
      if (!c) return;
      ui.showModal({
        kicker: 'PROTOCOLLO SILENZIO',
        title: 'Cancellare la memoria?',
        body: `<p>${esc(c.name)} dimenticherà l’affetto, il nome e le stanze. In cambio, la sua potenza combattiva aumenterà del 15%. La storia se ne ricorderà.</p>`,
        actions: [
          { label: 'ANNULLA', cls: 'ghost' },
          {
            label: 'CANCELLA',
            cls: 'danger',
            onClick: () => {
              const res = wipeMemory(state, cyborgId);
              if (!res.ok) return toast(res.reason || 'Non disponibile.', 'bad');
              audio.play('prestige');
              lab.fx.impact({ x: AREA_BY_ID.incubator.pos.x, y: 0.5, z: AREA_BY_ID.incubator.pos.z }, '#b49cff');
              toast('La memoria è stata cancellata. Il corpo ricorda comunque come combattere.', 'bad');
              ui.openCyborg(cyborgId);
              saveState(state);
            },
          },
        ],
      });
    },
    onCreateBlueprint: (blueprintId) => {
      const res = startIncubation(state, { kind: 'blueprint', blueprintId });
      if (!res.ok) return toast(res.reason || 'Incubazione non disponibile.', 'bad');
      ui.closeCreate();
      audio.play('build');
      lab.fx.spark({ x: AREA_BY_ID.incubator.pos.x, y: 0.55, z: AREA_BY_ID.incubator.pos.z }, '#b8ffd7', 18);
      toast(`Incubazione avviata · ${Math.round(res.duration)}s`);
      lab.sync(state);
      saveState(state);
    },
    onCreateProcedural: (chassisId, coreId, name) => {
      const res = startIncubation(state, { kind: 'procedural', chassisId, coreId, name });
      if (!res.ok) return toast(res.reason || 'Incubazione non disponibile.', 'bad');
      ui.closeCreate();
      audio.play('build');
      lab.fx.spark({ x: AREA_BY_ID.incubator.pos.x, y: 0.55, z: AREA_BY_ID.incubator.pos.z }, '#b8ffd7', 18);
      toast(`Prototipo in incubazione · ${Math.round(res.duration)}s`);
      lab.sync(state);
      saveState(state);
    },
    onBattle: (nodeId) => {
      if (battleActive) return;
      const boost = Boolean(state.boostArmed) && (state.boostCooldownUntil || 0) <= Date.now();
      const result = battleResult(state, nodeId, boost);
      if (!result.ok) return toast(result.reason || 'Collaudo non disponibile.', 'bad');
      if (boost) {
        state.boostArmed = false;
        state.boostCooldownUntil = Date.now() + 120000;
      }
      ui.hidePanels();
      setStoryMode(true);
      const node = result.node;
      battleActive = { result, node, time: 0, duration: 4.4 };
      lab.startBattle(squadMembers(state), node);
      ui.showBattle(node, result);
      ui.setBattleProgress(0);
      audio.play('battle');
      saveState(state);
    },
    onSkipBattle: () => finishBattle(),
    onExpedition: (id) => {
      const res = startExpedition(state, id);
      if (!res.ok) return toast(res.reason || 'Spedizione non disponibile.', 'bad');
      audio.play('click');
      toast(`Spedizione avviata: ${res.def.name} · ${formatDuration(res.def.minutes * 60)}`);
      ui.renderArena();
      saveState(state);
    },
    onCollectEco: () => {
      const ecoArea = state.eco.areaId ? AREA_BY_ID[state.eco.areaId] : null;
      const res = collectEco(state);
      if (!res.ok) return;
      audio.play('eco');
      vibrate(18);
      lab.fx.impact({ x: ecoArea?.pos.x || 0, y: 0.7, z: ecoArea?.pos.z || 0 }, '#f1a5c5');
      toast(`Eco di memoria · +${fmt(res.rewards.scrap)} ⚙ · +${fmt(res.rewards.circuits)} ⌁`, 'good');
      lab.sync(state);
      saveState(state);
    },
    onStoryComplete: (chapterId, choiceId) => {
      storyOpen = false;
      setStoryMode(false);
      const res = completeStory(state, chapterId, choiceId);
      if (!res.ok) {
        toast(res.reason || 'La storia non può continuare.', 'bad');
        return;
      }
      lab.camera.reset();
      saveState(state);
      const chosen = res.chosen;
      if (res.ending) {
        storyOpen = true;
        setStoryMode(true);
        completeStory(state, 'ch12');
        audio.setSadness(1);
        audio.motif([196, 233, 294, 262], 0.55);
        audio.play('prestige');
        if (chosen?.reply) {
          ui.showModal({
            kicker: 'SCELTA',
            title: 'La fine comincia',
            body: `<p>${esc(chosen.reply)}</p>`,
            actions: [{
              label: 'VEDI IL FINALE',
              cls: 'primary',
              onClick: () => {
                ui.closeModal();
                ui.showEnding(res.ending);
              },
            }],
          });
        } else {
          ui.showEnding(res.ending);
        }
        saveState(state);
        return;
      }
      if (chosen?.reply) {
        ui.showModal({
          kicker: 'DOPO',
          title: 'Ciò che resta',
          body: `<p>${esc(chosen.reply)}</p>`,
          actions: [{ label: 'CONTINUA', cls: 'primary', onClick: () => { ui.closeModal(); setTimeout(maybeStory, 250); } }],
        });
      } else {
        setTimeout(maybeStory, 650);
      }
    },
    onEndingClose: () => {
      storyOpen = false;
      setStoryMode(false);
      lab.camera.reset();
      saveState(state);
      toast('Il laboratorio resta aperto. La memoria anche.');
    },
    onTutorialStep: (step) => {
      state.tutorial.step = step;
      if (step >= TUTORIAL.length) {
        state.tutorial.done = true;
        tutorialOpen = false;
        saveState(state);
        setTimeout(maybeStory, 180);
      } else {
        saveState(state);
      }
    },
    onTutorialSkip: () => {
      state.tutorial.step = TUTORIAL.length;
      state.tutorial.done = true;
      tutorialOpen = false;
      saveState(state);
      setTimeout(maybeStory, 180);
    },
    onBuyMemory: (id) => {
      const res = buyMemoryNode(state, id);
      if (!res.ok) return toast(res.reason || 'Ricordo non disponibile.', 'bad');
      audio.play('upgrade');
      lab.fx.spark({ x: AREA_BY_ID.memory.pos.x, y: 0.65, z: AREA_BY_ID.memory.pos.z }, '#b6d8ff', 16);
      toast(`${res.node.name} · ricordato.`);
      ui.renderMemory();
      saveState(state);
    },
    onPrestige: () => {
      if (!canPrestige(state)) return toast('La Sala Memoria non è ancora pronta.', 'bad');
      const gain = prestigeGain(state);
      ui.showModal({
        kicker: 'RIAVVOLGI IL NASTRO',
        title: 'Perdere il laboratorio, non i ricordi?',
        body: `<p>Riavviare azzera risorse, stanze, addestramenti e livelli dei cyborg. Mantiene storia, finali, albero dei Ricordi e <b>${fmt(gain)} frammenti</b>.</p><p>Gelo lo ha già fatto altre ${state.prestige.count} volte.</p>`,
        actions: [
          { label: 'ANNULLA', cls: 'ghost' },
          {
            label: 'RIAVVOLGI',
            cls: 'danger',
            onClick: () => {
              const res = prestige(state);
              if (!res.ok) return toast(res.reason || 'Non disponibile.', 'bad');
              audio.play('prestige');
              lab.sync(state);
              lab.camera.reset();
              ui.renderMemory();
              saveState(state);
              ui.showModal({
                kicker: 'NUOVO CICLO',
                title: `Ciclo ${res.count}`,
                body: `<p>+${fmt(res.gain)} frammenti di memoria. Il laboratorio è tornato alle fondamenta. Qualcuno, da qualche parte, ricorda ancora il tuo nome.</p>`,
                actions: [{ label: 'TORNA AL LAVORO', cls: 'primary' }],
              });
            },
          },
        ],
      });
    },
    onSetting: (key, value) => {
      state.settings[key] = value;
      if (key === 'sound') audio.setEnabled(value);
      if (key === 'music') audio.setMusic(value);
      if (key === 'quality') applyQuality(value);
      saveState(state);
    },
    onExport: () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dottor-gelo-save.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Salvataggio esportato.');
    },
    onImport: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = sanitizeState(JSON.parse(text));
          localStorage.setItem(SAVE_KEY, JSON.stringify(imported));
          window.location.reload();
        } catch {
          toast('Il file non è un salvataggio valido.', 'bad');
        }
      };
      input.click();
    },
    onReset: () => {
      ui.showModal({
        kicker: 'AZZERA TUTTO',
        title: 'Cancellare il laboratorio?',
        body: '<p>Il salvataggio locale e ogni ricordo verranno eliminati. Questa azione non può essere annullata.</p>',
        actions: [
          { label: 'ANNULLA', cls: 'ghost' },
          { label: 'CANCELLA TUTTO', cls: 'danger', onClick: () => { try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ } window.location.reload(); } },
        ],
      });
    },
    onFocusArea: (areaId) => {
      state.uiSelected = areaId;
      lab.select(areaId, state);
      lab.focus(areaId, 1.6);
    },
    onClearSelection: () => {
      state.uiSelected = null;
      lab.select(null, state);
    },
    onResetView: () => lab.camera.reset(),
    getCamera: () => lab.camera,
  };

  ui = new UI({ state, actions, minimap });

  function finishBattle() {
    if (!battleActive) return;
    const b = battleActive;
    battleActive = null;
    ui.hideBattle();
    lab.clearBattle();
    lab.camera.reset();
    setStoryMode(false);
    const r = b.result;
    const rewardText = [
      r.rewards.scrap ? `${fmt(r.rewards.scrap)} ⚙` : '',
      r.rewards.circuits ? `${fmt(r.rewards.circuits)} ⌁` : '',
      r.rewards.cells ? `${fmt(r.rewards.cells)} ◉` : '',
    ].filter(Boolean).join(' · ');
    if (r.win) {
      audio.play('win');
      vibrate([12, 30, 12]);
      ui.showModal({
        kicker: r.first ? 'PRIMO COLLAUDO COMPLETATO' : 'COLLAUDO COMPLETATO',
        title: r.node.name,
        body: `<p>Potenza espressa: <b>${fmt(r.power)}</b> contro ${fmt(r.node.power)}. ${r.first ? 'I Buoni non sanno ancora che esisti.' : 'La simulazione è stata ripetuta.'}</p><div class="reward-row">${rewardText ? `<span class="reward">${rewardText}</span>` : ''}</div>`,
        actions: [{ label: 'CONTINUA', cls: 'primary', onClick: () => setTimeout(maybeStory, 250) }],
      });
    } else {
      audio.play('lose');
      const gap = Math.max(0, r.node.power - r.power);
      ui.showModal({
        kicker: 'COLLAUDO FALLITO',
        title: 'Non ancora.',
        body: `<p>Potenza espressa: <b>${fmt(r.power)}</b>. Mancano circa <b>${fmt(gap)}</b> punti. Addestra i cyborg, assegna supervisori, potenzia l’Arena.</p><p>Nessuno è morto. Questa volta.</p>`,
        actions: [{ label: 'TORNA IN ARENA', cls: 'primary', onClick: () => setTimeout(maybeStory, 250) }],
      });
    }
    saveState(state);
    trackHub();
  }

  function processEvents(events) {
    for (const e of events) {
      if (e.type === 'training') {
        audio.play('complete');
        toast(`${e.name}: addestramento completato.${e.levels?.length ? ` Livello ${e.levels[e.levels.length - 1].level}.` : ''}`, 'good');
        if (ui.selectedCyborg === e.cyborgId) ui.openCyborg(e.cyborgId);
        saveState(state);
      } else if (e.type === 'incubation') {
        if (e.ok) {
          audio.play('complete');
          toast(`${e.cyborg.name} è uscito dall’incubatrice.`, 'good');
          lab.fx.spark({ x: AREA_BY_ID.incubator.pos.x, y: 0.55, z: AREA_BY_ID.incubator.pos.z }, '#b8ffd7', 24);
        } else {
          toast(e.reason || 'Incubazione interrotta.', 'bad');
        }
        lab.sync(state);
        saveState(state);
      } else if (e.type === 'expedition') {
        if (isModalOpen()) {
          toast(`Spedizione conclusa: ${e.win ? 'successo' : 'rientro parziale'}.`, e.win ? 'good' : 'bad');
        } else {
          const rows = [
            e.rewards.scrap ? `${fmt(e.rewards.scrap)} ⚙` : '',
            e.rewards.circuits ? `${fmt(e.rewards.circuits)} ⌁` : '',
            e.rewards.cells ? `${fmt(e.rewards.cells)} ◉` : '',
          ].filter(Boolean).join(' · ');
          ui.showModal({
            kicker: 'SPEDIZIONE CONCLUSA',
            title: e.win ? 'Sono tornati.' : 'Sono tornati prima.',
            body: `<p>${e.def.name} · potenza ${fmt(e.power)} / soglia ${fmt(e.def.threshold)}. ${e.win ? 'La squadra ha completato il turno.' : 'Il turno è stato interrotto, ma qualcosa è tornato indietro.'}</p><div class="reward-row">${rows ? `<span class="reward">${rows}</span>` : ''}</div>`,
            actions: [{ label: 'RACCOGLI', cls: 'primary', onClick: () => setTimeout(maybeStory, 250) }],
          });
        }
        audio.play(e.win ? 'win' : 'lose');
        saveState(state);
      } else if (e.type === 'eco') {
        const area = AREA_BY_ID[e.areaId];
        toast(`Eco di memoria in ${area?.name || 'laboratorio'}. Tocca il bagliore.`);
        lab.sync(state);
      } else if (e.type === 'story') {
        maybeStory();
      }
    }
  }

  function handleTap(clientX, clientY) {
    if (!started) return;
    if (storyOpen || tutorialOpen || battleActive) return;
    if (isModalOpen() || isCreateOpen() || isMapOpen()) return;
    if (!$('#panel-cyborgs').classList.contains('hidden') || !$('#panel-arena').classList.contains('hidden') || !$('#panel-diary').classList.contains('hidden') || !$('#panel-memory').classList.contains('hidden')) return;
    const pick = lab.pick(clientX, clientY, state);
    if (!pick) return;
    if (pick.type === 'eco') {
      actions.onCollectEco();
      return;
    }
    if (pick.type === 'area') focusArea(pick.areaId);
  }

  // Tap/drag/pinch on the 3D canvas. UI buttons live above it and never
  // reach the same pointer path.
  const input = new Input(canvas, {
    onTap: handleTap,
    onPan: (dx, dy) => { if (!storyOpen) lab.camera.pan(dx, dy); },
    onZoom: (factor) => { if (!storyOpen) lab.camera.zoomBy(factor); },
  });

  ui.setState(state);
  lab.sync(titleState);
  ui.showTitle(hasSave);
  minimap.draw(titleState, lab.camera);
  engine.onContextLost = () => {
    ui.showWebGLError();
    toast('Contesto WebGL perso. Ricarica la pagina per tornare nel laboratorio.', 'bad');
  };
  engine.start((dt, t) => {
    if (started) {
      const events = tick(state, Date.now(), dt);
      processEvents(events);
    }
    lab.update(dt, t, started ? state : titleState);
    if (battleActive) {
      battleActive.time += dt;
      ui.setBattleProgress(battleActive.time / battleActive.duration);
      if (battleActive.time >= battleActive.duration) finishBattle();
    }
  });

  setInterval(() => {
    if (document.hidden) return;
    if (started) {
      ui.tick();
      if (!storyOpen && !tutorialOpen && !battleActive) maybeStory();
    } else {
      minimap.draw(state, lab.camera);
    }
  }, 400);

  setInterval(() => {
    if (started && !battleActive && !storyOpen) {
      saveState(state);
      trackHub();
    }
  }, 10000);

  window.addEventListener('resize', () => {
    minimap.resize();
    minimap.draw(state, lab.camera);
  });
  window.addEventListener('beforeunload', () => saveState(state));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      saveState(state);
    } else if (hiddenAt && started) {
      const away = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (away > 90000) {
        const report = offlineAdvance(state, Date.now());
        if (report) saveState(state);
        if (report && report.used > 30) {
          if (isModalOpen()) {
            toast(`Rapporto di turno: +${fmt(report.rewards.scrap)} ⚙`, 'good');
          } else {
            ui.showOffline(report, () => { maybeStory(); });
          }
        }
      }
    }
  });

  let pwaReadyMsg = null;
  initPwa({
    onToast: (msg) => { if (started) toast(msg); else pwaReadyMsg = msg; },
    onOffline: (offline) => { if (offline && started) toast('Modalità offline. Il laboratorio funziona lo stesso.'); },
  });

  // Expose a tiny read-only surface for smoke tests and debugging without
  // turning the game into a global mutable singleton.
  window.__gelo = {
    get state() { return state; },
    get ui() { return ui; },
    get lab() { return lab; },
    get actions() { return actions; },
    save: () => saveState(state),
    version: '1.0.0',
  };
}

boot();
