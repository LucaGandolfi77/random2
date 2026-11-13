#!/usr/bin/env node
/*
 * LAST CALL headless suite.
 *
 *   node last-call-pwa/tests/run.mjs
 *
 * Loads the real simulation, cards, AI and storage files into Node with a
 * Map-backed localStorage. No browser, no dependencies, no fake timers.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const REPO = path.resolve(ROOT, "..");

let passed = 0;
const failures = [];

function section(name) {
    console.log(`\n== ${name} ==`);
}

function check(name, condition, detail) {
    if (condition) {
        passed++;
        return true;
    }
    failures.push({ name, detail });
    console.log(`FAIL  ${name}${detail === undefined ? "" : `  (${format(detail)})`}`);
    return false;
}

function eq(name, actual, expected) {
    return check(name, Object.is(actual, expected), `got ${format(actual)}, want ${format(expected)}`);
}

function close(name, actual, expected, epsilon = 1e-9) {
    return check(name, Math.abs(actual - expected) <= epsilon,
        `got ${format(actual)}, want ${format(expected)} ±${epsilon}`);
}

function format(value) {
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    if (Array.isArray(value)) return `[${value.map(format).join(", ")}]`;
    if (value && typeof value === "object") {
        try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
}

/* ---------- module loader ---------- */

const store = new Map();
const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
};

const sandbox = {
    window: { LC: {} },
    localStorage,
    console,
    setTimeout,
    clearTimeout
};
vm.createContext(sandbox);

const MODULES = ["config", "util", "rng", "cards", "storage", "sim", "ai"];
for (const name of MODULES) {
    const file = path.join(ROOT, "src", `${name}.js`);
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
}
const LC = sandbox.window.LC;
const C = LC.CONFIG;

function freshProfile() {
    return LC.Storage.defaultProfile();
}

function freshMatch(options = {}) {
    return LC.Sim.createMatch({
        seed: options.seed === undefined ? 1234 : options.seed,
        mode: options.mode || "tour",
        venue: options.venue || LC.VENUES[0],
        playerDeck: options.playerDeck || LC.STARTER_DECK,
        aiDeck: options.aiDeck || LC.VENUES[0].deck,
        playerLevels: options.playerLevels || {},
        ai: options.ai || LC.VENUES[0].ai
    });
}

function runMatch(state, maxSeconds = 260) {
    const steps = Math.ceil(maxSeconds * 60);
    for (let i = 0; i < steps && state.phase !== "ended"; i++) {
        LC.Sim.update(state, 1 / 60);
    }
    return state;
}

function assertFiniteState(state) {
    const numbers = [
        state.clock, state.remaining, state.buzz.player, state.buzz.enemy,
        state.crowns.player, state.crowns.enemy
    ];
    if (!numbers.every(Number.isFinite)) return false;
    for (const u of state.units) {
        if (![u.x, u.y, u.hp, u.maxHp, u.dmg].every(Number.isFinite)) return false;
    }
    for (const t of state.towers) {
        if (![t.x, t.y, t.hp, t.maxHp].every(Number.isFinite)) return false;
    }
    return true;
}

/* ================================================================
 * Cards and venues
 * ================================================================ */
section("Roster and Bar Tour");

eq("the launch roster has 24 visible cards", LC.CARD_LIST.length, 24);
eq("the hidden token is outside the roster", Object.keys(LC.CARDS).length, 25);
eq("the token is marked hidden", LC.CARDS.rum_runner.hidden, true);

const families = { cocktails: 0, wine: 0, beer: 0, spirits: 0 };
for (const id of LC.CARD_LIST) {
    const card = LC.CARDS[id];
    families[card.family]++;
    check(`${id}: has a cost from 1 to 7`, card.cost >= 1 && card.cost <= 7, card.cost);
    check(`${id}: is a troop, building or spell`,
        ["troop", "building", "spell"].includes(card.type), card.type);
    check(`${id}: has stats and art`, !!card.s && !!card.art, card);
    check(`${id}: has a role, description and flavour`, !!card.role && !!card.desc && !!card.flavor);
    check(`${id}: has a rarity`, ["common", "rare", "epic", "legendary"].includes(card.rarity), card.rarity);
}
for (const [family, count] of Object.entries(families)) {
    eq(`the ${family} family has six cards`, count, 6);
}

