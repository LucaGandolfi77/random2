import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIGHTERS } from '../src/data/fighters';
import { STAGES } from '../src/data/stages';
import { ENEMY_TYPES, enemyForStage } from '../src/data/enemies';
import { DIALOGUE, STORY_ENDINGS } from '../src/data/story/dialogue';
import { STORY_CHAPTERS, CHAPTER_COUNT } from '../src/data/story/chapters';
import { StorySystem } from '../src/systems/StorySystem';
import { Fighter } from '../src/entities/Fighter';
import { Assist } from '../src/entities/Assist';
import { Projectile } from '../src/entities/Projectile';
import { AISystem } from '../src/systems/AISystem';
import { CombatSystem, overlaps } from '../src/systems/CombatSystem';
import { RoundSystem } from '../src/systems/RoundSystem';
import { Progression } from '../src/systems/Progression';
import { attacksFor, MAX_HP } from '../src/game/constants';
import { emptyInput } from '../src/game/types';

const rubber = FIGHTERS[0];
const blade = FIGHTERS[1];
const mk = (team: 'player' | 'enemy' = 'player', x = 100) =>
  new Fighter(rubber, team, team, x, team === 'player' ? 1 : -1, ['blade', 'storm']);

describe('fighter physics and attacks', () => {
  it('jumps and lands back on the ground', () => {
    const f = mk();
    const jump = { ...emptyInput(), up: true };
    f.update(1 / 60, jump);
    expect(f.vy).toBeLessThan(0);
    for (let i = 0; i < 120; i++) f.update(1 / 60, emptyInput());
    expect(f.y + 30).toBeLessThanOrEqual(233);
    expect(f.onGround).toBe(true);
  });

  it('has an active hitbox only during the active window', () => {
    const f = mk();
    f.startAttack('light1');
    f.update(0.02, emptyInput());
    expect(f.hitbox).toBeNull();
    f.update(0.08, emptyInput());
    expect(f.hitbox).not.toBeNull();
    for (let i = 0; i < 30; i++) f.update(1 / 60, emptyInput());
    expect(f.attack).toBeNull();
  });

  it('spends energy on a special and spawns a projectile', () => {
    const f = mk();
    f.energy = 100;
    f.startAttack('special');
    expect(f.energy).toBe(100 - rubber.specialCost);
    f.update(0.2, emptyInput());
    expect(f.pendingProjectile).not.toBeNull();
  });

  it('takes damage once while invulnerable and dies at zero HP', () => {
    const f = mk();
    const first = f.takeHit(20, 100, f.x - 20);
    const second = f.takeHit(20, 100, f.x - 20);
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);
    f.invuln = 0;
    f.takeHit(200, 300, f.x - 20);
    expect(f.hp).toBe(0);
    expect(f.state).toBe('ko');
  });

  it('scales damage with the fighter power stat', () => {
    const weak = attacksFor(FIGHTERS.find((x) => x.id === 'tiny')!);
    const strong = attacksFor(FIGHTERS.find((x) => x.id === 'iron')!);
    expect(strong.heavy.damage).toBeGreaterThan(weak.heavy.damage);
  });
});

