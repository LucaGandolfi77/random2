// Star Explorer Game Configuration
// All tunable numbers for the space adventure game

const CONFIG = {
    // Canvas and display
    canvas: {
        width: 800,
        height: 600,
        aspectRatio: 1.333
    },
    
    // Physics and movement
    physics: {
        shipSpeed: 5,
        bulletSpeed: 12,
        asteroidSpeed: 1,
        gravity: 0,
        friction: 0.98
    },
    
    // Game economy
    economy: {
        crystalValue: 10,
        startingLives: 3,
        crystalRegenRate: 0.5, // crystals per second
        levelTime: 60 // seconds per level
    },
    
    // Damage and collision
    combat: {
        shipDamage: 1,
        asteroidDamage: 1,
        bulletDamage: 2,
        explosionRadius: 30
    },
    
    // Scoring
    scoring: {
        crystalBonus: 10,
        survivalBonus: 5,
        levelCompletionBonus: 100,
        penaltyForDeath: -25
    },
    
    // Asteroid generation
    asteroids: {
        spawnRate: 2000, // milliseconds between spawns
        baseCount: 1,
        levelIncreaseCount: 0.5, // additional asteroids per level
        sizeVariation: 0.3,
        speedVariation: 0.2
    },
    
    // Player ship attributes
    ship: {
        width: 20,
        height: 30,
        thrustPower: 0.3,
        rotationSpeed: 0.05,
        maxVelocity: 8,
        shieldDuration: 3000, // milliseconds
        shieldCooldown: 5000
    },
    
    // Audio
    audio: {
        soundVolume: 0.7,
        musicVolume: 0.5,
        soundEnabled: true,
        hapticsEnabled: true
    },
    
    // Visual effects
    effects: {
        particleCount: 50,
        explosionDuration: 500,
        glowIntensity: 1.5,
        trailLength: 20
    }
};

export default CONFIG;