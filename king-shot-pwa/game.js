/* ============================================================
   KING SHOT — hold the castle wall
   ------------------------------------------------------------
   Total rewrite: slingshot archery defense.
   · Drag anywhere to aim the royal bow, release to loose.
   · Arrows fly on gravity arcs (dotted preview while aiming).
   · Slimes march, bats swoop, brutes soak damage — waves escalate.
   · Monsters reaching the wall cost hearts. 0 hearts = defeat.
   · Power-ups: multishot, piercing, slow-mo, wall repair.
   · Painted scene: night sky, stars, moon, mountains, torches.
   ============================================================ */
(() => {
'use strict';

/* ---------------- dom ---------------- */

const $ = (id) => document.getElementById(id);
const cv = $('game');
const ctx = cv.getContext('2d');
if (!ctx.roundRect) {
    ctx.roundRect = function (x, y, w, h, r) {
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y + h, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
    };
}

const ui = {
    score: $('score'), best: $('best'), wave: $('wave'),
    hearts: $('hearts'), combo: $('combo'), effects: $('effects'),
    banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'),
    hint: $('hint'), btnPause: $('btnPause'), btnSound: $('btnSound'),
    menu: $('menu'), menuBest: $('menuBest'), menuPlays: $('menuPlays'),
    btnPlay: $('btnPlay'), btnTheme: $('btnTheme'), themeName: $('themeName'),
    paused: $('paused'), btnResume: $('btnResume'), btnRestart: $('btnRestart'), btnMenu: $('btnMenu'),
    over: $('over'), overNew: $('overNew'), overScore: $('overScore'),
    overWave: $('overWave'), overKills: $('overKills'), overBest: $('overBest'),
    btnMenuPlay: $('btnMenuPlay'), btnMenu2: $('btnMenu2'), btnTheme2: $('btnTheme2'), themeName2: $('themeName2'),
};

/* ---------------- helpers ---------------- */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* ---------------- palettes (drive the whole scene) ---------------- */

const PALETTES = {
    royal: {
        name: 'Royal Night',
        sky: ['#0b1026', '#1a1a3e', '#2b2150'],
        hillFar: '#1a2048', hillNear: '#10142c',
        wall: '#4a5074', wallDark: '#33395a', wallLine: '#2a2f4e',
        accent: '#f6c945',
        moon: '#efeaff', torch: '#ffb14d',
        slime: '#7be36b', slimeDark: '#49a044',
        bat: '#c084fc', batDark: '#8b5cf6',
        brute: '#aab2c6', bruteDark: '#6d768c',
        tunic: '#3f6fd8', cape: '#b3323e', skin: '#f2c99b',
    },
    neon: {
        name: 'Synthwave',
        sky: ['#14002e', '#310a52', '#5a1580'],
        hillFar: '#31105e', hillNear: '#1c0838',
        wall: '#4a2f78', wallDark: '#32205a', wallLine: '#2a1a4e',
        accent: '#00f0ff',
        moon: '#ffd6f2', torch: '#ff4dd2',
        slime: '#39ff88', slimeDark: '#1da854',
        bat: '#ff4dd2', batDark: '#c4248f',
        brute: '#8f7bff', bruteDark: '#5a48b0',
        tunic: '#12d8c8', cape: '#ff3d6e', skin: '#f2c99b',
    },
    forest: {
        name: 'Emerald Dawn',
        sky: ['#0a1f14', '#16382a', '#1e5540'],
        hillFar: '#1d4a35', hillNear: '#0f2c20',
        wall: '#4a6048', wallDark: '#334733', wallLine: '#2a3c2b',
        accent: '#8de969',
        moon: '#f4ffe0', torch: '#ffcf4d',
        slime: '#a5e84d', slimeDark: '#5f9c2a',
        bat: '#e8c84d', batDark: '#a8882a',
        brute: '#8fa878', bruteDark: '#5a7048',
        tunic: '#3d8a4f', cape: '#8a5a2b', skin: '#f2c99b',
    },
    ocean: {
        name: 'Deep Tide',
        sky: ['#02101f', '#06304d', '#0a4a6e'],
        hillFar: '#0a3a58', hillNear: '#052438',
        wall: '#3a5a72', wallDark: '#28435a', wallLine: '#223a4e',
        accent: '#4fd8eb',
        moon: '#e0f6ff', torch: '#7fd8ff',
        slime: '#4dd8b0', slimeDark: '#2a9c78',
        bat: '#7fb2ff', batDark: '#4a7ac4',
        brute: '#8aa8b8', bruteDark: '#567488',
        tunic: '#2a7ac4', cape: '#c45a3d', skin: '#f2c99b',
    },
};

/* ---------------- persistence ---------------- */

const STORE_KEY = 'king-shot-pwa';
const store = { best: 0, theme: 'royal', plays: 0 };

function loadStore() {
    const d = R2.loadJSON(STORE_KEY, {}) || {};
    store.best = d.best != null ? d.best : (d.highScore || 0);   // migrate legacy saves
    store.plays = d.plays || 0;
    store.theme = PALETTES[d.theme] ? d.theme : 'royal';
}
function saveStore() { R2.saveJSON(STORE_KEY, store); }

/* ---------------- audio ---------------- */

const Sound = R2.makeSound({
    hit: [740, 0.06, 'square'],
    kill: [980, 0.12, 'square'],
    hurt: [150, 0.28, 'sawtooth'],
    wave: [660, 0.16, 'triangle'],
    power: [1180, 0.2, 'sine'],
    over: [170, 0.5, 'sawtooth'],
    ui: [520, 0.05, 'triangle'],
});
const shootSound = (p) => R2.play(300 + 340 * p, 0.09, 'triangle');

/* ---------------- particles & floating text ---------------- */

const parts = [];   // {x,y,vx,vy,life,decay,size,color,glow,grav}
const pops = [];    // {x,y,txt,color,size,life}

function burst(x, y, color, n, spd, glow) {
    for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), s = rand(spd * 0.3, spd);
        parts.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.25,
            life: 1, decay: rand(1.4, 2.4), size: rand(1.6, 3.4),
            color, glow, grav: 300,
        });
    }
    if (parts.length > 240) parts.splice(0, parts.length - 240);
}

