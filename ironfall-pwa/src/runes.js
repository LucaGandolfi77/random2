/*
 * IRONFALL - the rune matrix and the Doctrine mastery track.
 *
 * Three rows, three columns, one pick per row: twenty-seven loadouts from nine
 * runes. That is League's keystone/tempo/stat shape, and it exists for one
 * reason - a player who has solved the game should be able to solve it
 * *differently* without a second game underneath.
 *
 * Six of the nine are pure stat blocks read straight into a champion's stat
 * sheet. Three carry behaviour, and those three are the ones worth taking.
 */
(function (S) {
    "use strict";

    /* `mods` are applied once at match start, before any ability. `hook` is a
     * string the simulation looks up; only three hooks exist and the rune
     * test asserts that any rune declaring one names a real hook. */
    var RUNES = {
        /* ===== Row 0 - Keystone =====
         * A keystone changes how the champion gets its damage done, not how
         * much. All three are worse than a plain stat in a vacuum and better
         * than one in a match, which is the correct shape for a keystone. */
        graspplate: {
            id: "graspplate",
            row: 0,
            name: "GRASPPLATE",
            mods: { hp: 80 },
            hook: "grasp",
            /* Four auto attacks on the same target. At a marksman's attack
             * rate that is under four seconds, which is inside the window
             * where a fight is actually decided. */
            stacks: 4,
            dur: 5,
            tick: 0.5,
            dmg: 22,
            dmgPctAd: 0.12,
            text: "After 4 attacks on one target, deal damage over time for 5s.",
            blurb: "Slow. Certain. Does not care what they heal."
        },
        lethaltempo: {
            id: "lethaltempo",
            row: 0,
            name: "LETHAL TEMPO",
            mods: { asPct: 0.12 },
            hook: "tempo",
            stacks: 3,
            asBuff: 0.4,
            dur: 5,
            text: "After 3 attacks, gain +40% attack speed for 5s.",
            blurb: "Three swings to open it up, then do not stop swinging."
        },
        predator: {
            id: "predator",
            row: 0,
            name: "PREDATOR",
            mods: {},
            hook: "predator",
            threshold: 0.4,
            msBuff: 0.32,
            /* A flat vision bump rather than a percentage of one, so it reads
             * on a large champion as well as a small one. */
            visionBonus: 350,
            text: "Below 40% health: +32% move speed and +350 vision.",
            blurb: "The chase is the point. Turning back is not an option."
        },

        /* ===== Row 1 - Tempo =====
         * Row one is about what happens when a fight ends, and about where
         * you are standing when it does not. */
        triumph: {
            id: "triumph",
            row: 1,
            name: "TRIUMPH",
            mods: {},
            hook: "triumph",
            heal: 120,
            /* Ten percent of your missing health, capped, so a full-health
             * player does not get a free 120 HP for a kill they barely
             * needed. */
            healMissingPct: 0.1,
            healMissingCap: 300,
            text: "On a champion kill: heal 120, plus 10% missing health (max 300).",
            blurb: "Kills are the only health potion worth having."
        },
        diligentblade: {
            id: "diligentblade",
            row: 1,
            name: "DILIGENT BLADE",
            mods: { ad: 4 },
            hook: "lastGold",
            goldPerMinion: 2,
            goldPerCannon: 6,
            text: "+2 gold per minion last-hit, +6 per cannon.",
            blurb: "Pays for itself in about four waves. Then pays for itself."
        },
        pressure: {
            id: "pressure",
            row: 1,
            name: "PRESSURE",
            mods: {},
            hook: "pressure",
            msBuff: 0.14,
            asBuff: 0.18,
            /* Pressure turns on being on the enemy's side of the river, which
             * is a readable condition: you can see on screen whether it is
             * running, unlike a stack counter. */
            requiresEnemyHalf: true,
            text: "In the enemy half: +14% move speed and +18% attack speed.",
            blurb: "The push is not optional, so make the push fast."
        },

        /* ===== Row 2 - Utility =====
         * Pure stat, deliberately. Row two is where a player who does not
         * want to think picks something, and it should not be a trap. */
        bulwark: {
            id: "bulwark",
            row: 2,
            name: "BULWARK",
            mods: { hp: 140, armor: 6, mr: 5, hpRegen: 4 },
            text: "+140 health, +6 armour, +5 resistance, +4 health regen.",
            blurb: "No trick. Just harder to kill, which is a trick."
        },
        secondwind: {
            id: "secondwind",
            row: 2,
            name: "SECOND WIND",
            mods: { hp: 120, hpRegen: 7, manaRegen: 5, cdr: 0.08 },
            text: "+120 health, +7 health regen, +5 mana regen, +8% cooldown reduction.",
            blurb: "The row that makes the other eight rows come up more often."
        },
        bootleg: {
            id: "bootleg",
            row: 2,
            name: "BOOTLEG",
            mods: { ms: 15 },
            hook: "cheapWard",
            wardDiscount: 0.5,
            /* Ten gold a wave for finishing it, which is roughly the cost of
             * a Scryer-relay every four waves. Scryer-relays are how you win
             * the dark half of the map. */
            goldPerWave: 10,
            text: "+15 move speed. Scryer-relays cost half. +10 gold per wave cleared.",
            blurb: "Vision is worth more than movement speed. Vision wins games."
        }
    };

    var ROWS = [
        { row: 0, name: "KEYSTONE" },
        { row: 1, name: "TEMPO" },
        { row: 2, name: "UTILITY" }
    ];

    var BY_ROW = [[], [], []];
    for (var key in RUNES) {
        if (!Object.prototype.hasOwnProperty.call(RUNES, key)) continue;
        BY_ROW[RUNES[key].row].push(RUNES[key]);
    }

    /* Every hook the simulation knows how to run. The rune test asserts the
     * two lists match, so adding a rune with a typo'd hook fails CI rather
     * than shipping a button that does nothing. */
    var HOOKS = ["grasp", "tempo", "predator", "triumph", "lastGold", "pressure", "cheapWard"];

    S.Runes = {
        all: RUNES,
        rows: ROWS,
        /* The list is `hookIds`, NOT `hooks`. `hooks` is the resolver
         * function further down and the two collided: declaring `hooks:
         * HOOKS` and then `hooks: function (loadout)` in the same object
         * literal means the function silently wins and the list vanishes.
         * Nothing crashed - the consumer asking for the list got a function
         * and got `indexOf is not a function` a long way from the cause. */
        hookIds: HOOKS,
        count: Object.keys(RUNES).length,

        get: function (id) { return RUNES[id] || null; },
        exists: function (id) {
            return Object.prototype.hasOwnProperty.call(RUNES, id);
        },
        byRow: function (row) { return BY_ROW[row] || []; },

        /* Resolve a {row0,row1,row2} loadout into the list of rune records.
         * Null rows resolve to the row's first entry rather than to nothing,
         * so a fresh save is a valid loadout and the champion sheet never
         * shows three empty slots. */
        resolve: function (loadout) {
            var out = [];
            for (var row = 0; row < 3; row++) {
                var id = loadout ? loadout["row" + row] : null;
                var rune = (id && RUNES[id]) ? RUNES[id] : BY_ROW[row][0];
                if (rune) out.push(rune);
            }
            return out;
        },

        /* Flatten every picked rune's `mods` into one additive object. Called
         * once at champion spawn, so the rune cost is never paid inside the
         * frame loop. */
        sumMods: function (loadout) {
            var list = S.Runes.resolve(loadout);
            var out = {};
            for (var i = 0; i < list.length; i++) {
                var m = list[i].mods || {};
                for (var k in m) {
                    if (!Object.prototype.hasOwnProperty.call(m, k)) continue;
                    out[k] = (out[k] || 0) + m[k];
                }
            }
            return out;
        },

        /* The behavioural hooks actually chosen. combat.js and ai.js read
         * this rather than the raw loadout so a missing row silently loses a
         * passive instead of a null dereference. */
        hooks: function (loadout) {
            var list = S.Runes.resolve(loadout);
            var out = {};
            for (var i = 0; i < list.length; i++) {
                var r = list[i];
                if (r.hook) out[r.hook] = r;
            }
            return out;
        },

        /* Human-readable summary for the HUD tooltip. */
        summary: function (loadout) {
            var list = S.Runes.resolve(loadout);
            var names = [];
            for (var i = 0; i < list.length; i++) names.push(list[i].name);
            return names.join(" / ");
        }
    };

})(window.IF = window.IF || {});
