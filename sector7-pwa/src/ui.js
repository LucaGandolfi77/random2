/*
 * SECTOR 7 - HUD, station panel, kill feed and screens.
 *
 * All text lives in the DOM so it stays crisp and reachable by assistive
 * tech; only the sector and the minimap are canvas.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var D = {};
    var feedItems = [];
    var listeners = {};
    var stationShip = null;
    var statTimer = 0;
    var contractTimer = 0;

    function el(id) { return document.getElementById(id); }

    function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
    function emit(name, arg) {
        var l = listeners[name];
        if (l) for (var i = 0; i < l.length; i++) l[i](arg);
    }

    function setText(node, value) {
        var s = String(value);
        if (node.textContent !== s) node.textContent = s;
    }

    /* ===== Init ===== */

    function init() {
        D.hud = el("hud");
        D.hullBar = el("hull-fill");
        D.hullText = el("stat-hull");
        D.energy = el("stat-energy");
        D.crystals = el("stat-crystals");
        D.tier = el("stat-tier");
        D.kills = el("stat-kills");
        D.minimap = el("minimap");
        D.minimapCtx = D.minimap.getContext("2d");
        D.killfeed = el("killfeed");
        D.bountyBanner = el("bounty-banner");
        D.bountyName = el("bounty-name");
        D.bountyValue = el("bounty-value");
        D.bountyFill = el("bounty-fill");
        D.contractTrack = el("contract-track");
        D.stormWarn = el("storm-warn");
        D.dockHint = el("dock-hint");
        D.dockBar = el("dock-bar");

        D.screenMenu = el("screen-menu");
        D.screenDeath = el("screen-death");
        D.screenStation = el("screen-station");

        D.nameInput = el("name-input");
        D.menuBest = el("menu-best");
        D.deathTitle = el("death-title");
        D.deathSub = el("death-sub");
        D.osCrystals = el("os-crystals");
        D.osKills = el("os-kills");
        D.osBest = el("os-best");
        D.osDeaths = el("os-deaths");

        /* Station panel pieces are static; the rows inside them are rebuilt
         * on every refresh. */
        D.stEnergy = el("st-energy");
        D.stHull = el("st-hull");
        D.stRows = el("st-rows");
        D.stRepair = el("st-repair");
        D.stRepairBtn = el("st-repair-btn");
        D.stHullFill = el("st-hull-fill");
        D.stLaunch = el("st-launch");
        D.stFee = el("st-fee");
        D.stTier = el("st-tier");
        D.stTabs = el("st-tabs");
        D.stContracts = el("st-contracts");
        D.stRefits = el("st-refits");
        D.stSectors = el("st-sectors");
        D.stSectorHint = el("st-sector-hint");
        D.tab = "modules";
        D.assistToggle = el("btn-dock-toggle");

        el("btn-play").addEventListener("click", function () { S.Audio.ui(); emit("play"); });
        el("btn-again").addEventListener("click", function () { S.Audio.ui(); emit("relaunch"); });
        el("btn-menu").addEventListener("click", function () { S.Audio.ui(); emit("menu"); });
        el("btn-sound").addEventListener("click", function () { emit("toggleSound"); });
        el("btn-install").addEventListener("click", function () { emit("install"); });
        el("btn-install-later").addEventListener("click", function () {
            el("install-prompt").classList.add("hidden");
        });

        /* LAUNCH undocks and pays the fee; the secondary button leaves for
         * the menu. These two were wired to each other's handlers, which left
         * LAUNCH completely inert. */
        el("st-launch").addEventListener("click", function () { S.Audio.ui(); emit("undock"); });

        /* Station tabs. One panel is visible at a time because the station
         * panel already scrolls on a short phone and four full lists stacked
         * on top of each other is unusable. */
        var tabs = D.stTabs.querySelectorAll(".st-tab");
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener("click", (function (name) {
                return function () {
                    S.Audio.ui();
                    D.tab = name;
                    for (var k = 0; k < tabs.length; k++) {
                        tabs[k].classList.toggle("is-on", tabs[k].getAttribute("data-tab") === name);
                        var panel = el("st-panel-" + tabs[k].getAttribute("data-tab"));
                        if (panel) panel.classList.toggle("is-hidden", tabs[k].getAttribute("data-tab") !== name);
                    }
                    refreshStation();
                };
            })(tabs[i].getAttribute("data-tab")));
        }
        el("st-close").addEventListener("click", function () { S.Audio.ui(); emit("menu"); });
        el("st-repair-btn").addEventListener("click", function () { emit("repair"); });
        D.assistToggle.addEventListener("click", function () { emit("toggleAssist"); });

        var settings = S.Storage.getSettings();
        updateSoundButton(settings.sound);
        D.assistToggle.classList.toggle("is-on", settings.aimAssist);
        D.assistToggle.textContent = settings.aimAssist ? "AIM ASSIST ON" : "AIM ASSIST OFF";

        refreshMenuBest();
    }

    function updateSoundButton(on) {
        var b = el("btn-sound");
        b.textContent = on ? "🔊 Sound" : "🔇 Sound";
        b.classList.toggle("is-off", !on);
    }

    function refreshMenuBest() {
        var ship = S.Storage.getShip();
        var stats = S.Storage.getStats();
        var bits = [];
        if (ship.crystals > 0) bits.push("Banked: " + S.fmt(ship.crystals) + " ◈");
        if (stats.bestCrystals > 0) bits.push("Best: " + S.fmt(stats.bestCrystals) + " ◈");
        if (stats.kills > 0) bits.push(stats.kills + " kills");
        D.menuBest.textContent = bits.length ? bits.join("  ·  ") : "No flight record yet.";
    }

    /* ===== HUD ===== */

    function update(world, dt) {
        var p = world.player;

        if (p) {
            var frac = S.clamp(p.hull / p.maxHull, 0, 1);
            D.hullBar.style.width = (frac * 100).toFixed(1) + "%";
            D.hullBar.classList.toggle("is-critical", frac < 0.3);
            setText(D.hullText, Math.ceil(p.hull) + " / " + p.maxHull);
            setText(D.energy, S.fmt(p.energy));
            setText(D.crystals, S.fmt(p.crystals));
            setText(D.kills, p.kills);

            /* Sector threat tier: what the sector has escalated to, which is
             * driven entirely by the crystals you have banked. */
            setText(D.tier, S.tierForCrystals(p.crystals));

            var ps = S.Player.state;
            if (ps.dockProgress > 0 && !ps.docked) {
                D.dockHint.classList.remove("hidden");
                D.dockBar.style.width = (S.clamp(ps.dockProgress / C.world.dockTime, 0, 1) * 100).toFixed(0) + "%";
            } else {
                D.dockHint.classList.add("hidden");
            }
        }

        /* Bounty: the single most important piece of information on the
         * screen while it is live, because it is worth crystals and it is
         * trying to kill you. */
        var b = S.Bounty.status();
        if (b.active) {
            D.bountyBanner.classList.remove("hidden");
            setText(D.bountyName, b.name);
            setText(D.bountyValue, S.fmt(b.value) + " ◈");
            D.bountyFill.style.width =
                (S.clamp(1 - b.hull / Math.max(1, b.maxHull), 0, 1) * 100).toFixed(0) + "%";
        } else {
            D.bountyBanner.classList.add("hidden");
        }

        /* One compact contract strip, so the board is visible while flying
         * rather than only when you happen to dock. */
        contractTimer -= dt;
        if (contractTimer <= 0) {
            contractTimer = 0.6;
            refreshContractStrip();
        }

        /* Ion storm warning. The stick fights you in there and the player
         * needs to know that is the sector and not their own thumb.
         * update() also runs on the menu, where there is no player at all. */
        var inStorm = p && S.World.hazardAt(p.x, p.y, "storm") > 0.3;
        D.stormWarn.classList.toggle("hidden", !inStorm);

        statTimer -= dt;
        if (statTimer <= 0) {
            statTimer = 1;
            S.Render.drawMinimap(D.minimapCtx, world);
        }
    }

    function refreshContractStrip() {
        var list = S.Contracts.list();
        var bits = [];
        for (var i = 0; i < list.length && bits.length < 3; i++) {
            var c = list[i];
            if (c.claimed) continue;
            bits.push('<span class="ct' + (c.done ? " is-done" : "") + '">' +
                escapeHtml(c.label) +
                '<b>' + Math.floor(c.progress) + "/" + c.target + "</b></span>");
        }
        var html = bits.length ? bits.join("") : "";
        if (D.contractTrack._html !== html) D.contractTrack.innerHTML = html;
    }

    /* ===== Kill feed ===== */

    function addKill(killerName, killerColor, victimName, victimColor) {
        var div = document.createElement("div");
        div.className = "feed-item";
        div.innerHTML =
            '<span class="feed-name" style="color:' + killerColor + '">' + escapeHtml(killerName) + "</span>" +
            '<span class="feed-verb">destroyed</span>' +
            '<span class="feed-name" style="color:' + victimColor + '">' + escapeHtml(victimName) + "</span>";
        D.killfeed.appendChild(div);
        feedItems.push({ el: div, life: 4.5 });
        while (feedItems.length > 4) {
            var old = feedItems.shift();
            if (old.el.parentNode) old.el.parentNode.removeChild(old.el);
        }
    }

    /* Names come from a fixed roster, never from player input, but the menu
     * lets you type a callsign so escape it before it reaches innerHTML. */
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
        });
    }

    function tickFeed(dt) {
        for (var i = feedItems.length - 1; i >= 0; i--) {
            var f = feedItems[i];
            f.life -= dt;
            if (f.life <= 0) {
                if (f.el.parentNode) f.el.parentNode.removeChild(f.el);
                feedItems.splice(i, 1);
            } else if (f.life < 0.7) {
                f.el.style.opacity = f.life / 0.7;
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
        D.screenStation.classList.toggle("hidden", name !== "station");
        D.hud.classList.toggle("hidden", name === "menu" || name === "death");
        document.body.classList.toggle("in-menu", name === "menu");
    }

    function showDeath(info) {
        D.deathTitle.textContent = info.title;
        D.deathTitle.style.color = info.color || "#e8f6ff";
        D.deathSub.textContent = info.sub;
        setText(D.osCrystals, S.fmt(info.crystals));
        setText(D.osKills, info.kills);
        setText(D.osBest, S.fmt(info.best));
        setText(D.osDeaths, info.deaths);
        refreshMenuBest();
        showScreen("death");
    }

    function setInstallAvailable() {
        var p = el("install-prompt");
        if (p) p.classList.remove("hidden");
    }

    /* ===== Station panel ===== */

    function showStation(ship) {
        stationShip = ship;
        refreshStation();
        showScreen("station");
    }

    function refreshStation() {
        if (!stationShip) return;
        var q = S.Stations.quote(stationShip);

        setText(D.stEnergy, S.fmt(q.energy));
        setText(D.stHull, Math.ceil(q.hull) + " / " + q.maxHull);
        setText(D.stTier, S.tierForShip(stationShip.modules));

        var hullFrac = S.clamp(q.hull / Math.max(1, q.maxHull), 0, 1);
        D.stHullFill.style.width = (hullFrac * 100).toFixed(1) + "%";
        D.stHullFill.classList.toggle("is-critical", hullFrac < 0.3);

        var rows = "";
        for (var i = 0; i < q.modules.length; i++) {
            var m = q.modules[i];
            var pips = "";
            for (var p = 1; p <= m.max; p++) {
                pips += '<span class="pip' + (p <= m.level ? " is-on" : "") + '"></span>';
            }
            rows +=
                '<div class="st-row' + (m.maxed ? " is-maxed" : "") + '">' +
                    '<div class="st-row-head">' +
                        '<span class="st-glyph">' + m.glyph + "</span>" +
                        '<span class="st-name">' + m.name + "</span>" +
                        '<span class="st-level">' + m.level + "/" + m.max + "</span>" +
                    "</div>" +
                    '<div class="st-pips">' + pips + "</div>" +
                    '<div class="st-row-foot">' +
                        '<span class="st-delta">' + (m.delta || m.blurb) + "</span>" +
                        (m.maxed
                            ? '<span class="st-cost is-max">MAX</span>'
                            : '<button class="st-buy" data-key="' + m.key + '"' +
                              (m.affordable ? "" : " disabled") + ">" +
                              S.fmt(m.cost) + " ⚡</button>") +
                    "</div>" +
                "</div>";
        }
        D.stRows.innerHTML = rows;

        var buys = D.stRows.querySelectorAll(".st-buy");
        for (var i = 0; i < buys.length; i++) {
            buys[i].addEventListener("click", (function (key) {
                return function () { emit("buy", key); };
            })(buys[i].getAttribute("data-key")));
        }

        /* Repair: the button states its own price, so the decision is
         * informed without leaving the station. The note below says what is
         * actually damaged rather than repeating the bar above it. */
        var missing = Math.ceil(q.maxHull - q.hull);
        if (q.repair <= 0) {
            setText(D.stRepair, "Hull is intact.");
            D.stRepairBtn.disabled = true;
            D.stRepairBtn.textContent = "REPAIR";
        } else {
            setText(D.stRepair, missing + " hull of damage. Repairs are priced by " +
                "the tier you are flying, so field repairs get dearer as the sector escalates.");
            D.stRepairBtn.disabled = q.energy < q.repair;
            D.stRepairBtn.textContent = "REPAIR " + S.fmt(q.repair) + " ⚡";
        }

        setText(D.stFee, S.fmt(q.fee));

        renderContracts(stationShip);
        renderRefits(stationShip);
        renderSectors();
    }

    /* ===== Contracts ===== */
    function renderContracts(ship) {
        var list = S.Contracts.list();
        var rows = "";
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            var pct = S.clamp(c.progress / c.target, 0, 1) * 100;
            rows +=
                '<div class="st-row contract' + (c.done ? " is-done" : "") +
                    (c.claimed ? " is-claimed" : "") + '">' +
                    '<div class="st-row-head">' +
                        '<span class="st-name">' + escapeHtml(c.label) + "</span>" +
                        '<span class="st-reward">' + S.fmt(c.reward) + " ◈</span>" +
                    "</div>" +
                    '<div class="ct-bar"><div style="width:' + pct.toFixed(0) + '%"></div></div>' +
                    '<div class="st-row-foot">' +
                        '<span class="st-delta">' + escapeHtml(c.verb) + "</span>" +
                        (c.claimed
                            ? '<span class="st-cost is-max">CLAIMED</span>'
                            : '<span class="st-level">' + Math.floor(c.progress) + " / " + c.target + "</span>") +
                    "</div>" +
                    (c.done && !c.claimed
                        ? '<button class="st-buy" data-claim="' + escapeHtml(c.id) + '">CLAIM ' +
                          S.fmt(c.reward) + " ◈</button>"
                        : "") +
                "</div>";
        }
        if (D.stContracts._html !== rows) {
            D.stContracts.innerHTML = rows;
            var claims = D.stContracts.querySelectorAll("[data-claim]");
            for (var i = 0; i < claims.length; i++) {
                claims[i].addEventListener("click", (function (id) {
                    return function () { emit("claim", id); };
                })(claims[i].getAttribute("data-claim")));
            }
        }
    }

    /* ===== Refits ===== */
    function renderRefits(ship) {
        var q = S.Stations.refitQuote(ship);
        var rows = "";
        for (var i = 0; i < q.length; i++) {
            var r = q[i];
            var pips = "";
            for (var p = 1; p <= r.max; p++) {
                pips += '<span class="pip' + (p <= r.level ? " is-on" : "") + '"></span>';
            }
            rows +=
                '<div class="st-row' + (r.maxed ? " is-maxed" : "") + '">' +
                    '<div class="st-row-head">' +
                        '<span class="st-glyph">' + r.glyph + "</span>" +
                        '<span class="st-name">' + escapeHtml(r.name) + "</span>" +
                        '<span class="st-level">' + r.level + "/" + r.max + "</span>" +
                    "</div>" +
                    '<div class="st-pips">' + pips + "</div>" +
                    '<div class="st-row-foot">' +
                        '<span class="st-delta">' + escapeHtml(r.detail) + "</span>" +
                        (r.maxed
                            ? '<span class="st-cost is-max">MAX</span>'
                            : '<button class="st-buy" data-refit="' + escapeHtml(r.key) + '"' +
                              (r.affordable ? "" : " disabled") + ">" +
                              S.fmt(r.cost) + " ◈</button>") +
                    "</div>" +
                "</div>";
        }
        if (D.stRefits._html === rows) return;
        D.stRefits.innerHTML = rows;
        var btns = D.stRefits.querySelectorAll("[data-refit]");
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener("click", (function (key) {
                return function () { emit("refit", key); };
            })(btns[i].getAttribute("data-refit")));
        }
    }

    /* ===== Sectors ===== */
    function renderSectors() {
        var stats = S.Storage.getStats();
        var save = S.Storage.getShip();
        var here = S.World.world.sectorId || "rook";
        var prog = S.Sector.unlockProgress(stats.crystalsAllTime);
        setText(D.stSectorHint, prog.done
            ? "All sectors open. Lifetime crystals: " + S.fmt(stats.crystalsAllTime) + " ◈"
            : "Lifetime crystals: " + S.fmt(stats.crystalsAllTime) + " ◈  ·  " +
              S.fmt(prog.short) + " more for " + prog.next.name);

        var rows = "";
        for (var i = 0; i < S.Sector.all.length; i++) {
            var sec = S.Sector.all[i];
            var open = S.Sector.isUnlocked(sec.id, stats.crystalsAllTime);
            var isHere = sec.id === here;
            var best = save.sectorBest[sec.id] || 0;

            rows +=
                '<div class="st-row sector' + (open ? "" : " is-locked") +
                    (isHere ? " is-here" : "") + '">' +
                    '<div class="st-row-head">' +
                        '<span class="st-name">' + escapeHtml(sec.name) + "</span>" +
                        (isHere ? '<span class="st-cost is-max">IN SECTOR</span>'
                                : open ? '<span class="st-level">◈ ×' + sec.payout.toFixed(2) + "</span>"
                                       : '<span class="st-level">LOCKED</span>') +
                    "</div>" +
                    '<div class="st-row-foot">' +
                        '<span class="st-delta">' + escapeHtml(sec.subtitle) +
                            (best ? " · best " + S.fmt(best) + " ◈" : "") +
                            " · tier " + sec.tierCap + "</span>" +
                        (open && !isHere
                            ? '<button class="st-buy" data-travel="' + escapeHtml(sec.id) + '">LAUNCH</button>'
                            : "") +
                    "</div>" +
                    '<p class="st-blurb">' + escapeHtml(sec.blurb) + "</p>" +
                "</div>";
        }
        if (D.stSectors._html === rows) return;
        D.stSectors.innerHTML = rows;
        var btns = D.stSectors.querySelectorAll("[data-travel]");
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener("click", (function (id) {
                return function () { emit("travel", id); };
            })(btns[i].getAttribute("data-travel")));
        }
    }

    function toast(text, bad) {
        var t = el("st-toast");
        t.textContent = text;
        t.classList.toggle("is-bad", !!bad);
        t.classList.remove("is-hidden");
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.classList.add("is-hidden"); }, 1800);
    }

    function updateAssistButton(on) {
        D.assistToggle.textContent = on ? "AIM ASSIST ON" : "AIM ASSIST OFF";
        D.assistToggle.classList.toggle("is-on", on);
    }

    S.UI = {
        init: init,
        update: update,
        tickFeed: tickFeed,
        clearFeed: clearFeed,
        addKill: addKill,
        showScreen: showScreen,
        showDeath: showDeath,
        showStation: showStation,
        refreshStation: refreshStation,
        toast: toast,
        updateSoundButton: updateSoundButton,
        updateAssistButton: updateAssistButton,
        refreshMenuBest: refreshMenuBest,
        setInstallAvailable: setInstallAvailable,
        name: function () {
            var v = (D.nameInput.value || "").trim().slice(0, 14);
            return v;
        },
        on: on,
        _els: D,
    };

})(window.S7 = window.S7 || {});