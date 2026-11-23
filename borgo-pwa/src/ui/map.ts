import {
  BELL_SPOT,
  BUILDINGS,
  FESTIVAL_TABLE,
  FLOWERS,
  LETTERS,
  NPCS,
  PATHS,
  PROPS,
  TILES,
  WORLD,
  ZONES
} from '../data/town';
import type { Language } from '../data/types';
import { pick } from '../data/strings';
import type { GameState } from '../game/state';

export interface MapPoint {
  x: number;
  z: number;
}

const INK = '#3a2f23';
const PAPER = '#f2e6ce';
const BUILDING = '#d7c5a3';
const BUILDING_ROOF = '#b26043';
const PATH = '#c9b794';
const WALL = '#9c8b6d';
const GOLD = '#d9a441';

interface Transform {
  scale: number;
  ox: number;
  oy: number;
  size: number;
}

export function drawMinimap(
  canvas: HTMLCanvasElement,
  state: GameState,
  player: MapPoint,
  heading: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const t = transform(size, 10);
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  drawTown(ctx, t, state, false);
  drawPlayer(ctx, player, heading, t, 5.5);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(58,47,35,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawFullMap(
  canvas: HTMLCanvasElement,
  state: GameState,
  player: MapPoint,
  heading: number,
  lang: Language
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const t = transform(size, 42);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);

  drawTown(ctx, t, state, true);

  ctx.save();
  ctx.font = '600 16px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const zone of ZONES) {
    const x = t.ox + zone.x * t.scale;
    const y = t.oy + zone.z * t.scale - 15;
    const label = pick(zone.name, lang);
    const width = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(242,230,206,0.82)';
    ctx.fillRect(x - width / 2 - 5, y - 9, width + 10, 18);
    ctx.fillStyle = 'rgba(58,47,35,0.86)';
    ctx.fillText(label, x, y);
  }
  ctx.restore();

  drawPlayer(ctx, player, heading, t, 9);

  ctx.fillStyle = INK;
  ctx.font = '600 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', size - 34, 30);
  ctx.beginPath();
  ctx.moveTo(size - 34, 42);
  ctx.lineTo(size - 40, 56);
  ctx.lineTo(size - 28, 56);
  ctx.closePath();
  ctx.fill();
}

