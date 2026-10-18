"use strict";

/*
 * IRONFALL - rendering budget.
 *
 * The renderer is Canvas2D and every polygon is its own beginPath/fill, so
 * "low poly" is not a style choice here, it is a budget. Adding a face to a
 * body adds three canvas calls; adding a face to the terrain adds one per
 * visible cell, and the terrain is already most of the frame.
 *
 * The harness has recorded every canvas call since it was written - it is
 * what catches a NaN reaching the draw path - but nothing ever asserted on
 * the count. That is why the frame cost could drift upward one primitive at a
 * time and only a phone would notice.
 *
 * Two measurements, because they fail for different reasons:
 *
 *   - a whole scene, which catches anything that scales with unit count or
 *     visible area (props, ground detail, particles, effects);
 *   - the marginal cost of ONE champion on an otherwise empty map, which
 *     catches a body becoming expensive while the scene still looks fine,
 *     because the scene is dominated by terrain and hides a per-unit
 *     regression completely.
 */

const H = require("./harness.js");
const { IF, buildMatch, run, check, section, report } = H;

/* Draw one frame at a known camera, return the canvas calls it cost. */
function frame(world, tier, x, y) {
    IF.Render.setQuality(tier);
    IF.Render.panTo(x, y);
    IF.Render.cam.x = x;
    IF.Render.cam.y = y;
    H.resetDrawCount();
    IF.Render.draw(world, 1 / 60);
    return H.draws;
}

section("Frame budget");

/* A mid-game scene: waves on the map, structures up, the camera on the
 * player. Four minutes is long enough that every lane has minions. */
const world = buildMatch({ seed: 4242 });
run(world, 240, { renderEvery: 100000 });
const hero = world.player || world.champs[0];
const hx = hero.x, hy = hero.y;

const scene = { low: 0, med: 0, high: 0 };
for (const t of ["low", "med", "high"]) scene[t] = frame(world, t, hx, hy);
console.log("  scene draw calls     " +
    Object.keys(scene).map(t => t + "=" + scene[t]).join("  "));

/* Measured before the low-poly work started: low 4388, med 7297, high 8560.
 * The ceilings carry about 25-30% headroom, which is enough to build with
 * and tight enough that a runaway primitive is caught by the suite rather
 * than by a player on a bus. */
check("the low tier stays inside its frame budget", scene.low <= 6000, scene.low + " calls");
check("the medium tier stays inside its frame budget", scene.med <= 9000, scene.med + " calls");
check("the high tier stays inside its frame budget", scene.high <= 11000, scene.high + " calls");

/* Quality has to actually mean something. If a future change made the tiers
 * converge, the two cheaper settings would be paying for detail nobody can
 * see, and the ordering assertion is the only thing that would notice. */
check("cheaper tiers really are cheaper",
    scene.low < scene.med && scene.med <= scene.high,
    scene.low + " / " + scene.med + " / " + scene.high);

section("Per-body cost");

/* The empty map still draws every structure and all the terrain, so the
 * difference is the body itself plus its shadow, health bar and player
 * marker. Measured before: low 96, med 152, high 155. */
const perBody = { low: 0, med: 0, high: 0 };
for (const t of ["low", "med", "high"]) {
    const bare = IF.World.createWorld({ seed: 7 });
    const base = frame(bare, t, 5000, 5000);
    const withOne = IF.World.createWorld({ seed: 7 });
    IF.World.makeChampion(withOne, {
        champId: "grotshoul", team: 0, lane: "mid", isPlayer: true,
        x: 5000, y: 5000
    });
    const full = frame(withOne, t, 5000, 5000);
    perBody[t] = full - base;
}
console.log("  one champion         " +
    Object.keys(perBody).map(t => t + "=" + perBody[t]).join("  "));

/* This is the assertion that protects the low-poly work. A body that grows
 * from 4 fills to 12 is invisible in a screenshot and obvious here. */
check("a champion body stays cheap at low", perBody.low <= 150, perBody.low + " calls");
check("a champion body stays cheap at medium", perBody.med <= 230, perBody.med + " calls");
check("a champion body stays cheap at high", perBody.high <= 260, perBody.high + " calls");

section("Renderer hygiene");

/* draw() used to decay world.shakeAmt, which meant the renderer was writing
 * simulation state - and a headless run, which never calls draw, therefore
 * never decayed it, so the value ratcheted up to its ceiling and stayed
 * there. Shake belongs to the simulation. */
{
    const bare = IF.World.createWorld({ seed: 11 });
    bare.shakeAmt = 0;
    IF.World.shake(bare, 1.0);
    const afterShake = bare.shakeAmt;
    for (let i = 0; i < 60; i++) IF.World.step(bare, 1 / 60);
    check("shake decays in the simulation, not the renderer",
        bare.shakeAmt < afterShake * 0.6,
        afterShake.toFixed(3) + " -> " + bare.shakeAmt.toFixed(3));

    const drawn = IF.World.createWorld({ seed: 11 });
    drawn.shakeAmt = 0;
    IF.World.shake(drawn, 1.0);
    const beforeDraw = drawn.shakeAmt;
    IF.Render.draw(drawn, 1 / 60);
    check("drawing a frame does not mutate simulation state",
        Math.abs(drawn.shakeAmt - beforeDraw) < 1e-9,
        "shakeAmt " + beforeDraw.toFixed(4) + " -> " + drawn.shakeAmt.toFixed(4));
}

/* The particle array was never capped and never culled: drawParticles walks
 * all of world.fx every frame, so an unbounded emitter is an unbounded
 * frame. */
{
    const bare = IF.World.createWorld({ seed: 13 });
    IF.World.spawnBurst(bare, 5000, 5000, 0, 400, "#ffffff", { dur: 30 });
    check("the particle pool is capped", bare.fx.length <= 320, bare.fx.length + " particles");
}

report("render");