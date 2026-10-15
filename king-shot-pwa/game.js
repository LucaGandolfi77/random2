/*
 * King Shot PWA - iPhone-optimized shooting game
 * Features: Aim and shoot arrows at falling targets, themes, power-ups, particles, sound, offline support
 */
(function() {
    "use strict";

    /* ===== Config ===== */
    const config = {
        canvasWidth: 400,
        canvasHeight: 600,
        tickRate: 8,
        baseSpeed: 8,
        arrowSpeed: 12,
        enemySpeed: 4,
        spawnRate: 2.5,
        scoreForLevel: 100,
        gridColor: "#2a0a00",
        lineWidth: 1,
    };

    /* ===== Game State ===== */
    const state = {
        king: { x: 0, y: 0, radius: 12, angle: 0, power: 1 },
        arrow: null,
        enemies: [],
        score: 0,
        highScore: 0,
        level: 1,
        gameOver: false,
        paused: false,
        theme: "neon",
        spawnTimer: 0,
        aiming: false,
        aimAngle: 0,
        tickAccumulator: 0,
        lastUpdate: 0,
        frame: 0,
    };

    /* ===== Theme Definitions ===== */
    const themes = {
        neon: { bg: "#1a0d00", grid: "#2a0a00", king: "#ff6600", kingGrad: "#cc3300", arrow: "#fff", enemy: "#ff0000", powerup: "#00ffff" },
        retro: { bg: "#000", grid: "#111", king: "#00ffff", kingGrad: "#00ccff", arrow: "#ffff00", enemy: "#ff00ff", powerup: "#ff8800" },
        forest: { bg: "#0a1a00", grid: "#112200", king: "#00ff44", kingGrad: "#00cc33", arrow: "#fff", enemy: "#ffaa00", powerup: "#ff00aa" },
        ocean: { bg: "#0a0a1a", grid: "#12122a", king: "#00aaff", kingGrad: "#0088cc", arrow: "#ff6600", enemy: "#ff00aa", powerup: "#00ffcc" },
    };

    /* ===== DOM Cache ===== */
    const DOME = {
        canvas: null,
        ctx: null,
        scoreEl: null,
        highScoreEl: null,
        startBtn: null,
        pauseBtn: null,
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
        aimCircle: null,
    };

    /* ===== Sound Engine (shared: R2) ===== */
    const Sound = R2.makeSound({
        shoot: [440, 0.05, "triangle"],
        hit: [660, 0.1, "square"],
        powerup: [1320, 0.2, "sawtooth"],
        gameOver: [200, 0.4, "sine"],
        tick: [330, 0.05, "sine"],
    });

    /* ===== Particles (shared: R2) ===== */
    const Particles = R2.makeParticles();
    function spawnParticles(x, y, color, count = 8) { Particles.spawn(x, y, color, count); }
    function updateParticles(dt) { Particles.update(dt); }
    function drawParticles(ctx) { Particles.draw(ctx); }

    /* ===== Shared arcade helpers (R2) ===== */
    const buzz = R2.buzz;
    function markPlayed() { R2.markPlayed("king-shot-pwa/"); }

    /* ===== Game Init ===== */
    function init() {
        setupDOME();
        setupEventListeners();
        loadFromStorage();
        markPlayed();
        R2.trackPlaytime("king-shot-pwa/");
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
        DOME.aimCircle = document.getElementById("aim-circle");
    }

    /* ===== Event Handlers ===== */
    function setupEventListeners() {
        document.addEventListener("keydown", handleKey);
        DOME.canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
        DOME.canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
        DOME.canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
        DOME.canvas.addEventListener("mousedown", handleMouseDown);
        DOME.canvas.addEventListener("mousemove", handleMouseMove);
        DOME.canvas.addEventListener("mouseup", handleMouseUp);
        DOME.startBtn.addEventListener("click", startGame);
        DOME.pauseBtn.addEventListener("click", togglePause);
        DOME.overlayPlay.addEventListener("click", startGame);
        DOME.overlayTheme.addEventListener("click", cycleThemeOverlay);
        if (DOME.installBtn) DOME.installBtn.addEventListener("click", installApp);
        if (DOME.installLater) DOME.installLater.addEventListener("click", dismissInstall);
    }

    let touchStart = null, touchEnd = null;
    let mouseDown = false;

    function handleTouchStart(e) {
        e.preventDefault();
        if (state.gameOver || state.paused) return;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        // If not aiming yet, start aiming mode
        if (!state.aiming) {
            state.aiming = true;
            updateAimAngle(touchStart);
            DOME.aimCircle.classList.remove("hidden");
        }
    }
    function handleTouchMove(e) {
        e.preventDefault();
        if (state.gameOver || state.paused || !state.aiming) return;
        const touch = e.touches[0];
        const rect = DOME.canvas.getBoundingClientRect();
        const mx = (touch.clientX - rect.left) - config.canvasWidth / 2;
        const my = (touch.clientY - rect.top) - config.canvasHeight / 2;
        const dx = mx - state.king.x;
        const dy = my - state.king.y;
        state.aimAngle = Math.atan2(dy, dx);
    }
    function handleTouchEnd(e) {
        e.preventDefault();
        if (state.gameOver || state.paused) return;
        if (state.aiming) {
            shootArrow();
            state.aiming = false;
            DOME.aimCircle.classList.add("hidden");
        }
        touchStart = null;
    }

    function handleMouseDown(e) {
        if (state.gameOver || state.paused) return;
        e.preventDefault();
        mouseDown = true;
        if (!state.aiming) {
            state.aiming = true;
            updateAimAngle(e);
            DOME.aimCircle.classList.remove("hidden");
        }
    }
    function handleMouseMove(e) {
        if (state.gameOver || state.paused || !state.aiming) return;
        e.preventDefault();
        updateAimAngle(e);
    }
    function handleMouseUp(e) {
        if (state.gameOver || state.paused) return;
        e.preventDefault();
        if (state.aiming) {
            shootArrow();
            state.aiming = false;
            DOME.aimCircle.classList.add("hidden");
        }
        mouseDown = false;
    }

    function updateAimAngle(pos) {
        const rect = DOME.canvas.getBoundingClientRect();
        const mx = (pos.clientX - rect.left) - config.canvasWidth / 2;
        const my = (pos.clientY - rect.top) - config.canvasHeight / 2;
        const dx = mx - state.king.x;
        const dy = my - state.king.y;
        state.aimAngle = Math.atan2(dy, dx);
        // rotate aim circle? maybe rotate crosshair
        const angle = state.aimAngle + Math.PI / 2;
        DOME.aimCircle.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    }

    function shootArrow() {
        Sound.shoot();
        buzz(10);
        const angle = state.aimAngle;
        state.arrow = {
            x: state.king.x,
            y: state.king.y,
            vx: Math.cos(angle) * config.arrowSpeed,
            vy: Math.sin(angle) * config.arrowSpeed,
            life: 1,
        };
    }

    function handleKey(e) {
        if (e.repeat) return;
        if (e.code === "Space") {
            if (!state.gameOver && !state.paused) {
                if (state.aiming) {
                    shootArrow();
                    state.aiming = false;
                    DOME.aimCircle.classList.add("hidden");
                }
            }
        }
    }

    /* ===== Game Lifecycle ===== */
    function startGame() {
        resetGame();
        state.paused = false;
        hideOverlay();
        requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        const canvasWidth = config.canvasWidth;
        const canvasHeight = config.canvasHeight;
        state.king = {
            x: canvasWidth / 2,
            y: canvasHeight - 40,
            radius: 12,
            angle: 0,
        };
        state.arrow = null;
        state.enemies = [];
        Particles.clear();
        state.score = 0;
        state.level = 1;
        state.spawnTimer = 0;
        state.aiming = false;
        state.gameOver = false;
        state.tickAccumulator = 0;
        state.frame = 0;
        state.runStart = Date.now();
        spawnEnemy();
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
        state.tickAccumulator += dt * (config.baseSpeed + (state.level - 1) * 0.5);
        if (state.tickAccumulator >= 1 / config.tickRate) {
            state.tickAccumulator = 0;
            update();
        }
        updateParticles(dt);
        draw();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        state.frame++;
        // Spawn enemies
        state.spawnTimer += 1 / (config.baseSpeed + (state.level - 1) * 0.5);
        if (state.spawnTimer >= config.spawnRate) {
            spawnEnemy();
            state.spawnTimer = 0;
        }

        // Move arrow
        if (state.arrow) {
            state.arrow.x += state.arrow.vx;
            state.arrow.y += state.arrow.vy;
            state.arrow.life -= 0.02;
            // Check off-screen
            if (state.arrow.x < 0 || state.arrow.x > config.canvasWidth || state.arrow.y < 0 || state.arrow.y > config.canvasHeight || state.arrow.life <= 0) {
                state.arrow = null;
            }
        }

        // Update enemies
        for (const enemy of state.enemies) {
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            // Bounce off walls
            if (enemy.x < enemy.radius || enemy.x > config.canvasWidth - enemy.radius) enemy.vx *= -1;
            if (enemy.y < enemy.radius || enemy.y > config.canvasHeight - enemy.radius) enemy.vy *= -1;
        }

        // Arrow collision with enemies
        if (state.arrow) {
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                const e = state.enemies[i];
                const dx = state.arrow.x - e.x;
                const dy = state.arrow.y - e.y;
                const dist = Math.hypot(dx, dy);
                if (dist < state.arrow.life * 10 + e.radius) {
                    // Hit
                    Sound.hit();
                    buzz(15);
                    spawnParticles(e.x, e.y, themes[state.theme].powerup, 6);
                    state.enemies.splice(i, 1);
                    state.score += 10 * state.level;
                    // Occasionally spawn powerup
                    if (Math.random() < 0.2) {
                        state.enemies.push({ x: e.x, y: e.y, radius: 6, vx: 0, vy: 0, type: "powerup" });
                    }
                }
            }
        }

        // Level up
        if (state.score >= state.level * config.scoreForLevel) {
            state.level = Math.floor(state.score / config.scoreForLevel) + 1;
            // Increase difficulty
            config.spawnRate = Math.max(0.8, config.spawnRate - 0.1);
        }

        // Check game over (king hit by enemy? or if enemies reach bottom)
        // Simple: if any enemy reaches bottom
        for (const enemy of state.enemies) {
            if (enemy.y > config.canvasHeight - enemy.radius) {
                die();
                return;
            }
        }
    }

    function spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y, vx, vy, radius;
        if (side === 0) { // top
            x = Math.random() * config.canvasWidth;
            y = -10;
            vx = (Math.random() - 0.5) * 2;
            vy = config.enemySpeed;
            radius = 8;
        } else if (side === 1) { // bottom
            x = Math.random() * config.canvasWidth;
            y = config.canvasHeight + 10;
            vx = (Math.random() - 0.5) * 2;
            vy = -config.enemySpeed;
            radius = 8;
        } else if (side === 2) { // left
            x = -10;
            y = Math.random() * config.canvasHeight;
            vx = config.enemySpeed;
            vy = (Math.random() - 0.5) * 2;
            radius = 8;
        } else { // right
            x = config.canvasWidth + 10;
            y = Math.random() * config.canvasHeight;
            vx = -config.enemySpeed;
            vy = (Math.random() - 0.5) * 2;
            radius = 8;
        }
        state.enemies.push({ x, y, vx, vy, radius, type: "normal" });
    }

    function die() {
        Sound.gameOver();
        buzz([60, 40, 80]);
        state.gameOver = true;
        state.paused = true;
        saveHighScore();
        R2.stats.run({
            slug: "king-shot-pwa/",
            score: state.score,
            durMs: Date.now() - (state.runStart || Date.now()),
            wave: state.level,
            outcome: "loss"
        });
    }

    /* ===== Rendering ===== */
    function draw() {
        const ctx = DOME.ctx;
        const theme = themes[state.theme];
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

        // Grid
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = config.lineWidth;
        ctx.globalAlpha = 0.2;
        for (let x = 0; x <= config.canvasWidth; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, config.canvasHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= config.canvasHeight; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(config.canvasWidth, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // King
        const kingGrad = ctx.createRadialGradient(state.king.x - 4, state.king.y - 4, 0, state.king.x, state.king.y, state.king.radius);
        kingGrad.addColorStop(0, theme.king);
        kingGrad.addColorStop(1, theme.kingGrad);
        ctx.fillStyle = kingGrad;
        ctx.beginPath();
        ctx.arc(state.king.x, state.king.y, state.king.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", state.king.x, state.king.y - 6);

        // Arrow
        if (state.arrow) {
            ctx.fillStyle = theme.arrow;
            ctx.shadowColor = theme.arrow;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(state.arrow.x, state.arrow.y);
            ctx.lineTo(state.arrow.x - state.arrow.vx * 10, state.arrow.y - state.arrow.vy * 10);
            ctx.lineTo(state.arrow.x - state.arrow.vx * 8, state.arrow.y - state.arrow.vy * 8);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Enemies
        for (const e of state.enemies) {
            if (e.type === "powerup") {
                ctx.fillStyle = theme.powerup;
                ctx.shadowColor = theme.powerup;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = theme.enemy;
                ctx.shadowColor = theme.enemy;
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Particles
        drawParticles(ctx);

        // HUD (score, level)
        ctx.fillStyle = theme.text || "#fff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`LVL ${state.level}`, 8, 24);
        ctx.textAlign = "right";
        ctx.fillText(`${state.score}`, config.canvasWidth - 8, 24);

        if (state.paused && !state.gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
            ctx.fillStyle = theme.neon || "#fff";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("PAUSED", config.canvasWidth / 2, config.canvasHeight / 2);
        }

        if (state.aiming) {
            DOME.aimCircle.classList.remove("hidden");
        }

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

    /* ===== Overlay ===== */
    function showStartOverlay() {
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "KING SHOT";
        DOME.overlayMsg.textContent = "Tap and hold to aim, release to shoot. Protect the kingdom!";
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayPlay.classList.remove("hidden");
        DOME.overlayTheme.classList.remove("hidden");
    }

    function showGameOver() {
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "GAME OVER";
        DOME.overlayMsg.textContent = "Your kingdom fell!";
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
        const saved = localStorage.getItem("king-shot-pwa");
        if (saved) {
            const data = JSON.parse(saved);
            state.highScore = data.highScore || 0;
            state.theme = data.theme || "neon";
        }
        applyTheme(state.theme);
    }

    function saveToStorage() {
        localStorage.setItem("king-shot-pwa", JSON.stringify({
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
        localStorage.setItem("king-install-dismissed", "true");
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
        setTimeout(init, 300);
    });

})();
