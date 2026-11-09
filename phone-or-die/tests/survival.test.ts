import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/core/gameStore';
import { availableCallsFor } from '@/systems/calls';
import { contacts } from '@/data/contacts';
import { eventById } from '@/data/events';
import { callById } from '@/data/calls';
import { HOME_DOOR, START_POSITION, isWalkableTile, zoneAt } from '@/data/road';
import type { ContactId, EventDef, StoryEffect } from '@/core/types';

const store = () => useGameStore.getState();

const SAFE_EVENT_CHOICES: Record<string, string> = {
  unknown_call: 'answer',
  window_shadow: 'curtain',
  wrong_number: 'hang',
  power_outage: 'breaker',
  missed_call: 'callback',
  silent_room: 'call',
  voicemail: 'listen',
  last_message: 'save',
  door_knock: 'question',
  interference: 'reset',
  mirror_hand: 'cover',
  garden_figure: 'mike',
  wrong_voice: 'hang',
  breaker_trip: 'breaker'
};

const effectScore = (effects: StoryEffect[]): number =>
  effects.reduce((score, effect) => {
    if (effect.type === 'threat') return score + (effect.amount ?? 0);
    if (effect.type === 'shield') return score - (effect.amount ?? 0) * 0.4;
    if (effect.type === 'battery') return score - (effect.amount ?? 0) * 0.5;
    if (effect.type === 'call') return score + 6;
    return score;
  }, 0);

const bestEventChoice = (event: EventDef): string => {
  const safe = SAFE_EVENT_CHOICES[event.id];
  if (safe && event.choices.some((choice) => choice.id === safe)) return safe;
  return [...event.choices].sort((a, b) => effectScore(a.effects) - effectScore(b.effects))[0].id;
};

const charge = (id: string, x: number, y: number) => {
  const current = store().game;
  if (!current) return false;
  const item = store().game;
  useGameStore.setState({
    game: {
      ...item!,
      player: { x, y, zone: zoneAt(x, y) }
    }
  });
  store().interact(id);
  return store().game !== current;
};

const pickContact = (): ContactId | null => {
  const game = store().game!;
  const candidates = contacts
    .filter((contact) => !contact.unknown)
    .filter((contact) => availableCallsFor(contact.id, game).length > 0)
    .filter((contact) => game.battery >= contact.callCost)
    .sort((a, b) => {
      const stateA = game.contacts[a.id];
      const stateB = game.contacts[b.id];
      return stateA.callCount - stateB.callCount || b.threatRelief - a.threatRelief;
    });
  return candidates[0]?.id ?? null;
};

const walkActiveCall = () => {
  const runtime = store().activeCall;
  if (!runtime) return;
  if (!runtime.answered) {
    useGameStore.setState({
      activeCall: { ...runtime, ringingStartedAt: Date.now() - 5000 }
    });
    store().tick(1);
    return;
  }
  const callDef = store().activeCall;
  if (!callDef) return;
  const def = callById[callDef.callId];
  const node = def?.nodes[callDef.nodeId];
  if (!node) {
    store().advanceCall();
    return;
  }
  if (node.choices?.length) {
    store().chooseCallChoice(node.choices[0].id);
  } else {
    store().advanceCall();
  }
};

const callForHelp = (): boolean => {
  const contactId = pickContact();
  if (!contactId) return false;
  store().startCall(contactId);
  let guard = 0;
  while (store().activeCall && guard++ < 60) {
    const runtime = store().activeCall;
    if (!runtime) break;
    if (!runtime.answered) {
      useGameStore.setState({
        activeCall: { ...runtime, ringingStartedAt: Date.now() - 5000 }
      });
      store().tick(1);
    } else {
      walkActiveCall();
    }
  }
  if (store().phoneOpen) store().closePhone();
  return true;
};

const shortestRoute = (): [number, number][] => {
  const startKey = `${START_POSITION.x},${START_POSITION.y}`;
  const queue: [number, number][] = [[START_POSITION.x, START_POSITION.y]];
  const previous = new Map<string, string | null>([[startKey, null]]);
  let found: string | null = null;
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (
      `${x},${y}` !== startKey &&
      Math.max(Math.abs(x - HOME_DOOR.x), Math.abs(y - HOME_DOOR.y)) <= 1
    ) {
      found = `${x},${y}`;
      break;
    }
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ]) {
      const key = `${nx},${ny}`;
      if (previous.has(key) || !isWalkableTile(nx, ny)) continue;
      previous.set(key, `${x},${y}`);
      queue.push([nx, ny]);
    }
  }
  const path: [number, number][] = [];
  let cursor = found;
  while (cursor) {
    const [x, y] = cursor.split(',').map(Number);
    path.push([x, y]);
    cursor = previous.get(cursor) ?? null;
  }
  return path.reverse();
};

