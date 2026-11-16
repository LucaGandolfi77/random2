/*
 * DEEP ORBIT — adaptive quality controller (pure, no DOM).
 *
 * Hysteresis keeps the renderer from flip-flopping at the threshold: a
 * downgrade needs 2 seconds of sustained low FPS, an upgrade needs 8 seconds
 * of sustained headroom. Forced "high"/"low" settings bypass the monitor.
 */

export function createQualityController(settings) {
    let tier = "high";
    let slow = 0;
    let fast = 0;
    let forced = null;

    function applyForced() {
        const mode = settings && settings.effects;
        forced = (mode === "high" || mode === "low") ? mode : null;
        if (forced) tier = forced;
        slow = 0;
        fast = 0;
        return tier;
    }

    applyForced();

    return {
        getTier: function () { return tier; },
        isForced: function () { return !!forced; },

        setSettings: function (next) {
            settings = next;
            return applyForced();
        },

        sample: function (fps, dt) {
            dt = Math.max(0, Math.min(dt || 0, 0.1));
            if (forced) return tier;

            if (fps < 50) {
                slow += dt;
                fast = 0;
            } else if (fps > 57) {
                fast += dt;
                slow = 0;
            } else {
                slow = Math.max(0, slow - dt * 0.5);
                fast = Math.max(0, fast - dt * 0.5);
            }

            if (tier === "high" && slow > 2) {
                tier = "low";
                slow = 0;
                fast = 0;
            } else if (tier === "low" && fast > 8) {
                tier = "high";
                slow = 0;
                fast = 0;
            }
            return tier;
        },

        reset: function () {
            slow = 0;
            fast = 0;
            if (!forced) tier = "high";
        }
    };
}
