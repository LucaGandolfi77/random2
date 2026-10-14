/*
 * FORMICA - input del giocatore.
 *
 * Un solo schema di controllo per mouse, touch e tastiera: la testa si muove
 * sempre e tu la punti dove vuoi andare. Lo scatto è un input separato, così
 * non litiga mai con la sterzata.
 */
(function (L) {
    "use strict";

    var player = {
        marker: { active: false, x: 0, y: 0, age: 0 },
        boostHeld: false,
        padBoost: false,
        keyBoost: false,
        pointerBoost: false,
        keys: {},
        steerPointerId: null,
        canvas: null,
        lastInputAt: 0,
    };

    var KEY_ANGLES = {
        ArrowUp: -Math.PI / 2,
        ArrowDown: Math.PI / 2,
        ArrowLeft: Math.PI,
        ArrowRight: 0,
        w: -Math.PI / 2,
        s: Math.PI / 2,
        a: Math.PI,
        d: 0,
        W: -Math.PI / 2,
        S: Math.PI / 2,
        A: Math.PI,
        D: 0,
    };

    function onPointerDown(e) {
        if (player.steerPointerId === null) {
            player.steerPointerId = e.pointerId;
            setMarker(e);
            try { player.canvas.setPointerCapture(e.pointerId); } catch (err) { /* non fatale */ }
        } else {
            /* Ogni dito extra è uno scatto. */
            player.pointerBoost = true;
        }
        e.preventDefault();
    }

    function onPointerMove(e) {
        if (e.pointerId !== player.steerPointerId) return;
        setMarker(e);
    }

    function onPointerUp(e) {
        if (e.pointerId === player.steerPointerId) {
            player.steerPointerId = null;
            player.marker.active = false;
        } else {
            player.pointerBoost = false;
        }
    }

    function setMarker(e) {
        var rect = player.canvas.getBoundingClientRect();
        player.marker.x = e.clientX - rect.left;
        player.marker.y = e.clientY - rect.top;
        player.marker.active = true;
        player.marker.age = 0;
    }

    function onKeyDown(e) {
        if (e.repeat) return;
        player.keys[e.key] = true;
        if (e.key === " " || e.key === "Shift") {
            player.keyBoost = true;
            e.preventDefault();
        }
        if (KEY_ANGLES[e.key] !== undefined) e.preventDefault();
    }

    function onKeyUp(e) {
        player.keys[e.key] = false;
        if (e.key === " " || e.key === "Shift") player.keyBoost = false;
    }

    function init(canvas, boostPad) {
        player.canvas = canvas;

        canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        canvas.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        if (boostPad) {
            boostPad.addEventListener("pointerdown", function (e) {
                player.padBoost = true;
                boostPad.classList.add("is-down");
                e.preventDefault();
            });
            var release = function () {
                player.padBoost = false;
                boostPad.classList.remove("is-down");
            };
            boostPad.addEventListener("pointerup", release);
            boostPad.addEventListener("pointercancel", release);
            boostPad.addEventListener("pointerleave", release);
        }
    }

    function angDiff(a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    function update(dt, world) {
        var p = world.player;
        if (!p || !p.alive) {
            player.marker.active = false;
            return;
        }

        player.marker.age += dt;

        var keyAngle = null;
        for (var k in KEY_ANGLES) {
            if (player.keys[k]) { keyAngle = KEY_ANGLES[k]; break; }
        }

        if (keyAngle !== null) {
            p.targetAngle = keyAngle;
            player.lastInputAt = world.time;
        } else if (player.marker.active && L.Camera) {
            var w = L.Camera.screenToWorld(player.marker.x, player.marker.y);
            /* Zona morta attorno alla testa, o un pollice a riposo ti fa
             * girare su te stesso. */
            if (L.dist2(p.x, p.y, w.x, w.y) > 26 * 26) {
                p.targetAngle = Math.atan2(w.y - p.y, w.x - p.x);
                player.lastInputAt = world.time;
            }
        }

        player.boostHeld = player.padBoost || player.keyBoost || player.pointerBoost;
        p.boost = player.boostHeld ? 0.12 : 0;
    }

    function reset() {
        player.boostHeld = false;
        player.padBoost = false;
        player.keyBoost = false;
        player.pointerBoost = false;
        player.steerPointerId = null;
        player.marker.active = false;
        player.keys = {};
    }

    L.Player = {
        init: init,
        update: update,
        reset: reset,
        state: player,
    };

})(window.FORMICA = window.FORMICA || {});
