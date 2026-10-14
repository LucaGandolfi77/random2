// Star Explorer Game Player
// Player movement, input handling, and combat logic

import CONFIG from './config.js';

function updatePlayer(player, deltaTime) {
    // Update shield timer
    if (player.shieldActive) {
        player.shieldExpires -= deltaTime * 1000;
        if (player.shieldExpires <= 0) {
            player.shieldActive = false;
        }
    }
    
    // Check if player is alive
    if (player.lives <= 0) {
        player.isAlive = false;
        if (window.gameLoop) {
            window.gameLoop(); // Check for game over
        }
    }
}

function handlePlayerInput(input, player) {
    // Keyboard controls
    if (input.code === 'KeyW' || input.code === 'ArrowUp') {
        // Up thrust
        player.vy -= CONFIG.ship.thrustPower * 100 * (input.shiftKey ? 2 : 1);
    } else if (input.code === 'KeyS' || input.code === 'ArrowDown') {
        // Down thrust (reverse)
        player.vy += CONFIG.ship.thrustPower * 100 * (input.shiftKey ? 2 : 1);
    } else if (input.code === 'KeyA' || input.code === 'ArrowLeft') {
        // Rotate left
        player.angle -= CONFIG.ship.rotationSpeed * (input.shiftKey ? 2 : 1);
    } else if (input.code === 'KeyD' || input.code === 'ArrowRight') {
        // Rotate right
        player.angle += CONFIG.ship.rotationSpeed * (input.shiftKey ? 2 : 1);
    } else if (input.code === 'Space') {
        // Activate shield
        if (!player.shieldActive) {
            player.shieldActive = true;
            player.shieldExpires = CONFIG.ship.shieldDuration;
            
            // Create shield effect
            createShieldEffect(player);
        }
    }
}

function createShieldEffect(player) {
    // Add shield particles
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const particle = {
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            lifetime: 1.0,
            damage: false
        };
        
        if (window.particles) {
            window.particles.push(particle);
        }
    }
}

function constrainToScreen(player) {
    const margin = 20;
    player.x = Math.max(margin, Math.min(CONFIG.canvas.width - margin, player.x));
    player.y = Math.max(margin, Math.min(CONFIG.canvas.height - margin, player.y));
}

function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (obj1.size + obj2.size) / 2;
}

export {
    updatePlayer,
    handlePlayerInput,
    constrainToScreen,
    checkCollision
};