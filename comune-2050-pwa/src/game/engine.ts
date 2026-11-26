import { getComune } from "../data/comuni";
import { EVENTS, eventById } from "../data/events";
import { POLICIES, policyById } from "../data/policies";
import { FAMILY_METRICS, STRINGS } from "../data/strings";
import type {
  AxisScores,
  Bilancio,
  ComuneData,
  EventCard,
  Family,
  MetricKey,
  Metrics,
  Policy,
  RunState
} from "../data/types";

export const TURNS = 5;
export const START_YEAR = 2026;
export const YEAR_STEP = 6;
export const START_CREDITS = 9;
export const CREDITS_PER_TURN = 1;
export const SKIP_GAIN = 2;

export const FAMILY_KEYS: Family[] = ["persone", "abitare", "mobilita", "servizi"];

/* Fixed, documented thresholds. Every normalisation is visible in the
   README and in the "Metodo" section of the app. */
export const THRESHOLDS: Record<MetricKey, { min: number; max: number; invert: boolean }> = {
  giovani: { min: 8, max: 20, invert: false },
  invecchiamento: { min: 100, max: 400, invert: true },
  occupazione: { min: 55, max: 85, invert: false },
  reddito: { min: 18_000, max: 38_000, invert: false },
  suolo: { min: 0, max: 50, invert: true },
  casa: { min: 8, max: 30, invert: false },
  turismo: { min: 0, max: 25, invert: false },
  abitato: { min: 0, max: 40, invert: true },
  aria: { min: 5, max: 40, invert: true },
  auto: { min: 400, max: 800, invert: true },
  incidenti: { min: 20, max: 80, invert: true },
  ev: { min: 0, max: 4, invert: false },
  scuola: { min: 0.4, max: 1.2, invert: false },
  digitale: { min: 70, max: 100, invert: false },
  comunita: { min: 1, max: 6, invert: false },
  pnrr: { min: 100, max: 1_000, invert: false }
};

