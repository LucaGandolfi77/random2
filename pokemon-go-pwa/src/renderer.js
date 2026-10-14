/* Low Poly Pokémon Renderer */

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return s / 233280;
}

/* Draw an ellipse as a low-poly fan of triangles */
function drawPolyEllipse(ctx, cx, cy, rx, ry, segs, color, time, bobAmount) {
  const bob = Math.sin(time * 2 + cx * 10) * (bobAmount || 0);
  cx += 0; cy += bob;
  ctx.fillStyle = color;
  for (let i = 0; i < segs; i++) {
    const a1 = (Math.PI * 2 * i) / segs;
    const a2 = (Math.PI * 2 * (i + 1)) / segs;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry);
    ctx.lineTo(cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry);
    ctx.closePath();
    ctx.fill();
  }
}

/* Draw a low-poly triangle */
function drawPolyTri(ctx, x1, y1, x2, y2, x3, y3, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

/* Archetype builders — each returns a function that draws the pokemon */
const ARCHETYPES = {
  quadruped(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // body
      drawPolyEllipse(ctx, bx, by - 0.05 * s, 0.32 * s, 0.22 * s, 7, c.primary, time, 0);
      // head
      drawPolyEllipse(ctx, bx + 0.28 * s, by - 0.22 * s, 0.2 * s, 0.18 * s, 6, c.secondary, time, 0);
      // tail
      drawPolyTri(ctx, bx - 0.32 * s, by, bx - 0.48 * s, by - 0.12 * s, bx - 0.38 * s, by + 0.06 * s, c.accent);
      // legs
      drawPolyEllipse(ctx, bx - 0.18 * s, by + 0.18 * s, 0.07 * s, 0.12 * s, 4, c.detail, time, 0);
      drawPolyEllipse(ctx, bx + 0.12 * s, by + 0.18 * s, 0.07 * s, 0.12 * s, 4, c.detail, time, 0);
      // ear L
      drawPolyTri(ctx, bx + 0.18 * s, by - 0.32 * s, bx + 0.24 * s, by - 0.46 * s, bx + 0.28 * s, by - 0.28 * s, c.accent);
      // ear R
      drawPolyTri(ctx, bx + 0.34 * s, by - 0.30 * s, bx + 0.42 * s, by - 0.44 * s, bx + 0.40 * s, by - 0.26 * s, c.accent);
      // eye
      drawPolyEllipse(ctx, bx + 0.32 * s, by - 0.22 * s, 0.03 * s, 0.03 * s, 4, '#111', time, 0);
    };
  },

  biped(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // body
      drawPolyEllipse(ctx, bx, by, 0.22 * s, 0.28 * s, 6, c.primary, time, 0);
      // head
      drawPolyEllipse(ctx, bx, by - 0.38 * s, 0.22 * s, 0.20 * s, 6, c.secondary, time, 0);
      // arms
      drawPolyTri(ctx, bx - 0.22 * s, by - 0.08 * s, bx - 0.36 * s, by + 0.06 * s, bx - 0.20 * s, by + 0.04 * s, c.accent);
      drawPolyTri(ctx, bx + 0.22 * s, by - 0.08 * s, bx + 0.36 * s, by + 0.06 * s, bx + 0.20 * s, by + 0.04 * s, c.accent);
      // legs
      drawPolyEllipse(ctx, bx - 0.10 * s, by + 0.32 * s, 0.08 * s, 0.14 * s, 4, c.detail, time, 0);
      drawPolyEllipse(ctx, bx + 0.10 * s, by + 0.32 * s, 0.08 * s, 0.14 * s, 4, c.detail, time, 0);
      // ears / features
      drawPolyTri(ctx, bx - 0.18 * s, by - 0.50 * s, bx - 0.08 * s, by - 0.62 * s, bx - 0.06 * s, by - 0.46 * s, c.accent);
      drawPolyTri(ctx, bx + 0.18 * s, by - 0.50 * s, bx + 0.08 * s, by - 0.62 * s, bx + 0.06 * s, by - 0.46 * s, c.accent);
      // tail if applicable
      drawPolyTri(ctx, bx + 0.18 * s, by + 0.08 * s, bx + 0.38 * s, by - 0.06 * s, bx + 0.28 * s, by + 0.16 * s, c.accent);
      // eye
      drawPolyEllipse(ctx, bx + 0.08 * s, by - 0.38 * s, 0.03 * s, 0.03 * s, 4, '#111', time, 0);
    };
  },

  serpent(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // body segments
      const segs = [
        [bx, by, 0.18],
        [bx - 0.22 * s, by + 0.04 * s, 0.16],
        [bx + 0.20 * s, by - 0.06 * s, 0.14],
        [bx - 0.06 * s, by + 0.16 * s, 0.12],
      ];
      segs.forEach(([sx, sy, r], i) => {
        drawPolyEllipse(ctx, sx, sy, r * s, r * s, 5, i % 2 === 0 ? c.primary : c.secondary, time, 0);
      });
      // head
      drawPolyEllipse(ctx, bx + 0.24 * s, by - 0.10 * s, 0.14 * s, 0.12 * s, 5, c.accent, time, 0);
      // antennae
      drawPolyTri(ctx, bx + 0.18 * s, by - 0.18 * s, bx + 0.14 * s, by - 0.30 * s, bx + 0.22 * s, by - 0.18 * s, c.detail);
      drawPolyTri(ctx, bx + 0.30 * s, by - 0.18 * s, bx + 0.34 * s, by - 0.30 * s, bx + 0.26 * s, by - 0.18 * s, c.detail);
      // eye
      drawPolyEllipse(ctx, bx + 0.26 * s, by - 0.12 * s, 0.025 * s, 0.025 * s, 4, '#111', time, 0);
    };
  },

  bird(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // body
      drawPolyEllipse(ctx, bx, by, 0.24 * s, 0.18 * s, 6, c.primary, time, 0);
      // head
      drawPolyEllipse(ctx, bx + 0.22 * s, by - 0.16 * s, 0.16 * s, 0.14 * s, 5, c.secondary, time, 0);
      // wing L
      drawPolyTri(ctx, bx - 0.06 * s, by - 0.06 * s, bx - 0.32 * s, by - 0.26 * s, bx - 0.18 * s, by + 0.04 * s, c.accent);
      // wing R
      drawPolyTri(ctx, bx + 0.06 * s, by - 0.06 * s, bx + 0.32 * s, by - 0.26 * s, bx + 0.18 * s, by + 0.04 * s, c.detail);
      // tail
      drawPolyTri(ctx, bx - 0.20 * s, by + 0.04 * s, bx - 0.40 * s, by - 0.04 * s, bx - 0.36 * s, by + 0.10 * s, c.accent);
      // beak
      drawPolyTri(ctx, bx + 0.36 * s, by - 0.16 * s, bx + 0.46 * s, by - 0.14 * s, bx + 0.36 * s, by - 0.10 * s, '#ffcc80');
      // eye
      drawPolyEllipse(ctx, bx + 0.26 * s, by - 0.18 * s, 0.03 * s, 0.03 * s, 4, '#111', time, 0);
      // leg
      drawPolyTri(ctx, bx - 0.04 * s, by + 0.14 * s, bx - 0.04 * s, by + 0.26 * s, bx + 0.02 * s, by + 0.14 * s, '#ffcc80');
    };
  },

  blob(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // main body
      drawPolyEllipse(ctx, bx, by, 0.28 * s, 0.24 * s, 8, c.primary, time, 0);
      // top bump
      drawPolyEllipse(ctx, bx, by - 0.22 * s, 0.18 * s, 0.14 * s, 6, c.secondary, time, 0);
      // ear / tuft L
      drawPolyTri(ctx, bx - 0.16 * s, by - 0.30 * s, bx - 0.22 * s, by - 0.46 * s, bx - 0.08 * s, by - 0.34 * s, c.accent);
      // ear / tuft R
      drawPolyTri(ctx, bx + 0.16 * s, by - 0.30 * s, bx + 0.22 * s, by - 0.46 * s, bx + 0.08 * s, by - 0.34 * s, c.accent);
      // feet / base
      drawPolyEllipse(ctx, bx - 0.14 * s, by + 0.22 * s, 0.08 * s, 0.06 * s, 4, c.detail, time, 0);
      drawPolyEllipse(ctx, bx + 0.14 * s, by + 0.22 * s, 0.08 * s, 0.06 * s, 4, c.detail, time, 0);
      // eye L
      drawPolyEllipse(ctx, bx - 0.10 * s, by - 0.06 * s, 0.04 * s, 0.05 * s, 4, '#111', time, 0);
      // eye R
      drawPolyEllipse(ctx, bx + 0.10 * s, by - 0.06 * s, 0.04 * s, 0.05 * s, 4, '#111', time, 0);
      // mouth
      drawPolyTri(ctx, bx - 0.06 * s, by + 0.06 * s, bx + 0.06 * s, by + 0.06 * s, bx, by + 0.12 * s, '#c2185b');
    };
  },

  insect(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // body segments
      drawPolyEllipse(ctx, bx - 0.10 * s, by, 0.14 * s, 0.14 * s, 5, c.primary, time, 0);
      drawPolyEllipse(ctx, bx + 0.10 * s, by - 0.02 * s, 0.12 * s, 0.12 * s, 5, c.secondary, time, 0);
      // head
      drawPolyEllipse(ctx, bx + 0.24 * s, by - 0.04 * s, 0.08 * s, 0.08 * s, 4, c.accent, time, 0);
      // legs
      drawPolyTri(ctx, bx - 0.10 * s, by + 0.10 * s, bx - 0.22 * s, by + 0.22 * s, bx - 0.06 * s, by + 0.14 * s, c.detail);
      drawPolyTri(ctx, bx + 0.06 * s, by + 0.10 * s, bx + 0.18 * s, by + 0.22 * s, bx + 0.10 * s, by + 0.14 * s, c.detail);
      // antennae
      drawPolyTri(ctx, bx + 0.26 * s, by - 0.10 * s, bx + 0.30 * s, by - 0.24 * s, bx + 0.22 * s, by - 0.10 * s, c.detail);
      // mushroom / back detail
      drawPolyEllipse(ctx, bx - 0.16 * s, by - 0.08 * s, 0.10 * s, 0.06 * s, 4, c.accent, time, 0);
    };
  },

  fish(p, time, bob) {
    const c = p.colors;
    const b = bob || 0;
    return (ctx, x, y, s) => {
      const bx = x, by = y + b * s;
      // body
      drawPolyEllipse(ctx, bx, by, 0.30 * s, 0.18 * s, 7, c.primary, time, 0);
      // tail
      drawPolyTri(ctx, bx - 0.32 * s, by, bx - 0.50 * s, by - 0.14 * s, bx - 0.50 * s, by + 0.14 * s, c.accent);
      // top fin
      drawPolyTri(ctx, bx, by - 0.14 * s, bx - 0.08 * s, by - 0.28 * s, bx + 0.08 * s, by - 0.16 * s, c.secondary);
      // bottom fin
      drawPolyTri(ctx, bx + 0.04 * s, by + 0.14 * s, bx - 0.04 * s, by + 0.26 * s, bx + 0.10 * s, by + 0.16 * s, c.detail);
      // eye
      drawPolyEllipse(ctx, bx + 0.20 * s, by - 0.04 * s, 0.03 * s, 0.03 * s, 4, '#111', time, 0);
      // whisker
      drawPolyTri(ctx, bx + 0.30 * s, by + 0.02 * s, bx + 0.40 * s, by + 0.10 * s, bx + 0.32 * s, by + 0.06 * s, '#ffcc80');
    };
  },
};

