/*
 * GULPER - the ENGULF sequence.
 *
 * This is the game.
 *
 *   PIN       break the will with LASH, or hold them with GRASP
 *   HOLD      keep them, and survive whatever comes to stop you
 *   SWALLOW   open up, take them in, and hope nothing interrupts
 *
 * The swallow is a one-point-one-second commitment during which you
 * cannot move, cannot attack, and can be shot. Everything the game is
 * about is packed into that one-point-one seconds.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var ST = S.STATE;

    S.Absorb = {
        /* Can this thing be swallowed right now? */
        canSwallow: function (world, e) {
            var p = world.player;
            if (!e || e.dead || e.removed) return false;
            if (e.heldBy !== p) return false;
            if (e.state === ST.prey.dead) return false;

            /* Too heavy is not a refusal, it is a mistake you are allowed
             * to make, and it is punished. */
            var gape = S.Body.effectiveGape(p);
            var tooBig = e.mass > gape;
            var range = C.engulf.promptRange + p.radius;

            var near = S.dist(p.x, p.y, e.x, e.y) <= range;
            return { ok: near, tooBig: tooBig, near: near, gape: gape };
        },

        /* The best candidate for a swallow right now, or null. */
        target: function (world) {
            var p = world.player;
            var best = null, bestD = Infinity;
            for (var i = 0; i < world.entities.length; i++) {
                var e = world.entities[i];
                if (e.dead || e.removed) continue;
                if (e.heldBy !== p) continue;
                var d = S.dist(p.x, p.y, e.x, e.y);
                if (d > C.engulf.promptRange + p.radius) continue;
                if (d < bestD) { bestD = d; best = e; }
            }
            return best;
        },

        /* Start a swallow. Returns an outcome string so the caller can
         * play the right sound and show the right text. */
        trySwallow: function (world) {
            var p = world.player;
            if (p.state === ST.player.swallowing) return "busy";
            if (p.state === ST.player.stunned || p.state === ST.player.choking) return "busy";
            if ((p.chokeCd || 0) > 0) return "busy";

            var e = S.Absorb.target(world);
            if (!e) return "none";

            var check = S.Absorb.canSwallow(world, e);
            if (!check.near) return "far";
            if (check.tooBig) {
                /* A boss that has stopped fighting can be culled. This is
                 * the fallback that keeps a boss level completable for a
                 * player who has not grown big enough to take it whole -
                 * and it is worth less than eating it, which is the
                 * point. */
                var canCull = (e.kind === "boss" || e.kind === "rival") && e.will <= 0.05;
                if (canCull) {
                    p.state = ST.player.swallowing;
                    p.swallowTarget = e;
                    p.swallowT = 0;
                    p.swallowStage = 0;
                    p.swallowCull = true;
                    p.swallowTotal = 1.8;
                    e.state = ST.prey.swallowed;
                    S.Audio.play("grab");
                    return "cull";
                }
                /* You tried to swallow something bigger than you. The
                 * consequences are immediate and instructive. */
                p.state = ST.player.choking;
                p.stateT = C.engulf.chokeTime;
                /* A cooldown, or the same too-big meal is attempted
                 * every frame and the level is nothing but choking. */
                p.chokeCd = C.engulf.chokeTime + 1.2;
                S.Body.loseMass(p, C.engulf.chokeMassLoss);
                S.Alarm.notice(world, C.engulf.chokeAlarm, true);
                S.Audio.play("choke");
                S.Combat.pop(world, e.x, e.y, "TOO BIG", 0xff8a5c, true);
                /* The prey escapes. */
                e.heldBy = null;
                e.down = false;
                e.will = 0.6;
                e.state = ST.prey.flee;
                p.gripping = null;
                if (p.state === ST.player.gripping) p.state = ST.player.idle;
                return "toobig";
            }

            /* Commit. */
            p.state = ST.player.swallowing;
            p.swallowTarget = e;
            p.swallowT = 0;
            p.swallowStage = 0;
            p.swallowCull = false;
            p.swallowTotal = C.engulf.swallowTime * (p.adapt.hollowgut ? 1.2 : 1);
            e.state = ST.prey.swallowed;
            S.Audio.play("grab");
            return "started";
        },

        /* The swallow timer. Called from the world update. */
        update: function (world, dt) {
            var p = world.player;
            p.chokeCd = Math.max(0, (p.chokeCd || 0) - dt);

            if (p.state === ST.player.choking) {
                p.stateT -= dt;
                if (p.stateT <= 0) p.state = ST.player.idle;
                return;
            }

            if (p.state !== ST.player.swallowing) {
                S.Absorb.updateHold(world, dt);
                return;
            }

            var e = p.swallowTarget;
            if (!e || e.dead || e.removed) {
                p.state = ST.player.idle;
                p.swallowTarget = null;
                return;
            }

            p.swallowT += dt;

            /* The prey struggles against the swallow. */
            var p2 = p.swallowT / p.swallowTotal;
            if (Math.random() < dt * 6 * (1 - p2)) {
                S.Particles.burst(world.particles, e.x, e.y, 14, 2, world.colors.gulp, {
                    speed: 26, life: 0.35, lift: 10
                });
            }

            /* Split Maw: the gulp has two stages, and you can be
             * interrupted between them. */
            var half = p.adapt.splitmaw ? p.swallowTotal * 0.55 : p.swallowTotal;

            if (p.adapt.splitmaw && p.swallowStage === 0 && p.swallowT >= half) {
                p.swallowStage = 1;
                p.swallowT = 0;
                p.swallowTotal = p.swallowTotal * 0.45;
                S.Audio.play("bulge");
                S.Combat.pop(world, p.x, p.y, "HALF", 0x8a95a3, false);
            }

            if (p.swallowT >= p.swallowTotal) {
                S.Absorb.complete(world, e);
            }
        },

        /* Holding: a gripped thing loses will steadily and tries to
         * break free if it is heavier than you can hold. */
        updateHold: function (world, dt) {
            var p = world.player;
            var e = p.gripping;
            if (!e) return;
            if (e.dead || e.removed) { p.gripping = null; return; }

            /* It is being eaten. That is unpleasant for it. */
            var drain = C.engulf.holdDrain * dt;
            if (p.adapt.venom) {
                e.hp -= 6 * dt;
                drain *= 1.4;
                if (e.hp <= 0) S.Combat.kill(world, e, {});
            }
            if (p.adapt.quickgrip) drain *= 1.6;
            S.Combat.willDamage(world, e, drain);

            /* Too heavy to hold. */
            var holdPower = p.hold * C.engulf.holdBreak;
            if (e.mass > holdPower) {
                e.escapeT = (e.escapeT || 0) + dt;
                var need = 1.6 + (e.mass - holdPower) * 0.5;
                if (e.escapeT >= need) {
                    S.Absorb.release(world, e, 160);
                    S.Alarm.notice(world, 12, true);
                    S.Audio.play("scream");
                    S.Combat.pop(world, e.x, e.y, "ESCAPED", 0xff8a5c, true);
                    return;
                }
            } else {
                e.escapeT = 0;
            }

            /* It drags itself along with you. */
            var ang = Math.atan2(e.y - p.y, e.x - p.x);
            var reach = (p.radius + 22);
            var tx = p.x + Math.cos(ang) * reach * 0.6;
            var ty = p.y + Math.sin(ang) * reach * 0.6;
            e.x = S.damp(e.x, tx, 12, dt);
            e.y = S.damp(e.y, ty, 12, dt);
        },

        /* Let go. With force it becomes a throw. */
        release: function (world, e, throwForce) {
            var p = world.player;
            if (e && e.heldBy === p) e.heldBy = null;
            if (p.gripping === e) {
                p.gripping = null;
                if (p.state === ST.player.gripping) p.state = ST.player.idle;
            }
            if (!e) return;
            e.down = false;
            e.will = Math.max(e.will, 0.45);
            e.state = ST.prey.flee;
            e.escapeT = 0;
            if (throwForce) {
                var ang = Math.atan2(e.y - p.y, e.x - p.x);
                e.vx += Math.cos(ang) * throwForce;
                e.vy += Math.sin(ang) * throwForce;
                e.stun = Math.max(e.stun || 0, 0.6);
                S.Combat.damage(world, e, 8, {});
            }
        },

        /* The swallow completes. */
        complete: function (world, e) {
            var p = world.player;
            p.state = ST.player.idle;
            p.swallowTarget = null;
            p.swallowStage = 0;

            if (e.heldBy === p) e.heldBy = null;
            if (p.gripping === e) p.gripping = null;

            var wasCull = p.swallowCull;
            p.swallowCull = false;

            e.state = ST.prey.swallowed;
            e.removed = true;
            e.dead = true;

            var gain = e.mass * C.growth.massToBiomass;
            if (p.adapt.digestion) gain *= 1.3;
            if (wasCull) gain *= 0.35;
            /* Absorbing a person makes noise and raises the alarm. This
             * is the cost of the growth that makes the next level
             * possible. */
            S.Alarm.notice(world, C.alarm.scream * 0.28, false);
            S.Alarm.notice(world, e.mass * 0.7, false);

            var events = S.Body.addMass(p, gain);
            p.swallowed++;
            world.stats.swallowed++;
            world.stats.massGained += gain;
            if (p.mass > world.stats.peakMass) world.stats.peakMass = p.mass;

            S.Storage.noteSwallow(e.typeId || "unknown", e.mass);
            S.Audio.play("gulp");
            S.Audio.play("bulge");
            S.Particles.burst(world.particles, e.x, e.y, 14, 20, world.colors.gulp, {
                speed: 60, life: 0.7, lift: 30, gravity: 40
            });

            /* The bulge travelling down the body. */
            p.bulge = { t: 0, dur: 0.55 };

            for (var i = 0; i < events.length; i++) {
                var ev = events[i];
                if (ev.type === "level") {
                    S.Combat.pop(world, p.x, p.y, "LV " + ev.level, 0xffd24a, true);
                    S.Audio.play("confirm");
                } else if (ev.type === "stage") {
                    S.Combat.pop(world, p.x, p.y, ev.stage.name.toUpperCase(), 0x8fbf5c, true);
                    S.Audio.play("win");
                    world.onStage && world.onStage(ev.stage);
                }
            }

            /* The objective hears about it. */
            world.onSwallow && world.onSwallow(e);
        },

        /* A thrown body is a weapon. This is not documented anywhere and
         * players should find it by accident. */
        throwBody: function (world, e) {
            var p = world.player;
            var ang = p.facing;
            e.vx += Math.cos(ang) * 260;
            e.vy += Math.sin(ang) * 260;
            e.down = false;
            e.will = Math.max(e.will, 0.5);
            e.stun = Math.max(e.stun || 0, 0.8);
            S.Absorb.release(world, e, 0);
            S.Audio.play("splat");
        }
    };
})(window.GU = window.GU || {});
