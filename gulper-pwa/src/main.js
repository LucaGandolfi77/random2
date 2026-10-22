/*
 * GULPER - boot, the state machine and the loop.
 *
 * One loop drives everything. The world is stepped at a fixed rate so
 * the physics never depend on the frame rate, and the renderer draws
 * whatever the world currently is - including the attract scene behind
 * the menus, which is a real level with the player standing still in it.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var canvas = null;
    var world = null;
    var mode = "menu";           /* menu | intro | playing | paused | results */
    var pendingLevel = null;
    var pendingSeed = undefined;
    var pendingAdaptations = null;
    var lastLevelId = null;
    /* The shrine run currently on the table, kept as whole level
     * objects because S.Levels.get cannot see synthetic levels. */
    var lastModeLevel = null;

    var lastT = 0;
    var acc = 0;

    var perf = { frames: 0, total: 0, tier: "high", locked: false, samples: [] };

    /* ===== boot ===== */
    function boot() {
        canvas = document.getElementById("game-canvas");
        if (!canvas) return;

        S.Render.init(canvas);
        applySettings();

        S.Input.bind({
            onAttack: function () { },
            onSwallow: function () { },
            onSwap: function () { },
            onPause: function () {
                if (mode === "playing") pause();
                else if (mode === "paused") resume();
            }
        });

        S.UI.init({
            onPlay: function () { S.UI.show("map"); },
            onContinue: function () {
                var id = S.Levels.firstUncleared();
                if (id) selectLevel(id);
            },
            onDaily: startDaily,
            onEndless: startEndless,
            onRush: function () { startRushStage(0); },
            onGenome: function () { S.UI.show("genome"); },
            onCodex: function () { S.UI.show("codex"); },
            onStats: function () { S.UI.show("stats"); },
            onSettings: function () { S.UI.show("settings"); },
            onLevelSelect: selectLevel,
            onAdaptationPick: pickAdaptation,
            onIntroGo: function () { if (pendingLevel) startLevel(pendingLevel, pendingSeed, null); },
            onResume: resume,
            onRestart: replay,
            onQuit: function () { mode = "menu"; enterMenu(); },
            onNext: function () {
                /* The shrines walk home to the title menu; the
                 * procession alone marches to its next titan. */
                if (world && world.modeTag) {
                    if (world.status === "won" && world.modeTag === "rush") {
                        var i = S.Modes.stageOf(world.level);
                        if (i >= 0 && i + 1 < S.Modes.stageCount) {
                            startRushStage(i + 1);
                            return;
                        }
                    }
                    enterMenu();
                    return;
                }
                var next = S.Levels.next(lastLevelId);
                if (next) selectLevel(next.id);
                else S.UI.show("map");
            },
            onRetry: replay,
            onMap: function () { S.UI.show("map"); mode = "menu"; },
            onResetSave: function () { applySettings(); },
            onSetting: function (key, value, prop) {
                applySettings();
                if (prop === "pixel") {
                    var size = value === "auto" ? null : parseInt(value, 10);
                    S.Render.resize(size);
                }
                if (key === "quality" && value !== "auto") {
                    perf.locked = true;
                    S.Render.setQuality(value);
                }
                if (key === "quality" && value === "auto") {
                    perf.locked = false;
                }
            },
            onScreen: function (name) {
                if (name === "none") {
                    S.Input.setVisible(true);
                } else {
                    S.Input.setVisible(false);
                }
            }
        });

        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", function () {
            setTimeout(onResize, 120);
        });
        document.addEventListener("visibilitychange", function () {
            if (document.hidden && mode === "playing") pause();
        });

        /* The audio context needs a gesture on mobile. */
        var unlock = function () {
            S.Audio.unlock();
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);

        onResize();
        enterMenu();

        lastT = performance.now();
        requestAnimationFrame(loop);
    }

    function onResize() {
        var save = S.Storage.data();
        var size = save.settings.pixelSize;
        var forced = (size && size !== "auto") ? parseInt(size, 10) : null;
        S.Render.resize(forced);
    }

    function applySettings() {
        var save = S.Storage.data();
        var s = save.settings;
        S.Audio.setSettings({ sound: s.sound !== false, music: s.music !== false });
        if (s.quality && s.quality !== "auto") {
            perf.locked = true;
            S.Render.setQuality(s.quality);
        } else {
            perf.locked = false;
            S.Render.setQuality("high");
        }
        /* Accessibility. */
        document.body.classList.toggle("reduced-motion", !!s.reducedMotion);
        document.body.classList.toggle("high-contrast", !!s.highContrast);
        document.body.classList.toggle("text-large", s.textSize === "large");
    }

    /* ===== the attract scene =====
     * The menus sit over a real level with real people wandering in it.
     * It costs nothing to keep, because the simulation is already
     * running, and it means the first thing a player sees is the game. */
    function enterMenu() {
        mode = "menu";
        world = S.World.create("docks-1", { seed: 20261022 });
        if (world) {
            world.attract = true;
            world.alarmMult = 0;
            world.player.x = world.arena.x + world.arena.w * 0.5;
            world.player.y = world.arena.y + world.arena.h * 0.55;
        }
        S.Audio.music("docks");
        S.UI.show("title");
    }

    /* ===== the flow ===== */
    function selectLevel(id) {
        var level = S.Levels.get(id);
        if (!level) return;
        pendingLevel = level;
        pendingSeed = undefined;
        pendingAdaptations = S.Body.offerAdaptations(3, S.Rng(Date.now() & 0xffff));
        S.UI.showIntro(level, pendingAdaptations);
        mode = "intro";
    }

    function pickAdaptation(id) {
        /* Choosing an adaptation unlocks it for good. The first level
         * therefore teaches the mechanic, and the pool grows from
         * there. */
        S.Storage.unlockAdaptation(id);
        S.Storage.save();
        if (pendingLevel) startLevel(pendingLevel, pendingSeed, id);
    }

    function startDaily() {
        var daily = S.Modes.dailyLevel();
        pendingLevel = daily.level;
        pendingSeed = daily.seed;
        pendingAdaptations = S.Body.offerAdaptations(3, S.Rng(daily.seed));
        S.UI.showIntro(pendingLevel, pendingAdaptations);
        mode = "intro";
    }

    function startEndless() {
        /* ENDLESS NIGHT is the feast with no clock: eat until the tide
         * takes you, and the score is the biggest thing you became. */
        pendingLevel = S.Modes.feastLevel();
        pendingSeed = pendingLevel.seed;
        pendingAdaptations = S.Body.offerAdaptations(3, S.Rng(Date.now() & 0xffff));
        S.UI.showIntro(pendingLevel, pendingAdaptations);
        mode = "intro";
    }

    /* THE PROCESSION is a run of six titans. A new run starts at the
     * first one; a loss ends the run; the best distance is kept. */
    function startRushStage(i) {
        pendingLevel = S.Modes.stageLevel(i);
        pendingSeed = pendingLevel.seed;
        pendingAdaptations = S.Body.offerAdaptations(3, S.Rng(pendingLevel.seed));
        S.UI.showIntro(pendingLevel, pendingAdaptations);
        mode = "intro";
    }

    function startLevel(level, seed, adaptId) {
        if (!level) return;
        var save = S.Storage.data();
        var adapt = adaptId ? [adaptId] : [];

        world = S.World.create(level.id, {
            seed: seed,
            /* Synthetic levels (the shrines) are passed whole; a campaign
             * level being passed is harmless and identical to the
             * lookup. */
            level: level,
            /* The shrines hand down their own biomass; campaign levels
             * use the save's carry. */
            carry: S.Modes.levelCarry(level),
            adaptations: adapt,
            weapons: save.weapons,
            slots: S.Body.loadout(save),
            difficulty: "standard",
            showDamage: save.settings.showDamage !== false
        });
        if (!world) return;

        world.aimAssist = save.settings.aimAssist !== false;
        world.onSwallow = function (e) { S.World.onSwallow(world, e); };
        world.onStage = function (stage) {
            S.UI.toast("EVOLVED — " + stage.name.toUpperCase());
            S.Render.shake(4);
        };
        world.onLockdown = function () {
            S.UI.toast("LOCKDOWN");
            S.Render.shake(5);
        };

        lastLevelId = level.id;
        lastModeLevel = level.modeTag ? level : null;
        S.Storage.data().lastLevel = level.id;
        S.Storage.save();
        /* A run started. Counted here, so a run that ends badly is
         * still a run. */
        S.Results.begin(world);

        mode = "playing";
        acc = 0;
        S.Audio.music(world.biome.id);
        S.UI.show("none");
    }

    function pause() {
        if (mode !== "playing") return;
        mode = "paused";
        S.UI.show("pause");
    }

    function resume() {
        if (mode !== "paused") return;
        mode = "playing";
        S.UI.show("none");
        lastT = performance.now();
    }

    function endLevel() {
        mode = "results";

        /* The books are settled by S.Results, which the test suite can
         * call: main.js only shows what was decided. */
        var out = S.Results.settle(world);

        if (out.mode) {
            /* The shrines settle their own accounts: no campaign stars,
             * no shards, and never a touch of save.carry, the
             * campaign's spine. */
            S.UI.showResults(world, 0, out);
            S.UI.refreshTitle();
            return;
        }

        S.UI.showResults(world, out.stars, out);
        S.UI.buildMap();
        S.UI.refreshTitle();
    }

    /* Replaying a shrine restarts that shrine: the feast takes a fresh
     * tide, the daily keeps its level, a procession run starts again
     * from the first titan. The campaign replays its own level. */
    function replay() {
        if (lastModeLevel && lastModeLevel.modeTag === "rush") {
            startRushStage(0);
            return;
        }
        if (lastModeLevel && lastModeLevel.modeTag === "feast") {
            lastModeLevel = S.Modes.feastLevel();
        }
        var level = lastModeLevel || (lastLevelId && S.Levels.get(lastLevelId));
        if (!level) return;
        pendingLevel = level;
        pendingSeed = level.modeTag ? level.seed : undefined;
        startLevel(level, pendingSeed, null);
    }

    /* ===== the loop ===== */
    function loop(t) {
        requestAnimationFrame(loop);
        var dt = (t - lastT) / 1000;
        lastT = t;
        if (!isFinite(dt) || dt < 0) dt = 0;
        if (dt > C.maxDt) dt = C.maxDt;

        if (world) {
            if (mode === "playing") {
                S.Input.read(world);
                acc += dt;
                var steps = 0;
                while (acc >= C.fixedStep && steps < C.maxCatchupSteps) {
                    S.World.update(world, C.fixedStep);
                    acc -= C.fixedStep;
                    steps++;
                }
                if (steps >= C.maxCatchupSteps) acc = 0;
                if (world.status !== "playing") endLevel();
            } else if (mode === "menu" || mode === "intro" || mode === "results") {
                /* The attract scene keeps moving behind the menus. */
                world.input.mx = 0;
                world.input.my = 0;
                world.input.attack = false;
                world.input.attackHeld = false;
                world.input.swallow = false;
                world.input.swap = false;
                world.input.frenzy = false;
                S.World.update(world, dt);
                world.alarm = 0;
            }

            S.Render.draw(world, dt);
            if (mode === "playing") S.UI.updateHud(world);
        }

        measure(dt);
    }

    /* Automatic quality.
     *
     * The user should not have to think about this. A budget phone gets
     * a simpler-looking game, not a broken one, and a tier that could
     * only be all-or-nothing would have forced exactly that choice. */    function measure(dt) {
        if (perf.locked) return;
        perf.frames++;
        perf.total += dt;
        if (perf.frames < C.perfSampleFrames) return;

        var avg = (perf.total / perf.frames) * 1000;
        perf.frames = 0;
        perf.total = 0;

        if (avg > C.perfDowngradeMs && perf.tier !== "low") {
            perf.tier = perf.tier === "high" ? "med" : "low";
            S.Render.setQuality(perf.tier);
        } else if (avg < C.perfUpgradeMs && perf.tier !== "high") {
            perf.tier = perf.tier === "low" ? "med" : "high";
            S.Render.setQuality(perf.tier);
        }
    }

    /* The chosen adaptation is handed over through a global because the
     * intro screen and the level start are two separate events and a
     * closure would have meant threading it through both. */
    window.__gulperPicked = null;

    S.Main = {
        boot: boot,
        startLevel: startLevel,
        selectLevel: selectLevel,
        world: function () { return world; },
        mode: function () { return mode; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(window.GU = window.GU || {});
