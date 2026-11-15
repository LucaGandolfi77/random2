import { TAU, hexA, ellipse, line, glow } from "./art-core.js";

export const POSES = {
  stand: {
    lean: 0, hipY: -50, shoulderY: -82, headY: -91,
    knees: [[-10, -26], [10, -26]], feet: [[-12, 0], [13, 0]],
    elbows: [[-20, -62], [20, -62]], hands: [[-22, -44], [22, -44]]
  },
  run: {
    lean: -7, hipY: -48, shoulderY: -80, headY: -89,
    knees: [[-18, -25], [16, -30]], feet: [[-26, -2], [22, -6]],
    elbows: [[-24, -60], [20, -64]], hands: [[-14, -74], [28, -54]]
  },
  cast: {
    lean: -2, hipY: -49, shoulderY: -81, headY: -90,
    knees: [[-14, -25], [14, -25]], feet: [[-19, 0], [18, 0]],
    elbows: [[-24, -60], [20, -68]], hands: [[-28, -46], [26, -88]]
  },
  guard: {
    lean: 3, hipY: -44, shoulderY: -76, headY: -85,
    knees: [[-18, -22], [18, -22]], feet: [[-22, 0], [22, 0]],
    elbows: [[-20, -58], [20, -58]], hands: [[-8, -66], [10, -66]]
  },
  punch: {
    lean: -10, hipY: -48, shoulderY: -80, headY: -89,
    knees: [[-16, -24], [14, -28]], feet: [[-24, 0], [20, -3]],
    elbows: [[-22, -58], [22, -60]], hands: [[-12, -70], [38, -74]]
  },
  kneel: {
    lean: 10, hipY: -36, shoulderY: -64, headY: -73,
    knees: [[-12, -10], [14, -20]], feet: [[-14, 0], [22, 0]],
    elbows: [[-20, -48], [18, -48]], hands: [[-12, -34], [10, -30]]
  },
  loom: {
    lean: 0, hipY: -52, shoulderY: -84, headY: -93,
    knees: [[-9, -26], [9, -26]], feet: [[-12, 0], [12, 0]],
    elbows: [[-22, -64], [22, -64]], hands: [[-26, -44], [26, -44]]
  },
  point: {
    lean: -4, hipY: -50, shoulderY: -82, headY: -91,
    knees: [[-12, -25], [12, -25]], feet: [[-16, 0], [16, 0]],
    elbows: [[-22, -60], [22, -62]], hands: [[-24, -46], [36, -78]]
  },
  reach: {
    lean: -2, hipY: -50, shoulderY: -82, headY: -91,
    knees: [[-12, -25], [12, -25]], feet: [[-16, 0], [16, 0]],
    elbows: [[-22, -62], [18, -68]], hands: [[-24, -48], [22, -96]]
  },
  carry: {
    lean: 4, hipY: -46, shoulderY: -78, headY: -87,
    knees: [[-14, -24], [14, -24]], feet: [[-18, 0], [18, 0]],
    elbows: [[-22, -58], [22, -58]], hands: [[-10, -64], [12, -64]]
  },
  sit: {
    lean: 0, hipY: -28, shoulderY: -60, headY: -69,
    knees: [[-17, -20], [17, -20]], feet: [[-24, -2], [24, -2]],
    elbows: [[-22, -46], [22, -46]], hands: [[-18, -30], [16, -30]]
  },
  lie: {
    lean: 0, hipY: -20, shoulderY: -30, headY: -38,
    knees: [[-12, -18], [12, -18]], feet: [[-20, -18], [20, -18]],
    elbows: [[-16, -28], [16, -28]], hands: [[-14, -24], [14, -24]]
  }
};

export const POSES_LIST = Object.keys(POSES);