function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += (p.grav || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
}

function drawParts() {
    for (let pass = 0; pass < 2; pass++) {
        ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
        for (const p of parts) {
            if ((pass === 1) !== !!p.glow) continue;
            ctx.globalAlpha = clamp(p.life, 0, 1) * (pass ? 0.85 : 0.9);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.4, p.size * (0.4 + 0.6 * p.life)), 0, TAU);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

function popup(x, y, txt, color, size) {
    pops.push({ x: clamp(x, 46, view.w - 46), y, txt, color, size: size || 15, life: 1 });
    if (pops.length > 18) pops.shift();
}

function updatePops(dt) {
    for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].life -= dt * 1.05;
        if (pops[i].life <= 0) pops.splice(i, 1);
    }
}

function drawPops() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of pops) {
        const a = clamp(p.life, 0, 1);
        const y = p.y - (1 - a) * 34;
        ctx.font = '800 ' + p.size + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.globalAlpha = a;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(5,7,18,0.65)';
        ctx.strokeText(p.txt, p.x, y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.txt, p.x, y);
    }
    ctx.globalAlpha = 1;
}

/* ---------------- view & scenery ---------------- */

const view = { w: 0, h: 0, dpr: 1, wallTop: 0 };
let stars = [], hillsFar = [], hillsNear = [];
let skyGrad = null, skyKey = '', vigGrad = null;

function resize() {
    const oldW = view.w, oldH = view.h;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    cv.width = Math.round(view.w * view.dpr);
    cv.height = Math.round(view.h * view.dpr);
    view.wallTop = view.h - Math.max(96, view.h * 0.16);

    if (oldW && oldH) {   // keep live entities proportional
        const sx = view.w / oldW, sy = view.h / oldH;
        for (const e of S.enemies) { e.x *= sx; e.y *= sy; e.vy *= sy; if (e.baseX !== undefined) { e.baseX *= sx; e.amp *= sx; } }
        for (const a of S.arrows) { a.x *= sx; a.y *= sy; a.px *= sx; a.py *= sy; a.vx *= sx; a.vy *= sy; }
        for (const p of S.pickups) { p.x *= sx; p.y *= sy; }
    }
    genScenery();
    skyKey = '';
    vigGrad = null;
}

function genScenery() {
    stars = [];
    const n = Math.round((view.w * view.h) / 9000);
    for (let i = 0; i < n; i++) {
        stars.push({ fx: Math.random(), fy: Math.random() * 0.52, r: rand(0.5, 1.7), tw: rand(0, TAU) });
    }
    hillsFar = []; hillsNear = [];
    const p1 = rand(0, 9), p2 = rand(0, 9), p3 = rand(0, 9), p4 = rand(0, 9);
    for (let x = -40; x <= view.w + 40; x += 24) {
        hillsFar.push({
            x,
            y: view.h * 0.62 - (Math.sin(x * 0.011 + p1) * 0.55 + Math.sin(x * 0.027 + p2) * 0.3) * view.h * 0.09,
        });
        hillsNear.push({
            x,
            y: view.h * 0.74 - (Math.sin(x * 0.014 + p3) * 0.5 + Math.sin(x * 0.033 + p4) * 0.35) * view.h * 0.10,
        });
    }
}

/* ---------------- game state ---------------- */

const S = {
    phase: 'menu',          // menu | play | paused | over
    time: 0,
    score: 0, kills: 0, wave: 0, combo: 0, comboMult: 1,
    hp: 5, maxHp: 5,
    arrows: [], enemies: [], pickups: [],
    fx: { multi: 0, pierce: 0, slow: 0 },
    aim: { active: false, x: 0, y: 0, angle: -Math.PI / 2, power: 0.7 },
    kb: { angle: -Math.PI / 2, power: 0.8, active: false },
    keys: new Set(),
    shake: 0, hurt: 0,
    spawnQueue: [], spawnT: 0, spawnGap: 1.2, restT: 0,
    cooldown: 0, shots: 0, runStart: 0,
};

const KX = () => view.w / 2;
const KY = () => view.wallTop + 8;          // king's feet
const G = () => view.h * 1.3;               // gravity
const launchSpeed = (p) => view.h * (0.52 + 0.85 * p);
const clampAngle = (a) => clamp(a, -Math.PI + 0.12, -0.12);

/* ---------------- enemies & waves ---------------- */

function pickType() {
    const r = Math.random();
    if (S.wave >= 3 && r < 0.16) return 'brute';
    if (S.wave >= 2 && r < 0.42) return 'bat';
    return 'slime';
}

function spawnEnemy(type) {
    const x = rand(34, view.w - 34);
    const e = { type, x, y: -46, t: rand(0, 6), ph: rand(0, 6), flash: 0, hp: 1, r: 15, pts: 10, dmg: 1 };
    const sp = 1 + Math.min(S.wave, 14) * 0.055;
    if (type === 'slime') {
        e.vy = view.h * rand(0.05, 0.066) * sp; e.r = 15; e.pts = 10;
    } else if (type === 'bat') {
        e.vy = view.h * rand(0.085, 0.105) * sp; e.r = 12; e.pts = 15;
        e.baseX = x;
        e.amp = Math.min(view.w * 0.07, x - 26, view.w - 26 - x);
        e.freq = rand(1.8, 2.6);
    } else {
        e.vy = view.h * 0.034 * sp; e.hp = 3; e.r = 22; e.pts = 40; e.dmg = 2;
    }
    S.enemies.push(e);
}

const TAUNTS = ['Hold the line!', 'They keep coming…', 'Steady, your majesty!', 'The horde thickens…', 'Archers ready!'];

