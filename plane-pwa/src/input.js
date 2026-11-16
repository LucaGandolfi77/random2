/*
 * Plane Shooter — input.
 *
 * One Pointer Events path for touch, mouse and pen, plus a keyboard
 * fallback. Drag is relative to the point where the finger went down, so
 * the thumb never covers the plane. `clientToWorld` is exported so the
 * scaling contract can be tested without a browser.
 */

import { WIDTH, HEIGHT } from "./config.js";

export function clientToWorld(rect, clientX, clientY) {
    const width = rect && rect.width > 0 ? rect.width : WIDTH;
    const height = rect && rect.height > 0 ? rect.height : HEIGHT;
    const left = rect ? rect.left : 0;
    const top = rect ? rect.top : 0;

    return {
        x: (clientX - left) * (WIDTH / width),
        y: (clientY - top) * (HEIGHT / height)
    };
}

export function createInput(canvas, handlers = {}) {
    const keys = new Set();
    let pointerId = null;
    let anchor = null;

    const onDragStart = typeof handlers.onDragStart === "function" ? handlers.onDragStart : null;
    const onDragMove = typeof handlers.onDragMove === "function" ? handlers.onDragMove : null;
    const onDragEnd = typeof handlers.onDragEnd === "function" ? handlers.onDragEnd : null;
    const onPause = typeof handlers.onPause === "function" ? handlers.onPause : null;
    const onMute = typeof handlers.onMute === "function" ? handlers.onMute : null;
    const onTheme = typeof handlers.onTheme === "function" ? handlers.onTheme : null;
    const onConfirm = typeof handlers.onConfirm === "function" ? handlers.onConfirm : null;

    function pointerDown(event) {
        if (pointerId !== null) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        pointerId = event.pointerId;
        anchor = clientToWorld(
            canvas.getBoundingClientRect(),
            event.clientX,
            event.clientY
        );

        try {
            canvas.setPointerCapture(event.pointerId);
        } catch (error) {
            /* Safari can throw if the pointer is already gone. */
        }

        if (onDragStart) onDragStart(anchor);
        event.preventDefault();
    }

    function pointerMove(event) {
        if (pointerId === null || event.pointerId !== pointerId) return;

        const point = clientToWorld(
            canvas.getBoundingClientRect(),
            event.clientX,
            event.clientY
        );

        if (onDragMove) {
            onDragMove(point, {
                dx: point.x - anchor.x,
                dy: point.y - anchor.y
            });
        }
        event.preventDefault();
    }

    function pointerUp(event) {
        if (pointerId === null || event.pointerId !== pointerId) return;

        const id = pointerId;
        pointerId = null;
        anchor = null;

        try {
            canvas.releasePointerCapture(id);
        } catch (error) {
            /* The capture may already be gone. */
        }

        if (onDragEnd) onDragEnd();
        event.preventDefault();
    }

    function clearKeys() {
        keys.clear();
    }

    function keyDown(event) {
        if (event.repeat) return;

        const code = event.code;
        const target = event.target;
        const isControl = target && target.closest &&
            target.closest("button, a, input, select, textarea");

        if (
            !isControl &&
            (
                code === "ArrowLeft" ||
                code === "ArrowRight" ||
                code === "ArrowUp" ||
                code === "ArrowDown" ||
                code === "Space"
            )
        ) {
            event.preventDefault();
        }

        keys.add(code);

        /* A focused button should keep its native Space/Enter behaviour. */
        if (isControl && (code === "Space" || code === "Enter")) return;

        if (code === "KeyP" || code === "Escape") {
            if (onPause) onPause();
            return;
        }
        if (code === "KeyM") {
            if (onMute) onMute();
            return;
        }
        if (code === "KeyT") {
            if (onTheme) onTheme();
            return;
        }
        if (code === "Enter" || code === "Space") {
            if (onConfirm) onConfirm();
        }
    }

    function keyUp(event) {
        keys.delete(event.code);
    }

    canvas.addEventListener("pointerdown", pointerDown, { passive: false });
    canvas.addEventListener("pointermove", pointerMove, { passive: false });
    canvas.addEventListener("pointerup", pointerUp, { passive: false });
    canvas.addEventListener("pointercancel", pointerUp, { passive: false });
    canvas.addEventListener("lostpointercapture", pointerUp);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);

    return {
        keys,
        isDragging: function () {
            return pointerId !== null;
        },
        clearKeys,
        destroy: function () {
            canvas.removeEventListener("pointerdown", pointerDown);
            canvas.removeEventListener("pointermove", pointerMove);
            canvas.removeEventListener("pointerup", pointerUp);
            canvas.removeEventListener("pointercancel", pointerUp);
            canvas.removeEventListener("lostpointercapture", pointerUp);
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("keyup", keyUp);
            window.removeEventListener("blur", clearKeys);
        }
    };
}
