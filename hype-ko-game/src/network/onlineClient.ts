import type { InputState, SimEvent, SimSnapshot } from '../game/combat/types';
import type { MatchSummary } from '../utils/storage';

export interface OnlinePlayer {
  slot: number;
  name: string;
  fighter: string;
  ready: boolean;
}

export interface OnlineRoom {
  code: string;
  you: number;
  players: OnlinePlayer[];
  status: 'lobby' | 'playing' | 'ended';
  stageId: string;
  rematchVotes: number[];
}

export interface OnlineEnd {
  winner: number;
  summary: MatchSummary;
}

interface ServerMessage {
  type: 'welcome' | 'room' | 'start' | 'snapshot' | 'end' | 'error' | 'notice';
  room?: OnlineRoom;
  snapshot?: SimSnapshot;
  events?: SimEvent[];
  winner?: number;
  summary?: MatchSummary;
  message?: string;
}

export type OnlineStatus = 'idle' | 'connecting' | 'connected' | 'closed';

function defaultUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return configured;
  if (import.meta.env.DEV) {
    const host = typeof location !== 'undefined' ? location.hostname : 'localhost';
    return `ws://${host}:8787`;
  }
  const protocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss' : 'ws';
  const host = typeof location !== 'undefined' ? location.host : 'localhost:8787';
  return `${protocol}://${host}`;
}

export class OnlineClient {
  room: OnlineRoom | null = null;
  snapshot: SimSnapshot | null = null;
  events: SimEvent[] = [];
  end: OnlineEnd | null = null;
  error: string | null = null;
  notice: string | null = null;
  status: OnlineStatus = 'idle';
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<() => void>();
  private intentionalClose = false;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  connect(url = defaultUrl()): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }
    this.status = 'connecting';
    this.error = null;
    this.intentionalClose = false;
    this.notify();
    return new Promise((resolve, reject) => {
      let settled = false;
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.onopen = () => {
        this.status = 'connected';
        this.notify();
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      socket.onmessage = (event) => this.handle(JSON.parse(String(event.data)) as ServerMessage);
      socket.onerror = () => {
        this.error = 'Impossibile raggiungere il server online. Avvia `npm run dev` o `npm start`.';
        this.status = 'closed';
        this.notify();
        if (!settled) {
          settled = true;
          reject(new Error(this.error));
        }
      };
      socket.onclose = () => {
        this.status = 'closed';
        if (!this.intentionalClose && !this.error) {
          this.error = 'Connessione chiusa dal server.';
        }
        this.notify();
        if (!settled) {
          settled = true;
          reject(new Error(this.error ?? 'Connessione chiusa.'));
        }
      };
    });
  }

  private send(message: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  private handle(message: ServerMessage): void {
    switch (message.type) {
      case 'room':
        if (message.room) this.room = message.room;
        this.error = null;
        break;
      case 'start':
        if (message.room) this.room = message.room;
        if (message.snapshot) this.snapshot = message.snapshot;
        this.events = [];
        this.end = null;
        this.notice = null;
        break;
      case 'snapshot':
        if (message.snapshot) this.snapshot = message.snapshot;
        if (message.events && message.events.length > 0) this.events.push(...message.events);
        break;
      case 'end':
        if (message.room) this.room = message.room;
        if (message.summary && message.winner !== undefined) {
          this.end = { winner: message.winner, summary: message.summary };
        }
        break;
      case 'error':
        this.error = message.message ?? 'Errore sconosciuto.';
        break;
      case 'notice':
        this.notice = message.message ?? null;
        break;
      default:
        break;
    }
    this.notify();
  }

  createRoom(name: string, fighter: string): void {
    this.send({ type: 'create', name, fighter });
  }

  joinRoom(code: string, name: string, fighter: string): void {
    this.send({ type: 'join', code: code.trim().toUpperCase(), name, fighter });
  }

  setReady(ready: boolean): void {
    this.send({ type: 'ready', ready });
  }

  sendInput(input: InputState): void {
    this.send({ type: 'input', held: input.held, pressed: input.pressed });
  }

  requestRematch(): void {
    this.send({ type: 'rematch' });
  }

  leave(): void {
    this.send({ type: 'leave' });
    this.room = null;
    this.snapshot = null;
    this.end = null;
    this.events = [];
    this.notify();
  }

  dispose(): void {
    this.intentionalClose = true;
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
    this.status = 'closed';
  }
}