function startWave(n) {
    S.wave = n;
    const count = Math.min(5 + n * 2, 26);
    S.spawnQueue = [];
    for (let i = 0; i < count; i++) S.spawnQueue.push(pickType());
    S.spawnGap = Math.max(0.55, 1.45 - n * 0.075);
    S.spawnT = n === 1 ? 0.9 : 1.6;
    banner('WAVE ' + n, n === 1 ? 'Defend the castle!' : pick(TAUNTS));
    Sound.wave();
}

/* ---------------- pickups ---------------- */

const PICKUPS = {
    multi: { color: '#3fd8ff', glyph: 'M', label: 'MULTISHOT ×3' },
    pierce: { color: '#c99cff', glyph: 'P', label: 'PIERCING 8s' },
    slow: { color: '#6db1ff', glyph: 'S', label: 'SLOW-MO 6s' },
    repair: { color: '#ff7ab8', glyph: '+', label: '+1 WALL' },
};

function makePickup(x, y) {
    return { x, y, t: rand(0, 6), type: pick(['multi', 'pierce', 'slow', 'repair']), r: 13 };
}

function collect(p) {
    const def = PICKUPS[p.type];
    if (p.type === 'repair') {
        if (S.hp < S.maxHp) { S.hp++; renderHearts(); }
        else { S.score += 50; popup(p.x, p.y, '+50', def.color); }
    } else if (p.type === 'multi') {
        S.fx.multi = 3;
    } else if (p.type === 'pierce') {
        S.fx.pierce = 8;
    } else {
        S.fx.slow = 6;
    }
    popup(p.x, p.y - 10, def.label, def.color, 14);
    burst(p.x, p.y, def.color, 12, 120, true);
    Sound.power();
    R2.buzz(15);
}

/* ---------------- shooting ---------------- */

function launch(angle, power) {
    const v = launchSpeed(power);
    const hx = KX() + Math.cos(angle) * 18;
    const hy = KY() - 24 + Math.sin(angle) * 18;
    S.arrows.push({
        x: hx, y: hy, px: hx, py: hy,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        angle, pierce: S.fx.pierce > 0, hit: new Set(), hitSomething: false, stuck: 0,
    });
}

function fire(power, angle) {
    if (S.phase !== 'play' || S.cooldown > 0) return;
    const p = clamp(power, 0.25, 1);
    const shots = S.fx.multi > 0 ? 3 : 1;
    if (S.fx.multi > 0) S.fx.multi--;
    for (let k = 0; k < shots; k++) {
        launch(clampAngle(angle + (k - (shots - 1) / 2) * 0.11), p);
    }
    S.cooldown = shots > 1 ? 0.5 : 0.27;
    S.shots++;
    S.shake = Math.max(S.shake, 2);
    shootSound(p);
    R2.buzz(8);
}

/* ---------------- combat ---------------- */

function segCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((cx - x1) * dx + (cy - y1) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    const px = x1 + dx * t - cx, py = y1 + dy * t - cy;
    return px * px + py * py <= r * r;
}

function enemyColor(e) {
    const P = PALETTES[store.theme];
    return e.type === 'slime' ? P.slime : e.type === 'bat' ? P.bat : P.brute;
}

function hitEnemy(e, hx, hy) {
    e.hp -= 1;
    e.flash = 0.12;
    e.y -= 5;
    if (e.hp > 0) {
        burst(hx, hy, '#ffffff', 5, 90, true);
        Sound.hit();
        return false;
    }
    S.kills++;
    S.combo++;
    const prevMult = S.comboMult;
    S.comboMult = Math.min(5, 1 + Math.floor(S.combo / 4));
    const pts = e.pts * S.comboMult;
    S.score += pts;
    popup(e.x, e.y - e.r - 4, '+' + pts, S.comboMult > 1 ? PALETTES[store.theme].accent : '#ffffff');
    if (S.comboMult > prevMult) popup(e.x, e.y - e.r - 26, 'COMBO ×' + S.comboMult, PALETTES[store.theme].accent, 13);
    burst(e.x, e.y, enemyColor(e), 14, 130, true);
    Sound.kill();
    R2.buzz(12);
    S.shake = Math.max(S.shake, 3);
    if (Math.random() < 0.13) S.pickups.push(makePickup(e.x, e.y));
    return true;
}

function hitCastle(e) {
    S.hp -= e.dmg;
    S.combo = 0;
    S.comboMult = 1;
    S.shake = Math.max(S.shake, 13);
    S.hurt = 1;
    burst(e.x, view.wallTop, '#ff5d6c', 18, 170, true);
    popup(e.x, view.wallTop - 34, '-' + e.dmg + ' ♥', '#ff5d6c', 17);
    Sound.hurt();
    R2.buzz(90);
    renderHearts();
    if (S.hp <= 0) gameOver();
}

/* ---------------- update ---------------- */

let emberAcc = 0;

function ambient(dt) {
    const P = PALETTES[store.theme];
    emberAcc += dt;
    if (emberAcc < 0.14) return;
    emberAcc = 0;
    for (const tx of [view.w * 0.14, view.w * 0.86]) {
        parts.push({
            x: tx + rand(-2.5, 2.5), y: view.wallTop - 18,
            vx: rand(-6, 6), vy: -rand(14, 32),
            life: 1, decay: rand(0.7, 1.1), size: rand(1.2, 2.4),
            color: P.torch, glow: true, grav: -6,
        });
    }
}

function decayFx(dt) {
    S.shake = Math.max(0, S.shake - dt * 26);
    S.hurt = Math.max(0, S.hurt - dt * 1.8);
}

