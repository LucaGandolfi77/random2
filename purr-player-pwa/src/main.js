import { Player } from "./player.js";
import { allTracks, saveTrack, deleteTrack, clearLibrary } from "./db.js";
import {
  classifyFile,
  cleanName,
  extensionOf,
  formatTime,
  formatBytes
} from "./format.js";

const $ = (id) => document.getElementById(id);

const els = {
  fileInput: $("fileInput"),
  addBtn: $("addBtn"),
  emptyAdd: $("emptyAdd"),
  libraryAdd: $("libraryAdd"),
  emptyHow: $("emptyHow"),
  howDialog: $("howDialog"),
  installBtn: $("installBtn"),
  emptyState: $("emptyState"),
  audioStage: $("audioStage"),
  videoStage: $("videoStage"),
  disc: $("disc"),
  audioTitle: $("audioTitle"),
  audioMeta: $("audioMeta"),
  eq: $("eq"),
  videoEl: $("videoEl"),
  audioEl: $("audioEl"),
  videoMeta: $("videoMeta"),
  player: $("player"),
  playerArt: $("playerArt"),
  artBadge: $("artBadge"),
  trackTitle: $("trackTitle"),
  trackMeta: $("trackMeta"),
  playBtn: $("playBtn"),
  prevBtn: $("prevBtn"),
  nextBtn: $("nextBtn"),
  shuffleBtn: $("shuffleBtn"),
  repeatBtn: $("repeatBtn"),
  muteBtn: $("muteBtn"),
  seek: $("seek"),
  curTime: $("curTime"),
  durTime: $("durTime"),
  volume: $("volume"),
  libraryBtn: $("libraryBtn"),
  libraryPanel: $("libraryPanel"),
  libraryBackdrop: $("libraryBackdrop"),
  libraryClose: $("libraryClose"),
  libraryCount: $("libraryCount"),
  libraryEmpty: $("libraryEmpty"),
  trackList: $("trackList"),
  storageInfo: $("storageInfo"),
  clearBtn: $("clearBtn"),
  drop: $("drop"),
  toast: $("toast")
};

const state = {
  tracks: [],
  player: null,
  current: null,
  snapshot: null,
  scrubbing: false,
  toastTimer: null,
  dragDepth: 0,
  installEvent: null,
  volume: 0.9
};

/* ---------------------------------------------------------------- helpers */

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3400);
}

function kindLabel(track) {
  return track.kind === "video" ? "Video" : "Audio";
}

function trackSubtitle(track) {
  const parts = [kindLabel(track)];
  const ext = extensionOf(track.name);
  if (ext) parts.push(ext);
  if (track.duration) parts.push(formatTime(track.duration));
  parts.push(formatBytes(track.size || 0));
  return parts.join(" · ");
}

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function isSmallScreen() {
  return window.matchMedia("(max-width: 720px)").matches;
}

/* ---------------------------------------------------------------- storage */

async function updateStorage() {
  const bytes = state.tracks.reduce((sum, t) => sum + (t.size || 0), 0);
  const count = state.tracks.length;
  let text = "Spazio: " + formatBytes(bytes) + (count ? " in " + count + (count === 1 ? " file" : " file") : "");
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (Number.isFinite(estimate.quota) && Number.isFinite(estimate.usage)) {
        text += " · " + formatBytes(Math.max(0, estimate.quota - estimate.usage)) + " liberi";
      }
    }
  } catch (err) {
    /* The estimate is a nicety, not a requirement. */
  }
  els.storageInfo.textContent = text;
}

function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch (err) {
    /* Ignore. */
  }
}

/* ---------------------------------------------------------------- library */

function renderLibrary() {
  els.trackList.replaceChildren();
  els.libraryCount.textContent = state.tracks.length + (state.tracks.length === 1 ? " file" : " file");
  els.libraryEmpty.classList.toggle("hidden", state.tracks.length > 0);
  els.clearBtn.disabled = state.tracks.length === 0;

  state.tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = "track-item";
    li.dataset.id = track.id;
    if (state.current && state.current.id === track.id) li.classList.add("active");

    const play = document.createElement("button");
    play.type = "button";
    play.className = "track-play";
    play.setAttribute("aria-label", "Riproduci " + cleanName(track.name));
    play.textContent = state.current && state.current.id === track.id && state.snapshot && state.snapshot.playing ? "❚❚" : "▶";
    play.addEventListener("click", (event) => {
      event.stopPropagation();
      activate(index);
    });

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "track-copy";
    copy.setAttribute("aria-label", "Riproduci " + cleanName(track.name));
    const title = document.createElement("strong");
    title.textContent = cleanName(track.name);
    const meta = document.createElement("span");
    meta.textContent = trackSubtitle(track);
    copy.append(title, meta);
    copy.addEventListener("click", () => activate(index));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "track-remove";
    remove.setAttribute("aria-label", "Rimuovi " + cleanName(track.name));
    remove.textContent = "✕";
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      await removeTrack(track.id);
    });

    li.append(play, copy, remove);
    els.trackList.append(li);
  });

  syncActiveItem();
  updateStorage();
}

