/*
 * PIXEL CUP '96 — sound
 * ---------------------
 * Everything you hear is synthesised in the browser: there is not one
 * audio file in this folder, which is why the game works offline and why
 * it weighs nothing.
 *
 * Three layers:
 *   - the crowd, a loop of filtered noise whose volume follows how
 *     exciting the match is;
 *   - the effects, one-shot blips for the whistle, the kick, the net and
 *     the post;
 *   - the music, a sixteen-step sequencer playing a square-wave bass line
 *     and a pulse-wave lead over a noise drum.
 */

(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelAudio = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var NOTE = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6,
    "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11,
  };

  function freq(name, octave) {
    var n = NOTE[name] + (octave - 4) * 12;
    return 440 * Math.pow(2, (n - 9) / 12);
  }

  /* The match theme: sixteen steps of bass and lead, in A minor. */
  var BASS = ["A2", "A2", "E3", "E3", "F2", "F2", "C3", "C3",
              "G2", "G2", "D3", "D3", "E2", "E2", "E3", "E3"];
  var LEAD = ["A4", "-", "C5", "-", "E5", "-", "D5", "C5",
              "B4", "-", "D5", "-", "F5", "-", "E5", "-"];
  var KICKPAT = [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0];
  var HATPAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0];

  function createAudio(opts) {
    opts = opts || {};
    var ctx = null;
    var master = null, sfxGain = null, musicGain = null, crowdGain = null;
    var noiseBuffer = null;
    var started = false;
    var musicTimer = null;
    var step = 0;
    var nextTime = 0;
    var tempo = 148;
    var musicOn = true;
    var excitement = 0;
    var targetCrowd = 0.06;
    var settings = { sound: true, music: true };

    function ensure() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.85;
      sfxGain.connect(master);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.28;
      musicGain.connect(master);
      crowdGain = ctx.createGain();
      crowdGain.gain.value = 0.0;
      crowdGain.connect(master);
      /* A second of white noise, reused by the crowd and the drums. */
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return ctx;
    }

    function resume() {
      ensure();
      if (ctx && ctx.state === "suspended") ctx.resume();
    }

    /* ---- the crowd ---- */

    function startCrowd() {
      if (!ensure() || started) return;
      started = true;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 780;
      filter.Q.value = 0.7;
      var filter2 = ctx.createBiquadFilter();
      filter2.type = "lowpass";
      filter2.frequency.value = 2200;
      src.connect(filter);
      filter.connect(filter2);
      filter2.connect(crowdGain);
      src.start();
    }

    /* The crowd gets louder as the match gets exciting. */
    function setExcitement(v) {
      excitement = v;
      targetCrowd = 0.05 + v * 0.4;
      if (crowdGain && ctx) {
        crowdGain.gain.setTargetAtTime(targetCrowd, ctx.currentTime, 0.35);
      }
    }

    function crowdRoar(amount) {
      if (!ensure()) return;
      var now = ctx.currentTime;
      crowdGain.gain.cancelScheduledValues(now);
      crowdGain.gain.setValueAtTime(crowdGain.gain.value, now);
      crowdGain.gain.linearRampToValueAtTime(0.05 + amount * 0.55, now + 0.12);
      crowdGain.gain.setTargetAtTime(0.05 + excitement * 0.35, now + 0.5, 0.9);
    }

    function crowdGroan() {
      if (!ensure()) return;
      var now = ctx.currentTime;
      crowdGain.gain.cancelScheduledValues(now);
      crowdGain.gain.setValueAtTime(crowdGain.gain.value, now);
      crowdGain.gain.linearRampToValueAtTime(0.02, now + 0.2);
      crowdGain.gain.setTargetAtTime(0.05 + excitement * 0.3, now + 0.6, 0.8);
    }

    /* ---- effects ---- */

    function tone(freqValue, duration, type, volume, slideTo, delay) {
      if (!ensure() || !settings.sound) return;
      var now = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freqValue, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume || 0.2, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    function noise(duration, volume, filterValue, delay) {
      if (!ensure() || !settings.sound) return;
      var now = ctx.currentTime + (delay || 0);
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterValue || 1200;
      filter.Q.value = 1.2;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(volume || 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      src.start(now);
      src.stop(now + duration + 0.02);
    }

    function kickSound(power) {
      noise(0.09, 0.28 * (power || 1), 900);
      tone(150 * (power || 1), 0.1, "sine", 0.3, 60);
    }

    function passSound() {
      noise(0.05, 0.13, 1800);
    }

    function whistle() {
      if (!ensure() || !settings.sound) return;
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "square";
      osc2.type = "square";
      osc.frequency.value = 2100;
      osc2.frequency.value = 2260;
      var lfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();
      lfo.frequency.value = 22;
      lfoGain.gain.value = 90;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
      gain.gain.setValueAtTime(0.13, now + 0.34);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
      osc.connect(gain); osc2.connect(gain);
      gain.connect(sfxGain);
      osc.start(now); osc2.start(now); lfo.start(now);
      osc.stop(now + 0.5); osc2.stop(now + 0.5); lfo.stop(now + 0.5);
    }

    function netSound() {
      noise(0.22, 0.3, 2600);
      tone(320, 0.1, "triangle", 0.12, 180);
    }

    function postSound() {
      tone(880, 0.22, "square", 0.16, 780);
      tone(1310, 0.18, "square", 0.1, 1180);
      crowdGroan();
    }

    function saveSound() {
      noise(0.12, 0.2, 1400);
    }

    function tackleSound() {
      noise(0.08, 0.22, 700);
      tone(110, 0.08, "triangle", 0.14, 70);
    }

    /* The goal fanfare: a rising arpeggio and a noise crash. */
    function fanfare() {
      var notes = ["A4", "C5", "E5", "A5", "G5", "E5", "C5", "A4"];
      for (var i = 0; i < notes.length; i++) {
        var parts = notes[i].split("");
        tone(freq(parts[0], Number(parts[1])), 0.16, "square", 0.16, null, i * 0.075);
        tone(freq(parts[0], Number(parts[1])) * 2, 0.12, "triangle", 0.08, null, i * 0.075);
      }
      noise(0.5, 0.3, 3000, 0.02);
      crowdRoar(1);
    }

    function uiBlip(up) {
      tone(up ? 660 : 440, 0.06, "square", 0.1);
    }

    /* ---- the music ---- */

    function scheduleStep(time) {
      var s = step % 16;
      var b = BASS[s];
      if (b !== "-") {
        var bp = b.split("");
        tone(freq(bp[0], Number(bp[1])), 0.13, "square", 0.12, null, time - ctx.currentTime);
      }
      var l = LEAD[s];
      if (l !== "-") {
        var lp = l.split("");
        tone(freq(lp[0], Number(lp[1])), 0.1, "square", 0.07, null, time - ctx.currentTime);
      }
      if (KICKPAT[s]) {
        var k = ctx.createOscillator();
        var kg = ctx.createGain();
        k.type = "sine";
        k.frequency.setValueAtTime(120, time);
        k.frequency.exponentialRampToValueAtTime(42, time + 0.11);
        kg.gain.setValueAtTime(0.22, time);
        kg.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
        k.connect(kg); kg.connect(musicGain);
        k.start(time); k.stop(time + 0.15);
      }
      if (HATPAT[s]) {
        var src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        var f = ctx.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 6000;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.05, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
        src.connect(f); f.connect(g); g.connect(musicGain);
        src.start(time); src.stop(time + 0.06);
      }
      step++;
    }

    function scheduler() {
      if (!ctx) return;
      var ahead = 0.12;
      while (nextTime < ctx.currentTime + ahead) {
        scheduleStep(nextTime);
        nextTime += 60 / tempo / 4;
      }
    }

    function startMusic() {
      if (!ensure()) return;
      if (musicTimer) return;
      nextTime = ctx.currentTime + 0.05;
      step = 0;
      musicTimer = setInterval(scheduler, 25);
    }

    function stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    }

    function setMusicEnabled(on) {
      musicOn = on;
      if (musicGain && ctx) {
        musicGain.gain.setTargetAtTime(on ? 0.28 : 0, ctx.currentTime, 0.1);
      }
    }

    function setSoundEnabled(on) {
      settings.sound = on;
      if (master && ctx) {
        master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
      }
    }

    return {
      resume: resume,
      startCrowd: startCrowd,
      setExcitement: setExcitement,
      crowdRoar: crowdRoar,
      crowdGroan: crowdGroan,
      kick: kickSound,
      pass: passSound,
      whistle: whistle,
      net: netSound,
      post: postSound,
      save: saveSound,
      tackle: tackleSound,
      fanfare: fanfare,
      blip: uiBlip,
      startMusic: startMusic,
      stopMusic: stopMusic,
      setMusicEnabled: setMusicEnabled,
      setSoundEnabled: setSoundEnabled,
      get musicOn() { return musicOn; },
    };
  }

  return { createAudio: createAudio };
});