const DRIFT: Partial<Metrics> = {
  giovani: -0.4,
  invecchiamento: -1.4,
  occupazione: -0.1,
  reddito: 0.1,
  suolo: -0.6,
  casa: -0.5,
  turismo: 0.2,
  abitato: -0.4,
  aria: -0.3,
  auto: -0.2,
  incidenti: -0.2,
  ev: 0.2,
  scuola: -0.1,
  digitale: 0.3,
  comunita: 0,
  pnrr: -0.1
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalize(value: number | null, min: number, max: number, invert = false): number {
  if (value === null || !Number.isFinite(value)) return 50;
  const ratio = (value - min) / (max - min);
  const score = Math.max(0, Math.min(1, ratio)) * 100;
  return clampScore(invert ? 100 - score : score);
}

function ratio(income: number | null, omi: number | null): number | null {
  if (income === null || omi === null || omi <= 0) return null;
  return income / omi;
}

export function initialMetrics(comune: ComuneData): Metrics {
  const pop = comune.population;
  const eco = comune.economy;
  const housing = comune.housing;
  const env = comune.environment;
  const mob = comune.mobility;
  const services = comune.services;

  return {
    giovani: normalize(pop.under15.pct, THRESHOLDS.giovani.min, THRESHOLDS.giovani.max),
    invecchiamento: normalize(
      pop.oldAgeIndex,
      THRESHOLDS.invecchiamento.min,
      THRESHOLDS.invecchiamento.max,
      THRESHOLDS.invecchiamento.invert
    ),
    occupazione: normalize(
      eco.employmentRate,
      THRESHOLDS.occupazione.min,
      THRESHOLDS.occupazione.max
    ),
    reddito: normalize(eco.incomeMean, THRESHOLDS.reddito.min, THRESHOLDS.reddito.max),
    suolo: normalize(env.soilConsumptionPct, THRESHOLDS.suolo.min, THRESHOLDS.suolo.max, THRESHOLDS.suolo.invert),
    casa: normalize(
      ratio(eco.incomeMean, housing.omiMean),
      THRESHOLDS.casa.min,
      THRESHOLDS.casa.max
    ),
    turismo: normalize(
      housing.tourismBedsPer100,
      THRESHOLDS.turismo.min,
      THRESHOLDS.turismo.max
    ),
    abitato: normalize(
      housing.vacantDwellingsPct,
      THRESHOLDS.abitato.min,
      THRESHOLDS.abitato.max,
      THRESHOLDS.abitato.invert
    ),
    aria: normalize(env.pm10, THRESHOLDS.aria.min, THRESHOLDS.aria.max, THRESHOLDS.aria.invert),
    auto: normalize(
      mob.vehiclesPer1000,
      THRESHOLDS.auto.min,
      THRESHOLDS.auto.max,
      THRESHOLDS.auto.invert
    ),
    incidenti: normalize(
      mob.injuriesPer10k,
      THRESHOLDS.incidenti.min,
      THRESHOLDS.incidenti.max,
      THRESHOLDS.incidenti.invert
    ),
    ev: normalize(mob.evPer1000, THRESHOLDS.ev.min, THRESHOLDS.ev.max),
    scuola: normalize(
      services.schoolsPer1000,
      THRESHOLDS.scuola.min,
      THRESHOLDS.scuola.max
    ),
    digitale: normalize(services.ftthPct, THRESHOLDS.digitale.min, THRESHOLDS.digitale.max),
    comunita: normalize(
      services.thirdSectorPer1000,
      THRESHOLDS.comunita.min,
      THRESHOLDS.comunita.max
    ),
    pnrr: normalize(services.pnrrPerCapita, THRESHOLDS.pnrr.min, THRESHOLDS.pnrr.max)
  };
}

export function axisScores(metrics: Metrics): AxisScores {
  const scores = {} as AxisScores;
  for (const family of FAMILY_KEYS) {
    const values = FAMILY_METRICS[family].map((key) => metrics[key]);
    scores[family] = round1(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return scores;
}

export function overallScore(axes: AxisScores): number {
  const values = FAMILY_KEYS.map((key) => axes[key]);
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function applyEffects(metrics: Metrics, effects: Partial<Metrics>): Metrics {
  const next = { ...metrics };
  for (const [key, delta] of Object.entries(effects)) {
    if (typeof delta !== "number") continue;
    const metric = key as MetricKey;
    next[metric] = clampScore(next[metric] + delta);
  }
  return next;
}

export function applyDrift(metrics: Metrics): Metrics {
  return applyEffects(metrics, DRIFT);
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function dealHand(
  seed: number,
  turn: number,
  played: string[],
  credits: number
): string[] {
  const pool = POLICIES.filter((policy) => !played.includes(policy.id));
  if (pool.length === 0) return [];
  const random = mulberry32((seed ^ Math.imul(turn, 0x9e3779b9)) >>> 0);
  const hand = shuffle(pool, random).slice(0, 3);

  if (hand.length > 0 && !hand.some((policy) => policy.cost <= credits)) {
    const cheapest = [...pool].sort((a, b) => a.cost - b.cost)[0];
    if (cheapest && !hand.some((policy) => policy.id === cheapest.id)) {
      hand[hand.length - 1] = cheapest;
    }
  }

  if (hand.length > 1) {
    const families = new Set(hand.map((policy) => policy.family));
    if (families.size === 1) {
      const hasAffordable = hand.some((policy) => policy.cost <= credits);
      const alternative = pool.find(
        (policy) =>
          policy.family !== hand[0].family &&
          !hand.some((chosen) => chosen.id === policy.id) &&
          (!hasAffordable || policy.cost <= credits)
      );
      if (alternative) hand[hand.length - 1] = alternative;
    }
  }

  return hand.map((policy) => policy.id);
}

export function buildEventDeck(seed: number): string[] {
  const random = mulberry32((seed ^ 0x85ebca6b) >>> 0);
  return shuffle(EVENTS, random)
    .slice(0, TURNS)
    .map((event) => event.id);
}

export function createRun(comune: ComuneData, seed = Date.now()): RunState {
  const normalizedSeed = seed >>> 0;
  const metrics = initialMetrics(comune);
  const population = comune.population.total;

  return {
    version: 1,
    comuneId: comune.identity.istat,
    seed: normalizedSeed,
    turn: 1,
    year: START_YEAR,
    status: "policy",
    credits: START_CREDITS,
    creditsSpent: 0,
    pendingPolicyId: null,
    population,
    baselinePopulation: population,
    metrics,
    baselineMetrics: { ...metrics },
    hand: dealHand(normalizedSeed, 1, [], START_CREDITS),
    playedPolicies: [],
    eventDeck: buildEventDeck(normalizedSeed),
    eventIndex: 0,
    choices: [],
    history: []
  };
}

export function currentEvent(state: RunState): EventCard {
  const id = state.eventDeck[state.eventIndex];
  const event = id ? eventById(id) : undefined;
  if (!event) throw new Error(`No event at index ${state.eventIndex}`);
  return event;
}

export function currentHand(state: RunState): Policy[] {
  return state.hand
    .map((id) => policyById(id))
    .filter((policy): policy is Policy => Boolean(policy));
}

export function playPolicy(state: RunState, policyId: string): RunState {
  if (state.status !== "policy") throw new Error("Not in policy phase");
  if (!state.hand.includes(policyId)) throw new Error("Policy not in hand");
  const policy = policyById(policyId);
  if (!policy) throw new Error(`Unknown policy: ${policyId}`);
  if (state.credits < policy.cost) throw new Error("Not enough credits");

  return {
    ...state,
    metrics: applyEffects(state.metrics, policy.effects),
    credits: state.credits - policy.cost,
    creditsSpent: state.creditsSpent + policy.cost,
    playedPolicies: [...state.playedPolicies, policy.id],
    pendingPolicyId: policy.id,
    hand: [],
    status: "event"
  };
}

export function skipPolicy(state: RunState): RunState {
  if (state.status !== "policy") throw new Error("Not in policy phase");
  return {
    ...state,
    credits: state.credits + SKIP_GAIN,
    hand: [],
    pendingPolicyId: null,
    status: "event"
  };
}

export function resolveEvent(state: RunState, choiceIndex: number): RunState {
  if (state.status !== "event") throw new Error("Not in event phase");
  const comune = getComune(state.comuneId);
  if (!comune) throw new Error("Unknown comune");
  const event = currentEvent(state);
  const choice = event.choices[choiceIndex];
  if (!choice) throw new Error("Invalid event choice");
  if (state.credits < choice.cost) throw new Error("Not enough credits");

  const metrics = applyEffects(state.metrics, choice.effects);
  const credits = state.credits - choice.cost + choice.gain;
  const creditsSpent = state.creditsSpent + choice.cost;
  const choices = [
    ...state.choices,
    {
      turn: state.turn,
      year: state.year,
      policyId: state.pendingPolicyId,
      eventId: event.id,
      choiceIndex
    }
  ];
  const history = [
    ...state.history,
    {
      year: state.year,
      metrics: { ...metrics },
      population: state.population,
      axes: axisScores(metrics)
    }
  ];

  if (state.turn >= TURNS) {
    return {
      ...state,
      metrics,
      credits,
      creditsSpent,
      choices,
      history,
      eventIndex: state.eventIndex + 1,
      pendingPolicyId: null,
      status: "finished",
      hand: []
    };
  }

  const nextBaselineMetrics = applyDrift(state.baselineMetrics);
  const nextMetrics = applyDrift(metrics);
  const baselinePopulation = growPopulation(
    state.baselinePopulation,
    endemicGrowth(comune, nextBaselineMetrics),
    YEAR_STEP
  );
  const population = growPopulation(
    state.population,
    endemicGrowth(comune, nextMetrics),
    YEAR_STEP
  );
  const nextTurn = state.turn + 1;
  const nextCredits = credits + CREDITS_PER_TURN;

  return {
    ...state,
    turn: nextTurn,
    year: state.year + YEAR_STEP,
    status: "policy",
    credits: nextCredits,
    creditsSpent,
    pendingPolicyId: null,
    population,
    baselinePopulation,
    metrics: nextMetrics,
    baselineMetrics: nextBaselineMetrics,
    hand: dealHand(state.seed, nextTurn, state.playedPolicies, nextCredits),
    eventIndex: state.eventIndex + 1,
    choices,
    history
  };
}

/*
 * Population is the only absolute variable. It grows from the 2022–2026
 * resident trend plus a small feedback from youth, housing, work and
 * lived-in homes. The baseline uses the same formula on the baseline
 * indicators, so a run with no decisions stays exactly on the trend line.
 */
export function endemicGrowth(comune: ComuneData, metrics: Metrics): number {
  const base = comune.baseline.annualGrowth / 100;
  const youth = (metrics.giovani - 50) * 0.0002;
  const housing = (metrics.casa - 50) * 0.00008;
  const work = (metrics.occupazione - 50) * 0.00005;
  const lived = (metrics.abitato - 50) * 0.00004;
  return Math.max(-0.015, Math.min(0.02, base + youth + housing + work + lived));
}

export function growPopulation(population: number, annualRate: number, years: number): number {
  return Math.round(population * Math.pow(1 + annualRate, years));
}

function localized(key: "verdictGreat" | "verdictGood" | "verdictFlat" | "verdictBad") {
  return { it: STRINGS.it[key], en: STRINGS.en[key] };
}

export function finalReport(state: RunState): Bilancio {
  if (state.status !== "finished") throw new Error("Run is not finished");
  const comune = getComune(state.comuneId);
  if (!comune) throw new Error("Unknown comune");

  const finalAxes = axisScores(state.metrics);
  const baselineAxes = axisScores(state.baselineMetrics);
  const total = overallScore(finalAxes);
  const baselineTotal = overallScore(baselineAxes);
  const totalDelta = round1(total - baselineTotal);

  const axes = FAMILY_KEYS.map((key) => ({
    key,
    final: finalAxes[key],
    baseline: baselineAxes[key],
    delta: round1(finalAxes[key] - baselineAxes[key])
  }));

  const ranked = [...axes].sort((a, b) => {
    if (b.delta !== a.delta) return b.delta - a.delta;
    return b.final - a.final;
  });
  const best = ranked[0].key;
  const worst = ranked[ranked.length - 1].key;

  const verdict =
    totalDelta >= 15
      ? localized("verdictGreat")
      : totalDelta >= 6
        ? localized("verdictGood")
        : totalDelta >= -2
          ? localized("verdictFlat")
          : localized("verdictBad");

  const policies = state.playedPolicies
    .map((id) => policyById(id))
    .filter((policy): policy is Policy => Boolean(policy));

  const events = state.choices
    .map((choice) => {
      const event = eventById(choice.eventId);
      return event ? { event, choiceIndex: choice.choiceIndex } : null;
    })
    .filter((entry): entry is { event: EventCard; choiceIndex: number } => Boolean(entry));

  return {
    comune,
    year: state.year,
    population: state.population,
    baselinePopulation: state.baselinePopulation,
    populationDelta: state.population - state.baselinePopulation,
    axes,
    total,
    baselineTotal,
    totalDelta,
    verdict,
    best,
    worst,
    policies,
    events,
    creditsSpent: state.creditsSpent,
    creditsLeft: state.credits
  };
}

export function isAffordable(policy: Policy, credits: number): boolean {
  return policy.cost <= credits;
}
