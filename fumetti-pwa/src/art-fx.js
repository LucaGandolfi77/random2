import { TAU, hexA, rr, poly, glow, rain, fog } from "./art-core.js";

function fRain(ctx, V, theme, rng) {
  rain(ctx, V, rng, theme, 170, 0.32);
}

function fHeavyRain(ctx, V, theme, rng) {
  rain(ctx, V, rng, theme, 300, 0.42);
  fog(ctx, V, theme, rng, 0.08);
}

function fFog(ctx, V, theme, rng) {
  fog(ctx, V, theme, rng, 0.16);
}

function fLightning(ctx, V, theme, rng) {
  const x = V.w * (0.58 + rng() * 0.16);
  let y = 0;
  let px = x;
  const points = [[px, y]];
  for (let i = 0; i < 7; i++) {
    y += V.h * 0.06;
    px += (rng() - 0.5) * V.w * 0.06;
    points.push([px, y]);
  }
  ctx.save();
  ctx.strokeStyle = theme.glow;
  ctx.shadowColor = theme.cyan;
  ctx.shadowBlur = 26;
  ctx.lineWidth = 4;
  ctx.beginPath();
  points.forEach(([x1, y1], i) => (i ? ctx.lineTo(x1, y1) : ctx.moveTo(x1, y1)));
  ctx.stroke();

  const [bx, by] = points[3];
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + V.w * 0.045, by + V.h * 0.05);
  ctx.lineTo(bx + V.w * 0.018, by + V.h * 0.1);
  ctx.lineTo(bx + V.w * 0.07, by + V.h * 0.15);
  ctx.stroke();
  ctx.restore();
  glow(ctx, x, V.h * 0.25, V.w * 0.35, theme.cyan, 0.2);
}

function fSpeedLines(ctx, V, theme, rng) {
  const cx = V.w * 0.5;
  const cy = V.h * 0.55;
  ctx.save();
  ctx.strokeStyle = hexA(theme.paper, 0.2);
  ctx.lineWidth = 2;
  for (let i = 0; i < 38; i++) {
    const a = rng() * TAU;
    const r1 = V.w * (0.18 + rng() * 0.2);
    const r2 = r1 + V.w * (0.16 + rng() * 0.26);
    ctx.globalAlpha = 0.18 + rng() * 0.32;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

function fImpact(ctx, V, theme, rng) {
  const cx = V.w * 0.5;
  const cy = V.h * 0.5;
  glow(ctx, cx, cy, V.w * 0.26, theme.amber, 0.35);
  ctx.save();
  ctx.fillStyle = hexA(theme.glow, 0.85);
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TAU;
    const r = i % 2 ? V.w * 0.035 : V.w * (0.11 + rng() * 0.06);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.8;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fLightBeam(ctx, V, theme) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const x = V.w * (0.34 + i * 0.11);
    const g = ctx.createLinearGradient(x, V.h, x + V.w * 0.1, 0);
    g.addColorStop(0, hexA(theme.glow, 0.28));
    g.addColorStop(0.55, hexA(theme.amber, 0.1));
    g.addColorStop(1, hexA(theme.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - V.w * 0.06, V.h * 0.9);
    ctx.lineTo(x + V.w * 0.18, 0);
    ctx.lineTo(x + V.w * 0.42, 0);
    ctx.lineTo(x + V.w * 0.14, V.h * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function fDarkSmoke(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x = V.w * (0.15 + rng() * 0.75);
    const y = V.h * (0.35 + rng() * 0.55);
    const r = V.w * (0.08 + rng() * 0.18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(theme.ink, 0.55));
    g.addColorStop(0.6, hexA("#161a26", 0.24));
    g.addColorStop(1, hexA(theme.ink, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function fEmbers(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.15 + rng() * 0.75);
    const r = 1 + rng() * 3;
    ctx.globalAlpha = 0.25 + rng() * 0.6;
    ctx.fillStyle = rng() > 0.4 ? theme.amber : theme.glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function fGlass(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.55 + rng() * 0.4);
    const s = 6 + rng() * 20;
    poly(ctx, [
      [x, y],
      [x + s, y - s * 0.4],
      [x + s * 0.7, y + s * 0.6],
      [x - s * 0.2, y + s * 0.3]
    ], hexA(theme.ink, 0.7), hexA(theme.cyan, 0.5), 1.4);
  }
  ctx.restore();
}

function fPhoneLights(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.5 + rng() * 0.4);
    const w = 6 + rng() * 8;
    const h = 10 + rng() * 14;
    ctx.fillStyle = hexA(theme.cyan, 0.8);
    rr(ctx, x, y, w, h, 2);
    ctx.fill();
    glow(ctx, x + w / 2, y + h / 2, 22, theme.cyan, 0.24);
  }
  ctx.restore();
}

function fLightThreads(ctx, V, theme, rng) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cx = V.w * 0.5;
  const cy = V.h * 0.5;
  for (let i = 0; i < 34; i++) {
    const a = rng() * TAU;
    const r1 = V.w * (0.04 + rng() * 0.2);
    const r2 = V.w * (0.26 + rng() * 0.32);
    ctx.strokeStyle = hexA([theme.amber, theme.cyan, theme.glow][i % 3], 0.26 + rng() * 0.4);
    ctx.lineWidth = 1 + rng() * 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.7) * ((r1 + r2) / 2),
      cy + Math.sin(a + 0.7) * ((r1 + r2) / 2),
      cx + Math.cos(a) * r2,
      cy + Math.sin(a) * r2
    );
    ctx.stroke();
  }
  ctx.restore();
}

function fCafeTable(ctx, V, theme) {
  ctx.fillStyle = hexA("#2a1d13", 0.98);
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.82);
  ctx.quadraticCurveTo(V.w * 0.5, V.h * 0.76, V.w, V.h * 0.82);
  ctx.lineTo(V.w, V.h);
  ctx.lineTo(0, V.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(theme.amber, 0.3);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, V.h * 0.82);
  ctx.quadraticCurveTo(V.w * 0.5, V.h * 0.76, V.w, V.h * 0.82);
  ctx.stroke();
  for (const x of [0.3, 0.45, 0.6]) {
    ctx.fillStyle = "#efe7d6";
    ctx.beginPath();
    ctx.ellipse(V.w * x, V.h * 0.87, V.w * 0.028, V.h * 0.018, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#3b1d0e";
    ctx.beginPath();
    ctx.ellipse(V.w * x, V.h * 0.866, V.w * 0.02, V.h * 0.011, 0, 0, TAU);
    ctx.fill();
  }
}

function fShadowHands(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const fromLeft = i % 2 === 0;
    const x = fromLeft ? -V.w * 0.02 : V.w * 1.02;
    const y = V.h * (0.25 + rng() * 0.6);
    const tx = fromLeft
      ? V.w * (0.06 + rng() * 0.16)
      : V.w * (0.78 + rng() * 0.16);
    const ty = V.h * (0.32 + rng() * 0.5);
    ctx.strokeStyle = hexA(theme.ink, 0.58);
    ctx.lineWidth = 3 + rng() * 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + (fromLeft ? 1 : -1) * V.w * 0.1,
      y - V.h * 0.06,
      tx + (fromLeft ? -1 : 1) * V.w * 0.04,
      ty + V.h * 0.06,
      tx,
      ty
    );
    ctx.stroke();
    ctx.strokeStyle = hexA("#b9a0ff", 0.16);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

function fMirrorShards(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const x = V.w * (0.08 + rng() * 0.84);
    const y = V.h * (0.08 + rng() * 0.72);
    const s = 8 + rng() * 26;
    const a = rng() * TAU;
    const pts = [
      [x, y],
      [x + Math.cos(a) * s, y + Math.sin(a) * s],
      [x + Math.cos(a + 1.4) * s * 0.8, y + Math.sin(a + 1.4) * s * 0.8],
      [x + Math.cos(a + 2.4) * s * 0.6, y + Math.sin(a + 2.4) * s * 0.6]
    ];
    poly(ctx, pts, hexA("#b9a0ff", 0.08), hexA("#b9a0ff", 0.40), 1.2);
    glow(ctx, x, y, s * 1.4, "#b9a0ff", 0.06);
  }
  ctx.restore();
}