function updateTrackSubtitle(track) {
  const items = els.trackList.querySelectorAll(".track-item");
  for (const item of items) {
    if (item.dataset.id !== track.id) continue;
    const meta = item.querySelector(".track-copy span");
    if (meta) meta.textContent = trackSubtitle(track);
  }
}

function syncActiveItem() {
  const activeId = state.current ? state.current.id : null;
  const playing = Boolean(state.snapshot && state.snapshot.playing);
  els.trackList.querySelectorAll(".track-item").forEach((item) => {
    const active = item.dataset.id === activeId;
    item.classList.toggle("active", active);
    const icon = item.querySelector(".track-play");
    if (icon) icon.textContent = active && playing ? "❚❚" : "▶";
  });
}

async function activate(index) {
  const track = state.tracks[index];
  if (!track) return;
  if (state.current && state.current.id === track.id) {
    state.player.toggle();
  } else {
    state.player.playIndex(index);
  }
  if (isSmallScreen()) closeLibrary();
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const accepted = [];
  let rejected = 0;
  for (const file of files) {
    const kind = classifyFile(file);
    if (!kind) {
      rejected++;
      continue;
    }
    const duplicate = state.tracks.some(
      (t) => t.name === file.name && t.size === file.size && t.lastModified === file.lastModified
    );
    if (duplicate) {
      rejected++;
      continue;
    }
    accepted.push({ file, kind });
  }

  if (!accepted.length) {
    toast(rejected === 1 ? "File non supportato o già presente." : "Nessun file supportato o tutti già presenti.");
    return;
  }

  let added = 0;
  for (let i = 0; i < accepted.length; i++) {
    const entry = accepted[i];
    const file = entry.file;
    const record = {
      id: uid(),
      name: file.name,
      size: file.size,
      type: file.type || "",
      lastModified: file.lastModified || Date.now(),
      kind: entry.kind,
      addedAt: Date.now() + i,
      blob: file
    };
    try {
      await saveTrack(record);
      record.url = URL.createObjectURL(file);
      delete record.blob;
      state.tracks.push(record);
      added++;
    } catch (err) {
      toast("Spazio esaurito: impossibile salvare " + cleanName(file.name) + ".");
      break;
    }
  }

  if (added) {
    state.player.setQueue(state.tracks);
    renderLibrary();
    probeDurations();
    let message = added === 1 ? "1 file aggiunto." : added + " file aggiunti.";
    if (rejected) message += " " + rejected + " ignorati.";
    toast(message);
    requestPersistence();
  }
}

async function removeTrack(id) {
  const index = state.tracks.findIndex((t) => t.id === id);
  if (index < 0) return;
  const track = state.tracks[index];

  state.tracks.splice(index, 1);
  try {
    await deleteTrack(id);
  } catch (err) {
    toast("Non è stato possibile rimuovere il file dalla libreria.");
  }
  state.player.setQueue(state.tracks);
  if (track.url) URL.revokeObjectURL(track.url);
  renderLibrary();
  probeDurations();
  toast("File rimosso.");
}

async function clearAll() {
  if (!state.tracks.length) return;
  if (!window.confirm("Rimuovere tutti i file dalla libreria? I file originali sul telefono non vengono toccati.")) return;
  state.player.stop(true);
  state.player.setQueue([]);
  state.current = null;
  state.tracks.forEach((track) => {
    if (track.url) URL.revokeObjectURL(track.url);
  });
  state.tracks = [];
  try {
    await clearLibrary();
  } catch (err) {
    toast("La libreria non è stata svuotata del tutto.");
  }
  renderLibrary();
  updateStorage();
  toast("Libreria svuotata.");
}

/* ------------------------------------------------------------- now playing */

