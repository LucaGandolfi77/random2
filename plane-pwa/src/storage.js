/*
 * Plane Shooter — persistence.
 *
 * The key is deliberately still `plane-pwa`: the old build stored
 * `{ highScore, theme }` there and the dashboard's legacy reader knows that
 * name. Loading upgrades the shape in memory and the next save writes
 * `version: 2` with `bestWave` and `installDismissed`.
 */

import { STORAGE_KEY, STORAGE_VERSION, THEMES } from "./config.js";

export const DEFAULTS = {
    version: STORAGE_VERSION,
    highScore: 0,
    bestWave: 1,
    theme: "neon",
    installDismissed: false
};

function asCount(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function loadPrefs(storage) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    let raw = null;

    try {
        raw = store ? store.getItem(STORAGE_KEY) : null;
    } catch (error) {
        raw = null;
    }

    let data = null;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch (error) {
        data = null;
    }

    const prefs = {
        version: STORAGE_VERSION,
        highScore: DEFAULTS.highScore,
        bestWave: DEFAULTS.bestWave,
        theme: DEFAULTS.theme,
        installDismissed: DEFAULTS.installDismissed
    };

    if (data && typeof data === "object") {
        prefs.highScore = asCount(data.highScore);
        prefs.bestWave = Math.max(1, asCount(data.bestWave) || 1);
        prefs.theme = typeof data.theme === "string" && THEMES[data.theme]
            ? data.theme
            : DEFAULTS.theme;
        prefs.installDismissed = data.installDismissed === true;
    }

    /* The previous build wrote the install dismissal to a separate key; a
       returning player should not see the prompt again. */
    if (!prefs.installDismissed) {
        try {
            if (store && store.getItem("plane-install-dismissed") === "true") {
                prefs.installDismissed = true;
            }
        } catch (error) {
            /* Ignore a storage failure. */
        }
    }

    return prefs;
}

export function savePrefs(prefs, storage) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store || !prefs) return false;

    try {
        store.setItem(STORAGE_KEY, JSON.stringify({
            version: STORAGE_VERSION,
            highScore: asCount(prefs.highScore),
            bestWave: Math.max(1, asCount(prefs.bestWave) || 1),
            theme: THEMES[prefs.theme] ? prefs.theme : DEFAULTS.theme,
            installDismissed: prefs.installDismissed === true
        }));
        return true;
    } catch (error) {
        /* Private mode or quota: the run still works, it just does not save. */
        return false;
    }
}
