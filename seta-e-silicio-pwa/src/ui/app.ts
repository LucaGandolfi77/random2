import { CHARACTERS, JOURNAL } from "../data/story";
import type { Ending, Hotspot, Lang, StoryState } from "../data/types";
import {
  activeDialogue,
  activeJournal,
  activeNode,
  advanceChapter,
  advanceDialogue,
  availableHotspots,
  canRewind,
  chooseOption,
  currentChapter,
  endingFor,
  initialState,
  isChapterComplete,
  rewindDialogue,
  startDialogue,
  visibleChoices
} from "../game/engine";
import { clearState, loadLang, loadSound, loadState, saveLang, saveSound, saveState } from "../game/save";
import { interpolate, t } from "../data/strings";
import { AudioEngine } from "../world/audio";
import { World } from "../world/world";

type Screen = "title" | "intro" | "tutorial" | "game" | "ending";
type Overlay = "journal" | "menu" | "help" | "chapter" | "chapterComplete" | null;

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleArt(): string {
  return `<svg class="title-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="ta-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1c24"/><stop offset=".55" stop-color="#183a40"/><stop offset="1" stop-color="#0b1418"/>
      </linearGradient>
      <linearGradient id="ta-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1c4b55"/><stop offset="1" stop-color="#09171c"/>
      </linearGradient>
      <radialGradient id="ta-moon"><stop offset="0" stop-color="#f7dca1" stop-opacity=".9"/><stop offset="1" stop-color="#f7dca1" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#ta-sky)"/>
    <circle cx="1120" cy="180" r="170" fill="url(#ta-moon)"/>
    <circle cx="1120" cy="180" r="58" fill="#f4d79a" opacity=".9"/>
    <g fill="#132a31" opacity=".8">
      <rect x="60" y="410" width="150" height="230"/><rect x="240" y="360" width="110" height="280"/><rect x="380" y="430" width="180" height="210"/>
      <rect x="900" y="390" width="130" height="250"/><rect x="1060" y="440" width="190" height="200"/><rect x="1270" y="360" width="120" height="280"/>
    </g>
    <g fill="#1d3941">
      <rect x="0" y="560" width="1440" height="220"/>
      <path d="M0 560 Q120 520 250 548 T520 548 T790 540 T1080 552 T1440 528 L1440 640 L0 640 Z" fill="#152f36"/>
    </g>
    <g fill="#d9a441" opacity=".55">
      <rect x="100" y="470" width="8" height="8"/><rect x="150" y="500" width="8" height="8"/><rect x="260" y="450" width="8" height="8"/>
      <rect x="930" y="470" width="8" height="8"/><rect x="1000" y="510" width="8" height="8"/><rect x="1200" y="460" width="8" height="8"/>
    </g>
    <path d="M0 620 Q220 590 440 612 T880 608 T1440 590 L1440 700 L0 700 Z" fill="url(#ta-water)"/>
    <g stroke="#f2c15e" stroke-width="3" fill="none" opacity=".8">
      <path d="M120 760 Q360 720 620 748 T1120 738 T1420 760"/>
      <path d="M180 790 Q400 760 650 780 T1100 770 T1400 790" opacity=".35"/>
    </g>
    <g transform="translate(420 610)">
      <path d="M0 80 Q120 20 240 80 L240 110 L0 110 Z" fill="#6f6758"/>
      <path d="M-20 80 Q120 -10 260 80" stroke="#a89b82" stroke-width="14" fill="none"/>
      <rect x="30" y="20" width="14" height="60" fill="#8b7d66"/><rect x="196" y="20" width="14" height="60" fill="#8b7d66"/>
      <path d="M18 20 Q120 -30 222 20" stroke="#c65d3b" stroke-width="7" fill="none"/>
    </g>
    <g fill="#e8ddc8">
      <rect x="120" y="500" width="130" height="90"/><rect x="290" y="470" width="100" height="120"/><rect x="970" y="480" width="120" height="110"/>
      <rect x="1015" y="520" width="26" height="30" fill="#f2c15e" opacity=".55"/>
      <circle cx="1070" cy="545" r="10" fill="#c65d3b"/>
    </g>
    <g fill="#394240">
      <path d="M105 500 L185 460 L265 500 Z"/><path d="M275 470 L340 438 L405 470 Z"/><path d="M955 480 L1030 444 L1105 480 Z"/>
    </g>
    <g>
      <circle cx="180" cy="610" r="16" fill="#c65d3b"/><rect x="178" y="626" width="4" height="18" fill="#d9a441"/>
      <circle cx="1010" cy="600" r="13" fill="#c65d3b"/><rect x="1008" y="613" width="4" height="14" fill="#d9a441"/>
      <circle cx="1260" cy="640" r="10" fill="#c65d3b"/>
    </g>
    <g stroke="#f2c15e" stroke-width="2" fill="none" opacity=".75">
      <path d="M780 230 C850 300 900 360 860 440 C830 500 760 520 740 570"/>
      <path d="M780 230 C740 290 700 360 720 420"/>
    </g>
    <g fill="#f2c15e" opacity=".95">
      <circle cx="780" cy="230" r="4"/><circle cx="860" cy="440" r="3"/><circle cx="720" cy="420" r="3"/>
    </g>
  </svg>`;
}