function updateArrows(dt) {
    for (let i = S.arrows.length - 1; i >= 0; i--) {
        const a = S.arrows[i];

        if (a.stuck > 0) {
            a.stuck -= dt;
            if (a.stuck <= 0) S.arrows.splice(i, 1);
            continue;
        }

        a.px = a.x; a.py = a.y;
        a.vy += G() * dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.angle = Math.atan2(a.vy, a.vx);

        // stick into the wall walkway
        if (a.vy > 0 && a.y >= view.wallTop + 4) {
            a.y = view.wallTop + 4;
            a.vx = 0; a.vy = 0;
            a.angle = Math.PI / 2;
            a.stuck = 1.1;
            burst(a.x, a.y, '#c9bfa3', 4, 60, false);
            continue;
        }

        // gone off-screen
        if (a.x < -50 || a.x > view.w + 50 || a.y < -80) {
            if (!a.hitSomething && S.combo > 0) {
                S.combo = 0;
                S.comboMult = 1;
                popup(clamp(a.x, 46, view.w - 46), view.h * 0.22, 'MISS', 'rgba(255,255,255,0.55)', 13);
            }
            S.arrows.splice(i, 1);
            continue;
        }

        // enemy collisions (swept segment so fast arrows can't tunnel)
        let removed = false;
        for (let j = S.enemies.length - 1; j >= 0; j--) {
            const e = S.enemies[j];
            if (a.hit.has(e)) continue;
            if (segCircle(a.px, a.py, a.x, a.y, e.x, e.y, e.r + 4)) {
                a.hit.add(e);
                a.hitSomething = true;
                if (hitEnemy(e, a.x, a.y)) S.enemies.splice(j, 1);
                if (!a.pierce) {
                    burst(a.x, a.y, '#ffffff', 4, 80, true);
                    S.arrows.splice(i, 1);
                    removed = true;
                    break;
                }
            }
        }
        if (removed) continue;

        // pickup grabs
        for (let j = S.pickups.length - 1; j >= 0; j--) {
            const p = S.pickups[j];
            if (Math.hypot(a.x - p.x, a.y - p.y) < p.r + 8) {
                collect(p);
                S.pickups.splice(j, 1);
                if (!a.pierce) { S.arrows.splice(i, 1); removed = true; break; }
            }
        }
    }
}

function updateEnemies(dt) {
    const ts = S.fx.slow > 0 ? 0.42 : 1;
    for (let i = S.enemies.length - 1; i >= 0; i--) {
        const e = S.enemies[i];
        e.t += dt * ts;
        e.flash = Math.max(0, e.flash - dt);
        if (e.type === 'bat') {
            e.y += e.vy * dt * ts;
            e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
        } else if (e.type === 'slime') {
            e.y += e.vy * dt * ts;
            e.x += Math.sin(e.t * 2 + e.ph) * 14 * dt * ts;
        } else {
            e.y += e.vy * dt * ts;
        }
        if (e.y >= view.wallTop - e.r * 0.5) {
            S.enemies.splice(i, 1);
            hitCastle(e);
        }
    }
}

function updatePickups(dt) {
    for (let i = S.pickups.length - 1; i >= 0; i--) {
        const p = S.pickups[i];
        p.t += dt;
        p.y += view.h * 0.045 * dt;
        if (p.y >= view.wallTop - 16) {   // drifted down to the wall → auto-collect
            collect(p);
            S.pickups.splice(i, 1);
        }
    }
}

function updateKeys(dt) {
    if (!S.keys.size) return;
    S.kb.active = true;
    if (S.keys.has('ArrowLeft')) S.kb.angle -= 1.5 * dt;
    if (S.keys.has('ArrowRight')) S.kb.angle += 1.5 * dt;
    if (S.keys.has('ArrowUp')) S.kb.power = clamp(S.kb.power + 0.7 * dt, 0.25, 1);
    if (S.keys.has('ArrowDown')) S.kb.power = clamp(S.kb.power - 0.7 * dt, 0.25, 1);
    S.kb.angle = clampAngle(S.kb.angle);
}

function update(dt) {
    S.time += dt;
    updateKeys(dt);
    ambient(dt);
    updateParts(dt);
    updatePops(dt);
    decayFx(dt);
    if (S.phase !== 'play') return;

    S.cooldown = Math.max(0, S.cooldown - dt);
    S.fx.pierce = Math.max(0, S.fx.pierce - dt);
    S.fx.slow = Math.max(0, S.fx.slow - dt);

    // wave director
    if (S.spawnQueue.length) {
        S.spawnT -= dt;
        if (S.spawnT <= 0) {
            spawnEnemy(S.spawnQueue.shift());
            S.spawnT = S.spawnGap * rand(0.7, 1.35);
        }
    } else if (!S.enemies.length && S.restT <= 0 && S.wave > 0) {
        S.restT = 1.5;
        const bonus = 25 * S.wave;
        S.score += bonus;
        popup(view.w / 2, view.h * 0.34, 'WAVE CLEAR +' + bonus, PALETTES[store.theme].accent, 17);
    }
    if (S.restT > 0) {
        S.restT -= dt;
        if (S.restT <= 0) startWave(S.wave + 1);
    }

    updateArrows(dt);
    updateEnemies(dt);
    updatePickups(dt);
    syncHud();
}

/* ---------------- rendering ---------------- */

function render() {
    const P = PALETTES[store.theme];
    const W = view.w, H = view.h;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (S.shake > 0.2) ctx.translate(rand(-1, 1) * S.shake * 0.6, rand(-1, 1) * S.shake * 0.6);

    drawSky(P, W, H);
    drawStars(P, W, H);
    drawMoon(P, W, H);
    drawHills(P, W, H);
    drawWall(P, W, H);
    drawTorches(P, W, H);
    drawPickups(P);
    drawAim(P);
    drawEnemies(P);
    drawArrows(P);
    drawKing(P);
    drawParts();
    drawPops();

    if (S.hurt > 0) {
        ctx.fillStyle = 'rgba(255,70,80,' + (S.hurt * 0.24).toFixed(3) + ')';
        ctx.fillRect(-30, -30, W + 60, H + 60);
    }
    if (!vigGrad) {
        vigGrad = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.max(W, H) * 0.78);
        vigGrad.addColorStop(0, 'rgba(0,0,10,0)');
        vigGrad.addColorStop(1, 'rgba(0,0,10,0.5)');
    }
    ctx.fillStyle = vigGrad;
    ctx.fillRect(-30, -30, W + 60, H + 60);
}

