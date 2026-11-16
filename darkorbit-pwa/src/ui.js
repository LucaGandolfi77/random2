/*
 * DEEP ORBIT — HUD, overlays and the hangar.
 *
 * DOM updates are cached so the 60 Hz loop does not thrash the document.
 * Overlay buttons are wired through one delegated click handler with
 * `data-action`, so rebuilding the hangar never leaks listeners.
 */

import {
    SHIPS, UPGRADES, AMMO, ABILITIES, DRONE_MAX, droneCost, upgradeCost,
    RESOURCES, RESOURCE_IDS, xpForLevel, clamp
} from "./config.js";

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
        dockBtn: $("btn-dock"),
        jumpBtn: $("btn-jump"),
        hangarBtn: $("btn-hangar"),
        srStatus: $("sr-status"),
        install: $("install-prompt"),
        installBtn: $("install-btn"),
        installLater: $("install-later")
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
            "buy-drone": handlers.onBuyDrone
        };
        if (map[action]) map[action]();
        else if (action === "buy-upgrade" && handlers.onBuyUpgrade) handlers.onBuyUpgrade(value);
        else if (action === "buy-ship" && handlers.onBuyShip) handlers.onBuyShip(Number(value));
        else if (action === "select-ship" && handlers.onSelectShip) handlers.onSelectShip(Number(value));
    });

    function hideOverlay() {
        el.overlay.classList.add("hidden");
        el.overlay.innerHTML = "";
    }

    function showOverlay(html) {
        el.overlay.innerHTML = html;
        el.overlay.classList.remove("hidden");
    }

    function menuHTML(profile) {
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
                </div>
                <div class="panel-actions">
                    <button class="btn primary" data-action="play" type="button">▶ FLY</button>
                    <button class="btn" data-action="hangar" type="button">⚙ HANGAR</button>
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
                </div>
                <div class="panel-actions">
                    <button class="btn primary" data-action="${state ? "close-hangar" : "play"}" type="button">${state ? "◀ BACK TO FLIGHT" : "◀ BACK"}</button>
                </div>
            </div>`;
    }

    function showMenu(profile) {
        showOverlay(menuHTML(profile));
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
                    <button class="btn" data-action="mute" type="button">🔊 SOUND</button>
                    <button class="btn" data-action="restart" type="button">↻ MAIN MENU</button>
                </div>
                <p class="panel-hint">P / Esc resume · M mute</p>
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

        // Context actions.
        if (state.docked) {
            setText(el.phase, "DOCKED · E SELL");
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
        if (!state.docked && !state.atGate) setText(el.phase, "SECTOR ACTIVE");
        if (el.hangarBtn) el.hangarBtn.classList.toggle("hidden", !state.docked);
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
        showPause,
        showDestroyed,
        hideOverlay,
        showInstall,
        hideInstall
    };
}
