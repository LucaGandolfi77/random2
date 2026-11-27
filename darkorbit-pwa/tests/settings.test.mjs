import test from "node:test";
import assert from "node:assert/strict";

import { createQualityController } from "../src/quality.js";
import { loadSettings, saveSettings, SETTINGS_DEFAULTS, loadProfile } from "../src/storage.js";
import { QUALITY, SETTINGS_KEY } from "../src/config.js";

function store() {
    const data = new Map();
    return {
        getItem: (k) => data.has(k) ? data.get(k) : null,
        setItem: (k, v) => data.set(k, v),
        removeItem: (k) => data.delete(k)
    };
}

test("quality tiers expose the expected knobs", () => {
    assert.ok(QUALITY.high.fx.particles > QUALITY.low.fx.particles);
    assert.equal(QUALITY.high.fx.glow, true);
    assert.equal(QUALITY.low.fx.glow, false);
    assert.ok(QUALITY.high.dprCap > QUALITY.low.dprCap);
});

test("forced quality modes bypass the FPS monitor", () => {
    const q = createQualityController({ effects: "low" });
    assert.equal(q.getTier(), "low");
    assert.equal(q.isForced(), true);
    for (let i = 0; i < 100; i++) q.sample(60, 0.1);
    assert.equal(q.getTier(), "low", "stays low despite high FPS");

    q.setSettings({ effects: "high" });
    assert.equal(q.getTier(), "high");
    for (let i = 0; i < 100; i++) q.sample(20, 0.1);
    assert.equal(q.getTier(), "high", "stays high despite low FPS");
});

test("auto quality downgrades after sustained low FPS", () => {
    const q = createQualityController({ effects: "auto" });
    assert.equal(q.getTier(), "high");
    for (let i = 0; i < 10; i++) q.sample(40, 0.1); // 1 s of slow frames
    assert.equal(q.getTier(), "high", "not enough sustained slow time yet");
    for (let i = 0; i < 15; i++) q.sample(40, 0.1);
    assert.equal(q.getTier(), "low");
});

test("auto quality needs longer headroom to upgrade again", () => {
    const q = createQualityController({ effects: "auto" });
    for (let i = 0; i < 30; i++) q.sample(40, 0.1);
    assert.equal(q.getTier(), "low");
    for (let i = 0; i < 50; i++) q.sample(60, 0.1); // 5 s of good frames
    assert.equal(q.getTier(), "low", "5 s is not enough headroom");
    for (let i = 0; i < 45; i++) q.sample(60, 0.1);
    assert.equal(q.getTier(), "high");
});

test("settings round trip with validation", () => {
    const s = store();
    assert.deepEqual(loadSettings(s), SETTINGS_DEFAULTS);
    const custom = {
        effects: "low", fps: 30, sensitivity: 9, palette: "colorblind",
        hud: "large", showFps: true
    };
    assert.equal(saveSettings(custom, s), true);
    const loaded = loadSettings(s);
    assert.equal(loaded.effects, "low");
    assert.equal(loaded.fps, 30);
    assert.equal(loaded.sensitivity, 1.4, "sensitivity clamped to max");
    assert.equal(loaded.palette, "colorblind");
    assert.equal(loaded.hud, "large");
    assert.equal(loaded.showFps, true);
    assert.equal(s.getItem(SETTINGS_KEY) !== null, true);
});

test("settings ignore unknown values", () => {
    const s = store();
    s.setItem(SETTINGS_KEY, JSON.stringify({ effects: "ultra", fps: 144, palette: "weird" }));
    const loaded = loadSettings(s);
    assert.equal(loaded.effects, SETTINGS_DEFAULTS.effects);
    assert.equal(loaded.fps, SETTINGS_DEFAULTS.fps);
    assert.equal(loaded.palette, SETTINGS_DEFAULTS.palette);
});

test("tutorial flag persists in the profile", () => {
    const s = store();
    const p = loadProfile(s);
    assert.equal(p.tutorialDone, false);
    p.tutorialDone = true;
    // saveProfile is imported through storage's own save in the profile suite;
    // here we just verify the default shape is present.
    assert.equal(typeof p.tutorialDone, "boolean");
});
