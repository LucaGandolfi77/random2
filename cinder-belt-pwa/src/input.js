/*
 * Keyboard, mouse and twin-stick touch.
 *
 * The canvas always receives pointer events. Touch splits the screen down the
 * middle: left half is thrust, right half is aim-and-fire. Buttons for the
 * ability, boost, dock and pause are real DOM elements so they get sane hit
 * targets and can be tapped without a virtual gamepad library.
 */
(function (CB) {
    "use strict";

    var STICK_MAX = 62;

    var state = {
        up: false, down: false, left: false, right: false,
        fire: false, boost: false,
        aimScreenX: 0, aimScreenY: 0,
        aimDirX: 0, aimDirY: 0,
        usingTouch: false,
        pointerX: 0, pointerY: 0,
        leftStick: { active: false, dx: 0, dy: 0, baseX: 0, baseY: 0 },
        rightStick: { active: false, dx: 0, dy: 0, baseX: 0, baseY: 0 },
        order: 0,
        abilityQueued: false,
        interactQueued: false,
        pauseQueued: false,
        pointerType: "mouse"
    };

    var canvas = null;
    var hooks = {};
    var keys = {};

    function isTyping(e) {
        var t = e.target;
        return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    }

    function updateAimFromPointer() {
        state.aimScreenX = state.pointerX;
        state.aimScreenY = state.pointerY;
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;
        var dx = state.pointerX - cx;
        var dy = state.pointerY - cy;
        var len = Math.hypot(dx, dy);
        if (len > 4) {
            state.aimDirX = dx / len;
            state.aimDirY = dy / len;
        }
    }

    function setStick(stick, x, y) {
        var dx = x - stick.baseX;
        var dy = y - stick.baseY;
        var len = Math.hypot(dx, dy);
        if (len > STICK_MAX) {
            dx = dx / len * STICK_MAX;
            dy = dy / len * STICK_MAX;
            len = STICK_MAX;
        }
        stick.dx = dx / STICK_MAX;
        stick.dy = dy / STICK_MAX;
        stick.len = Math.min(1, len / STICK_MAX);
    }

    function onPointerDown(e) {
        if (e.target !== canvas) return;
        CB.Audio.resume();
        state.pointerType = e.pointerType || "mouse";
        if (e.pointerType === "touch" || e.pointerType === "pen") {
            state.usingTouch = true;
            state.pointerX = e.clientX;
            state.pointerY = e.clientY;
            var half = window.innerWidth / 2;
            if (e.clientX < half) {
                var l = state.leftStick;
                l.active = true;
                l.pointerId = e.pointerId;
                l.baseX = e.clientX;
                l.baseY = e.clientY;
                l.dx = 0; l.dy = 0;
            } else {
                var r = state.rightStick;
                r.active = true;
                r.pointerId = e.pointerId;
                r.baseX = e.clientX;
                r.baseY = e.clientY;
                r.dx = 0; r.dy = 0;
                state.fire = true;
            }
            if (hooks.sticks) hooks.sticks();
            e.preventDefault();
        } else {
            state.pointerX = e.clientX;
            state.pointerY = e.clientY;
            updateAimFromPointer();
            if (e.button === 0) state.fire = true;
            if (e.button === 2) state.abilityQueued = true;
            e.preventDefault();
        }
    }

    function onPointerMove(e) {
        state.pointerType = e.pointerType || "mouse";
        if (e.pointerType === "touch" || e.pointerType === "pen") {
            var l = state.leftStick, r = state.rightStick;
            if (l.active && l.pointerId === e.pointerId) {
                setStick(l, e.clientX, e.clientY);
                if (hooks.sticks) hooks.sticks();
                e.preventDefault();
            } else if (r.active && r.pointerId === e.pointerId) {
                setStick(r, e.clientX, e.clientY);
                var len = Math.hypot(r.dx, r.dy);
                if (len > 0.18) {
                    state.aimDirX = r.dx / len;
                    state.aimDirY = r.dy / len;
                }
                if (hooks.sticks) hooks.sticks();
                e.preventDefault();
            }
        } else {
            state.pointerX = e.clientX;
            state.pointerY = e.clientY;
            updateAimFromPointer();
        }
    }

    function onPointerUp(e) {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
            var l = state.leftStick, r = state.rightStick;
            if (l.active && l.pointerId === e.pointerId) {
                l.active = false; l.dx = 0; l.dy = 0;
            }
            if (r.active && r.pointerId === e.pointerId) {
                r.active = false; r.dx = 0; r.dy = 0;
                state.fire = false;
            }
            if (hooks.sticks) hooks.sticks();
            e.preventDefault();
        } else if (e.button === 0) {
            state.fire = false;
        }
    }

    function onKeyDown(e) {
        if (isTyping(e)) return;
        var k = e.key.toLowerCase();
        keys[k] = true;
        if (k === "w" || k === "arrowup") state.up = true;
        if (k === "s" || k === "arrowdown") state.down = true;
        if (k === "a" || k === "arrowleft") state.left = true;
        if (k === "d" || k === "arrowright") state.right = true;
        if (k === "shift") state.boost = true;
        if (k === " ") { state.abilityQueued = true; e.preventDefault(); }
        if (k === "e") state.interactQueued = true;
        if (k === "1") state.order = 1;
        if (k === "2") state.order = 2;
        if (k === "3") state.order = 3;
        if (k === "4") state.order = 4;
        if (k === "escape" || k === "p") state.pauseQueued = true;
        if (k === "f") {
            state.fire = !state.fire;
        }
        if (k === "m" && hooks.map) hooks.map();
        if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) {
            e.preventDefault();
        }
    }

    function onKeyUp(e) {
        var k = e.key.toLowerCase();
        keys[k] = false;
        if (k === "w" || k === "arrowup") state.up = false;
        if (k === "s" || k === "arrowdown") state.down = false;
        if (k === "a" || k === "arrowleft") state.left = false;
        if (k === "d" || k === "arrowright") state.right = false;
        if (k === "shift") state.boost = false;
    }

    function blur() {
        state.up = state.down = state.left = state.right = false;
        state.fire = state.boost = false;
        state.leftStick.active = false;
        state.rightStick.active = false;
    }

    function init(canvasEl, h) {
        canvas = canvasEl;
        hooks = h || {};
        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", blur);
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") {
                blur();
                if (hooks.blur) hooks.blur();
            }
        });
        canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        canvas.addEventListener("wheel", function (e) { e.preventDefault(); }, { passive: false });
        state.aimScreenX = window.innerWidth / 2;
        state.aimScreenY = window.innerHeight / 2 - 120;
        updateAimFromPointer();
    }

    function movement() {
        var x = (state.right ? 1 : 0) - (state.left ? 1 : 0);
        var y = (state.down ? 1 : 0) - (state.up ? 1 : 0);
        if (state.leftStick.active) {
            x = state.leftStick.dx;
            y = state.leftStick.dy;
        }
        var len = Math.hypot(x, y);
        if (len > 1) { x /= len; y /= len; }
        return { x: x, y: y, len: Math.min(1, len) };
    }

    function consumeAbility() {
        if (!state.abilityQueued) return false;
        state.abilityQueued = false;
        return true;
    }
    function consumeInteract() {
        if (!state.interactQueued) return false;
        state.interactQueued = false;
        return true;
    }
    function consumePause() {
        if (!state.pauseQueued) return false;
        state.pauseQueued = false;
        return true;
    }
    function consumeOrder() {
        var o = state.order;
        state.order = 0;
        return o;
    }

    function stickVisuals() {
        return {
            left: state.leftStick,
            right: state.rightStick,
            touch: state.usingTouch
        };
    }

    CB.Input = {
        state: state,
        init: init,
        movement: movement,
        consumeAbility: consumeAbility,
        consumeInteract: consumeInteract,
        consumePause: consumePause,
        consumeOrder: consumeOrder,
        stickVisuals: stickVisuals,
        updateAimFromPointer: updateAimFromPointer
    };
})(window.CB = window.CB || {});
