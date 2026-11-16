/*
 * Plane Shooter — boot, state machine and wiring.
 *
 * The loop is a single requestAnimationFrame; the simulation runs at a fixed
 * 60 Hz step and rendering happens once per frame. Menu, pause and game-over
 * are explicit phases, so the game-over overlay cannot become unreachable.
 */

import {
    STEP,
    SLUG,
    THEMES,
    PLAYER
} from "./config.js";
import {
    createState,
    step,
    drainEvents,
    setPlayerPosition,
    movePlayer,
    spawnEnemy,
    hitPlayer
} from "./sim.js";
import { createRenderer } from "./render.js";
import { createInput } from "./input.js";
import { loadPrefs, savePrefs } from "./storage.js";
import { createUI } from "./ui.js";

const R2 = typeof window !== "undefined" ? window.R2 || null : null;
const DEBUG = new URLSearchParams(window.location.search).has("debug");
const reduced = typeof R2 !== "undefined" && R2
    ? !!R2.reduced
    : !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

function noop() {}

const Sound = R2 && typeof R2.makeSound === "function"
    ? R2.makeSound({
        shoot: [660, 0.04, "square"],
        kill: [880, 0.08, "triangle"],
        hurt: [120, 0.26, "sawtooth"],
        shield: [520, 0.18, "sine"],
        powerup: [1320, 0.18, "sine"],
        wave: [440, 0.2, "triangle"],
        gameover: [160, 0.5, "sine"]
    })
    : {
        shoot: noop,
        kill: noop,
        hurt: noop,
        shield: noop,
        powerup: noop,
        wave: noop,
        gameover: noop
    };

function buzz(pattern) {
    if (R2 && typeof R2.buzz === "function") R2.buzz(pattern);
}

const canvas = document.getElementById("game-canvas");
const stage = canvas.parentElement;
const renderer = createRenderer(canvas);
const prefs = loadPrefs();

let phase = "menu";
let game = null;
let themeName = prefs.theme;
let soundOn = R2 && typeof R2.getSettings === "function"
    ? R2.getSettings().sound !== false
    : true;
let lastTs = 0;
let accumulator = 0;
let drag = null;
let deferredPrompt = null;
let loopStarted = false;

const ui = createUI({
    onPrimary: onPrimary,
    onRestart: startGame,
    onTheme: cycleTheme,
    onMute: toggleSound,
    onInstall: installApp,
    onInstallLater: dismissInstall,
    onPause: togglePause
});

const input = createInput(canvas, {
    onDragStart: beginDrag,
    onDragMove: dragTo,
    onDragEnd: endDrag,
    onPause: togglePause,
    onMute: toggleSound,
    onTheme: cycleTheme,
    onConfirm: onConfirm
});

function beginDrag(point) {
    if (phase !== "playing" || !game) return;
    drag = {
        pointerX: point.x,
        pointerY: point.y,
        playerX: game.player.x,
        playerY: game.player.y
    };
}

function dragTo(point) {
    if (phase !== "playing" || !game || !drag) return;
    setPlayerPosition(
        game,
        drag.playerX + (point.x - drag.pointerX),
        drag.playerY + (point.y - drag.pointerY)
    );
}

function endDrag() {
    drag = null;
}

function onPrimary() {
    if (phase === "paused") {
        resumeGame();
    } else {
        startGame();
    }
}

function onConfirm() {
    if (phase === "menu" || phase === "over") {
        startGame();
    } else if (phase === "paused") {
        resumeGame();
    }
}