function bone(ctx, ax, ay, bx, by, width, color, ink) {
  ctx.lineCap = "round";
  ctx.strokeStyle = ink;
  ctx.lineWidth = width + 4;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function limb(ctx, a, b, c, width, color, ink) {
  bone(ctx, a[0], a[1], b[0], b[1], width, color, ink);
  bone(ctx, b[0], b[1], c[0], c[1], width * 0.9, color, ink);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(c[0], c[1], width * 0.66, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c[0], c[1], width * 0.46, 0, TAU);
  ctx.fill();
}

function torso(ctx, u, p, cfg, ink) {
  const sh = 16 * u;
  const hip = 9 * u;
  const sy = p.shoulderY * u;
  const hy = p.hipY * u;
  ctx.beginPath();
  ctx.moveTo(-sh, sy + 2 * u);
  ctx.quadraticCurveTo(0, sy - 4 * u, sh, sy + 2 * u);
  ctx.lineTo(hip, hy);
  ctx.quadraticCurveTo(0, hy + 4 * u, -hip, hy);
  ctx.closePath();
  ctx.fillStyle = cfg.suit;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3.4 * u;
  ctx.stroke();

  ctx.strokeStyle = hexA(cfg.accent || cfg.suit2 || cfg.suit, 0.8);
  ctx.lineWidth = 1.8 * u;
  ctx.beginPath();
  ctx.moveTo(-8 * u, sy + 11 * u);
  ctx.lineTo(1 * u, hy - 6 * u);
  ctx.stroke();

  if (cfg.belt) {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(-hip, hy - 4 * u, hip * 2, 2.4 * u);
  }
}

function drawCape(ctx, u, p, cfg, ink) {
  const sy = p.shoulderY * u;
  ctx.beginPath();
  ctx.moveTo(-15 * u, sy + 2 * u);
  ctx.quadraticCurveTo(-31 * u, sy + 20 * u, -27 * u, -12 * u);
  ctx.quadraticCurveTo(-14 * u, -24 * u, 0, -18 * u);
  ctx.quadraticCurveTo(14 * u, -25 * u, 25 * u, -10 * u);
  ctx.quadraticCurveTo(27 * u, sy + 18 * u, 15 * u, sy + 2 * u);
  ctx.closePath();
  ctx.fillStyle = cfg.capeColor || hexA(cfg.accent || cfg.suit2 || cfg.suit, 0.2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.8 * u;
  ctx.stroke();
  ctx.strokeStyle = hexA(cfg.accent || cfg.suit2 || cfg.suit, 0.55);
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.moveTo(-18 * u, sy + 6 * u);
  ctx.quadraticCurveTo(-22 * u, -24 * u, -8 * u, -16 * u);
  ctx.stroke();
}

function drawCoat(ctx, u, p, cfg, ink) {
  const sy = p.shoulderY * u;
  ctx.beginPath();
  ctx.moveTo(-16 * u, sy);
  ctx.lineTo(-25 * u, -6 * u);
  ctx.lineTo(-16 * u, -15 * u);
  ctx.lineTo(-8 * u, -5 * u);
  ctx.lineTo(0, -13 * u);
  ctx.lineTo(8 * u, -5 * u);
  ctx.lineTo(16 * u, -15 * u);
  ctx.lineTo(25 * u, -6 * u);
  ctx.lineTo(16 * u, sy);
  ctx.closePath();
  ctx.fillStyle = cfg.suit2 || cfg.suit;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.6 * u;
  ctx.stroke();
}

function drawHead(ctx, u, p, cfg, ink) {
  const hy = p.headY * u;
  const r = 8.5 * u;
  line(ctx, 0, hy + r * 0.7, 0, (p.shoulderY + 2) * u, ink, 5 * u);

  ctx.beginPath();
  ctx.arc(0, hy, r, 0, TAU);
  ctx.fillStyle = cfg.face || cfg.skin || cfg.suit;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3 * u;
  ctx.stroke();

  if (cfg.headStyle === "bob") {
    ctx.fillStyle = cfg.hair || "#241715";
    ctx.beginPath();
    ctx.arc(0, hy - r * 0.16, r * 1.02, Math.PI * 0.85, Math.PI * 2.18);
    ctx.quadraticCurveTo(r * 1.35, hy + r * 0.95, r * 0.72, hy + r * 0.62);
    ctx.quadraticCurveTo(r * 0.15, hy + r * 0.1, -r * 0.55, hy + r * 0.45);
    ctx.quadraticCurveTo(-r * 1.28, hy + r * 0.96, -r * 1.02, hy + r * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (cfg.headStyle === "short") {
    ctx.fillStyle = cfg.hair || "#15110f";
    ctx.beginPath();
    ctx.arc(0, hy - r * 0.08, r * 1.01, Math.PI * 0.82, Math.PI * 2.14);
    ctx.quadraticCurveTo(r * 1.1, hy + r * 0.3, r * 0.55, hy - r * 0.2);
    ctx.quadraticCurveTo(0, hy - r * 0.45, -r * 0.6, hy - r * 0.1);
    ctx.quadraticCurveTo(-r * 1.1, hy + r * 0.3, -r * 1.01, hy - r * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (cfg.headStyle === "spiky") {
    ctx.fillStyle = cfg.hair || "#10151f";
    ctx.beginPath();
    ctx.moveTo(-r, hy - r * 0.2);
    ctx.lineTo(-r * 0.72, hy - r * 1.18);
    ctx.lineTo(-r * 0.22, hy - r * 0.62);
    ctx.lineTo(0, hy - r * 1.34);
    ctx.lineTo(r * 0.24, hy - r * 0.6);
    ctx.lineTo(r * 0.78, hy - r * 1.16);
    ctx.lineTo(r, hy - r * 0.12);
    ctx.quadraticCurveTo(0, hy - r * 0.5, -r, hy - r * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (cfg.headStyle === "bun") {
    ctx.fillStyle = cfg.hair || "#3a2a24";
    ctx.beginPath();
    ctx.arc(0, hy - r * 0.1, r * 1.01, Math.PI * 0.82, Math.PI * 2.14);
    ctx.quadraticCurveTo(r * 1.1, hy + r * 0.28, r * 0.5, hy - r * 0.25);
    ctx.quadraticCurveTo(0, hy - r * 0.45, -r * 0.6, hy - r * 0.1);
    ctx.quadraticCurveTo(-r * 1.1, hy + r * 0.3, -r * 1.01, hy - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 1.02, hy - r * 0.55, r * 0.48, 0, TAU);
    ctx.fill();
  } else if (cfg.headStyle === "hat") {
    ctx.fillStyle = cfg.hat || cfg.headStyleColor || cfg.suit2 || "#3e4148";
    ctx.beginPath();
    ctx.ellipse(0, hy - r * 0.48, r * 1.7, r * 0.28, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(-r * 0.72, hy - r * 1.14, r * 1.44, r * 0.78);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.2 * u;
    ctx.beginPath();
    ctx.ellipse(0, hy - r * 0.48, r * 1.7, r * 0.28, 0, 0, TAU);
    ctx.stroke();
  }

  if (cfg.eyes === "glow") {
    ctx.fillStyle = hexA(cfg.accent || "#ffe7a0", 0.92);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2 + u;
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, hy + r * 0.02, r * 0.24, r * 0.16, -0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.38, hy + r * 0.02, r * 0.24, r * 0.16, 0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hexA(cfg.accent || "#ffe7a0", 0.9);
    ctx.shadowColor = cfg.accent || "#ffe7a0";
    ctx.shadowBlur = 12 * u;
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, hy + r * 0.02, r * 0.18, r * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.38, hy + r * 0.02, r * 0.18, r * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (cfg.eyes === "white") {
    ctx.fillStyle = "#f4f0e8";
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, hy + r * 0.02, r * 0.22, r * 0.09, -0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.35, hy + r * 0.02, r * 0.22, r * 0.09, 0.3, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hexA(cfg.accent || "#b9c0ff", 0.9);
    ctx.shadowColor = cfg.accent || "#b9c0ff";
    ctx.shadowBlur = 14 * u;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, hy + r * 0.02, r * 0.13, r * 0.05, -0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.35, hy + r * 0.02, r * 0.13, r * 0.05, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (cfg.eyes === "goggles") {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, hy - r * 0.02, r * 0.34, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.4, hy - r * 0.02, r * 0.34, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, hy - r * 0.02);
    ctx.lineTo(r * 0.06, hy - r * 0.02);
    ctx.stroke();
    ctx.fillStyle = hexA(cfg.accent, 0.75);
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, hy - r * 0.02, r * 0.22, r * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.4, hy - r * 0.02, r * 0.22, r * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hexA(cfg.accent, 0.8);
    ctx.shadowColor = cfg.accent;
    ctx.shadowBlur = 12 * u;
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, hy - r * 0.02, r * 0.14, r * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.4, hy - r * 0.02, r * 0.14, r * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (cfg.eyes === "civil") {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(-r * 0.32, hy, r * 0.08, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.32, hy, r * 0.08, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.2 * u;
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, hy + r * 0.42);
    ctx.quadraticCurveTo(0, hy + r * 0.5, r * 0.18, hy + r * 0.42);
    ctx.stroke();
  }
}

function rimLight(ctx, u, p, cfg, theme) {
  const color = cfg.accent || theme.amber;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.78;
  ctx.lineWidth = 2.1 * u;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * u;
  ctx.beginPath();
  ctx.arc(0, p.headY * u, 8.5 * u, -0.55, 1.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14 * u, (p.shoulderY + 5) * u);
  ctx.quadraticCurveTo(18 * u, (p.hipY - 18) * u, 8 * u, (p.hipY - 2) * u);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(18 * u, p.elbows[1][1] * u);
  ctx.lineTo(p.hands[1][0] * u, p.hands[1][1] * u);
  ctx.stroke();
  ctx.restore();
}

function figure(ctx, x, y, s, cfg, theme) {
  const H = 430 * (s || 1);
  const u = H / 100;
  const p = POSES[cfg.pose] || POSES.stand;
  const ink = cfg.ink || theme.ink;
  ctx.save();
  ctx.translate(x, y);
  if (cfg.flip) ctx.scale(-1, 1);
  ctx.rotate(((p.lean || 0) * Math.PI) / 180);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (cfg.aura) glow(ctx, 0, -58 * u, 88 * u, cfg.aura, 0.3);
  if (!cfg.noShadow) {
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ellipse(ctx, 0, 0, 28 * u, 7 * u);
  }

  if (cfg.behind) cfg.behind(ctx, u, p);
  if (cfg.coat) drawCoat(ctx, u, p, cfg, ink);
  if (cfg.cape) drawCape(ctx, u, p, cfg, ink);

  const legW = 8.5 * u;
  const armW = 6.5 * u;
  limb(ctx, [-7 * u, p.hipY * u], [p.knees[0][0] * u, p.knees[0][1] * u], [p.feet[0][0] * u, p.feet[0][1] * u], legW, cfg.suit2 || cfg.suit, ink);
  limb(ctx, [-15 * u, (p.shoulderY + 2) * u], [p.elbows[0][0] * u, p.elbows[0][1] * u], [p.hands[0][0] * u, p.hands[0][1] * u], armW, cfg.suit2 || cfg.suit, ink);
  torso(ctx, u, p, cfg, ink);
  limb(ctx, [7 * u, p.hipY * u], [p.knees[1][0] * u, p.knees[1][1] * u], [p.feet[1][0] * u, p.feet[1][1] * u], legW, cfg.suit || cfg.suit2, ink);
  limb(ctx, [15 * u, (p.shoulderY + 2) * u], [p.elbows[1][0] * u, p.elbows[1][1] * u], [p.hands[1][0] * u, p.hands[1][1] * u], armW, cfg.suit || cfg.suit2, ink);
  drawHead(ctx, u, p, cfg, ink);
  if (cfg.front) cfg.front(ctx, u, p);
  rimLight(ctx, u, p, cfg, theme);
  ctx.restore();
}

function glowHands(ctx, u, p, color) {
  for (const [x, y] of p.hands) {
    glow(ctx, x * u, y * u, 26 * u, color, 0.42);
    ctx.fillStyle = hexA(color, 0.85);
    ctx.beginPath();
    ctx.arc(x * u, y * u, 2.4 * u, 0, TAU);
    ctx.fill();
  }
}

function lightOrb(ctx, u, p) {
  const [x, y] = p.hands[1];
  glow(ctx, x * u, y * u, 48 * u, "#ffe7a0", 0.55);
  ctx.fillStyle = "#fff8d8";
  ctx.beginPath();
  ctx.arc(x * u, y * u, 4.6 * u, 0, TAU);
  ctx.fill();
}

function lightningArcs(ctx, u, p, color, alpha) {
  ctx.save();
  ctx.strokeStyle = hexA(color, alpha);
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 * u;
  ctx.lineWidth = 1.6 * u;
  const paths = [
    [[-26, -62], [-34, -52], [-27, -44], [-35, -34]],
    [[26, -62], [34, -52], [28, -44], [36, -34]],
    [[-18, -10], [-26, -4], [-19, 2]],
    [[18, -8], [26, -2], [20, 4]]
  ];
  for (const path of paths) {
    ctx.beginPath();
    path.forEach(([x, y], i) => (i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u)));
    ctx.stroke();
  }
  ctx.restore();
}

function shield(ctx, u, p, color) {
  const cx = 20 * u;
  const cy = (p.shoulderY + 4) * u;
  const r = 23 * u;
  ctx.save();
  const points = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = hexA(color, 0.16);
  ctx.fill();
  ctx.strokeStyle = hexA(color, 0.9);
  ctx.lineWidth = 2.2 * u;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 * u;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexA(color, 0.4);
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    ctx.moveTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

function smokeTendrils(ctx, u, p) {
  ctx.save();
  ctx.strokeStyle = "rgba(120,130,180,.18)";
  ctx.lineWidth = 3 * u;
  ctx.shadowColor = "rgba(120,130,180,.3)";
  ctx.shadowBlur = 8 * u;
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 12 * u;
    const y = -20 * u;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 14 * u, y - 28 * u, x + 18 * u, y - 48 * u, x - 4 * u, y - 72 * u);
    ctx.stroke();
  }
  ctx.restore();
}

function highCollar(ctx, u, p) {
  const sy = (p.shoulderY + 2) * u;
  ctx.fillStyle = "rgba(7,9,16,.95)";
  ctx.beginPath();
  ctx.moveTo(-17 * u, sy + 2 * u);
  ctx.lineTo(-26 * u, (p.headY + 2) * u);
  ctx.lineTo(-6 * u, (p.headY + 12) * u);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17 * u, sy + 2 * u);
  ctx.lineTo(26 * u, (p.headY + 2) * u);
  ctx.lineTo(6 * u, (p.headY + 12) * u);
  ctx.closePath();
  ctx.fill();
}

function coatLapels(ctx, u, p) {
  ctx.strokeStyle = "rgba(160,170,210,.18)";
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.moveTo(-4 * u, (p.shoulderY + 8) * u);
  ctx.lineTo(-10 * u, (p.hipY - 2) * u);
  ctx.moveTo(4 * u, (p.shoulderY + 8) * u);
  ctx.lineTo(10 * u, (p.hipY - 2) * u);
  ctx.stroke();
}

function flashlight(ctx, u, p) {
  const [x, y] = p.hands[1];
  ctx.save();
  ctx.translate(x * u, y * u);
  ctx.fillStyle = "#1b1c22";
  ctx.fillRect(-2 * u, -2 * u, 8 * u, 4 * u);
  ctx.fillStyle = "#ffe7a0";
  ctx.beginPath();
  ctx.arc(6 * u, 0, 2.2 * u, 0, TAU);
  ctx.fill();
  glow(ctx, 6 * u, 0, 22 * u, "#ffe7a0", 0.4);
  ctx.restore();
}

function drawLuce(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#e7dcc4", suit2: "#b8893e", skin: "#d2a879", hair: "#2a1a18",
    accent: "#ffe7a0", aura: "#ffd97a",
    cape: true, capeColor: "rgba(244,211,94,.20)",
    headStyle: "bob", eyes: "glow",
    front(c, u, p) {
      glowHands(c, u, p, "#ffe7a0");
      if (pose === "cast" || pose === "reach") lightOrb(c, u, p);
    }
  }, theme);
}

function drawVolt(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#17324d", suit2: "#0b1929", skin: "#c99a72", hair: "#10151f",
    accent: "#66e0ff", aura: "#3fd0ff",
    headStyle: "spiky", eyes: "goggles",
    behind(c, u, p) { lightningArcs(c, u, p, "#66e0ff", 0.35); },
    front(c, u, p) {
      lightningArcs(c, u, p, "#9ff0ff", 0.85);
      glowHands(c, u, p, "#9ff0ff");
    }
  }, theme);
}

function drawMuro(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#273b35", suit2: "#17251f", skin: "#b98965", hair: "#15110f",
    accent: "#7ef0c8", aura: "#4fd8b0",
    headStyle: "short", eyes: "glow",
    front(c, u, p) {
      if (pose === "guard" || pose === "cast") shield(c, u, p, "#7ef0c8");
      glowHands(c, u, p, "#7ef0c8");
    }
  }, theme);
}

function drawNero(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#06070c", suit2: "#0b0d16", skin: "#06070c", hair: "#030408",
    accent: "#b9c0ff", coat: true,
    headStyle: "none", eyes: "white",
    behind(c, u, p) { smokeTendrils(c, u, p); highCollar(c, u, p); },
    front(c, u, p) { coatLapels(c, u, p); }
  }, theme);
}

