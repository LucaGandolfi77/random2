import { choice } from './core.js';
import { loadMeta, incrementNgPlusRun } from '../systems/meta.js';
import { FINAL_CHOICES } from '../data/finals.js';
import { startNewGame } from '../systems/store.js';
import { saveState, clearSave } from '../systems/save.js';

export function offerNgPlus(scene) {
  const meta = loadMeta();
  const labels = new Map(FINAL_CHOICES.map((choice) => [choice.value, choice.label]));
  const options = [
    { label: 'No carried choice', value: 'none' },
    ...meta.choices.map((value) => ({
      label: labels.get(value) || value,
      value
    }))
  ];

  choice(scene, {
    prompt: 'The ledger remembers one door. Which choice do you carry into the next season?',
    options,
    onPick: (value) => {
      incrementNgPlusRun();
      clearSave();
      const state = startNewGame({
        ngPlus: true,
        carriedChoice: value === 'none' ? null : value,
        ngPlusLevel: meta.ngPlusRuns + 1
      });
      saveState(state);
      scene.scene.start('Hub');
    }
  });
}
