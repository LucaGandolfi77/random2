/*
 * Pointer plumbing for the bar. Converts CSS pixels to the 900x1600 logical
 * arena and reports a single world point; card dragging lives in ui.js.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var Input = {
        canvas: null,
        handlers: null
    };

    Input.init = function (canvas, handlers) {
        Input.canvas = canvas;
        Input.handlers = handlers || {};
        if (!canvas) return;

        canvas.addEventListener("pointermove", function (ev) {
            var p = Input.toWorld(ev.clientX, ev.clientY);
            if (Input.handlers.onMove) Input.handlers.onMove(p, ev);
        }, { passive: false });

        canvas.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
            var p = Input.toWorld(ev.clientX, ev.clientY);
            if (Input.handlers.onDown) Input.handlers.onDown(p, ev);
        }, { passive: false });

        canvas.addEventListener("pointerup", function (ev) {
            ev.preventDefault();
            var p = Input.toWorld(ev.clientX, ev.clientY);
            if (Input.handlers.onUp) Input.handlers.onUp(p, ev);
        }, { passive: false });

        canvas.addEventListener("pointercancel", function () {
            if (Input.handlers.onLeave) Input.handlers.onLeave();
        });

        canvas.addEventListener("pointerleave", function () {
            if (Input.handlers.onLeave) Input.handlers.onLeave();
        });

        canvas.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    };

    Input.toWorld = function (clientX, clientY) {
        if (!Input.canvas) return { x: 0, y: 0, inside: false };
        var rect = Input.canvas.getBoundingClientRect();
        var x = ((clientX - rect.left) / rect.width) * C.W;
        var y = ((clientY - rect.top) / rect.height) * C.H;
        return {
            x: x,
            y: y,
            inside: x >= 0 && x <= C.W && y >= 0 && y <= C.H &&
                clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom
        };
    };

    Input.setEnabled = function (on) {
        if (!Input.canvas) return;
        Input.canvas.style.pointerEvents = on ? "auto" : "none";
    };

    LC.Input = Input;
})(window.LC = window.LC || {});