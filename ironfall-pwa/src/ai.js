/*
 * IRONFALL - bot brains.
 *
 * Five bots stand in for four absent teammates, so this file is not a
 * fallback. It is the game. Every decision a human makes is made here by
 * something, and the reason the bots behave by difficulty rather than by
 * accuracy multiplier is that a Recruit who makes the *same* decision late
 * is a fairer and more interesting opponent than one who makes wrong
 * decisions fast.
 *
 * The loop is think-then-act: a bot picks a goal and a plan a few times a
 * second, and acts continuously in between. Reacting every step would make
 * every bot frame-perfect, and reacting less often than that would make
 * them ignore the wave.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var M;

    /* ===== Draft =====
     * Lane assignment by role, which is what makes a 3v3 read as a 3v3.
     * A marksman in top and a tank in bot produces a lane where neither one
     * can kill the other safely, and every lane in the game becomes a
     * stalemate. */
    var LANE_FOR_ROLE = {
        tank: "top",
        bruiser: "top",
        mage: "mid",
        marksman: "bot",
        support: "bot"
    };

    function assignLanes(champs) {
        var teams = [[], []];
        for (var i = 0; i < champs.length; i++) {
            if (!champs[i]) continue;
            teams[champs[i].team].push(champs[i]);
        }
        for (var t = 0; t < 2; t++) {
            var taken = { top: 0, mid: 0, bot: 0 };
            for (i = 0; i < teams[t].length; i++) {
                var u = teams[t][i];
                var pref = LANE_FOR_ROLE[u.role] || "mid";
                /* Collision resolution is by claim order, so the later pick
                 * takes what is left. With three champions and three lanes
                 * the only conflict is two of the same role, and stacking a
                 * lane is the correct answer to that anyway. */
                u.lane = pref;
                taken[pref]++;
            }
        }
    }

    /* ===== Item priorities =====
     * A flat priority list per role. The bot buys the first affordable thing
     * on its list, which means it converges on a coherent build over a match
     * without anyone having written a build tree. */
    var BUILDS = {
        tank: ["servoboot", "powerarmour", "wargog", "reliquarySeal", "chapterBanner", "powerarmour"],
        bruiser: ["servoboot", "bolter", "chainsword", "relicblade", "wargog"],
        mage: ["servoboot", "warpTalisman", "psykerner", "censer", "chapterBanner"],
        marksman: ["servoboot", "bolter", "relicblade", "voidLens", "wargog"],
        support: ["servoboot", "voidLens", "reliquarySeal", "censer", "wargog"]
    };

    /* ===== The brain ===== */
    function makeBrain(world, u, difficulty) {
        var b = {
            u: u,
            rng: S.makeRng((world.seed ? 1 : 1) + u.id * 7919),
            diff: C.difficulty[difficulty] || C.difficulty.guardsman,
            state: "push",
            /* Bot lane assignment is stored on the brain, not the unit, so a
             * lane swap is a one-field write rather than a migration. */
            lane: u.lane || "mid",
            nextThink: world.time + b_delay(difficulty),
            lastThink: world.time,
            target: null,
            abilityAt: 0,
            wanderAt: 0,
            wanderTo: null,
            /* Sticky intent: a bot that changes its mind every 200ms
             * oscillates between two states and does neither. */
            commitUntil: 0,
            buyIndex: 0,
            lastHpFrac: 1
        };
        u.brain = b;
        return b;
    }

    function b_delay(difficulty) {
        var d = C.difficulty[difficulty];
        return d ? d.react * (0.6 + b_rand() * 0.8) : 0.3;
    }

    /* The brain's own stream, advanced by the wall clock it is handed. Kept
     * off the world seed so that two bots do not produce identical plans. */
    function b_rand() {
        if (!b_stream) b_stream = S.makeRng(0xB07);
        return b_stream();
    }
    var b_stream = null;

    function resetStream(seed) {
        b_stream = S.makeRng(seed || 0xB07);
    }

    /* ===== Perception =====
     * Everything the brain knows, recomputed at think time. Scanning for
     * enemies only when thinking - not every step - is what keeps a
     * five-bot match inside its frame budget with ninety minions on screen. */
    function enemies(world, u, range) {
        var out = [];
        /* Through the spatial grid, not a linear scan. A bot perceives five
         * times a second and each perception used to cost a pass over every
         * unit on the map; at six bots and two hundred minions that is the
         * single largest avoidable cost in the game. */
        S.World.forEachNear(world, u.x, u.y, range, function (e) {
            if (e.team === u.team) return;
            /* Only what this bot can actually see. A bot that fights a
             * champion standing in fog is a bot that plays a different game
             * from its opponent. */
            if (!e.visible && e.kind !== "champ") return;
            out.push(e);
        });
        return out;
    }

    function allies(world, u, range) {
        var out = [];
        var r2 = range * range;
        for (var i = 0; i < world.champs.length; i++) {
            var c = world.champs[i];
            if (c === u || !c.alive || c.team !== u.team) continue;
            if (S.dist2(u.x, u.y, c.x, c.y) <= r2) out.push(c);
        }
        return out;
    }

    function hpFrac(u) {
        var max = S.Combat.stat(u, "hp");
        return max > 0 ? u.hp / max : 0;
    }

    /* How hurt a bot BELIEVES it is, which is not the same as how hurt it is.
     *
     * This is the defensive half of the difficulty ladder, and it was
     * declared in config and then never read - `dmgTaken` appeared exactly
     * once in the whole codebase, in its own definition. Without it a harder
     * doctrine reacted faster and aimed better and got no more survivable,
     * and the measured death rate was flat across all three.
     *
     * Recruit reads a full health bar as "not quite healthy" and therefore
     * disengages early; Necron Lord reads the same bar as "healthy" and
     * stays in the fight. Nothing about the underlying health changes - this
     * is a bot's self-preservation instinct, which is the thing a difficulty
     * setting is supposed to move. */
    function perceivedFrac(b, u) {
        return S.clamp01(hpFrac(u) * (b.diff.dmgTaken || 1));
    }

    /* How dangerous is this enemy champion to me, right now? Weighted by
     * their damage output against my remaining health rather than by a flat
     * threat number, so a fed SERGEANT outranks a full-health VANGUARD even
     * though both are "tanks" on paper. */
    function threat(world, u, e) {
        var d = S.dist(u.x, u.y, e.x, e.y) || 1;
        var myHp = Math.max(1, u.hp);
        var timeToKill = myHp / Math.max(1, S.Combat.stat(e, "ad") * 0.6);
        return (1 / d) * (1 / Math.max(0.4, timeToKill)) * (1 + (e.level || 1) * 0.08);
    }

    /* ===== Last-hitting =====
     *
     * The decision that decides whether a bot is worth playing against. A
     * bot that attacks the nearest minion always is worse than a human who
     * waits; a bot that waits perfectly is a cheating bot. The answer is a
     * skill parameter that scales the bot's willingness to commit before the
     * minion dies, which at Recruit means it happily over-eagerly tags a
     * minion it will not finish. */
    function lastHitTarget(world, b, u) {
        var best = null, bestScore = -Infinity;
        var myAd = S.Combat.stat(u, "ad");
        var myAs = S.Combat.effectiveAs(u);
        if (myAs <= 0) return null;
        var myPeriod = 1 / myAs;

        /* Pass one: the minions I could actually reach. One grid walk. */
        var reach = S.Combat.stat(u, "range") + 90;
        var candidates = [];
        S.World.forEachNear(world, u.x, u.y, reach, function (m) {
            if (m.kind !== "minion" || m.team === u.team || !m.alive || !m.visible) return;
            candidates.push(m);
        });
        if (!candidates.length) return null;

        /* Pass two: for each candidate, one small grid walk to work out how
         * much damage is already inbound. Doing it in a second pass rather
         * than inline in pass one matters: inline, whether a given minion's
         * damage was already accumulated depends on the order the grid
         * happens to yield units, which is not a property anyone should be
         * relying on for a last-hit decision. */
        for (var i = 0; i < candidates.length; i++) {
            var m = candidates[i];

            /* How long until I finish it. */
            var myTime = Math.ceil(m.hp / Math.max(1, myAd)) * myPeriod;

            /* How much damage is already inbound, and from how many sources.
             * A minion being focused by the whole wave deserves more respect
             * than one with three hit points left and nobody shooting at it. */
            var incoming = 0;
            var atkReach = 2000;
            S.World.forEachNear(world, m.x, m.y, atkReach, function (a) {
                if (a.team === m.team) return;
                /* Not counting the bot itself. With its own damage added in,
                 * `incoming` always exceeded the time the minion needed and
                 * every last-hit looked like a loss - so bots refused
                 * essentially all of them and CS collapsed. The question
                 * being answered is "will somebody ELSE finish it first". */
                if (a === u) return;
                var arange = S.Combat.stat(a, "range") + (a.radius || 40) + 50;
                var d = S.dist(a.x, a.y, m.x, m.y);
                if (d > arange) return;
                incoming += S.Combat.stat(a, "ad") * S.Combat.effectiveAs(a);
            });

            var timeToDie = incoming > 0 ? m.hp / incoming : 999;

            /* Skill, modelled as misjudgement rather than as a different
             * threshold.
             *
             * This is the third attempt at expressing csSkill and the first
             * one that can work at all. Scaling a penalty did nothing,
             * because the score of a swing the bot expects to LOSE is always
             * negative and any multiplier keeps it negative - so the decision
             * collapsed to `margin >= 0` and every doctrine swept identically.
             *
             * What actually separates a Recruit from a Necron Lord is not
             * the rule they apply but how well they can see the board: a
             * Recruit under-estimates how much damage is already inbound, so
             * it reads a contested minion as a free one and swings anyway.
             * That is exactly what a bad last-hitter does, and it produces a
             * real, measurable gradient without a second rule. */
            if (incoming > 0) {
                var err = (S.World.rng() - 0.5) * 2 * (1 - b.diff.csSkill) * 0.8;
                timeToDie *= 1 + err;
            }

            /* Cannon minions are worth roughly three normal ones and every
             * bot should know that without being told. */
            var value = (m.goldValue || 10) + (m.banner ? 30 : 0);

            /* margin is how much time I have SPARE: positive means the minion
             * dies well before my swing lands, negative means it dies long
             * before. It was inverted for a while - `myTime - timeToDie` -
             * which rewarded exactly the swings a bot should refuse. */
            var margin = timeToDie - myTime;

            /* A swing the bot expects to lose is only worth taking when the
             * minion behind it is worth something. The weighting is flat
             * rather than skill-scaled on purpose: the judgement above is
             * where skill lives, and a threshold here would just be the
             * same knob a third time. */
            var score = value * (margin >= 0
                ? 1 + Math.min(margin, 2) * 0.6
                : margin * 0.8);
            score -= S.dist(u.x, u.y, m.x, m.y) / 900;
            if (score > bestScore) { bestScore = score; best = m; }
        }
        return bestScore > 0 ? best : null;
    }

    /* ===== Abilities =====
     * Fires whatever is off cooldown, in slot order, at whatever is in range.
     * "Whatever is in range" is not good enough on its own - a bot dumping
     * its ultimate into the enemy wave is the single most obviously wrong
     * thing a bot can do - so ultimates and big AoEs are gated on there
     * being an enemy champion inside the circle. */
    function useAbilities(world, b, targets, dt) {
        var u = b.u;
        var any = false;
        var enemyChamp = null;
        for (var i = 0; i < targets.length; i++) {
            if (targets[i].kind === "champ") {
                enemyChamp = enemyChamp || targets[i];
                break;
            }
        }

        for (var s = 0; s < u.abilities.length; s++) {
            var ab = u.abilities[s];
            if (!S.Abilities.canCast(u, s, enemyChamp)) continue;
            var d = ab.def;

            /* Only worth it if something is genuinely in range. Checking the
             * nearest hostile rather than any hostile at all keeps the bot
             * from firing sideways at a minion while being walked down by a
             * champion. */
            var picked = null;
            var wantChamp = d.arch === "blast" || d.arch === "beam" ||
                (d.arch === "shot" && d.targeting === "unit");

            if (enemyChamp && wantChamp) picked = enemyChamp;
            else {
                var nearest = null, nd = Infinity;
                for (var k = 0; k < targets.length; k++) {
                    var e = targets[k];
                    var dd = S.dist2(u.x, u.y, e.x, e.y);
                    if (dd < nd) { nd = dd; nearest = e; }
                }
                /* An ultimate aimed at a minion is only allowed when there is
                 * no champion to aim at AND the wave is worth it - a cannon
                 * wave is, a three-conscript wave is not. */
                if (d.arch === "blast" && !enemyChamp && nearest) {
                    var worth = nearest.banner ? true : (nearest.kind === "minion" && nearest.goldValue >= 28);
                    if (!worth) continue;
                }
                if (d.arch === "buff" && !enemyChamp) {
                    /* Self buffs are for fights, not for farming. Firing
                     * COMMAND at an empty lane is how a bot ends a match
                     * under-levelled. */
                    var allyNeeds = false;
                    var as = allies(world, u, d.radius || 700);
                    for (var q = 0; q < as.length; q++) {
                        if (as[q].inCombat || hpFrac(as[q]) < 0.8) allyNeeds = true;
                    }
                    if (!allyNeeds && !u.inCombat) continue;
                }
                if (d.arch === "shield" && !d.selfOnly && !enemyChamp) continue;
                picked = nearest;
            }
            if (!picked) continue;

            /* Aim error. The bot's shot should miss sometimes, or a Necron
             * Lord bot's ability usage becomes an auto-win button. Error is
             * applied as an offset on the aim point, not as a damage roll,
             * so a miss looks like a miss. */
            var aimX = picked.x, aimY = picked.y;
            if (d.arch !== "buff" && d.arch !== "shield") {
                var spread = (1 - b.diff.abilitySkill) * 260;
                if (spread > 1) {
                    aimX += (b_rand() - 0.5) * spread;
                    aimY += (b_rand() - 0.5) * spread;
                }
            }
            u.aimX = aimX - u.x;
            u.aimY = aimY - u.y;
            var len = Math.sqrt(u.aimX * u.aimX + u.aimY * u.aimY) || 1;
            u.aimX /= len; u.aimY /= len;

            var targetArg = (d.targeting === "unit") ? picked : { x: aimX, y: aimY };
            if (S.Abilities.cast(world, u, s, targetArg)) {
                any = true;
                S.World.floatText(world, u.x, u.y, d.name, d.dmgType === "magic" ? "#b58cff" : "#ffd24a");
            }
        }
        return any;
    }

    /* ===== Engagement range =====
     * One number, used by both the goal chooser and the behaviour
     * executor. They used to differ (2000 and 1400), which created a dead
     * band where a bot had decided to fight something it then refused to act
     * on - so it stood there holding a cooldown it would never use. Every
     * ultimate in the roster was permanently on that bench. */
    var ENGAGE = 1700;

    /* ===== Goal =====
     * One function returns what the bot should be doing. Ordered by
     * urgency: dying, then respawning, then recalling, then fighting, then
     * farming, then pushing. Nothing cleverer than that is warranted, and
     * the ordering is the whole behaviour. */
    /* Every function that needs a lane asks the unit, not the brain. The
     * brain owns the assignment but the unit is what is in scope here, and
     * the two never disagree because assignLanes writes both. */
    function laneOf(u) {
        return (u.brain && u.brain.lane) || u.lane || "mid";
    }

    function chooseState(world, b, u, enemiesNear) {
        var frac = perceivedFrac(b, u);
        var enemyChamp = null;
        for (var i = 0; i < enemiesNear.length; i++) {
            if (enemiesNear[i].kind === "champ") { enemyChamp = enemiesNear[i]; break; }
        }

        /* Retreat thresholds.
         *
         * These are the numbers that decide whether a bot plays the game.
         * They started at 30% and 55%, which meant a bot took chip damage
         * from a wave, hit 30%, walked two thousand units home, healed, and
         * walked back - over and over, forever, without ever killing
         * anything. It looked like cautious play and it was actually a bot
         * that never reached level two.
         *
         * Now: bail at 22%, which is genuinely about to die; recall at 35%
         * when nothing is happening. Both are still well above the point
         * where a bad trade becomes unrecoverable. */
        if (enemyChamp && frac < 0.22) return "retreat";
        if (enemyChamp && frac < 0.42 && enemiesNear.length >= 3) return "retreat";
        if (enemyChamp) return "fight";

        /* Out of combat, hurt, and out of the enemy half: go home. The
         * out-of-combat check is what makes this a decision rather than a
         * panic response. */
        if (frac < 0.35 && !u.inCombat) return "recall";
        if (frac < 0.5 && !u.inCombat && !enemyChamp &&
            !M.inOwnHalf(laneOf(u), u.x, u.y, u.team)) return "retreat";

        return "push";
    }

    /* Retreating is not running home. It is stepping backwards toward your
     * own tower while still being able to turn and fight, which is the whole
     * difference between a bot that is hard to kill and one that just walks
     * away. */
    function retreatPoint(world, u) {
        var base = M.bases[u.team];
        var tower = nearestOwnTower(world, u);
        if (tower && hpFrac(u) > 0.34) return { x: tower.x, y: tower.y };
        return { x: base.fountain.x, y: base.fountain.y };
    }

    function nearestOwnTower(world, u) {
        var best = null, bestD = Infinity;
        for (var i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (s.kind !== "tower" || s.team !== u.team || !s.alive) continue;
            var d = S.dist2(u.x, u.y, s.x, s.y);
            if (d < bestD) { bestD = d; best = s; }
        }
        return best;
    }

    /* Where a pushing bot should be. The wave front, not the tower: a bot
     * that walks straight for the tower without a wave walks into three of
     * the enemy team's minions and dies, which is correct and also useless
     * to watch. */
    function pushPoint(world, u) {
        var lane = laneOf(u);
        var mine = nearestOwnMinion(world, u, true);
        var theirs = nearestEnemyMinion(world, u);
        if (theirs && (!mine || S.dist2(mine.x, mine.y, theirs.x, theirs.y) < 900 * 900)) {
            /* Fight the wave where it stands, which keeps the bot in its own
             * half until the wave is genuinely dead. */
            return { x: theirs.x, y: theirs.y };
        }
        if (mine) return { x: mine.x, y: mine.y };

        /* No wave at all: walk the lane to where the next one will be. */
        var p = M.laneProgress(lane, u.x, u.y);
        var adv = u.team === 0 ? 0.06 : -0.06;
        var pt = M.lanePointAt(lane, S.clamp(p + adv, 0, 1));
        return { x: pt.x, y: pt.y };
    }

    function nearestOwnMinion(world, u, own) {
        var best = null, bestD = Infinity;
        for (var i = 0; i < world.units.length; i++) {
            var m = world.units[i];
            if (!m.alive || m.kind !== "minion") continue;
            if (own ? m.team !== u.team : m.team === u.team) continue;
            var d = S.dist2(u.x, u.y, m.x, m.y);
            if (d < bestD) { bestD = d; best = m; }
        }
        return best;
    }

    function nearestEnemyMinion(world, u) {
        return nearestOwnMinion(world, u, false);
    }

    /* ===== Buy ===== */
    function tryBuy(world, u) {
        var list = BUILDS[u.role] || BUILDS.bruiser;
        /* Re-read the whole list every visit rather than keeping a cursor:
         * the cursor desynchronises the moment gold is spent on something
         * the bot did not choose (assist gold, a reliquary bounty). */
        for (var i = 0; i < list.length; i++) {
            if (u.items.indexOf(list[i]) >= 0) continue;
            var it = S.Items.get(list[i]);
            if (!it) continue;
            if (u.gold >= it.cost) {
                if (S.World.buyItem(world, u, list[i])) return true;
            } else {
                /* Not enough for this one yet. Stop: the list is ordered, and
                 * skipping ahead to a cheaper later entry would produce a
                 * five-slot build of boots. */
                break;
            }
        }
        return false;
    }

    /* ===== Think ===== */
    function think(world, b, dt) {
        var u = b.u;
        M = S.Map;
        if (!u.alive) {
            b.state = "dead";
            return;
        }

        /* Base behaviour runs every step, not every think: recalling and
         * shopping are continuous, and gating them on a reaction timer
         * would make a bot sit in base for a quarter second after arriving. */
        if (u.recalling > 0) { u.moveTo = null; return; }
        if (u.atBase && !u.inCombat) {
            tryBuy(world, u);
            if (hpFrac(u) < 0.98 && u.hp < S.Combat.stat(u, "hp")) {
                u.recalling = 0.0001;
                return;
            }
        }

        if (world.time < b.nextThink) {
            act(world, b, dt);
            return;
        }
        b.nextThink = world.time + b.diff.react * (0.75 + b_rand() * 0.6);
        b.lastThink = world.time;

        /* Perception. A generous range because a bot should start walking
         * toward a fight it cannot yet see, not once it has arrived. It MUST
         * match ENGAGE, or the goal and the behaviour disagree.
         *
         * aggro scales that range: a Recruit only commits to something right
         * on top of it, a Necron Lord crosses half the map for it. This is
         * the offensive half of the ladder, and like dmgTaken it was in
         * config from the start and read from nowhere. */
        var sight = ENGAGE * (0.6 + b.diff.aggro * 0.55);
        var seen = enemies(world, u, sight);
        var wasRetreating = b.state === "retreat";
        var state = chooseState(world, b, u, seen);
        /* Sticky states. Switching to "retreat" is immediate - it is the one
         * transition that must never be deferred - but switching back out of
         * it is delayed, or a bot ping-pongs on the edge of its own tower.
         *
         * The commit timer is armed on the TRANSITION, not on every think
         * that happens to still be retreating. Arming it every think made
         * the bot refresh its own lockout once per reaction interval and
         * therefore never leave the state at all: one bad trade at minute
         * two, and the champion stood in its own base until the match ended
         * with zero CS. It looked like a cautious bot. It was a deadlock. */
        if (state !== "retreat" && wasRetreating && world.time < b.commitUntil) {
            state = "retreat";
        }
        b.state = state;
        if (state === "retreat" && !wasRetreating) b.commitUntil = world.time + 1.6;

        act(world, b, dt);
    }

    /* Continuous behaviour between thinks. Small and side-effect-free apart
     * from movement and casting, so a 200ms think interval still produces
     * smooth walking and correctly-timed last-hits. */
    function act(world, b, dt) {
        var u = b.u;
        M = S.Map;

        if (b.state === "recall") {
            var base = M.bases[u.team];
            var bd = S.dist2(u.x, u.y, base.fountain.x, base.fountain.y);
            if (bd > base.fountain.r * base.fountain.r * 0.6) {
                u.moveTo = { x: base.fountain.x, y: base.fountain.y };
            } else {
                u.recalling = 0.0001;
                u.moveTo = null;
            }
            return;
        }

        if (b.state === "retreat") {
            /* Turn to face the threat while walking away. A bot that runs
             * without looking gets auto-attacked for free by anything with a
             * projectile, and the player learns nothing from it. */
            var pt = retreatPoint(world, u);
            u.moveTo = pt;
            var threatUnit = nearestThreat(world, u);
            if (threatUnit) u.facing = Math.atan2(threatUnit.y - u.y, threatUnit.x - u.x);
            return;
        }

        /* Farming: a last-hit worth taking beats walking. */
        var cs = lastHitTarget(world, b, u);
        if (cs && b.state !== "fight") {
            u.moveTo = null;
            u.target = cs;
            faceAndStrike(world, u, cs);
            return;
        }

        if (b.state === "fight") {
            var foes = enemies(world, u, b.sight || ENGAGE);
            var champ = null;
            for (var i = 0; i < foes.length; i++) {
                if (foes[i].kind === "champ") { champ = foes[i]; break; }
            }
            if (champ) {
                /* Hold at the edge of auto-attack range rather than closing.
                 * A bot that walks into melee range of everything it fights
                 * takes every trade it should decline. */
                var reach = S.Combat.stat(u, "range") + (champ.radius || 40);
                var d = S.dist(u.x, u.y, champ.x, champ.y);
                if (d > reach * 0.9) u.moveTo = { x: champ.x, y: champ.y };
                else u.moveTo = null;
                u.target = champ;
                faceAndStrike(world, u, champ);
                /* Abilities are used on their own schedule rather than every
                 * step, so a bot cannot dump four abilities into one second
                 * of a fight. */
                if (world.time >= b.abilityAt) {
                    useAbilities(world, b, foes.length ? foes : [champ], dt);
                    b.abilityAt = world.time + 0.25 + b_rand() * 0.3;
                }
                return;
            }
        }

        /* Pushing: sit with the wave and clear what is in front of it. */
        var goal = pushPoint(world, u);
        var near = enemies(world, u, S.Combat.stat(u, "range") + 260);
        var minion = null;
        for (i = 0; i < near.length; i++) {
            if (near[i].kind === "minion") { minion = near[i]; break; }
        }
        if (minion) {
            u.moveTo = null;
            u.target = minion;
            faceAndStrike(world, u, minion);
        } else {
            u.moveTo = goal;
            u.target = null;
        }
        if (world.time >= b.abilityAt && near.length) {
            useAbilities(world, b, near, dt);
            b.abilityAt = world.time + 0.5 + b_rand() * 0.6;
        }
    }

    function nearestThreat(world, u) {
        var best = null, bestT = -1;
        for (var i = 0; i < world.champs.length; i++) {
            var c = world.champs[i];
            if (!c.alive || c.team === u.team) continue;
            if (!c.visible) continue;
            var t = threat(world, u, c);
            if (t > bestT) { bestT = t; best = c; }
        }
        return best;
    }

    /* Face the target and swing if it is in reach. The bot does not manage
     * its own attack timer: world.tickAttack does that from u.target. This
     * only points the unit at what it is hitting. */
    function faceAndStrike(world, u, target) {
        u.facing = Math.atan2(target.y - u.y, target.x - u.x);
        var reach = S.Combat.stat(u, "range") + (target.radius || 40) +
            (target.kind === "tower" || target.kind === "core" ? 60 : 0);
        var d2 = S.dist2(u.x, u.y, target.x, target.y);
        if (d2 > reach * reach) {
            u.moveTo = { x: target.x, y: target.y };
        } else {
            u.moveTo = null;
            if (!u.target) u.target = target;
        }
    }

    /* Run a whole match headlessly. Used by the balance harness, which is
     * the only way to find out whether a change to one number made the game
     * unfair without playing forty matches by hand. */
    function simulate(world, seconds, step) {
        var dt = step || C.fixedStep;
        var steps = Math.floor(seconds / dt);
        for (var i = 0; i < steps && !world.over; i++) S.World.step(world, dt);
        return world;
    }

    S.AI = {
        makeBrain: makeBrain,
        think: think,
        assignLanes: assignLanes,
        enemies: enemies,
        allies: allies,
        threat: threat,
        lastHitTarget: lastHitTarget,
        hpFrac: hpFrac,
        chooseState: chooseState,
        perceivedFrac: perceivedFrac,
        pushPoint: pushPoint,
        retreatPoint: retreatPoint,
        simulate: simulate,
        builds: BUILDS,
        laneForRole: LANE_FOR_ROLE,
        resetStream: resetStream
    };

})(window.IF = window.IF || {});
