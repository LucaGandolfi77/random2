import { COMUNI, SNAPSHOT_META, getComune } from "../data/comuni";
import { eventFact, metricRawFact, policyFact } from "../data/evidence";
import { policyById } from "../data/policies";
import { currentEvent, currentHand, createRun, finalReport, initialMetrics, axisScores, playPolicy, resolveEvent, skipPolicy } from "../game/engine";
import { clearRun, loadLang, loadRun, saveLang, saveRun } from "../game/save";
import { SOURCES, SOURCE_ORDER, type SourceId } from "../data/sources";
import {
  FAMILY_ACCENT,
  FAMILY_LABEL,
  FAMILY_LONG,
  FAMILY_METRICS,
  METRIC_LABEL,
  fmtNumber,
  fmtSigned,
  interpolate,
  t
} from "../data/strings";
import type { Bilancio, ComuneData, Family, Lang, Metrics, Policy, RunState } from "../data/types";
import { renderDiorama } from "./diorama";
import { copyReport, downloadReportCard, shareReport } from "./bilancio";

type Screen = "home" | "game" | "report";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function familyClass(family: Family): string {
  return `family-${family}`;
}

function sourceChip(id: SourceId): string {
  const entry = SOURCES[id];
  return `<span class="source-chip" title="${esc(entry.name)} · ${esc(entry.license)} · ${esc(entry.extracted)}">${esc(entry.short)}</span>`;
}

function effectChips(effects: Partial<Metrics>, lang: Lang, max = 4): string {
  const entries = Object.entries(effects)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
    .slice(0, max);
  return entries
    .map(([key, value]) => {
      const metric = key as keyof typeof METRIC_LABEL;
      const delta = value as number;
      return `<span class="effect ${delta > 0 ? "effect-pos" : "effect-neg"}">${fmtSigned(delta, lang)} ${esc(METRIC_LABEL[metric][lang])}</span>`;
    })
    .join("");
}

function axisName(key: Family, lang: Lang): string {
  return FAMILY_LABEL[key][lang];
}

function sourceLine(ids: SourceId[]): string {
  const unique = [...new Set(ids)];
  return unique.map((id) => esc(SOURCES[id].short)).join(" · ");
}

