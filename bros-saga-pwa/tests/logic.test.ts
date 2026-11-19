import { describe, expect, it } from 'vitest';
import { AREAS, generateArea } from '../src/data/areas';
import { ENEMY_BY_ID } from '../src/data/enemies';
import { initialBro } from '../src/data/bros';
import { unlockedBros } from '../src/data/moves';
import { BattleSystem } from '../src/systems/BattleSystem';
import { TIMING_WINDOW, MAX_LEVEL } from '../src/game/constants';
import { BADGES } from '../src/data/badges';
import { POWERS, powersForLevel } from '../src/data/powers';
import { MINIGAMES, MINIGAME_BY_ID } from '../src/data/minigames';
import { BadgeSystem } from '../src/systems/BadgeSystem';
import { MinigameSystem } from '../src/systems/MinigameSystem';

const enemy = ENEMY_BY_ID.grubbo;
const noop = { onSound: () => {}, onEnd: () => {} };
const mkBattle = () => {
  const b = new BattleSystem({ ...enemy, hp: 200 }, [initialBro('pip'), initialBro('pop')], { mushroom: 2, pepper: 1, oneup: 1 }, noop);
  b.update(1.5); // skip the intro so commands are available
  return b;
};

describe('bros and progression data', () => {
  it('starts with two distinct brothers', () => {
    const pip = initialBro('pip'), pop = initialBro('pop');
    expect(pip.id).not.toBe(pop.id);
    expect(pip.hp).toBeGreaterThan(0);
    expect(pop.speed).toBeGreaterThan(pip.speed);
  });

  it('unlocks Bros. Attacks with level', () => {
    expect(unlockedBros(1).map((m) => m.id)).toEqual(['bros_blitz']);
    expect(unlockedBros(3).map((m) => m.id)).toContain('twin_cyclone');
    expect(unlockedBros(5).map((m) => m.id)).toContain('star_combo');
  });
});

describe('action commands', () => {
  it('perfect timing deals more damage than a normal hit', () => {
    const good = mkBattle();
    good.select('jump');
    good.cursor = 0.5 - TIMING_WINDOW / 2 + 0.01;
    good.press();

    const perfect = mkBattle();
    perfect.select('jump');
    perfect.cursor = 0.5;
    perfect.press();

    expect(perfect.enemyHp).toBeLessThan(good.enemyHp);
    expect(perfect.phase).toBe('resolve');
  });

  it('a missed press deals reduced damage', () => {
    const b = mkBattle();
    b.select('jump');
    b.cursor = 0.05;
    b.press();
    expect(b.hitCount).toBe(0);
    expect(b.enemyHp).toBeLessThan(200);
  });

  it('Bros. Attacks cost BP and need multiple hits', () => {
    const b = mkBattle();
    expect(b.select('bros_blitz')).toBe(true);
    expect(b.bp).toBe(0);
    expect(b.neededHits).toBe(2);
    expect(b.select('bros_blitz')).toBe(false);
    b.cursor = 0.5; b.press();
    expect(b.phase).toBe('timing');
    b.cursor = 0.5; b.press();
    expect(b.phase).toBe('resolve');
  });

  it('defending in the window dodges and counters', () => {
    const b = mkBattle();
    b.select('jump');
    b.cursor = 0.5; b.press();
    b.update(0.9);
    expect(b.phase).toBe('enemy');
    b.update(1.2);
    expect(b.phase).toBe('defend');
    const hpBefore = b.bros[0].hp;
    const enemyBefore = b.enemyHp;
    b.cursor = 0.5;
    b.press();
    expect(b.bros[0].hp).toBe(hpBefore);
    expect(b.enemyHp).toBeLessThan(enemyBefore);
  });

  it('items heal and boost', () => {
    const b = mkBattle();
    b.bros[0].hp = 10;
    b.select('item_mushroom');
    expect(b.bros[0].hp).toBe(40);
    expect(b.items.mushroom).toBe(1);
    const before = b.bros[0].power;
    b.phase = 'command';
    b.select('item_pepper');
    expect(b.bros[0].power).toBe(before); // boost is battle-only
  });
});

describe('areas', () => {
  it('has nine areas and six bosses', () => {
    expect(AREAS.length).toBe(9);
    expect(AREAS.filter((a) => a.boss).length).toBe(6);
    expect(AREAS.every((a) => a.enemies.length >= 3)).toBe(true);
    expect(MAX_LEVEL).toBe(10);
  });

  it('generates deterministic connected maps with doors and chests', () => {
    const a = generateArea(AREAS[0]);
    const b = generateArea(AREAS[0]);
    expect(a.tiles).toEqual(b.tiles);
    expect(a.width).toBe(AREAS[0].size[0]);
    expect(a.chests.length).toBe(3);
    expect(a.exits.some((e) => e.dir === 'right')).toBe(true);
    const door = a.exits[0];
    expect(a.tiles[door.y][door.x]).toBe('D');
  });

  it('places enemy spawns on walkable tiles', () => {
    for (const def of AREAS) {
      const area = generateArea(def);
      for (const e of area.enemySpawns) expect(area.tiles[e.y][e.x]).toBe('.');
    }
  });
});

describe('badges, powers and minigames', () => {
  it('equips at most two badges and aggregates their effects', () => {
    const b = new BadgeSystem();
    expect(BADGES.length).toBeGreaterThanOrEqual(6);
    b.add('power_badge'); b.add('guard_charm'); b.add('speed_boots');
    b.toggle('power_badge'); b.toggle('guard_charm'); b.toggle('speed_boots');
    expect(b.equipped.length).toBe(2);
    const bonus = b.bonus();
    expect((bonus.power ?? 0) + (bonus.defense ?? 0) + (bonus.speed ?? 0)).toBeGreaterThan(0);
  });

  it('unlocks powers by level and applies badge stats in battle', () => {
    expect(powersForLevel(1)).toContain('double_jump');
    expect(powersForLevel(5)).toContain('hover_spin');
    expect(POWERS.every((p) => p.unlockLevel <= MAX_LEVEL)).toBe(true);
    const b = new BattleSystem({ ...enemy, hp: 200 }, [initialBro('pip'), initialBro('pop')], {}, noop,
      { badgeBonus: { maxHp: 10, power: 3 }, powers: powersForLevel(5) });
    expect(b.bros[0].maxHp).toBe(52);
    expect(b.bros[0].power).toBe(12);
    b.update(1.5);
    expect(b.view.menu.some((m) => m.id === 'firestorm')).toBe(true);
  });

  it('applies status effects from power attacks', () => {
    const b = new BattleSystem({ ...enemy, hp: 200 }, [initialBro('pip'), initialBro('pop')], {}, noop,
      { powers: powersForLevel(5) });
    b.update(1.5);
    expect(b.select('firestorm')).toBe(true);
    b.cursor = 0.5; b.press();
    expect(b.status?.kind).toBe('burn');
    expect(b.enemyHp).toBeLessThan(200);
  });

  it('runs five minigames and awards coins on completion', () => {
    expect(MINIGAMES.length).toBe(5);
    expect(Object.keys(MINIGAME_BY_ID).length).toBe(5);
    let reward: { coins: number } | null = null;
    const m = new MinigameSystem((r) => { reward = r; });
    m.start('coinrush');
    m.cursor = m.view.cursor;
    m.zone = m.cursor;
    m.press(true);
    expect(m.view.score).toBe(1);
    m.time = 0.01;
    m.update(0.05);
    expect(m.view.phase).toBe('result');
    expect(reward).not.toBeNull();
    expect(reward!.coins).toBeGreaterThan(0);
  });
});
