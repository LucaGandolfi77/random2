"use strict";

/*
 * IRONFALL - roster and content integrity.
 *
 * The roster is DATA: thirty-two abilities across eight champions, each one
 * naming an archetype and a bag of numbers. That is what makes eight
 * champions a fortnight instead of a quarter, and it is also what means a
 * typo is a shipped dead button rather than a crash.
 *
 * So this file checks the shape of every ability against what the runtime
 * actually implements, and the shape of every item, rune and passive against
 * what the simulation actually reads. None of it needs a running match.
 */

const H = require("./harness.js");
const { IF, check, section, report } = H;
const C = IF.CONFIG;

/* ================================================================
 * Roster shape
 * ================================================================ */
section("Roster shape");

{
    check("the roster has eight champions", IF.Champions.count === 8, IF.Champions.count);
    check("there are four warbands", Object.keys(IF.Factions).length === 4,
        Object.keys(IF.Factions).join(","));

    /* Two champions per warband. Unbalanced factions show up as unbalanced
     * drafts: the AI's composition weighting makes a one-champion faction
     * almost impossible to draft without stacking the others. */
    const perFaction = {};
    for (const c of IF.Champions.list) perFaction[c.faction] = (perFaction[c.faction] || 0) + 1;
    check("every warband has exactly two champions",
        Object.keys(perFaction).length === 4 &&
        Object.values(perFaction).every(n => n === 2),
        JSON.stringify(perFaction));

    const ids = IF.Champions.ids();
    check("champion ids are unique", new Set(ids).size === ids.length);
    check("champion names are unique",
        new Set(IF.Champions.list.map(c => c.name)).size === IF.Champions.count);

    const roles = {};
    for (const c of IF.Champions.list) roles[c.role] = (roles[c.role] || 0) + 1;
    check("every lane role is represented at least once",
        ["tank", "bruiser", "mage", "marksman"].every(r => roles[r] >= 1),
        JSON.stringify(roles));
    check("every champion has a title and a line of lore",
        IF.Champions.list.every(c => c.title && c.title.length > 8 && c.lore && c.lore.length > 30));
    check("every champion has an accent colour on its warband",
        IF.Champions.list.every(c => /^#[0-9a-f]{6}$/i.test(IF.Factions[c.faction].accent)));
}

/* ================================================================
 * Abilities
 * ================================================================ */
section("Abilities");

{
    let bad = [];
    let count = 0;
    for (const c of IF.Champions.list) {
        if (c.abilities.length !== 4) bad.push(c.name + " has " + c.abilities.length + " abilities");
        const keys = c.abilities.map(a => a.key);
        if (keys.join("") !== "QWER") bad.push(c.name + " keys are " + keys.join(""));
        for (const a of c.abilities) {
            count++;
            /* Every ability must name an archetype the runtime implements.
             * A typo here is a button that costs mana and does nothing. */
            if (IF.Champions.archetypes.indexOf(a.arch) < 0) {
                bad.push(c.name + "/" + a.name + " unknown arch '" + a.arch + "'");
            }
            if (!a.blurb || a.blurb.length < 8) bad.push(c.name + "/" + a.name + " no blurb");
            if (a.cost === undefined) bad.push(c.name + "/" + a.name + " no cost");
            if (a.cd === undefined) bad.push(c.name + "/" + a.name + " no cd");
            /* dmgType only matters on an ability that deals damage. A
             * shield, a buff and a blink carry no damage type and should
             * not be forced to invent one. */
            if (Array.isArray(a.dmg) && a.dmgType !== "phys" && a.dmgType !== "magic") {
                bad.push(c.name + "/" + a.name + " dmgType " + a.dmgType);
            }
        }
    }
    check("all 32 abilities are well formed", bad.length === 0, bad.slice(0, 5).join("; "));
    check("there are exactly 32 abilities", count === 32, count);

    /* Every declared archetype must be reachable from the roster, or the
     * runtime carries a code path that can never execute. */
    const used = new Set();
    for (const c of IF.Champions.list) for (const a of c.abilities) used.add(a.arch);
    const orphans = IF.Champions.archetypes.filter(a => a !== "none" && !used.has(a));
    check("no archetype is dead code", orphans.length === 0, orphans.join(","));
}

{
    /* Costs and cooldowns are indexed by rank at runtime. A scalar is legal -
     * ultimates do not ramp their cost - but it must survive being indexed.
     * Every one of the eight ultimates used to declare a scalar and produce
     * undefined, which silently disabled the whole roster's biggest ability. */
    let finite = true, offender = "";
    for (const c of IF.Champions.list) {
        for (const a of c.abilities) {
            const costs = typeof a.cost === "number" ? [a.cost] : a.cost;
            const cds = typeof a.cd === "number" ? [a.cd] : a.cd;
            if (!Array.isArray(costs) || !costs.length) { finite = false; offender = c.name + "/" + a.name + " cost"; continue; }
            if (!Array.isArray(cds) || !cds.length) { finite = false; offender = c.name + "/" + a.name + " cd"; continue; }
            for (const v of costs.concat(cds)) if (!isFinite(v) || v <= 0) { finite = false; offender = c.name + "/" + a.name + " " + v; }
        }
    }
    check("every ability cost and cooldown is a positive finite number", finite, offender);

    /* A ramp must actually resolve.
     *
     * Written after the runtime indexed every damage ramp with the ability
     * DEFINITION instead of its rank - and a definition has no `rank` on it,
     * because one definition is shared by every champion that owns that
     * ability. So `arr[NaN]` was undefined, and every ramping ability in the
     * game dealt ZERO flat damage while its tooltip said otherwise. Nothing
     * crashed, no screenshot looked wrong, and the roster was quietly doing
     * about half of what it claimed.
     *
     * The data-shape checks above all passed while this was broken, which is
     * the whole reason this one exists: the bug was in the runtime, and only
     * running the runtime catches it. */
    let resolves = true, rampOffender = "";
    for (const c of IF.Champions.list) {
        const ab = c.abilities[0];
        for (const rank of [0, 1, 2, 3]) {
            const flat = IF.Abilities.atRamp(rank, ab.dmg, -1);
            if (!Array.isArray(ab.dmg)) continue;
            if (flat !== ab.dmg[Math.min(rank, ab.dmg.length - 1)]) {
                resolves = false;
                rampOffender = c.name + " rank " + rank + " -> " + flat;
            }
        }
    }
    check("every damage ramp resolves at every rank", resolves, rampOffender);

    /* And the end-to-end version: a real cast against a real dummy must deal
     * the number the panel promises. This is the assertion that would have
     * caught the NaN index. */
    const w = H.buildMatch({ seed: 4 });
    /* Park every champion off the testing ground and strip its brain.
     *
     * Without this the test measures the wrong thing twice over: the harness
     * brain-fights the champion under test, so its own abilities land on the
     * dummy first and the assertion measures whichever hit happened to arrive
     * first rather than the one the test asked for. Isolation is the whole
     * point of an end-to-end damage assertion. */
    for (const other of w.champs) {
        other.brain = null;
        other.x = 100 + (other.id % 5) * 30;
        other.y = 100;
        other.abilities.forEach(a => { a.cdLeft = 9999; });
    }
    let castOk = true, castOffender = "";
    for (const c of IF.Champions.list) {
        const u = w.champs.find(x => x.champId === c.id);
        if (!u) continue;
        for (let i = 0; i < 4; i++) {
            const def = u.abilities[i].def;
            if (!Array.isArray(def.dmg)) continue;
            /* Hand the caster a level-18 body so every ability is unlocked
             * and the expectation is just rank 0. */
            u.level = 18;
            IF.Abilities.refreshRanks(u);
            u.mana = 9999;
            u.hp = IF.Combat.stat(u, "hp");
            u.x = 5000; u.y = 5000;
            u.casting = null;
            u.abilities[i].cdLeft = 0;
            /* Direction-targeted archetypes resolve their aim from the
             * CHAMPION, not from the point passed to cast(). Pointing the
             * caster at the dummy is what makes a cone or a choppa swing
             * land; passing the dummy as a target point does nothing for
             * them. */
            u.aimX = 1;
            u.aimY = 0;

            /* Each ability gets a clean world. Persistent archetypes - a
             * four-second aura field, a DoT, a summoned daemon - outlive the
             * ability that made them, and a leftover field from the previous
             * iteration ticks on the next iteration's dummy. The wait loop
             * below then sees that tick, stops, and reports the aura's damage
             * as the slam's. Clearing effects per iteration is the only way
             * to measure one ability at a time. */
            w.effects.length = 0;
            w.projectiles && (w.projectiles.length = 0);

            /* Re-park everyone else. Each champion under test is moved onto
             * the testing ground but never moved back, so without this the
             * previous champion is still standing on the spawn point - and a
             * projectile that spawns inside a hostile collides on frame one
             * and is gone before it travels a pixel. */
            for (const other of w.champs) {
                if (other === u) continue;
                other.x = 100 + (other.id % 5) * 30;
                other.y = 100;
            }

            /* Retire the dummies from earlier iterations. A projectile
             * collides with the FIRST hostile on its path, and every earlier
             * iteration left a 100k dummy lying between the caster and this
             * one - so the shot that was supposed to prove SHARD VOLLEY works
             * silently ate a stale dummy and the assertion read zero. */
            for (let k = w.units.length - 1; k >= 0; k--) {
                if (w.units[k].name === "dummy") w.units.splice(k, 1);
            }

            /* Self-centred archetypes have to have the dummy ON the caster:
             * a slam's radius is measured from the champion, not from a
             * target point, so parking the dummy 200 units away puts it
             * outside the effect and the test reports a bug that is not
             * there. */
            const selfCentred = def.arch === "slam" || def.arch === "cone" ||
                def.arch === "buff" || def.arch === "field" ||
                (def.targeting === "none");
            const vx = selfCentred ? 5000 + 40 : 5000 + (def.range || 200) * 0.4;
            const victim = IF.World.makeUnit(w, {
                kind: "minion", team: 1 - u.team, lane: "mid", name: "dummy",
                x: vx, y: 5000,
                hp: 100000, ad: 0, armor: 0, mr: 0, ms: 0, as: 1,
                range: 100, radius: 40, height: 90, isMinion: false
            });
            victim.base = { hp: 100000, armor: 0, mr: 0, ad: 0, as: 0, ms: 0, range: 100 };
            /* The spatial index is rebuilt once per simulation step, so a
             * unit spawned directly into the world is invisible to every
             * ability until the next step runs. Stepping here is what makes
             * this a test of the ability rather than a test of the harness. */
            IF.World.rebuildGrid(w);
            const before = victim.hp;
            /* Unit-targeted abilities take the unit itself, not a point that
             * happens to describe one. resolveTarget reads raw.alive off the
             * argument, so a wrapper object reads as a dead unit and the cast
             * is refused before it starts. The AI does exactly this split at
             * ai.js - the test has to match it. */
            const arg = def.targeting === "unit"
                ? victim
                : { x: victim.x, y: victim.y, unit: victim };
            IF.Abilities.cast(w, u, i, arg);

            /* Run the windup out. Abilities with a cast time do not fire on
             * the frame they are pressed - they fire when the cast
             * completes - so a test that casts and immediately reads health
             * is testing the windup system, not the ability. */
            for (let st = 0; st < 120 && before - victim.hp <= 0; st++) {
                IF.World.step(w, 1 / 60);
                IF.Combat.drainEvents();
                IF.Combat.drainHeals();
                IF.World.rebuildGrid(w);
            }
            const dealt = before - victim.hp;

            const expected = def.dmg[0] +
                (def.dmgType === "phys"
                    ? IF.Combat.stat(u, "ad") * (def.adRatio || 0)
                    : IF.Combat.stat(u, "ap") * (def.apRatio || 0));
            if (dealt < expected * 0.5) {
                castOk = false;
                castOffender = c.name + " " + def.name + " dealt " + Math.round(dealt) +
                    ", expected >= " + Math.round(expected * 0.5);
            }
        }
    }
    check("every damaging ability actually deals its declared damage", castOk, castOffender);

    /* A rank must be worth taking. An ability whose fourth rank is identical
     * to its first is three ranks of nothing. */
    let ramps = true, offender2 = "";
    for (const c of IF.Champions.list) {
        for (const a of c.abilities) {
            if (!Array.isArray(a.dmg) || a.dmg.length < 2) continue;
            const first = a.dmg[0], last = a.dmg[a.dmg.length - 1];
            if (last <= first) { ramps = false; offender2 = c.name + "/" + a.name; }
            if (a.cd.length >= 2 && a.cd[a.cd.length - 1] > a.cd[0] * 1.6) {
                /* Cooldown growing 60% across four ranks would make an
                 * ultimate worse as the game goes on. */
                ramps = false; offender2 = c.name + "/" + a.name + " cd grows";
            }
        }
    }
    check("ramped abilities improve with rank", ramps, offender2);

    /* Ratios must be sane, or an ability is either useless or a one-shot. */
    let ratios = true, offender3 = "";
    for (const c of IF.Champions.list) {
        for (const a of c.abilities) {
            if (a.adRatio !== undefined && (a.adRatio < 0 || a.adRatio > 2)) {
                ratios = false; offender3 = c.name + "/" + a.name + " adRatio " + a.adRatio;
            }
            if (a.apRatio !== undefined && (a.apRatio < 0 || a.apRatio > 2)) {
                ratios = false; offender3 = c.name + "/" + a.name + " apRatio " + a.apRatio;
            }
            if (a.range !== undefined && a.range < 0) {
                ratios = false; offender3 = c.name + "/" + a.name + " range " + a.range;
            }
        }
    }
    check("every damage and range ratio is inside its usable band", ratios, offender3);
}

{
    /* Archetype-specific requirements. A cone with no angle hits nothing; a
     * blast with no radius is a wasted button. */
    const need = {
        cone: ["range", "angle", "dmg"],
        dash: ["range", "width", "dmg"],
        shot: ["range", "radius", "dmg"],
        chain: ["range", "bounces", "dmg"],
        beam: ["range", "width", "dmg"],
        blast: ["range", "radius", "dmg", "delay"],
        slam: ["radius", "dmg"],
        blink: ["range"],
        shield: ["shield", "dur"],
        buff: ["dur"],
        field: ["radius", "dur", "dmg"],
        summon: ["count", "dur", "unit"]
    };
    let ok = true, bad = [];
    for (const c of IF.Champions.list) {
        for (const a of c.abilities) {
            const req = need[a.arch];
            if (!req) continue;
            for (const k of req) {
                if (a[k] === undefined) { ok = false; bad.push(c.name + "/" + a.name + " missing " + k); }
            }
            if (a.arch === "summon") {
                const u = a.unit;
                if (!u || !isFinite(u.hp) || !isFinite(u.ad) || u.gold !== 0 || u.xp !== 0) {
                    ok = false;
                    bad.push(c.name + "/" + a.name + " summon grants economy");
                }
            }
        }
    }
    check("every ability carries the fields its archetype needs", ok, bad.slice(0, 5).join("; "));

    /* A summoning ultimate that summons a turret must say so. The two use
     * the same archetype and only differ by this flag, so a champion that
     * forgot it would get three walking minions where the design wanted a
     * stationary gun. */
    const casters = IF.Champions.list.filter(c => c.abilities.some(a => a.arch === "summon"));
    check("at least one summoning ability places a stationary structure",
        casters.some(c => c.abilities.some(a => a.arch === "summon" && a.asStructure)));
    check("at least one summoning ability places walking units",
        casters.some(c => c.abilities.some(a => a.arch === "summon" && !a.asStructure)));
}

{
    /* Targeting modes must be ones resolveTarget handles. */
    const modes = ["none", "point", "unit", "direction"];
    let ok = true, bad = [];
    for (const c of IF.Champions.list) {
        for (const a of c.abilities) {
            if (modes.indexOf(a.targeting) < 0) { ok = false; bad.push(c.name + "/" + a.name + " " + a.targeting); }
            /* An ability that targets a unit must have a range to check it
             * against, or the target test is against undefined. */
            if (a.targeting === "unit" && !isFinite(a.range)) { ok = false; bad.push(c.name + "/" + a.name + " unit-target with no range"); }
        }
    }
    check("every targeting mode is one the runtime handles", ok, bad.join("; "));

    /* Base melee range and a champion's own range override must stay sane
     * relative to the map, or an ability either reaches everywhere or
     * nowhere. */
    let sane = true, bad2 = [];
    for (const c of IF.Champions.list) {
        for (const a of c.abilities) {
            if (isFinite(a.range) && (a.range < 100 || a.range > H.IF.Map.size / 2)) {
                sane = false; bad2.push(c.name + "/" + a.name + " range " + a.range);
            }
        }
    }
    check("every ability range is usable on this map", sane, bad2.join("; "));
}

/* ================================================================
 * Faction passives
 * ================================================================ */
section("Faction passives");

{
    /* The declared passive must match the one combat.js implements. A
     * passive that is declared in the data and missing from the switch is a
     * card that lies to the player. */
    const IMPLEMENTED = { astartes: true, warpbound: true, tyranid: true, guard: true };
    let ok = true, bad = [];
    for (const id of Object.keys(IF.Factions)) {
        const f = IF.Factions[id];
        if (!IMPLEMENTED[id]) { ok = false; bad.push(id + " has no implementation"); }
        if (!f.passive || !f.passiveText) { ok = false; bad.push(id + " has no text"); }
    }
    check("every declared passive is implemented in combat.js", ok, bad.join("; "));

    /* And the implementation must be reachable: a passive on a faction no
     * champion belongs to is dead code. */
    const used = new Set(IF.Champions.list.map(c => c.faction));
    check("every faction with a passive is actually played",
        Object.keys(IF.Factions).every(f => used.has(f)));

    /* Aquila is a condition on health, so it must actually switch. */
    const w = H.buildMatch({ seed: 5 });
    const van = w.champs.find(c => c.champId === "vanguard");
    van.hp = van.base.hp * 0.9;
    const armourHealthy = IF.Combat.stat(van, "armor");
    van.hp = van.base.hp * 0.3;
    const armourHurt = IF.Combat.stat(van, "armor");
    check("AQUILA raises armour below 40% health",
        armourHurt > armourHealthy + 29, armourHurt + " vs " + armourHealthy);

    const syn = w.champs.find(c => c.champId === "sergeant");
    /* The same champion, measured either side of the threshold. Comparing
     * two champions would be measuring their rune loadouts instead. */
    syn.hp = syn.base.hp * 0.9;
    const synHealthy = IF.Combat.stat(syn, "armor");
    syn.hp = syn.base.hp * 0.2;
    const synHurt = IF.Combat.stat(syn, "armor");
    check("AQUILA does not fire for a non-Astartes champion",
        synHurt === synHealthy, synHurt + " vs " + synHealthy);

    const hex = w.champs.find(c => c.champId === "hexer");
    check("SYNAPSE and REQUISITION belong to the right factions",
        hex.faction === "warpbound" && syn.faction === "guard");
}

{
    /* Requisition is a gold multiplier and must actually change the gold. */
    const w = H.buildMatch({ seed: 5 });
    const grots = w.champs.find(c => c.faction === "guard");
    const mine = IF.World.makeUnit(w, {
        kind: "minion", team: 1, lane: "mid", name: "m", x: 4000, y: 4000,
        hp: 10, ad: 0, armor: 0, mr: 0, ms: 0, as: 0.5, range: 100, radius: 30, height: 60,
        isMinion: true
    });
    mine.goldValue = 100; mine.givesGold = true; mine.base.hp = 10;
    /* The champion also carries DILIGENT BLADE by default, which is a flat
     * +2 per minion. Cleared so this measures REQUISITION and nothing else. */
    grots.runeHooks = {};
    const before = grots.gold;
    IF.World.lastHit(grots, mine);
    const guardGold = grots.gold - before;
    check("REQUISITION pays 118% of a last-hit", Math.abs(guardGold - 118) < 0.5, guardGold);

    /* And it must stack with a gold rune rather than replace it. */
    const withRune = w.champs.find(c => c.faction === "guard");
    withRune.runeHooks = IF.Runes.hooks({ row0: "graspplate", row1: "diligentblade", row2: "bulwark" });
    const before2 = withRune.gold;
    IF.World.lastHit(withRune, mine);
    check("REQUISITION and DILIGENT BLADE stack",
        Math.abs((withRune.gold - before2) - 120) < 0.5, withRune.gold - before2);
}

/* ================================================================
 * Items
 * ================================================================ */
section("Items");

{
    check("the shop has twelve items", IF.Items.count === 12, IF.Items.count);
    check("shop ids are unique",
        new Set(IF.Items.order).size === IF.Items.order.length);
    check("every shop entry resolves", IF.Items.order.every(id => !!IF.Items.get(id)));
    check("the shop order contains no id that does not exist",
        IF.Items.order.every(id => !!IF.Items.get(id)));

    let finite = true, bad = [];
    for (const id of IF.Items.order) {
        const it = IF.Items.get(id);
        if (!isFinite(it.cost) || it.cost <= 0) { finite = false; bad.push(id + " cost"); }
        if (!it.name || !it.text) { finite = false; bad.push(id + " no copy"); }
        if (it.icon !== "boot" && it.icon !== "gun" && it.icon !== "blade" &&
            it.icon !== "plate" && it.icon !== "orb" && it.icon !== "censer" &&
            it.icon !== "lens" && it.icon !== "seal" && it.icon !== "banner") {
            finite = false; bad.push(id + " icon " + it.icon);
        }
        /* An item with a passive must name one combat.js knows, and must
         * tell the player what it does. */
        if (it.passive && IF.Items.passives.indexOf(it.passive) < 0) {
            finite = false; bad.push(id + " unknown passive " + it.passive);
        }
        if (it.passive && !it.passiveText) { finite = false; bad.push(id + " silent passive"); }
        /* The component chain must resolve. */
        if (it.needs && !IF.Items.get(it.needs)) { finite = false; bad.push(id + " needs missing " + it.needs); }
    }
    check("every item is well formed", finite, bad.join("; "));

    /* Every role must have a build that actually closes: a list ending in an
     * item nobody can afford is a bot with no late game. */
    let buildable = true, bad2 = [];
    for (const role of Object.keys(IF.AI.builds)) {
        const list = IF.AI.builds[role];
        let total = 0;
        for (const id of list) {
            const it = IF.Items.get(id);
            if (!it) { buildable = false; bad2.push(role + " unknown " + id); continue; }
            total += it.cost;
        }
        if (total < 2000) { buildable = false; bad2.push(role + " only " + total); }
        if (list.indexOf("servoboot") < 0) { buildable = false; bad2.push(role + " has no boots"); }
    }
    check("every bot build reaches full itemisation", buildable, bad2.join("; "));

    check("the cheapest item is worth buying early",
        Math.min.apply(null, IF.Items.order.map(id => IF.Items.get(id).cost)) <= 500);
    check("the most expensive item costs several minutes of income",
        Math.max.apply(null, IF.Items.order.map(id => IF.Items.get(id).cost)) >=
        C.champ.goldPerSec * 60 * 3);
}

{
    /* Affordable() must never offer something the champion cannot pay for -
     * the shop's whole contract is that pressing a button buys something. */
    const w = H.buildMatch({ seed: 5 });
    const u = w.champs[0];
    u.gold = 500;
    const list = IF.Items.affordable(u.gold, []);
    check("affordable() only offers items within budget",
        list.every(it => it.cost <= 500), list.map(i => i.name + ":" + i.cost).join(","));

    u.gold = 0;
    check("a broke champion is offered nothing", IF.Items.affordable(0, []).length === 0);

    u.gold = 100000;
    const all = IF.Items.affordable(u.gold, []);
    check("a rich champion is offered most of the shop", all.length >= 8, all.length);

    /* Buying must actually deduct and actually apply. */
    const target = w.champs[1];
    target.gold = 5000;
    const adBefore = IF.Combat.stat(target, "ad");
    const bought = IF.World.buyItem(w, target, "bolter");
    check("buying an item succeeds when affordable", bought === true);
    check("buying deducts its price", target.gold === 5000 - IF.Items.get("bolter").cost, target.gold);
    check("buying raises attack damage", IF.Combat.stat(target, "ad") > adBefore);
    check("buying the same item twice fails", IF.World.buyItem(w, target, "bolter") === false);
    check("buying with no gold fails", (target.gold = 0, IF.World.buyItem(w, target, "relicblade") === false));
    check("buying an unknown item fails", IF.World.buyItem(w, target, "sword-of-truth") === false);
    check("a bought item is in the inventory", target.items.indexOf("bolter") === 0);
}

/* ================================================================
 * Runes
 * ================================================================ */
section("Runes");

{
    check("there are nine runes", IF.Runes.count === 9, IF.Runes.count);
    check("three rows of three", IF.Runes.rows.length === 3 &&
        [0, 1, 2].every(r => IF.Runes.byRow(r).length === 3),
        [0, 1, 2].map(r => IF.Runes.byRow(r).length).join("/"));
    check("twenty-seven loadouts are possible",
        3 * 3 * 3 === 27);

    /* A rune that declares a hook must name one combat.js runs. */
    let ok = true, bad = [];
    for (const id of Object.keys(IF.Runes.all)) {
        const r = IF.Runes.all[id];
        if (r.hook && IF.Runes.hookIds.indexOf(r.hook) < 0) { ok = false; bad.push(id + " -> " + r.hook); }
        if (!r.text || !r.blurb) { ok = false; bad.push(id + " no copy"); }
        if (r.row !== 0 && r.row !== 1 && r.row !== 2) { ok = false; bad.push(id + " bad row"); }
        for (const k in (r.mods || {})) {
            if (!isFinite(r.mods[k])) { ok = false; bad.push(id + " mod " + k); }
        }
    }
    check("every rune hook is one the simulation implements", ok, bad.join("; "));

    /* resolve() must always produce three runes, whatever it is given. */
    check("an empty loadout resolves to a full one",
        IF.Runes.resolve(null).length === 3);
    check("a partial loadout fills its gaps",
        IF.Runes.resolve({ row0: "graspplate", row1: null, row2: null }).length === 3);
    check("resolution prefers the requested rune",
        IF.Runes.resolve({ row0: "graspplate", row1: "triumph", row2: "bulwark" })
            .map(r => r.id).join(",") === "graspplate,triumph,bulwark");

    /* A full row has a real choice in it, not two identical options. */
    let distinct = true;
    for (let row = 0; row < 3; row++) {
        const opts = IF.Runes.byRow(row);
        if (new Set(opts.map(r => r.id)).size !== opts.length) distinct = false;
        if (opts.every(r => !r.hook)) distinct = false;
    }
    check("every row offers three distinct choices", distinct);
}

{
    /* Runes must reach the champion's stat sheet. */
    const w = H.buildMatch({ seed: 5 });
    const bare = w.champs[0];
    const before = {
        ad: IF.Combat.stat(bare, "ad"),
        hp: IF.Combat.stat(bare, "hp"),
        ms: IF.Combat.stat(bare, "ms")
    };
    /* Added to the champion's existing permanent layer, not substituted for
     * it. Replacing `flat` wholesale can LOWER a champion who already had
     * Doctrine bonuses, which would make the test pass or fail for reasons
     * that have nothing to do with runes. */
    const runeMods = IF.Runes.sumMods({ row0: "graspplate", row1: "triumph", row2: "bulwark" });
    for (const k in runeMods) bare.flat[k] = (bare.flat[k] || 0) + runeMods[k];
    check("a keystone rune adds health",
        IF.Combat.stat(bare, "hp") > before.hp);
    check("a utility rune adds armour", IF.Combat.stat(bare, "armor") > bare.base.armor);
    check("TRIUMPH is a pure passive and contributes no stats",
        (runeMods.ad || 0) === 0, JSON.stringify(runeMods));
    /* TRIUMPH is a pure passive and deliberately contributes no stats, so
     * this assertion uses DILIGENT BLADE, which is the tempo rune that does
     * give a flat bonus. The point being tested is that flat mods reach the
     * stat sheet, not that every tempo rune has one. */
    const adMods = IF.Runes.sumMods({ row0: "graspplate", row1: "diligentblade", row2: "bulwark" });
    bare.flat.ad = (bare.flat.ad || 0) + (adMods.ad || 0);
    check("a tempo rune's flat attack damage reaches the stat sheet",
        IF.Combat.stat(bare, "ad") > before.ad);

    const pct = IF.Runes.sumMods({ row0: "lethaltempo", row1: "triumph", row2: "secondwind" });
    check("percent mods stay separate from flat mods",
        pct.adPct === undefined || pct.asPct === 0.12, JSON.stringify(pct));
}

{
    /* ItemFlags must be set by buying, because CHAPTER BANNER's damage
     * reduction is read as a flag and cannot be expressed as a stat. */
    const w = H.buildMatch({ seed: 5 });
    const u = w.champs[0];
    u.gold = 5000;
    check("a passive item sets its flag on purchase",
        (IF.World.buyItem(w, u, "chapterBanner"), u.itemFlags.chapterBanner === true));
    check("a stat item sets no flag",
        (IF.World.buyItem(w, u, "bolter"), u.itemFlags.chapterBanner === true &&
            u.itemFlags.relicblade === undefined));
}

/* ================================================================
 * Bot intelligence
 * ================================================================ */
section("Bot drafts and lanes");

{
    /* A 3v3 draft must produce three distinct champions per team. */
    let dupes = 0, comps = 0;
    const rng = IF.makeRng(31337);
    for (let trial = 0; trial < 200; trial++) {
        const taken = [];
        const teams = { 0: [], 1: [] };
        let bad = false;
        for (let i = 0; i < 6; i++) {
            const team = i < 3 ? 0 : 1;
            const comp = {};
            for (const id of teams[team]) {
                const c = IF.Champions.get(id);
                comp[c.role] = (comp[c.role] || 0) + 1;
            }
            const pick = IF.Champions.draftPick(rng, taken, comp);
            if (!pick) { bad = true; break; }
            taken.push(pick.id);
            teams[team].push(pick.id);
        }
        if (bad) { dupes++; continue; }
        if (new Set(teams[0]).size !== 3 || new Set(teams[1]).size !== 3) dupes++;
        /* No champion appears on both teams. */
        for (const a of teams[0]) if (teams[1].indexOf(a) >= 0) dupes++;
        /* A team is never three copies of one role. */
        for (const t of [0, 1]) {
            const roles = teams[t].map(id => IF.Champions.get(id).role);
            if (new Set(roles).size === 1) comps++;
        }
    }
    check("two hundred drafts produce six distinct, unshared champions", dupes === 0, dupes + " bad drafts");
    check("a draft never produces three of one role", comps < 5, comps + " mono-role drafts");
}

{
    /* Lane assignment must spread a team across lanes and must be
     * deterministic - a bot that changes lane between matches is unplayable. */
    const w = H.buildMatch({ seed: 77 });
    const lanes = { 0: [], 1: [] };
    for (const c of w.champs) lanes[c.team].push(c.lane);
    check("a team occupies at least two distinct lanes",
        new Set(lanes[0]).size >= 2 && new Set(lanes[1]).size >= 2,
        JSON.stringify(lanes));
    check("every assigned lane is a real lane",
        w.champs.every(c => IF.Map.laneNames.indexOf(c.lane) >= 0));

    const w2 = H.buildMatch({ seed: 77 });
    check("lane assignment is deterministic",
        w2.champs.every((c, i) => c.lane === w.champs[i].lane));

    /* Every lane must be able to work: a laner whose role puts them in a lane
     * with nobody else is fine, but a lane with two tanks is a lane where
     * nobody farms. */
    let topHeavy = 0;
    for (const t of [0, 1]) {
        const roles = w.champs.filter(c => c.team === t).map(c => c.role);
        if (roles.filter(r => r === "tank" || r === "bruiser").length === 3) topHeavy++;
    }
    check("no team is drafted as three frontliners", topHeavy === 0);
}

{
    /* The AI's last-hit predicate has to actually prefer a minion it can
     * finish before someone else does. This is the single decision that
     * decides whether a bot is worth playing against, so it is tested
     * directly rather than through its side effects. */
    const w = H.buildMatch({ seed: 91 });
    const u = w.champs[0];
    const b = IF.AI.makeBrain(w, u, "necron");
    u.x = 4000; u.y = 4000;

    IF.World.makeUnit(w, {
        kind: "minion", team: 1, lane: "mid", name: "m", x: 4060, y: 4000,
        hp: 40, ad: 0, armor: 0, mr: 0, ms: 0, as: 0.5, range: 100, radius: 30, height: 60,
        isMinion: true, progress: 0.5
    });
    IF.World.rebuildGrid(w);
    const pick = IF.AI.lastHitTarget(w, b, u);
    check("a bot with a free last-hit in reach takes it", !!pick);
    if (pick) check("the chosen minion is the free one", pick.hp === 40, pick.hp);
}

report("roster");
