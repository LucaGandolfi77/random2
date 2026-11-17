/* Machine Hunt — browser loop and DOM wiring. Lazily imported on first play. */
import {
  ARENA, UPGRADES, PLOTS, COMPANIONS, MODIFIERS, MISSIONS, SCHEMES, PALETTES,
  VILLAGERS, VILLAGE_ITEMS, BOUNTIES, GRID, BIOMES, MODES, CAMPAIGN_HUNTS,
  SKILLS, MATERIALS, GEAR, QUESTS, XP, STORY, SEASONS, JOBS, ACHIEVEMENTS, SEASON,
} from "./data.js";
import {
  loadSave, persistSave, statsFromSave, upgradeCost, buyUpgrade, buildPlot,
  unlockCompanion, selectCompanion, createHunt, stepHunt, finishHunt,
  dateKey, hasPlot, placeVillage, moveVillage, refreshBounty,
  xpForLevel, buySkill, canCraft, craftGear, equipGear,
  companionUpgradeCost, upgradeCompanionLevel, setParty,
  refreshSeason, dailyEvent, collectProduction, assignJob, storyChapterForHunt, applyStoryChoice,
  encodeChallenge, decodeChallenge, exportSave, importSave, prestigeSeason,
} from "./sim.js";
import { t } from "./i18n.js";
import { createRecorder, record as recordFrame, encodeReplay } from "./replay.js";
import { detectTier, qualityFor } from "./quality.js";
import { renderHub, renderHunt, setPalette, villageHitTest, cellRect } from "./render.js";
import { createInput } from "./input.js";
import { createAudio } from "./audio.js";
import { createEffects } from "./effects.js";
import { WEAPONS, STATUSES, STAMINA } from "./combat.js";

const $ = (selector, root = document) => root.querySelector(selector);

const TUTORIAL = [
  { title: "Drag to move", body: "Drag anywhere to move — the bow fires automatically at the nearest machine." },
  { title: "Tap or hold to charge", body: "A quick tap fires a piercing shot. Hold a little longer for a stronger one. Watch the blue ring fill." },
  { title: "Read the telegraph", body: "Rings and beams warn you before an attack lands. Keep moving, gather brick cores and survive three waves." },
];

