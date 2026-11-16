/*
 * DEEP ORBIT — Canvas 2D presentation.
 *
 * Stateless apart from a DPR/size cache and the camera. All art is drawn
 * procedurally: no images, no sprites, fully offline. The camera and
 * screenToWorld live here so input stays in CSS pixels.
 */

import {
    PALETTES, AMMO, RESOURCES, SHIPS, MAX_DPR, VIEW_BASE,
    DOCK_RADIUS, GATE_RADIUS, clamp, lerp
} from "./config.js";
import { stationPos, gatePos, getTarget } from "./sim.js";

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
    let zoom = 1;
    let camInit = false;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
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
        } else if (shape === "tank" || shape === "boss") {
            ctx.moveTo(r * 1.05, 0);
            ctx.lineTo(r * 0.5, r * 0.72);
            ctx.lineTo(-r * 0.65, r * 0.82);
            ctx.lineTo(-r * 1.0, r * 0.35);
            ctx.lineTo(-r * 1.0, -r * 0.35);
            ctx.lineTo(-r * 0.65, -r * 0.82);
            ctx.lineTo(r * 0.5, -r * 0.72);
        } else {
            ctx.arc(0, 0, r, 0, TAU);
        }
        ctx.closePath();
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
            const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            g.addColorStop(0, palette.nebula);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
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

        // Deterministic starfield, one star per world cell.
        const cell = 92;
        ctx.fillStyle = palette.star;
        for (let gx = Math.floor(vis.left / cell); gx <= Math.floor(vis.right / cell); gx++) {
            for (let gy = Math.floor(vis.top / cell); gy <= Math.floor(vis.bottom / cell); gy++) {
                const h1 = hash(gx * 2 + gy * 71);
                const h2 = hash(gx * 131 + gy * 7);
                const sx = gx * cell + h1 * cell;
                const sy = gy * cell + h2 * cell;
                const tw = 0.18 + hash(gx * 19 + gy * 23) * 0.35;
                ctx.globalAlpha = tw * (0.72 + 0.28 * Math.sin(t * 1.4 + h1 * 12));
                const s = 1 + h2 * 1.8;
                ctx.fillRect(sx, sy, s / zoom, s / zoom);
            }
        }
        ctx.globalAlpha = 1;

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

        ctx.font = `${Math.round(15 / zoom)}px ui-monospace, monospace`;
        ctx.fillStyle = palette.accent;
        ctx.textAlign = "center";
        ctx.fillText("STATION", s.x, s.y + DOCK_RADIUS + 20 / zoom);
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
            glow(b.color, 10);
            ctx.fillStyle = b.color;
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
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(e.angle);

            if (e.def.boss) {
                ctx.strokeStyle = e.def.color;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 2 / zoom;
                ctx.beginPath();
                ctx.arc(0, 0, e.radius + 16, state.t, state.t + 4.6);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            const flash = e.hitFlash > 0;
            const grad = ctx.createLinearGradient(-e.radius, 0, e.radius, 0);
            grad.addColorStop(0, "#05070c");
            grad.addColorStop(1, flash ? "#ffffff" : e.def.color);
            ctx.fillStyle = grad;
            ctx.strokeStyle = flash ? "#ffffff" : e.def.color;
            ctx.lineWidth = 2 / zoom;
            glow(e.def.color, e.def.boss ? 20 : 8);
            shipPath(e.def.shape, e.radius);
            ctx.fill();
            ctx.stroke();
            noGlow();

            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.beginPath();
            ctx.arc(e.radius * 0.3, 0, Math.max(2, e.radius * 0.12), 0, TAU);
            ctx.fill();
            ctx.restore();

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
                ctx.fillStyle = e.def.boss ? "#ffb457" : "#ff6b6b";
                ctx.fillRect(x, y, w * clamp(e.hp / e.hpMax, 0, 1), 4 / zoom);
            }

            if (target && target.id === e.id) {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2 / zoom;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius + 15 + Math.sin(state.t * 6) * 2, 0, TAU);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawDrones(state) {
        for (const d of state.drones) {
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

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Thruster flame.
        const thrust = Math.hypot(p.vx, p.vy) > 1 || p.boost > 0;
        if (thrust) {
            const len = (p.boost > 0 ? 34 : 20) + Math.sin(state.t * 30) * 5;
            const flame = ctx.createLinearGradient(-p.radius, 0, -p.radius - len, 0);
            flame.addColorStop(0, p.boost > 0 ? "#fff2a8" : "#8ff6ff");
            flame.addColorStop(1, "rgba(0,200,255,0)");
            ctx.fillStyle = flame;
            ctx.beginPath();
            ctx.moveTo(-p.radius * 0.7, -7);
            ctx.lineTo(-p.radius - len, 0);
            ctx.lineTo(-p.radius * 0.7, 7);
            ctx.closePath();
            ctx.fill();
        }

        const shipColor = p.ship.color || SHIPS[0].color;
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

        ctx.fillStyle = "#eaffff";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.radius * 0.25, 0, 3, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.muzzle > 0) {
            glow(AMMO[p.ammo].color, 18);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p.radius + 8, 0, 5, 0, TAU);
            ctx.fill();
            noGlow();
        }
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
        cameraFollow(state, dt === undefined ? 1 / 60 : dt);
        const palette = PALETTES[state.map.palette] || PALETTES.alpha;
        const target = getTarget(state);

        ctx.save();
        ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        drawBackground(state, palette);

        ctx.translate(view.w / 2, view.h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-cam.x, -cam.y);

        drawStation(state, palette);
        drawGate(state, palette);
        drawLoot(state);
        drawBoxes(state);
        drawBullets(state);
        drawEnemies(state, palette, target);
        drawDrones(state);
        drawTargetLine(state, target);
        drawPlayer(state, palette);
        drawParticles(state);
        ctx.restore();

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
        const palette = PALETTES[state.map.palette] || PALETTES.alpha;
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

        const station = stationPos(state);
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
        for (const e of state.enemies) {
            mctx.fillStyle = e.def.boss ? "#ffb457" : "#ff6b6b";
            const r = e.def.boss ? 3.5 : 2;
            mctx.beginPath();
            mctx.arc(mx(e.x), my(e.y), r, 0, TAU);
            mctx.fill();
        }
        const p = state.player;
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

    return {
        resize,
        render,
        renderMinimap,
        screenToWorld,
        resetCamera: function () { camInit = false; },
        getZoom: function () { return zoom; },
        getView: function () { return view; }
    };
}
