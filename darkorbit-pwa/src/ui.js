/*
 * DEEP ORBIT — HUD, overlays and the hangar.
 *
 * DOM updates are cached so the 60 Hz loop does not thrash the document.
 * Overlay buttons are wired through one delegated click handler with
 * `data-action`, so rebuilding the hangar never leaks listeners.
 */

import {
    SHIPS, UPGRADES, SKILLS, SKILL_BY_ID, ACHIEVEMENTS, AMMO, ABILITIES, DRONE_MAX,
    DISPATCH_TIERS, droneCost, upgradeCost, RESOURCES, RESOURCE_IDS,
    xpForLevel, clamp
} from "./config.js";
import { dispatchStatus } from "./dispatch.js";
import { dailyContracts } from "./daily.js";
import { achievementList, achievementCount } from "./achievements.js";

function fmt(n) {
    return Math.floor(n || 0).toLocaleString("en-US");
}

function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
}

function setWidth(el, pct) {
    const v = clamp(pct, 0, 1) * 100;
    const s = v.toFixed(1) + "%";
    if (el && el.style.width !== s) el.style.width = s;
}

export function createUI(handlers = {}) {
    const $ = (id) => document.getElementById(id);
    const el = {
        overlay: $("overlay"),
        toastArea: $("toast-area"),
        level: $("hud-level"),
        xpFill: $("xp-fill"),
        credits: $("hud-credits"),
        urium: $("hud-urium"),
        map: $("hud-map"),
        shieldBar: $("shield-fill"),
        shieldText: $("shield-text"),
        hpBar: $("hp-fill"),
        hpText: $("hp-text"),
        cargoBar: $("cargo-fill"),
        cargoText: $("cargo-text"),
        score: $("hud-score"),
        kills: $("hud-kills"),
        ammoName: $("ammo-name"),
        ammoTag: $("ammo-tag"),
        targetPanel: $("target-panel"),
        targetName: $("target-name"),
        targetShield: $("target-shield-fill"),
        targetHp: $("target-hp-fill"),
        phase: $("phase-label"),
        safeBadge: $("safe-badge"),
        effects: $("active-effects"),
        fireBtn: $("fire-btn"),
        dockBtn: $("btn-dock"),
        gateBtn: $("btn-gate"),
        gateHUD: $("gate-hud"),
        gateWave: $("gate-wave"),
        gateTime: $("gate-time"),
        gateKills: $("gate-kills"),
        gateFill: $("gate-fill"),
        jumpBtn: $("btn-jump"),
        hangarBtn: $("btn-hangar"),
        srStatus: $("sr-status"),
        install: $("install-prompt"),
        installBtn: $("install-btn"),
        installLater: $("install-later"),
        coach: $("coach"),
        coachText: $("coach-text"),
        coachTarget: $("coach-target"),
        debug: $("debug-hud")
    };

    const abilityButtons = Array.from(document.querySelectorAll("[data-ability]"));

    el.overlay.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-action]");
        if (!btn) return;
        event.preventDefault();
        const action = btn.getAttribute("data-action");
        const value = btn.getAttribute("data-value");
        const map = {
            play: handlers.onPlay,
            hangar: handlers.onHangar,
            "close-hangar": handlers.onCloseHangar,
            resume: handlers.onResume,
            restart: handlers.onRestart,
            respawn: handlers.onRespawn,
            mute: handlers.onMute,
            repair: handlers.onRepair,
            sell: handlers.onSell,
            jump: handlers.onJump,
            settings: handlers.onSettings,
            "close-settings": handlers.onCloseSettings,
            continue: handlers.onContinue,
            contracts: handlers.onContracts,
            achievements: handlers.onAchievements,
            "close-info": handlers.onCloseInfo,
            "launch-gate": handlers.onLaunchGate,
            "claim-dispatch": handlers.onClaimDispatch,
            "coach-next": handlers.onCoachNext,
            "coach-skip": handlers.onCoachSkip,
            "buy-drone": handlers.onBuyDrone
        };
        if (map[action]) map[action]();
        else if (action === "buy-upgrade" && handlers.onBuyUpgrade) handlers.onBuyUpgrade(value);
        else if (action === "buy-ship" && handlers.onBuyShip) handlers.onBuyShip(Number(value));
        else if (action === "select-ship" && handlers.onSelectShip) handlers.onSelectShip(Number(value));
        else if (action === "buy-skill" && handlers.onBuySkill) handlers.onBuySkill(value);
        else if (action === "dispatch" && handlers.onDispatch) handlers.onDispatch(value);
        else if (action === "setting" && handlers.onSetting) {
            const key = btn.getAttribute("data-key");
            let next = value;
            if (value === "toggle") next = undefined;
            handlers.onSetting(key, next, btn);
        } else if (action === "replay-tutorial" && handlers.onReplayTutorial) handlers.onReplayTutorial();
    });

    function hideOverlay() {
        el.overlay.classList.add("hidden");
        el.overlay.innerHTML = "";
    }

    function showOverlay(html) {
        el.overlay.innerHTML = html;
        el.overlay.classList.remove("hidden");
    }

    function menuHTML(profile, hasRun) {
        return `
            <div class="panel" role="dialog" aria-modal="true">
                <p class="kicker">OFFLINE SPACE COMBAT</p>
                <h2 class="title-big">DEEP ORBIT</h2>
                <p class="lead">Fly the sector. Hunt aliens. Haul ore. Jump deeper.</p>
                <div class="profile-strip">
                    <span>LVL <b>${profile.level}</b></span>
                    <span>CR <b>${fmt(profile.credits)}</b></span>
                    <span>URIUM <b>${fmt(profile.urium)}</b></span>
                    <span>BEST <b>${fmt(profile.bestScore)}</b></span>
                    <span>🏆 <b>${achievementCount(profile)}/${ACHIEVEMENTS.length}</b></span>
                </div>
                <div class="panel-actions">
                    ${hasRun ? `<button class="btn primary" data-action="continue" type="button">▶ CONTINUE RUN</button>` : ""}
                    <button class="btn ${hasRun ? "" : "primary"}" data-action="play" type="button">✦ NEW RUN</button>
                    <button class="btn" data-action="hangar" type="button">⚙ HANGAR</button>
                    <button class="btn" data-action="contracts" type="button">📋 CONTRACTS</button>
                    <button class="btn" data-action="achievements" type="button">🏆 AWARDS</button>
                    <button class="btn" data-action="settings" type="button">🎛 SETTINGS</button>
                    <button class="btn" data-action="mute" type="button">🔊 SOUND</button>
                </div>
                <p class="panel-hint">Joystick to fly · hold FIRE to shoot · tap an alien to lock · dock to sell</p>
            </div>`;
    }

    function shipCard(ship, index, profile) {
        const owned = profile.ownedShips.includes(index);
        const equipped = profile.ship === index;
        const locked = profile.level < ship.level;
        let action;
        if (equipped) action = `<button class="btn tiny" disabled type="button">EQUIPPED</button>`;
        else if (owned) action = `<button class="btn tiny" data-action="select-ship" data-value="${index}" type="button">EQUIP</button>`;
        else if (locked) action = `<button class="btn tiny" disabled type="button">LVL ${ship.level}</button>`;
        else {
            const afford = profile.credits >= ship.price && profile.urium >= ship.urium;
            action = `<button class="btn tiny ${afford ? "primary" : ""}" data-action="buy-ship" data-value="${index}" type="button" ${afford ? "" : "disabled"}>${fmt(ship.price)} CR${ship.urium ? " · " + ship.urium + " U" : ""}</button>`;
        }
        return `
            <div class="ship-card ${equipped ? "equipped" : ""}">
                <div class="ship-card-top"><span class="ship-dot" style="background:${ship.color}"></span><b>${ship.name}</b></div>
                <small>${ship.role}</small>
                <div class="ship-stats">
                    <span>SPD ${ship.speed}</span><span>HULL ${fmt(ship.hp)}</span>
                    <span>SHD ${fmt(ship.shield)}</span><span>CARGO ${fmt(ship.cargo)}</span>
                </div>
                ${ship.perkText ? `<p class="ship-perk">${ship.perkText}</p>` : ""}
                ${action}
            </div>`;
    }

    function upgradeRow(def, profile) {
        const level = profile.upgrades[def.id] | 0;
        const maxed = level >= def.max;
        const cost = upgradeCost(def, level);
        const afford = profile.credits >= cost;
        const pips = Array.from({ length: def.max }, (_, i) =>
            `<i class="${i < level ? "on" : ""}"></i>`).join("");
        return `
            <div class="upgrade-row">
                <div class="upgrade-info"><b>${def.name}</b><small>${def.desc}</small><div class="pips">${pips}</div></div>
                ${maxed
                    ? `<button class="btn tiny" disabled type="button">MAX</button>`
                    : `<button class="btn tiny ${afford ? "primary" : ""}" data-action="buy-upgrade" data-value="${def.id}" type="button" ${afford ? "" : "disabled"}>${fmt(cost)} CR</button>`}
            </div>`;
    }

    function skillRow(def, profile) {
        const level = profile.skills[def.id] | 0;
        const canBuy = (profile.skillPoints | 0) > 0 && level < def.max;
        const pips = Array.from({ length: def.max }, (_, i) =>
            `<i class="${i < level ? "on" : ""}"></i>`).join("");
        return `
            <div class="upgrade-row">
                <div class="upgrade-info"><b>${def.name}</b><small>${def.desc}</small><div class="pips">${pips}</div></div>
                <button class="btn tiny ${canBuy ? "primary" : ""}" data-action="buy-skill" data-value="${def.id}" type="button" ${canBuy ? "" : "disabled"}>
                    ${level >= def.max ? "MAX" : "+"}
                </button>
            </div>`;
    }

    function dispatchHTML(profile, now) {
        const status = dispatchStatus(profile, now);
        if (status.active) {
            if (status.done) {
                return `<p class="section-note">Retriever returned — claim your reward.</p>
                    <button class="btn small primary" data-action="claim-dispatch" type="button">CLAIM ${fmt(status.rewards.credits)} CR${status.rewards.urium ? " + " + status.rewards.urium + " URIUM" : ""}</button>`;
            }
            const hours = Math.max(1, Math.ceil(status.hours));
            return `<p class="section-note">${status.tier} in progress — returns in ~${hours}h.</p>`;
        }
        return `<p class="section-note">Send a retriever offline. Rewards are waiting when you return.</p>
            <div class="dispatch-tiers">
                ${DISPATCH_TIERS.map((t) => `<button class="btn tiny" data-action="dispatch" data-value="${t.id}" type="button">${t.name.toUpperCase()} · ${t.hours}H</button>`).join("")}
            </div>`;
    }

    function buildHangar(state, profile) {
        const dcost = droneCost(profile.drones);
        const dmax = profile.drones >= DRONE_MAX;
        const dAfford = profile.credits >= dcost;
        const atStation = state ? state.docked : false;
        const cargoTotal = state ? RESOURCE_IDS.reduce((s, id) => s + state.cargo[id], 0) : 0;

        const stationActions = atStation ? `
            <div class="station-actions">
                <button class="btn small" data-action="sell" type="button" ${cargoTotal ? "" : "disabled"}>SELL CARGO ${cargoTotal ? "(" + cargoTotal + ")" : ""}</button>
                <button class="btn small" data-action="repair" type="button">REPAIR SHIP</button>
            </div>` : `<p class="panel-hint">Dock at the station to sell cargo and repair.</p>`;

        return `
            <div class="panel panel-wide" role="dialog" aria-modal="true">
                <p class="kicker">${atStation ? "DOCKED · " : ""}HANGAR</p>
                <h2>OUTFIT YOUR SHIP</h2>
                <div class="wallet-line">
                    <span>CR <b>${fmt(profile.credits)}</b></span>
                    <span>URIUM <b>${fmt(profile.urium)}</b></span>
                    <span>LVL <b>${profile.level}</b></span>
                    <span>SKILL PTS <b>${profile.skillPoints | 0}</b></span>
                </div>
                ${stationActions}
                <div class="hangar-scroll">
                    <section>
                        <h3>SHIPS</h3>
                        <div class="ship-list">${SHIPS.map((s, i) => shipCard(s, i, profile)).join("")}</div>
                    </section>
                    <section>
                        <h3>UPGRADES</h3>
                        ${UPGRADES.map((u) => upgradeRow(u, profile)).join("")}
                    </section>
                    <section>
                        <h3>DRONES <small>${profile.drones}/${DRONE_MAX}</small></h3>
                        <p class="section-note">Drones orbit your ship and auto-fire at your target.</p>
                        <button class="btn small ${dAfford ? "primary" : ""}" data-action="buy-drone" type="button" ${dmax || !dAfford ? "disabled" : ""}>
                            ${dmax ? "MAX DRONES" : "BUY DRONE · " + fmt(dcost) + " CR"}
                        </button>
                    </section>
                    <section>
                        <h3>PILOT SKILLS <small>${profile.skillPoints | 0} PTS</small></h3>
                        ${SKILLS.map((def) => skillRow(def, profile)).join("")}
                    </section>
                    ${atStation ? `<section>
                        <h3>DISPATCH</h3>
                        ${dispatchHTML(profile, Date.now())}
                    </section>` : ""}
                </div>
                <div class="panel-actions">
                    <button class="btn primary" data-action="${state ? "close-hangar" : "play"}" type="button">${state ? "◀ BACK TO FLIGHT" : "◀ BACK"}</button>
                </div>
            </div>`;
    }

    function showMenu(profile, hasRun) {
        showOverlay(menuHTML(profile, !!hasRun));
    }

    function showHangar(state, profile) {
        showOverlay(buildHangar(state, profile));
    }

    function refreshHangar(state, profile) {
        if (!el.overlay.classList.contains("hidden") && el.overlay.querySelector(".panel-wide")) {
            showHangar(state, profile);
        }
    }

    function showPause(profile) {
        showOverlay(`
            <div class="panel" role="dialog" aria-modal="true">
                <p class="kicker">FLIGHT PAUSED</p>
                <h2>PAUSED</h2>
                <div class="panel-actions">
                    <button class="btn primary" data-action="resume" type="button">▶ RESUME</button>
                    <button class="btn" data-action="hangar" type="button">⚙ HANGAR</button>
                    <button class="btn" data-action="contracts" type="button">📋 CONTRACTS</button>
                    <button class="btn" data-action="achievements" type="button">🏆 AWARDS</button>
                    <button class="btn" data-action="settings" type="button">🎛 SETTINGS</button>
                    <button class="btn" data-action="mute" type="button">🔊 SOUND</button>
                    <button class="btn" data-action="restart" type="button">↻ MAIN MENU</button>
                </div>
                <p class="panel-hint">P / Esc resume · M mute</p>
            </div>`);
    }

    function settingRow(label, key, options, current) {
        const buttons = options.map((o) => {
            const on = String(o.value) === String(current);
            return `<button class="btn tiny ${on ? "on" : ""}" data-action="setting" data-key="${key}" data-value="${o.value}" type="button" aria-pressed="${on}">${o.label}</button>`;
        }).join("");
        return `<div class="setting-row"><span>${label}</span><div class="segmented">${buttons}</div></div>`;
    }

    function showSettings(settings) {
        showOverlay(`
            <div class="panel panel-wide" role="dialog" aria-modal="true">
                <p class="kicker">CONFIGURATION</p>
                <h2>SETTINGS</h2>
                <div class="settings-list">
                    ${settingRow("Effects", "effects", [
                        { value: "auto", label: "AUTO" }, { value: "high", label: "HIGH" }, { value: "low", label: "LOW" }
                    ], settings.effects)}
                    ${settingRow("Frame rate", "fps", [
                        { value: 60, label: "60 FPS" }, { value: 30, label: "30 FPS" }
                    ], settings.fps)}
                    ${settingRow("Joystick", "sensitivity", [
                        { value: 0.7, label: "LOW" }, { value: 1, label: "NORMAL" }, { value: 1.3, label: "HIGH" }
                    ], settings.sensitivity)}
                    ${settingRow("Palette", "palette", [
                        { value: "normal", label: "NORMAL" }, { value: "colorblind", label: "COLORBLIND" }
                    ], settings.palette)}
                    ${settingRow("HUD size", "hud", [
                        { value: "normal", label: "NORMAL" }, { value: "large", label: "LARGE" }
                    ], settings.hud)}
                    ${settingRow("Sound", "sound", [
                        { value: "on", label: "ON" }, { value: "off", label: "OFF" }
                    ], settings.sound ? "on" : "off")}
                    ${settingRow("Music", "music", [
                        { value: "on", label: "ON" }, { value: "off", label: "OFF" }
                    ], settings.music ? "on" : "off")}
                    ${settingRow("Haptics", "haptics", [
                        { value: "on", label: "ON" }, { value: "off", label: "OFF" }
                    ], settings.haptics ? "on" : "off")}
                    ${settingRow("FPS counter", "showFps", [
                        { value: "on", label: "ON" }, { value: "off", label: "OFF" }
                    ], settings.showFps ? "on" : "off")}
                </div>
                <div class="panel-actions">
                    <button class="btn" data-action="replay-tutorial" type="button">REPLAY TUTORIAL</button>
                    <button class="btn primary" data-action="close-settings" type="button">◀ BACK</button>
                </div>
            </div>`);
    }

    function showCoach(step, total) {
        if (!el.coach) return;
        document.body.classList.add("coaching");
        el.coach.classList.remove("hidden");
        el.coach.setAttribute("data-step", String(step));
        if (el.coachText) el.coachText.textContent = step.text;
        if (el.coachTarget) el.coachTarget.textContent = (step.index + 1) + " / " + total;
        document.querySelectorAll(".coach-light").forEach((n) => n.classList.remove("coach-light"));
        const target = document.querySelector(step.target);
        if (target) target.classList.add("coach-light");
    }

    if (el.coach) {
        el.coach.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-action]");
            if (!btn) return;
            event.preventDefault();
            const action = btn.getAttribute("data-action");
            if (action === "coach-next" && handlers.onCoachNext) handlers.onCoachNext();
            if (action === "coach-skip" && handlers.onCoachSkip) handlers.onCoachSkip();
        });
    }

    function hideCoach() {
        document.body.classList.remove("coaching");
        if (el.coach) el.coach.classList.add("hidden");
        document.querySelectorAll(".coach-light").forEach((n) => n.classList.remove("coach-light"));
    }

    function setDebug(text) {
        if (el.debug) {
            el.debug.textContent = text;
            el.debug.classList.toggle("hidden", !text);
        }
    }

    function showContracts(profile) {
        const daily = dailyContracts(profile, Date.now());
        const streak = profile.daily.streak | 0;
        return showOverlay(`
            <div class="panel panel-wide" role="dialog" aria-modal="true">
                <p class="kicker">DAILY CONTRACTS</p>
                <h2>TODAY'S OBJECTIVES</h2>
                <p class="section-note">Streak: <b>${streak}</b> day${streak === 1 ? "" : "s"} · rewards are paid automatically.</p>
                <div class="contract-list">
                    ${daily.map((c) => `
                        <div class="contract-row ${c.done ? "done" : ""}">
                            <div class="contract-info">
                                <b>${c.text}</b>
                                <div class="mini-track"><div class="hp" style="width:${Math.round(c.progress / c.target * 100)}%"></div></div>
                                <small>${Math.min(c.progress, c.target)} / ${c.target}</small>
                            </div>
                            <span class="contract-reward">${c.done ? "✓ PAID" : "+" + fmt(c.reward) + " CR"}</span>
                        </div>`).join("")}
                </div>
                <div class="panel-actions">
                    <button class="btn primary" data-action="close-info" type="button">◀ BACK</button>
                </div>
            </div>`);
    }

    function showAchievements(profile) {
        const list = achievementList(profile);
        return showOverlay(`
            <div class="panel panel-wide" role="dialog" aria-modal="true">
                <p class="kicker">PILOT RECORD</p>
                <h2>ACHIEVEMENTS ${achievementCount(profile)}/${list.length}</h2>
                <div class="hangar-scroll">
                    ${list.map((a) => `
                        <div class="upgrade-row ${a.unlocked ? "done" : ""}">
                            <div class="upgrade-info">
                                <b>${a.unlocked ? "🏆" : "○"} ${a.name}</b>
                                <small>${a.desc}</small>
                            </div>
                            <span class="contract-reward">${a.unlocked ? "DONE" : "+" + fmt(a.reward) + " CR"}</span>
                        </div>`).join("")}
                </div>
                <div class="panel-actions">
                    <button class="btn primary" data-action="close-info" type="button">◀ BACK</button>
                </div>
            </div>`);
    }

    function showDestroyed(state, profile) {
        showOverlay(`
            <div class="panel" role="dialog" aria-modal="true">
                <p class="kicker danger">HULL BREACH</p>
                <h2>SHIP DESTROYED</h2>
                <div class="result-grid">
                    <div><span>SCORE</span><b>${fmt(state.score)}</b></div>
                    <div><span>KILLS</span><b>${state.kills}</b></div>
                    <div><span>CARGO</span><b>LOST</b></div>
                </div>
                <div class="panel-actions">
                    <button class="btn primary" data-action="respawn" type="button">↻ RESPAWN AT STATION</button>
                    <button class="btn" data-action="restart" type="button">MAIN MENU</button>
                </div>
            </div>`);
    }

    function toast(text, kind) {
        if (!text) return;
        const node = document.createElement("div");
        node.className = "toast" + (kind ? " " + kind : "");
        node.textContent = text;
        el.toastArea.appendChild(node);
        while (el.toastArea.children.length > 4) {
            el.toastArea.removeChild(el.toastArea.firstChild);
        }
        setTimeout(() => {
            node.classList.add("fade");
            setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, 400);
        }, 2400);
        if (el.srStatus) el.srStatus.textContent = text;
    }

    function update(state, profile) {
        if (!state) return;
        const p = state.player;

        setText(el.level, String(profile.level));
        const need = xpForLevel(profile.level);
        setWidth(el.xpFill, profile.xp / need);
        setText(el.credits, fmt(profile.credits));
        setText(el.urium, fmt(profile.urium));
        setText(el.map, state.map.name);

        setWidth(el.shieldBar, p.shield / p.shieldMax);
        setText(el.shieldText, fmt(p.shield) + " / " + fmt(p.shieldMax));
        setWidth(el.hpBar, p.hp / p.hpMax);
        setText(el.hpText, fmt(p.hp) + " / " + fmt(p.hpMax));
        setWidth(el.cargoBar, state.cargoUsed / p.cargoMax);
        setText(el.cargoText, state.cargoUsed + " / " + p.cargoMax);

        setText(el.score, fmt(state.score));
        setText(el.kills, fmt(state.kills));
        setText(el.ammoName, AMMO[p.ammo].name);
        setText(el.ammoTag, AMMO[p.ammo].tag);

        // Abilities.
        for (const btn of abilityButtons) {
            const id = btn.getAttribute("data-ability");
            const def = ABILITIES.find((a) => a.id === id);
            const cd = p.abilityCd[id] || 0;
            const mask = btn.querySelector(".cd-mask");
            if (mask) setWidth(mask, def ? cd / def.cd : 0);
            if (cd <= 0) btn.classList.remove("cooling");
            else btn.classList.add("cooling");
        }

        // Target readout.
        const target = state.player.targetId
            ? state.enemies.find((e) => e.id === state.player.targetId && !e.dead)
            : null;
        if (target) {
            el.targetPanel.classList.remove("hidden");
            setText(el.targetName, target.def.name);
            setWidth(el.targetShield, target.shield / target.shieldMax);
            setWidth(el.targetHp, target.hp / target.hpMax);
        } else {
            el.targetPanel.classList.add("hidden");
        }

        // Galaxy Gate HUD.
        if (el.gateHUD) {
            const inGate = state.mode === "gate" && state.gate;
            el.gateHUD.classList.toggle("hidden", !inGate);
            if (inGate) {
                const g = state.gate;
                const secs = Math.ceil(g.timeLeft);
                setText(el.gateWave, "WAVE " + g.wave + " / 3");
                setText(el.gateTime, Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0"));
                setText(el.gateKills, Math.min(g.kills, g.target) + " / " + g.target + " KILLS");
                setWidth(el.gateFill, g.kills / g.target);
            }
        }

        // Safe haven feedback.
        if (el.safeBadge) el.safeBadge.classList.toggle("hidden", !state.docked || state.mode === "gate");
        if (el.fireBtn) el.fireBtn.classList.toggle("locked", !!state.docked);

        // Temporary effects.
        if (el.effects) {
            const chips = [];
            if (state.magnetTimer > 0) chips.push("◎ MAGNET " + Math.ceil(state.magnetTimer) + "s");
            if (state.overdriveTimer > 0) chips.push("» OVERDRIVE " + Math.ceil(state.overdriveTimer) + "s");
            const text = chips.join("  ·  ");
            setText(el.effects, text);
            el.effects.classList.toggle("hidden", !chips.length);
        }

        // Context actions.
        if (state.docked) {
            setText(el.phase, "SAFE ZONE · E SELL");
            el.dockBtn.classList.remove("hidden");
        } else {
            el.dockBtn.classList.add("hidden");
        }
        if (state.atGate) {
            setText(el.phase, "JUMP READY · J JUMP");
            el.jumpBtn.classList.remove("hidden");
        } else {
            el.jumpBtn.classList.add("hidden");
        }
        if (state.mode === "gate") setText(el.phase, "GATE RUN ACTIVE");
        else if (!state.docked && !state.atGate) setText(el.phase, "SECTOR ACTIVE");
        if (el.hangarBtn) el.hangarBtn.classList.toggle("hidden", !state.docked || state.mode === "gate");
        if (el.gateBtn) el.gateBtn.classList.toggle("hidden", !state.docked || state.mode === "gate");
    }

    function showInstall() {
        if (el.install) el.install.classList.remove("hidden");
    }
    function hideInstall() {
        if (el.install) el.install.classList.add("hidden");
    }

    return {
        update,
        toast,
        showMenu,
        showHangar,
        refreshHangar,
        showSettings,
        showContracts,
        showAchievements,
        showCoach,
        hideCoach,
        setDebug,
        showPause,
        showDestroyed,
        hideOverlay,
        showInstall,
        hideInstall
    };
}
