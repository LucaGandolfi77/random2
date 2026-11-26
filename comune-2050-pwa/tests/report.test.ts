import { describe, expect, it } from "vitest";
import { COMUNI } from "../src/data/comuni";
import { FAMILY_LABEL, fmtEuro, fmtNumber, fmtPercent, fmtSigned, interpolate } from "../src/data/strings";
import { TURNS, createRun, currentEvent, currentHand, finalReport, playPolicy, resolveEvent } from "../src/game/engine";
import { reportText } from "../src/ui/bilancio";
import { renderDiorama } from "../src/ui/diorama";

function finished(comuneIndex = 0, seed = 606) {
  let run = createRun(COMUNI[comuneIndex], seed);
  for (let turn = 0; turn < TURNS; turn += 1) {
    const policy = currentHand(run).find((card) => card.cost <= run.credits)!;
    run = playPolicy(run, policy.id);
    const event = currentEvent(run);
    run = resolveEvent(run, event.choices.findIndex((choice) => choice.cost <= run.credits));
  }
  return run;
}

describe("formatting", () => {
  it("formats Italian and English numbers with the right separators", () => {
    expect(fmtNumber(27573, "it")).toMatch(/27[.,]?573/);
    expect(fmtNumber(27573, "en")).toBe("27,573");
    expect(fmtPercent(23.6, "it")).toBe("23,6%");
    expect(fmtPercent(23.6, "en")).toBe("23.6%");
    expect(fmtEuro(608, "it")).toContain("608");
    expect(fmtEuro(608, "en")).toContain("608");
  });

  it("uses a real minus sign for losses", () => {
    expect(fmtSigned(-3.2, "it", 1)).toBe("−3,2");
    expect(fmtSigned(0, "en")).toBe("±0");
  });

  it("interpolates placeholders and preserves unknown ones", () => {
    expect(interpolate("Ciao {name}, {year}", { name: "Fidenza", year: 2050 })).toBe("Ciao Fidenza, 2050");
    expect(interpolate("{missing}", {})).toBe("{missing}");
  });

  it("has a label for every family", () => {
    for (const family of ["persone", "abitare", "mobilita", "servizi"] as const) {
      expect(FAMILY_LABEL[family].it.length).toBeGreaterThan(1);
      expect(FAMILY_LABEL[family].en.length).toBeGreaterThan(1);
    }
  });
});

describe("report text", () => {
  it("contains the town, the score and the play link", () => {
    const run = finished();
    const report = finalReport(run);
    const text = reportText(report, "it", "https://example.test/comune-2050-pwa/");
    expect(text).toContain("Fidenza");
    expect(text).toContain("2050");
    expect(text).toContain("https://example.test/comune-2050-pwa/");
    expect(text).toContain("Bilancio Civico");
  });

  it("switches language without losing the numbers", () => {
    const report = finalReport(finished(1));
    const it = reportText(report, "it", "https://example.test/");
    const en = reportText(report, "en", "https://example.test/");
    expect(it).toContain("Prato");
    expect(en).toContain("Prato");
    expect(en).toContain("Civic Balance Sheet");
    expect(it).not.toBe(en);
  });
});

describe("diorama", () => {
  it("renders a complete svg for every town", () => {
    for (const comune of COMUNI) {
      const svg = renderDiorama(comune, createRun(comune, 1).metrics, { year: 2050 });
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("role=\"img\"");
      expect(svg).toContain(comune.identity.name);
      expect(svg).toContain("--sky:");
    }
  });

  it("changes the scene when the indicators change", () => {
    const low = renderDiorama(COMUNI[0], {
      ...createRun(COMUNI[0], 2).metrics,
      suolo: 0,
      aria: 0,
      auto: 0,
      casa: 0,
      turismo: 0,
      abitato: 0
    });
    const high = renderDiorama(COMUNI[0], {
      ...createRun(COMUNI[0], 2).metrics,
      suolo: 100,
      aria: 100,
      auto: 100,
      casa: 100,
      turismo: 100,
      abitato: 100
    });
    expect(low).not.toBe(high);
  });

  it("does not throw for any town and year combination", () => {
    for (const comune of COMUNI) {
      for (const year of [2026, 2032, 2038, 2044, 2050]) {
        expect(() => renderDiorama(comune, createRun(comune, 3).metrics, { year, compact: true })).not.toThrow();
      }
    }
  });
});
