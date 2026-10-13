/*
 * LUMEN - the world. Generation, movement, collision and the mass economy.
 *
 * Bodies are stored as a resampled spine rather than per-frame segments, so
 * they look identical at any framerate and cost the same on a phone as on a
 * desktop.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var W = C.world;
    var B = C.body;

    /* ===== Spatial hash =====
     * Flat bucket array, reused every frame. Entities carry a stamp so
     * queries can dedupe without allocating a Set.
     */
    function Grid(size, cell) {
        this.n = Math.ceil(size / cell) + 1;
        this.cell = cell;
        this.buckets = new Array(this.n * this.n);
        for (var i = 0; i < this.buckets.length; i++) this.buckets[i] = [];
    }

    Grid.prototype.clear = function () {
        for (var i = 0; i < this.buckets.length; i++) this.buckets[i].length = 0;
    };

    Grid.prototype.insert = function (x, y, item) {
        var cx = Math.floor(x / this.cell);
        var cy = Math.floor(y / this.cell);
        if (cx < 0 || cy < 0 || cx >= this.n || cy >= this.n) return;
        this.buckets[cy * this.n + cx].push(item);
    };

    /* Large static objects must be registered in every cell they overlap,
     * or a query that lands in a neighbouring cell simply never sees them. */
    Grid.prototype.insertSpanned = function (x, y, radius, item) {
        var c0x = Math.max(0, Math.floor((x - radius) / this.cell));
        var c1x = Math.min(this.n - 1, Math.floor((x + radius) / this.cell));
        var c0y = Math.max(0, Math.floor((y - radius) / this.cell));
        var c1y = Math.min(this.n - 1, Math.floor((y + radius) / this.cell));
        for (var cy = c0y; cy <= c1y; cy++) {
            var row = cy * this.n;
            for (var cx = c0x; cx <= c1x; cx++) this.buckets[row + cx].push(item);
        }
    };

    var queryStamp = 1;

    Grid.prototype.query = function (x, y, r, out) {
        out.length = 0;
        var c0x = Math.max(0, Math.floor((x - r) / this.cell));
        var c1x = Math.min(this.n - 1, Math.floor((x + r) / this.cell));
        var c0y = Math.max(0, Math.floor((y - r) / this.cell));
        var c1y = Math.min(this.n - 1, Math.floor((y + r) / this.cell));
        var stamp = ++queryStamp;
        for (var cy = c0y; cy <= c1y; cy++) {
            var row = cy * this.n;
            for (var cx = c0x; cx <= c1x; cx++) {
                var bucket = this.buckets[row + cx];
                for (var i = 0; i < bucket.length; i++) {
                    var it = bucket[i];
                    if (it._stamp === stamp) continue;
                    it._stamp = stamp;
                    out.push(it);
                }
            }
        }
        return out;
    };

    /* ===== Body maths ===== */
    function bodyLength(mass) {
        return Math.min(B.lenMax, B.lenBase + mass * B.lenPerMass);
    }

    function bodyRadius(mass) {
        return Math.min(B.radMax, B.radBase + B.radPerSqrtMass * Math.sqrt(Math.max(0, mass)));
    }

    /* The signature rule: glow radius is vision radius. */
    function glowFor(mass) {
        return L.clamp(
            C.light.base + C.light.perSqrtMass * Math.sqrt(Math.max(0, mass)),
            C.light.min,
            C.light.max
        );
    }

    function turnRateFor(mass) {
        var t = L.clamp(mass / C.player.massForTurnCap, 0, 1);
        return L.lerp(C.player.turnFast, C.player.turnSlow, t);
    }

    /* Zoom out as you grow so a huge LUMEN does not fill the screen. */
    function zoomFor(mass) {
        var s = Math.sqrt(Math.max(0, mass) / 100);
        return Math.max(C.camera.zoomMin, C.camera.zoomAtMin - C.camera.zoomAtHundred * s);
    }

    function refreshBody(c) {
        c.radius = bodyRadius(c.mass);
        c.bodyLen = bodyLength(c.mass);
        c.maxPts = Math.max(2, Math.floor(c.bodyLen / B.spacing));
        c.glow = glowFor(c.mass);
        /* Bodies are a touch narrower to collide with than they look, which
         * makes threading between two rivals feel fair on a touchscreen. */
        c.bodyHitR = c.radius * 0.62;
    }

    /* Re-space the body along the travelled path at a fixed arc length. */
    function rebuildBody(c) {
        var trail = c.trail;
        trail.unshift({ x: c.headX, y: c.headY });

        var maxTrail = c.maxPts * 3 + 8;
        if (trail.length > maxTrail) trail.length = maxTrail;

        var pts = c.pts;
        pts.length = 0;
        pts.push({ x: c.headX, y: c.headY });

        var spacing = B.spacing;
        var acc = 0;
        var i, a, b, dx, dy, segLen, consumed, f;

        outer:
        for (i = 1; i < trail.length; i++) {
            a = trail[i - 1];
            b = trail[i];
            dx = b.x - a.x;
            dy = b.y - a.y;
            segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen < 1e-6) continue;
            consumed = 0;
            while (acc + (segLen - consumed) >= spacing) {
                consumed += spacing - acc;
                acc = 0;
                f = consumed / segLen;
                pts.push({ x: a.x + dx * f, y: a.y + dy * f });
                if (pts.length >= c.maxPts) break outer;
            }
            acc += segLen - consumed;
        }
    }

    /* Lay the body out behind the head immediately on spawn. */
    function seedBody(c, len) {
        var spacing = B.spacing;
        var n = Math.max(2, Math.floor(len / spacing));
        c.trail.length = 0;
        c.pts.length = 0;
        for (var i = 0; i < n; i++) {
            var p = {
                x: c.headX - Math.cos(c.angle) * spacing * i,
                y: c.headY - Math.sin(c.angle) * spacing * i,
            };
            c.trail.push(p);
            c.pts.push(p);
        }
        if (!c.pts.length) c.pts.push({ x: c.headX, y: c.headY });
        if (!c.trail.length) c.trail.push({ x: c.headX, y: c.headY });
    }

    /* ===== Creatures ===== */
    function createCreature(opts) {
        var c = {
            id: opts.id,
            name: opts.name,
            isPlayer: !!opts.isPlayer,
            clanId: opts.clanId === undefined ? 0 : opts.clanId,
            color: opts.color || L.PALETTE[0],
            botId: opts.botId || null,

            headX: opts.x, headY: opts.y,
            angle: opts.angle || 0,
            targetAngle: opts.angle || 0,
            vx: 0, vy: 0,

            mass: opts.mass,
            radius: 0, bodyLen: 0, maxPts: 0, glow: 0, bodyHitR: 0,

            pts: [],
            trail: [],

            boosting: false,
            wantBoost: false,
            stun: 0,
            alive: true,
            atEdge: false,
            kills: 0,
            rank: 0,
            spawnedAt: 0,

            ai: null,
            personality: null,
            grudge: 0,
            _stamp: 0,
        };
        refreshBody(c);
        seedBody(c, c.bodyLen);
        return c;
    }

    function addMass(c, amount) {
        c.mass += amount;
        refreshBody(c);
    }

    /* ===== World ===== */
    var world = {
        size: W.size,
        rng: null,
        time: 0,
        creatures: [],
        player: null,
        food: [],
        wrecks: [],
        jellies: [],
        anglers: [],
        particles: [],
        events: [],
        cGrid: null,
        foodGrid: null,
        wreckGrid: null,
        scratch: [],
        leaderMass: 0,
        rank: 1,
        aliveCount: 0,
        anglerKills: 0,
    };

    var rng = Math.random;

    /* ===== Generation ===== */
    function generate(seed) {
        rng = L.mulberry32(seed);
        var size = W.size;

        world.food.length = 0;
        world.wrecks.length = 0;
        world.jellies.length = 0;
        world.anglers.length = 0;
        world.particles.length = 0;
        world.events.length = 0;
        world.creatures.length = 0;
        world.player = null;

        var pad = 40;

        for (var i = 0; i < W.planktonCount; i++) {
            world.food.push({
                type: "plankton",
                x: rng() * size, y: rng() * size,
                r: 2.5, value: W.planktonValue,
                ttl: Infinity, phase: rng() * 6.283,
            });
        }

        for (i = 0; i < W.krillCount; i++) {
            world.food.push({
                type: "krill",
                x: pad + rng() * (size - pad * 2), y: pad + rng() * (size - pad * 2),
                r: 5, value: W.krillValue,
                ttl: Infinity, phase: rng() * 6.283,
                vx: 0, vy: 0, heading: rng() * 6.283, respawn: 0,
            });
        }

        for (i = 0; i < W.wreckCount; i++) {
            var w = L.rand(24, 96);
            var h = L.rand(20, 58);
            world.wrecks.push({
                x: pad + rng() * (size - pad * 2),
                y: pad + rng() * (size - pad * 2),
                hw: w / 2, hh: h / 2,
                rot: rng() * 6.283,
                detail: rng(),
                barnacles: 2 + ((rng() * 5) | 0),
            });
        }

        for (i = 0; i < W.jellyCount; i++) {
            world.jellies.push({
                x: pad + rng() * (size - pad * 2),
                y: pad + rng() * (size - pad * 2),
                vx: 0, vy: 0,
                r: 18, phase: rng() * 6.283,
                heading: rng() * 6.283,
            });
        }

        world.cGrid = new Grid(size, 120);
        world.foodGrid = new Grid(size, 110);
        world.wreckGrid = new Grid(size, 200);
        for (i = 0; i < world.wrecks.length; i++) {
            var wk = world.wrecks[i];
            world.wreckGrid.insertSpanned(wk.x, wk.y, wreckRadius(wk) + 60, wk);
        }

        /* Anglers must exist from frame zero, not on the first step. */
        fillAnglers();
    }

    function spawnAngler() {
        var spot = findSpawn(260, 220);
        var a = {
            x: spot.x, y: spot.y,
            angle: rng() * 6.283,
            mass: W.anglerMass,
            radius: bodyRadius(W.anglerMass),
            bodyLen: bodyLength(W.anglerMass),
            glow: 300,
            pts: [], trail: [],
            state: "lurk", timer: L.rand(0, 2),
            lureX: spot.x, lureY: spot.y, lureOn: true, lureR: 60,
            target: null,
            respawn: 0,
            wander: rng() * 6.283,
            maxPts: Math.max(2, Math.floor(bodyLength(W.anglerMass) / B.spacing)),
            _stamp: 0,
        };
        a.headX = a.x;
        a.headY = a.y;
        seedBody(a, a.bodyLen);
        world.anglers.push(a);
        return a;
    }

    function fillAnglers() {
        while (world.anglers.length < W.anglerCount) {
            spawnAngler();
        }
    }

    function addPlayer(name, color) {
        var size = world.size;
        /* Start dead centre when it is clear, so every run begins in the same
         * fair spot; otherwise take any clear water. */
        var spot = isClearSpawn(size / 2, size / 2, 260)
            ? { x: size / 2, y: size / 2 }
            : findSpawn(260, 300);
        var p = createCreature({
            id: "player",
            name: name,
            isPlayer: true,
            x: spot.x, y: spot.y,
            angle: -Math.PI / 2,
            mass: C.player.startMass,
            color: color || "#4ff5ff",
        });
        world.player = p;
        world.creatures.push(p);
        return p;
    }

    function addBot(identity, mass) {
        var spot = findSpawn(210, 240);
        var b = createCreature({
            id: identity.id,
            botId: identity.id,
            name: identity.name,
            clanId: identity.clan,
            color: identity.color,
            x: spot.x,
            y: spot.y,
            angle: Math.random() * 6.283,
            mass: mass,
        });
        b.personality = identity.personality;
        b.ai = {
            mode: "forage",
            targetPointX: b.headX,
            targetPointY: b.headY,
            targetCreature: null,
            foodTarget: null,
            thinkIn: Math.random() * 0.1,
            respawnIn: 0,
            jitterSeed: Math.random() * 100,
            lastKill: 0,
        };
        world.creatures.push(b);
        return b;
    }

    function removeBot(bot) {
        var i = world.creatures.indexOf(bot);
        if (i >= 0) world.creatures.splice(i, 1);
    }

    /* ===== Movement ===== */
    function stepCreature(c, dt, world2) {
        var pad = W.borderPad;
        var size = world2.size;

        if (c.stun > 0) {
            c.stun -= dt;
            if (c.stun < 0) c.stun = 0;
            c.wantBoost = false;
        }

        /* Boost burns mass and leaves glowing motes for everyone else. */
        c.boosting = false;
        if (c.wantBoost && c.stun <= 0 && c.mass > C.player.minBoostMass) {
            c.boosting = true;
            addMass(c, -C.player.boostDrain * dt);
            if (Math.random() < dt * 14) {
                var tail = c.pts[Math.min(c.pts.length - 1, 12)] || c.pts[0];
                world2.food.push({
                    type: "meat",
                    x: tail.x, y: tail.y,
                    r: 3, value: 1.6, ttl: W.meatTTL, phase: Math.random() * 6.283,
                });
            }
        }

        var speed = c.boosting ? C.player.boostSpeed : C.player.baseSpeed;
        var turn = turnRateFor(c.mass);
        c.angle = L.lerpAngle(c.angle, c.targetAngle, Math.min(1, turn * dt));

        var cos = Math.cos(c.angle);
        var sin = Math.sin(c.angle);
        var nx = c.headX + cos * speed * dt;
        var ny = c.headY + sin * speed * dt;

        /* Soft wall: you are pushed back, not killed. */
        c.atEdge = false;
        if (nx < pad) { nx = pad; c.atEdge = true; }
        if (nx > size - pad) { nx = size - pad; c.atEdge = true; }
        if (ny < pad) { ny = pad; c.atEdge = true; }
        if (ny > size - pad) { ny = size - pad; c.atEdge = true; }

        c.vx = dt > 0 ? (nx - c.headX) / dt : c.vx;
        c.vy = dt > 0 ? (ny - c.headY) / dt : c.vy;
        c.headX = nx;
        c.headY = ny;

        rebuildBody(c);

        /* Above a threshold you slowly shrink, so the leaderboard always
         * churns and a comeback stays possible. */
        if (c.mass > C.player.decayAbove) {
            c.mass -= c.mass * C.player.decayRate * dt;
            refreshBody(c);
        }
    }

    function stepAngler(a, dt) {
        a.timer -= dt;
        a.wander += dt * 0.6;
        var speed = 0;
        var desired = a.angle + L.wanderAngle(world.time, a.wander) * dt * 2.2;

        if (a.state === "lurk") {
            speed = 46;
            a.lureR = 70;
            a.lureOn = true;
            var prey = null;
            for (var i = 0; i < world.creatures.length; i++) {
                var c = world.creatures[i];
                if (!c.alive) continue;
                if (L.dist2(c.headX, c.headY, a.x, a.y) < 340 * 340) { prey = c; break; }
            }
            if (prey) { a.state = "stalk"; a.timer = L.rand(1.5, 3.5); a.target = prey; }
        } else if (a.state === "stalk") {
            speed = 78;
            a.lureR = 150;
            a.lureOn = true;
            var t = a.target;
            if (!t || !t.alive) {
                a.state = "lurk"; a.target = null; a.timer = L.rand(1, 2);
            } else {
                desired = Math.atan2(t.headY - a.y, t.headX - a.x);
                if (L.dist2(t.headX, t.headY, a.x, a.y) < 250 * 250) {
                    /* Windup before the lunge. Without it the dash is
                     * unavoidable at close range, which is just unfair. */
                    a.state = "windup"; a.timer = 0.55;
                }
            }
        } else if (a.state === "windup") {
            /* The lure flares and the body goes still: a tell. */
            speed = 18;
            a.lureR = 215;
            a.lureOn = true;
            if (a.target && a.target.alive) {
                desired = Math.atan2(a.target.headY - a.y, a.target.headX - a.x);
            } else {
                a.state = "lurk"; a.target = null; a.timer = L.rand(1, 2);
            }
            if (a.timer <= 0) { a.state = "lunge"; a.timer = 1.0; }
        } else if (a.state === "lunge") {
            speed = 330;
            a.lureR = 90;
            if (a.target && a.target.alive) {
                desired = Math.atan2(a.target.headY - a.y, a.target.headX - a.x);
            }
            if (a.timer <= 0) { a.state = "recover"; a.timer = 3.2; }
        } else {
            /* Lying stunned with the lure out: this is your one chance. */
            speed = 22;
            a.lureOn = false;
            a.lureR = 50;
            if (a.timer <= 0) { a.state = "lurk"; a.target = null; a.timer = L.rand(1, 2); }
        }

        a.angle = L.lerpAngle(a.angle, desired, Math.min(1, 2.2 * dt));
        var pad = 220;
        var nx = a.x + Math.cos(a.angle) * speed * dt;
        var ny = a.y + Math.sin(a.angle) * speed * dt;
        if (nx < pad) { nx = pad; a.angle = -Math.PI / 2; }
        if (nx > world.size - pad) { nx = world.size - pad; a.angle = Math.PI / 2; }
        if (ny < pad) { ny = pad; a.angle = 0; }
        if (ny > world.size - pad) { ny = world.size - pad; a.angle = Math.PI; }

        a.headX = a.x = nx;
        a.headY = a.y = ny;
        rebuildBody(a);
        a.lureX = a.x + Math.cos(a.angle) * (a.radius + 130);
        a.lureY = a.y + Math.sin(a.angle) * (a.radius + 130);
    }

    /* ===== Death and the mass economy ===== */
    function burst(x, y, color, count, speed, size) {
        for (var i = 0; i < count; i++) {
            var a = Math.random() * 6.283;
            var s = L.rand(speed * 0.3, speed);
            world.particles.push({
                x: x, y: y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: L.rand(0.35, 0.9), maxLife: 0.9,
                r: L.rand(size * 0.5, size),
                color: color,
            });
        }
    }

    function scatterMeat(list, x, y, spread, total, radius, tint) {
        var count = L.clamp(Math.round(total / 8), W.meatMin, W.meatMax);
        var per = total / count;
        for (var i = 0; i < count; i++) {
            var a = (i / count) * 6.283 + Math.random() * 0.6;
            var d = L.rand(0, spread);
            list.push({
                type: "meat",
                x: L.clamp(x + Math.cos(a) * d, 12, world.size - 12),
                y: L.clamp(y + Math.sin(a) * d, 12, world.size - 12),
                r: radius,
                value: per,
                ttl: W.meatTTL,
                phase: Math.random() * 6.283,
                color: tint,
            });
        }
    }

    function killCreature(victim, killer) {
        if (!victim.alive) return;
        victim.alive = false;
        victim.aliveAt = world.time;

        burst(victim.headX, victim.headY, victim.color, 26, 190, 5);
        if (killer && killer.alive) {
            addMass(killer, victim.mass * W.killFraction);
            killer.kills++;
            if (killer.isPlayer) world.anglerKills = killer.kills;
            world.events.push({
                type: "kill", x: victim.headX, y: victim.headY,
                killer: killer, victim: victim,
            });
        }

        /* Corpses are worth less than live prey so camping never pays. */
        var total = victim.mass * W.corpseFraction;
        var n = victim.pts.length;
        var count = L.clamp(Math.round(total / 8), W.meatMin, W.meatMax);
        var per = total / count;
        for (var i = 0; i < count; i++) {
            var idx = Math.min(n - 1, Math.floor((i / count) * n));
            var p = victim.pts[idx];
            var a = (i / count) * 6.283;
            var d = L.rand(2, 13);
            world.food.push({
                type: "meat",
                x: L.clamp(p.x + Math.cos(a) * d, 12, world.size - 12),
                y: L.clamp(p.y + Math.sin(a) * d, 12, world.size - 12),
                r: 4.5,
                value: per,
                ttl: W.meatTTL,
                phase: Math.random() * 6.283,
                color: victim.color,
            });
        }

        world.events.push({
            type: "death", x: victim.headX, y: victim.headY,
            victim: victim, killer: killer,
        });

        if (victim.isPlayer) {
            world.events.push({ type: "playerDeath", victim: victim, killer: killer });
        }
    }

    function killAngler(a, killer) {
        var i = world.anglers.indexOf(a);
        if (i >= 0) world.anglers.splice(i, 1);
        burst(a.x, a.y, L.COLORS.angler, 60, 300, 8);
        burst(a.lureX, a.lureY, L.COLORS.lure, 24, 220, 6);
        scatterMeat(world.food, a.x, a.y, 90, W.anglerMass * 0.5, 7, L.COLORS.angler);
        if (killer && killer.isPlayer) {
            world.events.push({ type: "anglerKill", x: a.x, y: a.y, killer: killer });
        }
        world.events.push({ type: "anglerDeath", x: a.x, y: a.y });
    }

    /* ===== Grids ===== */
    function rebuildGrids() {
        world.cGrid.clear();
        world.foodGrid.clear();
        var i, c, k, p;
        for (i = 0; i < world.creatures.length; i++) {
            c = world.creatures[i];
            if (!c.alive) continue;
            for (k = 0; k < c.pts.length; k++) {
                p = c.pts[k];
                world.cGrid.insert(p.x, p.y, c);
            }
        }
        for (i = 0; i < world.food.length; i++) {
            p = world.food[i];
            world.foodGrid.insert(p.x, p.y, p);
        }
    }

    /* ===== Collisions ===== */
    function wreckBlocks(wk, x, y, pad) {
        var dx = x - wk.x, dy = y - wk.y;
        var c = Math.cos(-wk.rot), s = Math.sin(-wk.rot);
        var lx = dx * c - dy * s;
        var ly = dx * s + dy * c;
        return Math.abs(lx) <= wk.hw + pad && Math.abs(ly) <= wk.hh + pad;
    }

    function wreckRadius(wk) { return Math.sqrt(wk.hw * wk.hw + wk.hh * wk.hh); }

    /* A spawn point has to be genuinely clear of wrecks, rivals AND anglers,
     * otherwise creatures materialise inside something lethal and die on their
     * very first frame. */
    function isClearSpawn(x, y, clear) {
        var out = world.scratch;
        world.wreckGrid.query(x, y, clear + 130, out);
        for (var i = 0; i < out.length; i++) {
            if (wreckBlocks(out[i], x, y, clear)) return false;
        }
        var r2 = clear * clear;
        for (var j = 0; j < world.creatures.length; j++) {
            var c = world.creatures[j];
            if (!c.alive) continue;
            if (L.dist2(x, y, c.headX, c.headY) < r2) return false;
        }
        /* Anglers carry a 400px body and a lure further out again. */
        for (var a = 0; a < world.anglers.length; a++) {
            var an = world.anglers[a];
            var ar = clear + an.radius + 260;
            if (L.dist2(x, y, an.headX, an.headY) < ar * ar) return false;
        }
        return true;
    }

    /* Clearance padding rejects a large slice of the map, so a strict search
     * alone would dump late arrivals on a single fallback point. Relax on the
     * second pass, and never share a point as a last resort. */
    function findSpawn(clear, pad) {
        var size = world.size;
        var span = size - pad * 2;
        for (var attempt = 0; attempt < 2; attempt++) {
            var want = attempt === 0 ? clear : clear * 0.45;
            for (var tries = 0; tries < 48; tries++) {
                var x = pad + rng() * span;
                var y = pad + rng() * span;
                if (isClearSpawn(x, y, want)) return { x: x, y: y };
            }
        }
        return { x: pad + rng() * span, y: pad + rng() * span };
    }

    function resolveCollisions(dt) {
        var out = world.scratch;
        var i, j, c, o, k, p, r2;

        /* Heads into other bodies: that head dies. */
        for (i = 0; i < world.creatures.length; i++) {
            c = world.creatures[i];
            if (!c.alive) continue;

            var headR = c.radius * 0.85;
            world.cGrid.query(c.headX, c.headY, headR + B.radMax, out);

            for (j = 0; j < out.length; j++) {
                o = out[j];
                if (o === c || !o.alive) continue;
                var reach = headR + o.bodyHitR;
                r2 = reach * reach;

                for (k = 1; k < o.pts.length; k++) {
                    p = o.pts[k];
                    if (Math.abs(p.x - c.headX) > reach) continue;
                    if (Math.abs(p.y - c.headY) > reach) continue;
                    if (L.dist2(c.headX, c.headY, p.x, p.y) < r2) {
                        killCreature(c, o);
                        break;
                    }
                }
                if (!c.alive) break;
            }
        }

        /* Wrecks. */
        for (i = 0; i < world.creatures.length; i++) {
            c = world.creatures[i];
            if (!c.alive) continue;
            world.wreckGrid.query(c.headX, c.headY, 140, out);
            for (j = 0; j < out.length; j++) {
                if (wreckBlocks(out[j], c.headX, c.headY, c.radius * 0.7)) {
                    world.events.push({ type: "wreck", x: c.headX, y: c.headY, victim: c });
                    killCreature(c, null);
                    break;
                }
            }
        }

        /* Jellyfish stun. */
        for (i = 0; i < world.creatures.length; i++) {
            c = world.creatures[i];
            if (!c.alive || c.stun > 0) continue;
            for (j = 0; j < world.jellies.length; j++) {
                var jy = world.jellies[j];
                var jr = jy.r + c.radius * 0.7;
                if (L.dist2(c.headX, c.headY, jy.x, jy.y) < jr * jr) {
                    c.stun = W.jellyStun;
                    burst(jy.x, jy.y, L.COLORS.jelly, 16, 130, 4);
                    world.events.push({ type: "stun", x: jy.x, y: jy.y, victim: c });
                }
            }
        }

        /* Anglerfish: lethal body, and a lure you can spear while boosting. */
        for (i = 0; i < world.anglers.length; i++) {
            var a = world.anglers[i];
            for (j = 0; j < world.creatures.length; j++) {
                c = world.creatures[j];
                if (!c.alive) continue;

                var killable = c.boosting && !a.lureOn;
                var lureR = 46 + c.radius * 0.6;
                if (killable && L.dist2(c.headX, c.headY, a.lureX, a.lureY) < lureR * lureR) {
                    killAngler(a, c);
                    break;
                }

                var reach = c.radius * 0.85 + a.radius * 0.62;
                for (k = 0; k < a.pts.length; k++) {
                    p = a.pts[k];
                    if (Math.abs(p.x - c.headX) > reach) continue;
                    if (Math.abs(p.y - c.headY) > reach) continue;
                    if (L.dist2(c.headX, c.headY, p.x, p.y) < reach * reach) {
                        world.events.push({ type: "anglerContact", x: c.headX, y: c.headY, victim: c });
                        killCreature(c, null);
                        break;
                    }
                }
                if (!c.alive) break;
            }
        }

        /* Food. */
        for (i = 0; i < world.creatures.length; i++) {
            c = world.creatures[i];
            if (!c.alive) continue;
            var eatR = c.radius + 9;
            world.foodGrid.query(c.headX, c.headY, eatR, out);
            for (j = 0; j < out.length; j++) {
                p = out[j];
                var fr = eatR + p.r;
                if (L.dist2(c.headX, c.headY, p.x, p.y) < fr * fr) {
                    addMass(c, p.value);
                    p.ttl = -1;
                    if (p.type !== "plankton" || Math.random() < 0.3) {
                        world.events.push({ type: "eat", x: p.x, y: p.y, value: p.value, color: p.color, creature: c });
                    }
                }
            }
        }
    }

    /* ===== Food and hazards ===== */
    function stepFood(dt) {
        var list = world.food;
        var size = world.size;
        for (var i = list.length - 1; i >= 0; i--) {
            var f = list[i];

            if (f.ttl !== Infinity) {
                f.ttl -= dt;
                if (f.ttl <= 0) { list.splice(i, 1); continue; }
            }

            if (f.type === "krill") {
                f.heading += L.wanderAngle(world.time, f.phase) * dt * 0.5;
                f.x += Math.cos(f.heading) * W.krillSpeed * dt;
                f.y += Math.sin(f.heading) * W.krillSpeed * dt;
                if (f.x < 40) { f.x = 40; f.heading = Math.PI; }
                if (f.x > size - 40) { f.x = size - 40; f.heading = 0; }
                if (f.y < 40) { f.y = 40; f.heading = -Math.PI / 2; }
                if (f.y > size - 40) { f.y = size - 40; f.heading = Math.PI / 2; }
            }
        }
    }

    function stepJellies(dt) {
        var size = world.size;
        for (var i = 0; i < world.jellies.length; i++) {
            var j = world.jellies[i];
            j.heading += L.wanderAngle(world.time * 0.6, j.phase) * dt * 0.8;
            j.x += Math.cos(j.heading) * W.jellySpeed * dt;
            j.y += Math.sin(j.heading) * W.jellySpeed * dt;
            if (j.x < 60) { j.x = 60; j.heading = 0; }
            if (j.x > size - 60) { j.x = size - 60; j.heading = Math.PI; }
            if (j.y < 60) { j.y = 60; j.heading = -Math.PI / 2; }
            if (j.y > size - 60) { j.y = size - 60; j.heading = Math.PI / 2; }
        }
    }

    function stepParticles(dt) {
        var list = world.particles;
        for (var i = list.length - 1; i >= 0; i--) {
            var p = list[i];
            p.life -= dt;
            if (p.life <= 0) { list.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
        }
    }

    /* ===== Ranking ===== */
    function updateRanks() {
        var list = world.creatures;
        var alive = [];
        for (var i = 0; i < list.length; i++) if (list[i].alive) alive.push(list[i]);
        alive.sort(function (a, b) { return b.mass - a.mass; });
        world.leaderMass = alive.length ? alive[0].mass : 0;
        world.aliveCount = alive.length;

        var playerRank = world.aliveCount || 1;
        for (i = 0; i < alive.length; i++) {
            alive[i].rank = i + 1;
            if (alive[i].isPlayer) playerRank = i + 1;
        }
        world.rank = playerRank;

        /* Rubber-band stragglers so the leaderboard stays contestable. */
        var floor = world.leaderMass * C.bots.rubberBandFloor;
        for (i = 0; i < alive.length; i++) {
            var c = alive[i];
            if (c.isPlayer || c.mass >= floor) continue;
            addMass(c, (floor - c.mass) * 0.35 * 0.1);
        }
    }

    /* ===== Frame ===== */
    function step(dt) {
        world.time += dt;

        var list = world.creatures;
        for (var i = list.length - 1; i >= 0; i--) {
            var c = list[i];
            /* Dead creatures are reaped by the bot layer. The player's body
             * stays frozen so the death screen has something to spectate. */
            if (!c.alive) continue;
            stepCreature(c, dt, world);
        }

        for (i = 0; i < world.anglers.length; i++) stepAngler(world.anglers[i], dt);
        fillAnglers();

        stepFood(dt);
        stepJellies(dt);
        stepParticles(dt);

        rebuildGrids();
        resolveCollisions(dt);
    }

    L.World = {
        world: world,
        generate: generate,
        spawnAngler: spawnAngler,
        addPlayer: addPlayer,
        addBot: addBot,
        removeBot: removeBot,
        step: step,
        updateRanks: updateRanks,
        refreshBody: refreshBody,
        addMass: addMass,
        bodyLength: bodyLength,
        bodyRadius: bodyRadius,
        glowFor: glowFor,
        turnRateFor: turnRateFor,
        zoomFor: zoomFor,
        rebuildBody: rebuildBody,
        seedBody: seedBody,
        wreckBlocks: wreckBlocks,
        burst: burst,
        Grid: Grid,
        reset: function () {
            world.time = 0;
            world.creatures.length = 0;
            world.food.length = 0;
            world.particles.length = 0;
            world.events.length = 0;
            world.player = null;
            world.rank = 1;
            world.aliveCount = 0;
            world.leaderMass = 0;
        },
    };

})(window.LUMEN = window.LUMEN || {});
