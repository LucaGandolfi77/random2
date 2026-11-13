/*
 * LAST CALL sound desk — everything is synthesised, nothing is downloaded.
 * A small WebAudio layer with a lounge loop for the menus and short game
 * sounds. Haptics stay in the shared arcade settings when available.
 */
(function (LC) {
    "use strict";

    var A = {
        ctx: null,
        master: null,
        musicGain: null,
        sound: true,
        music: true,
        musicTimer: null,
        musicStep: 0,
        lastHit: 0,
        lastShoot: 0
    };

    var CHORDS = [
        [146.83, 220.00, 261.63, 329.63], /* Dm9-ish */
        [196.00, 246.94, 293.66, 369.99], /* G13-ish */
        [130.81, 196.00, 246.94, 329.63], /* Cmaj9-ish */
        [110.00, 164.81, 220.00, 277.18]  /* A7-ish */
    ];

    function now() {
        return A.ctx ? A.ctx.currentTime : 0;
    }

    A.init = function () {
        if (A.ctx) {
            if (A.ctx.state === "suspended") A.ctx.resume();
            return;
        }
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
            A.ctx = new AC();
            A.master = A.ctx.createGain();
            A.master.gain.value = 0.55;
            A.master.connect(A.ctx.destination);
            A.musicGain = A.ctx.createGain();
            A.musicGain.gain.value = 0.16;
            A.musicGain.connect(A.master);
        } catch (e) {
            A.ctx = null;
        }
    };

    A.resume = function () {
        A.init();
        if (A.ctx && A.ctx.state === "suspended") A.ctx.resume();
    };

    A.setSound = function (on) { A.sound = on !== false; };
    A.setMusic = function (on) {
        A.music = on !== false;
        if (!A.music) A.stopMusic();
    };

    function tone(freq, dur, type, vol, slideTo, delay, destination) {
        if (!A.sound || !A.ctx) return;
        try {
            var t = now() + (delay || 0);
            var osc = A.ctx.createOscillator();
            var gain = A.ctx.createGain();
            osc.type = type || "sine";
            osc.frequency.setValueAtTime(freq, t);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.1), t + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(gain);
            gain.connect(destination || A.master);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        } catch (e) {}
    }

    function noise(dur, vol, delay, filterFreq) {
        if (!A.sound || !A.ctx) return;
        try {
            var t = now() + (delay || 0);
            var len = Math.max(1, Math.floor(A.ctx.sampleRate * dur));
            var buffer = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
            var src = A.ctx.createBufferSource();
            src.buffer = buffer;
            var filter = A.ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = filterFreq || 1400;
            filter.Q.value = 0.7;
            var gain = A.ctx.createGain();
            gain.gain.value = vol || 0.08;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(A.master);
            src.start(t);
            src.stop(t + dur);
        } catch (e) {}
    }

    A.click = function () {
        A.resume();
        tone(620, 0.05, "triangle", 0.05, 720);
    };

    A.select = function () {
        A.resume();
        tone(440, 0.07, "sine", 0.06, 560);
        tone(660, 0.09, "sine", 0.04, 780, 0.04);
    };

    A.deal = function () {
        A.resume();
        noise(0.16, 0.05, 0, 2400);
        tone(280, 0.12, "triangle", 0.05, 220);
    };

    A.place = function () {
        A.resume();
        noise(0.09, 0.07, 0, 900);
        tone(220, 0.11, "triangle", 0.08, 160);
        tone(520, 0.12, "sine", 0.04, 700, 0.03);
    };

    A.hit = function (big) {
        var t = Date.now();
        if (t - A.lastHit < 42) return;
        A.lastHit = t;
        if (!A.ctx) return;
        noise(0.035, big ? 0.07 : 0.028, 0, big ? 700 : 1500);
        tone(big ? 110 : 190, 0.05, "square", big ? 0.035 : 0.016, big ? 70 : 120);
    };

    A.shoot = function () {
        var t = Date.now();
        if (t - A.lastShoot < 55) return;
        A.lastShoot = t;
        if (!A.ctx) return;
        tone(880, 0.06, "triangle", 0.03, 1320);
    };

    A.towerHit = function () {
        if (!A.ctx) return;
        noise(0.08, 0.05, 0, 500);
        tone(150, 0.1, "square", 0.04, 90);
    };

    A.towerDown = function () {
        A.resume();
        noise(0.5, 0.16, 0, 380);
        tone(90, 0.5, "sawtooth", 0.12, 42);
        tone(180, 0.35, "triangle", 0.08, 70, 0.04);
        tone(260, 0.22, "sine", 0.05, 130, 0.12);
    };

    A.spell = function () {
        A.resume();
        noise(0.32, 0.12, 0, 1100);
        tone(520, 0.35, "sine", 0.07, 120);
        tone(780, 0.25, "triangle", 0.05, 200, 0.04);
    };

    A.freeze = function () {
        A.resume();
        tone(1200, 0.4, "sine", 0.05, 1800);
        tone(1600, 0.32, "sine", 0.035, 2200, 0.06);
        noise(0.2, 0.04, 0, 3800);
    };

    A.heal = function () {
        tone(660, 0.16, "sine", 0.035, 990);
        tone(990, 0.2, "sine", 0.025, 1320, 0.06);
    };

    A.coin = function () {
        tone(988, 0.1, "square", 0.045, 988);
        tone(1319, 0.18, "square", 0.04, 1319, 0.07);
    };

    A.win = function () {
        A.resume();
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
            tone(f, 0.5, "triangle", 0.08, f * 1.01, i * 0.11);
        });
        noise(0.4, 0.04, 0.3, 2400);
    };

    A.lose = function () {
        A.resume();
        [392, 349.23, 293.66, 220].forEach(function (f, i) {
            tone(f, 0.55, "triangle", 0.07, f * 0.98, i * 0.14);
        });
    };

    A.overtime = function () {
        A.resume();
        tone(220, 0.18, "square", 0.05, 220);
        tone(330, 0.18, "square", 0.05, 330, 0.18);
        tone(440, 0.3, "square", 0.05, 440, 0.36);
    };

    A.error = function () {
        A.resume();
        tone(180, 0.12, "square", 0.045, 120);
    };

    A.upgrade = function () {
        A.resume();
        [440, 554, 659, 880].forEach(function (f, i) {
            tone(f, 0.24, "sine", 0.05, f, i * 0.06);
        });
    };

    A.startMusic = function (venueIndex) {
        A.resume();
        if (!A.ctx || !A.music) return;
        A.stopMusic();
        A.musicStep = 0;
        var step = function () {
            if (!A.music || !A.ctx) return;
            var chord = CHORDS[A.musicStep % CHORDS.length];
            A.musicStep++;
            var base = (venueIndex || 0) * 0.01;
            chord.forEach(function (freq, i) {
                var t = now() + i * 0.025;
                try {
                    var osc = A.ctx.createOscillator();
                    var gain = A.ctx.createGain();
                    osc.type = i === 0 ? "sine" : "triangle";
                    osc.frequency.value = freq * (1 + base);
                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.exponentialRampToValueAtTime(i === 0 ? 0.06 : 0.025, t + 0.5);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
                    osc.connect(gain);
                    gain.connect(A.musicGain);
                    osc.start(t);
                    osc.stop(t + 3.5);
                } catch (e) {}
            });
            /* brushed snare-ish texture */
            try {
                var t2 = now();
                var len = Math.floor(A.ctx.sampleRate * 0.14);
                var buffer = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var j = 0; j < len; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / len);
                var src = A.ctx.createBufferSource();
                src.buffer = buffer;
                var filt = A.ctx.createBiquadFilter();
                filt.type = "highpass";
                filt.frequency.value = 2600;
                var g = A.ctx.createGain();
                g.gain.value = 0.018;
                src.connect(filt);
                filt.connect(g);
                g.connect(A.musicGain);
                src.start(t2 + 1.6);
            } catch (e) {}
        };
        step();
        A.musicTimer = setInterval(step, 2800);
    };

    A.stopMusic = function () {
        if (A.musicTimer) {
            clearInterval(A.musicTimer);
            A.musicTimer = null;
        }
    };

    A.suspend = function () {
        A.stopMusic();
        if (A.ctx && A.ctx.state === "running") {
            try { A.ctx.suspend(); } catch (e) {}
        }
    };

    A.resumeContext = function () {
        if (A.ctx && A.ctx.state === "suspended") {
            try { A.ctx.resume(); } catch (e) {}
        }
    };

    LC.Audio = A;
})(window.LC = window.LC || {});