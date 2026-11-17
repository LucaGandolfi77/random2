/* Pure combat rules for Machine Hunt. No DOM, no Canvas, no timers.
 * Weapons, damage resolution, statuses, stamina and dodging live here so the
 * rules can be tested headlessly and the simulation stays readable.
 */
import { BASE } from "./data.js";

export const WEAPONS = Object.freeze({
  bow: {
    label: "Bow", damage: 1, interval: 1, speed: 440, radius: 5,
    pierce: 0, charged: 1, ultimate: 2.2, aoe: 0, trap: false,
    status: "freeze", key: "1",
  },
  spear: {
    label: "Spear", damage: 1.55, interval: 1.45, speed: 320, radius: 11,
    pierce: 2, charged: 1.25, ultimate: 2, aoe: 0, trap: false,
    status: "stun", key: "2",
  },
  bomb: {
    label: "Bomb Sling", damage: 1.25, interval: 1.9, speed: 300, radius: 8,
    pierce: 0, charged: 1.5, ultimate: 2.4, aoe: 76, trap: false,
    status: "burn", key: "3",
  },
  trap: {
    label: "Trap Kit", damage: 0.85, interval: 1.6, speed: 0, radius: 18,
    pierce: 0, charged: 1.2, ultimate: 1.8, aoe: 0, trap: true,
    status: "shock", key: "4",
  },
});

export const STATUSES = Object.freeze({
  freeze: { label: "Frozen", duration: 2.2, slow: 0.45, dps: 0, color: "#7fe3ff" },
  shock: { label: "Shocked", duration: 1.8, slow: 0.85, dps: 0, chain: 0.35, color: "#b8e0ff" },
  burn: { label: "Burning", duration: 3, slow: 1, dps: 1.2, color: "#ff8b5c" },
  stun: { label: "Stunned", duration: 0.9, slow: 1, dps: 0, stun: true, color: "#f2c14e" },
});

export const STAMINA = Object.freeze({
  max: 100,
  dodgeCost: 22,
  dodgeCooldown: 0.75,
  dodgeDuration: 0.28,
  dodgeInvuln: 0.32,
  dodgeSpeed: 2.3,
  regen: 24,
  ultimateCost: 40,
});

export function createCombatState() {
  return {
    weapon: "bow",
    stamina: STAMINA.max,
    dodgeCd: 0,
    dodgeTime: 0,
    invulnBonus: 0,
  };
}

export function weaponProfile(key) {
  return WEAPONS[key] || WEAPONS.bow;
}

export function selectWeapon(state, key) {
  if (!WEAPONS[key] || state.weapon === key) return false;
  state.weapon = key;
  return true;
}

export function statusResistance(target, key) {
  return Math.max(0, Math.min(1, target?.resistances?.[key] || 0));
}

export function resolveDamage(base, target, statusKey = null) {
  let damage = base;
  let resisted = false;
  if (statusKey && target && statusResistance(target, statusKey) > 0) {
    damage *= 1 - statusResistance(target, statusKey) * 0.35;
    resisted = true;
  }
  return { damage, resisted };
}

export function applyStatus(target, key, duration) {
  const def = STATUSES[key];
  if (!def || !target || target.hp <= 0) return false;
  const resistance = statusResistance(target, key);
  const effective = duration * (1 - resistance * 0.6);
  if (effective <= 0.05) return false;
  target.statuses ||= {};
  target.statuses[key] = Math.max(target.statuses[key] || 0, effective);
  return true;
}

export function tickStatuses(target, dt) {
  const events = [];
  if (!target || target.hp <= 0 || !target.statuses) return events;
  for (const [key, time] of Object.entries(target.statuses)) {
    const def = STATUSES[key];
    if (!def) { delete target.statuses[key]; continue; }
    if (def.dps) {
      events.push({ type: "statusTick", status: key, amount: def.dps * dt });
    }
    const next = time - dt;
    if (next <= 0) {
      delete target.statuses[key];
      events.push({ type: "statusEnd", status: key });
    } else target.statuses[key] = next;
  }
  return events;
}

export function statusSlow(target) {
  let slow = 1;
  if (!target?.statuses) return slow;
  for (const key of Object.keys(target.statuses)) {
    const def = STATUSES[key];
    if (def) slow = Math.min(slow, def.slow);
  }
  return slow;
}

export function isStunned(target) {
  return !!target?.statuses?.stun;
}

export function stepStamina(state, input, dt) {
  const events = [];
  state.dodgeCd = Math.max(0, state.dodgeCd - dt);
  state.dodgeTime = Math.max(0, state.dodgeTime - dt);
  state.invulnBonus = Math.max(0, state.invulnBonus - dt);

  if (input?.dodge && state.dodgeCd <= 0 && state.stamina >= STAMINA.dodgeCost) {
    state.stamina -= STAMINA.dodgeCost;
    state.dodgeCd = STAMINA.dodgeCooldown;
    state.dodgeTime = STAMINA.dodgeDuration;
    state.invulnBonus = STAMINA.dodgeInvuln;
    events.push({ type: "dodge" });
  }

  if (input?.ultimate && state.stamina >= STAMINA.ultimateCost) {
    state.stamina -= STAMINA.ultimateCost;
    events.push({ type: "ultimate" });
  }

  if (!state.dodgeTime) {
    state.stamina = Math.min(STAMINA.max, state.stamina + STAMINA.regen * dt);
  }
  return events;
}

export function attackProfile(state, stats, mode = "basic") {
  const weapon = weaponProfile(state.weapon);
  const base = stats.damage * weapon.damage;
  const boost = stats.chargedMultiplier || 1;
  const mult = mode === "charged" ? weapon.charged * boost
    : mode === "ultimate" ? weapon.ultimate * boost : 1;
  const interval = stats.fireInterval * weapon.interval * (mode === "ultimate" ? 1.4 : 1);
  return {
    weapon,
    damage: base * mult,
    interval,
    speed: weapon.speed,
    radius: weapon.radius,
    pierce: weapon.pierce + (mode === "charged" || mode === "ultimate" ? 1 : 0),
    aoe: weapon.aoe,
    trap: weapon.trap,
    status: mode === "basic" ? null : weapon.status,
    mode,
    key: state.weapon,
  };
}

export function baseDamage(stats) {
  return BASE.damage * (stats.damage / BASE.damage);
}
