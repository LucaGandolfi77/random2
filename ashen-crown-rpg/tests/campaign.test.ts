import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/core/gameStore';
import type { Appearance } from '@/core/types';

const appearance: Appearance = {
  seed: 12,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 2,
  eyes: '#6f8a6a',
  marking: 'crown',
  accent: '#b9b8d4',
  outfit: '#2b3038'
};

const draft = {
  name: 'Serein',
  ancestry: 'aelborn' as const,
  classId: 'mage' as const,
  background: 'scholar' as const,
  attributes: { str: 8, dex: 13, con: 12, int: 15, wis: 14, cha: 10 },
  appearance,
  difficulty: 'story' as const
};

const state = () => useGameStore.getState();
const game = () => {
  const current = state().game;
  if (!current) throw new Error('No active game');
  return current;
};

const choose = (choiceId: string) => {
  state().chooseDialogueChoice(choiceId);
};

const closeDialogue = () => {
  if (state().dialogue) state().closeDialogue();
};

const open = (id: string) => {
  state().openDialogue(id);
  expect(state().dialogue?.id).toBe(id);
};

const win = (encounterId: string) => {
  state().startCombat(encounterId);
  const combat = state().combat;
  expect(combat).toBeTruthy();
  useGameStore.setState({
    combat: {
      ...combat!,
      units: combat!.units.map((unit) =>
        unit.side === 'enemy' ? { ...unit, hp: 0, downed: true } : unit
      )
    }
  });
  state().combatEndTurn();
  expect(state().combat?.phase).toBe('victory');
  state().closeCombat();
};

const forceCheckDialogue = (dialogueId: string, choiceId: string, flag: string, attempts = 40) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (game().world.flags[flag]) return;
    open(dialogueId);
    choose(choiceId);
    closeDialogue();
    state().rest();
  }
  throw new Error(`Could not pass ${dialogueId}/${choiceId} for ${flag}`);
};

describe('full campaign path', () => {
  beforeEach(() => {
    state().newGame(draft);
    state().skipIntro();
  });

  it('reaches the secret ending from a new character', () => {
    expect(state().game?.world.locationId).toBe('fallen_bastion');

    // Kaelen joins, then the Bastion is cleared.
    open('kaelen_bastion');
    choose('mark');
    choose('plan');
    choose('ready');
    closeDialogue();
    expect(game().characters.kaelen.recruited).toBe(true);
    win('enc_bastion_raiders');
    win('enc_ash_warden');
    expect(game().world.flags.bastion_warden_defeated).toBe(true);
    expect(game().world.flags.discovered_greymoor).toBe(true);

    // Greymoor and the Choir. The allied cellar is resolved without combat.
    state().travelTo('greymoor', 3, 18);
    open('marla_reeve');
    choose('help');
    choose('woods');
    choose('go');
    closeDialogue();
    open('choir_preacher');
    choose('join');
    choose('end');
    closeDialogue();
    state().interact('gm_choir_cell');
    expect(state().combat).toBeNull();
    expect(game().world.flags.choir_dealt).toBe(true);
    open('marla_reeve');
    choose('choir_done');
    choose('marla');
    choose('end');
    closeDialogue();
    expect(game().quests.q_ash_over_greymoor.status).toBe('completed');

    // The remaining companions.
    open('nyx_meet');
    choose('who');
    choose('recruit');
    choose('end');
    closeDialogue();
    open('oren_meet');
    choose('recruit');
    choose('end');
    closeDialogue();
    open('ilyra_meet');
    choose('recruit');
    choose('end');
    closeDialogue();
    open('sable_meet');
    choose('recruit');
    choose('end');
    closeDialogue();
    expect(game().characters.nyx.recruited).toBe(true);
    expect(game().characters.oren.recruited).toBe(true);
    expect(game().characters.ilyra.recruited).toBe(true);
    expect(game().characters.sable.recruited).toBe(true);

    // Companion arcs.
    open('kaelen_talk');
    choose('old');
    choose('forgive');
    choose('end');
    closeDialogue();
    open('nyx_talk');
    choose('orders');
    choose('forgive');
    choose('end');
    closeDialogue();
    open('ilyra_talk');
    choose('believe');
    choose('end');
    closeDialogue();
    open('oren_talk');
    choose('power');
    choose('keep');
    choose('end');
    closeDialogue();
    open('sable_talk');
    choose('kill');
    choose('end');
    closeDialogue();
    expect(game().quests.q_name_in_ashes.status).toBe('completed');
    expect(game().quests.q_knife_for_choir.status).toBe('completed');
    expect(game().quests.q_sister_who_never_was.status).toBe('completed');
    expect(game().quests.q_last_prayer.status).toBe('completed');

    // The Hollow Merchant side thread.
    open('greymoor_notices');
    choose('merchant');
    choose('end');
    closeDialogue();
    open('hollow_merchant');
    choose('expose');
    choose('end');
    closeDialogue();
    expect(game().quests.q_hollow_merchant.status).toBe('completed');

    // The woods and the Rootbound door.
    state().travelTo('whispering_woods', 4, 20);
    state().interact('woods_rune_root');
    state().interact('woods_rune_moth');
    state().interact('woods_rune_crown');
    expect(game().world.flags.woods_runes_solved).toBe(true);
    win('enc_antlered_silence');
    expect(game().inventory.some((entry) => entry.itemId === 'root_key')).toBe(true);

    // Sable's shadow.
    win('enc_thorned_shade');
    expect(state().dialogue?.id).toBe('sable_after_shadow');
    choose('take');
    choose('end');
    closeDialogue();
    expect(game().quests.q_debt_in_shadow.status).toBe('completed');

    // The ruins and Ilyra's revelation.
    state().travelTo('woods_ruins', 10, 12);
    open('ilyra_revelation');
    choose('watch');
    choose('ilyra');
    choose('choose');
    closeDialogue();
    expect(game().quests.q_roots_remember.status).toBe('completed');
    expect(game().world.flags.crown_truth).toBe(true);
    forceCheckDialogue('ilyra_revelation', 'check', 'unwritten_truth');
    closeDialogue();
    expect(game().world.flags.unwritten_truth).toBe(true);

    // The temple seals and its guardians.
    state().travelTo('sunken_temple', 4, 15);
    forceCheckDialogue('temple_seal_tides', 'read', 'seal_tides');
    forceCheckDialogue('temple_seal_memory', 'focus', 'seal_memory');
    forceCheckDialogue('temple_seal_grief', 'grieve', 'seal_grief');
    expect(game().world.flags.temple_seals_open).toBe(true);
    win('enc_temple_guardians');
    win('enc_drowned_saint');
    expect(game().world.flags.drowned_saint_defeated).toBe(true);
    expect(game().quests.q_drowned_covenant.status).toBe('completed');
    expect(game().quests.q_crown_of_cinders.status).toBe('active');

    // The Citadel.
    state().travelTo('ashen_citadel', 13, 18);
    win('enc_citadel_echoes');
    win('enc_crownbound');
    expect(game().world.flags.crownbound_defeated).toBe(true);
    expect(game().world.flags.unwritten_ready).toBe(true);
    expect(game().quests.q_debt_in_shadow.status).toBe('completed');
    expect(game().quests.q_hollow_merchant.status).toBe('completed');

    state().interact('citadel_crown');
    expect(state().dialogue?.id).toBe('ending_choice');
    choose('unwritten');
    expect(state().screen).toBe('ending');
    expect(state().game?.ending).toBe('unwritten');
  }, 60000);
});
