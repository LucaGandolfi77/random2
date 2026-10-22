/*
 * GULPER - procedural audio.
 *
 * No sound files. Everything is synthesised in the browser, which means
 * the game is genuinely offline-complete: there is no audio to fail to
 * download, and the whole soundtrack is a few kilobytes of code.
 *
 * The palette of sounds is deliberately wet and organic. The alien is a
 * soft-bodied thing that eats, so the important sounds are gulps, chitin
 * clicks, the wet slap of a grab, and the screams of people who are about
 * to become part of you.
 */
(function (S) {
    "use strict";

    var ctx = null;
    var master = null;
    var musicGain = null;
    var sfxGain = null;
    var musicNodes = null;
    var settings = { sound: true, music: true };
    var noiseBuffer = null;

    function ensure() {
        if (ctx) return ctx;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.9;
            master.connect(ctx.destination);
            sfxGain = ctx.createGain();
            sfxGain.gain.value = 0.85;
            sfxGain.connect(master);
            musicGain = ctx.createGain();
            musicGain.gain.value = 0.0;
            musicGain.connect(master);
        } catch (e) {
            ctx = null;
        }
        return ctx;
    }

    function noise() {
        if (!noiseBuffer && ctx) {
            var len = ctx.sampleRate * 1.2;
            noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
            var d = noiseBuffer.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    }

    /* A single enveloped oscillator. */
    function tone(freq, dur, type, vol, sweepTo, delay) {
        if (!settings.sound) return;
        var c = ensure();
        if (!c) return;
        var t0 = c.currentTime + (delay || 0);
        try {
            var osc = c.createOscillator();
            var g = c.createGain();
            osc.type = type || "sine";
            osc.frequency.setValueAtTime(freq, t0);
            if (sweepTo && sweepTo !== freq) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + dur);
            }
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.15), t0 + Math.min(0.02, dur * 0.2));
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(g);
            g.connect(sfxGain);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        } catch (e) { /* a browser that closed the context mid-note */ }
    }

    /* Filtered noise. The wet sounds are all noise through a moving
     * low-pass; the dry sounds are noise through a band-pass. */
    function noiseHit(dur, vol, f0, f1, type, delay) {
        if (!settings.sound) return;
        var c = ensure();
        if (!c || !noiseBuffer) return;
        var t0 = c.currentTime + (delay || 0);
        try {
            var src = c.createBufferSource();
            src.buffer = noiseBuffer;
            src.loop = true;
            var flt = c.createBiquadFilter();
            flt.type = type || "lowpass";
            flt.frequency.setValueAtTime(f0, t0);
            flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
            flt.Q.value = 1.2;
            var g = c.createGain();
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.15), t0 + dur * 0.12);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            src.connect(flt); flt.connect(g); g.connect(sfxGain);
            src.start(t0);
            src.stop(t0 + dur + 0.02);
        } catch (e) { /* ignore */ }
    }

    var SFX = {
        /* A tendril hitting flesh. */
        lash: function () {
            noiseHit(0.13, 0.16, 2600, 320, "bandpass");
            tone(150, 0.09, "square", 0.05, 70);
        },
        /* A heavy scythe. */
        blade: function () {
            noiseHit(0.24, 0.2, 4200, 260, "bandpass");
            tone(90, 0.22, "sawtooth", 0.09, 40);
        },
        /* Something grabbed. */
        grab: function () {
            noiseHit(0.1, 0.14, 900, 180, "lowpass");
            tone(210, 0.1, "triangle", 0.07, 110);
        },
        /* Acid. */
        inject: function () {
            noiseHit(0.3, 0.12, 700, 3200, "bandpass");
            tone(320, 0.24, "sine", 0.06, 120);
        },
        /* The electric burst. */
        shock: function () {
            noiseHit(0.26, 0.22, 5200, 400, "bandpass");
            tone(70, 0.3, "square", 0.12, 220);
            tone(1180, 0.14, "sawtooth", 0.05, 320, 0.02);
        },
        /* The swallow. The most important sound in the game. */
        gulp: function () {
            noiseHit(0.42, 0.3, 1200, 110, "lowpass");
            tone(220, 0.4, "sine", 0.14, 48);
            tone(330, 0.34, "triangle", 0.08, 60, 0.05);
            noiseHit(0.2, 0.12, 600, 1600, "bandpass", 0.2);
        },
        /* The body travels down the torso. */
        bulge: function () {
            tone(160, 0.18, "sine", 0.1, 90);
        },
        /* Too big. You choke. */
        choke: function () {
            noiseHit(0.5, 0.24, 900, 140, "lowpass");
            tone(120, 0.45, "sawtooth", 0.1, 55);
        },
        /* Somebody screams. */
        scream: function () {
            var f = 320 + Math.random() * 260;
            tone(f, 0.42, "sawtooth", 0.09, f * 1.7);
            tone(f * 1.5, 0.36, "square", 0.035, f * 2.1);
        },
        /* A gunshot. */
        shot: function () {
            noiseHit(0.11, 0.2, 4200, 500, "bandpass");
            tone(120, 0.09, "square", 0.09, 50);
        },
        /* The alarm klaxon. Two tones, because one is not alarming enough. */
        alarm: function () {
            tone(560, 0.3, "square", 0.07, 560);
            tone(420, 0.3, "square", 0.07, 420, 0.3);
        },
        /* Something died badly. */
        splat: function () {
            noiseHit(0.16, 0.16, 1500, 200, "lowpass");
        },
        /* Level cleared. */
        win: function () {
            tone(392, 0.16, "triangle", 0.09);
            tone(523, 0.16, "triangle", 0.09, null, 0.14);
            tone(659, 0.34, "triangle", 0.1, null, 0.28);
        },
        /* Level failed. */
        lose: function () {
            tone(220, 0.4, "sawtooth", 0.1, 82);
            tone(164, 0.6, "sine", 0.09, 62, 0.1);
        },
        /* A small click, for menus. */
        ui: function () {
            tone(880, 0.05, "square", 0.05, 1200);
        },
        /* A heavier click, for confirmations. */
        confirm: function () {
            tone(520, 0.07, "square", 0.07, 780);
            tone(780, 0.1, "triangle", 0.06, 1040, 0.05);
        },
        /* The heartbeat, when you are nearly empty. */
        heart: function () {
            tone(58, 0.16, "sine", 0.16, 34);
            tone(52, 0.14, "sine", 0.1, 30, 0.19);
        },
        /* The Purifier's beam. */
        beam: function () {
            noiseHit(0.5, 0.16, 1600, 1800, "bandpass");
            tone(240, 0.5, "sawtooth", 0.07, 250);
        }
    };

    S.Audio = {
        /* Must be called from a user gesture on mobile. */
        unlock: function () {
            var c = ensure();
            if (c && c.state === "suspended") {
                try { c.resume(); } catch (e) { /* ignore */ }
            }
        },

        setSettings: function (s) {
            settings.sound = s.sound !== false;
            settings.music = s.music !== false;
            if (musicGain && ctx) {
                try {
                    musicGain.gain.setTargetAtTime(settings.music ? 0.16 : 0, ctx.currentTime, 0.2);
                } catch (e) { /* ignore */ }
            }
        },

        play: function (name) {
            var fn = SFX[name];
            if (fn) fn();
        },

        /* Per-biome drone. Two detuned saws through a slow filter sweep:
         * cheap, endless, and it changes the temperature of a level. */
        music: function (biomeId) {
            var c = ensure();
            if (!c) return;
            if (musicNodes && musicNodes.biome === biomeId) return;
            S.Audio.stopMusic();
            try {
                var roots = { docks: 55, downtown: 62, ward: 49, arctic: 46, foundry: 41, hive: 58 };
                var root = roots[biomeId] || 55;
                var oscA = c.createOscillator();
                var oscB = c.createOscillator();
                var flt = c.createBiquadFilter();
                var lfo = c.createOscillator();
                var lfoGain = c.createGain();
                oscA.type = "sawtooth";
                oscB.type = "sawtooth";
                oscA.frequency.value = root;
                oscB.frequency.value = root * 1.005;
                flt.type = "lowpass";
                flt.frequency.value = 220;
                flt.Q.value = 3;
                lfo.type = "sine";
                lfo.frequency.value = 0.06;
                lfoGain.gain.value = 90;
                lfo.connect(lfoGain);
                lfoGain.connect(flt.frequency);
                oscA.connect(flt); oscB.connect(flt);
                flt.connect(musicGain);
                oscA.start(); oscB.start(); lfo.start();
                musicNodes = { biome: biomeId, oscA: oscA, oscB: oscB, lfo: lfo };
            } catch (e) { /* ignore */ }
        },

        stopMusic: function () {
            if (!musicNodes) return;
            try {
                musicNodes.oscA.stop();
                musicNodes.oscB.stop();
                musicNodes.lfo.stop();
            } catch (e) { /* ignore */ }
            musicNodes = null;
        },

        /* The tension layer: a heartbeat that starts when the alarm is
         * high or the biomass is low. */
        setTension: function (level) {
            if (!ctx) return;
            try {
                musicGain.gain.setTargetAtTime(settings.music ? 0.16 : 0, ctx.currentTime, 0.2);
                sfxGain.gain.setTargetAtTime(0.85, ctx.currentTime, 0.2);
            } catch (e) { /* ignore */ }
        }
    };
})(window.GU = window.GU || {});