export function getRenderer(pokemon, time) {
  const bob = Math.sin(time * 2.5) * 0.04;
  const builder = ARCHETYPES[pokemon.archetype || 'blob'];
  if (!builder) return () => {};
  return builder(pokemon, time, bob);
}

export function drawLowPolyPokemon(ctx, pokemon, x, y, size, time, isShiny) {
  ctx.save();
  if (isShiny) {
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur = 20;
  }
  const renderer = getRenderer(pokemon, time);
  renderer(ctx, x, y, size);
  if (isShiny) {
    // shiny sparkle overlay
    const sp = (t) => Math.abs(Math.sin(t * 3 + x));
    const sparkle = sp(time);
    if (sparkle > 0.7) {
      ctx.globalAlpha = (sparkle - 0.7) / 0.3;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x + size * 0.3, y - size * 0.4, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

export function drawPokeball(ctx, x, y, r, type, wobble) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(wobble || 0) * 0.15);
  const colors = {
    poke:  { top: '#ef5350', bot: '#ffffff', band: '#333333', btn: '#ffffff', btnRing: '#333333' },
    great: { top: '#42a5f5', bot: '#ffffff', band: '#333333', btn: '#ffffff', btnRing: '#ef5350' },
    ultra: { top: '#ffca28', bot: '#212121', band: '#333333', btn: '#ffffff', btnRing: '#42a5f5' },
    master:{ top: '#ab47bc', bot: '#ffffff', band: '#333333', btn: '#ffffff', btnRing: '#ef5350' },
  };
  const c = colors[type] || colors.poke;
  // top half
  ctx.fillStyle = c.top;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // bottom half
  ctx.fillStyle = c.bot;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // center band
  ctx.fillStyle = c.band;
  ctx.fillRect(-r, -r * 0.08, r * 2, r * 0.16);
  // button ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = c.btnRing;
  ctx.fill();
  // button
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = c.btn;
  ctx.fill();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawTerrain(ctx, w, h, time, biomeColor) {
  ctx.fillStyle = biomeColor || '#0f1a0f';
  ctx.fillRect(0, 0, w, h);
  // low poly ground
  const groundY = h * 0.72;
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const x1 = (w * i) / segments;
    const x2 = (w * (i + 1)) / segments;
    const yOff = Math.sin(i * 1.7 + time * 0.3) * 12;
    const yOff2 = Math.sin((i + 1) * 1.7 + time * 0.3) * 12;
    const shade = 20 + (i % 2) * 8;
    ctx.fillStyle = biomeColor ? adjustColor(biomeColor, shade) : `rgb(${shade},${shade + 10},${shade})`;
    ctx.beginPath();
    ctx.moveTo(x1, groundY + yOff);
    ctx.lineTo(x2, groundY + yOff2);
    ctx.lineTo(x2, h);
    ctx.lineTo(x1, h);
    ctx.closePath();
    ctx.fill();
  }
  // distant low poly mountains
  for (let m = 0; m < 3; m++) {
    const mx = w * (0.15 + m * 0.35);
    const mh = 60 + Math.sin(m * 2.3) * 30;
    ctx.fillStyle = biomeColor ? adjustColor(biomeColor, 10) : '#151515';
    ctx.beginPath();
    ctx.moveTo(mx - 80, groundY);
    ctx.lineTo(mx, groundY - mh);
    ctx.lineTo(mx + 60, groundY - mh * 0.6);
    ctx.lineTo(mx + 100, groundY);
    ctx.closePath();
    ctx.fill();
  }
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    const s = (p.size || 3) * p.life;
    // low poly star / diamond shape
    ctx.moveTo(p.x, p.y - s);
    ctx.lineTo(p.x + s * 0.6, p.y);
    ctx.lineTo(p.x, p.y + s);
    ctx.lineTo(p.x - s * 0.6, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawCatchEffect(ctx, x, y, progress, color) {
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const offset = i * 0.3;
    const p = Math.max(0, Math.min(1, (progress - offset) / 0.7));
    if (p <= 0) continue;
    const r = p * 120;
    ctx.strokeStyle = color || '#4fc3f7';
    ctx.lineWidth = 2 * (1 - p);
    ctx.globalAlpha = (1 - p) * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawStarfield(ctx, w, h, time) {
  // stars only — background is already drawn by terrain
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137.5 + time * 2) % w);
    const sy = ((i * 73.3) % h);
    const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + twinkle * 0.35})`;
    const sz = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
  }
}

export { ARCHETYPES };
