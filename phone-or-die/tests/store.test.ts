import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/core/gameStore';
import { callById } from '@/data/calls';
import { events } from '@/data/events';
import { isWalkableTile, START_POSITION, HOME_DOOR } from '@/data/road';
import { answerAllContacts, makeGame } from './support';

const callForNode = (callId: string, nodeId: string) => callById[callId]?.nodes[nodeId] ?? null;

const store = () => useGameStore.getState();

const begin = (difficulty: 'story' | 'normal' | 'nightmare' = 'normal') => {
  store().newGame(difficulty);
  store().finishIntro();
};

const forceAnswer = () => {
  const runtime = store().activeCall;
  if (!runtime) throw new Error('No active call to answer');
  useGameStore.setState({
    activeCall: { ...runtime, ringingStartedAt: Date.now() - 5000 }
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  store().tick(1);
};

beforeEach(() => {
  localStorage.clear();
  store().goToMenu();
});

describe('game store flow', () => {
  it('starts a new night and enters the game after the intro', () => {
    store().newGame('normal');
    expect(store().screen).toBe('intro');
    expect(store().game?.difficulty).toBe('normal');
    store().finishIntro();
    expect(store().screen).toBe('game');
    expect(store().game?.chapter).toBe(0);
    expect(store().game?.player.zone).toBe('work');
  });

  it('records the chosen reason for being out', () => {
    begin();
    expect(store().game?.origin).toBe('work');
    store().setOrigin('appointment');
    expect(store().game?.origin).toBe('appointment');
    expect(store().game?.flags.origin_appointment).toBe(true);
    expect(store().game?.deliveredMessages).toContain('msg_origin_appointment');
    expect(store().game?.deliveredMessages).not.toContain('msg_origin_work');
  });

  it('moves only to walkable tiles and every step brings the shadows closer', () => {
    begin();
    const before = store().game!.threat;
    expect(store().movePlayer(10, 29)).toBe(true);
    expect(store().game?.player).toMatchObject({ x: 10, y: 29, zone: 'work' });
    expect(store().game!.threat).toBeGreaterThan(before);
    expect(store().game!.idleSeconds).toBe(0);
    expect(store().movePlayer(0, 0)).toBe(false);
    expect(store().game?.player).toMatchObject({ x: 10, y: 29 });
  });

  it('spends step cover before fear can rise', () => {
    begin();
    useGameStore.setState({
      game: { ...store().game!, threat: 50, shieldSeconds: 0, shieldSteps: 2 }
    });
    store().movePlayer(10, 29);
    expect(store().game!.threat).toBe(50);
    expect(store().game!.shieldSteps).toBe(1);
    store().movePlayer(10, 30);
    expect(store().game!.threat).toBe(50);
    expect(store().game!.shieldSteps).toBe(0);
    store().movePlayer(10, 29);
    expect(store().game!.threat).toBeGreaterThan(50);
  });

  it('is caught by the road if it never calls for help', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        threat: 10,
        shieldSeconds: 0,
        shieldSteps: 0,
        player: { x: 10, y: 29, zone: 'work' }
      }
    });
    for (let step = 0; step < 200 && store().screen === 'game'; step++) {
      store().movePlayer(step % 2 === 0 ? 10 : 11, 29);
    }
    expect(store().screen).toBe('gameover');
    expect(store().game?.threat).toBe(100);
  });

  it('can walk from the copy shop to the porch using only legal tiles', () => {
    begin();
    const startKey = `${START_POSITION.x},${START_POSITION.y}`;
    const target = (x: number, y: number) =>
      Math.max(Math.abs(x - HOME_DOOR.x), Math.abs(y - HOME_DOOR.y)) <= 1;
    const queue: [number, number][] = [[START_POSITION.x, START_POSITION.y]];
    const previous = new Map<string, string | null>([[startKey, null]]);
    let found: string | null = null;
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (target(x, y) && `${x},${y}` !== startKey) {
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
    expect(found).toBeTruthy();
    const path: [number, number][] = [];
    let cursor: string | null = found;
    while (cursor) {
      const [x, y] = cursor.split(',').map(Number);
      path.push([x, y]);
      cursor = previous.get(cursor) ?? null;
    }
    path.reverse();
    for (const [x, y] of path.slice(1)) {
      expect(store().movePlayer(x, y), `${x},${y}`).toBe(true);
    }
    expect(store().game?.player.zone).toBe('home-lane');
    expect(
      Math.max(
        Math.abs(store().game!.player.x - HOME_DOOR.x),
        Math.abs(store().game!.player.y - HOME_DOOR.y)
      )
    ).toBeLessThanOrEqual(1);
  });

  it('picks up the flashlight and records the clue', () => {
    begin();
    useGameStore.setState({
      game: { ...store().game!, player: { x: 9, y: 29, zone: 'work' } }
    });
    store().interact('parked_car_flashlight');
    expect(store().game?.flashlightOwned).toBe(true);
    expect(store().game?.clues).toContain('flashlight');
    expect(store().game?.usedInteractions).toContain('parked_car_flashlight');

    store().interact('parked_car_flashlight');
    expect(store().game?.clues.filter((clue) => clue === 'flashlight')).toHaveLength(1);
  });

  it('runs a complete branching call and applies protection', () => {
    begin();
    const beforeBattery = store().game!.battery;
    store().startCall('sophie');
    expect(store().activeCall?.contactId).toBe('sophie');
    expect(store().game?.battery).toBe(beforeBattery - 4);

    forceAnswer();
    expect(store().activeCall?.answered).toBe(true);
    expect(store().activeCall?.nodeId).toBe('start');

    store().chooseCallChoice('outside');
    expect(store().activeCall?.nodeId).toBe('serious');
    store().chooseCallChoice('shape');
    expect(store().activeCall?.nodeId).toBe('rules');
    store().chooseCallChoice('end');
    expect(store().activeCall?.nodeId).toBe('end');
    store().advanceCall();

    expect(store().activeCall).toBeNull();
    const game = store().game!;
    expect(game.stats.callsAnswered).toBe(1);
    expect(game.callHistory[0]?.type).toBe('outgoing');
    expect(game.contacts.sophie.completedCalls).toContain('sophie_first');
    expect(game.contacts.sophie.trust).toBeGreaterThan(7);
    expect(game.shieldSeconds).toBeGreaterThan(0);
    expect(game.shieldSteps).toBeGreaterThan(0);
    expect(game.clues).toContain('shadow_light');
  });

  it('records a missed call when nobody answers', () => {
    begin();
    store().startCall('mike');
    const runtime = store().activeCall!;
    useGameStore.setState({ activeCall: { ...runtime, ringingStartedAt: Date.now() - 5000 } });
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    store().tick(1);
    expect(store().activeCall).toBeNull();
    expect(store().game?.contacts.mike.missed).toBe(1);
    expect(store().game?.stats.callsMissed).toBe(1);
    expect(store().game?.callHistory[0]?.type).toBe('missed');
    expect(store().game!.threat).toBeGreaterThan(6);
  });

  it('gives partial protection when the player hangs up mid-conversation', () => {
    begin();
    useGameStore.setState({ game: { ...store().game!, threat: 50, shieldSeconds: 0 } });
    store().startCall('mom');
    forceAnswer();
    store().hangUpCall();
    expect(store().activeCall).toBeNull();
    expect(store().game!.threat).toBeLessThan(50);
    expect(store().game!.shieldSeconds).toBeGreaterThan(0);
    expect(store().game!.contacts.mom.completedCalls).toContain('mom_first');
    expect(store().game!.callHistory[0]?.note).toMatch(/lost signal/i);
  });

  it('resolves an event choice and marks it completed', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 150,
        chapter: 2,
        pendingEventId: 'wrong_number'
      } as never
    });
    useGameStore.setState({ pendingEventId: 'wrong_number' });
    store().chooseEventChoice('trace');
    const game = store().game!;
    expect(store().pendingEventId).toBeNull();
    expect(game.completedEvents).toContain('wrong_number');
    expect(game.clues).toContain('wrong_number_trace');
    expect(game.flags.traced_old_line).toBe(true);
  });

  it('applies the final choice and enters the final phase', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 450,
        chapter: 5,
        threat: 50,
        clues: ['a', 'b', 'c', 'd']
      }
    });
    store().chooseFinal('confront');
    const game = store().game!;
    expect(game.finalChoice).toBe('confront');
    expect(game.finalPhase).toBe(true);
    expect(game.nightMinute).toBe(460);
    expect(game.threat).toBe(42);
    expect(store().finalOpen).toBe(false);
  });

  it('marks trusted contacts as warned during the warning finale', () => {
    begin();
    const seeded = answerAllContacts(
      { ...store().game!, nightMinute: 450, chapter: 5, threat: 30 },
      5,
      7
    );
    useGameStore.setState({ game: seeded });
    store().chooseFinal('warn');
    expect(store().game!.stats.contactsWarned).toBeGreaterThanOrEqual(5);
    expect(store().game!.flags.warned_sophie).toBe(true);
  });

  it('captures the player at maximum threat', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        threat: 99.9,
        shieldSeconds: 0,
        barricades: { front: false, back: false, windows: false }
      }
    });
    store().tick(5);
    expect(store().screen).toBe('gameover');
    expect(store().game?.threat).toBe(100);
  });

  it('fails the night if the porch is not reached before dawn', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 479,
        chapter: 5,
        nextEventAt: 999,
        finalChoice: null,
        finalPhase: false,
        player: { x: 15, y: 22, zone: 'bus' }
      }
    });
    store().tick(5);
    expect(store().screen).toBe('ending');
    expect(store().game?.endingId).toBe('shadows_win');
    expect(store().game?.nightMinute).toBe(480);
  });

  it('does not reopen the final choice after a decision is made', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 451,
        chapter: 5,
        nextEventAt: 999,
        finalChoice: 'confront',
        finalPhase: true,
        player: { x: 37, y: 4, zone: 'home-lane' }
      },
      finalOpen: false
    });
    store().interact('home_door');
    expect(store().finalOpen).toBe(false);
  });

  it('resolves the dawn and records an ending', () => {
    begin();
    const seeded = answerAllContacts({ ...store().game!, nightMinute: 479, chapter: 5 }, 4);
    useGameStore.setState({ game: seeded, screen: 'game' });
    store().tick(5);
    expect(store().screen).toBe('ending');
    expect(store().game?.endingId).toBeTruthy();
    expect(store().game?.nightMinute).toBe(480);
  });

  it('saves and restores a night through the fallback store', async () => {
    begin();
    useGameStore.setState({ game: { ...store().game!, threat: 33, nightMinute: 61, chapter: 1 } });
    await store().saveToSlot('slot1');
    expect(store().saves.some((save) => save.slot === 'slot1')).toBe(true);

    useGameStore.setState({ game: { ...store().game!, threat: 91, nightMinute: 140, chapter: 2 } });
    await store().loadFromSlot('slot1');
    expect(store().game?.threat).toBe(33);
    expect(store().game?.nightMinute).toBe(61);
    expect(store().screen).toBe('game');
  });

  it('keeps the porch closed until enough pieces of the road are known', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 300,
        chapter: 4,
        nextEventAt: 999,
        player: { x: 37, y: 4, zone: 'home-lane' }
      }
    });
    store().interact('home_door');
    expect(store().finalOpen).toBe(false);
    expect(store().game?.flags.tried_home_early).toBe(true);
  });

  it('lets the road swallow the hours when the porch is reached early', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 80,
        chapter: 1,
        nextEventAt: 999,
        clues: ['a', 'b', 'c', 'd'],
        player: { x: 37, y: 4, zone: 'home-lane' }
      }
    });
    store().interact('home_door');
    expect(store().finalOpen).toBe(true);
    expect(store().game?.nightMinute).toBe(450);
    expect(store().game?.chapter).toBe(5);
    expect(store().game?.flags.home_reached).toBe(true);
  });

  it('opens the final choice at the home door after 5:30 AM and freezes normal ticks', () => {
    begin();
    useGameStore.setState({
      game: {
        ...store().game!,
        nightMinute: 449.9,
        chapter: 5,
        nextEventAt: 999,
        finalChoice: null,
        finalPhase: false,
        clues: ['a', 'b', 'c', 'd'],
        player: { x: 37, y: 4, zone: 'home-lane' }
      }
    });
    store().tick(5);
    expect(store().finalOpen).toBe(false);
    store().interact('home_door');
    expect(store().finalOpen).toBe(true);
    const time = store().game!.nightMinute;
    store().tick(5);
    expect(store().game!.nightMinute).toBe(time);
  });

  it('can complete a first conversation with every contact', () => {
    const ids = [
      'sophie',
      'mom',
      'dad',
      'daniel',
      'alex',
      'jessica',
      'mike',
      'priya',
      'unknown'
    ] as const;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    for (const id of ids) {
      begin();
      const game = store().game!;
      const equipped = {
        ...game,
        nightMinute: 150,
        chapter: 2,
        contacts: {
          ...game.contacts,
          unknown: { ...game.contacts.unknown, unlocked: true }
        },
        flags: { ...game.flags, called_sophie: true, called_mom: true, called_dad: true }
      };
      useGameStore.setState({ game: equipped });
      store().startCall(id);
      expect(store().activeCall?.contactId, id).toBe(id);
      forceAnswer();
      expect(store().activeCall?.answered, id).toBe(true);
      let steps = 0;
      while (store().activeCall && steps++ < 40) {
        const runtime = store().activeCall;
        const node = runtime ? callForNode(runtime.callId, runtime.nodeId) : null;
        if (node?.choices?.length) {
          store().chooseCallChoice(node.choices[0].id);
        } else {
          store().advanceCall();
        }
      }
      expect(store().activeCall, id).toBeNull();
      expect(store().game!.contacts[id].completedCalls.length, id).toBeGreaterThan(0);
      expect(store().game!.contacts[id].answered, id).toBe(1);
    }
  });

  it('resolves every event choice without throwing', () => {
    for (const event of events) {
      for (const choice of event.choices) {
        begin();
        const game = store().game!;
        useGameStore.setState({
          game: {
            ...game,
            nightMinute: Math.max(event.minChapter, 0) * 60 + 5,
            chapter: Math.max(event.minChapter, 0)
          },
          pendingEventId: event.id,
          activeCall: null,
          phoneOpen: false
        });
        store().chooseEventChoice(choice.id);
        expect(store().pendingEventId, `${event.id}/${choice.id}`).toBeNull();
      }
    }
  });

  it('executes every final choice without throwing', () => {
    for (const id of ['warn', 'barricade', 'run', 'confront', 'accept'] as const) {
      begin();
      useGameStore.setState({
        game: {
          ...makeGame({ nightMinute: 451, chapter: 5, threat: 40 }),
          clues: ['a', 'b', 'c', 'd', 'e', 'f'],
          flags: {
            unknown_contact_unlocked: true,
            unknown_spoke: true,
            unknown_truth: true,
            knows_weakness: true,
            jessica_truth: true,
            unknown_invitation: true
          }
        }
      });
      store().chooseFinal(id);
      expect(store().game?.finalChoice, id).toBe(id);
      expect(store().game?.finalPhase, id).toBe(true);
    }
  });
});
