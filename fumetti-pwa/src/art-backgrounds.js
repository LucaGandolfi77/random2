import {
  TAU, hexA, rr, ellipse, poly, line, glow, verticalGradient,
  sky, windows, skyline, tram, streetLamp, neon, wetRoad
} from "./art-core.js";

function rooftopMilano(ctx, V, theme, rng) {
  sky(ctx, V, theme, rng, true);
  glow(ctx, V.w * 0.6, V.h * 0.2, V.w * 0.28, theme.haze, 0.12);
  skyline(ctx, V, theme, rng, { baseY: 0.79 });

  const roofY = V.h * 0.79;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, roofY, V.w, V.h - roofY);
  ctx.fillStyle = hexA(theme.haze, 0.08);
  ctx.fillRect(0, roofY, V.w, 4);
  for (let x = 0; x < V.w; x += 54) {
    line(ctx, x, roofY + 12, x + 20, V.h, hexA(theme.haze, 0.07), 2);
  }
  ctx.fillStyle = hexA(theme.ink, 0.95);
  ctx.fillRect(0, roofY - 10, V.w, 18);
  ctx.fillStyle = hexA(theme.haze, 0.12);
  ctx.fillRect(0, roofY - 10, V.w, 2);

  ctx.fillStyle = theme.ink;
  ctx.fillRect(V.w * 0.07, roofY - 92, 54, 96);
  ctx.fillStyle = hexA(theme.haze, 0.1);
  ctx.fillRect(V.w * 0.07, roofY - 92, 54, 4);

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.91, roofY);
  ctx.lineTo(V.w * 0.91, roofY - 168);
  ctx.moveTo(V.w * 0.88, roofY - 118);
  ctx.lineTo(V.w * 0.94, roofY - 118);
  ctx.moveTo(V.w * 0.885, roofY - 146);
  ctx.lineTo(V.w * 0.935, roofY - 146);
  ctx.stroke();
  ctx.fillStyle = theme.red;
  ctx.beginPath();
  ctx.arc(V.w * 0.91, roofY - 172, 4, 0, TAU);
  ctx.fill();
  glow(ctx, V.w * 0.91, roofY - 172, 20, theme.red, 0.4);

  ctx.strokeStyle = hexA(theme.haze, 0.16);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.06, roofY - 90);
  ctx.quadraticCurveTo(V.w * 0.35, roofY - 46, V.w * 0.62, roofY - 74);
  ctx.stroke();

  for (let i = 0; i < 5; i++) {
    const x = rng() * V.w;
    const y = roofY + 40 + rng() * (V.h - roofY - 70);
    ctx.fillStyle = hexA(theme.cyan, 0.08 + rng() * 0.08);
    ctx.beginPath();
    ctx.ellipse(x, y, 18 + rng() * 40, 2 + rng() * 4, -0.1, 0, TAU);
    ctx.fill();
  }
}

function tramStreet(ctx, V, theme, rng, panel) {
  const off = panel && panel.noLights;
  sky(ctx, V, theme, rng, !off);
  skyline(ctx, V, theme, rng, { baseY: 0.58, alpha: off ? 0.7 : 1 });

  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, V.h * 0.12, V.w * 0.19, V.h * 0.5);
  ctx.fillRect(V.w * 0.81, V.h * 0.08, V.w * 0.22, V.h * 0.54);
  windows(ctx, V.w * 0.02, V.h * 0.17, V.w * 0.14, V.h * 0.4, 3, 8, theme, rng, off ? 0.04 : 0.3);
  windows(ctx, V.w * 0.83, V.h * 0.14, V.w * 0.15, V.h * 0.42, 3, 8, theme, rng, off ? 0.04 : 0.3);

  if (!off) {
    neon(ctx, "BAR", V.w * 0.88, V.h * 0.27, V.h * 0.038, theme.red, -4);
    neon(ctx, "24H", V.w * 0.86, V.h * 0.33, V.h * 0.022, theme.cyan, -4);
    glow(ctx, V.w * 0.88, V.h * 0.3, V.w * 0.1, theme.red, 0.18);
  }

  wetRoad(ctx, V, theme, rng, V.h * 0.56);
  ctx.fillStyle = hexA(theme.ink, 0.9);
  ctx.fillRect(0, V.h * 0.54, V.w, V.h * 0.08);
  ctx.strokeStyle = hexA(theme.haze, 0.12);
  ctx.lineWidth = 2;
  for (let x = 0; x < V.w; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.55);
    ctx.lineTo(x - 20, V.h * 0.62);
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const x = V.w * (0.22 + i * 0.1);
    poly(ctx, [
      [x, V.h * 0.72],
      [x + V.w * 0.045, V.h * 0.72],
      [x + V.w * 0.095, V.h * 0.91],
      [x + V.w * 0.03, V.h * 0.91]
    ], hexA(theme.paper, off ? 0.08 : 0.13));
  }

  streetLamp(ctx, V.w * 0.18, V.h * 0.68, V.h * 0.44, theme, !off);
  streetLamp(ctx, V.w * 0.78, V.h * 0.65, V.h * 0.5, theme, !off);
  tram(ctx, V.w * 0.42, V.h * 0.76, V.h / 1000, theme, !off);

  if (!off) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = theme.amber;
    ctx.fillRect(V.w * 0.27, V.h * 0.77, 10, V.h * 0.18);
    ctx.fillStyle = theme.red;
    ctx.fillRect(V.w * 0.85, V.h * 0.38, 8, V.h * 0.4);
    ctx.globalAlpha = 1;
  }
}

function barInterior(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  ctx.fillStyle = hexA(theme.ink, 0.22);
  ctx.fillRect(0, V.h * 0.08, V.w, V.h * 0.55);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = hexA(theme.ink, 0.16);
    ctx.fillRect(V.w * (0.05 + i * 0.19), V.h * 0.12, V.w * 0.15, V.h * 0.4);
  }

  for (let row = 0; row < 3; row++) {
    const y = V.h * (0.26 + row * 0.1);
    ctx.strokeStyle = hexA(theme.ink, 0.8);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(V.w * 0.06, y);
    ctx.lineTo(V.w * 0.52, y);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const x = V.w * (0.08 + i * 0.036);
      const h = V.h * (0.035 + rng() * 0.03);
      ctx.fillStyle = [theme.amber, theme.green, theme.red, theme.cyan][(rng() * 4) | 0];
      ctx.globalAlpha = 0.55;
      rr(ctx, x, y - h, V.w * 0.014, h, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = theme.ink;
  rr(ctx, V.w * 0.08, V.h * 0.07, V.w * 0.27, V.h * 0.15, 6);
  ctx.fill();
  ctx.fillStyle = hexA(theme.cyan, 0.18);
  rr(ctx, V.w * 0.09, V.h * 0.08, V.w * 0.25, V.h * 0.12, 4);
  ctx.fill();
  glow(ctx, V.w * 0.215, V.h * 0.14, V.w * 0.16, theme.cyan, 0.14);

  ctx.fillStyle = hexA(theme.sky1, 0.6);
  ctx.fillRect(V.w * 0.69, V.h * 0.1, V.w * 0.25, V.h * 0.42);
  ctx.strokeStyle = hexA(theme.ink, 0.9);
  ctx.lineWidth = 6;
  ctx.strokeRect(V.w * 0.69, V.h * 0.1, V.w * 0.25, V.h * 0.42);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.815, V.h * 0.1);
  ctx.lineTo(V.w * 0.815, V.h * 0.52);
  ctx.moveTo(V.w * 0.69, V.h * 0.31);
  ctx.lineTo(V.w * 0.94, V.h * 0.31);
  ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const x = V.w * (0.70 + rng() * 0.23);
    const y = V.h * (0.11 + rng() * 0.38);
    line(ctx, x, y, x - 3, y + 12 + rng() * 22, hexA(theme.haze, 0.28), 1.2);
  }

  ctx.fillStyle = hexA(theme.ink, 0.95);
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.7);
  ctx.lineTo(V.w, V.h * 0.62);
  ctx.lineTo(V.w, V.h);
  ctx.lineTo(0, V.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexA(theme.amber, 0.18);
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.7);
  ctx.lineTo(V.w, V.h * 0.62);
  ctx.lineTo(V.w, V.h * 0.66);
  ctx.lineTo(0, V.h * 0.74);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    const x = V.w * (0.2 + i * 0.16);
    ctx.fillStyle = hexA(theme.paper, 0.45);
    rr(ctx, x, V.h * 0.66, 16, 12, 3);
    ctx.fill();
  }
  ctx.fillStyle = hexA(theme.haze, 0.08);
  rr(ctx, V.w * 0.58, V.h * 0.44, V.w * 0.09, V.h * 0.2, 5);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const x = V.w * (0.2 + i * 0.3);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, V.h * 0.16);
    ctx.stroke();
    ctx.fillStyle = hexA(theme.amber, 0.8);
    ctx.beginPath();
    ctx.arc(x, V.h * 0.17, 8, 0, TAU);
    ctx.fill();
    glow(ctx, x, V.h * 0.17, 56, theme.amber, 0.28);
  }
}

