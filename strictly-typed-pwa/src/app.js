/*
 * STRICTLY TYPED — the whole inspection, one route at a time.
 *
 * House rules:
 *   - No framework. The screen is a string; the events are delegated.
 *   - Progress saves the instant a rite compiles.
 *   - A locked door is still focusable, so screen readers can hear why.
 */

import {
  META,
  CHAPTERS,
  NODES,
  NODE_BY_ID,
  CHAPTER_BY_ID,
  ORDER,
  FRAGMENTS,
  ENDINGS,
  ENDING_BY_ID,
  SPECIAL_ENDING,
  COMPILER_FINAL_PROMPT,
  GLOSSARY,
  CHEAT_SHEET,
  RANKS,
  INTRO
} from "./content.js";
import { chapterArt, bossArt, logoMark, companion } from "./art.js";
import { createStore } from "./state.js";
import {
  createCards,
  starsFor,
  bossStars,
  bossAnswer,
  wrongLineHint
} from "./puzzle.js";
import { unlockAudio, setSoundEnabled, setHapticsEnabled, sfx, haptic } from "./audio.js";
import {
  icon,
  escapeHtml,
  highlightAda,
  codeBlock,
  inline,
  stars,
  dialogue,
  toast,
  modal,
  confirmModal,
  confetti,
  shareGame,
  scrollTop,
  reduceMotion,
  stopConfetti
} from "./ui.js";

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");
const store = createStore(getStorage());

let currentScreen = "title";
let currentTab = "";
let deferredPrompt = null;
let offlineReady = false;
let level = null;
let boss = null;
let dialogueCtl = null;
let reloadOnControllerChange = false;
let hadController = false;
let screenCleanup = [];

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function addCleanup(fn) {
  screenCleanup.push(fn);
}

function runCleanup() {
  if (dialogueCtl) {
    dialogueCtl.cancel();
    dialogueCtl = null;
  }
  for (const fn of screenCleanup.splice(0)) {
    try {
      fn();
    } catch {
      /* cleanup should never break the next screen */
    }
  }
}

function navigate(path) {
  const next = `#/${path}`;
  if (location.hash === next) {
    route();
  } else {
    location.hash = next;
  }
}

function nodeMeta(node) {
  const chapter = CHAPTER_BY_ID.get(node.chapter);
  return { chapter, numeral: chapter.numeral, accent: chapter.accent };
}

function playLabel(node) {
  return node.kind === "boss"
    ? `CHAPTER ${CHAPTER_BY_ID.get(node.chapter).numeral} · FINAL AUDIT`
    : `CHAPTER ${CHAPTER_BY_ID.get(node.chapter).numeral} · DECLARATION ${node.index} OF 3`;
}

function setScreenTitle(title) {
  document.title = title ? `${title} · ${META.name}` : `${META.name} — ${META.subtitle}`;
}

function mount(html, { focus = true } = {}) {
  app.innerHTML = html;
  if (!focus) return;
  const heading = app.querySelector("[data-focus-heading]");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    requestAnimationFrame(() => heading.focus({ preventScroll: true }));
  }
}

function setTabbar(tab) {
  currentTab = tab;
  const visible = ["map", "codex", "book", "settings"].includes(tab);
  tabbar.hidden = !visible;
  document.body.classList.toggle("has-tabbar", visible);
  if (!visible) return;
  const items = [
    { id: "map", label: "Map", icon: "map", href: "#/map" },
    { id: "codex", label: "Codex", icon: "codex", href: "#/codex" },
    { id: "book", label: "Book", icon: "book", href: "#/book" },
    { id: "settings", label: "Settings", icon: "settings", href: "#/settings" }
  ];
  tabbar.innerHTML = items
    .map(
      (item) => `<a class="tab ${tab === item.id ? "is-active" : ""}" href="${item.href}" ${
        tab === item.id ? 'aria-current="page"' : ""
      }>${icon(item.icon)}<span>${item.label}</span></a>`
    )
    .join("");
}

function applySettings() {
  setSoundEnabled(store.state.settings.sound);
  setHapticsEnabled(store.state.settings.haptics);
  document.documentElement.classList.toggle("reduce-motion", store.state.settings.reduceMotion);
}

function topbarBack(back = "map", label = "Back to the inspection map") {
  return `<a class="icon-btn" href="#/${back}" aria-label="${escapeHtml(label)}">${icon("back")}</a>`;
}

function brand() {
  return `<a class="brand" href="#/" aria-label="Strictly Typed — title">
    ${logoMark(34, "brand-mark")}
    <span class="brand-word">STRICTLY <em>TYPED</em></span>
  </a>`;
}

function pagebar(eyebrow, title, back = "map") {
  return `<header class="topbar topbar--page">
    ${topbarBack(back)}
    <div class="topbar-title"><span>${escapeHtml(eyebrow)}</span><strong>${escapeHtml(title)}</strong></div>
    <button class="icon-btn" type="button" data-help aria-label="How to play">${icon("help")}</button>
  </header>`;
}

function playbar(node) {
  return `<header class="topbar topbar--play">
    <a class="icon-btn" href="#/map" aria-label="Leave and return to the map">${icon("back")}</a>
    <div class="play-meta">
      <span>${playLabel(node)}</span>
      <strong>${escapeHtml(node.kind === "boss" ? node.name : node.title)}</strong>
    </div>
    <button class="icon-btn" type="button" data-help aria-label="How to play">${icon("help")}</button>
  </header>`;
}

function chapterRail(node) {
  const chapter = CHAPTER_BY_ID.get(node.chapter);
  const nodes = [...chapter.lessons, chapter.boss];
  return `<div class="chapter-rail" aria-hidden="true">${nodes
    .map((n) => {
      const done = Boolean(store.state.completed[n.id]);
      const current = n.id === node.id;
      return `<span class="rail-dot ${done ? "is-done" : ""} ${current ? "is-now" : ""} ${
        n.kind === "boss" ? "is-boss" : ""
      }"></span>`;
    })
    .join("")}</div>`;
}

function installIsStandalone() {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function isIOS() {
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

function canShowInstallBanner() {
  return !installIsStandalone() && !store.state.installDismissed && Boolean(deferredPrompt || isIOS());
}

function installBannerHtml() {
  if (!canShowInstallBanner()) return "";
  if (store.progress().completed < 4) return "";
  return `<aside class="install-card" aria-label="Install the game">
    <div class="install-copy">
      <span class="chip chip--mint">INSTALL THE KIT</span>
      <strong>Keep the inspection offline.</strong>
      <p>No app store. No ads. No tracking. The Compiler already sees everything, so there is nothing left to collect.</p>
    </div>
    <div class="install-actions">
      <button class="btn btn--primary btn--sm" type="button" data-install>${icon("install")} Install</button>
      <button class="icon-btn icon-btn--sm" type="button" data-dismiss-install aria-label="Dismiss install suggestion">${icon("close")}</button>
    </div>
  </aside>`;
}

function refreshInstallSlot() {
  const slot = document.getElementById("install-slot");
  if (slot) slot.innerHTML = installBannerHtml();
}

async function installFlow() {
  unlockAudio();
  if (installIsStandalone()) {
    toast("Already installed. The Compiler is local and quite pleased about it.");
    return;
  }
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        toast("Installed. Reality now runs from your home screen.");
      } else {
        toast("Installation postponed. The Void understands.");
      }
    } catch {
      toast("The browser changed its mind. Try the browser menu instead.");
    }
    refreshInstallSlot();
    return;
  }
  if (isIOS()) {
    await modal({
      eyebrow: "Installation rite",
      title: "Add the Inspector to your Home Screen",
      body: `<ol class="modal-list">
        <li>Tap the <strong>Share</strong> button in Safari's toolbar.</li>
        <li>Choose <strong>Add to Home Screen</strong>.</li>
        <li>Name it <strong>Strictly Typed</strong>, then tap <strong>Add</strong>.</li>
      </ol>
      <p class="modal-note">The whole campaign then works offline. Even the Void stops asking for Wi-Fi.</p>`,
      actions: [{ label: "Understood", value: "ok", primary: true }]
    });
    return;
  }
  await modal({
    eyebrow: "Installation rite",
    title: "Install from your browser",
    body: `<p>Open your browser's menu and choose <strong>Install app</strong>, <strong>Install this site as an app</strong>, or <strong>Add to Home Screen</strong>.</p>
    <p class="modal-note">If the option is missing, the browser has decided this universe is not installable yet. Reload, then try again.</p>`,
    actions: [{ label: "Got it", value: "ok", primary: true }]
  });
}

function openHowTo() {
  unlockAudio();
  modal({
    eyebrow: "Field manual",
    title: "How to inspect a universe",
    body: `<div class="howto">
      <div class="howto-step"><span>01</span><div><strong>Read the transmission.</strong><p>GNAT explains one idea. The code is real Ada; the lesson is in plain English. Tap the story to reveal it instantly.</p></div></div>
      <div class="howto-step"><span>02</span><div><strong>Assemble the rite.</strong><p>Tap the shuffled code lines in the order the compiler would accept. There is exactly one right order. No typing, no timers.</p></div></div>
      <div class="howto-step"><span>03</span><div><strong>Run it.</strong><p>When every line is in place, run the program. Wrong lines produce a diagnostic, not a game over.</p></div></div>
      <div class="howto-step"><span>04</span><div><strong>Collect the fragments.</strong><p>Each declaration leaves behind a Field Note. All twenty unlock the answer GNAT has been hiding.</p></div></div>
    </div>
    <div class="howto-stars">${stars(3)}<p><strong>Three stars</strong> means no mistakes and no hints. <strong>Two</strong> allows a little help. <strong>One</strong> means you got there. All three are valid ways to be brave.</p></div>
    <p class="modal-note">Boss audits have three hearts. A wrong answer costs one; every answer still teaches you the fault. There is no timer, no energy, no shop.</p>`,
    actions: [
      { label: "Enter the House", value: "ok", primary: true }
    ]
  });
}

async function shareProgress() {
  const p = store.progress();
  const result = await shareGame({
    title: `${META.name} — ${META.subtitle}`,
    text: `I've audited ${p.completed}/${p.total} declarations in STRICTLY TYPED: ${p.stars}/${p.maxStars} stars, ${p.fragments}/${p.totalFragments} fragments. The Compiler is still watching.`,
    url: META.url
  });
  if (result === "copied") toast("Progress copied. Go make the Void nervous.");
  if (result === "failed") toast("Share failed. The Compiler has logged it.");
}

/* --------------------------------------------------------------------------
 * Title
 * ----------------------------------------------------------------------- */

