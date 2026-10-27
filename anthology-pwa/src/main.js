import CONFIG from './config.js';
import { loadState, saveState, addNote, markVisited, isVisited } from './storage.js';
import { initRender, clearScreen, setReaderVisual } from './render.js';
import { initAudio, playMemory } from './audio.js';
import { SCENES } from './scenes.js';

const LABELS = {
  en: {
    mem: 'Memory', mel: 'Melancholy', art: 'Art', hint: '▸ tap or press Space to continue',
    back: '← Return to the Library', again: '↻ Read the scene again',
    full: 'Open the full multi-act book ▸', chose: 'Choice: ',
    heading: 'The Library',
    subheading: 'A Collection of Melancholic Visual Novels',
    fltAll: 'All Works (26)',
    fltClassic: 'Classics · Full Books (12)',
    fltMulti: 'Multiverso · Sci-Fi Reimaginings (14)',
    prologueBtn: 'Prologue — Read Scene',
    readBtn: 'Read Scene',
    fullBookCard: 'Open Full Book ▸',
    worksLabel: 'Works: <strong>26</strong>',
    langsLabel: 'Languages: <strong>English / Italiano</strong>',
    formatLabel: 'Format: <strong>Visual Novel PWA</strong>',
    langSwitch: 'Lingua: Italiano'
  },
  it: {
    mem: 'Memoria', mel: 'Malinconia', art: 'Arte', hint: '▸ tocca o premi Spazio per continuare',
    back: '← Ritorna alla Biblioteca', again: '↻ Rileggi la scena',
    full: 'Apri il libro interattivo completo ▸', chose: 'Scelta: ',
    heading: 'La Biblioteca',
    subheading: 'Una Collezione di Visual Novel Malinconiche',
    fltAll: 'Tutte le Opere (26)',
    fltClassic: 'I Classici · Libri Completi (12)',
    fltMulti: 'Multiverso · Riscritture Sci-Fi (14)',
    prologueBtn: 'Prologo — Leggi Scena',
    readBtn: 'Leggi Scena',
    fullBookCard: 'Apri Libro Completo ▸',
    worksLabel: 'Opere: <strong>26</strong>',
    langsLabel: 'Lingue: <strong>Italiano / English</strong>',
    formatLabel: 'Formato: <strong>Visual Novel PWA</strong>',
    langSwitch: 'Language: English'
  }
};

const TAG_IT = {
  French: 'Francese', Russian: 'Russo', Italian: 'Italiano', German: 'Tedesco', Irish: 'Irlandese',
  Redemption: 'Redenzione', Justice: 'Giustizia', Psychology: 'Psicologia', Guilt: 'Colpa',
  Memory: 'Memoria', Contemplation: 'Contemplazione', Philosophy: 'Filosofia', Faith: 'Fede',
  Transcendence: 'Trascendenza', Absurd: 'Assurdo', Melancholy: 'Malinconia', Love: 'Amore',
  Fate: 'Destino', Tragedy: 'Tragedia', Mortality: 'Mortalità', Beauty: 'Bellezza', Art: 'Arte',
  Isolation: 'Isolamento', Scripture: 'Scrittura', Bilingual: 'Bilingue',
  Multiverse: 'Multiverso', Archive: 'Archivio', Loop: 'Ciclo', Mirror: 'Specchio',
  Simulation: 'Simulazione', Reality: 'Realtà', AI: 'IA', Network: 'Rete', Urban: 'Urbano',
  Digital: 'Digitale', Legacy: 'Eredità', Identity: 'Identità', Cyberpunk: 'Cyberpunk',
  Ethics: 'Etica', Cosmic: 'Cosmico'
};

let R = { story: null, scene: null, idx: 0, phase: 'lines', branch: null, stats: { mem: 0, mel: 0, art: 0 } };
let currentFilter = 'all';

function $(id) { return document.getElementById(id); }
function L(k) { return LABELS[CONFIG.language === 'it' ? 'it' : 'en'][k]; }
function txt(t) { if (t == null) return ''; if (typeof t === 'string') return t; return CONFIG.language === 'it' ? (t.it || t.en) : (t.en || t.it); }
function spk(s) { if (!s) return ''; return typeof s === 'string' ? s : txt(s); }

function currentLines() {
  if (R.phase === 'branch') return (R.branch && R.branch.lines) || [];
  return R.scene ? R.scene.lines : [];
}

function showStats() {
  const el = $('reader-stats');
  if (el) el.textContent = L('mem') + ' ' + R.stats.mem + ' · ' + L('mel') + ' ' + R.stats.mel + ' · ' + L('art') + ' ' + R.stats.art;
}

function applyEffect(e) {
  if (!e) return;
  ['mem', 'mel', 'art'].forEach(k => {
    R.stats[k] = Math.max(0, Math.min(20, (R.stats[k] || 0) + (e[k] || 0)));
  });
  showStats();
  const st = loadState();
  if (!st.libraryStats) st.libraryStats = { mem: 0, mel: 0, art: 0 };
  ['mem', 'mel', 'art'].forEach(k => { st.libraryStats[k] = (st.libraryStats[k] || 0) + (e[k] || 0); });
  saveState(st);
}