function depot(ctx, V, theme) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  ctx.fillStyle = hexA(theme.ink, 0.7);
  ctx.fillRect(0, 0, V.w, V.h);
  for (let i = 0; i < 3; i++) {
    const cx = V.w * (0.2 + i * 0.3);
    const w = V.w * 0.28;
    ctx.fillStyle = hexA(theme.sky1, 0.85);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, V.h);
    ctx.lineTo(cx - w / 2, V.h * 0.35);
    ctx.quadraticCurveTo(cx, V.h * 0.16, cx + w / 2, V.h * 0.35);
    ctx.lineTo(cx + w / 2, V.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(theme.haze, 0.18);
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  ctx.strokeStyle = hexA(theme.haze, 0.07);
  ctx.lineWidth = 2;
  for (let y = V.h * 0.08; y < V.h; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(V.w, y);
    ctx.stroke();
  }

  for (let i = 0; i < 5; i++) {
    const x = V.w * (0.1 + i * 0.2);
    const y = V.h * (0.23 + (i % 2) * 0.06);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = hexA(theme.amber, 0.9);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
    glow(ctx, x, y, 64, theme.amber, 0.26);
  }

  ctx.fillStyle = hexA(theme.ink, 0.85);
  ctx.fillRect(0, V.h * 0.76, V.w, V.h * 0.24);
  ctx.strokeStyle = hexA(theme.haze, 0.2);
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const x = V.w * (0.15 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.78);
    ctx.lineTo(x - 60, V.h);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const y = V.h * (0.8 + i * 0.026);
    ctx.strokeStyle = hexA(theme.haze, 0.12);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(V.w, y);
    ctx.stroke();
  }

  ctx.fillStyle = hexA(theme.ink, 0.9);
  rr(ctx, V.w * 0.77, V.h * 0.45, V.w * 0.2, V.h * 0.34, 10);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.haze, 0.15);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = hexA(theme.haze, 0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.35);
  ctx.quadraticCurveTo(V.w * 0.5, V.h * 0.42, V.w, V.h * 0.3);
  ctx.stroke();
}

function darsena(ctx, V, theme, rng) {
  sky(ctx, V, theme, rng, true);
  skyline(ctx, V, theme, rng, { baseY: 0.55, alpha: 0.8 });

  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.58);
  ctx.lineTo(V.w * 0.36, V.h * 0.58);
  ctx.quadraticCurveTo(V.w * 0.47, V.h * 0.46, V.w * 0.58, V.h * 0.58);
  ctx.lineTo(V.w, V.h * 0.55);
  ctx.lineTo(V.w, V.h * 0.64);
  ctx.lineTo(0, V.h * 0.68);
  ctx.closePath();
  ctx.fill();
  streetLamp(ctx, V.w * 0.28, V.h * 0.58, V.h * 0.28, theme, true);
  streetLamp(ctx, V.w * 0.56, V.h * 0.58, V.h * 0.24, theme, true);

  verticalGradient(ctx, 0, V.h * 0.64, V.w, V.h * 0.36, hexA(theme.ink, 0.85), theme.ink);
  for (let i = 0; i < 70; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.66 + rng() * 0.32);
    ctx.globalAlpha = 0.05 + rng() * 0.18;
    ctx.fillStyle = rng() > 0.55 ? theme.amber : theme.cyan;
    ctx.fillRect(x, y, 10 + rng() * 50, 1 + rng() * 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, V.h * 0.83, V.w, V.h * 0.17);
  ctx.fillStyle = hexA(theme.haze, 0.12);
  ctx.fillRect(0, V.h * 0.83, V.w, 3);

  for (let i = 0; i < 5; i++) {
    const x = V.w * (0.08 + i * 0.19);
    ctx.fillStyle = hexA(theme.ink, 0.95);
    ctx.fillRect(x, V.h * 0.79, 8, V.h * 0.06);
  }

  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.67, V.h * 0.7);
  ctx.lineTo(V.w * 0.87, V.h * 0.7);
  ctx.lineTo(V.w * 0.83, V.h * 0.74);
  ctx.lineTo(V.w * 0.7, V.h * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(theme.haze, 0.22);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.75, V.h * 0.7);
  ctx.lineTo(V.w * 0.75, V.h * 0.62);
  ctx.stroke();
}

function powerStation(ctx, V, theme) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  for (let i = 0; i < 4; i++) {
    const x = V.w * (0.06 + i * 0.24);
    ctx.fillStyle = hexA(theme.cyan, 0.08);
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.62);
    ctx.lineTo(x, V.h * 0.22);
    ctx.quadraticCurveTo(x + V.w * 0.06, V.h * 0.12, x + V.w * 0.12, V.h * 0.22);
    ctx.lineTo(x + V.w * 0.12, V.h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(theme.ink, 0.9);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = hexA(theme.haze, 0.16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + V.w * 0.06, V.h * 0.16);
    ctx.lineTo(x + V.w * 0.06, V.h * 0.62);
    ctx.stroke();
  }

  ctx.strokeStyle = hexA(theme.haze, 0.18);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.02, V.h * 0.12);
  ctx.lineTo(V.w * 0.98, V.h * 0.12);
  ctx.stroke();
  ctx.strokeStyle = hexA(theme.ink, 0.9);
  ctx.lineWidth = 4;
  for (let i = 0; i < 9; i++) {
    const x = V.w * (0.05 + i * 0.11);
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.12);
    ctx.lineTo(x, V.h * 0.6);
    ctx.stroke();
  }
  ctx.fillStyle = hexA(theme.ink, 0.9);
  ctx.fillRect(0, V.h * 0.58, V.w, 10);

  const cx = V.w * 0.52;
  const cy = V.h * 0.66;
  ctx.fillStyle = hexA(theme.ink, 0.92);
  rr(ctx, cx - V.w * 0.2, cy - V.h * 0.18, V.w * 0.4, V.h * 0.34, 28);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.haze, 0.2);
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = hexA(theme.haze, 0.13);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, V.w * (0.05 + i * 0.03), V.h * (0.04 + i * 0.024), 0, 0, TAU);
    ctx.stroke();
  }
  glow(ctx, cx, cy, V.w * 0.18, theme.red, 0.12);

  for (let i = 0; i < 3; i++) {
    const x = V.w * (0.2 + i * 0.3);
    const y = V.h * 0.18;
    ctx.fillStyle = hexA(theme.red, 0.9);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, TAU);
    ctx.fill();
    glow(ctx, x, y, 40, theme.red, 0.28);
  }

  ctx.fillStyle = hexA(theme.ink, 0.92);
  ctx.fillRect(0, V.h * 0.8, V.w, V.h * 0.2);
  ctx.strokeStyle = hexA(theme.haze, 0.1);
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, V.h * (0.84 + i * 0.03));
    ctx.lineTo(V.w, V.h * (0.84 + i * 0.03));
    ctx.stroke();
  }

  ctx.fillStyle = hexA(theme.ink, 0.9);
  rr(ctx, V.w * 0.03, V.h * 0.6, V.w * 0.13, V.h * 0.2, 4);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? hexA(theme.red, 0.7) : hexA(theme.cyan, 0.55);
    ctx.fillRect(V.w * 0.045, V.h * (0.63 + i * 0.03), 8, 3);
  }
}