function renderTitle() {
  currentScreen = "title";
  setTabbar("");
  setScreenTitle("");
  const p = store.progress();
  const finalReady = store.finalBossBeaten() && store.state.endings.length === 0;
  const nextId = store.firstIncomplete();
  const primaryLabel = finalReady
    ? "ANSWER THE LAST QUESTION"
    : store.state.started
      ? nextId
        ? "CONTINUE INSPECTION"
        : "OPEN THE MAP"
      : "BEGIN INSPECTION";
  const primaryPath = finalReady ? "finale" : store.state.started ? (nextId ? `play/${nextId}` : "map") : "intro";
  const started = store.state.started;

  const html = `<section class="screen screen--title">
    <header class="title-top">
      ${brand()}
      <div class="topbar-actions">
        <button class="icon-btn" type="button" data-help aria-label="How to play">${icon("help")}</button>
      </div>
    </header>

    <main class="title-main">
      <div class="title-copy">
        <div class="title-seal">
          ${logoMark(96, "title-mark")}
          <span class="orbit orbit--a" aria-hidden="true"></span>
          <span class="orbit orbit--b" aria-hidden="true"></span>
        </div>
        <p class="eyebrow">ADA &amp; THE LAST COMPILER</p>
        <h1 data-focus-heading>STRICTLY<br><em>TYPED</em></h1>
        <p class="title-tagline">A tiny game about big promises.</p>
        <p class="title-lede">The universe is an Ada program with the checks turned off. You are the last inspector. Your guide is a compiler-moth with heartburn.</p>
        <div class="title-actions">
          <button class="btn btn--primary btn--hero" type="button" data-primary>${icon("play")} ${primaryLabel}</button>
          ${started ? `<a class="btn btn--ghost btn--hero" href="#/map">Open the map ${icon("arrow")}</a>` : ""}
        </div>
        <p class="title-meta">${p.completed}/${p.total} inspections · ${p.stars}/${p.maxStars} stars · 1 secret · no timers</p>
        <nav class="title-links" aria-label="Explore">
          <a href="#/codex">${icon("codex")} Codex</a>
          <a href="#/book">${icon("book")} The Book</a>
          <a href="#/settings">${icon("settings")} Settings</a>
          ${deferredPrompt || isIOS() ? `<button type="button" data-install>${icon("install")} Install</button>` : ""}
        </nav>
      </div>

      <aside class="hero-terminal" aria-label="A boot log from the universe">
        <div class="terminal desktop-terminal">
          <div class="terminal-bar"><span class="terminal-dots"><i></i><i></i><i></i></span><span>gnat://boot</span><span class="terminal-mode">STRICT</span></div>
          <div class="terminal-body">
            <p class="boot-line"><span class="prompt">&gt;</span> GNAT boot v13.2</p>
            <p class="boot-line"><span class="prompt">&gt;</span> checking universe <span class="dots">................</span> <span class="bad">FAILED</span></p>
            <p class="boot-line"><span class="prompt">&gt;</span> undeclared variables <span class="dots">............</span> <span class="warn">4,096</span></p>
            <p class="boot-line"><span class="prompt">&gt;</span> dangling pointers <span class="dots">..............</span> <span class="warn">1 (friendly)</span></p>
            <p class="boot-line"><span class="prompt">&gt;</span> compiler mood <span class="dots">................</span> <span class="ok">precise</span></p>
            <p class="boot-line boot-cursor"><span class="prompt">&gt;</span> <span class="cursor-block"></span></p>
          </div>
          <div class="terminal-foot">
            ${companion("GNAT")}
            <p><strong>GNAT</strong><span>“I ate every warning in this codebase. I have heartburn.”</span></p>
          </div>
        </div>
        <div class="title-ticket">
          <span>NO ACCOUNTS</span><span>NO ADS</span><span>OFFLINE</span><span>NO DANGLING POINTERS*</span>
        </div>
        <p class="tiny-disclaimer">*there is one dangling pointer, but he is very polite.</p>
      </aside>
    </main>

    <footer class="title-footer">
      <p>A love letter to Ada, strong typing, and the people who read error messages.</p>
      <p>${started ? `Inspection in progress. ${p.fragments}/${p.totalFragments} fragments recovered.` : "Inspired by Ada Lovelace and the GNU Ada compiler, neither of whom approve of this moth."}</p>
    </footer>
  </section>`;

  mount(html);
  app.querySelector("[data-install]")?.addEventListener("click", async () => {
    await installFlow();
  });
  const primary = app.querySelector("[data-primary]");
  if (primary) {
    primary.addEventListener("click", () => {
      unlockAudio();
      sfx("tap");
      if (!store.state.started && !finalReady) {
        store.setStarted();
        navigate("intro");
      } else {
        navigate(primaryPath);
      }
    });
  }
}

/* --------------------------------------------------------------------------
 * Prologue
 * ----------------------------------------------------------------------- */

function renderIntro() {
  currentScreen = "intro";
  setTabbar("");
  setScreenTitle("The inspection begins");
  store.setStarted();

  const html = `<section class="screen screen--intro">
    <header class="title-top">
      ${brand()}
      <a class="text-link" href="#/map">Skip prologue ${icon("arrow")}</a>
    </header>
    <main class="intro-main">
      <div class="intro-mark">
        ${logoMark(72)}
        <p class="eyebrow">PROLOGUE · THE MISSING DECLARATIONS</p>
        <h1 data-focus-heading>The universe is<br><em>undeclared.</em></h1>
        <p class="lede">Somewhere above the House of Promises, the Root Type is failing. The checks are off. The Heap is leaking. And a moth has chosen you.</p>
      </div>
      <div class="story-card story-card--intro" id="intro-dialogue">
        <div class="story-head"><span>INCOMING TRANSMISSION</span><button class="text-link" type="button" data-reveal>Reveal all</button></div>
        <div id="intro-dialogue-body"></div>
      </div>
      <div class="intro-actions">
        <button class="btn btn--primary btn--hero" type="button" data-enter>${icon("arrow")} STEP INTO THE HOUSE</button>
        <p class="microcopy">No account. No download. Just 20 inspections and one extremely precise eye.</p>
      </div>
    </main>
  </section>`;

  mount(html);
  const body = document.getElementById("intro-dialogue-body");
  dialogueCtl = dialogue(body, INTRO, { reduced: reduceMotion() });
  addCleanup(() => {
    if (dialogueCtl) dialogueCtl.cancel();
  });
  app.querySelector("[data-reveal]")?.addEventListener("click", () => dialogueCtl?.skip());
  app.querySelector("[data-enter]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("page");
    haptic([12, 30, 12]);
    navigate("map");
  });
}

/* --------------------------------------------------------------------------
 * Map
 * ----------------------------------------------------------------------- */

function chapterProgress(chapter) {
  const nodes = [...chapter.lessons, chapter.boss];
  return nodes.filter((node) => store.state.completed[node.id]).length;
}

function nodeCard(node, currentId) {
  const unlocked = store.isUnlocked(node.id);
  const done = Boolean(store.state.completed[node.id]);
  const current = node.id === currentId;
  const best = store.state.completed[node.id]?.stars || 0;
  const chapter = CHAPTER_BY_ID.get(node.chapter);
  const previous = ORDER[ORDER.indexOf(node.id) - 1];
  const previousNode = previous ? NODE_BY_ID.get(previous) : null;
  const lockText = previousNode ? `Finish “${previousNode.title}” first` : "Locked";
  const title = node.kind === "boss" ? node.name : node.title;
  const concept = node.kind === "boss" ? node.epithet : node.concept;
  const marker =
    node.kind === "boss"
      ? `<span class="node-medallion node-medallion--boss">${icon("bolt")}</span>`
      : `<span class="node-medallion">${String(node.index).padStart(2, "0")}</span>`;
  const status = done
    ? `<span class="node-done">${icon("check")} ${best ? stars(best, { compact: true }) : "REPLAY"}</span>`
    : current
      ? `<span class="chip chip--amber">NEXT</span>`
      : unlocked
        ? `<span class="node-open">OPEN</span>`
        : `<span class="node-lock">${icon("lock")} ${escapeHtml(lockText)}</span>`;

  return `<li class="node-item ${node.kind === "boss" ? "node-item--boss" : ""}">
    <button class="node ${done ? "is-done" : ""} ${current ? "is-current" : ""} ${
      unlocked ? "" : "is-locked"
    }" type="button" data-node="${node.id}" aria-disabled="${unlocked ? "false" : "true"}" aria-label="${escapeHtml(
      title
    )}${done ? `, completed, ${best} of 3 stars` : unlocked ? ", available" : `, locked. ${lockText}`}">
      ${marker}
      <span class="node-body">
        <span class="node-kicker">${node.kind === "boss" ? "CHAPTER AUDIT" : `DECLARATION ${node.index}`}${
          node.kind === "boss" ? ` · BOSS` : ""
        }</span>
        <span class="node-title">${escapeHtml(title)}</span>
        <span class="node-concept">${escapeHtml(concept)}</span>
        ${status}
      </span>
      <span class="node-end" aria-hidden="true">${unlocked ? icon("chevron") : icon("lock")}</span>
    </button>
  </li>`;
}

function chapterBlock(chapter, currentId) {
  const nodes = [...chapter.lessons, chapter.boss];
  const complete = store.chapterComplete(chapter.id);
  return `<section class="chapter ${complete ? "is-complete" : ""}" style="--accent:${chapter.accent}">
    <div class="chapter-banner">
      <div class="chapter-art">${chapterArt(chapter.art)}</div>
      <div class="chapter-head">
        <div class="chapter-eyebrow"><span class="chapter-numeral">${chapter.numeral}</span><span>CHAPTER ${chapter.numeral}</span>${
          complete ? `<span class="seal">${icon("check")} COMPLETE</span>` : ""
        }</div>
        <h2>${escapeHtml(chapter.title)}</h2>
        <p class="chapter-sub">${escapeHtml(chapter.subtitle)}</p>
        <p class="chapter-quote">“${escapeHtml(chapter.quote)}”</p>
        <div class="chapter-count">${chapterProgress(chapter)} / 4 inspections</div>
      </div>
    </div>
    <ol class="node-list">
      ${nodes.map((node) => nodeCard(node, currentId)).join("")}
    </ol>
  </section>`;
}

