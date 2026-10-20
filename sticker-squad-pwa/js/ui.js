// ============================================================
// UI — DOM overlays, HUD, tooltips, health, commands
// ============================================================
const UI = {
  cmdEl: null,
  cmdText: null,
  modeBadge: null,
  hint: null,
  title: null,
  sub: null,
  tipTimer: null,
};

function uiInit() {
  UI.cmdEl = document.getElementById('command-line');
  UI.cmdText = document.getElementById('cmd-text');
  UI.modeBadge = document.getElementById('mode-badge');
  UI.hint = document.getElementById('portal-hint');
  UI.title = document.getElementById('level-title');
  UI.sub = document.getElementById('level-sub');
  updateHealthUI();
  document.getElementById('stick-toggle').addEventListener('click', toggleStickMode);
}

// ── Command Toast ──
function uiShowCommand(text) {
  UI.cmdText.textContent = text;
  UI.cmdEl.classList.add('active');
  if (UI.tipTimer) clearTimeout(UI.tipTimer);
  UI.tipTimer = setTimeout(() => UI.cmdEl.classList.remove('active'), 1800);
}

// ── Mode Badge ──
function uiUpdateModeBadge() {
  const map = {
    grounded: ['MODE: GROUNDED', '#ffd700'],
    air: ['MODE: AIR', '#66ccff'],
    sticking: ['MODE: STICKING', '#ff66cc'],
    peeling: ['MODE: PEELING...', '#ff9966'],
  };
  const [t, c] = map[STATE.mode] || map.grounded;
  UI.modeBadge.textContent = t;
  UI.modeBadge.style.color = c;
}

// ── Level Title Splash ──
function uiSpawnTitle(title, sub) {
  UI.title.textContent = title;
  UI.sub.textContent = sub;
  UI.title.classList.add('show');
  UI.sub.classList.add('show');
  setTimeout(() => {
    UI.title.classList.remove('show');
    UI.sub.classList.remove('show');
  }, 3000);
}

// ── HUD ──
function updateHUD() {
  document.getElementById('stick-count').textContent = STATE.sticks;
  document.getElementById('score').textContent = STATE.score;
}

function updateHealthUI() {
  const bar = document.getElementById('health-bar');
  bar.innerHTML = '';
  for (let i = 0; i < STATE.maxHealth; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = i < STATE.health ? '❤' : '🖤';
    bar.appendChild(h);
  }
}

// ── Portal Hint ──
function uiShowPortalHint(show) {
  if (show) UI.hint.classList.add('visible');
  else UI.hint.classList.remove('visible');
}

// ── Progress Overlay ──
function uiShowProgress(title, desc, onNext) {
  const ov = document.getElementById('progress-overlay');
  document.getElementById('progress-title').textContent = title;
  document.getElementById('progress-desc').textContent = desc;
  ov.classList.add('visible');
  const btn = document.getElementById('progress-btn');
  const handler = () => {
    ov.classList.remove('visible');
    btn.removeEventListener('click', handler);
    onNext();
  };
  btn.addEventListener('click', handler);
}

// ── Zone Name ──
function uiSetZone(name) {
  document.getElementById('zone-name').textContent = name;
}
