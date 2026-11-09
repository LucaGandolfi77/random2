import { describe, expect, it } from 'vitest';
import { makeGame } from './support';
import {
  difficultyThreatFactor,
  shadowStepsBehind,
  stageForThreat,
  stepThreatFor,
  tickThreat,
  threatRisePerSecond
} from '@/systems/threat';
import {
  chapterForNightMinute,
  formatNightTime,
  minutesPerSecond,
  timeUntilDawn
} from '@/systems/clock';
import { answerChance, contactIsInWindow, protectionFromCall, makeContactState } from '@/systems/calls';
import { contactById } from '@/data/contacts';
import { finalChoiceById } from '@/data/final';

describe('threat system', () => {
  it('maps threat thresholds to stages', () => {
    expect(stageForThreat(0)).toBe(0);
    expect(stageForThreat(19.9)).toBe(0);
    expect(stageForThreat(20)).toBe(1);
    expect(stageForThreat(39.9)).toBe(1);
    expect(stageForThreat(40)).toBe(2);
    expect(stageForThreat(60)).toBe(3);
    expect(stageForThreat(99.9)).toBe(3);
    expect(stageForThreat(100)).toBe(4);
  });

  it('rises without a connection and falls while connected', () => {
    const idle = makeGame({ threat: 30, shieldSeconds: 0 });
    const rising = tickThreat(idle, 10, false);
    expect(rising.threat).toBeGreaterThan(30);
    expect(rising.captured).toBe(false);

    const connected = makeGame({ threat: 30, shieldSeconds: 0 });
    const falling = tickThreat(connected, 4, true);
    expect(falling.threat).toBeLessThan(30);
    expect(falling.shieldSeconds).toBeGreaterThanOrEqual(6);
  });

  it('charges fear for every footstep and lightens the cost under a lamp', () => {
    const dark = makeGame({ player: { x: 11, y: 25, zone: 'work' } });
    const lit = makeGame({ player: { x: 7, y: 28, zone: 'work' } });
    const story = makeGame({ difficulty: 'story', player: { x: 11, y: 25, zone: 'work' } });
    const nightmare = makeGame({ difficulty: 'nightmare', player: { x: 11, y: 25, zone: 'work' } });
    expect(stepThreatFor(lit)).toBeLessThan(stepThreatFor(dark));
    expect(stepThreatFor(story)).toBeLessThan(stepThreatFor(dark));
    expect(stepThreatFor(nightmare)).toBeGreaterThan(stepThreatFor(dark));
    expect(shadowStepsBehind(makeGame({ threat: 70 }))).toBeLessThan(shadowStepsBehind(makeGame({ threat: 20 })));
  });

  it('escalates when Emma stands still for too long', () => {
    const still = makeGame({ idleSeconds: 0, shieldSeconds: 0, player: { x: 11, y: 25, zone: 'work' } });
    const waiting = makeGame({ idleSeconds: 13, shieldSeconds: 0, player: { x: 11, y: 25, zone: 'work' } });
    expect(threatRisePerSecond(waiting)).toBeGreaterThan(threatRisePerSecond(still));
  });

  it('uses a shield before threat can rise, then resumes rising', () => {
    const shielded = makeGame({ threat: 30, shieldSeconds: 5 });
    const first = tickThreat(shielded, 3, false);
    expect(first.threat).toBeLessThan(30);
    expect(first.shieldSeconds).toBeCloseTo(2, 5);
    const later = tickThreat({ ...shielded, threat: first.threat, shieldSeconds: first.shieldSeconds }, 8, false);
    expect(later.threat).toBeGreaterThan(first.threat);
  });

  it('captures at one hundred threat', () => {
    const doomed = makeGame({ threat: 99.9, shieldSeconds: 0 });
    const result = tickThreat(doomed, 5, false);
    expect(result.captured).toBe(true);
    expect(result.threat).toBe(100);
    expect(result.stage).toBe(4);
  });

  it('scales difficulty and rewards barricades', () => {
    expect(difficultyThreatFactor('nightmare')).toBeGreaterThan(difficultyThreatFactor('normal'));
    expect(difficultyThreatFactor('story')).toBeLessThan(difficultyThreatFactor('normal'));
    const bare = makeGame({ barricades: { front: false, back: false, windows: false } });
    const secure = makeGame({ barricades: { front: true, back: true, windows: true } });
    expect(threatRisePerSecond(secure)).toBeLessThan(threatRisePerSecond(bare));
    const dark = makeGame({ powerOn: false });
    expect(threatRisePerSecond(dark)).toBeGreaterThan(threatRisePerSecond(makeGame()));
    const lit = makeGame({ player: { x: 7, y: 28, zone: 'work' } });
    const unlit = makeGame({ player: { x: 11, y: 25, zone: 'work' } });
    expect(threatRisePerSecond(lit)).toBeLessThan(threatRisePerSecond(unlit));
  });
});

