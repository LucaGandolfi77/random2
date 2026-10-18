/*
 * IRONFALL - HUD, screens, shop, kill feed.
 *
 * All DOM. The renderer owns the world; this owns every pixel that is not
 * part of the world, and it reads the same records the renderer does rather
 * than keeping its own copy. Two copies of a champion's health, one updated
 * and one not, is the single most common way a HUD starts lying.
 *
 * Screens are display-toggled rather than rebuilt. A champion select that
 * rebuilds its eight cards every time it opens is a champion select that
 * flashes, and on a mid-range phone the flash lasts four hundred
 * milliseconds.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var PAL = S.PAL;

    var el = {};
    var handlers = {};
    var shopOpen = false;
    var scoreboardOpen = false;
    var feed = [];
    var feedTimer = 0;

    function byId(id) { return document.getElementById(id); }

    function init(h) {
        handlers = h || {};
        el = {
            hud: byId("hud"),
            hpFill: byId("hp-fill"),
            hpText: byId("hp-text"),
            mpFill: byId("mp-fill"),
            mpText: byId("mp-text"),
            level: byId("hud-level"),
            name: byId("hud-name"),
            gold: byId("hud-gold"),
            cs: byId("hud-cs"),
            kda: byId("hud-kda"),
            timer: byId("hud-timer"),
            towers: [byId("tower-0-top"), byId("tower-0-mid"), byId("tower-0-bot"),
                byId("tower-1-top"), byId("tower-1-mid"), byId("tower-1-bot")],
            pads: [],
            feed: byId("killfeed"),
            respawn: byId("respawn"),
            respawnText: byId("respawn-text"),
            shop: byId("shop-panel"),
            shopList: byId("shop-list"),
            shopGold: byId("shop-gold"),
            scoreboard: byId("scoreboard"),
            recall: byId("btn-recall"),
            pingBtn: byId("btn-ping")
        };

        var pads = document.querySelectorAll("[data-slot]");
        for (var i = 0; i < pads.length; i++) el.pads.push(pads[i]);

        bindScreens();
    }

    /* ===== Screens ===== */
    var SCREENS = ["menu", "champs", "runes", "records", "settings", "outcome", "pause"];

    function showScreen(name) {
        for (var i = 0; i < SCREENS.length; i++) {
            var s = byId("screen-" + SCREENS[i]);
            if (!s) continue;
            s.classList.toggle("is-on", SCREENS[i] === name);
        }
        el.hud.classList.toggle("is-on", name === null || name === "game");
        document.body.classList.toggle("in-match", name === null || name === "game");
    }

    function bindScreens() {
        bind("btn-play", function () { if (handlers.onPlay) handlers.onPlay(); });
        bind("btn-runes", function () { openRunes(); });
        bind("btn-records", function () { showRecords(); });
        bind("btn-settings", function () { showScreen("settings"); });
        bind("btn-back-menu", function () { showScreen("menu"); });
        bind("btn-runes-back", function () { showScreen("menu"); });
        bind("btn-records-back", function () { showScreen("menu"); });
        bind("btn-settings-back", function () { showScreen("menu"); });
        bind("btn-champs-back", function () { showScreen("menu"); });
        bind("btn-again", function () { if (handlers.onPlay) handlers.onPlay(); });
        bind("btn-outcome-menu", function () { if (handlers.onMenu) handlers.onMenu(); });
        bind("btn-pause", function () { showScreen("pause"); if (handlers.onPause) handlers.onPause(true); });
        bind("btn-resume", function () { showScreen(null); if (handlers.onPause) handlers.onPause(false); });
        bind("btn-quit", function () { if (handlers.onQuit) handlers.onQuit(); });
        bind("btn-recall", function () { if (handlers.onRecall) handlers.onRecall(); });
        bind("btn-shop-toggle", function () { if (handlers.onShop) handlers.onShop(); });
        bind("btn-shop-close", function () { toggleShop(false); });

        /* Difficulty picker: three buttons, one active. */
        var diffs = document.querySelectorAll("[data-difficulty]");
        for (var i = 0; i < diffs.length; i++) {
            diffs[i].addEventListener("click", function (e) {
                var v = e.currentTarget.getAttribute("data-difficulty");
                if (handlers.onDifficulty) handlers.onDifficulty(v);
                setDifficultyUI(v);
            });
        }

        /* Settings toggles mirror straight into storage. */
        var toggles = document.querySelectorAll("[data-setting]");
        for (i = 0; i < toggles.length; i++) {
            toggles[i].addEventListener("change", function (e) {
                var t = e.currentTarget;
                if (handlers.onSetting) {
                    handlers.onSetting(t.getAttribute("data-setting"), !!t.checked);
                }
            });
        }
    }

    function bind(id, fn) {
        var b = byId(id);
        if (b) b.addEventListener("click", fn);
    }

    function setDifficultyUI(v) {
        var d = document.querySelectorAll("[data-difficulty]");
        for (var i = 0; i < d.length; i++) {
            d[i].classList.toggle("is-on", d[i].getAttribute("data-difficulty") === v);
        }
    }

    /* ===== HUD =====
     * Every frame while a match is running. All of it is guarded, because a
     * null here during a fast screen change is a hard crash and a null three
     * elements down is a subtle one. */
    function updateHud(world, dt) {
        var p = world.player;
        if (!p || !el.hud) return;

        var maxHp = S.Combat.stat(p, "hp");
        var maxMp = S.Combat.stat(p, "mana");

        if (!p.alive) {
            el.respawn.classList.add("is-on");
            el.respawnText.textContent = "REDEPLOYING  " + S.fmtTime(p.respawnIn || 0);
        } else {
            el.respawn.classList.remove("is-on");
        }

        setBar(el.hpFill, p.hp / Math.max(1, maxHp));
        el.hpText.textContent = S.fmt(p.hp) + " / " + S.fmt(maxHp);
        setBar(el.mpFill, p.mana / Math.max(1, maxMp));
        el.mpText.textContent = S.fmt(p.mana);
        el.level.textContent = p.level;
        el.name.textContent = p.name;
        el.gold.textContent = S.fmt(p.gold);
        el.cs.textContent = p.cs;
        el.kda.textContent = p.kills + " / " + p.deaths + " / " + p.assists;
        el.timer.textContent = S.fmtTime(world.time);

        /* Tower pips. Six dots, three per side, greying out as they fall.
         * Cheap, and it answers the question the player actually has - "is
         * this winnable" - without opening the scoreboard. */
        for (var i = 0; i < el.towers.length; i++) {
            var t = el.towers[i];
            if (!t) continue;
            t.classList.toggle("is-down", world.towerState && world.towerState[i] === false);
        }

        /* Ability pads: cooldown sweep, mana affordability, rank lock. */
        for (i = 0; i < el.pads.length && i < p.abilities.length; i++) {
            var ab = p.abilities[i];
            var pad = el.pads[i];
            var cdEl = pad.querySelector(".pad-cd");
            var costEl = pad.querySelector(".pad-cost");
            var keyEl = pad.querySelector(".pad-key");
            if (keyEl) keyEl.textContent = ab.key;

            var cdFrac = ab.cd > 0 ? S.clamp01(ab.cdLeft / ab.cd) : 0;
            if (cdFrac > 0) {
                pad.classList.add("is-cooling");
                if (cdEl) cdEl.textContent = S.fmtCd(ab.cdLeft);
                pad.style.setProperty("--cd", (cdFrac * 100).toFixed(0) + "%");
            } else {
                pad.classList.remove("is-cooling");
                if (cdEl) cdEl.textContent = "";
                pad.style.setProperty("--cd", "0%");
            }

            var locked = ab.rank < 0;
            pad.classList.toggle("is-locked", locked);
            if (costEl) {
                costEl.textContent = locked ? "—" : S.fmt(ab.cost);
                costEl.classList.toggle("is-poor", !locked && p.mana < ab.cost);
            }
        }

        if (shopOpen) updateShop(world);
        updateFeed(dt);
        if (scoreboardOpen) updateScoreboard(world);
    }

    function setBar(node, frac) {
        if (!node) return;
        node.style.width = (S.clamp01(frac) * 100).toFixed(1) + "%";
    }

    /* ===== Kill feed ===== */
    function pushKill(entry) {
        feed.unshift(entry);
        if (feed.length > 5) feed.pop();
        renderFeed();
    }

    function renderFeed() {
        if (!el.feed) return;
        var html = "";
        for (var i = 0; i < feed.length; i++) {
            var f = feed[i];
            html += '<div class="feed-row' + (f.mine ? " is-mine" : "") + '">' +
                '<span class="feed-a" style="color:' + (f.aTeam === 0 ? PAL.teamBlueLit : PAL.teamRedLit) + '">' +
                f.aName + '</span>' +
                '<span class="feed-x">✝</span>' +
                '<span class="feed-b" style="color:' + (f.bTeam === 0 ? PAL.teamBlueLit : PAL.teamRedLit) + '">' +
                f.bName + "</span></div>";
        }
        el.feed.innerHTML = html;
    }

    function updateFeed(dt) {
        if (!feed.length) return;
        feedTimer += dt;
        if (feedTimer < 0.5) return;
        feedTimer = 0;
    }

    function toggleScoreboard(on) {
        scoreboardOpen = on;
        if (el.scoreboard) el.scoreboard.classList.toggle("is-on", on);
    }

    function updateScoreboard(world) {
        var rows = [];
        var i;
        for (i = 0; i < world.champs.length; i++) {
            var c = world.champs[i];
            rows.push({
                name: c.name,
                team: c.team,
                k: c.kills, d: c.deaths, a: c.assists,
                cs: c.cs, lvl: c.level,
                gold: Math.round(c.gold),
                items: c.items,
                me: c.isPlayer
            });
        }
        rows.sort(function (a, b) {
            if (a.team !== b.team) return a.team - b.team;
            return (b.k * 3 + b.a) - (a.k * 3 + a.a);
        });
        var html = "<table><thead><tr><th>CHAMPION</th><th>LV</th><th>K</th><th>D</th>" +
            "<th>A</th><th>CS</th><th>GOLD</th><th>RELICS</th></tr></thead><tbody>";
        for (i = 0; i < rows.length; i++) {
            var r = rows[i];
            var items = "";
            for (var k = 0; k < r.items.length; k++) {
                var it = S.Items.get(r.items[k]);
                items += '<span class="sb-item" title="' + (it ? it.name : "") + '">' +
                    (it ? it.icon.charAt(0) : "?") + "</span>";
            }
            html += '<tr class="' + (r.me ? "is-me" : "") + '">' +
                '<td style="color:' + (r.team === 0 ? PAL.teamBlueLit : PAL.teamRedLit) + '">' + r.name + "</td>" +
                "<td>" + r.lvl + "</td><td>" + r.k + "</td><td>" + r.d + "</td><td>" + r.a + "</td>" +
                "<td>" + r.cs + "</td><td>" + S.fmt(r.gold) + "</td>" +
                '<td class="sb-items">' + (items || "—") + "</td></tr>";
        }
        html += "</tbody></table>";
        el.scoreboard.innerHTML = html;
    }

    /* ===== Shop =====
     *
     * Opens only in base and only out of combat. Both are enforced in
     * world.js; this function is what the player sees when the rules allow
     * it, and the "come back to base" message is the feedback for when they
     * do not. */
    function toggleShop(on) {
        shopOpen = on;
        if (!el.shop) return;
        el.shop.classList.toggle("is-on", on);
        if (!on && el.shopList) el.shopList.innerHTML = "";
    }

    function isShopOpen() { return shopOpen; }

    function updateShop(world) {
        var p = world.player;
        if (!p || !el.shopList) return;
        el.shopGold.textContent = S.fmt(p.gold);

        var list = S.Items.affordable(p.gold, p.items);
        var html = "";
        for (var i = 0; i < list.length; i++) {
            var it = list[i];
            html += '<button class="shop-item" data-item="' + it.id + '" type="button">' +
                '<span class="shop-icon">' + it.icon.charAt(0) + "</span>" +
                '<span class="shop-body"><span class="shop-name">' + it.name + "</span>" +
                '<span class="shop-text">' + it.text + "</span>" +
                (it.passiveText ? '<span class="shop-passive">' + it.passiveText + "</span>" : "") +
                "</span>" +
                '<span class="shop-cost">' + S.fmt(it.cost) + "</span></button>";
        }
        el.shopList.innerHTML = html;

        var buttons = el.shopList.querySelectorAll("[data-item]");
        for (i = 0; i < buttons.length; i++) {
            (function (btn) {
                btn.addEventListener("click", function () {
                    if (handlers.onBuy) handlers.onBuy(btn.getAttribute("data-item"));
                });
            })(buttons[i]);
        }
    }

    /* ===== Champion select =====
     * Eight cards. Each shows the champion's warband colour, role, passive,
     * the player's record with them, and the doctrine tier. That last one is
     * why the card exists twice over - a player with 14 wins on a champion
     * should be able to see that without remembering it. */
    function buildChampSelect(records, onPick) {
        var host = byId("champ-grid");
        if (!host) return;
        var html = "";
        var list = S.Champions.list;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            var f = S.Factions[c.faction];
            var rec = (records && records.perChamp && records.perChamp[c.id]) || null;
            var tier = S.Storage.doctrineTier(records, c.id);
            var dStats = S.Storage.doctrineStats(tier);

            html += '<button class="champ-card" data-champ="' + c.id + '" type="button" ' +
                'style="--fc:' + f.accent + '">';
            html += '<span class="champ-role">' + c.role.toUpperCase() + "</span>";
            html += '<span class="champ-name">' + c.name + "</span>";
            html += '<span class="champ-title">' + c.title + "</span>";
            html += '<span class="champ-passive"><b>' + f.passive + "</b> — " + f.passiveText + "</span>";

            /* Kit summary. Four short names in a row reads as "this is a
             * champion I recognise" far better than a table of numbers. */
            html += '<span class="champ-kit">';
            for (var k = 0; k < c.abilities.length; k++) {
                html += '<span class="kit-chip">' + c.abilities[k].key + " " + c.abilities[k].name + "</span>";
            }
            html += "</span>";

            html += '<span class="champ-record">';
            if (rec && rec.matches) {
                html += S.fmt(rec.wins) + "W / " + S.fmt(rec.matches) + " played · " +
                    S.fmt(rec.kills) + "/" + S.fmt(rec.deaths) + " · best CS " + S.fmt(rec.csBest);
            } else {
                html += '<span class="is-none">no record</span>';
            }
            html += "</span>";

            if (tier > 0) {
                html += '<span class="champ-doctrine is-on">DOCTRINE ' + tier + " · " +
                    "+" + S.fmt(dStats.hp) + " HP +" + S.fmt(dStats.ad) + " AD" +
                    (dStats.ms ? " +" + S.fmt(dStats.ms) + " MS" : "") + "</span>";
            } else {
                var need = S.Storage.doctrineTiers[0] - (rec ? rec.wins : 0);
                html += '<span class="champ-doctrine">' + need + " more wins to unlock DOCTRINE I</span>";
            }
            html += "</button>";
        }
        host.innerHTML = html;

        var cards = host.querySelectorAll("[data-champ]");
        for (i = 0; i < cards.length; i++) {
            (function (card) {
                card.addEventListener("click", function () {
                    for (var k = 0; k < cards.length; k++) cards[k].classList.remove("is-on");
                    card.classList.add("is-on");
                    if (onPick) onPick(card.getAttribute("data-champ"));
                });
            })(cards[i]);
        }
    }

    /* ===== Rune screen ===== */
    function openRunes() {
        var loadout = S.Storage.loadRunes();
        renderRunes(loadout, function (next) {
            S.Storage.saveRunes(next);
        });
        showScreen("runes");
    }

    function renderRunes(loadout, onChange) {
        var host = byId("rune-grid");
        if (!host) return;
        var next = {
            row0: loadout.row0 || S.Runes.byRow(0)[0].id,
            row1: loadout.row1 || S.Runes.byRow(1)[0].id,
            row2: loadout.row2 || S.Runes.byRow(2)[0].id
        };

        function paint() {
            var html = "";
            for (var r = 0; r < 3; r++) {
                var row = S.Runes.byRow(r);
                html += '<div class="rune-row"><h3>' + S.Runes.rows[r].name + "</h3><div class=\"rune-opts\">";
                for (var i = 0; i < row.length; i++) {
                    var ru = row[i];
                    var on = next["row" + r] === ru.id;
                    html += '<button class="rune-card' + (on ? " is-on" : "") +
                        '" data-rune="' + ru.id + '" type="button">' +
                        '<span class="rune-name">' + ru.name + "</span>" +
                        '<span class="rune-text">' + ru.text + "</span>" +
                        "</button>";
                }
                html += "</div></div>";
            }
            host.innerHTML = html;
            var cards = host.querySelectorAll("[data-rune]");
            for (i = 0; i < cards.length; i++) {
                (function (card) {
                    card.addEventListener("click", function () {
                        var id = card.getAttribute("data-rune");
                        var ru = S.Runes.get(id);
                        next["row" + ru.row] = id;
                        if (onChange) onChange(next);
                        paint();
                    });
                })(cards[i]);
            }
            var sum = byId("rune-summary");
            if (sum) sum.textContent = S.Runes.summary(next);
        }
        paint();
    }

    /* ===== Records ===== */
    function showRecords() {
        var r = S.Storage.loadRecords();
        var host = byId("records-body");
        if (host) {
            var kd = r.deaths > 0 ? (r.kills / r.deaths).toFixed(2) : (r.kills > 0 ? r.kills.toFixed(2) : "—");
            var win = r.matches > 0 ? Math.round((r.wins / r.matches) * 100) : 0;
            host.innerHTML =
                stat("MATCHES", S.fmt(r.matches)) +
                stat("VICTORIES", S.fmt(r.wins) + '<em>' + win + "%</em>") +
                stat("DEFEATS", S.fmt(r.losses)) +
                stat("K / D / A", r.kills + " / " + r.deaths + " / " + r.assists) +
                stat("KDA", kd) +
                stat("BEST STREAK", S.fmt(r.bestStreak)) +
                stat("BEST CS", S.fmt(r.csBest)) +
                stat("BEST GOLD", S.fmt(r.goldBest)) +
                stat("LONGEST MATCH", S.fmtTime(r.timeBest)) +
                stat("HIGH SCORE", S.fmt(r.highScore));
        }
        var host2 = byId("records-champs");
        if (host2) {
            var html = "";
            var ids = S.Champions.ids();
            for (var i = 0; i < ids.length; i++) {
                var c = S.Champions.get(ids[i]);
                var rec = r.perChamp[ids[i]];
                var tier = S.Storage.doctrineTier(r, ids[i]);
                html += '<li><b style="color:' + S.Factions[c.faction].accent + '">' + c.name + "</b>" +
                    (rec && rec.matches
                        ? "<span>" + rec.wins + "W / " + rec.matches + " · " + rec.kills + "/" + rec.deaths +
                        " · CS " + rec.csBest + "</span>"
                        : "<span class='is-none'>unplayed</span>") +
                    '<em class="' + (tier > 0 ? "is-on" : "") + '">Doctrine ' + tier + "</em></li>";
            }
            host2.innerHTML = html;
        }
        showScreen("records");
    }

    function stat(label, value) {
        return '<div class="rec-stat"><span class="rec-label">' + label +
            '</span><span class="rec-value">' + value + "</span></div>";
    }

    /* ===== Settings ===== */
    function syncSettings(s) {
        var map = { sound: "set-sound", haptics: "set-haptics", showRanges: "set-ranges", lanePings: "set-pings" };
        for (var k in map) {
            if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
            var node = byId(map[k]);
            if (node) node.checked = !!s[k];
        }
    }

    /* ===== Outcome ===== */
    function showOutcome(result) {
        var host = byId("outcome-body");
        if (host) {
            var f = S.Factions[result.faction];
            var win = result.win;
            host.innerHTML =
                '<h2 class="' + (win ? "is-win" : "is-loss") + '">' +
                (win ? "THE RELIQUARY IS YOURS" : "THE HIVE TAKES THE FIELD") + "</h2>" +
                '<p class="outcome-sub">' + (win ? "Three lanes held. The core is broken." :
                    "Your Core is gone. The warband is scattered.") + "</p>" +
                '<div class="rec-grid">' +
                stat("CHAMPION", result.name) +
                stat("OUTCOME", win ? "VICTORY" : "DEFEAT") +
                stat("K / D / A", result.kills + " / " + result.deaths + " / " + result.assists) +
                stat("CS", S.fmt(result.cs)) +
                stat("GOLD", S.fmt(result.gold)) +
                stat("DURATION", S.fmtTime(result.duration)) +
                stat("SCORE", S.fmt(result.score)) +
                stat("BEST", S.fmt(result.best)) + "</div>";
        }
        showScreen("outcome");
    }

    /* Score. Weighted toward winning and toward the two things a MOBA player
     * actually cares about: kills and objectives. Gold is deliberately not in
     * it - farming well should not score better than winning. */
    function score(world, p) {
        var s = 0;
        s += p.kills * 320;
        s += p.assists * 140;
        s += p.cs * 6;
        s += Math.round(p.gold * 0.25);
        s += Math.max(0, 900 - Math.round(world.time)) * 1.5;
        var i;
        for (i = 0; i < world.structures.length; i++) {
            var st = world.structures[i];
            if (st.kind === "tower" && st.team === 1 && !st.alive) s += 300;
            if (st.kind === "core" && st.team === 1 && !st.alive) s += 1200;
        }
        if (world.winner === 0) s += 900;
        return Math.round(s);
    }

    S.UI = {
        init: init,
        showScreen: showScreen,
        updateHud: updateHud,
        pushKill: pushKill,
        toggleShop: toggleShop,
        isShopOpen: isShopOpen,
        toggleScoreboard: toggleScoreboard,
        buildChampSelect: buildChampSelect,
        renderRunes: renderRunes,
        showRecords: showRecords,
        showOutcome: showOutcome,
        syncSettings: syncSettings,
        setDifficultyUI: setDifficultyUI,
        score: score
    };

})(window.IF = window.IF || {});
