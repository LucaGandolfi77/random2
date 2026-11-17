/*
 * DEEP ORBIT — visual ghost replay.
 *
 * A ghost is a translucent replay of your best run's ship trajectory. It does
 * not participate in combat: recording positions (rather than re-simulating)
 * keeps it stable even when enemy AI diverges between runs.
 */

export const GHOST_HZ = 30;

export function recordFrame(frames, state) {
    if (!frames || !state) return;
    if (frames.length >= 4000) frames.shift();
    const p = state.player;
    frames.push({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        angle: Math.round(p.angle * 100) / 100,
        ammo: p.ammo
    });
}

export function createGhost(replay) {
    if (!replay || !replay.frames || replay.frames.length < 2) return null;
    const frames = replay.frames;
    let t = 0;

    return {
        update: function (dt) { t += dt; },
        reset: function () { t = 0; },
        get score() { return replay.score || 0; },
        get finished() { return t * GHOST_HZ >= frames.length - 1; },
        pose: function () {
            const idx = t * GHOST_HZ;
            const i = Math.floor(idx);
            if (i >= frames.length) return null;
            const a = frames[i];
            const b = frames[Math.min(i + 1, frames.length - 1)];
            const f = idx - i;
            return {
                x: a.x + (b.x - a.x) * f,
                y: a.y + (b.y - a.y) * f,
                angle: a.angle,
                ammo: a.ammo
            };
        }
    };
}