function drawEttore(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#4b3e34", suit2: "#312722", skin: "#c3a07b", hair: "#5a5550",
    accent: "#ffd08a",
    headStyle: "short", eyes: "civil",
    front(c, u, p) { flashlight(c, u, p); }
  }, theme);
}

function drawNurse(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#d8e8e2", suit2: "#9dbcae", skin: "#c9a07a", hair: "#2a1a18",
    accent: "#9ff0e0",
    headStyle: "short", eyes: "civil",
    front(c, u, p) {
      ctx.fillStyle = "#e8f0e6";
      ctx.beginPath();
      ctx.ellipse(0, (p.headY - 8) * u, 7 * u, 2.4 * u, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hexA(theme.ink, 0.6);
      ctx.lineWidth = 1 * u;
      ctx.stroke();
    }
  }, theme);
}

function drawAda(ctx, x, y, s, flip, theme) {
  /* Ada is in a bed, so she gets her own proportions instead of the upright
   * figure rig. The unit matches figure() so she reads at the same scale. */
  const u = 4.3 * s;
  ctx.save();
  ctx.translate(x, y);
  glow(ctx, -8 * u, -8 * u, 70 * u, theme.cyan, 0.14);

  ctx.fillStyle = hexA(theme.paper, 0.4);
  ctx.beginPath();
  ctx.ellipse(4 * u, 10 * u, 26 * u, 10 * u, -0.08, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.ink, 0.4);
  ctx.lineWidth = 2 * u;
  ctx.stroke();

  ctx.fillStyle = "#2a1a18";
  ctx.beginPath();
  ctx.ellipse(-7 * u, -4 * u, 17 * u, 12 * u, -0.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#d2a879";
  ctx.beginPath();
  ctx.ellipse(3 * u, -1 * u, 12.5 * u, 10 * u, 0.08, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2 * u;
  ctx.stroke();

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.moveTo(-3 * u, -2 * u);
  ctx.quadraticCurveTo(1 * u, -4 * u, 4 * u, -2 * u);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * u, 4 * u);
  ctx.quadraticCurveTo(4 * u, 5.5 * u, 7 * u, 4 * u);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8 * u, 0);
  ctx.lineTo(9.5 * u, 2 * u);
  ctx.stroke();

  ctx.fillStyle = hexA(theme.paper, 0.18);
  ctx.beginPath();
  ctx.moveTo(9 * u, 7 * u);
  ctx.quadraticCurveTo(25 * u, 3 * u, 40 * u, 12 * u);
  ctx.lineTo(38 * u, 27 * u);
  ctx.quadraticCurveTo(24 * u, 18 * u, 7 * u, 20 * u);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(theme.haze, 0.3);
  ctx.lineWidth = 1.5 * u;
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = hexA(theme.cyan, 0.7);
  ctx.lineWidth = 1.4 * u;
  ctx.shadowColor = theme.cyan;
  ctx.shadowBlur = 8 * u;
  ctx.beginPath();
  ctx.arc(3 * u, -1 * u, 12.5 * u, -0.6, 1.0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawStranger(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#5d6068", suit2: "#40434a", skin: "#3a3c42", hair: "#2b2c31",
    accent: "#b9c6d8", coat: true, noShadow: true,
    headStyle: "hat", eyes: "none",
    behind(c, u) {
      // The point of the character: a circle of light where a shadow should be.
      c.strokeStyle = hexA("#f4d35e", 0.35);
      c.lineWidth = 1.6 * u;
      c.beginPath();
      c.ellipse(0, 0, 30 * u, 7 * u, 0, 0, TAU);
      c.stroke();
    }
  }, theme);
}