export class App {
  private readonly root: HTMLElement;
  private lang: Lang;
  private screen: Screen = "home";
  private comune: ComuneData | null = null;
  private run: RunState | null = null;
  private report: Bilancio | null = null;
  private toastTimer: number | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    this.lang = loadLang();
    this.root.addEventListener("click", (event) => {
      void this.onClick(event);
    });
  }

  start(): void {
    this.render();
  }

  private tt(key: Parameters<typeof t>[1]): string {
    return t(this.lang, key);
  }

  private save(): void {
    if (this.comune && this.run) saveRun(this.comune.identity.istat, this.run);
  }

  private render(): void {
    document.documentElement.lang = this.lang;
    if (this.screen === "game" && this.run && this.run.status === "finished") {
      this.screen = "report";
      this.report = finalReport(this.run);
    }
    if (this.screen === "report") {
      this.root.innerHTML = this.renderReport();
    } else if (this.screen === "game") {
      this.root.innerHTML = this.renderGame();
      if (this.run?.status === "event") {
        window.setTimeout(() => {
          document.querySelector<HTMLButtonElement>(".event-choice:not([disabled])")?.focus();
        }, 40);
      }
    } else {
      this.root.innerHTML = this.renderHome();
    }
    this.root.insertAdjacentHTML("beforeend", `<div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  }

  private async onClick(event: Event): Promise<void> {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    try {
      switch (action) {
        case "lang":
          event.preventDefault();
          this.lang = this.lang === "it" ? "en" : "it";
          saveLang(this.lang);
          this.render();
          break;
        case "choose-comune": {
          const id = target.dataset.id;
          const comune = id ? getComune(id) : undefined;
          if (!comune) throw new Error(this.tt("errorNoComune"));
          this.comune = comune;
          this.run = createRun(comune, Date.now());
          this.report = null;
          this.save();
          this.screen = "game";
          this.render();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "resume": {
          const saved = loadRun();
          if (!saved) {
            this.render();
            break;
          }
          const comune = getComune(saved.comuneId);
          if (!comune) throw new Error(this.tt("errorNoComune"));
          this.comune = comune;
          this.run = saved.run;
          if (saved.run.status === "finished") {
            this.report = finalReport(saved.run);
            this.screen = "report";
          } else {
            this.report = null;
            this.screen = "game";
          }
          this.render();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "home":
          this.screen = "home";
          this.render();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "policy": {
          const id = target.dataset.id;
          if (!id || !this.run) break;
          this.run = playPolicy(this.run, id);
          this.save();
          this.render();
          break;
        }
        case "skip":
          if (!this.run) break;
          this.run = skipPolicy(this.run);
          this.save();
          this.render();
          break;
        case "event-choice": {
          const index = Number(target.dataset.index);
          if (!this.run || Number.isNaN(index)) break;
          this.run = resolveEvent(this.run, index);
          this.save();
          if (this.run.status === "finished") {
            this.report = finalReport(this.run);
            this.screen = "report";
          }
          this.render();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "restart": {
          if (!this.comune) break;
          if (!window.confirm(this.tt("restartConfirm"))) break;
          this.run = createRun(this.comune, Date.now());
          this.report = null;
          this.save();
          this.screen = "game";
          this.render();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "share": {
          if (!this.report) break;
          const result = await shareReport(this.report, this.lang);
          this.toast(result === "shared" ? this.tt("share") : result === "copied" ? this.tt("copied") : this.tt("shareUnsupported"));
          break;
        }
        case "copy": {
          if (!this.report) break;
          const ok = await copyReport(this.report, this.lang);
          this.toast(ok ? this.tt("copied") : this.tt("shareUnsupported"));
          break;
        }
        case "download": {
          if (!this.report) break;
          await downloadReportCard(this.report, this.lang);
          this.toast(this.tt("downloadCard"));
          break;
        }
        case "new-run": {
          clearRun();
          this.render();
          break;
        }
        case "scroll-comuni":
          document.getElementById("comuni")?.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      this.toast(error instanceof Error ? error.message : this.tt("errorGeneric"));
    }
  }

  private toast(message: string): void {
    const element = document.getElementById("toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => element.classList.remove("show"), 2800);
  }

  private brand(): string {
    return `<a class="brand" href="#" data-action="home" aria-label="${esc(this.tt("appName"))}">
      <span class="brand-mark">C<span>50</span></span>
      <span class="brand-text">${esc(this.tt("appName"))}<small>${esc(this.tt("tagline"))}</small></span>
    </a>`;
  }

  private topbar(extra = ""): string {
    return `<header class="topbar">
      ${this.brand()}
      <div class="topbar-actions">
        ${extra}
        <button class="lang-button" data-action="lang" type="button" aria-label="${esc(this.tt("language"))}">
          ${this.lang === "it" ? "EN" : "IT"}
        </button>
      </div>
    </header>`;
  }

  private renderHome(): string {
    const saved = loadRun();
    const savedComune = saved ? getComune(saved.comuneId) : undefined;
    const pilot = COMUNI[0];
    const hero = renderDiorama(pilot, initialMetrics(pilot), {
      year: 2050,
      uid: "hero",
      label: this.tt("dioramaLabel").replace("{name}", pilot.identity.name).replace("{year}", "2050")
    });
    const resume = saved && savedComune
      ? `<button class="button button-ghost resume-button" data-action="resume" type="button">
          <span class="resume-dot"></span>
          ${esc(
            interpolate(this.tt(saved.run.status === "finished" ? "resumeReport" : "resumeAt"), {
              name: savedComune.identity.name,
              year: saved.run.year
            })
          )}
        </button>`
      : "";

    const cards = COMUNI.map((comune, index) => this.comuneCard(comune, index)).join("");
    const sources = SOURCE_ORDER.map((id) => {
      const entry = SOURCES[id];
      return `<a class="source-row" href="${esc(entry.url)}" target="_blank" rel="noreferrer">
        <span class="source-dot"></span>
        <span><b>${esc(entry.name)}</b><small>${esc(entry.producer)} · ${esc(entry.license)}</small></span>
        <span class="source-arrow">↗</span>
      </a>`;
    }).join("");

    return `<div class="app-shell">
      ${this.topbar(`<a class="text-link" href="#fonti">${esc(this.tt("sources"))}</a>`)}
      <main>
        <section class="hero">
          <div class="hero-copy">
            <p class="kicker"><span class="kicker-line"></span>${esc(this.tt("heroKicker"))}</p>
            <h1>${esc(this.tt("heroTitleA"))}<br><em>${esc(this.tt("heroTitleB"))}</em></h1>
            <p class="lead">${esc(this.tt("heroLead"))}</p>
            <div class="hero-actions">
              <button class="button button-primary" data-action="scroll-comuni" type="button">${esc(this.tt("chooseComune"))} <span>→</span></button>
              ${resume}
            </div>
            <div class="hero-badges">
              <span>${esc(this.tt("sixBadge"))}</span>
              <span>${esc(this.tt("turnBadge"))}</span>
              <span>${esc(this.tt("policyBadge"))}</span>
              <span>${esc(this.tt("eventBadge"))}</span>
              <span>${esc(this.tt("offlineBadge"))}</span>
            </div>
          </div>
          <figure class="hero-figure">
            ${hero}
            <figcaption><span>${esc(pilot.identity.name)} · 2050</span><small>${esc(this.tt("mapNot"))}</small></figcaption>
          </figure>
        </section>

        <section class="section" id="comuni">
          <div class="section-head">
            <div>
              <p class="kicker"><span class="kicker-line"></span>${esc(this.tt("sixBadge"))}</p>
              <h2>${esc(this.tt("sixCities"))}</h2>
            </div>
            <p>${esc(this.tt("sixCitiesLead"))}</p>
          </div>
          <div class="comune-grid">${cards}</div>
        </section>

        <section class="section how-section">
          <div class="section-head">
            <div>
              <p class="kicker"><span class="kicker-line"></span>${esc(this.tt("method"))}</p>
              <h2>${esc(this.tt("howItWorks"))}</h2>
            </div>
            <p>${esc(this.tt("landingNote"))}</p>
          </div>
          <div class="how-grid">
            ${this.howCard("01", this.tt("how1Title"), this.tt("how1Body"))}
            ${this.howCard("02", this.tt("how2Title"), this.tt("how2Body"))}
            ${this.howCard("03", this.tt("how3Title"), this.tt("how3Body"))}
          </div>
        </section>

        <section class="section method-section" id="fonti">
          <div class="method-copy">
            <p class="kicker"><span class="kicker-line"></span>${esc(this.tt("dataReal"))}</p>
            <h2>${esc(this.tt("sources"))}</h2>
            <p>${esc(this.tt("dataRealLead"))}</p>
            <div class="method-note">
              <b>${esc(this.tt("method"))}</b>
              <p>${esc(this.tt("methodBody"))}</p>
            </div>
            <div class="method-note">
              <b>${esc(this.tt("privacyTitle"))}</b>
              <p>${esc(this.tt("privacy"))} ${esc(this.tt("offline"))} · ${esc(this.tt("installHint"))}</p>
            </div>
            <p class="snapshot-line">${esc(this.tt("snapshotDate").replace("{date}", SNAPSHOT_META.extractionDate))} · ${esc(this.tt("sourceCount").replace("{n}", String(SOURCE_ORDER.length)))}</p>
          </div>
          <div class="source-list">${sources}</div>
        </section>

        <section class="disclaimer-band">
          <p><span class="stamp">${esc(this.tt("dataCaveat"))}</span> ${esc(this.tt("disclaimer"))}</p>
        </section>
      </main>
      <footer class="footer">
        <span>${esc(this.tt("appName"))} · ${esc(this.tt("tagline"))}</span>
        <span>${esc(this.tt("footer"))}</span>
      </footer>
    </div>`;
  }

  private howCard(number: string, title: string, body: string): string {
    return `<article class="how-card">
      <span class="how-number">${number}</span>
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
    </article>`;
  }

  private comuneCard(comune: ComuneData, index: number): string {
    const metrics = initialMetrics(comune);
    const axes = axisScores(metrics);
    const fact1 = interpolate(this.tt("factPopulation"), {
      pop: fmtNumber(comune.population.total, this.lang),
      age: comune.population.medianAge === null ? this.tt("noData") : fmtNumber(comune.population.medianAge, this.lang, 1)
    });
    const fact2 = interpolate(this.tt("factEnvironment"), {
      soil: comune.environment.soilConsumptionPct === null ? this.tt("noData") : fmtNumber(comune.environment.soilConsumptionPct, this.lang, 1),
      recycling: comune.environment.recyclingPct === null ? this.tt("noData") : fmtNumber(comune.environment.recyclingPct, this.lang, 1)
    });
    const fact3 = interpolate(this.tt("factServices"), {
      ftth: comune.services.ftthPct === null ? this.tt("noData") : fmtNumber(comune.services.ftthPct, this.lang, 1),
      pnrr: comune.services.pnrrPerCapita === null ? this.tt("noData") : fmtNumber(comune.services.pnrrPerCapita, this.lang)
    });
    const diorama = renderDiorama(comune, metrics, {
      year: 2026,
      compact: true,
      uid: `card-${comune.identity.istat}`
    });
    return `<article class="comune-card" style="--comune-accent:${comune.palette.accent}; --comune-sky:${comune.palette.sky}; --comune-index:${index}">
      <div class="comune-diorama">${diorama}</div>
      <div class="comune-body">
        <div class="comune-head">
          <div>
            <p class="comune-meta">${esc(comune.identity.province)} · ${esc(comune.identity.region)}</p>
            <h3>${esc(comune.identity.name)}</h3>
          </div>
          ${index === 0 ? `<span class="pilot-badge">${esc(this.tt("pilotBadge"))}</span>` : ""}
        </div>
        <p class="comune-tagline">${esc(comune.tagline[this.lang])}</p>
        <div class="comune-facts">
          <span>${esc(fact1)}</span>
          <span>${esc(fact2)}</span>
          <span>${esc(fact3)}</span>
        </div>
        <div class="comune-axis-row">
          ${(Object.keys(axes) as Family[]).map((key) => `<span class="mini-axis ${familyClass(key)}"><b>${fmtNumber(axes[key], this.lang)}</b> ${esc(FAMILY_LABEL[key][this.lang])}</span>`).join("")}
        </div>
        <div class="comune-foot">
          <span class="source-line">${esc(sourceLine([comune.sourceByMetric.giovani, comune.sourceByMetric.suolo, comune.sourceByMetric.digitale]))}</span>
          <button class="button button-small" data-action="choose-comune" data-id="${esc(comune.identity.istat)}" type="button">${esc(interpolate(this.tt("playComune"), { name: comune.identity.name }))} <span>→</span></button>
        </div>
      </div>
    </article>`;
  }

  private renderGame(): string {
    if (!this.run || !this.comune) return this.renderHome();
    if (this.run.status === "finished") {
      this.report = finalReport(this.run);
      return this.renderReport();
    }
    const run = this.run;
    const comune = this.comune;
    const axes = axisScores(run.metrics);
    const baselineAxes = axisScores(run.baselineMetrics);
    const diorama = renderDiorama(comune, run.metrics, {
      year: run.year,
      label: interpolate(this.tt("dioramaLabel"), { name: comune.identity.name, year: run.year })
    });
    const timeline = [2026, 2032, 2038, 2044, 2050].map((year, index) => {
      const active = index + 1 === run.turn;
      const passed = index + 1 < run.turn;
      return `<div class="timeline-step ${active ? "is-active" : ""} ${passed ? "is-passed" : ""}">
        <span class="timeline-dot"></span>
        <b>${year}</b>
        <small>${index === 0 ? this.tt("realData") : this.tt("scenario")}</small>
      </div>`;
    }).join("");
    const axisCards = (Object.keys(axes) as Family[]).map((key) => {
      const final = axes[key];
      const delta = final - baselineAxes[key];
      return `<div class="axis-chip ${familyClass(key)}">
        <span>${esc(axisName(key, this.lang))}</span>
        <b>${fmtNumber(final, this.lang, 1)}</b>
        <small class="${delta >= 0 ? "delta-pos" : "delta-neg"}">${fmtSigned(delta, this.lang, 1)}</small>
      </div>`;
    }).join("");

    const panel = run.status === "policy" ? this.renderPolicyPanel(run) : this.renderEventPanel(run);
    const modal = run.status === "event" ? this.renderEventModal(run) : "";
    return `<div class="app-shell game-shell">
      ${this.topbar(`<button class="text-link back-link" data-action="home" type="button"><span class="back-arrow">←</span><span class="back-label">${esc(this.tt("backHome"))}</span></button>`)}
      <main class="game-main">
        <section class="stage">
          <div class="stage-topline">
            <span class="stage-kicker">${esc(interpolate(this.tt("turnOf"), { turn: run.turn, year: run.year }))}</span>
            <span class="stage-credit">${esc(this.tt("credits"))}: <b>${run.credits}</b></span>
          </div>
          <figure class="stage-figure">
            ${diorama}
            <figcaption><span>${esc(comune.identity.name)} · ${run.year}</span><small>${esc(this.tt("mapNot"))}</small></figcaption>
          </figure>
          <div class="timeline">${timeline}</div>
          <div class="axis-strip">${axisCards}</div>
          <p class="stage-note">${esc(this.tt("legendBody"))}</p>
        </section>
        <section class="panel">${panel}</section>
      </main>
      ${modal}
    </div>`;
  }

  private renderPolicyPanel(run: RunState): string {
    const hand = currentHand(run);
    const cards = hand.length
      ? hand.map((policy) => this.policyCard(policy, run.credits)).join("")
      : `<p class="empty-hand">${esc(this.tt("emptyHand"))}</p>`;
    return `<div class="panel-head">
        <p class="kicker"><span class="kicker-line"></span>${esc(interpolate(this.tt("turnOf"), { turn: run.turn, year: run.year }))}</p>
        <h2>${esc(this.tt("policyHand"))}</h2>
        <p>${esc(this.tt("policyLead"))}</p>
      </div>
      <div class="policy-hand">${cards}</div>
      <div class="panel-footer">
        <button class="button button-ghost skip-button" data-action="skip" type="button">${esc(this.tt("skipPolicy"))} <span>+2</span></button>
        <p>${esc(this.tt("skipHint"))}</p>
      </div>
      ${this.renderMetricDetails(run)}
      ${this.renderGameSources()}`;
  }

  private renderEventPanel(run: RunState): string {
    const chosen = run.pendingPolicyId ? policyById(run.pendingPolicyId) : null;
    return `<div class="panel-head">
        <p class="kicker"><span class="kicker-line"></span>${esc(interpolate(this.tt("eventYear"), { year: run.year }))}</p>
        <h2>${esc(this.tt("event"))}</h2>
        <p>${esc(this.tt("eventLead"))}</p>
      </div>
      <div class="chosen-summary">
        <span class="chosen-label">${esc(this.tt(chosen ? "policyChosen" : "skipPolicy"))}</span>
        <b>${chosen ? esc(chosen.title[this.lang]) : esc(this.tt("skipPolicy"))}</b>
      </div>
      ${this.renderMetricDetails(run)}
      ${this.renderGameSources()}`;
  }

  private renderGameSources(): string {
    if (!this.comune) return "";
    const items = this.comune.sources
      .map((id) => {
        const entry = SOURCES[id];
        return `<li><a href="${esc(entry.url)}" target="_blank" rel="noreferrer">${esc(entry.name)}</a><small>${esc(entry.license)} · ${esc(entry.extracted)}</small></li>`;
      })
      .join("");
    return `<details class="game-sources">
      <summary>${esc(this.tt("sources"))} <span>+</span></summary>
      <ul>${items}</ul>
      <p>${esc(this.tt("disclaimer"))}</p>
    </details>`;
  }

  private policyCard(policy: Policy, credits: number): string {
    const affordable = policy.cost <= credits;
    return `<article class="policy-card ${familyClass(policy.family)}" style="--family:${FAMILY_ACCENT[policy.family]}">
      <div class="policy-top">
        <span class="family-tag">${esc(FAMILY_LABEL[policy.family][this.lang])}</span>
        <span class="cost-tag">${policy.cost === 0 ? esc(this.tt("free")) : `${policy.cost} ${esc(this.tt(policy.cost === 1 ? "credit" : "creditsShort"))}`}</span>
      </div>
      <h3>${esc(policy.title[this.lang])}</h3>
      <p class="policy-blurb">${esc(policy.blurb[this.lang])}</p>
      <div class="effect-row">${effectChips(policy.effects, this.lang)}</div>
      <p class="evidence-line"><b>${esc(this.tt("policyEvidence"))}</b> ${esc(policyFact(policy.id, this.comune!, this.lang))}</p>
      <div class="policy-foot">
        ${sourceChip(policy.source)}
        <button class="button button-play" data-action="policy" data-id="${esc(policy.id)}" type="button" ${affordable ? "" : "disabled"}>
          ${affordable ? `${esc(this.tt("play"))} <span>→</span>` : esc(this.tt("notEnoughCredits"))}
        </button>
      </div>
    </article>`;
  }

  private renderEventModal(run: RunState): string {
    const event = currentEvent(run);
    const choices = event.choices.map((choice, index) => {
      const affordable = choice.cost <= run.credits;
      const costLabel = choice.cost > 0 ? interpolate(this.tt("choiceCost"), { cost: choice.cost }) : choice.gain > 0 ? interpolate(this.tt("choiceGain"), { gain: choice.gain }) : this.tt("noCost");
      return `<button class="event-choice ${affordable ? "" : "is-disabled"}" data-action="event-choice" data-index="${index}" type="button" ${affordable ? "" : "disabled"}>
        <span class="choice-top"><span class="choice-index">${String(index + 1).padStart(2, "0")}</span><span class="choice-cost">${esc(costLabel)}</span></span>
        <b>${esc(choice.label[this.lang])}</b>
        <small>${esc(choice.detail[this.lang])}</small>
        <span class="effect-row">${effectChips(choice.effects, this.lang, 4)}</span>
        <span class="choice-arrow">${affordable ? "→" : esc(this.tt("notEnoughCredits"))}</span>
      </button>`;
    }).join("");
    return `<div class="event-backdrop" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <article class="event-card">
        <div class="event-topline">
          <span class="event-kicker">${esc(interpolate(this.tt("eventYear"), { year: run.year }))}</span>
          <span class="event-credit">${esc(this.tt("credits"))}: <b>${run.credits}</b></span>
        </div>
        <h2 id="event-title">${esc(event.title[this.lang])}</h2>
        <p class="event-body">${esc(event.body[this.lang])}</p>
        <div class="event-evidence">
          <span class="evidence-stamp">${esc(this.tt("eventEvidence"))}</span>
          <p>${esc(eventFact(event.id, this.comune!, this.lang))}</p>
          ${sourceChip(event.source)}
        </div>
        <p class="event-prompt">${esc(this.tt("chooseResponse"))}</p>
        <div class="event-choices">${choices}</div>
      </article>
    </div>`;
  }

  private renderMetricDetails(run: RunState): string {
    const rows = (Object.keys(FAMILY_METRICS) as Family[]).map((family) => {
      const metrics = FAMILY_METRICS[family].map((metric) => {
        const source = this.comune?.sourceByMetric[metric];
        return `<div class="metric-row">
          <span class="metric-name">${esc(METRIC_LABEL[metric][this.lang])}<small>${esc(metricRawFact(metric, this.comune!, this.lang))}</small></span>
          <span class="metric-score">${fmtNumber(run.metrics[metric], this.lang, 1)}</span>
          ${source ? sourceChip(source) : ""}
        </div>`;
      }).join("");
      return `<details class="metric-group ${familyClass(family)}">
        <summary><span>${esc(FAMILY_LABEL[family][this.lang])}</span><b>${fmtNumber(axisScores(run.metrics)[family], this.lang, 1)}</b></summary>
        ${metrics}
      </details>`;
    }).join("");
    return `<details class="metric-details">
      <summary>${esc(this.tt("axisBreakdown"))} <span>+</span></summary>
      <div class="metric-details-body">${rows}</div>
    </details>`;
  }

  private renderReport(): string {
    const run = this.run;
    if (!run || run.status !== "finished") return this.renderHome();
    const report = this.report ?? finalReport(run);
    this.report = report;
    const comune = report.comune;
    const diorama = renderDiorama(comune, run.metrics, {
      year: 2050,
      uid: "report",
      label: interpolate(this.tt("dioramaLabel"), { name: comune.identity.name, year: 2050 })
    });
    const axes = report.axes.map((axis) => `<div class="report-axis ${familyClass(axis.key)}">
      <div class="report-axis-head"><span>${esc(FAMILY_LABEL[axis.key][this.lang])}</span><b>${fmtNumber(axis.final, this.lang, 1)}</b></div>
      <div class="report-bar">
        <span class="bar-baseline" style="width:${Math.max(0, Math.min(100, axis.baseline))}%"></span>
        <span class="bar-final" style="width:${Math.max(0, Math.min(100, axis.final))}%"></span>
      </div>
      <div class="report-axis-foot"><span>${esc(this.tt("baseline"))} ${fmtNumber(axis.baseline, this.lang, 1)}</span><span class="${axis.delta >= 0 ? "delta-pos" : "delta-neg"}">${fmtSigned(axis.delta, this.lang, 1)}</span></div>
    </div>`).join("");

    const policies = report.policies.length
      ? report.policies.map((policy) => `<li><span class="li-family ${familyClass(policy.family)}">${esc(FAMILY_LABEL[policy.family][this.lang])}</span><b>${esc(policy.title[this.lang])}</b><small>${esc(policyFact(policy.id, comune, this.lang))}</small></li>`).join("")
      : `<li class="empty-li">${esc(this.tt("reportNoPolicies"))}</li>`;
    const events = report.events.map(({ event, choiceIndex }) => `<li><b>${esc(event.title[this.lang])}</b><small>${esc(event.choices[choiceIndex].label[this.lang])}</small></li>`).join("");
    const sources = report.comune.sources.map((id) => `<li><a href="${esc(SOURCES[id].url)}" target="_blank" rel="noreferrer">${esc(SOURCES[id].name)}</a><small>${esc(SOURCES[id].license)} · ${esc(SOURCES[id].extracted)}</small></li>`).join("");
    const verdict = report.verdict[this.lang];
    const deltaClass = report.totalDelta >= 0 ? "delta-pos" : "delta-neg";

    return `<div class="app-shell report-shell">
      ${this.topbar(`<button class="text-link back-link" data-action="home" type="button"><span class="back-arrow">←</span><span class="back-label">${esc(this.tt("allComuni"))}</span></button>`)}
      <main class="report-main">
        <section class="report-hero">
          <div class="report-hero-copy">
            <p class="kicker"><span class="kicker-line"></span>${esc(this.tt("bilancio"))} · 2050</p>
            <h1>${esc(comune.identity.name)}<br><em>${esc(this.tt("bilancioTitle"))}</em></h1>
            <p class="lead">${esc(this.tt("bilancioLead"))}</p>
            <p class="report-verdict">${esc(verdict)}</p>
            <div class="report-best-worst">
              <span><b>${esc(this.tt("bestAxis"))}</b> ${esc(FAMILY_LONG[report.best][this.lang])}</span>
              <span><b>${esc(this.tt("worstAxis"))}</b> ${esc(FAMILY_LONG[report.worst][this.lang])}</span>
            </div>
          </div>
          <figure class="report-figure">${diorama}<figcaption><span>${esc(comune.identity.name)} · 2050</span><small>${esc(this.tt("mapNot"))}</small></figcaption></figure>
        </section>

        <section class="report-grid">
          <article class="score-card paper-card">
            <span class="card-label">${esc(this.tt("finalScore"))}</span>
            <div class="big-score">${fmtNumber(report.total, this.lang, 1)}<small>/100</small></div>
            <div class="score-delta ${deltaClass}">${fmtSigned(report.totalDelta, this.lang, 1)} <span>${esc(this.tt("vsBaseline"))}</span></div>
            <div class="score-meta">${esc(interpolate(this.tt("runSummary"), { policies: report.policies.length, events: report.events.length, credits: report.creditsSpent }))}</div>
          </article>
          <article class="population-card paper-card">
            <span class="card-label">${esc(this.tt("population2050"))}</span>
            <div class="population-number">${fmtNumber(report.population, this.lang)}</div>
            <div class="population-line">${esc(this.tt("baseline2050"))}: <b>${fmtNumber(report.baselinePopulation, this.lang)}</b></div>
            <div class="score-delta ${report.populationDelta >= 0 ? "delta-pos" : "delta-neg"}">${fmtSigned(report.populationDelta, this.lang)}</div>
          </article>
          <article class="axes-card paper-card">
            <span class="card-label">${esc(this.tt("axisBreakdown"))}</span>
            ${axes}
          </article>
          <article class="choices-card paper-card">
            <div class="choices-column">
              <span class="card-label">${esc(this.tt("reportPolicyList"))}</span>
              <ul class="report-list">${policies}</ul>
            </div>
            <div class="choices-column">
              <span class="card-label">${esc(this.tt("reportEventList"))}</span>
              <ul class="report-list">${events}</ul>
            </div>
          </article>
        </section>

        <section class="report-actions">
          <button class="button button-primary" data-action="share" type="button">${esc(this.tt("share"))} <span>↗</span></button>
          <button class="button button-ghost" data-action="download" type="button">${esc(this.tt("download"))}</button>
          <button class="button button-ghost" data-action="copy" type="button">${esc(this.tt("copy"))}</button>
          <button class="button button-ghost" data-action="restart" type="button">${esc(this.tt("restart"))}</button>
          <button class="button button-ghost" data-action="home" type="button">${esc(this.tt("playAgain"))}</button>
        </section>

        <section class="report-sources paper-card">
          <span class="card-label">${esc(this.tt("reportSources"))}</span>
          <ul class="source-report-list">${sources}</ul>
          <p class="disclaimer">${esc(this.tt("disclaimer"))}</p>
        </section>
      </main>
    </div>`;
  }

}
