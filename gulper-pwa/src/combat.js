/*
 * GULPER - damage, will, and status effects.
 *
 * The important idea in this game is that a thing has TWO numbers: its
 * health, and its WILL. Health is how much punishment it can take. Will
 * is how hard it is to hold.
 *
 * You do not eat somebody by killing them. You eat them by breaking
 * their will, holding them, and then swallowing them whole. A soldier
 * with a full magazine is not food; a soldier who has stopped
 * struggling is.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    function pop(world, x, y, text, color, big) {
        if (!world.showDamage) return;
        world.player.popups.push({
            x: x, y: y, z: 26, text: String(text), color: color,
            life: big ? 1.1 : 0.75, big: !!big, vy: 18
        });
    }

    S.Combat = {
        pop: pop,

        /* Apply damage to any entity. */
        damage: function (world, e, amount, opts) {
            opts = opts || {};
            if (!e || e.dead || e.removed) return 0;
            if (amount <= 0) return 0;
            /* Something landed. A short buzz, so a phone player knows
             * the hit connected without looking away from the mouth. */
            S.Haptics && S.Haptics.pulse(e.kind === "player" ? 25 : 8);

            var armour = e.armour || 0;
            /* Weight is armour for the player as well as their genes:
             * a hide the size of a room turns a pistol round, though it
             * still stings. Take whichever layer is thicker. */
            if (e.kind === "player") armour = Math.max(armour, e.chitin);
            var dealt = Math.max(1, amount - armour);
            /* People are not killed by being hit. They are subdued, and
             * then they are eaten, which is the whole point of the game:
             * a corpse is evidence and feeds nobody. Only a blade kills
             * outright - and that is a real trade, because a corpse does
             * not count towards the objective. */
            if (e.kind === "prey" && !opts.lethal) dealt = Math.min(dealt, 1);
            e.hp -= dealt;
            e.hitFlash = 0.12;

            if (opts.corrode) {
                S.Combat.status(world, e, S.EFFECT.corrode, opts.corrode, opts.corrode * 3);
            }
            if (opts.bleed) {
                S.Combat.status(world, e, S.EFFECT.bleed, 3, 3.5);
            }
            if (opts.stun) {
                S.Combat.status(world, e, S.EFFECT.stun, opts.stun);
            }
            /* Damage to the player is interruptible and it cancels a
             * swallow in progress. That is the whole reason a gulp is
             * risky. */
            if (e.kind === "player") {
                world.player.hitFlash = 0.18;
                world.player.sinceHit = 0;
                if (opts.stun) S.Combat.status(world, e, S.EFFECT.stun, opts.stun);
                if (world.player.state === S.STATE.player.swallowing && (world.player.interruptCd || 0) <= 0) {
                    /* A cull is a committed act: it is longer than a
                     * swallow, and it is the only way to finish a boss
                     * you are too small to eat. It takes a real hit to
                     * stop it. */
                    var threshold = world.player.swallowCull
                        ? C.engulf.interruptDamage * 2.5
                        : C.engulf.interruptDamage;
                    if (dealt >= threshold) {
                        world.player.state = S.STATE.player.stunned;
                        /* The stun has to have a length, or the state
                         * never clears and the player is frozen for the
                         * rest of the level. */
                        world.player.stun = 0.5;
                        world.player.stateT = 0.5;
                        /* And a cooldown, or the same hit interrupts the
                         * same attempt over and over and the player can
                         * never finish anything. */
                        world.player.interruptCd = 1.6;
                        world.player.swallowTarget = null;
                        world.player.swallowStage = 0;
                        S.Audio.play("choke");
                        pop(world, e.x, e.y, "NO", 0xffd24a, true);
                    }
                }
            } else {
                pop(world, e.x, e.y, Math.round(dealt), opts.crit ? 0xffd24a : 0xe6e2d8, !!opts.crit);
            }

            if (e.hp <= 0 && e.kind !== "player") {
                e.hp = 0;
                S.Combat.kill(world, e, opts);
            }
            return dealt;
        },

        /* Break a thing's nerve. This is what actually makes it edible. */
        willDamage: function (world, e, amount) {
            if (!e || e.dead || e.removed) return;
            if (e.state === S.STATE.prey.dead) return;
            e.will = Math.max(0, e.will - amount);
            if (e.will <= 0 && !e.down) {
                e.down = true;
                e.downT = C.prey.downTime;
                /* A held thing stays held. It has stopped struggling,
                 * which is a different thing from being let go. */
                if (!e.heldBy) e.state = S.STATE.prey.down;
                e.vx = 0; e.vy = 0;
            }
        },

        /*
         * Apply a status effect.
         *
         * The two arguments mean different things for different effects:
         * for a stun the amount IS the duration, for a corrosion the
         * amount is the strength and the duration is how long it lasts.
         * Getting that wrong once cost an afternoon: the stun was set to
         * NaN, the countdown never ran, and the player was frozen for the
         * rest of the level.
         */
        status: function (world, e, kind, amount, duration) {
            if (!e) return;
            if (kind === S.EFFECT.stun) {
                var dur = amount || 0;
                e.stun = Math.max(e.stun || 0, dur);
                if (e.kind === "player") {
                    e.state = S.STATE.player.stunned;
                    e.stateT = dur;
                }
            } else if (kind === S.EFFECT.corrode) {
                e.corrode = Math.max(e.corrode || 0, amount);
                e.corrodeT = Math.max(e.corrodeT || 0, duration || 3);
            } else if (kind === S.EFFECT.bleed) {
                e.bleed = Math.max(e.bleed || 0, duration || 3);
            } else if (kind === S.EFFECT.burn) {
                e.burn = Math.max(e.burn || 0, duration || amount || 2);
            } else if (kind === S.EFFECT.chill) {
                e.chill = Math.max(e.chill || 0, duration || amount || 3);
            }
        },

        /* A thing stops being alive. For prey this is rare - most of them
         * are eaten, not killed - but soldiers do get killed, and that
         * makes a mess that other people find. */
        kill: function (world, e, opts) {
            opts = opts || {};
            if (e.dead) return;
            e.dead = true;
            e.state = S.STATE.prey.dead;
            e.vx = 0; e.vy = 0;
            e.deadT = 12;

            var color = world.colors.impact;
            S.Particles.burst(world.particles, e.x, e.y, 12, 14, color, {
                speed: 70, life: 0.5, size: 1, gravity: 90
            });
            S.Audio.play("splat");

            /* A rival that dies counts. The boss level is about the
             * boss, and it does not matter whether you took it whole or
             * cut it down - what matters is that it is over. */
            if (e.kind === "boss" || e.kind === "rival") {
                S.Body.addMass(world.player, e.mass * C.growth.massToBiomass * 0.5);
                world.onSwallow && world.onSwallow(e);
            }

            /* A dead body is evidence. Somebody will find it. */
            if (e.kind === "prey") {
                S.Alarm.notice(world, C.alarm.bodyFound * 0.5, true);
                world.bodyCount = (world.bodyCount || 0) + 1;
            }
            if (e.kind === "foe" || e.kind === "rival" || e.kind === "boss") {
                S.Audio.play("splat");
            }
        },

        /* Damage the player. */
        damagePlayer: function (world, amount, opts) {
            opts = opts || {};
            var p = world.player;
            if (p.state === S.STATE.player.downed) return;
            var dealt = S.Combat.damage(world, p, amount, opts);
            if (p.hp <= 0) {
                /* Second Wind: one free death per level. */
                if (p.adapt.secondwind && !p.secondWindUsed) {
                    p.secondWindUsed = true;
                    S.Body.loseMass(p, 0.66);
                    p.hp = p.maxHp * 0.5;
                    p.state = S.STATE.player.idle;
                    S.Audio.play("confirm");
                    pop(world, p.x, p.y, "SECOND WIND", 0x4fd18b, true);
                    return dealt;
                }
                S.Combat.downPlayer(world);
            }
            return dealt;
        },

        /* The player goes down. It is a setback, not a game over: you
         * come back smaller, and the level notices. */
        downPlayer: function (world) {
            var p = world.player;
            p.state = S.STATE.player.downed;
            p.downT = C.growth.respawnDelay;
            p.dead = false;
            p.vx = 0; p.vy = 0;
            p.hp = 1;
            S.Body.loseMass(p, C.growth.deathMassLoss);
            S.Audio.play("lose");
            S.Alarm.notice(world, 18, true);
            S.Storage.bump("deaths");

            /* You lose your grip on whatever you were holding. */
            if (p.gripping) {
                p.gripping.state = S.STATE.prey.flee;
                p.gripping.down = false;
                p.gripping.will = 0.5;
                p.gripping.heldBy = null;
                p.gripping = null;
            }
            S.Particles.burst(world.particles, p.x, p.y, 10, 22, world.colors.blood, {
                speed: 90, life: 0.7, gravity: 120
            });
        },

        /* Push an entity away from a point. */
        knockback: function (e, fromX, fromY, force) {
            var dx = e.x - fromX, dy = e.y - fromY;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            e.vx += (dx / d) * force;
            e.vy += (dy / d) * force;
        }
    };
})(window.GU = window.GU || {});
