/*
 * PIXEL CUP '96 — input
 * ----------------------
 * One place that turns a keyboard, a touch screen and a gamepad into the
 * handful of things the model understands: a direction and five buttons.
 *
 * The direction is in the camera's frame: "up" is always towards the
 * opponent's goal, because the camera always looks that way.
 */

(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelInput = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KEYS = {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    pass: ["Space", "KeyK"],
    shoot: ["KeyJ", "KeyX", "Enter"],
    sprint: ["ShiftLeft", "ShiftRight"],
    switch: ["KeyQ", "Tab"],
    skill: ["KeyL", "KeyE"],
    cross: ["KeyC", "KeyR"],
    pause: ["Escape", "KeyP"],
  };

  function has(list, code) {
    for (var i = 0; i < list.length; i++) if (list[i] === code) return true;
    return false;
  }

  function createInput(opts) {
    opts = opts || {};
    var state = {
      mx: 0, my: 0,
      passDown: false,
      shootDown: false,
      shootUp: false,
      sprint: false,
      switchDown: false,
      skillDown: false,
      crossDown: false,
      tap: false,
      pause: false,
      anyKey: false,
    };
    var keys = {};
    var buttons = {};        /* the on-screen buttons */
    var stick = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, radius: 52 };
    var listeners = [];

    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts || false);
      listeners.push([target, type, fn, opts]);
    }

    /* ---- keyboard ---- */

    function keyDown(e) {
      if (e.repeat) return;
      keys[e.code] = true;
      state.anyKey = true;
      if (has(KEYS.pass, e.code)) state.passDown = true;
      if (has(KEYS.shoot, e.code)) state.shootDown = true;
      if (has(KEYS.pause, e.code)) { state.pause = true; e.preventDefault(); }
      if (has(KEYS.switch, e.code)) { state.switchDown = true; e.preventDefault(); }
      if (has(KEYS.skill, e.code)) state.skillDown = true;
      if (has(KEYS.cross, e.code)) state.crossDown = true;
      if (has(KEYS.up, e.code) || has(KEYS.down, e.code) ||
          has(KEYS.left, e.code) || has(KEYS.right, e.code)) e.preventDefault();
    }

    function keyUp(e) {
      keys[e.code] = false;
      if (has(KEYS.shoot, e.code)) state.shootUp = true;
    }

    function readKeys() {
      var x = 0, y = 0;
      for (var i = 0; i < KEYS.left.length; i++) if (keys[KEYS.left[i]]) x -= 1;
      for (var j = 0; j < KEYS.right.length; j++) if (keys[KEYS.right[j]]) x += 1;
      for (var k = 0; k < KEYS.up.length; k++) if (keys[KEYS.up[k]]) y += 1;
      for (var l = 0; l < KEYS.down.length; l++) if (keys[KEYS.down[l]]) y -= 1;
      return { x: x, y: y };
    }

    function sprintHeld() {
      for (var i = 0; i < KEYS.sprint.length; i++) if (keys[KEYS.sprint[i]]) return true;
      return false;
    }

    /* ---- on-screen buttons ---- */

    function setButton(name, down) {
      var was = !!buttons[name];
      buttons[name] = down;
      if (down && !was) {
        if (name === "pass") state.passDown = true;
        if (name === "shoot") state.shootDown = true;
        if (name === "switch") state.switchDown = true;
        if (name === "skill") state.skillDown = true;
        if (name === "cross") state.crossDown = true;
        state.tap = true;
        state.anyKey = true;
      }
      if (!down && was && name === "shoot") state.shootUp = true;
    }

    /* ---- the virtual stick ---- */

    function stickDown(id, cx, cy) {
      stick.active = true;
      stick.id = id;
      stick.ox = cx; stick.oy = cy;
      stick.x = 0; stick.y = 0;
    }

    function stickMove(id, cx, cy) {
      if (!stick.active || stick.id !== id) return;
      var dx = cx - stick.ox, dy = cy - stick.oy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > stick.radius) {
        dx = dx / d * stick.radius;
        dy = dy / d * stick.radius;
      }
      stick.x = dx / stick.radius;
      stick.y = -dy / stick.radius;   /* screen down is world back */
    }

    function stickUp(id) {
      if (stick.id !== id) return;
      stick.active = false;
      stick.id = -1;
      stick.x = 0; stick.y = 0;
    }

    /* ---- gamepad ---- */

    function readGamepad() {
      if (!navigator.getGamepads) return null;
      var pads = navigator.getGamepads();
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        if (p && p.connected) return p;
      }
      return null;
    }

    var padPrev = {};

    function readPad() {
      var p = readGamepad();
      if (!p) return null;
      var ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      var out = { x: ax, y: -ay };
      var b = p.buttons;
      function down(i) { return b[i] && b[i].pressed; }
      if (down(14)) out.y += 1;          /* d-pad up */
      if (down(15)) out.y -= 1;
      if (down(12)) out.x -= 1;
      if (down(13)) out.x += 1;
      if (down(0) && !padPrev.a) state.passDown = true;
      padPrev.a = down(0);
      var wasB = padPrev.b;
      if (down(2) && !wasB) state.shootDown = true;
      if (!down(2) && wasB) state.shootUp = true;
      padPrev.b = down(2);
      if (down(1)) state.skillDown = true;
      if (down(9)) state.pause = true;
      if (down(5) || down(7)) state.sprint = true;
      return out;
    }

    /* ---- the frame ---- */

    function poll() {
      var k = readKeys();
      var x = k.x, y = k.y;
      if (x === 0 && y === 0 && stick.active) { x = stick.x; y = stick.y; }
      var pad = readPad();
      if (pad && Math.abs(pad.x) + Math.abs(pad.y) > 0.15) {
        x = pad.x; y = pad.y;
      }
      var len = Math.sqrt(x * x + y * y);
      if (len > 1) { x /= len; y /= len; }
      state.mx = x;
      state.my = y;
      state.sprint = sprintHeld() || buttons.sprint === true || (pad && pad.sprint);
    }

    function endFrame() {
      state.passDown = false;
      state.shootDown = false;
      state.shootUp = false;
      state.switchDown = false;
      state.skillDown = false;
      state.crossDown = false;
      state.tap = false;
      state.anyKey = false;
      state.pause = false;
    }

    function attach(target) {
      var el = target || window;
      on(el, "keydown", keyDown);
      on(el, "keyup", keyUp);
      on(window, "blur", function () { keys = {}; });
    }

    function detach() {
      for (var i = 0; i < listeners.length; i++) {
        var l = listeners[i];
        l[0].removeEventListener(l[1], l[2], l[3]);
      }
      listeners.length = 0;
    }

    return {
      state: state,
      poll: poll,
      endFrame: endFrame,
      attach: attach,
      detach: detach,
      setButton: setButton,
      stickDown: stickDown,
      stickMove: stickMove,
      stickUp: stickUp,
      stick: stick,
      isDown: function (name) { return !!buttons[name]; },
    };
  }

  return { createInput: createInput, KEYS: KEYS };
});
