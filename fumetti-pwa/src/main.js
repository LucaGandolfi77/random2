import { ISSUES } from "./comics.js";
import { initReader } from "./reader.js";
import { drawCover } from "./art.js";
import {
  getIssueProgress, resetIssueProgress, clampPage
} from "./progress.js";

const shelf = document.getElementById("shelf");
const grid = document.getElementById("issue-grid");
const template = document.getElementById("issue-card-template");
const installBtn = document.getElementById("install-btn");

let deferredPrompt = null;
let coverTimer = 0;
const refs = new Map();

const reader = initReader({
  onClose: (issue) => {
    refreshShelf();
    requestAnimationFrame(paintCovers);
    if (issue) {
      const ref = refs.get(issue.id);
      if (ref) ref.read.focus({ preventScroll: true });
    }
  }
});

function progressOf(issue) {
  return getIssueProgress(issue.id, issue.pages.length);
}

function buildShelf() {
  if (!grid || !template) return;
  const latest = Math.max(...ISSUES.map((issue) => issue.number || 0));

  ISSUES.forEach((issue) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.issue = issue.id;
    node.setAttribute("aria-label", `${issue.series} ${issue.number || ""}: ${issue.title}`.trim());
    node.querySelector(".kicker").textContent = [issue.kicker, issue.genre].filter(Boolean).join(" · ");
    node.querySelector(".issue-title").textContent = issue.title;
    node.querySelector(".issue-desc").textContent = issue.description || issue.tagline || "";

    const cover = node.querySelector(".issue-cover");
    cover.setAttribute("aria-label", issue.coverAlt || `Copertina di ${issue.title}`);
    node.querySelector(".cover-series").textContent = issue.series;
    node.querySelector(".cover-sub").textContent = issue.title;
    node.querySelector(".cover-num").textContent = issue.number ? `N. ${issue.number}` : "";
    node.querySelector(".cover-new").hidden = issue.number !== latest;

    const meta = node.querySelector(".meta");
    [`${issue.pages.length} tavole`, "Italiano", "Offline"].forEach((label) => {
      const item = document.createElement("li");
      item.textContent = label;
      meta.appendChild(item);
    });

    refs.set(issue.id, {
      issue,
      root: node,
      cover,
      read: node.querySelector(".issue-read"),
      restart: node.querySelector(".issue-restart"),
      hint: node.querySelector(".issue-hint")
    });
    grid.appendChild(node);
  });
}

function refreshCard(issue) {
  const ref = refs.get(issue.id);
  if (!ref) return;
  const total = issue.pages.length;
  const p = getIssueProgress(issue.id, total);
  const hasProgress = p.page > 1 || p.completed;
  ref.root.classList.toggle("is-complete", p.completed);

  if (!hasProgress) {
    ref.read.textContent = "Inizia a leggere";
    ref.restart.hidden = true;
    ref.hint.hidden = true;
    ref.hint.textContent = "";
    return;
  }

  ref.read.textContent = p.completed
    ? "Rileggi dall'inizio"
    : `Continua — Tavola ${clampPage(p.page, total)}`;
  ref.restart.hidden = p.completed;
  ref.hint.hidden = false;
  ref.hint.textContent = p.completed
    ? "Hai già letto questo episodio."
    : `Segnalibro salvato: tavola ${p.page} di ${total}.`;
}

function refreshShelf() {
  ISSUES.forEach(refreshCard);
}

function paintCovers() {
  if (shelf.hidden) return;
  refs.forEach(({ issue, cover }) => drawCover(cover, issue));
}

grid?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = button.closest(".issue-card");
  const issue = card ? ISSUES.find((item) => item.id === card.dataset.issue) : null;
  if (!issue) return;

  if (button.classList.contains("issue-read")) {
    const p = progressOf(issue);
    reader.open(issue, p.completed ? 1 : p.page);
  } else if (button.classList.contains("issue-restart")) {
    resetIssueProgress(issue.id);
    refreshCard(issue);
    reader.open(issue, 1);
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(coverTimer);
  coverTimer = window.setTimeout(paintCovers, 140);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try {
    await deferredPrompt.userChoice;
  } catch {
    /* noop */
  }
  deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      /* Offline is a bonus; a failed registration must not break the reader. */
    });
  });
}

buildShelf();
refreshShelf();
requestAnimationFrame(paintCovers);
