/*
 * CINDER BELT - all the numbers in one place.
 *
 * The belt is a set of concentric rings around the Maw, plus one safe bubble
 * carved out of the Drift where the Anchorage sits. Every ring answers a
 * different question: where do I mine, where do I fight, where do I run to.
 */
(function (CB) {
    "use strict";

    var TAU = Math.PI * 2;

    var CONFIG = {
        VERSION: 1,
        SLUG: "cinder-belt-pwa/",
        MATCH_TIME: 900,            /* 15 minutes, then the ring collapses */

        WORLD_RADIUS: 8200,
        MAW_RADIUS: 2000,
        SCAB_RADIUS: 4400,
        DRIFT_RADIUS: 7600,

        HOME: { x: -6500, y: 0 },
        SAFE_RADIUS: 1300,          /* the Anchorage bubble */
        BLACK_HOLE: { x: 0, y: 0, radius: 300, gravity: 1500, killRadius: 420 },
        RELAY_RADIUS: 3300,

        STATION: {
            radius: 190,
            dockRadius: 285,
            hp: 9000,
            turretRange: 900,
            turretDamage: 24,
            turretRate: 0.42
        },
        NEXUS: {
            x: 0, y: -3850,
            radius: 235,
            dockRadius: 330,
            hp: 7000,
            shield: 2600,
            shieldRegen: 55,
            turretRange: 820,
            turretDamage: 20,
            turretRate: 0.7
        },

        PLAYER: {
            respawn: 5.5,
            creditLoss: 0.25,
            invuln: 2.5
        },
        BOT: {
            respawn: 9,
            think: 0.22
        },

        BULLET_CAP: 900,
        PARTICLE_CAP: 1100,
        PICKUP_CAP: 450,
        ASTEROID_COUNT: 190,

        /* Sale value per chunk. Chunks are cargo units, so a full hold is a
         * physical thing you can lose, not a number in a wallet. */
        ORES: {
            ferrite: { name: "Ferrite", value: 2, color: "#9fb3c8", rock: "#64748b" },
            cobalt: { name: "Cobalt", value: 5, color: "#60a5fa", rock: "#3b5b80" },
            prism: { name: "Prism", value: 14, color: "#c084fc", rock: "#5b4b86" },
            voidglass: { name: "Voidglass", value: 42, color: "#fb7185", rock: "#6d3550" }
        },

        ZONE: {
            anchorage: {
                id: "anchorage",
                name: "ANCHORAGE",
                sub: "SAFE HARBOUR",
                color: "#5eead4",
                pvp: false,
                safe: true,
                ore: 1,
                bounty: 1,
                blurb: "Turrets online. Weapons free only against outlaws."
            },
            drift: {
                id: "drift",
                name: "VERDANT DRIFT",
                sub: "PvE FRONTIER",
                color: "#86efac",
                pvp: false,
                safe: false,
                ore: 1,
                bounty: 1,
                blurb: "Aliens hunt here. Ship-to-ship fire marks you OUTLAW."
            },
            scab: {
                id: "scab",
                name: "THE SCAB",
                sub: "PvP CONTESTED",
                color: "#fbbf24",
                pvp: true,
                safe: false,
                ore: 2,
                bounty: 2,
                blurb: "Open PvP. Hold two relays to drop the Nexus shield."
            },
            maw: {
                id: "maw",
                name: "THE MAW",
                sub: "PvP HAZARD",
                color: "#fb7185",
                pvp: true,
                safe: false,
                ore: 3,
                bounty: 3,
                blurb: "Gravity and radiation. The richest ore in the belt."
            },
            void: {
                id: "void",
                name: "THE VOID",
                sub: "RING BREAK",
                color: "#94a3b8",
                pvp: true,
                safe: false,
                ore: 0,
                bounty: 1,
                blurb: "Outside the ring. Turn back or burn."
            }
        },

        /* Tier 1 is shared; from tier 2 the pilot picks a doctrine. */
        STARTER: {
            id: "sparrow",
            name: "SPARROW",
            line: "lance",
            tier: 1,
            hull: 145,
            shield: 85,
            energy: 105,
            speed: 260,
            accel: 570,
            cargo: 32,
            damage: 10,
            rate: 7,
            pellets: 1,
            spread: 0.02,
            bulletSpeed: 790,
            range: 930,
            radius: 15,
            magnet: 270,
            mining: 1,
            ability: "dash",
            abilityName: "AFTERBURNER",
            abilityCd: 5.5,
            color: "#e2e8f0"
        },

        LINES: {
            lance: {
                id: "lance",
                name: "LANCE",
                role: "INTERCEPTOR",
                color: "#67e8f9",
                blurb: "Fast, precise, fragile. Dash through danger, hit first.",
                hulls: [
                    { id: "dart", name: "DART", tier: 2, hull: 120, shield: 75, energy: 115, speed: 324, accel: 760, cargo: 24, damage: 14, rate: 6.2, pellets: 1, spread: 0.012, bulletSpeed: 1010, range: 1160, radius: 14, magnet: 280, mining: 1, ability: "dash", abilityName: "PHASE DASH", abilityCd: 5.0, color: "#67e8f9" },
                    { id: "needle", name: "NEEDLE", tier: 3, hull: 165, shield: 105, energy: 130, speed: 350, accel: 820, cargo: 30, damage: 19, rate: 6.6, pellets: 1, spread: 0.011, bulletSpeed: 1060, range: 1210, radius: 14, magnet: 290, mining: 1, ability: "dash", abilityName: "PHASE DASH", abilityCd: 4.8, color: "#67e8f9" },
                    { id: "talon", name: "TALON", tier: 4, hull: 220, shield: 140, energy: 150, speed: 372, accel: 870, cargo: 38, damage: 26, rate: 7.0, pellets: 1, spread: 0.01, bulletSpeed: 1100, range: 1260, radius: 15, magnet: 300, mining: 1, ability: "dash", abilityName: "PHASE DASH", abilityCd: 4.6, color: "#67e8f9" },
                    { id: "razor", name: "RAZOR", tier: 5, hull: 290, shield: 185, energy: 175, speed: 396, accel: 930, cargo: 46, damage: 35, rate: 7.4, pellets: 1, spread: 0.009, bulletSpeed: 1150, range: 1320, radius: 16, magnet: 310, mining: 1, ability: "dash", abilityName: "PHASE DASH", abilityCd: 4.4, color: "#67e8f9" },
                    { id: "specter", name: "SPECTER", tier: 6, hull: 380, shield: 250, energy: 205, speed: 418, accel: 990, cargo: 56, damage: 47, rate: 7.8, pellets: 1, spread: 0.008, bulletSpeed: 1200, range: 1400, radius: 17, magnet: 330, mining: 1, ability: "dash", abilityName: "PHASE DASH", abilityCd: 4.2, color: "#a5f3fc" }
                ]
            },
            bulwark: {
                id: "bulwark",
                name: "BULWARK",
                role: "LINE HOLDER",
                color: "#fbbf24",
                blurb: "Shields, flak and patience. Walk into the fight and stay there.",
                hulls: [
                    { id: "turtle", name: "TURTLE", tier: 2, hull: 245, shield: 165, energy: 95, speed: 218, accel: 470, cargo: 36, damage: 8, rate: 5.2, pellets: 3, spread: 0.085, bulletSpeed: 690, range: 760, radius: 19, magnet: 300, mining: 1, ability: "barrier", abilityName: "AEGIS FIELD", abilityCd: 10.5, color: "#fbbf24" },
                    { id: "aegis", name: "AEGIS", tier: 3, hull: 330, shield: 225, energy: 115, speed: 224, accel: 490, cargo: 44, damage: 10, rate: 5.4, pellets: 4, spread: 0.08, bulletSpeed: 710, range: 790, radius: 21, magnet: 310, mining: 1, ability: "barrier", abilityName: "AEGIS FIELD", abilityCd: 10.0, color: "#fbbf24" },
                    { id: "bastion", name: "BASTION", tier: 4, hull: 440, shield: 300, energy: 140, speed: 232, accel: 520, cargo: 53, damage: 13, rate: 5.6, pellets: 5, spread: 0.075, bulletSpeed: 730, range: 820, radius: 23, magnet: 320, mining: 1, ability: "barrier", abilityName: "AEGIS FIELD", abilityCd: 9.5, color: "#fbbf24" },
                    { id: "citadel", name: "CITADEL", tier: 5, hull: 580, shield: 400, energy: 170, speed: 240, accel: 550, cargo: 64, damage: 16, rate: 5.8, pellets: 6, spread: 0.07, bulletSpeed: 750, range: 850, radius: 25, magnet: 330, mining: 1, ability: "barrier", abilityName: "AEGIS FIELD", abilityCd: 9.0, color: "#fbbf24" },
                    { id: "monolith", name: "MONOLITH", tier: 6, hull: 780, shield: 530, energy: 205, speed: 250, accel: 580, cargo: 78, damage: 21, rate: 6.0, pellets: 7, spread: 0.065, bulletSpeed: 780, range: 890, radius: 28, magnet: 350, mining: 1, ability: "barrier", abilityName: "AEGIS FIELD", abilityCd: 8.5, color: "#fde68a" }
                ]
            },
            harvester: {
                id: "harvester",
                name: "HARVESTER",
                role: "INDUSTRIAL",
                color: "#a3e635",
                blurb: "A hold like a warehouse and a beam that eats rock. Fund the war.",
                hulls: [
                    { id: "mole", name: "MOLE", tier: 2, hull: 185, shield: 100, energy: 120, speed: 262, accel: 570, cargo: 58, damage: 7, rate: 9.0, pellets: 1, spread: 0.03, bulletSpeed: 710, range: 800, radius: 16, magnet: 390, mining: 2.0, ability: "tractor", abilityName: "SALVAGE PULSE", abilityCd: 7.0, color: "#a3e635" },
                    { id: "grub", name: "GRUB", tier: 3, hull: 235, shield: 125, energy: 145, speed: 270, accel: 590, cargo: 74, damage: 8.5, rate: 9.6, pellets: 1, spread: 0.028, bulletSpeed: 730, range: 820, radius: 17, magnet: 420, mining: 2.1, ability: "tractor", abilityName: "SALVAGE PULSE", abilityCd: 6.6, color: "#a3e635" },
                    { id: "miner", name: "MINER", tier: 4, hull: 300, shield: 160, energy: 170, speed: 278, accel: 610, cargo: 96, damage: 10.5, rate: 10.2, pellets: 1, spread: 0.026, bulletSpeed: 750, range: 850, radius: 18, magnet: 450, mining: 2.2, ability: "tractor", abilityName: "SALVAGE PULSE", abilityCd: 6.2, color: "#a3e635" },
                    { id: "refiner", name: "REFINER", tier: 5, hull: 375, shield: 205, energy: 205, speed: 288, accel: 640, cargo: 122, damage: 13, rate: 10.8, pellets: 1, spread: 0.024, bulletSpeed: 770, range: 880, radius: 19, magnet: 480, mining: 2.3, ability: "tractor", abilityName: "SALVAGE PULSE", abilityCd: 5.8, color: "#a3e635" },
                    { id: "motherlode", name: "MOTHERLODE", tier: 6, hull: 470, shield: 260, energy: 240, speed: 298, accel: 670, cargo: 150, damage: 16, rate: 11.4, pellets: 1, spread: 0.022, bulletSpeed: 790, range: 920, radius: 22, magnet: 520, mining: 2.5, ability: "tractor", abilityName: "SALVAGE PULSE", abilityCd: 5.4, color: "#bef264" }
                ]
            }
        },

        UPGRADE_COST: [0, 80, 180, 340, 600, 980],

        /* Bots are tuned as personalities, not difficulty tiers. */
        BOT_NAMES: {
            free: [
                { name: "MOTH", line: "harvester", greed: 0.85, aggression: 0.25, caution: 0.75, skill: 0.48, line2: "Hold the rock, I'll hold the line." },
                { name: "PATCH", line: "bulwark", greed: 0.35, aggression: 0.62, caution: 0.55, skill: 0.54, line2: "Form up on me." },
                { name: "RIVET", line: "lance", greed: 0.4, aggression: 0.85, caution: 0.28, skill: 0.62, line2: "First one to the Maw buys the fuel." }
            ],
            corsair: [
                { name: "VEX-9", line: "lance", greed: 0.2, aggression: 0.95, caution: 0.2, skill: 0.88, ace: true, line2: "I have your name, salvager." },
                { name: "KRAIT", line: "lance", greed: 0.35, aggression: 0.72, caution: 0.4, skill: 0.64, line2: "Nothing personal. Just salvage." },
                { name: "SABLE", line: "bulwark", greed: 0.3, aggression: 0.62, caution: 0.6, skill: 0.6, line2: "The Scab remembers." },
                { name: "GRIN", line: "harvester", greed: 0.9, aggression: 0.35, caution: 0.68, skill: 0.5, line2: "I only want the shiny bits." },
                { name: "HOLLOW", line: "lance", greed: 0.25, aggression: 0.8, caution: 0.35, skill: 0.7, line2: "Your hold looks heavy." }
            ],
            neutral: [
                { name: "WREN", line: "harvester", greed: 0.95, aggression: 0.1, caution: 0.9, skill: 0.4 },
                { name: "TALLY", line: "harvester", greed: 0.9, aggression: 0.2, caution: 0.85, skill: 0.42 }
            ]
        },

        DIFFICULTY: {
            cadet: { name: "CADET", aim: 0.22, aggression: 0.8, damage: 0.72, economy: 0.85, assist: true },
            pilot: { name: "PILOT", aim: 0.12, aggression: 1, damage: 1, economy: 1, assist: false },
            ace: { name: "ACE", aim: 0.05, aggression: 1.25, damage: 1.22, economy: 1.18, assist: false }
        },

        COLORS: {
            free: "#5eead4",
            corsair: "#fb7185",
            neutral: "#c4b5fd",
            feral: "#c084fc",
            gold: "#fde68a",
            danger: "#f87171",
            hull: "#f8fafc"
        },

        COMMS: {
            free: [
                "Anchorage control: hold your vector, salvager.",
                "Beacon chatter: corsair aces are massing at the Scab.",
                "MOTH: I found a prism seam. Glowing like a dead star.",
                "Anchorage control: the Leviathan is moving. It is hungry.",
                "PATCH: relay's ours. Keep it that way.",
                "RIVET: if you see VEX-9, do not try to out-turn her."
            ],
            corsair: [
                "VEX-9: the belt is ours. You are just renting it.",
                "KRAIT: fresh hulls, full holds. Come and take them.",
                "SABLE: the Nexus does not fall. The Nexus does not blink.",
                "VEX-9: I count three salvagers. I count two problems.",
                "GRIN: that ore looks heavy. Let me carry it."
            ],
            events: [
                "BOUNTY HOUR — the Scab pays triple.",
                "ION STORM — shields are dead in the Scab.",
                "FERAL RAID — the Anchorage is under attack.",
                "THE LEVIATHAN HAS SURFACED — its core can break the Nexus.",
                "THE RING IS COLLAPSING — finish it."
            ]
        },

        TUTORIAL: [
            "WASD to fly. Mouse aims, hold fire to mine rock.",
            "Fly into ore chunks to tractor them in. Watch your hold.",
            "Return to the Anchorage and press E to bank and upgrade.",
            "The Scab is PvP. Hold two relays to drop the Nexus shield.",
            "Kill the Leviathan, carry its core into the Nexus. End it."
        ]
    };

    CONFIG.TAU = TAU;

    CB.CONFIG = CONFIG;
})(window.CB = window.CB || {});
