/* Pointer, lever-drag and keyboard input mapped to cabinet hit regions. */
import { CANVAS } from './config.js';

export function setupInput(canvas, cabinet, handlers) {
  let drag = null;

  function point(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * CANVAS.width,
      y: (e.clientY - rect.top) / rect.height * CANVAS.height,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const p = point(e);
    const hit = cabinet.hitTest(p.x, p.y);
    if (!hit) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    cabinet.pressed = hit.id;
    drag = { id: hit.id, startY: p.y, moved: false };
    if (hit.id !== 'lever') handlers.action(hit.id);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = point(e);
    if (Math.abs(p.y - drag.startY) > 18) drag.moved = true;
  });

  const finish = () => {
    if (drag && drag.id === 'lever' && drag.moved) handlers.action('spin');
    drag = null;
    cabinet.pressed = null;
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  const KEY_ACTIONS = {
    Space: 'spin', Enter: 'spin', KeyA: 'auto', KeyT: 'turbo',
    KeyB: 'bet', KeyL: 'lines', KeyP: 'paytable', KeyS: 'stats',
    KeyD: 'daily', KeyH: 'lobby', KeyC: 'challenge', KeyG: 'gambleYes',
    KeyX: 'togglePractice', Escape: 'close',
  };
  document.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    e.preventDefault();
    handlers.action(action);
  });
}
