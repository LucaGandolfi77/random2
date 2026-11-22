/* ===== Screen / layout helpers ===== */
import { SCREEN_W, SCREEN_H } from './config.js';

export function getContexts(topCanvas, bottomCanvas) {
    return {
        top: topCanvas.getContext('2d', { alpha: false }),
        bottom: bottomCanvas.getContext('2d', { alpha: false }),
    };
}

export function clearScreens(contexts) {
    for (const ctx of [contexts.top, contexts.bottom]) {
        if (!ctx) continue;
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
}

export function resolveLayout(mode) {
    if (mode === 'portrait' || mode === 'landscape') return mode;
    return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

/** Apply visual settings to the DOM. Safe to call repeatedly. */
export function applySettings(settings, consoleEl, hintEl) {
    if (consoleEl) {
        consoleEl.style.setProperty('--ui-scale', String((settings.scale || 100) / 100));
        for (const skin of ['graphite', 'silver', 'midnight', 'crimson']) {
            consoleEl.classList.remove(`skin-${skin}`);
        }
        consoleEl.classList.add(`skin-${settings.skin || 'graphite'}`);
        const layout = resolveLayout(settings.layout);
        consoleEl.classList.toggle('layout-landscape', layout === 'landscape');
        consoleEl.classList.toggle('layout-portrait', layout === 'portrait');
    }
    document.body.classList.toggle('no-scanlines', settings.scanlines === false);
    if (hintEl) hintEl.classList.toggle('hidden', settings.hints === false);
}
