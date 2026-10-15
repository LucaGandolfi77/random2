/*
 * Snake PWA - Creative Progressive Web App
 * Features: Themes, Power-ups, Particles, Sound, Touch Controls, Install Prompt, Offline Support
 */
(function() {
    "use strict";

    /* ===== Config ===== */
    const config = {
        canvasWidth: 400,
        canvasHeight: 400,
        cellSize: 20,
        tickRate: 8,
        baseSpeed: 8,
        speedIncrement: 0.8,
        foodScore: 10,
        powerupScore: 50,
        initialLength: 4,
        gridColor: "#1a1a1a",
        lineWidth: 1,
    };

    /* ===== Game State ===== */
    const state = {
        snake: [],
        direction: { x: 1, y: 0 },
        nextDirection: { x: 1, y: 0 },
        food: null,
        powerup: null,
        powerupType: null,
        powerupTimer: 0,
        obstacles: [],
        score: 0,
        highScore: 0,
        level: 1,
        gameOver: false,
        paused: false,
        mode: "classic",
        dailySeed: 0,
        eaten: 0,
        theme: "neon",
        tickAccumulator: 0,
        lastUpdate: 0,
        timeLeft: 60,
        frame: 0,
    };

    /* ===== Theme Definitions ===== */
    const themes = {
        neon: { bg: "#050505", grid: "#111", snake: "#00ff00", snakeGrad: "#00cc00", food: "#ff0000", powerup: "#ff00ff" },
        retro: { bg: "#000", grid: "#111", snake: "#ff00ff", snakeGrad: "#ff00aa", food: "#ffff00", powerup: "#ff8800" },
        forest: { bg: "#0a1a0a", grid: "#112a11", snake: "#00cc44", snakeGrad: "#009933", food: "#0066cc", powerup: "#ffaa00" },
        ocean: { bg: "#0a0a1a", grid: "#12122a", snake: "#00aaff", snakeGrad: "#0088cc", food: "#ff6600", powerup: "#ff00aa" },
    };

    const foodEmojis = ["🍎", "🍓", "🍊", "🍌", "🍇", "🍓", "🍈"];
    const powerupEmojis = { rainbow: "🌈", clock: "⏰", star: "⭐" };

    /* ===== DOM Cache ===== */
    const DOME = {
        canvas: null,
        ctx: null,
        scoreEl: null,
        highScoreEl: null,
        startBtn: null,
        pauseBtn: null,
        themeBtn: null,
        modeBtn: null,
        overlay: null,
        overlayTitle: null,
        overlayMsg: null,
        overlayStats: null,
        overlayPlay: null,
        overlayTheme: null,
        finalScore: null,
        finalHigh: null,
        finalLevel: null,
        installPrompt: null,
        installBtn: null,
        installLater: null,
        swipeHint: null,
    };

    /* ===== Sound Engine (shared: R2) ===== */
    const Sound = R2.makeSound({
        eat: [220, 0.06, "triangle"],
        powerup: [660, 0.15, "square"],
        bounce: [110, 0.1, "sawtooth"],
        gameOver: [80, 0.4, "sine"],
        pickup: [440, 0.1, "triangle"],
        tick: [330, 0.05, "sine"],
    });

    /* ===== Particles (shared: R2) ===== */
    const Particles = R2.makeParticles();
    function spawnParticles(x, y, color, count = 8) { Particles.spawn(x, y, color, count); }
    function updateParticles(dt) { Particles.update(dt); }
    function drawParticles(ctx) { Particles.draw(ctx); }

    /* ===== Shared arcade helpers (R2) ===== */
    const buzz = R2.buzz;
    function markPlayed() { R2.markPlayed("snake-pwa/"); }

    /* ===== Game Init ===== */
    function init() {
        setupDOME();
        setupEventListeners();
        loadFromStorage();
        markPlayed();
        R2.trackPlaytime("snake-pwa/");
        R2.installHint();
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
        DOME.startBtn = document.getElementById("start-btn");
        DOME.pauseBtn = document.getElementById("pause-btn");
        DOME.themeBtn = document.getElementById("theme-btn");
        DOME.modeBtn = document.getElementById("mode-btn");
        DOME.overlay = document.getElementById("overlay");
        DOME.overlayTitle = document.getElementById("overlay-title");
        DOME.overlayMsg = document.getElementById("overlay-msg");
        DOME.overlayStats = document.getElementById("overlay-stats");
        DOME.overlayPlay = document.getElementById("overlay-play");
        DOME.overlayTheme = document.getElementById("overlay-theme");
        DOME.finalScore = document.getElementById("final-score");
        DOME.finalHigh = document.getElementById("final-high");
        DOME.finalLevel = document.getElementById("final-level");
        DOME.installPrompt = document.getElementById("install-prompt");
        DOME.installBtn = document.getElementById("install-btn");
        DOME.installLater = document.getElementById("install-later");
        DOME.swipeHint = document.getElementById("swipe-hint");
    }

    /* ===== Event Handlers ===== */
    function setupEventListeners() {
        document.addEventListener("keydown", handleKey);
        DOME.canvas.addEventListener("touchstart", handleTouch, { passive: false });
        DOME.canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
        DOME.startBtn.addEventListener("click", startGame);
        DOME.pauseBtn.addEventListener("click", togglePause);
        DOME.themeBtn.addEventListener("click", cycleTheme);
        DOME.modeBtn.addEventListener("click", cycleMode);
        DOME.overlayPlay.addEventListener("click", startGame);
        DOME.overlayTheme.addEventListener("click", cycleThemeOverlay);
        if (DOME.installBtn) DOME.installBtn.addEventListener("click", installApp);
        if (DOME.installLater) DOME.installLater.addEventListener("click", dismissInstall);
    }

    let touchStart = null, touchEnd = null;
    function handleTouch(e) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function handleTouchMove(e) {
        if (!touchStart) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) > 20) {
            if (absDx > absDy) {
                if (dx > 0) moveSnake(1, 0); else moveSnake(-1, 0);
            } else {
                if (dy > 0) moveSnake(0, 1); else moveSnake(0, -1);
            }
            touchStart = null;
        }
        e.preventDefault();
    }

    function handleKey(e) {
        if (e.repeat) return;
        switch(e.code) {
            case "ArrowUp": case "KeyW": moveSnake(0, -1); e.preventDefault(); break;
            case "ArrowDown": case "KeyS": moveSnake(0, 1); e.preventDefault(); break;
            case "ArrowLeft": case "KeyA": moveSnake(-1, 0); e.preventDefault(); break;
            case "ArrowRight": case "KeyD": moveSnake(1, 0); e.preventDefault(); break;
            case "Space": togglePause(); e.preventDefault(); break;
        }
    }

    function moveSnake(x, y) {
        if (state.snake.length > 1) {
            if (state.snake[0].x === state.snake[1].x + x && state.snake[0].y === state.snake[1].y + y) return;
        }
        state.nextDirection = { x, y };
    }

    /* ===== Game Lifecycle ===== */
    function startGame() {
        resetGame();
        state.paused = false;
        hideOverlay();
        requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        const cols = Math.floor(config.canvasWidth / config.cellSize);
        const rows = Math.floor(config.canvasHeight / config.cellSize);
        const startX = Math.floor(cols / 2);
        const startY = Math.floor(rows / 2);
        state.snake = [];
        for (let i = 0; i < config.initialLength; i++) {
            state.snake.unshift({ x: startX - i, y: startY });
        }
        state.direction = { x: 1, y: 0 };
        state.nextDirection = { x: 1, y: 0 };
        state.score = 0;
        state.level = 1;
        state.obstacles = [];
        state.powerup = null;
        state.powerupType = null;
        state.powerupTimer = 0;
        Particles.clear();
        state.eaten = 0;
        state.dailySeed = R2.dailySeed();
        if (state.mode === "daily") {
            const d = R2.loadJSON("snake-daily", null);
            state.highScore = (d && d.date === state.dailySeed) ? (d.high || 0) : 0;
        }
        state.tickAccumulator = 0;
        state.gameOver = false;
        state.timeLeft = 60;
        /* Run clock for the stats dashboard: a run lasts from here until
           die(), and resetGame() is the single entry point for both a fresh
           game and a restart, so this needs no extra call site. */
        state.runStart = Date.now();
        placeFood();
    }

    function togglePause() {
        if (state.gameOver) return;
        state.paused = !state.paused;
        if (!state.paused) requestAnimationFrame(gameLoop);
    }

    let lastTimestamp = 0;
    function gameLoop(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        if (state.paused) return;
        if (state.gameOver) {
            showGameOver();
            return;
        }
        state.tickAccumulator += dt * state.level * (state.mode === "time" ? 1.2 : 1);
        if (state.tickAccumulator >= 1 / (config.baseSpeed + (state.level - 1) * config.speedIncrement)) {
            state.tickAccumulator = 0;
            update();
        }
        updateParticles(dt);
        draw();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        state.direction = state.nextDirection;
        const head = { x: state.snake[0].x + state.direction.x, y: state.snake[0].y + state.direction.y };
        const cols = Math.floor(config.canvasWidth / config.cellSize);
        const rows = Math.floor(config.canvasHeight / config.cellSize);

        // Wall collision (classic: game over; others: wrap)
        if (state.mode === "classic") {
            if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || collision(head)) {
                die(); return;
            }
        } else {
            // Wrap mode
            if (head.x < 0) head.x = cols - 1;
            if (head.x >= cols) head.x = 0;
            if (head.y < 0) head.y = rows - 1;
            if (head.y >= rows) head.y = 0;
            if (collision(head)) { die(); return; }
        }

        state.snake.unshift(head);

        // Food eaten
        if (head.x === state.food.x && head.y === state.food.y) {
            state.score += config.foodScore * state.level;
            state.eaten++;
            spawnParticles(head.x * config.cellSize + 10, head.y * config.cellSize + 10, themes[state.theme].food, 10);
            Sound.eat();
            buzz(12);
            placeFood();
            maybeSpawnPowerup();
        } else if (state.powerup && head.x === state.powerup.x && head.y === state.powerup.y) {
            handlePowerup();
            buzz(20);
            state.powerup = null;
        } else {
            state.snake.pop();
        }

        // Powerup decay
        if (state.powerupTimer > 0) {
            state.powerupTimer -= 1;
            if (state.powerupTimer <= 0) {
                state.powerup = null;
                state.powerupType = null;
            }
        }

        // Time mode countdown
        if (state.mode === "time") {
            state.timeLeft -= 1 / (config.baseSpeed + (state.level - 1) * config.speedIncrement);
            if (state.timeLeft <= 0) die();
        }

        // Level up
        if (state.score > 0 && state.score % 100 === 0) {
            state.level = Math.floor(state.score / 100) + 1;
        }

        // Add obstacles as levels progress
        if (state.level > 1 && state.obstacles.length < state.level - 1 && Math.random() < 0.3) {
            addObstacle();
        }
    }

    function maybeSpawnPowerup() {
        const rng = (state.mode === "daily") ? R2.mulberry32(state.dailySeed + state.eaten * 7919 + 13) : null;
        const roll = rng ? rng() : Math.random();
        if (!state.powerup && roll < 0.2) {
            const cols = Math.floor(config.canvasWidth / config.cellSize);
            const rows = Math.floor(config.canvasHeight / config.cellSize);
            state.powerup = {
                x: Math.floor(rng() * cols),
                y: Math.floor(rng() * rows),
            };
            const types = ["rainbow", "clock", "star"];
            state.powerupType = types[Math.floor(rng() * types.length)];
            state.powerupTimer = 15;
        }
    }

    function handlePowerup() {
        spawnParticles(state.powerup.x * config.cellSize + 10, state.powerup.y * config.cellSize + 10, themes[state.theme].powerup, 15);
        Sound.powerup();
        switch(state.powerupType) {
            case "rainbow":
                state.score += config.powerupScore * 3;
                break;
            case "clock":
                state.timeLeft += 10;
                break;
            case "star":
                state.score += config.powerupScore;
                break;
        }
    }

    function collision(pos) {
        for (const seg of state.snake) {
            if (seg.x === pos.x && seg.y === pos.y) return true;
        }
        for (const obs of state.obstacles) {
            if (obs.x === pos.x && obs.y === pos.y) return true;
        }
        return false;
    }

    function addObstacle() {
        const cols = Math.floor(config.canvasWidth / config.cellSize);
        const rows = Math.floor(config.canvasHeight / config.cellSize);
        const rng = (state.mode === "daily") ? R2.mulberry32(state.dailySeed + state.obstacles.length * 104729 + 7) : null;
        const rx = rng || Math.random;
        let x, y;
        do {
            x = Math.floor(rx() * cols);
            y = Math.floor(rx() * rows);
        } while (state.snake.some(s => s.x === x && s.y === y) ||
                 state.obstacles.some(o => o.x === x && o.y === y));
        state.obstacles.push({ x, y });
    }

    function placeFood() {
        const cols = Math.floor(config.canvasWidth / config.cellSize);
        const rows = Math.floor(config.canvasHeight / config.cellSize);
        const empty = [];
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (!state.snake.some(s => s.x === x && s.y === y) &&
                    !state.obstacles.some(o => o.x === x && o.y === y)) {
                    empty.push({ x, y });
                }
            }
        }
        if (empty.length === 0) { state.gameOver = true; return; }
        const rng = (state.mode === "daily") ? R2.mulberry32(state.dailySeed + state.eaten * 7919) : null;
        const pick = rng ? rng() : Math.random();
        state.food = empty[Math.floor(pick * empty.length)];
    }

    function die() {
        Sound.gameOver();
        buzz([60, 40, 80]);
        state.gameOver = true;
        state.paused = true;
        R2.stats.run({
            slug: "snake-pwa/",
            score: state.score,
            durMs: Date.now() - (state.runStart || Date.now()),
            wave: state.level,
            outcome: "loss",
            meta: { mode: state.mode, eaten: state.eaten }
        });
    }

    /* ===== Rendering ===== */
    function draw() {
        const ctx = DOME.ctx;
        const theme = themes[state.theme];
        const cols = Math.floor(config.canvasWidth / config.cellSize);
        const rows = Math.floor(config.canvasHeight / config.cellSize);

        // Background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

        // Grid
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = config.lineWidth;
        ctx.globalAlpha = 0.3;
        for (let x = 0; x <= cols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * config.cellSize, 0);
            ctx.lineTo(x * config.cellSize, config.canvasHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * config.cellSize);
            ctx.lineTo(config.canvasWidth, y * config.cellSize);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Obstacles
        for (const obs of state.obstacles) {
            ctx.fillStyle = "#555";
            ctx.fillRect(obs.x * config.cellSize, obs.y * config.cellSize, config.cellSize, config.cellSize);
            ctx.strokeStyle = "#777";
            ctx.strokeRect(obs.x * config.cellSize, obs.y * config.cellSize, config.cellSize, config.cellSize);
        }

        // Food
        if (state.food) {
            const emoji = foodEmojis[state.level % foodEmojis.length];
            ctx.font = `${config.cellSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emoji, state.food.x * config.cellSize + config.cellSize / 2, state.food.y * config.cellSize + config.cellSize / 2);
        }

        // Powerup
        if (state.powerup) {
            const emoji = powerupEmojis[state.powerupType] || "⭐";
            ctx.fillStyle = theme.powerup;
            ctx.shadowColor = theme.powerup;
            ctx.shadowBlur = 10;
            ctx.font = `${config.cellSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emoji, state.powerup.x * config.cellSize + config.cellSize / 2, state.powerup.y * config.cellSize + config.cellSize / 2);
            ctx.shadowBlur = 0;
            ctx.fillStyle = theme.powerup;
            ctx.globalAlpha = 0.4 + 0.1 * Math.sin(state.frame / 5);
            ctx.fillRect(state.powerup.x * config.cellSize, state.powerup.y * config.cellSize, config.cellSize, config.cellSize);
            ctx.globalAlpha = 1;
        }

        // Snake
        const head = state.snake[0];
        const grad = ctx.createLinearGradient(0, 0, config.canvasWidth, config.canvasHeight);
        grad.addColorStop(0, theme.snake);
        grad.addColorStop(1, theme.snakeGrad);
        ctx.fillStyle = grad;

        for (let i = 0; i < state.snake.length; i++) {
            const seg = state.snake[i];
            ctx.beginPath();
            ctx.roundRect(seg.x * config.cellSize, seg.y * config.cellSize, config.cellSize, config.cellSize, 4);
            ctx.fill();
            // Eyes on head
            if (i === 0) {
                ctx.fillStyle = "#000";
                ctx.shadowColor = "transparent";
                const eyeSize = 3;
                const ex = seg.x * config.cellSize + (config.cellSize / 2) + state.direction.x * 2;
                const ey = seg.y * config.cellSize + (config.cellSize / 2) + state.direction.y * 2;
                ctx.beginPath();
                ctx.arc(ex - 3 + state.direction.x, ey - 3 + state.direction.y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex + 5 + state.direction.x, ey - 3 + state.direction.y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Particles
        drawParticles(ctx);

        // UI overlay (score, pause)
        ctx.fillStyle = theme.text || "#e0e0e0";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "left";
        ctx.fillText("Level " + state.level, 8, 24);
        if (state.mode === "time") {
            ctx.fillStyle = state.timeLeft < 10 ? "#ff0000" : (theme.neon || "#00ff00");
            ctx.fillText("Time: " + Math.max(0, Math.ceil(state.timeLeft)) + "s", 8, 44);
        }
        if (state.mode === "daily") {
            ctx.fillStyle = theme.neon || "#00ff00";
            ctx.fillText("DAILY " + state.dailySeed, 8, 44);
        }

        if (state.paused && !state.gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
            ctx.fillStyle = theme.neon || "#00ff00";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("PAUSED", config.canvasWidth / 2, config.canvasHeight / 2);
        }

        state.frame++;
        updateHUD();
    }

    function updateHUD() {
        DOME.scoreEl.textContent = state.score;
        DOME.highScoreEl.textContent = state.highScore;
    }

    /* ===== Theme ===== */
    function applyTheme(name) {
        document.documentElement.setAttribute("data-theme", name);
        state.theme = name;
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

    /* ===== Mode ===== */
    function cycleMode() {
        const modes = ["classic", "time", "daily"];
        const idx = modes.indexOf(state.mode);
        state.mode = modes[(idx + 1) % modes.length];
        saveToStorage();
    }

    /* ===== Overlay ===== */
    function showStartOverlay() {
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "SNAKE PWA";
        DOME.overlayMsg.textContent = "Arrow keys / Swipe to move. Space to pause. Collect food & power-ups!";
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayPlay.classList.remove("hidden");
        DOME.overlayTheme.classList.remove("hidden");
    }

    function showGameOver() {
        saveHighScore();
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "GAME OVER";
        DOME.overlayMsg.textContent = state.mode === "time" ? "Ran out of time!" : (state.mode === "daily" ? "The daily seed got you!" : "You hit something!");
        DOME.overlayStats.classList.remove("hidden");
        DOME.finalScore.textContent = state.score;
        DOME.finalHigh.textContent = state.highScore;
        DOME.finalLevel.textContent = state.level;
    }

    function hideOverlay() {
        DOME.overlay.classList.add("hidden");
    }

    /* ===== Storage ===== */
    function loadFromStorage() {
        const saved = localStorage.getItem("snake-pwa");
        if (saved) {
            const data = JSON.parse(saved);
            state.highScore = data.highScore || 0;
            state.theme = data.theme || "neon";
            state.mode = data.mode || "classic";
        }
        applyTheme(state.theme);
        if (state.mode === "daily") {
            const d = R2.loadJSON("snake-daily", null);
            state.highScore = (d && d.date === R2.dailySeed()) ? (d.high || 0) : 0;
        }
    }

    function saveToStorage() {
        localStorage.setItem("snake-pwa", JSON.stringify({
            highScore: state.highScore,
            theme: state.theme,
            mode: state.mode,
        }));
    }

    function saveHighScore() {
        if (state.mode === "daily") {
            const d = R2.loadJSON("snake-daily", null) || {};
            const prev = (d.date === state.dailySeed) ? (d.high || 0) : 0;
            R2.saveJSON("snake-daily", {
                date: state.dailySeed,
                high: Math.max(prev, state.score)
            });
            state.highScore = Math.max(prev, state.score);
            return;
        }
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
        localStorage.setItem("snake-install-dismissed", "true");
    }

    /* ===== PWA: Service Worker ===== */
    function setupServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("./service-worker.js")
                .then(reg => {
                    console.log("SW registered:", reg);
                })
                .catch(err => console.error("SW error:", err));
        }
    }

    /* ===== Start ===== */
    window.addEventListener("load", () => {
        // Delay init to let install prompt settle
        setTimeout(init, 300);
    });

})();
