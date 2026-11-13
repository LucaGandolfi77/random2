/*
 * LAST CALL interface.
 *
 * Everything the player touches that is not Canvas: the menu, the tour board,
 * the deck shelf, the hand, dialogs and the result card. The match loop lives
 * in main.js; this file only presents it and turns taps into deploy calls.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var U = LC.U;
    var CARDS = LC.CARDS;
    var Storage = LC.Storage;

    var UI = {
        profile: null,
        screen: "menu",
        state: null,
        matchInfo: null,
        selectedIndex: -1,
        selectedSlot: 0,
        preview: null,
        drag: null,
        deckFilter: "all",
        deckDrafts: [null, null, null],
        detailCard: null,
        difficulty: "normal",
        settingsFromPause: false,
        resetArmed: false,
        installPrompt: null,
        tutorialClosed: false,
        tutorialStage: -1,
        tutorialHideAt: 0,
        handSignature: "",
        resultData: null,
        confirmAction: null,
        lastHud: {}
    };

    var els = {};

    var IDS = [
        "screen-menu", "screen-tour", "screen-deck", "screen-game",
        "menu-tips", "menu-stars", "menu-wins", "menu-deck",
        "btn-play", "play-sub", "btn-tour", "btn-practice", "btn-deck",
        "btn-how", "btn-settings", "btn-install", "install-hint",
        "tour-list", "tour-tips", "tour-title",
        "deck-tips", "deck-tabs", "deck-slots", "deck-cost",
        "deck-filters", "collection", "btn-deck-auto", "btn-deck-save",
        "card-art", "card-cost", "card-family", "card-name", "card-role",
        "card-desc", "card-flavor", "card-stats", "card-level",
        "btn-upgrade", "btn-card-deck",
        "match-timer", "match-phase", "crown-player", "crown-enemy",
        "buzz-value", "buzz-fill", "buzz-bar", "venue-name", "happy-badge",
        "tutorial-banner", "tutorial-text", "tutorial-close",
        "arena-wrap", "arena", "arena-toast", "selected-hint",
        "hand", "next-card-img", "next-card-cost", "drag-ghost",
        "btn-pause", "btn-resume", "btn-pause-settings", "btn-quit",
        "overlay-settings", "overlay-how", "overlay-practice",
        "overlay-pause", "overlay-card", "overlay-result",
        "overlay-confirm", "settings-title", "set-sound", "set-music",
        "set-haptics", "set-motion", "btn-reset",
        "difficulty-row", "btn-practice-start",
        "result-kicker", "result-title", "result-sub", "result-crowns",
        "result-stars", "result-tips", "result-damage", "result-cards",
        "result-unlocks", "btn-result-continue", "btn-rematch",
        "btn-result-menu",
        "confirm-title", "confirm-text", "btn-confirm-no", "btn-confirm-yes",
        "toast", "drag-ghost"
    ];

    function $(id) {
        return document.getElementById(id);
    }

    function esc(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function cardName(id) {
        var c = CARDS[id];
        return c ? c.name : id;
    }

    function starsMarkup(stars) {
        var html = "";
        for (var i = 0; i < 3; i++) {
            html += i < stars ? "★" : '<span class="empty">★</span>';
        }
        return html;
    }

    function clickSound() {
        if (LC.Audio) {
            LC.Audio.resume();
            LC.Audio.click();
        }
    }

    function selectSound() {
        if (LC.Audio) {
            LC.Audio.resume();
            LC.Audio.select();
        }
    }

    function haptic(pattern) {
        if (!UI.profile || !UI.profile.haptics) return;
        if (window.R2 && window.R2.buzz) window.R2.buzz(pattern || 10);
    }

    UI.haptic = haptic;

    /* ---------- settings ---------- */

    function syncToggle(button, on) {
        if (!button) return;
        button.textContent = on ? "ON" : "OFF";
        button.classList.toggle("on", !!on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
    }

    UI.applySettings = function () {
        var p = UI.profile;
        if (!p) return;
        document.body.classList.toggle("reduced-motion", !!p.reducedMotion);
        if (LC.Audio) {
            LC.Audio.setSound(p.sound);
            LC.Audio.setMusic(p.music);
        }
        if (window.R2 && window.R2.setSettings) {
            window.R2.setSettings({
                sound: p.sound !== false,
                music: p.music !== false,
                haptics: p.haptics !== false
            });
        }
        syncToggle(els["set-sound"], p.sound);
        syncToggle(els["set-music"], p.music);
        syncToggle(els["set-haptics"], p.haptics);
        syncToggle(els["set-motion"], p.reducedMotion);
    };

    UI.save = function () {
        if (!UI.profile) return false;
        return Storage.save(UI.profile);
    };

    UI.ensureMenuMusic = function () {
        if (!UI.profile || !UI.profile.music || !LC.Audio) return;
        LC.Audio.resume();
        if (!LC.Audio.ctx) return;
        if (!LC.Audio.musicTimer) LC.Audio.startMusic(0);
    };

    /* ---------- toasts ---------- */

    var toastTimer = null;
    UI.toast = function (message, tone) {
        var el = els.toast || $("toast");
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
        el.style.borderColor = tone === "error"
            ? "rgba(255,89,100,.6)"
            : "rgba(232,192,125,.4)";
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.hidden = true;
            toastTimer = null;
        }, tone === "error" ? 2600 : 2200);
    };

    var arenaToastTimer = null;
    UI.arenaToast = function (message) {
        var el = els["arena-toast"] || $("arena-toast");
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
        if (arenaToastTimer) clearTimeout(arenaToastTimer);
        arenaToastTimer = setTimeout(function () {
            el.hidden = true;
            arenaToastTimer = null;
        }, 1600);
    };

    /* ---------- profile / menu ---------- */

    UI.setProfile = function (profile) {
        UI.profile = profile;
        UI.deckDrafts = [null, null, null];
        UI.selectedSlot = 0;
        UI.applySettings();
        UI.refreshProfileUi();
        if (UI.screen === "deck") UI.renderDeck();
        if (UI.screen === "tour") UI.renderTour();
    };

    UI.refreshProfileUi = function () {
        var p = UI.profile;
        if (!p) return;
        var stars = Storage.totalStars(p);
        var cleared = Storage.clearedVenues(p);
        var next = Storage.nextVenue(p);
        var deck = p.decks[p.activeDeck] || LC.STARTER_DECK;
        var avg = LC.deckCost(deck);
        var complete = cleared >= LC.VENUES.length;

        if (els["menu-tips"]) els["menu-tips"].textContent = p.tips;
        if (els["menu-stars"]) els["menu-stars"].textContent = stars + "/" + (LC.VENUES.length * 3);
        if (els["menu-wins"]) els["menu-wins"].textContent = p.stats.wins;
        if (els["menu-deck"]) els["menu-deck"].textContent = avg ? avg.toFixed(1) : "—";
        if (els["tour-tips"]) els["tour-tips"].textContent = p.tips;
        if (els["deck-tips"]) els["deck-tips"].textContent = p.tips;

        if (els["btn-play"]) {
            var label = els["btn-play"].querySelector("span");
            if (label) label.textContent = complete ? "Replay the circuit" : "Continue the tour";
        }
        if (els["play-sub"] && next) {
            var sub = next.name + " · " + next.district;
            if (complete) sub += " · circuit complete";
            else if (p.tour[next.id] && p.tour[next.id].cleared) sub += " · replay";
            else if (p.tour[next.id] && p.tour[next.id].stars) sub += " · " + p.tour[next.id].stars + "★";
            else sub += " · first round";
            els["play-sub"].textContent = sub;
        }
    };

    /* ---------- screen routing ---------- */

    UI.showScreen = function (name) {
        UI.screen = name;
        ["menu", "tour", "deck", "game"].forEach(function (key) {
            var screen = els["screen-" + key] || $("screen-" + key);
            if (screen) screen.classList.toggle("active", key === name);
        });
        if (name === "menu") UI.refreshProfileUi();
        if (name === "tour") UI.renderTour();
        if (name === "deck") UI.renderDeck();
        var active = els["screen-" + name] || $("screen-" + name);
        if (active) active.scrollTop = 0;
        if (name === "tour" || name === "deck" || name === "menu") UI.ensureMenuMusic();
        if (LC.Game && LC.Game.onScreen) LC.Game.onScreen(name);
    };

    /* ---------- overlays ---------- */

    UI.anyOverlayOpen = function () {
        var overlays = document.querySelectorAll(".overlay");
        for (var i = 0; i < overlays.length; i++) {
            if (!overlays[i].hidden) return true;
        }
        return false;
    };

    function visibleOverlay(id) {
        var el = $(id);
        return el && !el.hidden;
    }

    UI.openOverlay = function (id) {
        var el = $(id);
        if (el) el.hidden = false;
    };

    UI.closeOverlay = function (id) {
        var el = $(id);
        if (el) el.hidden = true;
        if (id === "overlay-card") {
            UI.detailCard = null;
            UI.renderDeck();
        }
        if (id === "overlay-settings" && UI.settingsFromPause) {
            UI.settingsFromPause = false;
            if (LC.Game && LC.Game.isPaused && LC.Game.isPaused()) UI.showPause();
        }
    };

    function closeAllOverlays() {
        ["overlay-settings", "overlay-how", "overlay-practice", "overlay-pause",
            "overlay-card", "overlay-result", "overlay-confirm"].forEach(function (id) {
            var el = $(id);
            if (el) el.hidden = true;
        });
        UI.settingsFromPause = false;
        UI.detailCard = null;
    }

    /* ---------- tour ---------- */

    UI.renderTour = function () {
        if (!UI.profile) return;
        var p = UI.profile;
        if (els["tour-tips"]) els["tour-tips"].textContent = p.tips;
        var html = "";
        LC.VENUES.forEach(function (venue, index) {
            var unlocked = Storage.venueUnlocked(p, venue);
            var entry = p.tour[venue.id] || { stars: 0, cleared: false };
            var previous = index > 0 ? LC.VENUES[index - 1] : null;
            var lockNote = previous ? "Clear " + previous.name + " to unlock" : "Locked";
            html += '<article class="tour-card' + (unlocked ? "" : " locked") + '"' +
                ' style="--accent:' + venue.accent + '"' +
                ' aria-label="' + esc(venue.name) + (unlocked ? "" : ", locked") + '">' +
                '<div class="tour-index">' + (index + 1) + "</div>" +
                '<div class="tour-info">' +
                '<span class="district">' + esc(venue.district) + "</span>" +
                "<h3>" + esc(venue.name) + "</h3>" +
                "<p>" + esc(unlocked ? venue.tagline : lockNote) + "</p>" +
                "</div>" +
                '<div class="tour-side">' +
                (unlocked
                    ? '<span class="stars" aria-label="' + entry.stars + ' of 3 stars">' +
                        starsMarkup(entry.stars) + "</span>" +
                      '<button class="btn tiny primary tour-play" data-venue="' + venue.id + '" type="button">' +
                        (entry.cleared ? "Replay" : "Enter") + "</button>"
                    : '<span class="tour-lock" aria-hidden="true">🔒</span>') +
                "</div>" +
                "</article>";
        });
        if (els["tour-list"]) els["tour-list"].innerHTML = html;

        var note = document.querySelector("#screen-tour .tour-note");
        if (note) {
            var cleared = Storage.clearedVenues(p);
            note.textContent = cleared >= LC.VENUES.length
                ? "Circuit complete. Replay any venue to chase a three-star pour."
                : "Clear a venue to open the next. Stars come from keeping your own bar intact.";
        }
    };

    /* ---------- deck builder ---------- */

    function currentDraft() {
        var slot = UI.profile.activeDeck;
        if (!UI.deckDrafts[slot]) UI.deckDrafts[slot] = UI.profile.decks[slot].slice();
        return UI.deckDrafts[slot];
    }

    function draftIsDirty() {
        var draft = currentDraft();
        var saved = UI.profile.decks[UI.profile.activeDeck];
        if (!saved || draft.length !== saved.length) return true;
        for (var i = 0; i < draft.length; i++) {
            if (draft[i] !== saved[i]) return true;
        }
        return false;
    }

    function deckAverage(draft) {
        var filled = draft.filter(function (id) { return !!id; });
        if (filled.length !== draft.length || !filled.length) return null;
        var total = 0;
        for (var i = 0; i < filled.length; i++) total += CARDS[filled[i]].cost;
        return total / filled.length;
    }

    UI.renderDeck = function () {
        if (!UI.profile) return;
        var p = UI.profile;
        if (els["deck-tips"]) els["deck-tips"].textContent = p.tips;

        /* tabs */
        var tabs = "";
        for (var i = 0; i < 3; i++) {
            tabs += '<button class="deck-tab' + (i === p.activeDeck ? " active" : "") + '"' +
                ' data-tab="' + i + '" role="tab" aria-selected="' + (i === p.activeDeck) + '" type="button">' +
                "DECK " + (i + 1) + "</button>";
        }
        if (els["deck-tabs"]) els["deck-tabs"].innerHTML = tabs;

        UI.renderDeckSlots();
        UI.renderCollection();
    };

    UI.renderDeckSlots = function () {
        if (!UI.profile || !els["deck-slots"]) return;
        var draft = currentDraft();
        var html = "";
        for (var i = 0; i < 8; i++) {
            var id = draft[i];
            var card = CARDS[id];
            var selected = UI.selectedSlot === i;
            html += '<button class="deck-slot' + (card ? "" : " empty") + (selected ? " selected" : "") + '"' +
                ' data-slot="' + i + '" type="button" aria-label="' +
                (card ? "Slot " + (i + 1) + ": " + esc(card.name) : "Empty slot " + (i + 1)) +
                '. Tap to select this slot."' + '>';
            if (card) {
                html += '<img src="' + LC.Render.makePortrait(id, 96) + '" alt="">' +
                    '<span class="slot-cost">' + card.cost + "</span>" +
                    '<span class="slot-x" data-remove="' + i + '" title="Remove " aria-label="Remove ' +
                    esc(card.name) + '">×</span>';
            }
            html += "</button>";
        }
        els["deck-slots"].innerHTML = html;

        var avg = deckAverage(draft);
        if (els["deck-cost"]) {
            els["deck-cost"].textContent = "AVG BUZZ " +
                (avg === null ? "—" : avg.toFixed(1)) + (draftIsDirty() ? " · UNSAVED" : "");
        }
    };

    UI.renderCollection = function () {
        if (!UI.profile || !els.collection) return;
        var p = UI.profile;
        var draft = currentDraft();
        var html = "";
        LC.CARD_LIST.forEach(function (id) {
            var card = CARDS[id];
            if (UI.deckFilter !== "all" && card.family !== UI.deckFilter) return;
            var record = p.cards[id] || { level: 1, unlocked: false };
            var inDeck = draft.indexOf(id) !== -1;
            html += '<button class="card-tile' + (inDeck ? " in-deck" : "") +
                (record.unlocked ? "" : " locked") + '" data-card="' + id + '" type="button"' +
                ' aria-label="' + esc(card.name) + (record.unlocked ? ", level " + record.level : ", locked") + '">' +
                '<img src="' + LC.Render.makePortrait(id, 96) + '" alt="">' +
                '<span class="tile-cost">' + card.cost + "</span>" +
                (record.unlocked ? "" : '<span class="tile-lock" aria-hidden="true">🔒</span>') +
                '<span class="tile-name">' + esc(card.name) + "</span>" +
                '<span class="tile-level">' +
                    (record.unlocked ? "LVL <b>" + record.level + "</b>" : "LOCKED") +
                "</span></button>";
        });
        els.collection.innerHTML = html;
    };

    function saveDraft() {
        var draft = currentDraft();
        var filled = draft.filter(function (id) { return !!id; });
        if (filled.length !== 8) {
            UI.toast("Fill all 8 slots before saving.", "error");
            return;
        }
        var seen = {};
        for (var i = 0; i < draft.length; i++) {
            if (seen[draft[i]]) {
                UI.toast("No duplicate drinks in a deck.", "error");
                return;
            }
            seen[draft[i]] = true;
        }
        if (!Storage.validDeck(UI.profile, draft)) {
            UI.toast("That deck contains a locked card.", "error");
            return;
        }
        UI.profile.decks[UI.profile.activeDeck] = draft.slice();
        UI.deckDrafts[UI.profile.activeDeck] = draft.slice();
        UI.save();
        UI.refreshProfileUi();
        UI.renderDeck();
        selectSound();
        haptic(12);
        UI.toast("Deck saved. Pour when ready.");
    }

    /* ---------- card detail ---------- */

    function statCell(value, label) {
        return "<div><b>" + value + "</b><span>" + label + "</span></div>";
    }

    function cardStatsMarkup(card, level) {
        var s = LC.cardStatsAtLevel(card.id, level);
        if (!s) return "";
        if (card.type === "spell") {
            var effect = "—";
            if (typeof s.slow === "number") effect = Math.round((1 - s.slow) * 100) + "%";
            else if (typeof s.burnDps === "number") effect = Math.round(s.burnDps) + "/s";
            else if (typeof s.knockback === "number") effect = Math.round(s.knockback) + "px";
            return statCell(Math.round(s.damage || 0), "DAMAGE") +
                statCell(Math.round(s.radius || 0), "RADIUS") +
                statCell(effect, "EFFECT");
        }
        if (s.auraSlow) {
            return statCell(s.hp, "HP") +
                statCell(s.auraRadius || 0, "AURA") +
                statCell(Math.round((1 - s.auraSlow) * 100) + "%", "SLOW");
        }
        if (s.spawnId) {
            return statCell(s.hp, "HP") +
                statCell(s.spawnInterval + "s", "SPAWN") +
                statCell(s.lifetime + "s", "LIFETIME");
        }
        if (card.type === "building") {
            return statCell(s.hp, "HP") +
                statCell(Math.round(s.dmg || 0), "DAMAGE") +
                statCell(Math.round(s.lifetime || 0) + "s", "LIFETIME");
        }
        var thirdValue = Math.round(s.range || 0);
        var thirdLabel = "RANGE";
        if (s.heal) {
            thirdValue = Math.round(s.heal);
            thirdLabel = "HEAL";
        } else if (s.range && s.range < 70) {
            thirdValue = "MELEE";
        }
        return statCell(s.hp, "HP") +
            statCell(Math.round(s.dmg || 0), "DAMAGE") +
            statCell(thirdValue, thirdLabel);
    }

    UI.openCard = function (cardId) {
        var card = CARDS[cardId];
        if (!card || !UI.profile) return;
        UI.detailCard = cardId;
        var record = UI.profile.cards[cardId];
        var level = record ? record.level : 1;
        var unlocked = !!(record && record.unlocked);
        var draft = currentDraft();
        var inDeck = draft.indexOf(cardId) !== -1;
        var maxed = level >= C.MAX_LEVEL;
        var cost = LC.UPGRADE_COSTS[level];

        if (els["card-art"]) {
            els["card-art"].src = LC.Render.makePortrait(cardId, 240);
            els["card-art"].alt = card.name;
            els["card-art"].style.filter = unlocked ? "" : "grayscale(.85) brightness(.65)";
        }
        if (els["card-cost"]) els["card-cost"].textContent = card.cost;
        if (els["card-family"]) els["card-family"].textContent =
            card.family.toUpperCase() + " · " + card.rarity.toUpperCase();
        if (els["card-name"]) els["card-name"].textContent = card.name;
        if (els["card-role"]) els["card-role"].textContent = card.role;
        if (els["card-desc"]) els["card-desc"].textContent = card.desc;
        if (els["card-flavor"]) els["card-flavor"].textContent = card.flavor;
        if (els["card-stats"]) els["card-stats"].innerHTML = cardStatsMarkup(card, level);
        if (els["card-level"]) els["card-level"].textContent = level;

        if (els["btn-upgrade"]) {
            if (!unlocked) {
                els["btn-upgrade"].textContent = "Locked";
                els["btn-upgrade"].disabled = true;
            } else if (maxed) {
                els["btn-upgrade"].textContent = "Max level";
                els["btn-upgrade"].disabled = true;
            } else {
                els["btn-upgrade"].textContent = "Upgrade · " + cost;
                els["btn-upgrade"].disabled = false;
            }
        }
        if (els["btn-card-deck"]) {
            els["btn-card-deck"].textContent = inDeck ? "Remove from deck" : "Add to deck";
            els["btn-card-deck"].disabled = !unlocked;
        }
        var note = document.querySelector("#overlay-card .panel-note");
        if (!note) {
            note = document.createElement("p");
            note.className = "panel-note";
            var panel = document.querySelector("#overlay-card .panel");
            if (panel) panel.appendChild(note);
        }
        if (note) {
            if (!unlocked) {
                var venue = Storage.cardUnlockVenue(cardId);
                note.textContent = venue ? "Clear " + venue.name + " to unlock this drink." : "Locked.";
            } else {
                note.textContent = "Level " + level + " of " + C.MAX_LEVEL +
                    " · stats shown at this level."
            }
        }
        UI.openOverlay("overlay-card");
    };

    function updateCardModal() {
        if (UI.detailCard) UI.openCard(UI.detailCard);
    }

    function addOrRemoveCard(cardId) {
        var record = UI.profile.cards[cardId];
        if (!record || !record.unlocked) {
            UI.toast("Clear the venue to unlock this drink.", "error");
            return;
        }
        var draft = currentDraft();
        var index = draft.indexOf(cardId);
        if (index !== -1) {
            draft[index] = null;
            UI.selectedSlot = index;
            UI.toast("Removed " + cardName(cardId) + " from the deck.");
        } else {
            var slot = UI.selectedSlot;
            if (slot < 0 || slot > 7) slot = 0;
            draft[slot] = cardId;
            UI.selectedSlot = slot;
            UI.toast("Placed " + cardName(cardId) + " in slot " + (slot + 1) + ". Save the deck.");
        }
        selectSound();
        haptic(8);
        UI.renderDeck();
        updateCardModal();
    }

    /* ---------- practice ---------- */

    UI.openPractice = function () {
        UI.openOverlay("overlay-practice");
        UI.setDifficulty(UI.difficulty);
        UI.ensureMenuMusic();
    };

    UI.setDifficulty = function (key) {
        UI.difficulty = key;
        var buttons = document.querySelectorAll("#difficulty-row .diff");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("active", buttons[i].getAttribute("data-diff") === key);
        }
    };

    /* ---------- match presentation ---------- */

    UI.bindMatch = function (state, info) {
        UI.state = state;
        UI.matchInfo = info;
        UI.selectedIndex = -1;
        UI.preview = null;
        UI.drag = null;
        UI.handSignature = "";
        UI.lastHud = {};
        UI.tutorialClosed = false;
        UI.tutorialStage = -1;
        UI.tutorialHideAt = 0;
        UI.resultData = null;
        closeAllOverlays();
        UI.hideTutorial();
        UI.hideArenaToast();
        UI.clearSelection();
        UI.showScreen("game");
        if (info && info.venue && els["venue-name"]) {
            els["venue-name"].textContent = info.venue.name.toUpperCase();
        }
        UI.updateMatch(state);
        UI.maybeTutorial(state);
    };

    UI.clearMatch = function () {
        UI.state = null;
        UI.selectedIndex = -1;
        UI.preview = null;
        UI.drag = null;
        UI.handSignature = "";
        UI.lastHud = {};
        UI.hideTutorial();
        UI.hideArenaToast();
        if (els.hand) els.hand.innerHTML = "";
        if (els["selected-hint"]) els["selected-hint"].hidden = true;
    };

    UI.hideArenaToast = function () {
        if (els["arena-toast"]) els["arena-toast"].hidden = true;
        if (arenaToastTimer) {
            clearTimeout(arenaToastTimer);
            arenaToastTimer = null;
        }
    };

    UI.updateMatch = function (state) {
        if (!state || state !== UI.state) return;

        var timer = U.formatTime(state.remaining);
        if (els["match-timer"] && UI.lastHud.timer !== timer) {
            els["match-timer"].textContent = timer;
            UI.lastHud.timer = timer;
        }
        var urgent = state.phase === "overtime" || state.remaining <= 10;
        if (els["match-timer"]) els["match-timer"].classList.toggle("urgent", urgent);

        var phaseText = state.phase === "overtime" ? "OVERTIME"
            : (state.happyHour ? "HAPPY HOUR" : "REGULATION");
        if (els["match-phase"] && UI.lastHud.phase !== phaseText) {
            els["match-phase"].textContent = phaseText;
            UI.lastHud.phase = phaseText;
        }
        if (els["match-phase"]) {
            els["match-phase"].classList.toggle("happy", phaseText === "HAPPY HOUR");
            els["match-phase"].classList.toggle("overtime", phaseText === "OVERTIME");
        }

        var crowns = state.crowns.player + "–" + state.crowns.enemy;
        if (UI.lastHud.crowns !== crowns) {
            if (els["crown-player"]) els["crown-player"].textContent = state.crowns.player;
            if (els["crown-enemy"]) els["crown-enemy"].textContent = state.crowns.enemy;
            UI.lastHud.crowns = crowns;
        }

        var buzz = Math.round(state.buzz.player * 10) / 10;
        var buzzText = buzz.toFixed(1);
        if (UI.lastHud.buzz !== buzzText) {
            if (els["buzz-value"]) els["buzz-value"].textContent = buzzText;
            UI.lastHud.buzz = buzzText;
        }
        if (els["buzz-fill"]) {
            els["buzz-fill"].style.width = U.clamp((state.buzz.player / C.BUZZ_MAX) * 100, 0, 100) + "%";
        }
        if (els["buzz-bar"]) els["buzz-bar"].classList.toggle("happy", !!state.happyHour);

        if (els["happy-badge"]) {
            els["happy-badge"].hidden = !state.happyHour;
            els["happy-badge"].textContent = state.phase === "overtime"
                ? "OVERTIME ×1.35" : "HAPPY HOUR ×2";
        }

        var handSig = state.hand.player.join("|");
        if (handSig !== UI.handSignature) {
            UI.handSignature = handSig;
            UI.renderHand(state);
        }
        UI.updateHandState(state);
        UI.updateNextCard(state);
        UI.updateHint();
        UI.maybeTutorial(state);
    };

    UI.renderHand = function (state) {
        if (!els.hand) return;
        var html = "";
        state.hand.player.forEach(function (id, index) {
            var card = CARDS[id];
            if (!card) return;
            html += '<button class="hand-card" data-hand-index="' + index + '" type="button"' +
                ' aria-label="' + esc(card.name) + ", " + card.cost + " Buzz. Press " + (index + 1) + '."' +
                ' aria-pressed="false">' +
                '<span class="hc-cost">' + card.cost + "</span>" +
                '<img src="' + LC.Render.makePortrait(id, 96) + '" alt="">' +
                '<span class="hc-name">' + esc(card.name) + "</span>" +
                '<span class="hc-key">' + (index + 1) + "</span>" +
                "</button>";
        });
        els.hand.innerHTML = html;
        UI.lastHud.afford = "";
    };

    UI.updateHandState = function (state) {
        if (!els.hand || !state) return;
        var cards = els.hand.querySelectorAll(".hand-card");
        var afford = "";
        for (var i = 0; i < cards.length; i++) {
            var id = state.hand.player[i];
            var card = CARDS[id];
            if (!card) continue;
            var can = state.buzz.player + 0.0001 >= card.cost;
            afford += can ? "1" : "0";
            cards[i].classList.toggle("unaffordable", !can);
            var selected = i === UI.selectedIndex;
            cards[i].classList.toggle("selected", selected);
            cards[i].setAttribute("aria-pressed", selected ? "true" : "false");
        }
        if (UI.lastHud.afford !== afford) UI.lastHud.afford = afford;
    };

    UI.updateNextCard = function (state) {
        var id = state.next.player;
        if (!id || !CARDS[id]) return;
        if (UI.lastHud.next !== id) {
            UI.lastHud.next = id;
            if (els["next-card-img"]) {
                els["next-card-img"].src = LC.Render.makePortrait(id, 96);
                els["next-card-img"].alt = CARDS[id].name;
            }
            if (els["next-card-cost"]) els["next-card-cost"].textContent = CARDS[id].cost;
        }
    };

    UI.updateHint = function () {
        var hint = els["selected-hint"];
        if (!hint) return;
        if (!UI.state || UI.selectedIndex < 0) {
            hint.hidden = true;
            return;
        }
        var id = UI.state.hand.player[UI.selectedIndex];
        var card = CARDS[id];
        if (!card) {
            hint.hidden = true;
            return;
        }
        hint.hidden = false;
        hint.textContent = card.name + " · " +
            (card.type === "spell" ? "tap anywhere" : "tap your half") +
            " · 1–4 · arrows move · Enter deploys";
    };

    /* ---------- selection + deployment ---------- */

    UI.selectCard = function (index, keyboard) {
        if (!UI.state || UI.state.phase === "ended") return;
        if (LC.Game && LC.Game.isPaused && LC.Game.isPaused()) return;
        var id = UI.state.hand.player[index];
        if (!id) return;
        UI.selectedIndex = index;
        if (keyboard) {
            var card = CARDS[id];
            var x = C.W / 2;
            var y = card.type === "spell" ? C.RIVER.y : 1120;
            UI.setPreview(index, x, y);
        }
        selectSound();
        haptic(8);
        UI.updateHandState(UI.state);
        UI.updateHint();
    };

    UI.clearSelection = function () {
        if (UI.drag) endDrag(null, true);
        UI.selectedIndex = -1;
        UI.preview = null;
        if (els.hand) {
            var cards = els.hand.querySelectorAll(".hand-card");
            for (var i = 0; i < cards.length; i++) {
                cards[i].classList.remove("selected", "dragging");
                cards[i].setAttribute("aria-pressed", "false");
            }
        }
        if (els["selected-hint"]) els["selected-hint"].hidden = true;
        if (els["drag-ghost"]) els["drag-ghost"].hidden = true;
    };

    UI.setPreview = function (index, x, y) {
        if (!UI.state) return;
        var id = UI.state.hand.player[index];
        var card = CARDS[id];
        if (!card) return;
        x = U.clamp(x, C.FIELD_MIN_X + 10, C.FIELD_MAX_X - 10);
        y = U.clamp(y, C.FIELD_MIN_Y + 10, C.FIELD_MAX_Y - 10);
        var check = LC.Sim.canDeploy(UI.state, "player", id, x, y);
        UI.preview = {
            cardId: id,
            x: x,
            y: y,
            valid: check.ok && UI.state.buzz.player + 0.0001 >= card.cost
        };
    };

    UI.getPreview = function () {
        if (!UI.state || UI.selectedIndex < 0) return null;
        return UI.preview;
    };

    UI.tryDeploy = function (index, x, y) {
        if (!UI.state || UI.state.phase === "ended") return false;
        if (LC.Game && LC.Game.isPaused && LC.Game.isPaused()) return false;
        var result = LC.Game.deploy(index, x, y);
        if (result && result.ok) {
            haptic(14);
            UI.clearSelection();
            return true;
        }
        UI.arenaToast((result && result.reason) || "Can't deploy there.");
        if (LC.Audio) LC.Audio.error();
        return false;
    };

    /* pointer interaction: drag from the hand, or tap card then tap the bar. */

    function ghostFor(index) {
        var ghost = els["drag-ghost"] || $("drag-ghost");
        var id = UI.state && UI.state.hand.player[index];
        var card = id && CARDS[id];
        if (!ghost || !card) return;
        ghost.innerHTML = '<img src="' + LC.Render.makePortrait(id, 96) + '" alt="">' +
            "<b>" + card.cost + "</b>";
    }

    function onHandPointerDown(ev) {
        var button = ev.target.closest ? ev.target.closest(".hand-card") : null;
        if (!button) return;
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        if (!UI.state || UI.state.phase === "ended") return;
        if (UI.anyOverlayOpen()) return;
        if (LC.Game && LC.Game.isPaused && LC.Game.isPaused()) return;
        var index = Number(button.getAttribute("data-hand-index"));
        if (isNaN(index)) return;
        ev.preventDefault();
        if (UI.selectedIndex !== index) UI.selectCard(index, false);
        UI.drag = {
            index: index,
            startX: ev.clientX,
            startY: ev.clientY,
            dragging: false
        };
        document.addEventListener("pointermove", onDocPointerMove, { passive: false });
        document.addEventListener("pointerup", onDocPointerUp);
        document.addEventListener("pointercancel", onDocPointerCancel);
    }

    function onDocPointerMove(ev) {
        var drag = UI.drag;
        if (!drag) return;
        var dx = ev.clientX - drag.startX;
        var dy = ev.clientY - drag.startY;
        if (!drag.dragging && Math.abs(dx) + Math.abs(dy) > 8) {
            drag.dragging = true;
            ghostFor(drag.index);
            var ghost = els["drag-ghost"] || $("drag-ghost");
            if (ghost) ghost.hidden = false;
            var button = els.hand && els.hand.querySelector('[data-hand-index="' + drag.index + '"]');
            if (button) button.classList.add("dragging");
        }
        if (!drag.dragging) return;
        ev.preventDefault();
        var ghostEl = els["drag-ghost"] || $("drag-ghost");
        if (ghostEl) {
            ghostEl.style.left = ev.clientX + "px";
            ghostEl.style.top = ev.clientY + "px";
        }
        var point = LC.Input.toWorld(ev.clientX, ev.clientY);
        if (point.inside) {
            UI.setPreview(drag.index, point.x, point.y);
        } else {
            UI.preview = null;
        }
    }

    function endDrag(ev, cancelled) {
        var drag = UI.drag;
        if (!drag) return;
        document.removeEventListener("pointermove", onDocPointerMove);
        document.removeEventListener("pointerup", onDocPointerUp);
        document.removeEventListener("pointercancel", onDocPointerCancel);
        var ghost = els["drag-ghost"] || $("drag-ghost");
        if (ghost) ghost.hidden = true;
        var button = els.hand && els.hand.querySelector('[data-hand-index="' + drag.index + '"]');
        if (button) button.classList.remove("dragging");
        UI.drag = null;
        if (cancelled || !drag.dragging) return;
        var point = LC.Input.toWorld(ev.clientX, ev.clientY);
        if (point.inside) UI.tryDeploy(drag.index, point.x, point.y);
    }

    function onDocPointerUp(ev) {
        endDrag(ev, false);
    }

    function onDocPointerCancel() {
        endDrag(null, true);
    }

    /* ---------- arena pointer ---------- */

    var arenaPointerDown = false;

    function onArenaMove(point) {
        if (!UI.state || UI.selectedIndex < 0) return;
        if (UI.drag && UI.drag.dragging) return;
        if (!point.inside) {
            UI.preview = null;
            return;
        }
        UI.setPreview(UI.selectedIndex, point.x, point.y);
    }

    function onArenaDown(point) {
        if (!UI.state || UI.selectedIndex < 0) return;
        arenaPointerDown = true;
        if (point.inside) UI.setPreview(UI.selectedIndex, point.x, point.y);
    }

    function onArenaUp(point) {
        if (!UI.state) return;
        var wasDown = arenaPointerDown;
        arenaPointerDown = false;
        if (!wasDown) return;
        if (UI.selectedIndex < 0) {
            UI.arenaToast("Pick a drink from your hand first.");
            return;
        }
        if (point.inside) UI.tryDeploy(UI.selectedIndex, point.x, point.y);
    }

    function onArenaLeave() {
        arenaPointerDown = false;
        UI.preview = null;
    }

    /* ---------- keyboard ---------- */

    function defaultKeyboardPreview() {
        if (!UI.state || UI.selectedIndex < 0) return;
        var id = UI.state.hand.player[UI.selectedIndex];
        var card = CARDS[id];
        if (!card) return;
        if (!UI.preview || UI.preview.cardId !== id) {
            UI.setPreview(UI.selectedIndex,
                C.W / 2,
                card.type === "spell" ? C.RIVER.y : 1120);
        }
    }

    function onKeyDown(ev) {
        if (!UI.state || UI.screen !== "game") return;
        var key = ev.key;

        if (key === "Escape") {
            if (UI.drag) {
                endDrag(null, true);
                ev.preventDefault();
                return;
            }
            if (visibleOverlay("overlay-confirm")) {
                UI.closeOverlay("overlay-confirm");
                UI.confirmAction = null;
                if (LC.Game && LC.Game.isPaused && LC.Game.isPaused()) UI.showPause();
                ev.preventDefault();
                return;
            }
            if (visibleOverlay("overlay-settings")) {
                UI.closeOverlay("overlay-settings");
                ev.preventDefault();
                return;
            }
            if (visibleOverlay("overlay-pause")) {
                LC.Game.resume();
                ev.preventDefault();
                return;
            }
            if (visibleOverlay("overlay-card")) {
                UI.closeOverlay("overlay-card");
                ev.preventDefault();
                return;
            }
            if (visibleOverlay("overlay-how") || visibleOverlay("overlay-practice")) {
                UI.closeOverlay("overlay-how");
                UI.closeOverlay("overlay-practice");
                ev.preventDefault();
                return;
            }
            if (UI.selectedIndex >= 0) {
                UI.clearSelection();
                ev.preventDefault();
            }
            return;
        }

        if (UI.anyOverlayOpen()) return;
        if (LC.Game && LC.Game.isPaused && LC.Game.isPaused()) return;
        if (UI.state.phase === "ended") return;

        /* Let the button's own activation run first. The hand's keyboard
         * click selects the card and moves focus to the arena. */
        if ((key === "Enter" || key === " ") && ev.target &&
                ev.target.tagName === "BUTTON") return;

        if (key >= "1" && key <= "4") {
            var index = Number(key) - 1;
            UI.selectCard(index, true);
            ev.preventDefault();
            return;
        }

        if (key === "p" || key === "P") {
            LC.Game.pause();
            ev.preventDefault();
            return;
        }

        if (key === "ArrowLeft" || key === "ArrowRight" ||
                key === "ArrowUp" || key === "ArrowDown") {
            if (UI.selectedIndex < 0) return;
            defaultKeyboardPreview();
            var step = ev.shiftKey ? 140 : 64;
            var x = UI.preview.x;
            var y = UI.preview.y;
            if (key === "ArrowLeft") x -= step;
            if (key === "ArrowRight") x += step;
            if (key === "ArrowUp") y -= step;
            if (key === "ArrowDown") y += step;
            UI.setPreview(UI.selectedIndex, x, y);
            ev.preventDefault();
            return;
        }

        if (key === "Enter" || key === " ") {
            if (UI.selectedIndex < 0) {
                UI.arenaToast("Pick a card first: 1–4.");
                ev.preventDefault();
                return;
            }
            defaultKeyboardPreview();
            if (UI.preview) UI.tryDeploy(UI.selectedIndex, UI.preview.x, UI.preview.y);
            ev.preventDefault();
        }
    }

    /* ---------- tutorial ---------- */

    var TUTORIAL_AT = [0, 14, 30, 52, 78, 112];

    UI.showTutorial = function (text) {
        if (!els["tutorial-banner"] || !els["tutorial-text"]) return;
        els["tutorial-text"].textContent = text;
        els["tutorial-banner"].hidden = false;
    };

    UI.hideTutorial = function () {
        if (els["tutorial-banner"]) els["tutorial-banner"].hidden = true;
    };

    UI.maybeTutorial = function (state) {
        if (!state || !UI.matchInfo || UI.tutorialClosed) return;
        if (UI.profile.tutorialDone) return;
        if (UI.matchInfo.mode !== "tour" || !UI.matchInfo.venue ||
                UI.matchInfo.venue.index !== 0) return;
        var stage = -1;
        for (var i = 0; i < TUTORIAL_AT.length; i++) {
            if (state.clock >= TUTORIAL_AT[i]) stage = i;
        }
        if (stage < 0) return;
        if (stage !== UI.tutorialStage) {
            UI.tutorialStage = stage;
            UI.tutorialHideAt = state.clock + 10;
            UI.showTutorial(C.TUTORIAL[stage]);
        } else if (stage >= 0 && state.clock >= UI.tutorialHideAt) {
            UI.hideTutorial();
        }
    };

    /* ---------- pause + confirm ---------- */

    UI.showPause = function () {
        UI.openOverlay("overlay-pause");
    };

    UI.hidePause = function () {
        UI.closeOverlay("overlay-pause");
    };

    UI.showConfirm = function (text, action) {
        UI.confirmAction = action;
        if (els["confirm-text"]) els["confirm-text"].textContent = text ||
            "You will forfeit the round and earn no tips.";
        UI.openOverlay("overlay-confirm");
    };

    /* ---------- results ---------- */

    UI.showResult = function (data) {
        UI.resultData = data;
        var state = data.state;
        var result = state.result;
        var mode = data.mode;
        var venue = data.venue;
        var reward = data.reward || {
            tips: 0, stars: 0, firstClear: false, unlocked: []
        };
        var win = result.winner === "player";
        var draw = result.winner === "draw";

        if (els["result-kicker"]) {
            els["result-kicker"].textContent = mode === "practice"
                ? "QUICK MATCH · " + String(data.difficulty || "normal").toUpperCase()
                : (venue ? venue.district.toUpperCase() + " · " + venue.name.toUpperCase() : "MATCH COMPLETE");
        }
        if (els["result-title"]) {
            if (win) {
                els["result-title"].textContent = result.reason === "cellar"
                    ? "Cellar broken." : "Last call.";
            } else if (draw) {
                els["result-title"].textContent = "A dead heat.";
            } else {
                els["result-title"].textContent = "You've been cut off.";
            }
        }
        if (els["result-sub"]) {
            var sub;
            if (win) {
                sub = "You took the round " + result.crowns.player + "–" + result.crowns.enemy +
                    (venue ? " at " + venue.name : "") + ".";
                if (result.reason === "cellar") sub = "The rival Cellar is closed for good.";
                if (result.reason === "overtime") sub = "The first tower fell in overtime.";
            } else if (draw) {
                sub = "Nothing between you. The tour stays open.";
            } else {
                sub = "The rival took it " + result.crowns.enemy + "–" + result.crowns.player +
                    ". Pour one out and run it back.";
            }
            els["result-sub"].textContent = sub;
        }
        if (els["result-crowns"]) {
            els["result-crowns"].textContent = result.crowns.player + " — " + result.crowns.enemy;
        }
        if (els["result-stars"]) {
            if (mode === "practice") {
                els["result-stars"].hidden = true;
            } else {
                els["result-stars"].hidden = false;
                els["result-stars"].innerHTML = starsMarkup(reward.stars || 0);
            }
        }
        if (els["result-tips"]) els["result-tips"].textContent = reward.tips || 0;
        if (els["result-damage"]) els["result-damage"].textContent = result.stats.playerDamage || 0;
        if (els["result-cards"]) els["result-cards"].textContent = result.stats.cardsPlayed || 0;

        if (els["result-unlocks"]) {
            var notes = [];
            if (reward.unlocked && reward.unlocked.length) {
                notes.push("New on the shelf: <b>" +
                    reward.unlocked.map(function (id) { return esc(cardName(id)); }).join(", ") + "</b>");
            }
            if (reward.firstClear) notes.push("First clear bonus · +150 tips");
            if (win && mode !== "practice" && reward.stars === 3) {
                notes.push("Perfect pour · three stars");
            }
            els["result-unlocks"].innerHTML = notes.join("<br>");
        }

        if (els["btn-result-continue"]) {
            els["btn-result-continue"].textContent = mode === "practice"
                ? "Main menu" : "Back to the tour";
        }
        if (els["btn-result-menu"]) {
            els["btn-result-menu"].hidden = mode === "practice";
        }

        UI.refreshProfileUi();
        if (mode !== "practice") UI.renderTour();
        UI.openOverlay("overlay-result");
        UI.hidePause();
        setTimeout(function () {
            if (els["btn-result-continue"]) els["btn-result-continue"].focus();
        }, 80);
    };

    UI.hideResult = function () {
        UI.closeOverlay("overlay-result");
        UI.resultData = null;
    };

    /* ---------- install ---------- */

    function setupInstall() {
        var standalone = (window.matchMedia &&
            window.matchMedia("(display-mode: standalone)").matches) ||
            navigator.standalone === true;
        var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
        var hint = els["install-hint"] || $("install-hint");
        if (isIOS && !standalone && hint) hint.classList.add("show");

        window.addEventListener("beforeinstallprompt", function (ev) {
            ev.preventDefault();
            UI.installPrompt = ev;
            if (els["btn-install"]) els["btn-install"].hidden = false;
        });

        window.addEventListener("appinstalled", function () {
            UI.installPrompt = null;
            if (els["btn-install"]) els["btn-install"].hidden = true;
            if (hint) hint.classList.remove("show");
            UI.toast("LAST CALL installed. See you at the bar.");
        });
    }

    /* ---------- wiring ---------- */

    function wire() {
        var bind = function (id, event, handler) {
            var el = els[id] || $(id);
            if (el) el.addEventListener(event, handler);
        };

        bind("btn-play", "click", function () {
            clickSound();
            var venue = Storage.nextVenue(UI.profile);
            if (venue) LC.Game.startTour(venue);
        });
        bind("btn-tour", "click", function () {
            clickSound();
            UI.showScreen("tour");
        });
        bind("btn-deck", "click", function () {
            clickSound();
            UI.deckFilter = "all";
            UI.showScreen("deck");
        });
        bind("btn-practice", "click", function () {
            clickSound();
            UI.openPractice();
        });
        bind("btn-how", "click", function () {
            clickSound();
            UI.openOverlay("overlay-how");
            UI.ensureMenuMusic();
        });
        bind("btn-settings", "click", function () {
            clickSound();
            UI.settingsFromPause = false;
            UI.openOverlay("overlay-settings");
            UI.ensureMenuMusic();
        });

        var backs = document.querySelectorAll("[data-back]");
        for (var b = 0; b < backs.length; b++) {
            backs[b].addEventListener("click", function (ev) {
                clickSound();
                UI.showScreen(ev.currentTarget.getAttribute("data-back"));
            });
        }

        var closers = document.querySelectorAll("[data-close]");
        for (var c = 0; c < closers.length; c++) {
            closers[c].addEventListener("click", function (ev) {
                clickSound();
                UI.closeOverlay(ev.currentTarget.getAttribute("data-close"));
            });
        }

        ["overlay-how", "overlay-practice", "overlay-card"].forEach(function (id) {
            var el = $(id);
            if (el) el.addEventListener("click", function (ev) {
                if (ev.target === el) UI.closeOverlay(id);
            });
        });

        /* tour */
        if (els["tour-list"]) {
            els["tour-list"].addEventListener("click", function (ev) {
                var button = ev.target.closest ? ev.target.closest("[data-venue]") : null;
                if (!button) return;
                clickSound();
                var venue = LC.VENUE_BY_ID[button.getAttribute("data-venue")];
                if (venue) LC.Game.startTour(venue);
            });
        }

        /* deck tabs + slots */
        if (els["deck-tabs"]) {
            els["deck-tabs"].addEventListener("click", function (ev) {
                var button = ev.target.closest ? ev.target.closest("[data-tab]") : null;
                if (!button) return;
                clickSound();
                var slot = Number(button.getAttribute("data-tab"));
                if (slot === UI.profile.activeDeck) return;
                UI.profile.activeDeck = slot;
                UI.selectedSlot = 0;
                UI.save();
                UI.refreshProfileUi();
                UI.renderDeck();
            });
        }
        if (els["deck-slots"]) {
            els["deck-slots"].addEventListener("click", function (ev) {
                var remove = ev.target.closest ? ev.target.closest("[data-remove]") : null;
                var draft = currentDraft();
                if (remove) {
                    ev.stopPropagation();
                    var index = Number(remove.getAttribute("data-remove"));
                    var removed = draft[index];
                    draft[index] = null;
                    UI.selectedSlot = index;
                    clickSound();
                    UI.renderDeck();
                    if (removed) UI.toast("Removed " + cardName(removed) + ".");
                    return;
                }
                var button = ev.target.closest ? ev.target.closest("[data-slot]") : null;
                if (!button) return;
                clickSound();
                UI.selectedSlot = Number(button.getAttribute("data-slot"));
                UI.renderDeckSlots();
                var id = draft[UI.selectedSlot];
                if (id) UI.toast("Slot " + (UI.selectedSlot + 1) + " selected. Pick a card to replace it.");
                else UI.toast("Slot " + (UI.selectedSlot + 1) + " selected. Pick a card to fill it.");
            });
        }

        if (els["deck-filters"]) {
            els["deck-filters"].addEventListener("click", function (ev) {
                var button = ev.target.closest ? ev.target.closest("[data-family]") : null;
                if (!button) return;
                clickSound();
                UI.deckFilter = button.getAttribute("data-family");
                var filters = els["deck-filters"].querySelectorAll(".filter");
                for (var i = 0; i < filters.length; i++) {
                    filters[i].classList.toggle("active", filters[i] === button);
                }
                UI.renderCollection();
            });
        }

        if (els.collection) {
            els.collection.addEventListener("click", function (ev) {
                var button = ev.target.closest ? ev.target.closest("[data-card]") : null;
                if (!button) return;
                clickSound();
                UI.openCard(button.getAttribute("data-card"));
            });
        }

        bind("btn-deck-auto", "click", function () {
            clickSound();
            UI.deckDrafts[UI.profile.activeDeck] = LC.STARTER_DECK.slice();
            UI.selectedSlot = 0;
            UI.renderDeck();
            UI.toast("Starter deck loaded. Save to keep it.");
        });
        bind("btn-deck-save", "click", saveDraft);

        /* card detail */
        bind("btn-upgrade", "click", function () {
            if (!UI.detailCard) return;
            var record = UI.profile.cards[UI.detailCard];
            if (!record || !record.unlocked) {
                UI.toast("Clear the venue to unlock this drink.", "error");
                return;
            }
            var result = Storage.upgrade(UI.profile, UI.detailCard);
            if (!result.ok) {
                if (LC.Audio) LC.Audio.error();
                UI.toast(result.reason, "error");
                return;
            }
            UI.save();
            selectSound();
            if (LC.Audio) LC.Audio.upgrade();
            haptic(16);
            UI.refreshProfileUi();
            UI.renderDeck();
            UI.openCard(UI.detailCard);
            UI.toast(cardName(UI.detailCard) + " reached level " + result.level + ".");
        });
        bind("btn-card-deck", "click", function () {
            if (UI.detailCard) addOrRemoveCard(UI.detailCard);
        });

        /* match buttons */
        bind("btn-pause", "click", function () {
            if (LC.Game.isPaused && LC.Game.isPaused()) {
                LC.Game.resume();
            } else {
                LC.Game.pause();
            }
        });
        bind("btn-resume", "click", function () {
            clickSound();
            LC.Game.resume();
        });
        bind("btn-pause-settings", "click", function () {
            clickSound();
            UI.settingsFromPause = true;
            UI.hidePause();
            UI.openOverlay("overlay-settings");
        });
        bind("btn-quit", "click", function () {
            clickSound();
            UI.hidePause();
            UI.showConfirm("You will forfeit the round and earn no tips.",
                function () { LC.Game.leaveMatch(); });
        });
        bind("btn-confirm-no", "click", function () {
            clickSound();
            UI.closeOverlay("overlay-confirm");
            UI.confirmAction = null;
            if (LC.Game.isPaused && LC.Game.isPaused()) UI.showPause();
        });
        bind("btn-confirm-yes", "click", function () {
            clickSound();
            var action = UI.confirmAction;
            UI.closeOverlay("overlay-confirm");
            UI.confirmAction = null;
            if (action) action();
        });

        /* settings */
        bind("set-sound", "click", function () {
            UI.profile.sound = !UI.profile.sound;
            UI.applySettings();
            UI.save();
            clickSound();
        });
        bind("set-music", "click", function () {
            UI.profile.music = !UI.profile.music;
            UI.applySettings();
            UI.save();
            if (UI.profile.music && UI.screen !== "game") UI.ensureMenuMusic();
            clickSound();
        });
        bind("set-haptics", "click", function () {
            UI.profile.haptics = !UI.profile.haptics;
            UI.applySettings();
            UI.save();
            haptic(14);
            clickSound();
        });
        bind("set-motion", "click", function () {
            UI.profile.reducedMotion = !UI.profile.reducedMotion;
            UI.applySettings();
            UI.save();
            clickSound();
        });
        bind("btn-reset", "click", function () {
            if (!UI.resetArmed) {
                UI.resetArmed = true;
                els["btn-reset"].textContent = "Tap again to reset";
                els["btn-reset"].classList.add("armed");
                return;
            }
            UI.resetArmed = false;
            els["btn-reset"].textContent = "Reset progress";
            els["btn-reset"].classList.remove("armed");
            LC.Game.resetProgress();
        });

        /* practice */
        if (els["difficulty-row"]) {
            els["difficulty-row"].addEventListener("click", function (ev) {
                var button = ev.target.closest ? ev.target.closest("[data-diff]") : null;
                if (!button) return;
                clickSound();
                UI.setDifficulty(button.getAttribute("data-diff"));
            });
        }
        bind("btn-practice-start", "click", function () {
            clickSound();
            UI.closeOverlay("overlay-practice");
            LC.Game.startPractice(UI.difficulty);
        });

        /* results */
        bind("btn-result-continue", "click", function () {
            clickSound();
            LC.Game.resultContinue();
        });
        bind("btn-rematch", "click", function () {
            clickSound();
            UI.hideResult();
            LC.Game.rematch();
        });
        bind("btn-result-menu", "click", function () {
            clickSound();
            UI.hideResult();
            LC.Game.goMenu();
        });

        bind("tutorial-close", "click", function () {
            UI.tutorialClosed = true;
            UI.hideTutorial();
        });

        bind("install-hint", "click", function () {
            UI.toast("Share → Add to Home Screen.");
        });
        bind("btn-install", "click", function () {
            if (!UI.installPrompt) {
                UI.toast("Use your browser menu → Install app.");
                return;
            }
            var prompt = UI.installPrompt;
            UI.installPrompt = null;
            prompt.prompt();
            prompt.userChoice.then(function (choice) {
                if (choice && choice.outcome === "accepted") {
                    UI.toast("Installing LAST CALL…");
                }
                if (els["btn-install"]) els["btn-install"].hidden = true;
            }, function () {
                if (els["btn-install"]) els["btn-install"].hidden = true;
            });
        });

        /* hand + arena */
        if (els.hand) {
            els.hand.addEventListener("pointerdown", onHandPointerDown);
            els.hand.addEventListener("click", function (ev) {
                var button = ev.target.closest ? ev.target.closest(".hand-card") : null;
                if (!button) return;
                if (ev.detail === 0) {
                    UI.selectCard(Number(button.getAttribute("data-hand-index")), true);
                    if (els.arena) els.arena.focus();
                }
            });
        }

        if (LC.Input) {
            LC.Input.init(els.arena, {
                onMove: onArenaMove,
                onDown: onArenaDown,
                onUp: onArenaUp,
                onLeave: onArenaLeave
            });
        }

        document.addEventListener("keydown", onKeyDown);
    }

    /* ---------- boot ---------- */

    UI.init = function (profile) {
        IDS.forEach(function (id) {
            if (!els[id]) els[id] = $(id);
        });
        UI.profile = profile;
        wire();
        setupInstall();
        UI.applySettings();
        UI.refreshProfileUi();
        UI.showScreen("menu");
    };

    LC.UI = UI;
})(window.LC = window.LC || {});