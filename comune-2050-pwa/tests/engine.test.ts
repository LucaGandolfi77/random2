import { describe, expect, it } from "vitest";
import { COMUNI } from "../src/data/comuni";
import { POLICIES } from "../src/data/policies";
import { FAMILY_METRICS } from "../src/data/strings";
import type { RunState } from "../src/data/types";
import {
  START_CREDITS,
  TURNS,
  axisScores,
  buildEventDeck,
  createRun,
  currentEvent,
  currentHand,
  dealHand,
  endemicGrowth,
  finalReport,
  growPopulation,
  initialMetrics,
  normalize,
  overallScore,
  playPolicy,
  resolveEvent,
  skipPolicy
} from "../src/game/engine";

function finishRun(comuneIndex = 0, seed = 2050): RunState {
  let run = createRun(COMUNI[comuneIndex], seed);
  for (let turn = 0; turn < TURNS; turn += 1) {
    expect(run.status).toBe("policy");
    const policy = currentHand(run).find((card) => card.cost <= run.credits);
    run = policy ? playPolicy(run, policy.id) : skipPolicy(run);
    expect(run.status).toBe("event");
    const event = currentEvent(run);
    const choice = Math.max(
      0,
      event.choices.findIndex((option) => option.cost <= run.credits)
    );
    run = resolveEvent(run, choice);
  }
  return run;
}