function hospitalCorridor(ctx, V, theme) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  ctx.fillStyle = hexA(theme.ink, 0.6);
  ctx.beginPath();
  ctx.moveTo(V.w * 0.16, V.h * 0.46);
  ctx.lineTo(V.w * 0.84, V.h * 0.46);
  ctx.lineTo(V.w, V.h);
  ctx.lineTo(0, V.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(theme.haze, 0.14);
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    ctx.beginPath();
    ctx.moveTo(V.w * (0.16 + t * 0.68), V.h * 0.46);
    ctx.lineTo(V.w * (0.16 + t * 0.84), V.h * 0.46);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i++) {
    const y = V.h * (0.08 + i * 0.09);
    const w = V.w * (0.1 + i * 0.03);
    ctx.fillStyle = hexA(theme.cyan, 0.18);
    rr(ctx, V.w / 2 - w / 2, y, w, V.h * 0.024, 4);
    ctx.fill();
    glow(ctx, V.w / 2, y + V.h * 0.012, w * 0.9, theme.cyan, 0.1);
  }

  for (const [x, y, w, h] of [
    [0.03, 0.3, 0.14, 0.34],
    [0.83, 0.28, 0.14, 0.36]
  ]) {
    ctx.fillStyle = hexA(theme.ink, 0.85);
    ctx.fillRect(V.w * x, V.h * y, V.w * w, V.h * h);
    ctx.strokeStyle = hexA(theme.haze, 0.18);
    ctx.lineWidth = 3;
    ctx.strokeRect(V.w * x, V.h * y, V.w * w, V.h * h);
    ctx.fillStyle = hexA(theme.cyan, 0.35);
    ctx.fillRect(V.w * (x + w * 0.72), V.h * (y + h * 0.44), 5, 5);
  }

  ctx.fillStyle = hexA(theme.cyan, 0.1);
  ctx.fillRect(V.w * 0.38, V.h * 0.18, V.w * 0.24, V.h * 0.24);
  ctx.strokeStyle = hexA(theme.ink, 0.9);
  ctx.lineWidth = 6;
  ctx.strokeRect(V.w * 0.38, V.h * 0.18, V.w * 0.24, V.h * 0.24);

  ctx.fillStyle = hexA(theme.ink, 0.9);
  rr(ctx, V.w * 0.64, V.h * 0.6, V.w * 0.18, V.h * 0.08, 6);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.haze, 0.22);
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = V.w * (0.66 + i * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.68);
    ctx.lineTo(x, V.h * 0.76);
    ctx.stroke();
  }
}

function hospitalRoom(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  ctx.fillStyle = hexA(theme.cyan, 0.08);
  ctx.fillRect(V.w * 0.06, V.h * 0.1, V.w * 0.28, V.h * 0.42);
  ctx.strokeStyle = hexA(theme.ink, 0.9);
  ctx.lineWidth = 6;
  ctx.strokeRect(V.w * 0.06, V.h * 0.1, V.w * 0.28, V.h * 0.42);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.2, V.h * 0.1);
  ctx.lineTo(V.w * 0.2, V.h * 0.52);
  ctx.moveTo(V.w * 0.06, V.h * 0.31);
  ctx.lineTo(V.w * 0.34, V.h * 0.31);
  ctx.stroke();
  for (let i = 0; i < 20; i++) {
    const x = V.w * (0.07 + rng() * 0.26);
    const y = V.h * (0.11 + rng() * 0.39);
    line(ctx, x, y, x - 2, y + 10 + rng() * 20, hexA(theme.haze, 0.24), 1.1);
  }

  ctx.fillStyle = hexA(theme.ink, 0.9);
  rr(ctx, V.w * 0.48, V.h * 0.56, V.w * 0.4, V.h * 0.16, 10);
  ctx.fill();
  ctx.fillStyle = hexA(theme.paper, 0.26);
  rr(ctx, V.w * 0.5, V.h * 0.52, V.w * 0.36, V.h * 0.12, 18);
  ctx.fill();
  ctx.fillStyle = hexA(theme.paper, 0.4);
  rr(ctx, V.w * 0.56, V.h * 0.5, V.w * 0.1, V.h * 0.08, 10);
  ctx.fill();
  ctx.fillStyle = hexA(theme.paper, 0.55);
  rr(ctx, V.w * 0.63, V.h * 0.49, V.w * 0.11, V.h * 0.08, 12);
  ctx.fill();

  ctx.strokeStyle = hexA(theme.haze, 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.46, V.h * 0.4);
  ctx.lineTo(V.w * 0.46, V.h * 0.74);
  ctx.moveTo(V.w * 0.44, V.h * 0.74);
  ctx.lineTo(V.w * 0.48, V.h * 0.74);
  ctx.stroke();
  ctx.fillStyle = hexA(theme.cyan, 0.35);
  rr(ctx, V.w * 0.44, V.h * 0.4, V.w * 0.03, V.h * 0.07, 4);
  ctx.fill();

  ctx.fillStyle = theme.ink;
  rr(ctx, V.w * 0.78, V.h * 0.3, V.w * 0.15, V.h * 0.12, 5);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.cyan, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.8, V.h * 0.37);
  ctx.lineTo(V.w * 0.83, V.h * 0.37);
  ctx.lineTo(V.w * 0.845, V.h * 0.34);
  ctx.lineTo(V.w * 0.86, V.h * 0.39);
  ctx.lineTo(V.w * 0.875, V.h * 0.37);
  ctx.lineTo(V.w * 0.91, V.h * 0.37);
  ctx.stroke();
  glow(ctx, V.w * 0.855, V.h * 0.36, V.w * 0.09, theme.cyan, 0.14);

  ctx.fillStyle = hexA(theme.paper, 0.05);
  ctx.beginPath();
  ctx.moveTo(V.w * 0.38, V.h * 0.08);
  ctx.quadraticCurveTo(V.w * 0.44, V.h * 0.4, V.w * 0.4, V.h * 0.74);
  ctx.lineTo(V.w * 0.34, V.h * 0.74);
  ctx.quadraticCurveTo(V.w * 0.36, V.h * 0.36, V.w * 0.31, V.h * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = hexA(theme.ink, 0.55);
  ctx.fillRect(0, V.h * 0.76, V.w, V.h * 0.24);
}

