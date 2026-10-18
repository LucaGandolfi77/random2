/*
 * IRONFALL - touch input, and the keyboard parity layer.
 *
 * The hard problem on a phone is that a MOBA needs five things at once: move,
 * aim, cast four abilities, and look around. That does not fit on one thumb,
 * so the scheme splits by screen half - left thumb moves, right thumb aims
 * and casts - and the ability buttons live in the bottom-right corner where
 * a thumb naturally rests rather than where a mouse cursor would be.
 *
 * The stick is thumb-anchored rather than fixed. A fixed stick costs a player
 * the first four seconds of every match looking down to find it, and after
 * that it is worth nothing extra.
 */
(function (S) {
    "use strict";

    var RADIUS = 52;

    var input = {
        /* Movement vector, magnitude 0..1. Consumed by world.moveUnit. */
        mx: 0, my: 0, mag: 0,
        stickId: null,
        baseX: 0, baseY: 0,
        stickShown: false,
        touchActive: false,

        /* Ability intent. Held rather than latched: an ability button held
         * down should fire the instant its cooldown ends, because tapping a
         * button 200 times a second is not a thing anyone should have to do. */
        abilityHeld: [false, false, false, false],
        abilityEdge: [false, false, false, false],
        ultimateHeld: false,

        /* Aim. A drag on the right half sets a world point; abilities with
         * `point` or `direction` targeting cast there. */
        aiming: false,
        aimId: null,
        aimX: 0, aimY: 0,
        aimActive: false,

        /* Ping: a tap on the minimap. */
        pingWorld: null,
        pingEdge: false,

        keys: {},
        lastInputAt: -999
    };

    var els = {};
    var hook = {};

    function bind(hooks) {
        hook = hooks || {};
        els = {
            stick: document.getElementById("stick"),
            knob: document.getElementById("stick-knob"),
            aim: document.getElementById("aim-ring"),
            minimap: document.getElementById("minimap")
        };
    }

    function init(canvas) {
        if (!canvas) return;
        canvas.style.touchAction = "none";

        canvas.addEventListener("pointerdown", onDown, { passive: false });
        canvas.addEventListener("pointermove", onMove, { passive: false });
        canvas.addEventListener("pointerup", onUp, { passive: false });
        canvas.addEventListener("pointercancel", onUp, { passive: false });

        /* The minimap is its own hit target. It must not also start a stick
         * drag, which it would if the event bubbled to the canvas - and it
         * did, which is the kind of bug that makes a whole control scheme
         * feel broken rather than wrong. */
        if (els.minimap) {
            els.minimap.addEventListener("pointerdown", onMinimapDown, { passive: false });
        }

        /* Ability pads. Each is bound by data-slot so the markup declares
         * the order and this file does not have to know it. */
        var pads = document.querySelectorAll("[data-slot]");
        for (var i = 0; i < pads.length; i++) {
            holdButton(pads[i], i);
        }

        /* Keyboard parity: WASD to move, 1-4 to cast, B to recall, T for the
         * scoreboard. Present so the game is playable on a desktop without
         * being designed for one. */
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        /* Kill the browser's own gestures outright. Every one of them -
         * pinch zoom, double tap zoom, long press callout, pull to refresh -
         * fires mid-fight and none of them can be allowed to. */
        document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
        document.addEventListener("dblclick", function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener("contextmenu", function (e) {
            if (e.target === canvas || (els.stick && els.stick.contains && els.stick.contains(e.target))) {
                e.preventDefault();
            }
        });

        window.addEventListener("blur", function () { reset(); });
    }

    /* ===== Movement stick =====
     * Left half only. The split is at 52% rather than 50% because the aim
     * side is the one that needs the extra pixel: a right thumb reaching
     * diagonally is shorter than a left thumb reaching across. */
    function onDown(e) {
        input.lastInputAt = performance.now();
        var w = window.innerWidth;

        if (input.stickId === null && e.clientX < w * 0.52) {
            input.stickId = e.pointerId;
            input.baseX = e.clientX;
            input.baseY = e.clientY;
            input.touchActive = true;
            document.body.classList.add("is-touch");
            showStick(true, e.clientX, e.clientY);
            try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
            onMove(e);
            e.preventDefault();
            return;
        }

        /* Right half: aim. Press begins an aim drag, and the ability being
         * held at release time decides which one fires. That indirection is
         * what lets one thumb aim and cast without a separate button. */
        if (input.aimId === null) {
            input.aimId = e.pointerId;
            input.aiming = true;
            input.aimActive = true;
            showAim(true, e.clientX, e.clientY);
            try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
            onMove(e);
            e.preventDefault();
        }
    }

    function onMove(e) {
        input.lastInputAt = performance.now();
        if (e.pointerId === input.stickId) {
            var dx = e.clientX - input.baseX, dy = e.clientY - input.baseY;
            var d = Math.sqrt(dx * dx + dy * dy);
            /* Drag the base along when the thumb runs past the ring. Without
             * this, a long walk hits an invisible wall at 52 pixels and a
             * player has to lift and re-place - which on a MOBA walk is
             * unacceptable. */
            if (d > RADIUS) {
                var over = d - RADIUS;
                input.baseX += dx / d * over;
                input.baseY += dy / d * over;
                showStick(true, input.baseX, input.baseY);
                dx = e.clientX - input.baseX;
                dy = e.clientY - input.baseY;
                d = Math.sqrt(dx * dx + dy * dy);
            }
            var k = d > 0 ? RADIUS / Math.max(d, 1e-4) : 0;
            input.mx = dx * k / RADIUS;
            input.my = dy * k / RADIUS;
            input.mag = S.clamp01(d / RADIUS);
            if (els.knob) {
                els.knob.style.transform =
                    "translate(calc(-50% + " + dx.toFixed(1) + "px), calc(-50% + " + dy.toFixed(1) + "px))";
            }
            e.preventDefault();
            return;
        }

        if (e.pointerId === input.aimId) {
            if (hook.toWorld) {
                var wpt = hook.toWorld(e.clientX, e.clientY);
                input.aimX = wpt.x;
                input.aimY = wpt.y;
            }
            showAim(true, input.aimScreenX, input.aimScreenY);
            if (els.aim) {
                /* Move the ring marker rather than the origin: a fixed
                 * origin with a travelling dot is how every mobile MOBA
                 * shows a drag, and it is unambiguous about which end of the
                 * gesture is which. */
                els.aim.style.left = e.clientX + "px";
                els.aim.style.top = e.clientY + "px";
            }
            e.preventDefault();
        }
    }

    function onUp(e) {
        if (e.pointerId === input.stickId) {
            input.stickId = null;
            input.mx = 0; input.my = 0; input.mag = 0;
            showStick(false);
            e.preventDefault();
        }
        if (e.pointerId === input.aimId) {
            input.aimId = null;
            input.aiming = false;
            showAim(false);
            /* The aim survives the finger lifting, because the player
             * usually drags, releases, then taps the ability. Clearing it
             * here would mean every cast needed a live finger on the aim. */
            e.preventDefault();
        }
    }

    function onMinimapDown(e) {
        if (!els.minimap || !hook.minimapToWorld) return;
        var r = els.minimap.getBoundingClientRect();
        var wpt = hook.minimapToWorld(e.clientX - r.left, e.clientY - r.top);
        input.pingWorld = wpt;
        input.pingEdge = true;
        e.preventDefault();
        e.stopPropagation();
    }

    /* ===== Ability pads =====
     *
     * Held, not tapped. An ability that is on cooldown when you press its
     * button should fire the moment it comes up if you are still holding it -
     * in a three-man fight the window between "my ult is ready" and "I press
     * my thumb" is a fifth of a second and there is no time to be precise. */
    function holdButton(el, slot) {
        var id = null;
        function down(e) {
            id = e.pointerId;
            input.abilityHeld[slot] = true;
            input.abilityEdge[slot] = true;
            el.classList.add("is-held");
            if (hook.haptic) hook.haptic(12);
            try { el.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
            e.preventDefault();
            e.stopPropagation();
        }
        function up(e) {
            if (id !== null && e.pointerId !== id) return;
            id = null;
            input.abilityHeld[slot] = false;
            el.classList.remove("is-held");
            try { el.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
            e.preventDefault();
            e.stopPropagation();
        }
        el.addEventListener("pointerdown", down, { passive: false });
        el.addEventListener("pointerup", up, { passive: false });
        el.addEventListener("pointercancel", up, { passive: false });
        el.addEventListener("lostpointercapture", function () {
            input.abilityHeld[slot] = false;
            el.classList.remove("is-held");
        });
    }

    /* ===== Keyboard ===== */
    var KEYMAP = {
        KeyQ: 0, Digit1: 0,
        KeyW: 1, Digit2: 1,
        KeyE: 2, Digit3: 2,
        KeyR: 3, Digit4: 3
    };

    function onKeyDown(e) {
        input.keys[e.code] = true;
        if (e.code in KEYMAP) {
            input.abilityHeld[KEYMAP[e.code]] = true;
            input.abilityEdge[KEYMAP[e.code]] = true;
            e.preventDefault();
        }
        if (e.code === "KeyB") { input.recallEdge = true; e.preventDefault(); }
        if (e.code === "Escape" && hook.onPause) hook.onPause();
    }

    function onKeyUp(e) {
        input.keys[e.code] = false;
        if (e.code in KEYMAP) input.abilityHeld[KEYMAP[e.code]] = false;
    }

    /* Keyboard movement, folded into the same {x,y,mag} the stick produces so
     * that moveUnit has exactly one input path. */
    function keyboardVector() {
        var x = 0, y = 0;
        if (input.keys.KeyA || input.keys.ArrowLeft) x -= 1;
        if (input.keys.KeyD || input.keys.ArrowRight) x += 1;
        if (input.keys.KeyW || input.keys.ArrowUp) y -= 1;
        if (input.keys.KeyS || input.keys.ArrowDown) y += 1;
        var len = Math.sqrt(x * x + y * y);
        if (len < 1e-4) return null;
        return { x: x / len, y: y / len };
    }

    /* ===== Stick visuals ===== */
    function showStick(on, x, y) {
        input.stickShown = on;
        if (!els.stick) return;
        if (on) {
            els.stick.style.left = (x || input.baseX) + "px";
            els.stick.style.top = (y || input.baseY) + "px";
        }
        els.stick.classList.toggle("is-on", on);
    }

    function showAim(on, x, y) {
        if (!els.aim) return;
        if (on && x !== undefined) {
            input.aimScreenX = x;
            input.aimScreenY = y;
        }
        els.aim.classList.toggle("is-on", on);
    }

    /* ===== Readout =====
     * One function the game loop calls to pull the whole input state. Edge
     * flags are cleared here, at the single point where they are consumed,
     * which is what stops a press from firing twice or not at all. */
    function read() {
        var kv = keyboardVector();
        if (kv) {
            input.mx = kv.x;
            input.my = kv.y;
            input.mag = 1;
        } else if (input.stickId === null) {
            /* No keyboard input and no finger down: coast to a stop rather
             * than snapping, so releasing the stick does not read as a
             * deliberate stop command. */
            input.mag *= 0.86;
            if (input.mag < 0.02) input.mag = 0;
        }

        var out = {
            mx: input.mx, my: input.my, mag: input.mag,
            aimX: input.aimX, aimY: input.aimY,
            aimActive: input.aimActive,
            abilities: input.abilityHeld,
            edges: input.abilityEdge.slice(),
            ping: input.pingEdge ? input.pingWorld : null,
            recall: !!input.recallEdge
        };

        /* Clear the one-shot edges. Done here and nowhere else, so a
         * developer cannot accidentally clear them before the loop reads
         * them. */
        input.abilityEdge[0] = false;
        input.abilityEdge[1] = false;
        input.abilityEdge[2] = false;
        input.abilityEdge[3] = false;
        input.pingEdge = false;
        input.recallEdge = false;

        return out;
    }

    function reset() {
        input.stickId = null;
        input.aimId = null;
        input.aiming = false;
        input.mx = 0; input.my = 0; input.mag = 0;
        input.abilityHeld[0] = input.abilityHeld[1] = false;
        input.abilityHeld[2] = input.abilityHeld[3] = false;
        input.ultimateHeld = false;
        showStick(false);
        showAim(false);
    }

    S.Input = {
        init: init,
        bind: bind,
        read: read,
        reset: reset,
        state: input,
        radius: RADIUS
    };

})(window.IF = window.IF || {});