export function startGame(options = {}) {
  const layer = $("#game-layer");
  const canvas = $("#game-canvas");
  const hubEl = $("#game-hub");
  const resultEl = $("#game-result");
  const pauseEl = $("#game-pause");
  const tutorialEl = $("#game-tutorial");
  const settingsEl = $("#game-settings");
  const storyEl = $("#game-story");
  const toastEl = $("#game-toast");
  const stickEl = $("#game-stick");
  const chargeEl = $("#game-charge");
  const a11yEl = $("#game-a11y");
  if (!layer || !canvas) return;

  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const ctx = canvas.getContext("2d");
  const audio = createAudio();
  const effects = createEffects();
  let reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
  effects.setReduced(reduced);
  const tier = detectTier();
  const quality = qualityFor(tier);
  effects.setQuality(quality.particles);
  if (!quality.effects) effects.setReduced(true);

  let save = loadSave();
  let hunt = null;
  let screen = "hub";
  let paused = false;
  let modal = null;
  let tutorialStep = 0;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let toastTimer = 0;
  let a11yClock = 0;
  let move = { dx: 0, dy: 0 };
  let pendingCharge = null;
  let pendingWeapon = null;
  let pendingDodge = false;
  let pendingUltimate = false;
  let gpChargeWasDown = false;
  let gpDodgeWasDown = false;
  let gpNextWasDown = false;
  let gpPauseWasDown = false;
  let acc = 0;
  let debugEl = null;
  let debugClock = 0;
  let dragItem = null;
  let dragCell = -1;
  let pendingStory = null;
  let prodTimer = 0;
  let recorder = null;
  let lastRender = 0;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("./game.css", import.meta.url).href;
  document.head.appendChild(css);

  setPalette(save.game.palette);
  save = refreshSeason(refreshBounty(save));
  const offline = collectProduction(save);
  save = offline.save;
  const offlineGained = offline.gained;
  persistSave(save);

  if (location.search.includes("debug=1")) {
    debugEl = document.createElement("div");
    debugEl.className = "game-debug";
    debugEl.setAttribute("aria-hidden", "true");
    canvas.parentElement.appendChild(debugEl);
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, 1800);
  }

  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(w / ARENA.width, h / ARENA.height);
    ctx.setTransform(
      dpr * scale, 0, 0, dpr * scale,
      dpr * (w - ARENA.width * scale) / 2,
      dpr * (h - ARENA.height * scale) / 2
    );
  }
  window.addEventListener("resize", fitCanvas, sig);

  const input = createInput(canvas, {
    scheme: () => (screen === "hunt" ? save.game.scheme : "none"),
    sensitivity: () => save.game.sensitivity,
    joystick: stickEl,
    chargeButton: chargeEl,
    onMove: (dx, dy) => { move = { dx, dy }; },
    onChargedShot: (charge) => { pendingCharge = charge; },
    onPause: () => togglePause(),
  });

  $$weaponButtons().forEach((btn) =>
    btn.addEventListener("click", () => { pendingWeapon = btn.dataset.weapon; }, sig)
  );

  function $$weaponButtons() {
    return [...document.querySelectorAll(".weapon-btn")];
  }

  function applyControls() {
    const scheme = save.game.scheme;
    stickEl.hidden = scheme === "drag";
    chargeEl.hidden = scheme === "drag";
    layer.classList.toggle("game-onehand", scheme === "onehand");
    const hint = $("#game-hint");
    if (hint) {
      hint.textContent = scheme === "drag"
        ? "DRAG TO MOVE · AUTO-FIRE · TAP/HOLD FOR CHARGED SHOT"
        : "STICK TO MOVE · AUTO-FIRE · ⚡ FOR CHARGED SHOT";
    }
  }

  /* ------------------------------------------------------------------ HUD */

  function updateHud() {
    $("#game-level").textContent = hunt?.mode === "daily"
      ? `DAILY ${dateKey().slice(5)}`
      : hunt?.mode === "endless" ? `ENDLESS ${hunt.wave || 1}`
      : hunt?.mode === "bossrush" ? `BOSS ${hunt.bossRushIndex || 1}/3`
      : `HUNT ${save.huntLevel}`;
    $("#game-cores").textContent = `◼ ${save.cores}`;
    $("#game-biome").textContent = (BIOMES[hunt?.biome]?.label || "JUNGLE")
      .split(" ")[0].toUpperCase();
    $("#game-companion").textContent = save.activeCompanion
      ? COMPANIONS[save.activeCompanion].label.toUpperCase() : "SOLO";
    $("#game-score").textContent = hunt ? `SCORE ${hunt.score}` : `BEST ${save.bestScore}`;
    const hearts = $("#game-hearts");
    if (hearts) {
      const max = hunt ? hunt.player.maxHp : statsFromSave(save).maxHp;
      const hp = hunt ? hunt.player.hp : max;
      hearts.innerHTML = Array.from({ length: max }, (_, i) =>
        `<span class="${i < hp ? "" : "empty"}">♥</span>`).join("");
    }
    const combat = hunt?.combat;
    const bar = $("#stamina-bar");
    if (bar) bar.style.width = `${combat ? (combat.stamina / STAMINA.max) * 100 : 100}%`;
    $$weaponButtons().forEach((btn) =>
      btn.classList.toggle("is-active", !!combat && btn.dataset.weapon === combat.weapon)
    );
    const icons = $("#status-icons");
    if (icons) {
      const statuses = [];
      if (combat?.dodgeTime > 0) statuses.push(["DODGE", "#a4d007"]);
      if (hunt?.player?.invuln > 0.1) statuses.push(["I-FRAME", "#66c0f4"]);
      if (hunt?.enemies) {
        for (const key of Object.keys(STATUSES)) {
          if (hunt.enemies.some((e) => e.statuses?.[key] > 0)) {
            statuses.push([STATUSES[key].label.toUpperCase(), STATUSES[key].color]);
          }
        }
      }
      icons.innerHTML = statuses.slice(0, 3).map(([label, color]) =>
        `<span class="status-chip" style="color:${color}">${label}</span>`).join("");
    }
  }

  function announceA11y() {
    if (!a11yEl || screen !== "hunt" || !hunt) return;
    a11yEl.textContent = `Score ${hunt.score}, health ${hunt.player.hp} of ${hunt.player.maxHp}, wave ${hunt.wave}`;
  }

  /* ------------------------------------------------------------------ hub */

  function hubCard({ key, label, blurb, action, state }) {
    const lvl = action === "upgrade" ? save.upgrades[key] : 0;
    let button;
    if (state === "done") {
      button = `<button type="button" class="done" data-action="noop" disabled>Built</button>`;
    } else if (state === "selected") {
      button = `<button type="button" class="selected" data-action="select" data-key="${key}">Active</button>`;
    } else if (state === "unlocked") {
      button = `<button type="button" data-action="select" data-key="${key}">Bring along</button>`;
    } else {
      button = `<button type="button" data-action="${action}" data-key="${key}">${state} ◼</button>`;
    }
    const title = action === "upgrade" ? `${label} ${lvl}/3` : label;
    return `<div class="hub-card"><strong>${title}</strong><small>${blurb}</small>${button}</div>`;
  }

  function statsHtml() {
    const s = save.stats;
    const accuracy = s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
    const minutes = Math.floor(s.playtime / 60);
    const lines = [
      ["Accuracy", `${accuracy}%`],
      ["Best combo", `${s.bestCombo}`],
      ["Playtime", `${minutes}m`],
      ["Daily streak", `${save.daily.streak} day${save.daily.streak === 1 ? "" : "s"}`],
      ["Daily best", `${save.daily.best}`],
      ["Ghost to beat", `${save.ghost.score}`],
    ];
    return lines.map(([k, v]) => `<div class="hub-line"><span>${k}</span><b>${v}</b></div>`).join("");
  }

  function missionsHtml() {
    return Object.entries(MISSIONS).map(([id, m]) => {
      const done = save.missions[id] === true;
      const value = m.stat === "totalKills" ? save.totalKills : save.stats[m.stat] || 0;
      return `<div class="mission-row ${done ? "done" : ""}"><span>${done ? "✓" : "○"} ${m.label}</span><span>${done ? "claimed" : `${Math.min(value, m.target)}/${m.target}`}</span></div>`;
    }).join("");
  }

  function bountyHtml() {
    save = refreshBounty(save);
    const def = BOUNTIES[save.bounty.key];
    if (!def) return "";
    const progress = Math.min(save.bounty.progress, def.target);
    return `<div class="hub-section"><h3>Community board · ${def.label}</h3>
      <p class="bounty-desc">${def.desc} · reward ${def.reward} cores</p>
      <div class="bounty-bar"><span style="width:${Math.round(progress / def.target * 100)}%"></span></div>
      <p class="bounty-progress">${progress} / ${def.target}${save.bounty.done ? " · done" : ""}</p>
      <p class="bounty-hint">Drag buildings on the village grid. Tap a villager to talk.</p>
    </div>`;
  }

  function progressionHtml() {
    const need = xpForLevel(save.player.level);
    const pct = Math.min(100, Math.round(save.player.xp / need * 100));
    const mats = MATERIALS.map((m) => `${m} ${save.materials[m] || 0}`).join(" · ");
    return `<div class="hub-section"><h3>Hunter level ${save.player.level}</h3>
      <div class="bounty-bar"><span style="width:${pct}%"></span></div>
      <p class="bounty-progress">${save.player.xp} / ${need} XP · ${save.player.points} skill point${save.player.points === 1 ? "" : "s"}</p>
      <p class="bounty-hint">${mats}</p></div>`;
  }

  function skillsHtml() {
    return Object.entries(SKILLS).map(([key, def]) => {
      const tier = save.skills[key];
      const maxed = tier >= def.max;
      const enabled = !maxed && save.player.points > 0;
      return `<div class="hub-card"><strong>${def.label} ${tier}/${def.max}</strong>
        <small>${def.blurb}</small>
        <button type="button" data-action="skill" data-key="${key}" ${enabled ? "" : "disabled"}>${maxed ? "Maxed" : "Upgrade · 1 pt"}</button>
      </div>`;
    }).join("");
  }

  function craftingHtml() {
    const recipes = Object.entries(GEAR).map(([id, def]) => {
      const cost = Object.entries(def.cost).map(([m, n]) => `${n} ${m}`).join(" · ");
      const owned = save.inventory.includes(id);
      return `<div class="hub-card"><strong>${def.label}</strong><small>${def.rarity} · ${def.slot} · ${cost}</small>
        <button type="button" data-action="craft" data-key="${id}" ${!owned && canCraft(save, id) ? "" : "disabled"}>${owned ? "Owned" : "Craft"}</button>
      </div>`;
    }).join("");
    const equipped = Object.entries(save.gear).filter(([, id]) => id)
      .map(([slot, id]) => `${slot}: ${GEAR[id].label}`).join(" · ") || "none";
    const inventory = save.inventory.length
      ? save.inventory.map((id) => `<button class="setting-row small" type="button" data-action="equip" data-key="${id}">${GEAR[id].label} <b>${save.gear[GEAR[id].slot] === id ? "EQUIPPED" : "Equip"}</b></button>`).join("")
      : '<p class="bounty-hint">Craft gear to fill your loadout.</p>';
    return `<div class="hub-section"><h3>Crafting bench</h3>
      <div class="hub-grid">${recipes}</div>
      <p class="bounty-hint">Equipped: ${equipped}</p>${inventory}</div>`;
  }

  function partyHtml() {
    const slots = save.party.map((key, i) =>
      `<button class="setting-row small" type="button" data-action="party" data-slot="${i}" data-key="${key || "null"}">Slot ${i + 1} <b>${key ? COMPANIONS[key].label : "Empty"}</b></button>`).join("");
    const bots = Object.entries(COMPANIONS).map(([key, def]) => {
      const lvl = save.companionLevels[key];
      const cost = companionUpgradeCost(key, lvl);
      const costText = Object.entries(cost).map(([m, n]) => `${n} ${m}`).join(" · ");
      return `<div class="hub-card"><strong>${def.label} Lv ${lvl}</strong><small>${def.blurb}</small>
        <button type="button" data-action="bot-level" data-key="${key}" ${lvl < 3 ? "" : "disabled"}>${lvl >= 3 ? "Max" : `Train · ${costText}`}</button>
      </div>`;
    }).join("");
    return `<div class="hub-section"><h3>Companions</h3>${slots}${bots}</div>`;
  }

  function questsHtml() {
    return Object.entries(QUESTS).map(([id, q]) => {
      const done = save.quests[id] === true;
      const value = id === "campaign" ? save.campaign.cleared.length
        : id === "firstCraft" ? save.inventory.length
        : q.stat === "totalKills" ? save.totalKills : save.stats[q.stat] || 0;
      const reward = Object.entries(q.reward).map(([m, n]) => `${n} ${m}`).join(" · ");
      return `<div class="mission-row ${done ? "done" : ""}"><span>${done ? "✓" : "○"} ${q.label}</span><span>${done ? "done" : `${Math.min(value, q.target)}/${q.target}`} · ${reward}</span></div>`;
    }).join("");
  }

  function seasonMetaHtml() {
    const meta = save.meta;
    const pct = Math.min(100, Math.round(meta.seasonXp / SEASON.perWeek * 100));
    return `<div class="hub-section"><h3>${t("Season", save.game.lang)} ${meta.seasonWeek}/${SEASON.weeks} · prestige ${meta.prestige}</h3>
      <div class="bounty-bar"><span style="width:${pct}%"></span></div>
      <p class="bounty-progress">${meta.seasonXp} / ${SEASON.perWeek} season XP</p>
      ${meta.seasonWeek >= SEASON.weeks ? '<button class="setting-row small" type="button" data-action="prestige">Prestige & reset season</button>' : ""}
    </div>`;
  }

  function achievementsHtml() {
    const done = Object.values(save.meta.achievements).filter(Boolean).length;
    return `<div class="hub-section"><h3>${t("Achievements", save.game.lang)} ${done}/${Object.keys(ACHIEVEMENTS).length}</h3>
      ${Object.entries(ACHIEVEMENTS).map(([id, a]) =>
        `<div class="mission-row ${save.meta.achievements[id] ? "done" : ""}"><span>${save.meta.achievements[id] ? "✓" : "○"} ${a.label}</span><span>${a.desc}</span></div>`).join("")}
    </div>`;
  }

  function shareHtml() {
    return `<div class="hub-section"><h3>Share & save</h3>
      <button class="setting-row small" type="button" data-action="challenge">${t("Challenge code", save.game.lang)}</button>
      <button class="setting-row small" type="button" data-action="export">${t("Export save", save.game.lang)}</button>
      <button class="setting-row small" type="button" data-action="import">${t("Import save", save.game.lang)}</button>
      <button class="setting-row small" type="button" data-action="notify">${t("Enable daily reminder", save.game.lang)} <b>${save.meta.notified ? "ON" : "OFF"}</b></button>
      <button class="setting-row small" type="button" data-action="lang">${t("Language", save.game.lang)} <b>${save.game.lang.toUpperCase()}</b></button>
    </div>`;
  }

  function seasonHtml() {
    const event = SEASONS[save.season.key] || dailyEvent();
    return `<div class="season-banner"><b>${event.label}</b><span>${event.blurb}</span></div>`;
  }

  function jobsHtml() {
    return Object.entries(VILLAGERS).map(([key, v]) => {
      const job = save.villageJobs[key];
      const rate = JOBS[job].rate;
      return `<div class="mission-row"><span>${v.label} · ${JOBS[job].label}</span>
        <button class="setting-row small" type="button" data-action="job" data-key="${key}">${rate}/h · change</button></div>`;
    }).join("");
  }

  function storyHtml() {
    const chapter = Math.min(save.story.chapter, STORY.length - 1);
    const done = save.story.chapter >= STORY.length;
    return `<div class="hub-section"><h3>Story · Chapter ${Math.min(save.story.chapter + 1, STORY.length)}/4</h3>
      <p class="bounty-hint">${done ? "The story of Mother's Heart is complete." : STORY[chapter].title.replace(/^Chapter [IVX]+ · /, "")}</p></div>`;
  }

  function worldMapHtml() {
    const progress = Math.min(save.campaign.progress, CAMPAIGN_HUNTS.length - 1);
    const next = CAMPAIGN_HUNTS[progress];
    const cards = [
      `<button class="hub-card mode-card" type="button" data-action="mode" data-key="campaign">
        <strong>CAMPAIGN · ${next.name}</strong><small>${BIOMES[next.biome].label} · level ${next.level} · ${next.reward} reward</small><span>▶ Play</span>
      </button>`,
      `<button class="hub-card mode-card" type="button" data-action="mode" data-key="daily">
        <strong>DAILY HUNT</strong><small>Seeded today · best ${save.daily.best} · streak ${save.daily.streak}</small><span>▶ Play</span>
      </button>`,
      `<button class="hub-card mode-card" type="button" data-action="mode" data-key="endless">
        <strong>ENDLESS GAUNTLET</strong><small>Waves forever · boss every five · score attack</small><span>▶ Play</span>
      </button>`,
      `<button class="hub-card mode-card" type="button" data-action="mode" data-key="bossrush">
        <strong>BOSS RUSH</strong><small>Three bosses back to back · no waves</small><span>▶ Play</span>
      </button>`,
    ].join("");
    return `<div class="hub-section"><h3>World map</h3><div class="hub-grid mode-grid">${cards}</div></div>`;
  }

  function controlsHtml() {
    const g = save.game;
    const schemes = Object.entries(SCHEMES).map(([key, def]) =>
      `<button class="setting-row small" type="button" data-action="scheme" data-key="${key}">${def.label} <b>${g.scheme === key ? "●" : "○"}</b></button>`).join("");
    const palettes = Object.entries(PALETTES).map(([key, def]) =>
      `<button class="setting-row small" type="button" data-action="palette" data-key="${key}">${def.label} <b>${g.palette === key ? "●" : "○"}</b></button>`).join("");
    return `
      <div class="hub-section"><h3>Controls</h3>${schemes}
        <button class="setting-row small" type="button" data-action="aim">Aim assist <b>${g.aimAssist ? "On" : "Off"}</b></button>
        <button class="setting-row small" type="button" data-action="sens">Sensitivity <b>${g.sensitivity.toFixed(1)}×</b></button>
      </div>
      <div class="hub-section"><h3>Colour palette</h3>${palettes}</div>`;
  }

  function renderHubDom() {
    const upgrades = Object.entries(UPGRADES).map(([key, def]) => hubCard({
      key, label: def.label, blurb: def.blurb, action: "upgrade",
      state: upgradeCost(save, key) === null ? "done" : String(upgradeCost(save, key)),
    })).join("");
    const plots = Object.entries(VILLAGE_ITEMS).map(([key, def]) => hubCard({
      key, label: def.label, blurb: def.blurb, action: "plot",
      state: hasPlot(save, key) ? "done" : String(def.cost),
    })).join("");
    const bots = Object.entries(COMPANIONS).map(([key, def]) => {
      const state = !save.companions[key] ? String(def.cost)
        : save.activeCompanion === key ? "selected" : "unlocked";
      return hubCard({ key, label: def.label, blurb: def.blurb, action: "bot", state });
    }).join("");
    const noneActive = save.activeCompanion === null;
    hubEl.innerHTML = `
      <h2>Mother's Heart</h2>
      <p class="sub">Hunt level ${save.huntLevel} · best ${save.bestScore} · ${save.totalHunts} hunts completed</p>
      ${seasonHtml()}
      ${seasonMetaHtml()}
      ${shareHtml()}
      ${storyHtml()}
      ${worldMapHtml()}
      ${progressionHtml()}
      <div class="hub-section"><h3>Skill tree</h3><div class="hub-grid">${skillsHtml()}</div></div>
      ${craftingHtml()}
      ${partyHtml()}
      <div class="hub-section"><h3>Villager jobs</h3>${jobsHtml()}</div>
      <div class="hub-section"><h3>Upgrades</h3><div class="hub-grid">${upgrades}</div></div>
      <div class="hub-section"><h3>Village plots</h3><div class="hub-grid">${plots}</div></div>
      <div class="hub-section"><h3>Companions</h3><div class="hub-grid">${bots}</div>
        ${noneActive ? "" : '<button class="hub-wide" type="button" data-action="select" data-key="null" style="margin-top:8px;background:rgba(255,255,255,.1);color:#e8f2ee">Go solo</button>'}
      </div>
      ${bountyHtml()}
      ${controlsHtml()}
      ${achievementsHtml()}
      <div class="hub-section"><h3>Quest log</h3>${questsHtml()}</div>
      <div class="hub-section"><h3>Your record</h3>${statsHtml()}</div>
      <div class="hub-section"><h3>Missions</h3>${missionsHtml()}</div>
      <div class="game-row">
        <button class="ghost" type="button" data-action="help">How to play</button>
        <button class="ghost" type="button" data-action="settings">Settings</button>
      </div>
      <button class="hub-reset" type="button" data-action="reset">Reset progress</button>`;
    if (save.game.lang === "it") {
      const words = {
        "World map": "Mappa del mondo", "Season": "Stagione", "Hunter level": "Livello cacciatore",
        "Skill tree": "Albero abilità", "Crafting bench": "Banco di fabbricazione",
        "Companions": "Compagni", "Villager jobs": "Lavori del villaggio",
        "Upgrades": "Migliorie", "Quest log": "Diario missioni", "Achievements": "Obiettivi",
        "Your record": "I tuoi record", "Community board": "Bacheca comunitaria",
        "Controls": "Controlli", "Colour palette": "Tavolozza",
      };
      hubEl.querySelectorAll("h3").forEach((h) => {
        const match = Object.keys(words).find((k) => h.textContent.startsWith(k));
        if (match) h.textContent = h.textContent.replace(match, words[match]);
      });
    }
  }

  hubEl.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const key = btn.dataset.key;
    if (action === "prestige") {
      save = prestigeSeason(save);
      toast("A new season begins — prestige +1");
    } else if (action === "challenge") {
      const code = hunt ? encodeChallenge(hunt) : encodeChallenge(createHunt(save, Date.now() & 0xffff, { mode: "campaign" }));
      try { await navigator.clipboard.writeText(code); toast("Challenge code copied"); }
      catch { window.prompt("Challenge code", code); }
    } else if (action === "import") {
      const code = window.prompt("Paste challenge code");
      const parsed = code && decodeChallenge(code);
      if (parsed) {
        toast(`Challenge loaded: ${parsed.mode} · ${parsed.biome}`);
        startHunt(parsed.mode);
        return;
      }
      toast("Invalid challenge code");
    } else if (action === "export") {
      const code = exportSave(save);
      try { await navigator.clipboard.writeText(code); toast("Save code copied"); }
      catch { window.prompt("Save code", code); }
    } else if (action === "notify") {
      const granted = "Notification" in window && await Notification.requestPermission() === "granted";
      save = { ...save, meta: { ...save.meta, notified: granted } };
      toast(granted ? "Daily reminders enabled" : "Notifications disabled");
    } else if (action === "lang") {
      save = { ...save, game: { ...save.game, lang: save.game.lang === "en" ? "it" : "en" } };
      toast(save.game.lang === "it" ? "Lingua italiana" : "English language");
    } else if (action === "job") {
      const keys = Object.keys(JOBS);
      const current = keys.indexOf(save.villageJobs[key]);
      save = assignJob(save, key, keys[(current + 1) % keys.length]);
      toast(`${VILLAGERS[key].label} is now ${JOBS[save.villageJobs[key]].label.toLowerCase()}`);
    } else if (action === "skill") {
      const before = save.player.points;
      save = buySkill(save, key);
      if (save.player.points < before) { audio.play("core"); toast(`${SKILLS[key].label} improved`); }
    } else if (action === "craft") {
      const before = save.inventory.length;
      save = craftGear(save, key);
      if (save.inventory.length > before) { audio.play("win"); toast(`${GEAR[key].label} crafted`); }
      else toast("Not enough materials");
    } else if (action === "equip") {
      save = equipGear(save, key);
      toast(`${GEAR[key].label} equipped`);
    } else if (action === "bot-level") {
      const before = save.companionLevels[key];
      save = upgradeCompanionLevel(save, key);
      if (save.companionLevels[key] > before) { audio.play("core"); toast(`${COMPANIONS[key].label} trained`); }
      else toast("Not enough materials");
    } else if (action === "party") {
      const slot = Number(btn.dataset.slot);
      const botKey = key === "null" ? null : key;
      save = setParty(save, slot, botKey);
      toast(botKey ? `${COMPANIONS[botKey].label} added to party` : "Slot cleared");
    } else if (action === "upgrade") {
      const cost = upgradeCost(save, key);
      if (cost !== null && save.cores >= cost) {
        save = buyUpgrade(save, key);
        audio.play("core");
        toast(`${UPGRADES[key].label} upgraded`);
      } else toast("Not enough cores");
    } else if (action === "plot") {
      if (save.cores >= PLOTS[key].cost && !save.plots[key]) {
        save = buildPlot(save, key);
        audio.play("win");
        toast(`${PLOTS[key].label} built`);
      } else toast("Not enough cores");
    } else if (action === "bot") {
      if (save.cores >= COMPANIONS[key].cost && !save.companions[key]) {
        save = unlockCompanion(save, key);
        audio.play("win");
        toast(`${COMPANIONS[key].label} joined the village`);
      } else toast("Not enough cores");
    } else if (action === "select") {
      save = selectCompanion(save, key === "null" ? null : key);
      toast(key === "null" ? "Going solo" : `${COMPANIONS[key].label} will join the hunt`);
    } else if (action === "mode") {
      startHunt(key);
      return;
    } else if (action === "scheme") {
      save = sanitizedGame({ ...save, game: { ...save.game, scheme: key } });
      applyControls();
      toast(`${SCHEMES[key].label} controls`);
    } else if (action === "aim") {
      save = sanitizedGame({ ...save, game: { ...save.game, aimAssist: !save.game.aimAssist } });
    } else if (action === "sens") {
      const next = Math.round((save.game.sensitivity + (event.shiftKey ? -0.1 : 0.1)) * 10) / 10;
      save = sanitizedGame({ ...save, game: { ...save.game, sensitivity: next > 1.6 ? 0.6 : next } });
    } else if (action === "palette") {
      save = sanitizedGame({ ...save, game: { ...save.game, palette: key } });
      setPalette(key);
      toast(`${PALETTES[key].label} palette`);
    } else if (action === "help") {
      openTutorial(true);
      return;
    } else if (action === "settings") {
      openSettings();
      return;
    } else if (action === "reset") {
      if (window.confirm("Reset all Machine Hunt progress?")) {
        save = loadSave({ getItem: () => null });
        setPalette(save.game.palette);
        applyControls();
        toast("Progress reset");
      } else return;
    }
    persistSave(save);
    renderHubDom();
    updateHud();
  }, sig);

  function clientToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / ARENA.width, rect.height / ARENA.height);
    const ox = (rect.width - ARENA.width * scale) / 2;
    const oy = (rect.height - ARENA.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  function cellFromWorld(point) {
    for (let cell = 0; cell < GRID.cols * GRID.rows; cell++) {
      const r = cellRect(cell);
      if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
        return cell;
      }
    }
    return -1;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (screen !== "hub" || modal) return;
    const hit = villageHitTest(clientToWorld(event).x, clientToWorld(event).y);
    if (!hit) return;
    event.preventDefault();
    if (hit.type === "villager") {
      const villager = VILLAGERS[hit.key];
      const line = villager.lines[Math.floor(Math.random() * villager.lines.length)];
      toast(`${villager.label}: “${line}”`);
      save = { ...save, villagerMet: { ...save.villagerMet, [hit.key]: true } };
      persistSave(save);
      audio.play("click");
      return;
    }
    dragItem = hit.key;
    dragCell = hit.cell;
    audio.play("click");
  }, sig);

  canvas.addEventListener("pointermove", (event) => {
    if (screen !== "hub" || !dragItem) return;
    dragCell = cellFromWorld(clientToWorld(event));
    event.preventDefault();
  }, sig);

  canvas.addEventListener("pointerup", (event) => {
    if (screen !== "hub" || !dragItem) return;
    const key = dragItem;
    const cell = dragCell;
    dragItem = null;
    dragCell = -1;
    event.preventDefault();
    if (cell < 0 || cell === save.village.placements.find((p) => p.key === key)?.cell) return;
    const moved = moveVillage(save, key, cell);
    if (moved === save) { toast("That spot is taken"); return; }
    save = moved;
    persistSave(save);
    audio.play("core");
    toast(`${VILLAGE_ITEMS[key].label} moved`);
  }, sig);

  function sanitizedGame(next) {
    /* keep persistence strict without importing sanitizeSave again */
    persistSave(next);
    return loadSave({ getItem: () => JSON.stringify(next) });
  }

  /* -------------------------------------------------------------- tutorials */

  function paintTutorial() {
    const step = TUTORIAL[tutorialStep];
    $("#tut-step").textContent = `${tutorialStep + 1} / ${TUTORIAL.length}`;
    $("#tut-title").textContent = step.title;
    $("#tut-body").textContent = step.body;
    $("#tut-next").textContent = tutorialStep === TUTORIAL.length - 1 ? "Got it" : "Next";
  }

  function openTutorial(force = false) {
    if (!force && save.tutorialSeen) return;
    tutorialStep = 0;
    paintTutorial();
    tutorialEl.hidden = false;
    modal = "tutorial";
    move = { dx: 0, dy: 0 };
  }

  function closeTutorial() {
    tutorialEl.hidden = true;
    modal = null;
    if (!save.tutorialSeen) {
      save = { ...save, tutorialSeen: true };
      persistSave(save);
    }
    audio.play("click");
  }

  $("#tut-next").addEventListener("click", () => {
    if (tutorialStep < TUTORIAL.length - 1) {
      tutorialStep += 1;
      paintTutorial();
      audio.play("click");
    } else closeTutorial();
  }, sig);
  $("#tut-skip").addEventListener("click", closeTutorial, sig);

  /* ----------------------------------------------------------------- story */

  function openStory(chapter) {
    const data = STORY[chapter];
    if (!data || save.story.choices[chapter] !== undefined) return;
    $("#story-chapter").textContent = `CHAPTER ${["I", "II", "III", "IV"][chapter] || chapter + 1}`;
    $("#story-title").textContent = data.title.split("·").slice(1).join("").trim() || data.title;
    $("#story-text").textContent = data.text;
    $("#story-result").hidden = true;
    $("#story-close").hidden = true;
    const choices = $("#story-choices");
    choices.innerHTML = data.choices.map((choice, i) =>
      `<button type="button" data-choice="${i}">${choice.label}</button>`).join("");
    choices.querySelectorAll("button").forEach((btn) =>
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.choice);
        save = applyStoryChoice(save, chapter, index);
        persistSave(save);
        choices.innerHTML = "";
        $("#story-result").textContent = data.choices[index].result;
        $("#story-result").hidden = false;
        $("#story-close").hidden = false;
        audio.play("win");
      }, sig)
    );
    storyEl.hidden = false;
    modal = "story";
  }

  /* --------------------------------------------------------------- settings */

  function paintSettings() {
    const R2 = window.R2;
    const s = R2?.getSettings?.() || { sound: true, music: true, haptics: true };
    $("#set-sound").textContent = s.sound ? "On" : "Off";
    $("#set-music").textContent = s.music ? "On" : "Off";
    $("#set-haptics").textContent = s.haptics ? "On" : "Off";
    $("#set-reduced").textContent = reduced ? "On" : "Off";
  }

  function openSettings() {
    paintSettings();
    settingsEl.hidden = false;
    modal = "settings";
  }
  function closeSettings() {
    settingsEl.hidden = true;
    modal = null;
    audio.play("click");
  }

  settingsEl.querySelectorAll("[data-setting]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const key = btn.dataset.setting;
      if (key === "reduced") {
        reduced = !reduced;
        effects.setReduced(reduced);
      } else audio.toggle(key);
      paintSettings();
    }, sig)
  );
  $("#settings-close").addEventListener("click", closeSettings, sig);
  $("#story-close").addEventListener("click", () => {
    storyEl.hidden = true;
    modal = null;
    renderHubDom();
    updateHud();
  }, sig);

  /* --------------------------------------------------------------- hunting */

  function startHunt(mode = "campaign") {
    const forcedBiome = new URLSearchParams(location.search).get("biome");
    const opts = { mode, date: new Date(), aimAssist: save.game.aimAssist };
    if (BIOMES[forcedBiome]) opts.biome = forcedBiome;
    if (mode === "campaign") {
      const def = CAMPAIGN_HUNTS[Math.min(save.campaign.progress, CAMPAIGN_HUNTS.length - 1)];
      opts.campaignLevel = def.level;
      if (!opts.biome) opts.biome = def.biome;
    }
    hunt = createHunt(save, (Date.now() & 0xffff) ^ (save.huntLevel * 7919), opts);
    recorder = createRecorder(hunt.seed, hunt.mode, hunt.biome);
    screen = "hunt";
    paused = false;
    hubEl.hidden = true;
    resultEl.hidden = true;
    pauseEl.hidden = true;
    settingsEl.hidden = true;
    effects.clear();
    move = { dx: 0, dy: 0 };
    pendingCharge = null;
    applyControls();
    audio.startMusic();
    audio.play("wave");
    updateHud();
    if (!save.tutorialSeen) openTutorial();
    else if (hunt.mode === "daily") toast("Daily hunt — same seed for everyone today");
    else if (hunt.mode === "bossrush") toast("Boss Rush — three bosses in a row");
    else if (hunt.mode === "endless") toast("Endless — survive as long as you can");
    else if (hunt.modifier) toast(MODIFIERS[hunt.modifier].label);
  }

  function handleEvents(events) {
    for (const event of events) {
      if (event === "shoot") audio.play("shoot");
      else if (event === "charged") audio.play("charged");
      else if (event === "enemyHit") audio.play("enemyHit");
      else if (event === "core") audio.play("core");
      else if (event === "heal") { audio.play("heal"); audio.buzz(12); }
      else if (event === "playerHit") { audio.play("hurt"); audio.buzz(40); }
      else if (event === "shieldBlock") audio.play("shield");
      else if (event === "wave") { audio.play("wave"); toast(`Wave ${hunt.wave}`); }
      else if (event === "boss") { audio.play("boss"); audio.buzz([30, 50, 30]); toast("Tallneck approaches!"); }
      else if (event === "bossPhase") { audio.play("bossPhase"); audio.buzz([50, 30, 50, 30, 80]); toast(`Tallneck · phase ${hunt.bossPhase}`); }
      else if (event === "bossShockwave") audio.play("shockwave");
      else if (event === "burrowerBurrow" || event === "burrowerEmerge") audio.play("burrow");
      else if (event === "won") { audio.play("win"); audio.buzz([20, 40, 20]); }
      else if (event === "lost") audio.play("lose");
    }
    for (const effect of hunt.fx) effects.spawn(effect);
    hunt.fx.length = 0;
  }

  function showResult(result) {
    save = result.save;
    pendingStory = null;
    if (result.result.campaign !== null) {
      const chapter = storyChapterForHunt(result.result.campaign);
      if (save.story.choices[chapter] === undefined && chapter >= save.story.chapter) {
        pendingStory = chapter;
      }
    }
    persistSave(save);
    audio.stopMusic();
    audio.resume();
    screen = "result";
    $("#result-title").textContent = result.result.won
      ? hunt?.mode === "bossrush" ? "Boss Rush cleared!"
        : hunt?.mode === "campaign" ? "Campaign hunt cleared!" : "Hunt cleared!"
      : hunt?.mode === "endless" ? "Run over" : "Hunt failed";
    const modeLabel = MODES[hunt?.mode]?.label || "Hunt";
    $("#result-detail").textContent =
      `${modeLabel} · ${result.result.score} points · ${result.result.kills} machines · ${Math.round(result.result.accuracy * 100)}% accuracy`;
    const mats = result.result.materials || {};
    $("#result-reward").textContent =
      `+${result.result.earned} cores · +${result.result.xp || 0} XP` +
      (mats.scrap ? ` · +${mats.scrap} scrap` : "");
    if (result.result.levels > 0) {
      window.setTimeout(() => toast(`Level up! You are now level ${save.player.level}`), 500);
    }
    result.result.quests?.forEach((q, i) =>
      window.setTimeout(() => toast(`Quest ${q.label} complete!`), 900 + i * 900));
    const dailyEl = $("#result-daily");
    if (result.result.daily) {
      dailyEl.hidden = false;
      dailyEl.textContent = `Daily · streak ${result.result.daily.streak} · best ${result.result.daily.best}`;
    } else dailyEl.hidden = true;
    resultEl.hidden = false;
    if (save.meta.notified && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("Machine Hunt", { body: $("#result-detail").textContent }); } catch { /* optional */ }
    }
    result.result.claimed?.forEach((m, i) =>
      window.setTimeout(() => toast(`Mission ${m.label} · +${m.reward}`), 700 + i * 900));
    updateHud();
    announceA11y();
  }

  function scoreCard() {
    const card = document.createElement("canvas");
    card.width = 600;
    card.height = 340;
    const c = card.getContext("2d");
    const g = c.createLinearGradient(0, 0, 600, 340);
    g.addColorStop(0, "#1b2838");
    g.addColorStop(1, "#0d1714");
    c.fillStyle = g;
    c.fillRect(0, 0, 600, 340);
    c.fillStyle = "#f2c14e";
    c.fillRect(40, 42, 52, 52);
    c.fillStyle = "#0d1714";
    c.font = "900 22px Arial, sans-serif";
    c.fillText("M", 56, 77);
    c.fillStyle = "#f7f9fb";
    c.font = "900 34px Arial, sans-serif";
    c.fillText("MACHINE HUNT", 108, 80);
    c.font = "800 72px Arial, sans-serif";
    c.fillText(`${hunt?.score || save.bestScore}`, 40, 196);
    c.font = "700 18px Arial, sans-serif";
    c.fillStyle = "#8fd2fa";
    c.fillText(`${hunt?.daily ? "DAILY" : `HUNT ${save.huntLevel}`} · ${save.activeCompanion || "solo"}`, 42, 232);
    c.fillStyle = "#c7d5e0";
    c.font = "600 15px Arial, sans-serif";
    c.fillText("Original fan-made mini game · random2", 42, 300);
    return card;
  }

  $("#result-share").addEventListener("click", async () => {
    const code = hunt ? encodeChallenge(hunt) : "";
    const text = `Machine Hunt: ${hunt?.score || save.bestScore} points on ${hunt?.daily ? "today's daily" : `hunt ${save.huntLevel}`}!` +
      (code ? ` Challenge code: ${code}` : "");
    try {
      const card = scoreCard();
      const blob = await new Promise((resolve) => card.toBlob(resolve, "image/png"));
      const file = blob && new File([blob], "machine-hunt-score.png", { type: "image/png" });
      if (navigator.share && file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Machine Hunt score", text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast("Score copied to clipboard");
      } else if (blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "machine-hunt-score.png";
        a.click();
        toast("Score card downloaded");
      }
    } catch { toast("Could not share the score"); }
  }, sig);

  $("#result-replay").addEventListener("click", async () => {
    if (!recorder) return;
    const code = encodeReplay(recorder);
    try { await navigator.clipboard.writeText(code); toast("Replay code copied"); }
    catch { window.prompt("Replay code", code); }
  }, sig);

  $("#result-village").addEventListener("click", () => {
    hunt = null;
    screen = "hub";
    resultEl.hidden = true;
    hubEl.hidden = false;
    renderHubDom();
    updateHud();
    if (pendingStory !== null) {
      const chapter = pendingStory;
      pendingStory = null;
      openStory(chapter);
    }
  }, sig);
  $("#result-again").addEventListener("click", () => {
    resultEl.hidden = true;
    startHunt(hunt?.mode || "campaign");
  }, sig);

  /* -------------------------------------------------------------- controls */

  function togglePause() {
    if (screen !== "hunt" || modal) return;
    paused = !paused;
    pauseEl.hidden = !paused;
    move = { dx: 0, dy: 0 };
    if (paused) audio.suspend(); else audio.resume();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && screen === "hunt" && !paused && !modal) togglePause();
  }, sig);
  window.addEventListener("keydown", (event) => {
    if (screen !== "hunt" || modal) return;
    const weaponKey = ["1", "2", "3", "4"].find((k) => event.code === `Digit${k}`);
    if (weaponKey) pendingWeapon = ["bow", "spear", "bomb", "trap"][Number(weaponKey) - 1];
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") pendingDodge = true;
    if (event.code === "KeyU") pendingUltimate = true;
  }, sig);

  $("#game-pause-btn").addEventListener("click", togglePause, sig);
  $("#pause-resume").addEventListener("click", togglePause, sig);
  $("#pause-help").addEventListener("click", () => { pauseEl.hidden = true; paused = false; openTutorial(true); }, sig);
  $("#pause-settings").addEventListener("click", () => { pauseEl.hidden = true; paused = false; openSettings(); }, sig);
  $("#pause-village").addEventListener("click", () => {
    pauseEl.hidden = true;
    paused = false;
    audio.stopMusic();
    audio.resume();
    hunt = null;
    screen = "hub";
    hubEl.hidden = false;
    renderHubDom();
    updateHud();
  }, sig);
  $("#pause-exit").addEventListener("click", () => stop(), sig);
  $("#game-exit-btn").addEventListener("click", () => stop(), sig);

  /* -------------------------------------------------------------- game loop */

  const STEP = 1 / 60;

  function stepGame(dt) {
    elapsed += dt;
    effects.update(dt);
    a11yClock += dt;
    if (a11yClock > 2) { a11yClock = 0; announceA11y(); }

    const pad = input.gamepad();
    if (pad) {
      if (pad.dx || pad.dy) move = { dx: pad.dx, dy: pad.dy };
      if (pad.charge && !gpChargeWasDown) pendingCharge = 1;
      gpChargeWasDown = pad.charge;
      if (pad.dodge && !gpDodgeWasDown) pendingDodge = true;
      gpDodgeWasDown = pad.dodge;
      if (pad.nextWeapon && !gpNextWasDown) {
        const keys = Object.keys(WEAPONS);
        const current = hunt?.combat?.weapon || "bow";
        pendingWeapon = keys[(keys.indexOf(current) + 1) % keys.length];
      }
      gpNextWasDown = pad.nextWeapon;
      if (pad.pause && !gpPauseWasDown) togglePause();
      gpPauseWasDown = pad.pause;
    }

    if (screen === "hunt" && hunt && !paused && !modal && effects.hitStop <= 0) {
      const inputState = { dx: move.dx, dy: move.dy, charge: input.charge() };
      if (pendingWeapon) { inputState.weapon = pendingWeapon; pendingWeapon = null; }
      if (pendingDodge) { inputState.dodge = true; pendingDodge = false; }
      if (pendingUltimate) { inputState.ultimate = true; pendingUltimate = false; }
      if (pendingCharge !== null) {
        inputState.chargedShot = pendingCharge;
        pendingCharge = null;
      }
      if (recorder) recordFrame(recorder, inputState, dt, hunt.time);
      const events = stepHunt(hunt, inputState, dt);
      audio.setIntensity(hunt.phase === "boss" || hunt.wave >= 5 ? 3 : hunt.wave >= 3 ? 2 : 1);
      handleEvents(events);
      if (hunt.phase === "won" || hunt.phase === "lost") showResult(finishHunt(hunt, save));
      updateHud();
    }
  }

  function paintDebug(frameMs, steps) {
    if (!debugEl) return;
    debugClock += frameMs;
    if (debugClock < 250) return;
    debugClock = 0;
    debugEl.textContent =
      `${Math.round(1000 / Math.max(1, frameMs))} fps · ${frameMs.toFixed(1)} ms · ` +
      `${steps} steps · ${effects.count} fx / ${effects.poolSize} pooled · ` +
      `seed ${hunt?.seed ?? "-"} · ${save.game.scheme} · ${tier}`;
  }

  function frame(now) {
    if (quality.fps < 60 && now - lastRender < 1000 / quality.fps) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastRender = now;
    const frameMs = now - last;
    last = now;
    acc += Math.min(0.1, frameMs / 1000 || 0);
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      stepGame(STEP);
      acc -= STEP;
      steps += 1;
    }
    if (steps === 5) acc = 0;

    ctx.clearRect(0, 0, ARENA.width, ARENA.height);
    if (screen === "hub") renderHub(ctx, save, elapsed);
    else if (hunt) renderHunt(ctx, hunt, elapsed, effects);
    paintDebug(frameMs, steps);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    clearInterval(prodTimer);
    ac.abort();
    input.destroy();
    audio.stopMusic();
    audio.resume();
    css.remove();
    layer.hidden = true;
    document.body.classList.remove("no-scroll", "game-onehand");
    effects.clear();
    hunt = null;
    screen = "hub";
    onExit?.();
  }

  let onExit = null;
  layer.hidden = false;
  document.body.classList.add("no-scroll");
  fitCanvas();
  applyControls();
  renderHubDom();
  updateHud();
  audio.startMusic();
  if (MODES[options.mode]) startHunt(options.mode);
  prodTimer = window.setInterval(() => {
    const result = collectProduction(save);
    save = result.save;
    persistSave(save);
    renderHubDom();
    updateHud();
  }, 60000);
  last = performance.now();
  raf = requestAnimationFrame(frame);
  if (offlineGained.scrap || offlineGained.bricks || offlineGained.cores) {
    window.setTimeout(() => toast(
      `While you were away: +${offlineGained.scrap} scrap, +${offlineGained.bricks} bricks, +${offlineGained.cores} cores`
    ), 400);
  }

  return {
    setExitHandler(fn) { onExit = fn; },
    stop,
  };
}