function vortexBase(ctx, V, theme, rng, light) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  const cx = V.w * 0.52;
  const cy = V.h * 0.48;
  for (let i = 0; i < 14; i++) {
    const r = V.w * (0.04 + i * 0.045);
    ctx.strokeStyle = light
      ? hexA([theme.amber, theme.cyan, theme.glow][i % 3], 0.05 + i * 0.012)
      : hexA(theme.ink, 0.4 + i * 0.02);
    ctx.lineWidth = light ? 2 + (i % 3) : 10 + i;
    ctx.beginPath();
    ctx.arc(cx, cy, r, i * 0.5, i * 0.5 + Math.PI * 1.35);
    ctx.stroke();
  }
  if (light) {
    glow(ctx, cx, cy, V.w * 0.32, theme.glow, 0.4);
    for (let i = 0; i < 18; i++) {
      const a = rng() * TAU;
      const r1 = V.w * (0.05 + rng() * 0.18);
      const r2 = V.w * (0.28 + rng() * 0.25);
      ctx.strokeStyle = hexA([theme.amber, theme.cyan, theme.glow][i % 3], 0.25 + rng() * 0.4);
      ctx.lineWidth = 1 + rng() * 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.quadraticCurveTo(
        cx + Math.cos(a + 0.4) * ((r1 + r2) / 2),
        cy + Math.sin(a + 0.4) * ((r1 + r2) / 2),
        cx + Math.cos(a) * r2,
        cy + Math.sin(a) * r2
      );
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const a = rng() * TAU;
      const r = V.w * (0.12 + rng() * 0.34);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.7;
      ctx.fillStyle = hexA(theme.ink, 0.7);
      ctx.fillRect(x, y, 12 + rng() * 42, 4 + rng() * 18);
    }
    glow(ctx, cx, cy, V.w * 0.16, theme.ink, 0.9);
  }
  ctx.fillStyle = hexA(theme.ink, 0.8);
  ctx.fillRect(0, V.h * 0.84, V.w, V.h * 0.16);
}

function dawnNavigli(ctx, V, theme, rng) {
  sky(ctx, V, theme, rng, false);
  glow(ctx, V.w * 0.68, V.h * 0.2, V.w * 0.3, theme.amber, 0.44);
  ctx.fillStyle = hexA(theme.glow, 0.7);
  ctx.beginPath();
  ctx.arc(V.w * 0.68, V.h * 0.2, V.h * 0.035, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.08 + rng() * 0.22);
    ctx.fillStyle = hexA(theme.sky1, 0.18);
    ctx.beginPath();
    ctx.ellipse(x, y, V.w * (0.1 + rng() * 0.14), V.h * 0.025, 0, 0, TAU);
    ctx.fill();
  }
  skyline(ctx, V, theme, rng, { baseY: 0.6, alpha: 0.55 });

  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.62);
  ctx.lineTo(V.w * 0.34, V.h * 0.62);
  ctx.quadraticCurveTo(V.w * 0.45, V.h * 0.5, V.w * 0.56, V.h * 0.62);
  ctx.lineTo(V.w, V.h * 0.6);
  ctx.lineTo(V.w, V.h * 0.68);
  ctx.lineTo(0, V.h * 0.7);
  ctx.closePath();
  ctx.fill();

  verticalGradient(ctx, 0, V.h * 0.68, V.w, V.h * 0.32, hexA(theme.sky2, 0.35), hexA(theme.ink, 0.9));
  for (let i = 0; i < 80; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.7 + rng() * 0.28);
    ctx.globalAlpha = 0.06 + rng() * 0.2;
    ctx.fillStyle = rng() > 0.5 ? theme.amber : theme.glow;
    ctx.fillRect(x, y, 8 + rng() * 52, 1 + rng() * 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, V.h * 0.86, V.w, V.h * 0.14);
  ctx.fillStyle = hexA(theme.amber, 0.2);
  ctx.fillRect(0, V.h * 0.86, V.w, 2);
  for (let i = 0; i < 4; i++) {
    const x = V.w * (0.1 + i * 0.23);
    ctx.fillStyle = theme.ink;
    ctx.fillRect(x, V.h * 0.81, 7, V.h * 0.06);
  }
  ctx.strokeStyle = hexA(theme.ink, 0.5);
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const x = V.w * (0.2 + rng() * 0.6);
    const y = V.h * (0.1 + rng() * 0.18);
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.quadraticCurveTo(x - 3, y - 5, x, y);
    ctx.quadraticCurveTo(x + 3, y - 5, x + 8, y);
    ctx.stroke();
  }
}

