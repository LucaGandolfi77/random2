import { FIDENZA } from '../data/fidenza';
import { DISCOVERIES, NPCS, STREET_LABELS, TILES, WORLD } from '../data/town';
import { FESTIVAL_NPC_POSITIONS, FESTIVAL_STAGE, FESTIVAL_STARTER } from '../data/festival';
import { FRANCIGENA_ROUTE, FRANCIGENA_STAGES } from '../data/francigena';
import { PHOTO_SPOTS } from '../data/photo';
import { BELVEDERE_SPOTS } from '../data/belvedere';
import type { Language } from '../data/types';
import { pick } from '../data/strings';
import type { GameState } from '../game/state';

export interface MapPoint {
  x: number;
  z: number;
}

const INK = '#3a2f23';
const PAPER = '#f2e6ce';
const BUILDING = '#d8c7a5';
const BUILDING_EDGE = 'rgba(58,47,35,0.45)';
const GOLD = '#d9a441';
const LOCAL_RADIUS = 120;

interface View {
  scale: number;
  ox: number;
  oy: number;
  size: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function drawMinimap(
  canvas: HTMLCanvasElement,
  state: GameState,
  player: MapPoint,
  heading: number,
  waypoint: MapPoint | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const view = localView(size, 10, player);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  drawTown(ctx, view, state, false, waypoint);
  drawPlayer(ctx, player, heading, view, 5.5);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(58,47,35,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

const FULL_MAP_MINOR = new Set([
  'centro-commerciale',
  'parco-azalee',
  'skatepark',
  'aermacchi',
  'cigala',
  'centro-ballotta',
  'pala',
  'piscina',
  'giardino-charlie',
  'scalo',
  'parco-nord',
  'parco-degasperi',
  'parcobaleno',
  'santa-maria',
  'san-michele',
  'vf-ponte',
  'vf-porta',
  'vf-duomo',
  'vf-matteotti'
]);

export function drawFullMap(
  canvas: HTMLCanvasElement,
  state: GameState,
  player: MapPoint,
  heading: number,
  lang: Language,
  waypoint: MapPoint | null,
  detail = false
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const view = detail ? detailView(size, 34, player) : fullView(size, 34);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);

  drawTown(ctx, view, state, true, waypoint);

  ctx.save();
  ctx.font = '600 13px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const street of STREET_LABELS) {
    const x = view.ox + street.x * view.scale;
    const y = view.oy + street.z * view.scale;
    ctx.fillStyle = 'rgba(58,47,35,0.5)';
    ctx.font = 'italic 11px Georgia, "Times New Roman", serif';
    ctx.fillText(street.name, x, y);
  }
  ctx.font = '600 14px Georgia, "Times New Roman", serif';
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (const place of DISCOVERIES) {
    if (place.interior) continue;
    if (!detail && FULL_MAP_MINOR.has(place.id)) continue;
    const x = view.ox + place.x * view.scale;
    const y = view.oy + place.z * view.scale - 9;
    ctx.beginPath();
    ctx.arc(x, y + 9, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(58,47,35,0.7)';
    ctx.fill();
    const label = pick(place.name, lang);
    const width = ctx.measureText(label).width + 10;
    let box: { x: number; y: number; w: number; h: number } | null = null;
    for (const offset of [0, -20, 20, -38, 38]) {
      const candidate = { x: x - width / 2, y: y - 9 + offset, w: width, h: 18 };
      if (
        !placed.some(
          (other) =>
            candidate.x < other.x + other.w &&
            candidate.x + candidate.w > other.x &&
            candidate.y < other.y + other.h &&
            candidate.y + candidate.h > other.y
        )
      ) {
        box = candidate;
        break;
      }
    }
    if (!box) continue;
    placed.push(box);
    ctx.fillStyle = 'rgba(242,230,206,0.82)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(58,47,35,0.88)';
    ctx.fillText(label, x, box.y + 9);
  }
  ctx.restore();

  drawFrancigena(ctx, view, state);
  drawPhotoSpots(ctx, view);
  drawBelvedereSpots(ctx, view);
  drawPlayer(ctx, player, heading, view, 9);

  ctx.fillStyle = INK;
  ctx.font = '600 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', size - 28, 24);
  ctx.beginPath();
  ctx.moveTo(size - 28, 34);
  ctx.lineTo(size - 34, 48);
  ctx.lineTo(size - 22, 48);
  ctx.closePath();
  ctx.fill();
}

function drawTown(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: GameState,
  full: boolean,
  waypoint: MapPoint | null
): void {
  const visible = (minX: number, maxX: number, minZ: number, maxZ: number): boolean =>
    maxX >= view.minX && minX <= view.maxX && maxZ >= view.minZ && minZ <= view.maxZ;

  /* Green areas and parking. */
  for (const area of FIDENZA.areas) {
    const points = area.poly;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minZ = Math.min(minZ, points[i + 1]);
      maxZ = Math.max(maxZ, points[i + 1]);
    }
    if (!visible(minX, maxX, minZ, maxZ)) continue;
    tracePolygon(ctx, points, view);
    ctx.fillStyle = hex(area.color);
    ctx.fill();
  }