function drawCrowd(ctx, x, y, s, flip, theme, rng, pose) {
  const palettes = [
    ["#2b3440", "#171d26"],
    ["#3a2f35", "#1c161a"],
    ["#243a38", "#12201f"],
    ["#3a3426", "#1c1913"],
    ["#2f2a3d", "#18151f"]
  ];
  const count = 5;
  for (let i = 0; i < count; i++) {
    const hue = palettes[(rng() * palettes.length) | 0];
    const offset = (i - (count - 1) / 2) * 52 * s;
    figure(ctx, x + offset, y + (rng() - 0.5) * 6 * s, s * (0.78 + rng() * 0.3), {
      pose: rng() > 0.7 ? "stand" : "stand",
      flip: rng() > 0.5,
      ink: theme.ink,
      suit: hue[0], suit2: hue[1], skin: "#a77a5a", hair: "#14100e",
      accent: theme.cyan,
      headStyle: rng() > 0.5 ? "short" : "bob",
      eyes: "civil",
      noShadow: true
    }, theme);
  }
}

function drawSilvio(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#241626", suit2: "#100b17", skin: "#c9a07a", hair: "#1a1114",
    accent: "#b9a0ff", coat: true, noShadow: true, hat: "#0e0912",
    headStyle: "hat", eyes: "civil",
    behind(c, u) {
      c.strokeStyle = hexA("#b9a0ff", 0.22);
      c.lineWidth = 1.6 * u;
      c.beginPath();
      c.ellipse(0, 0, 30 * u, 7 * u, 0, 0, TAU);
      c.stroke();
    },
    front(c, u, p) {
      c.fillStyle = "#b9a0ff";
      c.beginPath();
      c.moveTo(0, (p.shoulderY + 10) * u);
      c.lineTo(-5 * u, (p.shoulderY + 7) * u);
      c.lineTo(-2 * u, (p.shoulderY + 14) * u);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(0, (p.shoulderY + 10) * u);
      c.lineTo(5 * u, (p.shoulderY + 7) * u);
      c.lineTo(2 * u, (p.shoulderY + 14) * u);
      c.closePath();
      c.fill();
      glowHands(c, u, p, "#b9a0ff");
    }
  }, theme);
}

