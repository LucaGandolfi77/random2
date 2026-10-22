/*
 * GULPER - the renderer.
 *
 * The renderer draws in software, so the honest measure of how expensive
 * a frame is is the number of polygons it rasterised. This test measures
 * a whole scene and the marginal cost of one body, because a per-unit
 * regression hides completely inside a scene dominated by terrain.
 *
 * It also watches for NaN. A NaN that reaches the rasteriser is silent -
 * the polygon simply does not appear - and the only way to catch it is to
 * watch the values go past.
 */
"use strict";

const { GU, ok, equal, report, createLevel, rasterStats, resetStats, badNumbers } = require("./harness.js");

/* The scene: a full level, mid-hunt, with the camera on the player. */
function scene(levelId, carry) {
    GU.Storage.data().carry = carry || 0;
    const world = createLevel(levelId || "docks-1", { seed: GU.Levels.get(levelId || "docks-1").seed });
    /* Run it a little so the prey are moving and the alarm is up. */
    for (let i = 0; i < 120; i++) {
        world.input.mx = 0.4;
        world.input.my = -0.3;
        world.input.aimActive = true;
        world.input.aimX = world.player.x + 120;
        world.input.aimY = world.player.y - 90;
        world.input.attack = i % 7 === 0;
        GU.World.update(world, 1 / 30);
    }
    return world;
}

/* ---------- a full frame ---------- */

resetStats();
const world = scene("docks-1", 120);
GU.Render.draw(world, 1 / 60);

const fullPolys = rasterStats.polys;
ok(fullPolys > 0, "the renderer drew something (" + fullPolys + " polygons)");
ok(badNumbers.length === 0, "no NaN reached the renderer: " + badNumbers.slice(0, 3).join(", "));

/* The budget. A phone draws this in software, so the number of polygons
 * per frame is the number that decides whether it is playable. */
ok(fullPolys < 4000, "a full frame stays inside the polygon budget (" + fullPolys + ")");

/* ---------- the marginal cost of one body ---------- */

resetStats();
const before = world.entities.length;
for (let i = 0; i < 20; i++) {
    GU.World.spawnPrey(world, GU.Species.prey.clerk, world.player.x + 40 + i, world.player.y + 40);
}
GU.Render.draw(world, 1 / 60);
const withMore = rasterStats.polys;
const perBody = (withMore - fullPolys) / 20;
ok(perBody > 0, "twenty more bodies cost more polygons (" + perBody.toFixed(1) + " each)");
ok(perBody < 80, "one body costs less than eighty polygons (" + perBody.toFixed(1) + ")");

/* ---------- every biome renders ---------- */

const biomes = Object.keys(GU.Biomes).filter((k) => GU.Biomes[k] && GU.Biomes[k].id);
for (const id of biomes) {
    resetStats();
    const levelId = Object.keys(GU.Levels.byId).find((l) => GU.Levels.byId[l].biome === id);
    const w = scene(levelId, 200);
    GU.Render.draw(w, 1 / 60);
    ok(rasterStats.polys > 0, "the " + id + " biome renders");
    ok(badNumbers.length === 0, "the " + id + " biome has no NaN: " + badNumbers.slice(0, 2).join(", "));
}

/* ---------- the boss renders ---------- */

resetStats();
const bossWorld = scene("foundry-boss", 3000);
GU.Render.draw(bossWorld, 1 / 60);
ok(rasterStats.polys > 0, "a boss fight renders");
ok(badNumbers.length === 0, "a boss fight has no NaN");

/* ---------- the buffer is a real pixel buffer ---------- */

const size = GU.Render.bufferSize();
ok(size.w >= 176 && size.w <= 640, "the buffer width is sane (" + size.w + ")");
ok(size.h >= 160 && size.h <= 440, "the buffer height is sane (" + size.h + ")");
ok(size.chunk >= 2, "at least two screen pixels per buffer pixel (" + size.chunk + ")");

/* ---------- the inverse projection is exact ----------
 * A tap that lands somewhere other than where the player pressed is the
 * loudest possible failure in a game like this. */
{
    const w = scene("docks-1", 0);
    const cam = GU.Render.camera();
    const probe = { x: cam.x + 137, y: cam.y - 92 };
    /* The screen point of a world point, then back again. */
    const p = GU.PROJ;
    const k = 1 / GU.CONFIG.camera.unitsPerPixel;
    const sx = size.w / 2 + ((probe.x - cam.x) - (probe.y - cam.y)) * p.xScale * k;
    const sy = size.h / 2 + (((probe.x - cam.x) + (probe.y - cam.y)) * p.yScale) * k;
    const back = GU.Render.unproject(sx, sy);
    ok(Math.abs(back.x - probe.x) < 0.01, "the projection round-trips in x (" + back.x.toFixed(3) + ")");
    ok(Math.abs(back.y - probe.y) < 0.01, "the projection round-trips in y (" + back.y.toFixed(3) + ")");
}

/* ---------- the pixel font draws every glyph ---------- */

{
    const buf = GU.Raster.create(160, 40);
    const text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 +-!.:%?/";
    GU.Render.drawText(buf, text, 2, 2, 0xffffff, 1);
    let lit = 0;
    for (let i = 0; i < buf.data.length; i += 4) if (buf.data[i] > 0) lit++;
    ok(lit > 200, "the font draws every glyph (" + lit + " pixels)");
}

process.exit(report("render"));
