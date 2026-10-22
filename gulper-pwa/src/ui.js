/*
 * GULPER - screens and HUD.
 *
 * The world is drawn in pixels and the interface is drawn in the
 * browser's own resolution, because a health bar you cannot read is not
 * a health bar. Everything the player needs to know in a hurry - the
 * alarm, the objective, the thing they are holding - lives in the HUD
 * rather than in the world.
 */
(function (S) {
    "use strict";

    var el = {};
    var hooks = {};
    var screens = {};
    var current = "title";
    var toastTimer = 0;
    var minimapCtx = null;

    function byId(id) { return document.getElementById(id); }

    function init(handlers) {
        hooks = handlers || {};

        el = {
            hud: byId("hud"),
            stage: byId("hud-stage"),
            mass: byId("hud-mass"),
            level: byId("hud-level"),
            bioFill: byId("bio-fill"),
            bioText: byId("bio-text"),
            hpFill: byId("hp-fill"),
            hpText: byId("hp-text"),
            stamFill: byId("stam-fill"),
            objLabel: byId("obj-label"),
            objProgress: byId("obj-progress"),
            objTimer: byId("obj-timer"),
            alarmFill: byId("alarm-fill"),
            alarmText: byId("alarm-text"),
            alarmBar: document.querySelector(".bar.alarm"),
            minimap: byId("minimap"),
            prompt: byId("swallow-prompt"),
            toast: byId("toast"),
            flash: byId("flash"),
            slots: byId("weapon-slots"),
            titleStats: byId("title-stats"),
            biomeList: byId("biome-list"),
            trackList: byId("track-list"),
            weaponList: byId("weapon-list"),
            adaptList: byId("adapt-list"),
            genomeShards: byId("genome-shards"),
            codexList: byId("codex-list"),
            codexCount: byId("codex-count"),
            resultTitle: byId("result-title"),
            resultBrief: byId("result-brief"),
            resultStars: byId("result-stars"),
            resultStats: byId("result-stats"),
            resultAdapt: byId("result-adapt"),
            introBiome: byId("intro-biome"),
            introName: byId("intro-name"),
            introBrief: byId("intro-brief"),
            introObjective: byId("intro-objective"),
            introAdapt: byId("intro-adapt")
        };

        ["title", "map", "genome", "codex", "results", "pause", "settings", "intro"].forEach(function (name) {
            screens[name] = byId("screen-" + name);
        });

        if (el.minimap) minimapCtx = el.minimap.getContext("2d");

        /* Buttons. */
        on("btn-play", function () { hooks.onPlay && hooks.onPlay(); });
        on("btn-continue", function () { hooks.onContinue && hooks.onContinue(); });
        on("btn-daily", function () { hooks.onDaily && hooks.onDaily(); });
        on("btn-endless", function () { hooks.onEndless && hooks.onEndless(); });
        on("btn-rush", function () { hooks.onRush && hooks.onRush(); });
        on("btn-genome", function () { hooks.onGenome && hooks.onGenome(); });
        on("btn-codex", function () { hooks.onCodex && hooks.onCodex(); });
        on("btn-settings", function () { hooks.onSettings && hooks.onSettings(); });
        on("btn-result-next", function () { hooks.onNext && hooks.onNext(); });
        on("btn-result-retry", function () { hooks.onRetry && hooks.onRetry(); });
        on("btn-result-map", function () { hooks.onMap && hooks.onMap(); });
        on("btn-resume", function () { hooks.onResume && hooks.onResume(); });
        on("btn-pause-restart", function () { hooks.onRestart && hooks.onRestart(); });
        on("btn-pause-quit", function () { hooks.onQuit && hooks.onQuit(); });
        on("btn-intro-go", function () { hooks.onIntroGo && hooks.onIntroGo(); });
        on("btn-intro-back", function () { show("map"); });
        on("btn-reset-save", function () {
            if (window.confirm("Erase all progress? This cannot be undone.")) {
                S.Storage.reset();
                buildGenome();
                buildCodex();
                hooks.onResetSave && hooks.onResetSave();
            }
        });

        var backs = document.querySelectorAll("[data-back]");
        for (var i = 0; i < backs.length; i++) {
            backs[i].addEventListener("click", function () {
                show(this.getAttribute("data-back"));
            });
        }

        /* Settings. */
        var save = S.Storage.data();
        var setSound = byId("set-sound"), setMusic = byId("set-music");
        var setHaptics = byId("set-haptics"), setAim = byId("set-aim");
        var setDamage = byId("set-damage"), setQuality = byId("set-quality");
        var setPixel = byId("set-pixel");
        if (setSound) setSound.checked = save.settings.sound !== false;
        if (setMusic) setMusic.checked = save.settings.music !== false;
        if (setHaptics) setHaptics.checked = save.settings.haptics !== false;
        if (setAim) setAim.checked = save.settings.aimAssist !== false;
        if (setDamage) setDamage.checked = save.settings.showDamage !== false;
        if (setQuality) setQuality.value = save.settings.quality || "auto";
        if (setPixel) setPixel.value = save.settings.pixelSize || "auto";

        function bindSetting(node, key, prop) {
            if (!node) return;
            node.addEventListener("change", function () {
                var value = node.type === "checkbox" ? node.checked : node.value;
                S.Storage.setSetting(key, value);
                hooks.onSetting && hooks.onSetting(key, value, prop);
            });
        }
        bindSetting(setSound, "sound");
        bindSetting(setMusic, "music");
        bindSetting(setHaptics, "haptics");
        bindSetting(setAim, "aimAssist");
        bindSetting(setDamage, "showDamage");
        bindSetting(setQuality, "quality");
        bindSetting(setPixel, "pixelSize", "pixel");

        buildCodex();
        buildGenome();
        buildMap();
    }

    function on(id, fn) {
        var node = byId(id);
        if (node) node.addEventListener("click", fn);
    }

    /* ===== screens ===== */
    function show(name) {
        current = name;
        for (var key in screens) {
            if (!screens[key]) continue;
            screens[key].classList.toggle("hidden", key !== name);
        }
        var playing = name === "none";
        if (el.hud) {
            el.hud.classList.toggle("hidden", !playing);
            el.hud.setAttribute("aria-hidden", playing ? "false" : "true");
        }
        document.body.classList.toggle("in-menu", !playing);
        if (name === "map") buildMap();
        if (name === "genome") buildGenome();
        if (name === "codex") buildCodex();
        if (name === "title") refreshTitle();
        hooks.onScreen && hooks.onScreen(name);
    }

    function refreshTitle() {
        var save = S.Storage.data();
        var total = 0, cleared = 0, stars = 0;
        for (var k in save.levels) {
            var r = save.levels[k];
            if (r.cleared) cleared++;
            stars += r.stars || 0;
        }
        total = S.Levels.total();
        if (el.titleStats) {
            var statLine = cleared + " / " + total + " levels cleared · " +
                stars + " stars · " + save.shards + " shards · " +
                (save.total || 0) + " swallowed";
            if (save.feast || save.rush.stage || save.daily.best) {
                statLine += " · FEAST " + (save.feast || 0) +
                    " · TITANS " + (save.rush.stage || 0) + "/6" +
                    (save.daily.best ? " · TODAY " + save.daily.best : "");
            }
            el.titleStats.textContent = statLine;
        }
        var cont = byId("btn-continue");
        if (cont) {
            var next = S.Levels.firstUncleared();
            cont.disabled = !next;
            cont.textContent = next ? "CONTINUE · " + S.Levels.get(next).name.toUpperCase() : "CONTINUE";
        }
    }

    /* ===== campaign map ===== */
    function buildMap() {
        if (!el.biomeList) return;
        el.biomeList.innerHTML = "";
        var campaign = S.Levels.campaign();
        for (var i = 0; i < campaign.length; i++) {
            var b = campaign[i];
            var wrap = document.createElement("div");
            wrap.className = "biome";

            var h = document.createElement("h3");
            h.textContent = b.name.toUpperCase();
            wrap.appendChild(h);

            var p = document.createElement("p");
            p.textContent = b.brief;
            wrap.appendChild(p);

            var row = document.createElement("div");
            row.className = "level-row";
            for (var j = 0; j < b.levels.length; j++) {
                var id = b.levels[j];
                var lvl = S.Levels.get(id);
                var rec = S.Storage.levelRecord(id);
                var unlocked = S.Levels.isUnlocked(id);
                var btn = document.createElement("button");
                btn.className = "level-btn" + (lvl.boss ? " boss" : "") + (unlocked ? "" : " locked");
                btn.disabled = !unlocked;
                btn.setAttribute("aria-label",
                    lvl.name + (unlocked ? "" : " (locked)") + ", " + rec.stars + " of 3 stars");
                var num = document.createElement("span");
                num.textContent = lvl.boss ? "B" : String(lvl.index);
                var st = document.createElement("span");
                st.className = "st";
                st.textContent = rec.stars > 0 ? "★".repeat(rec.stars) : "☆☆☆";
                btn.appendChild(num);
                btn.appendChild(st);
                (function (levelId, unlocked) {
                    btn.addEventListener("click", function () {
                        if (unlocked) hooks.onLevelSelect && hooks.onLevelSelect(levelId);
                    });
                })(id, unlocked);
                row.appendChild(btn);
            }
            wrap.appendChild(row);
            el.biomeList.appendChild(wrap);
        }
    }

    /* ===== genome ===== */
    function buildGenome() {
        var save = S.Storage.data();
        if (el.genomeShards) el.genomeShards.textContent = save.shards + " SHARDS";
        var genome = save.genome || {};

        if (el.trackList) {
            el.trackList.innerHTML = "";
            for (var i = 0; i < S.Genome.tracks.length; i++) {
                var t = S.Genome.tracks[i];
                var rank = genome[t.id] || 0;
                var card = document.createElement("div");
                card.className = "card";

                var name = document.createElement("div");
                name.className = "name";
                name.textContent = t.name.toUpperCase();
                card.appendChild(name);

                var desc = document.createElement("div");
                desc.className = "desc";
                desc.textContent = t.desc;
                card.appendChild(desc);

                var row = document.createElement("div");
                row.className = "row";
                var pips = document.createElement("div");
                pips.className = "pips";
                for (var p = 0; p < S.Genome.maxRank; p++) {
                    var pip = document.createElement("div");
                    pip.className = "pip" + (p < rank ? " on" : "");
                    pips.appendChild(pip);
                }
                row.appendChild(pips);

                if (rank < S.Genome.maxRank) {
                    var cost = t.costs[rank];
                    var buy = document.createElement("button");
                    buy.className = "btn tiny";
                    buy.style.marginLeft = "auto";
                    buy.textContent = cost + " SHARDS";
                    buy.disabled = save.shards < cost;
                    (function (track, c) {
                        buy.addEventListener("click", function () {
                            if (S.Storage.spendShards(c)) {
                                var g = S.Storage.data().genome || {};
                                g[track.id] = (g[track.id] || 0) + 1;
                                S.Storage.save();
                                buildGenome();
                            }
                        });
                    })(t, cost);
                    row.appendChild(buy);
                } else {
                    var max = document.createElement("span");
                    max.className = "cost";
                    max.textContent = "MAX";
                    row.appendChild(max);
                }
                card.appendChild(row);
                el.trackList.appendChild(card);
            }
        }

        if (el.weaponList) {
            el.weaponList.innerHTML = "";
            var order = S.Weapons.order;
            for (var w = 0; w < order.length; w++) {
                var def = S.Weapons.get(order[w]);
                var tier = save.weapons[def.id] || 0;
                var card2 = document.createElement("div");
                card2.className = "card";

                var nm = document.createElement("div");
                nm.className = "name";
                nm.textContent = def.name.toUpperCase() + (tier ? "" : "  · LOCKED");
                card2.appendChild(nm);

                var ds = document.createElement("div");
                ds.className = "desc";
                ds.textContent = def.desc;
                card2.appendChild(ds);

                var r2 = document.createElement("div");
                r2.className = "row";
                var pips2 = document.createElement("div");
                pips2.className = "pips";
                for (var q = 0; q < 3; q++) {
                    var pip2 = document.createElement("div");
                    pip2.className = "pip" + (q < tier ? " on" : "");
                    pips2.appendChild(pip2);
                }
                r2.appendChild(pips2);

                var label = "";
                var disabled = true;
                if (!tier) {
                    label = def.unlockCost + " SHARDS";
                    disabled = save.shards < def.unlockCost;
                } else {
                    var nextCost = S.Weapons.nextTierCost(def.id, tier);
                    if (nextCost) {
                        label = "TIER " + (tier + 1) + " · " + nextCost;
                        disabled = save.shards < nextCost;
                    } else {
                        label = "MAX";
                    }
                }
                var bw = document.createElement("button");
                bw.className = "btn tiny";
                bw.style.marginLeft = "auto";
                bw.textContent = label;
                bw.disabled = disabled;
                (function (weaponDef, currentTier) {
                    bw.addEventListener("click", function () {
                        if (!currentTier) {
                            if (S.Storage.spendShards(weaponDef.unlockCost)) {
                                S.Storage.unlockWeapon(weaponDef.id, 1);
                            }
                        } else {
                            var nc = S.Weapons.nextTierCost(weaponDef.id, currentTier);
                            if (nc && S.Storage.spendShards(nc)) {
                                S.Storage.unlockWeapon(weaponDef.id, currentTier + 1);
                            }
                        }
                        buildGenome();
                    });
                })(def, tier);
                r2.appendChild(bw);
                card2.appendChild(r2);
                el.weaponList.appendChild(card2);
            }
        }

        if (el.adaptList) {
            el.adaptList.innerHTML = "";
            var aorder = S.Adaptations.order;
            for (var a = 0; a < aorder.length; a++) {
                var ad = S.Adaptations.get(aorder[a]);
                var owned = save.adaptations.indexOf(ad.id) >= 0;
                var card3 = document.createElement("div");
                card3.className = "card";

                var an = document.createElement("div");
                an.className = "name";
                an.textContent = ad.name.toUpperCase() + (owned ? "" : "  · LOCKED");
                card3.appendChild(an);

                var ad2 = document.createElement("div");
                ad2.className = "desc";
                ad2.textContent = ad.desc;
                card3.appendChild(ad2);

                if (!owned) {
                    var r3 = document.createElement("div");
                    r3.className = "row";
                    var buy = document.createElement("button");
                    buy.className = "btn tiny";
                    buy.style.marginLeft = "auto";
                    buy.textContent = ad.cost + " SHARDS";
                    buy.disabled = save.shards < ad.cost;
                    (function (adapt) {
                        buy.addEventListener("click", function () {
                            if (S.Storage.spendShards(adapt.cost)) {
                                S.Storage.unlockAdaptation(adapt.id);
                                buildGenome();
                            }
                        });
                    })(ad);
                    r3.appendChild(buy);
                    card3.appendChild(r3);
                }
                el.adaptList.appendChild(card3);
            }
        }
    }

    /* ===== codex ===== */
    function buildCodex() {
        if (!el.codexList) return;
        var save = S.Storage.data();
        el.codexList.innerHTML = "";
        var total = 0;
        var list = S.Species.preyList();
        for (var i = 0; i < list.length; i++) {
            var def = list[i];
            var count = save.codex[def.id] || 0;
            total += count;
            var item = document.createElement("div");
            item.className = "codex-item" + (count ? "" : " unknown");
            var nm = document.createElement("div");
            nm.className = "name";
            nm.textContent = count ? def.name : "???";
            var bio = document.createElement("div");
            bio.className = "bio";
            bio.textContent = count ? def.bio : "Not yet encountered.";
            var ct = document.createElement("div");
            ct.className = "count";
            ct.textContent = count ? count + " swallowed" : "";
            item.appendChild(nm);
            item.appendChild(bio);
            item.appendChild(ct);
            el.codexList.appendChild(item);
        }
        if (el.codexCount) el.codexCount.textContent = total + " SWALLOWED";
    }

    /* ===== results ===== */
    function showResults(world, stars, extra) {
        extra = extra || {};
        var tag = world.modeTag;
        if (el.resultTitle) {
            el.resultTitle.textContent =
                tag === "feast" ? "THE TIDE TOOK YOU" :
                tag === "rush" && world.status === "won" ? "TITAN DOWN" :
                tag === "rush" ? "THE LINE HOLDS" :
                world.status === "won" ? "LEVEL CLEAR" : "FAILED";
        }
        if (el.resultBrief) {
            el.resultBrief.textContent =
                tag === "feast"
                    ? (world.failReason || "The tide took you.") + " You lasted " +
                      S.fmtTime(world.time) + "."
                    : tag === "rush" && world.status === "won"
                        ? "Titan " + (extra.stage || 1) + " of " + (extra.stages || 6) + " is down."
                        : tag === "rush"
                            ? (world.failReason || "The titan threw you back.")
                            : world.status === "won"
                                ? (world.level.name + " — done.")
                                : (world.failReason || "The level ended badly.");
        }
        if (el.resultStars) {
            if (tag === "rush") {
                el.resultStars.textContent =
                    world.status === "won"
                        ? "TITAN " + (extra.stage || 1) + " OF " + (extra.stages || 6)
                        : "TITAN " + Math.max(0, (extra.stage || 1) - 1) + " OF " + (extra.stages || 6);
                el.resultStars.setAttribute("aria-label", "procession progress");
            } else if (tag) {
                el.resultStars.textContent = "";
                el.resultStars.setAttribute("aria-label", "no stars outside the campaign");
            } else {
                el.resultStars.textContent = stars > 0 ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
                el.resultStars.setAttribute("aria-label", stars + " of 3 stars");
            }
        }
        if (el.resultStats) {
            el.resultStats.innerHTML = "";
            var rows = [
                ["BIOMASS", Math.round(world.stats.peakMass)],
                ["SWALLOWED", world.stats.swallowed],
                ["PEAK ALARM", Math.round(world.stats.alarmPeak)],
                ["TIME", S.fmtTime(world.time)]
            ];
            if (tag === "feast") rows.push(["BEST FEAST", extra.best || 0]);
            else if (tag === "daily") rows.push(["BEST TODAY", extra.best || 0]);
            else if (tag === "rush") {
                rows.push(["TITANS DOWN", ((world.status === "won" ? extra.stage : extra.stage - 1) || 0) +
                    " OF " + (extra.stages || 6)]);
            } else {
                rows.push(["SHARDS", "+" + (extra.shards || 0)]);
            }
            for (var i = 0; i < rows.length; i++) {
                var dt = document.createElement("dt");
                dt.textContent = rows[i][0];
                var dd = document.createElement("dd");
                dd.textContent = rows[i][1];
                el.resultStats.appendChild(dt);
                el.resultStats.appendChild(dd);
            }
        }
        show("results");
    }

    /* ===== the level intro ===== */
    function showIntro(level, adaptations) {
        if (el.introBiome) el.introBiome.textContent = S.Biomes[level.biome].name.toUpperCase();
        if (el.introName) el.introName.textContent = level.name;
        if (el.introBrief) el.introBrief.textContent = level.brief;
        if (el.introObjective) {
            var o = level.objective;
            var detail = "";
            if (o.type === "swarm") detail = "Absorb " + o.count + " people.";
            else if (o.type === "stealth") detail = "Absorb " + o.count + " people without the alarm passing " + o.maxAlarm + ".";
            else if (o.type === "elite") detail = "Absorb " + o.count + " marked target" + (o.count > 1 ? "s" : "") + ".";
            else if (o.type === "snatch") detail = "Carry the specimen to the extraction point. Do not swallow it.";
            else if (o.type === "survive") detail = o.time === 0
                ? "There is no clock and no way out. Eat until the tide takes you."
                : "Stay alive for " + Math.round(o.time) + " seconds.";
            else if (o.type === "cull") detail = "Absorb only the " + o.count + " marked people.";
            else if (o.type === "slay") detail = "Break its will, then take it whole if you are big enough.";
            el.introObjective.textContent = o.label + " — " + detail;
        }
        renderAdaptChoices(el.introAdapt, adaptations, function (id) {
            hooks.onAdaptationPick && hooks.onAdaptationPick(id);
        });
        show("intro");
    }

    /* Render the three adaptation cards. */
    function renderAdaptChoices(container, adaptations, onPick) {
        if (!container) return;
        container.innerHTML = "";
        if (!adaptations || !adaptations.length) return;
        var title = document.createElement("div");
        title.className = "fine-print";
        title.textContent = "CHOOSE ONE ADAPTATION";
        container.appendChild(title);

        var cards = document.createElement("div");
        cards.className = "cards";
        for (var i = 0; i < adaptations.length; i++) {
            (function (id) {
                var ad = S.Adaptations.get(id);
                if (!ad) return;
                var btn = document.createElement("button");
                btn.className = "adapt-card";
                var nm = document.createElement("div");
                nm.className = "name";
                nm.textContent = ad.name.toUpperCase();
                var ds = document.createElement("div");
                ds.className = "desc";
                ds.textContent = ad.desc;
                btn.appendChild(nm);
                btn.appendChild(ds);
                btn.addEventListener("click", function () { onPick(id); });
                cards.appendChild(btn);
            })(adaptations[i]);
        }
        container.appendChild(cards);
    }

    /* ===== the HUD ===== */
    function updateHud(world) {
        if (!el.hud || world.status !== "playing") return;
        var p = world.player;
        var stage = S.Body.stageFor(p.mass);

        if (el.stage) el.stage.textContent = stage.name.toUpperCase();
        if (el.mass) el.mass.textContent = Math.round(p.mass);
        if (el.level) el.level.textContent = "LV " + p.level;

        var need = S.CONFIG.growth.xpFor(p.level);
        var pct = S.clamp01(p.xp / need) * 100;
        if (el.bioFill) el.bioFill.style.width = pct + "%";
        if (el.bioText) el.bioText.textContent = Math.round(p.xp) + " / " + need;

        var hpPct = S.clamp01(p.hp / p.maxHp) * 100;
        if (el.hpFill) el.hpFill.style.width = hpPct + "%";
        if (el.hpText) el.hpText.textContent = Math.round(p.hp) + " / " + Math.round(p.maxHp);
        if (el.stamFill) el.stamFill.style.width = (p.stamina / p.staminaMax * 100) + "%";

        var obj = world.objective;
        var lvl = world.level;
        if (el.objLabel) el.objLabel.textContent = lvl.objective.label;
        if (el.objProgress) {
            if (obj.type === "survive") {
                el.objProgress.textContent = Math.ceil(Math.max(0, world.timeLeft)) + "s";
            } else {
                el.objProgress.textContent = obj.count + " / " + obj.need;
            }
        }
        if (el.objTimer) {
            el.objTimer.textContent = world.timeLeft > 0 ? S.fmtTime(world.timeLeft) : "";
        }

        if (el.alarmFill) el.alarmFill.style.width = world.alarm + "%";
        if (el.alarmText) el.alarmText.textContent = Math.round(world.alarm);
        if (el.alarmBar) el.alarmBar.classList.toggle("critical", world.alarm >= 65);

        /* The swallow prompt. */
        var target = S.Absorb.target(world);
        var canShow = !!target && p.state !== S.STATE.player.swallowing;
        if (el.prompt) {
            el.prompt.classList.toggle("hidden", !canShow);
            if (canShow) {
                var gape = S.Body.effectiveGape(p);
                el.prompt.textContent = target.mass > gape ? "TOO BIG" : "SWALLOW";
                el.prompt.style.borderColor = target.mass > gape ? "var(--blood)" : "var(--chitin)";
                el.prompt.style.color = target.mass > gape ? "var(--blood)" : "var(--chitin-lit)";
            }
        }

        /* The message. */
        if (world.message) {
            world.messageT -= 1 / 60;
            if (world.messageT <= 0) world.message = null;
        }
        if (el.toast) {
            if (world.message) {
                el.toast.textContent = world.message;
                el.toast.classList.add("show");
            } else {
                el.toast.classList.remove("show");
            }
        }

        /* Weapon slots. */
        if (el.slots) {
            if (el.slots.childElementCount !== p.slots.length) {
                el.slots.innerHTML = "";
                for (var i = 0; i < p.slots.length; i++) {
                    var d = document.createElement("div");
                    d.className = "wslot";
                    el.slots.appendChild(d);
                }
            }
            for (var s = 0; s < p.slots.length; s++) {
                var node = el.slots.children[s];
                var def = S.Weapons.get(p.slots[s]);
                var tier = p.tiers[p.slots[s]] || 1;
                node.className = "wslot" + (p.current === p.slots[s] ? " active" : "");
                node.innerHTML = (def ? def.short : "?") + "<span class='tier'>T" + tier + "</span>";
                node.setAttribute("aria-label", (def ? def.name : "weapon") + ", tier " + tier);
            }
        }

        drawMinimap(world);
    }

    /* ===== minimap ===== */
    function drawMinimap(world) {
        if (!minimapCtx) return;
        var c = el.minimap;
        var w = c.width, h = c.height;
        var a = world.arena;
        var k = Math.min(w / a.w, h / a.h);
        var ox = (w - a.w * k) / 2, oy = (h - a.h * k) / 2;

        minimapCtx.clearRect(0, 0, w, h);
        minimapCtx.fillStyle = "#14181f";
        minimapCtx.fillRect(0, 0, w, h);

        function dot(x, y, color, size) {
            minimapCtx.fillStyle = color;
            minimapCtx.fillRect(Math.round(ox + (x - a.x) * k), Math.round(oy + (y - a.y) * k), size || 1, size || 1);
        }

        for (var i = 0; i < world.props.length; i++) {
            var pr = world.props[i];
            if (!pr.solid) continue;
            dot(pr.x, pr.y, "#3a434f", 1);
        }
        for (var e = 0; e < world.entities.length; e++) {
            var en = world.entities[e];
            if (en.dead || en.removed) continue;
            if (en.kind === "prey") dot(en.x, en.y, en.marked ? "#f2b23c" : "#667283", 1);
            else if (en.kind === "foe") dot(en.x, en.y, "#a33a32", 2);
            else dot(en.x, en.y, "#b84394", 2);
        }
        if (world.objective.extraction) {
            var ex = world.objective.extraction;
            minimapCtx.strokeStyle = "#8fbf5c";
            minimapCtx.strokeRect(Math.round(ox + (ex.x - a.x) * k - 4), Math.round(oy + (ex.y - a.y) * k - 4), 8, 8);
        }
        var p = world.player;
        dot(p.x, p.y, "#e2e6ea", 3);
    }

    function toast(text) {
        if (!el.toast) return;
        el.toast.textContent = text;
        el.toast.classList.add("show");
        toastTimer = 2.2;
    }

    function flash() {
        if (!el.flash) return;
        el.flash.classList.remove("hit");
        /* Force a reflow so the animation restarts. */
        void el.flash.offsetWidth;
        el.flash.classList.add("hit");
    }

    S.UI = {
        init: init,
        show: show,
        current: function () { return current; },
        showResults: showResults,
        showIntro: showIntro,
        renderAdaptChoices: renderAdaptChoices,
        updateHud: updateHud,
        buildMap: buildMap,
        buildGenome: buildGenome,
        buildCodex: buildCodex,
        refreshTitle: refreshTitle,
        toast: toast,
        flash: flash
    };
})(window.GU = window.GU || {});