function piazzaMorning(ctx, V, theme, rng) {
  sky(ctx, V, theme, rng, false);
  glow(ctx, V.w * 0.22, V.h * 0.16, V.w * 0.24, theme.glow, 0.3);

  ctx.fillStyle = hexA(theme.ink, 0.92);
  ctx.fillRect(0, V.h * 0.18, V.w * 0.46, V.h * 0.5);
  ctx.fillStyle = hexA(theme.paper, 0.12);
  ctx.fillRect(V.w * 0.02, V.h * 0.22, V.w * 0.42, V.h * 0.2);
  ctx.fillStyle = hexA(theme.sky1, 0.4);
  ctx.fillRect(V.w * 0.06, V.h * 0.3, V.w * 0.13, V.h * 0.2);
  ctx.fillRect(V.w * 0.24, V.h * 0.3, V.w * 0.13, V.h * 0.2);
  ctx.strokeStyle = hexA(theme.ink, 0.9);
  ctx.lineWidth = 4;
  ctx.strokeRect(V.w * 0.06, V.h * 0.3, V.w * 0.13, V.h * 0.2);
  ctx.strokeRect(V.w * 0.24, V.h * 0.3, V.w * 0.13, V.h * 0.2);

  ctx.fillStyle = hexA(theme.red, 0.5);
  ctx.beginPath();
  ctx.moveTo(V.w * 0.02, V.h * 0.22);
  ctx.lineTo(V.w * 0.45, V.h * 0.22);
  ctx.lineTo(V.w * 0.4, V.h * 0.27);
  ctx.lineTo(V.w * 0.06, V.h * 0.27);
  ctx.closePath();
  ctx.fill();
  neon(ctx, "BAR CENTRALE", V.w * 0.24, V.h * 0.2, V.h * 0.026, theme.amber, 0);

  streetLamp(ctx, V.w * 0.55, V.h * 0.86, V.h * 0.56, theme, false);

  verticalGradient(ctx, 0, V.h * 0.72, V.w, V.h * 0.28, hexA(theme.paper, 0.32), hexA(theme.ink, 0.16));
  ctx.strokeStyle = hexA(theme.ink, 0.1);
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const y = V.h * (0.74 + i * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(V.w, y + 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = V.w * (0.04 + i * 0.13);
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.74);
    ctx.lineTo(x - 30, V.h);
    ctx.stroke();
  }

  for (const [x, y, s] of [[0.24, 0.78, 0.8], [0.44, 0.8, 0.7], [0.66, 0.82, 0.6]]) {
    ctx.fillStyle = hexA(theme.ink, 0.9);
    ctx.beginPath();
    ctx.ellipse(V.w * x, V.h * y, 48 * s, 13 * s, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(V.w * x - 5 * s, V.h * y, 10 * s, V.h * 0.17);
    ctx.beginPath();
    ctx.ellipse(V.w * x, V.h * y + V.h * 0.17, 20 * s, 6 * s, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = hexA(theme.ink, 0.13);
  for (let i = 0; i < 5; i++) {
    const x = V.w * (0.1 + rng() * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.86);
    ctx.lineTo(x + 60, V.h);
    ctx.lineTo(x + 120, V.h);
    ctx.lineTo(x + 22, V.h * 0.86);
    ctx.closePath();
    ctx.fill();
  }
}

function newspaper(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#2a2119", "#120d0a");
  ctx.fillStyle = hexA("#3a2b1d", 0.7);
  ctx.fillRect(0, 0, V.w, V.h);
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = hexA("#d9b07a", 0.06 + rng() * 0.05);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rng() * V.h);
    ctx.quadraticCurveTo(V.w / 2, rng() * V.h, V.w, rng() * V.h);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(V.w * 0.52, V.h * 0.52);
  ctx.rotate(-0.04);
  const nw = V.w * 0.84;
  const nh = V.h * 0.72;
  ctx.fillStyle = "#efe7d6";
  ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
  ctx.strokeStyle = "#cfc3ad";
  ctx.lineWidth = 2;
  ctx.strokeRect(-nw / 2, -nh / 2, nw, nh);

  ctx.fillStyle = "#151217";
  ctx.font = `bold ${V.h * 0.043}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CORRIERE DELLA SERA", 0, -nh * 0.4, nw * 0.88);
  ctx.fillRect(-nw * 0.46, -nh * 0.35, nw * 0.92, 2);

  ctx.font = `bold ${V.h * 0.062}px Impact, "Arial Narrow", sans-serif`;
  ctx.fillStyle = "#141118";
  ctx.fillText("CHI HA", 0, -nh * 0.27, nw * 0.8);
  ctx.fillText("RIACCESO", 0, -nh * 0.19, nw * 0.8);
  ctx.fillText("MILANO?", 0, -nh * 0.11, nw * 0.8);

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(-nw * 0.46, -nh * 0.04, nw * 0.55, nh * 0.34);
  ctx.fillStyle = "#e8dcc4";
  ctx.globalAlpha = 0.7;
  for (const [x, y, s] of [[-0.22, 0.2, 0.55], [-0.04, 0.17, 0.62], [0.14, 0.2, 0.55]]) {
    ctx.beginPath();
    ctx.arc(x * nw, y * nh, nh * 0.035 * s, 0, TAU);
    ctx.fill();
    ctx.fillRect(x * nw - nh * 0.022 * s, y * nh + nh * 0.02 * s, nh * 0.044 * s, nh * 0.12 * s);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#4a433a";
  for (let c = 0; c < 3; c++) {
    const x = -nw * 0.46 + c * nw * 0.15;
    for (let i = 0; i < 13; i++) {
      ctx.fillRect(x, nh * 0.3 + i * 9, nw * (0.09 + rng() * 0.045), 2.6);
    }
  }
  ctx.restore();

  ctx.fillStyle = "#efe7d6";
  ctx.beginPath();
  ctx.arc(V.w * 0.84, V.h * 0.82, V.h * 0.065, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c9bda8";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#2a1710";
  ctx.beginPath();
  ctx.arc(V.w * 0.84, V.h * 0.82, V.h * 0.045, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#efe7d6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(V.w * 0.905, V.h * 0.82, V.h * 0.03, -1.1, 1.1);
  ctx.stroke();
}

function galleriaMilano(ctx, V, theme, rng) {
  const base = V.h * 0.57;
  verticalGradient(ctx, 0, 0, V.w, V.h, "#080b16", "#1b141f");
  glow(ctx, V.w * 0.5, V.h * 0.16, V.w * 0.52, theme.amber, 0.16);
  glow(ctx, V.w * 0.5, V.h * 0.04, V.w * 0.34, theme.cyan, 0.1);

  // The glass barrel vault.
  const left = V.w * 0.08;
  const right = V.w * 0.92;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, base);
  ctx.quadraticCurveTo(V.w * 0.5, -V.h * 0.12, right, base);
  ctx.lineTo(right, base + V.h * 0.04);
  ctx.quadraticCurveTo(V.w * 0.5, V.h * 0.02, left, base + V.h * 0.04);
  ctx.closePath();
  const vault = ctx.createLinearGradient(0, 0, 0, base);
  vault.addColorStop(0, hexA(theme.cyan, 0.16));
  vault.addColorStop(0.55, hexA(theme.amber, 0.08));
  vault.addColorStop(1, hexA(theme.ink, 0.55));
  ctx.fillStyle = vault;
  ctx.fill();

  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const x = left + (right - left) * t;
    ctx.strokeStyle = hexA(theme.ink, 0.85);
    ctx.lineWidth = i % 3 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, base + V.h * 0.02);
    ctx.quadraticCurveTo(V.w * 0.5 + (x - V.w * 0.5) * 0.22, -V.h * 0.02, x, base + V.h * 0.02);
    ctx.stroke();
  }
  for (let j = 1; j < 5; j++) {
    const y = base - (j / 5) * (base - V.h * 0.05);
    ctx.strokeStyle = hexA(theme.ink, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, base - (j / 5) * V.h * 0.15);
    ctx.quadraticCurveTo(V.w * 0.5, y - V.h * 0.18, right, base - (j / 5) * V.h * 0.15);
    ctx.stroke();
  }
  ctx.restore();

  // Side arcades and warm shop windows.
  for (const side of [-1, 1]) {
    const x = side < 0 ? V.w * 0.015 : V.w * 0.945;
    ctx.fillStyle = hexA(theme.ink, 0.94);
    ctx.fillRect(side < 0 ? 0 : V.w * 0.86, V.h * 0.16, V.w * 0.14, V.h * 0.48);
    for (let i = 0; i < 3; i++) {
      const y = V.h * (0.22 + i * 0.13);
      ctx.fillStyle = hexA(theme.amber, 0.16);
      ctx.beginPath();
      ctx.moveTo(x, y + V.h * 0.1);
      ctx.lineTo(x, y);
      ctx.quadraticCurveTo(x + side * V.w * 0.045, y - V.h * 0.03, x + side * V.w * 0.09, y);
      ctx.lineTo(x + side * V.w * 0.09, y + V.h * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexA(theme.ink, 0.9);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = hexA(theme.ink, 0.9);
      ctx.fillRect(x + side * V.w * 0.09, y, 5, V.h * 0.1);
    }
    ctx.fillStyle = hexA(theme.ink, 0.92);
    ctx.fillRect(side < 0 ? V.w * 0.125 : V.w * 0.86, V.h * 0.16, 7, V.h * 0.5);
  }

  // Floor and the Galleria's mosaic.
  verticalGradient(ctx, 0, base, V.w, V.h - base, hexA(theme.ink, 0.72), theme.ink);
  ctx.strokeStyle = hexA(theme.amber, 0.12);
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    ctx.beginPath();
    ctx.moveTo(V.w * (0.16 + t * 0.68), base);
    ctx.lineTo(V.w * (0.02 + t * 0.96), V.h);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const y = base + (i / 6) * (V.h - base);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(V.w, y);
    ctx.stroke();
  }
  ellipse(ctx, V.w * 0.5, V.h * 0.86, V.w * 0.13, V.h * 0.055, hexA(theme.amber, 0.13));
  ctx.strokeStyle = hexA(theme.amber, 0.32);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(V.w * 0.5, V.h * 0.86, V.w * 0.09, V.h * 0.036, 0, 0, TAU);
  ctx.stroke();

  // Hanging light points along the vault.
  for (let i = 0; i < 7; i++) {
    const x = V.w * (0.16 + i * 0.115);
    const y = V.h * (0.2 + Math.sin(i * 1.4) * 0.035);
    ctx.strokeStyle = hexA(theme.ink, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = hexA(theme.glow, 0.8);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, TAU);
    ctx.fill();
    glow(ctx, x, y, 30, theme.amber, 0.2);
  }

  // Rain on the glass: the Galleria is a lantern, not an umbrella.
  for (let i = 0; i < 40; i++) {
    const x = rng() * V.w;
    const y = rng() * V.h * 0.16;
    line(ctx, x, y, x - 4, y + 12 + rng() * 18, hexA(theme.cyan, 0.15), 1);
  }
}

function metroPlatform(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#04070c", "#101a27");
  // Tiled back wall.
  ctx.fillStyle = hexA(theme.ink, 0.8);
  ctx.fillRect(0, V.h * 0.1, V.w, V.h * 0.48);
  ctx.strokeStyle = hexA(theme.cyan, 0.08);
  ctx.lineWidth = 1;
  for (let x = 0; x < V.w; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.1);
    ctx.lineTo(x, V.h * 0.58);
    ctx.stroke();
  }
  for (let y = V.h * 0.1; y < V.h * 0.58; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(V.w, y);
    ctx.stroke();
  }

  // Station sign.
  ctx.fillStyle = hexA(theme.ink, 0.95);
  rr(ctx, V.w * 0.06, V.h * 0.13, V.w * 0.28, V.h * 0.075, 5);
  ctx.fill();
  ctx.fillStyle = hexA(theme.amber, 0.9);
  ctx.font = `bold ${V.h * 0.03}px "Arial Narrow", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("M2 · CENTRALE FS", V.w * 0.08, V.h * 0.168);
  glow(ctx, V.w * 0.2, V.h * 0.17, V.w * 0.15, theme.amber, 0.08);

  // Posters.
  for (const [x, color] of [[0.42, theme.red], [0.58, theme.cyan], [0.7, theme.green]]) {
    ctx.fillStyle = hexA(color, 0.2);
    ctx.fillRect(V.w * x, V.h * 0.22, V.w * 0.1, V.h * 0.24);
    ctx.strokeStyle = hexA(theme.ink, 0.85);
    ctx.lineWidth = 3;
    ctx.strokeRect(V.w * x, V.h * 0.22, V.w * 0.1, V.h * 0.24);
    ctx.fillStyle = hexA(color, 0.4);
    ctx.fillRect(V.w * (x + 0.015), V.h * 0.24, V.w * 0.07, V.h * 0.1);
    ctx.fillStyle = hexA(theme.paper, 0.25);
    ctx.fillRect(V.w * (x + 0.015), V.h * 0.36, V.w * 0.07, 3);
    ctx.fillRect(V.w * (x + 0.015), V.h * 0.39, V.w * 0.05, 3);
  }

  // Train on the right.
  ctx.fillStyle = "#d7d9d4";
  rr(ctx, V.w * 0.66, V.h * 0.3, V.w * 0.32, V.h * 0.4, 12);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = hexA(theme.ink, 0.9);
  rr(ctx, V.w * 0.69, V.h * 0.33, V.w * 0.08, V.h * 0.15, 3);
  ctx.fill();
  rr(ctx, V.w * 0.79, V.h * 0.33, V.w * 0.08, V.h * 0.15, 3);
  ctx.fill();
  ctx.fillStyle = hexA(theme.cyan, 0.45);
  ctx.fillRect(V.w * 0.695, V.h * 0.35, V.w * 0.06, V.h * 0.05);
  ctx.fillRect(V.w * 0.795, V.h * 0.35, V.w * 0.06, V.h * 0.05);
  ctx.fillStyle = "#141a22";
  ctx.fillRect(V.w * 0.695, V.h * 0.55, V.w * 0.185, V.h * 0.03);
  ctx.fillStyle = theme.amber;
  ctx.beginPath();
  ctx.arc(V.w * 0.68, V.h * 0.63, 5, 0, TAU);
  ctx.fill();
  glow(ctx, V.w * 0.68, V.h * 0.63, 30, theme.amber, 0.35);

  // Platform, yellow line, tunnel mouth.
  ctx.fillStyle = hexA(theme.ink, 0.9);
  ctx.fillRect(0, V.h * 0.66, V.w, V.h * 0.34);
  ctx.fillStyle = hexA(theme.amber, 0.8);
  ctx.fillRect(0, V.h * 0.65, V.w, 5);
  ctx.fillStyle = hexA(theme.ink, 0.95);
  ctx.fillRect(0, 0, V.w * 0.1, V.h);
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(V.w * 0.1, V.h * 0.56, V.w * 0.1, V.h * 0.08, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const x = V.w * (0.18 + i * 0.22);
    ctx.strokeStyle = hexA(theme.cyan, 0.16);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, V.h * 0.07);
    ctx.stroke();
    glow(ctx, x, V.h * 0.07, 42, theme.cyan, 0.1);
  }
  for (let i = 0; i < 8; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.68 + rng() * 0.28);
    ctx.fillStyle = hexA(theme.amber, 0.03 + rng() * 0.05);
    ctx.fillRect(x, y, 20 + rng() * 70, 1 + rng() * 2);
  }
}

