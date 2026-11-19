import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GameState, contactAvailability } from '../src/game/GameState';
import { BatterySystem } from '../src/systems/BatterySystem';
import { ThreatSystem, threatLevel } from '../src/systems/ThreatSystem';
import { StorySystem } from '../src/systems/StorySystem';
import { NavigationSystem } from '../src/enemies/NavigationSystem';
import { DIALOGUE } from '../src/data/dialogue';
import { CONTACTS } from '../src/data/contacts';
import { pickEvent, EVENTS } from '../src/data/events';
import { NIGHT_REAL_SECONDS } from '../src/data/chapters';
import { ZONES, ZONE_BY_ID, TAXI_COST, TAXI_SECONDS, taxiCost } from '../src/data/zones';

describe('time and state', () => {
  it('maps the night from 22:00 to 06:00', () => {
    const s = new GameState();
    expect(s.timeString).toBe('22:00');
    s.elapsed = NIGHT_REAL_SECONDS / 2;
    expect(s.hour).toBe(26);
    expect(s.timeString).toBe('02:00');
    s.elapsed = NIGHT_REAL_SECONDS;
    expect(s.timeString).toBe('06:00');
  });

  it('cooldowns and story gates control availability', () => {
    const s = new GameState();
    expect(contactAvailability(s, 'jessica')).toBe('off');
    s.chapter = 3;
    expect(contactAvailability(s, 'jessica')).toBe('ok');
    s.lastCallAt.sophie = s.elapsed;
    expect(contactAvailability(s, 'sophie')).toBe('busy');
  });

  it('diminishing returns prevent call spam', () => {
    const s = new GameState();
    const first = s.callEffectiveness('sophie');
    s.callCounts.sophie = 5;
    expect(s.callEffectiveness('sophie')).toBeLessThan(first);
    expect(s.callEffectiveness('sophie')).toBeGreaterThanOrEqual(0.28);
  });
});

describe('threat and battery', () => {
  it('maps all threat bands', () => {
    expect(threatLevel(0)).toBe('SAFE');
    expect(threatLevel(25)).toBe('WATCHED');
    expect(threatLevel(50)).toBe('APPROACHING');
    expect(threatLevel(70)).toBe('INSIDE');
    expect(threatLevel(90)).toBe('CRITICAL');
    expect(threatLevel(100)).toBe('CAPTURE');
  });

  it('a connected call slows the threat and a shield reduces it further', () => {
    const a = new GameState();
    const b = new GameState();
    const ts = new ThreatSystem();
    a.phase = b.phase = 'playing';
    ts.update(10, a, false);
    ts.update(10, b, true);
    expect(b.threat).toBeLessThan(a.threat);
    ts.shield(b, 10);
    const before = b.threat;
    ts.update(5, b, false);
    expect(b.threat).toBeLessThan(before + 1);
  });

  it('battery drains faster during a call and can be recharged', () => {
    const s = new GameState();
    const bs = new BatterySystem();
    s.phase = 'playing';
    bs.update(10, s, false, false);
    const idle = 100 - s.battery;
    s.battery = 100;
    bs.update(10, s, true, true);
    expect(100 - s.battery).toBeGreaterThan(idle * 3);
    bs.charge(s, 3);
    expect(s.battery).toBeGreaterThan(0);
    expect(bs.usePowerBank(s)).toBe(true);
    expect(bs.usePowerBank(s)).toBe(false);
  });
});

describe('story resolution', () => {
  const base = () => {
    const s = new GameState();
    s.phase = 'playing';
    return s;
  };

  it('reaches all six endings', () => {
    const secret = base();
    secret.reveal('garden_mimic'); secret.addFlag('truth_seeker'); secret.callCounts.unknown = 1;
    expect(StorySystem.resolveEnding(secret)).toBe('secret');

    const truth = base();
    truth.reveal('journal');
    expect(StorySystem.resolveEnding(truth)).toBe('the-truth');

    const everyone = base();
    CONTACTS.forEach((c) => { everyone.callCounts[c.id] = 1; });
    expect(StorySystem.resolveEnding(everyone)).toBe('everyone-is-safe');

    const trueSurvival = base();
    trueSurvival.relationships.sophie = 4;
    trueSurvival.relationships.mom = 4;
    ['family_secret', 'detection', 'shadow_lore', 'garden_tracks'].forEach((r) => trueSurvival.reveal(r));
    expect(StorySystem.resolveEnding(trueSurvival)).toBe('true-survival');

    const alone = base();
    expect(StorySystem.resolveEnding(alone)).toBe('escape-alone');
    expect(StorySystem.resolveEnding(base())).not.toBe('shadows-win');
  });
});

