const NOTES = {
  A2: 110,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196,
  A3: 220,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880
};

const PATTERN = [
  NOTES.A3, 0, NOTES.C4, 0, NOTES.E4, 0, NOTES.D4, 0,
  NOTES.A3, 0, NOTES.C4, 0, NOTES.G4, 0, NOTES.E4, 0
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuffer = null;
  let musicTimer = null;
  let step = 0;
  let intensity = 1;
  let settings = { sound: true, music: true };

  function readSettings() {
    try {
      const live = globalThis.R2?.getSettings?.();
      if (live) settings = { ...settings, ...live };
    } catch {
    }
    return settings;
  }

  function ensure() {
    readSettings();
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.7;
        master.connect(ctx.destination);
        sfxBus = ctx.createGain();
        sfxBus.gain.value = 0.85;
        sfxBus.connect(master);
        musicBus = ctx.createGain();
        musicBus.gain.value = 0.36;
        musicBus.connect(master);
      } catch {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function noiseBufferFor(context) {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(context.sampleRate * 0.35);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
    return buffer;
  }

  function tone({
    freq = 440,
    endFreq = freq,
    type = 'sine',
    duration = 0.12,
    gain = 0.08,
    attack = 0.004,
    delay = 0,
    bus = sfxBus
  }) {
    if (!ctx || !bus) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  function noise({ duration = 0.12, gain = 0.08, frequency = 800, q = 0.8, delay = 0 }) {
    if (!ctx || !sfxBus) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBufferFor(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, t0);
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(sfxBus);
    src.start(t0);
    src.stop(t0 + duration + 0.03);
  }

  function play(name, data = {}) {
    if (!readSettings().sound) return;
    if (!ensure()) return;
    switch (name) {
      case 'shoot':
        tone({ freq: 420 + (data.power ?? 0.6) * 280, endFreq: 160, type: 'triangle', duration: 0.09, gain: 0.07 });
        noise({ duration: 0.06, gain: 0.025, frequency: 1800 });
        break;
      case 'hit':
        tone({ freq: 820, endFreq: 480, type: 'square', duration: 0.045, gain: 0.045 });
        break;
      case 'crit':
        tone({ freq: 1180, endFreq: 740, type: 'triangle', duration: 0.1, gain: 0.075 });
        tone({ freq: 1560, endFreq: 980, type: 'sine', duration: 0.14, gain: 0.035, delay: 0.02 });
        break;
      case 'kill':
        tone({ freq: 260, endFreq: 120, type: 'sawtooth', duration: 0.12, gain: 0.04 });
        noise({ duration: 0.08, gain: 0.035, frequency: 480, q: 0.6 });
        break;
      case 'wallHit':
        tone({ freq: 96, endFreq: 48, type: 'sawtooth', duration: 0.28, gain: 0.11 });
        noise({ duration: 0.18, gain: 0.08, frequency: 240, q: 0.5 });
        break;
      case 'blocked':
        tone({ freq: 520, endFreq: 760, type: 'triangle', duration: 0.14, gain: 0.07 });
        break;
      case 'pickup':
        tone({ freq: 660, endFreq: 880, type: 'sine', duration: 0.1, gain: 0.06 });
        tone({ freq: 990, endFreq: 1320, type: 'sine', duration: 0.16, gain: 0.045, delay: 0.06 });
        break;
      case 'heal':
        tone({ freq: 440, endFreq: 660, type: 'sine', duration: 0.22, gain: 0.05 });
        break;
      case 'wave':
        tone({ freq: 210, endFreq: 315, type: 'triangle', duration: 0.28, gain: 0.08 });
        tone({ freq: 420, endFreq: 630, type: 'sine', duration: 0.4, gain: 0.035, delay: 0.08 });
        break;
      case 'boss':
        tone({ freq: 72, endFreq: 48, type: 'sawtooth', duration: 0.9, gain: 0.13 });
        noise({ duration: 0.7, gain: 0.055, frequency: 120, q: 0.4 });
        break;
      case 'volley':
        tone({ freq: 760, endFreq: 1240, type: 'sawtooth', duration: 0.2, gain: 0.05 });
        [0, 1, 2].forEach((i) => {
          tone({ freq: 880 + i * 180, endFreq: 560, type: 'triangle', duration: 0.12, gain: 0.035, delay: i * 0.035 });
        });
        break;
      case 'shatter':
        noise({ duration: 0.12, gain: 0.045, frequency: 2600, q: 1.2 });
        break;
      case 'summon':
        tone({ freq: 150, endFreq: 90, type: 'sine', duration: 0.3, gain: 0.04 });
        break;
      case 'ui':
        tone({ freq: 520, endFreq: 620, type: 'triangle', duration: 0.055, gain: 0.035 });
        break;
      case 'draft':
        tone({ freq: 392, endFreq: 523, type: 'sine', duration: 0.18, gain: 0.055 });
        tone({ freq: 523, endFreq: 659, type: 'sine', duration: 0.22, gain: 0.04, delay: 0.08 });
        break;
      case 'achievement':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          tone({ freq, endFreq: freq, type: 'sine', duration: 0.3, gain: 0.045, delay: i * 0.08 });
        });
        break;
      case 'gameover':
        tone({ freq: 220, endFreq: 110, type: 'sawtooth', duration: 0.9, gain: 0.07 });
        tone({ freq: 164, endFreq: 82, type: 'triangle', duration: 1.1, gain: 0.05, delay: 0.12 });
        break;
      default:
        tone({ freq: 440, endFreq: 440, type: 'sine', duration: 0.06, gain: 0.03 });
    }
  }

  function tickMusic() {
    if (!ctx || !musicBus || !readSettings().music) return;
    const note = PATTERN[step % PATTERN.length];
    const t = step % PATTERN.length;
    if (note) {
      tone({
        freq: note,
        endFreq: note,
        type: 'triangle',
        duration: 0.32,
        gain: 0.035 * intensity,
        bus: musicBus
      });
      tone({
        freq: note * 2,
        endFreq: note * 2,
        type: 'sine',
        duration: 0.26,
        gain: 0.012 * intensity,
        bus: musicBus,
        delay: 0.02
      });
    }
    if (t % 4 === 0) {
      tone({
        freq: NOTES.A2,
        endFreq: NOTES.A2 * 0.98,
        type: 'sine',
        duration: 0.55,
        gain: 0.065 * intensity,
        bus: musicBus
      });
    }
    if (t === 8) {
      tone({
        freq: NOTES.E3,
        endFreq: NOTES.E3,
        type: 'sine',
        duration: 0.7,
        gain: 0.04 * intensity,
        bus: musicBus
      });
    }
    step++;
  }

  function startMusic() {
    if (!ensure()) return;
    if (musicTimer) return;
    step = 0;
    tickMusic();
    musicTimer = setInterval(tickMusic, 290);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function setIntensity(wave) {
    intensity = 1 + Math.min(0.85, Math.max(0, wave - 1) * 0.035);
  }

  function setSettings(next) {
    settings = { ...settings, ...(next || {}) };
    if (!settings.music) stopMusic();
  }

  function unlock() {
    ensure();
  }

  return {
    play,
    startMusic,
    stopMusic,
    setIntensity,
    setSettings,
    unlock,
    get context() {
      return ctx;
    }
  };
}
