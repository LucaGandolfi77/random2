/* ===== Pocket DS — shared constants ===== */

export const SCREEN_W = 256;
export const SCREEN_H = 192;
export const TARGET_FPS = 60;

/* DS button bitmask. Order matters only for consistency. */
export const BUTTONS = Object.freeze({
    A: 1 << 0,
    B: 1 << 1,
    X: 1 << 2,
    Y: 1 << 3,
    SELECT: 1 << 4,
    START: 1 << 5,
    RIGHT: 1 << 6,
    LEFT: 1 << 7,
    UP: 1 << 8,
    DOWN: 1 << 9,
    R: 1 << 10,
    L: 1 << 11,
});

export const BUTTON_NAMES = Object.freeze([
    'A', 'B', 'X', 'Y', 'SELECT', 'START',
    'RIGHT', 'LEFT', 'UP', 'DOWN', 'R', 'L',
]);

/* Keyboard fallback mapping (keydown.key, lowercased). */
export const KEY_MAP = Object.freeze({
    arrowup: 'UP', w: 'UP',
    arrowdown: 'DOWN', s: 'DOWN',
    arrowleft: 'LEFT', a: 'LEFT',
    arrowright: 'RIGHT', d: 'RIGHT',
    z: 'A', x: 'B',
    // A and S are taken by the d-pad above; use J / K for X / Y.
    j: 'X', k: 'Y',
    q: 'L', e: 'R',
    enter: 'START', shift: 'SELECT', backspace: 'SELECT',
});

/* Settings live in localStorage. */
export const SETTINGS_KEY = 'pocketds.settings.v1';

export const DEFAULT_SETTINGS = Object.freeze({
    skin: 'graphite',
    layout: 'auto',        // auto | portrait | landscape
    scale: 100,            // percent
    frameSkip: 0,
    volume: 50,
    scanlines: true,
    hints: true,
});

/* IndexedDB database / stores. */
export const DB_NAME = 'pocketds';
export const DB_VERSION = 1;
export const STORE_FILES = 'files';   // key -> ArrayBuffer (BIOS / firmware / ROM)
export const STORE_SAVES = 'saves';   // key -> { data, meta }
export const STORE_RAM = 'ram';       // key -> ArrayBuffer (save RAM)

export const FILE_KEYS = Object.freeze({
    arm9: 'arm9bios.bin',
    arm7: 'arm7bios.bin',
    fw: 'firmware.bin',
    rom: 'game.nds',
});