function teatroStage(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#100a0c", "#1c1013");
  // Back wall and proscenium.
  ctx.fillStyle = hexA(theme.ink, 0.9);
  ctx.fillRect(V.w * 0.08, V.h * 0.08, V.w * 0.84, V.h * 0.62);
  ctx.strokeStyle = hexA(theme.amber, 0.25);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.08, V.h * 0.7);
  ctx.lineTo(V.w * 0.08, V.h * 0.12);
  ctx.quadraticCurveTo(V.w * 0.5, -V.h * 0.04, V.w * 0.92, V.h * 0.12);
  ctx.lineTo(V.w * 0.92, V.h * 0.7);
  ctx.stroke();

  // Curtains.
  ctx.fillStyle = hexA(theme.red, 0.35);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(V.w * 0.26, 0);
  ctx.quadraticCurveTo(V.w * 0.19, V.h * 0.36, V.w * 0.27, V.h * 0.72);
  ctx.lineTo(0, V.h * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(V.w, 0);
  ctx.lineTo(V.w * 0.74, 0);
  ctx.quadraticCurveTo(V.w * 0.81, V.h * 0.36, V.w * 0.73, V.h * 0.72);
  ctx.lineTo(V.w, V.h * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexA(theme.red, 0.28);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(V.w, 0);
  ctx.lineTo(V.w * 0.88, V.h * 0.14);
  ctx.quadraticCurveTo(V.w * 0.5, V.h * 0.05, V.w * 0.12, V.h * 0.14);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = hexA(theme.ink, 0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(V.w * 0.04, V.h * (0.05 + i * 0.09));
    ctx.quadraticCurveTo(V.w * 0.14, V.h * (0.1 + i * 0.09), V.w * 0.23, V.h * (0.04 + i * 0.09));
    ctx.stroke();
  }

  // Stage floor.
  ctx.fillStyle = "#2a1a12";
  ctx.fillRect(0, V.h * 0.72, V.w, V.h * 0.28);
  ctx.strokeStyle = hexA(theme.amber, 0.12);
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(V.w * (i / 8), V.h * 0.72);
    ctx.lineTo(V.w * (i / 8 - 0.1), V.h);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, V.h * (0.76 + i * 0.05));
    ctx.lineTo(V.w, V.h * (0.76 + i * 0.05));
    ctx.stroke();
  }

  // Spotlights and dust.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const x = V.w * (0.3 + i * 0.2);
    const g = ctx.createLinearGradient(x, 0, x + V.w * 0.05, V.h * 0.8);
    g.addColorStop(0, hexA(theme.amber, 0.22));
    g.addColorStop(1, hexA(theme.amber, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - V.w * 0.02, 0);
    ctx.lineTo(x + V.w * 0.02, 0);
    ctx.lineTo(x + V.w * 0.16, V.h * 0.8);
    ctx.lineTo(x - V.w * 0.1, V.h * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 40; i++) {
    const x = rng() * V.w;
    const y = rng() * V.h * 0.8;
    ctx.globalAlpha = 0.1 + rng() * 0.35;
    ctx.fillStyle = theme.glow;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function archiveOmbra(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#0c0a12", "#1a1219");
  // Back wall and shelves.
  ctx.fillStyle = hexA(theme.ink, 0.82);
  ctx.fillRect(0, V.h * 0.08, V.w, V.h * 0.66);
  for (let row = 0; row < 4; row++) {
    const y = V.h * (0.16 + row * 0.12);
    ctx.strokeStyle = hexA(theme.haze, 0.16);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(V.w * 0.04, y);
    ctx.lineTo(V.w * 0.96, y);
    ctx.stroke();
    for (let i = 0; i < 13; i++) {
      const x = V.w * (0.06 + i * 0.068);
      const h = V.h * (0.035 + rng() * 0.04);
      ctx.fillStyle = hexA([theme.amber, theme.cyan, "#b9a0ff", theme.green][(rng() * 4) | 0], 0.16 + rng() * 0.12);
      rr(ctx, x, y - h, V.w * 0.025, h, 3);
      ctx.fill();
      ctx.strokeStyle = hexA(theme.haze, 0.18);
      ctx.lineWidth = 1;
      ctx.stroke();
      if (rng() > 0.5) {
        ctx.fillStyle = hexA(theme.ink, 0.85);
        ctx.fillRect(x + V.w * 0.008, y - h * 0.7, V.w * 0.009, h * 0.5);
      }
    }
  }

  // Mirror in the middle.
  ctx.fillStyle = hexA(theme.ink, 0.95);
  ctx.beginPath();
  ctx.ellipse(V.w * 0.5, V.h * 0.42, V.w * 0.18, V.h * 0.25, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.amber, 0.35);
  ctx.lineWidth = 7;
  ctx.stroke();
  const mirror = ctx.createLinearGradient(V.w * 0.3, V.h * 0.2, V.w * 0.7, V.h * 0.65);
  mirror.addColorStop(0, hexA(theme.cyan, 0.14));
  mirror.addColorStop(0.5, hexA(theme.ink, 0.2));
  mirror.addColorStop(1, hexA("#b9a0ff", 0.12));
  ctx.fillStyle = mirror;
  ctx.beginPath();
  ctx.ellipse(V.w * 0.5, V.h * 0.42, V.w * 0.15, V.h * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.paper, 0.16);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.42, V.h * 0.22);
  ctx.lineTo(V.w * 0.52, V.h * 0.62);
  ctx.stroke();

  // Table with the box of shadows.
  ctx.fillStyle = hexA(theme.ink, 0.9);
  ctx.fillRect(V.w * 0.28, V.h * 0.66, V.w * 0.44, V.h * 0.06);
  ctx.fillRect(V.w * 0.33, V.h * 0.72, V.w * 0.035, V.h * 0.18);
  ctx.fillRect(V.w * 0.64, V.h * 0.72, V.w * 0.035, V.h * 0.18);
  ctx.fillStyle = "#2a1b2e";
  rr(ctx, V.w * 0.42, V.h * 0.56, V.w * 0.16, V.h * 0.1, 5);
  ctx.fill();
  ctx.strokeStyle = hexA(theme.amber, 0.3);
  ctx.lineWidth = 3;
  ctx.stroke();
  glow(ctx, V.w * 0.5, V.h * 0.61, V.w * 0.14, "#b9a0ff", 0.18);

  // Hanging bulbs.
  for (let i = 0; i < 3; i++) {
    const x = V.w * (0.2 + i * 0.3);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, V.h * 0.1);
    ctx.stroke();
    ctx.fillStyle = hexA(theme.glow, 0.9);
    ctx.beginPath();
    ctx.arc(x, V.h * 0.11, 5, 0, TAU);
    ctx.fill();
    glow(ctx, x, V.h * 0.11, 40, theme.amber, 0.2);
  }

  ctx.fillStyle = hexA(theme.ink, 0.7);
  ctx.fillRect(0, V.h * 0.86, V.w, V.h * 0.14);
}