function fmtEffect(e) {
  if (!e) return '';
  const names = { mem: L('mem'), mel: L('mel'), art: L('art') };
  const parts = [];
  ['mem', 'mel', 'art'].forEach(k => {
    const v = e[k] || 0;
    if (v !== 0) parts.push((v > 0 ? '+' : '−') + Math.abs(v) + ' ' + names[k]);
  });
  return parts.join(' · ');
}

function localizeLibraryDOM() {
  const isIt = CONFIG.language === 'it';
  if ($('lib-heading')) $('lib-heading').textContent = L('heading');
  if ($('lib-subheading')) $('lib-subheading').textContent = L('subheading');
  if ($('flt-all')) $('flt-all').textContent = L('fltAll');
  if ($('flt-classic')) $('flt-classic').textContent = L('fltClassic');
  if ($('flt-multiverse')) $('flt-multiverse').textContent = L('fltMulti');
  if ($('stat-works')) $('stat-works').innerHTML = L('worksLabel');
  if ($('stat-langs')) $('stat-langs').innerHTML = L('langsLabel');
  if ($('stat-format')) $('stat-format').innerHTML = L('formatLabel');
  if ($('lang-toggle-btn')) $('lang-toggle-btn').textContent = L('langSwitch');

  const cards = document.querySelectorAll('.book-card');
  cards.forEach(card => {
    const id = card.getAttribute('data-id') || ((card.getAttribute('onclick') || '').match(/openVN\('([a-z_]+)'\)/) || [])[1];
    if (!id) return;
    const item = CONFIG.library.find(s => s.id === id);
    if (!item) return;

    const h3 = card.querySelector('h3');
    if (h3) h3.textContent = txt(item.title);
    const auth = card.querySelector('.author');
    if (auth) auth.textContent = txt(item.author);
    const p = card.querySelector('p');
    if (p && item.desc) p.textContent = txt(item.desc);

    const tagRow = card.querySelector('.tag-row');
    if (tagRow && Array.isArray(item.tags)) {
      tagRow.innerHTML = item.tags.map(t => `<span class="tag">${isIt ? (TAG_IT[t] || t) : t}</span>`).join('');
    }

    const playLink = card.querySelector('.play-link');
    if (playLink) playLink.textContent = item.path ? L('prologueBtn') : L('readBtn');
    const fullLink = card.querySelector('.full-book-link');
    if (fullLink) fullLink.textContent = L('fullBookCard');
  });
}

function renderLine() {
  if (R.phase === 'end') { renderEnd(); return; }
  if (R.phase === 'choices') { renderChoices(); return; }
  const arr = currentLines();
  const line = arr[R.idx];
  if (!line) { advance(); return; }
  const sp = $('reader-speaker'), tx = $('reader-text');
  sp.textContent = spk(line.s);
  tx.classList.remove('r-in'); void tx.offsetWidth; tx.classList.add('r-in');
  tx.textContent = txt(line.t);
  const hint = $('reader-hint');
  hint.textContent = L('hint');
  hint.style.visibility = (R.phase === 'branch' && R.idx >= arr.length - 1) ? 'hidden' : 'visible';
}

function renderChoices() {
  const box = $('reader-choices');
  box.innerHTML = '';
  R.scene.choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'r-choice'; b.type = 'button';
    b.textContent = txt(c.text) + (fmtEffect(c.effect) ? '   ·   ' + fmtEffect(c.effect) : '');
    b.addEventListener('click', ev => { ev.stopPropagation(); choose(i); });
    box.appendChild(b);
  });
  box.classList.remove('hidden');
  $('reader-stage').classList.add('hidden');
  $('reader-end').classList.add('hidden');
}

function choose(i) {
  const c = R.scene.choices[i];
  if (!c) return;
  applyEffect(c.effect);
  addNote(L('chose') + txt(c.text));
  R.branch = c;
  R.idx = 0;
  R.phase = 'branch';
  $('reader-choices').classList.add('hidden');
  $('reader-stage').classList.remove('hidden');
  renderLine();
}

function renderEnd() {
  $('reader-stage').classList.add('hidden');
  $('reader-choices').classList.add('hidden');
  const note = $('reader-end-note');
  note.textContent = R.scene.outro ? txt(R.scene.outro) : '';
  $('reader-back').textContent = L('back');
  $('reader-again').textContent = L('again');
  const full = $('reader-continue');
  if (R.story.path) {
    full.textContent = L('full');
    full.href = R.story.path;
    full.classList.remove('hidden');
  } else {
    full.classList.add('hidden');
  }
  $('reader-end').classList.remove('hidden');
  markVisited(R.story.id);
  markLibraryCards();
}

