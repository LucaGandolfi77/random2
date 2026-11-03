/*
 * CINDER BELT content suite.
 *
 *   node cinder-belt-pwa/tests/content.test.js
 *
 * Static and near-static properties: the shape of the hull tree, the zone
 * law, persistence, and the promises the PWA makes about its own files. If a
 * hull is missing an ability or the service worker forgets a script, the game
 * still opens on a warm cache and breaks offline a week later. This suite is
 * the canary.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const H = require("./harness.js");
const { CB, C, Shipyard, check, section, report } = H;

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ================================================================
 * Config integrity
 * ================================================================ */
section("Config integrity");
{
    check("config has a version", C.VERSION >= 1, C.VERSION);
    check("the run is fifteen minutes", C.MATCH_TIME === 900, C.MATCH_TIME);
    check("the ring has ordered radii",
        C.MAW_RADIUS < C.SCAB_RADIUS && C.SCAB_RADIUS < C.DRIFT_RADIUS &&
        C.DRIFT_RADIUS < C.WORLD_RADIUS,
        [C.MAW_RADIUS, C.SCAB_RADIUS, C.DRIFT_RADIUS, C.WORLD_RADIUS].join("<"));

    const homeD = Math.hypot(C.HOME.x, C.HOME.y);
    check("the Anchorage sits inside the Drift",
        homeD > C.SCAB_RADIUS && homeD < C.DRIFT_RADIUS, homeD.toFixed(0));
    check("the Anchorage bubble is smaller than its ring",
        C.SAFE_RADIUS < C.SCAB_RADIUS, C.SAFE_RADIUS);
    const nexusD = Math.hypot(C.NEXUS.x, C.NEXUS.y);
    check("the Nexus sits in the Scab",
        nexusD > C.MAW_RADIUS && nexusD < C.SCAB_RADIUS, nexusD.toFixed(0));

    check("only the Anchorage is safe",
        Object.keys(C.ZONE).filter((k) => C.ZONE[k].safe).join(",") === "anchorage",
        Object.keys(C.ZONE).filter((k) => C.ZONE[k].safe).join(","));
    check("the contested rings are PvP",
        C.ZONE.scab.pvp && C.ZONE.maw.pvp && C.ZONE.void.pvp &&
        !C.ZONE.drift.pvp && !C.ZONE.anchorage.pvp);
    check("richer ore lives closer to the Maw",
        C.ZONE.anchorage.ore <= C.ZONE.drift.ore &&
        C.ZONE.drift.ore < C.ZONE.scab.ore &&
        C.ZONE.scab.ore < C.ZONE.maw.ore,
        [C.ZONE.drift.ore, C.ZONE.scab.ore, C.ZONE.maw.ore].join("<"));
    check("bounty rises with danger",
        C.ZONE.anchorage.bounty <= C.ZONE.drift.bounty &&
        C.ZONE.drift.bounty < C.ZONE.scab.bounty &&
        C.ZONE.scab.bounty < C.ZONE.maw.bounty);

    const oreValues = Object.keys(C.ORES).map((k) => C.ORES[k].value);
    check("ore values are distinct and ascending",
        oreValues.every((v, i) => i === 0 || v > oreValues[i - 1]), oreValues.join(","));

    check("stations are tougher than their docking collar",
        C.STATION.dockRadius > C.STATION.radius &&
        C.NEXUS.dockRadius > C.NEXUS.radius &&
        C.STATION.hp > 0 && C.NEXUS.hp > 0 && C.NEXUS.shield > 0);
    check("turrets reach past the hull",
        C.STATION.turretRange > C.STATION.radius &&
        C.NEXUS.turretRange > C.NEXUS.radius);
    check("respawns are long enough to matter",
        C.PLAYER.respawn >= 3 && C.BOT.respawn > C.PLAYER.respawn,
        C.PLAYER.respawn + " / " + C.BOT.respawn);
}

/* ================================================================
 * Hull tree
 * ================================================================ */
