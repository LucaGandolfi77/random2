/* Visual juice: celebration banners, shakes, flashes and themed particles. */

const TAU = Math.PI * 2;
const rand = (a = 1, b = 0) => b + Math.random() * (a - b);

export class Effects {
  constructor() {
    this.particles = [];
    this.banners = [];
    this.flashes = [];
    this.floaters = [];
    this.rays = [];
    this.bolts = [];
    this.maxParticles = 600;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  clear() {
    this.particles.length = 0;
    this.banners.length = 0;
    this.flashes.length = 0;
    this.floaters.length = 0;
    this.rays.length = 0;
    this.bolts.length = 0;
    this.shake = 0;
  }

  addParticle(p) {
    if (this.particles.length < this.maxParticles) this.particles.push(p);
  }

  burst(x, y, color, count = 20, style = 'spark', power = 1) {
    for (let i = 0; i < count; i++) {
      const a = rand(TAU);
      const speed = rand(300, 60) * power;
      this.addParticle({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 90,
        age: 0, life: rand(1.4, 0.6), color, size: rand(5, 2),
        style, spin: rand(TAU),
      });
    }
  }

  coinShower(x, y, color = '#ffd700', count = 48) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
        x: x + rand(180, -180), y: y - rand(320, 80),
        vx: rand(70, -70), vy: rand(80, -40),
        age: 0, life: rand(2.4, 1.2), color, size: rand(9, 5),
        style: 'coin', spin: rand(TAU),
      });
    }
  }

  confetti(color = '#ff5ec4', count = 50) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
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
      this.addParticle({
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

  /* Cinematic bonus introduction: rays, sparkles and a coin fountain. */
  bonusIntro(title = 'BONUS ROUND', color = '#ffcc00') {
    this.rays.push({ color, age: 0, life: 2.2, speed: 1.4 });
    this.banner(title, color, 3);
    this.flash(color, 0.45);
    this.coinShower(270, 420, color, 60);
    this.fireworks(color, 3);
    this.shakeScreen(10);
  }

  /* Reel-stop wheel presentation: tick sparks around a centre point. */
  wheelSparks(color = '#ffcc00', ticks = 26) {
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * TAU;
      this.addParticle({
        x: 270 + Math.cos(a) * 110, y: 430 + Math.sin(a) * 110,
        vx: -Math.sin(a) * 90, vy: Math.cos(a) * 90,
        age: 0, life: rand(0.6, 0.3), color, size: rand(4, 2),
        style: 'spark', spin: a,
      });
    }
  }

  /* Chest / gift reveal with a golden flip burst. */
  chestReveal(x, y, label, color = '#ffcc00') {
    this.burst(x, y, color, 30, 'shard', 1.3);
    this.burst(x, y, '#fff6c0', 16, 'spark', 0.8);
    this.floatText(label, x, y - 30, color);
    this.shakeScreen(5);
  }

  floatText(text, x, y, color = '#fff6c0') {
    this.floaters.push({ text, x, y, color, age: 0, life: 1.5 });
  }

  /* Light beams radiating from the centre — used on bonus wins. */
  beam(color = '#fff6c0', power = 1) {
    this.rays.push({ color, age: 0, life: 1.2 * power, speed: 2.4 * power });
    this.flash(color, 0.2);
  }

  lightning(color = '#bfe9ff') {
    for (let i = 0; i < 3; i++) {
      const x = rand(500, 40);
      const pts = [[x, 0]];
      let y = 0;
      while (y < 460) {
        y += rand(90, 40);
        pts.push([x + rand(38, -38), Math.min(y, 460)]);
      }
      this.bolts.push({ pts, color, age: 0, life: 0.35 });
    }
    this.flash(color, 0.3);
    this.shakeScreen(7);
  }

  /* Escalating win celebration. */
  tier(amount) {
    if (amount >= 10000) {
      this.banner('JACKPOT!', '#ffd700', 4);
      this.beam('#ffd700', 1.4);
      this.lightning('#fff3b0');
      this.fireworks('#ffd700', 5);
      this.coinShower(270, 420, '#ffd700', 80);
      this.confetti('#ffcc00', 70);
      this.shakeScreen(17);
    } else if (amount >= 5000) {
      this.banner('EPIC WIN!', '#ff5ec4', 3);
      this.beam('#ff5ec4', 1.2);
      this.fireworks('#ff5ec4', 4);
      this.coinShower(270, 380, '#ffcc00', 60);
      this.shakeScreen(13);
    } else if (amount >= 2000) {
      this.banner('MEGA WIN!', '#c084fc', 3);
      this.beam('#c084fc');
      this.confetti('#c084fc', 50);
      this.coinShower(270, 380, '#ffd700', 45);
      this.shakeScreen(10);
    } else if (amount >= 800) {
      this.banner('BIG WIN!', '#ffcc00', 2);
      this.coinShower(270, 380, '#ffcc00', 32);
      this.beam('#ffcc00', 0.7);
      this.shakeScreen(7);
    } else if (amount > 0) {
      this.banner('WIN!', '#7cffb2', 1);
    }
  }

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

    for (const f of this.floaters) { f.age += dt; f.y -= 42 * dt; }
    this.floaters = this.floaters.filter((f) => f.age < f.life);

    for (const r of this.rays) r.age += dt;
    this.rays = this.rays.filter((r) => r.age < r.life);

    for (const b of this.bolts) b.age += dt;
    this.bolts = this.bolts.filter((b) => b.age < b.life);

    if (this.shake > 0.1) {
      this.shakeX = rand(this.shake, -this.shake);
      this.shakeY = rand(this.shake, -this.shake);
      this.shake *= Math.pow(0.02, dt);
    } else {
      this.shake = this.shakeX = this.shakeY = 0;
    }
  }

  draw(ctx, W, H) {
    /* Rotating light beams behind everything. */
    for (const r of this.rays) {
      const t = r.age / r.life;
      ctx.save();
      ctx.translate(W / 2, H / 2 - 40);
      ctx.rotate(r.age * r.speed);
      ctx.globalAlpha = Math.sin(t * Math.PI) * 0.22;
      for (let i = 0; i < 10; i++) {
        ctx.rotate(Math.PI / 5);
        const g = ctx.createLinearGradient(0, 0, 0, -H);
        g.addColorStop(0, r.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(0, -H); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    for (const b of this.bolts) {
      const a = Math.max(0, 1 - b.age / b.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 14;
      ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath();
      b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
    }

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

    for (const f of this.floaters) {
      const t = f.age / f.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - t) * 2);
      ctx.font = '900 26px "Trebuchet MS", Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = '#000b';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.shadowColor = f.color; ctx.shadowBlur = 12;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
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
