/*
 * Mustang PWA - a vertical scrolling WWII shooter
 * Mechanics follow Capcom's 1942: aerial loop, POW crates, side fighters,
 * Yashichi medals, bomber chains, sector boss planes and the shoot-down bonus.
 */
(function (global) {
    "use strict";

    const MUSTANG = global.MUSTANG;
    const D = MUSTANG.data;
    const Art = MUSTANG.art;
    const Sound = MUSTANG.Sound;
    const Music = MUSTANG.Music;

    const config = D.config;
    const themes = D.themes;
    const archetypes = D.archetypes;

    const W = config.canvasWidth;
    const H = config.canvasHeight;
    const PLAYER_START_Y = H - 90;
    const FLASH_SCHEME = { body: "#ffffff", wing: "#ffffff", trim: "#ffffff" };
    const BOSS_FLASH = { body: "#ffffff", wing: "#ffffff", trim: "#ffd54f" };

    /* ===== Game State ===== */
    const state = {
        phase: "menu",
        phaseTimer: 0,
        attract: false,
        menuIdle: 0,
        hitbox: config.hitbox,
        theatre: "overlord",
        difficulty: "arcade",
        checkpoint: 0,
        checkpoints: null,
        cleared: { overlord: [], rising: [] },
        stage: null,
        stageNumber: 32,
        stageIndex: 0,

        score: 0,
        extendsGiven: 0,
        highScore: 0,
        highScores: { overlord: 0, rising: 0 },
        lives: config.startLives,
        loops: config.loopsPerStage,
        fireShots: 2,
        silent: 0,
        bomberCombo: 0,
        thread: 0,
        threadTimer: 0,
        shake: 0,
        hitStop: 0,

        weightTotal: 0,
        weightKilled: 0,
        loopBonus: 0,
        accuracyBonus: 0,

        player: null,
        sideFighters: [null, null],
        shots: [],
        ebullets: [],
        enemies: [],
        pows: [],
        medals: [],
        particles: [],
        floaters: [],
        formations: [],
        boss: null,

        segments: [],
        totalLen: 1,
        offset: H,
        stageTime: 0,
        stageTarget: 70,

        wavePlan: [],
        waveIndex: 0,
        blockedFor: 0,
        landing: 0,

        enemySpeedMul: 1,
        hpMul: 1,
        theme: "olive",
        sound: true,
        tick: 0,
        acc: 0,
        paused: false,
    };

    /* ===== DOM Cache ===== */
    const DOME = {};

    function setupDOME() {
        DOME.canvas = document.getElementById("game-canvas");
        DOME.ctx = DOME.canvas.getContext("2d");
        DOME.scoreEl = document.getElementById("score");
        DOME.highScoreEl = document.getElementById("high-score");
        DOME.livesEl = document.getElementById("lives");
        DOME.stageEl = document.getElementById("stage");
        DOME.loopsEl = document.getElementById("loops");
        DOME.startBtn = document.getElementById("start-btn");
        DOME.loopBtn = document.getElementById("loop-btn");
        DOME.pauseBtn = document.getElementById("pause-btn");
        DOME.soundBtn = document.getElementById("sound-btn");
        DOME.overlay = document.getElementById("overlay");
        DOME.overlayTitle = document.getElementById("overlay-title");
        DOME.overlayMsg = document.getElementById("overlay-msg");
        DOME.overlayStats = document.getElementById("overlay-stats");
        DOME.overlayPlay = document.getElementById("overlay-play");
        DOME.continueBtn = document.getElementById("continue-btn");
        DOME.continueStage = document.getElementById("continue-stage");
        DOME.overlayTheme = document.getElementById("overlay-theme");
        DOME.finalScore = document.getElementById("final-score");
        DOME.finalHigh = document.getElementById("final-high");
        DOME.finalLives = document.getElementById("final-lives");
        DOME.finalRank = document.getElementById("final-rank");
        DOME.theatreChoices = document.getElementById("theatre-choices");
        DOME.hitboxChoices = document.getElementById("hitbox-choices");
        DOME.hitboxRow = document.getElementById("hitbox-row");
        DOME.sectorRow = document.getElementById("sector-row");
        DOME.sectorChoices = document.getElementById("sector-choices");
        DOME.sectorBtns = [];
        for (let i = 0; i < 8; i++) DOME.sectorBtns.push(document.getElementById("sector-" + i));
        DOME.difficultyChoices = document.getElementById("difficulty-choices");
        DOME.difficultyRow = document.getElementById("difficulty-row");
        DOME.controlsHint = document.getElementById("controls-hint");
        DOME.installPrompt = document.getElementById("install-prompt");
        DOME.installBtn = document.getElementById("install-btn");
        DOME.installLater = document.getElementById("install-later");
    }

    /* ===== Utilities ===== */
    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    function rngFor(theatreId, stageNumber, salt) {
        const base = stageNumber * 2654435761 + (theatreId === "overlord" ? 0x9e37 : 0x85eb) + (salt || 0);
        return mulberry32(base >>> 0);
    }

    const store = {
        get(key, fallback) {
            try {
                const raw = global.localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
        },
    };

    /* ===== Particles, floaters and object pools ===== */
    const pools = { particle: [], bullet: [], ebullet: [], floater: [] };

    function take(kind, factory) {
        const pool = pools[kind];
        const obj = pool.length ? pool.pop() : factory();
        return obj;
    }

    function give(kind, obj) {
        const pool = pools[kind];
        if (pool.length < 200) pool.push(obj);
    }

    function spawnParticles(x, y, color, count, spread, size) {
        if (config.reducedMotion) count = Math.min(count, 3);
        const room = config.maxParticles - state.particles.length;
        count = Math.min(count, Math.max(0, room));
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = (0.4 + Math.random()) * (spread || 90);
            const p = take("particle", () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0.9, size: 0, color: "" }));
            p.x = x;
            p.y = y;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v - 30;
            p.life = 0.35 + Math.random() * 0.55;
            p.max = 0.9;
            p.size = (size || 2.4) * (0.6 + Math.random() * 0.8);
            p.color = color;
            state.particles.push(p);
        }
    }

    function updateParticles(dt) {
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 90 * dt;
            p.vx *= 0.99;
            p.life -= dt;
            if (p.life <= 0) {
                state.particles.splice(i, 1);
                give("particle", p);
            }
        }
    }

    function floater(x, y, text, color) {
        if (state.floaters.length > 14) give("floater", state.floaters.shift());
        const f = take("floater", () => ({ x: 0, y: 0, text: "", color: "", life: 0 }));
        f.x = x;
        f.y = y;
        f.text = text;
        f.color = color;
        f.life = 0.9;
        state.floaters.push(f);
    }

    function updateFloaters(dt) {
        for (let i = state.floaters.length - 1; i >= 0; i--) {
            const f = state.floaters[i];
            f.y -= 26 * dt;
            f.life -= dt;
            if (f.life <= 0) {
                state.floaters.splice(i, 1);
                give("floater", f);
            }
        }
    }

    function drawParticles(ctx) {
        for (const p of state.particles) {
            ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    function drawFloaters(ctx) {
        ctx.textAlign = "center";
        ctx.font = "bold 12px Arial, sans-serif";
        for (const f of state.floaters) {
            ctx.globalAlpha = clamp(f.life * 1.6, 0, 1);
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
    }

    /* ===== Terrain tape ===== */
    function buildSegments(stage, need) {
        const rng = rngFor(state.theatre, stage.n, 77);
        const segs = [];
        let acc = 0;
        function push(type, len) {
            segs.push({ type: type, len: len, start: acc });
            acc += len;
        }
        if (stage.biome === "sea") {
            while (acc < need) push("sea", config.seaLen * (0.8 + rng() * 0.4));
        } else if (stage.biome === "land") {
            while (acc < need) push("land", config.landLen * (0.8 + rng() * 0.4));
        } else {
            let land = false;
            while (acc < need) {
                if (!land) {
                    push("sea", config.seaLen * (0.7 + rng() * 0.5));
                    push("beach", config.beachLen);
                } else {
                    push("land", config.landLen * (0.7 + rng() * 0.5));
                }
                land = !land;
            }
        }
        return segs;
    }

    function worldToScreenY(w) { return state.offset - w; }

    function screenYToWorld(y) { return state.offset - y; }

    function biomeAtWorld(w) {
        for (const s of state.segments) {
            if (w >= s.start && w < s.start + s.len) return s.type;
        }
        return state.segments.length ? state.segments[state.segments.length - 1].type : "sea";
    }

    function biomeAtScreenY(y) {
        return biomeAtWorld(screenYToWorld(y));
    }

    function formationTopY(shape, count) {
        const n = Math.max(1, count);
        if (shape === "v") return -28 - (n - 1) * 21;
        if (shape === "column") return -26 - (n - 1) * 32;
        if (shape === "stream") return -24 - (n - 1) * 13;
        return -26;
    }

    function biomeReadyFor(kind, topY) {
        if (kind === "ground") return biomeAtScreenY(topY) === "land";
        if (kind === "sea") return biomeAtScreenY(topY) === "sea";
        return true;
    }

    function unitFitsBiome(unitId, biome) {
        const kind = archetypes[unitId].kind;
        if (kind === "ground") return biome === "land" || biome === "beach";
        if (kind === "sea") return biome === "sea";
        return true;
    }

    function biomeAtStageTime(t, topY) {
        return biomeAtWorld(H + state.stage.speed * t - topY);
    }

    function drawTerrain(ctx, th) {
        ctx.fillStyle = th.waterDeep;
        ctx.fillRect(0, 0, W, H);
        for (const seg of state.segments) {
            const a = worldToScreenY(seg.start);
            const b = worldToScreenY(seg.start + seg.len);
            const lo = a < b ? a : b;
            const hi = a < b ? b : a;
            if (hi < 0 || lo > H) continue;
            const y0 = Math.max(0, lo);
            const y1 = Math.min(H, hi);
            if (y1 <= y0) continue;
            if (seg.type === "sea") Art.drawSea(ctx, y0, y1, seg.start, state.stageTime, th);
            else if (seg.type === "beach") Art.drawBeach(ctx, y0, y1, th);
            else Art.drawLand(ctx, y0, y1, seg.start, state.stageTime, th);
        }
    }

    /* ===== Formations ===== */
    let formationSeq = 0;

    function makeFormation(units, shape, powKind) {
        const group = {
            id: ++formationSeq,
            total: units.length,
            alive: units.length,
            pow: powKind || null,
            awarded: false,
        };
        state.formations.push(group);
        for (const s of layoutFormation(units, shape)) {
            spawnEnemy(s.unit, s.x, s.y, s.delay, group);
        }
        return group;
    }

    function layoutFormation(units, shape) {
        const out = [];
        const cx = W / 2;
        const n = units.length;
        if (shape === "v") {
            for (let i = 0; i < n; i++) {
                out.push({ unit: units[i], x: cx + (i - (n - 1) / 2) * 27, y: -28 - i * 21, delay: 0 });
            }
        } else if (shape === "column") {
            for (let i = 0; i < n; i++) {
                out.push({ unit: units[i], x: cx, y: -26 - i * 32, delay: 0 });
            }
        } else if (shape === "stream") {
            for (let i = 0; i < n; i++) {
                out.push({ unit: units[i], x: cx - 72 + i * 36, y: -24 - i * 13, delay: i * 0.16 });
            }
        } else if (shape === "echelon") {
            for (let i = 0; i < n; i++) {
                out.push({ unit: units[i], x: cx - 54 + i * 36, y: -24 - i * 26, delay: i * 0.08 });
            }
        } else {
            const span = 22;
            for (let i = 0; i < n; i++) {
                out.push({ unit: units[i], x: cx - ((n - 1) * span) / 2 + i * span, y: -26, delay: 0 });
            }
        }
        return out;
    }

    function releaseFormation(e) {
        const g = e.group;
        if (!g) return;
        g.alive--;
        if (g.alive > 0) return;
        const idx = state.formations.indexOf(g);
        if (idx >= 0) state.formations.splice(idx, 1);
    }

    function resolveFormation(e) {
        const g = e.group;
        if (!g) return;
        releaseFormation(e);
        if (g.alive > 0 || g.awarded) return;
        g.awarded = true;
        addScore(config.formationBonus);
        floater(clamp(e.x, 30, W - 30), e.y, "500", "#ffe9a8");
        if (g.pow) spawnPow(g.pow, e.x, e.y);
    }

    /* ===== Enemy spawning ===== */
    function spawnEnemy(unitId, x, y, delay, group, opts) {
        const arch = archetypes[unitId];
        if (!arch) return null;
        const diff = D.difficulty[state.difficulty];
        const hpMul = arch.kind === "air" ? state.hpMul * diff.hp : diff.hp;
        const e = {
            unit: unitId,
            arch: arch,
            kind: arch.kind,
            x: x, y: y,
            ox: x, oy: y,
            vx: 0, vy: 0,
            r: arch.r,
            hp: arch.hp * hpMul,
            maxHp: arch.hp * hpMul,
            pts: arch.pts,
            ai: arch.ai,
            art: arch.art,
            speed: arch.speed * (arch.kind === "air" ? state.enemySpeedMul : diff.speed),
            fireTimer: 0.8 + Math.random() * 1.5,
            delay: delay || 0,
            t: 0,
            phase: Math.random() * Math.PI * 2,
            facing: 1,
            angle: arch.kind === "air" ? Math.PI : 0,
            flash: 0,
            group: group || null,
            leaving: false,
            child: !!(opts && opts.child),
        };
        if (e.ai === "cross") {
            const dir = x < W / 2 ? 1 : -1;
            e.vx = dir * e.speed;
            e.vy = 20;
            e.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (e.ai === "charge") {
            e.phaseName = "aim";           // fissa la rotta, poi scatta
            e.facing = x < W / 2 ? 1 : -1;
        } else if (e.ai === "flank") {
            e.phaseName = "climb";
        }
        state.enemies.push(e);
        if (!e.child) state.weightTotal += arch.weight;
        return e;
    }

    function pickShape(rng, vocab, n) {
        if (n === 1) return vocab.indexOf("stream") >= 0 && rng() < 0.5 ? "stream" : "line";
        const pool = vocab.filter((s) => s !== "stream" || n >= 3);
        return pool.length ? pool[Math.floor(rng() * pool.length)] : "line";
    }

    function buildWavePlan(stage) {
        const rng = rngFor(state.theatre, stage.n, 501);
        const count = Math.round((11 + (32 - stage.n) * 0.5) * D.difficulty[state.difficulty].density);
        const powAt = new Map();
        let vWave = -1;

        if (stage.vFormation) vWave = clamp(Math.round(count * 0.6), 1, count - 2);
        for (let k = 0; k < stage.pows.length; k++) {
            const idx = clamp(Math.round(((k + 1) / (stage.pows.length + 1)) * (count - 1)), 1, count - 1);
            powAt.set(idx, stage.pows[k]);
        }
        if (vWave >= 0 && !powAt.has(vWave)) powAt.set(vWave, "black");

        const plan = [];
        let t = 2.6;
        for (let i = 0; i < count; i++) {
            let unitId;
            let shape;
            let count2;
            if (i === vWave) {
                unitId = "zero";
                shape = "v";
                count2 = 5;
            } else {
                shape = pickShape(rng, stage.shapes, 3);
                const biome = biomeAtStageTime(t, formationTopY(shape, 3));
                const fits = stage.roster.filter((u) => unitFitsBiome(u, biome));
                const pool = fits.length ? fits : stage.roster.filter((u) => archetypes[u].kind === "air");
                unitId = pool.length ? pool[Math.floor(rng() * pool.length)] : "zero";
                const arch = archetypes[unitId];
                count2 = arch.kind === "air" ? 1 + Math.floor(rng() * 4) : 1 + Math.floor(rng() * 2);
                shape = pickShape(rng, stage.shapes, count2);
            }
            plan.push({
                t: t,
                unit: unitId,
                count: count2,
                shape: shape,
                pow: powAt.has(i) ? powAt.get(i) : null,
                force: false,
            });
            // Piu' ondate per palco (era 4.4/1.5): aumentare la pressione
            // con la cadenza, non con la dimensione della formazione.
            // Formazioni piu' alte falliscono biomeReadyFor() per terra/mare
            // e nel misurato riducono perfino i nemici presenti.
            t += Math.max(1.1, (stage.cadence * (3.4 - i * 0.1)) / stage.density);
        }
        if (stage.yashichi) {
            plan.push({ t: state.stageTarget * 0.42, unit: "yashichi", count: 1, shape: "single", pow: null });
        }
        plan.sort((a, b) => a.t - b.t);
        return plan;
    }

    function launchWave(wave) {
        // config.maxEnemies esisteva ma non era mai letto: nulla limitava i
        // nemici vivi. Restituisco true perche' il chiamante avanza
        // waveIndex: restituire false entra nella riserva dei 2.5s che
        // converte l'onda in uno "zero".
        if (state.enemies.length >= config.maxEnemies) return true;
        if (wave.unit === "yashichi") {
            const side = Math.random() < 0.5 ? -1 : 1;
            spawnEnemy("yashichi", side < 0 ? 28 : W - 28, H + 20, 0, null);
            return true;
        }
        const arch = archetypes[wave.unit];
        if (!wave.force && !biomeReadyFor(arch.kind, formationTopY(wave.shape, wave.count))) return false;
        const units = new Array(wave.count).fill(wave.unit);
        makeFormation(units, wave.shape, wave.pow);
        return true;
    }

    /* ===== Power-ups ===== */
    function spawnPow(kind, x, y) {
        state.pows.push({
            kind: kind,
            x: clamp(x, 20, W - 20),
            y: y,
            vx: (Math.random() - 0.5) * 18,
            t: Math.random() * 6,
        });
    }

    function collectPow(p) {
        const def = D.powerups[p.kind];
        Sound.powerup();
        floater(p.x, p.y - 14, def.label, def.color);
        spawnParticles(p.x, p.y, def.color, 14, 70, 2);
        switch (p.kind) {
            case "green":
                state.fireShots = Math.min(4, state.fireShots + 2);
                break;
            case "white":
                smartBomb();
                break;
            case "grey":
                addSideFighters();
                break;
            case "orange":
                state.silent = config.silentDuration;
                floater(p.x, p.y - 32, "ENEMY GUNS JAMMED", "#ff8c1a");
                break;
            case "yellow":
                state.loops++;
                addScore(config.loopBonus);
                floater(p.x, p.y - 32, "LOOP BONUS " + config.loopBonus, "#ffd54f");
                break;
            case "black":
                state.lives++;
                Sound.oneUp();
                floater(p.x, p.y - 32, "1 UP", "#ffffff");
                break;
            case "red":
                addScore(config.powBonus);
                break;
        }
    }

    function addSideFighters() {
        for (let i = 0; i < 2; i++) {
            if (!state.sideFighters[i]) {
                state.sideFighters[i] = { x: state.player.x, y: state.player.y, cool: 0.3 };
            }
        }
    }

    function smartBomb() {
        Sound.smartBomb();
        for (const e of state.enemies.slice()) {
            if (e.kind === "air" && e.unit !== "yashichi" && e.y > -20 && e.y < H + 20) {
                destroyEnemy(e);
            }
        }
        spawnParticles(W / 2, H / 2, "#ffffff", 40, 320, 4);
        floater(W / 2, H / 2 - 30, "SMART BOMB", "#ffffff");
    }

    /* ===== Player ===== */
    function newPlayer() {
        return {
            x: W / 2, y: PLAYER_START_Y,
            r: config.playerRadius,
            tilt: 0,
            looping: false,
            loopTimer: 0,
            loopHeading: 0,
            roll: 0,
            invuln: 0,
            alive: true,
            deathTimer: 0,
            fireCool: 0,
        };
    }

    function doLoop() {
        const p = state.player;
        if (!p || !p.alive || state.phase !== "playing") return;
        if (p.looping || state.loops <= 0) return;
        const v = inputVector();
        p.looping = true;
        p.loopTimer = config.loopDuration;
        p.loopHeading = Math.hypot(v.x, v.y) > 0.01 ? Math.atan2(v.y, v.x) + Math.PI / 2 : 0;
        state.loops--;
        Sound.loop();
        floater(p.x, p.y - 26, "LOOP", themes[state.theme].plane);
    }

    function playerFire() {
        const p = state.player;
        if (p.fireCool > 0) return;
        p.fireCool = config.shotGap;
        const speed = -config.shotSpeed;
        if (state.fireShots >= 4) {
            for (const dx of [-7, -2.5, 2.5, 7]) {
                pushShot(p.x + dx, p.y - 17, speed, 2.3);
            }
        } else {
            pushShot(p.x - 6, p.y - 17, speed, 2.6);
            pushShot(p.x + 6, p.y - 17, speed, 2.6);
        }
        Sound.shoot();
    }

    function pushShot(x, y, vy, r) {
        const b = take("bullet", () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 2 }));
        b.x = x;
        b.y = y;
        b.vx = 0;
        b.vy = vy;
        b.r = r;
        state.shots.push(b);
    }

    function pushEnemyShot(x, y, vx, vy) {
        const b = take("ebullet", () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 3, life: 4, dead: false }));
        b.x = x;
        b.y = y;
        b.vx = vx;
        b.vy = vy;
        b.r = 3;
        b.life = 4;
        b.dead = false;
        state.ebullets.push(b);
    }

    function sideFire(f) {
        f.cool = config.shotGap * 1.5;
        pushShot(f.x, f.y - 13, -config.shotSpeed * 0.85, 2.2);
        Sound.sideShoot();
    }

    function killPlayer() {
        const p = state.player;
        if (!p.alive) return;
        p.alive = false;
        p.deathTimer = 1.3;
        p.looping = false;
        state.lives--;
        state.bomberCombo = 0;
        state.phase = "dead";
        state.phaseTimer = 0;
        Sound.death();
        shake(config.shakeMax);
        state.hitStop = Math.max(state.hitStop, config.hitStopDeath);
        spawnParticles(p.x, p.y, themes[state.theme].plane, 34, 190, 3.6);
        spawnParticles(p.x, p.y, "#ff8c1a", 18, 120, 3);
        save();
    }

    /* ===== Combat ===== */
    /* Every point of score comes through here. It is one function because
       the score is the thing the game is about, and a mechanic that has to
       watch the score (the extends) cannot watch nine separate additions. */
    function addScore(n) {
        state.score += n;
        controllaExtends();
    }

    /* The arcade gave an extra life at every threshold, and EXTEND went up
       the screen. A threshold that cannot be granted yet — because the
       player is already at the life cap — waits instead of being lost. */
    function controllaExtends() {
        /* The table is written highest first, like the ranks, but the
           thresholds are crossed from the bottom up. */
        const tabella = D.extendTable.slice().reverse();
        for (let i = state.extendsGiven; i < tabella.length; i++) {
            if (state.score < tabella[i].min) break;
            if (state.lives >= config.maxLives) break;   // pending, not lost
            state.extendsGiven = i + 1;
            state.lives++;
            Sound.extend();
            const p = state.player;
            floater(p ? p.x : W / 2, (p ? p.y : H / 2) - 34, tabella[i].label, "#7ef07e");
        }
    }

    function destroyEnemy(e, opts) {
        const idx = state.enemies.indexOf(e);
        if (idx < 0) return;
        state.enemies.splice(idx, 1);
        const award = !opts || opts.award !== false;
        const scheme = Art.schemeFor(state.theatre, e.unit);
        spawnParticles(e.x, e.y, scheme.body, e.kind === "air" ? 16 : 12, e.kind === "air" ? 130 : 80, 3);
        if (e.kind === "air") Sound.explode();
        else Sound.hit();
        shake(e.kind === "air" ? 3.2 : 1.6);
        if (award) {
            state.weightKilled += e.arch.weight;
            resolveFormation(e);
        } else {
            releaseFormation(e);
        }
        if (e.unit === "yashichi") {
            if (!award) return;
            state.medals.push({ x: e.x, y: e.y, t: Math.random() * 6 });
            Sound.yashichi();
            floater(e.x, e.y - 16, "5000", "#ffd54f");
            return;
        }
        if (!award) return;

        // lo splitter si divide in due kamikaze (figli: niente peso formazione)
        if (e.unit === "splitter") {
            for (const dx of [-18, 18]) spawnEnemy("kamikaze", e.x + dx, e.y, 0, null, { child: true });
        }

        let pts = e.pts;
        if (e.unit === "bomber") {
            state.bomberCombo++;
            pts = Math.min(
                config.bomberBaseScore + (state.bomberCombo - 1) * config.bomberComboStep,
                config.bomberComboMax
            );
        }
        addScore(pts);
        floater(clamp(e.x, 26, W - 26), e.y - 8, String(pts), "#ffffff");
    }

    function damageEnemy(e) {
        e.hp--;
        e.flash = 0.12;
        if (e.kind === "boss") { shake(2.2); state.hitStop = Math.max(state.hitStop, config.hitStopKill); }
        else Sound.hit();
        if (e.hp > 0) return;

        if (e.kind === "boss") {
            const idx = state.enemies.indexOf(e);
            if (idx >= 0) state.enemies.splice(idx, 1);
            state.boss = null;
            Sound.bigExplode();
            shake(config.shakeMax);
            state.hitStop = Math.max(state.hitStop, config.hitStopBoss);
            spawnParticles(e.x, e.y, "#ffd54f", 60, 260, 4.5);
            spawnParticles(e.x, e.y, "#ff8c1a", 40, 180, 3.5);
            addScore(e.pts);
            state.weightKilled += e.arch.weight;
            floater(clamp(e.x, 46, W - 46), e.y - 20, String(e.pts), "#ffd54f");
            endStage();
            return;
        }
        destroyEnemy(e);
    }

    function circleHit(ax, ay, ar, bx, by, br) {
        const dx = ax - bx, dy = ay - by;
        const rr = ar + br;
        return dx * dx + dy * dy <= rr * rr;
    }

    function loseSideFighter(idx) {
        const f = state.sideFighters[idx];
        if (!f) return;
        state.sideFighters[idx] = null;
        Sound.sideLost();
        spawnParticles(f.x, f.y, "#9aa0a8", 14, 100, 2.6);
        floater(f.x, f.y - 12, "SIDE FIGHTER LOST", "#ff8c1a");
    }

    function resolveCollisions() {
        const p = state.player;

        for (let i = state.shots.length - 1; i >= 0; i--) {
            const s = state.shots[i];
            let hit = false;
            for (const e of state.enemies) {
                if (e.delay > 0) continue;
                if (circleHit(s.x, s.y, s.r, e.x, e.y, e.r)) {
                    damageEnemy(e);
                    spawnParticles(s.x, s.y, "#ffe9a8", 3, 50, 1.8);
                    hit = true;
                    break;
                }
            }
            if (hit) state.shots.splice(i, 1);
        }

        collectPickups();

        const vulnerable = p.alive && p.invuln <= 0 && !p.looping;

        /* The enemy bullets only kill while you are not rolling: the loop is
           the one thing in the game that buys you invulnerability. */
        if (vulnerable) {
            for (const b of state.ebullets) {
                if (b.dead) continue;
                if (circleHit(b.x, b.y, b.r, p.x, p.y, p.r + 1)) {
                    b.dead = true;
                    killPlayer();
                    return;
                }
                for (let s = 0; s < state.sideFighters.length; s++) {
                    const f = state.sideFighters[s];
                    if (f && circleHit(b.x, b.y, b.r, f.x, f.y, 5)) {
                        b.dead = true;
                        loseSideFighter(s);
                        break;
                    }
                }
            }
        }
        if (!p.alive) return;

        for (const e of state.enemies) {
            if (e.delay > 0) continue;
            const bodyR = e.kind === "ground" || e.kind === "sea" ? e.r * 0.72 : e.r;
            if (circleHit(p.x, p.y, p.r, e.x, e.y, bodyR)) {
                /* Threading: you cut through it while rolling. You cannot
                   shoot while you roll, so this is the trade: no gun, one
                   hit, and the chain that makes it pay. */
                if (p.looping && e.kind !== "boss") {
                    tagliaInE(e, state.tick / 60);
                    continue;
                }
                if (!vulnerable) continue;   // the spawn invulnerability
                if (e.kind === "boss") { killPlayer(); return; }
                destroyEnemy(e);
                killPlayer();
                return;
            }
            if (!vulnerable) continue;
            for (let s = 0; s < state.sideFighters.length; s++) {
                const f = state.sideFighters[s];
                if (f && circleHit(f.x, f.y, 5, e.x, e.y, bodyR)) {
                    loseSideFighter(s);
                    break;
                }
            }
        }
    }

    /* One thread: one hit, one more link in the chain, and the chain pays
       for itself. A single enemy can only be threaded once per cooldown,
       or a long roll through a formation would count every frame. */
    function tagliaInE(e, now) {
        if (e.kind === "boss") return;
        if (e.threadAt !== undefined && now - e.threadAt < config.threadCooldown) return;
        e.threadAt = now;
        state.thread = Math.min(config.threadChainMax, state.thread + 1);
        state.threadTimer = config.threadDecay;
        damageEnemy(e);
        addScore(config.threadPoints * state.thread);
        floater(clamp(e.x, 30, W - 30), e.y - 12, "THREADED ×" + state.thread, "#9be7ff");
        Sound.thread(state.thread);
    }

    function collectPickups() {
        const p = state.player;
        for (let i = state.pows.length - 1; i >= 0; i--) {
            const pw = state.pows[i];
            if (circleHit(p.x, p.y, p.r + 10, pw.x, pw.y, 11)) {
                state.pows.splice(i, 1);
                addScore(config.powBonus);
                collectPow(pw);
            }
        }
        for (let i = state.medals.length - 1; i >= 0; i--) {
            const m = state.medals[i];
            if (circleHit(p.x, p.y, p.r + 12, m.x, m.y, 10)) {
                state.medals.splice(i, 1);
                addScore(config.yashichiBonus);
                Sound.yashichi();
                floater(m.x, m.y - 16, "5000", "#ffd54f");
            }
        }
    }

    /* ===== Enemy AI ===== */
    function fireAt(e, tx, ty, speed, spread) {
        if (state.silent > 0 || e.arch.fire <= 0) return;
        const base = Math.atan2(ty - e.y, tx - e.x);
        const shots = spread || 1;
        for (let i = 0; i < shots; i++) {
            const a = base + (i - (shots - 1) / 2) * 0.16;
            pushEnemyShot(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        Sound.enemyShot();
    }

    function updateEnemy(e, dt) {
        if (e.delay > 0) {
            e.delay -= dt;
            e.y += 26 * dt;
            return;
        }
        e.flash = Math.max(0, e.flash - dt);
        e.t += dt;
        const p = state.player;
        const targetX = p ? p.x : W / 2;
        const targetY = p ? p.y : H;

        switch (e.ai) {
            case "weave":
                e.y += e.speed * dt;
                e.x = e.ox + Math.sin(e.t * 2.1 + e.phase) * 26;
                e.angle = Math.PI + Math.sin(e.t * 2.1 + e.phase) * 0.09;
                break;
            case "swoop":
                e.y += e.speed * 0.8 * dt;
                e.x = e.ox + Math.sin(e.t * 1.25 + e.phase) * 70;
                e.angle = Math.PI + Math.cos(e.t * 1.25 + e.phase) * 0.16;
                break;
            case "cross":
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                e.angle = e.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
                break;
            case "dive":
                if (e.t < 1.1) {
                    e.y += 110 * dt;
                    e.x = e.ox + e.facing * 70 * dt;
                } else {
                    const a = Math.atan2(targetY - e.y, targetX - e.x);
                    e.vx = Math.cos(a) * e.speed;
                    e.vy = Math.sin(a) * e.speed;
                    e.x += e.vx * dt;
                    e.y += e.vy * dt;
                    e.angle = a + Math.PI / 2;
                    if (e.y > H + 30 || e.x < -40 || e.x > W + 40) e.leaving = true;
                }
                break;
            case "hunter": {
                const a = Math.atan2(targetY - e.y, targetX - e.x);
                e.vx += (Math.cos(a) * e.speed * 0.6 - e.vx) * Math.min(1, dt * 1.4);
                e.vy += (Math.sin(a) * e.speed * 0.6 - e.vy) * Math.min(1, dt * 1.4);
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                e.angle = Math.PI + Math.atan2(e.vx, -e.vy) * 0.35;
                break;
            }
            case "suicide": {
                const a = Math.atan2(targetY - e.y, targetX - e.x);
                e.vx += (Math.cos(a) * e.speed - e.vx) * Math.min(1, dt * 1.1);
                e.vy += (Math.sin(a) * e.speed - e.vy) * Math.min(1, dt * 1.1);
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                e.angle = Math.atan2(e.vy, e.vx) + Math.PI / 2;
                break;
            }
            case "charge": {
                // fissa la rotta, lampeggia un istante, poi scatta dritto addosso
                if (e.phaseName === "aim") {
                    const a = Math.atan2(targetY - e.y, targetX - e.x);
                    e.angle = a + Math.PI / 2;
                    if (e.t > 0.35) {
                        e.phaseName = "dash"; e.t = 0;
                        e.vx = Math.cos(a) * 460; e.vy = Math.sin(a) * 460;
                    }
                } else {
                    e.x += e.vx * dt;
                    e.y += e.vy * dt;
                    if (e.y > H + 30 || e.x < -40 || e.x > W + 40) e.leaving = true;
                }
                break;
            }
            case "strafe": {
                // si stabilizza a quota e spara scrollendo
                e.y += (120 - e.y) * Math.min(1, dt * 2);
                e.x += (e.facing || 1) * 90 * dt;
                e.angle = e.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
                if (e.x < -40 || e.x > W + 40) e.leaving = true;
                break;
            }
            case "flank": {
                // sale fuori asse poi attraversa anticipando il giocatore
                if (e.phaseName !== "cut" && e.y < 200) {
                    e.y += e.speed * 0.7 * dt;
                    e.x = e.ox + (e.facing || 1) * 150 * dt;
                } else {
                    e.phaseName = "cut";
                    const pvx = (p && p.vx) || 0;
                    const a = Math.atan2(targetY - e.y, targetX + pvx * 0.35 - e.x);
                    e.x += Math.cos(a) * e.speed * dt;
                    e.y += Math.sin(a) * e.speed * dt;
                    e.angle = a + Math.PI / 2;
                    if (e.y > H + 30 || e.x < -40 || e.x > W + 40) e.leaving = true;
                }
                break;
            }
            case "climb":
                e.y -= e.speed * dt;
                e.x = e.ox + Math.sin(e.t * 0.8 + e.phase) * 20;
                e.angle = 0;
                break;
            case "yashichi":
                e.y -= e.speed * dt;
                e.x += Math.sin(e.t * 0.9 + e.phase) * 26 * dt;
                e.angle = 0;
                break;
            case "ground":
                e.y += state.stage.speed * dt;
                e.x += e.arch.speed * e.facing * dt;
                if (e.x < -20 || e.x > W + 20) e.facing *= -1;
                break;
            case "flak":
                e.y += state.stage.speed * dt;
                break;
            case "sea":
                e.y += state.stage.speed * dt;
                e.x += e.arch.speed * e.facing * dt;
                if (e.x < -26 || e.x > W + 26) e.facing *= -1;
                break;
            case "patrol":
                e.y += (state.stage.speed + e.speed * 0.4) * dt;
                e.x += e.speed * e.facing * dt;
                if (e.x < -24 || e.x > W + 24) e.facing *= -1;
                break;
        }

        if (e.arch.fire <= 0) return;
        e.fireTimer -= dt;
        if (e.fireTimer > 0) return;
        e.fireTimer = e.arch.fire * (0.75 + Math.random() * 0.7) / D.difficulty[state.difficulty].fire;
        if (e.y <= 0 || e.y >= H - 30) return;

        if (e.ai === "ground") {
            if (Math.random() < 0.35) fireAt(e, targetX + (Math.random() - 0.5) * 60, H + 20, config.enemyBulletSpeedGround * D.difficulty[state.difficulty].bullet);
        } else if (e.ai === "climb") {
            fireAt(e, targetX, targetY, config.enemyBulletSpeed * D.difficulty[state.difficulty].bullet);
        } else if (e.ai === "sea" || e.ai === "flak") {
            fireAt(e, targetX, targetY, config.enemyBulletSpeedGround * D.difficulty[state.difficulty].bullet, e.kind === "sea" && Math.random() < 0.4 ? 3 : 1);
        } else if (e.ai !== "cross") {
            fireAt(e, targetX, targetY, config.enemyBulletSpeed * e.arch.fireSpeed * D.difficulty[state.difficulty].bullet);
        }
    }

    /* ===== Boss ===== */
    function spawnBoss(tier) {
        const arch = archetypes.boss;
        const hp = arch.hp + (tier - 1) * 70;
        const e = {
            unit: "boss",
            arch: arch,
            kind: "boss",
            tier: tier,
            x: W / 2, y: H + 70,
            ox: W / 2, oy: H + 70,
            vx: 0, vy: 0,
            r: arch.r,
            hp: hp, maxHp: hp,
            pts: arch.pts + (tier - 1) * 10000,
            ai: "boss",
            art: "boss",
            fireTimer: 1.4,
            t: 0,
            phase: 0,
            facing: 1,
            angle: 0,
            flash: 0,
            group: null,
            leaving: false,
            boss: true,
            bossPhase: "enter",
            patternTimer: 1.6,
        };
        state.enemies.push(e);
        state.boss = e;
        floater(W / 2, 120, "WARNING  BOSS", "#ff3b2f");
        Sound.bigExplode();
        syncMusic();
    }

    function updateBoss(e, dt) {
        e.t += dt;
        e.flash = Math.max(0, e.flash - dt);
        const p = state.player;
        const px = p ? p.x : W / 2;
        const py = p ? p.y : H;

        if (e.bossPhase === "enter") {
            e.y -= 62 * dt;
            if (e.y <= 190) { e.y = 190; e.bossPhase = "fight"; }
            return;
        }

        e.x = W / 2 + Math.sin(e.t * 0.55) * 96;
        e.y = 190 + Math.sin(e.t * 0.9) * 14;
        e.angle = Math.sin(e.t * 0.55) * 0.07;

        e.patternTimer -= dt;
        if (e.patternTimer <= 0) {
            e.patternTimer = 1.7;
            const tier = e.tier;
            if (state.silent <= 0) {
                if (tier >= 2) fireAt(e, px, py, config.enemyBulletSpeed * D.difficulty[state.difficulty].bullet, 3);
                if (tier >= 3) {
                    for (let i = 0; i < 7; i++) {
                        const a = (i / 7) * Math.PI * 2 + e.t * 1.6;
                        pushEnemyShot(e.x, e.y + 24, Math.cos(a) * 130, Math.sin(a) * 130 + 40);
                    }
                    Sound.enemyShot();
                }
                if (tier >= 4) {
                    fireAt(e, px - 70, H, config.enemyBulletSpeed * D.difficulty[state.difficulty].bullet);
                    fireAt(e, px + 70, H, config.enemyBulletSpeed * D.difficulty[state.difficulty].bullet);
                }
            }
        }
        if (e.tier >= 3 && Math.random() < dt * 0.35) {
            spawnEnemy("fighter", W / 2 + (Math.random() - 0.5) * 120, e.y + 30, 0, null);
        }
    }

    /* ===== Stage flow ===== */
    function currentStages() { return D.allStages[state.theatre]; }

    function shootDownRate() {
        if (state.weightTotal <= 0) return 0;
        return clamp((state.weightKilled / state.weightTotal) * 100, 0, 100);
    }

    /* ===== Attract mode =====
       The cabinet played the game behind the title screen: the game
       playing itself, with nobody touching it. This is that.

       The demo is the real game — the same stage, the same enemies, the
       same guns — with a bot flying the aircraft. The bot writes into
       the same input the keyboard writes into, so the tilt, the firing
       and the loops behave exactly as they do for a person.

       The demo never touches the campaign: the checkpoints, the cleared
       sectors and the high score are all left alone. */
    function startAttract(index) {
        if (state.attract) return;
        state.attract = true;
        const stages = currentStages();
        const at = (typeof index === "number" && index >= 0 && index < stages.length)
            ? index
            : Math.floor(Math.random() * stages.length);
        resetGame();
        startStage(at);
        Music.stop();
    }

    function stopAttract() {
        state.attract = false;
    }

    /* The bot. It does not aim: the guns are automatic. It lines up with
       the nearest enemy in front of it, and it gets out of the way of
       anything that is on its way down. */
    function botVector() {
        const p = state.player;
        if (!p) return { x: 0, y: 0 };
        let x = 0, y = 0;

        /* the nearest shot that is still on its way down */
        let danger = null;
        let best = 1e9;
        for (const b of state.ebullets) {
            if (b.dead) continue;
            if (b.y < p.y - 30) continue;          // already past us
            const d = Math.abs(b.x - p.x) + Math.max(0, b.y - p.y) * 0.5;
            if (d < best && d < 120) { best = d; danger = b; }
        }
        if (danger) {
            const dx = danger.x - p.x;
            x = Math.abs(dx) < 10 ? 0 : (dx > 0 ? -1 : 1);
            return { x: x, y: 0 };
        }

        /* the nearest enemy in front: line up with it */
        let target = null;
        let near = 1e9;
        for (const e of state.enemies) {
            if (e.delay > 0) continue;
            if (e.y > p.y - 24) continue;           // level with us or below
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < near) { near = d; target = e; }
        }
        if (target) {
            const dx = target.x - p.x;
            x = Math.abs(dx) < 5 ? 0 : (dx > 0 ? 1 : -1);
            /* stay off the deck: the ground units are the ones that
               reach you, and the higher you fly the more of them there
               are in the way */
            if (p.y < H - 140) y = 1;
        } else {
            /* nothing in front: drift, so the demo is not a statue */
            x = Math.sin(state.tick / 37) * 0.8;
        }
        return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
    }

    function startGame() {
        stopAttract();
        state.menuIdle = 0;
        if (DOME.controlsHint) DOME.controlsHint.classList.add("hidden");
        store.set("mustang-hint-seen", true);
        resetGame();
        startStage(0);
        hideOverlay();
        Sound.unlock();
    }

    function resetGame() {
        const stages = currentStages();
        state.stageIndex = 0;
        state.stageNumber = stages[0].n;
        state.checkpoint = 0;
        state.score = 0;
        state.extendsGiven = 0;
        state.lives = config.startLives;
        state.fireShots = 2;
        state.bomberCombo = 0;
        state.silent = 0;
        state.thread = 0;
        state.threadTimer = 0;
        state.player = newPlayer();
        state.paused = false;
        state.acc = 0;
        Music.stop();
        if (DOME.pauseBtn) DOME.pauseBtn.textContent = "\u23F8 Pause";
        clearEntities();
    }

    function clearEntities() {
        state.shots.length = 0;
        state.ebullets.length = 0;
        state.enemies.length = 0;
        state.pows.length = 0;
        state.medals.length = 0;
        state.particles.length = 0;
        state.floaters.length = 0;
        state.formations.length = 0;
        state.sideFighters = [null, null];
        state.boss = null;
    }

    /* ===== Sectors =====
       Eight sectors per front, four stages each. A sector is the unit
       the campaign is measured in, and the unit you are allowed to start
       a run from once you have cleared it. */
    function sectorList() {
        return D.sectors[state.theatre] || [];
    }

    function sectorIndexFor(stageIndex) {
        const stages = currentStages();
        const st = stages[clamp(stageIndex, 0, stages.length - 1)];
        if (!st) return 0;
        const i = sectorList().indexOf(st.name);
        return i < 0 ? 0 : i;
    }

    function stagesPerSector() {
        const list = sectorList();
        if (!list.length) return 1;
        return Math.max(1, Math.floor(currentStages().length / list.length));
    }

    function markSectorCleared() {
        const i = sectorIndexFor(state.stageIndex);
        /* Four stages to a sector: it opens when the last of them is
           behind you, not when the first one is. */
        const ultimo = (i + 1) * stagesPerSector() - 1;
        if (state.stageIndex < ultimo) return false;
        const fatti = state.cleared[state.theatre] || (state.cleared[state.theatre] = []);
        if (fatti.indexOf(i) >= 0) return false;
        fatti.push(i);
        fatti.sort((a, b) => a - b);
        return true;
    }

    function isSectorOpen(index) {
        return (state.cleared[state.theatre] || []).indexOf(index) >= 0;
    }

    /* The eight buttons of the sector select: the name of the sector, and
       locked until you have been through it. */
    function markSectorButtons() {
        const list = sectorList();
        for (let i = 0; i < DOME.sectorBtns.length; i++) {
            const b = DOME.sectorBtns[i];
            if (!b) continue;
            const nome = list[i] || "--";
            const aperto = isSectorOpen(i);
            b.textContent = nome;
            b.disabled = !aperto;
            b.classList.toggle("open", aperto);
            b.dataset.sector = String(i);
            b.title = aperto
                ? "Fly " + nome + " again, from stage " + (currentStages().length - i * stagesPerSector())
                : "Clear " + nome + " to open it";
        }
        if (DOME.sectorRow) DOME.sectorRow.classList.toggle("hidden", !(state.cleared[state.theatre] || []).length);
    }

    /* Starting a run from a sector you have already flown. A locked
       sector does nothing: the button is disabled, and so is this. */
    function startSector(index) {
        if (!isSectorOpen(index)) return false;
        const stages = currentStages();
        const from = clamp(index * stagesPerSector(), 0, stages.length - 1);
        resetGame();
        state.checkpoint = from;
        hideOverlay();
        Sound.unlock();
        startStage(from);
        return true;
    }

    /* The music knows how much trouble you are in: the march over the
       water, the boss, or the one that plays when you are one life from
       the end. The player hears the difference before they read the HUD. */
    function musicMood() {
        if (state.boss) return "boss";
        if (state.lives <= 1) return "peril";
        return "flight";
    }

    function syncMusic() {
        Music.set(musicMood());
    }

    function startStage(index) {
        const stages = currentStages();
        state.stageIndex = clamp(index, 0, stages.length - 1);
        state.stage = stages[state.stageIndex];
        state.stageNumber = state.stage.n;
        state.stageTarget = 58 + (32 - state.stage.n) * 0.45;
        state.segments = buildSegments(state.stage, H + state.stageTarget * state.stage.speed);
        const last = state.segments[state.segments.length - 1];
        state.totalLen = last.start + last.len;
        state.offset = H;
        state.stageTime = 0;
        state.wavePlan = buildWavePlan(state.stage);
        state.waveIndex = 0;
        state.blockedFor = 0;
        state.loops = config.loopsPerStage;
        state.weightTotal = 0;
        state.weightKilled = 0;
        state.silent = 0;
        state.bomberCombo = 0;
        state.enemySpeedMul = (1 + (32 - state.stage.n) * config.curveSpeed) * D.difficulty[state.difficulty].speed;
        state.hpMul = Math.min(3, 1 + Math.floor((32 - state.stage.n) / 12));
        state.phase = "briefing";
        state.phaseTimer = 2.0;
        Music.stop();

        const p = state.player;
        p.x = W / 2;
        p.y = PLAYER_START_Y;
        p.alive = true;
        p.looping = false;
        p.loopTimer = 0;
        p.roll = 0;
        p.invuln = 1.6;
        p.fireCool = 0;

        clearEntities();
        syncMusic();
        Sound.briefing();
    }

    function endStage() {
        /* The demo does not move the checkpoint: it is not a run. */
        if (!state.attract) {
            if (!state.checkpoints) state.checkpoints = { overlord: 0, rising: 0 };
            if (state.stageIndex > state.checkpoints[state.theatre]) {
                state.checkpoints[state.theatre] = state.stageIndex;
                save();
            }
            state.checkpoint = state.checkpoints[state.theatre];
        }
        const row = D.bonusFor(shootDownRate());
        state.accuracyBonus = row.pts;
        state.loopBonus = state.loops * config.loopBonus;
        addScore(state.accuracyBonus + state.loopBonus);
        state.phase = "clear";
        state.phaseTimer = 0;
        state.landing = 0;
        Sound.carrier();
        for (const e of state.enemies.slice()) {
            if (e.kind === "air") destroyEnemy(e, { award: false });
            else releaseFormation(e);
        }
        state.enemies.length = 0;
        state.ebullets.length = 0;
        if (!state.attract) markSectorCleared();
        markSectorButtons();
        save();
    }

    function advanceStage() {
        const stages = currentStages();
        if (state.stageIndex + 1 >= stages.length) {
            /* the demo does not surrender: it starts again */
            if (state.attract) { startAttract(); return; }
            addScore(1000000);
            save();
            state.phase = "victory";
            Music.stop();
            Sound.victory();
            showEnd(true);
            return;
        }
        startStage(state.stageIndex + 1);
    }

    function continueRun() {
        const stages = currentStages();
        const from = clamp(state.checkpoint, 0, stages.length - 1);
        resetGame();
        state.checkpoint = from;
        hideOverlay();
        Sound.unlock();
        startStage(from);
    }

    function gameOver() {
        state.phase = "gameover";
        Music.stop();
        Sound.gameOver();
        save();
        showEnd(false);
    }

    function showEnd(victory) {
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = victory ? "SURRENDER" : "GAME OVER";
        DOME.overlayMsg.textContent = victory
            ? "The fleet is destroyed. The war is over."
            : "You went down over " + (state.stage ? state.stage.name : "-") + " on stage " + state.stageNumber + ".";
        DOME.overlayStats.classList.remove("hidden");
        DOME.finalScore.textContent = state.score;
        DOME.finalHigh.textContent = state.highScore;
        DOME.finalLives.textContent = state.lives;
        DOME.finalRank.textContent = D.rankFor(state.score);
        DOME.overlayPlay.textContent = "\u25B6 Play Again";
        markSectorButtons();
        if (DOME.theatreChoices) DOME.theatreChoices.classList.add("hidden");
        if (DOME.difficultyRow) DOME.difficultyRow.classList.add("hidden");
        if (DOME.hitboxRow) DOME.hitboxRow.classList.add("hidden");
        if (DOME.continueBtn) {
            const resume = clamp(state.checkpoint, 0, currentStages().length - 1);
            DOME.continueStage.textContent = currentStages()[resume].n;
            DOME.continueBtn.classList.toggle("hidden", resume <= 0);
        }
    }

    /* ===== Update ===== */
    function shake(amount) {
        if (config.reducedMotion) return;
        state.shake = Math.min(config.shakeMax, state.shake + amount);
    }

    function update(dt) {
        state.tick++;
        if (state.shake > 0) state.shake = Math.max(0, state.shake - config.shakeDecay * dt);
        if (state.hitStop > 0 && !config.reducedMotion) {
            state.hitStop = Math.max(0, state.hitStop - dt);
            updateParticles(dt);
            return;
        }
        if (state.silent > 0) state.silent -= dt;

        if (state.phase === "briefing") {
            state.phaseTimer -= dt;
            if (state.phaseTimer <= 0) { state.phase = "playing"; Music.start(); }
            return;
        }

        if (state.phase === "clear") {
            state.phaseTimer += dt;
            state.landing = Math.min(1, state.phaseTimer / config.landingDuration);
            if (state.phaseTimer >= config.tallyAutoAdvance) advanceStage();
            Music.stop();
            updateScroll(dt);
            updateBullets(dt);
            updatePickups(dt);
            updateEnemies(dt);
            updateParticles(dt);
            updateFloaters(dt);
            return;
        }

        if (state.phase === "dead") {
            updateScroll(dt);
            updateBullets(dt);
            updatePickups(dt);
            updateEnemies(dt);
            updateParticles(dt);
            updateFloaters(dt);
            state.player.deathTimer -= dt;
            Music.stop();
            if (state.player.deathTimer <= 0) {
                if (state.attract) { startAttract(); return; }
                if (state.lives <= 0) { gameOver(); return; }
                const p = state.player;
                p.alive = true;
                p.x = W / 2;
                p.y = PLAYER_START_Y;
                p.invuln = 2.6;
                p.fireCool = 0;
                state.phase = "playing";
                syncMusic();
                Music.start();
            }
            return;
        }

        /* The attract mode: after a few seconds of nobody touching
           anything, the cabinet starts playing the game by itself. */
        if (state.phase === "menu") {
            if (!state.attract) {
                state.menuIdle += dt;
                if (state.menuIdle >= config.attractDelay) startAttract();
            }
            return;
        }

        if (state.phase !== "playing") return;

        /* the thread chain runs out if you stop rolling through things */
        if (state.threadTimer > 0) {
            state.threadTimer -= dt;
            if (state.threadTimer <= 0) state.thread = 0;
        }

        updatePlayer(dt);
        updateScroll(dt);
        updateBullets(dt);
        updatePickups(dt);
        updateEnemies(dt);
        updateParticles(dt);
        updateFloaters(dt);
        resolveCollisions();
    }

    function updateScroll(dt) {
        const stage = state.stage;
        if (!stage) return;
        state.offset += stage.speed * dt;
        state.stageTime += dt;

        let guard = 0;
        while (state.waveIndex < state.wavePlan.length && state.stageTime >= state.wavePlan[state.waveIndex].t && guard < 40) {
            if (launchWave(state.wavePlan[state.waveIndex])) {
                state.waveIndex++;
                state.blockedFor = 0;
                guard++;
                continue;
            }
            state.blockedFor += dt;
            if (state.blockedFor < 2.5) break;
            const stuck = state.wavePlan[state.waveIndex];
            stuck.unit = "zero";
            stuck.count = Math.max(1, Math.min(stuck.count, 4));
            stuck.shape = "line";
            stuck.force = true;
        }

        if (state.boss || state.phase === "clear") return;
        if (state.offset < state.totalLen || state.waveIndex < state.wavePlan.length) return;
        if (stage.bossTier > 0) spawnBoss(stage.bossTier);
        else endStage();
    }

    function updateBullets(dt) {
        for (let i = state.shots.length - 1; i >= 0; i--) {
            const s = state.shots[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            if (s.y < -20 || s.y > H + 20 || s.x < -20 || s.x > W + 20) {
                state.shots.splice(i, 1);
                give("bullet", s);
            }
        }
        for (let i = state.ebullets.length - 1; i >= 0; i--) {
            const b = state.ebullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.dead || b.life <= 0 || b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20) {
                state.ebullets.splice(i, 1);
                give("ebullet", b);
            }
        }
    }

    function updatePickups(dt) {
        for (let i = state.pows.length - 1; i >= 0; i--) {
            const pw = state.pows[i];
            pw.t += dt;
            pw.vx += (Math.random() - 0.5) * 14 * dt;
            pw.vx = clamp(pw.vx, -26, 26);
            pw.x += pw.vx * dt;
            pw.y += 22 * dt;
            if (pw.x < 16) { pw.x = 16; pw.vx = Math.abs(pw.vx); }
            if (pw.x > W - 16) { pw.x = W - 16; pw.vx = -Math.abs(pw.vx); }
            if (pw.y > H + 24) state.pows.splice(i, 1);
        }
        for (let i = state.medals.length - 1; i >= 0; i--) {
            const m = state.medals[i];
            m.t += dt;
            m.y += 26 * dt;
            m.x += Math.sin(m.t * 2) * 14 * dt;
            if (m.y > H + 24) state.medals.splice(i, 1);
        }
        for (let i = state.formations.length - 1; i >= 0; i--) {
            if (state.formations[i].alive <= 0) state.formations.splice(i, 1);
        }
    }

    function updateEnemies(dt) {
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            if (e.kind === "boss") updateBoss(e, dt);
            else updateEnemy(e, dt);
            const out = e.kind === "ground" || e.kind === "sea"
                ? e.y - (e.kind === "sea" ? 48 : 16) > H + 30
                : e.y < -70 || e.y > H + 90 || e.x < -70 || e.x > W + 70 || e.leaving;
            if (out) {
                state.enemies.splice(i, 1);
                releaseFormation(e);
                if (e.kind === "boss") { state.boss = null; syncMusic(); }
            }
        }
    }

    function updatePlayer(dt) {
        const p = state.player;
        if (!p.alive) return;
        if (p.invuln > 0) p.invuln -= dt;

        if (p.looping) {
            p.loopTimer -= dt;
            p.roll += dt * 22;
            if (p.loopTimer <= 0) {
                p.looping = false;
                p.roll = 0;
            }
        }

        const v = state.attract ? botVector() : inputVector();
        const mag = Math.hypot(v.x, v.y);
        const authority = p.looping ? config.loopSteer : 1;
        if (p.looping) {
            p.x += Math.sin(p.loopHeading) * config.loopSpeed * dt;
            p.y -= Math.cos(p.loopHeading) * config.loopSpeed * dt;
        }
        if (mag > 0.01) {
            const nx = v.x / mag, ny = v.y / mag;
            const sp = (mag >= 1 ? config.playerSpeed : config.playerSpeedDiag * mag) * authority;
            p.x += nx * sp * dt;
            p.y += ny * sp * dt;
            p.tilt += (-nx * 0.42 - p.tilt) * Math.min(1, dt * 9);
        } else if (input.drag && input.drag.vx !== 0) {
            const target = clamp(input.drag.vx * 9, -0.42, 0.42);
            p.tilt += (target - p.tilt) * Math.min(1, dt * 12);
            input.drag.vx = 0;
        } else if (!p.looping) {
            p.tilt += (0 - p.tilt) * Math.min(1, dt * 6);
        }
        p.x = clamp(p.x, 14, W - 14);
        p.y = clamp(p.y, config.playerTopMargin, H - config.playerBottomMargin);

        p.fireCool -= dt;
        if (!p.looping && (input.fire || input.touch || state.attract)) playerFire();

        for (let i = 0; i < state.sideFighters.length; i++) {
            const f = state.sideFighters[i];
            if (!f) continue;
            f.x += ((i === 0 ? p.x - 19 : p.x + 19) - f.x) * Math.min(1, dt * 10);
            f.y += ((p.y + 3) - f.y) * Math.min(1, dt * 10);
            f.cool -= dt;
            if (f.cool <= 0 && !p.looping) sideFire(f);
        }
    }

    /* ===== Input ===== */
    const input = { keys: Object.create(null), fire: false, touch: false, drag: null };

    function inputVector() {
        let x = 0, y = 0;
        if (input.keys.ArrowLeft || input.keys.KeyA) x -= 1;
        if (input.keys.ArrowRight || input.keys.KeyD) x += 1;
        if (input.keys.ArrowUp || input.keys.KeyW) y -= 1;
        if (input.keys.ArrowDown || input.keys.KeyS) y += 1;
        return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
    }

    function toCanvas(clientX, clientY) {
        const rect = DOME.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (W / (rect.width || W)),
            y: (clientY - rect.top) * (H / (rect.height || H)),
        };
    }

    function onPointerDown(clientX, clientY) {
        Sound.unlock();
        setupWakeLock();
        if (state.phase === "clear") { advanceStage(); return; }
        const pos = toCanvas(clientX, clientY);
        input.touch = true;
        input.drag = { ox: pos.x, oy: pos.y, px: state.player.x, py: state.player.y, vx: 0 };
    }

    function onPointerMove(clientX, clientY) {
        if (!input.drag) return;
        const pos = toCanvas(clientX, clientY);
        const p = state.player;
        const nx = clamp(input.drag.px + (pos.x - input.drag.ox), 14, W - 14);
        p.y = clamp(input.drag.py + (pos.y - input.drag.oy), config.playerTopMargin, H - config.playerBottomMargin);
        input.drag.vx = nx - p.x;
        p.x = nx;
    }

    function onPointerUp() {
        input.drag = null;
        if (!input.fire) input.touch = false;
    }

    function handleKeyDown(e) {
        Sound.unlock();
        input.keys[e.code] = true;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) e.preventDefault();
        if (e.code === "KeyZ" || e.code === "Space") input.fire = true;
        if (e.repeat) return;
        if (e.code === "KeyX" || e.code === "ShiftLeft" || e.code === "ShiftRight") doLoop();
        if (e.code === "KeyP" || e.code === "Escape") togglePause();
        if (e.code === "Enter") {
            if (state.phase === "clear") advanceStage();
            else if (state.attract || state.phase === "menu" || state.phase === "gameover" || state.phase === "victory") startGame();
        }
    }

    function handleKeyUp(e) {
        input.keys[e.code] = false;
        if (e.code === "KeyZ" || e.code === "Space") input.fire = false;
    }

    function setupEvents() {
        const c = DOME.canvas;
        c.addEventListener("touchstart", (e) => {
            e.preventDefault();
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        c.addEventListener("touchmove", (e) => {
            e.preventDefault();
            onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        c.addEventListener("touchend", (e) => { e.preventDefault(); onPointerUp(); }, { passive: false });
        c.addEventListener("touchcancel", onPointerUp);
        c.addEventListener("contextmenu", (e) => e.preventDefault());
        c.addEventListener("mousedown", (e) => { e.preventDefault(); onPointerDown(e.clientX, e.clientY); });
        global.addEventListener("mousemove", (e) => { if (input.drag) onPointerMove(e.clientX, e.clientY); });
        global.addEventListener("mouseup", onPointerUp);

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        global.addEventListener("blur", () => {
            input.keys = Object.create(null);
            input.fire = false;
            input.drag = null;
            input.touch = false;
        });
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && state.phase === "playing" && !state.paused) togglePause();
            if (!document.hidden) setupWakeLock();
        });

        DOME.startBtn.addEventListener("click", () => { Sound.unlock(); startGame(); });
        DOME.loopBtn.addEventListener("click", (e) => { e.preventDefault(); Sound.unlock(); doLoop(); });
        DOME.pauseBtn.addEventListener("click", togglePause);
        DOME.soundBtn.addEventListener("click", toggleSound);
        DOME.overlayPlay.addEventListener("click", () => { Sound.unlock(); startGame(); });
        if (DOME.continueBtn) DOME.continueBtn.addEventListener("click", () => { Sound.unlock(); continueRun(); });
        for (let i = 0; i < DOME.sectorBtns.length; i++) {
            const b = DOME.sectorBtns[i];
            if (!b || !b.addEventListener) continue;
            b.addEventListener("click", () => { Sound.unlock(); startSector(i); });
        }
        DOME.overlayTheme.addEventListener("click", cycleTheme);
        if (DOME.hitboxChoices) {
            for (const b of DOME.hitboxChoices.querySelectorAll(".chip")) {
                b.addEventListener("click", () => { Sound.unlock(); setHitbox(b.dataset.hitbox === "on"); });
            }
        }

        if (DOME.difficultyChoices) {
            for (const btn of DOME.difficultyChoices.querySelectorAll(".chip")) {
                btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty));
            }
        }

        const t1 = document.getElementById("theatre-overlord");
        const t2 = document.getElementById("theatre-rising");
        if (t1) t1.addEventListener("click", () => setTheatre("overlord"));
        if (t2) t2.addEventListener("click", () => setTheatre("rising"));

        global.addEventListener("resize", fitCanvas);
        global.addEventListener("orientationchange", () => setTimeout(fitCanvas, 250));
        if (global.visualViewport) {
            global.visualViewport.addEventListener("resize", fitCanvas);
            global.visualViewport.addEventListener("scroll", fitCanvas);
        }

        if (DOME.installBtn) DOME.installBtn.addEventListener("click", installApp);
        if (DOME.installLater) DOME.installLater.addEventListener("click", dismissInstall);
    }

    function setTheatre(id) {
        if (!D.theatres[id]) return;
        state.theatre = id;
        if (state.checkpoints) state.checkpoint = state.checkpoints[id] || 0;
        state.highScore = state.highScores[id] || 0;
        DOME.overlayMsg.textContent = D.theatres[id].blurb;
        markTheatreButtons();
        markSectorButtons();
        save();
    }

    function setDifficulty(id) {
        if (!D.difficulty[id]) return;
        state.difficulty = id;
        markDifficultyButtons();
        config.reducedMotion = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
        DOME.soundBtn.setAttribute("aria-pressed", String(state.sound));
        save();
    }

    function markDifficultyButtons() {
        if (!DOME.difficultyChoices) return;
        for (const b of DOME.difficultyChoices.querySelectorAll(".chip")) {
            b.classList.toggle("active", b.dataset.difficulty === state.difficulty);
        }
    }

    function markHitboxButtons() {
        if (!DOME.hitboxChoices) return;
        for (const b of DOME.hitboxChoices.querySelectorAll(".chip")) {
            b.classList.toggle("active", (b.dataset.hitbox === "on") === !!state.hitbox);
        }
    }

    function setHitbox(on) {
        state.hitbox = !!on;
        markHitboxButtons();
        save();
    }

    function markTheatreButtons() {
        if (!DOME.theatreChoices) return;
        for (const b of DOME.theatreChoices.querySelectorAll(".btn")) {
            b.classList.toggle("active", b.dataset.theatre === state.theatre);
        }
    }

    function toggleSound() {
        state.sound = !state.sound;
        Sound.setEnabled(state.sound);
        if (!state.sound) Music.stop();
        DOME.soundBtn.textContent = state.sound ? "\u{1F50A} Sound" : "\u{1F507} Muted";
        DOME.soundBtn.setAttribute("aria-pressed", String(state.sound));
        save();
    }

    function togglePause() {
        if (state.attract || state.phase === "menu" || state.phase === "gameover" || state.phase === "victory") return;
        state.paused = !state.paused;
        DOME.pauseBtn.textContent = state.paused ? "\u25B6 Resume" : "\u23F8 Pause";
        if (state.paused) {
            stopHudLoop();
            Music.stop();
        }
        if (!state.paused) {
            if (state.phase === "playing") Music.start();
            state.acc = 0;
            lastTs = 0;
            if (hudHandle === null) hudHandle = requestAnimationFrame(hudTickLoop);
        }
    }

    /* ===== Loop ===== */
    let rafId = null;
    let lastTs = 0;

    function startLoop() {
        if (rafId === null) {
            lastTs = 0;
            rafId = requestAnimationFrame(loop);
        }
    }

    function loop(ts) {
        rafId = requestAnimationFrame(loop);
        if (!lastTs) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 1000, config.maxFrameTime);
        lastTs = ts;
        if (!state.paused) {
            state.acc += dt;
            let guard = 0;
            while (state.acc >= config.step && guard < 8) {
                update(config.step);
                state.acc -= config.step;
                guard++;
            }
        }
        draw();
    }

    /* ===== Rendering ===== */
    function fitCanvas() {
        const host = DOME.canvas.parentElement;
        const vv = global.visualViewport;
        const availW = vv ? Math.min(host.clientWidth, vv.width) : host.clientWidth;
        const availH = vv ? Math.min(host.clientHeight, vv.height) : host.clientHeight;
        if (!availW || !availH) return;
        let w = availW;
        let h = w * (H / W);
        if (h > availH) { h = availH; w = h / (H / W); }
        DOME.canvas.style.width = Math.floor(w) + "px";
        DOME.canvas.style.height = Math.floor(h) + "px";
    }

    function setupCanvas() {
        const dpr = Math.min(global.devicePixelRatio || 1, 2);
        DOME.canvas.width = Math.round(W * dpr);
        DOME.canvas.height = Math.round(H * dpr);
        DOME.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        Art.setWidth(W);
    }

    function draw() {
        const ctx = DOME.ctx;
        const th = themes[state.theme];
        if (state.shake > 0.05) {
            const a = Math.random() * Math.PI * 2;
            ctx.save();
            ctx.translate(Math.cos(a) * state.shake, Math.sin(a) * state.shake);
        } else {
            ctx.save();
        }
        drawTerrain(ctx, th);
        drawWorld(ctx, th);
        drawPlayer(ctx, th);
        drawHud(ctx, th);
        if (state.paused) drawPause(ctx, th);
        ctx.restore();
    }

    function drawWorld(ctx, th) {
        for (const e of state.enemies) {
            if (e.delay > 0) continue;
            if (e.kind === "ground") {
                Art.groundUnit(ctx, e.art, e.x, e.y, e.facing, state.stageTime, 1);
            } else if (e.kind === "sea") {
                Art.seaUnit(ctx, e.art, e.x, e.y, state.stageTime, 1);
            } else if (e.kind === "boss") {
                drawBoss(ctx, e, th);
            } else {
                const base = Art.schemeFor(state.theatre, e.unit);
                Art.warbird(ctx, e.art, e.x, e.y, e.angle, 1,
                    e.flash > 0 ? FLASH_SCHEME : base, state.stageTime, 1);
            }
        }

        for (const pw of state.pows) Art.powCrate(ctx, pw.kind, pw.x, pw.y, pw.t, th, state.stageTime);
        for (const m of state.medals) Art.medal(ctx, m.x, m.y, m.t, "#ffd54f");

        ctx.fillStyle = "#ff5533";
        for (const b of state.ebullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const s of state.shots) {
            Art.glow(ctx, s.x, s.y, s.r, th.bullet);
            ctx.fillStyle = th.bullet;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        drawParticles(ctx);
        drawFloaters(ctx);
    }

    function drawBoss(ctx, e, th) {
        Art.warbird(ctx, "boss", e.x, e.y, e.angle, 1,
            e.flash > 0 ? BOSS_FLASH : Art.schemeFor(state.theatre, "bomber"), state.stageTime, 1);
        const bw = 88;
        const bx = e.x - bw / 2;
        const by = e.y + 66;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = e.hp < e.maxHp * 0.3 ? "#ff3b2f" : th.accent;
        ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 5);
    }

    function drawPlayer(ctx, th) {
        const p = state.player;
        if (!p) return;
        const theatre = D.theatres[state.theatre];

        for (let i = 0; i < state.sideFighters.length; i++) {
            const f = state.sideFighters[i];
            if (!f) continue;
            Art.warbird(ctx, theatre.sideArt, f.x, f.y, 0, 0.72,
                { body: th.planeAlt, wing: th.accent2, trim: "#ffffff" }, state.stageTime, 1);
        }

        if (!p.alive) return;
        if (p.invuln > 0 && !p.looping && Math.floor(state.tick / 4) % 2 === 0) return;

        if (p.looping) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 3; i++) {
                Art.warbird(ctx, theatre.planeArt, p.x, p.y + i * 8, p.roll, 1,
                    { body: th.planeGrad, wing: th.accent2, trim: "#ffffff" }, state.stageTime, 1);
            }
            ctx.restore();
        }
        Art.warbird(ctx, theatre.planeArt, p.x, p.y, p.looping ? p.roll : p.tilt, 1,
            { body: th.plane, wing: th.planeGrad, trim: "#ffffff" }, state.stageTime, 1);

        /* The hitbox: the circle that actually kills you, five and a half
           pixels across, drawn on top of an aircraft thirty pixels wide.
           Every modern shooter shows it, because the aircraft is not the
           thing that gets hit. */
        if (state.hitbox) {
            ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = "#ff3b2f";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawHud(ctx, th) {
        const stage = state.stage;
        if (stage && state.phase !== "menu") {
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(0, 0, W, 17);
            ctx.fillStyle = th.text;
            ctx.font = "bold 11px Arial, sans-serif";
            ctx.fillText("STAGE " + stage.n + "  " + stage.name, 6, 13);
            ctx.textAlign = "right";
            ctx.fillStyle = state.loops > 0 ? th.accent : "#ff6b5b";
            ctx.fillText("LOOPS " + state.loops, W - 6, 13);

            const prog = clamp((state.offset - H) / Math.max(1, state.totalLen - H), 0, 1);
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 19, W, 3);
            ctx.fillStyle = th.accent;
            ctx.fillRect(0, 19, W * prog, 3);

            if (state.bomberCombo > 1) {
                ctx.textAlign = "center";
                ctx.fillStyle = "#ffd54f";
                ctx.font = "bold 13px Arial, sans-serif";
                ctx.fillText("BOMBER x" + state.bomberCombo, W / 2, 34);
            }

            /* The thread chain, and how long it has left. */
            if (state.thread > 1) {
                ctx.textAlign = "center";
                ctx.fillStyle = "#9be7ff";
                ctx.font = "bold 13px Arial, sans-serif";
                ctx.fillText("THREADED x" + state.thread, W / 2, state.bomberCombo > 1 ? 50 : 34);
            }

            if (state.silent > 0) {
                ctx.textAlign = "center";
                ctx.fillStyle = "#ff8c1a";
                ctx.font = "bold 11px Arial, sans-serif";
                ctx.fillText("GUNS JAMMED " + state.silent.toFixed(1) + "s", W / 2, 34);
            }
        }

        for (let i = 0; i < Math.max(0, state.lives - 1) && i < 6; i++) {
            Art.warbird(ctx, "light", 11 + i * 16, H - 9, 0, 0.55,
                { body: th.plane, wing: th.planeGrad, trim: "#ffffff" }, state.stageTime, 1);
        }

        if (state.phase === "briefing") drawBriefing(ctx, th);
        if (state.phase === "clear") { drawLanding(ctx, th); drawStageClear(ctx, th); }

        if (state.phase === "dead") {
            ctx.textAlign = "center";
            ctx.fillStyle = "#ff6b5b";
            ctx.font = "bold 15px Arial, sans-serif";
            ctx.fillText("AIRCRAFT LOST", W / 2, H / 2 - 40);
        }
        ctx.textAlign = "left";
    }

    /* The sector card: where this is, when it is, and what the sortie is
       for. A stage is four stages inside a named sector, so the card is
       looked up by the sector the stage belongs to. */
    function sectorCard() {
        const carte = D.sectorCards[state.theatre];
        if (!carte || !state.stage) return null;
        return carte[state.stage.name] || null;
    }

    /* Wraps a line of prose into the width the card has. The card is
       measured before it is drawn, so the panel is exactly as tall as the
       text in it. */
    function wrapWords(line, max) {
        const parole = line.split(" ");
        const righe = [];
        let riga = "";
        for (const parola of parole) {
            if ((riga + " " + parola).length > max) {
                righe.push(riga);
                riga = parola;
            } else {
                riga = riga ? riga + " " + parola : parola;
            }
        }
        if (riga) righe.push(riga);
        return righe;
    }

    function drawBriefing(ctx, th) {
        const t = D.theatres[state.theatre];
        const card = sectorCard();
        const righe = card ? wrapWords(card.line, 40) : [];
        const alto = card ? 92 : 64;
        /* the panel is as tall as the card needs, and no taller */
        const basso = card ? 90 + (righe.length - 1) * 15 : 64;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, H / 2 - alto, W, alto + basso);
        ctx.textAlign = "center";
        ctx.fillStyle = th.accent;
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText(t.name, W / 2, H / 2 - alto + 24);
        ctx.fillStyle = th.text;
        ctx.font = "bold 26px Arial, sans-serif";
        ctx.fillText("STAGE " + state.stage.n, W / 2, H / 2 - 4);
        ctx.font = "bold 17px Arial, sans-serif";
        ctx.fillStyle = th.plane;
        ctx.fillText(state.stage.name, W / 2, H / 2 + 20);
        ctx.font = "11px Arial, sans-serif";
        ctx.fillStyle = "rgba(240,240,240,0.7)";
        ctx.fillText(t.plane + "   " + t.year, W / 2, H / 2 + 38);

        if (!card) return;
        /* the place and the date, then the one line that says what this is */
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillStyle = th.accent;
        ctx.fillText(card.place.toUpperCase() + "   " + card.date, W / 2, H / 2 + 58);
        ctx.font = "italic 12px Arial, sans-serif";
        ctx.fillStyle = "rgba(240,240,240,0.78)";
        let y = H / 2 + 78;
        for (const riga of righe) {
            ctx.fillText(riga, W / 2, y);
            y += 15;
        }
    }

    function drawLanding(ctx, th) {
        const k = clamp(state.landing, 0, 1);
        if (k <= 0) return;
        const ease = 1 - Math.pow(1 - k, 3);
        const deckY = H - 54 - ease * 26;
        const shipX = W / 2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, H - 74, W, 74);
        Art.seaUnit(ctx, "ship", shipX, deckY + 30, state.stageTime, 1);
        const px = shipX + (1 - ease) * 90;
        const py = Math.max(deckY - 26, state.player.y * (1 - ease) + (deckY - 26) * ease);
        Art.warbird(ctx, D.theatres[state.theatre].planeArt, px, py, 0, 0.8,
            { body: th.plane, wing: th.planeGrad, trim: "#ffffff" }, state.stageTime, 1);
        if (k > 0.96) {
            ctx.globalAlpha = (k - 0.96) / 0.04;
            ctx.strokeStyle = "#ffe9a8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shipX - 34, deckY - 4);
            ctx.lineTo(shipX + 34, deckY - 4);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawStageClear(ctx, th) {
        const acc = shootDownRate();
        const row = D.bonusFor(acc);
        const reveal = clamp((state.phaseTimer - 0.8) / 0.5, 0, 1);
        if (reveal <= 0) return;
        ctx.globalAlpha = reveal;
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, H / 2 - 98, W, 196);
        ctx.textAlign = "center";
        ctx.fillStyle = th.accent;
        ctx.font = "bold 20px Arial, sans-serif";
        ctx.fillText("STAGE " + state.stage.n + " CLEAR", W / 2, H / 2 - 64);

        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, H / 2 - 52);
        ctx.lineTo(W - 30, H / 2 - 52);
        ctx.stroke();

        ctx.font = "12px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = th.text;
        ctx.fillText("SHOOT DOWN RATE", 34, H / 2 - 28);
        ctx.fillText("UNUSED LOOPS", 34, H / 2 - 4);
        ctx.textAlign = "right";
        ctx.fillText(acc.toFixed(1) + "%", W - 34, H / 2 - 28);
        ctx.fillText(String(state.loops), W - 34, H / 2 - 4);

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(240,240,240,0.75)";
        ctx.fillText((row.label ? row.label + "  " : "") + "BONUS", 34, H / 2 + 26);
        ctx.textAlign = "right";
        ctx.fillStyle = th.accent;
        ctx.fillText(String(state.accuracyBonus), W - 34, H / 2 + 26);

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(240,240,240,0.75)";
        ctx.fillText("LOOP BONUS", 34, H / 2 + 48);
        ctx.textAlign = "right";
        ctx.fillText(String(state.loopBonus), W - 34, H / 2 + 48);

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial, sans-serif";
        ctx.fillText("TOTAL " + (state.accuracyBonus + state.loopBonus), W / 2, H / 2 + 76);

        if (Math.floor(state.phaseTimer * 2) % 2 === 0) {
            ctx.font = "bold 12px Arial, sans-serif";
            ctx.fillStyle = th.accent;
            ctx.fillText("TAP OR PRESS ENTER", W / 2, H / 2 + 102);
        }

        ctx.font = "10px Arial, sans-serif";
        ctx.fillStyle = "rgba(240,240,240,0.55)";
        ctx.fillText("NEXT STAGE IN " + Math.max(1, Math.ceil(config.tallyAutoAdvance - state.phaseTimer)) + "s",
            W / 2, H / 2 + 118);
        ctx.globalAlpha = 1;
    }

    function drawPause(ctx, th) {
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = th.accent;
        ctx.font = "bold 26px Arial, sans-serif";
        ctx.fillText("PAUSED", W / 2, H / 2 - 6);
        ctx.font = "12px Arial, sans-serif";
        ctx.fillStyle = th.text;
        ctx.fillText("MOVE    arrows / WASD / drag", W / 2, H / 2 + 24);
        ctx.fillText("SHOOT   Z   (auto-fire on touch)", W / 2, H / 2 + 42);
        ctx.fillText("LOOP    X   or the LOOP button", W / 2, H / 2 + 60);
        ctx.textAlign = "left";
    }

    /* ===== HUD, overlay, storage ===== */
    const hudCache = { score: -1, high: -1, lives: -1, stage: -1, loops: -1, disabled: null };

    function setText(el, value, key) {
        if (hudCache[key] === value) return;
        hudCache[key] = value;
        el.textContent = value;
    }

    function updateHUD() {
        setText(DOME.scoreEl, state.score, "score");
        setText(DOME.highScoreEl, state.highScore, "high");
        setText(DOME.livesEl, state.lives, "lives");
        setText(DOME.stageEl, state.stage ? state.stage.n : 32, "stage");
        setText(DOME.loopsEl, state.loops, "loops");
        const disabled = state.loops <= 0 || !state.player || !state.player.alive || state.phase !== "playing";
        if (hudCache.disabled !== disabled) {
            hudCache.disabled = disabled;
            DOME.loopBtn.disabled = disabled;
        }
    }

    function showStartOverlay() {
        const t = D.theatres[state.theatre];
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "MUSTANG PWA";
        DOME.overlayMsg.textContent = t.blurb;
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayPlay.textContent = "\u25B6 Play";
        markSectorButtons();
        if (DOME.continueBtn) DOME.continueBtn.classList.add("hidden");
        if (DOME.theatreChoices) {
            DOME.theatreChoices.classList.remove("hidden");
            markTheatreButtons();
        }
        markDifficultyButtons();
        markHitboxButtons();
        if (DOME.difficultyRow) DOME.difficultyRow.classList.remove("hidden");
    }

    function hideOverlay() { DOME.overlay.classList.add("hidden"); }

    function applyTheme(name) {
        state.theme = themes[name] ? name : "olive";
        document.documentElement.setAttribute("data-theme", state.theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", themes[state.theme].bg);
    }

    function cycleTheme() {
        const names = Object.keys(themes);
        const idx = names.indexOf(state.theme);
        applyTheme(names[(idx + 1) % names.length]);
        save();
        if (state.attract || state.phase === "menu") showStartOverlay();
    }

    function save() {
        /* The demo does not score: it is not a run, and its points must
           not end up in the high score of a front. */
        if (!state.attract) {
            state.highScores[state.theatre] = Math.max(state.highScores[state.theatre] || 0, state.score);
            state.highScore = state.highScores[state.theatre];
        }
        store.set("mustang-pwa", {
            highScores: state.highScores,
            theme: state.theme,
            theatre: state.theatre,
            difficulty: state.difficulty,
            checkpoint: state.checkpoints ? state.checkpoints[state.theatre] || 0 : 0,
            cleared: {
                overlord: (state.cleared.overlord || []).slice(),
                rising: (state.cleared.rising || []).slice(),
            },
            hitbox: state.hitbox,
            sound: state.sound,
        });
    }

    function load() {
        const saved = store.get("mustang-pwa", null);
        if (saved) {
            state.highScores = Object.assign({ overlord: 0, rising: 0 }, saved.highScores || {});
            state.theme = themes[saved.theme] ? saved.theme : "olive";
            state.theatre = D.theatres[saved.theatre] ? saved.theatre : "overlord";
            state.difficulty = D.difficulty[saved.difficulty] ? saved.difficulty : "arcade";
            state.checkpoint = { overlord: 0, rising: 0 };
            state.checkpoints = { overlord: 0, rising: 0 };
            state.checkpoints[saved.theatre] = saved.checkpoint || 0;
            state.cleared = { overlord: [], rising: [] };
            if (saved.cleared && typeof saved.cleared === "object") {
                for (const id of ["overlord", "rising"]) {
                    const list = saved.cleared[id];
                    if (!Array.isArray(list)) continue;
                    state.cleared[id] = list.filter((n) => Number.isInteger(n) && n >= 0 && n < 8);
                }
            }
            state.hitbox = saved.hitbox !== false;
            state.sound = saved.sound !== false;
        }
        state.highScore = state.highScores[state.theatre] || 0;
        applyTheme(state.theme);
        Sound.setEnabled(state.sound);
        DOME.soundBtn.textContent = state.sound ? "\u{1F50A} Sound" : "\u{1F507} Muted";
        markDifficultyButtons();
        markHitboxButtons();
        if (store.get("mustang-install-dismissed", false)) DOME.installPrompt.classList.add("hidden");
        if (store.get("mustang-hint-seen", false) && DOME.controlsHint) DOME.controlsHint.classList.add("hidden");
    }

    /* ===== PWA ===== */
    let deferredPrompt = null;

    function setupInstallPrompt() {
        global.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (!store.get("mustang-install-dismissed", false)) DOME.installPrompt.classList.remove("hidden");
        });
    }

    function installApp() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            DOME.installPrompt.classList.add("hidden");
            deferredPrompt = null;
        });
    }

    function dismissInstall() {
        DOME.installPrompt.classList.add("hidden");
        store.set("mustang-install-dismissed", true);
    }

    let wakeLock = null;

    async function setupWakeLock() {
        if (!("wakeLock" in navigator) || wakeLock) return;
        try {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => { wakeLock = null; });
        } catch (e) {}
    }

    function setupServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("service-worker.js").catch(() => {});
        }
    }

    /* ===== Boot ===== */
    let hudHandle = null;

    function hudTickLoop() {
        updateHUD();
        hudHandle = requestAnimationFrame(hudTickLoop);
    }

    function stopHudLoop() {
        if (hudHandle === null) return;
        cancelAnimationFrame(hudHandle);
        hudHandle = null;
    }
    function init() {
        setupDOME();
        setupCanvas();
        setupEvents();
        load();
        state.player = newPlayer();
        state.stage = D.allStages[state.theatre][0];
        state.stageTarget = 58 + (32 - state.stage.n) * 0.45;
        state.segments = buildSegments(state.stage, H + state.stageTarget * state.stage.speed);
        const last = state.segments[state.segments.length - 1];
        state.totalLen = last.start + last.len;
        state.wavePlan = buildWavePlan(state.stage);
        fitCanvas();
        setupServiceWorker();
        setupInstallPrompt();
        draw();
        showStartOverlay();
        startLoop();
        updateHUD();

        hudHandle = requestAnimationFrame(hudTickLoop);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    MUSTANG.game = {
        state: state,
        startGame: startGame,
        startStage: startStage,
        advanceStage: advanceStage,
        doLoop: doLoop,
        setTheatre: setTheatre,
        /* Exported so the tests can add points the way the game does, rather
           than setting the score behind the extends' back. */
        addScore: addScore,
        /* Exported so the tests can watch the demo fly. */
        startAttract: startAttract,
    };
})(typeof window !== "undefined" ? window : globalThis);