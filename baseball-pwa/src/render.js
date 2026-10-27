/*
 * DIAMOND POLY '99 · 3D Perspective Low-Poly Stadium Renderer
 * -----------------------------------------------------------
 * True 3D camera projection with flat-shaded normal lighting, dynamic
 * Batter-Cam & Broadcast Follow-Cam, strike-zone reticle, ball trails,
 * articulated low-poly players, dirt clouds, and Home Run fireworks.
 */
import CONFIG from "./config.js";
import { buildPlayerMesh, boxMesh, prismMesh, transformMesh } from "./mesh.js";
import { BASE_COORDS, wallDistAtAngle, lerpBasePos } from "./physics.js";

let canvas = null;
let ctx = null;
let W = 0, H = 0, dpr = 1;

const cam = {
  x: 0, y: -5.2, z: 2.35,
  tx: 0, ty: 18.4, tz: 1.25,
  fov: 54
};

const rgbCache = {};
function hexToRgb(hex) {
  if (rgbCache[hex]) return rgbCache[hex];
  const clean = String(hex || "#ffffff").replace("#", "");
  const n = parseInt(clean.length === 3 ? clean[0]+clean[0]+clean[1]+clean[1]+clean[2]+clean[2] : clean, 16) || 0xffffff;
  const out = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache[hex] = out;
  return out;
}

function shadeHex(hex, factor) {
  const c = hexToRgb(hex);
  const r = Math.min(255, Math.max(0, (c[0] * factor) | 0));
  const g = Math.min(255, Math.max(0, (c[1] * factor) | 0));
  const b = Math.min(255, Math.max(0, (c[2] * factor) | 0));
  return `rgb(${r},${g},${b})`;
}

export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
}

export function resizeRenderer() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* Camera basis vectors computed once per frame */
let basis = {
  rx: 1, ry: 0, rz: 0,
  ux: 0, uy: 0, uz: 1,
  fx: 0, fy: 1, fz: 0,
  focal: 500
};

function updateCameraBasis() {
  let fx = cam.tx - cam.x;
  let fy = cam.ty - cam.y;
  let fz = cam.tz - cam.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;

  // World up = (0, 0, 1)
  let rx = fy * 1 - fz * 0;
  let ry = fz * 0 - fx * 1;
  let rz = fx * 0 - fy * 0;
  // Cross(f, [0,0,1]) = [fy, -fx, 0]
  rx = fy; ry = -fx; rz = 0;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;

  // u = Cross(r, f)
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;

  const fovRad = (cam.fov * Math.PI) / 180;
  const focal = (Math.min(W, H) * 0.5) / Math.tan(fovRad * 0.5);

  basis = { rx, ry, rz, ux, uy, uz, fx, fy, fz, focal };
}

export function project3D(wx, wy, wz) {
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;

  const cz = dx * basis.fx + dy * basis.fy + dz * basis.fz;
  if (cz <= 0.15) return null;

  const cx = dx * basis.rx + dy * basis.ry + dz * basis.rz;
  const cy = dx * basis.ux + dy * basis.uy + dz * basis.uz;

  const scale = basis.focal / cz;
  return {
    sx: W * 0.5 + cx * scale,
    sy: H * 0.50 - cy * scale,
    depth: cz,
    scale
  };
}

