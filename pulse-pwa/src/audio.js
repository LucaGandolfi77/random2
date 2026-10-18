(function (root) {
  "use strict";

  var R2P = root.R2P || (root.R2P = {});
  var CHUNK_SECONDS = 12;
  var NOISE_SECONDS = 0.5;

  var ctx = null;
  var master = null;
  var sfxBus = null;
  var ready = [];
  var scheduledCount = 0;
  var sources = [];
  var startedAt = 0;
  var offset = 0;
  var playing = false;
  var volume = 0.85;
  var renderToken = 0;
  var expectedDuration = 0;
  var firstChunkReady = null;

  function makeContext() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = volume;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    master.connect(comp);
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.6;
    sfxBus.connect(ctx.destination);
    return ctx;
  }

  function ready_() {
    if (!ctx) makeContext();
    if (!ctx) return false;
    if (ctx.state === "suspended" && ctx.resume) {
      var p = ctx.resume();
      if (p && p.catch) p.catch(function () {});
    }
    return true;
  }

  function noiseBuffer(ac) {
    var len = Math.floor(ac.sampleRate * NOISE_SECONDS);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function hitNoise(ac, noise, dest, t, dur, gain, filterType, freq, q) {
    var src = ac.createBufferSource();
    src.buffer = noise;
    var filt = ac.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = freq;
    filt.Q.value = q || 1;
    var g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t, (t * 7.3) % (NOISE_SECONDS * 0.9));
    src.stop(t + dur + 0.01);
  }

  function decay(param, t, peak, attack, dur) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function adsr(param, t, peak, dur, attack, release) {
    var sustainLevel = peak * 0.62;
    var releaseAt = Math.max(t + attack + 0.01, t + dur);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(sustainLevel, t + attack + 0.08);
    param.setValueAtTime(sustainLevel, Math.max(t + attack + 0.09, releaseAt - release));
    param.exponentialRampToValueAtTime(0.0001, releaseAt + 0.01);
  }

  function voiceKick(ac, noise, dest, t, ev) {
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.1);
    decay(g.gain, t, ev.vel * 0.95, 0.004, 0.24);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.26);
    hitNoise(ac, noise, dest, t, 0.012, ev.vel * 0.28, "highpass", 2600);
  }

  function voiceSnare(ac, noise, dest, t, ev) {
    hitNoise(ac, noise, dest, t, ev.ghost ? 0.07 : 0.16, ev.vel * 0.6, "bandpass", 1750, 0.9);
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.06);
    decay(g.gain, t, ev.vel * 0.35, 0.003, ev.ghost ? 0.07 : 0.12);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  function voiceHat(ac, noise, dest, t, ev, open) {
    hitNoise(ac, noise, dest, t, open ? 0.19 : 0.045, ev.vel * (open ? 0.3 : 0.34), "highpass", open ? 6200 : 8200, 0.7);
  }

  function voiceBass(ac, dest, t, ev, midiToFreq) {
    var f = midiToFreq(ev.note);
    var filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = 6;
    filt.frequency.setValueAtTime(240, t);
    filt.frequency.exponentialRampToValueAtTime(1100, t + 0.05);
    filt.frequency.exponentialRampToValueAtTime(320, t + ev.dur);
    var g = ac.createGain();
    adsr(g.gain, t, ev.vel * 0.42, ev.dur, 0.012, 0.09);
    var saw = ac.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = f;
    var sub = ac.createOscillator();
    sub.type = "sine";
    sub.frequency.value = f / 2;
    var subG = ac.createGain();
    subG.gain.value = 0.55;
    saw.connect(filt);
    sub.connect(subG);
    subG.connect(filt);
    filt.connect(g);
    g.connect(dest);
    saw.start(t);
    sub.start(t);
    saw.stop(t + ev.dur + 0.2);
    sub.stop(t + ev.dur + 0.2);
  }

  function voicePad(ac, dest, t, ev, midiToFreq) {
    var f = midiToFreq(ev.note);
    var filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 1500;
    filt.Q.value = 0.6;
    var g = ac.createGain();
    adsr(g.gain, t, ev.vel * 0.16, ev.dur, 0.45, 0.6);
    for (var i = 0; i < 3; i++) {
      var osc = ac.createOscillator();
      osc.type = i === 2 ? "triangle" : "sawtooth";
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 7;
      osc.connect(filt);
      osc.start(t);
      osc.stop(t + ev.dur + 0.7);
    }
    filt.connect(g);
    g.connect(dest);
  }

  function voiceLead(ac, dest, send, vibrato, t, ev, midiToFreq) {
    var f = midiToFreq(ev.note);
    var filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = 4;
    filt.frequency.setValueAtTime(3400, t);
    filt.frequency.exponentialRampToValueAtTime(1200, t + ev.dur * 0.8);
    var g = ac.createGain();
    adsr(g.gain, t, ev.vel * 0.3, ev.dur, 0.014, 0.12);
    var offsets = [-9, 9, 0];
    var types = ["sawtooth", "sawtooth", "square"];
    for (var i = 0; i < 3; i++) {
      var osc = ac.createOscillator();
      osc.type = types[i];
      osc.frequency.value = f;
      osc.detune.value = offsets[i];
      vibrato.connect(osc.detune);
      var mix = ac.createGain();
      mix.gain.value = i === 2 ? 0.35 : 0.5;
      osc.connect(mix);
      mix.connect(filt);
      osc.start(t);
      osc.stop(t + ev.dur + 0.25);
    }
    filt.connect(g);
    g.connect(dest);
    var sendGain = ac.createGain();
    sendGain.gain.value = ev.inst === "lead" ? 0.3 : 0.12;
    g.connect(sendGain);
    sendGain.connect(send);
  }

  function renderChunk(ac, events, chunkStart, chunkEnd, midiToFreq, beat) {
    var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var length = Math.max(1, Math.ceil((chunkEnd - chunkStart) * ac.sampleRate));
    var off = new OAC(2, length, ac.sampleRate);
    var out = off.createGain();
    out.gain.value = 0.9;
    var comp = off.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 26;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    out.connect(comp);
    comp.connect(off.destination);

    var drumBus = off.createGain();
    drumBus.gain.value = 0.95;
    drumBus.connect(out);
    var bassBus = off.createGain();
    bassBus.gain.value = 0.9;
    bassBus.connect(out);
    var padBus = off.createGain();
    padBus.gain.value = 0.85;
    padBus.connect(out);
    var leadBus = off.createGain();
    leadBus.gain.value = 0.9;
    leadBus.connect(out);

    var delay = off.createDelay(2);
    delay.delayTime.value = beat * 0.75;
    var feedback = off.createGain();
    feedback.gain.value = 0.34;
    var delayTone = off.createBiquadFilter();
    delayTone.type = "lowpass";
    delayTone.frequency.value = 2600;
    delay.connect(delayTone);
    delayTone.connect(feedback);
    feedback.connect(delay);
    var delayOut = off.createGain();
    delayOut.gain.value = 0.5;
    delay.connect(delayOut);
    delayOut.connect(out);

    var noise = noiseBuffer(off);
    var vibrato = off.createGain();
    vibrato.gain.value = 9;
    var lfo = off.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 5.4;
    lfo.connect(vibrato);
    lfo.start(0);
    lfo.stop(chunkEnd - chunkStart + 0.05);

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.t < chunkStart - 0.001 || ev.t >= chunkEnd) continue;
      var t = Math.max(0, ev.t - chunkStart + (ev.off || 0));
      if (ev.inst === "kick") voiceKick(off, noise, drumBus, t, ev);
      else if (ev.inst === "snare") voiceSnare(off, noise, drumBus, t, ev);
      else if (ev.inst === "hat") voiceHat(off, noise, drumBus, t, ev, false);
      else if (ev.inst === "openhat") voiceHat(off, noise, drumBus, t, ev, true);
      else if (ev.inst === "bass") voiceBass(off, bassBus, t, ev, midiToFreq);
      else if (ev.inst === "pad") voicePad(off, padBus, t, ev, midiToFreq);
      else if (ev.inst === "lead") voiceLead(off, leadBus, delay, vibrato, t, ev, midiToFreq);
    }

    var rendered = off.startRendering();
    if (rendered && typeof rendered.then === "function") return rendered;
    return new Promise(function (resolve, reject) {
      off.oncomplete = function (e) { resolve(e.renderedBuffer); };
      off.onerror = function () { reject(new Error("offline render failed")); };
    });
  }

  function stopSources() {
    for (var i = 0; i < sources.length; i++) {
      try {
        sources[i].onended = null;
        sources[i].stop();
      } catch (e) {}
    }
    sources = [];
  }

  function pump() {
    if (!playing) return;
    while (scheduledCount < ready.length) {
      var c = ready[scheduledCount];
      var into = offset - c.start;
      if (into >= c.buffer.duration) {
        scheduledCount++;
        continue;
      }
      var src = ctx.createBufferSource();
      src.buffer = c.buffer;
      src.connect(master);
      var when = startedAt + c.start;
      if (when < ctx.currentTime + 0.005) when = ctx.currentTime + 0.005;
      if (into > 0.0005) src.start(when, into);
      else src.start(when);
      sources.push(src);
      scheduledCount++;
    }
  }

  function render(song, onProgress) {
    if (!ready_()) return Promise.reject(new Error("this browser has no WebAudio support"));
    discard();
    var token = renderToken;
    var midiToFreq = R2P.song.midiToFreq;
    var total = song.duration;
    expectedDuration = total;
    var chunkSeconds = Math.min(CHUNK_SECONDS, Math.max(6, total));
    var count = Math.max(1, Math.ceil(total / chunkSeconds));
    var done = 0;
    var gate = [];

    var first = new Promise(function (resolve, reject) { gate.push({ resolve: resolve, reject: reject }); });
    var chain = Promise.resolve();

    for (var i = 0; i < count; i++) {
      (function (index) {
        chain = chain.then(function () {
          if (token !== renderToken) throw new Error("cancelled");
          var start = index * chunkSeconds;
          var end = Math.min(total, start + chunkSeconds);
          return renderChunk(ctx, song.events, start, end, midiToFreq, song.beat).then(function (buffer) {
            if (token !== renderToken) throw new Error("cancelled");
            ready.push({ start: start, buffer: buffer });
            done = end;
            if (onProgress) onProgress(done / total, done, total);
            pump();
            if (index === 0 && gate.length) gate.shift().resolve(true);
            return new Promise(function (resolve) { setTimeout(resolve, 0); });
          });
        });
      })(i);
    }

    chain.then(function () {
      if (token !== renderToken) throw new Error("cancelled");
      if (gate.length) gate.shift().reject(new Error("the track rendered no audio"));
    }, function (err) {
      if (gate.length) gate.shift().reject(err);
    });

    firstChunkReady = first;
    return first;
  }

  function play(from) {
    if (!ready_()) return false;
    offset = from || 0;
    stopSources();
    if (!ready.length || offset >= expectedDuration) {
      playing = false;
      return false;
    }
    startedAt = ctx.currentTime + 0.08 - offset;
    scheduledCount = 0;
    playing = true;
    pump();
    return true;
  }

  function pause() {
    if (!playing) return currentTime();
    offset = currentTime();
    playing = false;
    stopSources();
    return offset;
  }

  function currentTime() {
    if (!ctx) return 0;
    if (!playing) return offset;
    return Math.max(0, ctx.currentTime - startedAt);
  }

  function isPlaying() {
    return playing;
  }

  function stop() {
    playing = false;
    offset = 0;
    stopSources();
  }

  function renderedDuration() {
    if (!ready.length) return 0;
    var last = ready[ready.length - 1];
    return last.start + last.buffer.duration;
  }

  function remaining() {
    return Math.max(0, expectedDuration - currentTime());
  }

  function hit(quality) {
    if (!ready_()) return;
    var now = ctx.currentTime + 0.001;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = quality === "perfect" ? "sine" : "triangle";
    var f = quality === "perfect" ? 1180 : quality === "great" ? 880 : 660;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.6, now + 0.05);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(quality === "good" ? 0.1 : 0.18, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  function miss() {
    if (!ready_()) return;
    var now = ctx.currentTime + 0.001;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = volume;
  }

  function discard() {
    stop();
    renderToken++;
    ready = [];
    scheduledCount = 0;
    expectedDuration = 0;
    firstChunkReady = null;
  }

  function state() {
    return ctx ? ctx.state : "none";
  }

  R2P.audio = {
    render: render,
    play: play,
    pause: pause,
    stop: stop,
    currentTime: currentTime,
    remaining: remaining,
    renderedDuration: renderedDuration,
    isPlaying: isPlaying,
    hit: hit,
    miss: miss,
    setVolume: setVolume,
    discard: discard,
    state: state,
    resume: ready_,
    ready: ready_
  };
})(typeof globalThis !== "undefined" ? globalThis : this);