function drawMother(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#7a4a3e", suit2: "#4a2c28", skin: "#c9a07a", hair: "#5a4a44",
    accent: "#f4b64a", headStyle: "bun", eyes: "civil"
  }, theme);
}

function drawShadow(ctx, x, y, s, flip, theme, rng, pose) {
  figure(ctx, x, y, s, {
    pose, flip, ink: theme.ink,
    suit: "#050508", suit2: "#0b0912", skin: "#050508", hair: "#030307",
    accent: "#b9a0ff", noShadow: true,
    headStyle: "none", eyes: "white",
    behind(c, u, p) {
      smokeTendrils(c, u, p);
      c.fillStyle = "rgba(4,4,10,.7)";
      c.beginPath();
      c.ellipse(0, -36 * u, 26 * u, 38 * u, 0, 0, TAU);
      c.fill();
    },
    front(c, u, p) {
      c.save();
      c.strokeStyle = hexA("#b9a0ff", 0.55);
      c.shadowColor = "#b9a0ff";
      c.shadowBlur = 8 * u;
      c.lineWidth = 2.2 * u;
      for (const [hx, hy] of p.hands) {
        c.beginPath();
        c.moveTo(hx * u, hy * u);
        c.quadraticCurveTo((hx + 14) * u, (hy + 12) * u, (hx + 8) * u, (hy + 24) * u);
        c.stroke();
        c.beginPath();
        c.moveTo(hx * u, hy * u);
        c.quadraticCurveTo((hx - 12) * u, (hy + 14) * u, (hx - 4) * u, (hy + 26) * u);
        c.stroke();
      }
      c.restore();
    }
  }, theme);
}

export const CHARACTERS = {
  luce: drawLuce,
  volt: drawVolt,
  muro: drawMuro,
  nero: drawNero,
  ettore: drawEttore,
  nurse: drawNurse,
  ada: drawAda,
  stranger: drawStranger,
  silvio: drawSilvio,
  mother: drawMother,
  shadow: drawShadow,
  crowd: drawCrowd
};
