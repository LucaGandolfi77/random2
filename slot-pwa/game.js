/*
 * Slot PWA - iPhone-optimized slot machine
 * Features: Spin reels, win combinations, themes, particles, sound, offline support
 */
(function() {
    "use strict";

    /* ===== Config ===== */
    const config = {
        canvasWidth: 300,
        canvasHeight: 200,
        reelCount: 3,
        symbolsPerReel: 30,
        spinDuration: 2000,
        minSpeed: 0.08,
        maxSpeed: 0.3,
        tickRate: 60,
        lineWidth: 2,
        payoutTable: {
            '🍇': 5,
            '🍎': 4,
            '🍊': 3,
            '🍋': 2,
            '🔔': 10,
            '⭐': 15,
            '💰': 20,
            '🍀': 50,
        },
        symbols: ['🍇','🍎','🍊','🍋','🔔','⭐','💰','🍀'],
        baseJackpot: 500,
        jackpotStep: 5,
    };

    /* ===== Game State ===== */
    const state = {
        reels: [], // each reel: { offset: 0, speed: 0, stopAt: 0, width: 0, symbols: [] }
        score: 0,
        highScore: 0,
        bet: 1,
        jackpot: 500,
        freeSpins: 0,
        jackpotFlashUntil: 0,
        freeSpinFlashUntil: 0,
        spinning: false,
        gameOver: false,
        paused: false,
        theme: "neon",
        lastUpdate: 0,
        frame: 0,
    };

    /* ===== Theme Definitions ===== */
    const themes = {
        neon: { bg: "#1a1a2a", grid: "#2a2a4a", symbol: "#ffcc00", neonGlow: "#ffcc00", text: "#fff" },
        retro: { bg: "#000", grid: "#111", symbol: "#00ffff", neonGlow: "#00ffff", text: "#ff0" },
        forest: { bg: "#0a1a00", grid: "#112200", symbol: "#00ff44", neonGlow: "#00ff44", text: "#fff" },
        ocean: { bg: "#0a0a1a", grid: "#12122a", symbol: "#00aaff", neonGlow: "#00aaff", text: "#fff" },
    };

    /* ===== DOM Cache ===== */
    const DOME = {
        canvas: null,
        ctx: null,
        scoreEl: null,
        highScoreEl: null,
        betEl: null,
        spinBtn: null,
        themeBtn: null,
        betBtn: null,
        overlay: null,
        overlayTitle: null,
        overlayMsg: null,
        overlayStats: null,
        overlayPlay: null,
        overlayTheme: null,
        finalScore: null,
        finalHigh: null,
        installPrompt: null,
        installBtn: null,
        installLater: null,
    };

    /* ===== Sound Engine (shared: R2) ===== */
    const Sound = R2.makeSound({
        spinTick: [220, 0.05, "triangle"],
        win: [880, 0.2, "sawtooth"],
        lose: [110, 0.2, "sine"],
    });

    /* ===== Particles (shared: R2) ===== */
    const Particles = R2.makeParticles();
    function spawnParticles(x, y, color, count = 12) { Particles.spawn(x, y, color, count); }
    function updateParticles(dt) { Particles.update(dt); }
    function drawParticles(ctx) { Particles.draw(ctx); }

    /* ===== Shared arcade helpers (R2) ===== */
    const buzz = R2.buzz;
    function markPlayed() { R2.markPlayed("slot-pwa/"); }

    /* ===== Game Init ===== */
    function init() {
        setupDOME();
        setupEventListeners();
        loadFromStorage();
        markPlayed();
        R2.trackPlaytime("slot-pwa/");
        R2.installHint();
        loadJackpot();
        setupServiceWorker();
        setupInstallPrompt();
        applyTheme(state.theme);
        draw();
        showStartOverlay();
    }

    /* ===== DOM Setup ===== */
    function setupDOME() {
        DOME.canvas = document.getElementById("game-canvas");
        DOME.ctx = DOME.canvas.getContext("2d");
        DOME.canvas.width = config.canvasWidth;
        DOME.canvas.height = config.canvasHeight;
        DOME.scoreEl = document.getElementById("score");
        DOME.highScoreEl = document.getElementById("high-score");
        DOME.betEl = document.getElementById("bet");
        DOME.spinBtn = document.getElementById("spin-button");
        DOME.themeBtn = document.getElementById("theme-btn");
        DOME.betBtn = document.getElementById("bet-btn");
        DOME.overlay = document.getElementById("overlay");
        DOME.overlayTitle = document.getElementById("overlay-title");
        DOME.overlayMsg = document.getElementById("overlay-msg");
        DOME.overlayStats = document.getElementById("overlay-stats");
        DOME.overlayPlay = document.getElementById("overlay-play");
        DOME.overlayTheme = document.getElementById("overlay-theme");
        DOME.finalScore = document.getElementById("final-score");
        DOME.finalHigh = document.getElementById("final-high");
        DOME.installPrompt = document.getElementById("install-prompt");
        DOME.installBtn = document.getElementById("install-btn");
        DOME.installLater = document.getElementById("install-later");
    }

    /* ===== Event Handlers ===== */
    function setupEventListeners() {
        document.addEventListener("keydown", handleKey);
        DOME.spinBtn.addEventListener("click", startSpin);
        DOME.themeBtn.addEventListener("click", cycleTheme);
        DOME.betBtn.addEventListener("click", increaseBet);
        DOME.overlayPlay.addEventListener("click", startGame);
        DOME.overlayTheme.addEventListener("click", cycleThemeOverlay);
        if (DOME.installBtn) DOME.installBtn.addEventListener("click", installApp);
        if (DOME.installLater) DOME.installLater.addEventListener("click", dismissInstall);
    }

    function handleKey(e) {
        if (e.code === "Space") {
            e.preventDefault();
            if (!state.spinning && !state.gameOver) startSpin();
        }
    }

    /* ===== Game Lifecycle ===== */
    function startGame() {
        resetGame();
        hideOverlay();
        requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        const cw = config.canvasWidth, ch = config.canvasHeight;
        state.score = 0;
        state.bet = 1;
        state.spinning = false;
        state.gameOver = false;
        state.jackpotFlashUntil = 0;
        state.freeSpinFlashUntil = 0;
        Particles.clear();
        state.frame = 0;
        // Initialize reels
        const symbols = config.symbols;
        const reelSymbols = Array(config.symbolsPerReel).fill(symbols).flat();
        state.reels = [];
        const reelWidth = cw / config.reelCount - 4; // spacing
        for (let i = 0; i < config.reelCount; i++) {
            const offset = Math.floor(Math.random() * 20);
            state.reels.push({
                offset,
                speed: 0,
                stopAt: 0,
                width: reelWidth,
                symbols: reelSymbols,
            });
        }
    }

    function startSpin() {
        if (state.spinning) return;
        if (state.freeSpins > 0) {
            state.freeSpins--;
        } else {
            state.jackpot += config.jackpotStep * state.bet;
            R2.saveJSON("slot-jackpot", state.jackpot);
        }
        Sound.spinTick();
        buzz(10);
        state.spinning = true;
        const now = Date.now();
        for (const reel of state.reels) {
            reel.speed = Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed;
            const delay = Math.random() * 1000 + 500;
            reel.stopAt = now + delay;
        }
        // start spin interval for sound
        if (!state.spinInterval) {
            state.spinInterval = setInterval(() => Sound.spinTick(), 200);
        }
    }

    function stopAllReels() {
        for (const reel of state.reels) {
            reel.speed = 0;
            reel.offset = Math.floor(Math.random() * (reel.symbols.length - 20)) + 10;
        }
        state.spinning = false;
        clearInterval(state.spinInterval);
        state.spinInterval = null;
        checkWin();
    }

    function checkWin() {
        const centerRow = 1; // middle symbol index
        const symbols = state.reels.map(reel => {
            const idx = (reel.offset + centerRow) % reel.symbols.length;
            return reel.symbols[idx];
        });
        const first = symbols[0];
        if (symbols.every(s => s === first)) {
            const payout = config.payoutTable[first] || 0;
            let winAmount = payout * state.bet;
            if (first === '💰') {
                // JACKPOT: the whole meter, then it resets
                winAmount += state.jackpot;
                state.jackpot = config.baseJackpot;
                R2.saveJSON("slot-jackpot", state.jackpot);
                state.jackpotFlashUntil = Date.now() + 2600;
                jackpotArpeggio();
                spawnParticles(config.canvasWidth / 2, config.canvasHeight / 2, "#ffd700", 40);
            }
            if (first === '⭐') {
                state.freeSpins += 5;
                state.freeSpinFlashUntil = Date.now() + 2200;
            }
            state.score += winAmount;
            if (state.score > state.highScore) {
                state.highScore = state.score;
                saveHighScore();
            }
            if (first !== '💰') Sound.win();
            buzz([20, 30, 20]);
            spawnParticles(config.canvasWidth / 2, config.canvasHeight / 2, themes[state.theme].neonGlow, 20);
        } else {
            Sound.lose();
            buzz(8);
        }
        // free spins auto-play
        if (state.freeSpins > 0) {
            setTimeout(function () {
                if (!state.spinning && !state.gameOver) startSpin();
            }, 800);
        }
    }

    function jackpotArpeggio() {
        [523, 659, 784, 1047].forEach(function (f, i) {
            setTimeout(function () { Sound.play(f, 0.22, "square"); }, i * 140);
        });
    }

    function loadJackpot() {
        const j = R2.loadJSON("slot-jackpot", null);
        state.jackpot = (typeof j === "number" && j >= config.baseJackpot) ? j : config.baseJackpot;
    }

    function increaseBet() {
        if (!state.spinning) {
            state.bet = Math.min(state.bet + 1, 10);
        }
    }

    function cycleTheme() {
        const names = Object.keys(themes);
        const idx = names.indexOf(state.theme);
        state.theme = names[(idx + 1) % names.length];
        applyTheme(state.theme);
        saveToStorage();
    }

    function cycleThemeOverlay() {
        cycleTheme();
    }

    /* ===== Overlay ===== */
    function showStartOverlay() {
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "SLOT PWA";
        DOME.overlayMsg.textContent = "Tap SPIN to play. Three 💰 hit the jackpot — three ⭐ grant 5 free spins!";
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayPlay.classList.remove("hidden");
        DOME.overlayTheme.classList.remove("hidden");
    }

    function hideOverlay() {
        DOME.overlay.classList.add("hidden");
    }

    /* ===== Storage ===== */
    function loadFromStorage() {
        const saved = localStorage.getItem("slot-pwa");
        if (saved) {
            const data = JSON.parse(saved);
            state.highScore = data.highScore || 0;
            state.theme = data.theme || "neon";
        }
        applyTheme(state.theme);
    }

    function saveToStorage() {
        localStorage.setItem("slot-pwa", JSON.stringify({
            highScore: state.highScore,
            theme: state.theme,
        }));
    }

    function saveHighScore() {
        state.highScore = Math.max(state.highScore, state.score);
        saveToStorage();
    }

    /* ===== PWA: Install Prompt ===== */
    let deferredPrompt = null;
    function setupInstallPrompt() {
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            deferredPrompt = e;
            DOME.installPrompt.classList.remove("hidden");
        });
    }
    function installApp() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                DOME.installPrompt.classList.add("hidden");
                deferredPrompt = null;
            });
        }
    }
    function dismissInstall() {
        DOME.installPrompt.classList.add("hidden");
        localStorage.setItem("slot-install-dismissed", "true");
    }

    /* ===== PWA: Service Worker ===== */
    function setupServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("./service-worker.js")
                .then(reg => console.log("SW registered:", reg))
                .catch(err => console.error("SW error:", err));
        }
    }

    /* ===== Rendering ===== */
    function draw() {
        const ctx = DOME.ctx;
        const theme = themes[state.theme];
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

        // Draw reels
        const reelWidth = config.canvasWidth / config.reelCount;
        for (let r = 0; r < config.reelCount; r++) {
            const reel = state.reels[r];
            const x = r * reelWidth + reelWidth / 2;
            ctx.save();
            ctx.translate(x, 0);
            // Draw three symbols
            for (let i = 0; i < 3; i++) {
                const idx = (reel.offset + i) % reel.symbols.length;
                const symbol = reel.symbols[idx];
                ctx.font = "bold 32px Arial";
                ctx.fillStyle = theme.symbol;
                if (state.spinning) {
                    ctx.shadowColor = theme.neonGlow;
                    ctx.shadowBlur = 10;
                }
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(symbol, 0, i * 60 + 40);
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        }

        drawParticles(ctx);

        // HUD
        ctx.fillStyle = theme.text;
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`SCORE ${state.score}`, 8, 24);
        ctx.fillText(`HIGH ${state.highScore}`, 8, 44);
        ctx.fillText(`BET ${state.bet}`, 8, 64);
        ctx.textAlign = "right";
        ctx.fillStyle = theme.neonGlow;
        ctx.font = "bold 13px Arial";
        ctx.fillText(`JACKPOT ${state.jackpot}`, config.canvasWidth - 8, 24);
        if (state.freeSpins > 0) {
            ctx.fillText(`FREE ${state.freeSpins}`, config.canvasWidth - 8, 44);
        }
        ctx.textAlign = "left";
        const now = Date.now();
        if (now < state.jackpotFlashUntil) {
            ctx.fillStyle = "rgba(255,215,0," + (0.4 + 0.3 * Math.sin(now / 90)).toFixed(3) + ")";
            ctx.font = "bold 30px Arial";
            ctx.textAlign = "center";
            ctx.fillText("JACKPOT!", config.canvasWidth / 2, config.canvasHeight / 2 - 20);
        } else if (now < state.freeSpinFlashUntil) {
            ctx.fillStyle = "rgba(255,255,255," + (0.4 + 0.3 * Math.sin(now / 90)).toFixed(3) + ")";
            ctx.font = "bold 26px Arial";
            ctx.textAlign = "center";
            ctx.fillText("+5 FREE SPINS", config.canvasWidth / 2, config.canvasHeight / 2 - 20);
        }
        ctx.font = "bold 14px Arial";
        if (state.spinning) {
            ctx.fillStyle = theme.neonGlow;
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.fillText("SPINNING...", config.canvasWidth / 2, config.canvasHeight - 20);
        }

        updateHUD();
    }

    function updateHUD() {
        DOME.scoreEl.textContent = state.score;
        DOME.highScoreEl.textContent = state.highScore;
        DOME.betEl.textContent = state.bet;
    }

    /* ===== Theme ===== */
    function applyTheme(name) {
        document.documentElement.setAttribute("data-theme", name);
        state.theme = name;
    }

    /* ===== Game Loop ===== */
    let lastTimestamp = 0;
    function gameLoop(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        if (state.spinning) {
            const now = Date.now();
            let anyActive = false;
            for (const reel of state.reels) {
                if (reel.speed > 0) {
                    anyActive = true;
                    reel.offset += reel.speed * dt * 1000;
                    if (now >= reel.stopAt) {
                        reel.speed = 0;
                        reel.offset = Math.floor(Math.random() * (reel.symbols.length - 20)) + 10;
                    }
                }
            }
            if (!anyActive) {
                state.spinning = false;
                clearInterval(state.spinInterval);
                state.spinInterval = null;
                checkWin();
            }
        }
        updateParticles(dt);
        draw();
        requestAnimationFrame(gameLoop);
    }

    /* ===== Start ===== */
    window.addEventListener("load", () => {
        setTimeout(init, 300);
    });

})();