function renderMap() {
  currentScreen = "map";
  setTabbar("map");
  setScreenTitle("The House of Promises");
  const p = store.progress();
  const rank = RANKS[p.rankLevel] || RANKS[0];
  const currentId = store.firstIncomplete();
  const finalReady = store.finalBossBeaten();

  const html = `<section class="screen screen--map">
    <header class="topbar topbar--map">
      ${brand()}
      <div class="topbar-actions">
        <span class="star-count" aria-label="${p.stars} of ${p.maxStars} stars">${icon("star")} <strong>${p.stars}</strong><span>/${p.maxStars}</span></span>
        <button class="icon-btn" type="button" data-help aria-label="How to play">${icon("help")}</button>
      </div>
    </header>

    <main class="wrap map-wrap">
      <header class="map-hero">
        <p class="eyebrow">INSPECTION ${String(p.completed).padStart(2, "0")} / ${p.total}</p>
        <h1 data-focus-heading>THE HOUSE<br>OF PROMISES</h1>
        <p class="lede">Five chapters, twenty inspections, one very patient Compiler. The Void is still leaking; the book is still incomplete.</p>
        <div class="hud-grid">
          <div class="hud-cell"><strong>${rank.name}</strong><span>RANK</span></div>
          <div class="hud-cell"><strong>${p.fragments}<small>/${p.totalFragments}</small></strong><span>FRAGMENTS</span></div>
          <div class="hud-cell"><strong>${p.stars}<small>/${p.maxStars}</small></strong><span>STARS</span></div>
        </div>
        <div class="rank-note">${escapeHtml(rank.note)}</div>
        <div class="meter meter--wide" role="progressbar" aria-label="Campaign progress" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.completed}"><i style="width:${(p.completed / p.total) * 100}%"></i></div>
      </header>

      <div id="install-slot">${installBannerHtml()}</div>

      <div class="chapter-list">
        ${CHAPTERS.map((chapter) => chapterBlock(chapter, currentId)).join("")}
      </div>

      ${
        finalReady
          ? `<button class="last-question" type="button" data-finale>
              <span class="last-question-art">${bossArt("compiler")}</span>
              <span class="last-question-copy">
                <span class="chip chip--gold">THE LAST QUESTION</span>
                <strong>The Compiler is waiting.</strong>
                <span>It has one question left. It has had it for eons.</span>
              </span>
              <span class="node-end">${icon("arrow")}</span>
            </button>`
          : ""
      }

      <footer class="map-footer">
        <button class="text-link" type="button" data-share>${icon("share")} Share the inspection</button>
        <a class="text-link" href="#/book">${icon("book")} Read the Book</a>
      </footer>
    </main>
  </section>`;

  mount(html);

  const onClick = async (event) => {
    const nodeButton = event.target.closest("[data-node]");
    if (nodeButton) {
      const id = nodeButton.dataset.node;
      if (!store.isUnlocked(id)) {
        sfx("wrong");
        const index = ORDER.indexOf(id);
        const previous = index > 0 ? NODE_BY_ID.get(ORDER[index - 1]) : null;
        toast(
          previous
            ? `Locked. Finish “${previous.title}” first. The House is strict about sequence.`
            : "Locked. The Void is not accepting visitors.",
          { tone: "warn" }
        );
        return;
      }
      unlockAudio();
      sfx("tap");
      navigate(`play/${id}`);
      return;
    }
    if (event.target.closest("[data-finale]")) {
      unlockAudio();
      sfx("page");
      navigate("finale");
      return;
    }
    if (event.target.closest("[data-install]")) {
      await installFlow();
      refreshInstallSlot();
      return;
    }
    if (event.target.closest("[data-dismiss-install]")) {
      store.markInstallDismissed();
      sfx("tap");
      refreshInstallSlot();
      return;
    }
    if (event.target.closest("[data-share]")) {
      unlockAudio();
      await shareProgress();
    }
  };
  app.addEventListener("click", onClick);
  addCleanup(() => app.removeEventListener("click", onClick));

  addCleanup(
    store.subscribe(() => {
      if (currentScreen === "map") refreshInstallSlot();
    })
  );
}

/* --------------------------------------------------------------------------
 * Lesson briefing
 * ----------------------------------------------------------------------- */

function renderLessonBrief(node) {
  currentScreen = "play";
  setTabbar("");
  boss = null;
  level = null;
  setScreenTitle(node.title);
  const { chapter, numeral } = nodeMeta(node);
  const best = store.state.completed[node.id]?.stars || 0;
  const body = node.lesson.body.map((paragraph) => `<p>${inline(paragraph)}</p>`).join("");
  const pitfalls = node.lesson.pitfalls.map((item) => `<li>${inline(item)}</li>`).join("");
  const code = node.lesson.snippet;

  const html = `<section class="screen screen--play" style="--accent:${chapter.accent}">
    ${playbar(node)}
    <main class="wrap play-wrap">
      <header class="level-head">
        <p class="eyebrow">CHAPTER ${numeral} · ${escapeHtml(node.concept).toUpperCase()}</p>
        <h1 data-focus-heading>${escapeHtml(node.title)}</h1>
        <p class="level-sub">${escapeHtml(node.tagline)}</p>
        ${chapterRail(node)}
        ${best ? `<div class="replay-ribbon">BEST ${stars(best, { compact: true })} · you may inspect it again</div>` : ""}
      </header>

      <section class="story-card" id="briefing-card">
        <div class="story-head"><span>TRANSMISSION · GNAT</span><button class="text-link" type="button" data-reveal>Reveal all</button></div>
        <div id="briefing-dialogue"></div>
      </section>

      <article class="lesson-card">
        <div class="lesson-eyebrow"><span class="chip">THE LESSON</span><span class="lesson-number">${numeral}.${node.index}</span></div>
        <h2>${escapeHtml(node.lesson.heading)}</h2>
        <div class="lesson-prose">${body}</div>
        <div class="code-wrap">
          <div class="code-label"><span>ADA 2012</span><span>${escapeHtml(node.concept).toUpperCase()}</span></div>
          ${codeBlock(code)}
        </div>
        <details class="lesson-details">
          <summary>Ways to upset the Compiler ${icon("chevron")}</summary>
          <ul class="pitfalls">${pitfalls}</ul>
          <p class="margin-note">${inline(node.lesson.margin)}</p>
        </details>
      </article>

      <p class="rite-promise">${icon("sparkle")} You will assemble this program by tapping its lines. No typing. No timers. Only order.</p>
    </main>
    <div class="actbar">
      <button class="btn btn--primary btn--block" type="button" data-begin>${icon("codex")} BEGIN THE RITE ${icon("arrow")}</button>
    </div>
  </section>`;

  mount(html);
  dialogueCtl = dialogue(document.getElementById("briefing-dialogue"), node.briefing, {
    reduced: reduceMotion()
  });
  addCleanup(() => dialogueCtl?.cancel());
  app.querySelector("[data-reveal]")?.addEventListener("click", () => dialogueCtl?.skip());
  app.querySelector("[data-begin]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("page");
    haptic([10]);
    dialogueCtl?.cancel();
    renderRite(node);
  });
}

/* --------------------------------------------------------------------------
 * Rite (lesson puzzle)
 * ----------------------------------------------------------------------- */

function startRite(node) {
  level = {
    nodeId: node.id,
    solution: node.puzzle.solution.slice(),
    cards: createCards(node.puzzle.solution, `${node.id}:rite`),
    placed: 0,
    mistakes: 0,
    hints: 0,
    hintedFor: -1,
    feedback: { tone: "idle", text: "The Compiler is watching. No pressure. (There is pressure.)" },
    done: false,
    justPlaced: false
  };
}

function spentHintsExhausted() {
  return level.hints >= 3;
}

function riteTerminalHtml(node) {
  const placed = level.solution.slice(0, level.placed);
  const rows = placed
    .map(
      (line, i) =>
        `<div class="code-line ${i === placed.length - 1 ? "is-current" : ""}"><span class="ln">${String(
          i + 1
        ).padStart(2, "0")}</span><code>${highlightAda(line)}</code></div>`
    )
    .join("");
  const empty =
    level.placed === 0
      ? `<div class="empty-code">-- the rite is empty. give it a first line.</div>`
      : "";
  const cursor =
    level.placed < level.solution.length
      ? `<div class="code-line code-cursor"><span class="ln">${String(level.placed + 1).padStart(
          2,
          "0"
        )}</span><span class="cursor-block"></span></div>`
      : `<div class="code-line code-cursor"><span class="ln">${String(level.placed + 1).padStart(
          2,
          "0"
        )}</span><span class="compile-ok">${icon("check")} ready to run</span></div>`;
  return `<div class="terminal rite-terminal">
    <div class="terminal-bar"><span class="terminal-dots"><i></i><i></i><i></i></span><span>gnat://rite/${escapeHtml(node.id)}</span><span class="terminal-mode">${level.placed}/${level.solution.length}</span></div>
    <div class="terminal-body terminal-body--code" id="rite-terminal">${rows}${empty}${cursor}</div>
  </div>`;
}

function riteHudHtml() {
  const complete = level.placed === level.solution.length;
  return `<div class="rite-hud">
    <button class="hint-btn ${level.mistakes >= 2 && !spentHintsExhausted() ? "is-pulsing" : ""}" type="button" data-hint ${
      spentHintsExhausted() || complete ? "disabled" : ""
    } aria-label="Hint. ${3 - level.hints} hints remaining">${icon("hint")} HINT <span>${3 - level.hints}</span></button>
    <div class="rite-stats">
      <span>MISTAKES <strong>${level.mistakes}</strong></span>
      <span>LINES <strong>${level.placed}/${level.solution.length}</strong></span>
    </div>
  </div>`;
}

function ritePoolHtml() {
  return `<div class="pool" role="group" aria-label="Shuffled code lines">
    ${level.cards
      .map(
        (line, index) =>
          `<button class="pool-card" type="button" data-card="${index}" aria-label="Add line: ${escapeHtml(
            line.trim()
          )}"><span class="pool-grip" aria-hidden="true">${icon("plus")}</span><code>${highlightAda(
            line.trim()
          )}</code></button>`
      )
      .join("")}
  </div>`;
}

function riteFeedbackHtml() {
  const tone = level.feedback?.tone || "idle";
  return `<div class="feedback feedback--${tone}" role="status" aria-live="polite">
    <span class="feedback-icon">${tone === "error" ? icon("warning") : tone === "ok" ? icon("check") : icon("moth")}</span>
    <p>${escapeHtml(level.feedback?.text || "")}</p>
  </div>`;
}

function riteLiveHtml(node) {
  return `<section class="rite" aria-labelledby="rite-title">
    <div class="rite-head">
      <div><p class="eyebrow">THE RITE</p><h2 id="rite-title">${escapeHtml(node.puzzle.prompt)}</h2></div>
      ${chapterRail(node)}
    </div>
    ${riteHudHtml()}
    ${riteTerminalHtml(node)}
    ${riteFeedbackHtml()}
    <div id="rite-pool">${ritePoolHtml()}</div>
    <p class="rite-rule">${icon("sparkle")} Tap the next line. One canonical order. Hints cost stars, not dignity.</p>
  </section>`;
}

