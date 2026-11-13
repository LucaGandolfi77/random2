/*
 * LAST CALL — the drink roster.
 *
 * Every card is data. The simulation reads `s` (stats), the renderer reads
 * `art`, and the UI reads `role`, `desc` and `family`. Adding a drink means
 * adding an entry here — no new combat code.
 */
(function (LC) {
    "use strict";

    var CARDS = {};

    function card(def) {
        CARDS[def.id] = def;
        return def;
    }

    /* ---------- cocktails ---------- */

    card({
        id: "mojito", name: "Mojito Mob", family: "cocktails", rarity: "common",
        cost: 2, type: "troop", role: "Swarm",
        desc: "Three minty brawlers. Cheap, fast, and best sent in a pack.",
        flavor: "They muddle first. They ask questions never.",
        art: { shape: "highball", liquid: "#9be15d", accent: "#d8ff9a", glass: "#d8f3ff", garnish: "lime", face: "grin" },
        s: { count: 3, hp: 210, dmg: 45, hitSpeed: 1.0, range: 26, speed: 112, targets: "ground", radius: 14 }
    });

    card({
        id: "margarita", name: "Margarita Duelist", family: "cocktails", rarity: "rare",
        cost: 3, type: "troop", role: "Duelist",
        desc: "A quick melee duelist with a salted rim and a point to prove.",
        flavor: "Frozen? Never. She likes the sting.",
        art: { shape: "martini", liquid: "#f7e8a8", accent: "#c9f27a", glass: "#e8fbff", garnish: "lime", face: "determined" },
        s: { hp: 620, dmg: 95, hitSpeed: 0.9, range: 30, speed: 128, targets: "ground", radius: 18 }
    });

    card({
        id: "negroni", name: "Negroni Bruiser", family: "cocktails", rarity: "rare",
        cost: 4, type: "troop", role: "Bruiser",
        desc: "Bitter, strong and built like a rocks glass with a grudge.",
        flavor: "Equal parts gin, vermouth and violence.",
        art: { shape: "rocks", liquid: "#c63a2f", accent: "#ff8a5c", glass: "#f4d9d2", garnish: "orange", face: "stern" },
        s: { hp: 1150, dmg: 130, hitSpeed: 1.2, range: 32, speed: 82, targets: "ground", radius: 22 }
    });

    card({
        id: "espresso", name: "Espresso Martini", family: "cocktails", rarity: "epic",
        cost: 3, type: "troop", role: "Charger",
        desc: "Charges after a short run and lands a jolt for bonus damage.",
        flavor: "The hangover is somebody else's problem.",
        art: { shape: "martini", liquid: "#4a2a1d", accent: "#d9b08c", glass: "#d9d0c7", garnish: "coffee", face: "wild" },
        s: { hp: 560, dmg: 100, hitSpeed: 0.95, range: 30, speed: 105, targets: "ground", radius: 18, chargeBonus: 170, chargeTime: 1.2 }
    });

    card({
        id: "pina", name: "Piña Colada", family: "cocktails", rarity: "rare",
        cost: 5, type: "troop", role: "Splash range",
        desc: "Lobs creamy splashes that damage everything in a small area.",
        flavor: "If you like getting caught in the rain, stay behind the tank.",
        art: { shape: "hurricane", liquid: "#ffe08a", accent: "#fff3c4", glass: "#e9fbff", garnish: "parasol", face: "sleepy" },
        s: { hp: 900, dmg: 105, hitSpeed: 1.3, range: 300, speed: 65, targets: "both", radius: 24, projectileSpeed: 480, splash: 82 }
    });

    card({
        id: "parasol", name: "Parasol Drifter", family: "cocktails", rarity: "rare",
        cost: 3, type: "troop", role: "Air",
        desc: "A floating cocktail umbrella that rains tiny lime bombs.",
        flavor: "Technically garnish. Practically artillery.",
        art: { shape: "parasol", liquid: "#ff9ec7", accent: "#9ef0ff", glass: "#ffe8f3", garnish: "lime", face: "happy" },
        s: { hp: 380, dmg: 65, hitSpeed: 1.1, range: 250, speed: 92, targets: "ground", radius: 18, flying: true, projectileSpeed: 520 }
    });

    /* ---------- wine ---------- */

    card({
        id: "prosecco", name: "Prosecco Trio", family: "wine", rarity: "common",
        cost: 3, type: "troop", role: "Swarm",
        desc: "Three fizzy flutes that pop if you leave them alone too long.",
        flavor: "Every cork is a small celebration.",
        art: { shape: "flute", liquid: "#f7e6a0", accent: "#fff6c9", glass: "#e8fbff", garnish: "bubbles", face: "grin" },
        s: { count: 3, hp: 230, dmg: 50, hitSpeed: 0.9, range: 26, speed: 126, targets: "ground", radius: 15 }
    });

    card({
        id: "chianti", name: "Chianti Slinger", family: "wine", rarity: "rare",
        cost: 4, type: "troop", role: "Ranged",
        desc: "A long-range wine glass with a good arm and a bad attitude.",
        flavor: "Pairs well with anything at 300 paces.",
        art: { shape: "wine", liquid: "#7b1f2b", accent: "#d94b5c", glass: "#f0d8dc", garnish: "grape", face: "calm" },
        s: { hp: 680, dmg: 140, hitSpeed: 1.2, range: 330, speed: 78, targets: "ground", radius: 20, projectileSpeed: 600 }
    });

    card({
        id: "barolo", name: "Barolo Bulwark", family: "wine", rarity: "epic",
        cost: 6, type: "troop", role: "Tank",
        desc: "A full bottle. Slow, heavy, and extremely difficult to finish.",
        flavor: "Aged in oak. Armoured in glass.",
        art: { shape: "bottle", liquid: "#3a0d16", accent: "#b27a3a", glass: "#6f4630", garnish: "cork", face: "stern" },
        s: { hp: 2600, dmg: 190, hitSpeed: 1.5, range: 34, speed: 58, targets: "ground", radius: 26 }
    });

    card({
        id: "rose", name: "Rosé Sommelier", family: "wine", rarity: "epic",
        cost: 4, type: "troop", role: "Support",
        desc: "Shoots petals and heals nearby allies every couple of seconds.",
        flavor: "A little pink, a lot of patience.",
        art: { shape: "wine", liquid: "#ff9db5", accent: "#ffd6e0", glass: "#ffeef4", garnish: "petal", face: "kind" },
        s: { hp: 760, dmg: 65, hitSpeed: 1.25, range: 290, speed: 74, targets: "both", radius: 20, projectileSpeed: 500, heal: 60, healRadius: 180, healInterval: 1.6 }
    });

    card({
        id: "champagne", name: "Champagne Cork", family: "wine", rarity: "rare",
        cost: 3, type: "troop", role: "Air splash",
        desc: "A flying cork that pops over crowds for splash damage.",
        flavor: "The loudest thing in the room, every time.",
        art: { shape: "champagne", liquid: "#f4d78b", accent: "#fff1bd", glass: "#dfc78f", garnish: "cork", face: "wild" },
        s: { hp: 340, dmg: 115, hitSpeed: 1.4, range: 320, speed: 95, targets: "ground", radius: 18, flying: true, projectileSpeed: 700, splash: 65 }
    });

    card({
        id: "port", name: "Port Authority", family: "wine", rarity: "rare",
        cost: 5, type: "building", role: "Defence",
        desc: "A fortified port barrel that shells anything crossing its lane.",
        flavor: "Dock safely. Or don't dock at all.",
        art: { shape: "barrel", liquid: "#5a1b1b", accent: "#c9975a", glass: "#8f6135", garnish: "cork", face: "stern" },
        s: { hp: 1350, dmg: 105, hitSpeed: 0.9, range: 340, targets: "both", radius: 30, lifetime: 35, projectileSpeed: 600 }
    });

    /* ---------- beer ---------- */

    card({
        id: "lager", name: "Lager Lad", family: "beer", rarity: "common",
        cost: 1, type: "troop", role: "Cycle",
        desc: "A one-buzz body that cycles your deck and distracts a tower.",
        flavor: "Not here to win. Here to be somewhere.",
        art: { shape: "pint", liquid: "#f2b632", accent: "#fff1bd", glass: "#e5f8ff", garnish: "foam", face: "goofy" },
        s: { hp: 240, dmg: 45, hitSpeed: 1.0, range: 26, speed: 118, targets: "ground", radius: 15 }
    });

    card({
        id: "ipa", name: "IPA Marksman", family: "beer", rarity: "rare",
        cost: 4, type: "troop", role: "Ranged",
        desc: "A bitter pint with a long hop and a longer range.",
        flavor: "Notes of grapefruit, pine, and poor decisions.",
        art: { shape: "pint", liquid: "#d98c1f", accent: "#ffd28a", glass: "#f8e8c9", garnish: "foam", face: "calm" },
        s: { hp: 600, dmg: 150, hitSpeed: 1.3, range: 360, speed: 68, targets: "ground", radius: 19, projectileSpeed: 650 }
    });

    card({
        id: "stout", name: "Stout Golem", family: "beer", rarity: "epic",
        cost: 6, type: "troop", role: "Tank",
        desc: "A wall of dark beer. Absorbs towers while the rest of your deck works.",
        flavor: "A meal in a glass. Unfortunately, the glass has fists.",
        art: { shape: "pint", liquid: "#2a160f", accent: "#d9c7a3", glass: "#8c6a52", garnish: "foam", face: "stern" },
        s: { hp: 2900, dmg: 205, hitSpeed: 1.6, range: 36, speed: 52, targets: "ground", radius: 27 }
    });

    card({
        id: "barrel", name: "Barrel Roller", family: "beer", rarity: "rare",
        cost: 4, type: "troop", role: "Building hunter",
        desc: "Ignores drinks and rolls straight for the nearest tower or building.",
        flavor: "No brakes. No refunds. No idea where it's going.",
        art: { shape: "barrel", liquid: "#7a4a1f", accent: "#e0b46a", glass: "#a8773d", garnish: "foam", face: "wild" },
        s: { hp: 950, dmg: 220, hitSpeed: 1.4, range: 32, speed: 112, targets: "ground", radius: 22, onlyBuildings: true }
    });

    card({
        id: "sour", name: "Sour Splash", family: "beer", rarity: "rare",
        cost: 3, type: "spell", role: "Spell · slow",
        desc: "Soaks a area for damage and slows everything caught in it.",
        flavor: "The face you make is part of the damage.",
        art: { shape: "splash", liquid: "#d5e85a", accent: "#f4ff9a", glass: "#eaffd0", garnish: "bubbles", face: "none" },
        s: { damage: 250, radius: 155, slow: 0.45, slowDuration: 3.0 }
    });

    card({
        id: "icebucket", name: "Ice Bucket", family: "beer", rarity: "rare",
        cost: 3, type: "building", role: "Control",
        desc: "A chilling aura that slows every enemy in range. No damage, all nuisance.",
        flavor: "The ice is free. The therapy is not.",
        art: { shape: "bucket", liquid: "#bdefff", accent: "#e9fcff", glass: "#9fdcea", garnish: "ice", face: "calm" },
        s: { hp: 750, lifetime: 22, radius: 28, auraRadius: 210, auraSlow: 0.55 }
    });

    /* ---------- spirits & softs ---------- */

    card({
        id: "gin", name: "Gin & Tonic", family: "spirits", rarity: "rare",
        cost: 4, type: "troop", role: "Marksman",
        desc: "A cool-headed marksman that hits ground and air at range.",
        flavor: "Cucumber optional. Precision mandatory.",
        art: { shape: "copa", liquid: "#cfe9ff", accent: "#b6ffcf", glass: "#e9fbff", garnish: "lime", face: "calm" },
        s: { hp: 640, dmg: 145, hitSpeed: 1.1, range: 340, speed: 74, targets: "both", radius: 19, projectileSpeed: 620 }
    });

    card({
        id: "whiskey", name: "Whiskey Neat", family: "spirits", rarity: "epic",
        cost: 5, type: "troop", role: "Heavy",
        desc: "A short glass with a long memory. Hits hard and takes a beating.",
        flavor: "No ice. No mixer. No mercy.",
        art: { shape: "rocks", liquid: "#a85a1e", accent: "#e0a45c", glass: "#dcc09c", garnish: "orange", face: "stern" },
        s: { hp: 1500, dmg: 260, hitSpeed: 1.4, range: 32, speed: 72, targets: "ground", radius: 23 }
    });

    card({
        id: "vodka", name: "Vodka Shot", family: "spirits", rarity: "common",
        cost: 2, type: "troop", role: "Assassin",
        desc: "Very fast, very fragile, very good at finishing a damaged tower.",
        flavor: "Clear. Cold. Already gone.",
        art: { shape: "shot", liquid: "#e8f7ff", accent: "#9dd6ff", glass: "#f2fdff", garnish: "ice", face: "wild" },
        s: { hp: 300, dmg: 115, hitSpeed: 0.7, range: 24, speed: 168, targets: "ground", radius: 14 }
    });

    card({
        id: "rum", name: "Rum Barrel", family: "spirits", rarity: "rare",
        cost: 5, type: "building", role: "Spawner",
        desc: "A barrel that keeps producing Rum Runners until someone breaks it.",
        flavor: "The supply line is a pirate tradition.",
        art: { shape: "barrel", liquid: "#6b3418", accent: "#d9a15c", glass: "#8f5b2e", garnish: "cork", face: "goofy" },
        s: { hp: 1100, lifetime: 40, radius: 30, spawnId: "rum_runner", spawnInterval: 4.2 }
    });

    card({
        id: "tequila", name: "Tequila Sunrise", family: "spirits", rarity: "epic",
        cost: 4, type: "spell", role: "Spell · burn",
        desc: "A big sunrise that scorches a wide area and leaves it burning.",
        flavor: "The worm was the least of your problems.",
        art: { shape: "sunrise", liquid: "#ff7a3d", accent: "#ffd166", glass: "#ffe1b8", garnish: "orange", face: "none" },
        s: { damage: 400, radius: 170, burnDps: 20, burnDuration: 3.0 }
    });

    card({
        id: "sparkling", name: "Sparkling Water", family: "spirits", rarity: "common",
        cost: 1, type: "spell", role: "Spell · cycle",
        desc: "A cheap fizz that nudges enemies apart and slows them briefly.",
        flavor: "Designated driver energy.",
        art: { shape: "bottle", liquid: "#bfe9ff", accent: "#effcff", glass: "#d5f4ff", garnish: "bubbles", face: "none" },
        s: { damage: 40, radius: 115, knockback: 85, slow: 0.7, slowDuration: 1.5 }
    });

    /* ---------- token ---------- */

    card({
        id: "rum_runner", name: "Rum Runner", family: "spirits", rarity: "common",
        cost: 0, type: "troop", role: "Token", hidden: true,
        desc: "A small pirate produced by the Rum Barrel.",
        flavor: "Tiny hat. Large plans.",
        art: { shape: "shot", liquid: "#b06a2a", accent: "#f0c27b", glass: "#e0c39b", garnish: "cork", face: "goofy" },
        s: { hp: 300, dmg: 55, hitSpeed: 1.0, range: 26, speed: 112, targets: "ground", radius: 15 }
    });

    var CARD_LIST = Object.keys(CARDS).filter(function (id) { return !CARDS[id].hidden; });
    CARD_LIST.forEach(function (id) {
        CARDS[id].id = id;
    });

    LC.CARDS = CARDS;
    LC.CARD_LIST = CARD_LIST;

    LC.cardById = function (id) {
        return CARDS[id] || null;
    };

    LC.deckCost = function (deck) {
        if (!deck || !deck.length) return 0;
        var total = 0;
        deck.forEach(function (id) {
            var c = CARDS[id];
            if (c) total += c.cost;
        });
        return total / deck.length;
    };

    LC.cardStatsAtLevel = function (id, level) {
        var c = CARDS[id];
        if (!c || !c.s) return null;
        var m = LC.levelMultiplier(level);
        var out = {};
        Object.keys(c.s).forEach(function (k) { out[k] = c.s[k]; });
        ["hp", "dmg", "heal", "damage", "burnDps"].forEach(function (k) {
            if (typeof out[k] === "number") out[k] = Math.round(out[k] * m);
        });
        return out;
    };

    LC.isSpell = function (id) {
        return CARDS[id] && CARDS[id].type === "spell";
    };
})(window.LC = window.LC || {});