/*
 * FORMICA - HUD, classifica, feed dei razzi e schermate.
 *
 * Il testo vive nel DOM così resta nitido e leggibile dalle tecnologie
 * assistive; solo il mondo e la minimappa sono canvas.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;

    var D = {};
    var lbRows = [];
    var feedItems = [];
    var lbTimer = 0;
    var zoneTimer = 0;
    var huntTimer = 0;
    var raidTimer = 0;
    var territoryPeak = 0;
    var listeners = {};

    function el(id) { return document.getElementById(id); }

    function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
    function emit(name, arg) {
        var l = listeners[name];
        if (l) for (var i = 0; i < l.length; i++) l[i](arg);
    }

    function init() {
        D.hud = el("hud");
        D.statCrumbs = el("stat-crumbs");
        D.statWorkers = el("stat-workers");
        D.statTerritory = el("stat-territory");
        D.statRank = el("stat-rank");
        D.statName = el("stat-name");
        D.nestFill = el("nest-fill");
        D.leaderboard = el("leaderboard");
        D.killfeed = el("killfeed");
        D.minimap = el("minimap");
        D.phaseBar = el("phase-bar");
        D.phaseLabel = el("phase-label");
        D.raidBanner = el("raid-banner");
        D.huntBanner = el("hunt-banner");
        D.zoneName = el("zone-name");

        D.screenMenu = el("screen-menu");
        D.screenDeath = el("screen-death");
        D.nameInput = el("name-input");
        D.deathTitle = el("death-title");
        D.deathSub = el("death-sub");
        D.osTerritory = el("os-territory");
        D.osRank = el("os-rank");
        D.osRaids = el("os-raids");
        D.osCrumbs = el("os-crumbs");
        D.osBest = el("os-best");
        D.menuBest = el("menu-best");

        D.minimapCtx = D.minimap.getContext("2d");

        for (var i = 0; i < 6; i++) {
            var li = document.createElement("li");
            li.className = "lb-row";
            li.innerHTML =
                '<span class="lb-pos"></span><span class="lb-dot"></span>' +
                '<span class="lb-name"></span><span class="lb-terr"></span>';
            D.leaderboard.appendChild(li);
            lbRows.push({
                li: li,
                pos: li.querySelector(".lb-pos"),
                dot: li.querySelector(".lb-dot"),
                name: li.querySelector(".lb-name"),
                terr: li.querySelector(".lb-terr"),
            });
        }

        el("btn-play").addEventListener("click", function () { emit("play"); });
        el("btn-again").addEventListener("click", function () { emit("play"); });
        el("btn-menu").addEventListener("click", function () { emit("menu"); });
        el("btn-sound").addEventListener("click", function () { emit("toggleSound"); });
        el("btn-install").addEventListener("click", function () { emit("install"); });
        el("btn-install-later").addEventListener("click", function () {
            el("install-prompt").classList.add("hidden");
        });

        var settings = L.Storage.getSettings();
        updateSoundButton(settings.sound);

        var stats = L.Storage.getStats();
        if (stats.best > 0) {
            D.menuBest.textContent = "Miglior territorio: " + stats.best.toFixed(1) + "%" +
                (stats.bestRank <= 6 ? "  ·  picco #" + stats.bestRank : "");
        }

        var profile = L.Storage.getProfile();
        D.nameInput.value = profile.name || ("Formicaio " + ((Math.random() * 90 + 10) | 0));

        var boostPad = el("boost-pad");
        L.Player.init(L.Render.canvas(), boostPad);
    }

    function updateSoundButton(on) {
        var b = el("btn-sound");
        b.textContent = on ? "🔊 Suono" : "🔇 Suono";
        b.classList.toggle("is-off", !on);
    }

    /* ===== HUD ===== */
    function update(world, dt) {
        var p = world.player;

        if (p) {
            D.statCrumbs.textContent = Math.floor(p.crumbs).toLocaleString();
            D.statWorkers.textContent = p.workers;
            var total = world.gw * world.gh;
            var terr = total > 0 ? (p.territory / total) * 100 : 0;
            if (p.alive && terr > territoryPeak) territoryPeak = terr;
            D.statTerritory.textContent = terr.toFixed(1) + "%";
            D.statRank.textContent = "#" + world.rank;
            D.statName.textContent = p.name;
            D.nestFill.style.width = (L.clamp(p.nestHp / C.nest.hp, 0, 1) * 100).toFixed(1) + "%";
            D.nestFill.classList.toggle("is-low", p.nestHp < C.nest.hp * 0.34);
        }

        lbTimer -= dt;
        if (lbTimer <= 0) {
            lbTimer = 0.25;
            updateLeaderboard(world);
        }

        /* Barra giorno/notte. */
        D.phaseBar.style.width = (world.phase * 100).toFixed(1) + "%";
        var isNight = world.night > 0.5;
        D.phaseLabel.textContent = isNight ? "🌙 NOTTE" : "☀️ GIORNO";
        D.phaseLabel.classList.toggle("is-night", isNight);

        zoneTimer -= dt;
        if (zoneTimer <= 0) {
            zoneTimer = 0.4;
            if (p) {
                var z = L.Zones.zoneAt(p.x, p.y, world.w, world.h);
                if (D.zoneName.textContent !== z.name) {
                    D.zoneName.textContent = z.name + " — " + z.blurb;
                }
            }
        }

        huntTimer -= dt;
        if (huntTimer <= 0) {
            huntTimer = 1;
            updateHuntBanner(world);
        }

        raidTimer -= dt;
        if (raidTimer <= 0) {
            raidTimer = 0.5;
            updateRaidBanner(world);
        }

        L.Render.drawMinimap(D.minimapCtx, world);
    }

    function updateLeaderboard(world) {
        var list = world.colonies.filter(function (c) { return c.alive; });
        var total = world.gw * world.gh;
        list.sort(function (a, b) { return b.territory - a.territory; });

        for (var i = 0; i < lbRows.length; i++) {
            var row = lbRows[i];
            var c = list[i];
            if (!c) { row.li.classList.add("hidden"); continue; }
            row.li.classList.remove("hidden");
            row.li.classList.toggle("is-me", !!c.isPlayer);
            row.pos.textContent = i + 1;
            row.dot.style.background = c.color;
            row.name.textContent = c.name;
            row.terr.textContent = ((c.territory / total) * 100).toFixed(1) + "%";
        }
    }

    function updateHuntBanner(world) {
        var g = L.Storage.strongestGrudge();
        if (!g) { D.huntBanner.classList.add("hidden"); return; }
        var found = null;
        for (var i = 0; i < world.colonies.length; i++) {
            if (world.colonies[i].botId === g.id) { found = world.colonies[i]; break; }
        }
        if (!found || !found.alive) { D.huntBanner.classList.add("hidden"); return; }
        D.huntBanner.textContent = "⚠ " + found.name + " ha un conto in sospeso con te";
        D.huntBanner.classList.remove("hidden");
    }

    /* Banner quando una razzia nemica marcia verso di te: va visto, non
     * scoperto quando le formiche sono già nel nido. */
    function updateRaidBanner(world) {
        var p = world.player;
        if (!p || !p.alive) { D.raidBanner.classList.add("hidden"); return; }
        var incoming = 0;
        for (var i = 0; i < world.raids.length; i++) {
            if (world.raids[i].target === p) incoming++;
        }

        if (!incoming) {
            D.raidBanner.classList.remove("hot");
            if (world.night > 0.5) {
                D.raidBanner.textContent = "🌙 Notte: le colonie razziano";
                D.raidBanner.classList.remove("hidden");
            } else {
                D.raidBanner.classList.add("hidden");
            }
            return;
        }

        D.raidBanner.textContent = "🚨 Razzia in arrivo: " + incoming +
            (incoming === 1 ? " formica" : " formiche") + " — proteggi il nido";
        D.raidBanner.classList.remove("hidden");
        D.raidBanner.classList.add("hot");
    }

    /* ===== Feed ===== */
    function addFeed(text, color) {
        var div = document.createElement("div");
        div.className = "feed-item";
        div.style.color = color || "#f3e2c7";
        div.textContent = text;
        D.killfeed.appendChild(div);
        feedItems.push({ el: div, life: 5 });
        while (feedItems.length > 4) {
            var old = feedItems.shift();
            if (old.el.parentNode) old.el.parentNode.removeChild(old.el);
        }
    }

    function tickFeed(dt) {
        for (var i = feedItems.length - 1; i >= 0; i--) {
            var f = feedItems[i];
            f.life -= dt;
            if (f.life <= 0) {
                if (f.el.parentNode) f.el.parentNode.removeChild(f.el);
                feedItems.splice(i, 1);
            } else if (f.life < 0.6) {
                f.el.style.opacity = f.life / 0.6;
            }
        }
    }

    function clearFeed() {
        for (var i = 0; i < feedItems.length; i++) {
            if (feedItems[i].el.parentNode) feedItems[i].el.parentNode.removeChild(feedItems[i].el);
        }
        feedItems.length = 0;
    }

    /* ===== Schermate ===== */
    function showScreen(name) {
        D.screenMenu.classList.toggle("hidden", name !== "menu");
        D.screenDeath.classList.toggle("hidden", name !== "death");
        D.hud.classList.toggle("hidden", name === "menu");
        document.body.classList.toggle("in-menu", name === "menu");
    }

    function showDeath(info) {
        D.deathTitle.textContent = info.title;
        D.deathSub.textContent = info.sub;
        D.osTerritory.textContent = info.territory.toFixed(1) + "%";
        D.osRank.textContent = "#" + info.rank;
        D.osRaids.textContent = info.raidsBeaten;
        D.osCrumbs.textContent = Math.floor(info.crumbs).toLocaleString();
        D.osBest.textContent = info.best.toFixed(1) + "%";
        D.deathTitle.style.color = info.color || "#f3e2c7";
        showScreen("death");
    }

    function setInstallAvailable() {
        var p = el("install-prompt");
        if (p) p.classList.remove("hidden");
    }

    L.UI = {
        init: init,
        update: update,
        tickFeed: tickFeed,
        clearFeed: clearFeed,
        addFeed: addFeed,
        showScreen: showScreen,
        showDeath: showDeath,
        setInstallAvailable: setInstallAvailable,
        updateSoundButton: updateSoundButton,
        peakTerritory: function () { return territoryPeak; },
        resetPeak: function () { territoryPeak = 0; },
        name: function () {
            var v = (D.nameInput.value || "").trim().slice(0, 18);
            return v || ("Formicaio " + ((Math.random() * 90 + 10) | 0));
        },
        on: on,
    };

})(window.FORMICA = window.FORMICA || {});
