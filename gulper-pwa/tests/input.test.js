/*
 * GULPER - input.
 *
 * Three devices can drive this game: a thumb, a keyboard and a gamepad.
 * They used to fight each other - a gamepad plugged into a laptop
 * silently killed the mouse - and the keyboard moved nothing at all
 * even though the box said WASD. This suite drives each one and
 * checks that they take turns politely.
 */
"use strict";

const { GU, ok, equal, report, createLevel } = require("./harness.js");

/* A world to read input into. */
function world() {
    const w = createLevel("docks-1", { seed: 1 });
    w.input.mx = 0;
    w.input.my = 0;
    w.input.aimActive = false;
    w.input.attack = false;
    w.input.attackHeld = false;
    w.input.swallow = false;
    w.input.swap = false;
    w.input.frenzy = false;
    return w;
}

/* ---------- the keyboard moves the player ---------- */

/* The game says WASD on the box. WASD has to work. */
{
    const w = world();
    GU.Input.releaseAll();

    GU.Input.state.keys.d = true;
    GU.Input.read(w);
    ok(w.input.mx > 0, "the D key moves the player right (mx " + w.input.mx + ")");

    GU.Input.state.keys.d = false;
    GU.Input.state.keys.a = true;
    GU.Input.read(w);
    ok(w.input.mx < 0, "the A key moves the player left (mx " + w.input.mx + ")");

    GU.Input.state.keys.a = false;
    GU.Input.state.keys.w = true;
    GU.Input.read(w);
    ok(w.input.my < 0, "the W key moves the player up (my " + w.input.my + ")");

    GU.Input.state.keys.w = false;
    GU.Input.state.keys.s = true;
    GU.Input.read(w);
    ok(w.input.my > 0, "the S key moves the player down (my " + w.input.my + ")");

    GU.Input.state.keys.s = false;
    GU.Input.read(w);
    equal(w.input.mx, 0, "letting go of the keys stops the movement");
    equal(w.input.my, 0, "letting go of the keys stops the movement");
}

/* The arrow keys are the same keys under a different name. */
{
    const w = world();
    GU.Input.releaseAll();
    GU.Input.state.keys.arrowright = true;
    GU.Input.read(w);
    ok(w.input.mx > 0, "the right arrow moves the player too");
    GU.Input.releaseAll();
}

/* The keyboard does other things as well. */
{
    const w = world();
    GU.Input.releaseAll();
    GU.Input.pressKey(" ", true);
    GU.Input.read(w);
    ok(w.input.attack, "the space bar attacks");
    GU.Input.releaseAll();

    GU.Input.pressKey("e", true);
    GU.Input.read(w);
    ok(w.input.swallow, "the E key swallows");
    GU.Input.releaseAll();
}

/* ---------- the gamepad is its own source ---------- */

/* A fake pad: axes, buttons and the rest of the standard mapping. */
function fakePad(spec) {
    const axes = spec.axes || [0, 0, 0, 0];
    const buttons = [];
    for (const i of spec.buttons || []) buttons[i] = { pressed: true };
    return {
        axes: axes,
        buttons: buttons,
        mapping: "standard"
    };
}

let padSpec = null;
global.navigator = {
    getGamepads: function () { return padSpec ? [padSpec] : []; },
    vibrate: function () { }
};

{
    const w = world();
    GU.Input.releaseAll();

    /* A pad that is plugged in but resting must not touch anything. */
    GU.Input.state.mx = 0.8;
    GU.Input.state.my = 0.3;
    padSpec = fakePad({ axes: [0, 0, 0, 0] });
    GU.Input.read(w);
    equal(w.input.mx, 0.8, "a resting pad does not erase the pointer's movement");
    equal(w.input.my, 0.3, "a resting pad does not erase the pointer's movement");
    equal(GU.Input.activeSource(), "pointer", "a resting pad does not take the controls");
}

/* A pad that moves takes the controls, and it moves the player. */
{
    const w = world();
    GU.Input.releaseAll();
    GU.Input.state.mx = 0.8;

    padSpec = fakePad({ axes: [-0.9, 0.4, 0, 0] });
    GU.Input.read(w);
    equal(GU.Input.activeSource(), "gamepad", "a moving pad takes the controls");
    ok(w.input.mx < 0, "the left stick moves the player left (mx " + w.input.mx + ")");
    ok(w.input.my > 0, "the left stick moves the player down (my " + w.input.my + ")");
}

/* A pad can aim: GULPER is a game about aiming. */
{
    const w = world();
    GU.Input.releaseAll();
    padSpec = fakePad({ axes: [0, 0, 1, 0] });
    GU.Input.read(w);
    ok(w.input.aimActive, "the right stick aims");
    ok(w.input.aimX > 0, "the right stick aims to the right (aimX " +
        Math.round(w.input.aimX) + ")");
}

/* The buttons act. */
{
    const w = world();
    GU.Input.releaseAll();
    padSpec = fakePad({ axes: [0, 0, 0, 0], buttons: [0] });
    GU.Input.read(w);
    ok(w.input.attack, "the first button attacks");

    const w2 = world();
    GU.Input.releaseAll();
    padSpec = fakePad({ axes: [0, 0, 0, 0], buttons: [1] });
    GU.Input.read(w2);
    ok(w2.input.swallow, "the second button swallows");
}

/* The deadzone keeps a resting stick from drifting. */
{
    const w = world();
    GU.Input.releaseAll();
    padSpec = fakePad({ axes: [0.05, -0.04, 0, 0] });
    GU.Input.read(w);
    equal(w.input.mx, 0, "a stick inside the deadzone does not drift");
    equal(w.input.my, 0, "a stick inside the deadzone does not drift");
}

/* The keyboard takes the controls back from the pad. */
{
    const w = world();
    GU.Input.releaseAll();
    padSpec = fakePad({ axes: [-0.9, 0.4, 0, 0] });
    GU.Input.read(w);
    equal(GU.Input.activeSource(), "gamepad", "the pad is driving");

    GU.Input.state.keys.d = true;
    GU.Input.read(w);
    equal(GU.Input.activeSource(), "keys", "the keyboard takes the controls back");
    ok(w.input.mx > 0, "the keyboard moves the player, not the pad");
    GU.Input.releaseAll();
}

/* ---------- haptics ---------- */

{
    const pulses = [];
    const realDriver = GU.Haptics.driver;
    GU.Haptics.driver = function (ms) { pulses.push(ms); };

    /* A hit lands. */
    const w = world();
    GU.Combat.damage(w, w.entities.find(function (e) { return e.kind === "prey"; }), 5, {});
    ok(pulses.length > 0, "a hit that lands buzzes the phone");

    /* The player is hit. */
    pulses.length = 0;
    GU.Combat.damagePlayer(w, 5, {});
    ok(pulses.length > 0, "being hit buzzes the phone");

    /* And the switch still works. */
    pulses.length = 0;
    GU.Storage.setSetting("haptics", false);
    GU.Combat.damagePlayer(w, 5, {});
    equal(pulses.length, 0, "haptics off means no buzz");

    GU.Storage.setSetting("haptics", true);
    GU.Haptics.driver = realDriver;
}

process.exit(report("input"));
