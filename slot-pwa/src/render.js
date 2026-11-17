/* Machine-aware canvas cabinet renderer with vector art and effects. */
import { CANVAS, THEMES, GLOBAL_JACKPOTS } from './config.js';
import { drawSymbol } from './art/symbols.js';
import { drawBackground } from './art/backgrounds.js';
import { Effects } from './effects.js';

const { width: W, height: H } = CANVAS;
const REEL_TOP = 232, REEL_H = 312, REEL_X = 52, REEL_W = 436;

export const HIT_REGIONS = [
  { id: 'spin', x: 60, y: 580, w: 170, h: 80 },
  { id: 'auto', x: 240, y: 580, w: 110, h: 38 },
  { id: 'turbo', x: 360, y: 580, w: 120, h: 38 },
  { id: 'bet', x: 240, y: 626, w: 110, h: 38 },
  { id: 'lines', x: 360, y: 626, w: 120, h: 38 },
  { id: 'paytable', x: 60, y: 668, w: 110, h: 38 },
  { id: 'settings', x: 180, y: 668, w: 110, h: 38 },
  { id: 'stats', x: 300, y: 668, w: 180, h: 38 },
  { id: 'lobby', x: 18, y: 856, w: 140, h: 44 },
  { id: 'daily', x: 168, y: 856, w: 148, h: 44 },
  { id: 'challenge', x: 326, y: 856, w: 148, h: 44 },
  { id: 'lever', x: 486, y: 250, w: 34, h: 220 },
];

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function glowText(ctx, text, x, y, size, color, align = 'center', glow = 14, weight = 'bold') {
  ctx.save();
  ctx.font = `${weight} ${size}px "Trebuchet MS", Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');

export class Cabinet {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    this.particles = [];
    this.lever = 0;
    this.bulbPhase = 0;
    this.pressed = null;
    this.effects = new Effects();
    this.winKey = '';
    this.winProgress = 0;
  }

  spawn(x, y, color, count = 20, spread = 260) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spread * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
        life: 0.7 + Math.random() * 0.8, age: 0,
        color, size: 2 + Math.random() * 4,
      });
    }
  }

  burstWin(win, machine, theme) {
    const color = machine.symbols[win.symbol]?.color || theme.glow;
    win.positions.forEach(([reel, row]) => {
      const { cellW, cellH } = this.geometry(machine);
      this.spawn(REEL_X + reel * cellW + cellW / 2, REEL_TOP + row * cellH + cellH / 2, color, 10, 180);
    });
  }

  geometry(machine) {
    return { cellW: REEL_W / machine.reels, cellH: REEL_H / machine.rows };
  }

  hitTest(x, y) {
    return HIT_REGIONS.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
  }

  draw(frame) {
    const ctx = this.ctx;
    const t = frame.theme || THEMES.neon;
    const machine = frame.machine;
    const dt = Math.min(0.05, frame.dt || 0);
    this.bulbPhase += dt * 3;
    this.lever += (((frame.spinner && frame.spinner.isSpinning) ? 1 : 0) - this.lever) * Math.min(1, dt * 9);
    this.effects.update(dt);

    const key = (frame.wins || []).map((w) => `${w.line}:${w.symbol}`).join('|');
    if (key !== this.winKey) { this.winKey = key; this.winProgress = 0; }
    else this.winProgress = Math.min(1, this.winProgress + dt * 2.6);

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(this.effects.shakeX, this.effects.shakeY);
    drawBackground(ctx, frame.themeKey || 'neon', t, frame.time || 0);
    this.drawMarquee(t, machine);
    this.drawJackpotBoard(t, frame.jackpots);
    this.drawBody(t);
    this.drawReels(t, machine, frame.spinner, frame.wins, frame.time || 0);
    this.drawWinOverlay(t, machine, frame.wins, frame.time || 0);
    this.drawLever(t);
    this.drawDeck(t, frame);
    this.drawDisplays(t, frame);
    this.drawFooter(t, frame);
    this.drawParticles(dt);
    this.effects.draw(ctx, W, H);
    ctx.restore();
  }

  drawMarquee(t, machine) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 20, 0, 128);
    g.addColorStop(0, t.metal); g.addColorStop(0.5, t.panel); g.addColorStop(1, t.metal);
    roundRect(ctx, 24, 22, 492, 106, 22);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = t.edge;
    ctx.shadowColor = t.glow; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 0; i < 22; i++) {
      const x = 44 + i * (452 / 21);
      const on = Math.sin(this.bulbPhase + i * 0.7) > -0.2;
      ctx.beginPath(); ctx.arc(x, 34, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#fff8d0' : '#554b2a';
      ctx.shadowColor = t.glow; ctx.shadowBlur = on ? 10 : 0; ctx.fill(); ctx.shadowBlur = 0;
    }
    const name = (machine?.name || 'LUCKY SEVEN').toUpperCase();
    glowText(ctx, name, W / 2, 76, name.length > 16 ? 30 : name.length > 12 ? 36 : 44, t.edge, 'center', 22, '900');
    const subtitle = machine?.payMode === 'cluster' ? 'CLUSTER PAYS · TUMBLING REELS'
      : machine?.payMode === 'ways' ? `${machine.reels} REELS · WAYS PAYS`
      : `${machine?.reels || 5} REELS · ${machine?.paylines?.length || 20} PAYLINES`;
    glowText(ctx, subtitle, W / 2, 108, 13, t.text, 'center', 4, 'bold');
  }

  drawJackpotBoard(t, jackpots = {}) {
    const ctx = this.ctx;
    const keys = ['mini', 'minor', 'major', 'grand'];
    const x0 = 30, w = 120, gap = 2;
    keys.forEach((key, i) => {
      const def = GLOBAL_JACKPOTS[key];
      const x = x0 + i * (w + gap);
      roundRect(ctx, x, 138, w, 32, 8);
      ctx.fillStyle = '#050505'; ctx.fill();
      ctx.strokeStyle = jackpots[key] >= def.base ? def.color : '#333';
      ctx.lineWidth = 1.5; ctx.stroke();
      glowText(ctx, def.name, x + 6, 150, 10, def.color, 'left', 4, 'bold');
      glowText(ctx, fmt(jackpots[key]), x + w - 6, 154, 14, t.text, 'right', 3, 'bold');
    });
  }

  drawBody(t) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(16, 0, 524, 0);
    g.addColorStop(0, '#0b0b0b'); g.addColorStop(0.08, t.metal);
    g.addColorStop(0.5, t.panel); g.addColorStop(0.92, t.metal); g.addColorStop(1, '#0b0b0b');
    roundRect(ctx, 18, 176, 504, 544, 26);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = t.edge;
    ctx.shadowColor = t.glow; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
    roundRect(ctx, 34, 192, 472, 512, 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
  }

  drawReels(t, machine, spinner, wins = [], time = 0) {
    const ctx = this.ctx;
    const { cellW, cellH } = this.geometry(machine);
    roundRect(ctx, REEL_X - 8, REEL_TOP - 8, REEL_W + 16, REEL_H + 16, 14);
    ctx.fillStyle = '#050505'; ctx.fill();
    ctx.strokeStyle = t.edge; ctx.lineWidth = 2.5;
    ctx.shadowColor = t.glow; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;

    ctx.save();
    ctx.beginPath(); ctx.rect(REEL_X, REEL_TOP, REEL_W, REEL_H); ctx.clip();
    const renderState = spinner ? spinner.getRenderState() : [];
    const winning = new Set(wins.flatMap((w) => w.positions.map(([r, row]) => `${r}:${row}`)));
    for (let r = 0; r < machine.reels; r++) {
      const x = REEL_X + r * cellW;
      ctx.fillStyle = r % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, REEL_TOP, cellW, REEL_H);
      const rs = renderState[r] || { symbols: ['·', ...Array(machine.rows).fill('🍒'), '·'], frac: 0 };
      rs.symbols.forEach((sym, i) => {
        const cy = REEL_TOP + (i + 1) * cellH - rs.frac * cellH;
        if (cy < REEL_TOP - cellH || cy > REEL_TOP + REEL_H + cellH) return;
        const def = machine.symbols[sym];
        const isWin = winning.has(`${r}:${i - 1}`) && !spinner.isSpinning;
        const color = def?.color || t.text;
        const size = Math.min(cellW, cellH) * 0.72;
        ctx.save();
        if (isWin) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 16 + Math.sin(time / 100) * 8;
        }
        drawSymbol(ctx, sym, x + cellW / 2, cy, size, color);
        ctx.restore();
      });
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let row = 1; row < machine.rows; row++) {
      const y = REEL_TOP + row * cellH;
      ctx.beginPath(); ctx.moveTo(REEL_X, y); ctx.lineTo(REEL_X + REEL_W, y); ctx.stroke();
    }
    ctx.restore();

    if (spinner && spinner.isSpinning) {
      const y = REEL_TOP + ((time / 3) % REEL_H);
      const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      g.addColorStop(0, 'transparent'); g.addColorStop(0.5, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'transparent');
      ctx.save(); ctx.beginPath(); ctx.rect(REEL_X, REEL_TOP, REEL_W, REEL_H); ctx.clip();
      ctx.fillStyle = g; ctx.fillRect(REEL_X, y - 30, REEL_W, 60); ctx.restore();
    }
  }

  drawWinOverlay(t, machine, wins = [], time = 0) {
    if (!wins.length) return;
    const ctx = this.ctx;
    const { cellW, cellH } = this.geometry(machine);
    ctx.save();
    if (machine.payMode === 'lines' && machine.paylines) {
      ctx.lineWidth = 3; ctx.lineJoin = 'round';
      wins.forEach((w, i) => {
        const line = machine.paylines[w.line] || [];
        if (!line.length) return;
        const color = machine.symbols[w.symbol]?.color || t.glow;
        ctx.strokeStyle = color; ctx.shadowColor = color;
        ctx.shadowBlur = 12 + Math.sin(time / 120 + i) * 6;
        ctx.globalAlpha = 0.9;
        const points = line.map(([reel, row]) => [
          REEL_X + reel * cellW + cellW / 2,
          REEL_TOP + row * cellH + cellH / 2,
        ]);
        const progress = this.winProgress;
        const last = points.length - 1;
        const count = Math.max(1, Math.ceil(last * progress));
        ctx.beginPath();
        for (let idx = 0; idx <= count; idx++) {
          const [x, y] = points[Math.min(idx, last)];
          idx ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
    } else {
      // Cluster / ways: pulse a frame around winning cells.
      ctx.lineWidth = 3;
      const seen = new Set();
      wins.flatMap((w) => w.positions).forEach(([reel, row]) => {
        const id = `${reel}:${row}`;
        if (seen.has(id)) return;
        seen.add(id);
        ctx.strokeStyle = machine.symbols[wins[0].symbol]?.color || t.glow;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
        roundRect(ctx, REEL_X + reel * cellW + 3, REEL_TOP + row * cellH + 3, cellW - 6, cellH - 6, 8);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  drawLever(t) {
    const ctx = this.ctx;
    const baseY = 250 + this.lever * 130;
    ctx.strokeStyle = '#999'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(503, 320); ctx.lineTo(503, 452); ctx.stroke();
    const g = ctx.createRadialGradient(499, baseY - 6, 2, 503, baseY, 18);
    g.addColorStop(0, '#fff'); g.addColorStop(0.4, t.edge); g.addColorStop(1, '#7a5a00');
    ctx.beginPath(); ctx.arc(503, baseY, 16, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff6'; ctx.lineWidth = 2; ctx.stroke();
  }

  drawButton(t, r, label, opts = {}) {
    const ctx = this.ctx;
    const active = opts.active;
    const pressed = this.pressed === r.id;
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    if (active) { g.addColorStop(0, t.accent); g.addColorStop(1, t.edge); }
    else { g.addColorStop(0, t.metal); g.addColorStop(1, t.panel); }
    roundRect(ctx, r.x, r.y + (pressed ? 2 : 0), r.w, r.h, 9);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = active ? '#fff' : t.edge; ctx.lineWidth = 1.6; ctx.stroke();
    const size = r.id === 'spin' ? 26 : r.w < 150 ? 12 : 13;
    glowText(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + (pressed ? 2 : 0), size,
      active ? '#111' : t.text, 'center', active ? 10 : 2, 'bold');
  }

  drawDeck(t, frame) {
    const byId = Object.fromEntries(HIT_REGIONS.map((r) => [r.id, r]));
    this.drawButton(t, byId.spin, frame.spinner && frame.spinner.isSpinning ? '···' : 'SPIN', { active: true });
    this.drawButton(t, byId.auto, frame.auto ? 'AUTO ON' : 'AUTO', { active: !!frame.auto });
    this.drawButton(t, byId.turbo, frame.turbo ? 'TURBO ON' : 'TURBO', { active: !!frame.turbo });
    this.drawButton(t, byId.bet, `BET ${frame.bet || 1}`);
    const payLabel = frame.payMode === 'ways' ? 'WAYS' : frame.payMode === 'cluster' ? 'CLUSTER' : `LINES ${frame.lines || 1}`;
    this.drawButton(t, byId.lines, payLabel);
    this.drawButton(t, byId.paytable, 'PAYTABLE');
    this.drawButton(t, byId.settings, 'SETTINGS');
    this.drawButton(t, byId.stats, 'STATS');
  }

  drawDisplays(t, frame) {
    const ctx = this.ctx;
    const state = frame.state || {};
    const boxes = [
      { x: 26, label: 'CREDITS', value: fmt(state.credits), color: t.glow },
      { x: 196, label: 'WIN', value: fmt(state.lastWin || 0), color: '#7cffb2' },
      { x: 356, label: frame.mode ? frame.mode.toUpperCase() : `${frame.bet || 1} × ${frame.lines || 1}`, value: frame.mode ? fmt(state.credits) : fmt((frame.bet || 1) * (frame.lines || 1)), color: t.accent },
    ];
    boxes.forEach((b) => {
      roundRect(ctx, b.x, 728, 158, 50, 8);
      ctx.fillStyle = '#050505'; ctx.fill();
      ctx.strokeStyle = b.color; ctx.lineWidth = 1.4; ctx.stroke();
      glowText(ctx, b.label, b.x + 8, 742, 10, b.color, 'left', 3, 'bold');
      glowText(ctx, b.value, b.x + 150, 762, 20, t.text, 'right', 5, 'bold');
    });
    if (state.freeSpins > 0) {
      glowText(ctx, `FREE SPINS × ${state.freeSpins}`, W / 2, 790, 16, t.edge, 'center', 12, 'bold');
    }
  }

  drawFooter(t, frame) {
    const ctx = this.ctx;
    const byId = Object.fromEntries(HIT_REGIONS.map((r) => [r.id, r]));
    this.drawButton(t, byId.lobby, '🏠 LOBBY');
    this.drawButton(t, byId.daily, frame.dailyReady ? '🎁 CLAIM' : '🎁 DAILY', { active: !!frame.dailyReady });
    this.drawButton(t, byId.challenge, frame.challengeReady ? '⚡ RUN' : '⚡ DONE', { active: !!frame.challengeReady });
    glowText(ctx, frame.status || 'TAP SPIN OR PRESS SPACE', W / 2, 824, 13, t.text, 'center', 3, 'bold');
  }

  drawParticles(dt) {
    const ctx = this.ctx;
    this.particles = this.particles.filter((p) => p.age < p.life);
    for (const p of this.particles) {
      p.age += dt;
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}
