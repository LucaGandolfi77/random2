import { describe, expect, it } from 'vitest';
import { PLAYABLE_FIGHTERS, ROSTER, isPlayable } from '../src/fighters/roster';
import { PLAYABLE_STAGES, STAGES } from '../src/stages/stageData';
import { ITEM_KINDS } from '../src/items/itemData';
import { decodeInput, encodeInput, InputHistoryBuffer, PROTOCOL_VERSION } from '../src/network/protocol';
import type { MoveSlot } from '../src/fighters/types';
import { createSim, input, placeOnGround, step } from './helpers';

const REQUIRED_SLOTS: MoveSlot[] = [
  'jab',
  'sideTilt',
  'upTilt',
  'downTilt',
  'sideStrong',
  'upStrong',
  'downStrong',
  'neutralAir',
  'forwardAir',
  'backAir',
  'upAir',
  'downAir',
  'neutralSpecial',
  'sideSpecial',
  'upSpecial',
  'downSpecial',
  'grab',
  'throwForward',
  'throwBack',
  'throwUp',
  'throwDown',
  'taunt',
];

describe('data-driven content', () => {
  it('ships a 16-entry roster with four complete fighters', () => {
    expect(ROSTER).toHaveLength(16);
    expect(PLAYABLE_FIGHTERS).toHaveLength(4);
    expect(ROSTER.filter(isPlayable)).toHaveLength(4);
    for (const locked of ROSTER.filter((entry) => !isPlayable(entry))) {
      expect(locked.playable).toBe(false);
      expect(locked.name.length).toBeGreaterThan(2);
    }
  });

  it('gives every playable fighter every required move with frame data', () => {
    for (const fighter of PLAYABLE_FIGHTERS) {
      expect(fighter.palettes.length).toBeGreaterThanOrEqual(4);
      expect(fighter.stats.weight).toBeGreaterThan(0);
      expect(fighter.stats.jumpVelocity).toBeGreaterThan(0);
      for (const slot of REQUIRED_SLOTS) {
        const move = fighter.moves[slot];
        expect(move, `${fighter.id}.${slot}`).toBeDefined();
        expect(move.totalFrames).toBeGreaterThan(0);
        if (slot === 'grab') {
          expect(move.grabbox).toBeDefined();
        } else if (slot.startsWith('throw')) {
          expect(move.throwHit).toBeDefined();
        } else if (slot !== 'taunt') {
          const hasHits = move.hits.length > 0;
          const hasProjectile = (move.projectiles?.length ?? 0) > 0;
          const isUtility =
            Boolean(move.selfBuff) ||
            Boolean(move.impulses?.length) ||
            Boolean(move.intangibility);
          expect(hasHits || hasProjectile || isUtility, `${fighter.id}.${slot} must hit, fire, or grant a utility effect`).toBe(true);
          for (const hitbox of move.hits) {
            expect(hitbox.end).toBeGreaterThanOrEqual(hitbox.start);
            expect(hitbox.radius).toBeGreaterThan(0);
            expect(hitbox.damage).toBeGreaterThan(0);
          }
        }
      }
      expect(fighter.moves.sideStrong.chargeable).toBe(true);
      expect(fighter.moves.upStrong.chargeable).toBe(true);
      expect(fighter.moves.downStrong.chargeable).toBe(true);
      expect(fighter.moveHighlights.length).toBe(4);
    }
  });

  it('ships three playable stages and five scaffolded stages', () => {
    expect(STAGES).toHaveLength(8);
    expect(PLAYABLE_STAGES).toHaveLength(3);
    for (const stage of PLAYABLE_STAGES) {
      expect(stage.platforms.length).toBeGreaterThanOrEqual(4);
      expect(stage.spawns.length).toBeGreaterThanOrEqual(4);
      expect(stage.blastZones.left).toBeLessThan(stage.blastZones.right);
      expect(stage.blastZones.bottom).toBeLessThan(stage.blastZones.top);
      expect(stage.music).toMatch(/festival|metro|club/);
      for (const spawn of stage.spawns) {
        expect(spawn.x).toBeGreaterThan(stage.blastZones.left);
        expect(spawn.x).toBeLessThan(stage.blastZones.right);
      }
    }
  });

  it('defines all eight original items', () => {
    expect(ITEM_KINDS).toHaveLength(8);
    expect(new Set(ITEM_KINDS).size).toBe(8);
  });

  it('strong attacks charge and release into a stronger hit', () => {
    const sim = createSim();
    const p1 = placeOnGround(sim, 0, -1, 1);
    const p2 = placeOnGround(sim, 1, 0.7, -1);
    for (let i = 0; i < 30; i++) sim.step({ 0: input({ strong: true }) });
    expect(p1.charging).not.toBeNull();
    sim.step({ 0: input({ strong: false }) });
    step(sim, 20, {});
    expect(p1.charging).toBeNull();
    expect(p2.damage).toBeGreaterThan(0);
  });
});

describe('network protocol scaffolding', () => {
  it('serializes and deserializes frame inputs', () => {
    const frame = input({ moveX: -0.5, moveY: 1, jump: true, attack: true, shield: true, taunt: true });
    const decoded = decodeInput(encodeInput(frame));
    expect(decoded.jump).toBe(true);
    expect(decoded.attack).toBe(true);
    expect(decoded.shield).toBe(true);
    expect(decoded.taunt).toBe(true);
    expect(decoded.moveX).toBeCloseTo(-0.5, 2);
    expect(decoded.moveY).toBeCloseTo(1, 2);
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
  });

  it('stores a bounded input history for rollback replay', () => {
    const history = new InputHistoryBuffer(3);
    for (let frame = 0; frame < 5; frame++) {
      history.set(frame, 0, input({ moveX: frame % 2 === 0 ? 1 : -1 }));
    }
    expect(history.has(0)).toBe(false);
    expect(history.has(0)).toBe(false);
    expect(history.earliest).toBe(2);
    expect(history.latest).toBe(4);
    expect(history.get(4)?.[0]?.moveX).toBe(1);
  });
});