function drawSky(P, W, H) {
    const key = store.theme + '|' + W + 'x' + H;
    if (skyKey !== key) {
        skyKey = key;
        skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, P.sky[0]);
        skyGrad.addColorStop(0.55, P.sky[1]);
        skyGrad.addColorStop(1, P.sky[2]);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-30, -30, W + 60, H + 60);
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
        ctx.globalAlpha = 0.22 + 0.42 * (0.5 + 0.5 * Math.sin(S.time * 1.4 + s.tw));
        ctx.beginPath();
        ctx.arc(s.fx * view.w, s.fy * view.h, s.r, 0, TAU);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawMoon(P) {
    const mx = view.w * 0.79, my = view.h * 0.15, r = Math.min(view.w, view.h) * 0.055;
    const glow = ctx.createRadialGradient(mx, my, r * 0.4, mx, my, r * 3.2);
    glow.addColorStop(0, 'rgba(240,236,255,0.30)');
    glow.addColorStop(1, 'rgba(240,236,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mx, my, r * 3.2, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = P.moon;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,20,0.10)';
    ctx.beginPath(); ctx.arc(mx - r * 0.3, my - r * 0.15, r * 0.22, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.25, my + r * 0.3, r * 0.16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.4, my - r * 0.35, r * 0.12, 0, TAU); ctx.fill();
}

function drawHills(P) {
    ctx.fillStyle = P.hillFar;
    ctx.beginPath();
    ctx.moveTo(-40, view.h + 30);
    for (const p of hillsFar) ctx.lineTo(p.x, p.y);
    ctx.lineTo(view.w + 40, view.h + 30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = P.hillNear;
    ctx.beginPath();
    ctx.moveTo(-40, view.h + 30);
    for (const p of hillsNear) ctx.lineTo(p.x, p.y);
    ctx.lineTo(view.w + 40, view.h + 30);
    ctx.closePath();
    ctx.fill();
}

function drawWall(P) {
    const W = view.w, H = view.h, wt = view.wallTop;

    const g = ctx.createLinearGradient(0, wt, 0, H);
    g.addColorStop(0, P.wall);
    g.addColorStop(1, P.wallDark);
    ctx.fillStyle = g;
    ctx.fillRect(-30, wt, W + 60, H - wt + 30);

    // brickwork
    ctx.strokeStyle = P.wallLine;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    const rowH = 16, brickW = 34;
    let row = 0;
    for (let y = wt + rowH; y < H + rowH; y += rowH, row++) {
        ctx.beginPath();
        ctx.moveTo(-30, y);
        ctx.lineTo(W + 30, y);
        ctx.stroke();
        const off = (row % 2) * (brickW / 2);
        for (let x = -brickW + off; x < W + brickW; x += brickW) {
            ctx.beginPath();
            ctx.moveTo(x, y - rowH);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;

    // crenellations
    ctx.fillStyle = P.wall;
    for (let x = 4; x < W - 26; x += 46) {
        ctx.roundRect(x, wt - 15, 30, 17, 3);
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(-30, wt, W + 60, 2.5);

    // flag behind the king
    const fx = KX() + 26, poleTop = wt - 15 - 64;
    ctx.strokeStyle = '#6b6250';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, wt - 12);
    ctx.lineTo(fx, poleTop);
    ctx.stroke();
    ctx.fillStyle = P.cape;
    ctx.beginPath();
    ctx.moveTo(fx, poleTop + 2);
    const flap = Math.sin(S.time * 3) * 4;
    ctx.quadraticCurveTo(fx + 20, poleTop + 6 + flap, fx + 36, poleTop + 9 + flap);
    ctx.lineTo(fx + 34, poleTop + 20 + flap);
    ctx.quadraticCurveTo(fx + 18, poleTop + 18 + flap * 0.6, fx, poleTop + 20);
    ctx.closePath();
    ctx.fill();
}

function drawTorches(P) {
    const wt = view.wallTop;
    for (const [i, tx] of [view.w * 0.14, view.w * 0.86].entries()) {
        const y0 = wt - 15;
        // bracket + stick
        ctx.fillStyle = '#3a3325';
        ctx.fillRect(tx - 1.5, y0 - 14, 3, 14);
        ctx.fillStyle = '#2a2519';
        ctx.beginPath();
        ctx.arc(tx, y0 - 14, 3, 0, TAU);
        ctx.fill();
        // flame
        const flick = 0.78 + 0.18 * Math.sin(S.time * 11 + i * 2.4) + 0.06 * Math.sin(S.time * 23 + i);
        const fy = y0 - 20;
        const glow = ctx.createRadialGradient(tx, fy, 1, tx, fy, 30 * flick);
        glow.addColorStop(0, 'rgba(255,190,90,0.34)');
        glow.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(tx, fy, 30 * flick, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = P.torch;
        ctx.beginPath();
        ctx.ellipse(tx, fy + 3, 4.2 * flick, 8.5 * flick, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff3c8';
        ctx.beginPath();
        ctx.ellipse(tx, fy + 4.5, 2 * flick, 4.2 * flick, 0, 0, TAU);
        ctx.fill();
    }
}

function drawPickups(P) {
    for (const p of S.pickups) {
        const def = PICKUPS[p.type];
        const bob = Math.sin(p.t * 4) * 3;
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(p.x, p.y + bob, 2, p.x, p.y + bob, 22);
        glow.addColorStop(0, def.color + '55');
        glow.addColorStop(1, def.color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 22, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = def.color;
        ctx.roundRect(-9, -9, 18, 18, 5);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#10131f';
        ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.glyph, p.x, p.y + bob + 0.5);
    }
}

function drawAim(P) {
    if (S.phase !== 'play') return;
    const aiming = S.aim.active || S.kb.active;
    if (!aiming) return;

    const angle = S.aim.active ? S.aim.angle : S.kb.angle;
    const power = S.aim.active ? S.aim.power : S.kb.power;

    // dotted trajectory preview
    const hx = KX() + Math.cos(angle) * 18;
    const hy = KY() - 24 + Math.sin(angle) * 18;
    let vx = Math.cos(angle) * launchSpeed(power);
    let vy = Math.sin(angle) * launchSpeed(power);
    let x = hx, y = hy;
    const st = 1 / 40;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 44; i++) {
        vy += G() * st;
        x += vx * st;
        y += vy * st;
        if (y > view.wallTop - 4 || x < 0 || x > view.w) break;
        if (i % 2 === 0) {
            const f = i / 44;
            ctx.globalAlpha = (1 - f) * 0.55;
            ctx.fillStyle = P.accent;
            ctx.beginPath();
            ctx.arc(x, y, 3.2 - 2 * f, 0, TAU);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // power arc around the king
    ctx.strokeStyle = P.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(KX(), KY() - 24, 30, -Math.PI / 2, -Math.PI / 2 + power * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // reticle at pointer
    if (S.aim.active) {
        ctx.strokeStyle = P.accent;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(S.aim.x, S.aim.y, 12, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(S.aim.x, S.aim.y, 2, 0, TAU);
        ctx.stroke();
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            ctx.beginPath();
            ctx.moveTo(S.aim.x + dx * 7, S.aim.y + dy * 7);
            ctx.lineTo(S.aim.x + dx * 16, S.aim.y + dy * 16);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}

function drawEnemies(P) {
    for (const e of S.enemies) {
        ctx.save();
        if (e.type === 'slime') {
            const sq = 1 + Math.sin(e.t * 6.5) * 0.09;
            ctx.fillStyle = P.slime;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y, e.r * sq, (e.r / sq) * 0.95, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = P.slimeDark;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.r * 0.45, e.r * 0.8 * sq, e.r * 0.4, 0, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(e.x - e.r * 0.35, e.y - e.r * 0.45, e.r * 0.28, e.r * 0.16, -0.5, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            drawEyes(e, P, 4.5, 2);
        } else if (e.type === 'bat') {
            const flap = Math.sin(e.t * 15);
            ctx.fillStyle = P.batDark;
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(e.x + side * e.r * 0.5, e.y - 2);
                ctx.quadraticCurveTo(e.x + side * e.r * 1.8, e.y - 8 - flap * 7, e.x + side * e.r * 2.2, e.y + 2 - flap * 9);
                ctx.quadraticCurveTo(e.x + side * e.r * 1.4, e.y + 6, e.x + side * e.r * 0.5, e.y + 4);
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = P.bat;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y, e.r * 0.95, e.r * 1.05, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = P.batDark;
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(e.x + side * 3, e.y - e.r);
                ctx.lineTo(e.x + side * 7, e.y - e.r - 6);
                ctx.lineTo(e.x + side * 8, e.y - e.r + 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffd54d';
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(e.x + side * 3.6, e.y - 2, 1.9, 0, TAU);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        } else {   // brute
            ctx.fillStyle = P.brute;
            ctx.roundRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, 9);
            ctx.fill();
            ctx.fillStyle = P.bruteDark;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.r * 0.75, e.r * 0.9, e.r * 0.45, 0, 0, TAU);
            ctx.fill();
            // helmet
            ctx.fillStyle = P.bruteDark;
            ctx.beginPath();
            ctx.arc(e.x, e.y - 2, e.r * 0.86, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#e8e4d8';
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(e.x + side * e.r * 0.8, e.y - e.r * 0.45);
                ctx.lineTo(e.x + side * e.r * 1.25, e.y - e.r * 1.05);
                ctx.lineTo(e.x + side * e.r * 0.62, e.y - e.r * 0.8);
                ctx.closePath();
                ctx.fill();
            }
            // visor + eyes
            ctx.fillStyle = 'rgba(10,10,20,0.75)';
            ctx.fillRect(e.x - e.r * 0.62, e.y - e.r * 0.28, e.r * 1.24, e.r * 0.34);
            ctx.fillStyle = e.hp === 1 ? '#ff4d4d' : '#ff9d4d';
            const er = e.hp === 1 ? 2.6 : 1.9;
            ctx.beginPath(); ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.11, er, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + e.r * 0.3, e.y - e.r * 0.11, er, 0, TAU); ctx.fill();
            // damage cracks
            if (e.hp <= 2) {
                ctx.strokeStyle = 'rgba(10,10,20,0.5)';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(e.x - e.r * 0.5, e.y + e.r * 0.2);
                ctx.lineTo(e.x - e.r * 0.2, e.y + e.r * 0.55);
                ctx.lineTo(e.x - e.r * 0.35, e.y + e.r * 0.9);
                ctx.stroke();
            }
            if (e.hp === 1) {
                ctx.beginPath();
                ctx.moveTo(e.x + e.r * 0.55, e.y);
                ctx.lineTo(e.x + e.r * 0.25, e.y + e.r * 0.4);
                ctx.lineTo(e.x + e.r * 0.45, e.y + e.r * 0.75);
                ctx.stroke();
            }
        }
        // hit flash
        if (e.flash > 0) {
            ctx.globalAlpha = Math.min(0.75, e.flash * 5.5);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * 1.05, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }
}

function drawEyes(e, P, spread, yOff) {
    const dx = KX() - e.x, dy = KY() - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ox = (dx / d) * 1.5, oy = (dy / d) * 1.5;
    for (const side of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e.x + side * spread, e.y - yOff, 3.1, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#10131f';
        ctx.beginPath();
        ctx.arc(e.x + side * spread + ox, e.y - yOff + oy, 1.5, 0, TAU);
        ctx.fill();
    }
}

function drawArrows(P) {
    for (const a of S.arrows) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        ctx.globalAlpha = a.stuck > 0 ? 0.9 : 1;
        // shaft
        ctx.strokeStyle = '#d9cba0';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        // head
        ctx.fillStyle = '#eef0f6';
        ctx.beginPath();
        ctx.moveTo(3, -2.6);
        ctx.lineTo(8.5, 0);
        ctx.lineTo(3, 2.6);
        ctx.closePath();
        ctx.fill();
        // fletching
        ctx.fillStyle = a.pierce ? '#c99cff' : P.accent;
        for (const fy of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(-19, fy * 3.4);
            ctx.lineTo(-12, fy * 1.4);
            ctx.closePath();
            ctx.fill();
        }
        // pierce aura
        if (a.pierce && a.stuck <= 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(201,156,255,0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, 6.5, 0, TAU);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

function drawKing(P) {
    const kx = KX();
    const feet = KY();
    const bob = Math.sin(S.time * 2.1) * 1.6;

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(kx, feet + 3, 16, 4, 0, 0, TAU);
    ctx.fill();

    // cape
    const capeWave = Math.sin(S.time * 1.7) * 3;
    ctx.fillStyle = P.cape;
    ctx.beginPath();
    ctx.moveTo(kx - 3, feet - 36 + bob);
    ctx.quadraticCurveTo(kx - 20, feet - 26 + bob, kx - 16 + capeWave, feet - 8);
    ctx.quadraticCurveTo(kx - 8, feet - 12, kx - 2, feet - 14 + bob);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.fillStyle = P.tunic;
    ctx.roundRect(kx - 9, feet - 40 + bob, 18, 26, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(kx - 9, feet - 22 + bob, 18, 3.5);

    // head
    ctx.fillStyle = P.skin;
    ctx.beginPath();
    ctx.arc(kx, feet - 46 + bob, 7.5, 0, TAU);
    ctx.fill();

    // crown
    ctx.fillStyle = P.accent;
    ctx.beginPath();
    ctx.moveTo(kx - 6.5, feet - 50 + bob);
    ctx.lineTo(kx - 6.5, feet - 56 + bob);
    ctx.lineTo(kx - 3.5, feet - 52.5 + bob);
    ctx.lineTo(kx, feet - 58 + bob);
    ctx.lineTo(kx + 3.5, feet - 52.5 + bob);
    ctx.lineTo(kx + 6.5, feet - 56 + bob);
    ctx.lineTo(kx + 6.5, feet - 50 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c0394b';
    ctx.beginPath();
    ctx.arc(kx, feet - 52.4 + bob, 1.1, 0, TAU);
    ctx.fill();

    // eyes follow the aim
    const aimA = S.aim.active ? S.aim.angle : (S.kb.active ? S.kb.angle : -Math.PI / 2);
    const ex = Math.cos(aimA) * 1.4, ey = Math.sin(aimA) * 1.4;
    ctx.fillStyle = '#10131f';
    ctx.beginPath(); ctx.arc(kx - 2.6 + ex, feet - 46 + bob + ey, 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(kx + 2.6 + ex, feet - 46 + bob + ey, 1.15, 0, TAU); ctx.fill();

    // bow (rotates toward aim, string pulls back with power)
    const sx = kx, sy = feet - 34 + bob;
    const power = (S.aim.active ? S.aim.power : (S.kb.active ? S.kb.power : 0));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(aimA);
    // string
    const tipY = 15 * Math.sin(1.15);
    const pull = 1 - 11.5 * power;
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(11, -tipY);
    ctx.lineTo(pull, 0);
    ctx.lineTo(11, tipY);
    ctx.stroke();
    // nocked arrow
    if (power > 0.02) {
        ctx.strokeStyle = '#d9cba0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pull, 0);
        ctx.lineTo(pull + 20, 0);
        ctx.stroke();
        ctx.fillStyle = '#eef0f6';
        ctx.beginPath();
        ctx.moveTo(pull + 20, -2.2);
        ctx.lineTo(pull + 25, 0);
        ctx.lineTo(pull + 20, 2.2);
        ctx.closePath();
        ctx.fill();
    }
    // bow limb
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(5, 0, 15, -1.15, 1.15);
    ctx.stroke();
    ctx.restore();
}

/* ---------------- HUD ---------------- */

const hudCache = { score: -1, best: -1, wave: -1, combo: '', fx: '' };

function syncHud() {
    if (hudCache.score !== S.score) { hudCache.score = S.score; ui.score.textContent = S.score; }
    const best = Math.max(store.best, S.score);
    if (hudCache.best !== best) { hudCache.best = best; ui.best.textContent = best; }
    if (hudCache.wave !== S.wave) { hudCache.wave = S.wave; ui.wave.textContent = S.wave; }

    const c = S.comboMult > 1 ? '×' + S.comboMult : '';
    if (c !== hudCache.combo) {
        hudCache.combo = c;
        ui.combo.textContent = c;
        ui.combo.classList.toggle('hidden', !c);
    }

    const fxKey = S.fx.multi + '|' + Math.ceil(S.fx.pierce) + '|' + Math.ceil(S.fx.slow);
    if (fxKey !== hudCache.fx) {
        hudCache.fx = fxKey;
        let html = '';
        if (S.fx.multi > 0) html += chip('#3fd8ff', '✦ ×' + S.fx.multi);
        if (S.fx.pierce > 0) html += chip('#c99cff', 'P ' + Math.ceil(S.fx.pierce) + 's');
        if (S.fx.slow > 0) html += chip('#6db1ff', 'S ' + Math.ceil(S.fx.slow) + 's');
        ui.effects.innerHTML = html;
    }

    ui.hint.classList.toggle('show', S.phase === 'play' && S.wave === 1 && S.shots === 0);
}

function chip(color, text) {
    return '<span class="chip" style="background:' + color + '">' + text + '</span>';
}

function renderHearts() {
    let html = '';
    for (let i = 0; i < S.maxHp; i++) {
        html += '<span class="' + (i < S.hp ? '' : 'lost') + '">♥</span>';
    }
    ui.hearts.innerHTML = html;
    ui.hearts.classList.toggle('critical', S.hp <= 1);
}

/* ---------------- banner & overlays ---------------- */

let bannerTimer = 0;

function banner(title, sub) {
    ui.bannerTitle.textContent = title;
    ui.bannerSub.textContent = sub || '';
    ui.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => ui.banner.classList.remove('show'), 1300);
}

function hideOverlays() {
    ui.menu.classList.add('hidden');
    ui.paused.classList.add('hidden');
    ui.over.classList.add('hidden');
}

/* ---------------- lifecycle ---------------- */

function startGame() {
    hideOverlays();
    S.phase = 'play';
    S.score = 0; S.kills = 0; S.combo = 0; S.comboMult = 1;
    S.hp = S.maxHp;
    S.arrows = []; S.enemies = []; S.pickups = [];
    S.fx = { multi: 0, pierce: 0, slow: 0 };
    S.cooldown = 0; S.shots = 0; S.restT = 0; S.spawnQueue = [];
    S.aim.active = false;
    S.runStart = Date.now();
    hudCache.score = -1; hudCache.wave = -1; hudCache.combo = ''; hudCache.fx = '';
    store.plays++;
    saveStore();
    renderHearts();
    startWave(1);
}

function gameOver() {
    S.phase = 'over';
    const isBest = S.score > store.best;
    if (isBest) store.best = S.score;
    saveStore();
    R2.stats.run({
        slug: 'king-shot-pwa/',
        score: S.score,
        durMs: Date.now() - S.runStart,
        wave: S.wave,
        outcome: 'loss',
        meta: { kills: S.kills },
    });
    Sound.over();
    R2.buzz([60, 40, 90]);
    ui.overScore.textContent = S.score;
    ui.overWave.textContent = S.wave;
    ui.overKills.textContent = S.kills;
    ui.overBest.textContent = store.best;
    ui.overNew.classList.toggle('hidden', !isBest);
    ui.over.classList.remove('hidden');
}

function togglePause() {
    if (S.phase === 'play') {
        S.phase = 'paused';
        ui.paused.classList.remove('hidden');
    } else if (S.phase === 'paused') {
        S.phase = 'play';
        ui.paused.classList.add('hidden');
    }
}

function gotoMenu() {
    S.phase = 'menu';
    S.enemies = []; S.arrows = []; S.pickups = [];
    hideOverlays();
    ui.menu.classList.remove('hidden');
    ui.menuBest.textContent = store.best;
    ui.menuPlays.textContent = store.plays;
}

/* ---------------- theme ---------------- */

function applyTheme(name) {
    store.theme = name;
    saveStore();
    document.documentElement.setAttribute('data-theme', name);
    skyKey = '';
    vigGrad = null;
    const p = PALETTES[name];
    ui.themeName.textContent = p.name;
    ui.themeName2.textContent = p.name;
}

function cycleTheme() {
    const names = Object.keys(PALETTES);
    applyTheme(names[(names.indexOf(store.theme) + 1) % names.length]);
    Sound.ui();
}

/* ---------------- input ---------------- */

function evPos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function aimAt(p) {
    S.aim.x = p.x;
    S.aim.y = p.y;
    const dx = p.x - KX();
    const dy = p.y - (KY() - 24);
    let a;
    if (dy > 0) {
        a = dx >= 0 ? -0.12 : -Math.PI + 0.12;   // pointer below the king → shoot flat
    } else {
        a = clampAngle(Math.atan2(dy, dx));
    }
    S.aim.angle = a;
    S.aim.power = clamp((Math.hypot(dx, dy) - 24) / (view.h * 0.7), 0.25, 1);
}

function setupInput() {
    cv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (S.phase !== 'play') return;
        S.kb.active = false;
        S.aim.active = true;
        aimAt(evPos(e));
    });
    cv.addEventListener('pointermove', (e) => {
        if (!S.aim.active) return;
        aimAt(evPos(e));
    });
    window.addEventListener('pointerup', () => {
        if (!S.aim.active) return;
        S.aim.active = false;
        fire(S.aim.power, S.aim.angle);
    });
    window.addEventListener('pointercancel', () => {
        S.aim.active = false;
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || (e.key === ' ' && S.phase !== 'play')) {
            if (S.phase === 'menu' || S.phase === 'over') { e.preventDefault(); startGame(); return; }
        }
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (S.phase === 'play' || S.phase === 'paused') togglePause();
            return;
        }
        if (S.phase !== 'play') return;
        if (e.key === ' ') {
            e.preventDefault();
            if (!e.repeat) fire(S.kb.power, S.kb.angle);
            return;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            S.keys.add(e.key);
        }
    });
    window.addEventListener('keyup', (e) => S.keys.delete(e.key));

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && S.phase === 'play') togglePause();
    });
}

function setupButtons() {
    const play = () => { Sound.ui(); startGame(); };
    ui.btnPlay.addEventListener('click', play);
    ui.btnMenuPlay.addEventListener('click', play);
    ui.btnRestart.addEventListener('click', play);
    ui.btnResume.addEventListener('click', () => { Sound.ui(); togglePause(); });
    ui.btnMenu.addEventListener('click', () => { Sound.ui(); gotoMenu(); });
    ui.btnMenu2.addEventListener('click', () => { Sound.ui(); gotoMenu(); });
    ui.btnTheme.addEventListener('click', cycleTheme);
    ui.btnTheme2.addEventListener('click', cycleTheme);
    ui.btnPause.addEventListener('click', () => {
        if (S.phase === 'play' || S.phase === 'paused') { Sound.ui(); togglePause(); }
    });
    const syncSound = () => {
        ui.btnSound.textContent = R2.getSettings().sound ? '🔊' : '🔇';
    };
    ui.btnSound.addEventListener('click', () => {
        R2.setSettings({ sound: !R2.getSettings().sound });
        syncSound();
        Sound.ui();
    });
    syncSound();
}

/* ---------------- main loop & boot ---------------- */

let lastTs = 0;

function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(() => { /* noop */ });
    }
}

function boot() {
    loadStore();
    applyTheme(store.theme);
    resize();
    window.addEventListener('resize', resize);
    setupInput();
    setupButtons();
    R2.markPlayed('king-shot-pwa/');
    R2.trackPlaytime('king-shot-pwa/');
    R2.installHint();
    registerSW();
    gotoMenu();
    renderHearts();
    requestAnimationFrame((ts) => { lastTs = ts; requestAnimationFrame(frame); });
}

window.addEventListener('load', () => setTimeout(boot, 50));

})();
