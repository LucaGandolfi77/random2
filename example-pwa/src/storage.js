// Star Explorer Game Storage
// Device-local persistent state management

import CONFIG from './config.js';

const STORAGE_KEY = 'star-explorer-state';
const SETTINGS_KEY = 'star-explorer-settings';

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

function loadState() {
    return loadJSON(STORAGE_KEY, {
        // Game progress
        highScore: 0,
        currentScore: 0,
        level: 1,
        crystals: 0,
        lives: CONFIG.economy.startingLives,
        
        // Game state
        lastPlayed: Date.now(),
        gamesPlayed: 0,
        gamesWon: 0,
        
        // Unlocks
        unlockedShips: ['default'],
        unlockedWeapons: ['laser'],
        unlockedSkins: [],
        
        // Achievements
        achievements: [],
        
        // Statistics
        stats: {
            asteroidsDestroyed: 0,
            crystalsCollected: 0,
            timePlayed: 0, // seconds
            totalDistance: 0 // pixels traveled
        }
    });
}

function saveState(state) {
    saveJSON(STORAGE_KEY, state);
}

function loadSettings() {
    return loadJSON(SETTINGS_KEY, {
        sound: true,
        haptics: true,
        music: false,
        graphicsQuality: 'medium',
        controls: {
            invertYAxis: false,
            sensitivity: 1.0
        }
    });
}

function saveSettings(settings) {
    saveJSON(SETTINGS_KEY, settings);
}

function exportSave() {
    try {
        const state = loadState();
        const settings = loadSettings();
        return {
            state,
            settings,
            exportDate: Date.now(),
            version: '1.0'
        };
    } catch (e) {
        return null;
    }
}

function importSave(saveData) {
    try {
        if (!saveData || !saveData.state || !saveData.settings) return false;
        
        // Merge with existing data
        const currentState = loadState();
        const currentSettings = loadSettings();
        
        // Import state (but don't overwrite achievements)
        const mergedState = { ...currentState, ...saveData.state };
        if (currentState.achievements) {
            mergedState.achievements = [...currentState.achievements, ...saveData.state.achievements];
        }
        
        // Merge settings
        const mergedSettings = { ...currentSettings, ...saveData.settings };
        
        saveState(mergedState);
        saveSettings(mergedSettings);
        return true;
    } catch (e) {
        return false;
    }
}

function resetProgress() {
    const defaultState = {
        highScore: 0,
        currentScore: 0,
        level: 1,
        crystals: 0,
        lives: CONFIG.economy.startingLives,
        lastPlayed: Date.now(),
        gamesPlayed: 0,
        gamesWon: 0,
        unlockedShips: ['default'],
        unlockedWeapons: ['laser'],
        unlockedSkins: [],
        achievements: [],
        stats: {
            asteroidsDestroyed: 0,
            crystalsCollected: 0,
            timePlayed: 0,
            totalDistance: 0
        }
    };
    
    saveState(defaultState);
    return defaultState;
}

export {
    loadState,
    saveState,
    loadSettings,
    saveSettings,
    exportSave,
    importSave,
    resetProgress
};