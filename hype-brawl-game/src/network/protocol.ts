import type { InputFrame } from '../core/input/InputTypes';
import { hashString } from '../utils/math';

/**
 * Online transport contract for the post-launch rollback milestone.
 *
 * The shipping build is local-only. This module defines the frame-indexed
 * input protocol and the snapshot/checksum helpers the netcode will use. It is
 * intentionally independent from the UI and renderer. Positions are never
 * streamed as authoritative state: both peers advance the deterministic
 * simulation from the same input frames and roll back on mismatch.
 */
export const PROTOCOL_VERSION = 1;
export const INPUT_DELAY_FRAMES = 2;
export const MAX_ROLLBACK_FRAMES = 8;

export type ClientMessage =
  | { type: 'hello'; protocol: number; playerName: string }
  | { type: 'join'; roomCode: string; playerName: string }
  | {
      type: 'lobby';
      roomCode: string;
      players: Array<{ id: string; name: string; ready: boolean; fighterId: string }>;
    }
  | { type: 'ready'; ready: boolean }
  | { type: 'start'; seed: number; stageId: string; config: Record<string, unknown> }
  | { type: 'input'; frame: number; playerId: string; input: string }
  | { type: 'checksum'; frame: number; hash: string }
  | { type: 'disconnect'; playerId: string; reason: string }
  | { type: 'reconnect'; playerId: string; lastConfirmedFrame: number };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; protocol: number }
  | { type: 'lobby'; roomCode: string; players: Array<{ id: string; name: string; ready: boolean }> }
  | { type: 'start'; seed: number; stageId: string; config: Record<string, unknown> }
  | { type: 'input'; frame: number; playerId: string; input: string }
  | { type: 'checksum'; frame: number; hash: string }
  | { type: 'peerLeft'; playerId: string; reason: string }
  | { type: 'error'; message: string }
  | { type: 'spectate'; roomCode: string; frame: number };

export interface InputHistory {
  frame: number;
  inputs: Record<number, InputFrame>;
}

/**
 * 8-bit button fields plus signed 8-bit stick values. The serialized input is
 * stable and small enough to send every simulation tick (or predict ahead).
 */
export function encodeInput(input: InputFrame): string {
  const buttons =
    (input.jump ? 1 : 0) |
    (input.attack ? 2 : 0) |
    (input.strong ? 4 : 0) |
    (input.special ? 8 : 0) |
    (input.shield ? 16 : 0) |
    (input.grab ? 32 : 0) |
    (input.taunt ? 64 : 0);
  const x = Math.round(Math.max(-1, Math.min(1, input.moveX)) * 127);
  const y = Math.round(Math.max(-1, Math.min(1, input.moveY)) * 127);
  return `${buttons.toString(16).padStart(2, '0')}:${x}:${y}`;
}

export function decodeInput(encoded: string): InputFrame {
  const [buttonPart = '0', xPart = '0', yPart = '0'] = encoded.split(':');
  const buttons = Number.parseInt(buttonPart, 16) || 0;
  return {
    jump: (buttons & 1) !== 0,
    attack: (buttons & 2) !== 0,
    strong: (buttons & 4) !== 0,
    special: (buttons & 8) !== 0,
    shield: (buttons & 16) !== 0,
    grab: (buttons & 32) !== 0,
    taunt: (buttons & 64) !== 0,
    moveX: Math.max(-1, Math.min(1, Number(xPart) / 127)),
    moveY: Math.max(-1, Math.min(1, Number(yPart) / 127)),
  };
}

export class InputHistoryBuffer {
  private readonly frames = new Map<number, Record<number, InputFrame>>();
  private readonly limit: number;

  constructor(limit = 900) {
    this.limit = limit;
  }

  set(frame: number, slot: number, input: InputFrame): void {
    let entry = this.frames.get(frame);
    if (!entry) {
      entry = {};
      this.frames.set(frame, entry);
    }
    entry[slot] = { ...input };
    if (this.frames.size > this.limit) {
      const oldest = Math.min(...this.frames.keys());
      this.frames.delete(oldest);
    }
  }

  get(frame: number): Record<number, InputFrame> | undefined {
    const entry = this.frames.get(frame);
    return entry ? { ...entry } : undefined;
  }

  has(frame: number): boolean {
    return this.frames.has(frame);
  }

  get earliest(): number {
    return this.frames.size === 0 ? 0 : Math.min(...this.frames.keys());
  }

  get latest(): number {
    return this.frames.size === 0 ? 0 : Math.max(...this.frames.keys());
  }
}

export function snapshotChecksum(snapshot: unknown): string {
  return hashString(JSON.stringify(snapshot)).toString(16).padStart(8, '0');
}

export interface RollbackHooks<TState, TInput> {
  state: TState;
  checkpoint: (state: TState) => TState;
  step: (state: TState, inputs: TInput) => TState;
  compare: (state: TState, checksum: string) => boolean;
}

/**
 * Minimal rollback loop skeleton. The local simulation is authoritative until
 * a remote input arrives; when it does, restore the checkpoint, replay the
 * buffered inputs and compare checksums. Full jitter handling and lobby
 * transport are part of the online milestone, not this build.
 */
export class RollbackSession<TState, TInput> {
  private predictedFrame = 0;
  private readonly history = new InputHistoryBuffer();

  constructor(
    private readonly hooks: RollbackHooks<TState, TInput>,
    private readonly frameRate = 60,
  ) {}

  tick(
    remoteInputs: Array<{ frame: number; slot: number; input: TInput }>,
    localInput: TInput,
  ): TState {
    for (const remote of remoteInputs) {
      this.history.set(remote.frame, remote.slot, remote.input as unknown as InputFrame);
    }
    this.history.set(this.predictedFrame, 0, localInput as unknown as InputFrame);
    this.predictedFrame++;
    return this.hooks.step(this.hooks.state, localInput);
  }

  resimulate(fromFrame: number): TState {
    let state = this.hooks.checkpoint(this.hooks.state);
    for (let frame = fromFrame; frame < this.predictedFrame; frame++) {
      const entry = this.history.get(frame);
      if (!entry) continue;
      const input = entry[0];
      if (input) state = this.hooks.step(state, input as unknown as TInput);
    }
    return state;
  }

  get frame(): number {
    return this.predictedFrame;
  }

  get tickRate(): number {
    return this.frameRate;
  }
}
