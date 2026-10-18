/*
 * IRONFALL - shared tuning constants, palette and math helpers.
 *
 * Loaded first; every other module reads from window.IF. Balance passes edit
 * this file, not the systems.
 */
(function (S) {
    "use strict";

    /* ===== Projection =====
     * Axonometric, not perspective. The map is a diamond on screen, world +x
     * running down-right and world +y down-left, +z straight up. A true
     * isometric would put the camera on the (1,1,1) diagonal and give every
     * lane the same apparent length; this squashes the y axis slightly so the
     * diamond is wider than it is tall, which on a portrait phone means the
     * map is not a tall thin rhombus with a horizon you cannot see past.
     *
     * The payoff of staying linear: a constant world-space face normal maps to
     * a constant screen gradient, so flat shading is one dot product per face
     * and there is no matrix anywhere in the renderer.
     */
    S.PROJ = {
        xScale: 0.82,
        yScale: 0.46,
        zScale: 0.78
    };

    /* Screen-space offset of a world point, before camera translation.
     * Kept as a function rather than precomputed so nothing can cache a stale
     * projection when the constants are retuned. */
    S.PROJ.px = function (x) { return x * S.PROJ.xScale; };
    S.PROJ.py = function (x, y, z) {
        return (x + y) * S.PROJ.yScale - (z || 0) * S.PROJ.zScale;
    };

    /* Direction from the scene toward the camera, derived from the three
     * projection axes. A face is front-facing when its normal points this way,
     * and a unit's occlusion key is its dot product with it. Renderer and
     * world share these numbers so sorting can never disagree with what is
     * actually visible. */
    (function (P) {
        /* d(sx)/dx = xScale, d(sy)/dx = yScale, d(sy)/dz = -zScale. The view
         * vector is the one that has zero derivative along it. */
        P.viewX = P.yScale;
        P.viewY = P.yScale;
        P.viewZ = -P.xScale;
        P.viewLen = Math.sqrt(P.viewX * P.viewX + P.viewY * P.viewY + P.viewZ * P.viewZ);
    })(S.PROJ);

    /* Key light, world space, roughly normalised. Used for face shading only;
     * there is no shadow casting, because shadow maps on a mid-range phone
     * cost more than they read at this camera pitch. */
    S.LIGHT = [-0.42, -0.55, 0.72];

    S.CONFIG = {
        /* ===== Map =====
         * A square of world units, with each base in opposite corners. The
         * whole thing projects to a diamond wider than it is tall. */
        map: {
            size: 9200,
            /* Bases sit inset from the corner rather than in it: a unit that
             * walks into the corner of the map has nowhere to kite to, and
             * being able to back away from your own Core is a real skill
             * expression on the last turret dive. */
            baseInset: 1150,
            /* Half-width of a lane corridor. Lanes are ribbons of walkable
             * ground; off-ribbon ground is much slower, not forbidden, so a
             * retreat through the wilds stays possible but costs tempo. */
            laneHalf: 380,
            wildSpeed: 0.78,
            /* River band across the middle diagonal. No mechanical effect yet
             * beyond the Reliquary pit; it exists so the three lanes read as
             * converging somewhere rather than just being three lines. */
            riverHalf: 520
        },

        /* ===== Champions =====
         * Baseline stats. Every champion is this plus a delta, so a balance
         * pass that moves the baseline moves everyone together. */
        champ: {
            levelCap: 18,
            /* Raised from 1180/82. Every flat damage ramp in the roster used
             * to resolve to zero, so this was balanced against abilities
             * that were quietly doing half their listed damage. With those
             * ramps actually applying, the same health pool turned every
             * champion into a three-shot kill - and the death tally showed
             * where the damage was really coming from: 66 deaths against 19
             * champion kills, meaning most of the roster was being deleted by
             * towers and waves rather than by the enemy. */
            baseHp: 1580,
            hpPerLevel: 110,
            baseArmor: 32,
            armorPerLevel: 5.6,
            baseMr: 30,
            mrPerLevel: 2.9,
            baseAd: 62,
            adPerLevel: 3.2,
            baseAs: 0.68,
            /* Attacks per second. Above ~1.6 the windup on each swing stops
             * being readable, which is the whole reason this is a duel and
             * not a numbers race. */
            asCap: 1.75,
            baseMs: 345,
            baseRange: 150,
            /* Between attacks, in seconds of the champion's own clock. */
            attackWindup: 0.28,
            /* A champion that has not attacked or been hit for this long
             * regens, so turtling behind a turret is a real but slow option. */
            outOfCombatRegenDelay: 6,
            baseHpRegen: 9.5,
            hpRegenPerLevel: 0.75,
            baseMana: 420,
            manaPerLevel: 32,
            baseManaRegen: 8,
            manaRegenPerLevel: 0.6,
            /* Passive gold, per second. Roughly LoL's 300/min. */
            goldPerSec: 2.35,
            respawnBase: 6,
            respawnPerLevel: 1.35,
            recallTime: 5.5,
            /* Time after leaving combat before the shop will open anywhere but
             * the base. Selling a mistake to a ganker is the punish. */
            shopLockout: 3,

            /* When an ability gains a rank, keyed by slot. Four ranks each,
             * because four is the most that fits in a phone-width tooltip.
             *
             * E starts at level 2 rather than 3 because a champion who cannot
             * move between two abilities for their first two levels is a
             * champion who cannot do anything interesting. R at 6 keeps the
             * level 6 spike - the single biggest power spike in the game, and
             * the one every player is timing their CS curve around. */
            rankThresholds: {
                q: [1, 5, 9, 13],
                w: [1, 5, 9, 13],
                e: [2, 6, 10, 14],
                r: [6, 11, 15, 18]
            },
            KEYS: ["q", "w", "e", "r"]
        },

        /* ===== Experience =====
         * Cumulative XP thresholds, index 0 = level 1. Tuned against the wave
         * economy below so a full-strength wave is about 60% of a level at
         * mid game: you cannot buy levels purely by farming, you have to win
         * fights for the rest. */
        xpCurve: [
            0, 300, 640, 1010, 1420, 1870, 2380, 2950,
            4850, 5820, 7460, 8820, 10380, 12170, 14230, 16580, 19240, 22250
        ],
        /* XP is shared: everyone within this radius of a dying unit learns.
         * Scaled off minion HP so it does not reward standing in the middle of
         * a wave for literally no positioning. */
        xpShareRadius: 1000,

        /* ===== Gold =====
         * Last-hitting pays the base value. Assisting pays assistValue: enough
         * to make grouping worthwhile, far too little to make grouping
         * strictly better than last-hitting yourself. */
        assistValue: 0.32,

        /* ===== Minions =====
         * One wave per lane every wavePeriod seconds. The melee line comes
         * first and the cannon arrives last, so a lane has a shape: a wave
         * you can trade with, then a wave you cannot. */
        waves: {
            period: 30,
            firstDelay: 18,
            /* Banners: 20s in, 45s in, from whichever side's base the wave is
             * leaving. A banner minion has more HP and hits harder. */
            bannerAt: [20, 45],
            bannerHpMult: 1.9,
            bannerAdMult: 1.35,
            bannerXpMult: 2.2,
            bannerGoldMult: 2.1,
            /* Spawn counts. Melee first, then the ranged line, then cannon. */
            perWave: 2,
            rangedPerWave: 1,
            cannonPerWave: 1
        },

        /* ===== Minion bodies =====
         * Three bodies, not one with a ranged variant. The line composition
         * is what gives a wave a shape - three melee you can trade with, then
         * a cannon you cannot - so the cannon has to be its own entry with
         * its own health and its own gold, not a reskinned melee. */
        minion: {
            melee: {
                hp: 345, ad: 18, armor: 16, mr: 10, ms: 325, range: 140, as: 0.85,
                gold: 12, xp: 58, radius: 34, height: 104, color: "#8d8577"
            },
            ranged: {
                hp: 225, ad: 22, armor: 6, mr: 8, ms: 325, range: 600, as: 0.8,
                gold: 9, xp: 44, radius: 30, height: 94, color: "#6f7a8a"
            },
            cannon: {
                hp: 520, ad: 38, armor: 22, mr: 14, ms: 325, range: 620, as: 0.7,
                gold: 30, xp: 95, radius: 42, height: 116, color: "#a8946a"
            },
            /* Health against damage is the ratio that decides whether a lane
             * has a rhythm or a pile-up, and it is very easy to get wrong.
             * At 500 HP against 24 AD a wave took roughly two minutes to
             * clear, and since a wave arrives every thirty the count only
             * ever grew: thirty spawning, twenty-four dying, six net, every
             * single window, forever. The numbers below clear a full wave in
             * about sixteen seconds, which is under half the spawn period -
             * so the lane reaches a steady state instead of a standing
             * queue. Gold and XP were NOT changed: they set the economy and
             * the level curve, and neither of those was wrong. */
            /* Wave strength climbs on a timer rather than off the players'
             * levels. Tying it to levels would make the losing side's minions
             * weaker, which snowballs the match into a five-minute wipe. */
            levelEvery: 60,
            levelCap: 16,
            /* Slight scale-up per wave level. Flat would make late waves feel
             * identical to early ones with more numbers on the health bar. */
            hpPerLevel: 26,
            adPerLevel: 1.6
        },

        /* ===== Structures =====
         * Two Bastion Towers per side, one per flank lane, plus the Core.
         * Plates are the single most important number in the game: they are
         * what turns "I have a health advantage" into "I can actually take
         * this tower", and they are why dive timing is a decision rather than
         * a coin flip. */
        /* Structure heights are VISUAL heights. `radius` is the hitbox and
         * deliberately does not scale with them - a body that reads clearly
         * on a phone is still the size it is for the purposes of standing
         * where things are. Everything in the first balance pass was sized
         * to be mathematically faithful to League's proportions and came out
         * about three times too small to see on a phone; these are the
         * numbers that actually read at gameplay distance. */
        tower: {
            /* Health, not damage, is what sets the pace of a lane. At 4200 a
             * three-man group burst a tower down in under fifteen seconds
             * and a match was over by minute five; the pacing problem in a
             * short MOBA is always that structures fold before the players
             * have finished learning them. */
            hp: 6200,
            hpPerLevel: 180,
            armor: 42,
            mr: 32,
            /* Base projectile damage, before the ramp. */
            /* Down from 240/9. A death-source tally showed 52% of all
             * champion deaths were towers and only 28% were enemy
             * champions: the roster was being deleted by its own objective
             * rather than fought over. A tower should punish a dive, not
             * delete the diver before the rest of the fight starts. */
            damage: 140,
            damagePerLevel: 6,
            /* Every rampPeriod seconds the shot gets tougher, up to rampMax
             * applications. Matches League's turret escalation: the longer
             * the dive lasts, the more it costs. */
            rampPeriod: 11,
            rampStep: 0.24,
            rampMax: 3,
            range: 1450,
            projectileSpeed: 1900,
            cooldown: 0.9,
            plates: 3,
            plateArmour: 62,
            /* How much plate armour each point of damage strips. Tuned so a
             * full three-plate tower loses everything after roughly 40% of
             * its health is gone: a dive has to actually commit, and a dive
             * that gets interrupted should leave something behind.
             *
             * Without this, plates were read by combat.stat and regenerated
             * by world.updateTower and were never REDUCED by anything - a
             * tower kept full plate armour through every siege of its life,
             * which silently doubled how hard it was to kill and removed the
             * entire dive-timing mechanic. */
            plateDamageRatio: 0.06,
            /* Plates come back faster early than late, so an early plate loss
             * is a real wound and a late one is a formality. */
            plateRegen: 26,
            plateRegenLate: 14,
            plateRegenLateAt: 11,
            /* How long after the structure is damaged before it starts
             * regenerating at all. Plates are not a panic button. */
            plateRegenDelay: 5
        },
        core: {
            hp: 9200,
            armor: 48,
            mr: 38,
            invulnOn: 0,
            /* Once a Core is exposed - both its Towers down - it takes 25% more
             * damage. This is the win-condition clock and it should feel like
             * one. */
            exposedBonus: 1.25,
            exposedArmorBonus: 8
        },

        /* ===== Combat =====
         * League's damage model, kept because its consequences are the whole
         * design: armour is a percentage of damage removed and never gets
         * cheap, so an armour stack is worth exactly as much against a
         * low-damage attack as a high one. */
        armorConstant: 100,
        /* Minimum fraction of damage that gets through, so a pure-tank build
         * cannot become literally immune and stall a match. */
        minDamageFraction: 0.06,
        /* Attack speed cap after soft caps. */
        softCapAbove: 0.6,
        softCapFactor: 0.4,
        cdrCap: 0.4,
        /* Crit. Flat, not multiplicative on top of every damage source. */
        critChance: 0.0,
        critMult: 1.75,
        /* Lifesteal and omnivamp are separate so a pure-physical build is not
         * quietly given a magic-scaling heal. */
        lifestealCap: 0.35,
        omnivampCap: 0.2,
        /* Movement slow, floored so nothing is permanently pinned. */
        slowFloor: 0.25,
        slowCap: 0.6,
        /* Immobilising crowd control (stun, root, sleep) as a fraction of the
         * target's current attack speed; without this a tank with no attack
         * speed is permanently stun-locked by a single stun. */
        ccLandspeed: 0.55,
        ccMinLandspeed: 0.5,

        /* ===== Jungle =====
         * Four camps per side. They are not optional: the XP a full clear is
         * worth is a level and a half, which is the entire reason a jungler
         * exists, and here it is the reason a losing champion is not already
         * dead. */
        camps: {
            perSide: 4,
            hp: 1150,
            ad: 26,
            armor: 18,
            respawn: 62,
            goldMin: 40,
            goldMax: 70,
            xp: 130,
            /* A camp does not move. If it chased you, an invade would be
             * unanswerable by anyone who walked in second. */
            radius: 220
        },

        /* ===== Reliquary =====
         * The mid objective. Spawns once both teams have a Tower down, so
         * early game is lane phase and the fight everyone is waiting for has
         * a trigger rather than a timer. */
        reliquary: {
            spawnAt: 240,
            hp: 5200,
            armor: 30,
            goldMin: 160,
            goldMax: 240,
            xp: 420,
            /* Buff: 8% damage for both teams while any champion holds it.
             * Symmetric on purpose. A team-favouring objective would make the
             * losing side's only correct play "do not contest", which is the
             * opposite of what this map is for. */
            buffDamage: 0.08,
            buffDuration: 120
        },

        /* ===== Vision =====
         * "Warp haze" replaces League's hard fog. Unexplored ground is not
         * black, it is dim: you can see terrain, you cannot see who is
         * standing on it. Enemies outside your vision draw as silhouettes,
         * so you know the fight is happening before you know who won it. */
        vision: {
            champion: 1350,
            structure: 1500,
            wardDuration: 120,
            /* A ward is a Scryer-relay: cheap, reveals a wide circle, dies
             * to anything that looks at it. */
            wardCost: 50,
            wardReveal: 1650,
            /* Fog reveal falloff, in world units of "still sort of visible". */
            hazeFade: 320,
            /* Darkened fraction for a hidden enemy. Low enough to still read
             * the silhouette, high enough that you cannot aim at it. */
            hazeAlpha: 0.22,
            /* Hard fog on unexplored ground. */
            terrainAlpha: 0.55
        },

        /* ===== Camera =====
         * The camera never rotates, which is the whole reason lining up a
         * boltter shot never fights the controls. */
        camera: {
            /* Width of the visible world span, in world units, at reference
             * height.
             *
             * League's map is about 15000 units and a champion is about 120
             * across, so a screen shows roughly a fiftieth of the map. This
             * map is 9200, which puts the equivalent span near 4400. It was
             * 2050, which showed a fiftieth of THIS map and made the Core a
             * third of the phone screen - technically correct, completely
             * unplayable, and only visible in a screenshot. */
            viewSpan: 4000,
            minSpan: 2800,
            maxSpan: 8600,
            followLerp: 7.5,
            /* Dragging the map. Disabled while the stick is down, because
             * both use the left thumb and they must never both respond. */
            panLerp: 14,
            panSpeed: 2100,
            /* Pinch-to-zoom bounds as a multiplier on viewSpan. */
            zoomMin: 0.62,
            zoomMax: 1.9
        },

        /* ===== Quality =====
         * Auto-selected from sampled frame times, like every other thing in
         * this game: the user should not have to think about it. Shadows are
         * the biggest single win because there is no shadow mapping, just
         * an extra polygon per unit. */
        /* Quality tiers.
         *
         * Every flag is read by a named system rather than by a single
         * "detail" multiplier, so a Low tier loses the expensive things -
         * contact shadows, props, motion, rich VFX - and keeps the cheap
         * ones. A budget phone gets a simpler-looking game, not a broken one,
         * and a tier that could only be all-or-nothing would have forced
         * exactly that choice.
         *
         * `detail` is retained as the coarse multiplier for box count. */
        quality: {
            high: {
                label: "High", dpr: 2,
                shade: true, haze: true, particles: 1, detail: 1,
                shadows: true, shadowSoft: true, props: 1, anim: 1, rich: 1, material: 1
            },
            med: {
                label: "Med", dpr: 1.5,
                shade: true, haze: true, particles: 0.62, detail: 0.7,
                shadows: true, shadowSoft: false, props: 0.55, anim: 1, rich: 0.6, material: 1
            },
            low: {
                label: "Low", dpr: 1,
                shade: false, haze: true, particles: 0.3, detail: 0.4,
                /* One hard-edged shadow per body, no props, no motion, no
                 * additive cores. Silhouettes, so a Low tier reads instantly
                 * rather than being a softer High. */
                shadows: true, shadowSoft: false, props: 0, anim: 0, rich: 0, material: 0.5
            }
        },

        /* Frames sampled before the auto-quality tier is chosen, and the
         * average frame time above which we drop a tier. */
        perfSampleFrames: 90,
        perfDowngradeMs: 26,
        perfUpgradeMs: 15,

        /* Loop. Clamped so a backgrounded tab or a stalled frame cannot
         * teleport a champion through the map. */
        maxDt: 0.05,
        fixedStep: 1 / 60,
        maxCatchupSteps: 5,

        /* Bot reaction, per difficulty. These are seconds of latency, not
         * accuracy multipliers: a hard Recruit making the same decisions
         * late is a different, fairer opponent than one making wrong ones. */
        difficulty: {
            recruit: { label: "Recruit", react: 0.62, csSkill: 0.35, aggro: 0.4, abilitySkill: 0.2, dmgTaken: 1.28 },
            guardsman: { label: "Guardsman", react: 0.3, csSkill: 0.62, aggro: 0.65, abilitySkill: 0.55, dmgTaken: 1.08 },
            necron: { label: "Necron Lord", react: 0.11, csSkill: 0.88, aggro: 0.88, abilitySkill: 0.85, dmgTaken: 0.96 }
        }
    };

    /* ===== Palette =====
     * Grimdark: a lot of desaturated stone, with saturated colour reserved for
     * the three things a player must read instantly - their own champion, the
     * enemy team, and a structure about to fall. */
    S.PAL = {
        void: "#07090d",
        fog: "#0b0f16",
        stoneDark: "#22262c",
        stone: "#343a42",
        stoneLight: "#4a515b",
        dirt: "#3b342a",
        dirtLight: "#4e4536",
        basalt: "#1b1e23",

        /* Team identity. Blue is the Emperor's Bastion, red is the Hive
         * Terminus. They are the two hues nothing else in the palette is
         * allowed to use at full saturation, so team reads before unit
         * does. */
        teamBlue: "#3f7fd6",
        teamBlueDark: "#1d3a68",
        teamBlueLit: "#7fb4f0",
        teamRed: "#c8353f",
        teamRedDark: "#6b1a21",
        teamRedLit: "#f07780",

        /* Warband identity. */
        astartes: "#2f5fa8",
        warpbound: "#7a2ecb",
        tyranid: "#8fb518",
        guard: "#c4762a",

        gold: "#e0b23c",
        goldDim: "#8a6d22",
        blood: "#7d1c22",
        warp: "#6b3fc8",
        warpLit: "#b58cff",
        chitin: "#a8c93a",
        bone: "#d8d2c0",
        ember: "#ff8a3c",
        heal: "#4fd18b",
        shield: "#6fd8e8",
        crit: "#ffd24a",

        /* Damage numbers. Three tiers by magnitude rather than one colour for
         * everything: a trade has to be readable in the half second it
         * actually takes, and the number that tells you whether you won it is
         * the big one, not the small one. */
        damageBig: "#ff8a5c",
        damageCrit: "#ffd24a",
        damageMagic: "#b58cff",
        damagePhys: "#e6e2d8"
    };

    /* ===== Math helpers =====
     * Named and local rather than reached for inline, because the bugs this
     * game is prone to are exactly the ones where a sign or a denominator
     * goes quietly wrong. */
    S.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
    S.clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
    S.lerp = function (a, b, t) { return a + (b - a) * t; };

    /* Frame-rate independent smoothing. The naive `a += (b - a) * k` is
     * correct only at one dt; this one is right at every dt, which matters
     * because the camera must not judder when a frame runs long. */
    S.damp = function (a, b, k, dt) {
        return b + (a - b) * Math.exp(-k * dt);
    };

    S.dist2 = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy;
    };
    S.dist = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return Math.sqrt(dx * dx + dy * dy);
    };
    /* Distance from point p to segment ab, squared. Used for line-shaped
     * abilities; if this were wrong, bolts would pass through champions. */
    S.segDist2 = function (px, py, ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        var len2 = dx * dx + dy * dy;
        if (len2 < 1e-6) return S.dist2(px, py, ax, ay);
        var t = S.clamp01(((px - ax) * dx + (py - ay) * dy) / len2);
        return S.dist2(px, py, ax + dx * t, ay + dy * t);
    };

    /* Shortest signed difference between two angles, in radians. Without
     * this, facing lerp snaps the long way round at exactly pi and a champion
     * visibly spins. */
    S.angleDelta = function (a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    };
    S.angleLerp = function (a, b, t) {
        return a + S.angleDelta(a, b) * t;
    };

    /* Cooldown and damage numbers are read mid-fight by a thumb. Rounding
     * to whole units is not cosmetic, it is legibility. */
    S.fmt = function (n) {
        if (!isFinite(n)) return "-";
        var r = Math.round(n);
        return String(r);
    };
    S.fmt1 = function (n) {
        if (!isFinite(n)) return "-";
        return (Math.round(n * 10) / 10).toFixed(1);
    };
    S.fmtTime = function (sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ":" + (s < 10 ? "0" : "") + s;
    };

    /* Golden-angle stepping for anything that needs to be "evenly spread but
     * not on a grid" - particle spread, waypoint jitter. */
    S.golden = 2.399963229728653;

    /* Damage-timer formatting for the kill feed: a dying timer reads as
     * "0.8", a long one as "12". */
    S.fmtCd = function (n) {
        if (n <= 0) return "";
        if (n < 10) return (Math.round(n * 10) / 10).toFixed(1);
        return String(Math.ceil(n));
    };

})(window.IF = window.IF || {});