section("Hull tree");
{
    const hulls = Shipyard.allHulls();
    const ids = hulls.map((h) => h.id);
    check("starter plus five tiers per doctrine",
        hulls.length === 16 && Object.keys(C.LINES).length === 3, hulls.length + " hulls");
    check("hull ids are unique", new Set(ids).size === ids.length, ids.join(","));
    check("the starter is tier 1", C.STARTER.tier === 1 && C.STARTER.id === "sparrow");

    const required = ["hull", "shield", "energy", "speed", "accel", "cargo",
        "damage", "rate", "bulletSpeed", "range", "radius", "magnet", "ability"];

    Object.keys(C.LINES).forEach((lineId) => {
        const line = C.LINES[lineId];
        check(lineId + " has five hulls", line.hulls.length === 5, line.hulls.length);
        check(lineId + " declares a role and colour", !!line.role && /^#[0-9a-f]{6}$/i.test(line.color));

        let prev = line.hulls[0];
        line.hulls.forEach((h, i) => {
            check(lineId + " tier " + (i + 2) + " is sequential",
                h.tier === i + 2, h.id + " t" + h.tier);
            const missing = required.filter((k) => h[k] === undefined || h[k] === null ||
                (typeof h[k] === "number" && !Number.isFinite(h[k])));
            check(h.id + " has complete stats", missing.length === 0, missing.join(","));
            if (i > 0) {
                check(h.id + " grows hull, shield and cargo",
                    h.hull > prev.hull && h.shield > prev.shield && h.cargo > prev.cargo,
                    [h.hull, h.shield, h.cargo].join("/"));
                check(h.id + " grows damage and speed",
                    h.damage > prev.damage && h.speed > prev.speed,
                    h.damage + "/" + h.speed);
            }
            check(h.id + " names its ability", !!h.ability && !!h.abilityName, h.abilityName);
            prev = h;
        });
    });

    check("tier-2 costs are shared and ascending",
        C.UPGRADE_COST.length === 6 &&
        C.UPGRADE_COST.slice(1).every((v, i) => v > C.UPGRADE_COST[i]),
        C.UPGRADE_COST.join(","));
    check("costToTier maps the array", Shipyard.costToTier(2) === C.UPGRADE_COST[1] &&
        Shipyard.costToTier(6) === C.UPGRADE_COST[5]);

    const starter = { tier: 1, line: "lance", hullId: "sparrow" };
    const first = Shipyard.options(starter);
    check("the first upgrade offers all three doctrines",
        first.length === 3 && first.every((h) => h.tier === 2),
        first.map((h) => h.id).join(","));
    check("the tier-2 price is charged once",
        Shipyard.nextCost(starter) === C.UPGRADE_COST[1], Shipyard.nextCost(starter));

    Object.keys(C.LINES).forEach((lineId) => {
        let ship = { tier: 1, line: lineId };
        for (let tier = 2; tier <= 6; tier++) {
            const opt = Shipyard.options(ship)[0];
            check(lineId + " offers tier " + tier, !!opt && opt.tier === tier);
            ship = { tier: opt.tier, line: lineId, hullId: opt.id };
        }
        check(lineId + " stops at tier 6", Shipyard.options(ship).length === 0);
        check(lineId + " costs nothing at max", Shipyard.nextCost(ship) === 0);
    });

    check("an unknown hull falls back to the starter", Shipyard.getHull("nope").id === "sparrow");
}

/* ================================================================
 * Pilots and personalities
 * ================================================================ */
section("Pilots and personalities");
{
    const factions = Object.keys(C.BOT_NAMES);
    check("three fleets fly the belt",
        factions.join(",") === "free,corsair,neutral", factions.join(","));

    const names = [];
    factions.forEach((team) => {
        C.BOT_NAMES[team].forEach((b) => {
            names.push(b.name);
            check(b.name + " follows a real doctrine", !!C.LINES[b.line], b.line);
            check(b.name + " has bounded temperament",
                b.greed >= 0 && b.greed <= 1 && b.aggression >= 0 && b.aggression <= 1 &&
                b.caution >= 0 && b.caution <= 1 && b.skill >= 0 && b.skill <= 1,
                [b.greed, b.aggression, b.caution, b.skill].join("/"));
        });
    });
    check("every pilot has a distinct name", new Set(names).size === names.length, names.join(","));
    check("the corsairs have exactly one ace",
        C.BOT_NAMES.corsair.filter((b) => b.ace).length === 1);
    check("the aces are the sharpest shots",
        C.BOT_NAMES.corsair.find((b) => b.ace).skill ===
        Math.max.apply(null, C.BOT_NAMES.corsair.map((b) => b.skill)));
    check("the free fleet has three wingmen", C.BOT_NAMES.free.length === 3);
    check("difficulty presets cover the menu",
        ["cadet", "pilot", "ace"].every((d) => C.DIFFICULTY[d] && C.DIFFICULTY[d].name));
}

/* ================================================================
 * Zone law
 * ================================================================ */
section("Zone law");
{
    const free = { team: "free", x: 0, y: 0, alive: true, outlawUntil: 0 };
    const corsair = { team: "corsair", x: 0, y: 0, alive: true, outlawUntil: 0 };
    const feral = { team: "feral", x: 0, y: 0, alive: true, outlawUntil: 0 };
    const now = 10;

    check("allies cannot be shot", !CB.Zones.canHarm(free, { ...free, x: 10 }, now));
    check("no fire inside the bubble",
        !CB.Zones.canHarm(free, { ...corsair, x: C.HOME.x, y: C.HOME.y }, now));
    check("no fire in the Drift until someone is outlawed",
        !CB.Zones.canHarm(free, { ...corsair, x: 0, y: 6000 }, now));
    check("outlaws can be answered anywhere",
        CB.Zones.canHarm(free, { ...corsair, x: 0, y: 6000, outlawUntil: now + 5 }, now));
    check("the Scab is open PvP",
        CB.Zones.canHarm(free, { ...corsair, x: 0, y: 3300 }, now));
    check("the Maw is open PvP",
        CB.Zones.canHarm(free, { ...corsair, x: 0, y: 1000 }, now));
    check("feral ships are always fair game",
        CB.Zones.canHarm(free, { ...feral, x: 0, y: 6000 }, now));

    const station = { team: "free", kind: "station", x: C.HOME.x, y: C.HOME.y };
    const nexus = { team: "corsair", kind: "nexus", x: C.NEXUS.x, y: C.NEXUS.y };
    check("the Anchorage is protected from clean ships",
        !CB.Zones.canHarmStructure(corsair, station, now));
    check("an outlaw can hit the Anchorage",
        CB.Zones.canHarmStructure({ ...corsair, outlawUntil: now + 5 }, station, now));
    check("the Nexus is always a target from the Scab",
        CB.Zones.canHarmStructure(free, nexus, now));
    check("feral raids bypass the law",
        CB.Zones.canHarmStructure(feral, station, now));

    check("zone lookup matches the radii",
        CB.Zones.zoneId(0, 0) === "maw" &&
        CB.Zones.zoneId(0, 3300) === "scab" &&
        CB.Zones.zoneId(0, 6000) === "drift" &&
        CB.Zones.zoneId(C.HOME.x, C.HOME.y) === "anchorage" &&
        CB.Zones.zoneId(0, 9000) === "void");
}

/* ================================================================
 * Persistence (fresh storage module in its own vm)
 * ================================================================ */
section("Persistence");
{
    const store = new Map();
    const sandbox = {
        console,
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k)
        },
        navigator: { vibrate() {} }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    for (const f of ["config.js", "storage.js"]) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, "src", f), "utf8"), sandbox, { filename: f });
    }
    const S = sandbox.CB.Storage;

    const fresh = S.loadProfile();
    check("a new profile has defaults",
        fresh.bestScore === 0 && fresh.runs === 0 && fresh.difficulty === "pilot" &&
        fresh.settings.sound === true && fresh.settings.quality === "high");
    check("a new profile starts with the default paint",
        fresh.unlocks.paints.indexOf("default") >= 0);

    S.recordRun({ score: 1200, duration: 300, outcome: "loss", kills: 3, ore: 40, bossKills: 0 });
    check("recordRun counts the run", S.loadProfile().runs === 1);
    check("recordRun keeps the best score", S.loadProfile().bestScore === 1200,
        S.loadProfile().bestScore);
    S.recordRun({ score: 400, duration: 100, outcome: "win", kills: 0, ore: 0, bossKills: 1 });
    const after = S.loadProfile();
    check("a lower score does not replace the best", after.bestScore === 1200, after.bestScore);
    check("a win is counted", after.wins === 1);
    check("boss kills are counted", after.bossKills === 1);
    check("the profile is actually written", store.has("cinder-belt-pwa"));

    S.setSetting("sound", false);
    check("settings persist", S.loadProfile().settings.sound === false);

    store.set("cinder-belt-pwa", "{not json");
    const recovered = (function () {
        /* Clear the module's memory by reloading it in a second context. */
        const box = { console, localStorage: sandbox.localStorage, navigator: sandbox.navigator };
        box.window = box;
        vm.createContext(box);
        for (const f of ["config.js", "storage.js"]) {
            vm.runInContext(fs.readFileSync(path.join(ROOT, "src", f), "utf8"), box, { filename: f });
        }
        return box.CB.Storage.loadProfile();
    })();
    check("a corrupt save falls back to defaults",
        recovered.bestScore === 0 && recovered.difficulty === "pilot", recovered.bestScore);
}

