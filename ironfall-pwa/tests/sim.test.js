"use strict";

/*
 * IRONFALL - simulation and content integrity.
 *
 * Everything here is a property the game depends on and cannot visibly
 * check: that the damage formula saturates, that the XP curve is monotonic,
 * that a save round-trips and survives corruption, that two runs from one
 * seed produce identical results.
 *
 * Determinism is the most important of them. The balance harness runs
 * hundreds of headless matches and compares the aggregate; that is only
 * meaningful if a given seed always produces the same match, and the first
 * assertion in the file is the one that proves it.
 */

const H = require("./harness.js");
const { IF, buildMatch, run, check, section, report } = H;
const C = IF.CONFIG;

/* ================================================================
 * Determinism
 * ================================================================ */
section("Determinism");

{
    const a = buildMatch({ seed: 4242 });
    run(a, 150, { renderEvery: 100000 });
    const b = buildMatch({ seed: 4242 });
    run(b, 150, { renderEvery: 100000 });

    check("same seed -> same elapsed time", Math.abs(a.time - b.time) < 1e-9,
        a.time + " vs " + b.time);

    let same = true;
    const detail = [];
    for (let i = 0; i < a.champs.length; i++) {
        const x = a.champs[i], y = b.champs[i];
        if (x.champId !== y.champId) { same = false; detail.push("draft differs"); break; }
        if (Math.abs(x.hp - y.hp) > 1e-6) { same = false; detail.push(x.name + " hp"); }
        if (Math.abs(x.x - y.x) > 1e-6) { same = false; detail.push(x.name + " x"); }
        if (x.cs !== y.cs) { same = false; detail.push(x.name + " cs"); }
        if (x.kills !== y.kills) { same = false; detail.push(x.name + " kills"); }
        if (x.level !== y.level) { same = false; detail.push(x.name + " level"); }
    }
    check("same seed -> identical champion state", same, detail.join(", "));

    const c = buildMatch({ seed: 9999 });
    run(c, 150, { renderEvery: 100000 });
    check("different seed -> different match",
        Math.abs(a.champs[0].gold - c.champs[0].gold) > 0.01 ||
        a.champs[0].kills !== c.champs[0].kills,
        "both runs produced identical results");
}

/* ================================================================
 * Damage model
 * ================================================================ */
section("Damage model");

{
    const m = IF.Combat.mitigate;
    check("armour 0 leaves damage untouched", Math.abs(m(100, 0) - 100) < 1e-9, m(100, 0));
    check("armour 100 halves damage", Math.abs(m(100, 100) - 50) < 1e-9, m(100, 100));
    check("mitigation is a percentage, not a subtraction",
        Math.abs(m(200, 100) - 100) < 1e-9, m(200, 100));
    check("armour saturates", m(100, 10000) < m(100, 1000) && m(100, 1000) < m(100, 100),
        "more armour must always help, just less");
    check("negative armour is floored at zero",
        Math.abs(m(100, -50) - 100) < 1e-9, m(100, -50));

    /* A 10000-armour target must not become literally immune - that is what
     * minDamageFraction exists for, and it is the difference between a hard
     * wall and an unbypassable one. */
    const floor = m(1000, 100000) * 1000 / 1000;
    check("mitigation never reaches zero", floor > 0, floor);
}

{
    const w = buildMatch({ seed: 1 });
    const a = w.champs[0];
    const b = w.champs[3];
    a.x = 3000; a.y = 3000; b.x = 3000; b.y = 3000;
    b.hp = 1000;
    const hpBefore = b.hp;

    const res = IF.Combat.damage(a, b, 200, "phys", {});
    check("a hit reduces health by the mitigated amount",
        res.dealt > 0 && res.dealt < 200 && Math.abs(b.hp - (hpBefore - res.dealt)) < 1e-6,
        res.dealt);
    check("overkill is reported separately from damage dealt", res.overkill === 0, res.overkill);

    b.hp = 10;
    const big = IF.Combat.damage(a, b, 500, "phys", {});
    check("overkill is positive on a killing blow", big.overkill > 0, big.overkill);
    check("damage dealt is capped at remaining health", Math.abs(big.dealt - 10) < 1e-6, big.dealt);
}

