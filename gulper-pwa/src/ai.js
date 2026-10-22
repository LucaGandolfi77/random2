/*
 * GULPER - behaviour.
 *
 * Four kinds of mind in a level:
 *
 *   prey   walks, hears, sees, panics, screams
 *   foes   walk towards the last place they saw you and hit it
 *   rivals hunt, and are clever enough to be dangerous
 *   bosses are rivals with a bigger number and a worse temper
 *
 * Nobody here uses a navigation mesh. Everything steers directly at what
 * it wants and slides around whatever is in the way, which is enough for
 * a game where the interesting decisions are made by the player and not
 * by the pathfinder.
 */
(function (S) {
    "use strict";

    var ST = S.STATE;
    var C = S.CONFIG;

    /* Is this point lit? Lamps make pools, and the pools are how the
     * stealth levels work. */
    function lit(world, x, y) {
        var b = world.biome;
        if (b.darkness < 0.3) return true;
        for (var i = 0; i < world.props.length; i++) {
            var p = world.props[i];
            if (!p.light) continue;
            if (S.dist2(x, y, p.x, p.y) < 105 * 105) return true;
        }
        return false;
    }

    /* Line of sight between two points, blocked by solid scenery. */
    function hasLOS(world, ax, ay, bx, by) {
        var props = world.props;
        for (var i = 0; i < props.length; i++) {
            var p = props[i];
            if (!p.solid) continue;
            if (S.segDist2(ax, ay, bx, by, p.x, p.y) < (p.r + 6) * (p.r + 6)) return false;
        }
        return true;
    }

    /* How well can this entity see the player right now? */
    function sight(world, e) {
        var p = world.player;
        var d = S.dist(e.x, e.y, p.x, p.y);
        var range = e.sight || 160;
        if (!lit(world, e.x, e.y)) range *= 0.5;
        if (d > range) return 0;
        if (!hasLOS(world, e.x, e.y, p.x, p.y)) return 0;
        /* Close enough to hear you breathing. */
        if (d < 42) return 1;
        return S.clamp01(1 - (d - 42) / Math.max(1, range - 42));
    }

    function moveToward(e, tx, ty, speed, dt) {
        var dx = tx - e.x, dy = ty - e.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1) return;
        dx /= d; dy /= d;
        e.vx += (dx * speed - e.vx) * Math.min(1, dt * 8);
        e.vy += (dy * speed - e.vy) * Math.min(1, dt * 8);
    }

    function moveAway(e, tx, ty, speed, dt) {
        moveToward(e, e.x * 2 - tx, e.y * 2 - ty, speed, dt);
    }

    function wander(e, world, dt, speed) {
        e.wanderT = (e.wanderT || 0) - dt;
        if (e.wanderT <= 0 || !e.wanderX) {
            e.wanderT = 2 + world.rng.next() * 3;
            var a = world.rng.angle();
            var r = 60 + world.rng.next() * 140;
            e.wanderX = e.x + Math.cos(a) * r;
            e.wanderY = e.y + Math.sin(a) * r;
            e.wanderX = S.clamp(e.wanderX, world.arena.x + 16, world.arena.x + world.arena.w - 16);
            e.wanderY = S.clamp(e.wanderY, world.arena.y + 16, world.arena.y + world.arena.h - 16);
        }
        moveToward(e, e.wanderX, e.wanderY, speed, dt);
    }

    S.AI = {
        lit: lit,
        hasLOS: hasLOS,

        update: function (world, dt) {
            var list = world.entities;
            for (var i = 0; i < list.length; i++) {
                var e = list[i];
                if (e.dead || e.removed) continue;
                if (e.kind === "prey") S.AI.prey(world, e, dt);
                else if (e.kind === "foe") S.AI.foe(world, e, dt);
                else if (e.kind === "rival" || e.kind === "boss") S.AI.rival(world, e, dt);
            }
        },

        /* ===== prey ===== */
        prey: function (world, e, dt) {
            var p = world.player;

            if (e.heldBy) {
                e.vx = S.damp(e.vx, 0, 10, dt);
                e.vy = S.damp(e.vy, 0, 10, dt);
                return;
            }
            if (e.state === ST.prey.down) {
                e.downT -= dt;
                e.vx = S.damp(e.vx, 0, 10, dt);
                e.vy = S.damp(e.vy, 0, 10, dt);
                if (e.downT <= 0 && !e.heldBy) {
                    e.down = false;
                    e.will = 0.55;
                    e.state = ST.prey.flee;
                }
                return;
            }
            if (e.state === ST.prey.dead) return;

            /* Being seen. */
            var seen = 0;
            if (!p.adapt.mimic || e.alert > 0) seen = sight(world, e);
            if (p.adapt.ambusher) seen *= 0.6;

            if (seen > 0) {
                e.alert = Math.min(1, e.alert + seen * dt * 1.2);
                if (e.alert >= 0.55 && e.state !== ST.prey.flee && e.state !== ST.prey.panic) {
                    e.state = ST.prey.flee;
                    e.screamT = 0.4;
                    /* Somebody actually saw you. That is what holds the
                     * alarm up. The people who panic because somebody
                     * else panicked only make noise. */
                    S.Alarm.notice(world, C.alarm.seenByPrey, false);
                    S.Audio.play("scream");
                    /* The noise spreads. */
                    S.AI.panic(world, e, 1);
                }
            } else {
                e.alert = Math.max(0, e.alert - dt * 0.25);
            }

            var speed = (e.speed || 100) * world.biome.speed * (world.biome.lowG || 1);

            switch (e.state) {
                case ST.prey.wander:
                    wander(e, world, dt, speed * 0.32);
                    break;

                case ST.prey.suspicious:
                    wander(e, world, dt, speed * 0.5);
                    break;

                case ST.prey.flee:
                    /* Panicked people are not as fast as they think they
                     * are. The player has to be able to catch them, or
                     * the whole game is a walk. */
                    moveAway(e, p.x, p.y, speed * 0.85, dt);
                    e.screamT = (e.screamT || 0) - dt;
                    if (e.screamT <= 0) {
                        e.screamT = 4 + world.rng.next() * 3;
                        S.Audio.play("scream");
                        S.Alarm.add(world, 1.1, false);
                    }
                    /* Somebody stands their ground. */
                    if (e.fight > 0 && S.dist(e.x, e.y, p.x, p.y) < 34) {
                        e.hitCd = (e.hitCd || 0) - dt;
                        if (e.hitCd <= 0) {
                            e.hitCd = 1.2;
                            S.Combat.damagePlayer(world, e.fight, {});
                            S.Audio.play("lash");
                        }
                    }
                    break;

                case ST.prey.panic:
                    moveAway(e, p.x, p.y, speed * 1.1, dt);
                    break;

                case ST.prey.cower:
                    e.vx = S.damp(e.vx, 0, 8, dt);
                    e.vy = S.damp(e.vy, 0, 8, dt);
                    break;
            }
        },

        /* Panic spreads to the neighbours. One scream and half the street
         * knows where you are. */
        panic: function (world, source, depth) {
            if (depth > 2) return;
            var radius = C.prey.panicRadius;
            for (var i = 0; i < world.entities.length; i++) {
                var e = world.entities[i];
                if (e === source || e.kind !== "prey") continue;
                if (e.state === ST.prey.down || e.state === ST.prey.dead) continue;
                if (S.dist2(e.x, e.y, source.x, source.y) > radius * radius) continue;
                if (world.rng.next() > 0.55) continue;
                e.state = ST.prey.panic;
                e.alert = 1;
                e.screamT = (e.screamT || 0) - dt0();
                S.AI.panic(world, e, depth + 1);
            }
        },

        /* ===== foes ===== */
        foe: function (world, e, dt) {
            var p = world.player;
            e.cool = Math.max(0, (e.cool || 0) - dt);

            if (e.stun > 0) {
                e.vx = S.damp(e.vx, 0, 12, dt);
                e.vy = S.damp(e.vy, 0, 12, dt);
                return;
            }

            var sees = sight(world, e);
            if (sees > 0.2) {
                e.lastSeenX = p.x;
                e.lastSeenY = p.y;
                e.alert = 1;
            } else {
                e.alert = Math.max(0, (e.alert || 0) - dt * 0.12);
            }

            var tx = e.lastSeenX === undefined ? e.x : e.lastSeenX;
            var ty = e.lastSeenY === undefined ? e.y : e.lastSeenY;
            var speed = (e.speed || 80) * world.biome.speed;

            if (e.def.kind === "melee") {
                var d = S.dist(e.x, e.y, p.x, p.y);
                if (e.alert > 0.4 && d < (e.def.range || 28) + 8) {
                    e.vx = S.damp(e.vx, 0, 10, dt);
                    e.vy = S.damp(e.vy, 0, 10, dt);
                    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
                    if (e.cool <= 0) {
                        e.cool = e.def.cooldown;
                        S.Combat.damagePlayer(world, e.def.damage, {});
                        S.Audio.play("lash");
                        S.Particles.burst(world.particles, p.x, p.y, 12, 4, world.colors.impact, { speed: 60, life: 0.3 });
                    }
                } else if (e.alert > 0.4) {
                    moveToward(e, p.x, p.y, speed, dt);
                    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
                } else {
                    wander(e, world, dt, speed * 0.3);
                }
            } else if (e.def.kind === "rifle" || e.def.kind === "laser") {
                var keep = e.def.keepAway || 0;
                var dd = S.dist(e.x, e.y, p.x, p.y);
                if (e.alert > 0.4 && dd < (e.def.range || 220)) {
                    if (keep && dd < keep) {
                        moveAway(e, p.x, p.y, speed * 0.8, dt);
                    } else {
                        moveToward(e, p.x, p.y, speed * 0.5, dt);
                    }
                    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
                    if (e.cool <= 0 && hasLOS(world, e.x, e.y, p.x, p.y)) {
                        e.cool = e.def.cooldown;
                        S.World.spawnShot(world, e, "foe", e.def.damage, e.def.kind);
                        S.Audio.play("shot");
                        S.Alarm.notice(world, C.alarm.gunfire, false);
                    }
                } else if (e.alert > 0.4) {
                    moveToward(e, tx, ty, speed, dt);
                } else {
                    wander(e, world, dt, speed * 0.25);
                }
            } else if (e.def.kind === "flame") {
                var fd = S.dist(e.x, e.y, p.x, p.y);
                if (e.alert > 0.4 && fd < (e.def.range || 110)) {
                    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
                    e.vx = S.damp(e.vx, 0, 8, dt);
                    e.vy = S.damp(e.vy, 0, 8, dt);
                    if (e.cool <= 0) {
                        e.cool = e.def.cooldown;
                        S.World.spawnShot(world, e, "foe", e.def.damage, "flame");
                        S.Audio.play("inject");
                    }
                } else if (e.alert > 0.4) {
                    moveToward(e, p.x, p.y, speed, dt);
                } else {
                    wander(e, world, dt, speed * 0.3);
                }
            } else if (e.def.kind === "beam") {
                var bd = S.dist(e.x, e.y, p.x, p.y);
                if (e.alert > 0.4 && bd < (e.def.range || 300)) {
                    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
                    e.vx = S.damp(e.vx, 0, 8, dt);
                    e.vy = S.damp(e.vy, 0, 8, dt);
                    if (e.cool <= 0) {
                        e.cool = e.def.cooldown;
                        S.World.spawnShot(world, e, "foe", e.def.damage, "beam");
                        S.Audio.play("beam");
                    }
                } else if (e.alert > 0.4) {
                    moveToward(e, p.x, p.y, speed, dt);
                } else {
                    wander(e, world, dt, speed * 0.2);
                }
            }
        },

        /* ===== rivals ===== */
        rival: function (world, e, dt) {
            var p = world.player;
            e.cool = Math.max(0, (e.cool || 0) - dt);
            e.summonT = Math.max(0, (e.summonT || 0) - dt);

            /* Held. It is not doing anything about it. */
            if (e.heldBy) {
                e.vx = S.damp(e.vx, 0, 10, dt);
                e.vy = S.damp(e.vy, 0, 10, dt);
                return;
            }

            if (e.stun > 0) {
                e.vx = S.damp(e.vx, 0, 12, dt);
                e.vy = S.damp(e.vy, 0, 12, dt);
                return;
            }

            /* A Wraith hides among the people until it decides not to. */
            if (e.def.mimic && !e.revealed) {
                var dd = S.dist(e.x, e.y, p.x, p.y);
                if (dd < 46) {
                    e.revealed = true;
                    S.Audio.play("scream");
                    S.Alarm.notice(world, 6, false);
                } else {
                    wander(e, world, dt, (e.speed || 100) * 0.28);
                    return;
                }
            }

            /* Bosses and champions pick you over the crowd. */
            var target = p;
            var hunting = true;
            if (e.kind === "rival" && !e.def.boss) {
                /* Rivals also eat people, which is why they are dangerous:
                 * they thin out the population you need. */
                var prey = null, bestD = 260 * 260;
                for (var i = 0; i < world.entities.length; i++) {
                    var o = world.entities[i];
                    if (o.kind !== "prey" || o.dead || o.state === ST.prey.down) continue;
                    var d2 = S.dist2(o.x, o.y, e.x, e.y);
                    if (d2 < bestD) { bestD = d2; prey = o; }
                }
                if (prey && S.dist2(prey.x, prey.y, p.x, p.y) > 160 * 160) {
                    target = prey;
                    hunting = false;
                }
            }

            var dist = S.dist(e.x, e.y, target.x, target.y);
            var speed = (e.speed || 100) * world.biome.speed;

            /* Keep away when badly hurt. */
            if (e.hp < e.maxHp * 0.22 && e.kind === "rival") {
                moveAway(e, target.x, target.y, speed * 1.1, dt);
                e.facing = Math.atan2(target.y - e.y, target.x - e.x);
                return;
            }

            if (e.def.kind === "melee") {
                if (dist < (e.def.range || 34) + 6) {
                    e.vx = S.damp(e.vx, 0, 10, dt);
                    e.vy = S.damp(e.vy, 0, 10, dt);
                    e.facing = Math.atan2(target.y - e.y, target.x - e.x);
                    if (e.cool <= 0) {
                        e.cool = e.def.cooldown;
                        if (target === p) {
                            S.Combat.damagePlayer(world, e.def.damage, { stun: 0.25 });
                            S.Audio.play("lash");
                        } else {
                            S.Combat.damage(world, target, e.def.damage, {});
                            S.Combat.willDamage(world, target, 0.4);
                            target.down = true;
                            target.state = ST.prey.down;
                            target.downT = C.prey.downTime;
                            S.Alarm.notice(world, 8, false);
                        }
                    }
                } else {
                    moveToward(e, target.x, target.y, speed, dt);
                    e.facing = Math.atan2(target.x - e.x ? target.y - e.y : 0, target.x - e.x);
                }
            } else {
                if (dist < (e.def.range || 200) * 0.85) {
                    e.vx = S.damp(e.vx, 0, 8, dt);
                    e.vy = S.damp(e.vy, 0, 8, dt);
                    e.facing = Math.atan2(target.y - e.y, target.x - e.x);
                    if (e.cool <= 0) {
                        e.cool = e.def.cooldown;
                        if (target === p) {
                            S.World.spawnShot(world, e, "foe", e.def.damage, e.def.kind === "spit" ? "spit" : "rifle");
                            S.Audio.play("inject");
                        } else {
                            S.Combat.damage(world, target, e.def.damage, {});
                            S.Combat.willDamage(world, target, 0.35);
                        }
                    }
                } else {
                    moveToward(e, target.x, target.y, speed, dt);
                    e.facing = Math.atan2(target.y - e.y, target.x - e.x);
                }
            }

            /* The Screamer makes your own alarm worse. */
            if (e.def.scream && e.summonT <= 0) {
                e.summonT = 6;
                S.Alarm.notice(world, 12, false);
                S.Audio.play("scream");
            }

            /* The Brooder and the Matriarch make more of themselves. */
            if (e.def.spawns && e.summonT <= 0) {
                e.summonT = 7;
                var small = S.Species.rivals.smallling;
                for (var k = 0; k < 2; k++) {
                    var a = world.rng.angle();
                    S.World.spawnRival(world, small,
                        e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30);
                }
                S.Audio.play("bulge");
            }
            if (e.def.summons && e.summonT <= 0) {
                e.summonT = 8;
                S.World.spawnRival(world, S.Species.rivals.smallling,
                    e.x + world.rng.range(-40, 40), e.y + world.rng.range(-40, 40));
            }

            /* Bosses heal between exchanges, which is what makes them a
             * fight rather than a damage race. */
            if (e.def.heals && e.hp < e.maxHp) {
                e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
            }
        }
    };

    /* A tiny helper used above; kept separate so the panic function can
     * stay readable. */
    function dt0() { return 0.3 + Math.random() * 0.6; }
})(window.GU = window.GU || {});
