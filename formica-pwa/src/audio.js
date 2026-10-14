/*
 * FORMICA - audio.
 *
 * Ogni suono è sintetizzato al volo con oscillatori e un buffer di rumore:
 * niente file audio da spedire, cachare o non trovare offline.
 */
(function (L) {
    "use strict";

    var audio = {
        ctx: null,
        master: null,
        drone: null,
        noiseBuf: null,
        enabled: true,
        started: false,
        lastEat: -99,
        combo: 0,
    };

    function now() { return audio.ctx ? audio.ctx.currentTime : 0; }

    function makeNoise(ctx) {
        var len = ctx.sampleRate * 2;
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
        audio.master.gain.value = audio.enabled ? 0.9 : 0;
        audio.master.connect(ctx.destination);

        audio.noiseBuf = makeNoise(ctx);
        buildDrone();
    }

    /* Drone basso: il ronzio del tavolo. Di notte cala di tono. */
    function buildDrone() {
        var ctx = audio.ctx;
        var g = ctx.createGain();
        g.gain.value = 0.0;
        g.connect(audio.master);

        var filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 240;
        filter.Q.value = 2;
        filter.connect(g);

        var voices = [];
        var specs = [
            { type: "sine", f: 48, g: 0.5 },
            { type: "sine", f: 48.7, g: 0.3 },
            { type: "triangle", f: 72, g: 0.1 },
        ];
        for (var i = 0; i < specs.length; i++) {
            var o = ctx.createOscillator();
            o.type = specs[i].type;
            o.frequency.value = specs[i].f;
            var vg = ctx.createGain();
            vg.gain.value = specs[i].g;
            o.connect(vg);
            vg.connect(filter);
            o.start();
            voices.push({ osc: o, gain: vg, base: specs[i].f });
        }

        var lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.08;
        var lfoGain = ctx.createGain();
        lfoGain.gain.value = 60;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        audio.drone = { gain: g, filter: filter, voices: voices, lfo: lfo, lfoGain: lfoGain };
    }

    function resume() {
        if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume();
    }

    function setEnabled(on) {
        audio.enabled = on;
        if (audio.master) {
            audio.master.gain.setTargetAtTime(on ? 0.9 : 0, now(), 0.05);
        }
    }

    /* 0 = pieno giorno, 1 = notte fonda. */
    function setNight(t) {
        if (!audio.drone) return;
        var k = L.clamp(t, 0, 1);
        audio.drone.gain.gain.setTargetAtTime(0.07 + k * 0.09, now(), 0.8);
        audio.drone.filter.frequency.setTargetAtTime(250 - k * 120, now(), 1);
        for (var i = 0; i < audio.drone.voices.length; i++) {
            var v = audio.drone.voices[i];
            v.osc.frequency.setTargetAtTime(v.base * (1 - k * 0.18), now(), 1.4);
        }
    }

    function blip(freq, dur, type, vol, sweepTo) {
        if (!audio.ctx || !audio.enabled) return;
        var ctx = audio.ctx;
        var t = now();
        var o = ctx.createOscillator();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(audio.master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    function noise(dur, vol, filterType, freq, sweepTo) {
        if (!audio.ctx || !audio.enabled) return;
        var ctx = audio.ctx;
        var t = now();
        var src = ctx.createBufferSource();
        src.buffer = audio.noiseBuf;
        src.loop = true;

        var f = ctx.createBiquadFilter();
        f.type = filterType || "bandpass";
        f.frequency.setValueAtTime(freq, t);
        if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
        f.Q.value = 1.2;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        src.connect(f);
        f.connect(g);
        g.connect(audio.master);
        src.start(t);
        src.stop(t + dur + 0.02);
    }

    /* ===== Suoni di gioco ===== */

    /* Briciola raccolta: scricchiolio secco, in combo crescente. */
    function pickup(value) {
        if (!audio.ctx) return;
        var t = now();
        if (t - audio.lastEat > 0.5) audio.combo = 0;
        audio.lastEat = t;
        audio.combo = Math.min(12, audio.combo + 1);
        var step = Math.pow(1.0595, Math.min(audio.combo, 10) * 1.4);
        var base = value >= 14 ? 520 : 760;
        noise(0.05, 0.06, "highpass", 2400 * step);
        blip(base * step, 0.09, "triangle", 0.09, base * step * 1.3);
        if (value >= 14) blip(base * step * 0.5, 0.2, "sine", 0.06);
    }

    /* Deposito nel nido: due note dolci. */
    function deposit(value) {
        var g = value >= 14 ? 1.2 : 1;
        blip(523 * g, 0.14, "sine", 0.1);
        setTimeout(function () { blip(784 * g, 0.2, "sine", 0.08); }, 80);
    }

    /* Scontro: schiocco di chele. */
    function clash() {
        noise(0.16, 0.16, "bandpass", 1400, 300);
        blip(180, 0.12, "square", 0.07, 90);
    }

    /* Briccola rubata. */
    function steal() {
        blip(330, 0.22, "sawtooth", 0.09, 130);
    }

    /* Razzia respinta: soffio aggressivo. */
    function repelled() {
        noise(0.3, 0.18, "bandpass", 2200, 500);
        blip(440, 0.18, "square", 0.08, 660);
    }

    /* Arrivo della razzia nemica: corno basso. */
    function raidHorn() {
        blip(98, 0.8, "sawtooth", 0.14, 62);
        setTimeout(function () { blip(98, 0.8, "sawtooth", 0.14, 62); }, 420);
        noise(0.5, 0.1, "lowpass", 400, 120);
    }

    /* Nido colpito. */
    function nestHit() {
        noise(0.5, 0.22, "lowpass", 700, 90);
        blip(120, 0.5, "sawtooth", 0.16, 40);
    }

    /* Annegamento. */
    function splash() {
        noise(0.35, 0.2, "bandpass", 900, 250);
        blip(220, 0.3, "sine", 0.1, 70);
    }

    /* Inchiostro: tonfo cupo. */
    function inkHit() {
        noise(0.45, 0.24, "lowpass", 320, 60);
        blip(80, 0.6, "triangle", 0.16, 34);
    }

    /* Annessione: la colonia nemica che sfuma. */
    function annex() {
        blip(392, 0.5, "sawtooth", 0.12, 196);
        setTimeout(function () { blip(196, 0.7, "sine", 0.1, 98); }, 250);
    }

    /* Notte: discesa. */
    function nightfall() {
        blip(320, 1.1, "sine", 0.09, 160);
    }

    /* Alba: risalita. */
    function dawn() {
        blip(300, 0.8, "sine", 0.08, 520);
    }

    function death() {
        noise(1.2, 0.22, "lowpass", 600, 50);
        blip(160, 1.3, "sine", 0.2, 30);
        blip(80, 1.5, "triangle", 0.14, 26);
    }

    function workerUp() {
        blip(660, 0.14, "sine", 0.1);
        setTimeout(function () { blip(990, 0.2, "sine", 0.08); }, 80);
    }

    L.Audio = {
        init: init,
        resume: resume,
        setEnabled: setEnabled,
        setNight: setNight,
        pickup: pickup,
        deposit: deposit,
        clash: clash,
        steal: steal,
        repelled: repelled,
        raidHorn: raidHorn,
        nestHit: nestHit,
        splash: splash,
        inkHit: inkHit,
        annex: annex,
        nightfall: nightfall,
        dawn: dawn,
        death: death,
        workerUp: workerUp,
    };

})(window.FORMICA = window.FORMICA || {});
