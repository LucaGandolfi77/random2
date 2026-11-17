/* Procedural Canvas art for Machine Hunt. Original brick-world shapes only. */
import { ARENA, GRID, VILLAGERS, VILLAGE_ITEMS, BIOMES, HAZARDS } from "./data.js";

const TAU = Math.PI * 2;
let palette = "default";

export function setPalette(name) {
  palette = ["default", "colorblind", "contrast"].includes(name) ? name : "default";
}

/* Older Safari lacks roundRect; keep the game dependency-free. */
if (typeof CanvasRenderingContext2D !== "undefined" &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

function brick(ctx, x, y, w, h, color, studs = 2) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fillRect(x, y, w, Math.max(5, h * 0.16));
  const step = w / studs;
  const r = Math.min(7, step * 0.26);
  for (let i = 0; i < studs; i++) {
    ctx.fillStyle = "rgba(255,255,255,.3)";
    ctx.beginPath();
    ctx.arc(x + step * (i + 0.5), y + 6, r, 0, TAU);
    ctx.fill();
  }
}

function minifig(ctx, x, y, scale, torso, hair, bow = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(-9, 14, 8, 16);
  ctx.fillRect(2, 14, 8, 16);
  ctx.fillStyle = torso;
  ctx.beginPath();
  ctx.roundRect(-12, -2, 24, 22, 5);
  ctx.fill();
  ctx.fillStyle = "#f1c27d";
  ctx.fillRect(-18, 0, 6, 17);
  ctx.fillRect(12, 0, 6, 17);
  ctx.beginPath();
  ctx.arc(0, -10, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -12, 10, Math.PI, TAU);
  ctx.fill();
  if (bow) {
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, -8);
    ctx.quadraticCurveTo(36, 4, 18, 24);
    ctx.stroke();
    ctx.strokeStyle = "#efe7d2";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, -8);
    ctx.lineTo(18, 24);
    ctx.stroke();
  }
  ctx.restore();
}

function tree(ctx, x, y, s) {
  ctx.fillStyle = "#5a3a2a";
  ctx.fillRect(x - 7 * s, y, 14 * s, 48 * s);
  const greens = ["#235239", "#2e6b43", "#3f8352"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = greens[i];
    ctx.beginPath();
    ctx.arc(x + (i - 1) * 16 * s, y - 8 * s + i * 4 * s, 26 * s, 0, TAU);
    ctx.fill();
  }
}

function scout(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -18, -10, 36, 20, e.hitFlash > 0 ? "#ffd7a0" : "#9aa9b5", 3);
  ctx.fillStyle = "#5d7180";
  ctx.fillRect(-12, 10, 7, 16);
  ctx.fillRect(6, 10, 7, 16);
  ctx.fillStyle = "#6fd8ff";
  ctx.beginPath();
  ctx.arc(16, -2, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function grazer(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -26, -15, 52, 30, e.hitFlash > 0 ? "#ffe0b0" : "#b0a08c", 4);
  ctx.fillStyle = "#6b5f52";
  ctx.fillRect(-20, 15, 10, 20);
  ctx.fillRect(10, 15, 10, 20);
  ctx.fillStyle = "#e8733c";
  ctx.beginPath();
  ctx.arc(22, -4, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function lancer(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -20, -9, 40, 18, e.hitFlash > 0 ? "#ffe0b0" : "#8aa6b5", 3);
  ctx.fillStyle = "#d9e2e8";
  ctx.fillRect(14, -3, 30, 6);
  ctx.fillStyle = "#6fd8ff";
  ctx.beginPath();
  ctx.arc(15, -6, 4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#5d7180";
  ctx.fillRect(-14, 9, 6, 14);
  ctx.fillRect(6, 9, 6, 14);
  ctx.restore();
}

function bulwark(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -28, -17, 56, 34, e.hitFlash > 0 ? "#ffe0b0" : "#9c8c78", 4);
  ctx.fillStyle = "#6b5f52";
  ctx.fillRect(-20, 17, 9, 18);
  ctx.fillRect(11, 17, 9, 18);
  ctx.strokeStyle = "#d9e2e8";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 34, -0.9, 0.9);
  ctx.stroke();
  ctx.fillStyle = "#e8733c";
  ctx.beginPath();
  ctx.arc(20, -6, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function burrower(ctx, e) {
  if (e.burrowed) {
    ctx.fillStyle = "rgba(120,90,60,.9)";
    ctx.beginPath();
    ctx.arc(e.x, e.y + 10, 22, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = "#8a6a45";
    ctx.fillRect(e.x - 8, e.y - 4, 16, 6);
    return;
  }
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -18, -10, 36, 20, e.hitFlash > 0 ? "#ffe0b0" : "#8a7d68", 3);
  ctx.fillStyle = "#5d7180";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 12 - 6, -8);
    ctx.lineTo(i * 12, -22);
    ctx.lineTo(i * 12 + 6, -8);
    ctx.fill();
  }
  ctx.restore();
}