/* ================================================================
 * PWA and document wiring
 * ================================================================ */
section("PWA and document wiring");
{
    const ids = [];
    html.replace(/\sid="([^"]+)"/g, (_, id) => { ids.push(id); });
    check("every DOM id is unique", new Set(ids).size === ids.length,
        ids.filter((id, i) => ids.indexOf(id) !== i).join(","));
    check("the game canvas exists", ids.indexOf("game") >= 0);

    const uiSrc = fs.readFileSync(path.join(ROOT, "src", "ui.js"), "utf8");
    const cacheBlock = uiSrc.match(/\[([\s\S]*?)\]\.forEach\(function \(id\) \{ el\[id\]/);
    const cached = cacheBlock ? (cacheBlock[1].match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1)) : [];
    check("the UI cache is declared", cached.length > 40, cached.length);
    const missingCached = cached.filter((id) => ids.indexOf(id) < 0 && id !== "minimap");
    check("every cached UI element exists in index.html", missingCached.length === 0,
        missingCached.join(","));

    const bound = (uiSrc.match(/bind\("([^"]+)"/g) || []).map((s) => s.slice(6, -1));
    const missingBound = bound.filter((id) => ids.indexOf(id) < 0);
    check("every bound button exists in index.html", missingBound.length === 0,
        missingBound.join(","));

    const scripts = (html.match(/<script src="([^"]+)"/g) || [])
        .map((s) => s.replace(/<script src="|"/g, ""));
    const missingScripts = scripts.filter((src) => !fs.existsSync(path.join(ROOT, src)));
    check("every script tag points at a real file", missingScripts.length === 0,
        missingScripts.join(","));
    check("styles.css exists", fs.existsSync(path.join(ROOT, "styles.css")));
    check("the page points at its manifest", /rel="manifest" href="manifest.json"/.test(html));
    check("the page declares a canonical URL", /rel="canonical"/.test(html));
    check("the page has a theme colour", /name="theme-color"/.test(html));
    check("the page has social cards", /property="og:image"/.test(html) && /name="twitter:card"/.test(html));

    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
    check("the manifest is installable",
        manifest.name && manifest.start_url && manifest.scope && manifest.display === "standalone");
    check("the manifest carries 192 and 512 icons",
        manifest.icons.some((i) => /192/.test(i.sizes)) &&
        manifest.icons.some((i) => /512/.test(i.sizes)));
    const missingIcons = manifest.icons.map((i) => i.src)
        .filter((src) => !fs.existsSync(path.join(ROOT, src)));
    check("every manifest icon exists", missingIcons.length === 0, missingIcons.join(","));

    const sw = fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8");
    check("the service worker is versioned", /CACHE_NAME\s*=\s*"cinder-belt-pwa-v\d+"/.test(sw));
    const assetsBlock = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
    const assets = assetsBlock ? (assetsBlock[1].match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1)) : [];
    check("the service worker lists assets", assets.length > 15, assets.length);
    const missingAssets = assets.filter((a) => a !== "./" && !fs.existsSync(path.join(ROOT, a)));
    check("every cached asset exists", missingAssets.length === 0, missingAssets.join(","));
    const unpacked = scripts
        .map((src) => src.replace(/^\.\//, ""))
        .filter((src) => assets.map((a) => a.replace(/^\.\//, "")).indexOf(src) < 0);
    check("the service worker caches every script the page loads", unpacked.length === 0,
        unpacked.join(","));
    check("the service worker caches its own shell",
        assets.indexOf("./") >= 0 && assets.indexOf("./index.html") >= 0 &&
        assets.indexOf("./styles.css") >= 0 && assets.indexOf("./manifest.json") >= 0);
}

report();