describe('clock and chapters', () => {
  it('formats the night clock across midnight', () => {
    expect(formatNightTime(0)).toBe('10:00 PM');
    expect(formatNightTime(60)).toBe('11:00 PM');
    expect(formatNightTime(120)).toBe('12:00 AM');
    expect(formatNightTime(240)).toBe('2:00 AM');
    expect(formatNightTime(450)).toBe('5:30 AM');
    expect(formatNightTime(480)).toBe('6:00 AM');
  });

  it('maps minutes to chapters', () => {
    expect(chapterForNightMinute(0)).toBe(0);
    expect(chapterForNightMinute(59)).toBe(0);
    expect(chapterForNightMinute(60)).toBe(1);
    expect(chapterForNightMinute(120)).toBe(2);
    expect(chapterForNightMinute(240)).toBe(3);
    expect(chapterForNightMinute(360)).toBe(4);
    expect(chapterForNightMinute(450)).toBe(5);
    expect(chapterForNightMinute(480)).toBe(5);
  });

  it('has a sane total session length and countdown', () => {
    expect(minutesPerSecond('nightmare')).toBeGreaterThan(minutesPerSecond('normal'));
    expect(minutesPerSecond('story')).toBeLessThan(minutesPerSecond('normal'));
    expect(timeUntilDawn(0)).toBe('8h 0m');
    expect(timeUntilDawn(480)).toBe('0h 0m');
  });
});

describe('call availability', () => {
  it('reports windows and answer chances', () => {
    const sophie = contactById.sophie;
    const state = makeContactState(sophie.trustStart, true);
    expect(contactIsInWindow(sophie, 0)).toBe(true);
    expect(contactIsInWindow(sophie, 480)).toBe(true);
    expect(answerChance(sophie, state, 'normal', 0)).toBeGreaterThan(0.7);
    const exhausted = makeContactState(sophie.trustStart, true);
    exhausted.callCount = 10;
    exhausted.lastCallNight = 0;
    expect(answerChance(sophie, exhausted, 'nightmare', 2)).toBeLessThan(
      answerChance(sophie, state, 'normal', 0)
    );
  });

  it('has diminishing protection for repeat calls', () => {
    const contact = contactById.mom;
    const fresh = makeContactState(contact.trustStart, true);
    const freshProtection = protectionFromCall(contact, fresh, makeGame());
    const repeat = { ...fresh, answered: 5, lastCallNight: 0 };
    const repeatProtection = protectionFromCall(contact, repeat, makeGame({ nightMinute: 5 }));
    expect(repeatProtection.threatRelief).toBeLessThan(freshProtection.threatRelief);
    expect(repeatProtection.shieldSeconds).toBeLessThan(freshProtection.shieldSeconds);
  });
});

describe('final choices', () => {
  it('defines five final choices with distinct effects', () => {
    expect(Object.keys(finalChoiceById).sort()).toEqual(['accept', 'barricade', 'confront', 'run', 'warn']);
    for (const choice of Object.values(finalChoiceById)) {
      expect(choice.effects.minutes).toBeGreaterThan(0);
      expect(choice.effects.shield).toBeGreaterThan(0);
      expect(choice.effects.flags.length).toBeGreaterThan(0);
    }
  });
});