function riteActbarHtml() {
  const complete = level.placed === level.solution.length;
  return `<button class="btn btn--primary btn--block ${complete ? "is-ready" : ""}" type="button" data-run ${
    complete ? "" : "disabled"
  }>${complete ? `${icon("play")} RUN PROGRAM` : `ASSEMBLE THE RITE · ${level.placed}/${level.solution.length}`}</button>`;
}

function renderRite(node) {
  currentScreen = "play";
  setTabbar("");
  setScreenTitle(node.title);
  if (!level || level.nodeId !== node.id || level.done) startRite(node);
  const { chapter, numeral } = nodeMeta(node);

  const html = `<section class="screen screen--rite" style="--accent:${chapter.accent}" id="rite-screen">
    ${playbar(node)}
    <main class="wrap play-wrap">
      <header class="rite-top">
        <p class="eyebrow">CHAPTER ${numeral} · DECLARATION ${node.index}</p>
        <div class="rite-title-row"><h1 data-focus-heading>${escapeHtml(node.title)}</h1><span class="chip">${escapeHtml(
          node.concept
        )}</span></div>
      </header>
      <div id="rite-live">${riteLiveHtml(node)}</div>
    </main>
    <div class="actbar" id="rite-actbar">${riteActbarHtml()}</div>
  </section>`;

  mount(html);
  scrollTop();

  const screen = document.getElementById("rite-screen");
  if (!screen) return;

  const onClick = (event) => {
    const keyboard = event.detail === 0;
    if (event.target.closest("[data-card]")) {
      const index = Number(event.target.closest("[data-card]").dataset.card);
      placeLine(node, index, event.target.closest("[data-card]"), keyboard);
      return;
    }
    if (event.target.closest("[data-hint]")) {
      useHint(node, keyboard);
      return;
    }
    if (event.target.closest("[data-run]")) {
      runRite(node);
    }
  };
  screen.addEventListener("click", onClick);
}

function refreshRite(node, focus = "none", index = 0) {
  const live = document.getElementById("rite-live");
  const act = document.getElementById("rite-actbar");
  if (live) live.innerHTML = riteLiveHtml(node);
  if (act) act.innerHTML = riteActbarHtml();
  const terminal = document.getElementById("rite-terminal");
  if (terminal) terminal.scrollTop = terminal.scrollHeight;

  if (focus === "run") {
    document.querySelector("[data-run]")?.focus({ preventScroll: true });
  } else if (focus === "card") {
    const cards = [...document.querySelectorAll("[data-card]")];
    const target = cards[Math.min(index, cards.length - 1)];
    target?.focus({ preventScroll: true });
  }
}

function setRiteFeedback(tone, text) {
  level.feedback = { tone, text };
  const host = document.querySelector(".feedback");
  if (!host) return;
  host.className = `feedback feedback--${tone}`;
  host.innerHTML = `<span class="feedback-icon">${
    tone === "error" ? icon("warning") : tone === "ok" ? icon("check") : icon("moth")
  }</span><p>${inline(text)}</p>`;
}

function updateRiteHud() {
  const hud = document.querySelector(".rite-hud");
  if (hud) hud.outerHTML = riteHudHtml();
  const act = document.getElementById("rite-actbar");
  if (act) act.innerHTML = riteActbarHtml();
}

function placeLine(node, index, card, keyboard = false) {
  if (!level || level.done || level.placed >= level.solution.length) return;
  const line = level.cards[index];
  if (line === undefined) return;
  const expected = level.solution[level.placed];

  if (line === expected) {
    level.cards.splice(index, 1);
    level.placed++;
    level.justPlaced = true;
    level.feedback = {
      tone: "ok",
      text:
        level.placed === level.solution.length
          ? "All lines present. The compiler is holding its breath. Run it."
          : "Accepted. The line clicks into the body of the program."
    };
    sfx("place");
    haptic([12]);
    if (keyboard) {
      refreshRite(node, level.placed === level.solution.length ? "run" : "card", index);
    } else {
      refreshRite(node);
    }
    return;
  }

  level.mistakes++;
  sfx("wrong");
  haptic([30, 28, 30]);
  const message = wrongLineHint(line, expected);
  setRiteFeedback("error", `The Compiler rejects that line. ${message}`);
  updateRiteHud();
  if (card) {
    card.classList.add("is-wrong");
    setTimeout(() => card.classList.remove("is-wrong"), 420);
  }
}

function useHint(node, keyboard = false) {
  if (!level || level.done || spentHintsExhausted()) return;
  if (level.placed >= level.solution.length) return;
  const expected = level.solution[level.placed];
  const card = [...document.querySelectorAll("[data-card]")].find(
    (button) => level.cards[Number(button.dataset.card)] === expected
  );
  if (!card) return;
  if (level.hintedFor !== level.placed) {
    level.hints++;
    level.hintedFor = level.placed;
  }
  sfx("hint");
  haptic([8]);
  card.classList.add("is-hinted");
  card.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
  setRiteFeedback("hint", `${node.puzzle.hint} The glowing line is the next one.`);
  updateRiteHud();
  if (keyboard) card.focus({ preventScroll: true });
}

function runRite(node) {
  if (!level || level.placed !== level.solution.length || level.done) return;
  level.done = true;
  unlockAudio();
  sfx("run");
  const starCount = starsFor(level.mistakes, level.hints);
  const result = store.completeNode(node.id, {
    stars: starCount,
    mistakes: level.mistakes,
    hints: level.hints
  });
  setTimeout(() => {
    sfx("success");
    haptic([18, 40, 18, 40, 40]);
    confetti(["#ffb84d", "#7ef0c8", "#f4ecd9", "#b79bff"]);
    renderLessonResult(node, {
      starCount,
      mistakes: level.mistakes,
      hints: level.hints,
      newBest: result.newBest,
      first: result.first
    });
  }, reduceMotion() ? 0 : 260);
}

function resultTerminal(node) {
  const lines = node.puzzle.output || [];
  return `<div class="terminal result-terminal">
    <div class="terminal-bar"><span class="terminal-dots"><i></i><i></i><i></i></span><span>gnat://run/${escapeHtml(
      node.id
    )}</span><span class="terminal-mode">${node.kind === "boss" ? "AUDIT" : "OK"}</span></div>
    <div class="terminal-body">
      ${lines
        .map(
          (line, i) =>
            `<div class="output-line" style="animation-delay:${0.12 + i * 0.08}s"><span class="prompt">&gt;</span> ${escapeHtml(
              line
            )}</div>`
        )
        .join("")}
      <div class="output-meta">${escapeHtml(node.puzzle.note || "Program exited normally.")}</div>
    </div>
  </div>`;
}

function fragmentCard(node, { first = false } = {}) {
  const chapter = CHAPTER_BY_ID.get(node.chapter);
  return `<article class="fragment-card" style="--accent:${chapter.accent}">
    <div class="fragment-top"><span class="eyebrow">FIELD NOTE ${first ? "RECOVERED" : "IN THE BOOK"}</span><span class="fragment-seal">${logoMark(28)}</span></div>
    <h3>${escapeHtml(node.fragment.title)}</h3>
    <blockquote>“${escapeHtml(node.fragment.text)}”</blockquote>
    <p class="fragment-source">The Book of Declarations · Chapter ${chapter.numeral}</p>
  </article>`;
}

function nextStepFor(node) {
  const nextId = store.nextAfter(node.id);
  if (!nextId) {
    return store.finalBossBeaten()
      ? { path: "finale", label: "ANSWER THE LAST QUESTION", note: "The Compiler is waiting." }
      : { path: "map", label: "RETURN TO THE MAP", note: "The House is quiet." };
  }
  const next = NODE_BY_ID.get(nextId);
  if (next.kind === "boss") {
    return { path: `play/${nextId}`, label: `FACE ${next.name}`, note: "A chapter audit is waiting." };
  }
  return { path: `play/${nextId}`, label: "NEXT DECLARATION", note: `Chapter ${CHAPTER_BY_ID.get(next.chapter).numeral} · ${next.title}` };
}

function renderLessonResult(node, { starCount, mistakes, hints, newBest, first }) {
  currentScreen = "play";
  setTabbar("");
  setScreenTitle("Rite compiled");
  const { chapter, numeral } = nodeMeta(node);
  const next = nextStepFor(node);

  const html = `<section class="screen screen--result" style="--accent:${chapter.accent}" id="result-screen">
    ${playbar(node)}
    <main class="wrap play-wrap">
      <header class="result-head">
        <p class="eyebrow">CHAPTER ${numeral} · DECLARATION ${node.index}</p>
        <div class="result-seal"><span>COMPILED</span><i aria-hidden="true"></i></div>
        <h1 data-focus-heading>The rite holds.</h1>
        <p class="result-sub">${inline(node.puzzle.success || "The universe accepts your punctuation.")}</p>
        <div class="result-stars" aria-label="${starCount} of 3 stars">${stars(starCount)}${newBest ? `<span class="new-best">NEW BEST</span>` : ""}</div>
        <p class="result-mistakes">${mistakes} mistake${mistakes === 1 ? "" : "s"} · ${hints} hint${hints === 1 ? "" : "s"} · the Compiler has filed the paperwork.</p>
      </header>

      ${resultTerminal(node)}

      <details class="run-details" open>
        <summary>What just happened? ${icon("chevron")}</summary>
        <p>${inline(node.lesson.codex)}</p>
        <p class="margin-note">${inline(node.lesson.margin)}</p>
        <details class="snippet-details">
          <summary>The full Ada ${icon("chevron")}</summary>
          ${codeBlock(node.lesson.snippet)}
        </details>
      </details>

      ${fragmentCard(node, { first })}
      ${node.puzzle.foot ? `<p class="result-foot">${inline(node.puzzle.foot)}</p>` : ""}
      <p class="result-note">${inline(node.puzzle.note || "")}</p>

      <div class="result-secondary">
        <a href="#/map" class="text-link">${icon("map")} Back to the map</a>
        <button class="text-link" type="button" data-replay>${icon("reset")} Replay the rite</button>
      </div>
    </main>
    <div class="actbar">
      <div class="actbar-inner">
        <button class="btn btn--primary btn--block" type="button" data-next>${escapeHtml(next.label)} ${icon("arrow")}</button>
        <p class="actbar-note">${escapeHtml(next.note)}</p>
      </div>
    </div>
  </section>`;

  mount(html);
  scrollTop();
  app.querySelector("[data-next]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("page");
    navigate(next.path);
  });
  app.querySelector("[data-replay]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("tap");
    stopConfetti();
    level = null;
    renderRite(node);
  });
}

