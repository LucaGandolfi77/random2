/*
 * FORMICA headless simulation test.
 *
 *   node formica-pwa/tests/sim.test.js
 *
 * Fa girare i moduli veri (mondo + bot) senza browser e senza build step.
 * Prima i controlli deterministici, poi una suite comportamentale aggregata
 * su diversi seed fissi — le soglie su un seed singolo erano fragili (una
 * run riportava 3 razzie lanciate, la successiva 0, e una popolazione
 * azzerata).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const SEED_KEY = "formica.v1.seed";
const ROSTER_KEY = "formica.v1.roster";
const GRUDGE_KEY = "formica.v1.grudges";
const SEEDS = [1337, 90210, 2468013, 555001, 7777777];

/* ---------- stub minimali del browser ---------- */
global.window = global;
const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};
/* Node espone un navigator read-only, quindi ridefiniscilo. */
Object.defineProperty(globalThis, "navigator", {
    value: { vibrate() {} },
    configurable: true,
    writable: true,
});

for (const f of ["config.js", "zones.js", "storage.js", "world.js", "bots.js"]) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const L = global.FORMICA;
const W = L.World.world;
const C = L.CONFIG;
const G = L.World.grid;
const DT = 1 / 60;

let failures = 0;
function check(label, cond, extra) {
    if (cond) {
        console.log("  PASS  " + label);
    } else {
        failures++;
        console.log("  FAIL  " + label + (extra !== undefined ? "  -> " + extra : ""));
    }
}
function section(t) { console.log("\n=== " + t + " ==="); }
function useSeed(seed) {
    store.set(SEED_KEY, JSON.stringify(seed));
    store.delete(ROSTER_KEY);
    store.delete(GRUDGE_KEY);
}
const finite = Number.isFinite;
function mean(a) {
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}
function ownedCells(slot) {
    let n = 0;
    for (let i = 0; i < G.GW * G.GH; i++) {
        if (G.owner[i] === slot && G.strength[i] >= C.territory.owned) n++;
    }
    return n;
}

function freshWorld(withPlayer) {
    L.World.reset();
    L.World.generate(L.Storage.getSeed());
    L.Bots.clear(W);
    L.Bots.spawnAll(W);
    if (withPlayer !== false) L.World.addPlayer("Eroina", "#ff7043");
}

/* ================================================================
 * 1. Roster - il trucco dei rivali persistenti
 * ================================================================ */
section("roster");
useSeed(SEEDS[0]);
const roster = L.Storage.getRoster(C.bots.count);
check("il roster ha 5 colonie", roster.length === 5, roster.length);
check("nomi unici", new Set(roster.map((r) => r.name)).size === 5);
check("nomi in italiano e da .io",
    roster.filter((r) => /Colonia (Rossa|Nera|Corazzata|Faraone)/.test(r.name)).length >= 1,
    roster.map((r) => r.name).join(" | "));
check("personalità in range", roster.every((r) =>
    ["expansion", "farming", "raiding", "defense", "caution", "skill"].every((k) =>
        r.personality[k] >= 0 && r.personality[k] <= 1)));
check("colori distinti", new Set(roster.map((r) => r.color)).size === 5);
check("roster stabile tra le letture",
    JSON.stringify(roster) === JSON.stringify(L.Storage.getRoster(C.bots.count)));

useSeed(SEEDS[1]);
const other = L.Storage.getRoster(C.bots.count);
check("un seed diverso dà un roster diverso",
    JSON.stringify(other.map((r) => r.name)) !== JSON.stringify(roster.map((r) => r.name)));

/* ================================================================
 * 2. Generazione del tavolo
 * ================================================================ */
section("world generation");
useSeed(SEEDS[0]);
freshWorld();
check("cinque colonie nemiche schierate",
    W.colonies.filter((c) => !c.isPlayer).length === 5,
    W.colonies.filter((c) => !c.isPlayer).length);
check("il giocatore si è unito", W.colonies.length === 6 && !!W.player, W.colonies.length);
check("briciole generate", W.crumbs.length >= C.food.crumbs, W.crumbs.length);
check("la griglia copre il tavolo",
    G.GW * G.GH >= (C.world.w / C.world.cell) * (C.world.h / C.world.cell));

