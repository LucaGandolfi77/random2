/* Visual juice: celebration banners, shakes, flashes and themed particles. */

const TAU = Math.PI * 2;
const rand = (a = 1, b = 0) => b + Math.random() * (a - b);

export class Effects {
  constructor() {
    this.particles = [];
    this.banners = [];
    this.flashes = [];
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  clear() {
    this.particles.length = 0;
    this.banners.length = 0;
    this.flashes.length = 0;
    this.shake = 0;
  }

  burst(x, y, color, count = 20, style = 'spark', power = 1) {
    for (let i = 0; i < count; i++) {
      const a = rand(TAU);
      const speed = rand(300, 60) * power;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 90,
        age: 0, life: rand(1.4, 0.6), color, size: rand(5, 2),
        style, spin: rand(TAU),
      });
    }
  }

  coinShower(x, y, color = '#ffd700', count = 48) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + rand(180, -180), y: y - rand(320, 80),
        vx: rand(70, -70), vy: rand(80, -40),
        age: 0, life: rand(2.4, 1.2), color, size: rand(9, 5),
        style: 'coin', spin: rand(TAU),
      });
    }
  }

  confetti(color = '#ff5ec4', count = 50) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: rand(540, 0), y: rand(-40, -300),
        vx: rand(50, -50), vy: rand(120, 40),
        age: 0, life: rand(3, 1.8),
        color: i % 3 ? color : '#fff6c0', size: rand(8, 4),
        style: 'confetti', spin: rand(TAU),
      });
    }
  }

  fireworks(color = '#ffcc00', count = 3) {
    for (let k = 0; k < count; k++) {
      const x = rand(480, 60), y = rand(480, 160);
      this.burst(x, y, k % 2 ? '#fff6c0' : color, 40, 'spark', 1.4);
    }
  }

  explode(x, y, color, count = 26) {
    this.burst(x, y, color, count, 'shard', 1.2);
  }

  signature(themeKey, color, x = 270, y = 400) {
    const map = {
      ocean: 'bubble', norse: 'snow', forest: 'leaf', samurai: 'ember',
      egypt: 'sand', safari: 'sand', candy: 'confetti', cosmic: 'spark',
      neon: 'spark', retro: 'glitch',
    };
    const style = map[themeKey] || 'spark';
    const count = style === 'glitch' ? 12 : 28;
    for (let i = 0; i < count; i++) {
      let px = x + rand(200, -200), py = y + rand(160, -160);
      let vx = rand(70, -70), vy = rand(-30, -120);
      if (style === 'bubble') { vx = rand(40, -40); vy = rand(-40, -140); }
      if (style === 'snow' || style === 'leaf') { vx = rand(40, -40); vy = rand(20, 60); }
      if (style === 'ember') { vx = rand(50, -50); vy = rand(-60, -180); }
      if (style === 'sand') { vx = rand(120, -120); vy = rand(60, -20); }
      this.particles.push({
        x: px, y: py, vx, vy, age: 0, life: rand(1.8, 0.9),
        color, size: rand(6, 2), style: style === 'glitch' ? 'glitch' : style,
        spin: rand(TAU),
      });
    }
  }

  banner(text, color = '#ffcc00', tier = 1) {
    this.banners.push({ text, color, tier, age: 0, life: 1.5 + tier * 0.3 });
  }

  flash(color = '#ffffff', strength = 0.5) {
    this.flashes.push({ color, strength, age: 0, life: 0.35 });
  }

  shakeScreen(power = 8) { this.shake = Math.max(this.shake, power); }

  update(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.spin += dt * 4;
      if (p.style === 'bubble' || p.style === 'ember') {
        p.y += p.vy * dt;
        p.x += Math.sin(p.age * 4 + p.spin) * 18 * dt;
      } else if (p.style === 'leaf' || p.style === 'snow') {
        p.y += p.vy * dt;
        p.x += Math.sin(p.age * 3 + p.spin) * 40 * dt;
      } else {
        p.vy += 520 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    this.particles = this.particles.filter((p) => p.age < p.life && p.y < 1000);

    for (const b of this.banners) b.age += dt;
    this.banners = this.banners.filter((b) => b.age < b.life);

    for (const f of this.flashes) f.age += dt;
    this.flashes = this.flashes.filter((f) => f.age < f.life);

    if (this.shake > 0.1) {
      this.shakeX = rand(this.shake, -this.shake);
      this.shakeY = rand(this.shake, -this.shake);
      this.shake *= Math.pow(0.02, dt);
    } else {
      this.shake = this.shakeX = this.shakeY = 0;
    }
  }

  draw(ctx, W, H) {
    for (const p of this.particles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.style === 'glitch' ? 0 : 8;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      const s = p.size;
      if (p.style === 'coin') {
        ctx.scale(Math.abs(Math.cos(p.spin)), 1);
        ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6c0'; ctx.font = `bold ${s}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0);
      } else if (p.style === 'confetti') {
        ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
      } else if (p.style === 'glitch') {
        ctx.fillRect(-s, -2, s * 3, 4);
      } else if (p.style === 'shard') {
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    for (const b of this.banners) {
      const p = b.age / b.life;
      const scale = p < 0.18 ? 0.4 + p / 0.18 * 0.6 : p > 0.78 ? 1 - (p - 0.78) / 0.22 * 0.25 : 1;
      ctx.save();
      ctx.translate(W / 2, H / 2 - 30);
      ctx.scale(scale, scale);
      ctx.globalAlpha = p > 0.82 ? (1 - p) / 0.18 : 1;
      ctx.font = `900 ${34 + b.tier * 6}px "Trebuchet MS", Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = '#000a'; ctx.strokeText(b.text, 0, 0);
      ctx.shadowColor = b.color; ctx.shadowBlur = 22;
      ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
      ctx.restore();
    }

    for (const f of this.flashes) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - f.age / f.life) * f.strength;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