  /* Waterways. */
  for (const water of FIDENZA.waterways) {
    const pts = water.pts;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i += 2) {
      const x = view.ox + pts[i] * view.scale;
      const y = view.oy + pts[i + 1] * view.scale;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = '#6d9fa8';
    ctx.lineWidth = Math.max(1, water.w * view.scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  /* Streets. */
  const roadColors: Record<string, string> = {
    primary: '#837b6a',
    secondary: '#8a8170',
    tertiary: '#908674',
    residential: '#9a8f7b',
    pedestrian: '#c2b18e',
    footway: '#c5b695',
    cycleway: '#a89b81',
    service: '#998e7b',
    unclassified: '#958a77',
    living_street: '#9d927d'
  };
  for (const road of FIDENZA.roads) {
    const width = Math.max(full ? 1 : 1.2, road.w * view.scale);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < road.pts.length; i += 2) {
      const x = view.ox + road.pts[i] * view.scale;
      const y = view.oy + road.pts[i + 1] * view.scale;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = roadColors[road.kind] ?? '#998e7b';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  /* Piazza discs. */
  for (const [x, z, r] of [
    [-296.7, -4.1, 27],
    [14.6, -21, 31],
    [-18.6, 105.2, 20],
    [44.2, 109.2, 18],
    [195, -103.5, 24]
  ] as const) {
    if (!visible(x - r, x + r, z - r, z + r)) continue;
    ctx.beginPath();
    ctx.arc(view.ox + x * view.scale, view.oy + z * view.scale, r * view.scale, 0, Math.PI * 2);
    ctx.fillStyle = '#d8c7a5';
    ctx.fill();
  }

  /* Buildings. */
  for (const building of FIDENZA.buildings) {
    const pts = building.poly;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]);
      maxX = Math.max(maxX, pts[i]);
      minZ = Math.min(minZ, pts[i + 1]);
      maxZ = Math.max(maxZ, pts[i + 1]);
    }
    if (!visible(minX, maxX, minZ, maxZ)) continue;
    tracePolygon(ctx, pts, view);
    ctx.fillStyle = BUILDING;
    ctx.fill();
    ctx.strokeStyle = BUILDING_EDGE;
    ctx.lineWidth = full ? 0.8 : 0.7;
    ctx.stroke();
  }

