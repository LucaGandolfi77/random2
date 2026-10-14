// Star Explorer Game World
// Physics simulation, asteroid movement, and game logic

import CONFIG from './config.js';

function updateWorld(player, asteroids, particles, deltaTime) {
    // Update player physics
    updatePlayerMovement(player, deltaTime);
    
    // Update asteroids
    asteroids.forEach(asteroid => {
        updateAsteroid(asteroid, deltaTime);
        wrapAsteroidAroundScreen(asteroid);
        updateAsteroidRotation(asteroid, deltaTime);
    });
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        updateParticle(particle, deltaTime);
        
        if (particle.lifetime <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Generate new asteroids
    if (Math.random() < CONFIG.asteroids.spawnRate * deltaTime / 1000) {
        createNewAsteroids(asteroids);
    }
    
    // Update crystal pickup system
    updateCrystalPickup(player);
    
    // Check level progression
    checkLevelProgression(player);
}

function updatePlayerMovement(player, deltaTime) {
    // Apply thrust
    if (player.isAlive) {
        const thrustForce = CONFIG.ship.thrustPower * 100;
        player.vx += Math.cos(player.angle) * thrustForce * deltaTime;
        player.vy += Math.sin(player.angle) * thrustForce * deltaTime;
    }
    
    // Apply friction
    player.vx *= CONFIG.physics.friction ** deltaTime;
    player.vy *= CONFIG.physics.friction ** deltaTime;
    
    // Apply velocity cap
    const velocity = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (velocity > CONFIG.ship.maxVelocity) {
        const scale = CONFIG.ship.maxVelocity / velocity;
        player.vx *= scale;
        player.vy *= scale;
    }
    
    // Update position
    player.x += player.vx;
    player.y += player.vy;
    
    // Screen boundaries
    constrainToScreen(player);
}

function updateAsteroid(asteroid, deltaTime) {
    // Move asteroid
    asteroid.x += asteroid.vx * deltaTime;
    asteroid.y += asteroid.vy * deltaTime;
    
    // Wrap around screen
    wrapAsteroidAroundScreen(asteroid);
}

function wrapAsteroidAroundScreen(asteroid) {
    const buffer = 50;
    
    if (asteroid.x < -buffer) asteroid.x = CONFIG.canvas.width + buffer;
    if (asteroid.x > CONFIG.canvas.width + buffer) asteroid.x = -buffer;
    if (asteroid.y < -buffer) asteroid.y = CONFIG.canvas.height + buffer;
    if (asteroid.y > CONFIG.canvas.height + buffer) asteroid.y = -buffer;
}

function updateAsteroidRotation(asteroid, deltaTime) {
    asteroid.angle += 0.05 * deltaTime;
}

function updateParticle(particle, deltaTime) {
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vy += 0.1 * deltaTime; // gravity
    particle.lifetime -= deltaTime * 2;
    
    // Apply friction to particles
    particle.vx *= 0.99;
    particle.vy *= 0.99;
}

function createNewAsteroids(asteroids) {
    const asteroidCount = CONFIG.asteroids.baseCount + (player.level - 1) * CONFIG.asteroids.levelIncreaseCount;
    const existingCount = asteroids.length;
    
    if (existingCount < asteroidCount) {
        for (let i = 0; i < asteroidCount - existingCount; i++) {
            spawnNewAsteroid(asteroids);
        }
    }
}

function spawnNewAsteroid(asteroids) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 300;
    const speed = CONFIG.physics.asteroidSpeed * (0.5 + Math.random() * CONFIG.asteroids.speedVariation);
    
    const asteroid = {
        x: CONFIG.canvas.width / 2 + Math.cos(angle) * distance,
        y: CONFIG.canvas.height / 2 + Math.sin(angle) * distance,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: angle + Math.PI,
        size: 20 + Math.random() * 40,
        health: 1,
        id: Math.random().toString(36).substr(2, 9)
    };
    
    asteroids.push(asteroid);
}

function updateCrystalPickup(player) {
    // Simple crystal pickup system
    const pickupRange = 30;
    const crystalValue = CONFIG.economy.crystalValue;
    
    asteroids.forEach((asteroid, index) => {
        const distance = Math.sqrt(
            (player.x - asteroid.x) ** 2 + 
            (player.y - asteroid.y) ** 2
        );
        
        if (distance < pickupRange) {
            // Collect crystal
            player.crystals += crystalValue;
            player.score += crystalValue;
            
            // Remove asteroid
            asteroids.splice(index, 1);
            
            // Create explosion effect
            createExplosion(asteroid.x, asteroid.y);
            
            // Update statistics
            if (window.gameState) {
                window.gameState.crystalsCollected++;
            }
        }
    });
}

function createExplosion(x, y) {
    const explosionCount = 10 + Math.random() * 15;
    
    for (let i = 0; i < explosionCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5;
        const lifetime = 0.5 + Math.random() * 1.5;
        
        const particle = {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime,
            damage: false
        };
        
        if (window.particles) {
            window.particles.push(particle);
        }
    }
}

function checkLevelProgression(player) {
    // Level up when enough crystals are collected
    const crystalsForNextLevel = player.level * 100;
    
    if (player.crystals >= crystalsForNextLevel && player.level < 50) {
        player.level++;
        player.crystals -= crystalsForNextLevel;
        player.score += CONFIG.scoring.levelCompletionBonus;
        
        // Speed up asteroids with level
        CONFIG.asteroids.spawnRate *= 0.95;
        CONFIG.physics.asteroidSpeed *= 1.05;
    }
}

function constrainToScreen(player) {
    const margin = 20;
    player.x = Math.max(margin, Math.min(CONFIG.canvas.width - margin, player.x));
    player.y = Math.max(margin, Math.min(CONFIG.canvas.height - margin, player.y));
}

export {
    updateWorld,
    constrainToScreen,
    createExplosion
};