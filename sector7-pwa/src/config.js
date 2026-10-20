/*
 * SECTOR 7 - shared tuning constants, palette and math helpers.
 *
 * Loaded first; every other module reads from window.S7. Balance passes edit
 * this file, not the systems.
 */
(function (S) {
    "use strict";

    /* ===== Projection =====
     * Oblique, not true isometric: world +x is screen right, world +y is
     * screen down (squashed), world +z is screen up. The map never rotates,
     * so north stays north on screen and lining up the blaster never fights
     * the camera.
     *
     * That map is linear, so a constant 3D face normal maps to a constant
     * screen gradient - which is precisely what flat shading needs. One dot
     * product per face, no per-pixel lighting.
     */
    S.PROJ = {
        ySquash: 0.62,
        zTilt: 0.82,
        /* Height also shears sideways. Without this, faces pointing along x
         * project to exactly zero width and every box renders as two
         * polygons and an outline; with it, one side face opens up and solids
         * read as solids. */
        yaw: 0.45,
    };

    /* Direction from the scene toward the camera, derived from the three
     * projection axes above. A face is front-facing when its normal points
     * this way, and a point's occlusion key is its dot product with it.
     * Renderer and world share these numbers so sorting can never disagree
     * with what is actually visible. */
    (function (P) {
        P.viewX = -P.yaw * P.ySquash;
        P.viewY = P.zTilt;
        P.viewZ = P.ySquash;
    })(S.PROJ);

    /* Key light, world space. Roughly normalised; used for face shading. */
    S.LIGHT = [-0.45, -0.6, 0.66];

    S.CONFIG = {
        world: {
            size: 4800,
            station: { x: 2400, y: 2400 },

            /* Nothing spawns inside this radius: a station you can never
             * escape a firefight in is worse than a slightly emptier map. */
            clearRadius: 470,
            /* The station's own disc is 152 units across its radius, so the
             * dock ring has to sit outside that or the ring is drawn on top
             * of the structure and reads as nothing at all. */
            dockRadius: 205,
            dockTime: 1.5,
            /* Docking is not free. The fee is charged on undocking, which is
             * when Darkorbit-style players feel it. */
            dockFeeRate: 0.04,
            dockFeeMin: 12,

            /* Harvestable destructibles, and the loose energy crates. */
            targets: 32,
            targetRespawn: 15,
            crates: 24,
            /* Was 8s, which meant the map never ran dry: once a player knew
             * three good crate spots, combat was optional. Crates are a
             * top-up now, not the economy. */
            crateRespawn: 30,
            crateValue: 60,
            crateValueJitter: 25,

            pickupTTL: 26,
            pickupMagnet: 120,
            pickupRadius: 30,
            deathRespawn: 3.0,
        },

        /* Cargo. Energy is not a number on a ship, it is a load: it has to
         * be carried somewhere, and the somewhere is the hold. */
        cargo: {
            /* Level 1 carries two crate-loads. Deliberately tight - the first
             * trips are about learning that you have to go back. */
            base: 200,
            step: 200,
            /* A wrecked hold spills into a readable pile rather than one
             * absurd pickup nobody can steer for. */
            maxChunks: 14,
        },

        /* The munitions economy.
         *
         * `capacity` is what one ship can carry of each kind. It is the
         * ceiling that makes a dock a resupply trip rather than a formality:
         * the hangar can hold a thousand rounds and the ship can still only
         * take so many.
         *
         * `cost` is energy per round. The laser has to be cheap enough that
         * the blaster is never a tax on playing the game at all; the heavy
         * guns have to be expensive enough that a maxed blaster is still the
         * better answer to a hull with no shields. */
        munitions: {
            capacity: { laser: 300, ammo: 30, plasma: 12, missiles: 12, mines: 12 },
            cost: { laser: 1, ammo: 6, plasma: 12, missiles: 5, mines: 6 },
            /* What a BUY press adds, so the button is not a hundred clicks. */
            bundle: { laser: 50, ammo: 5, plasma: 2, missiles: 2, mines: 2 },
            /* What a new pilot starts with. A pilot with no rounds at all
             * cannot fight, and the first fight is not optional. */
            starter: { laser: 120, ammo: 4, plasma: 2, missiles: 2, mines: 2 },
        },

        player: {
            startEnergy: 250,
            /* Per the genre: energy is lost with the wreck and has to be
             * collected again. Crystals are the safe, persistent score. */
            energyDropFraction: 1.0,
            hitFlashTime: 0.18,
            invulnOnSpawn: 2.5,
        },

        combat: {
            bulletSpeed: 620,
            bulletLife: 1.1,
            bulletRadius: 4,
            npcBulletRadius: 5,
            /* Soft auto-aim: the blaster tracks a target inside this cone
             * without ever taking the steering away from the player. */
            aimCone: Math.PI / 4,
            /* Kept inside the fitted view span: the turret should never snap
             * onto something the player cannot see. */
            aimAssistRange: 430,
            /* The ammo round is the answer to shields, not a second blaster.
             * Its reach sits inside the view span too, or the weapon that
             * exists to beat big targets would be the one you cannot aim at
             * anything with. */
            ammoSpeed: 900,
            ammoLife: 0.55,
            ammoRadius: 7,

            /* The lock-on shot. Fired with Ctrl at whatever the player has
             * selected, so it is the answer to "I picked a target and I want
             * to hit it" - it ignores the turret arc and can therefore reach
             * something behind you, which the blaster never can.
             *
             * It is deliberately not free: a long cooldown, a modest tracking
             * rate and a short life mean it is a precision tool, not a
             * second DPS source. The blaster is still the better answer to a
             * target you are already pointing at. */
            attackRange: 430,
            attackCooldown: 0.6,
            attackSpeed: 900,
            attackLife: 0.9,
            attackTurn: 2.2,
            attackRadius: 6,

            /* The plasma round. Slower than the capacitor round and slower
             * than the laser, and it does not home: it is a heavy slug you
             * have to aim, and the pierce is what you are paying for. */
            plasmaSpeed: 780,
            plasmaLife: 0.95,
            plasmaRadius: 7,

            /* An unstable rock going off. The blast is a physical event,
             * not a weapon: a shield does not stop it, only armour does. */
            cinderRadius: 190,
            cinderDamage: 46,

            /* The mining beam.
             *
             * A TOOL, not a weapon: it cuts rock and nothing else. That is
             * the whole point of it. A free beam that also hurt ships would
             * be a free gun, and the laser and capacitor round tracks would
             * be dead on arrival - the Ammo track in particular only exists
             * because a shield is a real problem.
             *
             * It is free, it never runs out, and it puts the energy straight
             * into the hold. Those three facts are what make it safe to
             * turn every other gun into a consumable later: a player can
             * always mine, so a player can always be solvent.
             */
            beamRange: 240,
            /* Half-angle of the cone, in radians. A beam is a cone, not a
             * ray, so a rock slightly off the nose still gets cut. */
            beamCone: 0.5,
            /* Rock hull per second. */
            beamRate: 30,

            /* Click-to-move. The waypoint is a straight line, not a route:
             * the ship flies toward it and the player takes the pressure
             * from everything on the way there. */
            moveArrive: 30,
            /* Inside this distance the throttle eases off, so the ship
             * settles on the point instead of sailing past it. */
            moveTaper: 140,
        },

        /* Shields come back, armour never does. That gap is what creates the
         * rhythm of breaking contact and returning rather than duelling to
         * the death every time. */
        shield: {
            /* Seconds out of combat before a shield starts refilling. */
            regenDelay: 3.2,
            regenRate: 7.0,
            regenMin: 0.25,
        },

        /* CPUs: active abilities. One is fitted at a time. */
        cpu: {
            warpDistance: 300,
            warpInvuln: 0.85,
            radarTime: 9,
            instaShield: 3.0,
            leechTime: 10,
            repairTime: 6,
            /* The cloak hides the ship from anything that has to ACQUIRE a
             * target. It does not make the ship invulnerable: rounds already
             * in the air still land, which is the difference between being
             * unseen and being untouchable. */
            cloakTime: 9,
            leechFraction: 0.25,
            repairPerSec: 6.5,
        },

        npc: {
            maxAlive: 13,
            spawnInterval: 3.4,
            /* Tiers above this are never rolled, however rich you get. */
            maxTier: 8,
            thinkInterval: 0.11,
            fleeHullFrac: 0.26,
            /* The band an attacker tries to hold. Deliberately well inside
             * the aggro range below, or an NPC would reacquire a target and
             * immediately drop it again the moment it arrived. */
            preferredRange: 190,
            /* Other pilots. They are counted separately from maxAlive on
             * purpose: a map of five miners is not a map with eighteen
             * hostiles, and the population cap is a balance number for
             * hostiles. */
            pilots: 5,
            /* A pilot only takes the player on when it is clearly the
             * stronger ship. One tier is not enough - every raider in the
             * shallow sector outclasses a fresh pilot, and the intro has to
             * stay survivable. */
            pilotAggression: 2,
            /* How close a pilot has to get to a rock to start cutting it. */
            mineRange: 230,
            /* How close to the station it banks. */
            dockRange: 260,
            mineTime: 0.42,
        },

        /* Energy is the upgrade currency; crystals are progress + score and
         * drive which NPC tiers the sector rolls. */
        economy: {
            energyPerKill: 1.0,
            crystalsPerKill: 1.0,
            /* Crystals earned -> the highest NPC tier the sector will spawn.
             * This has to track the energy curve. At 190 the sector took
             * nearly four hours to escalate while a ship took 45 minutes to
             * max out, so you finished the game hours before it noticed. */
            tierStep: 45,
        },

        camera: {
            /* The camera is fitted to the viewport instead of being a fixed
             * zoom, so a phone and a desktop frame the same slice of the
             * sector. A fixed zoom that reads well on a phone shows three
             * times the world on a monitor, and a fixed zoom that reads well
             * on a monitor makes phones fight inside a letterbox. */
            viewSpan: 900,
            zoomMin: 0.34,
            zoomMax: 1.15,
            lead: 0.34,
            shakeDecay: 5.0,
        },

        pools: {
            bullets: 360,
            ammo: 60,
            missiles: 120,
            mines: 40,
            pickups: 320,
            particles: 420,
            floaters: 40,
        },

        quality: {
            /* Sampled over the first N frames to pick a tier on weak phones. */
            sampleFrames: 90,
            slowFrameMs: 23,
            tiers: {
                high: { stars: 3, particles: 1.0, outlines: true, nebula: true },
                medium: { stars: 2, particles: 0.55, outlines: true, nebula: true },
                low: { stars: 1, particles: 0.25, outlines: false, nebula: false },
            },
        },
    };

    /* ===== Modules =====
     * Upgrade tracks, levels 1..10. Level 1 is free and is what you respawn
     * with, so there is never a dead end.
     */
    S.MODULES = [
        {
            key: "blaster", name: "Blaster", glyph: "⌖",
            base: 30, mul: 1.44,
            blurb: "Bigger hits, shorter gaps between shots. Cuts armour, shrugs off shields.",
        },
        {
            key: "ammo", name: "Ammo", glyph: "▮",
            base: 62, mul: 1.46,
            blurb: "Heavy capacitor shot. Slow, brutal against shields, poor against armour.",
        },
        {
            key: "shield", name: "Shield", glyph: "◈",
            base: 34, mul: 1.44,
            blurb: "Absorbs incoming fire and refills once you are out of the fight.",
        },
        {
            key: "armor", name: "Armor", glyph: "▤",
            base: 40, mul: 1.46,
            blurb: "Flat damage cut. Useless against swarms, decisive against elites.",
        },
        {
            key: "processor", name: "Processor", glyph: "◎",
            base: 36, mul: 1.46,
            blurb: "Lifts the energy you pull out of every wreck and every crate.",
        },
        {
            key: "thruster", name: "Thruster", glyph: "➤",
            base: 26, mul: 1.40,
            blurb: "Raw speed and a tighter turn.",
        },
        {
            key: "cargo", name: "Cargo", glyph: "▣",
            base: 30, mul: 1.42,
            blurb: "How much energy you can carry at once. Bigger trips, bigger wrecks.",
        },
        {
            key: "missiles", name: "Missiles", glyph: "⋀",
            base: 70, mul: 1.46,
            blurb: "Lock-on burst. Splash damage cuts through a formation.",
        },
        {
            key: "mines", name: "Mines", glyph: "◉",
            base: 45, mul: 1.44,
            blurb: "Drop proximity mines. The only defence that works while you flee.",
        },
        {
            key: "plasma", name: "Plasma", glyph: "✸",
            base: 68, mul: 1.46,
            blurb: "A heavy round that goes THROUGH shields. Slow, and the only thing that answers a shielded hull.",
        },
    ];

    S.MODULE_MAX = 10;

    /* ===== The auto-turret =====
     *
     * A thing bolted to the ship that shoots on its own. It is the oldest
     * idea in the genre and it is here because it earns its place: it
     * covers the player's back while they are busy with something else,
     * and it costs them nothing but the rounds it burns.
     *
     * The rounds are the point. A free turret would be a free gun, and the
     * laser track would be dead on arrival - so the turret draws on the
     * SAME magazine the player does. That makes it a real decision: a
     * turret that is shooting is a turret eating the rounds you were
     * going to shoot with. */
    S.TURRET = {
        key: "turret", name: "Auto-Turret", glyph: "✜",
        cost: 1400,
        /* How far it can reach, and how long it waits between shots. */
        range: 340,
        interval: 0.85,
        /* A turret is not a gunner. It is a mounted weapon on a moving
         * platform, and it shoots at whatever is nearest. */
        damageScale: 0.6,
    };

    /* ===== Munitions =====
     *
     * Every gun draws from a magazine, and a magazine is filled from a
     * stockpile in the hangar. The stockpile is the reserve; the magazine is
     * what the ship actually brought, and it is lost with the ship.
     *
     * The costs are what keep the tracks honest. A laser round has to be
     * cheap or the blaster becomes a tax on playing the game at all, and
     * the heavy guns have to cost enough that a maxed blaster is still the
     * better answer to a bare hull - the Ammo track only exists because a
     * shield is a real problem, and it has to be worth paying for.
     */
    S.MUNITIONS = [
        {
            key: "laser", name: "Laser Rounds", glyph: "⌖", weapon: "blaster",
            blurb: "For the laser. Cheap, plentiful, and the answer to a bare hull.",
        },
        {
            key: "ammo", name: "Capacitor Rounds", glyph: "▮", weapon: "ammo",
            blurb: "For the capacitor round. The answer to a shield.",
        },
        {
            key: "plasma", name: "Plasma Rounds", glyph: "✸", weapon: "plasma",
            blurb: "For the plasma round. Goes through shields, and is slow.",
        },
        {
            key: "missiles", name: "Missiles", glyph: "⋀", weapon: "missiles",
            blurb: "For the salvo. A whole burst, and the splash hits everything near it.",
        },
        {
            key: "mines", name: "Mines", glyph: "◉", weapon: "mines",
            blurb: "For the mines. The only defence that works while you are fleeing.",
        },
    ];

    S.munition = function (key) {
        for (var i = 0; i < S.MUNITIONS.length; i++) {
            if (S.MUNITIONS[i].key === key) return S.MUNITIONS[i];
        }
        return null;
    };

    /* ===== Refits =====
     * The crystal sink. Crystals used to be pure score, which meant the only
     * thing they did was make the sector harder - a number going up with no
     * choice attached to it. Refits are permanent, non-stackable-with-
     * everything purchases, and each one changes how the rest of the game
     * behaves rather than adding a bigger number to a stat.
     */
    S.REFITS = [
        {
            key: "salvage", name: "Salvage Rig", glyph: "⌾", max: 3,
            cost: [180, 520, 1400],
            blurb: "Recovers part of the energy you lose when you are wrecked.",
            detail: function (n) { return Math.round(14 * n) + "% of lost energy recovered"; },
        },
        {
            key: "hull", name: "Frame Plating", glyph: "▦", max: 3,
            cost: [150, 430, 1150],
            blurb: "Bolted-on plate. Permanent, applies to every rebuild.",
            detail: function (n) { return "+" + (4 * n) + "% max hull"; },
        },
        {
            key: "tow", name: "Tractor Field", glyph: "⊂", max: 2,
            cost: [220, 640],
            blurb: "Pulls loot in from further away.",
            detail: function (n) { return "+" + (35 * n) + "% pickup radius"; },
        },
        {
            key: "survey", name: "Survey Suite", glyph: "⊞", max: 2,
            cost: [260, 720],
            blurb: "Better contract terms from the station.",
            detail: function (n) { return "contracts pay +" + (20 * n) + "%"; },
        },
        {
            key: "broker", name: "Broker Contact", glyph: "§", max: 2,
            cost: [300, 820],
            blurb: "Bounties on your head are worth more to everyone.",
            detail: function (n) { return "bounty value +" + (30 * n) + "%"; },
        },
    ];

    S.refitLevel = function (refits, key) {
        var v = refits && refits[key];
        return Number.isFinite(v) ? S.clamp(Math.floor(v), 0, S.MODULE_MAX) : 0;
    };

    S.refitCost = function (key, level) {
        for (var i = 0; i < S.REFITS.length; i++) {
            if (S.REFITS[i].key !== key) continue;
            var r = S.REFITS[i];
            if (level >= r.max) return Infinity;
            return r.cost[Math.min(level, r.cost.length - 1)];
        }
        return Infinity;
    };

    /* Safe level read. A save written before a track existed has no entry
     * for it, and reading undefined here produced NaN prices and NaN tiers
     * rather than a missing module. */
    S.moduleLevel = function (modules, key) {
        var v = modules && modules[key];
        return Number.isFinite(v) ? S.clamp(Math.floor(v), 1, S.MODULE_MAX) : 1;
    };

    S.moduleIndex = function (key) {
        for (var i = 0; i < S.MODULES.length; i++) if (S.MODULES[i].key === key) return i;
        return -1;
    };

    /* Price of the *next* level, given the level you already own. */
    S.moduleCost = function (key, level) {
        var m = null;
        for (var i = 0; i < S.MODULES.length; i++) {
            if (S.MODULES[i].key === key) { m = S.MODULES[i]; break; }
        }
        if (!m || level >= S.MODULE_MAX) return Infinity;
        return Math.round(m.base * Math.pow(m.mul, level - 1));
    };

    /* Total cost of taking a fresh level-1 ship to `level` on every track. */
    S.shipCost = function (level) {
        var total = 0;
        for (var i = 0; i < S.MODULES.length; i++) {
            for (var lv = 1; lv < level; lv++) {
                total += S.moduleCost(S.MODULES[i].key, lv);
            }
        }
        return total;
    };

    /* ===== Weapon profiles =====
     * The whole reason shields and armour are two separate pools instead of
     * one bigger hull: no single weapon is good at both.
     *
     * A `shield` coefficient above 1 means the weapon leans into energy
     * shields and only partly reaches the hull; below 1 means the shot mostly
     * bounces off a shielded target and lands once the shields are down.
     *
     * The laser is free - it is bolted to every ship. The ammo track costs
     * real energy, so its job is to be the answer to a specific problem, not
     * to be a strictly better gun. content.test.js asserts the crossover
     * exists and that it sits in the upper tiers, so these numbers cannot
     * quietly drift until one weapon is simply better.
     */
    S.WEAPONS = {
        blaster: { key: "blaster", name: "Laser", shield: 0.25, armor: 1.00 },
        ammo: { key: "ammo", name: "Ammo", shield: 3.00, armor: 0.65 },
        missile: { key: "missile", name: "Missile", shield: 0.60, armor: 1.10 },
        mine: { key: "mine", name: "Mine", shield: 2.00, armor: 0.50 },
        /* The plasma round is the third answer and the odd one out.
         *
         * A shot is normally stopped by a shield: the shield eats the
         * shot's shield component and holds off its armour component
         * entirely, which is what makes shields worth anything. A plasma
         * round PIERCES - its armour component lands on the hull even
         * while a shield is up.
         *
         * It is deliberately slow and heavy. A weapon that reaches
         * through shields AND carries more armour damage than the laser
         * would simply be a better laser; the point is that it answers a
         * shielded hull, not that it is the best gun in the game. */
        plasma: { key: "plasma", name: "Plasma", shield: 0.60, armor: 1.50, pierce: true },
    };

    /* Build a damage packet for a weapon profile at a given raw damage
     * number. Every source of damage in the game goes through here, so a new
     * weapon cannot accidentally ship as shield-only or armour-only by
     * forgetting a field.
     *
     * `pierce` rides on the packet rather than being looked up from the
     * weapon table at the point of damage, because the damage path is
     * handed a packet and nothing else. */
    S.packet = function (weapon, damage) {
        var w = S.WEAPONS[weapon] || S.WEAPONS.blaster;
        return {
            shield: damage * w.shield,
            armor: damage * w.armor,
            pierce: !!w.pierce,
        };
    };

    /* ===== Pilots =====
     * Other ships. They fly the same hulls you can buy, wear a pilot's paint
     * rather than a faction's, and they mine the same rocks you do - which is
     * the point. Before them the player was the only economic agent in the
     * world and every rock was free.
     *
     * Deliberately a palette of their own, checked against all six faction
     * colours: a pilot must never be mistakable for a hostile at a glance,
     * because the difference between "another miner" and "a Demaner" is the
     * whole reason they are worth looking at. */
    S.PILOT_COLORS = [
        "#5b7fb8", "#7a6fc0", "#4f8fa8", "#8c6f9e", "#6a8f7c",
        "#9a7a5c", "#6f7fb0", "#8a8f5c",
    ];

    /* ===== Modes =====
     * A mode is a sector VARIANT, not a new map. Same rocks, same station,
     * same contract board - different question. That is why it costs one row
     * instead of a second world generator, and why four sectors times three
     * modes is twelve ways to play out of the tables we already have.
     */
    S.MODES = [
        {
            id: "patrol", name: "PATROL", glyph: "◇",
            blurb: "No clock. Mine, fight, bank, come back when you want.",
            detail: "free run",
        },
        {
            id: "wave", name: "WAVE", glyph: "⋀",
            blurb: "A portal opens and keeps opening. Survive every wave to be paid.",
            detail: "8 waves · paid in crystals",
            waves: 8,
            /* Seconds between one wave clearing and the next opening. */
            gap: 16,
            /* How many hostiles ride in on wave one, and how many more each
             * wave after. A ramp, not a multiplier: wave 8 should feel like a
             * different fight, not the same one louder. */
            firstCount: 3,
            perWave: 2,
            /* Which faction answers the portal. Leaving it null means the
             * sector's own tier mix rolls it, so a Hive map really does send
             * you Hive. */
            faction: null,
            reward: 220,
        },
        {
            id: "haul", name: "HAUL", glyph: "▣",
            blurb: "One timer, one payload. Fill the hold and get back before it runs out.",
            detail: "150s · pay double for a full hold",
            time: 150,
            /* Fraction of the hold you have to land for the full payout. */
            payload: 0.7,
            rewardMul: 2.4,
        },
    ];

    S.mode = function (id) {
        if (!id) return S.MODES[0];
        for (var i = 0; i < S.MODES.length; i++) {
            if (S.MODES[i].id === id) return S.MODES[i];
        }
        return S.MODES[0];
    };

    /* ===== Hulls and parts =====
     * Two layers on top of the module tracks.
     *
     * The tracks are the broad stat engine you always end up buying. A HULL
     * is the silhouette: one passive that changes what the ship IS. A PART is
     * one fitted component per slot, owned across the whole hangar and
     * swappable between hulls for free.
     *
     * The rule that keeps the Ammo track alive is the one at the bottom of
     * this block: parts and hulls scale raw damage, and the shield/armour
     * packets are REBUILT from that raw damage afterwards. Nothing in the
     * hangar can shift a weapon's role, so no purchase can make the laser
     * strictly better than the round or the other way round.
     */
    S.HULL_SLOTS = ["engine", "laser", "shield"];

    /* Stats a hull or part multiplier is allowed to touch. Counts and
     * cooldowns are in here on purpose - "faster" has to be reachable -
     * but the damage PACKETS deliberately are not, and are rebuilt after. */
    S.SCALABLE = [
        "damage", "fireInterval",
        "ammoDamage", "ammoCooldown",
        "plasmaDamage", "plasmaCooldown",
        "missiles", "missileDamage", "missileCooldown",
        "mineCapacity", "mineDamage", "mineCooldown",
        "maxShield", "shieldRegen",
        "maxHull", "regen",
        "reduction",
        "holdMax", "energyBonus",
        "speed", "turn",
    ];

    /* Counts round to whole numbers; everything else is a continuous stat.
     * Without this a +0.9 speed engine would end up firing zero missiles. */
    S.INTEGER_STATS = {
        missiles: 1, mineCapacity: 1, maxShield: 1, maxHull: 1, holdMax: 1, reduction: 1,
    };

    S.applyMods = function (stats, mods) {
        if (!mods) return stats;
        for (var i = 0; i < S.SCALABLE.length; i++) {
            var k = S.SCALABLE[i];
            var m = mods[k];
            if (!Number.isFinite(m)) continue;
            stats[k] = (stats[k] || 0) * m;
        }
        return stats;
    };

    S.applyGain = function (stats, gain, level) {
        if (!gain || !Number.isFinite(level)) return stats;
        for (var k in gain) {
            if (Number.isFinite(stats[k])) stats[k] += gain[k] * level;
        }
        return stats;
    };

    /* Rebuild every damage packet from the (possibly scaled) raw numbers.
     * This is what makes the whole hangar system safe: a part can double the
     * size of a shot and the shot is still, exactly, the same shot. */
    S.resealPackets = function (stats) {
        stats.blasterPacket = S.packet("blaster", stats.damage);
        stats.ammoPacket = S.packet("ammo", stats.ammoDamage);
        stats.plasmaPacket = S.packet("plasma", stats.plasmaDamage);
        stats.missilePacket = S.packet("missile", stats.missileDamage);
        stats.minePacket = S.packet("mine", stats.mineDamage);
        for (var k in S.INTEGER_STATS) {
            if (Number.isFinite(stats[k])) stats[k] = Math.max(0, Math.round(stats[k]));
        }
        return stats;
    };

    S.hull = function (id) {
        if (!id) return S.HULLS[0];
        for (var i = 0; i < S.HULLS.length; i++) {
            if (S.HULLS[i].id === id) return S.HULLS[i];
        }
        return S.HULLS[0];
    };

    S.part = function (key) {
        if (!key) return null;
        for (var i = 0; i < S.PARTS.length; i++) {
            if (S.PARTS[i].key === key) return S.PARTS[i];
        }
        return null;
    };

    S.partsForSlot = function (slot) {
        return S.PARTS.filter(function (p) { return p.slot === slot; });
    };

    /* ----- Hulls ----- */
    S.HULLS = [
        {
            id: "wasp", name: "WASP", tag: "INTR", glyph: "⌁",
            cost: 0, color: "#e2604f",
            passive: "Needle",
            blurb: "Half a cargo bay and the fastest hull in the hangar.",
            detail: "hold −35% · speed +20% · turn +35%",
            mods: { holdMax: 0.65, speed: 1.20, turn: 1.35 },
        },
        {
            id: "hauler", name: "HAULER", tag: "CARGO", glyph: "▤",
            cost: 700, color: "#3f9ed4",
            passive: "Deep Hold",
            blurb: "Built to bring energy home, and to survive the trip.",
            detail: "hold +65% · shield −22% · speed −10%",
            mods: { holdMax: 1.65, maxShield: 0.78, speed: 0.90 },
        },
        {
            id: "warden", name: "WARDEN", tag: "PATROL", glyph: "◈",
            cost: 900, color: "#43b58c",
            passive: "Recovery",
            blurb: "Shields that come back faster than anything else flies.",
            detail: "shield regen ×2.1 · hull −8%",
            mods: { shieldRegen: 2.10, maxHull: 0.92 },
        },
        {
            id: "bulwark", name: "BULWARK", tag: "HEAVY", glyph: "▦",
            cost: 1300, color: "#c25fb0",
            passive: "Plated",
            blurb: "Slow, wide, and extremely difficult to hurry.",
            detail: "hull +28% · +6 armour · speed −14%",
            mods: { maxHull: 1.28, speed: 0.86 },
            bonus: { reduction: 6 },
        },
        {
            id: "vandal", name: "VANDAL", tag: "GUNBOAT", glyph: "⌖",
            cost: 1500, color: "#e8913f",
            passive: "Overbore",
            blurb: "Trades its own plating for a heavier gun.",
            detail: "every gun +6 · shield −20% · hull +6%",
            mods: { maxShield: 0.80, maxHull: 1.06 },
            /* Symmetric on purpose: an asymmetric flat bonus would tilt the
             * laser-versus-round comparison, and this hull is in the hangar
             * matrix test for exactly that reason. */
            bonus: { damage: 6, ammoDamage: 6, plasmaDamage: 6 },
        },
        {
            id: "lance", name: "LANCE", tag: "ESCORT", glyph: "◇",
            cost: 2000, color: "#5a76d6",
            passive: "Close Cover",
            blurb: "Keeps a bigger field and refills it faster. An escort that can pay for itself.",
            detail: "shield +15% · regen +20% · speed +6%",
            mods: { maxShield: 1.15, shieldRegen: 1.20, speed: 1.06 },
        },
        {
            id: "hound", name: "HOUND", tag: "BRAWLER", glyph: "✖",
            cost: 2400, color: "#d94f76",
            passive: "Brawler",
            blurb: "Turns like a wasp and hits like a door. Holds almost nothing.",
            detail: "hull +15% · turn +20% · +4 armour · hold −15%",
            mods: { maxHull: 1.15, turn: 1.20, holdMax: 0.85 },
            bonus: { reduction: 4 },
        },
        {
            id: "oracle", name: "ORACLE", tag: "PROSPECTOR", glyph: "◎",
            /* The economic hull, and deliberately the only late hull that
             * touches nothing to do with guns: one that boosted a weapon
             * would have to boost BOTH of them symmetrically to leave the
             * laser-versus-round comparison alone, and "mines rocks richer"
             * is a far more interesting identity than "shoots 6% harder".
             * It plays with the cargo hold instead. */
            cost: 2800, color: "#7fc45a",
            passive: "Prospector",
            blurb: "Reads the rock. Every crate and every wreck comes back a third richer.",
            detail: "loot yield ×1.35 · hold +20% · shield −10%",
            mods: { energyBonus: 1.35, holdMax: 1.20, maxShield: 0.90 },
        },
    ];

    /* ----- Parts: three fitted components, nine in total -----
     *
     * THE LASER SLOT RULE. A weapon part may change rate and damage freely,
     * but it must apply THE SAME FACTORS to every gun on the mount - the
     * blaster, the capacitor round and the plasma round. Because every
     * build then scales by the same factor, the laser-versus-round
     * comparison is preserved exactly - and that comparison is the only
     * thing keeping the Ammo track alive.
     *
     * It is also what these parts physically mean: the slot is the weapon
     * MOUNT, and it upgrades everything bolted to it. An earlier draft made
     * Pulse and Rail speed up the blaster alone, and content.test.js caught
     * it immediately: nine tenths of the fit-outs had the round stop being
     * worth buying, purely because of which gun a cosmetic part happened to
     * buff.
     */
    S.PARTS = [
        {
            key: "needle", slot: "engine", name: "Needle", glyph: "➤",
            cost: 260,
            blurb: "Thin, fast, and almost no torque past the halfway mark.",
            detail: "speed ×1.18 · turn ×1.25 · hold ×0.80",
            mods: { speed: 1.18, turn: 1.25, holdMax: 0.80 },
            gain: { speed: 6, turn: 0.14 },
        },
        {
            key: "haulerdrive", slot: "engine", name: "Hauler Drive", glyph: "▣",
            cost: 300,
            blurb: "Nothing clever. Just carries an enormous amount of nothing.",
            detail: "hold ×1.45 · speed ×0.90",
            mods: { holdMax: 1.45, speed: 0.90 },
            gain: { holdMax: 70 },
        },
        {
            key: "anvil", slot: "engine", name: "Anvil", glyph: "▦",
            cost: 320,
            blurb: "A drive bolted to a brick. Turns like a filing cabinet.",
            detail: "hull ×1.20 · speed ×0.92",
            mods: { maxHull: 1.20, speed: 0.92, turn: 0.94 },
            gain: { maxHull: 9, reduction: 1.2 },
        },

        {
            key: "pulse", slot: "laser", name: "Pulse", glyph: "⌖",
            cost: 240,
            blurb: "Spits small rounds very, very quickly. Shreds swarms.",
            detail: "every gun: rate ×1.61 · damage ×1.08",
            mods: {
                fireInterval: 0.62, damage: 1.08,
                ammoCooldown: 0.62, ammoDamage: 1.08,
                plasmaCooldown: 0.62, plasmaDamage: 1.08,
            },
            gain: { damage: 1.1, ammoDamage: 1.1, plasmaDamage: 1.1 },
        },
        {
            key: "rail", slot: "laser", name: "Rail", glyph: "▮",
            cost: 380,
            blurb: "One enormous bolt, a long time between them. Built for elites.",
            detail: "every gun: rate ×0.65 · damage ×1.85",
            mods: {
                fireInterval: 1.55, damage: 1.85,
                ammoCooldown: 1.55, ammoDamage: 1.85,
                plasmaCooldown: 1.55, plasmaDamage: 1.85,
            },
            gain: { damage: 2.6, ammoDamage: 2.6, plasmaDamage: 2.6 },
        },
        {
            key: "splitter", slot: "laser", name: "Splitter", glyph: "⋀",
            cost: 420,
            blurb: "A wide bus split across both mounts. No weakness either way.",
            detail: "every gun: rate ×1.25 · damage ×1.18",
            mods: {
                fireInterval: 0.80, damage: 1.18,
                ammoCooldown: 0.80, ammoDamage: 1.18,
                plasmaCooldown: 0.80, plasmaDamage: 1.18,
            },
            gain: { damage: 1.6, ammoDamage: 1.6, plasmaDamage: 1.6 },
        },

        {
            key: "deflector", slot: "shield", name: "Deflector", glyph: "◈",
            cost: 280,
            blurb: "A very big pool that takes its time filling back up.",
            detail: "shield ×1.40 · regen ×0.70",
            mods: { maxShield: 1.40, shieldRegen: 0.70 },
            gain: { maxShield: 11 },
        },
        {
            key: "reactive", slot: "shield", name: "Reactive", glyph: "✦",
            cost: 300,
            blurb: "Small, fast, and almost always back before you need it.",
            detail: "shield ×0.78 · regen ×2.30",
            mods: { maxShield: 0.78, shieldRegen: 2.30 },
            gain: { shieldRegen: 1.4 },
        },
        {
            key: "ablative", slot: "shield", name: "Ablative", glyph: "▤",
            cost: 340,
            blurb: "No field at all. Just plate, and the armour to use it.",
            detail: "shield ×0.60 · +4 armour, rising with level",
            mods: { maxShield: 0.60 },
            gain: { reduction: 4, maxShield: 5 },
        },
    ];

    /* Part levels cost like module levels: a flat base scaled by a shared
     * multiplier, so the hangar competes for the same energy as everything
     * else instead of sitting outside the economy. */
    S.PART_MAX = 10;

    S.partCost = function (key, level) {
        var p = S.part(key);
        if (!p) return Infinity;
        if (level >= S.PART_MAX) return Infinity;
        return Math.round(p.cost * Math.pow(1.38, level));
    };

    /* ===== Factions =====
     * Six kinds of hostile, distinguished by colour so the map reads at a
     * glance instead of being an undifferentiated mob. They are also hostile
     * to each other, which is what stops a quiet corner from staying quiet.
     *
     * `shieldFrac` is the load-bearing number in the whole table: it is what
     * decides whether the laser or the capacitor round is the right gun, and
     * the hangar matrix test walks every one of them to prove it still flips.
     *
     * `ai` picks the behaviour branch in npcs.js. A seventh faction means a
     * row here, not an edit to the AI.
     */
    S.FACTIONS = [
        {
            key: "raider", name: "Raider", tag: "RAID",
            color: "#f4a23f", hue: 32,
            blurb: "Scrap hulls and loose guns.",
            note: "No shields at all. The laser answers these.",
            shieldFrac: 0.00, ai: "swarm",
            dmgMul: 1.00, hullMul: 0.85, speedMul: 1.00,
        },
        {
            key: "drone", name: "Drone", tag: "DRN",
            color: "#9ae66e", hue: 88,
            blurb: "Pins. Fragile, endless, and unwilling to stop.",
            note: "Faint shields. Cheap to kill, ruinous in numbers.",
            shieldFrac: 0.30, ai: "swarm",
            /* The swarm trade: paper hulls that hit softly, so all of the
             * danger is in how many of them arrive at once. */
            dmgMul: 0.70, hullMul: 0.55, speedMul: 1.35,
        },
        {
            key: "pirate", name: "Pirate", tag: "PIR",
            color: "#ff5470", hue: 350,
            blurb: "Pogo-faction raiders. Shielded, and they hit hard.",
            note: "Half-shielded. Either weapon wins — that is the point.",
            shieldFrac: 0.50, ai: "brawl",
            dmgMul: 1.05, hullMul: 1.00, speedMul: 1.00,
        },
        {
            key: "cruiser", name: "Cruiser", tag: "CRS",
            color: "#4a9fe0", hue: 205,
            blurb: "Long guns and long legs. Fights at the far edge of range.",
            note: "Light shields on a big hull. Keep your distance.",
            shieldFrac: 0.35, ai: "kite",
            dmgMul: 1.00, hullMul: 1.30, speedMul: 1.15,
        },
        {
            key: "alien", name: "Alien", tag: "ALI",
            color: "#8a5fd0", hue: 275,
            blurb: "Deep-space Demaner. Enormous shields, thin armour.",
            note: "Shield-dominant. Bring ammo, not lasers.",
            shieldFrac: 0.80, ai: "wall",
            /* Slow, but each one landed hurts like a warlord. */
            dmgMul: 1.15, hullMul: 0.80, speedMul: 0.92,
        },
        {
            key: "hive", name: "Hive", tag: "HIV",
            color: "#e05fa8", hue: 325,
            blurb: "A structure that fights back. It builds its own.",
            note: "Almost pure shield. Nothing but the round gets through.",
            shieldFrac: 0.95, ai: "boss",
            dmgMul: 1.60, hullMul: 2.20, speedMul: 0.75,
        },
    ];

    S.faction = function (key) {
        for (var i = 0; i < S.FACTIONS.length; i++) {
            if (S.FACTIONS[i].key === key) return S.FACTIONS[i];
        }
        return S.FACTIONS[0];
    };

    /* Every faction is hostile to every other one and to the player. That is
     * the genre default, and it is also what lets the sector run its own
     * wars while you are docked. */
    S.factionHostile = function (a, b) {
        if (!a || !b) return false;
        return a !== b;
    };

    /* Shield pool for a hostile: a fraction of its hull, set by faction.
     *
     * This is the knob that makes the Ammo track a decision rather than an
     * upgrade. A raider is bare, so lasers delete it and ammo is dead
     * weight; an alien is shield-dominant, so lasers bounce and ammo is the
     * only thing that works. Pirates sit deliberately on the crossover.
     *
     * content.test.js computes time-to-kill for both weapons at equal
     * investment and asserts the direction flips between raider and alien,
     * so these fractions cannot drift until one weapon is simply better. */
    S.npcShieldFor = function (hull, factionKey) {
        return Math.round(hull * S.faction(factionKey).shieldFrac);
    };

    /* Which factions turn up at which tier. The deeper you fly, the more of
     * the sector is Demaner, so escalation is not only "bigger numbers" - it
     * is also "the thing that punishes the build you already have". */
    S.FACTION_MIX = [
        null,
        { raider: 0.80, pirate: 0.20, alien: 0.00 },
        { raider: 0.62, pirate: 0.34, alien: 0.04 },
        { raider: 0.48, pirate: 0.38, alien: 0.14 },
        { raider: 0.36, pirate: 0.40, alien: 0.24 },
        { raider: 0.26, pirate: 0.40, alien: 0.34 },
        { raider: 0.18, pirate: 0.36, alien: 0.46 },
        { raider: 0.12, pirate: 0.30, alien: 0.58 },
        { raider: 0.08, pirate: 0.24, alien: 0.68 },
    ];

    S.pickFaction = function (tier, rng) {
        var mix = S.FACTION_MIX[S.clamp(tier | 0, 1, S.FACTION_MIX.length - 1)];
        var r = (rng || Math.random)();
        var acc = 0;
        for (var i = 0; i < S.FACTIONS.length; i++) {
            acc += mix[S.FACTIONS[i].key] || 0;
            if (r <= acc) return S.FACTIONS[i];
        }
        return S.FACTIONS[0];
    };

    /* ===== CPUs =====
     * Active abilities, bought once and equipped one at a time. One slot is
     * not a limitation to work around, it is the decision: which tool you
     * are carrying when you undock.
     */
    S.CPUS = [
        {
            key: "insta", name: "Insta-Shield", glyph: "◉",
            cost: 320,
            cooldown: 40,
            energy: 0,
            blurb: "Total invulnerability for three seconds.",
            detail: function () { return S.CONFIG.cpu.instaShield + "s invulnerable · " + "40s cooldown"; },
        },
        {
            key: "radar", name: "Radar", glyph: "◎",
            cost: 260,
            cooldown: 34,
            energy: 15,
            blurb: "Every hostile on the minimap, including ones you cannot see.",
            detail: function () { return S.CONFIG.cpu.radarTime + "s reveal · 15 ⚡ per use"; },
        },
        {
            key: "warp", name: "Warp", glyph: "➤",
            cost: 240,
            cooldown: 11,
            energy: 20,
            blurb: "Jump three hundred units along your nose. Brief immunity in transit.",
            detail: function () { return "300u dash · 11s cooldown · 20 ⚡"; },
        },
        {
            key: "leech", name: "Energy Leech", glyph: "✦",
            cost: 480,
            cooldown: 44,
            energy: 0,
            blurb: "A quarter of everything you damage comes back as shield.",
            detail: function () { return "25% damage leeched · 44s cooldown"; },
        },
        {
            key: "repair", name: "Repair Patch", glyph: "✚",
            cost: 400,
            cooldown: 50,
            energy: 30,
            blurb: "Patch the hull back together while you keep flying.",
            detail: function () { return "6.5 hull/s · 50s cooldown · 30 ⚡"; },
        },
        {
            key: "cloak", name: "Cloak", glyph: "◌",
            cost: 300,
            cooldown: 38,
            energy: 10,
            blurb: "Nobody can see you. Nothing already in the air can still hit you.",
            detail: function () { return S.CONFIG.cpu.cloakTime + "s unseen · 38s cooldown · 10 ⚡"; },
        },
    ];

    S.cpu = function (key) {
        if (!key) return null;
        for (var i = 0; i < S.CPUS.length; i++) {
            if (S.CPUS[i].key === key) return S.CPUS[i];
        }
        return null;
    };

    S.cpuCost = function (key) {
        var c = S.cpu(key);
        return c ? c.cost : Infinity;
    };

    /* ===== Derived ship stats =====
     * One place that turns module levels into the numbers the sim reads, so
     * the station screen and the physics can never disagree.
     */
    S.statsFor = function (lv, refits, parts, hullId) {
        /* `lv` may come from an older save that predates the ammo and cargo
         * tracks; treat a missing level as 1 rather than NaN. */
        var g = function (k) { return S.moduleLevel(lv, k); };

        var blasterDmg = 3 + g("blaster") * 2.3;
        var missileDmg = 6 + g("missiles") * 5.5;
        var mineDmg = 10 + g("mines") * 8;
        /* The capacitor round. Big per shot, slow between shots, and scaled
         * so that it answers a tier-6+ shield rather than quietly replacing
         * the laser as the best gun in the game. */
        var ammoDmg = 14 + g("ammo") * 10;
        /* The plasma round. It pierces, so it answers a shielded hull - but
         * it is slow and its per-shot damage is below the laser's rate of
         * fire, so it is an answer to a problem rather than a better gun.
         * The numbers are set so that at level 1 it is worse than the
         * laser against armour and better against anything shielded. */
        var plasmaDmg = 12 + g("plasma") * 8;

        /* Frame Plating is multiplicative on purpose: it stays the
         * cheapest-per-point option once Shield is invested in, which
         * is the decision a player is actually making. */
        var maxHull = Math.round((58 + g("shield") * 27) * (1 + S.refitLevel(refits, "hull") * 0.04));

        /* Built into a named binding, not returned inline: the hangar layers
         * below have to fold into these numbers before anything sees them. */
        var stats = {
            /* Damage packets, resolved once here so the station screen and
             * the physics read the same numbers and can never disagree. */
            damage: blasterDmg,
            blasterPacket: S.packet("blaster", blasterDmg),
            ammoDamage: ammoDmg,
            ammoPacket: S.packet("ammo", ammoDmg),
            ammoCooldown: Math.max(0.9, 2.6 - g("ammo") * 0.16),
            /* The plasma round: slow, heavy, and the only gun that reaches
             * through a shield. */
            plasmaDamage: plasmaDmg,
            plasmaPacket: S.packet("plasma", plasmaDmg),
            plasmaCooldown: Math.max(1.4, 3.4 - g("plasma") * 0.18),
            fireInterval: Math.max(0.1, 0.44 - g("blaster") * 0.032),
            /* Missiles: a burst rather than a stream. Count and per-missile
             * damage scale together, so the track keeps mattering at level 10
             * instead of being a one-shot unlock. */
            missiles: Math.round(g("missiles") * 0.9),
            missileDamage: missileDmg,
            missilePacket: S.packet("missile", missileDmg),
            missileCooldown: Math.max(1.1, 6.5 - g("missiles") * 0.55),
            /* Mines: how many fit in the field and how much one hurts. */
            mineCapacity: Math.round(g("mines") * 0.8),
            mineDamage: mineDmg,
            minePacket: S.packet("mine", mineDmg),
            mineRadius: 90 + g("mines") * 8,
            mineSpeed: 118,
            mineCooldown: Math.max(0.7, 3.2 - g("mines") * 0.25),
            /* Shields absorb, armour does not. Both ride the Shield track: a
             * pilot who invested in staying alive should get the whole
             * survival package, not half of it. */
            maxShield: Math.round(maxHull * (0.45 + g("shield") * 0.035)),
            shieldRegen: S.CONFIG.shield.regenRate * (0.7 + g("shield") * 0.06),

            maxHull: maxHull,
            /* Regen only trickles back once Shield 3 is fitted, so the first
             * two shield levels feel like the real purchases. */
            regen: g("shield") >= 3 ? 0.9 + (g("shield") - 2) * 0.75 : 0.55,
            /* Flat cut, deliberately allowed to exceed a cheap NPC's whole
             * shot - armour is an anti-elite tool, not an anti-tier-1 tool. */
            reduction: g("armor") * 3.4,
            /* The hold. Energy is carried, not owned: this is the ceiling on
             * one trip, not a number that grows on its own. */
            holdMax: Math.round(S.CONFIG.cargo.base + (g("cargo") - 1) * S.CONFIG.cargo.step),

            energyBonus: 1 + g("processor") * 0.075,
            speed: 122 + g("thruster") * 7.5,
            turn: 3.0 + g("thruster") * 0.17,
        };

        /* The hangar layers, in a fixed order so a hull's silhouette always
         * reads as the hull rather than as whichever part is bolted on.
         *
         *   1. flat gain per part level   (an engine's raw numbers)
         *   2. part multipliers           (what the component IS)
         *   3. hull multipliers           (what the ship IS)
         *
         * Hull last on purpose: a Wasp's short hold is the Wasp's defining
         * problem, and a Hauler Drive should not be able to pretend it is
         * not. If the hull went first, buying the best engine would quietly
         * erase the cost of picking the wrong ship. */
        if (parts) {
            for (var s = 0; s < S.HULL_SLOTS.length; s++) {
                var fitted = parts[S.HULL_SLOTS[s]];
                if (!fitted) continue;
                var def = S.part(fitted.key);
                if (!def) continue;
                S.applyGain(stats, def.gain, fitted.level);
                S.applyMods(stats, def.mods);
            }
        }

        /* Strict lookup, deliberately NOT S.hull(): that falls back to the
         * first hull, which would silently hand the Wasp's hold penalty and
         * speed bonus to every one-argument statsFor call in the codebase -
         * price screens, the sim test, the balance notes. A call that does
         * not name a hull gets no hull. */
        for (var h = 0; h < S.HULLS.length; h++) {
            if (S.HULLS[h].id !== hullId) continue;
            S.applyGain(stats, S.HULLS[h].bonus, 1);
            S.applyMods(stats, S.HULLS[h].mods);
            break;
        }

        /* Last, and never optional: the packets are rebuilt from the scaled
         * raw damage, so every hull and part combination produces a shot
         * with exactly the shield/armour split its weapon is defined to
         * have. Nothing bought in the hangar can change what a gun is FOR. */
        return S.resealPackets(stats);
    };

    /* The four things a ship's stats depend on, read off the ship itself.
     * One call site so a live ship and a price screen can never disagree. */
    S.shipStats = function (ship) {
        return S.statsFor(ship.modules, ship.refits, ship.parts, ship.hullId);
    };

    S.levelSum = function (lv) {
        var n = 0;
        for (var i = 0; i < S.MODULES.length; i++) n += S.moduleLevel(lv, S.MODULES[i].key);
        return n;
    };

    /* Tier 1..5 over levels 5..50. Feeds the "sector escalation" readout,
     * the repair bill and the tier of every pilot the sector throws at you.
     *
     * The constant is relative to the number of tracks, and it has to be.
     * The level sum counts every track, and every track starts at level 1
     * for free, so adding a tenth track would otherwise hand every ship in
     * the game a free level - and a free level is a free tier, which is
     * stronger pilots and a more expensive repair bill for every pilot who
     * ever launches.
     *
     * `MODULES.length - 4` keeps the mapping identical to the one the
     * nine-track table was calibrated against: a ship with every track at
     * level 1 is tier 1, and a ship with every track at level 10 is tier 5,
     * whatever the table happens to contain today.
     */
    S.tierForShip = function (lv) {
        return S.clamp(
            1 + Math.floor((S.levelSum(lv) - (S.MODULES.length - 4)) / 15.5), 1, 5);
    };

    /* Highest NPC tier the sector will roll, given lifetime crystals. */
    S.tierForCrystals = function (crystals) {
        return S.clamp(
            1 + Math.floor(crystals / S.CONFIG.economy.tierStep),
            1, S.CONFIG.npc.maxTier
        );
    };

    /* ===== NPC tiers =====
     * One table drives hull, damage, speed and payout, so a new tier is a
     * single row and the AI never has to know the formula.
     */
    S.NPC_TIERS = [
        null,
        { name: "Scrap Drone",   hull: 34,  damage: 2.2, speed: 104, turn: 2.3, fire: 0.58, aim: 0.30, hull_px: 13 },
        { name: "Raider",        hull: 58,  damage: 3.3, speed: 112, turn: 2.4, fire: 0.53, aim: 0.26, hull_px: 15 },
        { name: "Corsair",       hull: 92,  damage: 4.8, speed: 119, turn: 2.5, fire: 0.47, aim: 0.22, hull_px: 17 },
        { name: "Interceptor",   hull: 142, damage: 6.8, speed: 125, turn: 2.7, fire: 0.42, aim: 0.18, hull_px: 19 },
        { name: "Frigate",       hull: 214, damage: 9.4, speed: 130, turn: 2.9, fire: 0.37, aim: 0.15, hull_px: 22 },
        { name: "Dreadnought",   hull: 318, damage: 13.0, speed: 133, turn: 3.1, fire: 0.33, aim: 0.12, hull_px: 25 },
        { name: "Warlord",       hull: 452, damage: 17.5, speed: 137, turn: 3.3, fire: 0.29, aim: 0.10, hull_px: 28 },
        { name: "Reaper",        hull: 640, damage: 23.5, speed: 141, turn: 3.5, fire: 0.25, aim: 0.08, hull_px: 31 },
    ];

    /* The range at which an NPC will commit to a fight. It lives here rather
     * than inline in npcs.js because the render test asserts that it always
     * fits inside the fitted camera view - a duplicated literal would drift
     * the moment either side was tuned. */
    S.aggroRange = function (tier) {
        return 260 + tier * 22;
    };

    S.npcPayout = function (tier) {
        return {
            energy: Math.round(16 * Math.pow(tier, 1.28)),
            crystals: Math.round(2 + tier * 1.7),
        };
    };

    /* ===== Hull colours =====
     * Hostile hulls used to be picked at random from a ten-entry palette,
     * which meant a sector was a confetti bag: nothing on screen told you
     * what you were shooting or whether it was the same mob as the thing
     * that shot you two seconds ago. Hull colour is now the faction's, read
     * off S.FACTIONS, so the map reads at a glance.
     *
     * Facet shading multiplies these, so they are picked a shade darker than
     * you want them to read on screen.
     */
    S.COLORS = {
        void: "#05070f",
        deep: "#0a1020",
        nebula: "#152242",
        grid: "#1d2b46",
        wall: "#3f6ea8",
        player: "#67e8f9",
        bullet: "#a5f3fc",
        npcBullet: "#ffb45e",
        /* The plasma round. Lime, so a piercing shot is unmistakable in a
         * fight where three other kinds of round are in the air - and
         * distinct from the capacitor round's violet, which is the other
         * slow heavy gun. */
        plasma: "#a3e635",
        /* The turret's tracer. Orange, so it is never mistaken for one of
         * the player's own shots. */
        turret: "#fb923c",
        energy: "#ffd166",
        crystal: "#7dd3fc",
        danger: "#ff5470",
        station: "#9fb3c8",
        stationLight: "#5eead4",
        rock: "#6b6f7a",
        rockRich: "#7c7186",
    };

    /* ===== Math helpers ===== */
    S.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
    S.lerp = function (a, b, t) { return a + (b - a) * t; };

    /* Camera shake, safe to call with no renderer attached (headless tests). */
    S.shake = function (n) {
        if (S.Render && typeof S.Render.shake === "function") S.Render.shake(n);
    };

    /* Shortest-arc angle interpolation, always in (-PI, PI]. */
    S.lerpAngle = function (a, b, t) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    };

    /* Signed shortest-arc difference from a to b. */
    S.angleDiff = function (a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    };

    S.rand = function (a, b) { return a + Math.random() * (b - a); };
    S.randInt = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
    S.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };

    S.dist2 = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy;
    };

    /* Frame-rate independent smoothing factor. */
    S.damp = function (dt, halfLife) {
        return 1 - Math.pow(2, -dt / Math.max(1e-4, halfLife));
    };

    /* ===== Deterministic RNG =====
     * Used to build the sector and the NPC roster so the same named rivals
     * show up on every run, on every device.
     */
    S.mulberry32 = function (seed) {
        var t = seed >>> 0;
        return function () {
            t = (t + 0x6d2b79f5) >>> 0;
            var r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    };

    S.hashString = function (str) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    };

    /* Smooth value-noise wobble so bots never fly like clockwork. */
    S.wander = function (t, phase) {
        return (
            Math.sin(t * 0.53 + phase) * 1.5 +
            Math.sin(t * 0.21 + phase * 2.7) * 2.1 +
            Math.sin(t * 0.097 + phase * 4.3) * 1.1
        );
    };

    S.fmt = function (n) {
        return Math.floor(n).toLocaleString("en-US");
    };

    /* Short callsigns so killfeed lines stay readable. */
    S.CALLSIGNS = [
        "Ash", "Vex", "Nomad", "Kite", "Drift", "Slate", "Pyre", "Husk",
        "Coil", "Verge", "Null", "Talon", "Quill", "Brine", "Cinder",
    ];
    S.SUFFIX = [
        "-1", "-7", "-9", "-X", "-Z", "MK2", "MK3", "II", "III", "IV",
        ".5", ".9", "_r", "_v2", "_s",
    ];

    /* Pass a seeded rng for a reproducible callsign, omit it for a fresh one.
     * The NPC roster uses the seeded form so the same named rivals turn up
     * on every run, on every device. */
    S.randomCallsign = function (rng) {
        var r = rng || Math.random;
        return S.CALLSIGNS[(r() * S.CALLSIGNS.length) | 0] +
            S.SUFFIX[(r() * S.SUFFIX.length) | 0];
    };

})(window.S7 = window.S7 || {});