import { describe, expect, it } from "vitest";
import { validateState } from "../src/game/save";
import { initialState } from "../src/game/engine";
import { interpolate, STRINGS } from "../src/data/strings";

describe("save validation", () => {
  it("accepts a fresh state and rejects malformed saves", () => {
    expect(validateState(initialState())).toBe(true);
    expect(validateState(null)).toBe(false);
    expect(validateState({})).toBe(false);
    expect(validateState({ ...initialState(), chapter: 9 })).toBe(false);
    expect(validateState({ ...initialState(), finalChoice: "bad" })).toBe(false);
    expect(validateState({ ...initialState(), facts: "nope" })).toBe(false);
  });

  it("survives a JSON round trip", () => {
    const state = { ...initialState(), chapter: 3, facts: ["nainaiWish"], flags: ["helpedFeng"] };
    const parsed = JSON.parse(JSON.stringify(state)) as unknown;
    expect(validateState(parsed)).toBe(true);
  });
});

describe("localized UI", () => {
  it("has the same non-empty keys in Italian and English", () => {
    expect(Object.keys(STRINGS.it).sort()).toEqual(Object.keys(STRINGS.en).sort());
    for (const key of Object.keys(STRINGS.it) as Array<keyof typeof STRINGS.it>) {
      expect(STRINGS.it[key].length).toBeGreaterThan(0);
      expect(STRINGS.en[key].length).toBeGreaterThan(0);
    }
  });

  it("interpolates known values and preserves unknown placeholders", () => {
    expect(interpolate("Ciao {name}, {n}", { name: "Mei", n: 3 })).toBe("Ciao Mei, 3");
    expect(interpolate("{missing}", {})).toBe("{missing}");
  });
});
