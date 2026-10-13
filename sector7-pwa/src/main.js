/*
 * SECTOR 7 - main loop and game flow.
 *
 * States: menu -> flying -> docked -> flying -> dead -> flying ...
 *
 * The sector keeps simulating underneath every screen, so the menu sits over
 * a live fight rather than a still image and the station feels like a place
 * in a running world instead of a pause menu.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var state = "menu";
    var respawnTimer = 0;
    var lastKiller = null;
    var paused = false;
    var settings = S.Storage.getSettings();
    var deferredPrompt = null;
    var last = 0;
    var audioArmed = false;
    var session = { kills: 0, distance: 0, startedAt: 0 };
    /* Which map the player has selected at the station. */
    var currentSector = "rook";

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

    /* ===== Flow ===== */

    /* `sectorId` comes from storage, so a player who relaunches lands back
     * in the map they chose rather than wherever the default is. */
    function newSector(sectorId) {
        var seed = S.Storage.getSeed();
        var sec = S.Sector.get(sectorId || currentSector);
        S.World.generate(seed, sec.id);
        S.Render.bindWorld(S.World.world);
        S.NPCs.clear();
        S.NPCs.resetRng(seed);
        S.Contracts.forSector(sec, seed);
        S.Bounty.reset(sec, seed);
        return sec;
    }

    function startRun(sectorId) {
        if (sectorId) currentSector = S.Sector.get(sectorId).id;
        var save = S.Storage.getShip();
        save.sector = currentSector;
        S.Storage.saveShip(save);
        S.Bounty.load();
        var name = S.UI.name();
        save.name = name || save.name || "Pilot-" + S.fmt(save.crystals);
        S.Storage.saveShip(save);

        newSector();

        var ship = S.Player.create(save);
        S.NPCs.spawnAll(ship);

        session = { kills: 0, distance: 0, startedAt: 0 };
        state = "flying";
        respawnTimer = 0;

        S.Render.snap(ship.x, ship.y);
        S.Render.prepareShip(ship);
        S.UI.clearFeed();
        S.UI.showScreen(null);

        S.Audio.init();
        S.Audio.resume();
        S.Audio.setEnabled(settings.sound);
    }

    function toMenu() {
        newSector();
        S.Player.reset();
        S.UI.clearFeed();
        S.UI.showScreen("menu");
        state = "menu";
        S.Audio.setThrottle(0);
    }

    /* ===== Death & respawn ===== */

    function onPlayerDeath(killer) {
        S.Player.onDeath();
        state = "dead";
        respawnTimer = C.world.deathRespawn;
        lastKiller = killer;

        /* An unfinished survive contract dies with the run. Everything else
         * keeps its progress: you did that work before the wreck. */
        S.Contracts.resetRun();

        /* Crystals were banked the moment they were picked up, so only the
         * energy on the deck was ever at risk. World.killPlayer has already
         * taken the salvage-rig share off the ship, so banking here banks
         * exactly what survived and no more. */
        var save = S.Stations.bank(S.World.world.player);
        S.Storage.saveShip(save);

        var stats = S.Storage.bump({
            deaths: 1,
            distance: Math.round(session.distance),
        });
        S.Storage.publishBest(stats);

        S.Audio.death();
        vibrate([70, 50, 140]);
    }

    /* The wreck burns for a beat, then the run-over panel takes over. You
     * relaunch from the same save, so the only thing this costs you is the
     * energy that is still floating where you died. */
    function showWreckPanel() {
        var stats = S.Storage.getStats();
        var save = S.Storage.getShip();
        var cause = "Your hull gave out somewhere quiet.";
        var color = "#8fb6c9";

        if (lastKiller) {
            cause = "Your energy is still out there, where you fell.";
            color = lastKiller.color;
        }

        S.UI.showDeath({
            title: lastKiller ? "Destroyed by " + lastKiller.name : "Ship lost",
            sub: cause,
            color: color,
            crystals: save.crystals,
            kills: session.kills,
            best: stats.bestCrystals,
            deaths: stats.deaths,
        });
        state = "wrecked";
    }

    function respawn() {
        var save = S.Storage.getShip();
        newSector();

        var ship = S.Player.create(save);
        S.NPCs.spawnAll(ship);

        state = "flying";
        respawnTimer = 0;
        S.Render.snap(ship.x, ship.y);
        S.Audio.respawn();
        vibrate([20, 40, 20]);
    }

    function relaunch() {
        /* Same save, same ship, fresh sector - the energy you dropped is
         * genuinely gone, everything else is exactly where you left it. */
        S.UI.showScreen(null);
        startRun();
        S.Audio.resume();
    }

    /* ===== Events ===== */

    function consumeEvents() {
        var evs = S.World.world.events;
        var player = S.World.world.player;

        for (var i = 0; i < evs.length; i++) {
            var e = evs[i];
            switch (e.type) {
                case "shoot":
                    if (e.ship.isPlayer) S.Audio.shoot(true);
                    else if (player && S.dist2(e.ship.x, e.ship.y, player.x, player.y) < 700 * 700) {
                        S.Audio.shoot(false);
                    }
                    break;

                case "hit":
                    if (e.ship.isPlayer) {
                        S.Audio.hit();
                        if (e.dmg > 0) vibrate(12);
                    }
                    break;

                case "pickup":
                    S.Audio.pickup(e.kind);
                    vibrate(e.kind === "crystal" ? [10, 30, 10] : 8);
                    if (e.kind === "crystal") S.Contracts.note("crystals", e.value);
                    break;

                case "crate":
                    S.Audio.pickup("energy");
                    S.Storage.bump({ cratesOpened: 1 });
                    S.Contracts.note("crates", 1);
                    vibrate(8);
                    break;

                case "rockBreak":
                    if (S.dist2(e.rock.x, e.rock.y,
                        player ? player.x : 0, player ? player.y : 0) < 900 * 900) {
                        S.Audio.rockBreak();
                    }
                    if (e.byPlayer) {
                        S.Storage.bump({ rocksBroken: 1 });
                        /* Only the player's own kills count, and only rocks
                         * with a real cache count as "rich" - otherwise the
                         * cheapest rock on the map clears the contract and
                         * the objective is a lie. */
                        S.Contracts.note("rocks", 1, { rich: e.rock.rich !== false });
                    }
                    break;

                case "kill":
                    if (e.killer && e.killer.isPlayer) {
                        session.kills++;
                        S.Audio.kill(e.victim.tier > 4);
                        S.UI.addKill("You", S.COLORS.player, e.victim.name, e.victim.color);
                        vibrate(40);
                        S.Contracts.note("kills", 1);
                        /* Ending a bounty pays out immediately and loudly: it
                         * is the biggest single crystal event in a run. */
                        var bountyPay = S.Bounty.onKill(e.victim);
                        if (bountyPay) {
                            e.killer.crystals += bountyPay;
                            S.UI.addKill("BOUNTY", "#ff5470",
                                e.victim.name + "  +" + bountyPay + " ◈", "#ff5470");
                            S.UI.toast("BOUNTY CLAIMED  +" + bountyPay + " ◈");
                            S.Audio.upgrade();
                            vibrate([30, 40, 90]);
                        }
                    } else if (e.killer && !e.victim.isPlayer) {
                        /* NPC-on-NPC kills still get a line: the sector should
                         * feel like it is happening without you. */
                        S.UI.addKill(e.killer.name, e.killer.color, e.victim.name, e.victim.color);
                    }
                    break;

                case "playerDeath":
                    onPlayerDeath(e.killer);
                    break;

                case "salvo":
                    if (e.ship.isPlayer) { S.Audio.salvo(e.count); vibrate(45); }
                    break;

                case "mine":
                    if (e.ship.isPlayer) S.Audio.mineDrop();
                    break;

                case "bountySpawn":
                    S.Audio.bounty();
                    S.UI.addKill("WANTED", "#ff5470", e.name, "#ff5470");
                    S.UI.toast(e.name + " IS HUNTING YOU  ·  " + e.value + " ◈");
                    vibrate([60, 30, 60]);
                    break;

                case "dock":
                    S.UI.showStation(S.World.world.player);
                    state = "docked";
                    break;

                case "undock":
                    S.UI.showScreen(null);
                    state = "flying";
                    break;
            }
        }
        evs.length = 0;
    }

    /* ===== Station transactions ===== */

    function buyModule(key) {
        var ship = S.World.world.player;
        var res = S.Stations.buyModule(ship, key);

        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            return;
        }

        S.Audio.upgrade();
        S.UI.toast(key.toUpperCase() + " → LV" + res.level);

        /* Bank immediately so a crash or a closed tab can never lose a
         * purchase the player has paid for. */
        var save = S.Stations.bank(ship);
        S.Storage.saveShip(save);
        S.UI.refreshStation();
    }

    function buyRepair() {
        var ship = S.World.world.player;
        var res = S.Stations.buyRepair(ship);

        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            return;
        }

        S.Audio.upgrade();
        S.UI.toast("HULL RESTORED  −" + S.fmt(res.spent) + " ⚡");
        /* Banked for the same reason a purchase is: the browser tab is not
         * guaranteed to survive a background kill while docked. */
        S.Storage.saveShip(S.Stations.bank(ship));
        S.UI.refreshStation();
    }

    function buyRefit(key) {
        var ship = S.World.world.player;
        var res = S.Stations.buyRefit(ship, key);

        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            return;
        }

        S.Audio.upgrade();
        S.UI.toast(key.toUpperCase() + " FITTED  LV" + res.level);

        /* Refits change max hull and derived stats, so the ship has to
         * re-derive before it is banked or the save lies about it. */
        S.Stations.refreshStats(ship);
        S.Storage.saveShip(S.Stations.bank(ship));
        S.UI.refreshStation();
    }

    function claimContract(id) {
        var pay = S.Contracts.claim(id);
        if (pay === null) { S.Audio.error(); return; }

        /* Survey Suite makes the station pay better; without it you get the
         * board's own number. */
        var survey = S.refitLevel(S.World.world.player.refits, "survey");
        var total = Math.round(pay * (1 + survey * 0.2));

        var ship = S.World.world.player;
        ship.crystals += total;
        S.Contracts.refresh();
        S.Audio.upgrade();
        S.UI.toast("CONTRACT PAID  +" + total + " ◈");
        S.Storage.saveShip(S.Stations.bank(ship));
        S.UI.refreshStation();
    }

    /* Launching into a different sector rebuilds the world around the same
     * ship: modules, crystals and refits all carry across.
     *
     * Energy carries across too. The cost of a harder sector is that it is
     * harder, and the crystal gate already made you earn the right to go
     * there - confiscating the tank on top of that turns a feature the player
     * chose into a punishment. */
    function travelTo(sectorId) {
        var save = S.Stations.bank(S.World.world.player);
        save.sector = S.Sector.get(sectorId).id;
        S.Storage.saveShip(save);
        currentSector = save.sector;
        S.UI.showScreen(null);
        startRun(sectorId);
    }

    function undock() {
        S.Player.undock();
        S.UI.showScreen(null);
        state = "flying";
    }

    /* ===== Frame ===== */

    function stepSim(dt) {
        var W = S.World.world;
        var player = W.player;
        var i;

        if (state === "flying" && player && player.alive) {
            S.Input.tick();
            S.Player.update(dt, S.Input.state, settings.aimAssist);
        } else {
            /* The sector never stops. Docked, wrecked or on the menu, the AI
             * keeps flying and the loot keeps circulating. */
            S.Audio.setThrottle(0);
        }

        S.NPCs.think(dt);
        S.NPCs.update(dt);
        S.Bounty.update(W, S.Sector.get(W.sectorId), player, dt);
        for (i = 0; i < W.ships.length; i++) S.World.moveShip(W.ships[i], dt);

        var flying = state === "flying" && player && player.alive;
        /* Contracts keep their own clock whether or not the player is
         * flying, so the board never sits frozen while you dock. */
        S.Contracts.tick(dt, flying);
        if (flying) {
            session.distance += Math.sqrt(player.vx * player.vx + player.vy * player.vy) * dt;
        }

        if (state === "docked" && player && player.alive) {
            S.Stations.dockTick(player, dt);
        }

        S.World.step(dt);
        consumeEvents();
        S.Input.endFrame();
    }

    function frame(now) {
        requestAnimationFrame(frame);

        if (!last) last = now;
        var dt = (now - last) / 1000;
        var frameMs = now - last;
        last = now;

        if (paused) return;
        /* Clamp so a backgrounded tab or a stalled frame cannot teleport a
         * ship through anything. */
        if (dt > 0.05) dt = 0.05;
        if (dt <= 0) return;

        S.Render.samplePerf(frameMs);

        stepSim(dt);

        if (state === "dead") {
            respawnTimer -= dt;
            if (respawnTimer <= 0) showWreckPanel();
        }

        /* Camera: the menu watches the strongest ship in the sector, which
         * makes the background a live firefight instead of a still. */
        var live = livePlayer();
        if (state === "flying" && live) {
            S.Render.follow(live, dt);
        } else if (state === "menu") {
            /* The station, not whichever NPC happens to be strongest: it is
             * the one landmark the player has to recognise to navigate. */
            S.Render.lookAt(S.World.world.station.x, S.World.world.station.y, dt);
        }

        S.Render.draw(S.World.world, dt);
        S.UI.update(S.World.world, dt);
        S.UI.tickFeed(dt);
    }

    function livePlayer() {
        var p = S.World.world.player;
        return p && p.alive && !p.docked ? p : null;
    }

    /* ===== Boot ===== */

    function armAudio() {
        if (audioArmed) return;
        audioArmed = true;
        S.Audio.init();
        S.Audio.resume();
        S.Audio.setEnabled(settings.sound);
    }

    function boot() {
        /* Restore the sector the player last launched into, not the default.
         * Otherwise "relaunch" silently dropped everyone back to ROOK. */
        currentSector = S.Sector.get(S.Storage.getShip().sector).id;

        S.Render.init(document.getElementById("game-canvas"));
        S.Render.setForcedQuality(settings.quality);
        S.UI.init();
        S.Input.init(S.Render.canvas());

        S.UI.on("play", function () { armAudio(); startRun(); });
        S.UI.on("relaunch", function () { armAudio(); relaunch(); });
        S.UI.on("menu", function () { armAudio(); toMenu(); });
        S.UI.on("buy", buyModule);
        S.UI.on("repair", buyRepair);
        S.UI.on("refit", buyRefit);
        S.UI.on("claim", claimContract);
        S.UI.on("travel", travelTo);
        S.UI.on("undock", undock);
        S.UI.on("toggleAssist", function () {
            settings = S.Storage.patchSetting("aimAssist", !settings.aimAssist);
            S.UI.updateAssistButton(settings.aimAssist);
            S.Audio.ui();
        });
        S.UI.on("toggleSound", function () {
            settings = S.Storage.patchSetting("sound", !settings.sound);
            S.Audio.setEnabled(settings.sound);
            S.UI.updateSoundButton(settings.sound);
        });
        S.UI.on("install", function () {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
            el_hide("install-prompt");
        });

        window.addEventListener("beforeinstallprompt", function (e) {
            e.preventDefault();
            deferredPrompt = e;
            S.UI.setInstallAvailable();
        });
        window.addEventListener("appinstalled", function () {
            el_hide("install-prompt");
        });

        window.addEventListener("pointerdown", armAudio, { once: true });
        window.addEventListener("keydown", armAudio, { once: true });

        document.addEventListener("visibilitychange", function () {
            paused = document.hidden;
            if (!paused) last = 0;
        });

        /* Persist on the way out: a phone browser tab is not guaranteed to
         * survive a background kill. */
        window.addEventListener("pagehide", persist);

        /* Tell the hub we were played, and coach iOS users who have no
         * beforeinstallprompt to Add to Home Screen instead. */
        if (window.R2) {
            try { R2.markPlayed("sector7-pwa/"); } catch (e) { /* ignore */ }
            try { R2.trackPlaytime("sector7-pwa/"); } catch (e) { /* ignore */ }
            try { R2.installHint(); } catch (e) { /* ignore */ }
        }
        S.Storage.publishBest();

        toMenu();
        requestAnimationFrame(frame);
    }

    function persist() {
        var ship = S.World.world.player;
        if (ship && ship.alive && !ship.docked) {
            S.Storage.saveShip(S.Stations.bank(ship));
        }
    }

    function el_hide(id) {
        var e = document.getElementById(id);
        if (e) e.classList.add("hidden");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    S.Main = { startRun: startRun, toMenu: toMenu };

})(window.S7 = window.S7 || {});