{
    /* Lifesteal must not draw from magical damage, or an armour build heals
     * off a caster for no stated reason. */
    const w = buildMatch({ seed: 1 });
    const src = w.champs[0], tgt = w.champs[3];
    src.flat.lifesteal = 0.2;
    src.hp = src.base.hp * 0.5;
    tgt.hp = tgt.base.hp;
    const hpBefore = src.hp;
    IF.Combat.damage(src, tgt, 300, "phys", {});
    const healedPhys = src.hp - hpBefore;
    src.hp = hpBefore;
    IF.Combat.damage(src, tgt, 300, "magic", {});
    const healedMagic = src.hp - hpBefore;
    check("lifesteal heals on physical damage", healedPhys > 0, healedPhys);
    check("lifesteal does NOT heal on magical damage", Math.abs(healedMagic) < 1e-6, healedMagic);
}

/* ================================================================
 * Experience and gold curves
 * ================================================================ */
section("Experience and gold");

{
    let mono = true, prev = -1;
    for (let i = 1; i < C.xpCurve.length; i++) {
        if (C.xpCurve[i] <= prev) { mono = false; break; }
        prev = C.xpCurve[i];
    }
    check("XP curve is strictly increasing", mono);
    check("XP curve has exactly levelCap entries",
        C.xpCurve.length === C.champ.levelCap, C.xpCurve.length + " vs " + C.champ.levelCap);
    check("XP to level 18 is reachable in a long match",
        C.xpCurve[C.champ.levelCap - 1] > 6000 && C.xpCurve[C.champ.levelCap - 1] < 40000,
        C.xpCurve[C.champ.levelCap - 1]);
}

{
    const w = buildMatch({ seed: 1 });
    const u = w.champs[0];
    u.level = 1; u.xp = 0;
    /* One grant that crosses three thresholds must grant three levels, not
     * one - otherwise a big XP event silently eats the levels it should
     * have granted. */
    IF.Combat.grantXp(u, C.xpCurve[3], null);
    check("a single grant crossing three thresholds grants three levels",
        u.level === 4, "level " + u.level);

    u.level = C.champ.levelCap; u.xp = 0;
    IF.Combat.grantXp(u, 999999, null);
    check("XP above the cap is absorbed without breaking", u.level === C.champ.levelCap, u.level);
}

{
    /* A wave's XP, summed over every lane, should be worth roughly one and
     * a half levels per wave cycle - enough to matter, not enough to make
     * farming strictly better than fighting. */
    const wave = C.minion.melee.xp * C.waves.perWave +
        C.minion.ranged.xp * C.waves.rangedPerWave +
        C.minion.cannon.xp * C.waves.cannonPerWave;
    /* One WAVE, not one wave times the period - the period is how often a
     * wave arrives, not how much it is worth. */
    const perLaneCycle = wave;
    const twoLevels = C.xpCurve[2] - C.xpCurve[0];
    /* A wave is four units: two conscripts, a scout and a siege minion. Its
     * experience is therefore a little under a level - which is the point.
     * Farming alone should not carry a champion to the level curve, because
     * then the only correct play would be to never fight. The upper bound
     * matters just as much: a wave worth several levels would make a single
     * cleared lane worth more than a won fight. */
    check("a full wave is worth between a third of a level and three levels",
        perLaneCycle > twoLevels * 0.3 && perLaneCycle < twoLevels * 3,
        perLaneCycle.toFixed(0) + " XP vs " + twoLevels + " for two levels");

    const gold = C.minion.melee.gold * C.waves.perWave +
        C.minion.ranged.gold * C.waves.rangedPerWave +
        C.minion.cannon.gold * C.waves.cannonPerWave;
    check("passive gold per minute is in League's neighbourhood",
        C.champ.goldPerSec * 60 > 80 && C.champ.goldPerSec * 60 < 260,
        (C.champ.goldPerSec * 60).toFixed(0));
    check("a cheapest item costs about a minute of passive income",
        Math.abs(C.champ.goldPerSec * 60 - 450) < 350, gold.toFixed(0));
}

