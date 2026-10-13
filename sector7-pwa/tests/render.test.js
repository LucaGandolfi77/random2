/*
 * SECTOR 7 headless render smoke test.
 *
 *   node sector7-pwa/tests/render.test.js
 *
 * render.js needs a canvas, and there is no browser in CI, so this stands in
 * a recording 2D context and then makes very sure nothing reached it is NaN.
 * That is not a paranoid check: the projection, the back-face cull and the
 * face sort are all new maths, and a sign error in any of them shows up as
 * silently degenerate geometry rather than as an exception.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

/* ---------- recording canvas ---------- */
let drawCalls = 0;
let badNumbers = 0;
let badWhere = new Map();
let polygons = 0;
let badPolygons = 0;
let imaged = 0;

function num(v, where) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
        badNumbers++;
        badWhere.set(where, (badWhere.get(where) || 0) + 1);
        return 0;
    }
    return v;
}

function makeCtx() {
    const ctx = {
        canvas: null,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillStyle: "#000",
        strokeStyle: "#000",
        lineWidth: 1,
        font: "10px sans-serif",
        textAlign: "left",
        lineDashOffset: 0,
        _open: false,
        _verts: [],

        save() {}, restore() {}, translate() {}, rotate() {}, setTransform() {},
        scale() {}, clearRect() {}, fillRect() { drawCalls++; }, clip() {},
        beginPath() { this._open = true; this._verts = []; this._drawn = null; },
        moveTo(x, y) {
            this._open = true;
            const p = [num(x, "moveTo"), num(y, "moveTo")];
            this._verts.push(p);
            if (this._record) this._drawn = [p];
            drawCalls++;
        },
        lineTo(x, y) {
            const p = [num(x, "lineTo"), num(y, "lineTo")];
            this._verts.push(p);
            if (this._record && this._drawn) this._drawn.push(p);
            drawCalls++;
        },
        _verts: [], _drawn: null, _record: false, _onFill: null,
        closePath() { this._close = true; },
        arc(x, y) { this._open = true; num(x, "arc"); num(y, "arc"); drawCalls++; },
        ellipse(x, y, rx, ry) {
            this._open = true;
            num(x, "ellipse"); num(y, "ellipse"); num(rx, "ellipse"); num(ry, "ellipse");
            drawCalls++;
        },
        stroke() {
            if (!this._open) return;
            if (this._verts.length >= 3) {
                polygons++;
                if (this._verts.some((v) => !Number.isFinite(v[0]) || !Number.isFinite(v[1]))) {
                    badPolygons++;
                }
            }
        },
        fill() {
            if (!this._open) return;
            if (this._verts.length >= 3) {
                polygons++;
                if (this._verts.some((v) => !Number.isFinite(v[0]) || !Number.isFinite(v[1]))) {
                    badPolygons++;
                }
                if (this._record && this._onFill && this._drawn) {
                    this._onFill(this._drawn);
                    this._drawn = null;
                }
            }
        },
        fillText(t, x, y) { num(x, "fillText"); num(y, "fillText"); drawCalls++; },
        strokeText(t, x, y) { num(x, "strokeText"); num(y, "strokeText"); drawCalls++; },
        setLineDash() {},
        /* Both the 3-arg (no size) and 5-arg forms are legal, so only the
         * arguments that were actually passed can be checked. */
        drawImage(img, ...rest) {
            imaged++;
            if (!img) { badNumbers++; badWhere.set("drawImage(null)", 1); }
            rest.forEach((v, i) => num(v, "drawImage arg" + i));
            drawCalls++;
        },
        createRadialGradient(x, y, r0, r1, r2, r3) {
            num(x, "gradient"); num(y, "gradient"); num(r0, "gradient");
            num(r1, "gradient"); num(r2, "gradient"); num(r3, "gradient");
            return { addColorStop(o) { num(o, "gradient stop"); } };
        },
        measureText() { return { width: 10 }; },
    };
    return ctx;
}

function makeCanvas() {
    /* A real canvas always hands back the same context object, so the
     * wrapper this test installs on it stays installed. Returning a fresh
     * one made the whole comparison silently observe nothing. */
    const c = {
        width: 0,
        height: 0,
        style: {},
        _ctx: null,
        getContext() {
            if (!c._ctx) {
                c._ctx = makeCtx();
                c._ctx.canvas = c;
            }
            return c._ctx;
        },
    };
    return c;
}