function boss(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  const colors = {
    boss: "#8fa2aa", thunderjaw: "#a9764f", rockbreaker: "#7d7a6b", corrupted: "#7a5c96",
  };
  const base = colors[e.bossType] || colors.boss;
  const body = e.phase === 3 ? "#d07a5a" : e.phase === 2 ? "#b58b84" : base;
  brick(ctx, -50, -26, 100, 52, e.hitFlash > 0 ? "#ffe0b0" : body, 5);
  ctx.fillStyle = "#5d7180";
  ctx.fillRect(-34, 26, 16, 36);
  ctx.fillRect(18, 26, 16, 36);
  if (e.bossType === "rockbreaker") {
    brick(ctx, -60, -40, 34, 22, "#6b6a5c", 2);
    brick(ctx, 30, -40, 34, 22, "#6b6a5c", 2);
  } else if (e.bossType === "thunderjaw") {
    ctx.fillStyle = "#d9e2e8";
    ctx.fillRect(-42, -36, 14, 14);
    ctx.fillRect(28, -36, 14, 14);
  }
  ctx.fillStyle = "#8397a3";
  ctx.fillRect(28, -96, 24, 80);
  brick(ctx, 16, -126, 62, 34, "#a8b8c0", 3);
  if (e.bossType === "corrupted") {
    ctx.fillStyle = "#c77dff";
    ctx.beginPath(); ctx.arc(0, -142, 10, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = e.phase === 3 ? "#ff8b5c" : "#6fd8ff";
  ctx.beginPath();
  ctx.arc(64, -110, 7, 0, TAU);
  ctx.fill();
  if (e.chargeTime > 0) {
    ctx.strokeStyle = "rgba(255,139,92,.8)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(140, 0); ctx.stroke();
  }
  ctx.restore();
}

function backdrop(ctx, t, hub = false, biome = "jungle") {
  const sky = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  if (hub) {
    sky.addColorStop(0, "#16332c");
    sky.addColorStop(0.55, "#3f7048");
    sky.addColorStop(1, "#c7b169");
  } else {
    const colors = BIOMES[biome]?.sky || BIOMES.jungle.sky;
    sky.addColorStop(0, colors[0]);
    sky.addColorStop(0.5, colors[1]);
    sky.addColorStop(1, colors[2]);
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  ctx.fillStyle = hub ? "rgba(255,225,160,.85)" : "rgba(255,225,160,.35)";
  ctx.beginPath();
  ctx.arc(hub ? 380 : 460, hub ? 260 : 180, hub ? 78 : 62, 0, TAU);
  ctx.fill();

  ctx.fillStyle = hub ? "#2d5944" : "#254f3b";
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.lineTo(180, 470);
  ctx.lineTo(380, 540);
  ctx.lineTo(520, 460);
  ctx.lineTo(ARENA.width, 520);
  ctx.lineTo(ARENA.width, ARENA.height);
  ctx.lineTo(0, ARENA.height);
  ctx.closePath();
  ctx.fill();
}

function tileFloor(ctx) {
  ctx.strokeStyle = "rgba(255,255,255,.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= ARENA.width; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.height); ctx.stroke();
  }
  for (let y = 0; y <= ARENA.height; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA.width, y); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(164,208,7,.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, ARENA.width - 12, ARENA.height - 12);
}

function drawHazards(ctx, hazards, t) {
  for (const h of hazards || []) {
    const def = HAZARDS[h.type] || {};
    ctx.save();
    if (h.type === "lava") {
      ctx.fillStyle = h.active ? "rgba(232,115,60,.62)" : "rgba(232,115,60,.22)";
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ff8b5c"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.stroke();
      if (h.active) {
        ctx.fillStyle = "rgba(255,220,140,.7)";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(h.x + Math.sin(t * 3 + i) * 18, h.y + Math.cos(t * 2 + i) * 16, 4, 0, TAU);
          ctx.fill();
        }
      }
    } else if (h.type === "quicksand") {
      ctx.fillStyle = "rgba(156,140,120,.3)";
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(220,205,180,.5)"; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 12 + i * 14, 0, Math.PI * 1.6);
        ctx.stroke();
      }
    } else if (h.type === "ice") {
      ctx.fillStyle = "rgba(159,216,232,.28)";
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(h.x - 20, h.y); ctx.lineTo(h.x + 20, h.y);
      ctx.moveTo(h.x, h.y - 20); ctx.lineTo(h.x, h.y + 20); ctx.stroke();
    } else if (h.type === "spikes") {
      ctx.fillStyle = h.active ? "rgba(217,226,232,.7)" : "rgba(217,226,232,.18)";
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = h.active ? "#ffffff" : "rgba(255,255,255,.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const r = h.radius * 0.6;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r);
        ctx.lineTo(h.x + Math.cos(a) * (r + 12), h.y + Math.sin(a) * (r + 12));
        ctx.stroke();
      }
    }
    void def;
    ctx.restore();
  }
}

