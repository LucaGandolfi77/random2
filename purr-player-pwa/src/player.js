import { cleanName } from "./format.js";

const REPEATS = ["off", "all", "one"];

export class Player {
  constructor({ video, audio, onTrack, onState, onError }) {
    this.video = video;
    this.audio = audio;
    this.onTrack = onTrack || (() => {});
    this.onState = onState || (() => {});
    this.onError = onError || (() => {});

    this.queue = [];
    this.index = -1;
    this.repeat = "off";
    this.shuffle = false;
    this.active = null;

    [video, audio].forEach((el) => {
      el.addEventListener("play", () => this.emit());
      el.addEventListener("pause", () => this.emit());
      el.addEventListener("timeupdate", () => this.emit());
      el.addEventListener("durationchange", () => this.emit());
      el.addEventListener("loadedmetadata", () => this.emit());
      el.addEventListener("volumechange", () => this.emit());
      el.addEventListener("ended", () => {
        if (el !== this.active) return;
        this.advance(true);
      });
      el.addEventListener("error", () => {
        if (el !== this.active) return;
        const track = this.current();
        this.onError(track);
        this.emit();
      });
    });

    if ("mediaSession" in navigator) {
      const ms = navigator.mediaSession;
      try {
        ms.setActionHandler("play", () => this.play());
        ms.setActionHandler("pause", () => this.pause());
        ms.setActionHandler("previoustrack", () => this.prev());
        ms.setActionHandler("nexttrack", () => this.next());
        ms.setActionHandler("seekbackward", (d) => this.seekBy(-(d.seekOffset || 10)));
        ms.setActionHandler("seekforward", (d) => this.seekBy(d.seekOffset || 10));
        ms.setActionHandler("seekto", (d) => {
          if (typeof d.seekTime === "number") this.seek(d.seekTime);
        });
      } catch (err) {
        /* Some browsers expose only part of the action set. */
      }
    }
  }

  current() {
    return this.queue[this.index] || null;
  }

  setQueue(queue) {
    const currentId = this.current() ? this.current().id : null;
    this.queue = queue;
    if (!queue.length) {
      this.stop(true);
      this.index = -1;
      this.onTrack(null);
      this.emit();
      return;
    }
    const nextIndex = currentId ? queue.findIndex((t) => t.id === currentId) : -1;
    if (nextIndex >= 0) {
      this.index = nextIndex;
      this.queueBuffer(nextIndex);
    } else {
      this.stop(true);
      this.index = 0;
      this.load(0, false);
    }
  }

  queueBuffer(index) {
    /* Nothing to do: the current media element keeps playing even if the
       queue array was rebuilt from IndexedDB. */
    this.onTrack(this.current());
    this.emit();
  }

  load(index, autoplay) {
    const track = this.queue[index];
    if (!track) return;
    this.index = index;
    this.stop(false);
    this.active = track.kind === "video" ? this.video : this.audio;
    const other = track.kind === "video" ? this.audio : this.video;
    other.removeAttribute("src");
    try { other.load(); } catch (err) { /* ignore */ }
    this.active.src = track.url;
    try { this.active.load(); } catch (err) { /* ignore */ }
    this.onTrack(track);
    this.setMetadata(track);
    this.emit();
    if (autoplay) {
      const promise = this.active.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {
          /* Autoplay may be denied; the play button is still there. */
          this.emit();
        });
      }
    }
  }

  playIndex(index) {
    this.load(index, true);
  }

  play() {
    if (!this.current()) {
      if (this.queue.length) this.load(0, true);
      return;
    }
    if (!this.active) {
      this.load(this.index, true);
      return;
    }
    const promise = this.active.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => this.emit());
    }
  }

  pause() {
    if (this.active) this.active.pause();
  }

  toggle() {
    if (!this.current()) {
      this.play();
      return;
    }
    if (this.active && !this.active.paused) this.pause();
    else this.play();
  }

  next() {
    this.advance(false);
  }

  advance(auto) {
    if (!this.queue.length) return;
    if (this.active && this.repeat === "one" && auto) {
      this.active.currentTime = 0;
      this.play();
      return;
    }
    if (this.shuffle && this.queue.length > 1) {
      let next = this.index;
      while (next === this.index) next = Math.floor(Math.random() * this.queue.length);
      this.load(next, true);
      return;
    }
    let next = this.index + 1;
    if (next >= this.queue.length) {
      if (this.repeat === "all" || !auto) next = 0;
      else {
        if (this.active) this.active.pause();
        this.emit();
        return;
      }
    }
    this.load(next, true);
  }

  prev() {
    if (!this.queue.length) return;
    if (this.active && this.active.currentTime > 3) {
      this.seek(0);
      return;
    }
    let next = this.index - 1;
    if (next < 0) next = this.queue.length - 1;
    this.load(next, true);
  }

  seek(seconds) {
    if (!this.active) return;
    const duration = this.active.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    this.active.currentTime = Math.max(0, Math.min(duration, seconds));
    this.emit();
  }

  seekBy(delta) {
    if (!this.active) return;
    this.seek((this.active.currentTime || 0) + delta);
  }

  setVolume(value) {
    const volume = Math.max(0, Math.min(1, Number(value)));
    [this.video, this.audio].forEach((el) => { el.volume = volume; });
    if (volume > 0) {
      if (this.video.muted) this.video.muted = false;
      if (this.audio.muted) this.audio.muted = false;
    }
    this.emit();
  }

  toggleMute() {
    const muted = !(this.active ? this.active.muted : this.audio.muted);
    [this.video, this.audio].forEach((el) => { el.muted = muted; });
    this.emit();
  }

  setRepeat(mode) {
    this.repeat = REPEATS.includes(mode) ? mode : "off";
    this.emit();
  }

  cycleRepeat() {
    const i = REPEATS.indexOf(this.repeat);
    this.setRepeat(REPEATS[(i + 1) % REPEATS.length]);
    return this.repeat;
  }

  setShuffle(value) {
    this.shuffle = Boolean(value);
    this.emit();
  }

  stop(resetTrack) {
    if (this.active) {
      this.active.pause();
      if (resetTrack) {
        try { this.active.currentTime = 0; } catch (err) { /* ignore */ }
      }
    }
    if (resetTrack) {
      [this.video, this.audio].forEach((el) => {
        el.removeAttribute("src");
        try { el.load(); } catch (err) { /* ignore */ }
      });
      this.active = null;
    }
  }

  state() {
    const el = this.active;
    const duration = el && Number.isFinite(el.duration) ? el.duration : 0;
    const playing = Boolean(el && !el.paused && !el.ended && el.readyState > 2);
    const volume = el ? el.volume : this.audio.volume;
    return {
      hasTrack: Boolean(this.current()),
      playing,
      currentTime: el ? el.currentTime || 0 : 0,
      duration,
      volume,
      muted: el ? el.muted : this.audio.muted,
      repeat: this.repeat,
      shuffle: this.shuffle,
      isVideo: Boolean(this.current() && this.current().kind === "video")
    };
  }

  emit() {
    const state = this.state();
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
      } catch (err) {
        /* Optional. */
      }
    }
    this.onState(state);
  }

  setMetadata(track) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanName(track.name),
        artist: track.kind === "video" ? "Video" : "Audio",
        album: "Purr Player",
        artwork: [
          { src: new URL("icons/icon-192.png", document.baseURI).href, sizes: "192x192", type: "image/png" },
          { src: new URL("icons/icon-512.png", document.baseURI).href, sizes: "512x512", type: "image/png" }
        ]
      });
    } catch (err) {
      /* MediaMetadata is optional. */
    }
  }
}