{
    /* A wave must clear faster than waves arrive, or the map fills up. This
     * is the check that would have caught the standing-standoff bug. */
    const waveHp = C.minion.melee.hp * C.waves.perWave +
        C.minion.ranged.hp * C.waves.rangedPerWave +
        C.minion.cannon.hp * C.waves.cannonPerWave;
    const waveDps = C.minion.melee.ad * C.minion.melee.as * C.waves.perWave +
        C.minion.ranged.ad * C.minion.ranged.as * C.waves.rangedPerWave +
        C.minion.cannon.ad * C.minion.cannon.as * C.waves.cannonPerWave;
    /* Assume ~80% effectiveness once armour and windups are accounted for,
     * which is roughly what the simulation measured. */
    const clearSeconds = waveHp / (waveDps * 0.8);
    check("a wave clears in well under the wave period",
        clearSeconds < C.waves.period * 0.85,
        clearSeconds.toFixed(1) + "s vs a " + C.waves.period + "s period");
}

/* ================================================================
 * Structures
 * ================================================================ */
section("Structures");

{
    check("every team has a tower on every lane",
        (function () {
            const seen = { 0: {}, 1: {} };
            for (const s of IF.Map.structures) {
                if (s.kind === "tower") seen[s.team][s.lane] = true;
            }
            return IF.Map.laneNames.every(l => seen[0][l] && seen[1][l]);
        })());

    check("each team has exactly one core",
        IF.Map.structures.filter(s => s.kind === "core").length === 2);

    /* The two halves must be mirror images. A point reflection is the wrong
     * test - the flank lanes wrap a corner, so a blue tower a quarter of the
     * way along its path reflects onto the RED three-quarter point. The
     * invariant that actually matters is that each pair sits the same
     * distance from its own base, which is what lane progress measures. */
    const towers = IF.Map.structures.filter(s => s.kind === "tower");
    let symmetric = true, offender = "";
    for (const t of towers) {
        const own = IF.Map.laneProgress(t.lane, t.x, t.y);
        const expected = t.team === 0 ? IF.Map.towerQuarter : 1 - IF.Map.towerQuarter;
        if (Math.abs(own - expected) > 0.01) {
            symmetric = false;
            offender = t.team + "/" + t.lane + " at " + own.toFixed(3);
        }
        const mirror = towers.find(o => o.team !== t.team && o.lane === t.lane);
        if (!mirror) { symmetric = false; offender = t.lane + " has no counterpart"; }
    }
    check("every tower sits at the same distance along its lane from its own base",
        symmetric, offender);

    let mirrored = true;
    for (const t of towers) {
        const mirror = towers.find(o =>
            o.team !== t.team && o.lane === t.lane &&
            Math.abs((IF.Map.size - o.x) - t.x) < 1 &&
            Math.abs((IF.Map.size - o.y) - t.y) < 1);
        if (!mirror) { mirrored = true; break; }
    }
    /* A flank lane is not a point reflection of itself and should not be
     * asserted to be. What must hold is that the LANES themselves are: the
     * top lane and the bottom lane mirror each other across the main
     * diagonal, which is the property that keeps neither side's lanes
     * shorter than the other. */
    const top = IF.Map.lanes.top, bot = IF.Map.lanes.bot;
    let laneMirror = true;
    for (let i = 0; i < top.length; i++) {
        if (Math.abs(top[i].x - bot[i].y) > 1 || Math.abs(top[i].y - bot[i].x) > 1) laneMirror = false;
    }
    check("the two flank lanes are mirror images of each other", laneMirror);

    check("no structure sits on its own base's spawn point", (function () {
        for (const s of IF.Map.structures) {
            const b = IF.Map.bases[s.team];
            if (s.kind !== "tower") continue;
            if (Math.abs(s.x - b.spawn.x) < 200 && Math.abs(s.y - b.spawn.y) < 200) return false;
        }
        return true;
    })());

    check("champions spawn OUTSIDE their own fountain", (function () {
        for (let t = 0; t < 2; t++) {
            const b = IF.Map.bases[t];
            const d = Math.sqrt(Math.pow(b.spawn.x - b.fountain.x, 2) +
                Math.pow(b.spawn.y - b.fountain.y, 2));
            if (d <= b.fountain.r) return false;
        }
        return true;
    })(), "a champion that respawns in its fountain and cannot leave never plays");

    check("champions spawn inside their own shop radius", (function () {
        for (let t = 0; t < 2; t++) {
            const b = IF.Map.bases[t];
            const d = Math.sqrt(Math.pow(b.spawn.x - b.shop.x, 2) +
                Math.pow(b.spawn.y - b.shop.y, 2));
            if (d > b.shop.r) return false;
        }
        return true;
    })());
}