describe('combat system', () => {
  const noop = { onSound: () => {}, onShake: () => {}, onHit: () => {} };

  it('resolves a melee hit once and builds a combo', () => {
    const a = mk('player', 100);
    const t = mk('enemy', 120);
    a.startAttack('light1');
    a.update(0.09, emptyInput());
    const cs = new CombatSystem();
    const events = cs.update(1 / 60, [a, t], [], [], noop);
    expect(events.length).toBe(1);
    expect(t.hp).toBeLessThan(MAX_HP);
    expect(a.combo).toBe(1);
    expect(cs.frozen).toBe(true);
    const again = cs.update(1 / 60, [a, t], [], [], noop);
    expect(again.length).toBe(0);
  });

  it('projectiles travel and damage the opposing fighter', () => {
    const a = mk('player', 100);
    const t = mk('enemy', 140);
    const p = new Projectile(rubber, 138, 214, 1, 12, 100, a.id, 'player', 'bolt');
    const cs = new CombatSystem();
    const events = cs.update(1 / 60, [a, t], [p], [], noop);
    expect(events.length).toBe(1);
    expect(t.hp).toBeLessThan(MAX_HP);
    expect(p.dead).toBe(true);
  });

  it('assists strike once inside their range', () => {
    const t = mk('enemy', 150);
    const assist = new Assist(blade, 'player', 120, 190, 1, 10);
    const cs = new CombatSystem();
    let events = cs.update(0.3, [t], [], [assist], noop);
    expect(events.length).toBe(1);
    expect(assist.struck).toBe(true);
    events = cs.update(0.1, [t], [], [assist], noop);
    expect(events.length).toBe(0);
  });

  it('rect overlap helper is symmetric', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe('AI and rounds', () => {
  it('approaches a distant foe and attacks a close one', () => {
    const ai = new AISystem({ difficulty: 1, rng: () => 0.1 });
    const self = mk('enemy', 100);
    const far = mk('player', 300);
    expect(ai.decide(0.4, self, far).right).toBe(true);
    const close = mk('player', 118);
    const input = ai.decide(0.4, self, close);
    expect(input.light || input.heavy || input.special).toBe(true);
  });

  it('runs a best-of-three match to completion', () => {
    const r = new RoundSystem();
    const p = mk('player', 100);
    const e = mk('enemy', 200);
    for (let i = 0; i < 90; i++) r.update(1 / 60, p, e);
    expect(r.phase).toBe('fight');

    for (let round = 0; round < 2; round++) {
      e.hp = 0; e.state = 'ko';
      const ev = r.update(1 / 60, p, e);
      expect(ev?.banner).toBe('K.O.');
      expect(r.wins[0]).toBe(round + 1);
      for (let i = 0; i < 160; i++) r.update(1 / 60, p, e);
      p.reset(100, 1);
      e.reset(200, -1);
      for (let i = 0; i < 90; i++) r.update(1 / 60, p, e);
    }
    expect(r.phase).toBe('matchEnd');
    expect(r.matchWinner).toBe('player');
  });
});

describe('progression', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); }
    });
  });

  it('unlocks fighters by wins and persists results', () => {
    const p = new Progression();
    p.load();
    expect(p.unlockedCount()).toBe(10);
    expect(p.isUnlocked('hunter')).toBe(false);
    p.recordMatch(true, 0);
    p.recordMatch(true, 1);
    p.recordMatch(true, 2);
    p.recordMatch(true, 3);
    expect(p.isUnlocked('hunter')).toBe(true);
    const loaded = new Progression();
    loaded.load();
    expect(loaded.data.wins).toBe(4);
    expect(loaded.data.arcadeBest).toBe(3);
  });

  it('survives corrupted save data', () => {
    localStorage.setItem('gigant-battle:save', '{not json');
    const p = new Progression();
    p.load();
    expect(p.data.wins).toBe(0);
  });

  it('migrates a v1 save and keeps story unlocks across sessions', () => {
    localStorage.setItem('gigant-battle:save', JSON.stringify({
      version: 1, wins: 6, arcadeBest: 5, matchesPlayed: 9, musicVolume: 0.2, sfxVolume: 0.7, quality: 'low'
    }));
    const migrated = new Progression();
    migrated.load();
    expect(migrated.data.version).toBe(2);
    expect(migrated.data.wins).toBe(6);
    expect(migrated.data.storyChapter).toBe(0);
    migrated.unlockFighter('gold');
    const loaded = new Progression();
    loaded.load();
    expect(loaded.isUnlocked('gold')).toBe(true);
  });
});

