/*
 * GULPER - Phase 5: gamepad, haptics, audio layers, accessibility.
 */
"use strict";

const { GU, ok, equal, report } = require("./harness.js");

/* Haptics never throws, even with no navigator and disabled settings. */
{
    GU.Storage.setSetting("haptics", false);
    var threw = false;
    try { GU.Haptics.pulse(20); } catch (e) { threw = true; }
    ok(!threw, "haptics is a no-op when disabled");
    GU.Storage.setSetting("haptics", true);
    threw = false;
    try { GU.Haptics.pulse(20); } catch (e) { threw = true; }
    ok(!threw, "haptics never throws without a navigator");
}

/* Accessibility settings persist and default sanely. */
{
    var d = GU.Storage.data();
    ok(d.settings.reducedMotion === false || d.settings.reducedMotion === true,
        "reducedMotion is boolean");
    ok(d.settings.highContrast === false || d.settings.highContrast === true,
        "highContrast is boolean");
    ok(d.settings.textSize === "normal" || d.settings.textSize === "large",
        "textSize is a known value");
    GU.Storage.setSetting("reducedMotion", true);
    equal(GU.Storage.data().settings.reducedMotion, true, "reduced motion persists");
    GU.Storage.setSetting("reducedMotion", false);
}

/* Gamepad polling is a no-op without hardware. */
{
    var threw = false;
    try { GU.Input.read({ input: {} }); } catch (e) { threw = true; }
    ok(!threw, "input.read survives without a gamepad");
}

process.exit(report("a11y"));
