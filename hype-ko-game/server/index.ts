import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { MatchSim } from '../src/game/combat/simulation';
import { FIGHTER_BY_ID } from '../src/data/fighters';
import { getRandomStage } from '../src/data/stages';
import type { InputState, MatchConfig, SimEvent, SimSnapshot } from '../src/game/combat/types';
import type { LeaderboardEntry, MatchSummary } from '../src/utils/storage';
import type { OnlinePlayer, OnlineRoom } from '../src/network/onlineClient';

interface Client {
  id: number;
  ws: WebSocket;
  name: string;
  fighter: string;
  ready: boolean;
  room: Room | null;
  input: InputState;
}

interface Room {
  code: string;
  players: Client[];
  status: 'lobby' | 'playing' | 'ended';
  stageId: string;
  sim: MatchSim | null;
  timer: ReturnType<typeof setInterval> | null;
  tick: number;
  pendingEvents: SimEvent[];
  ended: boolean;
  rematchVotes: Set<number>;
  roundDamage: [number, number];
  perfectRounds: [number, number];
  superUses: [number, number];
  finishers: [number, number];
}

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  try {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // A malformed .env file should not prevent the server from starting.
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT ?? 8787);
const DIST = path.resolve(process.cwd(), 'dist');
const LEADERBOARD_FILE = path.resolve(process.cwd(), 'server', 'leaderboard.json');
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let nextClientId = 1;
const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, Client>();

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (!existsSync(LEADERBOARD_FILE)) return [];
    const parsed = JSON.parse(readFileSync(LEADERBOARD_FILE, 'utf8')) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let leaderboard = loadLeaderboard();

function saveLeaderboard(): void {
  try {
    writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard.slice(0, 100), null, 2));
  } catch {
    // Ranking persistence is best-effort.
  }
}

function sanitizeName(value: unknown): string {
  const name = String(value ?? '')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim()
    .slice(0, 16)
    .toUpperCase();
  return name || 'ANONIMO';
}

function sanitizeFighter(value: unknown): string {
  const id = String(value ?? '');
  return FIGHTER_BY_ID[id] ? id : '808nero';
}

function makeCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function send(client: Client, message: unknown): void {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function slotOf(room: Room, client: Client): number {
  return room.players.indexOf(client);
}

function roomPayload(room: Room, client: Client): OnlineRoom {
  const players: OnlinePlayer[] = room.players.map((player, slot) => ({
    slot,
    name: player.name,
    fighter: player.fighter,
    ready: player.ready
  }));
  return {
    code: room.code,
    you: slotOf(room, client),
    players,
    status: room.status,
    stageId: room.stageId,
    rematchVotes: [...room.rematchVotes]
      .map((id) => room.players.findIndex((player) => player.id === id))
      .filter((slot) => slot >= 0)
  };
}

function broadcastRoom(room: Room): void {
  for (const player of room.players) {
    send(player, { type: 'room', room: roomPayload(room, player) });
  }
}

function snapshotPayload(room: Room): SimSnapshot {
  if (!room.sim) throw new Error('match not started');
  return room.sim.serialize();
}

function broadcastSnapshot(room: Room): void {
  if (!room.sim) return;
  const snapshot = snapshotPayload(room);
  const events = room.pendingEvents;
  room.pendingEvents = [];
  for (const player of room.players) {
    send(player, { type: 'snapshot', snapshot, events });
  }
}

function stopTimer(room: Room): void {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function makeSummary(room: Room, slot: number): MatchSummary {
  const sim = room.sim!;
  const me = sim.fighters[slot];
  const opponent = sim.fighters[1 - slot];
  const won = sim.matchWinner === slot;
  return {
    won,
    mode: 'online',
    playerFighter: me.charId,
    opponentFighter: opponent.charId,
    damageDealt: me.totalDamageDealt,
    maxCombo: me.maxCombo,
    hits: me.totalHits,
    superUses: room.superUses[slot],
    finishers: room.finishers[slot],
    perfectRounds: room.perfectRounds[slot],
    roundsWon: me.roundsWon,
    roundsLost: opponent.roundsWon,
    matchTime: Math.round(sim.frame / 60)
  };
}

function recordLeaderboard(client: Client, summary: MatchSummary, won: boolean): void {
  const score = Math.round(
    (won ? 120 : 25) + summary.damageDealt / 12 + summary.maxCombo * 2 + summary.roundsWon * 30
  );
  leaderboard.push({
    name: client.name,
    score,
    wins: won ? 1 : 0,
    date: Date.now()
  });
  leaderboard = leaderboard.sort((a, b) => b.score - a.score || b.wins - a.wins).slice(0, 100);
  saveLeaderboard();
}

function startMatch(room: Room): void {
  if (room.players.length < 2) return;
  stopTimer(room);
  const [a, b] = room.players;
  const stage = getRandomStage();
  room.stageId = stage.id;
  const config: MatchConfig = {
    mode: 'online',
    stageId: stage.id,
    roundsToWin: 2,
    roundTime: 99,
    fighters: [FIGHTER_BY_ID[a.fighter] ?? FIGHTER_BY_ID['808nero'], FIGHTER_BY_ID[b.fighter] ?? FIGHTER_BY_ID['808nero']],
    teams: [[0], [1]],
    teamSize: 1,
    rumble: false
  };
  room.sim = new MatchSim(config);
  room.status = 'playing';
  room.tick = 0;
  room.pendingEvents = [];
  room.ended = false;
  room.rematchVotes.clear();
  room.roundDamage = [0, 0];
  room.perfectRounds = [0, 0];
  room.superUses = [0, 0];
  room.finishers = [0, 0];
  for (const player of room.players) player.input = { held: 0, pressed: 0 };
  const snapshot = room.sim.serialize();
  for (const player of room.players) {
    send(player, { type: 'start', room: roomPayload(room, player), snapshot });
  }
  room.timer = setInterval(() => tickRoom(room), 1000 / 60);
}

function tickRoom(room: Room): void {
  const sim = room.sim;
  if (!sim || room.players.length < 2) return;
  const events = sim.step(room.players.map((player) => player.input));
  for (const player of room.players) {
    player.input = { held: player.input.held, pressed: 0 };
  }
  room.pendingEvents.push(...events);

  for (const event of events) {
    if (event.type === 'super' && (event.fighter === 0 || event.fighter === 1)) {
      room.superUses[event.fighter]++;
    }
    if (event.type === 'finisher' && event.phase === 'start' && (event.attacker === 0 || event.attacker === 1)) {
      room.finishers[event.attacker]++;
    }
    if (event.type === 'hit' && (event.defender === 0 || event.defender === 1)) {
      room.roundDamage[event.defender] += event.damage;
    }
    if (event.type === 'roundStart') {
      room.roundDamage = [0, 0];
    }
    if (event.type === 'roundEnd' && event.winner !== null && (event.winner === 0 || event.winner === 1)) {
      if (room.roundDamage[event.winner] === 0) room.perfectRounds[event.winner]++;
    }
  }

  room.tick++;
  if (room.tick % 3 === 0) broadcastSnapshot(room);

  if (sim.phase === 'matchEnd' && !room.ended) {
    room.ended = true;
    room.status = 'ended';
    stopTimer(room);
    broadcastSnapshot(room);
    const winner = sim.matchWinner ?? 0;
    for (const player of room.players) {
      const slot = slotOf(room, player);
      const summary = makeSummary(room, slot);
      recordLeaderboard(player, summary, winner === slot);
      send(player, {
        type: 'end',
        winner,
        summary,
        room: roomPayload(room, player)
      });
    }
  }
}

function leaveRoom(client: Client): void {
  const room = client.room;
  if (!room) return;
  client.room = null;
  client.ready = false;
  stopTimer(room);
  room.players = room.players.filter((player) => player !== client);
  if (room.players.length === 0) {
    rooms.delete(room.code);
    return;
  }
  room.status = 'lobby';
  room.sim = null;
  room.ended = false;
  room.rematchVotes.clear();
  for (const player of room.players) {
    player.ready = false;
    send(player, { type: 'notice', message: 'Avversario disconnesso. La stanza è di nuovo aperta.' });
  }
  broadcastRoom(room);
}

function handleCreate(client: Client, message: { name?: string; fighter?: string }): void {
  leaveRoom(client);
  client.name = sanitizeName(message.name);
  client.fighter = sanitizeFighter(message.fighter);
  client.ready = false;
  const room: Room = {
    code: makeCode(),
    players: [client],
    status: 'lobby',
    stageId: getRandomStage().id,
    sim: null,
    timer: null,
    tick: 0,
    pendingEvents: [],
    ended: false,
    rematchVotes: new Set(),
    roundDamage: [0, 0],
    perfectRounds: [0, 0],
    superUses: [0, 0],
    finishers: [0, 0]
  };
  rooms.set(room.code, room);
  client.room = room;
  broadcastRoom(room);
}

function handleJoin(client: Client, message: { code?: string; name?: string; fighter?: string }): void {
  const code = String(message.code ?? '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    send(client, { type: 'error', message: 'Stanza non trovata.' });
    return;
  }
  if (room.status !== 'lobby') {
    send(client, { type: 'error', message: 'Partita già iniziata.' });
    return;
  }
  if (room.players.length >= 2) {
    send(client, { type: 'error', message: 'Stanza piena.' });
    return;
  }
  if (client.room === room) {
    send(client, { type: 'error', message: 'Sei già in questa stanza.' });
    return;
  }
  leaveRoom(client);
  client.name = sanitizeName(message.name);
  client.fighter = sanitizeFighter(message.fighter);
  client.ready = false;
  room.players.push(client);
  client.room = room;
  broadcastRoom(room);
}

function handleMessage(client: Client, raw: string): void {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    send(client, { type: 'error', message: 'Messaggio non valido.' });
    return;
  }
  switch (message.type) {
    case 'create':
      handleCreate(client, message);
      break;
    case 'join':
      handleJoin(client, message);
      break;
    case 'ready': {
      const room = client.room;
      if (!room || room.status !== 'lobby') return;
      client.ready = Boolean(message.ready);
      broadcastRoom(room);
      if (room.players.length === 2 && room.players.every((player) => player.ready)) {
        startMatch(room);
      }
      break;
    }
    case 'input': {
      if (!client.room || client.room.status !== 'playing') return;
      client.input = {
        held: Number(message.held) || 0,
        pressed: client.input.pressed | (Number(message.pressed) || 0)
      };
      break;
    }
    case 'rematch': {
      const room = client.room;
      if (!room || room.status !== 'ended') return;
      room.rematchVotes.add(client.id);
      broadcastRoom(room);
      if (room.players.length === 2 && room.players.every((player) => room.rematchVotes.has(player.id))) {
        startMatch(room);
      }
      break;
    }
    case 'leave':
      leaveRoom(client);
      break;
    default:
      break;
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json'
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size, players: clients.size }));
    return;
  }
  if (url.pathname === '/api/leaderboard') {
    response.writeHead(200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*'
    });
    response.end(JSON.stringify({ entries: leaderboard.slice(0, 50) }));
    return;
  }

  if (!existsSync(DIST)) {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(
      '<!doctype html><html><body style="font-family:system-ui;background:#0a0514;color:#fff;padding:3rem"><h1>HYPE K.O. server online</h1><p>La build non esiste ancora. Esegui <code>npm run build</code> oppure usa <code>npm run dev</code> per il client Vite.</p></body></html>'
    );
    return;
  }

  const requested = decodeURIComponent(url.pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const filePath = path.resolve(DIST, relative);
  const safe = filePath.startsWith(DIST);
  const finalPath = safe && existsSync(filePath) ? filePath : path.join(DIST, 'index.html');
  try {
    const data = readFileSync(finalPath);
    response.writeHead(200, { 'content-type': MIME[path.extname(finalPath)] ?? 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const client: Client = {
    id: nextClientId++,
    ws,
    name: 'ANONIMO',
    fighter: '808nero',
    ready: false,
    room: null,
    input: { held: 0, pressed: 0 }
  };
  clients.set(ws, client);
  send(client, { type: 'welcome' });

  ws.on('message', (data) => handleMessage(client, String(data)));
  ws.on('close', () => {
    leaveRoom(client);
    clients.delete(ws);
  });
  ws.on('error', () => {
    leaveRoom(client);
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`HYPE K.O. server su http://localhost:${PORT} (WebSocket + API + static)`);
});
