export class PlaybackClock {
  time = 0;
  playing = false;
  rate = 1;
  duration: number;
  private lastNow = 0;
  private hasLast = false;

  constructor(duration: number, start = 0) {
    this.duration = duration;
    this.time = Math.max(0, Math.min(duration, start));
  }

  play(): void {
    if (this.time >= this.duration - 0.001) this.time = 0;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(t: number): void {
    this.time = Math.max(0, Math.min(this.duration, t));
  }

  restart(): void {
    this.time = 0;
    this.playing = true;
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.25, Math.min(2, rate));
  }

  tick(nowMs: number): number {
    if (!this.hasLast) {
      this.lastNow = nowMs;
      this.hasLast = true;
      return this.time;
    }
    const raw = (nowMs - this.lastNow) / 1000;
    this.lastNow = nowMs;
    if (!this.playing) return this.time;
    const dt = Math.min(0.1, raw) * this.rate;
    this.time = Math.min(this.duration, this.time + dt);
    if (this.time >= this.duration) {
      this.time = this.duration;
      this.playing = false;
    }
    return this.time;
  }

  get ended(): boolean {
    return this.time >= this.duration - 0.001;
  }
}
