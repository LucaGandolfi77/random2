/*
 * IRONFALL - audio, synthesised at runtime.
 *
 * No audio files anywhere in this game, because an offline PWA that has to
 * cache a megabyte of gunfire samples to work is worse than one that does
 * not. Everything below is oscillators, filters and one noise buffer.
 *
 * The context is created lazily on the first user gesture. Browsers refuse
 * to start audio before one, and a game that tries anyway logs a warning and
 * then plays nothing for the first thirty seconds of a match.
 */
(function (S) {
    "use strict";

    var audio = {
        ctx: null,
        master: null,
        noise: null,
        enabled: true,
        started: false,
        /* Per-team last-play stamps. Several minions die at the same instant
         * during a teamfight, and eight simultaneous identical sounds is a
         * click, not an effect. One per team per 40ms is enough to read as
         * "a lot of hits" without clipping the master. */
        lastHit: [0, 0],
        lastShot: [0, 0]
    };

    function init() {
        if (audio.ctx) return audio.ctx;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            audio.ctx = new AC();
        } catch (e) {
            return null;
        }
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.5;
        audio.master.connect(audio.ctx.destination);

        /* One second of white noise, reused for every percussive sound.
         * Generating it once costs 44100 floats at boot and saves allocating
         * a buffer per hit for the rest of the session. */
        var len = Math.floor(audio.ctx.sampleRate);
        audio.noise = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
        var data = audio.noise.getChannelData(0);
        /* Deterministic fill rather than Math.random, so two matches on the
         * same seed sound identical. */
        var s = 0;
        for (var i = 0; i < len; i++) {
            s = (s * 1664525 + 1013904223) >>> 0;
            data[i] = (s / 2147483648) - 1;
        }
        audio.started = true;
        return audio.ctx;
    }

    /* Browsers suspend the context on backgrounding a tab. Resuming on the
     * next gesture is the difference between "the sound broke" and "the sound
     * did not exist". */
    function resume() {
        if (!audio.ctx) init();
        if (audio.ctx && audio.ctx.state === "suspended") {
            audio.ctx.resume().catch(function () { /* ignore */ });
        }
    }

    function now() { return audio.ctx ? audio.ctx.currentTime : 0; }

    function setEnabled(on) {
        audio.enabled = !!on;
        if (audio.master) {
            audio.master.gain.setTargetAtTime(audio.enabled ? 0.5 : 0, now(), 0.05);
        }
    }

    /* ===== Primitives ===== */

    /* A pitched blip with an exponential decay. `sweepTo` slides the
     * frequency over the note's life, which is what turns a square wave into
     * a gun and into a chime depending on which direction it slides. */
    function tone(freq, dur, type, vol, sweepTo, delay) {
        if (!audio.ctx || !audio.enabled) return;
        var t = now() + (delay || 0);
        var o = audio.ctx.createOscillator();
        var g = audio.ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        if (sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
        /* 0.0001 rather than 0: a gain that reaches exactly zero will not
         * resume, and an oscillator whose gain has hit zero stays silent
         * forever if the context is later reused. */
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + dur * 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(audio.master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    /* Filtered noise. Every impact in the game is one of these plus a pitch,
     * which is why it does not sound like eight different samples. */
    function noiseHit(dur, vol, filterType, freq, q, sweepTo, delay) {
        if (!audio.ctx || !audio.enabled) return;
        var t = now() + (delay || 0);
        var src = audio.ctx.createBufferSource();
        src.buffer = audio.noise;
        src.loop = true;
        var f = audio.ctx.createBiquadFilter();
        f.type = filterType || "bandpass";
        f.frequency.setValueAtTime(freq, t);
        f.Q.value = q || 1;
        if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + dur);
        var g = audio.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + dur * 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(audio.master);
        src.start(t);
        src.stop(t + dur + 0.02);
    }

    /* ===== Game sounds =====
     *
     * Each one is two or three primitives and is designed to be
     * distinguishable at phone volume from a phone speaker in a pocket. That
     * rules out anything subtle: the sounds here are deliberately harsh. */
    function autoAttack(team) {
        var t = now();
        if (t - audio.lastShot[team] < 0.04) return;
        audio.lastShot[team] = t;
        noiseHit(0.07, 0.11, "bandpass", 1900, 1.2, 700);
    }

    function hit(team, big) {
        var t = now();
        if (t - audio.lastHit[team] < 0.04) return;
        audio.lastHit[team] = t;
        noiseHit(big ? 0.16 : 0.08, big ? 0.22 : 0.13, "lowpass", big ? 900 : 1500, 0.8, 260);
    }

    function abilityCast(magic) {
        if (magic) {
            /* Warp: a rising saw sweep with a detuned partner. The beat
             * between the two oscillators is what makes it sound wrong in a
             * way a single oscillator cannot. */
            tone(180, 0.32, "sawtooth", 0.13, 720);
            tone(184, 0.32, "sawtooth", 0.1, 690, 0.01);
        } else {
            tone(320, 0.14, "square", 0.1, 120);
            noiseHit(0.1, 0.1, "highpass", 2400, 0.7);
        }
    }

    function explosion() {
        noiseHit(0.5, 0.3, "lowpass", 1200, 0.6, 90);
        tone(90, 0.4, "sine", 0.22, 34);
    }

    function towerShot() {
        var t = now();
        if (t - audio.lastShot[2] < 0.05) return;
        audio.lastShot[2] = t;
        tone(680, 0.12, "triangle", 0.09, 240);
        noiseHit(0.09, 0.07, "bandpass", 2600, 2);
    }

    function towerFalls() {
        explosion();
        noiseHit(1.4, 0.28, "lowpass", 700, 0.5, 60, 0.12);
        tone(140, 1.1, "sawtooth", 0.16, 42, 0.1);
    }

    function levelUp() {
        /* A rising major triad. The only unambiguously positive sound in the
         * game, which is why it is reserved for exactly one event. */
        tone(523, 0.16, "triangle", 0.11);
        tone(659, 0.16, "triangle", 0.11, 0, 0.06);
        tone(784, 0.28, "triangle", 0.12, 0, 0.12);
    }

    function kill() {
        tone(880, 0.1, "square", 0.1, 1320);
        tone(1320, 0.18, "triangle", 0.08, 1760, 0.05);
    }

    function death() {
        tone(200, 0.5, "sawtooth", 0.16, 48);
        noiseHit(0.4, 0.16, "lowpass", 800, 0.7, 120);
    }

    function buy() {
        tone(660, 0.07, "triangle", 0.09);
        tone(990, 0.12, "triangle", 0.09, 0, 0.05);
    }

    function denied() {
        tone(180, 0.12, "square", 0.09, 120);
    }

    function ping(kind) {
        var f = kind === "enemy" ? 740 : (kind === "danger" ? 560 : 980);
        tone(f, 0.1, "sine", 0.1);
        tone(f * 1.5, 0.12, "sine", 0.07, 0, 0.05);
    }

    function recall() {
        tone(300, 0.9, "sine", 0.07, 900);
    }

    function reliquary() {
        tone(110, 1.6, "sawtooth", 0.14, 220);
        tone(165, 1.6, "sawtooth", 0.1, 330, 0.05);
        noiseHit(1.4, 0.1, "lowpass", 400, 0.5, 90);
    }

    function finish(won) {
        if (won) {
            tone(392, 0.5, "triangle", 0.14);
            tone(523, 0.5, "triangle", 0.14, 0, 0.16);
            tone(659, 0.8, "triangle", 0.15, 0, 0.32);
            tone(784, 1.0, "triangle", 0.14, 0, 0.48);
        } else {
            tone(294, 0.7, "sawtooth", 0.12, 110);
            tone(220, 1.2, "sawtooth", 0.11, 70, 0.2);
        }
    }

    /* A continuous drone under a boss objective. One oscillator pair with a
     * slow beat, gated by whether the Reliquary is up - it is the only
     * looping sound in the game and it exists to tell you the fight has
     * started without looking at the map. */
    var drone = null;
    function setDrone(on) {
        if (!audio.ctx) return;
        if (on && !drone) {
            drone = { a: null, g: null };
            drone.a = audio.ctx.createOscillator();
            drone.b = audio.ctx.createOscillator();
            drone.g = audio.ctx.createGain();
            drone.a.type = "sawtooth"; drone.a.frequency.value = 55;
            drone.b.type = "sawtooth"; drone.b.frequency.value = 55.6;
            drone.g.gain.value = 0.0001;
            drone.a.connect(drone.g);
            drone.b.connect(drone.g);
            drone.g.connect(audio.master);
            drone.a.start();
            drone.b.start();
            drone.g.gain.setTargetAtTime(0.035, now(), 1.5);
        } else if (!on && drone) {
            drone.g.gain.setTargetAtTime(0.0001, now(), 0.6);
            var d = drone;
            drone = null;
            setTimeout(function () {
                try { d.a.stop(); d.b.stop(); } catch (e) { /* already stopped */ }
            }, 1400);
        }
    }

    function haptic(pattern) {
        if (!navigator.vibrate) return;
        try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
    }

    S.Audio = {
        init: init,
        resume: resume,
        setEnabled: setEnabled,
        isEnabled: function () { return audio.enabled; },
        autoAttack: autoAttack,
        hit: hit,
        abilityCast: abilityCast,
        explosion: explosion,
        towerShot: towerShot,
        towerFalls: towerFalls,
        levelUp: levelUp,
        kill: kill,
        death: death,
        buy: buy,
        denied: denied,
        ping: ping,
        recall: recall,
        reliquary: reliquary,
        finish: finish,
        setDrone: setDrone,
        haptic: haptic,
        state: audio
    };

})(window.IF = window.IF || {});
