// Star Explorer Game Main
// Entry point and game loop

import CONFIG from './config.js';
import { loadState, saveState } from './storage.js';
import { render, clearScreen, updateCamera } from './render.js';
import { updateWorld, checkCollisions } from './world.js';
import { updatePlayer, handlePlayerInput } from './player.js';
import { updateUI } from './ui.js';

// Game state
let gameState = {
    isRunning: false,
    isPaused: false,
    lastTime: 0,
    deltaTime: 0,
    score: 0,
    level: 1,
    crystals: 0,
    lives: CONFIG.economy.startingLives,
    asteroidsDestroyed: 0,
    crystalsCollected: 0,
    gameStartTime: 0,
    timePlayed: 0
};

// Game objects
let player = null;
let asteroids = [];
let particles = [];

function init() {
    // Load saved state
    const savedState = loadState();
    Object.assign(gameState, savedState);
    
    // Initialize player
    player = {
        x: CONFIG.canvas.width / 2,
        y: CONFIG.canvas.height / 2,
        vx: 0,
        vy: 0,
        angle: 0,
        width: CONFIG.ship.width,
        height: CONFIG.ship.height,
        lives: gameState.lives,
        crystals: gameState.crystals,
        shieldActive: false,
        shieldExpires: 0,
        isAlive: true,
        score: gameState.currentScore || 0
    };
    
    // Initialize game objects
    asteroids = generateAsteroids();
    particles = [];
    
    // Setup event listeners
    setupEventListeners();
    
    // Start game loop
    gameState.lastTime = performance.now();
    gameState.isRunning = true;
    gameState.gameStartTime = Date.now();
    
    // Hide menu, show HUD
    const menuScreen = document.getElementById('screen-menu');
    const hud = document.getElementById('hud');
    menuScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    console.log('Star Explorer initialized');
}

function gameLoop(currentTime) {
    if (!gameState.isRunning) return;
    
    // Calculate delta time
    gameState.deltaTime = Math.min((currentTime - gameState.lastTime) / 1000, 0.1);
    gameState.lastTime = currentTime;
    
    // Update time played
    gameState.timePlayed += gameState.deltaTime;
    
    // Update game state
    updatePlayer(player, gameState.deltaTime);
    updateWorld(player, asteroids, particles, gameState.deltaTime);
    checkCollisions(player, asteroids, particles);
    
    // Render
    clearScreen();
    updateCamera(player);
    render(player, asteroids, particles);
    updateUI(gameState, player);
    
    // Save state periodically
    if (gameState.deltaTime > 0) {
        saveGameState();
    }
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

function saveGameState() {
    const state = {
        ...gameState,
        currentScore: player.score,
        lives: player.lives,
        crystals: player.crystals,
        highScore: Math.max(gameState.highScore, player.score),
        asteroidsDestroyed: gameState.asteroidsDestroyed,
        crystalsCollected: gameState.crystalsCollected
    };
    saveState(state);
}

function generateAsteroids() {
    const asteroidCount = CONFIG.asteroids.baseCount + (gameState.level - 1) * CONFIG.asteroids.levelIncreaseCount;
    const asteroids = [];
    
    for (let i = 0; i < asteroidCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const speed = CONFIG.physics.asteroidSpeed * (0.5 + Math.random() * CONFIG.asteroids.speedVariation);
        
        asteroids.push({
            x: CONFIG.canvas.width / 2 + Math.cos(angle) * distance,
            y: CONFIG.canvas.height / 2 + Math.sin(angle) * distance,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle: angle + Math.PI,
            size: 20 + Math.random() * 40,
            health: 1,
            id: Math.random().toString(36).substr(2, 9)
        });
    }
    
    return asteroids;
}

function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        handlePlayerInput(e, player);
        
        // Debug controls
        if (e.key === 'p') {
            togglePause();
        } else if (e.key === 'r') {
            resetProgress();
        }
    });
    
    // Mouse/Touch controls
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => {
        // Fire weapon
        if (player.isAlive) {
            shootBullet(player);
        }
    });
    
    // Install prompt
    setupInstallPrompt();
}

function shootBullet(shooter) {
    if (!shooter.isAlive) return;
    
    const bullet = {
        x: shooter.x + Math.cos(shooter.angle) * shooter.width / 2,
        y: shooter.y + Math.sin(shooter.angle) * shooter.height / 2,
        vx: Math.cos(shooter.angle) * CONFIG.physics.bulletSpeed,
        vy: Math.sin(shooter.angle) * CONFIG.physics.bulletSpeed,
        angle: shooter.angle,
        lifetime: 1.0,
        damage: CONFIG.combat.bulletDamage
    };
    
    // Add to particles array
    particles.push(bullet);
    
    // Play sound
    if (window.R2 && window.R2.play) {
        window.R2.play(440, 0.1, 'sine'); // beep sound
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        console.log('Game paused');
    } else {
        gameState.lastTime = performance.now();
        console.log('Game resumed');
    }
}

function gameOver() {
    gameState.isRunning = false;
    
    // Update statistics
    gameState.asteroidsDestroyed = asteroids.length;
    gameState.crystalsCollected = player.crystals;
    
    // Update high score
    if (player.score > gameState.highScore) {
        gameState.highScore = player.score;
        saveGameState();
    }
    
    // Show death screen
    const deathScreen = document.getElementById('screen-death');
    const deathTitle = document.getElementById('death-title');
    const deathSub = document.getElementById('death-sub');
    
    deathScreen.classList.remove('hidden');
    deathTitle.textContent = 'Mission Failed';
    deathSub.textContent = 'The void claimed you.';
    
    // Update stats
    document.getElementById('os-crystals').textContent = player.crystals;
    document.getElementById('os-best').textContent = player.score;
    document.getElementById('os-deaths').textContent = gameState.gamesPlayed;
    
    // Play death sound
    if (window.R2 && window.R2.play) {
        window.R2.play(220, 0.3, 'triangle');
    }
}

async function resetProgress() {
    if (confirm('Reset all progress? This cannot be undone.')) {
        const storage = await import('./storage.js');
        storage.resetProgress();
        init();
    }
}

function setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) {
            installPrompt.classList.remove('hidden');
        }
    });
    
    const installButton = document.getElementById('btn-install');
    const installLater = document.getElementById('btn-install-later');
    
    if (installButton && deferredPrompt) {
        installButton.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('App installed');
                }
                deferredPrompt = null;
            });
            installPrompt.classList.add('hidden');
        });
    }
    
    if (installLater) {
        installLater.addEventListener('click', () => {
            const installPrompt = document.getElementById('install-prompt');
            installPrompt.classList.add('hidden');
        });
    }
}

// Export functions for testing and global access
export {
    init,
    gameOver,
    gameState,
    player,
    asteroids,
    particles,
    shootBullet,
    generateAsteroids,
    saveGameState
};
/* Entry point: loaded as a module, so nothing runs until we call it. */
init();
