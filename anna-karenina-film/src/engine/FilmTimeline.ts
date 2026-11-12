import type { RuntimeState } from '../data/types';
import { FILM, sceneAtTime } from '../data/film';

type Listener = (state: RuntimeState) => void;

export class FilmTimeline {
  readonly duration: number;
  private time = 0;
  private playing = false;
  private ended = false;
  private anchor = 0;
  private rafId: number | null = null;
  private listeners = new Set<Listener>();
  private readonly now: () => number;
  private readonly raf: ((cb: FrameRequestCallback) => number) | null;
  private readonly caf: ((id: number) => void) | null;

  constructor(
    duration = FILM.duration,
    now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    raf: ((cb: FrameRequestCallback) => number) | null =
      typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame.bind(globalThis) : null,
    caf: ((id: number) => void) | null =
      typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame.bind(globalThis) : null
  ) {
    this.duration = duration;
    this.now = now;
    this.raf = raf;
    this.caf = caf;
  }

  getState(): RuntimeState {
    const info = sceneAtTime(this.time);
    return {
      time: this.time,
      sceneIndex: info.index,
      sceneTime: info.localTime,
      playing: this.playing,
      ended: this.ended
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  play(): void {
    if (this.playing) return;
    if (this.ended || this.time >= this.duration) {
      this.time = 0;
      this.ended = false;
    }
    this.playing = true;
    this.anchor = this.now() - this.time * 1000;
    this.schedule();
    this.emit();
  }

  pause(): void {
    if (!this.playing) {
      this.emit();
      return;
    }
    this.tick(this.now(), false);
    this.playing = false;
    this.cancel();
    this.emit();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(value: number): void {
    const next = Math.max(0, Math.min(this.duration, value));
    this.time = next;
    this.ended = next >= this.duration;
    if (this.playing) {
      this.anchor = this.now() - this.time * 1000;
    }
    this.emit();
  }

  jump(delta: number): void {
    this.seek(this.time + delta);
  }

  restart(): void {
    this.time = 0;
    this.ended = false;
    if (this.playing) this.anchor = this.now();
    this.emit();
  }

  tick(now: number, emit = true): void {
    if (!this.playing) return;
    const next = (now - this.anchor) / 1000;
    if (next >= this.duration) {
      this.time = this.duration;
      this.playing = false;
      this.ended = true;
      this.cancel();
      if (emit) this.emit();
      return;
    }
    this.time = Math.max(0, next);
    if (emit) this.emit();
  }

  destroy(): void {
    this.cancel();
    this.listeners.clear();
  }

  private schedule(): void {
    if (!this.raf) return;
    this.cancel();
    const loop = () => {
      if (!this.playing) return;
      this.tick(this.now());
      if (this.playing) this.rafId = this.raf?.(loop) ?? null;
    };
    this.rafId = this.raf(loop);
  }

  private cancel(): void {
    if (this.rafId !== null && this.caf) this.caf(this.rafId);
    this.rafId = null;
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}
