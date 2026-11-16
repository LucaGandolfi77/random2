import test from "node:test";
import assert from "node:assert/strict";

import { renderFrame } from "../src/render.js";
import { createState, step, dropPowerup, hitPlayer } from "../src/sim.js";
import { THEMES } from "../src/config.js";

function makeContext() {
    const calls = [];
    const gradient = {
        addColorStop() {
            calls.push(["addColorStop"]);
        }
    };

    const ctx = {
        calls,
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        textAlign: "",
        textBaseline: "",
        globalAlpha: 1,
        shadowColor: "",
        shadowBlur: 0,
        createLinearGradient() {
            calls.push(["createLinearGradient"]);
            return gradient;
        },
        createRadialGradient() {
            calls.push(["createRadialGradient"]);
            return gradient;
        },
        clearRect(...args) { calls.push(["clearRect", ...args]); },
        fillRect(...args) { calls.push(["fillRect", ...args]); },
        beginPath() { calls.push(["beginPath"]); },
        closePath() { calls.push(["closePath"]); },
        moveTo(...args) { calls.push(["moveTo", ...args]); },
        lineTo(...args) { calls.push(["lineTo", ...args]); },
        arc(...args) { calls.push(["arc", ...args]); },
        ellipse(...args) { calls.push(["ellipse", ...args]); },
        fill() { calls.push(["fill"]); },
        stroke() { calls.push(["stroke"]); },
        save() { calls.push(["save"]); },
        restore() { calls.push(["restore"]); },
        translate(...args) { calls.push(["translate", ...args]); },
        rotate(...args) { calls.push(["rotate", ...args]); },
        scale(...args) { calls.push(["scale", ...args]); },
        fillText(...args) { calls.push(["fillText", ...args]); },
        setTransform(...args) { calls.push(["setTransform", ...args]); }
    };

    return ctx;
}

test("the menu scene paints without a simulation state", () => {
    for (const name of Object.keys(THEMES)) {
        const ctx = makeContext();
        assert.doesNotThrow(() => renderFrame(ctx, null, name, { time: 2 }));
        assert.ok(ctx.calls.length > 20);
    }
});

test("a playing frame paints enemies, bullets, power-ups and particles", () => {
    const state = createState(21);
    for (let i = 0; i < 120; i++) step(state, 1 / 60);

    /* Drop one after stepping so it is still on screen when we paint. */
    dropPowerup(state, 120, 220, "spread");

    const ctx = makeContext();
    assert.doesNotThrow(() => renderFrame(ctx, state, "neon", { time: state.time }));
    assert.ok(ctx.calls.length > 120);
    assert.ok(ctx.calls.some((call) => call[0] === "fillText"));
});

test("the game-over frame still paints with zero lives", () => {
    const state = createState(22);
    state.lives = 1;
    hitPlayer(state);

    const ctx = makeContext();
    assert.doesNotThrow(() => renderFrame(ctx, state, "retro", { reduced: true }));
    assert.equal(state.over, true);
});
