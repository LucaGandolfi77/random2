/*
 * GULPER - the six weapons.
 *
 * Data plus a resolver. world.js turns each mode into a shape:
 *
 *   combo      a cycling three-strike melee chain (the LASH)
 *   grip       a hold: sweep, close on one thing, keep it (the GRASP)
 *   projectile a lobbed sac of venom (the INJECT)
 *   radial     a burst around the body, paid in mass (the SHOCK)
 *   charge     a wind-up heavy arc, the only lethal strike (the BLADE)
 *   channel    a beam that drains while held (the SIPHON)
 *
 * Tiers are 1-based everywhere: a weapon starts at tier 1 when it is
 * unlocked, and shards buy tier 2 and tier 3. `stats(id, tier)` returns a
 * fresh merged copy, so callers can bend reach and cooldown to the
 * player's anatomy without editing the table.
 */
(function (S) {
    "use strict";

    var defs = {
        lash: {
            id: "lash", name: "LASH", short: "LSH", mode: "combo",
            desc: "Three quick strikes. The third lands hard and breaks will.",
            unlockCost: 6, tierCost: [6, 14, 28],
            damage: 5, combo: 3, comboDamage: [5, 5, 9],
            will: 0.26, comboWill: [0.3, 0.3, 0.55],
            reach: 34, arc: 1.5, knock: 60,
            cooldown: 0.32, stamina: 0.4,
            tiers: [
                {},
                { damage: 6, comboDamage: [6, 6, 11], will: 0.3, comboWill: [0.35, 0.35, 0.62],
                  reach: 37, knock: 70, cooldown: 0.28 },
                { damage: 8, comboDamage: [8, 8, 14], will: 0.35, comboWill: [0.4, 0.4, 0.7],
                  reach: 41, knock: 85, cooldown: 0.24 }
            ]
        },
        grasp: {
            id: "grasp", name: "GRASP", short: "GRP", mode: "grip", grip: true,
            desc: "Close a limb on one target and keep it. Holds start swallows.",
            unlockCost: 8, tierCost: [8, 16, 32],
            damage: 3, will: 0.5,
            reach: 36, arc: 1.1, knock: 40,
            cooldown: 0.5, stamina: 0.5,
            tiers: [
                {},
                { damage: 4, will: 0.58, reach: 40, knock: 55, cooldown: 0.44 },
                { damage: 6, will: 0.66, reach: 45, knock: 75, cooldown: 0.38 }
            ]
        },
        inject: {
            id: "inject", name: "INJECT", short: "INJ", mode: "projectile",
            desc: "Lob a sac of venom. The sac gnaws will and softens armour.",
            unlockCost: 10, tierCost: [10, 20, 36],
            damage: 4, will: 0.5, corrode: 2,
            projectileSpeed: 240, reach: 150,
            cooldown: 1.0, stamina: 0.6,
            tiers: [
                {},
                { damage: 5, will: 0.6, corrode: 2.6, projectileSpeed: 265, reach: 170, cooldown: 0.85 },
                { damage: 7, will: 0.7, corrode: 3.2, projectileSpeed: 300, reach: 190, cooldown: 0.7 }
            ]
        },
        shock: {
            id: "shock", name: "SHOCK", short: "SHK", mode: "radial",
            desc: "Dump the discharge plates. A radial jolt that stops a crowd.",
            unlockCost: 12, tierCost: [12, 24, 44],
            damage: 6, will: 0.6, stun: 0.5, knock: 140,
            reach: 60, massCost: 1,
            cooldown: 2.2, stamina: 0,
            tiers: [
                {},
                { damage: 8, will: 0.7, stun: 0.6, knock: 170, reach: 70, massCost: 0.8, cooldown: 1.9 },
                { damage: 11, will: 0.85, stun: 0.75, knock: 210, reach: 85, massCost: 0.6, cooldown: 1.6 }
            ]
        },
        blade: {
            id: "blade", name: "BLADE", short: "BLD", mode: "charge", lethal: true,
            desc: "Charge a heavy arc. The one strike that kills outright.",
            unlockCost: 14, tierCost: [14, 28, 52],
            damage: 16, will: 0.7, bleed: 0.4,
            reach: 42, arc: 2.0, knock: 90,
            chargeTime: 0.75, cooldown: 1.2, stamina: 1.2,
            tiers: [
                {},
                { damage: 20, will: 0.8, bleed: 0.55, reach: 47, arc: 2.2, chargeTime: 0.66, cooldown: 1.05 },
                { damage: 26, will: 0.95, bleed: 0.75, reach: 53, arc: 2.4, chargeTime: 0.58, cooldown: 0.9 }
            ]
        },
        siphon: {
            id: "siphon", name: "SIPHON", short: "SIP", mode: "channel",
            desc: "Channel the gut-light. It drains them, and it draws the response.",
            unlockCost: 16, tierCost: [16, 32, 60],
            /* The siphon drinks, it does not strike: world.js's channel
             * branch never reads damage. Zero keeps the tables complete. */
            damage: 0,
            drain: 2.2, will: 0.9, alarm: 1.4,
            reach: 90,
            cooldown: 0.05, stamina: 0,
            tiers: [
                {},
                { drain: 2.8, will: 1.05, reach: 100, alarm: 1.3, cooldown: 0.04 },
                { drain: 3.6, will: 1.25, reach: 115, alarm: 1.15, cooldown: 0.03 }
            ]
        }
    };

    S.Weapons = {
        order: ["lash", "grasp", "inject", "shock", "blade", "siphon"],

        /* The definition table, for menus and tests. */
        get: function (id) {
            return defs[id] || null;
        },

        /* Merged, tier-scaled stats. Tier is 1-based; tier 0 (a weapon you
         * have not bought) behaves like tier 1 so nothing downstream has
         * to special-case a locked weapon. */
        stats: function (id, tier) {
            var def = defs[id];
            if (!def) return null;
            var t = Math.max(1, Math.min(3, (tier | 0) || 1));
            var over = def.tiers[t - 1] || {};
            var s = {};
            var k;
            for (k in def) s[k] = def[k];
            for (k in over) s[k] = over[k];
            s.tier = t;
            return s;
        },

        /* Shards to go from `tier` to tier + 1. Null once the weapon is
         * maxed; the menus use that to swap a "buy" button for a badge. */
        nextTierCost: function (id, tier) {
            var def = defs[id];
            if (!def) return null;
            if (!(tier >= 1) || tier >= 3) return null;
            return def.tierCost[tier];
        }
    };
})(window.GU = window.GU || {});
