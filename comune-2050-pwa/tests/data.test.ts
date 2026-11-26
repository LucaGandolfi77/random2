import { describe, expect, it } from "vitest";
import { COMUNI, PILOT_ID, SNAPSHOT_META, getComune } from "../src/data/comuni";
import { EVENTS } from "../src/data/events";
import { POLICIES } from "../src/data/policies";
import { SOURCES, SOURCE_ORDER } from "../src/data/sources";
import { ALL_METRICS, FAMILY_METRICS, METRIC_LABEL, STRINGS } from "../src/data/strings";
import type { Family } from "../src/data/types";

const families: Family[] = ["persone", "abitare", "mobilita", "servizi"];

describe("comuni snapshot", () => {
  it("ships exactly six towns and the Fidenza pilot", () => {
    expect(COMUNI).toHaveLength(6);
    expect(getComune(PILOT_ID)?.identity.name).toBe("Fidenza");
    expect(COMUNI[0].identity.istat).toBe(PILOT_ID);
  });

  it("has unique ISTAT codes and complete provenance", () => {
    const codes = COMUNI.map((comune) => comune.identity.istat);
    expect(new Set(codes).size).toBe(codes.length);
    for (const comune of COMUNI) {
      expect(comune.identity.name.length).toBeGreaterThan(1);
      expect(comune.population.total).toBeGreaterThan(1_000);
      expect(comune.population.series.length).toBeGreaterThanOrEqual(4);
      expect(comune.sources.length).toBeGreaterThan(5);
      for (const id of comune.sources) expect(SOURCES[id]).toBeDefined();
      for (const metric of ALL_METRICS) {
        expect(comune.sourceByMetric[metric]).toBeDefined();
        expect(SOURCES[comune.sourceByMetric[metric]]).toBeDefined();
      }
    }
  });

  it("keeps real values inside plausible ranges", () => {
    for (const comune of COMUNI) {
      expect(comune.population.over65.pct).toBeGreaterThan(0);
      expect(comune.population.over65.pct).toBeLessThan(60);
      expect(comune.population.medianAge).toBeGreaterThan(30);
      expect(comune.environment.soilConsumptionPct).toBeGreaterThanOrEqual(0);
      expect(comune.environment.soilConsumptionPct).toBeLessThanOrEqual(100);
      expect(comune.environment.recyclingPct).toBeGreaterThanOrEqual(0);
      expect(comune.environment.recyclingPct).toBeLessThanOrEqual(100);
      expect(comune.services.ftthPct).toBeGreaterThan(50);
      expect(comune.services.ftthPct).toBeLessThanOrEqual(100);
      expect(comune.mobility.evPer1000).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves the Fidenza values used by the pilot", () => {
    const fidenza = getComune(PILOT_ID)!;
    expect(fidenza.population.total).toBe(27573);
    expect(fidenza.population.over65.pct).toBe(23.6);
    expect(fidenza.environment.soilConsumptionPct).toBe(13.81);
    expect(fidenza.environment.recyclingPct).toBe(85.12);
    expect(fidenza.environment.pm10).toBeNull();
    expect(fidenza.services.ftthPct).toBe(93.4);
    expect(fidenza.services.pnrrProjects).toBe(24);
  });

  it("declares the extraction date and the simulation caveat", () => {
    expect(SNAPSHOT_META.extractionDate).toBe("2026-11-26");
    expect(SNAPSHOT_META.note.toLowerCase()).toContain("non previsioni");
  });
});

describe("sources", () => {
  it("has a name, producer, link, licence and extraction date for every source", () => {
    for (const id of SOURCE_ORDER) {
      const entry = SOURCES[id];
      expect(entry.name.length).toBeGreaterThan(3);
      expect(entry.producer.length).toBeGreaterThan(2);
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.license.length).toBeGreaterThan(2);
      expect(entry.extracted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("does not repeat ids in the published source order", () => {
    expect(new Set(SOURCE_ORDER).size).toBe(SOURCE_ORDER.length);
  });
});

describe("policies", () => {
  it("has twelve policies, three per family, all bilingual and priced", () => {
    expect(POLICIES).toHaveLength(12);
    for (const family of families) {
      expect(POLICIES.filter((policy) => policy.family === family)).toHaveLength(3);
    }
    for (const policy of POLICIES) {
      expect(policy.title.it.length).toBeGreaterThan(3);
      expect(policy.title.en.length).toBeGreaterThan(3);
      expect(policy.blurb.it.length).toBeGreaterThan(10);
      expect(policy.blurb.en.length).toBeGreaterThan(10);
      expect(policy.evidence.it.length).toBeGreaterThan(10);
      expect(policy.evidence.en.length).toBeGreaterThan(10);
      expect(policy.cost).toBeGreaterThanOrEqual(1);
      expect(policy.cost).toBeLessThanOrEqual(3);
      expect(SOURCES[policy.source]).toBeDefined();
      expect(Object.keys(policy.effects).length).toBeGreaterThan(0);
      for (const key of Object.keys(policy.effects)) {
        expect(ALL_METRICS).toContain(key);
      }
    }
  });

  it("has unique ids", () => {
    expect(new Set(POLICIES.map((policy) => policy.id)).size).toBe(POLICIES.length);
  });
});

describe("events", () => {
  it("has eight events with two real trade-off choices", () => {
    expect(EVENTS).toHaveLength(8);
    for (const event of EVENTS) {
      expect(event.title.it.length).toBeGreaterThan(3);
      expect(event.title.en.length).toBeGreaterThan(3);
      expect(event.body.it.length).toBeGreaterThan(10);
      expect(event.body.en.length).toBeGreaterThan(10);
      expect(event.choices).toHaveLength(2);
      expect(SOURCES[event.source]).toBeDefined();
      for (const choice of event.choices) {
        expect(choice.label.it.length).toBeGreaterThan(2);
        expect(choice.label.en.length).toBeGreaterThan(2);
        expect(choice.detail.it.length).toBeGreaterThan(5);
        expect(choice.detail.en.length).toBeGreaterThan(5);
        expect(choice.cost).toBeGreaterThanOrEqual(0);
        expect(choice.gain).toBeGreaterThanOrEqual(0);
      }
      expect(event.choices.some((choice) => choice.cost === 0)).toBe(true);
    }
  });

  it("has unique ids", () => {
    expect(new Set(EVENTS.map((event) => event.id)).size).toBe(EVENTS.length);
  });
});

describe("labels", () => {
  it("covers every metric exactly once across the four families", () => {
    const grouped = Object.values(FAMILY_METRICS).flat();
    expect(grouped).toHaveLength(16);
    expect(new Set(grouped).size).toBe(16);
    for (const metric of ALL_METRICS) {
      expect(METRIC_LABEL[metric].it.length).toBeGreaterThan(1);
      expect(METRIC_LABEL[metric].en.length).toBeGreaterThan(1);
      expect(grouped).toContain(metric);
    }
  });

  it("has the same UI keys in Italian and English", () => {
    expect(Object.keys(STRINGS.it).sort()).toEqual(Object.keys(STRINGS.en).sort());
    for (const key of Object.keys(STRINGS.it) as Array<keyof typeof STRINGS.it>) {
      expect(STRINGS.it[key].length).toBeGreaterThan(0);
      expect(STRINGS.en[key].length).toBeGreaterThan(0);
    }
  });
});
