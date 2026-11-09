import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/core/gameStore';
import type { Appearance } from '@/core/types';

const appearance: Appearance = {
  seed: 5,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 0,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};

const draft = {
  name: 'Aren',
  ancestry: 'erdan' as const,
  classId: 'warrior' as const,
  background: 'soldier' as const,
  attributes: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 13 },
  appearance,
  difficulty: 'balanced' as const
};

describe('dialogue store integration', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(draft);
  });

  it('recruits Kaelen through the opening conversation', () => {
    const store = useGameStore.getState();
    store.interact('kaelen_bastion');
    expect(useGameStore.getState().dialogue?.id).toBe('kaelen_bastion');
    useGameStore.getState().chooseDialogueChoice('mark');
    useGameStore.getState().chooseDialogueChoice('plan');
    const game = useGameStore.getState().game!;
    expect(game.characters.kaelen.recruited).toBe(true);
    expect(game.party).toContain('kaelen');
    expect(game.world.flags.recruited_kaelen).toBe(true);
    expect(game.quests.q_marked.status).toBe('active');
  });

  it('does not pay the same dialogue reward twice', () => {
    const base = useGameStore.getState().game!;
    useGameStore.setState({
      game: {
        ...base,
        world: {
          ...base.world,
          locationId: 'whispering_woods',
          flags: { ...base.world.flags, hollow_merchant_hint: true }
        }
      }
    });
    useGameStore.getState().openDialogue('hollow_merchant');
    useGameStore.getState().chooseDialogueChoice('expose');
    useGameStore.getState().closeDialogue();
    const afterFirst = useGameStore.getState().game!;
    const goldAfterFirst = afterFirst.characters[afterFirst.playerId].gold ?? 0;
    const xpAfterFirst = afterFirst.characters[afterFirst.playerId].xp;

    useGameStore.getState().openDialogue('hollow_merchant');
    useGameStore.getState().chooseDialogueChoice('expose');
    useGameStore.getState().closeDialogue();
    const afterSecond = useGameStore.getState().game!;
    expect(afterSecond.characters[afterSecond.playerId].gold ?? 0).toBe(goldAfterFirst);
    expect(afterSecond.characters[afterSecond.playerId].xp).toBe(xpAfterFirst);
    expect(afterSecond.quests.q_hollow_merchant.status).toBe('completed');
  });

  it('enters interiors through doors even when they are not fast-travel nodes', () => {
    const base = useGameStore.getState().game!;
    useGameStore.setState({
      game: {
        ...base,
        world: {
          ...base.world,
          locationId: 'greymoor',
          x: 5,
          y: 9,
          discovered: [...base.world.discovered, 'greymoor'],
          flags: { ...base.world.flags, bastion_warden_defeated: true }
        }
      }
    });
    useGameStore.getState().interact('gm_inn_door');
    expect(useGameStore.getState().game?.world.locationId).toBe('greymoor_inn');
    useGameStore.getState().interact('inn_exit');
    expect(useGameStore.getState().game?.world.locationId).toBe('greymoor');
  });

  it('resolves the allied Choir cell without starting a battle', () => {
    const base = useGameStore.getState().game!;
    useGameStore.setState({
      game: {
        ...base,
        world: {
          ...base.world,
          locationId: 'greymoor',
          flags: { ...base.world.flags, choir_ally: true, choir_safehouse_open: true }
        }
      }
    });
    useGameStore.getState().interact('gm_choir_cell');
    const game = useGameStore.getState().game!;
    expect(useGameStore.getState().combat).toBeNull();
    expect(game.world.flags.choir_dealt).toBe(true);
    expect(game.world.defeated).toContain('enc_choir_cell');
    expect(game.quests.q_ash_over_greymoor.stage).toBe(2);
  });
});
