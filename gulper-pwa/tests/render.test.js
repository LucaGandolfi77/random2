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

const { GU, ok, equal, report, createLevel, rasterStats, resetStats, badNumbers, lastFrame } = require("./harness.js");

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

/* ---------- the palette override actually repaints the world ----------
 * A palette setting that leaves one corner of the renderer on the
 * biome's own colours is a setting that does nothing. The check is
 * made on the pixels: the ground is most of the screen, so the colour
 * that covers most of the frame must come from the palette that was
 * asked for. */

{
    /* The colour that covers most of a frame, as a packed value. */
    const dominant = function () {
        const px = lastFrame();
        if (!px) return null;
        const counts = new Map();
        for (let i = 0; i < px.length; i += 4) {
            if (px[i + 3] === 0) continue;
            const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        let best = null, bestN = 0;
        for (const [k, n] of counts) {
            if (n > bestN) { bestN = n; best = k; }
        }
        return best;
    };

    /* The colours a palette is allowed to paint with. The palette
     * stores them packed, the frame stores them as r,g,b bytes. */
    const paletteColors = function (id) {
        const set = new Set();
        for (const packed of GU.Palette.get(id).colors) {
            set.add((packed & 255) << 16 | ((packed >> 8) & 255) << 8 | ((packed >> 16) & 255));
        }
        return set;
    };

    const scene1 = scene("docks-1", 120);

    GU.Storage.setSetting("palette", "auto");
    GU.Render.draw(scene1, 1 / 60);
    const withAuto = dominant();
    ok(withAuto !== null, "the renderer painted a frame to compare");
    ok(paletteColors("docks").has(withAuto),
        "without an override the biome paints with its own palette");

    GU.Storage.setSetting("palette", "cathedral");
    GU.Render.draw(scene1, 1 / 60);
    const withCathedral = dominant();
    ok(paletteColors("cathedral").has(withCathedral),
        "an override repaints the world in the chosen palette");
    ok(!paletteColors("docks").has(withCathedral) ||
        paletteColors("cathedral").has(withAuto),
        "the override changed the picture, it did not just relabel it");

    /* Back to the biome's own colours. */
    GU.Storage.setSetting("palette", "auto");
    GU.Render.draw(scene1, 1 / 60);
    ok(paletteColors("docks").has(dominant()),
        "the biome's own palette is back");

    GU.Storage.setSetting("palette", "auto");
}

/* ---------- one source of truth for the palette ----------
 * A draw call that reads the biome's palette directly is a draw call
 * that ignores the override. There must be exactly one place that
 * decides which palette is in force. */

{
    const src = require("fs").readFileSync(
        require("path").join(__dirname, "..", "src", "render.js"), "utf8");
    const reads = src.match(/\.biome\.palette|palette\.palette/g) || [];
    ok(reads.length <= 1,
        "the renderer decides the palette in one place (" + reads.length + " direct reads)");
    ok(src.indexOf("S.Palette.effective(") >= 0,
        "the renderer asks the palette which one is in force");
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
