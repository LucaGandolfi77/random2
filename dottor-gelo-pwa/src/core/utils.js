export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const nowSec = () => Date.now() / 1000;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));

export function fmt(n, digits = 0) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (abs >= 1e4) return (v / 1e3).toFixed(1).replace('.0', '') + 'K';
  if (abs >= 1000) return Math.floor(v).toLocaleString('it-IT');
  if (digits > 0) return v.toFixed(digits).replace('.', ',');
  return String(Math.floor(v));
}

export function fmtRate(n) {
  if (!n) return '0';
  if (n < 0.01) return n.toFixed(3).replace('.', ',');
  if (n < 1) return n.toFixed(2).replace('.', ',');
  return n.toFixed(1).replace('.', ',');
}

export function pct(n) {
  return Math.round((Number(n) || 0) * 100) + '%';
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export function formatCountdown(ms) {
  return formatDuration(Math.max(0, ms / 1000));
}

export function timeAgo(ms) {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s fa`;
  if (s < 3600) return `${Math.floor(s / 60)}m fa`;
  if (s < 86400) return `${Math.floor(s / 3600)}h fa`;
  return `${Math.floor(s / 86400)}g fa`;
}

export function shade(hex, factor) {
  const h = String(hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = clamp(Math.round(((n >> 16) & 255) * factor), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * factor), 0, 255);
  const b = clamp(Math.round((n & 255) * factor), 0, 255);
  return `rgb(${r},${g},${b})`;
}

export function randomId(prefix = 'x') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function vibrate(pattern) {
  try {
    if (navigator?.vibrate) navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}
