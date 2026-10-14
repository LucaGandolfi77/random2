/*
 * FORMICA - ciclo principale e flusso di gioco.
 *
 * Stati: menu -> partita -> spettacolo -> morto -> partita ...
 * Il mondo continua a simulare in ogni stato dopo il boot, così il menu
 * poggia su un tavolo vivo con le tue nemiche ricorrenti invece che su
 * un'immagine ferma.
 */
(function (L) {
    "use strict";

    var W = L.World.world;

    var PLAYER_COLOR = "#ff7043";
    var SPECTATE_TIME = 2.6;

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
    var runStats = null;

    /* ===== Helper ===== */
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
        for (var i = 0; i < W.colonies.length; i++) {
            var c = W.colonies[i];
            if (!c.alive) continue;
            if (!best || c.territory > best.territory) best = c;
        }
        return best;
    }

    function newRunStats() {
        return { raidsBeaten: 0, raidsLost: 0, annexed: 0, crumbs: 0 };
    }

    /* ===== Flusso ===== */
    function startRun() {
        L.World.reset();
        L.World.generate(L.Storage.getSeed());
        L.Bots.clear(W);
        L.Bots.spawnAll(W);

        var name = L.UI.name();
        L.Storage.saveProfile(name);
        var p = L.World.addPlayer(name, PLAYER_COLOR);

        L.Player.reset();
        L.Camera.snap(p.x, p.y, L.World.zoomFor(p));

        L.UI.clearFeed();
        L.UI.showScreen(null);
        L.UI.resetPeak();

        state = "playing";
        runTime = 0;
        spectate = null;
        lastRank = 1;
        runStats = newRunStats();

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
    }

    /* ===== Eventi ===== */
    function consumeEvents() {
        var evs = W.events;
        var player = W.player;

        for (var i = 0; i < evs.length; i++) {
            var e = evs[i];

            switch (e.type) {
                case "pickup":
                    if (e.colony.isPlayer) {
                        L.Audio.pickup(e.value);
                        vibrate(12);
                    }
                    break;

                case "deposit":
                    if (e.colony.isPlayer) {
                        L.Audio.deposit(e.value);
                        vibrate([15, 20, 15]);
                    }
                    break;

                case "workerUp":
                    if (e.colony.isPlayer) {
                        L.Audio.workerUp();
                        L.Render.shake(6);
                        L.UI.addFeed("🐜 +1 formica — ora sono " + e.colony.workers, "#ffcc80");
                    }
                    break;

                case "colonyHurt":
                    if (e.colony.isPlayer) {
                        if (e.cause === "water") L.Audio.splash();
                        else L.Audio.inkHit();
                        L.Render.shake(10);
                        vibrate([30, 40, 30]);
                        L.UI.addFeed("💧 " + e.lost + " formica" + (e.lost === 1 ? "" : "che") +
                            " persa" + (e.lost === 1 ? "" : "e"), "#4fc3f7");
                    }
                    break;

                case "shake":
                    if (e.colony.isPlayer) L.Render.shake(8);
                    break;

                case "nightfall":
                    L.Audio.nightfall();
                    L.UI.addFeed("🌙 Cala la notte: le colonie si organizzano", "#8ea2ff");
                    break;

                case "dawn":
                    L.Audio.dawn();
                    L.UI.addFeed("☀️ Alba: i nidi si riparano", "#ffd54f");
                    break;

                case "raidLaunch":
                    if (e.target && e.target.isPlayer) {
                        L.Audio.raidHorn();
                        L.Render.shake(5);
                        vibrate([40, 60, 40]);
                        L.UI.addFeed("🚨 " + e.raider.name + " marcia sul tuo nido", e.raider.color);
                    } else if (e.raider.isPlayer === false && Math.random() < 0.3) {
                        L.UI.addFeed("⚔ " + e.raider.name + " razzia " + e.target.name, e.raider.color);
                    }
                    break;

                case "raidRepelled":
                    if (e.colony.isPlayer) {
                        L.Audio.repelled();
                        vibrate(35);
                        runStats.raidsBeaten++;
                        L.UI.addFeed("🛡 Razzia respinta", "#a5d6a7");
                    }
                    break;

                case "nestHit":
                    if (e.colony.isPlayer) {
                        L.Audio.nestHit();
                        L.Render.shake(14);
                        vibrate([60, 40, 90]);
                        if (e.stolen > 0) {
                            L.UI.addFeed("🔥 Nido saccheggiato: −" + e.stolen + " briciole", "#ef9a9a");
                            runStats.raidsLost++;
                        }
                    }
                    break;

                case "clash":
                    L.Audio.clash();
                    L.Render.shake(9);
                    vibrate(40);
                    if (e.loser && e.loser.isPlayer) {
                        L.UI.addFeed("⚔ Scontro perso: −1 formica", "#ffcc80");
                    } else {
                        L.UI.addFeed("⚔ Scontro vinto", "#a5d6a7");
                    }
                    break;

                case "clashKill":
                    L.Audio.clash();
                    break;

                case "colonyDeath":
                    onColonyDeath(e);
                    break;

                case "annex":
                    if (e.killer.isPlayer) {
                        L.Audio.annex();
                        L.Render.shake(16);
                        vibrate([50, 40, 120]);
                        runStats.annexed++;
                        L.UI.addFeed("⚑ " + e.colony.name + " annessa: il nido è tuo", e.killer.color);
                    }
                    L.Bots.onKill(e.killer, e.colony);
                    break;

                case "playerDeath":
                    onPlayerDeath(e);
                    break;
            }
        }
        evs.length = 0;
    }

    function onColonyDeath(e) {
        var col = e.colony;
        L.Bots.onColonyDeath(col);
        if (col.isPlayer) return;

        if (e.killer && e.killer.isPlayer) {
            /* già gestito dall'evento annex */
        } else if (e.cause) {
            var verb = e.cause === "water" ? "annegata"
                : e.cause === "ink" ? "dissolta nell'inchiostro"
                : "sterminata";
            L.UI.addFeed("☠ " + col.name + " " + verb, "#bcaaa4");
        }
    }

    function onPlayerDeath(e) {
        var k = e.killer;
        var v = e.colony;
        var cause = e.cause;

        L.Audio.death();
        L.Audio.setEnabled(settings.sound);
        L.Render.shake(24);
        vibrate([90, 60, 160]);

        var title, sub, color = "#ffab91";

        if (k) {
            L.UI.addFeed("☠ " + k.name + " ti ha annesso", k.color);
            title = "Annesso da " + k.name;
            sub = "Il tavolo non perdona. Torna a reclamarlo.";
            color = k.color;
        } else if (cause === "water") {
            title = "Annegata";
            sub = "Una goccia, e la colonia affonda.";
            color = "#4fc3f7";
        } else if (cause === "ink") {
            title = "Dissolta";
            sub = "L'inchiostro non lascia scampo.";
            color = "#b39ddb";
        } else if (cause === "clash") {
            title = "Sgomberata";
            sub = "Una colonia più grande era lì.";
        } else {
            title = "Colonia perduta";
            sub = "L'ultima formica è caduta.";
        }

        L.Storage.recordRun({
            territory: L.UI.peakTerritory(),
            rank: lastRank,
            raidsBeaten: runStats.raidsBeaten,
            raidsLost: runStats.raidsLost,
            annexed: runStats.annexed,
            crumbs: Math.floor(v.crumbs),
            seconds: runTime,
        });
        L.Storage.decayGrudges();
        L.Storage.publishBest();

        spectate = {
            target: (k && k.alive) ? k : leader() || v,
            t: SPECTATE_TIME,
            title: title, sub: sub, color: color,
        };
        state = "spectate";
    }

    /* ===== Frame ===== */
    function frame(now) {
        requestAnimationFrame(frame);

        if (!last) last = now;
        var dt = (now - last) / 1000;
        last = now;
        if (paused) return;

        /* Clamp: una scheda in background o un frame lento non devono
         * teletrasportare nessuno attraverso un ostacolo. */
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
                L.Audio.setNight(W.night);
                var boosting = !!player.boosting;
                if (boosting !== boostWasOn) {
                    boostWasOn = boosting;
                }
            }
        } else if (state === "spectate" || state === "dead") {
            L.Bots.update(W, dt);
        } else {
            /* Menu: il tavolo vive, non c'è solo nessuno da sterzare. */
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
                    territory: L.UI.peakTerritory(),
                    rank: lastRank,
                    raidsBeaten: runStats.raidsBeaten,
                    crumbs: W.player ? W.player.crumbs : 0,
                    best: L.Storage.getStats().best,
                });
                state = "dead";
            }
        }

        /* Chi guarda la camera. */
        var target = null;
        if (state === "menu") target = leader();
        else if (state === "playing") target = player;
        else if (spectate) target = spectate.target;

        L.Render.draw(W, dt, W.time, target);
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

        /* Dichiara all'hub che ci hanno giocato, e allena gli utenti iOS che
         * non hanno beforeinstallprompt ad aggiungere a Home. */
        if (window.R2) {
            try { R2.markPlayed("formica-pwa/"); } catch (e) { /* ignore */ }
            try { R2.trackPlaytime("formica-pwa/"); } catch (e) { /* ignore */ }
            try { R2.installHint(); } catch (e) { /* ignore */ }
        }
        L.Storage.publishBest();

        /* Un tavolo vivo dietro al menu. */
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

})(window.FORMICA = window.FORMICA || {});
