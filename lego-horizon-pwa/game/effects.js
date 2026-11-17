/* Pooled visual effects for Machine Hunt. Pure-ish: no DOM, just arrays and
 * canvas drawing calls. The sim emits descriptors into hunt.fx; main.js feeds
 * them here.
 */
const TAU = Math.PI * 2;
const MAX_PARTICLES = 320;
const MAX_TEXTS = 40;

const COLORS = {
  hit: "#ffe08a",
  kill: "#e8733c",
  core: "#f2c14e",
  heal: "#7fe3ff",
  shield: "#b8c8d4",
  hurt: "#ff6b81",
  charge: "#66c0f4",
};

export function createEffects() {
  const particles = [];
  const texts = [];
  const rings = [];
  const pool = [];
  let shake = 0;
  let shakeDecay = 4;
  let flash = 0;
  let flashColor = "255,255,255";
  let hitStop = 0;
  let reduced = false;
  let quality = 1;

  function particle(x, y, color, count, speed = 130, size = 4) {
    const total = Math.max(1, Math.round(count * quality));
    for (let i = 0; i < total && particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.35 + Math.random() * 0.65);
      const life = 0.28 + Math.random() * 0.42;
      const p = pool.pop() || {};
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
      p.life = life; p.maxLife = life; p.color = color;
      p.size = size * (0.6 + Math.random() * 0.8);
      particles.push(p);
    }
  }

  function text(x, y, value, color = "#fff", size = 18) {
    if (texts.length >= MAX_TEXTS) pool.push(texts.shift());
    const t = pool.pop() || {};
    t.x = x; t.y = y; t.value = String(value); t.color = color;
    t.size = size; t.life = 0.85; t.maxLife = 0.85; t.vy = -46;
    texts.push(t);
  }

  function ring(x, y, radius, color = COLORS.charge, life = 0.45) {
    const r = pool.pop() || {};
    r.x = x; r.y = y; r.radius = radius; r.color = color;
    r.life = life; r.maxLife = life;
    rings.push(r);
  }

  function addShake(amount) {
    if (reduced) return;
    shake = Math.min(22, shake + amount);
  }

  function addFlash(color, amount = 0.5) {
    if (reduced) return;
    flash = Math.min(0.8, flash + amount);
    flashColor = color;
  }

  function spawn(fx) {
    switch (fx.kind) {
      case "hit":
        particle(fx.x, fx.y, COLORS.hit, 5, 110, 3);
        if (fx.amount) text(fx.x, fx.y - 12, Math.round(fx.amount), COLORS.hit, 15);
        addShake(1.4);
        break;
      case "kill":
        particle(fx.x, fx.y, COLORS.kill, 16, 210, 5);
        particle(fx.x, fx.y, COLORS.core, 8, 130, 4);
        if (fx.score) text(fx.x, fx.y - 20, `+${fx.score}`, COLORS.core, 20);
        addShake(4);
        if (!reduced) hitStop = Math.max(hitStop, 0.045);
        break;
      case "charged":
        ring(fx.x, fx.y, 30, COLORS.charge, 0.4);
        particle(fx.x, fx.y, COLORS.charge, 10, 180, 4);
        addShake(2.5);
        break;
      case "core":
        particle(fx.x, fx.y, COLORS.core, 5, 90, 3);
        text(fx.x, fx.y, "+1", COLORS.core, 14);
        break;
      case "heal":
        particle(fx.x, fx.y, COLORS.heal, 12, 90, 4);
        text(fx.x, fx.y - 20, "+♥", COLORS.heal, 18);
        break;
      case "playerHit":
        particle(fx.x, fx.y, COLORS.hurt, 14, 190, 5);
        addShake(9);
        addFlash("255,80,100", 0.55);
        if (!reduced) hitStop = Math.max(hitStop, 0.07);
        break;
      case "shield":
        particle(fx.x, fx.y, COLORS.shield, 8, 90, 3);
        text(fx.x, fx.y - 14, "BLOCK", COLORS.shield, 13);
        break;
      case "wave":
      case "boss":
        addShake(6);
        break;
      case "phase":
        particle(fx.x, fx.y, COLORS.kill, 24, 260, 6);
        addShake(14);
        addFlash("232,115,60", 0.45);
        break;
      case "shockwave":
        ring(fx.x, fx.y, fx.radius || 120, "#ff8b5c", 0.6);
        addShake(8);
        break;
      case "burrow":
      case "emerge":
        particle(fx.x, fx.y, "#8a6a45", 12, 120, 5);
        break;
      default:
        break;
    }
  }

  function update(dt) {
    shake = Math.max(0, shake - shakeDecay * dt * 10);
    flash = Math.max(0, flash - dt * 2.2);
    hitStop = Math.max(0, hitStop - dt);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 120 * dt;
      p.life -= dt;
      if (p.life <= 0 && pool.length < 600) { particles.splice(i, 1); pool.push(p); }
      else if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.life <= 0) { texts.splice(i, 1); if (pool.length < 600) pool.push(t); }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      if (r.life <= 0) { rings.splice(i, 1); if (pool.length < 600) pool.push(r); }
    }
  }

  function draw(ctx) {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + p.life / p.maxLife), 0, TAU);
      ctx.fill();
    }
    for (const r of rings) {
      const k = 1 - r.life / r.maxLife;
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (0.4 + k * 0.9), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / (t.maxLife * 0.5)));
      ctx.font = `800 ${t.size}px Arial, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,.6)";
      ctx.strokeText(t.value, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawOverlay(ctx, width, height) {
    if (flash <= 0) return;
    ctx.fillStyle = `rgba(${flashColor},${flash * 0.35})`;
    ctx.fillRect(0, 0, width, height);
  }

  function offset() {
    if (reduced || shake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * shake,
      y: (Math.random() - 0.5) * shake,
    };
  }

  function clear() {
    particles.length = 0;
    texts.length = 0;
    rings.length = 0;
    shake = flash = hitStop = 0;
  }

  return {
    spawn, update, draw, drawOverlay, offset, clear,
    get hitStop() { return hitStop; },
    get count() { return particles.length + texts.length + rings.length; },
    get poolSize() { return pool.length; },
    setReduced(value) { reduced = !!value; if (reduced) clear(); },
    setQuality(value) { quality = Math.max(0.1, Math.min(1, Number(value) || 1)); },
    get reduced() { return reduced; },
  };
}
