import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conversationFor } from '../src/data/dialogue';
import { QUESTS, QUEST_ORDER } from '../src/data/quests';
import { UI } from '../src/data/strings';
import type { DialogueContext, NpcId } from '../src/data/types';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const baseContext: DialogueContext = {
  quests: {
    bread: 'available',
    letters: 'available',
    flowers: 'available',
    newspaper: 'available',
    book: 'available',
    coffee: 'available',
    bell: 'locked'
  },
  letters: 0,
  flowers: 0,
  tiles: 0,
  rank: 0,
  finaleSeen: false
};

const readyContext: DialogueContext = {
  quests: {
    bread: 'done',
    letters: 'objective',
    flowers: 'objective',
    newspaper: 'available',
    book: 'available',
    coffee: 'available',
    bell: 'available'
  },
  letters: 3,
  flowers: 5,
  tiles: 7,
  rank: 2,
  finaleSeen: false
};

describe('UI strings', () => {
  it('has both languages for every key', () => {
    for (const [key, value] of Object.entries(UI)) {
      expect(value.it.trim().length, `${key}.it`).toBeGreaterThan(0);
      expect(value.en.trim().length, `${key}.en`).toBeGreaterThan(0);
    }
  });

  it('covers every key used by the markup', () => {
    const keys = new Set<string>();
    for (const match of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) keys.add(match[1]);
    expect(keys.size).toBeGreaterThan(25);
    for (const key of keys) expect(UI, `missing UI.${key}`).toHaveProperty(key);
  });

  it('references no missing quest metadata', () => {
    expect(QUEST_ORDER).toHaveLength(7);
    for (const id of QUEST_ORDER) {
      expect(QUESTS[id].name.it.length).toBeGreaterThan(0);
      expect(QUESTS[id].name.en.length).toBeGreaterThan(0);
      expect(QUESTS[id].description.it.length).toBeGreaterThan(0);
      expect(QUESTS[id].description.en.length).toBeGreaterThan(0);
    }
  });
});

describe('dialogue', () => {
  const npcs: NpcId[] = ['ada', 'elio', 'marta', 'nino', 'beppe', 'lidia', 'sara'];

  it('always returns a line in both languages', () => {
    for (const npc of npcs) {
      for (const ctx of [baseContext, readyContext]) {
        const conversation = conversationFor(npc, ctx);
        expect(conversation.lines.length, npc).toBeGreaterThan(0);
        for (const line of conversation.lines) {
          expect(line.it.trim().length).toBeGreaterThan(0);
          expect(line.en.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('offers acceptance only when the errand is available', () => {
    const ada = conversationFor('ada', baseContext);
    expect(ada.choices?.map((c) => c.action)).toContain('accept-bread');
    const adaActive = conversationFor('ada', {
      ...baseContext,
      quests: { ...baseContext.quests, bread: 'active' }
    });
    expect(adaActive.choices).toBeUndefined();
  });

  it('offers the three optional errands', () => {
    expect(conversationFor('beppe', baseContext).choices?.map((c) => c.action)).toContain(
      'accept-newspaper'
    );
    expect(conversationFor('lidia', baseContext).choices?.map((c) => c.action)).toContain(
      'accept-book'
    );
    expect(conversationFor('sara', baseContext).choices?.map((c) => c.action)).toContain(
      'accept-coffee'
    );
  });

  it('asks for the hand-over when an errand is ready', () => {
    expect(conversationFor('elio', readyContext).choices?.map((c) => c.action)).toContain(
      'complete-letters'
    );
    expect(conversationFor('marta', readyContext).choices?.map((c) => c.action)).toContain(
      'complete-flowers'
    );
  });

  it('explains the bell prerequisite before the town is ready', () => {
    const nino = conversationFor('nino', baseContext);
    expect(nino.choices).toBeUndefined();
    expect(nino.lines[0].it).toContain('campana');
    const ready = conversationFor('nino', readyContext);
    expect(ready.choices?.map((c) => c.action)).toContain('accept-bell');
  });
});
