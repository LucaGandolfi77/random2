/*
 * SECTOR 7 - modes.
 *
 * A mode is a sector variant, not a second world. Everything else about the
 * map is unchanged: same rocks, same station, same contract board. What
 * changes is the question. PATROL asks "how much can you bring home". WAVE
 * asks "can you last". HAUL asks "can you do it in a hundred and fifty
 * seconds".
 *
 * The run lives here and nowhere else. main.js owns the state machine and the
 * loop; this owns the rule, so the sim test can drive a whole mode headlessly
 * without dragging the browser layer in.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    /* The live run. Null in PATROL. */
    var run = null;

    function status() {
        if (!run) return { id: "patrol", active: false };
        return run;
    }

    function reset() { run = null; }

    function start(modeId, world, ship) {
        var def = S.mode(modeId);
        if (!def.id || def.id === "patrol") {
            run = null;
            return null;
        }
        if (!world || !world.player) return null;

        if (def.id === "wave") {
            /* The portal sits off the station on a seeded bearing, so a wave
             * run is different every time but recognisably the same map. */
            var a = world.rng() * Math.PI * 2;
            var d = world.size * (0.22 + world.rng() * 0.1);
            run = {
                id: "wave",
                active: true,
                state: "briefing",
                brief: 5,
                wave: 0,
                waves: def.waves,
                gap: def.gap,
                timer: 0,
                left: 0,
                killed: 0,
                /* Spawned-and-still-alive on the current wave. */
                out: 0,
                portal: {
                    x: S.clamp(world.station.x + Math.cos(a) * d, 260, world.size - 260),
                    y: S.clamp(world.station.y + Math.sin(a) * d, 260, world.size - 260),
                    r: 190,
                    pulse: 0,
                },
                reward: def.reward,
            };
            world.events.push({ type: "modeStart", mode: "wave", text: "PORTAL OPENING" });
        } else if (def.id === "haul") {
            run = {
                id: "haul",
                active: true,
                state: "running",
                timeLeft: def.time,
                time: def.time,
                payload: Math.max(1, Math.round((ship.holdMax || 200) * def.payload)),
                rewardMul: def.rewardMul,
                landed: 0,
            };
            world.events.push({ type: "modeStart", mode: "haul", text: "FILL THE HOLD" });
        }
        return run;
    }

    /* One tick. Returns the event list it produced rather than pushing onto
     * the world's queue itself, so a headless caller can drive a mode without
     * pretending to be main.js. */
    function update(dt, world, ship) {
        if (!run || !run.active) return null;
        var out = [];

        if (run.id === "wave") return updateWave(dt, world, ship, out);
        if (run.id === "haul") return updateHaul(dt, world, ship, out);
        return null;
    }

    function updateWave(dt, world, ship, out) {
        run.portal.pulse += dt;

        if (run.state === "briefing") {
            run.brief -= dt;
            if (run.brief <= 0) {
                run.state = "running";
                run.timer = 0;
            }
            return out;
        }
        if (run.state !== "running") return out;

        run.timer += dt;

        /* Count what is left of the wave: ships that carry this run's tag, so
         * ordinary sector population is not counted against the wave. */
        var left = 0;
        for (var i = 0; i < world.ships.length; i++) {
            var s = world.ships[i];
            if (s.waveRun && s.alive) left++;
        }
        run.left = left;

        if (run.wave === 0 && left === 0) {
            openWave(world);
            return out;
        }
        if (run.wave > 0 && left === 0) {
            run.wave++;
            if (run.wave > run.waves) {
                win(out, run.reward);
                return out;
            }
            run.timer = 0;
            /* The gap is the breath between waves, and it is also the window
             * in which the player banks what they just cleared. */
            openWave(world);
        }
        return out;
    }

    function openWave(world) {
        var def = S.mode("wave");
        run.wave++;
        var count = def.firstCount + (run.wave - 1) * def.perWave;
        var want = run.wave >= 4 ? run.wave - 3 : 1;

        for (var i = 0; i < count; i++) {
            var p = world.player;
            if (!p) break;
            var fac = def.faction || S.pickFaction(want, Math.random);
            var ship = S.NPCs.spawnOne(p, fac.key);
            if (!ship) break;
            /* Spawned at the portal, not by the ordinary spawner: a wave has
             * to arrive from somewhere the player can watch. */
            var a = Math.random() * Math.PI * 2;
            var r = run.portal.r * (0.6 + Math.random() * 0.5);
            ship.x = S.clamp(run.portal.x + Math.cos(a) * r, 60, world.size - 60);
            ship.y = S.clamp(run.portal.y + Math.sin(a) * r, 60, world.size - 60);
            ship.heading = Math.atan2(world.station.y - ship.y, world.station.x - ship.x);
            ship.aim = ship.heading;
            ship.waveRun = true;
            /* A wave comes straight for you. Standing around at the portal
             * would make the mode a waiting simulator. */
            ship.state = "attack";
            ship.target = world.player;
        }
        world.events.push({
            type: "waveOpen",
            mode: "wave",
            wave: run.wave,
            waves: run.waves,
            count: count,
            x: run.portal.x,
            y: run.portal.y,
            r: run.portal.r,
        });
    }

    function updateHaul(dt, world, ship, out) {
        if (run.state !== "running") return out;

        /* Only ticks while you are actually flying. Sitting at the station on
         * the clock would be a way to farm the timer. */
        if (ship && ship.alive && !ship.docked) run.timeLeft -= dt;

        /* Landing it. Dock with at least the payload and the run is yours. */
        if (ship && ship.docked && ship.hold >= run.payload) {
            run.landed = ship.hold;
            win(out, Math.round(run.landed * run.rewardMul));
            return out;
        }
        if (run.timeLeft <= 0) {
            run.state = "lost";
            out.push({ type: "modeLost", mode: "haul" });
            world.events.push({ type: "modeLost", mode: "haul" });
        }
        return out;
    }

    function win(out, crystals) {
        run.state = "won";
        run.active = false;
        run.payout = crystals;
        out.push({ type: "modeWon", mode: run.id, crystals: crystals });
        return out;
    }

    /* Called when the player dies: a wave run is over, and the reward is not
     * paid. A haul run simply stops. */
    function abort() {
        if (!run || !run.active) return null;
        run.state = "lost";
        run.active = false;
        return run;
    }

    S.Modes = {
        status: status,
        start: start,
        update: update,
        reset: reset,
        abort: abort,
        run: function () { return run; },
    };

})(window.S7 = window.S7 || {});