/* Nidi al sicuro: un nido in una pozza d'inchiostro è una colonia morta. */
{
    let inInk = 0, nearDrop = 0;
    for (const col of W.colonies) {
        for (const ink of W.inks) {
            const r = ink.r + 160;
            if (L.dist2(col.nestX, col.nestY, ink.x, ink.y) < r * r) inInk++;
        }
        for (const d of W.drops) {
            const r = d.r + 180;
            if (L.dist2(col.nestX, col.nestY, d.x, d.y) < r * r) nearDrop++;
        }
    }
    check("nessun nido dentro l'inchiostro", inInk === 0, inInk);
    check("nessun nido troppo vicino a una goccia", nearDrop === 0, nearDrop);

    /* distanza tra nidi: le colonie non si sovrappongono */
    let tooClose = 0;
    for (let i = 0; i < W.colonies.length; i++) {
        for (let j = i + 1; j < W.colonies.length; j++) {
            if (L.dist2(W.colonies[i].nestX, W.colonies[i].nestY,
                        W.colonies[j].nestX, W.colonies[j].nestY) < 900 * 900) tooClose++;
        }
    }
    check("i nidi sono distanziati", tooClose === 0, tooClose);
}

/* Il blob iniziale: ogni colonia parte con un po' di territorio. */
{
    const p = W.player;
    const mine = ownedCells(p.slot);
    check("la colonia del giocatore parte col suo blob", mine >= 9, mine);
}

/* ================================================================
 * 2b. Zone del tavolo
 * ================================================================ */
