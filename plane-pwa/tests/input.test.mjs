import test from "node:test";
import assert from "node:assert/strict";

import { clientToWorld } from "../src/input.js";
import { WIDTH, HEIGHT } from "../src/config.js";

test("clientToWorld maps a scaled canvas back to the 400x600 design space", () => {
    const rect = { left: 10, top: 20, width: 200, height: 300 };

    assert.deepEqual(clientToWorld(rect, 110, 170), { x: 200, y: 300 });
    assert.deepEqual(clientToWorld(rect, 10, 20), { x: 0, y: 0 });
    assert.deepEqual(clientToWorld(rect, 210, 320), { x: WIDTH, y: HEIGHT });
});

test("clientToWorld uses the size of the real CSS box, not the backing buffer", () => {
    const rect = { left: 0, top: 0, width: 374, height: 561 };

    const point = clientToWorld(rect, 187, 280.5);
    assert.ok(Math.abs(point.x - 200) < 0.001);
    assert.ok(Math.abs(point.y - 300) < 0.001);
});

test("clientToWorld has a sane fallback for a zero-sized box", () => {
    const point = clientToWorld({ left: 0, top: 0, width: 0, height: 0 }, 100, 150);
    assert.equal(point.x, 100);
    assert.equal(point.y, 150);
});
