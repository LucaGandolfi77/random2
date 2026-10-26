/*
 * Canvas view for INNER CIRCLE. The engine never imports this file; every
 * value drawn here comes from a state snapshot or an event.
 */

import { TIERS, MAX_TIER } from "./roster.js";
import { drawDefaultAvatar, drawWildcardAvatar, drawStar } from "./faces.js";
import { drawCircularPhoto } from "./portrait.js";
import { WORLD } from "./engine.js";

const TAU = Math.PI * 2;
const INK = "#29232b";
const CREAM = "#fff6e7";

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function tierColor(index) {
  return TIERS[clamp(index, 0, MAX_TIER)].color;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduced = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
  const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  canvas.width = WORLD.width * dpr;
  canvas.height = WORLD.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let squad = [];
  let photos = new Map();
  let particles = [];
  let floaters = [];
  let flash = 0;
  let legendaryGlow = 0;

  function setSquad(nextSquad, nextPhotos) {
    squad = Array.isArray(nextSquad) ? nextSquad : [];
    photos = nextPhotos instanceof Map ? nextPhotos : new Map();
  }

  function makeParticle(x, y, color, opts = {}) {
    const count = opts.count || 1;
    for (let i = 0; i < count; i++) {
      if (particles.length > (reduced ? 80 : 260)) break;
      const a = opts.angle == null ? Math.random() * TAU : opts.angle + (Math.random() - 0.5) * (opts.spread || 1);
      const speed = (opts.speed || 150) * (0.45 + Math.random() * 0.85);
      particles.push({
        x: x + (Math.random() - 0.5) * (opts.spreadX || 6),
        y: y + (Math.random() - 0.5) * (opts.spreadY || 6),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (opts.lift || 25),
        g: opts.gravity == null ? 340 : opts.gravity,
        life: opts.life || (0.55 + Math.random() * 0.65),
        maxLife: opts.life || (0.55 + Math.random() * 0.65),
        size: (opts.size || 4) * (0.55 + Math.random() * 0.7),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        shape: opts.shape || "dot",
        rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 8,
        drag: opts.drag == null ? 0.985 : opts.drag,
      });
    }
  }

  function burst(x, y, color, big = false) {
    const count = reduced ? 4 : big ? 42 : 15;
    const colors = Array.isArray(color)
      ? color
      : [color, "#ffc857", "#fff6e7", "#57c7b2", "#b47cff"];
    makeParticle(x, y, colors, {
      count,
      speed: big ? 290 : 175,
      lift: big ? 80 : 24,
      size: big ? 6.5 : 4.2,
      life: big ? 1.25 : 0.75,
      shape: big ? "mix" : "dot",
      gravity: big ? 250 : 410,
    });
  }

  function floater(x, y, text, color, size = 18) {
    floaters.push({
      x, y, text, color,
      size,
      life: reduced ? 0.6 : 1.1,
      maxLife: reduced ? 0.6 : 1.1,
      vy: -42,
    });
  }

  function processEvents(events, state) {
    for (const ev of events) {
      if (ev.type === "drop") {
        makeParticle(ev.x, ev.y + 10, ["#fff6e7", "#d9cdbb"], {
          count: reduced ? 2 : 6,
          speed: 65,
          lift: -10,
          size: 2.6,
          gravity: 280,
          life: 0.4,
        });
      } else if (ev.type === "merge") {
        burst(ev.x, ev.y, tierColor(ev.newTier), ev.newTier >= 7);
        floater(ev.x, ev.y - 10, "+" + ev.score, TIERS[ev.newTier].color, ev.combo > 1 ? 22 : 17);
        if (ev.combo > 1) {
          floater(ev.x, ev.y - 34, "x" + ev.combo, INK, 25);
        }
        if (ev.newTier >= 8 && !reduced) flash = Math.max(flash, 0.1);
      } else if (ev.type === "legendary") {
        legendaryGlow = 1.4;
        flash = 0.5;
        burst(ev.x, ev.y, ["#ff6b6b", "#ffc857", "#57c7b2", "#b47cff", "#fff6e7"], true);
        floater(ev.x, ev.y - 28, "THE WHOLE CREW!", INK, 28);
        floater(ev.x, ev.y + 4, "+" + ev.score, "#b13874", 24);
      } else if (ev.type === "power") {
        if (ev.name === "swap") {
          floater(196, 50, "SWITCH!", "#6c7bff", 20);
          burst(198, 54, ["#6c7bff", "#fff6e7"], false);
        } else if (ev.name === "hug") {
          floater(WORLD.width / 2, 180, "GROUP HUG!", "#ef5a5a", 24);
          for (let i = 0; i < (reduced ? 3 : 8); i++) {
            makeParticle(50 + Math.random() * 300, 220 + Math.random() * 300, "#ffc857", {
              count: 1,
              speed: 100,
              size: 3.5,
              gravity: -20,
              life: 0.7,
            });
          }
        } else if (ev.name === "plus") {
          floater(196, 52, "PLUS ONE", "#b47cff", 20);
          burst(198, 54, ["#ff6b6b", "#ffc857", "#7bd88f", "#57b8ff", "#b47cff"], false);
        }
      } else if (ev.type === "danger" && ev.active) {
        floater(WORLD.width / 2, WORLD.dangerY + 26, "TOO FULL!", "#d83f54", 18);
      } else if (ev.type === "gameover") {
        flash = 0.22;
      }
    }
  }

  function drawBackground(t) {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);

    const bg = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    bg.addColorStop(0, "#fbf2e3");
    bg.addColorStop(0.55, "#f4e7d4");
    bg.addColorStop(1, "#efe0c9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    /* paper grain */
    for (let i = 0; i < 42; i++) {
      const x = ((i * 97 + 31) % WORLD.width);
      const y = ((i * 173 + 59) % WORLD.height);
      ctx.fillStyle = i % 3 === 0 ? "rgba(34,27,38,.035)" : "rgba(255,255,255,.2)";
      ctx.fillRect(x, y, 1.4, 1.4);
    }

    /* bunting behind the jar */
    const colors = ["#ff6b6b", "#ffc857", "#7bd88f", "#57b8ff", "#b47cff"];
    ctx.strokeStyle = "rgba(41,35,43,.25)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.quadraticCurveTo(200, 60, 382, 18);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      const x = 18 + u * 364;
      const y = 18 + Math.sin(u * Math.PI) * 26;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(x - 13, y);
      ctx.lineTo(x + 13, y);
      ctx.lineTo(x, y + 24 + (i % 3) * 3);
      ctx.closePath();
      ctx.fill();
    }

    /* floating party specks */
    for (let i = 0; i < 8; i++) {
      const a = t * 0.2 + i * 1.9;
      const x = 200 + Math.cos(a) * (150 + (i % 3) * 22);
      const y = 300 + Math.sin(a * 1.3) * 190;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 2), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* table */
    ctx.fillStyle = "rgba(147,104,77,.13)";
    ctx.fillRect(0, 578, WORLD.width, 22);
    ctx.strokeStyle = "rgba(41,35,43,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 578);
    ctx.lineTo(WORLD.width - 14, 578);
    ctx.stroke();

    /* jar shadow */
    const shadow = ctx.createRadialGradient(200, 578, 20, 200, 578, 195);
    shadow.addColorStop(0, "rgba(61,42,33,.26)");
    shadow.addColorStop(1, "rgba(61,42,33,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(200, 580, 190, 19, 0, 0, TAU);
    ctx.fill();
  }

  function jarPath() {
    const left = WORLD.wall;
    const right = WORLD.width - WORLD.wall;
    const top = 88;
    const bottom = WORLD.floor;
    const radius = 44;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom - radius);
    ctx.quadraticCurveTo(left, bottom, left + radius, bottom);
    ctx.lineTo(right - radius, bottom);
    ctx.quadraticCurveTo(right, bottom, right, bottom - radius);
    ctx.lineTo(right, top);
  }

  function drawJar(state, t) {
    const left = WORLD.wall;
    const right = WORLD.width - WORLD.wall;

    /* glass body */
    ctx.save();
    jarPath();
    ctx.closePath();
    const glass = ctx.createLinearGradient(left, 90, right, WORLD.floor);
    glass.addColorStop(0, "rgba(255,255,255,.44)");
    glass.addColorStop(0.45, "rgba(255,255,255,.20)");
    glass.addColorStop(1, "rgba(255,250,240,.34)");
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = "rgba(41,35,43,.5)";
    ctx.lineWidth = 3;
    ctx.stroke();

    /* inner work area tint */
    ctx.save();
    ctx.clip();
    const well = ctx.createRadialGradient(200, 460, 20, 200, 460, 260);
    well.addColorStop(0, "rgba(255,255,255,.18)");
    well.addColorStop(1, "rgba(193,165,135,.12)");
    ctx.fillStyle = well;
    ctx.fillRect(left, 88, right - left, WORLD.floor - 88);
    ctx.restore();

    /* rim */
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(41,35,43,.62)";
    ctx.beginPath();
    ctx.moveTo(left - 5, 88);
    ctx.quadraticCurveTo(200, 102, right + 5, 88);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.56)";
    ctx.beginPath();
    ctx.moveTo(left - 5, 85);
    ctx.quadraticCurveTo(200, 98, right + 5, 85);
    ctx.stroke();

    /* reflections */
    ctx.strokeStyle = "rgba(255,255,255,.48)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(left + 17, 144);
    ctx.lineTo(left + 17, 274);
    ctx.moveTo(right - 17, 180);
    ctx.lineTo(right - 17, 420);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.3)";
    ctx.beginPath();
    ctx.moveTo(left + 28, 148);
    ctx.lineTo(left + 28, 240);
    ctx.stroke();

    /* sticky label */
    ctx.save();
    ctx.translate(79, 106);
    ctx.rotate(-0.09);
    ctx.fillStyle = "rgba(255,246,231,.9)";
    roundRect(ctx, -38, -10, 76, 22, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(41,35,43,.65)";
    ctx.font = '700 9px ui-rounded, "Trebuchet MS", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("THE CIRCLE", 0, 1);
    ctx.restore();

    /* danger line */
    const dangerPulse = state.danger > 0 ? 0.35 + Math.sin(t * 11) * 0.18 + state.danger * 0.4 : 0.22;
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = state.dangerActive ? 2.5 : 1.4;
    ctx.strokeStyle = state.dangerActive
      ? `rgba(216,63,84,${clamp(dangerPulse, 0, 0.95)})`
      : "rgba(216,63,84,.22)";
    ctx.beginPath();
    ctx.moveTo(left + 8, WORLD.dangerY);
    ctx.lineTo(right - 8, WORLD.dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.dangerActive) {
      ctx.fillStyle = "rgba(216,63,84,.1)";
      ctx.fillRect(left, 90, right - left, WORLD.dangerY - 90);
      ctx.fillStyle = "rgba(164,33,55,.8)";
      ctx.font = '800 9px ui-rounded, "Trebuchet MS", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText("TOO FULL", left + 14, WORLD.dangerY - 8);
    }
    ctx.restore();
    ctx.lineCap = "butt";
    ctx.restore();
  }

  function tierPattern(tierIndex, cx, cy, r, t) {
    const tier = TIERS[tierIndex];
    if (!tier) return;
    ctx.save();
    ctx.strokeStyle = tier.color;
    ctx.fillStyle = tier.color;
    ctx.lineWidth = Math.max(1.6, r * 0.045);
    const ringR = r - 1.2;
    if (tier.ring === "solid") {
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, TAU); ctx.stroke();
    } else if (tier.ring === "dots") {
      const n = Math.max(8, Math.round(r * 0.72));
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + t * 0.06;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, Math.max(1.2, r * 0.034), 0, TAU);
        ctx.fill();
      }
    } else if (tier.ring === "dash") {
      ctx.setLineDash([Math.max(3, r * 0.28), Math.max(3, r * 0.18)]);
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    } else if (tier.ring === "double") {
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, TAU); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r * 0.022);
      ctx.beginPath(); ctx.arc(cx, cy, ringR - Math.max(3, r * 0.09), 0, TAU); ctx.stroke();
    } else if (tier.ring === "wave") {
      const n = Math.max(8, Math.round(r * 0.5));
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const x = cx + Math.cos(a) * ringR;
        const y = cy + Math.sin(a) * ringR;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.4, r * 0.045), a, a + Math.PI);
        ctx.stroke();
      }
    } else if (tier.ring === "stars") {
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, TAU); ctx.stroke();
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + t * 0.08;
        drawStar(ctx, cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, Math.max(2, r * 0.065));
        ctx.fill();
      }
    } else if (tier.ring === "checker") {
      const n = 18;
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const a0 = i / n * TAU;
        const a1 = (i + 1) / n * TAU;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, a0, a1);
        ctx.stroke();
      }
    } else if (tier.ring === "sun") {
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const len = i % 2 ? r * 0.06 : r * 0.12;
        ctx.lineWidth = Math.max(1.2, r * 0.026);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (ringR - len), cy + Math.sin(a) * (ringR - len));
        ctx.lineTo(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR);
        ctx.stroke();
      }
    } else {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        drawStar(ctx, cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, Math.max(1.8, r * 0.075), 6, 0.4);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawDiscBody(cx, cy, radius, tierIndex, t, alpha = 1) {
    const tier = TIERS[tierIndex] || TIERS[0];
    if (alpha < 1) ctx.globalAlpha = alpha;

    /* contact shadow */
    ctx.fillStyle = "rgba(54,36,29,.13)";
    ctx.beginPath();
    ctx.ellipse(cx + 1.5, cy + radius * 0.9, radius * 0.82, radius * 0.2, 0, 0, TAU);
    ctx.fill();

    /* sticker paper edge */
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(41,35,43,.32)";
    ctx.lineWidth = Math.max(1.2, radius * 0.035);
    ctx.stroke();

    const faceRadius = Math.max(2, radius - Math.max(3, radius * 0.075));
    const img = photos.get(tierIndex);
    const drawn = img ? drawCircularPhoto(ctx, img, cx, cy, faceRadius) : false;
    if (!drawn) {
      drawDefaultAvatar(ctx, tierIndex, cx, cy, faceRadius, squad[tierIndex] && squad[tierIndex].name);
    }

    /* subtle glossy arc */
    ctx.strokeStyle = "rgba(255,255,255,.36)";
    ctx.lineWidth = Math.max(1.2, radius * 0.04);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.78, -2.45, -1.65);
    ctx.stroke();

    tierPattern(tierIndex, cx, cy, radius, t);

    /* little number tab on large-enough discs */
    if (radius > 28) {
      const bx = cx + radius * 0.68;
      const by = cy + radius * 0.7;
      const br = Math.max(7, radius * 0.14);
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.arc(bx, by, br + 1.8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(41,35,43,.24)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `800 ${Math.max(7, Math.round(br * 1.15))}px ui-rounded, "Trebuchet MS", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(tierIndex + 1), bx, by + 0.5);
    }

    if (alpha < 1) ctx.globalAlpha = 1;
  }

  function drawWildcard(cx, cy, radius, t) {
    const rainbow = ["#ff6b6b", "#ffc857", "#7bd88f", "#57b8ff", "#b47cff"];
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(54,36,29,.13)";
    ctx.beginPath();
    ctx.ellipse(cx + 1.5, cy + radius * 0.9, radius * 0.82, radius * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = CREAM;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(41,35,43,.32)";
    ctx.lineWidth = Math.max(1.2, radius * 0.035);
    ctx.stroke();
    drawWildcardAvatar(ctx, cx, cy, Math.max(2, radius - Math.max(3, radius * 0.075)));
    const g = ctx.createConicGradient ? ctx.createConicGradient(t * 0.6, cx, cy) : null;
    if (g) {
      g.addColorStop(0, "#ff6b6b");
      g.addColorStop(0.2, "#ffc857");
      g.addColorStop(0.4, "#7bd88f");
      g.addColorStop(0.6, "#57b8ff");
      g.addColorStop(0.8, "#b47cff");
      g.addColorStop(1, "#ff6b6b");
      ctx.strokeStyle = g;
    } else {
      ctx.strokeStyle = rainbow[(Math.floor(t * 3) % rainbow.length)];
    }
    ctx.lineWidth = Math.max(2.2, radius * 0.1);
    ctx.beginPath(); ctx.arc(cx, cy, radius - 1, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function drawHeld(state, t) {
    if (state.status === "over") return;
    const isWild = state.heldWildcard;
    const tierIndex = isWild ? 0 : state.currentTier;
    const radius = isWild ? 24 : TIERS[tierIndex].radius;
    const bob = reduced ? 0 : Math.sin(t * 4.2) * 1.4;
    const x = state.aimX;
    const y = WORLD.spawnY + bob;

    /* aim guide */
    const color = isWild ? "#b47cff" : TIERS[tierIndex].color;
    ctx.save();
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = "rgba(41,35,43,.22)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y + radius + 6);
    ctx.lineTo(x, WORLD.floor - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(41,35,43,.17)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(x, WORLD.floor - 3, Math.max(10, radius * 0.65), 3.5, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.98;
    if (isWild) drawWildcard(x, y, radius, t);
    else drawDiscBody(x, y, radius, tierIndex, t);
    ctx.restore();

    /* pointer nub */
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - radius - 9);
    ctx.lineTo(x + 5, y - radius - 9);
    ctx.lineTo(x, y - radius - 2);
    ctx.closePath();
    ctx.fill();
  }

  function drawParticles() {
    for (const p of particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect" || p.shape === "mix" && p.size > 5) {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === "star") {
        drawStar(ctx, 0, 0, p.size, 5, 0.42);
        ctx.fill();
      } else if (p.shape === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, TAU);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawFloaters() {
    for (const f of floaters) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = easeOut(a);
      ctx.font = `900 ${f.size}px ui-rounded, "Trebuchet MS", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255,246,231,.9)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawDangerVignette(state, t) {
    if (!state.dangerActive) return;
    const pulse = 0.35 + Math.sin(t * 8) * 0.12;
    const g = ctx.createRadialGradient(200, 300, 80, 200, 300, 330);
    g.addColorStop(0, "rgba(216,63,84,0)");
    g.addColorStop(1, `rgba(216,63,84,${clamp(pulse * state.danger, 0, 0.45)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  function drawOverlay(state, t) {
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,246,231,${clamp(flash, 0, 0.4)})`;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    if (legendaryGlow > 0) {
      const g = ctx.createRadialGradient(200, 320, 20, 200, 320, 300);
      g.addColorStop(0, `rgba(255,200,87,${clamp(legendaryGlow * 0.18, 0, 0.25)})`);
      g.addColorStop(1, "rgba(255,200,87,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    if (state.status === "over") {
      ctx.fillStyle = "rgba(41,35,43,.16)";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.97;
      if (f.life <= 0) floaters.splice(i, 1);
    }
    flash = Math.max(0, flash - dt * 1.3);
    legendaryGlow = Math.max(0, legendaryGlow - dt * 0.6);
  }

  function frame(state, events, dt, now) {
    update(dt || 0);
    processEvents(events || [], state);
    const t = now || 0;

    drawBackground(t);
    drawJar(state, t);

    /* gentle whole-board shake for Group Hug */
    const shake = state.shake > 0 && !reduced ? Math.sin(t * 30) * state.shake * 7 : 0;
    ctx.save();
    ctx.translate(shake, 0);

    const discs = state.discs.slice().sort((a, b) => a.y - b.y);
    for (const d of discs) {
      if (d.wildcard) drawWildcard(d.x, d.y, d.radius, t);
      else drawDiscBody(d.x, d.y, d.radius, d.tier, t);
    }

    drawHeld(state, t);
    drawParticles();
    drawFloaters();
    ctx.restore();

    drawDangerVignette(state, t);
    drawOverlay(state, t);
  }

  return { setSquad, frame };
}
