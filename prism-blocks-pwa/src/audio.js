export function createAudio(settings) {
  let context = null;
  let enabled = settings.sound !== false;

  function unlock() {
    if (!enabled) return;
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === "suspended") context.resume();
    } catch { /* audio is optional */ }
  }

  function tone(freq, duration, type, gain, delay) {
    if (!enabled || !context) return;
    const start = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(freq, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain || 0.04, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
    unlock();
    if (name === "place") tone(320, 0.06, "triangle", 0.03);
    else if (name === "rotate") tone(480, 0.04, "sine", 0.02);
    else if (name === "clear") {
      tone(520, 0.1, "triangle", 0.045);
      tone(780, 0.16, "sine", 0.035, 0.05);
    } else if (name === "undo") tone(240, 0.08, "triangle", 0.025);
    else if (name === "win") {
      tone(523, 0.16, "triangle", 0.045);
      tone(659, 0.16, "triangle", 0.045, 0.1);
      tone(784, 0.24, "triangle", 0.045, 0.2);
    } else if (name === "lose") {
      tone(220, 0.18, "sawtooth", 0.025);
      tone(150, 0.25, "sawtooth", 0.025, 0.14);
    } else tone(440, 0.04, "sine", 0.02);
  }

  return {
    play,
    unlock,
    setEnabled(value) { enabled = value !== false; if (enabled) unlock(); },
    isEnabled() { return enabled; }
  };
}
