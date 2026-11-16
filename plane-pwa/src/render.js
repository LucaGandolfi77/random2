/*
 * Plane Shooter — Canvas 2D presentation.
 *
 * The renderer is deliberately stateless apart from the DPR/resize cache.
 * `renderFrame` takes a simulation state and a theme and paints it; that
 * makes it possible to exercise every draw path with a stub context in the
 * node tests.
 */

import { WIDTH, HEIGHT, THEMES, PLAYER, POWERUPS } from "./config.js";

const TAU = Math.PI * 2;

const COLOR_KEYS = {
    enemy: "enemy",
    enemyAlt: "enemyAlt",
    bullet: "bullet",
    powerup: "powerup",
    shield: "shield",
    danger: "danger",
    plane: "plane"
};

function colorFor(theme, key) {
    return theme[COLOR_KEYS[key] || "text"] || theme.text;
}

function drawBackground(ctx, theme, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, theme.bg2);
    gradient.addColorStop(1, theme.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    /* A soft light behind the playfield. */
    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.35, 8, WIDTH / 2, HEIGHT * 0.35, WIDTH * 0.8);
    glow.addColorStop(0, "rgba(255,255,255,0.045)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    /* Scrolling grid. */
    const step = 24;
    const offset = (time * 26) % step;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, HEIGHT);
        ctx.stroke();
    }
    for (let y = -step + offset; y <= HEIGHT; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(WIDTH, y + 0.5);
        ctx.stroke();
    }
    ctx.restore();

    /* Deterministic starfield: no state, no allocation. */
    for (let i = 0; i < 64; i++) {
        const x = (i * 73.17 + (i % 7) * 11.3) % WIDTH;
        const speed = 10 + (i % 6) * 7;
        const y = ((i * 41.3 + time * speed) % (HEIGHT + 20)) - 10;
        const alpha = 0.12 + (i % 4) * 0.06;
        ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(2) + ")";
        ctx.fillRect(x, y, 1.5, 2.5 + (i % 3));
    }
}

function drawPlane(ctx, state, theme, time) {
    const player = state ? state.player : {
        x: PLAYER.startX,
        y: PLAYER.startY,
        invuln: 0
    };

    const bob = state ? 0 : Math.sin(time * 2.2) * 3;
    const x = player.x;
    const y = player.y + bob;

    if (state && player.invuln > 0) {
        ctx.globalAlpha = 0.32 + 0.34 * (0.5 + 0.5 * Math.sin(time * 34));
    }

    /* Engine flame. */
    const flame = 5 + Math.sin(time * 26) * 2;
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 10);
    ctx.lineTo(x, y + 10 + flame);
    ctx.lineTo(x + 3, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    const gradient = ctx.createLinearGradient(x, y - 14, x, y + 12);
    gradient.addColorStop(0, theme.plane);
    gradient.addColorStop(1, theme.planeGrad);

    ctx.fillStyle = gradient;
    ctx.shadowColor = theme.plane;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x - 11, y + 7);
    ctx.lineTo(x - 4, y + 4);
    ctx.lineTo(x - 4, y + 10);
    ctx.lineTo(x + 4, y + 10);
    ctx.lineTo(x + 4, y + 4);
    ctx.lineTo(x + 11, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    /* Cockpit. */
    ctx.fillStyle = theme.bullet;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 2.4, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (state && state.buffs.shield) {
        ctx.strokeStyle = theme.shield;
        ctx.lineWidth = 2;
        ctx.shadowColor = theme.shield;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.65 + 0.25 * Math.sin(time * 6);
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

function drawEnemy(ctx, enemy, theme, time) {
    const color = enemy.type === "tank" || enemy.type === "gunner"
        ? theme.enemyAlt
        : theme.enemy;
    const pulse = 1 + Math.sin(enemy.t * 6 + enemy.phase) * 0.04;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    if (enemy.type === "drifter") {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = theme.bg2;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.r * 0.42, 0, TAU);
        ctx.fill();
    } else if (enemy.type === "weaver") {
        ctx.beginPath();
        ctx.moveTo(0, -enemy.r);
        ctx.lineTo(enemy.r, 0);
        ctx.lineTo(0, enemy.r);
        ctx.lineTo(-enemy.r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.bg2;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.r * 0.3, 0, TAU);
        ctx.fill();
    } else if (enemy.type === "diver") {
        ctx.beginPath();
        ctx.moveTo(0, enemy.r);
        ctx.lineTo(-enemy.r, -enemy.r * 0.7);
        ctx.lineTo(0, -enemy.r * 0.2);
        ctx.lineTo(enemy.r, -enemy.r * 0.7);
        ctx.closePath();
        ctx.fill();
    } else if (enemy.type === "gunner") {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU - Math.PI / 2;
            const px = Math.cos(a) * enemy.r;
            const py = Math.sin(a) * enemy.r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.bg2;
        ctx.fillRect(-3, 2, 6, enemy.r * 0.9);
        ctx.fillStyle = theme.enemyBullet;
        ctx.beginPath();
        ctx.arc(0, 1, 2.5, 0, TAU);
        ctx.fill();
    } else {
        /* Tank. */
        const r = enemy.r;
        ctx.fillRect(-r, -r * 0.8, r * 2, r * 1.6);
        ctx.fillStyle = theme.bg2;
        ctx.fillRect(-r * 0.7, -r * 0.55, r * 1.4, r * 1.1);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.38, 0, TAU);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) {
        const w = enemy.r * 1.7;
        const h = 3;
        const x = enemy.x - w / 2;
        const y = enemy.y - enemy.r - 8;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = theme.enemyBullet;
        ctx.fillRect(x, y, w * (enemy.hp / enemy.maxHp), h);
    }
}

