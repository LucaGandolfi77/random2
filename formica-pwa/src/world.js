/*
 * FORMICA - il tavolo. Generazione, griglia dei feromoni, colonie, briciole,
 * pericoli e razzie notturne.
 *
 * Il mondo è una griglia di celle feromone (owner + forza) sopra la quale
 * camminano le colonie. Camminare dipinge; il territorio decade se non lo
 * mantieni; dipingere sopra una cella nemica la ruba. Le colonie sono code di
 * formiche ricampionate ad arco fisso, così costano uguale su telefono e
 * desktop.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var W = C.world;
    var T = C.territory;
    var H = C.hazard;
    var N = C.nest;
    var R = C.raid;
    var F = C.food;

    var GW = Math.ceil(W.w / W.cell);
    var GH = Math.ceil(W.h / W.cell);
    var TOTAL_CELLS = GW * GH;

    /* ===== Griglia feromoni =====
     * owner: 0 neutro, altrimenti colony.slot (1 = giocatore, 2.. n bot).
     * strength: quanto feromone c'è nella cella (1 = posseduta).
     */
    var owner = new Int16Array(TOTAL_CELLS);
    var strength = new Float32Array(TOTAL_CELLS);

    function ownerAt(x, y) {
        var cx = (x / W.cell) | 0, cy = (y / W.cell) | 0;
        if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return -1;
        return owner[cy * GW + cx];
    }

    function strengthAt(x, y) {
        var cx = (x / W.cell) | 0, cy = (y / W.cell) | 0;
        if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return 0;
        return strength[cy * GW + cx];
    }

    /* Dipinge una cella. Restituisce true se ha rubato territorio altrui. */
    function paintCell(colony, cx, cy) {
        if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return false;
        var i = cy * GW + cx;
        var o = owner[i];
        var stole = false;

        if (o === 0) {
            /* il neutro si conquista subito */
            strength[i] = T.paintGain;
            owner[i] = colony.slot;
        } else if (o === colony.slot) {
            /* la propria si mantiene (cap sotto 1.4 per non esplodere) */
            if (strength[i] < 1.4) strength[i] = Math.min(1.4, strength[i] + T.paintGain);
        } else {
            /* rubare è più lento che dipingere sul neutro */
            strength[i] -= T.paintGain * 0.5;
            if (strength[i] <= 0.35) {
                strength[i] = T.paintGain * 0.55;
                owner[i] = colony.slot;
                stole = true;
            }
        }
        return stole;
    }

    function eraseAt(x, y, r) {
        var cx0 = Math.max(0, ((x - r) / W.cell) | 0);
        var cx1 = Math.min(GW - 1, ((x + r) / W.cell) | 0);
        var cy0 = Math.max(0, ((y - r) / W.cell) | 0);
        var cy1 = Math.min(GH - 1, ((y + r) / W.cell) | 0);
        var r2 = r * r;
        for (var cy = cy0; cy <= cy1; cy++) {
            var row = cy * GW;
            var py = cy * W.cell + W.cell / 2;
            for (var cx = cx0; cx <= cx1; cx++) {
                var px = cx * W.cell + W.cell / 2;
                if (L.dist2(px, py, x, y) <= r2) {
                    owner[row + cx] = 0;
                    strength[row + cx] = 0;
                }
            }
        }
    }

    /* Decadimento: il neutro resta neutro; il proprio cala piano; il nemico
     * confinante cala più in fretta. Un abbandonato si riprende il tavolo. */
    var decayAcc = 0;
    function decayGrid(dt) {
        decayAcc += dt;
        if (decayAcc < 0.3) return;
        var times = decayAcc / 0.3;
        decayAcc = 0;
        var step = T.decay * times * 0.3;
        var enemyStep = (T.decay + T.enemyDecay) * times * 0.3;
        for (var i = 0; i < TOTAL_CELLS; i++) {
            var s = strength[i];
            if (s <= 0) continue;
            var o = owner[i];
            var total = step;
            /* confini: cella con vicini di owner diverso */
            if (hasEnemyNeighbor(i, o)) total += enemyStep;
            s -= total;
            if (s <= 0) { owner[i] = 0; strength[i] = 0; }
            else strength[i] = s;
        }
    }

    function hasEnemyNeighbor(i, o) {
        var cx = i % GW, cy = (i / GW) | 0;
        for (var dy = -1; dy <= 1; dy++) {
            var yy = cy + dy;
            if (yy < 0 || yy >= GH) continue;
            for (var dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                var xx = cx + dx;
                if (xx < 0 || xx >= GW) continue;
                var j = yy * GW + xx;
                var oj = owner[j];
                if (oj !== 0 && oj !== o) return true;
            }
        }
        return false;
    }

    /* Conteggio del territorio. Gira ogni mezzo secondo: la classifica non
     * ha bisogno di 60fps. */
    var countAcc = 0;
    function countTerritory() {
        for (var i = 0; i < world.colonies.length; i++) {
            world.colonies[i].territory = 0;
        }
        for (var j = 0; j < TOTAL_CELLS; j++) {
            var o = owner[j];
            if (o === 0) continue;
            var s = strength[j];
            if (s < T.owned) continue;
            var col = world.bySlot[o];
            if (col) col.territory++;
        }
    }

    /* ===== Griglia spaziale per le colonie (testa delle code) ===== */
    function makeGrid(sizeX, sizeY, cell) {
        this.nx = Math.ceil(sizeX / cell) + 1;
        this.ny = Math.ceil(sizeY / cell) + 1;
        this.cell = cell;
        this.buckets = new Array(this.nx * this.ny);
        for (var i = 0; i < this.buckets.length; i++) this.buckets[i] = [];
    }
    makeGrid.prototype.clear = function () {
        for (var i = 0; i < this.buckets.length; i++) this.buckets[i].length = 0;
    };
    makeGrid.prototype.insert = function (x, y, item) {
        var cx = (x / this.cell) | 0, cy = (y / this.cell) | 0;
        if (cx < 0 || cy < 0 || cx >= this.nx || cy >= this.ny) return;
        this.buckets[cy * this.nx + cx].push(item);
    };
    var queryStamp = 1;
    makeGrid.prototype.query = function (x, y, r, out) {
        out.length = 0;
        var c0x = Math.max(0, ((x - r) / this.cell) | 0);
        var c1x = Math.min(this.nx - 1, ((x + r) / this.cell) | 0);
        var c0y = Math.max(0, ((y - r) / this.cell) | 0);
        var c1y = Math.min(this.ny - 1, ((y + r) / this.cell) | 0);
        var stamp = ++queryStamp;
        for (var cy = c0y; cy <= c1y; cy++) {
            var row = cy * this.nx;
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

    /* ===== Corpo ===== */
    function bodyLength(colony) {
        return Math.min(C.colony.lenMax, C.colony.lenBase + colony.workers * C.colony.lenPerWorker);
    }

    function workerRadius(colony) {
        return C.colony.workerRadius * (1 + Math.min(0.8, colony.workers * 0.05));
    }

    function visualAnts(colony) {
        return Math.max(3, Math.min(14, 3 + colony.workers));
    }

    function turnRateFor(workers) {
        var t = L.clamp(workers / C.player.workersForTurnCap, 0, 1);
        return L.lerp(C.player.turnFast, C.player.turnSlow, t);
    }

    function speedFor(colony) {
        return C.player.baseSpeed + Math.min(C.colony.maxSpeedBonus,
            (colony.workers - 1) * C.colony.speedPerWorker);
    }

    /* Zoom via man mano che la colonia cresce. */
    function zoomFor(colony) {
        var t = L.clamp((colony.workers - 2) / (C.colony.maxWorkers - 2), 0, 1);
        return L.lerp(C.camera.zoomAtMin, C.camera.zoomAtMax, t);
    }

    /* Rispazia la coda lungo il percorso ad arco fisso. */
    function rebuildBody(colony) {
        var trail = colony.trail;
        trail.unshift({ x: colony.x, y: colony.y });
        var maxTrail = Math.ceil(bodyLength(colony) / C.colony.spacing) + 6;
        if (trail.length > maxTrail) trail.length = maxTrail;

        var pts = colony.pts;
        pts.length = 0;
        pts.push({ x: colony.x, y: colony.y });

        var spacing = C.colony.spacing;
        var acc = 0, i, a, b, dx, dy, segLen, consumed, f;

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
                if (pts.length >= visualAnts(colony)) break outer;
            }
            acc += segLen - consumed;
        }
    }

    /* Distende la coda dietro la testa allo spawn. */
    function seedBody(colony, len) {
        var spacing = C.colony.spacing;
        var n = Math.max(2, Math.floor(len / spacing));
        colony.trail.length = 0;
        colony.pts.length = 0;
        for (var i = 0; i < n; i++) {
            var p = {
                x: colony.x - Math.cos(colony.angle) * spacing * i,
                y: colony.y - Math.sin(colony.angle) * spacing * i,
            };
            colony.trail.push(p);
            colony.pts.push(p);
        }
        if (!colony.pts.length) colony.pts.push({ x: colony.x, y: colony.y });
        if (!colony.trail.length) colony.trail.push({ x: colony.x, y: colony.y });
    }

    /* ===== Creazione colonia ===== */
    function createColony(opts) {
        var col = {
            slot: opts.slot,
            id: opts.id,
            name: opts.name,
            color: opts.color,
            isPlayer: !!opts.isPlayer,
            botId: opts.botId || null,
            personality: opts.parents,
            grudge: 0,

            x: opts.x, y: opts.y,
            angle: opts.angle || 0,
            targetAngle: opts.angle || 0,
            vx: 0, vy: 0,

            boosting: false,
            workers: opts.workers,
            /* Contabilità: le formiche si guadagnano con le briciole
             * depositate (earned) e si perdono con i pericoli (losses). Sono
             * due conti separati così una goccia non viene "guarita" dal
             * primo deposito. */
            baseWorkers: opts.workers,
            earned: 0,
            losses: 0,
            crumbs: C.colony.startCrumbs,
            trail: [],
            pts: [],
            radius: C.colony.workerRadius,

            nestX: opts.nestX, nestY: opts.nestY,
            nestHp: N.hp,

            carrying: null,
            paintTimer: 0,
            clashCd: 0,
            boost: 0,

            alive: true,
            kills: 0,
            territory: 0,
            spawnedAt: 0,
            rank: 0,

            ai: null,
            stats: { raidsBeaten: 0, annexed: 0 },
            _stamp: 0,
        };
        rebuildBody(col);
        seedBody(col, bodyLength(col));
        return col;
    }

    /* ===== Mondo ===== */
    var world = {
        w: W.w, h: W.h, gw: GW, gh: GH, cell: W.cell,
        rng: null,
        time: 0,
        phase: 0.08,          /* posizione nel ciclo giorno/notte, 0..1 */
        night: 0,
        colonies: [],
        bySlot: [],
        player: null,
        crumbs: [],
        drops: [],
        inks: [],
        pebbles: [],
        raids: [],
        particles: [],
        events: [],
        grid: null,
        scratch: [],
        rank: 1,
        leaderTerritory: 0,
    };

    var rng = Math.random;

    /* ===== Generazione ===== */
    function generate(seed) {
        rng = L.mulberry32(seed);

        owner.fill(0);
        strength.fill(0);

        world.colonies.length = 0;
        world.bySlot.length = 0;
        world.player = null;
        world.crumbs.length = 0;
        world.drops.length = 0;
        world.inks.length = 0;
        world.pebbles.length = 0;
        world.raids.length = 0;
        world.particles.length = 0;
        world.events.length = 0;
        world.time = 0;
        world.phase = 0.08;
        world.rank = 1;

        for (var i = 0; i < H.inkCount; i++) {
            var p = L.Zones.pickZoneXY("ink", W.w, W.h, rng, 200);
            world.inks.push({
                x: p.x, y: p.y,
                r: H.inkR * L.rand(0.75, 1.3),
                wobble: rng() * 6.283,
            });
        }

        for (i = 0; i < H.pebbleCount; i++) {
            var q = L.Zones.pickZoneXY("pebbles", W.w, W.h, rng, 160);
            world.pebbles.push({
                x: q.x, y: q.y,
                r: H.pebbleR * L.rand(0.7, 1.35),
                shade: rng(),
            });
        }

        for (i = 0; i < 18; i++) {
            var d = L.Zones.pickZoneXY("drops", W.w, W.h, rng, 160);
            world.drops.push({
                x: d.x, y: d.y,
                r: H.dropR * L.rand(0.8, 1.25),
                wobble: rng() * 6.283,
                respawn: 0,
            });
        }

        for (i = 0; i < F.crumbs; i++) spawnCrumb();
        for (i = 0; i < F.sugars; i++) spawnCrumb("sugar");
        for (i = 0; i < F.bugs; i++) spawnCrumb("bug");

        world.grid = new makeGrid(W.w, W.h, 140);

        /* Conta il territorio una volta, così la classifica è vera da subito. */
        countTerritory();
        rebuildGrids();
    }

    function spawnCrumb(type) {
        var key = type === "sugar" ? "sugars" : type === "bug" ? "bugs" : "crumbs";
        var p = L.Zones.pickZoneXY(key, W.w, W.h, rng, 60);
        var value = type === "sugar" ? F.sugarValue : type === "bug" ? F.bugValue : F.crumbValue;
        world.crumbs.push({
            type: type || "crumb",
            x: p.x, y: p.y,
            r: type === "bug" ? 11 : type === "sugar" ? 8 : 5.5,
            value: value,
            phase: rng() * 6.283,
            carriedBy: null,
            taken: false,
        });
    }

    /* I nidi hanno bisogno di spazio: trovare un punto libero da inchiostri,
     * gocce, altri nidi. Un nido nato dentro una pozza è una colonia morta. */
    function clearNestSpot(taken) {
        var pad = 320;
        for (var tries = 0; tries < 120; tries++) {
            var x = pad + rng() * (W.w - pad * 2);
            var y = pad + rng() * (W.h - pad * 2);
            if (!nestClear(x, y, taken)) continue;
            return { x: x, y: y };
        }
        return {
            x: pad + rng() * (W.w - pad * 2),
            y: pad + rng() * (W.h - pad * 2),
        };
    }

    function nestClear(x, y, taken) {
        var i, item;
        for (i = 0; i < world.inks.length; i++) {
            item = world.inks[i];
            if (L.dist2(x, y, item.x, item.y) < (item.r + 220) * (item.r + 220)) return false;
        }
        for (i = 0; i < world.drops.length; i++) {
            item = world.drops[i];
            if (L.dist2(x, y, item.x, item.y) < (item.r + 240) * (item.r + 240)) return false;
        }
        for (i = 0; i < taken.length; i++) {
            if (L.dist2(x, y, taken[i].x, taken[i].y) < 1100 * 1100) return false;
        }
        return true;
    }

    function stampBlob(colony, cells) {
        var cx0 = (colony.nestX / W.cell) | 0;
        var cy0 = (colony.nestY / W.cell) | 0;
        var half = Math.max(1, (cells - 1) >> 1);
        for (var cy = cy0 - half; cy <= cy0 + half; cy++) {
            if (cy < 0 || cy >= GH) continue;
            for (var cx = cx0 - half; cx <= cx0 + half; cx++) {
                if (cx < 0 || cx >= GW) continue;
                var i = cy * GW + cx;
                owner[i] = colony.slot;
                strength[i] = 1.2;
            }
        }
    }

    function addPlayer(name, color, workers) {
        var taken = [];
        for (var i = 0; i < world.colonies.length; i++) {
            taken.push({ x: world.colonies[i].nestX, y: world.colonies[i].nestY });
        }
        /* Il nido del giocatore parte dal centro esatto quando è libero:
         * ogni partita comincia dallo stesso punto equo. */
        var spot = (taken.length === 0 && nestClear(W.w / 2, W.h / 2, taken))
            ? { x: W.w / 2, y: W.h / 2 }
            : clearNestSpot(taken);
        var col = createColony({
            slot: 1,
            id: "player",
            name: name,
            isPlayer: true,
            color: color || L.COLORS.player,
            x: spot.x, y: spot.y,
            angle: -Math.PI / 2,
            workers: workers || C.player.startWorkers,
            nestX: spot.x, nestY: spot.y,
        });
        insertColony(col);
        stampBlob(col, 5);
        world.player = col;
        return col;
    }

    function addBot(identity, workers, slot) {
        var taken = [];
        for (var i = 0; i < world.colonies.length; i++) {
            taken.push({ x: world.colonies[i].nestX, y: world.colonies[i].nestY });
        }
        var spot = clearNestSpot(taken);
        var col = createColony({
            slot: slot,
            id: identity.id,
            botId: identity.id,
            name: identity.name,
            color: identity.color,
            parents: identity.personality,
            workers: workers,
            x: spot.x, y: spot.y,
            angle: Math.random() * 6.283,
            nestX: spot.x, nestY: spot.y,
        });
        insertColony(col);
        stampBlob(col, 5);
        col.ai = {
            mode: "espandi",
            targetPointX: spot.x, targetPointY: spot.y,
            crumbTarget: null,
            thinkIn: Math.random() * 0.12,
            modeHold: 0,
            jitterSeed: Math.random() * 100,
            raidTarget: null,
            expandBias: Math.random() * 6.283,
            boostUntil: 0,
            respawnIn: 0,
        };
        return col;
    }

    function insertColony(col) {
        world.colonies.push(col);
        while (world.bySlot.length <= col.slot) world.bySlot.push(null);
        world.bySlot[col.slot] = col;
    }

    function removeColony(col) {
        var i = world.colonies.indexOf(col);
        if (i >= 0) world.colonies.splice(i, 1);
        if (world.bySlot[col.slot] === col) world.bySlot[col.slot] = null;
        /* Le celle orfane decadono da sole verso il neutro. */
    }

    /* ===== Movimento ===== */
    function stepColony(col, dt) {
        var pad = 60;

        col.clashCd -= dt;
        if (col.clashCd < 0) col.clashCd = 0;

        /* Lo scatto brucia briciole: scappare ha sempre un prezzo. */
        col.boosting = false;
        if (col.boost > 0) {
            col.boost -= dt;
            if (col.boost < 0) col.boost = 0;
            col.boosting = true;
            col.crumbs -= C.player.boostDrain * dt;
            if (col.crumbs < 0) col.crumbs = 0;
        }

        var speed = speedFor(col) * (col.boosting ? 1.62 : 1);
        var turn = turnRateFor(col.workers);
        col.angle = L.lerpAngle(col.angle, col.targetAngle, Math.min(1, turn * dt));

        /* Sassi: ci metti di più a passarci sopra. */
        for (var i = 0; i < world.pebbles.length; i++) {
            var pb = world.pebbles[i];
            if (L.dist2(col.x, col.y, pb.x, pb.y) < pb.r * pb.r) {
                speed *= H.pebbleSlow;
                break;
            }
        }

        var nx = col.x + Math.cos(col.angle) * speed * dt;
        var ny = col.y + Math.sin(col.angle) * speed * dt;

        /* Muro morbido: respinge, non uccide. Il tavolo ha un bordo. */
        if (nx < pad) { nx = pad; col.targetAngle = 0; }
        if (nx > W.w - pad) { nx = W.w - pad; col.targetAngle = Math.PI; }
        if (ny < pad) { ny = pad; col.targetAngle = Math.PI / 2; }
        if (ny > W.h - pad) { ny = W.h - pad; col.targetAngle = -Math.PI / 2; }

        col.vx = dt > 0 ? (nx - col.x) / dt : 0;
        col.vy = dt > 0 ? (ny - col.y) / dt : 0;
        col.x = nx;
        col.y = ny;

        rebuildBody(col);

        /* Dipingere: la testa più le formiche in coda. */
        col.paintTimer -= dt;
        if (col.paintTimer <= 0) {
            col.paintTimer = T.paintInterval;
            var insideInk = false;
            for (i = 0; i < world.inks.length; i++) {
                var ink = world.inks[i];
                if (L.dist2(col.x, col.y, ink.x, ink.y) < ink.r * ink.r) {
                    insideInk = true;
                    break;
                }
            }
            if (!insideInk) {
                var upto = Math.min(col.pts.length, 2 + col.workers);
                for (i = 0; i < upto; i++) {
                    paintCell(col, (col.pts[i].x / W.cell) | 0, (col.pts[i].y / W.cell) | 0);
                }
            }
        }

        /* Trasporto della briciola: resta incollata alla testa. */
        if (col.carrying) {
            var c = col.carrying;
            c.x = col.x - Math.cos(col.angle) * (workerRadius(col) + c.r + 6);
            c.y = col.y - Math.sin(col.angle) * (workerRadius(col) + c.r + 6);
            if (L.dist2(col.x, col.y, col.nestX, col.nestY) < 100 * 100) {
                deposit(col, c);
            }
        }
    }

    /* Le formiche sono un conto, non una statica: la colonia cresce con le
     * briciole depositate e cala con le perdite. */
    function recomputeWorkers(col, world) {
        var want = Math.min(
            C.colony.maxWorkers,
            col.baseWorkers + Math.floor(col.earned / C.colony.workersPerCrumbs) - col.losses
        );
        if (want < 0) want = 0;
        if (want > col.workers) {
            col.workers = want;
            if (world) {
                world.events.push({ type: "workerUp", colony: col });
            }
        } else if (want < col.workers) {
            col.workers = want;
        }
        return col.workers;
    }

    function deposit(col, crumb) {
        crumb.carriedBy = null;
        crumb.taken = true;
        col.carrying = null;
        col.crumbs += crumb.value;
        col.earned += crumb.value;
        recomputeWorkers(col, world);
        world.events.push({
            type: "deposit", x: col.nestX, y: col.nestY,
            colony: col, value: crumb.value,
        });
    }

    /* ===== Pericoli ===== */
    function stepHazards(dt) {
        var i, col;

        /* Le gocce evaporano quando ci finisci dentro, e ricompaiono altrove:
         * il tavolo si ripulisce e il pericolo si sposta. respawn > 0 significa
         * "latente": la goccia non c'è finché non torna. */
        for (i = world.drops.length - 1; i >= 0; i--) {
            var d = world.drops[i];
            if (d.respawn > 0) {
                d.respawn -= dt;
                if (d.respawn <= 0) {
                    var spot = L.Zones.pickZoneXY("drops", W.w, W.h, rng, 160);
                    d.x = spot.x; d.y = spot.y; d.wobble = rng() * 6.283;
                }
                continue;
            }
        }

        for (i = 0; i < world.colonies.length; i++) {
            col = world.colonies[i];
            if (!col.alive) continue;

            /* Gocce: annegamento e cancellazione feromoni. */
            for (var j = world.drops.length - 1; j >= 0; j--) {
                var dr = world.drops[j];
                var rr = dr.r + workerRadius(col);
                if (L.dist2(col.x, col.y, dr.x, dr.y) < rr * rr) {
                    hurtColony(col, H.dropKill, "water", dr.x, dr.y);
                    eraseAt(dr.x, dr.y, H.dropErase);
                    dr.respawn = 3.5;
                    break;
                }
            }

            /* Inchiostro: letale e cancella i feromoni attorno a sé. */
            for (j = 0; j < world.inks.length; j++) {
                var ik = world.inks[j];
                rr = ik.r + workerRadius(col) * 0.6;
                if (L.dist2(col.x, col.y, ik.x, ik.y) < rr * rr) {
                    hurtColony(col, H.inkKill, "ink", ik.x, ik.y);
                    eraseAt(ik.x, ik.y, ik.r * 1.3);
                }
            }

            /* Raccogliere: la testa che tocca una briciola la prende. */
            if (!col.carrying) {
                for (j = world.crumbs.length - 1; j >= 0; j--) {
                    var cr = world.crumbs[j];
                    if (cr.taken) continue;
                    rr = cr.r + workerRadius(col) + 4;
                    if (L.dist2(col.x, col.y, cr.x, cr.y) < rr * rr) {
                        cr.taken = true;
                        cr.carriedBy = col;
                        col.carrying = cr;
                        world.events.push({
                            type: "pickup", x: cr.x, y: cr.y,
                            colony: col, value: cr.value,
                        });
                        break;
                    }
                }
            }
        }
    }

    function hurtColony(col, amount, cause, x, y) {
        if (!col.alive) return;
        var before = col.workers;
        col.losses += amount;
        burst(x, y, cause === "ink" ? L.COLORS.ink : L.COLORS.water, cause === "ink" ? 14 : 10, 150, 3.5);
        var left = recomputeWorkers(col, world);
        world.events.push({
            type: "colonyHurt", colony: col, lost: before - Math.max(1, left), cause: cause,
        });
        if (col.isPlayer && left > 0) {
            world.events.push({ type: "shake", colony: col });
        }
        if (left <= 0) killColony(col, null, cause);
    }

    function burst(x, y, color, count, speed, size) {
        for (var i = 0; i < count; i++) {
            var a = Math.random() * 6.283;
            var s = L.rand(speed * 0.3, speed);
            world.particles.push({
                x: x, y: y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: L.rand(0.3, 0.8), maxLife: 0.8,
                r: L.rand(size * 0.5, size),
                color: color,
            });
        }
    }

    /* ===== Scontri tra colonie =====
     * La colonia più grande vince lo scontro: l'altra perde una formica e
     * viene respinta. A parità, perdono entrambe. */
    function stepClashes() {
        var i, a, b;
        for (i = 0; i < world.colonies.length; i++) {
            a = world.colonies[i];
            if (!a.alive || a.clashCd > 0) continue;
            for (var j = i + 1; j < world.colonies.length; j++) {
                b = world.colonies[j];
                if (!b.alive || b.clashCd > 0) continue;
                var rr = workerRadius(a) + workerRadius(b) + 14;
                if (L.dist2(a.x, a.y, b.x, b.y) > rr * rr) continue;

                var diff = a.workers - b.workers;
                var loser = diff === 0 ? null : (diff > 0 ? b : a);
                var winner = loser === null ? null : (loser === a ? b : a);
                var sparkX = (a.x + b.x) / 2, sparkY = (a.y + b.y) / 2;

                if (loser) {
                    loser.losses += 1;
                    loser.clashCd = 0.5;
                    a.clashCd = 0.35;
                    b.clashCd = 0.35;
                    /* respingi lo sconfitto indietro, non lasciarci dentro */
                    var ang = Math.atan2(loser.y - (winner === a ? a.y : b.y),
                                         loser.x - (winner === a ? a.x : b.x));
                    loser.targetAngle = ang;
                    loser.angle = ang;
                    burst(sparkX, sparkY, loser.color, 8, 120, 3);
                    if (a.isPlayer || b.isPlayer) {
                        world.events.push({ type: "clash", x: sparkX, y: sparkY, loser: loser });
                    }
                    if (recomputeWorkers(loser, world) <= 0) killColony(loser, winner, "clash");
                } else {
                    a.losses += 1;
                    b.losses += 1;
                    a.clashCd = 0.5;
                    b.clashCd = 0.5;
                    burst(sparkX, sparkY, a.color, 6, 120, 3);
                    burst(sparkX, sparkY, b.color, 6, 120, 3);
                    if (a.isPlayer || b.isPlayer) {
                        world.events.push({ type: "clash", x: sparkX, y: sparkY, loser: null });
                    }
                    if (recomputeWorkers(a, world) <= 0) killColony(a, null, "clash");
                    if (recomputeWorkers(b, world) <= 0) killColony(b, null, "clash");
                }
            }
        }
    }

    /* La colonia muore quando l'ultima formica muore (o il nido cade).
     * Il suo territorio decade da solo, e il nido diventa un bottino. */
    function killColony(col, killer, cause) {
        if (!col.alive) return;
        col.alive = false;

        /* Muore con la briciola in bocca? La rilascia dove è caduta. */
        if (col.carrying) {
            col.carrying.carriedBy = null;
            col.carrying.taken = false;
            col.carrying = null;
        }

        burst(col.x, col.y, col.color, 20, 170, 4);
        burst(col.nestX, col.nestY, col.color, 26, 200, 5);

        /* Il nido distrutto lascia un bottino di briciole. */
        for (var i = 0; i < 5; i++) {
            var a = (i / 5) * 6.283;
            var d = L.rand(10, 55);
            world.crumbs.push({
                type: "bug",
                x: L.clamp(col.nestX + Math.cos(a) * d, 20, W.w - 20),
                y: L.clamp(col.nestY + Math.sin(a) * d, 20, W.h - 20),
                r: 9,
                value: F.bugValue,
                phase: Math.random() * 6.283,
                carriedBy: null,
                taken: false,
            });
        }

        /* Il territorio morente perde il proprietario: resta feromone da
         * rubare per un po', poi diventa neutro. */
        for (var j2 = 0; j2 < TOTAL_CELLS; j2++) {
            if (owner[j2] === col.slot) owner[j2] = 0;
        }

        world.events.push({
            type: "colonyDeath", x: col.nestX, y: col.nestY,
            colony: col, killer: killer, cause: cause,
        });

        if (killer && killer !== col) {
            killer.kills++;
            killer.crumbs += Math.round(col.crumbs * 0.5);
            killer.stats.annexed++;
            world.events.push({
                type: "annex", killer: killer, colony: col,
            });
        }
        if (col.isPlayer) {
            world.events.push({ type: "playerDeath", colony: col, killer: killer, cause: cause });
        }
        removeColony(col);
    }

    /* ===== Razzie =====
     * Le formiche d'assalto marciano lungo i feromoni del loro padrone verso
     * il nido bersaglio. Difendersi costa: le tue formiche devono essere lì.
     */
    function spawnRaid(raider, target) {
        if (!target || !target.alive || !raider.alive) return 0;
        var ants = R.antsPerColony;
        for (var i = 0; i < ants; i++) {
            var a = (i / ants) * 6.283 + Math.random();
            world.raids.push({
                x: raider.nestX + Math.cos(a) * 46,
                y: raider.nestY + Math.sin(a) * 46,
                angle: Math.random() * 6.283,
                hp: R.antHp,
                raider: raider,
                target: target,
                wobble: Math.random() * 6.283,
                cd: 0,
                reachCd: 0,
            });
        }
        world.events.push({ type: "raidLaunch", raider: raider, target: target });
        return ants;
    }

    function stepRaids(dt) {
        for (var i = world.raids.length - 1; i >= 0; i--) {
            var ant = world.raids[i];
            var target = ant.target;
            if (!target || !target.alive) {
                world.raids.splice(i, 1);
                continue;
            }

            ant.wobble += dt * 2.2;
            ant.cd -= dt;
            ant.reachCd -= dt;

            /* Direzione: dritto al nido, con un margine di errore. */
            var desired = Math.atan2(target.nestY - ant.y, target.nestX - ant.x);
            desired += Math.sin(ant.wobble) * 0.25 + L.wanderAngle(world.time * 0.6, ant.wobble) * 0.35;

            /* Fuori dal territorio del padrone rallentano e vagano di più:
             * i feromoni sono la loro rete stradale. */
            var myOwner = ownerAt(ant.x, ant.y);
            var onRoad = myOwner === ant.raider.slot && strengthAt(ant.x, ant.y) > 0.4;
            var speed = R.antSpeed * (onRoad ? 1 : R.offroadFactor);
            desired += onRoad ? 0 : Math.sin(ant.wobble * 1.7) * 0.5;

            ant.angle = L.lerpAngle(ant.angle, desired, Math.min(1, 3 * dt));
            ant.x += Math.cos(ant.angle) * speed * dt;
            ant.y += Math.sin(ant.angle) * speed * dt;

            /* Le formiche d'assalto annegano anche loro. */
            for (var j = 0; j < world.drops.length; j++) {
                var d = world.drops[j];
                if (L.dist2(ant.x, ant.y, d.x, d.y) < d.r * d.r) {
                    burst(ant.x, ant.y, L.COLORS.water, 8, 120, 3);
                    world.raids.splice(i, 1);
                    break;
                }
            }
            if (i >= world.raids.length || world.raids[i] !== ant) continue;

            /* Le formiche del difensore le fermano. L'anello di difesa sta
             * FUORI dal cratere del nido: una colonia parcheggiata deve poter
             * respingere l'assalto prima che il nido venga toccato. */
            var defenders = target;
            var rr = 30 + workerRadius(defenders) * 1.6;
            if (L.dist2(ant.x, ant.y, defenders.x, defenders.y) < rr * rr && ant.cd <= 0) {
                /* Una colonia numerosa fa a pezzi le formiche: il branco
                 * è arma, non solo numero. */
                var bite = Math.min(3, 1 + Math.floor(defenders.workers / 9));
                ant.hp -= bite;
                ant.cd = 0.22;
                ant.reachCd = 0.5;
                burst(ant.x, ant.y, defenders.color, 5, 100, 2.5);
                if (ant.hp <= 0) {
                    defenders.kills++;
                    defenders.stats.raidsBeaten++;
                    world.raids.splice(i, 1);
                    world.events.push({ type: "raidRepelled", colony: defenders });
                    continue;
                }
                /* respingi: la difesa spinge indietro l'assalto */
                var away = Math.atan2(ant.y - defenders.y, ant.x - defenders.x);
                ant.x += Math.cos(away) * 40;
                ant.y += Math.sin(away) * 40;
                ant.angle = away;
            }

            /* Arrivo al nido: il cratere, non l'orlo dell'anello. */
            if (L.dist2(ant.x, ant.y, target.nestX, target.nestY) < 40 * 40 && ant.reachCd <= 0) {
                ant.reachCd = N.crashInterval;
                hurtNest(target, ant);
                world.raids.splice(i, 1);
            }
        }
    }

    function hurtNest(target, ant) {
        if (!target.alive) return;
        target.nestHp -= N.crashDamage;
        burst(target.nestX, target.nestY, L.COLORS.raid, 16, 170, 4);
        var stolen = Math.round(target.crumbs * N.crashSteal);
        target.crumbs -= stolen;
        if (ant && ant.raider && ant.raider.alive) {
            ant.raider.crumbs += stolen;
            if (target.isPlayer) ant.raider.stats.raidsBeaten++;
            else ant.raider.kills++;
        }
        world.events.push({ type: "nestHit", colony: target, stolen: stolen });
        if (target.isPlayer) world.events.push({ type: "shake", colony: target });
        if (target.nestHp <= 0) {
            killColony(target, ant ? ant.raider : null, "raid");
        }
    }

    /* Il timer delle razzie: ogni colonia conta per sé, e di notte va più
     * in fretta. Le colonie con il ghigno rapace partono anche di giorno. */
    function stepRaidTimers(dt) {
        for (var i = 0; i < world.colonies.length; i++) {
            var col = world.colonies[i];
            if (!col.alive || !col.ai) continue;
            if (col.workers < 4) continue;

            var P = col.personality;
            var eagerness = 0.55 + P.raiding * 0.9;
            var interval = (world.night > 0.5 ? R.intervalNight : R.intervalDay) / eagerness;

            col.ai.raidTimer = (col.ai.raidTimer === undefined ? interval * Math.random() : col.ai.raidTimer) - dt;
            if (col.ai.raidTimer > 0) continue;
            col.ai.raidTimer = interval * L.rand(0.7, 1.3);

            /* Bersaglio: il giocatore ha priorità se c'è un rancore, altrimenti
             * la colonia più vicina (esclusa sé stessi). */
            var best = null, bestScore = -Infinity;
            for (var j = 0; j < world.colonies.length; j++) {
                var other = world.colonies[j];
                if (other === col || !other.alive) continue;
                var d = Math.sqrt(L.dist2(col.nestX, col.nestY, other.nestX, other.nestY));
                var score = -d / 100 + (other.isPlayer ? 30 + col.grudge * 40 : 0);
                if (score > bestScore) { bestScore = score; best = other; }
            }
            if (!best) continue;
            spawnRaid(col, best);
        }
    }

    /* ===== Briciole: respawn lento ===== */
    var respawnAcc = 0;
    function stepFoodRespawn(dt) {
        respawnAcc += dt;
        if (respawnAcc < F.respawn) return;
        respawnAcc = 0;

        var crumbs = 0, sugars = 0;
        for (var i = 0; i < world.crumbs.length; i++) {
            if (world.crumbs[i].taken) continue;
            if (world.crumbs[i].type === "sugar") sugars++;
            else if (world.crumbs[i].type === "crumb") crumbs++;
        }

        /* pulisce le bricioole consumate */
        for (i = world.crumbs.length - 1; i >= 0; i--) {
            if (world.crumbs[i].taken && !world.crumbs[i].carriedBy) world.crumbs.splice(i, 1);
        }

        if (crumbs < F.crumbs) spawnCrumb();
        else if (sugars < F.sugars) spawnCrumb("sugar");
    }

    function stepParticles(dt) {
        for (var i = world.particles.length - 1; i >= 0; i--) {
            var p = world.particles[i];
            p.life -= dt;
            if (p.life <= 0) { world.particles.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.92;
            p.vy *= 0.92;
        }
    }

    /* ===== Giorno e notte ===== */
    function stepDayNight(dt) {
        world.time += dt;
        world.phase += dt / C.day.length;
        if (world.phase >= 1) world.phase -= 1;

        var nightAmt = L.Zones.nightAmount(world.time, world.phase);
        var prev = world.night;
        world.night = nightAmt;

        if (prev <= 0 && nightAmt > 0) {
            world.events.push({ type: "nightfall" });
        } else if (prev > 0 && nightAmt <= 0) {
            world.events.push({ type: "dawn" });
        }

        /* Il nido si ripara di giorno. */
        for (var i = 0; i < world.colonies.length; i++) {
            var col = world.colonies[i];
            if (!col.alive) continue;
            if (world.night < 0.5 && col.nestHp < N.hp) {
                col.nestHp = Math.min(N.hp, col.nestHp + N.regen * dt);
            }
        }

        /* se il giocatore sta morendo, mostraglielo: hp del nido */
    }

    /* ===== Griglia colonie ===== */
    function rebuildGrids() {
        world.grid.clear();
        for (var i = 0; i < world.colonies.length; i++) {
            world.grid.insert(world.colonies[i].x, world.colonies[i].y, world.colonies[i]);
        }
    }

    /* ===== Classifica ===== */
    function updateRanks() {
        var alive = world.colonies.filter(function (c) { return c.alive; });
        alive.sort(function (a, b) { return b.territory - a.territory; });
        world.leaderTerritory = alive.length ? alive[0].territory : 0;
        var playerRank = alive.length || 1;
        for (var i = 0; i < alive.length; i++) {
            alive[i].rank = i + 1;
            if (alive[i].isPlayer) playerRank = i + 1;
        }
        world.rank = playerRank;
    }

    /* ===== Frame ===== */
    function step(dt) {
        stepDayNight(dt);

        var i;
        for (i = world.colonies.length - 1; i >= 0; i--) {
            if (world.colonies[i].alive) stepColony(world.colonies[i], dt);
        }

        stepHazards(dt);
        stepClashes();
        stepRaidTimers(dt);
        stepRaids(dt);
        stepFoodRespawn(dt);
        stepParticles(dt);
        decayGrid(dt);

        countAcc += dt;
        if (countAcc >= 0.5) {
            countAcc = 0;
            countTerritory();
            updateRanks();
        }

        rebuildGrids();
    }

    /* ===== Helper per l'AI e il rendering ===== */
    function nearestCrumb(col, maxDist) {
        var best = null, bestD = maxDist * maxDist;
        for (var i = 0; i < world.crumbs.length; i++) {
            var c = world.crumbs[i];
            if (c.taken) continue;
            var d = L.dist2(col.x, col.y, c.x, c.y);
            if (d < bestD) { bestD = d; best = c; }
        }
        return best;
    }

    /* Il gradiente del proprio feromone: la direzione in cui la propria
     * puzza è più forte. Le razzie lo usano come strada. */
    function gradientAt(x, y, slot) {
        var cx = (x / W.cell) | 0, cy = (y / W.cell) | 0;
        var here = strengthAt(x, y);
        var gx = 0, gy = 0;
        var dd = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (var i = 0; i < dd.length; i++) {
            var nx = cx + dd[i][0], ny = cy + dd[i][1];
            if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
            var j = ny * GW + nx;
            if (owner[j] !== slot) continue;
            var delta = strength[j] - here;
            if (delta > 0) { gx += dd[i][0] * delta; gy += dd[i][1] * delta; }
        }
        if (gx === 0 && gy === 0) return null;
        return Math.atan2(gy, gx);
    }

    L.World = {
        world: world,
        grid: { owner: owner, strength: strength, GW: GW, GH: GH },
        generate: generate,
        addPlayer: addPlayer,
        addBot: addBot,
        removeColony: removeColony,
        killColony: killColony,
        hurtNest: hurtNest,
        spawnRaid: spawnRaid,
        step: step,
        updateRanks: updateRanks,
        countTerritory: countTerritory,
        ownerAt: ownerAt,
        strengthAt: strengthAt,
        gradientAt: gradientAt,
        eraseAt: eraseAt,
        bodyLength: bodyLength,
        workerRadius: workerRadius,
        visualAnts: visualAnts,
        speedFor: speedFor,
        turnRateFor: turnRateFor,
        zoomFor: zoomFor,
        rebuildBody: rebuildBody,
        seedBody: seedBody,
        nearestCrumb: nearestCrumb,
        burst: burst,
        reset: function () {
            owner.fill(0);
            strength.fill(0);
            world.colonies.length = 0;
            world.bySlot.length = 0;
            world.crumbs.length = 0;
            world.raids.length = 0;
            world.particles.length = 0;
            world.events.length = 0;
            world.player = null;
            world.rank = 1;
            world.time = 0;
            world.night = 0;
            world.phase = 0.08;
        },
    };

})(window.FORMICA = window.FORMICA || {});