function renderNowPlaying(track) {
  state.current = track || null;
  const hasTrack = Boolean(track);

  els.emptyState.classList.toggle("hidden", hasTrack);
  els.audioStage.classList.toggle("hidden", !hasTrack || track.kind === "video");
  els.videoStage.classList.toggle("hidden", !hasTrack || track.kind !== "video");

  els.prevBtn.disabled = !hasTrack;
  els.nextBtn.disabled = !hasTrack;
  els.playBtn.disabled = !hasTrack;
  els.seek.disabled = !hasTrack;

  if (!hasTrack) {
    els.trackTitle.textContent = "Nessun brano";
    els.trackMeta.textContent = "Aggiungi un file per iniziare";
    els.artBadge.textContent = "♪";
    els.seek.value = "0";
    els.seek.style.setProperty("--fill", "0%");
    els.curTime.textContent = "0:00";
    els.durTime.textContent = "0:00";
    els.eq.classList.remove("playing");
    els.disc.classList.remove("playing");
    document.title = "Purr Player — musica e video";
    syncActiveItem();
    return;
  }

  const name = cleanName(track.name);
  const isVideo = track.kind === "video";
  els.trackTitle.textContent = name;
  els.trackMeta.textContent = trackSubtitle(track);
  els.artBadge.textContent = isVideo ? "▶" : "♪";
  els.audioTitle.textContent = name;
  els.audioMeta.textContent = trackSubtitle(track);
  els.videoMeta.textContent = trackSubtitle(track);
  els.videoEl.setAttribute("aria-label", "Video: " + name);
  els.disc.classList.toggle("playing", Boolean(state.snapshot && state.snapshot.playing) && !isVideo);
  document.title = name + " — Purr Player";
  syncActiveItem();
}

function onState(snapshot) {
  state.snapshot = snapshot;
  const hasTrack = snapshot.hasTrack;

  els.playBtn.textContent = snapshot.playing ? "❚❚" : "▶";
  els.playBtn.setAttribute("aria-label", snapshot.playing ? "Pausa" : "Riproduci");
  els.prevBtn.disabled = !hasTrack;
  els.nextBtn.disabled = !hasTrack;
  els.playBtn.disabled = !hasTrack;
  els.seek.disabled = !hasTrack || !snapshot.duration;

  if (!state.scrubbing) {
    els.curTime.textContent = formatTime(snapshot.currentTime);
    if (snapshot.duration > 0) {
      const ratio = Math.min(1, snapshot.currentTime / snapshot.duration);
      els.seek.value = String(Math.round(ratio * 1000));
      els.seek.style.setProperty("--fill", (ratio * 100).toFixed(2) + "%");
    } else {
      els.seek.value = "0";
      els.seek.style.setProperty("--fill", "0%");
    }
  }
  els.durTime.textContent = formatTime(snapshot.duration);

  els.shuffleBtn.setAttribute("aria-pressed", snapshot.shuffle ? "true" : "false");
  const repeatLabel = snapshot.repeat === "all"
    ? "Ripeti tutto"
    : snapshot.repeat === "one"
      ? "Ripeti un brano"
      : "Ripetizione disattivata";
  els.repeatBtn.setAttribute("aria-label", repeatLabel);
  els.repeatBtn.setAttribute("aria-pressed", snapshot.repeat !== "off" ? "true" : "false");
  els.repeatBtn.textContent = snapshot.repeat === "one" ? "⟲1" : "⟲";

  const muted = snapshot.muted || snapshot.volume === 0;
  els.muteBtn.textContent = muted ? "🔇" : "🔊";
  els.muteBtn.setAttribute("aria-label", muted ? "Attiva audio" : "Muta");
  if (document.activeElement !== els.volume) {
    els.volume.value = String(snapshot.muted ? 0 : snapshot.volume);
    els.volume.style.setProperty("--fill", Math.round((snapshot.muted ? 0 : snapshot.volume) * 100) + "%");
  }

  const playing = snapshot.playing;
  els.eq.classList.toggle("playing", playing);
  els.disc.classList.toggle("playing", playing && !snapshot.isVideo);
  syncActiveItem();

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      if (snapshot.duration > 0 && Number.isFinite(snapshot.duration) && navigator.mediaSession.setPositionState) {
        navigator.mediaSession.setPositionState({
          duration: snapshot.duration,
          position: Math.min(snapshot.currentTime, snapshot.duration),
          playbackRate: 1
        });
      }
    } catch (err) {
      /* Position state is optional. */
    }
  }
}