/* --------------------------------------------------------------------------
 * Boss briefing
 * ----------------------------------------------------------------------- */

function renderBossBrief(node) {
  currentScreen = "play";
  setTabbar("");
  level = null;
  boss = null;
  setScreenTitle(node.name);
  const { chapter, numeral } = nodeMeta(node);
  const best = store.state.completed[node.id]?.stars || 0;

  const html = `<section class="screen screen--boss-brief" style="--accent:${node.accent}">
    ${playbar(node)}
    <main class="wrap play-wrap">
      <header class="boss-hero">
        <div class="boss-aura" aria-hidden="true">${bossArt(node.art)}</div>
        <p class="eyebrow">CHAPTER ${numeral} · FINAL AUDIT</p>
        <h1 data-focus-heading>${escapeHtml(node.name)}</h1>
        <p class="boss-epithet">${escapeHtml(node.epithet)}</p>
        ${chapterRail(node)}
        ${best ? `<div class="replay-ribbon">BEST ${stars(best, { compact: true })} · the audit can be repeated</div>` : ""}
      </header>

      <div class="boss-rules">
        <div><strong>5</strong><span>QUESTIONS</span></div>
        <div><strong>3</strong><span>HEARTS</span></div>
        <div><strong>0</strong><span>TIMERS</span></div>
      </div>

      <section class="story-card story-card--boss">
        <div class="story-head"><span>TRANSMISSION · BEFORE THE AUDIT</span><button class="text-link" type="button" data-reveal>Reveal all</button></div>
        <div id="boss-dialogue"></div>
      </section>

      <p class="rite-promise">${icon("warning")} A wrong answer costs one heart, but every answer reveals the explanation. Finish all five questions with at least one heart to close the audit. Stars equal the hearts you have left.</p>
    </main>
    <div class="actbar">
      <button class="btn btn--primary btn--block" type="button" data-face>${icon("bolt")} FACE THE AUDIT</button>
    </div>
  </section>`;

  mount(html);
  dialogueCtl = dialogue(document.getElementById("boss-dialogue"), node.intro, {
    reduced: reduceMotion()
  });
  addCleanup(() => dialogueCtl?.cancel());
  app.querySelector("[data-reveal]")?.addEventListener("click", () => dialogueCtl?.skip());
  app.querySelector("[data-face]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("bossHit");
    haptic([25, 40, 25]);
    dialogueCtl?.cancel();
    boss = {
      hearts: 3,
      round: 0,
      resolved: false,
      mistakes: 0,
      lastChoice: null,
      failed: false,
      attempt: 1
    };
    renderBossFight(node);
  });
}

/* --------------------------------------------------------------------------
 * Boss fight
 * ----------------------------------------------------------------------- */

function bossHeartsHtml() {
  return `<div class="hearts" role="img" aria-label="${boss.hearts} of 3 hearts">${Array.from(
    { length: 3 },
    (_, i) => `<span class="heart ${i < boss.hearts ? "is-full" : ""}">${icon("heart")}</span>`
  ).join("")}</div>`;
}

function bossSegmentsHtml(node) {
  return `<div class="audit-segments" aria-label="Question ${Math.min(boss.round + 1, node.rounds.length)} of ${
    node.rounds.length
  }">${node.rounds
    .map((_, i) => {
      const done = i < boss.round || (i === boss.round && boss.resolved);
      return `<span class="audit-seg ${done ? "is-done" : ""} ${i === boss.round ? "is-now" : ""}"></span>`;
    })
    .join("")}</div>`;
}

function bossOptionLabel(index) {
  return String.fromCharCode(65 + index);
}

function bossOptionsHtml(node, round) {
  const answer = round.type === "find" ? round.fault : round.answer;
  if (round.type === "find") {
    return `<div class="boss-find" role="group" aria-label="Tap the faulty line">
      ${round.lines
        .map((line, i) => {
          const correct = i === answer;
          const chosen = boss.lastChoice === i;
          const done = boss.resolved;
          const cls = done && correct ? "is-correct" : done && chosen && !correct ? "is-wrong" : "";
          return `<button class="boss-code-line ${cls}" type="button" data-boss-choice="${i}" ${
            done ? "disabled" : ""
          } aria-label="Line ${i + 1}: ${escapeHtml(line.trim())}">
            <span class="ln">${String(i + 1).padStart(2, "0")}</span><code>${highlightAda(line.trim())}</code>
            <span class="line-flag" aria-hidden="true">${done && correct ? icon("check") : done && chosen ? icon("close") : ""}</span>
          </button>`;
        })
        .join("")}
    </div>`;
  }
  return `<div class="boss-options" role="group" aria-label="Choose an answer">
    ${round.options
      .map((option, i) => {
        const correct = i === answer;
        const chosen = boss.lastChoice === i;
        const done = boss.resolved;
        const cls = done && correct ? "is-correct" : done && chosen && !correct ? "is-wrong" : "";
        const isCode = round.type === "choose";
        return `<button class="boss-option ${cls}" type="button" data-boss-choice="${i}" ${
          done ? "disabled" : ""
        } aria-label="Option ${bossOptionLabel(i)}: ${escapeHtml(option)}">
          <span class="option-letter">${bossOptionLabel(i)}</span>
          <span class="option-copy">${isCode ? `<code>${highlightAda(option)}</code>` : escapeHtml(option)}</span>
          <span class="line-flag" aria-hidden="true">${done && correct ? icon("check") : done && chosen ? icon("close") : ""}</span>
        </button>`;
      })
      .join("")}
  </div>`;
}

function bossFeedbackHtml(node, round) {
  if (!boss.resolved) {
    return `<div class="feedback feedback--boss" role="status" aria-live="polite">
      <span class="feedback-icon">${icon("eye")}</span><p>${inline(round.taunt || "The Compiler is listening.")}</p>
    </div>`;
  }
  const correct = boss.lastChoice === (round.type === "find" ? round.fault : round.answer);
  if (boss.failed) {
    return `<div class="boss-failure" role="status" aria-live="assertive">
      <p class="eyebrow">THE AUDIT FAILS</p>
      <h3>You are out of hearts.</h3>
      <p>${inline(round.explain)}</p>
      <p class="boss-failure-line">The Compiler grants you another draft. It is not mercy. It is a test procedure.</p>
    </div>`;
  }
  return `<div class="feedback feedback--${correct ? "ok" : "error"} feedback--explain" role="status" aria-live="polite">
    <span class="feedback-icon">${correct ? icon("check") : icon("warning")}</span>
    <div><strong>${correct ? "Clean audit." : "The Compiler takes a heart."}</strong><p>${inline(
      round.explain
    )}</p></div>
  </div>`;
}

function bossActbarHtml(node) {
  if (!boss.resolved) {
    return `<p class="actbar-static">${icon("eye")} Choose carefully. The Compiler has all day.</p>`;
  }
  if (boss.failed) {
    return `<button class="btn btn--primary btn--block" type="button" data-boss-next>${icon("reset")} RECOMPILE AND RETRY</button>`;
  }
  const last = boss.round >= node.rounds.length - 1;
  return `<button class="btn btn--primary btn--block" type="button" data-boss-next>${
    last ? `${icon("bolt")} FINISH THE AUDIT` : `NEXT QUESTION ${icon("arrow")}`
  }</button>`;
}

function bossLiveHtml(node) {
  const round = node.rounds[boss.round];
  return `<section class="boss-fight" aria-labelledby="boss-round-title">
    <div class="boss-stage">
      <div class="boss-portrait" aria-hidden="true">${bossArt(node.art)}</div>
      <div class="boss-id">
        <h2>${escapeHtml(node.name)}</h2>
        <p class="boss-epithet">${escapeHtml(node.epithet)}</p>
        <div class="boss-vitals">${bossHeartsHtml()}<span class="round-count">${boss.round + 1} / ${node.rounds.length}</span></div>
        ${bossSegmentsHtml(node)}
      </div>
    </div>

    <div class="boss-round">
      <div class="round-head">
        <span class="round-number">${String(boss.round + 1).padStart(2, "0")}</span>
        <div><p class="eyebrow">${round.type === "find" ? "FIND THE FAULT" : round.type === "predict" ? "PREDICT THE OUTPUT" : "CHOOSE THE FIX"}</p><h3 id="boss-round-title">${inline(
          round.prompt
        )}</h3></div>
      </div>
      ${round.code ? codeBlock(round.code.join("\n")) : ""}
      ${bossOptionsHtml(node, round)}
      ${bossFeedbackHtml(node, round)}
    </div>
  </section>`;
}

function refreshBoss(node, { focus = "next" } = {}) {
  const live = document.getElementById("boss-live");
  const act = document.getElementById("boss-actbar");
  if (live) live.innerHTML = bossLiveHtml(node);
  if (act) act.innerHTML = bossActbarHtml(node);
  if (focus === "next" && boss.resolved) {
    const feedback = document.querySelector(".feedback--explain, .boss-failure");
    if (feedback) {
      feedback.setAttribute("tabindex", "-1");
      feedback.focus({ preventScroll: true });
      const rect = feedback.getBoundingClientRect();
      const limit = window.innerHeight - 100;
      if (rect.bottom > limit) {
        window.scrollBy({
          top: rect.bottom - limit + 14,
          behavior: reduceMotion() ? "auto" : "smooth"
        });
      } else if (rect.top < 74) {
        window.scrollBy({ top: rect.top - 90, behavior: reduceMotion() ? "auto" : "smooth" });
      }
    }
  } else if (focus === "round") {
    const round = document.querySelector(".boss-round");
    if (round) {
      round.setAttribute("tabindex", "-1");
      round.focus({ preventScroll: true });
    }
  }
}

function renderBossFight(node) {
  currentScreen = "play";
  setTabbar("");
  setScreenTitle(node.name);

  const html = `<section class="screen screen--boss" style="--accent:${node.accent}" id="boss-screen">
    ${playbar(node)}
    <main class="wrap play-wrap">
      <h1 class="sr-only" data-focus-heading>${escapeHtml(node.name)} — final audit, question ${boss.round + 1} of ${
        node.rounds.length
      }</h1>
      <div id="boss-live">${bossLiveHtml(node)}</div>
    </main>
    <div class="actbar" id="boss-actbar">${bossActbarHtml(node)}</div>
  </section>`;

  mount(html);
  scrollTop();
  const screen = document.getElementById("boss-screen");
  const onClick = (event) => {
    const choice = event.target.closest("[data-boss-choice]");
    if (choice && !boss.resolved) {
      answerBoss(node, Number(choice.dataset.bossChoice));
      return;
    }
    if (event.target.closest("[data-boss-next]") && boss.resolved) {
      advanceBoss(node);
    }
  };
  screen.addEventListener("click", onClick);
}