function drawTown(
  ctx: CanvasRenderingContext2D,
  t: Transform,
  state: GameState,
  full: boolean
): void {
  const rect = (
    x: number,
    z: number,
    w: number,
    d: number,
    fill: string,
    stroke?: string,
    lineWidth = 1
  ): void => {
    const px = t.ox + (x - w / 2) * t.scale;
    const py = t.oy + (z - d / 2) * t.scale;
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, Math.max(1, w * t.scale), Math.max(1, d * t.scale));
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(px, py, Math.max(1, w * t.scale), Math.max(1, d * t.scale));
    }
  };

  ctx.fillStyle = 'rgba(113,128,78,0.5)';
  ctx.beginPath();
  ctx.arc(t.ox + 28 * t.scale, t.oy + -28 * t.scale, 9 * t.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(t.ox + -34 * t.scale, t.oy + 31 * t.scale, 14 * t.scale, 0, Math.PI * 2);
  ctx.fill();

  for (const path of PATHS) {
    rect(path.x, path.z, path.w, path.d, path.tone === 'earth' ? '#bda77c' : PATH);
  }

  ctx.fillStyle = '#dccca8';
  ctx.beginPath();
  ctx.arc(t.ox, t.oy + 4 * t.scale, 17 * t.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(156,139,109,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (const prop of PROPS) {
    if (prop.kind === 'olive' || prop.kind === 'cypress') {
      ctx.fillStyle = 'rgba(88,104,64,0.85)';
      ctx.beginPath();
      ctx.arc(
        t.ox + prop.x * t.scale,
        t.oy + prop.z * t.scale,
        Math.max(1.2, (prop.scale ?? 1) * (full ? 2.6 : 1.4)),
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (prop.kind === 'wall') {
      rect(prop.x, prop.z, prop.w ?? 1, prop.d ?? 0.5, WALL);
    }
  }

  ctx.fillStyle = '#78b1bd';
  ctx.beginPath();
  ctx.arc(t.ox, t.oy, 2.2 * t.scale, 0, Math.PI * 2);
  ctx.fill();

  for (const building of BUILDINGS) {
    rect(building.x, building.z, building.w, building.d, BUILDING, 'rgba(58,47,35,0.75)', 1);
    ctx.fillStyle = BUILDING_ROOF;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(
      t.ox + (building.x - building.w / 2) * t.scale,
      t.oy + (building.z - building.d / 2) * t.scale,
      Math.max(1, building.w * t.scale),
      Math.max(1.2, 1.1 * t.scale)
    );
    ctx.globalAlpha = 1;
  }

  for (const npc of NPCS) {
    const x = t.ox + npc.x * t.scale;
    const y = t.oy + npc.z * t.scale;
    const quest = npcHasQuestMark(state, npc.id);
    if (quest) {
      ctx.beginPath();
      ctx.arc(x, y, full ? 11 : 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(217,164,65,0.32)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, full ? 5.5 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = quest ? GOLD : '#f6eedb';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = full ? 1.6 : 1;
    ctx.stroke();
  }

  for (const tile of TILES) {
    const found = state.tiles.includes(tile.id);
    if (!found && !full) continue;
    ctx.save();
    ctx.translate(t.ox + tile.x * t.scale, t.oy + tile.z * t.scale);
    ctx.rotate(Math.PI / 4);
    const r = full ? 4.5 : 3;
    ctx.fillStyle = found ? GOLD : 'rgba(58,47,35,0.2)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    if (found) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
  }

  if (state.quests.bread === 'active') {
    marker(ctx, t, FESTIVAL_TABLE.x, FESTIVAL_TABLE.z, full ? 6 : 3.5);
  }
  if (state.quests.letters === 'active') {
    for (const letter of LETTERS) {
      if (!state.letters.includes(letter.id)) marker(ctx, t, letter.x, letter.z, full ? 4.5 : 2.6);
    }
  }
  if (state.quests.flowers === 'active') {
    for (const flower of FLOWERS) {
      if (!state.flowers.includes(flower.id)) marker(ctx, t, flower.x, flower.z, full ? 4.5 : 2.6);
    }
  }
  if (state.quests.bell === 'active') {
    marker(ctx, t, BELL_SPOT.x, BELL_SPOT.z, full ? 6 : 3.5);
  }
}

function npcHasQuestMark(state: GameState, id: string): boolean {
  if (id === 'ada') return state.quests.bread === 'available' || state.quests.bread === 'active';
  if (id === 'elio') return state.quests.letters === 'available' || state.quests.letters === 'objective';
  if (id === 'marta') return state.quests.flowers === 'available' || state.quests.flowers === 'objective';
  if (id === 'nino') return state.quests.bell === 'available' || state.quests.bell === 'active';
  return false;
}

function marker(ctx: CanvasRenderingContext2D, t: Transform, x: number, z: number, size: number): void {
  ctx.save();
  ctx.translate(t.ox + x * t.scale, t.oy + z * t.scale);
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const px = Math.cos(angle) * size;
    const py = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    const innerAngle = angle + Math.PI / 5;
    ctx.lineTo(Math.cos(innerAngle) * size * 0.45, Math.sin(innerAngle) * size * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: MapPoint,
  heading: number,
  t: Transform,
  size: number
): void {
  const x = t.ox + player.x * t.scale;
  const y = t.oy + player.z * t.scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.72, size * 0.78);
  ctx.lineTo(0, size * 0.36);
  ctx.lineTo(-size * 0.72, size * 0.78);
  ctx.closePath();
  ctx.fillStyle = '#f8f0dc';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, size * 0.22);
  ctx.stroke();
  ctx.restore();
}

function transform(size: number, padding: number): Transform {
  const worldWidth = WORLD.maxX - WORLD.minX;
  const worldDepth = WORLD.maxZ - WORLD.minZ;
  const scale = Math.min((size - padding * 2) / worldWidth, (size - padding * 2) / worldDepth);
  const ox = size / 2 - ((WORLD.minX + WORLD.maxX) / 2) * scale;
  const oy = size / 2 - ((WORLD.minZ + WORLD.maxZ) / 2) * scale;
  return { scale, ox, oy, size };
}
