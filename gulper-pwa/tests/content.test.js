/*
 * GULPER - the content tables.
 *
 * Forty-two levels, six weapons, nineteen adaptations, forty-odd
 * creatures. Every one of them is data, and data is exactly the thing
 * that rots silently: a level that points at a biome that does not
 * exist, a weapon with no tier costs, a prey type with no biography.
 * None of those throw. They just make a level that cannot be finished.
 */
"use strict";

const { GU, ok, equal, report } = require("./harness.js");

/* ---------- the campaign ---------- */

const levels = GU.Levels.list;

ok(levels.length === 49, "the campaign has 49 levels, found " + levels.length);

const seenIds = new Set();
const seenNames = new Set();
for (const lvl of levels) {
    ok(!seenIds.has(lvl.id), "level id " + lvl.id + " is unique");
    seenIds.add(lvl.id);
    ok(!seenNames.has(lvl.name), "level name " + lvl.name + " is unique");
    seenNames.add(lvl.name);
    ok(!!lvl.brief && lvl.brief.length > 8, lvl.id + " has a brief");
    ok(!!GU.Biomes[lvl.biome], lvl.id + " points at a real biome");
    ok(!!lvl.objective, lvl.id + " has an objective");
    ok(["swarm", "stealth", "elite", "snatch", "survive", "cull", "slay"].indexOf(lvl.objective.type) >= 0,
        lvl.id + " has a known objective type");
    ok(lvl.prey > 0, lvl.id + " has people in it");
    ok(lvl.objective.time > 30, lvl.id + " has enough time on the clock");
    ok(lvl.seed > 0, lvl.id + " has a seed");
    if (lvl.boss) {
        ok(!!GU.Species.bosses[lvl.bossId], lvl.id + " points at a real boss");
        ok(lvl.objective.type === "slay", lvl.id + " is a boss level");
    }
}

/* Every objective template is used somewhere. */
const objTypes = new Set(levels.map((l) => l.objective.type));
for (const t of ["swarm", "stealth", "elite", "snatch", "survive", "cull", "slay"]) {
    ok(objTypes.has(t), "the " + t + " objective is used in the campaign");
}

/* Every biome has six levels and a boss. */
const campaign = GU.Levels.campaign();
equal(campaign.length, 7, "there are seven biomes");
for (const b of campaign) {
    equal(b.levels.length, 7, b.id + " has seven levels");
    ok(b.levels[6] === b.boss, b.id + " ends with its boss");
    ok(!!b.brief, b.id + " has a brief");
}

/* The first level is unlocked and the second is not. */
ok(GU.Levels.isUnlocked("docks-1"), "the first level is unlocked");
ok(!GU.Levels.isUnlocked("docks-2"), "the second level starts locked");
ok(GU.Levels.isUnlocked("docks-1") && GU.Levels.next("docks-1").id === "docks-2",
    "levels chain to the next one");
ok(GU.Levels.firstUncleared() === "docks-1", "the first uncleared level is the first one");

/* ---------- palettes ---------- */

for (const id of Object.keys(GU.PALETTES)) {
    equal(GU.PALETTES[id].length, 32, "the " + id + " palette has 32 colours");
    const seen = new Set(GU.PALETTES[id]);
    equal(seen.size, 32, "the " + id + " palette has no duplicates");
}

/* ---------- weapons ---------- */

equal(GU.Weapons.order.length, 7, "there are seven weapons");
for (const id of GU.Weapons.order) {
    const w = GU.Weapons.get(id);
    ok(!!w, id + " exists");
    ok(!!w.name && !!w.desc, id + " has a name and a description");
    ok(w.reach > 0, id + " has a reach");
    ok(w.cooldown > 0, id + " has a cooldown");
    ok(w.tierCost.length === 3, id + " has three tier costs");
    /* Every tier is strictly better than the one below it. */
    let prev = GU.Weapons.stats(id, 1);
    for (let t = 2; t <= 3; t++) {
        const s = GU.Weapons.stats(id, t);
        ok(s && isFinite(s.damage) && isFinite(s.reach) && isFinite(s.cooldown),
            id + " tier " + t + " has finite numbers");
        ok(s.reach >= prev.reach, id + " tier " + t + " is not shorter than tier " + (t - 1));
        ok(s.cooldown <= prev.cooldown, id + " tier " + t + " is not slower than tier " + (t - 1));
        prev = s;
    }
}

