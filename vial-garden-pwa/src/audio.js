export function createAudio(settings) {
  let context = null;
  let enabled = settings.sound !== false;

  function unlock() {
    if (!enabled) return;
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === "suspended") context.resume();
    } catch { /* optional */ }
  }

  function tone(freq, duration, type, gain, delay) {
    if (!enabled || !context) return;
    const start = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(freq, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain || 0.035, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
    unlock();
    if (name === "select") tone(420, 0.04, "sine", 0.02);
    else if (name === "pour") {
      tone(300, 0.08, "triangle", 0.025);
      tone(520, 0.1, "sine", 0.02, 0.04);
    } else if (name === "complete") {
      tone(523, 0.12, "triangle", 0.04);
      tone(784, 0.18, "sine", 0.03, 0.08);
    } else if (name === "undo") tone(240, 0.08, "triangle", 0.025);
    else if (name === "shuffle") {
      tone(360, 0.06, "sine", 0.02);
      tone(460, 0.08, "sine", 0.02, 0.05);
    } else if (name === "win") {
      tone(523, 0.16, "triangle", 0.04);
      tone(659, 0.16, "triangle", 0.04, 0.1);
      tone(784, 0.24, "triangle", 0.04, 0.2);
    } else if (name === "invalid") tone(140, 0.06, "sawtooth", 0.015);
    else tone(440, 0.04, "sine", 0.02);
  }

  return {
    play,
    unlock,
    setEnabled(value) { enabled = value !== false; if (enabled) unlock(); },
    isEnabled() { return enabled; }
  };
}
