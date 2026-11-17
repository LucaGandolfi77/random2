/* Quest board. Activating a stage tracks progress on every spin, in any mode. */
import { QUESTS, TROPHIES } from '../config.js';
import { vipLevel } from '../state.js';

export const id = 'quest';
export const name = 'Quests';
export const icon = '🗺️';
export const desc = 'A three-chapter campaign. Each stage has an objective and a trophy.';
export const rules = `
  <p class="sub">Activate a stage and it will progress on every spin you play, in any
  mode. Completing a stage pays credits and unlocks a trophy. Stages must be done in order.</p>`;
export const wager = false;
export const chain = false;
export const limit = null;
export const duration = null;
export const panelOnly = true;

export function canEnter() { return { ok: true }; }
export function start() { return null; }
export function onSpin() { return null; }
export function onTick() { return null; }
export function finish() { return null; }

export function activate(state, questId) {
  const quest = QUESTS.find((q) => q.id === questId);
  if (!quest) return { ok: false, reason: 'Unknown quest.' };
  if (state.modes.quest.completed.includes(questId)) return { ok: false, reason: 'Already completed.' };
  const index = QUESTS.indexOf(quest);
  if (index > 0 && !state.modes.quest.completed.includes(QUESTS[index - 1].id)) {
    return { ok: false, reason: 'Complete the previous stage first.' };
  }
  state.modes.quest.active = questId;
  state.modes.quest.progress[questId] = state.modes.quest.progress[questId] || 0;
  return { ok: true, quest };
}

/* Evaluate a spin result against the active quest. Returns completion event. */
export function updateProgress(state, info) {
  const id = state.modes.quest.active;
  if (!id) return null;
  const quest = QUESTS.find((q) => q.id === id);
  if (!quest || state.modes.quest.completed.includes(id)) return null;
  if (quest.machineId && info.machine.id !== quest.machineId) return null;

  let value = 0;
  const r = info.result;
  switch (quest.type) {
    case 'wins': value = r.wins.length; break;
    case 'scatters': value = r.scatterCount; break;
    case 'cascade': value = r.bestCascade || 0; break;
    case 'winAmount': value = info.gross; break;
    case 'machineWin': value = r.wins.length > 0 ? 1 : 0; break;
    case 'cluster': value = Math.max(0, ...r.wins.map((w) => w.count)); break;
    case 'hold': value = r.jackpotTriggers.includes('hold') ? 1 : 0; break;
    case 'vip': value = vipLevel(state.xp); break;
    default: value = 0;
  }

  const progress = state.modes.quest.progress[id] || 0;
  if (quest.type === 'winAmount' || quest.type === 'cascade' || quest.type === 'cluster' || quest.type === 'scatters') {
    state.modes.quest.progress[id] = Math.max(progress, value);
  } else {
    state.modes.quest.progress[id] = progress + value;
  }

  if (state.modes.quest.progress[id] >= quest.target) {
    state.modes.quest.completed.push(id);
    state.modes.quest.active = null;
    state.stats.quests++;
    if (!state.trophies.includes(quest.trophy)) state.trophies.push(quest.trophy);
    return { quest, reward: quest.reward };
  }
  return null;
}

export function questSummary(state) {
  return QUESTS.map((q) => ({
    ...q,
    done: state.modes.quest.completed.includes(q.id),
    progress: Math.min(q.target, state.modes.quest.progress[q.id] || 0),
    active: state.modes.quest.active === q.id,
    trophy: TROPHIES.find((t) => t.id === q.trophy),
  }));
}
