/*
 * Reel animation controller. The landing symbols are decided before the spin;
 * reels decelerate into that exact position, which makes near-misses possible.
 */
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

export class ReelSpinner {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.reels = [];
    this.rows = 3;
    this.spinning = false;
    this.turbo = false;
    this._resolve = null;
  }

  reset(strips, rows = 3) {
    this.rows = rows;
    this.reels = strips.map((strip) => ({
      strip,
      offset: 0,
      from: 0,
      to: 0,
      startTime: 0,
      duration: 1,
      spinning: false,
      fixed: null,
    }));
    this.spinning = false;
  }

  /* starts: [{ reel, start, strip }] */
  start(starts, { turbo = false, random = Math.random, teaseReel = -1 } = {}) {
    this.turbo = turbo;
    const now = this.now();
    starts.forEach((s) => {
      const reel = this.reels[s.reel];
      if (!reel) return;
      reel.strip = s.strip;
      reel.fixed = null;
      reel.from = reel.offset;
      const loops = (turbo ? 2 : 3) + s.reel;
      let to = s.start + loops * s.strip.length;
      while (to <= reel.from) to += s.strip.length;
      reel.to = to;
      reel.startTime = now + s.reel * (turbo ? 35 : 70);
      reel.duration = (turbo ? 430 : 1150) + s.reel * (turbo ? 70 : 210);
      reel.tease = s.reel === teaseReel
        ? { at: 0.74, until: reel.startTime + reel.duration * 0.94 }
        : null;
      reel.spinning = true;
    });
    this.spinning = true;
    return new Promise((resolve) => { this._resolve = resolve; });
  }

  update(now = this.now()) {
    if (!this.spinning) return false;
    let active = false;
    for (const reel of this.reels) {
      if (!reel.spinning) continue;
      const t = clamp01((now - reel.startTime) / reel.duration);
      let used = t;
      if (reel.tease && now < reel.tease.until && t > reel.tease.at) {
        used = reel.tease.at + (t - reel.tease.at) * 0.06;
      }
      reel.offset = reel.from + (reel.to - reel.from) * easeOutQuint(used);
      if (t >= 1) {
        reel.offset = reel.to % reel.strip.length;
        reel.spinning = false;
        reel.tease = null;
      } else {
        active = true;
      }
    }
    if (!active) {
      this.spinning = false;
      if (this._resolve) { this._resolve(); this._resolve = null; }
    }
    return this.spinning;
  }

  /* Freeze the displayed grid after cascades so the final win stays on screen. */
  setGrid(grid) {
    this.reels.forEach((reel, i) => {
      reel.fixed = grid[i] ? grid[i].slice() : null;
      reel.spinning = false;
    });
    this.spinning = false;
  }

  /* [{ symbols: [above, ...rows, below], frac }] */
  getRenderState() {
    const rows = this.rows;
    return this.reels.map((reel) => {
      if (reel.fixed) {
        return { symbols: ['·', ...reel.fixed, '·'], frac: 0, fixed: true };
      }
      const len = reel.strip.length;
      const base = Math.floor(reel.offset);
      const frac = reel.offset - base;
      const symbols = [];
      for (let i = -1; i <= rows; i++) {
        symbols.push(reel.strip[((base + i) % len + len) % len]);
      }
      return { symbols, frac, fixed: false };
    });
  }

  get isSpinning() { return this.spinning; }
}
