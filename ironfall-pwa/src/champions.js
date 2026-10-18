/*
 * IRONFALL - the champion roster.
 *
 * Eight champions across four warbands. Abilities are DATA, not bespoke
 * functions: each one names an archetype from abilities.js and a bag of
 * numbers. That is the only reason eight champions is a fortnight of work
 * instead of a quarter, and it is also what makes the roster testable - the
 * roster test walks every ability of every champion and asserts the numbers
 * are in the ranges the simulation can actually survive.
 *
 * Nothing in this file has behaviour. Faction passives are a switch in
 * combat.js keyed by the id declared here, and the roster test asserts the
 * two agree, so a passive can never be declared without being implemented.
 */
(function (S) {
    "use strict";

    /* Damage type drives which mitigation stat applies. Physical is checked
     * against armour, magical against resistance, and true against neither.
     * Every champion here is physical-dominant or magic-dominant but not
     * both, so an armour build is a real answer to a marksman and a real
     * mistake against the roster's casters. */
    var PHYS = "phys", MAGIC = "magic";

    /* ===== Ability archetypes =====
     * Kept as a list so the abilities test can assert every `arch` used by
     * the roster is one the runtime actually implements. A typo in an
     * archetype name would otherwise be a silent no-op button in a shipped
     * build. */
    var ARCHETYPES = [
        "none",       /* self-cast, no effect target */
        "cone",       /* damage in a wedge from the caster */
        "dash",       /* dash to a point, damage along the way */
        "shot",       /* projectile to a point or a unit */
        "chain",      /* projectile that bounces to nearby targets */
        "beam",       /* instant wide line, the standard ultimate shape */
        "blast",      /* delayed circle, the artillery shape */
        "slam",       /* instant circle around the caster */
        "blink",      /* teleport */
        "shield",     /* shield the caster or an ally */
        "buff",       /* temporary stat buff */
        "field",      /* persistent ground area */
        "summon"      /* spawn friendly units */
    ];

    /* Cost and cooldown ramps are three- or five-deep arrays. Three is the
     * League standard and two rows of ranks is one too many to read on a
     * phone. */
    function ramp(a, b, c, d) { return [a, b, c, d || b]; }

    /* ===== Warband passives =====
     * Declared here, implemented in combat.js. Each one has a stated rule so
     * the code and the tooltip cannot disagree. */
    var FACTIONS = {
        astartes: {
            id: "astartes",
            name: "Astartes Chapter",
            /* "Aquila: +30 armour while below 40% health." Reads as a
             * last-stand rule, and it means a wounded Space Marine is a
             * *harder* kill than a healthy one - which is what a power armour
             * fiction should feel like. */
            passive: "AQUILA",
            passiveText: "+30 armour below 40% health",
            accent: "#2f5fa8"
        },
        warpbound: {
            id: "warpbound",
            name: "Warpbound Coven",
            /* "Maleficium: 14% of overkill damage returns as health." Rewards
             * finishing blows, which pushes this faction to commit to picks
             * rather than trade. */
            passive: "MALEFICIUM",
            passiveText: "14% of overkill damage heals you",
            accent: "#7a2ecb"
        },
        tyranid: {
            id: "tyranid",
            name: "Tyranid Hive",
            /* "Synapse: heal 16% of your damage on champion kills." Scales
             * into fights rather than being flat, so an early lead compounds
             * exactly the way a synapse network does. */
            passive: "SYNAPSE",
            passiveText: "heal 16% of your damage on champion kills",
            accent: "#8fb518"
        },
        guard: {
            id: "guard",
            name: "Guard and Grots",
            /* "Requisition: +18% gold from last-hits." The only passive that
             * touches the economy, and it exists so this faction can play the
             * game that League's marksman role plays - farm, then convert. */
            passive: "REQUISITION",
            passiveText: "+18% gold from last-hits",
            accent: "#c4762a"
        }
    };

    /* ===== The roster =====
     * Roles are tags, not rules: nothing in the simulation reads them. They
     * exist for the champion sheet and for the AI's draft weighting. */
    var CHAMPS = [
        {
            id: "vanguard",
            name: "VANGUARD",
            title: "Centurion of the Third Company",
            faction: "astartes",
            role: "tank",
            /* Deltas from the shared baseline in config.js, not absolute
             * stats. A balance pass on the baseline moves everyone at once;
             * a balance pass on a delta moves one champion. */
            stats: { hp: 260, armor: 14, mr: 10, ad: -4, as: -0.02, ms: 20 },
            lore: "Twelve years in the plate and it still answers when the Chapter's litany is spoken. He does not intend to be here. He intends to be the wall.",
            abilities: [
                {
                    name: "POWER FIST",
                    key: "Q",
                    arch: "dash",
                    targeting: "point",
                    cost: ramp(50, 55, 60, 65),
                    cd: ramp(14, 13, 12, 11),
                    cast: 0.2,
                    range: 620,
                    width: 130,
                    dmg: ramp(80, 130, 180, 230),
                    dmgType: PHYS, adRatio: 1.0,
                    knockback: 260,
                    blurb: "Charge. Everything in the way regrets it."
                },
                {
                    name: "AQUILA PLATE",
                    key: "W",
                    arch: "shield",
                    targeting: "none",
                    cost: ramp(60, 65, 70, 75),
                    cd: ramp(16, 15, 14, 13),
                    cast: 0,
                    selfOnly: true,
                    shield: ramp(120, 165, 210, 255),
                    hpRatio: 0.12,
                    dur: 4,
                    /* Armour while the plate is up. This is the ability that
                     * makes VANGUARD a tank rather than a bruiser: the armour
                     * only exists while the shield does, so burst damage is
                     * the counter, not sustained damage. */
                    armorBuff: 45,
                    blurb: "Seal the plate. Nothing gets through for four seconds."
                },
                {
                    name: "BREACHING CHARGE",
                    key: "E",
                    arch: "slam",
                    targeting: "point",
                    cost: ramp(70, 75, 80, 85),
                    cd: ramp(18, 16, 14, 12),
                    cast: 0.25,
                    /* A dash-then-slam: the archetype takes a dash and a
                     * radius, which is the single most reused shape in the
                     * kit system. */
                    dash: 700,
                    range: 700,
                    radius: 260,
                    dmg: ramp(90, 140, 190, 240),
                    dmgType: PHYS, adRatio: 0.85,
                    slow: { pct: 0.45, dur: 1.2 },
                    blurb: "Land and the ground gives way underneath them."
                },
                {
                    name: "OATH OF CINDERS",
                    key: "R",
                    arch: "buff",
                    targeting: "none",
                    cost: 100,
                    cd: 110,
                    cast: 0,
                    dur: 8,
                    asBuff: 0.35, adBuff: 0.25, msBuff: 0.15,
                    radius: 420,
                    /* The shield portion also lands on allies in range, which
                     * is the whole reason to pick this in a three-man team:
                     * it is the only ability in the roster that makes your
                     * teammates harder to kill. */
                    allyShield: ramp(90, 130, 170, 210),
                    allyArmorBuff: 30,
                    selfOnlyShield: true,
                    blurb: "The litany is spoken. Eight seconds of it."
                }
            ]
        },

        {
            id: "votary",
            name: "VOTARY",
            title: "Sanctioned Psyker of the Sixth",
            faction: "astartes",
            role: "mage",
            stats: { hp: -140, armor: -4, mr: 12, ad: 6, as: 0.04, ms: 10, mana: 180 },
            lore: "The choir sings and she is the note that carries. She has read the prophecies. She has decided which ones to leave out.",
            abilities: [
                {
                    name: "PSYCHIC LANCE",
                    key: "Q",
                    arch: "shot",
                    targeting: "point",
                    cost: ramp(55, 60, 65, 70),
                    cd: ramp(12, 11, 10, 9),
                    cast: 0.25,
                    range: 1050,
                    radius: 90,
                    pierce: true,
                    projSpeed: 2200,
                    dmg: ramp(110, 165, 220, 275),
                    dmgType: MAGIC, apRatio: 0.9,
                    blurb: "A single held thought, thrown hard enough to pass through two of them."
                },
                {
                    name: "FAITH SHIELD",
                    key: "W",
                    arch: "shield",
                    targeting: "none",
                    cost: ramp(70, 75, 80, 85),
                    cd: ramp(18, 17, 16, 15),
                    cast: 0.15,
                    /* No selfOnly, so the runtime picks the most wounded
                     * ally in range including herself. Auto-targeting the
                     * weakest rather than requiring a target is what makes a
                     * three-man team support usable with one thumb. */
                    radius: 620,
                    shield: ramp(140, 190, 240, 290),
                    dur: 3.5,
                    blurb: "The ward finds whoever is bleeding worst."
                },
                {
                    name: "WARP STEP",
                    key: "E",
                    arch: "blink",
                    targeting: "point",
                    cost: ramp(60, 65, 70, 75),
                    cd: ramp(16, 15, 14, 13),
                    cast: 0,
                    range: 780,
                    /* The scar left behind is a small delayed damage. It is
                     * the archetype's whole reason to exist over a plain
                     * blink: the exit is a threat, not just an exit. */
                    scarRadius: 200,
                    scarDelay: 0.4,
                    scarDmg: ramp(60, 100, 140, 180),
                    dmgType: MAGIC, apRatio: 0.5,
                    blurb: "Leave. Arrive. Leave a wound where you left."
                },
                {
                    name: "WRATH OF THE OMNISSIAH",
                    key: "R",
                    arch: "beam",
                    targeting: "point",
                    cost: 120,
                    cd: 140,
                    cast: 0.55,
                    channel: 0.45,
                    range: 1250,
                    width: 210,
                    dmg: ramp(320, 480, 640, 800),
                    dmgType: MAGIC, apRatio: 1.3,
                    blurb: "Judgement, delivered along a straight line through everyone in the choir."
                }
            ]
        },

        {
            id: "hexer",
            name: "HEXER",
            title: "Sorcerer of the Ninth Legion",
            faction: "warpbound",
            role: "mage",
            stats: { hp: -80, armor: -2, mr: 16, ad: 4, as: 0.02, ms: 15, mana: 200 },
            lore: "Every spell is a conversation with something that should have said no. She has learned to stop saying please.",
            abilities: [
                {
                    name: "WARP LIGHTNING",
                    key: "Q",
                    arch: "chain",
                    targeting: "unit",
                    cost: ramp(50, 55, 60, 65),
                    cd: ramp(11, 10, 9, 8),
                    cast: 0.2,
                    range: 700,
                    bounces: 3,
                    bounceRange: 480,
                    falloff: 0.78,
                    projSpeed: 2000,
                    dmg: ramp(90, 135, 180, 225),
                    dmgType: MAGIC, apRatio: 0.8,
                    blurb: "It finds the next one on its own. Usually."
                },
                {
                    name: "MALEFICIUM",
                    key: "W",
                    arch: "field",
                    targeting: "point",
                    cost: ramp(75, 80, 85, 90),
                    cd: ramp(20, 18, 16, 14),
                    cast: 0.3,
                    range: 800,
                    radius: 280,
                    dur: 4,
                    tick: 0.5,
                    dmg: ramp(45, 62, 80, 98),
                    dmgType: MAGIC, apRatio: 0.3,
                    slow: { pct: 0.25, dur: 0.6 },
                    blurb: "Hold a piece of ground and let the warp eat it."
                },
                {
                    name: "HEX",
                    key: "E",
                    arch: "blast",
                    targeting: "point",
                    cost: ramp(65, 70, 75, 80),
                    cd: ramp(17, 15, 13, 11),
                    cast: 0.3,
                    range: 800,
                    radius: 230,
                    delay: 0.45,
                    dmg: ramp(130, 195, 260, 325),
                    dmgType: MAGIC, apRatio: 0.7,
                    slow: { pct: 0.4, dur: 2 },
                    blurb: "Mark a place. Wait. The mark arrives on its own schedule."
                },
                {
                    name: "STORM OF HERESY",
                    key: "R",
                    arch: "blast",
                    targeting: "point",
                    cost: 130,
                    cd: 150,
                    cast: 0.6,
                    range: 900,
                    radius: 540,
                    delay: 0.8,
                    dmg: ramp(400, 600, 800, 1000),
                    dmgType: MAGIC, apRatio: 1.2,
                    /* A second, smaller detonation on top of the first. The
                     * archetype supports an optional echo so one ultimate can
                     * be two different fights: the outer ring catches the
                     * backline, the inner one deletes the front. */
                    echoRadiusMul: 0.55,
                    echoDelayAdd: 0.25,
                    echoMul: 0.6,
                    blurb: "Two detonations. They were not supposed to be different detonations."
                }
            ]
        },

        {
            id: "bloodletter",
            name: "BLOODLETTER",
            title: "Champion of the Eighth",
            faction: "warpbound",
            role: "bruiser",
            stats: { hp: 190, armor: 8, mr: 4, ad: 14, as: 0.06, ms: 25 },
            lore: "He was a rating. He is a number now, and the number is very large. The wound does not close, so the wound is a gift.",
            abilities: [
                {
                    name: "GORE STRIKE",
                    key: "Q",
                    arch: "cone",
                    targeting: "direction",
                    cost: ramp(45, 50, 55, 60),
                    cd: ramp(9, 8, 7, 6),
                    cast: 0.15,
                    range: 420,
                    angle: 1.1,
                    dmg: ramp(95, 140, 185, 230),
                    dmgType: PHYS, adRatio: 1.1,
                    /* Cone abilities can also hit structures for a reduced
                     * fraction, so pushing a wave does not mean aiming at a
                     * person instead of the tower. */
                    structMul: 0.5,
                    blurb: "Everything in front of you, at once."
                },
                {
                    name: "JUGGERNAUT",
                    key: "W",
                    arch: "buff",
                    targeting: "none",
                    cost: ramp(55, 60, 65, 70),
                    cd: ramp(20, 18, 16, 14),
                    cast: 0,
                    dur: 5,
                    msBuff: 0.3,
                    lifestealBuff: 0.25,
                    /* Over-time heal rather than an instant one: the shield
                     * archetype would be a different button, and the instant
                     * version is worse because it cannot be spread out. */
                    healOverTime: ramp(60, 90, 120, 150),
                    hpRatio: 0.08,
                    blurb: "The wound opens wider. Everything gets faster."
                },
                {
                    name: "CHARGE",
                    key: "E",
                    arch: "dash",
                    targeting: "point",
                    cost: ramp(60, 65, 70, 75),
                    cd: ramp(16, 14, 12, 10),
                    cast: 0.15,
                    range: 680,
                    width: 160,
                    dmg: ramp(100, 150, 200, 250),
                    dmgType: PHYS, adRatio: 0.9,
                    knockup: 0.6,
                    blurb: "Go through them. They will not be standing afterwards."
                },
                {
                    name: "SANGUAGE",
                    key: "R",
                    arch: "buff",
                    targeting: "none",
                    cost: 110,
                    cd: 130,
                    cast: 0,
                    dur: 9,
                    adBuff: 0.4, asBuff: 0.25,
                    healPct: 0.2,
                    /* Slow immunity. In a game with no crowd-control cleanse
                     * item, an ultimate-granted immunity is the only answer to
                     * a stacked slow, and BLOODLETTER is exactly the champion
                     * that should own it. */
                    slowImmune: true,
                    msBuff: 0.2,
                    blurb: "Eight seconds where the wound is a resource."
                }
            ]
        },

        {
            id: "zoanthrop",
            name: "ZOANTHROP",
            title: "Neurogaunt of the Fourth Brood",
            faction: "tyranid",
            role: "marksman",
            stats: { hp: -60, armor: -2, mr: 8, ad: 12, as: 0.1, ms: 20, range: 130, mana: 140 },
            lore: "It does not think. It does not need to. It has already been told where you will be.",
            abilities: [
                {
                    name: "SHARD VOLLEY",
                    key: "Q",
                    arch: "shot",
                    targeting: "direction",
                    cost: ramp(50, 55, 60, 65),
                    cd: ramp(11, 10, 9, 8),
                    cast: 0.2,
                    range: 950,
                    radius: 70,
                    spread: 3,
                    spreadAngle: 0.17,
                    projSpeed: 1700,
                    dmg: ramp(65, 100, 135, 170),
                    dmgType: MAGIC, apRatio: 0.85,
                    blurb: "Three shards, fanned. One of them is the one that matters."
                },
                {
                    name: "FLESH SURGE",
                    key: "W",
                    arch: "dash",
                    targeting: "point",
                    cost: ramp(55, 60, 65, 70),
                    cd: ramp(14, 12, 10, 8),
                    cast: 0,
                    range: 540,
                    width: 140,
                    dmg: ramp(70, 110, 150, 190),
                    dmgType: MAGIC, apRatio: 0.6,
                    /* A dash that heals for what it dealt. This is the
                     * archetype's healing option and it is why ZOANTHROP can
                     * dive without being a berserker. */
                    healForDamage: 0.5,
                    blurb: "Burst forward. Replace what you spent."
                },
                {
                    name: "CARAPACE",
                    key: "E",
                    arch: "shield",
                    targeting: "none",
                    cost: ramp(55, 60, 65, 70),
                    cd: ramp(15, 14, 13, 12),
                    cast: 0,
                    selfOnly: true,
                    shield: ramp(100, 140, 180, 220),
                    hpRatio: 0.06,
                    dur: 3.5,
                    blurb: "Harden. The brood does not flinch and neither does this."
                },
                {
                    name: "HORMAGAUNT RUSH",
                    key: "R",
                    arch: "summon",
                    targeting: "point",
                    cost: 120,
                    cd: 130,
                    cast: 0.4,
                    range: 620,
                    dur: 25,
                    count: 3,
                    unit: {
                        name: "hormagaunt",
                        hp: 620, ad: 46, armor: 22, mr: 20, ms: 380, range: 140, gold: 0, xp: 0
                    },
                    blurb: "Three of them. They were already part of the plan."
                }
            ]
        },

        {
            id: "hivetyrant",
            name: "HIVE TYRANT",
            title: "Third-Subjugate Brood-Carrier",
            faction: "tyranid",
            role: "tank",
            stats: { hp: 210, armor: 10, mr: 10, ad: 8, as: -0.01, ms: 15 },
            lore: "It has been called many things by the things it eats. None of them were correct.",
            abilities: [
                {
                    name: "TALONS",
                    key: "Q",
                    arch: "cone",
                    targeting: "direction",
                    cost: ramp(45, 50, 55, 60),
                    cd: ramp(9, 8, 7, 6),
                    cast: 0.2,
                    range: 380,
                    angle: 1.3,
                    dmg: ramp(80, 125, 170, 215),
                    dmgType: PHYS, adRatio: 1.05,
                    structMul: 0.5,
                    blurb: "Close. Not close enough."
                },
                {
                    name: "EXOCRINE AURA",
                    key: "W",
                    arch: "field",
                    targeting: "none",
                    cost: ramp(65, 70, 75, 80),
                    cd: ramp(19, 17, 15, 13),
                    cast: 0,
                    radius: 420,
                    dur: 4,
                    tick: 0.5,
                    dmg: ramp(40, 60, 80, 100),
                    dmgType: MAGIC, apRatio: 0.25,
                    slow: { pct: 0.35, dur: 0.6 },
                    /* The field follows the caster. A following field is a
                     * different archetype to a placed one and it is the only
                     * reason W is worth a cooldown. */
                    follow: true,
                    blurb: "The air itself goes sour around it."
                },
                {
                    name: "IMMOLATE",
                    key: "E",
                    arch: "summon",
                    targeting: "point",
                    cost: ramp(60, 65, 70, 75),
                    cd: ramp(18, 16, 14, 12),
                    cast: 0.2,
                    range: 700,
                    dur: 32,
                    count: 1,
                    /* Summons a static friendly structure rather than a
                     * walking unit: same archetype, different unit block. */
                    asStructure: true,
                    unit: {
                        name: "wormhole turret",
                        hp: 900, ad: 62, armor: 30, mr: 25, ms: 0, range: 820, gold: 0, xp: 0
                    },
                    blurb: "Open a wound in the floor and let it shoot."
                },
                {
                    name: "SUBJUGATION",
                    key: "R",
                    arch: "slam",
                    targeting: "none",
                    cost: 110,
                    cd: 120,
                    cast: 0.35,
                    radius: 520,
                    dmg: ramp(260, 390, 520, 650),
                    dmgType: MAGIC, apRatio: 1.0,
                    slow: { pct: 0.35, dur: 1.5 },
                    blurb: "Everything inside the ring stops arguing."
                }
            ]
        },

        {
            id: "sergeant",
            name: "SERGEANT",
            title: " platoon commander, Cadian 8th",
            faction: "guard",
            role: "marksman",
            stats: { hp: 40, armor: 2, mr: 4, ad: 16, as: 0.12, ms: 10, range: 140 },
            lore: "Four hundred dead behind him and a lasgun with eleven rounds left. He has never once fired all of them.",
            abilities: [
                {
                    name: "PINSHOT",
                    key: "Q",
                    arch: "shot",
                    targeting: "unit",
                    cost: ramp(45, 50, 55, 60),
                    cd: ramp(10, 9, 8, 7),
                    cast: 0.3,
                    range: 1300,
                    radius: 60,
                    projSpeed: 2600,
                    dmg: ramp(130, 195, 260, 325),
                    dmgType: PHYS, adRatio: 1.4,
                    blurb: "One shot. He only needs the one."
                },
                {
                    name: "COMMAND",
                    key: "W",
                    arch: "buff",
                    targeting: "none",
                    cost: ramp(60, 65, 70, 75),
                    cd: ramp(22, 20, 18, 16),
                    cast: 0.2,
                    dur: 7,
                    asBuff: 0.4,
                    /* Allies in radius get a smaller share. This is the
                     * ability that makes a 3-man team fight as a unit, and
                     * its value scales with how close the bot squad is
                     * playing - which is the decision the player makes by
                     * dragging SERGEANT toward them. */
                    radius: 700,
                    allyAsBuff: 0.22,
                    blurb: "The whole squad shoots faster while he is shouting."
                },
                {
                    name: "REINFORCE",
                    key: "E",
                    arch: "summon",
                    targeting: "point",
                    cost: ramp(65, 70, 75, 80),
                    cd: ramp(20, 18, 16, 14),
                    cast: 0.25,
                    range: 600,
                    dur: 22,
                    count: 2,
                    unit: {
                        name: "guard squad",
                        hp: 540, ad: 34, armor: 20, mr: 18, ms: 360, range: 420, gold: 0, xp: 0
                    },
                    blurb: "Two more rifles. He sent them before he asked."
                },
                {
                    name: "ARTILLERY BARRAGE",
                    key: "R",
                    arch: "blast",
                    targeting: "point",
                    cost: 130,
                    cd: 145,
                    cast: 0.5,
                    range: 1400,
                    radius: 460,
                    delay: 0.9,
                    dmg: ramp(100, 150, 200, 250),
                    dmgType: MAGIC, apRatio: 0.8,
                    /* Six sub-bombs inside the circle, each smaller than the
                     * declared damage. Total damage matches the declared
                     * number but it arrives as a pattern, so the answer is to
                     * leave the circle rather than to race a health bar. */
                    bombs: 6,
                    bombRadiusMul: 0.42,
                    bombDelayStep: 0.12,
                    structMul: 0.6,
                    blurb: "Six impacts, spread across the circle, none of them negotiable."
                }
            ]
        },

        {
            id: "grotshoul",
            name: "GROTSHOUL",
            title: "Warboss of the Bad Moons",
            faction: "guard",
            role: "bruiser",
            stats: { hp: 280, armor: 6, mr: 2, ad: 18, as: 0.05, ms: 30 },
            lore: "He has been hit in the head by a brick and considered it a tactical exchange. He was right.",
            abilities: [
                {
                    name: "CHOPPA SWING",
                    key: "Q",
                    arch: "cone",
                    targeting: "direction",
                    cost: ramp(45, 50, 55, 60),
                    cd: ramp(9, 8, 7, 6),
                    cast: 0.2,
                    range: 400,
                    angle: 1.5,
                    dmg: ramp(90, 140, 190, 240),
                    dmgType: PHYS, adRatio: 0.95,
                    structMul: 0.6,
                    blurb: "Wide. Sloppy. Extremely effective."
                },
                {
                    name: "WAAAGH!",
                    key: "W",
                    arch: "buff",
                    targeting: "none",
                    cost: ramp(50, 55, 60, 65),
                    cd: ramp(18, 16, 14, 12),
                    cast: 0,
                    dur: 6,
                    asBuff: 0.45, msBuff: 0.35,
                    healPct: 0.1,
                    /* Slow cleanse, same as League's cleanse but folded into
                     * an ability rather than bought from the shop - the shop's
                     * cleanse is deliberately not an item. */
                    cleanseSlow: true,
                    blurb: "Loud enough that the stun wears off."
                },
                {
                    name: "MOSH PIT",
                    key: "E",
                    arch: "field",
                    targeting: "point",
                    cost: ramp(70, 75, 80, 85),
                    cd: ramp(19, 17, 15, 13),
                    cast: 0.25,
                    range: 700,
                    radius: 320,
                    dur: 3.5,
                    tick: 0.4,
                    dmg: ramp(30, 45, 60, 75),
                    dmgType: PHYS, adRatio: 0.25,
                    /* Pull enemies toward the centre. A field that pulls is
                     * the only real peel in the roster, and GROTSHOUL having
                     * it is the joke and also genuinely useful. */
                    pull: 240,
                    blurb: "Anyone standing in it is going in circles."
                },
                {
                    name: "KILLZONE",
                    key: "R",
                    arch: "slam",
                    targeting: "none",
                    cost: 110,
                    cd: 120,
                    cast: 0.3,
                    radius: 440,
                    dmg: ramp(180, 270, 360, 450),
                    dmgType: PHYS, adRatio: 1.1,
                    slow: { pct: 0.6, dur: 2 },
                    /* Stuns, because a slow is not enough of an answer to a
                     * diving marksman. One second is short enough to be
                     * reactable. */
                    stun: 1.0,
                    blurb: "Everything in the circle stops being a problem for a second."
                }
            ]
        }
    ];

    var byId = {};
    for (var i = 0; i < CHAMPS.length; i++) byId[CHAMPS[i].id] = CHAMPS[i];

    S.Factions = FACTIONS;
    S.Champions = {
        list: CHAMPS,
        archetypes: ARCHETYPES,
        count: CHAMPS.length,
        get: function (id) { return byId[id] || null; },
        ids: function () {
            var out = [];
            for (var i = 0; i < CHAMPS.length; i++) out.push(CHAMPS[i].id);
            return out;
        },
        /* Used by the AI draft. Role weights make the bot pick a composition
         * rather than five bruisers; faction weights stop all six bots on one
         * side ending up with the same passive. */
        draftPick: function (rng, taken, team) {
            var pool = [];
            for (var i = 0; i < CHAMPS.length; i++) {
                var c = CHAMPS[i];
                if (taken && taken.indexOf(c.id) >= 0) continue;
                pool.push(c);
            }
            if (!pool.length) return null;
            var teamComp = team || {};
            var best = null, bestW = -1;
            for (var k = 0; k < pool.length; k++) {
                var cand = pool[k];
                var w = 1;
                /* One of each role per team is the floor a 3v3 needs; without
                 * this a draft can produce three melee champions and a wave
                 * that cannot kill anything. */
                if (teamComp[cand.role] >= 1) w *= 0.22;
                /* Two of a faction is allowed and fine - a stacked faction
                 * with two passives is a legitimate team comp - but three is
                 * where it stops being interesting. */
                var sameFaction = 0;
                for (var t in teamComp) {
                    if (!Object.prototype.hasOwnProperty.call(teamComp, t)) continue;
                    if (CHAMPS_FACTION[t] === cand.faction) sameFaction++;
                }
                if (sameFaction >= 2) w *= 0.3;
                w *= 1 + rng.range(-0.15, 0.15);
                if (w > bestW) { bestW = w; best = cand; }
            }
            return best;
        }
    };

    /* Reverse id->faction lookup, built once, for the draft weight above. */
    var CHAMPS_FACTION = {};
    for (var j = 0; j < CHAMPS.length; j++) CHAMPS_FACTION[CHAMPS[j].id] = CHAMPS[j].faction;

})(window.IF = window.IF || {});