/* ------------------------------------------------------------ duration probe */

let probing = false;
let probeAgain = false;

async function probeDurations() {
  if (probing) {
    probeAgain = true;
    return;
  }
  probing = true;
  try {
    for (const track of state.tracks.slice()) {
      if (track.duration || !track.url) continue;
      await new Promise((resolve) => {
        const probe = document.createElement("video");
        let settled = false;
        const cleanup = () => {
          probe.removeAttribute("src");
          try { probe.load(); } catch (err) { /* ignore */ }
        };
        const done = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cleanup();
          resolve();
        };
        const timer = setTimeout(done, 5000);
        probe.preload = "metadata";
        probe.muted = true;
        probe.addEventListener("loadedmetadata", () => {
          if (Number.isFinite(probe.duration) && probe.duration > 0) {
            track.duration = probe.duration;
            updateTrackSubtitle(track);
            if (state.current && state.current.id === track.id) {
              els.trackMeta.textContent = trackSubtitle(track);
              if (state.current.kind === "video") els.videoMeta.textContent = trackSubtitle(track);
              else els.audioMeta.textContent = trackSubtitle(track);
            }
          }
          done();
        }, { once: true });
        probe.addEventListener("error", done, { once: true });
        probe.src = track.url;
        probe.load();
      });
    }
  } finally {
    probing = false;
    if (probeAgain) {
      probeAgain = false;
      probeDurations();
    }
  }
}

/* --------------------------------------------------------------- panel/misc */

function openLibrary() {
  els.libraryPanel.classList.add("open");
  els.libraryPanel.inert = false;
  els.libraryBackdrop.classList.remove("hidden");
  els.libraryPanel.setAttribute("aria-hidden", "false");
  els.libraryBtn.setAttribute("aria-expanded", "true");
  els.libraryClose.focus({ preventScroll: true });
  updateStorage();
}

function closeLibrary() {
  els.libraryPanel.classList.remove("open");
  els.libraryPanel.inert = true;
  els.libraryBackdrop.classList.add("hidden");
  els.libraryPanel.setAttribute("aria-hidden", "true");
  els.libraryBtn.setAttribute("aria-expanded", "false");
}

function openFilePicker() {
  els.fileInput.click();
}

/* ------------------------------------------------------------------- setup */

async function restore() {
  const rows = await allTracks();
  state.tracks = rows
    .map((row) => {
      const kind = row.kind || classifyFile({ name: row.name, type: row.type }) || "audio";
      if (!row.blob) return null;
      return {
        id: row.id,
        name: row.name,
        size: row.size,
        type: row.type,
        lastModified: row.lastModified,
        kind,
        addedAt: row.addedAt,
        url: URL.createObjectURL(row.blob)
      };
    })
    .filter(Boolean);
}

function applySavedSettings() {
  try {
    const volume = Number(localStorage.getItem("purr-player-volume"));
    if (Number.isFinite(volume) && volume >= 0 && volume <= 1) state.volume = volume;
    const repeat = localStorage.getItem("purr-player-repeat");
    if (["off", "all", "one"].includes(repeat)) state.player.setRepeat(repeat);
    const shuffle = localStorage.getItem("purr-player-shuffle");
    if (shuffle === "1") state.player.setShuffle(true);
  } catch (err) {
    /* Settings are optional. */
  }
  state.player.setVolume(state.volume);
}