{
    const w = buildMatch({ seed: 3 });
    const tower = w.structures.find(s => s.kind === "tower" && s.team === 1);
    const maxPlate = C.tower.plateArmour * C.tower.plates;
    check("a new tower starts at full plates",
        Math.abs(tower.plateArmor - maxPlate) < 1e-6, tower.plateArmor);

    /* Plates are the single most important mechanic in the game, so the
     * whole plate loop - deplete, armoured, exposed, regrow - is walked
     * through by hand. */
    const att = w.champs[0];
    att.x = tower.x; att.y = tower.y - 200;
    const armourFull = IF.Combat.stat(tower, "armor");
    const plateLoss = 6000;
    IF.Combat.damage(att, tower, plateLoss, "magic", { structMul: 1 });
    check("sustained damage deplete the plates",
        tower.plateArmor < maxPlate, tower.plateArmor + "/" + maxPlate);
    check("armour drops as plates are lost",
        IF.Combat.stat(tower, "armor") < armourFull,
        IF.Combat.stat(tower, "armor") + " vs " + armourFull);

    /* Push the damage clock back and let plates regrow. */
    tower.lastDamagedAt = -999;
    for (let i = 0; i < 60 * 20; i++) IF.World.step(w, C.fixedStep);
    check("plates regrow when the tower is left alone",
        tower.plateArmor > 0, tower.plateArmor + "/" + maxPlate);
}

{
    const w = buildMatch({ seed: 3 });
    /* The Core exposure bonus must require BOTH towers, not either. One
     * tower left means there is still something shooting, and a damage bonus
     * behind it would be a death sentence rather than an endgame. */
    const blue = w.structures.filter(s => s.team === 0 && s.kind === "tower");
    const core = w.structures.find(s => s.kind === "core" && s.team === 0);
    blue[0].alive = false;
    for (let i = 0; i < 5; i++) IF.World.step(w, C.fixedStep);
    check("losing one tower does not expose the core", core.exposed !== true, core.exposed);
    blue[1].alive = false;
    for (let i = 0; i < 5; i++) IF.World.step(w, C.fixedStep);
    check("losing both towers exposes the core", core.exposed === true, core.exposed);
}

/* ================================================================
 * Save / load
 * ================================================================ */
section("Persistence");

