/*
 * DEEP ORBIT — procedural adaptive soundtrack.
 *
 * No audio files. Three WebAudio layers (pad, arpeggio, pulse) fade with a
 * combat-intensity value supplied by the game. Created only after a user
 * gesture so mobile autoplay policies are respected; degrades to a silent
 * no-op when WebAudio is unavailable.
 */

const SCALE = [0, 3, 5, 7, 10, 12, 15];
const ROOT = 110; // A2

export function createAudio(getIntensity, isEnabled) {
    let ctx = null;
    let master = null;
    let padGain = null;
    let arpGain = null;
    let pulseGain = null;
    let padNodes = [];
    let noiseBuffer = null;
    let nextArp = 0;
    let nextPulse = 0;
    let step = 0;
    let enabled = typeof isEnabled === "function" ? isEnabled() : true;
    let intensity = 0;

    function hz(semi) {
        return ROOT * Math.pow(2, semi / 12);
    }

    function makeNoise() {
        const len = Math.floor(ctx.sampleRate * 0.18);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        }
        return buf;
    }

    function build() {
        const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return false;
        try {
            ctx = new AC();
        } catch (e) {
            ctx = null;
            return false;
        }

        master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);

        // Ambient pad: two detuned oscillators through a soft low-pass.
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 620;
        padGain = ctx.createGain();
        padGain.gain.value = 0.1;
        filter.connect(padGain);
        padGain.connect(master);
        for (const detune of [-6, 7]) {
            const osc = ctx.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.value = hz(0);
            osc.detune.value = detune;
            osc.connect(filter);
            osc.start();
            padNodes.push(osc);
        }

        arpGain = ctx.createGain();
        arpGain.gain.value = 0.05;
        arpGain.connect(master);

        pulseGain = ctx.createGain();
        pulseGain.gain.value = 0;
        pulseGain.connect(master);

        noiseBuffer = makeNoise();
        return true;
    }

    function arpNote() {
        const semi = SCALE[step % SCALE.length] + (Math.floor(step / SCALE.length) % 2 ? 12 : 0);
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = hz(semi + 24);
        const t = ctx.currentTime;
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.connect(env);
        env.connect(arpGain);
        osc.start(t);
        osc.stop(t + 0.24);
        step += 1;
    }

    function pulse() {
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 1800;
        src.buffer = noiseBuffer;
        src.connect(filter);
        filter.connect(pulseGain);
        src.start();
    }

    function ramp(param, value, seconds) {
        try {
            param.linearRampToValueAtTime(value, ctx.currentTime + seconds);
        } catch (e) {
            param.value = value;
        }
    }

    return {
        unlock: function () {
            if (!ctx && !build()) return;
            if (ctx.state === "suspended") ctx.resume().catch(function () {});
        },

        suspend: function () {
            if (ctx && ctx.state === "running") ctx.suspend().catch(function () {});
        },

        resume: function () {
            if (ctx && ctx.state === "suspended") ctx.resume().catch(function () {});
        },

        setEnabled: function (value) {
            enabled = !!value;
            if (master) ramp(master.gain, enabled ? 0.22 : 0, 0.25);
        },

        isReady: function () {
            return !!ctx && ctx.state === "running";
        },

        update: function (dt) {
            if (!ctx || ctx.state !== "running") return;
            const target = typeof getIntensity === "function" ? getIntensity() : 0;
            intensity += (target - intensity) * Math.min(1, (dt || 1 / 60) * 2.5);

            ramp(master.gain, enabled ? 0.22 : 0, 0.2);
            ramp(arpGain.gain, 0.035 + intensity * 0.14, 0.3);
            ramp(pulseGain.gain, intensity * 0.16, 0.3);
            ramp(padGain.gain, 0.085 + intensity * 0.03, 0.5);

            const now = ctx.currentTime;
            if (now >= nextArp) {
                arpNote();
                nextArp = now + (0.42 - intensity * 0.14);
            }
            if (intensity > 0.22 && now >= nextPulse) {
                pulse();
                nextPulse = now + (0.72 - intensity * 0.28);
            }
            if (nextArp < now - 2) nextArp = now;
            if (nextPulse < now - 2) nextPulse = now;
        },

        destroy: function () {
            try {
                for (const osc of padNodes) osc.stop();
                if (ctx) ctx.close();
            } catch (e) {}
            ctx = null;
            padNodes = [];
        }
    };
}
