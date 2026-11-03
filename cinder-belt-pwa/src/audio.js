/*
 * Procedural audio. No files, no samples: every sound is an oscillator or a
 * short burst of filtered noise. Throttled per key so a full bot brawl does
 * not turn into a nest of angry bees.
 */
(function (CB) {
    "use strict";

    var ctx = null;
    var master = null;
    var ambient = null;
    var enabled = true;
    var last = {};
    var noiseBuffer = null;

    function ensure() {
        if (!enabled) return null;
        if (ctx) return ctx;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.55;
            master.connect(ctx.destination);
            noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
            var data = noiseBuffer.getChannelData(0);
            for (var i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } catch (e) {
            ctx = null;
        }
        return ctx;
    }

    function now() { return ctx ? ctx.currentTime : 0; }

    function gate(key, ms) {
        var t = Date.now();
        if (last[key] && t - last[key] < ms) return false;
        last[key] = t;
        return true;
    }

    function tone(freq, dur, type, vol, slideTo) {
        var c = ensure();
        if (!c) return;
        try {
            var t = c.currentTime;
            var osc = c.createOscillator();
            var g = c.createGain();
            osc.type = type || "sine";
            osc.frequency.setValueAtTime(freq, t);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.1), t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(g);
            g.connect(master);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        } catch (e) { /* ignore */ }
    }

    function noise(dur, vol, filterFreq, sweepTo) {
        var c = ensure();
        if (!c || !noiseBuffer) return;
        try {
            var t = c.currentTime;
            var src = c.createBufferSource();
            src.buffer = noiseBuffer;
            var filter = c.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(filterFreq || 1600, t);
            if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t + dur);
            var g = c.createGain();
            g.gain.setValueAtTime(vol || 0.1, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(filter);
            filter.connect(g);
            g.connect(master);
            src.start(t);
            src.stop(t + dur + 0.02);
        } catch (e) { /* ignore */ }
    }

    function makeAmbient() {
        var c = ensure();
        if (!c || ambient) return;
        try {
            var t = c.currentTime;
            var g = c.createGain();
            g.gain.value = 0.0;
            g.connect(master);

            var osc1 = c.createOscillator();
            osc1.type = "sine";
            osc1.frequency.value = 48;
            var osc2 = c.createOscillator();
            osc2.type = "triangle";
            osc2.frequency.value = 72;
            var osc3 = c.createOscillator();
            osc3.type = "sine";
            osc3.frequency.value = 96;
            var filter = c.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 300;

            var lfo = c.createOscillator();
            lfo.type = "sine";
            lfo.frequency.value = 0.08;
            var lfoGain = c.createGain();
            lfoGain.gain.value = 100;
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            osc1.connect(filter);
            osc2.connect(filter);
            osc3.connect(filter);
            filter.connect(g);

            osc1.start(t); osc2.start(t); osc3.start(t); lfo.start(t);
            g.gain.linearRampToValueAtTime(0.045, t + 4);
            ambient = { gain: g, filter: filter, oscs: [osc1, osc2, osc3] };
        } catch (e) { /* ignore */ }
    }

    var Audio = {
        init: function () {
            ensure();
            makeAmbient();
        },
        resume: function () {
            if (ctx && ctx.state === "suspended") {
                try { ctx.resume(); } catch (e) { /* ignore */ }
            }
        },
        setEnabled: function (on) {
            enabled = !!on;
            if (master) {
                try { master.gain.value = enabled ? 0.55 : 0; } catch (e) { /* ignore */ }
            }
        },
        setZone: function (id) {
            if (!ambient) makeAmbient();
            if (!ambient || !ctx) return;
            var freqs = {
                anchorage: [48, 72, 96],
                drift: [52, 78, 104],
                scab: [44, 66, 88],
                maw: [38, 57, 76],
                void: [34, 51, 68]
            }[id] || [48, 72, 96];
            try {
                var t = ctx.currentTime;
                ambient.oscs[0].frequency.linearRampToValueAtTime(freqs[0], t + 2);
                ambient.oscs[1].frequency.linearRampToValueAtTime(freqs[1], t + 2);
                ambient.oscs[2].frequency.linearRampToValueAtTime(freqs[2], t + 2);
                ambient.filter.frequency.linearRampToValueAtTime(id === "maw" ? 180 : 300, t + 2);
            } catch (e) { /* ignore */ }
        },
        ui: function () { if (gate("ui", 60)) tone(660, 0.05, "triangle", 0.07, 880); },
        click: function () { if (gate("click", 50)) tone(420, 0.04, "square", 0.04); },
        shoot: function (line) {
            if (!gate("shoot", 45)) return;
            if (line === "lance") tone(980, 0.07, "sawtooth", 0.05, 220);
            else if (line === "bulwark") { tone(230, 0.09, "square", 0.045, 110); noise(0.06, 0.03, 900, 300); }
            else tone(520, 0.06, "triangle", 0.04, 260);
        },
        hit: function () { if (gate("hit", 35)) noise(0.06, 0.05, 2400, 500); },
        mine: function () { if (gate("mine", 70)) { tone(150, 0.08, "sawtooth", 0.04, 80); noise(0.05, 0.035, 700, 200); } },
        crack: function () { noise(0.22, 0.12, 1200, 120); tone(90, 0.18, "triangle", 0.05, 45); },
        pickup: function () { if (gate("pickup", 60)) tone(1180, 0.05, "sine", 0.03, 1600); },
        explode: function () { noise(0.55, 0.2, 900, 60); tone(70, 0.45, "sine", 0.09, 30); },
        bigExplode: function () { noise(1.1, 0.26, 700, 40); tone(48, 0.9, "sine", 0.14, 22); },
        playerHit: function () { if (gate("phit", 90)) { noise(0.14, 0.12, 1400, 200); tone(160, 0.1, "square", 0.05, 80); } },
        death: function () { tone(320, 0.8, "sawtooth", 0.08, 40); noise(0.9, 0.16, 800, 50); },
        dock: function () { tone(440, 0.12, "sine", 0.07, 660); setTimeout(function () { tone(660, 0.18, "sine", 0.06, 880); }, 110); },
        upgrade: function () { tone(523, 0.12, "triangle", 0.07); setTimeout(function () { tone(784, 0.15, "triangle", 0.07); }, 100); setTimeout(function () { tone(1047, 0.25, "triangle", 0.06); }, 210); },
        error: function () { tone(140, 0.15, "square", 0.06, 100); },
        alarm: function () { if (gate("alarm", 900)) { tone(520, 0.2, "square", 0.05, 380); setTimeout(function () { tone(520, 0.2, "square", 0.05, 380); }, 260); } },
        boss: function () { tone(60, 1.6, "sawtooth", 0.12, 32); noise(1.4, 0.14, 500, 50); },
        core: function () { tone(880, 0.35, "sine", 0.07, 1320); setTimeout(function () { tone(1320, 0.5, "sine", 0.05, 880); }, 200); },
        win: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.4, "triangle", 0.08); }, i * 160); }); },
        lose: function () { [392, 349, 294, 220].forEach(function (f, i) { setTimeout(function () { tone(f, 0.5, "sawtooth", 0.06); }, i * 200); }); },
        buzz: function (pattern) {
            if (!CB.Storage.hapticsOn()) return;
            if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
        }
    };

    CB.Audio = Audio;
})(window.CB = window.CB || {});