function fSpotlights(ctx, V, theme) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const x = V.w * (0.28 + i * 0.22);
    const g = ctx.createLinearGradient(x, 0, x + V.w * 0.08, V.h * 0.86);
    g.addColorStop(0, hexA(theme.glow, 0.22));
    g.addColorStop(0.55, hexA(theme.amber, 0.08));
    g.addColorStop(1, hexA(theme.amber, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - V.w * 0.02, 0);
    ctx.lineTo(x + V.w * 0.02, 0);
    ctx.lineTo(x + V.w * 0.18, V.h * 0.88);
    ctx.lineTo(x - V.w * 0.12, V.h * 0.88);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function fMemoryLights(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const x = V.w * (0.08 + rng() * 0.84);
    const y = V.h * (0.15 + rng() * 0.6);
    const w = 10 + rng() * 16;
    const h = 14 + rng() * 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rng() - 0.5) * 0.4);
    ctx.fillStyle = hexA(theme.glow, 0.16);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = hexA(theme.paper, 0.35);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = hexA(theme.ink, 0.5);
    ctx.beginPath();
    ctx.arc(0, -h * 0.15, h * 0.12, 0, TAU);
    ctx.fill();
    ctx.fillRect(-w * 0.15, h * 0.02, w * 0.3, h * 0.25);
    ctx.restore();
    glow(ctx, x, y, 26, theme.amber, 0.12);
  }
  ctx.restore();
}

function fFlicker(ctx, V, theme, rng) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const y = V.h * (0.15 + rng() * 0.7);
    ctx.fillStyle = hexA(theme.ink, 0.16 + rng() * 0.12);
    ctx.fillRect(0, y, V.w, 3 + rng() * 10);
  }
  ctx.restore();
}

export const FX = {
  rain: { layer: "front", draw: fRain },
  heavyRain: { layer: "front", draw: fHeavyRain },
  fog: { layer: "back", draw: fFog },
  lightning: { layer: "front", draw: fLightning },
  speedLines: { layer: "front", draw: fSpeedLines },
  impact: { layer: "front", draw: fImpact },
  lightBeam: { layer: "back", draw: fLightBeam },
  darkSmoke: { layer: "back", draw: fDarkSmoke },
  embers: { layer: "front", draw: fEmbers },
  glass: { layer: "front", draw: fGlass },
  phoneLights: { layer: "front", draw: fPhoneLights },
  lightThreads: { layer: "front", draw: fLightThreads },
  cafeTable: { layer: "front", draw: fCafeTable },
  shadowHands: { layer: "front", draw: fShadowHands },
  mirrorShards: { layer: "front", draw: fMirrorShards },
  spotlights: { layer: "back", draw: fSpotlights },
  memoryLights: { layer: "front", draw: fMemoryLights },
  flicker: { layer: "front", draw: fFlicker }
};
