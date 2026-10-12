/*
 * Mustang PWA - sound engine
 * Everything is synthesised with WebAudio oscillators and a noise buffer.
 */
(function (global) {
    "use strict";

    const MUSTANG = (global.MUSTANG = global.MUSTANG || {});

    const Sound = {
        ctx: null,
        master: null,
        noise: null,
        enabled: true,
        ready: false,
        lastHit: -1,
        lastEnemyShot: -1,
        noiseNode: null,
        noiseGain: null,

        init() {
            if (this.ctx) return;
            try {
                const AC = global.AudioContext || global.webkitAudioContext;
                if (!AC) return;
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.enabled ? 0.5 : 0;
                this.master.connect(this.ctx.destination);
                const len = Math.floor(this.ctx.sampleRate * 0.6);
                this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
                const data = this.noise.getChannelData(0);
                for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
                this.ready = true;
                this.ensureNoiseChain();
            } catch (e) {
                this.ready = false;
            }
        },

        unlock() {
            this.init();
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume().catch(() => {});
            }
        },

        setEnabled(on) {
            this.enabled = on;
            if (this.master) this.master.gain.value = on ? 0.5 : 0;
        },

        tone(freq, dur, type, vol, slideTo) {
            if (!this.ready || !this.enabled) return;
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.master);
                osc.type = type || "square";
                osc.frequency.setValueAtTime(freq, t);
                if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
                gain.gain.setValueAtTime(vol || 0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
                osc.start(t);
                osc.stop(t + dur + 0.02);
            } catch (e) {}
        },

        ensureNoiseChain() {
            if (this.noiseNode || !this.ready || !this.ctx) return null;
            const src = this.ctx.createBufferSource();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            src.buffer = this.noise;
            src.loop = true;
            filter.type = "lowpass";
            filter.frequency.value = 1600;
            gain.gain.value = 0.0001;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.master);
            src.start();
            this.noiseNode = src;
            this.noiseFilter = filter;
            this.noiseGain = gain;
            return gain;
        },

        burst(dur, vol, freq) {
            if (!this.ready || !this.enabled) return;
            try {
                const gain = this.ensureNoiseChain();
                if (!gain) return;
                const t = this.ctx.currentTime;
                this.noiseFilter.frequency.setValueAtTime(freq || 1800, t);
                this.noiseFilter.frequency.exponentialRampToValueAtTime(120, t + dur);
                gain.gain.cancelScheduledValues(t);
                gain.gain.setValueAtTime(vol || 0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            } catch (e) {}
        },

        note(freq, dur, type, vol, when) {
            if (!this.ready || !this.enabled) return;
            try {
                const t = this.ctx.currentTime + when;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.master);
                osc.type = type;
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
                osc.start(t);
                osc.stop(t + dur + 0.02);
            } catch (e) {}
        },

        kick(when) {
            if (!this.ready || !this.enabled) return;
            try {
                const t = this.ctx.currentTime + when;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.master);
                osc.type = "sine";
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
                gain.gain.setValueAtTime(0.22, t);
                gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
                osc.start(t);
                osc.stop(t + 0.16);
            } catch (e) {}
        },

        hat(when) {
            if (!this.ready || !this.enabled) return;
            try {
                const t = this.ctx.currentTime + when;
                const src = this.ctx.createBufferSource();
                const f = this.ctx.createBiquadFilter();
                const g = this.ctx.createGain();
                src.buffer = this.noise;
                f.type = "highpass";
                f.frequency.value = 6500;
                g.gain.setValueAtTime(0.05, t);
                g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
                src.connect(f); f.connect(g); g.connect(this.master);
                src.start(t);
                src.stop(t + 0.07);
            } catch (e) {}
        },

        hit() {
            const now = Sound.ctx ? Sound.ctx.currentTime : 0;
            if (now - this.lastHit < 0.045) return;
            this.lastHit = now;
            this.tone(1500, 0.05, "square", 0.05, 900);
        },

        shoot() { this.tone(720, 0.045, "square", 0.055, 380); },
        sideShoot() { this.tone(560, 0.05, "triangle", 0.04, 300); },
        enemyShot() {
            const now = Sound.ctx ? Sound.ctx.currentTime : 0;
            if (now - this.lastEnemyShot < 0.05) return;
            this.lastEnemyShot = now;
            this.tone(280, 0.07, "sawtooth", 0.035, 170);
        },
        explode() { this.burst(0.34, 0.28, 2200); this.tone(110, 0.28, "sine", 0.14, 40); },
        bigExplode() { this.burst(0.75, 0.4, 2600); this.tone(90, 0.6, "sine", 0.2, 30); },
        powerup() { this.tone(660, 0.08, "square", 0.1); setTimeout(() => this.tone(990, 0.08, "square", 0.1), 70); setTimeout(() => this.tone(1320, 0.16, "square", 0.1), 140); },
        oneUp() { this.tone(520, 0.09, "triangle", 0.12); setTimeout(() => this.tone(780, 0.09, "triangle", 0.12), 80); setTimeout(() => this.tone(1040, 0.09, "triangle", 0.12), 160); setTimeout(() => this.tone(1560, 0.22, "triangle", 0.12), 240); },
        yashichi() { this.tone(880, 0.1, "sine", 0.12, 1760); setTimeout(() => this.tone(1760, 0.2, "sine", 0.1), 110); },
        loop() { this.tone(300, 0.32, "sine", 0.11, 900); this.burst(0.3, 0.07, 900); },
        sideLost() { this.tone(420, 0.3, "sawtooth", 0.1, 110); },
        smartBomb() { this.burst(1.1, 0.42, 3200); this.tone(70, 0.9, "sine", 0.24, 28); },
        death() { this.burst(0.6, 0.34, 1800); this.tone(200, 0.7, "sine", 0.2, 50); },
        briefing() { this.tone(392, 0.12, "square", 0.1); setTimeout(() => this.tone(587, 0.16, "square", 0.1), 110); },
        carrier() { [261, 329, 392, 523].forEach((f, i) => setTimeout(() => this.tone(f, 0.34, "triangle", 0.09), i * 130)); },
        stageClear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, "triangle", 0.12), i * 130)); },
        gameOver() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.42, "sawtooth", 0.12), i * 220)); },
        victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "triangle", 0.13), i * 150)); },
    };

    /* ===== Music Engine ===== */
    const Music = {
        on: false,
        timer: null,
        step: 0,
        nextTime: 0,
        track: MUSTANG.data.music,

        start() {
            if (this.on || !Sound.ready || !Sound.ctx) return;
            this.on = true;
            this.step = 0;
            this.nextTime = Sound.ctx ? Sound.ctx.currentTime + 0.08 : 0;
            if (this.timer === null) {
                this.timer = setInterval(() => this.schedule(), 40);
            }
            this.schedule();
        },

        stop() {
            this.on = false;
            if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
        },

        schedule() {
            if (!this.on || !Sound.ready || !Sound.ctx) return;
            const beat = 60 / this.track.tempo / 2;
            const now = Sound.ctx.currentTime;
            while (this.nextTime < now + 0.8) {
                const i = this.step % this.track.bass.length;
                const bar = Math.floor(this.step / this.track.bass.length) % 4;
                const root = bar === 3 ? 3 : 0;
                const when = this.nextTime - now;

                Sound.note(55 * Math.pow(2, (this.track.bass[i] + root) / 12), beat * 0.9, "sawtooth", 0.045, when);
                if (i % 2 === 0) Sound.kick(when);
                Sound.hat(when + beat * 0.5);
                if (i % 2 === 1) {
                    Sound.note(220 * Math.pow(2, this.track.lead[i] / 12), beat * 0.7, "square", 0.018, when);
                }
                this.nextTime += beat;
                this.step++;
            }
        },
    };

    Sound.music = Music;

    MUSTANG.Sound = Sound;
    MUSTANG.Music = Music;
})(typeof window !== "undefined" ? window : globalThis);