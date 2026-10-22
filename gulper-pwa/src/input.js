/*
 * GULPER - input.
 *
 * The hard problem on a phone is that this game needs five things at
 * once: move, aim, attack, swallow, and swap weapon. That does not fit
 * on one thumb, so the scheme splits by screen half - the left thumb
 * moves, the right thumb aims and attacks - and the buttons live in the
 * bottom-right corner where a thumb naturally rests.
 *
 * The stick is thumb-anchored rather than fixed. A fixed stick costs a
 * player the first four seconds of every level looking down to find it,
 * and after that it is worth nothing extra.
 *
 * The keyboard gets a full parity layer, because a desktop player should
 * not have to hold a mouse button to swap weapons.
 */
(function (S) {
    "use strict";

    var RADIUS = 52;

    var state = {
        /* Movement, in world units per second of intent. */
        mx: 0, my: 0,

        /* Aim, in screen pixels of the buffer. */
        aimX: 0, aimY: 0, aimActive: false,

        /* Buttons. */
        attack: false,
        attackHeld: false,
        swallow: false,
        swap: false,
        frenzy: false,
        weapon: null,

        /* Which pointer is doing what. */
        stickId: null,
        aimId: null,
        baseX: 0, baseY: 0,
        knobX: 0, knobY: 0,

        /* Keyboard mirror of the touch state. */
        keys: {}
    };

    var els = {};
    var hooks = {};
    var lastPointerType = "mouse";

    /* Which device is driving right now.
     *
     * Touch, keyboard and gamepad each keep their own state and the
     * last one to say something wins. They used to write into one
     * shared pair of variables, which meant a gamepad plugged into a
     * laptop silently erased whatever the mouse was doing - the
     * movement went dead the moment the stick was centred. */
    var active = "pointer";

    /* The gamepad's own state, kept apart from everything else. */
    var pad = {
        mx: 0, my: 0,
        aimX: 0, aimY: 0, aimActive: false,
        attack: false, attackHeld: false,
        swallow: false, swap: false, frenzy: false,
        seen: false
    };

    /* The keyboard's own state. The movement vector is derived from
     * the held keys every frame rather than counted up and down by the
     * handlers: a key pressed while the window lost focus cannot then
     * leave the player walking into a wall forever. */
    function keyVector() {
        var x = 0, y = 0;
        for (var k in state.keys) {
            if (!state.keys[k]) continue;
            var m = MOVE_KEYS[k];
            if (!m) continue;
            x += m[0];
            y += m[1];
        }
        /* Diagonals are not faster. */
        if (x !== 0 && y !== 0) {
            x *= 0.707;
            y *= 0.707;
        }
        return { x: x, y: y };
    }

    /* Movement keys. WASD and the arrow keys both work, because one
     * of them is always wrong for somebody. */
    var MOVE_KEYS = {
        w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
        arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0]
    };

    function bind(handlers) {
        hooks = handlers || {};
        els = {
            canvas: document.getElementById("game-canvas"),
            stick: document.getElementById("stick"),
            knob: document.getElementById("stick-knob"),
            attack: document.getElementById("btn-attack"),
            swallow: document.getElementById("btn-swallow"),
            swap: document.getElementById("btn-swap"),
            frenzy: document.getElementById("btn-frenzy")
        };

        if (!els.canvas) return;

        els.canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        els.canvas.addEventListener("pointermove", onPointerMove, { passive: false });
        els.canvas.addEventListener("pointerup", onPointerUp, { passive: false });
        els.canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
        els.canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", releaseAll);

        if (els.attack) {
            els.attack.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                state.attack = true;
                state.attackHeld = true;
                hooks.onAttack && hooks.onAttack();
            });
            els.attack.addEventListener("pointerup", function () { state.attackHeld = false; });
            els.attack.addEventListener("pointerleave", function () { state.attackHeld = false; });
        }
        if (els.swallow) {
            els.swallow.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                state.swallow = true;
                hooks.onSwallow && hooks.onSwallow();
            });
        }
        if (els.swap) {
            els.swap.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                state.swap = true;
                hooks.onSwap && hooks.onSwap();
            });
        }
        if (els.frenzy) {
            els.frenzy.addEventListener("pointerdown", function (e) {
                e.preventDefault();
                state.frenzy = true;
                els.frenzy.classList.add("on");
            });
            els.frenzy.addEventListener("pointerup", function () {
                state.frenzy = false;
                els.frenzy.classList.remove("on");
            });
            els.frenzy.addEventListener("pointerleave", function () {
                state.frenzy = false;
                els.frenzy.classList.remove("on");
            });
        }
    }

    /* Which buffer pixel is this client point? */
    function toBuffer(clientX, clientY) {
        var rect = els.canvas.getBoundingClientRect();
        var size = S.Render.bufferSize();
        return {
            x: (clientX - rect.left) * (size.w / Math.max(1, rect.width)),
            y: (clientY - rect.top) * (size.h / Math.max(1, rect.height))
        };
    }

    function onPointerDown(e) {
        if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
        e.preventDefault();
        lastPointerType = e.pointerType;
        /* The pointer spoke, so the pointer drives. */
        active = "pointer";
        var half = window.innerWidth / 2;

        if (e.clientX < half && state.stickId === null) {
            state.stickId = e.pointerId;
            state.baseX = e.clientX;
            state.baseY = e.clientY;
            state.knobX = 0;
            state.knobY = 0;
            showStick(true);
        } else {
            /* The right side aims and attacks. A tap is an attack at
             * that point; a drag keeps aiming without re-attacking, so
             * holding your thumb down does not empty the screen. */
            state.aimId = e.pointerId;
            var b = toBuffer(e.clientX, e.clientY);
            state.aimX = b.x;
            state.aimY = b.y;
            state.aimActive = true;
            state.attack = true;
            state.attackHeld = true;
            if (hooks.onAttack) hooks.onAttack();
        }
    }

    function onPointerMove(e) {
        /* A pointer that moves takes the controls back. Without this a
         * pad that was touched once keeps the mouse out forever. */
        active = "pointer";
        if (e.pointerId === state.stickId) {
            e.preventDefault();
            var dx = e.clientX - state.baseX;
            var dy = e.clientY - state.baseY;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d > RADIUS) { dx = dx / d * RADIUS; dy = dy / d * RADIUS; }
            state.knobX = dx;
            state.knobY = dy;
            state.mx = dx / RADIUS;
            state.my = dy / RADIUS;
            updateKnob();
            return;
        }
        if (e.pointerId === state.aimId) {
            e.preventDefault();
            var b = toBuffer(e.clientX, e.clientY);
            state.aimX = b.x;
            state.aimY = b.y;
            state.aimActive = true;
            return;
        }
        /* A mouse that is simply hovering still aims. This is the whole
         * desktop control scheme: move the mouse to aim, click to
         * attack. */
        if (e.pointerType === "mouse" && state.aimId === null) {
            var mb = toBuffer(e.clientX, e.clientY);
            state.aimX = mb.x;
            state.aimY = mb.y;
            state.aimActive = true;
        }
    }

    function onPointerUp(e) {
        if (e.pointerId === state.stickId) {
            state.stickId = null;
            state.mx = 0; state.my = 0;
            state.knobX = 0; state.knobY = 0;
            showStick(false);
            updateKnob();
            return;
        }
        if (e.pointerId === state.aimId) {
            state.aimId = null;
            state.attackHeld = false;
        }
    }

    function showStick(on) {
        if (!els.stick) return;
        els.stick.classList.toggle("active", !!on);
    }

    function updateKnob() {
        if (!els.knob) return;
        els.knob.style.transform = "translate(" + state.knobX + "px," + state.knobY + "px)";
    }

    function onKeyDown(e) {
        var k = e.key.toLowerCase();
        if (state.keys[k]) return;
        state.keys[k] = true;

        /* Movement. The keyboard moves the player: a game that says
         * "WASD" on the box and does not deliver it is a game nobody
         * can play on a desktop without a mouse. */
        if (MOVE_KEYS[k]) {
            e.preventDefault();
            active = "keys";
            return;
        }

        if (k === " " || k === "spacebar") {
            e.preventDefault();
            active = "keys";
            state.attack = true;
            state.attackHeld = true;
        } else if (k === "e" || k === "enter") {
            active = "keys";
            state.swallow = true;
        } else if (k === "q" || k === "tab") {
            e.preventDefault();
            active = "keys";
            state.swap = true;
        } else if (k === "f") {
            active = "keys";
            state.frenzy = true;
        } else if (k === "1" || k === "2") {
            active = "keys";
            state.weapon = k === "1" ? "lash" : "grasp";
        } else if (k === "escape") {
            hooks.onPause && hooks.onPause();
        }
    }

    function onKeyUp(e) {
        var k = e.key.toLowerCase();
        state.keys[k] = false;
        if (MOVE_KEYS[k]) {
            var still = keyVector();
            if (still.x === 0 && still.y === 0) {
                /* Hands off the keys: hand the stick back to whoever had
                 * it, instead of freezing in place. */
                active = "pointer";
            }
        }
        if (k === " " || k === "spacebar") state.attackHeld = false;
        if (k === "f") state.frenzy = false;
    }

    function releaseAll() {
        state.stickId = null;
        state.aimId = null;
        state.mx = 0; state.my = 0;
        state.attackHeld = false;
        state.frenzy = false;
        state.keys = {};
        pad.mx = 0; pad.my = 0;
        pad.aimActive = false;
        pad.attack = false;
        pad.attackHeld = false;
        pad.swallow = false;
        pad.swap = false;
        pad.frenzy = false;
        showStick(false);
        updateKnob();
    }

    /* Copy the intent into the world. Called once per frame. */
    /* The gamepad.
     *
     * It keeps its own state and only takes over when the player
     * actually touches it. A pad that is plugged in but resting must
     * not erase what the mouse or the keyboard was doing.
     *
     * Left stick moves, right stick aims, the face buttons act. GULPER
     * is a game about aiming, so a pad that could not aim could not
     * play it. */
    var DEADZONE = 0.18;

    function pollGamepad() {
        if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return;
        var gps;
        try { gps = navigator.getGamepads(); } catch (e) { return; }
        if (!gps) return;

        for (var g = 0; g < gps.length; g++) {
            var gp = gps[g];
            if (!gp) continue;

            var axes = gp.axes || [];
            var ax = axes[0] || 0, ay = axes[1] || 0;
            var rx = axes[2] || 0, ry = axes[3] || 0;
            if (Math.abs(ax) < DEADZONE) ax = 0;
            if (Math.abs(ay) < DEADZONE) ay = 0;
            if (Math.abs(rx) < DEADZONE) rx = 0;
            if (Math.abs(ry) < DEADZONE) ry = 0;

            var bs = gp.buttons || [];
            var down = function (i) { return !!(bs[i] && bs[i].pressed); };
            var attack = down(0) || down(7);
            var swallow = down(1) || down(6);
            var swap = down(2);
            var frenzy = down(3);
            var pause = down(9);

            var moved = ax !== 0 || ay !== 0 || rx !== 0 || ry !== 0 ||
                attack || swallow || swap || frenzy;

            pad.mx = ax;
            pad.my = ay;
            pad.attack = attack;
            pad.attackHeld = attack;
            pad.swallow = swallow;
            pad.swap = swap;
            pad.frenzy = frenzy;

            /* The right stick aims: the same buffer-space point the
             * mouse would aim at, computed from the stick. */
            if (rx !== 0 || ry !== 0) {
                var size = S.Render.bufferSize();
                var len = Math.sqrt(rx * rx + ry * ry) || 1;
                var reach = Math.min(size.w, size.h) * 0.4;
                pad.aimX = size.w / 2 + (rx / len) * reach;
                pad.aimY = size.h / 2 + (ry / len) * reach;
                pad.aimActive = true;
                moved = true;
            } else {
                pad.aimActive = false;
            }

            if (pause && !pad.pauseLatch) {
                pad.pauseLatch = true;
                hooks.onPause && hooks.onPause();
            } else if (!pause) {
                pad.pauseLatch = false;
            }

            if (moved) active = "gamepad";
            pad.seen = true;
            break;
        }
    }

    function read(world) {
        pollGamepad();
        var inp = world.input;

        /* Movement.
         *
         * The three sources are ranked by how deliberate they are: a
         * key that is held down is the most explicit thing a player
         * can do, a stick that is being pushed comes next, and the
         * thumbstick is the fallback. Nothing here is a latch that can
         * go stale: what is being held right now is what moves the
         * player. */
        var kv = keyVector();
        var padMoving = pad.mx !== 0 || pad.my !== 0;

        if (kv.x !== 0 || kv.y !== 0) {
            inp.mx = kv.x;
            inp.my = kv.y;
            active = "keys";
        } else if (padMoving) {
            inp.mx = pad.mx;
            inp.my = pad.my;
            active = "gamepad";
        } else {
            inp.mx = state.mx;
            inp.my = state.my;
            active = "pointer";
        }

        /* Aim. A pushed right stick points where the player looks; a
         * mouse hovering does too, and the stick wins because a player
         * who pushes a stick means to aim somewhere. */
        if (pad.aimActive) {
            var pw = S.Render.unproject(pad.aimX, pad.aimY);
            inp.aimX = pw.x;
            inp.aimY = pw.y;
            inp.aimActive = true;
            active = "gamepad";
        } else if (state.aimActive) {
            var w = S.Render.unproject(state.aimX, state.aimY);
            inp.aimX = w.x;
            inp.aimY = w.y;
            inp.aimActive = true;
        } else {
            inp.aimActive = false;
        }

        inp.attack = state.attack || pad.attack;
        state.attack = false;
        inp.attackHeld = state.attackHeld || pad.attackHeld;
        inp.swallow = state.swallow || pad.swallow;
        state.swallow = false;
        inp.swap = state.swap || pad.swap;
        state.swap = false;
        inp.frenzy = state.frenzy || pad.frenzy;
        if (state.weapon) {
            inp.weapon = state.weapon;
            state.weapon = null;
        }
    }

    /* Used by the UI to show and hide the controls. */
    function setVisible(on) {
        state.aimActive = false;
        if (!on) releaseAll();
    }

    S.Input = {
        bind: bind,
        read: read,
        setVisible: setVisible,
        releaseAll: releaseAll,
        state: state,
        /* Which device is driving: "pointer", "keys" or "gamepad". */
        activeSource: function () { return active; },
        /* The gamepad's own state, for tests and for anyone who wants
         * to know what the pad is doing. */
        pad: pad,
        /* Press and release a key the way a keyboard does, so a test
         * can drive the real path instead of poking the state. */
        pressKey: function (key, down) {
            if (down) onKeyDown({ key: key, preventDefault: function () { } });
            else onKeyUp({ key: key });
        }
    };

    /* HAPTICS.
     *
     * The vibration is the one piece of feedback a phone player
     * cannot see, so it has to be used where it matters: when a thing
     * lands, when the player is hit, when something is swallowed.
     *
     * The driver is replaceable so a test can see the pulses without
     * a phone. */
    S.Haptics = {
        driver: function (ms) {
            try {
                if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                    navigator.vibrate(ms);
                }
            } catch (e) { }
        },
        pulse: function (ms) {
            try {
                var d = S.Storage.data();
                if (d.settings && d.settings.haptics === false) return;
            } catch (e) { }
            try {
                S.Haptics.driver(ms || 10);
            } catch (e) { }
        }
    };
})(window.GU = window.GU || {});