function drawTelegraph(ctx, e) {
  ctx.strokeStyle = e.attackKind === "shot"
    ? "rgba(111,216,255,.9)" : "rgba(232,115,60,.85)";
  ctx.lineWidth = 3;
  if (e.attackKind === "shot") {
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + Math.cos(e.angle) * 260, e.y + Math.sin(e.angle) * 260);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 12, 0, TAU);
    ctx.stroke();
  }
}

function stalker(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -16, -9, 32, 18, e.hitFlash > 0 ? "#ffe0b0" : "#5f9e8b", 3);
  ctx.strokeStyle = "#3f7a6a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-10, 9); ctx.lineTo(-18, 24);
  ctx.moveTo(10, 9); ctx.lineTo(18, 24);
  ctx.stroke();
  ctx.fillStyle = "#7fe3ff";
  ctx.beginPath(); ctx.arc(14, -2, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

function flyer(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -16, -10, 32, 20, e.hitFlash > 0 ? "#ffe0b0" : "#8fa9bd", 3);
  ctx.strokeStyle = "#d9e2e8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-22, -12, 12, 0, TAU);
  ctx.arc(22, -12, 12, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#ffd873";
  ctx.beginPath(); ctx.arc(14, 0, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

function charger(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  brick(ctx, -26, -15, 52, 30, e.hitFlash > 0 ? "#ffe0b0" : "#ad7457", 4);
  ctx.strokeStyle = "#e8d8c0";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(20, -12); ctx.lineTo(40, -22);
  ctx.moveTo(20, 12); ctx.lineTo(40, 22);
  ctx.stroke();
  ctx.fillStyle = "#ff8b5c";
  ctx.beginPath(); ctx.arc(22, -4, 5, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e) {
  if (palette === "contrast") {
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 6, 0, TAU);
    ctx.stroke();
  }
  if (e.boss || e.type === "boss") boss(ctx, e);
  else if (e.type === "grazer") grazer(ctx, e);
  else if (e.type === "lancer") lancer(ctx, e);
  else if (e.type === "bulwark") bulwark(ctx, e);
  else if (e.type === "burrower") burrower(ctx, e);
  else if (e.type === "stalker") stalker(ctx, e);
  else if (e.type === "flyer") flyer(ctx, e);
  else if (e.type === "charger") charger(ctx, e);
  else scout(ctx, e);

  if (e.statuses && Object.keys(e.statuses).length) {
    const keys = Object.keys(e.statuses);
    keys.slice(0, 3).forEach((key, i) => {
      const colors = { freeze: "#7fe3ff", shock: "#b8e0ff", burn: "#ff8b5c", stun: "#f2c14e" };
      ctx.fillStyle = colors[key] || "#fff";
      ctx.beginPath();
      ctx.arc(e.x - 10 + i * 10, e.y - e.radius - 12, 4, 0, TAU);
      ctx.fill();
    });
  }

  if (palette === "colorblind") {
    const y = e.y - e.radius - 30;
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#0b1418";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (e.type === "lancer") {
      ctx.moveTo(e.x, y - 8); ctx.lineTo(e.x + 8, y + 6); ctx.lineTo(e.x - 8, y + 6);
    } else if (e.type === "bulwark") {
      ctx.rect(e.x - 7, y - 7, 14, 14);
    } else if (e.type === "burrower") {
      ctx.moveTo(e.x, y - 9); ctx.lineTo(e.x + 9, y); ctx.lineTo(e.x, y + 9); ctx.lineTo(e.x - 9, y);
    } else if (e.type === "grazer") {
      ctx.arc(e.x, y, 8, 0, TAU);
    } else {
      ctx.arc(e.x, y, 5, 0, TAU);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBossBar(ctx, hunt) {
  if (hunt.bossHp === null || hunt.bossHp <= 0) return;
  const w = ARENA.width - 120;
  const x = 60;
  const y = 34;
  ctx.fillStyle = "rgba(8,14,18,.8)";
  ctx.fillRect(x - 8, y - 14, w + 16, 46);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = hunt.bossPhase === 3 ? "#ff6b81" : "#e8733c";
  ctx.fillRect(x, y, w * Math.max(0, hunt.bossHp / hunt.bossMaxHp), 10);
  ctx.fillStyle = "#f7f9fb";
  ctx.font = "800 15px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${(hunt.bossLabel || "BOSS").toUpperCase()} · PHASE ${Math.max(1, hunt.bossPhase)}`, ARENA.width / 2, y + 26);
}

export function cellRect(cell) {
  const col = cell % GRID.cols;
  const row = Math.floor(cell / GRID.cols);
  return {
    x: GRID.x + col * GRID.cellW,
    y: GRID.y + row * GRID.cellH,
    w: GRID.cellW,
    h: GRID.cellH,
  };
}

export function villageHitTest(x, y) {
  for (const [key, v] of Object.entries(VILLAGERS)) {
    if (Math.hypot(x - v.x, y - v.y) < 42) return { type: "villager", key, label: v.label };
  }
  const placements = currentVillage;
  for (const p of placements) {
    const r = cellRect(p.cell);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      return { type: "item", key: p.key, cell: p.cell, label: VILLAGE_ITEMS[p.key]?.label || p.key };
    }
  }
  return null;
}

let currentVillage = [];

function drawPlacedItem(ctx, key, cx, cy, night) {
  if (key === "workshop") brick(ctx, cx - 30, cy - 26, 60, 46, "#b9794a", 3);
  else if (key === "garden") {
    brick(ctx, cx - 34, cy + 4, 68, 12, "#7a5a3c", 3);
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = "#6fbf5a";
      ctx.beginPath(); ctx.arc(cx - 24 + j * 16, cy - 8, 7, 0, TAU); ctx.fill();
    }
  } else if (key === "banner") {
    ctx.fillStyle = "#8c3b2f";
    ctx.fillRect(cx - 24, cy - 48, 48, 44);
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath(); ctx.arc(cx, cy - 26, 9, 0, TAU); ctx.fill();
  } else if (key === "lookout") {
    brick(ctx, cx - 18, cy - 46, 36, 46, "#8d9a78", 2);
    ctx.fillStyle = "#3b2a22";
    ctx.fillRect(cx - 22, cy - 54, 44, 12);
  } else if (key === "lantern") {
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(cx - 3, cy - 10, 6, 34);
    ctx.fillStyle = night ? "#fff0b0" : "#f2c14e";
    ctx.beginPath(); ctx.arc(cx, cy - 16, 12, 0, TAU); ctx.fill();
    if (night) {
      const g = ctx.createRadialGradient(cx, cy - 16, 4, cx, cy - 16, 60);
      g.addColorStop(0, "rgba(255,230,150,.42)");
      g.addColorStop(1, "rgba(255,230,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 60, cy - 76, 120, 120);
    }
  } else if (key === "statue") {
    brick(ctx, cx - 20, cy - 8, 40, 16, "#9aa9b5", 2);
    minifig(ctx, cx, cy - 24, 1.3, "#f2c14e", "#8fa2aa");
  } else {
    brick(ctx, cx - 26, cy - 20, 52, 40, "#9a8468", 3);
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.fillRect(cx - 8, cy - 10, 16, 16);
  }
}

export function renderHub(ctx, save, t) {
  const hour = new Date().getHours();
  const night = hour >= 19 || hour < 6;
  backdrop(ctx, t, true);
  if (night) {
    ctx.fillStyle = "rgba(12,20,48,.42)";
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }
  tree(ctx, 52, 196, 1.0);
  tree(ctx, 548, 200, 0.9);

  /* village grid */
  const placements = save.village?.placements || [];
  currentVillage = placements;
  for (let cell = 0; cell < GRID.cols * GRID.rows; cell++) {
    const r = cellRect(cell);
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 1;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  for (const p of placements) {
    const r = cellRect(p.cell);
    drawPlacedItem(ctx, p.key, r.x + r.w / 2, r.y + r.h / 2, night);
  }

  /* villagers */
  const villagerHour = new Date().getHours();
  const shift = villagerHour >= 19 || villagerHour < 6 ? -18 : 0;
  for (const [key, v] of Object.entries(VILLAGERS)) {
    const colors = { aloy: "#c44536", varl: "#8c6b45", teersa: "#4f9d8b" };
    minifig(ctx, v.x, v.y + shift + Math.sin(t * 2 + v.x) * 2, 1.7, colors[key], "#2c3e50");
    if (save.villagerMet?.[key]) {
      ctx.fillStyle = "#66c0f4";
      ctx.font = "800 14px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("•", v.x, v.y - 32);
    }
  }

  ctx.fillStyle = "rgba(12,24,20,.5)";
  ctx.fillRect(0, 560, ARENA.width, ARENA.height - 560);
  const bob = Math.sin(t * 2) * 2;
  minifig(ctx, 300, 620 + bob, 2.2, "#c44536", "#a33a22", true);
  const colors = { bruiser: "#8c6b45", mender: "#4f9d8b", gunner: "#7b4ea8" };
  (save.party || [save.activeCompanion]).filter(Boolean).forEach((key, i) => {
    minifig(ctx, 380 + i * 70, 632 + bob, 1.8, colors[key] || "#8fa2aa", "#2c3e50");
  });
}

export function renderHunt(ctx, hunt, t, fx) {
  const shake = fx?.offset() || { x: 0, y: 0 };
  ctx.save();
  ctx.translate(shake.x, shake.y);
  backdrop(ctx, t, false, hunt.biome);
  tileFloor(ctx);
  drawHazards(ctx, hunt.hazards, t);

  if (hunt.ghost?.length) {
    ctx.fillStyle = "rgba(102,192,244,.22)";
    for (const point of hunt.ghost) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, TAU);
      ctx.fill();
    }
  }

  for (const core of hunt.cores) {
    ctx.fillStyle = "#f2c14e";
    ctx.save();
    ctx.translate(core.x, core.y + Math.sin(t * 4 + core.x) * 3);
    ctx.rotate(t * 2);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }

  for (const e of hunt.enemies) {
    if (e.hp <= 0) continue;
    if (e.windup > 0) drawTelegraph(ctx, e);
    drawEnemy(ctx, e);
    if (!e.burrowed) {
      const w = Math.max(30, e.radius * 1.6);
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 18, w, 5);
      ctx.fillStyle = e.type === "boss" ? "#e8733c" : "#a4d007";
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 18, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  for (const b of hunt.projectiles) {
    if (b.trap) {
      ctx.strokeStyle = "#b8e0ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(184,224,255,.18)";
      ctx.fill();
    } else {
      ctx.fillStyle = b.friendly ? "#ffe08a" : "#ff8b5c";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, TAU);
      ctx.fill();
    }
  }

  const colors = { bruiser: "#8c6b45", mender: "#4f9d8b", gunner: "#7b4ea8" };
  const companions = hunt.companions || (hunt.companion?.type ? [hunt.companion] : []);
  companions.forEach((c) => {
    minifig(ctx, c.x, c.y, 1.6, colors[c.type] || "#8fa2aa", "#2c3e50");
  });

  const p = hunt.player;
  ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 16) % 2 ? 0.45 : 1;
  minifig(ctx, p.x, p.y, 1.8, "#c44536", "#a33a22", true);
  ctx.globalAlpha = 1;

  if (p.charge > 0.05) {
    ctx.strokeStyle = "#66c0f4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge);
    ctx.stroke();
  }

  fx?.draw(ctx);
  ctx.restore();

  drawBossBar(ctx, hunt);
  fx?.drawOverlay(ctx, ARENA.width, ARENA.height);

  if (p.hp <= 1 && p.hp > 0) {
    const g = ctx.createRadialGradient(
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.25,
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.7
    );
    g.addColorStop(0, "rgba(255,60,80,0)");
    g.addColorStop(1, "rgba(255,60,80,.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  if (hunt.banner > 0) {
    const label = hunt.phase === "won" ? "HUNT CLEARED"
      : hunt.phase === "lost" ? "HUNT FAILED"
      : hunt.phase === "boss" ? "TALLNECK APPROACHES"
      : `WAVE ${hunt.wave}`;
    ctx.fillStyle = "rgba(8,14,18,.62)";
    ctx.fillRect(0, ARENA.height / 2 - 42, ARENA.width, 84);
    ctx.fillStyle = "#f7f9fb";
    ctx.font = "800 40px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, ARENA.width / 2, ARENA.height / 2);
    if (hunt.modifier) {
      ctx.font = "700 16px Arial, sans-serif";
      ctx.fillStyle = "#f2c14e";
      ctx.fillText(MOD_LABEL(hunt.modifier), ARENA.width / 2, ARENA.height / 2 + 34);
    }
  }
}

function MOD_LABEL(key) {
  return key === "swift" ? "SWIFT MACHINES"
    : key === "armoured" ? "ARMOURED MACHINES"
    : key === "swarm" ? "SWARM" : "";
}
