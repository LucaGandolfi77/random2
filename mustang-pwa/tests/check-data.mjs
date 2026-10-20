import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const D = require(resolve(here, "..", "src", "data.js"));

let failures = 0;
let checks = 0;

function ok(label, condition, detail) {
    checks++;
    if (condition) return;
    failures++;
    console.error("  FAIL  " + label + (detail ? " -> " + detail : ""));
}

function section(name) {
    console.log("\n" + name);
}

/* ===== Config ===== */
section("config");
const c = D.config;
ok("canvas is portrait 400x600", c.canvasWidth === 400 && c.canvasHeight === 600, c.canvasWidth + "x" + c.canvasHeight);
ok("scroll speed grows with stage", c.scrollMax > c.scrollStart);
ok("bomber combo caps at 9000", c.bomberComboBase === undefined && c.bomberBaseScore === 2000 && c.bomberComboMax === 9000);
ok("loop bonus is 1000", c.loopBonus === 1000);
ok("formation bonus is 500", c.formationBonus === 500);
ok("POW bonus is 1000", c.powBonus === 1000);
ok("Yashichi medal is 5000", c.yashichiBonus === 5000);

/* ===== Themes ===== */
section("themes");
const themeKeys = ["bg", "grid", "text", "plane", "planeGrad", "bullet", "enemy", "powerup", "accent", "accent2", "water", "waterDeep", "foam", "land", "landDark", "sand"];
ok("exactly four themes", Object.keys(D.themes).length === 4, Object.keys(D.themes).join(","));
for (const [name, th] of Object.entries(D.themes)) {
    for (const k of themeKeys) {
        ok("theme " + name + " has " + k, typeof th[k] === "string" && /^#[0-9a-f]{6}$/i.test(th[k]), th[k]);
    }
}

/* ===== Archetypes ===== */
section("archetypes");
const airKeys = ["zero", "fighter", "heavy", "jet", "diver", "bomber", "ace", "kamikaze",
    "charger", "gunner", "splitter", "flanker"];
const specialKeys = ["yashichi"];
const groundKeys = ["tank", "halftrack", "truck", "artillery", "flak", "radar", "battery"];
const seaKeys = ["ship", "sub", "patrol"];
for (const id of [...airKeys, ...specialKeys, ...groundKeys, ...seaKeys, "boss"]) {
    const a = D.archetypes[id];
    ok("archetype " + id + " exists", !!a);
    if (!a) continue;
    ok("archetype " + id + " has kind", ["air", "ground", "sea", "special", "boss"].indexOf(a.kind) >= 0, a.kind);
    ok("archetype " + id + " has positive hp/pts/r", a.hp > 0 && a.pts >= 0 && a.r > 0);
    const artSets = { air: D.artShapes, special: D.artShapes, boss: D.artShapes, ground: { }, sea: { } };
    const knownArt = a.kind === "ground" ? D.groundArt : a.kind === "sea" ? D.seaArt : Object.keys(artSets[a.kind] || {});
    ok("archetype " + id + " has a known art shape", knownArt.indexOf(a.art) >= 0, a.art);
    ok("archetype " + id + " has ai", typeof a.ai === "string" && a.ai.length > 0, a.ai);
}
for (const id of airKeys) ok(id + " is an air unit", D.archetypes[id].kind === "air");
ok("yashichi is a special unit", D.archetypes.yashichi.kind === "special");
ok("boss is the toughest unit", D.archetypes.boss.hp > D.archetypes.bomber.hp);

/* ===== Power-ups ===== */
section("power-ups");
const powIds = ["green", "white", "grey", "orange", "yellow", "black", "red"];
ok("seven POW colours", Object.keys(D.powerups).length === powIds.length, Object.keys(D.powerups).join(","));
for (const id of powIds) {
    const p = D.powerups[id];
    ok("POW " + id + " defined", !!p);
    if (p) ok("POW " + id + " has label and colour", !!p.label && /^#[0-9a-f]{6}$/i.test(p.color), p.color);
}

/* ===== Bonus table ===== */
section("end of stage bonus");
const expected = [
    [100, "SPECIAL", 50000], [95, "", 20000], [90, "", 10000], [85, "", 5000],
    [80, "", 4000], [70, "", 3000], [60, "", 2000], [50, "", 1000], [0, "", 0],
];
ok("nine bonus rows", D.bonusTable.length === expected.length);
D.bonusTable.forEach((row, i) => {
    const e = expected[i];
    ok("bonus row " + i, row.min === e[0] && row.pts === e[2], JSON.stringify(row) + " expected " + JSON.stringify(e));
});
ok("bonus rows are sorted highest threshold first", D.bonusTable.every((r, i) => i === 0 || r.min < D.bonusTable[i - 1].min));
const probes = [[100, 50000], [96, 20000], [90, 10000], [85, 5000], [80, 4000], [72, 3000], [65, 2000], [50, 1000], [12, 0]];
for (const [acc, pts] of probes) ok("bonusFor(" + acc + ") = " + pts, D.bonusFor(acc).pts === pts, String(D.bonusFor(acc).pts));
ok("bonusFor(100) is SPECIAL", D.bonusFor(100).label === "SPECIAL");

/* ===== Theatres and stage tables ===== */
section("roster reachability");
{
    // un archetyp definito ma assente da ogni roster non puo' mai apparire
    const reachable = new Set();
    for (const id of Object.keys(D.theatres)) {
        for (const st of D.allStages[id]) for (const u of st.roster) reachable.add(u);
    }
    const orphans = Object.keys(D.archetypes).filter((k) =>
        k !== "yashichi" && k !== "boss" && !reachable.has(k));
    ok("every archetype is reachable from some stage roster", orphans.length === 0, orphans.join(","));
}

section("theatres and stages");
const theatreIds = Object.keys(D.theatres);
ok("two theatres", theatreIds.length === 2, theatreIds.join(","));
const allUnits = new Set([...airKeys, ...groundKeys, ...seaKeys]);

for (const id of theatreIds) {
    const t = D.theatres[id];
    const stages = D.allStages[id];
    ok("theatre " + id + " has 32 stages", stages.length === 32, String(stages.length));
    ok("theatre " + id + " has 32 rows", t.rows.length === 32, String(t.rows.length));

    const numbers = stages.map((s) => s.n);
    ok("stage numbers run 32 down to 1", numbers.every((n, i) => n === 32 - i), numbers.join(","));

    const names = stages.map((s) => s.name);
    ok("every stage is named", names.every((n) => typeof n === "string" && n.length > 0));

    const biomes = stages.map((s) => s.biome);
    ok("every stage has a valid biome", biomes.every((b) => ["sea", "land", "mixed"].indexOf(b) >= 0));

    let prevSpeed = -1;
    let okSpeed = true;
    for (const s of stages) {
        if (s.speed <= prevSpeed) okSpeed = false;
        prevSpeed = s.speed;
    }
    ok("scroll speed rises stage after stage", okSpeed);
    ok("speeds stay inside config bounds", stages.every((s) => s.speed >= c.scrollStart && s.speed <= c.scrollMax));
    ok("density rises stage after stage", stages.every((s, i) => i === 0 || s.density >= stages[i - 1].density));

    for (const s of stages) {
        ok("stage " + s.n + " roster is not empty", s.roster.length > 0);
        for (const u of s.roster) {
            ok("stage " + s.n + " unit " + u + " exists", allUnits.has(u));
            ok("theatre " + id + " labels " + u, typeof t.labels[u] === "string" && t.labels[u].length > 0);
        }
        ok("stage " + s.n + " POW types are valid", s.pows.every((p) => powIds.indexOf(p) >= 0), s.pows.join(","));
    }
    ok("theatre " + id + " player plane has a known art shape", typeof D.artShapes[t.planeArt] === "object", t.planeArt);
    ok("theatre " + id + " side fighter has a known art shape", typeof D.artShapes[t.sideArt] === "object", t.sideArt);
    ok("theatre " + id + " side fighter is smaller than the player", D.artShapes[t.sideArt].span <= D.artShapes[t.planeArt].span);
    ok("theatre " + id + " player has a name and year", !!t.plane && !!t.year && !!t.blurb);
    ok("theatre " + id + " has 8 named sectors", [...new Set(names)].length === 8, [...new Set(names)].join(" / "));
    ok("theatre " + id + " boss label exists", typeof t.labels.boss === "string" && t.labels.boss.length > 0);
}

/* ===== Power-up schedule ===== */
section("POW schedule");
ok("schedule covers all 32 stages", Object.keys(D.powPlan).length === 32, String(Object.keys(D.powPlan).length));
for (const [num, list] of Object.entries(D.powPlan)) {
    ok("stage " + num + " POW list is valid", list.every((p) => powIds.indexOf(p) >= 0), list.join(","));
}
ok("quad firepower on even stages", [32, 28, 24, 20, 16, 12, 8, 4].every((s) => D.powPlan[s].indexOf("green") >= 0));
ok("smart bomb appears 8 times", [1, 3, 7, 11, 18, 19, 21, 31].every((s) => D.powPlan[s].indexOf("white") >= 0));
ok("side fighters appear 8 times", [2, 6, 10, 14, 18, 22, 26, 30].every((s) => D.powPlan[s].indexOf("grey") >= 0));
ok("extra life appears on V-formation stages", [4, 8, 15, 20, 27].every((s) => D.powPlan[s].indexOf("black") >= 0));

/* ===== Set-piece schedules ===== */
section("set pieces");
ok("v-formation stages match the arcade schedule",
    [4, 8, 15, 20, 27].every((n) => D.allStages.overlord[32 - n].vFormation)
    && [4, 8, 15, 20, 27].every((n) => D.allStages.rising[32 - n].vFormation));
ok("no other stage has a v-formation",
    D.allStages.overlord.filter((s) => s.vFormation).map((s) => s.n).sort((x, y) => x - y).join(",") === "4,8,15,20,27",
    D.allStages.overlord.filter((s) => s.vFormation).map((s) => s.n).join(","));
ok("yashichi stages match the arcade schedule",
    D.allStages.overlord.filter((s) => s.yashichi).map((s) => s.n).sort((x, y) => x - y).join(",") === "1,5,9,13,17,21,25,29",
    D.allStages.overlord.filter((s) => s.yashichi).map((s) => s.n).join(","));
ok("both theatres share the set-piece schedule",
    D.allStages.overlord.map((s) => s.vFormation).join() === D.allStages.rising.map((s) => s.vFormation).join()
    && D.allStages.overlord.map((s) => s.yashichi).join() === D.allStages.rising.map((s) => s.yashichi).join());

/* ===== Boss schedule ===== */
section("boss schedule");
ok("four boss stages", Object.keys(D.bossStages).length === 4);
ok("bosses at stages 26, 18, 10, 2", [26, 18, 10, 2].every((s) => D.bossStages[s] >= 1));
for (const id of theatreIds) {
    const stages = D.allStages[id];
    ok("theatre " + id + " has a boss on 26/18/10/2", [26, 18, 10, 2].every((s) => stages[32 - s].bossTier > 0));
    ok("theatre " + id + " has no other boss", stages.every((s) => [26, 18, 10, 2].indexOf(s.n) < 0 || s.bossTier > 0));
}

/* ===== Difficulty ===== */
section("difficulty");
const diffs = Object.keys(D.difficulty);
ok("three difficulty presets", diffs.length === 3, diffs.join(","));
for (const key of ["speed", "hp", "fire", "bullet", "density"]) {
    ok("difficulty scales " + key, diffs.every((k) => typeof D.difficulty[k][key] === "number" && D.difficulty[k][key] > 0));
}
ok("arcade is the neutral preset",
    diffs.every((k) => D.difficulty[k].speed >= 0.8 && D.difficulty[k].speed <= 1.2));
ok("recruit is strictly gentler than ace across the board",
    ["speed", "hp", "fire", "bullet", "density"].every((k) => D.difficulty.recruit[k] < D.difficulty.ace[k]));
ok("every preset has a label", diffs.every((k) => typeof D.difficulty[k].label === "string"));

/* ===== Feel tuning ===== */
section("feel tuning");
ok("the speed curve makes late stages faster", D.config.curveSpeed > 0);
ok("shake decays", D.config.shakeDecay > 0);
ok("shake is capped", D.config.shakeMax > 0 && D.config.shakeMax <= 12);
ok("hit stop is short enough not to hurt", D.config.hitStopBoss < 0.15 && D.config.hitStopDeath < 0.2);
ok("the tally auto-advances after a few seconds", D.config.tallyAutoAdvance >= 3 && D.config.tallyAutoAdvance <= 10);

/* ===== POW letters ===== */
section("POW marks");
ok("every crate has a single-character mark",
    Object.values(D.powerups).every((p) => typeof p.mark === "string" && p.mark.length === 1));
ok("marks are unique", (() => {
    const m = Object.values(D.powerups).map((p) => p.mark);
    return new Set(m).size === m.length;
})(), Object.values(D.powerups).map((p) => p.mark).join(""));
ok("crate colours are unique", (() => {
    const c = Object.values(D.powerups).map((p) => p.color);
    return new Set(c).size === c.length;
})());

/* ===== Music ===== */
section("music");
ok("music table exists", !!D.music);
const tracks = ["flight", "peril", "boss"];
ok("there are three tracks", tracks.every((n) => !!D.music[n]), tracks.join(","));
for (const name of tracks) {
    const t = D.music[name];
    ok(name + " has a bass line and a lead line",
        t.bass.length === t.lead.length && t.bass.length > 0, String(t.bass.length));
    ok(name + " has a sane tempo", t.tempo >= 100 && t.tempo <= 200, String(t.tempo));
    ok(name + " stays within an octave and a fifth",
        t.bass.concat(t.lead).every((n) => n >= 0 && n <= 19));
}
ok("the three tracks do not sound the same",
    new Set(tracks.map((n) => D.music[n].bass.join(","))).size === 3);
ok("the boss track is faster than the march",
    D.music.boss.tempo > D.music.flight.tempo, D.music.boss.tempo + " vs " + D.music.flight.tempo);
ok("the peril track is slower than the march",
    D.music.peril.tempo < D.music.flight.tempo, D.music.peril.tempo + " vs " + D.music.flight.tempo);
ok("the peril track has a tritone in it",
    D.music.peril.bass.some((n) => n === 6), D.music.peril.bass.join(","));

/* ===== Shoot-down weights ===== */
section("shoot-down weights");
ok("every archetype has a weight", Object.values(D.archetypes).every((a) => typeof a.weight === "number" && a.weight > 0));
ok("the cheapest target is worth 1", D.archetypes.zero.weight === 1);
ok("a warship outweighs a fighter", D.archetypes.ship.weight >= D.archetypes.fighter.weight * 3);
ok("a bomber outweighs a fighter", D.archetypes.bomber.weight > D.archetypes.fighter.weight);
ok("a boss outweighs everything it spawns escorts with", D.archetypes.boss.weight > D.archetypes.ace.weight);

/* ===== Pilot Ranks ===== */
section("pilot ranks");
ok("five ranks", D.pilotRanks.length === 5, String(D.pilotRanks.length));
ok("ranks are ordered highest first", D.pilotRanks.every((r, i) => i === 0 || r.min < D.pilotRanks[i - 1].min));
ok("ranks start at zero", D.pilotRanks[D.pilotRanks.length - 1].min === 0);
const rankProbes = [[0, "ROOKIE"], [19999, "ROOKIE"], [20000, "FIGHTER"], [59999, "FIGHTER"],
    [60000, "VETERAN"], [149999, "VETERAN"], [150000, "ACE"], [299999, "ACE"],
    [300000, "TRIPLE ACE"], [5000000, "TRIPLE ACE"]];
for (const [score, rank] of rankProbes) ok("rankFor(" + score + ") = " + rank, D.rankFor(score) === rank, D.rankFor(score));
ok("reaching stage 1 still outranks a rookie", D.rankFor(1000000) === "TRIPLE ACE");

/* ===== Sector cards ===== */
section("sector cards");
for (const theatre of ["overlord", "rising"]) {
    const carte = D.sectorCards[theatre];
    ok(theatre + " has eight cards", Object.keys(carte).length === 8, String(Object.keys(carte).length));
    const settori = [...new Set(D.allStages[theatre].map((s) => s.name))];
    ok(theatre + " has a card for every sector", settori.every((n) => !!carte[n]),
        settori.filter((n) => !carte[n]).join(","));
    ok(theatre + " cards all have a place, a date and a line",
        Object.values(carte).every((c) => c.place && c.date && c.line && c.line.length > 20));
    ok(theatre + " card lines are short enough to read on a phone",
        Object.values(carte).every((c) => c.line.length < 130));
}

/* ===== Sectors ===== */
section("sectors");
for (const theatre of ["overlord", "rising"]) {
    const list = D.sectors[theatre];
    ok(theatre + " has eight sectors", list.length === 8, String(list.length));
    ok(theatre + " sectors have no duplicates", new Set(list).size === list.length);
    ok(theatre + " sectors match the cards",
        list.every((n) => !!D.sectorCards[theatre][n]), list.join(","));
    const settori = [...new Set(D.allStages[theatre].map((s) => s.name))];
    ok(theatre + " sectors match the stages",
        list.join("|") === settori.join("|"), list.join("|") + " vs " + settori.join("|"));
    ok(theatre + " has four stages to a sector",
        D.allStages[theatre].length === list.length * 4, String(D.allStages[theatre].length));
}

/* ===== Extends ===== */
section("extends");
ok("three thresholds", D.extendTable.length === 3, String(D.extendTable.length));
ok("the thresholds are ordered highest first", D.extendTable.every((r, i) => i === 0 || r.min < D.extendTable[i - 1].min));
ok("the first threshold is 20000", D.extendTable[D.extendTable.length - 1].min === 20000, String(D.extendTable[D.extendTable.length - 1].min));
ok("the lives are capped", D.config.maxLives > D.config.startLives, String(D.config.maxLives));

/* ===== Threading ===== */
section("threading");
ok("a thread is worth points", D.config.threadPoints > 0, String(D.config.threadPoints));
ok("the chain is capped", D.config.threadChainMax >= 2, String(D.config.threadChainMax));
ok("the chain decays in about two seconds", D.config.threadDecay > 1 && D.config.threadDecay < 4, String(D.config.threadDecay));
ok("one enemy cannot be threaded twice in a quarter of a second",
    D.config.threadCooldown > 0.2, String(D.config.threadCooldown));
ok("a thread pays more than one thread of the chain",
    D.config.threadPoints * 2 > D.config.threadPoints);

/* ===== Boss values ===== */
section("boss values");
ok("tier 1 boss pays 20000", D.archetypes.boss.pts + (1 - 1) * 10000 === 20000, String(D.archetypes.boss.pts));
ok("tier 4 boss pays 50000", D.archetypes.boss.pts + (4 - 1) * 10000 === 50000);

/* ===== Report ===== */
console.log("\n" + (failures === 0 ? "OK" : "FAILED") + ": " + (checks - failures) + "/" + checks + " checks passed");
process.exit(failures === 0 ? 0 : 1);