/* ---------- adaptations ---------- */

ok(GU.Adaptations.order.length >= 15, "there are enough adaptations to choose from");
for (const id of GU.Adaptations.order) {
    const a = GU.Adaptations.get(id);
    ok(!!a, id + " exists");
    ok(!!a.name && !!a.desc, id + " has a name and a description");
    ok(a.cost > 0, id + " costs something to unlock");
}

/* ---------- genome tracks ---------- */

equal(GU.Genome.tracks.length, 8, "there are eight anatomy tracks");
for (const t of GU.Genome.tracks) {
    ok(t.costs.length === GU.Genome.maxRank, t.id + " has a cost for every rank");
    ok(!!GU.Genome.get(t.id), t.id + " can be looked up");
}

/* ---------- species ---------- */

const prey = GU.Species.preyList();
ok(prey.length >= 14, "there are at least fourteen kinds of person");
for (const p of prey) {
    ok(!!p.bio && p.bio.length > 10, p.id + " has a biography");
    ok(p.mass >= 1 && p.mass <= 3, p.id + " has a sane mass");
    ok(p.hp > 0 && p.speed > 0, p.id + " has health and speed");
    ok(!!p.colors && !!p.colors.body && !!p.colors.skin, p.id + " has colours");
}

for (const kind of ["foes", "rivals", "bosses"]) {
    for (const id of Object.keys(GU.Species[kind])) {
        const f = GU.Species[kind][id];
        ok(!!f.name, kind + "." + id + " has a name");
        ok(f.hp > 0 && f.mass >= 1, kind + "." + id + " has health and mass");
        ok(!!f.colors && !!f.colors.body, kind + "." + id + " has colours");
    }
}

/* A boss has to be heavy enough that engulfing it is a real goal. */
for (const id of Object.keys(GU.Species.bosses)) {
    const b = GU.Species.bosses[id];
    ok(b.mass >= 5, "boss " + id + " is too heavy to swallow early");
    ok(b.mass <= 7, "boss " + id + " is swallowable by the end of the campaign");
}

/* ---------- the growth curve ---------- */

/* A level one player, eating light prey, must be able to reach the
 * second gape tier. If not, the campaign has a wall in it. */
{
    const p = GU.Body.create({}, []);
    const before = p.gape;
    let mass = p.mass;
    for (let i = 0; i < 4; i++) {
        mass += 1 * GU.CONFIG.growth.massToBiomass;
    }
    const stage = GU.Body.stageFor(mass);
    ok(stage.gape > before, "four light prey are enough to open the gape up");
}

/* The gape must keep pace with the heaviest ordinary person. */
{
    const heavy = GU.Species.prey.chef.mass;
    const p = GU.Body.create({}, []);
    const need = GU.Body.stageFor(GU.CONFIG.growth.stages[1].at);
    ok(need.gape >= 1, "the first step up is available immediately");
    ok(GU.CONFIG.growth.stages[4].gape >= heavy, "a chef becomes edible by the apex stage");
}

/* ---------- the settings and the save ---------- */

{
    const save = GU.Storage.data();
    ok(typeof save.shards === "number", "the save has shards");
    ok(typeof save.carry === "number", "the save has carried biomass");
    ok(!!save.settings, "the save has settings");
    ok(save.weapons.lash === 1, "the lash starts unlocked");
    const before = save.shards;
    GU.Storage.addShards(50);
    equal(GU.Storage.data().shards, before + 50, "shards are added");
    GU.Storage.spendShards(20);
    equal(GU.Storage.data().shards, before + 30, "shards are spent");
    GU.Storage.recordLevel("docks-1", 3, 120, true);
    ok(GU.Storage.levelRecord("docks-1").cleared, "a cleared level is recorded");
    ok(GU.Storage.levelRecord("docks-1").stars === 3, "the stars are recorded");
    GU.Storage.noteSwallow("courier", 1);
    equal(GU.Storage.data().codex.courier, 1, "the codex counts");
}

process.exit(report("content"));
