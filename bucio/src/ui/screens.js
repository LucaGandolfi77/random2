import { formatInt, store } from '../core/utils.js';
import { TIERS, R0 } from '../game/hole.js';
import { THEMES, THEME_IDS, currentTheme } from '../world/themes.js';
import { MODES, MODE_IDS, DEFAULT_MODE } from '../game/modes.js';

const $ = (id) => document.getElementById(id);

/** Schermate: menu, come si gioca, pausa, risultati. */
export class Screens {
  constructor(hooks) {
    this.hooks = hooks;
    this.el = {
      menu: $('menu'),
      howto: $('howto'),
      pause: $('pause'),
      results: $('results'),
      loader: $('loader'),
    };
    this.current = 'menu';
    this.modeId = DEFAULT_MODE;
    this._buildTiers();
    this._bind();
  }

  _bind() {
    $('btn-play').onclick = () => this.hooks.onPlay();
    $('btn-howto').onclick = () => this.show('howto');
    $('btn-howto-close').onclick = () => this.show('menu');
    $('btn-resume').onclick = () => this.hooks.onResume();
    $('btn-quit').onclick = () => this.hooks.onQuit();
    $('btn-again').onclick = () => this.hooks.onPlay();
    $('btn-menu').onclick = () => this.hooks.onQuit();
    $('btn-install').onclick = () => this.hooks.onInstall?.();
    $('btn-ios').onclick = () =>
      this.hooks.onToast?.('Su iPhone: tocca Condividi e poi "Aggiungi alla schermata Home"');

    const m = $('sel-mode');
    m.innerHTML = MODE_IDS.map(
      (id) => `<option value="${id}">${MODES[id].emoji} ${MODES[id].name}</option>`
    ).join('');
    m.value = store.get('bucio.mode', DEFAULT_MODE);
    if (!MODES[m.value]) m.value = DEFAULT_MODE;
    m.onchange = () => this.hooks.onMode(m.value);

    const th = $('sel-theme');
    th.innerHTML =
      THEME_IDS.map(
        (id) =>
          `<option value="${id}">${THEMES[id].emoji} ${THEMES[id].name}</option>`
      ).join('') + '<option value="random">🎲 Casuale</option>';
    th.value = store.get('bucio.theme', 'portomarina');
    th.onchange = () => this.hooks.onTheme(th.value);
    this.setTheme(currentTheme().id);

    const q = $('sel-quality');
    q.value = store.get('bucio.quality', 'high');
    q.onchange = () => this.hooks.onQuality(q.value);

    const s = $('sel-sound');
    s.value = store.get('bucio.sound', 'on');
    s.onchange = () => this.hooks.onSound(s.value === 'on');

    const sh = $('chk-shake');
    sh.checked = store.get('bucio.shake', true);
    sh.onchange = () => this.hooks.onShake(sh.checked);
  }

  _buildTiers() {
    $('howto-tiers').innerHTML = TIERS.slice(1)
      .map(
        (t, i) => `<div class="tier-item">
          <div class="tier-badge">${i + 1}</div>
          <div><b>${t.name} · da ${t.r.toFixed(1)} m</b><span>${t.perk}</span></div>
        </div>`
      )
      .join('');
  }

  show(name) {
    for (const [k, el] of Object.entries(this.el)) {
      if (k === 'loader') continue;
      el.hidden = k !== name;
    }
    this.current = name;
    if (name === 'menu') this.refreshBest();
  }

  hideAll() {
    for (const [k, el] of Object.entries(this.el)) {
      if (k === 'loader') continue;
      el.hidden = true;
    }
    this.current = null;
  }

  hideLoader() {
    this.el.loader.classList.add('gone');
    setTimeout(() => {
      this.el.loader.hidden = true;
    }, 600);
  }

  refreshBest() {
    const theme = currentTheme().id;
    // chiave per modalità, con fallback alla vecchia: i record preesistenti
    // della modalità città non vanno persi
    const best = Math.max(
      store.get(`bucio.best.${this.modeId}.${theme}`, 0),
      this.modeId === DEFAULT_MODE ? store.get(`bucio.best.${theme}`, 0) : 0,
      store.get('bucio.best', 0)
    );
    $('menu-best').textContent = formatInt(best);
    $('menu-bestsize').textContent = store.get('bucio.bestSize', R0).toFixed(1);
  }