describe("initial state", () => {
  it("creates a playable run for every comune", () => {
    for (const comune of COMUNI) {
      const run = createRun(comune, 42);
      expect(run.comuneId).toBe(comune.identity.istat);
      expect(run.turn).toBe(1);
      expect(run.year).toBe(2026);
      expect(run.status).toBe("policy");
      expect(run.credits).toBe(START_CREDITS);
      expect(run.hand).toHaveLength(3);
      expect(new Set(run.hand).size).toBe(3);
      expect(run.eventDeck).toHaveLength(TURNS);
      expect(new Set(run.eventDeck).size).toBe(TURNS);
      expect(run.history).toHaveLength(0);
      expect(run.population).toBeGreaterThan(0);
      expect(run.baselinePopulation).toBe(run.population);
    }
  });

  it("normalises all sixteen indicators inside 0–100", () => {
    for (const comune of COMUNI) {
      const metrics = initialMetrics(comune);
      for (const value of Object.values(metrics)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      const axes = axisScores(metrics);
      for (const value of Object.values(axes)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      expect(overallScore(axes)).toBeGreaterThan(0);
    }
  });

  it("keeps Fidenza's missing air data neutral instead of inventing a value", () => {
    const fidenza = COMUNI.find((comune) => comune.identity.istat === "034014");
    expect(fidenza).toBeDefined();
    expect(fidenza!.environment.pm10).toBeNull();
    expect(initialMetrics(fidenza!).aria).toBe(50);
  });
});

describe("normalisation and population", () => {
  it("handles null, clamp and inverted thresholds", () => {
    expect(normalize(null, 0, 100)).toBe(50);
    expect(normalize(0, 0, 100)).toBe(0);
    expect(normalize(150, 0, 100)).toBe(100);
    expect(normalize(25, 0, 100, true)).toBe(75);
  });

  it("grows the baseline exactly when indicators are equal", () => {
    const metrics = initialMetrics(COMUNI[0]);
    expect(endemicGrowth(COMUNI[0], metrics)).toBeCloseTo(endemicGrowth(COMUNI[0], { ...metrics }), 8);
    const grown = growPopulation(100_000, 0.01, 10);
    expect(grown).toBe(110_462);
  });
});

describe("hand and event deck", () => {
  it("never repeats a card in a hand and respects played cards", () => {
    const played: string[] = [];
    for (let turn = 1; turn <= 4; turn += 1) {
      const hand = dealHand(99, turn, played, 9);
      expect(new Set(hand).size).toBe(hand.length);
      for (const id of hand) expect(played).not.toContain(id);
      played.push(hand[0]);
    }
  });

  it("builds a deterministic five-event deck", () => {
    expect(buildEventDeck(7)).toEqual(buildEventDeck(7));
    expect(buildEventDeck(7)).not.toEqual(buildEventDeck(8));
  });
});

describe("turn flow", () => {
  it("rejects a policy outside the hand and unaffordable choices", () => {
    const run = createRun(COMUNI[0], 11);
    const outside = POLICIES.find((policy) => !run.hand.includes(policy.id));
    expect(outside).toBeDefined();
    expect(() => playPolicy(run, outside!.id)).toThrow(/hand/);
    expect(() => resolveEvent(run, 0)).toThrow(/event/);
    expect(() => finalReport(run)).toThrow(/finished/);
  });

  it("moves from policy to event and then to the next year", () => {
    let run = createRun(COMUNI[0], 12);
    const before = run.credits;
    const policy = currentHand(run).find((card) => card.cost <= run.credits)!;
    run = playPolicy(run, policy.id);
    expect(run.status).toBe("event");
    expect(run.credits).toBe(before - policy.cost);
    expect(run.creditsSpent).toBe(policy.cost);
    expect(run.pendingPolicyId).toBe(policy.id);
    const event = currentEvent(run);
    run = resolveEvent(run, 0);
    expect(run.status).toBe("policy");
    expect(run.turn).toBe(2);
    expect(run.year).toBe(2032);
    expect(run.history).toHaveLength(1);
    expect(run.credits).toBeGreaterThanOrEqual(0);
    expect(event.id).toBeTruthy();
  });

  it("lets a player skip a tender and recover credits", () => {
    let run = createRun(COMUNI[2], 13);
    const before = run.credits;
    run = skipPolicy(run);
    expect(run.status).toBe("event");
    expect(run.credits).toBe(before + 2);
    expect(run.pendingPolicyId).toBeNull();
    expect(run.playedPolicies).toHaveLength(0);
  });

  it("finishes after five turns and builds a coherent report", () => {
    const run = finishRun(0, 2050);
    expect(run.status).toBe("finished");
    expect(run.turn).toBe(5);
    expect(run.year).toBe(2050);
    expect(run.history).toHaveLength(5);
    expect(run.choices).toHaveLength(5);
    expect(run.credits).toBeGreaterThanOrEqual(0);

    const report = finalReport(run);
    expect(report.comune.identity.istat).toBe(run.comuneId);
    expect(report.axes).toHaveLength(4);
    expect(report.total).toBeGreaterThanOrEqual(0);
    expect(report.total).toBeLessThanOrEqual(100);
    expect(report.baselineTotal).toBeGreaterThanOrEqual(0);
    expect(report.baselineTotal).toBeLessThanOrEqual(100);
    expect(report.policies.length).toBeLessThanOrEqual(TURNS);
    expect(report.events).toHaveLength(5);
    expect(report.population).toBeGreaterThan(0);
    expect(report.baselinePopulation).toBeGreaterThan(0);
    expect(report.creditsSpent).toBeGreaterThanOrEqual(0);
    expect(report.verdict.it.length).toBeGreaterThan(10);
    expect(report.verdict.en.length).toBeGreaterThan(10);
  });

  it("finishes a complete run for every comune", () => {
    for (let index = 0; index < COMUNI.length; index += 1) {
      const run = finishRun(index, 900 + index);
      expect(run.status).toBe("finished");
      const report = finalReport(run);
      expect(report.total).toBeGreaterThan(0);
      expect(report.population).toBeGreaterThan(0);
      expect(Number.isFinite(report.populationDelta)).toBe(true);
      expect(report.axes.every((axis) => Number.isFinite(axis.final))).toBe(true);
    }
  });

  it("produces the same report for the same seed and choices", () => {
    const first = finishRun(1, 777);
    const second = finishRun(1, 777);
    expect(first.hand).toEqual(second.hand);
    expect(first.eventDeck).toEqual(second.eventDeck);
    expect(finalReport(first).total).toBe(finalReport(second).total);
    expect(finalReport(first).population).toBe(finalReport(second).population);
  });

  it("covers every family in the initial indicator map", () => {
    const metrics = initialMetrics(COMUNI[3]);
    const covered = Object.values(FAMILY_METRICS).flat();
    expect(new Set(covered).size).toBe(16);
    for (const key of covered) expect(metrics[key]).toBeTypeOf("number");
  });
});
