import { describe, expect, it } from 'vitest';
import { contacts, contactById } from '@/data/contacts';
import { calls } from '@/data/calls';
import { events } from '@/data/events';
import { messages } from '@/data/messages';
import { endings } from '@/data/endings';
import { finalChoices } from '@/data/final';
import {
  CITY_HEIGHT,
  CITY_WIDTH,
  cityRows,
  interactables,
  isWalkableTile,
  zones,
  HOME_DOOR,
  START_POSITION
} from '@/data/road';
import { CONTACT_ORDER } from '@/core/types';

describe('content integrity', () => {
  it('has nine unique contacts including the unknown caller', () => {
    expect(contacts).toHaveLength(9);
    expect(new Set(contacts.map((contact) => contact.id)).size).toBe(9);
    expect(contactById.unknown.name).toBe('UNKNOWN NUMBER');
    expect(CONTACT_ORDER.every((id) => Boolean(contactById[id]))).toBe(true);
  });

  it('has at least eight answerable contacts with valid call windows', () => {
    const answerable = contacts.filter((contact) => !contact.unknown);
    expect(answerable.length).toBeGreaterThanOrEqual(8);
    for (const contact of contacts) {
      expect(contact.windows.length).toBeGreaterThan(0);
      for (const window of contact.windows) {
        expect(window.from).toBeGreaterThanOrEqual(0);
        expect(window.to).toBeLessThanOrEqual(480);
        expect(window.from).toBeLessThan(window.to);
      }
    }
  });

  it('validates every call node, choice and next pointer', () => {
    expect(calls.length).toBeGreaterThanOrEqual(20);
    for (const call of calls) {
      expect(contactById[call.contactId]).toBeTruthy();
      expect(call.nodes[call.start], `${call.id} start node`).toBeTruthy();
      for (const [nodeId, node] of Object.entries(call.nodes)) {
        if (node.next) {
          expect(call.nodes[node.next], `${call.id}/${nodeId} next`).toBeTruthy();
        }
        for (const choice of node.choices ?? []) {
          if (choice.next) {
            expect(call.nodes[choice.next], `${call.id}/${nodeId}/${choice.id} next`).toBeTruthy();
          }
        }
      }
      expect(Object.keys(call.nodes).length).toBeGreaterThan(2);
    }
  });

  it('makes every call node reachable and every branch able to end', () => {
    for (const call of calls) {
      const seen = new Set<string>();
      const queue = [call.start];
      while (queue.length) {
        const nodeId = queue.shift()!;
        if (seen.has(nodeId)) continue;
        seen.add(nodeId);
        const node = call.nodes[nodeId];
        if (!node) continue;
        if (node.next) queue.push(node.next);
        for (const choice of node.choices ?? []) {
          if (choice.next) queue.push(choice.next);
        }
      }
      expect(seen.size, `${call.id} reachable nodes`).toBe(Object.keys(call.nodes).length);
      const hasTerminal = Object.values(call.nodes).some(
        (node) => !node.next && (!node.choices || node.choices.length === 0)
      );
      expect(hasTerminal, `${call.id} terminal node`).toBe(true);
    }
  });

  it('gives every contact at least one conversation', () => {
    for (const contact of contacts) {
      expect(calls.some((call) => call.contactId === contact.id), contact.id).toBe(true);
    }
  });

  it('has fourteen events with valid choices and effect data', () => {
    expect(events.length).toBeGreaterThanOrEqual(14);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    for (const event of events) {
      expect(event.choices.length).toBeGreaterThan(0);
      expect(event.minChapter).toBeLessThanOrEqual(event.maxChapter);
      for (const choice of event.choices) {
        expect(choice.label.length).toBeGreaterThan(2);
        expect(choice.effects.length).toBeGreaterThan(0);
      }
    }
  });

  it('has valid messages and no dangling message effects', () => {
    const ids = new Set(messages.map((message) => message.id));
    expect(ids.size).toBe(messages.length);
    expect(messages.length).toBeGreaterThanOrEqual(20);
    const effectMessages = [
      ...events.flatMap((event) => event.choices.flatMap((choice) => choice.effects)),
      ...calls.flatMap((call) =>
        Object.values(call.nodes).flatMap((node) => [
          ...(node.effects ?? []),
          ...(node.choices?.flatMap((choice) => choice.effects ?? []) ?? [])
        ])
      )
    ].filter((effect) => effect.type === 'message');
    for (const effect of effectMessages) {
      expect(ids.has(effect.id ?? ''), `message ${effect.id}`).toBe(true);
    }
  });

  it('has six endings and five final choices', () => {
    expect(endings).toHaveLength(6);
    expect(new Set(endings.map((ending) => ending.id)).size).toBe(6);
    expect(finalChoices).toHaveLength(5);
    expect(finalChoices.some((choice) => choice.requiresFlag)).toBe(true);
  });

  it('places every interactable adjacent to a walkable tile', () => {
    for (const item of interactables) {
      let reachable = isWalkableTile(item.x, item.y);
      for (let dy = -1; dy <= 1 && !reachable; dy++) {
        for (let dx = -1; dx <= 1 && !reachable; dx++) {
          reachable = isWalkableTile(item.x + dx, item.y + dy);
        }
      }
      expect(reachable, `${item.id} at ${item.x},${item.y}`).toBe(true);
    }
  });

  it('connects every district, the home porch, and every interactable to the starting shop', () => {
    expect(isWalkableTile(START_POSITION.x, START_POSITION.y)).toBe(true);
    expect(isWalkableTile(HOME_DOOR.x, HOME_DOOR.y + 1)).toBe(true);
    const seen = new Set<string>();
    const queue = [[START_POSITION.x, START_POSITION.y]];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (seen.has(key) || !isWalkableTile(x, y)) continue;
      seen.add(key);
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    expect(seen.size).toBeGreaterThan(800);
    for (const zone of zones) {
      const reachable = [...seen].some((key) => {
        const [x, y] = key.split(',').map(Number);
        return x >= zone.x && x < zone.x + zone.w && y >= zone.y && y < zone.y + zone.h;
      });
      expect(reachable, zone.id).toBe(true);
    }
    expect(
      [...seen].some((key) => {
        const [x, y] = key.split(',').map(Number);
        return Math.max(Math.abs(x - HOME_DOOR.x), Math.abs(y - HOME_DOOR.y)) <= 1;
      })
    ).toBe(true);
    for (const item of interactables) {
      const reachable = [...seen].some((key) => {
        const [x, y] = key.split(',').map(Number);
        return Math.max(Math.abs(x - item.x), Math.abs(y - item.y)) <= 1;
      });
      expect(reachable, item.id).toBe(true);
    }
  });

  it('keeps every map row the expected width', () => {
    expect(cityRows).toHaveLength(CITY_HEIGHT);
    for (const row of cityRows) expect(row).toHaveLength(CITY_WIDTH);
  });
});
