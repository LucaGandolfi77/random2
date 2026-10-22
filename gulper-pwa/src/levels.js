/*
 * GULPER - the campaign.
 *
 * Forty-two levels: six biomes, six missions and one titan each. Every
 * entry is a complete level identity - what it Feels like, what the
 * objective asks, how many people are in it and how hard the response
 * bites. The world builder turns one of these rows into a place.
 *
 * Field notes for whoever edits this next:
 *   prey      how many people the place holds (never 0: a street has people)
 *   foes      how many of the response start on the map. 0 means none - the
 *             early levels use that so the player can learn the swallow
 *   rivals    other things that hunt. They grow hungry like you do
 *   noise     how strongly this level amplifies the alarm. A quiet ward is
 *             not the same as a loud arcade
 *   density   prop density. Crates and containers are cover and you need cover
 *   seed      a positive integer. Same seed, same street, forever
 *   starX     the three-star thresholds: time, alarm peak, mass gained
 */
(function (S) {
    "use strict";

    var BIOME_INFO = {
        docks: {
            name: "Rust Docks", brief: "Rust, rain and prying gulls. The city's soft edge.",
            foeHpMult: 1.0
        },
        downtown: {
            name: "Neon Downtown", brief: "Neon, noise and crowds, and no silence left to steal.",
            foeHpMult: 1.12
        },
        ward: {
            name: "Quarantine Ward", brief: "Fog tape, gurneys and doors sealed from the outside.",
            foeHpMult: 1.25
        },
        arctic: {
            name: "Arctic Rig", brief: "Ice, white dew and a dark that holds still for nobody.",
            foeHpMult: 1.4
        },
        foundry: {
            name: "Foundry", brief: "Molten iron, hammer light and heat that tells everyone where you are.",
            foeHpMult: 1.55
        },
        hive: {
            name: "Orbital Hive", brief: "Resin, hymn and a deep place that has gone on without the city.",
            foeHpMult: 1.7
        },
        cathedral: {
            name: "Sunken Cathedral", brief: "Stone, silence and a light that never went out.",
            foeHpMult: 1.85
        }
    };

    var list = [];
    var seedCounter = 9200;

    function mission(biome, n, type, name, brief, obj, tbl) {
        /* The counter advances once per level no matter what, so that a
         * reroll at one level never reshuffles the seeds of the ones
         * after it. */
        seedCounter += 1;
        list.push({
            id: biome + "-" + n,
            biome: biome,
            index: n,
            name: name,
            brief: brief,
            objective: {
                type: type,
                label: obj.label,
                count: obj.count || 1,
                time: obj.time,
                maxAlarm: obj.maxAlarm
            },
            prey: tbl.prey,
            foes: tbl.foes,
            rivals: tbl.rivals || 0,
            /* The rivals this street wants, when it wants particular
             * ones. Unset means whoever lives in the district. */
            rivalKinds: tbl.rivalKinds,
            noise: tbl.noise !== undefined ? tbl.noise : 1.0,
            density: tbl.density !== undefined ? tbl.density : 1.0,
            /* A level may pin its own seed (a layout that proved itself
             * worth keeping); otherwise the campaign deals them in order. */
            seed: tbl.seed !== undefined ? tbl.seed : seedCounter,
            foeHpMult: BIOME_INFO[biome].foeHpMult,
            starTime: tbl.starTime,
            starAlarm: tbl.starAlarm,
            starMass: tbl.starMass
        });
    }

    function titan(biome, bossId, name, brief, tbl) {
        seedCounter += 1;
        list.push({
            id: biome + "-boss",
            biome: biome,
            index: 7,
            name: name,
            brief: brief,
            boss: true,
            bossId: bossId,
            objective: {
                type: "slay",
                label: "SLAY THE TITAN",
                count: 1,
                time: tbl.time
            },
            prey: tbl.prey,
            foes: tbl.foes,
            rivals: 0,
            noise: tbl.noise !== undefined ? tbl.noise : 1.0,
            density: tbl.density !== undefined ? tbl.density : 1.0,
            seed: tbl.seed !== undefined ? tbl.seed : seedCounter,
            foeHpMult: BIOME_INFO[biome].foeHpMult,
            starTime: tbl.starTime,
            starAlarm: tbl.starAlarm || 100,
            starMass: tbl.starMass || 30
        });
    }

    /* ================= RUST DOCKS ================= */
    mission("docks", 1, "swarm", "Gull Street",
        "The tally clerks walk home at dusk. Walk them a different way.",
        { label: "HERD THE STREETS", count: 4, time: 150 },
        { prey: 9, foes: 0, noise: 0.9, density: 1.0, starTime: 105, starAlarm: 40, starMass: 11 });
    mission("docks", 2, "stealth", "Crane Weather",
        "Foghorns twice a night. Move between the horns, and never the lights.",
        { label: "MOVE UNSEEN", count: 4, time: 160, maxAlarm: 90 },
        { prey: 8, foes: 0, noise: 0.9, density: 1.05, starTime: 118, starAlarm: 55, starMass: 11 });
    mission("docks", 3, "cull", "The Impound",
        "Contract guards walk the yard after the strike. They are between paydays.",
        { label: "CULL THE MARKED", count: 5, time: 200 },
        { prey: 10, foes: 2, noise: 1.0, density: 1.05, starTime: 150, starAlarm: 70, starMass: 14 });
    mission("docks", 4, "elite", "Manifest Tour",
        "A harbour officer walks the pier with a flashlight and a list to fill.",
        { label: "TAKE THE MARKED", count: 2, time: 220 },
        { prey: 8, foes: 1, noise: 1.0, density: 1.0, starTime: 165, starAlarm: 80, starMass: 13 });
    mission("docks", 5, "snatch", "The Night Form",
        "One clerk signs every berth in and out. Take the signature with the clerk.",
        { label: "SNATCH AND DELIVER", count: 1, time: 240 },
        { prey: 9, foes: 2, noise: 1.0, density: 1.05, starTime: 185, starAlarm: 80, starMass: 10 });
    mission("docks", 6, "survive", "Curfew Count",
        "Sirens every eleven minutes tonight. Be gone from the yard by the twelfth.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 140 },
        { prey: 9, foes: 2, noise: 1.0, density: 1.0, starTime: 142, starAlarm: 88, starMass: 11 });
    titan("docks", "harbormaster", "Pier Nine",
        "The Harbormaster has been counting you for weeks. Show him what counting buys.",
        { prey: 6, foes: 2, time: 220, starTime: 182, starMass: 26 });

    /* ================= NEON DOWNTOWN ================= */
    mission("downtown", 1, "swarm", "Bubble Tea Row",
        "Closing time on the sweet street. The awnings go down and the crowd goes up.",
        { label: "HERD THE STREETS", count: 5, time: 170 },
        { prey: 11, foes: 0, noise: 1.0, density: 1.0, starTime: 125, starAlarm: 45, starMass: 14 });
    mission("downtown", 2, "stealth", "Ticket Line",
        "The queue for the good show is a queue of the unguarded. Unwatched.",
        { label: "MOVE UNSEEN", count: 5, time: 190, maxAlarm: 92 },
        { prey: 10, foes: 1, noise: 1.0, density: 1.05, starTime: 145, starAlarm: 60, starMass: 14 });
    mission("downtown", 3, "cull", "The Arcade Sweep",
        "Security sweeps the arcades tonight after a shooting rumour. Be the rumour.",
        { label: "CULL THE MARKED", count: 6, time: 240 },
        { prey: 12, foes: 3, noise: 1.0, density: 1.05, starTime: 185, starAlarm: 85, starMass: 18 });
    mission("downtown", 4, "elite", "Static Vein",
        "The marked fidget inside the camera's field. Take them anyway.",
        { label: "TAKE THE MARKED", count: 3, time: 260 },
        { prey: 11, foes: 2, noise: 1.0, density: 1.0, starTime: 200, starAlarm: 88, starMass: 20 });
    mission("downtown", 5, "snatch", "Bid War",
        "One courier carries tonight's highest bid. Everybody wants to meet her.",
        { label: "SNATCH AND DELIVER", count: 1, time: 260 },
        { prey: 12, foes: 3, noise: 1.0, density: 1.05, starTime: 200, starAlarm: 85, starMass: 11 });
    mission("downtown", 6, "survive", "Vermillion Hour",
        "The block goes loud and dark at vermillion hour. Outlast the whole hour.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 150 },
        { prey: 12, foes: 3, noise: 1.0, density: 1.0, starTime: 152, starAlarm: 90, starMass: 13 });
    titan("downtown", "signal", "Antenna Field",
        "The Signal has your voice recorded. Silence the tower that carries it.",
        { prey: 8, foes: 3, time: 240, starTime: 195, starMass: 28 });

    /* ================= QUARANTINE WARD ================= */
    mission("ward", 1, "stealth", "Fog Tape",
        "They taped the doors shut again. Unstick the silence between the rounds.",
        { label: "MOVE UNSEEN", count: 5, time: 195, maxAlarm: 92 },
        { prey: 10, foes: 1, noise: 0.95, density: 1.0, starTime: 148, starAlarm: 62, starMass: 14 });
    mission("ward", 2, "snatch", "The Counting Room",
        "One records clerk files every case the ward would rather forget. Retrieve her.",
        { label: "SNATCH AND DELIVER", count: 1, time: 265 },
        { prey: 11, foes: 3, noise: 0.95, density: 1.0, starTime: 205, starAlarm: 85, starMass: 11 });
    mission("ward", 3, "swarm", "Triage Hour",
        "Gurneys line the corridor and the orderlies are busy. Feed on the queue.",
        { label: "HERD THE STREETS", count: 6, time: 210 },
        { prey: 13, foes: 2, rivals: 1, rivalKinds: ["stalker"], noise: 0.95, density: 1.05, starTime: 158, starAlarm: 70, starMass: 17 });
    mission("ward", 4, "elite", "The Sealed Wing",
        "Ward marshals carry the sealing list. Three of them carry it badly.",
        { label: "TAKE THE MARKED", count: 3, time: 270 },
        { prey: 12, foes: 3, noise: 0.95, density: 1.0, starTime: 210, starAlarm: 85, starMass: 20 });
    mission("ward", 5, "survive", "Night Round",
        "Sirens at the gate and lights on the ward. Outlast the count in the dark.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 160 },
        { prey: 12, foes: 3, noise: 1.0, density: 1.0, starTime: 162, starAlarm: 92, starMass: 13 });
    mission("ward", 6, "cull", "The Recovery List",
        "Night shift guards are bored and loud, and the list is out of date.",
        { label: "CULL THE MARKED", count: 6, time: 265 },
        { prey: 12, foes: 4, noise: 1.0, density: 1.05, starTime: 205, starAlarm: 90, starMass: 18 });
    titan("ward", "surgeonprime", "Theatre Two",
        "Surgeon-Prime whitens everything he touches. Refuse the table.",
        { prey: 8, foes: 3, time: 260, starTime: 210, starMass: 30 });

    /* ================= ARCTIC RIG ================= */
    mission("arctic", 1, "survive", "Doghouse Rotation",
        "The rig stands down for drills while the diesel runs short. Stand up tonight.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 170 },
        { prey: 12, foes: 3, noise: 1.0, density: 1.0, starTime: 172, starAlarm: 92, starMass: 13 });
    mission("arctic", 2, "swarm", "Waypoint Mess",
        "Catering cooks rest between barge runs. Peel the kitchen off the manifest.",
        { label: "HERD THE STREETS", count: 6, time: 225 },
        { prey: 13, foes: 2, rivals: 1, rivalKinds: ["stalker"], noise: 1.0, density: 1.05, starTime: 170, starAlarm: 78, starMass: 17 });
    mission("arctic", 3, "cull", "Core Sample",
        "Sample crews drill through your hunting run tonight. Retire the drill.",
        { label: "CULL THE MARKED", count: 7, time: 280 },
        { prey: 14, foes: 4, noise: 1.0, density: 1.05, starTime: 215, starAlarm: 90, starMass: 21 });
    mission("arctic", 4, "stealth", "Whiteout Protocol",
        "The blow drifts hide you both. Fade them before they can count you.",
        { label: "MOVE UNSEEN", count: 6, time: 235, maxAlarm: 95 },
        { prey: 12, foes: 2, rivals: 1, noise: 0.95, density: 1.0, starTime: 180, starAlarm: 70, starMass: 17 });
    mission("arctic", 5, "elite", "Dew Marshals",
        "The white dew's marshals wear it like breath. Take the breath.",
        { label: "TAKE THE MARKED", count: 4, time: 300 },
        { prey: 13, foes: 3, noise: 1.0, density: 1.0, starTime: 235, starAlarm: 90, starMass: 26 });
    mission("arctic", 6, "snatch", "The Ballast Ledger",
        "A radio operator memorised your whole route north. Bring her in singing.",
        { label: "SNATCH AND DELIVER", count: 1, time: 285 },
        { prey: 13, foes: 4, noise: 1.0, density: 1.05, seed: 43617, starTime: 220, starAlarm: 90, starMass: 11 });
    titan("arctic", "whitedew", "Calving Shelf",
        "The White Dew kept people still, and patient. Patiently take them back.",
        { prey: 8, foes: 3, time: 280, starTime: 225, starMass: 31 });

    /* ================= FOUNDRY ================= */
    mission("foundry", 1, "cull", "Hammer Choir",
        "The strikers call each other by hammer-count. Interrupt the song.",
        { label: "CULL THE MARKED", count: 7, time: 285 },
        { prey: 14, foes: 4, noise: 1.0, density: 1.05, starTime: 220, starAlarm: 92, starMass: 21 });
    mission("foundry", 2, "swarm", "Pour Line Lunch",
        "Two hundred hands at half-hour lunch. Accept graciously.",
        { label: "HERD THE STREETS", count: 7, time: 240 },
        { prey: 14, foes: 3, rivals: 1, rivalKinds: ["stalker"], noise: 1.05, density: 1.05, starTime: 185, starAlarm: 85, starMass: 20 });
    mission("foundry", 3, "survive", "Crucible Watch",
        "The melt pours tonight and guards stand thick along the trough. Be thicker.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 175 },
        { prey: 13, foes: 4, noise: 1.05, density: 1.0, starTime: 177, starAlarm: 95, starMass: 14 });
    mission("foundry", 4, "snatch", "The Mold Ledger",
        "A forge clerk sold your finish to a buyer across the water. End her paperwork.",
        { label: "SNATCH AND DELIVER", count: 1, time: 300 },
        { prey: 14, foes: 4, noise: 1.05, density: 1.05, starTime: 230, starAlarm: 95, starMass: 11 });
    mission("foundry", 5, "elite", "Company Armour",
        "Private armour is out on loan tonight. Loan it, then swallow it.",
        { label: "TAKE THE MARKED", count: 4, time: 320 },
        { prey: 14, foes: 4, noise: 1.05, density: 1.0, starTime: 250, starAlarm: 95, starMass: 26 });
    mission("foundry", 6, "stealth", "Bellows Down",
        "Shutdown hour. Bellows off, ears on — do not raise the floor.",
        { label: "MOVE UNSEEN", count: 6, time: 265, maxAlarm: 95 },
        { prey: 13, foes: 3, noise: 0.95, density: 1.0, starTime: 200, starAlarm: 78, starMass: 17 });
    titan("foundry", "smelter", "The Melt",
        "The Smelter has been fed for a hundred years, and it has been fed.",
        { prey: 8, foes: 3, time: 300, starTime: 240, starMass: 31 });

    /* ================= ORBITAL HIVE ================= */
    mission("hive", 1, "swarm", "Communion Line",
        "The brood-tenders queue to the umbilical in their hundreds. Commune instead.",
        { label: "HERD THE STREETS", count: 7, time: 250 },
        { prey: 15, foes: 2, rivals: 1, rivalKinds: ["stalker"], noise: 1.0, density: 1.05, starTime: 190, starAlarm: 85, starMass: 20 });
    mission("hive", 2, "elite", "The Hymn",
        "Four of the Mother's hands walk the aisle tonight. Claim the choir first.",
        { label: "TAKE THE MARKED", count: 4, time: 320 },
        { prey: 14, foes: 3, rivals: 1, noise: 1.05, density: 1.0, starTime: 250, starAlarm: 95, starMass: 26 });
    mission("hive", 3, "snatch", "The Recording",
        "One voice writes your entries into the hymn every night. Rewrite the hymn.",
        { label: "SNATCH AND DELIVER", count: 1, time: 300 },
        { prey: 14, foes: 4, noise: 1.05, density: 1.0, starTime: 230, starAlarm: 95, starMass: 11 });
    mission("hive", 4, "cull", "Valve Teeth",
        "Ballast keepers turn locks the size of ribs tonight. Eat the locks.",
        { label: "CULL THE MARKED", count: 8, time: 320 },
        { prey: 15, foes: 4, noise: 1.05, density: 1.05, starTime: 245, starAlarm: 95, starMass: 24 });
    mission("hive", 5, "survive", "Umbilical Standoff",
        "The hive seals its tallest throat with you inside. Outlive the seal.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 185 },
        { prey: 14, foes: 4, noise: 1.05, density: 1.0, starTime: 187, starAlarm: 95, starMass: 14 });
    mission("hive", 6, "stealth", "Low Choir",
        "The hymn is hushed for the paternity checks. Check them first.",
        { label: "MOVE UNSEEN", count: 7, time: 280, maxAlarm: 98 },
        { prey: 13, foes: 3, noise: 0.95, density: 1.0, starTime: 215, starAlarm: 82, starMass: 20 });
    titan("hive", "matriarch", "Mothership",
        "The Matriarch counted your kind among her own. Correct the hymn.",
        { prey: 8, foes: 3, time: 320, starTime: 255, starMass: 33 });

    /* ================= SUNKEN CATHEDRAL ================= */
    mission("cathedral", 1, "swarm", "Nave of Echoes",
        "The choir still sings. Take the voices, one at a time.",
        { label: "HERD THE NAVE", count: 7, time: 180 },
        { prey: 10, foes: 2, noise: 0.95, density: 1.0, starTime: 135, starAlarm: 60, starMass: 24 });
    mission("cathedral", 2, "stealth", "Cloister Walk",
        "The candles do not flicker for you. Walk where the light is not.",
        { label: "MOVE UNSEEN", count: 6, time: 200, maxAlarm: 85 },
        { prey: 9, foes: 1, noise: 0.9, density: 0.95, starTime: 150, starAlarm: 60, starMass: 26 });
    mission("cathedral", 3, "cull", "The Reliquary",
        "The reliquaries hold the marked. Take only the marked.",
        { label: "CULL THE MARKED", count: 6, time: 220 },
        { prey: 11, foes: 2, noise: 1.0, density: 1.0, starTime: 165, starAlarm: 75, starMass: 28 });
    mission("cathedral", 4, "elite", "The High Altar",
        "A prelate walks the altar with a censer and a list. Take the list.",
        { label: "TAKE THE MARKED", count: 3, time: 240 },
        { prey: 9, foes: 2, noise: 1.0, density: 1.0, starTime: 180, starAlarm: 80, starMass: 26 });
    mission("cathedral", 5, "snatch", "The Bell Tower",
        "The bell ringer signs every hour. Take the signature with the ringer.",
        { label: "SNATCH AND DELIVER", count: 1, time: 280 },
        { prey: 10, foes: 2, noise: 1.0, density: 1.0, starTime: 195, starAlarm: 85, starMass: 24 });
    mission("cathedral", 6, "survive", "The Long Vigil",
        "The candles burn for an hour. Be there when they go out.",
        { label: "OUTLAST THE RESPONSE", count: 1, time: 160 },
        { prey: 10, foes: 3, noise: 1.0, density: 1.0, starTime: 162, starAlarm: 90, starMass: 28 });
    titan("cathedral", "choirmaster", "The Choir",
        "The Choir has sung for a thousand years. Silence it.",
        { prey: 7, foes: 3, time: 260, starTime: 200, starMass: 36 });

    /* ================= the API ================= */

    S.Levels = {
        list: list,

        /* id -> level, for callers that already know what they want. */
        byId: (function () {
            var m = {};
            for (var i = 0; i < list.length; i++) m[list[i].id] = list[i];
            return m;
        })(),

        total: function () {
            return list.length;
        },

        get: function (id) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) return list[i];
            }
            return null;
        },

        /* The level after this one, or null at the end of the campaign.
         * The map and the results screen both chain on this. */
        next: function (id) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    return (i + 1 < list.length) ? list[i + 1] : null;
                }
            }
            return null;
        },

        /* First level without a cleared record, in campaign order. */
        firstUncleared: function () {
            for (var i = 0; i < list.length; i++) {
                var rec = S.Storage.levelRecord(list[i].id);
                if (!rec || !rec.cleared) return list[i].id;
            }
            return list[0].id;
        },

        /* Unlocked if it is the first level, or the previous one is
         * cleared. Nothing else. Progress is progress, not points. */
        isUnlocked: function (id) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    if (i === 0) return true;
                    var rec = S.Storage.levelRecord(list[i - 1].id);
                    return !!(rec && rec.cleared);
                }
            }
            return false;
        },

        /* The campaign as the map shows it: one row per biome, seven
         * level ids, boss last. */
        campaign: function () {
            var order = ["docks", "downtown", "ward", "arctic", "foundry", "hive", "cathedral"];
            var out = [];
            for (var b = 0; b < order.length; b++) {
                var id = order[b];
                var levels = [];
                for (var i = 0; i < list.length; i++) {
                    if (list[i].biome === id) levels.push(list[i].id);
                }
                out.push({
                    id: id,
                    name: BIOME_INFO[id].name,
                    brief: BIOME_INFO[id].brief,
                    levels: levels,
                    boss: id + "-boss"
                });
            }
            return out;
        },

        biomeInfo: function (id) {
            return BIOME_INFO[id] || BIOME_INFO.docks;
        }
    };
})(window.GU = window.GU || {});
