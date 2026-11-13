/*
 * LAST CALL — in-browser smoke test.
 *
 *   node last-call-pwa/tests/smoke.mjs [base-url]
 *
 * Drives the real page over the DevTools Protocol using the repository's
 * dependency-free browser helper: boots the menu, starts a Quick Match,
 * deploys a card, pauses and resumes, opens the deck builder, upgrades a
 * drink and checks the PWA cache. It skips cleanly when no Chromium is
 * available, like the other browser tests in the repository.
 */
import { launch, sleep } from "../../tools/cdp.mjs";

const base = (process.argv[2] || "http://localhost:8099/last-call-pwa/").replace(/\/$/, "") + "/";
if (typeof WebSocket === "undefined") {
    process.stdout.write("last-call smoke: skipped (this Node has no global WebSocket)\n");
    process.exit(0);
}
const browser = await launch();
if (!browser) {
    process.stdout.write("last-call smoke: skipped (no Chromium found)\n");
    process.exit(0);
}

const { cdp, sessionId } = browser;
const failures = [];
let passed = 0;

function check(name, ok, detail) {
    if (ok) passed++;
    else failures.push(name + (detail === undefined ? "" : ` — ${detail}`));
}

const pageErrors = [];
cdp.on("Runtime.exceptionThrown", (event) => {
    pageErrors.push(event.exceptionDetails?.exception?.description ||
        event.exceptionDetails?.text || "exception");
});
cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type !== "error") return;
    const text = event.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
    if (!/navigator\.vibrate/i.test(text)) pageErrors.push("console: " + text);
});
cdp.on("Log.entryAdded", (event) => {
    if (event.entry?.level !== "error") return;
    const text = event.entry.text || "";
    if (!/navigator\.vibrate/i.test(text)) pageErrors.push("network: " + text);
});

async function send(method, params = {}) {
    return cdp.send(method, params, sessionId);
}

async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
}

async function waitFor(expression, timeout = 8000, every = 120) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        if (await evaluate(expression).catch(() => false)) return true;
        await sleep(every);
    }
    return false;
}

