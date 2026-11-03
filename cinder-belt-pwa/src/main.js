/*
 * Boot, the frame loop and the menu/run/pause/drydock lifecycle.
 *
 * The simulation is fixed-step. Rendering can miss frames; the belt cannot.
 * Player intention is sampled once per frame and handed to world.js, which
 * keeps the simulation free of DOM and input references.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var STEP = 1 / 60;
    var canvas, world = null, mode = "menu";
    var last = 0, acc = 0, booted = false;
    var runRecorded = false, runStarted = 0;
    var profile = null;
    var hintStage = 0;

    function boot() {
        if (booted) return;
        booted = true;

        profile = CB.Storage.loadProfile();
        canvas = document.getElementById("game");

        CB.Render.init(canvas);
        CB.Render.setQuality(profile.settings.quality || "high");
        CB.Audio.setEnabled(profile.settings.sound !== false);
        CB.Audio.init();

        CB.Input.init(canvas, {
            blur: function () {
                if (mode === "run" && world && world.player && !world.player.docked) pauseRun();
            }
        });

        CB.UI.init({
            onLaunch: function () { startRun(); },
            onRetry: function () { startRun(); },
            onMenu: function () { goMenu(); },
            onResume: function () { resumeRun(); },
            onPause: function () { togglePause(); },
            onAbandon: function () { abandonRun(); },
            onUndock: function () { undock(); },
            onUpgrade: function (hullId) { upgrade(hullId); },
            onAbility: function () { castAbility(); },
            onInteract: function () { interact(); },
            onDifficulty: function (d) {
                if (world && world.phase === "running") world.difficulty = d;
            }
        });

        window.addEventListener("resize", function () {
            CB.Render.resize();
            CB.Minimap.resize();
        });

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden" && mode === "run" &&
                world && world.player && !world.player.docked) {
                pauseRun();
            }
        });

        window.addEventListener("keydown", function (e) {
            if (mode === "menu" && (e.key === "Enter" || e.key === " ")) {
                var modalOpen = !document.getElementById("howto").hidden ||
                    !document.getElementById("settings").hidden;
                if (!modalOpen) startRun();
            }
        });

        CB.UI.showMenu();
        CB.UI.refreshSettings();
        try {
            if (window.R2) {
                R2.markPlayed(C.SLUG);
                R2.trackPlaytime(C.SLUG);
                if (R2.installHint) R2.installHint();
            }
        } catch (e) { /* shared arcade is optional */ }

        if ("serviceWorker" in navigator) {
            window.addEventListener("load", function () {
                navigator.serviceWorker.register("./service-worker.js").catch(function () {});
            });
        }

        last = performance.now();
        requestAnimationFrame(frame);
    }

    function startRun() {
        profile = CB.Storage.loadProfile();
        CB.Audio.init();
        CB.Audio.resume();
        CB.Audio.setEnabled(profile.settings.sound !== false);
        if (CB.Render) CB.Render.setQuality(profile.settings.quality || "high");

        var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
        world = CB.World.state;
        CB.World.initMatch(seed, profile.difficulty || "pilot");
        world.onEnd = function (outcome, reason) { finishRun(outcome, reason); };
        world.onDock = function () {
            /* The drydock is a safe screen: stop the simulation while the
             * pilot reads the tree. Undocking restarts the clock. */
            mode = "docked";
            acc = 0;
            if (CB.UI) CB.UI.showHangar(world);
            CB.UI.toast("Drydock open. Bank done. Upgrade or undock.", 3200);
        };
        world.onZone = function (zone) {
            if (CB.UI) CB.UI.setZoneBanner(zone);
        };

        CB.UI.hidePause();
        CB.UI.hideHangar();
        CB.UI.showHUD();
        CB.UI.setZoneBanner(CB.Zones.zoneAt(world.player.x, world.player.y));
        CB.UI.refreshSettings();

        runRecorded = false;
        runStarted = performance.now();
        hintStage = 0;
        mode = "run";
        acc = 0;
        last = performance.now();
        world.phase = "running";

        if (profile.seenTutorial) {
            CB.UI.toast("WASD to fly · mouse aim · hold fire to mine · E docks", 4200);
        } else {
            CB.UI.toast("Hold fire on an asteroid. Fly through the chunks. E docks.", 5600);
            CB.Storage.patchProfile(function (p) { p.seenTutorial = true; });
        }
        try {
            if (window.R2) R2.markPlayed(C.SLUG);
        } catch (e) { /* ignore */ }
    }

    function goMenu() {
        mode = "menu";
        if (world) world.phase = "menu";
        CB.UI.hidePause();
        CB.UI.hideHangar();
        CB.UI.showMenu();
        CB.Audio.setZone("anchorage");
    }

    function abandonRun() {
        if (mode === "menu") return;
        if (!runRecorded && world && world.player) {
            recordRun("quit");
        }
        runRecorded = true;
        goMenu();
    }

    function finishRun(outcome, reason) {
        if (runRecorded) return;
        runRecorded = true;
        mode = "over";
        acc = 0;
        recordRun(outcome, reason);
        CB.UI.hideHangar();
        CB.UI.hidePause();
        CB.UI.showGameOver(world, outcome, reason);
    }

    function recordRun(outcome, reason) {
        var p = world.player;
        var duration = world.time;
        var spec = {
            score: p ? p.score : 0,
            duration: duration,
            outcome: outcome,
            kills: world.stats.kills,
            ore: world.stats.ore,
            bossKills: world.stats.bossKills,
            hull: p ? p.hullId : "sparrow",
            tier: p ? p.tier : 1,
            difficulty: world.difficulty
        };
        CB.Storage.recordRun(spec);
        try {
            if (window.R2) {
                R2.recordEvent(C.SLUG, outcome || "run", 1);
            }
        } catch (e) { /* ignore */ }
        CB.UI.refreshProfile();
        if (outcome === "win") {
            CB.Storage.patchProfile(function (pr) {
                if (pr.unlocks && pr.unlocks.paints.indexOf("corsair-red") < 0) {
                    pr.unlocks.paints.push("corsair-red");
                }
            });
        }
        if (reason === "nexus" && CB.Audio) CB.Audio.win();
    }

    function pauseRun() {
        if (mode !== "run") return;
        mode = "paused";
        CB.UI.showPause();
        acc = 0;
    }

    function resumeRun() {
        if (mode !== "paused") return;
        mode = "run";
        CB.UI.hidePause();
        last = performance.now();
        acc = 0;
    }

    function togglePause() {
        if (mode === "run") {
            if (world.player && world.player.docked) { undock(); return; }
            pauseRun();
        } else if (mode === "paused") {
            resumeRun();
        }
    }

    function undock() {
        if (!world || !world.player || !world.player.docked) return;
        CB.World.undockPlayer();
        CB.UI.hideHangar();
        mode = "run";
        last = performance.now();
        acc = 0;
    }

    function upgrade(hullId) {
        if (!world || !world.player) return;
        var ok = CB.World.upgradePlayer(hullId);
        CB.UI.refreshHangar(world);
        if (ok && CB.Audio) CB.Audio.upgrade();
        if (!ok) CB.UI.toast(CB.World.state.message || "Upgrade unavailable.", 2200);
    }

    function castAbility() {
        if (mode !== "run" || !world || !world.player) return;
        if (world.player.docked || !world.player.alive) return;
        CB.World.useAbility(world.player);
    }

    function interact() {
        if (mode !== "run" || !world || !world.player) return;
        if (world.player.docked) { undock(); return; }
        CB.World.dockPlayer();
    }

    function computeAim() {
        var p = world.player;
        var inputState = CB.Input.state;
        var aimX = p.x + (p.aimX || 1) * 500;
        var aimY = p.y + (p.aimY || 0) * 500;

        if (inputState.usingTouch && (inputState.rightStick.active || inputState.aimDirX || inputState.aimDirY)) {
            aimX = p.x + (inputState.aimDirX || 1) * 800;
            aimY = p.y + (inputState.aimDirY || 0) * 800;
        } else if (!inputState.usingTouch) {
            var cam = world.camera;
            var px = (p.x - cam.x) * cam.zoom + window.innerWidth / 2;
            var py = (p.y - cam.y) * cam.zoom + window.innerHeight / 2;
            aimX = p.x + (inputState.pointerX - px) / cam.zoom;
            aimY = p.y + (inputState.pointerY - py) / cam.zoom;
        }

        /* A gentle aim-assist option: pull toward a legal target, never snap. */
        if (profile.settings.aimAssist) {
            var target = CB.World.nearestEnemy(p, 1300, world.time);
            if (target) {
                var d = CB.World.dist(p.x, p.y, target.x, target.y) || 1;
                var t = d / (p.stats.bulletSpeed || 800);
                var tx = target.x + target.vx * t * 0.7;
                var ty = target.y + target.vy * t * 0.7;
                aimX = aimX * 0.62 + tx * 0.38;
                aimY = aimY * 0.62 + ty * 0.38;
            }
        }
        return { x: aimX, y: aimY };
    }

    function sampleInput() {
        var p = world.player;
        var move = CB.Input.movement();
        var aim = computeAim();
        var inputState = CB.Input.state;
        world.input = {
            moveX: move.x,
            moveY: move.y,
            aimX: aim.x,
            aimY: aim.y,
            fire: !!inputState.fire && !p.docked,
            boost: !!inputState.boost && !p.docked
        };
        p.aimX = aim.x - p.x;
        p.aimY = aim.y - p.y;
        var len = Math.hypot(p.aimX, p.aimY) || 1;
        p.aimX /= len;
        p.aimY /= len;
    }

    function handleActions() {
        if (!world || !world.player) return;
        var p = world.player;

        if (CB.Input.consumePause()) {
            togglePause();
            return;
        }
        if (mode !== "run") return;

        if (CB.Input.consumeAbility() && !p.docked && p.alive) {
            CB.World.useAbility(p);
        }
        if (CB.Input.consumeInteract()) {
            interact();
        }
        var order = CB.Input.consumeOrder();
        if (order) {
            world.playerOrder = order;
            var names = { 1: "MINE", 2: "ATTACK", 3: "DEFEND", 4: "FOLLOW" };
            CB.UI.toast("Wingmen: " + names[order], 1600);
            CB.World.addFeed("Order to wingmen: " + names[order], "#5eead4");
        }
    }

    function hints() {
        if (!world || !world.player) return;
        var p = world.player;
        if (hintStage === 0 && world.time > 6) {
            hintStage = 1;
            CB.UI.toast("Asteroids crack into chunks. Your tractor pulls them in.", 4200);
        } else if (hintStage === 1 && p.cargoUnits >= Math.floor(p.stats.cargo * 0.7)) {
            hintStage = 2;
            CB.UI.toast("Hold nearly full. Return to the Anchorage and press E.", 4200);
        } else if (hintStage === 2 && p.credits >= CB.Shipyard.nextCost(p) && p.tier === 1) {
            hintStage = 3;
            CB.UI.toast("You can afford a doctrine. Dock and pick a hull.", 4200);
        }
    }

    function frame(ts) {
        requestAnimationFrame(frame);
        var dt = (ts - last) / 1000;
        last = ts;
        if (dt > 0.1) dt = 0.1;
        if (dt < 0) dt = 0;

        if (mode === "run" && world && world.player) {
            handleActions();
            if (mode === "run") {
                sampleInput();
                acc += dt;
                var guard = 0;
                while (acc >= STEP && guard < 6) {
                    CB.World.update(STEP);
                    acc -= STEP;
                    guard++;
                    if (world.phase !== "running") break;
                }
                if (world.phase !== "running") {
                    mode = "over";
                } else {
                    hints();
                    CB.UI.update(world, dt);
                }
            }
        } else if (mode === "paused") {
            /* A pause still drains the pause key. */
            if (CB.Input.consumePause()) resumeRun();
        } else if (mode === "docked") {
            /* Drydock is safe: the belt is frozen until undock. */
            if (CB.Input.consumePause()) undock();
            else if (CB.Input.consumeInteract()) undock();
        } else if (mode === "over") {
            CB.UI.update(world, dt);
        }

        if (world && mode !== "menu") {
            CB.Render.draw(dt, world);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    CB.Main = { startRun: startRun, goMenu: goMenu, boot: boot };
})(window.CB = window.CB || {});
