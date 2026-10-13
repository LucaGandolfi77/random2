/*
 * SECTOR 7 - audio.
 *
 * Everything is synthesised at runtime from oscillators and a noise buffer,
 * so there are no audio assets to ship, cache, or fail to load offline.
 */
(function (S) {
    "use strict";

    var audio = {
        ctx: null,
        master: null,
        noiseBuf: null,
        engine: null,
        enabled: true,
        started: false,
        /* Rate-limit the blaster: at 0.1s intervals across a dozen sources
         * it would otherwise machine-gun into a wall of noise. */
        lastShot: -9,
        lastHit: -9,
        lastPickup: -9,
        pickupChain: 0,
    };

    function now() { return audio.ctx ? audio.ctx.currentTime : 0; }

    function makeNoise(ctx) {
        var len = Math.floor(ctx.sampleRate * 2);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    function init() {
        if (audio.started) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;

        try {
            audio.ctx = new AC();
        } catch (e) {
            return;
        }
        audio.started = true;

        var ctx = audio.ctx;
        audio.master = ctx.createGain();
        audio.master.gain.value = audio.enabled ? 0.8 : 0;
        audio.master.connect(ctx.destination);

        audio.noiseBuf = makeNoise(ctx);
        buildEngine();
    }

    /* A continuous filtered-noise engine bed whose volume tracks the
     * throttle. Cheaper and more convincing than retriggering per frame. */
    function buildEngine() {
        var ctx = audio.ctx;
        var src = ctx.createBufferSource();
        src.buffer = audio.noiseBuf;
        src.loop = true;

        var filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 340;
        filter.Q.value = 2.4;

        var gain = ctx.createGain();
        gain.gain.value = 0.0001;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(audio.master);
        src.start();

        audio.engine = { src: src, filter: filter, gain: gain };
    }

    function setThrottle(t) {
        if (!audio.engine) return;
        var k = S.clamp(t, 0, 1);
        audio.engine.gain.gain.setTargetAtTime(0.012 + k * 0.055, now(), 0.12);
        audio.engine.filter.frequency.setTargetAtTime(240 + k * 520, now(), 0.2);
    }

    function resume() {
        if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume();
    }

    function setEnabled(on) {
        audio.enabled = on;
        if (audio.master) audio.master.gain.setTargetAtTime(on ? 0.8 : 0, now(), 0.05);
    }

    function blip(freq, dur, type, vol, sweepTo) {
        if (!audio.ctx || !audio.enabled) return;
        var ctx = audio.ctx;
        var t = now();
        var o = ctx.createOscillator();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        if (sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(audio.master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    function noise(dur, vol, type, freq, sweepTo) {
        if (!audio.ctx || !audio.enabled) return;
        var ctx = audio.ctx;
        var t = now();
        var src = ctx.createBufferSource();
        src.buffer = audio.noiseBuf;
        src.loop = true;

        var f = ctx.createBiquadFilter();
        f.type = type || "bandpass";
        f.frequency.setValueAtTime(freq, t);
        if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), t + dur);
        f.Q.value = 1.2;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        src.connect(f);
        f.connect(g);
        g.connect(audio.master);
        src.start(t);
        src.stop(t + dur + 0.02);
    }

    /* ===== Game sounds ===== */

    function shoot(isPlayer) {
        if (!audio.ctx) return;
        var t = now();
        if (isPlayer && t - audio.lastShot < 0.05) return;
        audio.lastShot = t;

        if (isPlayer) {
            blip(880, 0.09, "square", 0.045, 260);
            noise(0.07, 0.035, "highpass", 2400, 1200);
        } else {
            /* Distance and threat both live in this one sound: the further
             * the shooter, the duller and quieter it is. */
            blip(300, 0.1, "sawtooth", 0.018, 170);
        }
    }

    function hit() {
        if (!audio.ctx) return;
        var t = now();
        if (t - audio.lastHit < 0.05) return;
        audio.lastHit = t;
        noise(0.09, 0.05, "bandpass", 1500, 500);
    }

    function kill(big) {
        noise(big ? 0.6 : 0.32, big ? 0.24 : 0.13, "lowpass", big ? 900 : 1300, 70);
        blip(big ? 220 : 340, big ? 0.5 : 0.28, "sawtooth", big ? 0.15 : 0.08, 48);
    }

    function rockBreak() {
        noise(0.24, 0.09, "bandpass", 700, 180);
        blip(180, 0.2, "triangle", 0.06, 70);
    }

    /* Pickups ascend a pentatonic run when chained, so vacuuming a pile of
     * loot is an audio event rather than a repeated thud. */
    function pickup(kind) {
        if (!audio.ctx) return;
        var t = now();
        if (t - audio.lastPickup > 0.6) audio.pickupChain = 0;
        audio.lastPickup = t;
        audio.pickupChain = Math.min(11, audio.pickupChain + 1);

        var steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
        var semi = steps[audio.pickupChain];
        var base = kind === "crystal" ? 780 : 560;
        var f = base * Math.pow(2, semi / 12);

        blip(f, 0.09, "sine", 0.07, f * 1.3);
        if (kind === "crystal") blip(f * 2, 0.16, "sine", 0.035);
    }

    function death() {
        noise(1.3, 0.22, "lowpass", 800, 50);
        blip(170, 1.3, "sine", 0.2, 32);
        blip(85, 1.5, "triangle", 0.14, 26);
        setThrottle(0);
    }

    function respawn() {
        blip(300, 0.3, "sine", 0.1, 620);
        setTimeout(function () { blip(620, 0.34, "sine", 0.09, 900); }, 110);
    }

    function dock() {
        noise(0.4, 0.12, "lowpass", 500, 120);
        blip(420, 0.22, "sine", 0.1, 560);
        setThrottle(0);
    }

    function undock() {
        blip(560, 0.2, "sine", 0.09, 260);
        noise(0.3, 0.09, "lowpass", 260, 700);
    }

    function upgrade() {
        blip(660, 0.13, "sine", 0.1);
        setTimeout(function () { blip(880, 0.13, "sine", 0.09); }, 80);
        setTimeout(function () { blip(1320, 0.2, "sine", 0.07); }, 160);
    }

    function salvo(count) {
        if (!audio.ctx || !audio.enabled) return;
        var t = now();
        if (t - audio.lastShot < 0.12) return;
        audio.lastShot = t;
        noise(0.34, 0.14, "bandpass", 700, 2600);
        blip(180, 0.26, "sawtooth", 0.1, 620);
        /* The pitch drops per missile so a salvo of nine sounds like nine
         * rounds leaving the rail rather than one loud noise. */
        for (var i = 0; i < Math.min(4, (count || 1) - 1); i++) {
            (function (n) {
                setTimeout(function () { blip(760 - n * 90, 0.11, "square", 0.05, 300); }, n * 34);
            })(i);
        }
    }

    function mineDrop() {
        if (!audio.ctx || !audio.enabled) return;
        blip(420, 0.09, "triangle", 0.06, 180);
        noise(0.08, 0.04, "highpass", 3000, 1400);
    }

    function explosion() {
        noise(0.36, 0.16, "lowpass", 1400, 90);
        blip(260, 0.26, "sawtooth", 0.1, 60);
    }

    function bounty() {
        if (!audio.ctx || !audio.enabled) return;
        /* A two-note alarm: the only sound in the game that is not tied to
         * the player, because it is the only thing in the game with your
         * name on it. */
        blip(520, 0.16, "square", 0.08);
        setTimeout(function () { blip(392, 0.24, "square", 0.08); }, 150);
        setTimeout(function () { blip(300, 0.4, "square", 0.06); }, 310);
    }

    function storm() {
        noise(0.5, 0.05, "highpass", 1800, 600);
    }

    function error() {
        blip(180, 0.16, "square", 0.07, 120);
    }

    function ui() {
        blip(920, 0.04, "sine", 0.04);
    }

    S.Audio = {
        init: init,
        resume: resume,
        setEnabled: setEnabled,
        setThrottle: setThrottle,
        shoot: shoot,
        hit: hit,
        kill: kill,
        rockBreak: rockBreak,
        salvo: salvo,
        mineDrop: mineDrop,
        explosion: explosion,
        bounty: bounty,
        storm: storm,
        pickup: pickup,
        death: death,
        respawn: respawn,
        dock: dock,
        undock: undock,
        upgrade: upgrade,
        error: error,
        ui: ui,
    };

})(window.S7 = window.S7 || {});