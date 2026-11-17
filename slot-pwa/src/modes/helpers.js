/* Shared helpers for the score-based game modes. */
import { creditWin } from '../state.js';

export const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');

/* Standard result panel used by the run-based modes. */
export function panel(title, big, lines, extra = '') {
  return {
    title,
    html: `<div class="big-prize">${big}</div>` +
      lines.map((l) => `<p>${l}</p>`).join('') +
      extra +
      '<button class="btn primary wide" data-action="close">Collect</button>',
  };
}

/* Pay a score-based reward and remember the best run. */
export function finishRun(state, bucket, key, score, scale = 1, bonus = 0) {
  const reward = Math.max(50, Math.floor(score * scale) + bonus);
  creditWin(state, reward);
  const rec = state.modes[bucket];
  rec.best = Math.max(rec.best || 0, score);
  rec.runs = (rec.runs || 0) + 1;
  rec.last = score;
  return reward;
}

export function progressBar(value, max, color = 'var(--edge)') {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="bar"><i style="width:${pct}%;background:${color}"></i></div>`;
}