function drawPolygon3D(pts3D, fillStyle, strokeStyle = null, lineWidth = 1) {
  const proj = [];
  for (let i = 0; i < pts3D.length; i++) {
    const p = project3D(pts3D[i][0], pts3D[i][1], pts3D[i][2]);
    if (!p) return;
    proj.push(p);
  }
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(proj[0].sx, proj[0].sy);
  for (let i = 1; i < proj.length; i++) {
    ctx.lineTo(proj[i].sx, proj[i].sy);
  }
  ctx.closePath();
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawMesh3D(mesh, wx, wy, wz, heading, sky) {
  const c = Math.cos(heading), s = Math.sin(heading);
  const worldV = mesh.v.map((p) => [
    wx + p[0] * c - p[1] * s,
    wy + p[0] * s + p[1] * c,
    wz + p[2]
  ]);

  const facesToDraw = [];
  for (let i = 0; i < mesh.f.length; i++) {
    const face = mesh.f[i];
    const pts = [];
    let avgDepth = 0;
    let clipped = false;
    for (let k = 0; k < face.idx.length; k++) {
      const vp = worldV[face.idx[k]];
      const pr = project3D(vp[0], vp[1], vp[2]);
      if (!pr) { clipped = true; break; }
      pts.push(pr);
      avgDepth += pr.depth;
    }
    if (clipped) continue;
    avgDepth /= face.idx.length;

    const nx = face.n[0] * c - face.n[1] * s;
    const ny = face.n[0] * s + face.n[1] * c;
    const nz = face.n[2];
    const dot = Math.max(0, nx * sky.sun[0] + ny * sky.sun[1] + nz * sky.sun[2]);
    const light = (sky.ambient + (1 - sky.ambient) * dot) * (face.tone || 1);

    facesToDraw.push({
      pts,
      depth: avgDepth,
      color: shadeHex(face.c, light),
      edge: shadeHex(face.c, light * 0.65)
    });
  }

  facesToDraw.sort((a, b) => b.depth - a.depth);
  for (let i = 0; i < facesToDraw.length; i++) {
    const f = facesToDraw[i];
    ctx.fillStyle = f.color;
    ctx.strokeStyle = f.edge;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
    for (let k = 1; k < f.pts.length; k++) ctx.lineTo(f.pts[k].sx, f.pts[k].sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawShadow(wx, wy, radius) {
  const p = project3D(wx, wy, 0.02);
  if (!p) return;
  const rx = Math.max(2, radius * p.scale);
  const ry = Math.max(1, rx * 0.42);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function renderFrame(state, dt) {
  if (!canvas || !ctx) return;
  const sky = CONFIG.skies[state.skyKey] || CONFIG.skies.day;

  // Smooth camera transition based on game phase
  let targetCam;
  if (state.phase === "in_play" || state.phase === "homerun") {
    const bx = state.ball.x || 0;
    const by = Math.max(10, state.ball.y || 20);
    const bz = Math.max(0, state.ball.z || 0);
    targetCam = {
      x: bx * 0.18,
      y: -25.0,
      z: 19.5,
      tx: bx * 0.35,
      ty: 20.5 + by * 0.22,
      tz: Math.min(10, bz * 0.25),
      fov: 52
    };
  } else {
    // Classic 3D Batter's Eye camera behind Home Plate
    targetCam = {
      x: 0,
      y: -5.15,
      z: 2.28,
      tx: 0,
      ty: 18.44,
      tz: 1.18,
      fov: 50
    };
  }

  const lerp = Math.min(1, dt * 5.5);
  cam.x += (targetCam.x - cam.x) * lerp;
  cam.y += (targetCam.y - cam.y) * lerp;
  cam.z += (targetCam.z - cam.z) * lerp;
  cam.tx += (targetCam.tx - cam.tx) * lerp;
  cam.ty += (targetCam.ty - cam.ty) * lerp;
  cam.tz += (targetCam.tz - cam.tz) * lerp;
  cam.fov += (targetCam.fov - cam.fov) * lerp;

  updateCameraBasis();

  // 1. Sky Dome Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  skyGrad.addColorStop(0, sky.top);
  skyGrad.addColorStop(0.55, sky.mid);
  skyGrad.addColorStop(1, sky.horizon);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Ground backdrop fill
  ctx.fillStyle = sky.turfB;
  ctx.fillRect(0, H * 0.42, W, H * 0.58);

  // 2. Checkerboard Low-Poly Outfield & Infield Grass Strips
  const radialBands = 8;
  const angleSlices = 14;
  for (let r = radialBands - 1; r >= 0; r--) {
    const r0 = (r / radialBands) * 124;
    const r1 = ((r + 1) / radialBands) * 124;
    for (let s = 0; s < angleSlices; s++) {
      const a0 = -Math.PI * 0.34 + (s / angleSlices) * (Math.PI * 0.68);
      const a1 = -Math.PI * 0.34 + ((s + 1) / angleSlices) * (Math.PI * 0.68);
      const p0 = [Math.sin(a0) * r0, Math.cos(a0) * r0, 0];
      const p1 = [Math.sin(a1) * r0, Math.cos(a1) * r0, 0];
      const p2 = [Math.sin(a1) * r1, Math.cos(a1) * r1, 0];
      const p3 = [Math.sin(a0) * r1, Math.cos(a0) * r1, 0];
      const shade = (r + s) % 2 === 0 ? sky.turfA : sky.turfB;
      drawPolygon3D([p0, p1, p2, p3], shade);
    }
  }

  // 3. Outfield Warning Track, Stadium Fence, Grandstands & Floodlight Towers
  const wallSegs = 16;
  for (let i = 0; i < wallSegs; i++) {
    const a0 = -Math.PI * 0.28 + (i / wallSegs) * (Math.PI * 0.56);
    const a1 = -Math.PI * 0.28 + ((i + 1) / wallSegs) * (Math.PI * 0.56);
    const d0 = wallDistAtAngle(a0);
    const d1 = wallDistAtAngle(a1);
    const x0 = Math.sin(a0) * d0, y0 = Math.cos(a0) * d0;
    const x1 = Math.sin(a1) * d1, y1 = Math.cos(a1) * d1;

    // Outfield Wall Panel
    drawPolygon3D(
      [[x0, y0, 0], [x1, y1, 0], [x1, y1, 4.2], [x0, y0, 4.2]],
      i % 2 === 0 ? "#0f172a" : "#1e293b",
      "#f59e0b",
      1.2
    );

    // Low-poly Bleacher Tier behind wall
    const bx0 = Math.sin(a0) * (d0 + 22), by0 = Math.cos(a0) * (d0 + 22);
    const bx1 = Math.sin(a1) * (d1 + 22), by1 = Math.cos(a1) * (d1 + 22);
    drawPolygon3D(
      [[x0, y0, 4.2], [x1, y1, 4.2], [bx1, by1, 16.5], [bx0, by0, 16.5]],
      i % 2 === 0 ? "#334155" : "#1e293b",
      "rgba(255,255,255,0.12)",
      0.8
    );
  }

  // Center-field Low-Poly Jumbotron Scoreboard
  drawPolygon3D(
    [[-16, 128, 4.5], [16, 128, 4.5], [16, 128, 19.5], [-16, 128, 19.5]],
    "#090d16",
    "#38bdf8",
    2
  );

  // Stadium Light Towers (glowing haloes)
  [-0.24, -0.10, 0.10, 0.24].forEach((ang) => {
    const d = wallDistAtAngle(ang) + 18;
    const lx = Math.sin(ang) * d, ly = Math.cos(ang) * d;
    const topP = project3D(lx, ly, 26);
    const botP = project3D(lx, ly, 14);
    if (topP && botP) {
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = Math.max(1.5, 3 * topP.scale * 0.04);
      ctx.beginPath();
      ctx.moveTo(botP.sx, botP.sy);
      ctx.lineTo(topP.sx, topP.sy);
      ctx.stroke();

      const g = ctx.createRadialGradient(topP.sx, topP.sy, 1, topP.sx, topP.sy, 32);
      g.addColorStop(0, "rgba(255, 250, 220, 0.9)");
      g.addColorStop(0.4, "rgba(56, 189, 248, 0.25)");
      g.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(topP.sx, topP.sy, 32, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 4. Infield Dirt Diamond, Basepaths, Chalk Foul Lines & Pitcher's Mound
  const B = 19.40;
  drawPolygon3D(
    [[0, -2.8, 0.01], [B + 3.5, B, 0.01], [0, B * 2 + 4.0, 0.01], [-B - 3.5, B, 0.01]],
    sky.dirt
  );
  // Inner Infield Grass Diamond
  drawPolygon3D(
    [[0, 4.2, 0.02], [B - 4.2, B, 0.02], [0, B * 2 - 4.2, 0.02], [-B + 4.2, B, 0.02]],
    sky.turfA
  );

  // Pitcher's Mound Dirt Circle
  const moundPts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    moundPts.push([Math.cos(a) * 2.7, 18.44 + Math.sin(a) * 2.7, 0.04]);
  }
  drawPolygon3D(moundPts, sky.dirt);

  // Chalk Foul Lines (Home -> 1B -> Right Field Pole, Home -> 3B -> Left Field Pole)
  const foulR = CONFIG.field.fenceCorner;
  const f1 = project3D(0, 0, 0.03);
  const fR = project3D(Math.sin(Math.PI / 4) * foulR, Math.cos(Math.PI / 4) * foulR, 0.03);
  const fL = project3D(-Math.sin(Math.PI / 4) * foulR, Math.cos(Math.PI / 4) * foulR, 0.03);
  if (f1 && fR) {
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f1.sx, f1.sy);
    ctx.lineTo(fR.sx, fR.sy);
    ctx.stroke();
  }
  if (f1 && fL) {
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f1.sx, f1.sy);
    ctx.lineTo(fL.sx, fL.sy);
    ctx.stroke();
  }

  // 3D Low-Poly Base Bags (1B, 2B, 3B, Home Plate)
  for (let b = 0; b <= 3; b++) {
    const bc = BASE_COORDS[b];
    const bagMesh = boxMesh(b === 0 ? 0.55 : 0.65, b === 0 ? 0.55 : 0.65, 0.12, "#ffffff");
    drawMesh3D(bagMesh, bc[0], bc[1], 0.06, Math.PI / 4, sky);
  }

  // 5. Draw 9 Low-Poly Fielders + Pitcher + Active Baserunners + Batter (depth-sorted)
  const entities = [];

  // Fielders
  const oppTeam = CONFIG.teams.find((t) => t.id === state.oppTeamId) || CONFIG.teams[0];
  state.fielders.forEach((f) => {
    if (state.phase !== "in_play" && f.role === "C") return; // keep behind-plate view clear during pitch
    entities.push({
      x: f.x,
      y: f.y,
      z: 0,
      heading: f.heading || Math.PI,
      mesh: buildPlayerMesh({
        jersey: oppTeam.primary,
        pants: "#e2e8f0",
        cap: oppTeam.primary,
        stride: f.Moving ? state.clock * 14 : 0
      })
    });
  });

  // Active Baserunners
  state.runners.forEach((r) => {
    const pos = lerpBasePos(r.progress);
    const nextIdx = Math.min(4, Math.floor(r.progress) + 1);
    const nextPos = BASE_COORDS[nextIdx];
    const heading = Math.atan2(nextPos[0] - pos[0], nextPos[1] - pos[1]);
    entities.push({
      x: pos[0],
      y: pos[1],
      z: 0,
      heading,
      label: r.sliding ? "SLIDE!" : null,
      mesh: buildPlayerMesh({
        jersey: "#22c55e",
        pants: "#ffffff",
        cap: "#15803d",
        stride: state.clock * 18,
        sliding: r.sliding
      })
    });
  });

  // Batter at Home Plate (when not yet running to 1st)
  if (state.phase !== "in_play") {
    const batSpec = CONFIG.bats.find((b) => b.id === state.batId) || CONFIG.bats[0];
    entities.push({
      x: -0.78,
      y: 0.15,
      z: 0,
      heading: 0.35 + state.swingAnim * 2.2,
      mesh: buildPlayerMesh({
        jersey: "#22c55e",
        pants: "#f8fafc",
        cap: "#15803d",
        batColor: batSpec.color,
        swingAngle: -0.6 + state.swingAnim * 2.6
      })
    });
  }

  // Sort entities back-to-front by camera depth
  entities.forEach((e) => {
    const pr = project3D(e.x, e.y, e.z);
    e.depth = pr ? pr.depth : 999;
  });
  entities.sort((a, b) => b.depth - a.depth);

  entities.forEach((e) => {
    drawShadow(e.x, e.y, 0.45);
    drawMesh3D(e.mesh, e.x, e.y, e.z, e.heading, sky);
    if (e.label) {
      const lp = project3D(e.x, e.y, 1.4);
      if (lp) {
        ctx.font = "900 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(e.label, lp.sx, lp.sy);
      }
    }
  });

  // 6. Strike Zone & Player Aim Reticle (during batting)
  if (state.phase === "ready" || state.phase === "windup" || state.phase === "pitch") {
    const szCorners = [
      [-0.44, 0, 0.56],
      [0.44,  0, 0.56],
      [0.44,  0, 1.42],
      [-0.44, 0, 1.42]
    ].map((c) => project3D(c[0], c[1], c[2]));

    if (szCorners.every(Boolean)) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(szCorners[0].sx, szCorners[0].sy);
      szCorners.slice(1).forEach((p) => ctx.lineTo(p.sx, p.sy));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Pitch Landing Preview Ring (tightens as ball approaches plate)
    if (state.phase === "pitch" && state.currentPitch) {
      const tp = project3D(state.currentPitch.targetX, 0, state.currentPitch.targetZ);
      const u = Math.max(0, Math.min(1, state.currentPitch.elapsed / state.currentPitch.flightTime));
      if (tp && u > 0.18) {
        const ringR = Math.max(8, (1 - u) * 52 + 10);
        ctx.strokeStyle = u > 0.84 && u < 1.06 ? "#22c55e" : "rgba(56, 189, 248, 0.65)";
        ctx.lineWidth = u > 0.84 && u < 1.06 ? 3 : 1.8;
        ctx.beginPath();
        ctx.arc(tp.sx, tp.sy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Batter Sweet-Spot Aim Reticle
    const aimP = project3D(state.aimX, 0, state.aimZ);
    if (aimP) {
      const rRadius = state.stance === "contact" ? 30 : state.stance === "bunt" ? 34 : 23;
      ctx.strokeStyle = state.charging ? "#fbbf24" : "rgba(251, 191, 36, 0.82)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(aimP.sx, aimP.sy, rRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(aimP.sx - rRadius - 6, aimP.sy);
      ctx.lineTo(aimP.sx - rRadius + 6, aimP.sy);
      ctx.moveTo(aimP.sx + rRadius - 6, aimP.sy);
      ctx.lineTo(aimP.sx + rRadius + 6, aimP.sy);
      ctx.moveTo(aimP.sx, aimP.sy - rRadius - 6);
      ctx.lineTo(aimP.sx, aimP.sy - rRadius + 6);
      ctx.moveTo(aimP.sx, aimP.sy + rRadius - 6);
      ctx.lineTo(aimP.sx, aimP.sy + rRadius + 6);
      ctx.stroke();
    }
  }

  // 7. 3D Baseball, Shadow & Comet Trail
  if (state.ball.visible) {
    drawShadow(state.ball.x, state.ball.y, 0.25);

    // Ball trail
    if (state.ball.trail && state.ball.trail.length > 1) {
      for (let i = 1; i < state.ball.trail.length; i++) {
        const p0 = project3D(state.ball.trail[i - 1][0], state.ball.trail[i - 1][1], state.ball.trail[i - 1][2]);
        const p1 = project3D(state.ball.trail[i][0], state.ball.trail[i][1], state.ball.trail[i][2]);
        if (p0 && p1) {
          const alpha = (i / state.ball.trail.length) * 0.65;
          ctx.strokeStyle = state.ball.isHomer ? `rgba(251, 191, 36, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = Math.max(1.5, (i / state.ball.trail.length) * 6);
          ctx.beginPath();
          ctx.moveTo(p0.sx, p0.sy);
          ctx.lineTo(p1.sx, p1.sy);
          ctx.stroke();
        }
      }
    }

    const bp = project3D(state.ball.x, state.ball.y, state.ball.z);
    if (bp) {
      const br = Math.max(4, Math.min(18, 0.14 * bp.scale));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bp.sx, bp.sy, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = Math.max(1, br * 0.22);
      ctx.stroke();
    }
  }

  // 8. 3D Low-Poly Particles (Dirt clouds on slides, fireworks on Home Runs!)
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.z += pt.vz * dt;
    pt.vz -= 6.0 * dt;
    const pp = project3D(pt.x, pt.y, Math.max(0.05, pt.z));
    if (pp) {
      const sz = Math.max(2, pt.size * (pt.life / pt.maxLife));
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(pp.sx, pp.sy - sz);
      ctx.lineTo(pp.sx + sz * 0.9, pp.sy + sz * 0.7);
      ctx.lineTo(pp.sx - sz * 0.9, pp.sy + sz * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }
}
