import test from "node:test";
import assert from "node:assert/strict";

import { getMesh, meshStats, drawMesh } from "../src/mesh.js";
import { SHIPS, ENEMIES, QUALITY } from "../src/config.js";

function stubContext() {
    const calls = { fill: 0, stroke: 0, moveTo: 0, lineTo: 0 };
    const points = [];
    return {
        calls,
        points,
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        globalAlpha: 1,
        beginPath() {},
        moveTo(x, y) { calls.moveTo += 1; points.push(x, y); },
        lineTo(x, y) { calls.lineTo += 1; points.push(x, y); },
        closePath() {},
        fill() { calls.fill += 1; },
        stroke() { calls.stroke += 1; }
    };
}

test("mesh catalogue covers every ship and enemy", () => {
    const stats = meshStats();
    assert.ok(stats.ships >= SHIPS.length);
    assert.ok(stats.enemies >= ENEMIES.length);
    assert.ok(stats.faces > 200, "enough facets to read as faceted 3D");
});

test("meshes have finite vertices and outward normals", () => {
    for (const kind of ["ship", "enemy", "drone"]) {
        const ids = kind === "ship" ? SHIPS.map((s) => s.id)
            : kind === "enemy" ? ENEMIES.map((e) => e.id) : [null];
        for (const id of ids) {
            const mesh = getMesh(kind, id);
            for (const p of mesh.v) {
                assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]));
            }
            for (const f of mesh.f) {
                const l = Math.hypot(f.n[0], f.n[1], f.n[2]);
                assert.ok(Math.abs(l - 1) < 0.001, "normal is unit length");
                assert.ok(f.i.length >= 3);
                for (const i of f.i) assert.ok(i >= 0 && i < mesh.v.length);
            }
        }
    }
});

test("distinct ships get distinct meshes", () => {
    const a = getMesh("ship", "kestrel");
    const b = getMesh("ship", "colossus");
    assert.notEqual(a, b);
    assert.ok(b.v.length > a.v.length, "the siege hull has more geometry");
});

test("drawMesh paints visible facets with finite coordinates", () => {
    const ctx = stubContext();
    drawMesh(ctx, getMesh("ship", "warden"), 400, 300, 0.7, "#c08bff", 1, {});
    assert.ok(ctx.calls.fill > 0, "at least one face drawn");
    assert.ok(ctx.calls.moveTo > 0);
    for (const n of ctx.points) assert.ok(Number.isFinite(n), "no NaN coordinates");
});

test("drawMesh supports flash and alpha without leaking globalAlpha", () => {
    const ctx = stubContext();
    drawMesh(ctx, getMesh("enemy", "leviathan"), 100, 100, -1.2, "#5ce1e6", 1.6, {
        flash: true, alpha: 0.4, outlines: true
    });
    assert.ok(ctx.calls.fill > 0);
    assert.ok(ctx.calls.stroke > 0);
    assert.equal(ctx.globalAlpha, 1, "alpha restored after drawing");
});

test("quality tiers gate the mesh renderer", () => {
    assert.equal(QUALITY.high.fx.mesh, true);
    assert.equal(QUALITY.low.fx.mesh, false);
});