function answerBoss(node, choice) {
  if (!boss || boss.resolved) return;
  const round = node.rounds[boss.round];
  const correct = bossAnswer(round, choice);
  boss.resolved = true;
  boss.lastChoice = choice;
  if (correct) {
    sfx("bossHit");
    haptic([15, 25, 15]);
    boss.hearts = Math.max(0, boss.hearts);
  } else {
    boss.hearts = Math.max(0, boss.hearts - 1);
    boss.mistakes++;
    sfx("hurt");
    haptic([40, 30, 40]);
    if (boss.hearts === 0) boss.failed = true;
  }
  refreshBoss(node, { focus: "next" });
}

function advanceBoss(node) {
  if (!boss || !boss.resolved) return;
  if (boss.failed) {
    boss = {
      hearts: 3,
      round: 0,
      resolved: false,
      mistakes: 0,
      lastChoice: null,
      failed: false,
      attempt: boss.attempt + 1
    };
    sfx("page");
    toast("The audit restarts. The Compiler has reset its patience, not its standards.");
    refreshBoss(node, { focus: "round" });
    scrollTop();
    return;
  }
  if (boss.round < node.rounds.length - 1) {
    boss.round++;
    boss.resolved = false;
    boss.lastChoice = null;
    sfx("page");
    refreshBoss(node, { focus: "round" });
    scrollTop();
    return;
  }
  finishBoss(node);
}

function finishBoss(node) {
  const starCount = bossStars(boss.hearts);
  const result = store.completeNode(node.id, {
    stars: starCount,
    mistakes: boss.mistakes,
    hints: 0
  });
  haptic([20, 35, 20, 35, 60]);
  sfx("win");
  setTimeout(() => confetti(["#ffb84d", "#7ef0c8", "#f4ecd9", "#b79bff"]), 200);
  renderBossVictory(node, {
    starCount,
    hearts: boss.hearts,
    mistakes: boss.mistakes,
    newBest: result.newBest,
    first: result.first
  });
}

function renderBossVictory(node, { starCount, hearts, mistakes, newBest, first }) {
  currentScreen = "play";
  setTabbar("");
  setScreenTitle("Audit closed");
  const { chapter, numeral } = nodeMeta(node);
  const next = nextStepFor(node);

  const html = `<section class="screen screen--boss-victory" style="--accent:${node.accent}" id="victory-screen">
    ${playbar(node)}
    <main class="wrap play-wrap">
      <header class="result-head boss-victory-head">
        <p class="eyebrow">CHAPTER ${numeral} · AUDIT CLOSED</p>
        <div class="boss-victory-art" aria-hidden="true">${bossArt(node.art)}</div>
        <div class="result-seal result-seal--boss"><span>AUDIT CLOSED</span><i aria-hidden="true"></i></div>
        <h1 data-focus-heading>${escapeHtml(node.name)} is quiet.</h1>
        <div class="result-stars">${stars(starCount)}${newBest ? `<span class="new-best">NEW BEST</span>` : ""}</div>
        <p class="result-mistakes">${hearts} heart${hearts === 1 ? "" : "s"} left · ${mistakes} wrong answer${
          mistakes === 1 ? "" : "s"
        } · no timers were harmed.</p>
      </header>

      <section class="story-card story-card--defeat">
        <div class="story-head"><span>AFTER THE AUDIT</span></div>
        <div id="defeat-dialogue"></div>
      </section>

      ${fragmentCard(node, { first })}

      <div class="result-secondary">
        <a href="#/map" class="text-link">${icon("map")} Back to the house</a>
        <button class="text-link" type="button" data-rematch>${icon("reset")} Audit again</button>
      </div>
    </main>
    <div class="actbar">
      <div class="actbar-inner">
        <button class="btn btn--primary btn--block" type="button" data-next>${escapeHtml(next.label)} ${icon("arrow")}</button>
        <p class="actbar-note">${escapeHtml(next.note)}</p>
      </div>
    </div>
  </section>`;

  mount(html);
  scrollTop();
  dialogueCtl = dialogue(document.getElementById("defeat-dialogue"), node.defeat, {
    reduced: reduceMotion()
  });
  addCleanup(() => dialogueCtl?.cancel());
  app.querySelector("[data-next]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("page");
    navigate(next.path);
  });
  app.querySelector("[data-rematch]")?.addEventListener("click", () => {
    unlockAudio();
    sfx("tap");
    stopConfetti();
    boss = null;
    renderBossBrief(node);
  });
}

/* --------------------------------------------------------------------------
 * Finale & endings
 * ----------------------------------------------------------------------- */

function renderFinale() {
  currentScreen = "finale";
  setTabbar("");
  if (!store.finalBossBeaten()) {
    toast("The Compiler is still waiting for your final audit.");
    navigate("map");
    return;
  }
  setScreenTitle("The Last Question");
  const all = store.allFragments();
  const chosen = store.state.endings;
  const chapter = CHAPTER_BY_ID.get(5);

  const choices = ENDINGS.filter((ending) => !ending.secret || all)
    .map(
      (ending) => `<button class="ending-choice ${ending.secret ? "ending-choice--secret" : ""}" type="button" data-ending="${
        ending.id
      }" style="--accent:${ending.accent}" ${store.canChooseEnding(ending.id) ? "" : "disabled"}>
        <span class="ending-index">${ending.secret ? "✦" : ending.numeral}</span>
        <span class="ending-copy">
          <span class="ending-label">${escapeHtml(ending.label)}</span>
          <strong>${escapeHtml(ending.title)}</strong>
          <span>${escapeHtml(ending.prompt)}</span>
        </span>
        ${chosen.includes(ending.id) ? `<span class="ending-seen">${icon("check")} READ</span>` : `<span class="node-end">${icon("arrow")}</span>`}
      </button>`
    )
    .join("");

  const html = `<section class="screen screen--finale" style="--accent:${chapter.accent}">
    <header class="topbar topbar--finale">
      <a class="icon-btn" href="#/map" aria-label="Back to the map">${icon("back")}</a>
      <span class="eyebrow">THE ROOT TYPE · THE LAST QUESTION</span>
      <a class="icon-btn" href="#/book" aria-label="Open the Book of Declarations">${icon("book")}</a>
    </header>
    <main class="finale-main">
      <div class="finale-sky" aria-hidden="true">
        <span class="orbit orbit--a"></span><span class="orbit orbit--b"></span>
        <div class="compiler-eye">${bossArt("compiler")}</div>
      </div>
      <header class="finale-copy">
        <p class="eyebrow">THE COMPILER SPEAKS</p>
        <h1 data-focus-heading>What should the world<br><em>optimize for?</em></h1>
        <div class="finale-lines">
          ${COMPILER_FINAL_PROMPT.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
      </header>

      <div class="ending-choices">${choices}</div>

      ${
        all
          ? `<p class="finale-secret-note">${icon("sparkle")} All twenty fragments are assembled. A fourth answer has appeared. It is not on the audit form.</p>`
          : `<p class="finale-secret-note">${icon("lock")} A fourth answer is still missing. Recover all twenty fragments to hear what GNAT really is. You have ${store.state.fragments.length}/20.</p>`
      }

      <div class="finale-footer">
        <a class="text-link" href="#/book">${icon("book")} Open the Book of Declarations</a>
        <button class="text-link" type="button" data-share-finale>${icon("share")} Share your ending</button>
      </div>
    </main>
  </section>`;

  mount(html);
  scrollTop();
  app.querySelectorAll("[data-ending]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.ending;
      if (!store.canChooseEnding(id)) {
        toast("That answer is not available yet. The Book is still missing fragments.");
        return;
      }
      if (store.recordEnding(id)) {
        unlockAudio();
        sfx("win");
        haptic([20, 40, 20, 40, 60]);
        confetti(["#ffb84d", "#7ef0c8", "#f4ecd9", "#b79bff", "#f6d78a"]);
        setTimeout(() => navigate(`ending/${id}`), reduceMotion() ? 0 : 420);
      } else {
        toast("The Compiler cannot file that answer. Try another.");
      }
    });
  });
  app.querySelector("[data-share-finale]")?.addEventListener("click", async () => {
    const p = store.progress();
    const result = await shareGame({
      title: `${META.name} — ${META.subtitle}`,
      text: `I reached the last question in STRICTLY TYPED: ${p.completed}/20 inspections, ${p.fragments}/20 fragments. The Compiler is still waiting.`,
      url: META.url
    });
    if (result === "copied") toast("Copied. The last question travels well.");
    if (result === "failed") toast("Sharing failed. The Void ate the clipboard.");
  });
}

function renderEnding(id) {
  const ending = ENDING_BY_ID.get(id);
  const recorded = ending && store.state.endings.includes(id);
  if (!ending || !recorded) {
    toast("That ending has not been written yet. Choose an answer first.");
    navigate(store.finalBossBeaten() ? "finale" : "map");
    return;
  }
  currentScreen = "ending";
  setTabbar("");
  setScreenTitle(ending.title);
  const p = store.progress();
  const secret = ending.secret === true;

  const html = `<section class="screen screen--ending" style="--accent:${ending.accent}">
    <header class="topbar topbar--ending">
      <a class="icon-btn" href="#/book" aria-label="Back to the Book of Declarations">${icon("book")}</a>
      <span class="eyebrow">${secret ? "SECRET ENDING" : `ENDING ${ending.numeral} OF IV`}</span>
      <button class="icon-btn" type="button" data-share-ending aria-label="Share this ending">${icon("share")}</button>
    </header>
    <main class="ending-main">
      <div class="ending-aura" aria-hidden="true">${secret ? companion("GNAT") : bossArt("compiler")}</div>
      <header class="ending-head">
        <p class="eyebrow">${escapeHtml(ending.label)}</p>
        <h1 data-focus-heading>${escapeHtml(ending.title)}</h1>
        <p class="ending-epigraph">“${escapeHtml(ending.epigraph)}”</p>
      </header>
      <article class="ending-prose">
        ${ending.body
          .map(
            (paragraph, i) =>
              `<p style="animation-delay:${0.08 + i * 0.13}s">${escapeHtml(paragraph)}</p>`
          )
          .join("")}
      </article>
      <div class="ending-final"><span class="prompt">&gt;</span> ${escapeHtml(ending.final)}<span class="cursor-block"></span></div>
      <p class="ending-note">${escapeHtml(ending.note)}</p>
      <div class="ending-stats"><span>${p.stars}/${p.maxStars} stars</span><span>${p.fragments}/${p.totalFragments} fragments</span><span>${p.endings}/${ENDINGS.length} endings</span></div>
      <div class="ending-actions">
        <a class="btn btn--primary" href="#/map">${icon("map")} Return to the House</a>
        <a class="btn btn--ghost" href="#/book">${icon("book")} The Book</a>
      </div>
      <button class="text-link ending-again" type="button" data-again>${icon("arrow")} Revisit the last question</button>
    </main>
  </section>`;

  mount(html);
  scrollTop();
  app.querySelector("[data-share-ending]")?.addEventListener("click", async () => {
    const result = await shareGame({
      title: `${META.name} — ${ending.title}`,
      text: `I finished STRICTLY TYPED with “${ending.title}”: ${p.completed}/20 inspections, ${p.fragments}/20 fragments, ${p.endings}/${ENDINGS.length} endings.`,
      url: META.url
    });
    if (result === "copied") toast("Ending copied. The Compiler pretends not to care.");
    if (result === "failed") toast("Share failed. The Void is being difficult.");
  });
  app.querySelector("[data-again]")?.addEventListener("click", () => navigate("finale"));
}

