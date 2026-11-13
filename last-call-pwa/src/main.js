/*
 * LAST CALL boot + match loop.
 *
 * The simulation owns the rules and runs at a fixed 60 Hz. This file owns the
 * browser around it: profile, audio routing, the Canvas frame, service worker,
 * install prompt and the small amount of state that survives a match.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var Storage = LC.Storage;
    var Sim = LC.Sim;
    var U = LC.U;

    var Game = {
        profile: null,
        state: null,
        paused: false,
        screen: "menu"
    };

    var LOOP = {
        raf: null,
        last: 0,
        accumulator: 0,
        endTimer: 0,
        finalized: false,
        setup: null,
        difficulty: null,
        playtimeStarted: false,
        fitPending: false
    };

    var STEP = 1 / 60;

    function $(id) {
        return document.getElementById(id);
    }

    function audio() {
        return LC.Audio;
    }

    function haptic(pattern) {
        LC.UI.haptic(pattern);
    }

    function newSeed() {
        var ticks = Date.now();
        var salt = (Game.profile.stats.matches + 1) * 2654435761;
        return ((ticks ^ salt) >>> 0) || 1;
    }

    function playerLevels() {
        var map = {};
        Object.keys(Game.profile.cards).forEach(function (id) {
            map[id] = Game.profile.cards[id].level || 1;
        });
        return map;
    }

    function activeDeck() {
        var deck = Game.profile.decks[Game.profile.activeDeck];
        if (!Storage.validDeck(Game.profile, deck)) {
            deck = LC.STARTER_DECK.slice();
        }
        return deck.slice();
    }

    function randomPracticeDeck(seed) {
        var rng = LC.makeRng(seed >>> 0 || 1);
        var deck = [];
        ["cocktails", "wine", "beer", "spirits"].forEach(function (family) {
            var pool = LC.CARD_LIST.filter(function (id) {
                return LC.CARDS[id].family === family;
            });
            deck = deck.concat(rng.shuffle(pool).slice(0, 2));
        });
        return deck;
    }

    function trackPlaytime() {
        if (LOOP.playtimeStarted || !window.R2 || !window.R2.trackPlaytime) return;
        LOOP.playtimeStarted = true;
        try {
            window.R2.trackPlaytime("last-call-pwa/");
        } catch (e) {}
    }

    /* ---------- match lifecycle ---------- */

    function beginMatch(setup) {
        stopLoop();
        LOOP.finalized = false;
        LOOP.endTimer = 0;
        LOOP.accumulator = 0;
        LOOP.setup = setup;
        LOOP.difficulty = setup.difficulty || null;
        Game.paused = false;
        Game.screen = "game";

        var venue = setup.venue || null;
        var seed = newSeed();

        Game.state = Sim.createMatch({
            seed: seed,
            mode: setup.mode,
            venue: venue,
            playerDeck: setup.playerDeck || activeDeck(),
            aiDeck: setup.aiDeck,
            playerLevels: playerLevels(),
            ai: setup.ai
        });

        LC.Render.setMatch(Game.state);
        LC.UI.bindMatch(Game.state, {
            mode: setup.mode,
            venue: venue,
            difficulty: setup.difficulty || null
        });
        LC.Render.resize();

        if (audio()) {
            audio().resume();
            audio().startMusic(venue ? (venue.index || 0) : 0);
        }
        trackPlaytime();
        if (window.R2 && window.R2.markPlayed) {
            try { window.R2.markPlayed("last-call-pwa/"); } catch (e) {}
        }

        scheduleFit();
        startLoop();
    }

    Game.startTour = function (venue) {
        if (!venue) return;
        if (!Storage.venueUnlocked(Game.profile, venue)) {
            LC.UI.toast("Clear the previous venue first.", "error");
            return;
        }
        beginMatch({
            mode: "tour",
            venue: venue,
            ai: venue.ai,
            aiDeck: venue.deck.slice(),
            playerDeck: activeDeck(),
            difficulty: null
        });
    };

    Game.startPractice = function (difficultyKey) {
        var difficulty = LC.PRACTICE[difficultyKey] || LC.PRACTICE.normal;
        var key = LC.PRACTICE[difficultyKey] ? difficultyKey : "normal";
        var seed = newSeed();
        var venue = {
            id: "quick-match",
            name: "Quick Match",
            district: "Practice",
            accent: "#5ef2d6",
            index: 0
        };
        beginMatch({
            mode: "practice",
            venue: venue,
            ai: {
                level: difficulty.level,
                think: difficulty.think,
                jitter: difficulty.jitter,
                mistake: difficulty.mistake,
                aggression: difficulty.aggression
            },
            aiDeck: randomPracticeDeck(seed ^ 0x9e3779b9),
            playerDeck: activeDeck(),
            difficulty: key
        });
    };

    Game.rematch = function () {
        var old = LOOP.setup;
        if (!old) {
            Game.goMenu();
            return;
        }
        var setup = {
            mode: old.mode,
            venue: old.venue,
            ai: old.ai,
            aiDeck: old.aiDeck ? old.aiDeck.slice() : null,
            playerDeck: activeDeck(),
            difficulty: old.difficulty
        };
        LC.UI.hideResult();
        beginMatch(setup);
    };

    Game.deploy = function (handIndex, x, y) {
        if (!Game.state) return { ok: false, reason: "No match" };
        if (Game.paused) return { ok: false, reason: "Paused" };
        if (Game.state.phase === "ended") return { ok: false, reason: "Match over" };
        return Sim.playCard(Game.state, "player", handIndex, x, y);
    };

    Game.isPaused = function () {
        return Game.paused;
    };

    Game.pause = function () {
        if (!Game.state || Game.paused || Game.state.phase === "ended") return;
        Game.paused = true;
        stopLoop();
        LC.UI.clearSelection();
        LC.UI.showPause();
        if (audio()) {
            audio().stopMusic();
            audio().suspend();
        }
        haptic(10);
    };

    Game.resume = function () {
        if (!Game.state || Game.state.phase === "ended") return;
        Game.paused = false;
        LC.UI.hidePause();
        if (audio()) {
            audio().resumeContext();
            audio().resume();
            if (Game.profile.music) {
                audio().startMusic(LOOP.setup && LOOP.setup.venue ? (LOOP.setup.venue.index || 0) : 0);
            }
        }
        LC.UI.clearSelection();
        startLoop();
    };

    function closeMatchTo(screen) {
        stopLoop();
        if (audio()) audio().stopMusic();
        Game.state = null;
        Game.paused = false;
        LOOP.setup = null;
        LOOP.finalized = false;
        LOOP.endTimer = 0;
        LC.UI.hidePause();
        LC.UI.hideResult();
        LC.UI.closeOverlay("overlay-settings");
        LC.UI.closeOverlay("overlay-confirm");
        LC.UI.clearMatch();
        LC.UI.showScreen(screen);
        if (audio()) {
            audio().resume();
            if (Game.profile.music) audio().startMusic(0);
        }
    }

    Game.leaveMatch = function () {
        var mode = LOOP.setup ? LOOP.setup.mode : null;
        closeMatchTo(mode === "practice" ? "menu" : "tour");
    };

    Game.resultContinue = function () {
        var mode = LOOP.setup ? LOOP.setup.mode : null;
        closeMatchTo(mode === "practice" ? "menu" : "tour");
    };

    Game.goMenu = function () {
        closeMatchTo("menu");
    };

    Game.resetProgress = function () {
        closeMatchTo("menu");
        Game.profile = Storage.reset();
        Storage.save(Game.profile);
        LC.UI.setProfile(Game.profile);
        LC.UI.closeOverlay("overlay-settings");
        LC.UI.showScreen("menu");
        LC.UI.toast("Progress reset. Fresh glass.");
    };

    Game.onScreen = function (name) {
        Game.screen = name;
        if (name === "game") scheduleFit();
    };

    /* ---------- end of match ---------- */

    function updateHub(score, result, reward) {
        if (!window.R2) return;
        try {
            var totalStars = Storage.totalStars(Game.profile);
            var cleared = Storage.clearedVenues(Game.profile);
            var hub = window.R2.loadJSON("last-call-pwa", null) || {};
            window.R2.saveJSON("last-call-pwa", {
                highScore: Math.max(hub.highScore || 0, totalStars * 100 + Game.profile.stats.wins),
                stars: totalStars,
                venues: cleared,
                wins: Game.profile.stats.wins,
                bestCrowns: Math.max(hub.bestCrowns || 0, result.crowns.player),
                plays: (hub.plays || 0) + 1
            });
            if (window.R2.stats && window.R2.stats.run) {
                window.R2.stats.run({
                    slug: "last-call-pwa",
                    score: score,
                    durMs: Math.round(result.duration * 1000),
                    wave: result.crowns.player,
                    outcome: result.winner === "player" ? "win"
                        : (result.winner === "draw" ? "draw" : "loss"),
                    meta: {
                        mode: LOOP.setup ? LOOP.setup.mode : "tour",
                        venue: result.venueId,
                        difficulty: LOOP.difficulty,
                        stars: reward ? reward.stars : 0,
                        tips: reward ? reward.tips : 0,
                        cards: result.stats.cardsPlayed,
                        damage: result.stats.playerDamage
                    }
                });
                window.R2.stats.event("last-call-pwa", "matches");
                if (result.winner === "player") {
                    window.R2.stats.event("last-call-pwa", "wins");
                }
            }
        } catch (e) {}
    }

    function finalizeMatch() {
        if (LOOP.finalized || !Game.state || !Game.state.result) return;
        LOOP.finalized = true;
        var state = Game.state;
        var result = state.result;
        var setup = LOOP.setup || {};
        var reward = null;

        if (setup.mode === "tour" || setup.mode === "practice") {
            reward = Storage.recordMatch(Game.profile, state, setup.mode, setup.venue || null);
            Storage.save(Game.profile);
        }

        var score = result.crowns.player * 100 + (reward ? (reward.stars || 0) * 10 : 0) +
            (result.winner === "player" ? 30 : 0);
        updateHub(score, result, reward);

        if (audio()) {
            audio().stopMusic();
            if (result.winner === "player") audio().win();
            else if (result.winner === "enemy") audio().lose();
            else audio().select();
        }
        if (result.winner === "player") haptic(24);

        LC.UI.showResult({
            state: state,
            reward: reward,
            mode: setup.mode || "tour",
            venue: setup.venue || null,
            difficulty: setup.difficulty || null
        });
        stopLoop();
    }

    /* ---------- main loop ---------- */

    function handleEvents(events) {
        if (!events || !events.length) return;
        LC.Render.handleEvents(events);
        var a = audio();
        events.forEach(function (ev) {
            if (!a) return;
            switch (ev.type) {
                case "cardPlayed":
                    if (!ev.spell) a.place();
                    break;
                case "spell":
                    a.spell();
                    haptic(16);
                    break;
                case "towerShot":
                    a.shoot();
                    break;
                case "hit":
                    if (ev.kind === "tower") a.towerHit();
                    else a.hit(ev.amount > 200);
                    break;
                case "towerDown":
                    a.towerDown();
                    haptic([18, 40, 18]);
                    LC.UI.arenaToast(ev.side === "player"
                        ? "Your tap is dry!"
                        : (ev.towerType === "cellar" ? "Cellar broken!" : "Crown secured."));
                    break;
                case "heal":
                    a.heal();
                    break;
                case "happyHour":
                    a.select();
                    LC.UI.arenaToast("Happy Hour — Buzz fills twice as fast.");
                    break;
                case "overtime":
                    a.overtime();
                    haptic(20);
                    LC.UI.arenaToast("Overtime — the next tower decides it.");
                    break;
                default:
                    break;
            }
        });
    }

    function frame(now) {
        if (!Game.state) {
            stopLoop();
            return;
        }
        LOOP.raf = requestAnimationFrame(frame);
        var dt = (now - LOOP.last) / 1000;
        LOOP.last = now;
        if (!isFinite(dt) || dt < 0) dt = 0;
        dt = Math.min(dt, 0.1);

        var state = Game.state;
        if (!Game.paused && state.phase !== "ended") {
            LOOP.accumulator += dt;
            var steps = 0;
            while (LOOP.accumulator >= STEP && steps < 5 &&
                    state.phase !== "ended") {
                Sim.update(state, STEP);
                LOOP.accumulator -= STEP;
                steps++;
            }
            if (steps === 5) LOOP.accumulator = 0;
        }

        /* Card plays happen between frames, so drain every frame, not only
         * after a simulation step. */
        var events = Sim.drainEvents(state);
        if (events.length) handleEvents(events);

        LC.UI.updateMatch(state);
        LC.Render.draw(state, {
            dt: Game.paused ? 0 : dt,
            preview: LC.UI.getPreview(),
            showDeployZone: LC.UI.selectedIndex >= 0
        });

        if (state.phase === "ended" && state.result) {
            LOOP.endTimer += dt;
            var delay = Game.profile.reducedMotion ? 0.35 : 1.05;
            if (!LOOP.finalized && LOOP.endTimer >= delay) finalizeMatch();
        }
    }

    function startLoop() {
        if (LOOP.raf) cancelAnimationFrame(LOOP.raf);
        LOOP.last = performance.now();
        LOOP.accumulator = 0;
        LOOP.raf = requestAnimationFrame(frame);
    }

    function stopLoop() {
        if (LOOP.raf) {
            cancelAnimationFrame(LOOP.raf);
            LOOP.raf = null;
        }
    }

    /* ---------- arena sizing ---------- */

    function fitArena() {
        var wrap = $("arena-wrap");
        var canvas = $("arena");
        if (!wrap || !canvas) return;
        var rect = wrap.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 20) return;
        var style = window.getComputedStyle(wrap);
        var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        var padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        var availW = Math.max(40, rect.width - padX - 2);
        var availH = Math.max(60, rect.height - padY - 2);
        var scale = Math.min(availW / C.W, availH / C.H);
        canvas.style.width = Math.max(80, Math.floor(C.W * scale)) + "px";
        canvas.style.height = Math.max(142, Math.floor(C.H * scale)) + "px";
    }

    function scheduleFit() {
        if (LOOP.fitPending) return;
        LOOP.fitPending = true;
        requestAnimationFrame(function () {
            LOOP.fitPending = false;
            fitArena();
        });
    }

    /* ---------- service worker ---------- */

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;
        if (location.protocol === "file:") return;
        navigator.serviceWorker.register("service-worker.js").catch(function () {
            /* A PWA that cannot cache is still a playable page. */
        });
    }

    /* ---------- boot ---------- */

    function boot() {
        var profile = Storage.load();

        if (window.R2 && window.R2.getSettings) {
            var shared = window.R2.getSettings();
            profile.sound = shared.sound !== false;
            profile.music = shared.music !== false;
            profile.haptics = shared.haptics !== false;
        }
        Game.profile = profile;
        Storage.save(profile);

        LC.Render.init($("arena"));
        LC.Game = Game;
        LC.UI.init(profile);

        scheduleFit();
        window.addEventListener("resize", scheduleFit);
        window.addEventListener("orientationchange", function () {
            setTimeout(scheduleFit, 80);
        });
        if (window.ResizeObserver) {
            try {
                new ResizeObserver(scheduleFit).observe($("arena-wrap"));
            } catch (e) {}
        }

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden" &&
                    Game.state && !Game.paused && Game.state.phase !== "ended") {
                Game.pause();
            }
        });

        window.addEventListener("pagehide", function () {
            if (Game.state && !Game.paused && Game.state.phase !== "ended") {
                Game.pause();
            }
        });

        registerServiceWorker();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(window.LC = window.LC || {});