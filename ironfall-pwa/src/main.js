/*
 * IRONFALL - boot, the frame loop, and the match lifecycle.
 *
 * The loop is a fixed-step accumulator with a clamped catch-up. Fixed step
 * because the simulation must be reproducible: a bot that reacts 12ms later
 * because the phone drew a frame long is not the same opponent as one that
 * does not, and a balance pass run on a variable step measures noise. Clamped
 * because a backgrounded tab must not resolve ninety seconds of simulation
 * in one frame and teleport the entire wave into the enemy base.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var canvas, minimapCanvas;
    var world = null;
    var running = false;
    var paused = false;
    var last = 0;
    var acc = 0;
    var revealTimer = 0;

    var session = {
        records: null,
        settings: null,
        runes: null,
        champion: null,
        difficulty: "guardsman",
        seed: 0
    };

    /* ===== Boot ===== */

    /* Idempotent. main.js boots itself at the bottom of this file AND can be
     * booted explicitly; without this guard a second call silently doubles
     * every event listener, so one click on a button runs its handler twice -
     * which reads as a button that does not work rather than as a boot that
     * ran twice. */
    var booted = false;

    function boot() {
        if (booted) return;
        booted = true;
        canvas = document.getElementById("game-canvas");
        minimapCanvas = document.getElementById("minimap");

        session.records = S.Storage.loadRecords();
        session.settings = S.Storage.loadSettings();
        session.runes = S.Storage.loadRunes();

        S.Render.init(canvas);
        S.Minimap.init(minimapCanvas);
        S.Audio.setEnabled(session.settings.sound);
        S.Audio.init();

        S.UI.init({
            onPlay: startMatch,
            onMenu: toMenu,
            onQuit: quitToMenu,
            onPause: function (p) { paused = p; },
            onDifficulty: function (d) {
                session.difficulty = d;
                S.Storage._write("ironfall.v1.settings", Object.assign({}, session.settings, { difficulty: d }));
            },
            onSetting: onSetting,
            onBuy: buyItem,
            onRecall: requestRecall,
            onShop: toggleShopRequest
        });

        S.UI.syncSettings(session.settings);
        S.UI.setDifficultyUI(session.difficulty);

        S.Input.bind({
            toWorld: function (sx, sy) { return S.Render.toWorld(sx, sy); },
            minimapToWorld: function (lx, ly) { return S.Minimap.hitToWorld(lx, ly); },
            haptic: function (p) { if (session.settings.haptics) S.Audio.haptic(p); }
        });
        S.Input.init(canvas);

        /* Audio needs a gesture. Both listeners, because a player who taps
         * the screen without touching a key should not get a silent match. */
        window.addEventListener("pointerdown", armAudio, { once: true });
        window.addEventListener("keydown", armAudio, { once: true });

        /* Resize. Debounced through the same handler because an address bar
         * collapsing fires four resize events on iOS and reallocating four
         * canvases is four chances to flash black. */
        var resizePending = false;
        window.addEventListener("resize", function () {
            if (resizePending) return;
            resizePending = true;
            requestAnimationFrame(function () {
                resizePending = false;
                S.Render.resize();
                S.Minimap.resize();
            });
        });

        /* Mobile browsers kill backgrounded tabs without warning. Everything
         * that matters is either already persisted or reconstructible from
         * the seed. */
        window.addEventListener("pagehide", persist);
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) { persist(); paused = true; }
            else { paused = false; S.Audio.resume(); }
        });

        installServiceWorker();
        hubIntegration();

        S.UI.buildChampSelect(session.records, function (id) { session.champion = id; });
        S.UI.showScreen("menu");

        last = performance.now();
        requestAnimationFrame(frame);
    }

    function armAudio() {
        S.Audio.init();
        S.Audio.resume();
    }

    function persist() {
        if (!session.records) return;
        S.Storage.saveRecords(session.records);
        S.Storage.saveDoctrine(session.records);
        S.Storage.publishHighScore(session.records);
    }

    /* ===== Hub integration =====
     * The arcade's shared library tracks playtime and run statistics. Calling
     * it costs nothing and is what makes IRONFALL show up on the hub's
     * dashboard alongside every other game. */
    function hubIntegration() {
        /* The install prompt's own buttons are wired UNCONDITIONALLY.
         *
         * They used to live behind `if (window.R2)`, which meant that
         * whenever the shared arcade library was absent - the game opened
         * standalone, a test, a mirrored copy - the prompt could appear with
         * two dead buttons on it and no way to dismiss it. The hub
         * integration is optional; dismissing a dialog is not.
         */
        var inst = byId("install-prompt");
        var btn = byId("btn-install");
        var later = byId("btn-install-later");
        var deferred = null;

        if (btn) {
            btn.addEventListener("click", function () {
                if (!deferred) {
                    hideInstall();
                    return;
                }
                deferred.prompt();
                if (deferred.userChoice && deferred.userChoice.then) {
                    deferred.userChoice.then(function () {
                        hideInstall();
                        deferred = null;
                    }).catch(function () { /* the user dismissed it */ });
                }
            });
        }
        if (later) later.addEventListener("click", hideInstall);

        window.addEventListener("beforeinstallprompt", function (e) {
            e.preventDefault();
            deferred = e;
            if (inst) inst.classList.remove("hidden");
        });
        window.addEventListener("appinstalled", hideInstall);

        /* The arcade's shared library tracks playtime and run statistics.
         * Calling it costs nothing and is what makes IRONFALL show up on
         * the hub's dashboard alongside every other game. Guarded, because
         * the game is perfectly playable without the hub. */
        if (!window.R2) return;
        try {
            R2.markPlayed("ironfall-pwa/");
            R2.trackPlaytime("ironfall-pwa/");
            R2.installHint();
        } catch (e) { /* the hub may not be present */ }
    }

    function hideInstall() {
        var inst = byId("install-prompt");
        if (inst) inst.classList.add("hidden");
    }

    function byId(id) { return document.getElementById(id); }

    /* ===== Match lifecycle =====
     *
     * Draft, spawn, fight, score. The draft is a weighted pick rather than a
     * random one, using the composition weights in champions.js: one of each
     * role per team, no more than two of a faction. A random three would
     * produce three bruisers often enough to be a real problem. */
    function startMatch() {
        session.records = S.Storage.loadRecords();
        session.runes = S.Storage.loadRunes();

        var pick = session.champion || S.Champions.ids()[0];
        S.UI.buildChampSelect(session.records, function (id) { session.champion = id; });

        /* A fresh seed every match. Replaying the same wave composition is
         * useful in a test and tiresome in a game. */
        var seed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;

        world = S.World.createWorld({ seed: seed, difficulty: session.difficulty });
        S.AI.resetStream(seed ^ 0x5EED);

        /* Six champions: the player plus two allies, three enemies. */
        var teams = { 0: [], 1: [] };
        var taken = [];
        teams[0].push(pick);
        taken.push(pick);

        var botIdx = 1;
        for (var i = 0; i < 5; i++) {
            var team = i < 2 ? 0 : 1;
            var comp = {};
            for (var k = 0; k < teams[team].length; k++) {
                var c = S.Champions.get(teams[team][k]);
                comp[c.role] = (comp[c.role] || 0) + 1;
            }
            var chosen = S.Champions.draftPick(world.seed, taken, comp);
            if (!chosen) break;
            taken.push(chosen.id);
            teams[team].push(chosen.id);
        }

        var me = null;
        var teamIdx;
        for (teamIdx = 0; teamIdx < 2; teamIdx++) {
            for (i = 0; i < teams[teamIdx].length; i++) {
                var id = teams[teamIdx][i];
                var base = S.Map.bases[teamIdx];
                var isPlayer = (teamIdx === 0 && i === 0);
                var lane = S.AI.laneForRole[(S.Champions.get(id) || {}).role] || "mid";
                var u = S.World.makeChampion(world, {
                    champId: id,
                    team: teamIdx,
                    lane: lane,
                    isPlayer: isPlayer,
                    runes: isPlayer ? session.runes : randomRunes(world.seed, teamIdx),
                    doctrineTier: isPlayer
                        ? S.Storage.doctrineTier(session.records, id) : 0,
                    x: base.spawn.x + (Math.random() - 0.5) * 120,
                    y: base.spawn.y + (Math.random() - 0.5) * 120
                });
                if (isPlayer) me = u;
                else S.AI.makeBrain(world, u, session.difficulty);
            }
        }

        S.AI.assignLanes(world.champs);
        world.player = me;
        world.previews = null;
        /* The camera starts on the player, and the renderer's team is set
         * once rather than per frame - a per-frame comparison of two integers
         * would be free, but making it a setter means there is exactly one
         * place the vision side can be wrong. */
        S.Render.setTeam(me.team);
        S.Render.panTo(me.x, me.y);
        S.UI.toggleShop(false);
        S.UI.toggleScoreboard(false);

        running = true;
        paused = false;
        S.UI.showScreen(null);
        S.Audio.setDrone(false);
        acc = 0;
    }

    /* Bots get a random valid loadout. Random but resolved, so a bot never
     * ends up with a null row and a passive that silently does nothing. */
    function randomRunes(rng, team) {
        var out = {};
        for (var r = 0; r < 3; r++) {
            var row = S.Runes.byRow(r);
            out["row" + r] = row[Math.floor(rng() * row.length)].id;
        }
        return out;
    }

    function quitToMenu() {
        running = false;
        world = null;
        S.UI.showScreen("menu");
    }

    function toMenu() { quitToMenu(); }

    /* ===== Player control =====
     * Applied between simulation steps, reading the edge flags once. The
     * player's champion gets the same movement function as a bot's - it is
     * told where to go rather than choosing, which is the only difference
     * between a human and a bot in this engine. */
    function applyPlayerInput(w, dt) {
        var p = w.player;
        if (!p) return;

        if (!p.alive) return;

        var inp = S.Input.read();

        /* Movement. */
        if (inp.mag > 0.04) {
            p.moveTo = { x: p.x + inp.mx * 600, y: p.y + inp.my * 600 };
            p.facing = Math.atan2(inp.my, inp.mx);
        } else {
            p.moveTo = null;
        }

        /* Aim. The drag point is kept as a world coordinate rather than
         * re-derived from the screen every frame, so a camera pan does not
         * slide the aim point out from under a stationary finger. */
        if (inp.aimActive) {
            p.aimX = inp.aimX - p.x;
            p.aimY = inp.aimY - p.y;
        }
        var alen = Math.sqrt(p.aimX * p.aimX + p.aimY * p.aimY);
        if (alen < 1e-4) { p.aimX = 0; p.aimY = 1; alen = 1; }
        p.aimX /= alen; p.aimY /= alen;

        /* Ping. */
        if (inp.ping && S.Minimap.addPing(w, inp.ping.x, inp.ping.y, "onMyWay")) {
            S.Audio.ping("onMyWay");
            w.aimX = inp.ping.x; w.aimY = inp.ping.y;
        }

        /* Auto-attack: whatever the target system is holding, or the nearest
         * enemy in auto range. Holding the attack button down should just
         * work, because a MOBA where you must tap to attack is not playable
         * with one thumb. */
        p.autoTarget = nearestAutoTarget(p);
        if (p.autoTarget) p.target = p.autoTarget;

        /* Abilities. A held button casts the moment it is affordable; an edge
         * press casts once. Both, because the edge is what makes a tap feel
         * immediate and the hold is what makes a fight possible. */
        var preview = null;
        for (var i = 0; i < p.abilities.length; i++) {
            var ab = p.abilities[i];
            if (ab.rank < 0) continue;

            /* What this button would do, right now, on this map.
             *
             * The renderer has had a drawRange() since the first version and
             * nothing has ever called it, so the "Show ability ranges"
             * setting did nothing at all. A MOBA where you cannot see how far
             * a skill reaches before committing to it is a MOBA where you
             * learn ranges by dying, which is the slowest possible way to
             * learn anything. */
            if (inp.abilities[i] && session.settings.showRanges) {
                preview = preview || [];
                preview.push(abilityPreview(p, i));
            }

            if (!inp.edges[i] && !inp.abilities[i]) continue;
            castPlayerAbility(w, p, i);
        }
        w.previews = preview;

        /* Recall. */
        if (inp.recall && !w.player.recalling && !w.player.inCombat) {
            w.player.recalling = 0.0001;
            S.Audio.recall();
        }
    }

    /* Describes one button for the renderer: which ability, where it points,
     * and how far it reaches. Pure - it reads the ability and the champion and
     * returns numbers, so the renderer's job is only to draw them. */
    function abilityPreview(p, i) {
        var ab = p.abilities[i];
        var d = ab.def;
        var reach = d.range || S.Combat.stat(p, "range");
        var shape = "range";
        var rad = 0;
        var tx = p.x, ty = p.y;

        if (d.arch === "cone" && d.angle) {
            shape = "cone";
            rad = (d.angle / 2);
        } else if (d.arch === "beam" || d.arch === "blast" || d.arch === "slam" ||
            d.arch === "field") {
            shape = d.arch === "slam" ? "ring" : "circle";
            rad = d.radius || d.width || 0;
            if (d.arch === "field" && d.follow) shape = "range";
        } else if (d.targeting === "point" || d.targeting === "direction") {
            shape = (d.arch === "dash" || d.arch === "blink") ? "range" : "circle";
            rad = d.radius || 0;
            tx = p.x + p.aimX * reach;
            ty = p.y + p.aimY * reach;
        }
        return {
            slot: i,
            key: ab.key,
            arch: d.arch,
            reach: reach,
            shape: shape,
            rad: rad,
            tx: tx, ty: ty,
            angle: p.aimX !== undefined ? Math.atan2(p.aimY, p.aimX) : 0,
            affordable: ab.cdLeft <= 0 && p.mana >= ab.cost
        };
    }

    function castPlayerAbility(w, p, i) {
        var ab = p.abilities[i];
        var d = ab.def;
        var arg;
        switch (d.targeting) {
            case "none":
                arg = { x: p.x, y: p.y };
                break;
            case "unit":
                var t = p.target;
                arg = t && t.team !== p.team ? t : nearestEnemy(p, d.range || 600);
                break;
            default:
                /* Point and direction both cast toward the aim marker. For
                 * direction-targeted abilities that is the aim direction;
                 * for point-targeted ones it is the point at maximum range,
                 * which is where the player's finger was anyway. */
                arg = {
                    x: p.x + p.aimX * (d.range || 600),
                    y: p.y + p.aimY * (d.range || 600)
                };
                break;
        }
        if (!arg) { S.Audio.denied(); return; }
        if (S.Abilities.cast(w, p, i, arg)) {
            S.Audio.abilityCast(d.dmgType === "magic");
            if (session.settings.haptics) S.Audio.haptic(18);
        } else if (p.mana < ab.cost) {
            S.Audio.denied();
        }
    }

    /* Priorities: whatever I am already attacking, then an enemy champion in
     * auto range, then a minion, then a structure. Structures last because
     * auto-attacking one while a champion is standing next to you is the
     * single most common way a player loses a fight they were winning. */
    function nearestAutoTarget(p) {
        var range = S.Combat.stat(p, "range") + 140;
        var best = null, bestScore = -Infinity;
        for (var i = 0; i < world.units.length; i++) {
            var e = world.units[i];
            if (!e.alive || e.team === p.team) continue;
            if (!e.visible) continue;
            var d2 = S.dist2(p.x, p.y, e.x, e.y);
            if (d2 > range * range) continue;
            var score = 1 / Math.sqrt(d2);
            if (e.kind === "champ") score += 40;
            else if (e.kind === "summon") score += 20;
            else if (e.kind === "minion") score += 6;
            else if (e.banner) score += 8;
            if (score > bestScore) { bestScore = score; best = e; }
        }
        if (best) return best;
        /* Nothing in auto range: allow a structure once, which is what lets
         * a player hold "attack" while pushing without it doing something
         * surprising at the exact moment a champion walks into the wave. */
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive || s.team === p.team) continue;
            if (s.kind !== "tower" && s.kind !== "core") continue;
            var sd = S.dist2(p.x, p.y, s.x, s.y);
            if (sd < (S.Combat.stat(p, "range") + s.radius + 90) * (S.Combat.stat(p, "range") + s.radius + 90)) {
                return s;
            }
        }
        return null;
    }

    function nearestEnemy(p, range) {
        var best = null, bestD = range * range;
        for (var i = 0; i < world.units.length; i++) {
            var e = world.units[i];
            if (!e.alive || e.team === p.team || !e.visible) continue;
            var d = S.dist2(p.x, p.y, e.x, e.y);
            if (d < bestD) { bestD = d; best = e; }
        }
        return best;
    }

    function requestRecall() {
        if (!world || !world.player || !world.player.alive) return;
        if (world.player.inCombat) { S.Audio.denied(); return; }
        world.player.recalling = 0.0001;
    }

    function toggleShopRequest() {
        if (!world || !world.player) return;
        var p = world.player;
        /* The shop refuses out of base and in combat, and says so rather than
         * silently doing nothing. A button that ignores you teaches you
         * nothing; a button that tells you why teaches you the map. */
        if (!p.atBase) { flashMessage("THE FORGE IS AT YOUR BASTION"); S.Audio.denied(); return; }
        if (p.inCombat) { flashMessage("YOU ARE IN COMBAT"); S.Audio.denied(); return; }
        S.UI.toggleShop(!S.UI.isShopOpen());
        if (S.UI.isShopOpen()) S.Audio.buy();
    }

    function buyItem(id) {
        if (!world || !world.player) return;
        var before = world.player.items.length;
        if (S.World.buyItem(world, world.player, id)) {
            S.Audio.buy();
            if (session.settings.haptics) S.Audio.haptic(14);
        } else {
            S.Audio.denied();
            flashMessage("NOT ENOUGH REQUISITION");
        }
    }

    var messageUntil = 0;
    function flashMessage(text) {
        var n = byId("flash-message");
        if (!n) return;
        n.textContent = text;
        n.classList.add("is-on");
        messageUntil = performance.now() + 1800;
    }

    function onSetting(key, value) {
        session.settings[key] = value;
        S.Storage.saveSettings(session.settings);
        if (key === "sound") S.Audio.setEnabled(value);
        if (key === "quality") S.Render.setQuality(value);
    }

    /* ===== The frame ===== */
    function frame(now) {
        requestAnimationFrame(frame);

        var frameMs = now - last;
        var dt = (now - last) / 1000;
        last = now;
        if (dt <= 0) return;

        if (messageUntil && now > messageUntil) {
            var n = byId("flash-message");
            if (n) n.classList.remove("is-on");
            messageUntil = 0;
        }

        if (!running || !world || paused) {
            /* Keep painting behind the menu. A black rectangle behind a title
             * screen reads as a loading failure - and it used to be exactly
             * that, because this branch returned before drawing anything. */
            if (!paused || !world) S.Render.drawAmbient(dt, now / 1000);
            return;
        }

        /* Clamp before accumulating. A tab that was hidden for a minute
         * produces a dt of sixty seconds, and sixty seconds of catch-up
         * would resolve every wave in the game in a single frame. */
        if (dt > C.maxDt) dt = C.maxDt;
        acc += dt;

        var steps = 0;
        while (acc >= C.fixedStep && steps < C.maxCatchupSteps) {
            applyPlayerInput(world, C.fixedStep);
            S.World.step(world, C.fixedStep);
            drainEvents();
            acc -= C.fixedStep;
            steps++;
            if (world.over) break;
        }
        /* Anything left over beyond the catch-up cap is dropped rather than
         * banked. Banking it would mean the next frame starts already behind,
         * which turns one hitch into a spiral. */
        if (steps >= C.maxCatchupSteps) acc = 0;

        /* Camera follows the player, or their death point while dead - which
         * is what lets a player watch the fight that killed them instead of
         * staring at a wall. */
        var p = world.player;
        if (p) {
            S.Render.follow(p.alive ? p.x : p.x, p.alive ? p.y : p.y, dt);
        }

        S.Render.samplePerf(frameMs);
        S.Render.draw(world, dt);
        S.Minimap.draw(world);
        S.UI.updateHud(world, dt);

        revealTimer += dt;
        if (revealTimer > 1) { revealTimer = 0; S.Minimap.updateReveal(world); }

        if (world.over) finishMatch();
    }

    /* Combat events are drained once per step and pushed into the UI rather
     * than having the UI poll. A poll cannot know what happened during the
     * simulation, and would have to re-derive it. */
    function drainEvents() {
        var evts = S.Combat.drainEvents();
        for (var i = 0; i < evts.length; i++) {
            var e = evts[i];
            if (e.type === "kill" && e.killer && e.victim) {
                var mine = e.killer.isPlayer;
                S.UI.pushKill({
                    aName: e.killer.name, aTeam: e.killer.team,
                    bName: e.victim.name, bTeam: e.victim.team,
                    mine: mine || e.victim.isPlayer
                });
                if (mine) { S.Audio.kill(); if (session.settings.haptics) S.Audio.haptic(30); }
            }
            if (e.type === "death" && e.victim && e.victim.isPlayer) {
                S.Audio.death();
                if (session.settings.haptics) S.Audio.haptic([20, 40, 20]);
            }
            if (e.type === "gone" && e.victim && e.victim.kind === "minion") {
                S.Audio.hit(e.victim.team, !!e.victim.banner);
            }
        }

        /* Tower state, for the HUD pips. */
        var towers = [];
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (s.kind === "tower") towers.push(s.alive);
        }
        world.towerState = towers;

        /* The Reliquary drone, gated on the objective being up. */
        var rel = null;
        for (i = 0; i < world.structures.length; i++) {
            if (world.structures[i].kind === "reliquary") { rel = world.structures[i]; break; }
        }
        S.Audio.setDrone(!!(rel && rel.spawned && rel.alive));
    }

    /* ===== End of match ===== */
    function finishMatch() {
        if (!world || world.finished) return;
        world.finished = true;
        running = false;
        S.Audio.setDrone(false);

        var p = world.player;
        var win = world.winner === p.team;
        var sc = S.UI.score(world, p);
        var result = {
            win: win,
            name: p.name,
            faction: p.faction,
            champion: p.champId,
            kills: p.kills, deaths: p.deaths, assists: p.assists,
            cs: p.cs, gold: Math.round(p.gold),
            duration: world.time,
            score: sc,
            best: session.records.highScore
        };

        session.records = S.Storage.recordMatch(result);
        S.Storage.saveDoctrine(session.records);
        S.Storage.publishHighScore(session.records);

        /* Feed the arcade's shared run log, which is what the hub dashboard
         * reads. Guarded because R2 is absent when the game is opened
         * standalone. */
        if (window.R2 && typeof R2.stats === "object") {
            try {
                R2.stats.run({
                    slug: "ironfall-pwa/",
                    score: sc,
                    durMs: Math.round(world.time * 1000),
                    outcome: win ? "win" : "loss",
                    meta: { champion: p.champId, kills: p.kills, cs: p.cs }
                });
            } catch (e) { /* the hub may not be present */ }
        }

        /* Refresh the champion select with the record just written. */
        S.UI.buildChampSelect(session.records, function (id) { session.champion = id; });
        S.UI.showOutcome(result);
    }

    /* ===== Service worker ===== */
    /* Registered for real. Several games in this repository ship a worker
     * and then never call navigator.serviceWorker.register, which makes the
     * offline claim in their README false. This one is registered.
     *
     * Registration happens immediately when the document is already loaded,
     * rather than being parked on a `load` listener. Parking on `load` is a
     * footgun: main.js boots on DOMContentLoaded, and by the time it runs
     * the load event may already have fired and will never fire again, so
     * the worker is silently never installed. It is the difference between
     * working offline and not, decided by event ordering. */
    function installServiceWorker() {
        if (!("serviceWorker" in navigator)) return;
        var register = function () {
            navigator.serviceWorker.register("./service-worker.js").catch(function () {
                /* A failed registration must never surface to the player.
                 * The game works; it just will not survive being offline. */
            });
        };
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
    }


    S.Main = {
        boot: boot,
        startMatch: startMatch,
        quitToMenu: quitToMenu,
        get world() { return world; },
        get running() { return running; }
    };

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", boot);
        } else {
            boot();
        }
    }

})(window.IF = window.IF || {});