  /** Nome del luogo nel pitch del menu. */
  setTheme(id) {
    const t = THEMES[id];
    if (!t) return;
    $('menu-place').textContent = t.name;
    $('sel-theme').value = id;
  }

  /** La modalità scelta: cambia il pitch, il record mostrato e la durata. */
  setMode(id) {
    if (!MODES[id]) return;
    this.modeId = id;
    const m = MODES[id];
    $('sel-mode').value = id;
    $('menu-mode').textContent = m.pitch;
    const mins = Math.round(m.time / 60);
    $('menu-pitch-time').textContent =
      m.time % 60 ? `${m.time} secondi` : `${mins} ${mins === 1 ? 'minuto' : 'minuti'}`;
  }

  /** Schermata finale: classifica, record, statistiche. */
  showResults(res) {
    const { ranking, player } = res;
    const knockout = MODES[res.mode]?.knockout ?? false;
    const eaten = res.reason === 'out';
    const lastOne = res.reason === 'last';

    let title;
    let sub;
    if (lastOne) {
      title = 'Ultimo buco in piedi';
      sub = 'Tutti gli altri sono polvere. Il posto è tuo.';
    } else if (eaten) {
      title = 'Divorato';
      sub = 'Uno dei rivali ti ha risucchiato. La partita è finita lì.';
    } else if (player.place === 1) {
      title = 'Hai divorato tutto!';
      sub = 'Nessuno è stato più veloce di te. La città è polvere.';
    } else {
      title = `#${player.place} di ${ranking.length}`;
      sub = 'La città è stata divorata. Quasi tutta.';
    }
    $('res-title').textContent = title;
    $('res-sub').textContent = sub;

    $('res-score').textContent = formatInt(player.score);
    const theme = currentTheme().id;
    const key = `bucio.best.${this.modeId}.${theme}`;
    const old = this.modeId === DEFAULT_MODE ? store.get(`bucio.best.${theme}`, 0) : 0;
    const rec = Math.max(store.get(key, 0), old, store.get('bucio.best', 0));
    const isRecord = player.score > rec;
    if (isRecord) {
      store.set('bucio.best', player.score);
      store.set(key, player.score);
    }
    if (player.maxR > store.get('bucio.bestSize', 0)) store.set('bucio.bestSize', player.maxR);
    $('res-record').hidden = !isRecord;

    $('res-board').innerHTML = ranking
      .map(
        (r) => `<li class="res-row ${r.isPlayer ? 'me' : ''} ${r.out ? 'ko' : ''}">
          <span class="res-place">${r.place}</span>
          <span class="res-dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span>
          <span class="res-name">${r.name}${r.out ? '<em class="ko-tag">KO</em>' : ''}</span>
          <span class="res-pts">${formatInt(r.score)}</span>
        </li>`
      )
      .join('');

    const mangiati = player.eaten === 1 ? 'oggetto divorato' : 'oggetti divorati';
const ko = knockout
      ? player.kills === 1
        ? 'rivale eliminato'
        : 'rivali eliminati'
      : player.kills === 1
        ? 'rivale divorato'
        : 'rivali divorati';
    $('res-stats').innerHTML = `
      <div class="stat"><b>${player.eaten}</b> ${mangiati}</div>
      <div class="stat"><b>${player.maxR.toFixed(1)} m</b> buco più grande</div>
      <div class="stat"><b>x${player.bestCombo}</b> combo migliore</div>
      <div class="stat"><b>${player.kills}</b> ${ko}</div>
      <div class="stat"><b>${player.powers ?? 0}</b> potenziamenti</div>
      <div class="stat"><b>${TIERS[player.tier]?.name ?? '—'}</b> livello finale</div>`;

    this.show('results');
  }

  setInstallAvailable(on) {
    $('btn-install').hidden = !on;
  }

  setIosHint(on) {
    $('btn-ios').hidden = !on;
  }

  setOffline(on) {
    $('offline-note').hidden = !on;
  }
}