beforeEach(() => {
  localStorage.clear();
  store().goToMenu();
});

describe('full survival loop', () => {
  it('can walk the whole route home by calling when the shadows close in', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.12);
    store().newGame('normal');
    store().finishIntro();
    const path = shortestRoute();
    expect(path.length).toBeGreaterThan(30);
    let calls = 0;
    let index = 1;
    let guard = 0;
    while (index < path.length && store().screen === 'game' && guard++ < 500) {
      const game = store().game!;
      if (game.threat >= 28 || (game.shieldSteps === 0 && game.threat >= 18)) {
        if (callForHelp()) {
          calls++;
          continue;
        }
      }
      const [x, y] = path[index];
      if (!store().movePlayer(x, y)) break;
      index++;
    }
    const game = store().game!;
    console.log(
      'route walk:',
      store().screen,
      'threat',
      game.threat.toFixed(1),
      'shieldSteps',
      game.shieldSteps,
      'battery',
      game.battery.toFixed(0),
      'calls',
      calls,
      'reached',
      game.player.x,
      game.player.y
    );
    expect(store().screen).toBe('game');
    expect(
      Math.max(Math.abs(game.player.x - HOME_DOOR.x), Math.abs(game.player.y - HOME_DOOR.y))
    ).toBeLessThanOrEqual(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('can reach dawn on normal without being captured', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.12);
    store().newGame('normal');
    store().finishIntro();

    let guard = 0;
    while (store().screen === 'game' && guard++ < 6000) {
      const state = store();
      const game = state.game;
      if (!game) break;

      if (state.finalOpen) {
        state.chooseFinal(game.clues.length >= 4 ? 'confront' : 'warn');
        continue;
      }

      if (!game.finalChoice && game.nightMinute >= 450) {
        if (state.phoneOpen) {
          state.closePhone();
          continue;
        }
        if (game.player.x !== HOME_DOOR.x || game.player.y !== HOME_DOOR.y + 1) {
          useGameStore.setState({
            game: { ...game, player: { x: HOME_DOOR.x, y: HOME_DOOR.y + 1, zone: 'home-lane' } }
          });
        } else {
          state.interact('home_door');
        }
        continue;
      }

      if (state.pendingEventId) {
        const event = eventById[state.pendingEventId];
        if (event) {
          state.chooseEventChoice(bestEventChoice(event));
        } else {
          useGameStore.setState({ pendingEventId: null });
        }
        continue;
      }

      if (state.activeCall) {
        walkActiveCall();
        continue;
      }

      if (state.phoneOpen) {
        state.closePhone();
        continue;
      }

      if (game.battery <= 30) {
        const uses = game.interactionUses;
        if ((uses.kiosk_charger ?? 0) < 2) {
          charge('kiosk_charger', 25, 11);
          continue;
        }
        if (!game.usedInteractions.includes('powerbank_window')) {
          charge('powerbank_window', 16, 11);
          continue;
        }
        if (!game.usedInteractions.includes('dumpster')) {
          charge('dumpster', 19, 24);
          continue;
        }
      }

      if (game.threat >= 24 || game.shieldSeconds <= 5) {
        const contactId = pickContact();
        if (contactId) {
          state.startCall(contactId);
          continue;
        }
      }

      state.tick(5);
    }

    const finalState = store();
    console.log(
      'survival result:',
      finalState.screen,
      finalState.game?.endingId,
      finalState.game?.nightMinute.toFixed(1),
      'threat',
      finalState.game?.threat.toFixed(1),
      'battery',
      finalState.game?.battery.toFixed(1),
      'calls',
      finalState.game?.stats.callsAnswered,
      'clues',
      finalState.game?.clues.length
    );
    expect(store().screen).toBe('ending');
    expect(store().game?.endingId).not.toBe('shadows_win');
    expect(store().game?.nightMinute).toBe(480);
  }, 30_000);
});
