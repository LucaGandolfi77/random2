/*
 * LAST CALL rival bartender AI.
 *
 * It sees only what a player sees: its hand, its Buzz, the units on the bar.
 * Every action goes through Sim.playCard(), so it obeys the same deployment
 * rules and costs. The venue config changes reaction time, card levels and
 * how often it makes a bad call — not the rules.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var U = LC.U;
    var CARDS = LC.CARDS;

    var AI = {};

    function affordable(state, card) {
        return state.buzz.enemy + 0.0001 >= card.cost;
    }

    function handOptions(state) {
        var out = [];
        state.hand.enemy.forEach(function (id, index) {
            var card = CARDS[id];
            if (card) out.push({ card: card, index: index });
        });
        return out;
    }

    function enemies(state) {
        return state.units.filter(function (u) {
            return u.side === "player" && u.alive && u.deployTimer <= 0;
        });
    }

    function ownUnits(state) {
        return state.units.filter(function (u) {
            return u.side === "enemy" && u.alive && u.deployTimer <= 0;
        });
    }

    function denseGroup(state, units, radius) {
        var best = null;
        for (var i = 0; i < units.length; i++) {
            var center = units[i];
            var group = units.filter(function (u) {
                return U.dist(u.x, u.y, center.x, center.y) <= radius;
            });
            if (!best || group.length > best.length) {
                var x = 0, y = 0, hp = 0;
                group.forEach(function (u) { x += u.x; y += u.y; hp += u.hp; });
                best = group;
                best.center = { x: x / group.length, y: y / group.length, hp: hp };
            }
        }
        return best;
    }

    function mostDangerous(state, units) {
        var best = null;
        var bestScore = -Infinity;
        units.forEach(function (u) {
            var score = (2000 - u.y) + u.hp * 0.5 + (u.dmg || 0) * 2;
            if (score > bestScore) {
                bestScore = score;
                best = u;
            }
        });
        return best;
    }

    function laneX(lane) {
        return lane === "left" ? C.BRIDGES[0].x : C.BRIDGES[1].x;
    }

    function laneOf(x) {
        return x < C.W / 2 ? "left" : "right";
    }

    function canPlace(state, cardId, x, y) {
        return LC.Sim.canDeploy(state, "enemy", cardId, x, y);
    }

    function findPlacement(state, card, preferredX, preferredY) {
        var candidates = [
            { x: preferredX, y: preferredY },
            { x: laneX(laneOf(preferredX)), y: 640 },
            { x: laneX(laneOf(preferredX)), y: 560 },
            { x: laneX(laneOf(preferredX)), y: 700 },
            { x: C.W / 2, y: 660 },
            { x: C.W / 2, y: 560 },
            { x: 180, y: 300 },
            { x: 720, y: 300 }
        ];
        for (var i = 0; i < candidates.length; i++) {
            var p = candidates[i];
            if (canPlace(state, card.id, p.x, p.y).ok) {
                return { x: p.x, y: p.y };
            }
        }
        return null;
    }

    function defenseScore(state, option, threats, config) {
        var card = option.card;
        var score = 0;
        var group = denseGroup(state, threats, 150);
        var swarm = threats.length >= 3;
        var tank = threats.some(function (t) { return t.maxHp >= 1200; });

        if (card.type === "spell") {
            if (group && group.length >= 3) score += 26 + group.length * 3;
            else if (group && group.length === 2 && group.center.hp > 1300) score += 16;
            else score -= 8;
        } else if (card.type === "building") {
            score += 12;
            if (tank) score += 0;
        } else {
            score += 6;
            if (card.s.splash && swarm) score += 12;
            if (card.s.count >= 3 && !swarm) score += 3;
            if (tank && (card.s.onlyBuildings || card.s.hp > 900 || card.s.dmg >= 180)) score += 8;
            if (swarm && card.s.splash) score += 4;
            if (card.s.range >= 250) score += 3;
            if (card.s.hp >= 1800) score += 4;
        }

        score += Math.max(0, 5 - card.cost) * 0.6;
        score += state.rng.next() * (6 - config.aggression * 3);
        return score;
    }

    function offenseScore(state, option, own, config) {
        var card = option.card;
        var score = 0;
        if (card.type === "spell") {
            score -= 4;
        } else if (card.type === "building") {
            score -= 2;
        } else {
            score += card.cost * 1.4;
            if (card.s.hp >= 1800) score += 9;
            if (card.s.onlyBuildings) score += 6;
            if (card.s.range >= 300) score += 3;
            if (card.s.count >= 3) score += 2;
        }
        if (own.length >= 2) {
            if (card.s.range >= 250 || card.s.count >= 3) score += 7;
        }
        score += state.rng.next() * (5 + config.aggression * 4);
        return score;
    }

    function chooseBest(options, scorer, config) {
        var best = null;
        var bestScore = -Infinity;
        options.forEach(function (option) {
            var score = scorer(option);
            if (score > bestScore) {
                bestScore = score;
                best = option;
            }
        });
        return best;
    }

    function playSpell(state, option, threats) {
        var group = denseGroup(state, threats, (option.card.s.radius || 140) * 0.85);
        if (!group || group.length < 2) return false;
        var x = U.clamp(group.center.x, C.FIELD_MIN_X + 20, C.FIELD_MAX_X - 20);
        var y = U.clamp(group.center.y, C.FIELD_MIN_Y + 20, C.FIELD_MAX_Y - 20);
        var res = LC.Sim.playCard(state, "enemy", option.index, x, y);
        if (res.ok) state.ai.plays = (state.ai.plays || 0) + 1;
        return res.ok;
    }

    function defend(state, options, threats, config) {
        var affordableOptions = options.filter(function (o) { return affordable(state, o.card); });
        if (!affordableOptions.length) return false;

        var group = denseGroup(state, threats, 150);
        var spell = affordableOptions.filter(function (o) { return o.card.type === "spell"; });
        if (spell.length && group && group.length >= (config.mistake > 0.15 ? 3 : 2)) {
            var bestSpell = chooseBest(spell, function (o) { return defenseScore(state, o, threats, config); }, config);
            if (bestSpell && playSpell(state, bestSpell, threats)) return true;
        }

        var pick = chooseBest(affordableOptions, function (o) {
            return defenseScore(state, o, threats, config);
        }, config);

        if (!pick) return false;

        var danger = mostDangerous(state, threats);
        var lane = danger ? laneOf(danger.x) : (state.rng.chance(0.5) ? "left" : "right");
        var preferredY;
        if (pick.card.type === "building") {
            preferredY = 620;
        } else if (danger) {
            preferredY = U.clamp(danger.y - 90, 430, 700);
        } else {
            preferredY = 650;
        }
        var preferredX = laneX(lane) + (state.rng.next() * config.jitter - config.jitter / 2);
        var spot = findPlacement(state, pick.card, preferredX, preferredY);
        if (!spot) return false;

        var res = LC.Sim.playCard(state, "enemy", pick.index, spot.x, spot.y);
        if (res.ok) state.ai.plays = (state.ai.plays || 0) + 1;
        return res.ok;
    }

    function push(state, options, own, config) {
        var affordableOptions = options.filter(function (o) { return affordable(state, o.card); });
        if (!affordableOptions.length) return false;

        var pick = chooseBest(affordableOptions, function (o) {
            return offenseScore(state, o, own, config);
        }, config);
        if (!pick) return false;
        if (pick.card.type === "spell") return false;

        var lane = state.rng.chance(0.5) ? "left" : "right";
        var pTap = LC.Sim.towerOf(state, "player", "tap", lane);
        var pTapOther = LC.Sim.towerOf(state, "player", "tap", lane === "left" ? "right" : "left");
        if (pTap && pTapOther && pTap.hp / pTap.maxHp > pTapOther.hp / pTapOther.maxHp) {
            lane = lane === "left" ? "right" : "left";
        }
        if (pTap && !pTap.alive) {
            /* The lane is open: deploy as far forward as the rules allow. */
            var forwardX = laneX(lane) + (state.rng.next() * 80 - 40);
            var forward = findPlacement(state, pick.card, forwardX, C.H - C.FRONT_DEPLOY_Y - 40);
            if (forward) {
                var fr = LC.Sim.playCard(state, "enemy", pick.index, forward.x, forward.y);
                if (fr.ok) state.ai.plays = (state.ai.plays || 0) + 1;
                return fr.ok;
            }
        }

        var pushLane = state.rng.chance(0.5) ? "left" : "right";
        if (own.length) {
            var front = own.reduce(function (a, b) { return a.y > b.y ? a : b; });
            pushLane = laneOf(front.x);
        }
        var y = pick.card.s.hp >= 1800 ? 560 : 660;
        var x = laneX(pushLane) + (state.rng.next() * config.jitter - config.jitter / 2);
        var spot = findPlacement(state, pick.card, x, y);
        if (!spot) return false;

        var res = LC.Sim.playCard(state, "enemy", pick.index, spot.x, spot.y);
        if (res.ok) state.ai.plays = (state.ai.plays || 0) + 1;
        return res.ok;
    }

    function cycle(state, options) {
        var affordableOptions = options.filter(function (o) {
            return affordable(state, o.card) && o.card.type !== "spell";
        });
        if (!affordableOptions.length) return false;
        affordableOptions.sort(function (a, b) { return a.card.cost - b.card.cost; });
        var pick = affordableOptions[0];
        var lane = state.rng.chance(0.5) ? "left" : "right";
        var spot = findPlacement(state, pick.card, laneX(lane), 650);
        if (!spot) return false;
        var res = LC.Sim.playCard(state, "enemy", pick.index, spot.x, spot.y);
        if (res.ok) state.ai.plays = (state.ai.plays || 0) + 1;
        return res.ok;
    }

    AI.update = function (state, dt) {
        if (!state || !state.ai || state.ai.disabled) return;
        if (state.phase !== "playing" && state.phase !== "overtime") return;
        var ai = state.ai;
        ai.timer -= dt;
        if (ai.timer > 0) return;
        ai.timer = Math.max(0.22, ai.think * (0.8 + state.rng.next() * 0.4));

        var options = handOptions(state);
        if (!options.length) return;
        var threats = enemies(state);
        var own = ownUnits(state);
        var config = {
            aggression: ai.aggression,
            mistake: ai.mistake,
            jitter: ai.jitter
        };

        /* A deliberate mistake: pick a random legal card and a near-lane
         * placement. It still cannot break a rule. */
        if (threats.length && state.rng.chance(ai.mistake * 0.5)) {
            var bad = options.filter(function (o) { return affordable(state, o.card); });
            if (bad.length) {
                var chosen = state.rng.pick(bad);
                var lane = state.rng.chance(0.5) ? "left" : "right";
                var spot = findPlacement(state, chosen.card, laneX(lane), 620);
                if (spot) {
                    LC.Sim.playCard(state, "enemy", chosen.index, spot.x, spot.y);
                    ai.plays = (ai.plays || 0) + 1;
                    return;
                }
            }
        }

        if (threats.length) {
            /* If a threat is close to a tap, spend the turn on defence even
             * if the "mistake" roll would have preferred a push. */
            var close = threats.some(function (t) {
                return t.y < 720;
            });
            if (close || state.rng.next() > ai.mistake) {
                if (defend(state, options, threats, config)) return;
            }
        }

        var maxHandCost = options.reduce(function (m, o) { return Math.max(m, o.card.cost); }, 0);
        var canStart = state.buzz.enemy >= Math.max(5, 8 - ai.aggression * 3) || own.length >= 2;
        if (canStart && state.rng.next() > ai.mistake * 0.4) {
            if (push(state, options, own, config)) return;
        }

        if (state.buzz.enemy >= C.BUZZ_MAX - 0.6) {
            if (cycle(state, options)) return;
        }

        if (!threats.length && maxHandCost <= state.buzz.enemy && state.buzz.enemy >= 6) {
            cycle(state, options);
        }
    };

    AI._denseGroup = denseGroup;
    LC.AI = AI;
})(window.LC = window.LC || {});