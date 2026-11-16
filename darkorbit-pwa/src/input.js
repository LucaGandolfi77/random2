/*
 * DEEP ORBIT — input.
 *
 * One Pointer Events path for touch, mouse and pen, plus a keyboard fallback.
 * Movement comes from the on-screen joystick (or a drag on the left of the
 * canvas); firing is a held button; a tap on the right selects a target.
 */

export function createInput(canvas, renderer, handlers = {}) {
    const joystick = document.getElementById("joystick");
    const knob = document.getElementById("joystick-knob");
    const fireBtn = document.getElementById("fire-btn");
    const ammoBtn = document.getElementById("ammo-btn");
    const abilityButtons = Array.from(document.querySelectorAll("[data-ability]"));

    const move = { x: 0, y: 0 };
    let firing = false;
    let stickPointer = null;
    let canvasPointer = null;
    let canvasStart = null;
    let canvasWasStick = false;

    const onTarget = typeof handlers.onTarget === "function" ? handlers.onTarget : null;
    const onFireChange = typeof handlers.onFireChange === "function" ? handlers.onFireChange : null;
    const onAmmo = typeof handlers.onAmmo === "function" ? handlers.onAmmo : null;
    const onAbility = typeof handlers.onAbility === "function" ? handlers.onAbility : null;
    const onPause = typeof handlers.onPause === "function" ? handlers.onPause : null;
    const onMute = typeof handlers.onMute === "function" ? handlers.onMute : null;
    const onDock = typeof handlers.onDock === "function" ? handlers.onDock : null;
    const onJump = typeof handlers.onJump === "function" ? handlers.onJump : null;
    const onConfirm = typeof handlers.onConfirm === "function" ? handlers.onConfirm : null;

    const keys = new Set();

    function setStick(dx, dy) {
        const max = 36;
        const len = Math.hypot(dx, dy);
        const k = len > max ? max / len : 1;
        const nx = dx * k;
        const ny = dy * k;
        move.x = dx / (max || 1);
        move.y = dy / (max || 1);
        const ml = Math.hypot(move.x, move.y);
        if (ml > 1) { move.x /= ml; move.y /= ml; }
        if (knob) knob.style.transform = "translate(" + nx + "px," + ny + "px)";
    }

    function resetStick() {
        move.x = 0;
        move.y = 0;
        if (knob) knob.style.transform = "translate(0px,0px)";
    }

    /* ---- on-screen joystick ---- */

    function stickDown(event) {
        if (stickPointer !== null) return;
        stickPointer = event.pointerId;
        const rect = (joystick || canvas).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        setStick(event.clientX - cx, event.clientY - cy);
        try { (joystick || canvas).setPointerCapture(event.pointerId); } catch (e) {}
        event.preventDefault();
    }

    function stickMove(event) {
        if (stickPointer !== event.pointerId) return;
        const rect = (joystick || canvas).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        setStick(event.clientX - cx, event.clientY - cy);
        event.preventDefault();
    }

    function stickUp(event) {
        if (stickPointer !== event.pointerId) return;
        stickPointer = null;
        resetStick();
        try { (joystick || canvas).releasePointerCapture(event.pointerId); } catch (e) {}
        event.preventDefault();
    }

    if (joystick) {
        joystick.addEventListener("pointerdown", stickDown, { passive: false });
        joystick.addEventListener("pointermove", stickMove, { passive: false });
        joystick.addEventListener("pointerup", stickUp, { passive: false });
        joystick.addEventListener("pointercancel", stickUp, { passive: false });
        joystick.addEventListener("lostpointercapture", stickUp);
    }

    /* ---- fire / ammo / ability buttons ---- */

    function fireOn(event) {
        firing = true;
        if (onFireChange) onFireChange(true);
        if (fireBtn) fireBtn.classList.add("active");
        if (event) event.preventDefault();
    }
    function fireOff(event) {
        if (!firing) return;
        firing = false;
        if (onFireChange) onFireChange(false);
        if (fireBtn) fireBtn.classList.remove("active");
        if (event) event.preventDefault();
    }

    if (fireBtn) {
        fireBtn.addEventListener("pointerdown", fireOn, { passive: false });
        fireBtn.addEventListener("pointerup", fireOff, { passive: false });
        fireBtn.addEventListener("pointercancel", fireOff, { passive: false });
        fireBtn.addEventListener("pointerleave", fireOff);
        fireBtn.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    if (ammoBtn) {
        ammoBtn.addEventListener("click", (event) => {
            event.preventDefault();
            if (onAmmo) onAmmo();
        });
    }
    for (const btn of abilityButtons) {
        btn.addEventListener("click", (event) => {
            event.preventDefault();
            if (onAbility) onAbility(btn.getAttribute("data-ability"));
        });
    }

    /* ---- canvas: left drag = joystick, right tap = target ---- */

    function canvasDown(event) {
        if (canvasPointer !== null) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        canvasPointer = event.pointerId;
        canvasStart = { x: event.clientX, y: event.clientY };
        const rect = canvas.getBoundingClientRect();
        canvasWasStick = stickPointer === null && event.clientX - rect.left < rect.width * 0.42;

        if (canvasWasStick) {
            setStick(event.clientX - (rect.left + 42), event.clientY - (rect.top + rect.height - 42));
        }
        try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
        event.preventDefault();
    }

    function canvasMove(event) {
        if (canvasPointer !== event.pointerId) return;
        if (canvasWasStick) {
            const rect = canvas.getBoundingClientRect();
            setStick(event.clientX - (rect.left + 42), event.clientY - (rect.top + rect.height - 42));
        }
        event.preventDefault();
    }

    function canvasUp(event) {
        if (canvasPointer !== event.pointerId) return;
        const rect = canvas.getBoundingClientRect();
        const moved = Math.hypot(event.clientX - canvasStart.x, event.clientY - canvasStart.y);

        if (canvasWasStick) {
            resetStick();
        } else if (moved < 14 && onTarget && renderer) {
            onTarget(renderer.screenToWorld(event.clientX, event.clientY));
        }

        canvasPointer = null;
        canvasStart = null;
        canvasWasStick = false;
        try { canvas.releasePointerCapture(event.pointerId); } catch (e) {}
        event.preventDefault();
    }

    canvas.addEventListener("pointerdown", canvasDown, { passive: false });
    canvas.addEventListener("pointermove", canvasMove, { passive: false });
    canvas.addEventListener("pointerup", canvasUp, { passive: false });
    canvas.addEventListener("pointercancel", canvasUp, { passive: false });
    canvas.addEventListener("lostpointercapture", canvasUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    /* ---- keyboard ---- */

    function keyDown(event) {
        if (event.repeat) return;
        const code = event.code;
        const target = event.target;
        const inControl = target && target.closest &&
            target.closest("button, a, input, select, textarea");

        if (!inControl && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].indexOf(code) >= 0) {
            event.preventDefault();
        }
        keys.add(code);
        if (inControl && (code === "Space" || code === "Enter")) return;

        if (code === "KeyP" || code === "Escape") { if (onPause) onPause(); return; }
        if (code === "KeyM") { if (onMute) onMute(); return; }
        if (code === "KeyQ") { if (onAmmo) onAmmo(); return; }
        if (code === "KeyE") { if (onDock) onDock(); return; }
        if (code === "KeyJ") { if (onJump) onJump(); return; }
        if (code === "Digit1") { if (onAbility) onAbility("boost"); return; }
        if (code === "Digit2") { if (onAbility) onAbility("barrier"); return; }
        if (code === "Digit3") { if (onAbility) onAbility("repair"); return; }
        if (code === "Enter" || code === "Space") {
            if (!inControl && code === "Space") fireOn(null);
            if (onConfirm) onConfirm();
        }
    }

    function keyUp(event) {
        keys.delete(event.code);
        if (event.code === "Space") fireOff(null);
    }

    function clearKeys() {
        keys.clear();
        fireOff(null);
        resetStick();
        stickPointer = null;
        canvasPointer = null;
    }

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);

    function getMove() {
        let x = move.x;
        let y = move.y;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
        if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
        if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
        if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
        const len = Math.hypot(x, y);
        if (len > 1) { x /= len; y /= len; }
        return { x, y };
    }

    return {
        keys,
        getMove,
        isFiring: function () { return firing; },
        clearKeys,
        destroy: function () {
            if (joystick) {
                joystick.removeEventListener("pointerdown", stickDown);
                joystick.removeEventListener("pointermove", stickMove);
                joystick.removeEventListener("pointerup", stickUp);
                joystick.removeEventListener("pointercancel", stickUp);
                joystick.removeEventListener("lostpointercapture", stickUp);
            }
            if (fireBtn) {
                fireBtn.removeEventListener("pointerdown", fireOn);
                fireBtn.removeEventListener("pointerup", fireOff);
                fireBtn.removeEventListener("pointercancel", fireOff);
                fireBtn.removeEventListener("pointerleave", fireOff);
            }
            canvas.removeEventListener("pointerdown", canvasDown);
            canvas.removeEventListener("pointermove", canvasMove);
            canvas.removeEventListener("pointerup", canvasUp);
            canvas.removeEventListener("pointercancel", canvasUp);
            canvas.removeEventListener("lostpointercapture", canvasUp);
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("keyup", keyUp);
            window.removeEventListener("blur", clearKeys);
        }
    };
}
