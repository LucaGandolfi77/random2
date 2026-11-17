/*
 * DEEP ORBIT — Canvas 2D presentation.
 *
 * Stateless apart from a DPR/size cache and the camera. All art is drawn
 * procedurally: no images, no sprites, fully offline. The camera and
 * screenToWorld live here so input stays in CSS pixels.
 */

import {
    PALETTES, PALETTES_CB, CB_COLORS, QUALITY, AMMO, RESOURCES, SHIPS,
    PICKUPS, VIEW_BASE, DOCK_RADIUS, SAFE_STANDOFF, GATE_RADIUS,
    MAX_DAMAGE_TEXT, MAX_SHOCKWAVES, clamp, lerp
} from "./config.js";
import { stationPos, gatePos, getTarget } from "./sim.js";
import { drawMesh, getMesh, meshStats } from "./mesh.js";

const TAU = Math.PI * 2;

function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export function createRenderer(canvas, minimap) {
    const ctx = canvas.getContext("2d");
    const mctx = minimap ? minimap.getContext("2d") : null;
    const view = { w: 1, h: 1, dpr: 1 };
    const cam = { x: 0, y: 0 };
    const damageTexts = [];
    const shockwaves = [];
    let zoom = 1;
    let camInit = false;
    let shake = 0;
    let sweep = 0;
    let quality = QUALITY.high;
    let colorblind = false;
    const gradientCache = new Map();
    const reduced = typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paletteFor(state) {
        const base = colorblind ? PALETTES_CB : PALETTES;
        return base[state.map.palette] || base.alpha;
    }

    function mappedColor(color) {
        if (!colorblind) return color;
        return CB_COLORS[color] || color;
    }

    function setQuality(tier) {
        quality = QUALITY[tier] || QUALITY.high;
        resize();
    }

    function setColorblind(on) {
        colorblind = !!on;
        gradientCache.clear();
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, quality.dprCap);
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width || canvas.clientWidth || 1);
        const h = Math.max(1, rect.height || canvas.clientHeight || 1);

        view.w = w;
        view.h = h;
        view.dpr = dpr;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        zoom = clamp(Math.min(w, h) / VIEW_BASE, 0.42, 1.4);

        if (minimap) {
            const mrect = minimap.getBoundingClientRect();
            const mw = Math.max(1, mrect.width || minimap.clientWidth || 140);
            const mh = Math.max(1, mrect.height || minimap.clientHeight || 140);
            minimap.width = Math.round(mw * dpr);
            minimap.height = Math.round(mh * dpr);
            if (mctx) mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            view.mw = mw;
            view.mh = mh;
        }
    }

    function cameraFollow(state, dt) {
        const p = state.player;
        if (!camInit) {
            cam.x = p.x;
            cam.y = p.y;
            camInit = true;
            return;
        }
        const k = 1 - Math.pow(0.0008, dt);
        cam.x = lerp(cam.x, p.x, k);
        cam.y = lerp(cam.y, p.y, k);
    }

    function screenToWorld(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left - view.w / 2) / zoom + cam.x,
            y: (clientY - rect.top - view.h / 2) / zoom + cam.y
        };
    }

    function worldVisible() {
        const hw = view.w / (2 * zoom);
        const hh = view.h / (2 * zoom);
        return {
            left: cam.x - hw, right: cam.x + hw,
            top: cam.y - hh, bottom: cam.y + hh
        };
    }

    function glow(color, blur) {
        if (!quality.fx.glow) {
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            return;
        }
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
    }
    function noGlow() {
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
    }

    function shipPath(shape, r) {
        ctx.beginPath();
        if (shape === "arrow" || shape === "triangle") {
            ctx.moveTo(r * 1.15, 0);
            ctx.lineTo(-r * 0.75, r * 0.78);
            ctx.lineTo(-r * 0.32, 0);
            ctx.lineTo(-r * 0.75, -r * 0.78);
        } else if (shape === "dart") {
            ctx.moveTo(r * 1.35, 0);
            ctx.lineTo(-r * 0.9, r * 0.5);
            ctx.lineTo(-r * 0.55, 0);
            ctx.lineTo(-r * 0.9, -r * 0.5);
        } else if (shape === "wing" || shape === "hex") {
            ctx.moveTo(r * 1.1, 0);
            ctx.lineTo(r * 0.05, r * 0.7);
            ctx.lineTo(-r * 0.85, r * 0.95);
            ctx.lineTo(-r * 0.6, 0);
            ctx.lineTo(-r * 0.85, -r * 0.95);
            ctx.lineTo(r * 0.05, -r * 0.7);
        } else if (shape === "diamond") {
            ctx.moveTo(r * 1.2, 0);
            ctx.lineTo(0, r * 0.95);
            ctx.lineTo(-r * 1.1, 0);
            ctx.lineTo(0, -r * 0.95);
        } else if (shape === "tank" || shape === "boss" || shape === "siege") {
            ctx.moveTo(r * 1.05, 0);
            ctx.lineTo(r * 0.5, r * 0.72);
            ctx.lineTo(-r * 0.65, r * 0.82);
            ctx.lineTo(-r * 1.0, r * 0.35);
            ctx.lineTo(-r * 1.0, -r * 0.35);
            ctx.lineTo(-r * 0.65, -r * 0.82);
            ctx.lineTo(r * 0.5, -r * 0.72);
        } else if (shape === "wisp") {
            ctx.moveTo(r * 1.4, 0);
            ctx.lineTo(-r * 0.3, r * 0.85);
            ctx.lineTo(-r * 0.95, 0);
            ctx.lineTo(-r * 0.3, -r * 0.85);
        } else if (shape === "crawler") {
            ctx.moveTo(r * 0.9, 0);
            ctx.lineTo(r * 0.55, r * 0.6);
            ctx.lineTo(r * 0.85, r * 1.05);
            ctx.lineTo(-r * 0.55, r * 0.95);
            ctx.lineTo(-r * 1.0, r * 0.4);
            ctx.lineTo(-r * 1.0, -r * 0.4);
            ctx.lineTo(-r * 0.55, -r * 0.95);
            ctx.lineTo(r * 0.85, -r * 1.05);
            ctx.lineTo(r * 0.55, -r * 0.6);
        } else if (shape === "phantom" || shape === "stealth") {
            ctx.moveTo(r * 1.5, 0);
            ctx.lineTo(r * 0.1, r * 0.42);
            ctx.lineTo(-r * 1.1, r * 0.9);
            ctx.lineTo(-r * 0.6, 0);
            ctx.lineTo(-r * 1.1, -r * 0.9);
            ctx.lineTo(r * 0.1, -r * 0.42);
        } else if (shape === "lancer" || shape === "monolith" || shape === "queen") {
            ctx.moveTo(r * 1.4, 0);
            ctx.lineTo(r * 0.5, r * 0.65);
            ctx.lineTo(r * 0.9, r * 1.2);
            ctx.lineTo(-r * 0.6, r * 1.05);
            ctx.lineTo(-r * 1.05, r * 0.4);
            ctx.lineTo(-r * 1.05, -r * 0.4);
            ctx.lineTo(-r * 0.6, -r * 1.05);
            ctx.lineTo(r * 0.9, -r * 1.2);
            ctx.lineTo(r * 0.5, -r * 0.65);
        } else if (shape === "obelisk") {
            ctx.moveTo(r * 1.25, 0);
            ctx.lineTo(r * 0.35, r * 0.55);
            ctx.lineTo(r * 0.55, r * 1.15);
            ctx.lineTo(-r * 0.55, r * 1.15);
            ctx.lineTo(-r * 0.35, r * 0.55);
            ctx.lineTo(-r * 1.1, 0);
            ctx.lineTo(-r * 0.35, -r * 0.55);
            ctx.lineTo(-r * 0.55, -r * 1.15);
            ctx.lineTo(r * 0.55, -r * 1.15);
            ctx.lineTo(r * 0.35, -r * 0.55);
        } else {
            ctx.arc(0, 0, r, 0, TAU);
        }
        ctx.closePath();
    }

    /* ---------------- background layers ---------------- */

    function drawStarLayer(state, palette, cell, parallax, alpha, sizeMul, t) {
        const vis = worldVisible();
        const ox = cam.x * (1 - parallax);
        const oy = cam.y * (1 - parallax);
        ctx.fillStyle = palette.star;
        for (let gx = Math.floor((vis.left - ox) / cell); gx <= Math.floor((vis.right - ox) / cell); gx++) {
            for (let gy = Math.floor((vis.top - oy) / cell); gy <= Math.floor((vis.bottom - oy) / cell); gy++) {
                const h1 = hash(gx * 2 + gy * 71 + parallax * 17);
                const h2 = hash(gx * 131 + gy * 7 + parallax * 31);
                const sx = gx * cell + h1 * cell + ox;
                const sy = gy * cell + h2 * cell + oy;
                const tw = 0.2 + hash(gx * 19 + gy * 23) * 0.4;
                ctx.globalAlpha = alpha * tw * (0.7 + 0.3 * Math.sin(t * 1.6 + h1 * 14));
                const s = (0.9 + h2 * 1.7) * sizeMul / zoom;
                ctx.fillRect(sx, sy, s, s);
            }
        }
        ctx.globalAlpha = 1;
    }

    function drawPlanet(state, palette, vis) {
        if (!palette.planet) return;
        const px = state.world.x * 0.78;
        const py = state.world.y * 0.18;
        const r = Math.min(state.world.x, state.world.y) * 0.29;
        if (px < vis.left - r || px > vis.right + r || py < vis.top - r || py > vis.bottom + r) return;

        const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.35, r * 0.15, px, py, r);
        g.addColorStop(0, palette.planet);
        g.addColorStop(0.7, "rgba(4,10,18,0.92)");
        g.addColorStop(1, "rgba(2,6,12,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(px, py, r + 18, -0.5, 2.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function drawAsteroids(state, palette, vis, t) {
        const cell = 430;
        for (let gx = Math.floor(vis.left / cell); gx <= Math.floor(vis.right / cell); gx++) {
            for (let gy = Math.floor(vis.top / cell); gy <= Math.floor(vis.bottom / cell); gy++) {
                if (hash(gx * 91 + gy * 13) < 0.42) continue;
                const h = hash(gx * 37 + gy * 211);
                const h2 = hash(gx * 17 + gy * 59);
                const ax = gx * cell + h * cell;
                const ay = gy * cell + h2 * cell;
                const r = 16 + h2 * 28;
                if (Math.hypot(ax - state.player.x, ay - state.player.y) < 150) continue;
                ctx.save();
                ctx.translate(ax, ay);
                ctx.rotate(t * 0.06 * (h > 0.5 ? 1 : -1) + h * TAU);
                ctx.beginPath();
                const points = 8;
                for (let i = 0; i < points; i++) {
                    const a = (i / points) * TAU;
                    const rr = r * (0.72 + hash(gx * 300 + gy * 7 + i) * 0.5);
                    const x = Math.cos(a) * rr;
                    const y = Math.sin(a) * rr;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fillStyle = palette.ground || "rgba(20,40,55,0.85)";
                ctx.fill();
                ctx.strokeStyle = "rgba(210,240,255,0.18)";
                ctx.lineWidth = 1.6 / zoom;
                ctx.stroke();
                ctx.strokeStyle = "rgba(140,220,255,0.09)";
                ctx.beginPath();
                ctx.moveTo(-r * 0.5, -r * 0.2);
                ctx.lineTo(r * 0.25, -r * 0.45);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    /* ---------------- background ---------------- */

    function drawBackground(state, palette) {
        const grad = ctx.createLinearGradient(0, 0, 0, view.h);
        grad.addColorStop(0, palette.bg2);
        grad.addColorStop(1, palette.bg);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, view.w, view.h);

        const vis = worldVisible();
        const t = state.t;

        // Nebula clouds (world-fixed).
        const clouds = [
            { x: state.world.x * 0.28, y: state.world.y * 0.3, r: 520 },
            { x: state.world.x * 0.72, y: state.world.y * 0.76, r: 620 },
            { x: state.world.x * 0.5, y: state.world.y * 0.5, r: 360 }
        ];
        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            if (c.x < vis.left - c.r || c.x > vis.right + c.r ||
                c.y < vis.top - c.r || c.y > vis.bottom + c.r) continue;
            const key = state.map.palette + ":" + i + ":" + (colorblind ? "cb" : "n");
            let g = gradientCache.get(key);
            if (!g) {
                g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
                g.addColorStop(0, palette.nebula);
                g.addColorStop(1, "rgba(0,0,0,0)");
                gradientCache.set(key, g);
            }
            ctx.fillStyle = g;
            ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
        }

        if (quality.fx.layers) {
            drawPlanet(state, palette, vis);
            drawStarLayer(state, palette, 190, 0.35, 0.28, 0.9, t);
        }

        // Grid.
        const step = 120;
        ctx.strokeStyle = palette.grid;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        for (let x = Math.floor(vis.left / step) * step; x <= vis.right; x += step) {
            ctx.moveTo(x, vis.top);
            ctx.lineTo(x, vis.bottom);
        }
        for (let y = Math.floor(vis.top / step) * step; y <= vis.bottom; y += step) {
            ctx.moveTo(vis.left, y);
            ctx.lineTo(vis.right, y);
        }
        ctx.stroke();

        // Near starfield (world-anchored) and drifting asteroid field.
        if (quality.fx.layers) {
            drawStarLayer(state, palette, 92, 1, 0.68, 1.15, t);
            drawAsteroids(state, palette, vis, t);
        }

        // Radiation boundary.
        ctx.strokeStyle = palette.hazard;
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([12 / zoom, 16 / zoom]);
        ctx.globalAlpha = 0.28;
        ctx.strokeRect(30, 30, state.world.x - 60, state.world.y - 60);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        noGlow();
    }

    /* ---------------- landmarks ---------------- */

    function drawStation(state, palette) {
        const s = stationPos(state);
        const pulse = 0.5 + 0.5 * Math.sin(state.t * 2);

        ctx.save();
        ctx.translate(s.x, s.y);

        // Safe-haven bubble: soft fill, hex lattice and a bright inner ring.
        if (state.docked) {
            const dome = ctx.createRadialGradient(0, 0, 20, 0, 0, DOCK_RADIUS);
            dome.addColorStop(0, "rgba(138,255,193,0.10)");
            dome.addColorStop(0.75, "rgba(138,255,193,0.05)");
            dome.addColorStop(1, "rgba(138,255,193,0)");
            ctx.fillStyle = dome;
            ctx.beginPath();
            ctx.arc(0, 0, DOCK_RADIUS, 0, TAU);
            ctx.fill();

            ctx.strokeStyle = "rgba(138,255,193,0.10)";
            ctx.lineWidth = 1 / zoom;
            for (let ring = 40; ring < DOCK_RADIUS; ring += 36) {
                ctx.beginPath();
                ctx.arc(0, 0, ring, 0, TAU);
                ctx.stroke();
            }
            ctx.save();
            ctx.rotate(state.t * 0.18);
            ctx.strokeStyle = "rgba(138,255,193,0.14)";
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * TAU;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46);
                ctx.lineTo(Math.cos(a) * DOCK_RADIUS, Math.sin(a) * DOCK_RADIUS);
                ctx.stroke();
            }
            ctx.restore();

            ctx.strokeStyle = "#8affc1";
            ctx.globalAlpha = 0.4 + pulse * 0.3;
            ctx.lineWidth = 3 / zoom;
            glow("#8affc1", 16);
            ctx.beginPath();
            ctx.arc(0, 0, DOCK_RADIUS - 4, 0, TAU);
            ctx.stroke();
            noGlow();
            ctx.globalAlpha = 1;
        }

        // Outer standoff ring: where hostiles are pushed back to.
        ctx.strokeStyle = palette.hazard;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        ctx.arc(0, 0, SAFE_STANDOFF, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = state.docked ? "#8affc1" : palette.accent;
        ctx.globalAlpha = state.docked ? 0.65 : 0.32;
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([12 / zoom, 10 / zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, DOCK_RADIUS, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        ctx.rotate(state.t * 0.12);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 3 / zoom;
        glow(palette.accent, 14);
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 62 + i * 14, i * 1.9, i * 1.9 + 1.1);
            ctx.stroke();
        }
        noGlow();
        ctx.rotate(-state.t * 0.34);

        ctx.fillStyle = "#0b1c26";
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 2.5 / zoom;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            const x = Math.cos(a) * 44;
            const y = Math.sin(a) * 44;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = 0.35 + pulse * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.textAlign = "center";
        ctx.font = `${Math.round(15 / zoom)}px ui-monospace, monospace`;
        ctx.fillStyle = state.docked ? "#8affc1" : palette.accent;
        ctx.fillText(state.docked ? "SAFE ZONE" : "STATION", s.x, s.y + DOCK_RADIUS + 20 / zoom);
        if (state.docked) {
            ctx.font = `${Math.round(10 / zoom)}px ui-monospace, monospace`;
            ctx.globalAlpha = 0.65;
            ctx.fillText("WEAPONS LOCKED · HOSTILES DISENGAGED", s.x, s.y + DOCK_RADIUS + 36 / zoom);
            ctx.globalAlpha = 1;
        }
    }

    function drawGate(state, palette) {
        if (state.map.gateTo < 0) return;
        const g = gatePos(state);
        ctx.save();
        ctx.translate(g.x, g.y);

        ctx.strokeStyle = state.atGate ? "#ffffff" : palette.accent;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(0, 0, GATE_RADIUS, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.rotate(-state.t * 0.8);
        glow(palette.accent, 18);
        ctx.lineWidth = 5 / zoom;
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = i % 2 ? palette.accent : "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 50 + i * 7, i * 1.4, i * 1.4 + 0.85);
            ctx.stroke();
        }
        noGlow();
        ctx.restore();

        ctx.font = `${Math.round(14 / zoom)}px ui-monospace, monospace`;
        ctx.fillStyle = state.atGate ? "#ffffff" : palette.accent;
        ctx.textAlign = "center";
        ctx.fillText(state.atGate ? "JUMP READY" : "JUMP GATE", g.x, g.y + GATE_RADIUS + 20 / zoom);
    }

    /* ---------------- entities ---------------- */

    function drawLoot(state) {
        for (const item of state.loot) {
            const res = RESOURCES[item.type] || RESOURCES.aetherium;
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.spin);
            const fade = clamp(item.life / 2, 0, 1);
            ctx.globalAlpha = fade;
            glow(res.color, 9);
            ctx.fillStyle = res.color;
            ctx.fillRect(-4, -4, 8, 8);
            ctx.rotate(-item.spin);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 1 / zoom;
            ctx.strokeRect(-7, -7, 14, 14);
            noGlow();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    function drawBoxes(state) {
        for (const box of state.boxes) {
            ctx.save();
            ctx.translate(box.x, box.y);
            ctx.rotate(box.spin);
            const fade = clamp(box.life / 3, 0, 1);
            ctx.globalAlpha = fade;
            glow(box.def.color, 16);
            ctx.fillStyle = "rgba(4,10,16,0.9)";
            ctx.strokeStyle = box.def.color;
            ctx.lineWidth = 2.5 / zoom;
            ctx.beginPath();
            const r = 13;
            ctx.rect(-r, -r, r * 2, r * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = box.def.color;
            ctx.fillRect(-r, -2.5 / zoom, r * 2, 5 / zoom);
            ctx.fillRect(-2.5 / zoom, -r, 5 / zoom, r * 2);
            noGlow();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    function drawBullets(state) {
        ctx.lineCap = "round";
        for (const b of state.bullets) {
            const tail = 14;
            const a = Math.atan2(b.vy, b.vx);
            ctx.strokeStyle = b.color;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = b.radius * 1.2;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x - Math.cos(a) * tail, b.y - Math.sin(a) * tail);
            ctx.stroke();
            ctx.globalAlpha = 1;
            glow(b.color, b.drone ? 6 : 11);
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, TAU);
            ctx.fill();
            noGlow();
        }
        for (const b of state.enemyBullets) {
            const bcolor = mappedColor(b.color);
            glow(bcolor, 10);
            ctx.fillStyle = bcolor;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 2, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            noGlow();
        }
    }

    function drawEnemies(state, palette, target) {
        for (const e of state.enemies) {
            const ecolor = mappedColor(e.def.color);
            const alpha = e.cloakAlpha === undefined ? 1 : e.cloakAlpha;
            const flash = e.hitFlash > 0;

            if (e.def.boss) {
                ctx.strokeStyle = ecolor;
                ctx.globalAlpha = 0.35 * alpha;
                ctx.lineWidth = 2 / zoom;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 16, state.t, state.t + 4.6);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Damage smoke trails behind the hull.
            if (e.hp / e.hpMax < 0.45) {
                ctx.fillStyle = "rgba(30,30,40,0.5)";
                for (let i = 0; i < 3; i++) {
                    const drift = (state.t * 0.7 + i * 0.33) % 1;
                    const bx = e.x - Math.cos(e.angle) * (e.radius * 0.4 + drift * 22);
                    const by = e.y - Math.sin(e.angle) * (e.radius * 0.4 + drift * 22) + (i - 1) * 7;
                    ctx.beginPath();
                    ctx.arc(bx, by, 3 + drift * 5, 0, TAU);
                    ctx.fill();
                }
            }

            if (quality.fx.mesh) {
                const meshScale = (e.radius / 14) * 1.1;
                drawMesh(ctx, getMesh("enemy", e.defId), e.x, e.y, e.angle, ecolor, meshScale, {
                    alpha,
                    flash
                });
                // Glowing reactor core.
                ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(state.t * 4 + e.id));
                glow(ecolor, e.def.boss ? 18 : 9);
                ctx.fillStyle = flash ? "#ffffff" : ecolor;
                ctx.beginPath();
                ctx.arc(e.x + Math.cos(e.angle) * e.radius * 0.12,
                    e.y + Math.sin(e.angle) * e.radius * 0.12,
                    Math.max(2, e.radius * 0.12), 0, TAU);
                ctx.fill();
                noGlow();
                ctx.globalAlpha = 1;
            } else {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(e.angle);
                ctx.globalAlpha = alpha;
                const grad = ctx.createLinearGradient(-e.radius, 0, e.radius, 0);
                grad.addColorStop(0, "#05070c");
                grad.addColorStop(0.6, "#11202c");
                grad.addColorStop(1, flash ? "#ffffff" : ecolor);
                ctx.fillStyle = grad;
                ctx.strokeStyle = flash ? "#ffffff" : ecolor;
                ctx.lineWidth = 2 / zoom;
                glow(ecolor, e.def.boss ? 20 : 8);
                shipPath(e.def.shape, e.radius);
                ctx.fill();
                ctx.stroke();
                noGlow();
                ctx.strokeStyle = "rgba(255,255,255,0.18)";
                ctx.lineWidth = 1 / zoom;
                shipPath(e.def.shape, e.radius * 0.55);
                ctx.stroke();
                ctx.fillStyle = ecolor;
                ctx.beginPath();
                ctx.arc(e.radius * 0.16, 0, Math.max(2, e.radius * 0.13), 0, TAU);
                ctx.fill();
                ctx.restore();
                ctx.globalAlpha = 1;
            }

            // Elite affix tells.
            if (e.elite) {
                const ec = mappedColor(e.elite.color);
                ctx.strokeStyle = ec;
                ctx.globalAlpha = 0.55 + 0.25 * Math.sin(state.t * 4 + e.id);
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash(e.elite.id === "splitter" ? [4 / zoom, 4 / zoom] : []);
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 13, 0, TAU);
                ctx.stroke();
                ctx.setLineDash([]);
                if (e.elite.id === "armored") {
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.radius + 20, 0, TAU);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                ctx.fillStyle = ec;
                ctx.font = `${Math.round(9 / zoom)}px ui-monospace, monospace`;
                ctx.textAlign = "center";
                ctx.fillText(e.elite.name.toUpperCase(), e.x, e.y - e.radius - 30 / zoom);
            }

            // Boss enrage aura.
            if (e.phase2) {
                ctx.strokeStyle = "#ff4d6d";
                ctx.globalAlpha = 0.5 + 0.4 * Math.sin(state.t * 9);
                ctx.lineWidth = 4 / zoom;
                glow("#ff4d6d", 22);
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 24, 0, TAU);
                ctx.stroke();
                noGlow();
                ctx.globalAlpha = 1;
            }

            // Weapon charge telegraph.
            if (e.charge > 0) {
                ctx.strokeStyle = ecolor;
                ctx.globalAlpha = 0.3 + e.charge * 0.7;
                ctx.lineWidth = (1 + e.charge * 3) / zoom;
                glow(ecolor, 10 * e.charge);
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 12 + (1 - e.charge) * 8, 0, TAU * e.charge);
                ctx.stroke();
                noGlow();
                ctx.globalAlpha = 1;
            }

            // Infection marker.
            if (e.dotTime > 0) {
                ctx.strokeStyle = "#8affc1";
                ctx.globalAlpha = 0.55;
                ctx.lineWidth = 1.5 / zoom;
                ctx.setLineDash([3 / zoom, 5 / zoom]);
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 12, state.t * 2, state.t * 2 + Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }

            // Shield arc + health bar.
            if (e.shield > 0 && e.shieldMax > 0) {
                ctx.strokeStyle = "#6fd8ff";
                ctx.globalAlpha = 0.7;
                ctx.lineWidth = 2.5 / zoom;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (e.shield / e.shieldMax));
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            if (e.hp < e.hpMax || e.def.boss) {
                const w = e.def.boss ? 80 : 34;
                const x = e.x - w / 2;
                const y = e.y - e.radius - (e.def.boss ? 30 : 16);
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.fillRect(x, y, w, 4 / zoom);
                ctx.fillStyle = e.def.boss ? "#ffb457" : mappedColor("#ff6b6b");
                ctx.fillRect(x, y, w * clamp(e.hp / e.hpMax, 0, 1), 4 / zoom);
            }

            if (target && target.id === e.id) {
                const rr = e.radius + 16 + Math.sin(state.t * 5) * 2;
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(state.t * 0.5);
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2 / zoom;
                ctx.globalAlpha = 0.9;
                for (let q = 0; q < 4; q++) {
                    ctx.beginPath();
                    ctx.arc(0, 0, rr, q * Math.PI / 2 + 0.16, q * Math.PI / 2 + 0.72);
                    ctx.stroke();
                }
                ctx.restore();
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawDrones(state) {
        for (const d of state.drones) {
            if (quality.fx.mesh) {
                drawMesh(ctx, getMesh("drone"), d.x, d.y, d.angle, "#9fe8ff", 0.95, {});
            } else {
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.rotate(d.angle);
                ctx.fillStyle = "#0b1a22";
                ctx.strokeStyle = "#b8f7ff";
                ctx.lineWidth = 1.8 / zoom;
                glow("#7fe9ff", 8);
                shipPath("dart", 11);
                ctx.fill();
                ctx.stroke();
                noGlow();
                ctx.restore();
            }
        }
    }

    function drawPlayer(state, palette) {
        const p = state.player;
        if (state.destroyed) return;

        // Shield bubble.
        if (p.shield > 0) {
            ctx.strokeStyle = p.barrier > 0 ? "#ffffff" : "#5ce1e6";
            ctx.globalAlpha = p.barrier > 0 ? 0.9 : 0.18 + 0.42 * (p.shield / p.shieldMax);
            ctx.lineWidth = (p.barrier > 0 ? 5 : 2.5) / zoom;
            glow("#5ce1e6", p.barrier > 0 ? 24 : 8);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 10 + (p.barrier > 0 ? Math.sin(state.t * 12) * 2 : 0), 0, TAU);
            ctx.stroke();
            noGlow();
            ctx.globalAlpha = 1;
        }

        const ca = Math.cos(p.angle);
        const sa = Math.sin(p.angle);
        const px = -sa;
        const py = ca;

        // Thruster flame (behind the hull).
        const thrust = Math.hypot(p.vx, p.vy) > 1 || p.boost > 0;
        if (thrust) {
            const len = (p.boost > 0 ? 34 : 20) + Math.sin(state.t * 30) * 5;
            const bx = p.x - ca * p.radius * 0.7;
            const by = p.y - sa * p.radius * 0.7;
            const tx = p.x - ca * (p.radius + len);
            const ty = p.y - sa * (p.radius + len);
            const flame = ctx.createLinearGradient(bx, by, tx, ty);
            flame.addColorStop(0, p.boost > 0 ? "#fff2a8" : "#8ff6ff");
            flame.addColorStop(1, "rgba(0,200,255,0)");
            ctx.fillStyle = flame;
            ctx.beginPath();
            ctx.moveTo(bx + px * 7, by + py * 7);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx - px * 7, by - py * 7);
            ctx.closePath();
            ctx.fill();
        }

        const shipColor = mappedColor(p.ship.color || SHIPS[0].color);

        if (quality.fx.mesh) {
            drawMesh(ctx, getMesh("ship", p.ship.id), p.x, p.y, p.angle, shipColor, p.radius / 16, {
                flash: p.hurtFlash > 0
            });
            // Engine nozzles.
            ctx.fillStyle = p.boost > 0 ? "#fff2a8" : "#8ff6ff";
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(p.x - ca * p.radius * 0.72 + px * side * p.radius * 0.38,
                    p.y - sa * p.radius * 0.72 + py * side * p.radius * 0.38,
                    2.4, 0, TAU);
                ctx.fill();
            }
        } else {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            const grad = ctx.createLinearGradient(-p.radius, 0, p.radius, 0);
            grad.addColorStop(0, "#07131c");
            grad.addColorStop(0.55, "#123044");
            grad.addColorStop(1, shipColor);
            ctx.fillStyle = p.hurtFlash > 0 ? "#ff6b6b" : grad;
            ctx.strokeStyle = shipColor;
            ctx.lineWidth = 2.4 / zoom;
            glow(shipColor, 16);
            shipPath(p.ship.shape, p.radius);
            ctx.fill();
            ctx.stroke();
            noGlow();
            ctx.strokeStyle = "rgba(255,255,255,0.22)";
            ctx.lineWidth = 1 / zoom;
            shipPath(p.ship.shape, p.radius * 0.62);
            ctx.stroke();
            ctx.fillStyle = "rgba(180,240,255,0.18)";
            ctx.beginPath();
            ctx.ellipse(p.radius * 0.18, 0, p.radius * 0.36, p.radius * 0.2, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }

        // Speed streaks while boosting.
        if (p.boost > 0) {
            ctx.strokeStyle = "rgba(255,242,168,0.35)";
            ctx.lineWidth = 1.5 / zoom;
            for (let i = 0; i < 3; i++) {
                const off = (i - 1) * 9;
                const sx = p.x + px * off - ca * p.radius;
                const sy = p.y + py * off - sa * p.radius;
                const jitter = 30 + Math.sin(state.t * 25 + i) * 8;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - ca * jitter, sy - sa * jitter);
                ctx.stroke();
            }
        }

        // Canopy glint.
        ctx.fillStyle = "#eaffff";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x + ca * p.radius * 0.25, p.y + sa * p.radius * 0.25, 2.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.muzzle > 0) {
            glow(AMMO[p.ammo].color, 18);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p.x + ca * (p.radius + 8), p.y + sa * (p.radius + 8), 5, 0, TAU);
            ctx.fill();
            noGlow();
        }
    }

    function drawGhost(state) {
        const pose = state.ghostPose;
        if (!pose) return;
        ctx.save();
        ctx.globalAlpha = 0.32;
        drawMesh(ctx, getMesh("ship", state.player.ship.id), pose.x, pose.y, pose.angle,
            "#c08bff", state.player.radius / 16, { alpha: 0.32 });
        ctx.strokeStyle = "rgba(192,139,255,0.6)";
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([4 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.arc(pose.x, pose.y, state.player.radius + 14, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    function drawParticles(state) {
        for (const pt of state.particles) {
            ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawPickups(state) {
        for (const item of state.pickups || []) {
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.spin);
            const fade = clamp(item.life / 3, 0, 1);
            ctx.globalAlpha = fade;
            glow(item.def.color, 16);
            ctx.fillStyle = "rgba(4,12,18,0.92)";
            ctx.strokeStyle = item.def.color;
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, TAU);
            ctx.fill();
            ctx.stroke();
            noGlow();
            ctx.rotate(-item.spin);
            ctx.fillStyle = item.def.color;
            ctx.font = `bold ${Math.round(15 / zoom)}px ui-monospace, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(item.def.glyph, 0, 1);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    function drawShockwaves() {
        for (const w of shockwaves) {
            ctx.globalAlpha = clamp(w.life / w.maxLife, 0, 1) * 0.7;
            ctx.strokeStyle = w.color;
            ctx.lineWidth = (1 + 3 * (w.life / w.maxLife)) / zoom;
            glow(w.color, 12);
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.r, 0, TAU);
            ctx.stroke();
            noGlow();
        }
        ctx.globalAlpha = 1;
    }

    function drawDamageTexts() {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const d of damageTexts) {
            const a = clamp(d.life / d.maxLife, 0, 1);
            ctx.globalAlpha = a;
            ctx.fillStyle = d.critical ? "#ffd166" : d.color;
            ctx.font = `bold ${Math.round((d.critical ? 18 : 13) / zoom)}px ui-monospace, monospace`;
            if (d.critical) glow("#ffd166", 12);
            ctx.fillText((d.critical ? "✦ " : "") + d.value, d.x, d.y);
            noGlow();
        }
        ctx.globalAlpha = 1;
    }

    function drawTargetLine(state, target) {
        if (!target || state.destroyed) return;
        const p = state.player;
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([5 / zoom, 7 / zoom]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /* ---------------- main render ---------------- */

    function render(state, profile, dt) {
        const frameDt = dt === undefined ? 1 / 60 : dt;
        cameraFollow(state, frameDt);
        updateEffects(frameDt);
        const palette = paletteFor(state);
        const target = getTarget(state);
        const sx = shake ? (Math.random() * 2 - 1) * shake : 0;
        const sy = shake ? (Math.random() * 2 - 1) * shake : 0;

        ctx.save();
        ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        drawBackground(state, palette);

        ctx.translate(view.w / 2 + sx, view.h / 2 + sy);
        ctx.scale(zoom, zoom);
        ctx.translate(-cam.x, -cam.y);

        drawStation(state, palette);
        drawGate(state, palette);
        drawLoot(state);
        drawBoxes(state);
        drawPickups(state);
        drawBullets(state);
        drawShockwaves();
        drawEnemies(state, palette, target);
        drawDrones(state);
        drawTargetLine(state, target);
        drawPlayer(state, palette);
        drawGhost(state);
        drawParticles(state);
        drawDamageTexts();
        ctx.restore();

        // Brief red flash when a boss enters phase 2.
        if (state.bossPhaseTimer > 0) {
            const a = Math.min(0.35, state.bossPhaseTimer * 0.25);
            ctx.fillStyle = "rgba(255,60,80," + a.toFixed(2) + ")";
            ctx.fillRect(0, 0, view.w, view.h);
        }

        // Low-hull vignette is drawn in screen space.
        const p = state.player;
        if (p.hp / p.hpMax < 0.3 && !state.destroyed) {
            const a = (1 - p.hp / p.hpMax / 0.3) * 0.35;
            const v = ctx.createRadialGradient(
                view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.28,
                view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7
            );
            v.addColorStop(0, "rgba(255,0,60,0)");
            v.addColorStop(1, "rgba(255,0,60," + a.toFixed(2) + ")");
            ctx.fillStyle = v;
            ctx.fillRect(0, 0, view.w, view.h);
        }
    }

    function renderMinimap(state) {
        if (!mctx) return;
        const w = view.mw || 140;
        const h = view.mh || 140;
        const palette = paletteFor(state);
        mctx.clearRect(0, 0, w, h);
        mctx.fillStyle = "rgba(2,6,12,0.86)";
        mctx.fillRect(0, 0, w, h);

        const pad = 7;
        const sx = (w - pad * 2) / state.world.x;
        const sy = (h - pad * 2) / state.world.y;
        const s = Math.min(sx, sy);
        const ox = (w - state.world.x * s) / 2;
        const oy = (h - state.world.y * s) / 2;
        const mx = (x) => ox + x * s;
        const my = (y) => oy + y * s;

        mctx.strokeStyle = palette.grid;
        mctx.lineWidth = 1;
        mctx.strokeRect(ox, oy, state.world.x * s, state.world.y * s);

        const p = state.player;
        const px = mx(p.x);
        const py = my(p.y);

        // Radar sweep + range rings, centred on the player.
        mctx.save();
        mctx.beginPath();
        mctx.rect(ox, oy, state.world.x * s, state.world.y * s);
        mctx.clip();
        mctx.strokeStyle = "rgba(120,240,255,0.12)";
        for (const rr of [40, 80, 130]) {
            mctx.beginPath();
            mctx.arc(px, py, rr, 0, TAU);
            mctx.stroke();
        }
        const a = sweep;
        const grad = mctx.createLinearGradient(px, py, px + Math.cos(a) * 120, py + Math.sin(a) * 120);
        grad.addColorStop(0, "rgba(120,240,255,0.28)");
        grad.addColorStop(1, "rgba(120,240,255,0)");
        mctx.strokeStyle = grad;
        mctx.lineWidth = 12;
        mctx.beginPath();
        mctx.moveTo(px, py);
        mctx.lineTo(px + Math.cos(a) * 120, py + Math.sin(a) * 120);
        mctx.stroke();
        mctx.restore();

        const station = stationPos(state);
        mctx.strokeStyle = state.docked ? "rgba(138,255,193,0.8)" : "rgba(138,255,193,0.35)";
        mctx.lineWidth = 1;
        mctx.beginPath();
        mctx.arc(mx(station.x), my(station.y), Math.max(3, DOCK_RADIUS * s), 0, TAU);
        mctx.stroke();
        mctx.fillStyle = "#8affc1";
        mctx.fillRect(mx(station.x) - 3, my(station.y) - 3, 6, 6);
        if (state.map.gateTo >= 0) {
            const g = gatePos(state);
            mctx.fillStyle = palette.accent;
            mctx.fillRect(mx(g.x) - 2.5, my(g.y) - 2.5, 5, 5);
        }
        mctx.fillStyle = "rgba(120,220,255,0.6)";
        for (const item of state.loot) {
            mctx.fillRect(mx(item.x), my(item.y), 1.6, 1.6);
        }
        for (const item of state.pickups || []) {
            mctx.fillStyle = item.def.color;
            mctx.fillRect(mx(item.x) - 1, my(item.y) - 1, 3, 3);
        }
        for (const e of state.enemies) {
            mctx.fillStyle = e.def.boss ? "#ffb457" : "#ff6b6b";
            const r = e.def.boss ? 4 : (e.cloaked ? 1.3 : 2);
            mctx.beginPath();
            mctx.arc(mx(e.x), my(e.y), r, 0, TAU);
            mctx.fill();
        }
        mctx.save();
        mctx.translate(mx(p.x), my(p.y));
        mctx.rotate(p.angle);
        mctx.fillStyle = "#ffffff";
        mctx.beginPath();
        mctx.moveTo(6, 0);
        mctx.lineTo(-4, 4);
        mctx.lineTo(-4, -4);
        mctx.closePath();
        mctx.fill();
        mctx.restore();
    }

    function addShake(amount) {
        if (reduced || !quality.fx.shake) return;
        shake = Math.min(22, shake + amount);
    }

    function addDamageNumber(x, y, value, color, critical) {
        if (!quality.fx.text || reduced) return;
        if (damageTexts.length >= MAX_DAMAGE_TEXT) damageTexts.shift();
        damageTexts.push({
            x: x + rand(-6, 6), y: y - 8,
            value: Math.round(value),
            color: color || "#ffffff",
            critical: !!critical,
            life: critical ? 0.95 : 0.7,
            maxLife: critical ? 0.95 : 0.7,
            vy: critical ? -70 : -52
        });
    }

    function addShockwave(x, y, color, radius) {
        if (!quality.fx.text || reduced) return;
        if (shockwaves.length >= MAX_SHOCKWAVES) shockwaves.shift();
        shockwaves.push({ x, y, color: color || "#ffffff", r: 8, max: radius || 90, life: 0.45, maxLife: 0.45 });
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function updateEffects(dt) {
        shake = Math.max(0, shake - dt * 42);
        sweep += dt * 1.7;
        for (let i = damageTexts.length - 1; i >= 0; i--) {
            const d = damageTexts[i];
            d.life -= dt;
            d.y += d.vy * dt;
            d.vy *= 0.96;
            if (d.life <= 0) damageTexts.splice(i, 1);
        }
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const w = shockwaves[i];
            w.life -= dt;
            w.r = lerp(8, w.max, 1 - w.life / w.maxLife);
            if (w.life <= 0) shockwaves.splice(i, 1);
        }
    }

    return {
        resize,
        render,
        renderMinimap,
        screenToWorld,
        setQuality,
        setColorblind,
        getRenderMode: function () { return quality.fx.mesh ? "mesh" : "2d"; },
        getMeshStats: meshStats,
        addShake,
        addDamageNumber,
        addShockwave,
        resetCamera: function () { camInit = false; damageTexts.length = 0; shockwaves.length = 0; shake = 0; },
        getZoom: function () { return zoom; },
        getView: function () { return view; }
    };
}
