/*
 * LAST CALL match simulation.
 *
 * Fixed-step, DOM-free and deterministic. The renderer only reads this state;
 * the AI only writes through Sim.playCard(), so a headless test can play a
 * whole match without a browser.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var U = LC.U;
    var CARDS = LC.CARDS;

    var Sim = {};

    /* ---------- helpers ---------- */

    function emit(state, type, data) {
        var event = data || {};
        event.type = type;
        event.t = state.clock;
        state.events.push(event);
        if (state.events.length > 240) state.events.shift();
    }

    function sideMult(state, side, cardId) {
        if (side === "player") {
            var level = (state.levels.player && state.levels.player[cardId]) || 1;
            return LC.levelMultiplier(level);
        }
        return LC.levelMultiplier(state.ai ? state.ai.level : 1);
    }

    function cardLevel(state, side, cardId) {
        if (side === "player") {
            return (state.levels.player && state.levels.player[cardId]) || 1;
        }
        return state.ai ? state.ai.level : 1;
    }

    function isEnemy(a, b) {
        return a !== b;
    }

    function crossesRiver(ay, by) {
        return (ay > C.RIVER.bottom && by < C.RIVER.top) ||
            (ay < C.RIVER.top && by > C.RIVER.bottom);
    }

    function bridgeFor(x) {
        return x < C.W / 2 ? C.BRIDGES[0] : C.BRIDGES[1];
    }

    function inBridgeLane(x) {
        for (var i = 0; i < C.BRIDGES.length; i++) {
            var b = C.BRIDGES[i];
            if (Math.abs(x - b.x) <= b.width / 2 - 8) return true;
        }
        return false;
    }

    function clampGround(state, e) {
        e.x = U.clamp(e.x, C.FIELD_MIN_X + e.radius, C.FIELD_MAX_X - e.radius);
        e.y = U.clamp(e.y, C.FIELD_MIN_Y + e.radius, C.FIELD_MAX_Y - e.radius);
        if (e.flying) return;
        if (e.y > C.RIVER.top - e.radius && e.y < C.RIVER.bottom + e.radius) {
            if (!inBridgeLane(e.x)) {
                if (e.y < C.RIVER.y) {
                    e.y = C.RIVER.top - e.radius;
                } else {
                    e.y = C.RIVER.bottom + e.radius;
                }
            }
        }
    }

    function speedFactor(state, e) {
        if (e.freezeUntil > state.clock) return 0;
        if (e.slowUntil > state.clock) return e.slowFactor;
        return 1;
    }

    function towerOf(state, side, type, lane) {
        var list = state.towers;
        for (var i = 0; i < list.length; i++) {
            var t = list[i];
            if (t.side !== side || t.towerType !== type) continue;
            if (type === "tap" && lane && t.lane !== lane) continue;
            return t;
        }
        return null;
    }

    function enemySide(side) {
        return side === "player" ? "enemy" : "player";
    }

    function canHit(attacker, target) {
        if (!target || !target.alive) return false;
        if (attacker.onlyBuildings && target.kind === "troop") return false;
        if (target.flying) {
            return attacker.targets === "both" || attacker.targets === "air";
        }
        return attacker.targets === "both" || attacker.targets === "ground";
    }

    function combatants(state, side) {
        var out = [];
        state.towers.forEach(function (t) {
            if (t.side === side && t.alive) out.push(t);
        });
        state.buildings.forEach(function (b) {
            if (b.side === side && b.alive && b.deployTimer <= 0) out.push(b);
        });
        state.units.forEach(function (u) {
            if (u.side === side && u.alive && u.deployTimer <= 0) out.push(u);
        });
        return out;
    }

    function nearest(state, list, x, y, filter) {
        var best = null;
        var bestD = Infinity;
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (!e.alive) continue;
            if (filter && !filter(e)) continue;
            var d = U.dist2(x, y, e.x, e.y);
            if (d < bestD) {
                bestD = d;
                best = e;
            }
        }
        return best;
    }

    /* ---------- towers ---------- */

    function makeTower(state, side, type, x, y, lane) {
        var def = type === "cellar" ? C.CELLAR : C.TAP;
        return {
            id: state.nextId++,
            kind: "tower",
            towerType: type,
            cardId: type,
            side: side,
            lane: lane || "center",
            x: x, y: y,
            radius: def.radius,
            hp: def.hp,
            maxHp: def.hp,
            dmg: def.dmg,
            hitSpeed: def.hitSpeed,
            range: def.range,
            projectileSpeed: def.projectileSpeed,
            targets: "both",
            active: type === "tap",
            alive: true,
            attackCooldown: 0.25,
            retargetTimer: 0,
            targetId: 0,
            hitFlash: 0,
            attackAnimUntil: 0,
            deployTimer: 0
        };
    }

    function buildTowers(state) {
        state.towers = [];
        var i;
        for (i = 0; i < C.TOWERS.taps.length; i++) {
            var p = C.TOWERS.taps[i];
            state.towers.push(makeTower(state, "player", "tap", p.x, p.y, i === 0 ? "left" : "right"));
        }
        state.towers.push(makeTower(state, "player", "cellar", C.TOWERS.cellar.x, C.TOWERS.cellar.y, "center"));
        for (i = 0; i < C.TOWERS.taps.length; i++) {
            var e = C.TOWERS.taps[i];
            state.towers.push(makeTower(state, "enemy", "tap", e.x, C.TOWERS.enemyY.taps, i === 0 ? "left" : "right"));
        }
        state.towers.push(makeTower(state, "enemy", "cellar", C.TOWERS.cellar.x, C.TOWERS.enemyY.cellar, "center"));
    }

    function activateCellar(state, side) {
        var cellar = towerOf(state, side, "cellar");
        if (cellar && cellar.alive && !cellar.active) {
            cellar.active = true;
            emit(state, "cellarActive", { side: side, x: cellar.x, y: cellar.y });
        }
    }

    /* ---------- entities ---------- */

    function makeEntity(state, side, card, x, y, opts) {
        opts = opts || {};
        var s = card.s;
        var m = opts.multiplier || sideMult(state, side, card.id);
        var e = {
            id: state.nextId++,
            kind: card.type === "building" ? "building" : "troop",
            cardId: card.id,
            name: card.name,
            side: side,
            level: cardLevel(state, side, card.id),
            x: x, y: y,
            radius: s.radius || (card.type === "building" ? 28 : 16),
            hp: Math.round((s.hp || 1) * m),
            maxHp: Math.round((s.hp || 1) * m),
            dmg: Math.round((s.dmg || 0) * m),
            hitSpeed: s.hitSpeed || 1,
            range: s.range || 30,
            speed: s.speed || 0,
            targets: s.targets || "ground",
            onlyBuildings: !!s.onlyBuildings,
            flying: !!s.flying,
            projectileSpeed: s.projectileSpeed || 0,
            splash: s.splash || 0,
            lifetime: s.lifetime || 0,
            lifetimeLeft: s.lifetime || 0,
            deployTimer: opts.deployTimer === undefined ? C.DEPLOY_TIME : opts.deployTimer,
            deployTotal: opts.deployTimer === undefined ? C.DEPLOY_TIME : opts.deployTimer,
            alive: true,
            attackCooldown: 0.2 + (state.rng.next() * 0.2),
            retargetTimer: 0,
            targetId: 0,
            lane: x < C.W / 2 ? "left" : "right",
            moving: false,
            vx: 0, vy: 0,
            hitFlash: 0,
            attackAnimUntil: 0,
            deathAt: 0,
            slowUntil: 0,
            slowFactor: 1,
            freezeUntil: 0,
            burnUntil: 0,
            burnDps: 0,
            burnSource: null,
            healTimer: s.healInterval || 0,
            spawnTimer: s.spawnInterval || 0,
            chargeTimer: 0,
            charged: false,
            chargeTime: s.chargeTime || 0,
            chargeBonus: s.chargeBonus || 0,
            art: card.art,
            role: card.role,
            family: card.family
        };
        if (s.heal) {
            e.heal = Math.round(s.heal * m);
            e.healRadius = s.healRadius || 160;
            e.healInterval = s.healInterval || 1.6;
        }
        if (s.auraSlow) {
            e.auraRadius = s.auraRadius || 180;
            e.auraSlow = s.auraSlow;
        }
        if (s.spawnId) {
            e.spawnId = s.spawnId;
            e.spawnInterval = s.spawnInterval || 4;
        }
        return e;
    }

    function unitOffsets(count) {
        if (count <= 1) return [[0, 0]];
        if (count === 2) return [[-24, 8], [24, -8]];
        if (count === 3) return [[-32, 12], [32, 12], [0, -28]];
        return [[-36, 12], [36, 12], [-20, -30], [20, -30], [0, 34]];
    }

    function spawnCard(state, side, card, x, y, opts) {
        opts = opts || {};
        if (card.type === "spell") {
            castSpell(state, side, card, x, y);
            return;
        }
        if (state.units.length + state.buildings.length >= C.MAX_UNITS) return;
        if (card.type === "building") {
            var b = makeEntity(state, side, card, x, y, opts);
            state.buildings.push(b);
            emit(state, "spawn", { side: side, cardId: card.id, x: x, y: y, building: true });
            return;
        }
        var count = card.s.count || 1;
        var offsets = unitOffsets(count);
        for (var i = 0; i < count; i++) {
            var ox = offsets[i][0];
            var oy = offsets[i][1];
            var u = makeEntity(state, side, card, x + ox, y + oy, opts);
            u.lane = (x + ox) < C.W / 2 ? "left" : "right";
            state.units.push(u);
        }
        emit(state, "spawn", { side: side, cardId: card.id, x: x, y: y, count: count });
    }

    function spawnToken(state, building) {
        var card = CARDS[building.spawnId];
        if (!card || !building.alive) return;
        if (state.units.length + state.buildings.length >= C.MAX_UNITS) return;
        var x = building.x + (state.rng.next() * 36 - 18);
        var y = building.y + (state.rng.next() * 28 - 14);
        var token = makeEntity(state, building.side, card, x, y, {
            multiplier: sideMult(state, building.side, card.id),
            deployTimer: 0.35
        });
        token.lane = x < C.W / 2 ? "left" : "right";
        state.units.push(token);
        emit(state, "spawn", { side: building.side, cardId: card.id, x: x, y: y, token: true });
    }

    /* ---------- card play ---------- */

    function dealHands(state) {
        ["player", "enemy"].forEach(function (side) {
            var deck = state.decks[side];
            state.hand[side] = deck.slice(0, 4);
            state.queue[side] = deck.slice(4);
            state.next[side] = state.queue[side][0];
        });
    }

    function cycleCard(state, side, index) {
        var played = state.hand[side][index];
        var incoming = state.queue[side].shift();
        state.queue[side].push(played);
        state.hand[side][index] = incoming;
        state.next[side] = state.queue[side][0];
    }

    Sim.canDeploy = function (state, side, cardId, x, y) {
        var card = CARDS[cardId];
        if (!card) return { ok: false, reason: "Unknown card" };
        if (!state || state.phase === "ended") return { ok: false, reason: "Match over" };
        if (x < C.FIELD_MIN_X || x > C.FIELD_MAX_X || y < C.FIELD_MIN_Y || y > C.FIELD_MAX_Y) {
            return { ok: false, reason: "Outside the bar" };
        }
        if (card.type === "spell") return { ok: true };

        var inOwn = false;
        if (side === "player") {
            inOwn = y >= C.RIVER.bottom + C.OWN_DEPLOY_PAD;
        } else {
            inOwn = y <= C.RIVER.top - C.OWN_DEPLOY_PAD;
        }

        var inFront = false;
        var laneLeft = x < C.W / 2;
        if (side === "player") {
            var enemyTap = towerOf(state, "enemy", "tap", laneLeft ? "left" : "right");
            if (enemyTap && !enemyTap.alive) {
                inFront = y >= C.FRONT_DEPLOY_Y;
            }
        } else {
            var playerTap = towerOf(state, "player", "tap", laneLeft ? "left" : "right");
            if (playerTap && !playerTap.alive) {
                inFront = y <= C.H - C.FRONT_DEPLOY_Y;
            }
        }

        if (!inOwn && !inFront) {
            return { ok: false, reason: side === "player" ? "Deploy in your half" : "Deploy in the rival half" };
        }

        for (var i = 0; i < state.towers.length; i++) {
            var t = state.towers[i];
            if (!t.alive) continue;
            if (U.dist(x, y, t.x, t.y) < t.radius + 20) {
                return { ok: false, reason: "Too close to a tower" };
            }
        }

        return { ok: true };
    };

    Sim.getDeployZones = function (state, side) {
        if (!state) return [];
        var rects = [];
        if (side === "player") {
            rects.push({ x: C.FIELD_MIN_X, y: C.RIVER.bottom + C.OWN_DEPLOY_PAD, w: C.FIELD_MAX_X - C.FIELD_MIN_X, h: C.FIELD_MAX_Y - (C.RIVER.bottom + C.OWN_DEPLOY_PAD) });
            var left = towerOf(state, "enemy", "tap", "left");
            var right = towerOf(state, "enemy", "tap", "right");
            if (left && !left.alive) rects.push({ x: C.FIELD_MIN_X, y: C.FRONT_DEPLOY_Y, w: C.W / 2 - C.FIELD_MIN_X, h: C.RIVER.bottom + C.OWN_DEPLOY_PAD - C.FRONT_DEPLOY_Y });
            if (right && !right.alive) rects.push({ x: C.W / 2, y: C.FRONT_DEPLOY_Y, w: C.FIELD_MAX_X - C.W / 2, h: C.RIVER.bottom + C.OWN_DEPLOY_PAD - C.FRONT_DEPLOY_Y });
        } else {
            rects.push({ x: C.FIELD_MIN_X, y: C.FIELD_MIN_Y, w: C.FIELD_MAX_X - C.FIELD_MIN_X, h: C.RIVER.top - C.OWN_DEPLOY_PAD - C.FIELD_MIN_Y });
            var pLeft = towerOf(state, "player", "tap", "left");
            var pRight = towerOf(state, "player", "tap", "right");
            if (pLeft && !pLeft.alive) rects.push({ x: C.FIELD_MIN_X, y: C.RIVER.top - C.OWN_DEPLOY_PAD, w: C.W / 2 - C.FIELD_MIN_X, h: C.H - C.FRONT_DEPLOY_Y - (C.RIVER.top - C.OWN_DEPLOY_PAD) });
            if (pRight && !pRight.alive) rects.push({ x: C.W / 2, y: C.RIVER.top - C.OWN_DEPLOY_PAD, w: C.FIELD_MAX_X - C.W / 2, h: C.H - C.FRONT_DEPLOY_Y - (C.RIVER.top - C.OWN_DEPLOY_PAD) });
        }
        return rects;
    };

    Sim.playCard = function (state, side, handIndex, x, y) {
        if (!state || (state.phase !== "playing" && state.phase !== "overtime")) {
            return { ok: false, reason: "Match over" };
        }
        var hand = state.hand[side];
        if (!hand || handIndex < 0 || handIndex >= hand.length) {
            return { ok: false, reason: "No card" };
        }
        var cardId = hand[handIndex];
        var card = CARDS[cardId];
        if (!card) return { ok: false, reason: "Unknown card" };
        if (state.buzz[side] + 0.0001 < card.cost) {
            return { ok: false, reason: "Not enough Buzz" };
        }
        var check = Sim.canDeploy(state, side, cardId, x, y);
        if (!check.ok) return check;
        if (card.type !== "spell" && state.units.length + state.buildings.length >= C.MAX_UNITS) {
            return { ok: false, reason: "The bar is full" };
        }

        state.buzz[side] = Math.max(0, state.buzz[side] - card.cost);
        cycleCard(state, side, handIndex);

        if (side === "player") {
            state.stats.playerCards[cardId] = (state.stats.playerCards[cardId] || 0) + 1;
            state.stats.cardsPlayed++;
            state.stats.buzzSpent += card.cost;
            state.lastPlayerCard = cardId;
        }

        spawnCard(state, side, card, x, y);
        emit(state, "cardPlayed", {
            side: side,
            cardId: cardId,
            x: x, y: y,
            cost: card.cost,
            spell: card.type === "spell"
        });
        return { ok: true };
    };

    /* ---------- damage ---------- */

    function damageEntity(state, target, amount, sourceSide, opts) {
        opts = opts || {};
        if (!target || !target.alive) return;
        if (target.deployTimer > 0 && !opts.force) return;
        if (target.kind === "tower" && !target.active) activateCellar(state, target.side);
        target.hp -= amount;
        target.hitFlash = 0.16;
        if (sourceSide === "player") state.stats.playerDamage += amount;
        if (!opts.silent) {
            emit(state, "hit", {
                x: target.x, y: target.y,
                amount: amount,
                side: target.side,
                kind: target.kind,
                cardId: target.cardId
            });
        }
        if (target.hp <= 0) killEntity(state, target, sourceSide);
    }

    function areaDamage(state, side, x, y, radius, amount, opts) {
        opts = opts || {};
        var victims = combatants(state, enemySide(side));
        var hit = 0;
        victims.forEach(function (v) {
            if (U.dist(x, y, v.x, v.y) > radius + v.radius) return;
            var dmg = v.kind === "tower" ? amount * (opts.towerMult === undefined ? 0.35 : opts.towerMult) : amount;
            damageEntity(state, v, dmg, side, opts);
            hit++;
        });
        return hit;
    }

    function killEntity(state, target, sourceSide) {
        if (!target.alive) return;
        target.alive = false;
        target.hp = 0;
        target.deathAt = state.clock;

        if (target.kind === "tower") {
            var attacker = sourceSide || enemySide(target.side);
            var crownSide = attacker;
            if (target.towerType === "cellar") {
                state.crowns[crownSide] = 3;
                emit(state, "towerDown", { side: target.side, towerType: "cellar", x: target.x, y: target.y, crowns: 3 });
                endMatch(state, crownSide, "cellar");
            } else {
                state.crowns[crownSide] = Math.min(3, state.crowns[crownSide] + 1);
                activateCellar(state, target.side);
                emit(state, "towerDown", {
                    side: target.side,
                    towerType: "tap",
                    lane: target.lane,
                    x: target.x, y: target.y,
                    crowns: state.crowns[crownSide]
                });
                if (state.phase === "overtime") {
                    endMatch(state, crownSide, "sudden-death");
                }
            }
            return;
        }

        emit(state, "death", {
            side: target.side,
            cardId: target.cardId,
            x: target.x, y: target.y,
            kind: target.kind,
            building: target.kind === "building"
        });
    }

    /* ---------- spells ---------- */

    function applyStatus(state, target, card, mult) {
        var s = card.s;
        if (s.slow) {
            target.slowUntil = Math.max(target.slowUntil, state.clock + (s.slowDuration || 2));
            target.slowFactor = Math.min(target.slowFactor || 1, s.slow);
        }
        if (s.freeze) {
            target.freezeUntil = Math.max(target.freezeUntil, state.clock + s.freeze);
        }
        if (s.burnDps) {
            target.burnUntil = Math.max(target.burnUntil, state.clock + (s.burnDuration || 3));
            target.burnDps = Math.max(target.burnDps, Math.round(s.burnDps * mult));
            target.burnSource = target.burnSource || (target.side === "player" ? "enemy" : "player");
        }
        if (s.knockback) {
            var dx = target.x - state.spellX;
            var dy = target.y - state.spellY;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            target.x += (dx / d) * s.knockback;
            target.y += (dy / d) * s.knockback;
            clampGround(state, target);
        }
    }

    function castSpell(state, side, card, x, y) {
        state.spellX = x;
        state.spellY = y;
        var s = card.s;
        var mult = sideMult(state, side, card.id);
        var damage = Math.round((s.damage || 0) * mult);
        var radius = s.radius || 120;
        areaDamage(state, side, x, y, radius, damage, { towerMult: 0.35 });

        var victims = combatants(state, enemySide(side));
        victims.forEach(function (v) {
            if (!v.alive) return;
            if (v.kind === "tower") return;
            if (U.dist(x, y, v.x, v.y) > radius + v.radius) return;
            applyStatus(state, v, card, mult);
        });

        emit(state, "spell", {
            side: side,
            cardId: card.id,
            x: x, y: y,
            radius: radius,
            color: card.art.liquid,
            accent: card.art.accent
        });
    }

    /* ---------- targeting ---------- */

    function chooseTarget(state, e) {
        var side = enemySide(e.side);
        var list = combatants(state, side);
        if (!list.length) return null;

        if (e.kind === "tower") {
            var inRange = list.filter(function (t) {
                return t.kind !== "tower" && canHit(e, t) &&
                    U.dist(e.x, e.y, t.x, t.y) <= e.range + t.radius;
            });
            return nearest(state, inRange, e.x, e.y);
        }

        if (e.onlyBuildings) {
            var buildings = list.filter(function (t) {
                return (t.kind === "tower" || t.kind === "building") && canHit(e, t);
            });
            return nearest(state, buildings, e.x, e.y);
        }

        var nearby = list.filter(function (t) {
            return canHit(e, t) && U.dist(e.x, e.y, t.x, t.y) <= C.AGGRO_RANGE + t.radius;
        });
        if (nearby.length) return nearest(state, nearby, e.x, e.y);

        /* Nothing close: march on the lane tower, then the cellar. */
        var lane = e.lane === "left" ? "left" : "right";
        var laneTower = towerOf(state, side, "tap", lane);
        if (laneTower && laneTower.alive) return laneTower;
        var other = towerOf(state, side, "tap", lane === "left" ? "right" : "left");
        if (other && other.alive) return other;
        return towerOf(state, side, "cellar");
    }

    function targetById(state, id) {
        if (!id) return null;
        var i;
        for (i = 0; i < state.towers.length; i++) if (state.towers[i].id === id) return state.towers[i];
        for (i = 0; i < state.buildings.length; i++) if (state.buildings[i].id === id) return state.buildings[i];
        for (i = 0; i < state.units.length; i++) if (state.units[i].id === id) return state.units[i];
        return null;
    }

    /* ---------- movement ---------- */

    function navigationPoint(state, e, target) {
        if (!e.flying && target && crossesRiver(e.y, target.y)) {
            var bridge = bridgeFor(e.x);
            if (e.y > C.RIVER.bottom) {
                if (Math.abs(e.x - bridge.x) > bridge.width / 2 - 14) {
                    return { x: bridge.x, y: C.RIVER.bottom + 40 };
                }
                return { x: bridge.x, y: C.RIVER.top - 26 };
            }
            if (Math.abs(e.x - bridge.x) > bridge.width / 2 - 14) {
                return { x: bridge.x, y: C.RIVER.top - 40 };
            }
            return { x: bridge.x, y: C.RIVER.bottom + 26 };
        }
        return target ? { x: target.x, y: target.y } : null;
    }

    function moveToward(state, e, tx, ty, dt) {
        var dx = tx - e.x;
        var dy = ty - e.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.5) {
            e.moving = false;
            return;
        }
        var factor = speedFactor(state, e);
        var step = e.speed * factor * dt;
        if (step <= 0) {
            e.moving = false;
            return;
        }
        e.x += (dx / d) * step;
        e.y += (dy / d) * step;
        e.vx = dx / d;
        e.vy = dy / d;
        e.moving = true;
        clampGround(state, e);
    }

    function separate(state) {
        var units = state.units;
        var i, j;
        for (i = 0; i < units.length; i++) {
            var a = units[i];
            if (!a.alive || a.deployTimer > 0) continue;
            for (j = i + 1; j < units.length; j++) {
                var b = units[j];
                if (!b.alive || b.deployTimer > 0) continue;
                if (a.flying !== b.flying) continue;
                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                var min = a.radius + b.radius;
                if (d > 0 && d < min) {
                    var push = (min - d) * 0.5;
                    dx /= d;
                    dy /= d;
                    a.x -= dx * push;
                    a.y -= dy * push;
                    b.x += dx * push;
                    b.y += dy * push;
                }
            }
        }
        /* Keep bodies outside towers and buildings. */
        for (i = 0; i < units.length; i++) {
            var u = units[i];
            if (!u.alive || u.deployTimer > 0) continue;
            var statics = state.towers.concat(state.buildings);
            for (j = 0; j < statics.length; j++) {
                var s = statics[j];
                if (!s.alive || s.id === u.id) continue;
                var ddx = u.x - s.x;
                var ddy = u.y - s.y;
                var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                var rr = u.radius + s.radius;
                if (dd > 0 && dd < rr) {
                    u.x = s.x + (ddx / dd) * rr;
                    u.y = s.y + (ddy / dd) * rr;
                }
            }
            clampGround(state, u);
        }
    }

    /* ---------- attacks ---------- */

    function spawnProjectile(state, e, target, damage, splash, opts) {
        opts = opts || {};
        var startY = e.y - (e.flying ? 22 : 10);
        state.projectiles.push({
            id: state.nextId++,
            side: e.side,
            x: e.x,
            y: startY,
            targetId: target.id,
            tx: target.x,
            ty: target.y,
            speed: opts.speed || e.projectileSpeed || 600,
            damage: damage,
            splash: splash || 0,
            color: opts.color || (e.art && e.art.liquid) || "#ffd166",
            accent: opts.accent || (e.art && e.art.accent) || "#ffffff",
            towerShot: !!opts.towerShot,
            targets: e.targets,
            cardId: e.cardId,
            alive: true
        });
    }

    function performAttack(state, e, target) {
        var bonus = 0;
        if (e.charged) {
            bonus = e.chargeBonus;
            e.charged = false;
            e.chargeTimer = 0;
            emit(state, "chargeHit", { x: e.x, y: e.y, side: e.side, cardId: e.cardId });
        }
        var damage = e.dmg + bonus;
        e.attackCooldown = e.hitSpeed;
        e.attackAnimUntil = state.clock + 0.16;
        e.moving = false;

        if (e.range > 70 || e.projectileSpeed > 0) {
            spawnProjectile(state, e, target, damage, e.splash, { speed: e.projectileSpeed });
            emit(state, "attack", { x: e.x, y: e.y, side: e.side, cardId: e.cardId, ranged: true });
        } else {
            damageEntity(state, target, damage, e.side, {});
            emit(state, "attack", { x: e.x, y: e.y, side: e.side, cardId: e.cardId, ranged: false });
        }
    }

    function updateUnit(state, e, dt) {
        if (e.hitFlash > 0) e.hitFlash -= dt;
        if (e.deployTimer > 0) {
            e.deployTimer -= dt;
            return;
        }
        if (e.lifetimeLeft > 0) {
            e.lifetimeLeft -= dt;
            if (e.lifetimeLeft <= 0) {
                killEntity(state, e, enemySide(e.side));
                return;
            }
        }

        /* Burn ticks even while frozen. */
        if (e.burnUntil > state.clock && e.burnDps > 0) {
            damageEntity(state, e, e.burnDps * dt, e.burnSource || enemySide(e.side), { silent: true });
            if (!e.alive) return;
        }

        var frozen = e.freezeUntil > state.clock;
        var factor = speedFactor(state, e);

        if (e.chargeTime && !e.charged) {
            if (e.moving && factor > 0) {
                e.chargeTimer += dt;
                if (e.chargeTimer >= e.chargeTime) {
                    e.charged = true;
                    emit(state, "chargeReady", { x: e.x, y: e.y, side: e.side, cardId: e.cardId });
                }
            } else if (factor === 0) {
                /* hold the charge while frozen */
            }
        }

        if (e.attackCooldown > 0) {
            e.attackCooldown -= dt * (factor === 0 ? 0 : 1);
        }

        /* Support buildings: heal and spawn. */
        if (e.heal) {
            e.healTimer -= dt;
            if (e.healTimer <= 0) {
                e.healTimer = e.healInterval;
                var allies = combatants(state, e.side);
                var healed = false;
                allies.forEach(function (a) {
                    if (a.kind === "tower") return;
                    if (U.dist(e.x, e.y, a.x, a.y) <= e.healRadius + a.radius && a.hp < a.maxHp) {
                        a.hp = Math.min(a.maxHp, a.hp + e.heal);
                        healed = true;
                    }
                });
                if (healed) emit(state, "heal", { x: e.x, y: e.y, side: e.side, radius: e.healRadius });
            }
        }
        if (e.spawnId) {
            e.spawnTimer -= dt;
            if (e.spawnTimer <= 0) {
                e.spawnTimer = e.spawnInterval;
                spawnToken(state, e);
            }
        }
        if (e.auraSlow) {
            var enemies = combatants(state, enemySide(e.side));
            enemies.forEach(function (v) {
                if (v.kind === "tower") return;
                if (U.dist(e.x, e.y, v.x, v.y) <= e.auraRadius + v.radius) {
                    v.slowUntil = Math.max(v.slowUntil, state.clock + 0.18);
                    v.slowFactor = Math.min(v.slowFactor || 1, e.auraSlow);
                }
            });
        }

        if (e.kind === "building") return;

        var target = targetById(state, e.targetId);
        e.retargetTimer -= dt;
        if (!target || !target.alive || !canHit(e, target) || e.retargetTimer <= 0) {
            target = chooseTarget(state, e);
            e.targetId = target ? target.id : 0;
            e.retargetTimer = C.RETARGET_TIME;
        }

        if (!target) return;

        var reach = e.range + target.radius;
        var dist = U.dist(e.x, e.y, target.x, target.y);
        if (dist <= reach) {
            e.moving = false;
            if (e.attackCooldown <= 0 && !frozen) {
                performAttack(state, e, target);
            }
        } else {
            var nav = navigationPoint(state, e, target);
            if (nav) moveToward(state, e, nav.x, nav.y, dt);
        }
    }

    function updateTower(state, t, dt) {
        if (!t.alive) return;
        if (t.hitFlash > 0) t.hitFlash -= dt;
        if (!t.active) return;
        t.attackCooldown -= dt;
        t.retargetTimer -= dt;

        var target = targetById(state, t.targetId);
        if (!target || !target.alive || U.dist(t.x, t.y, target.x, target.y) > t.range + target.radius || t.retargetTimer <= 0) {
            var list = combatants(state, enemySide(t.side)).filter(function (u) {
                return u.kind !== "tower" && canHit(t, u) &&
                    U.dist(t.x, t.y, u.x, u.y) <= t.range + u.radius;
            });
            target = nearest(state, list, t.x, t.y);
            t.targetId = target ? target.id : 0;
            t.retargetTimer = 0.2;
        }
        if (target && t.attackCooldown <= 0) {
            t.attackCooldown = t.hitSpeed;
            t.attackAnimUntil = state.clock + 0.16;
            spawnProjectile(state, t, target, t.dmg, 0, {
                speed: t.projectileSpeed,
                towerShot: true,
                color: t.side === "player" ? "#ffd166" : "#ff6fae",
                accent: "#ffffff"
            });
            emit(state, "towerShot", { x: t.x, y: t.y, side: t.side });
        }
    }

    function updateProjectiles(state, dt) {
        var live = [];
        state.projectiles.forEach(function (p) {
            if (!p.alive) return;
            var target = targetById(state, p.targetId);
            if (target && target.alive) {
                p.tx = target.x;
                p.ty = target.y;
            }
            var dx = p.tx - p.x;
            var dy = p.ty - p.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            var step = p.speed * dt;
            if (d <= step + C.PROJECTILE_HIT_PAD) {
                p.x = p.tx;
                p.y = p.ty;
                if (p.splash > 0) {
                    areaDamage(state, p.side, p.x, p.y, p.splash, p.damage, {});
                    emit(state, "splashHit", { x: p.x, y: p.y, side: p.side, radius: p.splash, color: p.color });
                } else if (target && target.alive) {
                    damageEntity(state, target, p.damage, p.side, {});
                }
                p.alive = false;
                return;
            }
            p.x += (dx / d) * step;
            p.y += (dy / d) * step;
            live.push(p);
        });
        state.projectiles = live;
    }

    /* ---------- match flow ---------- */

    function startOvertime(state) {
        state.phase = "overtime";
        state.remaining = C.OVERTIME_TIME;
        state.overtimeStarted = true;
        activateCellar(state, "player");
        activateCellar(state, "enemy");
        emit(state, "overtime", { player: state.crowns.player, enemy: state.crowns.enemy });
    }

    function endMatch(state, winner, reason) {
        if (state.phase === "ended") return;
        state.phase = "ended";
        state.remaining = 0;
        state.result = {
            winner: winner,
            reason: reason,
            crowns: { player: state.crowns.player, enemy: state.crowns.enemy },
            duration: state.clock,
            mode: state.mode,
            venueId: state.venue ? state.venue.id : null,
            stats: {
                playerDamage: Math.round(state.stats.playerDamage),
                cardsPlayed: state.stats.cardsPlayed,
                buzzSpent: state.stats.buzzSpent,
                playerCards: state.stats.playerCards,
                towersLost: state.towers.filter(function (t) { return t.side === "player" && !t.alive; }).length,
                towersDestroyed: state.towers.filter(function (t) { return t.side === "enemy" && !t.alive; }).length
            }
        };
        state.happyHour = false;
        emit(state, "end", { winner: winner, reason: reason, crowns: state.result.crowns });
    }

    function resolveTimeEnd(state) {
        if (state.crowns.player > state.crowns.enemy) {
            endMatch(state, "player", "crowns");
            return;
        }
        if (state.crowns.enemy > state.crowns.player) {
            endMatch(state, "enemy", "crowns");
            return;
        }
        if (state.phase === "playing") {
            startOvertime(state);
            return;
        }

        /* Overtime ended level: compare the cellar, then the whole bar. */
        var pc = towerOf(state, "player", "cellar");
        var ec = towerOf(state, "enemy", "cellar");
        var pPct = pc ? pc.hp / pc.maxHp : 0;
        var ePct = ec ? ec.hp / ec.maxHp : 0;
        if (Math.abs(pPct - ePct) > 0.001) {
            endMatch(state, pPct > ePct ? "player" : "enemy", "tiebreak");
            return;
        }
        var pHp = state.towers.filter(function (t) { return t.side === "player" && t.alive; })
            .reduce(function (a, t) { return a + t.hp; }, 0);
        var eHp = state.towers.filter(function (t) { return t.side === "enemy" && t.alive; })
            .reduce(function (a, t) { return a + t.hp; }, 0);
        if (Math.abs(pHp - eHp) > 0.5) {
            endMatch(state, pHp > eHp ? "player" : "enemy", "tiebreak");
            return;
        }
        endMatch(state, "draw", "draw");
    }

    Sim.createMatch = function (opts) {
        opts = opts || {};
        var seed = opts.seed === undefined ? 1 : (opts.seed >>> 0);
        var playerDeck = (opts.playerDeck && opts.playerDeck.length === 8)
            ? opts.playerDeck.slice()
            : LC.STARTER_DECK.slice();
        var aiDeck = (opts.aiDeck && opts.aiDeck.length === 8)
            ? opts.aiDeck.slice()
            : LC.STARTER_DECK.slice();
        var rng = LC.makeRng(seed);

        var state = {
            seed: seed,
            rng: rng,
            mode: opts.mode || "tour",
            venue: opts.venue || null,
            clock: 0,
            remaining: C.MATCH_TIME,
            phase: "playing",
            crowns: { player: 0, enemy: 0 },
            buzz: { player: C.BUZZ_START, enemy: C.BUZZ_START },
            maxBuzz: C.BUZZ_MAX,
            happyHour: false,
            happyHourAnnounced: false,
            overtimeStarted: false,
            towers: [],
            units: [],
            buildings: [],
            projectiles: [],
            events: [],
            result: null,
            nextId: 1,
            decks: {
                player: rng.shuffle(playerDeck),
                enemy: rng.shuffle(aiDeck)
            },
            hand: { player: [], enemy: [] },
            queue: { player: [], enemy: [] },
            next: { player: null, enemy: null },
            levels: { player: opts.playerLevels || {} },
            ai: {
                level: (opts.ai && opts.ai.level) || 1,
                think: (opts.ai && opts.ai.think) || 0.8,
                jitter: (opts.ai && opts.ai.jitter) || 60,
                mistake: (opts.ai && opts.ai.mistake) || 0.1,
                aggression: (opts.ai && opts.ai.aggression) || 0.5,
                timer: 0.8,
                disabled: false
            },
            stats: {
                playerDamage: 0,
                cardsPlayed: 0,
                buzzSpent: 0,
                playerCards: {}
            },
            lastPlayerCard: null,
            tutorialDone: false
        };

        buildTowers(state);
        dealHands(state);
        emit(state, "start", {
            mode: state.mode,
            venue: state.venue ? state.venue.id : null,
            seed: seed
        });
        return state;
    };

    Sim.update = function (state, dt) {
        if (!state || (state.phase !== "playing" && state.phase !== "overtime")) return;
        dt = Math.min(dt || 1 / 60, 0.05);
        state.clock += dt;

        state.remaining -= dt;
        var happy = state.phase === "overtime" || state.remaining <= C.HAPPY_HOUR;
        if (happy && !state.happyHour) {
            state.happyHour = true;
            if (!state.happyHourAnnounced) {
                state.happyHourAnnounced = true;
                emit(state, "happyHour", {});
            }
        }
        if (!happy) state.happyHour = false;

        var mult = state.phase === "overtime" ? C.OVERTIME_BUZZ_MULT : (happy ? 2 : 1);
        var rate = mult / C.BUZZ_SECONDS;
        ["player", "enemy"].forEach(function (side) {
            if (state.buzz[side] < C.BUZZ_MAX) {
                state.buzz[side] = Math.min(C.BUZZ_MAX, state.buzz[side] + rate * dt);
            }
        });

        if (LC.AI && state.ai && !state.ai.disabled) {
            LC.AI.update(state, dt);
        }

        var i;
        for (i = 0; i < state.units.length; i++) {
            if (state.units[i].alive) updateUnit(state, state.units[i], dt);
        }
        for (i = 0; i < state.buildings.length; i++) {
            if (state.buildings[i].alive) updateUnit(state, state.buildings[i], dt);
        }
        for (i = 0; i < state.towers.length; i++) {
            updateTower(state, state.towers[i], dt);
        }

        updateProjectiles(state, dt);
        separate(state);

        state.units = state.units.filter(function (u) {
            return u.alive || state.clock - u.deathAt < 1.2;
        });
        state.buildings = state.buildings.filter(function (b) {
            return b.alive || state.clock - b.deathAt < 1.2;
        });

        if (state.phase === "ended") return;
        if (state.remaining <= 0) {
            resolveTimeEnd(state);
        }
    };

    Sim.drainEvents = function (state) {
        if (!state || !state.events.length) return [];
        var out = state.events;
        state.events = [];
        return out;
    };

    Sim.endMatch = endMatch;
    Sim.towerOf = towerOf;
    Sim.activateCellar = activateCellar;
    Sim.cardLevel = cardLevel;

    LC.Sim = Sim;
})(window.LC = window.LC || {});