import { drawPanel } from "./art.js";
import {
  clampPage, getIssueProgress, saveIssueProgress, getSound, setSound
} from "./progress.js";

class TurnSound {
  constructor() {
    this.ctx = null;
    this.on = true;
  }

  setEnabled(on) {
    this.on = on;
  }

  play(direction) {
    if (!this.on) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) this.ctx = new AudioCtx();
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = 0.16;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(direction > 0 ? 520 : 1100, now);
    filter.frequency.exponentialRampToValueAtTime(direction > 0 ? 1300 : 380, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }
}

export function initReader(options = {}) {
  let issue = null;
  let total = 0;
  const reader = document.getElementById("reader");
  const shelf = document.getElementById("shelf");
  const stage = document.getElementById("stage");
  const pageShell = document.getElementById("page-shell");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const backBtn = document.getElementById("back-btn");
  const pageLabel = document.getElementById("page-label");
  const progressBar = document.getElementById("progress-bar");
  const readerStatus = document.getElementById("reader-status");
  const readerSeries = document.getElementById("reader-series");
  const readerEp = document.getElementById("reader-ep");
  const transcriptDialog = document.getElementById("transcript-dialog");
  const transcriptBody = document.getElementById("transcript-body");
  const endDialog = document.getElementById("end-dialog");
  const endKicker = document.getElementById("end-kicker");
  const endTitle = document.getElementById("end-title");
  const endText = document.getElementById("end-text");
  const endTeaser = document.getElementById("end-teaser");
  const againBtn = document.getElementById("again-btn");
  const shelfBtn = document.getElementById("shelf-btn");
  const textButtons = [document.getElementById("text-btn")];
  const soundButtons = [document.getElementById("sound-btn"), document.getElementById("reader-sound-btn")];
  const sound = new TurnSound();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let pageIndex = 0;
  let locked = false;
  let pointer = null;
  let resizeTimer = 0;
  let soundOn = getSound();
  let transcriptIssueId = null;

  sound.setEnabled(soundOn);
  syncSound();

  function syncSound() {
    soundButtons.forEach((button) => {
      if (!button) return;
      button.setAttribute("aria-pressed", String(soundOn));
      button.setAttribute("aria-label", soundOn ? "Suono attivo" : "Suono disattivato");
      button.textContent = soundOn ? "🔊" : "🔇";
    });
    sound.setEnabled(soundOn);
  }

  function toggleSound() {
    soundOn = !soundOn;
    setSound(soundOn);
    syncSound();
    if (soundOn) sound.play(1);
  }

  function hiddenPrefix(kind, who) {
    const span = document.createElement("span");
    span.className = "visually-hidden";
    if (kind === "caption") span.textContent = "Didascalia: ";
    else if (kind === "end") span.textContent = "Fine: ";
    else if (kind === "tv" || kind === "radio") span.textContent = "Giornale radio: ";
    else if (kind === "sfx") span.textContent = "";
    else span.textContent = `${who || "Voce"}: `;
    return span;
  }

  function createText(item) {
    if (item.kind === "sfx") {
      const el = document.createElement("div");
      el.className = `sfx ${item.color || "cream"}`;
      el.setAttribute("aria-hidden", "true");
      el.style.left = `${(item.x || 0) * 100}%`;
      el.style.top = `${(item.y || 0) * 100}%`;
      el.style.setProperty("--rot", `${item.rotate || 0}deg`);
      el.textContent = item.text;
      return el;
    }

    const el = document.createElement("div");
    const hasTail = ["speech", "thought", "whisper", "shout"].includes(item.kind);
    el.className = `balloon ${item.kind}${hasTail ? ` tail-${item.tail || "b"}` : ""}`;
    el.style.left = `${item.x * 100}%`;
    el.style.top = `${item.y * 100}%`;
    el.style.width = `${item.w * 100}%`;
    el.dataset.speaker = item.who || "";
    el.appendChild(hiddenPrefix(item.kind, item.who));
    const text = document.createElement("span");
    text.textContent = item.text;
    el.appendChild(text);
    return el;
  }

  function buildPage(page, index) {
    const article = document.createElement("article");
    article.className = `comic-page layout-${page.layout}`;
    article.setAttribute("aria-label", `Tavola ${index + 1} di ${total}`);

    page.panels.forEach((panel) => {
      const panelEl = document.createElement("div");
      panelEl.className = "panel";
      panelEl.dataset.panel = panel.id;

      const canvas = document.createElement("canvas");
      canvas.className = "panel-art";
      canvas.setAttribute("aria-hidden", "true");
      panelEl.appendChild(canvas);

      (panel.balloons || []).forEach((item) => panelEl.appendChild(createText(item)));
      article.appendChild(panelEl);
    });

    return article;
  }

  function fitText(root) {
    root.querySelectorAll(".panel").forEach((panel) => {
      const pr = panel.getBoundingClientRect();
      if (!pr.width || !pr.height) return;
      panel.querySelectorAll(".balloon").forEach((balloon) => {
        balloon.style.translate = "";
        balloon.style.fontSize = "";
        let br = balloon.getBoundingClientRect();
        let attempts = 0;
        while (br.height > pr.height * 0.58 && attempts < 3) {
          const size = parseFloat(getComputedStyle(balloon).fontSize) || 13;
          balloon.style.fontSize = `${Math.max(9.5, size * 0.9)}px`;
          br = balloon.getBoundingClientRect();
          attempts++;
        }
        let dx = 0;
        let dy = 0;
        if (br.right > pr.right - 5) dx = pr.right - 5 - br.right;
        if (br.left + dx < pr.left + 5) dx = pr.left + 5 - br.left;
        if (br.bottom > pr.bottom - 5) dy = pr.bottom - 5 - br.bottom;
        if (br.top + dy < pr.top + 5) dy = pr.top + 5 - br.top;
        if (dx || dy) balloon.style.translate = `${dx}px ${dy}px`;
      });
    });
  }

  function paintPage() {
    const article = pageShell.querySelector(".comic-page");
    if (!article) return;
    const page = issue.pages[pageIndex];
    article.querySelectorAll(".panel-art").forEach((canvas, index) => {
      drawPanel(canvas, page.panels[index]);
    });
    fitText(article);
  }

  function updateChrome() {
    pageLabel.textContent = `Tavola ${pageIndex + 1} di ${total}`;
    progressBar.style.width = `${((pageIndex + 1) / total) * 100}%`;
    prevBtn.disabled = pageIndex === 0;
    nextBtn.setAttribute("aria-label", pageIndex === total - 1 ? "Apri la fine dell'episodio" : "Tavola successiva");
    readerStatus.textContent = `Tavola ${pageIndex + 1} di ${total}`;
  }

  function save(completed) {
    saveIssueProgress(issue.id, {
      page: pageIndex + 1,
      completed: Boolean(completed)
    }, total);
  }

  function render(index, animate) {
    pageIndex = Math.max(0, Math.min(total - 1, index));
    const page = issue.pages[pageIndex];
    const article = buildPage(page, pageIndex);
    if (!animate || reduced) article.style.animation = "none";
    pageShell.replaceChildren(article);
    updateChrome();
    save(false);
    requestAnimationFrame(paintPage);
  }

  function go(delta) {
    if (locked || transcriptDialog.open || endDialog.open) return;
    if (delta > 0 && pageIndex >= total - 1) {
      openEnd();
      return;
    }
    const next = pageIndex + delta;
    if (next < 0 || next >= total) return;
    locked = true;
    sound.play(delta);
    pageIndex = next;
    render(pageIndex, true);
    window.setTimeout(() => { locked = false; }, reduced ? 0 : 170);
  }

  function openEnd() {
    save(true);
    sound.play(1);
    endKicker.textContent = issue.end.kicker;
    endTitle.textContent = issue.end.title;
    endText.textContent = issue.end.text;
    endTeaser.textContent = issue.end.teaser;
    if (typeof endDialog.showModal === "function") endDialog.showModal();
  }

  function buildTranscript() {
    const frag = document.createDocumentFragment();
    issue.pages.forEach((page, index) => {
      const section = document.createElement("section");
      section.className = "transcript-page";
      const h = document.createElement("h3");
      h.textContent = `Tavola ${index + 1}`;
      section.appendChild(h);
      page.panels.forEach((panel) => {
        (panel.balloons || []).forEach((item) => {
          if (!item.text) return;
          const p = document.createElement("p");
          p.className = `transcript-item ${item.kind === "caption" ? "caption" : ""}`;
          if (item.kind === "sfx") {
            p.textContent = `Effetto: ${item.text}`;
          } else {
            const b = document.createElement("b");
            b.textContent = item.kind === "caption"
              ? "Didascalia"
              : item.kind === "end"
                ? "Fine"
                : (item.who || "Voce");
            p.appendChild(b);
            p.appendChild(document.createTextNode(` ${item.text}`));
          }
          section.appendChild(p);
        });
      });
      frag.appendChild(section);
    });
    transcriptBody.replaceChildren(frag);
  }

  function openTranscript() {
    if (!issue) return;
    if (transcriptIssueId !== issue.id) {
      buildTranscript();
      transcriptIssueId = issue.id;
    }
    if (typeof transcriptDialog.showModal === "function") transcriptDialog.showModal();
  }

  function open(nextIssue, startPage) {
    if (!nextIssue) return;
    issue = nextIssue;
    total = issue.pages.length;
    if (transcriptDialog.open) transcriptDialog.close();
    if (endDialog.open) endDialog.close();
    transcriptIssueId = null;
    pageIndex = clampPage(startPage || 1, total) - 1;
    locked = false;
    readerSeries.textContent = issue.series;
    readerEp.textContent = `${issue.kicker || "Episodio"} — ${issue.title}`;
    shelf.hidden = true;
    reader.hidden = false;
    document.body.classList.add("reading");
    prevBtn.disabled = true;
    render(pageIndex, false);
    requestAnimationFrame(() => {
      pageShell.focus({ preventScroll: true });
    });
  }

  function close() {
    if (transcriptDialog.open) transcriptDialog.close();
    if (endDialog.open) endDialog.close();
    reader.hidden = true;
    shelf.hidden = false;
    document.body.classList.remove("reading");
    if (typeof options.onClose === "function") options.onClose(issue);
  }

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));
  backBtn.addEventListener("click", close);
  soundButtons.forEach((button) => button && button.addEventListener("click", toggleSound));
  textButtons.forEach((button) => button && button.addEventListener("click", openTranscript));

  againBtn.addEventListener("click", () => {
    endDialog.close();
    pageIndex = 0;
    render(0, false);
    save(false);
    requestAnimationFrame(() => pageShell.focus({ preventScroll: true }));
  });
  shelfBtn.addEventListener("click", () => {
    endDialog.close();
    close();
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("button, a, dialog")) return;
    pointer = { x: event.clientX, y: event.clientY };
  });

  stage.addEventListener("pointerup", (event) => {
    if (!pointer) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer = null;
    const selection = window.getSelection();
    if (selection && String(selection).length) return;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    go(dx < 0 ? 1 : -1);
  });

  stage.addEventListener("pointercancel", () => { pointer = null; });

  document.addEventListener("keydown", (event) => {
    if (reader.hidden) return;
    if (transcriptDialog.open || endDialog.open) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === " " && event.target.closest("button, a, input, textarea, select")) return;
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (pageIndex !== 0) { sound.play(-1); render(0, true); }
    } else if (event.key === "End") {
      event.preventDefault();
      if (pageIndex !== total - 1) { sound.play(1); render(total - 1, true); }
    } else if (event.key === "Escape") {
      close();
    }
  });

  window.addEventListener("resize", () => {
    if (reader.hidden) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(paintPage, 140);
  });

  return { open, close, get page() { return pageIndex + 1; }, get total() { return total; } };
}
