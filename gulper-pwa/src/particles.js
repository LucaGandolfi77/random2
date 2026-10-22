/*
 * GULPER - particles.
 *
 * Every particle is one or two pixels. That is not a stylistic choice made
 * here: the whole scene is a 200-to-640 pixel buffer, so a particle that
 * is a drawn circle would be a blob that covers a dozen pixels and reads
 * as a smear. A single lit pixel reads as a spark.
 *
 * The particle pool is fixed-size and reused, so a long level cannot
 * accumulate garbage.
 */
(function (S) {
    "use strict";

    var MAX = 900;

    function create() {
        var pool = [];
        for (var i = 0; i < MAX; i++) {
            pool.push({
                alive: false, x: 0, y: 0, z: 0,
                vx: 0, vy: 0, vz: 0,
                life: 0, maxLife: 1,
                color: 0, size: 1,
                kind: "dot", gravity: 0, drag: 0
            });
        }
        return {
            pool: pool,
            count: 0,
            /* Cheap counter for the render budget. */
            quality: 1
        };
    }

    function alloc(p) {
        for (var i = 0; i < p.pool.length; i++) {
            var q = p.pool[i];
            if (!q.alive) { q.alive = true; p.count++; return q; }
        }
        return null;
    }

    /* A generic burst. `spec` supplies the numbers; there are no presets
     * because every effect in the game wants different ones. */
    function spawn(p, spec) {
        var q = alloc(p);
        if (!q) return null;
        q.x = spec.x || 0;
        q.y = spec.y || 0;
        q.z = spec.z || 0;
        q.vx = spec.vx || 0;
        q.vy = spec.vy || 0;
        q.vz = spec.vz || 0;
        q.maxLife = spec.life || 0.5;
        q.life = q.maxLife;
        q.color = spec.color || 0xffffff;
        q.size = spec.size || 1;
        q.kind = spec.kind || "dot";
        q.gravity = spec.gravity || 0;
        q.drag = spec.drag === undefined ? 1.6 : spec.drag;
        return q;
    }

    /* A radial spray, used for impacts, chitin breaks and gulps. */
    function burst(p, x, y, z, count, color, opts) {
        opts = opts || {};
        var n = Math.max(1, Math.round(count * (p.quality || 1)));
        for (var i = 0; i < n; i++) {
            var a = opts.angle === undefined ? Math.random() * Math.PI * 2 : opts.angle + (Math.random() - 0.5) * (opts.spread || 1);
            var sp = (opts.speed || 40) * (0.4 + Math.random() * 0.8);
            spawn(p, {
                x: x, y: y, z: z,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                vz: (opts.lift || 20) * (0.2 + Math.random()),
                life: (opts.life || 0.5) * (0.6 + Math.random() * 0.8),
                color: color,
                size: opts.size || 1,
                gravity: opts.gravity === undefined ? 60 : opts.gravity,
                drag: opts.drag === undefined ? 2.2 : opts.drag
            });
        }
    }

    function update(p, dt) {
        for (var i = 0; i < p.pool.length; i++) {
            var q = p.pool[i];
            if (!q.alive) continue;
            q.life -= dt;
            if (q.life <= 0) { q.alive = false; p.count--; continue; }
            var damp = Math.exp(-q.drag * dt);
            q.vx *= damp;
            q.vy *= damp;
            q.vz -= q.gravity * dt;
            q.x += q.vx * dt;
            q.y += q.vy * dt;
            q.z += q.vz * dt;
            if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.7; q.vy *= 0.7; }
        }
    }

    function clear(p) {
        for (var i = 0; i < p.pool.length; i++) p.pool[i].alive = false;
        p.count = 0;
    }

    S.Particles = {
        create: create,
        spawn: spawn,
        burst: burst,
        update: update,
        clear: clear,
        MAX: MAX
    };
})(window.GU = window.GU || {});