function mirrorRoom(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#05060c", "#0e0b16");
  const frames = [
    [0.08, 0.14, 0.22, 0.42, -0.12],
    [0.38, 0.08, 0.24, 0.5, 0.04],
    [0.69, 0.16, 0.22, 0.4, 0.13],
    [0.2, 0.46, 0.18, 0.28, 0.08],
    [0.62, 0.5, 0.18, 0.26, -0.08]
  ];
  frames.forEach(([x, y, w, h, rot], index) => {
    ctx.save();
    ctx.translate(V.w * (x + w / 2), V.h * (y + h / 2));
    ctx.rotate(rot);
    ctx.fillStyle = hexA(theme.ink, 0.9);
    ctx.fillRect(-V.w * w / 2, -V.h * h / 2, V.w * w, V.h * h);
    const g = ctx.createLinearGradient(-V.w * w / 2, -V.h * h / 2, V.w * w / 2, V.h * h / 2);
    g.addColorStop(0, hexA(theme.cyan, 0.12));
    g.addColorStop(0.55, hexA(theme.ink, 0.2));
    g.addColorStop(1, hexA("#b9a0ff", 0.14));
    ctx.fillStyle = g;
    ctx.fillRect(-V.w * w / 2 + 6, -V.h * h / 2 + 6, V.w * w - 12, V.h * h - 12);
    ctx.strokeStyle = hexA(theme.amber, 0.22);
    ctx.lineWidth = 4;
    ctx.strokeRect(-V.w * w / 2, -V.h * h / 2, V.w * w, V.h * h);
    ctx.strokeStyle = hexA(theme.paper, 0.12);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-V.w * w * 0.2, -V.h * h * 0.45);
    ctx.lineTo(V.w * w * 0.3, V.h * h * 0.4);
    ctx.stroke();
    if (index % 2 === 0) {
      ctx.fillStyle = hexA(theme.ink, 0.8);
      ctx.beginPath();
      ctx.ellipse(0, 0, V.w * w * 0.16, V.h * h * 0.3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  });

  // Floor and crawling shadows.
  ctx.fillStyle = hexA(theme.ink, 0.85);
  ctx.fillRect(0, V.h * 0.78, V.w, V.h * 0.22);
  for (let i = 0; i < 10; i++) {
    const x = rng() * V.w;
    ctx.beginPath();
    ctx.moveTo(x, V.h * 0.86);
    ctx.quadraticCurveTo(x + 20, V.h * 0.7, x + 70 + rng() * 60, V.h);
    ctx.strokeStyle = hexA(theme.ink, 0.8);
    ctx.lineWidth = 5 + rng() * 8;
    ctx.stroke();
  }
  glow(ctx, V.w * 0.5, V.h * 0.45, V.w * 0.4, "#b9a0ff", 0.08);
}

function shadowVoid(ctx, V, theme, rng) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#020207", "#0a0712");
  const cx = V.w * 0.5;
  const cy = V.h * 0.48;
  glow(ctx, cx, cy, V.w * 0.38, "#b9a0ff", 0.12);
  for (let i = 0; i < 18; i++) {
    const a = rng() * TAU;
    const r1 = V.w * (0.04 + rng() * 0.16);
    const r2 = V.w * (0.24 + rng() * 0.36);
    ctx.strokeStyle = hexA(theme.ink, 0.65 + rng() * 0.2);
    ctx.lineWidth = 4 + rng() * 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.5) * ((r1 + r2) / 2),
      cy + Math.sin(a + 0.5) * ((r1 + r2) / 2) - V.h * 0.08,
      cx + Math.cos(a) * r2,
      cy + Math.sin(a) * r2
    );
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const x = rng() * V.w;
    const y = rng() * V.h;
    const s = 8 + rng() * 24;
    poly(ctx, [
      [x, y],
      [x + s, y - s * 0.5],
      [x + s * 0.6, y + s],
      [x - s * 0.3, y + s * 0.4]
    ], hexA("#b9a0ff", 0.08), hexA("#b9a0ff", 0.22), 1.2);
  }
  ctx.fillStyle = hexA(theme.ink, 0.9);
  ctx.fillRect(0, V.h * 0.86, V.w, V.h * 0.14);
}

