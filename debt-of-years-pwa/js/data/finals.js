function alive(state, id) {
  return !!state.villagers.find((v) => v.id === id && v.alive);
}

export const FINAL_CHOICES = [
  {
    label: 'Let the ledger balance.',
    value: 'pay',
    condition: () => true
  },
  {
    label: 'Offer twenty of your own years.',
    value: 'offer',
    condition: (state) => state.hero.years >= 20
  },
  {
    label: 'Refuse. Let the lamps go out.',
    value: 'refuse',
    condition: () => true
  },
  {
    label: 'Face the Collector.',
    value: 'fight',
    condition: () => true
  },
  {
    label: 'Burn the original charter.',
    value: 'charter',
    condition: (state) => !!state.flags.charterKnown
  },
  {
    label: 'Expose the city\'s ledger.',
    value: 'expose',
    condition: (state) => state.flags.auditOutcome === 'confess'
  },
  {
    label: 'Publish the audit at the gate.',
    value: 'parley',
    condition: (state) => state.flags.parleyOutcome === 'public'
  },
  {
    label: 'Take the ferry across the river.',
    value: 'ferry',
    condition: (state) => !!state.flags.ferryReady && alive(state, 'joss')
  },
  {
    label: 'Take the Collector\'s second chair.',
    value: 'secondchair',
    condition: (state) => !!state.flags.orinTestified && !!state.flags.secondChairOffered
  },
  {
    label: 'Renew the contract.',
    value: 'renew',
    condition: () => true
  }
];

export const FINAL_BOSSES = {
  fight: 'collector',
  charter: 'contract',
  expose: 'auditor'
};

export const FINAL_ENDING_FLAGS = {
  offer: 'saint',
  refuse: 'default',
  charter: 'charter',
  expose: 'keeper',
  parley: 'keeper',
  ferry: 'ferry',
  secondchair: 'secondchair',
  renew: 'renewal'
};

export const CARRYABLE_FINAL_VALUES = FINAL_CHOICES.map((choice) => choice.value);

export function getFinalChoices(state) {
  const choices = FINAL_CHOICES
    .filter((choice) => choice.condition(state))
    .map(({ label, value }) => ({ label, value }));

  const carried = state.carriedChoice;
  if (carried && !choices.some((choice) => choice.value === carried)) {
    const base = FINAL_CHOICES.find((choice) => choice.value === carried);
    if (base) {
      const disabled = carried === 'offer' && state.hero.years < 20;
      choices.push({
        label: disabled
          ? `${base.label} (carried — not enough years)`
          : `${base.label} (carried)`,
        value: carried,
        disabled
      });
    }
  }

  return choices;
}
