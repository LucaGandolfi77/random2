/*
 * IRONFALL - the world: units, waves, structures, vision, win conditions.
 *
 * One fixed-step update drives everything. Nothing here reads the wall clock
 * - `world.time` is advanced by the caller in exact steps, which is what
 * makes the whole simulation reproducible from a seed and therefore
 * testable headlessly.
 *
 * The step is 1/60s. It is not a physics tick; it is a decision tick, and
 * every rate in the game (cooldowns, buffs, regen, waves) is expressed in
 * seconds and divided by it. Running faster or slower than 60Hz changes
 * nothing, which is the property that lets the balance harness trust its
 * results.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var M;

    /* Ceiling on the particle pool. Measured peak in a busy match is 182;
     * this is the backstop that stops an emitter turning into a frame-time
     * cliff. Exceeding it drops the oldest particle, never the newest. */
    var FX_CAP = 320;

    var nextId = 1;

    /* ===== Construction =====
     *
     * Every entity in the game is one of three records: a unit (anything that
     * walks), a structure (anything with hit points that does not), or an
     * effect (anything transient, owned by abilities.js). They share the
     * combat interface - hp, team, alive, buffs - so combat.js does not care
     * which it is holding. */

    function makeUnit(world, o) {
        var b = {
            ad: o.ad, armor: o.armor, mr: o.mr,
            hp: o.hp, ms: o.ms, as: o.as || 0.85,
            range: o.range || 140,
            armorBonus: 0
        };
        var u = {
            id: nextId++,
            kind: o.kind || "minion",
            team: o.team,
            name: o.name || "minion",
            champId: o.champId || null,
            owner: o.owner || null,

            x: o.x, y: o.y, z: 0,
            facing: o.facing || 0,
            radius: o.radius || 34,
            height: o.height || 62,

            base: b,
            flat: o.flat || {},
            pct: o.pct || {},

            hp: b.hp, alive: true,
            shield: 0, shieldDur: 0,
            buffs: [],
            assist: [],

            ms: o.ms,                         /* current speed, slowed in tick */
            baseMs: o.ms,
            range: b.range,
            attackCdLeft: 0,
            windupLeft: 0,
            windupTarget: null,
            dashAnim: null,
            facingLocked: false,

            target: null,
            moveTo: null,

            lane: o.lane || "mid",
            progress: o.progress !== undefined ? o.progress : 0,

            isMinion: !!o.isMinion,
            givesGold: o.givesGold !== false,
            givesXp: o.givesXp !== false,
            banner: !!o.banner,

            dur: o.dur || 0,
            durLeft: o.dur || 0,

            lastHitAt: -999,
            lastDamagedAt: -999,
            lastHealAt: -999,
            deathTime: -999,
            deadFor: 0,
            spawnedAt: world.time,

            level: 1,
            xp: 0,
            gold: 0,
            cs: 0,
            kills: 0,
            deaths: 0,
            assists: 0,

            visible: true,
            visibleAt: -999
        };
        u.ms = b.ms;
        world.units.push(u);
        return u;
    }

    function makeStructure(world, o) {
        var hp = o.hp || 3000;
        var s = {
            id: nextId++,
            kind: o.kind || "tower",
            team: o.team,
            owner: o.owner || null,
            name: o.name || (o.kind === "core" ? "CORE" : "BASTION TOWER"),

            x: o.x, y: o.y, z: 0,
            facing: o.facing || 0,
            radius: o.radius || 150,
            height: o.height || (o.kind === "core" ? 420 : 300),

            base: {
                hp: hp, armor: o.armor || 30, mr: o.mr || 25,
                ad: o.ad || 0, ms: 0, as: 0, range: o.range || 1400
            },
            flat: {}, pct: {},

            hp: hp, alive: true,
            shield: 0, shieldDur: 0,
            buffs: [], assist: [],

            attackCdLeft: 0,
            target: null,
            lane: o.lane || "mid",

            /* Plates are the turret mechanic. `plateArmor` is the armour
             * currently granted by the plates that are still standing, and it
             * depletes as damage goes in. When it reaches zero the plate is
             * spent and the tower's effective armour drops until it regrows. */
            plates: o.plates !== undefined ? o.plates : 0,
            plateArmor: 0,
            platesDown: 0,
            plateRegenAcc: 0,
            lastDamagedAt: -999,

            /* Escalation counter. Rises by one per shot taken and resets when
             * the structure goes five seconds without being hit, so the ramp
             * punishes a long dive rather than a match that has been going a
             * while. */
            rampSteps: 0,
            rampAcc: 0,

            invulnerable: false,
            dur: o.dur || 0,
            durLeft: o.dur || 0,

            lastDamagedAtT: -999,
            spawnedAt: world.time
        };
        s.plateArmor = (o.plateArmor || 0);
        world.structures.push(s);
        return s;
    }

    /* Towers are structures with plates; cores are structures without. Both
     * come from makeStructure so combat.js never has to branch. */
    function buildStructures(world) {
        var i;
        for (i = 0; i < M.structures.length; i++) {
            var d = M.structures[i];
            if (d.kind === "core") {
                makeStructure(world, {
                    kind: "core",
                    team: d.team, lane: d.lane, x: d.x, y: d.y,
                    name: d.team === 0 ? "THE EMPEROR'S SIGIL" : "THE HIVE NODE",
                    hp: C.core.hp, armor: C.core.armor, mr: C.core.mr,
                    /* The Core's radius is its HITBOX, not its footprint.
                     * At 330 the drawn keep was 790 units across - nine
                     * percent of the whole map for one building. The hitbox
                     * can stay generous; the artwork cannot. */
                    radius: 190,
                    height: 660,
                    range: 0,
                    facing: d.team === 0 ? Math.PI * 0.25 : Math.PI * 1.25
                });
            } else {
                makeStructure(world, {
                    kind: "tower",
                    team: d.team, lane: d.lane, x: d.x, y: d.y,
                    hp: C.tower.hp, armor: C.tower.armor, mr: C.tower.mr,
                    ad: 0, range: C.tower.range,
                    plates: C.tower.plates,
                    /* The WHOLE stack, not one plate. Passing the single
                     * plate value meant every tower opened the match with a
                     * third of the armour it was supposed to have, which
                     * quietly doubled how fast lanes fell. */
                    plateArmor: C.tower.plateArmour * C.tower.plates,
                    radius: 120, height: 500,
                    facing: d.facing > 0 ? Math.PI * 0.25 : Math.PI * 1.25
                });
            }
        }

        /* Jungle camps. Neutral: no team, so both sides can clear them, and
         * they do not move. */
        for (i = 0; i < M.camps.length; i++) {
            var c = M.camps[i];
            makeStructure(world, {
                kind: "camp",
                team: -1, lane: "mid", x: c.x, y: c.y,
                name: c.kind === "chamber" ? "SCRIPTOR CHAMBER" : "HUSK NEST",
                hp: C.camps.hp, armor: C.camps.armor, mr: 12,
                ad: C.camps.ad, range: 320,
                radius: C.camps.radius, height: 210,
                campKind: c.kind,
                campOwner: c.team,
                respawn: C.camps.respawn,
                facing: (i * 1.1) % (Math.PI * 2)
            });
        }
    }

    function buildReliquary(world) {
        makeStructure(world, {
            kind: "reliquary",
            team: -1, lane: "mid",
            x: M.reliquary.x, y: M.reliquary.y,
            name: "THE RELIQUARY",
            hp: C.reliquary.hp, armor: C.reliquary.armor, mr: 25,
            range: 500,
            radius: M.reliquary.r, height: 420,
            spawned: false
        });
    }

    /* ===== Champions =====
     *
     * The one place where the three permanent stat layers (champion delta,
     * runes, items, Doctrine) are combined. Done once here and updated only
     * on level-up, so the frame loop never touches it. */
    function makeChampion(world, o) {
        var def = S.Champions.get(o.champId);
        var d = def ? def.stats : {};
        var tier = o.doctrineTier || 0;
        var dStats = S.Storage.doctrineStats(tier);

        var runeMods = S.Runes.sumMods(o.runes);

        var u = {
            id: nextId++,
            kind: "champ",
            team: o.team,
            name: def ? def.name : "CHAMPION",
            champId: o.champId,
            def: def,
            faction: def ? def.faction : null,
            role: def ? def.role : null,

            x: o.x, y: o.y, z: 0,
            facing: o.team === 0 ? Math.PI * 0.25 : Math.PI * 1.25,
            /* Champions are drawn noticeably larger than minions: the player
             * has to find their own champion in a crowd of ninety bodies, and
             * the gold base ring under their feet is what makes that a
             * reliable read rather than a hopeful one. The radius is the
             * targeting radius, so this is a hitbox decision and not only a
             * visual one. */
            radius: 56,
            height: 196,

            base: {},
            flat: {},
            pct: {},
            ad: 0, armorBonus: 0,

            hp: 1, alive: true,
            shield: 0, shieldDur: 0,
            buffs: [], assist: [],

            ms: C.champ.baseMs,
            baseMs: C.champ.baseMs,
            range: C.champ.baseRange,
            attackCdLeft: 0,
            windupLeft: 0,
            windupTarget: null,

            target: null,
            moveTo: null,
            /* Aim point, set by the input layer. Direction-targeted abilities
             * read this rather than the facing so a drag that ends slightly
             * off-unit still casts where the player pointed. */
            aimX: 0, aimY: 1,
            casting: null,
            abilities: [],

            lane: o.lane || "mid",

            level: 1,
            xp: 0,
            mana: 0,
            gold: 0,
            goldFromFight: 0,
            items: [],
            itemFlags: {},
            runes: o.runes,
            runeHooks: S.Runes.hooks(o.runes),
            doctrineTier: tier,

            cs: 0,
            kills: 0, deaths: 0, assists: 0,
            dealtToChampes: 0,
            isPlayer: !!o.isPlayer,
            brain: null,

            lastHitAt: -999,
            lastDamagedAt: -999,
            lastHealAt: -999,
            deathTime: -999,
            deadFor: 0,
            outOfCombat: 0,
            inCombat: false,
            recalling: 0,
            atBase: false,
            shopOpen: false,
            spawnedAt: world.time,
            visible: true,
            visibleAt: -999
        };

        /* Permanent flat adds: champion delta is already folded into `base`
         * by recomputeBase, so this layer is runes + items + Doctrine only. */
        var flat = {
            ad: (runeMods.ad || 0) + (dStats.ad || 0),
            ms: (runeMods.ms || 0) + (dStats.ms || 0),
            hp: (runeMods.hp || 0) + (dStats.hp || 0),
            armor: runeMods.armor || 0,
            mr: runeMods.mr || 0,
            hpRegen: runeMods.hpRegen || 0,
            manaRegen: runeMods.manaRegen || 0,
            crit: runeMods.crit || 0,
            lifesteal: runeMods.lifesteal || 0,
            omnivamp: runeMods.omnivamp || 0,
            cdr: runeMods.cdr || 0,
            ap: runeMods.ap || 0
        };
        var pct = {
            ad: runeMods.adPct || 0,
            as: runeMods.asPct || 0,
            ms: runeMods.msPct || 0
        };
        S.Combat.applyPermanent(u, flat, pct);

        S.Combat.recomputeBase(u);
        /* Doctrine HP is an addition to maximum health, not to the baseline,
         * so it is applied after recomputeBase rather than through the level
         * curve. */
        u.hp = S.Combat.stat(u, "hp");
        u.mana = S.Combat.stat(u, "mana");

        /* Items start empty; a loadout is bought during the match. */
        if (o.items) {
            for (var i = 0; i < o.items.length; i++) buyItem(world, u, o.items[i]);
        }

        S.Abilities.initChampionAbilities(u, def);
        if (def) u.range = S.Combat.stat(u, "range");

        /* grantXp calls this with just the level number, because the unit
         * already knows who it is. The closure supplies the unit. Passing it
         * as an argument as well meant combat.js's `u.onLevelUp(u.level)`
         * call bound the LEVEL to the parameter called `unit`, and every
         * level-up past the first crashed. */
        u.onLevelUp = function (lvl) { onLevelUp(world, u, lvl); };
        world.units.push(u);
        world.champs.push(u);
        return u;
    }

    function onLevelUp(world, u, lvl) {
        var prevMax = S.Combat.stat(u, "hp");
        S.Combat.recomputeBase(u);
        var newMax = S.Combat.stat(u, "hp");
        /* Grant the difference rather than the whole new maximum: a level-up
         * that heals you to full is a free heal every single level, and the
         * sum of them over a match is a whole item's worth of health. */
        u.hp = Math.min(newMax, u.hp + (newMax - prevMax));
        u.mana = Math.min(S.Combat.stat(u, "mana"), u.mana + 40);
        S.Abilities.refreshRanks(u);
        S.World.spawnBurst(world, u.x, u.y, u.team, 14, "#ffd24a");
        S.World.floatText(world, u.x, u.y, "LV " + lvl, "#ffd24a");
        S.Audio.levelUp(u.team);
    }

    function buyItem(world, u, id) {
        var it = S.Items.get(id);
        if (!it) return false;
        if (u.items.indexOf(id) >= 0) return false;
        if (u.gold < it.cost) return false;
        u.gold -= it.cost;
        u.items.push(id);
        if (it.passive) u.itemFlags[it.passive] = true;

        /* Item stats fold into the permanent layers. Flat and percent are
         * kept apart exactly as they are for runes, so a percent item and a
         * flat item compose the same way two runes do. */
        var m = it.mods || {};
        for (var k in m) {
            if (!Object.prototype.hasOwnProperty.call(m, k)) continue;
            if (k === "adPct") { u.pct.ad = (u.pct.ad || 0) + m[k]; continue; }
            if (k === "asPct") { u.pct.as = (u.pct.as || 0) + m[k]; continue; }
            if (k === "msPct") { u.pct.ms = (u.pct.ms || 0) + m[k]; continue; }
            u.flat[k] = (u.flat[k] || 0) + m[k];
        }

        /* CHAPTERN BANNER reduces incoming damage rather than raising outgoing
         * damage, so it cannot be expressed as a stat at all. It is a flag
         * read by combat.damageReductionVsStructures instead. */
        return true;
    }

    /* ===== Vision =====
     *
     * "Warp haze" instead of League's hard fog. Unexplored ground is dim but
     * visible; enemies you cannot see are drawn as silhouettes. The reason
     * for the softer version is that on a 390px-wide phone a hard fog turns
     * every gank into a coin flip, and the information a player gets from
     * "something is happening over there, and it has stopped moving" is worth
     * a real amount of skill.
     *
     * A unit is visible when it is inside any allied champion's or
     * structure's vision. That is a linear scan over a handful of entities,
     * recomputed once per frame rather than per drawn thing. */
    function computeVision(world) {
        var i, j;
        var visionSources = [];
        for (i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.alive || u.kind !== "champ") continue;
            if (!u.visible) continue;
            var r = C.vision.champion;
            if (u.runeHooks && u.runeHooks.predator) {
                /* PREDATOR's vision bonus only runs while the champion is
                 * actually below its threshold, which is checked by the
                 * predicate below rather than assumed. */
                var max = S.Combat.stat(u, "hp");
                if (max > 0 && u.hp / max < u.runeHooks.predator.threshold) {
                    r += u.runeHooks.predator.visionBonus;
                }
            }
            visionSources.push({ x: u.x, y: u.y, r: r, team: u.team });
        }
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive || s.team < 0) continue;
            if (s.team === 0 || s.team === 1) {
                visionSources.push({ x: s.x, y: s.y, r: C.vision.structure, team: s.team });
            }
        }

        /* A source only ever reveals the OTHER team. A system that revealed
         * your own units through your own vision radius would hide nothing at
         * all, so the test is a team comparison rather than a distance test
         * alone. */
        function seenBy(t) {
            for (j = 0; j < visionSources.length; j++) {
                var v = visionSources[j];
                if (v.team === t) continue;
                if (S.dist2(t.x, t.y, v.x, v.y) <= v.r * v.r) return true;
            }
            return false;
        }

        for (i = 0; i < world.units.length; i++) {
            var e = world.units[i];
            if (!e.alive) { e.visible = false; continue; }
            /* Your own units are always visible to you. A champion you have
             * lost track of is a bug, not fog of war. */
            e.visible = (e.team === 0 || e.team === 1) ? true : seenBy(e);
            if (e.visible) e.visibleAt = world.time;
        }
        /* Neutral camps and the Reliquary are visible to everyone. A camp
         * that is up should never be a secret - the decision is whether it is
         * worth walking to, not whether you noticed it existed. */
        for (i = 0; i < world.structures.length; i++) {
            var st = world.structures[i];
            if (!st.alive) { st.visible = false; continue; }
            st.visible = st.team < 0 ? true : seenBy(st);
        }
    }

    /* Which of `team` can see the given point. Used by the minimap to decide
     * what to fog, and by AI to decide whether a gank is worth walking into. */
    function teamSees(world, team, x, y, radius) {
        var i;
        for (i = 0; i < world.champs.length; i++) {
            var c = world.champs[i];
            if (!c.alive || c.team !== team) continue;
            var r = C.vision.champion;
            if (c.runeHooks && c.runeHooks.predator) {
                var max = S.Combat.stat(c, "hp");
                if (max > 0 && c.hp / max < c.runeHooks.predator.threshold) r += c.runeHooks.predator.visionBonus;
            }
            if (S.dist2(c.x, c.y, x, y) <= r * r) return true;
        }
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive || s.team !== team) continue;
            if (S.dist2(s.x, s.y, x, y) <= C.vision.structure * C.vision.structure) return true;
        }
        return false;
    }

    /* ===== Waves =====
     *
     * Composition is melee first, then the ranged line, then the cannon. The
     * order is the design: a wave arrives as something you can trade with
     * and then becomes something you cannot, which is the entire reason a
     * player has to decide when to leave the lane. */
    function spawnWave(world, team, lane) {
        var w = C.waves;
        var lvl = minionLevel(world.time);
        var b = M.bases[team];
        var n = w.perWave + (w.rangedPerWave ? 1 : 0) + w.cannonPerWave;
        var spawned = 0;

        function put(bodyKey, isBanner, back) {
            var body = C.minion[bodyKey];
            var t = back ? 0.055 : 0.02;
            var p = M.lanePointAt(lane, team === 0 ? t : 1 - t);
            var hp = body.hp + C.minion.hpPerLevel * (lvl - 1);
            var ad = body.ad + C.minion.adPerLevel * (lvl - 1);
            if (isBanner) {
                hp *= w.bannerHpMult;
                ad *= w.bannerAdMult;
            }
            var u = makeUnit(world, {
                kind: "minion",
                team: team,
                lane: lane,
                name: bodyKey === "cannon" ? "SIEGE MINION" : (bodyKey === "ranged" ? "SCOUT MINION" : "CONSCRIPT"),
                x: p.x, y: p.y,
                hp: hp, ad: ad, armor: body.armor + lvl * 1.6, mr: body.mr + lvl * 0.8,
                ms: body.ms, as: body.as, range: body.range,
                radius: body.radius, height: body.height,
                banner: isBanner,
                isMinion: true,
                progress: team === 0 ? t : 1 - t
            });
            u.lvl = lvl;
            u.goldValue = body.gold * (isBanner ? w.bannerGoldMult : 1);
            u.xpValue = body.xp * (isBanner ? w.bannerXpMult : 1);
            /* `shape` is what the renderer keys its colour and height off, so
             * a unit's body type is carried explicitly rather than inferred
             * from its name at draw time. */
            u.shape = bodyKey;
            u.facing = team === 0 ? Math.PI * 0.25 : Math.PI * 1.25;
            return u;
        }

        var i;
        /* Banners are announced two at fixed times and carry the wave. */
        var bannerIndex = world.waveIndex[team] || 0;
        var bannerSlot = -1;
        if (world.waveIndex[team] === 1 || world.waveIndex[team] === 3) {
            bannerSlot = 2;
        }

        for (i = 0; i < w.perWave; i++) {
            var isB = i === bannerSlot;
            var u = put("melee", isB, i > 0);
            if (isB) u.banner = true;
            spawned++;
        }
        for (i = 0; i < w.rangedPerWave; i++) put("ranged", false, true);
        for (i = 0; i < w.cannonPerWave; i++) put("cannon", false, true);
        return spawned;
    }

    function minionLevel(t) {
        return S.clamp(1 + Math.floor(t / C.minion.levelEvery), 1, C.minion.levelCap);
    }

    /* ===== Lane walking =====
     *
     * Minions do not pathfind. They walk their own lane's polyline by
     * progress value, and they leave it only to attack something within
     * aggro range or to chase something that came out to meet them. A real
     * navigation mesh would buy almost nothing here - the lanes are ribbons
     * and the wilds are open - and it would cost a pathfinding run per minion
     * per step, which at ninety minions is a budget the renderer does not
     * have. */
    function laneStep(world, u, dir) {
        var p = u.progress + dir;
        p = S.clamp(p, 0, 1);
        var pt = M.lanePointAt(u.lane, p);
        u.progress = p;
        return pt;
    }

    /* ===== Movement =====
     * One function moves every unit in the world. Steers toward `moveTo`,
     * respects slows, stops dead while casting, and clamps to the map. */
    /* Keep bodies from occupying the same square.
     *
     * There was no unit-vs-unit collision of any kind: every unit in the
     * world could stand inside every other unit, and a wave arriving on top
     * of a champion rendered as one body. That is not only a visual problem -
     * a champion who has visually taken damage from three sources because
     * three bodies were drawn on top of them is a bug the player reports as
     * "I got hit by something invisible".
     *
     * Deliberately gentle, and deliberately same-team only:
     *
     *   - Allies jostling is cosmetic. Enemies cannot push each other, so
     *     this cannot change who is in range of what, cannot alter a last-hit,
     *     and cannot move a unit out of a projectile's path. Every number in
     *     the game is unaffected.
     *   - The push is a fraction of the overlap per step rather than a
     *     positional correction, so it looks like a crowd jostling into
     *     formation instead of a swarm of bodies snapping to a lattice.
     */
    function separate(world, u, dt) {
        if (!u.alive || u.kind === "structure") return;
        var r0 = u.radius || 30;
        forEachNear(world, u.x, u.y, r0 * 3, function (o) {
            if (o === u || !o.alive || o.team !== u.team) return;
            if (o.kind === "structure") return;
            var dx = u.x - o.x, dy = u.y - o.y;
            var d2 = dx * dx + dy * dy;
            /* 0.62 keeps bodies overlapping slightly. Full separation makes a
             * lane read as a queue of beads; a little interpenetration is
             * what makes a crowd look like a crowd. */
            var min = (r0 + (o.radius || 30)) * 0.62;
            if (d2 >= min * min) return;
            if (d2 < 1e-4) { dx = 1; dy = 0; d2 = 1; }
            var d = Math.sqrt(d2);
            var k = ((min - d) / d) * Math.min(1, dt * 9);
            u.x += dx * k;
            u.y += dy * k;
        });
        M.clampToMap(u);
    }

    function moveUnit(world, u, dt) {
        if (!u.alive) return;
        /* `u.moving` is the ONLY animation state the renderer reads, so it has
         * to be exactly "is this body travelling right now". Returning early
         * without clearing it left a unit walking in place forever: the
         * joystick was released, the AI changed its mind, the move target was
         * consumed - and the legs kept cycling against a body that had not
         * moved since. Two of the three early-outs below used to skip this. */
        if (!u.moveTo) { u.moving = false; return; }
        if (!S.Combat.canMove(u)) { u.moving = false; return; }

        var dx = u.moveTo.x - u.x, dy = u.moveTo.y - u.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 6) { u.moveTo = null; u.moving = false; return; }

        /* The stat, not the construction-time constant. See Combat.moveSpeed
         * for what this one line was costing the game. */
        var speed = S.Combat.moveSpeed(u);
        /* PRESSURE: in the enemy half, faster. Evaluated per step rather than
         * as a buff so it toggles the instant a champion crosses the river,
         * which is the moment the player is actually watching for. */
        if (u.runeHooks && u.runeHooks.pressure) {
            if (!M.inOwnHalf(u.lane, u.x, u.y, u.team)) {
                speed *= 1 + u.runeHooks.pressure.msBuff;
            }
        }
        speed *= 1 - S.Combat.slowPct(u);
        speed *= M.terrainSpeed(u.x, u.y);
        if (u.casting) speed = 0;
        if (u.recalling > 0) speed = 0;

        var step = Math.min(d, speed * dt);
        var nx = u.x + dx / d * step;
        var ny = u.y + dy / d * step;
        M.clampToMap(u);
        u.x = nx; u.y = ny;
        u.moving = step > 0.01;
        /* Facing is locked for the duration of a cast. `facingLocked` existed
         * and was read here since the first version of this function, but
         * nothing ever set it - so a champion that started a windup turned to
         * face its move target mid-cast, and a cone or a beam aimed by hand
         * drifted off the point the player was holding. */
        if (!u.facingLocked && !u.casting) u.facing = Math.atan2(dy, dx);
    }

    /* Push something out of a hard effect: knockback, pulls, warp scar. */
    function displace(world, u, dx, dy) {
        if (!u || !u.alive) return;
        u.x += dx; u.y += dy;
        M.clampToMap(u);
    }

    /* ===== Attacks =====
     *
     * A three-phase attack: windup, the hit, then the cooldown. The windup is
     * what makes attacking a decision rather than a toggle - you can be
     * cancelled out of a swing by a stun, and the whole roster of melee
     * champions depends on that being true. */
    function startAttack(world, u, target) {
        var range = S.Combat.stat(u, "range") + (target.radius || 40) + (target.kind === "structure" || target.kind === "tower" || target.kind === "core" ? 60 : 0);
        if (S.dist2(u.x, u.y, target.x, target.y) > range * range) return false;
        u.windupTarget = target;
        u.windupLeft = C.champ.attackWindup;
        return true;
    }

    function resolveAttack(world, u, target) {
        if (!target || !target.alive) { u.windupTarget = null; return; }
        var ad = S.Combat.stat(u, "ad");
        var type = target.kind === "tower" || target.kind === "core" || target.kind === "structure" || target.kind === "camp" || target.kind === "reliquary"
            ? "magic" : "phys";
        var res = S.Combat.damage(u, target, ad, type, { structMul: 1 });
        if (res.dealt > 0 && target.kind === "minion") lastHit(u, target);
        S.Combat.fireAutoAttack(u, target);
        S.World.spark(u, target, type);
    }

    /* Last-hitting: the whole economy of the game in one function. Gold to
     * the attacker who finished it, XP to everyone nearby on the other side.
     * Assisting pays a fraction of the gold, which makes grouping worth it
     * without making last-hitting optional. */
    function lastHit(killer, minion) {
        if (!minion.givesGold) return;
        var gold = minion.goldValue || 0;

        /* REQUISITION and DILIGENT BLADE both read here rather than in
         * combat.js, because this is the only place a minion's death is
         * turned into gold and there is exactly one such place. */
        if (killer.faction === "guard") gold *= 1.18;
        if (killer.runeHooks && killer.runeHooks.lastGold) {
            gold += minion.banner ? killer.runeHooks.lastGold.goldPerCannon
                : killer.runeHooks.lastGold.goldPerMinion;
        }
        S.Combat.addGold(killer, Math.round(gold), minion);
        killer.cs++;
    }

    function grantMinionXp(minion) {
        if (!minion.givesXp) return;
        /* XP is shared around the corpse, gold is not. That asymmetry is the
         * entire reason to fight over a wave rather than race for it: you can
         * stand back and still learn from your team clearing. */
        S.Combat.grantXpArea(minion.x, minion.y, minion.xpValue || 0, null, minion.team);
    }

    /* The live world. combat.js calls onStructureDeath with only the target
     * and the killer - it has no world reference of its own, and threading
     * one through every damage path to avoid a single module-level pointer
     * would be a worse trade than the one global. There is only ever one
     * match alive at a time, so this is unambiguous. */
    var CURRENT = null;

    /* Structures give no XP, only gold, and only to whoever finished them. */
    function onStructureDeath(s, killer) {
        var world = CURRENT;
        if (!world) return;
        if (s.kind === "core") {
            world.winner = 1 - s.team;
            world.over = true;
            world.overAt = world.time;
            S.Audio.finish(world.winner === 0);
            return;
        }
        if (s.kind === "reliquary") {
            s.dead = true;
            s.respawn = 90;
            return;
        }
        if (s.kind === "camp") {
            if (killer && killer.kind === "champ") {
                var g = Math.round(C.camps.goldMin + (C.camps.goldMax - C.camps.goldMin) * S.World.rng());
                S.Combat.addGold(killer, g, s);
                S.Combat.grantXp(killer, C.camps.xp, null);
            }
            s.deadFor = C.camps.respawn;
            return;
        }
        /* Towers. The gold is large on purpose: it is the moment a lane
         * changes hands, and a player who has lost a tower should feel it in
         * the shop as well as on the map. */
        if (killer && killer.kind === "champ") {
            S.Combat.addGold(killer, C.tower.plates ? 250 : 200, s);
        }
        S.World.spawnBurst(world, s.x, s.y, s.team, 60, "#e0b23c");
        S.World.shake(world, 1.6);
        S.World.floatText(world, s.x, s.y, "BASTION FALLS", "#ffd24a");
        S.Audio.towerFalls(s.team);
    }

    function updateCoreExposure(world, team) {
        var i, down = 0;
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (s.kind === "tower" && s.team === team && !s.alive) down++;
        }
        for (i = 0; i < world.structures.length; i++) {
            var c = world.structures[i];
            if (c.kind !== "core" || c.team !== team) continue;
            /* Exposed only once BOTH towers are down. One tower left means
             * there is still something shooting from it, and a 25% damage
             * bonus behind one remaining tower would be a death sentence
             * rather than an endgame. */
            c.exposed = down >= 2;
        }
    }

    /* ===== Structure behaviour ===== */
    function updateStructure(world, s, dt) {
        if (!s.alive) {
            if (s.deadFor !== undefined && s.deadFor > 0) {
                s.deadFor -= dt;
                if (s.deadFor <= 0) {
                    /* Respawn, at full plates. A tower that comes back with
                     * no plates is not a reset, it is a continuation of the
                     * dive that killed it. */
                    s.alive = true;
                    s.deadFor = 0;
                    s.hp = s.base.hp;
                    s.plateArmor = C.tower.plateArmour;
                    s.platesDown = 0;
                    s.rampSteps = 0;
                }
            }
            return;
        }

        if (s.dur > 0) {
            s.durLeft -= dt;
            if (s.durLeft <= 0) { s.alive = false; return; }
        }

        if (s.kind === "tower") updateTower(world, s, dt);
        else if (s.kind === "camp" || s.kind === "reliquary") updateNeutral(world, s, dt);
    }

    function updateTower(world, s, dt) {
        var t = C.tower;

        /* Plate regeneration. Starts after a quiet period, and regenerates
         * faster before level 11 than after, because an early tower plate is
         * the resource a lane is actually fought over while a late one is
         * only a formality. */
        if (world.time - s.lastDamagedAt > t.plateRegenDelay) {
            var rate = world.time < t.plateRegenLateAt ? t.plateRegen : t.plateRegenLate;
            var maxArmour = t.plateArmour * t.plates;
            if (s.plateArmor < maxArmour) {
                s.plateArmor = Math.min(maxArmour, s.plateArmor + rate * dt);
                s.platesDown = Math.max(0, t.plates - Math.ceil(s.plateArmor / t.plateArmour));
            }
        }

        /* Escalation. Rises while the tower is being pressured and relaxes
         * five seconds after it stops being pressured. */
        if (world.time - s.lastDamagedAt < 5) {
            s.rampAcc += dt;
            if (s.rampAcc >= t.rampPeriod) {
                s.rampAcc = 0;
                s.rampSteps = Math.min(t.rampMax, s.rampSteps + 1);
            }
        } else {
            s.rampSteps = Math.max(0, s.rampSteps - 1);
            s.rampAcc = 0;
        }

        /* Target the nearest enemy champion in range, never a minion. A tower
         * that shoots the wave is a tower that has stopped being the reason
         * you do not dive. */
        if (s.target && (!s.target.alive || s.target.team === s.team ||
            S.dist2(s.x, s.y, s.target.x, s.target.y) > t.range * t.range)) {
            s.target = null;
        }
        if (!s.target) {
            var best = null, bestD = t.range * t.range;
            for (var i = 0; i < world.champs.length; i++) {
                var c = world.champs[i];
                if (!c.alive || c.team === s.team) continue;
                var d2 = S.dist2(s.x, s.y, c.x, c.y);
                if (d2 < bestD) { bestD = d2; best = c; }
            }
            s.target = best;
        }

        s.attackCdLeft -= dt;
        if (s.target && s.attackCdLeft <= 0) {
            s.attackCdLeft = t.cooldown;
            fireTowerShot(world, s, s.target);
        }
    }

    function fireTowerShot(world, s, target) {
        var t = C.tower;
        var lvl = 1;
        for (var i = 0; i < world.champs.length; i++) {
            if (world.champs[i] === target) { lvl = world.champs[i].level; break; }
        }
        var dmg = (t.damage + t.damagePerLevel * lvl) * (1 + t.rampStep * s.rampSteps);
        var dx = target.x - s.x, dy = target.y - s.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        world.effects.push({
            kind: "proj",
            team: s.team,
            owner: s,
            x: s.x + dx / len * (s.radius * 0.6),
            y: s.y + dy / len * (s.radius * 0.6),
            z: s.height * 0.72,
            dx: dx / len, dy: dy / len,
            speed: t.projectileSpeed,
            r: 46,
            range: t.range,
            travelled: 0,
            life: 0,
            dmg: dmg,
            dmgType: "magic",
            structMul: 1,
            /* Towers cannot be avoided by walking behind another tower: the
             * projectile tests every hostile it passes and stops at the first
             * champion, so a second tower in line does not eat the shot. */
            pierce: false,
            hits: [],
            dead: false,
            look: "towerbolt",
            width: 22,
            isTowerShot: true
        });
        S.Audio.towerShot();
    }

    /* Camps and the Reliquary: acquire the nearest enemy champion in range
     * and hit them on a slow cadence. They do not chase, and they cannot be
     * attacked by their own side, which is what stops a defender from
     * "clearing" a camp that is meant to be a contested objective. */
    function updateNeutral(world, s, dt) {
        var range = s.base.range;
        if (!s.target || !s.target.alive || s.target.team === s.team ||
            S.dist2(s.x, s.y, s.target.x, s.target.y) > range * range) {
            s.target = null;
            var best = null, bestD = range * range;
            for (var i = 0; i < world.champs.length; i++) {
                var c = world.champs[i];
                if (!c.alive || c.team === s.team) continue;
                var d2 = S.dist2(s.x, s.y, c.x, c.y);
                if (d2 < bestD) { bestD = d2; best = c; }
            }
            s.target = best;
        }
        s.attackCdLeft -= dt;
        if (s.target && s.attackCdLeft <= 0) {
            s.attackCdLeft = 1.4;
            S.Combat.damage(s, s.target, s.base.ad, "phys", { structMul: 1 });
            s.facing = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        }
    }

    /* The Reliquary is inert until both teams have lost a tower. It is a
     * health bar that the map hands you when the match has earned it. */
    function updateReliquary(world, dt) {
        var r = null, i;
        for (i = 0; i < world.structures.length; i++) {
            if (world.structures[i].kind === "reliquary") { r = world.structures[i]; break; }
        }
        if (!r) return;
        if (!r.spawned && world.time >= C.reliquary.spawnAt) {
            var towersDown = 0;
            for (i = 0; i < world.structures.length; i++) {
                var s = world.structures[i];
                if (s.kind === "tower" && !s.alive) towersDown++;
            }
            if (towersDown >= 2) {
                r.spawned = true;
                r.hp = C.reliquary.hp;
                r.alive = true;
                S.World.floatText(world, r.x, r.y, "THE RELIQUARY WAKES", "#ffd24a");
                S.Audio.reliquary();
            }
        }
        if (r.spawned && r.alive) updateNeutral(world, r, dt);
    }

    /* Plate armour is read through combat.stat as an armour bonus, because
     * that is the only place armour is consulted. Threading it through every
     * damage call instead would mean remembering to add it in eleven places,
     * and forgetting one of them would be invisible. */
    function plateArmorOf(s) {
        return (s.kind === "tower" && s.alive) ? s.plateArmor : 0;
    }

    /* ===== The step ===== */
    function step(world, dt) {
        /* The simulation currently being ticked.
         *
         * combat.js resolves damage and deaths without being handed the world,
         * because threading a parameter through every damage path to reach a
         * particle spawn is a large diff for one visual. A single reference,
         * set once per step, is the honest way to do it - and it is only ever
         * read during a step, so it cannot go stale. */
        S.Combat.currentWorld = world;
        var i, j;
        world.time += dt;
        S.Combat.now = world.time;

        /* Rebuild the spatial index before anything queries it. The grid is
         * rebuilt from scratch rather than updated incrementally because the
         * units are moving every step anyway, so a full rebuild is O(n) and
         * an incremental update would be O(moves) with a much easier way to
         * be wrong. */
        rebuildGrid(world);

        /* Transient presentation state is aged AND retired HERE, not in the
         * renderer.
         *
         * If this lived in draw(), a backgrounded tab - which stops drawing
         * but keeps stepping - would accumulate particles for as long as the
         * tab stayed open. The simulation owns its own garbage.
         *
         * Ageing belongs here for the same reason. When cleanup was moved here
         * and ageing was left behind in the renderer, the two halves stopped
         * being a pair: `life` never advanced without a draw, so nothing
         * ever expired. One five-minute match leaked 3,108 particles, growing
         * linearly, every one of them drawn at full alpha for the rest of the
         * session. Ageing next to the test that checks it means the two can
         * never drift apart again. */
        for (i = world.fx.length - 1; i >= 0; i--) {
            var p = world.fx[i];
            p.life += dt;
            if (p.life < p.dur && !p.spark) {
                /* Sparks are a drawn line between two fixed points, so they
                 * integrate nothing. Everything else is a physical body:
                 * gravity, then a landing. A burst that falls is worth a
                 * fifth more than one that does not. */
                p.vz -= 420 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z = Math.max(0, p.z + p.vz * dt);
            }
            if (p.life >= p.dur) world.fx.splice(i, 1);
        }
        /* A hard ceiling, not an age rule.
         *
         * world.fx only ever shrank by expiring, and drawParticles walks the
         * whole array every frame with no view culling, so anything that can
         * emit can emit without limit. Measured peak in a busy match is 182,
         * which leaves real headroom under this. When the ceiling is hit the
         * OLDEST particle is dropped, because the newest one is the one the
         * player is looking at. */
        while (world.fx.length > FX_CAP) world.fx.shift();
        decayShake(world, dt);
        for (i = world.texts.length - 1; i >= 0; i--) {
            if (world.texts[i].life >= world.texts[i].dur) world.texts.splice(i, 1);
        }
        if (world.pings) {
            for (i = world.pings.length - 1; i >= 0; i--) {
                if (world.time - world.pings[i].at >= world.pings[i].dur) world.pings.splice(i, 1);
            }
        }
        /* Damage numbers arrive from combat.js and are owned here, for the
         * same reason. combat has no world reference and needs none. */
        /* Heal numbers.
         *
         * combat.heal() has pushed into healEvents since the beginning and
         * nothing has ever drained them - the getter existed, was exercised by
         * the harness, and was never called from anywhere in the game. Every
         * shield, every regeneration tick and every Guardian's prayer healed
         * invisibly. */
        if (S.Combat.healEvents && S.Combat.healEvents.length) {
            for (i = 0; i < S.Combat.healEvents.length; i++) {
                var he = S.Combat.healEvents[i];
                if (world.nums.length > 40) world.nums.shift();
                world.nums.push({
                    x: he.x, y: he.y, z: he.z + (he.height || 0) * 0.7,
                    text: "+" + S.fmt(he.amount), color: S.PAL.heal, crit: false,
                    life: 0, dur: 1.1
                });
            }
            S.Combat.healEvents.length = 0;
        }
        if (S.Combat.numEvents && S.Combat.numEvents.length) {
            for (i = 0; i < S.Combat.numEvents.length; i++) {
                var ne = S.Combat.numEvents[i];
                if (world.nums.length > 40) world.nums.shift();
                world.nums.push({ x: ne.x, y: ne.y, z: ne.z, text: ne.text, color: ne.color, crit: ne.crit, life: 0, dur: ne.crit ? 1.5 : 1.1 });
            }
            S.Combat.numEvents.length = 0;
        }
        for (i = world.nums.length - 1; i >= 0; i--) {
            if (world.nums[i].life >= world.nums[i].dur) world.nums.splice(i, 1);
        }

        /* Passive income, and the free wave-clear gold. */
        for (i = 0; i < world.champs.length; i++) {
            var c = world.champs[i];
            if (!c.alive) continue;
            c.gold += C.champ.goldPerSec * dt;
            if (c.atBase) c.gold += 0;
        }

        /* Wave spawning. */
        world.waveTimer += dt;
        if (world.waveTimer >= C.waves.period) {
            world.waveTimer -= C.waves.period;
            for (var team = 0; team < 2; team++) {
                world.waveIndex[team]++;
                for (var l = 0; l < M.laneNames.length; l++) {
                    spawnWave(world, team, M.laneNames[l]);
                }
            }
            /* BOOTLEG pays per wave cleared. Counted once per wave, for the
             * whole team, and given only to champions still standing - a
             * dead champion collecting a wave bounty would be a small but
             * constant incentive to die. */
            for (i = 0; i < world.champs.length; i++) {
                var lc = world.champs[i];
                if (!lc.alive || !lc.runeHooks || !lc.runeHooks.cheapWard) continue;
                S.Combat.addGold(lc, lc.runeHooks.cheapWard.goldPerWave, null);
            }
        }

        updateReliquary(world, dt);

        /* Core exposure, re-evaluated every step rather than only when a
         * Tower dies. Two Cores and six Towers is a trivial scan, and
         * deriving it from the death event alone meant any Tower removed by
         * a path that skips combat.kill - a summon's expiry, a test poking
         * `alive` directly - left its Core permanently unexposed. */
        updateCoreExposure(world, 0);
        updateCoreExposure(world, 1);

        /* Structures. */
        for (i = 0; i < world.structures.length; i++) {
            updateStructure(world, world.structures[i], dt);
        }

        /* Units. */
        for (i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.alive) {
                u.deadFor += dt;
                /* Champions are respawned from HERE, not from
                 * updateChampion. updateChampion is called below and only
                 * for live units, so while the respawn logic lived there a
                 * dead champion stayed dead forever - there is no path in the
                 * loop that ever reaches it again. */
                if (u.kind === "champ") tickRespawn(world, u);
                else if (u.deadFor > 1.2) u.removeMe = true;
                continue;
            }

            S.Combat.tick(u, dt);

            if (u.dur > 0) {
                u.durLeft -= dt;
                if (u.durLeft <= 0) { killUnit(world, u, null); continue; }
            }

            if (u.kind === "champ") updateChampion(world, u, dt);
            else updateMinion(world, u, dt);

            moveUnit(world, u, dt);
            separate(world, u, dt);
            /* Dash travel is aged here, beside everything else transient, so
             * a headless run ages it identically to a rendered one. */
            if (u.dashAnim) {
                u.dashAnim.t += dt;
                if (u.dashAnim.t >= u.dashAnim.dur) u.dashAnim = null;
            }
            tickAttack(world, u, dt);
        }

        /* Abilities, projectiles, fields, casts. */
        S.Abilities.tick(world, dt);

        /* Compact dead entities out of the arrays. Done in-place with a
         * write cursor: this runs every step and allocating a new array
         * sixty times a second is how a mobile browser ends up collecting
         * garbage during a fight. */
        var w = 0;
        for (i = 0; i < world.units.length; i++) {
            if (!world.units[i].removeMe) world.units[w++] = world.units[i];
        }
        world.units.length = w;

        /* Champions are NOT compacted, and there is deliberately no loop here
         * for them. They are never removed, dead included: the HUD, the kill
         * feed, the scoreboard and the AI all hold references into this
         * array, and a length change would invalidate every one of them.
         *
         * There used to be a compaction block that filtered world.units into
         * world.champs - it preserved the contents but permuted the order on
         * every single step, so champion index 0 was a different person every
         * frame. Anything holding an index rather than a reference, which is
         * most of the HUD, would have shown scrambled data. */

        w = 0;
        for (i = 0; i < world.structures.length; i++) {
            if (world.structures[i].alive || world.structures[i].kind !== "camp") {
                world.structures[w++] = world.structures[i];
            }
        }
        world.structures.length = w;

        computeVision(world);
    }

    function killUnit(world, u, src) {
        u.alive = false;
        u.hp = 0;
        u.deathTime = world.time;
        u.deadFor = 0;
    }

    /* ===== Champion step =====
     * Fountain, recall, respawn, regen, and out-of-combat tracking. Combat
     * decisions are the AI's business; this is the bookkeeping around them. */
    function updateChampion(world, u, dt) {
        var base = M.bases[u.team];

        /* The bot brain runs before the bookkeeping so that a bot's decision
         * to walk somewhere is visible in the same step to the out-of-combat
         * tracker. The player champion has no brain and falls straight
         * through - which is why the human and the bots share this entire
         * function rather than having a parallel path. */
        if (u.brain && S.AI) S.AI.think(world, u.brain, dt);

        /* In the fountain: no regen credit from anywhere else, and a real
         * one from here. Note what this block does NOT do - it does not
         * clear moveTo. The fountain heals; it does not root. Clearing
         * movement here made every champion that respawned in its own base
         * unable to walk out of it, which is the sort of bug that looks like
         * "the AI is bad" and is actually the fountain eating its orders. */
        var fd2 = S.dist2(u.x, u.y, base.fountain.x, base.fountain.y);
        var inFountain = fd2 <= base.fountain.r * base.fountain.r;
        u.atBase = fd2 <= base.shop.r * base.shop.r;
        u.inFountain = inFountain;

        if (inFountain) {
            S.Combat.heal(u, base.fountain.healPerSec * dt, null);
            u.mana = Math.min(S.Combat.stat(u, "mana"), u.mana + C.champ.baseManaRegen * 2 * dt);
        }

        /* Recall. Only outside combat, and interrupted by damage - which is
         * the entire tension of the mechanic. */
        if (u.recalling > 0) {
            if (world.time - u.lastDamagedAt < C.champ.outOfCombatRegenDelay) {
                u.recalling = 0;
                S.World.floatText(world, u.x, u.y, "RECALL BROKEN", "#c8353f");
            } else {
                u.recalling += dt;
                u.moveTo = null;
                if (u.recalling >= C.champ.recallTime) {
                    u.recalling = 0;
                    u.hp = S.Combat.stat(u, "hp");
                    u.mana = S.Combat.stat(u, "mana");
                    u.x = base.fountain.x; u.y = base.fountain.y;
                    S.World.spawnBurst(world, u.x, u.y, u.team, 20, "#6fd8e8");
                }
            }
        }

        /* Out-of-combat tracking. A champion that has not attacked or been
         * hit for six seconds starts regenerating health and mana, and the
         * shop opens. Both are what make retreating a real option rather
         * than just walking away. */
        var quiet = world.time - Math.max(u.lastHitAt, u.lastDamagedAt);
        u.inCombat = quiet < C.champ.outOfCombatRegenDelay;
        u.outOfCombat = quiet;
        if (!u.inCombat && !inFountain && u.hp < S.Combat.stat(u, "hp")) {
            S.Combat.heal(u, S.Combat.stat(u, "hpRegen") * 1.6 * dt, null);
        }
        u.mana = Math.min(S.Combat.stat(u, "mana"), u.mana + S.Combat.stat(u, "manaRegen") * dt);

        /* Cooldown reduction folded in here rather than into every ability
         * timer, so a CDR item cannot accidentally apply twice. */
        var cdr = S.clamp(S.Combat.stat(u, "cdr"), 0, C.cdrCap);
        u.cdrScale = 1 - cdr;

    }

    /* Respawn timer. Lives outside updateChampion because the dead branch of
     * the unit loop `continue`s before updateChampion is reached, so a
     * champion that never gets a turn here simply never comes back. */
    function tickRespawn(world, u) {
        var respawn = C.champ.respawnBase + C.champ.respawnPerLevel * u.level;
        u.respawnIn = Math.max(0, respawn - u.deadFor);
        if (u.deadFor >= respawn) respawnChampion(world, u);
    }

    function respawnChampion(world, u) {
        var base = M.bases[u.team];
        u.alive = true;
        u.hp = S.Combat.stat(u, "hp");
        u.mana = S.Combat.stat(u, "mana");
        u.x = base.spawn.x; u.y = base.spawn.y;
        u.shield = 0; u.shieldDur = 0;
        u.buffs.length = 0;
        u.assist.length = 0;
        u.dealtToChampes = 0;
        u.casting = null;
        u.moveTo = null;
        u.recalling = 0;
        u.deadFor = 0;
        u.deathTime = -999;
        u.lastDamagedAt = world.time;
        for (var i = 0; i < u.abilities.length; i++) u.abilities[i].cdLeft = 0;
        S.World.spawnBurst(world, u.x, u.y, u.team, 22, "#e0b23c");
    }

    /* ===== Minion step =====
     *
     * Three rules, in priority order: finish what is attacking you, attack
     * something in range, otherwise walk. No state machine, because a wave
     * of ninety identical bodies does not need one - what a wave needs is to
     * be predictable enough that a player can read it and last-hit it. */
    function updateMinion(world, u, dt) {
        u.lastAttackAt = u.lastAttackAt || -999;

        var range = S.Combat.stat(u, "range");
        /* Acquisition range. Melee minions only notice something a hundred
         * and sixty units away, which is barely outside their own reach - so
         * a wave does not stop walking because a champion wandered into it,
         * it stops because a wave stepped into it. That distinction is the
         * whole reason a minion wave is a wall and a champion is not. */
        var acq = range * 1.15 + 60;
        var best = null, bestD = Infinity;
        var myProg = M.laneProgress(u.lane, u.x, u.y);

        S.World.forEachNear(world, u.x, u.y, acq, function (e) {
            if (e.team === u.team) return;
            var d2 = S.dist2(u.x, u.y, e.x, e.y);
            if (d2 >= bestD) return;
            if (e.kind === "champ") {
                /* Only chase a champion that is roughly in this lane's
                 * territory. Without that test a bot with 350 range would
                 * peel off across the river at level three. */
                var p = M.laneProgress(u.lane, e.x, e.y);
                if (Math.abs(p - myProg) > 0.09) return;
            }
            best = e; bestD = d2;
        });

        /* A structure in the way is attacked rather than walked past. Only
         * once the wave ahead of it is gone, or a cannon wave would always
         * stop short. */
        if (!best) {
            var reach = range + 200;
            S.World.forEachStructureNear(world, u.x, u.y, reach, function (s) {
                if (s.team === u.team) return;
                if (s.kind !== "tower" && s.kind !== "core") return;
                var sd2 = S.dist2(u.x, u.y, s.x, s.y);
                var sr = range + s.radius * 0.8;
                if (sd2 <= sr * sr) { best = s; bestD = sd2; }
            });
        }

        u.target = best;
        if (best) {
            u.moveTo = null;
            u.progress = myProg;
            if (!S.Combat.canAct(u)) return;
            /* The chase radius must be EXACTLY the attack radius from
             * tickAttack - not larger, and not padded. It used to carry a
             * +20 slack so that minions would stop just outside melee reach,
             * and the entire map spent its time with two lines of soldiers
             * standing nineteen units apart and hitting the air. The two
             * expressions below are deliberately identical to the one in
             * tickAttack; changing one means changing both. */
            var reach = S.Combat.stat(u, "range") + (best.radius || 40) +
                ((best.kind === "tower" || best.kind === "core") ? 60 : 0);
            if (S.dist2(u.x, u.y, best.x, best.y) > reach * reach) {
                u.moveTo = { x: best.x, y: best.y };
            }
        } else {
            /* Nothing to hit: walk the lane toward the enemy base. */
            var dir = u.team === 0 ? 1 : -1;
            var step = u.ms * dt / laneLength(u.lane);
            var np = S.clamp(u.progress + dir * step, 0, 1);
            var pt = M.lanePointAt(u.lane, np);
            u.progress = np;
            u.moveTo = { x: pt.x, y: pt.y };
            u.facing = Math.atan2(pt.y - u.y, pt.x - u.x);
        }
    }

    var laneLenCache = {};
    function laneLength(name) {
        if (laneLenCache[name]) return laneLenCache[name];
        var pts = M.lanes[name];
        var total = 0;
        for (var i = 0; i < pts.length - 1; i++) total += S.dist(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        laneLenCache[name] = total || 1;
        return laneLenCache[name];
    }

    /* The shared attack timer, for units and champions alike. Champions get
     * their effective attack speed through the same code path, so a CDR or
     * attack-speed rune cannot desync one and not the other. */
    function tickAttack(world, u, dt) {
        if (u.windupTarget) {
            var tw = u.windupTarget;
            if (!tw.alive || tw.team === u.team) { u.windupTarget = null; return; }
            if (!S.Combat.canAct(u)) { u.windupTarget = null; return; }
            /* Track a moving target during the windup. Without this a melee
             * attack would whiff against anything that kites, and every melee
             * champion in the roster would be decoration. */
            u.facing = Math.atan2(tw.y - u.y, tw.x - u.x);
            u.windupLeft -= dt;
            if (u.windupLeft <= 0) {
                u.windupTarget = null;
                resolveAttack(world, u, tw);
                var as = S.Combat.effectiveAs(u);
                u.attackCdLeft = as > 0 ? 1 / as : 1;
            }
            return;
        }

        u.attackCdLeft -= dt;
        if (u.attackCdLeft > 0) return;
        if (!u.target || !u.target.alive) return;
        if (u.casting) return;
        if (!S.Combat.canAct(u)) return;

        var range = S.Combat.stat(u, "range") + (u.target.radius || 40) +
            (u.target.kind === "tower" || u.target.kind === "core" ? 60 : 0);
        if (S.dist2(u.x, u.y, u.target.x, u.target.y) > range * range) return;
        startAttack(world, u, u.target);
    }

    /* ===== Presentation hooks =====
     *
     * The simulation does not draw, but it does need to tell the renderer what
     * happened. These are the only functions the renderer calls back into, and
     * they all live here so that "what the simulation believes happened" is
     * one file and not a scattering of ctx.fillRect calls. */
    /* A generic burst.
     *
     * `opts` lets a caller give the burst a shape rather than a uniform
     * sphere: a directional spray for an impact, a ring for a shockwave, a
     * column for a spawn. A burst that always leaves in every direction at
     * once is a firework, and a firework is the one thing a hit must not look
     * like.
     *
     * `glow` is the additive core colour. Without it a particle is a chip of
     * paint; with it, on the tiers that afford one, it is light. */
    function spawnBurst(world, x, y, team, n, color, opts) {
        if (!world.fx) return;
        opts = opts || {};
        var dir = opts.dirX !== undefined ? Math.atan2(opts.dirY, opts.dirX) : null;
        var spread = opts.spread !== undefined ? opts.spread : Math.PI * 2;
        var lift = opts.lift !== undefined ? opts.lift : 1;
        var z0 = opts.z !== undefined ? opts.z : 26;
        for (var i = 0; i < n; i++) {
            /* Ring bursts need an angle; everything else rolls one. */
            var a = opts.ring
                ? (i / n) * Math.PI * 2 + S.rng() * 0.4
                : (dir === null
                    ? S.rng() * Math.PI * 2
                    : dir + (S.rng() - 0.5) * spread);
            var sp = (opts.speed || 1) * (40 + S.rng() * 190);
            world.fx.push({
                x: x, y: y, z: z0 + S.rng() * (opts.zSpread !== undefined ? opts.zSpread : 34),
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                vz: (20 + S.rng() * 110) * lift,
                life: 0,
                dur: (opts.dur || 0.35) + S.rng() * (opts.durSpread !== undefined ? opts.durSpread : 0.55),
                size: (opts.size || 1.6) + S.rng() * (opts.sizeSpread !== undefined ? opts.sizeSpread : 2.6),
                color: color || "#ffffff",
                glow: opts.glow || null,
                team: team
            });
        }
        /* Enforce the ceiling here as well as during ageing.
         *
         * Ageing runs once per step, so a burst large enough to blow past the
         * cap would survive until the next step and be drawn at full size for
         * a frame. An emitter has to be bounded at the moment it emits. */
        while (world.fx.length > FX_CAP) world.fx.shift();
    }

    function floatText(world, x, y, text, color) {
        if (!world.texts) return;
        /* Cap the stack. A six-man brawl with three ultimates at once would
         * otherwise put thirty numbers on screen and make all of them
         * unreadable. */
        if (world.texts.length > 24) world.texts.shift();
        world.texts.push({
            x: x, y: y, z: 90, text: text, color: color || "#ffffff",
            life: 0, dur: 1.1
        });
    }

    function shake(world, amount) {
        world.shakeAmt = Math.min(1.6, (world.shakeAmt || 0) + amount * 0.6);
    }

    /* Shake is a property of the world, not of the frame.
     *
     * This used to decay inside Render.draw, which made the renderer the only
     * thing that ever lowered it. Headless runs - the balance harness, the
     * sim and boot suites, the node half of the smoke test - never draw, so
     * their shakeAmt ratcheted to the 1.6 ceiling on the first hit and stayed
     * there for the rest of the match. It also meant two matches from one seed
     * could diverge, because how often the page rendered had become part of
     * the simulation. */
    function decayShake(world, dt) {
        if (!(world.shakeAmt > 0)) { world.shakeAmt = 0; return; }
        world.shakeAmt *= Math.exp(-6 * dt);
        if (world.shakeAmt < 0.001) world.shakeAmt = 0;
    }

    /* The visual for one auto attack: a short streak from attacker to
     * target. Uses `spark` rather than a full particle burst because auto
     * attacks fire several times a second per unit and ninety minions doing
     * that is ninety bursts a second. */
    function spark(world, a, b, type) {
        if (!world.fx) return;
        world.fx.push({
            x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
            z: 30,
            x0: a.x, y0: a.y, x1: b.x, y1: b.y,
            life: 0, dur: 0.12,
            color: type === "magic" ? "#b58cff" : "#ffd9a0",
            spark: true,
            team: a.team
        });
    }

    /* ===== World creation ===== */
    function createWorld(opts) {
        opts = opts || {};
        var rng = S.makeRng(opts.seed || 12345);
        /* Map is read lazily so a test can require config, mapdata and world
         * in any order without world.js having to guard against an undefined
         * M at load time. */
        M = S.Map;

        var world = {
            seed: rng,
            time: 0,
            waveTimer: C.waves.firstDelay,
            waveIndex: [0, 0],
            units: [],
            champs: [],
            structures: [],
            effects: [],
            fx: [],
            texts: [],
            nums: [],
            winner: null,
            over: false,
            overAt: 0,
            shakeAmt: 0,
            player: null,
            difficulty: opts.difficulty || "guardsman"
        };
        S.World.rng = rng;

        buildStructures(world);
        buildReliquary(world);

        /* Six champions: the player's, two allies, three enemies. Built by
         * main.js so the draft logic lives with the drafting. */
        S.Combat.champs = world.champs;
        S.Combat.now = 0;
        S.Combat.events = [];
        S.Combat.healEvents = [];
        CURRENT = world;
        return world;
    }

    /* ===== Spatial grid =====
     *
     * A flat uniform grid over the map, rebuilt once per step. It exists
     * because the two hottest loops in the simulation are "what is near this
     * minion" (run for every minion) and "what is near this champion" (run
     * for every bot). Both were linear scans over the whole unit array, which
     * is O(n^2): at two hundred and fifty units that is sixty thousand
     * distance checks a step, sixty times a second, and it is exactly the
     * kind of cost that is invisible in a test with six units and fatal on a
     * phone at minute six of a match.
     *
     * The buckets are allocated once and refilled, never reallocated. A Map
     * of arrays would work too and would allocate forty arrays a step; at
     * 60Hz that is the same garbage problem wearing a different hat.
     */
    var CELL = 500;
    var CELLS_AXIS = Math.ceil(S.CONFIG.map.size / CELL) + 2;
    var CELL_COUNT = CELLS_AXIS * CELLS_AXIS;

    function rebuildGrid(world) {
        if (!world.grid) {
            world.grid = new Array(CELL_COUNT);
            world.gridCount = new Int16Array(CELL_COUNT);
            for (var g = 0; g < CELL_COUNT; g++) world.grid[g] = [];
        }
        world.gridCount.fill(0);
        for (var i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.alive) continue;
            var idx = cellIndex(u.x, u.y);
            var arr = world.grid[idx];
            var n = world.gridCount[idx];
            if (n >= arr.length) arr.push(u);
            else arr[n] = u;
            world.gridCount[idx] = n + 1;
        }
    }

    function cellIndex(x, y) {
        /* +1 on both axes so a unit exactly on the border never produces a
         * negative index. The map is clamped at 90 units from the edge, so
         * this cannot overflow in practice - but a negative array index is
         * silent corruption rather than an exception, which is worse. */
        var gx = S.clamp(Math.floor(x / CELL) + 1, 0, CELLS_AXIS - 1);
        var gy = S.clamp(Math.floor(y / CELL) + 1, 0, CELLS_AXIS - 1);
        return gy * CELLS_AXIS + gx;
    }

    /* Call cb(unit) for every alive unit within r of (x, y). The callback
     * decides what to do; this only guarantees not missing anything inside
     * the circle. Cells are scanned by bounding box, so the callback may be
     * handed a unit slightly outside the radius and must re-test - which is
     * why the radius is passed to it rather than applied here. */
    function forEachNear(world, x, y, r, cb) {
        var grid = world.grid;
        if (!grid) return;
        var r2 = r * r;
        var gx0 = S.clamp(Math.floor((x - r) / CELL) + 1, 0, CELLS_AXIS - 1);
        var gx1 = S.clamp(Math.floor((x + r) / CELL) + 1, 0, CELLS_AXIS - 1);
        var gy0 = S.clamp(Math.floor((y - r) / CELL) + 1, 0, CELLS_AXIS - 1);
        var gy1 = S.clamp(Math.floor((y + r) / CELL) + 1, 0, CELLS_AXIS - 1);
        for (var gy = gy0; gy <= gy1; gy++) {
            var row = gy * CELLS_AXIS;
            for (var gx = gx0; gx <= gx1; gx++) {
                var idx = row + gx;
                var n = world.gridCount[idx];
                var arr = grid[idx];
                for (var i = 0; i < n; i++) {
                    var u = arr[i];
                    if (S.dist2(u.x, u.y, x, y) <= r2) cb(u);
                }
            }
        }
    }

    /* Structures are far fewer than units (seventeen for the whole map), so
     * they stay a linear scan. A grid for seventeen objects would cost more
     * in bookkeeping than it saves in comparisons. */
    function forEachStructureNear(world, x, y, r, cb) {
        var r2 = r * r;
        for (var i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive) continue;
            if (S.dist2(s.x, s.y, x, y) <= r2) cb(s);
        }
    }

    S.World = {
        forEachNear: forEachNear,
        forEachStructureNear: forEachStructureNear,
        rebuildGrid: rebuildGrid,
        createWorld: createWorld,
        makeUnit: makeUnit,
        makeStructure: makeStructure,
        makeChampion: makeChampion,
        buyItem: buyItem,
        step: step,
        computeVision: computeVision,
        teamSees: teamSees,
        minionLevel: minionLevel,
        spawnWave: spawnWave,
        laneStep: laneStep,
        moveUnit: moveUnit,
        displace: displace,
        spawnBurst: spawnBurst,
        floatText: floatText,
        shake: shake,
        spark: spark,
        startAttack: startAttack,
        resolveAttack: resolveAttack,
        lastHit: lastHit,
        grantMinionXp: grantMinionXp,
        onStructureDeath: onStructureDeath,
        plateArmorOf: plateArmorOf,
        rng: Math.random
    };

})(window.IF = window.IF || {});
