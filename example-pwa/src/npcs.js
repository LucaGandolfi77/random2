// Star Explorer Game NPCs
// Computer-controlled enemies and AI

import CONFIG from './config.js';

let player = null;

function initNPCs(playerRef) {
    player = playerRef;
}

function updateNPCs(deltaTime, asteroids) {
    // Update NPC behavior
    updateNPCMovement(deltaTime, asteroids);
    
    // Check NPC-player collisions
    checkNPCCollisions(asteroids);
}

function updateNPCMovement(deltaTime, asteroids) {
    // Simple NPC behavior: patrol in circles
    asteroids.forEach(asteroid => {
        // Add some AI behavior
        const distanceToPlayer = Math.sqrt(
            (asteroid.x - player.x) ** 2 + 
            (asteroid.y - player.y) ** 2
        );
        
        // If player is close, move away
        if (distanceToPlayer < 100) {
            const angle = Math.atan2(player.y - asteroid.y, player.x - asteroid.x);
            asteroid.vx += Math.cos(angle) * 0.5 * deltaTime;
            asteroid.vy += Math.sin(angle) * 0.5 * deltaTime;
        }
        
        // Add random movement
        if (Math.random() < 0.02) {
            const randomAngle = Math.random() * Math.PI * 2;
            asteroid.vx += Math.cos(randomAngle) * 0.2 * deltaTime;
            asteroid.vy += Math.sin(randomAngle) * 0.2 * deltaTime;
        }
    });
}

function checkNPCCollisions(asteroids) {
    // Check for asteroid-asteroid collisions
    for (let i = 0; i < asteroids.length; i++) {
        for (let j = i + 1; j < asteroids.length; j++) {
            const asteroid1 = asteroids[i];
            const asteroid2 = asteroids[j];
            
            const dx = asteroid1.x - asteroid2.x;
            const dy = asteroid1.y - asteroid2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Collision detection
            if (distance < (asteroid1.size + asteroid2.size) / 2) {
                handleAsteroidCollision(asteroid1, asteroid2);
            }
        }
    }
}

function handleAsteroidCollision(asteroid1, asteroid2) {
    // Separate asteroids
    const dx = asteroid2.x - asteroid1.x;
    const dy = asteroid2.y - asteroid1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const separationX = (dx / distance) * (asteroid1.size + asteroid2.size) / 2;
        const separationY = (dy / distance) * (asteroid1.size + asteroid2.size) / 2;
        
        asteroid1.x -= separationX;
        asteroid1.y -= separationY;
        asteroid2.x += separationX;
        asteroid2.y += separationY;
    }
    
    // Create collision effect
    createCollisionEffect(asteroid1.x, asteroid1.y);
    
    // Change asteroid velocities
    const relativeVelocityX = asteroid2.vx - asteroid1.vx;
    const relativeVelocityY = asteroid2.vy - asteroid1.vy;
    
    const normalX = dx / distance;
    const normalY = dy / distance;
    
    const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;
    
    if (velocityAlongNormal > 0) return;
    
    const impulse = 2 * velocityAlongNormal;
    
    asteroid1.vx += impulse * normalX * 0.5;
    asteroid1.vy += impulse * normalY * 0.5;
    asteroid2.vx -= impulse * normalX * 0.5;
    asteroid2.vy -= impulse * normalY * 0.5;
}

function createCollisionEffect(x, y) {
    // Create explosion particles
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8;
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

function createBossAsteroid(asteroids) {
    // Create a larger, more dangerous asteroid
    const bossAngle = Math.random() * Math.PI * 2;
    const bossDistance = 300;
    const bossSpeed = CONFIG.physics.asteroidSpeed * 1.5;
    
    const bossAsteroid = {
        x: CONFIG.canvas.width / 2 + Math.cos(bossAngle) * bossDistance,
        y: CONFIG.canvas.height / 2 + Math.sin(bossAngle) * bossDistance,
        vx: Math.cos(bossAngle) * bossSpeed,
        vy: Math.sin(bossAngle) * bossSpeed,
        angle: bossAngle + Math.PI,
        size: 60 + Math.random() * 40,
        health: 3,
        isBoss: true,
        id: 'boss-' + Math.random().toString(36).substr(2, 9)
    };
    
    asteroids.push(bossAsteroid);
}

export {
    initNPCs,
    updateNPCs,
    createBossAsteroid
};