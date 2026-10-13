/*
 * LUMEN - bot AI.
 *
 * There is no server, so the "other players" are a fixed roster of named
 * rivals with persistent identities and blended steering. The illusion only
 * works if they behave like individuals: each one is a weighted mix of
 * forage / hunt / cut-off / scavenge / escape / wander, and high-skill bots
 * play the cut-off angle that low-skill bots never find.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var W = C.world;

    var bots = {
        roster: [],
        pending: [],   /* waiting to respawn: identity + timer */
        _out: [],
    };

    function angDiff(a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    /* ===== Lifecycle ===== */
    function spawnAll(world) {
        /* Always drain the queue first. Leaving entries behind would respawn
         * identities that the new world already has, producing two creatures
         * sharing one botId - which silently corrupts grudge and stats keys. */
        bots.pending.length = 0;
        bots.roster = L.Storage.getRoster(C.bots.count);
        var grudges = L.Storage.getGrudges();
        for (var i = 0; i < bots.roster.length; i++) {
            var id = bots.roster[i];
            var b = L.World.addBot(id, L.rand(C.bots.startMassMin, C.bots.startMassMax));
            b.grudge = grudges[id.id] || 0;
        }
    }

    function clear(world) {
        bots.pending.length = 0;
        bots.roster = [];
    }

    /* ===== Perception ===== */
    function findThreat(bot, world, percept) {
        var out = bots._out;
        var worst = null, worstD = percept * 1.1;
        world.cGrid.query(bot.headX, bot.headY, percept * 1.1, out);
        for (var i = 0; i < out.length; i++) {
            var o = out[i];
            if (o === bot || !o.alive) continue;
            if (o.mass <= bot.mass * 1.2) continue;
            var d = Math.sqrt(L.dist2(bot.headX, bot.headY, o.headX, o.headY));
            if (d < worstD) { worstD = d; worst = o; }
        }
        return worst;
    }

    function findAnglerThreat(bot) {
        var world = L.World.world;
        for (var i = 0; i < world.anglers.length; i++) {
            var a = world.anglers[i];
            if (a.state === "recover") continue;
            if (L.dist2(bot.headX, bot.headY, a.x, a.y) < 430 * 430) return a;
        }
        return null;
    }

    function findPrey(bot, world, percept) {
        var out = bots._out;
        var P = bot.personality;
        var best = null, bestScore = -Infinity;

        world.cGrid.query(bot.headX, bot.headY, percept, out);
        for (var i = 0; i < out.length; i++) {
            var o = out[i];
            if (o === bot || !o.alive) continue;

            var ratio = o.mass / (bot.mass + 1);
            if (ratio > 1.2) continue;

            var d = Math.sqrt(L.dist2(bot.headX, bot.headY, o.headX, o.headY));
            if (d > percept) continue;

            var score = 0;
            score += P.aggression * 40;
            score -= (d / percept) * 60;
            score += (bot.mass / (o.mass + 10)) * 22 * P.skill;
            if (o.boosting) score += 25;
            if (o.stun > 0) score += 60;
            if (o.atEdge) score += 15;

            /* Grudges: whoever killed you comes looking, every session. */
            if (o.isPlayer) score += 34 + bot.grudge * 95;

            if (score > bestScore) { bestScore = score; best = o; }
        }
        return best;
    }

    function findFood(bot, world, percept) {
        var out = bots._out;
        var P = bot.personality;
        var best = null, bestScore = -Infinity;

        world.foodGrid.query(bot.headX, bot.headY, percept, out);
        for (var i = 0; i < out.length; i++) {
            var f = out[i];
            if (f.ttl !== Infinity && f.ttl <= 0) continue;

            var d = Math.sqrt(L.dist2(bot.headX, bot.headY, f.x, f.y));
            if (d > percept) continue;

            /* Value per unit of travel. Fresh meat is worth chasing; plankton
             * is only worth it when there is nothing better. */
            var worth = f.value * (f.type === "meat" ? 1 + P.greed * 1.6 : 1);
            var score = worth / (d + 45);
            if (score > bestScore) { bestScore = score; best = f; }
        }
        return best;
    }

    /* ===== Mode selection (with hysteresis so bots commit to a plan) ===== */
    function chooseMode(bot, world, percept) {
        var P = bot.personality;
        var ai = bot.ai;

        var threat = findThreat(bot, world, percept);
        var angler = findAnglerThreat(bot);
        var prey = findPrey(bot, world, percept);
        var food = findFood(bot, world, percept);

        var wantHunt = prey && Math.random() < 0.18 + P.aggression * 0.8;
        var wantScavenge = food && food.type === "meat";

        if (angler || (threat && (P.caution > 0.55 || threat.mass > bot.mass * 1.45))) {
            ai.mode = "escape";
            ai.targetCreature = threat || null;
            ai.threatX = angler ? angler.x : threat.headX;
            ai.threatY = angler ? angler.y : threat.headY;
        } else if (wantHunt) {
            ai.mode = "hunt";
            ai.targetCreature = prey;
            ai.foodTarget = null;
        } else if (wantScavenge) {
            ai.mode = "scavenge";
            ai.foodTarget = food;
            ai.targetCreature = null;
        } else if (food) {
            ai.mode = "forage";
            ai.foodTarget = food;
            ai.targetCreature = null;
        } else {
            ai.mode = "wander";
            ai.targetCreature = null;
            ai.foodTarget = null;
        }

        ai.modeHold = L.rand(0.5, 1.4);
    }

    /* ===== Aim ===== */
    function computeAim(bot, world, dt) {
        var ai = bot.ai;
        var P = bot.personality;
        var size = world.size;
        var pad = 220;

        bot.wantBoost = false;

        switch (ai.mode) {
            case "hunt": {
                var t = ai.targetCreature;
                if (!t || !t.alive) { ai.modeHold = 0; return; }
                var d = Math.sqrt(L.dist2(bot.headX, bot.headY, t.headX, t.headY));

                /* Skilled bots lead their target by the time it takes to
                 * arrive, which naturally sets up a cut-off. Unsilled bots
                 * chase the head and crash into it. */
                var lead = P.skill > 0.5 ? d / C.player.baseSpeed + 0.4 * P.skill : 0;
                var err = (1 - P.skill) * 95;
                ai.targetPointX = L.clamp(t.headX + t.vx * lead + L.rand(-err, err), pad, size - pad);
                ai.targetPointY = L.clamp(t.headY + t.vy * lead + L.rand(-err, err), pad, size - pad);

                if (d < 280 && P.boostiness > 0.3 && bot.mass > C.player.minBoostMass * 1.6) {
                    bot.wantBoost = true;
                }
                break;
            }

            case "escape": {
                var ax = bot.headX - (ai.threatX || bot.headX);
                var ay = bot.headY - (ai.threatY || bot.headY);
                var m = Math.hypot(ax, ay) || 1;
                var wander = L.wanderAngle(world.time * 0.5, ai.jitterSeed) * 0.5;
                var a = Math.atan2(ay, ax) + wander;
                ai.targetPointX = L.clamp(bot.headX + Math.cos(a) * 520, pad, size - pad);
                ai.targetPointY = L.clamp(bot.headY + Math.sin(a) * 520, pad, size - pad);
                bot.wantBoost = bot.mass > C.player.minBoostMass * 2;
                break;
            }

            case "scavenge":
            case "forage": {
                var f = ai.foodTarget;
                if (!f) { ai.modeHold = 0; return; }
                ai.targetPointX = f.x;
                ai.targetPointY = f.y;
                var fd = Math.sqrt(L.dist2(bot.headX, bot.headY, f.x, f.y));
                if (fd > 200 && f.value > 8 && P.boostiness > 0.55 && bot.mass > C.player.minBoostMass) {
                    bot.wantBoost = true;
                }
                break;
            }

            default: {
                var wa = L.wanderAngle(world.time, ai.jitterSeed);
                ai.targetPointX = L.clamp(
                    bot.headX + Math.cos(bot.angle + wa) * 420, pad, size - pad);
                ai.targetPointY = L.clamp(
                    bot.headY + Math.sin(bot.angle + wa) * 420, pad, size - pad);
                break;
            }
        }
    }

    /* ===== Steering, every frame =====
     * Wrecks are evaluated first and, when one is in the corridor, they take
     * sole authority over the heading. Sharing the heading between rival
     * avoidance and wreck avoidance let the two fight each other, and a bot
     * dodging a bigger LUMEN would swim straight into a hull.
     */
    function steer(bot, world) {
        var P = bot.personality;
        var ai = bot.ai;
        var out = bots._out;
        var i, o, d, reach;

        var base = Math.atan2(ai.targetPointY - bot.headY, ai.targetPointX - bot.headX);
        var aim = base;

        /* Probe down the current heading. A single probe only fires once a
         * bot is already committed, which made most wreck deaths happen
         * while fleeing. */
        var PROBE = [90, 150, 220, 300, 390];
        var pad = bot.radius + 26;
        var hazard = 0;
        var imminent = false;

        for (var pi = 0; pi < PROBE.length; pi++) {
            var qx = bot.headX + Math.cos(bot.angle) * PROBE[pi];
            var qy = bot.headY + Math.sin(bot.angle) * PROBE[pi];
            world.wreckGrid.query(qx, qy, 150, out);

            for (i = 0; i < out.length; i++) {
                var wk = out[i];
                if (!L.World.wreckBlocks(wk, qx, qy, pad)) continue;

                /* Near probes get a wide corridor, far ones a narrow one. */
                var toW = Math.atan2(wk.y - bot.headY, wk.x - bot.headX);
                if (Math.abs(angDiff(bot.angle, toW)) > (pi < 2 ? 1.5 : 0.9)) continue;

                var away = Math.atan2(bot.headY - wk.y, bot.headX - wk.x);
                var dist = Math.sqrt(L.dist2(bot.headX, bot.headY, wk.x, wk.y));
                var hull = Math.sqrt(wk.hw * wk.hw + wk.hh * wk.hh) + bot.radius + 80;

                /* Close in, bounce off radially and you clip the very hull you
                 * were escaping. Blend toward tangential instead - but pick
                 * the side we are already leaning toward, or the bot commits
                 * to whichever way round the wreck is longer. */
                var close = dist < hull ? 1 : 0;
                var tangA = away + Math.PI / 2;
                var tangB = away - Math.PI / 2;
                var tangent = Math.abs(angDiff(base, tangA)) <= Math.abs(angDiff(base, tangB))
                    ? tangA : tangB;
                var steerTo = away + angDiff(away, tangent) * close * 0.85;

                var urgency = 1.7 - pi * 0.35;
                hazard += L.clamp(angDiff(base, steerTo) * urgency, -1.4, 1.4);
                if (pi <= 1) imminent = true;
            }
        }

        if (imminent) {
            bot.targetAngle = base + L.clamp(hazard, -1.9, 1.9);
            return;
        }

        aim += L.clamp(hazard, -1.0, 1.0);

        /* Avoid bigger heads. Weight scales with caution, so reckless bots
         * happily nose into things. */
        reach = 150 + bot.glow * 0.12;
        world.cGrid.query(bot.headX, bot.headY, reach, out);
        var avoid = 0;
        for (i = 0; i < out.length; i++) {
            o = out[i];
            if (o === bot || !o.alive) continue;
            d = Math.sqrt(L.dist2(bot.headX, bot.headY, o.headX, o.headY));
            if (d > reach || d < 1) continue;
            var scale = (o.mass / (bot.mass + 1)) * (1 - d / reach);
            var awayO = Math.atan2(bot.headY - o.headY, bot.headX - o.headX);
            avoid += angDiff(aim, awayO) * L.clamp(scale * 1.8 * (0.4 + P.caution), -1.2, 1.2);
        }
        aim += L.clamp(avoid, -1.5, 1.5);

        /* Never let a bot swim into the soft wall. */
        var margin = 260;
        if (bot.headX < margin) aim += 0.5;
        if (bot.headX > world.size - margin) aim -= 0.5;
        if (bot.headY < margin) aim -= 0.5;
        if (bot.headY > world.size - margin) aim += 0.5;

        bot.targetAngle = aim;
    }

    /* ===== Frame ===== */
    function update(world, dt) {
        var list = world.creatures;

        /* Respawn queue keeps the population up. */
        for (var q = bots.pending.length - 1; q >= 0; q--) {
            var pd = bots.pending[q];
            pd.in -= dt;
            if (pd.in <= 0) {
                var identity = pd.identity;
                var grudge = L.Storage.getGrudges()[identity.id] || 0;
                var b = L.World.addBot(identity, L.rand(C.bots.startMassMin, C.bots.startMassMax));
                b.grudge = grudge;
                bots.pending.splice(q, 1);
            }
        }

        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.isPlayer || !c.ai) continue;

            if (!c.alive) {
                if (c.ai.respawnIn === 0) {
                    var identity = null;
                    for (var r = 0; r < bots.roster.length; r++) {
                        if (bots.roster[r].id === c.botId) { identity = bots.roster[r]; break; }
                    }
                    c.ai.respawnIn = L.rand(C.bots.respawnMin, C.bots.respawnMax);
                    if (identity) {
                        bots.pending.push({
                            identity: identity,
                            in: c.ai.respawnIn + L.rand(0.2, 1.0),
                        });
                        L.World.removeBot(c);
                        i--;
                    }
                }
                continue;
            }

            var percept = c.glow * 1.15;
            c.ai.thinkIn -= dt;
            c.ai.modeHold -= dt;

            var stale = !c.ai.targetCreature || !c.ai.targetCreature.alive ||
                !c.ai.foodTarget ||
                (c.ai.foodTarget.ttl !== Infinity && c.ai.foodTarget.ttl <= 0);

            if (c.ai.thinkIn <= 0) {
                c.ai.thinkIn = C.bots.thinkInterval;
                if (c.ai.modeHold <= 0 || stale) chooseMode(c, world, percept);
            }

            computeAim(c, world, dt);
            steer(c, world);
        }
    }

    /* Grudge bookkeeping lives here rather than in the event loop so it can be
     * exercised without a DOM: kill a rival and it hunts you back, and any
     * rival that kills you respawns already looking for you. */
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
        roster: function () { return bots.roster; },
    };

})(window.LUMEN = window.LUMEN || {});
