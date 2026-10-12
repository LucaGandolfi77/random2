import { formatInt, store } from '../core/utils.js';
import { TIERS, R0 } from '../game/hole.js';
import { THEMES, THEME_IDS, currentTheme } from '../world/themes.js';

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
    const key = `bucio.best.${currentTheme().id}`;
    $('menu-best').textContent = formatInt(Math.max(store.get(key, 0), store.get('bucio.best', 0)));
    $('menu-bestsize').textContent = store.get('bucio.bestSize', R0).toFixed(1);
  }

  /** Nome del luogo nel pitch del menu. */
  setTheme(id) {
    const t = THEMES[id];
    if (!t) return;
    $('menu-place').textContent = t.name;
    $('sel-theme').value = id;
  }

  /** Schermata finale: classifica, record, statistiche. */
  showResults(res) {
    const { ranking, player } = res;
    const won = player.place === 1;
    $('res-title').textContent = won ? 'Hai divorato tutto!' : `#${player.place} di ${ranking.length}`;
    $('res-sub').textContent = won
      ? 'Nessuno è stato più veloce di te. La città è polvere.'
      : 'La città è stata divorata. Quasi tutta.';

    $('res-score').textContent = formatInt(player.score);
    const key = `bucio.best.${currentTheme().id}`;
    const rec = Math.max(store.get(key, 0), store.get('bucio.best', 0));
    const isRecord = player.score > rec;
    if (isRecord) {
      store.set('bucio.best', player.score);
      store.set(key, player.score);
    }
    if (player.maxR > store.get('bucio.bestSize', 0)) store.set('bucio.bestSize', player.maxR);
    $('res-record').hidden = !isRecord;

    $('res-board').innerHTML = ranking
      .map(
        (r) => `<li class="res-row ${r.isPlayer ? 'me' : ''}">
          <span class="res-place">${r.place}</span>
          <span class="res-dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span>
          <span class="res-name">${r.name}</span>
          <span class="res-pts">${formatInt(r.score)}</span>
        </li>`
      )
      .join('');

    const mangiati = player.eaten === 1 ? 'oggetto divorato' : 'oggetti divorati';
    const morsi = player.kills === 1 ? 'rivale divorato' : 'rivali divorati';
    $('res-stats').innerHTML = `
      <div class="stat"><b>${player.eaten}</b> ${mangiati}</div>
      <div class="stat"><b>${player.maxR.toFixed(1)} m</b> buco più grande</div>
      <div class="stat"><b>x${player.bestCombo}</b> combo migliore</div>
      <div class="stat"><b>${player.kills}</b> ${morsi}</div>
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