/* --------------------------------------------------------------------------
 * Codex
 * ----------------------------------------------------------------------- */

function renderCodex() {
  currentScreen = "codex";
  setTabbar("codex");
  setScreenTitle("The Codex");
  const p = store.progress();

  const entries = CHAPTERS.map(
    (chapter) => `<section class="codex-chapter" data-codex-chapter="${chapter.id}" style="--accent:${chapter.accent}">
      <div class="codex-chapter-head"><span class="chapter-numeral">${chapter.numeral}</span><div><p class="eyebrow">CHAPTER ${chapter.numeral}</p><h2>${escapeHtml(
        chapter.title
      )}</h2></div></div>
      ${chapter.lessons
        .map(
          (lesson) => `<details class="codex-entry" data-chapter="${chapter.id}">
            <summary>
              <span class="codex-index">${String(lesson.index).padStart(2, "0")}</span>
              <span class="codex-summary"><span class="codex-concept">${escapeHtml(lesson.concept)}</span><strong>${escapeHtml(
                lesson.lesson.heading
              )}</strong></span>
              <span class="chevron" aria-hidden="true">${icon("chevron")}</span>
            </summary>
            <div class="codex-body">
              ${lesson.lesson.body.map((paragraph) => `<p>${inline(paragraph)}</p>`).join("")}
              ${codeBlock(lesson.lesson.snippet)}
              <div class="codex-watch">
                <h4>${icon("warning")} Watch the rope</h4>
                <ul>${lesson.lesson.pitfalls.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>
              </div>
              <p class="codex-note"><span>COMPILER'S MARGIN</span> ${inline(lesson.lesson.codex)}</p>
            </div>
          </details>`
        )
        .join("")}
    </section>`
  ).join("");

  const html = `<section class="screen screen--codex">
    ${pagebar("FIELD REFERENCE", "The Codex")}
    <main class="wrap prose-wrap">
      <header class="page-hero">
        <p class="eyebrow">ADA, WITHOUT THE PANIC</p>
        <h1 data-focus-heading>THE CODEX</h1>
        <p class="lede">Every concept in the game, in plain English, with the real Ada and the mistakes that make it interesting. No lock: the reference is yours.</p>
        <div class="stat-strip stat-strip--small"><span>${p.completed}/20 inspections</span><span>15 concepts</span><span>1 cheat sheet</span></div>
      </header>

      <div class="filter-row" role="group" aria-label="Filter the Codex by chapter">
        <button class="filter-chip is-active" type="button" data-filter="all" aria-pressed="true">ALL</button>
        ${CHAPTERS.map(
          (chapter) =>
            `<button class="filter-chip" type="button" data-filter="${chapter.id}" aria-pressed="false">${chapter.numeral}</button>`
        ).join("")}
      </div>

      <div class="codex-list">${entries}</div>

      <section class="cheat-sheet">
        <div class="section-head"><p class="eyebrow">POCKET RITUAL</p><h2>The Cheat Sheet</h2><p>Syntax for the moments when the House is dark.</p></div>
        <div class="cheat-grid">
          ${CHEAT_SHEET.map(
            (item) => `<article class="cheat-card"><h3>${escapeHtml(item.title)}</h3>${codeBlock(item.code)}</article>`
          ).join("")}
        </div>
      </section>

      <section class="glossary">
        <div class="section-head"><p class="eyebrow">SMALL PRINT, LARGE CONSEQUENCES</p><h2>Glossary</h2></div>
        <dl>
          ${GLOSSARY.map(
            (item) => `<div class="gloss-row"><dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.text)}</dd></div>`
          ).join("")}
        </dl>
      </section>

      <p class="codex-disclaimer">All snippets are written for Ada 2012 and reviewed by a human with a clipboard. The game simulates execution; it does not ship a compiler. The distinction is the first lesson of the Codex.</p>
    </main>
  </section>`;

  mount(html);

  const chips = [...app.querySelectorAll("[data-filter]")];
  const applyFilter = (filter) => {
    for (const chip of chips) {
      const active = chip.dataset.filter === filter;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    }
    for (const entry of app.querySelectorAll("[data-chapter]")) {
      entry.hidden = filter !== "all" && String(entry.dataset.chapter) !== String(filter);
    }
    for (const chapter of app.querySelectorAll("[data-codex-chapter]")) {
      const hasVisible = [...chapter.querySelectorAll("[data-chapter]")].some((entry) => !entry.hidden);
      chapter.hidden = !hasVisible;
    }
    sfx("tap");
  };
  for (const chip of chips) {
    chip.addEventListener("click", () => applyFilter(chip.dataset.filter));
  }
  app.querySelectorAll(".codex-entry").forEach((entry) => {
    entry.addEventListener("toggle", () => {
      if (entry.open) sfx("page");
    });
  });
}

/* --------------------------------------------------------------------------
 * The Book of Declarations
 * ----------------------------------------------------------------------- */

function renderBook() {
  currentScreen = "book";
  setTabbar("book");
  setScreenTitle("The Book of Declarations");
  const p = store.progress();
  const finalReady = store.finalBossBeaten();

  const fragments = FRAGMENTS.map((fragment) => {
    const unlocked = store.state.fragments.includes(fragment.nodeId);
    const chapter = CHAPTER_BY_ID.get(fragment.chapter);
    if (!unlocked) {
      return `<article class="fragment-card fragment-card--locked" aria-label="Locked field note from chapter ${chapter.numeral}">
        <div class="fragment-top"><span class="eyebrow">FIELD NOTE ${String(FRAGMENTS.indexOf(fragment) + 1).padStart(2, "0")}</span><span class="fragment-seal">${icon("lock")}</span></div>
        <h3>???</h3>
        <p class="locked-quote">The page is blank except for a pressed moth wing.</p>
        <p class="fragment-source">Recover it in Chapter ${chapter.numeral} · ${escapeHtml(fragment.nodeTitle)}</p>
      </article>`;
    }
    return `<article class="fragment-card" style="--accent:${chapter.accent}">
      <div class="fragment-top"><span class="eyebrow">FIELD NOTE ${String(FRAGMENTS.indexOf(fragment) + 1).padStart(2, "0")}</span><span class="fragment-seal">${logoMark(28)}</span></div>
      <h3>${escapeHtml(fragment.title)}</h3>
      <blockquote>“${escapeHtml(fragment.text)}”</blockquote>
      <p class="fragment-source">Chapter ${chapter.numeral} · ${escapeHtml(fragment.nodeTitle)}</p>
    </article>`;
  }).join("");

  const endings = ENDINGS.map((ending) => {
    const unlocked = store.state.endings.includes(ending.id);
    const secret = ending.secret;
    if (!unlocked) {
      return `<article class="ending-card ending-card--locked" style="--accent:${ending.accent}">
        <span class="ending-index">${secret ? "✦" : ending.numeral}</span>
        <div><p class="eyebrow">${secret ? "A FOURTH ANSWER" : `ENDING ${ending.numeral}`}</p><h3>${secret ? "Still hidden" : "Not yet written"}</h3>
        <p>${secret ? "Recover all twenty fragments to reveal what GNAT really is." : "Finish the campaign and answer the Compiler."}</p></div>
        <span class="ending-lock">${icon("lock")}</span>
      </article>`;
    }
    return `<a class="ending-card" href="#/ending/${ending.id}" style="--accent:${ending.accent}">
      <span class="ending-index">${secret ? "✦" : ending.numeral}</span>
      <div><p class="eyebrow">${secret ? "SECRET ENDING" : `ENDING ${ending.numeral}`}</p><h3>${escapeHtml(
        ending.title
      )}</h3><p>${escapeHtml(ending.epigraph)}</p></div>
      <span class="node-end">${icon("arrow")}</span>
    </a>`;
  }).join("");

  const html = `<section class="screen screen--book">
    ${pagebar("THE STORY, RECOVERED", "The Book of Declarations")}
    <main class="wrap prose-wrap">
      <header class="page-hero book-hero">
        <p class="eyebrow">TWENTY FRAGMENTS · FOUR ANSWERS</p>
        <h1 data-focus-heading>THE BOOK<br><em>OF DECLARATIONS</em></h1>
        <p class="lede">Every completed declaration leaves a note. The notes do not fix the universe. They are how you know someone looked.</p>
        <div class="meter meter--wide" role="progressbar" aria-label="Fragments recovered" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${
          p.fragments
        }"><i style="width:${(p.fragments / 20) * 100}%"></i></div>
        <p class="book-progress">${p.fragments}/20 fragments recovered · ${p.endings}/4 endings read</p>
      </header>

      <section class="fragment-section">
        <div class="section-head"><p class="eyebrow">FIELD NOTES</p><h2>What the Void left behind</h2></div>
        <div class="fragment-grid">${fragments}</div>
      </section>

      <section class="ending-section">
        <div class="section-head"><p class="eyebrow">FOUR ANSWERS</p><h2>What the world optimized for</h2>
        <p>${finalReady ? "The Compiler is still listening. You may choose again." : "The last question has not been asked yet."}</p></div>
        <div class="ending-list">${endings}</div>
        ${
          finalReady
            ? `<button class="btn btn--ghost book-finale" type="button" data-to-finale>${icon("arrow")} Revisit the last question</button>`
            : ""
        }
      </section>

      <div class="book-footer">
        <button class="text-link" type="button" data-share-book>${icon("share")} Share the Book</button>
        <a class="text-link" href="#/map">${icon("map")} Back to the map</a>
      </div>
    </main>
  </section>`;

  mount(html);
  app.querySelector("[data-to-finale]")?.addEventListener("click", () => navigate("finale"));
  app.querySelector("[data-share-book]")?.addEventListener("click", async () => {
    const result = await shareGame({
      title: `${META.name} — The Book of Declarations`,
      text: `I've recovered ${store.state.fragments.length}/20 field notes and ${store.state.endings.length}/4 endings in STRICTLY TYPED. The Compiler is still waiting.`,
      url: META.url
    });
    if (result === "copied") toast("The Book has been copied. It is heavier than it looks.");
    if (result === "failed") toast("Sharing failed. The Void intercepted the page.");
  });
}