describe('expanded data integrity', () => {
  it('has 16 unique fighters with valid stats and specials', () => {
    expect(FIGHTERS.length).toBe(16);
    expect(new Set(FIGHTERS.map((f) => f.id)).size).toBe(16);
    FIGHTERS.forEach((f) => {
      expect(f.stats.power).toBeGreaterThan(0);
      expect(f.specialCost).toBeGreaterThan(0);
      expect(f.unlockAfter).toBeGreaterThanOrEqual(0);
    });
  });

  it('has eight arenas with their own platforms', () => {
    expect(STAGES.length).toBe(8);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(8);
    STAGES.forEach((s) => {
      expect(s.platforms.length).toBeGreaterThanOrEqual(2);
      expect(s.platforms.every((p) => p.w > 0 && p.h > 0)).toBe(true);
    });
  });

  it('has five distinct enemy classes with a boss', () => {
    expect(ENEMY_TYPES.length).toBe(5);
    expect(new Set(ENEMY_TYPES.map((e) => e.id)).size).toBe(5);
    expect(enemyForStage(7).boss).toBe(true);
    expect(enemyForStage(0).id).not.toBe(enemyForStage(7).id);
    const brute = ENEMY_TYPES.find((e) => e.id === 'brute')!;
    expect(brute.knockbackResist).toBeGreaterThan(0);
    expect(brute.defenseBonus).toBeGreaterThan(0);
  });

  it('every story chapter and dialogue target resolves', () => {
    expect(STORY_CHAPTERS.length).toBe(CHAPTER_COUNT);
    expect(CHAPTER_COUNT).toBe(10);
    STORY_CHAPTERS.forEach((c) => {
      expect(DIALOGUE[c.intro], `chapter ${c.id} intro`).toBeDefined();
      expect(DIALOGUE[c.win], `chapter ${c.id} win`).toBeDefined();
      expect(DIALOGUE[c.lose], `chapter ${c.id} lose`).toBeDefined();
      if (c.reward) expect(FIGHTERS.some((f) => f.id === c.reward)).toBe(true);
    });
    Object.entries(DIALOGUE).forEach(([id, node]) => {
      expect(node.choices.length, `node ${id}`).toBeGreaterThan(0);
      node.choices.forEach((c) => {
        if (c.next) expect(DIALOGUE[c.next], `${id} -> ${c.next}`).toBeDefined();
        if (c.effects?.unlock) expect(FIGHTERS.some((f) => f.id === c.effects!.unlock)).toBe(true);
        if (c.effects?.ending) expect(STORY_ENDINGS[c.effects.ending]).toBeDefined();
      });
    });
  });
});

describe('story progression', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); }
    });
  });

  it('applies dialogue effects, unlocks fighters and advances chapters', () => {
    const p = new Progression();
    p.load();
    const story = new StorySystem(p);
    story.newGame();
    expect(story.chapterIndex).toBe(0);

    const result = story.apply({ flag: 'test_flag', morale: 2, unlock: 'gold', nextChapter: true });
    expect(story.flags.has('test_flag')).toBe(true);
    expect(story.morale).toBe(2);
    expect(p.isUnlocked('gold')).toBe(true);
    expect(result.nextChapter).toBe(true);
    expect(story.chapterIndex).toBe(1);
    expect(p.data.storyChapter).toBe(1);
  });

  it('resolves the four story endings', () => {
    const p = new Progression();
    p.load();
    const story = new StorySystem(p);
    story.flags.add('ending_fallen');
    expect(story.resolveEnding()).toBe('fallen');
    story.flags.clear();
    story.flags.add('ending_truth');
    expect(story.resolveEnding()).toBe('truth');
    story.flags.clear();
    story.morale = 9;
    expect(story.resolveEnding()).toBe('loyal');
    story.morale = 0;
    expect(story.resolveEnding()).toBe('legend');
  });

  it('uses enemy AI profiles to change behaviour', () => {
    const trickster = ENEMY_TYPES.find((e) => e.id === 'trickster')!;
    const ai = new AISystem({ difficulty: 1, rng: () => 0.1, profile: trickster });
    const self = mk('enemy', 100);
    const foe = mk('player', 300);
    const input = ai.decide(0.5, self, foe);
    expect(input.right).toBe(true);
    expect(trickster.preferredRange).toBeGreaterThan(ENEMY_TYPES[0].preferredRange);
  });
});
