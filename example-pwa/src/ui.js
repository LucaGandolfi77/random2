// Star Explorer Game UI
// User interface, HUD, and game screens

import CONFIG from './config.js';

function updateUI(gameState, player) {
    // Update HUD
    updateHUDElements(gameState, player);
    
    // Update game screens
    updateGameScreens(gameState);
    
    // Update menus
    updateMenus(gameState, player);
}

function updateHUDElements(gameState, player) {
    // Update crystal count
    const crystalsElement = document.getElementById('stat-crystals');
    if (crystalsElement) {
        crystalsElement.textContent = player.crystals;
    }
    
    // Update lives
    const livesElement = document.getElementById('stat-lives');
    if (livesElement) {
        livesElement.textContent = player.lives;
    }
    
    // Update level
    const levelElement = document.getElementById('stat-level');
    if (levelElement) {
        levelElement.textContent = player.level;
    }
    
    // Update score
    const scoreElement = document.getElementById('stat-score');
    if (scoreElement) {
        scoreElement.textContent = player.score;
    }
}

function updateGameScreens(gameState) {
    // Game over screen
    if (gameState.lives <= 0) {
        gameOverScreen();
    }
    
    // Level up screen
    if (gameState.level % 10 === 0) {
        levelUpScreen(gameState.level);
    }
}

function updateMenus(gameState, player) {
    // Update name input
    const nameInput = document.getElementById('name-input');
    if (nameInput && gameState.isMenuActive) {
        nameInput.focus();
    }
    
    // Update settings menu
    updateSettingsMenu();
}

function updateSettingsMenu() {
    const settingsKey = 'star-explorer-settings';
    const settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
    
    // Update sound toggle
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.textContent = settings.sound ? '🔊 Sound' : '🔇 Sound';
    }
    
    // Update haptics toggle
    const hapticsToggle = document.getElementById('haptics-toggle');
    if (hapticsToggle) {
        hapticsToggle.textContent = settings.haptics ? '📳 Haptics' : '🚫 Haptics';
    }
}

function gameOverScreen() {
    const gameOverDiv = document.getElementById('game-over');
    if (gameOverDiv) {
        gameOverDiv.classList.remove('hidden');
    }
}

function levelUpScreen(level) {
    const levelUpDiv = document.getElementById('level-up');
    if (levelUpDiv) {
        levelUpDiv.classList.remove('hidden');
        
        const message = document.getElementById('level-up-message');
        if (message) {
            message.textContent = `Level ${level}! You've unlocked new abilities!`;
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            levelUpDiv.classList.add('hidden');
        }, 3000);
    }
}

function createUIElements() {
    // Create HUD elements
    createHUDElements();
    
    // Create game screens
    createGameScreens();
    
    // Create menus
    createMenus();
}

function createHUDElements() {
    const hud = document.getElementById('hud');
    
    if (!hud) return;
    
    // Create crystal display
    const crystalsDisplay = document.createElement('div');
    crystalsDisplay.className = 'hud-element crystals';
    crystalsDisplay.innerHTML = '<span>💎</span><span id="stat-crystals">0</span>';
    hud.appendChild(crystalsDisplay);
    
    // Create lives display
    const livesDisplay = document.createElement('div');
    livesDisplay.className = 'hud-element lives';
    livesDisplay.innerHTML = '<span>❤️</span><span id="stat-lives">3</span>';
    hud.appendChild(livesDisplay);
    
    // Create level display
    const levelDisplay = document.createElement('div');
    levelDisplay.className = 'hud-element level';
    levelDisplay.innerHTML = '<span>⭐</span><span id="stat-level">1</span>';
    hud.appendChild(levelDisplay);
    
    // Create score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'hud-element score';
    scoreDisplay.innerHTML = '<span>🏆</span><span id="stat-score">0</span>';
    hud.appendChild(scoreDisplay);
}

function createGameScreens() {
    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over';
    gameOverScreen.className = 'screen hidden';
    gameOverScreen.innerHTML = `
        <div class="panel">
            <h2>Game Over</h2>
            <p>Your final score: <span id="final-score">0</span></p>
            <button id="play-again">Play Again</button>
            <button id="main-menu">Main Menu</button>
        </div>
    `;
    document.body.appendChild(gameOverScreen);
    
    // Create level up screen
    const levelUpScreen = document.createElement('div');
    levelUpScreen.id = 'level-up';
    levelUpScreen.className = 'screen hidden';
    levelUpScreen.innerHTML = `
        <div class="panel">
            <h2>Level Up!</h2>
            <p id="level-up-message">You reached level X!</p>
            <div class="level-up-rewards">
                <div class="reward">💎 +100 Crystals</div>
                <div class="reward">⭐ +50 Points</div>
            </div>
        </div>
    `;
    document.body.appendChild(levelUpScreen);
}

function createMenus() {
    // Create settings menu
    const settingsMenu = document.createElement('div');
    settingsMenu.id = 'settings-menu';
    settingsMenu.className = 'menu hidden';
    settingsMenu.innerHTML = `
        <div class="panel">
            <h2>Settings</h2>
            <div class="setting">
                <label>Sound</label>
                <button id="sound-toggle">🔊 Sound</button>
            </div>
            <div class="setting">
                <label>Haptics</label>
                <button id="haptics-toggle">📳 Haptics</button>
            </div>
            <button id="close-settings">Close</button>
        </div>
    `;
    document.body.appendChild(settingsMenu);
    
    // Add event listeners for settings
    const soundToggle = document.getElementById('sound-toggle');
    const hapticsToggle = document.getElementById('haptics-toggle');
    const closeSettings = document.getElementById('close-settings');
    
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('star-explorer-settings') || '{}');
            settings.sound = !settings.sound;
            localStorage.setItem('star-explorer-settings', JSON.stringify(settings));
            updateSettingsMenu();
        });
    }
    
    if (hapticsToggle) {
        hapticsToggle.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('star-explorer-settings') || '{}');
            settings.haptics = !settings.haptics;
            localStorage.setItem('star-explorer-settings', JSON.stringify(settings));
            updateSettingsMenu();
        });
    }
    
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            settingsMenu.classList.add('hidden');
        });
    }
}

function showSettingsMenu() {
    const settingsMenu = document.getElementById('settings-menu');
    if (settingsMenu) {
        settingsMenu.classList.remove('hidden');
    }
}

export {
    updateUI,
    createUIElements,
    showSettingsMenu
};