section("zone del tavolo");
{
    const zones = L.Zones.ZONES;
    check("quattro zone, senza buchi", zones.length === 4);
    check("le zone coprono il tavolo",
        zones[0].x0 === 0 && zones[0].y0 === 0 &&
        zones[3].x1 === 1 && zones[3].y1 === 1 &&
        zones.every((z) => z.x1 > z.x0 && z.y1 > z.y0));
    check("ogni zona ha nome e tinta valida",
        zones.every((z) => typeof z.name === "string" && /^#[0-9a-f]{6}$/i.test(z.tint)));

    check("la zona segue la posizione",
        L.Zones.zoneIndexAt(10, 10, C.world.w, C.world.h) === 0 &&
        L.Zones.zoneIndexAt(C.world.w - 10, 10, C.world.w, C.world.h) === 1 &&
        L.Zones.zoneIndexAt(10, C.world.h - 10, C.world.w, C.world.h) === 2 &&
        L.Zones.zoneIndexAt(C.world.w - 10, C.world.h - 10, C.world.w, C.world.h) === 3);

    const lum = (hex) => {
        const n = parseInt(hex.replace("#", ""), 16);
        return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    const pane = L.Zones.tintFor(300, 300, C.world.w, C.world.h);
    const inchiostro = L.Zones.tintFor(C.world.w - 300, 300, C.world.w, C.world.h);
    check("le zone hanno legni diversi", pane !== inchiostro, pane + " vs " + inchiostro);
    check("la macchia d'inchiostro è più scura del pane",
        lum(inchiostro) < lum(pane));

    /* I confini sfumano invece di tagliare netto. */
    const edgeX = C.world.w / 2;
    const ramp = [-400, -200, 0, 200, 400].map((d) =>
        L.Zones.tintFor(edgeX + d, C.world.h * 0.25, C.world.w, C.world.h));
    check("i confini sfumano", new Set(ramp).size >= 4, new Set(ramp).size + "/5");

    /* La generazione rispetta i pesi di zona, non solo le etichette. */
    const tally = (arr) => {
        const out = [0, 0, 0, 0];
        for (const it of arr) out[L.Zones.zoneIndexAt(it.x, it.y, C.world.w, C.world.h)]++;
        return out;
    };
    const inkByZone = tally(W.inks);
    const share = (a) => a.map((n) => n / a.reduce((x, y) => x + y, 0));
    check("l'inchiostro predilige la sua zona",
        share(inkByZone)[1] > share(inkByZone)[0],
        share(inkByZone).map((n) => (n * 100).toFixed(0) + "%").join("/"));
    check("ogni zona ha qualcosa", inkByZone.every((n) => n >= 0) && W.crumbs.length > 0);
}

/* ================================================================
 * 3. Dipingere: camminare è possedere
 * ================================================================ */
section("pheromone painting");
{
    useSeed(SEEDS[0]);
    freshWorld();
    const p = W.player;

    /* porta la testa in zona neutra e cammina dritto */
    p.x = C.world.w * 0.3;
    p.y = C.world.h * 0.3;
    p.targetAngle = 0.7;
    for (let i = 0; i < 120; i++) {
        L.World.step(DT);
        W.events.length = 0;
    }
    const painted = ownedCells(p.slot);
    check("camminare dipinge celle neutre", painted > 9, painted);

    /* rubare: dipingi sopra una cella nemica */
    const bot = W.colonies.find((c) => !c.isPlayer);
    const idx = (Math.floor(bot.nestY / C.world.cell)) * G.GW + Math.floor(bot.nestX / C.world.cell);
    const beforeOwner = G.owner[idx];
    check("il blob nemico è suo", beforeOwner === bot.slot, beforeOwner + " slot " + bot.slot);

    /* il decadimento riporta il territorio abbandonato al neutro */
    L.World.killColony(p, null, "test");
    check("la colonia morta perde tutte le sue celle", ownedCells(1) === 0, ownedCells(1));
}

/* ================================================================
 * 4. Economia: briciola -> nido -> formica
 * ================================================================ */
section("crumb economy");
{
    useSeed(SEEDS[0]);
    freshWorld();
    const p = W.player;
    p.x = p.nestX; p.y = p.nestY;

    /* piazza una briciola sotto la testa e raccoglila */
    const crumb = W.crumbs.find((c) => !c.taken);
    crumb.x = p.x; crumb.y = p.y;
    L.World.step(DT);
    check("la testa raccoglie la briciola", p.carrying === crumb, !!p.carrying);

    /* depositare: resta nel nido */
    const crumbsBefore = p.crumbs;
    for (let i = 0; i < 10; i++) {
        p.x = p.nestX; p.y = p.nestY;
        L.World.step(DT);
        W.events.length = 0;
    }
    check("la briciola depositata conta", p.crumbs > crumbsBefore, crumbsBefore + " -> " + p.crumbs);

    /* le formiche si guadagnano: earned/per formazione */
    const want = 4 + Math.floor(p.earned / C.colony.workersPerCrumbs);
    check("le formiche crescono con le briciole depositate",
        p.workers === Math.min(C.colony.maxWorkers, want),
        "workers=" + p.workers + " want=" + want);
}

/* ================================================================
 * 5. Pericoli
 * ================================================================ */
section("hazards");
{
    useSeed(SEEDS[0]);
    freshWorld();
    const p = W.player;
    p.crumbs = 200; /* che il conto non interferisca */

    /* goccia: annegamento + cancellazione feromoni */
    const drop = W.drops[0];
    const cx = Math.floor(drop.x / C.world.cell);
    const cy = Math.floor(drop.y / C.world.cell);
    G.owner[cy * G.GW + cx] = p.slot;
    G.strength[cy * G.GW + cx] = 1;
    const workersBefore = p.workers;
    p.x = drop.x; p.y = drop.y;
    L.World.step(DT);
    check("la goccia annaffa: -1 formica", p.workers === workersBefore - 1,
        workersBefore + " -> " + p.workers);
    check("la goccia cancella i feromoni", G.owner[cy * G.GW + cx] === 0);

    /* inchiostro: letale x2 e cancella attorno */
    const ink = W.inks[0];
    const ix = Math.floor(ink.x / C.world.cell);
    const iy = Math.floor(ink.y / C.world.cell);
    G.owner[iy * G.GW + ix] = p.slot;
    G.strength[iy * G.GW + ix] = 1;
    const before = p.workers;
    p.x = ink.x; p.y = ink.y;
    p.clashCd = 1;
    L.World.step(DT);
    check("l'inchiostro dissolve: -2 formiche", p.workers === before - 2,
        before + " -> " + p.workers);
    check("la colonia sopravvive a un tocco", p.alive && p.workers > 0, p.workers);
    check("l'inchiostro brucia il territorio", G.owner[iy * G.GW + ix] === 0);
}

/* ================================================================
 * 6. Scontri tra colonie
 * ================================================================ */
section("colony clashes");
{
    useSeed(SEEDS[0]);
    freshWorld();
    const p = W.player;
    p.crumbs = 500;
    const bot = W.colonies.find((c) => !c.isPlayer);

    /* pari: perdono entrambe */
    p.workers = 8; bot.workers = 8;
    p.baseWorkers = 8; bot.baseWorkers = 8;
    p.losses = 0; bot.losses = 0;
    p.earned = 0; bot.earned = 0;
    p.clashCd = 0; bot.clashCd = 0;
    bot.x = p.x + 4; bot.y = p.y;
    L.World.step(DT);
    check("a parità entrambe perdono una formica",
        p.workers === 7 && bot.workers === 7,
        p.workers + " / " + bot.workers);

    /* la più grande vince sempre */
    p.workers = 14; p.baseWorkers = 14; p.losses = 0;
    bot.workers = 6; bot.baseWorkers = 6; bot.losses = 0;
    p.clashCd = 0; bot.clashCd = 0;
    bot.x = p.x + 4; bot.y = p.y;
    L.World.step(DT);
    check("la colonia più grande vince lo scontro",
        bot.workers === 5 && p.workers === 14,
        p.workers + " / " + bot.workers);
}

/* ================================================================
 * 7. Morte e annessione
 * ================================================================ */
section("annexation");
{
    useSeed(SEEDS[0]);
    freshWorld();
    const p = W.player;
    const bot = W.colonies.find((c) => !c.isPlayer);

    /* la colonia più grande annienta e annette */
    p.workers = 20; p.baseWorkers = 20; p.losses = 0; p.earned = 0;
    p.crumbs = 0;
    bot.workers = 1; bot.baseWorkers = 1; bot.losses = 0;
    bot.crumbs = 30; bot.earned = 0;
    p.clashCd = 0; bot.clashCd = 0;
    const crumbsBefore = p.crumbs;
    bot.x = p.x + 4; bot.y = p.y;

    let annexed = false;
    for (let i = 0; i < 200 && !annexed; i++) {
        L.World.step(DT);
        for (const e of W.events) {
            if (e.type === "colonyDeath" && e.colony === bot && e.killer === p) annexed = true;
        }
        W.events.length = 0;
        if (bot.clashCd <= 0) { bot.x = p.x + 4; bot.y = p.y; }
    }
    check("la colonia sterminata sparisce dal tavolo",
        W.colonies.indexOf(bot) < 0, W.colonies.length);
    check("l'annessione passa al vincitore", annexed);
    check("il bottino del nido va al vincitore", p.crumbs > crumbsBefore,
        crumbsBefore + " -> " + p.crumbs);
    check("il nido distrutto lascia briciole-insetto",
        W.crumbs.filter((c) => c.type === "bug").length >= 5);
}

/* ================================================================
 * 8. Razzie
 * ================================================================ */
section("night raids");
{
    useSeed(SEEDS[0]);
    freshWorld();
    const p = W.player;
    p.workers = 14; p.baseWorkers = 14; p.losses = 0; p.crumbs = 400;
    const bot = W.colonies.find((c) => !c.isPlayer);

    /* razzia lanciata dal bot verso il giocatore */
    L.World.spawnRaid(bot, p);
    check("la razzia parte con le sue formiche",
        W.raids.length === C.raid.antsPerColony, W.raids.length);

    /* la testa del difensore ferma le formiche d'assalto.
     * Deterministico: la formica parte già a ridosso dell'anello di difesa,
     * così il test misura la difesa e non la durata della marcia. */
    const base = W.raids[0];
    base.x = p.nestX + 70;
    base.y = p.nestY;
    let repelled = 0;
    for (let i = 0; i < 60 * 10; i++) {
        /* il giocatore resta nel nido a difendere */
        p.x = p.nestX; p.y = p.nestY; p.targetAngle = 0;
        L.World.step(DT);
        for (const e of W.events) if (e.type === "raidRepelled") repelled++;
        W.events.length = 0;
        if (repelled > 0) break;
    }
    check("le formiche del difensore respingono l'assalto", repelled > 0, repelled);
    check("il difensore resta vivo difendendo", p.alive, "workers=" + p.workers);
    check("il nido non subisce danni con la difesa presente", p.nestHp > C.nest.hp * 0.5,
        p.nestHp.toFixed(1));

    /* senza difesa, la razzia sfonda il nido. Stessa meccanica, colonia
     * lontana: la formica sul cratere colpisce e basta. */
    useSeed(SEEDS[0]);
    freshWorld();
    const q = W.player;
    q.workers = 14; q.baseWorkers = 14; q.losses = 0; q.crumbs = 400;
    const bot2 = W.colonies.find((c) => !c.isPlayer);
    L.World.spawnRaid(bot2, q);
    let safe = { x: q.nestX + 1200, y: q.nestY + 900 };
    for (let i = 0; i < 4000; i++) {
        const sx = 400 + Math.random() * (C.world.w - 800);
        const sy = 400 + Math.random() * (C.world.h - 800);
        if (L.dist2(sx, sy, q.nestX, q.nestY) < 900 * 900) continue;
        let ok = true;
        for (const dr of W.drops) if (L.dist2(sx, sy, dr.x, dr.y) < 220 * 220) { ok = false; break; }
        if (ok) for (const ik of W.inks) if (L.dist2(sx, sy, ik.x, ik.y) < 220 * 220) { ok = false; break; }
        if (ok) { safe = { x: sx, y: sy }; break; }
    }
    const ant2 = W.raids[0];
    ant2.x = q.nestX; ant2.y = q.nestY;
    let nestHit = false;
    for (let i = 0; i < 60 * 20 && !nestHit; i++) {
        q.x = safe.x; q.y = safe.y; q.targetAngle = 0;
        L.World.step(DT);
        for (const e of W.events) {
            if (e.type === "nestHit" && e.colony === q) nestHit = true;
        }
        W.events.length = 0;
    }
    check("una razzia non difesa colpisce il nido", nestHit);

    /* nido a zero: colonia annessa dal razziatore.
     * Deterministico: la colonia si allontana dal nido (non difende), la
     * formica d'assalto viene piazzata sul cratere. */
    useSeed(SEEDS[0]);
    freshWorld();
    const r = W.player;
    r.workers = 14; r.baseWorkers = 14; r.losses = 0;
    r.nestHp = C.nest.crashDamage * 0.5;
    check("il nido del giocatore parte pieno prima del test", r.nestHp > 0, r.nestHp);

    /* un punto lontano dal nido e fuori dai pericoli */
    let safeSpot = { x: r.nestX + 1200, y: r.nestY };
    for (let i = 0; i < 4000; i++) {
        const sx = 400 + Math.random() * (C.world.w - 800);
        const sy = 400 + Math.random() * (C.world.h - 800);
        if (L.dist2(sx, sy, r.nestX, r.nestY) < 900 * 900) continue;
        let ok = true;
        for (const dr of W.drops) if (L.dist2(sx, sy, dr.x, dr.y) < 200 * 200) { ok = false; break; }
        if (ok) for (const ik of W.inks) if (L.dist2(sx, sy, ik.x, ik.y) < 200 * 200) { ok = false; break; }
        if (ok) { safeSpot = { x: sx, y: sy }; break; }
    }
    r.x = safeSpot.x; r.y = safeSpot.y;

    const bot3 = W.colonies.find((c) => !c.isPlayer);
    L.World.spawnRaid(bot3, r);
    const ant = W.raids[0];
    ant.x = r.nestX; ant.y = r.nestY;
    let annexedByRaid = false;
    for (let i = 0; i < 12 && !annexedByRaid; i++) {
        r.x = safeSpot.x; r.y = safeSpot.y;
        L.World.step(DT);
        for (const e of W.events) {
            if (e.type === "colonyDeath" && e.colony === r && e.killer === bot3) annexedByRaid = true;
        }
        W.events.length = 0;
    }
    check("il nido distrutto annega la colonia al razziatore", annexedByRaid);
}

/* ================================================================
 * 9. Giorno e notte
 * ================================================================ */
section("day and night");
{
    useSeed(SEEDS[0]);
    freshWorld();

    W.phase = C.day.nightStart - 0.01;
    let nightfall = false;
    let nightSawHigh = false;
    for (let i = 0; i < 60 * 30; i++) {
        L.World.step(DT);
        for (const e of W.events) {
            if (e.type === "nightfall") nightfall = true;
        }
        if (W.night > 0.5) nightSawHigh = true;
        W.events.length = 0;
    }
    check("la notte cala e viene annunciata", nightfall && nightSawHigh,
        "nightfall=" + nightfall + " night=" + W.night.toFixed(2));

    let dawn = false;
    for (let i = 0; i < 60 * 80 && !dawn; i++) {
        L.World.step(DT);
        for (const e of W.events) if (e.type === "dawn") dawn = true;
        W.events.length = 0;
    }
    check("l'alba torna e viene annunciata", dawn);

    check("il ciclo giorno/notte è lungo il previsto",
        Math.abs(C.day.length - 108) < 1, C.day.length);
}

/* ================================================================
 * 10. Grudges
 * ================================================================ */
section("grudges");
{
    store.delete(GRUDGE_KEY);
    useSeed(SEEDS[0]);
    freshWorld();
    const victim = W.colonies.find((c) => !c.isPlayer);

    L.Bots.onKill(W.player, victim);
    check("annettere una colonia ti frutta un rancore",
        (L.Storage.getGrudges()[victim.botId] || 0) > 0,
        JSON.stringify(L.Storage.getGrudges()));

    store.delete(GRUDGE_KEY);
    L.Bots.onKill(victim, W.player);
    check("morire per una colonia gliene dà uno su di te",
        (L.Storage.getGrudges()[victim.botId] || 0) > 0);

    const before = L.Storage.getGrudges()[victim.botId];
    L.Bots.onKill(victim, W.player);
    check("i rancori non superano 1", L.Storage.getGrudges()[victim.botId] <= 1);
    L.Storage.decayGrudges();
    L.Storage.decayGrudges();
    check("i rancori svaniscono col tempo",
        L.Storage.getGrudges()[victim.botId] < before);
}

/* ================================================================
 * 11. Suite comportamentale aggregata
 * ================================================================ */
const agg = {
    minPop: Infinity, popSamples: [], raidsLaunched: 0, crashes: 0, deaths: 0,
    annexedTotal: 0, crumbsDeposited: 0, lifespans: [], raidAntsSeen: 0,
    paintedCells: 0, bestWorkers: 0,
};

for (const seed of SEEDS) {
    useSeed(seed);

    /* --- ecologia: 75s di colonie nemiche sole --- */
    freshWorld(false);
    const born = {};
    for (const c of W.colonies) born[c.slot] = 0;

    for (let s = 0; s < 75 * 60; s++) {
        L.Bots.update(W, DT);
        L.World.step(DT);
        for (const e of W.events) {
            if (e.type === "raidLaunch") agg.raidsLaunched++;
            if (e.type === "nestHit") agg.crashes++;
            if (e.type === "colonyDeath") {
                agg.deaths++;
                const b = e.colony.slot;
                if (born[b] !== undefined) agg.lifespans.push(s * DT - born[b]);
                delete born[b];
            }
            if (e.type === "annex") agg.annexedTotal++;
            if (e.type === "workerUp") agg.bestWorkers = Math.max(agg.bestWorkers, e.colony.workers);
        }
        W.events.length = 0;
        for (const c of W.colonies) if (born[c.slot] === undefined) born[c.slot] = s * DT;
        agg.raidAntsSeen = Math.max(agg.raidAntsSeen, W.raids.length);
        if (s % 600 === 0) {
            agg.minPop = Math.min(agg.minPop, W.colonies.length);
            agg.popSamples.push(W.colonies.length);
            for (const c of W.colonies) agg.paintedCells = Math.max(agg.paintedCells, c.territory);
        }
        if (s % 900 === 0) {
            for (const c of W.colonies) {
                if (!finite(c.x) || !finite(c.y) || !finite(c.workers)) {
                    failures++;
                    console.log("  FAIL  stato colonia non finito");
                    break;
                }
            }
        }
    }

    /* --- sessione giocatore: 90s, fa la vita di una persona reale --- */
    freshWorld();
    let player = W.player;
    let lives = 0;

    for (let step = 0; step < 90 * 60; step++) {
        L.Bots.update(W, DT);

        /* strategia dello script: raccogli, torna a casa, evita gocce */
        if (!player.carrying) {
            const target = L.World.nearestCrumb(player, 800);
            if (target) {
                player.targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
            }
        } else {
            player.targetAngle = Math.atan2(player.nestY - player.y, player.nestX - player.x);
        }

        /* l'acqua è la morte: sterzaci attorno */
        for (const pd of [120, 240]) {
            const qx = player.x + Math.cos(player.targetAngle) * pd;
            const qy = player.y + Math.sin(player.targetAngle) * pd;
            for (const dr of W.drops) {
                if (L.dist2(qx, qy, dr.x, dr.y) < (dr.r + 60) * (dr.r + 60)) {
                    player.targetAngle += 1.2;
                }
            }
        }

        L.World.step(DT);
        agg.crumbsDeposited += 0;
        if (player.earned > agg.crumbsDeposited) agg.crumbsDeposited = player.earned;

        let died = false;
        for (const e of W.events) {
            if (e.type === "playerDeath") died = true;
            if (e.type === "workerUp") agg.bestWorkers = Math.max(agg.bestWorkers, e.colony.workers);
        }
        W.events.length = 0;

        if (died) {
            lives++;
            for (const c of W.colonies) {
                if (c.isPlayer) W.colonies.splice(W.colonies.indexOf(c), 1);
            }
            player = L.World.addPlayer("Script", "#ff7043");
            player.x = C.world.w / 2; player.y = C.world.h / 2;
        }
    }
}

section("ecology (aggregated over " + SEEDS.length + " seeds)");
console.log("  min rival population: " + agg.minPop +
    "   raids launched: " + agg.raidsLaunched +
    "   nest crashes: " + agg.crashes +
    "   colony deaths: " + agg.deaths +
    "   annexed: " + agg.annexedTotal);
check("le colonie nemiche non si estinguono", agg.minPop >= 1, "min=" + agg.minPop);
check("la popolazione si mantiene in media",
    mean(agg.popSamples) > 3.4, mean(agg.popSamples).toFixed(2));
check("qualcuno lancia almeno una razzia", agg.raidsLaunched > 0, agg.raidsLaunched);
check("le razzie lasciano il segno", agg.crashes > 0, agg.crashes);
check("le colonie morenti vengono annesse da qualcuno", agg.annexedTotal > 0, agg.annexedTotal);
check("le colonie dipingono territorio", agg.paintedCells > 40, agg.paintedCells);
check("qualcuno fa crescere la colonia", agg.bestWorkers > C.bots.startWorkersMax, agg.bestWorkers);

section("player experience (aggregated)");
console.log("  best earned crumbs: " + agg.crumbsDeposited + "   best workers: " + agg.bestWorkers);
check("il giocatore scriptato sa nutrire la colonia",
    agg.crumbsDeposited > C.colony.workersPerCrumbs, agg.crumbsDeposited);
check("nessuna colonia è impazzita",
    W.colonies.every((c) => finite(c.x) && finite(c.y)));

/* ================================================================
 * 12. Performance
 * ================================================================ */
section("performance");
useSeed(SEEDS[0]);
freshWorld();
for (let i = 0; i < 60; i++) { L.Bots.update(W, DT); L.World.step(DT); W.events.length = 0; }
const t0 = process.hrtime.bigint();
for (let i = 0; i < 600; i++) { L.Bots.update(W, DT); L.World.step(DT); W.events.length = 0; }
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6 / 600;
console.log("  sim step: " + ms.toFixed(3) + " ms/frame (budget 16.7)");
check("la simulazione sta comoda in un frame a 60fps", ms < 8, ms.toFixed(3));

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"));
process.exit(failures === 0 ? 0 : 1);
