/*
 * Plane Shooter — DOM presentation.
 *
 * A small view layer: cache the handful of nodes, write only when a value
 * changed, and keep the overlay rules in one place. Game rules live in
 * sim.js; this file knows about text, classes and focus.
 */

import { THEMES, HIT, POWERUPS } from "./config.js";

function byId(id) {
    return document.getElementById(id);
}

export function createUI(handlers = {}) {
    const el = {
        score: byId("score"),
        highScore: byId("high-score"),
        wave: byId("wave"),
        lives: byId("lives"),
        pause: byId("pause-btn"),
        mute: byId("mute-btn"),
        banner: byId("banner"),
        powerChips: byId("power-chips"),
        rotateHint: byId("rotate-hint"),
        overlay: byId("overlay"),
        overlayTitle: byId("overlay-title"),
        overlayMsg: byId("overlay-msg"),
        overlayRecord: byId("overlay-record"),
        overlayStats: byId("overlay-stats"),
        finalScore: byId("final-score"),
        finalHigh: byId("final-high"),
        finalWave: byId("final-wave"),
        overlayPrimary: byId("overlay-primary"),
        overlayRestart: byId("overlay-restart"),
        overlayTheme: byId("overlay-theme"),
        overlaySound: byId("overlay-sound"),
        overlayHint: byId("overlay-hint"),
        installPrompt: byId("install-prompt"),
        installBtn: byId("install-btn"),
        installLater: byId("install-later"),
        srStatus: byId("sr-status")
    };

    let phase = "menu";
    let hudSignature = "";
    let powerSignature = "";
    let bannerTimer = 0;
    let announceTimer = 0;
    let installVisible = false;

    function call(name) {
        if (typeof handlers[name] === "function") handlers[name]();
    }

    el.overlayPrimary.addEventListener("click", function () { call("onPrimary"); });
    el.overlayRestart.addEventListener("click", function () { call("onRestart"); });
    el.overlayTheme.addEventListener("click", function () { call("onTheme"); });
    el.overlaySound.addEventListener("click", function () { call("onMute"); });
    el.pause.addEventListener("click", function () { call("onPause"); });
    el.mute.addEventListener("click", function () { call("onMute"); });
    el.installBtn.addEventListener("click", function () { call("onInstall"); });
    el.installLater.addEventListener("click", function () { call("onInstallLater"); });

    /* Keep Tab inside the dialog while it is open; the header controls are
       deliberately out of reach until the player closes it. */
    el.overlay.addEventListener("keydown", function (event) {
        if (event.key !== "Tab") return;

        const items = Array.from(
            el.overlay.querySelectorAll(
                "button:not(.hidden), a[href], [tabindex]:not([tabindex='-1'])"
            )
        ).filter(function (node) {
            return !node.disabled && node.offsetParent !== null;
        });

        if (!el.installPrompt.classList.contains("hidden")) {
            Array.from(el.installPrompt.querySelectorAll("button")).forEach(function (node) {
                if (!node.disabled && node.offsetParent !== null) items.push(node);
            });
        }

        if (items.length === 0) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    function applyTheme(name) {
        const safe = THEMES[name] ? name : "neon";
        document.documentElement.setAttribute("data-theme", safe);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", THEMES[safe].themeColor);
    }

    function setSound(on) {
        const enabled = on !== false;
        el.mute.textContent = enabled ? "🔊" : "🔇";
        el.mute.setAttribute("aria-label", enabled ? "Mute sound" : "Unmute sound");
        el.mute.setAttribute("aria-pressed", enabled ? "false" : "true");
        el.overlaySound.textContent = enabled ? "🔊 SOUND" : "🔇 MUTED";
        el.overlaySound.setAttribute("aria-pressed", enabled ? "false" : "true");
    }

    function setHud(game, prefs) {
        const score = game ? game.score : 0;
        const high = Math.max(prefs ? prefs.highScore || 0 : 0, score);
        const wave = game ? game.wave : 1;
        const lives = game ? game.lives : HIT.lives;
        const signature = score + "|" + high + "|" + wave + "|" + lives;
        if (signature === hudSignature) return;
        hudSignature = signature;

        el.score.textContent = String(score);
        el.highScore.textContent = String(high);
        el.wave.textContent = String(wave);
        el.lives.textContent = lives > 0 ? "♥".repeat(lives) : "—";
        el.lives.setAttribute("aria-label", lives + (lives === 1 ? " life" : " lives"));
    }

    function setPower(game) {
        const buffs = game ? game.buffs : null;
        const rapid = buffs && buffs.rapid > 0 ? Math.ceil(buffs.rapid) : 0;
        const spread = buffs && buffs.spread > 0 ? Math.ceil(buffs.spread) : 0;
        const shield = !!(buffs && buffs.shield);
        const signature = rapid + "|" + spread + "|" + (shield ? 1 : 0);
        if (signature === powerSignature) return;
        powerSignature = signature;

        el.powerChips.replaceChildren();

        function chip(label, value, cls) {
            const node = document.createElement("span");
            node.className = "power-chip" + (cls ? " " + cls : "");
            node.textContent = value ? label + " " + value + "s" : label;
            el.powerChips.appendChild(node);
        }

        if (rapid) chip(POWERUPS.rapid.label, rapid, "rapid");
        if (spread) chip(POWERUPS.spread.label, spread, "spread");
        if (shield) chip(POWERUPS.shield.label, 0, "shield");
    }

    function setPhase(next, game, prefs) {
        phase = next;
        document.body.dataset.phase = next;
        el.overlayRestart.classList.add("hidden");
        el.overlayStats.classList.add("hidden");
        el.pause.disabled = next === "menu" || next === "over";
        el.pause.textContent = next === "paused" ? "▶" : "⏸";
        el.pause.setAttribute("aria-label", next === "paused" ? "Resume game" : "Pause game");

        if (next === "playing") {
            el.overlay.classList.add("hidden");
            return;
        }

        el.overlay.classList.remove("hidden");
        setRecord(game, prefs);

        if (next === "menu") {
            el.overlayTitle.textContent = "PLANE SHOOTER";
            el.overlayMsg.textContent = "Drag to fly. Auto-fire. Don't get hit.";
            el.overlayPrimary.textContent = "▶ PLAY";
            el.overlayHint.textContent = "Drag anywhere · auto-fire · P pause · M mute";
        } else if (next === "paused") {
            el.overlayTitle.textContent = "PAUSED";
            el.overlayMsg.textContent = "Take a breath.";
            el.overlayPrimary.textContent = "▶ RESUME";
            el.overlayRestart.classList.remove("hidden");
            el.overlayHint.textContent = "P or Esc to resume";
            showStats(game, prefs);
        } else if (next === "over") {
            el.overlayTitle.textContent = "GAME OVER";
            el.overlayMsg.textContent = "The swarm got through.";
            el.overlayPrimary.textContent = "▶ PLAY AGAIN";
            el.overlayHint.textContent = "Press Enter to fly again";
            showStats(game, prefs);
        }

        window.setTimeout(function () {
            if (!el.overlay.classList.contains("hidden")) {
                el.overlayPrimary.focus({ preventScroll: true });
            }
        }, 30);
    }

    function showStats(game, prefs) {
        if (!game) return;
        el.overlayStats.classList.remove("hidden");
        el.finalScore.textContent = String(game.score);
        el.finalHigh.textContent = String(Math.max(prefs ? prefs.highScore || 0 : 0, game.score));
        el.finalWave.textContent = String(game.wave);
        setRecord(game, prefs);
    }

    function setRecord(game, prefs) {
        const high = Math.max(prefs ? prefs.highScore || 0 : 0, game ? game.score : 0);
        const best = Math.max(prefs ? prefs.bestWave || 1 : 1, game ? game.wave : 1);
        el.overlayRecord.textContent = "HIGH " + high + " · BEST WAVE " + best;
    }

    function setBanner(text) {
        el.banner.textContent = text;
        el.banner.classList.remove("show");
        /* Force a reflow so the animation restarts on consecutive waves. */
        void el.banner.offsetWidth;
        el.banner.classList.add("show");

        window.clearTimeout(bannerTimer);
        bannerTimer = window.setTimeout(function () {
            el.banner.classList.remove("show");
        }, 1500);
    }

    function announce(text) {
        window.clearTimeout(announceTimer);
        el.srStatus.textContent = "";
        announceTimer = window.setTimeout(function () {
            el.srStatus.textContent = text;
        }, 30);
    }

    function showInstall() {
        if (installVisible) return;
        installVisible = true;
        el.installPrompt.classList.remove("hidden");
    }

    function hideInstall() {
        installVisible = false;
        el.installPrompt.classList.add("hidden");
    }

    function setRotateHint(show) {
        el.rotateHint.classList.toggle("hidden", !show);
    }

    function getPhase() {
        return phase;
    }

    return {
        applyTheme,
        setSound,
        setHud,
        setPower,
        setPhase,
        setBanner,
        announce,
        showInstall,
        hideInstall,
        setRotateHint,
        getPhase
    };
}