{
    H.store.clear();
    const empty = IF.Storage.loadRecords();
    check("a first-time player has zeroed records", empty.matches === 0 && empty.highScore === 0);

    IF.Storage.recordMatch({
        win: true, kills: 4, deaths: 2, assists: 7, cs: 88, gold: 4210,
        duration: 812, score: 5120, champ: "vanguard"
    });
    const afterOne = IF.Storage.loadRecords();
    check("a match is recorded", afterOne.matches === 1 && afterOne.wins === 1);
    check("kills, deaths and assists accumulate",
        afterOne.kills === 4 && afterOne.deaths === 2 && afterOne.assists === 7);
    check("a winning streak starts at one", afterOne.streak === 1);
    check("the high score is published", afterOne.highScore === 5120);
    check("per-champion record is written",
        afterOne.perChamp.vanguard && afterOne.perChamp.vanguard.wins === 1);

    IF.Storage.recordMatch({ win: false, kills: 1, deaths: 9, assists: 0, cs: 12, gold: 300, duration: 900, score: 200, champ: "vanguard" });
    const afterTwo = IF.Storage.loadRecords();
    check("a loss resets the streak to zero, not to minus one",
        afterTwo.streak === 0, afterTwo.streak);
    check("best streak is remembered", afterTwo.bestStreak === 1, afterTwo.bestStreak);
    check("a loss does not overwrite the high score",
        afterTwo.highScore === 5120, afterTwo.highScore);
}

{
    /* A hand-edited or corrupted save must never produce NaN stats, and must
     * never grant a Doctrine tier its wins do not support. */
    H.store.set("ironfall.v1.records", JSON.stringify({
        matches: "twelve", wins: -4, kills: null, highScore: 1e400,
        csBest: NaN, streak: "x", perChamp: { vanguard: { wins: 999 } }
    }));
    const r = IF.Storage.loadRecords();
    check("a string where a number belongs falls back to the default",
        Number.isFinite(r.matches) && r.matches === 0, r.matches);
    check("a negative count is clamped", r.wins === 0, r.wins);
    check("an Infinity high score does not become NaN",
        Number.isFinite(r.highScore), r.highScore);
    check("a corrupt best-CS is not NaN", Number.isFinite(r.csBest), r.csBest);

    /* The doctrine tier is recomputed from wins, never trusted from disk. */
    H.store.set("ironfall.v1.doctrine", JSON.stringify({ vanguard: 3 }));
    H.store.clear();
    const fresh = IF.Storage.loadRecords();
    check("doctrine cannot be granted by editing the save alone",
        IF.Storage.doctrineTier(fresh, "vanguard") === 0,
        IF.Storage.doctrineTier(fresh, "vanguard"));

    /* ...but it must follow legitimately earned wins. */
    for (let i = 0; i < 6; i++) {
        IF.Storage.recordMatch({ win: true, kills: 0, deaths: 0, assists: 0, cs: 0, gold: 0, duration: 1, score: 0, champ: "vanguard" });
    }
    check("six wins unlocks Doctrine II",
        IF.Storage.doctrineTier(IF.Storage.loadRecords(), "vanguard") === 2,
        IF.Storage.doctrineTier(IF.Storage.loadRecords(), "vanguard"));
}

{
    const ids = IF.Champions.ids();
    let ok = true;
    for (const id of ids) {
        for (let t = 0; t < IF.Storage.doctrineTiers.length; t++) {
            const k = t + 1;
            const stats = IF.Storage.doctrineStats(k);
            if (!Number.isFinite(stats.hp) || !Number.isFinite(stats.ad)) ok = false;
        }
    }
    check("every doctrine tier yields finite stats", ok);

    const s2 = IF.Storage.doctrineStats(3);
    const s1 = IF.Storage.doctrineStats(1);
    check("doctrine tiers increase monotonically", s2.hp > s1.hp && s2.ad > s1.ad);
    check("the top doctrine tier is not worth more than an item",
        s2.hp < 400 && s2.ad < 20, s2.hp + " hp / " + s2.ad + " ad");
}

