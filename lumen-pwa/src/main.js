/*
 * LUMEN - main loop and game flow.
 *
 * States: menu -> playing -> spectate -> dead -> playing ...
 * The world keeps simulating in every state after boot, so the menu sits
 * over a live ocean full of your recurring rivals rather than a static image.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var W = L.World.world;

    var PLAYER_COLOR = "#8ff6ff";
    var SPECTATE_TIME = 3;

    var state = "menu";
    var spectate = null;
    var runTime = 0;
    var lastRank = 1;
    var rankTimer = 0;
    var boostWasOn = false;
    var paused = false;
    var settings = L.Storage.getSettings();
    var deferredPrompt = null;
    var last = 0;
    var audioArmed = false;

    /* ===== Helpers ===== */
    function vibrate(pattern) {
        if (!settings.haptics) return;
        if (window.R2 && typeof window.R2.buzz === "function") {
            window.R2.buzz(pattern);
            return;
        }
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
        }
    }

    function leader() {
        var best = null;
        for (var i = 0; i < W.creatures.length; i++) {
            var c = W.creatures[i];
            if (!c.alive) continue;
            if (!best || c.mass > best.mass) best = c;
        }
        return best;
    }

    /* ===== Flow ===== */
    function startRun() {
        L.World.generate(L.Storage.getSeed());
        L.Bots.clear(W);
        L.Bots.spawnAll(W);

        var name = L.UI.name();
        L.Storage.saveProfile(name);
        var p = L.World.addPlayer(name, PLAYER_COLOR);

        L.Player.reset();
        L.Camera.snap(p.headX, p.headY, L.World.zoomFor(p.mass));

        L.UI.clearFeed();
        L.UI.showScreen(null);

        state = "playing";
        runTime = 0;
        spectate = null;
        lastRank = 1;

        L.Audio.init();
        L.Audio.resume();
        L.Audio.setEnabled(settings.sound);
    }

    function toMenu() {
        L.World.reset();
        L.World.generate(L.Storage.getSeed());
        L.Bots.clear(W);
        L.Bots.spawnAll(W);
        L.UI.clearFeed();
        L.UI.showScreen("menu");
        state = "menu";
        spectate = null;
        L.Audio.setBoost(false);
    }

    /* ===== Events ===== */
    function consumeEvents() {
        var evs = W.events;
        var player = W.player;

        for (var i = 0; i < evs.length; i++) {
            var e = evs[i];

            switch (e.type) {
                case "eat":
                    if (e.creature.isPlayer) L.Audio.eat(e.value);
                    break;

                case "kill":
                    if (e.killer && e.killer.isPlayer) {
                        L.Audio.kill();
                        L.Render.shake(11);
                        vibrate(45);
                        L.UI.addKill("You", "#ffffff", e.victim.name, e.victim.color);
                    } else if (!e.victim.isPlayer && e.killer) {
                        L.UI.addKill(e.killer.name, e.killer.color, e.victim.name, e.victim.color);
                    }
                    L.Bots.onKill(e.killer, e.victim);
                    break;

                case "wreck":
                    if (e.victim.isPlayer) deathCause = "wreck";
                    break;

                case "anglerContact":
                    if (e.victim.isPlayer) deathCause = "angler";
                    break;

                case "stun":
                    if (e.victim.isPlayer) {
                        L.Audio.stun();
                        L.Render.shake(6);
                        vibrate([25, 30, 25]);
                    }
                    break;

                case "anglerDeath":
                    L.Audio.anglerRoar();
                    L.Render.shake(9);
                    if (player && L.dist2(player.headX, player.headY, e.x, e.y) < 900 * 900) {
                        vibrate(70);
                    }
                    break;

                case "anglerKill":
                    if (e.killer && e.killer.isPlayer) {
                        L.Audio.kill();
                        L.Render.shake(14);
                        vibrate([40, 30, 60]);
                        L.UI.addKill("You", "#ffffff", "an anglerfish", "#8f7bff");
                    }
                    break;

                case "playerDeath":
                    onPlayerDeath(e);
                    break;
            }
        }
        evs.length = 0;
    }

    var deathCause = null;

    function onPlayerDeath(e) {
        var v = e.victim;
        var k = e.killer;

        deathCause = null;
        L.Audio.death();
        L.Audio.setBoost(false);
        L.Render.shake(22);
        vibrate([70, 50, 140]);

        var title, sub, color = "#ff6b7d";

        if (k) {
            L.UI.addKill(k.name, k.color, v.name, v.color);
            title = "Eliminated by " + k.name;
            sub = "The abyss is not empty. Go back out.";
            color = k.color;
        } else if (deathCause === "wreck") {
            title = "Wrecked";
            sub = "That hull was not going anywhere.";
            color = "#8fb6c9";
        } else if (deathCause === "angler") {
            title = "Swallowed";
            sub = "Something that size does not miss often.";
            color = "#c46bff";
        } else {
            title = "Lost to the deep";
            sub = "The dark got there first.";
        }

        L.Storage.recordRun(v.mass, W.rank, v.kills, runTime);
        L.Storage.decayGrudges();
        L.Storage.publishBest();

        spectate = { target: (k && k.alive) ? k : v, t: SPECTATE_TIME, title: title, sub: sub, color: color };
        state = "spectate";
    }

    /* ===== Frame ===== */
    function frame(now) {
        requestAnimationFrame(frame);

        if (!last) last = now;
        var dt = (now - last) / 1000;
        last = now;
        if (paused) return;

        /* Clamp so a backgrounded tab or a slow frame cannot teleport
         * anything through a body. */
        if (dt > 0.05) dt = 0.05;
        if (dt <= 0) return;

        var player = W.player;

        if (state === "playing") {
            runTime += dt;
            L.Bots.update(W, dt);
            L.Player.update(dt, W);

            rankTimer -= dt;
            if (rankTimer <= 0) {
                rankTimer = 0.25;
                L.World.updateRanks();
                lastRank = W.rank;
            }

            if (player) {
                var boosting = player.boosting;
                if (boosting !== boostWasOn) {
                    L.Audio.setBoost(boosting);
                    boostWasOn = boosting;
                }
                L.Audio.setDepth(player.headY / W.size);
            }
        } else if (state === "spectate" || state === "dead") {
            L.Bots.update(W, dt);
            L.Audio.setBoost(false);
            boostWasOn = false;
        } else {
            /* Menu: the world runs, there is just nobody to steer. */
            L.Bots.update(W, dt);
        }

        L.World.step(dt);
        consumeEvents();

        if (state === "spectate" && spectate) {
            spectate.t -= dt;
            if (spectate.target && !spectate.target.alive) {
                spectate.target = leader() || spectate.target;
            }
            if (spectate.t <= 0) {
                L.UI.showDeath({
                    title: spectate.title,
                    sub: spectate.sub,
                    color: spectate.color,
                    mass: W.player ? W.player.mass : 0,
                    rank: lastRank,
                    kills: W.player ? W.player.kills : 0,
                    best: L.Storage.getStats().best,
                });
                state = "dead";
            }
        }

        /* Choose who the camera watches. */
        var target = null;
        if (state === "menu") target = leader();
        else if (state === "playing") target = player;
        else if (spectate) target = spectate.target;

        L.Render.draw(W, W.time, dt, target);
        L.UI.update(W, dt);
        L.UI.tickFeed(dt);
    }

    /* ===== Boot ===== */
    function armAudio() {
        if (audioArmed) return;
        audioArmed = true;
        L.Audio.init();
        L.Audio.resume();
        L.Audio.setEnabled(settings.sound);
    }

    function boot() {
        L.Render.init(document.getElementById("game-canvas"));
        L.UI.init();
        L.Boot = { startRun: startRun, toMenu: toMenu };

        L.UI.on("play", function () { armAudio(); startRun(); });
        L.UI.on("menu", function () { armAudio(); toMenu(); });
        L.UI.on("toggleSound", function () {
            settings = L.Storage.setSound(!settings.sound);
            L.Audio.setEnabled(settings.sound);
            L.UI.updateSoundButton(settings.sound);
        });
        L.UI.on("install", function () {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
            document.getElementById("install-prompt").classList.add("hidden");
        });

        window.addEventListener("beforeinstallprompt", function (e) {
            e.preventDefault();
            deferredPrompt = e;
            L.UI.setInstallAvailable();
        });
        window.addEventListener("appinstalled", function () {
            document.getElementById("install-prompt").classList.add("hidden");
        });

        window.addEventListener("pointerdown", armAudio, { once: true });
        window.addEventListener("keydown", armAudio, { once: true });

        document.addEventListener("visibilitychange", function () {
            paused = document.hidden;
            if (!paused) last = 0;
        });

        /* Tell the hub we were played, and coach iOS users who have no
         * beforeinstallprompt to Add to Home Screen instead. */
        if (window.R2) {
            try { R2.markPlayed("lumen-pwa/"); } catch (e) { /* ignore */ }
            try { R2.trackPlaytime("lumen-pwa/"); } catch (e) { /* ignore */ }
            try { R2.installHint(); } catch (e) { /* ignore */ }
        }
        L.Storage.publishBest();

        /* A live ocean behind the menu. */
        L.World.generate(L.Storage.getSeed());
        L.Bots.spawnAll(W);
        L.UI.showScreen("menu");

        requestAnimationFrame(frame);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(window.LUMEN = window.LUMEN || {});