function markLibraryCards() {
  const cards = document.querySelectorAll('.book-card');
  let read = 0;
  const readLabel = CONFIG.language === 'it' ? 'letta ✓' : 'read ✓';
  cards.forEach(card => {
    const m = (card.getAttribute('onclick') || '').match(/openVN\('([a-z_]+)'\)/);
    if (!m) return;
    if (isVisited(m[1])) {
      read++;
      card.classList.add('read');
      let badge = card.querySelector('.read-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'read-badge';
        card.appendChild(badge);
      }
      badge.textContent = readLabel;
    }
  });
  const p = $('progress-line');
  if (p) p.innerHTML = (CONFIG.language === 'it' ? 'Scene lette: ' : 'Scenes read: ') + '<strong>' + read + ' / ' + CONFIG.library.length + '</strong>';
}

function advance() {
  if (!R.scene) return;
  if (R.phase === 'choices' || R.phase === 'end') return;
  const arr = currentLines();
  if (R.idx < arr.length - 1) { R.idx++; renderLine(); return; }
  if (R.phase === 'lines') { R.phase = 'choices'; R.idx = 0; renderChoices(); return; }
  R.phase = 'end';
  renderEnd();
}

function restartScene() {
  if (!R.scene) return;
  R.idx = 0;
  R.phase = 'lines';
  R.branch = null;
  const si = R.story.statInit || {};
  R.stats = { mem: si.mem || 0, mel: si.mel || 0, art: si.art || 0 };
  $('reader-end').classList.add('hidden');
  $('reader-choices').classList.add('hidden');
  $('reader-stage').classList.remove('hidden');
  showStats();
  renderLine();
}

function closeReader() {
  $('reader').classList.add('hidden');
  $('reader-end').classList.add('hidden');
  $('reader-choices').classList.add('hidden');
  $('reader-stage').classList.remove('hidden');
  R.scene = null; R.story = null;
}

export function initMain() {
  initRender(); initAudio();
  const saved = loadState();
  if (saved && saved.language) { CONFIG.language = saved.language; }
  else { CONFIG.language = 'en'; }
  localizeLibraryDOM();
  renderLibrary();
  playMemory(165, 2);
  const menu = document.getElementById('start-menu');
  const about = document.getElementById('about-menu');

  window.filterLibrary = (flt) => {
    currentFilter = flt || 'all';
    document.querySelectorAll('.filter-pill').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-filter') === currentFilter);
    });
    document.querySelectorAll('.book-card').forEach(card => {
      const k = card.getAttribute('data-kind') || 'classic';
      card.classList.toggle('hidden-card', currentFilter !== 'all' && k !== currentFilter);
    });
  };

  window.switchLang = () => {
    CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en';
    const s = loadState(); s.language = CONFIG.language; saveState(s);
    localizeLibraryDOM();
    renderLibrary();
    markLibraryCards();
    if (R.scene) {
      $('reader-title').textContent = txt(R.story.title);
      $('reader-place').textContent = R.scene.place ? txt(R.scene.place) : '';
      showStats();
      if (R.phase === 'end') renderEnd();
      else if (R.phase === 'choices') renderChoices();
      else renderLine();
    }
  };

  window.openVN = (id) => {
    const story = CONFIG.library.find(s => s.id === id);
    if (!story) return;
    const scene = SCENES[story.scene];
    const st = loadState(); st.currentStory = story.id; saveState(st);
    if (!scene) {
      if (story.path) window.location.href = story.path;
      return;
    }
    addNote((CONFIG.language === 'it' ? 'Scena aperta: ' : 'Scene opened: ') + txt(story.title));
    const si = story.statInit || {};
    R = { story, scene, idx: 0, phase: 'lines', branch: null, stats: { mem: si.mem || 0, mel: si.mel || 0, art: si.art || 0 } };
    $('reader-title').textContent = txt(story.title);
    $('reader-place').textContent = scene.place ? txt(scene.place) : '';
    $('reader-end').classList.add('hidden');
    $('reader-choices').classList.add('hidden');
    $('reader-stage').classList.remove('hidden');
    showStats();
    $('reader').classList.remove('hidden');
    setReaderVisual(story.visual || 'candles');
    playMemory(196, 2);
    renderLine();
  };

  window.showAbout = () => {
    if (menu) { menu.classList.add('hidden'); menu.style.display = 'none'; }
    if (about) { about.classList.remove('hidden'); about.style.display = 'flex'; }
  };

  window.backToLibrary = () => {
    if (about) about.classList.add('hidden');
    if (menu) { menu.classList.remove('hidden'); menu.style.display = 'flex'; }
  };

  markLibraryCards();

  $('reader-stage').addEventListener('click', advance);
  $('reader-back').addEventListener('click', closeReader);
  $('reader-again').addEventListener('click', restartScene);
  document.addEventListener('keydown', (e) => {
    if ($('reader').classList.contains('hidden')) return;
    if (e.key === 'Escape') { closeReader(); }
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
  });

  if (menu) menu.classList.remove('hidden');
}

function renderLibrary() { clearScreen(); }

initMain();