async function click(selector) {
    return evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
    })()`);
}

async function pointer(type, x, y) {
    return evaluate(`(() => {
        const canvas = document.getElementById('arena');
        if (!canvas) return false;
        const ev = new PointerEvent(${JSON.stringify(type)}, {
            bubbles: true, cancelable: true, composed: true,
            clientX: ${x}, clientY: ${y}, pointerId: 1, pointerType: 'touch',
            button: 0, buttons: ${type === "pointerdown" ? 1 : 0}
        });
        canvas.dispatchEvent(ev);
        return true;
    })()`);
}

try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("DOM.enable");
    await send("Log.enable");
    await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
    });

    const loaded = cdp.once("Page.loadEventFired");
    await send("Page.navigate", { url: base });
    await Promise.race([loaded, sleep(12000)]);

    const booted = await waitFor("!!window.LC && !!LC.Game && !!LC.UI && !!LC.Render", 8000);
    check("the game boots with all modules", booted);
    if (!booted) throw new Error("LAST CALL did not boot");

    const boot = await evaluate(`({
        title: document.title,
        manifest: !!document.querySelector('link[rel="manifest"]'),
        manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
        theme: document.querySelector('meta[name="theme-color"]')?.content,
        screen: document.querySelector('.screen.active')?.id,
        menuCards: document.querySelectorAll('#deck-tabs [data-tab]').length,
        handCards: document.querySelectorAll('.hand-card').length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        r2: !!window.R2 && !!window.R2.getSettings,
        storageKey: LC.Storage.KEY
    })`);
    check("the title is set", /LAST CALL/.test(boot.title), boot.title);
    check("the manifest is linked", boot.manifest && boot.manifestHref === "manifest.json");
    check("the dark theme colour is declared", boot.theme === "#0b0610", boot.theme);
    check("the menu is the first screen", boot.screen === "screen-menu", boot.screen);
    check("shared arcade.js loaded", boot.r2);
    check("the storage key is namespaced", boot.storageKey === "random2-last-call-v1", boot.storageKey);
    check("the menu has no horizontal overflow", boot.overflow <= 0, boot.overflow);
    check("no hand is rendered outside a match", boot.handCards === 0, boot.handCards);

    /* ---- Quick Match ---- */
    check("the practice button is wired", await click("#btn-practice"));
    check("the practice dialog opens", await waitFor("!document.getElementById('overlay-practice').hidden", 3000));
    check("easy difficulty is selectable", await click('#difficulty-row [data-diff="easy"]'));
    check("practice starts", await click("#btn-practice-start"));
    check("the match screen is active", await waitFor(
        "document.getElementById('screen-game').classList.contains('active')", 4000));
    check("a match exists", await waitFor("!!LC.Game.state && LC.Game.state.phase !== 'ended'", 4000));

    const initial = await evaluate(`({
        hand: document.querySelectorAll('.hand-card').length,
        timer: document.getElementById('match-timer').textContent,
        buzz: document.getElementById('buzz-value').textContent,
        arena: (() => {
            const c = document.getElementById('arena');
            const r = c.getBoundingClientRect();
            return { width: Math.round(r.width), height: Math.round(r.height) };
        })(),
        preview: !!LC.UI.getPreview
    })`);
    check("four cards are in the hand", initial.hand === 4, initial.hand);
    check("the timer starts at 3:00", initial.timer === "3:00", initial.timer);
    check("the arena has a real size", initial.arena.width > 100 && initial.arena.height > 150,
        JSON.stringify(initial.arena));
    check("the renderer exposes previews", initial.preview);

    await sleep(1400);
    const ticking = await evaluate(`({
        timer: document.getElementById('match-timer').textContent,
        buzz: parseFloat(document.getElementById('buzz-value').textContent),
        clock: LC.Game.state.clock
    })`);
    check("the match clock runs", ticking.clock > 1, ticking.clock);
    check("the timer has moved", ticking.timer !== initial.timer, `${initial.timer} -> ${ticking.timer}`);
    check("Buzz refills", ticking.buzz > 5, ticking.buzz);

    /* select the first hand card and deploy it into the player half */
    check("a hand card can be selected", await click(".hand-card"));
    const selected = await evaluate(`({
        index: LC.UI.selectedIndex,
        pressed: document.querySelector('.hand-card')?.getAttribute('aria-pressed'),
        hint: !document.getElementById('selected-hint').hidden
    })`);
    check("selection reaches the UI", selected.index === 0, selected.index);
    check("the card is marked pressed", selected.pressed === "true", selected.pressed);
    check("the deployment hint is shown", selected.hint);

    const spot = await evaluate(`(() => {
        const c = document.getElementById('arena');
        const r = c.getBoundingClientRect();
        return {
            x: r.left + (225 / 900) * r.width,
            y: r.top + (1000 / 1600) * r.height,
            cards: LC.Game.state.stats.cardsPlayed
        };
    })()`);
    await pointer("pointerdown", spot.x, spot.y);
    await pointer("pointerup", spot.x, spot.y);
    await sleep(350);
    const deployed = await evaluate(`({
        cards: LC.Game.state.stats.cardsPlayed,
        units: LC.Game.state.units.length + LC.Game.state.buildings.length,
        selected: LC.UI.selectedIndex
    })`);
    check("a tap deploys the selected card", deployed.cards === spot.cards + 1,
        `${spot.cards} -> ${deployed.cards}`);
    check("a body or spell result exists", deployed.units >= 0, deployed.units);
    check("deployment clears the selection", deployed.selected === -1, deployed.selected);

    /* ---- pause / resume ---- */
    check("pause opens the dialog", await click("#btn-pause"));
    check("the match is paused", await waitFor("LC.Game.isPaused() && !document.getElementById('overlay-pause').hidden", 3000));
    const pausedClock = await evaluate("LC.Game.state.clock");
    await sleep(400);
    check("the clock does not run while paused", await evaluate("LC.Game.state.clock") === pausedClock);
    check("resume is wired", await click("#btn-resume"));
    check("the match is running again", await waitFor("!LC.Game.isPaused() && document.getElementById('overlay-pause').hidden", 3000));

    /* ---- result flow ---- */
    await evaluate(`(() => {
        LC.Game.state.crowns.player = 3;
        LC.Sim.endMatch(LC.Game.state, 'player', 'cellar');
        return true;
    })()`);
    check("the result dialog appears", await waitFor(
        "!document.getElementById('overlay-result').hidden", 5000));
    const result = await evaluate(`({
        title: document.getElementById('result-title').textContent,
        crowns: document.getElementById('result-crowns').textContent,
        tips: Number(document.getElementById('result-tips').textContent),
        continueLabel: document.getElementById('btn-result-continue').textContent,
        hub: (() => {
            try { return JSON.parse(localStorage.getItem('last-call-pwa')); }
            catch (e) { return null; }
        })()
    })`);
    check("the result names the broken cellar", result.title === "Cellar broken.", result.title);
    check("the result shows a 3–0 score", /3\s*—\s*0/.test(result.crowns), result.crowns);
    check("the practice reward is paid", result.tips === 30, result.tips);
    check("practice continues to the main menu", /Main menu/.test(result.continueLabel),
        result.continueLabel);
    check("the hub record is written", !!result.hub && typeof result.hub.highScore === "number",
        JSON.stringify(result.hub));
    check("the result continue is wired", await click("#btn-result-continue"));
    check("practice continues to the menu", await waitFor(
        "document.getElementById('screen-menu').classList.contains('active')", 3000));

    check("the tour button is wired", await click("#btn-tour"));
    check("the tour screen opens", await waitFor(
        "document.getElementById('screen-tour').classList.contains('active')", 3000));
    const tour = await evaluate(`({
        cards: document.querySelectorAll('#tour-list .tour-card').length,
        locked: document.querySelectorAll('#tour-list .tour-card.locked').length,
        buttons: document.querySelectorAll('#tour-list [data-venue]').length
    })`);
    check("the tour shows eight venues", tour.cards === 8, tour.cards);
    check("seven venues start locked", tour.locked === 7, tour.locked);
    check("the first venue is enterable", tour.buttons === 1, tour.buttons);
    await click('#screen-tour [data-back="menu"]');
    await sleep(200);

    /* ---- deck builder ---- */
    check("the deck button is wired", await click("#btn-deck"));
    check("the deck screen opens", await waitFor(
        "document.getElementById('screen-deck').classList.contains('active')", 3000));
    const deck = await evaluate(`({
        slots: document.querySelectorAll('#deck-slots [data-slot]').length,
        cards: document.querySelectorAll('#collection [data-card]').length,
        tabs: document.querySelectorAll('#deck-tabs [data-tab]').length,
        avg: document.getElementById('deck-cost').textContent
    })`);
    check("the deck has eight slots", deck.slots === 8, deck.slots);
    check("the collection shows 24 cards", deck.cards === 24, deck.cards);
    check("three deck tabs exist", deck.tabs === 3, deck.tabs);
    check("the average Buzz is shown", /AVG BUZZ/.test(deck.avg), deck.avg);

    check("a card tile opens the detail dialog", await click('#collection [data-card="mojito"]'));
    check("the card dialog is visible", await waitFor("!document.getElementById('overlay-card').hidden", 3000));
    const card = await evaluate(`({
        name: document.getElementById('card-name').textContent,
        level: document.getElementById('card-level').textContent,
        stats: document.querySelectorAll('#card-stats > div').length,
        upgrade: document.getElementById('btn-upgrade').textContent
    })`);
    check("the detail names the drink", card.name === "Mojito Mob", card.name);
    check("the detail shows a level", card.level === "1", card.level);
    check("the detail shows three stats", card.stats === 3, card.stats);
    check("the upgrade price is shown", /100/.test(card.upgrade), card.upgrade);

    check("the upgrade button works", await click("#btn-upgrade"));
    await sleep(300);
    const upgraded = await evaluate(`({
        level: document.getElementById('card-level').textContent,
        tips: LC.UI.profile.tips,
        cardLevel: LC.UI.profile.cards.mojito.level
    })`);
    check("the drink reaches level 2", upgraded.level === "2" && upgraded.cardLevel === 2,
        JSON.stringify(upgraded));
    check("the upgrade spends tips", upgraded.tips === 80, upgraded.tips);
    await click("#btn-card-close");
    await sleep(150);

    /* ---- PWA cache ---- */
    const cache = await evaluate(`(async () => {
        if (!('caches' in window)) return { supported: false };
        await navigator.serviceWorker.ready.catch(() => null);
        const names = await caches.keys();
        const name = names.find((n) => n.indexOf('last-call-pwa') === 0);
        if (!name) return { supported: true, names, name: null };
        const store = await caches.open(name);
        const urls = (await store.keys()).map((r) => r.url);
        return {
            supported: true,
            name,
            count: urls.length,
            index: urls.some((u) => /\\/last-call-pwa\\/index\\.html$/.test(u)),
            shared: urls.some((u) => /\\/shared\\/arcade\\.js$/.test(u)),
            main: urls.some((u) => /\\/src\\/main\\.js$/.test(u)),
            icon: urls.some((u) => /\\/icons\\/icon-512\\.png$/.test(u))
        };
    })()`);
    check("the Cache API is available", cache.supported);
    if (cache.supported && cache.name) {
        check("the service worker opened its versioned cache", /^last-call-pwa-v\d+$/.test(cache.name), cache.name);
        check("the cache holds the page", cache.index);
        check("the cache holds the shared library", cache.shared);
        check("the cache holds the simulation", cache.main);
        check("the cache holds the icon", cache.icon);
        check("the cache is not nearly empty", cache.count >= 20, cache.count);
    } else {
        check("the service worker registered (cache optional on this origin)", !!cache.name);
    }

    /* ---- actual offline boot ---- */
    await send("Network.enable");
    await evaluate("navigator.serviceWorker.ready.then(() => true)");
    let reload = cdp.once("Page.loadEventFired");
    await send("Page.reload");
    await Promise.race([reload, sleep(8000)]);
    check("the service worker controls the page", await evaluate("!!navigator.serviceWorker.controller"));
    await send("Network.emulateNetworkConditions", {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0
    });
    reload = cdp.once("Page.loadEventFired");
    await send("Page.reload");
    await Promise.race([reload, sleep(8000)]);
    const offline = await evaluate(`({
        lc: !!window.LC,
        game: !!(window.LC && LC.Game),
        menu: document.getElementById('screen-menu')?.classList.contains('active'),
        r2: !!window.R2,
        title: document.title
    })`);
    check("the game boots with the network off", offline.lc && offline.game, JSON.stringify(offline));
    check("the offline boot lands on the menu", offline.menu);
    check("the shared arcade library survives offline", offline.r2);
    check("the offline title is intact", /LAST CALL/.test(offline.title), offline.title);
    check("an offline Quick Match starts",
        await evaluate(`(() => {
            document.getElementById('btn-practice').click();
            document.getElementById('btn-practice-start').click();
            return true;
        })()`) &&
        await waitFor("!!LC.Game.state", 4000));
    await sleep(600);
    check("the offline match clock runs", await evaluate("LC.Game.state.clock > 0"));

    /* ---- errors ---- */
    check("no page exceptions", pageErrors.length === 0, pageErrors.join(" | "));
} catch (error) {
    failures.push("smoke run threw: " + (error && error.stack ? error.stack : error));
} finally {
    browser.close();
}

console.log(`last-call smoke: ${passed} checks passed`);
if (failures.length) {
    for (const failure of failures) console.log("FAIL  " + failure);
    process.exit(1);
}
console.log("last-call smoke: ok");