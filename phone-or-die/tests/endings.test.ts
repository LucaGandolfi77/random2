import { describe, expect, it } from 'vitest';
import { resolveEnding } from '@/data/endings';
import { makeGame, answerAllContacts } from './support';

describe('ending resolver', () => {
  it('always yields shadows_win at one hundred threat', () => {
    const game = answerAllContacts(makeGame({ threat: 100 }), 8);
    expect(resolveEnding({ game, finalChoice: 'warn' })).toBe('shadows_win');
  });

  it('returns the escape ending when the player runs', () => {
    const game = answerAllContacts(makeGame(), 8);
    expect(resolveEnding({ game, finalChoice: 'run' })).toBe('escape_alone');
  });

  it('returns escape_alone when almost nobody answered', () => {
    const game = makeGame();
    expect(resolveEnding({ game, finalChoice: null })).toBe('escape_alone');
  });

  it('returns true survival with an ordinary but connected night', () => {
    const game = answerAllContacts(makeGame(), 4);
    expect(resolveEnding({ game, finalChoice: 'barricade' })).toBe('true_survival');
  });

  it('returns everyone_safe for a well-connected warning finale', () => {
    const game = answerAllContacts(makeGame({ threat: 40 }), 6, 7);
    game.stats.contactsWarned = 6;
    expect(resolveEnding({ game, finalChoice: 'warn' })).toBe('everyone_safe');
  });

  it('does not award everyone_safe below the trust threshold', () => {
    const game = answerAllContacts(makeGame({ threat: 40 }), 6, 3);
    game.stats.contactsWarned = 6;
    expect(resolveEnding({ game, finalChoice: 'warn' })).not.toBe('everyone_safe');
  });

  it('returns the truth ending when the unknown caller and the weakness are known', () => {
    const game = answerAllContacts(makeGame(), 4);
    game.clues = ['a', 'b', 'c', 'd', 'e', 'f'];
    game.flags.unknown_truth = true;
    game.flags.knows_weakness = true;
    expect(resolveEnding({ game, finalChoice: 'confront' })).toBe('the_truth');
  });

  it('returns the secret ending only with all three secret requirements', () => {
    const game = answerAllContacts(makeGame(), 4);
    game.flags.unknown_spoke = true;
    game.flags.jessica_truth = true;
    game.flags.unknown_invitation = true;
    expect(resolveEnding({ game, finalChoice: 'accept' })).toBe('secret');

    const missing = answerAllContacts(makeGame(), 4);
    missing.flags.unknown_spoke = true;
    missing.flags.jessica_truth = true;
    missing.clues = ['a', 'b', 'c', 'd', 'e', 'f'];
    missing.flags.unknown_truth = true;
    missing.flags.knows_weakness = true;
    expect(resolveEnding({ game: missing, finalChoice: 'accept' })).toBe('the_truth');
  });

  it('keeps an explicit ending id', () => {
    const game = makeGame({ endingId: 'everyone_safe' });
    expect(resolveEnding({ game, finalChoice: null })).toBe('everyone_safe');
  });
});