  /* Train tracks. */
  for (const railway of FIDENZA.railways) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < railway.pts.length; i += 2) {
      const x = view.ox + railway.pts[i] * view.scale;
      const y = view.oy + railway.pts[i + 1] * view.scale;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = 'rgba(70,68,62,0.55)';
    ctx.lineWidth = Math.max(1, 2.4 * view.scale);
    ctx.stroke();
  }

  /* NPCs. */
  const festivalOpen =
    state.festival.phase === 'active' ||
    state.festival.phase === 'procession' ||
    state.festival.phase === 'done';
  for (const npc of NPCS) {
    const position = festivalOpen ? FESTIVAL_NPC_POSITIONS[npc.id] ?? npc : npc;
    if (!visible(position.x - 4, position.x + 4, position.z - 4, position.z + 4)) continue;
    const x = view.ox + position.x * view.scale;
    const y = view.oy + position.z * view.scale;
    const quest = npcHasQuestMark(state, npc.id);
    if (quest) {
      ctx.beginPath();
      ctx.arc(x, y, full ? 10 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(217,164,65,0.3)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, full ? 5 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = quest ? GOLD : '#f6eedb';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = full ? 1.4 : 1;
    ctx.stroke();
  }

  /* Parked vehicles. */
  for (const vehicle of state.vehicles) {
    if (!visible(vehicle.x - 4, vehicle.x + 4, vehicle.z - 4, vehicle.z + 4)) continue;
    const x = view.ox + vehicle.x * view.scale;
    const y = view.oy + vehicle.z * view.scale;
    const car = vehicle.id.startsWith('car');
    ctx.beginPath();
    ctx.arc(x, y, full ? 3.2 : 2.2, 0, Math.PI * 2);
    ctx.fillStyle = car ? '#557387' : '#8a6f55';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /* Memories. */
  for (const tile of TILES) {
    const found = state.tiles.includes(tile.id);
    if (!found && !full) continue;
    if (!visible(tile.x - 4, tile.x + 4, tile.z - 4, tile.z + 4)) continue;
    ctx.save();
    ctx.translate(view.ox + tile.x * view.scale, view.oy + tile.z * view.scale);
    ctx.rotate(Math.PI / 4);
    const r = full ? 4.2 : 3;
    ctx.fillStyle = found ? GOLD : 'rgba(58,47,35,0.18)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  if (state.festival.phase === 'ready' || state.festival.phase === 'active') {
    const point = state.festival.phase === 'ready'
      ? FESTIVAL_STARTER
      : { x: FESTIVAL_STAGE.x, z: FESTIVAL_STAGE.z };
    if (visible(point.x - 6, point.x + 6, point.z - 6, point.z + 6)) {
      marker(ctx, view, point.x, point.z, full ? 6 : 4);
    }
  }

  if (waypoint) {
    marker(ctx, view, waypoint.x, waypoint.z, full ? 7 : 4.5);
  }
}

function drawFrancigena(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: GameState
): void {
  ctx.save();
  ctx.beginPath();
  FRANCIGENA_ROUTE.forEach((point, index) => {
    const x = view.ox + point.x * view.scale;
    const y = view.oy + point.z * view.scale;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.setLineDash([9, 6]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(154,74,32,0.9)';
  ctx.lineWidth = 4.8;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '700 8px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  FRANCIGENA_STAGES.forEach((stage, index) => {
    const x = view.ox + stage.x * view.scale;
    const y = view.oy + stage.z * view.scale;
    const found = state.discovered.includes(stage.placeId);
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = found ? GOLD : PAPER;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '700 9px Georgia, "Times New Roman", serif';
    ctx.fillText(String(index + 1), x, y + 0.5);
  });
  ctx.restore();
}

function drawPhotoSpots(ctx: CanvasRenderingContext2D, view: View): void {
  for (const spot of PHOTO_SPOTS) {
    const x = view.ox + spot.x * view.scale;
    const y = view.oy + spot.z * view.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = INK;
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillRect(-5, -7, 4, 3);
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
}

function drawBelvedereSpots(ctx: CanvasRenderingContext2D, view: View): void {
  for (const spot of BELVEDERE_SPOTS) {
    const x = view.ox + spot.x * view.scale;
    const y = view.oy + spot.z * view.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();
  }
}

function npcHasQuestMark(state: GameState, id: string): boolean {
  if (id === 'ada') return state.quests.bread === 'available' || state.quests.bread === 'active';
  if (id === 'elio') return state.quests.letters === 'available' || state.quests.letters === 'objective';
  if (id === 'marta') return state.quests.flowers === 'available' || state.quests.flowers === 'objective';
  if (id === 'beppe') return state.quests.newspaper === 'available' || state.quests.newspaper === 'active';
  if (id === 'lidia') return state.quests.book === 'available' || state.quests.book === 'active';
  if (id === 'sara') return state.quests.coffee === 'available' || state.quests.coffee === 'active';
  if (id === 'nino') return state.quests.bell === 'available' || state.quests.bell === 'active';
  return false;
}

function marker(
  ctx: CanvasRenderingContext2D,
  view: View,
  x: number,
  z: number,
  size: number
): void {
  ctx.save();
  ctx.translate(view.ox + x * view.scale, view.oy + z * view.scale);
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

function tracePolygon(ctx: CanvasRenderingContext2D, pts: number[], view: View): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const x = view.ox + pts[i] * view.scale;
    const y = view.oy + pts[i + 1] * view.scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: MapPoint,
  heading: number,
  view: View,
  size: number
): void {
  const x = view.ox + player.x * view.scale;
  const y = view.oy + player.z * view.scale;
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

function fullView(size: number, padding: number): View {
  const scale = Math.min(
    (size - padding * 2) / (WORLD.maxX - WORLD.minX),
    (size - padding * 2) / (WORLD.maxZ - WORLD.minZ)
  );
  const ox = size / 2 - ((WORLD.minX + WORLD.maxX) / 2) * scale;
  const oy = size / 2 - ((WORLD.minZ + WORLD.maxZ) / 2) * scale;
  return {
    scale,
    ox,
    oy,
    size,
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: WORLD.minZ,
    maxZ: WORLD.maxZ
  };
}

function localView(size: number, padding: number, player: MapPoint): View {
  const scale = (size - padding * 2) / (LOCAL_RADIUS * 2);
  const ox = size / 2 - player.x * scale;
  const oy = size / 2 - player.z * scale;
  return {
    scale,
    ox,
    oy,
    size,
    minX: player.x - LOCAL_RADIUS,
    maxX: player.x + LOCAL_RADIUS,
    minZ: player.z - LOCAL_RADIUS,
    maxZ: player.z + LOCAL_RADIUS
  };
}

function detailView(size: number, padding: number, player: MapPoint): View {
  const radius = 280;
  const scale = (size - padding * 2) / (radius * 2);
  const ox = size / 2 - player.x * scale;
  const oy = size / 2 - player.z * scale;
  return {
    scale,
    ox,
    oy,
    size,
    minX: player.x - radius,
    maxX: player.x + radius,
    minZ: player.z - radius,
    maxZ: player.z + radius
  };
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
