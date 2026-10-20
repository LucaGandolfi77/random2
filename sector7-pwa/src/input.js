/*
 * SECTOR 7 - input.
 *
 * One control scheme across touch, mouse and keyboard. The stick is anchored
 * wherever your left thumb lands, which is the only thing that works on a
 * phone once you stop looking at the screen; the buttons are fixed and
 * always in the same place because muscle memory beats layout.
 */
(function (S) {
    "use strict";

    var RADIUS = 54;

    var input = {
        mx: 0,            // stick vector, -1..1 each axis
        my: 0,
        mag: 0,
        firing: false,
        docking: false,
        /* The mining beam is a HOLD, not an edge: it is a tool you keep
         * on a rock, not a shot you spend. */
        beaming: false,
        /* Edge-triggered weapons: one press, one salvo. A held missile button
         * would empty the magazine into the same hull every cooldown. */
        missileHeld: false,
        missileEdge: false,
        mineHeld: false,
        mineEdge: false,
        ammoHeld: false,
        ammoEdge: false,
        /* The plasma round: one press, one heavy round. */
        plasmaHeld: false,
        plasmaEdge: false,
        cpuHeld: false,
        cpuEdge: false,
        /* Targeting: one press locks or unlocks, one press cycles. Both are
         * edge-triggered so holding the screen never thrashes the lock. */
        targetEdge: false,
        cycleEdge: false,
        /* A click on the map, in canvas pixels. The input layer records where
         * the pointer went; the player controller decides whether that was
         * "select that ship" or "fly there". */
        clickEdge: false,
        clickX: 0,
        clickY: 0,
        /* A click on the minimap, in the minimap's own pixels. It is the
         * same map at a wider scale, so it means the same thing. */
        mapEdge: false,
        mapX: 0,
        mapY: 0,
        /* The lock-on shot. Edge-triggered: one press, one shot, and it
         * carries its own cooldown in the world so it never queues behind
         * the blaster. */
        attackEdge: false,
        keys: {},
        touchActive: false,
        stickId: null,
        baseX: 0,
        baseY: 0,
    };

    var els = {};
    var canvas = null;

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function placeBase(x, y) {
        var pad = 26;
        input.baseX = S.clamp(x, pad + RADIUS, window.innerWidth - pad - RADIUS);
        input.baseY = S.clamp(y, pad + RADIUS, window.innerHeight - pad - RADIUS);
        els.stick.style.left = input.baseX + "px";
        els.stick.style.top = input.baseY + "px";
    }

    function defaultBase() {
        var pad = 34 + RADIUS;
        return {
            x: Math.min(pad, window.innerWidth * 0.22),
            y: window.innerHeight - Math.min(pad, window.innerHeight * 0.24),
        };
    }

    function showStick(on) {
        els.stick.classList.toggle("is-live", on);
        if (!on) els.knob.style.transform = "translate(-50%, -50%)";
    }

    function onStickDown(e) {
        if (input.stickId !== null) return;
        /* A mouse never grabs the thumb stick. On a desktop the pointer is
         * a cursor, not a thumb, and a click on the left half of the map
         * is an order to fly somewhere - not the start of a drag. */
        if (e.pointerType === "mouse") return;
        /* The right half belongs to the action buttons. */
        if (e.clientX > window.innerWidth * 0.52) return;

        input.stickId = e.pointerId;
        input.touchActive = true;
        document.body.classList.add("is-touch");
        placeBase(e.clientX, e.clientY);
        showStick(true);
        onStickMove(e);
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
        e.preventDefault();
    }

    function onStickMove(e) {
        if (e.pointerId !== input.stickId) return;
        var dx = e.clientX - input.baseX;
        var dy = e.clientY - input.baseY;
        var d = Math.sqrt(dx * dx + dy * dy);

        if (d > RADIUS) {
            /* Drag the base along with the thumb when you run out of stick,
             * so long drags never feel like they hit an invisible wall. */
            var over = d - RADIUS;
            placeBase(input.baseX + (dx / d) * over, input.baseY + (dy / d) * over);
            dx = e.clientX - input.baseX;
            dy = e.clientY - input.baseY;
            d = Math.sqrt(dx * dx + dy * dy);
        }

        var k = d > 0 ? RADIUS / Math.max(d, 1e-4) : 0;
        input.mx = (dx * k) / RADIUS;
        input.my = (dy * k) / RADIUS;
        input.mag = clamp01(d / RADIUS);

        els.knob.style.transform =
            "translate(calc(-50% + " + dx.toFixed(1) + "px), calc(-50% + " + dy.toFixed(1) + "px))";
        e.preventDefault();
    }

    function onStickUp(e) {
        if (e.pointerId !== input.stickId) return;
        input.stickId = null;
        input.mx = 0;
        input.my = 0;
        input.mag = 0;
        showStick(false);
    }

    /* Raises a one-frame edge flag. Weapons are edge-triggered: a held
     * missile button would empty the whole magazine into one hull every
     * cooldown, which is not what a salvo is for.
     *
     * `kind` is the weapon ("missile" / "mine"), and the flag is
     * `kind + "Edge"`. Passing the held flag's name here instead would raise
     * "missileHeldEdge", which nothing ever reads - the press would be
     * silently dropped and the weapon would never fire. */
    function pressWeapon(kind) {
        input[kind + "Edge"] = true;
    }

    /* Edges are cleared once per frame, after the player controller has read
     * them. */
    function consumeEdges() {
        input.missileEdge = false;
        input.mineEdge = false;
        input.ammoEdge = false;
        input.plasmaEdge = false;
        input.cpuEdge = false;
        input.targetEdge = false;
        input.cycleEdge = false;
        input.clickEdge = false;
        input.attackEdge = false;
    }

    /* A tap on the right half that misses every button is a target press. The
     * right half is otherwise dead space, so this costs nothing on a phone
     * and gives a mouse player the same lock a keyboard player gets. */
    function onCanvasTap(e) {
        if (input.stickId !== null) return;
        /* The mouse gets the whole canvas and a real pick instead: it can
         * tell which ship it was pointing at, this cannot. */
        if (e.pointerType === "mouse") return;
        if (e.clientX <= window.innerWidth * 0.52) return;
        /* Anything sitting under a pad belongs to that pad. */
        var t = e.target;
        if (t && t.closest && t.closest(".pad-right")) return;
        pressWeapon("target");
    }

    /* A mouse click anywhere on the map.
     *
     * The click is recorded in canvas pixels and handed to the player
     * controller, which is the only thing that knows how to turn a point on
     * the screen into either a ship to lock or a place to fly to. Doing it
     * here would mean the input layer reaching into the world, and the two
     * decisions are genuinely different: a click on a hull and a click on
     * empty space mean opposite things. */
    function onWorldClick(e) {
        if (e.pointerType !== "mouse") return;
        /* Anything sitting under a pad belongs to that pad. */
        var t = e.target;
        if (t && t.closest && t.closest(".pad-right")) return;

        var rect = canvas.getBoundingClientRect();
        input.clickX = e.clientX - (rect ? rect.left : 0);
        input.clickY = e.clientY - (rect ? rect.top : 0);
        input.clickEdge = true;
        e.preventDefault();
    }

    /* A click on the minimap.
     *
     * The minimap is the same sector from further away, so a click on it
     * is a click on the map. The pixels are recorded in the minimap's own
     * coordinates rather than the screen's, because the two are not the
     * same size on a narrow phone. */
    function onMinimapClick(e) {
        if (e.pointerType !== "mouse") return;
        var el = els.minimap;
        if (!el || !el.width) return;
        var rect = el.getBoundingClientRect();
        if (!rect || !rect.width) return;
        var scale = el.width / rect.width;
        input.mapX = (e.clientX - rect.left) * scale;
        input.mapY = (e.clientY - rect.top) * scale;
        input.mapEdge = true;
        e.preventDefault();
    }

    /* ===== Buttons ===== */
    function holdButton(elm, set) {
        if (!elm) return;
        var down = function (e) {
            input.touchActive = true;
            document.body.classList.add("is-touch");
            set(true);
            elm.classList.add("is-down");
            e.preventDefault();
            e.stopPropagation();
        };
        var up = function (e) {
            set(false);
            elm.classList.remove("is-down");
            if (e) { e.preventDefault(); e.stopPropagation(); }
        };
        elm.addEventListener("pointerdown", down);
        elm.addEventListener("pointerup", up);
        elm.addEventListener("pointercancel", up);
        elm.addEventListener("pointerleave", up);
        elm.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }

    /* ===== Keyboard ===== */
    var KEY_VECTORS = {
        w: [0, -1], W: [0, -1], ArrowUp: [0, -1],
        s: [0, 1], S: [0, 1], ArrowDown: [0, 1],
        a: [-1, 0], A: [-1, 0], ArrowLeft: [-1, 0],
        d: [1, 0], D: [1, 0], ArrowRight: [1, 0],
    };

    function onKeyDown(e) {
        if (e.repeat) return;

        /* The lock-on shot. Ctrl (or Cmd on a Mac, where Ctrl is a system
         * gesture) fires at whatever the player has selected.
         *
         * Only the modifier key ITSELF is the trigger. Every other chord
         * that happens to carry a modifier - Ctrl+R, Ctrl+W, Cmd+Q - is a
         * browser shortcut and has to keep working, or the player cannot
         * reload the page in the middle of a fight. */
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "Control" || e.key === "Meta") {
                input.attackEdge = true;
                e.preventDefault();
            }
            return;
        }

        input.keys[e.key] = true;
        if (e.key === " " || e.key === "Enter") {
            input.firing = true;
            e.preventDefault();
        }
        if (e.key === "e" || e.key === "E") input.docking = true;
        if (e.key === "m" || e.key === "M") pressWeapon("missile");
        if (e.key === "b" || e.key === "B") pressWeapon("mine");
        if (e.key === "x" || e.key === "X") pressWeapon("ammo");
        if (e.key === "v" || e.key === "V") pressWeapon("plasma");
        if (e.key === "c" || e.key === "C") input.beaming = true;
        if (e.key === "f" || e.key === "F") pressWeapon("cpu");
        if (e.key === "t" || e.key === "T") pressWeapon("cycle");
        if (KEY_VECTORS[e.key]) e.preventDefault();
    }

    function onKeyUp(e) {
        input.keys[e.key] = false;
        if (e.key === " " || e.key === "Enter") input.firing = false;
        if (e.key === "e" || e.key === "E") input.docking = false;
        if (e.key === "m" || e.key === "M") input.missileHeld = false;
        if (e.key === "b" || e.key === "B") input.mineHeld = false;
        if (e.key === "x" || e.key === "X") input.ammoHeld = false;
        if (e.key === "v" || e.key === "V") input.plasmaHeld = false;
        if (e.key === "c" || e.key === "C") input.beaming = false;
        if (e.key === "f" || e.key === "F") input.cpuHeld = false;
    }

    /* Keyboard and stick are summed, then clamped once, so a diagonal on the
     * keyboard does not move faster than a straight line. */
    function sample() {
        if (input.stickId !== null) return;

        var kx = 0, ky = 0;
        for (var key in KEY_VECTORS) {
            if (!input.keys[key]) continue;
            kx += KEY_VECTORS[key][0];
            ky += KEY_VECTORS[key][1];
        }

        if (kx === 0 && ky === 0) {
            /* Coast to a stop rather than snapping the throttle shut. */
            input.mag *= 0.86;
            if (input.mag < 0.02) input.mag = 0;
            return;
        }

        var d = Math.sqrt(kx * kx + ky * ky);
        input.mx = kx / d;
        input.my = ky / d;
        input.mag = clamp01(input.mag + 0.28);
        if (input.mag > 1) input.mag = 1;
    }

    function onResize() {
        var d = defaultBase();
        if (input.stickId === null) placeBase(d.x, d.y);
        else placeBase(input.baseX, input.baseY);
    }

    function init(canvasEl) {
        canvas = canvasEl;
        els.stick = document.getElementById("stick");
        els.knob = document.getElementById("stick-knob");
        els.fire = document.getElementById("btn-fire");
        els.missile = document.getElementById("btn-missile");
        els.mine = document.getElementById("btn-mine");
        els.ammo = document.getElementById("btn-ammo");
        els.plasma = document.getElementById("btn-plasma");
        els.beam = document.getElementById("btn-beam");
        els.cpu = document.getElementById("btn-cpu");
        els.dock = document.getElementById("btn-dock");
        els.minimap = document.getElementById("minimap");

        var d = defaultBase();
        placeBase(d.x, d.y);

        canvas.addEventListener("pointerdown", onStickDown, { passive: false });
        canvas.addEventListener("pointerdown", onCanvasTap, { passive: false });
        canvas.addEventListener("pointerdown", onWorldClick, { passive: false });
        canvas.addEventListener("pointermove", onStickMove, { passive: false });
        if (els.minimap) {
            els.minimap.addEventListener("pointerdown", onMinimapClick, { passive: false });
        }
        window.addEventListener("pointerup", onStickUp);
        window.addEventListener("pointercancel", onStickUp);

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);

        holdButton(els.fire, function (v) { input.firing = v; });
        holdButton(els.missile, function (v) {
            if (v) pressWeapon("missile");
            input.missileHeld = v;
        });
        holdButton(els.mine, function (v) {
            if (v) pressWeapon("mine");
            input.mineHeld = v;
        });
        holdButton(els.ammo, function (v) {
            if (v) pressWeapon("ammo");
            input.ammoHeld = v;
        });
        holdButton(els.plasma, function (v) {
            if (v) pressWeapon("plasma");
            input.plasmaHeld = v;
        });
        holdButton(els.beam, function (v) {
            input.beaming = v;
        });
        holdButton(els.cpu, function (v) {
            if (v) pressWeapon("cpu");
            input.cpuHeld = v;
        });
        holdButton(els.dock, function (v) {
            input.docking = v;
            els.dock.classList.toggle("is-armed", S.World.inDockZone(
                S.World.world.player ? S.World.world.player.x : 0,
                S.World.world.player ? S.World.world.player.y : 0
            ));
        });

        /* Kill the iOS double-tap zoom and long-press callout entirely. */
        document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
        document.addEventListener("contextmenu", function (e) {
            if (e.target === canvas) e.preventDefault();
        });
    }

    function reset() {
        input.mx = 0;
        input.my = 0;
        input.mag = 0;
        input.firing = false;
        input.docking = false;
        input.beaming = false;
        input.missileHeld = input.missileEdge = false;
        input.mineHeld = input.mineEdge = false;
        input.ammoHeld = input.ammoEdge = false;
        input.plasmaHeld = input.plasmaEdge = false;
        input.cpuHeld = input.cpuEdge = false;
        input.targetEdge = false;
        input.cycleEdge = false;
        input.clickEdge = false;
        input.clickX = 0;
        input.clickY = 0;
        input.mapEdge = false;
        input.mapX = 0;
        input.mapY = 0;
        input.attackEdge = false;
        input.stickId = null;
        input.keys = {};
        showStick(false);
    }

    function tick() { sample(); }

    /* Called after the sim has read this frame's weapon edges. */
    function endFrame() { consumeEdges(); }

    S.Input = {
        init: init,
        tick: tick,
        endFrame: endFrame,
        reset: reset,
        state: input,
        radius: RADIUS,
    };

})(window.S7 = window.S7 || {});