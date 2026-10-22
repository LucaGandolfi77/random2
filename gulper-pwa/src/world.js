/*
 * GULPER - the simulation.
 *
 * Everything that moves, everything that can be eaten, and the rules of
 * the objective you are currently failing at. The renderer reads this
 * state and draws it; it never changes it.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var ST = S.STATE;

    /* Colours used for effects. They come from the biome palette so the
     * blood in the Foundry is the same blood as in the Ward. */
    function makeColors(biome) {
        var pal = S.Palette.get(biome.palette);
        function find(hex) { return S.Palette.snap(biome.palette, hex); }
        return {
            impact: find("#e2e6ea"),
            blood: find(biome.palette === "arctic" ? "#4a9aa8" : "#a33a32"),
            gulp: find(biome.palette === "ward" ? "#4fa87a" : "#8fbf5c"),
            chitin: find("#5e5158"),
            spark: find(biome.lamp),
            acid: find("#8fbf5c"),
            lamp: find(biome.lamp),
            lampGlow: find(biome.lampGlow)
        };
    }

    /* Does the straight line between these two points cross an electric
     * fence? Used by spawn code so that the targets a level assigns are
     * targets the player can actually walk to - a courier behind a wall
     * of electricity is not a courier, it is scenery. */
    function crossesFence(world, x0, y0, x1, y1) {
        function segOverlap(ax, ay, bx, by, cx, cy, dx, dy) {
            var r1 = bx - ax, r2 = by - ay;
            var s1 = dx - cx, s2 = dy - cy;
            var denom = r1 * s2 - r2 * s1;
            if (Math.abs(denom) < 1e-9) return false;
            var t = ((cx - ax) * s2 - (cy - ay) * s1) / denom;
            var u = ((cx - ax) * r2 - (cy - ay) * r1) / denom;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        }
        for (var i = 0; i < world.hazards.length; i++) {
            var h = world.hazards[i];
            if (h.kind !== "fence") continue;
            var ax, ay, bx, by;
            if (h.horizontal) {
                ax = h.x - h.len / 2; ay = h.y; bx = h.x + h.len / 2; by = h.y;
            } else {
                ax = h.x; ay = h.y - h.len / 2; bx = h.x; by = h.y + h.len / 2;
            }
            if (segOverlap(x0, y0, x1, y1, ax, ay, bx, by)) return true;
        }
        return false;
    }

    /* Pick a spawn spot that is not an impossible errand: a handful of
     * candidates, on the near side of the fences, closest first. */
    function reachableSpot(world, tries) {
        var best = null, bestScore = Infinity;
        for (var i = 0; i < tries; i++) {
            var pos = S.World.freeSpot(world, 150);
            var d = S.dist(world.player.x, world.player.y, pos.x, pos.y);
            var score = (crossesFence(world, world.player.x, world.player.y, pos.x, pos.y) ? 100000 : 0) + d;
            if (score < bestScore) { bestScore = score; best = pos; }
        }
        return best;
    }

    S.World = {
        /* Build a level. */
        create: function (levelId, opts) {
            opts = opts || {};
            var level = S.Levels.get(levelId);
            if (!level) return null;

            var biome = S.Biomes[level.biome];
            var seed = opts.seed !== undefined ? opts.seed : level.seed;
            var rng = S.Rng(seed);
            var arena = { x: 0, y: 0, w: C.arena.w, h: C.arena.h };

            var layout = S.Biomes.layout(level.biome, rng, arena, level.density);

            var world = {
                level: level,
                biome: biome,
                rng: rng,
                arena: arena,
                time: 0,
                timeLeft: level.objective.time || 0,
                props: layout.props,
                hazards: layout.hazards,
                entities: [],
                shots: [],
                beams: [],
                particles: S.Particles.create(),
                colors: makeColors(biome),
                status: "playing",
                alarm: 0,
                alarmMult: (opts.difficulty === "instinct" ? C.difficulty.instinct.alarm : 1) * (level.noise || 1),
                alarmSeenT: 999,
                alarmTier: -1,
                spawnT: C.alarm.spawnDelay,
                lockdown: false,
                foes: [],
                input: {
                    mx: 0, my: 0, mag: 0,
                    aimX: 0, aimY: 0, aimActive: false,
                    attack: false, attackHeld: false,
                    grab: false, swallow: false, swap: false,
                    frenzy: false, weapon: null
                },
                showDamage: opts.showDamage !== false,
                stats: { swallowed: 0, massGained: 0, alarmPeak: 0, peakMass: 0, damageTaken: 0 },
                bodyCount: 0,
                objective: {
                    type: level.objective.type,
                    count: 0,
                    need: level.objective.count || 1,
                    maxAlarm: level.objective.maxAlarm,
                    mistakes: 0,
                    extraction: null,
                    marked: {}
                },
                locked: false,
                message: null,
                messageT: 0
            };

            /* The player. */
            var p = S.Body.create({ genome: opts.genome || (S.Storage.data().genome || {}) }, opts.adaptations || []);
            p.x = arena.x + arena.w / 2;
            p.y = arena.y + arena.h / 2;
            p.weapons = opts.weapons || { lash: 1, grasp: 1 };
            p.slots = opts.slots || ["lash", "grasp"];
            p.current = p.slots[0];
            p.cooldown = 0;
            p.combo = 0;
            p.comboT = 0;
            p.gripCharge = 0;
            p.bulge = null;
            world.player = p;
            world.entryMass = p.mass;

            /* Weapons. */
            var save = S.Storage.data();
            p.tiers = {};
            for (var w = 0; w < p.slots.length; w++) {
                p.tiers[p.slots[w]] = save.weapons[p.slots[w]] || 1;
            }
            p.weaponTier = p.tiers;

            /* Populate. */
            S.World.populate(world);

            /* The extraction point, for the levels that need one. A corner
             * you cannot walk to is not an extraction, it is scenery: pick
             * the corner that no fence stands between, closest wins. */
            if (world.objective.type === "snatch") {
                var best = null, bestScore = Infinity;
                for (var cn = 0; cn < 4; cn++) {
                    var ex = arena.x + arena.w * (cn === 0 || cn === 3 ? 0.12 : 0.88);
                    var ey = arena.y + arena.h * (cn < 2 ? 0.14 : 0.86);
                    var cx = arena.x + arena.w / 2, cy = arena.y + arena.h / 2;
                    var score = (crossesFence(world, cx, cy, ex, ey) ? 100000 : 0) +
                        S.dist(cx, cy, ex, ey);
                    if (score < bestScore) { bestScore = score; best = { x: ex, y: ey }; }
                }
                world.objective.extraction = { x: best.x, y: best.y, r: 62 };
            }

            return world;
        },

        /* Fill the level with people, and with whatever else the level
         * calls for. */
        populate: function (world) {
            var level = world.level;
            var rng = world.rng;
            var preyIds = Object.keys(S.Species.prey);
            var count = level.prey || 0;

            for (var i = 0; i < count; i++) {
                var id = rng.pick(preyIds);
                var def = S.Species.prey[id];
                var pos = S.World.freeSpot(world, 150);
                S.World.spawnPrey(world, def, pos.x, pos.y);
            }

            /* Marked targets. */
            if (world.objective.type === "elite") {
                var n = level.objective.count || 1;
                for (var e = 0; e < n; e++) {
                    var spot = reachableSpot(world, 6);
                    var elite = S.World.spawnPrey(world, S.Species.prey.officer, spot.x, spot.y);
                    elite.mass = 3;
                    elite.hp = elite.maxHp = 90;
                    elite.fight = 16;
                    elite.speed = 116;
                    elite.elite = true;
                    elite.marked = true;
                    elite.def = S.Species.prey.officer;
                    elite.name = "The Marked";
                    elite.bio = "Somebody sent for this one specifically.";
                    world.objective.marked[elite.id] = true;
                }
            }
            if (world.objective.type === "cull") {
                var need = level.objective.count || 5;
                var prey = world.entities.filter(function (x) { return x.kind === "prey"; });
                rng.shuffle(prey);
                var reachable = [];
                for (var pc = 0; pc < prey.length; pc++) {
                    if (!crossesFence(world, world.player.x, world.player.y, prey[pc].x, prey[pc].y)) {
                        reachable.push(prey[pc]);
                    }
                }
                var reconsider = reachable.length >= need ? reachable : prey;
                for (var c = 0; c < Math.min(need, reconsider.length); c++) {
                    reconsider[c].marked = true;
                    reconsider[c].mass = 2;
                    world.objective.marked[reconsider[c].id] = true;
                }
            }
            if (world.objective.type === "snatch") {
                var spec = S.World.spawnPrey(world, S.Species.prey.chef,
                    reachableSpot(world, 6).x, reachableSpot(world, 6).y);
                spec.mass = 4;
                spec.hp = spec.maxHp = 70;
                spec.speed = 70;
                spec.marked = true;
                spec.name = "The Specimen";
                spec.bio = "It is already in a bag. The bag is the problem.";
                spec.carryOnly = true;
                world.objective.marked[spec.id] = true;
                world.objective.specimen = spec.id;
            }

            /* Rivals. */
            var rivalCount = level.rivals || 0;
            var rivalIds = ["wraith", "brooder", "screamer", "champion"];
            for (var r = 0; r < rivalCount; r++) {
                var rid = rivalIds[(rng.int(0, rivalIds.length - 1) + r) % rivalIds.length];
                var rpos = S.World.freeSpot(world, 260);
                S.World.spawnRival(world, S.Species.rivals[rid], rpos.x, rpos.y);
            }

            /* The boss. */
            if (level.boss && level.bossId) {
                var bdef = S.Species.bosses[level.bossId];
                var bx = arenaSafeX(world), by = arenaSafeY(world);
                var boss = S.World.spawnRival(world, bdef, bx, by);
                boss.kind = "boss";
                boss.isBoss = true;
                boss.maxWill = 4;
                boss.will = 4;
                boss.name = bdef.name;
                world.boss = boss;
                world.bossLevel = true;
            }

            /* A few soldiers to begin with on the harder levels. */
            var foeCount = level.foes || 0;
            for (var f = 0; f < foeCount; f++) {
                var fid = rng.pick(["cop", "swat", "rifleman"]);
                var fpos = S.World.freeSpot(world, 300);
                S.World.spawnFoe(world, S.Species.foes[fid], fpos.x, fpos.y);
            }
        },

        /* A position that is not on top of anything. */
        freeSpot: function (world, minFromPlayer) {
            var rng = world.rng;
            for (var i = 0; i < 24; i++) {
                var x = rng.range(world.arena.x + 30, world.arena.x + world.arena.w - 30);
                var y = rng.range(world.arena.y + 30, world.arena.y + world.arena.h - 30);
                if (minFromPlayer && S.dist(x, y, world.player.x, world.player.y) < minFromPlayer) continue;
                var clear = true;
                for (var p = 0; p < world.props.length; p++) {
                    var pr = world.props[p];
                    if (S.dist2(x, y, pr.x, pr.y) < (pr.r + 16) * (pr.r + 16)) { clear = false; break; }
                }
                if (clear) return { x: x, y: y };
            }
            return {
                x: rng.range(world.arena.x + 40, world.arena.x + world.arena.w - 40),
                y: rng.range(world.arena.y + 40, world.arena.y + world.arena.h - 40)
            };
        },

        /* ===== spawning ===== */
        nextId: 1,

        spawnPrey: function (world, def, x, y) {
            var e = {
                id: S.World.nextId++,
                kind: "prey",
                typeId: def.id,
                def: def,
                name: def.name,
                bio: def.bio,
                x: x, y: y, vx: 0, vy: 0,
                facing: world.rng.angle(),
                r: def.r,
                mass: def.mass,
                hp: def.hp, maxHp: def.hp,
                will: 1, maxWill: 1,
                speed: def.speed,
                sight: def.sight,
                fight: def.fight || 0,
                state: ST.prey.wander,
                alert: 0,
                down: false, downT: 0, dead: false, removed: false,
                heldBy: null,
                wanderT: world.rng.range(0, 3),
                marked: false,
                anim: world.rng.range(0, 6)
            };
            world.entities.push(e);
            return e;
        },

        spawnFoe: function (world, def, x, y) {
            var hp = Math.round(def.hp * (world.level.foeHpMult || 1));
            var e = {
                id: S.World.nextId++,
                kind: "foe",
                typeId: def.id,
                def: def,
                name: def.name,
                x: x, y: y, vx: 0, vy: 0,
                facing: world.rng.angle(),
                r: def.r,
                mass: def.mass,
                hp: hp, maxHp: hp,
                will: 1, maxWill: 1,
                speed: def.speed,
                sight: def.sight,
                state: ST.prey.wander,
                alert: 0, cool: world.rng.range(0, 1),
                down: false, downT: 0, dead: false, removed: false,
                heldBy: null,
                anim: world.rng.range(0, 6)
            };
            world.entities.push(e);
            world.foes.push(e);
            return e;
        },

        spawnRival: function (world, def, x, y) {
            var e = {
                id: S.World.nextId++,
                kind: "rival",
                typeId: def.id,
                def: def,
                name: def.name,
                x: x, y: y, vx: 0, vy: 0,
                facing: world.rng.angle(),
                r: def.r,
                mass: def.mass,
                hp: def.hp, maxHp: def.hp,
                will: def.maxWill || 1.4,
                maxWill: def.maxWill || 1.4,
                speed: def.speed,
                sight: def.sight,
                state: ST.prey.wander,
                alert: 0, cool: world.rng.range(0, 1),
                down: false, downT: 0, dead: false, removed: false,
                heldBy: null,
                anim: world.rng.range(0, 6)
            };
            world.entities.push(e);
            return e;
        },

        spawnShot: function (world, from, team, damage, kind) {
            var ang = from.facing;
            var speed = kind === "beam" ? 900 : (kind === "flame" ? 260 : 460);
            world.shots.push({
                x: from.x + Math.cos(ang) * (from.r + 6),
                y: from.y + Math.sin(ang) * (from.r + 6),
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                life: kind === "beam" ? 0.18 : 1.3,
                team: team,
                kind: kind || "rifle",
                damage: damage,
                r: kind === "flame" ? 9 : (kind === "beam" ? 7 : 3),
                will: 0,
                corrode: 0
            });
        },

        /* ===== the update ===== */
        update: function (world, dt) {
            if (world.status !== "playing") return;
            world.time += dt;

            S.World.updatePlayer(world, dt);
            S.World.updateEntities(world, dt);
            S.World.updateShots(world, dt);
            S.World.updateHazards(world, dt);
            S.Alarm.update(world, dt);
            S.Absorb.update(world, dt);
            S.Particles.update(world.particles, dt);
            S.World.updateObjective(world, dt);
            S.World.updatePopups(world, dt);

            /* Cleanup. */
            for (var i = world.entities.length - 1; i >= 0; i--) {
                var e = world.entities[i];
                if (e.removed) { world.entities.splice(i, 1); continue; }
                if (e.dead && e.kind === "prey") {
                    e.deadT -= dt;
                    if (e.deadT <= 0) { world.entities.splice(i, 1); }
                }
            }
            for (var f = world.foes.length - 1; f >= 0; f--) {
                if (world.foes[f].removed || world.foes[f].dead) world.foes.splice(f, 1);
            }

            /* Being hollowed out ends the level. */
            var p = world.player;

            /* The growth chart tracks the whole shape of a run, not just
             * the moments that happen to involve a swallow: a level that
             * ends in a good boss fight has grown you too. */
            if (p.mass > world.stats.peakMass) world.stats.peakMass = p.mass;

            if (p.state !== ST.player.downed &&
                p.mass < world.entryMass * (1 - C.growth.deathPenalty)) {
                S.World.fail(world, "You were hollowed out.");
                return;
            }

            /* ENDLESS NIGHT: the district keeps producing. */
            if (world.endless) {
                world.endlessT -= dt;
                if (world.endlessT <= 0) {
                    world.endlessT = Math.max(1.6, 5.5 - world.endlessWave * 0.35);
                    world.endlessWave++;
                    var preyIds = Object.keys(S.Species.prey);
                    var n = 1 + Math.min(3, Math.floor(world.endlessWave / 3));
                    for (var q = 0; q < n; q++) {
                        var pos = S.World.freeSpot(world, 140);
                        var e = S.World.spawnPrey(world, S.Species.prey[world.rng.pick(preyIds)], pos.x, pos.y);
                        e.mass = 1 + Math.min(3, Math.floor(world.endlessWave / 6));
                    }
                    /* And the response, which gets braver. */
                    if (world.endlessWave % 3 === 0) {
                        var foeIds = ["cop", "swat", "rifleman", "heavy"];
                        var fp = S.World.freeSpot(world, 320);
                        S.World.spawnFoe(world, S.Species.foes[world.rng.pick(foeIds)], fp.x, fp.y);
                    }
                    if (world.endlessWave % 9 === 0) {
                        var rp = S.World.freeSpot(world, 320);
                        S.World.spawnRival(world, S.Species.rivals.champion, rp.x, rp.y);
                    }
                }
            }
        },

        updatePopups: function (world, dt) {
            var list = world.player.popups;
            for (var i = list.length - 1; i >= 0; i--) {
                var p = list[i];
                p.life -= dt;
                p.z += p.vy * dt;
                p.vy *= 0.92;
                if (p.life <= 0) list.splice(i, 1);
            }
        },

        /* ===== the player ===== */
        updatePlayer: function (world, dt) {
            var p = world.player;
            var inp = world.input;

            /* Downed: you wait. */
            if (p.state === ST.player.downed) {
                p.downT -= dt;
                p.vx = S.damp(p.vx, 0, 8, dt);
                p.vy = S.damp(p.vy, 0, 8, dt);
                p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.downT <= 0) {
                    p.state = ST.player.idle;
                    p.hp = p.maxHp * 0.6;
                    var spot = S.World.freeSpot(world, 200);
                    p.x = spot.x; p.y = spot.y;
                }
                return;
            }

            /* Aim. */
            var aimAngle = p.facing;
            if (inp.aimActive) {
                var dx = inp.aimX - p.x, dy = inp.aimY - p.y;
                if (dx * dx + dy * dy > 4) aimAngle = Math.atan2(dy, dx);
            }

            /* Aim assist: on touch, a snap toward the nearest thing worth
             * hitting. It is the difference between a fair game and a
             * frustrating one on a screen you cannot put a cursor on. */
            if (world.aimAssist) {
                var best = null, bestScore = Infinity;
                for (var i = 0; i < world.entities.length; i++) {
                    var e = world.entities[i];
                    if (e.dead || e.removed) continue;
                    var d = S.dist(p.x, p.y, e.x, e.y);
                    if (d > 140) continue;
                    var a = Math.atan2(e.y - p.y, e.x - p.x);
                    var diff = Math.abs(S.angleDelta(aimAngle, a));
                    if (diff > 0.6) continue;
                    var score = diff * 60 + d * 0.25;
                    if (score < bestScore) { bestScore = score; best = a; }
                }
                if (best !== null) aimAngle = best;
            }
            p.facing = S.angleLerp(p.facing, aimAngle, 1 - Math.exp(-16 * dt));

            /* Movement. */
            var canMove = p.state === ST.player.idle || p.state === ST.player.gripping;
            var speed = p.speed * world.biome.speed * (world.biome.lowG || 1);
            /* Bigger is faster. It is not balanced - it is right. A thing
             * that has eaten a hundred people should move like it. */
            speed *= 1 + Math.min(0.45, Math.max(0, (p.mass - C.player.mass) / 700));
            if (p.adapt.adrenaline && p.mass < world.entryMass * 0.6) speed *= 1.25;
            if (p.frenzy) speed *= C.player.frenzySpeed;

            if (canMove) {
                var mx = inp.mx, my = inp.my;
                var mag = Math.sqrt(mx * mx + my * my);
                if (mag > 1) { mx /= mag; my /= mag; mag = 1; }
                var targetVx = mx * speed, targetVy = my * speed;
                p.vx = S.damp(p.vx, targetVx, 14, dt);
                p.vy = S.damp(p.vy, targetVy, 14, dt);
            } else {
                p.vx = S.damp(p.vx, 0, 12, dt);
                p.vy = S.damp(p.vy, 0, 12, dt);
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            S.World.resolve(world, p);

            /* Stamina. */
            p.staminaCd = Math.max(0, p.staminaCd - dt);
            if (p.staminaCd <= 0) {
                p.stamina = Math.min(p.staminaMax, p.stamina + C.player.staminaRegen * dt);
            }

            /* Frenzy. It burns biomass, and when the biomass runs out the
             * frenzy stops. It never runs out of your life. */
            var wantFrenzy = inp.frenzy && p.mass > 6;
            if (wantFrenzy && !p.frenzy) {
                p.frenzy = true;
                S.Audio.play("confirm");
            } else if (!wantFrenzy && p.frenzy) {
                p.frenzy = false;
            }
            if (p.frenzy) {
                S.Body.loseMass(p, (C.player.frenzyDrain * dt) / Math.max(1, p.mass));
                if (p.mass <= 5) p.frenzy = false;
            }

            /* Regeneration, and the slow recovery of a creature that
             * has not been hurt for a while. A lull is a resource. */
            p.sinceHit = (p.sinceHit || 0) + dt;
            if (p.hp < p.maxHp && p.hitFlash <= 0) {
                var rest = p.sinceHit > 3 ? 3 : 1;
                p.hp = Math.min(p.maxHp, p.hp + p.regen * rest * dt);
            }
            p.hitFlash = Math.max(0, p.hitFlash - dt);

            /* Cooldowns. */
            p.cooldown = Math.max(0, p.cooldown - dt);
            p.comboT = Math.max(0, p.comboT - dt);
            if (p.comboT <= 0) p.combo = 0;
            p.animT = (p.animT || 0) + dt;

            /* The bulge travelling down the body after a swallow. */
            if (p.bulge) {
                p.bulge.t += dt;
                if (p.bulge.t > p.bulge.dur) p.bulge = null;
            }

            /* Status effects. */
            p.interruptCd = Math.max(0, (p.interruptCd || 0) - dt);
            if (p.stun > 0) {
                p.stun -= dt;
                if (p.stun <= 0 && p.state === ST.player.stunned) p.state = ST.player.idle;
            }
            if (p.corrode > 0) {
                p.corrodeT -= dt;
                p.hp -= p.corrode * 6 * dt;
                if (p.corrodeT <= 0) p.corrode = 0;
            }

            /* Weapon actions. */
            if (inp.swap) {
                p.current = p.current === p.slots[0] ? p.slots[1] : p.slots[0];
                inp.swap = false;
                S.Audio.play("ui");
            }
            if (inp.weapon && inp.weapon !== p.current && p.slots.indexOf(inp.weapon) >= 0) {
                p.current = inp.weapon;
                inp.weapon = null;
                S.Audio.play("ui");
            }

            if (inp.attack || inp.attackHeld) {
                S.World.fire(world, p.current);
            }
            inp.attack = false;

            if (inp.grab) {
                /* Grab is the same as attack for the grip weapon. */
                if (p.current === "grasp") S.World.fire(world, "grasp");
                inp.grab = false;
            }
            if (inp.swallow) {
                S.Absorb.trySwallow(world);
                inp.swallow = false;
            }
        },

        /* ===== firing ===== */
        fire: function (world, weaponId) {
            var p = world.player;
            if (p.state === ST.player.swallowing || p.state === ST.player.downed) return;
            if (p.state === ST.player.stunned) return;

            var tier = p.tiers[weaponId] || 1;
            var w = S.Weapons.stats(weaponId, tier);
            if (!w) return;

            /* The weapon's reach is scaled by the size of the body that
             * is holding it. A tentacle on a colossum is not the same
             * length as a tentacle on a larva, and without this the big
             * end of the game was fought at arm's length. */
            w.reach = Math.round(w.reach * (p.reach / C.player.reach));

            /* Siphon is a channel: it runs while the button is held. */
            if (w.mode === "channel") {
                S.World.siphon(world, w);
                return;
            }

            if (p.cooldown > 0) return;
            if (p.stamina < w.stamina) return;

            /* Charging weapons need the button held for a moment. */
            if (w.mode === "charge") {
                p.cooldown = w.cooldown + w.chargeTime;
                if (w.stamina) {
                    p.stamina -= w.stamina;
                    p.staminaCd = C.player.staminaDelay;
                }
            } else {
                p.cooldown = w.cooldown;
                if (w.stamina) {
                    p.stamina -= w.stamina;
                    p.staminaCd = C.player.staminaDelay;
                }
            }

            var dmgMul = p.frenzy ? C.player.frenzyDamage : 1;
            var angle = p.facing;

            switch (w.mode) {
                case "combo":
                    S.World.combo(world, w, angle, dmgMul);
                    break;
                case "grip":
                    S.World.grip(world, w, angle, dmgMul);
                    break;
                case "projectile":
                    S.World.acid(world, w, angle, dmgMul);
                    break;
                case "radial":
                    S.World.shock(world, w, dmgMul);
                    break;
                case "charge":
                    /* The scythe lands in one motion. It is slow and it
                     * hurts, which is the whole bargain. */
                    S.World.sweep(world, w, angle, dmgMul * 1.4);
                    p.attackFx = { t: 0.22, arc: w.arc, extend: 1.1, color: "#e3975a" };
                    S.Audio.play("blade");
                    break;
            }
        },

        /* LASH: a fast three-hit sequence. */
        combo: function (world, w, angle, dmgMul) {
            var p = world.player;
            var idx = Math.min(p.combo, (w.combo || 3) - 1);
            p.combo = (p.combo + 1) % (w.combo || 3);
            p.comboT = 0.7;

            var will = (w.comboWill && w.comboWill[idx]) || w.will;
            var dmg = (w.comboDamage && w.comboDamage[idx]) || w.damage;
            S.World.sweep(world, {
                reach: w.reach, arc: w.arc, knock: w.knock,
                damage: dmg * dmgMul, will: will,
                bleed: p.adapt.barbed
            }, angle, 1);
            p.attackFx = { t: 0.16, arc: w.arc, extend: 0.95, color: "#e2e6ea" };
            S.Audio.play("lash");
        },

        /* GRASP: reach out and hold on. */
        grip: function (world, w, angle, dmgMul) {
            var p = world.player;
            var hit = S.World.sweep(world, {
                reach: w.reach, arc: w.arc, knock: w.knock,
                damage: w.damage * dmgMul, will: w.will, grip: true
            }, angle, 1);
            p.attackFx = { t: 0.2, arc: w.arc, extend: 1.0, color: "#8a95a3" };
            if (hit) {
                S.Audio.play("grab");
            } else {
                S.Audio.play("lash");
            }
        },

        /* INJECT: a gobbet of acid. */
        acid: function (world, w, angle, dmgMul) {
            var p = world.player;
            world.shots.push({
                x: p.x + Math.cos(angle) * (p.radius + 6),
                y: p.y + Math.sin(angle) * (p.radius + 6),
                vx: Math.cos(angle) * w.projectileSpeed,
                vy: Math.sin(angle) * w.projectileSpeed,
                life: 1.1, team: "player", kind: "acid",
                damage: w.damage * dmgMul, r: 4,
                will: w.will, corrode: w.corrode
            });
            S.Audio.play("inject");
        },

        /* SHOCK: a pulse of nerve current, paid for in your own mass. */
        shock: function (world, w, dmgMul) {
            var p = world.player;
            if (p.mass <= w.massCost + 2) return;
            S.Body.loseMass(p, w.massCost / Math.max(1, p.mass));

            for (var i = 0; i < world.entities.length; i++) {
                var e = world.entities[i];
                if (e.dead || e.removed) continue;
                if (S.dist2(p.x, p.y, e.x, e.y) > w.reach * w.reach) continue;
                S.Combat.damage(world, e, w.damage * dmgMul, { stun: w.stun });
                S.Combat.willDamage(world, e, w.will);
                S.Combat.knockback(e, p.x, p.y, w.knock);
            }
            S.Audio.play("shock");
            p.attackFx = { t: 0.3, arc: 6.2832, extend: 1.0, color: "#38c4cf" };
            S.Particles.burst(world.particles, p.x, p.y, 14, 26, world.colors.spark, {
                speed: 140, life: 0.35, lift: 12, gravity: 20
            });
            /* A shockwave is loud. */
            S.Alarm.notice(world, 8, false);
        },

        /* A sweep of the tentacles through an arc. Returns the first
         * thing it hit. */
        sweep: function (world, w, angle, mul) {
            var p = world.player;
            var hit = null;
            var bestD = Infinity;

            /* Everything in the arc, nearest first. A lash can cut
             * several people at once, but a grip takes the closest one -
             * otherwise the arm grabs whatever happens to be at the edge
             * of the swing, which is not the same thing as what the
             * player was aiming at. */
            var caught = [];
            for (var i = 0; i < world.entities.length; i++) {
                var e = world.entities[i];
                if (e.dead || e.removed) continue;
                if (e.heldBy === p) continue;
                var d = S.dist(p.x, p.y, e.x, e.y);
                if (d > w.reach + e.r) continue;
                var a = Math.atan2(e.y - p.y, e.x - p.x);
                if (Math.abs(S.angleDelta(angle, a)) > w.arc / 2) continue;
                caught.push({ e: e, d: d, a: a });
            }
            caught.sort(function (x, y) { return x.d - y.d; });

            for (var c = 0; c < caught.length; c++) {
                var ent = caught[c].e;
                var dist = caught[c].d;
                var ang = caught[c].a;

                /* A bigger creature hits harder, and breaks a nerve
                 * faster. Both numbers scale with the body, which is
                 * what makes growing feel like growing. */
                var power = p.power || 1;
                S.Combat.damage(world, ent, (w.damage || 0) * mul * power, { bleed: w.bleed, lethal: w.lethal });
                if (w.will) S.Combat.willDamage(world, ent, w.will * (1 + (power - 1) * 0.4));
                if (w.knock) S.Combat.knockback(ent, p.x, p.y, w.knock);
                S.Particles.burst(world.particles, ent.x, ent.y, 12, 3, world.colors.impact, {
                    speed: 70, life: 0.3, angle: ang, spread: 1.2
                });

                /* GRASP takes hold. It works on anything that is not
                 * already held, including something whose nerve has
                 * already been broken - which is the whole point of the
                 * sequence: LASH breaks the will, GRASP keeps them.
                 *
                 * A boss can only be taken once it has stopped fighting,
                 * so the grip on it is a reward rather than a shortcut. */
                if (w.grip && !ent.heldBy && (ent.kind !== "boss" || ent.will <= 0.05)) {
                    ent.heldBy = p;
                    ent.state = ST.prey.held;
                    ent.will = Math.min(ent.will, 0.9);
                    p.gripping = ent;
                    p.state = ST.player.gripping;
                    S.Combat.pop(world, ent.x, ent.y, "HELD", 0x8a95a3, false);
                    /* One tendril, one victim. Two arms on two people
                     * would be a power the game does not have. */
                    break;
                }
                if (dist < bestD) { bestD = dist; hit = ent; }
            }
            return hit;
        },

        /* SIPHON: drink a person from a distance. */
        siphon: function (world, w) {
            var p = world.player;
            var target = null, bestD = Infinity;
            for (var i = 0; i < world.entities.length; i++) {
                var e = world.entities[i];
                if (e.dead || e.removed) continue;
                if (e.kind !== "prey" && e.kind !== "rival") continue;
                var d = S.dist(p.x, p.y, e.x, e.y);
                if (d > w.reach) continue;
                var a = Math.atan2(e.y - p.y, e.x - p.x);
                if (Math.abs(S.angleDelta(p.facing, a)) > 0.5) continue;
                if (d < bestD) { bestD = d; target = e; }
            }
            if (!target) return;

            var gain = w.drain * 0.016;
            S.Body.addMass(p, gain);
            S.Combat.willDamage(world, target, w.will * 0.016);
            /* The siphon drinks, it does not kill. */
            target.hp -= 1.5 * 0.016;
            if (target.hp <= 0) S.Combat.kill(world, target, {});

            if (!p.adapt.siphonsacs) S.Alarm.notice(world, w.alarm * 0.016, false);

            S.Particles.burst(world.particles, target.x, target.y, 12, 1, world.colors.gulp, {
                speed: 40, life: 0.5, angle: Math.atan2(p.y - target.y, p.x - target.x), spread: 0.6
            });
            p.siphonTarget = target;
        },

        /* ===== entities ===== */
        updateEntities: function (world, dt) {
            var list = world.entities;
            for (var i = 0; i < list.length; i++) {
                var e = list[i];
                if (e.dead || e.removed) continue;

                /* Status effects. */
                if (e.stun > 0) e.stun -= dt;
                if (e.bleed > 0) {
                    e.bleed -= dt;
                    e.hp -= 3.5 * dt;
                    if (e.hp <= 0) S.Combat.kill(world, e, {});
                }
                if (e.burn > 0) {
                    e.burn -= dt;
                    e.hp -= 7 * dt;
                    if (e.hp <= 0) S.Combat.kill(world, e, {});
                }
                if (e.corrode > 0) {
                    e.corrodeT -= dt;
                    e.hp -= e.corrode * 5 * dt;
                    if (e.corrodeT <= 0) e.corrode = 0;
                }
                if (e.chill > 0) e.chill -= dt;
                if (e.down && e.kind !== "boss") {
                    e.downT -= dt;
                    if (e.downT <= 0 && !e.heldBy) {
                        e.down = false;
                        e.will = 0.5;
                        e.state = ST.prey.flee;
                    }
                }

                /* Integrate. */
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                e.vx *= Math.exp(-3.4 * dt);
                e.vy *= Math.exp(-3.4 * dt);

                S.World.resolve(world, e);

                e.anim = (e.anim || 0) + dt * (4 + Math.abs(e.vx) * 0.05);
            }

            /* Soft separation, so a crowd does not become one blob. */
            for (var a = 0; a < list.length; a++) {
                var ea = list[a];
                if (ea.dead || ea.removed) continue;
                for (var b = a + 1; b < list.length; b++) {
                    var eb = list[b];
                    if (eb.dead || eb.removed) continue;
                    var dx = eb.x - ea.x, dy = eb.y - ea.y;
                    var min = ea.r + eb.r;
                    var d2 = dx * dx + dy * dy;
                    if (d2 > min * min || d2 < 0.0001) continue;
                    var d = Math.sqrt(d2);
                    var push = (min - d) * 0.5;
                    dx /= d; dy /= d;
                    ea.x -= dx * push; ea.y -= dy * push;
                    eb.x += dx * push; eb.y += dy * push;
                }
            }

            S.AI.update(world, dt);
        },

        /* Push an entity out of the scenery and back inside the arena. */
        resolve: function (world, e) {
            var er = e.r !== undefined ? e.r : (e.radius || 8);
            var props = world.props;
            for (var i = 0; i < props.length; i++) {
                var p = props[i];
                if (!p.solid) continue;
                var dx = e.x - p.x, dy = e.y - p.y;
                var min = p.r + er * 0.8;
                var d2 = dx * dx + dy * dy;
                if (d2 >= min * min || d2 < 0.0001) continue;
                var d = Math.sqrt(d2);
                var push = (min - d);
                e.x += (dx / d) * push;
                e.y += (dy / d) * push;
            }
            var a = world.arena;
            e.x = S.clamp(e.x, a.x + er, a.x + a.w - er);
            e.y = S.clamp(e.y, a.y + er, a.y + a.h - er);
        },

        /* ===== projectiles ===== */
        updateShots: function (world, dt) {
            for (var i = world.shots.length - 1; i >= 0; i--) {
                var s = world.shots[i];
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.life -= dt;
                if (s.life <= 0) { world.shots.splice(i, 1); continue; }

                if (s.kind === "beam") {
                    world.beams.push({
                        x: s.x, y: s.y, angle: Math.atan2(s.vy, s.vx), life: 0.16, maxLife: 0.16
                    });
                }

                if (s.team === "player") {
                    for (var e = 0; e < world.entities.length; e++) {
                        var en = world.entities[e];
                        if (en.dead || en.removed) continue;
                        if (S.dist2(s.x, s.y, en.x, en.y) > (s.r + en.r) * (s.r + en.r)) continue;
                        S.Combat.damage(world, en, s.damage, { corrode: s.corrode });
                        if (s.will) S.Combat.willDamage(world, en, s.will);
                        if (s.kind === "acid") {
                            S.Particles.burst(world.particles, s.x, s.y, 12, 5, world.colors.acid, { speed: 60, life: 0.4 });
                        }
                        world.shots.splice(i, 1);
                        break;
                    }
                } else {
                    var p = world.player;
                    if (p.state === ST.player.downed) continue;
                    if (S.dist2(s.x, s.y, p.x, p.y) <= (s.r + p.radius * 0.7) * (s.r + p.radius * 0.7)) {
                        var opts = {};
                        if (s.kind === "flame") opts.burn = true;
                        if (s.kind === "beam") opts.drains = true;
                        S.Combat.damagePlayer(world, s.damage, opts);
                        world.shots.splice(i, 1);
                    }
                }
            }
            for (var b = world.beams.length - 1; b >= 0; b--) {
                world.beams[b].life -= dt;
                if (world.beams[b].life <= 0) world.beams.splice(b, 1);
            }
        },

        /* ===== hazards ===== */
        updateHazards: function (world, dt) {
            var p = world.player;
            /* A hazard has a cooldown. Without one, standing against an
             * electric fence applies its damage thirty times a second,
             * which is not a hazard but a wall of damage. */
            p.hazardCd = Math.max(0, (p.hazardCd || 0) - dt);
            for (var i = 0; i < world.hazards.length; i++) {
                var h = world.hazards[i];
                h.t += dt;
                if (h.kind === "fence") {
                    var half = h.len / 2;
                    var cx = h.x, cy = h.y;
                    var px = p.x - cx, py = p.y - cy;
                    var along = h.horizontal ? px : py;
                    var across = h.horizontal ? py : px;
                    if (Math.abs(along) < half && Math.abs(across) < 7) {
                        /* Push out of the wire first, then deal the
                         * damage once. */
                        p.vx += (h.horizontal ? 0 : 150) * (across >= 0 ? 1 : -1);
                        p.vy += (h.horizontal ? 150 : 0) * (across >= 0 ? 1 : -1);
                        if (p.hazardCd <= 0) {
                            p.hazardCd = 1.1;
                            S.Combat.damagePlayer(world, 7, { stun: 0.35 });
                        }
                    }
                } else if (h.kind === "vent") {
                    var phase = h.t % h.period;
                    var hot = phase > h.period - 0.9;
                    h.hot = hot;
                    if (hot && S.dist2(p.x, p.y, h.x, h.y) < h.r * h.r) {
                        if (p.hazardCd <= 0) {
                            p.hazardCd = 0.55;
                            S.Combat.damagePlayer(world, 7, { burn: true });
                        }
                    }
                }
            }
        },

        /* ===== the objective ===== */
        updateObjective: function (world, dt) {
            var obj = world.objective;
            var level = world.level;

            if (world.timeLeft > 0) {
                world.timeLeft -= dt;
                if (world.timeLeft <= 0) {
                    world.timeLeft = 0;
                    if (obj.type === "survive") {
                        S.World.win(world);
                        return;
                    }
                    S.World.fail(world, "Out of time.");
                    return;
                }
            }

            /* Stealth fails the moment the district is fully alerted. */
            if (obj.type === "stealth" && obj.maxAlarm !== undefined && world.alarm >= obj.maxAlarm) {
                S.World.fail(world, "You were seen.");
                return;
            }

            /* Delivering the specimen. */
            if (obj.type === "snatch" && obj.extraction && world.player.gripping) {
                var ex = obj.extraction;
                if (S.dist(world.player.x, world.player.y, ex.x, ex.y) < ex.r) {
                    var spec = world.player.gripping;
                    S.Absorb.release(world, spec, 0);
                    spec.state = ST.prey.flee;
                    obj.count++;
                    S.Audio.play("confirm");
                    S.World.message(world, "SPECIMEN DELIVERED");
                }
            }

            if (obj.count >= obj.need) S.World.win(world);
        },

        message: function (world, text, time) {
            world.message = text;
            world.messageT = time || 2.2;
        },

        /* Something was swallowed. */
        onSwallow: function (world, e) {
            var obj = world.objective;
            if (obj.type === "swarm" || obj.type === "stealth") {
                if (e.kind === "prey") obj.count++;
            } else if (obj.type === "elite") {
                if (e.marked) obj.count++;
            } else if (obj.type === "cull") {
                if (e.marked) obj.count++;
                else {
                    obj.mistakes++;
                    S.Alarm.notice(world, 10, false);
                    S.World.message(world, "THAT ONE WAS NOT MARKED");
                }
            } else if (obj.type === "slay") {
                if (e.kind === "boss" || e.kind === "rival") obj.count++;
            }
        },

        win: function (world) {
            if (world.status !== "playing") return;
            world.status = "won";
            S.Audio.play("win");
            S.Storage.bump("runs");
        },

        fail: function (world, why) {
            if (world.status !== "playing") return;
            world.status = "lost";
            world.failReason = why || "You failed.";
            S.Audio.play("lose");
        },

        /* How well did you do? Three stars, each one a threshold. */
        rate: function (world) {
            var level = world.level;
            var stars = 0;
            if (world.status !== "won") return 0;

            var elapsed = world.time;
            if (elapsed <= level.starTime) stars++;
            if (world.stats.alarmPeak <= level.starAlarm) stars++;
            if (world.stats.massGained >= level.starMass) stars++;
            return stars;
        }
    };

    /* Small helpers used while building a level. */
    function arenaSafeX(world) { return world.arena.x + world.arena.w * 0.72; }
    function arenaSafeY(world) { return world.arena.y + world.arena.h * 0.3; }
})(window.GU = window.GU || {});
