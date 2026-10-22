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

        if (k === " " || k === "spacebar") {
            e.preventDefault();
            state.attack = true;
            state.attackHeld = true;
        } else if (k === "e" || k === "enter") {
            state.swallow = true;
        } else if (k === "q" || k === "tab") {
            e.preventDefault();
            state.swap = true;
        } else if (k === "f") {
            state.frenzy = true;
        } else if (k === "1" || k === "2") {
            state.weapon = k === "1" ? "lash" : "grasp";
        } else if (k === "escape") {
            hooks.onPause && hooks.onPause();
        }
    }

    function onKeyUp(e) {
        var k = e.key.toLowerCase();
        state.keys[k] = false;
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
        showStick(false);
        updateKnob();
    }

    /* Copy the intent into the world. Called once per frame. */
    /* Basic gamepad support: left stick moves, face buttons act. */
    function pollGamepad() {
        if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return;
        var gps;
        try { gps = navigator.getGamepads(); } catch (e) { return; }
        if (!gps) return;
        for (var g = 0; g < gps.length; g++) {
            var gp = gps[g];
            if (!gp) continue;
            var ax = gp.axes && gp.axes[0] ? gp.axes[0] : 0;
            var ay = gp.axes && gp.axes[1] ? gp.axes[1] : 0;
            if (Math.abs(ax) < 0.15) ax = 0;
            if (Math.abs(ay) < 0.15) ay = 0;
            state.mx = ax;
            state.my = ay;
            var bs = gp.buttons || [];
            if (bs[0] && bs[0].pressed) state.attack = true;
            if (bs[1] && bs[1].pressed) state.swallow = true;
            if (bs[2] && bs[2].pressed) state.swap = true;
            if (bs[3] && bs[3].pressed) state.frenzy = true;
            break;
        }
    }

    function read(world) {
        pollGamepad();
        var inp = world.input;
        inp.mx = state.mx;
        inp.my = state.my;

        if (state.aimActive) {
            var w = S.Render.unproject(state.aimX, state.aimY);
            inp.aimX = w.x;
            inp.aimY = w.y;
            inp.aimActive = true;
        } else {
            inp.aimActive = false;
        }

        inp.attack = state.attack;
        state.attack = false;
        inp.attackHeld = state.attackHeld;
        inp.swallow = state.swallow;
        state.swallow = false;
        inp.swap = state.swap;
        state.swap = false;
        inp.frenzy = state.frenzy;
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
        state: state
    };
    S.Haptics = {
        pulse: function (ms) {
            try {
                var d = S.Storage.data();
                if (d.settings && d.settings.haptics === false) return;
            } catch (e) { }
            try {
                if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                    navigator.vibrate(ms || 10);
                }
            } catch (e) { }
        }
    };
})(window.GU = window.GU || {});