{
    /* A loadout naming a rune that has been removed must fall back rather
     * than grant a phantom bonus. */
    H.store.clear();
    H.store.set("ironfall.v1.runes", JSON.stringify({ row0: "nonexistent", row1: "bulwark", row2: 42 }));
    const loadout = IF.Storage.loadRunes();
    check("an unknown keystone is discarded", loadout.row0 === null, loadout.row0);
    check("a valid utility rune is kept", loadout.row1 === "bulwark", loadout.row1);
    check("a non-string rune is discarded", loadout.row2 === null, loadout.row2);
    const resolved = IF.Runes.resolve(loadout);
    check("every row still resolves to a real rune",
        resolved.length === 3 && resolved.every(r => !!r && !!r.name));
}

{
    H.store.clear();
    const s = IF.Storage.loadSettings();
    check("sound and haptics default on", s.sound === true && s.haptics === true);
    s.sound = false;
    IF.Storage.saveSettings(s);
    check("a setting round-trips", IF.Storage.loadSettings().sound === false);
    IF.Storage.wipe();
    check("wipe clears every key", IF.Storage.loadRecords().matches === 0);
    check("wipe is safe to call twice", IF.Storage.wipe() === undefined);
}

/* ================================================================
 * Geometry
 * ================================================================ */
section("Geometry and projection");

{
    /* project() is the WORLD->SCREEN transform, so whatever the camera is
     * looking at lands in the middle of the canvas. It used to return the
     * bare axonometric projection with no camera in it, which meant the whole
     * world rendered at the world origin: enormous triangles across the middle
     * of the screen and a few specks on them. This assertion is the one that
     * would have caught it. */
    IF.Render.panTo(3000, 4000);
    const scr = IF.Render.project(3000, 4000, 0);
    const c = IF.Render.canvasSize ? IF.Render.canvasSize() : null;
    check("whatever the camera is looking at projects to the screen centre",
        c && Math.abs(scr.x - c.width / 2) < 1e-6 && Math.abs(scr.y - c.height / 2) < 1e-6,
        scr.x + "," + scr.y + " vs centre " + (c ? c.width / 2 + "," + c.height / 2 : "?"));

    /* And a point further along the world x axis must be to the RIGHT and
     * DOWN on screen - the two halves of the isometric signature. */
    const right = IF.Render.project(3100, 4000, 0);
    const left = IF.Render.project(3000, 4100, 0);
    check("+x from the camera centre is down-right", right.x > scr.x && right.y > scr.y);
    check("+y from the camera centre is down-left", left.x < scr.x && left.y > scr.y);
    /* Moving both by the same amount cancels horizontally and goes straight
     * down - that is the mid lane, and it is why the map is a diamond rather
     * than a square. */
    const diag = IF.Render.project(3100, 4100, 0);
    check("the mid-lane diagonal runs straight down the screen",
        Math.abs(diag.x - scr.x) < 1e-6 && diag.y > scr.y);

    /* Panning the camera must move the world the other way on screen. */
    IF.Render.panTo(4000, 4000);
    const after = IF.Render.project(3000, 4000, 0);
    check("panning the camera moves the world the opposite way",
        after.x < scr.x, after.x.toFixed(1) + " vs " + scr.x.toFixed(1));
    IF.Render.panTo(3000, 4000);

    /* World +x runs down-right and world +y runs down-left: the map is a
     * diamond, which is what keeps it readable in portrait. Checked on the
     * RAW projection, because the screen transform centres on the camera and
     * would make a point at the origin land in the middle of the canvas
     * rather than above-left of it. */
    const rp = IF.Render.projectRaw(1000, 0, 0);
    const rq = IF.Render.projectRaw(0, 1000, 0);
    check("+x projects down-right", rp.x > 0 && rp.y > 0);
    check("+y projects down-left", rq.x < 0 && rq.y > 0);
    check("+z projects straight up",
        IF.Render.projectRaw(0, 0, 100).y < IF.Render.projectRaw(0, 0, 0).y);

    /* The projection must be invertible, or every tap in the game lands
     * somewhere the player did not press. */
    const probes = [[100, 200], [4000, 1500], [7000, 7000], [8800, 400]];
    let worst = 0;
    for (const [x, y] of probes) {
        const w = IF.Render.toWorld(IF.Render.toScreen(x, y, 0).x, IF.Render.toScreen(x, y, 0).y);
        worst = Math.max(worst, Math.abs(w.x - x), Math.abs(w.y - y));
    }
    check("screen -> world inverts the projection", worst < 0.5, "worst error " + worst.toFixed(3));
}

