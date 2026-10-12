/*
 * Plane PWA - iPhone-optimized plane shooter
 * Features: Aim and fly, shoot enemies, themes, particles, sound, offline support
 */
(function() {
    "use strict";

    /* ===== Config ===== */
    const config = {
        canvasWidth: 400,
        canvasHeight: 600,
        tickRate: 12,
        baseSpeed: 10,
        planeSpeed: 8,
        bulletSpeed: 12,
        enemySpeed: 6,
        spawnRate: 2,
        maxEnemies: 8,
        lineWidth: 1,
    };

    /* ===== Game State ===== */
    const state = {
        plane: { x: config.canvasWidth / 2, y: config.canvasHeight - 40, w: 20, h: 12, angle: 0 },
        bullets: [],
        enemies: [],
        particles: [],
        score: 0,
        highScore: 0,
        lives: 3,
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
        neon: { bg: "#0a0a1a", grid: "#1a1a2a", plane: "#ffaa00", planeGrad: "#cc8800", bullet: "#fff", enemy: "#ff3300", powerup: "#00ffff" },
        retro: { bg: "#000", grid: "#111", plane: "#00ffff", planeGrad: "#00ccff", bullet: "#ffff00", enemy: "#ff00ff", powerup: "#ff6600" },
        forest: { bg: "#0a1a00", grid: "#112200", plane: "#00ff44", planeGrad: "#00cc33", bullet: "#fff", enemy: "#ffaa00", powerup: "#ff00aa" },
        ocean: { bg: "#0a0a1a", grid: "#12122a", plane: "#00aaff", planeGrad: "#0088cc", bullet: "#ff6600", enemy: "#ff00aa", powerup: "#00ffcc" },
    };

    /* ===== DOM Cache ===== */
    const DOME = {
        canvas: null,
        ctx: null,
        scoreEl: null,
        highScoreEl: null,
        livesEl: null,
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
        finalLives: null,
        installPrompt: null,
        installBtn: null,
        installLater: null,
        aimCircle: null,
    };

    /* ===== Sound Engine ===== */
    const Sound = {
        ctx: null,
        init() {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
        },
        play(frequency, duration, type = "sine") {
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.frequency.value = frequency;
                osc.type = type;
                osc.start();
                gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                osc.stop(this.ctx.currentTime + duration);
            } catch(e) {}
        },
        engine() { this.play(440, 0.05, "triangle"); },
        shoot() { this.play(660, 0.05, "square"); },
        hit() { this.play(880, 0.1, "sawtooth"); },
        powerup() { this.play(1320, 0.2, "sine"); },
        gameOver() { this.play(200, 0.4, "sine"); },
        tick() { this.play(330, 0.05, "sine"); },
    };

    /* ===== Particle System ===== */
    function Particle(x, y, color) {
        return {
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            life: 1,
            color,
        };
    }
    function spawnParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            state.particles.push(Particle(x, y, color));
        }
    }
    function updateParticles(dt) {
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= dt * 3;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
    }
    function drawParticles(ctx) {
        const theme = themes[state.theme];
        for (const p of state.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /* ===== Game Init ===== */
    function init() {
        setupDOME();
        setupEventListeners();
        Sound.init();
        loadFromStorage();
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
        DOME.livesEl = document.getElementById("lives");
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
        DOME.finalLives = document.getElementById("final-lives");
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
        DOME.startBtn.addEventListener("click", startGame);
        DOME.pauseBtn.addEventListener("click", togglePause);
        DOME.overlayPlay.addEventListener("click", startGame);
        DOME.overlayTheme.addEventListener("click", cycleThemeOverlay);
        if (DOME.installBtn) DOME.installBtn.addEventListener("click", installApp);
        if (DOME.installLater) DOME.installLater.addEventListener("click", dismissInstall);
    }

    let touchStart = null;
    let mouseDown = false;

    function handleTouchStart(e) {
        e.preventDefault();
        if (state.gameOver || state.paused) return;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
        const dx = mx - state.plane.x;
        const dy = my - state.plane.y;
        state.aimAngle = Math.atan2(dy, dx);
    }
    function handleTouchEnd(e) {
        e.preventDefault();
        if (state.gameOver || state.paused) return;
        if (state.aiming) {
            shootBullet();
            state.aiming = false;
            DOME.aimCircle.classList.add("hidden");
        }
        touchStart = null;
    }

    function handleKey(e) {
        if (e.repeat) return;
        if (e.code === "Space") {
            if (!state.gameOver && !state.paused) {
                if (state.aiming) {
                    shootBullet();
                    state.aiming = false;
                    DOME.aimCircle.classList.add("hidden");
                }
            }
        }
    }

    function updateAimAngle(pos) {
        const rect = DOME.canvas.getBoundingClientRect();
        const mx = (pos.clientX - rect.left) - config.canvasWidth / 2;
        const my = (pos.clientY - rect.top) - config.canvasHeight / 2;
        const dx = mx - state.plane.x;
        const dy = my - state.plane.y;
        state.aimAngle = Math.atan2(dy, dx);
        const angle = state.aimAngle + Math.PI / 2;
        DOME.aimCircle.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    }

    function shootBullet() {
        Sound.shoot();
        const angle = state.aimAngle;
        state.bullets.push({
            x: state.plane.x,
            y: state.plane.y - 10,
            vx: Math.cos(angle) * config.bulletSpeed,
            vy: Math.sin(angle) * config.bulletSpeed,
            life: 1,
        });
    }

    /* ===== Game Lifecycle ===== */
    function startGame() {
        resetGame();
        state.paused = false;
        hideOverlay();
        requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        const cw = config.canvasWidth, ch = config.canvasHeight;
        state.plane = { x: cw / 2, y: ch - 40, w: 20, h: 12, angle: 0 };
        state.bullets = [];
        state.enemies = [];
        state.particles = [];
        state.score = 0;
        state.lives = 3;
        state.spawnTimer = 0;
        state.aiming = false;
        state.gameOver = false;
        state.tickAccumulator = 0;
        state.frame = 0;
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
        state.tickAccumulator += dt * (config.baseSpeed + (state.level || 1) - 1);
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
        state.spawnTimer += 1 / (config.baseSpeed + (state.level || 1) - 1);
        if (state.spawnTimer >= config.spawnRate && state.enemies.length < config.maxEnemies) {
            spawnEnemy();
            state.spawnTimer = 0;
        }
        for (const e of state.enemies) {
            e.y += e.vy;
        }
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const b = state.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life -= 0.02;
            if (b.x < 0 || b.x > config.canvasWidth || b.y < 0 || b.y > config.canvasHeight || b.life <= 0) {
                state.bullets.splice(i, 1);
            }
        }
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const b = state.bullets[i];
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const e = state.enemies[j];
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const dist = Math.hypot(dx, dy);
                if (dist < b.life * 10 + e.r) {
                    Sound.hit();
                    spawnParticles(e.x, e.y, themes[state.theme].powerup, 6);
                    state.enemies.splice(j, 1);
                    state.score += 10 * (state.level || 1);
                    if (Math.random() < 0.1) {
                        state.enemies.push({ x: e.x, y: e.y, r: 4, vy: -2, type: "powerup" });
                    }
                }
            }
        }
        for (const e of state.enemies) {
            if (e.type !== "powerup" && e.y > config.canvasHeight) {
                loseLife();
                return;
            }
        }
        if (state.score >= (state.level || 1) * 100) {
            state.level = Math.floor(state.score / 100) + 1;
        }
    }

    function spawnEnemy() {
        const side = Math.floor(Math.random() * 3);
        let x, y, vx, vy, r;
        if (side === 0) {
            x = Math.random() * config.canvasWidth;
            y = -10;
            vx = (Math.random() - 0.5) * 2;
            vy = config.enemySpeed;
            r = 8;
        } else if (side === 1) {
            x = Math.random() * config.canvasWidth;
            y = config.canvasHeight + 10;
            vx = (Math.random() - 0.5) * 2;
            vy = -config.enemySpeed;
            r = 8;
        } else {
            x = -10;
            y = Math.random() * config.canvasHeight;
            vx = config.enemySpeed;
            vy = (Math.random() - 0.5) * 2;
            r = 8;
        }
        state.enemies.push({ x, y, vx, vy, r, type: "normal" });
    }

    function loseLife() {
        state.lives--;
        if (state.lives <= 0) {
            die();
        }
    }

    function die() {
        Sound.gameOver();
        state.gameOver = true;
        state.paused = true;
        saveHighScore();
    }

    /* ===== Rendering ===== */
    function draw() {
        const ctx = DOME.ctx;
        const theme = themes[state.theme];
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
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
        // Plane
        const grad = ctx.createLinearGradient(state.plane.x - 6, state.plane.y - 6, state.plane.x + 6, state.plane.y + 6);
        grad.addColorStop(0, theme.plane);
        grad.addColorStop(1, theme.planeGrad);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(state.plane.x, state.plane.y);
        ctx.lineTo(state.plane.x - state.plane.w/2, state.plane.y + state.plane.h);
        ctx.lineTo(state.plane.x + state.plane.w/2, state.plane.y + state.plane.h);
        ctx.closePath();
        ctx.fill();
        // Bullets
        for (const b of state.bullets) {
            ctx.fillStyle = theme.bullet;
            ctx.shadowColor = theme.bullet;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        // Enemies
        for (const e of state.enemies) {
            if (e.type === "powerup") {
                ctx.fillStyle = theme.powerup;
                ctx.shadowColor = theme.powerup;
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = theme.enemy;
                ctx.shadowColor = theme.enemy;
                ctx.shadowBlur = 4;
            }
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        drawParticles(ctx);
        // HUD
        ctx.fillStyle = theme.text || "#fff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`LIVES ${state.lives}`, 8, 24);
        ctx.fillText(`SCORE ${state.score}`, 8, 44);
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
        DOME.livesEl.textContent = state.lives;
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
        DOME.overlayTitle.textContent = "PLANE PWA";
        DOME.overlayMsg.textContent = "Tap and hold to aim, release to fire. Dodge enemies!";
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayPlay.classList.remove("hidden");
        DOME.overlayTheme.classList.remove("hidden");
    }

    function showGameOver() {
        DOME.overlay.classList.remove("hidden");
        DOME.overlayTitle.textContent = "GAME OVER";
        DOME.overlayMsg.textContent = "Your plane crashed!";
        DOME.overlayStats.classList.remove("hidden");
        DOME.finalScore.textContent = state.score;
        DOME.finalHigh.textContent = state.highScore;
        DOME.finalLives.textContent = state.lives;
    }

    function hideOverlay() {
        DOME.overlay.classList.add("hidden");
    }

    /* ===== Storage ===== */
    function loadFromStorage() {
        const saved = localStorage.getItem("plane-pwa");
        if (saved) {
            const data = JSON.parse(saved);
            state.highScore = data.highScore || 0;
            state.theme = data.theme || "neon";
        }
        applyTheme(state.theme);
    }

    function saveToStorage() {
        localStorage.setItem("plane-pwa", JSON.stringify({
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
        localStorage.setItem("plane-install-dismissed", "true");
    }

    /* ===== PWA: Service Worker ===== */
    function setupServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("./service-worker.js")
                .then(reg => console.log("SW registered:", reg))
                .catch(err => console.error("SW error:", err));
        }
    }

    /* ===== Start ===== */
    window.addEventListener("load", () => {
        setTimeout(init, 300);
    });

})();
