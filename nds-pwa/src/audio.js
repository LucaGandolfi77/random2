/* ===== Tiny WebAudio helper (no audio assets) ===== */
export class AudioBus {
    constructor(volume = 50) {
        this.ctx = null;
        this.master = null;
        this.volume = volume;
    }

    _ensure() {
        if (this.ctx) return true;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume / 100 * 0.35;
        this.master.connect(this.ctx.destination);
        return true;
    }

    unlock() {
        if (!this._ensure()) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    }

    setVolume(v) {
        this.volume = v;
        if (this.master) this.master.gain.value = (v / 100) * 0.35;
    }

    beep(freq = 440, dur = 0.08, type = 'square', vol = 0.6) {
        if (!this._ensure() || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    click() { this.beep(660, 0.05, 'square', 0.35); }
    confirm() { this.beep(520, 0.09, 'triangle', 0.5); }
}
