import { describe, expect, it } from 'vitest';
import {
  acceptBell,
  acceptQuest,
  activeQuest,
  collectFlower,
  collectLetter,
  collectTile,
  createInitialState,
  deliverBread,
  hospitality,
  rankIndex,
  refreshUnlocks,
  returnFlowers,
  returnLetters,
  ringBell
} from '../src/game/state';
import { FLOWERS, LETTERS, TILES } from '../src/data/town';

describe('quest flow', () => {
  it('starts with three errands and a locked bell', () => {
    const state = createInitialState();
    expect(state.quests.bread).toBe('available');
    expect(state.quests.letters).toBe('available');
    expect(state.quests.flowers).toBe('available');
    expect(state.quests.bell).toBe('locked');
    expect(state.flags.dusk).toBe(false);
  });

  it('accepts a quest only once', () => {
    const state = createInitialState();
    expect(acceptQuest(state, 'bread')).toBe(true);
    expect(acceptQuest(state, 'bread')).toBe(false);
    expect(state.quests.bread).toBe('active');
  });

  it('does not deliver bread before accepting the errand', () => {
    const state = createInitialState();
    expect(deliverBread(state)).toBe(false);
    acceptQuest(state, 'bread');
    expect(deliverBread(state)).toBe(true);
    expect(state.quests.bread).toBe('done');
    expect(deliverBread(state)).toBe(false);
  });

  it('collects each letter once and asks for the hand-over at three', () => {
    const state = createInitialState();
    expect(collectLetter(state, LETTERS[0].id)).toBe(false);
    acceptQuest(state, 'letters');
    expect(collectLetter(state, LETTERS[0].id)).toBe(true);
    expect(collectLetter(state, LETTERS[0].id)).toBe(false);
    expect(collectLetter(state, 'not-a-letter')).toBe(false);
    expect(collectLetter(state, LETTERS[1].id)).toBe(true);
    expect(state.quests.letters).toBe('active');
    expect(collectLetter(state, LETTERS[2].id)).toBe(true);
    expect(state.letters).toHaveLength(3);
    expect(state.quests.letters).toBe('objective');
    expect(returnLetters(state)).toBe(true);
    expect(state.quests.letters).toBe('done');
  });

  it('collects exactly five flowers', () => {
    const state = createInitialState();
    acceptQuest(state, 'flowers');
    for (const flower of FLOWERS) expect(collectFlower(state, flower.id)).toBe(true);
    expect(state.flowers).toHaveLength(5);
    expect(state.quests.flowers).toBe('objective');
    expect(collectFlower(state, FLOWERS[0].id)).toBe(false);
    expect(returnFlowers(state)).toBe(true);
    expect(state.quests.flowers).toBe('done');
  });

  it('unlocks the bell only when the three errands are done', () => {
    const state = createInitialState();
    acceptQuest(state, 'bread');
    deliverBread(state);
    acceptQuest(state, 'letters');
    for (const letter of LETTERS) collectLetter(state, letter.id);
    returnLetters(state);
    expect(state.quests.bell).toBe('locked');
    expect(state.flags.dusk).toBe(false);

    acceptQuest(state, 'flowers');
    for (const flower of FLOWERS) collectFlower(state, flower.id);
    returnFlowers(state);

    expect(state.quests.bell).toBe('available');
    expect(state.flags.dusk).toBe(true);
    expect(acceptBell(state)).toBe(true);
    expect(state.quests.bell).toBe('active');
    expect(ringBell(state)).toBe(true);
    expect(state.quests.bell).toBe('done');
    expect(state.flags.finaleSeen).toBe(true);
    expect(ringBell(state)).toBe(false);
  });

  it('does not let the bell be accepted early', () => {
    const state = createInitialState();
    expect(acceptBell(state)).toBe(false);
    state.quests.bell = 'available';
    expect(acceptBell(state)).toBe(true);
  });

  it('re-locks the town when an errand is not actually done', () => {
    const state = createInitialState();
    state.quests.bread = 'done';
    state.quests.letters = 'done';
    state.quests.flowers = 'done';
    state.quests.bell = 'available';
    refreshUnlocks(state);
    expect(state.flags.dusk).toBe(true);
    state.quests.flowers = 'active';
    refreshUnlocks(state);
    expect(state.flags.dusk).toBe(false);
  });
});

describe('progression', () => {
  it('derives hospitality from errands and mosaic tiles', () => {
    const state = createInitialState();
    expect(hospitality(state)).toBe(0);
    expect(rankIndex(state)).toBe(0);
    state.quests.bread = 'done';
    expect(hospitality(state)).toBe(2);
    for (const tile of TILES) collectTile(state, tile.id);
    expect(hospitality(state)).toBe(8);
    expect(rankIndex(state)).toBe(2);
    state.quests.letters = 'done';
    state.quests.flowers = 'done';
    state.flags.dusk = true;
    state.quests.bell = 'done';
    expect(hospitality(state)).toBe(14);
    expect(rankIndex(state)).toBe(3);
  });

  it('ignores duplicate and unknown mosaic tiles', () => {
    const state = createInitialState();
    expect(collectTile(state, TILES[0].id)).toBe(true);
    expect(collectTile(state, TILES[0].id)).toBe(false);
    expect(collectTile(state, 'tile-unknown')).toBe(false);
    expect(state.tiles).toHaveLength(1);
  });

  it('reports the hand-over errand before an ordinary one', () => {
    const state = createInitialState();
    acceptQuest(state, 'bread');
    acceptQuest(state, 'letters');
    state.quests.letters = 'objective';
    expect(activeQuest(state)).toBe('letters');
  });
});
