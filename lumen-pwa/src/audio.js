/*
 * LUMEN - audio.
 *
 * Every sound is synthesised at runtime with oscillators and a noise buffer,
 * so there are no audio assets to ship, cache or fail to load offline.
 */
(function (L) {
    "use strict";

    var audio = {
        ctx: null,
        master: null,
        drone: null,
        noiseBuf: null,
        boostNode: null,
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

    /* A low drone that deepens as you swim further down the map. */
    function buildDrone() {
        var ctx = audio.ctx;
        var g = ctx.createGain();
        g.gain.value = 0.0;
        g.connect(audio.master);

        var filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 220;
        filter.Q.value = 3;
        filter.connect(g);

        var voices = [];
        var specs = [
            { type: "sine", f: 55, g: 0.5 },
            { type: "sine", f: 55.6, g: 0.35 },
            { type: "triangle", f: 82.5, g: 0.12 },
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

        /* Slow filter sweep gives it motion without ever repeating audibly. */
        var lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.06;
        var lfoGain = ctx.createGain();
        lfoGain.gain.value = 90;
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

    /* 0 at the surface, 1 at the bottom of the map. */
    function setDepth(t) {
        if (!audio.drone) return;
        var k = L.clamp(t, 0, 1);
        audio.drone.gain.gain.setTargetAtTime(0.1 + k * 0.13, now(), 0.6);
        audio.drone.filter.frequency.setTargetAtTime(260 - k * 130, now(), 0.8);
        for (var i = 0; i < audio.drone.voices.length; i++) {
            var v = audio.drone.voices[i];
            v.osc.frequency.setTargetAtTime(v.base * (1 - k * 0.22), now(), 1.2);
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
        f.Q.value = 1.4;

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

    /* ===== Game sounds ===== */
    function eat(value) {
        if (!audio.ctx) return;
        var t = now();
        if (t - audio.lastEat > 0.55) audio.combo = 0;
        audio.lastEat = t;
        audio.combo = Math.min(14, audio.combo + 1);

        var step = Math.pow(1.0595, Math.min(audio.combo, 12) * 1.5);
        var base = value >= 8 ? 620 : 880;
        blip(base * step, 0.1, "sine", 0.10, base * step * 1.35);
        if (value >= 8) blip(base * step * 0.5, 0.22, "triangle", 0.07);
    }

    function kill() {
        noise(0.42, 0.24, "bandpass", 900, 90);
        blip(320, 0.5, "sawtooth", 0.16, 60);
    }

    function death() {
        noise(1.1, 0.2, "lowpass", 700, 60);
        blip(180, 1.2, "sine", 0.2, 34);
        blip(90, 1.4, "triangle", 0.14, 28);
    }

    function stun() {
        blip(220, 0.35, "square", 0.09, 90);
    }

    function anglerRoar() {
        blip(70, 0.9, "sawtooth", 0.14, 44);
        noise(0.8, 0.1, "lowpass", 300, 80);
    }

    function levelUp() {
        blip(660, 0.16, "sine", 0.1);
        setTimeout(function () { blip(990, 0.22, "sine", 0.09); }, 90);
    }

    function setBoost(on) {
        if (!audio.ctx) return;
        if (on && !audio.boostNode) {
            var ctx = audio.ctx;
            var src = ctx.createBufferSource();
            src.buffer = audio.noiseBuf;
            src.loop = true;
            var f = ctx.createBiquadFilter();
            f.type = "bandpass";
            f.frequency.value = 420;
            f.Q.value = 0.9;
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, now());
            g.gain.exponentialRampToValueAtTime(0.07, now() + 0.08);
            src.connect(f); f.connect(g); g.connect(audio.master);
            src.start();
            audio.boostNode = { src: src, gain: g };
        } else if (!on && audio.boostNode) {
            var node = audio.boostNode;
            audio.boostNode = null;
            node.gain.gain.setTargetAtTime(0.0001, now(), 0.05);
            setTimeout(function () { try { node.src.stop(); } catch (e) { /* already stopped */ } }, 300);
        }
    }

    L.Audio = {
        init: init,
        resume: resume,
        setEnabled: setEnabled,
        setDepth: setDepth,
        setBoost: setBoost,
        eat: eat,
        kill: kill,
        death: death,
        stun: stun,
        levelUp: levelUp,
        anglerRoar: anglerRoar,
    };

})(window.LUMEN = window.LUMEN || {});
