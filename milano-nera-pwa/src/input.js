import { normalize } from './collision.js';

export function createInput(canvas, getState) {
  const keys = new Set();
  const edge = { roll: false, reload: false, action: false, molotov: false, pause: false };
  const pointer = { x: 0, y: 0, down: false, inside: false, active: false };
  const virtual = { cover: false, fire: false, moveX: 0, moveY: 0, aimX: 0, aimY: 0, aimLength: 0 };
  const touch = {
    left: { id: null, startX: 0, startY: 0, x: 0, y: 0, dx: 0, dy: 0 },
    right: { id: null, startX: 0, startY: 0, x: 0, y: 0, dx: 0, dy: 0 }
  };
  let lastAim = { x: 0, y: -1 };
  let padPrev = {};
  let coarse = false;
  try {
    coarse = window.matchMedia?.('(pointer: coarse)')?.matches || false;
  } catch {
    coarse = false;
  }

  function setKey(event, down) {
    const key = event.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'r', 'e', 'q', 'shift'].includes(key)) {
      const state = getState();
      if (state?.phase === 'playing') event.preventDefault();
    }
    if (down) {
      if (!keys.has(key)) {
        if (key === 'shift') edge.roll = true;
        if (key === 'r') edge.reload = true;
        if (key === 'e') edge.action = true;
        if (key === 'q') edge.molotov = true;
        if (key === 'p' || key === 'escape') edge.pause = true;
      }
      keys.add(key);
    } else {
      keys.delete(key);
    }
  }

  const onKeyDown = (event) => setKey(event, true);
  const onKeyUp = (event) => setKey(event, false);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function onPointerMove(event) {
    const state = getState();
    const p = canvasPoint(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
    pointer.active = true;
    const camera = state?.camera || { x: 0, y: 0 };
    const player = state?.player;
    if (player) {
      const dx = camera.x + p.x - player.x;
      const dy = camera.y + p.y - player.y;
      if (Math.hypot(dx, dy) > 4) lastAim = normalize(dx, dy);
    }
  }

  const onPointerDown = (event) => {
    pointer.down = true;
    onPointerMove(event);
  };
  const onPointerUp = () => {
    pointer.down = false;
  };
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });

  function bindTouchStick(element, side) {
    if (!element) return;
    const stick = touch[side];
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      stick.id = event.pointerId;
      stick.startX = event.clientX;
      stick.startY = event.clientY;
      stick.dx = 0;
      stick.dy = 0;
      element.setPointerCapture?.(event.pointerId);
      element.classList.add('is-active');
    });
    element.addEventListener('pointermove', (event) => {
      if (stick.id !== event.pointerId) return;
      let dx = (event.clientX - stick.startX) / 42;
      let dy = (event.clientY - stick.startY) / 42;
      const length = Math.hypot(dx, dy);
      if (length > 1) {
        dx /= length;
        dy /= length;
      }
      stick.dx = dx;
      stick.dy = dy;
      element.style.setProperty('--stick-x', `${dx * 28}px`);
      element.style.setProperty('--stick-y', `${dy * 28}px`);
    });
    const end = (event) => {
      if (stick.id !== event.pointerId) return;
      stick.id = null;
      stick.dx = 0;
      stick.dy = 0;
      element.classList.remove('is-active');
      element.style.setProperty('--stick-x', '0px');
      element.style.setProperty('--stick-y', '0px');
    };
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
  }

  bindTouchStick(document.getElementById('stick-left'), 'left');
  bindTouchStick(document.getElementById('stick-right'), 'right');

  const touchButtons = [...document.querySelectorAll('[data-touch]')];
  for (const button of touchButtons) {
    const action = button.dataset.touch;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.classList.add('is-pressed');
      if (action === 'cover') virtual.cover = true;
      if (action === 'roll') edge.roll = true;
      if (action === 'reload') edge.reload = true;
      if (action === 'action') edge.action = true;
      if (action === 'molotov') edge.molotov = true;
    });
    const release = () => {
      button.classList.remove('is-pressed');
      if (action === 'cover') virtual.cover = false;
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  }

  function pollGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const pad = pads[0];
    if (!pad) return null;
    const dead = (value) => Math.abs(value) < 0.18 ? 0 : value;
    const pressed = (index) => Boolean(pad.buttons[index]?.pressed);
    const just = (index) => pressed(index) && !padPrev[index];
    const next = {};
    for (let i = 0; i < pad.buttons.length; i++) next[i] = pressed(i);
    padPrev = next;
    return {
      moveX: dead(pad.axes[0] || 0),
      moveY: dead(pad.axes[1] || 0),
      aimX: dead(pad.axes[2] || 0),
      aimY: dead(pad.axes[3] || 0),
      fire: pressed(7),
      cover: pressed(4),
      roll: just(0),
      reload: just(2),
      action: just(3),
      molotov: just(5)
    };
  }

  function consumeEdges() {
    const result = {
      roll: edge.roll,
      reload: edge.reload,
      action: edge.action,
      molotov: edge.molotov,
      pause: edge.pause
    };
    edge.roll = false;
    edge.reload = false;
    edge.action = false;
    edge.molotov = false;
    edge.pause = false;
    return result;
  }

  function getIntent() {
    const state = getState();
    const pad = pollGamepad();
    let moveX = 0;
    let moveY = 0;
    if (keys.has('a') || keys.has('arrowleft')) moveX -= 1;
    if (keys.has('d') || keys.has('arrowright')) moveX += 1;
    if (keys.has('w') || keys.has('arrowup')) moveY -= 1;
    if (keys.has('s') || keys.has('arrowdown')) moveY += 1;
    if (pad) {
      moveX += pad.moveX;
      moveY += pad.moveY;
    }
    if (touch.left.id !== null) {
      moveX += touch.left.dx;
      moveY += touch.left.dy;
    }
    const move = normalize(moveX, moveY);

    let aimX = lastAim.x;
    let aimY = lastAim.y;
    let aimLength = 1;
    if (pad && (pad.aimX !== 0 || pad.aimY !== 0)) {
      lastAim = normalize(pad.aimX, pad.aimY);
      aimX = lastAim.x;
      aimY = lastAim.y;
    } else if (touch.right.id !== null && Math.hypot(touch.right.dx, touch.right.dy) > 0.12) {
      lastAim = normalize(touch.right.dx, touch.right.dy);
      aimX = lastAim.x;
      aimY = lastAim.y;
    } else if (pointer.active) {
      const camera = state?.camera || { x: 0, y: 0 };
      const player = state?.player;
      if (player) {
        const dx = camera.x + pointer.x - player.x;
        const dy = camera.y + pointer.y - player.y;
        const length = Math.hypot(dx, dy);
        if (length > 3) {
          aimX = dx / length;
          aimY = dy / length;
        }
      }
    }

    if (pad) {
      if (pad.roll) edge.roll = true;
      if (pad.reload) edge.reload = true;
      if (pad.action) edge.action = true;
      if (pad.molotov) edge.molotov = true;
    }
    const touchAim = touch.right.id !== null;
    const fire = pointer.down || virtual.fire || Boolean(pad?.fire) || touchAim;
    const cover = Boolean(keys.has(' ')) || Boolean(pad?.cover) || virtual.cover;
    const edges = consumeEdges();
    return {
      moveX: move.x,
      moveY: move.y,
      aimX,
      aimY,
      aimLength,
      fire,
      cover,
      roll: edges.roll,
      reload: edges.reload,
      action: edges.action,
      molotov: edges.molotov,
      pause: edges.pause
    };
  }

  function reset() {
    keys.clear();
    pointer.down = false;
    virtual.cover = false;
    virtual.fire = false;
    edge.roll = false;
    edge.reload = false;
    edge.action = false;
    edge.molotov = false;
    edge.pause = false;
    for (const side of ['left', 'right']) {
      touch[side].id = null;
      touch[side].dx = 0;
      touch[side].dy = 0;
    }
  }

  function isCoarse() {
    return coarse;
  }

  return {
    getIntent,
    reset,
    isCoarse,
    setTouchVisible(value) {
      document.body.classList.toggle('has-touch', Boolean(value));
    }
  };
}
