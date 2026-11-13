/*
 * LAST CALL — tuning constants and the bar tour.
 *
 * Everything that decides how the game feels lives here: the board, the buzz
 * economy, the eight venues, and the reward curve. The simulation reads this
 * file; the renderer reads the board numbers; the UI reads the venues.
 */
(function (LC) {
    "use strict";

    var CONFIG = {
        VERSION: 1,
        SLUG: "last-call-pwa/",

        /* Logical arena. The canvas is 9:16 and all simulation units are in
         * these pixels, so a card's range means the same thing on every screen. */
        W: 900,
        H: 1600,
        MARGIN: 34,
        RIVER: { top: 760, bottom: 840, y: 800 },
        BRIDGES: [
            { x: 225, width: 150 },
            { x: 675, width: 150 }
        ],

        /* Towers: two taps and one cellar on each side. */
        TOWERS: {
            taps: [
                { x: 225, y: 1215 },
                { x: 675, y: 1215 }
            ],
            cellar: { x: 450, y: 1455 },
            enemyY: {
                taps: 385,
                cellar: 145
            }
        },

        TAP: {
            hp: 1600,
            dmg: 85,
            hitSpeed: 0.9,
            range: 360,
            radius: 58,
            projectileSpeed: 720
        },
        CELLAR: {
            hp: 2800,
            dmg: 110,
            hitSpeed: 1.0,
            range: 390,
            radius: 78,
            projectileSpeed: 760
        },

        MATCH_TIME: 180,
        OVERTIME_TIME: 60,
        BUZZ_MAX: 10,
        BUZZ_START: 5,
        BUZZ_SECONDS: 2.8,
        HAPPY_HOUR: 60,
        OVERTIME_BUZZ_MULT: 1.35,

        DEPLOY_TIME: 0.9,
        RETARGET_TIME: 0.18,
        AGGRO_RANGE: 300,
        MAX_UNITS: 70,
        UNIT_CAP_WARN: 54,
        PROJECTILE_HIT_PAD: 14,

        FIELD_MIN_X: 34,
        FIELD_MAX_X: 866,
        FIELD_MIN_Y: 28,
        FIELD_MAX_Y: 1572,
        FRONT_DEPLOY_Y: 520,
        OWN_DEPLOY_PAD: 34,

        TIPS: {
            winBase: 100,
            perCrown: 20,
            venueBonus: 10,
            loss: 25,
            practiceWin: 30,
            practiceLoss: 10,
            firstClear: 150
        },

        STARS: {
            three: 3,
            two: 2,
            one: 1
        },

        UPGRADE_COSTS: [0, 100, 250, 500, 900],
        MAX_LEVEL: 5,
        LEVEL_SCALE: 0.08,

        TUTORIAL: [
            "Drag a card onto your half of the bar. Start cheap.",
            "Your drinks walk to the nearest coaster bridge. Protect your taps.",
            "Buzz refills over time. Spend it — don't let it sit full.",
            "Spells can land anywhere. Drop one on a crowd.",
            "Destroy the enemy Cellar to take the whole match.",
            "Happy Hour doubles Buzz in the last minute. Push!"
        ]
    };

    CONFIG.TAU = Math.PI * 2;
    LC.CONFIG = CONFIG;

    /* The starter deck is legal on a fresh profile and teaches the four food
     * groups at once: cheap swarm, a duelist, a bruiser, a marksman, a ranger,
     * a spell, and a cycle spell. */
    LC.STARTER_DECK = [
        "mojito", "margarita", "negroni", "lager",
        "ipa", "chianti", "sour", "sparkling"
    ];

    LC.UPGRADE_COSTS = CONFIG.UPGRADE_COSTS;

    LC.VENUES = [
        {
            id: "rusty-tap",
            name: "The Rusty Tap",
            district: "Old Town",
            tagline: "Cheap beer, cheaper tricks.",
            blurb: "A sawdust floor and a tap that never stops. Learn the lanes here.",
            accent: "#e8b05c",
            ai: { level: 1, think: 1.00, jitter: 90, mistake: 0.22, aggression: 0.42 },
            deck: ["lager", "ipa", "stout", "barrel", "sour", "sparkling", "mojito", "icebucket"],
            unlock: ["stout", "barrel"]
        },
        {
            id: "neon-copa",
            name: "Neon Copa",
            district: "Old Town",
            tagline: "Fruit, fizz and fast hands.",
            blurb: "A cocktail bar that fights in threes. Bring something with splash.",
            accent: "#ff6fae",
            ai: { level: 1, think: 0.88, jitter: 80, mistake: 0.18, aggression: 0.52 },
            deck: ["mojito", "margarita", "negroni", "espresso", "pina", "parasol", "sour", "sparkling"],
            unlock: ["espresso", "parasol"]
        },
        {
            id: "cork-and-candle",
            name: "Cork & Candle",
            district: "Old Town",
            tagline: "Old money, older bottles.",
            blurb: "Wine country control. Break the tank before it reaches your taps.",
            accent: "#c95d6d",
            ai: { level: 2, think: 0.78, jitter: 72, mistake: 0.15, aggression: 0.48 },
            deck: ["prosecco", "chianti", "barolo", "rose", "champagne", "port", "sour", "icebucket"],
            unlock: ["rose", "champagne"]
        },
        {
            id: "velvet-rope",
            name: "The Velvet Rope",
            district: "Midtown",
            tagline: "No entry without a reservation.",
            blurb: "Buildings, barrels and a bouncer at every door. Bring a tank killer.",
            accent: "#b997f6",
            ai: { level: 2, think: 0.70, jitter: 62, mistake: 0.13, aggression: 0.55 },
            deck: ["port", "icebucket", "stout", "ipa", "barrel", "chianti", "sour", "tequila"],
            unlock: ["port", "icebucket"]
        },
        {
            id: "rooftop-fizz",
            name: "Rooftop Fizz",
            district: "Midtown",
            tagline: "Above the smoke, nothing but bubbles.",
            blurb: "Parasols and champagne corks. Ground-only decks get punished here.",
            accent: "#62e6d2",
            ai: { level: 3, think: 0.62, jitter: 52, mistake: 0.11, aggression: 0.62 },
            deck: ["parasol", "champagne", "pina", "gin", "ipa", "mojito", "sparkling", "tequila"],
            unlock: ["pina", "gin"]
        },
        {
            id: "sour-cellar",
            name: "The Sour Cellar",
            district: "Midtown",
            tagline: "Everything is fermented twice.",
            blurb: "A spell-heavy cellar. Spreading out is not optional.",
            accent: "#d5e85a",
            ai: { level: 3, think: 0.56, jitter: 46, mistake: 0.09, aggression: 0.58 },
            deck: ["sour", "icebucket", "tequila", "sparkling", "barrel", "rose", "whiskey", "port"],
            unlock: ["whiskey", "rum"]
        },
        {
            id: "midnight-lounge",
            name: "Midnight Lounge",
            district: "The Strip",
            tagline: "Last orders never came.",
            blurb: "Fast shots and faster pushes. Survive the first minute, then take the bar.",
            accent: "#7fa7ff",
            ai: { level: 4, think: 0.48, jitter: 38, mistake: 0.07, aggression: 0.75 },
            deck: ["vodka", "espresso", "margarita", "negroni", "stout", "barrel", "sour", "sparkling"],
            unlock: ["vodka", "tequila"]
        },
        {
            id: "last-call",
            name: "LAST CALL",
            district: "The Strip",
            tagline: "The whole city is watching.",
            blurb: "The boss bar: every bottle, every trick, every lane. Win the circuit.",
            accent: "#ffcf6d",
            ai: { level: 4, think: 0.40, jitter: 30, mistake: 0.04, aggression: 0.82 },
            deck: ["barolo", "whiskey", "gin", "champagne", "port", "rum", "tequila", "sour"],
            unlock: ["prosecco", "barolo"]
        }
    ];

    LC.PRACTICE = {
        easy: { name: "Easy", level: 1, think: 1.0, jitter: 90, mistake: 0.25, aggression: 0.4 },
        normal: { name: "Normal", level: 2, think: 0.7, jitter: 55, mistake: 0.12, aggression: 0.6 },
        hard: { name: "Hard", level: 4, think: 0.44, jitter: 28, mistake: 0.04, aggression: 0.8 }
    };

    LC.VENUE_BY_ID = {};
    LC.VENUES.forEach(function (venue, index) {
        venue.index = index;
        LC.VENUE_BY_ID[venue.id] = venue;
    });

    LC.starsFor = function (state) {
        if (!state.result || state.result.winner !== "player") return 0;
        var alive = state.towers.filter(function (t) {
            return t.side === "player" && t.alive;
        }).length;
        if (alive >= 3) return 3;
        if (alive === 2) return 2;
        return 1;
    };

    LC.tipsFor = function (state, venue, mode) {
        if (!state.result) return 0;
        if (mode === "practice") {
            return state.result.winner === "player"
                ? CONFIG.TIPS.practiceWin
                : CONFIG.TIPS.practiceLoss;
        }
        if (state.result.winner === "player") {
            return CONFIG.TIPS.winBase +
                CONFIG.TIPS.perCrown * state.crowns.player +
                CONFIG.TIPS.venueBonus * ((venue && venue.index) || 0);
        }
        return CONFIG.TIPS.loss;
    };

    LC.levelMultiplier = function (level) {
        return 1 + CONFIG.LEVEL_SCALE * (Math.max(1, level || 1) - 1);
    };
})(window.LC = window.LC || {});