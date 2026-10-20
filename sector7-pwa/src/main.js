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
    /* Whether the empty-magazine warning has already been said for this
     * magazine. It is said once, so holding FIRE on an empty gun is a
     * click rather than a toast every frame. */
    var drySaid = false;
    /* Which map the player has selected at the station. */
    var currentSector = "rook";
    /* The stand-in ship the hangar edits when there is no live one. */
    var hangarScratch = null;

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

        /* The mode run starts with the flight, not with the sector: a WAVE
         * portal belongs to the attempt, and a new attempt gets a new one. */
        S.Modes.reset();
        S.Modes.start(save.mode || "patrol", S.World.world, ship);

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

        /* A mode run ends with the run. A wave you died in is not paid, and a
         * haul whose timer was still ticking stops ticking - carrying on would
         * mean a dead pilot still had a countdown. */
        var mode = S.Modes.abort();
        if (mode) S.UI.toast(S.mode(mode.id).name + " RUN ENDED", true);

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
                    if (e.ship.isPlayer) {
                        /* A gun that fired has rounds in it, so the empty
                         * magazine warning is allowed to say itself again
                         * the next time it runs dry. */
                        drySaid = false;
                        S.Audio.shoot(true);
                    }
                    else if (player && S.dist2(e.ship.x, e.ship.y, player.x, player.y) < 700 * 700) {
                        S.Audio.shoot(false);
                    }
                    break;

                case "lockShot":
                    /* Its own event, not a "shoot": the lock-on shot is a
                     * different weapon with a different sound, and firing it
                     * should be recognisable without looking at the screen. */
                    if (e.ship.isPlayer) {
                        drySaid = false;
                        S.Audio.lockShot();
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

                case "baseAlarm": {
                    /* The base calls its OWN faction out. Spawning it here
                     * rather than inside world.js keeps entity creation in
                     * the system that owns it, and means the sim test can run
                     * a faction map without dragging main.js in. */
                    var called = S.NPCs.callDefenders(e.base, e.guards);
                    S.Audio.bounty();
                    S.UI.toast(e.base.name + " CALLS " + called.length + " DEFENDERS");
                    S.UI.addKill("WARNED", e.base.color, e.base.name, e.base.color);
                    vibrate([40, 30, 40]);
                    break;
                }

                case "baseDown":
                    S.Audio.explosion();
                    S.UI.toast(e.base.name + " DOWN  ·  +" + e.reward + " ◈ ON THE DECK");
                    S.UI.addKill("RAIDED", "#67e8f9", e.base.name, "#67e8f9");
                    vibrate([30, 40, 120]);
                    break;

                case "waveOpen":
                    S.Audio.bounty();
                    S.UI.toast("WAVE " + e.wave + " / " + e.waves + "  ·  " + e.count + " INCOMING");
                    vibrate([40, 25, 40]);
                    break;

                case "modeStart":
                    S.UI.toast(e.text);
                    break;

                case "dock":
                    /* The hold was banked by Player.dock before the event was
                     * queued, so the panel opens on the real balance. */
                    S.UI.showStation(S.World.world.player);
                    state = "docked";
                    break;

                case "cpu": {
                    var def = S.cpu(e.key);
                    if (e.ship.isPlayer) {
                        /* The cloak has its own sound: it is the one CPU
                         * where hearing it matters, because the whole
                         * effect is that nothing can see you. */
                        if (e.key === "cloak") S.Audio.cloak();
                        else S.Audio.cpu(e.key);
                        vibrate(24);
                        if (def) S.UI.toast(def.name.toUpperCase() + " ACTIVE");
                    }
                    break;
                }

                case "ammo":
                    if (e.ship.isPlayer) { drySaid = false; S.Audio.ammo(); vibrate(30); }
                    break;

                case "dry":
                    /* The gun is empty. It says so, once: the player is
                     * holding the button down and a click every frame
                     * would be a machine gun of nothing. */
                    if (e.ship.isPlayer) {
                        S.Audio.dry();
                        if (!drySaid) {
                            drySaid = true;
                            var d = S.munition(e.key);
                            S.UI.toast("NO " + (d ? d.name.toUpperCase() : "ROUNDS"), true);
                        }
                    }
                    break;

                case "plasma":
                    if (e.ship.isPlayer) { drySaid = false; S.Audio.plasma(); vibrate(36); }
                    break;

                case "turret":
                    if (e.ship.isPlayer) S.Audio.turret();
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

    function buyCpu(key) {
        var ship = S.World.world.player;
        var res = S.Stations.buyCpu(ship, key);

        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            return;
        }

        S.Audio.upgrade();
        S.UI.toast((S.cpu(key) ? S.cpu(key).name.toUpperCase() : key) + " INSTALLED");

        /* Banked immediately, for the same reason every other purchase is:
         * a phone browser tab is not guaranteed to survive a background kill
         * while docked. */
        S.Storage.saveShip(S.Stations.bank(ship));
        S.UI.refreshStation();
    }

    function fitCpu(key) {
        var ship = S.World.world.player;
        var res = S.Stations.fitCpu(ship, key);

        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            return;
        }

        S.Audio.ui();
        S.Storage.saveShip(S.Stations.bank(ship));
        S.UI.refreshStation();
    }

    /* ===== Hangar ===== */

    /* The station has a live ship, so buying is straightforward. From the
     * menu there is no ship in the world - build a throwaway one so the
     * hangar can be browsed, and make buying from there write straight to
     * storage. Browsing must never require flying. */
    function hangarShip() {
        var live = S.World.world.player;
        if (live && live.alive) return live;
        var save = S.Storage.getShip();
        /* The hangar is reachable from the menu, where there is no live ship
         * to bank. The scratch is kept so the purchase can still be written
         * back to the save - a pilot who buys a part in the menu and finds
         * it gone when they reopen the hangar has been charged for nothing
         * twice over. */
        hangarScratch = {
            energy: save.energy,
            crystals: save.crystals,
            modules: save.modules,
            refits: save.refits,
            cpus: save.cpus,
            cpu: save.cpu,
            hangar: save.hangar,
            hullId: save.hullId,
            parts: save.parts,
        };
        S.Stations.refreshStats(hangarScratch);
        return hangarScratch;
    }

    function openHangar() {
        S.UI.showHangar(hangarShip());
    }

    function closeHangar() {
        /* Back where it was opened from: the station if the ship is docked,
         * otherwise the menu. Guessing wrong would strand a pilot in a screen
         * with no way back. */
        if (state === "docked") S.UI.showStation(S.World.world.player);
        else S.UI.showScreen("menu");
    }

    function persistHangar() {
        var ship = S.World.world.player;
        if (ship && ship.alive) {
            S.Stations.bank(ship);
            S.Storage.saveShip(ship.saved);
            S.Storage.saveHangar(ship.hangar);
            hangarScratch = null;
            return;
        }
        /* No live ship: the hangar is still real and still has to be
         * written back, along with the money that was spent on it.
         *
         * The hangar lives in two places - its own key and the copy inside
         * the ship save - and every write path has to write both, or the
         * two drift apart and the pilot gets whichever one they did not
         * change. */
        if (!hangarScratch) return;
        S.Storage.saveHangar(hangarScratch.hangar);
        var save = S.Storage.getShip();
        save.energy = Math.max(0, hangarScratch.energy);
        save.crystals = Math.max(0, hangarScratch.crystals);
        save.hangar = hangarScratch.hangar;
        S.Storage.saveShip(save);
        hangarScratch = null;
    }

    function selectHull(id) {
        var ship = hangarShip();
        var hangar = ship.hangar;
        var owned = S.Storage.ownsHull(hangar, id);

        var res;
        if (owned) {
            res = S.Stations.setActiveHull(ship, id);
        } else {
            res = S.Stations.buyHull(ship, id);
            if (!res.ok) {
                S.Audio.error();
                S.UI.toast(res.reason.toUpperCase(), true);
                S.UI.refreshHangar();
                return;
            }
            S.Audio.upgrade();
            S.UI.toast(S.hull(id).name + " ACQUIRED");
        }
        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            S.UI.refreshHangar();
            return;
        }
        persistHangar();
        S.UI.refreshHangar();
    }

    /* Buy a bundle of rounds into the hangar's reserve.
     *
     * The purchase goes to the RESERVE, not to the ship: the magazine is
     * loaded when the ship launches, so the pilot can buy in the station
     * and take the rounds out with them. */
    function buyMunitions(key) {
        var ship = hangarShip();
        var res = S.Stations.buyMunitions(ship, key);
        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            S.UI.refreshHangar();
            return;
        }
        S.Audio.upgrade();
        var def = S.munition(key);
        S.UI.toast("+" + res.bundle + " " + (def ? def.name.toUpperCase() : key));
        persistHangar();
        S.UI.refreshHangar();
    }

    /* Buy, fit or remove the auto-turret. */
    function turretAction(what) {
        var ship = hangarShip();
        var res;
        if (what === "buy") {
            res = S.Stations.buyTurret(ship);
            if (!res.ok) {
                S.Audio.error();
                S.UI.toast(res.reason.toUpperCase(), true);
                S.UI.refreshHangar();
                return;
            }
            S.Audio.upgrade();
            S.UI.toast(S.TURRET.name.toUpperCase() + " FITTED");
        } else {
            S.Audio.error();
            S.UI.toast("UNKNOWN ACTION", true);
            S.UI.refreshHangar();
            return;
        }
        persistHangar();
        S.UI.refreshHangar();
    }

    function buyPart(key) {
        var ship = hangarShip();
        var def = S.part(key);
        var owned = ship.hangar.parts[key] > 0;
        var res = S.Stations.buyPart(ship, key);

        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            S.UI.refreshHangar();
            return;
        }
        /* Buying and fitting are the same click on purpose: opening the
         * hangar twice to see what you just paid for is a tax, and the slot
         * was empty anyway in the common case. */
        if (!owned) {
            S.Stations.fitPart(ship, key, def ? def.slot : null);
            S.Audio.upgrade();
            S.UI.toast((def ? def.name : key).toUpperCase() + " FITTED");
        } else {
            S.Stations.fitPart(ship, key, def ? def.slot : null);
            S.Audio.ui();
            S.UI.toast((def ? def.name : key).toUpperCase() + " LV" + res.level);
        }
        persistHangar();
        S.UI.refreshHangar();
    }

    /* ===== Sandbox =====
     * A cheat, deliberately behind a toggle that is off by default and that
     * says what it will do. It goes through the same station transactions
     * where it can, so it cannot manufacture a state the rest of the game
     * does not know how to read.
     */
    function toggleSandbox() {
        var ship = hangarShip();
        ship.hangar.sandbox = !ship.hangar.sandbox;
        S.Audio.ui();
        persistHangar();
        S.UI.refreshHangar();
    }

    function cheat(spec) {
        var ship = hangarShip();
        if (!ship.hangar.sandbox) {
            S.Audio.error();
            S.UI.toast("SANDBOX IS OFF", true);
            return;
        }
        var bits = String(spec || "").split(":");

        if (bits[0] === "grant") {
            var amount = parseInt(bits[2], 10);
            if (!Number.isFinite(amount) || amount <= 0) return;
            ship[bits[1]] = Math.max(0, (ship[bits[1]] || 0) + amount);
            S.Audio.upgrade();
            S.UI.toast("+" + S.fmt(amount) + (bits[1] === "crystals" ? " ◈" : " ⚡"));
        } else if (bits[0] === "unlock") {
            /* Grants the ships and components outright rather than charging
             * for them, which is the whole point of a sandbox. */
            for (var i = 0; i < S.HULLS.length; i++) {
                var id = S.HULLS[i].id;
                if (!ship.hangar.hulls[id]) ship.hangar.hulls[id] = { parts: {} };
            }
            for (var p = 0; p < S.PARTS.length; p++) {
                if (!ship.hangar.parts[S.PARTS[p].key]) ship.hangar.parts[S.PARTS[p].key] = 1;
            }
            S.Audio.upgrade();
            S.UI.toast("EVERYTHING UNLOCKED");
        } else if (bits[0] === "max") {
            for (var m = 0; m < S.MODULES.length; m++) {
                ship.modules[S.MODULES[m].key] = S.MODULE_MAX;
            }
            for (var r = 0; r < S.REFITS.length; r++) {
                ship.refits[S.REFITS[r].key] = S.REFITS[r].max;
            }
            for (var q = 0; q < S.PARTS.length; q++) {
                ship.hangar.parts[S.PARTS[q].key] = S.PART_MAX;
            }
            ship.hangar.sandbox = true;
            S.Audio.upgrade();
            S.UI.toast("EVERYTHING MAXED");
        } else {
            return;
        }

        S.Stations.refreshStats(ship);
        persistHangar();
        S.UI.refreshHangar();
    }

    function setMode(id) {
        var ship = S.World.world.player;
        if (!ship) return;
        if (!S.mode(id)) return;
        ship.mode = id;
        /* Free and always allowed: choosing a mode is a decision you can
         * take back before you commit to it. */
        S.Storage.saveShip(S.Stations.bank(ship));
        S.Audio.ui();
        S.UI.toast(S.mode(id).name + " SELECTED");
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
            /* The cutter has to be silenced with the ship, or it hums on
             * through a dock and a wreck. */
            S.Audio.setMining(false, null);
        }

        S.NPCs.think(dt);
        S.NPCs.update(dt);
        S.Bounty.update(W, S.Sector.get(W.sectorId), player, dt);
        for (i = 0; i < W.ships.length; i++) S.World.moveShip(W.ships[i], dt);

        /* Ticked between movement and the world step so a wave can spawn
         * hostiles that then move and fight on the same frame they arrive. */
        if (player && player.alive && state !== "menu") {
            var modeEvents = S.Modes.update(dt, W, player);
            if (modeEvents) {
                for (var m = 0; m < modeEvents.length; m++) {
                    var me = modeEvents[m];
                    if (me.type === "modeWon") {
                        /* Straight to the crystal balance: crystals are banked
                         * on pickup by design and are the one thing that can
                         * never be lost off a wreck. */
                        player.crystals += me.crystals;
                        S.UI.toast(S.mode(me.mode).name + " CLEARED  +" + me.crystals + " ◈");
                        S.Audio.upgrade();
                        vibrate([30, 40, 90]);
                    } else if (me.type === "modeLost") {
                        S.UI.toast("THE CLOCK BEAT YOU", true);
                        S.Audio.error();
                    }
                }
            }
        }

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
        S.Render.bindMinimap(document.getElementById("minimap"));
        S.Render.setForcedQuality(settings.quality);
        S.UI.init();
        S.Input.init(S.Render.canvas());

        S.UI.on("play", function () { armAudio(); startRun(); });
        S.UI.on("relaunch", function () { armAudio(); relaunch(); });
        S.UI.on("menu", function () { armAudio(); toMenu(); });
        S.UI.on("buy", buyModule);
        S.UI.on("repair", buyRepair);
        S.UI.on("refit", buyRefit);
        S.UI.on("buyCpu", buyCpu);
        S.UI.on("fitCpu", fitCpu);
        S.UI.on("hangar", openHangar);
        S.UI.on("hangarClose", closeHangar);
        S.UI.on("hull", selectHull);
        S.UI.on("part", buyPart);
        S.UI.on("munitions", buyMunitions);
        S.UI.on("turret", turretAction);
        S.UI.on("sandbox", toggleSandbox);
        S.UI.on("cheat", cheat);
        S.UI.on("claim", claimContract);
        S.UI.on("mode", setMode);
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