eq("there are eight venues", LC.VENUES.length, 8);
eq("venue ids are unique", new Set(LC.VENUES.map(v => v.id)).size, 8);

const unlockable = new Set(LC.STARTER_DECK);
LC.VENUES.forEach((venue, index) => {
    eq(`${venue.id}: index is ${index}`, venue.index, index);
    eq(`${venue.id}: deck has eight cards`, venue.deck.length, 8);
    eq(`${venue.id}: deck has no duplicates`, new Set(venue.deck).size, 8);
    check(`${venue.id}: every deck card exists`, venue.deck.every(id => !!LC.CARDS[id]));
    eq(`${venue.id}: unlocks two drinks`, venue.unlock.length, 2);
    check(`${venue.id}: every unlock exists`, venue.unlock.every(id => !!LC.CARDS[id] && !LC.CARDS[id].hidden));
    check(`${venue.id}: has a name, district, tagline and accent`,
        !!venue.name && !!venue.district && !!venue.tagline && /^#/.test(venue.accent));
    const ai = venue.ai;
    check(`${venue.id}: AI levels are 1-4`, ai.level >= 1 && ai.level <= 4, ai.level);
    check(`${venue.id}: AI think time is positive`, ai.think > 0, ai.think);
    check(`${venue.id}: AI mistake chance is 0-1`, ai.mistake >= 0 && ai.mistake <= 1, ai.mistake);
    check(`${venue.id}: AI aggression is 0-1`, ai.aggression >= 0 && ai.aggression <= 1, ai.aggression);
    venue.unlock.forEach(id => unlockable.add(id));
});

eq("the starter deck has eight cards", LC.STARTER_DECK.length, 8);
eq("the starter deck has no duplicates", new Set(LC.STARTER_DECK).size, 8);
check("the starter deck is all visible cards",
    LC.STARTER_DECK.every(id => LC.CARDS[id] && !LC.CARDS[id].hidden));
eq("every visible card is obtainable", unlockable.size, 24);
for (const id of LC.CARD_LIST) {
    check(`${id}: is unlocked somewhere in the tour`, unlockable.has(id));
}

check("practice has easy, normal and hard",
    ["easy", "normal", "hard"].every(key => !!LC.PRACTICE[key]));
check("practice difficulty rises", LC.PRACTICE.easy.level < LC.PRACTICE.hard.level);
check("upgrade costs cover levels 1-4", LC.UPGRADE_COSTS.length === 5 && LC.UPGRADE_COSTS[0] === 0);
eq("the level cap is five", C.MAX_LEVEL, 5);
close("level 1 has no multiplier", LC.levelMultiplier(1), 1);
close("level 5 has a 32% multiplier", LC.levelMultiplier(5), 1.32);
check("a level 5 tank is tougher than a level 1 tank",
    LC.cardStatsAtLevel("barolo", 5).hp > LC.cardStatsAtLevel("barolo", 1).hp);

/* ================================================================
 * RNG
 * ================================================================ */
section("Seeded RNG");

const rngA = LC.makeRng(42);
const rngB = LC.makeRng(42);
const sequenceA = Array.from({ length: 20 }, () => rngA.next());
const sequenceB = Array.from({ length: 20 }, () => rngB.next());
eq("the same seed produces the same sequence", sequenceA.join(","), sequenceB.join(","));
check("all values are in [0, 1)", sequenceA.every(v => v >= 0 && v < 1));
check("a different seed drifts", LC.makeRng(43).next() !== sequenceA[0]);
eq("shuffle preserves the items",
    LC.makeRng(7).shuffle([1, 2, 3, 4, 5]).sort().join(","), "1,2,3,4,5");
eq("shuffle is deterministic with a seed",
    LC.makeRng(9).shuffle(["a", "b", "c", "d"]).join(","),
    LC.makeRng(9).shuffle(["a", "b", "c", "d"]).join(","));
eq("the starter deck average is computed",
    LC.deckCost(LC.STARTER_DECK).toFixed(2),
    (LC.STARTER_DECK.reduce((sum, id) => sum + LC.CARDS[id].cost, 0) / 8).toFixed(2));

/* ================================================================
 * Profile and persistence
 * ================================================================ */
section("Profile and persistence");

const defaultProfile = freshProfile();
eq("a new profile starts with 150 tips", defaultProfile.tips, 150);
eq("a new profile has three decks", defaultProfile.decks.length, 3);
check("all three decks are legal",
    defaultProfile.decks.every(deck => LC.Storage.validDeck(defaultProfile, deck)));
eq("all 24 cards have a record", Object.keys(defaultProfile.cards).length, 24);
eq("only the starter deck is unlocked at the start",
    Object.values(defaultProfile.cards).filter(c => c.unlocked).length, 8);
eq("all eight venues have a tour entry", Object.keys(defaultProfile.tour).length, 8);
eq("the first venue is unlocked", LC.Storage.venueUnlocked(defaultProfile, LC.VENUES[0]), true);
eq("the second venue is locked",
    LC.Storage.venueUnlocked(defaultProfile, LC.VENUES[1]), false);
eq("the next venue is the first one", LC.Storage.nextVenue(defaultProfile).id, LC.VENUES[0].id);

store.clear();
check("load falls back to a default profile when empty", !!LC.Storage.load());
eq("load returns starter tips when empty", LC.Storage.load().tips, 150);

const saved = freshProfile();
saved.tips = 777;
saved.activeDeck = 2;
eq("save reports success", LC.Storage.save(saved), true);
eq("load reads the saved tips", LC.Storage.load().tips, 777);
eq("load reads the saved active deck", LC.Storage.load().activeDeck, 2);

store.clear();
store.set(LC.Storage.KEY, "{not json");
eq("broken JSON boots a default profile", LC.Storage.load().tips, 150);

store.clear();
store.set(LC.Storage.KEY, JSON.stringify({
    tips: -40,
    cards: { mojito: { level: 99 }, barolo: { level: 2, unlocked: true }, ghost: { level: 3 } },
    decks: [[], [], []],
    activeDeck: 9,
    tour: null,
    stats: null,
    tutorialDone: "yes"
}));
const sanitized = LC.Storage.load();
eq("negative tips are clamped", sanitized.tips, 0);
eq("card levels are clamped", sanitized.cards.mojito.level, 5);
eq("unknown card records are removed", sanitized.cards.ghost, undefined);
eq("all decks are repaired", sanitized.decks.length, 3);
check("repaired decks are legal", sanitized.decks.every(deck => LC.Storage.validDeck(sanitized, deck)));
eq("activeDeck is clamped", sanitized.activeDeck, 2);
eq("missing tour data is rebuilt", Object.keys(sanitized.tour).length, 8);
check("missing stats are rebuilt", !!sanitized.stats && sanitized.stats.matches === 0);
eq("tutorialDone is coerced to a boolean", sanitized.tutorialDone, true);

const deckProfile = freshProfile();
eq("the starter deck is legal", LC.Storage.validDeck(deckProfile, LC.STARTER_DECK), true);
eq("duplicate cards are illegal",
    LC.Storage.validDeck(deckProfile, [LC.STARTER_DECK[0], ...LC.STARTER_DECK.slice(0, 7)]), false);
const lockedDeck = LC.STARTER_DECK.slice();
lockedDeck[0] = "barolo";
eq("locked cards are illegal", LC.Storage.validDeck(deckProfile, lockedDeck), false);
eq("a seven-card deck is illegal", LC.Storage.validDeck(deckProfile, LC.STARTER_DECK.slice(1)), false);
eq("setDeck rejects a duplicate deck",
    LC.Storage.setDeck(deckProfile, 1, [LC.STARTER_DECK[0], ...LC.STARTER_DECK.slice(0, 7)]), false);
eq("setDeck accepts a legal deck",
    LC.Storage.setDeck(deckProfile, 1, LC.STARTER_DECK.slice()), true);

/* ---------- upgrades ---------- */

const up = freshProfile();
up.cards.mojito.level = 1;
eq("the first upgrade costs 100", LC.UPGRADE_COSTS[1], 100);
const up1 = LC.Storage.upgrade(up, "mojito");
eq("upgrade succeeds", up1.ok, true);
eq("upgrade returns the new level", up1.level, 2);
eq("upgrade spends tips", up.tips, 50);
const up2 = LC.Storage.upgrade(up, "mojito");
eq("upgrade fails when tips are short", up2.ok, false);
eq("a failed upgrade does not change the level", up.cards.mojito.level, 2);
up.tips = 10000;
for (let i = 0; i < 3; i++) LC.Storage.upgrade(up, "mojito");
eq("upgrades stop at level 5", up.cards.mojito.level, 5);
eq("max level is refused", LC.Storage.upgrade(up, "mojito").ok, false);
eq("locked cards cannot be upgraded", LC.Storage.upgrade(up, "barolo").ok, false);

/* ---------- rewards ---------- */

const profile = freshProfile();
const win = freshMatch({ seed: 99, venue: LC.VENUES[0] });
win.crowns.player = 3;
LC.Sim.endMatch(win, "player", "cellar");
eq("three surviving towers give three stars", LC.starsFor(win), 3);
const reward1 = LC.Storage.recordMatch(profile, win, "tour", LC.VENUES[0]);
check("a first tour win returns a reward", !!reward1);
eq("the first clear is flagged", reward1.firstClear, true);
eq("the first clear gives three stars", reward1.stars, 3);
eq("the first clear pays base + crowns + bonus", reward1.tips, 310);
eq("the tips land in the profile", profile.tips, 460);
eq("the win is counted", profile.stats.wins, 1);
eq("the venue is cleared", profile.tour[LC.VENUES[0].id].cleared, true);
eq("the venue keeps three stars", profile.tour[LC.VENUES[0].id].stars, 3);
eq("the next venue unlocks", LC.Storage.venueUnlocked(profile, LC.VENUES[1]), true);
eq("two new drinks unlock", reward1.unlocked.length, 2);
check("the unlocked drinks are on the shelf",
    reward1.unlocked.every(id => profile.cards[id].unlocked));
eq("total stars is three", LC.Storage.totalStars(profile), 3);
eq("one venue is cleared", LC.Storage.clearedVenues(profile), 1);
eq("the next venue is now the second", LC.Storage.nextVenue(profile).id, LC.VENUES[1].id);

const reward2 = LC.Storage.recordMatch(profile, win, "tour", LC.VENUES[0]);
eq("a replay is not a first clear", reward2.firstClear, false);
eq("a replay pays the normal win fee", reward2.tips, 160);
eq("a replay does not unlock drinks", reward2.unlocked.length, 0);
eq("a replay still counts a win", profile.stats.wins, 2);

const loss = freshMatch({ seed: 100, venue: LC.VENUES[1] });
loss.crowns.enemy = 2;
LC.Sim.endMatch(loss, "enemy", "crowns");
eq("a loss gives no stars", LC.starsFor(loss), 0);
const reward3 = LC.Storage.recordMatch(profile, loss, "tour", LC.VENUES[1]);
eq("a tour loss pays the consolation fee", reward3.tips, 25);
eq("a loss is counted", profile.stats.losses, 1);
eq("a loss resets the streak", profile.stats.streak, 0);
eq("a loss does not clear the venue", profile.tour[LC.VENUES[1].id].cleared, false);

const practice = freshMatch({ seed: 101, mode: "practice" });
practice.crowns.player = 3;
LC.Sim.endMatch(practice, "player", "cellar");
const beforeTour = JSON.stringify(profile.tour);
const practiceReward = LC.Storage.recordMatch(profile, practice, "practice", null);
eq("practice win pays 30", practiceReward.tips, 30);
eq("practice grants no stars", practiceReward.stars, 0);
eq("practice leaves the tour untouched", JSON.stringify(profile.tour), beforeTour);
eq("practice still marks the tutorial done", profile.tutorialDone, true);

const twoTowerWin = freshMatch({ seed: 102 });
twoTowerWin.crowns.player = 2;
twoTowerWin.towers[0].alive = false;
twoTowerWin.towers[0].hp = 0;
LC.Sim.endMatch(twoTowerWin, "player", "crowns");
eq("two surviving towers give two stars", LC.starsFor(twoTowerWin), 2);
const oneTowerWin = freshMatch({ seed: 103 });
oneTowerWin.crowns.player = 1;
oneTowerWin.towers[0].alive = false;
oneTowerWin.towers[0].hp = 0;
oneTowerWin.towers[1].alive = false;
oneTowerWin.towers[1].hp = 0;
LC.Sim.endMatch(oneTowerWin, "player", "crowns");
eq("one surviving tower gives one star", LC.starsFor(oneTowerWin), 1);

/* ================================================================
 * Simulation
 * ================================================================ */
section("Simulation and deployment");

const state = freshMatch({ seed: 2026 });
eq("the match starts on the clock", state.phase, "playing");
eq("regulation is three minutes", state.remaining, C.MATCH_TIME);
eq("the starting Buzz is five", state.buzz.player, C.BUZZ_START);
eq("both hands have four cards", state.hand.player.length + state.hand.enemy.length, 8);
eq("both queues have four cards", state.queue.player.length + state.queue.enemy.length, 8);
check("the next-card slots are filled", !!state.next.player && !!state.next.enemy);
eq("there are six towers", state.towers.length, 6);
eq("each side has two taps and a cellar",
    state.towers.filter(t => t.side === "player" && t.towerType === "tap").length, 2);
eq("the player cellar starts inactive",
    state.towers.find(t => t.side === "player" && t.towerType === "cellar").active, false);
eq("lane taps start active",
    state.towers.find(t => t.side === "player" && t.towerType === "tap").active, true);

const deterministicA = freshMatch({ seed: 555 });
const deterministicB = freshMatch({ seed: 555 });
for (let i = 0; i < 900; i++) {
    LC.Sim.update(deterministicA, 1 / 60);
    LC.Sim.update(deterministicB, 1 / 60);
}
eq("same seed + same inputs produce the same clock", deterministicA.clock, deterministicB.clock);
eq("same seed + same inputs produce the same tower HP",
    deterministicA.towers.map(t => t.hp).join(","), deterministicB.towers.map(t => t.hp).join(","));
eq("same seed + same inputs produce the same crowns",
    JSON.stringify(deterministicA.crowns), JSON.stringify(deterministicB.crowns));

const deploy = freshMatch({ seed: 303 });
deploy.buzz.player = 10;
deploy.hand.player[0] = "lager";
eq("a troop can deploy on the player half",
    LC.Sim.canDeploy(deploy, "player", "lager", 225, 900).ok, true);
eq("a troop cannot deploy on the rival half",
    LC.Sim.canDeploy(deploy, "player", "lager", 225, 500).ok, false);
eq("a spell can deploy anywhere",
    LC.Sim.canDeploy(deploy, "player", "sparkling", 225, 500).ok, true);
eq("deployment outside the arena is refused",
    LC.Sim.canDeploy(deploy, "player", "lager", 10, 900).ok, false);

const play = LC.Sim.playCard(deploy, "player", 0, 225, 900);
eq("a legal card play succeeds", play.ok, true);
eq("the card cost is charged", deploy.buzz.player, 9);
eq("the hand cycles in a new card", deploy.hand.player[0] === "lager", false);
eq("the played card goes to the back of the queue",
    deploy.queue.player[deploy.queue.player.length - 1], "lager");
eq("the play is counted", deploy.stats.cardsPlayed, 1);
eq("the card is recorded for the profile", deploy.stats.playerCards.lager, 1);

const broke = freshMatch({ seed: 304 });
broke.buzz.player = 0;
broke.hand.player[0] = "barolo";
const brokePlay = LC.Sim.playCard(broke, "player", 0, 225, 900);
eq("a card cannot be played without Buzz", brokePlay.ok, false);
eq("the refused play does not spend Buzz", broke.buzz.player, 0);
eq("the refused play does not cycle the hand", broke.hand.player[0], "barolo");

const swarm = freshMatch({ seed: 305 });
swarm.buzz.player = 10;
swarm.hand.player[0] = "mojito";
LC.Sim.playCard(swarm, "player", 0, 225, 900);
eq("a count-3 card spawns three units",
    swarm.units.filter(u => u.cardId === "mojito").length, 3);

const building = freshMatch({ seed: 306 });
building.buzz.player = 10;
building.hand.player[0] = "icebucket";
LC.Sim.playCard(building, "player", 0, 300, 1000);
eq("a building card creates a building",
    building.buildings.filter(b => b.cardId === "icebucket").length, 1);
eq("a building is not also a unit",
    building.units.filter(u => u.cardId === "icebucket").length, 0);

const spellState = freshMatch({ seed: 307 });
spellState.ai.disabled = true;
spellState.buzz.player = 10;
spellState.buzz.enemy = 10;
spellState.hand.enemy[0] = "lager";
LC.Sim.playCard(spellState, "enemy", 0, 675, 500);
for (let i = 0; i < 60; i++) LC.Sim.update(spellState, 1 / 60);
const target = spellState.units.find(u => u.side === "enemy");
spellState.hand.player[0] = "sparkling";
spellState.buzz.player = 10;
const spellPlay = LC.Sim.playCard(spellState, "player", 0, target.x, target.y);
eq("a spell play succeeds", spellPlay.ok, true);
eq("the spell spends Buzz", spellState.buzz.player, 9);
check("the spell damages the target", target.hp < target.maxHp, target.hp);
check("the spell slows the target", target.slowUntil > spellState.clock);

const eventState = freshMatch({ seed: 308 });
const events = LC.Sim.drainEvents(eventState);
check("a new match emits a start event", events.some(e => e.type === "start"));
eq("draining empties the event queue", eventState.events.length, 0);

const happy = freshMatch({ seed: 309 });
happy.remaining = C.HAPPY_HOUR + 0.01;
LC.Sim.update(happy, 0.05);
eq("Happy Hour starts in the last minute", happy.happyHour, true);
eq("Happy Hour is announced", happy.happyHourAnnounced, true);

const overtime = freshMatch({ seed: 310 });
overtime.remaining = 0.001;
overtime.crowns.player = 0;
overtime.crowns.enemy = 0;
LC.Sim.update(overtime, 1 / 60);
eq("level crowns start overtime", overtime.phase, "overtime");
eq("overtime is one minute", overtime.remaining, C.OVERTIME_TIME);
eq("the cellars activate in overtime",
    overtime.towers.filter(t => t.towerType === "cellar").every(t => t.active), true);

const tiebreak = freshMatch({ seed: 311 });
tiebreak.phase = "overtime";
tiebreak.remaining = 0.001;
tiebreak.crowns.player = 0;
tiebreak.crowns.enemy = 0;
const playerCellar = LC.Sim.towerOf(tiebreak, "player", "cellar");
const enemyCellar = LC.Sim.towerOf(tiebreak, "enemy", "cellar");
playerCellar.hp = 1000;
enemyCellar.hp = 2800;
LC.Sim.update(tiebreak, 1 / 60);
eq("the healthier cellar wins an overtime tiebreak", tiebreak.result.winner, "enemy");
eq("the tiebreak reason is recorded", tiebreak.result.reason, "tiebreak");

const aiMatch = freshMatch({ seed: 777, venue: LC.VENUES[0] });
let enemyPlays = 0;
const originalPlayCard = LC.Sim.playCard;
LC.Sim.playCard = function (match, side, index, x, y) {
    if (side === "enemy" && match.phase !== "ended") {
        enemyPlays++;
        const hand = match.hand.enemy;
        check("the AI plays a real hand slot", index >= 0 && index < hand.length, index);
        const card = LC.CARDS[hand[index]];
        check("the AI card exists", !!card, hand[index]);
        if (card) {
            check("the AI can afford its card", match.buzz.enemy + 1e-4 >= card.cost,
                `${match.buzz.enemy} < ${card.cost}`);
            check("the AI deploys legally", LC.Sim.canDeploy(match, "enemy", card.id, x, y).ok,
                LC.Sim.canDeploy(match, "enemy", card.id, x, y).reason);
        }
    }
    return originalPlayCard(match, side, index, x, y);
};
runMatch(aiMatch, 250);
LC.Sim.playCard = originalPlayCard;
check("the AI actually plays cards", enemyPlays > 0, enemyPlays);
eq("an idle player match ends", aiMatch.phase, "ended");
check("the match has a result", !!aiMatch.result);
check("the winner is player, enemy or draw",
    ["player", "enemy", "draw"].includes(aiMatch.result.winner), aiMatch.result.winner);
check("the result crowns match the state",
    aiMatch.result.crowns.player === aiMatch.crowns.player &&
    aiMatch.result.crowns.enemy === aiMatch.crowns.enemy);
check("the result duration is the match clock",
    Math.abs(aiMatch.result.duration - aiMatch.clock) < 1e-6,
    `${aiMatch.result.duration} vs ${aiMatch.clock}`);
check("the match state is finite", assertFiniteState(aiMatch));
check("the tower HP values are sane", aiMatch.towers.every(t => t.hp >= 0 && t.hp <= t.maxHp + 1e-9));

const stable = freshMatch({ seed: 888, venue: LC.VENUES[7] });
runMatch(stable, 250);
check("the boss venue also terminates", stable.phase === "ended" && !!stable.result);
check("the boss venue has no NaN", assertFiniteState(stable));

const quickDeterminismA = freshMatch({ seed: 4321, venue: LC.VENUES[2] });
const quickDeterminismB = freshMatch({ seed: 4321, venue: LC.VENUES[2] });
for (let i = 0; i < 1200; i++) {
    LC.Sim.update(quickDeterminismA, 1 / 60);
    LC.Sim.update(quickDeterminismB, 1 / 60);
}
eq("AI matches are deterministic at 20 seconds",
    `${quickDeterminismA.clock}|${quickDeterminismA.crowns.player}|${quickDeterminismA.crowns.enemy}|${quickDeterminismA.units.length}`,
    `${quickDeterminismB.clock}|${quickDeterminismB.crowns.player}|${quickDeterminismB.crowns.enemy}|${quickDeterminismB.units.length}`);

/* ================================================================
 * PWA contract
 * ================================================================ */
section("PWA and offline contract");

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const swSource = fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

eq("the manifest names the game", manifest.short_name, "LAST CALL");
check("the manifest starts in its own scope",
    manifest.start_url === "./" && manifest.scope === "./", manifest.start_url);
eq("the manifest display is standalone", manifest.display, "standalone");
eq("the manifest orientation is flexible", manifest.orientation, "any");
check("the manifest declares a background and theme colour",
    /^#[0-9a-f]{6}$/i.test(manifest.background_color) &&
    /^#[0-9a-f]{6}$/i.test(manifest.theme_color));
check("the manifest has 192 and 512 PNG icons",
    manifest.icons.some(i => i.sizes === "192x192" && i.type === "image/png") &&
    manifest.icons.some(i => i.sizes === "512x512" && i.type === "image/png"));
check("the manifest has a maskable icon",
    manifest.icons.some(i => i.purpose === "maskable" && i.sizes === "512x512"));

for (const icon of manifest.icons) {
    const file = path.join(ROOT, icon.src);
    check(`manifest icon exists: ${icon.src}`, fs.existsSync(file));
    check(`manifest icon is not empty: ${icon.src}`, fs.existsSync(file) && fs.statSync(file).size > 1000);
}
check("the OG cover exists", fs.existsSync(path.join(ROOT, "icons/og-cover.png")));

function pngSize(file) {
    const bytes = fs.readFileSync(file);
    if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
const sizes = {
    "icons/icon-192.png": [192, 192],
    "icons/icon-512.png": [512, 512],
    "icons/icon-512-maskable.png": [512, 512],
    "icons/og-cover.png": [1200, 630]
};
for (const [file, [width, height]] of Object.entries(sizes)) {
    const actual = pngSize(path.join(ROOT, file));
    check(`${file} is ${width}×${height}`,
        actual && actual.width === width && actual.height === height, actual);
}

check("index links the manifest", /rel="manifest"\s+href="manifest\.json"/.test(indexHtml));
check("index links the apple touch icon", /rel="apple-touch-icon"/.test(indexHtml));
check("index declares a theme colour", /name="theme-color"/.test(indexHtml));
check("index loads shared arcade.js", /src="\.\.\/shared\/arcade\.js"/.test(indexHtml));

const scripts = [...indexHtml.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(match => match[1]);
const localAssets = [
    ...scripts.map(src => src.startsWith("../") ? src : `./${src}`),
    "./styles.css",
    "./manifest.json",
    ...manifest.icons.map(icon => `./${icon.src}`),
    "./icons/og-cover.png"
];
for (const asset of localAssets) {
    check(`service worker precaches ${asset}`, swSource.includes(`"${asset}"`));
}
check("the service worker precaches every module",
    MODULES.every(name => swSource.includes(`./src/${name}.js`)));
check("the service worker has a versioned cache", /last-call-pwa-v\d+/.test(swSource));
check("the service worker skips waiting and claims clients",
    swSource.includes("skipWaiting") && swSource.includes("clients.claim"));
check("every script in index exists",
    scripts.every(src => fs.existsSync(path.join(ROOT, src))));
const scriptOrder = scripts.map(src => path.basename(src, ".js"));
check("config loads before every consumer",
    scriptOrder.indexOf("config") < scriptOrder.indexOf("storage") &&
    scriptOrder.indexOf("config") < scriptOrder.indexOf("sim"));
check("sim loads before ai, ui and main",
    scriptOrder.indexOf("sim") < scriptOrder.indexOf("ai") &&
    scriptOrder.indexOf("sim") < scriptOrder.indexOf("ui") &&
    scriptOrder.indexOf("ui") < scriptOrder.indexOf("main"));
check("the page has no remote script", !/<script[^>]+src="https?:/.test(indexHtml));
check("the stylesheet has no remote import or font",
    !/@import\s+url\(\s*["']?https?:/.test(stylesCss) &&
    !/url\(\s*["']?https?:/.test(stylesCss));
check("the page has no inline event handlers", !/\son(click|load|error)=/i.test(indexHtml));

const ids = [...indexHtml.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
eq("DOM ids are unique", new Set(ids).size, ids.length);
const idSet = new Set(ids);
const uiSource = fs.readFileSync(path.join(ROOT, "src/ui.js"), "utf8");
const idsBlock = uiSource.match(/var IDS = \[([\s\S]*?)\];/);
check("the UI has an element-id list", !!idsBlock);
if (idsBlock) {
    const wanted = [...idsBlock[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
    for (const id of new Set(wanted)) {
        check(`UI id exists in index: ${id}`, idSet.has(id));
    }
}

check("the icon generator is committed",
    fs.existsSync(path.join(ROOT, "tools/make_icons.py")));
check("the game README is committed",
    fs.existsSync(path.join(ROOT, "README.md")));

/* ================================================================
 * Report
 * ================================================================ */
console.log(`\n${passed} checks passed`);
if (failures.length) {
    console.log(`${failures.length} checks failed:`);
    for (const failure of failures) {
        console.log(`  - ${failure.name}${failure.detail === undefined ? "" : `  (${format(failure.detail)})`}`);
    }
    process.exitCode = 1;
} else {
    console.log("LAST CALL is ready to pour.");
}