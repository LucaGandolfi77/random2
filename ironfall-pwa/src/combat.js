/*
 * IRONFALL - damage, mitigation, status effects, and every passive.
 *
 * The damage model is League's: physical damage is reduced by a percentage
 * that comes from armour, magical by resistance, and both formulas saturate.
 * That saturation is the whole reason an armour item is worth exactly what
 * it says on the panel - it removes a share of the hit, never a flat amount -
 * and it is why a tank cannot simply become immune.
 *
 * Every passive in the game (four factions, seven runes, five items) lives
 * here as one switch. They are gathered in a single place on purpose: a
 * passive is the easiest thing in a game to break by changing a stat
 * elsewhere, and having all sixteen readable in one file is what makes a
 * balance pass safe.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var A = C.armorConstant;

    /* Percentage mitigation, saturating. resist may be negative (a debuff
     * that strips armour) but is floored at 0, so nothing ever amplifies
     * damage through the armour path. */
    function mitigate(raw, resist) {
        var r = Math.max(0, resist);
        return raw * (A / (A + r));
    }

    /* Structures eat a flat reduction in champion damage. Without it, dive
     * compositions would ignore towers entirely, which is the one thing
     * towers must never allow. */
    var STRUCT_DAMAGE_MUL = 0.55;

    /* A Core is a different kind of objective from a Tower. It is not meant
     * to be finished by a wave: a cannon minion that chips the Core for a
     * few points a second can end a match that should have needed a player,
     * and in the first balance pass a match genuinely was lost that way at
     * 4:42. Minions still chip, so a completely wiped team still loses to
     * its own wave eventually - just slowly, and in a way a player can see
     * coming and answer. */
    var MINION_CORE_MUL = 0.12;

    /* Effective attack speed after soft caps. Above the soft cap a fraction
     * of the bonus is wasted, so a marksman cannot reach a firing rate where
     * the animation stops meaning anything. */
    function effectiveAs(u) {
        var as = S.Combat.stat(u, "as");
        var over = as - C.softCapAbove;
        if (over <= 0) return as;
        return C.softCapAbove + over * C.softCapFactor;
    }

    /* Sum of active temporary buffs for a stat. `pct` sums the percentage
     * buffs, `flat` the absolute ones. Kept as two sums because they
     * compose differently: two +25% attack speed buffs are +50%, not +25% of
     * +25%. */
    function buffed(u, key) {
        var pct = 0, flat = 0, i;
        var list = u.buffs || [];
        for (i = 0; i < list.length; i++) {
            var b = list[i];
            if (b.until !== undefined && b.until <= 0) continue;
            if (!b.stats) continue;
            var v = b.stats[key];
            if (v === undefined) continue;
            if (b.percent) pct += v; else flat += v;
        }
        var base = S.Combat.stat(u, key);
        /* Percentage buffs apply to the permanent stat, then flat buffs add
         * on top. Doing it the other way round would let a flat buff be
         * multiplied by a percentage buff it should not see. */
        return base * (1 + pct) + flat;
    }

    /* Slow strength, taking the strongest active slow rather than the sum.
     * Summing two 40% slows to 80% is not how crowd control works, and it
     * would make one well-timed slow strictly better than two. */
    function slowPct(u) {
        var best = 0, immune = false;
        var list = u.buffs || [];
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            if (b.until !== undefined && b.until <= 0) continue;
            if (b.slowImmune) immune = true;
            if (b.slow && b.slow.pct > best) best = b.slow.pct;
        }
        if (immune) return 0;
        return S.clamp(best, 0, C.slowCap);
    }

    /* True when a hard crowd-control effect is active. Immobilising effects
     * are the ones that set `landspeed`, which is then clamped against the
     * attack-speed floor below. */
    function isLocked(u) {
        var list = u.buffs || [];
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            if (b.until !== undefined && b.until <= 0) continue;
            if (b.stun || b.root) return true;
        }
        return false;
    }

    /* Whether the unit may act at all. Silence would be a fifth thing to
     * track; the roster has no silences, so hard CC and movement lock are
     * separate only where an ability says so (E's knockup). */
    function canAct(u) {
        return u.alive && u.hp > 0 && !isLocked(u);
    }

    function canMove(u) {
        if (!canAct(u)) return false;
        var list = u.buffs || [];
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            if (b.until !== undefined && b.until <= 0) continue;
            if (b.root) return false;
        }
        return true;
    }

    /* ===== Derived stats =====
     *
     * Three layers, and the order matters:
     *   base  - the champion's own numbers at its current level
     *   flat  - permanent adds from items, runes and Doctrine
     *   pct   - permanent percentages from items and runes
     * Temporary buffs live on u.buffs and are applied by `buffed()` above.
     * Keeping permanent and temporary apart is what lets a debuff be applied
     * and removed without ever having to reconstruct a champion's stats. */
    function stat(u, key) {
        var b = u.base || {};
        var flat = (u.flat && u.flat[key]) || 0;
        var pct = (u.pct && u.pct[key]) || 0;
        var v = (b[key] || 0) + flat;
        if (pct) v += (b[key] || 0) * pct;
        /* Aquila is a condition, not a stat, so it is resolved here instead
         * of being pushed as a buff. That way crossing the 40% threshold -
         * in either direction - takes effect on the very next read rather
         * than on the next buff tick. It costs one comparison per stat read
         * and only ever runs for astartes champions. */
        if (key === "armor") {
            v += factionArmor(u);
            /* Tower plates, the same trick. Plates are armour that depletes,
             * and armour is only ever consulted here, so threading it
             * through eleven damage paths instead would be eleven chances
             * to forget one. */
            if (u.kind === "tower") v += u.plateArmor || 0;
        }
        return v;
    }

    /* Recompute `base` for a level. Called on level-up and on spawn, never
     * in the frame loop. */
    function recomputeBase(u) {
        var d = u.def;
        var lvl = Math.max(1, u.level) - 1;
        var s = {
            ad: C.champ.baseAd + ((d && d.stats && d.stats.ad) || 0) + C.champ.adPerLevel * lvl,
            as: C.champ.baseAs + ((d && d.stats && d.stats.as) || 0),
            ms: C.champ.baseMs + ((d && d.stats && d.stats.ms) || 0),
            armor: C.champ.baseArmor + ((d && d.stats && d.stats.armor) || 0) + C.champ.armorPerLevel * lvl,
            mr: C.champ.baseMr + ((d && d.stats && d.stats.mr) || 0) + C.champ.mrPerLevel * lvl,
            hp: C.champ.baseHp + ((d && d.stats && d.stats.hp) || 0) + C.champ.hpPerLevel * lvl,
            mana: C.champ.baseMana + ((d && d.stats && d.stats.mana) || 0) + C.champ.manaPerLevel * lvl,
            hpRegen: C.champ.baseHpRegen + C.champ.hpRegenPerLevel * lvl,
            manaRegen: C.champ.baseManaRegen + C.champ.manaRegenPerLevel * lvl,
            range: C.champ.baseRange
        };
        /* Ranged champions carry their range on the champion's own delta
         * rather than in the baseline, because there is no sensible default
         * that is both "melee" and "marksman". */
        if (d && d.stats && d.stats.range) s.range = d.stats.range;
        u.base = s;
        return s;
    }

    function applyPermanent(u, flatMods, pctMods) {
        u.flat = flatMods || {};
        u.pct = pctMods || {};
    }

    /* ===== Damage =====
     *
     * Returns a record rather than a number, because three different callers
     * need three different things from the same event: the renderer needs the
     * amount (for a damage number), MALEFICIUM needs the overkill (to decide
     * whether it healed), and the kill handler needs to know whether it
     * killed. Computing once and handing it back is cheaper and impossible to
     * get out of sync. */
    function damage(src, tgt, raw, type, opts) {
        opts = opts || {};
        if (!tgt || !tgt.alive || tgt.hp <= 0) return { dealt: 0, overkill: 0, killed: false };
        if (!isFinite(raw) || raw <= 0) return { dealt: 0, overkill: 0, killed: false };

        var amount = raw;
        var crit = false;

        /* Crit is a flat multiplier on the raw number, resolved before any
         * mitigation so a crit is a bigger swing rather than a bigger
         * percentage of an already-shrunk hit. */
        if (opts.canCrit !== false && type === "phys" && src) {
            var critChance = stat(src, "crit") || 0;
            if (critChance > 0 && S.rng() < critChance) {
                amount *= C.critMult;
                crit = true;
            }
        }

        /* Structures and camps shrug off a fixed share of incoming champion
         * damage. Without this, dive compositions would ignore towers
         * entirely, which is the one thing towers must never allow. An
         * ability can override the fraction with `structMul` - that is how
         * SERGEANT's artillery and GROTSHOUL's choppa are allowed to hit a
         * tower properly. */
        if (tgt.kind === "structure" || tgt.kind === "tower" || tgt.kind === "core" || tgt.kind === "camp") {
            amount *= opts.structMul !== undefined ? opts.structMul : STRUCT_DAMAGE_MUL;
            if (tgt.kind === "core" && src && src.kind === "minion") amount *= MINION_CORE_MUL;
        }

        if (tgt.invulnerable) return { dealt: 0, overkill: 0, killed: false };

        var before = amount;
        if (type === "phys") amount = mitigate(amount, stat(tgt, "armor"));
        else if (type === "magic") amount = mitigate(amount, stat(tgt, "mr"));
        /* true damage passes through both. Nothing in the roster deals any,
         * but the floor has to be in place before one does. */

        /* Never let a mitigation stack zero out a hit outright. A pure tank
         * that cannot be scratched turns a duel into a staring contest. */
        amount = Math.max(amount, before * C.minDamageFraction);

        var dealt = Math.min(amount, tgt.hp);
        tgt.hp -= amount;
        tgt.lastHitAt = S.Combat.now;
        /* `lastDamagedAt` is what plate regeneration and the tower escalation
         * ramp read. It is tracked separately from `lastHitAt` because a
         * champion's out-of-combat clock uses "attacked OR hit" while a
         * tower's uses only "hit" - a tower being shot at does not stop
         * regrowing its plates, but a champion being shot at does stop
         * healing. */
        if (tgt.team !== undefined && tgt.team !== src.team) tgt.lastDamagedAt = S.Combat.now;

        /* Synapse reads this. It is tracked for every champion-on-champion
         * hit and reset on every champion kill (see kill()), so the number
         * is always "damage I have dealt to champions since my last champion
         * kill" no matter which faction the attacker is. */
        if (src && src.kind === "champ" && tgt.kind === "champ" && src.team !== tgt.team) {
            src.dealtToChampes = (src.dealtToChampes || 0) + dealt;
        }

        /* Tower plates. Each point of damage strips plate armour, and the
         * armour is what combat.stat hands back as mitigation, so the plates
         * deplete as a direct consequence of being hit rather than as a
         * separate mechanic that could drift out of step with the health
         * bar. Clamped at zero: a dead tower has no plates, whatever the
         * arithmetic says. */
        if (tgt.kind === "tower" && tgt.plates > 0 && tgt.plateArmor > 0) {
            var T = C.tower;
            var maxPlate = T.plateArmour * T.plates;
            var stripped = dealt * T.plateDamageRatio;
            tgt.plateArmor = Math.max(0, tgt.plateArmor - stripped);
            tgt.platesDown = Math.max(0, T.plates -
                Math.ceil(tgt.plateArmor / T.plateArmour));
            /* Clamp the derived plate count so a partial plate does not
             * report as a whole plate gone. */
            if (tgt.plateArmor > 0 && tgt.plateArmor <= T.plateArmour * 0.999) {
                tgt.platesDown = Math.min(tgt.platesDown, T.plates - 1);
            }
        }

        /* Lifesteal and omnivamp are separate pools on purpose: a
         * physical build healing from magic damage would quietly make armour
         * irrelevant. */
        if (src && src.team !== tgt.team && dealt > 0) {
            var ls = stat(src, "lifesteal") || 0;
            var ov = stat(src, "omnivamp") || 0;
            if (ls > 0 && type === "phys") heal(src, dealt * Math.min(ls, C.lifestealCap), null);
            if (ov > 0) heal(src, dealt * Math.min(ov, C.omnivampCap), null);
        }

        /* A damage number, queued for the world to own.
         *
         * This used to be a single `lastEvent` slot, which nothing ever
         * read - so the game had no damage numbers at all despite computing
         * one on every single hit. A single slot is also the wrong shape: two
         * people hitting each other in the same frame needs two numbers, and
         * a one-slot buffer silently drops one of them. It is a queue now,
         * and world.step drains it into world.nums.
         *
         * Only hits against things the player can see get a number. A number
         * floating over a silhouette in the fog tells you a damage happened
         * and nothing else, which is noise. */
        /* Shown for damage you dealt, damage your team dealt, and - the case
         * that was missing - damage dealt TO YOU. Being hit with no number at
         * all is how a player ends up blaming the wrong champion: the
         * telegraph said one thing and the only feedback was a health bar
         * that had already stopped moving. */
        var mineToSee = src === undefined || !src || src.isPlayer ||
            src.team === tgt.team || tgt.isPlayer;
        if (dealt >= 1 && mineToSee) {
            if (S.Combat.numEvents && S.Combat.numEvents.length < 40) {
                var big = dealt >= 120;
                S.Combat.numEvents.push({
                    x: tgt.x, y: tgt.y, z: (tgt.z || 0) + (tgt.height || 60) * 0.7,
                    text: S.fmt(dealt),
                    color: crit ? S.PAL.damageCrit
                        : (big ? S.PAL.damageBig
                            : (type === "magic" ? S.PAL.damageMagic : S.PAL.damagePhys)),
                    crit: crit
                });
            }
        }

        var killed = false;
        var overkill = amount - dealt;
        if (tgt.hp <= 0 && tgt.alive) {
            tgt.hp = 0;
            killed = true;
            /* MALEFICIUM, applied before kill() so that a kill which also
             * heals still records the healing as happening before the
             * champion is flagged dead. Reads overkill, not total damage, so
             * clipping someone for 4 points pays nothing and committing to a
             * 300-point overkill pays 42. */
            if (src && src.faction === "warpbound" && overkill > 0) {
                heal(src, overkill * 0.14, null);
            }
            S.Combat.kill(src, tgt, opts);
        }

        return { dealt: dealt, overkill: overkill, killed: killed, crit: crit };
    }

    function heal(u, amount, src) {
        if (!u || !u.alive || amount <= 0) return 0;
        /* Shields absorb first. Healing into a shield does not waste the
         * shield and does not waste the heal either, which is what makes a
         * shield worth buying over raw health. */
        if (u.shield > 0) {
            var absorbed = Math.min(u.shield, amount);
            u.shield -= absorbed;
            amount -= absorbed;
        }
        if (amount <= 0) return 0;
        var max = S.Combat.stat(u, "hp");
        var before = u.hp;
        u.hp = Math.min(max, u.hp + amount);
        var got = u.hp - before;
        if (got > 0) {
            u.lastHealAt = S.Combat.now;
            /* Only shown for the player's own team. A green number rising off
             * every minion in a wave is noise; one rising off the champion
             * you are playing is information. */
            if (u.isPlayer || (S.Combat.healEvents.length < 24)) {
                S.Combat.healEvents.push({
                    x: u.x, y: u.y, z: u.z || 0, height: u.height || 0,
                    amount: got, team: u.team
                });
            }
        }
        return got;
    }

    function addShield(u, amount, dur, src) {
        if (!u || !u.alive || amount <= 0) return 0;
        /* Shields do not stack additively with themselves - taking two
         * shields should refresh, not double. The larger of the two wins and
         * the timer restarts. */
        if (amount > u.shield) u.shield = amount;
        u.shieldDur = Math.max(u.shieldDur || 0, dur || 3);
        if (src) u.shieldFrom = src;
        return u.shield;
    }

    /* ===== Status effects =====
     * One flat list of timed records. No stacking of a named effect: casting
     * the same slow twice refreshes it rather than adding to it, which is
     * what makes the "strongest slow wins" rule above consistent. */
    function addBuff(u, b) {
        if (!u || !u.alive) return null;
        b.t = S.Combat.now;
        b.until = S.Combat.now + (b.dur || 1);
        u.buffs.push(b);
        return b;
    }

    function tickBuffs(u, dt) {
        var list = u.buffs;
        var i = 0, w = 0;
        /* In-place compaction. Buff lists are short (six or seven records at
         * the busiest) and this runs for every unit every step, so allocating
         * a filtered copy here would be the single hottest garbage source in
         * the simulation. */
        while (i < list.length) {
            if (list[i].until > S.Combat.now) list[w++] = list[i];
            i++;
        }
        list.length = w;

        if (u.shield > 0) {
            u.shieldDur -= dt;
            if (u.shieldDur <= 0) { u.shield = 0; u.shieldDur = 0; }
        }
    }

    /* Knockup sets the same `lock` the stun does but is a different flag, so
     * the renderer can spin the unit for a knockup and not for a stun. */
    function stun(u, dur, src) {
        addBuff(u, { kind: "stun", dur: dur, stun: true });
    }
    function root(u, dur, src) {
        addBuff(u, { kind: "root", dur: dur, root: true });
    }
    function knockup(u, dur, src) {
        addBuff(u, { kind: "knockup", dur: dur, stun: true, knock: true });
    }
    function slow(u, pct, dur, src) {
        if (pct <= 0) return;
        addBuff(u, { kind: "slow", dur: dur, slow: { pct: S.clamp(pct, 0, C.slowCap) } });
    }
    function cleanseSlow(u) {
        var list = u.buffs;
        var i = 0, w = 0;
        while (i < list.length) {
            if (list[i].kind !== "slow") list[w++] = list[i];
            i++;
        }
        list.length = w;
    }

    /* ===== Death =====
     * Bounties are level-scaled so an early kill is worth less than a late
     * one, which is what stops the game from degenerating into "whoever
     * catches the other person at level one wins". */
    function killBounty(tgt) {
        if (tgt.kind === "champ") return Math.round(260 + tgt.level * 42);
        if (tgt.kind === "minion") return Math.round(20 + tgt.level * 2);
        if (tgt.kind === "tower") return 250;
        if (tgt.kind === "core") return 0;
        return 40;
    }

    function killXp(tgt) {
        if (tgt.kind === "champ") return Math.round(320 + tgt.level * 68);
        return 0;
    }

    /* Everyone who helped, for the kill feed and for assists. Built here
     * rather than by the caller because "who helped" is the same question for
     * both and the answer must not drift. */
    function contributors(tgt) {
        var out = [];
        if (!tgt.assist) return out;
        for (var i = 0; i < tgt.assist.length; i++) {
            if (tgt.assist[i] > 0 && tgt.assist[i].src && tgt.assist[i].src.alive) {
                out.push(tgt.assist[i].src);
            }
        }
        return out;
    }

    function kill(src, tgt, opts) {
        tgt.alive = false;
        tgt.deathTime = S.Combat.now;
        tgt.deadFor = 0;

        var killer = src;

        /* Structures and minions resolve through world.js, because only the
         * world knows what "a tower falls" means - gold, the Core exposure
         * check, the sound. Routing them from here rather than from the
         * caller's archetype is what guarantees that a tower killed by an
         * ability and a tower killed by a minion behave identically. */
        if (tgt.kind === "tower" || tgt.kind === "core" || tgt.kind === "camp" ||
            tgt.kind === "reliquary" || tgt.kind === "structure" || tgt.kind === "summon_turret") {
            if (S.World.onStructureDeath) S.World.onStructureDeath(tgt, killer);
        }
        if (tgt.kind === "minion" && S.World.grantMinionXp) {
            S.World.grantMinionXp(tgt);
        }
        /* A death that leaves nothing behind. Structures already got a
         * 60-particle burst from onStructureDeath; every other unit simply
         * stopped being drawn, so a champion died by blinking out of the
         * world with no confirmation that the kill had landed. */
        var w = S.Combat.currentWorld;
        if (w && tgt.kind !== "structure" && tgt.kind !== "tower" && tgt.kind !== "core" &&
            S.World.spawnBurst && !tgt.noImpact) {
            S.World.spawnBurst(w, tgt.x, tgt.y, tgt.team,
                tgt.kind === "champ" ? 22 : 7,
                tgt.kind === "champ" ? "#ffd9a0" : "#9aa4b0",
                { dur: tgt.kind === "champ" ? 0.6 : 0.35 });
        }
        if (tgt.onDeath) tgt.onDeath(killer);

        if (killer && killer.team !== tgt.team) {
            killer.kills = (killer.kills || 0) + 1;
            /* `kills` counts everything that died to this unit, which is
             * dominated by minions - a champion with a good clear is not a
             * champion who is winning fights. Anything reasoning about
             * combat has to be able to tell those apart. */
            if (tgt.kind === "champ") {
                killer.champKills = (killer.champKills || 0) + 1;
            }
            S.Combat.events.push({ type: "kill", killer: killer, victim: tgt, t: S.Combat.now });

            var gold = killBounty(tgt);
            if (gold > 0) addGold(killer, gold, tgt);

            var assists = contributors(tgt);
            for (var i = 0; i < assists.length; i++) {
                if (assists[i] === killer) continue;
                assists[i].assists = (assists[i].assists || 0) + 1;
                addGold(assists[i], Math.round(gold * C.assistValue), tgt);
            }

            if (tgt.kind === "champ") {
                tgt.deaths = (tgt.deaths || 0) + 1;
                /* Every champion's synapse counter resets on any champion
                 * kill, not only their own. Holding it across kills would
                 * make the number grow without bound and eventually make the
                 * passive worth more than the champion. */
                killer.dealtToChampes = 0;
                /* XP for the kill is shared with everyone who was nearby,
                 * exactly like minion XP. A kill that is only worth the
                 * killer rewards being alone, which is the wrong lesson in a
                 * three-man game. */
                grantXpArea(tgt.x, tgt.y, killXp(tgt), killer, tgt.team);
                /* Faction passives that fire on champion kills. */
                fireKillPassives(killer, tgt, Math.max(1, gold));
            }
        } else {
            /* Killed by a minion or a structure: no bounty, no passive. */
            S.Combat.events.push({ type: "death", killer: null, victim: tgt, t: S.Combat.now });
        }

        S.Combat.events.push({ type: "gone", killer: killer, victim: tgt, t: S.Combat.now });
    }

    function addGold(u, amount, from) {
        if (!u || u.kind !== "champ") return;
        u.gold += amount;
        u.goldFromFight = (u.goldFromFight || 0) + amount;
    }

    /* Shared XP around a dying unit. `team` is the dying unit's team: every
     * champion of the *other* team learns from it. */
    function grantXpArea(x, y, amount, source, deadTeam) {
        var list = S.Combat.champs;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (!c || !c.alive) continue;
            if (c.team === deadTeam) continue;
            var d2 = S.dist2(x, y, c.x, c.y);
            if (d2 > C.xpShareRadius * C.xpShareRadius) continue;
            /* Falls off with distance so standing exactly on top of a dying
             * wave is meaningfully better than standing at the edge of the
             * share radius. */
            var falloff = 1 - 0.4 * (Math.sqrt(d2) / C.xpShareRadius);
            grantXp(c, amount * falloff, source);
        }
    }

    function grantXp(u, amount, source) {
        if (!u || u.kind !== "champ" || !u.alive) return;
        if (u.level >= C.champ.levelCap) return;
        u.xp += amount;
        /* Level-ups are resolved in one place so a single XP event that
         * crosses three thresholds grants three levels and not one. */
        while (u.level < C.champ.levelCap && u.xp >= C.xpCurve[u.level]) {
            u.level++;
            if (u.onLevelUp) u.onLevelUp(u.level);
        }
        if (u.level >= C.champ.levelCap) u.xp = C.xpCurve[C.champ.levelCap - 1];
    }

    /* ===== Passives =====
     * Four faction passives. Each one is a single readable rule. */

    function fireKillPassives(killer, victim, gold) {
        if (!killer || killer.kind !== "champ") return;
        if (killer.faction === "tyranid") {
            /* Synapse: 16% of the damage dealt to champion kills. Scales
             * with how hard the kill was, so a lead compounds. The running
             * total is reset after every champion kill rather than carried
             * forever, which stops a late game Sylas-style carry from
             * out-healing the whole enemy team. */
            heal(killer, killer.dealtToChampes * 0.16, null);
            killer.dealtToChampes = 0;
        }
        /* Maleficium is not here: it fires on overkill at the moment of the
         * hit, in damage(), because that is where overkill is known. */
    }

    /* Aquila is evaluated on demand rather than pushed as a buff, because
     * "below 40% health" is a condition and not a timer. Reading it here
     * means it flips the instant a heal crosses the threshold instead of
     * waiting for the next tick. */
    function factionArmor(u) {
        if (u.kind !== "champ") return 0;
        if (u.faction === "astartes") {
            var max = stat(u, "hp");
            if (max > 0 && u.hp / max < 0.4) return 30;
        }
        return 0;
    }

    /* Chapter banner: structures and minions near you hit softer. Read the
     * same way as factionArmor - a conditional, not a timer. */
    function damageReductionVsStructures(u, tgt) {
        if (!u || u.kind !== "champ") return 1;
        if (tgt && (tgt.kind === "tower" || tgt.kind === "core" || tgt.kind === "structure")) {
            if (u.itemFlags && u.itemFlags.chapterBanner) {
                if (S.dist2(u.x, u.y, tgt.x, tgt.y) < 500 * 500) return 0.88;
            }
        }
        return 1;
    }

    /* ===== Rune hooks =====
     * Seven hooks, all of them small. Called from world.js at the exact
     * moment their condition fires; nothing polls for them. */
    function fireAutoAttack(attacker, target) {
        var hk = attacker && attacker.runeHooks;
        if (!hk) return;

        if (hk.tempo) {
            /* LETHAL TEMPO: three auto attacks opens the window. The counter
             * is per-target and decays, so poking three different things
             * never opens it. */
            attacker._tempoKey = target;
            attacker._tempoHits = (attacker._tempoHits || 0) + 1;
            if (attacker._tempoHits >= hk.tempo.stacks) {
                attacker._tempoHits = 0;
                addBuff(attacker, {
                    kind: "tempo", dur: hk.tempo.dur,
                    stats: { as: hk.tempo.asBuff }, percent: true
                });
            }
        }

        if (hk.grasp) {
            /* GRASPPLATE: four hits on the same target. Same-target rule, same
             * reason. */
            if (attacker._graspKey === target) attacker._graspStacks++;
            else { attacker._graspKey = target; attacker._graspStacks = 1; }
            if (attacker._graspStacks >= hk.grasp.stacks) {
                attacker._graspStacks = 0;
                applyGrasp(attacker, target, hk.grasp);
            }
        }
    }

    function applyGrasp(attacker, target, rune) {
        var ad = stat(attacker, "ad");
        var total = rune.dmg + ad * rune.dmgPctAd;
        /* Grappled damage cannot stack with itself on the same target, so
         * this is an addBuff with a stable key rather than a fresh record
         * every attack. */
        addBuff(attacker, {
            kind: "grasp", dur: rune.dur, pierce: true,
            dot: {
                src: attacker, tgt: target, tick: rune.tick,
                dmg: total / (rune.dur / rune.tick),
                type: "true", remaining: rune.dur
            }
        });
    }

    function tickDot(u, dt) {
        var list = u.buffs;
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            if (!b.dot) continue;
            var d = b.dot;
            d.acc = (d.acc || 0) + dt;
            while (d.acc >= d.tick && d.remaining > 0) {
                d.acc -= d.tick;
                d.remaining -= d.tick;
                if (d.tgt && d.tgt.alive) {
                    damage(d.src, d.tgt, d.dmg, d.type, { canCrit: false, dot: true });
                }
            }
            if (d.remaining <= 0) b.dur = 0.001;
        }
    }

    /* PREDATOR is evaluated every stat read for movement speed. */
    function predatorBonus(u) {
        var hk = u && u.runeHooks;
        if (!hk || !hk.predator) return 0;
        var max = stat(u, "hp");
        if (max > 0 && u.hp / max < hk.predator.threshold) return hk.predator.msBuff;
        return 0;
    }

    /* Move speed, in the same base + flat + percent shape as every other stat.
     *
     * This was dead for the entire life of the game. The runner-up stat `ms`
     * was resolved for display and for the shop, folded from champion deltas,
     * runes, items and Doctrine tiers - and then never read. moveUnit used
     * `u.ms`, a field written once at construction from the base constant and
     * never touched again, so every champion walked at exactly 345 no matter
     * what they equipped. Boots did nothing. The PREDATOR rune's low-health
     * speed bonus had a helper written for it, exported, and called from
     * nowhere. A champion's whole identity as a skirmisher or a wall was
     * cosmetic.
     *
     * It is a separate function rather than a `stat(u, "ms")` call because
     * move speed is the one stat with a condition attached (Predator), and
     * because it is read once per unit per step where the extra branch is
     * free. */
    function moveSpeed(u) {
        var v = stat(u, "ms") + predatorBonus(u);
        return v > 0 ? v : C.champ.baseMs;
    }

    /* ===== Per-step update =====
     * Drives the damage-over-time records and expires buffs. Called by
     * world.js for every unit on every fixed step. */
    function tick(u, dt) {
        if (!u.alive) return;
        tickBuffs(u, dt);
        tickDot(u, dt);
    }

    S.Combat = {
        /* Set by world.js each step. Nothing in combat.js calls the clock
         * itself, which is what makes the whole file testable: a test sets
         * `now` by hand and steps it. */
        now: 0,
        /* Set by World.step. See the note there. */
        currentWorld: null,
        champs: [],
        events: [],
        healEvents: [],
        numEvents: [],
        tick: tick,
        drainEvents: function () {
            var e = S.Combat.events; S.Combat.events = []; return e;
        },
        drainHeals: function () {
            var e = S.Combat.healEvents; S.Combat.healEvents = []; return e;
        },

        mitigate: mitigate,
        effectiveAs: effectiveAs,
        stat: stat,
        buffed: buffed,
        recomputeBase: recomputeBase,
        applyPermanent: applyPermanent,
        slowPct: slowPct,
        isLocked: isLocked,
        canAct: canAct,
        canMove: canMove,
        damage: damage,
        heal: heal,
        addShield: addShield,
        kill: kill,
        addBuff: addBuff,
        stun: stun,
        root: root,
        knockup: knockup,
        slow: slow,
        cleanseSlow: cleanseSlow,
        grantXp: grantXp,
        grantXpArea: grantXpArea,
        addGold: addGold,
        killBounty: killBounty,
        killXp: killXp,
        fireAutoAttack: fireAutoAttack,
        factionArmor: factionArmor,
        damageReductionVsStructures: damageReductionVsStructures,
        predatorBonus: predatorBonus,
        moveSpeed: moveSpeed
    };

})(window.IF = window.IF || {});
