/*
 * LAST CALL local profile.
 *
 * One localStorage record. No accounts, no server. The load path is defensive
 * on purpose: an old or hand-edited save should boot into a legal deck rather
 * than a blank screen.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var KEY = "random2-last-call-v1";
    var VERSION = 1;

    var Storage = {};

    function freshCardMap() {
        var cards = {};
        LC.CARD_LIST.forEach(function (id) {
            cards[id] = {
                level: 1,
                unlocked: LC.STARTER_DECK.indexOf(id) !== -1
            };
        });
        return cards;
    }

    function freshVenueMap() {
        var tour = {};
        LC.VENUES.forEach(function (v) {
            tour[v.id] = { stars: 0, wins: 0, bestCrowns: 0, cleared: false };
        });
        return tour;
    }

    function defaultProfile() {
        return {
            version: VERSION,
            createdAt: Date.now(),
            tips: 150,
            cards: freshCardMap(),
            decks: [
                LC.STARTER_DECK.slice(),
                LC.STARTER_DECK.slice(),
                LC.STARTER_DECK.slice()
            ],
            activeDeck: 0,
            tour: freshVenueMap(),
            stats: {
                matches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                crowns: 0,
                bestCrowns: 0,
                streak: 0,
                bestStreak: 0,
                tipsEarned: 0,
                cardCounts: {},
                favorite: null
            },
            tutorialDone: false,
            sound: true,
            music: true,
            haptics: true,
            reducedMotion: false
        };
    }

    function validDeck(profile, deck) {
        if (!Array.isArray(deck) || deck.length !== 8) return false;
        var seen = {};
        for (var i = 0; i < deck.length; i++) {
            var id = deck[i];
            if (!LC.CARDS[id] || LC.CARDS[id].hidden) return false;
            if (seen[id]) return false;
            seen[id] = true;
            if (!profile.cards[id] || !profile.cards[id].unlocked) return false;
        }
        return true;
    }

    function fallbackDeck(profile) {
        var legal = LC.STARTER_DECK.filter(function (id) {
            return profile.cards[id] && profile.cards[id].unlocked;
        });
        if (legal.length < 8) {
            /* A corrupt save: unlock the starters again. */
            LC.STARTER_DECK.forEach(function (id) {
                if (!profile.cards[id]) profile.cards[id] = { level: 1, unlocked: true };
                profile.cards[id].unlocked = true;
            });
            return LC.STARTER_DECK.slice();
        }
        return legal.slice(0, 8);
    }

    function sanitize(profile) {
        if (!profile || typeof profile !== "object") profile = defaultProfile();
        if (profile.version !== VERSION) profile.version = VERSION;

        if (typeof profile.tips !== "number" || !isFinite(profile.tips)) profile.tips = 0;
        profile.tips = Math.max(0, Math.floor(profile.tips));

        if (!profile.cards || typeof profile.cards !== "object") profile.cards = {};
        LC.CARD_LIST.forEach(function (id) {
            var c = profile.cards[id];
            if (!c || typeof c !== "object") c = profile.cards[id] = {};
            c.level = Math.max(1, Math.min(C.MAX_LEVEL, Math.floor(c.level || 1)));
            if (typeof c.unlocked !== "boolean") {
                c.unlocked = LC.STARTER_DECK.indexOf(id) !== -1;
            }
        });

        /* Remove unknown card records. */
        Object.keys(profile.cards).forEach(function (id) {
            if (!LC.CARDS[id] || LC.CARDS[id].hidden) delete profile.cards[id];
        });

        if (!Array.isArray(profile.decks) || profile.decks.length !== 3) {
            profile.decks = [];
            for (var i = 0; i < 3; i++) profile.decks.push(fallbackDeck(profile));
        }
        profile.decks = profile.decks.map(function (deck, index) {
            return validDeck(profile, deck) ? deck.slice() : fallbackDeck(profile);
        });

        profile.activeDeck = Math.max(0, Math.min(2, Math.floor(profile.activeDeck || 0)));

        if (!profile.tour || typeof profile.tour !== "object") profile.tour = {};
        LC.VENUES.forEach(function (v) {
            var t = profile.tour[v.id];
            if (!t || typeof t !== "object") t = profile.tour[v.id] = {};
            t.stars = Math.max(0, Math.min(3, Math.floor(t.stars || 0)));
            t.wins = Math.max(0, Math.floor(t.wins || 0));
            t.bestCrowns = Math.max(0, Math.min(3, Math.floor(t.bestCrowns || 0)));
            t.cleared = !!t.cleared || t.stars > 0;
        });

        if (!profile.stats || typeof profile.stats !== "object") {
            profile.stats = defaultProfile().stats;
        }
        var st = profile.stats;
        ["matches", "wins", "losses", "draws", "crowns", "bestCrowns",
            "streak", "bestStreak", "tipsEarned"].forEach(function (k) {
            if (typeof st[k] !== "number" || !isFinite(st[k])) st[k] = 0;
            st[k] = Math.max(0, Math.floor(st[k]));
        });
        if (!st.cardCounts || typeof st.cardCounts !== "object") st.cardCounts = {};
        Object.keys(st.cardCounts).forEach(function (id) {
            if (!LC.CARDS[id] || LC.CARDS[id].hidden) delete st.cardCounts[id];
            else st.cardCounts[id] = Math.max(0, Math.floor(st.cardCounts[id] || 0));
        });

        profile.tutorialDone = !!profile.tutorialDone;
        profile.sound = profile.sound !== false;
        profile.music = profile.music !== false;
        profile.haptics = profile.haptics !== false;
        profile.reducedMotion = !!profile.reducedMotion;
        return profile;
    }

    Storage.load = function () {
        try {
            var raw = localStorage.getItem(KEY);
            if (!raw) return defaultProfile();
            var data = JSON.parse(raw);
            return sanitize(data);
        } catch (e) {
            return defaultProfile();
        }
    };

    Storage.save = function (profile) {
        try {
            localStorage.setItem(KEY, JSON.stringify(profile));
            return true;
        } catch (e) {
            return false;
        }
    };

    Storage.reset = function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        return defaultProfile();
    };

    Storage.defaultProfile = defaultProfile;
    Storage.KEY = KEY;

    Storage.setDeck = function (profile, slot, deck) {
        slot = Math.max(0, Math.min(2, slot | 0));
        if (!validDeck(profile, deck)) return false;
        profile.decks[slot] = deck.slice();
        return true;
    };

    Storage.validDeck = validDeck;

    Storage.upgrade = function (profile, cardId) {
        var c = profile.cards[cardId];
        if (!c || !c.unlocked) return { ok: false, reason: "Locked" };
        if (c.level >= C.MAX_LEVEL) return { ok: false, reason: "Max level" };
        var cost = LC.UPGRADE_COSTS[c.level];
        if (!cost) return { ok: false, reason: "Max level" };
        if (profile.tips < cost) return { ok: false, reason: "Not enough tips" };
        profile.tips -= cost;
        c.level++;
        return { ok: true, level: c.level, cost: cost };
    };

    Storage.addTips = function (profile, amount) {
        profile.tips = Math.max(0, Math.floor(profile.tips + amount));
    };

    Storage.recordMatch = function (profile, state, mode, venue) {
        if (!state || !state.result) return null;
        var result = state.result;
        var winner = result.winner;
        var tourMode = mode !== "practice";
        var stars = tourMode && venue ? LC.starsFor(state) : 0;
        var tips = LC.tipsFor(state, venue, mode);
        var firstClear = false;
        var unlocked = [];

        if (tourMode && venue) {
            var entry = profile.tour[venue.id] || { stars: 0, wins: 0, bestCrowns: 0, cleared: false };
            if (winner === "player") {
                if (!entry.cleared) {
                    firstClear = true;
                    tips += C.TIPS.firstClear;
                    (venue.unlock || []).forEach(function (id) {
                        if (profile.cards[id] && !profile.cards[id].unlocked) {
                            profile.cards[id].unlocked = true;
                            unlocked.push(id);
                        }
                    });
                }
                entry.wins++;
                entry.cleared = true;
                entry.stars = Math.max(entry.stars, stars);
                entry.bestCrowns = Math.max(entry.bestCrowns, state.crowns.player);
            }
            profile.tour[venue.id] = entry;
        }

        profile.tips += tips;
        profile.stats.matches++;
        profile.stats.crowns += state.crowns.player;
        profile.stats.bestCrowns = Math.max(profile.stats.bestCrowns, state.crowns.player);
        profile.stats.tipsEarned += tips;
        if (winner === "player") {
            profile.stats.wins++;
            profile.stats.streak++;
            profile.stats.bestStreak = Math.max(profile.stats.bestStreak, profile.stats.streak);
        } else if (winner === "draw") {
            profile.stats.draws++;
            profile.stats.streak = 0;
        } else {
            profile.stats.losses++;
            profile.stats.streak = 0;
        }

        var counts = result.stats.playerCards || {};
        Object.keys(counts).forEach(function (id) {
            profile.stats.cardCounts[id] = (profile.stats.cardCounts[id] || 0) + counts[id];
        });
        var favourite = null;
        var best = 0;
        Object.keys(profile.stats.cardCounts).forEach(function (id) {
            if (profile.stats.cardCounts[id] > best) {
                best = profile.stats.cardCounts[id];
                favourite = id;
            }
        });
        profile.stats.favorite = favourite;
        profile.tutorialDone = true;

        return {
            stars: stars,
            tips: tipsIncludingFirstClear(tips),
            firstClear: firstClear,
            unlocked: unlocked,
            winner: winner,
            crowns: result.crowns
        };
    };

    /* recordMatch already folded first-clear into profile.tips; the result
     * panel wants the full number, so compute it the same way. */
    function tipsIncludingFirstClear(tips) {
        return tips;
    }

    Storage.totalStars = function (profile) {
        var total = 0;
        LC.VENUES.forEach(function (v) {
            var t = profile.tour[v.id];
            if (t) total += t.stars || 0;
        });
        return total;
    };

    Storage.clearedVenues = function (profile) {
        return LC.VENUES.filter(function (v) {
            var t = profile.tour[v.id];
            return t && t.cleared;
        }).length;
    };

    Storage.venueUnlocked = function (profile, venue) {
        if (!venue) return false;
        if (venue.index === 0) return true;
        var prev = LC.VENUES[venue.index - 1];
        var t = profile.tour[prev.id];
        return !!(t && t.cleared);
    };

    Storage.nextVenue = function (profile) {
        for (var i = 0; i < LC.VENUES.length; i++) {
            var v = LC.VENUES[i];
            if (Storage.venueUnlocked(profile, v) && !profile.tour[v.id].cleared) return v;
        }
        var last = LC.VENUES[LC.VENUES.length - 1];
        return Storage.venueUnlocked(profile, last) ? last : LC.VENUES[0];
    };

    Storage.cardUnlockVenue = function (cardId) {
        for (var i = 0; i < LC.VENUES.length; i++) {
            if ((LC.VENUES[i].unlock || []).indexOf(cardId) !== -1) return LC.VENUES[i];
        }
        return null;
    };

    Storage.markPlayed = function () {
        try {
            if (window.R2 && window.R2.markPlayed) window.R2.markPlayed(C.SLUG);
        } catch (e) {}
    };

    LC.Storage = Storage;
})(window.LC = window.LC || {});