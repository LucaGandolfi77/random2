/*
 * IRONFALL - the ability runtime.
 *
 * Thirteen archetypes, thirty-two abilities. An ability is data plus exactly
 * one archetype, and this file is the switch. Nothing in champions.js has
 * behaviour and nothing in here knows what a champion is.
 *
 * Effects live here too - projectiles, ground fields and in-flight casts -
 * because every one of them is produced by an ability and none of them is
 * produced by a minion. world.js owns units and structures; this file owns
 * "the bolt currently crossing the mid lane".
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var PAL_WARP_LIT = "#b58cff";

    /* ===== Ranks =====
     * A rank is derived from level rather than stored, so a champion can
     * never have a save that says level 3 and rank 3 of an ultimate. */
    function rankFor(ability, level) {
        var key = (ability.key || "q").toLowerCase();
        var th = C.champ.rankThresholds[key] || C.champ.rankThresholds.q;
        var r = -1;
        for (var i = 0; i < th.length; i++) {
            if (level >= th[i]) r = i;
        }
        return r;
    }

    function unlocked(ability, level) {
        return rankFor(ability, level) >= 0;
    }

    /* Costs and cooldowns come in two shapes. Most abilities ramp with rank
     * and declare an array; ultimates declare a single number, because
     * League-style ultimates ramp their DAMAGE and not what they cost, and
     * making an eight-rank damage curve for every ultimate is work nobody
     * would notice.
     *
     * Both shapes have to survive being indexed by rank. They did not, for a
     * while: refreshRanks did `a.cost[r]` on a scalar `130`, which is
     * `undefined`, which made mana NaN the moment any ultimate was cast, and
     * which meant no ultimate in the entire roster could be used. Normalising
     * here rather than rewriting eight definitions keeps both shapes legal
     * forever. */
    function asRamp(v) {
        return typeof v === "number" ? [v] : v;
    }

    /* Build the runtime ability records off a champion definition. Each one
     * carries its own copy of the definition so the renderer can read the
     * tooltip straight off the live ability without re-deriving anything. */
    function initChampionAbilities(u, def) {
        var out = [];
        for (var i = 0; i < def.abilities.length; i++) {
            var a = def.abilities[i];
            out.push({
                def: a,
                name: a.name,
                key: a.key,
                arch: a.arch,
                rank: 0,
                cdLeft: 0,
                cost: asRamp(a.cost)[0] || 0,
                cd: asRamp(a.cd)[0] || 1
            });
        }
        u.abilities = out;
        refreshRanks(u);
        return out;
    }

    function refreshRanks(u) {
        for (var i = 0; i < u.abilities.length; i++) {
            var r = rankFor(u.abilities[i].def, u.level);
            u.abilities[i].rank = r;
            var a = u.abilities[i].def;
            if (r < 0) continue;
            var cost = asRamp(a.cost);
            var cd = asRamp(a.cd);
            u.abilities[i].cost = cost[Math.min(r, cost.length - 1)];
            u.abilities[i].cd = cd[Math.min(r, cd.length - 1)];
            /* A malformed definition must not become an unaffordable or free
             * ability by accident. Falling back to zero cost and a one second
             * cooldown is loud in a data test and invisible in a match. */
            if (!isFinite(u.abilities[i].cost) || u.abilities[i].cost < 0) u.abilities[i].cost = 0;
            if (!isFinite(u.abilities[i].cd) || u.abilities[i].cd <= 0) u.abilities[i].cd = 1;
        }
    }

    /* Rank-indexed value.
     *
     * The rank is passed in EXPLICITLY rather than read off the ability
     * object. Every archetype here receives the definition, because that is
     * where all the tuning lives - and definitions have no `rank` on them,
     * because a definition is shared by every champion that owns that
     * ability and cannot carry per-instance state.
     *
     * Reading `a.rank` off a definition therefore indexed every damage ramp
     * with NaN, and `arr[NaN]` is undefined, so every ramping ability in the
     * game dealt ZERO flat damage and every shield was pure percentage. Only
     * the AD and AP ratios were landing, so nothing crashed, nothing looked
     * obviously wrong in a screenshot, and the whole roster was quietly doing
     * roughly half of what its tooltips claimed. */
    function at(rank, arr, fallback) {
        if (!arr || !arr.length) return fallback;
        var idx = Math.min(Math.max(0, rank | 0), arr.length - 1);
        var v = arr[idx];
        return v === undefined ? fallback : v;
    }

    /* Same for the per-hit and per-cast arrays. Ultimate damage ramps are
     * arrays like everything else, but `atRamp` is called from enough places
     * that a scalar slipping in must not read as zero. */
    function atRamp(rank, arr, fallback) {
        if (typeof arr === "number") return arr;
        return at(rank, arr, fallback === undefined ? 0 : fallback);
    }

    /* ===== Damage numbers =====
     * Every archetype funnels through here, so a buff that changes attack
     * damage changes every ability in the game at once. `opts.adPct` and
     * `opts.apPct` let an ability that is not a basic attack opt out of
     * crit, which the shot archetype does for its multi-projectile forms so
     * three shards cannot all crit off one roll. */
    function computeDamage(world, u, a, rank, opts) {
        opts = opts || {};
        var st = S.Combat;
        var raw = atRamp(rank, a.dmg, 0);
        if (a.dmgType === "phys") {
            raw += st.buffed(u, "ad") * (a.adRatio || 0);
            /* Extra percentage of current AD, for DoTs that scale with a buff
             * the flat ratio was captured before. */
            if (opts.adPct) raw += st.buffed(u, "ad") * opts.adPct;
        } else {
            raw += st.buffed(u, "ap") * (a.apRatio || 0);
        }
        return Math.max(0, raw);
    }

    /* Structure override, hoisted here so every archetype reads it the same
     * way. An ability that does not name one falls back to the global
     * structure reduction in combat.js. */
    function structMul(a) {
        return a.structMul !== undefined ? a.structMul : undefined;
    }

    /* Target validation. Returns a normalised target or null, never throws -
     * a button that cannot fire must grey out, not crash the step. */
    function resolveTarget(world, u, a, raw) {
        switch (a.targeting) {
            case "none":
                return { x: u.x, y: u.y, self: true };
            case "unit":
                if (!raw || !raw.alive) return null;
                if (raw.team === u.team) return null;
                if (S.dist2(u.x, u.y, raw.x, raw.y) > (a.range || 400) * (a.range || 400)) return null;
                return { x: raw.x, y: raw.y, unit: raw };
            case "direction":
                /* A direction is a point at maximum range along the current
                 * aim. The input layer sets u.aimX/u.aimY; using the aim
                 * direction rather than the facing means a drag that ends
                 * slightly off the unit still casts where the player pointed. */
                /* Coerce each component separately, then test the LENGTH.
                 *
                 * These used to read `aimX || 0` and `aimY || 1`, which
                 * silently rewrites a legitimate zero component into a one.
                 * Aiming due east is (1, 0), and 0 is falsy, so the Y
                 * component became 1 and the ability fired at 45 degrees to
                 * the north-east of where the player pointed. Due west was
                 * just as wrong. North and south happened to survive, which
                 * is exactly the kind of bug that survives manual testing:
                 * every horizontal cast on the map was landing 45 degrees
                 * off, and it looked like the cone was simply narrow.
                 *
                 * The length test below is the only correct place to pick a
                 * default aim, because only a zero vector is ambiguous. */
                var dx = u.aimX || 0;
                var dy = u.aimY || 0;
                var len = Math.sqrt(dx * dx + dy * dy);
                if (len < 1e-4) { dx = 0; dy = 1; len = 1; }
                var rr = a.range || 400;
                return { x: u.x + dx / len * rr, y: u.y + dy / len * rr, dir: true };
            case "point":
            default:
                if (!raw) return null;
                var range = a.range || 0;
                /* Clamp instead of rejecting: a player dragging past the edge
                 * of an ability's range wants the cast at the edge, not a
                 * button that does nothing. League rejects, and it is one of
                 * the most complained-about interactions there. */
                var ddx = raw.x - u.x, ddy = raw.y - u.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d > range && range > 0 && d > 1e-4) {
                    return {
                        x: u.x + ddx / d * range,
                        y: u.y + ddy / d * range,
                        clamped: true
                    };
                }
                return { x: raw.x, y: raw.y };
        }
    }

    function canCast(u, idx, raw) {
        var a = u.abilities[idx];
        if (!a || !u.alive) return false;
        if (a.rank < 0) return false;
        if (a.cdLeft > 0) return false;
        /* `mana < undefined` is FALSE, so a malformed cost reads as
         * affordable and the cast proceeds with NaN. Reject it here rather
         * than trust the comparison. */
        if (!isFinite(a.cost)) return false;
        if (u.mana < a.cost) return false;
        if (!S.Combat.canAct(u)) return false;
        if (u.casting) return false;
        return true;
    }

    /* ===== Casting =====
     *
     * Instant abilities fire on the spot. Channelled/windup ones enter
     * u.casting and fire from tick() when the windup completes, which is what
     * makes counterplay possible: a 0.55 second cast on Wrath of the
     * Omnissiah is 0.55 seconds where SERGEANT can step out of the line. */
    function cast(world, u, idx, raw) {
        if (!canCast(u, idx, raw)) return false;
        var a = u.abilities[idx].def;
        var t = resolveTarget(world, u, a, raw);
        if (!t) return false;

        var windup = a.cast || 0;
        /* Clamped, not merely checked. canCast already refuses an
         * unaffordable cast, but a cost can rise under a champion's feet when
         * its ability gains a rank on the same frame, and a negative mana
         * pool is a number the HUD would happily print. */
        u.mana = Math.max(0, u.mana - u.abilities[idx].cost);
        u.abilities[idx].cdLeft = u.abilities[idx].cd;

        var rank = u.abilities[idx].rank;

        if (windup <= 0) {
            fire(world, u, a, t, rank);
        } else {
            /* Lock the aim point at cast time. A player who drags during a
             * windup expects the shot to go where the button was pressed. */
            u.casting = {
                ab: a, rank: rank,
                target: t, t: 0, dur: windup, fired: false,
                /* Facing is locked too, or the cone archetypes would re-aim
                 * mid-windup and hit someone who had already walked out. */
                facing: Math.atan2(t.y - u.y, t.x - u.x)
            };
            u.casting.dirX = t.x - u.x;
            u.casting.dirY = t.y - u.y;
            /* Actually lock it. The flag had been declared and read by
             * moveUnit since the first version of the movement code, and set
             * by nothing: the comment above promised a locked facing and the
             * champion kept turning toward whatever the joystick said for the
             * whole windup. */
            u.facingLocked = true;
            u.facing = u.casting.facing;
        }
        return true;
    }

    /* A generic projectile. Used by the shot and chain archetypes; the chain
     * archetype hangs extra state on it. */
    function makeProj(world, u, a, t, opts) {
        opts = opts || {};
        var dx = opts.dx, dy = opts.dy;
        if (dx === undefined) {
            dx = t.x - u.x; dy = t.y - u.y;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            dx /= len; dy /= len;
        }
        var rank = opts.rank === undefined ? 0 : opts.rank;
        var p = {
            kind: "proj",
            team: u.team,
            owner: u,
            champId: u.champId,
            x: u.x, y: u.y, z: 26,
            dx: dx, dy: dy,
            speed: a.projSpeed || 1600,
            r: a.radius || 60,
            range: a.range || 900,
            travelled: 0,
            life: 0,
            dmg: computeDamage(world, u, a, rank, opts),
            dmgType: a.dmgType,
            structMul: structMul(a),
            pierce: !!a.pierce,
            bounces: a.bounces || 0,
            bounceRange: a.bounceRange || 0,
            falloff: a.falloff || 1,
            hits: [],
            dead: false,
            /* Visual identity: which of the thirteen shapes the renderer
             * should draw. Derived from the archetype so a new archetype
             * cannot be added without the renderer knowing about it. */
            look: opts.look || (a.dmgType === "magic" ? "warp" : "bolt"),
            color: opts.color || null,
            width: opts.width || (a.radius || 60) * 0.5
        };
        world.effects.push(p);
        return p;
    }

    /* ===== Enemy / structure query =====
     * Units come from the spatial grid; structures stay a linear scan,
     * because there are seventeen of them for the whole map and a grid would
     * cost more in bookkeeping than it saves. `forEachHostile` is called by
     * every offensive archetype and the AI fires abilities constantly, so
     * this used to be the second-hottest loop in the game. */
    /* `radius` MUST be the ability's real reach, and `cx/cy` the point that
     * reach is measured from.
     *
     * Both were wrong in four places, and every one of them failed the same
     * quiet way: the spatial query is centred on the caster and widened by a
     * flat 240, so an ability that reaches further than about 300 units could
     * never see anything out there. The damage test further downstream was
     * correct - the candidates simply were never offered to it. A 1250-unit
     * beam queried 300, a 400-unit cone queried 300, a 540-unit dash queried
     * 300, and an aura dropped 700 units from its caster queried around the
     * CASTER while measuring from the FIELD. All four moved correctly and
     * dealt nothing, which is the worst possible failure mode: it looks like
     * it works. */
    function forEachHostile(world, u, fn, radius, includeStructures, cx, cy) {
        var qx = cx === undefined ? u.x : cx;
        var qy = cy === undefined ? u.y : cy;
        var r = Math.max(radius || 0, 60);
        S.World.forEachNear(world, qx, qy, r + 240, function (e) {
            if (!e.alive || e.team === u.team || e.invulnerable) return;
            /* The grid gives candidates; the true test is the ability's own
             * radius, which the caller applies. Widen here by the largest
             * entity radius so a big summoned thing is not missed. */
            var d2 = S.dist2(qx, qy, e.x, e.y);
            if (d2 > (r + (e.radius || 40)) * (r + (e.radius || 40))) return;
            fn(e);
        });
        if (includeStructures !== false) {
            S.World.forEachStructureNear(world, qx, qy, r + 220, function (s) {
                if (!s.alive || s.team === u.team) return;
                fn(s);
            });
        }
    }

    function recordAssist(tgt, src) {
        if (!tgt || tgt.kind !== "champ") return;
        if (!tgt.assist) tgt.assist = [];
        for (var i = 0; i < tgt.assist.length; i++) {
            if (tgt.assist[i].src === src) {
                tgt.assist[i].amount += 1;
                return;
            }
        }
        tgt.assist.push({ src: src, amount: 1 });
    }

    /* Applied to one target, with the bookkeeping every damage source needs:
     * assist credit, synapse tracking, bloodletter's crit stat. */
    function hit(world, src, tgt, a, amount, opts) {
        opts = opts || {};
        var mul = S.Combat.damageReductionVsStructures(src, tgt);
        var res = S.Combat.damage(src, tgt, amount * mul, a.dmgType || "phys", {
            structMul: opts.structMul !== undefined ? opts.structMul : structMul(a),
            canCrit: opts.canCrit,
            dot: opts.dot
        });
        /* Impact feedback, at the one place every hit passes through.
         *
         * Until now a connecting projectile and a missing one looked exactly
         * the same: the bolt reached the target and vanished. The damage
         * number was the only evidence it had landed, and damage numbers are
         * capped at forty, only appear for damage you or your team dealt, and
         * are gone in a second. A player watching a lane could not tell a hit
         * from a whiff, which makes every skillshot a guess.
         *
         * The spray is directional along the projectile's travel, so it
         * always throws the right way, and it is capped and gated by the
         * particle tier, because a three-spread volley hitting a wave must not
         * cost thirty particles per shard. */
        if (res.dealt > 0 && S.World.spawnBurst && !tgt.noImpact) {
            var col = opts.impactColor || spellColour(src, a.dmgType, "impact");
            S.World.spawnBurst(world, tgt.x, tgt.y, src ? src.team : 0,
                tgt.kind === "structure" || tgt.kind === "tower" || tgt.kind === "core" ? 8 : 5,
                col, { dirX: opts.dirX, dirY: opts.dirY, spread: opts.dirX === undefined ? 2.6 : 1.1 });
        }
        if (res.dealt > 0 && a && a.arch && ARCH_SHAKE[a.arch]) {
            /* Small hit = small shake. A full-health minion chip should not
             * nudge the camera; the same ability hitting a champion should. */
            var scale = (tgt.kind === "champ") ? 1 : (tgt.kind === "minion" ? 0.4 : 0.7);
            if (ARCH_SHAKE[a.arch] >= 0.2) shakeFor(a, scale);
        }
        if (res.dealt > 0 && tgt.kind === "champ") recordAssist(tgt, src);
        if (res.killed && src && src.alive && opts.onKill) opts.onKill(tgt, res);
        return res;
    }

    /* ===== Archetype dispatch ===== */

    /* Screen shake, as data on the ability rather than as constants buried in
     * the archetype functions.
     *
     * Six of the thirteen archetypes shook nothing at all, and the three that
     * did used fixed amounts - so a full-screen artillery blast and a
     * cannon-minion-sized echo shook identically, because the only thing that
     * differentiated them was a boolean hardcoded true at the top-level call
     * site. Now an ability declares `shake`, an archetype provides a default
     * for its class, and a designer can turn a specific ult up or down
     * without finding the right `fire*` function. */
    var ARCH_SHAKE = {
        beam: 0.55, slam: 0.7, blast: 0.6, dash: 0.22, blink: 0.2,
        cone: 0.3, chain: 0.28, shot: 0.1, shield: 0.18,
        buff: 0.2, field: 0.16, summon: 0.24, none: 0
    };

    /* ----- Warband spell languages -----
     *
     * Every effect in the game was coloured by one question - is this magic?
     * - which produced sixteen hardcoded purple-and-orange literals and made
     * every spell on the roster look like the same two spells. Faction accent
     * colours existed and were used on exactly two things: the champion's body
     * box, and the roster card.
     *
     * The fix is not more colours, it is a palette each Warband casts from, so
     * a Tyranid spell is organic and green, a Warpbound spell is violet and
     * angular, an Astartes one is blue and blocky. Within a faction the
     * archetype still shifts the tone, so a beam and a cone from the same
     * champion are related but distinguishable.
     *
     * Faction accent is the base and the spell colours are pulled toward it,
     * which means adding a faction is one entry in config.js rather than an
     * audit of every effect. */
    var SPELL_TINT = {
        astartes: { bolt: "#7fb4ff", heavy: "#3d78d8", arcane: "#9fd0ff" },
        warpbound: { bolt: "#d79bff", heavy: "#a04ff0", arcane: "#f0c8ff" },
        tyranid: { bolt: "#c4f05a", heavy: "#7fb01e", arcane: "#e8ff9a" },
        guard: { bolt: "#ffc46b", heavy: "#e0762a", arcane: "#ffe4b0" }
    };

    /* Which palette an effect uses: magic leans arcane, physical leans heavy,
     * and shields and buffs always read as restorative. */
    function spellColour(owner, dmgType, kind) {
        var fid = owner && owner.faction;
        var pal = SPELL_TINT[fid] || SPELL_TINT.astartes;
        if (kind === "buff" || kind === "shield") return pal.arcane;
        if (dmgType === "magic") return pal.arcane;
        if (dmgType === "phys") return pal.heavy;
        return pal.bolt;
    }

    function shakeFor(a, scale) {
        var amt = a.shake !== undefined ? a.shake : (ARCH_SHAKE[a.arch] || 0);
        if (amt > 0 && S.World.shake && S.Combat.currentWorld) {
            S.World.shake(S.Combat.currentWorld, amt * (scale === undefined ? 1 : scale));
        }
    }

    function fire(world, u, a, t, rank) {
        switch (a.arch) {
            case "cone": return fireCone(world, u, a, t, rank);
            case "dash": return fireDash(world, u, a, t, rank);
            case "shot": return fireShot(world, u, a, t, rank);
            case "chain": return fireChain(world, u, a, t, rank);
            case "beam": return fireBeam(world, u, a, t, rank);
            case "blast": return fireBlast(world, u, a, t, rank);
            case "slam": return fireSlam(world, u, a, t, rank);
            case "blink": return fireBlink(world, u, a, t, rank);
            case "shield": return fireShield(world, u, a, t, rank);
            case "buff": return fireBuff(world, u, a, t, rank);
            case "field": return fireField(world, u, a, t, rank);
            case "summon": return fireSummon(world, u, a, t, rank);
            case "none":
            default:
                /* A self-cast with no archetype is legal: it costs mana, has
                 * a cooldown and does nothing, which is how a champion slot
                 * gets reserved without shipping a broken button. */
                return;
        }
    }

    /* --- cone ---
     * A wedge. The test is two dot products rather than an atan2 per target,
     * because this runs for every hostile in range and atan2 is the most
     * expensive call in the archetype set. */
    function fireCone(world, u, a, t, rank) {
        var ang = Math.atan2(t.y - u.y, t.x - u.x);
        var half = (a.angle || 1) / 2;
        var range = a.range || 400;
        var cosHalf = Math.cos(half);
        var dirX = Math.cos(ang), dirY = Math.sin(ang);
        var amount = computeDamage(world, u, a, rank);
        u.facing = ang;

        forEachHostile(world, u, function (e) {
            var dx = e.x - u.x, dy = e.y - u.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            var reach = range + (e.radius || 40);
            if (d > reach) return;
            if (d > 1e-3) {
                var dot = (dx * dirX + dy * dirY) / d;
                if (dot < cosHalf) return;
            }
            hit(world, u, e, a, amount);
        }, range, true);

        /* The sweep itself. A cone that damages and leaves nothing on screen
         * is invisible - you cannot see where it went, cannot judge a follow-up
         * cone off the same angle, and cannot tell a miss from a hit on
         * nothing. The wedge persists just long enough to be read and then
         * collapses. */
        world.effects.push({
            kind: "cone", team: u.team, owner: u, champId: u.champId,
            x: u.x, y: u.y, ang: ang,
            range: range, angle: a.angle || 1,
            width: a.width || 90,
            life: 0, dur: 0.34, dead: false,
            color: spellColour(u, a.dmgType, "slam"),
            dmgType: a.dmgType
        });
        S.World.spawnBurst(world, u.x + dirX * range * 0.5, u.y + dirY * range * 0.5, u.team, 12,
            spellColour(u, a.dmgType, "cone"),
            { dirX: dirX, dirY: dirY, spread: a.angle || 1, speed: 1.2, glow: "#ffe8c0" });
    }

    /* --- dash ---
     * A capsule sweep from the start point to the end point, not a sequence
     * of instantaneous point checks. A capsule is what makes a charge
     * actually feel like it goes *through* people instead of teleporting
     * past them and hitting whatever was within six pixels of the
     * destination. */
    function fireDash(world, u, a, t, rank) {
        var sx = u.x, sy = u.y;
        var dx = t.x - sx, dy = t.y - sy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1e-3) return;
        dx /= d; dy /= d;
        var width = a.width || 140;
        var amount = computeDamage(world, u, a, rank);

        /* The unit's destination is the aim point, but a dash that stops
         * inside the enemy base is a dash that gets punished by three
         * towers. Clamping to the aim point is the player's decision to make,
         * not the engine's - so it is NOT clamped here. The AI decides where
         * to dash, the player decides where to dash, and both get what they
         * asked for. */
        var moved = Math.min(d, a.range || d);
        var ex = sx + dx * moved, ey = sy + dy * moved;

        /* Knockback and knockup are resolved per target after the sweep, so
         * a target that is hit is displaced by the same vector rather than
         * by its own distance to the caster. */
        var swept = 0;
        forEachHostile(world, u, function (e) {
            var d2 = S.segDist2(e.x, e.y, sx, sy, ex, ey);
            if (d2 > width * width) return;
            /* Snapshot the target's health before the hit so FLESH SURGE can
             * total up what the dash actually cost it. Reading `_preDashHp`
             * afterwards without setting it here would be a silent NaN, and
             * the ability would simply never heal. */
            e._preDashHp = e.hp;
            hit(world, u, e, a, amount);
            swept += Math.max(0, e._preDashHp - Math.max(0, e.hp));
            if (a.knockback) {
                var l = Math.sqrt(S.dist2(e.x, e.y, u.x, u.y)) || 1;
                S.World.displace(world, e, (e.x - u.x) / l * a.knockback, (e.y - u.y) / l * a.knockback);
            }
            if (a.knockup) S.Combat.knockup(e, a.knockup, u);
        }, moved + width, true);

        /* The logical position snaps, exactly as before: damage, collision
         * and every rule read u.x, and nothing about the dash's effect on the
         * match may change because the animation looks nicer.
         *
         * The BODY travels instead, over a fixed slice of time, because a dash
         * that teleports reads as a blink. The renderer interpolates between
         * the two points while the unit is already logically at the far end -
         * which is why this is stored as animation state rather than done by
         * easing u.x. The after-images below stay: they are what sells the
         * speed at the moment of arrival. */
        u.dashAnim = { x0: sx, y0: sy, x1: ex, y1: ey, t: 0,
            dur: Math.min(0.22, 0.06 + moved / 2400) };

        u.x = ex; u.y = ey;
        u.facing = Math.atan2(dy, dx);
        S.Map.clampToMap(u);
        u.moving = true;

        /* After-images along the path.
         *
         * A dash teleports the body from one end of a capsule to the other,
         * which reads as a blink even when it is not one. Leaving a trail of
         * diminishing copies is what tells the eye it travelled, and it is the
         * difference between GROTSHOUL charging and GROTSHOUL appearing. */
        var steps = qualityTrailSteps(a.range || moved);
        for (var ti = 1; ti <= steps; ti++) {
            var f = ti / (steps + 1);
            world.effects.push({
                kind: "trail", team: u.team, owner: u, champId: u.champId,
                x: sx + (ex - sx) * f, y: sy + (ey - sy) * f,
                h: u.height, r: u.radius,
                ang: Math.atan2(dy, dx),
                life: 0, dur: 0.22 + f * 0.16, dead: false,
                color: spellColour(u, a.dmgType, "trail"),
                width: width
            });
        }
        /* Impact at the far end, where the charge actually lands. */
        S.World.spawnBurst(world, ex, ey, u.team, 16,
            spellColour(u, a.dmgType, "beam"),
            { dirX: -dx, dirY: -dy, spread: 1.5, speed: 1.3, z: 40, glow: "#ffffff" });

        /* FLESH SURGE: a dash that heals for a share of what it dealt. Totalled
         * across every unit swept, so three victims in a line still cost one
         * heal calculation and the heal is not clipped by the caster's own
         * missing health until the very end. */
        if (a.healForDamage && swept > 0) {
            S.Combat.heal(u, swept * a.healForDamage, null);
        }

    }

    /* How many after-images a dash leaves. Scales with the distance travelled
     * and is capped, because a long dash across a whole lane would otherwise
     * leave a line of fifteen copies and cost more than the damage. */
    function qualityTrailSteps(distance) {
        return S.clamp(Math.round(distance / 130), 3, 9);
    }

    /* --- shot ---
     * One projectile, or `spread` of them fanned about the aim direction.
     * Spreading is done by rotating the direction rather than by spawning at
     * offsets, so the three shards stay equidistant from the caster and none
     * of them can be dodged by stepping slightly to one side. */
    function fireShot(world, u, a, t, rank) {
        var ang = Math.atan2(t.y - u.y, t.x - u.x);
        u.facing = ang;
        var n = a.spread || 1;
        if (n <= 1) {
            makeProj(world, u, a, t);
            return;
        }
        var total = (a.spreadAngle || 0.2) * (n - 1);
        for (var i = 0; i < n; i++) {
            var off = n === 1 ? 0 : -total / 2 + total * (i / (n - 1));
            var aa = ang + off;
            /* Every shard rolls its own crit. Three shards sharing one roll
             * would make the ability either useless or absurd. */
            makeProj(world, u, a, { x: u.x + Math.cos(aa) * 100, y: u.y + Math.sin(aa) * 100 }, {
                dx: Math.cos(aa), dy: Math.sin(aa), look: "shard"
            });
        }
    }

    /* --- chain ---
     * A projectile that re-targets on hit. The `hits` list is what stops it
     * bouncing between two units forever, and the falloff is applied per
     * bounce rather than at the end so the visible number on the final hit
     * is already the reduced one. */
    function fireChain(world, u, a, t, rank) {
        u.facing = Math.atan2(t.y - u.y, t.x - u.x);
        makeProj(world, u, a, t, { look: "chain" });
    }

    function chainBounce(world, p) {
        if (p.bouncesLeft === undefined) p.bouncesLeft = p.bounces;
        if (p.bouncesLeft <= 0) { p.dead = true; return; }
        p.bouncesLeft--;

        var best = null, bestD = (p.bounceRange || 400) * (p.bounceRange || 400);
        for (var i = 0; i < world.units.length; i++) {
            var e = world.units[i];
            if (!e.alive || e.team === p.team || e.invulnerable) continue;
            if (p.hits.indexOf(e) >= 0) continue;
            var d2 = S.dist2(p.x, p.y, e.x, e.y);
            if (d2 < bestD) { bestD = d2; best = e; }
        }
        if (!best) { p.dead = true; return; }

        var dx = best.x - p.x, dy = best.y - p.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        p.dx = dx / len; p.dy = dy / len;
        /* Record the hop BEFORE teleporting the projectile.
         *
         * render.js has contained a full chain-arc renderer - a soft glow
         * stroke and a zig-zag that decays toward the target - since the VFX
         * pass began, guarded on `e.chainPts.length > 1`. Nothing in the game
         * has ever assigned that array, so the branch has never executed and
         * WARP LIGHTNING, the one chain in the roster, rendered as a generic
         * travelling bolt. Thirty-odd lines of renderer, unreachable. */
        if (!p.chainPts) p.chainPts = [];
        p.chainPts.push({ x: p.x, y: p.y });
        p.x = best.x; p.y = best.y;
        p.chainPts.push({ x: p.x, y: p.y });
        p.travelled = 0;
        p.range = p.bounceRange || 400;
        /* Falloff compounds. A chain that hits four things for full damage
         * would be strictly better than every other archetype in the game. */
        p.dmg *= p.falloff;
        p.hits.push(best);
        hit(world, p.owner, best, { dmgType: p.dmgType, structMul: p.structMul }, p.dmg, {});
    }

    /* --- beam ---
     * An instant wide line. Not a projectile: it is a rectangle in world
     * space, tested with segDist2 so anything standing anywhere along the
     * line is hit exactly once. */
    function fireBeam(world, u, a, t, rank) {
        var ang = Math.atan2(t.y - u.y, t.x - u.x);
        u.facing = ang;
        var range = a.range || 1000;
        var ex = u.x + Math.cos(ang) * range, ey = u.y + Math.sin(ang) * range;
        var width = a.width || 200;
        var amount = computeDamage(world, u, a, rank);
        var dirX = Math.cos(ang), dirY = Math.sin(ang);
        var perpX = -dirY, perpY = dirX;

        forEachHostile(world, u, function (e) {
            if (S.segDist2(e.x, e.y, u.x, u.y, ex, ey) > width * width) return;
            hit(world, u, e, a, amount);
        }, range, true);

        world.effects.push({
            kind: "beam", team: u.team, owner: u,
            x: u.x, y: u.y, ex: ex, ey: ey,
            width: width, dirX: dirX, dirY: dirY,
            life: 0, dur: a.channel || 0.45, dead: false,
            color: spellColour(u, a.dmgType, "beam")
        });
        shakeFor(a);
    }

    /* --- blast ---
     * A delayed circle. The delay is the whole archetype: it gives the enemy
     * a reaction window, which is what makes landing one a skill and
     * dodging one a skill. */
    function fireBlast(world, u, a, t, rank) {
        var amount = computeDamage(world, u, a, rank);
        world.effects.push({
            kind: "blast", team: u.team, owner: u,
            x: t.x, y: t.y,
            r: a.radius || 300,
            dur: a.delay || 0.4, t: 0, dead: false,
            dmg: amount, dmgType: a.dmgType, structMul: structMul(a),
            /* Six sub-bombs for ARTILLERY BARRAGE. Total damage is preserved:
             * each bomb carries the full declared damage over a smaller
             * circle, so the number on the tooltip is the number you get,
             * but it arrives as a pattern instead of as one lump. */
            bombs: a.bombs || 0,
            bombR: (a.radius || 300) * (a.bombRadiusMul || 0.42),
            bombStep: a.bombDelayStep || 0.12,
            /* The echo detonation for STORM OF HERESY. */
            echoR: a.echoRadiusMul ? (a.radius || 300) * a.echoRadiusMul : 0,
            echoT: a.echoDelayAdd || 0,
            echoMul: a.echoMul || 0,
            echoDone: false,
            color: spellColour(u, a.dmgType, "blast"),
            big: true
        });
    }

    /* --- slam ---
     * An instant circle around the caster, or - when the ability also names a
     * `dash` - a dash followed by the circle at the landing point. One
     * archetype serving both because they are the same ability with an extra
     * step, and splitting them would double the archetype count for no gain. */
    function fireSlam(world, u, a, t, rank) {
        var cx = u.x, cy = u.y;
        if (a.dash) {
            var dx = t.x - u.x, dy = t.y - u.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d > 1e-3) {
                var m = Math.min(d, a.range || a.dash);
                u.x += dx / d * m;
                u.y += dy / d * m;
                u.facing = Math.atan2(dy, dx);
                S.Map.clampToMap(u);
            }
            cx = u.x; cy = u.y;
        } else {
            u.facing = Math.atan2(t.y - u.y, t.x - u.x);
        }

        var r = a.radius || 300;
        var amount = computeDamage(world, u, a, rank);
        forEachHostile(world, u, function (e) {
            var er = r + (e.radius || 40);
            if (S.dist2(cx, cy, e.x, e.y) > er * er) return;
            hit(world, u, e, a, amount);
            if (a.slow) S.Combat.slow(e, a.slow.pct, a.slow.dur, u);
            if (a.stun) S.Combat.stun(e, a.stun, u);
        }, r, true);

        world.effects.push({
            kind: "ring", team: u.team, owner: u,
            x: cx, y: cy, r: r, life: 0, dur: 0.42, dead: false,
            color: spellColour(u, a.dmgType, "slam")
        });
        shakeFor(a);
        S.World.spawnBurst(world, cx, cy, u.team, 22, "#e8c48a");
    }

    /* --- blink --- */
    function fireBlink(world, u, a, t, rank) {
        var sx = u.x, sy = u.y;
        /* Facing is taken from the displacement, not the destination: the
         * origin is saved first, so by the time this runs u is still standing
         * at the origin and `t - u` is the true travel vector. */
        u.facing = Math.atan2(t.y - sy, t.x - sx);
        u.x = t.x; u.y = t.y;
        S.Map.clampToMap(u);

        if (a.scarRadius) {
            /* The scar is the reason this archetype is interesting. Delayed
             * so it fires on the origin after the blink has already
             * committed - a scar that fires instantly would be free damage on
             * the way out with no risk attached to it. */
            world.effects.push({
                kind: "blast", team: u.team, owner: u,
                x: sx, y: sy, r: a.scarRadius,
                dur: a.scarDelay || 0.4, t: 0, dead: false,
                dmg: computeDamage(world, u, a, rank),
                dmgType: a.dmgType, structMul: structMul(a),
                color: "#b58cff", scar: true
            });
        }
        /* Two portals: one opening where the champion left and one where they
         * arrived. A blink with a single flash is a teleport the eye misses;
         * with both ends visible it is obviously a passage, and the fade of the
         * departure tells you which direction to keep watching. */
        world.effects.push({
            kind: "warp", team: u.team, owner: u, champId: u.champId,
            x: sx, y: sy, r: (u.radius || 46) * 2.2,
            life: 0, dur: 0.5, dead: false, out: true,
            color: PAL_WARP_LIT
        });
        world.effects.push({
            kind: "warp", team: u.team, owner: u, champId: u.champId,
            x: u.x, y: u.y, r: (u.radius || 46) * 2.2,
            life: 0, dur: 0.5, dead: false, out: false,
            color: PAL_WARP_LIT
        });
        S.World.spawnBurst(world, sx, sy, u.team, 16, "#b58cff",
            { ring: true, speed: 1.4, lift: 0.4, glow: "#e0c8ff" });
        S.World.spawnBurst(world, u.x, u.y, u.team, 16, "#b58cff",
            { ring: true, speed: 1.4, lift: 0.4, glow: "#e0c8ff" });
    }

    /* --- shield ---
     * Auto-targets the most wounded ally in radius, including the caster.
     * Auto-targeting rather than requiring a second tap is what makes a
     * three-man team's support usable with one thumb on a phone. */
    function fireShield(world, u, a, t, rank) {
        var target = u;
        if (!a.selfOnly) {
            var bestPct = -1;
            for (var i = 0; i < world.units.length; i++) {
                var e = world.units[i];
                if (!e.alive || e.kind !== "champ" || e.team !== u.team) continue;
                if (S.dist2(u.x, u.y, e.x, e.y) > (a.radius || 500) * (a.radius || 500)) continue;
                var max = S.Combat.stat(e, "hp");
                if (max <= 0) continue;
                var pct = 1 - e.hp / max;
                if (pct > bestPct) { bestPct = pct; target = e; }
            }
        }
        var amount = atRamp(rank, a.shield, 0) + S.Combat.stat(target, "hp") * (a.hpRatio || 0);
        S.Combat.addShield(target, amount, a.dur || 3, u);
        if (a.armorBuff) {
            S.Combat.addBuff(target, {
                kind: "plate", dur: a.dur || 3,
                stats: { armor: a.armorBuff }
            });
        }
        S.World.spawnBurst(world, target.x, target.y, u.team, 12, "#6fd8e8",
            { ring: true, speed: 0.7, lift: 0.5, z: 30, glow: "#c8f6ff" });

        /* The dome.
         *
         * A four-second shield that flashes once and leaves nothing is a
         * number the player cannot act on: they cannot tell that it is up,
         * cannot see it being eaten, and cannot see it about to break. The
         * dome's radius tracks the shield that is actually left, so it is a
         * gauge as well as a decoration - and it is the only way to read your
         * own remaining shield in a fight without looking at the HUD. */
        world.effects.push({
            kind: "dome", team: u.team, owner: target, champId: u.champId,
            x: target.x, y: target.y, r: (target.radius || 46) * 1.7,
            h: target.height || 100,
            life: 0, dur: a.dur || 3, dead: false,
            max: amount,
            armor: a.armorBuff || 0,
            color: "#6fd8e8",
            follow: true
        });
    }

    /* --- buff ---
     * Self, plus optionally allies in radius at a reduced share. The ally
     * share is why SERGEANT's W and VANGUARD's R are worth a whole team slot
     * rather than being a personal DPS button with extra steps. */
    function fireBuff(world, u, a, t, rank) {
        var selfStats = {};
        if (a.asBuff) selfStats.as = a.asBuff;
        if (a.adBuff) selfStats.ad = a.adBuff;
        if (a.msBuff) selfStats.ms = a.msBuff;
        if (a.lifestealBuff) selfStats.lifesteal = a.lifestealBuff;
        if (Object.keys(selfStats).length) {
            S.Combat.addBuff(u, {
                kind: "buff", dur: a.dur || 5, stats: selfStats, percent: true
            });
        }
        if (a.slowImmune) {
            S.Combat.addBuff(u, { kind: "buff", dur: a.dur || 5, slowImmune: true });
        }
        if (a.healOverTime || a.healPct) {
            /* Over-time rather than instant: an instant heal is the shield
             * archetype wearing a different hat, and it is strictly worse,
             * because it can only ever be spent all at once. */
            var total = (a.healOverTime ? atRamp(rank, a.healOverTime, 0) : 0)
                + S.Combat.stat(u, "hp") * (a.healPct || 0);
            S.Combat.addBuff(u, {
                kind: "hot", dur: a.dur || 5,
                hot: { perSec: total / (a.dur || 5) }
            });
        }
        if (a.cleanseSlow) S.Combat.cleanseSlow(u);

        /* The ally portion. OATH OF CINDERS shields, COMMAND accelerates. */
        if (a.radius && (a.allyShield || a.allyAsBuff || a.allyArmorBuff)) {
            for (var i = 0; i < world.units.length; i++) {
                var e = world.units[i];
                if (!e.alive || e.kind !== "champ" || e.team !== u.team || e === u) continue;
                if (S.dist2(u.x, u.y, e.x, e.y) > a.radius * a.radius) continue;
                if (a.allyShield) {
                    S.Combat.addShield(e, atRamp(rank, a.allyShield, 0), a.dur || 5, u);
                }
                if (a.allyAsBuff) {
                    S.Combat.addBuff(e, {
                        kind: "command", dur: a.dur || 5,
                        stats: { as: a.allyAsBuff }, percent: true
                    });
                }
                if (a.allyArmorBuff) {
                    S.Combat.addBuff(e, {
                        kind: "banner", dur: a.dur || 5,
                        stats: { armor: a.allyArmorBuff }
                    });
                }
            }
        }

        S.World.floatText(world, u.x, u.y, a.name, "#ffd24a");
        S.World.spawnBurst(world, u.x, u.y, u.team, 18, "#ffd24a",
            { ring: true, speed: 0.6, lift: 1.5, z: 20, glow: "#fff0b8" });

        /* The aura.
         *
         * COMMAND on a teammate who is not the player is the whole point of
         * that ability, and it was completely invisible. An aura that follows
         * the buffed champion for its duration is what makes a squad fight as
         * a squad - you can see that SERGEANT has wound the others up. */
        world.effects.push({
            kind: "aura", team: u.team, owner: u, champId: u.champId,
            x: u.x, y: u.y, r: (u.radius || 46) * 2.1,
            h: u.height || 120,
            life: 0, dur: a.dur || 5, dead: false,
            color: "#ffd24a",
            seeds: 6,
            radius: a.radius || 0,
            follow: true
        });
    }

    /* --- field ---
     * A persistent ground area, either placed or following its caster. The
     * following variant is what makes EXOCRINE AURA a different ability from
     * MALEFICIUM despite sharing an archetype, and it is the only reason the
     * `follow` flag exists. */
    function fireField(world, u, a, t, rank) {
        var amount = computeDamage(world, u, a, rank);
        world.effects.push({
            kind: "field", team: u.team, owner: u, champId: u.champId,
            x: t.x, y: t.y,
            r: a.radius || 300,
            life: 0, dur: a.dur || 4, t: 0, dead: false,
            tick: a.tick || 0.5, acc: 0,
            dmg: amount, dmgType: a.dmgType, structMul: structMul(a),
            slow: a.slow || null,
            pull: a.pull || 0,
            follow: !!a.follow,
            color: spellColour(u, a.dmgType, "field")
        });
    }

    /* --- summon ---
     * Walking units or a static structure, from the same block. A summon is
     * never granted a bounty, so it cannot be farmed for gold and cannot be
     * used to farm XP - it is a pressure tool, not an income tool. */
    function fireSummon(world, u, a, t, rank) {
        var n = a.count || 1;
        var u0 = a.unit || {};
        for (var i = 0; i < n; i++) {
            /* Fan the spawn out so three hormagaunts do not arrive stacked on
             * one pixel, where they would occupy the same targeting circle
             * and take the same hits. */
            var ang = S.golden * i;
            var off = n === 1 ? 0 : 70 + i * 26;
            var sx = t.x + Math.cos(ang) * off;
            var sy = t.y + Math.sin(ang) * off;

            if (a.asStructure) {
                world.structures.push(S.World.makeStructure(world, {
                    kind: "summon_turret",
                    team: u.team,
                    owner: u,
                    x: sx, y: sy,
                    hp: u0.hp || 800,
                    ad: u0.ad || 50,
                    armor: u0.armor || 20,
                    mr: u0.mr || 20,
                    range: u0.range || 800,
                    name: u0.name || "summon",
                    dur: a.dur || 30,
                    facing: 0
                }));
            } else {
                var m = S.World.makeUnit(world, {
                    kind: "summon",
                    team: u.team,
                    owner: u,
                    champId: u.champId,
                    name: u0.name || "summon",
                    x: sx, y: sy,
                    hp: u0.hp || 500,
                    ad: u0.ad || 40,
                    armor: u0.armor || 20,
                    mr: u0.mr || 18,
                    ms: u0.ms || 340,
                    range: u0.range || 140,
                    dur: a.dur || 20,
                    isMinion: false,
                    givesGold: false,
                    givesXp: false
                });
                m.rage = 1;
            }
        }
        /* One flash per summoned body, not one for the whole cast. REINFORCE
         * drops two guards and IMMOLATE opens a warp hole; a single burst at
         * the centre of both would make a two-body ability look like a
         * one-body ability. */
        for (var qi = 0; qi < n; qi++) {
            S.World.spawnBurst(world, t.x + Math.cos(S.golden * qi) * 60,
                t.y + Math.sin(S.golden * qi) * 60, u.team, 10, "#a8c93a",
                { ring: true, speed: 0.9, lift: 0.9, glow: "#d8f08a" });
        }
    }

    /* ===== Per-step tick ===== */

    function tick(world, dt) {
        var i;

        /* Windups. A unit in a cast has locked facing and cannot act. */
        for (i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.casting || !u.alive) continue;
            u.casting.t += dt;
            if (u.casting.t >= u.casting.dur) {
                var cast = u.casting;
                u.casting = null;
                /* Re-check lockout at the moment of resolution: a stun
                 * landing during a windup must not be eaten by the ability
                 * firing anyway. This is what makes a 0.55 second cast
                 * genuinely interruptible. */
                if (!S.Combat.isLocked(u)) {
                    fire(world, u, cast.ab, cast.target, cast.rank);
                }
                /* Released after resolution, not before: a stun landing during
                 * a windup has to leave the unit unable to turn, or it snaps
                 * back to its move target the moment the stun wears off. */
                u.facingLocked = false;
            }
        }

        /* Projectiles. */
        for (i = world.effects.length - 1; i >= 0; i--) {
            var e = world.effects[i];
            if (e.dead) { world.effects.splice(i, 1); continue; }
            e.life += dt;

            if (e.kind === "proj") {
                var step = e.speed * dt;
                e.x += e.dx * step;
                e.y += e.dy * step;
                e.travelled += step;
                e.z = 26 + Math.sin(e.life * 22) * 3;

                if (e.bounces) {
                    /* A chain bolt is resolved on arrival at a unit, not on
                     * a swept test: it needs to find a *new* target each
                     * time, and a swept test would let it skip past the very
                     * unit it is supposed to bounce to. */
                    for (var k = world.units.length - 1; k >= 0; k--) {
                        var tu = world.units[k];
                        if (!tu.alive || tu.team === e.team || tu.invulnerable) continue;
                        var rr = e.r + (tu.radius || 40);
                        if (S.dist2(e.x, e.y, tu.x, tu.y) > rr * rr) continue;
                        if (e.hits.indexOf(tu) >= 0) continue;
                        e.hits.push(tu);
                        hit(world, e.owner, tu, { dmgType: e.dmgType, structMul: e.structMul }, e.dmg, {});
                        chainBounce(world, e);
                        break;
                    }
                    if (e.dead) continue;
                } else if (e.pierce) {
                    /* Piercing shots test every unit along the path but
                     * cannot hit the same one twice, so a 3-spread volley
                     * passing through a minion wave does not multiply. */
                    for (k = world.units.length - 1; k >= 0; k--) {
                        var pu = world.units[k];
                        if (!pu.alive || pu.team === e.team || pu.invulnerable) continue;
                        if (e.hits.indexOf(pu) >= 0) continue;
                        var prr = e.r + (pu.radius || 40);
                        if (S.dist2(e.x, e.y, pu.x, pu.y) > prr * prr) continue;
                        e.hits.push(pu);
                        hit(world, e.owner, pu, { dmgType: e.dmgType, structMul: e.structMul }, e.dmg, {});
                    }
                    for (k = world.structures.length - 1; k >= 0; k--) {
                        var st = world.structures[k];
                        if (!st.alive || st.team === e.team) continue;
                        var sr = e.r + (st.radius || 140);
                        if (S.dist2(e.x, e.y, st.x, st.y) > sr * sr) continue;
                        if (e.hits.indexOf(st) >= 0) continue;
                        e.hits.push(st);
                        hit(world, e.owner, st, { dmgType: e.dmgType, structMul: e.structMul }, e.dmg, {});
                    }
                } else {
                    /* Non-piercing: first contact ends the projectile. */
                    var consumed = false;
                    for (k = world.units.length - 1; k >= 0; k--) {
                        var u2 = world.units[k];
                        if (!u2.alive || u2.team === e.team || u2.invulnerable) continue;
                        var rr2 = e.r + (u2.radius || 40);
                        if (S.dist2(e.x, e.y, u2.x, u2.y) > rr2 * rr2) continue;
                        hit(world, e.owner, u2, { dmgType: e.dmgType, structMul: e.structMul }, e.dmg, {});
                        consumed = true;
                        break;
                    }
                    if (!consumed) {
                        for (k = world.structures.length - 1; k >= 0; k--) {
                            var s2 = world.structures[k];
                            if (!s2.alive || s2.team === e.team) continue;
                            var sr2 = e.r + (s2.radius || 140);
                            if (S.dist2(e.x, e.y, s2.x, s2.y) > sr2 * sr2) continue;
                            hit(world, e.owner, s2, { dmgType: e.dmgType, structMul: e.structMul }, e.dmg, {});
                            consumed = true;
                            break;
                        }
                    }
                    if (consumed) { e.dead = true; continue; }
                }

                if (e.travelled >= e.range) e.dead = true;
                continue;
            }

            if (e.kind === "field") {
                if (e.follow && e.owner && e.owner.alive) { e.x = e.owner.x; e.y = e.owner.y; }
                e.acc += dt;
                var ticked = false;
                while (e.acc >= e.tick) {
                    e.acc -= e.tick;
                    ticked = true;
                    forEachHostile(world, e.owner, function (tgt) {
                        var tr = e.r + (tgt.radius || 40);
                        if (S.dist2(e.x, e.y, tgt.x, tgt.y) > tr * tr) return;
                        hit(world, e.owner, tgt, { dmgType: e.dmgType, structMul: e.structMul }, e.dmg, { dot: true });
                        if (e.slow) S.Combat.slow(tgt, e.slow.pct, e.slow.dur, e.owner);
                        if (e.pull) {
                            var l = Math.sqrt(S.dist2(e.x, e.y, tgt.x, tgt.y)) || 1;
                            S.World.displace(world, tgt,
                                (e.x - tgt.x) / l * e.pull * e.tick,
                                (e.y - tgt.y) / l * e.pull * e.tick);
                        }
                    }, e.r, true, e.x, e.y);
                }
                e.didTick = ticked;
                if (e.life >= e.dur) e.dead = true;
                continue;
            }

            if (e.kind === "blast") {
                if (e.t >= e.dur) {
                    /* The echo fires from the same blast record rather than
                     * as a second one, so a cancelled or double-tapped cast
                     * cannot produce two of them. */
                    if (e.echoR && !e.echoDone) {
                        e.echoDone = true;
                        var echoT = e.echoT || 0;
                        if (echoT <= 0) detonate(world, e, e.echoR, e.dmg * e.echoMul);
                        else {
                            world.effects.push({
                                kind: "blast", team: e.team, owner: e.owner,
                                x: e.x, y: e.y, r: e.echoR,
                                dur: echoT, t: 0, dead: false,
                                dmg: e.dmg * e.echoMul, dmgType: e.dmgType,
                                structMul: e.structMul, color: e.color, big: true
                            });
                        }
                    }
                    if (e.bombs) {
                        /* Spread the sub-bombs around the declared circle. The
                         * radius they cover is deliberately larger than their
                         * own: a barrage has to be dodgeable by leaving the
                         * circle but not by standing still in one edge of it. */
                        for (var b = 0; b < e.bombs; b++) {
                            var ba = S.golden * b;
                            var br = e.r * 0.55 * Math.sqrt((b + 0.5) / e.bombs);
                            var bx = e.x + Math.cos(ba) * br;
                            var by = e.y + Math.sin(ba) * br;
                            world.effects.push({
                                kind: "blast", team: e.team, owner: e.owner,
                                x: bx, y: by, r: e.bombR,
                                dur: 0.35 + b * e.bombStep, t: 0, dead: false,
                                dmg: e.dmg, dmgType: e.dmgType,
                                structMul: e.structMul, color: e.color, small: true
                            });
                        }
                    } else {
                        detonate(world, e, e.r, e.dmg);
                    }
                    e.dead = true;
                    continue;
                }
                e.t += dt;
                continue;
            }

            /* Kinds that stay attached to a unit have to re-read its
             * position every step. A dome left where the champion was when it
             * was cast is worse than no dome: it is a shield that is visibly
             * somewhere the champion is not, which teaches the player to
             * distrust the one indicator they needed. */
            if (e.kind === "dome" || e.kind === "aura") {
                if (e.follow && e.owner && e.owner.alive) {
                    e.x = e.owner.x;
                    e.y = e.owner.y;
                    /* The dome's radius tracks the shield that is actually
                     * left, which turns it into a gauge rather than a
                     * decoration. */
                    if (e.kind === "dome") {
                        e.left = e.owner.shield;
                    }
                }
                if (e.life >= e.dur) e.dead = true;
                continue;
            }

            /* Trail, cone and warp are pure visuals with a fixed duration. */
            if (e.kind === "trail" || e.kind === "cone" || e.kind === "warp") {
                if (e.life >= e.dur) e.dead = true;
                continue;
            }

            if (e.kind === "beam" || e.kind === "ring") {
                if (e.life >= e.dur) e.dead = true;
                continue;
            }

            if (e.life >= (e.dur || 1)) e.dead = true;
        }

        /* Cooldowns. Ticked here rather than in the unit loop because every
         * champion has abilities and minions do not - the `abilities` guard
         * is what lets this run over the whole unit array instead of
         * maintaining a separate champion list just for timers. */
        for (i = 0; i < world.units.length; i++) {
            var un = world.units[i];
            if (!un.abilities) continue;
            /* Cooldown reduction scales the tick, not the stored value. The
             * displayed number is therefore always the real remaining time,
             * which is what a player reads while holding a finger on the
             * button waiting for it. */
            var scale = un.cdrScale || 1;
            for (var j = 0; j < un.abilities.length; j++) {
                var ab = un.abilities[j];
                if (ab.cdLeft > 0) {
                    ab.cdLeft -= dt * scale;
                    /* Clamped at zero. The HUD and the tooltip both read this
                     * value directly, and "-0.0003" is a number a player can
                     * see. */
                    if (ab.cdLeft < 0) ab.cdLeft = 0;
                }
            }
        }
    }

    function detonate(world, e, radius, dmg) {
        var r2 = radius * radius;
        var i;
        for (i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.alive || u.team === e.team || u.invulnerable) continue;
            var ur = radius + (u.radius || 40);
            if (S.dist2(e.x, e.y, u.x, u.y) > ur * ur) continue;
            hit(world, e.owner, u, { dmgType: e.dmgType, structMul: e.structMul }, dmg, {});
        }
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive || s.team === e.team) continue;
            var sr = radius + (s.radius || 140);
            if (S.dist2(e.x, e.y, s.x, s.y) > sr * sr) continue;
            hit(world, e.owner, s, { dmgType: e.dmgType, structMul: e.structMul }, dmg, {});
        }
        S.World.spawnBurst(world, e.x, e.y, e.team, 26, e.color || "#ff8a3c");
        shakeFor({ arch: "blast", shake: e.big ? 0.9 : 0.34 });
    }

    S.Abilities = {
        rankFor: rankFor,
        unlocked: unlocked,
        initChampionAbilities: initChampionAbilities,
        refreshRanks: refreshRanks,
        canCast: canCast,
        cast: cast,
        computeDamage: computeDamage,
        at: at,
        atRamp: atRamp,
        resolveTarget: resolveTarget,
        tick: tick,
        detonate: detonate,
        at: at
    };

})(window.IF = window.IF || {});
