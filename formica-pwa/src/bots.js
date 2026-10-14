/*
 * FORMICA - intelligenza delle colonie nemiche.
 *
 * Non esiste un server: le "altre colonie" sono un roster fisso di rivali con
 * identità persistenti e sterzata miscelata. Cinque caratteri - espansione,
 * agricoltura, razzia, difesa, cautela - e ogni colonia gioca davvero in modo
 * diverso invece di condividere un solo cervello.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var F = C.food;
    var bots = {
        roster: [],
        pending: [],
        _out: [],
    };

    function angDiff(a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    /* ===== Ciclo di vita ===== */
    function spawnAll(world) {
        /* Svuota sempre la coda prima: lasciare voci in giro risolverebbe
         * identità che il nuovo mondo ha già, con due colonie per botId -
         * e i rancori finirebbero attaccati alla creatura sbagliata. */
        bots.pending.length = 0;
        bots.roster = L.Storage.getRoster(C.bots.count);
        var grudges = L.Storage.getGrudges();
        var slot = 2;
        for (var i = 0; i < bots.roster.length; i++) {
            var id = bots.roster[i];
            var col = L.World.addBot(id, L.randInt(C.bots.startWorkersMin, C.bots.startWorkersMax), slot++);
            col.grudge = grudges[id.id] || 0;
        }
    }

    function clear(world) {
        bots.pending.length = 0;
        bots.roster = [];
    }

    /* ===== Percezione =====
     * Una colonia vede solo ciò che è vicino alla sua testa: pochi corpi,
     * niente onniscienza. */
    function findThreatColony(col, world) {
        var out = bots._out;
        var worst = null, worstD = 520 * 520;
        world.grid.query(col.x, col.y, 520, out);
        for (var i = 0; i < out.length; i++) {
            var o = out[i];
            if (o === col || !o.alive) continue;
            if (o.workers <= col.workers) continue;
            var d = L.dist2(col.x, col.y, o.x, o.y);
            if (d < worstD) { worstD = d; worst = o; }
        }
        return worst;
    }

    function findVictimColony(col, world) {
        var out = bots._out;
        var best = null, bestScore = -Infinity;
        world.grid.query(col.x, col.y, 620, out);
        for (var i = 0; i < out.length; i++) {
            var o = out[i];
            if (o === col || !o.alive) continue;
            if (o.workers >= col.workers) continue;
            var d = Math.sqrt(L.dist2(col.x, col.y, o.x, o.y));
            var score = (col.workers - o.workers) * 14 - d * 0.06;
            if (o.isPlayer) score += 20 + col.grudge * 60;
            if (score > bestScore) { bestScore = score; best = o; }
        }
        return best;
    }

    /* ===== Scelta della modalità (con isteresi: le colonie si impegnano) ===== */
    function chooseMode(col, world, dt) {
        var P = col.personality;
        var ai = col.ai;

        var threat = findThreatColony(col, world);
        var victim = findVictimColony(col, world);
        var crumb = L.World.nearestCrumb(col, 700);

        /* Notte: le colonie con ghigno rapace partono, quelle guardinghe
         * tornano a casa. */
        var night = world.night > 0.5;
        var wantsRaid = night ? P.raiding * 1.6 + 0.2 : P.raiding * 0.5;
        var wantsDefend = night ? P.defense + 0.25 : P.defense * 0.4;

        /* Una razzia in arrivo verso il proprio nido comanda tutto il resto:
         * le colonie tornano a casa. Senza questa regola le nemiche non
         * imparano a difendersi e il tavolo si svuota. */
        var incoming = raidIncoming(col, world);

        var roll = Math.random();
        var mode;

        if (incoming > 0) {
            mode = "difendi";
        } else if (threat && P.caution > 0.4) {
            mode = "fuggi";
            ai.threat = threat;
        } else if (roll < wantsDefend) {
            mode = "difendi";
        } else if (victim && Math.random() < 0.35 + P.expansion * 0.5) {
            mode = "azzanna";
            ai.victim = victim;
        } else if (night && col.workers >= 5 && Math.random() < wantsRaid) {
            mode = "razzia";
            ai.raidTarget = pickRaidTarget(col, world);
            if (!ai.raidTarget) mode = null;
        }

        if (!mode) {
            /* Ripartizione tra espandere e raccogliere: i contadini spazzano
             * briciole, gli espansionisti dipingono mappa nuova. */
            var gatherChance = 0.25 + P.farming * 0.6;
            if (crumb && Math.random() < gatherChance) {
                mode = "raccogli";
                ai.crumbTarget = crumb;
            } else {
                mode = "espandi";
                /* Un espansionista su tre punta al confine del vicino invece
                 * che al vuoto: le colonie si incontrano, e il tavolo
                 * cambia padrone. */
                if (Math.random() < 0.34) {
                    var near = nearestColonyNest(col, world);
                    if (near) {
                        ai.expandBias = Math.atan2(near.y - col.nestY, near.x - col.nestX);
                    }
                } else {
                    ai.expandBias += L.rand(-1.4, 1.4);
                }
            }
        }

        ai.mode = mode;
        ai.modeHold = L.rand(0.6, 1.6);
    }

    function pickRaidTarget(col, world) {
        var best = null, bestScore = -Infinity;
        for (var i = 0; i < world.colonies.length; i++) {
            var other = world.colonies[i];
            if (other === col || !other.alive) continue;
            var d = Math.sqrt(L.dist2(col.nestX, col.nestY, other.nestX, other.nestY));
            var score = -d / 120 + (other.isPlayer ? 28 + col.grudge * 45 : 0);
            if (score > bestScore) { bestScore = score; best = other; }
        }
        return best;
    }

    /* Il nido nemico più vicino: usato dagli espansionisti per spingersi
     * verso il confine invece di vagare nel vuoto. */
    function nearestColonyNest(col, world) {
        var best = null, bestD = Infinity;
        for (var i = 0; i < world.colonies.length; i++) {
            var other = world.colonies[i];
            if (other === col) continue;
            var d = L.dist2(col.nestX, col.nestY, other.nestX, other.nestY);
            if (d < bestD) { bestD = d; best = other; }
        }
        return best;
    }

    /* Quante formiche d'assalto stanno marciando su questo nido. */
    function raidIncoming(col, world) {
        var n = 0;
        for (var i = 0; i < world.raids.length; i++) {
            if (world.raids[i].target === col) n++;
        }
        return n;
    }

    /* ===== Punto mirato ===== */
    function computeAim(col, world, dt) {
        var ai = col.ai;
        var P = col.personality;
        var W = L.CONFIG.world;

        col.boost = 0;

        switch (ai.mode) {
            case "fuggi": {
                var t = ai.threat;
                if (!t || !t.alive) { ai.modeHold = 0; return; }
                var ax = col.x - t.x, ay = col.y - t.y;
                var a = Math.atan2(ay, ax) + L.wanderAngle(world.time * 0.5, ai.jitterSeed) * 0.4;
                ai.targetPointX = L.clamp(col.x + Math.cos(a) * 480, 60, W.w - 60);
                ai.targetPointY = L.clamp(col.y + Math.sin(a) * 480, 60, W.h - 60);
                break;
            }

            case "azzanna": {
                var v = ai.victim;
                if (!v || !v.alive) { ai.modeHold = 0; return; }
                /* Le colonie abili guidano il bersaglio; le altre inseguono
                 * la testa e sbattono. */
                var lead = P.skill > 0.45
                    ? Math.sqrt(L.dist2(col.x, col.y, v.x, v.y)) / L.World.speedFor(col) + 0.3 * P.skill
                    : 0;
                var err = (1 - P.skill) * 90;
                ai.targetPointX = L.clamp(v.x + v.vx * lead + L.rand(-err, err), 60, W.w - 60);
                ai.targetPointY = L.clamp(v.y + v.vy * lead + L.rand(-err, err), 60, W.h - 60);
                if (L.dist2(col.x, col.y, v.x, v.y) < 200 * 200 && col.crumbs > 12) {
                    col.boost = 1.1;
                }
                break;
            }

            case "raccogli": {
                var c = ai.crumbTarget;
                if (!c || c.taken) {
                    c = L.World.nearestCrumb(col, 700);
                    ai.crumbTarget = c;
                }
                if (!c) { ai.modeHold = 0; return; }
                ai.targetPointX = c.x;
                ai.targetPointY = c.y;
                if (L.dist2(col.x, col.y, c.x, c.y) > 260 * 260 &&
                    c.value >= F.sugarValue && col.crumbs > 16) {
                    col.boost = 0.8;
                }
                break;
            }

            case "difendi": {
                /* Con una razzia in arrivo la colonia si piazza SUL nido:
                 * l'anello di difesa è lì, orbite larghe lasciano il cratere
                 * scoperto. Senza razzia, presidia l'area. */
                if (raidIncoming(col, world) > 0) {
                    ai.targetPointX = col.nestX;
                    ai.targetPointY = col.nestY;
                } else {
                    var orb = ai.defendAngle = (ai.defendAngle || 0) + dt * (0.5 + P.caution);
                    ai.targetPointX = col.nestX + Math.cos(orb) * 180;
                    ai.targetPointY = col.nestY + Math.sin(orb) * 180;
                }
                break;
            }

            case "razzia": {
                var target = ai.raidTarget;
                if (!target || !target.alive) { ai.raidTarget = pickRaidTarget(col, world); target = ai.raidTarget; }
                if (!target) { ai.modeHold = 0; return; }
                ai.targetPointX = target.nestX;
                ai.targetPointY = target.nestY;
                if (col.crumbs > 25) col.boost = 1.3;
                /* La razzia scatta quando la testa è vicina al nido nemico:
                 * marciare serve a portare le formiche a distanza utile. */
                if (L.dist2(col.x, col.y, target.nestX, target.nestY) < 420 * 420) {
                    L.World.spawnRaid(col, target);
                    ai.modeHold = 0;
                }
                break;
            }

            default: {
                /* espandi / vaga: verso territorio mai visto. */
                var ang = ai.expandBias + L.wanderAngle(world.time, ai.jitterSeed) * 0.5;
                ai.targetPointX = L.clamp(col.x + Math.cos(ang) * 620, 60, W.w - 60);
                ai.targetPointY = L.clamp(col.y + Math.sin(ang) * 620, 60, W.h - 60);
                if (col.crumbs > 40) col.boost = 0.7;
            }
        }
    }

    /* ===== Sterzata =====
     * I pericoli vengono valutati per primi: quando una goccia è nella
     * corridoio prende autorità totale sulla rotta. Condividerla con la
     * fuga da una colonia più grande faceva annegare le formiche che
     * scappavano.
     */
    function steer(col, world) {
        var ai = col.ai;
        var out = bots._out;
        var i, item, d;

        var base = Math.atan2(ai.targetPointY - col.y, ai.targetPointX - col.x);
        var aim = base;

        /* Sonde lungo la rotta. */
        var PROBE = [100, 180, 280, 400];
        var hazard = 0;
        var imminent = false;

        for (var pi = 0; pi < PROBE.length; pi++) {
            var qx = col.x + Math.cos(col.angle) * PROBE[pi];
            var qy = col.y + Math.sin(col.angle) * PROBE[pi];

            for (i = 0; i < world.drops.length; i++) {
                item = world.drops[i];
                if (L.dist2(qx, qy, item.x, item.y) > (item.r + 40) * (item.r + 40)) continue;
                var away = Math.atan2(col.y - item.y, col.x - item.x);
                if (Math.abs(angDiff(col.angle, away)) > (pi < 2 ? 1.5 : 0.9)) continue;
                hazard += L.clamp(angDiff(base, away) * (1.9 - pi * 0.4), -1.5, 1.5);
                if (pi <= 1) imminent = true;
            }

            for (i = 0; i < world.inks.length; i++) {
                item = world.inks[i];
                if (L.dist2(qx, qy, item.x, item.y) > (item.r + 40) * (item.r + 40)) continue;
                var away2 = Math.atan2(col.y - item.y, col.x - item.x);
                if (Math.abs(angDiff(col.angle, away2)) > (pi < 2 ? 1.5 : 0.9)) continue;
                hazard += L.clamp(angDiff(base, away2) * (2.0 - pi * 0.42), -1.6, 1.6);
                if (pi <= 1) imminent = true;
            }
        }

        if (imminent) {
            col.targetAngle = base + L.clamp(hazard, -2.0, 2.0);
            return;
        }

        aim += L.clamp(hazard, -1.0, 1.0);

        /* Evita le colonie più grosse (e punta quelle più piccole quando il
         *taglio lo consente). */
        world.grid.query(col.x, col.y, 420, out);
        var avoid = 0;
        for (i = 0; i < out.length; i++) {
            var o = out[i];
            if (o === col || !o.alive) continue;
            d = Math.sqrt(L.dist2(col.x, col.y, o.x, o.y));
            if (d > 420 || d < 1) continue;
            var awayO = Math.atan2(col.y - o.y, col.x - o.x);
            var weight = o.workers > col.workers
                ? (o.workers - col.workers) * 0.12 * (1 - d / 420)
                : -0.05 * (1 - d / 420);
            avoid += angDiff(aim, awayO) * L.clamp(weight * (0.6 + col.personality.caution), -0.9, 0.9);
        }
        aim += L.clamp(avoid, -1.2, 1.2);

        /* Mai contro il bordo del tavolo. */
        var margin = 300;
        if (col.x < margin) aim += 0.55;
        if (col.x > world.w - margin) aim -= 0.55;
        if (col.y < margin) aim -= 0.55;
        if (col.y > world.h - margin) aim += 0.55;

        col.targetAngle = aim;
    }

    /* ===== Frame ===== */
    function update(world, dt) {
        /* Coda di respawn: la popolazione si mantiene. */
        for (var q = bots.pending.length - 1; q >= 0; q--) {
            var pd = bots.pending[q];
            pd.in -= dt;
            if (pd.in > 0) continue;
            var identity = pd.identity;
            /* lo slot libero più basso, così i colori non slittano */
            var used = {};
            for (var k = 0; k < world.colonies.length; k++) used[world.colonies[k].slot] = true;
            var slot = 2;
            while (used[slot]) slot++;
            var grudge = L.Storage.getGrudges()[identity.id] || 0;
            var col = L.World.addBot(identity, L.randInt(C.bots.startWorkersMin, C.bots.startWorkersMax), slot);
            col.grudge = grudge;
            bots.pending.splice(q, 1);
        }

        var list = world.colonies;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.isPlayer || !c.ai) continue;

            c.ai.thinkIn -= dt;
            c.ai.modeHold -= dt;

            var stale = !c.ai.threat || !c.ai.threat.alive ||
                !c.ai.victim || !c.ai.victim.alive ||
                !c.ai.crumbTarget || c.ai.crumbTarget.taken ||
                !c.ai.raidTarget || !c.ai.raidTarget.alive;

            if (c.ai.thinkIn <= 0) {
                c.ai.thinkIn = C.bots.thinkInterval;
                if (c.ai.modeHold <= 0 || stale) chooseMode(c, world, dt);
            }

            computeAim(c, world, dt);
            steer(c, world);
        }
    }

    /* Le colonie nemiche morte rientrano in coda di respawn: il roster è
     * persistente, quindi un nome è assente per una decina di secondi. */
    function onColonyDeath(colony) {
        if (!colony || !colony.botId) return;
        for (var r = 0; r < bots.roster.length; r++) {
            if (bots.roster[r].id !== colony.botId) continue;
            bots.pending.push({
                identity: bots.roster[r],
                in: L.rand(C.bots.respawnMin, C.bots.respawnMax),
            });
            return;
        }
    }

    /* Il libro dei rancori sta qui, non nel ciclo degli eventi, così si
     * può esercitare senza DOM: annetti una colonia e quella ti caccia. */
    function onKill(killer, victim) {
        if (!killer || !victim) return;
        if (killer.isPlayer && victim.botId) {
            L.Storage.addGrudge(victim.botId, 0.6);
        } else if (victim.isPlayer && killer.botId) {
            L.Storage.addGrudge(killer.botId, 1);
        }
    }

    L.Bots = {
        spawnAll: spawnAll,
        clear: clear,
        update: update,
        onKill: onKill,
        onColonyDeath: onColonyDeath,
        roster: function () { return bots.roster; },
    };

})(window.FORMICA = window.FORMICA || {});
