/*
 * LUMEN - HUD, leaderboard, kill feed and screens.
 *
 * Text lives in the DOM so it stays crisp and selectable by assistive tech;
 * only the game world and the minimap are canvas.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;

    var D = {};
    var lbRows = [];
    var feedItems = [];
    var lbTimer = 0;
    var huntTimer = 0;
    var depthTimer = 0;
    var depthAcc = 0;
    var depthAccN = 0;
    var lastBand = -1;
    var listeners = {};

    function el(id) { return document.getElementById(id); }

    function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
    function emit(name, arg) {
        var l = listeners[name];
        if (l) for (var i = 0; i < l.length; i++) l[i](arg);
    }

    function init() {
        D.hud = el("hud");
        D.statMass = el("stat-mass");
        D.statRank = el("stat-rank");
        D.statKills = el("stat-kills");
        D.statName = el("stat-name");
        D.leaderboard = el("leaderboard");
        D.killfeed = el("killfeed");
        D.minimap = el("minimap");
        D.huntBanner = el("hunt-banner");
        D.depth = el("depth");
        D.depthBands = el("depth-bands");
        D.depthMarker = el("depth-marker");
        D.depthName = el("depth-name");
        D.depthMetres = el("depth-metres");

        /* Build the depth scale from the zone table so the HUD can never drift
         * out of sync with the world. */
        var bands = L.Zones.BANDS;
        for (i = 0; i < bands.length; i++) {
            var seg = document.createElement("span");
            seg.className = "depth-band";
            seg.style.height = ((bands[i].y1 - bands[i].y0) * 100) + "%";
            seg.style.background = bands[i].tint;
            seg.style.boxShadow = "inset 0 0 0 1px " + bands[i].accent + "44";
            seg.title = bands[i].name + " — " + bands[i].blurb;
            D.depthBands.appendChild(seg);
        }

        D.screenMenu = el("screen-menu");
        D.screenDeath = el("screen-death");
        D.nameInput = el("name-input");
        D.deathTitle = el("death-title");
        D.deathSub = el("death-sub");
        D.osMass = el("os-mass");
        D.osRank = el("os-rank");
        D.osKills = el("os-kills");
        D.osBest = el("os-best");
        D.menuBest = el("menu-best");

        D.minimapCtx = D.minimap.getContext("2d");

        for (var i = 0; i < 10; i++) {
            var li = document.createElement("li");
            li.className = "lb-row";
            li.innerHTML = '<span class="lb-pos"></span><span class="lb-dot"></span><span class="lb-name"></span><span class="lb-mass"></span>';
            D.leaderboard.appendChild(li);
            lbRows.push({
                li: li,
                pos: li.querySelector(".lb-pos"),
                dot: li.querySelector(".lb-dot"),
                name: li.querySelector(".lb-name"),
                mass: li.querySelector(".lb-mass"),
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
            D.menuBest.textContent = "Best glow: " + stats.best.toLocaleString() +
                (stats.bestRank <= 50 ? "  ·  peak rank #" + stats.bestRank : "");
        }

        var profile = L.Storage.getProfile();
        D.nameInput.value = profile.name || L.Storage.randomName();

        var boostPad = el("boost-pad");
        L.Player.init(L.Render.canvas(), boostPad);
    }

    function updateSoundButton(on) {
        var b = el("btn-sound");
        b.textContent = on ? "🔊 Sound" : "🔇 Sound";
        b.classList.toggle("is-off", !on);
    }

    /* ===== HUD ===== */
    function update(world, dt) {
        var p = world.player;

        if (p) {
            D.statMass.textContent = Math.floor(p.mass).toLocaleString();
            D.statRank.textContent = "#" + world.rank;
            D.statKills.textContent = p.kills;
            D.statName.textContent = p.name;
            D.hud.classList.toggle("is-stunned", p.stun > 0);
        }

        lbTimer -= dt;
        if (lbTimer <= 0) {
            lbTimer = 0.25;
            updateLeaderboard(world);
        }

        updateDepth(world, dt);

        huntTimer -= dt;
        if (huntTimer <= 0) {
            huntTimer = 1;
            updateHuntBanner(world);
        }

        L.Render.drawMinimap(D.minimapCtx, world);
    }

    function updateLeaderboard(world) {
        var list = [];
        for (var i = 0; i < world.creatures.length; i++) {
            if (world.creatures[i].alive) list.push(world.creatures[i]);
        }
        list.sort(function (a, b) { return b.mass - a.mass; });

        for (i = 0; i < lbRows.length; i++) {
            var row = lbRows[i];
            var c = list[i];
            if (!c) { row.li.classList.add("hidden"); continue; }
            row.li.classList.remove("hidden");
            row.li.classList.toggle("is-me", !!c.isPlayer);
            row.pos.textContent = i + 1;
            row.dot.style.background = c.color;
            row.name.textContent = c.name;
            row.mass.textContent = Math.floor(c.mass).toLocaleString();
        }
    }

    /* Smooth the marker, but let the name and colour swap instantly: crossing
     * a boundary should be felt, not eased through. */
    function updateDepth(world, dt) {
        var p = world.player;
        if (!p || !D.depth) return;

        var frac = L.Zones.depthFraction(p.headY, world.size);
        var target = frac * 100;

        if (depthAcc === 0) depthAcc = target;
        var k = 1 - Math.pow(0.0008, dt);
        depthAcc += (target - depthAcc) * k;

        D.depthMarker.style.top = depthAcc.toFixed(2) + "%";
        D.depthMarker.style.background = L.Zones.accentFor(p.headY, world.size);
        D.depthMarker.style.boxShadow = "0 0 12px " + L.Zones.accentFor(p.headY, world.size);

        var idx = L.Zones.bandIndexAt(p.headY, world.size);
        if (idx !== lastBand) {
            lastBand = idx;
            var band = L.Zones.BANDS[idx];
            D.depthName.textContent = band.name;
            D.depthName.style.color = band.accent;
            D.depth.classList.toggle("is-deep", idx >= 2);
        }

        /* Average the readout so it stops flickering as you swim. */
        depthAccN++;
        depthTimer += dt;
        if (depthTimer >= 0.25) {
            D.depthMetres.textContent = Math.round(frac * 1200) + " m";
            depthTimer = 0;
            depthAccN = 0;
        }
    }

    function updateHuntBanner(world) {
        var g = L.Storage.strongestGrudge();
        if (!g) { D.huntBanner.classList.add("hidden"); return; }
        var found = null;
        for (var i = 0; i < world.creatures.length; i++) {
            if (world.creatures[i].botId === g.id) { found = world.creatures[i]; break; }
        }
        if (!found || !found.alive) { D.huntBanner.classList.add("hidden"); return; }
        D.huntBanner.textContent = "⚠ " + found.name + " is hunting you";
        D.huntBanner.classList.remove("hidden");
    }

    /* ===== Kill feed ===== */
    function addKill(killerName, killerColor, victimName, victimColor) {
        var div = document.createElement("div");
        div.className = "feed-item";
        div.innerHTML =
            '<span class="feed-name" style="color:' + killerColor + '">' + killerName + "</span>" +
            '<span class="feed-verb">eliminated</span>' +
            '<span class="feed-name" style="color:' + victimColor + '">' + victimName + "</span>";
        D.killfeed.appendChild(div);
        feedItems.push({ el: div, life: 5.5 });
        while (feedItems.length > 5) {
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

    /* ===== Screens ===== */
    function showScreen(name) {
        D.screenMenu.classList.toggle("hidden", name !== "menu");
        D.screenDeath.classList.toggle("hidden", name !== "death");
        D.hud.classList.toggle("hidden", name === "menu");
        document.body.classList.toggle("in-menu", name === "menu");
    }

    function showDeath(info) {
        D.deathTitle.textContent = info.title;
        D.deathSub.textContent = info.sub;
        D.osMass.textContent = Math.floor(info.mass).toLocaleString();
        D.osRank.textContent = "#" + info.rank;
        D.osKills.textContent = info.kills;
        D.osBest.textContent = info.best.toLocaleString();
        D.deathTitle.style.color = info.color || "#e8f6ff";
        showScreen("death");
    }

    function setStatColor(color) {
        D.deathTitle.style.color = color;
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
        addKill: addKill,
        showScreen: showScreen,
        showDeath: showDeath,
        setStatColor: setStatColor,
        setInstallAvailable: setInstallAvailable,
        updateSoundButton: updateSoundButton,
        name: function () {
            var v = (D.nameInput.value || "").trim().slice(0, 14);
            return v || L.Storage.randomName();
        },
        on: on,
    };

})(window.LUMEN = window.LUMEN || {});
