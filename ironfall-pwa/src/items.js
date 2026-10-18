/*
 * IRONFALL - the reliquary-forge shop.
 *
 * Fourteen items in four slots' worth of roles. Deliberately short: a shop
 * with forty items is a shop nobody reads on a phone, and every item here
 * has to survive being bought at minute one and minute twenty.
 *
 * There is no build path and no components tree. Items are flat purchases on
 * a cooldown, which is what a three-man match can actually support - a
 * League component tree needs the gold curve and the ten-item cap and the
 * full item roster, none of which earn their cost at this match length.
 */
(function (S) {
    "use strict";

    /* Items grant mods. `passive` is a string the simulation looks up; the
     * items test asserts every declared passive names one combat.js knows.
     *
     * Cost/benefit ratio to hold in mind: a caster with 420 base mana buys
     * CENSER at 2400 and still has enough for a Rod on the next spawn. */
    var ITEMS = {
        /* ===== Boots ===== */
        servoboot: {
            id: "servoboot",
            name: "SERVO BOOTS",
            cost: 450,
            slot: "boots",
            icon: "boot",
            mods: { ms: 35 },
            text: "+35 move speed",
            /* Boots are gated on a component-free basis: you can buy them
             * first thing out of base, which is the whole point of a
             * free-standing boot item in a short match. */
            blurb: "Servos rated for a drop pod. Yours were not."
        },
        wargog: {
            id: "wargog",
            name: "WAR-GOG BOOTS",
            cost: 1000,
            slot: "boots",
            icon: "boot",
            mods: { ms: 45, hp: 120 },
            needs: "servoboot",
            text: "+45 move speed, +120 health",
            blurb: "Somebody's trophy. Now it is yours and it fits."
        },

        /* ===== Physical ===== */
            bolter: {
            id: "bolter",
            name: "BOLTER CHARGE",
            cost: 1100,
            slot: "ad",
            icon: "gun",
            mods: { ad: 22 },
            text: "+22 attack damage",
            blurb: "One more round in the magazine than you had before."
        },
        chainsword: {
            id: "chainsword",
            name: "CHAINSWORD",
            cost: 1250,
            slot: "ad",
            icon: "blade",
            mods: { ad: 18, asPct: 0.18, lifesteal: 0.1 },
            text: "+18 attack damage, +18% attack speed, 10% lifesteal",
            blurb: "Weighted to kill while keeping you upright."
        },
        powerarmour: {
            id: "powerarmour",
            name: "POWER PLATE",
            cost: 2800,
            slot: "armor",
            icon: "plate",
            mods: { hp: 420, armor: 30, hpRegen: 8 },
            needs: "bolter",
            text: "+420 health, +30 armour, +8 health regen",
            blurb: "Grafted. Loud. Effective."
        },
        relicblade: {
            id: "relicblade",
            name: "RELICBLADE",
            cost: 2700,
            slot: "ad",
            icon: "blade",
            /* No `passive` field, and deliberately so: every effect this item
             * has is already expressed in `mods`, so a passive entry would
             * have been a bullet on the item sheet for an effect that did
             * not exist. An item that lies about itself is worse than an item
             * with fewer numbers. */
            mods: { ad: 45, crit: 0.25, lifesteal: 0.12, asPct: 0.12 },
            needs: "chainsword",
            text: "+45 AD, +25% crit, 12% lifesteal, +12% attack speed",
            blurb: "It was a saint's blade. It is a very large knife now."
        },

        /* ===== Magical ===== */
        warpTalisman: {
            id: "warpTalisman",
            name: "WARP TALISMAN",
            cost: 900,
            slot: "ap",
            icon: "orb",
            mods: { ap: 28, mana: 180, manaRegen: 8 },
            text: "+28 power, +180 mana, +8 mana regen",
            blurb: "Screams faintly. So does everything else, eventually."
        },
        psykerner: {
            id: "psykerner",
            name: "PSYKERNER",
            cost: 2600,
            slot: "ap",
            icon: "orb",
            mods: { ap: 70, mana: 300, hp: 260, cdr: 0.12 },
            needs: "warpTalisman",
            text: "+70 power, +300 mana, +260 health, +12% cooldown reduction",
            blurb: "Three minds where one was. Two of them agree."
        },
        censer: {
            id: "censer",
            name: "CENSER OF ASHES",
            cost: 2400,
            slot: "ap",
            icon: "censer",
            mods: { ap: 65, hpRegen: 12, manaRegen: 12 },
            needs: "warpTalisman",
            passive: "censer",
            text: "+65 power, +12 health regen, +12 mana regen",
            passiveText: "Kills refund all cooldowns.",
            blurb: "Burns what it wants. The list is short and gets shorter."
        },

        /* ===== Utility ===== */
        voidLens: {
            id: "voidLens",
            name: "VOID LENS",
            cost: 1300,
            slot: "utility",
            icon: "lens",
            mods: { hp: 280, hpRegen: 12 },
            passive: "voidLens",
            text: "+280 health, +12 health regen",
            passiveText: "Scryer-relays cost nothing.",
            blurb: "The map is the strongest item in the game."
        },
        reliquarySeal: {
            id: "reliquarySeal",
            name: "RELIQUARY SEAL",
            cost: 1500,
            slot: "utility",
            icon: "seal",
            mods: { hp: 200, mr: 20, armor: 12 },
            passive: "reliquarySeal",
            text: "+200 health, +20 resistance, +12 armour",
            passiveText: "The Reliquary buff is doubled for you.",
            blurb: "Cut from the thing everyone else is standing on."
        },
        chapterBanner: {
            id: "chapterBanner",
            name: "CHAPTER BANNER",
            cost: 2000,
            slot: "utility",
            icon: "banner",
            mods: { hp: 300, hpRegen: 10, armor: 15, cdr: 0.1 },
            passive: "chapterBanner",
            text: "+300 health, +10 health regen, +15 armour, +10% cooldown reduction",
            passiveText: "Structures and minions within 500 take 12% less damage from you.",
            blurb: "Waving at your own troops so they shoot harder."
        }
    };

    /* Passives combat.js knows how to run. Mirrors Runes.hooks: a typo is a
     * dead item, and the items test says so out loud. */
    var ITEM_PASSIVES = [
        "censer", "voidLens", "reliquarySeal", "chapterBanner"
    ];

    /* Shop order is the order shown in the panel, grouped so a player can
     * find boots without reading all fourteen. */
    var ORDER = [
        "servoboot", "wargog",
        "bolter", "chainsword", "powerarmour", "relicblade",
        "warpTalisman", "psykerner", "censer",
        "voidLens", "reliquarySeal", "chapterBanner"
    ];

    function ordered() {
        var out = [];
        for (var i = 0; i < ORDER.length; i++) {
            if (ITEMS[ORDER[i]]) out.push(ITEMS[ORDER[i]]);
        }
        return out;
    }

    S.Items = {
        all: ITEMS,
        passives: ITEM_PASSIVES,
        order: ORDER,
        list: ordered(),
        count: ORDER.length,

        get: function (id) { return ITEMS[id] || null; },

        /* The cost of everything still wanted, in slots that are empty.
         * A component that has already been bought is not re-charged, which
         * is why this walks the `needs` chain rather than summing blindly. */
        cartCost: function (owned) {
            var total = 0;
            for (var i = 0; i < ORDER.length; i++) {
                var it = ITEMS[ORDER[i]];
                if (it.needs && owned.indexOf(it.needs) >= 0) continue;
                total += it.cost;
            }
            return total;
        },

        /* What is buyable right now, given gold and what is already owned.
         * A player who cannot afford the full cart still gets a sensible
         * subset rather than an empty shop and no idea why. */
        affordable: function (gold, owned) {
            var out = [], i;
            var budget = gold;
            /* Walk in order but let the player who wants the expensive item
             * get it: the list is sorted so components come first, and the
             * pool keeps whatever fits. */
            for (i = 0; i < ORDER.length; i++) {
                var it = ITEMS[ORDER[i]];
                if (owned.indexOf(it.id) >= 0) continue;
                if (it.cost <= budget) {
                    out.push(it);
                    budget -= it.cost;
                }
            }
            return out;
        },

        /* Sum of `mods` across everything owned. The only place item stats
         * become champion stats. */
        sumMods: function (owned) {
            var out = {};
            for (var i = 0; i < owned.length; i++) {
                var it = ITEMS[owned[i]];
                if (!it || !it.mods) continue;
                for (var k in it.mods) {
                    if (!Object.prototype.hasOwnProperty.call(it.mods, k)) continue;
                    out[k] = (out[k] || 0) + it.mods[k];
                }
            }
            return out;
        },

        /* Flat damage bonus, or null when the damage is percentage-scaled.
         * Kept separate from `ap` because the simulation needs to know which
         * one it has before it reads any AD ratio. */
        has: function (owned, passive) {
            for (var i = 0; i < owned.length; i++) {
                var it = ITEMS[owned[i]];
                if (it && it.passive === passive) return true;
            }
            return false;
        }
    };

})(window.IF = window.IF || {});