/* --------------------------------------------------------------------------
 * Settings
 * ----------------------------------------------------------------------- */

function toggleRow(key, title, description, on) {
  return `<div class="settings-row">
    <div class="settings-copy"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>
    <button class="switch ${on ? "is-on" : ""}" type="button" role="switch" aria-checked="${on}" data-setting="${key}" aria-label="${escapeHtml(
      title
    )}"><span class="switch-knob"></span></button>
  </div>`;
}

function offlineStatusText() {
  if (!("serviceWorker" in navigator)) return "Service workers are not available in this browser. The Void is disappointed but not surprised.";
  return offlineReady
    ? "Cached. The entire campaign works without a network. The Compiler is local now."
    : "Caching the universe… this usually takes one quiet moment.";
}

function renderSettings() {
  currentScreen = "settings";
  setTabbar("settings");
  setScreenTitle("Settings");
  const p = store.progress();
  const s = store.state.settings;
  const standalone = installIsStandalone();
  const installButton = standalone
    ? `<span class="status-pill">${icon("check")} INSTALLED</span>`
    : `<button class="btn btn--primary btn--sm" type="button" data-install>${icon("install")} INSTALL</button>`;

  const html = `<section class="screen screen--settings">
    ${pagebar("CONTROL ROOM", "Settings")}
    <main class="wrap prose-wrap">
      <header class="page-hero">
        <p class="eyebrow">PREFERENCES · LOCAL ONLY</p>
        <h1 data-focus-heading>SETTINGS</h1>
        <p class="lede">Everything is stored on this device. There is no account because the Compiler believes accounts are just undeclared variables with marketing.</p>
      </header>

      <section class="settings-panel">
        <div class="section-head"><p class="eyebrow">THE SENSES</p><h2>Feedback</h2></div>
        ${toggleRow("sound", "Sound", "Small synthesised chimes, taps and compiler complaints. No music, no downloads.", s.sound)}
        ${toggleRow("haptics", "Haptics", "A gentle buzz on supported phones. The Void has no nerves; you do.", s.haptics)}
        ${toggleRow("reduceMotion", "Reduce motion", "Disables typewriter reveals, confetti and most movement. The system setting is always respected.", s.reduceMotion)}
      </section>

      <section class="settings-panel">
        <div class="section-head"><p class="eyebrow">THE INSTALLATION</p><h2>Offline &amp; home screen</h2></div>
        <div class="settings-row">
          <div class="settings-copy"><strong>Install the inspection kit</strong><p>Play full-screen, offline, with no browser furniture. The PWA is the whole game; no download store required.</p></div>
          ${installButton}
        </div>
        <div class="settings-row">
          <div class="settings-copy"><strong>Offline status</strong><p data-offline-status>${offlineStatusText()}</p></div>
          <span class="status-pill status-pill--mint">${icon("check")} PWA</span>
        </div>
      </section>

      <section class="settings-panel">
        <div class="section-head"><p class="eyebrow">THE RECORD</p><h2>Progress</h2></div>
        <div class="settings-stats">
          <div><strong>${p.completed}<small>/20</small></strong><span>DECLARATIONS</span></div>
          <div><strong>${p.stars}<small>/60</small></strong><span>STARS</span></div>
          <div><strong>${p.fragments}<small>/20</small></strong><span>FRAGMENTS</span></div>
          <div><strong>${p.endings}<small>/4</small></strong><span>ENDINGS</span></div>
        </div>
        <div class="settings-actions">
          <button class="btn btn--ghost btn--sm" type="button" data-share-settings>${icon("share")} Share progress</button>
          <button class="btn btn--danger btn--sm" type="button" data-reset>${icon("reset")} Erase the inspection</button>
        </div>
      </section>

      <section class="settings-panel">
        <div class="section-head"><p class="eyebrow">SMALL PRINT</p><h2>About</h2></div>
        <div class="about-copy">
          <p><strong>${META.name}</strong> — ${escapeHtml(META.subtitle)}. Version ${META.version}. Built for the browser, offline first, with no accounts, ads, analytics or external fonts.</p>
          <p>Ada is a real programming language, named after Ada Lovelace. GNAT is also a real compiler; the moth is an affectionate mascot with no access to your build directory. Snippets are written for Ada 2012; execution in the game is simulated.</p>
          <p>Inspired by strong typing, information hiding, and the strange tenderness of a good error message. Made with vanilla HTML, CSS and JavaScript.</p>
          <div class="about-links">
            <a class="text-link" href="https://www.adaic.org/" target="_blank" rel="noopener">Ada Information Clearinghouse ${icon("external")}</a>
            <a class="text-link" href="https://learn.adacore.com/" target="_blank" rel="noopener">Learn Ada ${icon("external")}</a>
          </div>
          <p class="about-reset">No actual dangling pointers were harmed. One was invited to stay for tea.</p>
        </div>
      </section>

      <div class="settings-footer">
        <button class="text-link" type="button" data-help>${icon("help")} How to play</button>
        <button class="text-link" type="button" data-to-title>${icon("back")} Return to the title</button>
      </div>
    </main>
  </section>`;

  mount(html);
  app.querySelectorAll("[data-setting]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.setting;
      const value = !store.state.settings[key];
      store.setSetting(key, value);
      button.classList.toggle("is-on", value);
      button.setAttribute("aria-checked", String(value));
      applySettings();
      if (key === "sound") {
        unlockAudio();
        if (value) sfx("tap");
      }
      if (key === "haptics" && value) haptic([20]);
      if (key === "reduceMotion") {
        sfx(value ? "tap" : "place");
      }
    });
  });
  app.querySelector("[data-install]")?.addEventListener("click", async () => {
    await installFlow();
  });
  app.querySelector("[data-reset]")?.addEventListener("click", async () => {
    const yes = await confirmModal({
      title: "Erase the entire inspection?",
      body: `<p>This removes all stars, field notes, endings and the secret. It keeps your sound and motion settings, because the Compiler is sentimental about preferences.</p><p class="modal-note">There is no undo. The Void will be declared all over again.</p>`,
      confirmLabel: "Erase everything",
      danger: true
    });
    if (!yes) return;
    store.resetProgress();
    applySettings();
    sfx("win");
    toast("The universe has been reformatted. It remembers nothing.");
    navigate("");
  });
  app.querySelector("[data-share-settings]")?.addEventListener("click", shareProgress);
  app.querySelector("[data-to-title]")?.addEventListener("click", () => navigate(""));
}

/* --------------------------------------------------------------------------
 * PWA
 * ----------------------------------------------------------------------- */

function refreshOfflineStatus() {
  const node = document.querySelector("[data-offline-status]");
  if (node) node.textContent = offlineStatusText();
}

function updateInstallUI() {
  refreshInstallSlot();
  if (currentScreen === "settings") {
    /* Re-render only if the install row changed from a prompt arriving. */
    renderSettings();
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  hadController = Boolean(navigator.serviceWorker.controller);
  try {
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    navigator.serviceWorker.ready
      .then(() => {
        offlineReady = true;
        refreshOfflineStatus();
      })
      .catch(() => {});

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          toast("A new revision of reality is available.", {
            tone: "warn",
            timeout: 9000,
            actionLabel: "Recompile",
            action: () => {
              reloadOnControllerChange = true;
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }
      });
    });
  } catch {
    /* Offline capability is a bonus; the game still works from cache of the tab. */
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadOnControllerChange && hadController) {
      reloadOnControllerChange = false;
      window.location.reload();
    }
  });
}

function initPWA() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallUI();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    refreshInstallSlot();
    if (currentScreen === "settings") renderSettings();
    toast("Installed. The inspection kit now lives on your home screen.");
  });
  window.addEventListener("online", () => {
    toast("Reconnected. The Compiler noticed, but said nothing.");
  });
  window.addEventListener("offline", () => {
    toast("Offline. The Compiler is local now.");
  });
}

/* --------------------------------------------------------------------------
 * Router
 * ----------------------------------------------------------------------- */

function route() {
  runCleanup();
  stopConfetti();
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/");
  const screen = parts[0] || "title";
  const param = parts[1] || "";
  currentScreen = screen;
  document.body.dataset.screen = screen;

  switch (screen) {
    case "intro":
      renderIntro();
      break;
    case "map":
      renderMap();
      break;
    case "play": {
      const node = NODE_BY_ID.get(param);
      if (!node) {
        toast("That declaration does not exist. The Void has hidden it.");
        navigate("map");
        return;
      }
      if (!store.isUnlocked(node.id)) {
        toast("Locked. Finish the previous declaration first.");
        navigate("map");
        return;
      }
      store.setStarted();
      if (node.kind === "boss") renderBossBrief(node);
      else renderLessonBrief(node);
      break;
    }
    case "codex":
      renderCodex();
      break;
    case "book":
      renderBook();
      break;
    case "settings":
      renderSettings();
      break;
    case "finale":
      renderFinale();
      break;
    case "ending":
      renderEnding(param);
      break;
    case "title":
    case "":
    default:
      renderTitle();
      break;
  }
  scrollTop();
}

function initGlobal() {
  applySettings();
  tabbar.hidden = true;
  initPWA();
  registerServiceWorker();

  window.addEventListener("hashchange", route);

  app.addEventListener("click", (event) => {
    if (event.target.closest("[data-help]")) {
      event.preventDefault();
      openHowTo();
      return;
    }
    const link = event.target.closest("a[href^='#']");
    if (link) {
      unlockAudio();
      sfx("page");
    }
  });

  tabbar.addEventListener("click", () => {
    unlockAudio();
    sfx("page");
  });

  window.addEventListener(
    "pointerdown",
    () => {
      unlockAudio();
    },
    { once: true }
  );
  window.addEventListener(
    "keydown",
    () => {
      unlockAudio();
    },
    { once: true }
  );

  const params = new URLSearchParams(location.search);
  if (!location.hash) {
    if (params.get("go") === "codex") history.replaceState(null, "", "#/codex");
    else if (params.get("go") === "continue") {
      history.replaceState(null, "", store.state.started ? "#/map" : "#/intro");
    } else if (params.get("go") === "book") history.replaceState(null, "", "#/book");
  }

  route();
}

initGlobal();