function startGame() {
    if (game) saveRecords();

    game = createState((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    phase = "playing";
    lastTs = 0;
    accumulator = 0;
    drag = null;

    ui.setPhase("playing", game, prefs);
    ui.setHud(game, prefs);
    ui.setPower(game);
    ui.announce("Wave 1. Drag to fly. Auto-fire.");
    canvas.focus({ preventScroll: true });

    /* If the shared settings were changed by another tab/game, honour the
       current value rather than the one read at boot. */
    if (R2 && typeof R2.getSettings === "function") {
        soundOn = R2.getSettings().sound !== false;
        ui.setSound(soundOn);
    }
}

function pauseGame() {
    if (phase !== "playing" || !game) return;
    phase = "paused";
    accumulator = 0;
    drag = null;
    ui.setPhase("paused", game, prefs);
    ui.setPower(game);
    ui.announce("Paused.");
}

function resumeGame() {
    if (phase !== "paused" || !game) return;
    phase = "playing";
    lastTs = 0;
    accumulator = 0;
    ui.setPhase("playing", game, prefs);
    ui.announce("Resumed.");
    canvas.focus({ preventScroll: true });
}

function togglePause() {
    if (phase === "playing") pauseGame();
    else if (phase === "paused") resumeGame();
}

function endGame() {
    if (!game || phase !== "playing") return;

    phase = "over";
    accumulator = 0;
    drag = null;

    saveRecords();

    if (R2 && R2.stats && typeof R2.stats.run === "function") {
        R2.stats.run({
            slug: SLUG,
            score: game.score,
            durMs: Math.round(game.time * 1000),
            wave: game.wave,
            outcome: "loss",
            meta: {
                kills: game.stats.kills,
                powerups: game.stats.powerups,
                hits: game.stats.hits
            }
        });
    }

    ui.setPhase("over", game, prefs);
    ui.setHud(game, prefs);
    ui.setPower(game);
    ui.announce("Game over. Score " + game.score + ". High score " + prefs.highScore + ".");
}

function saveRecords() {
    if (!game) return;

    const high = Math.max(prefs.highScore, game.score);
    const wave = Math.max(prefs.bestWave, game.wave);

    if (high !== prefs.highScore || wave !== prefs.bestWave) {
        prefs.highScore = high;
        prefs.bestWave = wave;
        savePrefs(prefs);
    }
}

function cycleTheme() {
    const names = Object.keys(THEMES);
    const index = names.indexOf(themeName);
    themeName = names[(index + 1) % names.length];
    prefs.theme = themeName;
    savePrefs(prefs);
    ui.applyTheme(themeName);
    ui.announce("Theme " + THEMES[themeName].label + ".");
}

function toggleSound() {
    soundOn = !soundOn;

    if (R2 && typeof R2.setSettings === "function") {
        R2.setSettings({ sound: soundOn });
    }

    ui.setSound(soundOn);
    ui.announce(soundOn ? "Sound on." : "Sound off.");
}

function applyKeys(dt) {
    if (!game || phase !== "playing") return;

    let dx = 0;
    let dy = 0;

    if (input.keys.has("ArrowLeft") || input.keys.has("KeyA")) dx -= 1;
    if (input.keys.has("ArrowRight") || input.keys.has("KeyD")) dx += 1;
    if (input.keys.has("ArrowUp") || input.keys.has("KeyW")) dy -= 1;
    if (input.keys.has("ArrowDown") || input.keys.has("KeyS")) dy += 1;

    if (dx === 0 && dy === 0) return;

    const length = Math.hypot(dx, dy) || 1;
    movePlayer(game, (dx / length) * PLAYER.speed * dt, (dy / length) * PLAYER.speed * dt);
}

function playEvents() {
    const events = drainEvents(game);

    for (let i = 0; i < events.length; i++) {
        const event = events[i];

        if (event.type === "shoot") {
            Sound.shoot();
        } else if (event.type === "kill") {
            Sound.kill();
        } else if (event.type === "hit") {
            Sound.hurt();
            buzz([30, 20, 40]);
            ui.announce("Life lost. " + game.lives + " left.");
        } else if (event.type === "shield") {
            Sound.shield();
            buzz(10);
            ui.announce("Shield absorbed the hit.");
        } else if (event.type === "powerup") {
            Sound.powerup();
            buzz(9);
            ui.announce(event.kind + " collected.");
        } else if (event.type === "wave") {
            Sound.wave();
            ui.setBanner("WAVE " + event.wave);
            ui.announce("Wave " + event.wave + ".");
        } else if (event.type === "gameover") {
            Sound.gameover();
            buzz([60, 40, 80]);
        }
    }
}

function frame(timestamp) {
    if (!lastTs) lastTs = timestamp;

    let delta = (timestamp - lastTs) / 1000;
    lastTs = timestamp;

    if (!Number.isFinite(delta) || delta < 0) delta = 0;
    if (delta > 0.1) delta = 0.1;

    if (phase === "playing" && game) {
        accumulator += delta;

        let steps = 0;
        while (accumulator >= STEP && steps < 5) {
            applyKeys(STEP);
            step(game, STEP);
            accumulator -= STEP;
            steps += 1;
            if (game.over) break;
        }

        /* A long stall must not turn into a burst of catch-up frames. */
        if (steps === 5 && accumulator >= STEP) accumulator = 0;

        playEvents();

        if (game.over) {
            endGame();
        } else {
            ui.setHud(game, prefs);
            ui.setPower(game);
        }
    }

    renderer.draw(game, themeName, {
        time: timestamp / 1000,
        reduced: reduced
    });

    window.requestAnimationFrame(frame);
}

function bindInstall() {
    window.addEventListener("beforeinstallprompt", function (event) {
        event.preventDefault();
        deferredPrompt = event;
        if (!prefs.installDismissed) ui.showInstall();
    });

    window.addEventListener("appinstalled", function () {
        deferredPrompt = null;
        prefs.installDismissed = true;
        savePrefs(prefs);
        ui.hideInstall();
    });
}

async function installApp() {
    if (!deferredPrompt) return;

    const prompt = deferredPrompt;
    deferredPrompt = null;

    try {
        prompt.prompt();
        await prompt.userChoice;
    } catch (error) {
        /* The native sheet can expire or be dismissed. */
    }

    prefs.installDismissed = true;
    savePrefs(prefs);
    ui.hideInstall();
}

function dismissInstall() {
    prefs.installDismissed = true;
    savePrefs(prefs);
    ui.hideInstall();
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return;

    navigator.serviceWorker
        .register("./service-worker.js")
        .catch(function () {
            /* Offline support is a bonus; the game still runs online. */
        });
}

function updateOrientationHint() {
    const landscape = window.matchMedia
        ? window.matchMedia("(orientation: landscape)").matches
        : false;
    const coarse = window.matchMedia
        ? window.matchMedia("(hover: none)").matches
        : false;
    ui.setRotateHint(landscape && coarse && window.innerHeight < 560);
}

function exposeDebug() {
    window.PlaneShooter = {
        snapshot: function () {
            if (!game) return { phase: phase, game: null, highScore: prefs.highScore };
            return {
                phase: phase,
                score: game.score,
                lives: game.lives,
                wave: game.wave,
                over: game.over,
                player: {
                    x: game.player.x,
                    y: game.player.y,
                    invuln: game.player.invuln
                },
                enemies: game.enemies.length,
                bullets: game.bullets.length,
                enemyBullets: game.enemyBullets.length,
                buffs: {
                    rapid: game.buffs.rapid,
                    spread: game.buffs.spread,
                    shield: game.buffs.shield
                },
                highScore: prefs.highScore,
                bestWave: prefs.bestWave
            };
        },
        start: startGame,
        pause: pauseGame,
        resume: resumeGame,
        spawn: function (type, x, y) {
            if (!game) return null;
            return spawnEnemy(
                game,
                type || "drifter",
                x == null ? game.player.x : x,
                y == null ? -30 : y
            );
        },
        setLives: function (lives) {
            if (game) game.lives = Math.max(0, Number(lives) || 0);
        },
        hit: function () {
            if (game) {
                game.player.invuln = 0;
                return hitPlayer(game, game.player.x, game.player.y);
            }
            return null;
        },
        forceGameOver: function () {
            if (!game) return;
            game.buffs.shield = false;
            game.player.invuln = 0;
            game.lives = 1;
            hitPlayer(game, game.player.x, game.player.y);
        },
        setPlayer: function (x, y) {
            if (game) setPlayerPosition(game, x, y);
        },
        cycleTheme: cycleTheme,
        toggleSound: toggleSound
    };
}

function boot() {
    renderer.resize();
    ui.applyTheme(themeName);
    ui.setSound(soundOn);
    ui.setPhase("menu", null, prefs);
    ui.setHud(null, prefs);
    ui.setPower(null);
    updateOrientationHint();

    bindInstall();
    registerServiceWorker();

    if (R2) {
        if (typeof R2.markPlayed === "function") R2.markPlayed(SLUG);
        if (typeof R2.trackPlaytime === "function") R2.trackPlaytime(SLUG);
        if (typeof R2.installHint === "function") R2.installHint();
    }

    if (DEBUG) exposeDebug();

    if (window.ResizeObserver && stage) {
        new ResizeObserver(function () {
            renderer.resize();
        }).observe(stage.parentElement || stage);
    }

    window.addEventListener("resize", function () {
        renderer.resize();
        updateOrientationHint();
    });

    window.addEventListener("orientationchange", function () {
        window.setTimeout(function () {
            renderer.resize();
            updateOrientationHint();
        }, 120);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", function () {
            renderer.resize();
        });
    }

    window.addEventListener("load", function () {
        renderer.resize();
        updateOrientationHint();
    });

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            saveRecords();
            if (phase === "playing") pauseGame();
        }
    });

    window.addEventListener("pagehide", saveRecords);

    if (!loopStarted) {
        loopStarted = true;
        window.requestAnimationFrame(frame);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
