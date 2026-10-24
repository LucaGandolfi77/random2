import { ENDINGS } from '../data/endings.js';

export function computeEnding(state) {
  const forgotten = state.stats.forgotten;
  const secret = state.flags.secretDrawn || 0;

  if (forgotten >= 3) return 'unnamed';
  if (forgotten >= 1 && state.hero.years <= 0) return 'unnamed';

  const finale = state.flags.finale;
  if (finale && ENDINGS[finale]) return finale;

  if (state.flags.defaulted) return 'default';
  if (secret >= 4) return 'quiet';
  if (state.flags.offeredSelf) return 'saint';
  if (state.hero.years <= 0) return 'saint';
  if (state.flags.selfDrawn >= 20) return 'saint';
  return 'balances';
}

export function getEnding(state) {
  const id = computeEnding(state);
  return ENDINGS[id];
}

function villager(state, id) {
  return state.villagers.find((v) => v.id === id) || null;
}

export function getCharacterEpilogue(state) {
  const lines = [];

  const perrin = villager(state, 'perrin');
  if (perrin?.departed) {
    lines.push('Perrin took the road with Nel and never sent the village an address.');
  } else if (perrin && !perrin.alive) {
    lines.push('Perrin died owing a boat he never sailed.');
  } else if (perrin) {
    lines.push('Perrin stayed on the dock and learned to repair nets instead of buying passage.');
  }

  const joss = villager(state, 'joss');
  if (joss && !joss.alive) {
    lines.push('Joss\'s ferry drifted untied until someone finally stole it.');
  } else if (joss && state.flags.escaped) {
    lines.push('Joss counted eight passengers and refused to say the number aloud.');
  } else if (joss) {
    lines.push('Joss kept the ferry ready, even after the city stopped pretending not to see it.');
  }

  const ottil = villager(state, 'ottil');
  if (ottil && !ottil.alive) {
    lines.push('The Charter House stayed open for a week after Ottil died. No one knew how to close it.');
  } else if (ottil && state.flags.charterBurned) {
    lines.push('Ottil watched the first page burn and said it was the shortest sermon she had ever heard.');
  } else if (ottil) {
    lines.push('Ottil kept the first page under a hymnal and outlived the men who came looking for it.');
  }

  const orin = villager(state, 'orin');
  if (orin && !orin.alive) {
    lines.push('Orin\'s one year bought a quiet grave and a name the chapel still says.');
  } else if (orin && state.flags.orinTestified) {
    lines.push('Orin\'s statement was copied by hand and read in three villages before the city answered.');
  } else if (orin) {
    lines.push('Orin slept through the end of the contract and woke only to ask whether the well was clean.');
  }

  const nel = villager(state, 'nel');
  if (nel?.departed && state.flags.nelStatus === 'city') {
    lines.push('Nel was taken to the city with a ribbon in her pocket and no ledger of her own.');
  } else if (nel?.departed) {
    lines.push('Nel left with Perrin and wrote once, in a hand that was already forgetting the village.');
  } else if (nel && state.flags.nelStatus === 'hidden') {
    lines.push('Nel grew up in the chapel, where the ledger was never allowed to learn her name.');
  } else if (nel && state.flags.nelStatus === 'protected') {
    lines.push('Nel grew up with sixty years and a village that had finally stopped counting them.');
  } else if (nel) {
    lines.push('Nel kept the ribbon on the gate and made a wish every time the lamps were lit.');
  }

  return lines;
}
