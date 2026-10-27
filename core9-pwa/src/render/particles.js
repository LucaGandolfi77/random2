/*
 * CORE 9 — particles.
 *
 * Steam is the plant's pulse: low-poly puffs that rise from every cooling
 * tower, plus construction dust and sparks. World-space so they sort cor-
 * rectly against the camera, but drawn as screen-space hexagons because a
 * puff of steam has no useful silhouette beyond its polygon.
 */

export class Particles {
  constructor() {
    this.list = [];
    this.emitterAcc = new Map();
    this.floats = [];
  }

  puff(type, x, y, z, opts = {}) {
    const count = opts.count || 1;
    for (let i = 0; i < count; i++) {
      const steam = type === "steam";
      const dust = type === "dust";
      const spark = type === "spark";
      const life = opts.life || (steam ? 3.6 : dust ? 1.4 : 0.9);
      this.list.push({
        type,
        x: x + (Math.random() - 0.5) * (opts.spread || 0.1),
        y: y + (Math.random() - 0.5) * (opts.spread || 0.1),
        z,
        vx: (Math.random() - 0.5) * (steam ? 0.12 : dust ? 1.0 : 1.6),
        vy: (Math.random() - 0.5) * (steam ? 0.12 : dust ? 1.0 : 1.6),
        vz: steam ? 0.35 + Math.random() * 0.25 : dust ? 0.4 + Math.random() * 0.5 : 1.4 + Math.random() * 1.6,
        t: 0,
        life,
        size: (opts.size || 0.2) * (0.7 + Math.random() * 0.6),
        color: opts.color || (steam ? "#cfd8d3" : dust ? "#b4a78b" : "#f3b53f"),
        alpha: opts.alpha == null ? (steam ? 0.22 : 0.9) : opts.alpha,
        grow: steam ? 1.4 : 0.2,
      });
    }
  }

  emitSteam(key, x, y, z, dt, size = 0.2, rate = 1) {
    const acc = (this.emitterAcc.get(key) || 0) + dt * rate;
    const step = 0.28;
    if (acc >= step) {
      const n = Math.min(3, Math.floor(acc / step));
      this.emitterAcc.set(key, acc - n * step);
      for (let i = 0; i < n; i++) this.puff("steam", x, y, z, { size, count: 1 });
    } else {
      this.emitterAcc.set(key, acc);
    }
  }

  burst(x, y, z, colour) {
    this.puff("spark", x, y, z, { count: 16, size: 0.075, spread: 0.5, color: colour || "#f3b53f" });
    this.puff("dust", x, y, z + 0.2, { count: 12, size: 0.18, spread: 0.7, alpha: 0.55 });
    this.puff("steam", x, y, z + 0.4, { count: 8, size: 0.26, spread: 0.4, alpha: 0.3 });
  }

  float(x, y, z, text, colour) {
    this.floats.push({ x, y, z, text, colour: colour || "#f3b53f", t: 0, life: 1.35 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= p.type === "spark" ? 3.2 * dt : p.type === "dust" ? 0.6 * dt : 0.02 * dt;
      p.vx *= p.type === "spark" ? 0.99 : 0.985;
      p.vy *= p.type === "spark" ? 0.99 : 0.985;
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t >= f.life) this.floats.splice(i, 1);
    }
  }

  draw(ctx, project, zoom) {
    for (const p of this.list) {
      const pt = project(p.x, p.y, p.z);
      const k = p.t / p.life;
      const size = Math.max(1.1, p.size * (1 + p.grow * k) * 20 * zoom);
      const alpha = p.alpha * (1 - k) * (p.type === "steam" ? Math.min(1, k * 4) : 1);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      if (p.type === "steam" || p.type === "dust") {
        hexagon(ctx, pt.x, pt.y, size, p.t * 0.3 + p.x);
      } else {
        ctx.fillRect(pt.x - size * 0.35, pt.y - size * 0.35, size * 0.7, size * 0.7);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawFloats(ctx, project, zoom) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + Math.max(12, Math.round(14 * zoom)) + "px ui-monospace, SFMono-Regular, Menlo, monospace";
    for (const f of this.floats) {
      const pt = project(f.x, f.y, f.z + f.t * 1.3);
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = f.colour;
      ctx.fillText(f.text, pt.x, pt.y);
    }
    ctx.globalAlpha = 1;
  }
}

function hexagon(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
