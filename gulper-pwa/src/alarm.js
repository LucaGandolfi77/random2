/*
 * GULPER - the alarm.
 *
 * One number. It rises when you are seen, when you hurt somebody, and
 * when you swallow. It falls when nobody has noticed you for a while.
 *
 * The thresholds are the difficulty curve of the whole game: at twenty
 * five a patrol car comes, at a hundred the Purifier comes and the level
 * is over. Everything you do is a trade between getting bigger and
 * staying unnoticed, and the alarm is the scoreboard for that trade.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    S.Alarm = {
        /* Raise the alarm. `loud` means it is worth a klaxon. */
        add: function (world, amount, loud) {
            if (amount <= 0) return;
            var before = world.alarm;
            world.alarm = S.clamp(world.alarm + amount * world.alarmMult, 0, C.alarm.max);
            world.stats.alarmPeak = Math.max(world.stats.alarmPeak, world.alarm);

            if (loud && before < C.alarm.max && world.alarm >= C.alarm.max) {
                S.Audio.play("alarm");
                world.lockdown = true;
                world.onLockdown && world.onLockdown();
            }
        },

        /*
         * Somebody noticed you.
         *
         * This is the only thing that stops the alarm from falling. A
         * scream in the distance raises it too, but it does not hold it
         * up: without this distinction the alarm ratchets upwards on
         * every noise and never comes back down, which turns the whole
         * mechanic into a countdown nobody can influence.
         */
        notice: function (world, amount, loud) {
            world.alarmSeenT = 0;
            S.Alarm.add(world, amount, loud);
        },

        /* The current escalation tier, derived from the alarm value. */
        tier: function (world) {
            var tiers = C.alarm.tiers;
            var cur = -1;
            for (var i = 0; i < tiers.length; i++) {
                if (world.alarm >= tiers[i].at) cur = i;
            }
            return cur;
        },

        update: function (world, dt) {
            /* Decay, but only once nobody has noticed you for a while. */
            world.alarmSeenT += dt;
            if (world.alarmSeenT > C.alarm.decayDelay) {
                world.alarm = Math.max(0, world.alarm - C.alarm.decay * dt);
            }

            /* Reinforcements. */
            var tier = S.Alarm.tier(world);
            world.alarmTier = tier;
            if (tier < 0) return;

            world.spawnT -= dt;
            if (world.spawnT > 0) return;
            var spec = C.alarm.tiers[tier];
            world.spawnT = C.alarm.spawnEvery;

            var foes = world.foes;
            if (foes.length >= spec.cap) return;
            /* The level may forbid a response entirely - some of the
             * early ones do, so the player can learn the swallow. */
            if (!world.level.foes && world.level.foes !== 0) return;
            if (world.level.foes === 0 && !world.bossLevel) return;

            var kind = S.Rng.prototype && null;
            var pick = world.rng.pick(spec.foes);
            var def = S.Species.foes[pick];
            if (!def) return;

            /* Come from off the edge of the world, out of the fog, at a
             * distance. Never from inside the player's view. */
            var ang = world.rng.angle();
            var spawnR = Math.max(world.arena.w, world.arena.h) * 0.62;
            var x = world.player.x + Math.cos(ang) * spawnR;
            var y = world.player.y + Math.sin(ang) * spawnR;
            x = S.clamp(x, world.arena.x + 20, world.arena.x + world.arena.w - 20);
            y = S.clamp(y, world.arena.y + 20, world.arena.y + world.arena.h - 20);

            S.World.spawnFoe(world, def, x, y);
        }
    };
})(window.GU = window.GU || {});
