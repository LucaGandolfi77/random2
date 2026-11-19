import type { BroDef, EnemyDef } from '../game/types';

const cache = new Map<string, HTMLCanvasElement>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `rgb(${clamp((n >> 16) + amount)},${clamp(((n >> 8) & 255) + amount)},${clamp((n & 255) + amount)})`;
}

/** GBA-like sprite with 4-frame walk, shaded volumes and readable silhouette. */
export function broSprite(def: BroDef, frame: number, action = false): HTMLCanvasElement {
  const f = frame % 4;
  const key = `b:${def.id}:${f}:${action}`;
  const found = cache.get(key);
  if (found) return found;
  const c = canvas(20, 28);
  const g = c.getContext('2d')!;
  const col = def.colors;
  const r = (x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  const outline = '#161a28';

  const bob = f === 1 || f === 3 ? 1 : 0;
  const legA = f === 1 ? 1 : f === 2 ? 0 : f === 3 ? -1 : 0;
  const legB = -legA;

  // shadow
  g.fillStyle = 'rgba(10,14,24,.28)';
  g.fillRect(3, 26, 14, 2);

  // boots + legs
  r(5 + legA, 20 + bob, 4, 6, outline);
  r(11 + legB, 20 + bob, 4, 6, outline);
  r(6 + legA, 21 + bob, 2, 4, shade(col.boots, 12));
  r(12 + legB, 21 + bob, 2, 4, shade(col.boots, 12));
  r(5 + legA, 25 + bob, 4, 2, '#2a1c10');

  // overalls with straps
  r(4, 11 + bob, 12, 10, outline);
  r(5, 12 + bob, 10, 8, col.overalls);
  r(5, 12 + bob, 10, 2, shade(col.overalls, 26));
  r(6, 12 + bob, 2, 5, shade(col.overalls, -18));
  r(12, 12 + bob, 2, 5, shade(col.overalls, -18));
  // shirt and arms
  r(5, 10 + bob, 10, 3, shade(col.shirt, -10));
  r(2, 12 + bob + (action ? -2 : 0), 4, 7, outline);
  r(3, 13 + bob + (action ? -2 : 0), 2, 5, col.skin);
  r(14, 12 + bob, 4, 7, outline);
  r(15, 13 + bob, 2, 5, col.skin);

  // head
  r(5, 4 + bob, 10, 8, outline);
  r(6, 5 + bob, 8, 6, col.skin);
  r(6, 5 + bob, 8, 2, shade(col.skin, 14));
  // eyes + expression
  r(8, 8 + bob, 2, 2, '#20202a');
  r(12, 8 + bob, 2, 2, '#20202a');
  r(9, 11 + bob, 3, 1, action ? '#8a3028' : '#a86644');

  // cap with emblem and brim
  r(4, 2 + bob, 12, 4, outline);
  r(5, 3 + bob, 10, 3, shade(col.cap, 18));
  r(3, 6 + bob, 14, 2, shade(col.cap, -12));
  r(9, 3 + bob, 3, 3, col.shirt);

  // moustache detail for the brave one
  if (def.id === 'pip') { r(8, 10 + bob, 5, 1, '#5a3a20'); }

  cache.set(key, c);
  return c;
}

/** Distinct silhouettes per enemy family, including crowned bosses. */
export function enemySprite(def: EnemyDef, frame = 0): HTMLCanvasElement {
  const f = frame % 2;
  const key = `e:${def.id}:${f}`;
  const found = cache.get(key);
  if (found) return found;
  const c = canvas(32, 28);
  const g = c.getContext('2d')!;
  const body = def.colors.body;
  const accent = def.colors.accent;
  const r = (x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  const bob = f;
  const outline = '#14121c';

  g.fillStyle = 'rgba(8,10,18,.3)';
  g.fillRect(6, 26, 20, 2);

  // common body
  r(8, 12 + bob, 16, 11, outline);
  r(9, 13 + bob, 14, 9, body);
  r(9, 13 + bob, 14, 3, shade(body, 24));
  r(9, 19 + bob, 14, 3, shade(body, -22));
  // legs
  r(10, 22 + bob, 4, 4, shade(body, -28));
  r(18, 22 + bob, 4, 4, shade(body, -28));
  // eyes
  r(12, 16 + bob, 3, 3, accent);
  r(19, 16 + bob, 3, 3, accent);
  r(13, 17 + bob, 1, 1, def.colors.eye);
  r(20, 17 + bob, 1, 1, def.colors.eye);

  switch (def.id) {
    case 'grubbo':
      r(11, 10 + bob, 10, 3, shade(body, 18));
      r(6, 15 + bob, 3, 5, body); r(23, 15 + bob, 3, 5, body);
      break;
    case 'snapper':
      r(9, 20 + bob, 14, 4, outline);
      r(11, 21 + bob, 2, 2, accent); r(16, 21 + bob, 2, 2, accent); r(21, 21 + bob, 2, 2, accent);
      r(7, 11 + bob, 18, 3, shade(body, 20));
      break;
    case 'flitta':
    case 'skyfin':
      r(4, 12 + bob, 6, 8, shade(accent, -20));
      r(22, 12 + bob, 6, 8, shade(accent, -20));
      r(14, 8 + bob, 4, 4, accent);
      break;
    case 'shroom':
    case 'mimicap':
      r(6, 8 + bob, 20, 6, outline);
      r(7, 9 + bob, 18, 4, accent);
      r(12, 10 + bob, 3, 3, shade(body, -30)); r(19, 10 + bob, 3, 3, shade(body, -30));
      break;
    case 'pebble':
    case 'ashgolem':
      r(7, 9 + bob, 18, 6, shade(body, 18));
      r(10, 6 + bob, 4, 4, body); r(19, 6 + bob, 4, 4, body);
      break;
    case 'emberling':
    case 'voidmoth':
      r(14, 6 + bob, 4, 6, accent);
      r(11, 8 + bob, 3, 5, shade(accent, -20)); r(18, 8 + bob, 3, 5, shade(accent, -20));
      break;
    case 'crystalbug':
    case 'iceling':
    case 'tidewraith':
      r(10, 8 + bob, 12, 5, shade(accent, -10));
      r(13, 9 + bob, 2, 3, '#ffffff'); r(19, 9 + bob, 2, 3, '#ffffff');
      break;
  }

  if (def.boss) {
    // crown, horns and gold trim
    r(9, 6 + bob, 14, 3, accent);
    r(10, 3 + bob, 3, 4, accent);
    r(15, 2 + bob, 3, 5, accent);
    r(20, 3 + bob, 3, 4, accent);
    r(9, 20 + bob, 14, 2, accent);
    r(5, 14 + bob, 3, 7, shade(body, -18));
    r(24, 14 + bob, 3, 7, shade(body, -18));
  }

  cache.set(key, c);
  return c;
}

export function chestSprite(open: boolean): HTMLCanvasElement {
  const key = `c:${open}`;
  const found = cache.get(key);
  if (found) return found;
  const c = canvas(18, 16);
  const g = c.getContext('2d')!;
  g.fillStyle = '#6a3f22'; g.fillRect(1, 5, 16, 10);
  g.fillStyle = '#a87034'; g.fillRect(2, 6, 14, 8);
  g.fillStyle = open ? '#2a2018' : '#c89048'; g.fillRect(1, open ? 1 : 3, 16, 5);
  g.fillStyle = '#f4c542'; g.fillRect(8, open ? 3 : 8, 3, 5);
  g.fillStyle = '#ffe6a0'; g.fillRect(8, open ? 3 : 8, 1, 4);
  cache.set(key, c);
  return c;
}
