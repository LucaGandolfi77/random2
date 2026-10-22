/*
 * GULPER - the bestiary.
 *
 * Four kinds of thing live in a level:
 *
 *   prey    - people. They eat, they walk, they see you, they scream.
 *   foes    - the response. They shoot, they club, they burn.
 *   rivals  - other xenomorphs. They hunt you and they hunt prey.
 *   bosses  - the thing at the end of the biome.
 *
 * Every prey type has a name and one line of biography. The biography is
 * shown for a moment when you swallow them, and that moment is the whole
 * reason the game is about people and not about targets.
 */
(function (S) {
    "use strict";

    /* Colour sets are plain hexes. The renderer snaps them to the biome
     * palette, so a civilian in the Arctic still looks like a civilian in
     * the Foundry, just colder. */
    function skin(tone, cloth, accent) {
        return { body: cloth, accent: accent, skin: tone };
    }

    S.Species = {
        /* ===== prey =====
         * `mass` is the number that matters. You cannot swallow anything
         * heavier than your gape, and your gape grows with you. */
        prey: {
            courier: {
                id: "courier", name: "Courier", mass: 1, hp: 10, speed: 122, sight: 175,
                role: "runner", r: 8, fight: 0,
                colors: skin("#e2b98d", "#3e8f8c", "#f2b23c"),
                bio: "Late for a shift change. Ran the whole way."
            },
            clerk: {
                id: "clerk", name: "Office Worker", mass: 1, hp: 12, speed: 96, sight: 150,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#e8c49c", "#545e8c", "#b6bfc9"),
                bio: "Forty-one emails. Two of them were about the emails."
            },
            punk: {
                id: "punk", name: "Punk", mass: 1, hp: 16, speed: 112, sight: 170,
                role: "civilian", r: 8, fight: 5,
                colors: skin("#e8c49c", "#b84394", "#f2b23c"),
                bio: "Told you the alley was a bad idea."
            },
            tourist: {
                id: "tourist", name: "Tourist", mass: 1, hp: 9, speed: 88, sight: 130,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#f0cda6", "#66b3a4", "#ffe9a8"),
                bio: "One photograph left on the camera. It was not of the pier."
            },
            researcher: {
                id: "researcher", name: "Researcher", mass: 1, hp: 11, speed: 100, sight: 185,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#e8bd92", "#e2e6ea", "#8a95a3"),
                bio: "Came down for the survey. Was not expecting you."
            },
            nightguard: {
                id: "nightguard", name: "Night Guard", mass: 2, hp: 26, speed: 84, sight: 200,
                role: "guard", r: 9, fight: 7,
                colors: skin("#d3a377", "#4d5866", "#b6bfc9"),
                bio: "Radioed in twice. Nobody answered the second time."
            },
            deacon: {
                id: "deacon", name: "Deacon", mass: 1, hp: 12, speed: 78, sight: 140,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#efc89e", "#3d3742", "#e2e6ea"),
                bio: "Was on his way to a service. Is still, in a way."
            },
            chef: {
                id: "chef", name: "Chef", mass: 2, hp: 24, speed: 92, sight: 165,
                role: "heavy", r: 9, fight: 4,
                colors: skin("#e6b784", "#e2e6ea", "#a33a32"),
                bio: "Left the pans on. Somebody will have to turn them off."
            },
            guide: {
                id: "guide", name: "Tour Guide", mass: 1, hp: 12, speed: 104, sight: 190,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#e8b98e", "#5e8f46", "#ffe9a8"),
                bio: "Had thirty-one people to bring home."
            },
            oldman: {
                id: "oldman", name: "Old Man", mass: 1, hp: 9, speed: 58, sight: 120,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#dcb693", "#8a95a3", "#e2e6ea"),
                bio: "Sat down to rest. Did not get up."
            },
            artist: {
                id: "artist", name: "Street Artist", mass: 1, hp: 11, speed: 100, sight: 175,
                role: "civilian", r: 8, fight: 0,
                colors: skin("#efc59c", "#d96fb2", "#ffe9a8"),
                bio: "The wall was almost finished."
            },
            clubber: {
                id: "clubber", name: "Clubber", mass: 1, hp: 14, speed: 118, sight: 165,
                role: "civilian", r: 8, fight: 6,
                colors: skin("#f2caa2", "#545e8c", "#7fe4ee"),
                bio: "Came out for one. Regretted the eighth."
            },
            runner: {
                id: "runner", name: "Runner", mass: 1, hp: 15, speed: 140, sight: 210,
                role: "runner", r: 8, fight: 3,
                colors: skin("#d9a377", "#b84394", "#ffe9a8"),
                bio: "Two laps of the park. Made it three."
            },
            officer: {
                id: "officer", name: "Officer", mass: 2, hp: 30, speed: 92, sight: 210,
                role: "guard", r: 9, fight: 9,
                colors: skin("#e0ae83", "#3f7fd6", "#b6bfc9"),
                bio: "Badge number 4471. It did not help."
            }
        },

        /* ===== the response =====
         * They arrive when the alarm climbs. They are not smarter than
         * you, but there are always more of them. */
        foes: {
            cop: {
                id: "cop", name: "Beat Cop", mass: 2, hp: 34, speed: 84, sight: 240, r: 9,
                role: "guard", colors: skin("#e0ae83", "#3f7fd6", "#b6bfc9"),
                damage: 5, range: 26, cooldown: 0.9, kind: "melee", threat: 1
            },
            swat: {
                id: "swat", name: "SWAT", mass: 3, hp: 62, speed: 88, sight: 280, r: 9,
                role: "soldier", colors: skin("#b8895f", "#22262c", "#4d5866"),
                damage: 6, range: 210, cooldown: 0.55, burst: 3, kind: "rifle", threat: 3
            },
            rifleman: {
                id: "rifleman", name: "Rifleman", mass: 2, hp: 44, speed: 82, sight: 320, r: 9,
                role: "soldier", colors: skin("#b08058", "#3b342a", "#8a95a3"),
                damage: 7, range: 250, cooldown: 1.2, kind: "rifle", keepAway: 200, threat: 2
            },
            heavy: {
                id: "heavy", name: "Armoured", mass: 5, hp: 150, speed: 56, sight: 220, r: 12,
                role: "heavy", colors: skin("#a87a52", "#343a42", "#667283"),
                damage: 13, range: 30, cooldown: 1.6, kind: "melee", armour: 6, threat: 5
            },
            drone: {
                id: "drone", name: "Drone", mass: 1, hp: 26, speed: 104, sight: 300, r: 8,
                role: "runner", flying: true, colors: skin("#8a95a3", "#3a434f", "#f2b23c"),
                damage: 4, range: 170, cooldown: 0.85, kind: "laser", threat: 2
            },
            turret: {
                id: "turret", name: "Turret", mass: 3, hp: 84, speed: 0, sight: 340, r: 10,
                role: "soldier", static: true, colors: skin("#667283", "#2b323c", "#e3975a"),
                damage: 7, range: 260, cooldown: 0.55, kind: "rifle", threat: 3
            },
            flame: {
                id: "flame", name: "Flame Unit", mass: 3, hp: 70, speed: 70, sight: 250, r: 10,
                role: "soldier", colors: skin("#a87a52", "#4a2016", "#f98a2c"),
                damage: 3, range: 110, cooldown: 1.0, kind: "flame", threat: 4
            },
            purifier: {
                id: "purifier", name: "PURIFIER", mass: 6, hp: 240, speed: 62, sight: 360, r: 13,
                role: "heavy", colors: skin("#c9b9a4", "#0e0d0f", "#f5d066"),
                damage: 9, range: 300, cooldown: 2.6, kind: "beam", drains: 14, threat: 9
            }
        },

        /* ===== rivals =====
         * Other xenomorphs. They are the only enemies that also grow. */
        rivals: {
            wraith: {
                id: "wraith", name: "Wraith", mass: 3, hp: 70, speed: 132, sight: 260, r: 11,
                mimic: true, colors: skin("#8a95a3", "#4d5866", "#e3975a"),
                damage: 12, range: 34, cooldown: 0.8, threat: 3
            },
            brooder: {
                id: "brooder", name: "Brooder", mass: 4, hp: 120, speed: 44, sight: 220, r: 14,
                colors: skin("#8fbf5c", "#3f6b38", "#b8d97a"),
                damage: 8, range: 120, cooldown: 1.6, kind: "spit", spawns: true, threat: 4
            },
            screamer: {
                id: "screamer", name: "Screamer", mass: 3, hp: 64, speed: 96, sight: 300, r: 12,
                colors: skin("#b84394", "#43103c", "#f0a3d4"),
                damage: 6, range: 200, cooldown: 1.4, kind: "spit", scream: true, threat: 4
            },
            champion: {
                id: "champion", name: "Champion", mass: 5, hp: 180, speed: 118, sight: 320, r: 13,
                colors: skin("#e3975a", "#43291a", "#ffe9a8"),
                damage: 17, range: 40, cooldown: 0.9, kind: "melee", threat: 6
            },
            smallling: {
                id: "smallling", name: "Smallling", mass: 1, hp: 18, speed: 156, sight: 200, r: 6,
                colors: skin("#8fbf5c", "#3f6b38", "#b8d97a"),
                damage: 5, range: 20, cooldown: 0.6, kind: "melee", threat: 1
            }
        },

        /* ===== bosses =====
         * One per biome. All of them follow the same rule: break their
         * will, then engulf them. Their mass is enormous, so a player who
         * has not grown simply cannot take them whole and has to cull
         * them instead. */
        bosses: {
            harbormaster: {
                id: "harbormaster", name: "The Harbormaster", mass: 5, hp: 420, speed: 74,
                sight: 340, r: 24, colors: skin("#6b3d21", "#43291a", "#f2b23c"),
                damage: 20, range: 46, cooldown: 1.2, kind: "melee", threat: 9,
                bio: "Something has been living under the pier since before the pier."
            },
            signal: {
                id: "signal", name: "The Signal", mass: 5, hp: 460, speed: 92,
                sight: 380, r: 22, colors: skin("#43103c", "#2a0a24", "#f0a3d4"),
                damage: 16, range: 240, cooldown: 0.7, kind: "rifle", burst: 6, summons: true, threat: 9,
                bio: "Broadcasting on a frequency that should not exist."
            },
            surgeonprime: {
                id: "surgeonprime", name: "Surgeon-Prime", mass: 6, hp: 520, speed: 66,
                sight: 340, r: 25, colors: skin("#e2e6ea", "#123326", "#4fa87a"),
                damage: 18, range: 260, cooldown: 1.0, kind: "laser", armour: 8, heals: true, threat: 10,
                bio: "The one who was supposed to be in charge of containment."
            },
            whitedew: {
                id: "whitedew", name: "The White Dew", mass: 6, hp: 500, speed: 88,
                sight: 340, r: 24, colors: skin("#e6edf3", "#7fe4ee", "#c2cdd8"),
                damage: 16, range: 40, cooldown: 0.9, kind: "melee", chill: true, threat: 9,
                bio: "The cold does not kill you here. It only slows you down."
            },
            smelter: {
                id: "smelter", name: "Smelter", mass: 6, hp: 620, speed: 58,
                sight: 320, r: 27, colors: skin("#e06519", "#481406", "#ffc94a"),
                damage: 22, range: 120, cooldown: 0.8, kind: "flame", armour: 10, threat: 10,
                bio: "The furnace has been fed for a hundred years. It has been fed."
            },
            matriarch: {
                id: "matriarch", name: "The Matriarch", mass: 7, hp: 660, speed: 96,
                sight: 380, r: 26, colors: skin("#b85708", "#3e2c11", "#f5d066"),
                damage: 20, range: 90, cooldown: 0.9, kind: "spit", summons: true, armour: 6, threat: 11,
                bio: "She has been waiting for something small and hungry to arrive."
            }
        }
    };

    /* Every prey type, as an array. Used by the level builder and by the
     * Codex, which needs the whole list even if you have never seen it. */
    S.Species.preyList = function () {
        var out = [];
        for (var k in S.Species.prey) out.push(S.Species.prey[k]);
        return out;
    };

    /* Look a species up across all four kinds. */
    S.Species.get = function (id) {
        return S.Species.prey[id] || S.Species.foes[id] ||
            S.Species.rivals[id] || S.Species.bosses[id] || null;
    };
})(window.GU = window.GU || {});