function martaHome(ctx, V, theme) {
  verticalGradient(ctx, 0, 0, V.w, V.h, "#2a1d1a", "#120d0e");
  // Wallpaper and warm light.
  ctx.fillStyle = hexA("#5a3b31", 0.22);
  ctx.fillRect(0, 0, V.w, V.h * 0.72);
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = hexA(theme.amber, 0.04);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(V.w * (i / 12), 0);
    ctx.lineTo(V.w * (i / 12), V.h * 0.72);
    ctx.stroke();
  }
  glow(ctx, V.w * 0.18, V.h * 0.2, V.w * 0.25, theme.amber, 0.2);

  // Window with the city.
  ctx.fillStyle = hexA("#070b14", 0.9);
  ctx.fillRect(V.w * 0.62, V.h * 0.12, V.w * 0.28, V.h * 0.36);
  ctx.strokeStyle = hexA(theme.ink, 0.9);
  ctx.lineWidth = 6;
  ctx.strokeRect(V.w * 0.62, V.h * 0.12, V.w * 0.28, V.h * 0.36);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.76, V.h * 0.12);
  ctx.lineTo(V.w * 0.76, V.h * 0.48);
  ctx.moveTo(V.w * 0.62, V.h * 0.3);
  ctx.lineTo(V.w * 0.9, V.h * 0.3);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = hexA(i % 3 === 0 ? theme.cyan : theme.amber, 0.4);
    ctx.fillRect(V.w * (0.64 + (i % 5) * 0.05), V.h * (0.16 + ((i * 7) % 11) * 0.025), 3, 3);
  }

  // Photo wall: the memories the shadow took.
  const photos = [
    [0.08, 0.18, 0.14, 0.12],
    [0.25, 0.14, 0.11, 0.14],
    [0.39, 0.2, 0.13, 0.1],
    [0.12, 0.37, 0.1, 0.13],
    [0.29, 0.39, 0.14, 0.1]
  ];
  photos.forEach(([x, y, w, h], index) => {
    ctx.fillStyle = hexA(theme.paper, 0.16);
    ctx.fillRect(V.w * x, V.h * y, V.w * w, V.h * h);
    ctx.strokeStyle = hexA(theme.ink, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeRect(V.w * x, V.h * y, V.w * w, V.h * h);
    ctx.fillStyle = hexA(theme.ink, 0.6);
    ctx.beginPath();
    ctx.arc(V.w * (x + w * 0.5), V.h * (y + h * 0.38), V.h * h * 0.12, 0, TAU);
    ctx.fill();
    ctx.fillRect(V.w * (x + w * 0.32), V.h * (y + h * 0.52), V.w * w * 0.36, V.h * h * 0.3);
    if (index === 0) {
      ctx.fillStyle = hexA(theme.amber, 0.7);
      ctx.fillRect(V.w * (x + w * 0.5 - 4), V.h * (y + h * 0.38 - 4), 8, 8);
    }
  });

  // Sofa, table and lamp.
  ctx.fillStyle = hexA("#392722", 0.95);
  rr(ctx, V.w * 0.18, V.h * 0.62, V.w * 0.42, V.h * 0.18, 18);
  ctx.fill();
  ctx.fillStyle = "#221817";
  ctx.fillRect(V.w * 0.2, V.h * 0.76, V.w * 0.38, V.h * 0.06);
  ctx.fillStyle = hexA(theme.ink, 0.9);
  rr(ctx, V.w * 0.24, V.h * 0.78, V.w * 0.26, V.h * 0.04, 4);
  ctx.fill();
  ctx.fillRect(V.w * 0.27, V.h * 0.82, V.w * 0.02, V.h * 0.16);
  ctx.fillRect(V.w * 0.45, V.h * 0.82, V.w * 0.02, V.h * 0.16);
  // Lamp.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(V.w * 0.53, V.h * 0.37);
  ctx.lineTo(V.w * 0.53, V.h * 0.7);
  ctx.stroke();
  ctx.fillStyle = hexA(theme.amber, 0.55);
  ctx.beginPath();
  ctx.moveTo(V.w * 0.47, V.h * 0.38);
  ctx.lineTo(V.w * 0.59, V.h * 0.38);
  ctx.lineTo(V.w * 0.57, V.h * 0.3);
  ctx.lineTo(V.w * 0.49, V.h * 0.3);
  ctx.closePath();
  ctx.fill();
  glow(ctx, V.w * 0.53, V.h * 0.36, V.w * 0.2, theme.amber, 0.24);

  // Floor and rug.
  ctx.fillStyle = hexA(theme.ink, 0.55);
  ctx.fillRect(0, V.h * 0.84, V.w, V.h * 0.16);
  ctx.fillStyle = hexA(theme.red, 0.12);
  ctx.beginPath();
  ctx.ellipse(V.w * 0.42, V.h * 0.88, V.w * 0.3, V.h * 0.06, 0, 0, TAU);
  ctx.fill();
}

export const BACKGROUNDS = {
  rooftopMilano,
  tramStreet,
  barInterior,
  depot,
  darsena,
  powerStation,
  hospitalCorridor,
  hospitalRoom,
  blackoutVortex: (ctx, V, theme, rng) => vortexBase(ctx, V, theme, rng, false),
  lightStorm: (ctx, V, theme, rng) => vortexBase(ctx, V, theme, rng, true),
  dawnNavigli,
  piazzaMorning,
  newspaper,
  galleriaMilano,
  metroPlatform,
  teatroStage,
  archiveOmbra,
  mirrorRoom,
  shadowVoid,
  martaHome
};