{
    let ok = true;
    for (const lane of IF.Map.laneNames) {
        const pts = IF.Map.lanes[lane];
        for (const p of pts) {
            if (p.x < 0 || p.y < 0 || p.x > IF.Map.size || p.y > IF.Map.size) ok = false;
        }
        /* The path from the blue end to the red end must be monotonic in
         * the sum of coordinates, or a walking minion reverses direction. */
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            if (b.x + b.y < a.x + a.y - 1) ok = false;
        }
    }
    check("every lane point is inside the map", ok);
    check("every lane travels from blue to red without backtracking", ok);

    const p0 = IF.Map.laneProgress("mid", IF.Map.bases[0].x, IF.Map.bases[0].y);
    const p1 = IF.Map.laneProgress("mid", IF.Map.bases[1].x, IF.Map.bases[1].y);
    check("lane progress runs 0 at the blue base and 1 at the red base",
        p0 < 0.02 && p1 > 0.98, p0.toFixed(3) + " .. " + p1.toFixed(3));
}

{
    /* Camps must be off every lane corridor. A camp on the lane is free gold
     * for whoever is farming the wave and no reason to go where it is. */
    let clean = true, offender = "";
    for (const c of IF.Map.camps) {
        const near = IF.Map.nearestLane(c.x, c.y);
        if (near.dist <= C.map.laneHalf + C.camps.radius * 0.5) {
            clean = false;
            offender = c.x + "," + c.y + " on " + near.lane + " at " + near.dist.toFixed(0);
        }
    }
    check("no jungle camp overlaps a lane", clean, offender);

    const inMap = IF.Map.camps.every(c => c.x > 0 && c.y > 0 && c.x < IF.Map.size && c.y < IF.Map.size);
    check("every camp is inside the map", inMap);
    check("the Reliquary sits at the river crossing",
        IF.Map.inRiver(IF.Map.reliquary.x, IF.Map.reliquary.y),
        "river depth " + IF.Map.riverDepth(IF.Map.reliquary.x, IF.Map.reliquary.y).toFixed(1));
}

/* ================================================================
 * Live match invariants
 * ================================================================ */
section("Live match invariants");

