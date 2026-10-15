import { gameState } from '../state/GameState.ts';
import { CLUB_DATA, type MatchEvent } from '../types/index.ts';
import { cheer, thud, whistle } from '../audio.ts';

export type MinigameCallback = (success: boolean, type: 'goal' | 'assist' | 'save' | 'pass' | 'tackle' | 'miss') => void;

interface CircleTarget {
  x: number;
  y: number;
  r: number;
  type: 'goal' | 'teammate' | 'defender';
}

export class MatchCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 360;
  height = 500;
  dpr = 1;
  running = false;
  animationId = 0;
  keeperX = 0;
  keeperDir = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = this.canvas.parentElement;
    if (parent) {
      const w = Math.min(parent.clientWidth, 420);
      this.width = w;
      this.height = Math.floor(w * 1.25);
    }
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    this.ctx.fillStyle = '#1a472a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Skill threshold with energy modifier + opponent difficulty. */
  private threshold(skill: number, oppStrength: number): number {
    const mod = gameState.matchSkillModifier();
    const oppMod = 1 - (oppStrength - 50) / 320;
    return clampT(skill * 0.85 * mod * oppMod);
  }

  private oppStrength(event: MatchEvent, homeTeam: string, awayTeam: string): number {
    const isHome = homeTeam === gameState.player.club;
    const opp = isHome ? awayTeam : homeTeam;
    return CLUB_DATA.find((c) => c.name === opp)?.strength ?? 50;
  }

  // ─── Aiming Minigame (Pass / Shoot) ───
  runAimingMinigame(event: MatchEvent, onComplete: MinigameCallback, homeTeam = '', awayTeam = '') {
    this.stop();
    this.running = true;
    let dragging = false;
    const startX = this.width / 2;
    const startY = this.height * 0.75;
    let aimX = startX;
    let aimY = startY - 80;
    const targets: CircleTarget[] = [];
    const isShoot = event.type === 'shoot';
    const oppStrength = this.oppStrength(event, homeTeam, awayTeam);

    if (isShoot) {
      for (let i = 0; i < 3; i++) {
        targets.push({ x: this.width * (0.25 + i * 0.25), y: this.height * 0.15, r: 28, type: 'goal' });
      }
      this.keeperX = this.width / 2;
      this.keeperDir = Math.random() > 0.5 ? 1 : -1;
    } else {
      targets.push({ x: this.width * 0.3, y: this.height * 0.3, r: 20, type: 'teammate' });
      targets.push({ x: this.width * 0.7, y: this.height * 0.25, r: 20, type: 'teammate' });
    }
    targets.push({ x: this.width * 0.5, y: this.height * 0.45, r: 20, type: 'defender' });
    targets.push({ x: this.width * 0.35, y: this.height * 0.5, r: 18, type: 'defender' });

    const getPointer = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      const p = getPointer(e);
      if (Math.hypot(p.x - startX, p.y - startY) < 60) dragging = true;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const p = getPointer(e);
      const dx = p.x - startX;
      const dy = p.y - startY;
      const len = Math.hypot(dx, dy);
      const maxLen = 140;
      const scale = Math.min(len, maxLen) / (len || 1);
      aimX = startX + dx * scale;
      aimY = startY + dy * scale;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const dx = aimX - startX;
      const dy = aimY - startY;
      const power = Math.hypot(dx, dy) / 140;
      const targetX = startX + dx * 3;
      const targetY = startY + dy * 3;

      let hit: CircleTarget | null = null;
      let bestDist = Infinity;
      for (const t of targets) {
        const d = Math.hypot(t.x - targetX, t.y - targetY);
        if (d < t.r + 15 && d < bestDist) {
          bestDist = d;
          hit = t;
        }
      }

      const skill = isShoot
        ? (gameState.getEffectiveSkill('power') + gameState.getEffectiveSkill('technique')) / 2
        : (gameState.getEffectiveSkill('vision') + gameState.getEffectiveSkill('technique')) / 2;
      const accuracy = power > 0.15 && power < 0.95 ? 1 : 0.7;
      const roll = Math.random() * 100;
      const threshold = this.threshold(skill, oppStrength);

      // A moving keeper guards the shot
      let keeperBlocked = false;
      if (isShoot && hit?.type === 'goal') {
        keeperBlocked = Math.abs(this.keeperX - hit.x) < 26;
      }

      let success = false;
      let resultType: Parameters<MinigameCallback>[1] = 'miss';

      if (hit) {
        if (hit.type === 'goal') {
          success = roll < threshold && !keeperBlocked;
          resultType = success ? 'goal' : 'miss';
        } else if (hit.type === 'teammate') {
          success = roll < threshold;
          resultType = success ? 'assist' : 'pass';
        } else if (hit.type === 'defender') {
          success = false;
          resultType = 'miss';
        }
      } else {
        success = roll < threshold * 0.3;
        resultType = success ? 'pass' : 'miss';
      }

      this.stop();
      if (resultType === 'goal') cheer();
      else if (resultType === 'miss') thud();
      else blipLow();
      this.animateTrajectory(startX, startY, targetX, targetY, hit?.type || 'defender', () => {
        cleanup();
        onComplete(success, resultType);
      });
    };

    const cleanup = () => {
      this.canvas.removeEventListener('pointerdown', onDown);
      this.canvas.removeEventListener('pointermove', onMove);
      this.canvas.removeEventListener('pointerup', onUp);
    };

    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);
    whistle();

    const draw = () => {
      if (!this.running) return;
      this.clear();
      this.drawPitch();

      // Keeper patrols the goal for shots
      if (isShoot) {
        this.keeperX += this.keeperDir * 1.6;
        if (this.keeperX > this.width * 0.72 || this.keeperX < this.width * 0.28) this.keeperDir *= -1;
        this.drawKeeper(this.keeperX, this.height * 0.15 + 16);
      }

      this.drawPlayer(startX, startY, '#3b82f6');

      for (const t of targets) {
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        if (t.type === 'goal') this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
        else if (t.type === 'teammate') this.ctx.fillStyle = 'rgba(59,130,246,0.35)';
        else this.ctx.fillStyle = 'rgba(239,68,68,0.35)';
        this.ctx.fill();
        this.ctx.strokeStyle = t.type === 'defender' ? '#ef4444' : '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t.type === 'teammate' ? '👤' : '🛡️', t.x, t.y + 5);
      }

      if (aimX !== startX || aimY !== startY) {
        this.drawArrow(startX, startY, aimX, aimY);
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(startX, startY - 60);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      this.drawOverlay(isShoot ? '🎯 DRAG TO AIM YOUR SHOT — MIND THE KEEPER' : '🎯 DRAG TO AIM YOUR PASS');
      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  // ─── Free Kick Minigame: curve it over the wall, past the keeper ───
  runFreeKickMinigame(_event: MatchEvent, onComplete: MinigameCallback, homeTeam = '', awayTeam = '') {
    this.stop();
    this.running = true;
    let dragging = false;
    const startX = this.width / 2;
    const startY = this.height * 0.8;
    let aimX = startX;
    let aimY = startY - 90;
    const oppStrength = this.oppStrength(_event, homeTeam, awayTeam);

    const goalZones: CircleTarget[] = [];
    for (let i = 0; i < 3; i++) {
      goalZones.push({ x: this.width * (0.25 + i * 0.25), y: this.height * 0.13, r: 26, type: 'goal' });
    }
    // The wall: three defenders in a row
    const wallY = this.height * 0.42;
    const wall: { x: number; y: number; r: number; type: 'defender' }[] = [
      { x: this.width * 0.42, y: wallY, r: 17, type: 'defender' },
      { x: this.width * 0.5, y: wallY - 6, r: 17, type: 'defender' },
      { x: this.width * 0.58, y: wallY, r: 17, type: 'defender' },
    ];
    this.keeperX = this.width / 2;
    this.keeperDir = Math.random() > 0.5 ? 1 : -1;

    const getPointer = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onDown = (e: PointerEvent) => {
      const p = getPointer(e);
      if (Math.hypot(p.x - startX, p.y - startY) < 60) dragging = true;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const p = getPointer(e);
      const dx = p.x - startX;
      const dy = p.y - startY;
      const len = Math.hypot(dx, dy);
      const scale = Math.min(len, 150) / (len || 1);
      aimX = startX + dx * scale;
      aimY = startY + dy * scale;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const dx = aimX - startX;
      const dy = aimY - startY;
      // Free kicks reward a diagonal, curved strike
      const curve = Math.abs(dx) / 140; // 0–1
      const targetX = startX + dx * 2.6;
      const targetY = startY + dy * 2.6;

      let hit: CircleTarget | null = null;
      let bestDist = Infinity;
      for (const z of goalZones) {
        const d = Math.hypot(z.x - targetX, z.y - targetY);
        if (d < z.r + 14 && d < bestDist) { bestDist = d; hit = z; }
      }
      // Through the wall?
      let wallBlocked = false;
      for (const w of wall) {
        if (Math.abs(targetX - w.x) < w.r && targetY > w.y - 10 && startY > w.y) wallBlocked = true;
      }
      const keeperBlocked = hit ? Math.abs(this.keeperX - hit.x) < 24 : false;

      const fk = gameState.getEffectiveSkill('freeKicks');
      const roll = Math.random() * 100;
      const threshold = this.threshold(fk * 0.9 + curve * 12, oppStrength);

      let success = false;
      if (hit && !wallBlocked && !keeperBlocked && curve > 0.12) {
        success = roll < threshold;
      }
      const resultType: Parameters<MinigameCallback>[1] = success ? 'goal' : 'miss';

      this.stop();
      if (success) cheer(); else thud();
      this.animateFreeKick(startX, startY, targetX, targetY, dx > 0 ? 1 : -1, curve, () => {
        cleanup();
        onComplete(success, resultType);
      });
    };

    const cleanup = () => {
      this.canvas.removeEventListener('pointerdown', onDown);
      this.canvas.removeEventListener('pointermove', onMove);
      this.canvas.removeEventListener('pointerup', onUp);
    };

    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);

    const draw = () => {
      if (!this.running) return;
      this.clear();
      this.drawPitch();

      this.keeperX += this.keeperDir * 1.8;
      if (this.keeperX > this.width * 0.7 || this.keeperX < this.width * 0.3) this.keeperDir *= -1;
      this.drawKeeper(this.keeperX, this.height * 0.13 + 14);

      for (const w of wall) {
        this.ctx.beginPath();
        this.ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(239,68,68,0.5)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      for (const z of goalZones) {
        this.ctx.beginPath();
        this.ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.fill();
      }

      this.drawPlayer(startX, startY, '#3b82f6');
      if (aimX !== startX || aimY !== startY) this.drawArrow(startX, startY, aimX, aimY);
      else {
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(startX, startY - 60);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      this.drawOverlay('🌀 DRAG DIAGONALLY — CURVE IT OVER THE WALL');
      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  // ─── Interception Minigame ───
  runInterceptionMinigame(_event: MatchEvent, onComplete: MinigameCallback, homeTeam = '', awayTeam = '') {
    this.stop();
    this.running = true;
    const startTime = performance.now();
    const duration = 2000 + Math.random() * 1500;
    const ballStartX = Math.random() > 0.5 ? 20 : this.width - 20;
    const ballEndX = this.width / 2 + (Math.random() - 0.5) * 60;
    const ballStartY = 80;
    const ballEndY = this.height * 0.65;
    let tapped = false;
    let tapTime = 0;

    const playerX = this.width / 2;
    const playerY = this.height * 0.65;
    const hitWindow = 280;
    const oppStrength = this.oppStrength(_event, homeTeam, awayTeam);

    const onTap = () => {
      if (tapped) return;
      tapped = true;
      tapTime = performance.now();
    };
    this.canvas.addEventListener('pointerdown', onTap);

    const draw = () => {
      if (!this.running) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.clear();
      this.drawPitch();

      const bx = ballStartX + (ballEndX - ballStartX) * progress;
      const by = ballStartY + (ballEndY - ballStartY) * progress;

      this.drawPlayer(playerX, playerY, '#3b82f6');
      const zoneR = 35;
      this.ctx.beginPath();
      this.ctx.arc(playerX, playerY, zoneR, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(bx, by, 10, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.fillStyle = '#000';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚽', bx, by + 4);

      this.ctx.beginPath();
      this.ctx.moveTo(ballStartX, ballStartY);
      this.ctx.lineTo(ballEndX, ballEndY);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.drawOverlay('⚡ TAP WHEN THE BALL HITS THE ZONE!');

      if (progress >= 1) {
        this.canvas.removeEventListener('pointerdown', onTap);
        const idealTime = startTime + duration;
        const diff = Math.abs(tapTime - idealTime);
        const skill = gameState.getEffectiveSkill('pace') * 0.5 + gameState.getEffectiveSkill('power') * 0.5;
        const bonus = skill * 2 * gameState.matchSkillModifier() * (1 - (oppStrength - 50) / 300);
        const success = tapped && diff < hitWindow + bonus;
        this.stop();
        if (success) blipLow(); else thud();
        setTimeout(() => onComplete(success, success ? 'tackle' : 'miss'), 200);
        return;
      }

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  // ─── Drawing helpers ───
  drawPitch() {
    const g = this.ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, '#14522d');
    g.addColorStop(1, '#1a472a');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(20, 20, this.width - 40, this.height - 40);
    this.ctx.beginPath();
    this.ctx.moveTo(20, this.height / 2);
    this.ctx.lineTo(this.width - 20, this.height / 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(this.width / 2, this.height / 2, 40, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fillRect(this.width * 0.25, 15, this.width * 0.5, 5);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    this.ctx.strokeRect(this.width * 0.25, 15, this.width * 0.5, 22);
  }

  drawOverlay(text: string) {
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(10, 10, this.width - 20, 30);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, this.width / 2, 30);
  }

  drawPlayer(x: number, y: number, color: string) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, 14, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('★', x, y + 4);
  }

  drawKeeper(x: number, y: number) {
    this.ctx.fillStyle = '#22c55e';
    this.ctx.fillRect(x - 16, y - 8, 32, 20);
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - 16, y - 8, 32, 20);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🧤', x, y + 6);
  }

  drawArrow(x1: number, y1: number, x2: number, y2: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fill();
  }

  animateTrajectory(x1: number, y1: number, x2: number, y2: number, _hitType: string, onDone: () => void) {
    const start = performance.now();
    const dur = 600;
    const draw = () => {
      const t = Math.min((performance.now() - start) / dur, 1);
      const ex = x1 + (x2 - x1) * t;
      const ey = y1 + (y2 - y1) * t - 40 * Math.sin(t * Math.PI);
      this.clear();
      this.drawPitch();
      this.drawPlayer(x1, y1, '#3b82f6');
      this.ctx.beginPath();
      this.ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
      if (t < 1) {
        this.animationId = requestAnimationFrame(draw);
      } else {
        onDone();
      }
    };
    draw();
  }

  animateFreeKick(x1: number, y1: number, x2: number, y2: number, dir: number, curve: number, onDone: () => void) {
    const start = performance.now();
    const dur = 750;
    const draw = () => {
      const t = Math.min((performance.now() - start) / dur, 1);
      const bend = curve * 60 * dir * Math.sin(t * Math.PI);
      const ex = x1 + (x2 - x1) * t + bend;
      const ey = y1 + (y2 - y1) * t - 55 * Math.sin(t * Math.PI);
      this.clear();
      this.drawPitch();
      this.drawPlayer(x1, y1, '#3b82f6');
      this.ctx.beginPath();
      this.ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
      if (t < 1) {
        this.animationId = requestAnimationFrame(draw);
      } else {
        onDone();
      }
    };
    draw();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }
}

function clampT(n: number): number {
  return Math.max(8, Math.min(92, n));
}

function blipLow() { /* soft pass sound */ }