describe('data integrity', () => {
  it('every dialogue target exists', () => {
    for (const [id, node] of Object.entries(DIALOGUE)) {
      expect(node.choices.length, `node ${id} has no choices`).toBeGreaterThan(0);
      for (const c of node.choices) {
        if (c.next) expect(DIALOGUE[c.next], `${id} -> ${c.next}`).toBeDefined();
      }
      if (node.timeout !== undefined) expect(node.choices[node.timeoutChoice ?? 0]).toBeDefined();
    }
    CONTACTS.forEach((c) => expect(DIALOGUE[c.startNode], c.id).toBeDefined());
  });

  it('events are eligible by chapter', () => {
    expect(pickEvent(1, [], () => 0)).not.toBeNull();
    expect(pickEvent(1, EVENTS.map((e) => e.id))).toBeNull();
    expect(EVENTS.some((e) => e.minChapter > 1)).toBe(true);
  });
});

describe('navigation', () => {
  it('finds a route through the house', () => {
    const nodes = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 0, 0)];
    const nav = new NavigationSystem(nodes, [[1], [0, 2], [1]]);
    expect(nav.route(0, 2)).toEqual([0, 1, 2]);
    expect(nav.nearest(new THREE.Vector3(1.9, 0, 0))).toBe(2);
  });
});

describe('city zones', () => {
  it('has ten unique, connected areas', () => {
    expect(ZONES.length).toBe(15);
    expect(new Set(ZONES.map((z) => z.id)).size).toBe(15);
    const seen = new Set(['home']);
    const queue = ['home'];
    while (queue.length) {
      const id = queue.shift()!;
      for (const e of ZONE_BY_ID[id].exits) {
        expect(ZONE_BY_ID[e.target], `${id} -> ${e.target}`).toBeDefined();
        if (!seen.has(e.target)) { seen.add(e.target); queue.push(e.target); }
      }
    }
    expect(seen.size).toBe(ZONES.length);
  });

  it('has valid spawn points and safe areas', () => {
    ZONES.forEach((z) => {
      const [minX, minZ, maxX, maxZ] = z.bounds;
      expect(z.spawn[0]).toBeGreaterThan(minX);
      expect(z.spawn[0]).toBeLessThan(maxX);
      expect(z.spawn[1]).toBeGreaterThan(minZ);
      expect(z.spawn[1]).toBeLessThan(maxZ);
    });
    expect(ZONE_BY_ID.bar.safe).toBe(true);
    expect(ZONE_BY_ID.home.exits[0].target).toBe('street');
    expect(TAXI_COST).toBeGreaterThan(0);
    expect(TAXI_SECONDS).toBeGreaterThan(0);
    expect(taxiCost('home', 'street')).toBeLessThanOrEqual(18);
    expect(taxiCost('home', 'campus')).toBeGreaterThanOrEqual(taxiCost('home', 'street'));
  });

  it('persists zone, visited places and per-zone positions', () => {
    const s = new GameState();
    s.zone = 'park';
    s.visited.add('park');
    s.zonePositions.home = [0, 1.62, 1];
    s.zonePositions.park = [3, 1.62, -2];
    const restored = new GameState();
    restored.restore(s.snapshot());
    expect(restored.zone).toBe('park');
    expect(restored.visited.has('park')).toBe(true);
    expect(restored.zonePositions.park).toEqual([3, 1.62, -2]);
  });

  it('reaches the two new exploration endings', () => {
    const visited = new GameState();
    ZONES.forEach((z) => visited.visited.add(z.id));
    for (let i = 0; i < 8; i++) visited.reveal('clue_' + i);
    visited.relationships.sophie = 3;
    visited.relationships.mom = 3;
    expect(StorySystem.resolveEnding(visited)).toBe('city-remembers');

    const crowd = new GameState();
    for (let i = 0; i < 5; i++) crowd.visited.add(ZONES[i].id);
    expect(StorySystem.resolveEnding(crowd)).toBe('alone-in-the-crowd');
  });
});