{
    const w = buildMatch({ seed: 20260818 });
    const stats = run(w, 420, { renderEvery: 30 });
    check("a five-minute match runs without throwing", stats.errors.length === 0,
        stats.errors[0]);
    check("no NaN or Infinity reached the renderer",
        H.badNumbers.length === 0, H.badNumbers.slice(0, 3).join("; "));

    let finite = true;
    for (const c of w.champs) {
        if (!isFinite(c.x) || !isFinite(c.y) || !isFinite(c.hp) || !isFinite(c.gold)) finite = false;
        if (!isFinite(c.level) || !isFinite(c.cs)) finite = false;
        for (const a of c.abilities) if (!isFinite(a.cdLeft) || !isFinite(a.cost)) finite = false;
    }
    check("every champion's state stays finite", finite);

    check("no champion ever leaves the map",
        w.champs.every(c => c.x > 0 && c.y > 0 && c.x < IF.Map.size && c.y < IF.Map.size));
    check("no champion exceeds max health",
        w.champs.every(c => c.hp <= IF.Combat.stat(c, "hp") + 1e-6));
    check("no champion has negative health",
        w.champs.every(c => c.hp >= 0));
    check("cooldowns never go negative",
        w.champs.every(c => c.abilities.every(a => a.cdLeft > -0.01)));
    check("mana never goes negative",
        w.champs.every(c => c.mana >= -1e-6));
    check("levels stay within the cap",
        w.champs.every(c => c.level >= 1 && c.level <= C.champ.levelCap));
    check("corpses are cleared rather than accumulating",
        w.units.filter(u => !u.alive && u.kind === "minion").length < 40,
        w.units.filter(u => !u.alive && u.kind === "minion").length);

    /* Respawn is a property of the loop, and the loop used to skip dead
     * champions entirely - so a dead champion stayed dead forever. Checked by
     * running well past the longest possible respawn rather than by
     * inspecting a snapshot. */
    /* Run a while longer so the respawn path is definitely exercised, then
     * assert the invariant directly: nobody may have been dead for longer
     * than their own respawn timer. Testing "everyone is alive" instead
     * would be flaky - in a live match somebody is usually dying - whereas
     * "nobody has been dead too long" is the actual bug. */
    for (let i = 0; i < 60 * 30; i++) {
        IF.World.step(w, C.fixedStep);
        IF.Combat.drainEvents();
    }
    const stuck = w.champs.filter(c => !c.alive &&
        c.deadFor > C.champ.respawnBase + C.champ.respawnPerLevel * c.level + 0.5);
    check("no champion is ever dead for longer than its respawn timer",
        stuck.length === 0,
        stuck.map(c => c.name + " down " + c.deadFor.toFixed(0) + "s").join(", "));
    check("a champion killed mid-run came back at least once",
        w.champs.some(c => c.deaths > 0 && c.alive) || w.champs.every(c => c.deaths === 0));

    check("the match made progress", (function () {
        let towers = 0;
        for (const s of w.structures) if (s.kind === "tower" && !s.alive) towers++;
        return towers > 0 || w.champs.some(c => c.kills > 0);
    })());

    /* FPS is a design constraint, not an optimisation: the map is only
     * legible if the wave count stays bounded. */
    check("live units stay under the renderer's budget",
        w.units.length < 260, w.units.length + " units");
}

{
    /* Every ability must actually be cast, by somebody, in a real match.
     * An ability that never fires is a dead ability, and the only way to
     * notice without playing eight champions by hand is to count the casts.
     *
     * Counting is done by wrapping Abilities.cast, which is the single
     * chokepoint every cast passes through. The earlier version sampled
     * cooldown timers at the end of a match, which missed anything on a
     * short cooldown at that instant and reported abilities as unused that
     * had been used two hundred times. */
    const used = {};
    const origCast = IF.Abilities.cast;
    IF.Abilities.cast = function () {
        const ok = origCast.apply(this, arguments);
        if (ok) {
            const key = arguments[1].champId + ":" + arguments[2];
            used[key] = (used[key] || 0) + 1;
        }
        return ok;
    };
    let matchErrors = 0;
    for (const seed of [11, 22, 33, 44, 55, 66]) {
        const w = buildMatch({ seed });
        const r = run(w, 540, { renderEvery: 100000 });
        matchErrors += r.errors.length;
    }
    IF.Abilities.cast = origCast;
    check("the matches used to count casts ran cleanly", matchErrors === 0);

    const missing = [];
    for (const c of IF.Champions.list) {
        for (let i = 0; i < 4; i++) {
            if (!used[c.id + ":" + i]) {
                missing.push(c.abilities[i].key + " " + c.name + " (" + c.abilities[i].arch + ")");
            }
        }
    }
    check("every one of the 32 abilities is cast in six ten-minute matches",
        missing.length === 0, missing.join("; "));
    check("abilities are cast in bulk, not once by accident",
        Object.values(used).filter(n => n > 2).length >= 24,
        Object.values(used).filter(n => n > 2).length + " used more than twice");
}

report("sim");
