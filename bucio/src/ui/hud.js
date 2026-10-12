import { formatInt, clamp } from '../core/utils.js';
import { TIERS } from '../game/hole.js';
import { POWERS } from '../game/powerups.js';

const $ = (id) => document.getElementById(id);
const ARC = 2 * Math.PI * 44;

/** HUD: tutto quello che legg mentre gioco. Niente logica di gioco qui. */
export class Hud {
  constructor() {
    this.root = $('hud');
    this.score = $('hud-score');
    this.timer = $('hud-timer');
    this.timerWrap = $('hud-timer-wrap');
    this.arc = $('hud-timer-arc');
    this.pips = $('hud-pips');
    this.tierName = $('hud-tier');
    this.sizeBar = $('hud-sizebar');
    this.sizeLabel = $('hud-sizelabel');
    this.board = $('hud-board');
    this.combo = $('hud-combo');
    this.comboX = $('hud-combo-x');
    this.feed = $('hud-feed');
    this.toastEl = $('hud-toast');
    this.pulseHint = $('hud-pulse');
    this.powers = $('hud-powers');
    this._powerNodes = new Map();
    this.lines = [];
    this._toastT = null;
    this._lastBoard = '';

    this.arc.style.strokeDasharray = ARC;
    this.pips.innerHTML = TIERS.slice(1)
      .map(() => '<i></i>')
      .join('');
  }

  show(on) {
    this.root.hidden = !on;
  }

  setScore(v) {
    this.score.textContent = formatInt(v);
  }

  setTimer(sec, total) {
    const s = Math.ceil(sec);
    this.timer.textContent = s;
    this.arc.style.strokeDashoffset = ARC * (1 - clamp(sec / total, 0, 1));
    this.timerWrap.classList.toggle('urgent', sec <= 10);
  }

  setTier(tier) {
    const info = TIERS[tier] ?? TIERS[0];
    this.tierName.textContent = info.name;
    [...this.pips.children].forEach((p, i) => p.classList.toggle('on', i < tier));
  }

  setSize(r) {
    const next = TIERS.find((t) => t.r > r) ?? TIERS[TIERS.length - 1];
    const from = [...TIERS].reverse().find((t) => t.r <= r)?.r ?? 1.15;
    const k = clamp((r - from) / Math.max(0.001, next.r - from), 0, 1);
    this.sizeBar.style.width = `${6 + k * 94}%`;
    this.sizeLabel.textContent = `${r.toFixed(1)} m`;
  }

  setBoard(rows) {
    const key = rows.map((r) => `${r.name}${r.score}${r.out ? 'x' : ''}`).join('|');
    if (key === this._lastBoard) return;
    this._lastBoard = key;
    this.board.innerHTML = rows
      .map(
        (r, i) => `<div class="board-row ${r.isPlayer ? 'me' : ''} ${i === 0 ? 'lead' : ''} ${
          r.out ? 'out' : ''
        }">
          <span class="board-dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span>
          <span class="board-name">${r.name}</span>
          <span class="board-score">${r.out ? 'KO' : formatInt(r.score)}</span>
        </div>`
      )
      .join('');
  }

  setCombo(n) {
    if (n < 3) {
      this.combo.hidden = true;
      return;
    }
    this.combo.hidden = false;
    this.comboX.textContent = `x${Math.min(n, 99)}`;
    this.combo.style.animation = 'none';
    void this.combo.offsetWidth;
    this.combo.style.animation = '';
  }

  setPulseReady(on) {
    this.pulseHint.hidden = !on;
  }

  /** Potenziamenti attivi: pastiglia con il tempo che resta. */
  setPowers(state) {
    for (const [id, t] of Object.entries(state)) {
      const def = POWERS[id];
      if (!def || def.dur === 0) continue;
      let node = this._powerNodes.get(id);
      if (t <= 0) {
        if (node) {
          node.remove();
          this._powerNodes.delete(id);
        }
        continue;
      }
      if (!node) {
        node = document.createElement('div');
        node.className = 'power';
        node.style.color = `#${def.color.toString(16).padStart(6, '0')}`;
        node.innerHTML = `<b>${def.label}</b><span></span><i></i>`;
        this.powers.appendChild(node);
        this._powerNodes.set(id, node);
      }
      node.querySelector('span').textContent = `${Math.ceil(t)}s`;
      node.querySelector('i').style.width = `${(t / def.dur) * 100}%`;
    }
  }

  /** Notifiche brevi a sinistra: cosa hai appena divorato. */
  pushFeed(text, kind = '') {
    const el = document.createElement('div');
    el.className = `feed-line ${kind}`;
    el.textContent = text;
    this.feed.appendChild(el);
    this.lines.push({ el, t: 3.6 });
    while (this.lines.length > 4) {
      const old = this.lines.shift();
      old.el.remove();
    }
  }

  toast(text, ms = 1700) {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    this.toastEl.style.animation = 'none';
    void this.toastEl.offsetWidth;
    this.toastEl.style.animation = '';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => {
      this.toastEl.hidden = true;
    }, ms);
  }

  update(dt) {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      l.t -= dt;
      if (l.t <= 0) {
        l.el.classList.add('fade');
        setTimeout(() => l.el.remove(), 420);
        this.lines.splice(i, 1);
      }
    }
  }

  clearFeed() {
    this.feed.innerHTML = '';
    this.powers.innerHTML = '';
    this._powerNodes.clear();
    this.lines.length = 0;
    this.toastEl.hidden = true;
    this.combo.hidden = true;
    this._lastBoard = '';
  }
}