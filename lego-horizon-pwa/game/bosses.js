/* Data-driven boss phase scripts for Machine Hunt. Pure logic: returns commands
 * for the simulation to execute, so patterns can be tested without a browser.
 */
export const BOSS_SCRIPTS = Object.freeze({
  boss: {
    name: "Tallneck",
    phases: [
      { until: 0.6, abilities: ["volley"], volleyCd: 2.6 },
      { until: 0.3, abilities: ["volley", "summon"], volleyCd: 2.0, summon: 2, summonCd: 6 },
      { until: 0, abilities: ["volley", "shockwave"], volleyCd: 1.5, shockCd: 3.2, enrage: true },
    ],
  },
  thunderjaw: {
    name: "Thunderjaw",
    phases: [
      { until: 0.65, abilities: ["volley"], volleyCd: 1.4, spread: 5 },
      { until: 0.3, abilities: ["volley", "charge"], volleyCd: 1.8, chargeCd: 3.4, spread: 5 },
      { until: 0, abilities: ["volley", "charge", "shockwave"], volleyCd: 1.0, chargeCd: 2.6, shockCd: 3.6, spread: 7, enrage: true },
    ],
  },
  rockbreaker: {
    name: "Rockbreaker",
    phases: [
      { until: 0.7, abilities: ["spikes"], spikesCd: 2.8 },
      { until: 0.35, abilities: ["spikes", "summon"], spikesCd: 2.2, summon: 2, summonCd: 7 },
      { until: 0, abilities: ["spikes", "shockwave"], spikesCd: 1.8, shockCd: 2.4, enrage: true },
    ],
  },
  corrupted: {
    name: "Corrupted Prime",
    phases: [
      { until: 0.75, abilities: ["beam"], beamCd: 2.6 },
      { until: 0.4, abilities: ["beam", "summon"], beamCd: 2.2, summon: 3, summonCd: 6 },
      { until: 0, abilities: ["beam", "shockwave", "volley"], beamCd: 1.8, shockCd: 2.6, volleyCd: 2.2, enrage: true },
    ],
  },
});

export function bossPhaseFor(type, ratio) {
  const script = BOSS_SCRIPTS[type] || BOSS_SCRIPTS.boss;
  const index = script.phases.findIndex((phase) => ratio > phase.until);
  return index === -1 ? script.phases.length : index + 1;
}

export function bossPhaseConfig(type, phase) {
  const script = BOSS_SCRIPTS[type] || BOSS_SCRIPTS.boss;
  return script.phases[Math.max(0, Math.min(script.phases.length - 1, phase - 1))];
}

/* Mutates the boss's cooldown timers and returns ability commands. */
export function tickBossCommands(type, boss, ratio, dt) {
  const config = bossPhaseConfig(type, bossPhaseFor(type, ratio));
  const commands = [];
  const timers = boss.timers || (boss.timers = {});

  const ready = (name, interval) => {
    timers[name] = (timers[name] ?? (interval || 1) * 0.6) - dt;
    if (timers[name] <= 0) {
      timers[name] = interval;
      return true;
    }
    return false;
  };

  if (config.abilities.includes("volley") && ready("volley", config.volleyCd || 2.4)) {
    commands.push({ kind: "volley", count: config.spread || 3, spread: 0.24, speed: 220 + (config.enrage ? 30 : 0), damage: 1 });
  }
  if (config.abilities.includes("shockwave") && ready("shock", config.shockCd || 3)) {
    commands.push({ kind: "shockwave", count: config.enrage ? 16 : 12, radius: 150, speed: 180, damage: 1 });
  }
  if (config.abilities.includes("summon") && ready("summon", config.summonCd || 7)) {
    commands.push({ kind: "summon", count: config.summon || 2, type: "scout" });
  }
  if (config.abilities.includes("charge") && ready("charge", config.chargeCd || 3.4)) {
    commands.push({ kind: "charge", speed: 340, damage: boss.damage });
  }
  if (config.abilities.includes("spikes") && ready("spikes", config.spikesCd || 2.6)) {
    commands.push({ kind: "spikes", count: 8, radius: 120, damage: 1 });
  }
  if (config.abilities.includes("beam") && ready("beam", config.beamCd || 2.4)) {
    commands.push({ kind: "beam", length: 6, spacing: 34, speed: 260, damage: 1 });
  }
  return commands;
}
