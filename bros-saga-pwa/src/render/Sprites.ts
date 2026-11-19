import type { BroDef, EnemyDef } from '../game/types';

const cache = new Map<string, HTMLCanvasElement>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function broSprite(def: BroDef, frame: number, action = false): HTMLCanvasElement {
  const key = `b:${def.id}:${frame % 2}:${action}`;
  const found = cache.get(key);
  if (found) return found;
  const c = canvas(16, 24);
  const g = c.getContext('2d')!;
  const bob = frame % 2;
  const r = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y + bob, w, h); };
  // boots and legs
  r(4, 19, 3, 4, def.colors.boots);
  r(9, 19, 3, 4, def.colors.boots);
  // body
  r(3, 11, 10, 9, def.colors.overalls);
  r(4, 10, 8, 3, def.colors.shirt);
  // arms
  r(1, 12, 3, 6, def.colors.shirt);
  r(12, 12, 3, 6, def.colors.shirt);
  if (action) { r(0, 9, 4, 4, def.colors.skin); r(12, 9, 4, 4, def.colors.skin); }
  // head
  r(4, 4, 8, 7, def.colors.skin);
  r(5, 7, 2, 2, '#20202a');
  r(9, 7, 2, 2, '#20202a');
  r(7, 9, 3, 1, '#a06040');
  // cap
  r(3, 2, 10, 4, def.colors.cap);
  r(2, 5, 12, 2, def.colors.cap);
  r(7, 2, 2, 4, def.colors.shirt);
  cache.set(key, c);
  return c;
}

export function enemySprite(def: EnemyDef, frame = 0): HTMLCanvasElement {
  const key = `e:${def.id}:${frame % 2}`;
  const found = cache.get(key);
  if (found) return found;
  const c = canvas(28, 24);
  const g = c.getContext('2d')!;
  const bob = frame % 2;
  const r = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y + bob, w, h); };
  r(6, 16, 4, 7, def.colors.body);
  r(18, 16, 4, 7, def.colors.body);
  r(4, 7, 20, 11, def.colors.body);
  r(7, 10, 14, 3, def.colors.accent);
  r(9, 4, 10, 4, def.colors.body);
  r(11, 6, 2, 2, def.colors.eye);
  r(17, 6, 2, 2, def.colors.eye);
  if (def.boss) { r(2, 3, 4, 5, def.colors.accent); r(22, 3, 4, 5, def.colors.accent); }
  cache.set(key, c);
  return c;
}

export function chestSprite(open: boolean): HTMLCanvasElement {
  const key = `c:${open}`;
  const found = cache.get(key);
  if (found) return found;
  const c = canvas(16, 14);
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a4a28'; g.fillRect(1, 4, 14, 9);
  g.fillStyle = '#c08a44'; g.fillRect(1, open ? 1 : 3, 14, 4);
  g.fillStyle = '#f4c542'; g.fillRect(7, open ? 2 : 6, 2, 4);
  cache.set(key, c);
  return c;
}
