/*
 * DOM interface: menu, HUD, drydock, feed, modals and the touch controls.
 * The canvas draws the world; everything readable lives here so it stays
 * crisp, selectable and accessible.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var S = CB.Shipyard;
    var hooks = {};
    var el = {};
    var lastFeedKey = "";
    var lastRelayKey = "";
    var hudAcc = 0;
    var mapAcc = 0;
    var toastUntil = 0;
    var bannerUntil = 0;
    var profile = null;
    var touchMode = false;

    function $(id) { return document.getElementById(id); }

    function fmt(n) {
        n = Math.max(0, Math.round(n || 0));
        return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(n);
    }

    function timeFmt(sec) {
        sec = Math.max(0, Math.ceil(sec));
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function cache() {
        [
            "hud", "menu", "hangar", "pause", "gameover", "howto", "settings",
            "timer", "objective", "objective-detail", "relay-pips", "score-free", "score-corsair",
            "killfeed", "zone-banner", "event-message", "comms", "hull-name", "hull-tier",
            "bar-hull", "bar-shield", "bar-energy", "txt-hull", "txt-shield", "txt-energy",
            "cargo-units", "cargo-max", "credits", "bar-cargo", "ability-name", "ability-cd",
            "zone-tag", "minimap", "dock-prompt", "toast", "touch-controls",
            "stick-left", "stick-right", "btn-ability", "btn-boost", "btn-dock", "btn-pause",
            "pause-btn", "best-score", "best-wins", "best-kills", "best-ore",
            "hangar-credits", "hangar-hull", "hangar-role", "hangar-stats", "hangar-note",
            "hull-preview", "upgrade-title", "upgrade-options", "btn-undock", "btn-hangar-menu",
            "result-kicker", "result-title", "result-reason", "result-score", "result-kills",
            "result-ore", "result-time", "btn-retry", "btn-result-menu",
            "btn-launch", "btn-howto", "btn-howto-close", "btn-settings", "btn-settings-close",
            "btn-resume", "btn-pause-settings", "btn-pause-menu", "btn-hangar-menu"
        ].forEach(function (id) { el[id] = $(id); });
    }

    function bind(id, fn) {
        if (el[id]) el[id].addEventListener("click", fn);
    }

    function init(h) {
        hooks = h || {};
        cache();
        profile = CB.Storage.loadProfile();
        touchMode = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
        if (touchMode) document.body.classList.add("touch");

        bind("btn-launch", function () { CB.Audio.resume(); hooks.onLaunch && hooks.onLaunch(); });
        bind("btn-retry", function () { CB.Audio.resume(); hooks.onRetry && hooks.onRetry(); });
        bind("btn-result-menu", function () { hooks.onMenu && hooks.onMenu(); });
        bind("btn-howto", function () { CB.Audio.ui(); showHowTo(true); });
        bind("btn-howto-close", function () { showHowTo(false); });
        bind("btn-settings", function () { CB.Audio.ui(); showSettings(true); });
        bind("btn-settings-close", function () { showSettings(false); });
        bind("btn-resume", function () { hooks.onResume && hooks.onResume(); });
        bind("btn-pause-settings", function () { showSettings(true); });
        bind("btn-pause-menu", function () { hooks.onAbandon && hooks.onAbandon(); });
        bind("pause-btn", function () { hooks.onPause && hooks.onPause(); });
        bind("btn-pause", function () { hooks.onPause && hooks.onPause(); });
        bind("btn-undock", function () { CB.Audio.ui(); hooks.onUndock && hooks.onUndock(); });
        bind("btn-hangar-menu", function () { hooks.onAbandon && hooks.onAbandon(); });
        bind("btn-ability", function () { hooks.onAbility && hooks.onAbility(); });
        bind("btn-dock", function () { hooks.onInteract && hooks.onInteract(); });

        if (el["btn-boost"]) {
            var boostOn = function (e) {
                e.preventDefault();
                CB.Input.state.boost = true;
                el["btn-boost"].classList.add("active");
            };
            var boostOff = function (e) {
                if (e) e.preventDefault();
                CB.Input.state.boost = false;
                el["btn-boost"].classList.remove("active");
            };
            el["btn-boost"].addEventListener("pointerdown", boostOn);
            el["btn-boost"].addEventListener("pointerup", boostOff);
            el["btn-boost"].addEventListener("pointercancel", boostOff);
            el["btn-boost"].addEventListener("pointerleave", boostOff);
        }

        document.querySelectorAll("[data-diff]").forEach(function (b) {
            b.addEventListener("click", function () {
                CB.Audio.ui();
                var d = b.getAttribute("data-diff");
                document.querySelectorAll("[data-diff]").forEach(function (x) { x.classList.remove("on"); });
                b.classList.add("on");
                CB.Storage.patchProfile(function (p) { p.difficulty = d; });
                if (hooks.onDifficulty) hooks.onDifficulty(d);
            });
        });

        document.querySelectorAll("[data-setting]").forEach(function (b) {
            b.addEventListener("click", function () {
                var key = b.getAttribute("data-setting");
                var p = CB.Storage.loadProfile();
                var v = p.settings[key];
                if (key === "quality") v = v === "high" ? "low" : "high";
                else v = !v;
                CB.Storage.setSetting(key, v);
                if (key === "sound") CB.Audio.setEnabled(v);
                if (key === "shake") { /* read at runtime */ }
                if (key === "quality" && CB.Render) CB.Render.setQuality(v);
                if (key === "aimAssist") { /* read at runtime */ }
                refreshSettings();
                CB.Audio.ui();
            });
        });

        bind("upgrade-options", function () {});
        if (el["upgrade-options"]) {
            el["upgrade-options"].addEventListener("click", function (e) {
                var btn = e.target.closest("[data-hull]");
                if (!btn) return;
                if (hooks.onUpgrade) hooks.onUpgrade(btn.getAttribute("data-hull"));
            });
        }

        refreshSettings();
        refreshProfile();
        CB.Minimap.init(el["minimap"]);
        window.addEventListener("resize", function () {
            if (CB.Minimap) CB.Minimap.resize();
        });

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") {
                /* main.js pauses through its own hook; no popup here. */
            }
        });
    }

    function refreshProfile() {
        profile = CB.Storage.loadProfile();
        if (el["best-score"]) el["best-score"].textContent = fmt(profile.bestScore);
        if (el["best-wins"]) el["best-wins"].textContent = fmt(profile.wins);
        if (el["best-kills"]) el["best-kills"].textContent = fmt(profile.kills);
        if (el["best-ore"]) el["best-ore"].textContent = fmt(profile.ore);
        document.querySelectorAll("[data-diff]").forEach(function (b) {
            b.classList.toggle("on", b.getAttribute("data-diff") === (profile.difficulty || "pilot"));
        });
    }

    function refreshSettings() {
        var p = CB.Storage.loadProfile();
        var s = p.settings;
        document.querySelectorAll("[data-setting]").forEach(function (b) {
            var key = b.getAttribute("data-setting");
            var v = s[key];
            if (key === "quality") {
                b.textContent = v === "low" ? "LOW" : "HIGH";
                b.classList.toggle("on", v !== "low");
            } else {
                b.textContent = v ? "ON" : "OFF";
                b.classList.toggle("on", !!v);
            }
        });
    }

    function setScreen(name) {
        ["menu", "hangar", "pause", "gameover", "howto", "settings"].forEach(function (id) {
            if (el[id]) {
                if (id === name) el[id].removeAttribute("hidden");
                else el[id].setAttribute("hidden", "");
            }
        });
        el.hud.hidden = name !== null && name !== "hud";
        if (name === "hud") el.hud.hidden = false;
    }

    function showMenu() {
        refreshProfile();
        lastFeedKey = "";
        lastRelayKey = "";
        setScreen("menu");
        el.hud.hidden = true;
        el["touch-controls"].hidden = true;
    }

    function showHUD() {
        lastFeedKey = "";
        lastRelayKey = "";
        setScreen("hud");
        el.hud.hidden = false;
        if (touchMode) {
            el["touch-controls"].hidden = false;
            document.body.classList.add("touch");
        }
    }

    function showPause() {
        el.pause.removeAttribute("hidden");
    }
    function hidePause() {
        el.pause.setAttribute("hidden", "");
    }

    function showHowTo(on) {
        if (on) el.howto.removeAttribute("hidden");
        else el.howto.setAttribute("hidden", "");
    }
    function showSettings(on) {
        if (on) { refreshSettings(); el.settings.removeAttribute("hidden"); }
        else el.settings.setAttribute("hidden", "");
    }

    function showHangar(state) {
        var p = state.player;
        if (!p) return;
        el["hangar"].removeAttribute("hidden");
        refreshHangar(state);
    }

    function hideHangar() {
        el["hangar"].setAttribute("hidden", "");
    }

    function statRow(label, value) {
        return "<div><span>" + label + "</span><b>" + value + "</b></div>";
    }

    function delta(cur, next, suffix) {
        var d = Math.round(next - cur);
        if (d === 0) return "<span>±0</span>";
        var cls = d > 0 ? "up" : "down";
        return "<span class='" + cls + "'>" + (d > 0 ? "+" : "") + d + (suffix || "") + "</span>";
    }

    function refreshHangar(state) {
        var p = state.player;
        if (!p) return;
        var hull = S.getHull(p.hullId);
        el["hangar-credits"].textContent = fmt(p.credits);
        el["hangar-hull"].textContent = hull.name;
        el["hangar-role"].textContent = (hull.tier === 1 ? "STARTER" : (C.LINES[hull.line] ? C.LINES[hull.line].role : "HULL")) + " · TIER " + hull.tier;
        el["hangar-stats"].innerHTML =
            statRow("HULL", Math.round(hull.hull)) +
            statRow("SHIELD", Math.round(hull.shield)) +
            statRow("SPEED", Math.round(hull.speed)) +
            statRow("CARGO", hull.cargo) +
            statRow("DAMAGE", Math.round(hull.damage)) +
            statRow("RATE", hull.rate.toFixed(1) + "/s") +
            statRow("RANGE", hull.range) +
            statRow("ABILITY", hull.abilityName);
        if (CB.Render) CB.Render.drawHullPreview(el["hull-preview"], hull, hull.line);

        var opts = S.options(p);
        var cost = S.nextCost(p);
        el["upgrade-title"].textContent = p.tier >= 6 ? "HULL AT MAXIMUM" :
            p.tier === 1 ? "CHOOSE A DOCTRINE" : "NEXT HULL IN LINE";
        var html = "";
        if (!opts.length) {
            html = "<div class='upgrade-card current'><div><div class='uc-name'>" + hull.name + "</div><div class='uc-role'>TIER 6 · MAXIMUM</div><div class='uc-stats'>Every system is already bolted on. Spend your credits on surviving.</div></div><button class='uc-buy max' disabled>MAX</button></div>";
        }
        opts.forEach(function (o) {
            var line = o.line ? C.LINES[o.line] : null;
            var can = p.credits >= cost;
            html += "<div class='upgrade-card'>" +
                "<div><div class='uc-name' style='color:" + (o.color || "#fde68a") + "'>" + o.name + "</div>" +
                "<div class='uc-role'>" + (line ? line.name + " · " : "") + "TIER " + o.tier + "</div>" +
                "<div class='uc-stats'>HULL " + delta(hull.hull, o.hull) + " · SHIELD " + delta(hull.shield, o.shield) +
                " · SPEED " + delta(hull.speed, o.speed) + "<br>CARGO " + delta(hull.cargo, o.cargo) +
                " · DMG " + delta(hull.damage, o.damage) + " · RATE " + delta(hull.rate, o.rate, "/s") +
                "<br>" + (line ? line.blurb : "") + "</div></div>" +
                "<button class='uc-buy' data-hull='" + o.id + "' " + (can ? "" : "disabled") + ">" +
                (can ? "UPGRADE · " + cost + " cr" : "NEED " + cost + " cr") + "</button></div>";
        });
        el["upgrade-options"].innerHTML = html;
        el["hangar-note"].textContent = p.tier === 1 ?
            "Pick a doctrine. Tier 2 is the only real fork; after that each line runs straight to tier 6." :
            "Docking repairs your hull for free. Banking is automatic when you dock.";
    }

    function showGameOver(state, outcome, reason) {
        setScreen("gameover");
        el.hud.hidden = true;
        var title = outcome === "win" ? "THE NEXUS FALLS" :
            outcome === "draw" ? "A COLD PEACE" : "THE BELT TAKES YOU";
        if (reason === "time" && outcome === "loss") title = "THE RING COLLAPSES";
        if (reason === "home") title = "THE ANCHORAGE BURNS";
        el["result-title"].textContent = title;
        el["result-title"].className = outcome;
        el["result-kicker"].textContent = outcome === "win" ? "RUN COMPLETE" : "RUN LOST";
        el["result-reason"].textContent =
            reason === "nexus" ? "The Corsair Nexus is scrap. The belt is yours, for now." :
            reason === "home" ? "The Anchorage's reactor went dark. The corsairs own the ring." :
            reason === "time" ? "The ring collapsed with the scoreboard on " + (outcome === "win" ? "your side." : "theirs.") :
            "The belt remembers every hull that stayed too long.";
        el["result-score"].textContent = fmt(state.player ? state.player.score : 0);
        el["result-kills"].textContent = fmt(state.stats.kills);
        el["result-ore"].textContent = fmt(state.stats.ore);
        el["result-time"].textContent = timeFmt(state.time);
        refreshProfile();
    }

    function setZoneBanner(zone) {
        if (!el["zone-banner"]) return;
        el["zone-banner"].style.color = zone.color;
        el["zone-banner"].querySelector(".zone-name").textContent = zone.name;
        el["zone-banner"].querySelector(".zone-sub").textContent = zone.sub;
        el["zone-banner"].querySelector(".zone-blurb").textContent = zone.blurb;
        el["zone-banner"].hidden = false;
        bannerUntil = performance.now() + 3400;
    }

    function toast(text, ms) {
        if (!el.toast) return;
        el.toast.textContent = text;
        el.toast.hidden = false;
        toastUntil = performance.now() + (ms || 2600);
    }

    function updateFeed(state) {
        var key = state.feed.length + "|" + (state.feed[0] ? state.feed[0].text : "");
        if (key === lastFeedKey) return;
        lastFeedKey = key;
        var html = "";
        for (var i = 0; i < Math.min(6, state.feed.length); i++) {
            var f = state.feed[i];
            html += "<div class='feed-item' style='color:" + f.color + "'>" + f.text + "</div>";
        }
        el.killfeed.innerHTML = html;
    }

    function updateRelays(state) {
        var key = state.relays.map(function (r) { return r.owner; }).join(",");
        if (key === lastRelayKey) return;
        lastRelayKey = key;
        var html = "";
        state.relays.forEach(function (r) {
            html += "<i class='" + r.owner + "' title='Relay " + (r.index + 1) + "'></i>";
        });
        el["relay-pips"].innerHTML = html;
    }

    function updateObjective(state) {
        var p = state.player;
        if (!p) return;
        var held = state.relays.filter(function (r) { return r.owner === "free"; }).length;
        var o, d;
        if (p.carrierCore) {
            o = "DELIVER THE CORE";
            d = "Fly into the Corsair Nexus at the Scab's edge.";
        } else if (state.coreCarrier && state.coreCarrier.team === "corsair") {
            o = "HUNT THE CORE CARRIER";
            d = state.coreCarrier.name + " is carrying the core toward the Anchorage.";
        } else if (state.nexus.shield <= 0) {
            o = "DESTROY THE NEXUS";
            d = "Hull " + Math.round(state.nexus.hp / state.nexus.hpMax * 100) + "% · hit it now.";
        } else if (state.nexus.shieldDownUntil > state.time) {
            o = "DESTROY THE NEXUS";
            d = "The core breach has exposed the hull.";
        } else {
            o = "HOLD TWO RELAYS";
            d = held + "/3 held · Nexus shield " + Math.round(state.nexus.shield / state.nexus.shieldMax * 100) + "%";
        }
        if (state.remaining <= 60) {
            o = "SURVIVE THE COLLAPSE";
            d = "Score " + fmt(state.teamScore.free) + " — " + fmt(state.teamScore.corsair);
        }
        el.timer.textContent = timeFmt(state.remaining);
        el.objective.textContent = o;
        el["objective-detail"].textContent = d;
    }

    function updateTouch(state) {
        if (!touchMode && !CB.Input.state.usingTouch) {
            el["touch-controls"].hidden = true;
            return;
        }
        touchMode = true;
        document.body.classList.add("touch");
        el["touch-controls"].hidden = false;
        var l = CB.Input.state.leftStick;
        var r = CB.Input.state.rightStick;
        [[el["stick-left"], l], [el["stick-right"], r]].forEach(function (pair) {
            var node = pair[0], stick = pair[1];
            if (!node) return;
            if (stick.active) {
                node.style.display = "block";
                node.style.left = stick.baseX + "px";
                node.style.top = stick.baseY + "px";
                var knob = node.querySelector(".knob");
                if (knob) knob.style.transform = "translate(" + (stick.dx * 36) + "px," + (stick.dy * 36) + "px)";
            } else {
                node.style.display = "none";
            }
        });
        var p = state.player;
        var near = p && p.alive && !p.docked &&
            CB.World.dist(p.x, p.y, state.home.x, state.home.y) < state.home.dockRadius;
        el["btn-dock"].style.opacity = near ? "1" : "0.35";
    }

    function update(state, dt) {
        if (!state || state.phase !== "running") return;
        var p = state.player;
        if (!p) return;

        hudAcc += dt;
        mapAcc += dt;

        if (hudAcc > 0.05) {
            hudAcc = 0;
            updateObjective(state);
            updateRelays(state);
            updateFeed(state);
            el["score-free"].textContent = fmt(state.teamScore.free);
            el["score-corsair"].textContent = fmt(state.teamScore.corsair);
            el["hull-name"].textContent = p.name;
            el["hull-tier"].textContent = "T" + p.tier;
            el["bar-hull"].style.width = Math.max(0, p.hull / p.hullMax * 100) + "%";
            el["bar-shield"].style.width = Math.max(0, p.shield / p.shieldMax * 100) + "%";
            el["bar-energy"].style.width = Math.max(0, p.energy / p.energyMax * 100) + "%";
            el["txt-hull"].textContent = Math.max(0, Math.round(p.hull));
            el["txt-shield"].textContent = Math.max(0, Math.round(p.shield));
            el["txt-energy"].textContent = Math.max(0, Math.round(p.energy));
            el["cargo-units"].textContent = p.cargoUnits;
            el["cargo-max"].textContent = p.stats.cargo;
            el["credits"].textContent = fmt(p.credits);
            el["bar-cargo"].style.width = Math.min(100, p.cargoUnits / p.stats.cargo * 100) + "%";
            el["ability-name"].textContent = p.abilityName;
            el["ability-cd"].textContent = p.abilityCdLeft > 0 ? p.abilityCdLeft.toFixed(1) + "s" : "READY";
            el["ability-cd"].style.color = p.abilityCdLeft > 0 ? "#fb7185" : "#86efac";
            var zone = CB.Zones.zoneAt(p.x, p.y);
            el["zone-tag"].textContent = zone.name;
            el["zone-tag"].style.color = zone.color;

            var near = p.alive && !p.docked && CB.World.dist(p.x, p.y, state.home.x, state.home.y) < state.home.dockRadius;
            var dockEl = el["dock-prompt"];
            if (near && p.outlawUntil <= state.time) {
                dockEl.hidden = false;
                dockEl.innerHTML = "<span class='key'>E</span> DOCK AT ANCHORAGE";
            } else if (near && p.outlawUntil > state.time) {
                dockEl.hidden = false;
                dockEl.innerHTML = "DOCKING DENIED — OUTLAW";
            } else {
                dockEl.hidden = true;
            }

            if (state.messageUntil > state.time && state.message) {
                el["event-message"].textContent = state.message;
                el["event-message"].hidden = false;
            } else {
                el["event-message"].hidden = true;
            }
            if (state.comms) {
                el.comms.textContent = state.comms;
                el.comms.hidden = false;
            } else {
                el.comms.hidden = true;
            }
            updateTouch(state);
        }

        if (performance.now() > toastUntil && el.toast) el.toast.hidden = true;
        if (performance.now() > bannerUntil && el["zone-banner"]) el["zone-banner"].hidden = true;

        if (mapAcc > 0.12) {
            mapAcc = 0;
            CB.Minimap.draw(state);
        }
    }

    CB.UI = {
        init: init,
        showMenu: showMenu,
        showHUD: showHUD,
        showPause: showPause,
        hidePause: hidePause,
        showHangar: showHangar,
        hideHangar: hideHangar,
        refreshHangar: refreshHangar,
        showGameOver: showGameOver,
        showHowTo: showHowTo,
        showSettings: showSettings,
        update: update,
        toast: toast,
        setZoneBanner: setZoneBanner,
        refreshProfile: refreshProfile,
        refreshSettings: refreshSettings,
        refreshSettingsPanel: refreshSettings,
        getTouchMode: function () { return touchMode; }
    };
})(window.CB = window.CB || {});