async function init() {
  state.player = new Player({
    video: els.videoEl,
    audio: els.audioEl,
    onTrack: renderNowPlaying,
    onState,
    onError: (track) => {
      toast("Formato non supportato o file danneggiato" + (track ? ": " + cleanName(track.name) : "."));
    }
  });

  applySavedSettings();

  try {
    await restore();
  } catch (err) {
    toast("Impossibile aprire la libreria salvata.");
  }

  els.libraryPanel.inert = true;
  state.player.setQueue(state.tracks);
  renderLibrary();
  updateStorage();
  probeDurations();
  requestPersistence();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

/* ------------------------------------------------------------------ events */

els.addBtn.addEventListener("click", openFilePicker);
els.emptyAdd.addEventListener("click", openFilePicker);
els.libraryAdd.addEventListener("click", openFilePicker);
els.fileInput.addEventListener("change", async () => {
  await addFiles(els.fileInput.files);
  els.fileInput.value = "";
});

els.emptyHow.addEventListener("click", () => {
  if (typeof els.howDialog.showModal === "function") els.howDialog.showModal();
  else els.howDialog.setAttribute("open", "");
});

els.playBtn.addEventListener("click", () => state.player.toggle());
els.prevBtn.addEventListener("click", () => state.player.prev());
els.nextBtn.addEventListener("click", () => state.player.next());
els.shuffleBtn.addEventListener("click", () => {
  state.player.setShuffle(!state.player.shuffle);
  try { localStorage.setItem("purr-player-shuffle", state.player.shuffle ? "1" : "0"); } catch (err) { /* ignore */ }
});
els.repeatBtn.addEventListener("click", () => {
  state.player.cycleRepeat();
  try { localStorage.setItem("purr-player-repeat", state.player.repeat); } catch (err) { /* ignore */ }
});
els.muteBtn.addEventListener("click", () => state.player.toggleMute());

els.seek.addEventListener("input", () => {
  state.scrubbing = true;
  const duration = state.snapshot ? state.snapshot.duration : 0;
  const seconds = duration ? (Number(els.seek.value) / 1000) * duration : 0;
  els.curTime.textContent = formatTime(seconds);
  els.seek.style.setProperty("--fill", (Number(els.seek.value) / 10).toFixed(2) + "%");
});
const commitSeek = () => {
  const duration = state.snapshot ? state.snapshot.duration : 0;
  if (duration) state.player.seek((Number(els.seek.value) / 1000) * duration);
  state.scrubbing = false;
};
els.seek.addEventListener("change", commitSeek);
els.seek.addEventListener("pointerup", commitSeek);

els.volume.addEventListener("input", () => {
  const value = Number(els.volume.value);
  state.volume = value;
  state.player.setVolume(value);
  els.volume.style.setProperty("--fill", Math.round(value * 100) + "%");
  try { localStorage.setItem("purr-player-volume", String(value)); } catch (err) { /* ignore */ }
});

els.libraryBtn.addEventListener("click", openLibrary);
els.libraryClose.addEventListener("click", closeLibrary);
els.libraryBackdrop.addEventListener("click", closeLibrary);
els.clearBtn.addEventListener("click", clearAll);

els.playerArt.addEventListener("click", () => {
  if (state.current) openLibrary();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.libraryPanel.classList.contains("open")) {
    closeLibrary();
    return;
  }
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || els.howDialog.open) return;
  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    state.player.toggle();
  } else if (event.key === "ArrowRight") {
    if (state.snapshot && state.snapshot.duration) {
      event.preventDefault();
      state.player.seekBy(5);
    }
  } else if (event.key === "ArrowLeft") {
    if (state.snapshot && state.snapshot.duration) {
      event.preventDefault();
      state.player.seekBy(-5);
    }
  } else if (event.key.toLowerCase() === "n") {
    state.player.next();
  } else if (event.key.toLowerCase() === "p") {
    state.player.prev();
  } else if (event.key.toLowerCase() === "m") {
    state.player.toggleMute();
  }
});

/* Drag and drop from a desktop browser. */
["dragenter", "dragover"].forEach((name) => {
  window.addEventListener(name, (event) => {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
    event.preventDefault();
    if (name === "dragenter") state.dragDepth++;
    els.drop.classList.remove("hidden");
  });
});
window.addEventListener("dragleave", (event) => {
  if (!event.dataTransfer) return;
  state.dragDepth = Math.max(0, state.dragDepth - 1);
  if (state.dragDepth === 0) els.drop.classList.add("hidden");
});
window.addEventListener("drop", async (event) => {
  event.preventDefault();
  state.dragDepth = 0;
  els.drop.classList.add("hidden");
  if (event.dataTransfer && event.dataTransfer.files) {
    await addFiles(event.dataTransfer.files);
  }
});

/* Install prompt. */
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installEvent = event;
  els.installBtn.hidden = false;
});
els.installBtn.addEventListener("click", async () => {
  if (!state.installEvent) return;
  const prompt = state.installEvent;
  state.installEvent = null;
  els.installBtn.hidden = true;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch (err) {
    /* The browser can withdraw the prompt. */
  }
});
window.addEventListener("appinstalled", () => {
  els.installBtn.hidden = true;
  state.installEvent = null;
  toast("Purr Player installato.");
});

window.addEventListener("beforeunload", () => {
  state.tracks.forEach((track) => {
    if (track.url) URL.revokeObjectURL(track.url);
  });
});

init().catch(() => {
  toast("Qualcosa non ha funzionato all'avvio. Riprova a ricaricare.");
});