function drawBullets(ctx, state, theme) {
    ctx.fillStyle = theme.bullet;
    ctx.shadowColor = theme.bullet;
    ctx.shadowBlur = 8;

    for (let i = 0; i < state.bullets.length; i++) {
        const b = state.bullets[i];
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.fillRect(b.x - 1, b.y + 3, 2, 7);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.fillStyle = theme.enemyBullet;
    ctx.shadowColor = theme.enemyBullet;
    ctx.shadowBlur = 7;
    for (let i = 0; i < state.enemyBullets.length; i++) {
        const b = state.enemyBullets[i];
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.r - 1);
        ctx.lineTo(b.x + b.r + 1, b.y);
        ctx.lineTo(b.x, b.y + b.r + 1);
        ctx.lineTo(b.x - b.r - 1, b.y);
        ctx.closePath();
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawPowerups(ctx, state, theme, time) {
    for (let i = 0; i < state.powerups.length; i++) {
        const p = state.powerups[i];
        const color = p.kind === "repair" ? theme.plane : theme.powerup;
        const pulse = 1 + Math.sin(time * 5 + p.t * 3) * 0.08;
        const r = p.r * pulse;

        ctx.strokeStyle = color;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = "bold 10px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((POWERUPS[p.kind] && POWERUPS[p.kind].short) || "?", p.x, p.y + 0.5);

        if (p.kind === "shield") {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 4, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
}

function drawParticles(ctx, state, theme) {
    for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colorFor(theme, p.color);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha + 0.5, 0, TAU);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawFloaters(ctx, state, theme) {
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < state.floaters.length; i++) {
        const f = state.floaters[i];
        const alpha = Math.max(0, f.life / f.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colorFor(theme, f.color);
        ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
}

function drawVignette(ctx) {
    const vignette = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.25,
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.72
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

export function renderFrame(ctx, state, themeName, options = {}) {
    const theme = THEMES[themeName] || THEMES.neon;
    const time = state ? state.time : (options.time || 0);
    const reduced = !!options.reduced;

    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground(ctx, theme, time);

    if (state) {
        const shake = reduced ? 0 : state.shake;
        if (shake > 0) {
            ctx.save();
            ctx.translate(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
        }

        drawPowerups(ctx, state, theme, time);
        for (let i = 0; i < state.enemies.length; i++) {
            drawEnemy(ctx, state.enemies[i], theme, time);
        }
        drawBullets(ctx, state, theme);
        drawPlane(ctx, state, theme, time);
        drawParticles(ctx, state, theme);
        drawFloaters(ctx, state, theme);

        if (state.flash > 0) {
            ctx.fillStyle = "rgba(255,40,65," + (state.flash * 0.34).toFixed(3) + ")";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }

        if (shake > 0) ctx.restore();
    } else {
        drawPlane(ctx, null, theme, time);
    }

    drawVignette(ctx);
    ctx.restore();
}

export function createRenderer(canvas) {
    const ctx = canvas.getContext("2d", { alpha: false });

    function resize() {
        const stage = canvas.parentElement;
        if (!stage) return;

        /* The stage is the element the overlays live in, so it has to be the
           exact size of the canvas, not the whole column. Measure the main
           content box first, then shrink the stage to the 2:3 rectangle that
           fits it. */
        const host = stage.parentElement || stage;
        const hostRect = host.getBoundingClientRect();
        const hostStyle = window.getComputedStyle(host);
        const availableW = Math.max(
            1,
            hostRect.width -
            (parseFloat(hostStyle.paddingLeft) || 0) -
            (parseFloat(hostStyle.paddingRight) || 0)
        );
        const availableH = Math.max(
            1,
            hostRect.height -
            (parseFloat(hostStyle.paddingTop) || 0) -
            (parseFloat(hostStyle.paddingBottom) || 0)
        );

        const scale = Math.min(availableW / WIDTH, availableH / HEIGHT);
        const cssW = Math.max(1, Math.floor(WIDTH * scale));
        const cssH = Math.max(1, Math.floor(HEIGHT * scale));

        const stageWidth = cssW + "px";
        const stageHeight = cssH + "px";
        if (stage.style.width !== stageWidth || stage.style.height !== stageHeight) {
            stage.style.width = stageWidth;
            stage.style.height = stageHeight;
        }

        canvas.style.width = "100%";
        canvas.style.height = "100%";

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const backingW = Math.round(cssW * dpr);
        const backingH = Math.round(cssH * dpr);

        if (canvas.width !== backingW || canvas.height !== backingH) {
            canvas.width = backingW;
            canvas.height = backingH;
        }

        /* Map the 400x600 design space onto the backing buffer. */
        ctx.setTransform(
            backingW / WIDTH,
            0,
            0,
            backingH / HEIGHT,
            0,
            0
        );
        ctx.imageSmoothingEnabled = true;
    }

    function draw(state, themeName, options) {
        renderFrame(ctx, state, themeName, options);
    }

    return { resize, draw, ctx };
}
