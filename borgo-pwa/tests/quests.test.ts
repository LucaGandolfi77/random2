import { describe, expect, it } from 'vitest';
import {
  acceptBell,
  acceptQuest,
  activeQuest,
  collectFlower,
  collectLetter,
  collectTile,
  completeDelivery,
  createInitialState,
  hospitality,
  rankIndex,
  refreshUnlocks,
  returnFlowers,
  returnLetters,
  ringBell
} from '../src/game/state';
import { DISCOVERIES, FLOWERS, LETTERS, TILES } from '../src/data/town';

describe('Fidenza quest flow', () => {
  it('starts with six errands and a locked bell', () => {
    const state = createInitialState();
    expect(state.quests.bread).toBe('available');
    expect(state.quests.letters).toBe('available');
    expect(state.quests.flowers).toBe('available');
    expect(state.quests.newspaper).toBe('available');
    expect(state.quests.book).toBe('available');
    expect(state.quests.coffee).toBe('available');
    expect(state.quests.bell).toBe('locked');
    expect(state.flags.dusk).toBe(false);
    expect(state.festival.phase).toBe('locked');
  });

  it('accepts a quest only once', () => {
    const state = createInitialState();
    expect(acceptQuest(state, 'newspaper')).toBe(true);
    expect(acceptQuest(state, 'newspaper')).toBe(false);
    expect(state.quests.newspaper).toBe('active');
  });

  it('completes a delivery only while active', () => {
    const state = createInitialState();
    expect(completeDelivery(state, 'coffee')).toBe(false);
    acceptQuest(state, 'coffee');
    expect(completeDelivery(state, 'coffee')).toBe(true);
    expect(state.quests.coffee).toBe('done');
    expect(completeDelivery(state, 'coffee')).toBe(false);
    expect(completeDelivery(state, 'letters')).toBe(false);
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
    expect(state.quests.letters).toBe('objective');
    expect(returnLetters(state)).toBe(true);
    expect(state.quests.letters).toBe('done');
  });

  it('collects exactly five flowers', () => {
    const state = createInitialState();
    acceptQuest(state, 'flowers');
    for (const flower of FLOWERS) expect(collectFlower(state, flower.id)).toBe(true);
    expect(state.quests.flowers).toBe('objective');
    expect(collectFlower(state, FLOWERS[0].id)).toBe(false);
    expect(returnFlowers(state)).toBe(true);
    expect(state.quests.flowers).toBe('done');
  });

  it('unlocks the bell after the three core errands, not the optional ones', () => {
    const state = createInitialState();
    acceptQuest(state, 'bread');
    completeDelivery(state, 'bread');
    acceptQuest(state, 'letters');
    for (const letter of LETTERS) collectLetter(state, letter.id);
    returnLetters(state);
    acceptQuest(state, 'book');
    completeDelivery(state, 'book');
    expect(state.quests.bell).toBe('locked');
    expect(state.flags.dusk).toBe(false);
    expect(state.festival.phase).toBe('locked');

    acceptQuest(state, 'flowers');
    for (const flower of FLOWERS) collectFlower(state, flower.id);
    returnFlowers(state);

    expect(state.quests.bell).toBe('available');
    expect(state.flags.dusk).toBe(true);
    expect(acceptBell(state)).toBe(true);
    expect(ringBell(state)).toBe(true);
    expect(state.quests.bell).toBe('done');
    expect(state.flags.finaleSeen).toBe(true);
    expect(state.festival.phase).toBe('ready');
    expect(ringBell(state)).toBe(false);
  });

  it('does not let the bell be accepted early', () => {
    const state = createInitialState();
    expect(acceptBell(state)).toBe(false);
    state.quests.bell = 'available';
    expect(acceptBell(state)).toBe(true);
  });

  it('re-locks the town when a core errand is not done', () => {
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
    expect(state.quests.bell).toBe('locked');
  });
});

describe('progression', () => {
  it('derives hospitality from every errand and all twelve tiles', () => {
    const state = createInitialState();
    expect(hospitality(state)).toBe(0);
    expect(rankIndex(state)).toBe(0);

    state.quests.bread = 'done';
    expect(hospitality(state)).toBe(2);
    for (const tile of TILES.slice(0, 4)) collectTile(state, tile.id);
    expect(hospitality(state)).toBe(6);
    expect(rankIndex(state)).toBe(1);

    for (const tile of TILES.slice(4, 8)) collectTile(state, tile.id);
    expect(rankIndex(state)).toBe(1);
    state.quests.letters = 'done';
    expect(rankIndex(state)).toBe(2);

    for (const id of ['letters', 'flowers', 'newspaper', 'book', 'coffee', 'bell'] as const) {
      state.quests[id] = 'done';
    }
    for (const tile of TILES.slice(8)) collectTile(state, tile.id);
    expect(hospitality(state)).toBe(26);
    expect(rankIndex(state)).toBe(3);
  });

  it('ignores duplicate and unknown mosaic tiles', () => {
    const state = createInitialState();
    expect(collectTile(state, TILES[0].id)).toBe(true);
    expect(collectTile(state, TILES[0].id)).toBe(false);
    expect(collectTile(state, 'tile-unknown')).toBe(false);
    expect(state.tiles).toHaveLength(1);
  });

  it('records discovered places once', () => {
    const state = createInitialState();
    expect(state.discovered).toEqual([]);
    expect(DISCOVERIES.length).toBe(50);
  });

  it('reports the hand-over errand before an ordinary one', () => {
    const state = createInitialState();
    acceptQuest(state, 'bread');
    acceptQuest(state, 'letters');
    state.quests.letters = 'objective';
    expect(activeQuest(state)).toBe('letters');
  });
});
