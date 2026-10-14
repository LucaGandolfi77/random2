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
        D.shieldBar = el("shield-fill");
        D.shieldText = el("stat-shield");
        D.hold = el("stat-hold");
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
        D.holdFull = el("hold-full");
        D.cpuChip = el("cpu-chip");
        D.cpuName = el("cpu-name");
        D.cpuTimer = el("cpu-timer");
        D.dockHint = el("dock-hint");
        D.dockBar = el("dock-bar");

        D.targetPanel = el("target-panel");
        D.tgtFaction = el("tgt-faction");
        D.tgtName = el("tgt-name");
        D.tgtDist = el("tgt-dist");
        D.tgtShield = el("tgt-shield");
        D.tgtHull = el("tgt-hull");
        D.tgtNote = el("tgt-note");

        D.screenMenu = el("screen-menu");
        D.screenDeath = el("screen-death");
        D.screenStation = el("screen-station");
        D.screenHangar = el("screen-hangar");

        D.nameInput = el("name-input");
        D.menuBest = el("menu-best");
        D.deathTitle = el("death-title");
        D.deathSub = el("death-sub");
        D.osCrystals = el("os-crystals");
        D.osKills = el("os-kills");
        D.osBest = el("os-best");
        D.osDeaths = el("os-deaths");

        /* One tab strip, wired the same way everywhere.
     *
     * `root` is the nav element, `sel` the class that marks its buttons, `attr`
     * the data attribute that names the panel, and `prefix` the panel id
     * prefix. Passing them in is what lets the station and the hangar share
     * this instead of keeping two copies that have to stay in step forever.
     *
     * The two strips deliberately do NOT share a class. In a browser
     * `querySelectorAll` is scoped to its element so sharing would be safe,
     * but two tab handlers bound to each other's buttons is exactly the kind
     * of latent collision that only shows up once one of them grows.
     *
     * One panel is visible at a time because the station panel already
     * scrolls on a short phone and four full lists stacked on top of each
     * other is unusable. */
    function wireTabs(root, sel, attr, prefix, onChange) {
        if (!root) return;
        var tabs = root.querySelectorAll(sel);
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener("click", (function (name) {
                return function () {
                    S.Audio.ui();
                    for (var k = 0; k < tabs.length; k++) {
                        var tabName = tabs[k].getAttribute(attr);
                        tabs[k].classList.toggle("is-on", tabName === name);
                        var panel = el(prefix + tabName);
                        if (panel) panel.classList.toggle("is-hidden", tabName !== name);
                    }
                    if (onChange) onChange(name);
                };
            })(tabs[i].getAttribute(attr)));
        }
    }

    /* Station panel pieces are static; the rows inside them are rebuilt
         * on every refresh. */
        D.stEnergy = el("st-energy");
        D.stHull = el("st-hull");
        D.stShield = el("st-shield");
        D.stShieldFill = el("st-shield-fill");
        D.stRows = el("st-rows");
        D.stRepair = el("st-repair");
        D.stRepairBtn = el("st-repair-btn");
        D.stHullFill = el("st-hull-fill");
        D.stLaunch = el("st-launch");
        D.stFee = el("st-fee");
        D.stTier = el("st-tier");
        D.stTabs = el("st-tabs");
        D.stContracts = el("st-contracts");
        D.stCpus = el("st-cpus");
        D.stRefits = el("st-refits");
        D.stSectors = el("st-sectors");
        D.stSectorHint = el("st-sector-hint");
        D.stHoldNote = el("st-hold-note");
        D.tab = "modules";
        D.assistToggle = el("btn-dock-toggle");

        /* Hangar elements. */
        D.hgActive = el("hg-active");
        D.hgEnergy = el("hg-energy");
        D.hgCrystals = el("hg-crystals");
        D.hgHulls = el("hg-hulls");
        D.hgParts = el("hg-parts");
        D.hgFitHint = el("hg-fit-hint");
        D.hgSandboxToggle = el("hg-sandbox-toggle");
        D.hgSandboxNote = el("hg-sandbox-note");
        D.hgSandboxBody = el("hg-sandbox-body");
        D.hgTab = "hulls";

        /* Mode strip and banner. */
        D.stModes = el("st-modes");
        D.modeBanner = el("mode-banner");
        D.modeTag = el("mode-tag");
        D.modeMain = el("mode-main");
        D.modeSide = el("mode-side");
        D.modeFill = el("mode-fill");
        D.modeNote = el("mode-note");

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

        /* Station tabs. */
        wireTabs(D.stTabs, ".st-tab", "data-tab", "st-panel-", function () { refreshStation(); });

        el("st-close").addEventListener("click", function () { S.Audio.ui(); emit("menu"); });
        el("st-repair-btn").addEventListener("click", function () { emit("repair"); });
        D.assistToggle.addEventListener("click", function () { emit("toggleAssist"); });

        /* Hangar: reachable from the station (buying needs the live ship) and
         * from the menu (so a pilot can look at what they own before flying). */
        el("st-hangar").addEventListener("click", function () { S.Audio.ui(); emit("hangar"); });
        el("btn-hangar").addEventListener("click", function () { S.Audio.ui(); emit("hangar"); });
        el("hg-close").addEventListener("click", function () { S.Audio.ui(); emit("hangarClose"); });
        el("hg-sandbox-toggle").addEventListener("click", function () { S.Audio.ui(); emit("sandbox"); });

        /* The hangar reuses the station's .st-tab class. A real DOM scopes
         * querySelectorAll to its element so the two strips never collide,
         * but relying on that twice is how the same bug comes back. */
        wireTabs(D.screenHangar, ".hg-tab", "data-hgtab", "hg-panel-", function () { refreshHangar(); });

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
        /* The haul readout needs the live hold, and the banner is refreshed
         * once a frame, so hand it the ship rather than looking one up. */
        D.modeShip = p;

        if (p) {
            var frac = S.clamp(p.hull / p.maxHull, 0, 1);
            D.hullBar.style.width = (frac * 100).toFixed(1) + "%";
            D.hullBar.classList.toggle("is-critical", frac < 0.3);
            setText(D.hullText, Math.ceil(p.hull) + " / " + p.maxHull);

            var sFrac = p.maxShield ? S.clamp(p.shield / p.maxShield, 0, 1) : 0;
            D.shieldBar.style.width = (sFrac * 100).toFixed(1) + "%";
            setText(D.shieldText, Math.ceil(p.shield) + " / " + p.maxShield);

            /* Hold and tank are two different numbers and the player has to be
             * able to tell them apart at a glance - one is spendable now, the
             * other only after a dock. */
            var holdFrac = p.holdMax ? S.clamp(p.hold / p.holdMax, 0, 1) : 0;
            setText(D.hold, S.fmt(p.hold) + " / " + S.fmt(p.holdMax));
            D.hold.classList.toggle("is-full", holdFrac > 0.995);

            setText(D.energy, S.fmt(p.energy));
            setText(D.crystals, S.fmt(p.crystals));
            setText(D.kills, p.kills);

            /* A hold that silently refuses every pickup is the single
             * most confusing thing this game can do, so it gets said out
             * loud and it flashes. */
            var full = holdFrac > 0.995;
            D.holdFull.classList.toggle("hidden", !full);
            if (full) {
                D.holdFull.classList.toggle("is-blink", ((world.time * 3) | 0) % 2 === 0);
            }

            /* CPU chip: what is fitted, and whether it is ready. */
            var def = S.cpu(p.cpu);
            if (def) {
                D.cpuChip.classList.remove("hidden");
                setText(D.cpuName, def.glyph + " " + def.name.toUpperCase());
                var busy = p.cooldownCpu > 0;
                D.cpuChip.classList.toggle("is-cooling", busy);
                setText(D.cpuTimer, busy ? Math.ceil(p.cooldownCpu) + "s" : "READY");
            } else {
                D.cpuChip.classList.add("hidden");
            }

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

        updateTarget(world);
        updateMode();

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

    /* ===== Target panel =====
     * The explicit lock, with both of the target's pools and the faction that
     * decides which gun works on it.
     *
     * The note under the bars is the part that earns the panel: it tells the
     * player what to DO, not just what they are looking at. "No shields.
     * Lasers." is the difference between a target readout and advice.
     */
    function updateTarget(world) {
        var t = world.target;
        var p = world.player;
        if (!t || !t.alive || !p) {
            D.targetPanel.classList.add("hidden");
            return;
        }
        D.targetPanel.classList.remove("hidden");

        var fac = S.faction(t.faction);
        setText(D.tgtFaction, t.isBounty ? "WANTED" : fac.tag);
        D.tgtFaction.style.color = t.isBounty ? "#ff5470" : fac.color;
        setText(D.tgtName, t.name);

        var d = Math.sqrt(S.dist2(p.x, p.y, t.x, t.y));
        setText(D.tgtDist, Math.round(d) + "");

        var sFrac = t.maxShield ? S.clamp(t.shield / t.maxShield, 0, 1) : 0;
        var hFrac = t.maxHull ? S.clamp(t.hull / t.maxHull, 0, 1) : 0;
        D.tgtShield.style.width = (sFrac * 100).toFixed(1) + "%";
        D.tgtHull.style.width = (hFrac * 100).toFixed(1) + "%";
        D.tgtShield.style.background = sFrac > 0.02 ? "#7dd3fc" : "rgba(125,211,252,0.22)";
        D.tgtHull.style.background = hFrac > 0.35 ? "#ff9f6f" : "#ff5470";

        /* Read the faction's shield fraction rather than the live pool, so
         * the advice stays true for the whole fight instead of flipping
         * halfway through when the shields come down. */
        var frac = fac.shieldFrac;
        setText(D.tgtNote, frac <= 0.001
            ? "No shields. Lasers."
            : frac < 0.6
                ? "Part-shielded. Either gun works."
                : "Shield wall. Ammo, not lasers.");
    }

    /* ===== Mode banner =====
     * Hidden entirely in PATROL. A mode with no clock should not leave a
     * permanent strip on the screen pretending there is one. */
    function updateMode() {
        var r = S.Modes.status();
        if (!r || !r.active) {
            D.modeBanner.classList.add("hidden");
            return;
        }
        D.modeBanner.classList.remove("hidden");

        if (r.id === "wave") {
            setText(D.modeTag, "WAVE");
            setText(D.modeMain, r.wave + " / " + r.waves);
            setText(D.modeSide, r.left > 0 ? r.left + " LEFT" : "INCOMING");
            D.modeFill.style.width =
                (S.clamp(r.wave / r.waves, 0, 1) * 100).toFixed(0) + "%";
            setText(D.modeNote, r.state === "briefing"
                ? "The portal opens in " + Math.ceil(r.brief)
                : "Kill everything the portal sends. Clear all " + r.waves + " to be paid.");
        } else if (r.id === "haul") {
            setText(D.modeTag, "HAUL");
            setText(D.modeMain, Math.ceil(Math.max(0, r.timeLeft)) + "s");
            var ship = D.modeShip;
            var held = ship && ship.hold ? ship.hold : 0;
            setText(D.modeSide, Math.floor(held) + " / " + r.payload);
            D.modeFill.style.width =
                (S.clamp(held / r.payload, 0, 1) * 100).toFixed(0) + "%";
            setText(D.modeNote, "Land " + r.payload + " ⚡ at the station before the clock runs out.");
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
        D.screenHangar.classList.toggle("hidden", name !== "hangar");
        /* The hangar keeps the HUD visible: it is a place you go while
         * docked, and hiding the hull readout there would hide the thing
         * whose numbers the slots are about to change. */
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

    /* ===== Hangar =====
     * A screen, not a station tab, so the station keeps five. It reads the
     * live ship while docked and a projection of the save while docked is
     * not available - see main.js, which always hands it a live ship.
     */
    function showHangar(ship) {
        stationShip = ship;
        refreshHangar();
        showScreen("hangar");
    }

    function refreshHangar() {
        if (!stationShip) return;
        var q = S.Stations.hangarQuote(stationShip);
        var hull = S.hull(q.active);

        setText(D.hgActive, hull.name);
        setText(D.hgEnergy, S.fmt(stationShip.energy));
        setText(D.hgCrystals, S.fmt(stationShip.crystals));

        /* --- hulls --- */
        var hulls = "";
        for (var i = 0; i < q.hulls.length; i++) {
            var h = q.hulls[i];
            var style = h.color ? ' style="color:' + h.color + '"' : "";
            var action;
            if (h.active) action = '<span class="st-cost is-max">ACTIVE</span>';
            else if (h.owned) action = '<button class="st-buy" data-hull="' + escapeHtml(h.id) + '">FLY</button>';
            else action = '<button class="st-buy" data-hull="' + escapeHtml(h.id) + '"' +
                (h.affordable ? "" : " disabled") + ">" + S.fmt(h.cost) + " ⚡</button>";

            hulls +=
                '<div class="hull-card' + (h.active ? " is-active" : "") +
                    (h.owned ? "" : " is-locked") + '">' +
                    '<div class="hc-head"' + style + ">" +
                        '<span class="hc-glyph">' + h.glyph + "</span>" +
                        '<span class="hc-name">' + escapeHtml(h.name) + "</span>" +
                        '<span class="hc-tag">' + escapeHtml(h.tag) + "</span>" +
                    "</div>" +
                    '<span class="hc-passive">' + escapeHtml(h.passive) + "</span>" +
                    '<p class="hc-blurb">' + escapeHtml(h.blurb) + "</p>" +
                    '<span class="hc-detail">' + escapeHtml(h.detail) + "</span>" +
                    '<div class="st-row-foot">' + action + "</div>" +
                "</div>";
        }
        if (D.hgHulls._html !== hulls) {
            D.hgHulls.innerHTML = hulls;
            var hullBtns = D.hgHulls.querySelectorAll("[data-hull]");
            for (var h2 = 0; h2 < hullBtns.length; h2++) {
                hullBtns[h2].addEventListener("click", (function (id) {
                    return function () { emit("hull", id); };
                })(hullBtns[h2].getAttribute("data-hull")));
            }
        }

        /* --- parts --- */
        var parts = "";
        for (var s = 0; s < q.slots.length; s++) {
            var slot = q.slots[s];
            parts += '<p class="slot-label">' + slot.slot.toUpperCase() + "</p><div class=\"part-row\">";
            for (var p = 0; p < slot.options.length; p++) {
                var o = slot.options[p];
                /* A fitted part is shown as pressed and costs nothing: the
                 * whole point of the panel is that swapping is free. */
                var label = o.fitted ? "FITTED"
                    : !o.owned ? S.fmt(o.cost) + " ⚡"
                    : o.maxed ? "MAX"
                    : "LV" + o.level + " → " + S.fmt(o.cost) + " ⚡";
                var cls = "part-card" + (o.fitted ? " is-fitted" : (o.owned ? "" : " is-empty"));
                var disabled = o.fitted || (!o.owned && !o.affordable) || (o.owned && o.maxed);
                parts +=
                    '<button class="' + cls + '" data-part="' + escapeHtml(o.key) + '"' +
                        (disabled ? " disabled" : "") + ' title="' + escapeHtml(o.blurb) + '">' +
                        '<span class="pc-name">' + o.glyph + " " + escapeHtml(o.name) + "</span>" +
                        '<span class="pc-detail">' + escapeHtml(o.detail) + "</span>" +
                        '<span class="pc-foot">' + label + "</span>" +
                    "</button>";
            }
            parts += "</div>";
        }
        if (D.hgParts._html !== parts) {
            D.hgParts.innerHTML = parts;
            var partBtns = D.hgParts.querySelectorAll("[data-part]");
            for (var b = 0; b < partBtns.length; b++) {
                partBtns[b].addEventListener("click", (function (key) {
                    return function () { emit("part", key); };
                })(partBtns[b].getAttribute("data-part")));
            }
        }
        setText(D.hgFitHint,
            "Fitting " + hull.name + ". Three slots; buying a component installs it, and swapping is free.");

        /* --- sandbox --- */
        var on = !!(stationShip.hangar && stationShip.hangar.sandbox);
        D.hgSandboxToggle.textContent = on ? "SANDBOX ON" : "SANDBOX OFF";
        D.hgSandboxToggle.classList.toggle("is-on", on);
        setText(D.hgSandboxNote, on
            ? "Sandbox is <b>on</b>. These write to this save exactly like anything else — crystals raise the sector gate, so a big crystal grant drops you into a harder map."
            : "Sandbox is <b>off</b>. Turn it on to grant currency and unlock everything.");
        D.hgSandboxBody.classList.toggle("is-hidden", !on);

        if (on) {
            var srows = "";
            var grants = [
                { key: "energy", label: "+500 energy", value: 500 },
                { key: "energy", label: "+2500 energy", value: 2500 },
                { key: "crystals", label: "+250 crystals", value: 250 },
                { key: "crystals", label: "+5000 crystals", value: 5000 },
            ];
            srows += '<div class="sandbox-row">';
            for (var g = 0; g < grants.length; g++) {
                srows += '<button class="st-buy" data-cheat="grant:' + grants[g].key +
                    ':' + grants[g].value + '">' + grants[g].label + "</button>";
            }
            srows += "</div>";
            srows += '<div class="sandbox-row">' +
                '<button class="st-buy" data-cheat="unlock">Unlock all hulls &amp; parts</button>' +
                '<button class="st-buy" data-cheat="max">Max every module &amp; part</button>' +
                "</div>";
            if (D.hgSandboxBody._html !== srows) {
                D.hgSandboxBody.innerHTML = srows;
                var cheatBtns = D.hgSandboxBody.querySelectorAll("[data-cheat]");
                for (var c = 0; c < cheatBtns.length; c++) {
                    cheatBtns[c].addEventListener("click", (function (spec) {
                        return function () { emit("cheat", spec); };
                    })(cheatBtns[c].getAttribute("data-cheat")));
                }
            }
        }
    }

    /* ===== Modes =====
     * A mode is a variant of the sector, so it sits above the tabs rather
     * than inside one: it changes what you are doing, not what you are
     * buying. Selecting one is free and takes effect on launch. */
    function renderModes(ship) {
        var rows = "";
        for (var i = 0; i < S.MODES.length; i++) {
            var m = S.MODES[i];
            var on = (ship.mode || "patrol") === m.id;
            rows +=
                '<div class="st-row mode' + (on ? " is-on" : "") + '">' +
                    '<div class="st-row-head">' +
                        '<span class="st-glyph">' + m.glyph + "</span>" +
                        '<span class="st-name">' + escapeHtml(m.name) + "</span>" +
                        (on ? '<span class="st-cost is-max">SELECTED</span>'
                            : '<button class="st-buy" data-mode="' + escapeHtml(m.id) + '">PICK</button>') +
                    "</div>" +
                    '<p class="st-blurb">' + escapeHtml(m.blurb) + "</p>" +
                    '<span class="mode-detail">' + escapeHtml(m.detail) + "</span>" +
                "</div>";
        }
        if (D.stModes._html === rows) return;
        D.stModes.innerHTML = rows;
        var btns = D.stModes.querySelectorAll("[data-mode]");
        for (var b = 0; b < btns.length; b++) {
            btns[b].addEventListener("click", (function (id) {
                return function () { emit("mode", id); };
            })(btns[b].getAttribute("data-mode")));
        }
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
        setText(D.stShield, Math.ceil(q.shield) + " / " + q.maxShield);
        setText(D.stTier, S.tierForShip(stationShip.modules));

        var hullFrac = S.clamp(q.hull / Math.max(1, q.maxHull), 0, 1);
        D.stHullFill.style.width = (hullFrac * 100).toFixed(1) + "%";
        D.stHullFill.classList.toggle("is-critical", hullFrac < 0.3);

        var shFrac = S.clamp(q.shield / Math.max(1, q.maxShield), 0, 1);
        D.stShieldFill.style.width = (shFrac * 100).toFixed(1) + "%";

        /* The hold has already been deposited by the time the panel opens,
         * so the note describes what the trip just paid rather than a live
         * number. Saying "0" there would read as a loss. */
        setText(D.stHoldNote, stationShip.lastDeposit > 0
            ? "Docked with " + S.fmt(stationShip.lastDeposit) +
              " ⚡ in the hold. Crystals are yours forever; the tank is only yours until you wreck."
            : "Your hold is empty. Everything you scoop up is docked when you launch.");

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
        renderModes(stationShip);
        renderCpus(stationShip);
        renderRefits(stationShip);
        renderSectors();
    }

    /* ===== CPUs =====
     * One slot. Buying installs and fits; the FIT/UNEQUIP button is free and
     * always live, because a choice you cannot take back is not a choice.
     */
    function renderCpus(ship) {
        var q = S.Stations.cpuQuote(ship);
        var rows = "";
        for (var i = 0; i < q.length; i++) {
            var c = q[i];
            var state = c.fitted ? " is-fitted" : (c.owned ? "" : " is-locked");
            rows +=
                '<div class="st-row cpu' + state + '">' +
                    '<div class="st-row-head">' +
                        '<span class="st-glyph">' + c.glyph + "</span>" +
                        '<span class="st-name">' + escapeHtml(c.name) + "</span>" +
                        (c.fitted ? '<span class="st-cost is-max">FITTED</span>'
                                  : c.owned ? '<span class="st-level">OWNED</span>' : "") +
                    "</div>" +
                    '<p class="st-blurb">' + escapeHtml(c.blurb) + "</p>" +
                    '<div class="st-row-foot">' +
                        '<span class="st-delta">' + escapeHtml(c.detail) + "</span>" +
                        (c.fitted
                            ? '<button class="st-buy is-ghost" data-fit="">UNEQUIP</button>'
                            : c.owned
                                ? '<button class="st-buy" data-fit="' + escapeHtml(c.key) + '">FIT</button>'
                                : '<button class="st-buy" data-cpu="' + escapeHtml(c.key) + '"' +
                                  (c.affordable ? "" : " disabled") + ">" +
                                  S.fmt(c.cost) + " ⚡</button>") +
                    "</div>" +
                "</div>";
        }
        if (D.stCpus._html === rows) return;
        D.stCpus.innerHTML = rows;

        var buys = D.stCpus.querySelectorAll("[data-cpu]");
        for (var i = 0; i < buys.length; i++) {
            buys[i].addEventListener("click", (function (key) {
                return function () { emit("buyCpu", key); };
            })(buys[i].getAttribute("data-cpu")));
        }
        var fits = D.stCpus.querySelectorAll("[data-fit]");
        for (var i = 0; i < fits.length; i++) {
            fits[i].addEventListener("click", (function (key) {
                /* An empty attribute means "unequip", which is a real state
                 * and not a missing value. */
                return function () { emit("fitCpu", key || null); };
            })(fits[i].getAttribute("data-fit")));
        }
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

    /* ===== Maps =====
     * One list for both kinds. A frontier sector and a faction's territory
     * are the same thing to the generator and to the station, so they are
     * the same thing here - the badge is there so you can tell at a glance
     * that THE HIVE is somebody's home and not a stretch of frontier. */
    function renderSectors() {
        var stats = S.Storage.getStats();
        var save = S.Storage.getShip();
        var here = S.World.world.sectorId || "rook";
        var prog = S.Sector.unlockProgress(stats.crystalsAllTime);
        setText(D.stSectorHint, prog.done
            ? "All maps open. Lifetime crystals: " + S.fmt(stats.crystalsAllTime) + " ◈"
            : "Lifetime crystals: " + S.fmt(stats.crystalsAllTime) + " ◈  ·  " +
              S.fmt(prog.short) + " more for " + prog.next.name);

        var rows = "";
        for (var i = 0; i < S.Sector.all.length; i++) {
            var sec = S.Sector.all[i];
            var open = S.Sector.isUnlocked(sec.id, stats.crystalsAllTime);
            var isHere = sec.id === here;
            var best = save.sectorBest[sec.id] || 0;
            var isFaction = sec.kind === "faction";
            var fac = isFaction ? S.faction(sec.faction) : null;

            var badge = isFaction
                ? '<span class="st-badge is-faction" style="color:' + fac.color +
                    ';border-color:' + fac.color + '">' + escapeHtml(fac.tag) + "</span>"
                : '<span class="st-badge">SECTOR</span>';

            var extra = isFaction
                ? " · " + escapeHtml(fac.note)
                : " · tier " + sec.tierCap;

            rows +=
                '<div class="st-row sector' + (open ? "" : " is-locked") +
                    (isHere ? " is-here" : "") +
                    (isFaction ? " is-faction" : "") + '">' +
                    '<div class="st-row-head">' +
                        badge +
                        '<span class="st-name">' + escapeHtml(sec.name) + "</span>" +
                        (isHere ? '<span class="st-cost is-max">HERE</span>'
                                : open ? '<span class="st-level">◈ ×' + sec.payout.toFixed(2) + "</span>"
                                       : '<span class="st-level">LOCKED</span>') +
                    "</div>" +
                    '<div class="st-row-foot">' +
                        '<span class="st-delta">' + escapeHtml(sec.subtitle) +
                            (best ? " · best " + S.fmt(best) + " ◈" : "") +
                            extra + "</span>" +
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
        showHangar: showHangar,
        refreshHangar: refreshHangar,
        updateMode: updateMode,
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