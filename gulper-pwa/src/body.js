/*
 * GULPER - the alien's body, and everything that changes it.
 *
 * There are three separate kinds of change, and they have three separate
 * lifetimes:
 *
 *   anatomy  - bought with evolution points. Lasts for the current run.
 *   genome   - bought with shards. Lasts for ever.
 *   adaptation - chosen at the start of a level. Lasts for that level.
 *
 * Mass is the master stat. Radius, gape, level and unlock thresholds all
 * derive from it, which is why the whole game reads as one number going
 * up: you are getting bigger, and bigger things become edible.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    /* ===== adaptations =====
     * Offered as one of three at the start of every level. Some are
     * permanent once unlocked in the Genome, some only ever exist for a
     * single level. */
    S.Adaptations = {
        list: {
            hollowgut: {
                id: "hollowgut", name: "Hollow Gut", tags: ["gape"],
                desc: "Swallow prey up to one mass heavier than your gape. The gulp takes 1.2s longer.",
                cost: 55, permanent: true
            },
            barbed: {
                id: "barbed", name: "Barbed Tendrils", tags: ["lash"],
                desc: "Lash applies bleed. It breaks a person's nerve 30% faster.",
                cost: 45, permanent: true
            },
            chitinplate: {
                id: "chitinplate", name: "Chitin Plate", tags: ["defence"],
                desc: "+6 chitin. You are slower by 10%.",
                cost: 40, permanent: true
            },
            ambusher: {
                id: "ambusher", name: "Ambusher", tags: ["stealth"],
                desc: "The first person to see you notices you 1.5 seconds late.",
                cost: 50, permanent: true
            },
            venom: {
                id: "venom", name: "Venom Glands", tags: ["grasp"],
                desc: "Anything you hold takes acid damage and loses its grip faster.",
                cost: 48, permanent: true
            },
            siphonsacs: {
                id: "siphonsacs", name: "Siphon Sacs", tags: ["siphon"],
                desc: "Siphon raises no alarm.",
                cost: 70, permanent: true
            },
            titanframe: {
                id: "titanframe", name: "Titan Frame", tags: ["size"],
                desc: "+35% size, +1 gape, -18% speed.",
                cost: 85, permanent: true
            },
            splitmaw: {
                id: "splitmaw", name: "Split Maw", tags: ["gape"],
                desc: "The gulp happens in two stages. You can be interrupted after the first half.",
                cost: 60, permanent: true
            },
            mimic: {
                id: "mimic", name: "Mimic Skin", tags: ["stealth"],
                desc: "People ignore you until you attack. Then they all notice.",
                cost: 75, permanent: true
            },
            regurgitate: {
                id: "regurgitate", name: "Regurgitation", tags: ["gape"],
                desc: "You can spit a swallowed person back out as a projectile.",
                cost: 65, permanent: true
            },
            acidblood: {
                id: "acidblood", name: "Acid Blood", tags: ["defence"],
                desc: "Anything that damages you is corroded by your blood.",
                cost: 55, permanent: true
            },
            quickgrip: {
                id: "quickgrip", name: "Quick Grip", tags: ["grasp"],
                desc: "Grasp holds twice as long and re-grabs without a cooldown.",
                cost: 50, permanent: true
            },
            overreach: {
                id: "overreach", name: "Overreach", tags: ["reach"],
                desc: "+20% tentacle reach. You are 8% slower.",
                cost: 45, permanent: true
            },
            bulk: {
                id: "bulk", name: "Bulk", tags: ["size"],
                desc: "+25% size and +2 chitin, but you cannot dodge.",
                cost: 55, permanent: true
            },
            secondwind: {
                id: "secondwind", name: "Second Wind", tags: ["life"],
                desc: "Once per level, survive a fatal hit with a third of your mass left.",
                cost: 65, permanent: true
            },
            digestion: {
                id: "digestion", name: "Fast Digestion", tags: ["growth"],
                desc: "Swallowed prey is worth 30% more biomass.",
                cost: 60, permanent: true
            },
            wraithskin: {
                id: "wraithskin", name: "Wraith Skin", tags: ["stealth"],
                desc: "Rivals take a moment to recognise you as a rival.",
                cost: 70, permanent: true
            },
            ironmaw: {
                id: "ironmaw", name: "Iron Maw", tags: ["gape"],
                desc: "You can swallow one mass below your gape while swallowing something bigger.",
                cost: 90, permanent: true
            },
            adrenaline: {
                id: "adrenaline", name: "Adrenaline", tags: ["speed"],
                desc: "When your mass is low, you move 25% faster.",
                cost: 40, permanent: true
            }
        },

        order: [
            "hollowgut", "barbed", "chitinplate", "ambusher", "venom",
            "siphonsacs", "titanframe", "splitmaw", "mimic", "regurgitate",
            "acidblood", "quickgrip", "overreach", "bulk", "secondwind",
            "digestion", "wraithskin", "ironmaw", "adrenaline"
        ],

        get: function (id) {
            return S.Adaptations.list[id] || null;
        }
    };

    /* ===== genome tracks =====
     * The persistent upgrade tree. Each track has three ranks and each
     * rank costs shards. */
    S.Genome = {
        tracks: [
            { id: "size", name: "Size", desc: "Your body grows. Bigger body, bigger everything.", costs: [30, 80, 190], stat: "size", per: 0.14 },
            { id: "gape", name: "Gape", desc: "You can swallow heavier things.", costs: [40, 110, 250], stat: "gape", per: 1 },
            { id: "hold", name: "Hold", desc: "You can keep hold of heavier people.", costs: [30, 90, 200], stat: "hold", per: 0.22 },
            { id: "reach", name: "Reach", desc: "Your tentacles reach further.", costs: [25, 70, 160], stat: "reach", per: 0.11 },
            { id: "chitin", name: "Chitin", desc: "Your shell turns damage.", costs: [35, 95, 210], stat: "chitin", per: 2 },
            { id: "acid", name: "Acid", desc: "Your venom eats through things.", costs: [30, 85, 190], stat: "acid", per: 0.35 },
            { id: "speed", name: "Speed", desc: "You move faster.", costs: [35, 100, 220], stat: "speed", per: 0.07 },
            { id: "regen", name: "Regeneration", desc: "You close your wounds faster.", costs: [30, 80, 180], stat: "regen", per: 0.45 }
        ],
        maxRank: 3,

        get: function (id) {
            for (var i = 0; i < S.Genome.tracks.length; i++) {
                if (S.Genome.tracks[i].id === id) return S.Genome.tracks[i];
            }
            return null;
        }
    };

    S.Body = {
        /*
         * Recompute the numbers that derive from mass.
         *
         * Integrity and regeneration scale with size, because a creature
         * twice as big should be able to take twice the punishment. This
         * is what makes the boss fights survivable at the stage where
         * they are supposed to be survivable, and impossible before it.
         */
        recalc: function (p) {
            var C2 = S.CONFIG;
            p.radius = S.Body.radiusFor(p.mass);
            /* The collision radius is a third of the visual one: a soft
             * body squeezes past a crate that it visibly overlaps, and a
             * creature four times the size of the world's corridors would
             * otherwise wedge itself in the first gap it met and stay
             * there. */
            p.r = Math.min(p.radius * 0.34, 46);
            /* Bigger means longer tentacles. A creature that has grown
             * into the size of a room and cannot reach across it is a
             * creature the game has stopped making sense for. */
            p.reach = p.reachBase * (p.radius / C2.player.radius);
            /* And stronger hands. */
            p.hold = p.holdBase * (1 + Math.max(0, p.mass - C2.player.mass) / 320);
            /* And more force behind a swing. */
            p.power = 1 + Math.min(1.4, Math.max(0, p.mass - C2.player.mass) / 220);
            p.maxHp = C2.player.hp + Math.max(0, p.mass - C2.player.mass) * 1.1;
            p.regen = C2.player.regen + Math.max(0, p.mass - C2.player.mass) * 0.014;
            /* Weight is armour. A hide the size of a room spreads a
             * shotgun's load and shrugs a nightstick; it still stings,
             * and it still stacks with genes, but less of it lands on
             * something this hard to get a clean shot at. */
            p.armour = Math.min(5, Math.max(0, p.mass - C2.player.mass) * 0.006);
            if (p.hp > p.maxHp) p.hp = p.maxHp;
        },

        /*
         * The stage a given mass puts you in.
         */
        stageFor: function (mass) {
            var stages = C.growth.stages;
            var cur = stages[0];
            for (var i = 0; i < stages.length; i++) {
                if (mass >= stages[i].at) cur = stages[i];
            }
            return cur;
        },

        stageIndex: function (mass) {
            var stages = C.growth.stages;
            var idx = 0;
            for (var i = 0; i < stages.length; i++) {
                if (mass >= stages[i].at) idx = i;
            }
            return idx;
        },

        /* Body radius from mass. Sub-linear, so growth always feels like
         * it is slowing down. */
        radiusFor: function (mass) {
            var base = C.player.radius;
            var m = Math.max(C.player.mass, mass);
            return base * Math.pow(m / C.player.mass, C.growth.radiusPow);
        },

        /* The gape a stage grants on top of your anatomy. */
        stageGape: function (stageId) {
            var stages = C.growth.stages;
            for (var i = 0; i < stages.length; i++) {
                if (stages[i].id === stageId) return stages[i].gape;
            }
            return 1;
        },

        /*
         * Build the player entity.
         *
         * `run` carries the persistent genome and the adaptations chosen
         * for this level. `adaptations` is the list of adaptation ids in
         * force right now.
         */
        create: function (run, adaptations) {
            var base = C.player;
            var save = S.Storage.data();
            var tracks = save.levels && save.genome ? save.genome : (save.genome || {});
            var g = tracks || {};

            var p = {
                kind: "player",
                x: 0, y: 0, vx: 0, vy: 0,
                facing: 0,
                hp: base.hp, maxHp: base.hp,
                /* The biomass carried in from the last level. A run can
                 * hand down its own carry (the procession does), which
                 * wins over the save. */
                mass: base.mass + (run.carry !== undefined ? run.carry : (save.carry || 0)),
                xp: 0, level: 1,
                evoPoints: 0,
                gape: base.gape,
                hold: base.hold,
                reach: base.reach,
                chitin: base.chitin,
                acid: base.acid,
                speed: base.speed,
                regen: base.regen,
                radius: base.radius,
                stamina: base.stamina,
                staminaMax: base.stamina,
                staminaCd: 0,
                frenzy: false,
                frenzyFuel: 0,
                state: S.STATE.player.idle,
                stateT: 0,
                gripping: null,
                swallowTarget: null,
                swallowT: 0,
                swallowTotal: 0,
                swallowStage: 0,
                swallowed: 0,
                kills: 0,
                secondWindUsed: false,
                downT: 0,
                stun: 0,
                hitFlash: 0,
                animT: 0,
                attackFx: null,
                /* Set of adaptation ids in force, for quick lookup. */
                adapt: {},
                /* Damage numbers that are still flying. */
                popups: []
            };

            /* Genome tracks. */
            for (var i = 0; i < S.Genome.tracks.length; i++) {
                var t = S.Genome.tracks[i];
                var rank = (g[t.id] || 0);
                if (!rank) continue;
                var amt = t.per * rank;
                if (t.stat === "size") p.mass += base.mass * amt;                else if (t.stat === "gape") p.gape += amt;
                else if (t.stat === "hold") p.hold += amt;
                else if (t.stat === "reach") p.reach *= (1 + amt);
                else if (t.stat === "chitin") p.chitin += amt;
                else if (t.stat === "acid") p.acid += amt;
                else if (t.stat === "speed") p.speed *= (1 + amt);
                else if (t.stat === "regen") p.regen += amt;
            }

            /* Adaptations. */
            adaptations = adaptations || [];
            for (var a = 0; a < adaptations.length; a++) {
                var ad = S.Adaptations.get(adaptations[a]);
                if (ad) p.adapt[ad.id] = true;
            }
            S.Body.applyAdaptations(p);

            /* The base numbers, before size is taken into account. The
             * reach and the hold are recomputed from these every time
             * the mass changes. */
            p.reachBase = p.reach;
            p.holdBase = p.hold;

            S.Body.recalc(p);
            /* The gape comes from the stage, and a player who carries a
             * large amount of biomass into a level starts in that stage.
             * Without this the carried size was visual only: a colossus
             * arrived with the mouth of a larva. */
            var startStage = S.Body.stageFor(p.mass);
            var startGape = S.Body.stageGape(startStage.id);
            if (startGape > p.gape) p.gape = startGape;
            p.maxHp = base.hp + (p.mass - base.mass) * 1.1;
            p.hp = p.maxHp;
            return p;
        },
        /* Adaptations that change your numbers rather than your behaviour
         * live here. Behavioural ones are read directly by the systems
         * that care about them (the renderer, the AI, the absorb code). */
        applyAdaptations: function (p) {
            if (p.adapt.titanframe) {
                p.mass *= 1.35;
                p.gape += 1;
                p.speed *= 0.82;
            }
            if (p.adapt.bulk) {
                p.mass *= 1.25;
                p.chitin += 2;
            }
            if (p.adapt.chitinplate) {
                p.chitin += 6;
                p.speed *= 0.9;
            }
            if (p.adapt.overreach) {
                p.reach *= 1.2;
                p.speed *= 0.92;
            }
            if (p.adapt.ironmaw) {
                p.gape += 1;
            }
            if (p.adapt.digestion) {
                /* Handled at the point of digestion; the flag is enough. */
            }
            return p;
        },

        /* Effective gape, including the adaptation that lets you cheat it. */
        effectiveGape: function (p) {
            var g = p.gape;
            if (p.adapt.hollowgut) g += 1;
            return g;
        },

        /* Spend an evolution point on an anatomy track. */
        spendPoint: function (p, stat) {
            if (p.evoPoints <= 0) return false;
            p.evoPoints--;
            if (stat === "size") { p.mass *= 1.1; p.maxHp += 6; p.hp += 6; }
            else if (stat === "gape") p.gape += 1;
            else if (stat === "hold") p.hold += 0.25;
            else if (stat === "reach") p.reachBase *= 1.1;
            else if (stat === "chitin") p.chitin += 2;
            else if (stat === "acid") p.acid += 0.4;
            else if (stat === "speed") p.speed *= 1.08;
            else if (stat === "regen") p.regen += 0.5;
            else { p.evoPoints++; return false; }
            S.Body.recalc(p);
            return true;
        },
        /*
         * Add biomass. This is the single place where the player grows,
         * and it handles level ups, stage changes and the gape that comes
         * with a new stage.
         *
         * Returns a list of events so the caller can play sounds and pop
         * text without this function knowing about either.
         */
        addMass: function (p, amount) {
            var events = [];
            if (amount <= 0) return events;
            var before = p.mass;
            p.mass += amount;
            p.xp += amount;
            S.Body.recalc(p);

            var level = 1;
            while (p.xp >= C.growth.xpFor(level)) {
                p.xp -= C.growth.xpFor(level);
                level++;
                p.evoPoints++;
                events.push({ type: "level", level: level });
            }
            p.level = level;

            var oldStage = S.Body.stageFor(before);
            var newStage = S.Body.stageFor(p.mass);
            if (newStage.id !== oldStage.id) {
                var stageGape = S.Body.stageGape(newStage.id);
                if (stageGape > p.gape) p.gape = stageGape;
                events.push({ type: "stage", stage: newStage });
            }

            if (p.hp > p.maxHp) p.hp = p.maxHp;
            return events;
        },

        /* Lose biomass. The game must never let you reach zero and keep
         * going, so a floor is enforced here. */
        loseMass: function (p, fraction) {
            var before = p.mass;
            p.mass = Math.max(1, p.mass * (1 - fraction));
            S.Body.recalc(p);
            return before - p.mass;
        },

        /*
         * The two weapons you carry.
         *
         * Lash is the default because it is the one that teaches the
         * game. The second slot takes the most interesting weapon you
         * have unlocked, so the loadout improves on its own as the
         * Genome fills up, without a second menu to learn.
         */
        loadout: function (save) {
            save = save || S.Storage.data();
            var unlocked = [];
            for (var k in save.weapons) {
                if (save.weapons[k] > 0) unlocked.push(k);
            }
            if (!unlocked.length) unlocked = ["lash"];

            var a = unlocked.indexOf("lash") >= 0 ? "lash" : unlocked[0];

            /* The second hand is the player's choice, as long as they
             * own what they are holding. */
            var b = null;
            if (save.loadout && unlocked.indexOf(save.loadout) >= 0 && save.loadout !== a) {
                b = save.loadout;
            }
            if (!b) {
                /* Nothing chosen yet: take the best of what is owned, in
                 * order of how much it earns its place. */
                var preference = ["grasp", "drag", "siphon", "inject", "shock", "blade"];
                for (var i = 0; i < preference.length; i++) {
                    if (unlocked.indexOf(preference[i]) >= 0) { b = preference[i]; break; }
                }
            }
            if (!b) {
                for (var j = 0; j < unlocked.length; j++) {
                    if (unlocked[j] !== a) { b = unlocked[j]; break; }
                }
            }
            if (!b) b = a;
            return [a, b];
        },

        /*
         * Three adaptations to choose from at the start of a level.
         *
         * The pool is everything the player has unlocked in the Genome.
         * If it is empty - which it is for a new player - the offer is
         * padded with locked adaptations, and picking one unlocks it
         * permanently. So the first level teaches the mechanic and every
         * later level has a deeper pool.
         */
        offerAdaptations: function (count, rng) {
            var save = S.Storage.data();
            var owned = save.adaptations || [];
            var order = S.Adaptations.order.slice();

            var pool = [], locked = [];
            for (var i = 0; i < order.length; i++) {
                if (owned.indexOf(order[i]) >= 0) pool.push(order[i]);
                else locked.push(order[i]);
            }
            rng.shuffle(pool);
            rng.shuffle(locked);

            var out = pool.slice(0, count);
            while (out.length < count && locked.length) out.push(locked.shift());
            return out;
        }
    };
})(window.GU = window.GU || {});
