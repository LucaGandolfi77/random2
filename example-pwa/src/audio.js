// Star Explorer Game Audio
// Sound effects and synthesized audio

import CONFIG from './config.js';

let audioContext = null;
let masterGain = null;
let soundGain = null;
let musicGain = null;

function initializeAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create gain nodes
        masterGain = audioContext.createGain();
        soundGain = audioContext.createGain();
        musicGain = audioContext.createGain();
        
        // Connect nodes
        soundGain.connect(masterGain);
        musicGain.connect(masterGain);
        masterGain.connect(audioContext.destination);
        
        // Set volumes
        masterGain.gain.value = CONFIG.audio.soundVolume;
        soundGain.gain.value = 1.0;
        musicGain.gain.value = 0.6;
        
        console.log('Audio system initialized');
    } catch (e) {
        console.log('Audio not supported:', e);
        audioContext = null;
    }
}

function playSound(frequency, duration, type = 'sine') {
    if (!audioContext || !CONFIG.audio.soundEnabled) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(soundGain);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

function playMusic(frequencies, duration, type = 'sine') {
    if (!audioContext || !CONFIG.audio.musicEnabled) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(musicGain);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequencies[0], audioContext.currentTime);
        
        // Create a simple melody
        frequencies.forEach((freq, index) => {
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.2);
        });
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Error playing music:', e);
    }
}

function playTone(frequency, duration, type = 'sine', volume = 1.0) {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(soundGain);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Error playing tone:', e);
    }
}

function playGameSounds() {
    // Play various game sounds
    const sounds = [
        { freq: 440, duration: 0.1, type: 'sine' },    // Button click
        { freq: 261, duration: 0.2, type: 'sine' },    // Note 1
        { freq: 329, duration: 0.2, type: 'sine' },    // Note 2
        { freq: 392, duration: 0.3, type: 'sine' },    // Note 3
        { freq: 523, duration: 0.4, type: 'sine' },    // Note 4
    ];n    
    sounds.forEach((sound, index) => {
        setTimeout(() => {
            playSound(sound.freq, sound.duration, sound.type);
        }, index * 50);
    });
}

function playExplosion(x, y) {
    // Create explosion sound
    const baseFreq = 220;
    const duration = 0.5;
    
    for (let i = 0; i < 5; i++) {
        const freq = baseFreq * Math.pow(2, (i - 2) / 12);
        const delay = i * 0.1;
        const expDuration = duration - delay;
        
        setTimeout(() => {
            playSound(freq, expDuration, 'sawtooth', 0.3);
        }, delay * 1000);
    }
}

function playCrystalPickup(x, y) {
    // Play crystal pickup sound
    const frequency = 880 + Math.random() * 200;
    playSound(frequency, 0.3, 'triangle', 0.8);
}

function playShieldActivate() {
    // Play shield activation sound
    playSound(554, 0.2, 'square', 0.5);
    playSound(587, 0.2, 'square', 0.5);
    playSound(622, 0.3, 'square', 0.5);
}

function playLevelUp() {
    // Play level up melody
    const melody = [523, 587, 659, 698];
    playMusic(melody, 1.0, 'sine');
}

function playHaptic(pattern) {
    if (CONFIG.audio.hapticsEnabled && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.log('Haptics not supported:', e);
        }
    }
}

function createGameMusic() {
    // Create looping background music
    const notes = [
        261, 293, 329, 349, 392, 440, 493, 523,
        587, 659, 698, 784
    ];
    
    let noteIndex = 0;
    
    function playNextNote() {
        if (!audioContext) return;
        
        const freq = notes[noteIndex];
        playSound(freq, 0.3, 'sine', 0.2);
        
        noteIndex = (noteIndex + 1) % notes.length;
        setTimeout(playNextNote, 200);
    }
    
    return {
        start: () => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            playNextNote();
        },
        stop: () => {
            // Stop all oscillators
        }
    };
}

function updateAudioSettings(settings) {
    if (soundGain) {
        soundGain.gain.value = settings.sound ? 1.0 : 0.0;
    }
    
    if (musicGain) {
        musicGain.gain.value = settings.music ? 0.6 : 0.0;
    }
    
    CONFIG.audio.soundEnabled = settings.sound;
    CONFIG.audio.hapticsEnabled = settings.haptics;
}

export {
    initializeAudio,
    playSound,
    playMusic,
    playTone,
    playGameSounds,
    playExplosion,
    playCrystalPickup,
    playShieldActivate,
    playLevelUp,
    playHaptic,
    createGameMusic,
    updateAudioSettings
};