export class App {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ui: HTMLElement;
  private readonly audio = new AudioEngine();
  private world: World | null = null;
  private state: StoryState | null = null;
  private lang: Lang = loadLang();
  private screen: Screen = "title";
  private overlay: Overlay = null;
  private nearby: Hotspot | null = null;
  private worldError = false;
  private lastTime = 0;
  private raf = 0;
  private toastTimer = 0;
  private soundOn = loadSound();
  private joystickPointer: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = `<canvas id="scene" class="scene" aria-label="Suzhou"></canvas><div id="ui" class="ui"></div><div id="toast" class="toast" role="status" aria-live="polite"></div>`;
    this.canvas = this.root.querySelector<HTMLCanvasElement>("#scene")!;
    this.ui = this.root.querySelector<HTMLElement>("#ui")!;
    this.ui.addEventListener("click", (event) => void this.onClick(event));
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.root.addEventListener("pointerdown", () => void this.ensureAudio(), { once: true });
  }

  start(): void {
    this.renderTitle();
  }

  private async ensureAudio(): Promise<void> {
    if (!this.soundOn) return;
    await this.audio.start();
  }

  private async toggleSound(): Promise<void> {
    this.soundOn = !this.soundOn;
    saveSound(this.soundOn);
    if (this.soundOn) {
      await this.audio.start();
      this.audio.setEnabled(true);
    } else {
      this.audio.setEnabled(false);
    }
    this.renderCurrent();
  }

  private save(): void {
    if (this.state) saveState(this.state);
  }

  private setScreen(screen: Screen): void {
    this.screen = screen;
    this.root.dataset.screen = screen;
    this.root.classList.toggle("is-title", screen === "title" || screen === "intro" || screen === "tutorial");
    this.root.classList.toggle("is-ending", screen === "ending");
    this.canvas.classList.toggle("is-hidden", screen === "title" || screen === "intro" || screen === "tutorial");
  }

  private renderCurrent(): void {
    if (this.screen === "title") this.renderTitle();
    else if (this.screen === "intro") this.renderIntro();
    else if (this.screen === "tutorial") this.renderTutorial();
    else if (this.screen === "ending") this.renderEnding();
    else this.renderGame();
  }

  /* ------------------------------------------------------------ title */

  private renderTitle(): void {
    this.setScreen("title");
    this.stopLoop();
    const saved = loadState();
    const continueLabel = saved?.finalChoice ? this.tt("ending") : this.tt("continueStory");
    this.ui.innerHTML = `<div class="screen title-screen">
      ${titleArt()}
      <div class="title-shade"></div>
      <header class="title-top">
        <span class="seal">丝</span>
        <span class="seal seal-two">硅</span>
        <div class="title-actions">
          <button class="chip-button" data-action="lang">${this.lang === "it" ? "EN" : "IT"}</button>
          <button class="chip-button" data-action="sound">${this.soundOn ? "♪" : "🔇"}</button>
          <button class="chip-button" data-action="about">?</button>
        </div>
      </header>
      <div class="title-copy">
        <p class="eyebrow">Suzhou · 2032 · Cinque episodi</p>
        <h1>${esc(this.tt("appName"))}</h1>
        <h2>${esc(this.tt("appSubtitle"))}</h2>
        <p class="title-lead">${esc(this.tt("introBody"))}</p>
        <div class="title-button-row">
          <button class="button button-primary" data-action="new-game">${esc(this.tt("newGame"))} <span>→</span></button>
          ${saved ? `<button class="button button-ghost" data-action="continue">${esc(continueLabel)}</button>` : ""}
        </div>
        <p class="title-meta">${esc(this.tt("controlsDesktop"))}</p>
      </div>
      <div class="title-foot">
        <span>${esc(this.tt("creditsFoot"))}</span>
        <span>${esc(this.tt("offline"))} · ${esc(this.tt("install"))}</span>
      </div>
      ${this.overlay === "help" ? this.overlayHtml() : ""}
    </div>`;
  }

  private renderIntro(): void {
    this.setScreen("intro");
    this.stopLoop();
    this.ui.innerHTML = `<div class="screen title-screen">
      ${titleArt()}<div class="title-shade"></div>
      <div class="intro-card">
        <p class="eyebrow">${esc(this.tt("prologue"))}</p>
        <h1>${esc(this.tt("introTitle"))}</h1>
        <p>${esc(this.tt("introBody"))}</p>
        <p class="intro-prologue">${esc(this.tt("prologueBody"))}</p>
        <button class="button button-primary" data-action="intro-next">${esc(this.tt("introCta"))} <span>→</span></button>
      </div>
    </div>`;
  }

  private renderTutorial(): void {
    this.setScreen("tutorial");
    this.stopLoop();
    this.ui.innerHTML = `<div class="screen title-screen">
      ${titleArt()}<div class="title-shade"></div>
      <div class="intro-card tutorial-card">
        <p class="eyebrow">${esc(this.tt("rewindTutorialTitle"))}</p>
        <h1>${esc(this.tt("rewind"))}</h1>
        <p>${esc(this.tt("rewindTutorialBody"))}</p>
        <div class="tutorial-key"><span>R</span><small>${esc(this.tt("rewind"))}</small></div>
        <button class="button button-primary" data-action="begin-story">${esc(this.tt("startStory"))} <span>→</span></button>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------- game */

  private ensureWorld(): boolean {
    if (this.world) return true;
    if (this.worldError) return false;
    try {
      this.world = new World(this.canvas, {
        onNearby: (hotspot) => {
          this.nearby = hotspot;
          this.updatePrompt();
        }
      });
      return true;
    } catch (error) {
      console.error(error);
      this.worldError = true;
      this.toast(this.tt("errorWebgl"));
      return false;
    }
  }

  private enterGame(showChapterCard: boolean): void {
    if (!this.state) this.state = initialState();
    if (!this.ensureWorld()) {
      this.toast(this.tt("errorWebgl"));
      return;
    }
    this.setScreen("game");
    this.overlay = showChapterCard ? "chapter" : null;
    this.loadWorld();
    this.renderGame();
    this.startLoop();
    void this.ensureAudio();
  }

  private loadWorld(): void {
    if (!this.state || !this.world) return;
    const chapter = currentChapter(this.state);
    this.world.loadChapter(chapter, availableHotspots(this.state, chapter));
    this.world.setInputEnabled(!this.overlay && !this.state.dialogue);
    this.audio.setWeather(chapter.weather);
    if (this.state.dialogue) {
      const node = activeNode(this.state);
      this.world.focusDialogue(node && node.speaker !== "mei" && node.speaker !== "narrator" ? node.speaker : null);
    } else {
      this.world.clearDialogueFocus();
    }
    this.audio.chapter();
  }

  private renderGame(): void {
    if (!this.state) return;
    this.setScreen("game");
    const chapter = currentChapter(this.state);
    const dialogue = activeDialogue(this.state);
    const node = activeNode(this.state);
    const hasDialogue = Boolean(this.state.dialogue && dialogue && node);
    const canInteract = this.nearby && !hasDialogue && !this.overlay;
    const hudClass = hasDialogue ? "hud is-dialogue" : "hud";
    this.ui.innerHTML = `<div class="${hudClass}">
      <div class="hud-top">
        <div class="chapter-badge">
          <small>${esc(interpolate(this.tt("chapterOf"), { n: chapter.number }))}</small>
          <b>${esc(chapter.title[this.lang])}</b>
          <span>${esc(chapter.location[this.lang])}</span>
        </div>
        <div class="hud-actions">
          <button class="icon-button" data-action="journal" title="${esc(this.tt("journal"))}">${this.tt("journal")}</button>
          <button class="icon-button" data-action="sound" title="${esc(this.tt("soundOn"))}">${this.soundOn ? "♪" : "🔇"}</button>
          <button class="icon-button" data-action="lang">${this.lang === "it" ? "EN" : "IT"}</button>
          <button class="icon-button" data-action="menu" title="${esc(this.tt("settings"))}">☰</button>
        </div>
      </div>
      <div class="objective"><span>${esc(this.tt("objective"))}</span><p>${esc(chapter.objective[this.lang])}</p></div>
      <div class="hud-bottom">
        <div class="joystick" id="joystick" aria-label="${esc(this.tt("controls"))}"><div class="joystick-knob" id="joystick-knob"></div></div>
        <div class="action-cluster">
          <div class="prompt" id="prompt"></div>
          <button class="action-button" id="interact-button" data-action="interact" ${canInteract ? "" : "disabled"}>E · ${esc(this.tt("interact"))}</button>
          ${this.state.lastDialogue && !hasDialogue ? `<button class="rewind-button" data-action="rewind-last">↺ ${esc(this.tt("rewind"))}</button>` : ""}
        </div>
      </div>
      ${hasDialogue ? this.dialogueHtml() : ""}
      ${this.overlay ? this.overlayHtml() : ""}
    </div>`;
    this.bindJoystick();
    this.updatePrompt();
  }

  private dialogueHtml(): string | null {
    if (!this.state?.dialogue) return null;
    const node = activeNode(this.state);
    const dialogue = activeDialogue(this.state);
    if (!node || !dialogue) return null;
    const character = CHARACTERS[node.speaker] ?? CHARACTERS.narrator;
    const speakerName = node.speaker === "mei" ? this.tt("speakerYou") : character.name[this.lang];
    const role = node.speaker === "narrator" ? "" : character.role[this.lang];
    const choices = visibleChoices(this.state);
    const choicesHtml = choices.length
      ? `<div class="dialogue-choices">${choices
          .map(({ choice, locked }) => {
            if (locked) {
              return `<button class="choice-button is-locked" type="button" disabled>${esc(choice.text[this.lang])}<small>${esc(choice.lockedHint?.[this.lang] ?? this.tt("lockedHint"))}</small></button>`;
            }
            return `<button class="choice-button ${choice.tone ? `tone-${choice.tone}` : ""}" data-action="choice" data-id="${esc(choice.id)}" type="button">${esc(choice.text[this.lang])}</button>`;
          })
          .join("")}</div>`
      : "";
    return `<div class="dialogue-layer">
      <div class="dialogue-box">
        <div class="dialogue-head">
          <span class="speaker">${esc(speakerName)}</span>
          ${role ? `<span class="speaker-role">${esc(role)}</span>` : ""}
          <span class="dialogue-progress">${esc(this.tt("factsCount").replace("{n}", String(this.state.facts.length)))}</span>
        </div>
        <p class="dialogue-text">${esc(node.text[this.lang])}</p>
        ${node.rewindHint ? `<p class="rewind-hint">${esc(node.rewindHint[this.lang])}</p>` : ""}
        ${choicesHtml}
        <div class="dialogue-footer">
          <button class="rewind-button" data-action="rewind" type="button">↺ ${esc(this.tt("rewind"))} <kbd>R</kbd></button>
          ${choices.length ? "" : `<button class="button button-small" data-action="advance" type="button">${esc(this.tt("continueDialogue"))} <span>→</span></button>`}
        </div>
        ${this.state.rewinds > 0 ? `<p class="rewind-count">${esc(this.tt("rewindUsed").replace("{n}", String(this.state.rewinds)))}</p>` : ""}
      </div>
    </div>`;
  }

  private overlayHtml(): string {
    if (this.overlay === "chapter" || this.overlay === "chapterComplete") return this.chapterOverlayHtml();
    if (this.overlay === "journal") return this.journalHtml();
    if (this.overlay === "menu") return this.menuHtml();
    if (this.overlay === "help") return this.helpHtml();
    return "";
  }

  private chapterOverlayHtml(): string {
    if (!this.state) return "";
    const chapter = currentChapter(this.state);
    const complete = this.overlay === "chapterComplete";
    return `<div class="chapter-overlay">
      <div class="chapter-card">
        <p class="eyebrow">${complete ? esc(this.tt("chapterComplete")) : esc(this.tt("newChapter"))}</p>
        <div class="chapter-number">${String(chapter.number).padStart(2, "0")}</div>
        <h2>${esc(chapter.title[this.lang])}</h2>
        <h3>${esc(chapter.subtitle[this.lang])}</h3>
        <p>${esc(complete ? this.tt("chapterCompleteBody") : chapter.objective[this.lang])}</p>
        <p class="chapter-location">${esc(chapter.location[this.lang])}</p>
        <button class="button button-primary" data-action="${complete ? "next-chapter" : "begin-chapter"}">${esc(complete ? this.tt("chapterCompleteCta") : this.tt("start"))} <span>→</span></button>
      </div>
    </div>`;
  }

  private journalHtml(): string {
    if (!this.state) return "";
    const entries = activeJournal(this.state);
    const factsHtml = entries.length
      ? entries
          .map(
            (entry) => `<article class="journal-entry">
              <h3>${esc(entry.title[this.lang])}</h3>
              <p>${esc(entry.body[this.lang])}</p>
            </article>`
          )
          .join("")
      : `<p class="empty-note">${esc(this.tt("journalEmpty"))}</p>`;
    const cast = Object.values(CHARACTERS)
      .filter((character) => character.id !== "narrator")
      .map(
        (character) => `<article class="cast-card" style="--cast:${character.accent.toString(16).padStart(6, "0")}">
          <span class="cast-dot"></span>
          <div><b>${esc(character.name[this.lang])}</b><small>${esc(character.role[this.lang])}</small></div>
          <p>${esc(character.bio[this.lang])}</p>
        </article>`
      )
      .join("");
    return `<div class="modal-layer" role="dialog" aria-modal="true">
      <div class="modal journal-modal">
        <header class="modal-head">
          <div><p class="eyebrow">${esc(this.tt("journalSubtitle"))}</p><h2>${esc(this.tt("journalIntro"))}</h2></div>
          <button class="icon-button" data-action="close-overlay" aria-label="${esc(this.tt("close"))}">✕</button>
        </header>
        <p class="modal-lead">${esc(this.tt("journalIntroBody"))}</p>
        <div class="journal-stats">
          <span><b>${this.state.facts.length}</b>${esc(this.tt("facts"))}</span>
          <span><b>${this.state.rewinds}</b>${esc(this.tt("rewindsUsed"))}</span>
          <span><b>${this.state.chapter}</b>${esc(this.tt("chaptersSeen"))}</span>
        </div>
        <div class="journal-columns">
          <section><h3 class="section-label">${esc(this.tt("facts"))}</h3>${factsHtml}</section>
          <section><h3 class="section-label">${esc(this.tt("characters"))}</h3><div class="cast-list">${cast}</div></section>
        </div>
        <p class="modal-note">${esc(this.tt("factsHint"))}</p>
      </div>
    </div>`;
  }

  private menuHtml(): string {
    if (!this.state) return "";
    return `<div class="modal-layer" role="dialog" aria-modal="true">
      <div class="modal menu-modal">
        <header class="modal-head"><div><p class="eyebrow">${esc(this.tt("settings"))}</p><h2>${esc(this.tt("appName"))}</h2></div><button class="icon-button" data-action="close-overlay">✕</button></header>
        <div class="menu-grid">
          <button class="menu-item" data-action="close-overlay"><b>${esc(this.tt("continue"))}</b><small>${esc(this.tt("objective"))}</small></button>
          <button class="menu-item" data-action="journal"><b>${esc(this.tt("journal"))}</b><small>${esc(this.tt("facts"))}: ${this.state.facts.length}</small></button>
          <button class="menu-item" data-action="sound"><b>${this.soundOn ? esc(this.tt("soundOn")) : esc(this.tt("soundOff"))}</b><small>${esc(this.tt("audioHint"))}</small></button>
          <button class="menu-item" data-action="lang"><b>${this.lang === "it" ? "English" : "Italiano"}</b><small>${esc(this.tt("language"))}</small></button>
          <button class="menu-item" data-action="help"><b>${esc(this.tt("help"))}</b><small>${esc(this.tt("controls"))}</small></button>
          <button class="menu-item" data-action="restart"><b>${esc(this.tt("restart"))}</b><small>${esc(this.tt("restartHint"))}</small></button>
          <button class="menu-item danger" data-action="to-title"><b>${esc(this.tt("toTitle"))}</b><small>${esc(this.tt("quitConfirm"))}</small></button>
        </div>
        <p class="modal-note">${esc(this.tt("credits"))}<br>${esc(this.tt("creditsBody"))}</p>
      </div>
    </div>`;
  }

  private helpHtml(): string {
    return `<div class="modal-layer" role="dialog" aria-modal="true">
      <div class="modal help-modal">
        <header class="modal-head"><div><p class="eyebrow">${esc(this.tt("help"))}</p><h2>${esc(this.tt("controls"))}</h2></div><button class="icon-button" data-action="close-overlay">✕</button></header>
        <p>${esc(this.tt("helpBody"))}</p>
        <div class="help-row"><kbd>WASD</kbd><span>${esc(this.tt("controlsDesktop"))}</span></div>
        <div class="help-row"><kbd>E</kbd><span>${esc(this.tt("interact"))}</span></div>
        <div class="help-row"><kbd>R</kbd><span>${esc(this.tt("rewindTutorialBody"))}</span></div>
        <div class="help-row"><kbd>J</kbd><span>${esc(this.tt("journal"))}</span></div>
        <button class="button button-primary" data-action="close-overlay">${esc(this.tt("gotIt"))}</button>
      </div>
    </div>`;
  }

  private renderEnding(): void {
    if (!this.state) return;
    const ending = endingFor(this.state);
    if (!ending) {
      this.screen = "game";
      this.renderGame();
      return;
    }
    this.setScreen("ending");
    this.ui.innerHTML = `<div class="ending-screen">
      ${titleArt()}<div class="title-shade"></div>
      <div class="ending-card">
        <p class="eyebrow">${esc(this.tt("ending"))} · ${esc(this.tt("finalEnding"))}</p>
        <h1>${esc(ending.title[this.lang])}</h1>
        <h2>${esc(ending.kicker[this.lang])}</h2>
        <p class="ending-body">${esc(ending.body[this.lang])}</p>
        <div class="epilogue">
          <h3>${esc(this.tt("epilogue"))}</h3>
          ${ending.epilogue.map((line) => `<p>${esc(line[this.lang])}</p>`).join("")}
        </div>
        <p class="ending-stats">${esc(interpolate(this.tt("endingStats"), { facts: this.state.facts.length, rewinds: this.state.rewinds }))}</p>
        <div class="ending-actions">
          <button class="button button-primary" data-action="share">${esc(this.tt("share"))} <span>↗</span></button>
          <button class="button button-ghost" data-action="download">${esc(this.tt("download"))}</button>
          <button class="button button-ghost" data-action="copy">${esc(this.tt("copy"))}</button>
          <button class="button button-ghost" data-action="replay">${esc(this.tt("playAgain"))}</button>
        </div>
        <p class="ending-note">${esc(this.tt("restartHint"))} · ${esc(this.tt("disclaimer"))}</p>
      </div>
    </div>`;
  }

  /* --------------------------------------------------------- dialogue */

  private openDialogue(id: string): void {
    if (!this.state || !this.world) return;
    if (this.state.dialogue) return;
    this.hideToast();
    try {
      const before = [...this.state.facts];
      this.state = startDialogue(this.state, id);
      this.save();
      this.notifyFacts(before);
      this.world.setInputEnabled(false);
      const node = activeNode(this.state);
      this.world.focusDialogue(node && node.speaker !== "mei" && node.speaker !== "narrator" ? node.speaker : null);
      this.audio.interact();
      this.renderGame();
    } catch (error) {
      console.error(error);
      this.toast(this.tt("errorGeneric"));
    }
  }

  private advance(): void {
    if (!this.state) return;
    try {
      const before = [...this.state.facts];
      this.state = advanceDialogue(this.state);
      this.save();
      this.notifyFacts(before);
      if (this.state.dialogue) {
        const node = activeNode(this.state);
        this.world?.focusDialogue(node && node.speaker !== "mei" && node.speaker !== "narrator" ? node.speaker : null);
        this.renderGame();
      } else {
        this.afterDialogue();
      }
    } catch (error) {
      console.error(error);
    }
  }

  private choose(id: string): void {
    if (!this.state) return;
    try {
      const before = [...this.state.facts];
      this.state = chooseOption(this.state, id);
      this.save();
      this.notifyFacts(before);
      if (this.state.dialogue) {
        const node = activeNode(this.state);
        this.world?.focusDialogue(node && node.speaker !== "mei" && node.speaker !== "narrator" ? node.speaker : null);
        this.renderGame();
      } else {
        this.afterDialogue();
      }
    } catch (error) {
      console.error(error);
      this.toast(this.tt("errorGeneric"));
    }
  }

  private rewind(): void {
    if (!this.state) return;
    this.hideToast();
    try {
      this.state = rewindDialogue(this.state);
      this.save();
      this.audio.rewind();
      this.root.classList.remove("is-rewinding");
      void this.root.offsetWidth;
      this.root.classList.add("is-rewinding");
      window.setTimeout(() => this.root.classList.remove("is-rewinding"), 900);
      const node = activeNode(this.state);
      this.world?.focusDialogue(node && node.speaker !== "mei" && node.speaker !== "narrator" ? node.speaker : null);
      this.renderGame();
    } catch (error) {
      console.error(error);
      this.toast(this.tt("errorGeneric"));
    }
  }

  private afterDialogue(): void {
    if (!this.state) return;
    this.world?.clearDialogueFocus();
    this.world?.setInputEnabled(true);
    const chapter = currentChapter(this.state);
    if (this.state.finalChoice) {
      this.world?.setInputEnabled(false);
      this.audio.chapter();
      this.renderEnding();
      return;
    }
    if (isChapterComplete(this.state, chapter)) {
      this.overlay = "chapterComplete";
      this.world?.setInputEnabled(false);
      this.renderGame();
      return;
    }
    this.refreshHotspots();
    this.renderGame();
    if (canRewind(this.state)) {
      this.toast(this.tt("rewindPrompt"));
    }
  }

  private refreshHotspots(): void {
    if (!this.state || !this.world) return;
    const chapter = currentChapter(this.state);
    this.world.setHotspots(availableHotspots(this.state, chapter));
    this.nearby = null;
  }

  private notifyFacts(before: string[]): void {
    if (!this.state) return;
    const added = this.state.facts.filter((fact) => !before.includes(fact));
    if (!added.length) return;
    const entry = JOURNAL.find((item) => item.requires?.facts?.some((fact) => added.includes(fact)));
    this.toast(interpolate(this.tt("factAdded"), { name: entry ? entry.title[this.lang] : this.tt("facts") }));
  }

  /* ----------------------------------------------------------- actions */

  private async onClick(event: Event): Promise<void> {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    try {
      switch (action) {
        case "lang":
          this.lang = this.lang === "it" ? "en" : "it";
          saveLang(this.lang);
          this.renderCurrent();
          break;
        case "sound":
          await this.toggleSound();
          break;
        case "new-game":
          clearState();
          this.state = initialState();
          this.overlay = null;
          this.renderIntro();
          void this.ensureAudio();
          break;
        case "continue": {
          const loaded = loadState();
          if (!loaded) {
            this.toast(this.tt("noSave"));
            break;
          }
          this.state = loaded;
          if (loaded.finalChoice) {
            this.setScreen("ending");
            this.renderEnding();
            break;
          }
          this.enterGame(false);
          break;
        }
        case "intro-next":
          this.renderTutorial();
          break;
        case "begin-story":
          if (!this.state) this.state = initialState();
          this.enterGame(true);
          break;
        case "begin-chapter":
          this.overlay = null;
          this.world?.setInputEnabled(true);
          this.renderGame();
          this.world?.clearDialogueFocus();
          break;
        case "next-chapter":
          if (!this.state) break;
          this.state = advanceChapter(this.state);
          this.save();
          this.loadWorld();
          this.overlay = "chapter";
          this.renderGame();
          break;
        case "interact":
          if (this.nearby?.dialogueId) this.openDialogue(this.nearby.dialogueId);
          break;
        case "rewind":
          this.rewind();
          break;
        case "rewind-last":
          this.rewind();
          break;
        case "advance":
          this.advance();
          break;
        case "choice": {
          const id = target.dataset.id;
          if (id) this.choose(id);
          break;
        }
        case "journal":
          this.hideToast();
          this.overlay = "journal";
          this.world?.setInputEnabled(false);
          this.renderGame();
          break;
        case "menu":
          this.hideToast();
          this.overlay = "menu";
          this.world?.setInputEnabled(false);
          this.renderGame();
          break;
        case "help":
          this.hideToast();
          this.overlay = "help";
          this.world?.setInputEnabled(false);
          this.renderGame();
          break;
        case "close-overlay":
          this.overlay = null;
          this.world?.setInputEnabled(!this.state?.dialogue);
          this.renderCurrent();
          break;
        case "restart":
          if (window.confirm(this.tt("restartConfirm"))) {
            clearState();
            this.state = initialState();
            this.overlay = null;
            this.screen = "intro";
            this.world?.clearDialogueFocus();
            this.renderIntro();
          }
          break;
        case "to-title":
          this.save();
          this.overlay = null;
          this.world?.setInputEnabled(false);
          this.world?.clearDialogueFocus();
          this.renderTitle();
          break;
        case "replay":
          clearState();
          this.state = initialState();
          this.overlay = null;
          this.renderIntro();
          break;
        case "share":
          await this.shareEnding();
          break;
        case "copy":
          await this.copyEnding();
          break;
        case "download":
          await this.downloadEnding();
          break;
        case "about":
          this.overlay = "help";
          this.renderTitle();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      this.toast(this.tt("errorGeneric"));
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (this.screen === "title" && key === "enter") {
      const button = this.ui.querySelector<HTMLButtonElement>('[data-action="continue"]') ?? this.ui.querySelector<HTMLButtonElement>('[data-action="new-game"]');
      button?.click();
      return;
    }
    if (this.screen === "title" && key === "escape" && this.overlay) {
      this.overlay = null;
      this.renderTitle();
      return;
    }
    if (this.screen !== "game" || !this.state) return;
    if (key === "escape") {
      if (this.state.dialogue) return;
      if (this.overlay) {
        this.overlay = null;
        this.world?.setInputEnabled(!this.state.dialogue);
        this.renderGame();
      } else {
        this.overlay = "menu";
        this.world?.setInputEnabled(false);
        this.renderGame();
      }
      return;
    }
    if (this.state.dialogue) {
      if (key === "r") this.rewind();
      if ((key === " " || key === "enter") && !activeNode(this.state)?.choices?.length) this.advance();
      return;
    }
    if (key === "j") {
      if (this.overlay === "journal") {
        this.overlay = null;
        this.world?.setInputEnabled(!this.state.dialogue);
        this.renderGame();
      } else {
        this.overlay = "journal";
        this.world?.setInputEnabled(false);
        this.renderGame();
      }
      return;
    }
    if (key === "e" && this.nearby?.dialogueId && !this.overlay) this.openDialogue(this.nearby.dialogueId);
    if (key === "r" && canRewind(this.state) && !this.overlay) this.rewind();
  }

  private updatePrompt(): void {
    const prompt = this.ui.querySelector<HTMLElement>("#prompt");
    if (!prompt) return;
    const button = this.ui.querySelector<HTMLButtonElement>("#interact-button");
    if (button) button.disabled = !this.nearby || Boolean(this.overlay) || Boolean(this.state?.dialogue);
    if (!this.nearby || this.overlay || this.state?.dialogue) {
      prompt.innerHTML = "";
      prompt.classList.remove("is-visible");
      return;
    }
    const label = this.nearby.label[this.lang];
    const verb =
      this.nearby.kind === "sit"
        ? this.tt("sitWith")
        : this.nearby.kind === "look"
          ? this.tt("lookAt")
          : this.tt("interactWith");
    prompt.innerHTML = `<kbd>E</kbd><span>${esc(interpolate(verb, { name: label }))}</span>`;
    prompt.classList.add("is-visible");
  }

  private bindJoystick(): void {
    const joystick = this.ui.querySelector<HTMLElement>("#joystick");
    const knob = this.ui.querySelector<HTMLElement>("#joystick-knob");
    if (!joystick || !knob) return;
    const move = (event: PointerEvent): void => {
      if (this.joystickPointer !== event.pointerId) return;
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const radius = rect.width * 0.38;
      const distance = Math.hypot(dx, dy);
      const scale = distance > radius ? radius / distance : 1;
      const x = (dx * scale) / radius;
      const y = (-dy * scale) / radius;
      knob.style.transform = `translate(${x * radius}px, ${-y * radius}px)`;
      this.world?.setJoystick(x, y);
    };
    const stop = (event?: PointerEvent): void => {
      if (event && event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      knob.style.transform = "translate(0, 0)";
      this.world?.setJoystick(0, 0);
    };
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      move(event);
    });
    joystick.addEventListener("pointermove", move);
    joystick.addEventListener("pointerup", stop);
    joystick.addEventListener("pointercancel", stop);
  }

  /* ------------------------------------------------------------ loop */

  private startLoop(): void {
    if (this.raf) return;
    this.lastTime = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      if (this.screen === "game" && this.world) {
        this.world.update(this.overlay ? 0 : dt);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /* ----------------------------------------------------------- ending */

  private endingText(ending: Ending): string {
    return `${this.tt("shareText")
      .replace("{title}", ending.title[this.lang])
      .replace("{body}", ending.body[this.lang])}\n${this.tt("shareCta")} ${window.location.origin}${window.location.pathname}`;
  }

  private async shareEnding(): Promise<void> {
    if (!this.state) return;
    const ending = endingFor(this.state);
    if (!ending) return;
    const text = this.endingText(ending);
    if (navigator.share) {
      try {
        await navigator.share({ title: ending.title[this.lang], text, url: window.location.href });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    const ok = await this.copyText(text);
    this.toast(ok ? this.tt("shareCopied") : this.tt("shareUnsupported"));
  }

  private async copyEnding(): Promise<void> {
    if (!this.state) return;
    const ending = endingFor(this.state);
    if (!ending) return;
    const ok = await this.copyText(this.endingText(ending));
    this.toast(ok ? this.tt("copied") : this.tt("shareUnsupported"));
  }

  private async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  private async downloadEnding(): Promise<void> {
    if (!this.state) return;
    const ending = endingFor(this.state);
    if (!ending) return;
    const width = 1080;
    const height = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1c24";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 42, width - 84, height - 84);
    ctx.strokeStyle = "rgba(242,193,94,.25)";
    ctx.strokeRect(58, 58, width - 116, height - 116);
    ctx.fillStyle = "#f2c15e";
    ctx.font = "600 22px Georgia, serif";
    ctx.fillText(this.tt("appName"), 92, 118);
    ctx.fillStyle = "#e9dfc7";
    ctx.font = "700 76px Georgia, serif";
    const titleWords = ending.title[this.lang].split(" ");
    let line = "";
    let y = 240;
    for (const word of titleWords) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > 880 && line) {
        ctx.fillText(line, 92, y);
        line = word;
        y += 82;
      } else line = test;
    }
    if (line) ctx.fillText(line, 92, y);
    ctx.fillStyle = "#9fd7df";
    ctx.font = "italic 26px Georgia, serif";
    ctx.fillText(ending.kicker[this.lang], 94, y + 60);
    ctx.fillStyle = "#d8d2c2";
    ctx.font = "500 24px system-ui, sans-serif";
    let textY = y + 118;
    const words = ending.body[this.lang].split(" ");
    line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > 880 && line) {
        ctx.fillText(line, 94, textY);
        line = word;
        textY += 34;
      } else line = test;
    }
    if (line) ctx.fillText(line, 94, textY);
    textY += 60;
    ctx.fillStyle = "#f2c15e";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(this.tt("epilogue").toUpperCase(), 94, textY);
    textY += 36;
    ctx.fillStyle = "#cfc8b8";
    ctx.font = "500 21px system-ui, sans-serif";
    for (const epilogue of ending.epilogue) {
      const epWords = epilogue[this.lang].split(" ");
      line = "";
      for (const word of epWords) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > 880 && line) {
          ctx.fillText(line, 94, textY);
          line = word;
          textY += 30;
        } else line = test;
      }
      if (line) {
        ctx.fillText(line, 94, textY);
        textY += 42;
      }
    }
    ctx.fillStyle = "#8fa4a4";
    ctx.font = "500 18px system-ui, sans-serif";
    ctx.fillText(interpolate(this.tt("endingStats"), { facts: this.state.facts.length, rewinds: this.state.rewinds }), 94, 1230);
    ctx.fillText(this.tt("creditsFoot"), 94, 1270);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = interpolate(this.tt("downloadName"), { ending: ending.id });
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    this.toast(this.tt("downloadDone"));
  }

  /* ----------------------------------------------------------- helpers */

  private tt(key: Parameters<typeof t>[1]): string {
    return t(this.lang, key);
  }

  private toast(message: string): void {
    const element = this.root.querySelector<HTMLElement>("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => element.classList.remove("show"), 3200);
  }

  private hideToast(): void {
    this.root.querySelector<HTMLElement>("#toast")?.classList.remove("show");
    window.clearTimeout(this.toastTimer);
  }

}