/* ---------- browser stubs ---------- */
global.window = global;
global.devicePixelRatio = 2;
global.innerWidth = 420;
global.innerHeight = 860;
global.addEventListener = () => {};
global.document = {
    createElement(tag) { return tag === "canvas" ? makeCanvas() : { style: {} }; },
    addEventListener() {},
    readyState: "complete",
};

for (const f of ["config.js", "storage.js", "sectors.js", "world.js", "render.js", "stations.js", "npcs.js"]) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const S = global.S7;
const W = S.World.world;
const C = S.CONFIG;
const P = S.PROJ;

let failures = 0;
let checks = 0;
function check(label, cond, extra) {
    checks++;
    if (cond) console.log("  PASS  " + label);
    else { failures++; console.log("  FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
}
function section(t) { console.log("\n=== " + t + " ==="); }

/* =========================================================================
 * 1. Projection
 * ====================================================================== */
section("projection");
{
    /* The cull is only exact if the view vector lies in the kernel of the
     * projection - the set of world directions that land on the same pixel.
     * That, not orthonormality, is what makes a face either visible or not.
     * (This is a sheared projection, not an orthographic one, so its axes
     * are deliberately NOT perpendicular to each other.) */
    const V = [P.viewX, P.viewY, P.viewZ];
    const projX = (v) => v[0] + P.yaw * v[2];
    const projY = (v) => v[1] * P.ySquash - v[2] * P.zTilt;

    check("view vector is in the kernel of the projection (maps to a point)",
        Math.abs(projX(V)) < 1e-9 && Math.abs(projY(V)) < 1e-9,
        projX(V).toFixed(9) + ", " + projY(V).toFixed(9));

    check("view vector is non-degenerate", Math.hypot(V[0], V[1], V[2]) > 1);

    const right = [1, 0, 0];
    check("world +x maps to screen-right", projX(right) > 0 && projY(right) === 0);
    check("world +y maps down the screen", projY([0, 1, 0]) > 0);
    check("world +z maps up the screen and sideways (the yaw shear)",
        projY([0, 0, 1]) < 0 && projX([0, 0, 1]) > 0);

    /* Occlusion key: bigger dot with the view vector means nearer. */
    check("larger depth means nearer",
        V[1] * 100 > V[1] * 0 && V[2] * 50 > 0);
    check("height raises a ship above the floor", V[2] > 0);
}

/* =========================================================================
 * 2. Mesh construction
 * ====================================================================== */
section("meshes");
{
    const M = S.Render._mesh;

    const station = M.buildStation();

    const meshes = {
        box: M.box(10, 6, 4),
        prism: M.prism(8, 10, 6, 5),
        pyramid: M.prism(6, 0, 8, 10),
        fighter: M.hullFighter(),
        scout: M.hullScout(),
        gunship: M.hullGunship(),
        heavy: M.hullHeavy(),
        "station core": station.core,
        "station ring": station.ring,
    };

    for (const [name, m] of Object.entries(meshes)) {
        const verts = m.v.length / 3;
        const faceRefs = m.f.every((f) => f.i.every((i) => i >= 0 && i < verts));
        const normalsUnit = m.f.every((f) => {
            const n = f.n;
            return Math.abs(Math.hypot(n[0], n[1], n[2]) - 1) < 1e-5;
        });
        const finiteVerts = m.v.every((v) => Number.isFinite(v));
        check(name + ": vertices are finite", finiteVerts);
        check(name + ": every face indexes a real vertex", faceRefs);
        check(name + ": every normal is unit length", normalsUnit);
        check(name + ": has faces to draw", m.f.length > 0, m.f.length);
    }

    check("a box has 6 faces", meshes.box.f.length === 6, meshes.box.f.length);
    check("a frustum has sides plus both caps",
        meshes.prism.f.length === 8 + 2, meshes.prism.f.length);
    check("a pyramid has no bottom cap", meshes.pyramid.f.length === 6 + 1,
        meshes.pyramid.f.length);

    /* Roughening moves verts, so the normals must be rebuilt to match -
     * otherwise every rock is lit from the wrong direction. */
    const before = meshes.prism.f[0].n.slice();
    M.roughen(meshes.prism, S.mulberry32(7), 0.25, 0.4);
    const after = meshes.prism.f[0].n.slice();
    const moved = Math.abs(before[0] - after[0]) + Math.abs(before[1] - after[1]) +
        Math.abs(before[2] - after[2]);
    check("roughening recomputes normals", moved > 1e-6, moved.toFixed(6));

    /* Face culling must keep roughly half of a closed box: the ones facing
     * the camera. Keeping all of them means the cull is broken; keeping none
     * means the view vector is pointing the wrong way. */
    const view = [P.viewX, P.viewY, P.viewZ];
    const visible = M.box(10, 6, 4).f.filter((f) =>
        f.n[0] * view[0] + f.n[1] * view[1] + f.n[2] * view[2] > 0).length;
    check("a box shows 2 to 3 of its 6 faces", visible >= 2 && visible <= 3, visible);

    /* And the cull must not depend on heading, which it must not because
     * ships only rotate around z. Rotating a face normal around z must not
     * change the sign of its view dot for a face whose z component is 0
     * beyond the yaw term - so just check it stays stable and finite. */
    check("culling inputs are finite for every hull face",
        meshes.fighter.f.every((f) => f.n.every(Number.isFinite)));
}

/* =========================================================================
 * 3. A real frame
 * ====================================================================== */
section("drawing a sector");
{
    S.Render.init(makeCanvas());
    S.World.generate(20250913);
    S.Render.bindWorld(W);
    S.NPCs.clear();
    S.NPCs.resetRng(20250913);

    const save = S.Storage.getShip();
    const stats = S.statsFor(save.modules);
    const player = S.World.spawnShip({
        isPlayer: true, name: "SMOKE", maxHull: stats.maxHull, stats,
        reduction: stats.reduction, radius: 16, energy: 500, z: 12,
    });
    player.x = W.station.x + 300;
    player.y = W.station.y + 120;
    W.player = player;
    S.NPCs.spawnAll(player);

    check("rock meshes were built", W.rocks.every((r) => !!r.mesh));
check("rock meshes are unique per rock",
        new Set(W.rocks.map((r) => r.mesh)).size === W.rocks.length);

    S.Render.snap(player.x, player.y);
    S.World.explode(player.x, player.y, player.z, "#fff", 12, "shard", 100);
    for (let i = 0; i < W.pickups.length; i++) {
        const p = W.pickups[i];
        if (i % 7) continue;
        p.on = true;
        p.kind = i % 14 ? "energy" : "crystal";
        p.value = 40;
        p.x = player.x + (i % 40) * 12;
        p.y = player.y + (i % 23) * 14;
        p.z = 8;
        p.life = 20;
    }
    for (let i = 0; i < W.bullets.length; i += 11) {
        const b = W.bullets[i];
        b.on = true;
        b.x = player.x + 40;
        b.y = player.y + 20;
        b.z = 12;
        b.r = 4;
        b.color = "#a5f3fc";
    }
    player.lockTarget = W.ships.find((s) => !s.isPlayer) || null;
    player.throttle = 1;
    W.docked = true;

    const frames = 12;
    for (let f = 0; f < frames; f++) {
        S.Render.follow(player, 1 / 60);
        S.Render.draw(W, 1 / 60);
    }

    check("frames produced draw calls", drawCalls > 1000, drawCalls);
    check("polygons were actually emitted", polygons > 100, polygons);
    check("glow sprites were blitted", imaged > 0, imaged);
    check("ships are given a hull mesh on first draw", W.ships.every((s) => !!s.mesh));
    check("ships of the same tier share a hull mesh (and only those)",
        W.ships.filter((s) => !s.isPlayer && s.tier === 1).every((s) => s.mesh === W.ships.find((x) => !x.isPlayer && x.tier === 1).mesh));
    check("no NaN or Infinity reached the canvas", badNumbers === 0,
        badNumbers + " " + JSON.stringify([...badWhere]));
    check("no degenerate polygon reached the canvas", badPolygons === 0, badPolygons);

    /* Minimap gets its own context, same deal. */
    const mm = makeCanvas();
    mm.width = 132;
    mm.height = 132;
    const before = badNumbers;
    S.Render.drawMinimap(mm.getContext("2d"), W);
    check("minimap draws cleanly", badNumbers === before);

    /* The camera must not wander off to NaN after a long follow. */
    for (let f = 0; f < 600; f++) {
        S.Render.follow(player, 1 / 60);
        S.Render.draw(W, 1 / 60);
        player.heading += 0.03;
    }
    check("camera stays finite after 600 frames",
        Number.isFinite(S.Render.camera.x) && Number.isFinite(S.Render.camera.y) &&
        Number.isFinite(S.Render.camera.zoom));
    check("camera zoom stays inside its clamp",
        S.Render.camera.zoom >= C.camera.zoomMin && S.Render.camera.zoom <= C.camera.zoomMax,
        S.Render.camera.zoom);
    check("still no NaN after 600 frames", badNumbers === 0, badNumbers);
}

/* =========================================================================
 * 4. The camera is actually a camera
 * ====================================================================== */
section("camera framing");
{
    const cam = S.Render.camera;
    const VW = global.innerWidth, VH = global.innerHeight;
    const cx = VW / 2, cy = VH / 2;
    const toScreen = S.Render.toScreen;

    cam.x = 1000;
    cam.y = 2000;
    cam.zoom = 1;
    cam.ox = 0;
    cam.oy = 0;

    const centre = toScreen(1000, 2000, 0);
    check("a point on the camera lands at the centre of the screen",
        Math.abs(centre[0] - cx) < 1e-6 && Math.abs(centre[1] - cy) < 1e-6,
        centre.map((v) => v.toFixed(2)).join(",") + " expected " + cx + "," + cy);

    /* This is the bug that shipped once: every solid was drawn half a screen
     * up and to the left, because project() returned camera-relative
     * coordinates without recentring them on the canvas. */
    const east = toScreen(1100, 2000, 0);
    check("+x is screen-right", east[0] > centre[0], east[0] - centre[0]);
    const south = toScreen(1000, 2100, 0);
    check("+y is screen-down", south[1] > centre[1], south[1] - centre[1]);
    const north = toScreen(1000, 1900, 0);
    check("-y is screen-up", north[1] < centre[1], centre[1] - north[1]);
    const high = toScreen(1000, 2000, 100);
    check("+z is screen-up", high[1] < centre[1], centre[1] - high[1]);
    check("+z also shears sideways (the yaw)", high[0] > centre[0], high[0] - centre[0]);

    /* Zoom has to scale the offset measured from the centre. Measuring from
     * the origin is the same bug again: 200 instead of centre + 200. */
    cam.zoom = 2;
    const zoomed = toScreen(1100, 2000, 0);
    check("zoom scales about the centre of the screen, not the origin",
        Math.abs(zoomed[0] - (centre[0] + 200)) < 1e-6,
        "got " + zoomed[0].toFixed(1) + ", want " + (centre[0] + 200).toFixed(1));

    cam.zoom = 1;
    cam.ox = 17;
    cam.oy = -9;
    const shaken = toScreen(1000, 2000, 0);
    check("shake offsets the whole frame without moving the maths",
        Math.abs(shaken[0] - (cx + 17)) < 1e-6 && Math.abs(shaken[1] - (cy - 9)) < 1e-6);
    cam.ox = 0;
    cam.oy = 0;

    /* Everything the renderer draws has to be reachable by the same
     * projection, or the bbox cull in drawMesh will throw away the wrong
     * faces. */
    /* Put the camera back on the player and let it re-fit. Throttle is
     * zeroed so the span is measured at rest, not mid-boost. */
    const p = W.player;
    p.throttle = 0;
    S.Render.snap(p.x, p.y);
    for (let f = 0; f < 30; f++) S.Render.follow(p, 1 / 60);
    cam.ox = 0;
    cam.oy = 0;

    const playerOnScreen = toScreen(p.x, p.y, p.z);
    check("the player is on screen after a re-fit",
        playerOnScreen[0] > 0 && playerOnScreen[0] < VW &&
        playerOnScreen[1] > 0 && playerOnScreen[1] < VH,
        playerOnScreen.map(Math.round).join(","));

    /* The fitted zoom must actually deliver the span it promises on any
     * viewport, or every "does the player get to see it" number below is a
     * guess. */
    check("the camera shows viewSpan world units across the short edge",
        Math.abs(Math.min(VW / cam.zoom, VH / (cam.zoom * P.ySquash)) - C.camera.viewSpan) < 1,
        (Math.min(VW / cam.zoom, VH / (cam.zoom * P.ySquash))).toFixed(1) +
        " vs " + C.camera.viewSpan);

    /* The rule the whole difficulty curve rests on: an NPC must never
     * commit to a fight from further away than the player can see. */
    const halfView = Math.min(VW, VH) / cam.zoom / 2;
    const maxAggro = S.aggroRange(C.npc.maxTier);
    check("no NPC can engage from off-screen",
        maxAggro <= halfView,
        "half-view " + halfView.toFixed(0) + " units, max aggro " + maxAggro);

    /* And the soft aim must not lock onto something invisible either. */
    check("auto-aim range stays inside the visible half-span",
        C.combat.aimAssistRange <= halfView,
        "range " + C.combat.aimAssistRange + ", half-view " + halfView.toFixed(0));

    /* A ship has to be big enough to read, and small enough that the view
     * still contains a fight. Both, from the same two numbers. */
    /* 30 world units forward of the nose, at the hull scale render uses. */
    const nose = toScreen(p.x + 30 * 2.4, p.y, p.z);
    const shipPx = Math.hypot(nose[0] - playerOnScreen[0], nose[1] - playerOnScreen[1]);
    check("the player ship reads at 20-60px on a phone",
        shipPx > 20 && shipPx < 60, shipPx.toFixed(1) + "px");

    const stationOnScreen = toScreen(W.station.x, W.station.y, 0);
    check("the station projects to real screen coordinates",
        Number.isFinite(stationOnScreen[0]) && Number.isFinite(stationOnScreen[1]));
}

/* =========================================================================
 * 4b. The renderer must agree with the projection
 * ====================================================================== */
section("drawMesh matches the projection");
{
    /* This is the test that was missing when the station shipped as a smear.
     * Every hull still looked "a bit soft", which read as an art choice, so
     * nothing flagged that the vertex stride was wrong. The only reliable
     * check is to push a known mesh through the real draw path and compare
     * every polygon against an independent projection of the same mesh. */
    const M = S.Render._mesh;
    const cam = S.Render.camera;
    const VW = global.innerWidth, VH = global.innerHeight;
    const ctx = S.Render.canvas().getContext("2d");

    /* The renderer stages projected vertices through a Float32Array, so the
     * comparison needs a tolerance - but a tight one. A stride bug smears
     * vertices hundreds of pixels, nowhere near this. */
    const TOL = 0.01;
    const samePolygon = (a, b) =>
        a.length === b.length &&
        a.every((p, i) => Math.abs(p[0] - b[i][0]) < TOL && Math.abs(p[1] - b[i][1]) < TOL);

    /* Reference implementation, written from the projection's definition
     * rather than copied out of the renderer. */
    function expectedPolygons(mesh, x, y, z, heading, zoom, scale) {
        const s = scale === undefined ? 1 : scale;
        const c = Math.cos(heading), sn = Math.sin(heading);
        const cc = c * s, ss = sn * s;
        const out = [];
        for (const f of mesh.f) {
            const rx = cc * f.n[0] - ss * f.n[1];
            const ry = ss * f.n[0] + cc * f.n[1];
            if (rx * P.viewX + ry * P.viewY + f.n[2] * P.viewZ <= 0) continue;

            const pts = f.i.map((i) => {
                const vx = mesh.v[i * 3], vy = mesh.v[i * 3 + 1], vz = mesh.v[i * 3 + 2];
                const wx = cc * vx - ss * vy + x;
                const wy = ss * vx + cc * vy + y;
                const wz = vz * s + z;
                return [
                    (wx - x) * zoom + wz * P.yaw * zoom + VW * 0.5,
                    (wy - y) * zoom * P.ySquash - wz * zoom * P.zTilt + VH * 0.5,
                ];
            });

            const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
            if (Math.max(...xs) < 0 || Math.min(...xs) > VW) continue;
            if (Math.max(...ys) < 0 || Math.min(...ys) > VH) continue;
            out.push(pts);
        }
        return out;
    }

    const drawn = [];
    ctx._record = true;
    ctx._onFill = (pts) => drawn.push(pts.map((p) => [p[0], p[1]]));

    const CASES = [
        { name: "station core (132 verts, 12-gon caps)", mesh: M.buildStation().core,
          x: 1000, y: 1000, z: 0, heading: 0.3, zoom: 0.9 },
        { name: "station ring, rotated", mesh: M.buildStation().ring,
          x: 1000, y: 1000, z: 8, heading: 2.7, zoom: 0.9 },
        { name: "station core, far off-centre", mesh: M.buildStation().core,
          x: 4300, y: 300, z: -4, heading: 4.1, zoom: 0.46 },
        { name: "fighter hull (56 verts)", mesh: M.hullFighter(),
          x: 2400, y: 2400, z: 12, heading: -1.1, zoom: 0.46 },
        { name: "fighter hull, nose up", mesh: M.hullFighter(),
          x: 2400, y: 2400, z: 12, heading: Math.PI / 2, zoom: 0.46 },
        { name: "heavy hull", mesh: M.hullHeavy(),
          x: 2400, y: 2400, z: 6, heading: 1.9, zoom: 0.46 },
        { name: "scout hull", mesh: M.hullScout(),
          x: 120, y: 4600, z: 3, heading: 0, zoom: 1.1 },
    ];

    let mismatches = 0;
    let totalDrawn = 0;
    for (const t of CASES) {
        const want = expectedPolygons(t.mesh, t.x, t.y, t.z, t.heading, t.zoom, t.scale);
        drawn.length = 0;
        cam.x = t.x; cam.y = t.y; cam.zoom = t.zoom; cam.ox = 0; cam.oy = 0;
        ctx._drawn = null;
        M.drawMesh(t.mesh, t.x, t.y, t.z, t.heading, [200, 200, 200], t.scale);
        const got = drawn.slice();
        totalDrawn += got.length;

        const unmatched = got.slice();
        let missing = 0;
        for (const w of want) {
            const at = unmatched.findIndex((g) => samePolygon(w, g));
            if (at >= 0) unmatched.splice(at, 1);
            else missing++;
        }

        if (missing !== 0 || unmatched.length !== 0) {
            mismatches++;
            console.log("      " + t.name + ": " + want.length + " expected, " +
                got.length + " drawn, " + missing + " wrong, " +
                unmatched.length + " spurious");
        }
    }

    check("every drawn polygon is exactly the projected face", mismatches === 0,
        mismatches + " of " + CASES.length + " meshes");
    check("the comparison actually drew something", totalDrawn > 50, totalDrawn);

    /* And the one that matters most: a mesh with many vertices must not smear
     * its vertices into their neighbours. */
    const station = M.buildStation().core;
    const wantStation = expectedPolygons(station, 1000, 1000, 0, 0.3, 0.9);
    drawn.length = 0;
    cam.x = 1000; cam.y = 1000; cam.zoom = 0.9; cam.ox = 0; cam.oy = 0;
    ctx._drawn = null;
    M.drawMesh(station, 1000, 1000, 0, 0.3, [200, 200, 200]);
    const spread = Math.max(...drawn.map((g) =>
        Math.max(...g.map((p) => Math.hypot(p[0] - VW / 2, p[1] - VH / 2)))));
    check("station vertices land where the projection says (no vertex smearing)",
        drawn.length === wantStation.length && spread < VW,
        drawn.length + "/" + wantStation.length + " faces, " + spread.toFixed(0) + "px spread");

    ctx._record = false;
    ctx._onFill = null;
}

/* =========================================================================
 * 5. Quality tiers
 * ====================================================================== */
section("quality tiers");
{
    S.Render.setQuality("low");
    const low = S.Render.quality();
    S.Render.setQuality("high");
    const high = S.Render.quality();
    check("low tier scales particles down", low.particles < high.particles);
    check("low tier drops outlines", low.outlines === false);
    check("low tier drops nebulae", low.nebula === false);
    check("low tier keeps at least one star layer", low.stars >= 1);

    /* A full frame at low quality must not touch the DOM-free paths. */
    const before = badNumbers;
    S.Render.setQuality("low");
    S.Render.draw(W, 1 / 60);
    S.Render.setQuality("high");
    check("low quality still draws cleanly", badNumbers === before);
}

console.log("\n" + "-".repeat(56));
console.log(`checks: ${checks}   failures: ${failures}`);
console.log(`canvas ops: ${drawCalls}   polygons: ${polygons}   sprites: ${imaged}`);
console.log("-".repeat(56));
process.exit(failures === 0 ? 0 : 1);