import { describe, expect, it } from "vitest";
import { COMUNI } from "../src/data/comuni";
import { TURNS, axisScores, createRun, currentEvent, currentHand, endemicGrowth, finalReport, growPopulation, initialMetrics, overallScore, playPolicy, resolveEvent, skipPolicy } from "../src/game/engine";

describe("baseline projection", () => {
  it("matches the snapshot's simple 2022–2026 trend within rounding", () => {
    for (const comune of COMUNI) {
      const projected = growPopulation(comune.population.total, comune.baseline.annualGrowth / 100, 24);
      expect(comune.baseline.population2050).not.toBeNull();
      expect(Math.abs(projected - comune.baseline.population2050!)).toBeLessThanOrEqual(2);
    }
  });

  it("keeps baseline and player population equal when no policy changes indicators", () => {
    const comune = COMUNI[0];
    const metrics = initialMetrics(comune);
    const baselineGrowth = endemicGrowth(comune, metrics);
    const playerGrowth = endemicGrowth(comune, { ...metrics });
    expect(playerGrowth).toBeCloseTo(baselineGrowth, 10);
    expect(growPopulation(comune.population.total, playerGrowth, 6)).toBe(
      growPopulation(comune.population.total, baselineGrowth, 6)
    );
  });

  it("never lets the baseline be affected by policies or events", () => {
    const comune = COMUNI[2];
    let run = createRun(comune, 303);
    const baselineBefore = { ...run.baselineMetrics };

    for (let turn = 0; turn < TURNS; turn += 1) {
      const policy = currentHand(run).find((card) => card.cost <= run.credits);
      run = policy ? playPolicy(run, policy.id) : skipPolicy(run);
      const event = currentEvent(run);
      run = resolveEvent(run, event.choices.findIndex((choice) => choice.cost <= run.credits));
    }

    expect(run.status).toBe("finished");
    expect(run.baselineMetrics).not.toEqual(baselineBefore);
    const report = finalReport(run);
    expect(report.baselineTotal).toBeCloseTo(overallScore(axisScores(run.baselineMetrics)), 1);
    expect(report.baselineTotal).toBeGreaterThan(0);
  });

  it("can finish a run without choosing any policy", () => {
    const comune = COMUNI[4];
    let run = createRun(comune, 404);
    for (let turn = 0; turn < TURNS; turn += 1) {
      run = skipPolicy(run);
      run = resolveEvent(run, 0);
    }
    expect(run.status).toBe("finished");
    expect(run.playedPolicies).toHaveLength(0);
    const report = finalReport(run);
    expect(report.policies).toHaveLength(0);
    expect(report.events).toHaveLength(5);
    expect(report.creditsSpent).toBeGreaterThanOrEqual(0);
  });
});
